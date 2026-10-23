import { generate } from './generate';
import { defaultExecution, executionIssues, type ExecutionSettings } from './execution';
import { usesDocker, type Runner } from './runner';
import { validate, validateRunner } from './validate';
import type { Issue, WizardConfig } from './wizardSchema';

const runners: Runner[] = ['bash', 'docker', 'python-native', 'python-docker'];

/** Validate each entrypoint independently; never substitute a different runner's command. */
export function deploymentVariants(config: WizardConfig, settings: ExecutionSettings = defaultExecution) {
  const common = validate(config);
  return runners.map(runner => {
    const issues: Issue[] = [
      ...common,
      ...(config.dbLocation === 'native' && usesDocker(runner) ? [{ field: 'dbLocation', step: 2, code: 'native-docker', message: 'Docker runners cannot provision a native database. Choose a container database or use Bash / Python native.' }] : []),
      ...validateRunner(config, runner, settings),
      ...executionIssues(settings, runner).map(message => ({ field: 'execution', step: 4, code: 'execution', message })),
    ];
    return { runner, issues, result: issues.length ? null : generate(config, runner, settings) };
  });
}
