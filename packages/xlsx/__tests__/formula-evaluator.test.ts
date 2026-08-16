import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Formula Evaluator — Sprint 4 Functions", () => {
  // Helper: render a doc and extract a sheet's XML to check evaluated values
  async function renderAndReadSheet(doc: Parameters<typeof SpreadsheetEngine.render>[0], sheetIndex = 0): Promise<string> {
    const buffer = await SpreadsheetEngine.render(doc);
    return readZipEntry(buffer, `xl/worksheets/sheet${sheetIndex + 1}.xml`);
  }

  describe("VLOOKUP", () => {
    const lookupDoc = {
      sheets: [
        {
          name: "Data",
          rows: [
            { cells: [{ value: "Apple" }, { value: 1.5 }, { value: "Fruit" }] },
            { cells: [{ value: "Banana" }, { value: 0.75 }, { value: "Fruit" }] },
            { cells: [{ value: "Carrot" }, { value: 2.0 }, { value: "Vegetable" }] },
          ],
        },
        {
          name: "Lookup",
          rows: [
            {
              cells: [
                // Exact match for "Banana" in column 2
                { formula: "VLOOKUP(\"Banana\",Data!A1:C3,2,FALSE)" },
                // Exact match for "Carrot" in column 3
                { formula: "VLOOKUP(\"Carrot\",Data!A1:C3,3,FALSE)" },
                // Value not found
                { formula: "VLOOKUP(\"Durian\",Data!A1:C3,2,FALSE)" },
                // col_index out of bounds
                { formula: "VLOOKUP(\"Apple\",Data!A1:C3,5,FALSE)" },
              ],
            },
          ],
        },
      ],
    };

    it("finds exact match and returns correct column", async () => {
      const xml = await renderAndReadSheet(lookupDoc, 1);
      expect(xml).toContain("<f>VLOOKUP(&quot;Banana&quot;,Data!A1:C3,2,FALSE)</f><v>0.75</v>");
    });

    it("returns a different column for exact match", async () => {
      const xml = await renderAndReadSheet(lookupDoc, 1);
      expect(xml).toContain("<f>VLOOKUP(&quot;Carrot&quot;,Data!A1:C3,3,FALSE)</f>");
      expect(xml).toContain("Vegetable");
    });

    it("returns no value when lookup value is not found", async () => {
      const xml = await renderAndReadSheet(lookupDoc, 1);
      // Should have formula but no <v> tag (undefined result)
      expect(xml).toContain("VLOOKUP(&quot;Durian&quot;,Data!A1:C3,2,FALSE)</f></c>");
    });

    it("returns no value when col_index is out of bounds", async () => {
      const xml = await renderAndReadSheet(lookupDoc, 1);
      expect(xml).toContain("VLOOKUP(&quot;Apple&quot;,Data!A1:C3,5,FALSE)</f>");
    });

    it("performs approximate match (default)", async () => {
      const xml = await renderAndReadSheet({
        sheets: [
          {
            name: "Sheet1",
            rows: [
              { cells: [{ value: 10 }, { value: "Low" }] },
              { cells: [{ value: 20 }, { value: "Mid" }] },
              { cells: [{ value: 30 }, { value: "High" }] },
              // Lookup 25 with approximate match (sorted first col)
              { cells: [{ formula: "VLOOKUP(25,A1:B3,2,TRUE)" }] },
            ],
          },
        ],
      });
      // 25 is between 20 and 30, approximate match finds 20 -> "Mid"
      expect(xml).toContain("<f>VLOOKUP(25,A1:B3,2,TRUE)</f>");
      expect(xml).toContain("Mid");
    });
  });

  describe("TEXT", () => {
    it("formats with 0.00 pattern", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "TEXT(3.14159,\"0.00\")" }] }],
        }],
      });
      expect(xml).toContain("<v>3.14</v>");
    });

    it("formats with 0% pattern", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "TEXT(0.85,\"0%\")" }] }],
        }],
      });
      expect(xml).toContain("<v>85%</v>");
    });

    it("formats with yyyy-mm-dd date pattern", async () => {
      // DATE(2024,1,15) serial = 45306
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "TEXT(DATE(2024,1,15),\"yyyy-mm-dd\")" }] }],
        }],
      });
      expect(xml).toContain("<v>2024-01-15</v>");
    });

    it("formats with #,##0 pattern", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "TEXT(1234567,\"#,##0\")" }] }],
        }],
      });
      expect(xml).toContain("<v>1,234,567</v>");
    });
  });

  describe("CONCATENATE / CONCAT", () => {
    it("joins multiple strings", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "CONCATENATE(\"Hello\",\" \",\"World\")" }] }],
        }],
      });
      expect(xml).toContain("Hello World");
    });

    it("CONCAT alias works identically", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [
            { cells: [{ value: "Foo" }, { value: "Bar" }, { formula: "CONCAT(A1,B1)" }] },
          ],
        }],
      });
      expect(xml).toContain("FooBar");
    });
  });

  describe("DATE", () => {
    it("returns correct serial for DATE(2024,1,15)", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "DATE(2024,1,15)" }] }],
        }],
      });
      // Jan 15, 2024 serial = 45306
      expect(xml).toContain("<v>45306</v>");
    });
  });

  describe("YEAR / MONTH / DAY", () => {
    it("YEAR extracts year from serial", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "YEAR(DATE(2024,6,20))" }] }],
        }],
      });
      expect(xml).toContain("<v>2024</v>");
    });

    it("MONTH extracts month from serial", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "MONTH(DATE(2024,6,20))" }] }],
        }],
      });
      expect(xml).toContain("<v>6</v>");
    });

    it("DAY extracts day from serial", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "DAY(DATE(2024,6,20))" }] }],
        }],
      });
      expect(xml).toContain("<v>20</v>");
    });
  });

  describe("TRIM", () => {
    it("removes leading, trailing, and collapses internal whitespace", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ formula: "TRIM(\"  hello   world  \")" }] }],
        }],
      });
      expect(xml).toContain("hello world");
    });
  });

  describe("Combined / nested formulas", () => {
    it("nests YEAR(DATE(...)) + CONCATENATE + TEXT", async () => {
      const xml = await renderAndReadSheet({
        sheets: [{
          name: "Sheet1",
          rows: [{
            cells: [
              // CONCATENATE("Year: ", TEXT(DATE(2024,3,10), "yyyy-mm-dd"))
              { formula: "CONCATENATE(\"Year: \",TEXT(DATE(2024,3,10),\"yyyy-mm-dd\"))" },
            ],
          }],
        }],
      });
      expect(xml).toContain("Year: 2024-03-10");
    });
  });
});
