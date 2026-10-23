import { defaultExecution, executionIssues, type ExecutionSettings } from './execution';
import { effectiveConfig } from './constraints';
import type { WizardConfig } from './wizardSchema';
import { SERVER_MOUNTS } from './runner';
import { shellQuote } from './shellQuote';
import { localRepoPath, validate, validateRunner } from './validate';

/** An operator tools service; this is not an application workload or a background deployer. */
export function composeTool(config: WizardConfig, settings: ExecutionSettings = defaultExecution) {
  const problems = [...validate(config).map(issue => issue.message), ...validateRunner(config, 'docker', settings).map(issue => issue.message), ...executionIssues(settings, 'docker')];
  if (problems.length) throw new Error(problems.join('\n'));
  const e = effectiveConfig(config);
  const readonly = [...new Set([settings.configPath, ...settings.readonlyMounts,
    ...(e.source === 'existing' ? [e.deployKey, localRepoPath(e.repo)].filter(Boolean) : []),
    ...(e.completionEnabled ? [e.onComplete, e.completionTokenFile].filter(Boolean) : [])])];
  const binds = (path: string, readOnly = false) => [
    '      - type: bind', `        source: ${JSON.stringify(path)}`, `        target: ${JSON.stringify(path)}`,
    ...(readOnly ? ['        read_only: true'] : []), '        bind:', '          create_host_path: false',
  ];
  const yaml = ['services:', '  laraship:', `    image: ${JSON.stringify(settings.image)}`, '    profiles: [tools]', '    user: "0:0"', '    init: true',
    '    restart: "no"', '    network_mode: host', '    stdin_open: true', '    tty: true',
    `    stop_grace_period: ${2 * (e.completionEnabled ? +e.completionTimeout : 30) + 15}s`, '    environment:',
    `      LARASHIP_ARCHIVE_DIR: ${JSON.stringify(settings.archiveDir)}`, '    volumes:',
    ...SERVER_MOUNTS.flatMap(path => binds(path === defaultExecution.archiveDir ? settings.archiveDir : path)),
    ...readonly.flatMap(path => binds(path, true)), '    command: ["--help"]', ''].join('\n');
  const base = 'sudo docker compose --file /path/to/compose.yaml --profile tools';
  return { yaml, command: `${base} config --quiet\n${base} pull laraship\n${base} run --rm laraship deploy --dry-run --config ${shellQuote(settings.configPath)}\n${base} run --rm laraship deploy --config ${shellQuote(settings.configPath)}` };
}
