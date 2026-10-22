import { CLI_IMAGE } from '../data/upstream';
import { shellQuote } from './shellQuote';
import type { WizardConfig } from './wizardSchema';

export type Runner = 'bash' | 'docker';
export const CONFIG_PATH = '/path/to/deploy.config';
export const SERVER_MOUNTS = ['/var/run/docker.sock', '/var/www', '/run/lock/laraship', '/var/backups/laraship'] as const;
export const resolveRunner = (config: WizardConfig, requested: Runner): Runner => config.dbLocation === 'native' ? 'bash' : requested;

/** Docker --mount uses CSV internally; POSIX shell quoting is a separate layer. */
export function bindMount(path: string, readonly = false): string {
  const csv = (field: string) => /[",]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
  return ['type=bind', csv(`src=${path}`), csv(`dst=${path}`), ...(readonly ? ['readonly'] : [])].join(',');
}
export function dockerPrefix(server: boolean, files: string[] = []): string[] {
  const prefix = server ? ['sudo', 'docker', 'run', '--rm', '-it', '--network', 'host'] : ['docker', 'run', '--rm'];
  if (server) for (const path of SERVER_MOUNTS) prefix.push('--mount', bindMount(path));
  for (const path of new Set(files)) prefix.push('--mount', bindMount(path, true));
  return [...prefix, CLI_IMAGE.reference];
}
export function formatDockerPrefix(server: boolean, files: string[] = []): string {
  const argv = dockerPrefix(server, files);
  const firstMount = argv.indexOf('--mount');
  const headEnd = firstMount < 0 ? argv.length - 1 : firstMount;
  const lines = [argv.slice(0, headEnd).join(' ')];
  for (let index = headEnd; index < argv.length - 1; index += 2) lines.push(`  --mount ${shellQuote(argv[index + 1])}`);
  lines.push(`  ${shellQuote(CLI_IMAGE.reference)}`);
  return lines.join(' \\\n');
}
export function dockerManagement(command: string, args: string[] = []): string {
  return `${formatDockerPrefix(true)} ${[command, ...args].map(shellQuote).join(' ')}`;
}
export const DOCKER_PULL_COMMAND = `docker pull ${CLI_IMAGE.reference}`;
export const DOCKER_INSPECT_COMMAND = [
  `docker run --rm ${CLI_IMAGE.reference} --version`,
  `docker run --rm ${CLI_IMAGE.reference} deploy --help`,
  `docker run --rm ${CLI_IMAGE.reference} deploy --dry-run --slug example-app --domain app.example.com --db-type postgres --no-ssl`,
].join('\n');
export const DOCKER_PREPARE_COMMAND = 'sudo install -d -m 755 /var/www\nsudo install -d -m 700 /run/lock/laraship /var/backups/laraship';
