import { MODULES, PRESET_NAMES } from '../data/upstream';
import { orderedPresets, togglePreset } from './constraints';
import { initialConfig, type PresetName, type WizardConfig } from './wizardSchema';

export const STORAGE_KEY = 'laraship-preferences-v1';
// Identity, repository, email, endpoint, key path and hooks never enter persistent storage.
const fields = ['source', 'laravelVersion', 'presets', 'dbType', 'dbLocation', 'modules', 'backupKeep',
  'basicAuth', 'phpUploadMax', 'createBackup', 'createDhparam'] as const;
export function preferences(config: WizardConfig): string {
  return JSON.stringify(Object.fromEntries(fields.map(key => [key, config[key]])));
}
export function readPreferences(raw: string | null): WizardConfig {
  let result = structuredClone(initialConfig);
  if (!raw) return result;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return result;
    const p = data as Record<string, unknown>;
    if (p.source === 'new' || p.source === 'existing') result.source = p.source;
    if (p.laravelVersion === '13.0' || p.laravelVersion === '12.0') result.laravelVersion = p.laravelVersion;
    if (p.dbType === 'postgres' || p.dbType === 'mysql') result.dbType = p.dbType;
    if (p.dbLocation === 'docker' || p.dbLocation === 'native') result.dbLocation = p.dbLocation;
    if (Array.isArray(p.modules)) result.modules = MODULES.filter(module => (p.modules as unknown[]).includes(module));
    for (const key of ['basicAuth', 'createBackup', 'createDhparam'] as const) if (typeof p[key] === 'boolean') result[key] = p[key];
    if (typeof p.backupKeep === 'string' && /^\d{1,4}$/.test(p.backupKeep)) result.backupKeep = p.backupKeep;
    if (typeof p.phpUploadMax === 'string' && /^[0-9]{1,8}[KMGkmg]?$/.test(p.phpUploadMax)) result.phpUploadMax = p.phpUploadMax;
    if (result.source === 'existing') {
      result.modules = result.modules.filter(module => !['filament', 'horizon'].includes(module));
    }
    // Keep the v1 key: migrate the earlier single-preset preference without storing it again.
    const selected = Array.isArray(p.presets) ? p.presets : typeof p.preset === 'string' ? [p.preset] : [];
    for (const preset of orderedPresets(selected.filter((value): value is PresetName => PRESET_NAMES.includes(value as PresetName)))) {
      result = togglePreset(result, preset);
    }
  } catch { /* Corrupt or unavailable preferences fall back to safe defaults. */ }
  return result;
}
