import { effectiveConfig } from '../../domain/constraints';
import { applicableSecrets, type SecretOption } from '../../domain/secrets';
import type { WizardConfig } from '../../domain/wizardSchema';
import { translator, type Language } from '../../i18n';
import { Toggle } from './Fields';

export function SecretSettings({ config, onChange, language, keys, inline = false }: { config: WizardConfig; onChange: (changes: Partial<WizardConfig>) => void; language: Language; keys?: readonly SecretOption[]; inline?: boolean }) {
  const t = translator(language);
  const options = applicableSecrets(effectiveConfig(config)).filter(option => !keys || keys.includes(option.key));
  if (!options.length) return null;
  const title = t('Custom passwords — server-side templates', 'Свои пароли — шаблоны для сервера');
  const content = <>
    <p className="hint">{t('By default LaraShip generates passwords. To set your own, select a template below, download the configuration and replace its marked placeholders privately on the server. No password is entered or saved on this website. Custom selection makes the output an incomplete template.', 'По умолчанию LaraShip создаёт пароли. Для своих паролей выберите шаблон ниже, скачайте config и замените отмеченные заглушки приватно на сервере. Сайт не принимает и не сохраняет пароли. При выборе результат становится незавершённым шаблоном.')}</p>
    {options.map(option => <Toggle key={option.key} flags={`--${option.key}`} label={t(option.en, option.ru)} checked={config.customSecrets.includes(option.key)} onChange={enabled => onChange({ customSecrets: enabled ? [...config.customSecrets, option.key] : config.customSecrets.filter(key => key !== option.key) })} hint={option.placeholder}/>)}
    {config.dbType === 'mysql' && config.dbLocation === 'docker' && options.some(option => option.key.startsWith('db-mysql')) && <p className="hint">{t('Container MySQL passwords also cannot contain quotes or backslashes.', 'Пароли контейнера MySQL также не допускают кавычки и обратный слеш.')}</p>}
    <div className="notice warning">{t('Passwords reject control characters. Fill placeholders only on the server. Config files and project ZIPs contain secrets: chmod 600, keep out of Git and protect logs. Command-line passwords remain visible to process inspection.', 'Пароли не допускают управляющие символы. Заполняйте заглушки только на сервере. Config и ZIP проекта содержат секреты: chmod 600, храните вне Git и защищайте логи. Пароли в аргументах команд видны при просмотре процессов.')}</div>
  </>;
  return inline ? <fieldset className="wizard-settings"><legend>{title}</legend>{content}</fieldset> : <details><summary>{title}</summary>{content}</details>;
}
