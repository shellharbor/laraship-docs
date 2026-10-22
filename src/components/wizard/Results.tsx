import { useState } from 'react';
import { generate, INSTALL_COMMAND } from '../../domain/generate';
import { effectiveConfig, warnings } from '../../domain/constraints';
import { validate } from '../../domain/validate';
import { shellQuote } from '../../domain/shellQuote';
import type { WizardConfig } from '../../domain/wizardSchema';
import { localizeIssues, translator, type Language, warningText } from '../../i18n';
import { UPSTREAM } from '../../data/upstream';
import { Icon } from '../Icon';

function CodeBlock({ title, code, copyLabel, t }: { title: string; code: string; copyLabel: string; t: ReturnType<typeof translator> }) {
  const [status, setStatus] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setStatus(t('Copied', 'Скопировано')); }
    catch { setStatus(t('Clipboard unavailable. Select the command below and copy manually.', 'Буфер обмена недоступен. Выделите и скопируйте команду вручную.')); }
  };
  return <div className="code-block"><div className="code-toolbar"><span>{title}</span><button onClick={copy} aria-label={copyLabel}><Icon name="copy" size={15}/>{copyLabel}</button></div><pre tabIndex={0}><code>{code}</code></pre><span className="copy-status" role="status">{status}</span></div>;
}
export function Results({ config, language, onEdit, onReset }: { config: WizardConfig; language: Language; onEdit: (step: number) => void; onReset: () => void }) {
  const t = translator(language);
  const issues = localizeIssues(validate(config), language);
  const e = effectiveConfig(config);
  if (issues.length) return <div className="error-summary" role="alert"><p>{t('Complete these settings to generate commands.', 'Заполните настройки для генерации команд.')}</p>{issues.map(issue => <button key={`${issue.field}-${issue.code}`} className="issue-link" onClick={() => onEdit(issue.step)}>{issue.message} ↗</button>)}</div>;
  const result = generate(config);
  const download = () => {
    const file = new Blob([`${result.needsSecret ? '# TEMPLATE ONLY: replace <MYSQL_ROOT_PASSWORD> privately on the server. Never commit passwords.\n' : ''}${result.config}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = 'deploy.config'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const after = [`# ${t('Project directory', 'Каталог проекта')}: /var/www/${e.slug}`,
    'sudo bash /opt/laraship/list-projects.sh',
    ...(e.source === 'existing' ? [`sudo bash /opt/laraship/update.sh --slug ${shellQuote(e.slug)}`] : []),
    ...(e.modules.includes('backup') ? [`sudo bash /opt/laraship/backup.sh --slug ${shellQuote(e.slug)} now`] : []),
  ].join('\n');
  return <div className="results">
    <div className={`result-banner ${result.needsSecret ? 'manual' : ''}`}><Icon name={result.needsSecret ? 'shield' : 'check'}/><div><strong>{result.needsSecret ? t('Template — server-side secret required', 'Шаблон — нужен секрет на сервере') : t('Your configuration is ready', 'Конфигурация готова')}</strong><p>{t('Generated locally. Review before running on your server.', 'Создано локально. Проверьте перед запуском на сервере.')}</p></div></div>
    <dl className="result-summary"><div><dt>{t('Application', 'Приложение')}</dt><dd>{e.source === 'new' ? `New Laravel ^${e.laravelVersion}` : e.repo}{e.source === 'existing' && e.branch && ` (${e.branch})`}</dd></div><div><dt>{t('Address / slug', 'Адрес / slug')}</dt><dd>{e.https ? 'https' : 'http'}://{e.domain} · {e.slug}</dd></div><div><dt>{t('Database', 'База данных')}</dt><dd>{e.dbType} · {e.dbLocation === 'docker' ? 'Docker' : 'Native'}{e.ports[e.dbType] ? ` · ${e.ports[e.dbType]}` : ''}</dd></div><div><dt>{t('Modules / preset', 'Модули / пресет')}</dt><dd>{e.modules.join(', ') || '—'} / {e.preset}</dd></div><div><dt>{t('PHP / Basic Auth', 'PHP / Basic Auth')}</dt><dd>{e.phpUploadMax || '2M/8M'} / {e.basicAuth ? t('on', 'вкл.') : t('off', 'выкл.')}</dd></div>{e.modules.includes('backup') && <div><dt>{t('DB dump retention', 'Хранение дампов БД')}</dt><dd>{e.backupKeep} {t('days', 'дней')}</dd></div>}<div><dt>{t('Explicit ports', 'Заданные порты')}</dt><dd>{(['http', 'https', 'php', 'redis', e.dbType] as const).filter(name => e.ports[name]).map(name => `${name}: ${e.ports[name]}`).join(', ') || t('Automatic selection', 'Автоматический выбор')}</dd></div></dl>
    {warnings(config).map(key => <div className={`notice ${key === 'mysql-secret' || key === 'endpoint' || key === 'post-deploy' ? 'danger' : 'warning'}`} key={key}>{t(...warningText[key])}</div>)}
    <h4>01. {t('Prepare your Ubuntu server', 'Подготовьте Ubuntu-сервер')}</h4><p>{t('Ubuntu 20.04+, sudo access, Git, Python 3, curl, ss, flock, pgrep and timeout. If Docker is installed, Docker Compose V2 is required. Allow access to Docker Hub, Packagist, npm and Let’s Encrypt.', 'Ubuntu 20.04+, sudo, Git, Python 3, curl, ss, flock, pgrep и timeout. Если Docker установлен, нужен Docker Compose V2. Разрешите доступ к Docker Hub, Packagist, npm и Let’s Encrypt.')}</p>
    <p>{t('Point the domain’s A record at the server. Public ports 80/443 must be free and reachable. DNS, certificates, port occupancy and database connectivity are not checked here.', 'Направьте A-запись домена на сервер. Публичные порты 80/443 должны быть свободны и доступны. Мастер не проверяет DNS, сертификаты, занятость портов и доступность БД.')}</p>
    <details><summary>{t('Install LaraShip once (full toolkit, pinned revision)', 'Установить LaraShip (полный toolkit, фиксированная ревизия)')}</summary><p>{t('Review the official toolkit before running it as root. This installation refuses to overwrite /opt/laraship. Do not download deploy-laravel.sh alone: it needs its templates, lib, modules and presets.', 'Изучите официальный toolkit перед запуском от root. Эта установка не перезаписывает /opt/laraship. Не скачивайте один deploy-laravel.sh: нужны шаблоны, lib, modules и presets.')}</p><CodeBlock t={t} title={`LaraShip ${UPSTREAM.version}`} code={INSTALL_COMMAND} copyLabel={t('Copy installation', 'Копировать установку')}/></details>
    <h4>02. {t('Preview before making changes', 'Предварительная проверка')}</h4><p>{t('Run on the server without sudo. LaraShip validates the effective settings and changes nothing. A dry run does not test the real infrastructure.', 'Запустите на сервере без sudo. LaraShip проверит итоговые параметры без изменений системы. Dry-run не проверяет реальную инфраструктуру.')}</p>
    {result.needsSecret && <p className="template-label">{t('TEMPLATE: replace the password placeholder privately on the server before preview or deployment.', 'ШАБЛОН: перед preview или deploy замените пароль-заглушку на сервере.')}</p>}
    <CodeBlock t={t} title={result.needsSecret ? 'TEMPLATE · dry-run' : 'bash · dry-run'} code={result.dryRun} copyLabel={result.needsSecret ? t('Copy preview template', 'Копировать шаблон preview') : t('Copy dry run', 'Копировать dry-run')}/>
    <h4>03. {t('Deploy on your server', 'Разверните на сервере')}</h4><p>{t('For an installed and reviewed LaraShip toolkit. This creates an application and runs migrations. Protect the terminal output: LaraShip prints generated credentials.', 'Для установленного и проверенного LaraShip. Команда создаст приложение и запустит миграции. Защитите вывод терминала: LaraShip показывает созданные пароли.')}</p>
    <CodeBlock t={t} title={result.needsSecret ? 'TEMPLATE · manual secret required' : 'bash · deploy'} code={result.deploy} copyLabel={result.needsSecret ? t('Copy deployment template', 'Копировать шаблон deploy') : t('Copy command', 'Копировать команду')}/>
    {result.needsSecret && <details><summary>{t('Enter the native MySQL password privately on the server', 'Ввести пароль native MySQL локально на сервере')}</summary><p>{t('Bash only. Hidden input avoids typing the literal secret into shell history. The password is still visible in process arguments (ps). Use a private terminal and review the command.', 'Только Bash. Скрытый ввод позволяет не писать пароль в истории shell. Он всё ещё виден в аргументах процесса (ps). Используйте приватный терминал и проверьте команду.')}</p><CodeBlock t={t} title="bash · interactive secret" code={result.nativeMysqlSnippet} copyLabel={t('Copy interactive snippet', 'Копировать интерактивный вариант')}/></details>}
    <details><summary>{t('Prefer a configuration file?', 'Предпочитаете конфигурационный файл?')}</summary><p>{t('The download contains your entered non-password settings. Hooks or URLs may contain sensitive data: review the file. Keep it out of Git, run chmod 600 deploy.config, and never source it as a shell script. Precedence: preset → config → CLI; modules and enabled booleans remain additive.', 'Файл содержит введённые настройки без паролей. Hooks и URL могут содержать чувствительные данные: проверьте файл. Не добавляйте его в Git, выполните chmod 600 deploy.config и не запускайте как shell-скрипт. Приоритет: preset → config → CLI; модули и включённые флаги добавляются.')}</p>{result.needsSecret && <p className="template-label">{t('Config is a template: replace <MYSQL_ROOT_PASSWORD> only on the server.', 'Config — шаблон: замените <MYSQL_ROOT_PASSWORD> только на сервере.')}</p>}<button className="button secondary" onClick={download}>{t('Download configuration', 'Скачать конфигурацию')}</button><CodeBlock t={t} title="bash · config" code={'chmod 600 /path/to/deploy.config\nsudo bash /opt/laraship/deploy-laravel.sh --config /path/to/deploy.config'} copyLabel={t('Copy config instructions', 'Копировать инструкции config')}/></details>
    <h4>{t('After deployment', 'После развёртывания')}</h4><p>{t('Deploy refuses an existing project directory. Use update.sh for repository applications. Keep an off-server copy of important data and database dumps.', 'Повторный deploy в существующий каталог запрещён. Для приложений из репозитория используйте update.sh. Храните важные данные и дампы вне сервера.')}</p><CodeBlock t={t} title="bash · management" code={after} copyLabel={t('Copy management commands', 'Копировать команды управления')}/>
    <div className="wizard-actions"><button className="button secondary" onClick={() => onEdit(0)}>{t('Edit settings', 'Изменить настройки')}</button><button className="text-button" onClick={onReset}>{t('Start over', 'Начать заново')}</button></div>
  </div>;
}
