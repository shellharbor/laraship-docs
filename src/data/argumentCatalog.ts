import { CLI_OPTION_MAP, sourceLink } from './upstream';

export type ArgumentScope = 'deploy' | 'update' | 'backup' | 'activate' | 'deactivate' | 'remove' | 'list' | 'python' | 'kubernetes';
export interface ArgumentEntry { scope: ArgumentScope; flag: string; values: string; default: string; description: string; configKey: string; source: string; location: string }
const aliases: Record<string, string> = { '--install-filament': '--with filament', '--use-redis': '--with redis', '--queue-worker': '--with queue', '--obtain-ssl': 'HTTPS on; default', '--bind-local': 'Always enforced', '--type': 'Legacy compatibility only' };
export const scopeNames: Record<ArgumentScope, [string, string]> = {
  deploy: ['Deployment', 'Развёртывание'], update: ['Update', 'Обновление'], backup: ['DB backups', 'Копии БД'],
  activate: ['Activate', 'Активация'], deactivate: ['Deactivate', 'Остановка'], remove: ['Remove', 'Удаление'],
  list: ['Project inventory', 'Список проектов'], python: ['Python adapter', 'Адаптер Python'], kubernetes: ['Kubernetes', 'Kubernetes'],
};
const row = (scope: ArgumentScope, flag: string, values: string, defaultValue: string, description: string, source: string): ArgumentEntry => ({ scope, flag, values, default: defaultValue, description, configKey: '—', source: sourceLink(source), location: scope === 'python' ? '#installation' : '#tools' });
export const ARGUMENT_CATALOG: ArgumentEntry[] = [
  ...CLI_OPTION_MAP.map(option => ({ scope: 'deploy' as const, flag: option.flag, values: option.values, default: option.default,
    description: `${option.description}. ${option.dependencies}${aliases[option.flag] ? `. Equivalent: ${aliases[option.flag]}` : ''}`,
    configKey: ['--config', '--dry-run', '--list-presets', '--list-modules', '--help', '--version', '--type'].includes(option.flag) ? '—' : option.flag.slice(2).replaceAll('-', '_').toUpperCase(),
    source: option.source, location: option.availability === 'tooling' && option.flag !== '--config' ? '#toolkit-inspection' : '#configure' })),
  row('deploy', '-h / -V', '—', '—', 'Aliases for --help / --version; early exit, without root.', 'deploy-laravel.sh'),
  ...[
    ['--slug', 'SLUG', 'required', 'Existing Git-backed project; stored branch, clean working tree and running PHP required.'],
    ['--no-migrate', 'switch', 'off', 'Skip migrations for this update only; unavailable during initial deployment.'],
    ['--post-deploy', 'single-line command', 'stored command', 'Replace this invocation’s stored hook; an explicit empty string suppresses it. Runs inside PHP.'],
    ['--reset', 'switch', 'off', 'Reset to remote branch, discarding local commit history; does not bypass tracked-file cleanliness checks.'],
    ['--force', 'switch', 'off', 'Update even if fetched commit is unchanged.'],
    ['--help / -h', '—', '—', 'Supported informational help without project lookup.'],
  ].map(([flag, values, def, text]) => row('update', flag, values, def, text, 'update.sh')),
  ...[
    ['--slug', 'SLUG', 'required', 'Project deployed with the backup module; reads generated .config/backup/dump.sh.'],
    ['now', 'action', 'one required', 'Create a logical DB dump now.'],
    ['list', 'action', 'one required', 'List dump files for this project.'],
    ['restore', 'FILE basename', 'one required', 'Replace database data with an existing dump from backups/. No path or .. substring.'],
    ['--yes', 'switch', 'off', 'Skip restore’s literal yes confirmation only after deliberate opt-in. Does not apply to remove.'],
    ['--help / -h', '—', '—', 'Supported help without project lookup.'],
  ].map(([flag, values, def, text]) => row('backup', flag, values, def, text, 'backup.sh')),
  row('activate', '--slug', 'SLUG', 'required', 'Build/start services and restore proxy routing; preserves DB volumes. No help/yes/config/force option.', 'activate.sh'),
  row('deactivate', '--slug', 'SLUG', 'required', 'Disable routing and remove containers; keeps project files and database volumes. No help/yes/config/force option.', 'deactivate.sh'),
  row('remove', '--slug', 'SLUG', 'required', 'Delete this project, containers, volumes, data and eligible ZIP. Interactive literal yes required; no --yes flag.', 'remove.sh'),
  row('remove', '--domain', 'DOMAIN', 'required', 'Recorded project domain for the removal interface.', 'remove.sh'),
  row('remove', '--db-root-password', 'server-only secret', 'native MySQL', 'Existing administrative password for native MySQL removal. Docker cannot remove a native-DB project.', 'remove.sh'),
  row('list', '(no arguments)', '—', '—', 'Inventory scans /var/www. No help, filter or JSON flags; UNKNOWN certificate status can mean unavailable inspection helper.', 'list-projects.sh'),
  ...[
    ['--help / -h', 'top-level or subcommand', '—', 'Adapter help; backend help goes after -- only where supported.'],
    ['--version', 'top-level', '—', 'Python package version, not installed toolkit version; no top-level -V.'],
    ['install --backend', 'native | docker', 'native', 'Download a release toolkit or pull the administrative image. Package installation alone does neither.'],
    ['install --version', 'X.Y.Z[-prerelease]', 'package release', 'Exact release spelling without v; no latest or ranges.'],
    ['install --directory', 'absolute new path', '/opt/laraship', 'Native install only: absent target, existing parent, no symlinks or ..; ignored by Docker installation.'],
    ['install --dry-run', 'switch', 'off', 'Preview installation without network or writes; still validates native target constraints.'],
    ['--backend', 'native | docker', 'native', 'Shared by deploy/update/backup/activate/deactivate/remove/list/toolkit-version.'],
    ['--directory', 'absolute path', '/opt/laraship', 'Installed native toolkit directory; ignored by Docker backend.'],
    ['--image', 'exact release tag or sha256 digest', 'package-version image', 'Docker administrative CLI image. Mutable latest and registry-host ports are unsupported by Python parser.'],
    ['--archive-dir', 'absolute path', '/var/backups/laraship', 'Docker archive directory and same-path writable bind; not the native archive setting.'],
    ['--mount-readonly', 'absolute file/directory; repeatable', 'none', 'Explicit extra Docker input at identical path. Must not hide runtime/server paths; Python CSV paths cannot contain commas/double quotes.'],
    ['--', 'separator', 'required before forwarded flags', 'Adapter arguments before it; unchanged backend argv after it. Toolkit-version accepts no forwarded arguments.'],
  ].map(([flag, values, def, text]) => row('python', flag, values, def, text, 'src/laraship/cli.py')),
  ...[
    ['render', 'mode', 'one required', 'Print Kubernetes JSON List offline; does not verify cluster state.'],
    ['deploy', 'mode', 'one required', 'Validate configuration, acquire Lease, run/wait for migration Job, then apply/wait for workloads.'],
    ['--help / -h', '—', '—', 'Kubernetes adapter help.'],
    ['--name', 'DNS label 1–40', 'required', 'Application/resource name.'],
    ['--namespace', 'DNS label 1–40', 'required', 'Existing target namespace; not created by the adapter.'],
    ['--configmap', 'DNS label 1–40', 'required', 'Existing versioned immutable configuration object.'],
    ['--secret', 'DNS label 1–40', 'required', 'Name of existing versioned immutable Secret containing APP_KEY/credentials; never its contents.'],
    ['--revision', 'DNS label 1–40', 'required', 'New release or explicit retry identity; migration Job identity also includes runtime contract.'],
    ['--image', 'application image with tag/digest', 'required', 'Laravel application image, separate from the administrative CLI image. Latest/untagged images refused.'],
    ['--context', 'kubeconfig identifier', 'required for deploy', 'Explicit target cluster context. Render accepts it without cluster contact.'],
    ['--replicas', 'integer 1–100', '2', 'Web replicas; multiple replicas require shared external session/cache/filesystem state.'],
    ['--worker', 'switch', 'off', 'Add queue-worker Deployment; disabled means desired worker replicas zero.'],
    ['--image-pull-secret', 'DNS label 1–40', 'none', 'Name of existing registry Secret.'],
    ['--readiness-path', '/[A-Za-z0-9/_-]*', '/up', 'Application HTTP readiness path, separate from internal liveness.'],
  ].map(([flag, values, def, text]) => row('kubernetes', flag, values, def, text, 'kubernetes/laraship.py')),
];
