import { useId } from 'react';
import { usesDocker, type Runner } from '../domain/runner';
import { CLI_IMAGE } from '../data/upstream';
import { executionIssues, type ExecutionSettings as Settings } from '../domain/execution';
import { translator, type Language } from '../i18n';
import { CliFlags, Field, Toggle } from './wizard/Fields';

export function ExecutionSettings({ settings, onChange, language, inline = false, runner }: { settings: Settings; onChange: (value: Settings) => void; language: Language; inline?: boolean; runner?: Runner }) {
  const t = translator(language);
  const update = (changes: Partial<Settings>) => onChange({ ...settings, ...changes });
  const errors = executionIssues(settings, runner);
  const inputId = useId();
  const docker = !runner || usesDocker(runner);
  const native = !runner || !usesDocker(runner);
  const title = t('Execution paths, image and read-only inputs', 'Пути запуска, образ и файлы только для чтения');
  const content = <>
    <p className="hint">{t('Shared by generated deployment and management commands. These settings stay in memory and are cleared on reload. Paths refer to the target Linux server; the browser cannot check files or permissions.', 'Общие параметры команд развёртывания и управления. Хранятся в памяти и сбрасываются при перезагрузке. Пути относятся к целевому Linux-серверу; браузер не проверяет файлы и права.')}</p>
    {native && <Field flags="--directory" label={t('Native toolkit directory', 'Каталог native toolkit')} field="runtime-directory" value={settings.directory} onChange={directory => update({ directory })} hint="Python: --directory"/>}
    <Field flags="--config" label={t('Configuration file path on server', 'Путь к файлу конфигурации на сервере')} field="runtime-config" value={settings.configPath} onChange={configPath => update({ configPath })} hint={t('Upload the downloaded config here, or use your existing file. Review all settings before using --config; the website does not read the server file.', 'Перенесите сюда скачанный config или используйте готовый файл. Проверьте настройки перед --config; сайт не читает файл с сервера.')}/>
    {docker && <><Field flags="--image" label={t('Administrative CLI image', 'Административный образ CLI')} field="runtime-image" value={settings.image} onChange={image => update({ image, imageConsent: false })} hint={t('Python: --image. Exact release tag or SHA-256 digest. Only the default 1.3.0 image was audited; this is separate from a Kubernetes application image.', 'Python: --image. Точный release tag или SHA-256 digest. Проверен только образ 1.3.0 по умолчанию; это не образ приложения Kubernetes.')}/>
    {settings.image !== CLI_IMAGE.reference && <Toggle label={t('I trust this administrative image and have checked CLI compatibility', 'Я доверяю административному образу и проверил совместимость CLI')} checked={settings.imageConsent} onChange={imageConsent => update({ imageConsent })}/>}
    <Field flags="--archive-dir" label={t('Docker archive directory', 'Каталог архивов Docker')} field="runtime-archive" value={settings.archiveDir} onChange={archiveDir => update({ archiveDir })} hint={t('Python: --archive-dir; direct Docker: LARASHIP_ARCHIVE_DIR and an identical writable bind. Create it on the server first.', 'Python: --archive-dir; прямой Docker: LARASHIP_ARCHIVE_DIR и одинаковый bind с правом записи. Сначала создайте каталог на сервере.')}/>
    </>}
    {native && <Field label={t('Native archive directory (optional)', 'Каталог архивов native (необязательно)')} field="runtime-native-archive" value={settings.nativeArchiveDir} onChange={nativeArchiveDir => update({ nativeArchiveDir })} placeholder="/tmp" hint={t('LARASHIP_ARCHIVE_DIR. Leave empty for /tmp; a custom absolute directory must already exist.', 'LARASHIP_ARCHIVE_DIR. Пустое поле означает /tmp; другой абсолютный каталог должен существовать.')}/>}
    {docker && <div className="field" data-cli-flag="--mount-readonly"><label htmlFor={inputId}>{t('Additional read-only server inputs', 'Дополнительные файлы сервера только для чтения')}</label><CliFlags flags="--mount-readonly"/><textarea id={inputId} rows={3} value={settings.readonlyMounts.join('\n')} onChange={event => update({ readonlyMounts: event.target.value.split('\n') })} onBlur={() => update({ readonlyMounts: settings.readonlyMounts.map(path => path.trim()).filter(Boolean) })} placeholder="/opt/laraship-input"/><p className="hint">{t('One absolute file/directory path per line. Python: repeatable --mount-readonly. Config/key/hook/token paths are mounted automatically. Do not hide server, system or toolkit paths.', 'Один абсолютный путь к файлу или каталогу на строку. Python: повторяемый --mount-readonly. Config, ключ, hook и токен подключаются автоматически. Не скрывайте системные пути, toolkit и каталоги сервера.')}</p></div>}
    {errors.length > 0 && <div className="notice danger" role="status"><strong>{t('Check execution settings', 'Проверьте параметры запуска')}</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
  </>;
  return inline ? <fieldset className="execution-settings wizard-settings"><legend>{title}</legend>{content}</fieldset> : <details className="execution-settings"><summary>{title}</summary>{content}</details>;
}
