#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicPackages = [
  ["@runstamp/contract", "1.0.1"],
  ["@runstamp/pptx", "1.0.1"],
  ["@runstamp/docx", "1.0.1"],
  ["@runstamp/pdf", "1.0.1"],
  ["@runstamp/xlsx", "1.0.1"],
  ["@runstamp/catalog", "1.0.0"],
  ["@runstamp/cli", "1.0.0"],
  ["@runstamp/mcp-server", "1.0.0"],
  ["@runstamp/react", "1.0.0"],
];
const forbiddenSpecifiers = [
  "@runstamp/registry",
  "@runstamp/ops-bridge",
  "@runstamp/extension-kit",
  "@runstamp/license",
  "@runstamp/protocol",
  "@runstamp/document-diff",
  "@runstamp/pvce",
  "@runstamp/pptx-primitives",
  "@runstamp/pptx-extractor",
];
const lifecycleScripts = ["prepack", "postpack", "prepublishOnly", "pack:check"];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "runstamp-public-packs-"));

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function files(rootDirectory) {
  const result = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  }
  walk(rootDirectory);
  return result;
}

try {
  for (const [name, version] of publicPackages) {
    const before = new Set(fs.readdirSync(temporary));
    run("pnpm", ["--filter", name, "pack", "--pack-destination", temporary]);
    const created = fs.readdirSync(temporary).filter((entry) => entry.endsWith(".tgz") && !before.has(entry));
    if (created.length !== 1) throw new Error(`${name} produced ${created.length} tarballs instead of one.`);
    const tarball = path.join(temporary, created[0]);
    const extracted = path.join(temporary, name.replace("@runstamp/", ""));
    fs.mkdirSync(extracted);
    run("tar", ["-xzf", tarball, "-C", extracted]);
    const packageRoot = path.join(extracted, "package");
    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    if (manifest.name !== name || manifest.version !== version) throw new Error(`${name} tarball identity is incorrect.`);
    if (manifest.license !== "Apache-2.0" || manifest.private === true) throw new Error(`${name} tarball is not public Apache-2.0.`);
    for (const script of lifecycleScripts) {
      if (manifest.scripts?.[script]) throw new Error(`${name} retains private lifecycle script ${script}.`);
    }
    for (const section of ["dependencies", "peerDependencies", "optionalDependencies"]) {
      for (const dependency of Object.keys(manifest[section] ?? {})) {
        if (forbiddenSpecifiers.includes(dependency)) throw new Error(`${name} exposes private build dependency ${dependency}.`);
      }
    }
    for (const absolute of files(packageRoot)) {
      const relative = path.relative(packageRoot, absolute).split(path.sep).join("/");
      if (!relative.startsWith("dist/") && !relative.startsWith("dist-pro/")) continue;
      if (!/\.(?:[cm]?js|d\.ts)$/.test(absolute)) continue;
      const text = fs.readFileSync(absolute, "utf8");
      for (const specifier of forbiddenSpecifiers) {
        const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const importPattern = new RegExp(`(?:from\\s+|import\\s*\\(|import\\s+)(["'])${escaped}(?:/[^"']*)?\\1`);
        if (importPattern.test(text)) throw new Error(`${name} dist imports ${specifier} in ${relative}.`);
      }
    }
  }
  console.log(`[public-packages] verified ${publicPackages.length} publication tarballs`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
