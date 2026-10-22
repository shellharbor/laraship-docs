import { CLI_OPTION_MAP, UPSTREAM } from '../data/upstream';
import { effectiveConfig } from './constraints';
import { shellQuote } from './shellQuote';
import { validate } from './validate';
import type { WizardConfig } from './wizardSchema';

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
  if (e.preset !== 'none') value('--preset', e.preset);
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
  if (e.https) value('--ssl-email', e.sslEmail); else argv.push('--no-ssl');
  return argv;
}
function formatArgs(argv: string[]): string {
  const lines: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    lines.push(`  ${flag}${CLI_OPTION_MAP.find(option => option.flag === flag)?.type === 'value' ? ` ${shellQuote(argv[++i])}` : ''}`);
  }
  return lines.join(' \\\n');
}
export function generate(config: WizardConfig) {
  const argv = generateArgv(config);
  const needsSecret = argv.includes('--db-root-password');
  const formatted = formatArgs(argv);
  const deploy = `sudo bash ${SCRIPT} \\\n${formatted}`;
  const dryRun = `bash ${SCRIPT} --dry-run \\\n${formatted}`;
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
    'set +x', 'IFS= read -r -s -p "Native MySQL root password: " LARASHIP_MYSQL_ROOT', 'printf "\\n"',
    deploy.replace(shellQuote(MYSQL_PLACEHOLDER), '"$LARASHIP_MYSQL_ROOT"'),
    'unset LARASHIP_MYSQL_ROOT',
  ].join('\n') : '';
  return { argv, deploy, dryRun, config: `${configLines.join('\n')}\n`, needsSecret, nativeMysqlSnippet };
}
export const INSTALL_COMMAND = `# Run once on the Ubuntu server; refuses an existing target.\nif [ -e /opt/laraship ]; then\n  printf '%s\\n' '/opt/laraship already exists. Review it before continuing.'\nelse\n  sudo git clone https://github.com/shellharbor/laraship.git /opt/laraship &&\n  sudo git -C /opt/laraship checkout --detach ${UPSTREAM.commit} &&\n  bash /opt/laraship/deploy-laravel.sh --version\nfi`;
