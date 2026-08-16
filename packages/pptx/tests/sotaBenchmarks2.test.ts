/**
 * SOTA Benchmarks 2 — Structural XML validation for all new PPTX features.
 *
 * Every assertion operates on parsed XML DOM (via fast-xml-parser),
 * not string matching. Tests 17–39 per the SOTA Improvement Plan.
 */

import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import { toEmu, PIXEL_TO_EMU } from "../src/ooxml/drawing/math.js";

// ---------------------------------------------------------------------------
// XML Parse Helpers (same as sotaBenchmarks.test.ts)
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function parseXml(xml: string): any[] {
  return xmlParser.parse(xml);
}

function getTagName(el: any): string | undefined {
  return Object.keys(el).find(k => k !== ":@" && k !== "#text");
}

function getChildren(el: any): any[] {
  const tag = getTagName(el);
  return tag && Array.isArray(el[tag]) ? el[tag] : [];
}

function getAttr(el: any, name: string): string | undefined {
  return el[":@"]?.[`@_${name}`];
}

function getChildTagNames(el: any): string[] {
  return getChildren(el)
    .map(c => getTagName(c))
    .filter((t): t is string => !!t);
}

function findAllElements(tree: any[], tag: string): any[] {
  const results: any[] = [];
  (function walk(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      for (const k of Object.keys(n)) {
        if (k === ":@" || k === "#text") continue;
        if (k === tag) results.push(n);
        if (Array.isArray(n[k])) walk(n[k]);
      }
    }
  })(tree);
  return results;
}

function getText(el: any): string {
  return getChildren(el)
    .filter(c => "#text" in c)
    .map(c => String(c["#text"]))
    .join("");
}

// ---------------------------------------------------------------------------
// ZIP Helpers
// ---------------------------------------------------------------------------

async function getZipEntry(buffer: Buffer, path: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  if (!file) throw new Error(`${path} not found`);
  return file.async("string");
}

async function getZipPaths(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).filter(p => !zip.files[p].dir);
}

async function zipHasFile(buffer: Buffer, path: string): Promise<boolean> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file(path) !== null;
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const RED_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// =========================================================================
// BENCHMARK 17: Horizontal Bar Charts
// =========================================================================

describe("Benchmark 17: Horizontal Bar Charts", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a horizontal bar chart", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "bar",
            barDirection: "bar",
            categories: ["A", "B", "C"],
            series: [{ name: "S1", values: [10, 20, 30] }],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits <c:barDir val=\"bar\"/>", () => {
    const barDirs = findAllElements(chartTree, "c:barDir");
    expect(barDirs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(barDirs[0], "val")).toBe("bar");
  });

  it("category axis has axPos=\"l\" (left)", () => {
    const catAxes = findAllElements(chartTree, "c:catAx");
    expect(catAxes.length).toBeGreaterThanOrEqual(1);
    const axPositions = findAllElements(catAxes, "c:axPos");
    expect(axPositions.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(axPositions[0], "val")).toBe("l");
  });

  it("value axis has axPos=\"b\" (bottom)", () => {
    const valAxes = findAllElements(chartTree, "c:valAx");
    expect(valAxes.length).toBeGreaterThanOrEqual(1);
    const axPositions = findAllElements(valAxes, "c:axPos");
    expect(axPositions.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(axPositions[0], "val")).toBe("b");
  });
});

// =========================================================================
// BENCHMARK 18: Smooth/Spline Line Charts
// =========================================================================

