import { describe, expect, it } from "vitest";
import { cellRef, colIndexToLetter, parseCellRef, rangeRef, rowIndexToRowNum } from "../src/index.js";

describe("cell reference utilities", () => {
  it("encodes columns and rows into A1 references", () => {
    expect(colIndexToLetter(0)).toBe("A");
    expect(colIndexToLetter(25)).toBe("Z");
    expect(colIndexToLetter(26)).toBe("AA");
    expect(colIndexToLetter(16_383)).toBe("XFD");
    expect(rowIndexToRowNum(0)).toBe("1");
    expect(rowIndexToRowNum(99)).toBe("100");
    expect(cellRef(99, 27)).toBe("AB100");
    expect(rangeRef(0, 0, 99, 3)).toBe("A1:D100");
  });

  it("parses cell references back to zero-based coordinates", () => {
    expect(parseCellRef("AB100")).toEqual({ row: 99, col: 27 });
    expect(parseCellRef("XFD1048576")).toEqual({ row: 1_048_575, col: 16_383 });
  });

  it("rejects invalid references and out-of-range columns", () => {
    expect(() => parseCellRef("0A")).toThrow("Invalid cell reference");
    expect(() => colIndexToLetter(-1)).toThrow("outside Excel's supported range");
    expect(() => colIndexToLetter(16_384)).toThrow("outside Excel's supported range");
  });
});
