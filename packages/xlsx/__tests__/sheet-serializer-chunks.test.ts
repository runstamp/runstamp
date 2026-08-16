import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formulas/evaluator.js";
import { serializeSheet, serializeSheetChunks } from "../src/serializers/sheet-serializer.js";
import { SharedStringTable } from "../src/serializers/shared-strings.js";
import { StyleRegistry } from "../src/serializers/style-registry.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";

function createSerializeOptions(document: SpreadsheetDocument) {
  return {
    defaults: document.defaults,
    formulaEvaluator: new FormulaEvaluator(document),
    rowChunkSize: 100,
    sharedStrings: new SharedStringTable(),
    styleRegistry: new StyleRegistry(document.defaults),
    selected: true,
    stringStrategy: "sharedStrings" as const,
  };
}

describe("Sheet chunk serializer", () => {
  it("emits bounded row chunks that reconstruct the same worksheet XML", () => {
    const document: SpreadsheetDocument = {
      sheets: [
        {
          name: "Chunked",
          freezePane: { row: 1, col: 1 },
          autoFilter: true,
          rows: Array.from({ length: 250 }, (_unused, rowIndex) => ({
            cells: [
              { value: `row-${rowIndex}` },
              { value: rowIndex },
              { value: "https://runstamp.com", hyperlink: "https://runstamp.com" },
            ],
          })),
        },
      ],
    };

    const chunked = serializeSheetChunks(document.sheets[0]!, createSerializeOptions(document));
    const serialized = serializeSheet(document.sheets[0]!, createSerializeOptions(document));

    expect(chunked.rowChunks).toHaveLength(3);
    expect(chunked.rowChunks.map((chunk) => chunk.sourceRowCount)).toEqual([100, 100, 50]);
    expect(chunked.rowChunks.map((chunk) => chunk.startRowNumber)).toEqual([1, 101, 201]);
    expect(chunked.rowChunks.map((chunk) => chunk.endRowNumber)).toEqual([100, 200, 250]);
    expect(chunked.metrics).toMatchObject({
      totalRowsWritten: 250,
      totalSerializedRows: 250,
      totalCellsWritten: 750,
      chunkCount: 3,
    });
    expect(chunked.prefix).toContain("<sheetData>");
    expect(chunked.suffix.startsWith("</sheetData>")).toBe(true);
    expect(chunked.prefix + chunked.rowChunks.map((chunk) => chunk.xml).join("") + chunked.suffix).toBe(serialized.xml);
    expect(chunked.relationships).toContain("hyperlink");
  });
});
