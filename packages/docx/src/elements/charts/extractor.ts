/**
 * Chart Extractor for DOCX
 * ========================
 * Utilities for extracting and processing chart data from ChartElement.
 */

import type {
  ChartElement,
  ChartSeries,
  ChartType,
  LegendConfig,
  AxesConfig,
} from '../../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extracted chart data in a normalized format.
 */
export interface ExtractedChart {
  /** Element ID */
  id: string;

  /** Chart type */
  chartType: ChartType;

  /** Chart title */
  title?: string;

  /** Data series */
  series: ExtractedSeries[];

  /** Category labels */
  categories: string[];

  /** Legend configuration */
  legend?: LegendConfig;

  /** Axes configuration */
  axes?: AxesConfig;

  /** Should embed data in Office format */
  embedData: boolean;

  /** Computed statistics */
  stats: ChartStatistics;
}

/**
 * Extracted data series.
 */
export interface ExtractedSeries {
  /** Series name */
  name: string;

  /** Data values (one per category) */
  values: number[];

  /** Series color (hex without #) */
  color?: string;

  /** Computed series statistics */
  stats: SeriesStatistics;
}

/**
 * Chart-level statistics.
 */
export interface ChartStatistics {
  /** Number of data series */
  seriesCount: number;

  /** Number of categories */
  categoryCount: number;

  /** Total data points across all series */
  totalDataPoints: number;

  /** Global minimum value */
  minValue: number;

  /** Global maximum value */
  maxValue: number;

  /** Global average value */
  avgValue: number;

  /** Global sum of values */
  sumValue: number;
}

/**
 * Series-level statistics.
 */
export interface SeriesStatistics {
  /** Minimum value in series */
  min: number;

  /** Maximum value in series */
  max: number;

  /** Average value in series */
  avg: number;

  /** Sum of values in series */
  sum: number;

  /** Number of data points */
  count: number;
}

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Extract and normalize chart data from a ChartElement.
 */
export function extractChart(element: ChartElement): ExtractedChart {
  // Get categories (from element or from first series indices)
  const categories = element.categories ??
    (element.series[0]?.values.map((_, i) => `Category ${i + 1}`) ?? []);

  // Extract and compute statistics for each series
  const extractedSeries: ExtractedSeries[] = element.series.map(series =>
    extractSeries(series, categories.length)
  );

  // Compute chart-level statistics
  const stats = computeChartStatistics(extractedSeries, categories.length);

  return {
    id: element.id,
    chartType: element.chartType,
    title: element.title,
    series: extractedSeries,
    categories,
    legend: element.legend,
    axes: element.axes,
    embedData: element.embedData,
    stats,
  };
}

/**
 * Extract a single series with statistics.
 */
function extractSeries(series: ChartSeries, expectedLength: number): ExtractedSeries {
  // Normalize values array to expected length
  const values = [...series.values];
  while (values.length < expectedLength) {
    values.push(0);
  }
  if (values.length > expectedLength) {
    values.length = expectedLength;
  }

  // Compute series statistics
  const stats = computeSeriesStatistics(values);

  return {
    name: series.name,
    values,
    color: series.color?.replace('#', ''),
    stats,
  };
}

/**
 * Compute statistics for a series.
 */
function computeSeriesStatistics(values: number[]): SeriesStatistics {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (numericValues.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: values.length };
  }

  const sum = numericValues.reduce((a, b) => a + b, 0);

  return {
    min: Math.min(...numericValues),
    max: Math.max(...numericValues),
    avg: sum / numericValues.length,
    sum,
    count: values.length,
  };
}

/**
 * Compute chart-level statistics from extracted series.
 */
function computeChartStatistics(
  series: ExtractedSeries[],
  categoryCount: number
): ChartStatistics {
  const seriesCount = series.length;
  const totalDataPoints = series.reduce((sum, s) => sum + s.values.length, 0);

  // Collect all values
  let allValues: number[] = [];
  for (const s of series) {
    allValues = allValues.concat(s.values.filter(v => typeof v === 'number' && !isNaN(v)));
  }

  if (allValues.length === 0) {
    return {
      seriesCount,
      categoryCount,
      totalDataPoints,
      minValue: 0,
      maxValue: 0,
      avgValue: 0,
      sumValue: 0,
    };
  }

  const sumValue = allValues.reduce((a, b) => a + b, 0);

  return {
    seriesCount,
    categoryCount,
    totalDataPoints,
    minValue: Math.min(...allValues),
    maxValue: Math.max(...allValues),
    avgValue: sumValue / allValues.length,
    sumValue,
  };
}

