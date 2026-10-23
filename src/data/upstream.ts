import type { ModuleName, PresetName } from '../domain/wizardSchema';

export const UPSTREAM = {
  repository: 'https://github.com/shellharbor/laraship',
  commit: '4dfec97ae4c227fe35cf84f5ac5b5e65b18a1c30',
  version: '1.3.0', verified: '2026-10-23',
  laravelDefault: '13.0', laravelMinimum: '12.0',
  postgresImage: 'postgres:17', mysqlImage: 'mysql:8.4',
} as const;
export const sourceLink = (path: string) => `${UPSTREAM.repository}/blob/${UPSTREAM.commit}/${path}`;

// Docker Hub tag metadata and OCI labels checked on 2026-10-22. CLI, modules,
// presets, helpers and entrypoint are byte-identical to the source contract above.
export const CLI_IMAGE = {
  tag: 'shellharbor/laraship:1.3.0',
  reference: 'shellharbor/laraship@sha256:af97f0378afc5bd911a39d3af34b0a73836ccd1b4d4c052d552a643334fd1eca',
  revision: '4dfec97ae4c227fe35cf84f5ac5b5e65b18a1c30',
  platform: 'linux/amd64',
  verified: '2026-10-22',
  url: 'https://hub.docker.com/r/shellharbor/laraship',
} as const;

// presets/*.conf and modules/horizon.sh at UPSTREAM.commit.
export const PRESETS: Record<PresetName, { modules: ModuleName[]; basicAuth: boolean; upload: string; description: string }> = {
  'admin-panel': { modules: ['filament', 'redis', 'queue'], basicAuth: false, upload: '', description: 'Filament admin panel + Redis integration + queue worker. Loopback project ports.' },
  api: { modules: ['horizon', 'redis'], basicAuth: false, upload: '16M', description: 'Horizon + Redis integration + 16M PHP uploads. Loopback project ports.' },
  staging: { modules: ['redis'], basicAuth: true, upload: '', description: 'HTTP Basic Auth + Redis integration. Loopback project ports.' },
};
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
export const MODULES: ModuleName[] = ['filament', 'redis', 'queue', 'horizon', 'backup'];
export interface CliOption {
  flag: string; type: 'value' | 'boolean' | 'action'; values: string; default: string;
  availability: 'basic' | 'advanced' | 'expert' | 'server-only' | 'compatibility' | 'tooling';
  dependencies: string; description: string; source: string;
}
const option = (flag: string, type: CliOption['type'], values: string, defaultValue: string,
  availability: CliOption['availability'], dependencies: string, description: string,
  source = 'deploy-laravel.sh'): CliOption => ({ flag, type, values, default: defaultValue, availability, dependencies, description, source: sourceLink(source) });

