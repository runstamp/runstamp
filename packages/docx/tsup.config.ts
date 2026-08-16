import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "ops/index": "src/ops/index.ts",
    "ops/descriptor": "src/ops/descriptor.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "sharp",
    "@runstamp/pdf",
  ],
  noExternal: [
    // Bundle these server-side dependencies
    "jszip",
    "fast-xml-parser",
    "@runstamp/license",
    "@runstamp/extension-kit",
  ],
});