describe("Benchmark 18: Smooth Line Charts", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a smooth line chart", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "line",
            smooth: true,
            categories: ["Jan", "Feb", "Mar"],
            series: [{ name: "Revenue", values: [100, 200, 150] }],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits <c:smooth val=\"1\"/> inside <c:ser>", () => {
    const sers = findAllElements(chartTree, "c:ser");
    expect(sers.length).toBeGreaterThanOrEqual(1);
    const smooths = findAllElements(sers, "c:smooth");
    expect(smooths.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(smooths[0], "val")).toBe("1");
  });

  it("chart type is still <c:lineChart>", () => {
    const lineCharts = findAllElements(chartTree, "c:lineChart");
    expect(lineCharts.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 19: Line Chart Markers
// =========================================================================

describe("Benchmark 19: Line Chart Markers", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a line chart with markers", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "line",
            marker: { symbol: "circle", size: 8 },
            categories: ["Q1", "Q2", "Q3"],
            series: [
              { name: "S1", values: [10, 20, 30] },
              { name: "S2", values: [15, 25, 35], marker: { symbol: "square", size: 6, color: "#FF0000" } },
            ],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits chart-level <c:marker> with symbol and size", () => {
    const markers = findAllElements(chartTree, "c:marker");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    const symbols = findAllElements(markers, "c:symbol");
    const sizes = findAllElements(markers, "c:size");
    // Should find "circle" and "square" symbols
    const symbolValues = symbols.map(s => getAttr(s, "val"));
    expect(symbolValues).toContain("circle");
    expect(symbolValues).toContain("square");
    const sizeValues = sizes.map(s => getAttr(s, "val"));
    expect(sizeValues).toContain("8");
    expect(sizeValues).toContain("6");
  });

  it("per-series marker has fill color", () => {
    const markers = findAllElements(chartTree, "c:marker");
    // Find marker with spPr containing solidFill with #FF0000
    const spPrs = findAllElements(markers, "c:spPr");
    const fills = findAllElements(spPrs, "a:solidFill");
    expect(fills.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 20: Image Alt Text
// =========================================================================

describe("Benchmark 20: Image Alt Text", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders an image with alt text", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 200, height: 150 },
          src: RED_PIXEL,
          altText: "A red pixel <test> & \"quoted\"",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("p:cNvPr has descr attribute with alt text", () => {
    const pics = findAllElements(slideTree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);
    const cNvPrs = findAllElements(pics, "p:cNvPr");
    expect(cNvPrs.length).toBeGreaterThanOrEqual(1);
    const descr = getAttr(cNvPrs[0], "descr");
    expect(descr).toBeDefined();
    expect(descr).toContain("A red pixel");
  });

  it("XML special characters in alt text are escaped", () => {
    const pics = findAllElements(slideTree, "p:pic");
    const cNvPrs = findAllElements(pics, "p:cNvPr");
    const descr = getAttr(cNvPrs[0], "descr");
    // fast-xml-parser unescapes, so the descr should contain raw characters
    expect(descr).toContain("<test>");
    expect(descr).toContain("&");
    expect(descr).toContain("\"quoted\"");
  });
});

// =========================================================================
// BENCHMARK 21: Image Hyperlinks
// =========================================================================

describe("Benchmark 21: Image Hyperlinks", () => {
  let buffer: Buffer;
  let slideTree: any[];
  let relsXml: string;

  it("renders an image with hyperlink", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 200, height: 150 },
          src: RED_PIXEL,
          hyperlink: "https://example.com",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
    relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
  });

  it("p:cNvPr contains <a:hlinkClick> with r:id", () => {
    const pics = findAllElements(slideTree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);
    const hlinkClicks = findAllElements(pics, "a:hlinkClick");
    expect(hlinkClicks.length).toBeGreaterThanOrEqual(1);
    const rId = getAttr(hlinkClicks[0], "r:id");
    expect(rId).toBeDefined();
    expect(rId).toMatch(/^rId\d+$/);
  });

  it("rels file has matching hyperlink relationship", () => {
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hyperlinkRels = rels.filter(r =>
      getAttr(r, "Type")?.includes("hyperlink")
    );
    expect(hyperlinkRels.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(hyperlinkRels[0], "Target")).toBe("https://example.com");
  });
});

// =========================================================================
// BENCHMARK 22: Pie/Doughnut Explosion
// =========================================================================

describe("Benchmark 22: Pie Explosion", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders an exploded pie chart", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "pie",
            explosion: 25,
            categories: ["A", "B", "C"],
            series: [{ name: "S1", values: [30, 40, 30] }],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits <c:explosion val=\"25\"/>", () => {
    const explosions = findAllElements(chartTree, "c:explosion");
    expect(explosions.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(explosions[0], "val")).toBe("25");
  });
});

// =========================================================================
// BENCHMARK 23: Per-Data-Point Colors
// =========================================================================

describe("Benchmark 23: Per-Point Colors", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a bar chart with per-point colors", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B", "C"],
            series: [{
              name: "S1",
              values: [10, 20, 30],
              pointColors: ["#FF0000", "#00FF00", "#0000FF"],
            }],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits multiple <c:dPt> with distinct colors", () => {
    const dPts = findAllElements(chartTree, "c:dPt");
    expect(dPts.length).toBe(3);

    // Collect all <a:srgbClr> values inside dPts
    const colorValues = new Set<string>();
    for (const dPt of dPts) {
      const srgbClrs = findAllElements([dPt], "a:srgbClr");
      for (const clr of srgbClrs) {
        const val = getAttr(clr, "val");
        if (val) colorValues.add(val);
      }
    }
    expect(colorValues.size).toBeGreaterThanOrEqual(3);
  });

  it("each <c:dPt> has a <c:idx> with unique value", () => {
    const dPts = findAllElements(chartTree, "c:dPt");
    const idxValues = dPts.map(dPt => {
      const idxs = findAllElements([dPt], "c:idx");
      return idxs.length > 0 ? getAttr(idxs[0], "val") : undefined;
    });
    expect(new Set(idxValues).size).toBe(3);
  });
});

