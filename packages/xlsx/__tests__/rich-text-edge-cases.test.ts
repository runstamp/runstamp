import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument, SpreadsheetRichTextRun } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Rich text edge cases", () => {
  it("escapes XML special characters (&, <, >) in rich text runs", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Escape",
          rows: [
            {
              cells: [
                {
                  value: [
                    { text: "A & B" },
                    { text: " <bold>" },
                    { text: " 1 > 0" },
                  ] satisfies SpreadsheetRichTextRun[],
                },
              ],
            },
          ],
        },
      ],
    };

    // Rich text is always serialized as inline strings in sheet XML
    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain("A &amp; B");
    expect(sheetXml).toContain("&lt;bold&gt;");
    expect(sheetXml).toContain("1 &gt; 0");
  });

  it("renders rich text with mixed fonts in a single cell", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "MixedFonts",
          rows: [
            {
              cells: [
                {
                  value: [
                    { text: "Normal " },
                    { text: "Bold", font: { bold: true } },
                    { text: " Italic", font: { italic: true, size: 14 } },
                    { text: " Red", font: { color: "FF0000" } },
                  ] satisfies SpreadsheetRichTextRun[],
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    // Rich text uses inline strings with <is> containing <r> runs
    expect(sheetXml).toContain("t=\"inlineStr\"");
    expect(sheetXml).toContain("<is>");
    expect(sheetXml).toContain("<r>");
    expect(sheetXml).toContain("Normal ");
    expect(sheetXml).toContain("Bold");
    expect(sheetXml).toContain("Italic");
    expect(sheetXml).toContain("Red");
    expect(sheetXml).toContain("<b/>");

    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("preserves whitespace in rich text runs with leading/trailing spaces", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Whitespace",
          rows: [
            {
              cells: [
                {
                  value: [
                    { text: "  leading" },
                    { text: "trailing  " },
                  ] satisfies SpreadsheetRichTextRun[],
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain('xml:space="preserve"');
    expect(sheetXml).toContain("  leading");
    expect(sheetXml).toContain("trailing  ");
  });

  it("renders rich text in inline string mode vs shared string mode identically", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Inline",
          rows: [
            {
              cells: [
                {
                  value: [
                    { text: "Hello " },
                    { text: "World", font: { bold: true } },
                  ] satisfies SpreadsheetRichTextRun[],
                },
              ],
            },
          ],
        },
      ],
    };

    // Rich text is always inline regardless of strategy
    const inlineBuffer = await SpreadsheetEngine.render(doc, { stringStrategy: "inlineStrings" });
    const sharedBuffer = await SpreadsheetEngine.render(doc, { stringStrategy: "sharedStrings" });

    const inlineSheet = await readZipEntry(inlineBuffer, "xl/worksheets/sheet1.xml");
    const sharedSheet = await readZipEntry(sharedBuffer, "xl/worksheets/sheet1.xml");

    // Both should use inline strings for rich text
    expect(inlineSheet).toContain("t=\"inlineStr\"");
    expect(sharedSheet).toContain("t=\"inlineStr\"");
    expect(inlineSheet).toContain("<is>");
    expect(sharedSheet).toContain("<is>");
  });

  it("handles empty-text runs gracefully", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Empty",
          rows: [
            {
              cells: [
                {
                  value: [
                    { text: "" },
                    { text: "visible" },
                    { text: "" },
                  ] satisfies SpreadsheetRichTextRun[],
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("clean");

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheetXml).toContain("visible");
  });
});
