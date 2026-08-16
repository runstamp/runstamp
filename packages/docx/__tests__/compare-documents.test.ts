import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractDocxContent } from "./test-utils";
import { DOCXErrorCode } from "../src/errors";
import type { DocxDocument } from "../src/schema";

async function loadCompareApi() {
  vi.doMock("../src/pro-guard", async () => {
    const actual = await vi.importActual<typeof import("../src/pro-guard")>("../src/pro-guard");
    return {
      ...actual,
      IS_PRO: true,
      requireDocxPro: vi.fn(),
    };
  });

  return import("../src/index");
}

afterEach(() => {
  vi.doUnmock("../src/pro-guard");
  vi.resetModules();
});

async function renderBuffer(document: DocxDocument): Promise<Buffer> {
  const { renderToDocx } = await loadCompareApi();
  const result = await renderToDocx(document);
  return result.buffer;
}

async function rewriteDocumentXml(
  buffer: Buffer,
  rewrite: (documentXml: string) => string,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  const documentXml = await documentFile?.async("string");

  if (!documentXml) {
    throw new Error("word/document.xml not found");
  }

  zip.file("word/document.xml", rewrite(documentXml));
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("compareDocuments", () => {
  it("throws DOCXError for DOCX packages without a document part", async () => {
    const { parseDocxBuffer } = await import("../src/diff/docx-buffer-parser");
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(parseDocxBuffer(buffer)).rejects.toMatchObject({
      name: "DOCXError",
      code: DOCXErrorCode.DOC_INVALID,
    });
  });

  it("rejects source packages with preexisting tracked revisions as DOCXError", async () => {
    const { compareDocuments } = await loadCompareApi();
    const source: DocxDocument = {
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Tracked source." },
          ],
        },
      ],
    };
    const buffer = await renderBuffer(source);
    const trackedBuffer = await rewriteDocumentXml(
      buffer,
      (documentXml) => documentXml.replace(
        "</w:body>",
        '<w:p><w:ins w:id="1" w:author="QA" w:date="2026-05-13T00:00:00Z"><w:r><w:t>Tracked</w:t></w:r></w:ins></w:p></w:body>',
      ),
    );

    await expect(compareDocuments(buffer, trackedBuffer)).rejects.toMatchObject({
      name: "DOCXError",
      code: DOCXErrorCode.DOC_INVALID,
    });
  });

  it("returns no changes for identical buffers", async () => {
    const { compareDocuments } = await loadCompareApi();
    const source: DocxDocument = {
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Hello team." },
          ],
        },
      ],
    };

    const buffer = await renderBuffer(source);
    const result = await compareDocuments(buffer, buffer, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBe("No changes");
    expect(result.statistics).toEqual({
      added: 0,
      removed: 0,
      modified: 0,
      moved: 0,
    });
    expect(extracted.document.revisions).toEqual([]);
  });

  it("diffs paragraph text at word granularity", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Payment due in 30 days." },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Payment due in 60 days." },
          ],
        },
      ],
    });
    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.statistics.modified).toBe(1);
    expect(result.changes[0]?.description).toContain("Paragraph text changed");
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "delete", text: "30" }),
        expect.objectContaining({ type: "insert", text: "60" }),
      ]),
    );
  });

  it("captures formatting-only changes as format revisions", async () => {
    const { compareDocuments } = await loadCompareApi();
    const { parseDocxBuffer } = await import("../src/diff/docx-buffer-parser");
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            {
              type: "paragraph",
              runs: [{ text: "Important" }],
            },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            {
              type: "paragraph",
              runs: [{ text: "Important", style: { fontWeight: "bold" } }],
            },
          ],
        },
      ],
    });
    const parsedOriginal = await parseDocxBuffer(original);
    const parsedRevised = await parseDocxBuffer(revised);

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(parsedOriginal.blocks[0]).toMatchObject({
      kind: "paragraph",
      runs: [{ text: "Important" }],
    });
    expect(parsedRevised.blocks[0]).toMatchObject({
      kind: "paragraph",
      runs: [{ text: "Important", style: { fontWeight: "bold" } }],
    });
    expect(result.statistics.modified).toBe(1);
    expect(result.changes[0]?.description).toContain("Paragraph formatting changed");
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "format", text: "Important" }),
      ]),
    );
    expect(extracted.rawDocumentXml).toContain("w:rPrChange");
  });

  it("captures paragraph property changes parsed from DOCX", async () => {
    const { compareDocuments } = await loadCompareApi();
    const { parseDocxBuffer } = await import("../src/diff/docx-buffer-parser");
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Aligned clause." },
          ],
        },
      ],
    });
    const revised = await rewriteDocumentXml(original, (documentXml) =>
      documentXml.replace(
        /<w:p>/,
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>',
      ),
    );
    const parsedOriginal = await parseDocxBuffer(original);
    const parsedRevised = await parseDocxBuffer(revised);
    expect(parsedOriginal.document.pages[0]?.elements[0]).toMatchObject({
      type: "paragraph",
      text: "Aligned clause.",
    });
    expect(parsedRevised.document.pages[0]?.elements[0]).toMatchObject({
      type: "paragraph",
      text: "Aligned clause.",
      style: { textAlign: "center" },
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.statistics.modified).toBe(1);
    expect(result.changes[0]?.description).toContain("Paragraph properties changed");
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "property", text: "Aligned clause." }),
      ]),
    );
    expect(extracted.rawDocumentXml).toContain("w:pPrChange");
  });

  it("treats heading edits as tracked text changes", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "heading", level: 1, text: "Draft Agreement" },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "heading", level: 1, text: "Final Agreement" },
          ],
        },
      ],
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.statistics.modified).toBe(1);
    expect(result.summary).toContain("heading modified");
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "delete", text: "Draft" }),
        expect.objectContaining({ type: "insert", text: "Final" }),
      ]),
    );
  });

  it("reports exact paragraph moves as moved changes", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Opening clause." },
            { type: "paragraph", text: "Moved clause stays identical." },
            { type: "paragraph", text: "Closing clause." },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Opening clause." },
            { type: "paragraph", text: "Closing clause." },
            { type: "paragraph", text: "Moved clause stays identical." },
          ],
        },
      ],
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.statistics).toEqual({
      added: 0,
      removed: 0,
      modified: 0,
      moved: 1,
    });
    expect(result.summary).toContain("paragraph moved");
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "moveFrom", text: "Moved clause stays identical." }),
        expect.objectContaining({ type: "moveTo", text: "Moved clause stays identical." }),
      ]),
    );
  });

  it("keeps moved-and-edited paragraphs as add/remove instead of moves", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Opening clause." },
            { type: "paragraph", text: "Moved clause stays identical." },
            { type: "paragraph", text: "Closing clause." },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Opening clause." },
            { type: "paragraph", text: "Closing clause." },
            { type: "paragraph", text: "Moved clause now changes." },
          ],
        },
      ],
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.statistics.moved).toBe(0);
    expect(result.statistics.added).toBeGreaterThanOrEqual(1);
    expect(result.statistics.removed).toBeGreaterThanOrEqual(1);
    expect(extracted.rawDocumentXml).not.toContain("w:moveFrom");
    expect(extracted.rawDocumentXml).not.toContain("w:moveTo");
  });

  it("ignores explicit page-break paragraphs when diffing body content", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "First page." },
            { type: "page-break" },
            { type: "paragraph", text: "Second page text." },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "First page." },
            { type: "page-break" },
            { type: "paragraph", text: "Second page revised text." },
          ],
        },
      ],
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });

    expect(result.statistics).toEqual({
      added: 0,
      removed: 0,
      modified: 1,
      moved: 0,
    });
    expect(result.changes[0]?.description).toContain("Paragraph text changed");
  });

  it("ignores generated TOC output when comparing body paragraphs", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      tableOfContents: { title: "Contents", maxLevel: 2, hyperlinks: true },
      pages: [
        {
          elements: [
            { type: "heading", level: 1, text: "Overview" },
            { type: "paragraph", text: "Body clause before update." },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      tableOfContents: { title: "Contents", maxLevel: 2, hyperlinks: true },
      pages: [
        {
          elements: [
            { type: "heading", level: 1, text: "Overview" },
            { type: "paragraph", text: "Body clause after update." },
          ],
        },
      ],
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });

    expect(result.statistics).toEqual({
      added: 0,
      removed: 0,
      modified: 1,
      moved: 0,
    });
    expect(result.summary).toBe("1 paragraph modified");
  });

  it("rejects source DOCX files that already contain tracked revisions", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Already revised source." },
          ],
        },
      ],
    });
    const redlinedOriginal = await rewriteDocumentXml(original, (documentXml) =>
      documentXml.replace(
        /(<w:r\b[\s\S]*?<\/w:r>)/,
        '<w:ins w:id="1" w:author="Legal AI" w:date="2026-04-01T00:00:00Z">$1</w:ins>',
      ),
    );
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Already revised source." },
          ],
        },
      ],
    });

    await expect(compareDocuments(redlinedOriginal, revised, {
      author: "Legal AI",
    })).rejects.toThrow("compareDocuments does not support source DOCX files that already contain tracked revisions");
  });

  it("treats tables as block-level insert-delete units", async () => {
    const { compareDocuments } = await loadCompareApi();
    const original = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Intro" },
            {
              type: "table",
              rows: [
                { cells: [{ text: "A" }, { text: "B" }] },
                { cells: [{ text: "C" }, { text: "D" }] },
              ],
            },
            { type: "paragraph", text: "Outro" },
          ],
        },
      ],
    });
    const revised = await renderBuffer({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "paragraph", text: "Intro" },
            { type: "paragraph", text: "Outro" },
          ],
        },
      ],
    });

    const result = await compareDocuments(original, revised, {
      author: "Legal AI",
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.statistics.removed).toBe(1);
    expect(result.summary).toContain("table removed");
    expect(extracted.document.tables).toHaveLength(1);
    expect(extracted.rawDocumentXml).toContain("w:delText");
    expect(extracted.rawDocumentXml).toContain(">A<");
    expect(extracted.rawDocumentXml).toContain(">D<");
  });
});
