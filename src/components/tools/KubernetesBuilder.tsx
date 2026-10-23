import { useState } from 'react';
import { defaultKubernetes, generateKubernetes, kubernetesIssues, type KubernetesConfig } from '../../domain/kubernetes';
import type { ExecutionSettings } from '../../domain/execution';
import { translator, type Language } from '../../i18n';
import { sourceLink } from '../../data/upstream';
import { Field, Toggle } from '../wizard/Fields';
import { CodeBlock } from '../CodeBlock';

export function KubernetesBuilder({ language, settings }: { language: Language; settings: ExecutionSettings }) {
  const t = translator(language);
  const [config, setConfig] = useState<KubernetesConfig>({ ...defaultKubernetes });
  const [attempted, setAttempted] = useState(false);
  const [generated, setGenerated] = useState(false);
  const update = (changes: Partial<KubernetesConfig>) => { setConfig(previous => ({ ...previous, ...changes, acknowledged: false })); setGenerated(false); setAttempted(false); };
  const issues = kubernetesIssues(config, settings);
  const fields: [keyof KubernetesConfig, string, string, string][] = [
    ['name', 'Kubernetes application name', 'Имя приложения Kubernetes', 'shop'], ['namespace', 'Existing namespace', 'Существующий namespace', 'shop'],
    ['configmap', 'Immutable ConfigMap name', 'Имя immutable ConfigMap', 'shop-config-v1'], ['secret', 'Immutable Secret name', 'Имя immutable Secret', 'shop-secret-v1'],
    ['revision', 'Release revision', 'Ревизия релиза', 'release-1'], ['image', 'Versioned application image', 'Версионный образ приложения', 'registry.example.com/shop:1.0'],
    ['context', 'Explicit kubectl context', 'Явный context kubectl', 'production'], ['replicas', 'Web replicas (1–100)', 'Web-реплики (1–100)', '2'],
    ['imagePullSecret', 'Registry Secret name (optional)', 'Имя registry Secret (необязательно)', 'registry-access'], ['readinessPath', 'HTTP readiness path', 'Путь HTTP readiness', '/up'],
    ['kubeconfig', 'Kubeconfig file path (optional for native)', 'Путь kubeconfig (необязательно для native)', '/root/.kube/config'],
  ];
  return <div className="tool-form" role="region" aria-label={t('Kubernetes command builder', 'Генератор команд Kubernetes')}>
    <p>{t('Independent application-image adapter. It does not provision a database, Redis, ingress, DNS, TLS or credentials. Python CLI 1.3.0 has no Kubernetes subcommand. Render is offline; deploy contacts the selected cluster when you run it yourself.', 'Отдельный адаптер образа приложения. Он не создаёт БД, Redis, ingress, DNS, TLS или пароли. В Python CLI 1.3.0 нет команды Kubernetes. Render работает офлайн; deploy обращается к выбранному кластеру при самостоятельном запуске.')}</p>
    <form onSubmit={event => { event.preventDefault(); setAttempted(true); setGenerated(!issues.length); }} noValidate>
      <div className="choice-grid"><div className="field"><label htmlFor="kube-mode">{t('Kubernetes operation', 'Операция Kubernetes')}</label><select id="kube-mode" value={config.mode} onChange={event => update({ mode: event.target.value as KubernetesConfig['mode'] })}><option value="render">render · {t('Print manifests', 'Вывести манифесты')}</option><option value="deploy">deploy · {t('Migrate and roll out', 'Миграции и rollout')}</option></select></div><div className="field"><label htmlFor="kube-runner">{t('Kubernetes execution', 'Запуск Kubernetes')}</label><select id="kube-runner" value={config.runner} onChange={event => update({ runner: event.target.value as KubernetesConfig['runner'] })}><option value="docker">Docker CLI</option><option value="bash">Bash · kubernetes.sh</option></select></div></div>
      <div className="tools-field-grid">{fields.map(([key, en, ru, placeholder]) => <Field key={key} label={t(en, ru)} field={`kube-${key}`} value={String(config[key])} onChange={value => update({ [key]: value })} placeholder={placeholder} type={key === 'replicas' ? 'number' : 'text'}/>)}</div>
      <Toggle label={t('Enable Kubernetes queue worker', 'Включить queue worker Kubernetes')} checked={config.worker} onChange={worker => update({ worker })} hint={t('--worker. Off sets desired worker replicas to zero, stopping an old worker deployment.', '--worker. При выключении число worker-реплик равно нулю: старый worker будет остановлен.')}/>
      <div className="notice">{t('Use a built Laravel application image, not the administrative LaraShip CLI image. Namespace and versioned immutable ConfigMap/Secret must already exist. External PostgreSQL/MySQL is required. Multiple replicas require shared session/cache/filesystem state. Enter resource names and a kubeconfig path, never secret contents. Docker uses non-root execution without the server Docker socket or project mounts.', 'Укажите собранный образ Laravel-приложения, а не административный образ LaraShip CLI. Namespace и версионные immutable ConfigMap/Secret должны существовать. Нужна внешняя PostgreSQL/MySQL. Несколько реплик требуют общего хранилища сессий/cache/filesystem. Вводите имена объектов и путь kubeconfig, а не содержимое секретов. Docker запускается без root, server socket и каталогов проекта.')}</div>
      {config.mode === 'deploy' && <><div className="notice warning">{t('Deploy runs a migration Job before rollout. Use a new revision for a release or explicit retry, keep migrations compatible with old replicas, and inspect retained Leases after failure. Rendering does not prove cluster readiness. Container kubeconfig must contain embedded credentials/certificates; external exec-auth plugins need separate provisioning.', 'Deploy выполняет migration Job перед rollout. Для релиза или явного повтора нужна новая revision; миграции должны быть совместимы со старыми репликами. При ошибке проверьте сохранённый Lease. Render не доказывает готовность кластера. Для контейнера нужен kubeconfig со встроенными credentials/сертификатами; внешние exec-auth plugins требуют отдельной подготовки.')}</div><Toggle label={t('I checked the target context, existing resources and migration impact', 'Я проверил целевой context, существующие ресурсы и влияние миграций')} checked={config.acknowledged} onChange={acknowledged => { setConfig(previous => ({ ...previous, acknowledged })); setGenerated(false); }}/></>}
      {attempted && issues.length > 0 && <div className="error-summary" role="alert"><strong>{t('Check Kubernetes settings', 'Проверьте параметры Kubernetes')}</strong><ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
      <button type="submit" className="button primary">{t('Generate Kubernetes command', 'Создать команду Kubernetes')}</button>
    </form>
    {generated && !issues.length && <CodeBlock t={t} title={`kubernetes · ${config.mode}`} code={generateKubernetes(config, settings).command} copyLabel={t('Copy Kubernetes command', 'Копировать команду Kubernetes')}/>}
    <a className="documentation-link" href={sourceLink('docs/KUBERNETES.md')} target="_blank" rel="noopener noreferrer">{t('Application image and cluster prerequisites', 'Образ приложения и требования к кластеру')} ↗</a>
  </div>;
}
