import { describe, expect, it } from 'vitest';
import { CLI_OPTION_MAP, PRESETS } from '../src/data/upstream';
import { changeSource, effectiveConfig, moduleLock } from '../src/domain/constraints';
import { generate, generateArgv, MYSQL_PLACEHOLDER } from '../src/domain/generate';
import { preferences, readPreferences } from '../src/domain/preferences';
import { shellQuote } from '../src/domain/shellQuote';
import { validate, validRepo } from '../src/domain/validate';
import { scenario, scenarios } from './scenarios';

describe('supported scenarios', () => {
  it.each(scenarios)('%s produces valid arguments', (_name, overrides) => {
    const config = scenario(overrides);
    expect(validate(config)).toEqual([]);
    const result = generate(config);
    expect(result.dryRun).toContain('--dry-run');
    expect(result.deploy).toMatch(/^sudo bash/);
    expect(result.config).toContain('SLUG="testapp"');
    for (let i = 0; i < result.argv.length; i++) {
      const option = CLI_OPTION_MAP.find(option => option.flag === result.argv[i]);
      expect(option, result.argv[i]).toBeDefined();
      if (option?.type === 'value') i++;
    }
  });
  it('minimal command does not duplicate defaults or aliases', () => {
    expect(generateArgv(scenario())).toEqual(['--slug', 'testapp', '--domain', 'app.example.com', '--db-type', 'postgres', '--ssl-email', 'operator@example.com']);
  });
  it('isolates engine-specific names and ports', () => {
    const result = generate(scenario({ dbType: 'mysql', ports: { http: '', https: '', php: '', redis: '', postgres: '9999', mysql: '3307' } }));
    expect(result.argv).not.toContain('--port-postgres');
    expect(result.argv).toContain('--port-mysql');
  });
  it('marks native MySQL as a template and provides local hidden input', () => {
    const result = generate(scenario({ dbType: 'mysql', dbLocation: 'native' }));
    expect(result.needsSecret).toBe(true);
    expect(result.deploy).toContain(`--db-root-password '${MYSQL_PLACEHOLDER}'`);
    expect(result.nativeMysqlSnippet).toContain('read -r -s');
    expect(result.nativeMysqlSnippet).toContain('"$LARASHIP_MYSQL_ROOT"');
    expect(result.nativeMysqlSnippet).toContain('unset LARASHIP_MYSQL_ROOT');
    expect(result.nativeMysqlSnippet).not.toContain(MYSQL_PLACEHOLDER);
  });
  it('existing repositories omit stale new-app values', () => {
    const config = scenario({ source: 'existing', repo: 'https://github.com/acme/app', laravelVersion: '12.0', filamentEmail: 'stale@example.com' });
    const result = generate(config);
    expect(result.argv).not.toContain('--laravel-version');
    expect(result.argv).not.toContain('--filament-email');
  });
});
describe('effective configuration', () => {
  it('preserves API uploads and permits an explicit override', () => {
    expect(effectiveConfig(scenario({ presets: ['api'] })).phpUploadMax).toBe('16M');
    expect(effectiveConfig(scenario({ presets: ['api'], phpUploadMax: '1G' })).phpUploadMax).toBe('1G');
    expect(generate(scenario({ presets: ['api'] })).argv).not.toContain('--php-upload-max');
  });
  it('locks additive preset and dependency features', () => {
    expect(effectiveConfig(scenario({ presets: ['staging'], basicAuth: false })).basicAuth).toBe(true);
    expect(moduleLock(scenario({ presets: ['admin-panel'] }), 'queue')).toBe('preset');
    expect(moduleLock(scenario({ modules: ['horizon'] }), 'redis')).toBe('dependency');
    expect(moduleLock(scenario({ modules: ['queue'] }), 'horizon')).toBe('conflict');
  });
  it('switching to Existing removes incompatible selections', () => {
    const config = changeSource(scenario({ presets: ['api'], modules: ['filament', 'backup'] }), 'existing');
    expect(config.presets).toEqual([]); expect(config.modules).toEqual(['backup']);
  });
  it.each(Object.keys(PRESETS))('does not silently remove modules from %s', preset => {
    const p = preset as keyof typeof PRESETS;
    expect(effectiveConfig(scenario({ presets: [p] })).modules).toEqual(expect.arrayContaining(PRESETS[p].modules));
  });
});
describe('validation', () => {
  it.each([
    [{ slug: 'NGINXPROXY' }, 'slug'], [{ slug: 'bad slug' }, 'slug'], [{ domain: 'https://app.test' }, 'domain'],
    [{ domain: 'bad..test' }, 'domain'], [{ domain: '127.0.0.1' }, 'domain'], [{ domain: '-bad.test' }, 'domain'],
    [{ sslEmail: '' }, 'email'], [{ modules: ['filament'] }, 'email'],
    [{ presets: ['admin-panel'], filamentEmail: 'admin@example.com', modules: ['horizon'] }, 'queue-horizon'],
    [{ source: 'existing', repo: 'https://github.com/acme/app', presets: ['api'] }, 'existing-modules'],
    [{ source: 'existing', repo: 'https://token@github.com/acme/app' }, 'repo'],
    [{ source: 'existing', repo: 'https://github.com/acme/app', deployKey: '/root/key' }, 'deploy-key'],
    [{ source: 'existing', repo: 'git@github.com:acme/app', deployKey: 'relative/key' }, 'deploy-key'],
    [{ source: 'existing', repo: 'https://github.com/acme/app', branch: 'bad;branch' }, 'branch'],
    [{ modules: ['backup'], backupKeep: '3651' }, 'retention'], [{ modules: ['backup'], backupKeep: '0' }, 'retention'],
    [{ phpUploadMax: '64MB' }, 'upload'], [{ endpoint: 'http://example.com', endpointConsent: true }, 'endpoint'],
    [{ endpoint: 'https://example.com' }, 'endpoint-consent'],
    [{ expert: true, postDeploy: 'php artisan migrate' }, 'code-consent'],
    [{ expert: true, postDeploy: 'echo ok\necho evil', postDeployConsent: true }, 'single-line'],
    [{ filamentName: '--help' }, 'reserved-action'],
    [{ filamentName: '--dry-run' }, 'reserved-action'],
    [{ filamentName: '--config' }, 'reserved-action'],
  ] as [Partial<import('../src/domain/wizardSchema').WizardConfig>, string][])('rejects %j', (overrides, code) => {
    expect(validate(scenario(overrides)).map(issue => issue.code)).toContain(code);
    expect(() => generate(scenario(overrides))).toThrow();
  });
  it.each(['0', '65536', '1e3', '22.2', '-1', ' 8000', '123456'])('rejects invalid port %s', port => {
    const config = scenario(); config.ports.http = port;
    expect(validate(config).some(issue => issue.code === 'port')).toBe(true);
  });
  it('compares ports numerically and reserves proxy ports', () => {
    const config = scenario(); config.ports.http = '08100'; config.ports.php = '8100'; config.ports.redis = '80';
    expect(validate(config).map(issue => issue.code)).toEqual(expect.arrayContaining(['duplicate-port', 'reserved-port']));
  });
  it('honors different name and user length limits', () => {
    for (const [db, maxName, maxUser] of [['postgres', 63, 63], ['mysql', 64, 32]] as const) {
      const config = scenario({ dbType: db });
      config.dbNames[db] = { name: 'a'.repeat(maxName), user: 'u'.repeat(maxUser) };
      expect(validate(config)).toEqual([]);
      config.dbNames[db].user += 'x';
      expect(validate(config).some(issue => issue.field === 'db-user')).toBe(true);
    }
  });
  it('rejects container MySQL root app user but reflects native CLI behavior', () => {
    const config = scenario({ dbType: 'mysql' }); config.dbNames.mysql.user = 'root';
    expect(validate(config).map(issue => issue.code)).toContain('mysql-root');
    config.dbLocation = 'native'; expect(validate(config)).toEqual([]);
  });
  it.each(['https://user:password@github.com/a/b', 'https://token@github.com/a/b', 'file:///tmp/repo', 'git://github.com/a/b', 'https://github.com/a/b?token=secret', 'https://github.com/a/b#secret', 'ssh://git:secret@github.com/a/b'])('rejects unsafe repository %s', repo => expect(validRepo(repo)).toBe(false));
  it.each(['https://github.com/a/b.git', 'ssh://git@github.com/a/b.git', 'git@github.com:a/b.git'])('accepts repository %s', repo => expect(validRepo(repo)).toBe(true));
});
describe('literal quoting and privacy', () => {
  it.each(["a'b", '$HOME; touch /tmp/should-not-exist', 'with spaces', '"double quotes"', '\\path', '--value'])('quotes %s as one argument', value => {
    expect(shellQuote(value)).toBe(`'${value.replaceAll("'", "'\"'\"'")}'`);
  });
  it.each(['a\nb', '\r', '\u0000', '\u001b', '\u007f'])('rejects control character %j', value => expect(() => shellQuote(value)).toThrow());
  it('never stores identity, URLs, email, key path, hooks or unknown secret fields', () => {
    const config = scenario({ repo: 'git@github.com:private/app', endpoint: 'https://notify.example/private', deployKey: '/root/private-key', expert: true, postDeploy: 'echo private', sslEmail: 'private@example.com' });
    const saved = preferences({ ...config, password: 'never-persist' } as typeof config);
    expect(saved).not.toMatch(/private|example|password|testapp|never-persist/);
    expect(readPreferences(saved).modules).toEqual(config.modules);
  });
  it('handles corrupt storage without trusting object shapes', () => {
    expect(readPreferences('{broken').slug).toBe('');
    expect(readPreferences('{"modules":"bad","dbType":"oracle","__proto__":{"secret":true}}').dbType).toBe('postgres');
  });
  it('quotes option-like values by metadata, not by value prefix', () => {
    const config = scenario({ modules: ['filament'], filamentEmail: 'admin@example.com', filamentName: '--my-name' });
    expect(generate(config).deploy).toContain("--filament-name '--my-name'");
    expect(generate(config).config).toContain('FILAMENT_NAME="--my-name"');
  });
});
