import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { defineConfig, type Options } from "tsup";

const shared = {
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: false,
  sourcemap: true,
  treeshake: true,
  external: ["react", "react-dom", "@runstamp/contract", "@runstamp/pptx"],
} satisfies Options;

export default defineConfig([{
  entry: {
    index: "src/index.ts",
  },
  ...shared,
  async onSuccess() {
    await mkdir("dist", { recursive: true });
    const clientEntry = await readFile("dist/index.js", "utf8");
    if (!clientEntry.startsWith('"use client";')) {
      await writeFile("dist/index.js", `"use client";\n${clientEntry}`);
    }
    await copyFile("src/styles.css", "dist/styles.css");
  },
}, {
  entry: {
    server: "src/server.ts",
  },
  ...shared,
}]);
