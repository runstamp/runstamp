import {
  isChartSeriesEmpty,
  resolveChartReference,
  resolveChartSeriesName,
} from "../charts/chart-data.js";
import type {
  SpreadsheetCell,
  SpreadsheetChart,
  SpreadsheetChartSeries,
  SpreadsheetDocument,
} from "../types/spreadsheet-ast.js";
import { escapeXml, XML_DECLARATION } from "../utils/xml.js";
import { quoteSheetName } from "../worksheet/structure.js";

const ACCENT_COLORS = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"] as const;
const PROFESSIONAL_CHART_COLORS = [
  "547AA5",
  "D98555",
  "7A9E7E",
  "B89A63",
  "A66B6B",
  "80769E",
  "5E8C87",
  "C07A50",
  "84966D",
] as const;
export const EXPLICIT_VALUE_DATA_LABELS_XML = [
  `<c:dLbls>`,
  `<c:showLegendKey val="0"/>`,
  `<c:showVal val="1"/>`,
  `<c:showCatName val="0"/>`,
  `<c:showSerName val="0"/>`,
  `<c:showPercent val="0"/>`,
  `<c:showBubbleSize val="0"/>`,
  `</c:dLbls>`,
].join("");

export function assertExplicitDataLabelVector(xml: string, enabled: boolean): void {
  const labelBlocks = xml.match(/<c:dLbls>[\s\S]*?<\/c:dLbls>/gu) ?? [];
  if (!enabled) {
    if (labelBlocks.length > 0) {
      throw new Error("Disabled chart data labels must not serialize c:dLbls.");
    }
    return;
  }
  if (labelBlocks.length !== 1 || labelBlocks[0] !== EXPLICIT_VALUE_DATA_LABELS_XML) {
    throw new Error("Enabled chart data labels must serialize the explicit value-only label vector.");
  }
}

interface ChartSerializationContext {
  document: SpreadsheetDocument;
  sheetName: string;
}

