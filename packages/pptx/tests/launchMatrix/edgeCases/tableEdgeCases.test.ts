/**
 * Edge case tests for table rendering.
 */
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../../../src/engine.js";
import { makeDoc } from "../helpers/templateHelpers.js";
import {
  assertValidPptx, assertTableDimensions, assertMergedCells,
} from "../helpers/verificationUtils.js";
import type { PaperSlide, PaperTable, TableRow } from "../../../src/types/ast.js";

function tableSlide(tableData: any, style?: Record<string, any>): PaperSlide {
  return {
    type: "Slide",
    children: [{
      type: "Table",
      style: { position: "absolute", top: 40, left: 40, width: 880, ...style },
      tableData,
    } as PaperTable],
  };
}

describe("Table Edge Cases", () => {
  // T-TABLE-01: 20x15 table
  it("T-TABLE-01: 20x15 table renders", async () => {
    const cols = 15;
    const rowCount = 20;
    const colWidths = Array.from({ length: cols }, () => Math.floor(880 / cols));
    const rows: TableRow[] = Array.from({ length: rowCount }, (_, ri) => ({
      height: 20,
      cells: Array.from({ length: cols }, (_, ci) => ({
        text: `R${ri + 1}C${ci + 1}`,
        style: { fontSize: 8, padding: 2 },
      })),
    }));
    const doc = makeDoc([tableSlide({ columns: colWidths, rows })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertTableDimensions(buffer, 0, rowCount, cols);
  });

  // T-TABLE-02: 5x5 merge (gridSpan 5 on header)
  it("T-TABLE-02: gridSpan 5 merged header renders", async () => {
    const cols = 5;
    const colWidths = Array.from({ length: cols }, () => 176);
    const rows: TableRow[] = [
      {
        height: 30,
        cells: [
          { text: "Merged Header", colSpan: 5, style: { fontWeight: "bold", textAlign: "center", fontSize: 12 } },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
        ],
      },
      ...Array.from({ length: 4 }, (_, ri) => ({
        height: 24,
        cells: Array.from({ length: cols }, (_, ci) => ({
          text: `${ri + 1}-${ci + 1}`,
          style: { fontSize: 9, padding: 4 },
        })),
      })),
    ];
    const doc = makeDoc([tableSlide({ columns: colWidths, rows })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertMergedCells(buffer, 0);
  });

  // T-TABLE-03: Wide table (13"+ total column widths)
  it("T-TABLE-03: wide table (13\"+) renders", async () => {
    const cols = 10;
    // Each column 130px wide = 1300px total (wider than standard 960px slide)
    const colWidths = Array.from({ length: cols }, () => 130);
    const rows: TableRow[] = [
      {
        height: 24,
        cells: Array.from({ length: cols }, (_, ci) => ({
          text: `Header ${ci + 1}`,
          style: { fontWeight: "bold", fontSize: 9 },
        })),
      },
      {
        height: 24,
        cells: Array.from({ length: cols }, (_, ci) => ({
          text: `Data ${ci + 1}`,
          style: { fontSize: 9 },
        })),
      },
    ];
    const doc = makeDoc([tableSlide({ columns: colWidths, rows })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TABLE-04: Cell with 1000 chars
  it("T-TABLE-04: cell with 1000 chars renders", async () => {
    const longText = "Lorem ipsum dolor sit amet. ".repeat(36).slice(0, 1000);
    const rows: TableRow[] = [
      { height: 24, cells: [{ text: "Header", style: { fontWeight: "bold" } }] },
      { height: 200, cells: [{ text: longText, style: { fontSize: 8, padding: 4 } }] },
    ];
    const doc = makeDoc([tableSlide({ columns: [880], rows })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TABLE-05: Complex merges (rowSpan + colSpan in same table)
  it("T-TABLE-05: complex merges with rowSpan and colSpan", async () => {
    const colWidths = [200, 200, 200, 200];
    const rows: TableRow[] = [
      {
        height: 30,
        cells: [
          { text: "Span 2 cols", colSpan: 2, style: { fontWeight: "bold", textAlign: "center" } },
          { text: "", hMerge: true },
          { text: "Span 2 rows", rowSpan: 2, style: { fontWeight: "bold", textAlign: "center" } },
          { text: "Normal", style: { fontSize: 9 } },
        ],
      },
      {
        height: 24,
        cells: [
          { text: "A", style: { fontSize: 9 } },
          { text: "B", style: { fontSize: 9 } },
          // rowSpan continuation cell
          { text: "", vMerge: true },
          { text: "C", style: { fontSize: 9 } },
        ],
      },
      {
        height: 24,
        cells: [
          { text: "D", style: { fontSize: 9 } },
          { text: "E", style: { fontSize: 9 } },
          { text: "F", style: { fontSize: 9 } },
          { text: "G", style: { fontSize: 9 } },
        ],
      },
    ];
    const doc = makeDoc([tableSlide({ columns: colWidths, rows })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertMergedCells(buffer, 0);
  });

  // T-TABLE-06: Styled cells (various fills, fonts, alignments)
  it("T-TABLE-06: styled cells render", async () => {
    const colWidths = [220, 220, 220, 220];
    const rows: TableRow[] = [
      {
        height: 30,
        cells: [
          { text: "Navy BG", style: { fill: "#0F2540", color: "#FFFFFF", fontWeight: "bold", fontSize: 11, textAlign: "center", padding: 6 } },
          { text: "Green BG", style: { fill: "#00B050", color: "#FFFFFF", fontStyle: "italic", fontSize: 11, textAlign: "left", padding: 6 } },
          { text: "Right Aligned", style: { fill: "#F5F5F5", fontSize: 10, textAlign: "right", padding: 6 } },
          { text: "Large Font", style: { fontSize: 16, fontWeight: "bold", textAlign: "center", padding: 6 } },
        ],
      },
      {
        height: 24,
        cells: [
          { text: "Small", style: { fontSize: 7, padding: 2 } },
          { text: "Middle Aligned", style: { fontSize: 9, verticalAlign: "middle", padding: 4 } },
          { text: "Bottom Aligned", style: { fontSize: 9, verticalAlign: "bottom", padding: 4 } },
          { text: "Bordered", style: { fontSize: 9, padding: 4, borders: { bottom: { width: 2, color: "#C00000" } } } },
        ],
      },
    ];
    const doc = makeDoc([tableSlide({ columns: colWidths, rows })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });
});
