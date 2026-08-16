import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { renderToDocx } from "../src/render";
import type { DocxDocument } from "../src/schema";

function parseSingleNumber(xml: string, pattern: RegExp, label: string): number {
  const match = xml.match(pattern);
  if (!match) {
    throw new Error(`Unable to find ${label}`);
  }
  return Number(match[1]);
}

async function extractWidthReport(document: DocxDocument) {
  const result = await renderToDocx(document);
  const zip = await JSZip.loadAsync(result.buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("word/document.xml not found");
  }

  const pageWidth = parseSingleNumber(documentXml, /<w:pgSz\b[^>]*w:w="(\d+)"/, "page width");
  const marginLeft = parseSingleNumber(documentXml, /<w:pgMar\b[^>]*w:left="(\d+)"/, "left margin");
  const marginRight = parseSingleNumber(documentXml, /<w:pgMar\b[^>]*w:right="(\d+)"/, "right margin");
  const tableWidth = parseSingleNumber(documentXml, /<w:tblW\b[^>]*w:w="(\d+)"/, "table width");
  const gridWidths = [...documentXml.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g)].map((match) => Number(match[1]));

  return {
    gridWidthSum: gridWidths.reduce((sum, width) => sum + width, 0),
    marginLeft,
    marginRight,
    pageWidth,
    printableWidth: pageWidth - marginLeft - marginRight,
    tableWidth,
  };
}

function buildTableDocument(overrides: Partial<DocxDocument> = {}): DocxDocument {
  return {
    type: "DocxDocument",
    pageSize: "a4",
    pages: [{
      elements: [{
        type: "table",
        rows: [
          {
            isHeader: true,
            cells: [
              { text: "Region" },
              { text: "Owner" },
              { text: "Status" },
              { text: "Risk" },
            ],
          },
          {
            cells: [
              { text: "APAC" },
              { text: "Alice" },
              { text: "On track" },
              { text: "Low" },
            ],
          },
        ],
      }],
    }],
    ...overrides,
  };
}

describe("DOCX auto-sized table widths", () => {
  it.each([
    ["A4 default margins", buildTableDocument()],
    ["A4 wide margins", buildTableDocument({ margins: { top: 144, right: 144, bottom: 144, left: 144 } })],
    ["Letter portrait", buildTableDocument({ pageSize: "letter" })],
    ["Letter landscape", buildTableDocument({ pageSize: "letter", orientation: "landscape" })],
  ])("keeps table width within printable width for %s", async (_label, document) => {
    const report = await extractWidthReport(document);

    expect(report.tableWidth).toBeLessThanOrEqual(report.printableWidth);
    expect(report.gridWidthSum).toBeLessThanOrEqual(report.printableWidth);
  });
});
