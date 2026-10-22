export type ModuleName = 'filament' | 'redis' | 'queue' | 'horizon' | 'backup';
export type PresetName = 'admin-panel' | 'api' | 'staging';
export type PortName = 'http' | 'https' | 'php' | 'redis' | 'postgres' | 'mysql';
export interface WizardConfig {
  source: 'new' | 'existing';
  laravelVersion: '13.0' | '12.0';
  presets: PresetName[];
  repo: string;
  branch: string;
  deployKey: string;
  slug: string;
  domain: string;
  https: boolean;
  sslEmail: string;
  dbType: 'postgres' | 'mysql';
  dbLocation: 'docker' | 'native';
  dbNames: Record<'postgres' | 'mysql', { name: string; user: string }>;
  modules: ModuleName[];
  filamentEmail: string;
  filamentName: string;
  backupKeep: string;
  basicAuth: boolean;
  authUser: string;
  phpUploadMax: string;
  ports: Record<PortName, string>;
  createBackup: boolean;
  createDhparam: boolean;
  endpoint: string;
  endpointConsent: boolean;
  expert: boolean;
  postDeploy: string;
  postDeployConsent: boolean;
}
export const initialConfig: WizardConfig = {
  source: 'new', laravelVersion: '13.0', presets: [], repo: '', branch: '', deployKey: '',
  slug: '', domain: '', https: true, sslEmail: '', dbType: 'postgres', dbLocation: 'docker',
  dbNames: { postgres: { name: '', user: '' }, mysql: { name: '', user: '' } },
  modules: [], filamentEmail: '', filamentName: '', backupKeep: '7', basicAuth: false,
  authUser: '', phpUploadMax: '', ports: { http: '', https: '', php: '', redis: '', postgres: '', mysql: '' },
  createBackup: false, createDhparam: false, endpoint: '', endpointConsent: false,
  expert: false, postDeploy: '', postDeployConsent: false,
};
export interface Issue { field: string; code: string; message: string; step: number }
