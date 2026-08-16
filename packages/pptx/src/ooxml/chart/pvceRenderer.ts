import type { ChartData, ThemeColorScheme, WaterfallData, XYSeries } from "../../types/ast.js";
import { getLogger } from "../../logger.js";
import { resolveColorToHex } from "./chartColorResolver.js";
import { normalizeWaterfallData } from "./waterfallCompat.js";

type PvceChartType = "bar" | "line" | "scatter" | "pie" | "donut" | "waterfall";

interface PvceRenderableChart {
  data: Record<string, unknown>;
  type: PvceChartType;
}

export interface PvceChartSvgOptions {
  height: number;
  prettyPrint?: boolean;
  width: number;
}

const THEME_PALETTE_TOKENS = [
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
] as const;

export function canRenderChartWithPvce(chartData: ChartData): boolean {
  return getPvceRenderableChart(chartData) !== undefined;
}

export async function renderChartToSvgWithPvce(
  chartData: ChartData,
  options: PvceChartSvgOptions,
  themeColors?: ThemeColorScheme,
): Promise<string | undefined> {
  const renderable = getPvceRenderableChart(chartData);
  if (!renderable) {
    return undefined;
  }

  try {
    const { chartToSVG } = await import("@runstamp/pvce");
    const svg = chartToSVG(renderable.type, renderable.data, {
      accessibility: true,
      fontFamily: chartData.title?.fontFamily ?? chartData.categoryAxis?.labelFont?.fontFamily ?? "Arial",
      fontSize: chartData.title?.fontSize ?? chartData.categoryAxis?.labelFont?.fontSize ?? 12,
      height: options.height,
      palette: buildThemePalette(themeColors),
      prettyPrint: options.prettyPrint ?? false,
      width: options.width,
    });
    return injectChartBackground(sanitizeSvgRoot(svg), chartData, themeColors);
  } catch (error) {
    getLogger().warn(
      `[rasterizer] PVCE chart rendering failed for ${chartData.chartType}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function sanitizeSvgRoot(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
    const normalizedAttrs = attrs
      .replace(/"(?=[A-Za-z_:][-A-Za-z0-9_:.]*=)/g, '" ')
      .replace(/\s+/g, " ")
      .trim();
    return normalizedAttrs.length > 0 ? `<svg ${normalizedAttrs}>` : "<svg>";
  });
}

function buildThemePalette(themeColors?: ThemeColorScheme): string[] | undefined {
  const palette = THEME_PALETTE_TOKENS
    .map((token) => resolveColorToHex(token, themeColors))
    .filter((value): value is string => Boolean(value));
  return palette.length > 0 ? palette : undefined;
}

function getPvceRenderableChart(chartData: ChartData): PvceRenderableChart | undefined {
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
      return undefined;
  }
}

function getPvceBarChart(chartData: ChartData): PvceRenderableChart | undefined {
  const categories = chartData.categories ?? [];
  const [firstSeries] = chartData.series ?? [];
  if (!firstSeries || categories.length === 0 || firstSeries.values.length !== categories.length) {
    return undefined;
  }
  if (chartData.series && chartData.series.length > 1) {
    return undefined;
  }
  if (chartData.barDirection === "bar") {
    return undefined;
  }
  if (chartData.barGrouping && chartData.barGrouping !== "clustered") {
    return undefined;
  }

  return {
    data: {
      categories,
      series: [{ name: firstSeries.name, values: firstSeries.values }],
      values: firstSeries.values,
    },
    type: "bar",
  };
}

function getPvceLineChart(chartData: ChartData): PvceRenderableChart | undefined {
  const categories = chartData.categories ?? [];
  const series = chartData.series ?? [];
  if (series.length === 0 || categories.length === 0) {
    return undefined;
  }
  if (series.some((entry) => entry.values.length !== categories.length)) {
    return undefined;
  }
  if (chartData.smooth || chartData.lineGrouping === "stacked" || chartData.lineGrouping === "percentStacked") {
    return undefined;
  }

  return {
    data: {
      categories,
      series: series.map((entry) => ({ name: entry.name, values: entry.values })),
    },
    type: "line",
  };
}

function getPvceScatterChart(chartData: ChartData): PvceRenderableChart | undefined {
  const series = chartData.xySeries ?? [];
  if (series.length === 0) {
    return undefined;
  }

  return {
    data: {
      points: flattenScatterSeries(series),
    },
    type: "scatter",
  };
}

function flattenScatterSeries(series: XYSeries[]): Array<{ label: string; x: number; y: number }> {
  return series.flatMap((entry, seriesIndex) =>
    entry.dataPoints.map((point, pointIndex) => ({
      label: pointLabel(entry.name, seriesIndex, pointIndex),
      x: point.x,
      y: point.y,
    })),
  );
}

function pointLabel(name: string | undefined, seriesIndex: number, pointIndex: number): string {
  if (name) {
    return `${name} ${pointIndex + 1}`;
  }
  return `Series ${seriesIndex + 1} Point ${pointIndex + 1}`;
}

function getPvcePieChart(chartData: ChartData, type: "pie" | "donut"): PvceRenderableChart | undefined {
  const categories = chartData.categories ?? [];
  const [firstSeries] = chartData.series ?? [];
  if (!firstSeries || categories.length === 0 || firstSeries.values.length !== categories.length) {
    return undefined;
  }
  if (chartData.series && chartData.series.length > 1) {
    return undefined;
  }

  return {
    data: {
      categories,
      values: firstSeries.values,
    },
    type,
  };
}

function getPvceWaterfallChart(chartData: ChartData): PvceRenderableChart | undefined {
  const normalized = normalizeWaterfallData(chartData);
  if (!normalized) {
    return undefined;
  }

  return {
    data: {
      categories: normalized.categories,
      isTotal: toWaterfallFlags(normalized),
      values: normalized.values,
    },
    type: "waterfall",
  };
}

function toWaterfallFlags(data: WaterfallData): boolean[] {
  const totals = new Set(data.totalIndices ?? []);
  return data.values.map((_, index) => totals.has(index));
}

function injectChartBackground(
  svg: string,
  chartData: ChartData,
  themeColors?: ThemeColorScheme,
): string {
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
    `<svg$1><rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`,
  );
}

function resolveChartBackground(
  chartData: ChartData,
  themeColors?: ThemeColorScheme,
): string | undefined {
  return resolveColorToHex(chartData.chartArea?.fill, themeColors)
    ?? resolveColorToHex(chartData.plotArea?.fill, themeColors)
    ?? "#FFFFFF";
}
