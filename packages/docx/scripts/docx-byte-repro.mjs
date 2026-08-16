#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import mammoth from "mammoth";
import { validateFile } from "@xarsh/ooxml-validator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, "..");
const manifestPath = resolve(packageDir, "fixtures/docx-engine/level-a-manifest.json");
const outputDir = resolve(packageDir, "output/docx-engine-gate/level-a");
const distEntry = resolve(packageDir, "dist/index.js");
const stableZipDate = new Date("2000-01-01T00:00:00.000Z");
const pngPixelDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";

const {
  renderToDocx,
  renderToDocxWithQuality,
  hydrateTemplate,
  validateDocxBuffer,
  setDeterministicMode,
} = await import(distEntry).catch((error) => {
  console.error(`[docx-byte-repro] Failed to import ${distEntry}. Run \`pnpm --filter @runstamp/docx build\` first.`);
  throw error;
});

setDeterministicMode(true);

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function baseDoc(overrides) {
  return {
    type: "DocxDocument",
    pageSize: "a4",
    orientation: "portrait",
    pages: [{ elements: [{ type: "paragraph", text: "placeholder" }] }],
    ...overrides,
  };
}

function paragraph(text) {
  return { type: "paragraph", text };
}

function heading(level, text) {
  return { type: "heading", level, text };
}

