import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/ops/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  outDir: "dist",
});
