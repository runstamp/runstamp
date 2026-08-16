import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["__tests__/setup-deterministic.ts"],
    include: ["__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    // PDF/A, validation-repair, and streaming fixtures can exceed Vitest's
    // default 5s budget under the full prepublish suite load.
    testTimeout: 30000,
  },
});
