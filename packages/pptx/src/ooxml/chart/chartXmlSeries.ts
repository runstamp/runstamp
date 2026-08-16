import type {
  ChartData,
  ChartDataLabels,
  ChartSeries,
  ErrorBarsConfig,
  MarkerConfig,
  TrendlineConfig,
} from "../../types/ast.js";
import { escapeXml, escapeXmlAttr } from "../drawing/textUtils.js";
import { toHex } from "../drawing/math.js";
import { ooxmlBool, ooxmlTextFontSize } from "../xmlValues.js";
import { DEFAULT_COLORS, colLetter } from "./chartXmlShared.js";

export interface SeriesOptions {
  smooth?: boolean;
  allowMarker?: boolean;
  defaultMarker?: MarkerConfig;
  allowDataLabels?: boolean;
}

export function generateDataLabelsXml(
  dataLabels?: ChartDataLabels,
  suppressedPointIndices: readonly number[] = [],
): string {
  if (!dataLabels) return "";

  let xml = `        <c:dLbls>\n`;

  for (const pointIndex of suppressedPointIndices) {
    xml += `          <c:dLbl><c:idx val="${pointIndex}"/><c:delete val="1"/></c:dLbl>\n`;
  }

  if (dataLabels.formatCode) {
    xml += `          <c:numFmt formatCode="${escapeXmlAttr(dataLabels.formatCode)}" sourceLinked="0"/>\n`;
  } else {
    xml += `          <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  }

  if (dataLabels.fontFamily || dataLabels.fontSize || dataLabels.fontColor) {
    const size = ooxmlTextFontSize(dataLabels.fontSize ?? 10, 10);
    const family = dataLabels.fontFamily ?? "Calibri";
    let colorXml = "";
    if (dataLabels.fontColor) {
      colorXml = `<a:solidFill><a:srgbClr val="${toHex(dataLabels.fontColor)}"/></a:solidFill>`;
    }
    xml += `          <c:txPr>\n`;
    xml += `            <a:bodyPr/>\n`;
    xml += `            <a:lstStyle/>\n`;
    xml += `            <a:p>\n`;
    xml += `              <a:pPr><a:defRPr sz="${size}">${colorXml}<a:latin typeface="${escapeXmlAttr(family)}"/></a:defRPr></a:pPr>\n`;
    xml += `              <a:endParaRPr lang="en-US" dirty="0"/>\n`;
    xml += `            </a:p>\n`;
    xml += `          </c:txPr>\n`;
  }

  if (dataLabels.position) {
    xml += `          <c:dLblPos val="${dataLabels.position}"/>\n`;
  }

  xml += `          <c:showLegendKey val="0"/>\n`;
  xml += `          <c:showVal val="${ooxmlBool(dataLabels.showVal)}"/>\n`;
  xml += `          <c:showCatName val="${ooxmlBool(dataLabels.showCatName)}"/>\n`;
  xml += `          <c:showSerName val="${ooxmlBool(dataLabels.showSerName)}"/>\n`;
  xml += `          <c:showPercent val="${ooxmlBool(dataLabels.showPercent)}"/>\n`;
  xml += `          <c:showBubbleSize val="0"/>\n`;
  xml += `        </c:dLbls>\n`;
  return xml;
}

function generateMarkerXml(marker: MarkerConfig): string {
  let xml = `<c:marker><c:symbol val="${marker.symbol}"/>`;
  if (marker.size !== undefined) {
    xml += `<c:size val="${marker.size}"/>`;
  }
  if (marker.color) {
    xml += `<c:spPr><a:solidFill><a:srgbClr val="${toHex(marker.color)}"/></a:solidFill></c:spPr>`;
  }
  xml += `</c:marker>`;
  return xml;
}

const TRENDLINE_TYPE_MAP: Record<string, string> = {
  linear: "linear",
  exponential: "exp",
  logarithmic: "log",
  polynomial: "poly",
  power: "power",
  movingAvg: "movingAvg",
};

function generateTrendlineXml(trendline: TrendlineConfig): string {
  let xml = `          <c:trendline>\n`;
  if (trendline.color) {
    xml += `            <c:spPr><a:ln><a:solidFill><a:srgbClr val="${toHex(trendline.color)}"/></a:solidFill></a:ln></c:spPr>\n`;
  }
  const ooxmlType = TRENDLINE_TYPE_MAP[trendline.type] ?? trendline.type;
  xml += `            <c:trendlineType val="${ooxmlType}"/>\n`;
  if (trendline.type === "polynomial" && trendline.order !== undefined) {
    xml += `            <c:order val="${trendline.order}"/>\n`;
  }
  if (trendline.type === "movingAvg" && trendline.period !== undefined) {
    xml += `            <c:period val="${trendline.period}"/>\n`;
  }
  if (trendline.forward !== undefined) {
    xml += `            <c:forward val="${trendline.forward}"/>\n`;
  }
  if (trendline.backward !== undefined) {
    xml += `            <c:backward val="${trendline.backward}"/>\n`;
  }
  if (trendline.displayEquation) {
    xml += `            <c:dispEq val="1"/>\n`;
  }
  if (trendline.displayRSquared) {
    xml += `            <c:dispRSqr val="1"/>\n`;
  }
  xml += `          </c:trendline>\n`;
  return xml;
}

function generateErrorBarsXml(errorBars: ErrorBarsConfig): string {
  let xml = `          <c:errBars>\n`;
  xml += `            <c:errDir val="${errorBars.direction === "x" ? "x" : "y"}"/>\n`;
  xml += `            <c:errBarType val="both"/>\n`;
  xml += `            <c:errValType val="${errorBars.type}"/>\n`;
  if (errorBars.value !== undefined) {
    xml += `            <c:val val="${errorBars.value}"/>\n`;
  }
  xml += `          </c:errBars>\n`;
  return xml;
}

export function generateSeriesEntries(
  chartData: ChartData,
  options?: SeriesOptions,
): string {
  const series = chartData.series ?? [];
  let xml = "";
  for (let index = 0; index < series.length; index++) {
    xml += generateSingleSeries(chartData, series[index], index, false, options);
  }
  return xml;
}

export function generateSingleSeries(
  chartData: ChartData,
  series: ChartSeries,
  index: number,
  isPie: boolean,
  options?: SeriesOptions,
): string {
  const color = toHex(series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]);
  const categories = chartData.categories ?? [];
  const categoryCount = categories.length;

  let xml = `        <c:ser>\n`;
  xml += `          <c:idx val="${index}"/>\n`;
  xml += `          <c:order val="${index}"/>\n`;
  xml += `          <c:tx>\n`;
  xml += `            <c:strRef>\n`;
  xml += `              <c:f>Sheet1!$${colLetter(index + 1)}$1</c:f>\n`;
  xml += `              <c:strCache>\n`;
  xml += `                <c:ptCount val="1"/>\n`;
  xml += `                <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>\n`;
  xml += `              </c:strCache>\n`;
  xml += `            </c:strRef>\n`;
  xml += `          </c:tx>\n`;

  if (!isPie) {
    // For line charts, the visible stroke comes from <a:ln>, not <a:solidFill>.
    // Without this branch, LibreOffice and some Office versions fall back to
    // theme series colors even when solidFill is set — yielding the
    // "4th series goes yellow" bug for line charts.
    const isStrokeChart =
      chartData.chartType === "line" || chartData.chartType === "scatter";
    xml += `          <c:spPr>\n`;
    xml += `            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>\n`;
    if (isStrokeChart) {
      xml += `            <a:ln w="19050"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>\n`;
    }
    xml += `          </c:spPr>\n`;
  } else {
    for (let pointIndex = 0; pointIndex < series.values.length; pointIndex++) {
      const pointColor = toHex(series.pointColors?.[pointIndex] ?? DEFAULT_COLORS[pointIndex % DEFAULT_COLORS.length]);
      xml += `          <c:dPt>\n`;
      xml += `            <c:idx val="${pointIndex}"/>\n`;
      if (chartData.explosion !== undefined) {
        xml += `            <c:explosion val="${chartData.explosion}"/>\n`;
      }
      xml += `            <c:spPr><a:solidFill><a:srgbClr val="${pointColor}"/></a:solidFill></c:spPr>\n`;
      xml += `          </c:dPt>\n`;
    }
  }

  const effectiveMarker = series.marker ?? options?.defaultMarker;
  if (effectiveMarker && options?.allowMarker !== false) {
    xml += `          ${generateMarkerXml(effectiveMarker)}\n`;
  }

  if (!isPie && series.pointColors) {
    for (let pointIndex = 0; pointIndex < series.pointColors.length; pointIndex++) {
      if (series.pointColors[pointIndex]) {
        xml += `          <c:dPt>\n`;
        xml += `            <c:idx val="${pointIndex}"/>\n`;
        xml += `            <c:spPr><a:solidFill><a:srgbClr val="${toHex(series.pointColors[pointIndex])}"/></a:solidFill></c:spPr>\n`;
        xml += `          </c:dPt>\n`;
      }
    }
  }

  if (series.dataLabels && options?.allowDataLabels !== false) {
    xml += generateDataLabelsXml(series.dataLabels);
  }
  if (series.trendline) {
    xml += generateTrendlineXml(series.trendline);
  }
  if (series.errorBars) {
    xml += generateErrorBarsXml(series.errorBars);
  }

  xml += `          <c:cat>\n`;
  xml += `            <c:strRef>\n`;
  xml += `              <c:f>Sheet1!$A$2:$A$${categoryCount + 1}</c:f>\n`;
  xml += `              <c:strCache>\n`;
  xml += `                <c:ptCount val="${categoryCount}"/>\n`;
  for (let pointIndex = 0; pointIndex < categoryCount; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${escapeXml(categories[pointIndex])}</c:v></c:pt>\n`;
  }
  xml += `              </c:strCache>\n`;
  xml += `            </c:strRef>\n`;
  xml += `          </c:cat>\n`;

  const valueCol = colLetter(index + 1);
  xml += `          <c:val>\n`;
  xml += `            <c:numRef>\n`;
  xml += `              <c:f>Sheet1!$${valueCol}$2:$${valueCol}$${categoryCount + 1}</c:f>\n`;
  xml += `              <c:numCache>\n`;
  xml += `                <c:formatCode>General</c:formatCode>\n`;
  xml += `                <c:ptCount val="${categoryCount}"/>\n`;
  for (let pointIndex = 0; pointIndex < series.values.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${series.values[pointIndex]}</c:v></c:pt>\n`;
  }
  xml += `              </c:numCache>\n`;
  xml += `            </c:numRef>\n`;
  xml += `          </c:val>\n`;

  if (options?.smooth) {
    xml += `          <c:smooth val="1"/>\n`;
  }

  xml += `        </c:ser>\n`;
  return xml;
}
