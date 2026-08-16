import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { renderToDocx } from "../src/render";
import type { DocxDocument } from "../src/schema";

async function extractRowsXml(document: DocxDocument): Promise<string[]> {
  const result = await renderToDocx(document);
  const zip = await JSZip.loadAsync(result.buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("word/document.xml not found");
  }
  return [...documentXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
}

describe("table rowspan column mapping", () => {
  it("does not drop cells in rows shadowed by a prior rowSpan", async () => {
    const document: DocxDocument = {
      type: "DocxDocument",
      pageSize: "a4",
      pages: [
        {
          elements: [
            {
              type: "table",
              tableStyle: "bordered",
              repeatHeaders: true,
              rows: [
                {
                  isHeader: true,
                  cells: [
                    { text: "Idx" },
                    { text: "Region" },
                    { text: "Owner" },
                    { text: "Note" },
                  ],
                },
                {
                  cells: [
                    { text: "1" },
                    { text: "NA", rowSpan: 3 },
                    { text: "Owner 1" },
                    { text: "Note 1" },
                  ],
                },
                {
                  cells: [
                    { text: "2" },
                    { text: "Owner 2" },
                    { text: "Note 2" },
                  ],
                },
                {
                  cells: [
                    { text: "3" },
                    { text: "Owner 3" },
                    { text: "Note 3" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const rows = await extractRowsXml(document);
    expect(rows.length).toBe(4);

    for (const text of ["Owner 1", "Owner 2", "Owner 3", "Note 2", "Note 3"]) {
      const found = rows.some((row) => row.includes(text));
      expect(found, `expected "${text}" to be present in rendered rows`).toBe(true);
    }

    const continuationRow = rows[2];
    expect(continuationRow.includes("<w:vMerge/>")).toBe(true);
    expect(continuationRow.includes("Owner 2")).toBe(true);
    expect(continuationRow.includes("Note 2")).toBe(true);
  });
});
