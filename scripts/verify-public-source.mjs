#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "PUBLIC_SOURCE_MANIFEST.json"), "utf8"));
const forbidden = new Set([
  "@runstamp/registry", "@runstamp/ops-bridge", "@runstamp/extension-kit",
  "@runstamp/license",
]);

for (const entry of manifest.files) {
  const bytes = fs.readFileSync(path.join(root, entry.path));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) throw new Error(`Manifest mismatch: ${entry.path}`);
}

for (const directory of manifest.packages) {
  const packageManifest = JSON.parse(fs.readFileSync(path.join(root, directory, "package.json"), "utf8"));
  for (const section of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const dependency of Object.keys(packageManifest[section] ?? {})) {
      if (forbidden.has(dependency)) throw new Error(`${packageManifest.name} exposes forbidden dependency ${dependency}`);
    }
  }
  if (manifest.publicPackages.includes(directory)) {
    await import(pathToFileURL(path.join(root, directory, packageManifest.main)).href);
  }
}

const { CATALOG } = await import(pathToFileURL(path.join(root, "packages/catalog/dist/index.js")).href);
if (CATALOG.length !== 79 || CATALOG.some((operation) => operation.stability !== "stable" || "implementation" in operation)) {
  throw new Error("Public catalog is not exactly 79 stable descriptor-only operations.");
}
console.log(`[public-source] verified ${String(manifest.files.length)} files and ${String(manifest.packages.length)} packages`);
