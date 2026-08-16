// tests/ghostGrid.test.ts — Ghost Grid Constraint Matrix tests

import { describe, it, expect } from "vitest";
import { applyGhostGrid } from "../src/layout/ghostGrid.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { TableData } from "../src/types/ast.js";

const PIXEL_TO_EMU = 9525;
function toEmu(px: number): number {
  return Math.round(px * PIXEL_TO_EMU);
}

/** Helper: build a minimal LayoutNode (View) with layout metrics. */
function makeView(
  x: number,
  y: number,
  width: number,
  height: number,
  children?: LayoutNode[],
): LayoutNode {
  return {
    type: "View",
    layout: { x, y, width, height },
    ...(children ? { children } : {}),
  } as LayoutNode;
}

/** Helper: build a Slide LayoutNode. */
function makeSlide(
  width: number,
  height: number,
  children: LayoutNode[],
): LayoutNode {
  return {
    type: "Slide",
    layout: { x: 0, y: 0, width, height },
    children,
  } as LayoutNode;
}

/** Helper: build a Table LayoutNode with tableData. */
function makeTable(
  x: number,
  y: number,
  width: number,
  height: number,
  columns: number[],
): LayoutNode {
  const tableData: TableData = {
    columns: [...columns],
    rows: [{ cells: columns.map(() => ({ text: "cell" })) }],
  };
  return {
    type: "Table",
    layout: { x, y, width, height },
    tableData,
  } as unknown as LayoutNode;
}

describe("Ghost Grid Constraint Matrix", () => {
  // Test 1 — Sub-Pixel Flush
  it("snaps sub-pixel adjacent edges to identical EMU values", () => {
    // Two adjacent views: A ends at 100.00001, B starts at 100.00001
    const a = makeView(0, 0, 100.3, 50);
    const b = makeView(100.00001, 0, 99.7, 50);
    const slide = makeSlide(200, 50, [a, b]);

    applyGhostGrid(slide);

    const aRight = a.layout.x + a.layout.width;
    const bLeft = b.layout.x;

    // They should be snapped to the same value
    expect(toEmu(aRight)).toBe(toEmu(bLeft));
  });

  // Test 2 — Table Grid Integrity
  it("ensures table column EMU sum equals table width EMU", () => {
    // 5 columns that sum to ~200 but individual rounding creates drift
    const columns = [40.1, 39.9, 40.3, 39.7, 40.0];
    const tableWidth = columns.reduce((s, c) => s + c, 0); // 200
    const table = makeTable(0, 0, tableWidth, 100, columns);
    const slide = makeSlide(960, 540, [table]);

    applyGhostGrid(slide);

    const td = (table as unknown as { tableData: TableData }).tableData;
    const emuSum = td.columns.reduce((sum, c) => sum + toEmu(c), 0);
    const expectedEmu = toEmu(table.layout.width);

    expect(emuSum).toBe(expectedEmu);
  });

  // Test 3 — Performance (10K nodes)
  it("processes 10,000 nodes in < 50ms", () => {
    const children: LayoutNode[] = [];
    for (let i = 0; i < 10_000; i++) {
      // Micro-random offsets to simulate Yoga drift
      const offset = (Math.random() - 0.5) * 0.001;
      children.push(makeView(i * 0.096 + offset, offset, 0.096, 0.054));
    }
    const slide = makeSlide(960, 540, children);

    const start = performance.now();
    applyGhostGrid(slide);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  // Test 4 — Slide boundary snap (P1 priority)
  it("snaps child edge to slide boundary (P1 priority)", () => {
    // Child left edge at 0.0001 — should snap to slide's left edge at 0
    const child = makeView(0.0001, 10, 100, 50);
    const slide = makeSlide(960, 540, [child]);

    applyGhostGrid(slide);

    expect(child.layout.x).toBe(0);
  });

  // Test 5 — Parent beats child (P2 priority)
  it("uses parent edge value over child (P2 priority)", () => {
    // Parent left at 50, child left at 50.0001
    // Parent is shallower, so its value wins
    const child = makeView(50.0001, 0, 80, 40);
    const parent = makeView(50, 0, 200, 100, [child]);
    const slide = makeSlide(960, 540, [parent]);

    applyGhostGrid(slide);

    expect(child.layout.x).toBe(50);
  });

  // Test 6 — Zero-dimension clamp
  it("clamps near-zero dimensions to at least 1 EMU", () => {
    const tiny = makeView(10, 10, 0.00001, 0.00001);
    const slide = makeSlide(960, 540, [tiny]);

    applyGhostGrid(slide);

    expect(toEmu(tiny.layout.width)).toBeGreaterThanOrEqual(1);
    expect(toEmu(tiny.layout.height)).toBeGreaterThanOrEqual(1);
  });

  // Test 7 — Empty slide
  it("handles empty slide without crashing", () => {
    const slide = makeSlide(960, 540, []);

    expect(() => applyGhostGrid(slide)).not.toThrow();
  });

  // Test 8 — Determinism
  it("produces byte-identical layout values on repeated runs", () => {
    function buildTree(): LayoutNode {
      return makeSlide(960, 540, [
        makeView(0, 0, 100.00001, 50.00001),
        makeView(100.00002, 0, 99.99999, 50.00002),
        makeView(0, 50.00001, 200, 50),
      ]);
    }

    const tree1 = buildTree();
    applyGhostGrid(tree1);

    const tree2 = buildTree();
    applyGhostGrid(tree2);

    // Compare all layout values
    function collectLayouts(node: LayoutNode): number[] {
      const vals = [node.layout.x, node.layout.y, node.layout.width, node.layout.height];
      if (node.children) {
        for (const child of node.children) {
          vals.push(...collectLayouts(child));
        }
      }
      return vals;
    }

    const layouts1 = collectLayouts(tree1);
    const layouts2 = collectLayouts(tree2);

    expect(layouts1).toEqual(layouts2);
  });
});
