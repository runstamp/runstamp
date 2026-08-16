#!/usr/bin/env node

/**
 * Free build: @runstamp/docx (Apache-2.0)
 *
 * - No public key, no license validation code
 * - Unminified without sourcemaps (published bundles should not reference missing source paths)
 */

import { build } from "esbuild";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");

// Generate type declarations
console.log("Generating type declarations...");
execSync("tsc --emitDeclarationOnly --outDir dist", { stdio: "inherit", cwd: pkgDir });
execSync("node ../../scripts/bundle-declarations.mjs dist/index.d.ts:dist/index.d.ts dist/ops/index.d.ts:dist/ops/index.d.ts dist/ops/descriptor.d.ts:dist/ops/descriptor.d.ts --external=sharp --external=opentype.js --external=pdf-lib --prune=dist", { stdio: "inherit", cwd: pkgDir });

await build({
  absWorkingDir: pkgDir,
  entryPoints: ["src/index.ts", "src/ops/index.ts", "src/ops/descriptor.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  minify: false,
  minifySyntax: true,
  sourcemap: false,
  treeShaking: true,
  external: ["jszip", "fast-xml-parser", "sharp", "@runstamp/pdf"],
  define: {
  },
});

console.log("DOCX free build complete → dist/");
