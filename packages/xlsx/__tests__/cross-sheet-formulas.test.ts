import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

async function renderAndReadSheet(
  doc: Parameters<typeof SpreadsheetEngine.render>[0],
  sheetIndex = 0,
): Promise<string> {
  const buffer = await SpreadsheetEngine.render(doc);
  return readZipEntry(buffer, `xl/worksheets/sheet${sheetIndex + 1}.xml`);
}

describe("Cross-sheet formula evaluation", () => {
  it("evaluates a formula referencing another sheet: Sheet2!A1", async () => {
    const xml = await renderAndReadSheet({
      sheets: [
        {
          name: "Sheet1",
          rows: [
            { cells: [{ formula: "Sheet2!A1" }] },
          ],
        },
        {
          name: "Sheet2",
          rows: [
            { cells: [{ value: 42 }] },
          ],
        },
      ],
    });

    expect(xml).toContain("<f>Sheet2!A1</f><v>42</v>");
  });

  it("evaluates a formula with a quoted sheet name: 'My Sheet'!A1", async () => {
    const xml = await renderAndReadSheet({
      sheets: [
        {
          name: "Lookup",
          rows: [
            { cells: [{ formula: "'My Sheet'!A1" }] },
          ],
        },
        {
          name: "My Sheet",
          rows: [
            { cells: [{ value: "hello" }] },
          ],
        },
      ],
    });

    // The formula should be serialized with escaping, and the evaluated value should appear
    expect(xml).toContain("<f>");
    expect(xml).toContain("My Sheet");
    // The evaluated cached value "hello" should appear as a shared or inline string
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Lookup",
          rows: [{ cells: [{ formula: "'My Sheet'!A1" }] }],
        },
        {
          name: "My Sheet",
          rows: [{ cells: [{ value: "hello" }] }],
        },
      ],
    });
    const sharedStrings = await readZipEntry(buffer, "xl/sharedStrings.xml");
    expect(sharedStrings).toContain("hello");
  });

  it("handles circular reference without infinite loop", async () => {
    // Sheet1!A1 references Sheet2!A1 which references Sheet1!A1
    // Should not hang — circular references return undefined
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Sheet1",
          rows: [
            { cells: [{ formula: "Sheet2!A1" }] },
          ],
        },
        {
          name: "Sheet2",
          rows: [
            { cells: [{ formula: "Sheet1!A1" }] },
          ],
        },
      ],
    });

    // Verify it completes without hanging and produces valid output
    expect(buffer.length).toBeGreaterThan(0);
    const summary = await SpreadsheetEngine.validate(buffer);
    expect(summary.verdict).toBe("warnings");
    expect(summary.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
        }),
      ]),
    );
  });

  it("resolves a named range spanning another sheet in a formula", async () => {
    const xml = await renderAndReadSheet({
      namedRanges: [
        { name: "Totals", ref: "Data!A1:A3" },
      ],
      sheets: [
        {
          name: "Summary",
          rows: [
            { cells: [{ formula: "SUM(Totals)" }] },
          ],
        },
        {
          name: "Data",
          rows: [
            { cells: [{ value: 10 }] },
            { cells: [{ value: 20 }] },
            { cells: [{ value: 30 }] },
          ],
        },
      ],
    });

    expect(xml).toContain("<f>SUM(Totals)</f><v>60</v>");
  });

  it("evaluates SUM across a range on another sheet", async () => {
    const xml = await renderAndReadSheet({
      sheets: [
        {
          name: "Report",
          rows: [
            { cells: [{ formula: "SUM(Numbers!A1:A4)" }] },
          ],
        },
        {
          name: "Numbers",
          rows: [
            { cells: [{ value: 5 }] },
            { cells: [{ value: 15 }] },
            { cells: [{ value: 25 }] },
            { cells: [{ value: 55 }] },
          ],
        },
      ],
    });

    expect(xml).toContain("<f>SUM(Numbers!A1:A4)</f><v>100</v>");
  });

  it("cascading 3-sheet references (A→B→C)", async () => {
    const xml = await renderAndReadSheet({
      sheets: [
        {
          name: "Summary",
          rows: [{ cells: [{ formula: "Detail!A1" }] }],
        },
        {
          name: "Detail",
          rows: [{ cells: [{ formula: "Raw!A1" }] }],
        },
        {
          name: "Raw",
          rows: [{ cells: [{ value: 99 }] }],
        },
      ],
    });
    expect(xml).toContain("<f>Detail!A1</f><v>99</v>");
  });

  it("multiple sheets referenced in one formula", async () => {
    const xml = await renderAndReadSheet({
      sheets: [
        {
          name: "Total",
          rows: [{ cells: [{ formula: "East!A1+West!A1" }] }],
        },
        {
          name: "East",
          rows: [{ cells: [{ value: 30 }] }],
        },
        {
          name: "West",
          rows: [{ cells: [{ value: 70 }] }],
        },
      ],
    });
    expect(xml).toContain("<f>East!A1+West!A1</f><v>100</v>");
  });

  it("cross-sheet reference in conditional formatting formula serializes", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Report",
          rows: [{ cells: [{ value: 50 }] }],
          conditionalFormatting: [
            {
              ref: "A1:A10",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "Thresholds!A1",
                  style: { font: { bold: true } },
                },
              ],
            },
          ],
        },
        {
          name: "Thresholds",
          rows: [{ cells: [{ value: 100 }] }],
        },
      ],
    });
    const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(xml).toContain("Thresholds!A1");
  });

  it("validation rejects formula referencing non-existent sheet", async () => {
    const { validateSpreadsheetDocument, SpreadsheetValidationError } = await import("../src/index.js");
    expect(() => validateSpreadsheetDocument({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ formula: "MissingSheet!A1" }] }],
      }],
    })).toThrow(SpreadsheetValidationError);

    try {
      validateSpreadsheetDocument({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "MissingSheet!A1" }] }],
        }],
      });
    } catch (e) {
      expect((e as any).message).toContain("non-existent sheet");
    }
  });

  it("validation passes when cross-sheet references are valid", async () => {
    const { validateSpreadsheetDocument } = await import("../src/index.js");
    expect(() => validateSpreadsheetDocument({
      sheets: [
        {
          name: "Summary",
          rows: [{ cells: [{ formula: "SUM(Data!A1:A10)" }] }],
        },
        {
          name: "Data",
          rows: [{ cells: [{ value: 100 }] }],
        },
      ],
    })).not.toThrow();
  });

  it("rejects a formula referencing a non-existent sheet at validation time", async () => {
    await expect(
      SpreadsheetEngine.render({
        sheets: [
          {
            name: "Sheet1",
            rows: [
              { cells: [{ formula: "MissingSheet!A1" }] },
            ],
          },
        ],
      }),
    ).rejects.toThrow("non-existent sheet");
  });
});
