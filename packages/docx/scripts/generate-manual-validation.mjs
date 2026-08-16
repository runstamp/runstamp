import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(
  pnpmCommand,
  ['exec', 'vitest', 'run', '__tests__/manual-validation-pack.test.ts'],
  {
    cwd: packageDir,
    env: {
      ...process.env,
      DOCX_GENERATE_MANUAL_VALIDATION: '1',
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const normalizeResult = spawnSync(
  pnpmCommand,
  ['exec', 'tsx', 'scripts/normalize-manual-validation-pack.mts'],
  {
    cwd: packageDir,
    env: process.env,
    stdio: 'inherit',
  },
);

if (normalizeResult.error) {
  throw normalizeResult.error;
}

process.exit(normalizeResult.status ?? 1);
