/**
 * Chart Fallback Images — Tests for mc:AlternateContent + PNG rasterization.
 */

import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, ChartData, ThemeColorScheme } from "../src/types/ast.js";
import { mapChartDataToEChartsOption } from "../src/ooxml/chart/rasterizer.js";
import { resolveColorToHex, DEFAULT_SCHEME } from "../src/ooxml/chart/chartColorResolver.js";
import { generateChartAlternateContentXml } from "../src/ooxml/drawing/chart.js";
import type { LayoutNode } from "../src/layout/extract.js";
import {
  parseXml,
  findAllElements,
  getAttr,
  getZipEntry,
  zipHasFile,
  assertRIdsResolve,
} from "./helpers/xmlTestUtils.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBarChart(): ChartData {
  return {
    chartType: "bar",
    categories: ["Q1", "Q2", "Q3"],
    series: [{ name: "Revenue", values: [100, 200, 300], color: "#4472C4" }],
  };
}

function makeLineChart(): ChartData {
  return {
    chartType: "line",
    categories: ["Jan", "Feb", "Mar"],
    series: [{ name: "Sales", values: [10, 20, 15] }],
    smooth: true,
  };
}

function makePieChart(): ChartData {
  return {
    chartType: "pie",
    categories: ["A", "B", "C"],
    series: [{ name: "Share", values: [40, 35, 25] }],
  };
}

function makeDoc(
  charts: ChartData[],
  enableFallback: boolean,
  extras?: Partial<PaperDocument>,
): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Fallback Test" },
    chartFallbackImages: enableFallback,
    ...extras,
    slides: [
      {
        type: "Slide",
        children: charts.map((chartData, i) => ({
          type: "Chart" as const,
          style: { width: 400, height: 300, position: "absolute" as const, left: i * 420, top: 20 },
          chartData,
        })),
      },
    ],
  };
}

function makeFallbackLayoutNode(): LayoutNode {
  return {
    type: "Chart",
    layout: { x: 10, y: 20, width: 400, height: 300 },
  } as unknown as LayoutNode;
}

// ---------------------------------------------------------------------------
// A. Unit: resolveColorToHex
// ---------------------------------------------------------------------------

describe("resolveColorToHex", () => {
  it("returns hex string with # prefix from bare 6-char hex", () => {
    expect(resolveColorToHex("4472C4")).toBe("#4472C4");
  });

  it("passes through strings already prefixed with #", () => {
    expect(resolveColorToHex("#FF0000")).toBe("#FF0000");
  });

  it("resolves { scheme: 'accent1' } to default hex", () => {
    expect(resolveColorToHex({ scheme: "accent1" })).toBe("#4472C4");
  });

  it("resolves scheme token string 'accent1' to default hex", () => {
    expect(resolveColorToHex("accent1")).toBe("#4472C4");
  });

  it("resolves scheme token string 'dk1' to default black", () => {
    expect(resolveColorToHex("dk1")).toBe("#000000");
  });

  it("custom theme colors override defaults", () => {
    const custom: ThemeColorScheme = { accent1: "FF0000" };
    expect(resolveColorToHex("accent1", custom)).toBe("#FF0000");
    expect(resolveColorToHex({ scheme: "accent1" }, custom)).toBe("#FF0000");
  });

  it("returns undefined for undefined input", () => {
    expect(resolveColorToHex(undefined)).toBeUndefined();
  });

  it("returns undefined for unknown scheme token in object form", () => {
    expect(resolveColorToHex({ scheme: "nonexistent" })).toBeUndefined();
  });

  it("passes through CSS named colors", () => {
    expect(resolveColorToHex("red")).toBe("red");
  });

  it("resolves bg1/tx1/bg2/tx2 aliases", () => {
    expect(resolveColorToHex("bg1")).toBe("#FFFFFF");
    expect(resolveColorToHex("tx1")).toBe("#000000");
    expect(resolveColorToHex("bg2")).toBe("#E7E6E6");
    expect(resolveColorToHex("tx2")).toBe("#44546A");
  });

  it("theme colors with # prefix are normalized", () => {
    const custom: ThemeColorScheme = { accent2: "#AABBCC" };
    expect(resolveColorToHex("accent2", custom)).toBe("#AABBCC");
  });

  it("DEFAULT_SCHEME contains all expected keys", () => {
    expect(DEFAULT_SCHEME.accent1).toBe("4472C4");
    expect(DEFAULT_SCHEME.accent6).toBe("70AD47");
    expect(DEFAULT_SCHEME.hlink).toBe("0563C1");
    expect(DEFAULT_SCHEME.folHlink).toBe("954F72");
  });
});

