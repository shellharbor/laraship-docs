import { describe, expect, it } from 'vitest';
import { CLI_IMAGE } from '../src/data/upstream';
import { generate } from '../src/domain/generate';
import { bindMount, CONFIG_PATH, dockerManagement, resolveRunner, SERVER_MOUNTS } from '../src/domain/runner';
import { shellQuote } from '../src/domain/shellQuote';
import { scenario, scenarios } from './scenarios';

describe('Docker runner contracts', () => {
  it.each(scenarios.filter(([, overrides]) => overrides.dbLocation !== 'native'))('%s preserves CLI settings in both runners', (_name, overrides) => {
    const config = scenario(overrides);
    const bash = generate(config);
    const docker = generate(config, 'docker');
    expect(docker.argv).toEqual(bash.argv);
    expect(docker.config).toBe(bash.config);
    expect(docker.deployArgv.slice(-bash.argv.length - 1)).toEqual(['deploy', ...bash.argv]);
    expect(docker.dryRunArgv.slice(-bash.argv.length - 2)).toEqual(['deploy', '--dry-run', ...bash.argv]);
    expect(docker.deployArgv).toContain(CLI_IMAGE.reference);
  });
  it('grants server access only to deployment, never to a simple preview', () => {
    const result = generate(scenario(), 'docker');
    expect(result.deployArgv.slice(0, 7)).toEqual(['sudo', 'docker', 'run', '--rm', '-it', '--network', 'host']);
    for (const path of SERVER_MOUNTS) expect(result.deployArgv).toContain(`type=bind,src=${path},dst=${path}`);
    expect(result.dryRunArgv.slice(0, 3)).toEqual(['docker', 'run', '--rm']);
    expect(result.dryRunArgv).not.toContain('--mount');
    expect(result.dryRunArgv).not.toContain('--network');
    expect(result.deploy).not.toMatch(/--privileged|--hostname|latest|sudo bash/);
  });
  it.each(['postgres', 'mysql'] as const)('falls back to Bash and refuses direct Docker generation for native %s', dbType => {
    const config = scenario({ dbType, dbLocation: 'native' });
    expect(resolveRunner(config, 'docker')).toBe('bash');
    expect(() => generate(config, 'docker')).toThrow('Native database provisioning requires the Bash runner');
    expect(generate(config, resolveRunner(config, 'docker')).deploy).toMatch(/^sudo bash/);
  });
  it('mounts config and an active deploy key read-only at identical paths', () => {
    const path = `/root/.ssh/key,with "quotes" and 'apostrophe'`;
    const result = generate(scenario({ source: 'existing', repo: 'git@github.com:acme/app.git', deployKey: path }), 'docker');
    expect(result.deployArgv).toContain(bindMount(path, true));
    expect(result.dryRunArgv).toContain(bindMount(path, true));
    expect(result.deploy).toContain(`--mount ${shellQuote(bindMount(path, true))}`);
    expect(result.configCommand).toContain(`--mount ${shellQuote(bindMount(CONFIG_PATH, true))}`);
    expect(result.configCommand).toContain(`--mount ${shellQuote(bindMount(path, true))}`);
    expect(result.configCommand).toContain(`deploy --config ${shellQuote(CONFIG_PATH)}`);
    expect(bindMount(path, true)).toBe(`type=bind,"src=/root/.ssh/key,with ""quotes"" and 'apostrophe'","dst=/root/.ssh/key,with ""quotes"" and 'apostrophe'",readonly`);
  });
  it('does not leak inactive key values into new application mounts', () => {
    const result = generate(scenario({ deployKey: '/root/stale-key' }), 'docker');
    expect(result.deploy + result.dryRun + result.configCommand).not.toContain('stale-key');
  });
  it('uses the same server access and immutable image for management commands', () => {
    const command = dockerManagement('update', ['--slug', 'testapp']);
    expect(command).toContain(CLI_IMAGE.reference);
    expect(command).toContain("'update' '--slug' 'testapp'");
    for (const path of SERVER_MOUNTS) expect(command).toContain(`src=${path},dst=${path}`);
  });
});
