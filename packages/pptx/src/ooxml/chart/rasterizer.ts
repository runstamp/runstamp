// src/ooxml/chart/rasterizer.ts — Chart rasterizer using ECharts SSR + @napi-rs/canvas
import { getLogger } from "../../logger.js";
import { PaperError } from "../../errors.js";

import type { ChartData, ChartSeries, XYSeries, WaterfallData, StockData, ThemeColorScheme, ChartAxisConfig, ChartDataLabels } from "../../types/ast.js";
import { resolveColorToHex } from "./chartColorResolver.js";
import { computeClassicChartLayout, type ChartFrameSize } from "./chartLayout.js";
import { getChartCapabilityProfile } from "./chartCapabilities.js";
import { normalizeWaterfallData } from "./waterfallCompat.js";
import { renderChartToSvgWithPvce } from "./pvceRenderer.js";

export interface RasterizeOptions {
  width: number;
  height: number;
  pixelRatio?: number;
  renderer?: "auto" | "echarts" | "pvce";
}

export interface ChartSvgRenderResult {
  renderer: "echarts" | "pvce";
  svg: string;
}

/**
 * Maps a PaperAST ChartData to an ECharts option object.
 * Covers: bar, line, pie, scatter, bubble, area, doughnut, radar,
 * waterfall, stock, funnel. Modern ChartEx types (treemap, sunburst,
 * histogram, boxWhisker) get a basic representation.
 */
