import { useState } from 'react';
import { executionIssues, type ExecutionSettings } from '../../domain/execution';
import { inspection, type Runner } from '../../domain/runner';
import { translator, type Language } from '../../i18n';
import { CodeBlock } from '../CodeBlock';

export function ToolkitInspection({ runner, settings, language }: { runner: Runner; settings: ExecutionSettings; language: Language }) {
  const [action, setAction] = useState<'--help' | '--version' | '--list-modules' | '--list-presets'>('--help');
  const t = translator(language);
  return <details data-cli-flag="--help --version --list-modules --list-presets --dry-run" className="wizard-settings"><summary>{t('CLI help and inspection commands', 'Справка CLI и информационные команды')}</summary>
    <p className="hint">{t('These actions exit without deployment. They are separate commands; --dry-run for your configured deployment appears in the final step.', 'Эти действия завершаются без развёртывания. Это отдельные команды; --dry-run для настроенного проекта появится на итоговом шаге.')}</p>
    <div className="field"><label htmlFor="wizard-inspection-action">{t('Informational CLI action', 'Информационное действие CLI')}</label><select id="wizard-inspection-action" value={action} onChange={event => setAction(event.target.value as typeof action)}>{['--help', '--version', '--list-modules', '--list-presets'].map(flag => <option key={flag}>{flag}</option>)}</select></div>
    {!executionIssues(settings, runner).length && <CodeBlock t={t} title={`${runner} · ${action}`} code={inspection(runner, action, settings)} copyLabel={t('Copy informational command', 'Копировать информационную команду')}/>}
  </details>;
}