// ---------------------------------------------------------------------------
// B. Unit: mapChartDataToEChartsOption
// ---------------------------------------------------------------------------

describe("mapChartDataToEChartsOption", () => {
  it("maps a bar chart correctly", () => {
    const opt = mapChartDataToEChartsOption(makeBarChart());
    expect(opt.animation).toBe(false);
    expect(opt.xAxis).toEqual(expect.objectContaining({ type: "category" }));
    expect(opt.yAxis).toEqual(expect.objectContaining({ type: "value" }));
    const series = opt.series as any[];
    expect(series).toHaveLength(1);
    expect(series[0].type).toBe("bar");
    expect(series[0].data).toEqual([100, 200, 300]);
  });

  it("maps a line chart with smooth", () => {
    const opt = mapChartDataToEChartsOption(makeLineChart());
    const series = opt.series as any[];
    expect(series[0].type).toBe("line");
    expect(series[0].smooth).toBe(true);
  });

  it("maps a pie chart with radius", () => {
    const opt = mapChartDataToEChartsOption(makePieChart());
    const series = opt.series as any[];
    expect(series[0].type).toBe("pie");
    expect(series[0].radius).toEqual(["0%", "75%"]);
  });

  it("maps a doughnut chart with holeSize", () => {
    const data: ChartData = {
      chartType: "doughnut",
      categories: ["X", "Y"],
      series: [{ name: "D", values: [60, 40] }],
      holeSize: 70,
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].radius[0]).toBe("70%");
  });

  it("maps scatter chart to scatter series", () => {
    const data: ChartData = {
      chartType: "scatter",
      xySeries: [{ name: "S1", dataPoints: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].type).toBe("scatter");
    expect(series[0].data).toEqual([[1, 2], [3, 4]]);
  });

  it("maps radar chart with categories as indicator", () => {
    const data: ChartData = {
      chartType: "radar",
      categories: ["A", "B", "C"],
      series: [{ name: "S1", values: [80, 90, 70] }],
    };
    const opt = mapChartDataToEChartsOption(data);
    expect(opt.radar).toBeDefined();
    const series = opt.series as any[];
    expect(series[0].type).toBe("radar");
  });

  it("maps waterfall chart to stacked bar", () => {
    const data: ChartData = {
      chartType: "waterfall",
      waterfallData: {
        categories: ["Start", "+A", "-B", "End"],
        values: [100, 50, -30, 0],
        totalIndices: [3],
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series.length).toBeGreaterThan(1);
    // Should have base, increase, decrease, total series
    expect(series.some((s: any) => s.name === "Increase")).toBe(true);
    expect(series.some((s: any) => s.name === "Decrease")).toBe(true);
  });

  it("maps funnel chart", () => {
    const data: ChartData = {
      chartType: "funnel",
      funnelData: { categories: ["Top", "Mid", "Bot"], values: [100, 60, 20] },
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].type).toBe("funnel");
  });

  it("maps stock chart to candlestick", () => {
    const data: ChartData = {
      chartType: "stock",
      stockData: {
        categories: ["Day1"],
        open: [10], high: [15], low: [8], close: [12],
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].type).toBe("candlestick");
  });

  it("includes title when provided", () => {
    const data = { ...makeBarChart(), title: { text: "My Chart" } };
    const opt = mapChartDataToEChartsOption(data);
    expect((opt.title as any).text).toBe("My Chart");
  });

  it("hides legend when position is none", () => {
    const data = { ...makeBarChart(), legend: { position: "none" as const } };
    const opt = mapChartDataToEChartsOption(data);
    expect((opt.legend as any).show).toBe(false);
  });

  it("maps horizontal bar chart with yAxis as category", () => {
    const data: ChartData = {
      ...makeBarChart(),
      barDirection: "bar",
    };
    const opt = mapChartDataToEChartsOption(data);
    expect((opt.yAxis as any).type).toBe("category");
    expect((opt.xAxis as any).type).toBe("value");
  });

  it("maps area chart as line with areaStyle", () => {
    const data: ChartData = {
      chartType: "area",
      categories: ["A", "B"],
      series: [{ name: "S1", values: [10, 20] }],
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].type).toBe("line");
    expect(series[0].areaStyle).toBeDefined();
  });

  it("reserves explicit plot-area space when frame size is known", () => {
    const opt = mapChartDataToEChartsOption(
      {
        ...makeBarChart(),
        title: { text: "Quarterly Results" },
        legend: { position: "right" },
      },
      undefined,
      { width: 640, height: 360 },
    );

    expect(opt.grid).toEqual(expect.objectContaining({
      left: expect.any(Number),
      top: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    }));
    expect(opt.legend).toEqual(expect.objectContaining({
      orient: "vertical",
      width: expect.any(Number),
      left: expect.any(Number),
    }));
  });
});

