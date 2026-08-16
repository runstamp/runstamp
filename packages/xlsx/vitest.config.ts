import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
  },
  resolve: {
    alias: {
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["__tests__/setup-deterministic.ts"],
    include: ["__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 10000,
    env: {
    },
  },
});
