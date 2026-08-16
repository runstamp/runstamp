import { describe, expect, it } from "vitest";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import type { PdfColor, PdfRectGraphic, PdfSolidFill } from "../src/phase4-types.js";

function rgb(r: number, g: number, b: number): PdfColor {
  return { b: b / 255, g: g / 255, r: r / 255, space: "rgb" };
}

function cell(value: string, backgroundColor?: PdfColor) {
  return {
    children: [{ type: "paragraph" as const, value }],
    style: backgroundColor === undefined ? undefined : { backgroundColor },
  };
}

function isSolidFillRect(graphic: unknown): graphic is PdfRectGraphic & { fill: PdfSolidFill } {
  if (typeof graphic !== "object" || graphic === null || !("type" in graphic) || !("fill" in graphic)) {
    return false;
  }
  return graphic.type === "rect" && graphic.fill?.space === "solid";
}

describe("VQH-018 row background rendering", () => {
  it("paints every cell with the cell ?? row ?? table background cascade", async () => {
    const tableBackground = rgb(224, 224, 224);
    const firstRowBackground = rgb(51, 102, 153);
    const secondRowBackground = rgb(46, 125, 50);
    const cellBackground = rgb(204, 51, 0);
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { height: 240, width: 300 } },
      children: [{
        type: "table",
        columns: [{}, {}],
        style: { backgroundColor: tableBackground },
        body: [
          {
            style: { backgroundColor: firstRowBackground },
            cells: [cell("row one, cell one"), cell("row one, cell two")],
          },
          {
            style: { backgroundColor: secondRowBackground },
            cells: [cell("cell override", cellBackground), cell("row fallback")],
          },
          {
            cells: [cell("table fallback one"), cell("table fallback two")],
          },
        ],
      }],
    });
    const fills = (analysis.pages[0]?.graphics ?? []).filter(isSolidFillRect);

    expect(fills.map(({ fill }) => fill.color)).toEqual([
      firstRowBackground,
      firstRowBackground,
      cellBackground,
      secondRowBackground,
      tableBackground,
      tableBackground,
    ]);

    for (const rowStart of [0, 2, 4]) {
      const left = fills[rowStart];
      const right = fills[rowStart + 1];
      expect(left).toBeDefined();
      expect(right).toBeDefined();
      expect(left!.x + left!.width).toBeCloseTo(right!.x);
      expect(left!.y).toBeCloseTo(right!.y);
      expect(left!.height).toBeCloseTo(right!.height);
    }

    expect(fills[2]!.y + fills[2]!.height).toBeCloseTo(fills[0]!.y);
  });

  it("emits full alternating fill bands for zebra rows", async () => {
    const zebraBackground = rgb(238, 242, 247);
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { height: 240, width: 300 } },
      children: [{
        type: "table",
        columns: [{}, {}],
        body: Array.from({ length: 4 }, (_, rowIndex) => ({
          style: rowIndex % 2 === 0 ? { backgroundColor: zebraBackground } : undefined,
          cells: [cell(`row ${rowIndex + 1}, cell one`), cell(`row ${rowIndex + 1}, cell two`)],
        })),
      }],
    });
    const fills = (analysis.pages[0]?.graphics ?? []).filter(isSolidFillRect);
    const filledRowYs = [...new Set(fills.map(({ y }) => y))].sort((a, b) => b - a);

    expect(fills).toHaveLength(4);
    expect(fills.map(({ fill }) => fill.color)).toEqual(Array.from({ length: 4 }, () => zebraBackground));
    expect(filledRowYs).toHaveLength(2);
    expect(filledRowYs[0]! - filledRowYs[1]!).toBeCloseTo(2 * fills[0]!.height);
    expect(fills[0]!.x + fills[0]!.width).toBeCloseTo(fills[1]!.x);
    expect(fills[2]!.x + fills[2]!.width).toBeCloseTo(fills[3]!.x);
  });
});
