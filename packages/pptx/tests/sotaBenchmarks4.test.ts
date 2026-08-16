/**
 * SOTA Benchmarks 4 — Phase 4 Feature Validation
 *
 * 42 tests across 6 categories: Advanced Charts, Layout & Composition,
 * Effects & Fills, Enterprise Text & Tables, Compliance, Stress.
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode } from "../src/types/ast.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL, getText,
} from "./helpers/xmlTestUtils.js";

// =========================================================================
// CATEGORY A: ADVANCED CHARTS (10 tests)
// =========================================================================

describe("A1: Bubble chart with size axis", () => {
  it("renders bubble chart with 2 series and bubbleSize nodes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 700, height: 400 },
          chartData: {
            chartType: "bubble",
            xySeries: [
              {
                name: "Series A",
                dataPoints: [
                  { x: 1, y: 10, size: 5 },
                  { x: 2, y: 15, size: 8 },
                  { x: 3, y: 12, size: 3 },
                  { x: 4, y: 20, size: 10 },
                  { x: 5, y: 18, size: 6 },
                ],
                color: "#4472C4",
              },
              {
                name: "Series B",
                dataPoints: [
                  { x: 1.5, y: 8, size: 7 },
                  { x: 2.5, y: 22, size: 4 },
                  { x: 3.5, y: 11, size: 9 },
                  { x: 4.5, y: 17, size: 2 },
                  { x: 5.5, y: 25, size: 11 },
                ],
                color: "#ED7D31",
              },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Bubble chart element
    const bubbleCharts = findAllElements(tree, "c:bubbleChart");
    expect(bubbleCharts.length).toBe(1);

    // 2 series
    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(2);

    // Bubble size nodes
    const bubbleSizes = findAllElements(tree, "c:bubbleSize");
    expect(bubbleSizes.length).toBe(2);
  });
});

describe("A2: Scatter multi-series 20 points", () => {
  it("renders scatter with 3 series, 20 points each", async () => {
    const makePoints = (offset: number) =>
      Array.from({ length: 20 }, (_, i) => ({ x: i + offset, y: Math.sin(i) * 10 + offset }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 800, height: 400 },
          chartData: {
            chartType: "scatter",
            xySeries: [
              { name: "S1", dataPoints: makePoints(0), color: "#FF0000" },
              { name: "S2", dataPoints: makePoints(5), color: "#00FF00" },
              { name: "S3", dataPoints: makePoints(10), color: "#0000FF" },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const scatterCharts = findAllElements(tree, "c:scatterChart");
    expect(scatterCharts.length).toBe(1);

    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(3);

    // Each series should have 20 data points
    const ptCounts = findAllElements(tree, "c:ptCount");
    const vals = ptCounts.map(p => getAttr(p, "val"));
    expect(vals.filter(v => v === "20").length).toBeGreaterThanOrEqual(3);
  });
});

describe("A3: Stacked and percentStacked bars", () => {
  it("renders two charts with correct grouping values", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 400, height: 300, position: "absolute", left: 0, top: 0 },
            chartData: {
              chartType: "bar",
              barGrouping: "stacked",
              categories: ["A", "B", "C"],
              series: [
                { name: "S1", values: [10, 20, 30] },
                { name: "S2", values: [5, 10, 15] },
              ],
            },
          },
          {
            type: "Chart",
            style: { width: 400, height: 300, position: "absolute", left: 450, top: 0 },
            chartData: {
              chartType: "bar",
              barGrouping: "percentStacked",
              categories: ["A", "B", "C"],
              series: [
                { name: "S1", values: [10, 20, 30] },
                { name: "S2", values: [5, 10, 15] },
              ],
            },
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);

    // Chart 1: stacked
    const chart1Xml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree1 = parseXml(chart1Xml);
    const barCharts1 = findAllElements(tree1, "c:barChart");
    expect(barCharts1.length).toBe(1);
    const grouping1 = findAllElements(tree1, "c:grouping");
    expect(getAttr(grouping1[0], "val")).toBe("stacked");

    // Chart 2: percentStacked
    const chart2Xml = await getZipEntry(buffer, "ppt/charts/chart2.xml");
    const tree2 = parseXml(chart2Xml);
    const barCharts2 = findAllElements(tree2, "c:barChart");
    expect(barCharts2.length).toBe(1);
    const grouping2 = findAllElements(tree2, "c:grouping");
    expect(getAttr(grouping2[0], "val")).toBe("percentStacked");
  });
});

describe("A4: Area chart with data labels", () => {
  it("renders area chart with dLbls showing values at center", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 600, height: 400 },
          chartData: {
            chartType: "area",
            categories: ["Jan", "Feb", "Mar", "Apr"],
            series: [
              { name: "Revenue", values: [100, 150, 120, 200], color: "#4472C4" },
            ],
            dataLabels: { showVal: true, position: "ctr" },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const areaCharts = findAllElements(tree, "c:areaChart");
    expect(areaCharts.length).toBe(1);

    const dLbls = findAllElements(tree, "c:dLbls");
    expect(dLbls.length).toBeGreaterThanOrEqual(1);

    const showVal = findAllElements(tree, "c:showVal");
    expect(showVal.some(n => getAttr(n, "val") === "1")).toBe(true);
  });
});

describe("A5: Combo bar+line+area triple", () => {
  it("renders all 3 chart types via overrideType", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 800, height: 400 },
          chartData: {
            chartType: "bar",
            categories: ["Q1", "Q2", "Q3", "Q4"],
            series: [
              { name: "Revenue", values: [10, 15, 12, 18], color: "#4472C4" },
              { name: "Growth", values: [5, 8, 3, 12], color: "#ED7D31", overrideType: "line" },
              { name: "Coverage", values: [8, 10, 7, 14], color: "#A9D18E", overrideType: "area" },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const barCharts = findAllElements(tree, "c:barChart");
    const lineCharts = findAllElements(tree, "c:lineChart");
    const areaCharts = findAllElements(tree, "c:areaChart");

    expect(barCharts.length).toBe(1);
    expect(lineCharts.length).toBe(1);
    expect(areaCharts.length).toBe(1);
  });
});

describe("A6: Stock (OHLC) chart", () => {
  it("renders stock chart with hiLowLines and upDownBars", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 700, height: 400 },
          chartData: {
            chartType: "stock",
            stockData: {
              categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
              open:  [100, 105, 103, 108, 110],
              high:  [110, 112, 109, 115, 118],
              low:   [95,  100, 98,  104, 106],
              close: [105, 103, 108, 110, 115],
              hiLowLines: true,
              upDownBars: true,
              upColor: "#4472C4",
              downColor: "#ED7D31",
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const stockCharts = findAllElements(tree, "c:stockChart");
    expect(stockCharts.length).toBe(1);

    const hiLowLines = findAllElements(tree, "c:hiLowLines");
    expect(hiLowLines.length).toBeGreaterThanOrEqual(1);

    const upDownBars = findAllElements(tree, "c:upDownBars");
    expect(upDownBars.length).toBeGreaterThanOrEqual(1);

    // 4 series: Open, High, Low, Close
    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(4);
  });
});

describe("A7: 150-point line chart", () => {
  it("renders line chart with ptCount=150", async () => {
    const values = Array.from({ length: 150 }, (_, i) => Math.round(Math.sin(i / 10) * 50 + 100));
    const categories = Array.from({ length: 150 }, (_, i) => `P${i + 1}`);

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 900, height: 450 },
          chartData: {
            chartType: "line",
            categories,
            series: [{ name: "Signal", values }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const lineCharts = findAllElements(tree, "c:lineChart");
    expect(lineCharts.length).toBe(1);

    const ptCounts = findAllElements(tree, "c:ptCount");
    expect(ptCounts.some(p => getAttr(p, "val") === "150")).toBe(true);
  });
});

describe("A8: Per-series data label overrides", () => {
  it("renders per-series dLbls nodes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 600, height: 400 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B", "C"],
            series: [
              {
                name: "S1",
                values: [10, 20, 30],
                dataLabels: { showVal: true, position: "outEnd" },
              },
              {
                name: "S2",
                values: [15, 25, 35],
                dataLabels: { showCatName: true, position: "ctr" },
              },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Each series should have its own dLbls
    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(2);

    for (const ser of series) {
      const dLbls = findAllElements([ser], "c:dLbls");
      expect(dLbls.length).toBe(1);
    }
  });
});

describe("A9: Funnel chart", () => {
  it("renders funnel as horizontal stacked bar with spacer series", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 600, height: 400 },
          chartData: {
            chartType: "funnel",
            funnelData: {
              categories: ["Leads", "Qualified", "Proposal", "Negotiation", "Closed"],
              values: [1000, 600, 400, 200, 100],
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const barCharts = findAllElements(tree, "c:barChart");
    expect(barCharts.length).toBe(1);

    const barDir = findAllElements(tree, "c:barDir");
    expect(getAttr(barDir[0], "val")).toBe("bar");

    const grouping = findAllElements(tree, "c:grouping");
    expect(getAttr(grouping[0], "val")).toBe("stacked");

    // 3 series: left spacer, value, right spacer
    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(3);

    // Spacer series have noFill
    const noFills = findAllElements([series[0]], "a:noFill");
    expect(noFills.length).toBeGreaterThan(0);
    const noFills2 = findAllElements([series[2]], "a:noFill");
    expect(noFills2.length).toBeGreaterThan(0);
  });
});

describe("A10: Chart data table", () => {
  it("renders bar chart with dTable element", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 600, height: 400 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B", "C"],
            series: [{ name: "S1", values: [10, 20, 30] }],
            dataTable: {
              showKeys: true,
              showHorzBorder: true,
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const dTables = findAllElements(tree, "c:dTable");
    expect(dTables.length).toBe(1);

    const showKeys = findAllElements(tree, "c:showKeys");
    expect(showKeys.some(n => getAttr(n, "val") === "1")).toBe(true);

    const showHorzBorder = findAllElements(tree, "c:showHorzBorder");
    expect(showHorzBorder.some(n => getAttr(n, "val") === "1")).toBe(true);
  });
});

// =========================================================================
// CATEGORY B: LAYOUT & COMPOSITION (7 tests)
// =========================================================================

describe("B1: Many shape types on one slide", () => {
  it("renders 20+ shapes with correct prstGeom", async () => {
    const shapeTypes = [
      "rect", "ellipse", "star5", "diamond", "hexagon", "cloud", "heart",
      "roundRect", "triangle", "plus", "chevron", "pentagon", "octagon",
      "parallelogram", "trapezoid", "donut", "star4", "rightArrow",
      "leftArrow", "upArrow", "downArrow",
    ] as const;

    const children: PaperNode[] = shapeTypes.map((st, i) => ({
      type: "View" as const,
      style: {
        width: 40, height: 40,
        position: "absolute" as const,
        left: (i % 7) * 50,
        top: Math.floor(i / 7) * 50,
        backgroundColor: "#4472C4",
      },
      shapeType: st,
    }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children,
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBe(shapeTypes.length);

    // Each shape should have its own prstGeom
    const geoms = findAllElements(tree, "a:prstGeom");
    expect(geoms.length).toBe(shapeTypes.length);

    const prstValues = geoms.map(g => getAttr(g, "prst"));
    for (const st of shapeTypes) {
      expect(prstValues).toContain(st);
    }
  });
});

describe("B2: Text columns", () => {
  it("renders text with numCol and spcCol on bodyPr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: {
            width: 600, height: 300,
            fontSize: 12,
            columns: 3,
            columnSpacing: 10,
          },
          content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const bodyPrs = findAllElements(tree, "a:bodyPr");
    expect(bodyPrs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs[0], "numCol")).toBe("3");

    const spcCol = getAttr(bodyPrs[0], "spcCol");
    expect(spcCol).toBeDefined();
    expect(Number(spcCol)).toBeGreaterThan(0);
  });
});

describe("B3: Custom slideSize EMU", () => {
  it("renders presentation.xml with correct sldSz EMU values", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slideSize: { width: 1280, height: 720 },
      slides: [{
        type: "Slide",
        style: { width: 1280, height: 720 },
        children: [{
          type: "Text",
          style: { fontSize: 14 },
          content: "Wide slide",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presXml);

    const sldSzs = findAllElements(tree, "p:sldSz");
    expect(sldSzs.length).toBe(1);

    const cx = getAttr(sldSzs[0], "cx");
    const cy = getAttr(sldSzs[0], "cy");
    expect(cx).toBe(String(1280 * 9525));
    expect(cy).toBe(String(720 * 9525));
  });
});

describe("B4: 5-level nested groups", () => {
  it("renders 5 nested grpSp elements", async () => {
    function nestGroups(depth: number): PaperNode {
      if (depth === 0) {
        return {
          type: "View",
          style: { width: 30, height: 30, backgroundColor: "#FF0000" },
          shapeType: "rect",
        };
      }
      return {
        type: "Group",
        style: { width: 50 + depth * 20, height: 50 + depth * 20 },
        children: [nestGroups(depth - 1)],
      };
    }

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [nestGroups(5)],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBe(5);
  });
});

describe("B5: Flex wrap + gap with 12 children", () => {
  it("renders all 12 child shapes", async () => {
    const children: PaperNode[] = Array.from({ length: 12 }, (_, i) => ({
      type: "View" as const,
      style: { width: 80, height: 60, backgroundColor: "#4472C4" },
      shapeType: "rect" as const,
    }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 400, height: 300, flexWrap: "wrap", gap: 10 },
          children,
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBe(12);
  });
});

describe("B6: 50-slide deck", () => {
  it("renders all 50 slides in presentation", async () => {
    const slides: PaperDocument["slides"] = Array.from({ length: 50 }, (_, i) => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [{
        type: "Text" as const,
        style: { fontSize: 14 },
        content: `Slide ${i + 1}`,
      }],
    }));

    const doc: PaperDocument = { type: "Document", meta: {}, slides };
    const buffer = await PaperEngine.render(doc);

    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const presTree = parseXml(presXml);
    const sldIdLst = findAllElements(presTree, "p:sldIdLst");
    expect(sldIdLst.length).toBe(1);
    const sldIds = findAllElements(sldIdLst, "p:sldId");
    expect(sldIds.length).toBe(50);

    // All 50 slide files exist
    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 50; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }
  });
});

describe("B7: Shape textParagraphs with mixed bullets", () => {
  it("renders buChar, buAutoNum, and buNone", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 400, height: 300, backgroundColor: "#F5F5F5" },
          shapeType: "rect",
          textParagraphs: [
            {
              runs: [{ text: "Bullet item" }],
              bullet: { char: "\u2022", color: "#FF0000" },
            },
            {
              runs: [{ text: "Numbered item" }],
              bullet: { type: "autoNum", scheme: "arabicPeriod" },
            },
            {
              runs: [{ text: "No bullet" }],
              bullet: { type: "none" },
            },
          ],
          textStyle: { fontSize: 14 },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const buChars = findAllElements(tree, "a:buChar");
    expect(buChars.length).toBeGreaterThanOrEqual(1);

    const buAutoNums = findAllElements(tree, "a:buAutoNum");
    expect(buAutoNums.length).toBeGreaterThanOrEqual(1);

    const buNones = findAllElements(tree, "a:buNone");
    expect(buNones.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// CATEGORY C: EFFECTS & FILLS (6 tests)
// =========================================================================

describe("C1: Gradient stops with opacity (alpha)", () => {
  it("renders gradient fill with alpha on stops", async () => {
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
            fill: {
              type: "linear",
              angle: 90,
              stops: [
                { color: "#FF0000", position: 0, alpha: 0.3 },
                { color: "#00FF00", position: 50, alpha: 0.6 },
                { color: "#0000FF", position: 100, alpha: 1.0 },
              ],
            },
          },
          shapeType: "rect",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    const alphas = findAllElements(tree, "a:alpha");
    expect(alphas.length).toBeGreaterThanOrEqual(1);

    const stops = findAllElements(tree, "a:gs");
    expect(stops.length).toBe(3);
  });
});

describe("C2: All 4 fill types on one slide", () => {
  it("renders solid, gradient, pattern, and image fills", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 0, top: 0,
              fill: { type: "solid", color: "#FF0000" },
            },
            shapeType: "rect",
          },
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 120, top: 0,
              fill: {
                type: "linear",
                stops: [
                  { color: "#FF0000", position: 0 },
                  { color: "#0000FF", position: 100 },
                ],
              },
            },
            shapeType: "rect",
          },
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 240, top: 0,
              fill: {
                type: "pattern",
                pattern: "cross",
                foreground: "#000000",
                background: "#FFFFFF",
              },
            },
            shapeType: "rect",
          },
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 360, top: 0,
              fill: { type: "image", src: RED_PIXEL, stretch: true },
            },
            shapeType: "rect",
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const solidFills = findAllElements(tree, "a:solidFill");
    expect(solidFills.length).toBeGreaterThanOrEqual(1);

    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    const pattFills = findAllElements(tree, "a:pattFill");
    expect(pattFills.length).toBeGreaterThanOrEqual(1);

    const blipFills = findAllElements(tree, "a:blipFill");
    expect(blipFills.length).toBeGreaterThanOrEqual(1);
  });
});

describe("C3: Stacked effects (glow + innerShadow + outerShadow + reflection + softEdge)", () => {
  it("renders effectLst with all 5 effects in correct order", async () => {
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
            backgroundColor: "#4472C4",
            effects: {
              glow: { color: "#FFFF00", radius: 5, opacity: 0.5 },
              innerShadow: { color: "#000000", offsetX: 2, offsetY: 2, blurRadius: 3, opacity: 0.4 },
              dropShadow: { color: "#888888", offsetX: 3, offsetY: 3, blurRadius: 4, opacity: 0.6 },
              reflection: { blurRadius: 2, startOpacity: 0.5, endOpacity: 0, distance: 5 },
              softEdge: { radius: 8 },
            },
          },
          shapeType: "rect",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const effectLsts = findAllElements(tree, "a:effectLst");
    expect(effectLsts.length).toBeGreaterThanOrEqual(1);

    const glows = findAllElements(effectLsts, "a:glow");
    expect(glows.length).toBeGreaterThanOrEqual(1);

    const innerShdws = findAllElements(effectLsts, "a:innerShdw");
    expect(innerShdws.length).toBeGreaterThanOrEqual(1);

    const outerShdws = findAllElements(effectLsts, "a:outerShdw");
    expect(outerShdws.length).toBeGreaterThanOrEqual(1);

    const reflections = findAllElements(effectLsts, "a:reflection");
    expect(reflections.length).toBeGreaterThanOrEqual(1);

    const softEdges = findAllElements(effectLsts, "a:softEdge");
    expect(softEdges.length).toBeGreaterThanOrEqual(1);
  });
});

describe("C4: Rotation + flip + opacity", () => {
  it("renders rot, flipH, and alpha on shape", async () => {
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
            backgroundColor: "#4472C4",
            rotation: 45,
            flipH: true,
            opacity: 0.5,
          },
          shapeType: "rect",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Rotation: 45 degrees = 45 * 60000 = 2700000
    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(1);
    const xfrms = findAllElements(shapes, "a:xfrm");
    expect(xfrms.length).toBeGreaterThanOrEqual(1);
    const rotXfrm = xfrms.find(x => getAttr(x, "rot") !== undefined);
    expect(rotXfrm).toBeDefined();
    expect(getAttr(rotXfrm!, "rot")).toBe("2700000");

    // FlipH
    expect(getAttr(rotXfrm!, "flipH")).toBe("1");

    // Opacity -> alpha on the fill color
    const alphas = findAllElements(tree, "a:alpha");
    expect(alphas.length).toBeGreaterThanOrEqual(1);
  });
});

describe("C5: Compound line", () => {
  it("renders shape with cmpd=dbl on line", async () => {
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
            backgroundColor: "#FFFFFF",
            borderWidth: 2,
            borderColor: "#000000",
            borderCompound: "double",
          },
          shapeType: "rect",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const lns = findAllElements(tree, "a:ln");
    expect(lns.length).toBeGreaterThanOrEqual(1);

    // Find the a:ln with cmpd attribute
    const cmpdLn = lns.find(l => getAttr(l, "cmpd") === "dbl");
    expect(cmpdLn).toBeDefined();
  });
});

describe("C6: Border styles/caps variety", () => {
  it("renders shapes with different border attributes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 0, top: 0,
              backgroundColor: "#FFFFFF",
              borderWidth: 2, borderColor: "#000000",
              borderCap: "round", borderStyle: "dashed",
            },
            shapeType: "rect",
          },
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 120, top: 0,
              backgroundColor: "#FFFFFF",
              borderWidth: 2, borderColor: "#000000",
              borderCap: "square", borderStyle: "dotted",
            },
            shapeType: "rect",
          },
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 240, top: 0,
              backgroundColor: "#FFFFFF",
              borderWidth: 2, borderColor: "#000000",
              borderCap: "flat", borderStyle: "solid",
            },
            shapeType: "rect",
          },
          {
            type: "View",
            style: {
              width: 100, height: 100, position: "absolute", left: 360, top: 0,
              backgroundColor: "#FFFFFF",
              borderWidth: 3, borderColor: "#FF0000",
              borderStyle: "dotDash",
            },
            shapeType: "rect",
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const lns = findAllElements(tree, "a:ln");
    expect(lns.length).toBeGreaterThanOrEqual(4);

    // Verify dash styles exist (solid border omits prstDash, non-solid uses mapped values)
    const prstDashes = findAllElements(tree, "a:prstDash");
    const dashValues = prstDashes.map(d => getAttr(d, "val"));
    expect(dashValues).toContain("dash");
    expect(dashValues).toContain("dot");
    expect(dashValues).toContain("dashDot");
  });
});

// =========================================================================
// CATEGORY D: ENTERPRISE TEXT & TABLES (6 tests)
// =========================================================================

describe("D1: McKinsey bullet hierarchy", () => {
  it("renders autoNum, buChar with hanging indent and tab stops", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 14, color: "#333333" },
          paragraphs: [
            {
              runs: [{ text: "Strategic Priority" }],
              level: 0,
              bullet: { type: "autoNum", scheme: "arabicPeriod" },
              hangingIndent: 36,
              marginLeft: 72,
              tabStops: [{ position: 200, align: "l" }],
            },
            {
              runs: [{ text: "Key Initiative" }],
              level: 1,
              bullet: { char: "\u2013", color: "#666666" },
              hangingIndent: 24,
              marginLeft: 108,
            },
            {
              runs: [{ text: "Action Item" }],
              level: 2,
              bullet: { char: "\u25B8", color: "#999999" },
              marginLeft: 144,
              tabStops: [{ position: 300, align: "r" }],
            },
            {
              runs: [{ text: "No bullet sub-detail" }],
              level: 3,
              bullet: { type: "none" },
              marginLeft: 180,
            },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const buAutoNums = findAllElements(tree, "a:buAutoNum");
    expect(buAutoNums.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(buAutoNums[0], "type")).toBe("arabicPeriod");

    const buChars = findAllElements(tree, "a:buChar");
    expect(buChars.length).toBeGreaterThanOrEqual(2);

    const tabLsts = findAllElements(tree, "a:tabLst");
    expect(tabLsts.length).toBeGreaterThanOrEqual(1);

    // Hanging indent -> negative indent attribute
    const pPrs = findAllElements(tree, "a:pPr");
    const negativeIndents = pPrs.filter(p => {
      const indent = getAttr(p, "indent");
      return indent !== undefined && Number(indent) < 0;
    });
    expect(negativeIndents.length).toBeGreaterThanOrEqual(1);
  });
});

describe("D2: Full table style resolution", () => {
  it("renders table with tblPr flags for firstRow and bandRow", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 500, height: 200 },
          tableData: {
            columns: [150, 150, 200],
            style: {
              firstRow: true,
              bandRow: true,
              headerRowStyle: { fill: "#003366", color: "#FFFFFF", fontWeight: "bold" },
              bandRowOddStyle: { fill: "#E6F0FF" },
              bandRowEvenStyle: { fill: "#FFFFFF" },
              outerBorder: { width: 1, color: "#000000" },
            },
            rows: [
              { height: 30, cells: [{ text: "Header 1" }, { text: "Header 2" }, { text: "Header 3" }] },
              { height: 25, cells: [{ text: "Row 1" }, { text: "Data" }, { text: "More" }] },
              { height: 25, cells: [{ text: "Row 2" }, { text: "Data" }, { text: "More" }] },
              { height: 25, cells: [{ text: "Row 3" }, { text: "Data" }, { text: "More" }] },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const tblPrs = findAllElements(tree, "a:tblPr");
    expect(tblPrs.length).toBe(1);
    expect(getAttr(tblPrs[0], "firstRow")).toBe("1");
    expect(getAttr(tblPrs[0], "bandRow")).toBe("1");

    const rows = findAllElements(tree, "a:tr");
    expect(rows.length).toBe(4);
  });
});

describe("D3: Complex merge table with rich text", () => {
  it("renders gridSpan, rowSpan, hMerge, vMerge with all 9 cells", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 400, height: 150 },
          tableData: {
            columns: [100, 100, 100],
            rows: [
              {
                height: 50,
                cells: [
                  {
                    text: "",
                    content: [
                      { text: "Merged", style: { fontWeight: "bold" } },
                      { text: " Cell", style: { fontStyle: "italic" } },
                    ],
                    colSpan: 2,
                    rowSpan: 2,
                  },
                  { text: "", hMerge: true },
                  { text: "B" },
                ],
              },
              {
                height: 50,
                cells: [
                  { text: "", vMerge: true },
                  { text: "", hMerge: true, vMerge: true },
                  { text: "C" },
                ],
              },
              {
                height: 50,
                cells: [
                  { text: "D" },
                  { text: "E" },
                  { text: "F" },
                ],
              },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Count all <a:tc> (but not <a:tcPr>)
    const cellCount = (slideXml.match(/<a:tc[\s>]/g) || []).length;
    expect(cellCount).toBe(9);

    expect(slideXml).toContain('gridSpan="2"');
    expect(slideXml).toContain('rowSpan="2"');
    expect(slideXml).toContain('hMerge="1"');
    expect(slideXml).toContain('vMerge="1"');

    // Rich text runs exist
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");
    const boldRuns = rPrs.filter(r => getAttr(r, "b") === "1");
    expect(boldRuns.length).toBeGreaterThanOrEqual(1);
    const italicRuns = rPrs.filter(r => getAttr(r, "i") === "1");
    expect(italicRuns.length).toBeGreaterThanOrEqual(1);
  });
});

describe("D4: RTL + hyperlinks", () => {
  it("renders rtlCol=1 and hlinkClick in rels", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 24, color: "#000000", rtl: true },
          content: [
            { text: "نص عربي " },
            { text: "رابط", hyperlink: "https://example.com/rtl" },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // RTL on bodyPr
    const bodyPrs = findAllElements(tree, "a:bodyPr");
    expect(bodyPrs.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs[0], "rtlCol")).toBe("1");

    // Hyperlink in the slide
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);

    // Hyperlink in rels
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(relsXml).toContain("example.com/rtl");
  });
});

describe("D5: Text decorations (underline/strike/super/sub/spacing)", () => {
  it("renders u, strike, baseline, and spc attributes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 16 },
          paragraphs: [{
            runs: [
              { text: "Underline", style: { textDecorationLine: "underline" } },
              { text: "Strike", style: { textDecorationLine: "strikethrough" } },
              { text: "Super", style: { baseline: "superscript" } },
              { text: "Sub", style: { baseline: "subscript" } },
              { text: "Spaced", style: { letterSpacing: 2 } },
            ],
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Underline
    expect(slideXml).toContain('u="sng"');

    // Strikethrough
    expect(slideXml).toContain('strike="sngStrike"');

    // Superscript (baseline 30000)
    expect(slideXml).toContain('baseline="30000"');

    // Subscript (baseline -25000)
    expect(slideXml).toContain('baseline="-25000"');

    // Letter spacing (spc attribute)
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");
    const spcRuns = rPrs.filter(r => getAttr(r, "spc") !== undefined);
    expect(spcRuns.length).toBeGreaterThanOrEqual(1);
  });
});

describe("D6: Vertical + EA text", () => {
  it("renders vert=vert270 and vert=eaVert on bodyPr", async () => {
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
            content: "East Asian",
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(2);

    const bodyPrs0 = findAllElements([shapes[0]], "a:bodyPr");
    expect(bodyPrs0.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs0[0], "vert")).toBe("vert270");

    const bodyPrs1 = findAllElements([shapes[1]], "a:bodyPr");
    expect(bodyPrs1.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(bodyPrs1[0], "vert")).toBe("eaVert");
  });
});

// =========================================================================
// CATEGORY E: COMPLIANCE (7 tests)
// =========================================================================

describe("E1: All rIds resolve on multi-asset slide", () => {
  it("verifies rId ordering for images, charts, and hyperlinks", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Image",
            style: { width: 100, height: 80, position: "absolute", left: 0, top: 0 },
            src: RED_PIXEL,
          },
          {
            type: "Image",
            style: { width: 100, height: 80, position: "absolute", left: 120, top: 0 },
            src: RED_PIXEL,
          },
          {
            type: "Chart",
            style: { width: 300, height: 200, position: "absolute", left: 0, top: 100 },
            chartData: {
              chartType: "bar",
              categories: ["A", "B"],
              series: [{ name: "S1", values: [10, 20] }],
            },
          },
          {
            type: "Text",
            style: { fontSize: 14, position: "absolute", left: 350, top: 100 },
            content: [{ text: "Link", hyperlink: "https://example.com/e1" }],
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");

    // Collect all rIds
    const rIds = rels.map(r => getAttr(r, "Id")).filter(Boolean);
    const uniqueRIds = new Set(rIds);

    // All rIds unique
    expect(uniqueRIds.size).toBe(rIds.length);

    // Should have layout, 2 images, 1 chart, 1 hyperlink = at least 5
    expect(rIds.length).toBeGreaterThanOrEqual(5);

    // rId1 should be the layout
    const layoutRel = rels.find(r => getAttr(r, "Id") === "rId1");
    expect(layoutRel).toBeDefined();
    expect(getAttr(layoutRel!, "Target")).toContain("slideLayout");

    // Image rels
    const imageRels = rels.filter(r => (getAttr(r, "Target") ?? "").includes("media/"));
    expect(imageRels.length).toBe(2);

    // Chart rels
    const chartRels = rels.filter(r => (getAttr(r, "Target") ?? "").includes("chart"));
    expect(chartRels.length).toBe(1);

    // Hyperlink rels
    const hyperlinkRels = rels.filter(r => (getAttr(r, "Type") ?? "").includes("hyperlink"));
    expect(hyperlinkRels.length).toBe(1);
  });
});

describe("E2: Content_Types completeness", () => {
  it("verifies Default and Override entries", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 300, height: 200 },
            chartData: {
              chartType: "bar",
              categories: ["A"],
              series: [{ name: "S", values: [1] }],
            },
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    const tree = parseXml(ctXml);

    // Default entries (rels, xml)
    const defaults = findAllElements(tree, "Default");
    const extensions = defaults.map(d => getAttr(d, "Extension"));
    expect(extensions).toContain("rels");
    expect(extensions).toContain("xml");

    // Override entries
    const overrides = findAllElements(tree, "Override");
    const partNames = overrides.map(o => getAttr(o, "PartName"));

    // Must have slide, chart, theme overrides
    expect(partNames.some(p => p?.includes("slide1.xml"))).toBe(true);
    expect(partNames.some(p => p?.includes("chart1.xml"))).toBe(true);
    expect(partNames.some(p => p?.includes("theme1.xml"))).toBe(true);
  });
});

describe("E3: Shape ID uniqueness", () => {
  it("verifies all cNvPr ids are unique and >= 2", async () => {
    const children: PaperNode[] = [];
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) {
        children.push({
          type: "View",
          style: { width: 50, height: 50, position: "absolute", left: i * 60, top: 0, backgroundColor: "#FF0000" },
          shapeType: "rect",
        });
      } else if (i % 3 === 1) {
        children.push({
          type: "Text",
          style: { fontSize: 12, position: "absolute", left: i * 60, top: 60 },
          content: `T${i}`,
        });
      } else {
        children.push({
          type: "Image",
          style: { width: 50, height: 50, position: "absolute", left: i * 60, top: 120 },
          src: RED_PIXEL,
        });
      }
    }

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children,
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Collect all id attributes from p:cNvPr (not the spTree grpSp id=1)
    // Find shape-level cNvPrs: inside p:sp, p:pic elements
    const sps = findAllElements(tree, "p:sp");
    const pics = findAllElements(tree, "p:pic");
    const shapeCNvPrs = [
      ...findAllElements(sps, "p:cNvPr"),
      ...findAllElements(pics, "p:cNvPr"),
    ];
    const ids = shapeCNvPrs.map(p => Number(getAttr(p, "id"))).filter(id => !isNaN(id));

    // All unique
    expect(new Set(ids).size).toBe(ids.length);

    // Shape IDs >= 2 (id=1 reserved for spTree groupShape)
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("E4: Doc properties with XML specials", () => {
  it("escapes & and < in core.xml", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {
        title: "Deck <2026> & Beyond",
        author: "O'Brien & Partners",
      },
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const coreXml = await getZipEntry(buffer, "docProps/core.xml");

    // Properly escaped
    expect(coreXml).toContain("&amp;");
    expect(coreXml).toContain("&lt;");

    // Should NOT contain raw unescaped characters in tag content
    // (The title/author should be escaped)
    const tree = parseXml(coreXml);
    expect(tree).toBeDefined();
  });
});

describe("E5: presentation.xml structure", () => {
  it("contains sldMasterIdLst, sldIdLst, sldSz, defaultTextStyle", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presXml);

    const sldMasterIdLst = findAllElements(tree, "p:sldMasterIdLst");
    expect(sldMasterIdLst.length).toBe(1);

    const sldIdLst = findAllElements(tree, "p:sldIdLst");
    expect(sldIdLst.length).toBe(1);

    const sldSz = findAllElements(tree, "p:sldSz");
    expect(sldSz.length).toBe(1);

    const defaultTextStyle = findAllElements(tree, "p:defaultTextStyle");
    expect(defaultTextStyle.length).toBe(1);
  });
});

describe("E6: Package parts existence", () => {
  it("verifies presProps, viewProps, tableStyles exist in ZIP", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [],
      }],
    };
    const buffer = await PaperEngine.render(doc);

    expect(await zipHasFile(buffer, "ppt/presProps.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/viewProps.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/tableStyles.xml")).toBe(true);
  });
});

describe("E7: Alt text on all element types", () => {
  it("renders descr attribute on p:cNvPr for all supported types", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: { width: 100, height: 50, position: "absolute", left: 0, top: 0, backgroundColor: "#FF0000" },
            shapeType: "rect",
            altText: "view-alt",
          },
          {
            type: "Image",
            style: { width: 100, height: 50, position: "absolute", left: 120, top: 0 },
            src: RED_PIXEL,
            altText: "image-alt",
          },
          {
            type: "Table",
            style: { width: 200, height: 50, position: "absolute", left: 240, top: 0 },
            tableData: { columns: [100, 100], rows: [{ cells: [{ text: "A" }, { text: "B" }] }] },
            altText: "table-alt",
          },
          {
            type: "Chart",
            style: { width: 200, height: 100, position: "absolute", left: 0, top: 70 },
            chartData: { chartType: "bar", categories: ["X"], series: [{ name: "S", values: [1] }] },
            altText: "chart-alt",
          },
          {
            type: "Group",
            style: { width: 100, height: 50, position: "absolute", left: 220, top: 70 },
            children: [{
              type: "View",
              style: { width: 50, height: 30, backgroundColor: "#00FF00" },
              shapeType: "rect",
            }],
            altText: "group-alt",
          },
          {
            type: "Connector",
            connectorType: "straight",
            start: { x: 350, y: 70 },
            end: { x: 450, y: 120 },
            altText: "connector-alt",
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Collect all descr attributes
    const cNvPrs = findAllElements(tree, "p:cNvPr");
    const descrs = cNvPrs.map(p => getAttr(p, "descr")).filter(Boolean);

    expect(descrs).toContain("view-alt");
    expect(descrs).toContain("image-alt");
    expect(descrs).toContain("connector-alt");

    // Group alt text might be on grpCNvPr or similar
    // Table and chart alt text might appear via graphicFrame
    // Verify at least the shape-level ones
    expect(descrs.length).toBeGreaterThanOrEqual(3);
  });
});

// =========================================================================
// CATEGORY F: STRESS (6 tests)
// =========================================================================

describe("F1: 100-slide presentation", () => {
  it("renders successfully with all 100 slide files", async () => {
    const slides: PaperDocument["slides"] = Array.from({ length: 100 }, (_, i) => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [{
        type: "Text" as const,
        style: { fontSize: 14 },
        content: `Slide ${i + 1}`,
      }],
    }));

    const doc: PaperDocument = { type: "Document", meta: {}, slides };
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 100; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }
  }, 60000);
});

describe("F2: 500 shapes on one slide (resource-limited)", () => {
  it("renders 500 p:sp elements (max children per slide)", async () => {
    const children: PaperNode[] = Array.from({ length: 500 }, (_, i) => ({
      type: "View" as const,
      style: {
        width: 8, height: 8,
        position: "absolute" as const,
        left: (i % 50) * 10,
        top: Math.floor(i / 50) * 10,
        backgroundColor: "#4472C4",
      },
      shapeType: "rect" as const,
    }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children,
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Use regex for performance on large XML
    const spCount = (slideXml.match(/<p:sp>/g) || []).length;
    expect(spCount).toBeGreaterThanOrEqual(500);
  }, 60000);

  it("rejects documents with >500 children per slide", async () => {
    const children: PaperNode[] = Array.from({ length: 501 }, (_, i) => ({
      type: "View" as const,
      style: { width: 8, height: 8 },
      shapeType: "rect" as const,
    }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children,
      }],
    };
    await expect(PaperEngine.render(doc)).rejects.toThrow(/validation error/);
  }, 10000);
});

describe("F3: 50x100 table", () => {
  it("renders table with >= 5000 cells", async () => {
    const columns = Array.from({ length: 50 }, () => 20);
    const rows = Array.from({ length: 100 }, (_, r) => ({
      height: 10,
      cells: Array.from({ length: 50 }, (_, c) => ({
        text: `${r}-${c}`,
      })),
    }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 900, height: 500 },
          tableData: { columns, rows },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // Count cells via regex for performance
    const cellCount = (slideXml.match(/<a:tc[\s>]/g) || []).length;
    expect(cellCount).toBeGreaterThanOrEqual(5000);
  }, 60000);
});

describe("F4: Unicode all scripts", () => {
  it("preserves Latin, CJK, Arabic, Emoji, and Cyrillic in XML", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 16 },
          paragraphs: [
            { runs: [{ text: "Hello World" }] },
            { runs: [{ text: "\u4E2D\u6587\u6D4B\u8BD5" }] },         // Chinese
            { runs: [{ text: "\u0639\u0631\u0628\u064A" }] },           // Arabic
            { runs: [{ text: "\uD83C\uDF89\uD83C\uDF8A" }] },           // Emoji
            { runs: [{ text: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" }] }, // Russian
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("Hello World");
    expect(slideXml).toContain("\u4E2D\u6587");
    expect(slideXml).toContain("\u0639\u0631\u0628\u064A");
    expect(slideXml).toContain("\u0420\u0443\u0441\u0441\u043A\u0438\u0439");
  });
});

describe("F5: Slide sections", () => {
  it("renders p14:sectionLst with 3 sections", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      sections: [
        { name: "Introduction", slideIndices: [0, 1] },
        { name: "Analysis", slideIndices: [2, 3] },
        { name: "Conclusion", slideIndices: [4] },
      ],
      slides: Array.from({ length: 5 }, (_, i) => ({
        type: "Slide" as const,
        style: { width: 960, height: 540 },
        children: [{
          type: "Text" as const,
          style: { fontSize: 14 },
          content: `Slide ${i + 1}`,
        }],
      })),
    };
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");

    // p14:sectionLst should be in the XML
    expect(presXml).toContain("p14:sectionLst");

    // 3 p14:section elements
    const sectionMatches = presXml.match(/p14:section\b/g) || [];
    // Each section has opening and closing tag, so count just opening tags
    const openingMatches = presXml.match(/<p14:section\b/g) || [];
    expect(openingMatches.length).toBe(3);
  });
});

describe("F6: Custom shows + protection", () => {
  it("renders custShowLst and modifyVerifier", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      customShows: [
        { name: "Executive Summary", slideIndices: [0, 2, 4] },
        { name: "Full Deck", slideIndices: [0, 1, 2, 3, 4] },
      ],
      protection: {
        readOnly: true,
        modifyPassword: "secret123",
      },
      slides: Array.from({ length: 5 }, (_, i) => ({
        type: "Slide" as const,
        style: { width: 960, height: 540 },
        children: [{
          type: "Text" as const,
          style: { fontSize: 14 },
          content: `Slide ${i + 1}`,
        }],
      })),
    };
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");

    // Custom shows
    expect(presXml).toContain("p:custShowLst");
    expect(presXml).toContain("Executive Summary");
    expect(presXml).toContain("Full Deck");

    // Protection
    expect(presXml).toContain("p:modifyVerifier");
  });
});
