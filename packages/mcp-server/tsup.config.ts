import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  platform: "node",
  target: "node18",
  external: [
    "@modelcontextprotocol/sdk",
    "@runstamp/catalog",
    "@runstamp/contract",
    "@runstamp/docx",
    "@runstamp/pdf",
    "@runstamp/pptx",
    "@runstamp/xlsx",
    "zod",
  ],
});