// =============================================================================
// CHART TYPE UTILITIES
// =============================================================================

/**
 * Check if chart type is categorical (has categories on X-axis).
 */
export function isCategoricalChart(chartType: ChartType): boolean {
  return ['bar', 'column', 'line', 'area', 'radar'].includes(chartType);
}

/**
 * Check if chart type is circular (pie, doughnut).
 */
export function isCircularChart(chartType: ChartType): boolean {
  return ['pie', 'doughnut'].includes(chartType);
}

/**
 * Check if chart type uses two value axes (scatter, bubble).
 */
export function isXYChart(chartType: ChartType): boolean {
  return ['scatter', 'bubble'].includes(chartType);
}

/**
 * Get recommended number of visible categories for chart type.
 */
export function getRecommendedCategoryLimit(chartType: ChartType): number {
  switch (chartType) {
    case 'pie':
    case 'doughnut':
      return 8; // Too many slices becomes unreadable
    case 'radar':
      return 12;
    case 'bar':
      return 15;
    default:
      return 20;
  }
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Convert chart data to CSV format.
 */
export function chartToCSV(chart: ExtractedChart): string {
  const lines: string[] = [];

  // Header row
  const header = ['Category', ...chart.series.map(s => s.name)];
  lines.push(header.join(','));

  // Data rows
  for (let i = 0; i < chart.categories.length; i++) {
    const row = [
      `"${chart.categories[i].replace(/"/g, '""')}"`,
      ...chart.series.map(s => s.values[i]?.toString() ?? ''),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Convert chart data to simple text description.
 */
export function chartToDescription(chart: ExtractedChart): string {
  const lines: string[] = [];

  // Title and type
  if (chart.title) {
    lines.push(`${chart.title}`);
  }
  lines.push(`Type: ${chart.chartType}`);
  lines.push('');

  // Statistics
  lines.push(`Statistics:`);
  lines.push(`  Series: ${chart.stats.seriesCount}`);
  lines.push(`  Categories: ${chart.stats.categoryCount}`);
  lines.push(`  Data points: ${chart.stats.totalDataPoints}`);
  lines.push(`  Range: ${chart.stats.minValue.toFixed(2)} to ${chart.stats.maxValue.toFixed(2)}`);
  lines.push(`  Average: ${chart.stats.avgValue.toFixed(2)}`);
  lines.push('');

  // Series breakdown
  lines.push('Series:');
  for (const series of chart.series) {
    lines.push(`  ${series.name}:`);
    lines.push(`    Sum: ${series.stats.sum.toFixed(2)}`);
    lines.push(`    Avg: ${series.stats.avg.toFixed(2)}`);
    lines.push(`    Range: ${series.stats.min.toFixed(2)} to ${series.stats.max.toFixed(2)}`);
  }

  return lines.join('\n');
}

/**
 * Get top N values from a chart (useful for pie chart summaries).
 */
export function getTopValues(
  chart: ExtractedChart,
  n: number = 5,
  seriesIndex: number = 0
): Array<{ category: string; value: number; percentage: number }> {
  if (seriesIndex >= chart.series.length) {
    return [];
  }

  const series = chart.series[seriesIndex];
  const total = series.stats.sum;

  // Pair categories with values
  const paired = chart.categories.map((category, i) => ({
    category,
    value: series.values[i] ?? 0,
  }));

  // Sort by value descending and take top N
  const sorted = paired.sort((a, b) => b.value - a.value).slice(0, n);

  // Calculate percentages
  return sorted.map(item => ({
    category: item.category,
    value: item.value,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate chart element data.
 */
export function validateChart(element: ChartElement): string[] {
  const errors: string[] = [];

  if (!element.series || element.series.length === 0) {
    errors.push('Chart must have at least one data series');
  }

  for (const series of element.series) {
    if (!series.name) {
      errors.push('Each series must have a name');
    }
    if (!series.values || series.values.length === 0) {
      errors.push(`Series "${series.name}" has no data values`);
    }
  }

  // Check for consistent value counts across series
  if (element.series.length > 1) {
    const firstCount = element.series[0].values.length;
    for (let i = 1; i < element.series.length; i++) {
      if (element.series[i].values.length !== firstCount) {
        errors.push(`Series "${element.series[i].name}" has ${element.series[i].values.length} values but first series has ${firstCount}`);
      }
    }
  }

  // Check categories match value count
  if (element.categories && element.series.length > 0) {
    const valueCount = element.series[0].values.length;
    if (element.categories.length !== valueCount) {
      errors.push(`Categories count (${element.categories.length}) doesn't match values count (${valueCount})`);
    }
  }

  return errors;
}
