#!/usr/bin/env node

/**
 * Free build: bundles OSS artifacts for @runstamp/pptx with esbuild.
 *
 * - No public key embedded (free has no license validation)
 * - Unminified with sourcemaps (Apache-2.0 — readable source)
 * - Zod is bundled (prevents version conflicts)
 */

import { build } from "esbuild";
import { execSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");
const yogaWasmPath = resolve(pkgDir, "node_modules/yoga-wasm-web/dist/yoga.wasm");
const nodeEsmBanner = [
  'import { createRequire as __runstampCreateRequire } from "node:module";',
  "const require = __runstampCreateRequire(import.meta.url);",
].join("\n");

// Generate type declarations
console.log("Generating type declarations...");
execSync("./node_modules/.bin/tsc --emitDeclarationOnly --outDir dist/types", {
  stdio: "inherit",
  cwd: pkgDir,
});

const generatedPackageName = existsSync(resolve(pkgDir, "dist/types/core")) ? "core" : "pptx";
const generatedPackageRoot = resolve(pkgDir, `dist/types/${generatedPackageName}/src`);
mkdirSync(resolve(generatedPackageRoot, "types"), { recursive: true });
copyFileSync("src/types/vendor.d.ts", resolve(generatedPackageRoot, "types/vendor.d.ts"));
cpSync(resolve(pkgDir, "../pptx-primitives/dist"), resolve(pkgDir, "dist/types/pptx-primitives"), { recursive: true });
const publicEntryTypesPath = resolve(generatedPackageRoot, "index.d.ts");
writeFileSync(
  publicEntryTypesPath,
  readFileSync(publicEntryTypesPath, "utf8").replaceAll('"@runstamp/protocol"', '"../../protocol/src/index.js"'),
);
for (const protocolFile of ["composition.d.ts"]) {
  const protocolTypesPath = resolve(pkgDir, "dist/types/protocol/src", protocolFile);
  writeFileSync(
    protocolTypesPath,
    readFileSync(protocolTypesPath, "utf8")
      .replaceAll('"@runstamp/pptx-primitives"', '"../../pptx-primitives/index.js"')
      .replaceAll('"@runstamp/pptx/engine"', '"../../core/src/public/engine.js"'),
  );
}

const declarationEntries = ["index", "public/engine", "public/interpreter", "public/validator", "public/quality", "public/renderer", "ops/index", "ops/descriptor"];
execSync([
  "node ../../scripts/bundle-declarations.mjs",
  ...declarationEntries.map((entry) => `dist/types/${generatedPackageName}/src/${entry}.d.ts:dist/types-public/${entry.replace("public/", "")}.d.ts`),
  "--external=@napi-rs/canvas",
  "--external=echarts",
  "--external=harfbuzzjs",
  "--external=subset-font",
].join(" "), { stdio: "inherit", cwd: pkgDir });

// Bundle with esbuild
console.log("Building free bundle...");
await build({
  absWorkingDir: pkgDir,
  entryPoints: [
    "src/index.ts",
    "src/index-lite.ts",
    "src/public/engine.ts",
    "src/public/interpreter.ts",
    "src/public/validator.ts",
    "src/public/quality.ts",
    "src/public/renderer.ts",
    "src/layout/index.ts",
    "src/renderer/index.ts",
    "src/svg/exporter.ts",
    "src/converter/pptx-to-pdf.ts",
  "src/ops/index.ts",
  "src/ops/descriptor.ts",
    // Dynamically imported engine submodules (loaded at runtime via new URL())
    "src/engine/previewGenerator.ts",
    "src/engine/archiveAssembler.ts",
    "src/engine/templateMutator.ts",
  ],
  outdir: "dist",
  bundle: true,
  splitting: true,
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
    "@napi-rs/canvas",
    // Keep the separately published PDF engine external. Bundling its ESM
    // compatibility banner into this bundle redeclares `require` and makes the
    // PPTX -> PDF entry fail in a fresh Node process.
    "@runstamp/pdf",
    // HarfBuzz, echarts, subset-font NOT externalized —
  ],
  define: {
    __RUNSTAMP_YOGA_WASM_BASE64__: JSON.stringify(readFileSync(yogaWasmPath).toString("base64")),
    // No public key — free has no license validation
  },
  loader: { ".wasm": "file" },
});

copyFileSync(
  yogaWasmPath,
  resolve(pkgDir, "dist/yoga.wasm"),
);
mkdirSync(resolve(pkgDir, "dist/converter"), { recursive: true });
copyFileSync(
  yogaWasmPath,
  resolve(pkgDir, "dist/converter/yoga.wasm"),
);

const fontsSrcDir = resolve(pkgDir, "assets/fonts");
const fontsDestDir = resolve(pkgDir, "dist/assets/fonts");
if (existsSync(fontsSrcDir)) {
  mkdirSync(fontsDestDir, { recursive: true });
  cpSync(fontsSrcDir, fontsDestDir, { recursive: true, force: true });
}

console.log("Free build complete → dist/");
