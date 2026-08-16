import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import { dateToSerial, dateToSerialString } from "../src/utils/date.js";
import { readZipEntry } from "./helpers.js";

describe("chunk boundary edge cases", () => {
  it("sheet with exactly 1000 rows -> 1 chunk", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "Boundary",
          rows: Array.from({ length: 1000 }, (_unused, i) => ({
            cells: [{ value: i }],
          })),
        },
      ],
    }, { rowChunkSize: 1000 });

    expect(result.metrics.sheetMetrics[0]?.chunkMetrics).toHaveLength(1);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[0]?.sourceRowCount).toBe(1000);
  });

  it("sheet with 1001 rows -> 2 chunks", async () => {
    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [
        {
          name: "Boundary",
          rows: Array.from({ length: 1001 }, (_unused, i) => ({
            cells: [{ value: i }],
          })),
        },
      ],
    }, { rowChunkSize: 1000 });

    expect(result.metrics.sheetMetrics[0]?.chunkMetrics).toHaveLength(2);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[0]?.sourceRowCount).toBe(1000);
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics[1]?.sourceRowCount).toBe(1);
  });

  it("empty rows at chunk boundaries are handled gracefully", async () => {
    // Create rows where several rows near the chunk boundary are empty.
    // The serializer counts source rows (including empty) for chunking,
    // but empty rows without data/style/height are not serialized.
    // Verify the workbook remains valid even with empty rows at boundaries.
    const rows = Array.from({ length: 1010 }, (_unused, i) => {
      if (i >= 998 && i <= 1002) {
        // Empty rows spanning the chunk boundary
        return { cells: [] as Array<{ value: null }> };
      }
      return { cells: [{ value: i }] };
    });

    const result = await SpreadsheetEngine.renderWithMetrics({
      sheets: [{ name: "EmptyBoundary", rows }],
    }, { rowChunkSize: 1000 });

    // Verify there are 2 chunks (1010 source rows > 1000)
    expect(result.metrics.sheetMetrics[0]?.chunkMetrics).toHaveLength(2);

    // Verify the workbook is valid
    const summary = await SpreadsheetEngine.validate(result.buffer);
    expect(summary.verdict).toBe("clean");
  });
});

describe("date serial consistency", () => {
  it("date serial in formula cachedValue matches serializer output", async () => {
    const testDate = new Date(Date.UTC(2026, 2, 27));
    const expectedSerial = dateToSerial(testDate);

    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Consistency",
          rows: [
            {
              cells: [
                // Direct date value
                { value: testDate },
                // Formula with date cached value
                {
                  formula: {
                    expression: "=TODAY()",
                    cachedValue: testDate,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    const serialStr = dateToSerialString(testDate);

    // Both the direct cell and formula cached value should produce the same serial
    const matches = sheetXml.match(new RegExp(`<v>${serialStr.replace(".", "\\.")}</v>`, "g"));
    expect(matches).toHaveLength(2);
  });
});
