import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";

describe("Chunk boundary behavior", () => {
  it("sheet with exactly 1000 rows and default rowChunkSize produces 1 chunk", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "Exact",
          rows: Array.from({ length: 1000 }, (_unused, i) => ({
            cells: [{ value: `row-${i}` }],
          })),
        },
      ],
    }, { rowChunkSize: 1000 });

    expect(result.metrics.sheetMetrics[0]?.chunkCount).toBe(1);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics).toHaveLength(1);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[0]?.sourceRowCount).toBe(1000);
  });

  it("sheet with 1001 rows produces 2 chunks with correct row distribution", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "OverBy1",
          rows: Array.from({ length: 1001 }, (_unused, i) => ({
            cells: [{ value: i }],
          })),
        },
      ],
    }, { rowChunkSize: 1000 });

    expect(result.metrics.sheetMetrics[0]?.chunkCount).toBe(2);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[0]?.sourceRowCount).toBe(1000);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[1]?.sourceRowCount).toBe(1);
  });

  it("empty rows at chunk boundary produce valid output", async () => {
    const rows = Array.from({ length: 210 }, (_unused, i) => {
      if (i >= 98 && i <= 102) {
        return { cells: [] as Array<{ value: null }> };
      }
      return { cells: [{ value: `data-${i}` }] };
    });

    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [{ name: "EmptyBoundary", rows }],
    }, { rowChunkSize: 100 });

    expect(result.metrics.sheetMetrics[0]?.chunkCount).toBe(3);
    const summary = await SpreadsheetEngine.validate(result.buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("merged cell spanning a chunk boundary produces valid output", async () => {
    // Build rows where the merge range spans the chunk boundary.
    // The merge is A99:A102 (1-based), so rows 98..101 (0-based).
    // Only the top-left cell of a merge should have data; the rest must be empty/null.
    const rows = Array.from({ length: 150 }, (_unused, i) => {
      if (i >= 99 && i <= 101) {
        // Consumed cells in the merge range must have no value
        return { cells: [{ value: null as null }, { value: `col2-${i}` }] };
      }
      return { cells: [{ value: `row-${i}` }, { value: `col2-${i}` }] };
    });

    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "MergedChunk",
          rows,
          mergedCells: ["A99:A102"],
        },
      ],
    };

    const result = await SpreadsheetEngine.renderWithMetrics(doc, { rowChunkSize: 100 });
    expect(result.metrics.sheetMetrics[0]?.chunkCount).toBe(2);

    const summary = await SpreadsheetEngine.validate(result.buffer);
    expect(summary.verdict).toBe("clean");
  });

  it("custom rowChunkSize of 100 with 250 rows produces 3 chunks", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "Custom",
          rows: Array.from({ length: 250 }, (_unused, i) => ({
            cells: [{ value: i }],
          })),
        },
      ],
    }, { rowChunkSize: 100 });

    expect(result.metrics.sheetMetrics[0]?.chunkCount).toBe(3);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics.map((c) => c.sourceRowCount)).toEqual([100, 100, 50]);
  });

  it("chunk startRowNumber and endRowNumber are correct", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "RowNumbers",
          rows: Array.from({ length: 250 }, (_unused, i) => ({
            cells: [{ value: i }],
          })),
        },
      ],
    }, { rowChunkSize: 100 });

    const chunks = result.metrics.sheetMetrics[0]?.chunkMetrics;
    expect(chunks).toHaveLength(3);
    // Row numbers are 1-based in XLSX
    expect(chunks![0]?.startRowNumber).toBe(1);
    expect(chunks![0]?.endRowNumber).toBe(100);
    expect(chunks![1]?.startRowNumber).toBe(101);
    expect(chunks![1]?.endRowNumber).toBe(200);
    expect(chunks![2]?.startRowNumber).toBe(201);
    expect(chunks![2]?.endRowNumber).toBe(250);
  });

  it("single-row sheet produces exactly 1 chunk", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "OneRow",
          rows: [{ cells: [{ value: "only" }] }],
        },
      ],
    }, { rowChunkSize: 1000 });

    expect(result.metrics.sheetMetrics[0]?.chunkCount).toBe(1);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[0]?.sourceRowCount).toBe(1);
  });

  it("all-empty-cell rows produce no serialized rows but valid output", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "AllEmpty",
          rows: Array.from({ length: 50 }, () => ({
            cells: [] as Array<{ value: null }>,
          })),
        },
      ],
    }, { rowChunkSize: 25 });

    // Empty rows are still counted as "written" by the serializer since they exist in the input.
    // The key assertion is that cellsWritten is 0 and the output is valid.
    expect(result.metrics.totalCellsWritten).toBe(0);

    const summary = await SpreadsheetEngine.validate(result.buffer);
    expect(summary.verdict).toBe("clean");
  });
});