// =========================================================================
// BENCHMARK 24: Shape Text (text body inside View shapes)
// =========================================================================

describe("Benchmark 24: Shape Text", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a View shape with text content", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 300, height: 200, fill: { type: "solid", color: "#336699" } },
          shapeType: "roundRect",
          textContent: "Hello Shape",
          textStyle: { fontSize: 24, color: "#FFFFFF", verticalAlign: "middle" },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("p:sp has <p:txBody> with <a:r> containing text", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(1);

    const txBodies = findAllElements(shapes, "p:txBody");
    expect(txBodies.length).toBeGreaterThanOrEqual(1);

    const runs = findAllElements(txBodies, "a:r");
    expect(runs.length).toBeGreaterThanOrEqual(1);

    const texts = findAllElements(runs, "a:t");
    expect(texts.length).toBeGreaterThanOrEqual(1);
    const textContent = getText(texts[0]);
    expect(textContent).toBe("Hello Shape");
  });

  it("geometry is still roundRect", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    const geoms = findAllElements(shapes, "a:prstGeom");
    expect(geoms.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(geoms[0], "prst")).toBe("roundRect");
  });

  it("bodyPr has anchor for verticalAlign", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    const bodyPrs = findAllElements(shapes, "a:bodyPr");
    expect(bodyPrs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs[0], "anchor")).toBe("ctr");
  });
});

// =========================================================================
// BENCHMARK 25: Connectors
// =========================================================================

describe("Benchmark 25: Connectors", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders connectors (straight, elbow, curved)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Connector",
            connectorType: "straight",
            start: { x: 100, y: 100 },
            end: { x: 300, y: 200 },
            arrowEnd: true,
            lineWidth: 2,
            lineColor: "#FF0000",
          },
          {
            type: "Connector",
            connectorType: "elbow",
            start: { x: 400, y: 100 },
            end: { x: 200, y: 300 },
            arrowStart: true,
            arrowEnd: true,
          },
          {
            type: "Connector",
            connectorType: "curved",
            start: { x: 500, y: 500 },
            end: { x: 100, y: 100 },
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("emits <p:cxnSp> elements", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    expect(cxnSps.length).toBe(3);
  });

  it("straight connector has prst=\"line\"", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    const geoms = findAllElements([cxnSps[0]], "a:prstGeom");
    expect(geoms.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(geoms[0], "prst")).toBe("line");
  });

  it("elbow connector has prst=\"bentConnector3\"", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    const geoms = findAllElements([cxnSps[1]], "a:prstGeom");
    expect(getAttr(geoms[0], "prst")).toBe("bentConnector3");
  });

  it("curved connector has prst=\"curvedConnector3\"", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    const geoms = findAllElements([cxnSps[2]], "a:prstGeom");
    expect(getAttr(geoms[0], "prst")).toBe("curvedConnector3");
  });

  it("arrow head/tail emitted", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    // First connector: arrowEnd only
    const tailEnds0 = findAllElements([cxnSps[0]], "a:tailEnd");
    expect(tailEnds0.length).toBe(1);
    expect(getAttr(tailEnds0[0], "type")).toBe("triangle");
    const headEnds0 = findAllElements([cxnSps[0]], "a:headEnd");
    expect(headEnds0.length).toBe(0);

    // Second connector: both arrows
    const headEnds1 = findAllElements([cxnSps[1]], "a:headEnd");
    const tailEnds1 = findAllElements([cxnSps[1]], "a:tailEnd");
    expect(headEnds1.length).toBe(1);
    expect(tailEnds1.length).toBe(1);
  });

  it("flip attributes set when end < start", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    // Second connector: start(400,100) → end(200,300), so flipH=true (end.x < start.x)
    const xfrms1 = findAllElements([cxnSps[1]], "a:xfrm");
    expect(xfrms1.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(xfrms1[0], "flipH")).toBe("1");
  });
});

// =========================================================================
// BENCHMARK 26: Table Rich Text Cells
// =========================================================================

