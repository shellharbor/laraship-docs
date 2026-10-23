import { CLI_OPTION_MAP } from './upstream';

const groups = [
  ['--laravel-version', '--preset', '--repo', '--branch', '--deploy-key', '--type'],
  ['--slug', '--domain', '--ssl-email', '--no-ssl', '--obtain-ssl'],
  ['--db-type', '--db-native', '--db-postgres-name', '--db-postgres-user', '--db-postgres-password', '--db-mysql-name', '--db-mysql-user', '--db-mysql-password', '--db-mysql-root-password', '--db-root-password', '--port-postgres', '--port-mysql'],
  ['--with', '--filament-email', '--filament-name', '--filament-password', '--redis-password', '--backup-keep', '--install-filament', '--use-redis', '--queue-worker'],
  ['--port-http', '--port-https', '--port-php', '--port-redis', '--create-backup', '--create-dhparam', '--enable-basic-auth', '--auth-user', '--auth-password', '--php-upload-max', '--endpoint', '--allow-insecure-endpoint', '--post-deploy', '--on-complete', '--completion-endpoint', '--completion-token-file', '--completion-timeout', '--completion-include-secrets', '--config', '--dry-run', '--help', '--version', '--list-modules', '--list-presets', '--bind-local'],
] as const;
const targets: Record<string, string> = {
  '--obtain-ssl': '--no-ssl', '--install-filament': '--with', '--use-redis': '--with', '--queue-worker': '--with',
  '--bind-local': '--port-http', '--dry-run': '--help', '--version': '--help', '--list-modules': '--help', '--list-presets': '--help',
};
export const WIZARD_ARGUMENTS = [
  ...CLI_OPTION_MAP.map(option => {
    const step = groups.findIndex(group => (group as readonly string[]).includes(option.flag));
    if (step < 0) throw new Error(`Missing wizard location for ${option.flag}`);
    return { flag: option.flag, description: option.description, step, target: targets[option.flag] || option.flag };
  }),
  ...[
    ['--backend', 'Python execution backend, selected with the runner'], ['--directory', 'Native toolkit directory'],
    ['--image', 'Administrative Docker CLI image'], ['--archive-dir', 'Docker project archive directory'], ['--mount-readonly', 'Additional read-only server inputs'],
  ].map(([flag, description]) => ({ flag, description, step: 4, target: flag })),
];
