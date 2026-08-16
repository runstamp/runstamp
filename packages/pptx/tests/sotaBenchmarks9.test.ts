/**
 * SOTA Benchmarks 9 — Edge Cases & Robustness
 *
 * 60 tests across 6 categories:
 *   A: Empty/Null Inputs — empty text, 0-width shapes, empty series, 0 slides
 *   B: Extreme Values — large fonts, tiny borders, extreme rotation/opacity
 *   C: Unicode & Special Characters — emoji, RTL, CJK, XML specials, surrogate pairs
 *   D: Table Edge Cases — many columns, L-shape merges, all-merged, rich paragraph cells
 *   E: Chart Edge Cases — large datasets, single-value pie, all-negative waterfall, stock
 *   F: rId Chain Integrity — multi-media slides, multi-slide counters, isolation
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode, TableData, ChartData } from "../src/types/ast.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL, getText, TINY_VIDEO, TINY_AUDIO,
  assertUniqueShapeIds, assertRIdsResolve, getShapeCount,
  assertWellFormedXml, getZipEntryBuffer,
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

// =========================================================================
// CATEGORY A: EMPTY/NULL INPUTS (10 tests)
// =========================================================================

describe("A: Empty/Null Inputs", () => {
  it("A1: Empty text content renders without crash", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14 },
      content: "",
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("A2: Text with empty TextRun array renders", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14 },
      content: [],
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("A3: View with no children renders as empty shape", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 100, height: 100, backgroundColor: "#FF0000" },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(1);
  });

  it("A4: Chart with empty categories still renders", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "bar",
        categories: [],
        series: [{ name: "Empty", values: [] }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const hasChart = await zipHasFile(buffer, "ppt/charts/chart1.xml");
    expect(hasChart).toBe(true);
    await assertWellFormedXml(buffer);
  });

  it("A5: Table with empty text cells renders", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [
        { cells: [{ text: "" }, { text: "" }] },
        { cells: [{ text: "" }, { text: "" }] },
      ],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 200, height: 100 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const tcs = findAllElements(tree, "a:tc");
    expect(tcs.length).toBeGreaterThanOrEqual(4);
    await assertWellFormedXml(buffer);
  });

  it("A6: Slide with no children renders", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("A7: Group with no children renders", async () => {
    const doc = makeDoc([{
      type: "Group",
      style: { width: 100, height: 100 },
      children: [],
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("A8: Text with undefined content renders", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14 },
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("A9: Connector with start === end coordinates renders", async () => {
    const doc = makeDoc([{
      type: "Connector",
      connectorType: "straight",
      start: { x: 100, y: 100 },
      end: { x: 100, y: 100 },
      lineWidth: 1,
      lineColor: "#000000",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(1);
  });

  it("A10: Empty paragraph array renders", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14 },
      paragraphs: [],
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY B: EXTREME VALUES (10 tests)
// =========================================================================

describe("B: Extreme Values", () => {
  it("B1: Very large font (1000pt) renders without crash", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 500, height: 500, fontSize: 1000 },
      content: "HUGE",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // fontSize in OOXML is in 100ths of a point (px * 75 = px * 72/96 * 100)
    expect(slideXml).toContain("sz=\"75000\"");
    await assertWellFormedXml(buffer);
  });

  it("B2: Very small border width (0.001px) renders", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 100, height: 100,
        backgroundColor: "#CCCCCC",
        borderWidth: 0.001,
        borderColor: "#000000",
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("B3: Rotation 359.99 degrees → valid EMU rotation value", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 100, height: 100,
        backgroundColor: "#FF0000",
        rotation: 359.99,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const xfrms = findAllElements(tree, "a:xfrm");
    const rotXfrm = xfrms.find(x => getAttr(x, "rot"));
    expect(rotXfrm).toBeDefined();
    const rot = parseInt(getAttr(rotXfrm!, "rot")!, 10);
    // 359.99 * 60000 = 21599400
    expect(rot).toBeGreaterThan(0);
    expect(rot).toBeLessThanOrEqual(21600000);
  });

  it("B4: Opacity 0.0 → alpha value 0 in fill", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 100, height: 100,
        backgroundColor: "#FF0000",
        opacity: 0.0,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // alpha 0 = val="0"
    expect(slideXml).toContain("alpha");
    await assertWellFormedXml(buffer);
  });

  it("B5: Opacity 1.0 → no alpha modifier needed or alpha=100000", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 100, height: 100,
        backgroundColor: "#FF0000",
        opacity: 1.0,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // Either no alpha element or alpha=100000
    const tree = parseXml(slideXml);
    const alphas = findAllElements(tree, "a:alpha");
    if (alphas.length > 0) {
      expect(getAttr(alphas[0], "val")).toBe("100000");
    }
    await assertWellFormedXml(buffer);
  });

  it("B6: Very wide shape (5000px) renders valid EMU", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 5000, height: 100, backgroundColor: "#AABBCC" },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const exts = findAllElements(tree, "a:ext");
    // 5000 * 9525 = 47625000 EMU
    const wideExt = exts.find(e => {
      const cx = getAttr(e, "cx");
      return cx && parseInt(cx, 10) > 40000000;
    });
    expect(wideExt).toBeDefined();
    await assertWellFormedXml(buffer);
  });

  it("B7: Line height 0 renders without crash", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14, lineHeight: 0 },
      content: "Zero leading",
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("B8: Border radius on image equal to image size", async () => {
    const doc = makeDoc([{
      type: "Image",
      src: RED_PIXEL,
      style: { width: 100, height: 100 },
      borderRadius: 100,
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });

  it("B9: Chart explosion value at maximum (400)", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "pie",
        categories: ["A", "B", "C"],
        series: [{ name: "S1", values: [10, 20, 30] }],
        explosion: 400,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("explosion");
    await assertWellFormedXml(buffer);
  });

  it("B10: Very small shape (1x1 px) renders", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 1, height: 1, backgroundColor: "#000000" },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(1);
    // Shape should have very small EMU dimensions
    const exts = findAllElements(tree, "a:ext");
    const smallExt = exts.find(e => {
      const cx = getAttr(e, "cx");
      return cx && parseInt(cx, 10) > 0 && parseInt(cx, 10) <= 9525;
    });
    expect(smallExt).toBeDefined();
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY C: UNICODE & SPECIAL CHARACTERS (10 tests)
// =========================================================================

describe("C: Unicode & Special Characters", () => {
  it("C1: Emoji text renders in PPTX", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 24 },
      content: "Hello 🎉🚀💡",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // Emoji should be preserved in text
    expect(slideXml).toContain("🎉");
    expect(slideXml).toContain("🚀");
    await assertWellFormedXml(buffer);
  });

  it("C2: ZWJ emoji sequences preserve correctly", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 24 },
      content: "Family: 👨‍👩‍👧‍👦",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("Family");
    await assertWellFormedXml(buffer);
  });

  it("C3: XML special characters are escaped (& < > \" ')", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 14 },
      content: "A & B < C > D \"E\" F",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // Must be escaped
    expect(slideXml).toContain("&amp;");
    expect(slideXml).toContain("&lt;");
    expect(slideXml).toContain("&gt;");
    // XML must be well-formed
    await assertWellFormedXml(buffer);
  });

  it("C4: Arabic RTL text renders with rtl attributes", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 14, rtl: true },
      content: "مرحبا بالعالم",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("rtl");
    expect(slideXml).toContain("مرحبا");
    await assertWellFormedXml(buffer);
  });

  it("C5: CJK text (Japanese/Chinese/Korean) renders", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 80, fontSize: 16 },
      content: "日本語テスト 中文测试 한국어",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("日本語");
    expect(slideXml).toContain("中文");
    expect(slideXml).toContain("한국어");
    await assertWellFormedXml(buffer);
  });

  it("C6: Chart category with special characters → escaped in chart XML", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "bar",
        categories: ["Q1 & Q2", "Revenue < $1M", "Growth > 50%"],
        series: [{ name: "Data & More", values: [10, 20, 30] }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    // Special chars must be escaped in chart XML too
    expect(chartXml).toContain("&amp;");
    expect(chartXml).toContain("&lt;");
    expect(chartXml).toContain("&gt;");
    await assertWellFormedXml(buffer);
  });

  it("C7: Table cell text with XML specials → escaped", async () => {
    const tableData: TableData = {
      columns: [200],
      rows: [
        { cells: [{ text: "Tom & Jerry <heroes>" }] },
      ],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 200, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("&amp;");
    expect(slideXml).toContain("&lt;");
    await assertWellFormedXml(buffer);
  });

  it("C8: Mixed script text (Latin + CJK + Arabic) in single run", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 400, height: 60, fontSize: 14 },
      content: "Hello 世界 مرحبا",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("Hello");
    expect(slideXml).toContain("世界");
    await assertWellFormedXml(buffer);
  });

  it("C9: Newline characters in text preserved or handled", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 100, fontSize: 14 },
      content: "Line one\nLine two\nLine three",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // Either multiple paragraphs or line break element
    const tree = parseXml(slideXml);
    const paras = findAllElements(tree, "a:p");
    expect(paras.length).toBeGreaterThanOrEqual(1);
    await assertWellFormedXml(buffer);
  });

  it("C10: Tab characters in text handled gracefully", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 14 },
      content: "Column1\tColumn2\tColumn3",
    }]);
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY D: TABLE EDGE CASES (10 tests)
// =========================================================================

describe("D: Table Edge Cases", () => {
  it("D1: 20-column table → all gridCol elements emitted", async () => {
    const cols = Array.from({ length: 20 }, () => 50);
    const cells = Array.from({ length: 20 }, (_, i) => ({ text: `C${i + 1}` }));
    const tableData: TableData = {
      columns: cols,
      rows: [{ cells }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 1000, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(20);
    await assertWellFormedXml(buffer);
  });

  it("D2: Horizontal merge (colSpan=3) → gridSpan and hMerge cells", async () => {
    const tableData: TableData = {
      columns: [100, 100, 100],
      rows: [{
        cells: [
          { text: "Merged", colSpan: 3 },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
        ],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("gridSpan=\"3\"");
    expect(slideXml).toContain("hMerge=\"1\"");
    // All 3 cells must be present
    const tree = parseXml(slideXml);
    const tcs = findAllElements(tree, "a:tc");
    expect(tcs.length).toBeGreaterThanOrEqual(3);
    await assertWellFormedXml(buffer);
  });

  it("D3: Vertical merge (rowSpan=2) → rowSpan and vMerge cells", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [
        { cells: [{ text: "Merged", rowSpan: 2 }, { text: "R1C2" }] },
        { cells: [{ text: "", vMerge: true }, { text: "R2C2" }] },
      ],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 200, height: 100 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("rowSpan=\"2\"");
    expect(slideXml).toContain("vMerge=\"1\"");
    await assertWellFormedXml(buffer);
  });

  it("D4: L-shape merge (colSpan + rowSpan) → all ghost cells present", async () => {
    const tableData: TableData = {
      columns: [100, 100, 100],
      rows: [
        { cells: [{ text: "Big", colSpan: 2, rowSpan: 2 }, { text: "", hMerge: true }, { text: "R1C3" }] },
        { cells: [{ text: "", vMerge: true }, { text: "", vMerge: true, hMerge: true }, { text: "R2C3" }] },
        { cells: [{ text: "R3C1" }, { text: "R3C2" }, { text: "R3C3" }] },
      ],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 150 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    // 3 rows × 3 cols = 9 cells total
    const tcs = findAllElements(tree, "a:tc");
    expect(tcs.length).toBeGreaterThanOrEqual(9);
    await assertWellFormedXml(buffer);
  });

  it("D5: Table with rich paragraph cells", async () => {
    const tableData: TableData = {
      columns: [200, 200],
      rows: [{
        cells: [
          {
            text: "",
            paragraphs: [
              { runs: [{ text: "Bold", style: { fontWeight: "bold" } }, { text: " and normal" }] },
              { runs: [{ text: "Second paragraph" }] },
            ],
          },
          { text: "Simple" },
        ],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 80 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("Bold");
    expect(slideXml).toContain("Second paragraph");
    // Bold attribute present
    expect(slideXml).toContain("b=\"1\"");
    await assertWellFormedXml(buffer);
  });

  it("D6: Table with cell fill colors", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [{
        cells: [
          { text: "Red", style: { fill: "#FF0000" } },
          { text: "Blue", style: { fill: "#0000FF" } },
        ],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 200, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("FF0000");
    expect(slideXml).toContain("0000FF");
    await assertWellFormedXml(buffer);
  });

  it("D7: Table with cell borders on all sides", async () => {
    const tableData: TableData = {
      columns: [100],
      rows: [{
        cells: [{
          text: "Bordered",
          style: {
            borders: {
              top: { width: 2, color: "#000000" },
              right: { width: 2, color: "#000000" },
              bottom: { width: 2, color: "#000000" },
              left: { width: 2, color: "#000000" },
            },
          },
        }],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 100, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    // Must have all 4 border elements
    const lnLs = findAllElements(tree, "a:lnL");
    const lnRs = findAllElements(tree, "a:lnR");
    const lnTs = findAllElements(tree, "a:lnT");
    const lnBs = findAllElements(tree, "a:lnB");
    expect(lnLs.length).toBeGreaterThanOrEqual(1);
    expect(lnRs.length).toBeGreaterThanOrEqual(1);
    expect(lnTs.length).toBeGreaterThanOrEqual(1);
    expect(lnBs.length).toBeGreaterThanOrEqual(1);
    await assertWellFormedXml(buffer);
  });

  it("D8: Table with diagonal borders", async () => {
    const tableData: TableData = {
      columns: [100],
      rows: [{
        cells: [{
          text: "Diagonal",
          style: {
            borders: {
              diagonalDown: { width: 1, color: "#FF0000" },
              diagonalUp: { width: 1, color: "#0000FF" },
            },
          },
        }],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 100, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("lnTlToBr");
    expect(slideXml).toContain("lnBlToTr");
    await assertWellFormedXml(buffer);
  });

  it("D9: Table with verticalAlign on cells", async () => {
    const tableData: TableData = {
      columns: [100, 100, 100],
      rows: [{
        height: 80,
        cells: [
          { text: "Top", style: { verticalAlign: "top" } },
          { text: "Mid", style: { verticalAlign: "middle" } },
          { text: "Bot", style: { verticalAlign: "bottom" } },
        ],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 80 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("anchor=\"t\"");
    expect(slideXml).toContain("anchor=\"ctr\"");
    expect(slideXml).toContain("anchor=\"b\"");
    await assertWellFormedXml(buffer);
  });

  it("D10: Table with TableStyle banding and header row", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [
        { cells: [{ text: "H1" }, { text: "H2" }] },
        { cells: [{ text: "R1" }, { text: "R2" }] },
        { cells: [{ text: "R3" }, { text: "R4" }] },
      ],
      style: {
        firstRow: true,
        bandRow: true,
        headerRowStyle: { fill: "#003366", color: "#FFFFFF", fontWeight: "bold" },
        bandRowOddStyle: { fill: "#E8E8E8" },
      },
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 200, height: 120 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("firstRow=\"1\"");
    expect(slideXml).toContain("bandRow=\"1\"");
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY E: CHART EDGE CASES (10 tests)
// =========================================================================

describe("E: Chart Edge Cases", () => {
  it("E1: 100-point scatter chart renders", async () => {
    const dataPoints = Array.from({ length: 100 }, (_, i) => ({
      x: i, y: Math.sin(i / 10) * 100,
    }));
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 600, height: 400 },
      chartData: {
        chartType: "scatter",
        xySeries: [{ name: "Sine", dataPoints }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("scatterChart");
    await assertWellFormedXml(buffer);
  });

  it("E2: Single-value pie chart renders", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "pie",
        categories: ["Only"],
        series: [{ name: "S1", values: [100] }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("pieChart");
    await assertWellFormedXml(buffer);
  });

  it("E3: All-negative waterfall chart renders", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 500, height: 350 },
      chartData: {
        chartType: "waterfall",
        waterfallData: {
          categories: ["Loss A", "Loss B", "Loss C", "Total"],
          values: [-50, -30, -20, -100],
          totalIndices: [3],
          decreaseColor: "#FF0000",
          totalColor: "#333333",
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("barChart");
    await assertWellFormedXml(buffer);
  });

  it("E4: Stock OHLC chart with valid data structure", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 500, height: 350 },
      chartData: {
        chartType: "stock",
        stockData: {
          categories: ["Day 1", "Day 2", "Day 3"],
          open: [100, 105, 98],
          high: [110, 112, 105],
          low: [95, 100, 90],
          close: [105, 98, 102],
          hiLowLines: true,
          upDownBars: true,
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("stockChart");
    expect(chartXml).toContain("hiLowLines");
    await assertWellFormedXml(buffer);
  });

  it("E5: Funnel chart renders as horizontal stacked bar", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "funnel",
        funnelData: {
          categories: ["Leads", "Qualified", "Proposals", "Closed"],
          values: [1000, 500, 200, 50],
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    // Funnel uses barChart with barDir="bar"
    expect(chartXml).toContain("barChart");
    await assertWellFormedXml(buffer);
  });

  it("E6: Radar chart with filled style", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 400 },
      chartData: {
        chartType: "radar",
        radarStyle: "filled",
        categories: ["Speed", "Power", "Skill", "Defense", "Magic"],
        series: [{ name: "Player", values: [80, 60, 90, 70, 85] }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("radarChart");
    expect(chartXml).toContain("filled");
    await assertWellFormedXml(buffer);
  });

  it("E7: Chart with data labels showing all fields", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [100, 200] }],
        dataLabels: {
          showVal: true,
          showCatName: true,
          showSerName: true,
          showPercent: true,
          position: "outEnd",
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("showVal");
    expect(chartXml).toContain("showCatName");
    expect(chartXml).toContain("showSerName");
    await assertWellFormedXml(buffer);
  });

  it("E8: Chart with trendline renders", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "line",
        categories: ["Q1", "Q2", "Q3", "Q4"],
        series: [{
          name: "Revenue",
          values: [100, 150, 180, 250],
          trendline: { type: "linear", displayEquation: true },
        }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("trendline");
    await assertWellFormedXml(buffer);
  });

  it("E9: Chart with data table below", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 500, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["2020", "2021", "2022"],
        series: [
          { name: "Revenue", values: [100, 150, 200] },
          { name: "Cost", values: [80, 90, 110] },
        ],
        dataTable: {
          showKeys: true,
          showHorzBorder: true,
          showVertBorder: true,
          showOutline: true,
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("dTable");
    await assertWellFormedXml(buffer);
  });

  it("E10: Combo chart with dual axis renders both axes", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 500, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["Q1", "Q2", "Q3", "Q4"],
        series: [
          { name: "Revenue", values: [100, 150, 200, 250] },
          { name: "Growth %", values: [10, 15, 12, 18], overrideType: "line", targetAxis: "secondary" },
        ],
        secondaryValueAxis: { title: "Growth %" },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    // Should have secondary value axis
    const tree = parseXml(chartXml);
    const valAxes = findAllElements(tree, "c:valAx");
    expect(valAxes.length).toBeGreaterThanOrEqual(2);
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY F: rId CHAIN INTEGRITY (10 tests)
// =========================================================================

describe("F: rId Chain Integrity", () => {
  it("F1: Slide with image → rIds resolve in rels", async () => {
    const doc = makeDoc([{
      type: "Image",
      src: RED_PIXEL,
      style: { width: 100, height: 100 },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
  });

  it("F2: Slide with chart → chart rId resolves", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S", values: [10, 20] }],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
  });

  it("F3: Slide with image + chart → both rIds resolve, no overlap", async () => {
    const doc = makeDoc([
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } } as PaperNode,
      {
        type: "Chart", style: { width: 400, height: 300 },
        chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
      } as PaperNode,
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
  });

  it("F4: Slide with hyperlink → hyperlink rId resolves", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14 },
      content: [{ text: "Click me", hyperlink: "https://example.com" }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
  });

  it("F5: Multi-slide doc → global image counter increments", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [{ type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } }],
      },
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [{ type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } }],
      },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);
    // Both slides use identical RED_PIXEL → deduplication reduces to 1 file
    const mediaPaths = paths.filter(p => p.startsWith("ppt/media/image"));
    expect(mediaPaths.length).toBe(1);
  });

  it("F6: Multi-slide doc with charts → global chart counter increments", async () => {
    const makeChartSlide = (name: string): PaperSlide => ({
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [{
        type: "Chart",
        style: { width: 400, height: 300 },
        chartData: { chartType: "bar", categories: ["A"], series: [{ name, values: [10] }] },
      }],
    });
    const doc = makeMultiSlideDoc([makeChartSlide("S1"), makeChartSlide("S2")]);
    const buffer = await PaperEngine.render(doc);
    const hasChart1 = await zipHasFile(buffer, "ppt/charts/chart1.xml");
    const hasChart2 = await zipHasFile(buffer, "ppt/charts/chart2.xml");
    expect(hasChart1).toBe(true);
    expect(hasChart2).toBe(true);
  });

  it("F7: Image + fill image → separate rId sequences", async () => {
    const doc = makeDoc([
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } } as PaperNode,
      {
        type: "View",
        style: {
          width: 200, height: 200,
          fill: { type: "image", src: RED_PIXEL },
        },
      } as PaperNode,
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
    // Should have at least 2 image references
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const imageRels = rels.filter(r => getAttr(r, "Type")?.includes("image"));
    expect(imageRels.length).toBeGreaterThanOrEqual(2);
  });

  it("F8: Background image → its rId does not conflict with content images", async () => {
    const doc = makeDoc(
      [{ type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } } as PaperNode],
      { background: { type: "image", src: RED_PIXEL } },
    );
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
    await assertWellFormedXml(buffer);
  });

  it("F9: Slide with notes → notes rels file exists", async () => {
    const doc = makeDoc([], { notes: "Speaker notes text" });
    const buffer = await PaperEngine.render(doc);
    const hasNotes = await zipHasFile(buffer, "ppt/notesSlides/notesSlide1.xml");
    expect(hasNotes).toBe(true);
    await assertWellFormedXml(buffer);
  });

  it("F10: Multiple images + charts + hyperlinks on single slide → all rIds unique and resolve", async () => {
    const doc = makeDoc([
      { type: "Image", src: RED_PIXEL, style: { width: 50, height: 50 } } as PaperNode,
      { type: "Image", src: RED_PIXEL, style: { width: 50, height: 50 } } as PaperNode,
      {
        type: "Chart", style: { width: 300, height: 200 },
        chartData: { chartType: "pie", categories: ["A", "B"], series: [{ name: "S", values: [60, 40] }] },
      } as PaperNode,
      {
        type: "Text", style: { width: 200, height: 30, fontSize: 12 },
        content: [{ text: "Link", hyperlink: "https://example.com" }],
      } as PaperNode,
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);

    // All rIds must be unique in rels
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const ids = rels.map(r => getAttr(r, "Id"));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    await assertWellFormedXml(buffer);
  });
});
