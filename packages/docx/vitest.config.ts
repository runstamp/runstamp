import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['__tests__/setup-deterministic.ts'],
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
