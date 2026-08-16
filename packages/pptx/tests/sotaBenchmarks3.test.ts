/**
 * SOTA Benchmarks 3 — MBB-Grade Feature Validation
 *
 * Tests for Phase 3-7 features: charts, text enhancements, shapes,
 * tables, themes, and robustness.
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode } from "../src/types/ast.js";
import { PaperDocumentSchema } from "../src/validator/schema.js";
import {
  parseXml, getAttr, findAllElements, getText,
  getZipEntry, getZipPaths, zipHasFile, RED_PIXEL,
} from "./helpers/xmlTestUtils.js";

// =========================================================================
// CHARTS (8 tests)
// =========================================================================

describe("Benchmark 1: Waterfall Chart", () => {
  let buffer: Buffer;

  it("renders a waterfall chart with synthetic stacked bar series", async () => {
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
            chartType: "waterfall",
            waterfallData: {
              categories: ["Start", "Q1", "Q2", "Q3", "Q4", "End"],
              values: [100, 30, -15, 25, -10, 130],
              totalIndices: [0, 5],
              increaseColor: "#4472C4",
              decreaseColor: "#ED7D31",
              totalColor: "#A9D18E",
            },
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("contains invisible base series with noFill", async () => {
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);
    const barChart = findAllElements(tree, "c:barChart");
    expect(barChart.length).toBe(1);

    // Stacked bar
    const grouping = findAllElements(tree, "c:grouping");
    expect(getAttr(grouping[0], "val")).toBe("stacked");

    // 3 series: base, increase, decrease
    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(3);

    // First series (base) has noFill
    const baseSer = series[0];
    const baseSpPr = findAllElements([baseSer], "a:noFill");
    expect(baseSpPr.length).toBeGreaterThan(0);
  });

  it("has increase and decrease series with correct colors", async () => {
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);
    const series = findAllElements(tree, "c:ser");

    // Series 1 (increase) — look for solidFill color
    const increaseFills = findAllElements([series[1]], "a:srgbClr");
    const increaseColor = getAttr(increaseFills[0], "val");
    expect(increaseColor).toBe("4472C4");

    // Series 2 (decrease) — look for solidFill color
    const decreaseFills = findAllElements([series[2]], "a:srgbClr");
    const decreaseColor = getAttr(decreaseFills[0], "val");
    expect(decreaseColor).toBe("ED7D31");
  });

  it("has an embedded Excel file", async () => {
    expect(await zipHasFile(buffer, "ppt/embeddings/chart1.xlsx")).toBe(true);
  });
});

describe("Benchmark 2: Combo Chart", () => {
  it("renders bar + line on dual axes with independent number formats", async () => {
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
              { name: "Revenue ($M)", values: [10, 15, 12, 18], color: "#4472C4" },
              { name: "Growth (%)", values: [5, 8, 3, 12], color: "#ED7D31", overrideType: "line", targetAxis: "secondary" },
            ],
            valueAxis: { numberFormat: "$#,##0" },
            secondaryValueAxis: { numberFormat: "0%" },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Should have both barChart and lineChart sections
    const barCharts = findAllElements(tree, "c:barChart");
    const lineCharts = findAllElements(tree, "c:lineChart");
    expect(barCharts.length).toBe(1);
    expect(lineCharts.length).toBe(1);

    // Secondary value axis present
    const valAxes = findAllElements(tree, "c:valAx");
    expect(valAxes.length).toBeGreaterThanOrEqual(2);

    // Number formats present
    const numFmts = findAllElements(tree, "c:numFmt");
    const formatCodes = numFmts.map(n => getAttr(n, "formatCode"));
    expect(formatCodes).toContain("$#,##0");
    expect(formatCodes).toContain("0%");
  });
});

describe("Benchmark 3: Chart Axis Formatting", () => {
  it("emits axis title, number format, gridlines with custom fonts", async () => {
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
            categories: ["A", "B", "C"],
            series: [{ name: "S1", values: [10, 20, 30] }],
            valueAxis: {
              title: "Revenue ($M)",
              numberFormat: "$#,##0.0",
              fontFamily: "Georgia",
              fontSize: 12,
              fontColor: "#333333",
              gridlines: { major: true, color: "#CCCCCC" },
              tickMark: { major: "out", minor: "none" },
              labelFont: { fontFamily: "Arial", fontSize: 10, fontColor: "#666666", bold: true },
              labelRotation: -45,
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Axis title
    const titles = findAllElements(tree, "c:title");
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // Number format
    const numFmts = findAllElements(tree, "c:numFmt");
    expect(numFmts.some(n => getAttr(n, "formatCode") === "$#,##0.0")).toBe(true);

    // Major gridlines
    const majorGridlines = findAllElements(tree, "c:majorGridlines");
    expect(majorGridlines.length).toBeGreaterThanOrEqual(1);

    // Tick marks
    const majorTickMarks = findAllElements(tree, "c:majorTickMark");
    expect(majorTickMarks.some(n => getAttr(n, "val") === "out")).toBe(true);
    const minorTickMarks = findAllElements(tree, "c:minorTickMark");
    expect(minorTickMarks.some(n => getAttr(n, "val") === "none")).toBe(true);

    // Label formatting (txPr)
    const txPrs = findAllElements(tree, "c:txPr");
    expect(txPrs.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Benchmark 4: Pie Chart with Labels", () => {
  it("renders pie with callout data labels, explosion, and point colors", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 500, height: 400 },
          chartData: {
            chartType: "pie",
            categories: ["Product A", "Product B", "Product C"],
            series: [{
              name: "Share",
              values: [45, 35, 20],
              pointColors: ["#FF6384", "#36A2EB", "#FFCE56"],
            }],
            dataLabels: { showPercent: true, showCatName: true, position: "bestFit" },
            explosion: 15,
            firstSliceAng: 90,
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Pie chart
    const pie = findAllElements(tree, "c:pieChart");
    expect(pie.length).toBe(1);

    // Data labels
    const dLbls = findAllElements(tree, "c:dLbls");
    expect(dLbls.length).toBeGreaterThanOrEqual(1);
    const showPercent = findAllElements(tree, "c:showPercent");
    expect(showPercent.some(n => getAttr(n, "val") === "1")).toBe(true);

    // Explosion
    const explosions = findAllElements(tree, "c:explosion");
    expect(explosions.some(n => getAttr(n, "val") === "15")).toBe(true);

    // First slice angle
    const fsa = findAllElements(tree, "c:firstSliceAng");
    expect(fsa.some(n => getAttr(n, "val") === "90")).toBe(true);

    // Per-point colors
    const dPts = findAllElements(tree, "c:dPt");
    expect(dPts.length).toBe(3);
  });
});

describe("Benchmark 5: Scatter Chart", () => {
  it("renders XY scatter with custom axis ranges and number format", async () => {
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
            chartType: "scatter",
            xySeries: [{
              name: "Data Points",
              dataPoints: [
                { x: 1, y: 10 }, { x: 2, y: 15 }, { x: 3, y: 13 },
                { x: 4, y: 18 }, { x: 5, y: 22 },
              ],
              color: "#4472C4",
            }],
            categoryAxis: { min: 0, max: 6, title: "X Axis" },
            valueAxis: { min: 0, max: 30, numberFormat: "#,##0", title: "Y Axis" },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Scatter chart
    const scatter = findAllElements(tree, "c:scatterChart");
    expect(scatter.length).toBe(1);

    // X values
    const xVals = findAllElements(tree, "c:xVal");
    expect(xVals.length).toBe(1);

    // Y values
    const yVals = findAllElements(tree, "c:yVal");
    expect(yVals.length).toBe(1);

    // Axis scaling
    const mins = findAllElements(tree, "c:min");
    expect(mins.some(n => getAttr(n, "val") === "0")).toBe(true);
    const maxes = findAllElements(tree, "c:max");
    expect(maxes.some(n => getAttr(n, "val") === "30")).toBe(true);
  });
});

describe("Benchmark 6: Radar Chart", () => {
  it("renders multi-series filled radar with category axis", async () => {
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
            chartType: "radar",
            radarStyle: "filled",
            categories: ["Speed", "Power", "Agility", "Defense", "Stamina"],
            series: [
              { name: "Player A", values: [8, 7, 9, 5, 6], color: "#4472C4" },
              { name: "Player B", values: [6, 9, 5, 8, 7], color: "#ED7D31" },
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Radar chart
    const radar = findAllElements(tree, "c:radarChart");
    expect(radar.length).toBe(1);

    // Radar style
    const style = findAllElements(tree, "c:radarStyle");
    expect(getAttr(style[0], "val")).toBe("filled");

    // 2 series
    const series = findAllElements(tree, "c:ser");
    expect(series.length).toBe(2);

    // Has axes
    const catAx = findAllElements(tree, "c:catAx");
    expect(catAx.length).toBe(1);
  });
});

describe("Benchmark 7: Bar Chart with Spacing and Legend", () => {
  it("emits gapWidth, overlap, plot area fill, and legend border", async () => {
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
            categories: ["A", "B", "C"],
            series: [{ name: "S1", values: [10, 20, 30] }],
            gapWidth: 100,
            overlap: 25,
            plotArea: { fill: "#F5F5F5" },
            legend: {
              position: "right",
              fontFamily: "Arial",
              fontSize: 10,
              border: { color: "#999999", width: 1 },
              fill: "#FFFFFF",
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Gap width
    const gapWidth = findAllElements(tree, "c:gapWidth");
    expect(gapWidth.some(n => getAttr(n, "val") === "100")).toBe(true);

    // Overlap
    const overlap = findAllElements(tree, "c:overlap");
    expect(overlap.some(n => getAttr(n, "val") === "25")).toBe(true);

    // Plot area fill
    const plotArea = findAllElements(tree, "c:plotArea");
    expect(plotArea.length).toBe(1);
    const plotFills = findAllElements([plotArea[0]], "a:solidFill");
    expect(plotFills.length).toBeGreaterThanOrEqual(1);

    // Legend
    const legend = findAllElements(tree, "c:legend");
    expect(legend.length).toBe(1);
    // Legend has spPr with fill
    const legendSpPr = findAllElements([legend[0]], "c:spPr");
    expect(legendSpPr.length).toBe(1);
  });
});

describe("Benchmark 8: Multiple Charts on Single Slide", () => {
  it("renders 3 charts with unique rIds and 3 Excel embeds", async () => {
    const children: PaperNode[] = [];
    for (let i = 0; i < 3; i++) {
      children.push({
        type: "Chart",
        style: { width: 300, height: 200, position: "absolute", left: i * 310, top: 10 },
        chartData: {
          chartType: "bar",
          categories: ["A", "B"],
          series: [{ name: `Series ${i + 1}`, values: [10 * (i + 1), 20 * (i + 1)] }],
        },
      });
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

    // 3 chart XML files
    expect(await zipHasFile(buffer, "ppt/charts/chart1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/charts/chart2.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/charts/chart3.xml")).toBe(true);

    // 3 Excel files
    expect(await zipHasFile(buffer, "ppt/embeddings/chart1.xlsx")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/embeddings/chart2.xlsx")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/embeddings/chart3.xlsx")).toBe(true);

    // All 3 charts referenced in slide rels
    const rels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(rels);
    const relationships = findAllElements(relsTree, "Relationship");
    const chartRels = relationships.filter(r =>
      (getAttr(r, "Target") ?? "").includes("chart"),
    );
    expect(chartRels.length).toBe(3);

    // Unique rIds
    const rIds = chartRels.map(r => getAttr(r, "Id"));
    const uniqueRIds = new Set(rIds);
    expect(uniqueRIds.size).toBe(3);
  });
});

// =========================================================================
// TABLES (3 tests)
// =========================================================================

describe("Benchmark 9: Financial Table with Banding", () => {
  it("renders alternating row bands, bold header, borders, right-aligned numbers", async () => {
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
            columns: [200, 150, 150],
            style: {
              firstRow: true,
              bandRow: true,
              headerRowStyle: { fill: "#4472C4", color: "#FFFFFF", fontWeight: "bold" },
              bandRowOddStyle: { fill: "#D9E2F3" },
              bandRowEvenStyle: { fill: "#FFFFFF" },
              outerBorder: { width: 1, color: "#000000" },
            },
            rows: [
              { height: 30, cells: [
                { text: "Item" },
                { text: "Q1", style: { textAlign: "right" } },
                { text: "Q2", style: { textAlign: "right" } },
              ]},
              { height: 25, cells: [
                { text: "Revenue" },
                { text: "$1,234", style: { textAlign: "right" } },
                { text: "$1,456", style: { textAlign: "right" } },
              ]},
              { height: 25, cells: [
                { text: "COGS" },
                { text: "$567", style: { textAlign: "right" } },
                { text: "$678", style: { textAlign: "right" } },
              ]},
              { height: 25, cells: [
                { text: "Profit" },
                { text: "$667", style: { textAlign: "right" } },
                { text: "$778", style: { textAlign: "right" } },
              ]},
            ],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Table exists
    const tables = findAllElements(tree, "a:tbl");
    expect(tables.length).toBe(1);

    // tblPr has firstRow="1" and bandRow="1"
    const tblPr = findAllElements(tree, "a:tblPr");
    expect(tblPr.length).toBe(1);
    expect(getAttr(tblPr[0], "firstRow")).toBe("1");
    expect(getAttr(tblPr[0], "bandRow")).toBe("1");

    // 4 rows
    const rows = findAllElements(tree, "a:tr");
    expect(rows.length).toBe(4);

    // Header row cells should have blue fill
    const firstRowCells = findAllElements([rows[0]], "a:tcPr");
    expect(firstRowCells.length).toBeGreaterThanOrEqual(1);
    const firstCellFills = findAllElements([firstRowCells[0]], "a:solidFill");
    expect(firstCellFills.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Benchmark 10: Complex Merge Table", () => {
  it("renders L-shape rowSpan + colSpan with all 9 cells emitted", async () => {
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
              { height: 50, cells: [
                { text: "A", colSpan: 2, rowSpan: 2 },
                { text: "", hMerge: true },
                { text: "B" },
              ]},
              { height: 50, cells: [
                { text: "", vMerge: true },
                { text: "", hMerge: true, vMerge: true },
                { text: "C" },
              ]},
              { height: 50, cells: [
                { text: "D" },
                { text: "E" },
                { text: "F" },
              ]},
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

    // Master cell has gridSpan
    expect(slideXml).toContain('gridSpan="2"');
    expect(slideXml).toContain('rowSpan="2"');

    // Ghost cells have merge attributes
    expect(slideXml).toContain('hMerge="1"');
    expect(slideXml).toContain('vMerge="1"');
  });
});

describe("Benchmark 11: Rich Text Table Cells", () => {
  it("renders cells with mixed bold/italic runs and hyperlinks", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 400, height: 100 },
          tableData: {
            columns: [200, 200],
            rows: [{
              height: 50,
              cells: [
                {
                  text: "",
                  content: [
                    { text: "Bold", style: { fontWeight: "bold" } },
                    { text: " and ", style: {} },
                    { text: "Italic", style: { fontStyle: "italic" } },
                  ],
                },
                {
                  text: "",
                  paragraphs: [{
                    runs: [
                      { text: "Click ", style: {} },
                      { text: "here", hyperlink: "https://example.com", style: { color: "#0563C1" } },
                    ],
                  }],
                },
              ],
            }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Bold run
    const rPrs = findAllElements(tree, "a:rPr");
    const boldRuns = rPrs.filter(r => getAttr(r, "b") === "1");
    expect(boldRuns.length).toBeGreaterThanOrEqual(1);

    // Italic run
    const italicRuns = rPrs.filter(r => getAttr(r, "i") === "1");
    expect(italicRuns.length).toBeGreaterThanOrEqual(1);

    // Hyperlink
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);

    // Hyperlink in rels
    const rels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(rels).toContain("example.com");
  });
});

// =========================================================================
// TEXT/SHAPE (5 tests)
// =========================================================================

describe("Benchmark 12: 4-Level Consulting Bullet Hierarchy", () => {
  it("renders 4 levels with different chars, sizes, colors, indents", async () => {
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
            { runs: [{ text: "Strategic Priority" }], level: 0, bullet: { char: "\u25CF", size: 100, color: "#4472C4" } },
            { runs: [{ text: "Key Initiative" }], level: 1, bullet: { char: "\u2013", size: 100, color: "#666666" }, marginLeft: 20 },
            { runs: [{ text: "Action Item" }], level: 2, bullet: { char: "\u25B8", size: 80, color: "#999999" }, marginLeft: 40 },
            { runs: [{ text: "Sub-detail" }], level: 3, bullet: { char: "\u00B7", size: 80, color: "#AAAAAA" }, marginLeft: 60 },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // 4 paragraphs
    const paras = findAllElements(tree, "a:p");
    expect(paras.length).toBeGreaterThanOrEqual(4);

    // Levels 0-3
    const pPrs = findAllElements(tree, "a:pPr");
    const levels = pPrs.map(p => getAttr(p, "lvl")).filter(Boolean);
    expect(levels).toContain("0");
    expect(levels).toContain("1");
    expect(levels).toContain("2");
    expect(levels).toContain("3");

    // Bullet chars
    const buChars = findAllElements(tree, "a:buChar");
    expect(buChars.length).toBe(4);

    // Bullet colors
    const buClrs = findAllElements(tree, "a:buClr");
    expect(buClrs.length).toBe(4);
  });
});

describe("Benchmark 13: Gradient Text Fill", () => {
  it("renders runs with gradFill inside rPr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 32 },
          content: [{
            text: "Gradient Text",
            style: {
              gradientFill: {
                type: "linear",
                angle: 90,
                stops: [
                  { color: "#FF0000", position: 0 },
                  { color: "#0000FF", position: 100 },
                ],
              },
            },
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // gradFill inside rPr
    const rPrs = findAllElements(tree, "a:rPr");
    expect(rPrs.length).toBeGreaterThanOrEqual(1);
    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    // Gradient stops
    const gsLst = findAllElements(tree, "a:gsLst");
    expect(gsLst.length).toBeGreaterThanOrEqual(1);
    const stops = findAllElements(tree, "a:gs");
    expect(stops.length).toBe(2);

    // Linear gradient
    const lin = findAllElements(tree, "a:lin");
    expect(lin.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Benchmark 14: Shape Hyperlink", () => {
  it("emits hlinkClick on cNvPr for clickable View", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 200, height: 50, backgroundColor: "#4472C4" },
          shapeType: "roundRect",
          hyperlink: "https://example.com/click",
          textContent: "Click Me",
          textStyle: { color: "#FFFFFF", fontSize: 14, textAlign: "center", verticalAlign: "middle" },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // hlinkClick on cNvPr
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);

    // Hyperlink in rels
    const rels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(rels).toContain("example.com/click");
  });
});

describe("Benchmark 15: Text Caps", () => {
  it("emits cap='all' and cap='small' on run properties", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 14 },
          paragraphs: [{
            runs: [
              { text: "ALL CAPS", style: { textTransform: "uppercase" } },
              { text: "Small Caps", style: { textTransform: "capitalize" } },
              { text: "Lowercase Only", style: { textTransform: "lowercase" } },
            ],
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // cap="all"
    expect(slideXml).toContain('cap="all"');

    // cap="small"
    expect(slideXml).toContain('cap="small"');

    // lowercase text is transformed to lowercase in the XML
    const tree = parseXml(slideXml);
    const textEls = findAllElements(tree, "a:t");
    const texts = textEls.map(t => getText(t));
    // The lowercase run should have "lowercase only" (lowercased)
    expect(texts.some(t => t === "lowercase only")).toBe(true);
  });
});

describe("Benchmark 16: Hanging Indent + Tab Stops", () => {
  it("emits negative indent value and tabLst", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 14 },
          paragraphs: [{
            runs: [{ text: "Item 1\tValue 1" }],
            hangingIndent: 36,
            marginLeft: 72,
            tabStops: [
              { position: 300, align: "r" },
            ],
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Hanging indent (negative indent attr)
    const pPrs = findAllElements(tree, "a:pPr");
    expect(pPrs.length).toBeGreaterThanOrEqual(1);
    const indentAttr = getAttr(pPrs[0], "indent");
    expect(indentAttr).toBeDefined();
    expect(Number(indentAttr)).toBeLessThan(0);

    // Tab list
    const tabLst = findAllElements(tree, "a:tabLst");
    expect(tabLst.length).toBe(1);

    // Tab with alignment
    const tabs = findAllElements(tree, "a:tab");
    expect(tabs.length).toBe(1);
    expect(getAttr(tabs[0], "algn")).toBe("r");
    expect(Number(getAttr(tabs[0], "pos"))).toBeGreaterThan(0);
  });
});

// =========================================================================
// THEME (2 tests)
// =========================================================================

describe("Benchmark 17: Custom Theme Colors", () => {
  it("applies accent1-6 overrides to clrScheme in theme1.xml", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      theme: {
        name: "MBB Custom",
        colorScheme: {
          accent1: "#003366",
          accent2: "#CC0000",
          accent3: "#006633",
          accent4: "#FF9900",
          accent5: "#663399",
          accent6: "#009999",
        },
      },
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 14 },
          content: "Themed slide",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const themeXml = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    const tree = parseXml(themeXml);

    // Theme name
    const theme = findAllElements(tree, "a:theme");
    expect(getAttr(theme[0], "name")).toBe("MBB Custom");

    // Custom colors applied
    expect(themeXml).toContain("003366");
    expect(themeXml).toContain("CC0000");
    expect(themeXml).toContain("006633");
    expect(themeXml).toContain("FF9900");
    expect(themeXml).toContain("663399");
    expect(themeXml).toContain("009999");

    // Color scheme element present
    const clrScheme = findAllElements(tree, "a:clrScheme");
    expect(clrScheme.length).toBe(1);
    expect(getAttr(clrScheme[0], "name")).toBe("MBB Custom");
  });
});

describe("Benchmark 18: Theme Colors on Shapes", () => {
  it("emits schemeClr with tint modifier on shapes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      theme: {
        colorScheme: { accent1: "#003366" },
      },
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent1", tint: 50 },
          },
          shapeType: "rect",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // schemeClr with val="accent1"
    const schemeClrs = findAllElements(tree, "a:schemeClr");
    expect(schemeClrs.some(s => getAttr(s, "val") === "accent1")).toBe(true);

    // tint modifier
    const tints = findAllElements(tree, "a:tint");
    expect(tints.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(tints[0], "val")).toBe("50000");
  });
});

// =========================================================================
// ROBUSTNESS (7 tests)
// =========================================================================

describe("Benchmark 19: Empty Slide", () => {
  it("renders a valid PPTX with empty spTree", async () => {
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
    expect(buffer.length).toBeGreaterThan(0);

    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const spTree = findAllElements(tree, "p:spTree");
    expect(spTree.length).toBe(1);

    // Valid package structure
    expect(await zipHasFile(buffer, "[Content_Types].xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/presentation.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/theme/theme1.xml")).toBe(true);
  });
});

describe("Benchmark 20: 10 Levels of Nested Groups", () => {
  it("renders all grpSp with valid unique shape IDs", async () => {
    function nestGroups(depth: number): PaperNode {
      if (depth === 0) {
        return {
          type: "View",
          style: { width: 50, height: 50, backgroundColor: "#FF0000" },
          shapeType: "rect",
        };
      }
      return {
        type: "Group",
        style: { width: 100 + depth * 20, height: 100 + depth * 20 },
        children: [nestGroups(depth - 1)],
      };
    }

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [nestGroups(10)],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // All group shapes present
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBe(10);

    // All shape IDs unique
    const cNvPrs = findAllElements(tree, "p:cNvPr");
    const ids = cNvPrs.map(p => getAttr(p, "id")).filter(Boolean);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("Benchmark 21: Special Characters Everywhere", () => {
  it("handles XML entities in text, table, chart, and notes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: 'Deck <"2026">', author: "O'Brien & Associates" },
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        notes: "Speaker's notes with <xml> & \"entities\"",
        children: [
          {
            type: "Text",
            style: { fontSize: 14 },
            content: "Price: $10 < $20 & margin > 50%",
          },
          {
            type: "Table",
            style: { width: 400, height: 60 },
            tableData: {
              columns: [200, 200],
              rows: [{ height: 30, cells: [
                { text: "A & B" },
                { text: "C < D" },
              ]}],
            },
          },
          {
            type: "Chart",
            style: { width: 300, height: 200 },
            chartData: {
              chartType: "bar",
              categories: ["Q1 & Q2", "Q3 < Q4"],
              series: [{ name: "Rev > $1M", values: [100, 200] }],
            },
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);

    // All files should parse without XML errors
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("&amp;");
    expect(slideXml).toContain("&lt;");

    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("&amp;");
    expect(chartXml).toContain("&lt;");

    // Notes should exist and be escaped
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    expect(notesXml).toContain("&amp;");

    // Core properties should be escaped
    const coreXml = await getZipEntry(buffer, "docProps/core.xml");
    expect(coreXml).toContain("&lt;");
    expect(coreXml).toContain("&amp;");
  });
});

describe("Benchmark 22: 500+ Shapes on Single Slide", () => {
  it("renders without error and all shapes have unique IDs", async () => {
    const children: PaperNode[] = [];
    for (let i = 0; i < 500; i++) {
      children.push({
        type: "View",
        style: {
          width: 10, height: 10,
          position: "absolute",
          left: (i % 50) * 15,
          top: Math.floor(i / 50) * 15,
          backgroundColor: `#${(i * 500).toString(16).padStart(6, "0").slice(0, 6)}`,
        },
        shapeType: "rect",
      });
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

    // All shapes present
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBe(500);

    // All IDs unique
    const cNvPrs = findAllElements(tree, "p:cNvPr");
    const ids = cNvPrs.map(p => getAttr(p, "id")).filter(Boolean);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("Benchmark 23: Zod Validation Rejections", () => {
  it("rejects negative opacity", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 100, height: 100, opacity: -0.5 },
        }],
      }],
    };
    expect(() => PaperDocumentSchema.parse(doc)).toThrow();
  });

  it("rejects opacity > 1", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 100, height: 100, opacity: 1.5 },
        }],
      }],
    };
    expect(() => PaperDocumentSchema.parse(doc)).toThrow();
  });

  it("rejects 1-stop gradient", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 100, height: 100,
            fill: { type: "linear", stops: [{ color: "#FF0000", position: 0 }] },
          },
        }],
      }],
    };
    expect(() => PaperDocumentSchema.parse(doc)).toThrow();
  });

  it("rejects mismatched categories/series lengths", () => {
    const doc = {
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
            series: [{ name: "S1", values: [1, 2] }], // 2 values for 3 categories
          },
        }],
      }],
    };
    expect(() => PaperDocumentSchema.parse(doc)).toThrow();
  });

  it("rejects negative borderWidth", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 100, height: 100, borderWidth: -1 },
        }],
      }],
    };
    expect(() => PaperDocumentSchema.parse(doc)).toThrow();
  });
});

describe("Benchmark 24: Doughnut Chart with Full Features", () => {
  it("renders doughnut with holeSize, per-point colors, and data labels", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 500, height: 400 },
          chartData: {
            chartType: "doughnut",
            holeSize: 65,
            categories: ["North", "South", "East", "West"],
            series: [{
              name: "Revenue",
              values: [40, 25, 20, 15],
              pointColors: ["#4472C4", "#ED7D31", "#A9D18E", "#FFC000"],
            }],
            dataLabels: { showVal: true, showPercent: true },
            firstSliceAng: 180,
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Doughnut chart
    const doughnut = findAllElements(tree, "c:doughnutChart");
    expect(doughnut.length).toBe(1);

    // Hole size
    const holeSize = findAllElements(tree, "c:holeSize");
    expect(getAttr(holeSize[0], "val")).toBe("65");

    // Data labels
    const dLbls = findAllElements(tree, "c:dLbls");
    expect(dLbls.length).toBeGreaterThanOrEqual(1);

    // Per-point colors
    const dPts = findAllElements(tree, "c:dPt");
    expect(dPts.length).toBe(4);

    // First slice angle
    const fsa = findAllElements(tree, "c:firstSliceAng");
    expect(fsa.some(n => getAttr(n, "val") === "180")).toBe(true);
  });
});

describe("Benchmark 25: Slide Transition + Animation Coexistence", () => {
  it("renders both transition and timing XML on the same slide", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        transition: { type: "fade", duration: 500 },
        children: [{
          type: "View",
          style: { width: 200, height: 100, backgroundColor: "#4472C4" },
          shapeType: "rect",
          animations: [{
            type: "entrance",
            effect: "fade",
            trigger: "onClick",
            duration: 500,
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Transition
    const transitions = findAllElements(tree, "p:transition");
    expect(transitions.length).toBe(1);

    // Animation timing
    const timing = findAllElements(tree, "p:timing");
    expect(timing.length).toBe(1);

    // Both coexist in the same slide
    const slide = findAllElements(tree, "p:sld");
    expect(slide.length).toBe(1);
  });
});
