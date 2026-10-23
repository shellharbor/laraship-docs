import type { WizardConfig } from './wizardSchema';

export const SECRET_OPTIONS = [
  { key: 'db-postgres-password', placeholder: '<POSTGRES_PASSWORD>', en: 'PostgreSQL password', ru: 'Пароль PostgreSQL' },
  { key: 'db-mysql-password', placeholder: '<MYSQL_PASSWORD>', en: 'MySQL application password', ru: 'Пароль приложения MySQL' },
  { key: 'db-mysql-root-password', placeholder: '<MYSQL_CONTAINER_ROOT_PASSWORD>', en: 'MySQL container root password', ru: 'Root-пароль контейнера MySQL' },
  { key: 'redis-password', placeholder: '<REDIS_PASSWORD>', en: 'Redis password', ru: 'Пароль Redis' },
  { key: 'filament-password', placeholder: '<FILAMENT_PASSWORD>', en: 'Custom Filament administrator password', ru: 'Свой пароль администратора Filament' },
  { key: 'auth-password', placeholder: '<BASIC_AUTH_PASSWORD>', en: 'Custom HTTP Basic Auth password', ru: 'Свой пароль HTTP Basic Auth' },
] as const;
export type SecretOption = typeof SECRET_OPTIONS[number]['key'];
export function applicableSecrets(config: WizardConfig) {
  return SECRET_OPTIONS.filter(({ key }) => key === 'redis-password' ||
    key === `db-${config.dbType}-password` ||
    key === 'db-mysql-root-password' && config.dbType === 'mysql' && config.dbLocation === 'docker' ||
    key === 'filament-password' && config.modules.includes('filament') ||
    key === 'auth-password' && config.basicAuth);
}
