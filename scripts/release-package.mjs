#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDirectory = path.join(root, ".release");
const registry = "https://registry.npmjs.org";

export const releases = new Map([
  ["@runstamp/contract", { directory: "contract", version: "1.0.1", bootstrap: false }],
  ["@runstamp/pptx", { directory: "pptx", version: "1.0.1", bootstrap: false }],
  ["@runstamp/docx", { directory: "docx", version: "1.0.1", bootstrap: false }],
  ["@runstamp/pdf", { directory: "pdf", version: "1.0.1", bootstrap: false }],
  ["@runstamp/xlsx", { directory: "xlsx", version: "1.0.1", bootstrap: false }],
  ["@runstamp/catalog", { directory: "catalog", version: "1.0.0", bootstrap: true }],
  ["@runstamp/cli", { directory: "cli", version: "1.0.0", bootstrap: true }],
  ["@runstamp/mcp-server", { directory: "mcp-server", version: "1.0.0", bootstrap: true }],
  ["@runstamp/react", { directory: "react", version: "1.0.0", bootstrap: true }],
]);

function fail(message) {
  throw new Error(`[release] ${message}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 && !options.allowFailure) {
    fail(`${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  return result;
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) fail(`Invalid arguments: ${argv.join(" ")}`);
    values[flag.slice(2)] = value;
  }
  return values;
}

export function validateInputs(values) {
  const selected = releases.get(values.package);
  if (selected === undefined) fail(`Unauthorized package: ${values.package ?? "<missing>"}`);
  if (values.version !== selected.version) fail(`Unauthorized version for ${values.package}: ${values.version ?? "<missing>"}`);
  const expectedTag = `${values.package}@${values.version}`;
  if (values.tag !== expectedTag) fail(`Tag must be exactly ${expectedTag}`);
  if (values.confirm !== `publish ${expectedTag}`) fail(`Confirmation must be exactly "publish ${expectedTag}"`);
  const bootstrap = values.bootstrap === "true";
  if (bootstrap !== selected.bootstrap) fail(`${values.package} must use bootstrap=${String(selected.bootstrap)}`);
  return { ...selected, name: values.package, tag: expectedTag, bootstrap };
}

function readManifest(selected, base = root) {
  const manifestPath = path.join(base, "packages", selected.directory, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.name !== selected.name || manifest.version !== selected.version) fail("Package manifest identity does not match inputs.");
  const repository = manifest.repository;
  if (repository?.type !== "git" || repository.url !== "https://github.com/runstamp/runstamp" || repository.directory !== `packages/${selected.directory}`) {
    fail("Package repository metadata is not bound to its runstamp/runstamp directory.");
  }
  if (manifest.private === true || manifest.license !== "Apache-2.0") fail("Package is not a public Apache-2.0 package.");
  return manifest;
}

function validateGitBinding(selected, values) {
  if (values.ref !== `refs/tags/${selected.tag}`) fail(`Workflow ref must be refs/tags/${selected.tag}.`);
  if (!/^[0-9a-f]{40}$/.test(values.sha ?? "")) fail("Workflow SHA must be a full commit SHA.");
  const commit = run("git", ["rev-parse", `${selected.tag}^{commit}`]).stdout.trim();
  if (commit !== values.sha) fail(`Tag commit ${commit} does not equal workflow commit ${values.sha}.`);
  const head = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  if (head !== values.sha) fail(`Checked-out HEAD ${head} does not equal workflow commit ${values.sha}.`);
  return run("git", ["rev-parse", `refs/tags/${selected.tag}`]).stdout.trim();
}

function assertVersionIsUnpublished(selected) {
  const result = run("npm", ["view", `${selected.name}@${selected.version}`, "version", "--json", "--registry", registry], { allowFailure: true });
  if (result.status === 0) fail(`${selected.name}@${selected.version} is already published.`);
  const output = `${result.stdout}\n${result.stderr}`;
  if (!/(?:E404|404 Not Found)/.test(output)) fail(`Registry preflight failed without an authoritative 404:\n${output}`);
}

