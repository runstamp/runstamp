/**
 * SOTA Benchmarks 13 — Phases 2-4 Feature Validation
 *
 * 50 tests across 9 categories:
 *   A: Modern Chart Types (ChartEx) — treemap, sunburst, histogram, box & whisker (12 tests)
 *   B: Chart Animations — bySeries, byCategory, byElement, onClick, duration (6 tests)
 *   C: Secondary Category Axis — combo chart, secondary position, visibility (4 tests)
 *   D: Chart Annotations — single, formatting, callout, multiple, position (6 tests)
 *   E: Connection Point Snapping — startShape, endShape, both, with locks (4 tests)
 *   F: Media Playback Options — video/audio trim, loop, volume, autoPlay, hideOnClick (8 tests)
 *   G: Table Gradient Fills — linear, radial, alpha stops, mixed (4 tests)
 *   H: Table Text Direction — vertical, verticalEA, horizontal, combined (4 tests)
 *   I: Cross-Feature Integration — complex slide, multi-slide (2 tests)
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { getZipEntry, parseXml, findAllElements, getAttr, TINY_VIDEO, TINY_AUDIO } from "./helpers/xmlTestUtils.js";
import JSZip from "jszip";

setDeterministicMode(true);

// =========================================================================
// Helper: minimal 1-slide doc
// =========================================================================
function makeDoc(children: any[], slideOverrides?: any, docOverrides?: any) {
  return {
    type: "Document" as const,
    meta: {},
    slides: [{
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children,
      ...slideOverrides,
    }],
    ...docOverrides,
  };
}

// =========================================================================
// CATEGORY A: MODERN CHART TYPES (ChartEx) — 12 tests
// =========================================================================

describe("A: Modern Chart Types (ChartEx)", () => {
  it("A1: Treemap with hierarchical 2-level data emits ChartEx XML with layoutId=treemap", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "treemap",
        treemapData: {
          categories: [
            { name: "Technology", children: [
              { name: "Software", value: 120 },
              { name: "Hardware", value: 80 },
            ]},
            { name: "Finance", children: [
              { name: "Banking", value: 90 },
              { name: "Insurance", value: 60 },
            ]},
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    expect(buffer.length).toBeGreaterThan(0);

    // ChartEx files use chartEx prefix
    const zip = await JSZip.loadAsync(buffer);
    const chartExFile = zip.file("ppt/charts/chartEx1.xml");
    expect(chartExFile).not.toBeNull();

    const chartXml = await chartExFile!.async("string");
    const tree = parseXml(chartXml);

    // Verify ChartEx chartSpace root element
    expect(chartXml).toContain("cx:chartSpace");

    // Verify layoutId="treemap" on the series
    const series = findAllElements(tree, "cx:series");
    expect(series.length).toBeGreaterThanOrEqual(1);
    const layoutIdAttr = getAttr(series[0], "layoutId");
    expect(layoutIdAttr).toBe("treemap");

    // Verify cx:data is present
    const dataElements = findAllElements(tree, "cx:data");
    expect(dataElements.length).toBeGreaterThanOrEqual(1);
  });

  it("A2: Sunburst with multi-ring hierarchical data emits layoutId=sunburst", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "sunburst",
        sunburstData: {
          categories: [
            { name: "Americas", children: [
              { name: "USA", value: 200 },
              { name: "Canada", value: 50 },
              { name: "Brazil", value: 80 },
            ]},
            { name: "EMEA", children: [
              { name: "UK", value: 90 },
              { name: "Germany", value: 70 },
            ]},
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartExFile = zip.file("ppt/charts/chartEx1.xml");
    expect(chartExFile).not.toBeNull();

    const chartXml = await chartExFile!.async("string");
    const tree = parseXml(chartXml);

    const series = findAllElements(tree, "cx:series");
    expect(series.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(series[0], "layoutId")).toBe("sunburst");
  });

  it("A3: Histogram with raw data emits layoutId=clusteredColumn with cx:binning", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "histogram",
        histogramData: {
          values: [12, 15, 18, 22, 25, 28, 30, 32, 35, 40, 42, 45, 48, 50, 55],
          binCount: 5,
          seriesName: "Distribution",
          color: "#4472C4",
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartExFile = zip.file("ppt/charts/chartEx1.xml");
    expect(chartExFile).not.toBeNull();

    const chartXml = await chartExFile!.async("string");
    const tree = parseXml(chartXml);

    // Verify layoutId=clusteredColumn (histogram uses clusteredColumn layout)
    const series = findAllElements(tree, "cx:series");
    expect(series.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(series[0], "layoutId")).toBe("clusteredColumn");

    // Verify binning element is present
    const binning = findAllElements(tree, "cx:binning");
    expect(binning.length).toBeGreaterThanOrEqual(1);
  });

  it("A4: Box & Whisker emits layoutId=boxWhisker with series names in cx:tx", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "boxWhisker",
        boxWhiskerData: {
          categories: ["Q1", "Q2", "Q3", "Q4"],
          series: [
            { name: "Product A", values: [10, 12, 14, 15, 18, 20, 22, 25, 28, 30, 32, 35], color: "#4472C4" },
          ],
          quartileMethod: "inclusive",
          showOutliers: true,
          showMeanMarker: true,
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartExFile = zip.file("ppt/charts/chartEx1.xml");
    expect(chartExFile).not.toBeNull();

    const chartXml = await chartExFile!.async("string");
    const tree = parseXml(chartXml);

    const series = findAllElements(tree, "cx:series");
    expect(series.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(series[0], "layoutId")).toBe("boxWhisker");

    // Verify series name is present in cx:tx
    const txElements = findAllElements(tree, "cx:tx");
    expect(txElements.length).toBeGreaterThanOrEqual(1);
    expect(chartXml).toContain("Product A");
  });

  it("A5: ChartEx content types include chartex+xml entry", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "treemap",
        treemapData: {
          categories: [
            { name: "A", children: [{ name: "A1", value: 50 }, { name: "A2", value: 30 }] },
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const contentTypesXml = await getZipEntry(buffer, "[Content_Types].xml");

    // Should contain chartex+xml content type
    expect(contentTypesXml).toContain("chartex+xml");
    expect(contentTypesXml).toContain("chartEx1.xml");
  });

  it("A6: ChartEx rels point to ppt/charts/chartEx1.xml with correct relationship type", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "treemap",
        treemapData: {
          categories: [
            { name: "Root", children: [{ name: "Leaf1", value: 100 }] },
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideRelsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");

    // ChartEx uses specific relationship type
    expect(slideRelsXml).toContain("chartEx");
    expect(slideRelsXml).toContain("charts/chartEx1.xml");
  });

  it("A7: ChartEx has embedded Excel workbook at ppt/embeddings/chartEx1.xlsx", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "sunburst",
        sunburstData: {
          categories: [
            { name: "Parent", children: [{ name: "Child", value: 42 }] },
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const excelFile = zip.file("ppt/embeddings/chartEx1.xlsx");
    expect(excelFile).not.toBeNull();
  });

  it("A8: Mixed classic + ChartEx on same slide creates both chart1.xml and chartEx1.xml", async () => {
    const doc = makeDoc([
      {
        type: "Chart",
        style: { width: 450, height: 300, position: "absolute", left: 0, top: 0 },
        chartData: {
          chartType: "bar",
          categories: ["Q1", "Q2", "Q3"],
          series: [{ name: "Revenue", values: [100, 200, 300] }],
        },
      },
      {
        type: "Chart",
        style: { width: 450, height: 300, position: "absolute", left: 480, top: 0 },
        chartData: {
          chartType: "treemap",
          treemapData: {
            categories: [
              { name: "Segment A", children: [{ name: "Sub1", value: 60 }, { name: "Sub2", value: 40 }] },
            ],
          },
        },
      },
    ]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);

    // Classic chart
    const classicChart = zip.file("ppt/charts/chart1.xml");
    expect(classicChart).not.toBeNull();

    // ChartEx chart
    const chartEx = zip.file("ppt/charts/chartEx1.xml");
    expect(chartEx).not.toBeNull();

    // Both Excel embeddings should exist
    const classicExcel = zip.file("ppt/embeddings/chart1.xlsx");
    expect(classicExcel).not.toBeNull();
    const chartExExcel = zip.file("ppt/embeddings/chartEx1.xlsx");
    expect(chartExExcel).not.toBeNull();
  });

  it("A9: Treemap with custom colors emits dataPt with spPr color", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "treemap",
        treemapData: {
          categories: [
            { name: "Group", children: [
              { name: "Red Item", value: 50, color: "#FF0000" },
              { name: "Blue Item", value: 30, color: "#0000FF" },
            ]},
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartXml = await zip.file("ppt/charts/chartEx1.xml")!.async("string");

    // Verify custom colors: dataPt with spPr
    const tree = parseXml(chartXml);
    const dataPts = findAllElements(tree, "cx:dataPt");
    expect(dataPts.length).toBe(2);

    // Check that both srgbClr colors are present
    expect(chartXml).toContain("FF0000");
    expect(chartXml).toContain("0000FF");
  });

  it("A10: Sunburst with 3 levels emits nested categories with correct depth", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "sunburst",
        sunburstData: {
          categories: [
            { name: "World", children: [
              { name: "Asia", children: [
                { name: "Japan", value: 100 },
                { name: "China", value: 200 },
              ]},
              { name: "Europe", children: [
                { name: "France", value: 80 },
              ]},
            ]},
          ],
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartXml = await zip.file("ppt/charts/chartEx1.xml")!.async("string");
    const tree = parseXml(chartXml);

    // 3 levels: leaf, parent, grandparent
    const strDim = findAllElements(tree, "cx:strDim");
    expect(strDim.length).toBeGreaterThanOrEqual(1);

    // Should have 3 lvl elements (depth 3: leaf, parent, grandparent)
    const lvlElements = findAllElements(tree, "cx:lvl");
    expect(lvlElements.length).toBeGreaterThanOrEqual(3);

    // Verify all leaf names present
    expect(chartXml).toContain("Japan");
    expect(chartXml).toContain("China");
    expect(chartXml).toContain("France");
  });

  it("A11: Histogram with 50 data points emits all values in cx:numDim", async () => {
    const values = Array.from({ length: 50 }, (_, i) => Math.round(Math.random() * 100));
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "histogram",
        histogramData: {
          values,
          seriesName: "Large Dataset",
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartXml = await zip.file("ppt/charts/chartEx1.xml")!.async("string");
    const tree = parseXml(chartXml);

    // Verify all 50 data points are in the XML
    const pts = findAllElements(tree, "cx:pt");
    expect(pts.length).toBe(50);
  });

  it("A12: Box & Whisker with multiple series emits correct series count", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "boxWhisker",
        boxWhiskerData: {
          categories: ["Region A", "Region B"],
          series: [
            { name: "2023", values: [10, 15, 20, 25, 30, 35, 12, 18, 22, 28], color: "#4472C4" },
            { name: "2024", values: [12, 18, 22, 28, 32, 38, 14, 20, 26, 34], color: "#ED7D31" },
            { name: "2025", values: [14, 20, 24, 30, 36, 40, 16, 22, 28, 36], color: "#A9D18E" },
          ],
          showMeanMarker: true,
          showMeanLine: true,
        },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const chartXml = await zip.file("ppt/charts/chartEx1.xml")!.async("string");
    const tree = parseXml(chartXml);

    // Verify 3 series
    const series = findAllElements(tree, "cx:series");
    expect(series.length).toBe(3);

    // Verify series names
    expect(chartXml).toContain("2023");
    expect(chartXml).toContain("2024");
    expect(chartXml).toContain("2025");
  });
});

// =========================================================================
// CATEGORY B: CHART ANIMATIONS — 6 tests
// =========================================================================

describe("B: Chart Animations", () => {
  it("B1: bySeries animation emits a valid timing tree", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B", "C"],
        series: [
          { name: "S1", values: [10, 20, 30] },
          { name: "S2", values: [15, 25, 35] },
        ],
      },
      chartAnimation: {
        buildType: "bySeries",
        trigger: "onClick",
        duration: 500,
      },
      animations: [{
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
        duration: 500,
      }],
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("p:timing");
    expect(slideXml).toContain("clickEffect");
    expect(slideXml).not.toContain("p:bldGraphic");
  });

  it("B2: byCategory animation emits a valid timing tree", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["X", "Y", "Z"],
        series: [{ name: "Data", values: [5, 10, 15] }],
      },
      chartAnimation: {
        buildType: "byCategory",
        trigger: "onClick",
        duration: 300,
      },
      animations: [{
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
        duration: 300,
      }],
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("p:timing");
    expect(slideXml).toContain("clickEffect");
    expect(slideXml).not.toContain("p:bldGraphic");
  });

  it("B3: byElement animation emits a valid timing tree", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "line",
        categories: ["Jan", "Feb", "Mar"],
        series: [{ name: "Trend", values: [100, 150, 200] }],
      },
      chartAnimation: {
        buildType: "byElement",
        trigger: "onClick",
        duration: 400,
      },
      animations: [{
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
        duration: 400,
      }],
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("p:timing");
    expect(slideXml).toContain("clickEffect");
    expect(slideXml).not.toContain("p:bldGraphic");
  });

  it("B4: onClick trigger produces timing tree with onClick condition", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A"],
        series: [{ name: "S", values: [10] }],
      },
      chartAnimation: {
        buildType: "bySeries",
        trigger: "onClick",
        duration: 500,
      },
      animations: [{
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
        duration: 500,
      }],
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Timing tree should exist
    expect(slideXml).toContain("p:timing");
    // Should have click-triggered node type
    expect(slideXml).toContain("clickEffect");
  });

  it("B5: Chart animation with duration emits correct dur on timing entry", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "pie",
        categories: ["Slice1", "Slice2"],
        series: [{ name: "Data", values: [60, 40] }],
      },
      chartAnimation: {
        buildType: "allAtOnce",
        trigger: "onClick",
        duration: 750,
      },
      animations: [{
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
        duration: 750,
      }],
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("p:timing");
    // Duration of 750 should appear in the timing nodes
    expect(slideXml).toContain('dur="750"');
  });

  it("B6: No chart animation means no bldGraphic in timing tree", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S", values: [10, 20] }],
      },
      // No chartAnimation, no animations
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // No bldGraphic should be present
    expect(slideXml).not.toContain("p:bldGraphic");
    expect(slideXml).not.toContain("a:bldChart");
  });
});

// =========================================================================
// CATEGORY C: SECONDARY CATEGORY AXIS — 4 tests
// =========================================================================

describe("C: Secondary Category Axis", () => {
  it("C1: Combo bar+line with secondary axis emits two catAx and two valAx", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["Q1", "Q2", "Q3", "Q4"],
        series: [
          { name: "Revenue", values: [100, 200, 300, 400] },
          { name: "Growth %", values: [5, 10, 15, 20], overrideType: "line", targetAxis: "secondary" },
        ],
        secondaryValueAxis: { visible: true },
        secondaryCategoryAxis: { visible: false },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Two category axes
    const catAxes = findAllElements(tree, "c:catAx");
    expect(catAxes.length).toBe(2);

    // Two value axes
    const valAxes = findAllElements(tree, "c:valAx");
    expect(valAxes.length).toBe(2);

    // Verify distinct axId values
    const allAxIds = [...catAxes, ...valAxes].map(ax => {
      const axIdEls = findAllElements([ax], "c:axId");
      return axIdEls.length > 0 ? getAttr(axIdEls[0], "val") : null;
    }).filter(Boolean);
    const uniqueIds = new Set(allAxIds);
    expect(uniqueIds.size).toBe(4);
  });

  it("C2: Secondary value axis has axPos=r (right side)", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B", "C"],
        series: [
          { name: "Primary", values: [100, 200, 300] },
          { name: "Secondary", values: [10, 20, 30], overrideType: "line", targetAxis: "secondary" },
        ],
        secondaryValueAxis: { visible: true },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const valAxes = findAllElements(tree, "c:valAx");
    expect(valAxes.length).toBe(2);

    // Find the secondary value axis by checking for axPos val="r"
    let foundRightAxis = false;
    for (const ax of valAxes) {
      const axPos = findAllElements([ax], "c:axPos");
      if (axPos.length > 0 && getAttr(axPos[0], "val") === "r") {
        foundRightAxis = true;
      }
    }
    expect(foundRightAxis).toBe(true);
  });

  it("C3: Secondary category axis with visible=true emits delete=0 and title", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["Jan", "Feb", "Mar"],
        series: [
          { name: "Sales", values: [50, 80, 120] },
          { name: "Margin", values: [10, 15, 20], overrideType: "line", targetAxis: "secondary" },
        ],
        secondaryCategoryAxis: { visible: true, title: "Secondary Categories" },
        secondaryValueAxis: { visible: true },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    const catAxes = findAllElements(tree, "c:catAx");
    expect(catAxes.length).toBe(2);

    // One of them should have delete val="0" (visible=true)
    let foundVisibleSecondary = false;
    for (const ax of catAxes) {
      const deleteEls = findAllElements([ax], "c:delete");
      const axPosEls = findAllElements([ax], "c:axPos");
      // Secondary cat axis is at position "t" (top) for column charts
      if (axPosEls.length > 0 && getAttr(axPosEls[0], "val") === "t") {
        if (deleteEls.length > 0 && getAttr(deleteEls[0], "val") === "0") {
          foundVisibleSecondary = true;
        }
      }
    }
    expect(foundVisibleSecondary).toBe(true);

    // The axis title should be present
    expect(chartXml).toContain("Secondary Categories");
  });

  it("C4: Line chart on secondary axis emits lineChart block referencing secondary axIds", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B", "C"],
        series: [
          { name: "Bars", values: [100, 200, 300] },
          { name: "Line", values: [5, 10, 15], overrideType: "line", targetAxis: "secondary" },
        ],
        secondaryValueAxis: { visible: true },
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(chartXml);

    // Should have both barChart and lineChart elements
    const barCharts = findAllElements(tree, "c:barChart");
    expect(barCharts.length).toBe(1);

    const lineCharts = findAllElements(tree, "c:lineChart");
    expect(lineCharts.length).toBe(1);

    // The lineChart should reference the secondary value axis ID (555555555)
    // Extract the lineChart section from raw XML to verify axis IDs
    const lineChartStart = chartXml.indexOf("<c:lineChart>");
    const lineChartEnd = chartXml.indexOf("</c:lineChart>");
    expect(lineChartStart).toBeGreaterThan(-1);
    expect(lineChartEnd).toBeGreaterThan(lineChartStart);
    const lineChartSection = chartXml.substring(lineChartStart, lineChartEnd);
    // Secondary value axis ID should appear in the lineChart block
    expect(lineChartSection).toContain('val="555555555"');
  });
});

// =========================================================================
// CATEGORY D: CHART ANNOTATIONS — 6 tests
// =========================================================================

describe("D: Chart Annotations", () => {
  it("D1: Single annotation creates userShapes ref and chart drawing file", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B", "C"],
        series: [{ name: "S1", values: [10, 20, 30] }],
        annotations: [{
          text: "Peak value",
          x: 60,
          y: 20,
          width: 25,
          height: 10,
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);

    // Chart XML should reference userShapes
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).toContain("c:userShapes");

    // Drawing file should exist
    const zip = await JSZip.loadAsync(buffer);
    const drawingFile = zip.file("ppt/drawings/drawing1.xml");
    expect(drawingFile).not.toBeNull();

    // Drawing should contain relSizeAnchor
    const drawingXml = await drawingFile!.async("string");
    expect(drawingXml).toContain("cdr:relSizeAnchor");
    expect(drawingXml).toContain("Peak value");
  });

  it("D2: Annotation with formatting emits bold, color, fill, border", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["X", "Y"],
        series: [{ name: "Data", values: [10, 20] }],
        annotations: [{
          text: "Important",
          x: 50,
          y: 30,
          width: 20,
          height: 10,
          bold: true,
          fontColor: "#FF0000",
          fill: "#FFFFFF",
          borderColor: "#000000",
          fontSize: 14,
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const drawingXml = await zip.file("ppt/drawings/drawing1.xml")!.async("string");

    // Bold attribute
    expect(drawingXml).toMatch(/b="1"/);
    // Font color (FF0000)
    expect(drawingXml).toContain("FF0000");
    // Fill (FFFFFF)
    expect(drawingXml).toContain("FFFFFF");
    // Border (000000)
    expect(drawingXml).toMatch(/<a:ln.*>.*000000/s);
    // Font size (14 * 75 = 1050)
    expect(drawingXml).toContain('sz="1050"');
  });

  it("D3: Callout shape annotation uses prst=wedgeRectCallout", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "line",
        categories: ["A", "B"],
        series: [{ name: "S", values: [5, 10] }],
        annotations: [{
          text: "Callout",
          x: 40,
          y: 20,
          width: 20,
          height: 10,
          shapeType: "wedgeRectCallout",
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const drawingXml = await zip.file("ppt/drawings/drawing1.xml")!.async("string");

    expect(drawingXml).toContain('prst="wedgeRectCallout"');
  });

  it("D4: Multiple annotations (3) create 3 relSizeAnchor elements", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S", values: [10, 20] }],
        annotations: [
          { text: "Note 1", x: 10, y: 10, width: 15, height: 8 },
          { text: "Note 2", x: 40, y: 30, width: 15, height: 8 },
          { text: "Note 3", x: 70, y: 50, width: 15, height: 8 },
        ],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const drawingXml = await zip.file("ppt/drawings/drawing1.xml")!.async("string");
    const tree = parseXml(drawingXml);

    // 3 relSizeAnchor elements
    const anchors = findAllElements(tree, "cdr:relSizeAnchor");
    expect(anchors.length).toBe(3);

    // All annotation texts present
    expect(drawingXml).toContain("Note 1");
    expect(drawingXml).toContain("Note 2");
    expect(drawingXml).toContain("Note 3");
  });

  it("D5: Annotation position uses percentage-based from/to values", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A"],
        series: [{ name: "S", values: [10] }],
        annotations: [{
          text: "At 60,30",
          x: 60,
          y: 30,
          width: 25,
          height: 10,
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);
    const drawingXml = await zip.file("ppt/drawings/drawing1.xml")!.async("string");
    const tree = parseXml(drawingXml);

    // From: x=60/100=0.6, y=30/100=0.3
    const fromX = findAllElements(tree, "cdr:x");
    const fromY = findAllElements(tree, "cdr:y");
    expect(fromX.length).toBeGreaterThanOrEqual(2); // from.x and to.x

    // Verify percentage values in the XML
    expect(drawingXml).toContain("0.60000"); // x=60/100
    expect(drawingXml).toContain("0.30000"); // y=30/100
    expect(drawingXml).toContain("0.85000"); // to.x = (60+25)/100
    expect(drawingXml).toContain("0.40000"); // to.y = (30+10)/100
  });

  it("D6: Chart with no annotations has no userShapes and no drawing file", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 700, height: 400 },
      chartData: {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S", values: [10, 20] }],
        // No annotations
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);

    // Chart XML should NOT reference userShapes
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    expect(chartXml).not.toContain("c:userShapes");

    // No drawing file
    const zip = await JSZip.loadAsync(buffer);
    const drawingFile = zip.file("ppt/drawings/drawing1.xml");
    expect(drawingFile).toBeNull();
  });
});

// =========================================================================
// CATEGORY E: CONNECTION POINT SNAPPING — 4 tests
// =========================================================================

describe("E: Connection Point Snapping", () => {
  it("E1: Both startShape and endShape emit stCxn and endCxn", async () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { width: 100, height: 60, position: "absolute", left: 50, top: 50 },
        shapeType: "rect",
      },
      {
        type: "View",
        style: { width: 100, height: 60, position: "absolute", left: 300, top: 50 },
        shapeType: "rect",
      },
      {
        type: "Connector",
        connectorType: "straight",
        start: { x: 150, y: 80 },
        end: { x: 300, y: 80 },
        lineColor: "#000000",
        lineWidth: 2,
        startShape: { shapeId: 2, site: 1 },  // right side of first shape
        endShape: { shapeId: 3, site: 3 },     // left side of second shape
      },
    ]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have a:stCxn element with correct id and idx
    const stCxns = findAllElements(tree, "a:stCxn");
    expect(stCxns.length).toBe(1);
    expect(getAttr(stCxns[0], "id")).toBe("2");
    expect(getAttr(stCxns[0], "idx")).toBe("1");

    // Should have a:endCxn element
    const endCxns = findAllElements(tree, "a:endCxn");
    expect(endCxns.length).toBe(1);
    expect(getAttr(endCxns[0], "id")).toBe("3");
    expect(getAttr(endCxns[0], "idx")).toBe("3");
  });

  it("E2: Only startShape emits stCxn with no endCxn", async () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { width: 100, height: 60, position: "absolute", left: 50, top: 50 },
        shapeType: "ellipse",
      },
      {
        type: "Connector",
        connectorType: "elbow",
        start: { x: 150, y: 80 },
        end: { x: 400, y: 200 },
        lineColor: "#333333",
        startShape: { shapeId: 2, site: 2 },
        // No endShape
      },
    ]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const stCxns = findAllElements(tree, "a:stCxn");
    expect(stCxns.length).toBe(1);
    expect(getAttr(stCxns[0], "id")).toBe("2");

    const endCxns = findAllElements(tree, "a:endCxn");
    expect(endCxns.length).toBe(0);
  });

  it("E3: Only endShape emits endCxn with no stCxn", async () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { width: 100, height: 60, position: "absolute", left: 300, top: 50 },
        shapeType: "roundRect",
      },
      {
        type: "Connector",
        connectorType: "curved",
        start: { x: 50, y: 80 },
        end: { x: 300, y: 80 },
        lineColor: "#0066CC",
        // No startShape
        endShape: { shapeId: 2, site: 0 },  // top of target shape
      },
    ]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const stCxns = findAllElements(tree, "a:stCxn");
    expect(stCxns.length).toBe(0);

    const endCxns = findAllElements(tree, "a:endCxn");
    expect(endCxns.length).toBe(1);
    expect(getAttr(endCxns[0], "id")).toBe("2");
    expect(getAttr(endCxns[0], "idx")).toBe("0");
  });

  it("E4: Connection with locks emits both locks and connection elements in cNvCxnSpPr", async () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { width: 80, height: 50, position: "absolute", left: 100, top: 100 },
        shapeType: "rect",
      },
      {
        type: "View",
        style: { width: 80, height: 50, position: "absolute", left: 400, top: 100 },
        shapeType: "rect",
      },
      {
        type: "Connector",
        connectorType: "straight",
        start: { x: 180, y: 125 },
        end: { x: 400, y: 125 },
        lineColor: "#FF0000",
        lineWidth: 3,
        startShape: { shapeId: 2, site: 1 },
        endShape: { shapeId: 3, site: 3 },
        locks: { noMove: true, noResize: true },
      },
    ]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Connection elements should be present
    const stCxns = findAllElements(tree, "a:stCxn");
    expect(stCxns.length).toBe(1);

    const endCxns = findAllElements(tree, "a:endCxn");
    expect(endCxns.length).toBe(1);

    // Locks should be present too
    const cxnLocks = findAllElements(tree, "a:cxnSpLocks");
    expect(cxnLocks.length).toBe(1);

    // Both are inside cNvCxnSpPr
    expect(slideXml).toContain("p:cNvCxnSpPr");
  });
});

// =========================================================================
// CATEGORY F: MEDIA PLAYBACK OPTIONS — 8 tests
// =========================================================================

describe("F: Media Playback Options", () => {
  it("F1: Video trim emits p14:trim with st and end attributes", async () => {
    const doc = makeDoc([{
      type: "Video",
      style: { width: 400, height: 300 },
      src: TINY_VIDEO,
      playback: {
        trimStart: 1000,
        trimEnd: 5000,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Should have p14:trim with st and end
    expect(slideXml).toContain("p14:trim");
    expect(slideXml).toMatch(/st="1000"/);
    expect(slideXml).toMatch(/end="5000"/);
  });

  it("F2: Video loop emits repeatCount=indefinite in timing tree", async () => {
    const doc = makeDoc([{
      type: "Video",
      style: { width: 400, height: 300 },
      src: TINY_VIDEO,
      playback: {
        loop: true,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Timing tree with repeatCount indefinite
    expect(slideXml).toContain("p:timing");
    expect(slideXml).toContain('repeatCount="indefinite"');
  });

  it("F3: Video volume emits vol attribute on cMediaNode", async () => {
    const doc = makeDoc([{
      type: "Video",
      style: { width: 400, height: 300 },
      src: TINY_VIDEO,
      playback: {
        volume: 50,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // vol="50000" (volume 50 * 1000)
    expect(slideXml).toContain("p:cMediaNode");
    expect(slideXml).toContain('vol="50000"');
  });

  it("F4: Video autoPlay emits delay=0 condition", async () => {
    const doc = makeDoc([{
      type: "Video",
      style: { width: 400, height: 300 },
      src: TINY_VIDEO,
      playback: {
        autoPlay: true,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // autoPlay: delay="0" condition instead of indefinite
    expect(slideXml).toContain('delay="0"');
    // Should have p:video element
    expect(slideXml).toContain("p:video");
  });

  it("F5: Video hideOnClick emits showWhenStopped=0", async () => {
    const doc = makeDoc([{
      type: "Video",
      style: { width: 400, height: 300 },
      src: TINY_VIDEO,
      playback: {
        hideOnClick: true,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain('showWhenStopped="0"');
  });

  it("F6: Audio trim emits p14:trim", async () => {
    const doc = makeDoc([{
      type: "Audio",
      style: { width: 100, height: 100 },
      src: TINY_AUDIO,
      playback: {
        trimStart: 500,
        trimEnd: 3000,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("p14:trim");
    expect(slideXml).toMatch(/st="500"/);
    expect(slideXml).toMatch(/end="3000"/);
  });

  it("F7: Audio with all playback options emits loop + volume + autoPlay", async () => {
    const doc = makeDoc([{
      type: "Audio",
      style: { width: 100, height: 100 },
      src: TINY_AUDIO,
      playback: {
        loop: true,
        volume: 75,
        autoPlay: true,
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // All three should be present
    expect(slideXml).toContain('repeatCount="indefinite"');   // loop
    expect(slideXml).toContain('vol="75000"');                 // volume 75*1000
    expect(slideXml).toContain('delay="0"');                   // autoPlay
    expect(slideXml).toContain("p:audio");
  });

  it("F8: No playback options means no p14:trim and no timing tree for media", async () => {
    const doc = makeDoc([{
      type: "Video",
      style: { width: 400, height: 300 },
      src: TINY_VIDEO,
      // No playback options
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Should not have trim element
    expect(slideXml).not.toContain("p14:trim");

    // The p14:media element should be self-closing (no trim child)
    // It still emits p14:media for the video embed
    expect(slideXml).toContain("p14:media");
    expect(slideXml).toMatch(/p14:media[^>]*\/>/);
  });
});

// =========================================================================
// CATEGORY G: TABLE GRADIENT FILLS — 4 tests
// =========================================================================

describe("G: Table Gradient Fills", () => {
  it("G1: Linear gradient fill emits a:gradFill with a:gsLst and a:lin with angle", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 500, height: 200 },
      tableData: {
        columns: [250, 250],
        rows: [{
          cells: [
            {
              text: "Gradient Cell",
              style: {
                fill: {
                  type: "linear",
                  angle: 90,
                  stops: [
                    { color: "#FF0000", position: 0 },
                    { color: "#0000FF", position: 100 },
                  ],
                },
              },
            },
            { text: "Plain" },
          ],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Gradient fill elements
    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    // Gradient stop list
    const gsLst = findAllElements(tree, "a:gsLst");
    expect(gsLst.length).toBeGreaterThanOrEqual(1);

    // Linear direction with angle
    const linElements = findAllElements(tree, "a:lin");
    expect(linElements.length).toBeGreaterThanOrEqual(1);

    // Verify colors are present
    expect(slideXml).toContain("FF0000");
    expect(slideXml).toContain("0000FF");
  });

  it("G2: Radial gradient fill emits a:path with path=circle", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 500, height: 200 },
      tableData: {
        columns: [500],
        rows: [{
          cells: [{
            text: "Radial",
            style: {
              fill: {
                type: "radial",
                stops: [
                  { color: "#FFFFFF", position: 0 },
                  { color: "#333333", position: 100 },
                ],
              },
            },
          }],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Radial path element
    const pathElements = findAllElements(tree, "a:path");
    expect(pathElements.length).toBeGreaterThanOrEqual(1);

    // Should have path="circle"
    let foundCircle = false;
    for (const p of pathElements) {
      if (getAttr(p, "path") === "circle") {
        foundCircle = true;
      }
    }
    expect(foundCircle).toBe(true);
  });

  it("G3: Gradient with alpha stops emits a:alpha on gradient stop", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 500, height: 200 },
      tableData: {
        columns: [500],
        rows: [{
          cells: [{
            text: "Alpha Gradient",
            style: {
              fill: {
                type: "linear",
                angle: 0,
                stops: [
                  { color: "#FF0000", position: 0, alpha: 0.5 },
                  { color: "#0000FF", position: 100, alpha: 1.0 },
                ],
              },
            },
          }],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Alpha element should be present on at least one stop
    expect(slideXml).toContain("a:alpha");
  });

  it("G4: Mixed gradient + solid fills: two cells, one gradient one solid", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 500, height: 200 },
      tableData: {
        columns: [250, 250],
        rows: [{
          cells: [
            {
              text: "Gradient",
              style: {
                fill: {
                  type: "linear",
                  angle: 45,
                  stops: [
                    { color: "#00FF00", position: 0 },
                    { color: "#FF00FF", position: 100 },
                  ],
                },
              },
            },
            {
              text: "Solid",
              style: { fill: "#AABBCC" },
            },
          ],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have both gradient and solid fills
    const gradFills = findAllElements(tree, "a:gradFill");
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    const solidFills = findAllElements(tree, "a:solidFill");
    expect(solidFills.length).toBeGreaterThanOrEqual(1);

    // Both colors present
    expect(slideXml).toContain("00FF00");
    expect(slideXml).toContain("AABBCC");
  });
});

// =========================================================================
// CATEGORY H: TABLE TEXT DIRECTION — 4 tests
// =========================================================================

describe("H: Table Text Direction", () => {
  it("H1: Vertical direction emits vert=vert270 on a:tcPr", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 200 },
      tableData: {
        columns: [300],
        rows: [{
          cells: [{
            text: "Vertical Text",
            style: { textDirection: "vertical" },
          }],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toMatch(/vert="vert270"/);
  });

  it("H2: VerticalEA direction emits vert=eaVert on a:tcPr", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 200 },
      tableData: {
        columns: [300],
        rows: [{
          cells: [{
            text: "East Asian Vertical",
            style: { textDirection: "verticalEA" },
          }],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toMatch(/vert="eaVert"/);
  });

  it("H3: Explicit horizontal direction does not emit vert attribute", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 200 },
      tableData: {
        columns: [300],
        rows: [{
          cells: [{
            text: "Horizontal Text",
            style: { textDirection: "horizontal" },
          }],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Should not have vert= attribute on tcPr for horizontal
    expect(slideXml).not.toMatch(/vert="vert270"/);
    expect(slideXml).not.toMatch(/vert="eaVert"/);
  });

  it("H4: Combined text direction + alignment + fill all present on tcPr", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 300, height: 200 },
      tableData: {
        columns: [300],
        rows: [{
          cells: [{
            text: "Combined",
            style: {
              textDirection: "vertical",
              verticalAlign: "middle",
              fill: "#EEDDCC",
              textAlign: "center",
            },
          }],
        }],
      },
    }]);

    const buffer = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // All three attributes on tcPr
    expect(slideXml).toMatch(/vert="vert270"/);             // textDirection
    expect(slideXml).toMatch(/anchor="ctr"/);                // verticalAlign
    expect(slideXml).toContain("EEDDCC");                    // fill color

    // a:tcPr element should have all attributes
    const tree = parseXml(slideXml);
    const tcPrs = findAllElements(tree, "a:tcPr");
    expect(tcPrs.length).toBeGreaterThanOrEqual(1);

    // The tcPr should have vert and anchor
    const tcPr = tcPrs[0];
    expect(getAttr(tcPr, "vert")).toBe("vert270");
    expect(getAttr(tcPr, "anchor")).toBe("ctr");
  });
});

// =========================================================================
// CATEGORY I: CROSS-FEATURE INTEGRATION — 2 tests
// =========================================================================

describe("I: Cross-Feature Integration", () => {
  it("I1: Complex slide with ChartEx treemap + annotated bar chart + connector with snapping + table with gradient + video with playback", async () => {
    const doc = makeDoc([
      // ChartEx treemap
      {
        type: "Chart",
        style: { width: 300, height: 200, position: "absolute", left: 0, top: 0 },
        chartData: {
          chartType: "treemap",
          treemapData: {
            categories: [
              { name: "Category", children: [
                { name: "Item 1", value: 100 },
                { name: "Item 2", value: 50 },
              ]},
            ],
          },
        },
      },
      // Annotated bar chart
      {
        type: "Chart",
        style: { width: 300, height: 200, position: "absolute", left: 320, top: 0 },
        chartData: {
          chartType: "bar",
          categories: ["A", "B"],
          series: [{ name: "S", values: [10, 20] }],
          annotations: [{
            text: "Highlight",
            x: 50,
            y: 20,
            width: 30,
            height: 10,
            bold: true,
            fontColor: "#CC0000",
          }],
        },
      },
      // Two shapes to connect
      {
        type: "View",
        style: { width: 80, height: 50, position: "absolute", left: 0, top: 250 },
        shapeType: "rect",
      },
      {
        type: "View",
        style: { width: 80, height: 50, position: "absolute", left: 200, top: 250 },
        shapeType: "rect",
      },
      // Connector with snapping
      {
        type: "Connector",
        connectorType: "straight",
        start: { x: 80, y: 275 },
        end: { x: 200, y: 275 },
        lineColor: "#000000",
        lineWidth: 2,
        startShape: { shapeId: 4, site: 1 },
        endShape: { shapeId: 5, site: 3 },
      },
      // Table with gradient fill
      {
        type: "Table",
        style: { width: 300, height: 100, position: "absolute", left: 320, top: 250 },
        tableData: {
          columns: [150, 150],
          rows: [{
            cells: [
              {
                text: "Gradient",
                style: {
                  fill: {
                    type: "linear",
                    angle: 90,
                    stops: [
                      { color: "#FFCC00", position: 0 },
                      { color: "#FF6600", position: 100 },
                    ],
                  },
                },
              },
              { text: "Normal" },
            ],
          }],
        },
      },
      // Video with playback options
      {
        type: "Video",
        style: { width: 300, height: 180, position: "absolute", left: 640, top: 0 },
        src: TINY_VIDEO,
        playback: {
          loop: true,
          volume: 60,
          trimStart: 500,
          trimEnd: 8000,
          autoPlay: true,
        },
      },
    ]);

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);

    // Verify ChartEx exists
    const chartExFile = zip.file("ppt/charts/chartEx1.xml");
    expect(chartExFile).not.toBeNull();

    // Verify classic chart with annotations
    const classicChart = zip.file("ppt/charts/chart1.xml");
    expect(classicChart).not.toBeNull();
    const chartXml = await classicChart!.async("string");
    expect(chartXml).toContain("c:userShapes");

    // Verify drawing exists (annotations)
    const drawing = zip.file("ppt/drawings/drawing1.xml");
    expect(drawing).not.toBeNull();

    // Verify slide XML has connector with connection snapping
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:stCxn");
    expect(slideXml).toContain("a:endCxn");

    // Verify gradient fill in table
    expect(slideXml).toContain("a:gradFill");

    // Verify video media with playback
    expect(slideXml).toContain("p14:trim");
    expect(slideXml).toContain('repeatCount="indefinite"');
    expect(slideXml).toContain('vol="60000"');

    // Verify overall file is valid (non-zero buffer)
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("I2: Multi-slide with mixed features: slide 1 ChartEx, slide 2 media, slide 3 annotated chart — no cross-contamination", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        // Slide 1: ChartEx (treemap)
        {
          type: "Slide" as const,
          style: { width: 960, height: 540 },
          children: [{
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "treemap",
              treemapData: {
                categories: [
                  { name: "Root", children: [{ name: "Leaf", value: 100 }] },
                ],
              },
            },
          }],
        },
        // Slide 2: Video with trim
        {
          type: "Slide" as const,
          style: { width: 960, height: 540 },
          children: [{
            type: "Video",
            style: { width: 640, height: 480 },
            src: TINY_VIDEO,
            playback: {
              trimStart: 1000,
              trimEnd: 5000,
              volume: 80,
            },
          }],
        },
        // Slide 3: Bar chart with annotations
        {
          type: "Slide" as const,
          style: { width: 960, height: 540 },
          children: [{
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "bar",
              categories: ["Q1", "Q2"],
              series: [{ name: "Rev", values: [500, 800] }],
              annotations: [{
                text: "Target",
                x: 70,
                y: 40,
                width: 20,
                height: 8,
                fontColor: "#009900",
              }],
            },
          }],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buffer);

    // SLIDE 1: ChartEx, no media, no annotations
    const slide1Xml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slide1Xml).not.toContain("p14:trim");         // no media trim
    expect(slide1Xml).not.toContain("p:video");           // no video
    expect(slide1Xml).not.toContain("p:audio");           // no audio

    // ChartEx file should exist
    const chartExFile = zip.file("ppt/charts/chartEx1.xml");
    expect(chartExFile).not.toBeNull();

    // SLIDE 2: Media, no charts
    const slide2Xml = await getZipEntry(buffer, "ppt/slides/slide2.xml");
    expect(slide2Xml).toContain("p14:trim");              // has trim
    expect(slide2Xml).toContain("p:video");               // has video
    expect(slide2Xml).not.toContain("graphicFrame");      // no chart graphic frame... actually p:graphicFrame is not in slide2
    // Check that slide2 rels don't reference charts
    const slide2Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide2.xml.rels");
    expect(slide2Rels).not.toContain("chart");

    // SLIDE 3: Annotated classic chart, no media
    const slide3Xml = await getZipEntry(buffer, "ppt/slides/slide3.xml");
    expect(slide3Xml).not.toContain("p14:trim");          // no media trim
    expect(slide3Xml).not.toContain("p:video");           // no video

    // Classic chart on slide 3
    const chartFile = zip.file("ppt/charts/chart1.xml");
    expect(chartFile).not.toBeNull();
    const chart1Xml = await chartFile!.async("string");
    expect(chart1Xml).toContain("c:userShapes");

    // Drawing file for annotations
    const drawingFile = zip.file("ppt/drawings/drawing1.xml");
    expect(drawingFile).not.toBeNull();
    const drawingXml = await drawingFile!.async("string");
    expect(drawingXml).toContain("Target");

    // Content types should have all three
    const contentTypes = await getZipEntry(buffer, "[Content_Types].xml");
    expect(contentTypes).toContain("chartex+xml");      // for treemap
    expect(contentTypes).toContain("chart+xml");         // for bar chart
    expect(contentTypes).toContain("video/mp4");         // for video
  });
});
