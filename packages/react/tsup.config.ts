import { copyFile, mkdir } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: false,
  sourcemap: true,
  treeshake: true,
  external: ["react", "react-dom", "@runstamp/contract", "@runstamp/pptx"],
  async onSuccess() {
    await mkdir("dist", { recursive: true });
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
