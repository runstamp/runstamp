#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, "..");
const repoRoot = resolve(packageDir, "../..");

const DETERMINISTIC_SCOPES = [
  "src/ooxml",
  "src/adapters",
  "src/hydration",
];

const PUBLIC_ERROR_SCOPES = [
  "src/render.ts",
  "src/index.ts",
  "src/ooxml",
  "src/hydration",
  "src/adapters",
  "src/quality",
  "src/diff",
  "src/builders",
  "src/visual-polish",
  "src/secure",
];

const BANNED_PATTERNS = [
  { label: "Date.now()", regex: /\bDate\.now\s*\(/g },
  { label: "new Date()", regex: /\bnew\s+Date\s*\(\s*\)/g },
  { label: "Math.random()", regex: /\bMath\.random\s*\(/g },
  { label: "crypto.randomUUID()", regex: /\bcrypto\.randomUUID\s*\(/g },
  { label: "crypto.randomBytes()", regex: /\bcrypto\.randomBytes\s*\(/g },
  { label: "crypto.getRandomValues()", regex: /\bcrypto\.getRandomValues\s*\(/g },
  { label: "console.warn()", regex: /\bconsole\.warn\s*\(/g },
];

const ALLOW_COMMENT = /lint-allow-nondeterministic:/;

const BASELINED_DOCX_IMPORT_FILES = new Set();

function fail(message, details = []) {
  console.error(`[check-docx-static-gate] FAIL: ${message}`);
  for (const detail of details) {
    console.error(`  - ${detail}`);
  }
  process.exit(1);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "dist-pro") {
      continue;
    }
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else if ([".ts", ".mts", ".js", ".mjs"].includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

function lineNumberAt(contents, index) {
  return contents.slice(0, index).split("\n").length;
}

function hasAllowCommentNearby(contents, index) {
  const lines = contents.slice(0, index).split("\n");
  const currentLine = lines.length;
  const allLines = contents.split("\n");
  for (let line = Math.max(1, currentLine - 2); line <= Math.min(allLines.length, currentLine + 1); line += 1) {
    if (ALLOW_COMMENT.test(allLines[line - 1] ?? "")) {
      return true;
    }
  }
  return false;
}

async function checkRuntimeDependencies() {
  const pkg = JSON.parse(await readFile(resolve(packageDir, "package.json"), "utf8"));
  const dependencyGroups = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const group of dependencyGroups) {
    if (pkg[group]?.docx) {
      fail("`docx` is still a dependency of @runstamp/docx.", [
        `Remove ${group}.docx; the native OOXML serializer is the only production serializer.`,
      ]);
    }
  }
}

async function checkDeterministicScopes() {
  const violations = [];
  for (const scope of DETERMINISTIC_SCOPES) {
    for (const file of await walk(resolve(packageDir, scope))) {
      const contents = await readFile(file, "utf8");
      const rel = relative(packageDir, file);
      for (const pattern of BANNED_PATTERNS) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;
        while ((match = regex.exec(contents)) !== null) {
          if (!hasAllowCommentNearby(contents, match.index)) {
            violations.push(`${rel}:${lineNumberAt(contents, match.index)} uses ${pattern.label}`);
          }
        }
      }
    }
  }
  if (violations.length > 0) {
    fail("deterministic DOCX paths use nondeterministic or noisy APIs without an allow comment.", violations);
  }
}

async function checkLegacyImports() {
  const files = [
    ...await walk(resolve(packageDir, "src")),
    ...await walk(resolve(packageDir, "scripts")),
  ];
  const docxImportViolations = [];
  const legacyImportViolations = [];
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    const rel = relative(packageDir, file);
    if (/\bfrom\s+["']docx["']/.test(contents) && !BASELINED_DOCX_IMPORT_FILES.has(rel)) {
      docxImportViolations.push(rel);
    }
    if (
      /\bfrom\s+["'][^"']*serializer\/(?:structured-serializer|auto-rendering)(?:\.ts|\.js)?["']/.test(contents)
    ) {
      legacyImportViolations.push(rel);
    }
  }
  if (docxImportViolations.length > 0) {
    fail("new production imports from the legacy `docx` library are not allowed.", docxImportViolations);
  }
  if (legacyImportViolations.length > 0) {
    fail("new production imports from legacy serializer paths are not allowed.", legacyImportViolations);
  }
}

async function filesForScope(scope) {
  const resolved = resolve(packageDir, scope);
  if (extname(scope)) {
    return [resolved];
  }
  return await walk(resolved);
}

async function checkPublicBareErrors() {
  const violations = [];
  const bareErrorPattern = /\bthrow\s+new\s+Error\s*\(|\bthrow\s+Error\s*\(/g;
  for (const scope of PUBLIC_ERROR_SCOPES) {
    for (const file of await filesForScope(scope)) {
      const contents = await readFile(file, "utf8");
      const rel = relative(packageDir, file);
      let match;
      while ((match = bareErrorPattern.exec(contents)) !== null) {
        violations.push(`${rel}:${lineNumberAt(contents, match.index)} uses a bare Error on a public DOCX path.`);
      }
    }
  }
  if (violations.length > 0) {
    fail("public DOCX paths must throw DOCXError/SecurePDFError factories instead of bare Error.", violations);
  }
}

async function checkManifestBuckets() {
  const manifestPath = resolve(packageDir, "fixtures/docx-engine/level-a-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const fixtures = [...manifest.renderFixtures, ...manifest.hydrationFixtures];
  const missing = [];
  for (const bucket of manifest.requiredFeatureBuckets) {
    if (!fixtures.some((fixture) => fixture.features.includes(bucket))) {
      missing.push(bucket);
    }
  }
  if (missing.length > 0) {
    fail("DOCX engine fixture manifest has empty required feature buckets.", missing);
  }
  if (manifest.renderFixtures.length < 25) {
    fail(`DOCX engine fixture manifest has ${manifest.renderFixtures.length} render fixtures; Level A requires at least 25.`);
  }
  if (manifest.hydrationFixtures.length < 10) {
    fail(`DOCX engine fixture manifest has ${manifest.hydrationFixtures.length} hydration fixtures; Level A requires at least 10.`);
  }

  const levelBManifestPath = resolve(packageDir, "fixtures/docx-engine/level-b-manifest.json");
  const levelB = JSON.parse(await readFile(levelBManifestPath, "utf8"));
  const levelBRenderCount = (levelB.renderSuites ?? []).reduce((sum, suite) => sum + (suite.count ?? 0), 0);
  const levelBHydrationCount = (levelB.hydrationSuites ?? []).reduce((sum, suite) => sum + (suite.count ?? 0), 0);
  const levelBFixtures = [
    ...(levelB.renderSuites ?? []),
    ...(levelB.hydrationSuites ?? []),
    ...(levelB.negativeFixtures ?? []),
  ];
  const levelBMissing = [];
  for (const bucket of levelB.requiredFeatureBuckets ?? []) {
    if (!levelBFixtures.some((fixture) => fixture.features?.includes(bucket))) {
      levelBMissing.push(bucket);
    }
  }
  if (levelBMissing.length > 0) {
    fail("DOCX Level B fixture manifest has empty required feature buckets.", levelBMissing);
  }
  if (levelBRenderCount < 100) {
    fail(`DOCX Level B manifest has ${levelBRenderCount} render fixtures; Level B requires at least 100.`);
  }
  if (levelBHydrationCount < 50) {
    fail(`DOCX Level B manifest has ${levelBHydrationCount} hydration fixtures; Level B requires at least 50.`);
  }
  const weakPropertyGenerators = (levelB.propertyGenerators ?? [])
    .filter((generator) => (generator.caseCount ?? 0) < 1000)
    .map((generator) => `${generator.id}: ${generator.caseCount ?? 0}`);
  if (weakPropertyGenerators.length > 0) {
    fail("DOCX Level B property generators must declare at least 1,000 cases each.", weakPropertyGenerators);
  }
}

async function checkQualityRegistry() {
  const matrix = JSON.parse(await readFile(resolve(packageDir, "src/quality/finding-matrix.json"), "utf8"));
  const qualityTypes = await readFile(resolve(repoRoot, "packages/license/src/quality.ts"), "utf8");
  const declaredCodes = new Set([...qualityTypes.matchAll(/\|\s+"([^"]+)"/g)].map((match) => match[1]));
  const missing = [];
  for (const entry of matrix.entries ?? []) {
    if (!declaredCodes.has(entry.code)) {
      missing.push(entry.code);
    }
  }
  if (missing.length > 0) {
    fail("DOCX quality finding matrix contains codes missing from the shared FindingCode union.", missing);
  }
}

async function checkHydrationTreeWalker() {
  const hydrator = await readFile(resolve(packageDir, "src/hydration/hydrator.ts"), "utf8");
  const details = [];
  if (!/hydrateXmlPartWithTree/.test(hydrator)) {
    details.push("src/hydration/hydrator.ts does not route part mutation through hydrateXmlPartWithTree.");
  }
  for (const symbol of ["normalizeRunSplits", "replacePlaceholderInXml", "renderOfficeFragment"]) {
    if (new RegExp(`\\b${symbol}\\b`).test(hydrator)) {
      details.push(`src/hydration/hydrator.ts still references raw-string hydration helper ${symbol}.`);
    }
  }
  if (/\bcontent\s*=\s*content\.replace\s*\(/.test(hydrator)) {
    details.push("src/hydration/hydrator.ts still mutates document XML with content.replace(...).");
  }

  const treeWalker = await readFile(resolve(packageDir, "src/hydration/tree-walker.ts"), "utf8");
  if (!/\bXMLParser\b/.test(treeWalker) || !/\bvisitParagraphs\b/.test(treeWalker)) {
    details.push("src/hydration/tree-walker.ts must keep the parsed OOXML paragraph walker in place.");
  }

  if (details.length > 0) {
    fail("hydration hot path must remain parsed-tree based.", details);
  }
}

async function checkPhase4Boundaries() {
  const details = [];
  for (const rel of [
    "src/adapters/docx-to-structured.ts",
    "src/adapters/paper-to-structured.ts",
  ]) {
    const contents = await readFile(resolve(packageDir, rel), "utf8");
    if (/\bas\s+any\b|:\s*any\b|Record<string,\s*any>|Array<any>/.test(contents)) {
      details.push(`${rel} still has an adapter-level any boundary.`);
    }
  }

  const tableBuilder = await readFile(resolve(packageDir, "src/ooxml/builders/table.ts"), "utf8");
  for (const [label, regex] of [
    ["NativeTableModel columns must be Twips[]", /columns:\s*number\[\]/],
    ["NativeTableRowModel height must be Twips", /height:\s*number;/],
    ["buildTableGrid must accept Twips[]", /function\s+buildTableGrid\(columns:\s*number\[\]/],
    ["buildCellProperties width must be Twips", /widthTwips:\s*number/],
    ["normalizeColumnWidthsToTwips must return Twips[]", /function\s+normalizeColumnWidthsToTwips\(widthsPx:\s*number\[\]\):\s*number\[\]/],
    ["equalColumns must return Twips[]", /function\s+equalColumns\([^)]*\):\s*number\[\]/],
  ]) {
    if (regex.test(tableBuilder)) {
      details.push(`src/ooxml/builders/table.ts: ${label}.`);
    }
  }

  const documentBuilder = await readFile(resolve(packageDir, "src/ooxml/document.ts"), "utf8");
  if (!/function\s+contentWidthTwips\(page:\s*StructuredPage\):\s*Twips/.test(documentBuilder)) {
    details.push("src/ooxml/document.ts contentWidthTwips must carry the Twips brand.");
  }

  if (details.length > 0) {
    fail("Phase 4 typed-boundary invariants failed.", details);
  }
}

await checkRuntimeDependencies();
await checkDeterministicScopes();
await checkLegacyImports();
await checkPublicBareErrors();
await checkManifestBuckets();
await checkQualityRegistry();
await checkHydrationTreeWalker();
await checkPhase4Boundaries();

console.log("[check-docx-static-gate] OK: static no-human-review invariants passed.");
