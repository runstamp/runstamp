#!/usr/bin/env node

/**
 * Combined build: runs both free and pro builds sequentially.
 * Use `scripts/build-free.mjs` or `scripts/build-pro.mjs` for individual builds.
 */

import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("=== Building OSS artifacts for @runstamp/pptx ===");
execSync("node scripts/build-free.mjs", { stdio: "inherit", cwd: __dirname });

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
const keysExist = existsSync(resolve(__dirname, "../../keys/public-v2.pem"));
if (keysExist) {
  console.log("\n=== Building @runstamp/pptx ===");
  execSync("node scripts/build-pro.mjs", { stdio: "inherit", cwd: __dirname });
} else {
  console.log("\n=== Preparing public dist-pro artifact (no signing keys required) ===");
  const distDir = resolve(__dirname, "dist");
  const distProDir = resolve(__dirname, "dist-pro");
  rmSync(distProDir, { recursive: true, force: true });
  cpSync(distDir, distProDir, { recursive: true });
  const publicTypesDir = resolve(distProDir, "types-public");
  if (existsSync(publicTypesDir)) {
    const publishedTypesDir = resolve(distProDir, "types");
    // `dist/types` is the compiler's workspace graph and contains declarations
    // for private build-support packages. Publish only the flattened public
    // declaration surface produced by bundle-declarations.mjs.
    rmSync(publishedTypesDir, { recursive: true, force: true });
    mkdirSync(publishedTypesDir, { recursive: true });
    cpSync(publicTypesDir, publishedTypesDir, { recursive: true });
  }
}

console.log("\nAll PPTX builds complete.");
