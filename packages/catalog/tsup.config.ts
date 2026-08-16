import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  platform: "neutral",
  target: "es2022",
  external: [/^@runstamp\//],
});
