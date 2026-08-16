import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/ops/index.ts", "src/ops/descriptor.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  clean: true,
  outDir: "dist",
});
