import { defaultExecution, executionIssues, singleLine, type ExecutionSettings } from './execution';
import { management, type ManagementCommand, type Runner } from './runner';
import { MYSQL_PLACEHOLDER } from './generate';
import { validSlug } from './validationPrimitives';

export interface OperationConfig {
  command: ManagementCommand;
  slug: string;
  domain: string;
  native: boolean;
  db: 'postgres' | 'mysql';
  noMigrate: boolean;
  reset: boolean;
  force: boolean;
  postDeployMode: 'stored' | 'replace' | 'skip';
  postDeploy: string;
  action: 'now' | 'list' | 'restore';
  dumpFile: string;
  yes: boolean;
  acknowledged: boolean;
  codeConsent: boolean;
}
export const defaultOperation: OperationConfig = { command: 'list', slug: '', domain: '', native: false, db: 'postgres',
  noMigrate: false, reset: false, force: false, postDeployMode: 'stored', postDeploy: '', action: 'now', dumpFile: '', yes: false, acknowledged: false, codeConsent: false };
export const operationRunner = (config: OperationConfig, requested: Runner): Runner => config.native && usesDockerRunner(requested) ? requested === 'python-docker' ? 'python-native' : 'bash' : requested;
const usesDockerRunner = (runner: Runner) => runner === 'docker' || runner === 'python-docker';
export function operationIssues(config: OperationConfig, settings: ExecutionSettings = defaultExecution, requested: Runner = 'bash'): string[] {
  const issues = executionIssues(settings, operationRunner(config, requested));
  if (config.command !== 'list' && !validSlug(config.slug)) issues.push('Use a valid project slug; nginxproxy is reserved.');
  if (config.command === 'remove' && !/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(config.domain)) issues.push('Removal requires the recorded project domain.');
  if (config.command === 'backup' && config.action === 'restore' && (!/^[A-Za-z0-9._-]+$/.test(config.dumpFile) || config.dumpFile.includes('..'))) issues.push('Choose a dump basename from backup list, without a path or .. substring.');
  if ((config.command === 'remove' || config.command === 'backup' && config.action === 'restore' || config.command === 'update' && config.reset) && !config.acknowledged) issues.push('Acknowledge the selected data replacement, deletion or history reset before generating this command.');
  if (config.command === 'update' && config.postDeployMode === 'replace') {
    if (!config.postDeploy || !singleLine(config.postDeploy) || ['--help', '-h'].includes(config.postDeploy)) issues.push('Enter a single-line post-deploy command without reserved help actions.');
    if (!config.codeConsent) issues.push('Acknowledge execution of the replacement command inside PHP.');
  }
  return issues;
}
export function generateOperation(config: OperationConfig, requested: Runner, settings: ExecutionSettings = defaultExecution) {
  const issues = operationIssues(config, settings, requested);
  if (issues.length) throw new Error(issues.join('\n'));
  const runner = operationRunner(config, requested);
  const argv: string[] = config.command === 'list' ? [] : ['--slug', config.slug];
  if (config.command === 'update') {
    if (config.noMigrate) argv.push('--no-migrate');
    if (config.reset) argv.push('--reset');
    if (config.force) argv.push('--force');
    if (config.postDeployMode !== 'stored') argv.push('--post-deploy', config.postDeployMode === 'skip' ? '' : config.postDeploy);
  }
  if (config.command === 'backup') {
    argv.push(config.action);
    if (config.action === 'restore') { argv.push(config.dumpFile); if (config.yes) argv.push('--yes'); }
  }
  if (config.command === 'remove') {
    argv.push('--domain', config.domain);
    if (config.native && config.db === 'mysql') argv.push('--db-root-password', MYSQL_PLACEHOLDER);
  }
  return { argv, runner, command: management(runner, config.command, argv, [], settings), needsSecret: argv.includes('--db-root-password') };
}
