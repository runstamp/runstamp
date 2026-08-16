import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  CHART_TYPES
} from "./chunk-TM4NN2PA.js";

// src/ooxml/chart/chartLayout.ts
var MIN_PLOT_WIDTH_RATIO = 0.45;
var MIN_PLOT_HEIGHT_RATIO = 0.38;
var MIN_PLOT_WIDTH_PX = 72;
var MIN_PLOT_HEIGHT_PX = 48;
var MIN_NATIVE_MANUAL_LAYOUT_HEIGHT_PX = 120;
var SMALL_RIGHT_LEGEND_WIDTH_PX = 560;
var SMALL_RIGHT_LEGEND_HEIGHT_PX = 220;
var SMALL_PIE_RIGHT_LEGEND_WIDTH_PX = 420;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function round4(value) {
  return Math.round(value * 1e4) / 1e4;
}
function clampRatio(value) {
  return round4(clamp(value, 0, 1));
}
function shrinkReserves(reserves, totalSize, minPlotSize, minReserve) {
  const plotSize = totalSize - reserves.reduce((sum, reserve) => sum + reserve, 0);
  const deficit = minPlotSize - plotSize;
  if (deficit <= 0) return reserves;
  let remaining = deficit;
  const next = [...reserves];
  const shrinkable = next.map((reserve) => Math.max(0, reserve - minReserve));
  for (let i = 0; i < next.length && remaining > 0; i++) {
    const delta = Math.min(remaining, shrinkable[i]);
    next[i] -= delta;
    remaining -= delta;
  }
  return next;
}
function resolveClassicLegendPosition(chartData, frame) {
  const requested = chartData.legend?.position ?? "bottom";
  if (requested === "none" || !frame) return requested;
  if (requested === "right") {
    const isPieFamily = chartData.chartType === "pie" || chartData.chartType === "doughnut";
    if (frame.width < SMALL_RIGHT_LEGEND_WIDTH_PX || frame.height < SMALL_RIGHT_LEGEND_HEIGHT_PX || isPieFamily && frame.width < SMALL_PIE_RIGHT_LEGEND_WIDTH_PX) {
      return "bottom";
    }
  }
  return requested;
}
function computeClassicChartLayout(chartData, frame) {
  if (!frame || frame.width <= 0 || frame.height <= 0) return void 0;
  const { width, height } = frame;
  const basePadding = clamp(Math.min(width, height) * 0.04, 12, 28);
  const titleGap = chartData.title?.text ? clamp(height * 0.015, 4, 12) : 0;
  const legendPosition = resolveClassicLegendPosition(chartData, frame);
  const legendGap = legendPosition !== "none" ? clamp(Math.min(width, height) * 0.025, 6, 18) : 0;
  const hasBottomCategoryLabels = legendPosition === "bottom" && chartData.chartType !== "pie" && chartData.chartType !== "doughnut" && chartData.categoryAxis?.visible !== false;
  let titleHeight = 0;
  if (chartData.title?.text) {
    const titleFontSize = chartData.title.fontSize ?? 14;
    titleHeight = clamp(titleFontSize * 2.2, 18, Math.max(18, height * 0.16));
  }
  const legendFontSize = chartData.legend?.fontSize ?? 10;
  const categoryAxisFontSize = chartData.categoryAxis?.fontSize ?? legendFontSize;
  const compactBottomAxis = height < 220;
  const bottomAxisLabelHeight = hasBottomCategoryLabels ? clamp(
    categoryAxisFontSize * (compactBottomAxis ? 1.9 : 2.8),
    compactBottomAxis ? 18 : 26,
    Math.max(compactBottomAxis ? 18 : 26, height * (compactBottomAxis ? 0.1 : 0.14))
  ) : 0;
  let topLegendHeight = 0;
  let bottomLegendHeight = 0;
  let leftLegendWidth = 0;
  let rightLegendWidth = 0;
  if (legendPosition !== "none") {
    if (legendPosition === "top") {
      topLegendHeight = clamp(legendFontSize * 3, 24, Math.max(24, height * 0.18));
    } else if (legendPosition === "bottom") {
      bottomLegendHeight = clamp(legendFontSize * 3, 24, Math.max(24, height * 0.18));
    } else if (legendPosition === "left") {
      leftLegendWidth = clamp(width * 0.14, 72, width * 0.18);
    } else if (legendPosition === "right") {
      rightLegendWidth = clamp(width * 0.14, 72, width * 0.18);
    }
  }
  const maxContentWidth = Math.max(1, width - basePadding * 2);
  const maxContentHeight = Math.max(1, height - basePadding * 2);
  const minPlotWidth = Math.min(maxContentWidth, Math.max(MIN_PLOT_WIDTH_PX, width * MIN_PLOT_WIDTH_RATIO));
  const minPlotHeight = Math.min(maxContentHeight, Math.max(MIN_PLOT_HEIGHT_PX, height * MIN_PLOT_HEIGHT_RATIO));
  [leftLegendWidth, rightLegendWidth] = shrinkReserves(
    [leftLegendWidth, rightLegendWidth],
    maxContentWidth,
    minPlotWidth,
    24
  );
  [titleHeight, topLegendHeight, bottomLegendHeight] = shrinkReserves(
    [titleHeight, topLegendHeight, bottomLegendHeight],
    maxContentHeight,
    minPlotHeight,
    12
  );
  const left = basePadding + leftLegendWidth + (leftLegendWidth > 0 ? legendGap : 0);
  const right = basePadding + rightLegendWidth + (rightLegendWidth > 0 ? legendGap : 0);
  const top = basePadding + titleHeight + (titleHeight > 0 ? titleGap : 0) + topLegendHeight + (topLegendHeight > 0 ? legendGap : 0);
  const bottom = basePadding + bottomAxisLabelHeight + bottomLegendHeight + (bottomLegendHeight > 0 ? legendGap : 0);
  const desiredPlotWidth = Math.max(minPlotWidth, width - left - right);
  const desiredPlotHeight = Math.max(minPlotHeight, height - top - bottom);
  const plotLeft = clamp(left, 0, Math.max(0, width - 1));
  const plotTop = clamp(top, 0, Math.max(0, height - 1));
  const plotWidth = clamp(desiredPlotWidth, 1, Math.max(1, width - plotLeft));
  const plotHeight = clamp(desiredPlotHeight, 1, Math.max(1, height - plotTop));
  const normalizedPlotArea = {
    x: clampRatio(plotLeft / width),
    y: clampRatio(plotTop / height),
    w: clampRatio(plotWidth / width),
    h: clampRatio(plotHeight / height)
  };
  const safePlotArea = {
    x: normalizedPlotArea.x,
    y: normalizedPlotArea.y,
    w: clampRatio(Math.min(normalizedPlotArea.w, 1 - normalizedPlotArea.x)),
    h: clampRatio(Math.min(normalizedPlotArea.h, 1 - normalizedPlotArea.y))
  };
  const safePlotAreaPx = {
    left: round4(safePlotArea.x * width),
    top: round4(safePlotArea.y * height),
    width: round4(safePlotArea.w * width),
    height: round4(safePlotArea.h * height)
  };
  const legendBox = legendPosition !== "none" ? legendPosition === "bottom" ? {
    left: basePadding,
    top: height - basePadding - bottomLegendHeight,
    width: width - basePadding * 2,
    height: bottomLegendHeight,
    position: legendPosition
  } : legendPosition === "top" ? {
    left: basePadding,
    top: basePadding + titleHeight + (titleHeight > 0 ? titleGap : 0),
    width: width - basePadding * 2,
    height: topLegendHeight,
    position: legendPosition
  } : legendPosition === "left" ? {
    left: basePadding,
    top: plotTop,
    width: leftLegendWidth,
    height: plotHeight,
    position: legendPosition
  } : {
    left: width - basePadding - rightLegendWidth,
    top: plotTop,
    width: rightLegendWidth,
    height: plotHeight,
    position: "right"
  } : void 0;
  const titleBox = chartData.title?.text ? {
    left: basePadding,
    top: basePadding,
    width: width - basePadding * 2,
    height: titleHeight
  } : void 0;
  return {
    plotArea: safePlotArea,
    plotAreaPx: {
      left: safePlotAreaPx.left,
      top: safePlotAreaPx.top,
      width: safePlotAreaPx.width,
      height: safePlotAreaPx.height,
      right: round4(width - safePlotAreaPx.left - safePlotAreaPx.width),
      bottom: round4(height - safePlotAreaPx.top - safePlotAreaPx.height)
    },
    titleBox,
    legendBox,
    legendPosition,
    shouldEmitManualLayout: height >= MIN_NATIVE_MANUAL_LAYOUT_HEIGHT_PX
  };
}

