import { useId, useState } from 'react';
import { WIZARD_ARGUMENTS } from '../../data/wizardArguments';
import { translator, type Language } from '../../i18n';

export function ArgumentFinder({ language, onSelect }: { language: Language; onSelect: (step: number, flag: string, target: string) => void }) {
  const [query, setQuery] = useState('');
  const id = useId();
  const t = translator(language);
  const matches = query.trim() ? WIZARD_ARGUMENTS.filter(option => `${option.flag} ${option.description}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  return <div className="wizard-argument-finder">
    <label htmlFor={id}>{t('Find a setting by CLI argument', 'Найти настройку по CLI-аргументу')}</label>
    <input id={id} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="--db-postgres-user" autoComplete="off" aria-describedby={`${id}-help`}/>
    <p id={`${id}-help`} className="hint">{t('Jump directly to the field in this wizard. For example: --db-postgres-user or --completion-timeout. Options appear when their database, module or runner is selected.', 'Перейдите прямо к полю в мастере. Например: --db-postgres-user или --completion-timeout. Параметры появляются при выборе соответствующей БД, модуля или способа запуска.')}</p>
    {query.trim() && <div className="wizard-argument-matches"><p role="status">{matches.length ? `${matches.length} ${t('matching settings', 'настроек найдено')}` : t('No matching deployment setting.', 'Такая настройка развёртывания не найдена.')}</p>{matches.slice(0, 8).map(option => <button type="button" key={option.flag} onClick={() => { onSelect(option.step, option.flag, option.target); setQuery(''); }}><code>{option.flag}</code><span>{option.description}</span><small>{t('Step', 'Шаг')} {option.step + 1} ↗</small></button>)}{matches.length > 8 && <p className="hint">{t('Refine the search to see the remaining matches.', 'Уточните поиск, чтобы увидеть остальные совпадения.')}</p>}</div>}
  </div>;
}