export function mapChartDataToEChartsOption(
  chartData: ChartData,
  themeColors?: ThemeColorScheme,
  frame?: ChartFrameSize,
): Record<string, unknown> {
  const option: Record<string, unknown> = {};
  const rc = (c: string | undefined) => resolveColorToHex(c, themeColors);
  const layout = computeClassicChartLayout(chartData, frame);
  const plotArea = layout?.plotAreaPx;

  // Title
  if (chartData.title?.text) {
    option.title = {
      text: chartData.title.text,
      left: layout?.titleBox ? layout.titleBox.left : "center",
      top: layout?.titleBox?.top ?? 0,
      width: layout?.titleBox?.width,
      textStyle: {
        fontFamily: chartData.title.fontFamily,
        fontSize: chartData.title.fontSize,
        color: rc(chartData.title.fontColor),
        fontWeight: chartData.title.bold ? "bold" : "normal",
      },
    };
  }

  // Legend
  if (chartData.legend?.position !== "none") {
    option.legend = {
      show: true,
      ...(layout?.legendBox
        ? {
            left: layout.legendBox.left,
            top: layout.legendBox.top,
            width: layout.legendBox.width,
            height: layout.legendBox.height,
            orient: layout.legendBox.position === "left" || layout.legendBox.position === "right" ? "vertical" : "horizontal",
          }
        : {
            ...(chartData.legend?.position === "left" || chartData.legend?.position === "right"
              ? { [chartData.legend.position]: 0, orient: "vertical" }
              : { [chartData.legend?.position ?? "bottom"]: 0 }),
          }),
    };
  } else {
    option.legend = { show: false };
  }

  // Animation off for static rendering
  option.animation = false;

  // Increase visual density for slide rendering: thicker lines, larger labels
  option.textStyle = {
    fontSize: 11,
    ...(option.textStyle as Record<string, unknown> ?? {}),
  };

  const chartType = chartData.chartType;
  const capability = getChartCapabilityProfile(chartType);

  // ---- Pie / Doughnut ----
  if (capability.isPieLike) {
    const data = (chartData.categories ?? []).map((cat, i) => ({
      name: cat,
      value: chartData.series?.[0]?.values[i] ?? 0,
      ...(chartData.series?.[0]?.pointColors?.[i]
        ? { itemStyle: { color: rc(chartData.series[0].pointColors[i]) } }
        : chartData.series?.[0]?.color ? {} : {}),
    }));

    const outerRadiusPx = plotArea
      ? Math.max(24, Math.min(plotArea.width, plotArea.height) / 2 - 8)
      : undefined;
    const radius: [string | number, string | number] = chartType === "doughnut"
      ? [`${chartData.holeSize ?? 50}%`, outerRadiusPx ?? "75%"]
      : [plotArea ? 0 : "0%", outerRadiusPx ?? "75%"];

    option.series = [{
      type: "pie",
      radius,
      ...(plotArea
        ? {
            center: [
              plotArea.left + plotArea.width / 2,
              plotArea.top + plotArea.height / 2,
            ],
          }
        : {}),
      data,
      startAngle: chartData.firstSliceAng ?? 90,
      ...(chartData.explosion ? { roseType: false } : {}),
    }];
    return option;
  }

  // ---- Radar ----
  if (chartType === "radar") {
    const indicator = (chartData.categories ?? []).map(cat => ({ name: cat }));
    option.radar = {
      indicator,
      ...(plotArea
        ? {
            center: [
              plotArea.left + plotArea.width / 2,
              plotArea.top + plotArea.height / 2,
            ],
            radius: Math.max(24, Math.min(plotArea.width, plotArea.height) / 2 - 10),
          }
        : {}),
    };
    option.series = [{
      type: "radar",
      areaStyle: chartData.radarStyle === "filled" ? {} : undefined,
      data: (chartData.series ?? []).map(s => ({
        name: s.name,
        value: s.values,
        ...(rc(s.color) ? { itemStyle: { color: rc(s.color) } } : {}),
      })),
    }];
    return option;
  }

  // ---- Scatter / Bubble ----
  if (capability.usesValueAxesOnly) {
    option.xAxis = { type: "value" as const, ...mapAxisToECharts(chartData.categoryAxis, themeColors) };
    option.yAxis = { type: "value" as const, ...mapAxisToECharts(chartData.valueAxis, themeColors) };
    option.series = (chartData.xySeries ?? []).map((s: XYSeries) => ({
      type: "scatter",
      name: s.name,
      data: s.dataPoints.map(p =>
        chartType === "bubble" ? [p.x, p.y, p.size ?? 10] : [p.x, p.y]
      ),
      ...(rc(s.color) ? { itemStyle: { color: rc(s.color) } } : {}),
      ...(chartType === "bubble" ? { symbolSize: (val: number[]) => Math.sqrt(val[2]) * 4 } : {}),
    }));
    return option;
  }

  // ---- Waterfall ----
  if (chartType === "waterfall") {
    const wd = normalizeWaterfallData(chartData);
    if (!wd) return option;
    return mapWaterfallToECharts(wd, option, themeColors);
  }

  // ---- Stock (OHLC) ----
  if (chartType === "stock" && chartData.stockData) {
    const sd = chartData.stockData;
    return mapStockToECharts(sd, option, themeColors);
  }

  // ---- Funnel ----
  if (chartType === "funnel" && chartData.funnelData) {
    const fd = chartData.funnelData;
    option.series = [{
      type: "funnel",
      ...(plotArea
        ? {
            left: plotArea.left,
            top: plotArea.top,
            width: plotArea.width,
            height: plotArea.height,
          }
        : {}),
      data: fd.categories.map((cat, i) => ({
        name: cat,
        value: fd.values[i],
        ...(fd.colors?.[i] ? { itemStyle: { color: rc(fd.colors[i]) } } : {}),
      })),
      sort: "descending",
    }];
    return option;
  }

  // ---- Treemap ----
  if (chartType === "treemap" && chartData.treemapData) {
    option.series = [{
      type: "treemap",
      data: mapTreemapData(chartData.treemapData.categories),
    }];
    return option;
  }

  // ---- Sunburst ----
  if (chartType === "sunburst" && chartData.sunburstData) {
    option.series = [{
      type: "sunburst",
      data: mapTreemapData(chartData.sunburstData.categories),
    }];
    return option;
  }

  // ---- Histogram ----
  if (chartType === "histogram" && chartData.histogramData) {
    const hd = chartData.histogramData;
    // Simple histogram via bar chart with binned data
    const bins = binValues(hd.values, hd.binCount ?? 10);
    option.xAxis = { type: "category" as const, data: bins.labels };
    option.yAxis = { type: "value" as const };
    option.series = [{
      type: "bar",
      data: bins.counts,
      ...(hd.color ? { itemStyle: { color: rc(hd.color) } } : {}),
    }];
    return option;
  }

  // ---- BoxWhisker ----
  if (chartType === "boxWhisker" && chartData.boxWhiskerData) {
    const bwd = chartData.boxWhiskerData;
    option.xAxis = { type: "category" as const, data: bwd.categories };
    option.yAxis = { type: "value" as const };
    option.series = bwd.series.map(s => ({
      type: "boxplot",
      name: s.name,
      data: [computeBoxPlotStats(s.values)],
      ...(rc(s.color) ? { itemStyle: { color: rc(s.color) } } : {}),
    }));
    return option;
  }

  // ---- Bar / Line / Area (category-based) ----
  const isHorizontalBar = chartType === "bar" && chartData.barDirection === "bar";

  if (isHorizontalBar) {
    option.yAxis = { type: "category" as const, data: chartData.categories ?? [], ...mapAxisToECharts(chartData.categoryAxis, themeColors) };
    option.xAxis = { type: "value" as const, ...mapAxisToECharts(chartData.valueAxis, themeColors) };
  } else {
    option.xAxis = { type: "category" as const, data: chartData.categories ?? [], ...mapAxisToECharts(chartData.categoryAxis, themeColors) };
    option.yAxis = { type: "value" as const, ...mapAxisToECharts(chartData.valueAxis, themeColors) };
  }

  // Grid for padding + plotArea background
  const gridConfig: Record<string, unknown> = {
    containLabel: true,
    ...(plotArea
      ? {
          left: plotArea.left,
          top: plotArea.top,
          width: plotArea.width,
          height: plotArea.height,
        }
      : {}),
  };
  if (chartData.plotArea?.fill) {
    gridConfig.backgroundColor = rc(chartData.plotArea.fill);
    gridConfig.show = true;
  }
  option.grid = gridConfig;

  const echartsType = chartType === "area" ? "line" : chartType === "bar" ? "bar" : chartType;

  option.series = (chartData.series ?? []).map((s: ChartSeries) => {
    const seriesType = s.overrideType === "area" ? "line" : (s.overrideType ?? echartsType);
    const resolvedColor = rc(s.color);
    const entry: Record<string, unknown> = {
      type: seriesType,
      name: s.name,
      data: s.values,
      ...(resolvedColor ? { itemStyle: { color: resolvedColor } } : {}),
      // Increase visual density: thicker lines for line/area charts
      ...(seriesType === "line" ? { lineStyle: { width: 2.5 }, symbolSize: 6 } : {}),
      // Wider bars with visible borders
      ...(seriesType === "bar" ? { barMaxWidth: 40, itemStyle: { ...(resolvedColor ? { color: resolvedColor } : {}), borderWidth: 1, borderColor: "#FFFFFF" } } : {}),
    };
    // Point colors
    if (s.pointColors) {
      entry.data = s.values.map((v, i) => {
        const pc = rc(s.pointColors![i]);
        return pc ? { value: v, itemStyle: { color: pc } } : v;
      });
    }
    // Data labels
    if (s.dataLabels) {
      entry.label = mapDataLabelsToECharts(s.dataLabels, themeColors);
    }
    // Area fill
    if (chartType === "area" || s.overrideType === "area") {
      entry.areaStyle = {};
    }
    // Stacking
    const grouping = chartType === "bar" ? chartData.barGrouping
      : chartType === "line" ? chartData.lineGrouping
      : chartType === "area" ? chartData.areaGrouping : undefined;
    if (grouping === "stacked" || grouping === "percentStacked") {
      entry.stack = "total";
    }
    // Smooth
    if (chartData.smooth) {
      entry.smooth = true;
    }
    return entry;
  });

  return option;
}

