import { CHART_TYPES } from "../../types/literals.js";
import type { ChartType } from "../../types/ast.js";

export type ChartFamily = "classic" | "chartex";
export type ChartExcelLayout =
  | "standard"
  | "xy"
  | "waterfall"
  | "stock"
  | "funnel"
  | "hierarchy"
  | "histogram"
  | "boxWhisker";

export interface ChartCapabilityProfile {
  chartType: ChartType;
  family: ChartFamily;
  excelLayout: ChartExcelLayout;
  usesClassicAxes: boolean;
  usesValueAxesOnly: boolean;
  isPieLike: boolean;
  supportsPerSeriesMarker: boolean;
  usesSyntheticSpacerSeries: boolean;
}

const CHART_TYPE_SET = new Set<ChartType>(CHART_TYPES);

const CHART_CAPABILITIES: Record<ChartType, Omit<ChartCapabilityProfile, "chartType">> = {
  bar: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  line: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false,
  },
  pie: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: true,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  scatter: {
    family: "classic",
    excelLayout: "xy",
    usesClassicAxes: false,
    usesValueAxesOnly: true,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false,
  },
  bubble: {
    family: "classic",
    excelLayout: "xy",
    usesClassicAxes: false,
    usesValueAxesOnly: true,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false,
  },
  area: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  doughnut: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: true,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  radar: {
    family: "classic",
    excelLayout: "standard",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: true,
    usesSyntheticSpacerSeries: false,
  },
  waterfall: {
    family: "classic",
    excelLayout: "waterfall",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: true,
  },
  stock: {
    family: "classic",
    excelLayout: "stock",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  funnel: {
    family: "classic",
    excelLayout: "funnel",
    usesClassicAxes: true,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: true,
  },
  treemap: {
    family: "chartex",
    excelLayout: "hierarchy",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  sunburst: {
    family: "chartex",
    excelLayout: "hierarchy",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  histogram: {
    family: "chartex",
    excelLayout: "histogram",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
  boxWhisker: {
    family: "chartex",
    excelLayout: "boxWhisker",
    usesClassicAxes: false,
    usesValueAxesOnly: false,
    isPieLike: false,
    supportsPerSeriesMarker: false,
    usesSyntheticSpacerSeries: false,
  },
};

export function isKnownChartType(value: string): value is ChartType {
  return CHART_TYPE_SET.has(value as ChartType);
}

export function getChartCapabilityProfile(chartType: ChartType): ChartCapabilityProfile {
  return {
    chartType,
    ...CHART_CAPABILITIES[chartType],
  };
}

export function isChartExType(chartType: string): boolean {
  return isKnownChartType(chartType)
    ? CHART_CAPABILITIES[chartType].family === "chartex"
    : false;
}

export function isXYChartType(chartType: ChartType): boolean {
  return CHART_CAPABILITIES[chartType].excelLayout === "xy";
}

export function usesClassicAxes(chartType: ChartType): boolean {
  return CHART_CAPABILITIES[chartType].usesClassicAxes;
}

export function usesValueAxesOnly(chartType: ChartType): boolean {
  return CHART_CAPABILITIES[chartType].usesValueAxesOnly;
}

export function isPieLikeChartType(chartType: ChartType): boolean {
  return CHART_CAPABILITIES[chartType].isPieLike;
}

export function getChartExcelLayout(chartType: ChartType): ChartExcelLayout {
  return CHART_CAPABILITIES[chartType].excelLayout;
}

export function supportsPerSeriesMarker(chartType: ChartType): boolean {
  return CHART_CAPABILITIES[chartType].supportsPerSeriesMarker;
}

export function usesSyntheticSpacerSeries(chartType: ChartType): boolean {
  return CHART_CAPABILITIES[chartType].usesSyntheticSpacerSeries;
}
