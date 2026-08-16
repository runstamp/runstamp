import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  computeClassicChartLayout,
  getChartCapabilityProfile
} from "./chunk-GRNMJIZR.js";
import {
  resolveColorToHex
} from "./chunk-MA6IZLCE.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/ooxml/chart/waterfallCompat.ts
function normalizeWaterfallData(chartData) {
  const raw = chartData.waterfallData;
  if (!raw) return void 0;
  const categories = raw.categories ?? chartData.categories ?? [];
  const values = raw.values ?? chartData.series?.[0]?.values ?? [];
  if (categories.length === 0 || values.length === 0 || categories.length !== values.length) {
    return void 0;
  }
  return {
    categories,
    values,
    totalIndices: raw.totalIndices ?? raw.subtotalIndices,
    increaseColor: raw.increaseColor,
    decreaseColor: raw.decreaseColor,
    totalColor: raw.totalColor ?? raw.subtotalColor,
    connectorLines: raw.connectorLines
  };
}

// src/ooxml/chart/pvceRenderer.ts
var THEME_PALETTE_TOKENS = [
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6"
];
async function renderChartToSvgWithPvce(chartData, options, themeColors) {
  const renderable = getPvceRenderableChart(chartData);
  if (!renderable) {
    return void 0;
  }
  try {
    const { chartToSVG } = await import("./src-HD4QLQXR.js");
    const svg = chartToSVG(renderable.type, renderable.data, {
      accessibility: true,
      fontFamily: chartData.title?.fontFamily ?? chartData.categoryAxis?.labelFont?.fontFamily ?? "Arial",
      fontSize: chartData.title?.fontSize ?? chartData.categoryAxis?.labelFont?.fontSize ?? 12,
      height: options.height,
      palette: buildThemePalette(themeColors),
      prettyPrint: options.prettyPrint ?? false,
      width: options.width
    });
    return injectChartBackground(sanitizeSvgRoot(svg), chartData, themeColors);
  } catch (error) {
    getLogger().warn(
      `[rasterizer] PVCE chart rendering failed for ${chartData.chartType}: ${error instanceof Error ? error.message : String(error)}`
    );
    return void 0;
  }
}
function sanitizeSvgRoot(svg) {
  return svg.replace(/<svg\b([^>]*)>/, (_match, attrs) => {
    const normalizedAttrs = attrs.replace(/"(?=[A-Za-z_:][-A-Za-z0-9_:.]*=)/g, '" ').replace(/\s+/g, " ").trim();
    return normalizedAttrs.length > 0 ? `<svg ${normalizedAttrs}>` : "<svg>";
  });
}
function buildThemePalette(themeColors) {
  const palette = THEME_PALETTE_TOKENS.map((token) => resolveColorToHex(token, themeColors)).filter((value) => Boolean(value));
  return palette.length > 0 ? palette : void 0;
}
function getPvceRenderableChart(chartData) {
  switch (chartData.chartType) {
    case "bar":
      return getPvceBarChart(chartData);
    case "line":
      return getPvceLineChart(chartData);
    case "scatter":
      return getPvceScatterChart(chartData);
    case "pie":
      return getPvcePieChart(chartData, "pie");
    case "doughnut":
      return getPvcePieChart(chartData, "donut");
    case "waterfall":
      return getPvceWaterfallChart(chartData);
    default:
      return void 0;
  }
}
function getPvceBarChart(chartData) {
  const categories = chartData.categories ?? [];
  const [firstSeries] = chartData.series ?? [];
  if (!firstSeries || categories.length === 0 || firstSeries.values.length !== categories.length) {
    return void 0;
  }
  if (chartData.series && chartData.series.length > 1) {
    return void 0;
  }
  if (chartData.barDirection === "bar") {
    return void 0;
  }
  if (chartData.barGrouping && chartData.barGrouping !== "clustered") {
    return void 0;
  }
  return {
    data: {
      categories,
      series: [{ name: firstSeries.name, values: firstSeries.values }],
      values: firstSeries.values
    },
    type: "bar"
  };
}
function getPvceLineChart(chartData) {
  const categories = chartData.categories ?? [];
  const series = chartData.series ?? [];
  if (series.length === 0 || categories.length === 0) {
    return void 0;
  }
  if (series.some((entry) => entry.values.length !== categories.length)) {
    return void 0;
  }
  if (chartData.smooth || chartData.lineGrouping === "stacked" || chartData.lineGrouping === "percentStacked") {
    return void 0;
  }
  return {
    data: {
      categories,
      series: series.map((entry) => ({ name: entry.name, values: entry.values }))
    },
    type: "line"
  };
}
function getPvceScatterChart(chartData) {
  const series = chartData.xySeries ?? [];
  if (series.length === 0) {
    return void 0;
  }
  return {
    data: {
      points: flattenScatterSeries(series)
    },
    type: "scatter"
  };
}
function flattenScatterSeries(series) {
  return series.flatMap(
    (entry, seriesIndex) => entry.dataPoints.map((point, pointIndex) => ({
      label: pointLabel(entry.name, seriesIndex, pointIndex),
      x: point.x,
      y: point.y
    }))
  );
}
function pointLabel(name, seriesIndex, pointIndex) {
  if (name) {
    return `${name} ${pointIndex + 1}`;
  }
  return `Series ${seriesIndex + 1} Point ${pointIndex + 1}`;
}
function getPvcePieChart(chartData, type) {
  const categories = chartData.categories ?? [];
  const [firstSeries] = chartData.series ?? [];
  if (!firstSeries || categories.length === 0 || firstSeries.values.length !== categories.length) {
    return void 0;
  }
  if (chartData.series && chartData.series.length > 1) {
    return void 0;
  }
  return {
    data: {
      categories,
      values: firstSeries.values
    },
    type
  };
}
function getPvceWaterfallChart(chartData) {
  const normalized = normalizeWaterfallData(chartData);
  if (!normalized) {
    return void 0;
  }
  return {
    data: {
      categories: normalized.categories,
      isTotal: toWaterfallFlags(normalized),
      values: normalized.values
    },
    type: "waterfall"
  };
}
function toWaterfallFlags(data) {
  const totals = new Set(data.totalIndices ?? []);
  return data.values.map((_, index) => totals.has(index));
}
function injectChartBackground(svg, chartData, themeColors) {
  const backgroundColor = resolveChartBackground(chartData, themeColors);
  if (!backgroundColor) {
    return svg;
  }
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch?.[1]?.trim().split(/\s+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    return svg;
  }
  const [, , width, height] = viewBox;
  return svg.replace(
    /<svg\b([^>]*)>/,
    `<svg$1><rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`
  );
}
function resolveChartBackground(chartData, themeColors) {
  return resolveColorToHex(chartData.chartArea?.fill, themeColors) ?? resolveColorToHex(chartData.plotArea?.fill, themeColors) ?? "#FFFFFF";
}

// src/ooxml/chart/rasterizer.ts
function mapChartDataToEChartsOption(chartData, themeColors, frame) {
  const option = {};
  const rc = (c) => resolveColorToHex(c, themeColors);
  const layout = computeClassicChartLayout(chartData, frame);
  const plotArea = layout?.plotAreaPx;
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
        fontWeight: chartData.title.bold ? "bold" : "normal"
      }
    };
  }
  if (chartData.legend?.position !== "none") {
    option.legend = {
      show: true,
      ...layout?.legendBox ? {
        left: layout.legendBox.left,
        top: layout.legendBox.top,
        width: layout.legendBox.width,
        height: layout.legendBox.height,
        orient: layout.legendBox.position === "left" || layout.legendBox.position === "right" ? "vertical" : "horizontal"
      } : {
        ...chartData.legend?.position === "left" || chartData.legend?.position === "right" ? { [chartData.legend.position]: 0, orient: "vertical" } : { [chartData.legend?.position ?? "bottom"]: 0 }
      }
    };
  } else {
    option.legend = { show: false };
  }
  option.animation = false;
  option.textStyle = {
    fontSize: 11,
    ...option.textStyle ?? {}
  };
  const chartType = chartData.chartType;
  const capability = getChartCapabilityProfile(chartType);
  if (capability.isPieLike) {
    const data = (chartData.categories ?? []).map((cat, i) => ({
      name: cat,
      value: chartData.series?.[0]?.values[i] ?? 0,
      ...chartData.series?.[0]?.pointColors?.[i] ? { itemStyle: { color: rc(chartData.series[0].pointColors[i]) } } : chartData.series?.[0]?.color ? {} : {}
    }));
    const outerRadiusPx = plotArea ? Math.max(24, Math.min(plotArea.width, plotArea.height) / 2 - 8) : void 0;
    const radius = chartType === "doughnut" ? [`${chartData.holeSize ?? 50}%`, outerRadiusPx ?? "75%"] : [plotArea ? 0 : "0%", outerRadiusPx ?? "75%"];
    option.series = [{
      type: "pie",
      radius,
      ...plotArea ? {
        center: [
          plotArea.left + plotArea.width / 2,
          plotArea.top + plotArea.height / 2
        ]
      } : {},
      data,
      startAngle: chartData.firstSliceAng ?? 90,
      ...chartData.explosion ? { roseType: false } : {}
    }];
    return option;
  }
  if (chartType === "radar") {
    const indicator = (chartData.categories ?? []).map((cat) => ({ name: cat }));
    option.radar = {
      indicator,
      ...plotArea ? {
        center: [
          plotArea.left + plotArea.width / 2,
          plotArea.top + plotArea.height / 2
        ],
        radius: Math.max(24, Math.min(plotArea.width, plotArea.height) / 2 - 10)
      } : {}
    };
    option.series = [{
      type: "radar",
      areaStyle: chartData.radarStyle === "filled" ? {} : void 0,
      data: (chartData.series ?? []).map((s) => ({
        name: s.name,
        value: s.values,
        ...rc(s.color) ? { itemStyle: { color: rc(s.color) } } : {}
      }))
    }];
    return option;
  }
  if (capability.usesValueAxesOnly) {
    option.xAxis = { type: "value", ...mapAxisToECharts(chartData.categoryAxis, themeColors) };
    option.yAxis = { type: "value", ...mapAxisToECharts(chartData.valueAxis, themeColors) };
    option.series = (chartData.xySeries ?? []).map((s) => ({
      type: "scatter",
      name: s.name,
      data: s.dataPoints.map(
        (p) => chartType === "bubble" ? [p.x, p.y, p.size ?? 10] : [p.x, p.y]
      ),
      ...rc(s.color) ? { itemStyle: { color: rc(s.color) } } : {},
      ...chartType === "bubble" ? { symbolSize: (val) => Math.sqrt(val[2]) * 4 } : {}
    }));
    return option;
  }
  if (chartType === "waterfall") {
    const wd = normalizeWaterfallData(chartData);
    if (!wd) return option;
    return mapWaterfallToECharts(wd, option, themeColors);
  }
  if (chartType === "stock" && chartData.stockData) {
    const sd = chartData.stockData;
    return mapStockToECharts(sd, option, themeColors);
  }
  if (chartType === "funnel" && chartData.funnelData) {
    const fd = chartData.funnelData;
    option.series = [{
      type: "funnel",
      ...plotArea ? {
        left: plotArea.left,
        top: plotArea.top,
        width: plotArea.width,
        height: plotArea.height
      } : {},
      data: fd.categories.map((cat, i) => ({
        name: cat,
        value: fd.values[i],
        ...fd.colors?.[i] ? { itemStyle: { color: rc(fd.colors[i]) } } : {}
      })),
      sort: "descending"
    }];
    return option;
  }
  if (chartType === "treemap" && chartData.treemapData) {
    option.series = [{
      type: "treemap",
      data: mapTreemapData(chartData.treemapData.categories)
    }];
    return option;
  }
  if (chartType === "sunburst" && chartData.sunburstData) {
    option.series = [{
      type: "sunburst",
      data: mapTreemapData(chartData.sunburstData.categories)
    }];
    return option;
  }
  if (chartType === "histogram" && chartData.histogramData) {
    const hd = chartData.histogramData;
    const bins = binValues(hd.values, hd.binCount ?? 10);
    option.xAxis = { type: "category", data: bins.labels };
    option.yAxis = { type: "value" };
    option.series = [{
      type: "bar",
      data: bins.counts,
      ...hd.color ? { itemStyle: { color: rc(hd.color) } } : {}
    }];
    return option;
  }
  if (chartType === "boxWhisker" && chartData.boxWhiskerData) {
    const bwd = chartData.boxWhiskerData;
    option.xAxis = { type: "category", data: bwd.categories };
    option.yAxis = { type: "value" };
    option.series = bwd.series.map((s) => ({
      type: "boxplot",
      name: s.name,
      data: [computeBoxPlotStats(s.values)],
      ...rc(s.color) ? { itemStyle: { color: rc(s.color) } } : {}
    }));
    return option;
  }
  const isHorizontalBar = chartType === "bar" && chartData.barDirection === "bar";
  if (isHorizontalBar) {
    option.yAxis = { type: "category", data: chartData.categories ?? [], ...mapAxisToECharts(chartData.categoryAxis, themeColors) };
    option.xAxis = { type: "value", ...mapAxisToECharts(chartData.valueAxis, themeColors) };
  } else {
    option.xAxis = { type: "category", data: chartData.categories ?? [], ...mapAxisToECharts(chartData.categoryAxis, themeColors) };
    option.yAxis = { type: "value", ...mapAxisToECharts(chartData.valueAxis, themeColors) };
  }
  const gridConfig = {
    containLabel: true,
    ...plotArea ? {
      left: plotArea.left,
      top: plotArea.top,
      width: plotArea.width,
      height: plotArea.height
    } : {}
  };
  if (chartData.plotArea?.fill) {
    gridConfig.backgroundColor = rc(chartData.plotArea.fill);
    gridConfig.show = true;
  }
  option.grid = gridConfig;
  const echartsType = chartType === "area" ? "line" : chartType === "bar" ? "bar" : chartType;
  option.series = (chartData.series ?? []).map((s) => {
    const seriesType = s.overrideType === "area" ? "line" : s.overrideType ?? echartsType;
    const resolvedColor = rc(s.color);
    const entry = {
      type: seriesType,
      name: s.name,
      data: s.values,
      ...resolvedColor ? { itemStyle: { color: resolvedColor } } : {},
      // Increase visual density: thicker lines for line/area charts
      ...seriesType === "line" ? { lineStyle: { width: 2.5 }, symbolSize: 6 } : {},
      // Wider bars with visible borders
      ...seriesType === "bar" ? { barMaxWidth: 40, itemStyle: { ...resolvedColor ? { color: resolvedColor } : {}, borderWidth: 1, borderColor: "#FFFFFF" } } : {}
    };
    if (s.pointColors) {
      entry.data = s.values.map((v, i) => {
        const pc = rc(s.pointColors[i]);
        return pc ? { value: v, itemStyle: { color: pc } } : v;
      });
    }
    if (s.dataLabels) {
      entry.label = mapDataLabelsToECharts(s.dataLabels, themeColors);
    }
    if (chartType === "area" || s.overrideType === "area") {
      entry.areaStyle = {};
    }
    const grouping = chartType === "bar" ? chartData.barGrouping : chartType === "line" ? chartData.lineGrouping : chartType === "area" ? chartData.areaGrouping : void 0;
    if (grouping === "stacked" || grouping === "percentStacked") {
      entry.stack = "total";
    }
    if (chartData.smooth) {
      entry.smooth = true;
    }
    return entry;
  });
  return option;
}
function mapAxisToECharts(axisConfig, themeColors) {
  if (!axisConfig) return {};
  const result = {};
  const rc = (c) => resolveColorToHex(c, themeColors);
  if (axisConfig.labelRotation !== void 0) {
    result.axisLabel = {
      ...result.axisLabel ?? {},
      rotate: axisConfig.labelRotation
    };
  }
  if (axisConfig.labelFont) {
    const lf = axisConfig.labelFont;
    result.axisLabel = {
      ...result.axisLabel ?? {},
      fontFamily: lf.fontFamily,
      fontSize: lf.fontSize,
      color: rc(lf.fontColor),
      fontWeight: lf.bold ? "bold" : void 0,
      fontStyle: lf.italic ? "italic" : void 0
    };
  }
  if (axisConfig.numberFormat) {
    result.axisLabel = {
      ...result.axisLabel ?? {},
      formatter: `{value}`
    };
  }
  if (axisConfig.min !== void 0) result.min = axisConfig.min;
  if (axisConfig.max !== void 0) result.max = axisConfig.max;
  if (axisConfig.crossesAt !== void 0) {
  }
  if (axisConfig.gridlines) {
    if (axisConfig.gridlines.major !== void 0) {
      result.splitLine = {
        show: axisConfig.gridlines.major,
        ...axisConfig.gridlines.color ? { lineStyle: { color: rc(axisConfig.gridlines.color) } } : {}
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
function mapDataLabelsToECharts(dl, themeColors) {
  const rc = (c) => resolveColorToHex(c, themeColors);
  const positionMap = {
    outEnd: "top",
    inEnd: "insideTop",
    ctr: "inside",
    inBase: "insideBottom",
    bestFit: "top"
  };
  return {
    show: true,
    position: dl.position ? positionMap[dl.position] ?? "top" : "top",
    fontFamily: dl.fontFamily,
    fontSize: dl.fontSize,
    color: rc(dl.fontColor)
  };
}
function mapWaterfallToECharts(wd, option, themeColors) {
  const rc = (c) => resolveColorToHex(c, themeColors);
  const categories = wd.categories;
  const values = wd.values;
  const totalIndices = new Set(wd.totalIndices ?? []);
  const base = [];
  const increase = [];
  const decrease = [];
  const total = [];
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
  option.xAxis = { type: "category", data: categories };
  option.yAxis = { type: "value" };
  option.series = [
    { type: "bar", stack: "wf", name: "base", data: base, itemStyle: { color: "transparent" }, emphasis: { disabled: true } },
    { type: "bar", stack: "wf", name: "Increase", data: increase, itemStyle: { color: rc(wd.increaseColor) ?? "#4CAF50" }, barMaxWidth: 40, label: { show: true, position: "top", fontSize: 10 } },
    { type: "bar", stack: "wf", name: "Decrease", data: decrease, itemStyle: { color: rc(wd.decreaseColor) ?? "#F44336" }, barMaxWidth: 40, label: { show: true, position: "bottom", fontSize: 10 } },
    { type: "bar", stack: "wf", name: "Total", data: total, itemStyle: { color: rc(wd.totalColor) ?? "#2196F3" }, barMaxWidth: 40, label: { show: true, position: "top", fontSize: 10 } }
  ];
  return option;
}
function mapStockToECharts(sd, option, themeColors) {
  const rc = (c) => resolveColorToHex(c, themeColors);
  option.xAxis = { type: "category", data: sd.categories };
  option.yAxis = { type: "value" };
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
      borderColor0: downColor
    }
  }];
  return option;
}
function mapTreemapData(categories) {
  return categories.map((cat) => ({
    name: cat.name,
    value: cat.value ?? 0,
    ...cat.color ? { itemStyle: { color: cat.color } } : {},
    ...cat.children && cat.children.length > 0 ? { children: mapTreemapData(cat.children) } : {}
  }));
}
function binValues(values, binCount) {
  if (values.length === 0) return { labels: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / binCount;
  const counts = new Array(binCount).fill(0);
  const labels = [];
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
function computeBoxPlotStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const min = sorted[0];
  const max = sorted[n - 1];
  return [min, q1, median, q3, max];
}
async function rasterizeChart(chartData, options, themeColors) {
  try {
    const pixelRatio = options.pixelRatio ?? 2;
    const pxWidth = Math.round(options.width * pixelRatio);
    const pxHeight = Math.round(options.height * pixelRatio);
    const svg = await renderChartToSvg(chartData, options, themeColors);
    if (!svg) {
      throw new PaperError("Chart SVG renderer returned no image data.", {
        code: "PPTX_CHART_FALLBACK_MISSING",
        phase: "chart"
      });
    }
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const img = await loadImage(Buffer.from(svg.svg));
    const canvas = createCanvas(pxWidth, pxHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, pxWidth, pxHeight);
    return Buffer.from(canvas.toBuffer("image/png"));
  } catch (err) {
    getLogger().warn(`[rasterizer] Chart rasterization failed: ${err.message}`);
    return void 0;
  }
}
async function renderChartToSvg(chartData, options, themeColors) {
  const preferredRenderer = options.renderer ?? "auto";
  if (preferredRenderer !== "echarts") {
    const pvceSvg = await renderChartToSvgWithPvce(chartData, options, themeColors);
    if (pvceSvg) {
      return {
        renderer: "pvce",
        svg: pvceSvg
      };
    }
  }
  try {
    const echarts = await import("./echarts-ZBTN5N3H.js");
    const chart = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: options.width,
      height: options.height
    });
    const echartsOption = mapChartDataToEChartsOption(chartData, themeColors, {
      width: options.width,
      height: options.height
    });
    echartsOption.backgroundColor = echartsOption.backgroundColor ?? "#FFFFFF";
    chart.setOption(echartsOption);
    const svg = chart.renderToSVGString();
    chart.dispose();
    return {
      renderer: "echarts",
      svg
    };
  } catch (error) {
    if (preferredRenderer === "pvce") {
      getLogger().warn(
        `[rasterizer] Chart SVG rendering failed for ${chartData.chartType}: ${error instanceof Error ? error.message : String(error)}`
      );
      return void 0;
    }
    const pvceSvg = await renderChartToSvgWithPvce(chartData, options, themeColors);
    if (pvceSvg) {
      return {
        renderer: "pvce",
        svg: pvceSvg
      };
    }
    getLogger().warn(
      `[rasterizer] Chart SVG rendering failed for ${chartData.chartType}: ${error instanceof Error ? error.message : String(error)}`
    );
    return void 0;
  }
}

export {
  normalizeWaterfallData,
  mapChartDataToEChartsOption,
  rasterizeChart,
  renderChartToSvg
};
//# sourceMappingURL=chunk-56BKZXEH.js.map
