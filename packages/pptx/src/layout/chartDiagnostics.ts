import type { ChartData, PaperChart } from "../types/ast.js";
import { computeClassicChartLayout } from "../ooxml/chart/chartLayout.js";
import { resolveChartAnnotations } from "../ooxml/chart/resolveAnnotations.js";
import type { Rect } from "./absoluteSafety.js";

export interface ChartDiagnosticBox {
  kind: "plotArea" | "legend" | "title" | "annotationLabel" | "categoryAxisBand";
  rect: Rect;
  label?: string;
}

export interface ChartFitDiagnostics {
  chartType: ChartData["chartType"];
  plotArea?: Rect;
  legendBox?: Rect;
  titleBox?: Rect;
  categoryAxisBand?: Rect;
  annotationBoxes: ChartDiagnosticBox[];
  boxes: ChartDiagnosticBox[];
  labelCollisionRisk: boolean;
  legendMarginRisk: boolean;
  annotationCollisionRisk: boolean;
  issues: Array<{
    code: "CHART_LABEL_COLLISION" | "CHART_LEGEND_COLLISION" | "CHART_ANNOTATION_COLLISION";
    message: string;
    rect: Rect;
    relatedRect?: Rect;
  }>;
}

const MIN_LEGEND_MARGIN = 6;
const CATEGORY_LABEL_WIDTH_FACTOR = 0.55;
const DATA_LABEL_MIN_SLOT_WIDTH = 18;

function absoluteRect(frame: Rect, box: { left: number; top: number; width: number; height: number }): Rect {
  return {
    left: frame.left + box.left,
    top: frame.top + box.top,
    width: box.width,
    height: box.height,
  };
}

function styleRect(style: PaperChart["style"]): Rect | null {
  if (
    style?.position !== "absolute" ||
    typeof style.left !== "number" ||
    typeof style.top !== "number" ||
    typeof style.width !== "number" ||
    typeof style.height !== "number"
  ) {
    return null;
  }
  return { left: style.left, top: style.top, width: style.width, height: style.height };
}

function gapBetween(a: Rect, b: Rect, axis: "x" | "y"): number {
  if (axis === "y") {
    if (a.top + a.height <= b.top) return b.top - (a.top + a.height);
    if (b.top + b.height <= a.top) return a.top - (b.top + b.height);
    return -1;
  }
  if (a.left + a.width <= b.left) return b.left - (a.left + a.width);
  if (b.left + b.width <= a.left) return a.left - (b.left + b.width);
  return -1;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CATEGORY_LABEL_WIDTH_FACTOR;
}

function categoryLabelRisk(chartData: ChartData, plotArea: Rect): boolean {
  if (!chartData.categories?.length || chartData.categoryAxis?.visible === false) return false;
  const slotWidth = plotArea.width / chartData.categories.length;
  const fontSize = chartData.categoryAxis?.labelFont?.fontSize ?? chartData.categoryAxis?.fontSize ?? 10;
  const rotation = Math.abs(chartData.categoryAxis?.labelRotation ?? 0);
  const rotationRelief = rotation >= 35 ? 1.8 : 1;
  return chartData.categories.some((category) =>
    estimateTextWidth(String(category), fontSize) > slotWidth * 1.35 * rotationRelief,
  );
}

function dataLabelRisk(chartData: ChartData, plotArea: Rect): boolean {
  const chartLabels = chartData.dataLabels;
  const series = chartData.series ?? [];
  const hasLabels = Boolean(
    chartLabels?.showVal ||
    chartLabels?.showCatName ||
    chartLabels?.showSerName ||
    series.some((item) => item.dataLabels?.showVal || item.dataLabels?.showCatName || item.dataLabels?.showSerName),
  );
  if (!hasLabels || series.length === 0) return false;
  const categories = Math.max(chartData.categories?.length ?? 0, Math.max(...series.map((item) => item.values.length), 0));
  if (categories === 0) return false;
  const slotWidth = plotArea.width / Math.max(1, categories * Math.max(1, series.length));
  const fontSize = chartLabels?.fontSize ?? 10;
  return slotWidth < Math.max(DATA_LABEL_MIN_SLOT_WIDTH, fontSize * 1.6);
}

function inferCategoryAxisBand(frame: Rect, plotArea: Rect, legendBox?: Rect): Rect | undefined {
  const bottomLimit = legendBox?.top ?? (frame.top + frame.height);
  const top = plotArea.top + plotArea.height;
  const height = bottomLimit - top;
  if (height <= 4) return undefined;
  return {
    left: plotArea.left,
    top,
    width: plotArea.width,
    height,
  };
}

