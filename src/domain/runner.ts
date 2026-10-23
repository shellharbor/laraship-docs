import { CLI_IMAGE, UPSTREAM } from '../data/upstream';
import { shellQuote } from './shellQuote';
import type { WizardConfig } from './wizardSchema';
import { defaultExecution, type ExecutionSettings } from './execution';

export type Runner = 'bash' | 'docker' | 'python-native' | 'python-docker';
export const usesDocker = (runner: Runner) => runner === 'docker' || runner === 'python-docker';
export const usesPython = (runner: Runner) => runner === 'python-native' || runner === 'python-docker';
export const CONFIG_PATH = '/path/to/deploy.config';
export const SERVER_MOUNTS = ['/var/run/docker.sock', '/var/www', '/run/lock/laraship', '/var/backups/laraship'] as const;
export const resolveRunner = (config: WizardConfig, requested: Runner): Runner => config.dbLocation === 'native' && usesDocker(requested)
  ? requested === 'python-docker' ? 'python-native' : 'bash' : requested;

// Resolve pipx's absolute executable path before sudo resets PATH. Backend options precede --.
export function pythonPrefix(runner: Runner, command: string, server: boolean, files: string[] = [], settings: ExecutionSettings = defaultExecution): string {
  const parts = [server ? 'sudo "$(command -v laraship)"' : 'laraship', command, '--backend', usesDocker(runner) ? 'docker' : 'native'];
  if (usesDocker(runner)) {
    parts.push('--image', settings.image === CLI_IMAGE.reference ? settings.image : shellQuote(settings.image));
    if (settings.archiveDir !== defaultExecution.archiveDir) parts.push('--archive-dir', shellQuote(settings.archiveDir));
    for (const path of new Set([...files, ...settings.readonlyMounts])) parts.push('--mount-readonly', shellQuote(path));
  } else parts.push('--directory', settings.directory === defaultExecution.directory ? settings.directory : shellQuote(settings.directory));
  if (!usesDocker(runner) && settings.nativeArchiveDir) parts[0] = `${server ? 'sudo ' : ''}env ${shellQuote(`LARASHIP_ARCHIVE_DIR=${settings.nativeArchiveDir}`)} ${server ? '"$(command -v laraship)"' : 'laraship'}`;
  return parts.join(' ');
}
export type ManagementCommand = 'list' | 'update' | 'backup' | 'activate' | 'deactivate' | 'remove';
export function management(runner: Runner, command: ManagementCommand, args: string[] = [], files: string[] = [], settings: ExecutionSettings = defaultExecution): string {
  if (usesPython(runner)) return `${pythonPrefix(runner, command, true, files, settings)}${args.length ? ` -- ${args.map(shellQuote).join(' ')}` : ''}`;
  if (runner === 'docker') return dockerManagement(command, args, files, settings);
  return `${nativePrefix(`${command === 'list' ? 'list-projects' : command}.sh`, true, settings)}${args.length ? ` ${args.map(shellQuote).join(' ')}` : ''}`;
}
export function nativePrefix(script: string, server: boolean, settings: ExecutionSettings = defaultExecution): string {
  const path = `${settings.directory}/${script}`;
  const env = settings.nativeArchiveDir ? `env ${shellQuote(`LARASHIP_ARCHIVE_DIR=${settings.nativeArchiveDir}`)} ` : '';
  return `${server ? 'sudo ' : ''}${env}bash ${settings.directory === defaultExecution.directory ? path : shellQuote(path)}`;
}
export function inspection(runner: Runner, action: '--help' | '--version' | '--list-modules' | '--list-presets', settings: ExecutionSettings = defaultExecution): string {
  if (usesPython(runner)) return `${pythonPrefix(runner, 'deploy', false, [], settings)} -- ${action}`;
  if (runner === 'docker') return `${formatDockerPrefix(false, [], settings)} deploy ${action}`;
  return `${nativePrefix('deploy-laravel.sh', false, settings)} ${action}`;
}
export const PYTHON_INSTALL_COMMAND = `pipx install laraship==${UPSTREAM.version}\nlaraship --version\nlaraship --help`;
export const PYTHON_VENV_COMMAND = `python3 -m venv "$HOME/.venvs/laraship"\n"$HOME/.venvs/laraship/bin/python" -m pip install laraship==${UPSTREAM.version}\nexport PATH="$HOME/.venvs/laraship/bin:$PATH"\nlaraship --version`;
export const PYTHON_NATIVE_INSTALL_COMMAND = `laraship install --backend native --version ${UPSTREAM.version} --dry-run\nsudo "$(command -v laraship)" install --backend native --version ${UPSTREAM.version}\nlaraship toolkit-version --backend native --directory /opt/laraship`;
export const PYTHON_DOCKER_INSTALL_COMMAND = `docker pull ${CLI_IMAGE.reference}\nlaraship toolkit-version --backend docker --image ${CLI_IMAGE.reference}`;

/** Docker --mount uses CSV internally; POSIX shell quoting is a separate layer. */
export function bindMount(path: string, readonly = false): string {
  const csv = (field: string) => /[",]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
  return ['type=bind', csv(`src=${path}`), csv(`dst=${path}`), ...(readonly ? ['readonly'] : [])].join(',');
}
export function dockerPrefix(server: boolean, files: string[] = [], settings: ExecutionSettings = defaultExecution): string[] {
  const prefix = server ? ['sudo', 'docker', 'run', '--rm', '-it', '--network', 'host'] : ['docker', 'run', '--rm'];
  if (server) {
    for (const path of SERVER_MOUNTS) prefix.push('--mount', bindMount(path === defaultExecution.archiveDir ? settings.archiveDir : path));
    if (settings.archiveDir !== defaultExecution.archiveDir) prefix.push('--env', `LARASHIP_ARCHIVE_DIR=${settings.archiveDir}`);
  }
  for (const path of new Set([...files, ...settings.readonlyMounts])) prefix.push('--mount', bindMount(path, true));
  return [...prefix, settings.image];
}
export function formatDockerPrefix(server: boolean, files: string[] = [], settings: ExecutionSettings = defaultExecution): string {
  const argv = dockerPrefix(server, files, settings);
  const firstMount = argv.indexOf('--mount');
  const headEnd = firstMount < 0 ? argv.length - 1 : firstMount;
  const lines = [argv.slice(0, headEnd).join(' ')];
  for (let index = headEnd; index < argv.length - 1; index += 2) lines.push(`  ${argv[index]} ${shellQuote(argv[index + 1])}`);
  lines.push(`  ${shellQuote(settings.image)}`);
  return lines.join(' \\\n');
}
export function dockerManagement(command: string, args: string[] = [], files: string[] = [], settings: ExecutionSettings = defaultExecution): string {
  return `${formatDockerPrefix(true, files, settings)} ${[command, ...args].map(shellQuote).join(' ')}`;
}
export const DOCKER_PULL_COMMAND = `docker pull ${CLI_IMAGE.reference}`;
export const DOCKER_INSPECT_COMMAND = [
  `docker run --rm ${CLI_IMAGE.reference} --version`,
  `docker run --rm ${CLI_IMAGE.reference} deploy --help`,
  `docker run --rm ${CLI_IMAGE.reference} deploy --dry-run --slug example-app --domain app.example.com --db-type postgres --no-ssl`,
].join('\n');
export const DOCKER_PREPARE_COMMAND = 'sudo install -d -m 755 /var/www\nsudo install -d -m 700 /run/lock/laraship /var/backups/laraship';
