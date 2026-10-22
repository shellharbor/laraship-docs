import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const directory = process.env.LARASHIP_UPSTREAM_DIR || 'tmp/upstream-laraship';
if (!existsSync(`${directory}/deploy-laravel.sh`)) {
  console.error('Pinned source missing. Follow README upstream test setup; no source is fetched or executed automatically.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/upstream.test.ts'], {
  stdio: 'inherit', env: { ...process.env, LARASHIP_UPSTREAM_TEST: '1' },
});
process.exit(result.status ?? 1);
