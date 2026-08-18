#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = path.join(root, "PUBLIC_SOURCE_MANIFEST.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const additions = [
  "pnpm-lock.yaml",
  "scripts/release-package.mjs",
  "scripts/release-package.test.mjs",
  "scripts/update-public-source-manifest.mjs",
];
const paths = [...new Set([...manifest.files.map((entry) => entry.path), ...additions])];

manifest.files = paths.map((relative) => {
  const bytes = fs.readFileSync(path.join(root, relative));
  return {
    path: relative,
    bytes: bytes.byteLength,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
});

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[public-source] refreshed ${String(manifest.files.length)} manifest entries`);
