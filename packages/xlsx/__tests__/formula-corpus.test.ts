import { describe, expect, it } from "vitest";

import { formula, SpreadsheetEngine } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Formula corpus", () => {
  it("X-FM-001 preserves repeated formula generation without spurious implicit-intersection markers", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "SharedFormulaLike",
          rows: [
            { cells: [{ value: "Input" }, { value: "Double" }] },
            ...Array.from({ length: 1_000 }, (_unused, index) => ({
              cells: [
                { value: index + 1 },
                { formula: `A${index + 2}*2` },
              ],
            })),
          ],
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheetXml).toContain("<f>A2*2</f>");
    expect(sheetXml).toContain("<f>A1001*2</f>");
    expect(sheetXml).not.toContain("<f>@");
    expect(sheetXml).not.toContain(">@");
  });

  it("X-FM-002 serializes cross-sheet VLOOKUP formulas with quoted sheet names", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Data Analysis",
          rows: [
            { cells: [{ value: "Account" }, { value: "Score" }] },
            { cells: [{ value: "APAC" }, { value: 88 }] },
          ],
        },
        {
          name: "Summary",
          rows: [
            {
              cells: [
                { value: "APAC" },
                { formula: formula.vlookup("A1", formula.ref("Data Analysis", "A2", "B2"), 2, false) },
              ],
            },
          ],
        },
      ],
    });

    const summaryXml = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    expect(summaryXml).toContain("&apos;Data Analysis&apos;!A2:B2");
    expect(summaryXml).toContain("<v>88</v>");
  });

  it("X-FM-003 preserves dynamic array formula text verbatim", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "DynamicArrays",
          rows: [
            { cells: [{ value: 1 }, { value: 4 }] },
            { cells: [{ value: 2 }, { value: 6 }] },
            { cells: [{ value: 3 }, { value: 8 }] },
            { cells: [{ formula: "FILTER(A1:A3,B1:B3>5)" }] },
          ],
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const validation = await SpreadsheetEngine.validate(buffer);
    expect(sheetXml).toContain("<f>FILTER(A1:A3,B1:B3&gt;5)</f>");
    expect(validation.verdict).toBe("warnings");
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
        }),
      ]),
    );
  });

  it("X-FM-004 preserves deeply nested IF formulas", async () => {
    const formula = "IF(A1>90,\"A\",IF(A1>80,\"B\",IF(A1>70,\"C\",IF(A1>60,\"D\",IF(A1>50,\"E\",IF(A1>40,\"F\",\"G\"))))))";
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Grades",
          rows: [
            { cells: [{ value: 86 }, { formula }] },
          ],
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheetXml).toContain("<f>IF(A1&gt;90,&quot;A&quot;,IF(A1&gt;80,&quot;B&quot;,IF(A1&gt;70,&quot;C&quot;,IF(A1&gt;60,&quot;D&quot;,IF(A1&gt;50,&quot;E&quot;,IF(A1&gt;40,&quot;F&quot;,&quot;G&quot;))))))</f><v>B</v>");
  });

  it("X-FM-005 serializes formula-builder output as valid OOXML formulas", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Lookup",
          rows: [
            { cells: [{ value: "APAC" }, { value: 10 }] },
          ],
        },
        {
          name: "Summary",
          rows: [
            {
              cells: [
                { formula: formula.sum(formula.ref("Lookup", "B1")) },
                { formula: formula.if(formula.gt("A2", 0), formula.text("ok"), formula.text("bad")) },
                { formula: formula.vlookup(formula.text("APAC"), formula.ref("Lookup", "A1", "B1"), 2, false) },
              ],
            },
            { cells: [{ value: 1 }] },
          ],
        },
      ],
    });

    const summaryXml = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    expect(summaryXml).toContain("<f>SUM(Lookup!B1)</f><v>10</v>");
    expect(summaryXml).toContain("<f>IF(A2&gt;0,&quot;ok&quot;,&quot;bad&quot;)</f><v>ok</v>");
    expect(summaryXml).toContain("<f>VLOOKUP(&quot;APAC&quot;,Lookup!A1:B1,2,FALSE)</f><v>10</v>");
  });
});