function buildRenderFixture(id) {
  switch (id) {
    case "render-minimal-paragraph":
      return baseDoc({ pages: [{ elements: [paragraph("Hello, world.")] }] });
    case "render-headings":
      return baseDoc({
        pages: [{ elements: Array.from({ length: 6 }, (_, index) => heading(index + 1, `Heading level ${index + 1}`)) }],
      });
    case "render-inline-runs":
      return baseDoc({
        pages: [{
          elements: [{
            type: "paragraph",
            runs: [
              { text: "This is ", style: {} },
              { text: "bold", style: { fontWeight: "bold" } },
              { text: " and ", style: {} },
              { text: "italic", style: { fontStyle: "italic" } },
              { text: " text", style: {} },
            ],
          }],
        }],
      });
    case "render-bullet-list":
      return baseDoc({
        pages: [{ elements: [{ type: "list", listType: "bullet", items: [{ text: "Apple" }, { text: "Banana" }, { text: "Cherry" }] }] }],
      });
    case "render-nested-list":
      return baseDoc({
        pages: [{
          elements: [{
            type: "list",
            listType: "bullet",
            items: [
              { text: "Parent", nestedList: { type: "list", listType: "number", items: [{ text: "Nested 1" }, { text: "Nested 2" }] } },
            ],
          }],
        }],
      });
    case "render-basic-table":
      return baseDoc({
        pages: [{
          elements: [{
            type: "table",
            repeatHeaders: true,
            rows: [
              { isHeader: true, cells: [{ text: "Year" }, { text: "Revenue" }] },
              { cells: [{ text: "2024" }, { text: "$12M" }] },
              { cells: [{ text: "2025" }, { text: "$15M" }] },
            ],
          }],
        }],
      });
    case "render-merged-table":
      return baseDoc({
        pages: [{
          elements: [{
            type: "table",
            rows: [
              { isHeader: true, cells: [{ text: "Year" }, { text: "Revenue" }, { text: "Notes" }] },
              { cells: [{ text: "2024" }, { text: "$12M" }, { text: "spanning", rowSpan: 2 }] },
              { cells: [{ text: "2025" }, { text: "$15M" }] },
              { cells: [{ text: "total", colSpan: 2 }, { text: "$27M" }] },
            ],
          }],
        }],
      });
    case "render-inline-image":
      return baseDoc({
        pages: [{ elements: [paragraph("Before image"), { type: "image", src: pngPixelDataUri, alt: "pixel", width: 72, height: 72 }, paragraph("After image")] }],
      });
    case "render-bar-chart":
      return baseDoc({
        pages: [{
          elements: [
            paragraph("Sales"),
            {
              type: "chart",
              chartType: "bar",
              title: "Sales",
              series: [{ name: "Revenue", values: [10, 20, 30], color: "#336699" }],
              categories: ["Q1", "Q2", "Q3"],
              width: 360,
              height: 240,
            },
          ],
        }],
      });
    case "render-shapes":
      return baseDoc({
        pages: [{
          elements: [
            paragraph("Shape fixture"),
            { type: "shape", shapeType: "rectangle", width: 100, height: 60, fill: { type: "solid", color: "AABBCC" } },
            { type: "shape", shapeType: "line", width: 120, height: 1 },
          ],
        }],
      });
    case "render-toc-bookmarks":
      return baseDoc({
        tableOfContents: { maxLevel: 2 },
        pages: [{ elements: [heading(1, "Chapter 1"), paragraph("Body 1"), heading(1, "Chapter 2"), paragraph("Body 2")] }],
      });
    case "render-header-footer":
      return baseDoc({
        header: { text: "Global Header" },
        footer: { text: "Global Footer", includePageNumber: true },
        pages: [{ elements: [paragraph("Body content")] }],
      });
    case "render-footnote":
      return baseDoc({ pages: [{ elements: [{ type: "paragraph", text: "See footnote.", footnote: "Footnote content." }] }] });
    case "render-comments":
      return baseDoc({
        pages: [{
          elements: [{
            type: "paragraph",
            text: "Comment anchor",
            comment: { id: 7, text: "Review this clause.", author: "Reviewer", initials: "RV", date: "2026-05-13T00:00:00Z" },
          }],
        }],
      });
    case "render-track-changes":
      return baseDoc({
        options: { trackChanges: true },
        revisionInfo: { author: "Runstamp", date: "2026-05-13T00:00:00Z", rsid: "ABCDEF01" },
        pages: [{
          elements: [{
            type: "paragraph",
            runs: [
              { text: "original ", style: {} },
              { text: "inserted", style: {}, revision: { type: "insert", id: 1, author: "Runstamp", date: "2026-05-13T00:00:00Z" } },
              { text: " tail", style: {} },
            ],
          }],
        }],
      });
    case "render-rtl":
      return baseDoc({ pages: [{ elements: [paragraph("مرحبا بالعالم")] }] });
    case "render-cjk":
      return baseDoc({ pages: [{ elements: [paragraph("こんにちは 世界"), paragraph("你好 世界")] }] });
    case "render-xml-hostile-text":
      return baseDoc({ pages: [{ elements: [paragraph("5 < 7 & 9 > 3 with \"quoted\" text")] }] });
    case "render-code-block":
      return baseDoc({
        pages: [{ elements: [{ type: "code-block", language: "typescript", code: "function f(x: number): number {\n  return x + 1;\n}\n" }] }],
      });
    case "render-divider-container":
      return baseDoc({
        pages: [{
          elements: [
            paragraph("Above"),
            { type: "divider", style: "dashed" },
            { type: "container", layout: "vertical", children: [paragraph("nested 1"), paragraph("nested 2")] },
            { type: "page-break" },
            paragraph("After page break"),
          ],
        }],
      });
    case "render-watermark":
      return baseDoc({ watermark: "CONFIDENTIAL", pages: [{ elements: [paragraph("Body text with watermark.")] }] });
    case "render-metadata-accessibility":
      return baseDoc({
        metadata: { title: "A11y Doc", author: "Runstamp", language: "en-US" },
        accessible: { level: "AA", language: "en-US" },
        pages: [{ elements: [heading(1, "Accessible Title")] }],
      });
    case "render-multi-page":
      return baseDoc({
        pages: [
          { elements: [heading(1, "Page One")] },
          { elements: [heading(1, "Page Two")], sectionBreak: "nextPage" },
          { elements: [heading(1, "Page Three")], sectionBreak: "nextPage" },
        ],
      });
    case "render-medium-table":
      return baseDoc({
        pages: [{
          elements: [{
            type: "table",
            rows: Array.from({ length: 50 }, (_, rowIndex) => ({
              cells: Array.from({ length: 12 }, (_, colIndex) => ({ text: `Row ${rowIndex + 1} Col ${colIndex + 1}` })),
            })),
          }],
        }],
      });
    case "render-large-document":
      return baseDoc({
        pages: [{
          elements: Array.from({ length: 1000 }, (_, index) => paragraph(`Paragraph ${index + 1}`)),
        }],
      });
    default:
      throw new Error(`No render fixture builder registered for ${id}`);
  }
}

