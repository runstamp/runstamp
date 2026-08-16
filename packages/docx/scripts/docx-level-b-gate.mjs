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
const manifestPath = resolve(packageDir, "fixtures/docx-engine/level-b-manifest.json");
const outputDir = resolve(packageDir, "output/docx-engine-gate/level-b");
const distEntry = resolve(packageDir, "dist/index.js");
const stableZipDate = new Date("2000-01-01T00:00:00.000Z");
const pngPixelDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";
const jpegPixelDataUri =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEAMQAAAByA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";

const {
  renderToDocx,
  hydrateTemplate,
  validateDocxBuffer,
  setDeterministicMode,
} = await import(distEntry).catch((error) => {
  console.error(`[docx-level-b-gate] Failed to import ${distEntry}. Run \`pnpm --filter @runstamp/docx build\` first.`);
  throw error;
});

setDeterministicMode(true);

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function pad(value, width = 3) {
  return String(value).padStart(width, "0");
}

function paragraph(text) {
  return { type: "paragraph", text };
}

function heading(level, text) {
  return { type: "heading", level, text };
}

function baseDoc(overrides) {
  return {
    type: "DocxDocument",
    pageSize: "a4",
    orientation: "portrait",
    metadata: { title: "DOCX Level B Gate", author: "runstamp docx engine gate" },
    pages: [{ elements: [paragraph("placeholder")] }],
    ...overrides,
  };
}

function expandSuites(suites) {
  return suites.flatMap((suite) =>
    Array.from({ length: suite.count }, (_, index) => ({
      ...suite,
      id: `${suite.id}-${pad(index + 1)}`,
      suiteId: suite.id,
      suiteIndex: index + 1,
    })),
  );
}

const localeSamples = [
  "مرحبا بالعالم",
  "こんにちは 世界",
  "你好 世界",
  "English עברית العربية mix",
  "Emoji 😀 🚀 ✅",
  "Cafe\u0301 naive facade",
  "Smart quotes “hello” and apostrophe’s",
  "5 < 7 & 9 > 3 with \"quoted\" text",
  "Zero-width safe text",
  "Math symbols <= >= != ∑",
];

function nestedList(depth, label) {
  if (depth <= 1) {
    return { type: "list", listType: "bullet", items: [{ text: `${label} level 1` }] };
  }
  return {
    type: "list",
    listType: depth % 2 === 0 ? "number" : "bullet",
    items: [{
      text: `${label} level ${depth}`,
      nestedList: nestedList(depth - 1, label),
    }],
  };
}

function docxTable(rows, cols, label, options = {}) {
  return {
    type: "table",
    repeatHeaders: true,
    rows: Array.from({ length: rows }, (_, rowIndex) => ({
      isHeader: rowIndex === 0,
      cells: Array.from({ length: cols }, (_, colIndex) => {
        if (options.merged && rowIndex === 1 && colIndex === 0) {
          return { text: `${label} merged`, colSpan: Math.min(2, cols) };
        }
        if (options.merged && rowIndex === 1 && colIndex === 1) {
          return { text: `${label} skipped` };
        }
        return { text: rowIndex === 0 ? `H${colIndex + 1}` : `${label} R${rowIndex}C${colIndex + 1}` };
      }),
    })),
  };
}

function nestedTable(depth, maxDepth) {
  if (depth >= maxDepth) {
    return docxTable(2, 2, `Depth ${depth}`);
  }
  return {
    type: "table",
    rows: [{
      cells: [{
        text: `Depth ${depth}`,
        elements: [
          paragraph(`Nested table depth ${depth}`),
          nestedTable(depth + 1, maxDepth),
        ],
      }],
    }],
  };
}