describe("Benchmark 26: Table Rich Text Cells", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a table with rich text cells", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 400, height: 200 },
          tableData: {
            columns: [200, 200],
            rows: [
              {
                cells: [
                  {
                    text: "",
                    content: [
                      { text: "Bold", style: { fontWeight: "bold" } },
                      { text: " Normal" },
                    ],
                  },
                  {
                    text: "",
                    paragraphs: [
                      { runs: [{ text: "Para 1", style: { fontWeight: "bold" } }] },
                      { runs: [{ text: "Para 2", hyperlink: "https://example.com" }] },
                    ],
                  },
                ],
              },
            ],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("rich text cell has <a:r> with b=\"1\"", () => {
    const tcs = findAllElements(slideTree, "a:tc");
    expect(tcs.length).toBeGreaterThanOrEqual(2);

    // First cell: content mode with bold run
    const runs = findAllElements([tcs[0]], "a:r");
    expect(runs.length).toBeGreaterThanOrEqual(1);
    const rPrs = findAllElements([runs[0]], "a:rPr");
    expect(rPrs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(rPrs[0], "b")).toBe("1");
  });

  it("multi-paragraph cell has multiple <a:p>", () => {
    const tcs = findAllElements(slideTree, "a:tc");
    // Second cell: paragraphs mode
    const ps = findAllElements([tcs[1]], "a:p");
    expect(ps.length).toBeGreaterThanOrEqual(2);
  });

  it("hyperlink in table cell generates rels", async () => {
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hyperlinkRels = rels.filter(r =>
      getAttr(r, "Type")?.includes("hyperlink")
    );
    expect(hyperlinkRels.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(hyperlinkRels[0], "Target")).toBe("https://example.com");
  });
});

// =========================================================================
// BENCHMARK 27: RTL Text
// =========================================================================

describe("Benchmark 27: RTL Text", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders RTL text", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 24, color: "#000000", rtl: true },
          content: "مرحبا بالعالم",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("bodyPr has rtlCol=\"1\"", () => {
    const bodyPrs = findAllElements(slideTree, "a:bodyPr");
    expect(bodyPrs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs[0], "rtlCol")).toBe("1");
  });

  it("paragraph has rtl=\"1\" on <a:pPr>", () => {
    // RTL can be on the paragraph props
    const pPrs = findAllElements(slideTree, "a:pPr");
    const rtlPPrs = pPrs.filter(p => getAttr(p, "rtl") === "1");
    expect(rtlPPrs.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 28: Slide Numbers
// =========================================================================

describe("Benchmark 28: Slide Numbers", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a slide with slide number, footer, and dateTime", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        headerFooter: {
          slideNumber: true,
          footer: "My Footer Text",
          dateTime: true,
        },
        children: [{
          type: "Text",
          style: { fontSize: 16, color: "#000000" },
          content: "Content",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("has <p:ph type=\"sldNum\"/> placeholder shape", () => {
    const phs = findAllElements(slideTree, "p:ph");
    const sldNumPhs = phs.filter(ph => getAttr(ph, "type") === "sldNum");
    expect(sldNumPhs.length).toBeGreaterThanOrEqual(1);
  });

  it("has <p:ph type=\"ftr\"/> footer placeholder", () => {
    const phs = findAllElements(slideTree, "p:ph");
    const ftrPhs = phs.filter(ph => getAttr(ph, "type") === "ftr");
    expect(ftrPhs.length).toBeGreaterThanOrEqual(1);
  });

  it("has <p:ph type=\"dt\"/> date-time placeholder", () => {
    const phs = findAllElements(slideTree, "p:ph");
    const dtPhs = phs.filter(ph => getAttr(ph, "type") === "dt");
    expect(dtPhs.length).toBeGreaterThanOrEqual(1);
  });

  it("footer text is present in the slide XML", () => {
    const texts = findAllElements(slideTree, "a:t");
    const allText = texts.map(t => getText(t)).join("");
    expect(allText).toContain("My Footer Text");
  });
});

// =========================================================================
// BENCHMARK 29: Pattern Fill
// =========================================================================

describe("Benchmark 29: Pattern Fill", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a shape with pattern fill", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 300, height: 200,
            fill: { type: "pattern", pattern: "cross", foreground: "#FF0000", background: "#FFFFFF" },
          },
          shapeType: "rect",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("emits <a:pattFill prst=\"cross\">", () => {
    const pattFills = findAllElements(slideTree, "a:pattFill");
    expect(pattFills.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(pattFills[0], "prst")).toBe("cross");
  });

  it("pattern fill has foreground and background colors", () => {
    const pattFills = findAllElements(slideTree, "a:pattFill");
    expect(pattFills.length).toBeGreaterThanOrEqual(1);
    const fgClrs = findAllElements(pattFills, "a:fgClr");
    const bgClrs = findAllElements(pattFills, "a:bgClr");
    expect(fgClrs.length).toBeGreaterThanOrEqual(1);
    expect(bgClrs.length).toBeGreaterThanOrEqual(1);

    // Check foreground has #FF0000
    const fgSrgb = findAllElements(fgClrs, "a:srgbClr");
    expect(fgSrgb.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(fgSrgb[0], "val")).toBe("FF0000");

    // Check background has #FFFFFF
    const bgSrgb = findAllElements(bgClrs, "a:srgbClr");
    expect(bgSrgb.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bgSrgb[0], "val")).toBe("FFFFFF");
  });
});

// =========================================================================
// BENCHMARK 30: Texture/Image Fill
// =========================================================================

