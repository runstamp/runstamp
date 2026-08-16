/**
 * Chart Image Generator
 * ======================
 * Provides utilities for converting chart data to images.
 *
 * Since OOXML native charts require embedded Excel workbooks (very complex),
 * we use an image-based approach that is:
 * - Simpler to implement
 * - More consistent across Word versions
 * - Works in PDF exports
 *
 * This module provides:
 * 1. A callback-based chart renderer interface
 * 2. Simple SVG chart generation (inline, no dependencies)
 * 3. Integration with the main chart renderer
 */

import type { ChartElement, ChartType } from '../../types';
import { escapeXml } from '../../utils/xml.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Chart image data ready for embedding.
 */
export interface ChartImageData {
  /** Image data as base64 data URI or Buffer */
  data: string | Buffer;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Image format */
  format: 'png' | 'jpg' | 'gif' | 'svg';
}

/**
 * Chart renderer function signature.
 * Implement this to provide custom chart rendering.
 *
 * @param element - The chart element to render
 * @returns Promise resolving to chart image data, or null if rendering not possible
 *
 * @example
 * // Using Chart.js with canvas
 * const renderer: ChartRenderer = async (element) => {
 *   const canvas = createCanvas(400, 300);
 *   const chart = new Chart(canvas, { ... });
 *   return {
 *     data: canvas.toBuffer('image/png'),
 *     width: 400,
 *     height: 300,
 *     format: 'png'
 *   };
 * };
 */
export type ChartRenderer = (element: ChartElement) => Promise<ChartImageData | null>;

/**
 * Registry of chart renderers by chart type.
 */
export interface ChartRendererRegistry {
  /** Default renderer for all chart types */
  default?: ChartRenderer;
  /** Specific renderers by chart type */
  byType?: Partial<Record<ChartType, ChartRenderer>>;
}

// =============================================================================
// DEFAULT RENDERERS
// =============================================================================

/**
 * Global chart renderer registry.
 * Users can register their own renderers here.
 */
let globalRendererRegistry: ChartRendererRegistry = {};

/**
 * Register a chart renderer globally.
 */
export function registerChartRenderer(
  renderer: ChartRenderer,
  chartType?: ChartType
): void {
  if (chartType) {
    if (!globalRendererRegistry.byType) {
      globalRendererRegistry.byType = {};
    }
    globalRendererRegistry.byType[chartType] = renderer;
  } else {
    globalRendererRegistry.default = renderer;
  }
}

/**
 * Clear all registered chart renderers.
 */
export function clearChartRenderers(): void {
  globalRendererRegistry = {};
}

/**
 * Get the appropriate renderer for a chart element.
 */
export function getChartRenderer(element: ChartElement): ChartRenderer | undefined {
  // Check for type-specific renderer first
  if (globalRendererRegistry.byType?.[element.chartType]) {
    return globalRendererRegistry.byType[element.chartType];
  }
  // Fall back to default renderer
  return globalRendererRegistry.default;
}

/**
 * Render a chart element using registered renderers.
 */
export async function renderChartToImage(
  element: ChartElement
): Promise<ChartImageData | null> {
  const renderer = getChartRenderer(element);
  if (!renderer) {
    return null;
  }
  return renderer(element);
}

// =============================================================================
// SIMPLE SVG CHART GENERATION
// =============================================================================

/**
 * SVG chart options.
 */
export interface SVGChartOptions {
  width?: number;
  height?: number;
  padding?: number;
  backgroundColor?: string;
  colors?: string[];
  showLegend?: boolean;
  showValues?: boolean;
  titleFontSize?: number;
  labelFontSize?: number;
  fontFamily?: string;
}

const DEFAULT_SVG_OPTIONS: Required<SVGChartOptions> = {
  width: 400,
  height: 300,
  padding: 40,
  backgroundColor: '#FFFFFF',
  colors: ['#2563EB', '#EA580C', '#059669', '#7C3AED', '#DC2626', '#0891B2', '#BE185D', '#475569'],
  showLegend: true,
  showValues: false,
  titleFontSize: 14,
  labelFontSize: 10,
  fontFamily: 'Calibri',
};

