import { PRESETS, MODULES } from '../data/upstream';
import type { ModuleName, WizardConfig } from './wizardSchema';

export function effectiveConfig(config: WizardConfig) {
  const preset = PRESETS[config.preset];
  const selected = new Set([...preset.modules, ...config.modules]);
  if (selected.has('horizon')) selected.add('redis');
  return { ...config, modules: MODULES.filter(module => selected.has(module)),
    basicAuth: config.basicAuth || preset.basicAuth,
    phpUploadMax: config.phpUploadMax || preset.upload };
}
export function moduleLock(config: WizardConfig, module: ModuleName): 'preset' | 'dependency' | 'conflict' | 'source' | undefined {
  const effective = effectiveConfig(config);
  if (config.source === 'existing' && (module === 'filament' || module === 'horizon')) return 'source';
  if (PRESETS[config.preset].modules.includes(module)) return 'preset';
  if (module === 'redis' && effective.modules.includes('horizon')) return 'dependency';
  if ((module === 'queue' && effective.modules.includes('horizon')) ||
    (module === 'horizon' && effective.modules.includes('queue'))) return 'conflict';
}
export function changeSource(config: WizardConfig, source: WizardConfig['source']): WizardConfig {
  return source === 'new' ? { ...config, source } : {
    ...config, source, preset: ['admin-panel', 'api'].includes(config.preset) ? 'none' : config.preset,
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
