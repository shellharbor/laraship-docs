import { useId } from 'react';
import { usesDocker, type Runner } from '../domain/runner';
import { translator, type Language } from '../i18n';
import { Icon } from './Icon';

export function RunnerPicker({ runner, onChange, language, compact = false, dockerDisabled = false }: {
  runner: Runner; onChange: (runner: Runner) => void; language: Language; compact?: boolean; dockerDisabled?: boolean;
}) {
  const name = useId();
  const t = translator(language);
  const choices = [
    ['bash', t('Bash script', 'Bash-скрипт'), t('Full toolkit on the server. Docker or native databases.', 'Полный toolkit на сервере. БД в Docker или на хосте.')],
    ['docker', t('Docker image', 'Docker-образ'), t('Packaged CLI. Docker databases; Linux amd64 server.', 'CLI в образе. БД в Docker; сервер Linux amd64.')],
    ['python-native', 'Python CLI · native', t('pip/pipx adapter with the host Bash toolkit. Python 3.10+.', 'Адаптер pip/pipx с Bash toolkit на хосте. Python 3.10+.')],
    ['python-docker', 'Python CLI · Docker', t('pip/pipx adapter with the pinned Docker image. Container databases.', 'Адаптер pip/pipx с закреплённым Docker-образом. БД в контейнерах.')],
  ] as const;
  return <fieldset className={`runner-picker ${compact ? 'compact' : ''}`}><legend>{t('Run LaraShip with', 'Способ запуска LaraShip')}</legend><div className="runner-options">
    {choices.map(([value, title, description]) => <label key={value} className={`runner-option ${runner === value ? 'active' : ''}`}>
      <input name={name} type="radio" value={value} checked={runner === value} disabled={usesDocker(value) && dockerDisabled} onChange={() => onChange(value)} aria-labelledby={`${name}-${value}-title`} aria-describedby={!compact ? `${name}-${value}-hint` : undefined}/>
      <span><strong id={`${name}-${value}-title`}><Icon name={usesDocker(value) ? 'box' : 'code'} size={17}/>{title}</strong>
        {!compact && <small id={`${name}-${value}-hint`}>{description}</small>}</span>
    </label>)}
  </div></fieldset>;
}
