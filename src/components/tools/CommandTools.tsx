import { useState } from 'react';
import { executionIssues, type ExecutionSettings } from '../../domain/execution';
import { inspection, type Runner } from '../../domain/runner';
import { translator, type Language } from '../../i18n';
import { ManagementBuilder } from './ManagementBuilder';
import { KubernetesBuilder } from './KubernetesBuilder';
import { CodeBlock } from '../CodeBlock';

export function CommandTools({ language, runner, onRunnerChange, settings }: { language: Language; runner: Runner; onRunnerChange: (runner: Runner) => void; settings: ExecutionSettings }) {
  const t = translator(language);
  const [tool, setTool] = useState<'management' | 'kubernetes'>('management');
  const inspectionIssues = executionIssues(settings, runner);
  return <section id="tools" className="cli-section" aria-label={t('LaraShip operation tools', 'Операции LaraShip')}><span className="eyebrow">{t('BEYOND THE FIRST DEPLOYMENT', 'ПОСЛЕ ПЕРВОГО РАЗВЁРТЫВАНИЯ')}</span><h2>{t('The rest of the journey.', 'Дальнейший путь проекта.')}</h2>
    <div className="tool-tabs" role="group" aria-label={t('Command builder', 'Выбор генератора')}><button className="button secondary" type="button" aria-pressed={tool === 'management'} onClick={() => setTool('management')}>{t('Project management', 'Управление проектом')}</button><button className="button secondary" type="button" aria-pressed={tool === 'kubernetes'} onClick={() => setTool('kubernetes')}>Kubernetes</button></div>
    {tool === 'management' ? <ManagementBuilder language={language} runner={runner} onRunnerChange={onRunnerChange} settings={settings}/> : <KubernetesBuilder language={language} settings={settings}/>}
    <details id="toolkit-inspection"><summary>{t('Help, version, modules and presets', 'Справка, версия, модули и пресеты')}</summary><p className="hint">{t('Informational deployment commands. They never deploy or deliver hooks. Keep actions separate from normal deployment arguments.', 'Информационные команды deploy. Они не разворачивают проект и не вызывают hooks. Не смешивайте их с обычными параметрами развёртывания.')}</p>{inspectionIssues.length > 0 ? <p className="notice danger">{t('Fix the execution settings in Installation first.', 'Сначала исправьте параметры запуска в разделе установки.')}</p> : <CodeBlock t={t} title={`${runner} · inspect`} code={(['--help', '--version', '--list-modules', '--list-presets'] as const).map(action => inspection(runner, action, settings)).join('\n\n')} copyLabel={t('Copy inspection commands', 'Копировать команды справки')}/>}</details>
  </section>;
}
