import { describe, expect, it } from 'vitest';
import { generate } from '../src/domain/generate';
import { preferences, readPreferences } from '../src/domain/preferences';
import { validate } from '../src/domain/validate';
import { scenario } from './scenarios';

const completion = { completionEnabled: true, onComplete: '/opt/laraship-hooks/notify.sh', completionScriptConsent: true,
  completionEndpoint: 'https://api.example.com/completed', completionEndpointConsent: true,
  completionTokenFile: '/root/laraship-api.token', completionTimeout: '45' };

describe('deployment completion contract', () => {
  it('emits independent final hooks in every runner and config, with passwords off by default', () => {
    for (const runner of ['bash', 'docker', 'python-native', 'python-docker'] as const) {
      const result = generate(scenario(completion), runner);
      expect(result.argv).toContain('--on-complete');
      expect(result.argv).toContain('--completion-endpoint');
      expect(result.argv).toContain('--completion-token-file');
      expect(result.argv).toContain('--completion-timeout');
      expect(result.argv).not.toContain('--completion-include-secrets');
      expect(result.argv).not.toContain('--post-deploy');
      expect(result.argv).not.toContain('--endpoint');
      expect(result.config).toContain('ON_COMPLETE="/opt/laraship-hooks/notify.sh"');
      expect(result.config).toContain('COMPLETION_TOKEN_FILE="/root/laraship-api.token"');
      expect(result.config).toContain('COMPLETION_TIMEOUT="45"');
      expect(result.configCommand).toContain('chmod 600');
      if (runner === 'docker') for (const path of [completion.onComplete, completion.completionTokenFile]) {
        expect(result.deploy + result.dryRun + result.configCommand).toContain(`src=${path},dst=${path},readonly`);
      }
      if (runner === 'python-docker') for (const path of [completion.onComplete, completion.completionTokenFile]) {
        expect(result.deploy).toContain(`--mount-readonly '${path}'`);
        expect(result.dryRun).toContain(`--mount-readonly '${path}'`);
        expect(result.configCommand).toContain(`--mount-readonly '${path}'`);
      }
    }
  });
  it('includes passwords only with explicit opt-in and omits a default timeout', () => {
    const result = generate(scenario({ ...completion, completionTimeout: '30', completionIncludeSecrets: true }));
    expect(result.argv).toContain('--completion-include-secrets');
    expect(result.config).toContain('COMPLETION_INCLUDE_SECRETS="true"');
    expect(result.argv).not.toContain('--completion-timeout');
  });
  it('preserves old hook and endpoint contracts alongside completion', () => {
    const result = generate(scenario({ ...completion, endpoint: 'https://api.example.com/legacy', endpointConsent: true,
      expert: true, postDeploy: 'php artisan db:seed --force', postDeployConsent: true }));
    for (const flag of ['--endpoint', '--post-deploy', '--on-complete', '--completion-endpoint']) expect(result.argv).toContain(flag);
  });
  it('does not emit disabled completion values or readonly mounts', () => {
    const result = generate(scenario({ ...completion, completionEnabled: false, completionIncludeSecrets: true }), 'docker');
    expect(result.deploy + result.dryRun + result.configCommand + result.config).not.toMatch(/completion|notify\.sh|api\.token/i);
  });
  it('never persists completion settings or restores untrusted stored callbacks', () => {
    const config = scenario({ ...completion, completionIncludeSecrets: true });
    const saved = JSON.stringify(preferences(config));
    expect(saved).not.toMatch(/completion|onComplete|notify|api\.example/i);
    const restored = readPreferences(JSON.stringify(config));
    expect(restored.completionEnabled).toBe(false);
    expect(restored.onComplete + restored.completionEndpoint + restored.completionTokenFile).toBe('');
    expect(restored.completionIncludeSecrets).toBe(false);
  });
  it.each([
    [{ onComplete: '', completionEndpoint: '', completionTokenFile: '' }, 'completion-target'],
    [{ completionScriptConsent: false }, 'completion-script-consent'],
    [{ completionEndpointConsent: false }, 'completion-endpoint-consent'],
    [{ onComplete: 'notify.sh' }, 'completion-path'],
    [{ onComplete: '/opt/../notify.sh' }, 'completion-path'],
    [{ completionTokenFile: '/root/./token' }, 'completion-path'],
    [{ completionEndpoint: '' }, 'completion-token'],
    [{ completionEndpoint: 'http://api.example.com' }, 'endpoint'],
    [{ completionEndpoint: 'https://user:pass@api.example.com' }, 'endpoint'],
    [{ completionEndpoint: 'https://api.example.com:0/' }, 'endpoint'],
    [{ completionTimeout: '0' }, 'completion-timeout'],
    [{ completionTimeout: '301' }, 'completion-timeout'],
    [{ completionTimeout: '1.5' }, 'completion-timeout'],
    [{ completionTimeout: '' }, 'completion-timeout'],
    [{ onComplete: '/root/notify.sh\nSLUG=oops' }, 'single-line'],
    [{ completionEndpoint: '--help' }, 'reserved-action'],
  ] as const)('rejects invalid settings %j', (overrides, code) => {
    const config = scenario({ ...completion, ...overrides });
    expect(validate(config).map(issue => issue.code)).toContain(code);
    expect(() => generate(config)).toThrow();
  });
});