function seriesColor(element: ChartElement, index: number, colors: string[]): string {
  const explicit = element.series[index]?.color;
  if (explicit) {
    return explicit.startsWith('#') ? explicit : `#${explicit}`;
  }
  return colors[index % colors.length];
}

/**
 * Format a number for axis display.
 * Uses compact notation for large numbers (1K, 1M, etc.)
 */
function formatAxisValue(value: number): string {
  if (value === 0) return '0';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  if (absValue < 1) {
    return value.toFixed(2);
  }
  if (absValue < 10) {
    return value.toFixed(1).replace(/\.0$/, '');
  }
  return Math.round(value).toString();
}

/**
 * Truncate a label so it visually fits inside `maxWidthPx`.
 *
 * Uses a coarse glyph-width estimate (`fontSize * 0.6`) — accurate enough
 * for the proportional sans-serif used in the SVG fallback. Without this
 * guard, long category labels in bar/column/line/area charts overlap
 * each other on the X axis (`outputs/docx-sota/phase-5-charts/F-DX-CH-007`
 * showed `Enterprise — North AmericaEnterprise — Europe ...` running
 * together as one streak of glyphs).
 */
function truncateLabelToFit(label: string, maxWidthPx: number, fontSize: number): string {
  if (!label || maxWidthPx <= 0) return label;
  const approxCharWidth = fontSize * 0.6;
  const maxChars = Math.max(1, Math.floor(maxWidthPx / approxCharWidth));
  if (label.length <= maxChars) return label;
  if (maxChars <= 1) return '…';
  return `${label.slice(0, maxChars - 1)}…`;
}

function categoryLabelsNeedRotation(
  labels: string[],
  availableWidthPx: number,
  fontSize: number
): boolean {
  const approxCharWidth = fontSize * 0.6;
  return labels.some(label => label.length * approxCharWidth > availableWidthPx);
}

/**
 * Calculate nice axis tick values.
 * Returns an array of values for the axis labels.
 */
function calculateAxisTicks(minValue: number, maxValue: number, tickCount: number = 5): number[] {
  const range = maxValue - minValue;
  if (range === 0) return [0];

  // Calculate nice step size
  const roughStep = range / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  // Calculate nice min/max
  const niceMin = Math.floor(minValue / niceStep) * niceStep;
  const niceMax = Math.ceil(maxValue / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
    ticks.push(tick);
  }

  return ticks;
}

/**
 * Generate a simple SVG representation of a chart.
 * This produces an SVG string that can be displayed or converted to PNG.
 *
 * Note: SVG cannot be directly embedded in DOCX. This is useful for:
 * - Previewing charts
 * - Converting to PNG via external tools (sharp, canvas, etc.)
 * - Documentation
 */
export function generateChartSVG(
  element: ChartElement,
  options: SVGChartOptions = {}
): string {
  const opts = {
    ...DEFAULT_SVG_OPTIONS,
    ...options,
    fontFamily: options.fontFamily ?? element.style?.fontFamily ?? DEFAULT_SVG_OPTIONS.fontFamily,
  };

  switch (element.chartType) {
    case 'bar':
      return generateHorizontalBarChartSVG(element, opts);
    case 'column':
      return generateBarChartSVG(element, opts);
    case 'line':
      return generateLineChartSVG(element, opts);
    case 'area':
      return generateAreaChartSVG(element, opts);
    case 'pie':
    case 'doughnut':
      return generatePieChartSVG(element, opts);
    case 'scatter':
    case 'bubble':
      return generateScatterChartSVG(element, opts);
    case 'radar':
      return generateRadarChartSVG(element, opts);
    default:
      return generateBarChartSVG(element, opts); // Fallback to column
  }
}

/**
 * Generate a bar/column chart SVG.
 */
function generateBarChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  // Add left margin for Y-axis labels
  const yAxisLabelWidth = 35;
  const chartWidth = width - padding * 2 - yAxisLabelWidth;
  const chartLeft = padding + yAxisLabelWidth;
  const chartHeight = height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 30 : 0);
  const chartTop = padding + (element.title ? titleFontSize + 10 : 0);

  const categories = element.categories ?? element.series[0]?.values.map((_, i) => `${i + 1}`) ?? [];
  const seriesCount = element.series.length;
  const categoryCount = categories.length;

  if (categoryCount === 0 || seriesCount === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  // Calculate bar dimensions
  const groupWidth = chartWidth / categoryCount;
  const barWidth = (groupWidth * 0.8) / seriesCount;
  const barGap = groupWidth * 0.1;
  const rotateCategoryLabels = categoryLabelsNeedRotation(categories, groupWidth - 2, labelFontSize);

  // Find value range
  const allValues = element.series.flatMap(s => s.values);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);

  // Calculate nice axis ticks
  const ticks = calculateAxisTicks(minValue, maxValue);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1];
  const valueRange = tickMax - tickMin || 1;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Grid lines and Y-axis labels
  const axisY = chartTop + chartHeight;
  for (const tick of ticks) {
    const y = axisY - ((tick - tickMin) / valueRange) * chartHeight;
    svg += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
    svg += `<text x="${chartLeft - 5}" y="${y + 4}" text-anchor="end" font-size="${labelFontSize - 1}" fill="#666">${formatAxisValue(tick)}</text>`;
  }

  // Axes
  svg += `<line x1="${chartLeft}" y1="${axisY}" x2="${chartLeft + chartWidth}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;
  svg += `<line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;

  // Bars
  for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
    const groupX = chartLeft + catIdx * groupWidth + barGap;

    for (let serIdx = 0; serIdx < seriesCount; serIdx++) {
      const value = element.series[serIdx].values[catIdx] ?? 0;
      const barHeight = ((value - tickMin) / valueRange) * chartHeight;
      const barX = groupX + serIdx * barWidth;
      const barY = axisY - barHeight;
      const color = seriesColor(element, serIdx, colors);

      svg += `<rect x="${barX}" y="${barY}" width="${barWidth - 2}" height="${barHeight}" fill="${color}"/>`;
    }

    // Preserve exact category names. When the horizontal slot is too narrow,
    // rotate the full labels instead of replacing identifying text with an
    // ellipsis. Short labels remain horizontal.
    const labelX = groupX + (groupWidth - barGap * 2) / 2;
    const labelY = axisY + labelFontSize + 5;
    const textAnchor = rotateCategoryLabels ? 'end' : 'middle';
    const transform = rotateCategoryLabels ? ` transform="rotate(-35 ${labelX} ${labelY})"` : '';
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="${textAnchor}" font-size="${labelFontSize}"${transform}>${escapeXml(categories[catIdx])}</text>`;
  }

  // Legend
  if (showLegend && seriesCount > 0) {
    const legendY = height - 15;
    const legendItemWidth = chartWidth / seriesCount;

    for (let i = 0; i < seriesCount; i++) {
      const legendX = chartLeft + i * legendItemWidth;
      const color = seriesColor(element, i, colors);
      svg += `<rect x="${legendX}" y="${legendY - 8}" width="12" height="12" fill="${color}"/>`;
      svg += `<text x="${legendX + 16}" y="${legendY}" font-size="${labelFontSize}">${escapeXml(element.series[i].name)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a horizontal bar chart SVG.
 */
function generateHorizontalBarChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  const chartWidth = width - padding * 2 - 60; // Extra space for labels
  const chartHeight = height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 30 : 0) - 20; // Extra space for X-axis labels
  const chartTop = padding + (element.title ? titleFontSize + 10 : 0);
  const chartLeft = padding + 60;

  const categories = element.categories ?? element.series[0]?.values.map((_, i) => `${i + 1}`) ?? [];
  const seriesCount = element.series.length;
  const categoryCount = categories.length;

  if (categoryCount === 0 || seriesCount === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  // Calculate bar dimensions
  const groupHeight = chartHeight / categoryCount;
  const barHeight = (groupHeight * 0.8) / seriesCount;
  const barGap = groupHeight * 0.1;

  // Find value range
  const allValues = element.series.flatMap(s => s.values);
  const maxValue = Math.max(...allValues, 0);
  const ticks = calculateAxisTicks(0, maxValue);
  const tickMax = ticks[ticks.length - 1] || 1;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Grid lines and X-axis value labels
  const axisY = chartTop + chartHeight;
  for (const tick of ticks) {
    const x = chartLeft + (tick / tickMax) * chartWidth;
    svg += `<line x1="${x}" y1="${chartTop}" x2="${x}" y2="${axisY}" stroke="#eee" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${axisY + labelFontSize + 3}" text-anchor="middle" font-size="${labelFontSize - 1}" fill="#666">${formatAxisValue(tick)}</text>`;
  }

  // Axes
  svg += `<line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;
  svg += `<line x1="${chartLeft}" y1="${axisY}" x2="${chartLeft + chartWidth}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;

  // Bars
  for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
    const groupY = chartTop + catIdx * groupHeight + barGap;

    for (let serIdx = 0; serIdx < seriesCount; serIdx++) {
      const value = element.series[serIdx].values[catIdx] ?? 0;
      const barWidth = (value / tickMax) * chartWidth;
      const barY = groupY + serIdx * barHeight;
      const color = seriesColor(element, serIdx, colors);

      svg += `<rect x="${chartLeft}" y="${barY}" width="${barWidth}" height="${barHeight - 2}" fill="${color}"/>`;
    }

    // Category label — truncate to fit the available label gutter.
    const labelY = groupY + (groupHeight - barGap * 2) / 2;
    const label = truncateLabelToFit(categories[catIdx], 55, labelFontSize);
    svg += `<text x="${chartLeft - 5}" y="${labelY + 4}" text-anchor="end" font-size="${labelFontSize}">${escapeXml(label)}</text>`;
  }

  // Legend
  if (showLegend && seriesCount > 0) {
    const legendY = height - 15;
    const legendItemWidth = chartWidth / seriesCount;

    for (let i = 0; i < seriesCount; i++) {
      const legendX = chartLeft + i * legendItemWidth;
      const color = seriesColor(element, i, colors);
      svg += `<rect x="${legendX}" y="${legendY - 8}" width="12" height="12" fill="${color}"/>`;
      svg += `<text x="${legendX + 16}" y="${legendY}" font-size="${labelFontSize}">${escapeXml(element.series[i].name)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a line chart SVG.
 */
function generateLineChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  // Add left margin for Y-axis labels
  const yAxisLabelWidth = 35;
  const chartWidth = width - padding * 2 - yAxisLabelWidth;
  const chartLeft = padding + yAxisLabelWidth;
  const chartHeight = height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 30 : 0);
  const chartTop = padding + (element.title ? titleFontSize + 10 : 0);

  const categories = element.categories ?? element.series[0]?.values.map((_, i) => `${i + 1}`) ?? [];
  const seriesCount = element.series.length;
  const categoryCount = categories.length;

  if (categoryCount === 0 || seriesCount === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  // Find value range
  const allValues = element.series.flatMap(s => s.values);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);

  // Calculate nice axis ticks
  const ticks = calculateAxisTicks(minValue, maxValue);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1];
  const valueRange = tickMax - tickMin || 1;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Grid lines and Y-axis labels
  const axisY = chartTop + chartHeight;
  for (const tick of ticks) {
    const y = axisY - ((tick - tickMin) / valueRange) * chartHeight;
    svg += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
    svg += `<text x="${chartLeft - 5}" y="${y + 4}" text-anchor="end" font-size="${labelFontSize - 1}" fill="#666">${formatAxisValue(tick)}</text>`;
  }

  // Axes
  svg += `<line x1="${chartLeft}" y1="${axisY}" x2="${chartLeft + chartWidth}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;
  svg += `<line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;

  // Lines
  const yearValues = categories.map((category) => /^(\d{4})/u.exec(category)?.[1]).map((year) => year === undefined ? undefined : Number(year));
  const usesTimeSpacing = yearValues.every((year) => year !== undefined)
    && yearValues.every((year, index) => index === 0 || year > (yearValues[index - 1] as number));
  const firstYear = yearValues[0] as number | undefined;
  const lastYear = yearValues.at(-1) as number | undefined;
  const yearRange = firstYear !== undefined && lastYear !== undefined ? lastYear - firstYear : 0;
  const pointPositions = categories.map((_category, index) => (
    usesTimeSpacing && yearRange > 0
      ? chartLeft + ((((yearValues[index] as number) - (firstYear as number)) / yearRange) * chartWidth)
      : chartLeft + (index * (chartWidth / (categoryCount - 1 || 1)))
  ));
  const minimumPointGap = pointPositions.length > 1
    ? Math.min(...pointPositions.slice(1).map((position, index) => position - pointPositions[index]))
    : chartWidth;

  for (let serIdx = 0; serIdx < seriesCount; serIdx++) {
    const color = seriesColor(element, serIdx, colors);
    const points: string[] = [];

    for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
      const value = element.series[serIdx].values[catIdx] ?? 0;
      const x = pointPositions[catIdx];
      const y = axisY - ((value - tickMin) / valueRange) * chartHeight;
      points.push(`${x},${y}`);

      // Draw point marker
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
    }

    // Draw line
    svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }

  // Category labels — truncate when the per-point gap is narrower than
  // the label would render at full width.
  for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
    const labelX = pointPositions[catIdx];
    const label = truncateLabelToFit(categories[catIdx], minimumPointGap - 2, labelFontSize);
    svg += `<text x="${labelX}" y="${axisY + labelFontSize + 5}" text-anchor="middle" font-size="${labelFontSize}">${escapeXml(label)}</text>`;
  }

  // Legend
  if (showLegend && seriesCount > 0) {
    const legendY = height - 15;
    const legendItemWidth = chartWidth / seriesCount;

    for (let i = 0; i < seriesCount; i++) {
      const legendX = chartLeft + i * legendItemWidth;
      const color = seriesColor(element, i, colors);
      svg += `<line x1="${legendX}" y1="${legendY - 2}" x2="${legendX + 12}" y2="${legendY - 2}" stroke="${color}" stroke-width="2"/>`;
      svg += `<text x="${legendX + 16}" y="${legendY}" font-size="${labelFontSize}">${escapeXml(element.series[i].name)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a pie chart SVG.
 */
function generatePieChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  const chartSize = Math.min(
    width - padding * 2,
    height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 64 : 0)
  );
  const centerX = width / 2;
  const centerY = padding + (element.title ? titleFontSize + 10 : 0) + chartSize / 2;
  const radius = chartSize / 2 - 10;
  const innerRadius = element.chartType === 'doughnut' ? radius * 0.5 : 0;

  // Use first series for pie data
  const series = element.series[0];
  if (!series || series.values.length === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  const categories = element.categories ?? series.values.map((_, i) => `Item ${i + 1}`);
  const total = series.values.reduce((sum, v) => sum + Math.abs(v), 0);

  if (total === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Pie slices
  let startAngle = -Math.PI / 2; // Start at top

  for (let i = 0; i < series.values.length; i++) {
    const value = Math.abs(series.values[i]);
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const color = colors[i % colors.length];

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    let pathD: string;
    if (innerRadius > 0) {
      // Doughnut
      const ix1 = centerX + innerRadius * Math.cos(startAngle);
      const iy1 = centerY + innerRadius * Math.sin(startAngle);
      const ix2 = centerX + innerRadius * Math.cos(endAngle);
      const iy2 = centerY + innerRadius * Math.sin(endAngle);

      pathD = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`;
    } else {
      // Pie
      pathD = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    }

    svg += `<path d="${pathD}" fill="${color}" stroke="${backgroundColor}" stroke-width="1"/>`;

    const share = value / total;
    if (share >= 0.07) {
      const labelAngle = startAngle + (sliceAngle / 2);
      const labelRadius = innerRadius > 0 ? (innerRadius + radius) / 2 : radius * 0.62;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${labelFontSize}" font-weight="bold" fill="#FFFFFF" stroke="#111827" stroke-width="2" paint-order="stroke">${(share * 100).toFixed(1)}%</text>`;
    }

    startAngle = endAngle;
  }

  // Legend
  if (showLegend) {
    const legendY = centerY + chartSize / 2 + 20;
    const legendColumns = Math.min(series.values.length, 2);
    const legendItemWidth = (width - (padding * 2)) / legendColumns;

    for (let i = 0; i < Math.min(series.values.length, 8); i++) {
      const col = i % legendColumns;
      const row = Math.floor(i / legendColumns);
      const legendX = padding + col * legendItemWidth;
      const legendRowY = legendY + row * 15;
      const color = colors[i % colors.length];
      const label = categories[i] ?? `Item ${i + 1}`;

      svg += `<rect x="${legendX}" y="${legendRowY - 8}" width="10" height="10" fill="${color}"/>`;
      svg += `<text x="${legendX + 14}" y="${legendRowY}" font-size="${labelFontSize}">${escapeXml(label)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate an area chart SVG.
 */
function generateAreaChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  // Add left margin for Y-axis labels
  const yAxisLabelWidth = 35;
  const chartWidth = width - padding * 2 - yAxisLabelWidth;
  const chartLeft = padding + yAxisLabelWidth;
  const chartHeight = height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 30 : 0);
  const chartTop = padding + (element.title ? titleFontSize + 10 : 0);

  const categories = element.categories ?? element.series[0]?.values.map((_, i) => `${i + 1}`) ?? [];
  const seriesCount = element.series.length;
  const categoryCount = categories.length;

  if (categoryCount === 0 || seriesCount === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  // Find value range
  const allValues = element.series.flatMap(s => s.values);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);

  // Calculate nice axis ticks
  const ticks = calculateAxisTicks(minValue, maxValue);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1];
  const valueRange = tickMax - tickMin || 1;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Grid lines and Y-axis labels
  const axisY = chartTop + chartHeight;
  for (const tick of ticks) {
    const y = axisY - ((tick - tickMin) / valueRange) * chartHeight;
    svg += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
    svg += `<text x="${chartLeft - 5}" y="${y + 4}" text-anchor="end" font-size="${labelFontSize - 1}" fill="#666">${formatAxisValue(tick)}</text>`;
  }

  // Axes
  svg += `<line x1="${chartLeft}" y1="${axisY}" x2="${chartLeft + chartWidth}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;
  svg += `<line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;

  // Areas (reverse order so first series is on top)
  const pointGap = chartWidth / (categoryCount - 1 || 1);

  for (let serIdx = seriesCount - 1; serIdx >= 0; serIdx--) {
    const color = seriesColor(element, serIdx, colors);
    const points: string[] = [];

    // Build top line
    for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
      const value = element.series[serIdx].values[catIdx] ?? 0;
      const x = chartLeft + catIdx * pointGap;
      const y = axisY - ((value - tickMin) / valueRange) * chartHeight;
      points.push(`${x},${y}`);
    }

    // Complete the polygon (back along the baseline)
    const polygonPoints = [
      ...points,
      `${chartLeft + (categoryCount - 1) * pointGap},${axisY}`,
      `${chartLeft},${axisY}`,
    ].join(' ');

    svg += `<polygon points="${polygonPoints}" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="2"/>`;
  }

  // Category labels — truncate when the per-point gap is narrower than
  // the label would render at full width.
  for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
    const labelX = chartLeft + catIdx * pointGap;
    const label = truncateLabelToFit(categories[catIdx], pointGap - 2, labelFontSize);
    svg += `<text x="${labelX}" y="${axisY + labelFontSize + 5}" text-anchor="middle" font-size="${labelFontSize}">${escapeXml(label)}</text>`;
  }

  // Legend
  if (showLegend && seriesCount > 0) {
    const legendY = height - 15;
    const legendItemWidth = chartWidth / seriesCount;

    for (let i = 0; i < seriesCount; i++) {
      const legendX = chartLeft + i * legendItemWidth;
      const color = seriesColor(element, i, colors);
      svg += `<rect x="${legendX}" y="${legendY - 8}" width="12" height="12" fill="${color}" fill-opacity="0.5"/>`;
      svg += `<text x="${legendX + 16}" y="${legendY}" font-size="${labelFontSize}">${escapeXml(element.series[i].name)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a scatter/bubble chart SVG.
 */
function generateScatterChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  // Add margins for axis labels
  const yAxisLabelWidth = 35;
  const xAxisLabelHeight = 15;
  const chartWidth = width - padding * 2 - yAxisLabelWidth;
  const chartLeft = padding + yAxisLabelWidth;
  const chartHeight = height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 30 : 0) - xAxisLabelHeight;
  const chartTop = padding + (element.title ? titleFontSize + 10 : 0);

  const seriesCount = element.series.length;

  if (seriesCount === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  // For scatter, we use values as Y and index as X
  const allValues = element.series.flatMap(s => s.values);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);

  // Calculate nice axis ticks
  const yTicks = calculateAxisTicks(minValue, maxValue);
  const tickMin = yTicks[0];
  const tickMax = yTicks[yTicks.length - 1];
  const valueRange = tickMax - tickMin || 1;

  const maxPoints = Math.max(...element.series.map(s => s.values.length));
  const xTicks = calculateAxisTicks(0, maxPoints - 1, 5);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Grid and Y-axis labels
  const axisY = chartTop + chartHeight;
  for (const tick of yTicks) {
    const y = axisY - ((tick - tickMin) / valueRange) * chartHeight;
    svg += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
    svg += `<text x="${chartLeft - 5}" y="${y + 4}" text-anchor="end" font-size="${labelFontSize - 1}" fill="#666">${formatAxisValue(tick)}</text>`;
  }

  // X-axis grid and labels
  for (const tick of xTicks) {
    const x = chartLeft + (tick / (maxPoints - 1 || 1)) * chartWidth;
    svg += `<line x1="${x}" y1="${chartTop}" x2="${x}" y2="${axisY}" stroke="#eee" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${axisY + labelFontSize + 3}" text-anchor="middle" font-size="${labelFontSize - 1}" fill="#666">${formatAxisValue(tick)}</text>`;
  }

  // Axes
  svg += `<line x1="${chartLeft}" y1="${axisY}" x2="${chartLeft + chartWidth}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;
  svg += `<line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${axisY}" stroke="#666" stroke-width="1"/>`;

  // Scatter points
  const isBubble = element.chartType === 'bubble';

  for (let serIdx = 0; serIdx < seriesCount; serIdx++) {
    const color = seriesColor(element, serIdx, colors);
    const series = element.series[serIdx];

    for (let i = 0; i < series.values.length; i++) {
      const value = series.values[i];
      const x = chartLeft + (i / (maxPoints - 1 || 1)) * chartWidth;
      const y = axisY - ((value - tickMin) / valueRange) * chartHeight;
      const r = isBubble ? 4 + (value / tickMax) * 12 : 5;

      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.7"/>`;
    }
  }

  // Legend
  if (showLegend && seriesCount > 1) {
    const legendY = height - 15;
    const legendItemWidth = chartWidth / seriesCount;

    for (let i = 0; i < seriesCount; i++) {
      const legendX = chartLeft + i * legendItemWidth;
      const color = seriesColor(element, i, colors);
      svg += `<circle cx="${legendX + 6}" cy="${legendY - 3}" r="5" fill="${color}"/>`;
      svg += `<text x="${legendX + 16}" y="${legendY}" font-size="${labelFontSize}">${escapeXml(element.series[i].name)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a radar chart SVG.
 */
function generateRadarChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, padding, backgroundColor, colors, showLegend, labelFontSize, titleFontSize } = opts;

  const chartSize = Math.min(
    width - padding * 2,
    height - padding * 2 - (element.title ? titleFontSize + 10 : 0) - (showLegend ? 40 : 0)
  );
  const centerX = width / 2;
  const centerY = padding + (element.title ? titleFontSize + 10 : 0) + chartSize / 2;
  const radius = chartSize / 2 - 20;

  const categories = element.categories ?? element.series[0]?.values.map((_, i) => `Axis ${i + 1}`) ?? [];
  const seriesCount = element.series.length;
  const axisCount = categories.length;

  if (axisCount < 3 || seriesCount === 0) {
    return generateEmptyChartSVG(element, opts);
  }

  // Find max value for scaling
  const allValues = element.series.flatMap(s => s.values);
  const maxValue = Math.max(...allValues, 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

  // Title
  if (element.title) {
    svg += `<text x="${width / 2}" y="${padding / 2 + titleFontSize / 2}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  // Draw grid circles
  for (let r = 1; r <= 4; r++) {
    const gridRadius = (radius * r) / 4;
    svg += `<circle cx="${centerX}" cy="${centerY}" r="${gridRadius}" fill="none" stroke="#ddd" stroke-width="1"/>`;
  }

  // Draw axis lines and labels
  for (let i = 0; i < axisCount; i++) {
    const angle = (2 * Math.PI * i) / axisCount - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#ccc" stroke-width="1"/>`;

    // Label
    const labelX = centerX + (radius + 15) * Math.cos(angle);
    const labelY = centerY + (radius + 15) * Math.sin(angle);
    const anchor = Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1 ? 'middle' : (angle > -Math.PI / 2 && angle < Math.PI / 2) ? 'start' : 'end';

    const radarLabel = truncateLabelToFit(categories[i], 60, labelFontSize);
    svg += `<text x="${labelX}" y="${labelY + 4}" text-anchor="${anchor}" font-size="${labelFontSize}">${escapeXml(radarLabel)}</text>`;
  }

  // Draw data series
  for (let serIdx = 0; serIdx < seriesCount; serIdx++) {
    const color = seriesColor(element, serIdx, colors);
    const series = element.series[serIdx];
    const points: string[] = [];

    for (let i = 0; i < axisCount; i++) {
      const value = series.values[i] ?? 0;
      const r = (value / maxValue) * radius;
      const angle = (2 * Math.PI * i) / axisCount - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }

    svg += `<polygon points="${points.join(' ')}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`;
  }

  // Legend
  if (showLegend && seriesCount > 1) {
    const legendY = centerY + chartSize / 2 + 20;
    const legendItemWidth = width / seriesCount;

    for (let i = 0; i < seriesCount; i++) {
      const legendX = padding + i * legendItemWidth;
      const color = seriesColor(element, i, colors);
      svg += `<rect x="${legendX}" y="${legendY - 8}" width="12" height="12" fill="${color}" fill-opacity="0.5"/>`;
      svg += `<text x="${legendX + 16}" y="${legendY}" font-size="${labelFontSize}">${escapeXml(element.series[i].name)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate an empty chart placeholder SVG.
 */
function generateEmptyChartSVG(
  element: ChartElement,
  opts: Required<SVGChartOptions>
): string {
  const { width, height, backgroundColor, titleFontSize, labelFontSize } = opts;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${escapeXml(opts.fontFamily)}">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}" stroke="#ccc" stroke-width="1"/>`;

  if (element.title) {
    svg += `<text x="${width / 2}" y="${height / 2 - 10}" text-anchor="middle" font-size="${titleFontSize}" font-weight="bold">${escapeXml(element.title)}</text>`;
  }

  svg += `<text x="${width / 2}" y="${height / 2 + 15}" text-anchor="middle" font-size="${labelFontSize}" fill="#666">No chart data available</text>`;
  svg += '</svg>';
  return svg;
}

// =============================================================================
// CHART DATA URI GENERATION
// =============================================================================

/**
 * Convert chart element to an SVG data URI.
 * This can be used for preview or as input to image conversion tools.
 */
export function chartToSVGDataUri(
  element: ChartElement,
  options?: SVGChartOptions
): string {
  const svg = generateChartSVG(element, options);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Check if a chart element can be rendered to image.
 */
export function canRenderChartToImage(element: ChartElement): boolean {
  return (
    element.series.length > 0 &&
    element.series.some(s => s.values.length > 0)
  );
}
