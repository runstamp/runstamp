// resolveAnnotations.ts — turns category/value-anchored chart annotations
// (trendArrow, targetLine) into slide-level Connector + Text shapes the
// engine can emit alongside the chart frame.
//
// Why slide-level rather than chart-bound user shapes (cdr:userShapes)?
// Two reasons:
//   1. Slide-level shapes render reliably across PowerPoint, Keynote, and
//      LibreOffice. cdr:userShapes support is patchier in soffice and we
//      use soffice for proof PDFs.
//   2. The arrow/label still moves with the chart in spec-space because
//      we resolve from the chart's *layout* rect (post-Yoga). Resize the
//      chart's grid colSpan and the arrow stays anchored to bar tops on
//      the next render.
//
// The math: computeClassicChartLayout gives us the plot-area rect inside
// the chart frame. From there:
//   - X (column charts): bar i's center is at plotLeft + (i + 0.5) *
//     plotWidth / categoryCount.
//   - Y: value v maps to plotTop + (max - v)/(max - min) * plotHeight,
//     using min/max from valueAxis (or from data when unset).
//
// Targets for "barTop": the actual data value at (categoryIndex,
// seriesIndex). For "barBottom": axis baseline (min, or 0). For "value":
// the explicit `value` field on the anchor.

import type {
  ChartAnnotation,
  ChartCategoryAnchor,
  ChartData,
  ChartTargetLineAnnotation,
  ChartTrendArrowAnnotation,
  PaperConnector,
  PaperText,
} from "../../types/ast.js";
import { computeClassicChartLayout } from "./chartLayout.js";

export interface ResolvedChartAnnotations {
  /** Chart-bound text shapes (legacy `kind: "text"` form). */
  textAnnotations: ChartAnnotation[];
  /** Slide-level connector shapes (trend arrows, target lines). */
  connectors: PaperConnector[];
  /** Slide-level text labels (CAGR-style labels next to arrows / lines). */
  labels: PaperText[];
}

