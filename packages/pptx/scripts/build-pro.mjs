#!/usr/bin/env node

/**
 * Pro build: bundles @runstamp/pptx with esbuild.
 *
 * - Embeds the Ed25519 public key for license validation
 * - Minified, no sourcemaps (proprietary)
 * - Zod is bundled (prevents version conflicts with consumer's Zod)
 */

import { build } from "esbuild";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");
const yogaWasmPath = resolve(pkgDir, "node_modules/yoga-wasm-web/dist/yoga.wasm");
const harfbuzzWasmPath = resolve(pkgDir, "node_modules/harfbuzzjs/hb.wasm");
const subsetFontEntryPath = resolve(pkgDir, "node_modules/subset-font/index.js");
const subsetFontRequire = createRequire(subsetFontEntryPath);
const harfbuzzSubsetWasmPath = subsetFontRequire.resolve("harfbuzzjs/hb-subset.wasm");
const subsetFontWasmPlugin = {
  name: "embed-subset-font-wasm",
  setup(buildContext) {
    buildContext.onLoad({ filter: /subset-font\/index\.js$/ }, (args) => {
      const source = readFileSync(args.path, "utf8");
      const runtimeLookup = "await readFile(require.resolve('harfbuzzjs/hb-subset.wasm'))";
      if (!source.includes(runtimeLookup)) {
        return { errors: [{ text: `subset-font runtime lookup changed in ${args.path}` }] };
      }
      return {
        contents: source.replace(
          runtimeLookup,
          'Buffer.from(__RUNSTAMP_HARFBUZZ_SUBSET_WASM_BASE64__, "base64")',
        ),
        loader: "js",
      };
    });
  },
};
const keysDir = resolve(pkgDir, "../../keys");
const nodeEsmBanner = [
  'import { createRequire as __runstampCreateRequire } from "node:module";',
  'import { dirname as __runstampDirname } from "node:path";',
  'import { fileURLToPath as __runstampFileURLToPath } from "node:url";',
  "const __filename = __runstampFileURLToPath(import.meta.url);",
  "const __dirname = __runstampDirname(__filename);",
  "const require = __runstampCreateRequire(import.meta.url);",
].join("\n");

// Read public key for license validation embedding
const publicKeyPath = resolve(keysDir, "public-v2.pem");
if (!existsSync(publicKeyPath)) {
  console.error("ERROR: keys/public-v2.pem not found. Run keypair generation first.");
  process.exit(1);
}
const publicKeyV2 = readFileSync(publicKeyPath, "utf-8");
const publicKeyV4Path = resolve(keysDir, "public-v4.pem");
if (!existsSync(publicKeyV4Path)) {
  console.error("ERROR: keys/public-v4.pem not found.");
  process.exit(1);
}
const publicKeyV4 = readFileSync(publicKeyV4Path, "utf-8");

const requestedEntryPoints = [
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
];

const entryPoints = requestedEntryPoints.filter((entryPoint) =>
  existsSync(resolve(pkgDir, entryPoint)),
);

// Bundle with esbuild
console.log("Building pro bundle...");
await build({
  absWorkingDir: pkgDir,
  entryPoints,
  outdir: "dist-pro",
  bundle: true,
  splitting: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: true,
  sourcemap: false,
  treeShaking: true,
  plugins: [subsetFontWasmPlugin],
  banner: {
    js: nodeEsmBanner,
  },
  external: [
    "@napi-rs/canvas",
  ],
  define: {
    __RUNSTAMP_PUBLIC_KEY_V2__: JSON.stringify(publicKeyV2),
    __RUNSTAMP_PUBLIC_KEY_V4__: JSON.stringify(publicKeyV4),
    __RUNSTAMP_YOGA_WASM_BASE64__: JSON.stringify(readFileSync(yogaWasmPath).toString("base64")),
    __RUNSTAMP_HARFBUZZ_WASM_BASE64__: JSON.stringify(readFileSync(harfbuzzWasmPath).toString("base64")),
    __RUNSTAMP_HARFBUZZ_SUBSET_WASM_BASE64__: JSON.stringify(
      readFileSync(harfbuzzSubsetWasmPath).toString("base64"),
    ),
  },
  loader: { ".wasm": "file" },
});

copyFileSync(
  yogaWasmPath,
  resolve(pkgDir, "dist-pro/yoga.wasm"),
);
mkdirSync(resolve(pkgDir, "dist-pro/converter"), { recursive: true });
copyFileSync(
  yogaWasmPath,
  resolve(pkgDir, "dist-pro/converter/yoga.wasm"),
);

// Bundled fonts (Carlito, Apache-2.0). resolveBundledFontDir() in
// autoFont.ts walks up from the bundle file to find this directory.
const fontsSrcDir = resolve(pkgDir, "assets/fonts");
const fontsDestDir = resolve(pkgDir, "dist-pro/assets/fonts");
if (existsSync(fontsSrcDir)) {
  mkdirSync(fontsDestDir, { recursive: true });
  cpSync(fontsSrcDir, fontsDestDir, { recursive: true, force: true });
}

const distTypesDir = resolve(pkgDir, "dist/types-public");
const distProTypesDir = resolve(pkgDir, "dist-pro/types");

if (existsSync(distTypesDir)) {
  mkdirSync(distProTypesDir, { recursive: true });
  cpSync(distTypesDir, distProTypesDir, { recursive: true, force: true });
}

console.log("Pro build complete → dist-pro/");
