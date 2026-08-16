import type { ChartData, WaterfallData } from "../../types/ast.js";

type LegacyWaterfallData = Partial<WaterfallData> & {
  subtotalIndices?: number[];
  subtotalColor?: string;
};

export function normalizeWaterfallData(chartData: ChartData): WaterfallData | undefined {
  const raw = chartData.waterfallData as LegacyWaterfallData | undefined;
  if (!raw) return undefined;

  const categories = raw.categories ?? chartData.categories ?? [];
  const values = raw.values ?? chartData.series?.[0]?.values ?? [];

  if (categories.length === 0 || values.length === 0 || categories.length !== values.length) {
    return undefined;
  }

  return {
    categories,
    values,
    totalIndices: raw.totalIndices ?? raw.subtotalIndices,
    increaseColor: raw.increaseColor,
    decreaseColor: raw.decreaseColor,
    totalColor: raw.totalColor ?? raw.subtotalColor,
    connectorLines: raw.connectorLines,
  };
}
