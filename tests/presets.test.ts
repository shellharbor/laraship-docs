import { describe, expect, it } from 'vitest';
import { PRESET_NAMES } from '../src/data/upstream';
import { changeSource, effectiveConfig, moduleLock, orderedPresets, presetBlock, togglePreset } from '../src/domain/constraints';
import { generate } from '../src/domain/generate';
import { preferences, readPreferences } from '../src/domain/preferences';
import { validate } from '../src/domain/validate';
import type { PresetName } from '../src/domain/wizardSchema';
import { scenario } from './scenarios';

const subsets = Array.from({ length: 8 }, (_, mask) => PRESET_NAMES.filter((_, index) => mask & (1 << index)));
describe('compatible preset combinations', () => {
  it.each(subsets.map(presets => [presets.join('+') || 'none', presets] as const))('%s has the correct compatibility', (_name, presets) => {
    const config = scenario({ presets, filamentEmail: 'admin@example.com' });
    const conflict = presets.includes('admin-panel') && presets.includes('api');
    expect(validate(config).some(issue => issue.code === 'preset-conflict' && issue.step === 0)).toBe(conflict);
    for (const runner of ['bash', 'docker'] as const) {
      if (conflict) expect(() => generate(config, runner)).toThrow('cannot be combined');
      else expect(generate(config, runner).argv.filter(flag => flag === '--preset')).toHaveLength(presets.length);
    }
  });
  it.each([['admin-panel', 'staging'], ['api', 'staging']] as PresetName[][])('emits %j as repeated flags and repeated config keys in stable order', (...presets) => {
    const config = scenario({ presets, filamentEmail: 'admin@example.com' });
    const forward = generate(config);
    const reverse = generate({ ...config, presets: [...presets].reverse() });
    expect(reverse.deploy).toBe(forward.deploy);
    expect(reverse.config).toBe(forward.config);
    expect(forward.argv.flatMap((flag, index) => flag === '--preset' ? [forward.argv[index + 1]] : [])).toEqual(presets);
    expect(forward.config.split('\n').filter(line => line.startsWith('PRESET='))).toEqual(presets.map(preset => `PRESET="${preset}"`));
    expect(forward.argv).not.toContain(presets.join(','));
    expect(generate({ ...config, presets: [...presets, ...presets] }).config).toBe(forward.config);
  });
  it('keeps additive modules/auth/upload defaults and explicit overrides', () => {
    const config = scenario({ presets: ['api', 'staging'], modules: ['backup'], phpUploadMax: '1G' });
    const effective = effectiveConfig(config);
    expect(effective.modules).toEqual(['redis', 'horizon', 'backup']);
    expect(effective.basicAuth).toBe(true);
    expect(effective.phpUploadMax).toBe('1G');
    expect(effectiveConfig({ ...config, phpUploadMax: '' }).phpUploadMax).toBe('16M');
    expect(moduleLock(config, 'horizon')).toBe('preset');
    expect(moduleLock(config, 'redis')).toBe('preset');
    expect(moduleLock(config, 'queue')).toBe('conflict');
  });
  it('removes only the deselected preset contributions and preserves manual choices', () => {
    const config = scenario({ presets: ['api', 'staging'], modules: ['redis', 'backup'] });
    const withoutApi = togglePreset(config, 'api');
    expect(withoutApi.presets).toEqual(['staging']);
    expect(effectiveConfig(withoutApi).modules).toEqual(['redis', 'backup']);
    expect(effectiveConfig(withoutApi).phpUploadMax).toBe('');
    expect(effectiveConfig(withoutApi).basicAuth).toBe(true);
    const none = togglePreset(withoutApi, 'staging');
    expect(none.presets).toEqual([]);
    expect(effectiveConfig(none).modules).toEqual(['redis', 'backup']);
    expect(effectiveConfig(none).basicAuth).toBe(false);
    expect(presetBlock(none, 'admin-panel')).toBeUndefined();
  });
  it('blocks both selection directions without replacing an existing choice', () => {
    const admin = scenario({ presets: ['admin-panel', 'staging'] });
    const api = scenario({ presets: ['api', 'staging'] });
    expect(presetBlock(admin, 'api')).toBe('queue');
    expect(presetBlock(api, 'admin-panel')).toBe('horizon');
    expect(togglePreset(admin, 'api')).toBe(admin);
    expect(togglePreset(api, 'admin-panel')).toBe(api);
    expect(presetBlock(scenario({ modules: ['horizon'] }), 'admin-panel')).toBe('horizon');
    expect(presetBlock(scenario({ modules: ['queue'] }), 'api')).toBe('queue');
  });
  it('retains staging when switching a combined preset to an existing repository', () => {
    const config = changeSource(scenario({ presets: ['admin-panel', 'staging'], modules: ['filament', 'backup'] }), 'existing');
    expect(config.presets).toEqual(['staging']);
    expect(config.modules).toEqual(['backup']);
    expect(presetBlock(config, 'api')).toBe('source');
    expect(presetBlock(config, 'admin-panel')).toBe('source');
    expect(effectiveConfig(config).basicAuth).toBe(true);
    expect(changeSource(config, 'new').presets).toEqual(['staging']);
  });
  it('rejects unsupported preset names and existing-source presets even outside the UI', () => {
    expect(() => generate(scenario({ presets: ['unknown' as PresetName] }))).toThrow('available presets');
    expect(validate(scenario({ source: 'existing', repo: 'https://github.com/acme/app.git', presets: ['api', 'staging'] }))).toContainEqual(expect.objectContaining({ code: 'preset-source', step: 0 }));
  });
});
describe('preset preferences migration and sanitization', () => {
  it.each(['none', ...PRESET_NAMES])('migrates a legacy %s choice', preset => {
    const config = readPreferences(JSON.stringify({ preset }));
    expect(config.presets).toEqual(preset === 'none' ? [] : [preset]);
    const saved = JSON.parse(preferences(config));
    expect(saved.presets).toEqual(config.presets);
    expect(saved).not.toHaveProperty('preset');
  });
  it('restores a compatible set in canonical order without duplicate/unknown values', () => {
    expect(readPreferences(JSON.stringify({ presets: ['staging', 'api', 'api', 'unknown', null, {}, false] })).presets).toEqual(['api', 'staging']);
    expect(orderedPresets(['staging', 'api', 'api'])).toEqual(['api', 'staging']);
  });
  it('treats a new empty selection as authoritative over a legacy value', () => {
    expect(readPreferences(JSON.stringify({ presets: [], preset: 'api' })).presets).toEqual([]);
  });
  it('restores only a compatible subset and respects selected services', () => {
    expect(readPreferences(JSON.stringify({ presets: ['staging', 'api', 'admin-panel'] })).presets).toEqual(['admin-panel', 'staging']);
    expect(readPreferences(JSON.stringify({ presets: ['admin-panel', 'staging'], modules: ['horizon'] })).presets).toEqual(['staging']);
    expect(readPreferences(JSON.stringify({ source: 'existing', presets: ['api', 'admin-panel', 'staging'] })).presets).toEqual(['staging']);
  });
});
