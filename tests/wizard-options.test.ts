import { describe, expect, it } from 'vitest';
import { WIZARD_ARGUMENTS } from '../src/data/wizardArguments';
import { CLI_OPTION_MAP } from '../src/data/upstream';
import { validate } from '../src/domain/validate';
import { scenario } from './scenarios';

describe('complete wizard option routing', () => {
  it('routes every deployment argument and keeps lifecycle flags out of a deploy form', () => {
    for (const option of CLI_OPTION_MAP) expect(WIZARD_ARGUMENTS.find(entry => entry.flag === option.flag)?.step).toBeGreaterThanOrEqual(0);
    expect(new Set(WIZARD_ARGUMENTS.map(entry => entry.flag)).size).toBe(WIZARD_ARGUMENTS.length);
    for (const flag of ['--reset', '--no-migrate', '--yes', '--namespace']) expect(WIZARD_ARGUMENTS.some(entry => entry.flag === flag)).toBe(false);
    for (const entry of WIZARD_ARGUMENTS) expect(entry.step).toBeLessThan(5);
  });
  it('finds both engine identities on the Database step and adapter inputs inside Fine-tuning', () => {
    for (const flag of ['--db-postgres-name', '--db-postgres-user', '--db-mysql-name', '--db-mysql-user', '--port-postgres', '--port-mysql']) expect(WIZARD_ARGUMENTS.find(entry => entry.flag === flag)?.step).toBe(2);
    for (const flag of ['--backend', '--directory', '--image', '--archive-dir', '--mount-readonly', '--config']) expect(WIZARD_ARGUMENTS.find(entry => entry.flag === flag)?.step).toBe(4);
  });
  it('routes equivalent aliases and inspection actions to the correct controls', () => {
    expect(WIZARD_ARGUMENTS.find(entry => entry.flag === '--obtain-ssl')?.target).toBe('--no-ssl');
    expect(WIZARD_ARGUMENTS.find(entry => entry.flag === '--queue-worker')?.target).toBe('--with');
    expect(WIZARD_ARGUMENTS.find(entry => entry.flag === '--list-presets')?.target).toBe('--help');
  });
  it.each(['postgres', 'mysql'] as const)('shows %s port errors on its editable Database step', dbType => {
    const config = scenario({ dbType });
    for (const port of ['65536', '80', '9150']) {
      const issues = validate({ ...config, ports: { ...config.ports, php: '9150', [dbType]: port } });
      expect(issues.find(issue => issue.field === `port-${dbType}`)?.step).toBe(2);
    }
    expect(validate({ ...config, ports: { ...config.ports, http: '8150', php: '8150' } }).find(issue => issue.code === 'duplicate-port')?.step).toBe(4);
  });
});
