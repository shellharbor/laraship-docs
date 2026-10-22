import { useEffect, useRef, useState } from 'react';
import { MODULES, PRESETS, UPSTREAM } from '../../data/upstream';
import { changeSource, effectiveConfig, moduleLock, warnings } from '../../domain/constraints';
import { validate } from '../../domain/validate';
import { initialConfig, type WizardConfig } from '../../domain/wizardSchema';
import { preferences, readPreferences, STORAGE_KEY } from '../../domain/preferences';
import { localizeIssues, translator, type Language, warningText } from '../../i18n';
import { Icon } from '../Icon';
import { Choice, Field, Toggle } from './Fields';
import { Results } from './Results';

export function Wizard({ language }: { language: Language }) {
  const t = translator(language);
  const [config, setConfig] = useState(() => {
    try { return readPreferences(localStorage.getItem(STORAGE_KEY)); } catch { return structuredClone(initialConfig); }
  });
  const [step, setStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [remember, setRemember] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
  });
  const [attempted, setAttempted] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const e = effectiveConfig(config);
  const issues = localizeIssues(validate(config), language);
  const shownIssues = attempted ? issues.filter(issue => issue.step === step) : [];
  const update = <K extends keyof WizardConfig>(key: K, value: WizardConfig[K]) => setConfig(previous => ({ ...previous, [key]: value }));
  const steps = [t('Application', 'Приложение'), t('Domain & HTTPS', 'Домен и HTTPS'), t('Database', 'База данных'),
    t('Services', 'Сервисы'), t('Fine-tuning', 'Параметры'), t('Your command', 'Ваша команда')];
  useEffect(() => {
    try {
      if (remember) localStorage.setItem(STORAGE_KEY, preferences(config));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* Storage can be unavailable; the in-memory wizard remains functional. */ }
  }, [config, remember]);
  const go = (target: number) => {
    setStep(target); setAttempted(false);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const next = () => {
    setAttempted(true);
    if (!issues.some(issue => issue.step === step)) go(step + 1);
  };
  const reset = () => {
    setConfig(structuredClone(initialConfig)); setRemember(false); setAdvanced(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Nothing persisted. */ }
    setStorageMessage(t('All wizard data cleared.', 'Данные мастера очищены.')); go(0);
  };
  const descriptions = [
    [t('What are we shipping?', 'Что разворачиваем?'), t('A fresh start or an application you already love.', 'Новое приложение или уже готовый проект.')],
    [t('Give your app a home.', 'Выберите адрес приложения.'), t('A predictable project name. A real domain. HTTPS by default.', 'Понятное имя проекта, ваш домен и HTTPS по умолчанию.')],
    [t('Where your data lives.', 'Где будут храниться данные.'), t('Choose your engine, then decide where it should run.', 'Выберите СУБД и место её размещения.')],
    [t('A little extra capability.', 'Подключите нужные сервисы.'), t('Only the pieces your application needs.', 'Выберите то, что нужно вашему приложению.')],
    [t('Make it yours.', 'Настройте под себя.'), t('Safe defaults are already in place. Adjust only what you need.', 'Безопасные настройки уже выбраны. Меняйте только необходимое.')],
    [t('Ready when you are.', 'Всё готово к запуску.'), t('Review your setup, preview it, then run it on your server.', 'Проверьте настройки и запустите команды на своём сервере.')],
  ];
  const moduleDescriptions = {
    filament: t('A Filament admin panel at /admin. New apps only.', 'Админ-панель Filament на /admin. Только новые приложения.'),
    redis: t('Use the base Redis service for Laravel cache, sessions and queues.', 'Подключить базовый Redis к кешу, сессиям и очередям Laravel.'),
    queue: t('A plain queue worker container. Choose this or Horizon.', 'Контейнер queue worker. Выберите его или Horizon.'),
    horizon: t('Queue monitoring at /horizon. Includes Redis. New apps only.', 'Мониторинг очередей на /horizon. Включает Redis. Только новые приложения.'),
    backup: t('Daily database dumps with a retention policy.', 'Ежедневные дампы БД с периодом хранения.'),
  };
  const lockText = {
    preset: t('Included by preset. Change the preset to remove it.', 'Включено пресетом. Для отключения смените пресет.'),
    dependency: t('Required by Horizon.', 'Требуется Horizon.'),
    conflict: t('Remove the other queue service or its preset first.', 'Сначала отключите другой сервис очередей или его пресет.'),
    source: t('Managed by the existing application.', 'Управляется существующим приложением.'),
  };
  return <section id="configure" className="wizard-section" aria-label={t('Deployment configurator', 'Мастер развёртывания')}>
    <div className="section-eyebrow"><span className="dot"/>{t('THE CONFIGURATOR', 'МАСТЕР НАСТРОЙКИ')}<span>01 — 06</span></div>
    <div className="wizard-top"><div><h2>{t('Your stack. Your choices.', 'Ваш стек. Ваш выбор.')}</h2><p>{t('Six small steps to a deployment that fits.', 'Шесть простых шагов к подходящей конфигурации.')}</p></div>
      <div className="mode-control" aria-label={t('Configuration mode', 'Режим настройки')}><button aria-pressed={!advanced} onClick={() => setAdvanced(false)}>Basic</button><button aria-pressed={advanced} onClick={() => setAdvanced(true)}>Advanced</button></div></div>
    <div className="wizard-layout">
      <nav className="steps" aria-label={t('Wizard progress', 'Прогресс мастера')}><ol>{steps.map((label, index) => <li key={index}>
        <button onClick={() => go(index)} aria-current={step === index ? 'step' : undefined} disabled={index > step && issues.some(issue => issue.step < index)}>
          <span aria-hidden="true" className={`step-number ${index < step ? 'complete' : ''}`}>{index < step ? <Icon name="check" size={15}/> : `0${index + 1}`}</span><span className="step-label">{label}</span>{step === index && <span aria-hidden="true" className="step-current">↗</span>}</button>
      </li>)}</ol><div className="local-note"><Icon name="shield"/><strong>{t('Stays in your browser', 'Всё в вашем браузере')}</strong><p>{t('No sign-in. No server connection. No passwords to share.', 'Без аккаунта, подключений к серверу и ввода паролей.')}</p></div></nav>
      <div className="wizard-panel"><div className="panel-progress"><span>{t('STEP', 'ШАГ')} {step + 1} / 6</span><span>{Math.round((step + 1) / 6 * 100)}%</span><div><i style={{ width: `${(step + 1) / 6 * 100}%` }}/></div></div>
        <h3 ref={heading} tabIndex={-1}>{descriptions[step][0]}</h3><p className="panel-intro">{descriptions[step][1]}</p>
        {step < 5 && <form onSubmit={event => { event.preventDefault(); next(); }} noValidate>
          {step === 0 && <>
            <div className="choice-grid"><Choice name="source" value="new" title={t('New Laravel application', 'Новое приложение Laravel')} selected={config.source === 'new'} onSelect={() => setConfig(changeSource(config, 'new'))} icon={<Icon name="box"/>}>{t('A clean Laravel skeleton, ready to build on.', 'Чистый Laravel для нового проекта.')}</Choice>
              <Choice name="source" value="existing" title={t('Existing repository', 'Готовый репозиторий')} selected={config.source === 'existing'} onSelect={() => setConfig(changeSource(config, 'existing'))} icon={<Icon name="github"/>}>{t('Bring your application from Git.', 'Разверните приложение из Git.')}</Choice></div>
            {config.source === 'new' ? <div className="field"><label htmlFor="laravel-version">{t('Laravel version', 'Версия Laravel')}</label><select id="laravel-version" value={config.laravelVersion} onChange={event => update('laravelVersion', event.target.value as WizardConfig['laravelVersion'])}><option value="13.0">Laravel 13.0 — {t('default', 'по умолчанию')}</option><option value="12.0">Laravel 12.0</option></select><p className="hint">{t('Installed as ^X.Y, with PHP 8.3. Laravel 10 and 11 are not supported.', 'Устанавливается как ^X.Y с PHP 8.3. Laravel 10 и 11 не поддерживаются.')}</p></div> : <>
              <Field label={t('Repository URL', 'URL репозитория')} field="repo" value={config.repo} onChange={v => update('repo', v)} placeholder="https://github.com/your-team/your-app.git" issues={shownIssues} hint={t('HTTPS or SSH. Never include a token or password.', 'HTTPS или SSH. Не включайте токены и пароли.')}/>
              <Field label={t('Branch (optional)', 'Ветка (необязательно)')} field="branch" value={config.branch} onChange={v => update('branch', v)} placeholder="main" issues={shownIssues}/>
              {advanced && <Field label={t('SSH deploy key path on server', 'Путь к SSH deploy key на сервере')} field="deployKey" value={config.deployKey} onChange={v => update('deployKey', v)} placeholder="/root/.ssh/app_deploy_key" issues={shownIssues} hint={t('SSH repositories only. A file path, never the key itself.', 'Только SSH. Укажите путь, а не содержимое ключа.')}/>}<div className="notice">{t(...warningText.existing)}</div>
            </>}
            <fieldset className="presets"><legend>{t('Start with a preset', 'Начните с пресета')} <span>{t('optional', 'необязательно')}</span></legend><div className="preset-grid">{(Object.keys(PRESETS) as WizardConfig['preset'][]).map(preset => <label key={preset} className={config.preset === preset ? 'active' : ''}><input type="radio" name="preset" value={preset} checked={config.preset === preset} disabled={config.source === 'existing' && ['api', 'admin-panel'].includes(preset)} onChange={() => update('preset', preset)}/><strong>{preset === 'none' ? t('No preset', 'Без пресета') : preset}</strong><small>{preset === 'none' ? t('Just the essentials', 'Только основное') : preset === 'admin-panel' ? 'Filament · Redis · Queue' : preset === 'api' ? 'Horizon · Redis · 16M' : 'Basic Auth · Redis'}</small></label>)}</div>
              <p className="hint">{t('Preset features are additive and stay enabled until you change the preset. All project ports bind to loopback.', 'Опции пресета добавляются и остаются включёнными до его смены. Порты проекта слушают loopback.')}</p></fieldset>
          </>}
          {step === 1 && <><Field label={t('Project slug', 'Имя проекта (slug)')} field="slug" value={config.slug} onChange={v => update('slug', v)} placeholder="my-app" issues={shownIssues} hint={t('Becomes /var/www/<slug> and your container prefix. Lowercase recommended.', 'Используется в /var/www/<slug> и именах контейнеров. Рекомендуем нижний регистр.')}/>
            <Field label={t('Domain', 'Домен')} field="domain" value={config.domain} onChange={v => update('domain', v)} placeholder="app.example.com" issues={shownIssues}/>
            <Toggle label={t('Enable HTTPS', 'Включить HTTPS')} checked={config.https} onChange={v => update('https', v)} hint={t('A free Let’s Encrypt certificate. On by default.', 'Бесплатный сертификат Let’s Encrypt. Включено по умолчанию.')}/>
            {config.https && <Field label={t('Certificate contact email', 'Email для сертификата')} field="sslEmail" value={config.sslEmail} onChange={v => update('sslEmail', v)} placeholder="you@example.com" issues={shownIssues} type="email"/>}
            <div className="notice">{t('Point the domain’s A record at your Ubuntu server. Public ports 80 and 443 must be available. This wizard cannot check DNS or ACME.', 'Направьте A-запись домена на Ubuntu-сервер. Публичные порты 80 и 443 должны быть доступны. Мастер не проверяет DNS и ACME.')}</div>
            {!config.https && <div className="notice warning">{t(...warningText.http)}</div>}
          </>}
          {step === 2 && <><fieldset><legend>{t('Database engine', 'Движок БД')}</legend><div className="choice-grid"><Choice name="db-engine" value="postgres" selected={config.dbType === 'postgres'} onSelect={() => update('dbType', 'postgres')} title="PostgreSQL">PostgreSQL 17 · {t('default', 'по умолчанию')}</Choice><Choice name="db-engine" value="mysql" selected={config.dbType === 'mysql'} onSelect={() => update('dbType', 'mysql')} title="MySQL">MySQL 8.4</Choice></div></fieldset>
            <fieldset><legend>{t('Where should it run?', 'Где запустить БД?')}</legend><div className="choice-grid"><Choice name="db-location" value="docker" selected={config.dbLocation === 'docker'} onSelect={() => update('dbLocation', 'docker')} title={t('Docker container', 'Контейнер Docker')} icon={<Icon name="box"/>}>{t('A dedicated database container and persistent volume.', 'Отдельный контейнер БД и постоянный том.')}</Choice><Choice name="db-location" value="native" selected={config.dbLocation === 'native'} onSelect={() => update('dbLocation', 'native')} title={t('Native on this server', 'На самом сервере')} icon={<Icon name="layers"/>}>{t('Use a database already installed on the Ubuntu host.', 'Использовать СУБД, уже установленную на Ubuntu-хосте.')}</Choice></div></fieldset>
            <div className="architecture"><span>Laravel / PHP</span><span aria-hidden="true">→</span><span>{config.dbLocation === 'docker' ? `${config.dbType === 'postgres' ? 'PostgreSQL' : 'MySQL'} ${t('container', 'контейнер')}` : `${t('Host', 'Хост')}: ${config.dbType}`}</span></div>
            {config.dbLocation === 'native' && <div className="notice warning">{t(...warningText[`native-${config.dbType}`])}</div>}
            {config.dbLocation === 'native' && config.dbType === 'mysql' && <div className="notice danger">{t(...warningText['mysql-secret'])}</div>}
            {advanced && <div className="advanced-box"><span className="badge">ADVANCED</span>{(['name', 'user'] as const).map(kind => <Field key={kind} label={kind === 'name' ? t('Database name (optional)', 'Имя БД (необязательно)') : t('Database user (optional)', 'Пользователь БД (необязательно)')} field={`db-${kind}`} value={config.dbNames[config.dbType][kind]} onChange={v => update('dbNames', { ...config.dbNames, [config.dbType]: { ...config.dbNames[config.dbType], [kind]: v } })} hint={t('Leave empty to generate on the server.', 'Оставьте пустым для генерации на сервере.')} issues={shownIssues}/>)}</div>}
            <div className="secret-note"><Icon name="shield"/>{t('Passwords are generated on your server. There are no password fields here.', 'Пароли генерируются на сервере. Здесь нет полей для паролей.')}</div>
          </>}
          {step === 3 && <><div className="module-list">{MODULES.map(module => { const lock = moduleLock(config, module); return <div className="module-item" key={module}><Toggle label={module === 'filament' ? 'Filament admin' : module === 'backup' ? t('Database backups', 'Резервные копии БД') : module === 'queue' ? 'Queue worker' : module === 'redis' ? t('Redis integration', 'Интеграция Redis') : 'Horizon'} checked={e.modules.includes(module)} disabled={!!lock} onChange={value => update('modules', value ? [...config.modules, module] : config.modules.filter(m => m !== module))} hint={moduleDescriptions[module]}/>{lock && <p className="lock-hint">{lockText[lock]}</p>}</div>; })}</div>
            {e.modules.includes('filament') && <><Field label={t('Filament administrator email', 'Email администратора Filament')} field="filamentEmail" value={config.filamentEmail} onChange={v => update('filamentEmail', v)} issues={shownIssues} type="email"/>{advanced && <Field label={t('Administrator name (optional)', 'Имя администратора (необязательно)')} field="filamentName" value={config.filamentName} onChange={v => update('filamentName', v)} issues={shownIssues}/>}</>}
            {e.modules.includes('backup') && <Field label={t('Keep database dumps for (days)', 'Хранить дампы БД (дней)')} field="backupKeep" type="number" value={config.backupKeep} onChange={v => update('backupKeep', v)} hint={t('1–3650 days. Default: 7. Dumps run at startup and daily.', '1–3650 дней. По умолчанию 7. Дампы при старте и ежедневно.')} issues={shownIssues}/>}
            {warnings(config).filter(key => ['queue', 'horizon'].includes(key)).map(key => <div className="notice" key={key}>{t(...warningText[key])}</div>)}
          </>}
          {step === 4 && <><Toggle label={t('HTTP Basic Auth', 'HTTP Basic Auth')} checked={e.basicAuth} onChange={v => update('basicAuth', v)} disabled={PRESETS[config.preset].basicAuth} hint={PRESETS[config.preset].basicAuth ? t('Included by staging. Change the preset to disable.', 'Включено staging. Для отключения смените пресет.') : t('An extra access barrier for staging. Credentials generated on the server.', 'Дополнительный барьер для staging. Учётные данные создаются на сервере.')}/>
            <div className="field"><label htmlFor="upload-max">{t('PHP upload limit', 'Лимит загрузки PHP')}</label><input list="upload-sizes" id="upload-max" value={config.phpUploadMax} placeholder={e.phpUploadMax || t('Keep PHP defaults (2M/8M)', 'Оставить PHP defaults (2M/8M)')} onChange={event => update('phpUploadMax', event.target.value)} aria-invalid={shownIssues.some(i => i.field === 'phpUploadMax')}/><datalist id="upload-sizes">{['16M', '64M', '128M', '256M', '1G'].map(size => <option key={size} value={size}/>)}</datalist><p className="hint">{t('Optional. Choose a suggestion or enter a size such as 512M. API preset: 16M.', 'Необязательно. Выберите вариант или введите размер, например 512M. Пресет API: 16M.')}</p></div>
            {advanced && <div className="advanced-box"><span className="badge">ADVANCED</span>
              {e.basicAuth && <Field label={t('Basic Auth user (optional)', 'Логин Basic Auth (необязательно)')} field="authUser" value={config.authUser} onChange={v => update('authUser', v)} issues={shownIssues}/>}
              <details><summary>{t('Networking & ports', 'Сеть и порты')}</summary><p className="hint">{t('Leave blank for automatic selection. Project ports bind to 127.0.0.1; the shared proxy publishes 80/443. Availability can only be checked on the server.', 'Оставьте пустым для автоматического выбора. Порты проекта слушают 127.0.0.1; общий proxy публикует 80/443. Занятость проверяется только на сервере.')}</p><div className="ports-grid">{(['http', 'https', 'php', 'redis', config.dbType] as const).map(name => <Field key={name} label={name === config.dbType && config.dbLocation === 'native' ? `${name.toUpperCase()} — ${t('host DB listener', 'порт СУБД хоста')}` : name.toUpperCase()} field={`port-${name}`} value={config.ports[name]} onChange={v => update('ports', { ...config.ports, [name]: v })} issues={shownIssues} placeholder={name === config.dbType && config.dbLocation === 'native' ? config.dbType === 'postgres' ? '5432' : '3306' : t('Auto', 'Авто')}/>)}</div></details>
              <Toggle label={t('Create project ZIP after deployment', 'Создать ZIP проекта после развёртывания')} checked={config.createBackup} onChange={v => update('createBackup', v)} hint={t('One-time ZIP in /tmp. Excludes DB data and certificates.', 'Разовый ZIP в /tmp. Без данных БД и сертификатов.')}/>
              <Toggle label={t('Generate project DH parameters', 'Создать DH-параметры проекта')} checked={config.createDhparam} onChange={v => update('createDhparam', v)} hint={t('Project nginx only; takes several minutes. Shared proxy TLS is separate.', 'Только nginx проекта; займёт несколько минут. TLS общего proxy настраивается отдельно.')}/>
              <details><summary>{t('Integrations', 'Интеграции')}</summary><Field label={t('Notification endpoint (optional)', 'Endpoint уведомлений (необязательно)')} field="endpoint" value={config.endpoint} onChange={v => { update('endpoint', v); update('endpointConsent', false); }} placeholder="https://your-service.example/deployments" issues={shownIssues}/><div className="notice danger">{t(...warningText.endpoint)}</div>{config.endpoint && <Toggle label={t('I trust this endpoint with generated project credentials', 'Я доверяю endpoint созданные учётные данные проекта')} checked={config.endpointConsent} onChange={v => update('endpointConsent', v)}/>}</details>
              <Toggle label={t('Expert: post-deploy hook', 'Expert: post-deploy hook')} checked={config.expert} onChange={v => update('expert', v)} hint={t('Run your own command inside the PHP container.', 'Выполнить свою команду внутри PHP-контейнера.')}/>
              {config.expert && <><Field label={t('Post-deploy command', 'Команда после развёртывания')} field="postDeploy" value={config.postDeploy} onChange={v => { update('postDeploy', v); update('postDeployConsent', false); }} placeholder="php artisan db:seed --force" issues={shownIssues}/><div className="notice danger">{t(...warningText['post-deploy'])}</div>{config.postDeploy && <Toggle label={t('I understand this executes arbitrary code and repeats on updates', 'Я понимаю, что код выполнится и повторится при обновлениях')} checked={config.postDeployConsent} onChange={v => update('postDeployConsent', v)}/>}</>}
            </div>}
          </>}
          {attempted && shownIssues.length > 0 && <div className="error-summary" role="alert"><strong>{t('Check these settings before continuing:', 'Проверьте настройки перед продолжением:')}</strong><ul>{shownIssues.map(issue => <li key={`${issue.field}-${issue.code}`}>{issue.message}</li>)}</ul>{!advanced && <button type="button" className="text-button" onClick={() => setAdvanced(true)}>{t('Show advanced settings', 'Показать расширенные настройки')}</button>}</div>}
          <div className="wizard-actions">{step > 0 ? <button type="button" className="button secondary" onClick={() => go(step - 1)}>← {t('Back', 'Назад')}</button> : <span className="time-note">{t('About 2 minutes', 'Около 2 минут')}</span>}<button type="submit" className="button primary">{step === 4 ? t('Review configuration', 'Проверить конфигурацию') : t('Continue', 'Продолжить')}<Icon name="arrow" size={17}/></button></div>
        </form>}
        {step === 5 && <Results config={config} language={language} onEdit={go} onReset={reset}/>}
      </div>
      <aside className="recap"><span className="eyebrow">{t('YOUR DEPLOYMENT', 'ВАШЕ РАЗВЁРТЫВАНИЕ')}</span><div className="recap-icon"><Icon name="ship" size={30}/></div><h4>{config.slug || t('Something great.', 'Ваш будущий проект.')}</h4><p className="domain-preview">{config.domain || 'your-app.example.com'}</p><dl><div><dt>{t('Application', 'Приложение')}</dt><dd>{config.source === 'new' ? `Laravel ${config.laravelVersion}` : t('Git repository', 'Git-репозиторий')}</dd></div><div><dt>{t('Database', 'База данных')}</dt><dd>{config.dbType === 'postgres' ? 'PostgreSQL' : 'MySQL'}<small>{config.dbLocation === 'docker' ? 'Docker' : t('Native on host', 'На хосте')}</small></dd></div><div><dt>HTTPS</dt><dd className={config.https ? 'green' : ''}>{config.https ? t('Enabled', 'Включён') : t('Disabled', 'Выключен')}</dd></div><div><dt>{t('Preset', 'Пресет')}</dt><dd>{config.preset === 'none' ? '—' : config.preset}</dd></div></dl><div className="recap-modules"><span className="eyebrow">{t('MODULES', 'МОДУЛИ')}</span><div>{e.modules.length ? e.modules.map(module => <span className="module-tag" key={module}>{module}</span>) : <p>{t('The essentials, for now.', 'Пока только основное.')}</p>}</div></div><div className="recap-footer"><span className="dot"/>{t('Compatible with', 'Совместимо с')} v{UPSTREAM.version}</div></aside>
    </div>
    <div className="preferences"><Toggle label={t('Remember non-sensitive preferences on this device', 'Сохранять несекретные предпочтения на устройстве')} checked={remember} onChange={setRemember} hint={t('Only stack choices. Never emails, repository URLs, domains, key paths, endpoints or hooks.', 'Только выбор стека. Без email, URL, доменов, путей к ключам, endpoint и hooks.')}/><button className="text-button" onClick={reset}>{t('Clear data', 'Очистить данные')}</button><span className="sr-only" role="status">{storageMessage}</span></div>
  </section>;
}