describe("Benchmark 30: Texture/Image Fill", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a shape with image fill (stretch)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 300, height: 200,
            fill: { type: "image", src: RED_PIXEL, stretch: true },
          },
          shapeType: "rect",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("emits <a:blipFill> with r:embed", () => {
    const blipFills = findAllElements(slideTree, "a:blipFill");
    expect(blipFills.length).toBeGreaterThanOrEqual(1);
    const blips = findAllElements(blipFills, "a:blip");
    expect(blips.length).toBeGreaterThanOrEqual(1);
    const rEmbed = getAttr(blips[0], "r:embed");
    expect(rEmbed).toBeDefined();
    expect(rEmbed).toMatch(/^rId\d+$/);
  });

  it("stretch mode has <a:stretch>", () => {
    const blipFills = findAllElements(slideTree, "a:blipFill");
    const stretches = findAllElements(blipFills, "a:stretch");
    expect(stretches.length).toBeGreaterThanOrEqual(1);
  });

  it("image fill media exists in ZIP", async () => {
    const paths = await getZipPaths(buffer);
    const mediaFiles = paths.filter(p => p.startsWith("ppt/media/"));
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 31: Reflection Effect
// =========================================================================

describe("Benchmark 31: Reflection", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a shape with reflection", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 300, height: 200,
            backgroundColor: "#336699",
            effects: {
              reflection: {
                blurRadius: 2,
                startOpacity: 0.5,
                endOpacity: 0,
                distance: 5,
                direction: 90,
                size: 50,
              },
            },
          },
          shapeType: "rect",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("emits <a:reflection> inside <a:effectLst>", () => {
    const effectLsts = findAllElements(slideTree, "a:effectLst");
    expect(effectLsts.length).toBeGreaterThanOrEqual(1);
    const reflections = findAllElements(effectLsts, "a:reflection");
    expect(reflections.length).toBeGreaterThanOrEqual(1);
  });

  it("reflection has correct attributes", () => {
    const reflections = findAllElements(slideTree, "a:reflection");
    expect(reflections.length).toBeGreaterThanOrEqual(1);
    const ref = reflections[0];
    expect(getAttr(ref, "blurRad")).toBe(String(toEmu(2)));
    expect(getAttr(ref, "stA")).toBe("50000"); // 0.5 * 100000
    expect(getAttr(ref, "endA")).toBe("0");     // 0 * 100000
    expect(getAttr(ref, "dist")).toBe(String(toEmu(5)));
  });
});

// =========================================================================
// BENCHMARK 32: Soft Edge Effect
// =========================================================================

describe("Benchmark 32: Soft Edge", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders a shape with soft edge", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 300, height: 200,
            backgroundColor: "#336699",
            effects: { softEdge: { radius: 10 } },
          },
          shapeType: "rect",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("emits <a:softEdge> with EMU radius", () => {
    const softEdges = findAllElements(slideTree, "a:softEdge");
    expect(softEdges.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(softEdges[0], "rad")).toBe(String(toEmu(10)));
  });

  it("soft edge is inside <a:effectLst>", () => {
    const effectLsts = findAllElements(slideTree, "a:effectLst");
    expect(effectLsts.length).toBeGreaterThanOrEqual(1);
    const softEdges = findAllElements(effectLsts, "a:softEdge");
    expect(softEdges.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 33: Text Shadow & Outline
// =========================================================================

describe("Benchmark 33: Text Shadow & Outline", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders text with shadow and outline", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 24, color: "#000000" },
          content: [
            {
              text: "Shadow Text",
              style: {
                shadow: { color: "#888888", offsetX: 2, offsetY: 2, blurRadius: 3, opacity: 0.5 },
              },
            },
            {
              text: "Outlined Text",
              style: {
                outline: { width: 1, color: "#FF0000" },
              },
            },
          ],
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("text run has <a:outerShdw> inside <a:effectLst> within <a:rPr>", () => {
    const rPrs = findAllElements(slideTree, "a:rPr");
    const effectLsts = findAllElements(rPrs, "a:effectLst");
    expect(effectLsts.length).toBeGreaterThanOrEqual(1);
    const shadows = findAllElements(effectLsts, "a:outerShdw");
    expect(shadows.length).toBeGreaterThanOrEqual(1);
  });

  it("text run has <a:ln> for outline within <a:rPr>", () => {
    const rPrs = findAllElements(slideTree, "a:rPr");
    const lns = findAllElements(rPrs, "a:ln");
    expect(lns.length).toBeGreaterThanOrEqual(1);
    const fills = findAllElements(lns, "a:solidFill");
    expect(fills.length).toBeGreaterThanOrEqual(1);
    const colors = findAllElements(fills, "a:srgbClr");
    expect(colors.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(colors[0], "val")).toBe("FF0000");
  });
});

// =========================================================================
// BENCHMARK 34: Trendlines
// =========================================================================

describe("Benchmark 34: Trendlines", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a chart with trendline", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "line",
            categories: ["A", "B", "C", "D"],
            series: [{
              name: "S1",
              values: [10, 20, 15, 30],
              trendline: {
                type: "linear",
                forward: 2,
                displayEquation: true,
                displayRSquared: true,
                color: "#FF0000",
              },
            }],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits <c:trendline> with <c:trendlineType>", () => {
    const trendlines = findAllElements(chartTree, "c:trendline");
    expect(trendlines.length).toBeGreaterThanOrEqual(1);
    const types = findAllElements(trendlines, "c:trendlineType");
    expect(types.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(types[0], "val")).toBe("linear");
  });

  it("trendline has forward forecast", () => {
    const trendlines = findAllElements(chartTree, "c:trendline");
    const forwards = findAllElements(trendlines, "c:forward");
    expect(forwards.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(forwards[0], "val")).toBe("2");
  });

  it("trendline has display equation and R²", () => {
    const trendlines = findAllElements(chartTree, "c:trendline");
    const dispEqs = findAllElements(trendlines, "c:dispEq");
    const dispRSq = findAllElements(trendlines, "c:dispRSqr");
    expect(dispEqs.length).toBeGreaterThanOrEqual(1);
    expect(dispRSq.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(dispEqs[0], "val")).toBe("1");
    expect(getAttr(dispRSq[0], "val")).toBe("1");
  });
});