// src/ooxml/chart/chartCapabilities.ts
var CHART_TYPE_SET = new Set(CHART_TYPES);
var CHART_CAPABILITIES = {
  bar: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  line: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false
  },
  pie: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: true,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  scatter: {
    family: "classic",
    excelLayout: "xy",
    usesClassicAxes: false,
    usesValueAxesOnly: true,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false
  },
  bubble: {
    family: "classic",
    excelLayout: "xy",
    usesClassicAxes: false,
    usesValueAxesOnly: true,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false
  },
  area: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  doughnut: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: true,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  radar: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false
  },
  waterfall: {
    family: "classic",
    excelLayout: "waterfall",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: true
  },
  stock: {
    family: "classic",
    excelLayout: "stock",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  funnel: {
    family: "classic",
    excelLayout: "funnel",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: true
  },
  treemap: {
    family: "chartex",
    excelLayout: "hierarchy",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  sunburst: {
    family: "chartex",
    excelLayout: "hierarchy",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  histogram: {
    family: "chartex",
    excelLayout: "histogram",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  },
  boxWhisker: {
    family: "chartex",
    excelLayout: "boxWhisker",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false
  }
};
function isKnownChartType(value) {
  return CHART_TYPE_SET.has(value);
}
function getChartCapabilityProfile(chartType) {
  return {
    chartType,
    ...CHART_CAPABILITIES[chartType]
  };
}
function isChartExType(chartType) {
  return isKnownChartType(chartType) ? CHART_CAPABILITIES[chartType].family === "chartex" : false;
}
function getChartExcelLayout(chartType) {
  return CHART_CAPABILITIES[chartType].excelLayout;
}

export {
  resolveClassicLegendPosition,
  computeClassicChartLayout,
  getChartCapabilityProfile,
  isChartExType,
  getChartExcelLayout
};
//# sourceMappingURL=chunk-JRK4KXDV.js.map
