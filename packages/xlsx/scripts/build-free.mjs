#!/usr/bin/env node
/**
 * Free build: @runstamp/xlsx (Apache-2.0)
 *
 * - No public key, no license validation code
 * - Unminified with sourcemaps
 */

import { build } from "esbuild";
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");
const distDir = resolve(pkgDir, "dist");
const entryTypesPath = resolve(distDir, "index.d.ts");
const generatedTypesRoot = resolve(distDir, "xlsx", "src");
const sourceLoaderPath = resolve(pkgDir, "src/workers/source-js-extension-loader.mjs");

// Generate type declarations
console.log("Generating type declarations...");
execSync("tsc --emitDeclarationOnly --outDir dist", { stdio: "inherit", cwd: pkgDir });

const generatedEntryTypesPath = resolve(distDir, "xlsx/src/index.d.ts");
if (existsSync(generatedEntryTypesPath)) {
  cpSync(generatedEntryTypesPath, entryTypesPath);
}

if (existsSync(generatedTypesRoot)) {
  cpSync(generatedTypesRoot, distDir, { recursive: true });
  rmSync(resolve(distDir, "xlsx"), { recursive: true, force: true });
}

execSync([
  "node ../../scripts/bundle-declarations.mjs",
  "dist/index.d.ts:dist/index.d.ts",
  "dist/ops/index.d.ts:dist/ops/index.d.ts",
  "dist/ops/descriptor.d.ts:dist/ops/descriptor.d.ts",
  "dist/benchmarks/report.d.ts:dist/benchmarks/report.d.ts",
  "dist/benchmarks/phase2.d.ts:dist/benchmarks/phase2.d.ts",
  "dist/benchmarks/rigorous.d.ts:dist/benchmarks/rigorous.d.ts",
  "dist/chaos-lab/index.d.ts:dist/chaos-lab/index.d.ts",
  "--prune=dist",
].join(" "), { stdio: "inherit", cwd: pkgDir });

await build({
  absWorkingDir: pkgDir,
  entryPoints: [
    "src/index.ts",
    "src/ops/index.ts",
    "src/ops/descriptor.ts",
    "src/benchmarks/report.ts",
    "src/benchmarks/phase2.ts",
    "src/benchmarks/rigorous.ts",
    "src/chaos-lab/index.ts",
  ],
  outbase: "src",
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  splitting: true,
  minify: false,
  sourcemap: true,
  treeShaking: true,
  external: ["jszip", "fast-xml-parser"],
  define: {
  },
});

await build({
  absWorkingDir: pkgDir,
  entryPoints: ["src/workers/sheet-serializer-worker.ts"],
  outfile: "dist/workers/sheet-serializer-worker.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: false,
  sourcemap: true,
  treeShaking: true,
  external: ["jszip", "fast-xml-parser"],
  define: {
  },
});

cpSync(sourceLoaderPath, resolve(distDir, "source-js-extension-loader.mjs"));

console.log("XLSX free build complete → dist/");
