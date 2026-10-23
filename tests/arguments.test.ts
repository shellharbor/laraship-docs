import { describe, expect, it } from 'vitest';
import { ARGUMENT_CATALOG } from '../src/data/argumentCatalog';
import { CLI_OPTION_MAP } from '../src/data/upstream';
import { generate } from '../src/domain/generate';
import { defaultExecution, executionIssues } from '../src/domain/execution';
import { composeTool } from '../src/domain/compose';
import { SECRET_OPTIONS } from '../src/domain/secrets';
import { preferences, readPreferences } from '../src/domain/preferences';
import { defaultOperation, generateOperation, operationIssues } from '../src/domain/operations';
import { defaultKubernetes, generateKubernetes, kubernetesIssues } from '../src/domain/kubernetes';
import { scenario } from './scenarios';
import { validRepo } from '../src/domain/validate';

describe('complete argument coverage', () => {
  it('exposes every deployment flag and all command namespaces without duplicate entries', () => {
    const deployment = ARGUMENT_CATALOG.filter(row => row.scope === 'deploy');
    for (const option of CLI_OPTION_MAP) expect(deployment.find(row => row.flag === option.flag)).toBeDefined();
    for (const scope of ['update', 'backup', 'activate', 'deactivate', 'remove', 'list', 'python', 'kubernetes']) expect(ARGUMENT_CATALOG.some(row => row.scope === scope)).toBe(true);
    expect(new Set(ARGUMENT_CATALOG.map(row => `${row.scope}/${row.flag}`)).size).toBe(ARGUMENT_CATALOG.length);
    expect(deployment.find(row => row.flag === '--type')?.configKey).toBe('—');
    expect(deployment.find(row => row.flag === '--preset')?.configKey).toBe('PRESET');
  });
  it('supports all applicable custom password flags as server-only templates', () => {
    const config = scenario({ dbType: 'mysql', modules: ['filament'], filamentEmail: 'admin@example.com', basicAuth: true, customSecrets: SECRET_OPTIONS.map(option => option.key) });
    const result = generate(config);
    for (const option of SECRET_OPTIONS.filter(option => option.key !== 'db-postgres-password')) {
      expect(result.argv).toContain(`--${option.key}`);
      expect(result.deploy).toContain(option.placeholder);
      expect(result.nativeMysqlSnippet).not.toContain(option.placeholder);
    }
    expect(result.argv).not.toContain('--db-postgres-password');
    expect(result.needsSecret).toBe(true);
    expect(result.nativeMysqlSnippet).toContain('set +x');
    expect(result.nativeMysqlSnippet).toContain('read -r -s');
    const saved = preferences(config);
    expect(saved).not.toContain('customSecrets');
    expect(readPreferences(JSON.stringify(config)).customSecrets).toEqual([]);
  });
  it('never emits inactive Filament, Auth or other-engine password choices', () => {
    const result = generate(scenario({ customSecrets: ['db-mysql-password', 'filament-password', 'auth-password'] }));
    expect(result.needsSecret).toBe(false);
    expect(result.argv.join(' ')).not.toContain('password');
  });
  it('substitutes hidden-input variables only at actual secret argument positions', () => {
    const config = scenario({ modules: ['filament'], filamentEmail: 'admin@example.com', filamentName: '<FILAMENT_PASSWORD>', customSecrets: ['filament-password'] });
    const result = generate(config);
    expect(result.nativeMysqlSnippet).toContain("--filament-name '<FILAMENT_PASSWORD>'");
    expect(result.nativeMysqlSnippet).toContain('--filament-password "$LARASHIP_FILAMENT_PASSWORD"');
    const flagAsValue = generate({ ...config, filamentName: '--auth-password' });
    expect(flagAsValue.secretEntries.map(entry => entry.flag)).toEqual(['--filament-password']);
  });
  it('requires separate HTTP and credential-delivery consent for both endpoint features', () => {
    const config = scenario({ endpoint: 'http://api.example.com/legacy', endpointConsent: true, completionEnabled: true,
      completionEndpoint: 'http://api.example.com/final', completionEndpointConsent: true, allowInsecureEndpoint: true });
    expect(() => generate(config)).toThrow('Acknowledge');
    const result = generate({ ...config, insecureEndpointConsent: true });
    expect(result.argv).toContain('--allow-insecure-endpoint');
    expect(result.config).toContain('ALLOW_INSECURE_ENDPOINT="true"');
    expect(() => generate({ ...config, insecureEndpointConsent: true, allowInsecureEndpoint: false })).toThrow('HTTPS');
    expect(preferences(config)).not.toContain('Insecure');
  });
  it('supports custom Laravel constraints without adding one to existing applications', () => {
    expect(generate(scenario({ laravelVersion: '13.1' })).argv).toContain('13.1');
    expect(readPreferences(preferences(scenario({ laravelVersion: '13.1' }))).laravelVersion).toBe('13.1');
    expect(() => generate(scenario({ laravelVersion: '11.9' }))).toThrow('12.0');
    expect(generate(scenario({ source: 'existing', repo: 'https://github.com/acme/app.git', laravelVersion: '13.1' })).argv).not.toContain('--laravel-version');
  });
  it('opts into additional Git transports and mounts only the local repository path', () => {
    expect(validRepo('file:///srv/repository')).toBe(false);
    expect(validRepo('file:///srv/repository', true)).toBe(true);
    expect(validRepo('http://git.example.com/team/app.git', true)).toBe(true);
    expect(validRepo('git://git.example.com/team/app.git', true)).toBe(true);
    expect(validRepo('http://token@git.example.com/team/app.git', true)).toBe(false);
    expect(validRepo('file:///srv/a%00b', true)).toBe(false);
    const config = scenario({ source: 'existing', repo: 'file:///srv/local%20repository', additionalRepoTransports: true });
    const result = generate(config, 'docker');
    expect(result.deploy).toContain('src=/srv/local repository,dst=/srv/local repository,readonly');
    expect(result.argv).toContain('file:///srv/local%20repository');
    expect(() => generate({ ...config, repo: 'file:///opt' }, 'docker')).toThrow('must not hide');
    expect(preferences(config)).not.toContain('additionalRepoTransports');
  });
});

