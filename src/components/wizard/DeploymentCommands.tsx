import { useId } from 'react';
import { deploymentVariants } from '../../domain/commandVariants';
import type { ExecutionSettings } from '../../domain/execution';
import { usesDocker, type Runner } from '../../domain/runner';
import type { WizardConfig } from '../../domain/wizardSchema';
import { localizeIssues, translator, type Language } from '../../i18n';
import { CodeBlock } from '../CodeBlock';

export function DeploymentCommands({ config, execution, runner, language, onEdit }: {
  config: WizardConfig; execution: ExecutionSettings; runner: Runner; language: Language; onEdit: (step: number) => void;
}) {
  const t = translator(language);
  const id = useId();
  const variants = deploymentVariants(config, execution);
  const names = { bash: 'Bash', docker: 'Docker', 'python-native': 'Python · native', 'python-docker': 'Python · Docker' };
  return <div className="deployment-commands">
    <p>{t('Choose one compatible command below and run it once. Bash, Docker and both Python backends use the same wizard configuration. Install LaraShip for the method you choose first.', 'Выберите одну совместимую команду ниже и выполните её один раз. Bash, Docker и оба бэкенда Python используют одну конфигурацию мастера. Сначала установите LaraShip для выбранного способа.')}</p>
    {variants.some(variant => usesDocker(variant.runner) && variant.result) && <div className="notice warning">{t('Docker-backed commands run on the target Linux amd64 server. Preserve host networking and all writable server mounts. The Docker socket grants administrator access; review and trust the CLI image. Input files must already exist on that server and are mounted read-only.', 'Команды с Docker запускаются на целевом сервере Linux amd64. Сохраните host network и все серверные mount с правом записи. Docker socket даёт права администратора; проверьте образ CLI. Входные файлы должны существовать на сервере и подключаются только для чтения.')}</div>}
    {variants.map(({ runner: target, issues, result }) => {
      const selected = target === runner;
      const title = names[target];
      const copyLabel = selected ? result?.needsSecret ? t('Copy deployment template', 'Копировать шаблон deploy') : t('Copy command', 'Копировать команду')
        : result?.needsSecret ? t(`Copy ${title} template`, `Копировать шаблон ${title}`) : t(`Copy ${title} command`, `Копировать команду ${title}`);
      return <section key={target} className={`deployment-variant ${selected ? 'selected' : ''}`} data-runner={target} data-selected={selected} aria-labelledby={`${id}-${target}`}>
        <h5 id={`${id}-${target}`}>{title}{selected && <span className="badge">{t('Selected', 'Выбран')}</span>}</h5>
        {result ? <>
          {result.needsSecret && <p className="template-label">{t('TEMPLATE: replace marked password placeholders privately on the server before running.', 'ШАБЛОН: перед запуском замените отмеченные заглушки паролей приватно на сервере.')}</p>}
          <CodeBlock t={t} title={selected && result.needsSecret ? 'TEMPLATE · manual secret required' : `${target} · deploy${result.needsSecret ? ' · TEMPLATE' : ''}`} code={result.deploy} copyLabel={copyLabel}/>
        </> : <div className="notice warning" role="status"><p>{t('Unavailable for these settings:', 'Недоступно с этими настройками:')}</p><ul>{localizeIssues(issues, language).map((issue, index) => <li key={index}>{issue.message}</li>)}</ul><button type="button" className="text-button" onClick={() => onEdit(issues[0].step)}>{t('Review settings', 'Проверить настройки')} ↗</button></div>}
      </section>;
    })}
  </div>;
}
