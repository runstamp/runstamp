#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import mammoth from "mammoth";
import { validateFile } from "@xarsh/ooxml-validator";

const execFile = promisify(execFileCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, "..");
const manifestPath = resolve(packageDir, "fixtures/docx-engine/level-c-manifest.json");
const outputDir = resolve(packageDir, "output/docx-engine-gate/level-c");
const levelBDir = resolve(packageDir, "output/docx-engine-gate/level-b");
const distEntry = resolve(packageDir, "dist/index.js");
const distProEntry = resolve(packageDir, "dist-pro/index.js");
const stableZipDate = new Date("2000-01-01T00:00:00.000Z");
const args = new Set(process.argv.slice(2));

const {
  hydrateTemplate,
  renderToDocx,
  runDocxQualityGate,
  setDeterministicMode,
  validateDocxBuffer,
} = await import(distEntry).catch((error) => {
  console.error(`[docx-level-c-gate] Failed to import ${distEntry}. Run \`pnpm --filter @runstamp/docx build\` first.`);
  throw error;
});

setDeterministicMode(true);

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function pad(value, width = 3) {
  return String(value).padStart(width, "0");
}

function rel(path) {
  return relative(packageDir, path);
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function allowMissingLibreOffice(manifest) {
  return args.has(manifest.libreOffice.allowMissingFlag) ||
    process.env[manifest.libreOffice.allowMissingEnv] === "1";
}

function allowMissingPro(manifest) {
  return args.has(manifest.pro.allowMissingFlag) ||
    process.env[manifest.pro.allowMissingEnv] === "1";
}

async function commandPath(command) {
  try {
    const { stdout } = await execFile("sh", ["-lc", `command -v ${command}`], { timeout: 10_000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function findLibreOffice() {
  if (process.env.LIBREOFFICE_BIN) {
    return process.env.LIBREOFFICE_BIN;
  }
  return await commandPath("soffice") ?? await commandPath("libreoffice");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function templateParagraph(innerXml) {
  return `<w:p>${innerXml}</w:p>`;
}

async function buildSyntheticWordTemplate(index) {
  const label = `Level C synthetic template ${pad(index)}`;
  const zip = new JSZip();
  const file = (name, content) => zip.file(name, content, { date: stableZipDate });
  const includeHeaderFooter = index % 5 === 0;
  const body = [
    templateParagraph(`<w:r><w:t>{{title}}</w:t></w:r>`),
    templateParagraph(`<w:r><w:t>{{customer.name}}</w:t></w:r><w:r><w:t> / {{items[0].sku}}</w:t></w:r>`),
    index % 3 === 0 ? templateParagraph("<w:r><w:t>{{summary}}</w:t></w:r>") : "",
    index % 4 === 0 ? templateParagraph("<w:r><w:t>{{line_items}}</w:t></w:r>") : "",
  ].join("");
  const headerOverride = includeHeaderFooter
    ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    : "";
  const footerOverride = includeHeaderFooter
    ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    : "";
  const headerRel = includeHeaderFooter
    ? '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
    : "";
  const footerRel = includeHeaderFooter
    ? '<Relationship Id="rId101" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    : "";
  const sectionRefs = includeHeaderFooter
    ? '<w:headerReference w:type="default" r:id="rId100"/><w:footerReference w:type="default" r:id="rId101"/>'
    : "";
  const sectionProperties = `${sectionRefs}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>`;

  file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  ${headerOverride}
  ${footerOverride}
</Types>`,
  );
  file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${headerRel}
  ${footerRel}
</Relationships>`,
  );
  file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}<w:sectPr>${sectionProperties}</w:sectPr></w:body>
</w:document>`,
  );
  file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`,
  );
  if (includeHeaderFooter) {
    file("word/header1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${templateParagraph("<w:r><w:t>{{header}}</w:t></w:r>")}</w:hdr>`);
    file("word/footer1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${templateParagraph("<w:r><w:t>{{footer}}</w:t></w:r>")}</w:ftr>`);
  }

  return {
    id: `level-c-template-${pad(index)}`,
    label,
    buffer: await zip.generateAsync({ type: "nodebuffer", compression: "STORE" }),
    data: {
      title: label,
      customer: { name: `${label} customer` },
      items: [{ sku: `SKU-${pad(index)}` }],
      summary: { type: "richtext", paragraphs: [{ text: `${label} rich text`, bold: true }] },
      line_items: { type: "table", headers: ["SKU", "Qty"], rows: [[`SKU-${pad(index)}`, String(index)]] },
      header: `${label} header`,
      footer: `${label} footer`,
    },
    expectedTextIncludes: [label, `SKU-${pad(index)}`],
  };
}

async function assertDocxAccepted(buffer, docxPath, expectedTextIncludes = []) {
  const strict = await validateDocxBuffer(buffer);
  if (!strict.ok) {
    throw new Error(`${rel(docxPath)} failed validateDocxBuffer: ${JSON.stringify(strict.issues, null, 2)}`);
  }
  const external = await validateFile(docxPath, { officeVersion: "Microsoft365" });
  if (!external.ok) {
    throw new Error(`${rel(docxPath)} failed @xarsh/ooxml-validator: ${JSON.stringify(external.errors ?? external, null, 2)}`);
  }
  const extracted = await mammoth.extractRawText({ buffer });
  for (const expectedText of expectedTextIncludes) {
    if (!extracted.value.includes(expectedText)) {
      throw new Error(`${rel(docxPath)} missing expected text "${expectedText}". Extracted:\n${extracted.value}`);
    }
  }
  return {
    strictIssueCount: strict.issues.length,
    externalOk: external.ok,
    mammothMessageCount: extracted.messages?.length ?? 0,
  };
}

async function runImportMatrix() {
  const freeResult = await renderToDocx({
    type: "DocxDocument",
    pages: [{ elements: [{ type: "paragraph", text: "Level C free import matrix" }] }],
  });
  const freeGate = await runDocxQualityGate({ buffer: freeResult.buffer, renderStats: freeResult.stats });
  if (!freeGate.accepted) {
    throw new Error(`Free import matrix render was rejected: ${JSON.stringify(freeGate.sidecars.manifest, null, 2)}`);
  }

  const matrix = [{
    entry: "free",
    importPath: rel(distEntry),
    renderBytes: freeResult.buffer.length,
    qualityVerdict: freeGate.verdict,
    accepted: freeGate.accepted,
  }];

  if (existsSync(distProEntry)) {
    const proModule = await import(distProEntry);
    if (typeof proModule.renderToDocx !== "function") {
      throw new Error("dist-pro/index.js imported but does not expose renderToDocx");
    }
    if (!process.env.RUNSTAMP_LICENSE_KEY) {
      const manifest = await readJson(manifestPath);
      if (!allowMissingPro(manifest)) {
        throw new Error("Level C release gate requires RUNSTAMP_LICENSE_KEY for the Pro import/render matrix.");
      }
      matrix.push({
        entry: "pro",
        importPath: rel(distProEntry),
        importOk: true,
        renderSkipped: true,
        reason: "RUNSTAMP_LICENSE_KEY is unavailable; Pro render gate is split until credentials are provisioned.",
      });
      await writeFile(join(outputDir, "import-matrix.json"), JSON.stringify(matrix, null, 2));
      return matrix;
    }
    const proResult = await proModule.renderToDocx(
      {
        type: "DocxDocument",
        pages: [{ elements: [{ type: "paragraph", text: "Level C pro import matrix" }] }],
      },
      { licenseKey: process.env.RUNSTAMP_LICENSE_KEY },
    );
    matrix.push({
      entry: "pro",
      importPath: rel(distProEntry),
      renderBytes: proResult.buffer.length,
      accepted: proResult.buffer.length > 0,
    });
  } else {
    const manifest = await readJson(manifestPath);
    if (!allowMissingPro(manifest)) {
      throw new Error("Level C release gate requires a dist-pro build; no Pro artifact was found.");
    }
    matrix.push({
      entry: "pro",
      importPath: rel(distProEntry),
      skipped: true,
      reason: "dist-pro build not present; Pro gate remains split until credentials/build are available.",
    });
  }

  await writeFile(join(outputDir, "import-matrix.json"), JSON.stringify(matrix, null, 2));
  return matrix;
}

async function runSyntheticTemplateCorpus(manifest) {
  const corpusDir = join(outputDir, "synthetic-template-corpus");
  await mkdir(corpusDir, { recursive: true });
  const records = [];

  for (let index = 1; index <= manifest.minSyntheticTemplateCorpus; index += 1) {
    const fixture = await buildSyntheticWordTemplate(index);
    const templatePath = join(corpusDir, `${fixture.id}.template.docx`);
    const hydratedPath = join(corpusDir, `${fixture.id}.hydrated.docx`);
    const qualityPath = join(corpusDir, `${fixture.id}.quality.json`);
    const manifestPathForFixture = join(corpusDir, `${fixture.id}.manifest.json`);
    await writeFile(templatePath, fixture.buffer);
    await assertDocxAccepted(fixture.buffer, templatePath);

    const start = Date.now();
    const hydrated = await hydrateTemplate(fixture.buffer, fixture.data);
    const renderTimeMs = Date.now() - start;
    if (hydrated.unfilled.length > 0) {
      throw new Error(`${fixture.id} left placeholders unfilled: ${hydrated.unfilled.join(", ")}`);
    }
    await writeFile(hydratedPath, hydrated.buffer);
    const validators = await assertDocxAccepted(hydrated.buffer, hydratedPath, fixture.expectedTextIncludes);
    const gate = await runDocxQualityGate({
      buffer: hydrated.buffer,
      renderStats: { renderTimeMs },
      expectedSemanticManifest: {
        id: fixture.id,
        forbiddenFindingCodes: ["DOCX_RELATIONSHIP_TARGET_MISSING", "DOCX_IMAGE_REF_MISSING"],
      },
    });
    if (!gate.accepted) {
      throw new Error(`${fixture.id} rejected by DocxQualityGate: ${JSON.stringify(gate.sidecars.manifest, null, 2)}`);
    }
    await writeFile(qualityPath, JSON.stringify(gate.quality, null, 2));

    const record = {
      id: fixture.id,
      kind: "synthetic-word-template",
      templateSha256: hashBuffer(fixture.buffer),
      hydratedSha256: hashBuffer(hydrated.buffer),
      qualitySha256: hashBuffer(Buffer.from(JSON.stringify(gate.quality, null, 2))),
      renderTimeMs,
      replacedCount: hydrated.replaced.length,
      validators,
      qualityVerdict: gate.verdict,
      artifacts: {
        templateDocx: rel(templatePath),
        hydratedDocx: rel(hydratedPath),
        qualityJson: rel(qualityPath),
        manifestJson: rel(manifestPathForFixture),
      },
    };
    await writeFile(manifestPathForFixture, JSON.stringify(record, null, 2));
    records.push(record);
  }

  return records;
}

async function runLibreOfficeMatrix(levelBSummary, binary, manifest) {
  const renderArtifacts = (levelBSummary.artifacts ?? [])
    .filter((artifact) => artifact.kind === "render")
    .map((artifact) => ({ ...artifact, docxPath: join(levelBDir, `${artifact.id}.docx`) }));

  if (renderArtifacts.length < manifest.minRenderFixtures) {
    throw new Error(`Level C LibreOffice matrix expected at least ${manifest.minRenderFixtures} render artifacts, found ${renderArtifacts.length}`);
  }

  if (!binary) {
    const limitation = {
      status: "environmentLimitation",
      tool: "LibreOffice",
      message: "LibreOffice binary not found; strict release runners must install soffice/libreoffice or set LIBREOFFICE_BIN.",
      renderFixtureCount: renderArtifacts.length,
      requireInReleaseMode: true,
    };
    if (!allowMissingLibreOffice(manifest)) {
      throw new Error(`${limitation.message} Re-run with ${manifest.libreOffice.allowMissingFlag} only for local diagnostic artifacts.`);
    }
    await writeFile(join(outputDir, "libreoffice-roundtrip.json"), JSON.stringify(limitation, null, 2));
    return limitation;
  }

  const roundTripDir = join(outputDir, "libreoffice-roundtrip");
  await mkdir(roundTripDir, { recursive: true });
  const records = [];
  for (const artifact of renderArtifacts) {
    await execFile(binary, ["--headless", "--convert-to", "pdf", "--outdir", roundTripDir, artifact.docxPath], { timeout: 120_000 });
    const pdfPath = join(roundTripDir, `${artifact.id}.pdf`);
    if (!existsSync(pdfPath)) {
      throw new Error(`LibreOffice did not produce ${rel(pdfPath)} for ${artifact.id}`);
    }
    const pdfBytes = await readFile(pdfPath);
    records.push({
      id: artifact.id,
      inputDocx: rel(artifact.docxPath),
      outputPdf: rel(pdfPath),
      inputSha256: artifact.sha256,
      outputPdfSha256: hashBuffer(pdfBytes),
      outputPdfBytes: pdfBytes.length,
    });
  }
  const summary = {
    status: "pass",
    binary,
    renderFixtureCount: records.length,
    records,
  };
  await writeFile(join(outputDir, "libreoffice-roundtrip.json"), JSON.stringify(summary, null, 2));
  return summary;
}

async function collectArtifactHashes() {
  const hashes = [];
  async function visit(dir) {
    const entries = await import("node:fs/promises").then((fs) => fs.readdir(dir, { withFileTypes: true }));
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (![".docx", ".pdf", ".json"].includes(extname(path))) {
        continue;
      }
      const bytes = await readFile(path);
      hashes.push({
        path: rel(path),
        sha256: hashBuffer(bytes),
        bytes: bytes.length,
      });
    }
  }
  await visit(outputDir);
  hashes.sort((a, b) => a.path.localeCompare(b.path));
  await writeFile(join(outputDir, "artifact-manifest.json"), JSON.stringify(hashes, null, 2));
  return hashes;
}

async function main() {
  const manifest = await readJson(manifestPath);
  const levelBSummaryPath = join(levelBDir, "summary.json");
  if (!existsSync(levelBSummaryPath)) {
    throw new Error(`Level C requires Level B artifacts at ${rel(levelBSummaryPath)}. Run \`pnpm --filter @runstamp/docx docx:level-b-gate\` first.`);
  }
  const levelBSummary = await readJson(levelBSummaryPath);
  if (levelBSummary.renderFixtureCount < manifest.minRenderFixtures) {
    throw new Error(`Level C requires ${manifest.minRenderFixtures} render fixtures; Level B summary has ${levelBSummary.renderFixtureCount}.`);
  }
  if (levelBSummary.hydrationFixtureCount < manifest.minHydrationFixtures) {
    throw new Error(`Level C requires ${manifest.minHydrationFixtures} hydration fixtures; Level B summary has ${levelBSummary.hydrationFixtureCount}.`);
  }
  if (levelBSummary.propertyCaseCount < manifest.minPropertyCases) {
    throw new Error(`Level C requires ${manifest.minPropertyCases} property cases; Level B summary has ${levelBSummary.propertyCaseCount}.`);
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const importMatrix = await runImportMatrix();
  const syntheticTemplates = await runSyntheticTemplateCorpus(manifest);
  const libreOfficeBinary = await findLibreOffice();
  const libreOffice = await runLibreOfficeMatrix(levelBSummary, libreOfficeBinary, manifest);
  const artifactHashes = await collectArtifactHashes();
  const renderTimes = (levelBSummary.artifacts ?? []).map((artifact) => artifact.renderTimeMs).filter(Number.isFinite);
  const regressionDashboard = {
    generatedAt: new Date("2000-01-01T00:00:00.000Z").toISOString(),
    level: manifest.level,
    levelB: {
      renderFixtureCount: levelBSummary.renderFixtureCount,
      hydrationFixtureCount: levelBSummary.hydrationFixtureCount,
      propertyCaseCount: levelBSummary.propertyCaseCount,
      p95RenderTimeMs: percentile(renderTimes, 95),
    },
    levelC: {
      syntheticTemplateCount: syntheticTemplates.length,
      importMatrixEntries: importMatrix.length,
      libreOfficeStatus: libreOffice.status,
      artifactHashCount: artifactHashes.length,
      freeBundleBytes: statSync(distEntry).size,
    },
    budgets: manifest.regressionBudgets,
  };
  await writeFile(join(outputDir, "regression-dashboard.json"), JSON.stringify(regressionDashboard, null, 2));

  const rollbackInput = {
    publishBlocked: libreOffice.status === "environmentLimitation",
    reason: libreOffice.status === "environmentLimitation"
      ? "Strict Level C release gate requires LibreOffice round trip before publish."
      : null,
    attachArtifactsFrom: rel(outputDir),
  };
  await writeFile(join(outputDir, "rollback-input.json"), JSON.stringify(rollbackInput, null, 2));

  const summary = {
    generatedAt: new Date("2000-01-01T00:00:00.000Z").toISOString(),
    level: manifest.level,
    levelBRenderFixtures: levelBSummary.renderFixtureCount,
    levelBHydrationFixtures: levelBSummary.hydrationFixtureCount,
    levelBPropertyCases: levelBSummary.propertyCaseCount,
    syntheticTemplateCount: syntheticTemplates.length,
    importMatrix,
    libreOffice,
    artifactHashCount: artifactHashes.length,
    regressionDashboard: rel(join(outputDir, "regression-dashboard.json")),
    artifactManifest: rel(join(outputDir, "artifact-manifest.json")),
    rollbackInput: rel(join(outputDir, "rollback-input.json")),
  };
  await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log(
    `[docx-level-c-gate] PASS: ${levelBSummary.renderFixtureCount} Level B render fixtures, ` +
    `${syntheticTemplates.length} synthetic templates, ${artifactHashes.length} artifact hashes, ` +
    `LibreOffice=${libreOffice.status}.`,
  );
  console.log(`[docx-level-c-gate] Artifacts: ${rel(outputDir)}`);
}

await main();
