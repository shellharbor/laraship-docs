import { useId } from 'react';
import type { Runner } from '../domain/runner';
import { translator, type Language } from '../i18n';
import { Icon } from './Icon';

export function RunnerPicker({ runner, onChange, language, compact = false, dockerDisabled = false }: {
  runner: Runner; onChange: (runner: Runner) => void; language: Language; compact?: boolean; dockerDisabled?: boolean;
}) {
  const name = useId();
  const t = translator(language);
  return <fieldset className={`runner-picker ${compact ? 'compact' : ''}`}><legend>{t('Run LaraShip with', 'Способ запуска LaraShip')}</legend><div className="runner-options">
    {(['bash', 'docker'] as const).map(value => <label key={value} className={`runner-option ${runner === value ? 'active' : ''}`}>
      <input name={name} type="radio" value={value} checked={runner === value} disabled={value === 'docker' && dockerDisabled} onChange={() => onChange(value)}/>
      <span><strong><Icon name={value === 'bash' ? 'code' : 'box'} size={17}/>{value === 'bash' ? t('Bash script', 'Bash-скрипт') : t('Docker image', 'Docker-образ')}</strong>
        {!compact && <small>{value === 'bash' ? t('Full toolkit on the server. Docker or native databases.', 'Полный toolkit на сервере. БД в Docker или на хосте.') : t('Packaged CLI. Docker databases; Linux amd64 server.', 'CLI в образе. БД в Docker; сервер Linux amd64.')}</small>}</span>
    </label>)}
  </div></fieldset>;
}