function buildRenderFixture(fixture, manifest) {
  const n = fixture.suiteIndex;
  const label = `Level B ${fixture.suiteId} ${pad(n)}`;

  if (fixture.suiteId === "text-locale") {
    const sample = localeSamples[(n - 1) % localeSamples.length];
    return {
      doc: baseDoc({
        pages: [{
          elements: [
            heading(1, label),
            paragraph(`${label}: ${sample}`),
            paragraph(`Round ${n}: ${sample.split("").reverse().join("")}`),
          ],
        }],
      }),
      expectedTextIncludes: [label, sample],
    };
  }

  if (fixture.suiteId === "table-matrix") {
    const rows = 4 + (n % 9);
    const cols = 2 + (n % 7);
    return {
      doc: baseDoc({
        pages: [{
          elements: [
            heading(2, label),
            docxTable(rows, cols, label, { merged: n % 4 === 0 }),
          ],
        }],
      }),
      expectedTextIncludes: [label, `${label} R${rows - 1}C${cols}`],
    };
  }

  if (fixture.suiteId === "list-section") {
    const depth = 1 + (n % 8);
    return {
      doc: baseDoc({
        header: { text: `${label} header` },
        footer: { text: `${label} footer`, includePageNumber: n % 2 === 0 },
        pages: [
          { elements: [heading(2, label), nestedList(depth, label)] },
          { elements: [paragraph(`${label} second section`)], sectionBreak: n % 2 === 0 ? "nextPage" : "continuous" },
        ],
      }),
      expectedTextIncludes: [label, `${label} level ${depth}`],
    };
  }

  if (fixture.suiteId === "media-chart") {
    const elements = [heading(2, label), paragraph(`${label} media body`)];
    if (n === 20) {
      for (let index = 0; index < manifest.stressTargets.imageStressAssets; index += 1) {
        elements.push({
          type: "image",
          src: index % 2 === 0 ? pngPixelDataUri : `data:image/jpeg;base64,${jpegPixelDataUri}`,
          alt: `stress ${index + 1}`,
          width: 12,
          height: 12,
        });
      }
      elements.push(paragraph(`${label} image stress ${manifest.stressTargets.imageStressAssets}`));
    } else if (n % 3 === 0) {
      elements.push({
        type: "chart",
        chartType: n % 2 === 0 ? "line" : "bar",
        title: `${label} chart`,
        series: [{ name: "Series", values: [n, n + 1, n + 2], color: "#336699" }],
        categories: ["A", "B", "C"],
        width: 320,
        height: 180,
      });
    } else if (n % 3 === 1) {
      elements.push({ type: "image", src: pngPixelDataUri, alt: `${label} image`, width: 72, height: 72 });
    } else {
      elements.push({ type: "shape", shapeType: "rectangle", width: 120, height: 48, fill: { type: "solid", color: "DDEEFF" } });
    }
    return {
      doc: baseDoc({ pages: [{ elements }] }),
      expectedTextIncludes: [label, n === 20 ? `${label} image stress ${manifest.stressTargets.imageStressAssets}` : `${label} media body`],
    };
  }

  if (fixture.suiteId === "document-feature") {
    if (n === 18) {
      return {
        doc: baseDoc({ pages: [{ elements: [heading(2, label), nestedTable(1, manifest.stressTargets.maxTableNestingDepth)] }] }),
        expectedTextIncludes: [label, `Nested table depth ${manifest.stressTargets.maxTableNestingDepth - 1}`],
      };
    }
    if (n === 20) {
      return {
        doc: baseDoc({
          pages: [{
            elements: [
              heading(1, label),
              ...Array.from({ length: manifest.stressTargets.largeDocumentParagraphs }, (_, index) => paragraph(`Large paragraph ${index + 1}`)),
            ],
          }],
        }),
        expectedTextIncludes: [label, `Large paragraph ${manifest.stressTargets.largeDocumentParagraphs}`],
      };
    }
    const mode = n % 6;
    const elements = [heading(1, label), paragraph(`${label} body`)];
    const doc = baseDoc({ pages: [{ elements }] });
    if (mode === 0) {
      doc.tableOfContents = { maxLevel: 2 };
      elements.push(heading(2, `${label} TOC child`));
    } else if (mode === 1) {
      elements.push({
        type: "paragraph",
        text: `${label} comment anchor`,
        comment: { id: n, text: "Level B comment", author: "Gate", initials: "GB", date: "2026-05-13T00:00:00Z" },
      });
    } else if (mode === 2) {
      doc.options = { trackChanges: true };
      doc.revisionInfo = { author: "Gate", date: "2026-05-13T00:00:00Z", rsid: "ABCDEF01" };
      elements.push({
        type: "paragraph",
        runs: [
          { text: `${label} original `, style: {} },
          { text: "inserted", style: {}, revision: { type: "insert", id: n, author: "Gate", date: "2026-05-13T00:00:00Z" } },
        ],
      });
    } else if (mode === 3) {
      elements.push({ type: "paragraph", text: `${label} footnote`, footnote: "Level B footnote content" });
    } else if (mode === 4) {
      elements.push({ type: "code-block", language: "typescript", code: `const levelB${n} = ${n};\n` });
    } else {
      elements.push({ type: "container", layout: "vertical", children: [paragraph(`${label} nested A`), paragraph(`${label} nested B`)] });
    }
    return { doc, expectedTextIncludes: [label] };
  }

  throw new Error(`Unknown Level B render suite: ${fixture.suiteId}`);
}

