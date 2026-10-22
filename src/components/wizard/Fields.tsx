import { useId, type ReactNode } from 'react';
import type { Issue } from '../../domain/wizardSchema';

export function Field({ label, value, onChange, hint, placeholder, field, issues = [], type = 'text' }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string;
  placeholder?: string; field: string; issues?: Issue[]; type?: string;
}) {
  const id = useId();
  const errors = issues.filter(issue => issue.field === field);
  return <div className="field"><label htmlFor={id}>{label}</label>
    <input id={id} type={type} value={value} onChange={event => onChange(event.target.value)}
      placeholder={placeholder} autoComplete="off" spellCheck={false} aria-invalid={errors.length > 0}
      aria-describedby={hint || errors.length ? `${id}-hint` : undefined} />
    <div id={`${id}-hint`}>{hint && <p className="hint">{hint}</p>}{errors.map(error => <p className="field-error" key={error.code}>{error.message}</p>)}</div>
  </div>;
}
export function Toggle({ label, checked, onChange, hint, disabled = false }: {
  label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string; disabled?: boolean;
}) {
  return <label className={`toggle-row ${disabled ? 'locked' : ''}`}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled}/>
    <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span></label>;
}
export function Choice({ name, value, selected, onSelect, title, children, icon }: {
  name: string; value: string; selected: boolean; onSelect: () => void; title: string; children: ReactNode; icon?: ReactNode;
}) {
  return <label className={`choice ${selected ? 'selected' : ''}`}>
    <input type="radio" name={name} value={value} checked={selected} onChange={onSelect}/>
    <span className="choice-content">{icon && <span className="choice-icon">{icon}</span>}<strong>{title}</strong><span>{children}</span></span>
  </label>;
}
