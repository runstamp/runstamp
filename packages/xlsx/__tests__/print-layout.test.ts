import { describe, expect, it } from "vitest";
import { chartSafeRowBreaks, estimatePrintLayout } from "../src/layout/print-layout.js";

describe("print layout estimation", () => {
  it("accounts for drawing-only columns included by the print area", () => {
    const layout = estimatePrintLayout({
      name: "Budget",
      columns: Array.from({ length: 8 }, () => ({ width: 11 })),
      rows: Array.from({ length: 28 }, () => ({ cells: [{ value: "Budget" }] })),
      pageSetup: {
        orientation: "landscape",
        fitToWidth: 1,
        printArea: "A1:O28",
      },
    });

    expect(layout.columnWidths).toHaveLength(15);
    expect(layout.contentWidthPoints).toBeGreaterThan(layout.printableWidthPoints);
    expect(layout.scale).toBeLessThan(1);
  });

  it("balances explicit multi-page tables with deterministic manual breaks", () => {
    expect(chartSafeRowBreaks({
      name: "Amortization",
      rows: Array.from({ length: 73 }, () => ({ cells: [{ value: "row" }] })),
      pageSetup: { fitToHeight: 2, fitToWidth: 1 },
    })).toEqual([37]);
  });
});