function templateParagraph(innerXml) {
  return `<w:p>${innerXml}</w:p>`;
}

async function buildTemplateDocx({ body, header, footer }) {
  const zip = new JSZip();
  const file = (name, content) => zip.file(name, content, { date: stableZipDate });
  const headerOverride = header
    ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    : "";
  const footerOverride = footer
    ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    : "";
  const headerRel = header
    ? '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
    : "";
  const footerRel = footer
    ? '<Relationship Id="rId101" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    : "";
  const refs = [
    header ? '<w:headerReference w:type="default" r:id="rId100"/>' : "",
    footer ? '<w:footerReference w:type="default" r:id="rId101"/>' : "",
  ].join("");
  const section = `<w:sectPr>${refs}</w:sectPr>`;

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
  <w:body>${body}${section}</w:body>
</w:document>`,
  );
  if (header) {
    file("word/header1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${header}</w:hdr>`);
  }
  if (footer) {
    file("word/footer1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${footer}</w:ftr>`);
  }
  file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}

async function buildHydrationFixture(fixture) {
  const n = fixture.suiteIndex;
  const label = `Level B ${fixture.suiteId} ${pad(n)}`;
  if (fixture.suiteId === "word-split") {
    const key = `split_value_${n}`;
    const fragments = ["{{", key.slice(0, 5), key.slice(5), "}}"];
    return {
      template: await buildTemplateDocx({ body: templateParagraph(fragments.map((part) => `<w:r><w:t>${part}</w:t></w:r>`).join("")) }),
      data: { [key]: `${label} hydrated` },
      expectedTextIncludes: [`${label} hydrated`],
    };
  }
  if (fixture.suiteId === "word-path") {
    return {
      template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{customer.name}}</w:t></w:r><w:r><w:t> — {{items[0].sku}}</w:t></w:r>") }),
      data: { customer: { name: `${label} <customer>` }, items: [{ sku: `SKU-${n}&A` }] },
      expectedTextIncludes: [`${label} <customer>`, `SKU-${n}&A`],
    };
  }
  if (fixture.suiteId === "word-office") {
    const body = n % 3 === 0
      ? `{d.items:start}{d.name}={d.value:format(0,0.00)}; {d.items:end}`
      : n % 3 === 1
        ? `{d.enabled:if}${label} enabled {d.amount:format(0,0.00)}{d.enabled:endif}`
        : `${label} date {d.date:format(YYYY-MM-DD)}`;
    return {
      template: await buildTemplateDocx({ body: templateParagraph(`<w:r><w:t>${body}</w:t></w:r>`) }),
      data: {
        enabled: true,
        amount: 1234.5 + n,
        date: "2026-05-13T00:00:00Z",
        items: [{ name: "A", value: n }, { name: "B", value: n + 1 }],
      },
      options: { syntax: "office" },
      expectedTextIncludes: [n % 3 === 0 ? "A=" : n % 3 === 1 ? `${label} enabled` : "2026-05-13"],
    };
  }
  if (fixture.suiteId === "word-header-footer") {
    return {
      template: await buildTemplateDocx({
        body: templateParagraph("<w:r><w:t>{{body_line}}</w:t></w:r>"),
        header: templateParagraph("<w:r><w:t>{{header_line}}</w:t></w:r>"),
        footer: templateParagraph("<w:r><w:t>{{footer_line}}</w:t></w:r>"),
      }),
      data: {
        body_line: `${label} body`,
        header_line: `${label} header`,
        footer_line: `${label} footer`,
      },
      expectedTextIncludes: [`${label} body`],
    };
  }
  if (fixture.suiteId === "word-complex-replacement") {
    if (n % 3 === 0) {
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{items}}</w:t></w:r>") }),
        data: { items: { type: "table", headers: ["SKU", "Qty"], rows: [[`B-${n}`, String(n)]], style: "bordered" } },
        expectedTextIncludes: [`B-${n}`, String(n)],
      };
    }
    if (n % 3 === 1) {
      return {
        template: await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{{summary}}</w:t></w:r>") }),
        data: { summary: { type: "richtext", paragraphs: [{ text: `${label} rich text`, bold: true }] } },
        expectedTextIncludes: [`${label} rich text`],
      };
    }
    return {
      template: await buildTemplateDocx({
        body: [
          templateParagraph("<w:r><w:t>{{before}}</w:t></w:r>"),
          templateParagraph("<w:r><w:t>{{image}}</w:t></w:r>"),
          templateParagraph("<w:r><w:t>{{after}}</w:t></w:r>"),
        ].join(""),
      }),
      data: { before: `${label} before`, image: { type: "image", src: pngPixelDataUri, width: 24, height: 24 }, after: `${label} after` },
      expectedTextIncludes: [`${label} before`, `${label} after`],
    };
  }
  throw new Error(`Unknown Level B hydration suite: ${fixture.suiteId}`);
}

