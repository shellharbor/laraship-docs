import { effectiveConfig } from '../../domain/constraints';
import { applicableSecrets } from '../../domain/secrets';
import type { WizardConfig } from '../../domain/wizardSchema';
import { translator, type Language } from '../../i18n';
import { Toggle } from './Fields';

export function SecretSettings({ config, onChange, language }: { config: WizardConfig; onChange: (changes: Partial<WizardConfig>) => void; language: Language }) {
  const t = translator(language);
  return <details><summary>{t('Custom passwords — server-side templates', 'Свои пароли — шаблоны для сервера')}</summary>
    <p className="hint">{t('By default LaraShip generates passwords. To set your own, select a template below, download the configuration and replace its marked placeholders privately on the server. No password is entered or saved on this website. Custom selection makes the output an incomplete template.', 'По умолчанию LaraShip создаёт пароли. Для своих паролей выберите шаблон ниже, скачайте config и замените отмеченные заглушки приватно на сервере. Сайт не принимает и не сохраняет пароли. При выборе результат становится незавершённым шаблоном.')}</p>
    {applicableSecrets(effectiveConfig(config)).map(option => <Toggle key={option.key} label={t(option.en, option.ru)} checked={config.customSecrets.includes(option.key)} onChange={enabled => onChange({ customSecrets: enabled ? [...config.customSecrets, option.key] : config.customSecrets.filter(key => key !== option.key) })} hint={`--${option.key} · ${option.placeholder}`}/>)}
    <div className="notice warning">{t('Container MySQL passwords cannot contain quotes or backslashes. All passwords reject control characters. Native MySQL additionally needs its existing administrative password. Config files and project ZIPs contain secrets: chmod 600, keep out of Git and protect logs. Command-line passwords remain visible to process inspection.', 'Пароли контейнера MySQL не допускают кавычки и обратный слеш. Во всех паролях запрещены управляющие символы. Native MySQL дополнительно требует существующий административный пароль. Config и ZIP проекта содержат секреты: chmod 600, храните вне Git и защищайте логи. Пароли в аргументах команд видны при просмотре процессов.')}</div>
  </details>;
}