describe('execution settings', () => {
  const settings = { ...defaultExecution, directory: "/opt/toolkit 'release'", configPath: '/root/configs/shop.config', archiveDir: '/srv/archives', nativeArchiveDir: '/srv/native-archives', readonlyMounts: ['/opt/laraship-input'] };
  it.each(['bash', 'docker', 'python-native', 'python-docker'] as const)('%s applies the correct path, archive and input namespace', runner => {
    const result = generate(scenario(), runner, settings);
    expect(result.configCommand).toContain(settings.configPath);
    if (runner === 'bash' || runner === 'python-native') {
      expect(result.deploy).toContain('LARASHIP_ARCHIVE_DIR=/srv/native-archives');
      expect(result.deployArgv).toContain('LARASHIP_ARCHIVE_DIR=/srv/native-archives');
      expect(result.dryRunArgv).toContain('LARASHIP_ARCHIVE_DIR=/srv/native-archives');
      expect(result.deploy).toContain('/opt/toolkit');
      expect(result.deploy).not.toContain('--mount-readonly');
    } else if (runner === 'docker') {
      expect(result.deploy).toContain('src=/srv/archives,dst=/srv/archives');
      expect(result.deploy).toContain('LARASHIP_ARCHIVE_DIR=/srv/archives');
      expect(result.dryRun).toContain('src=/opt/laraship-input,dst=/opt/laraship-input,readonly');
    } else {
      expect(result.deploy).toContain("--archive-dir '/srv/archives'");
      expect(result.dryRun).toContain("--mount-readonly '/opt/laraship-input'");
      expect(result.deploy).not.toContain('--directory');
    }
  });
  it.each(['/var/www', '/var/www/archives', '/opt', '/usr/share/archives'])('rejects a protected archive overlap: %s', archiveDir => {
    expect(executionIssues({ ...defaultExecution, archiveDir }, 'docker').length).toBeGreaterThan(0);
  });
  it('rejects unreviewed or mutable image overrides and CSV-incompatible Python inputs', () => {
    expect(executionIssues({ ...defaultExecution, image: 'shellharbor/laraship:latest' }, 'docker').length).toBeGreaterThan(0);
    expect(executionIssues({ ...defaultExecution, image: 'trusted/laraship:1.3.0' }, 'docker')).toContain('Confirm that you trust the custom administrative CLI image and have checked its compatibility.');
    expect(executionIssues({ ...defaultExecution, image: 'trusted/laraship:1.3.0', imageConsent: true }, 'docker')).toEqual([]);
    expect(executionIssues({ ...defaultExecution, readonlyMounts: ['/srv/input,one'] }, 'python-docker').length).toBeGreaterThan(0);
    expect(executionIssues({ ...defaultExecution, readonlyMounts: ['/srv/input,one'] }, 'docker')).toEqual([]);
    expect(executionIssues({ ...defaultExecution, readonlyMounts: ['/opt'] }, 'docker').length).toBeGreaterThan(0);
  });
  it('does not validate settings ignored by the selected namespace', () => {
    expect(executionIssues({ ...defaultExecution, image: 'unused', archiveDir: '/var/www' }, 'bash')).toEqual([]);
    expect(executionIssues({ ...defaultExecution, directory: 'unused', nativeArchiveDir: 'unused' }, 'docker')).toEqual([]);
    expect(kubernetesIssues({ ...defaultKubernetes, name: 'shop', namespace: 'shop', configmap: 'config', secret: 'secret', revision: 'r1', image: 'app:1.0' }, { ...defaultExecution, archiveDir: '/var/www' })).toEqual([]);
  });
  it('rejects automatic inputs that would hide a selected writable archive mount', () => {
    const config = scenario({ source: 'existing', repo: 'file:///srv', additionalRepoTransports: true });
    expect(() => generate(config, 'docker', settings)).toThrow('must not hide');
    expect(() => composeTool(config, settings)).toThrow('must not hide');
    expect(executionIssues({ ...settings, configPath: '/srv' }, 'docker').length).toBeGreaterThan(0);
    expect(() => generate(scenario({ completionEnabled: true, onComplete: '/srv', completionScriptConsent: true }), 'docker', settings)).toThrow('must not hide');
  });
  it('generates a finite Compose tools service with correct writable and readonly inputs', () => {
    const result = composeTool(scenario({ completionEnabled: true, onComplete: '/root/hook', completionTimeout: '300', completionScriptConsent: true }), settings);
    expect(result.yaml).toContain('restart: "no"');
    expect(result.yaml).toContain('profiles: [tools]');
    expect(result.yaml).toContain('stop_grace_period: 615s');
    expect(result.yaml).toContain('LARASHIP_ARCHIVE_DIR: "/srv/archives"');
    expect(result.yaml).toContain('source: "/root/hook"');
    expect(result.yaml).toContain('create_host_path: false');
    expect(result.yaml).not.toMatch(/privileged|ports:|container_name/);
    expect(result.command).toContain('--profile tools run --rm');
  });
});