function digest(buffer, algorithm, encoding = "hex") {
  return crypto.createHash(algorithm).update(buffer).digest(encoding);
}

function packedFiles(directory) {
  const result = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) result.push({ path: path.relative(directory, absolute).split(path.sep).join("/"), size: fs.statSync(absolute).size });
    }
  }
  walk(directory);
  return result;
}

export function assertNoWorkspaceProtocols(manifest) {
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (typeof range === "string" && range.startsWith("workspace:")) fail(`Packed ${field} still contains a workspace protocol for ${name}.`);
    }
  }
}

function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function pack(selected, values) {
  fs.rmSync(releaseDirectory, { recursive: true, force: true });
  fs.mkdirSync(releaseDirectory, { recursive: true });
  const result = run("pnpm", ["--dir", `packages/${selected.directory}`, "--config.ignore-scripts=true", "pack", "--pack-destination", releaseDirectory, "--json"]);
  const packed = JSON.parse(result.stdout);
  if (Array.isArray(packed) || packed?.name !== selected.name || packed?.version !== selected.version || typeof packed?.filename !== "string") {
    fail("pnpm pack did not produce exactly one authorized tarball.");
  }
  const tarball = path.resolve(packed.filename);
  if (path.dirname(tarball) !== releaseDirectory || !fs.existsSync(tarball)) fail("pnpm pack wrote outside the release directory or omitted the tarball.");
  const bytes = fs.readFileSync(tarball);
  const inspection = fs.mkdtempSync(path.join(os.tmpdir(), "runstamp-pack-inspect-"));
  try {
    run("tar", ["-xzf", tarball, "-C", inspection]);
    const packageRoot = path.join(inspection, "package");
    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    if (manifest.name !== selected.name || manifest.version !== selected.version) fail("Packed manifest identity does not match the authorized release.");
    assertNoWorkspaceProtocols(manifest);
    verifyExportFiles(manifest, packageRoot);
    const record = {
      schemaVersion: 1,
      package: selected.name,
      version: selected.version,
      source: { repository: "https://github.com/runstamp/runstamp", tag: selected.tag, tagObject: values.tagObject, commit: values.sha },
      workflow: { file: ".github/workflows/publish.yml", runId: values.runId, runAttempt: values.runAttempt, bootstrap: selected.bootstrap },
      tarball: {
        filename: path.basename(tarball), byteLength: bytes.length,
        sha256: digest(bytes, "sha256"), shasum: digest(bytes, "sha1"), integrity: `sha512-${digest(bytes, "sha512", "base64")}`,
        files: packedFiles(packageRoot),
        dependencies: manifest.dependencies ?? {}, peerDependencies: manifest.peerDependencies ?? {}, exports: manifest.exports ?? null, bin: manifest.bin ?? null,
      },
      registry: null,
      verification: null,
    };
    const recordPath = path.join(releaseDirectory, "release-record.json");
    fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    writeOutput("tarball", tarball);
    writeOutput("record", recordPath);
    console.log(`[release] packed ${selected.name}@${selected.version}: sha256:${record.tarball.sha256}`);
  } finally {
    fs.rmSync(inspection, { recursive: true, force: true });
  }
}

function npmView(selected) {
  const result = run("npm", ["view", `${selected.name}@${selected.version}`, "--json", "--registry", registry], { allowFailure: true });
  return result.status === 0 ? JSON.parse(result.stdout) : null;
}

async function waitForRegistry(selected) {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const metadata = npmView(selected);
    if (metadata?.version === selected.version && metadata.dist?.attestations?.provenance && metadata.dist.attestations.url) return metadata;
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  fail(`Registry did not expose ${selected.name}@${selected.version} with provenance within 60 seconds.`);
}

export function verifyAuditResult(audit) {
  if (!Array.isArray(audit?.invalid) || !Array.isArray(audit?.missing)) fail("npm audit signatures returned an unexpected result shape.");
  if (audit.invalid.length > 0 || audit.missing.length > 0) fail("npm audit signatures reported invalid or missing signatures/attestations.");
}

