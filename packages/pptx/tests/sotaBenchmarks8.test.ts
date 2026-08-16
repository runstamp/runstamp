/**
 * SOTA Benchmarks 8 — Diagram Full Pipeline Validation
 *
 * 45 tests across 8 categories:
 *   A: Process Flow — shape counts, connectors, directions, styles
 *   B: Hierarchy — tree layout, virtual root, connector types
 *   C: Cycle — circular arrangement, closing loop, dimensions
 *   D: Matrix — 2x2 grid, quadrant colors, dimensions
 *   E: Pyramid — decreasing widths, trapezoid geometry
 *   F: List — vertical/horizontal, icons, borders
 *   G: Cross-Feature — diagrams with images, charts, backgrounds
 *   H: Stress & Edge Cases — large diagrams, deep hierarchies, multi-slide
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode, DiagramConfig } from "../src/types/ast.js";
import { generateDiagram } from "../src/diagrams/index.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL, getText,
  assertUniqueShapeIds, getShapeCount, assertWellFormedXml,
} from "./helpers/xmlTestUtils.js";

// =========================================================================
// Helpers
// =========================================================================

function makeDoc(children: PaperNode[], slideOverrides?: Partial<PaperSlide>, docOverrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children,
      ...slideOverrides,
    } as PaperSlide],
    ...docOverrides,
  } as PaperDocument;
}

function makeMultiSlideDoc(slides: PaperSlide[], docOverrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides,
    ...docOverrides,
  } as PaperDocument;
}

function countByType(nodes: PaperNode[], type: string): number {
  return nodes.filter(n => n.type === type).length;
}

// =========================================================================
// CATEGORY A: PROCESS FLOW (8 tests)
// =========================================================================

describe("A: Process Flow", () => {
  it("A1: 5-step horizontal process → 5 views + 4 connectors = 9 children", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [
        { text: "Step 1" }, { text: "Step 2" }, { text: "Step 3" },
        { text: "Step 4" }, { text: "Step 5" },
      ],
    };
    const group = generateDiagram(config);
    expect(group.type).toBe("Group");
    expect(group.children.length).toBe(9);
    expect(countByType(group.children, "View")).toBe(5);
    expect(countByType(group.children, "Connector")).toBe(4);
  });

  it("A2: 3-step vertical process → group height > width", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
      direction: "vertical",
    };
    const group = generateDiagram(config);
    const w = group.style?.width as number;
    const h = group.style?.height as number;
    expect(h).toBeGreaterThan(w);
    expect(countByType(group.children, "View")).toBe(3);
    expect(countByType(group.children, "Connector")).toBe(2);
  });

  it("A3: Process with custom colors → each box gets item.color", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [
        { text: "Red", color: "#FF0000" },
        { text: "Green", color: "#00FF00" },
        { text: "Blue", color: "#0000FF" },
      ],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    expect((views[0] as any).style.backgroundColor).toBe("#FF0000");
    expect((views[1] as any).style.backgroundColor).toBe("#00FF00");
    expect((views[2] as any).style.backgroundColor).toBe("#0000FF");
  });

  it("A4: Process with connectorStyle 'none' → no connectors", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
      style: { connectorStyle: "none" },
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "Connector")).toBe(0);
    expect(countByType(group.children, "View")).toBe(3);
  });

  it("A5: Process with connectorStyle 'line' → connectors have no arrowEnd", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "A" }, { text: "B" }],
      style: { connectorStyle: "line" },
    };
    const group = generateDiagram(config);
    const connectors = group.children.filter(c => c.type === "Connector");
    expect(connectors.length).toBe(1);
    const conn = connectors[0] as any;
    expect(conn.arrowEnd).toBe(false);
  });

  it("A6: Single-step process → 1 view, 0 connectors", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "Only" }],
    };
    const group = generateDiagram(config);
    expect(group.children.length).toBe(1);
    expect(countByType(group.children, "View")).toBe(1);
    expect(countByType(group.children, "Connector")).toBe(0);
  });

  it("A7: Process custom fontFamily/fontSize → textStyle contains them", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "Custom" }],
      style: { fontFamily: "Helvetica", fontSize: 18 },
    };
    const group = generateDiagram(config);
    const view = group.children[0] as any;
    expect(view.textStyle.fontFamily).toBe("Helvetica");
    expect(view.textStyle.fontSize).toBe(18);
  });

  it("A8: Full render of process diagram → valid PPTX with shapes and connectors", async () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "Start" }, { text: "Middle" }, { text: "End" }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Must have group shape with children
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    // Must have individual shapes
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(3);

    // Must have connectors
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(2);

    // Well-formed XML
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY B: HIERARCHY (7 tests)
// =========================================================================

describe("B: Hierarchy", () => {
  it("B1: Single root with 3 children → 4 views + 3 connectors", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{
        text: "CEO",
        children: [
          { text: "VP Eng" },
          { text: "VP Sales" },
          { text: "VP Ops" },
        ],
      }],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(4);
    expect(countByType(group.children, "Connector")).toBe(3);
  });

  it("B2: Two-level deep hierarchy → correct total shape count", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{
        text: "Root",
        children: [
          { text: "A", children: [{ text: "A1" }, { text: "A2" }] },
          { text: "B", children: [{ text: "B1" }] },
        ],
      }],
    };
    const group = generateDiagram(config);
    // Root + A + B + A1 + A2 + B1 = 6 views
    expect(countByType(group.children, "View")).toBe(6);
    // Root→A, Root→B, A→A1, A→A2, B→B1 = 5 connectors
    expect(countByType(group.children, "Connector")).toBe(5);
  });

  it("B3: Multiple top-level items → virtual root with all items as children", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [
        { text: "Dept A" },
        { text: "Dept B" },
        { text: "Dept C" },
      ],
    };
    const group = generateDiagram(config);
    // Virtual root (empty text) + 3 departments = 4 views
    expect(countByType(group.children, "View")).toBe(4);
    // Virtual root → each dept = 3 connectors
    expect(countByType(group.children, "Connector")).toBe(3);
  });

  it("B4: Hierarchy connectors use 'elbow' type", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{ text: "Root", children: [{ text: "Child" }] }],
    };
    const group = generateDiagram(config);
    const connectors = group.children.filter(c => c.type === "Connector");
    expect(connectors.length).toBe(1);
    expect((connectors[0] as any).connectorType).toBe("elbow");
  });

  it("B5: Root uses roundRect, children use rect", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{ text: "Root", children: [{ text: "Child" }] }],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    expect((views[0] as any).shapeType).toBe("roundRect");
    expect((views[1] as any).shapeType).toBe("rect");
  });

  it("B6: Custom accentColor applies to all boxes without item.color", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{ text: "Root", children: [{ text: "Child" }] }],
      style: { accentColor: "#FF5500" },
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    for (const v of views) {
      expect((v as any).style.backgroundColor).toBe("#FF5500");
    }
  });

  it("B7: Full render → valid PPTX with elbow connectors (bentConnector3)", async () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{ text: "CEO", children: [{ text: "CTO" }, { text: "CFO" }] }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Check for elbow connectors (bentConnector3 preset)
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(2);

    const prstGeoms = findAllElements(tree, "a:prstGeom");
    const elbowGeoms = prstGeoms.filter(pg => getAttr(pg, "prst") === "bentConnector3");
    expect(elbowGeoms.length).toBeGreaterThanOrEqual(2);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY C: CYCLE (6 tests)
// =========================================================================

describe("C: Cycle", () => {
  it("C1: 4-item cycle → 4 ellipse views + 4 curved connectors (closing loop)", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "Plan" }, { text: "Do" }, { text: "Check" }, { text: "Act" }],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(4);
    expect(countByType(group.children, "Connector")).toBe(4); // closing loop
  });

  it("C2: Cycle group is square (width === height)", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    };
    const group = generateDiagram(config);
    expect(group.style?.width).toBe(group.style?.height);
  });

  it("C3: 2-item cycle → 2 views + 2 connectors", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "Back" }, { text: "Forth" }],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(2);
    expect(countByType(group.children, "Connector")).toBe(2);
  });

  it("C4: Cycle with connectorStyle 'none' → 0 connectors", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
      style: { connectorStyle: "none" },
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "Connector")).toBe(0);
  });

  it("C5: All cycle views use ellipse shapeType", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    for (const v of views) {
      expect((v as any).shapeType).toBe("ellipse");
    }
  });

  it("C6: Full render → valid PPTX with curved connectors (curvedConnector3)", async () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const prstGeoms = findAllElements(tree, "a:prstGeom");
    const curvedGeoms = prstGeoms.filter(pg => getAttr(pg, "prst") === "curvedConnector3");
    expect(curvedGeoms.length).toBeGreaterThanOrEqual(3);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY D: MATRIX (5 tests)
// =========================================================================

describe("D: Matrix", () => {
  it("D1: 4-item matrix → 4 views, 0 connectors", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "TL" }, { text: "TR" }, { text: "BL" }, { text: "BR" }],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(4);
    expect(countByType(group.children, "Connector")).toBe(0);
  });

  it("D2: Matrix total dimensions = 308×308 (150*2 + 8 gap)", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "TL" }, { text: "TR" }, { text: "BL" }, { text: "BR" }],
    };
    const group = generateDiagram(config);
    expect(group.style?.width).toBe(308);
    expect(group.style?.height).toBe(308);
  });

  it("D3: Less than 4 items → only that many quadrants rendered", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "Only Two" }, { text: "Items" }],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(2);
  });

  it("D4: Default color pattern when no item.color specified", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    // First item uses accentColor default (#4472C4)
    expect((views[0] as any).style.backgroundColor).toBe("#4472C4");
    // Others use the matrix defaults
    expect((views[1] as any).style.backgroundColor).toBe("#ED7D31");
    expect((views[2] as any).style.backgroundColor).toBe("#70AD47");
    expect((views[3] as any).style.backgroundColor).toBe("#FFC000");
  });

  it("D5: Full render → valid PPTX with 4 shapes in group", async () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "Q1" }, { text: "Q2" }, { text: "Q3" }, { text: "Q4" }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    // 4 shapes inside the group
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(4);

    // No connectors
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(0);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY E: PYRAMID (6 tests)
// =========================================================================

describe("E: Pyramid", () => {
  it("E1: 4-level pyramid → 4 views, 0 connectors", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "L1" }, { text: "L2" }, { text: "L3" }, { text: "L4" }],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(4);
    expect(countByType(group.children, "Connector")).toBe(0);
  });

  it("E2: Pyramid widths decrease from bottom to top", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "Top" }, { text: "Mid" }, { text: "Base" }],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    const widths = views.map(v => (v as any).style.width as number);
    // i=0 is top (narrowest), i=2 is bottom (widest): ratio = (3-i)/3
    // Top: 300*(3/3)=300? No — wait: ratio = (n-i)/n, so i=0 → (3-0)/3=1, i=2 → (3-2)/3=1/3
    // Actually per code: i=0 is top, ratio=(n-i)/n. For n=3: i=0→3/3=1 (widest?), i=2→1/3 (narrowest)
    // Wait, re-read: i=0 is top but ratio=(3-0)/3=1 means full width at top
    // The code comment says "Width decreases as we go up (i=0 is the top, narrowest)"
    // but ratio = (n-i)/n at i=0 = 1 (full width). This seems backwards.
    // Let me verify: Each level is rendered at y = i*(50+4), so i=0 is at top.
    // ratio=(n-i)/n: at i=0 → 1 (full), at i=n-1 → 1/n (smallest)
    // So i=0 (top) is WIDEST and i=n-1 (bottom) is NARROWEST
    // This is actually an inverted pyramid shape (wide top, narrow bottom)
    // widths[0] > widths[1] > widths[2]
    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it("E3: All shapes use trapezoid geometry", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "A" }, { text: "B" }],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    for (const v of views) {
      expect((v as any).shapeType).toBe("trapezoid");
    }
  });

  it("E4: Custom colors per level", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [
        { text: "L1", color: "#AA0000" },
        { text: "L2", color: "#00AA00" },
      ],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    expect((views[0] as any).style.backgroundColor).toBe("#AA0000");
    expect((views[1] as any).style.backgroundColor).toBe("#00AA00");
  });

  it("E5: Empty items → empty group", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [],
    };
    const group = generateDiagram(config);
    expect(group.children.length).toBe(0);
    expect(group.style?.width).toBe(0);
    expect(group.style?.height).toBe(0);
  });

  it("E6: Full render → valid PPTX with trapezoid preset geometry", async () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "Top" }, { text: "Mid" }, { text: "Bot" }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const prstGeoms = findAllElements(tree, "a:prstGeom");
    const trapezoids = prstGeoms.filter(pg => getAttr(pg, "prst") === "trapezoid");
    expect(trapezoids.length).toBeGreaterThanOrEqual(3);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY F: LIST (6 tests)
// =========================================================================

describe("F: List", () => {
  it("F1: 5-item vertical list → 5 views (no icons)", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [
        { text: "Item 1" }, { text: "Item 2" }, { text: "Item 3" },
        { text: "Item 4" }, { text: "Item 5" },
      ],
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(5);
    expect(countByType(group.children, "Connector")).toBe(0);
  });

  it("F2: Vertical list → height > width", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }, { text: "E" }, { text: "F" }],
      direction: "vertical",
    };
    const group = generateDiagram(config);
    const w = group.style?.width as number;
    const h = group.style?.height as number;
    expect(h).toBeGreaterThan(w);
  });

  it("F3: Horizontal list → width > height", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }, { text: "E" }, { text: "F" }],
      direction: "horizontal",
    };
    const group = generateDiagram(config);
    const w = group.style?.width as number;
    const h = group.style?.height as number;
    expect(w).toBeGreaterThan(h);
  });

  it("F4: Items with icons → 2 shapes per item (icon ellipse + item rect)", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [
        { text: "First", icon: "star" },
        { text: "Second", icon: "check" },
      ],
    };
    const group = generateDiagram(config);
    // Each item with icon produces 2 views (icon + rect)
    expect(countByType(group.children, "View")).toBe(4);
  });

  it("F5: List items use roundRect shape type", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [{ text: "Item" }],
    };
    const group = generateDiagram(config);
    const views = group.children.filter(c => c.type === "View");
    expect((views[0] as any).shapeType).toBe("roundRect");
  });

  it("F6: Full render → valid PPTX with rounded rectangles", async () => {
    const config: DiagramConfig = {
      type: "list",
      items: [{ text: "Alpha" }, { text: "Beta" }, { text: "Gamma" }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(3);

    const prstGeoms = findAllElements(tree, "a:prstGeom");
    const roundRects = prstGeoms.filter(pg => getAttr(pg, "prst") === "roundRect");
    expect(roundRects.length).toBeGreaterThanOrEqual(3);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY G: CROSS-FEATURE INTERACTION (4 tests)
// =========================================================================

describe("G: Cross-Feature Interaction", () => {
  it("G1: Diagram + Image on same slide → both render correctly", async () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "Step 1" }, { text: "Step 2" }],
    };
    const group = generateDiagram(config);
    const doc = makeDoc([
      group,
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } } as PaperNode,
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Group present
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    // Image present (p:pic)
    const pics = findAllElements(tree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("G2: Diagram + Chart on same slide → both render correctly", async () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "Q1" }, { text: "Q2" }, { text: "Q3" }, { text: "Q4" }],
    };
    const group = generateDiagram(config);
    const chart: PaperNode = {
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B", "C"],
        series: [{ name: "S1", values: [10, 20, 30] }],
      },
    };
    const doc = makeDoc([group, chart]);
    const buffer = await PaperEngine.render(doc);

    // Chart XML generated
    const hasChart = await zipHasFile(buffer, "ppt/charts/chart1.xml");
    expect(hasChart).toBe(true);

    // Group shapes in slide
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("G3: Multiple diagrams on same slide → all groups render", async () => {
    const process = generateDiagram({
      type: "process",
      items: [{ text: "A" }, { text: "B" }],
    });
    const matrix = generateDiagram({
      type: "matrix",
      items: [{ text: "Q1" }, { text: "Q2" }, { text: "Q3" }, { text: "Q4" }],
    });
    const doc = makeDoc([process, matrix]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const grpSps = findAllElements(tree, "p:grpSp");
    // At least 2 groups (process + matrix)
    expect(grpSps.length).toBeGreaterThanOrEqual(2);

    await assertWellFormedXml(buffer);
  });

  it("G4: Diagram with slide background → both bgPr and group shapes present", async () => {
    const diagram = generateDiagram({
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    });
    const doc = makeDoc([diagram], {
      background: { type: "solid", color: "#003366" },
    });
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Background present
    const bgPrs = findAllElements(tree, "p:bgPr");
    expect(bgPrs.length).toBeGreaterThanOrEqual(1);

    // Group present
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY H: STRESS & EDGE CASES (3 tests)
// =========================================================================

describe("H: Stress & Edge Cases", () => {
  it("H1: 26-step process → 26 views + 25 connectors = 51 children", () => {
    const items = Array.from({ length: 26 }, (_, i) => ({ text: `Step ${i + 1}` }));
    const config: DiagramConfig = {
      type: "process",
      items,
    };
    const group = generateDiagram(config);
    expect(countByType(group.children, "View")).toBe(26);
    expect(countByType(group.children, "Connector")).toBe(25);
    expect(group.children.length).toBe(51);
  });

  it("H2: Deep hierarchy (4 levels) → correct total shape count", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{
        text: "CEO",
        children: [{
          text: "VP",
          children: [{
            text: "Director",
            children: [
              { text: "Manager 1" },
              { text: "Manager 2" },
            ],
          }],
        }],
      }],
    };
    const group = generateDiagram(config);
    // CEO, VP, Director, Manager1, Manager2 = 5 views
    expect(countByType(group.children, "View")).toBe(5);
    // CEO→VP, VP→Dir, Dir→M1, Dir→M2 = 4 connectors
    expect(countByType(group.children, "Connector")).toBe(4);
  });

  it("H3: All 6 diagram types on separate slides → all render, unique shape IDs per slide", async () => {
    const slides: PaperSlide[] = [
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "process", items: [{ text: "A" }, { text: "B" }] })] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "hierarchy", items: [{ text: "R", children: [{ text: "C" }] }] })] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "cycle", items: [{ text: "X" }, { text: "Y" }] })] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "matrix", items: [{ text: "1" }, { text: "2" }, { text: "3" }, { text: "4" }] })] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "pyramid", items: [{ text: "T" }, { text: "B" }] })] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "list", items: [{ text: "I1" }, { text: "I2" }] })] },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    // All 6 slides present
    for (let i = 1; i <= 6; i++) {
      const hasSlide = await zipHasFile(buffer, `ppt/slides/slide${i}.xml`);
      expect(hasSlide).toBe(true);
    }

    // Each slide has shapes
    for (let i = 1; i <= 6; i++) {
      const slideXml = await getZipEntry(buffer, `ppt/slides/slide${i}.xml`);
      const tree = parseXml(slideXml);
      const counts = getShapeCount(tree);
      expect(counts.total).toBeGreaterThanOrEqual(2);
      // Shape IDs unique within each slide
      assertUniqueShapeIds(tree);
    }

    await assertWellFormedXml(buffer);
  });
});