// =========================================================================
// BENCHMARK 35: Error Bars
// =========================================================================

describe("Benchmark 35: Error Bars", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a chart with error bars", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B", "C"],
            series: [{
              name: "S1",
              values: [10, 20, 30],
              errorBars: { direction: "y", type: "fixedVal", value: 5 },
            }],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
  });

  it("emits <c:errBars> structure", () => {
    const errBars = findAllElements(chartTree, "c:errBars");
    expect(errBars.length).toBeGreaterThanOrEqual(1);
  });

  it("error bars have type and value", () => {
    const errBars = findAllElements(chartTree, "c:errBars");
    const errBarTypes = findAllElements(errBars, "c:errBarType");
    expect(errBarTypes.length).toBeGreaterThanOrEqual(1);
    const errValTypes = findAllElements(errBars, "c:errValType");
    expect(errValTypes.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(errValTypes[0], "val")).toBe("fixedVal");
  });
});

// =========================================================================
// BENCHMARK 36: Vertical Text
// =========================================================================

describe("Benchmark 36: Vertical Text", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders text with vertical direction", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: { fontSize: 24, color: "#000000", textDirection: "vertical" },
            content: "Vertical",
          },
          {
            type: "Text",
            style: { fontSize: 24, color: "#000000", textDirection: "verticalEA" },
            content: "垂直",
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("first text has vert=\"vert270\" on bodyPr", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(2);
    const bodyPrs0 = findAllElements([shapes[0]], "a:bodyPr");
    expect(bodyPrs0.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs0[0], "vert")).toBe("vert270");
  });

  it("second text has vert=\"eaVert\" on bodyPr", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    const bodyPrs1 = findAllElements([shapes[1]], "a:bodyPr");
    expect(bodyPrs1.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs1[0], "vert")).toBe("eaVert");
  });
});

// =========================================================================
// BENCHMARK 37: Cross-Feature Integration
// =========================================================================

