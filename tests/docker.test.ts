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

const enabled = process.env.LARASHIP_DOCKER_TEST === '1';
const label = `io.shellharbor.laraship-docs.test=${process.env.LARASHIP_DOCKER_TEST_RUN}`;
function run(args: string[], options: string[] = []) {
  return execFileSync('docker', ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label, ...options, CLI_IMAGE.reference, ...args],
    { encoding: 'utf8', timeout: 30000 }).replace(/\u001b\[[0-9;]*m/g, '');
}
describe.skipIf(!enabled)('published immutable Docker CLI', () => {
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
  it('contains the same command contracts as the audited source revision', () => {
    const files = ['deploy-laravel.sh', 'versions.env', 'VERSION', 'list-projects.sh', 'update.sh', 'backup.sh', 'lib/runtime.sh', 'lib/proxy.sh', 'lib/endpoint.py', 'docker-preflight.py',
      'modules/backup.sh', 'modules/filament.sh', 'modules/horizon.sh', 'modules/queue.sh', 'modules/redis.sh',
      'presets/admin-panel.conf', 'presets/api.conf', 'presets/staging.conf'];
    // No server access: compare image contents with the existing pinned local source fixture.
    const paths = [...files.map(file => [`/opt/laraship/${file}`, file]), ['/usr/local/bin/laraship', 'docker/entrypoint.sh']];
    const output = execFileSync('docker', ['run', '--rm', '--pull', 'never', '--network', 'none', '--label', label, '--entrypoint', 'sha256sum', CLI_IMAGE.reference, ...paths.map(([imagePath]) => imagePath)], { encoding: 'utf8', timeout: 30000 });
    for (const [imagePath, file] of paths) expect(output).toContain(`${createHash('sha256').update(readFileSync(resolve('tmp/upstream-laraship', file))).digest('hex')}  ${imagePath}`);
  });
});
