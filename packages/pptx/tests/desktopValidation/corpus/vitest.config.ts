import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import baseConfig from "../../../vitest.config.js";

const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export default defineConfig({
  ...baseConfig,
  root: coreRoot,
  test: {
    ...baseConfig.test,
    include: [
      "tests/desktopValidation/corpus.test.ts",
      "tests/desktopValidation/googleSlidesAuth.test.ts",
    ],
    exclude: [],
    testTimeout: 120_000,
  },
});
