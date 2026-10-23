import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLI_IMAGE, UPSTREAM } from '../src/data/upstream';
import { generate } from '../src/domain/generate';
import { bindMount } from '../src/domain/runner';
import { shellQuote } from '../src/domain/shellQuote';
import { scenario, scenarios } from './scenarios';
import { defaultKubernetes, generateKubernetes } from '../src/domain/kubernetes';
import { defaultOperation, generateOperation, type OperationConfig } from '../src/domain/operations';
import { composeTool } from '../src/domain/compose';

const enabled = process.env.LARASHIP_DOCKER_TEST === '1';
const label = `io.shellharbor.laraship-docs.test=${process.env.LARASHIP_DOCKER_TEST_RUN}`;
function run(args: string[], options: string[] = []) {
  return execFileSync('docker', ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label, ...options, CLI_IMAGE.reference, ...args],
    { encoding: 'utf8', timeout: 30000 }).replace(/\u001b\[[0-9;]*m/g, '');
}
describe.skipIf(!enabled)('published immutable Docker CLI', () => {
  it.each([false, true])('renders actual Kubernetes JSON offline with worker=%s, without a cluster or socket', worker => {
    const result = generateKubernetes({ ...defaultKubernetes, name: 'shop', namespace: 'shop', configmap: 'shop-config', secret: 'shop-secret', revision: 'release-1',
      image: 'registry.example.com/shop:1.0', replicas: '3', worker, imagePullSecret: 'registry', readinessPath: '/health_ready', context: 'not-contacted' });
    const document = JSON.parse(run(['kubernetes', ...result.argv], ['--user', '1000:1000', '--read-only', '--tmpfs', '/tmp']));
    expect(document.kind).toBe('List');
    expect(document.items.map((item: { kind: string }) => item.kind)).toEqual(['Job', 'Deployment', 'Service', 'Deployment']);
    const web = document.items.find((item: { metadata: { name: string } }) => item.metadata.name === 'shop-web');
    expect(web.spec.replicas).toBe(3);
    expect(web.spec.template.spec.containers[0].readinessProbe.httpGet.path).toBe('/health_ready');
    expect(web.spec.template.spec.imagePullSecrets[0].name).toBe('registry');
    expect(document.items.find((item: { metadata: { name: string } }) => item.metadata.name === 'shop-worker').spec.replicas).toBe(worker ? 1 : 0);
    expect(JSON.stringify(document)).not.toContain('docker.sock');
  });
  it('validates the generated one-off Compose structure without starting services', () => {
    const path = resolve('tmp/docker-configs/compose-tool.yaml');
    mkdirSync('tmp/docker-configs', { recursive: true });
    writeFileSync(path, composeTool(scenario()).yaml);
    const document = JSON.parse(execFileSync('docker', ['compose', '--file', path, '--profile', 'tools', 'config', '--format', 'json'], { encoding: 'utf8', timeout: 30000 }));
    expect(document.services.laraship.restart).toBe('no');
    expect(document.services.laraship.command).toEqual(['--help']);
    expect(document.services.laraship.network_mode).toBe('host');
    expect(document.services.laraship.volumes.filter((volume: { read_only?: boolean }) => !volume.read_only)).toHaveLength(4);
  });
  it.each([
    { command: 'update', noMigrate: true, reset: true, force: true, postDeployMode: 'replace', postDeploy: "printf '%s' '$literal'", codeConsent: true },
    { command: 'update', postDeployMode: 'skip' }, { command: 'backup', action: 'now' }, { command: 'backup', action: 'list' },
    { command: 'backup', action: 'restore', dumpFile: 'shop-1.dump', yes: true }, { command: 'activate' }, { command: 'deactivate' }, { command: 'remove', domain: 'shop.example.com' },
  ] as Partial<OperationConfig>[])('checks only the real parser function for %j; never calls its operation', overrides => {
    const config = { ...defaultOperation, slug: 'shop', acknowledged: true, ...overrides };
    const result = generateOperation(config, 'bash');
    const source = readFileSync(resolve('tmp/upstream-laraship', `${config.command}.sh`), 'utf8');
    const parser = source.match(/^parse_args\(\) \{[\s\S]*?^\}/m)?.[0];
    expect(parser).toBeDefined();
    const script = `set -eu\nWWW_DIR=/tmp/operation-fixture\nSLUG='' DOMAIN='' NO_MIGRATE=false HARD_RESET=false FORCE=false POST_DEPLOY_OVERRIDE='' POST_DEPLOY_OVERRIDE_SET=false ACTION='' DUMP_FILE='' ASSUME_YES=false DB_ROOT_PASSWORD=''\nmkdir -p "$WWW_DIR/shop/.config/backup"\ntouch "$WWW_DIR/shop/.config/backup/dump.sh"\nerror() { printf '%s\\n' "$*" >&2; exit 1; }\n${parser}\nparse_args "$@"\nprintf '%s\\0' "$SLUG" "$NO_MIGRATE" "$HARD_RESET" "$FORCE" "$POST_DEPLOY_OVERRIDE" "$POST_DEPLOY_OVERRIDE_SET" "$ACTION" "$DUMP_FILE" "$ASSUME_YES" "$DOMAIN"`;
    const output = execFileSync('docker', ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label, '--entrypoint', 'bash', CLI_IMAGE.reference, '-c', script, '--', ...result.argv], { encoding: 'utf8', timeout: 30000 }).split('\0');
    expect(output[0]).toBe('shop');
    if (config.command === 'update') {
      expect(output.slice(1, 4)).toEqual([String(config.noMigrate), String(config.reset), String(config.force)]);
      expect(output[4]).toBe(config.postDeployMode === 'skip' ? '' : config.postDeploy);
      expect(output[5]).toBe('true');
    }
    if (config.command === 'backup') { expect(output[6]).toBe(config.action); expect(output[8]).toBe(String(config.yes)); }
    if (config.command === 'remove') expect(output[9]).toBe(config.domain);
  });
  it('has the verified identity and working informational entry points', () => {
    const image = JSON.parse(execFileSync('docker', ['image', 'inspect', CLI_IMAGE.reference], { encoding: 'utf8' }))[0];
    expect(image.Architecture).toBe('amd64');
    expect(image.Os).toBe('linux');
    expect(image.Config.Labels['org.opencontainers.image.revision']).toBe(CLI_IMAGE.revision);
    expect(run(['--version'])).toContain(UPSTREAM.version);
    expect(run(['deploy', '--help'])).toContain('--db-native');
  });
  it.each(scenarios.filter(([, overrides]) => overrides.dbLocation !== 'native'))('%s agrees with the generated CLI and config', (name, overrides, expected) => {
    const result = generate(scenario(overrides), 'docker');
    const output = run(result.dryRunArgv.slice(result.dryRunArgv.indexOf(CLI_IMAGE.reference) + 1));
    for (const text of expected) expect(output).toContain(text);
    expect(output).toContain('Nothing was changed.');
    mkdirSync('tmp/docker-configs', { recursive: true });
    const path = resolve('tmp/docker-configs', `${name.replaceAll(/[^a-z0-9]/gi, '-')}.config`);
    writeFileSync(path, result.config);
    const fromConfig = run(['deploy', '--dry-run', '--config', '/tmp/fixture.config'], ['--mount', `type=bind,src=${path},dst=/tmp/fixture.config,readonly`]);
    for (const text of expected) expect(fromConfig).toContain(text);
    expect(fromConfig).toContain('Nothing was changed.');
  });
  it('preserves unusual server file paths through Docker CSV and shell quoting', () => {
    mkdirSync('tmp/docker-configs', { recursive: true });
    const path = resolve('tmp/docker-configs/fixture-key');
    writeFileSync(path, 'NOT A REAL KEY: dry-run checks existence only\n');
    const serverPath = `/tmp/key,with "quotes" and 'apostrophe'`;
    const result = generate(scenario({ source: 'existing', repo: 'git@github.com:acme/app.git', deployKey: serverPath }), 'docker');
    // A fixture mount makes the server path visible on Docker Desktop; generated same-path mount is parsed by Docker too.
    const fixtureMount = `type=bind,src=${path},"dst=${serverPath.replaceAll('"', '""')}",readonly`;
    const prefix = ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label, '--mount', fixtureMount, '--entrypoint', 'bash', CLI_IMAGE.reference];
    const command = result.dryRun;
    expect(command).toContain(shellQuote(bindMount(serverPath, true)));
    // Stub Docker inside the container: parse exactly the displayed POSIX command, then execute only the image's dry-run.
    const stub = `docker() { while [ "$1" != ${shellQuote(CLI_IMAGE.reference)} ]; do shift; done; shift; /usr/local/bin/laraship "$@"; }; ${command}`;
    const output = execFileSync('docker', [...prefix, '-c', stub], { encoding: 'utf8', timeout: 30000 });
    expect(output).toContain('Nothing was changed.');
  });
  it.each(['bash', 'docker', 'python-native', 'python-docker'] as const)('%s validates callbacks without executing or delivering them', runner => {
    const config = scenario({ completionEnabled: true, onComplete: '/opt/laraship-hooks/notify.sh', completionScriptConsent: true,
      completionEndpoint: 'https://api.example.com/completed', completionEndpointConsent: true,
      completionTokenFile: '/opt/laraship-hooks/token', completionTimeout: '45', completionIncludeSecrets: true });
    const result = generate(config, runner);
    const fixture = resolve('tmp/docker-configs/completion.config');
    mkdirSync('tmp/docker-configs', { recursive: true });
    writeFileSync(fixture, result.config);
    const setup = `set -e
install -d -m 700 /opt/laraship-hooks /tmp/adapter-bin
printf '#!/bin/sh\\ntouch /tmp/hook-was-called\\n' > /opt/laraship-hooks/notify.sh
chmod 700 /opt/laraship-hooks/notify.sh
printf 'SYNTHETIC_TEST_TOKEN\\n' > /opt/laraship-hooks/token
chmod 600 /opt/laraship-hooks/token
printf '#!/bin/sh\\nexec python3 -m laraship "$@"\\n' > /tmp/adapter-bin/laraship
chmod 700 /tmp/adapter-bin/laraship
cat > /tmp/adapter-bin/docker <<'STUB'
#!/bin/bash
if [ "$1" = info ]; then printf 'linux\\n'; exit 0; fi
printf '%s\\n' "$@" > /tmp/adapter-arguments
while [ "$1" != '${CLI_IMAGE.reference}' ]; do shift; done
shift
exec /usr/local/bin/laraship "$@"
STUB
chmod 700 /tmp/adapter-bin/docker
export PATH="/tmp/adapter-bin:$PATH" PYTHONPATH=/source/src
${result.dryRun}
${runner.startsWith('python') ? `laraship deploy --backend ${runner === 'python-docker' ? `docker --image ${CLI_IMAGE.reference} --mount-readonly /opt/laraship-hooks` : 'native'} -- --dry-run --config /tmp/fixture.config` : '/usr/local/bin/laraship deploy --dry-run --config /tmp/fixture.config'}
test ! -e /tmp/hook-was-called
${runner === 'python-docker' ? "grep -Fx -- '--read-only' /tmp/adapter-arguments\ngrep -Fx -- 'none' /tmp/adapter-arguments\ngrep -F -- 'src=/opt/laraship-hooks' /tmp/adapter-arguments\n! grep -F -- '/var/run/docker.sock' /tmp/adapter-arguments" : ''}
`;
    const output = execFileSync('docker', ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label,
      '--mount', `type=bind,src=${fixture},dst=/tmp/fixture.config,readonly`,
      '--mount', `type=bind,src=${resolve('tmp/upstream-laraship')},dst=/source,readonly`,
      '--entrypoint', 'bash', CLI_IMAGE.reference, '-c', setup], { encoding: 'utf8', timeout: 30000 });
    expect(output.match(/Nothing was changed\./g)).toHaveLength(2);
    expect(output).toContain('configured (not executed during dry run)');
    expect(output).not.toContain('SYNTHETIC_TEST_TOKEN');
  });
  it('contains the same command contracts as the audited source revision', () => {
    const files = ['deploy-laravel.sh', 'versions.env', 'VERSION', 'list-projects.sh', 'update.sh', 'backup.sh', 'activate.sh', 'deactivate.sh', 'remove.sh', 'kubernetes.sh', 'kubernetes/laraship.py', 'lib/runtime.sh', 'lib/proxy.sh', 'lib/endpoint.py', 'lib/completion.py', 'lib/completion.sh', 'docker-preflight.py',
      'modules/backup.sh', 'modules/filament.sh', 'modules/horizon.sh', 'modules/queue.sh', 'modules/redis.sh',
      'presets/admin-panel.conf', 'presets/api.conf', 'presets/staging.conf'];
    // No server access: compare image contents with the existing pinned local source fixture.
    const paths = [...files.map(file => [`/opt/laraship/${file}`, file]), ['/usr/local/bin/laraship', 'docker/entrypoint.sh']];
    const output = execFileSync('docker', ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label, '--entrypoint', 'sha256sum', CLI_IMAGE.reference, ...paths.map(([imagePath]) => imagePath)], { encoding: 'utf8', timeout: 30000 });
    for (const [imagePath, file] of paths) expect(output).toContain(`${createHash('sha256').update(readFileSync(resolve('tmp/upstream-laraship', file))).digest('hex')}  ${imagePath}`);
  });
});
