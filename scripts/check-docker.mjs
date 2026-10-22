import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const runId = randomUUID();
if (!existsSync('tmp/upstream-laraship/deploy-laravel.sh')) {
  console.error('Pinned source fixture missing. Follow README upstream setup first.');
  process.exit(1);
}
let status = 1;
try {
  status = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/docker.test.ts'], {
    stdio: 'inherit', env: { ...process.env, LARASHIP_DOCKER_TEST: '1', LARASHIP_DOCKER_TEST_RUN: runId },
  }).status ?? 1;
} finally {
  const containers = spawnSync('docker', ['ps', '-aq', '--filter', `label=io.shellharbor.laraship-docs.test=${runId}`], { encoding: 'utf8' });
  const ids = containers.stdout?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (ids.length) spawnSync('docker', ['rm', '-f', ...ids], { stdio: 'inherit' });
}
process.exit(status);
