import { CLI_OPTION_MAP, UPSTREAM } from '../data/upstream';
import { effectiveConfig } from './constraints';
import { shellQuote } from './shellQuote';
import { localRepoPath, validate, validateRunner } from './validate';
import type { WizardConfig } from './wizardSchema';
import { dockerPrefix, formatDockerPrefix, nativePrefix, pythonPrefix, usesDocker, usesPython, type Runner } from './runner';
import { defaultExecution, executionIssues, type ExecutionSettings } from './execution';
import { applicableSecrets } from './secrets';

export const MYSQL_PLACEHOLDER = '<MYSQL_ROOT_PASSWORD>';
export const SCRIPT = '/opt/laraship/deploy-laravel.sh';
export function generateArgv(config: WizardConfig): string[] {
  const issues = validate(config);
  if (issues.length) throw new Error(issues.map(issue => issue.message).join('\n'));
  const e = effectiveConfig(config);
  const argv = ['--slug', e.slug, '--domain', e.domain, '--db-type', e.dbType];
  const value = (flag: string, input: string) => { if (input) argv.push(flag, input); };
  if (e.source === 'new') {
    if (e.laravelVersion !== UPSTREAM.laravelDefault) value('--laravel-version', e.laravelVersion);
  } else {
    value('--repo', e.repo); value('--branch', e.branch); value('--deploy-key', e.deployKey);
  }
  for (const preset of e.presets) value('--preset', preset);
  // Include the effective modules: dependencies are explicit and the preset remains additive.
  if (e.modules.length) value('--with', e.modules.join(','));
  if (e.dbLocation === 'native') argv.push('--db-native');
  value(`--db-${e.dbType}-name`, e.dbNames[e.dbType].name);
  value(`--db-${e.dbType}-user`, e.dbNames[e.dbType].user);
  if (e.dbLocation === 'native' && e.dbType === 'mysql') value('--db-root-password', MYSQL_PLACEHOLDER);
  if (e.modules.includes('filament')) { value('--filament-email', e.filamentEmail); value('--filament-name', e.filamentName); }
  if (e.modules.includes('backup') && +e.backupKeep !== 7) value('--backup-keep', e.backupKeep);
  if (e.basicAuth) { argv.push('--enable-basic-auth'); value('--auth-user', e.authUser); }
  // Leave preset upload intact unless the user chose an explicit override.
  value('--php-upload-max', config.phpUploadMax);
  for (const name of ['http', 'https', 'php', 'redis', e.dbType] as const) value(`--port-${name}`, e.ports[name] ? String(+e.ports[name]) : '');
  if (e.createBackup) argv.push('--create-backup');
  if (e.createDhparam) argv.push('--create-dhparam');
  value('--endpoint', e.endpoint);
  if (e.expert) value('--post-deploy', e.postDeploy);
  if (e.completionEnabled) {
    value('--on-complete', e.onComplete);
    value('--completion-endpoint', e.completionEndpoint);
    value('--completion-token-file', e.completionTokenFile);
    if (+e.completionTimeout !== 30) value('--completion-timeout', String(+e.completionTimeout));
    if (e.completionIncludeSecrets) argv.push('--completion-include-secrets');
  }
  for (const option of applicableSecrets(e)) if (e.customSecrets.includes(option.key)) value(`--${option.key}`, option.placeholder);
  if (e.allowInsecureEndpoint) argv.push('--allow-insecure-endpoint');
  if (e.https) value('--ssl-email', e.sslEmail); else argv.push('--no-ssl');
  return argv;
}
function formatArgs(argv: string[], variables: Record<string, string> = {}): string {
  const lines: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (CLI_OPTION_MAP.find(option => option.flag === flag)?.type === 'value') {
      const input = argv[++i];
      lines.push(`  ${flag} ${variables[flag] ? `"$${variables[flag]}"` : shellQuote(input)}`);
    } else lines.push(`  ${flag}`);
  }
  return lines.join(' \\\n');
}
export function generate(config: WizardConfig, runner: Runner = 'bash', settings: ExecutionSettings = defaultExecution) {
  if (usesDocker(runner) && config.dbLocation === 'native') throw new Error('Native database provisioning requires the Bash runner or Python native backend on the server.');
  const runnerIssues = [...validateRunner(config, runner, settings).map(issue => issue.message), ...executionIssues(settings, runner)];
  if (runnerIssues.length) throw new Error(runnerIssues.join('\n'));
  const argv = generateArgv(config);
  const secretEntries: { flag: string; placeholder: string; variable: string }[] = [];
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (CLI_OPTION_MAP.find(option => option.flag === flag)?.type !== 'value') continue;
    const placeholder = argv[++index];
    if (/^--(?:db-.*password|redis-password|filament-password|auth-password)$/.test(flag)) secretEntries.push({ flag, placeholder, variable: flag === '--db-root-password' ? 'LARASHIP_MYSQL_ROOT' : `LARASHIP_${flag.slice(2).replaceAll('-', '_').toUpperCase()}` });
  }
  const needsSecret = secretEntries.length > 0;
  const formatted = formatArgs(argv);
  const keyFiles = config.source === 'existing' ? [config.deployKey, localRepoPath(config.repo)].filter(Boolean) : [];
  const files = [...keyFiles, ...(config.completionEnabled ? [config.onComplete, config.completionTokenFile].filter(Boolean) : [])];
  const renderDeploy = (formatted: string) => usesPython(runner) ? `${pythonPrefix(runner, 'deploy', true, files, settings)} -- \\\n${formatted}` : runner === 'docker'
    ? `${formatDockerPrefix(true, files, settings)} deploy \\\n${formatted}`
    : `${nativePrefix('deploy-laravel.sh', true, settings)} \\\n${formatted}`;
  const deploy = renderDeploy(formatted);
  const dryRun = usesPython(runner) ? `${pythonPrefix(runner, 'deploy', false, files, settings)} -- --dry-run \\\n${formatted}` : runner === 'docker'
    ? `${formatDockerPrefix(false, files, settings)} deploy --dry-run \\\n${formatted}`
    : `${nativePrefix('deploy-laravel.sh', false, settings)} --dry-run \\\n${formatted}`;
  const configCommand = `chmod 600 ${shellQuote(settings.configPath)}\n${usesPython(runner) ? `${pythonPrefix(runner, 'deploy', true, [...files, settings.configPath], settings)} -- --config ${shellQuote(settings.configPath)}` : runner === 'docker'
    ? `${formatDockerPrefix(true, [...files, settings.configPath], settings)} deploy --config ${shellQuote(settings.configPath)}`
    : `${nativePrefix('deploy-laravel.sh', true, settings)} --config ${shellQuote(settings.configPath)}`}`;
  // Config parser removes one matching outer quote, without shell expansion or unescaping.
  const configLines = [`# LaraShip ${UPSTREAM.version} / ${UPSTREAM.commit}`, '# Parsed as data, never source this file. Keep private: chmod 600 deploy.config'];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const input = CLI_OPTION_MAP.find(option => option.flag === flag)?.type === 'value' ? argv[++i] : 'true';
    const key = flag.slice(2).replaceAll('-', '_').toUpperCase();
    configLines.push(`${key}="${input}"`);
  }
  const nativeMysqlSnippet = needsSecret ? [
    '# Run only on your server. The password is still visible in the process arguments (ps).',
    '# Use a private terminal; do not record this session. The literal secret is not entered in shell history.',
    'set +x', ...secretEntries.flatMap(({ flag, variable }) => [`IFS= read -r -s -p ${shellQuote(`${flag.slice(2)}: `)} ${variable}`, 'printf "\\n"']),
    renderDeploy(formatArgs(argv, Object.fromEntries(secretEntries.map(({ flag, variable }) => [flag, variable])))),
    `unset ${secretEntries.map(({ variable }) => variable).join(' ')}`,
  ].join('\n') : '';
  return { argv, deploy, dryRun, config: `${configLines.join('\n')}\n`, needsSecret, secretEntries, nativeMysqlSnippet, configCommand,
    runner, deployArgv: usesPython(runner) ? pythonArgv(runner, true, files, argv, settings) : runner === 'docker' ? [...dockerPrefix(true, files, settings), 'deploy', ...argv] : ['sudo', ...nativeEnv(settings), 'bash', `${settings.directory}/deploy-laravel.sh`, ...argv],
    dryRunArgv: usesPython(runner) ? pythonArgv(runner, false, files, ['--dry-run', ...argv], settings) : runner === 'docker' ? [...dockerPrefix(false, files, settings), 'deploy', '--dry-run', ...argv] : [...nativeEnv(settings), 'bash', `${settings.directory}/deploy-laravel.sh`, '--dry-run', ...argv] };
}
const nativeEnv = (settings: ExecutionSettings) => settings.nativeArchiveDir ? ['env', `LARASHIP_ARCHIVE_DIR=${settings.nativeArchiveDir}`] : [];
function pythonArgv(runner: Runner, server: boolean, files: string[], argv: string[], settings: ExecutionSettings): string[] {
  return [...(server ? ['sudo'] : []), ...(!usesDocker(runner) ? nativeEnv(settings) : []), server ? '<ABSOLUTE_LARASHIP_CLI_PATH>' : 'laraship', 'deploy', '--backend', usesDocker(runner) ? 'docker' : 'native',
    ...(usesDocker(runner) ? ['--image', settings.image, ...(settings.archiveDir !== defaultExecution.archiveDir ? ['--archive-dir', settings.archiveDir] : []), ...[...new Set([...files, ...settings.readonlyMounts])].flatMap(path => ['--mount-readonly', path])] : ['--directory', settings.directory]), '--', ...argv];
}
export const INSTALL_COMMAND = `# Run once on the Ubuntu server; refuses an existing target.\nif [ -e /opt/laraship ]; then\n  printf '%s\\n' '/opt/laraship already exists. Review it before continuing.'\nelse\n  sudo git clone https://github.com/shellharbor/laraship.git /opt/laraship &&\n  sudo git -C /opt/laraship checkout --detach ${UPSTREAM.commit} &&\n  bash /opt/laraship/deploy-laravel.sh --version\nfi`;
