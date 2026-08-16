import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { TEST_LICENSE_KEY, TEST_PUBLIC_KEY_PEM } from "../../scripts/test-license-fixture.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  define: {
    __RUNSTAMP_PUBLIC_KEY_V2__: JSON.stringify(TEST_PUBLIC_KEY_PEM),
  },
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(rootDir, "../../platform/app")}/`,
      },
      {
        find: "jszip",
        replacement: path.resolve(rootDir, "node_modules/jszip/lib/index.js"),
      },
      {
        find: "@runstamp/pptx",
        replacement: path.resolve(rootDir, "src/index.ts"),
      },
      {
        find: "@runstamp/pptx/engine",
        replacement: path.resolve(rootDir, "src/public/engine.ts"),
      },
      {
        find: "@runstamp/pptx/interpreter",
        replacement: path.resolve(rootDir, "src/public/interpreter.ts"),
      },
      {
        find: "@runstamp/pptx/validator",
        replacement: path.resolve(rootDir, "src/public/validator.ts"),
      },
      {
        find: "@runstamp/pptx/quality",
        replacement: path.resolve(rootDir, "src/public/quality.ts"),
      },
      {
        find: "@runstamp/pptx/renderer",
        replacement: path.resolve(rootDir, "src/public/renderer.ts"),
      },
      {
        find: "@runstamp/protocol/accessibility",
        replacement: path.resolve(rootDir, "../protocol/src/accessibility.ts"),
      },
      {
        find: "@runstamp/pvce",
        replacement: path.resolve(rootDir, "../pvce/src/index.ts"),
      },
      {
        find: "@runstamp/license",
        replacement: path.resolve(rootDir, "../license/src/index.ts"),
      },
      {
        find: "@runstamp/protocol",
        replacement: path.resolve(rootDir, "../protocol/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    env: {
      RUNSTAMP_LICENSE_KEY: TEST_LICENSE_KEY,
      RUNSTAMP_TEST_PUBLIC_KEY_V2: TEST_PUBLIC_KEY_PEM,
    },
    include: ["tests/package/**/*.test.ts"],
  },
});
