import type { ChartData, XYSeries } from "../../types/ast.js";
import { escapeXml } from "../drawing/textUtils.js";
import { toHex } from "../drawing/math.js";
import {
  DEFAULT_COLORS,
  X_VAL_AX_ID,
  Y_VAL_AX_ID,
  colLetter,
} from "./chartXmlShared.js";

export function generateScatterChart(chartData: ChartData): string {
  let xml = `      <c:scatterChart>\n`;
  xml += `        <c:scatterStyle val="lineMarker"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  const xySeries = chartData.xySeries ?? [];
  for (let index = 0; index < xySeries.length; index++) {
    xml += generateXYSeries(xySeries[index], index);
  }

  xml += `        <c:axId val="${X_VAL_AX_ID}"/>\n`;
  xml += `        <c:axId val="${Y_VAL_AX_ID}"/>\n`;
  xml += `      </c:scatterChart>\n`;
  return xml;
}

export function generateBubbleChart(chartData: ChartData): string {
  let xml = `      <c:bubbleChart>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  const xySeries = chartData.xySeries ?? [];
  for (let index = 0; index < xySeries.length; index++) {
    xml += generateBubbleSeries(xySeries[index], index);
  }

  xml += `        <c:bubbleScale val="100"/>\n`;
  xml += `        <c:axId val="${X_VAL_AX_ID}"/>\n`;
  xml += `        <c:axId val="${Y_VAL_AX_ID}"/>\n`;
  xml += `      </c:bubbleChart>\n`;
  return xml;
}

function generateXYSeries(series: XYSeries, index: number): string {
  const color = toHex(series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]);
  const points = series.dataPoints;
  const baseCol = index * 2;

  let xml = `        <c:ser>\n`;
  xml += `          <c:idx val="${index}"/>\n`;
  xml += `          <c:order val="${index}"/>\n`;
  xml += `          <c:tx>\n`;
  xml += `            <c:strRef>\n`;
  xml += `              <c:f>Sheet1!$${colLetter(baseCol + 1)}$1</c:f>\n`;
  xml += `              <c:strCache>\n`;
  xml += `                <c:ptCount val="1"/>\n`;
  xml += `                <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>\n`;
  xml += `              </c:strCache>\n`;
  xml += `            </c:strRef>\n`;
  xml += `          </c:tx>\n`;
  xml += `          <c:spPr>\n`;
  xml += `            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>\n`;
  xml += `          </c:spPr>\n`;

  const xCol = colLetter(baseCol);
  xml += `          <c:xVal>\n`;
  xml += `            <c:numRef>\n`;
  xml += `              <c:f>Sheet1!$${xCol}$2:$${xCol}$${points.length + 1}</c:f>\n`;
  xml += `              <c:numCache>\n`;
  xml += `                <c:formatCode>General</c:formatCode>\n`;
  xml += `                <c:ptCount val="${points.length}"/>\n`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].x}</c:v></c:pt>\n`;
  }
  xml += `              </c:numCache>\n`;
  xml += `            </c:numRef>\n`;
  xml += `          </c:xVal>\n`;

  const yCol = colLetter(baseCol + 1);
  xml += `          <c:yVal>\n`;
  xml += `            <c:numRef>\n`;
  xml += `              <c:f>Sheet1!$${yCol}$2:$${yCol}$${points.length + 1}</c:f>\n`;
  xml += `              <c:numCache>\n`;
  xml += `                <c:formatCode>General</c:formatCode>\n`;
  xml += `                <c:ptCount val="${points.length}"/>\n`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].y}</c:v></c:pt>\n`;
  }
  xml += `              </c:numCache>\n`;
  xml += `            </c:numRef>\n`;
  xml += `          </c:yVal>\n`;
  xml += `        </c:ser>\n`;
  return xml;
}

function generateBubbleSeries(series: XYSeries, index: number): string {
  const color = toHex(series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]);
  const points = series.dataPoints;
  const baseCol = index * 3;

  let xml = `        <c:ser>\n`;
  xml += `          <c:idx val="${index}"/>\n`;
  xml += `          <c:order val="${index}"/>\n`;
  xml += `          <c:tx>\n`;
  xml += `            <c:strRef>\n`;
  xml += `              <c:f>Sheet1!$${colLetter(baseCol + 1)}$1</c:f>\n`;
  xml += `              <c:strCache>\n`;
  xml += `                <c:ptCount val="1"/>\n`;
  xml += `                <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>\n`;
  xml += `              </c:strCache>\n`;
  xml += `            </c:strRef>\n`;
  xml += `          </c:tx>\n`;
  xml += `          <c:spPr>\n`;
  xml += `            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>\n`;
  xml += `          </c:spPr>\n`;

  const xCol = colLetter(baseCol);
  xml += `          <c:xVal>\n`;
  xml += `            <c:numRef>\n`;
  xml += `              <c:f>Sheet1!$${xCol}$2:$${xCol}$${points.length + 1}</c:f>\n`;
  xml += `              <c:numCache>\n`;
  xml += `                <c:formatCode>General</c:formatCode>\n`;
  xml += `                <c:ptCount val="${points.length}"/>\n`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].x}</c:v></c:pt>\n`;
  }
  xml += `              </c:numCache>\n`;
  xml += `            </c:numRef>\n`;
  xml += `          </c:xVal>\n`;

  const yCol = colLetter(baseCol + 1);
  xml += `          <c:yVal>\n`;
  xml += `            <c:numRef>\n`;
  xml += `              <c:f>Sheet1!$${yCol}$2:$${yCol}$${points.length + 1}</c:f>\n`;
  xml += `              <c:numCache>\n`;
  xml += `                <c:formatCode>General</c:formatCode>\n`;
  xml += `                <c:ptCount val="${points.length}"/>\n`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].y}</c:v></c:pt>\n`;
  }
  xml += `              </c:numCache>\n`;
  xml += `            </c:numRef>\n`;
  xml += `          </c:yVal>\n`;

  const sizeCol = colLetter(baseCol + 2);
  xml += `          <c:bubbleSize>\n`;
  xml += `            <c:numRef>\n`;
  xml += `              <c:f>Sheet1!$${sizeCol}$2:$${sizeCol}$${points.length + 1}</c:f>\n`;
  xml += `              <c:numCache>\n`;
  xml += `                <c:formatCode>General</c:formatCode>\n`;
  xml += `                <c:ptCount val="${points.length}"/>\n`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].size ?? 1}</c:v></c:pt>\n`;
  }
  xml += `              </c:numCache>\n`;
  xml += `            </c:numRef>\n`;
  xml += `          </c:bubbleSize>\n`;
  xml += `        </c:ser>\n`;
  return xml;
}