export function collectChartFitDiagnostics(chart: PaperChart, frameOverride?: Rect): ChartFitDiagnostics | undefined {
  const frame = frameOverride ?? styleRect(chart.style);
  if (!frame || frame.width <= 0 || frame.height <= 0) return undefined;
  const layout = computeClassicChartLayout(chart.chartData, { width: frame.width, height: frame.height });
  if (!layout) return undefined;

  const plotArea = absoluteRect(frame, layout.plotAreaPx);
  const legendBox = layout.legendBox ? absoluteRect(frame, layout.legendBox) : undefined;
  const titleBox = layout.titleBox ? absoluteRect(frame, layout.titleBox) : undefined;
  const categoryAxisBand = chart.chartData.chartType !== "pie" && chart.chartData.chartType !== "doughnut"
    ? inferCategoryAxisBand(frame, plotArea, legendBox)
    : undefined;

  const boxes: ChartDiagnosticBox[] = [{ kind: "plotArea", rect: plotArea, label: "plot" }];
  if (legendBox) boxes.push({ kind: "legend", rect: legendBox, label: "legend" });
  if (titleBox) boxes.push({ kind: "title", rect: titleBox, label: "title" });
  if (categoryAxisBand) boxes.push({ kind: "categoryAxisBand", rect: categoryAxisBand, label: "x-axis labels" });

  const resolved = resolveChartAnnotations(chart.chartData, {
    x: frame.left,
    y: frame.top,
    width: frame.width,
    height: frame.height,
  });
  const annotationBoxes = resolved.labels.map((label): ChartDiagnosticBox | null => {
    const style = label.style;
    if (
      typeof style?.left !== "number" ||
      typeof style.top !== "number" ||
      typeof style.width !== "number" ||
      typeof style.height !== "number"
    ) {
      return null;
    }
    return {
      kind: "annotationLabel",
      rect: { left: style.left, top: style.top, width: style.width, height: style.height },
      label: typeof label.content === "string" ? label.content : "annotation",
    };
  }).filter((box): box is ChartDiagnosticBox => box !== null);
  boxes.push(...annotationBoxes);

  const issues: ChartFitDiagnostics["issues"] = [];
  const legendMarginRisk = Boolean(legendBox && (
    (layout.legendPosition === "bottom" && (
      rectsOverlap(plotArea, legendBox) ||
      (categoryAxisBand !== undefined && categoryAxisBand.height < MIN_LEGEND_MARGIN)
    )) ||
    (layout.legendPosition === "top" && gapBetween(legendBox, plotArea, "y") < MIN_LEGEND_MARGIN) ||
    ((layout.legendPosition === "left" || layout.legendPosition === "right") && gapBetween(legendBox, plotArea, "x") < MIN_LEGEND_MARGIN)
  ));
  if (legendMarginRisk && legendBox) {
    issues.push({
      code: "CHART_LEGEND_COLLISION",
      message: "Chart legend has insufficient margin from the plot or category-axis label band.",
      rect: legendBox,
      relatedRect: categoryAxisBand ?? plotArea,
    });
  }

  const labelCollisionRisk = categoryLabelRisk(chart.chartData, plotArea) || dataLabelRisk(chart.chartData, plotArea);
  if (labelCollisionRisk) {
    issues.push({
      code: "CHART_LABEL_COLLISION",
      message: "Chart labels are likely to collide or wrap because available slot width is too small.",
      rect: categoryAxisBand ?? plotArea,
      relatedRect: plotArea,
    });
  }

  let annotationCollisionRisk = false;
  for (const annotation of annotationBoxes) {
    const hit = [legendBox, titleBox].some((box) => box && rectsOverlap(annotation.rect, box));
    if (hit) {
      annotationCollisionRisk = true;
      issues.push({
        code: "CHART_ANNOTATION_COLLISION",
        message: "Chart annotation label overlaps the title or legend area.",
        rect: annotation.rect,
        relatedRect: legendBox && rectsOverlap(annotation.rect, legendBox) ? legendBox : titleBox,
      });
    }
  }

  return {
    chartType: chart.chartData.chartType,
    plotArea,
    legendBox,
    titleBox,
    categoryAxisBand,
    annotationBoxes,
    boxes,
    labelCollisionRisk,
    legendMarginRisk,
    annotationCollisionRisk,
    issues,
  };
}
