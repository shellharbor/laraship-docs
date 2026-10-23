import { CLI_IMAGE } from '../data/upstream';
import type { Runner } from './runner';

export interface ExecutionSettings {
  directory: string;
  configPath: string;
  image: string;
  imageConsent: boolean;
  archiveDir: string;
  nativeArchiveDir: string;
  readonlyMounts: string[];
}
export const defaultExecution: ExecutionSettings = {
  directory: '/opt/laraship', configPath: '/path/to/deploy.config', image: CLI_IMAGE.reference,
  imageConsent: false, archiveDir: '/var/backups/laraship', nativeArchiveDir: '', readonlyMounts: [],
};
export const singleLine = (value: string) => !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
export const absolutePath = (value: string) => singleLine(value) && value.startsWith('/') && !value.startsWith('//') && !value.endsWith('/') && !value.split('/').some(part => part === '..' || part === '.');
const protectedPaths = ['/var/www', '/run/lock/laraship', '/var/run/docker.sock', '/opt/laraship', '/usr', '/bin', '/etc'];
export const shadows = (path: string, target: string) => path === target || target.startsWith(`${path}/`);
export const validCliImage = (value: string) => /^(?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/)*[a-z0-9]+(?:[._-][a-z0-9]+)*(?:@sha256:[0-9a-f]{64}|:[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?)$/.test(value);
export function executionIssues(settings: ExecutionSettings, target?: Runner | 'kubernetes-bash' | 'kubernetes-docker'): string[] {
  const issues: string[] = [];
  const all = target === undefined;
  const kube = target?.startsWith('kubernetes-');
  const docker = all || target?.endsWith('docker');
  const native = all || target === 'bash' || target === 'python-native' || target === 'kubernetes-bash';
  const paths = [...(native ? [['Toolkit directory', settings.directory]] : []), ...(!kube ? [['Config path', settings.configPath]] : []), ...(docker && !kube ? [['Docker archive directory', settings.archiveDir]] : []), ...(native && !kube ? [['Native archive directory', settings.nativeArchiveDir]] : [])];
  for (const [label, value] of paths) {
    if (!value && label === 'Native archive directory') continue;
    if (!absolutePath(value)) issues.push(`${label}: use an absolute path without control characters, . or .. components.`);
  }
  if (docker && !validCliImage(settings.image)) issues.push('CLI image: use an exact release tag or lowercase SHA-256 digest, not latest.');
  if (docker && settings.image !== CLI_IMAGE.reference && !settings.imageConsent) issues.push('Confirm that you trust the custom administrative CLI image and have checked its compatibility.');
  if (docker && !kube && protectedPaths.some(path => shadows(settings.archiveDir, path) || shadows(path, settings.archiveDir))) issues.push('Docker archives must be separate from toolkit, system and server mount paths.');
  if (docker && !kube && [...protectedPaths, settings.archiveDir].some(path => shadows(settings.configPath, path))) issues.push('Config input must not hide toolkit, system, archive or server mount paths.');
  if (docker && !kube && settings.readonlyMounts.length > 20) issues.push('Use at most 20 additional read-only inputs.');
  for (const path of docker && !kube ? settings.readonlyMounts : []) {
    if (!absolutePath(path) || [...protectedPaths, settings.directory, settings.archiveDir].some(target => shadows(path, target))) issues.push('Read-only inputs need absolute paths and must not hide toolkit, system or server mount paths.');
  }
  if (target === 'python-docker' && [settings.configPath, settings.archiveDir, ...settings.readonlyMounts].some(path => /[,"\r\n]/.test(path))) issues.push('Python Docker mount paths cannot contain commas or double quotes.');
  if (target === 'python-native' && settings.directory.includes(',')) issues.push('Python native toolkit directory cannot contain commas.');
  return [...new Set(issues)];
}
