import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLI_OPTION_MAP, UPSTREAM } from '../src/data/upstream';
import { generate } from '../src/domain/generate';
import { shellQuote } from '../src/domain/shellQuote';
import { scenario, scenarios } from './scenarios';
import { ARGUMENT_CATALOG } from '../src/data/argumentCatalog';

const enabled = process.env.LARASHIP_UPSTREAM_TEST === '1';
const upstream = resolve(process.env.LARASHIP_UPSTREAM_DIR || 'tmp/upstream-laraship');
const bash = process.env.BASH_BIN || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const script = resolve(upstream, 'deploy-laravel.sh').replaceAll('\\', '/');
function run(args: string[]) {
  return execFileSync(bash, [script, '--dry-run', ...args], { encoding: 'utf8', timeout: 90000 }).replace(/\u001b\[[0-9;]*m/g, '');
}
describe.skipIf(!enabled)('pinned upstream differential checks', () => {
  it('covers every lifecycle, Python and Kubernetes parser option in the public reference', () => {
    for (const name of ['update', 'backup', 'activate', 'deactivate', 'remove'] as const) {
      const source = readFileSync(resolve(upstream, `${name}.sh`), 'utf8');
      const parser = source.slice(source.indexOf('parse_args() {')).split('\n}\n')[0];
      for (const flag of new Set(parser.match(/--[a-z][a-z-]+(?=\))/g))) expect(ARGUMENT_CATALOG.some(row => row.scope === name && row.flag.includes(flag)), `${name}: ${flag}`).toBe(true);
    }
    for (const [scope, file] of [['python', 'src/laraship/cli.py'], ['kubernetes', 'kubernetes/laraship.py']] as const) {
      const source = readFileSync(resolve(upstream, file), 'utf8');
      for (const match of source.matchAll(/add_argument\("(--[a-z][a-z-]+)"/g)) expect(ARGUMENT_CATALOG.some(row => row.scope === scope && row.flag.includes(match[1])), `${scope}: ${match[1]}`).toBe(true);
    }
    for (const name of ['name', 'namespace', 'configmap', 'secret', 'revision']) expect(ARGUMENT_CATALOG.some(row => row.scope === 'kubernetes' && row.flag === `--${name}`)).toBe(true);
  });
  it('verifies exact revision and full parser registry before execution', () => {
    expect(existsSync(script)).toBe(true);
    expect(execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()).toBe(UPSTREAM.commit);
    const source = readFileSync(script, 'utf8');
    const parserStart = source.indexOf('parse_args() {');
    const parser = source.slice(parserStart, source.indexOf('    validate_endpoint', parserStart));
    const flags = new Set(parser.match(/--[a-z][a-z-]+(?=\))/g));
    const registry = CLI_OPTION_MAP.map(option => option.flag);
    for (const flag of flags) expect(registry).toContain(flag);
    for (const flag of registry) expect(source).toContain(flag);
    const help = execFileSync(bash, [script, '--help'], { encoding: 'utf8' });
    expect(help).toContain('--db-native'); expect(help).toContain('--with');
  });
  it.each(scenarios)('%s agrees with upstream dry-run and config parser', (_name, overrides, expectations) => {
    const result = generate(scenario(overrides));
    const output = run(result.argv);
    for (const expected of expectations) expect(output).toContain(expected);
    expect(output).toContain('Nothing was changed.');
    mkdirSync('tmp/integration-configs', { recursive: true });
    const path = resolve('tmp/integration-configs', `${_name.replaceAll(/[^a-z0-9]/gi, '-')}.config`).replaceAll('\\', '/');
    writeFileSync(path, result.config);
    const configOutput = run(['--config', path]);
    for (const expected of expectations) expect(configOutput).toContain(expected);
  }, 180000);
  it('accepts an existing SSH deploy key file path', () => {
    mkdirSync('tmp/integration-configs', { recursive: true });
    const key = resolve('tmp/integration-configs/fixture-key').replaceAll('\\', '/');
    writeFileSync(key, 'NOT A REAL KEY: dry-run only checks existence\n');
    // On Windows the generated path is a POSIX absolute path for Git Bash.
    const serverPath = process.platform === 'win32' ? key.replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`) : key;
    const result = generate(scenario({ source: 'existing', repo: 'git@github.com:acme/app.git', deployKey: serverPath }));
    expect(run(result.argv)).toContain('Nothing was changed.');
  });
  it.each(["O'Connor", '$HOME; touch /tmp/laraship-injection', 'with spaces', '"double"', 'back\\slash'])('round-trips literal shell argument %s without executing input', input => {
      const output = execFileSync(bash, ['-c', `printf '%s' ${shellQuote(input)}`], { encoding: 'utf8' });
      expect(output).toBe(input);
      const result = generate(scenario({ modules: ['filament'], filamentEmail: 'admin@example.com', filamentName: input }));
      // Execute only the generated argument parsing with --dry-run; never run deployment or a hook.
      const command = result.dryRun.replace('/opt/laraship/deploy-laravel.sh', shellQuote(script));
      expect(execFileSync(bash, ['-c', command], { encoding: 'utf8' })).toContain('Nothing was changed.');
      const path = resolve('tmp/integration-configs/literal.config').replaceAll('\\', '/');
      writeFileSync(path, result.config);
      expect(run(['--config', path])).toContain('Nothing was changed.');
  });
});