// ---------------------------------------------------------------------------
// Axis and DataLabel mapping helpers
// ---------------------------------------------------------------------------

function mapAxisToECharts(axisConfig: ChartAxisConfig | undefined, themeColors?: ThemeColorScheme): Record<string, unknown> {
  if (!axisConfig) return {};
  const result: Record<string, unknown> = {};
  const rc = (c: string | undefined) => resolveColorToHex(c, themeColors);

  if (axisConfig.labelRotation !== undefined) {
    result.axisLabel = {
      ...(result.axisLabel as Record<string, unknown> ?? {}),
      rotate: axisConfig.labelRotation,
    };
  }

  if (axisConfig.labelFont) {
    const lf = axisConfig.labelFont;
    result.axisLabel = {
      ...(result.axisLabel as Record<string, unknown> ?? {}),
      fontFamily: lf.fontFamily,
      fontSize: lf.fontSize,
      color: rc(lf.fontColor),
      fontWeight: lf.bold ? "bold" : undefined,
      fontStyle: lf.italic ? "italic" : undefined,
    };
  }

  if (axisConfig.numberFormat) {
    result.axisLabel = {
      ...(result.axisLabel as Record<string, unknown> ?? {}),
      formatter: `{value}`,
    };
  }

  if (axisConfig.min !== undefined) result.min = axisConfig.min;
  if (axisConfig.max !== undefined) result.max = axisConfig.max;

  if (axisConfig.crossesAt !== undefined) {
    // Not directly supported in ECharts, but we approximate via min
  }

  if (axisConfig.gridlines) {
    if (axisConfig.gridlines.major !== undefined) {
      result.splitLine = {
        show: axisConfig.gridlines.major,
        ...(axisConfig.gridlines.color ? { lineStyle: { color: rc(axisConfig.gridlines.color) } } : {}),
      };
    }
    if (axisConfig.gridlines.minor) {
      result.minorSplitLine = { show: true };
    }
  }

  if (axisConfig.tickMark) {
    const major = axisConfig.tickMark.major;
    if (major === "none") {
      result.axisTick = { show: false };
    } else if (major) {
      result.axisTick = { show: true, inside: major === "in" };
    }
  }

  if (axisConfig.title) {
    result.name = axisConfig.title;
    result.nameLocation = "middle";
    result.nameGap = 30;
  }

  return result;
}

