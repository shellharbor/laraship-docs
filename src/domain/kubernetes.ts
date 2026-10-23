import { absolutePath, defaultExecution, executionIssues, singleLine, type ExecutionSettings } from './execution';
import { nativePrefix, bindMount } from './runner';
import { shellQuote } from './shellQuote';

export interface KubernetesConfig {
  mode: 'render' | 'deploy'; runner: 'bash' | 'docker'; name: string; namespace: string; configmap: string; secret: string;
  revision: string; image: string; context: string; replicas: string; worker: boolean; imagePullSecret: string; readinessPath: string;
  kubeconfig: string; acknowledged: boolean;
}
export const defaultKubernetes: KubernetesConfig = { mode: 'render', runner: 'docker', name: '', namespace: '', configmap: '', secret: '',
  revision: '', image: '', context: '', replicas: '2', worker: false, imagePullSecret: '', readinessPath: '/up', kubeconfig: '', acknowledged: false };
const dns = (value: string) => value.length <= 40 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value);
export function kubernetesIssues(config: KubernetesConfig, settings: ExecutionSettings = defaultExecution): string[] {
  const issues = executionIssues(settings, config.runner === 'docker' ? 'kubernetes-docker' : 'kubernetes-bash');
  for (const field of ['name', 'namespace', 'configmap', 'secret', 'revision'] as const) if (!dns(config[field])) issues.push(`${field}: use a lowercase DNS label, 1–40 characters.`);
  if (config.imagePullSecret && !dns(config.imagePullSecret)) issues.push('image-pull-secret: use a lowercase DNS label, 1–40 characters.');
  if (!/^[a-zA-Z0-9./:_@-]+$/.test(config.image) || (config.image.includes('@sha256:') ? !/^.+@sha256:[0-9a-f]{64}$/.test(config.image) : !config.image.split('/').at(-1)?.includes(':') || config.image.endsWith(':latest'))) issues.push('Use a versioned application image or lowercase SHA-256 digest; latest is unsupported.');
  if (!/^\d+$/.test(config.replicas) || +config.replicas < 1 || +config.replicas > 100) issues.push('Replicas must be a whole number from 1 to 100.');
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(config.readinessPath)) issues.push('Readiness path must start with / and contain only letters, digits, /, _ or -.');
  if (!singleLine(config.context) || config.context.startsWith('-')) issues.push('Use a single-line kubeconfig context identifier, not an option.');
  if (config.kubeconfig && !absolutePath(config.kubeconfig)) issues.push('Use an absolute kubeconfig file path; enter no credentials.');
  if (config.mode === 'deploy') {
    if (!config.context.trim()) issues.push('Deployment requires an explicit --context.');
    if (config.runner === 'docker' && !config.kubeconfig) issues.push('Docker deployment requires an explicit read-only kubeconfig file path.');
    if (!config.acknowledged) issues.push('Acknowledge the target context, migration and rollout before generating deploy.');
  }
  return issues;
}
export function generateKubernetes(config: KubernetesConfig, settings: ExecutionSettings = defaultExecution) {
  const issues = kubernetesIssues(config, settings);
  if (issues.length) throw new Error(issues.join('\n'));
  const argv: string[] = [config.mode];
  for (const field of ['name', 'namespace', 'configmap', 'secret', 'revision', 'image'] as const) argv.push(`--${field}`, config[field]);
  if (config.context) argv.push('--context', config.context);
  if (+config.replicas !== 2) argv.push('--replicas', String(+config.replicas));
  if (config.worker) argv.push('--worker');
  if (config.imagePullSecret) argv.push('--image-pull-secret', config.imagePullSecret);
  if (config.readinessPath !== '/up') argv.push('--readiness-path', config.readinessPath);
  const formatted = argv.map(shellQuote).join(' ');
  let command: string;
  if (config.runner === 'bash') {
    const environment = config.kubeconfig ? `env ${shellQuote(`KUBECONFIG=${config.kubeconfig}`)} ` : '';
    command = `${environment}${nativePrefix('kubernetes.sh', false, { ...settings, nativeArchiveDir: '' })} ${formatted}`;
  } else {
    const options = ['docker run --rm --init --user "$(id -u):$(id -g)"', ...(config.mode === 'render' ? ['--network none'] : []), '--read-only --tmpfs /tmp'];
    if (config.kubeconfig && config.mode === 'deploy') options.push(`--mount ${shellQuote(bindMount(config.kubeconfig, true))}`, `--env ${shellQuote(`KUBECONFIG=${config.kubeconfig}`)}`);
    command = `${options.join(' \\\n  ')} \\\n  ${shellQuote(settings.image)} kubernetes ${formatted}`;
  }
  return { argv, command };
}