describe('lifecycle namespaces', () => {
  it.each(['bash', 'docker', 'python-native', 'python-docker'] as const)('%s preserves every update option, including explicit empty hook', runner => {
    const config = { ...defaultOperation, command: 'update' as const, slug: 'shop', noMigrate: true, reset: true, force: true, acknowledged: true, postDeployMode: 'skip' as const };
    const result = generateOperation(config, runner);
    expect(result.argv).toEqual(['--slug', 'shop', '--no-migrate', '--reset', '--force', '--post-deploy', '']);
    expect(result.command).toContain("'--post-deploy' ''");
    expect(result.command).not.toContain('--config');
  });
  it('separates backup actions, restore confirmation and removal confirmation', () => {
    const base = { ...defaultOperation, command: 'backup' as const, slug: 'shop', action: 'restore' as const, dumpFile: 'shop-1.dump', yes: true };
    expect(operationIssues(base)).toContain('Acknowledge the selected data replacement, deletion or history reset before generating this command.');
    expect(generateOperation({ ...base, acknowledged: true }, 'bash').argv).toEqual(['--slug', 'shop', 'restore', 'shop-1.dump', '--yes']);
    expect(() => generateOperation({ ...base, acknowledged: true, dumpFile: '../dump' }, 'bash')).toThrow('basename');
    const remove = generateOperation({ ...base, command: 'remove', domain: 'shop.example.com', native: true, db: 'mysql', acknowledged: true }, 'python-docker');
    expect(remove.runner).toBe('python-native'); expect(remove.argv).not.toContain('--yes');
    expect(remove.argv).toContain('--db-root-password'); expect(remove.needsSecret).toBe(true);
    expect(remove.command).not.toContain('yes |');
  });
  it('preserves literal replacement commands without executing shell input', () => {
    const hook = "printf '%s' '$HOME; literal'";
    const result = generateOperation({ ...defaultOperation, command: 'update', slug: 'shop', postDeployMode: 'replace', postDeploy: hook, codeConsent: true }, 'bash');
    expect(result.argv).toEqual(['--slug', 'shop', '--post-deploy', hook]);
    expect(() => generateOperation({ ...defaultOperation, command: 'update', slug: 'shop', postDeployMode: 'replace', postDeploy: hook }, 'bash')).toThrow('Acknowledge');
  });
  it.each(['activate', 'deactivate'] as const)('%s emits only its actual accepted slug option', command => {
    expect(generateOperation({ ...defaultOperation, command, slug: 'shop', yes: true, force: true, noMigrate: true }, 'docker').argv).toEqual(['--slug', 'shop']);
  });
  it('inventory has no invented help/filter arguments', () => expect(generateOperation(defaultOperation, 'bash').argv).toEqual([]));
});