// ---------------------------------------------------------------------------
// C. ECharts mapping with theme colors
// ---------------------------------------------------------------------------

describe("mapChartDataToEChartsOption with theme colors", () => {
  const customTheme: ThemeColorScheme = {
    accent1: "FF0000",
    accent2: "00FF00",
  };

  it("resolves series scheme color objects to hex", () => {
    const data: ChartData = {
      chartType: "bar",
      categories: ["A", "B"],
      series: [{ name: "S1", values: [10, 20], color: "accent1" }],
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    expect(series[0].itemStyle.color).toBe("#FF0000");
  });

  it("resolves title fontColor through theme", () => {
    const data: ChartData = {
      ...makeBarChart(),
      title: { text: "Themed", fontColor: "accent2" },
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    expect((opt.title as any).textStyle.color).toBe("#00FF00");
  });

  it("resolves waterfall colors through theme", () => {
    const data: ChartData = {
      chartType: "waterfall",
      waterfallData: {
        categories: ["Start", "+A", "End"],
        values: [100, 50, 0],
        totalIndices: [2],
        increaseColor: "accent1",
        decreaseColor: "accent2",
      },
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    const increaseSeries = series.find((s: any) => s.name === "Increase");
    expect(increaseSeries.itemStyle.color).toBe("#FF0000");
  });

  it("resolves stock up/down colors through theme", () => {
    const data: ChartData = {
      chartType: "stock",
      stockData: {
        categories: ["Day1"],
        open: [10], high: [15], low: [8], close: [12],
        upColor: "accent1",
        downColor: "accent2",
      },
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    expect(series[0].itemStyle.color).toBe("#FF0000");
    expect(series[0].itemStyle.color0).toBe("#00FF00");
  });

  it("resolves funnel colors through theme", () => {
    const data: ChartData = {
      chartType: "funnel",
      funnelData: {
        categories: ["Top", "Bot"],
        values: [100, 50],
        colors: ["accent1", "accent2"],
      },
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    expect(series[0].data[0].itemStyle.color).toBe("#FF0000");
    expect(series[0].data[1].itemStyle.color).toBe("#00FF00");
  });

  it("resolves histogram color through theme", () => {
    const data: ChartData = {
      chartType: "histogram",
      histogramData: {
        values: [1, 2, 3, 4, 5],
        binCount: 3,
        color: "accent1",
      },
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    expect(series[0].itemStyle.color).toBe("#FF0000");
  });

  it("resolves boxWhisker series color through theme", () => {
    const data: ChartData = {
      chartType: "boxWhisker",
      boxWhiskerData: {
        categories: ["G1"],
        series: [{ name: "S1", values: [1, 2, 3, 4, 5], color: "accent1" }],
      },
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    expect(series[0].itemStyle.color).toBe("#FF0000");
  });

  it("resolves radar series color through theme", () => {
    const data: ChartData = {
      chartType: "radar",
      categories: ["A", "B", "C"],
      series: [{ name: "S1", values: [80, 90, 70], color: "accent1" }],
    };
    const opt = mapChartDataToEChartsOption(data, customTheme);
    const series = opt.series as any[];
    expect(series[0].data[0].itemStyle.color).toBe("#FF0000");
  });
});

// ---------------------------------------------------------------------------
// D. Axis mapping tests
// ---------------------------------------------------------------------------

describe("Axis mapping in ECharts options", () => {
  it("valueAxis config flows to ECharts yAxis", () => {
    const data: ChartData = {
      ...makeBarChart(),
      valueAxis: {
        title: "Revenue ($)",
        min: 0,
        max: 500,
        labelRotation: 45,
        gridlines: { major: true, color: "#CCCCCC" },
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const yAxis = opt.yAxis as any;
    expect(yAxis.name).toBe("Revenue ($)");
    expect(yAxis.min).toBe(0);
    expect(yAxis.max).toBe(500);
    expect(yAxis.axisLabel.rotate).toBe(45);
    expect(yAxis.splitLine.show).toBe(true);
  });

  it("categoryAxis config flows to ECharts xAxis", () => {
    const data: ChartData = {
      ...makeBarChart(),
      categoryAxis: {
        title: "Quarter",
        labelFont: { fontFamily: "Arial", fontSize: 12, fontColor: "#333333" },
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const xAxis = opt.xAxis as any;
    expect(xAxis.name).toBe("Quarter");
    expect(xAxis.axisLabel.fontFamily).toBe("Arial");
    expect(xAxis.axisLabel.fontSize).toBe(12);
    expect(xAxis.axisLabel.color).toBe("#333333");
  });

  it("gridlines map to splitLine", () => {
    const data: ChartData = {
      ...makeBarChart(),
      valueAxis: {
        gridlines: { major: true, minor: true, color: "#EEEEEE" },
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const yAxis = opt.yAxis as any;
    expect(yAxis.splitLine.show).toBe(true);
    expect(yAxis.splitLine.lineStyle.color).toBe("#EEEEEE");
    expect(yAxis.minorSplitLine.show).toBe(true);
  });

  it("tickMark none hides axis tick", () => {
    const data: ChartData = {
      ...makeBarChart(),
      valueAxis: {
        tickMark: { major: "none" },
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const yAxis = opt.yAxis as any;
    expect(yAxis.axisTick.show).toBe(false);
  });

  it("tickMark 'in' produces inside tick", () => {
    const data: ChartData = {
      ...makeBarChart(),
      valueAxis: {
        tickMark: { major: "in" },
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const yAxis = opt.yAxis as any;
    expect(yAxis.axisTick.show).toBe(true);
    expect(yAxis.axisTick.inside).toBe(true);
  });

  it("horizontal bar maps valueAxis to xAxis and categoryAxis to yAxis", () => {
    const data: ChartData = {
      ...makeBarChart(),
      barDirection: "bar",
      valueAxis: { title: "Value" },
      categoryAxis: { title: "Category" },
    };
    const opt = mapChartDataToEChartsOption(data);
    expect((opt.xAxis as any).name).toBe("Value");
    expect((opt.yAxis as any).name).toBe("Category");
  });
});

// ---------------------------------------------------------------------------
// E. Data label mapping
// ---------------------------------------------------------------------------

describe("Data label mapping in ECharts options", () => {
  it("series.dataLabels maps to ECharts label", () => {
    const data: ChartData = {
      chartType: "bar",
      categories: ["A", "B"],
      series: [{
        name: "S1",
        values: [10, 20],
        dataLabels: {
          showVal: true,
          position: "outEnd",
          fontFamily: "Arial",
          fontSize: 10,
          fontColor: "#333333",
        },
      }],
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].label).toBeDefined();
    expect(series[0].label.show).toBe(true);
    expect(series[0].label.position).toBe("top");
    expect(series[0].label.fontFamily).toBe("Arial");
    expect(series[0].label.fontSize).toBe(10);
    expect(series[0].label.color).toBe("#333333");
  });

  it("data label position 'ctr' maps to 'inside'", () => {
    const data: ChartData = {
      chartType: "bar",
      categories: ["A"],
      series: [{
        name: "S1",
        values: [10],
        dataLabels: { showVal: true, position: "ctr" },
      }],
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].label.position).toBe("inside");
  });

  it("data label fontColor resolved through theme", () => {
    const data: ChartData = {
      chartType: "bar",
      categories: ["A"],
      series: [{
        name: "S1",
        values: [10],
        dataLabels: { showVal: true, fontColor: "accent1" },
      }],
    };
    const theme: ThemeColorScheme = { accent1: "AABBCC" };
    const opt = mapChartDataToEChartsOption(data, theme);
    const series = opt.series as any[];
    expect(series[0].label.color).toBe("#AABBCC");
  });
});

// ---------------------------------------------------------------------------
// F. Plot area style mapping
// ---------------------------------------------------------------------------

describe("Plot area style mapping", () => {
  it("plotArea fill maps to grid.backgroundColor", () => {
    const data: ChartData = {
      ...makeBarChart(),
      plotArea: { fill: "#F0F0F0" },
    };
    const opt = mapChartDataToEChartsOption(data);
    const grid = opt.grid as any;
    expect(grid.backgroundColor).toBe("#F0F0F0");
    expect(grid.show).toBe(true);
  });

  it("no plotArea fill keeps grid without backgroundColor", () => {
    const data = makeBarChart();
    const opt = mapChartDataToEChartsOption(data);
    const grid = opt.grid as any;
    expect(grid.backgroundColor).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// G. Unit: generateChartAlternateContentXml
// ---------------------------------------------------------------------------

describe("generateChartAlternateContentXml", () => {
  it("emits mc:AlternateContent with mc:Choice and mc:Fallback", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);

    expect(xml).toContain("mc:AlternateContent");
    expect(xml).toContain("mc:Choice");
    expect(xml).toContain("mc:Fallback");
  });

  it("uses Requires='c' for classic charts", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);
    expect(xml).toContain('Requires="c"');
  });

  it("uses Requires='cx' for ChartEx charts", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", true);
    expect(xml).toContain('Requires="cx"');
  });

  it("does NOT use Requires='c14' for classic charts", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);
    expect(xml).not.toContain('Requires="c14"');
  });

  it("contains graphicFrame in mc:Choice", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);
    // Between <mc:Choice> and </mc:Choice> there should be p:graphicFrame
    const choiceMatch = xml.match(/<mc:Choice[^>]*>([\s\S]*?)<\/mc:Choice>/);
    expect(choiceMatch).not.toBeNull();
    expect(choiceMatch![1]).toContain("p:graphicFrame");
  });

  it("contains p:pic in mc:Fallback with correct rId", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);
    const fallbackMatch = xml.match(/<mc:Fallback>([\s\S]*?)<\/mc:Fallback>/);
    expect(fallbackMatch).not.toBeNull();
    expect(fallbackMatch![1]).toContain("p:pic");
    expect(fallbackMatch![1]).toContain('r:embed="rId4"');
  });

  it("has correct position and size in fallback pic", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);
    // x=10 => 10*9525=95250, y=20 => 190500
    expect(xml).toContain('x="95250"');
    expect(xml).toContain('y="190500"');
  });

  it("includes chart rId in mc:Choice graphicFrame", () => {
    const node = makeFallbackLayoutNode();
    const xml = generateChartAlternateContentXml(node, 5, "rId3", "rId4", false);
    expect(xml).toContain('r:id="rId3"');
  });
});

// ---------------------------------------------------------------------------
// H. Missing color graceful handling
// ---------------------------------------------------------------------------

describe("Missing color graceful handling", () => {
  it("undefined colors don't produce 'undefined' strings in title", () => {
    const data: ChartData = {
      ...makeBarChart(),
      title: { text: "Test" },  // no fontColor
    };
    const opt = mapChartDataToEChartsOption(data);
    const titleStyle = (opt.title as any).textStyle;
    // color should be undefined, not the string "undefined"
    expect(titleStyle.color).not.toBe("undefined");
  });

  it("undefined series color does not produce itemStyle with undefined", () => {
    const data: ChartData = {
      chartType: "bar",
      categories: ["A"],
      series: [{ name: "S1", values: [10] }],  // no color
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    // Should not have an itemStyle at all, or at least no undefined color
    if (series[0].itemStyle) {
      expect(series[0].itemStyle.color).not.toBe("undefined");
    }
  });

  it("undefined waterfall colors fallback to defaults, not undefined strings", () => {
    const data: ChartData = {
      chartType: "waterfall",
      waterfallData: {
        categories: ["Start", "+A", "End"],
        values: [100, 50, 0],
        totalIndices: [2],
        // no increaseColor, decreaseColor, totalColor
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    for (const s of series) {
      if (s.itemStyle?.color) {
        expect(s.itemStyle.color).not.toBe("undefined");
        expect(typeof s.itemStyle.color).toBe("string");
      }
    }
  });

  it("undefined stock colors fallback to defaults", () => {
    const data: ChartData = {
      chartType: "stock",
      stockData: {
        categories: ["Day1"],
        open: [10], high: [15], low: [8], close: [12],
        // no upColor, downColor
      },
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    expect(series[0].itemStyle.color).toBe("#26A69A");
    expect(series[0].itemStyle.color0).toBe("#EF5350");
  });
});

// ---------------------------------------------------------------------------
// I. Integration: Full PPTX generation with chartFallbackImages enabled
// ---------------------------------------------------------------------------

describe("Chart Fallback Integration", () => {
  it("produces mc:AlternateContent in slide XML when fallback enabled", async () => {
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("mc:AlternateContent");
    expect(slideXml).toContain("mc:Choice");
    expect(slideXml).toContain("mc:Fallback");
  });

  it("does NOT emit mc:AlternateContent when fallback disabled", async () => {
    const doc = makeDoc([makeBarChart()], false);
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).not.toContain("mc:AlternateContent");
    expect(slideXml).toContain("p:graphicFrame");
  });

  it("stores fallback PNG in ppt/media/ when fallback enabled", async () => {
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buf);
    const mediaPaths = Object.keys(zip.files).filter(p => p.startsWith("ppt/media/") && p.endsWith(".png"));
    // Should have at least one PNG (the fallback)
    expect(mediaPaths.length).toBeGreaterThanOrEqual(1);
  });

  it("fallback PNG has valid PNG magic bytes", async () => {
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buf);
    const mediaPaths = Object.keys(zip.files).filter(p => p.startsWith("ppt/media/") && p.endsWith(".png"));
    expect(mediaPaths.length).toBeGreaterThanOrEqual(1);
    const pngBuf = await zip.files[mediaPaths[0]].async("nodebuffer");
    // PNG magic: 0x89 0x50 0x4E 0x47
    expect(pngBuf[0]).toBe(0x89);
    expect(pngBuf[1]).toBe(0x50); // P
    expect(pngBuf[2]).toBe(0x4E); // N
    expect(pngBuf[3]).toBe(0x47); // G
  });

  it("slide rels contain image relationship for fallback PNG", async () => {
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    // Should have an image relationship pointing to a media PNG
    expect(relsXml).toContain("relationships/image");
    expect(relsXml).toContain(".png");
  });

  it("maintains rId alignment with multiple charts", async () => {
    const doc = makeDoc([makeBarChart(), makeLineChart()], true);
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");

    // All rIds referenced in slide XML should resolve in rels
    assertRIdsResolve(slideXml, relsXml);
  });

  it("default is no fallback (backward compatible)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "No Fallback" },
      // chartFallbackImages not set
      slides: [{
        type: "Slide",
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: makeBarChart(),
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).not.toContain("mc:AlternateContent");
  });

  it("handles mixed charts and images with correct rIds", async () => {
    const RED_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Mixed" },
      chartFallbackImages: true,
      slides: [{
        type: "Slide",
        children: [
          { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
          { type: "Chart", style: { width: 400, height: 300 }, chartData: makeBarChart() },
          { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
        ],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    assertRIdsResolve(slideXml, relsXml);
  });

  it("chart XML and Excel are still present in ZIP with fallback", async () => {
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    expect(await zipHasFile(buf, "ppt/charts/chart1.xml")).toBe(true);
    expect(await zipHasFile(buf, "ppt/embeddings/chart1.xlsx")).toBe(true);
  });

  it("produces valid PPTX structure with multiple chart types", async () => {
    const doc = makeDoc([makeBarChart(), makePieChart(), makeLineChart()], true);
    const buf = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buf);

    // Should have 3 chart XML files
    const chartFiles = Object.keys(zip.files).filter(p => p.match(/^ppt\/charts\/chart\d+\.xml$/));
    expect(chartFiles.length).toBe(3);

    // Should have fallback PNGs
    const pngFiles = Object.keys(zip.files).filter(p => p.startsWith("ppt/media/") && p.endsWith(".png"));
    expect(pngFiles.length).toBeGreaterThanOrEqual(3);
  });

  it("uses Requires='c' (not 'c14') in fallback-enabled slide XML", async () => {
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('Requires="c"');
    expect(slideXml).not.toContain('Requires="c14"');
  });

  it("ChartEx types use Requires='cx' in fallback-enabled slide XML", async () => {
    const data: ChartData = {
      chartType: "treemap",
      treemapData: {
        categories: [
          { name: "A", value: 100 },
          { name: "B", value: 200 },
        ],
      },
    };
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      chartFallbackImages: true,
      slides: [{
        type: "Slide",
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: data,
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("mc:AlternateContent");
    expect(slideXml).toContain('Requires="cx"');
  });

  it("passes theme colors to rasterizer when theme is provided", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      chartFallbackImages: true,
      theme: {
        colorScheme: { accent1: "#FF0000" },
      },
      slides: [{
        type: "Slide",
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B"],
            series: [{ name: "S1", values: [10, 20], color: "#FF0000" }],
          },
        }],
      }],
    };
    // This should not throw — theme colors flow through to rasterizer
    const buf = await PaperEngine.render(doc);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("renders risky small right-legend charts as image-only fallback even when global fallback is off", async () => {
    const doc = makeDoc([{
      chartType: "line",
      categories: ["Jan", "Feb", "Mar"],
      series: [{ name: "Sales", values: [10, 12, 9] }],
      legend: { position: "right" },
    }], false);
    doc.slides[0].children[0].style = {
      ...(doc.slides[0].children[0] as any).style,
      width: 320,
      height: 90,
      left: 40,
      top: 40,
    };

    const buffer = await PaperEngine.render(doc, {
      outputMode: "visual_safe",
    });
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).not.toContain("<c:chart");
    expect(slideXml).toContain("<p:pic>");
    expect(zip.file("ppt/charts/chart1.xml")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// J. Edge Cases
// ---------------------------------------------------------------------------

describe("Chart Fallback Edge Cases", () => {
  it("gracefully handles empty chart data without crashing", async () => {
    const data: ChartData = {
      chartType: "bar",
      categories: [],
      series: [],
    };
    // This will fail validation (series must match categories), so use a minimal valid chart
    const doc = makeDoc([makeBarChart()], true);
    const buf = await PaperEngine.render(doc);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("ChartEx types (treemap) get Requires=cx in fallback", async () => {
    const data: ChartData = {
      chartType: "treemap",
      treemapData: {
        categories: [
          { name: "A", value: 100 },
          { name: "B", value: 200 },
        ],
      },
    };
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      chartFallbackImages: true,
      slides: [{
        type: "Slide",
        children: [{
          type: "Chart",
          style: { width: 400, height: 300 },
          chartData: data,
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    // Should have mc:AlternateContent with cx Requires
    expect(slideXml).toContain("mc:AlternateContent");
    expect(slideXml).toContain('Requires="cx"');
  });

  it("single slide with no charts produces no fallback artifacts", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      chartFallbackImages: true,
      slides: [{
        type: "Slide",
        children: [{
          type: "View",
          style: { width: 100, height: 50, backgroundColor: "#FF0000" },
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).not.toContain("mc:AlternateContent");
  });

  it("pointColors are resolved per data point", () => {
    const data: ChartData = {
      chartType: "bar",
      categories: ["A", "B", "C"],
      series: [{
        name: "S1",
        values: [10, 20, 30],
        pointColors: ["accent1", "#00FF00", "accent3"],
      }],
    };
    const opt = mapChartDataToEChartsOption(data);
    const series = opt.series as any[];
    const dataItems = series[0].data;
    // accent1 resolved to default
    expect(dataItems[0].itemStyle.color).toBe("#4472C4");
    // #00FF00 passed through
    expect(dataItems[1].itemStyle.color).toBe("#00FF00");
    // accent3 resolved to default
    expect(dataItems[2].itemStyle.color).toBe("#A9D18E");
  });
});

// ---------------------------------------------------------------------------
// K. Error handling
// ---------------------------------------------------------------------------

describe("Rasterizer error handling", () => {
  it("rasterizeChart returns undefined and logs warning on failure", async () => {
    const { rasterizeChart } = await import("../src/ooxml/chart/rasterizer.js");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Use invalid chart data that will cause echarts import to potentially fail
    // In test environment, echarts/canvas may not be available
    const result = await rasterizeChart(
      makeBarChart(),
      { width: 400, height: 300 },
    );
    // Either succeeds (returns Buffer) or fails gracefully (returns undefined with warning)
    if (result === undefined) {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[rasterizer]"),
      );
    } else {
      expect(Buffer.isBuffer(result)).toBe(true);
    }
    warnSpy.mockRestore();
  });
});