describe("Benchmark 37: Cross-Feature Integration", () => {
  let buffer: Buffer;
  let slideTree: any[];

  it("renders slide combining multiple new features", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        headerFooter: { slideNumber: true },
        children: [
          // Connector with animation
          {
            type: "Connector",
            connectorType: "straight",
            start: { x: 50, y: 50 },
            end: { x: 200, y: 200 },
            arrowEnd: true,
            animations: [{ type: "entrance", effect: "fade", trigger: "onClick" }],
          },
          // Pattern fill in a group
          {
            type: "Group",
            style: { width: 400, height: 200 },
            children: [{
              type: "View",
              style: {
                width: 200, height: 100,
                fill: { type: "pattern", pattern: "dkHorz", foreground: "#000000", background: "#FFFFFF" },
              },
              shapeType: "rect",
            }],
          },
          // Image with alt text + hyperlink
          {
            type: "Image",
            style: { width: 100, height: 100 },
            src: RED_PIXEL,
            altText: "Red pixel",
            hyperlink: "https://example.com",
          },
          // Shape with text and reflection
          {
            type: "View",
            style: {
              width: 200, height: 100,
              backgroundColor: "#339966",
              effects: {
                reflection: { blurRadius: 1, startOpacity: 0.3, endOpacity: 0 },
              },
            },
            shapeType: "roundRect",
            textContent: "Reflected Shape",
            textStyle: { fontSize: 14, color: "#FFFFFF" },
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("connector present as <p:cxnSp>", () => {
    const cxnSps = findAllElements(slideTree, "p:cxnSp");
    expect(cxnSps.length).toBe(1);
  });

  it("pattern fill exists in group child", () => {
    const grpSps = findAllElements(slideTree, "p:grpSp");
    // Find pattFill in the entire tree (includes group children)
    const pattFills = findAllElements(slideTree, "a:pattFill");
    expect(pattFills.length).toBeGreaterThanOrEqual(1);
  });

  it("image has both alt text and hyperlink", () => {
    const pics = findAllElements(slideTree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);
    const cNvPrs = findAllElements(pics, "p:cNvPr");
    const descr = getAttr(cNvPrs[0], "descr");
    expect(descr).toBe("Red pixel");
    const hlinkClicks = findAllElements(pics, "a:hlinkClick");
    expect(hlinkClicks.length).toBeGreaterThanOrEqual(1);
  });

  it("reflection + shape text coexist", () => {
    // Find shape with rounded corners and text
    const shapes = findAllElements(slideTree, "p:sp");
    let foundRoundRectWithText = false;
    for (const sp of shapes) {
      const geoms = findAllElements([sp], "a:prstGeom");
      if (geoms.length > 0 && getAttr(geoms[0], "prst") === "roundRect") {
        const runs = findAllElements([sp], "a:r");
        if (runs.length > 0) foundRoundRectWithText = true;

        const reflections = findAllElements([sp], "a:reflection");
        expect(reflections.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(foundRoundRectWithText).toBe(true);
  });

  it("slide number placeholder present", () => {
    const phs = findAllElements(slideTree, "p:ph");
    const sldNumPhs = phs.filter(ph => getAttr(ph, "type") === "sldNum");
    expect(sldNumPhs.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 38: Edge Cases
// =========================================================================

describe("Benchmark 38: Edge Cases", () => {
  it("empty connector (start == end) does not crash", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Connector",
          connectorType: "straight",
          start: { x: 100, y: 100 },
          end: { x: 100, y: 100 },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(1);
  });

  it("zero-value chart renders without error", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B"],
            series: [{ name: "S1", values: [0, 0] }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("Unicode alt text is preserved", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 100, height: 100 },
          src: RED_PIXEL,
          altText: "画像の説明 🖼️",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const pics = findAllElements(tree, "p:pic");
    const cNvPrs = findAllElements(pics, "p:cNvPr");
    const descr = getAttr(cNvPrs[0], "descr");
    expect(descr).toContain("画像の説明");
  });

  it("RTL text with hyperlink generates both attributes and rels", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 24, color: "#000000", rtl: true },
          content: [{ text: "رابط", hyperlink: "https://example.com" }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // RTL attribute
    const bodyPrs = findAllElements(tree, "a:bodyPr");
    expect(getAttr(bodyPrs[0], "rtlCol")).toBe("1");

    // Hyperlink in rels
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hyperlinkRels = rels.filter(r => getAttr(r, "Type")?.includes("hyperlink"));
    expect(hyperlinkRels.length).toBeGreaterThanOrEqual(1);
  });

  it("pattern fill with theme color modifiers", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            fill: {
              type: "pattern",
              pattern: "pct25",
              foreground: { scheme: "accent1", tint: 50 },
              background: "#FFFFFF",
            },
          },
          shapeType: "rect",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const pattFills = findAllElements(tree, "a:pattFill");
    expect(pattFills.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(pattFills[0], "prst")).toBe("pct25");
    // Foreground uses scheme color
    const fgClrs = findAllElements(pattFills, "a:fgClr");
    const schemeClrs = findAllElements(fgClrs, "a:schemeClr");
    expect(schemeClrs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(schemeClrs[0], "val")).toBe("accent1");
  });
});

// =========================================================================
// BENCHMARK 39: 30-Slide Stress Test
// =========================================================================

describe("Benchmark 39: 30-Slide Stress Test", () => {
  let buffer: Buffer;

  it("renders 30 slides combining every new feature", async () => {
    const slides: PaperDocument["slides"] = [];

    for (let i = 0; i < 30; i++) {
      const children: PaperDocument["slides"][0]["children"] = [];

      // Rotate through feature combinations per slide
      const featureIdx = i % 10;

      if (featureIdx === 0 || featureIdx === 5) {
        // Horizontal bar chart with per-point colors
        children.push({
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "bar",
            barDirection: "bar",
            categories: ["A", "B", "C"],
            series: [{
              name: `S${i}`,
              values: [10 + i, 20 + i, 30 + i],
              pointColors: ["#FF0000", "#00FF00", "#0000FF"],
            }],
          },
        });
      }

      if (featureIdx === 1 || featureIdx === 6) {
        // Smooth line with markers + trendline
        children.push({
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "line",
            smooth: true,
            marker: { symbol: "circle", size: 6 },
            categories: ["Q1", "Q2", "Q3", "Q4"],
            series: [{
              name: `Line${i}`,
              values: [10, 25, 15, 35],
              trendline: { type: "linear" },
              errorBars: { direction: "y", type: "percentage", value: 10 },
            }],
          },
        });
      }

      if (featureIdx === 2 || featureIdx === 7) {
        // Connector + Image with alt text + hyperlink
        children.push({
          type: "Connector",
          connectorType: (["straight", "elbow", "curved"] as const)[i % 3],
          start: { x: 50, y: 50 },
          end: { x: 250, y: 250 },
          arrowEnd: true,
          lineWidth: 2,
          lineColor: "#333333",
        });
        children.push({
          type: "Image",
          style: { width: 100, height: 100 },
          src: RED_PIXEL,
          altText: `Image ${i}`,
          hyperlink: `https://example.com/slide${i}`,
        });
      }

      if (featureIdx === 3 || featureIdx === 8) {
        // Pattern fill shape with text + RTL text
        children.push({
          type: "View",
          style: {
            width: 250, height: 150,
            fill: {
              type: "pattern",
              pattern: (["cross", "ltDnDiag", "dkHorz", "smCheck"] as const)[i % 4],
              foreground: "#000000",
              background: "#FFFFFF",
            },
          },
          shapeType: "roundRect",
          textContent: `Shape ${i}`,
          textStyle: { fontSize: 16, color: "#333333" },
        });
        children.push({
          type: "Text",
          style: { fontSize: 18, color: "#000000", rtl: true },
          content: "نص عربي",
        });
      }

      if (featureIdx === 4 || featureIdx === 9) {
        // Reflection + soft edge + vertical text + table with rich text
        children.push({
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#336699",
            effects: {
              reflection: { blurRadius: 1, startOpacity: 0.4, endOpacity: 0 },
              softEdge: { radius: 5 },
            },
          },
          shapeType: "rect",
        });
        children.push({
          type: "Text",
          style: { fontSize: 20, color: "#000000", textDirection: "vertical" },
          content: "Vertical",
        });
        children.push({
          type: "Table",
          style: { width: 300, height: 100 },
          tableData: {
            columns: [150, 150],
            rows: [{
              cells: [
                { text: "", content: [{ text: "Bold", style: { fontWeight: "bold" } }] },
                { text: "Plain" },
              ],
            }],
          },
        });
      }

      // Exploded pie on even slides
      if (i % 2 === 0 && featureIdx !== 0 && featureIdx !== 1 && featureIdx !== 5 && featureIdx !== 6) {
        children.push({
          type: "Chart",
          style: { width: 300, height: 200 },
          chartData: {
            chartType: "pie",
            explosion: 15,
            categories: ["X", "Y"],
            series: [{ name: "P", values: [60, 40] }],
          },
        });
      }

      slides.push({
        type: "Slide",
        style: { width: 960, height: 540 },
        headerFooter: i < 5 ? { slideNumber: true, footer: `Slide ${i + 1}` } : undefined,
        children,
      });
    }

    const doc: PaperDocument = { type: "Document", meta: {}, slides };
    buffer = await PaperEngine.render(doc);
  }, 60000); // 60s timeout

  it("ZIP contains all 30 slides", async () => {
    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 30; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }
  });

  it("all slide rels are present", async () => {
    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 30; i++) {
      expect(paths).toContain(`ppt/slides/_rels/slide${i}.xml.rels`);
    }
  });

  it("charts have valid rIds (no duplicates within a slide)", async () => {
    const zip = await JSZip.loadAsync(buffer);
    // Check the first slide with charts (slide 1)
    const relsPath = "ppt/slides/_rels/slide1.xml.rels";
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      const relsXml = await relsFile.async("string");
      const relsTree = parseXml(relsXml);
      const rels = findAllElements(relsTree, "Relationship");
      const rIds = rels.map(r => getAttr(r, "Id")).filter(Boolean);
      // All rIds should be unique
      expect(new Set(rIds).size).toBe(rIds.length);
    }
  });

  it("media files are in ZIP", async () => {
    const paths = await getZipPaths(buffer);
    const mediaFiles = paths.filter(p => p.startsWith("ppt/media/"));
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1);
  });

  it("no duplicate media file names", async () => {
    const paths = await getZipPaths(buffer);
    const mediaFiles = paths.filter(p => p.startsWith("ppt/media/"));
    expect(new Set(mediaFiles).size).toBe(mediaFiles.length);
  });
});
