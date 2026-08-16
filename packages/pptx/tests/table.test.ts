import { describe, it, expect } from "vitest";
import { generateTableXml } from "../src/ooxml/drawing/table.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { PaperTable } from "../src/types/ast.js";

// Helper: build a minimal LayoutNode for a PaperTable
function makeTableNode(partial: Partial<PaperTable> & { tableData: PaperTable["tableData"] }): LayoutNode {
  return {
    type: "Table",
    style: { width: 400, height: 100 },
    tableData: partial.tableData,
    layout: { x: 0, y: 0, width: 400, height: 100 },
  } as unknown as LayoutNode;
}

describe("generateTableXml — Benchmark 1: Table Grid Integrity", () => {
  it("produces exactly three <a:gridCol> elements with correct EMU widths", () => {
    const node = makeTableNode({
      tableData: {
        columns: [100, 200, 100],
        rows: [
          { height: 30, cells: [{ text: "A" }, { text: "B" }, { text: "C" }] },
        ],
      },
    });

    const { xml } = generateTableXml(node, 2);

    // Must contain the grid wrapper
    expect(xml).toContain("<a:tblGrid>");
    expect(xml).toContain("</a:tblGrid>");

    // Must have exactly three gridCol elements
    const gridColMatches = xml.match(/<a:gridCol/g);
    expect(gridColMatches).not.toBeNull();
    expect(gridColMatches!.length).toBe(3);

    // 100px * 9525 = 952500
    // 200px * 9525 = 1905000
    // 100px * 9525 = 952500
    expect(xml).toContain('w="952500"');
    expect(xml).toContain('w="1905000"');

    // Verify both 952500 appear (first and third column)
    const w952 = xml.match(/w="952500"/g);
    expect(w952).not.toBeNull();
    expect(w952!.length).toBe(2);
  });

  it("wraps the table in <p:graphicFrame> with the correct graphic URI", () => {
    const node = makeTableNode({
      tableData: { columns: [200], rows: [{ cells: [{ text: "X" }] }] },
    });
    const { xml } = generateTableXml(node, 3);
    expect(xml).toContain("<p:graphicFrame>");
    expect(xml).toContain(
      'uri="http://schemas.openxmlformats.org/drawingml/2006/table"',
    );
    expect(xml).toContain("<a:tbl>");
  });
});

describe("generateTableXml — Benchmark 2: Matrix Cell Merge Compliance", () => {
  it("emits two <a:tc> in the first row when cell[0] has colSpan=2", () => {
    // 2×2 table, top-left cell spans both columns
    const node = makeTableNode({
      tableData: {
        columns: [150, 150],
        rows: [
          {
            height: 30,
            cells: [
              { text: "Merged Header", colSpan: 2 },
              { text: "", hMerge: true }, // ghost cell — required by OOXML
            ],
          },
          {
            height: 30,
            cells: [{ text: "Left" }, { text: "Right" }],
          },
        ],
      },
    });

    const { xml } = generateTableXml(node, 2);

    // There must be two <a:tr> elements
    const trMatches = xml.match(/<a:tr /g);
    expect(trMatches).not.toBeNull();
    expect(trMatches!.length).toBe(2);

    // The first <a:tr> block must contain two <a:tc> elements
    const firstTrStart = xml.indexOf("<a:tr ");
    const firstTrEnd = xml.indexOf("</a:tr>", firstTrStart) + "</a:tr>".length;
    const firstTrXml = xml.slice(firstTrStart, firstTrEnd);

    // Use negative lookahead to avoid matching <a:tcPr/> which also starts with "<a:tc"
    const tcInFirstRow = firstTrXml.match(/<a:tc(?!Pr)/g);
    expect(tcInFirstRow).not.toBeNull();
    expect(tcInFirstRow!.length).toBe(2);

    // First <a:tc> must carry gridSpan="2"
    expect(firstTrXml).toContain('gridSpan="2"');

    // Ghost cell must be present but carry hMerge="1"
    expect(firstTrXml).toContain('hMerge="1"');
  });

  it("emits vMerge attribute on ghost cells for vertical merges", () => {
    const node = makeTableNode({
      tableData: {
        columns: [200],
        rows: [
          { height: 30, cells: [{ text: "Top", rowSpan: 2 }] },
          { height: 30, cells: [{ text: "", vMerge: true }] },
        ],
      },
    });

    const { xml } = generateTableXml(node, 2);

    expect(xml).toContain('rowSpan="2"');
    expect(xml).toContain('vMerge="1"');
  });
});
