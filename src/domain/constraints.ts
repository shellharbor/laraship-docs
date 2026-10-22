import { PRESETS, PRESET_NAMES, MODULES } from '../data/upstream';
import type { ModuleName, PresetName, WizardConfig } from './wizardSchema';

/** Stable order and deduplication make CLI/config output independent of click order. */
export const orderedPresets = (presets: readonly PresetName[]) => PRESET_NAMES.filter(preset => presets.includes(preset));
export function presetDefaults(presets: readonly PresetName[]) {
  const selected = orderedPresets(presets).map(preset => PRESETS[preset]);
  return { modules: MODULES.filter(module => selected.some(preset => preset.modules.includes(module))),
    basicAuth: selected.some(preset => preset.basicAuth),
    upload: selected.reduce((upload, preset) => preset.upload || upload, '') };
}

export function effectiveConfig(config: WizardConfig) {
  const presets = orderedPresets(config.presets);
  const preset = presetDefaults(presets);
  const selected = new Set([...preset.modules, ...config.modules]);
  if (selected.has('horizon')) selected.add('redis');
  return { ...config, presets, modules: MODULES.filter(module => selected.has(module)),
    basicAuth: config.basicAuth || preset.basicAuth,
    phpUploadMax: config.phpUploadMax || preset.upload };
}
export function presetBlock(config: WizardConfig, preset: PresetName): 'source' | 'horizon' | 'queue' | undefined {
  // Selected options must always remain removable, including a restored invalid state.
  if (config.presets.includes(preset)) return;
  const modules = PRESETS[preset].modules;
  if (config.source === 'existing' && modules.some(module => module === 'filament' || module === 'horizon')) return 'source';
  const effective = effectiveConfig(config);
  if (modules.includes('queue') && effective.modules.includes('horizon')) return 'horizon';
  if (modules.includes('horizon') && effective.modules.includes('queue')) return 'queue';
}
export function togglePreset(config: WizardConfig, preset: PresetName): WizardConfig {
  if (config.presets.includes(preset)) return { ...config, presets: config.presets.filter(selected => selected !== preset) };
  if (presetBlock(config, preset)) return config;
  return { ...config, presets: orderedPresets([...config.presets, preset]) };
}
export function moduleLock(config: WizardConfig, module: ModuleName): 'preset' | 'dependency' | 'conflict' | 'source' | undefined {
  const effective = effectiveConfig(config);
  if (config.source === 'existing' && (module === 'filament' || module === 'horizon')) return 'source';
  if (presetDefaults(config.presets).modules.includes(module)) return 'preset';
  if (module === 'redis' && effective.modules.includes('horizon')) return 'dependency';
  if ((module === 'queue' && effective.modules.includes('horizon')) ||
    (module === 'horizon' && effective.modules.includes('queue'))) return 'conflict';
}
export function changeSource(config: WizardConfig, source: WizardConfig['source']): WizardConfig {
  return source === 'new' ? { ...config, source } : {
    ...config, source, presets: orderedPresets(config.presets).filter(preset => !PRESETS[preset].modules.some(module => module === 'filament' || module === 'horizon')),
    modules: config.modules.filter(module => module !== 'filament' && module !== 'horizon'),
  };
}
export function warnings(config: WizardConfig): string[] {
  const e = effectiveConfig(config);
  return [
    ...(!e.https ? ['http'] : []),
    ...(e.dbLocation === 'native' ? [`native-${e.dbType}`] : []),
    ...(e.dbLocation === 'native' && e.dbType === 'mysql' ? ['mysql-secret'] : []),
    ...(e.source === 'existing' ? ['existing'] : []),
    ...(e.modules.includes('queue') && !e.modules.includes('redis') ? ['queue'] : []),
    ...(e.modules.includes('horizon') ? ['horizon'] : []),
    ...(e.createBackup ? ['zip'] : []),
    ...(e.createDhparam ? ['dhparam'] : []),
    ...(e.endpoint ? ['endpoint'] : []),
    ...(e.expert && e.postDeploy ? ['post-deploy'] : []),
  ];
}