interface ChartFrameRect {
  /** Slide-absolute. */
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_ANNOTATION_COLOR = "#C8102E";
const DEFAULT_ANNOTATION_WIDTH = 1.5;
const DEFAULT_LABEL_FONT_SIZE = 9;
const TREND_ARROW_CLEARANCE_PX = 22;
const TREND_LABEL_CLEARANCE_PX = 18;
const TARGET_LABEL_CLEARANCE_PX = 20;
const TARGET_LABEL_MARK_CLEARANCE_PX = 10;
const TARGET_LABEL_RIGHT_INSET_PX = 8;

export function resolveChartAnnotations(
  chartData: ChartData,
  frame: ChartFrameRect,
): ResolvedChartAnnotations {
  const annotations = chartData.annotations ?? [];
  if (annotations.length === 0) {
    return { textAnnotations: [], connectors: [], labels: [] };
  }

  const layout = computeClassicChartLayout(chartData, {
    width: frame.width,
    height: frame.height,
  });
  const plotPx = layout?.plotAreaPx;
  const markRects = plotPx ? chartMarkRects(chartData, frame, plotPx) : [];

  const textAnnotations: ChartAnnotation[] = [];
  const connectors: PaperConnector[] = [];
  const labels: PaperText[] = [];

  for (const annotation of annotations) {
    const kind = annotation.kind ?? "text";
    if (kind === "text") {
      textAnnotations.push(annotation);
      continue;
    }
    if (!plotPx) continue;
    if (kind === "trendArrow") {
      const trend = annotation as ChartTrendArrowAnnotation;
      const start = resolveAnchor(trend.from, chartData, frame, plotPx);
      const end = resolveAnchor(trend.to, chartData, frame, plotPx);
      if (!start || !end) continue;
      const color = trend.color ?? DEFAULT_ANNOTATION_COLOR;
      const shifted = shiftLineAwayFromPlot(start, end, -TREND_ARROW_CLEARANCE_PX, frame, plotPx);
      connectors.push(makeArrow(shifted.start, shifted.end, color, trend.width ?? DEFAULT_ANNOTATION_WIDTH, trend.dashStyle));
      if (trend.label) {
        labels.push(
          makeLabel(
            trend.label,
            midpoint(shifted.start, shifted.end),
            trend.labelFontFamily,
            trend.labelFontSize,
            trend.labelColor ?? color,
            {
              clearance: TREND_LABEL_CLEARANCE_PX,
              avoidRects: markRects,
              plotBounds: plotBounds(frame, plotPx),
            },
          ),
        );
      }
    } else if (kind === "targetLine") {
      const tline = annotation as ChartTargetLineAnnotation;
      const yPx = valueToPx(tline.value, chartData, frame, plotPx);
      if (yPx === null) continue;
      const start = { x: frame.x + plotPx.left, y: yPx };
      const end = { x: frame.x + plotPx.left + plotPx.width, y: yPx };
      const color = tline.color ?? DEFAULT_ANNOTATION_COLOR;
      connectors.push(
        makeArrow(start, end, color, tline.width ?? 1, tline.dashStyle ?? "dashed", false),
      );
      if (tline.label) {
        labels.push(
          makeLabel(
            tline.label,
            { x: end.x, y: yPx },
            tline.labelFontFamily,
            tline.labelFontSize,
            tline.labelColor ?? color,
            {
              align: "right",
              avoidRectClearance: TARGET_LABEL_MARK_CLEARANCE_PX,
              avoidRects: markRects,
              clearance: TARGET_LABEL_CLEARANCE_PX,
              rightInset: TARGET_LABEL_RIGHT_INSET_PX,
              plotBounds: plotBounds(frame, plotPx),
            },
          ),
        );
      }
    }
  }

  return { textAnnotations, connectors, labels };
}

function resolveAnchor(
  anchor: ChartCategoryAnchor,
  chartData: ChartData,
  frame: ChartFrameRect,
  plotPx: NonNullable<ReturnType<typeof computeClassicChartLayout>>["plotAreaPx"],
): { x: number; y: number } | null {
  const categories = chartData.categories ?? [];
  if (categories.length === 0) return null;
  const series = chartData.series ?? [];
  const seriesIdx = anchor.seriesIndex ?? 0;
  const seriesValues = series[seriesIdx]?.values ?? [];

  // X position — column charts arrange bars horizontally across plot width.
  // For barDirection "bar" we'd swap axes; not yet supported here.
  const slotWidth = plotPx.width / categories.length;
  const x = frame.x + plotPx.left + slotWidth * (anchor.categoryIndex + 0.5);

  // Y position depends on anchor mode.
  let value: number;
  if (anchor.anchor === "barBottom") {
    value = chartData.valueAxis?.min ?? 0;
  } else if (anchor.anchor === "value") {
    if (typeof anchor.value !== "number") return null;
    value = anchor.value;
  } else {
    // default "barTop" — data value at this category (rounded to nearest int)
    const idx = Math.round(anchor.categoryIndex);
    if (idx < 0 || idx >= seriesValues.length) return null;
    value = seriesValues[idx];
  }

  const y = valueToPx(value, chartData, frame, plotPx);
  if (y === null) return null;
  return { x, y };
}

function valueToPx(
  value: number,
  chartData: ChartData,
  frame: ChartFrameRect,
  plotPx: { left: number; top: number; width: number; height: number },
): number | null {
  const range = inferValueRange(chartData);
  if (!range || range.max <= range.min) return null;
  const frac = (range.max - value) / (range.max - range.min);
  return frame.y + plotPx.top + frac * plotPx.height;
}

function inferValueRange(chartData: ChartData): { min: number; max: number } | null {
  const axisMin = chartData.valueAxis?.min;
  const axisMax = chartData.valueAxis?.max;
  if (typeof axisMin === "number" && typeof axisMax === "number") {
    return { min: axisMin, max: axisMax };
  }
  // Fall back to data range — symmetric axis isn't needed for our use,
  // but we pick the same defaults the chart engine would.
  let min = Infinity;
  let max = -Infinity;
  for (const series of chartData.series ?? []) {
    for (const v of series.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (typeof axisMin === "number") min = axisMin;
  if (typeof axisMax === "number") max = axisMax;
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function makeArrow(
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  width: number,
  dashStyle: "solid" | "dashed" | "dotted" | "dotDash" | undefined,
  arrowEnd = true,
): PaperConnector {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  return {
    type: "Connector",
    connectorType: "straight",
    start,
    end,
    lineWidth: width,
    lineColor: color,
    lineDashStyle: dashStyle ?? "solid",
    arrowEnd: arrowEnd ? true : undefined,
    style: {
      position: "absolute",
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    },
  } as PaperConnector;
}

function makeLabel(
  text: string,
  at: { x: number; y: number },
  fontFamily: string | undefined,
  fontSize: number | undefined,
  color: string,
  options?: {
    align?: "center" | "right";
    avoidRectClearance?: number;
    avoidRects?: Array<{ left: number; top: number; width: number; height: number }>;
    clearance?: number;
    rightInset?: number;
    plotBounds?: { left: number; top: number; right: number; bottom: number };
  },
): PaperText {
  const size = fontSize ?? DEFAULT_LABEL_FONT_SIZE;
  const width = Math.max(44, text.length * size * 0.64);
  const height = size * 1.45;
  const clearance = options?.clearance ?? 2;
  const rightInset = options?.rightInset ?? 0;
  const left = options?.align === "right"
    ? at.x - width - rightInset
    : at.x - width / 2;
  const minTop = options?.plotBounds ? options.plotBounds.top + 2 : -Infinity;
  let top = at.y - height - clearance;
  const labelRect = { left, top, width, height };
  const avoidRectClearance = options?.avoidRectClearance ?? clearance;
  for (const avoidRect of options?.avoidRects ?? []) {
    if (!rectsOverlapX(labelRect, avoidRect)) continue;
    top = Math.min(top, avoidRect.top - height - avoidRectClearance);
  }
  top = Math.max(minTop, top);
  return {
    type: "Text",
    content: text,
    style: {
      position: "absolute",
      left,
      top,
      width,
      height,
      fontFamily,
      fontSize: size,
      color,
      textAlign: options?.align === "right" ? "right" : "center",
    },
  } as PaperText;
}

function chartMarkRects(
  chartData: ChartData,
  frame: ChartFrameRect,
  plotPx: NonNullable<ReturnType<typeof computeClassicChartLayout>>["plotAreaPx"],
): Array<{ left: number; top: number; width: number; height: number }> {
  if (chartData.chartType !== "bar" || chartData.barDirection === "bar") return [];
  const categories = chartData.categories ?? [];
  const series = chartData.series ?? [];
  if (categories.length === 0 || series.length === 0) return [];
  const range = inferValueRange(chartData);
  if (!range) return [];
  const baselineValue = Math.min(range.max, Math.max(range.min, 0));
  const baseline = valueToPx(baselineValue, chartData, frame, plotPx);
  if (baseline === null) return [];
  const slotWidth = plotPx.width / categories.length;
  const barGroupWidth = slotWidth * 0.64;
  const barWidth = barGroupWidth / Math.max(1, series.length);
  const leftPad = (slotWidth - barGroupWidth) / 2;
  const rects: Array<{ left: number; top: number; width: number; height: number }> = [];
  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex += 1) {
      const value = series[seriesIndex]?.values?.[categoryIndex];
      if (typeof value !== "number") continue;
      const valueY = valueToPx(value, chartData, frame, plotPx);
      if (valueY === null) continue;
      const top = Math.min(valueY, baseline);
      const bottom = Math.max(valueY, baseline);
      rects.push({
        left: frame.x + plotPx.left + slotWidth * categoryIndex + leftPad + barWidth * seriesIndex,
        top,
        width: Math.max(1, barWidth),
        height: Math.max(1, bottom - top),
      });
    }
  }
  return rects;
}

function rectsOverlapX(
  a: { left: number; width: number },
  b: { left: number; width: number },
): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left;
}

function plotBounds(
  frame: ChartFrameRect,
  plotPx: NonNullable<ReturnType<typeof computeClassicChartLayout>>["plotAreaPx"],
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: frame.x + plotPx.left,
    top: frame.y + plotPx.top,
    right: frame.x + plotPx.left + plotPx.width,
    bottom: frame.y + plotPx.top + plotPx.height,
  };
}

function shiftLineAwayFromPlot(
  start: { x: number; y: number },
  end: { x: number; y: number },
  dy: number,
  frame: ChartFrameRect,
  plotPx: NonNullable<ReturnType<typeof computeClassicChartLayout>>["plotAreaPx"],
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const bounds = plotBounds(frame, plotPx);
  const minY = bounds.top + 4;
  const shift = (point: { x: number; y: number }) => ({
    x: point.x,
    y: Math.max(minY, point.y + dy),
  });
  return { start: shift(start), end: shift(end) };
}

function midpoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
