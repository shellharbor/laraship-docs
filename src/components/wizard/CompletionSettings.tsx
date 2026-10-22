import type { Issue, WizardConfig } from '../../domain/wizardSchema';
import { sourceLink } from '../../data/upstream';
import { translator, type Language } from '../../i18n';
import { Field, Toggle } from './Fields';

export function CompletionSettings({ config, onChange, language, issues }: {
  config: WizardConfig; onChange: (changes: Partial<WizardConfig>) => void; language: Language; issues: Issue[];
}) {
  const t = translator(language);
  return <div className="completion-settings">
    <Toggle label={t('Deployment completion notification', 'Уведомление об итоге развёртывания')} checked={config.completionEnabled}
      onChange={completionEnabled => onChange({ completionEnabled })}
      hint={t('New in 1.3.0: final JSON after success, operational failure or handled cancellation.', 'Новое в 1.3.0: итоговый JSON при успехе, рабочей ошибке или обработанной отмене.')}/>
    {config.completionEnabled && <div className="completion-fields">
      <p className="hint">{t('Choose a script, an API, or both. Runs after archive creation and releases the project lock before delivery. Callback errors keep the original deployment exit status. Dry run validates without delivery; invalid settings and abrupt system termination do not trigger it. Deployment only, including when run through Python.', 'Выберите скрипт, API или оба. Уведомление идёт после создания архива; lock проекта снимается перед отправкой. Ошибки доставки не меняют исходный код завершения. Dry-run проверяет без отправки; неверные настройки и аварийное завершение системы не вызывают hook. Только deploy, в том числе через Python.')}</p>
      <Field label={t('Completion script path (optional)', 'Путь к скрипту завершения (необязательно)')} field="onComplete" value={config.onComplete}
        onChange={onComplete => onChange({ onComplete, completionScriptConsent: false })} placeholder="/opt/laraship-hooks/notify.sh" issues={issues}
        hint={t('Existing executable on the server. Receives JSON on stdin; runs as the deploy user, normally root. In Docker it runs inside the CLI container.', 'Готовый исполняемый файл на сервере. Получает JSON через stdin и работает от пользователя deploy, обычно root. В Docker выполняется внутри CLI-контейнера.')}/>
      {config.onComplete && <Toggle label={t('I trust this script to run with deployment privileges', 'Я доверяю скрипту выполнение с правами развёртывания')} checked={config.completionScriptConsent} onChange={completionScriptConsent => onChange({ completionScriptConsent })}/>}
      <Field label={t('Completion API URL (optional)', 'URL API завершения (необязательно)')} field="completionEndpoint" value={config.completionEndpoint}
        onChange={completionEndpoint => onChange({ completionEndpoint, completionEndpointConsent: false })} placeholder="https://api.example.com/deployments/completed" issues={issues}
        hint={t('HTTPS POST with JSON and Idempotency-Key: run_id. One attempt, no automatic retries. The browser never contacts this API.', 'HTTPS POST с JSON и Idempotency-Key: run_id. Одна попытка без автоповторов. Браузер не обращается к API.')}/>
      {config.completionEndpoint && <Toggle label={t('I trust this API with the final deployment report', 'Я доверяю API итоговый отчёт развёртывания')} checked={config.completionEndpointConsent} onChange={completionEndpointConsent => onChange({ completionEndpointConsent })}/>}
      <Field label={t('Bearer token file path (optional)', 'Путь к файлу Bearer-токена (необязательно)')} field="completionTokenFile" value={config.completionTokenFile}
        onChange={completionTokenFile => onChange({ completionTokenFile })} placeholder="/root/laraship-api.token" issues={issues}
        hint={t('Enter only the server path. File owned by the deploy user, mode 600 or stricter; never paste the token here. Requires the completion API.', 'Только путь на сервере. Файл принадлежит пользователю deploy, права 600 или строже. Не вставляйте сам токен. Требуется API завершения.')}/>
      <Field label={t('Completion timeout (seconds)', 'Тайм-аут завершения (секунды)')} field="completionTimeout" value={config.completionTimeout} type="number"
        onChange={completionTimeout => onChange({ completionTimeout })} issues={issues} hint={t('1–300 per target. Default: 30.', '1–300 для каждой цели. По умолчанию: 30.')}/>
      <Toggle label={t('Include application passwords in both completion targets', 'Включить пароли приложения для обеих целей завершения')} checked={config.completionIncludeSecrets}
        onChange={completionIncludeSecrets => onChange({ completionIncludeSecrets })} hint={t('Off by default. Explicitly shares known DB, Redis, Basic Auth and Filament passwords. Never includes DB root passwords, API tokens, SSH keys or .env.', 'По умолчанию выключено. Передаст известные пароли БД приложения, Redis, Basic Auth и Filament. Root-пароли БД, токены API, SSH-ключи и .env не включаются.')}/>
      <div className={`notice ${config.completionIncludeSecrets ? 'danger' : ''}`}>{t('Reports contain project details and may include unverified fields on failure. Protect receiver storage. Hook/token files and all parent directories must have trusted ownership and permissions, without symlinks. For sudo deployment use root-owned files. Docker commands mount these files read-only at identical paths. A non-root dry run may not read root-only inputs: validate those on the server with sudo.', 'Отчёт содержит данные проекта; при ошибке часть полей может быть непроверенной. Защитите хранилище получателя. Hook, токен и родительские каталоги требуют доверенных владельцев и прав, без symlink. Для sudo deploy используйте файлы root. Docker подключает их по тем же путям только для чтения. Dry-run без root может не прочитать закрытые файлы: проверьте их на сервере через sudo.')}</div>
      <a className="documentation-link" href={sourceLink('docs/COMPLETION.md')} target="_blank" rel="noopener noreferrer">{t('Completion report and file permissions', 'Отчёт завершения и права файлов')} ↗</a>
    </div>}
  </div>;
}
