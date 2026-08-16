import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { preprocessPdfDocumentInput } from "../src/relaxed-input.js";

const legacyPdfDocument = {
  page: { size: "A4", margin: 48 },
  children: [
    {
      type: "table",
      rows: [
        { isHeader: true, cells: [{ value: "Header" }] },
        { cells: [{ value: "Value" }] },
      ],
    },
    {
      type: "list",
      listType: "bullet",
      items: [{ value: "One" }, { value: "Two" }],
    },
  ],
} as const;

const flowBreakDocument = {
  page: { size: "A4", margin: 48 },
  children: [
    { type: "paragraph", value: "Before" },
    { type: "page-break" },
    { type: "divider" },
    { type: "paragraph", value: "After" },
  ],
} as const;

describe("PDF relaxed input", () => {
  it("documents the existing strict behavior for legacy table/list shapes", async () => {
    const buffer = await PdfEngine.render(legacyPdfDocument as any);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("coerces legacy table and list shapes in relaxed mode with warnings", async () => {
    const prepared = preprocessPdfDocumentInput(legacyPdfDocument, { relaxed: true });
    const warnings: string[] = [];
    const buffer = await PdfEngine.render(legacyPdfDocument as any, {
      relaxed: true,
      onInputWarning: (warning) => warnings.push(warning.code),
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString("latin1")).toContain("/Count 1");
    expect(prepared.value).toMatchObject({
      children: [
        {
          type: "table",
          header: [
            {
              cells: [
                {
                  children: [
                    { type: "paragraph", value: "Header" },
                  ],
                },
              ],
            },
          ],
          body: [
            {
              cells: [
                {
                  children: [
                    { type: "paragraph", value: "Value" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            { text: "One" },
            { text: "Two" },
          ],
        },
      ],
    });
    expect(warnings).toEqual(expect.arrayContaining([
      "PDF_RELAXED_TABLE_ROWS",
      "PDF_RELAXED_LIST_ITEMS",
    ]));
  });

  it("supports explicit page breaks and dividers in structured flow", async () => {
    const strictBuffer = await PdfEngine.render(flowBreakDocument as any);
    const relaxedBuffer = await PdfEngine.render(flowBreakDocument as any, { relaxed: true });

    expect(strictBuffer.toString("latin1")).toContain("/Count 2");
    expect(relaxedBuffer.toString("latin1")).toContain("/Count 2");
  });
});
