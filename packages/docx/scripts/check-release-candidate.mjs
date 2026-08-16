#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { findRepoRoot, loadWorkspacePackages } from "../../../scripts/workspace-package-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, "..");
const repoRoot = findRepoRoot(packageDir);
const workspacePackages = loadWorkspacePackages(repoRoot);
const targetPackageName = "@runstamp/docx";
const artifactDir = resolve(packageDir, "output/docx-engine-gate");
const reportPath = join(artifactDir, "release-candidate.json");
const renderedDocxPath = join(artifactDir, "release-candidate.docx");
const extractedTextPath = join(artifactDir, "release-candidate.txt");
const runtimeSections = ["dependencies", "peerDependencies", "optionalDependencies"];

await mkdir(artifactDir, { recursive: true });

function commandForDisplay(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 180_000;
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs} ms: ${commandForDisplay(command, args)}`));
    }, timeoutMs);

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolveRun({
        code: code ?? (signal ? 1 : 0),
        signal,
        stdout,
        stderr,
        command: commandForDisplay(command, args),
      });
    });
  });
}

function assertCleanCommand(result, description) {
  if (result.code !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${description} failed (${result.command})\n${detail}`);
  }
}

function parseNpmPackResult(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {
    const jsonStart = Math.max(text.lastIndexOf("\n["), text.indexOf("["));
    if (jsonStart < 0) {
      throw new Error(`npm pack did not emit a JSON array:\n${stdout}`);
    }
    const candidate = text.slice(text[jsonStart] === "[" ? jsonStart : jsonStart + 1).trim();
    try {
      return JSON.parse(candidate);
    } catch (error) {
      throw new Error(
        `Failed to parse npm pack JSON after lifecycle output: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function readPackedManifest(tarballPath) {
  const extractDir = await mkdtemp(join(tmpdir(), "runstamp-docx-rc-manifest-"));
  try {
    const result = await run("tar", ["-xzf", tarballPath, "-C", extractDir], { timeoutMs: 60_000 });
    assertCleanCommand(result, "tarball manifest extraction");
    return JSON.parse(await readFile(join(extractDir, "package", "package.json"), "utf8"));
  } finally {
    await rm(extractDir, { recursive: true, force: true });
  }
}

async function packPackage(packageInfo, packDir) {
  const result = await run(
    "npm",
    ["pack", "--json", "--pack-destination", packDir, "--foreground-scripts"],
    { cwd: packageInfo.dir, timeoutMs: 240_000 },
  );
  assertCleanCommand(result, `npm pack for ${packageInfo.name}`);
  const [packInfo] = parseNpmPackResult(result.stdout);
  const tarballPath = join(packDir, packInfo.filename);
  const bytes = await readFile(tarballPath);
  const manifest = await readPackedManifest(tarballPath);
  return {
    name: packageInfo.name,
    dir: packageInfo.dir,
    tarballPath,
    filename: packInfo.filename,
    unpackedSize: packInfo.unpackedSize,
    entryCount: packInfo.entryCount,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    manifest,
  };
}

async function collectLocalRuntimeDependencyPacks(packInfo, packDir, packedByName, seen = new Set()) {
  const packs = [];
  for (const sectionName of runtimeSections) {
    const section = packInfo.manifest[sectionName] ?? {};
    for (const dependencyName of Object.keys(section)) {
      if (seen.has(dependencyName)) {
        continue;
      }
      const dependencyInfo = workspacePackages.get(dependencyName);
      if (!dependencyInfo) {
        continue;
      }
      if (dependencyInfo.private) {
        throw new Error(`${packInfo.name} published manifest depends on private workspace package ${dependencyName}`);
      }
      seen.add(dependencyName);
      let dependencyPack = packedByName.get(dependencyName);
      if (!dependencyPack) {
        dependencyPack = await packPackage(dependencyInfo, packDir);
        packedByName.set(dependencyName, dependencyPack);
      }
      packs.push(dependencyPack);
      packs.push(...await collectLocalRuntimeDependencyPacks(dependencyPack, packDir, packedByName, seen));
    }
  }
  return packs;
}

function exactPackageSpec(name, range) {
  const exact = typeof range === "string" ? range.replace(/^[~^]/, "") : "";
  if (!/^\d+\.\d+\.\d+/.test(exact)) {
    throw new Error(`Cannot resolve exact registry spec for ${name} from range ${range}`);
  }
  return `${name}@${exact}`;
}

async function writeSmokeScript(tempDir) {
  const smokeScriptPath = join(tempDir, "docx-release-smoke.mjs");
  await writeFile(
    smokeScriptPath,
    `import { writeFile } from "node:fs/promises";
import mammoth from "mammoth";
import JSZip from "jszip";
import { renderToDocx, runDocxQualityGate } from "@runstamp/docx";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const expectedText = "Release candidate smoke";
const outerTableText = "Outer table value";
const nestedTableText = "Nested table value";
const result = await renderToDocx({
  type: "DocxDocument",
  pageSize: "a4",
  orientation: "portrait",
  metadata: {
    title: "DOCX release candidate smoke",
    author: "runstamp docx engine gate"
  },
  pages: [
    {
      elements: [
        { type: "heading", level: 1, text: expectedText },
        { type: "paragraph", text: "Fresh project import, render, validate, and Mammoth extract pass." },
        {
          type: "table",
          rows: [
            {
              cells: [
                { text: "Gate" },
                {
                  elements: [
                    { type: "paragraph", text: outerTableText },
                    {
                      type: "table",
                      rows: [{ cells: [{ text: nestedTableText }] }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
});

const buffer = Buffer.from(result.buffer);
assert(buffer.subarray(0, 2).toString("utf8") === "PK", "renderToDocx did not return a DOCX ZIP");
assert(buffer.length > 1000, "renderToDocx returned an unexpectedly small buffer");

const zip = await JSZip.loadAsync(buffer);
const documentXml = await zip.file("word/document.xml")?.async("string");
assert(documentXml, "Rendered DOCX is missing word/document.xml");
function tableDepthAt(text) {
  const textIndex = documentXml.indexOf(text);
  assert(textIndex >= 0, "word/document.xml is missing " + text);
  const tokens = documentXml.slice(0, textIndex).match(/<\\/?w:tbl(?:\\s|>)/g) ?? [];
  return tokens.reduce((depth, token) => depth + (token.startsWith("</") ? -1 : 1), 0);
}
assert(tableDepthAt(outerTableText) === 1, "Outer table content is not inside exactly one table");
assert(tableDepthAt(nestedTableText) === 2, "Nested table content is not inside exactly two tables");

const gate = await runDocxQualityGate({
  buffer,
  renderStats: result.stats,
  expectedSemanticManifest: {
    id: "release-candidate-smoke",
    forbiddenFindingCodes: ["DOCX_RELATIONSHIP_TARGET_MISSING", "DOCX_IMAGE_REF_MISSING"]
  }
});
assert(gate.accepted, "DocxQualityGate rejected rendered DOCX: " + JSON.stringify(gate.sidecars.manifest));

await writeFile("release-candidate.docx", buffer);
const extracted = await mammoth.extractRawText({ buffer });
assert(extracted.value.includes(expectedText), "Mammoth extract did not include expected heading text");
assert(extracted.value.includes(outerTableText), "Mammoth extract did not include outer table text");
assert(extracted.value.includes(nestedTableText), "Mammoth extract did not include nested table text");
await writeFile("release-candidate.txt", extracted.value);

console.log(JSON.stringify({
  ok: true,
  bytes: buffer.length,
  warnings: result.warnings ?? [],
  qualityVerdict: gate.verdict,
  validationIssues: gate.strictValidation.issues,
  artifactHashes: gate.artifactHashes,
  nestedTableDepth: tableDepthAt(nestedTableText),
  mammothMessages: extracted.messages ?? [],
  extractedTextLength: extracted.value.length
}, null, 2));
`,
    "utf8",
  );
  return smokeScriptPath;
}

const sourceManifest = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
const targetPackage = workspacePackages.get(targetPackageName);
if (!targetPackage) {
  throw new Error(`Workspace package not found: ${targetPackageName}`);
}

const report = {
  ok: false,
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  targetPackage: targetPackageName,
  tarballs: [],
  install: null,
  smoke: null,
};

const packDir = await mkdtemp(join(tmpdir(), "runstamp-docx-rc-pack-"));
const installDir = await mkdtemp(join(tmpdir(), "runstamp-docx-rc-install-"));

try {
  const packedByName = new Map();
  const targetPack = await packPackage(targetPackage, packDir);
  packedByName.set(targetPackageName, targetPack);
  const dependencyPacks = await collectLocalRuntimeDependencyPacks(
    targetPack,
    packDir,
    packedByName,
    new Set([targetPackageName]),
  );
  const installTarballs = [
    targetPack.tarballPath,
    ...dependencyPacks.map((pack) => pack.tarballPath),
  ];

  await writeFile(
    join(installDir, "package.json"),
    `${JSON.stringify({ name: "runstamp-docx-release-candidate", private: true, type: "module" }, null, 2)}\n`,
    "utf8",
  );

  const mammothSpec = exactPackageSpec("mammoth", sourceManifest.devDependencies?.mammoth);
  const jszipSpec = exactPackageSpec("jszip", sourceManifest.dependencies?.jszip);
  const installResult = await run(
    "npm",
    ["install", "--no-package-lock", "--no-audit", "--no-fund", ...installTarballs, mammothSpec, jszipSpec],
    { cwd: installDir, timeoutMs: 240_000 },
  );
  report.install = {
    code: installResult.code,
    stdout: installResult.stdout,
    stderr: installResult.stderr,
  };
  assertCleanCommand(installResult, "fresh release-candidate install");

  const smokeScriptPath = await writeSmokeScript(installDir);
  const smokeResult = await run("node", [smokeScriptPath], {
    cwd: installDir,
    env: { ...process.env, NODE_ENV: "test" },
    timeoutMs: 120_000,
  });
  report.smoke = {
    code: smokeResult.code,
    stdout: smokeResult.stdout,
    stderr: smokeResult.stderr,
  };
  assertCleanCommand(smokeResult, "fresh release-candidate smoke");

  const smokeJson = JSON.parse(smokeResult.stdout);
  await copyFile(join(installDir, "release-candidate.docx"), renderedDocxPath);
  await copyFile(join(installDir, "release-candidate.txt"), extractedTextPath);

  report.ok = true;
  report.tarballs = [targetPack, ...dependencyPacks].map((pack) => ({
    name: pack.name,
    filename: pack.filename,
    entryCount: pack.entryCount,
    unpackedSize: pack.unpackedSize,
    sha256: pack.sha256,
  }));
  report.smoke.parsed = smokeJson;
  report.artifacts = {
    docx: renderedDocxPath,
    extractedText: extractedTextPath,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[check-release-candidate] PASS: fresh install/import/render/validate/Mammoth smoke (${smokeJson.bytes} bytes)`);
} catch (error) {
  report.error = error instanceof Error ? error.stack ?? error.message : String(error);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error("[check-release-candidate] FAIL");
  console.error(report.error);
  process.exit(1);
} finally {
  await rm(packDir, { recursive: true, force: true });
  await rm(installDir, { recursive: true, force: true });
}