// Complete parse_args + main action registry. UI intentionally omits secret input and legacy aliases.
export const CLI_OPTION_MAP: CliOption[] = [
  option('--slug', 'value', '^[A-Za-z0-9][A-Za-z0-9_-]*$; not nginxproxy (case-insensitive)', 'random; prepended to domain', 'basic', 'Required in wizard', 'Project folder and container prefix'),
  option('--domain', 'value', 'CLI: ^[A-Za-z0-9.-]+$; wizard: DNS hostname', 'required', 'basic', 'All deployments', 'Final DNS hostname'),
  option('--db-type', 'value', 'postgres | mysql', 'CLI: required; wizard: postgres', 'basic', 'All deployments', 'Database engine'),
  option('--laravel-version', 'value', 'X.Y >= 12.0; Basic: 12.0 | 13.0; Advanced: custom X.Y', '13.0', 'basic', 'New only', 'Laravel skeleton constraint ^X.Y'),
  option('--preset', 'value', 'admin-panel | api | staging (repeatable)', 'none', 'basic', 'Compatible combinations; api/admin-panel require New; queue conflicts with Horizon', 'Presets before config before CLI; emitted in registry order', 'presets/README.md'),
  option('--with', 'value', 'filament,redis,queue,horizon,backup', 'none', 'basic', 'Horizon requires Redis; no queue + Horizon; no Filament/Horizon + repo', 'Additive module list', 'modules/README.md'),
  option('--repo', 'value', 'CLI: http(s), ssh, git, file, SCP; wizard: HTTPS/SSH/SCP; Advanced opt-in: HTTP/git/local file', 'none', 'basic', 'No embedded credentials, Laravel version, Filament or Horizon', 'Existing Laravel application'),
  option('--branch', 'value', '^[A-Za-z0-9][A-Za-z0-9._/-]*$', 'repository default', 'advanced', 'Repo', 'Git branch'),
  option('--deploy-key', 'value', 'existing server file path', 'none', 'advanced', 'SSH repo; browser cannot check existence', 'Read-only SSH deploy key path'),
  option('--db-native', 'boolean', 'true', 'false', 'basic', 'Running host database', 'Use local host DB, not a cloud database'),
  ...(['postgres', 'mysql'] as const).flatMap(db => [
    option(`--db-${db}-name`, 'value', `[A-Za-z0-9_][A-Za-z0-9_-]*; max ${db === 'postgres' ? 63 : 64}`, 'generated', 'advanced', db, 'Database name'),
    option(`--db-${db}-user`, 'value', `[A-Za-z0-9_][A-Za-z0-9_-]*; max ${db === 'postgres' ? 63 : 32}`, 'generated', 'advanced', `${db}; container MySQL user cannot be root`, 'Application DB user'),
    option(`--db-${db}-password`, 'value', 'no controls; container MySQL: no quotes/backslashes', 'generated', 'server-only', db, 'Set privately on server'),
  ]),
  option('--db-mysql-root-password', 'value', 'no controls/quotes/backslashes', 'generated', 'server-only', 'Container MySQL', 'Container root password'),
  option('--db-root-password', 'value', 'no control characters', 'required', 'server-only', 'Native MySQL only', 'Wizard exports marked placeholder; CLI argument visible in ps/history'),
  ...(['http', 'https', 'php', 'redis', 'postgres', 'mysql'] as const).map((port, index) =>
    option(`--port-${port}`, 'value', '1–65535; unique; project ports cannot be 80/443', ['8100–8400', '4100–4300', '9100–9600', '6500–6800', '5500–5800; native: 5432', '3400–3600; native: 3306'][index], 'advanced', `${port}; native DB port is a listener, not a publish`, 'Host port; occupancy checked only on server')),
  option('--ssl-email', 'value', 'nonempty in CLI; email format in wizard', 'required with HTTPS', 'basic', 'HTTPS', 'ACME contact'),
  option('--no-ssl', 'boolean', 'true', 'false', 'basic', 'HTTP warning', 'Skip certificate issuance'),
  option('--filament-email', 'value', 'nonempty in CLI; email format in wizard', 'required', 'basic', 'Filament', 'Provisioned administrator email', 'modules/filament.sh'),
  option('--filament-name', 'value', 'single line', 'generated', 'advanced', 'Filament', 'Administrator display name'),
  option('--filament-password', 'value', 'no controls', 'generated', 'server-only', 'Filament', 'Administrator password'),
  option('--redis-password', 'value', 'no controls', 'generated', 'server-only', 'Redis container exists in base stack', 'Redis password'),
  option('--backup-keep', 'value', 'integer 1–3650', '7', 'basic', 'backup module', 'DB dump retention days', 'modules/backup.sh'),
  option('--create-backup', 'boolean', 'true', 'false', 'advanced', 'No DB data/certificates', 'One-time project ZIP in /tmp'),
  option('--create-dhparam', 'boolean', 'true', 'false', 'advanced', 'Project nginx only; may take minutes', 'Project-local 2048-bit DH parameters'),
  option('--enable-basic-auth', 'boolean', 'true', 'false', 'basic', 'Locked on by staging', 'Additional HTTP Basic Auth'),
  option('--auth-user', 'value', '^[A-Za-z0-9][A-Za-z0-9_.@-]*$', 'generated', 'advanced', 'Basic Auth', 'Basic Auth username'),
  option('--auth-password', 'value', 'no controls', 'generated', 'server-only', 'Basic Auth', 'Basic Auth password'),
  option('--php-upload-max', 'value', '^[0-9]+[KMGkmg]?$', 'PHP 2M/8M; api preset 16M', 'basic', 'Explicit override only', 'PHP upload and post size'),
  option('--endpoint', 'value', 'absolute HTTPS URL; HTTP with explicit opt-in; no whitespace/credentials', 'none', 'advanced', 'Explicit consent; sends generated project credentials', 'Server-side PUT notification', 'lib/endpoint.py'),
  option('--allow-insecure-endpoint', 'boolean', 'true', 'false', 'advanced', 'Explicit consent; enables HTTP for both legacy and completion endpoints', 'Allow plaintext project data and credentials'),
  option('--post-deploy', 'value', 'one line', 'none', 'expert', 'Explicit code execution consent', 'Shell code inside PHP container; reruns on repo updates'),
  option('--on-complete', 'value', 'absolute executable file path; no symlinks or ..', 'none', 'advanced', 'Trusted owner and parent permissions; explicit code execution consent', 'Final JSON on stdin; runs as deploy user, inside CLI container for Docker', 'docs/COMPLETION.md'),
  option('--completion-endpoint', 'value', 'absolute HTTPS URL; HTTP with explicit opt-in; no credentials/whitespace', 'none', 'advanced', 'Explicit consent; deployment only', 'Final JSON POST on success, operational failure or handled cancellation', 'docs/COMPLETION.md'),
  option('--completion-token-file', 'value', 'absolute private file path', 'none', 'advanced', 'Completion endpoint; invoking user owns file, mode 600 or stricter', 'Bearer token is read on server; never entered in browser', 'docs/COMPLETION.md'),
  option('--completion-timeout', 'value', 'integer 1–300 seconds', '30', 'advanced', 'At least one completion target', 'Per-target delivery timeout; errors preserve deployment exit status', 'docs/COMPLETION.md'),
  option('--completion-include-secrets', 'boolean', 'true', 'false', 'advanced', 'Explicit opt-in; applies to both completion targets', 'Include known application passwords; never DB root passwords, tokens, SSH keys or .env', 'docs/COMPLETION.md'),
  option('--config', 'value', 'readable KEY=VALUE file', 'none', 'tooling', 'Once; never sourced; chmod 600', 'Downloadable non-secret config'),
  ...['--dry-run', '--list-presets', '--list-modules', '--help', '--version'].map(flag => option(flag, 'action', 'none', 'none', 'tooling', 'No root needed', 'Inspect without deployment')),
  ...['--type', '--bind-local', '--obtain-ssl', '--install-filament', '--use-redis', '--queue-worker'].map(flag => option(flag, flag === '--type' ? 'value' : 'boolean', flag === '--type' ? 'laravel' : 'true', flag === '--type' ? 'laravel' : ['--bind-local', '--obtain-ssl'].includes(flag) ? 'true' : 'false', 'compatibility', 'Never emitted by wizard', 'Supported compatibility option')),
];
