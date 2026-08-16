import { describe, expect, it } from "vitest";
import { offsetFormulaRows, shiftFormulaRows } from "../src/index.js";

describe("Formula row shifting", () => {
  it("shifts local references on the mutated sheet", () => {
    expect(shiftFormulaRows("SUM(A10:B10)+C5", {
      currentSheetName: "Detail",
      targetSheetName: "Detail",
      insertionRow: 10,
      rowDelta: 3,
    })).toBe("SUM(A13:B13)+C5");
  });

  it("shifts quoted and unquoted sheet references only on the target sheet", () => {
    expect(shiftFormulaRows("Summary!A10+'Detail Sheet'!$B$12+Other!C15", {
      currentSheetName: "Summary",
      targetSheetName: "Detail Sheet",
      insertionRow: 12,
      rowDelta: 2,
    })).toBe("Summary!A10+'Detail Sheet'!$B$14+Other!C15");
  });

  it("preserves string literals and structured references", () => {
    expect(shiftFormulaRows("IF(A10=\"Row 10\",RevenueTable[@Revenue],\"A20\")", {
      currentSheetName: "Detail",
      targetSheetName: "Detail",
      insertionRow: 10,
      rowDelta: 4,
    })).toBe("IF(A14=\"Row 10\",RevenueTable[@Revenue],\"A20\")");
  });

  it("preserves the leading equals sign and absolute markers while shifting rows", () => {
    expect(shiftFormulaRows("=$A$10+$B11+SUM($C$12:D13)", {
      currentSheetName: "Detail",
      targetSheetName: "Detail",
      insertionRow: 11,
      rowDelta: 1,
    })).toBe("=$A$10+$B12+SUM($C$13:D14)");
  });

  it("expands ranges that terminate at the insertion boundary", () => {
    expect(shiftFormulaRows("SUM(D4:D4)+AVERAGE($E$2:E4)", {
      currentSheetName: "Invoice",
      targetSheetName: "Invoice",
      insertionRow: 5,
      rowDelta: 2,
    })).toBe("SUM(D4:D6)+AVERAGE($E$2:E6)");
  });

  it("offsets copied formulas while preserving absolute rows and off-sheet references", () => {
    expect(offsetFormulaRows("=SUM(A2,$B$3,Detail!C4,'Other Sheet'!D5,RevenueTable[@Revenue])", {
      currentSheetName: "Detail",
      targetSheetName: "Detail",
      rowOffset: 2,
    })).toBe("=SUM(A4,$B$3,Detail!C6,'Other Sheet'!D5,RevenueTable[@Revenue])");
  });

  it("preserves string literals while offsetting copied formulas", () => {
    expect(offsetFormulaRows("IF(A2=\"B3\",B2,\"A10\")", {
      currentSheetName: "Detail",
      targetSheetName: "Detail",
      rowOffset: 3,
    })).toBe("IF(A5=\"B3\",B5,\"A10\")");
  });
});