describe('independent Kubernetes application adapter', () => {
  const valid = { ...defaultKubernetes, name: 'shop', namespace: 'shop', configmap: 'shop-config-v1', secret: 'shop-secret-v1', revision: 'release-1', image: 'registry.example.com/shop:1.0' };
  it('renders without root, cluster contact, Docker socket or Compose fields', () => {
    const result = generateKubernetes({ ...valid, replicas: '3', worker: true, imagePullSecret: 'registry', readinessPath: '/health_ready' });
    expect(result.command).toContain('--network none');
    expect(result.command).toContain('--read-only --tmpfs /tmp');
    expect(result.command).toContain('--user "$(id -u):$(id -g)"');
    expect(result.argv).toContain('--image-pull-secret');
    expect(result.command).not.toMatch(/sudo|docker\.sock|--db-type|--completion|--backend/);
  });
  it('requires explicit deployment context, readable credential path and migration consent', () => {
    expect(kubernetesIssues({ ...valid, mode: 'deploy' }).length).toBe(3);
    const result = generateKubernetes({ ...valid, mode: 'deploy', context: "production 'cluster'", kubeconfig: '/root/kubeconfig', acknowledged: true });
    expect(result.command).not.toContain('--network none');
    expect(result.command).toContain('src=/root/kubeconfig,dst=/root/kubeconfig,readonly');
    expect(result.command).toContain('KUBECONFIG=/root/kubeconfig');
    expect(result.argv).toContain("production 'cluster'");
  });
  it.each([{ name: 'Bad_Name' }, { replicas: '101' }, { replicas: '0' }, { image: 'app:latest' }, { image: 'app' }, { image: 'app@sha256:BAD' }, { readinessPath: '/up?x=1' }, { secret: 'a'.repeat(41) }])('rejects invalid Kubernetes parameters %j', overrides => {
    expect(kubernetesIssues({ ...valid, ...overrides }).length).toBeGreaterThan(0);
  });
});