function templateParagraph(innerXml) {
  return `<w:p>${innerXml}</w:p>`;
}

async function buildTemplateDocx({ body, header }) {
  const zip = new JSZip();
  const file = (name, content) => zip.file(name, content, { date: stableZipDate });
  const headerOverride = header
    ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    : "";
  const headerRel = header
    ? '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
    : "";
  const sectionHeader = header ? '<w:sectPr><w:headerReference w:type="default" r:id="rId100"/></w:sectPr>' : "<w:sectPr/>";

  file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  ${headerOverride}
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
</Relationships>`,
  );
  file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}${sectionHeader}</w:body>
</w:document>`,
  );
  if (header) {
    file(
      "word/header1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${header}</w:hdr>`,
    );
  }
  file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}

async function buildHydrationFixture(id) {
  switch (id) {
    case "hydrate-simple-text":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>Dear {{name}},</w:t></w:r>") }),
        data: { name: "Ada" },
      };
    case "hydrate-split-identical-runs":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{</w:t></w:r><w:r><w:t>client</w:t></w:r><w:r><w:t>}}</w:t></w:r>") }),
        data: { client: "Acme Inc." },
      };
    case "hydrate-split-different-rpr":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{customer_</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>display</w:t></w:r><w:r><w:t>_name}}</w:t></w:r>") }),
        data: { customer_display_name: "Acme Display" },
      };
    case "hydrate-prooferr-interrupted":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{</w:t></w:r><w:proofErr w:type=\"spellStart\"/><w:r><w:t>clean_value</w:t></w:r><w:proofErr w:type=\"spellEnd\"/><w:r><w:t>}}</w:t></w:r>") }),
        data: { clean_value: "Clean Value" },
      };
    case "hydrate-bookmark-interrupted":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{</w:t></w:r><w:bookmarkStart w:id=\"1\" w:name=\"mark\"/><w:r><w:t>marked_value</w:t></w:r><w:bookmarkEnd w:id=\"1\"/><w:r><w:t>}}</w:t></w:r>") }),
        data: { marked_value: "Marked Value" },
      };
    case "hydrate-header":
      return {
        template: await buildTemplateDocx({
          body: templateParagraph("<w:r><w:t>Body</w:t></w:r>"),
          header: templateParagraph("<w:r><w:t>{{header_line}}</w:t></w:r>"),
        }),
        data: { header_line: "Confidential" },
      };
    case "hydrate-table-replacement":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{items}}</w:t></w:r>") }),
        data: { items: { type: "table", headers: ["SKU", "Qty"], rows: [["A-1", "4"]], style: "bordered" } },
      };
    case "hydrate-richtext":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{summary}}</w:t></w:r>") }),
        data: { summary: { type: "richtext", paragraphs: [{ text: "Executive summary", bold: true }] } },
      };
    case "hydrate-office-format":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{d.amount:format(0,0.00)}</w:t></w:r>") }),
        data: { amount: 1234.5 },
        options: { syntax: "office" },
      };
    case "hydrate-xml-hostile-text":
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{value}}</w:t></w:r>") }),
        data: { value: "5 < 7 & 9 > 3" },
      };
    default:
      throw new Error(`No hydration fixture builder registered for ${id}`);
  }
}