function verifyExportFiles(manifest, packageRoot) {
  const targets = [];
  function visit(value) {
    if (typeof value === "string") targets.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  }
  visit(manifest.exports);
  visit(manifest.bin);
  for (const target of targets) {
    if (!target.startsWith("./") || !fs.existsSync(path.join(packageRoot, target))) fail(`Published export target is missing: ${target}`);
  }
}

async function verifyInstalledBehavior(selected, temporary, manifest) {
  const packageRoot = path.join(temporary, "node_modules", ...selected.name.split("/"));
  verifyExportFiles(manifest, packageRoot);
  const mainExport = manifest.exports["."].import ?? manifest.exports["."].default;
  const imported = await import(pathToFileURL(path.join(packageRoot, mainExport)).href);
  if (selected.name === "@runstamp/catalog") {
    const catalog = imported.CATALOG ?? imported.catalog ?? imported.operationCatalog ?? imported.default;
    if (!Array.isArray(catalog) || catalog.length !== 79) fail("Installed catalog does not expose exactly 79 operations.");
    if (/implementation|handler|executor/.test(JSON.stringify(catalog))) fail("Installed catalog contains implementation fields.");
  }
  if (selected.name === "@runstamp/cli") run(process.execPath, [path.join(packageRoot, manifest.bin.runstamp), "--help"], { cwd: temporary });
  if (selected.name === "@runstamp/mcp-server") {
    const names = imported.createModularTools().map((tool) => tool.name).sort();
    const expected = ["runstamp_describe_operation", "runstamp_invoke_operation", "runstamp_list_operations"];
    if (JSON.stringify(names) !== JSON.stringify(expected)) fail(`Installed MCP tools are incorrect: ${names.join(", ")}`);
  }
}

async function postpublish(selected) {
  const recordPath = path.join(releaseDirectory, "release-record.json");
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  const metadata = await waitForRegistry(selected);
  if (metadata.dist?.shasum !== record.tarball.shasum || metadata.dist?.integrity !== record.tarball.integrity) fail("Registry tarball integrity does not match the single packed tarball.");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "runstamp-registry-verify-"));
  try {
    fs.writeFileSync(path.join(temporary, "package.json"), '{"name":"runstamp-release-verifier","private":true}\n');
    run("npm", ["install", "--ignore-scripts", "--package-lock", `${selected.name}@${selected.version}`, "--registry", registry], { cwd: temporary });
    const packageRoot = path.join(temporary, "node_modules", ...selected.name.split("/"));
    const installedManifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    if (installedManifest.name !== selected.name || installedManifest.version !== selected.version) fail("Fresh install resolved the wrong package identity.");
    await verifyInstalledBehavior(selected, temporary, installedManifest);
    const audit = run("npm", ["audit", "signatures", "--json", "--include-attestations", "--registry", registry], { cwd: temporary });
    const auditJson = JSON.parse(audit.stdout);
    verifyAuditResult(auditJson);
    record.registry = {
      shasum: metadata.dist.shasum,
      integrity: metadata.dist.integrity,
      tarball: metadata.dist.tarball,
      provenance: { result: "verified", url: metadata.dist.attestations.url, predicateType: metadata.dist.attestations.provenance.predicateType },
    };
    record.verification = { result: "passed", freshInstall: true, exports: true, packageBehavior: true, provenance: true };
    fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`[release] verified ${selected.name}@${selected.version} from the registry`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const values = parseArguments(rest);
  const selected = validateInputs(values);
  if (command === "preflight") {
    readManifest(selected);
    writeOutput("tag_object", validateGitBinding(selected, values));
    assertVersionIsUnpublished(selected);
    console.log(`[release] authorized ${selected.name}@${selected.version} at ${values.sha}`);
  } else if (command === "pack") pack(selected, values);
  else if (command === "postpublish") await postpublish(selected);
  else fail(`Unknown command: ${command ?? "<missing>"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
