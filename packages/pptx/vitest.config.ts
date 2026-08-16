import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "jszip", replacement: path.resolve(rootDir, "node_modules/jszip/lib/index.js") },
      { find: "@runstamp/pptx/engine", replacement: path.resolve(rootDir, "src/public/engine.ts") },
      { find: "@runstamp/pptx/interpreter", replacement: path.resolve(rootDir, "src/public/interpreter.ts") },
      { find: "@runstamp/pptx/validator", replacement: path.resolve(rootDir, "src/public/validator.ts") },
      { find: "@runstamp/pptx/quality", replacement: path.resolve(rootDir, "src/public/quality.ts") },
      { find: "@runstamp/pptx/renderer", replacement: path.resolve(rootDir, "src/public/renderer.ts") },
      { find: "@runstamp/pptx", replacement: path.resolve(rootDir, "src/index.ts") },
      { find: "@runstamp/pptx-extractor", replacement: path.resolve(rootDir, "../pptx-extractor/src/index.ts") },
      { find: "@runstamp/protocol/accessibility", replacement: path.resolve(rootDir, "../protocol/src/accessibility.ts") },
      { find: "@runstamp/pdf", replacement: path.resolve(rootDir, "../pdf/src/index.ts") },
      { find: "@runstamp/pvce", replacement: path.resolve(rootDir, "../pvce/src/index.ts") },
      { find: "@runstamp/protocol", replacement: path.resolve(rootDir, "../protocol/src/index.ts") },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    testTimeout: 15_000,
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/package/**/*.test.ts",
      "tests/renderToPdf.test.ts",
      "tests/structuralOrder.test.ts",
      "tests/templateImportSourceMode.test.ts",
      "tests/visualHarnessWiring.test.ts",
      "tests/visualRegression.test.ts",
      "tests/previewFidelity.test.ts",
      "tests/renderer.test.ts",
      "tests/canvasText.test.ts",
      "tests/desktopValidation/**/*.test.ts",
      "tests/launchMatrix/**/*.test.ts",
      "tests/sota*.test.ts",
      "tests/qualityBenchmarks.test.ts",
      "tests/qualityStress.test.ts",
      "tests/deterministic.test.ts",
      "tests/v1LegacyRoute.test.ts",
      "tests/docs-smoke.test.ts",
      "tests/legacyValidationHonesty.test.ts",
      "tests/mcpV2Tools.test.ts",
      "tests/protocolV2.test.ts",
      "tests/reliabilityContract.test.ts",
      "tests/uxGaps.test.ts",
      "tests/v2GuardrailAndBrandPack.test.ts",
      "tests/v2Normalization.test.ts",
      "tests/v2RouteContracts.test.ts",
      "tests/v2ContentGuard.test.ts",
      "tests/v3RouteContracts.test.ts",
      "tests/v3WorkflowRuntime.test.ts",
      "tests/validationRecordStore.test.ts",
      "tests/windowsWorkerClient.test.ts",
      "tests/ghostGrid.test.ts",
    ],
  },
});