async function assertDocxAcceptable(buffer, fixture) {
  const strict = await validateDocxBuffer(buffer);
  if (!strict.ok) {
    throw new Error(`${fixture.id}: validateDocxBuffer rejected output: ${JSON.stringify(strict.issues, null, 2)}`);
  }

  const docxPath = join(outputDir, `${fixture.id}.docx`);
  await writeFile(docxPath, buffer);

  const external = await validateFile(docxPath, { officeVersion: "Microsoft365" });
  if (!external.ok) {
    throw new Error(`${fixture.id}: @xarsh/ooxml-validator rejected output: ${JSON.stringify(external.errors ?? external, null, 2)}`);
  }

  const extracted = await mammoth.extractRawText({ buffer });
  for (const expectedText of fixture.expected.textIncludes) {
    if (!extracted.value.includes(expectedText)) {
      throw new Error(`${fixture.id}: mammoth text extraction missing "${expectedText}". Extracted:\n${extracted.value}`);
    }
  }
  return { strict, external, mammothMessages: extracted.messages ?? [] };
}

function assertWarningCodes(result, fixture) {
  const actual = new Set((result.warnings ?? []).map((warning) => warning.code));
  for (const expectedCode of fixture.expected.warningCodes ?? []) {
    if (!actual.has(expectedCode)) {
      throw new Error(`${fixture.id}: expected warning code ${expectedCode}, saw ${[...actual].join(", ") || "(none)"}`);
    }
  }
}

function assertBudget(record, fixture) {
  if (record.renderTimeMs > fixture.expected.maxRenderMs) {
    throw new Error(`${fixture.id}: render time ${record.renderTimeMs}ms exceeded budget ${fixture.expected.maxRenderMs}ms`);
  }
  if (record.byteSize > fixture.expected.maxBytes) {
    throw new Error(`${fixture.id}: byte size ${record.byteSize} exceeded budget ${fixture.expected.maxBytes}`);
  }
}

async function runRenderFixture(fixture) {
  const doc = buildRenderFixture(fixture.id);
  const first = await renderToDocx(doc);
  const second = await renderToDocx(doc);
  const firstHash = hashBuffer(first.buffer);
  const secondHash = hashBuffer(second.buffer);
  if (firstHash !== secondHash) {
    await writeByteDiffArtifacts(fixture.id, first.buffer, second.buffer);
    throw new Error(`${fixture.id}: double-render bytes differ: ${firstHash} !== ${secondHash}`);
  }
  assertWarningCodes(first, fixture);
  const validators = await assertDocxAcceptable(first.buffer, fixture);
  const withQuality = await renderToDocxWithQuality(doc);
  const verdict = withQuality.quality.verdict;
  if (verdict === "rejected" || verdict === "visual_fallback") {
    throw new Error(`${fixture.id}: quality verdict ${verdict} is not accepted for Level A`);
  }
  const record = {
    id: fixture.id,
    kind: fixture.kind,
    features: fixture.features,
    sha256: firstHash,
    byteSize: first.buffer.length,
    renderTimeMs: first.stats.renderTimeMs,
    warningCodes: (first.warnings ?? []).map((warning) => warning.code),
    qualityVerdict: verdict,
    validators: {
      strictIssueCount: validators.strict.issues.length,
      externalOk: validators.external.ok,
      mammothMessageCount: validators.mammothMessages.length,
    },
  };
  assertBudget(record, fixture);
  await writeFile(join(outputDir, `${fixture.id}.quality.json`), JSON.stringify(withQuality.quality, null, 2));
  await writeFile(join(outputDir, `${fixture.id}.manifest.json`), JSON.stringify(record, null, 2));
  return record;
}