function mapDataLabelsToECharts(dl: ChartDataLabels, themeColors?: ThemeColorScheme): Record<string, unknown> {
  const rc = (c: string | undefined) => resolveColorToHex(c, themeColors);
  const positionMap: Record<string, string> = {
    outEnd: "top",
    inEnd: "insideTop",
    ctr: "inside",
    inBase: "insideBottom",
    bestFit: "top",
  };
  return {
    show: true,
    position: dl.position ? (positionMap[dl.position] ?? "top") : "top",
    fontFamily: dl.fontFamily,
    fontSize: dl.fontSize,
    color: rc(dl.fontColor),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapWaterfallToECharts(wd: WaterfallData, option: Record<string, unknown>, themeColors?: ThemeColorScheme): Record<string, unknown> {
  const rc = (c: string | undefined) => resolveColorToHex(c, themeColors);
  const categories = wd.categories;
  const values = wd.values;
  const totalIndices = new Set(wd.totalIndices ?? []);

  // Compute running totals
  const base: number[] = [];
  const increase: number[] = [];
  const decrease: number[] = [];
  const total: number[] = [];
  let running = 0;

  for (let i = 0; i < values.length; i++) {
    if (totalIndices.has(i)) {
      base.push(0);
      increase.push(0);
      decrease.push(0);
      total.push(running);
    } else {
      const v = values[i];
      if (v >= 0) {
        base.push(running);
        increase.push(v);
        decrease.push(0);
        total.push(0);
      } else {
        base.push(running + v);
        increase.push(0);
        decrease.push(-v);
        total.push(0);
      }
      running += v;
    }
  }

  option.xAxis = { type: "category" as const, data: categories };
  option.yAxis = { type: "value" as const };
  option.series = [
    { type: "bar", stack: "wf", name: "base", data: base, itemStyle: { color: "transparent" }, emphasis: { disabled: true } },
    { type: "bar", stack: "wf", name: "Increase", data: increase, itemStyle: { color: rc(wd.increaseColor) ?? "#4CAF50" }, barMaxWidth: 40, label: { show: true, position: "top", fontSize: 10 } },
    { type: "bar", stack: "wf", name: "Decrease", data: decrease, itemStyle: { color: rc(wd.decreaseColor) ?? "#F44336" }, barMaxWidth: 40, label: { show: true, position: "bottom", fontSize: 10 } },
    { type: "bar", stack: "wf", name: "Total", data: total, itemStyle: { color: rc(wd.totalColor) ?? "#2196F3" }, barMaxWidth: 40, label: { show: true, position: "top", fontSize: 10 } },
  ];
  return option;
}

function mapStockToECharts(sd: StockData, option: Record<string, unknown>, themeColors?: ThemeColorScheme): Record<string, unknown> {
  const rc = (c: string | undefined) => resolveColorToHex(c, themeColors);
  option.xAxis = { type: "category" as const, data: sd.categories };
  option.yAxis = { type: "value" as const };
  // Candlestick: [open, close, low, high]
  const candleData = sd.categories.map((_, i) => [sd.open[i], sd.close[i], sd.low[i], sd.high[i]]);
  const upColor = rc(sd.upColor) ?? "#26A69A";
  const downColor = rc(sd.downColor) ?? "#EF5350";
  option.series = [{
    type: "candlestick",
    data: candleData,
    itemStyle: {
      color: upColor,
      color0: downColor,
      borderColor: upColor,
      borderColor0: downColor,
    },
  }];
  return option;
}

function mapTreemapData(categories: Array<{ name: string; value?: number; children?: any[]; color?: string }>): unknown[] {
  return categories.map(cat => ({
    name: cat.name,
    value: cat.value ?? 0,
    ...(cat.color ? { itemStyle: { color: cat.color } } : {}),
    ...(cat.children && cat.children.length > 0
      ? { children: mapTreemapData(cat.children) }
      : {}),
  }));
}

function binValues(values: number[], binCount: number): { labels: string[]; counts: number[] } {
  if (values.length === 0) return { labels: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / binCount;
  const counts = new Array(binCount).fill(0);
  const labels: string[] = [];

  for (let i = 0; i < binCount; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    labels.push(`${lo.toFixed(1)}-${hi.toFixed(1)}`);
  }

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    counts[idx]++;
  }

  return { labels, counts };
}

function computeBoxPlotStats(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const min = sorted[0];
  const max = sorted[n - 1];
  return [min, q1, median, q3, max];
}

/**
 * Rasterizes a ChartData into a PNG buffer using ECharts SVG SSR + @napi-rs/canvas.
 *
 * Uses SVG renderer (which works reliably in Node.js SSR) then converts
 * the SVG string to PNG via @napi-rs/canvas loadImage.
 *
 * Returns `undefined` on any failure (graceful degradation).
 */
export async function rasterizeChart(
  chartData: ChartData,
  options: RasterizeOptions,
  themeColors?: ThemeColorScheme,
): Promise<Buffer | undefined> {
  try {
    const pixelRatio = options.pixelRatio ?? 2;
    const pxWidth = Math.round(options.width * pixelRatio);
    const pxHeight = Math.round(options.height * pixelRatio);
    const svg = await renderChartToSvg(chartData, options, themeColors);
    if (!svg) {
      throw new PaperError("Chart SVG renderer returned no image data.", {
        code: "PPTX_CHART_FALLBACK_MISSING",
        phase: "chart",
      });
    }

    const { createCanvas, loadImage } = await import("@napi-rs/canvas");

    // Convert SVG → PNG via @napi-rs/canvas
    const img = await loadImage(Buffer.from(svg.svg));
    const canvas = createCanvas(pxWidth, pxHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, pxWidth, pxHeight);

    return Buffer.from(canvas.toBuffer("image/png"));
  } catch (err) {
    getLogger().warn(`[rasterizer] Chart rasterization failed: ${(err as Error).message}`);
    return undefined;
  }
}

export async function renderChartToSvg(
  chartData: ChartData,
  options: Pick<RasterizeOptions, "height" | "width" | "renderer">,
  themeColors?: ThemeColorScheme,
): Promise<ChartSvgRenderResult | undefined> {
  const preferredRenderer = options.renderer ?? "auto";

  if (preferredRenderer !== "echarts") {
    const pvceSvg = await renderChartToSvgWithPvce(chartData, options, themeColors);
    if (pvceSvg) {
      return {
        renderer: "pvce",
        svg: pvceSvg,
      };
    }
  }

  try {
    const echarts = await import("echarts");
    const chart = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: options.width,
      height: options.height,
    });

    const echartsOption = mapChartDataToEChartsOption(chartData, themeColors, {
      width: options.width,
      height: options.height,
    });
    echartsOption.backgroundColor = echartsOption.backgroundColor ?? "#FFFFFF";
    chart.setOption(echartsOption);

    const svg = chart.renderToSVGString();
    chart.dispose();

    return {
      renderer: "echarts",
      svg,
    };
  } catch (error) {
    if (preferredRenderer === "pvce") {
      getLogger().warn(
        `[rasterizer] Chart SVG rendering failed for ${chartData.chartType}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }

    const pvceSvg = await renderChartToSvgWithPvce(chartData, options, themeColors);
    if (pvceSvg) {
      return {
        renderer: "pvce",
        svg: pvceSvg,
      };
    }

    getLogger().warn(
      `[rasterizer] Chart SVG rendering failed for ${chartData.chartType}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}