function normalizedRgb(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toUpperCase().replace(/^#/, "");
  const rgb = normalized.length === 8 ? normalized.slice(2) : normalized;
  return /^[0-9A-F]{6}$/u.test(rgb) ? rgb : undefined;
}

function brandedChartPalette(context: ChartSerializationContext | undefined): string[] | undefined {
  if (!context) return undefined;
  const sheet = context.document.sheets.find((candidate) => candidate.name === context.sheetName);
  if (!sheet) return undefined;
  const counts = new Map<string, number>();
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      const style = typeof cell.style === "object" && cell.style !== null ? cell.style : undefined;
      const color = normalizedRgb(style?.fill?.fgColor ?? style?.fill?.color);
      if (color === undefined || color === "FFFFFF" || color === "000000") continue;
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  const brand = [...counts].sort((left, right) => right[1] - left[1])[0];
  if (brand === undefined || brand[1] < 3) return undefined;
  return [brand[0], ...PROFESSIONAL_CHART_COLORS.filter((color) => color !== brand[0])];
}

function seriesColor(index: number, context?: ChartSerializationContext): string {
  const brandedPalette = brandedChartPalette(context);
  return brandedPalette?.[index % brandedPalette.length]
    ?? ACCENT_COLORS[index % ACCENT_COLORS.length]!;
}

function serializeChartColor(color: string): string {
  return color.startsWith("accent")
    ? `<a:schemeClr val="${color}"/>`
    : `<a:srgbClr val="${color}"/>`;
}

function isCellReference(value: string): boolean {
  return /^(?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!\$?[A-Za-z]+\$?[1-9]\d*$/.test(value);
}

function seriesName(
  series: { name?: string },
  index: number,
  context?: ChartSerializationContext,
): string {
  if (!series.name) {
    return `<c:tx><c:v>Series ${index + 1}</c:v></c:tx>`;
  }
  if (isCellReference(series.name)) {
    const cached = context
      ? resolveChartSeriesName(context.document, context.sheetName, series.name)
      : undefined;
    if (cached !== undefined) {
      return `<c:tx><c:v>${escapeXml(cached)}</c:v></c:tx>`;
    }
    return `<c:tx><c:strRef><c:f>${escapeXml(series.name)}</c:f></c:strRef></c:tx>`;
  }
  return `<c:tx><c:v>${escapeXml(series.name)}</c:v></c:tx>`;
}

function normalizedChartReference(
  reference: string,
  context?: ChartSerializationContext,
): string {
  if (!context) return reference;
  const separator = reference.lastIndexOf("!");
  if (separator === -1) return reference;
  const rawSheetName = reference.slice(0, separator);
  const sheetName = rawSheetName.startsWith("'") && rawSheetName.endsWith("'")
    ? rawSheetName.slice(1, -1).replaceAll("''", "'")
    : rawSheetName;
  const knownSheet = context.document.sheets.find((sheet) => sheet.name === sheetName);
  return knownSheet === undefined
    ? reference
    : `${quoteSheetName(knownSheet.name)}!${reference.slice(separator + 1)}`;
}

function chartCellValue(cell: SpreadsheetCell | undefined): unknown {
  if (typeof cell?.formula === "object" && cell.formula !== null) return cell.formula.cachedValue;
  if (Array.isArray(cell?.value)) return cell.value.map((run) => run.text).join("");
  return cell?.value;
}

function serializeStringCache(
  reference: string,
  context?: ChartSerializationContext,
): string {
  if (!context) return "";
  const resolved = resolveChartReference(context.document, context.sheetName, reference);
  if (!resolved) return "";
  const points = resolved.cells.map((cell, index) => {
    const value = chartCellValue(cell);
    return value === undefined || value === null
      ? ""
      : `<c:pt idx="${index}"><c:v>${escapeXml(String(value))}</c:v></c:pt>`;
  }).join("");
  return `<c:strCache><c:ptCount val="${resolved.cellCount}"/>${points}</c:strCache>`;
}

function serializeNumericCache(
  reference: string,
  context?: ChartSerializationContext,
): string {
  if (!context) return "";
  const resolved = resolveChartReference(context.document, context.sheetName, reference);
  if (!resolved) return "";
  const firstFormat = resolved.cells.map((cell) => (
    typeof cell?.style === "object" && cell.style !== null
      ? cell.style.numberFormat
      : undefined
  )).find((format) => format !== undefined) ?? "General";
  const points = resolved.cells.map((cell, index) => {
    const value = chartCellValue(cell);
    return typeof value === "number" && Number.isFinite(value)
      ? `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`
      : "";
  }).join("");
  return `<c:numCache><c:formatCode>${escapeXml(firstFormat)}</c:formatCode><c:ptCount val="${resolved.cellCount}"/>${points}</c:numCache>`;
}

function seriesCategories(
  series: { categories?: string },
  context?: ChartSerializationContext,
): string {
  if (!series.categories) {
    return "";
  }
  return `<c:cat><c:strRef><c:f>${escapeXml(normalizedChartReference(series.categories, context))}</c:f>${serializeStringCache(series.categories, context)}</c:strRef></c:cat>`;
}

function numericSeriesValues(
  container: "val" | "yVal" | "bubbleSize",
  series: SpreadsheetChartSeries,
  context?: ChartSerializationContext,
): string {
  if (series.values.trim() === "") {
    return `<c:${container}><c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numLit></c:${container}>`;
  }
  const cache = context
    && isChartSeriesEmpty(context.document, context.sheetName, series.values)
    ? `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numCache>`
    : serializeNumericCache(series.values, context);
  return `<c:${container}><c:numRef><c:f>${escapeXml(normalizedChartReference(series.values, context))}</c:f>${cache}</c:numRef></c:${container}>`;
}

function serializeDataPointFills(
  series: SpreadsheetChartSeries,
  context?: ChartSerializationContext,
): string {
  if (!context) {
    return "";
  }
  const pointCount = resolveChartReference(
    context.document,
    context.sheetName,
    series.values,
  )?.cellCount ?? 0;
  return Array.from({ length: pointCount }, (_unused, index) =>
    `<c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill>${serializeChartColor(seriesColor(index, context))}</a:solidFill></c:spPr></c:dPt>`
  ).join("");
}

function serializeSeries(
  chart: SpreadsheetChart,
  context?: ChartSerializationContext,
  varyDataPointColors = false,
): string {
  return chart.series.map((s, i) => [
    `<c:ser>`,
    `<c:idx val="${i}"/>`,
    `<c:order val="${i}"/>`,
    seriesName(s, i, context),
    `<c:spPr><a:solidFill>${serializeChartColor(seriesColor(i, context))}</a:solidFill></c:spPr>`,
    varyDataPointColors ? serializeDataPointFills(s, context) : "",
    seriesCategories(s, context),
    numericSeriesValues("val", s, context),
    `</c:ser>`,
  ].join("")).join("");
}

function serializeDataLabels(chart: SpreadsheetChart): string {
  const xml = chart.style?.showDataLabels ? EXPLICIT_VALUE_DATA_LABELS_XML : "";
  assertExplicitDataLabelVector(xml, chart.style?.showDataLabels === true);
  return xml;
}

function valueAxisScaling(
  chart: SpreadsheetChart,
  context?: ChartSerializationContext,
): string {
  if (!context) return `<c:scaling><c:orientation val="minMax"/></c:scaling>`;
  const cells = chart.series.flatMap((series) => (
    resolveChartReference(context.document, context.sheetName, series.values)?.cells ?? []
  ));
  const percentageValues = cells.length > 0 && cells.every((cell) => {
    const numberFormat = typeof cell?.style === "object" && cell.style !== null
      ? cell.style.numberFormat
      : undefined;
    const value = typeof cell?.value === "number"
      ? cell.value
      : (typeof cell?.formula === "object" && cell.formula !== null
          ? cell.formula.cachedValue
          : undefined);
    return typeof numberFormat === "string"
      && numberFormat.includes("%")
      && typeof value === "number"
      && value >= 0
      && value <= 1;
  });
  return percentageValues
    ? `<c:scaling><c:orientation val="minMax"/><c:min val="0"/><c:max val="1"/></c:scaling>`
    : `<c:scaling><c:orientation val="minMax"/></c:scaling>`;
}

function serializeBarChart(
  chart: SpreadsheetChart,
  direction: "bar" | "col",
  context?: ChartSerializationContext,
): string {
  const catAxPos = direction === "col" ? "b" : "l";
  const valAxPos = direction === "col" ? "l" : "b";

  return [
    `<c:barChart>`,
    `<c:barDir val="${direction}"/>`,
    `<c:grouping val="clustered"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:barChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${catAxPos}"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="${valAxPos}"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializeLineChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:lineChart>`,
    `<c:grouping val="standard"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:lineChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializePieChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:pieChart>`,
    `<c:varyColors val="1"/>`,
    serializeSeries(chart, context, true),
    serializeDataLabels(chart),
    `</c:pieChart>`,
  ].join("");
}

function serializeScatterChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  const scatterSeries = chart.series.map((s, i) => [
    `<c:ser>`,
    `<c:idx val="${i}"/>`,
    `<c:order val="${i}"/>`,
    seriesName(s, i, context),
    `<c:spPr><a:solidFill>${serializeChartColor(seriesColor(i, context))}</a:solidFill></c:spPr>`,
    s.categories ? `<c:xVal><c:numRef><c:f>${escapeXml(s.categories)}</c:f></c:numRef></c:xVal>` : "",
    numericSeriesValues("yVal", s, context),
    `</c:ser>`,
  ].join("")).join("");

  return [
    `<c:scatterChart>`,
    `<c:scatterStyle val="lineMarker"/>`,
    scatterSeries,
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:scatterChart>`,
    `<c:valAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:valAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializeAreaChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:areaChart>`,
    `<c:grouping val="standard"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:areaChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializeDoughnutChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:doughnutChart>`,
    `<c:varyColors val="1"/>`,
    serializeSeries(chart, context, true),
    serializeDataLabels(chart),
    `<c:holeSize val="50"/>`,
    `</c:doughnutChart>`,
  ].join("");
}

function serializeRadarChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:radarChart>`,
    `<c:radarStyle val="marker"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:radarChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializeBubbleChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  const bubbleSeries = chart.series.map((s, i) => [
    `<c:ser>`,
    `<c:idx val="${i}"/>`,
    `<c:order val="${i}"/>`,
    seriesName(s, i, context),
    `<c:spPr><a:solidFill>${serializeChartColor(seriesColor(i, context))}</a:solidFill></c:spPr>`,
    s.categories ? `<c:xVal><c:numRef><c:f>${escapeXml(s.categories)}</c:f></c:numRef></c:xVal>` : "",
    numericSeriesValues("yVal", s, context),
    numericSeriesValues("bubbleSize", s, context),
    `</c:ser>`,
  ].join("")).join("");

  return [
    `<c:bubbleChart>`,
    bubbleSeries,
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:bubbleChart>`,
    `<c:valAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:valAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializeStockChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:stockChart>`,
    serializeSeries(chart, context),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:stockChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
  ].join("");
}

function serializeSurfaceChart(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  return [
    `<c:surface3DChart>`,
    serializeSeries(chart, context),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `<c:axId val="333333333"/>`,
    `</c:surface3DChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
    `<c:serAx><c:axId val="333333333"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:serAx>`,
  ].join("");
}

function serializePlotArea(chart: SpreadsheetChart, context?: ChartSerializationContext): string {
  let chartTypeXml: string;

  switch (chart.type) {
    case "bar":
      chartTypeXml = serializeBarChart(chart, "bar", context);
      break;
    case "col":
      chartTypeXml = serializeBarChart(chart, "col", context);
      break;
    case "line":
      chartTypeXml = serializeLineChart(chart, context);
      break;
    case "pie":
      chartTypeXml = serializePieChart(chart, context);
      break;
    case "scatter":
      chartTypeXml = serializeScatterChart(chart, context);
      break;
    case "area":
      chartTypeXml = serializeAreaChart(chart, context);
      break;
    case "doughnut":
      chartTypeXml = serializeDoughnutChart(chart, context);
      break;
    case "radar":
      chartTypeXml = serializeRadarChart(chart, context);
      break;
    case "bubble":
      chartTypeXml = serializeBubbleChart(chart, context);
      break;
    case "stock":
      chartTypeXml = serializeStockChart(chart, context);
      break;
    case "surface":
      chartTypeXml = serializeSurfaceChart(chart, context);
      break;
  }

  return `<c:plotArea><c:layout/>${chartTypeXml}</c:plotArea>`;
}

function serializeTitle(chart: SpreadsheetChart): string {
  if (!chart.title) {
    return `<c:autoTitleDeleted val="1"/>`;
  }

  return [
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400" b="1"/><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`,
    `<c:autoTitleDeleted val="0"/>`,
  ].join("");
}

function serializeLegend(chart: SpreadsheetChart): string {
  if (chart.style?.showLegend === false) {
    return "";
  }
  return `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>`;
}

export function serializeChart(
  chart: SpreadsheetChart,
  context?: ChartSerializationContext,
): string {
  return [
    XML_DECLARATION,
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
    `<c:chart>`,
    serializeTitle(chart),
    serializePlotArea(chart, context),
    serializeLegend(chart),
    `<c:plotVisOnly val="1"/>`,
    `</c:chart>`,
    `</c:chartSpace>`,
  ].join("");
}