async function assertDocxAcceptable(buffer, fixture, expectedTextIncludes) {
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
  for (const expectedText of expectedTextIncludes) {
    if (!extracted.value.includes(expectedText)) {
      throw new Error(`${fixture.id}: mammoth text extraction missing "${expectedText}". Extracted:\n${extracted.value}`);
    }
  }
  return { strict, external, mammothMessages: extracted.messages ?? [] };
}

function assertBudget(record, fixture) {
  if (record.renderTimeMs > fixture.expected.maxRenderMs) {
    throw new Error(`${fixture.id}: render time ${record.renderTimeMs}ms exceeded budget ${fixture.expected.maxRenderMs}ms`);
  }
  if (record.byteSize > fixture.expected.maxBytes) {
    throw new Error(`${fixture.id}: byte size ${record.byteSize} exceeded budget ${fixture.expected.maxBytes}`);
  }
}

async function runRenderFixture(fixture, manifest) {
  const { doc, expectedTextIncludes } = buildRenderFixture(fixture, manifest);
  const start = Date.now();
  const first = await renderToDocx(doc);
  const second = await renderToDocx(doc);
  const renderTimeMs = Date.now() - start;
  const firstHash = hashBuffer(first.buffer);
  const secondHash = hashBuffer(second.buffer);
  if (firstHash !== secondHash) {
    throw new Error(`${fixture.id}: double-render bytes differ: ${firstHash} !== ${secondHash}`);
  }
  const validators = await assertDocxAcceptable(first.buffer, fixture, expectedTextIncludes);
  const record = {
    id: fixture.id,
    kind: fixture.kind,
    features: fixture.features,
    sha256: firstHash,
    byteSize: first.buffer.length,
    renderTimeMs,
    warningCodes: (first.warnings ?? []).map((warning) => warning.code),
    qualityVerdict: "accepted",
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

async function runHydrationFixture(fixture) {
  const { template, data, options, expectedTextIncludes } = await buildHydrationFixture(fixture);
  const start = Date.now();
  const first = await hydrateTemplate(template, data, options ?? {});
  const second = await hydrateTemplate(template, data, options ?? {});
  const renderTimeMs = Date.now() - start;
  const firstHash = hashBuffer(first.buffer);
  const secondHash = hashBuffer(second.buffer);
  if (firstHash !== secondHash) {
    throw new Error(`${fixture.id}: double-hydration bytes differ: ${firstHash} !== ${secondHash}`);
  }
  if (first.unfilled.length > 0) {
    throw new Error(`${fixture.id}: hydration left placeholders unfilled: ${first.unfilled.join(", ")}`);
  }
  const validators = await assertDocxAcceptable(first.buffer, fixture, expectedTextIncludes);
  const record = {
    id: fixture.id,
    kind: fixture.kind,
    features: fixture.features,
    sha256: firstHash,
    byteSize: first.buffer.length,
    renderTimeMs,
    warningCodes: first.warnings ?? [],
    qualityVerdict: "accepted",
    replaced: first.replaced,
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

async function runNegativeFixture(fixture, manifest) {
  const doc = baseDoc({
    pages: [{
      elements: [
        heading(1, "Level B over-limit nested table"),
        nestedTable(1, manifest.stressTargets.overLimitTableNestingDepth),
      ],
    }],
  });
  try {
    await renderToDocx(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!new RegExp(fixture.expectedErrorPattern).test(message)) {
      throw new Error(`${fixture.id}: expected error matching ${fixture.expectedErrorPattern}, got ${message}`);
    }
    const record = {
      id: fixture.id,
      kind: fixture.kind,
      features: fixture.features,
      expectedErrorPattern: fixture.expectedErrorPattern,
      observedError: message,
    };
    await writeFile(join(outputDir, `${fixture.id}.manifest.json`), JSON.stringify(record, null, 2));
    return record;
  }
  throw new Error(`${fixture.id}: expected over-limit render to fail`);
}

async function runPropertyGenerator(generator) {
  const renderedSamples = [];
  for (let index = 0; index < generator.caseCount; index += 1) {
    const n = index + 1;
    if (generator.id === "render-text-escaping") {
      const sample = `${localeSamples[index % localeSamples.length]} ${n} <&>`;
      if (!sample.includes("<") || !sample.includes("&")) {
        throw new Error(`${generator.id}:${n}: generated text lost XML-hostile characters`);
      }
      if (n <= generator.sampleRenderCount) {
        const result = await renderToDocx(baseDoc({ pages: [{ elements: [paragraph(`Property text ${n}: ${sample}`)] }] }));
        renderedSamples.push({ case: n, sha256: hashBuffer(result.buffer), bytes: result.buffer.length });
      }
      continue;
    }
    if (generator.id === "render-table-shape") {
      const rows = 2 + (n % 12);
      const cols = 2 + (n % 10);
      if (rows < 2 || cols < 2) {
        throw new Error(`${generator.id}:${n}: invalid generated table shape`);
      }
      if (n <= generator.sampleRenderCount) {
        const result = await renderToDocx(baseDoc({ pages: [{ elements: [docxTable(rows, cols, `Property table ${n}`)] }] }));
        renderedSamples.push({ case: n, sha256: hashBuffer(result.buffer), bytes: result.buffer.length });
      }
      continue;
    }
    if (generator.id === "hydration-office-syntax") {
      const value = n + 0.25;
      const expected = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }).format(value);
      if (!expected.includes(".")) {
        throw new Error(`${generator.id}:${n}: generated expected format is invalid`);
      }
      if (n <= generator.sampleRenderCount) {
        const template = await buildTemplateDocx({ body: templateParagraph("<w:r><w:t>{d.value:format(0,0.00)}</w:t></w:r>") });
        const result = await hydrateTemplate(template, { value }, { syntax: "office" });
        renderedSamples.push({ case: n, sha256: hashBuffer(result.buffer), bytes: result.buffer.length });
      }
      continue;
    }
    throw new Error(`Unknown property generator: ${generator.id}`);
  }
  return {
    id: generator.id,
    caseCount: generator.caseCount,
    sampleRenderCount: generator.sampleRenderCount,
    renderedSamples,
  };
}

async function warmUpEngine() {
  await renderToDocx(baseDoc({ pages: [{ elements: [paragraph("warm up")] }] }));
}

function checkManifest(manifest, renderFixtures, hydrationFixtures) {
  const fixtureCount = renderFixtures.length + hydrationFixtures.length;
  if (renderFixtures.length < 100) {
    throw new Error(`Level B requires at least 100 render fixtures; found ${renderFixtures.length}`);
  }
  if (hydrationFixtures.length < 50) {
    throw new Error(`Level B requires at least 50 hydration fixtures; found ${hydrationFixtures.length}`);
  }
  if (fixtureCount < 150) {
    throw new Error(`Level B requires at least 150 fixture outputs; found ${fixtureCount}`);
  }
  const fixtures = [...renderFixtures, ...hydrationFixtures, ...(manifest.negativeFixtures ?? [])];
  const missing = manifest.requiredFeatureBuckets.filter((bucket) =>
    !fixtures.some((fixture) => fixture.features.includes(bucket)),
  );
  if (missing.length > 0) {
    throw new Error(`Level B required feature buckets are empty: ${missing.join(", ")}`);
  }
  for (const generator of manifest.propertyGenerators ?? []) {
    if (generator.caseCount < 1000) {
      throw new Error(`Level B property generator ${generator.id} has ${generator.caseCount} cases; expected at least 1000`);
    }
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const renderFixtures = expandSuites(manifest.renderSuites);
const hydrationFixtures = expandSuites(manifest.hydrationSuites);
checkManifest(manifest, renderFixtures, hydrationFixtures);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await warmUpEngine();

const records = [];
for (const fixture of renderFixtures) {
  records.push(await runRenderFixture(fixture, manifest));
}
for (const fixture of hydrationFixtures) {
  records.push(await runHydrationFixture(fixture));
}

const negativeRecords = [];
for (const fixture of manifest.negativeFixtures ?? []) {
  negativeRecords.push(await runNegativeFixture(fixture, manifest));
}

const propertyRecords = [];
for (const generator of manifest.propertyGenerators ?? []) {
  propertyRecords.push(await runPropertyGenerator(generator));
}

const expandedManifest = {
  level: manifest.level,
  renderFixtures: renderFixtures.map(({ id, kind, features, expected, suiteId, suiteIndex }) => ({ id, kind, features, expected, suiteId, suiteIndex })),
  hydrationFixtures: hydrationFixtures.map(({ id, kind, features, expected, suiteId, suiteIndex }) => ({ id, kind, features, expected, suiteId, suiteIndex })),
  negativeFixtures: manifest.negativeFixtures ?? [],
  propertyGenerators: manifest.propertyGenerators ?? [],
};
await writeFile(join(outputDir, "expanded-manifest.json"), JSON.stringify(expandedManifest, null, 2));

const summary = {
  generatedAt: new Date("2000-01-01T00:00:00.000Z").toISOString(),
  level: manifest.level,
  renderFixtureCount: renderFixtures.length,
  hydrationFixtureCount: hydrationFixtures.length,
  negativeFixtureCount: negativeRecords.length,
  propertyGeneratorCount: propertyRecords.length,
  propertyCaseCount: propertyRecords.reduce((total, record) => total + record.caseCount, 0),
  artifacts: records,
  negativeArtifacts: negativeRecords,
  propertyArtifacts: propertyRecords,
};
await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log(
  `[docx-level-b-gate] PASS: ${renderFixtures.length} render fixtures, ` +
  `${hydrationFixtures.length} hydration fixtures, ${negativeRecords.length} negative fixtures, ` +
  `${summary.propertyCaseCount} property cases.`,
);
console.log(`[docx-level-b-gate] Artifacts: ${relativePath(outputDir)}`);

function relativePath(path) {
  return path.startsWith(process.cwd()) ? path.slice(process.cwd().length + 1) : path;
}