async function writeByteDiffArtifacts(fixtureId, firstBuffer, secondBuffer) {
  const firstPath = join(outputDir, `${fixtureId}.first.docx`);
  const secondPath = join(outputDir, `${fixtureId}.second.docx`);
  await writeFile(firstPath, firstBuffer);
  await writeFile(secondPath, secondBuffer);

  const firstZip = await JSZip.loadAsync(firstBuffer);
  const secondZip = await JSZip.loadAsync(secondBuffer);
  const entryNames = Array.from(new Set([
    ...Object.keys(firstZip.files),
    ...Object.keys(secondZip.files),
  ])).sort();
  const diffs = [];
  for (const name of entryNames) {
    const firstEntry = firstZip.files[name];
    const secondEntry = secondZip.files[name];
    if (!firstEntry || !secondEntry) {
      diffs.push({ name, firstMissing: !firstEntry, secondMissing: !secondEntry });
      continue;
    }
    if (firstEntry.dir || secondEntry.dir) {
      if (
        firstEntry.dir !== secondEntry.dir ||
        firstEntry.date.getTime() !== secondEntry.date.getTime() ||
        firstEntry.comment !== secondEntry.comment
      ) {
        diffs.push({
          name,
          firstDir: firstEntry.dir,
          secondDir: secondEntry.dir,
          firstDate: firstEntry.date.toISOString(),
          secondDate: secondEntry.date.toISOString(),
          firstComment: firstEntry.comment,
          secondComment: secondEntry.comment,
        });
      }
      continue;
    }
    const [firstEntryBuffer, secondEntryBuffer] = await Promise.all([
      firstEntry.async("nodebuffer"),
      secondEntry.async("nodebuffer"),
    ]);
    const firstEntryHash = hashBuffer(firstEntryBuffer);
    const secondEntryHash = hashBuffer(secondEntryBuffer);
    if (firstEntryHash !== secondEntryHash) {
      diffs.push({
        name,
        firstSha256: firstEntryHash,
        secondSha256: secondEntryHash,
        firstBytes: firstEntryBuffer.byteLength,
        secondBytes: secondEntryBuffer.byteLength,
      });
    }
  }
  await writeFile(
    join(outputDir, `${fixtureId}.byte-diff.json`),
    JSON.stringify({ fixtureId, firstPath, secondPath, diffs }, null, 2),
  );
}

async function runHydrationFixture(fixture) {
  const { template, data, options } = await buildHydrationFixture(fixture.id);
  // lint-allow-nondeterministic: perf timer only; value is benchmark metadata, not output bytes
  const start = Date.now();
  const result = await hydrateTemplate(template, data, options ?? {});
  // lint-allow-nondeterministic: perf timer diff
  const renderTimeMs = Date.now() - start;
  if (result.unfilled.length > 0) {
    throw new Error(`${fixture.id}: hydration left placeholders unfilled: ${result.unfilled.join(", ")}`);
  }
  const validators = await assertDocxAcceptable(result.buffer, fixture);
  const record = {
    id: fixture.id,
    kind: fixture.kind,
    features: fixture.features,
    sha256: hashBuffer(result.buffer),
    byteSize: result.buffer.length,
    renderTimeMs,
    warningCodes: result.warnings ?? [],
    qualityVerdict: "accepted",
    replaced: result.replaced,
    validators: {
      strictIssueCount: validators.strict.issues.length,
      externalOk: validators.external.ok,
      mammothMessageCount: validators.mammothMessages.length,
    },
  };
  assertBudget(record, fixture);
  await writeFile(join(outputDir, `${fixture.id}.quality.json`), JSON.stringify({ verdict: "accepted", findings: [] }, null, 2));
  await writeFile(join(outputDir, `${fixture.id}.manifest.json`), JSON.stringify(record, null, 2));
  return record;
}

async function warmUpEngine() {
  const doc = baseDoc({ pages: [{ elements: [paragraph("warm up")] }] });
  await renderToDocx(doc);
  await renderToDocxWithQuality(doc);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await warmUpEngine();

const records = [];
for (const fixture of manifest.renderFixtures) {
  records.push(await runRenderFixture(fixture));
}
for (const fixture of manifest.hydrationFixtures) {
  records.push(await runHydrationFixture(fixture));
}

const summary = {
  generatedAt: new Date("2000-01-01T00:00:00.000Z").toISOString(),
  level: manifest.level,
  fixtureCount: records.length,
  renderFixtureCount: manifest.renderFixtures.length,
  hydrationFixtureCount: manifest.hydrationFixtures.length,
  artifacts: records,
};
await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log(`[docx-byte-repro] PASS: ${records.length} fixtures rendered/hydrated with byte, structural, text, quality, and budget artifacts.`);
console.log(`[docx-byte-repro] Artifacts: ${relativePath(outputDir)}`);

function relativePath(path) {
  return path.startsWith(process.cwd()) ? path.slice(process.cwd().length + 1) : path;
}
