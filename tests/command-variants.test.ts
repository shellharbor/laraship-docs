import { describe, expect, it } from 'vitest';
import { deploymentVariants } from '../src/domain/commandVariants';
import { defaultExecution } from '../src/domain/execution';
import { scenario } from './scenarios';

describe('simultaneous deployment commands', () => {
  it('preserves the same effective arguments and config through all four entrypoints', () => {
    const variants = deploymentVariants(scenario({
      presets: ['api', 'staging'], ports: { http: '', https: '', php: '', redis: '', postgres: '5544', mysql: '' },
      dbNames: { postgres: { name: 'custom_db', user: 'custom_user' }, mysql: { name: '', user: '' } },
      completionEnabled: true, completionEndpoint: 'https://api.example.com/completed', completionEndpointConsent: true,
    }));
    expect(variants.map(variant => variant.runner)).toEqual(['bash', 'docker', 'python-native', 'python-docker']);
    expect(variants.every(variant => !variant.issues.length && variant.result)).toBe(true);
    const [bash, docker, native, pythonDocker] = variants.map(variant => variant.result!);
    for (const result of [bash, docker, native, pythonDocker]) {
      expect(result.argv).toEqual(bash.argv);
      expect(result.config).toBe(bash.config);
      expect(result.deploy).toContain("--db-postgres-user 'custom_user'");
      expect(result.deploy).toContain("--port-postgres '5544'");
    }
    expect(bash.deploy).toMatch(/^sudo bash /);
    expect(docker.deploy).toMatch(/^sudo docker run/);
    expect(native.deploy).toContain('deploy --backend native');
    expect(pythonDocker.deploy).toContain('deploy --backend docker');
  });

  it.each(['postgres', 'mysql'] as const)('blocks both Docker variants for native %s without substituting Bash', dbType => {
    const variants = deploymentVariants(scenario({ dbType, dbLocation: 'native' }));
    for (const variant of variants) {
      if (variant.runner === 'docker' || variant.runner === 'python-docker') {
        expect(variant.result).toBeNull();
        expect(variant.issues).toContainEqual(expect.objectContaining({ code: 'native-docker', step: 2 }));
      } else {
        expect(variant.result?.deploy).toContain('--db-native');
        if (dbType === 'mysql') {
          expect(variant.result?.needsSecret).toBe(true);
          expect(variant.result?.deploy).toContain("--db-root-password '<MYSQL_ROOT_PASSWORD>'");
        }
      }
    }
  });

  it('withholds untrusted image commands while keeping native entrypoints usable', () => {
    const variants = deploymentVariants(scenario(), { ...defaultExecution, image: 'example/laraship:1.3.0' });
    expect(variants.filter(variant => variant.result).map(variant => variant.runner)).toEqual(['bash', 'python-native']);
    expect(variants.find(variant => variant.runner === 'docker')?.issues[0].message).toContain('trust');
  });

  it('isolates Python Docker CSV limits from the valid direct Docker command', () => {
    const variants = deploymentVariants(scenario({ source: 'existing', repo: 'git@github.com:acme/app.git', deployKey: '/root/key,custom' }));
    expect(variants.find(variant => variant.runner === 'docker')?.result?.deploy).toContain('key,custom');
    const python = variants.find(variant => variant.runner === 'python-docker')!;
    expect(python.result).toBeNull();
    expect(python.issues).toContainEqual(expect.objectContaining({ code: 'python-mount' }));
  });

  it('withholds invalid native paths without hiding valid Docker entrypoints', () => {
    const variants = deploymentVariants(scenario(), { ...defaultExecution, directory: 'relative/toolkit' });
    expect(variants.filter(variant => variant.result).map(variant => variant.runner)).toEqual(['docker', 'python-docker']);
  });

  it('does not bypass completion consent in any output format', () => {
    for (const variant of deploymentVariants(scenario({ completionEnabled: true, completionEndpoint: 'https://api.example.com/completed', completionEndpointConsent: false }))) {
      expect(variant.result).toBeNull();
      expect(variant.issues.some(issue => issue.field === 'completionEndpointConsent')).toBe(true);
    }
  });
});
