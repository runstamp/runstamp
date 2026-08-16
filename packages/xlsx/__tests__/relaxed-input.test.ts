import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetValidationError, validateSpreadsheetDocument } from "../src/index.js";

const legacyWorkbook = {
  meta: {
    title: "Legacy workbook",
    subject: "Quarterly review",
  },
  sheets: [
    {
      name: "Sheet1",
      merges: ["A2:B2"],
      freezePane: { row: 1, column: 1 },
      rows: [
        {
          cells: [
            { value: 0.42, style: "percent" },
            { value: "Heads up", style: { preset: "alert" } },
          ],
        },
        {
          cells: [
            { value: "Merged label" },
          ],
        },
      ],
    },
  ],
} as const;

describe("XLSX relaxed input", () => {
  it("keeps strict mode rejecting legacy shapes", () => {
    expect(() => validateSpreadsheetDocument(legacyWorkbook)).toThrow(SpreadsheetValidationError);
  });

  it("coerces legacy shapes in relaxed mode and surfaces warnings", async () => {
    const warningCodes: string[] = [];
    const validated = validateSpreadsheetDocument(legacyWorkbook, {
      relaxed: true,
      onInputWarning: (warning) => warningCodes.push(warning.code),
    });

    expect(validated.meta?.description).toBe("Quarterly review");
    expect(validated.sheets[0]?.mergedCells).toEqual(["A2:B2"]);
    expect(validated.sheets[0]?.freezePane).toMatchObject({ row: 1, col: 1 });
    expect(validated.sheets[0]?.rows[0]?.cells[0]?.style).toBe("percentage");
    expect(validated.sheets[0]?.rows[0]?.cells[1]?.style).toMatchObject({ preset: "warning" });
    expect(warningCodes).toEqual(expect.arrayContaining([
      "XLSX_RELAXED_META_SUBJECT",
      "XLSX_RELAXED_MERGES",
      "XLSX_RELAXED_FREEZE_PANE",
      "XLSX_RELAXED_PRESET_NAME",
    ]));

    const buffer = await SpreadsheetEngine.render(legacyWorkbook as any, {
      relaxed: true,
      onInputWarning: (warning) => warningCodes.push(warning.code),
    });
    expect(buffer.length).toBeGreaterThan(0);
  });
});
