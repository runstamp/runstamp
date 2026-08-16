import { describe, expect, it } from "vitest";
import { formula, SpreadsheetEngine } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Formula Builder", () => {
  it("builds quoted references and common function expressions", () => {
    expect(Object.keys(formula).length).toBeGreaterThanOrEqual(60);
    expect(formula.cell(0, 0)).toBe("A1");
    expect(formula.absCell(1, 2)).toBe("$C$2");
    expect(formula.range(1, 1, 4, 1)).toBe("B2:B5");
    expect(formula.absRange(1, 1, 4, 1)).toBe("$B$2:$B$5");
    expect(formula.ref("My Data", "A1", "B10")).toBe("'My Data'!A1:B10");
    expect(formula.sum("A1:A5", "B1:B5")).toBe("SUM(A1:A5,B1:B5)");
    expect(formula.if(formula.lt("A1", "B1"), formula.text("low"), formula.text("high"))).toBe("IF(A1<B1,\"low\",\"high\")");
    expect(formula.vlookup("A2", "'Lookup'!A:B", 2, false)).toBe("VLOOKUP(A2,'Lookup'!A:B,2,FALSE)");
    expect(formula.sumifs("C:C", "A:A", formula.text("Open"), "B:B", formula.text("EMEA"))).toBe("SUMIFS(C:C,A:A,\"Open\",B:B,\"EMEA\")");
    expect(formula.textjoin(formula.text(", "), true, "A1:A3")).toBe("TEXTJOIN(\", \",TRUE,A1:A3)");
    expect(formula.index("A1:C10", 2, 3)).toBe("INDEX(A1:C10,2,3)");
    expect(formula.eomonth("A1", 1)).toBe("EOMONTH(A1,1)");
  });

  it("produces formulas that serialize cleanly through the engine", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Lookup",
          rows: [
            { cells: [{ value: "A" }, { value: 10 }] },
          ],
        },
        {
          name: "Summary",
          rows: [
            {
              cells: [
                { formula: formula.sum(formula.ref("Lookup", "B1")) },
                { formula: formula.if(formula.gt("A2", 0), formula.text("ok"), formula.text("bad")) },
                { formula: formula.iferror(formula.vlookup(formula.text("A"), formula.ref("Lookup", "A1", "B1"), 2, false), formula.text("")) },
              ],
            },
            {
              cells: [
                { value: 1 },
              ],
            },
          ],
        },
      ],
    });

    const summarySheet = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    expect(summarySheet).toContain("<f>SUM(Lookup!B1)</f><v>10</v>");
    expect(summarySheet).toContain("<f>IF(A2&gt;0,&quot;ok&quot;,&quot;bad&quot;)</f><v>ok</v>");
    expect(summarySheet).toContain("<f>IFERROR(VLOOKUP(&quot;A&quot;,Lookup!A1:B1,2,FALSE),&quot;&quot;)</f>");
  });

  it("supports named-range formulas and recursive dependencies with clean circular fallback", async () => {
    const buffer = await SpreadsheetEngine.render({
      namedRanges: [
        { name: "Sales", ref: "Data!$A$1:$A$2" },
      ],
      sheets: [
        {
          name: "Data",
          rows: [
            { cells: [{ value: 4 }] },
            { cells: [{ value: 6 }] },
          ],
        },
        {
          name: "Summary",
          rows: [
            {
              cells: [
                { formula: "SUM(Sales)" },
                { formula: "A1*2" },
                { formula: "B1+1" },
                { formula: "E1+1" },
                { formula: "D1+1" },
              ],
            },
          ],
        },
      ],
    });

    const summarySheet = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    expect(summarySheet).toContain("<c r=\"A1\"><f>SUM(Sales)</f><v>10</v></c>");
    expect(summarySheet).toContain("<c r=\"B1\"><f>A1*2</f><v>20</v></c>");
    expect(summarySheet).toContain("<c r=\"C1\"><f>B1+1</f><v>21</v></c>");
    expect(summarySheet).toContain("<c r=\"D1\"><f>E1+1</f></c>");
    expect(summarySheet).toContain("<c r=\"E1\"><f>D1+1</f></c>");
  });
});

describe("Cross-sheet reference utilities", () => {
  it("formula.ref quotes sheet names with apostrophes", () => {
    expect(formula.ref("Tom's Sheet", "A1")).toBe("'Tom''s Sheet'!A1");
  });

  it("formula.ref quotes digit-starting sheet names", () => {
    expect(formula.ref("2026Data", "A1")).toBe("'2026Data'!A1");
  });

  it("formula.sumSheet produces SUM with sheet range", () => {
    expect(formula.sumSheet("Numbers", "A1", "A10")).toBe("SUM(Numbers!A1:A10)");
    expect(formula.sumSheet("My Data", "B1", "B5")).toBe("SUM('My Data'!B1:B5)");
  });

  it("formula.vlookupSheet produces VLOOKUP with cross-sheet table", () => {
    expect(formula.vlookupSheet("A1", "Lookup", "A1", "C10", 2)).toBe(
      "VLOOKUP(A1,Lookup!A1:C10,2,FALSE)"
    );
    expect(formula.vlookupSheet("A1", "Lookup", "A1", "C10", 2, false)).toBe(
      "VLOOKUP(A1,Lookup!A1:C10,2,TRUE)"
    );
  });

  it("formatSheetRef and formatSheetRange produce correct output", async () => {
    const { formatSheetRef, formatSheetRange } = await import("../src/utils/cell-ref.js");
    expect(formatSheetRef("Sheet1", "A1")).toBe("Sheet1!A1");
    expect(formatSheetRef("My Sheet", "B2")).toBe("'My Sheet'!B2");
    expect(formatSheetRef("Tom's Sheet", "C3")).toBe("'Tom''s Sheet'!C3");
    expect(formatSheetRef("2026Data", "A1")).toBe("'2026Data'!A1");
    expect(formatSheetRange("Sheet1", "A1", "B10")).toBe("Sheet1!A1:B10");
    expect(formatSheetRange("My Sheet", "A1", "B10")).toBe("'My Sheet'!A1:B10");
  });

  it("extractSheetReferences parses sheet refs from formulas", async () => {
    const { extractSheetReferences } = await import("../src/utils/cell-ref.js");
    expect(extractSheetReferences("Sheet2!A1")).toEqual(["Sheet2"]);
    expect(extractSheetReferences("'My Sheet'!A1:B10")).toEqual(["My Sheet"]);
    expect(extractSheetReferences("'Tom''s Sheet'!A1")).toEqual(["Tom's Sheet"]);
    expect(extractSheetReferences("Sheet2!A1+Sheet3!B2")).toEqual(expect.arrayContaining(["Sheet2", "Sheet3"]));
    expect(extractSheetReferences("SUM(A1:A5)")).toEqual([]);
    expect(extractSheetReferences("SUM(Revenue!B1:B100)")).toEqual(["Revenue"]);
  });
});
