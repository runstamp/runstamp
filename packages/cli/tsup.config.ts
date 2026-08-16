import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  platform: "node",
  target: "node20",
  external: [
    "@runstamp/catalog",
    "@runstamp/docx",
    "@runstamp/pdf",
    "@runstamp/pptx",
    "@runstamp/xlsx",
  ],
});
