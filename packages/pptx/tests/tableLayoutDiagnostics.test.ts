import { describe, expect, it } from "vitest";
import { generateTableXml } from "../src/ooxml/drawing/table.js";
import {
  collectAbsoluteDocumentLayoutDebug,
  validateAbsoluteDocumentLayout,
} from "../src/layout/absoluteSafety.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { PaperDocument, PaperTable } from "../src/types/ast.js";

function makeTableNode(partial: Partial<PaperTable> & { tableData: PaperTable["tableData"] }): LayoutNode {
  return {
    type: "Table",
    style: { width: 400, height: 300 },
    tableData: partial.tableData,
    layout: { x: 0, y: 0, width: 400, height: 300 },
  } as unknown as LayoutNode;
}

function rowHeights(xml: string): number[] {
  return Array.from(xml.matchAll(/<a:tr h="(\d+)"/g)).map((match) => Number(match[1]));
}

describe("table row layout diagnostics", () => {
  it("emits multilingual table cells with language, RTL, and script font buckets", () => {
    const node = makeTableNode({
      tableData: {
        columns: [200, 200],
        rows: [
          {
            cells: [
              {
                text: "東京市場",
                style: {
                  fontFamily: "Arial",
                  fontSize: 12,
                  lang: "ja-JP",
                },
              },
              {
                text: "خطة التنفيذ",
                style: {
                  fontFamily: "Arial",
                  fontSize: 12,
                  lang: "ar-SA",
                  rtl: true,
                  textAlign: "right",
                },
              },
            ],
          },
        ],
      },
    });

    const { xml } = generateTableXml(node, 2);

    expect(xml).toContain('lang="ja-JP"');
    expect(xml).toContain('<a:ea typeface=""/>');
    expect(xml).toContain('rtlCol="1"');
    expect(xml).toContain('<a:pPr algn="r" rtl="1">');
    expect(xml).toContain('lang="ar-SA"');
    expect(xml).toContain('<a:cs typeface=""/>');
    expect(xml).toContain('<a:rtl/>');
  });

  it("fills the assigned table frame with planned row heights by default", () => {
    const node = makeTableNode({
      tableData: {
        columns: [200, 200],
        rows: [
          { cells: [{ text: "A" }, { text: "B" }] },
          { cells: [{ text: "C" }, { text: "D" }] },
          { cells: [{ text: "E" }, { text: "F" }] },
        ],
      },
    });

    const { xml } = generateTableXml(node, 2);

    expect(rowHeights(xml)).toEqual([952500, 952500, 952500]);
    expect(xml).toContain('cy="2857500"');
  });

  it("preserves compact natural rows when rowLayout.mode is natural", () => {
    const node = makeTableNode({
      tableData: {
        columns: [200, 200],
        rowLayout: { mode: "natural" },
        rows: [
          { cells: [{ text: "A" }, { text: "B" }] },
          { cells: [{ text: "C" }, { text: "D" }] },
        ],
      },
    });

    const { xml } = generateTableXml(node, 2);
    const heights = rowHeights(xml);

    expect(heights).toHaveLength(2);
    expect(heights[0]).toBeLessThan(952500);
    expect(heights[1]).toBeLessThan(952500);
  });

  it("reports overfull tables instead of silently compressing rows", () => {
    const doc: PaperDocument = {
      type: "Document",
      slideSize: { width: 960, height: 540 },
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 260,
            height: 36,
          },
          tableData: {
            columns: [130, 130],
            rows: [
              { minHeight: 34, cells: [{ text: "Long row content that wraps" }, { text: "More wrapping text" }] },
              { minHeight: 34, cells: [{ text: "Second row" }, { text: "Also too tall" }] },
            ],
          },
        }],
      }],
    };

    const issues = validateAbsoluteDocumentLayout(doc);
    const debug = collectAbsoluteDocumentLayoutDebug(doc);

    expect(issues.some((issue) => issue.code === "TABLE_OVERFULL")).toBe(true);
    expect(debug[0].nodes[0].tableFit?.overfull).toBe(true);
    expect(debug[0].nodes[0].tableFit?.rows.every((row) => row.assignedHeight >= row.naturalHeight)).toBe(true);
    expect(debug[0].nodes[0].tableFit?.compressedRows).toEqual([]);
  });
});
