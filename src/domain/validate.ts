import { effectiveConfig, presetDefaults } from './constraints';
import { PRESET_NAMES } from '../data/upstream';
import type { Issue, WizardConfig } from './wizardSchema';
import type { Runner } from './runner';

export const isSshRepo = (repo: string) => /^ssh:\/\//.test(repo) || /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:.+/.test(repo);
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function validRepo(repo: string): boolean {
  if (/[\s\x00-\x1f\x7f?#]/.test(repo)) return false;
  if (/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[A-Za-z0-9_./-]+$/.test(repo)) return true;
  try {
    const url = new URL(repo);
    return ['https:', 'ssh:'].includes(url.protocol) && !!url.hostname && url.pathname.length > 1 &&
      !url.password && (url.protocol === 'ssh:' || !url.username);
  } catch { return false; }
}
export function validate(config: WizardConfig): Issue[] {
  const e = effectiveConfig(config);
  const issues: Issue[] = [];
  const add = (field: string, code: string, message: string, step: number) => issues.push({ field, code, message, step });
  if (config.presets.some(preset => !PRESET_NAMES.includes(preset))) add('presets', 'presets', 'Choose only the available presets.', 0);
  const presetModules = presetDefaults(config.presets).modules;
  if (presetModules.includes('queue') && presetModules.includes('horizon')) add('presets', 'preset-conflict', 'admin-panel and api cannot be combined: Queue worker conflicts with Horizon.', 0);
  if (e.source === 'existing' && presetModules.some(module => module === 'filament' || module === 'horizon')) add('presets', 'preset-source', 'admin-panel and api require a new application. Keep staging or use no presets for an existing repository.', 0);
  // Reject controls even in currently inactive values; nothing may create extra config lines.
  const strings: [string, string, number][] = [
    ['repo', e.repo, 0], ['branch', e.branch, 0], ['deployKey', e.deployKey, 0], ['slug', e.slug, 1],
    ['domain', e.domain, 1], ['sslEmail', e.sslEmail, 1], ['filamentName', e.filamentName, 3],
    ['filamentEmail', e.filamentEmail, 3], ['endpoint', e.endpoint, 4], ['postDeploy', e.postDeploy, 4],
    ['onComplete', e.onComplete, 4], ['completionEndpoint', e.completionEndpoint, 4], ['completionTokenFile', e.completionTokenFile, 4],
  ];
  for (const [field, value, step] of strings) {
    if (/[\x00-\x1f\x7f]/.test(value)) add(field, 'single-line', 'Use a single line without control characters.', step);
    // Upstream scans all argv for these actions before interpreting value positions.
    if (['--help', '-h', '--version', '-V', '--list-modules', '--list-presets', '--dry-run', '--config', '--preset'].includes(value)) add(field, 'reserved-action', 'This value is a reserved CLI action. Choose another value.', step);
  }
  if (e.source === 'existing' && !validRepo(e.repo)) add('repo', 'repo', 'Enter an HTTPS or SSH repository URL without embedded credentials, query or fragment.', 0);
  if (e.source === 'existing' && e.branch && !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(e.branch)) add('branch', 'branch', 'Start with a letter or digit; use letters, digits, dots, underscores, slashes or hyphens.', 0);
  if (e.source === 'existing' && e.deployKey && (!isSshRepo(e.repo) || !/^\/(?!\/)[^\x00-\x1f\x7f]+$/.test(e.deployKey))) add('deployKey', 'deploy-key', 'Use an absolute server path and an SSH repository URL.', 0);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(e.slug) || e.slug.toLowerCase() === 'nginxproxy') add('slug', 'slug', 'Start with a letter or digit; use letters, digits, _ or -. nginxproxy is reserved.', 1);
  const labels = e.domain.split('.');
  if (e.domain.length > 253 || labels.length < 2 || labels.some(label => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)) || /^\d+(\.\d+){3}$/.test(e.domain)) add('domain', 'domain', 'Enter a DNS hostname such as app.example.com, without a protocol, path or port.', 1);
  if (e.https && !isEmail(e.sslEmail)) add('sslEmail', 'email', 'Enter a valid certificate contact email.', 1);
  const db = e.dbNames[e.dbType];
  for (const kind of ['name', 'user'] as const) {
    const limit = e.dbType === 'postgres' ? 63 : kind === 'name' ? 64 : 32;
    if (db[kind] && (!/^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(db[kind]) || db[kind].length > limit)) add(`db-${kind}`, 'db-identifier', `Use 1–${limit} letters, digits, underscores or hyphens; do not start with a hyphen.`, 2);
  }
  if (e.dbType === 'mysql' && e.dbLocation === 'docker' && db.user === 'root') add('db-user', 'mysql-root', 'Container MySQL requires a separate application user, not root.', 2);
  if (e.source === 'existing' && e.modules.some(module => ['filament', 'horizon'].includes(module))) add('modules', 'existing-modules', 'Existing applications manage their own Filament and Horizon dependencies. Remove the incompatible preset/modules.', 3);
  if (e.modules.includes('horizon') && e.modules.includes('queue')) add('modules', 'queue-horizon', 'Choose Horizon or the plain queue worker. Remove the other module or its preset first.', 3);
  if (e.modules.includes('filament') && !isEmail(e.filamentEmail)) add('filamentEmail', 'email', 'Enter a valid Filament administrator email.', 3);
  if (e.modules.includes('backup') && (!/^\d+$/.test(e.backupKeep) || +e.backupKeep < 1 || +e.backupKeep > 3650)) add('backupKeep', 'retention', 'Choose 1–3650 retention days.', 3);
  if (e.phpUploadMax && !/^[0-9]+[KMGkmg]?$/.test(e.phpUploadMax)) add('phpUploadMax', 'upload', 'Use a PHP size such as 64M, 512M or 1G.', 4);
  if (e.basicAuth && e.authUser && !/^[A-Za-z0-9][A-Za-z0-9_.@-]*$/.test(e.authUser)) add('authUser', 'auth-user', 'Use letters, digits, underscores, dots, @ or hyphens; start with a letter or digit.', 4);
  const seen = new Set<number>();
  for (const name of ['http', 'https', 'php', 'redis', e.dbType] as const) {
    const value = e.ports[name];
    if (!value) continue;
    const port = +value;
    if (!/^\d{1,5}$/.test(value) || port < 1 || port > 65535) add(`port-${name}`, 'port', 'Use a whole port number from 1 to 65535.', 4);
    if (seen.has(port)) add(`port-${name}`, 'duplicate-port', 'Explicit ports must be different.', 4);
    seen.add(port);
    if (!(name === e.dbType && e.dbLocation === 'native') && [80, 443].includes(port)) add(`port-${name}`, 'reserved-port', '80 and 443 are reserved for the shared proxy.', 4);
  }
  if (e.endpoint) {
    try {
      const url = new URL(e.endpoint);
      if (!/^https:\/\//.test(e.endpoint) || url.protocol !== 'https:' || !url.hostname || url.username || url.password || /[\s\\]/.test(e.endpoint)) throw new Error();
    } catch { add('endpoint', 'endpoint', 'Use an absolute HTTPS URL without credentials or whitespace.', 4); }
    if (!e.endpointConsent) add('endpointConsent', 'endpoint-consent', 'Acknowledge that the deployer sends project credentials to this endpoint.', 4);
  }
  if (e.expert && e.postDeploy && !e.postDeployConsent) add('postDeployConsent', 'code-consent', 'Acknowledge that this command executes arbitrary code inside the PHP container.', 4);
  if (e.completionEnabled) {
    if (!e.onComplete && !e.completionEndpoint) add('onComplete', 'completion-target', 'Choose a completion script or HTTPS endpoint, or disable completion notifications.', 4);
    for (const [field, path] of [['onComplete', e.onComplete], ['completionTokenFile', e.completionTokenFile]]) {
      if (path && (!/^\/(?!\/)[^\x00-\x1f\x7f]+$/.test(path) || path.endsWith('/') || path.split('/').some(part => part === '..' || part === '.'))) add(field, 'completion-path', 'Use an absolute server file path without . or .. components. Ownership and permissions are checked on the server.', 4);
    }
    if (e.onComplete && !e.completionScriptConsent) add('completionScriptConsent', 'completion-script-consent', 'Acknowledge that the trusted script runs as the deploy user, normally root.', 4);
    if (e.completionEndpoint) {
      try {
        const url = new URL(e.completionEndpoint);
        if (!/^https:\/\//.test(e.completionEndpoint) || url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.port === '0' || /[\s\\]/.test(e.completionEndpoint)) throw new Error();
      } catch { add('completionEndpoint', 'endpoint', 'Use an absolute HTTPS URL without credentials or whitespace.', 4); }
      if (!e.completionEndpointConsent) add('completionEndpointConsent', 'completion-endpoint-consent', 'Acknowledge sending the final deployment report to this API.', 4);
    }
    if (e.completionTokenFile && !e.completionEndpoint) add('completionTokenFile', 'completion-token', 'A token file requires a completion endpoint. Enter only its server path, never the token.', 4);
    if (!/^[0-9]+$/.test(e.completionTimeout) || +e.completionTimeout < 1 || +e.completionTimeout > 300) add('completionTimeout', 'completion-timeout', 'Choose a whole timeout from 1 to 300 seconds.', 4);
  }
  return issues;
}

export function validateRunner(config: WizardConfig, runner: Runner): Issue[] {
  if (runner !== 'python-docker') return [];
  return ([['deployKey', config.source === 'existing' ? config.deployKey : '', 0],
    ['onComplete', config.completionEnabled ? config.onComplete : '', 4],
    ['completionTokenFile', config.completionEnabled ? config.completionTokenFile : '', 4]] as const)
    .filter(([, path]) => /[,"\r\n]/.test(path) || path.split('/').includes('..'))
    .map(([field, , step]) => ({ field, step, code: 'python-mount', message: 'Python Docker mounts do not support commas, double quotes or .. in paths. Change the path or use the Docker image runner.' }));
}
