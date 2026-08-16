#!/usr/bin/env node
/**
 * Free-tier build: @runstamp/pdf
 *
 * - No public key, no license validation code in the free bundle
 * - Unminified with sourcemaps
 */

import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { copyFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");
const yogaWasmPath = resolve(pkgDir, "node_modules/yoga-wasm-web/dist/yoga.wasm");
const harfbuzzWasmPath = resolve(pkgDir, "node_modules/harfbuzzjs/hb.wasm");
const nodeEsmBanner = [
  'import { createRequire as __runstampCreateRequire } from "node:module";',
  "const require = __runstampCreateRequire(import.meta.url);",
].join("\n");

execFileSync("pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--emitDeclarationOnly"], {
  cwd: pkgDir,
  stdio: "inherit",
});
execFileSync("node", ["../../scripts/bundle-declarations.mjs", "dist/index.d.ts:dist/index.d.ts", "dist/ops/index.d.ts:dist/ops/index.d.ts", "dist/ops/descriptor.d.ts:dist/ops/descriptor.d.ts", "--external=subset-font", "--prune=dist"], {
  cwd: pkgDir,
  stdio: "inherit",
});

await build({
  absWorkingDir: pkgDir,
  entryPoints: ["src/index.ts", "src/ops/index.ts", "src/ops/descriptor.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: false,
  sourcemap: true,
  treeShaking: true,
  banner: {
    js: nodeEsmBanner,
  },
  external: [
    "subset-font",
  ],
  loader: { ".wasm": "file" },
  define: {
    __RUNSTAMP_YOGA_WASM_BASE64__: JSON.stringify(readFileSync(yogaWasmPath).toString("base64")),
    __RUNSTAMP_HARFBUZZ_WASM_BASE64__: JSON.stringify(readFileSync(harfbuzzWasmPath).toString("base64")),
  },
});

copyFileSync(
  yogaWasmPath,
  resolve(pkgDir, "dist/yoga.wasm"),
);
// Each bundled entry retains the local `new URL("./yoga.wasm", import.meta.url)`
// fallback. The descriptor entry is emitted under dist/ops, and webpack resolves
// that literal while bundling the registry even though the embedded base64 path
// is used at runtime. Stage the same asset beside the subpath entry so consumers
// can bundle every public export without a package-relative resolution failure.
copyFileSync(
  yogaWasmPath,
  resolve(pkgDir, "dist/ops/yoga.wasm"),
);

console.log("PDF free build complete → dist/");
