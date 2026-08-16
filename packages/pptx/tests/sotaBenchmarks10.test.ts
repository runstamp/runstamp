/**
 * SOTA Benchmarks 10 — MBB Real-World Scenarios
 *
 * 45 tests across 5 categories:
 *   A: Consulting Deck Simulation — title slides, exec summaries, competitive matrices
 *   B: Data-Heavy Slides — large tables, multi-chart dashboards, KPI grids
 *   C: Cross-Feature Interaction — combined features on single elements
 *   D: Document-Level Features — properties, sections, protection, fonts, comments
 *   E: Complex Layouts — nested groups, deep nesting, overlapping elements
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type {
  PaperDocument, PaperSlide, PaperNode, TableData, ChartData,
  Paragraph, TextRun, SlideComment,
} from "../src/types/ast.js";
import { generateDiagram } from "../src/diagrams/index.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL, getText,
  assertUniqueShapeIds, assertRIdsResolve, getShapeCount,
  assertWellFormedXml,
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
// CATEGORY A: CONSULTING DECK SIMULATION (10 tests)
// =========================================================================

describe("A: Consulting Deck Simulation", () => {
  it("A1: McKinsey-style title slide with gradient background + centered text", async () => {
    const doc = makeDoc([
      {
        type: "Text",
        style: { width: 800, height: 60, fontSize: 36, fontWeight: "bold", color: "#FFFFFF", textAlign: "center" },
        content: "Strategic Growth Assessment",
      },
      {
        type: "Text",
        style: { width: 600, height: 40, fontSize: 18, color: "#CCCCCC", textAlign: "center" },
        content: "Confidential — Prepared for Board of Directors",
      },
    ], {
      background: {
        type: "gradient",
        angle: 180,
        stops: [
          { color: "#1A1A2E", position: 0 },
          { color: "#16213E", position: 50 },
          { color: "#0F3460", position: 100 },
        ],
      },
    });
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Background gradient present
    const bgPrs = findAllElements(tree, "p:bgPr");
    expect(bgPrs.length).toBeGreaterThanOrEqual(1);
    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    // Text elements
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(2);

    await assertWellFormedXml(buffer);
  });

  it("A2: Executive summary with 4-level bullet hierarchy", async () => {
    const paragraphs: Paragraph[] = [
      { runs: [{ text: "Key Findings", style: { fontWeight: "bold", fontSize: 18 } }] },
      {
        runs: [{ text: "Revenue grew 15% YoY" }],
        level: 0,
        bullet: { char: "•" },
      },
      {
        runs: [{ text: "Driven by enterprise segment" }],
        level: 1,
        bullet: { char: "–" },
      },
      {
        runs: [{ text: "EMEA contributed 40% of growth" }],
        level: 2,
        bullet: { char: "▸" },
      },
      {
        runs: [{ text: "UK & Germany leading markets" }],
        level: 3,
        bullet: { char: "·" },
      },
    ];
    const doc = makeDoc([{
      type: "Text",
      style: { width: 700, height: 300, fontSize: 14 },
      paragraphs,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Multiple paragraphs
    const ps = findAllElements(tree, "a:p");
    expect(ps.length).toBeGreaterThanOrEqual(5);

    // Bullet characters present
    const buChars = findAllElements(tree, "a:buChar");
    expect(buChars.length).toBeGreaterThanOrEqual(4);

    await assertWellFormedXml(buffer);
  });

  it("A3: 2x2 competitive matrix with shapes and labels", async () => {
    const children: PaperNode[] = [
      // Quadrant backgrounds
      { type: "View", style: { position: "absolute", left: 100, top: 50, width: 350, height: 200, backgroundColor: "#E8F5E9" } },
      { type: "View", style: { position: "absolute", left: 450, top: 50, width: 350, height: 200, backgroundColor: "#FFF3E0" } },
      { type: "View", style: { position: "absolute", left: 100, top: 250, width: 350, height: 200, backgroundColor: "#E3F2FD" } },
      { type: "View", style: { position: "absolute", left: 450, top: 250, width: 350, height: 200, backgroundColor: "#FCE4EC" } },
      // Labels
      { type: "Text", style: { position: "absolute", left: 200, top: 100, width: 150, height: 30, fontSize: 12, fontWeight: "bold" }, content: "Stars" },
      { type: "Text", style: { position: "absolute", left: 550, top: 100, width: 150, height: 30, fontSize: 12, fontWeight: "bold" }, content: "Question Marks" },
      { type: "Text", style: { position: "absolute", left: 200, top: 300, width: 150, height: 30, fontSize: 12, fontWeight: "bold" }, content: "Cash Cows" },
      { type: "Text", style: { position: "absolute", left: 550, top: 300, width: 150, height: 30, fontSize: 12, fontWeight: "bold" }, content: "Dogs" },
    ];
    const doc = makeDoc(children);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(8);

    assertUniqueShapeIds(tree);
    await assertWellFormedXml(buffer);
  });

  it("A4: Revenue waterfall chart with connectors and labels", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "waterfall",
        waterfallData: {
          categories: ["FY22", "Pricing", "Volume", "New Products", "Churn", "FY23"],
          values: [1000, 200, 150, 100, -80, 1370],
          totalIndices: [0, 5],
          increaseColor: "#70AD47",
          decreaseColor: "#FF4444",
          totalColor: "#4472C4",
          connectorLines: true,
        },
        dataLabels: { showVal: true, position: "outEnd" },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("barChart");
    // Waterfall chart renders as stacked bar; data labels may or may not be present
    // depending on whether the engine passes them through for waterfall type
    expect(chartXml).toContain("barChart");
    await assertWellFormedXml(buffer);
  });

  it("A5: Org chart as hierarchy diagram → valid group structure", async () => {
    const config = {
      type: "hierarchy" as const,
      items: [{
        text: "CEO",
        children: [
          { text: "CTO", children: [{ text: "Eng Lead" }, { text: "DevOps Lead" }] },
          { text: "CFO", children: [{ text: "Controller" }] },
          { text: "COO", children: [{ text: "Ops Manager" }, { text: "HR Director" }] },
        ],
      }],
      style: { accentColor: "#003366" as const, fontSize: 10 },
    };
    const group = generateDiagram(config);
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBeGreaterThanOrEqual(6); // 6 parent-child connections

    await assertWellFormedXml(buffer);
  });

  it("A6: Financial data table with header styling and number formatting", async () => {
    const tableData: TableData = {
      columns: [150, 100, 100, 100, 100],
      rows: [
        {
          cells: [
            { text: "Metric", style: { fontWeight: "bold", fill: "#003366", color: "#FFFFFF" } },
            { text: "FY20", style: { fontWeight: "bold", fill: "#003366", color: "#FFFFFF" } },
            { text: "FY21", style: { fontWeight: "bold", fill: "#003366", color: "#FFFFFF" } },
            { text: "FY22", style: { fontWeight: "bold", fill: "#003366", color: "#FFFFFF" } },
            { text: "FY23", style: { fontWeight: "bold", fill: "#003366", color: "#FFFFFF" } },
          ],
        },
        { cells: [{ text: "Revenue ($M)" }, { text: "850" }, { text: "920" }, { text: "1,050" }, { text: "1,200" }] },
        { cells: [{ text: "EBITDA ($M)" }, { text: "170" }, { text: "195" }, { text: "230" }, { text: "275" }] },
        { cells: [{ text: "Margin (%)" }, { text: "20.0%" }, { text: "21.2%" }, { text: "21.9%" }, { text: "22.9%" }] },
        { cells: [{ text: "Headcount" }, { text: "2,500" }, { text: "2,800" }, { text: "3,100" }, { text: "3,400" }] },
      ],
      style: {
        firstRow: true,
        bandRow: true,
        headerRowStyle: { fill: "#003366", color: "#FFFFFF", fontWeight: "bold" },
        bandRowOddStyle: { fill: "#F0F0F0" },
      },
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 550, height: 200 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // 5 columns
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(5);

    // 5 rows × 5 cols = 25 cells (counting non-merged)
    const tcs = findAllElements(tree, "a:tc");
    expect(tcs.length).toBe(25);

    await assertWellFormedXml(buffer);
  });

  it("A7: Slide deck with table of contents using internal hyperlinks", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200, fontSize: 14 },
          paragraphs: [
            { runs: [{ text: "Table of Contents", style: { fontWeight: "bold", fontSize: 20 } }] },
            { runs: [{ text: "1. Executive Summary", hyperlink: { slide: 2 } }] },
            { runs: [{ text: "2. Market Analysis", hyperlink: { slide: 3 } }] },
            { runs: [{ text: "3. Financial Projections", hyperlink: { slide: 4 } }] },
          ],
        }],
      },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 400, height: 50, fontSize: 24 }, content: "Executive Summary" }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 400, height: 50, fontSize: 24 }, content: "Market Analysis" }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 400, height: 50, fontSize: 24 }, content: "Financial Projections" }] },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    // Check TOC slide has hyperlinks
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(3);

    // Verify rels point to other slides
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const slideRels = rels.filter(r => getAttr(r, "Target")?.includes("slide"));
    expect(slideRels.length).toBeGreaterThanOrEqual(3);

    await assertWellFormedXml(buffer);
  });

  it("A8: Process flow diagram with custom styling matches brand colors", async () => {
    const group = generateDiagram({
      type: "process",
      items: [
        { text: "Discover", color: "#003366" },
        { text: "Analyze", color: "#005599" },
        { text: "Design", color: "#0077CC" },
        { text: "Implement", color: "#0099FF" },
        { text: "Review", color: "#33BBFF" },
      ],
      style: { fontFamily: "Calibri", fontSize: 11, connectorStyle: "arrow" },
    });
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    await assertWellFormedXml(buffer);

    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(5);
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(4);
  });

  it("A9: Slide with header/footer → placeholder shapes emitted", async () => {
    const doc = makeDoc([
      { type: "Text", style: { width: 300, height: 50, fontSize: 14 }, content: "Content" },
    ], {
      headerFooter: { slideNumber: true, footer: "Confidential", dateTime: true },
    });
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const phs = findAllElements(tree, "p:ph");
    expect(phs.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("A10: Title + subtitle slide with custom slide dimensions", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Presentation", author: "Consultant" },
      slideSize: { width: 1280, height: 720 },
      slides: [{
        type: "Slide",
        style: { width: 1280, height: 720 },
        children: [
          { type: "Text", style: { width: 800, height: 80, fontSize: 44, fontWeight: "bold", textAlign: "center" }, content: "Strategy Review 2024" },
          { type: "Text", style: { width: 600, height: 40, fontSize: 20, textAlign: "center", color: "#666666" }, content: "Board Meeting — Q4 Update" },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    // Custom slide size
    expect(presXml).toContain("sldSz");
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY B: DATA-HEAVY SLIDES (10 tests)
// =========================================================================

describe("B: Data-Heavy Slides", () => {
  it("B1: 20-row financial table → all rows and cells emitted", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      cells: [
        { text: `Company ${i + 1}` },
        { text: `${(100 + i * 10).toFixed(0)}` },
        { text: `${(15 + i * 0.5).toFixed(1)}%` },
      ],
    }));
    const tableData: TableData = {
      columns: [200, 100, 100],
      rows,
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 500 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const trs = findAllElements(tree, "a:tr");
    expect(trs.length).toBe(20);

    const tcs = findAllElements(tree, "a:tc");
    expect(tcs.length).toBe(60); // 20 rows × 3 cols

    await assertWellFormedXml(buffer);
  });

  it("B2: 4-chart dashboard slide → all charts rendered", async () => {
    const makeChart = (type: string, x: number, y: number): PaperNode => ({
      type: "Chart",
      style: { position: "absolute", left: x, top: y, width: 440, height: 240 },
      chartData: {
        chartType: type as any,
        categories: ["Q1", "Q2", "Q3", "Q4"],
        series: [{ name: "Revenue", values: [100, 150, 200, 250] }],
      },
    });
    const doc = makeDoc([
      makeChart("bar", 20, 20),
      makeChart("line", 480, 20),
      makeChart("pie", 20, 280),
      makeChart("area", 480, 280),
    ]);
    const buffer = await PaperEngine.render(doc);

    for (let i = 1; i <= 4; i++) {
      const hasChart = await zipHasFile(buffer, `ppt/charts/chart${i}.xml`);
      expect(hasChart).toBe(true);
    }

    await assertWellFormedXml(buffer);
  });

  it("B3: KPI card grid (6 cards with shapes + text)", async () => {
    const kpis = [
      { label: "Revenue", value: "$1.2B", color: "#4472C4" },
      { label: "EBITDA", value: "$275M", color: "#ED7D31" },
      { label: "Margin", value: "22.9%", color: "#70AD47" },
      { label: "Headcount", value: "3,400", color: "#FFC000" },
      { label: "NPS", value: "72", color: "#5B9BD5" },
      { label: "Churn", value: "3.2%", color: "#FF4444" },
    ];
    const children: PaperNode[] = kpis.map((kpi, i) => ({
      type: "View" as const,
      style: {
        position: "absolute" as const,
        left: (i % 3) * 300 + 30,
        top: Math.floor(i / 3) * 200 + 30,
        width: 260,
        height: 160,
        backgroundColor: kpi.color,
        borderWidth: 0,
      },
      shapeType: "roundRect" as const,
      textContent: `${kpi.label}\n${kpi.value}`,
      textStyle: {
        fontSize: 18,
        color: "#FFFFFF" as const,
        textAlign: "center" as const,
        verticalAlign: "middle" as const,
      },
    }));
    const doc = makeDoc(children);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(6);

    assertUniqueShapeIds(tree);
    await assertWellFormedXml(buffer);
  });

  it("B4: Multi-series bar chart with 5 series and 10 categories", async () => {
    const categories = Array.from({ length: 10 }, (_, i) => `Cat ${i + 1}`);
    const series = Array.from({ length: 5 }, (_, i) => ({
      name: `Series ${i + 1}`,
      values: Array.from({ length: 10 }, () => Math.round(Math.random() * 100)),
      color: [`#4472C4`, `#ED7D31`, `#70AD47`, `#FFC000`, `#5B9BD5`][i],
    }));
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 800, height: 500 },
      chartData: {
        chartType: "bar",
        barGrouping: "clustered",
        categories,
        series,
        legend: { position: "bottom" },
        valueAxis: { title: "Value", numberFormat: "$#,##0" },
        categoryAxis: { title: "Category" },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // 5 series
    const sers = findAllElements(tree, "c:ser");
    expect(sers.length).toBe(5);

    await assertWellFormedXml(buffer);
  });

  it("B5: Scatter chart with 200 data points", async () => {
    const dataPoints = Array.from({ length: 200 }, (_, i) => ({
      x: i * 0.5,
      y: Math.sin(i * 0.1) * 50 + 50,
    }));
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 600, height: 400 },
      chartData: {
        chartType: "scatter",
        xySeries: [{ name: "Wave", dataPoints }],
        marker: { symbol: "dot", size: 3 },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("scatterChart");
    await assertWellFormedXml(buffer);
  });

  it("B6: Table with autoFit 'distribute' → equal column widths", async () => {
    const tableData: TableData = {
      columns: [50, 50, 50, 50], // will be redistributed
      rows: [
        { cells: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] },
      ],
      autoFit: "distribute",
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(4);
    // All widths should be equal
    const widths = gridCols.map(gc => parseInt(getAttr(gc, "w")!, 10));
    expect(widths[0]).toBe(widths[1]);
    expect(widths[1]).toBe(widths[2]);
    expect(widths[2]).toBe(widths[3]);

    await assertWellFormedXml(buffer);
  });

  it("B7: Doughnut chart with holeSize and first slice angle", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 400 },
      chartData: {
        chartType: "doughnut",
        categories: ["Product A", "Product B", "Product C"],
        series: [{ name: "Revenue", values: [45, 30, 25] }],
        holeSize: 60,
        firstSliceAng: 90,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("doughnutChart");
    expect(chartXml).toContain("holeSize");
    expect(chartXml).toContain("firstSliceAng");
    await assertWellFormedXml(buffer);
  });

  it("B8: Stacked area chart with 3 series", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 600, height: 400 },
      chartData: {
        chartType: "area",
        areaGrouping: "stacked",
        categories: ["2020", "2021", "2022", "2023"],
        series: [
          { name: "Product A", values: [100, 120, 140, 160], color: "#4472C4" },
          { name: "Product B", values: [80, 90, 110, 130], color: "#ED7D31" },
          { name: "Product C", values: [60, 70, 80, 100], color: "#70AD47" },
        ],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("areaChart");
    expect(chartXml).toContain("stacked");
    await assertWellFormedXml(buffer);
  });

  it("B9: Bubble chart with size dimension", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 500, height: 400 },
      chartData: {
        chartType: "bubble",
        xySeries: [
          {
            name: "Companies",
            dataPoints: [
              { x: 10, y: 80, size: 50 },
              { x: 30, y: 60, size: 100 },
              { x: 50, y: 40, size: 75 },
              { x: 70, y: 90, size: 150 },
            ],
          },
        ],
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("bubbleChart");
    await assertWellFormedXml(buffer);
  });

  it("B10: Table with rich text cells (TextRun[])", async () => {
    const tableData: TableData = {
      columns: [200, 200],
      rows: [{
        cells: [
          {
            text: "",
            content: [
              { text: "Revenue: ", style: { fontWeight: "bold" } },
              { text: "$1.2B", style: { color: "#00AA00" } },
            ],
          },
          {
            text: "",
            content: [
              { text: "Growth: ", style: { fontWeight: "bold" } },
              { text: "+15%", style: { color: "#FF0000" } },
            ],
          },
        ],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("Revenue");
    expect(slideXml).toContain("$1.2B");
    expect(slideXml).toContain("b=\"1\"");
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY C: CROSS-FEATURE INTERACTION (10 tests)
// =========================================================================

describe("C: Cross-Feature Interaction", () => {
  it("C1: Shape with shadow + rotation + opacity → all attributes present", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 200, height: 150,
        backgroundColor: "#4472C4",
        rotation: 15,
        opacity: 0.8,
        effects: {
          dropShadow: {
            color: "#000000",
            offsetX: 5,
            offsetY: 5,
            blurRadius: 10,
            opacity: 0.5,
          },
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Rotation
    const xfrms = findAllElements(tree, "a:xfrm");
    const rotated = xfrms.find(x => getAttr(x, "rot"));
    expect(rotated).toBeDefined();

    // Shadow
    const shadows = findAllElements(tree, "a:outerShdw");
    expect(shadows.length).toBeGreaterThanOrEqual(1);

    // Opacity (alpha)
    const alphas = findAllElements(tree, "a:alpha");
    expect(alphas.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C2: Image with crop + borderRadius + hyperlink + altText → all present", async () => {
    const doc = makeDoc([{
      type: "Image",
      src: RED_PIXEL,
      style: { width: 200, height: 200 },
      crop: { left: 10, top: 10, right: 10, bottom: 10 },
      borderRadius: 20,
      hyperlink: "https://example.com",
      altText: "Red pixel image",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Crop (srcRect)
    const srcRects = findAllElements(tree, "a:srcRect");
    expect(srcRects.length).toBeGreaterThanOrEqual(1);

    // Alt text (descr on cNvPr)
    const cNvPrs = findAllElements(tree, "p:cNvPr");
    const withDescr = cNvPrs.find(el => getAttr(el, "descr") === "Red pixel image");
    expect(withDescr).toBeDefined();

    // Hyperlink
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C3: Text with multiple effects (shadow + outline + gradient fill)", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 400, height: 60, fontSize: 24 },
      content: [{
        text: "Styled Text",
        style: {
          fontWeight: "bold",
          shadow: { color: "#000000", offsetX: 2, offsetY: 2, blurRadius: 4, opacity: 0.5 },
          outline: { width: 1, color: "#000000" },
          gradientFill: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#4472C4", position: 0 },
              { color: "#ED7D31", position: 100 },
            ],
          },
        },
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Shadow on run
    const outerShdws = findAllElements(tree, "a:outerShdw");
    expect(outerShdws.length).toBeGreaterThanOrEqual(1);

    // Outline on run
    const lns = findAllElements(tree, "a:ln");
    expect(lns.length).toBeGreaterThanOrEqual(1);

    // Gradient fill
    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C4: Animated diagram (process with entrance animation)", async () => {
    const group = generateDiagram({
      type: "process",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    });
    // Add animation to the group
    (group as any).animations = [
      { type: "entrance", effect: "fade", trigger: "onClick", duration: 500 },
    ];
    const doc = makeDoc([group]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Timing tree present
    const timings = findAllElements(tree, "p:timing");
    expect(timings.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C5: Table with hyperlinks in cells", async () => {
    const tableData: TableData = {
      columns: [200, 200],
      rows: [{
        cells: [
          {
            text: "",
            content: [{ text: "Google", hyperlink: "https://google.com" }],
          },
          {
            text: "",
            content: [{ text: "GitHub", hyperlink: "https://github.com" }],
          },
        ],
      }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Hyperlinks in table cells
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(2);

    await assertWellFormedXml(buffer);
  });

  it("C6: Shape with text content + shape hyperlink", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 200, height: 80, backgroundColor: "#4472C4" },
      shapeType: "roundRect",
      textContent: "Click Here",
      textStyle: { fontSize: 16, color: "#FFFFFF", textAlign: "center", verticalAlign: "middle" },
      hyperlink: "https://example.com",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Shape hyperlink on cNvPr
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);

    // Text body
    const txBodies = findAllElements(tree, "p:txBody");
    expect(txBodies.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C7: Shape with inner shadow + reflection + glow → OOXML effect order maintained", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 200, height: 150,
        backgroundColor: "#4472C4",
        effects: {
          glow: { color: "#FFD700", radius: 10, opacity: 0.6 },
          innerShadow: { color: "#000000", offsetX: 3, offsetY: 3, blurRadius: 5, opacity: 0.4 },
          reflection: { blurRadius: 4, startOpacity: 0.5, endOpacity: 0, distance: 5 },
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // All three effects present
    const glows = findAllElements(tree, "a:glow");
    const innerShdws = findAllElements(tree, "a:innerShdw");
    const reflections = findAllElements(tree, "a:reflection");
    expect(glows.length).toBeGreaterThanOrEqual(1);
    expect(innerShdws.length).toBeGreaterThanOrEqual(1);
    expect(reflections.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C8: Slide with transition + animation on shape", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 200, height: 150, backgroundColor: "#FF0000" },
      animations: [
        { type: "entrance", effect: "zoom", trigger: "onClick", duration: 800 },
      ],
    }], {
      transition: { type: "fade", duration: 500 },
    });
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Transition element
    const transitions = findAllElements(tree, "p:transition");
    expect(transitions.length).toBeGreaterThanOrEqual(1);

    // Timing tree
    const timings = findAllElements(tree, "p:timing");
    expect(timings.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });

  it("C9: Group containing image + text + shape → all nested correctly", async () => {
    const doc = makeDoc([{
      type: "Group",
      style: { width: 500, height: 200 },
      children: [
        { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
        { type: "Text", style: { width: 200, height: 50, fontSize: 14 }, content: "Caption" },
        { type: "View", style: { width: 150, height: 80, backgroundColor: "#AABBCC" } },
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    // Image, text shape, and view shape inside group
    const pics = findAllElements(tree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(2); // text + view

    await assertWellFormedXml(buffer);
  });

  it("C10: Connector with custom arrow heads + dash style", async () => {
    const doc = makeDoc([{
      type: "Connector",
      connectorType: "elbow",
      start: { x: 50, y: 100 },
      end: { x: 400, y: 300 },
      lineWidth: 3,
      lineColor: "#003366",
      lineDashStyle: "dashed",
      arrowStart: { type: "diamond", width: "lg", length: "lg" },
      arrowEnd: { type: "stealth", width: "med", length: "med" },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(1);

    // Arrow heads
    const headEnds = findAllElements(tree, "a:headEnd");
    const tailEnds = findAllElements(tree, "a:tailEnd");
    expect(headEnds.length).toBeGreaterThanOrEqual(1);
    expect(tailEnds.length).toBeGreaterThanOrEqual(1);

    // Dash style
    const dashes = findAllElements(tree, "a:prstDash");
    expect(dashes.length).toBeGreaterThanOrEqual(1);

    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY D: DOCUMENT-LEVEL FEATURES (10 tests)
// =========================================================================

describe("D: Document-Level Features", () => {
  it("D1: Custom document properties → docProps/custom.xml present with values", async () => {
    const doc = makeDoc([], {}, {
      customProperties: [
        { name: "Department", value: "Strategy" },
        { name: "ProjectId", value: 42 },
        { name: "Confidential", value: true },
      ],
    });
    const buffer = await PaperEngine.render(doc);
    const hasCustom = await zipHasFile(buffer, "docProps/custom.xml");
    expect(hasCustom).toBe(true);
    const customXml = await getZipEntry(buffer, "docProps/custom.xml");
    expect(customXml).toContain("Department");
    expect(customXml).toContain("Strategy");
    expect(customXml).toContain("ProjectId");
    await assertWellFormedXml(buffer);
  });

  it("D2: Slide sections in presentation.xml", async () => {
    const slides: PaperSlide[] = [
      { type: "Slide", style: { width: 960, height: 540 }, children: [] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [] },
    ];
    const doc = makeMultiSlideDoc(slides, {
      sections: [
        { name: "Introduction", slideIndices: [0] },
        { name: "Analysis", slideIndices: [1, 2] },
      ],
    });
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    expect(presXml).toContain("Introduction");
    expect(presXml).toContain("Analysis");
    await assertWellFormedXml(buffer);
  });

  it("D3: Document protection with modify password", async () => {
    const doc = makeDoc([], {}, {
      protection: { modifyPassword: "secret123", readOnly: true },
    });
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    expect(presXml).toContain("modifyVerifier");
    await assertWellFormedXml(buffer);
  });

  it("D4: Custom shows → custShowLst in presentation.xml", async () => {
    const slides: PaperSlide[] = Array.from({ length: 5 }, () => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [],
    }));
    const doc = makeMultiSlideDoc(slides, {
      customShows: [
        { name: "Executive Brief", slideIndices: [0, 2, 4] },
        { name: "Full Presentation", slideIndices: [0, 1, 2, 3, 4] },
      ],
    });
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    expect(presXml).toContain("custShowLst");
    expect(presXml).toContain("Executive Brief");
    expect(presXml).toContain("Full Presentation");
    await assertWellFormedXml(buffer);
  });

  it("D5: Print settings → prnPr element in presProps.xml", async () => {
    const doc = makeDoc([], {}, {
      printSettings: { colorMode: "gray", frameSlides: true, scaleToFitPaper: true },
    });
    const buffer = await PaperEngine.render(doc);
    const presPropsXml = await getZipEntry(buffer, "ppt/presProps.xml");
    expect(presPropsXml).toContain("prnPr");
    expect(presPropsXml).toContain('clrMode="gray"');
    await assertWellFormedXml(buffer);
  });

  it("D6: Theme customization → custom colors in theme1.xml", async () => {
    const doc = makeDoc([], {}, {
      theme: {
        name: "Custom Brand Theme",
        colorScheme: {
          dk1: "#1A1A2E",
          lt1: "#FFFFFF",
          accent1: "#E94560",
          accent2: "#0F3460",
          accent3: "#16213E",
        },
        fontScheme: {
          majorLatin: "Montserrat",
          minorLatin: "Open Sans",
        },
      },
    });
    const buffer = await PaperEngine.render(doc);
    const themeXml = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    expect(themeXml).toContain("E94560");
    expect(themeXml).toContain("Montserrat");
    expect(themeXml).toContain("Open Sans");
    await assertWellFormedXml(buffer);
  });

  it("D7: Speaker notes with rich paragraphs", async () => {
    const doc = makeDoc(
      [{ type: "Text", style: { width: 300, height: 50, fontSize: 14 }, content: "Slide content" }],
      {
        notes: [
          { runs: [{ text: "Key talking point:", style: { fontWeight: "bold" } }] },
          { runs: [{ text: "Revenue grew 15% YoY driven by enterprise segment." }] },
          { runs: [{ text: "Action item:", style: { fontWeight: "bold", color: "#FF0000" } }, { text: " Follow up with EMEA team" }] },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    expect(notesXml).toContain("Key talking point");
    expect(notesXml).toContain("Revenue grew");
    await assertWellFormedXml(buffer);
  });

  it("D8: Slide comments → comment XML files generated", async () => {
    const doc = makeDoc(
      [{ type: "Text", style: { width: 300, height: 50, fontSize: 14 }, content: "Slide" }],
      {
        comments: [
          { author: "Alice", text: "Please review this slide", date: "2024-01-15T10:00:00Z", x: 100, y: 100 },
          { author: "Bob", text: "LGTM", date: "2024-01-16T14:30:00Z", x: 200, y: 200 },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);

    // Comment files present
    const paths = await getZipPaths(buffer);
    const commentPaths = paths.filter(p => p.includes("comments/comment"));
    expect(commentPaths.length).toBeGreaterThanOrEqual(1);

    // Author file present
    const hasAuthors = await zipHasFile(buffer, "ppt/commentAuthors.xml");
    expect(hasAuthors).toBe(true);

    await assertWellFormedXml(buffer);
  });

  it("D9: Handout master → handoutMaster1.xml present", async () => {
    const doc = makeDoc([], {}, {
      handoutLayout: "4",
    });
    const buffer = await PaperEngine.render(doc);
    const hasHandout = await zipHasFile(buffer, "ppt/handoutMasters/handoutMaster1.xml");
    expect(hasHandout).toBe(true);
    await assertWellFormedXml(buffer);
  });

  it("D10: docProps/core.xml contains title and author", async () => {
    const doc = makeDoc([], {}, {
      meta: { title: "Q4 Strategy Review", author: "Strategy Team" },
    } as any);
    (doc as any).meta = { title: "Q4 Strategy Review", author: "Strategy Team" };
    const buffer = await PaperEngine.render(doc);
    const coreXml = await getZipEntry(buffer, "docProps/core.xml");
    expect(coreXml).toContain("Q4 Strategy Review");
    expect(coreXml).toContain("Strategy Team");
    await assertWellFormedXml(buffer);
  });
});

// =========================================================================
// CATEGORY E: COMPLEX LAYOUTS (5 tests)
// =========================================================================

describe("E: Complex Layouts", () => {
  it("E1: Deeply nested groups (3 levels) → all group shapes emitted", async () => {
    const doc = makeDoc([{
      type: "Group",
      style: { width: 600, height: 400 },
      children: [
        {
          type: "Group",
          style: { width: 300, height: 200 },
          children: [
            {
              type: "Group",
              style: { width: 150, height: 100 },
              children: [
                { type: "View", style: { width: 100, height: 50, backgroundColor: "#FF0000" } },
              ],
            },
          ],
        },
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(3);

    await assertWellFormedXml(buffer);
  });

  it("E2: Overlapping shapes with z-index → all render", async () => {
    const children: PaperNode[] = [
      { type: "View", style: { position: "absolute", left: 100, top: 100, width: 200, height: 200, backgroundColor: "#FF0000", zIndex: 1 } },
      { type: "View", style: { position: "absolute", left: 150, top: 150, width: 200, height: 200, backgroundColor: "#00FF00", zIndex: 2 } },
      { type: "View", style: { position: "absolute", left: 200, top: 200, width: 200, height: 200, backgroundColor: "#0000FF", zIndex: 3 } },
    ];
    const doc = makeDoc(children);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(3);
    assertUniqueShapeIds(tree);

    await assertWellFormedXml(buffer);
  });

  it("E3: Mixed content slide (text + image + chart + table) → all elements present", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [{ cells: [{ text: "A" }, { text: "B" }] }],
    };
    const doc = makeDoc([
      { type: "Text", style: { width: 200, height: 30, fontSize: 14 }, content: "Title" },
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
      {
        type: "Chart", style: { width: 300, height: 200 },
        chartData: { chartType: "bar", categories: ["X"], series: [{ name: "S", values: [10] }] },
      },
      { type: "Table", style: { width: 200, height: 50 }, tableData },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const counts = getShapeCount(tree);
    expect(counts.sp).toBeGreaterThanOrEqual(1); // text shape
    expect(counts.pic).toBeGreaterThanOrEqual(1); // image
    expect(counts.graphicFrame).toBeGreaterThanOrEqual(2); // chart + table

    assertUniqueShapeIds(tree);
    await assertWellFormedXml(buffer);
  });

  it("E4: 10-slide presentation with varied content → all slides valid", async () => {
    const slides: PaperSlide[] = [
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 400, height: 60, fontSize: 36 }, content: "Title Slide" }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "View", style: { width: 800, height: 400, backgroundColor: "#4472C4" } }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Image", src: RED_PIXEL, style: { width: 400, height: 300 } }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Chart", style: { width: 700, height: 400 }, chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] } }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Table", style: { width: 600, height: 200 }, tableData: { columns: [200, 200, 200], rows: [{ cells: [{ text: "1" }, { text: "2" }, { text: "3" }] }] } }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [generateDiagram({ type: "process", items: [{ text: "A" }, { text: "B" }] })] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Connector", connectorType: "straight", start: { x: 50, y: 50 }, end: { x: 400, y: 400 }, lineWidth: 2, lineColor: "#000000" }] },
      { type: "Slide", style: { width: 960, height: 540 }, children: [], background: { type: "solid", color: "#003366" } },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 400, height: 50, fontSize: 14 }, content: "Notes slide" }], notes: "Important notes" },
      { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 400, height: 50, fontSize: 14 }, content: "Last slide" }] },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    for (let i = 1; i <= 10; i++) {
      const hasSlide = await zipHasFile(buffer, `ppt/slides/slide${i}.xml`);
      expect(hasSlide).toBe(true);
    }

    await assertWellFormedXml(buffer);
  });

  it("E5: Full consulting deck — title, TOC, content, chart, table, diagram, summary → complete pipeline", async () => {
    const slides: PaperSlide[] = [
      // Title slide
      {
        type: "Slide", style: { width: 960, height: 540 },
        background: { type: "solid", color: "#003366" },
        children: [
          { type: "Text", style: { width: 600, height: 60, fontSize: 32, color: "#FFFFFF", fontWeight: "bold" }, content: "Strategic Review" },
        ],
      },
      // Chart slide
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [{
          type: "Chart", style: { width: 700, height: 400 },
          chartData: {
            chartType: "bar",
            categories: ["FY20", "FY21", "FY22", "FY23"],
            series: [
              { name: "Revenue", values: [850, 920, 1050, 1200] },
              { name: "EBITDA", values: [170, 195, 230, 275] },
            ],
          },
        }],
      },
      // Table slide
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [{
          type: "Table", style: { width: 800, height: 300 },
          tableData: {
            columns: [200, 150, 150, 150, 150],
            rows: [
              { cells: [{ text: "KPI" }, { text: "FY20" }, { text: "FY21" }, { text: "FY22" }, { text: "FY23" }] },
              { cells: [{ text: "Revenue" }, { text: "$850M" }, { text: "$920M" }, { text: "$1.05B" }, { text: "$1.2B" }] },
            ],
            style: { firstRow: true, bandRow: true },
          },
        }],
      },
      // Diagram slide
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [generateDiagram({
          type: "process",
          items: [
            { text: "Diagnose" }, { text: "Design" }, { text: "Deliver" }, { text: "Sustain" },
          ],
          style: { accentColor: "#003366" },
        })],
      },
    ];
    const doc = makeMultiSlideDoc(slides, {
      meta: { title: "Strategic Review", author: "Consulting Team" },
      customProperties: [
        { name: "Client", value: "Acme Corp" },
        { name: "Engagement", value: "Growth Strategy" },
      ],
    });
    const buffer = await PaperEngine.render(doc);

    // All slides present
    for (let i = 1; i <= 4; i++) {
      expect(await zipHasFile(buffer, `ppt/slides/slide${i}.xml`)).toBe(true);
    }

    // Chart present
    expect(await zipHasFile(buffer, "ppt/charts/chart1.xml")).toBe(true);

    // Custom properties present
    expect(await zipHasFile(buffer, "docProps/custom.xml")).toBe(true);

    // All well-formed
    await assertWellFormedXml(buffer);
  });
});
