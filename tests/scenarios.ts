import { initialConfig, type WizardConfig } from '../src/domain/wizardSchema';

export function scenario(overrides: Partial<WizardConfig> = {}): WizardConfig {
  return { ...structuredClone(initialConfig), slug: 'testapp', domain: 'app.example.com', sslEmail: 'operator@example.com', ...overrides };
}
export const scenarios: [string, Partial<WizardConfig>, string[]][] = [
  ['minimal PostgreSQL Docker', {}, ['Database:     postgres, in a container', 'Modules:      none', 'Source:       fresh Laravel ^13.0']],
  ['MySQL Docker with custom identity', { dbType: 'mysql', dbNames: { postgres: { name: '', user: '' }, mysql: { name: 'app_db', user: 'app_user' } } }, ['Database:     mysql, in a container']],
  ['PostgreSQL native', { dbLocation: 'native', ports: { ...initialConfig.ports, postgres: '5432' } }, ['Database:     postgres, native on the host']],
  ['MySQL native template', { dbType: 'mysql', dbLocation: 'native' }, ['Database:     mysql, native on the host']],
  ['admin panel preset', { presets: ['admin-panel'], filamentEmail: 'admin@example.com' }, ['Modules:      filament, redis, queue', 'Presets:      admin-panel']],
  ['API preset', { presets: ['api'] }, ['Modules:      redis, horizon', 'PHP uploads:  upload_max_filesize = post_max_size = 16M']],
  ['staging preset', { presets: ['staging'] }, ['Basic Auth:   on', 'Modules:      redis']],
  ['admin panel and staging presets', { presets: ['admin-panel', 'staging'], filamentEmail: 'admin@example.com' }, ['Presets:      admin-panel, staging', 'Modules:      filament, redis, queue', 'Basic Auth:   on']],
  ['API and staging presets', { presets: ['staging', 'api'] }, ['Presets:      api, staging', 'Modules:      redis, horizon', 'Basic Auth:   on', 'PHP uploads:  upload_max_filesize = post_max_size = 16M']],
  ['combined presets with explicit overrides', { presets: ['api', 'staging'], modules: ['backup'], phpUploadMax: '256M' }, ['Presets:      api, staging', 'Basic Auth:   on', 'PHP uploads:  upload_max_filesize = post_max_size = 256M', 'DB dumps:     daily, kept 7 days']],
  ['existing repository with staging', { source: 'existing', repo: 'https://github.com/acme/app.git', presets: ['staging'] }, ['Presets:      staging', 'Basic Auth:   on', 'Source:       existing application']],
  ['Horizon dependency', { modules: ['horizon'] }, ['Modules:      redis, horizon']],
  ['database backups and ZIP', { modules: ['backup'], backupKeep: '14', createBackup: true }, ['DB dumps:     daily, kept 14 days', 'Backup:       zip in /tmp after the deployment']],
  ['existing HTTPS repository', { source: 'existing', repo: 'https://github.com/acme/app.git', branch: 'main' }, ['Source:       existing application https://github.com/acme/app.git (main)']],
  ['existing SSH repository', { source: 'existing', repo: 'git@github.com:acme/app.git' }, ['Source:       existing application git@github.com:acme/app.git']],
  ['HTTP without certificate email', { https: false, sslEmail: '' }, ['SSL:          not requested (--no-ssl)']],
  ['all explicit ports', { ports: { http: '8150', https: '4150', php: '9150', redis: '6550', postgres: '5550', mysql: '' } }, ['Ports:        published on 127.0.0.1 only']],
  ['preset overrides and additive modules', { presets: ['api'], modules: ['filament', 'backup'], filamentEmail: 'admin@example.com', phpUploadMax: '256M' }, ['PHP uploads:  upload_max_filesize = post_max_size = 256M']],
  ['Laravel 12 and advanced hook', { laravelVersion: '12.0', expert: true, postDeploy: "printf '%s' '$literal; value'", postDeployConsent: true, createDhparam: true, basicAuth: true, authUser: 'staging-user' }, ['Source:       fresh Laravel ^12.0', 'Post-deploy:  set']],
];
