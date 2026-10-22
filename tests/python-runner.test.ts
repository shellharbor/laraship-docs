import { describe, expect, it } from 'vitest';
import { CLI_IMAGE, UPSTREAM } from '../src/data/upstream';
import { generate } from '../src/domain/generate';
import { CONFIG_PATH, management, PYTHON_INSTALL_COMMAND, PYTHON_NATIVE_INSTALL_COMMAND, resolveRunner } from '../src/domain/runner';
import { scenario, scenarios } from './scenarios';

describe('Python CLI runners', () => {
  it.each(scenarios)('%s forwards unchanged argv/config through the native adapter', (_, overrides) => {
    const config = scenario(overrides);
    const bash = generate(config);
    const python = generate(config, 'python-native');
    expect(python.argv).toEqual(bash.argv);
    expect(python.config).toBe(bash.config);
    expect(python.deploy).toMatch(/^sudo "\$\(command -v laraship\)" deploy --backend native --directory \/opt\/laraship -- /);
    expect(python.dryRunArgv).toEqual(['laraship', 'deploy', '--backend', 'native', '--directory', '/opt/laraship', '--', '--dry-run', ...bash.argv]);
    expect(python.configCommand).toContain(`-- --config '${CONFIG_PATH}'`);
  });
  it('selects the immutable image and separates adapter arguments from backend flags', () => {
    const result = generate(scenario({ source: 'existing', repo: 'git@github.com:acme/app.git', deployKey: "/root/key with 'quote'" }), 'python-docker');
    expect(result.dryRunArgv.slice(0, 6)).toEqual(['laraship', 'deploy', '--backend', 'docker', '--image', CLI_IMAGE.reference]);
    expect(result.dryRunArgv).toContain('--mount-readonly');
    expect(result.dryRun).toContain('-- --dry-run');
    expect(result.configCommand).toContain(`--mount-readonly '${CONFIG_PATH}' -- --config`);
    expect(result.deploy).not.toContain('latest');
  });
  it('uses native Python for native DBs, including the hidden MySQL input template', () => {
    const config = scenario({ dbType: 'mysql', dbLocation: 'native' });
    expect(resolveRunner(config, 'python-docker')).toBe('python-native');
    expect(() => generate(config, 'python-docker')).toThrow('Native database');
    const result = generate(config, 'python-native');
    expect(result.nativeMysqlSnippet).toContain('"$LARASHIP_MYSQL_ROOT"');
    expect(result.nativeMysqlSnippet).not.toContain('<MYSQL_ROOT_PASSWORD>');
  });
  it('uses adapter management commands and keeps runtime installation explicit', () => {
    expect(management('python-native', 'update', ['--slug', 'app'])).toContain('update --backend native --directory /opt/laraship --');
    expect(management('python-docker', 'backup', ['--slug', 'app', 'now'])).toContain(`backup --backend docker --image ${CLI_IMAGE.reference} --`);
    expect(PYTHON_INSTALL_COMMAND).toContain(`pipx install laraship==${UPSTREAM.version}`);
    expect(PYTHON_NATIVE_INSTALL_COMMAND).toContain(`install --backend native --version ${UPSTREAM.version}`);
  });
  it('guards upstream Python Docker CSV path limitations while preserving direct Docker support', () => {
    const config = scenario({ source: 'existing', repo: 'git@github.com:acme/app.git', deployKey: '/root/key,with-comma' });
    expect(() => generate(config, 'python-docker')).toThrow('Python Docker mounts');
    expect(() => generate(config, 'docker')).not.toThrow();
  });
  it('keeps the existing repository SSH key available to image-based updates', () => {
    expect(management('python-docker', 'update', ['--slug', 'app'], ['/root/app-key'])).toContain("--mount-readonly '/root/app-key' --");
    expect(management('docker', 'update', ['--slug', 'app'], ['/root/app-key'])).toContain('src=/root/app-key,dst=/root/app-key,readonly');
  });
});
