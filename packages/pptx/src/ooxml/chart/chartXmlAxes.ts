import type {
  ChartAxisConfig,
  ChartData,
  ChartGridlines,
} from "../../types/ast.js";
import { escapeXml, escapeXmlAttr } from "../drawing/textUtils.js";
import { toHex } from "../drawing/math.js";
import { ooxmlAngle, ooxmlTextFontSize } from "../xmlValues.js";
import {
  CAT_AX_ID,
  SEC_CAT_AX_ID,
  SEC_VAL_AX_ID,
  VAL_AX_ID,
  X_VAL_AX_ID,
  Y_VAL_AX_ID,
} from "./chartXmlShared.js";

export function generateGridlinesXml(gridlines?: ChartGridlines): string {
  if (!gridlines) return "";
  let xml = "";

  if (gridlines.major !== false) {
    if (gridlines.color) {
      xml += `        <c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="${toHex(gridlines.color)}"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>\n`;
    } else {
      xml += `        <c:majorGridlines/>\n`;
    }
  }

  if (gridlines.minor) {
    xml += `        <c:minorGridlines/>\n`;
  }

  return xml;
}

export function generateAxisTickMarks(ax?: ChartAxisConfig): string {
  if (!ax) return "";
  let xml = "";
  if (ax.tickMark?.major) {
    xml += `        <c:majorTickMark val="${ax.tickMark.major}"/>\n`;
  }
  if (ax.tickMark?.minor) {
    xml += `        <c:minorTickMark val="${ax.tickMark.minor}"/>\n`;
  }
  return xml;
}

export function generateAxisTxPr(ax?: ChartAxisConfig): string {
  if (!ax || (!ax.labelFont && ax.labelRotation === undefined)) return "";

  const fontSize = ooxmlTextFontSize(ax.labelFont?.fontSize ?? 10, 10);
  const fontFamily = ax.labelFont?.fontFamily ?? "Calibri";
  const rotation = ax.labelRotation !== undefined ? ooxmlAngle(ax.labelRotation) : "0";
  let colorXml = "";
  if (ax.labelFont?.fontColor) {
    colorXml = `<a:solidFill><a:srgbClr val="${toHex(ax.labelFont.fontColor)}"/></a:solidFill>`;
  }
  const boldAttr = ax.labelFont?.bold ? ` b="1"` : "";
  const italicAttr = ax.labelFont?.italic ? ` i="1"` : "";

  let xml = `        <c:txPr>\n`;
  xml += `          <a:bodyPr rot="${rotation}"/>\n`;
  xml += `          <a:lstStyle/>\n`;
  xml += `          <a:p>\n`;
  xml += `            <a:pPr><a:defRPr sz="${fontSize}"${boldAttr}${italicAttr}>${colorXml}<a:latin typeface="${escapeXmlAttr(fontFamily)}"/></a:defRPr></a:pPr>\n`;
  xml += `            <a:endParaRPr lang="en-US" dirty="0"/>\n`;
  xml += `          </a:p>\n`;
  xml += `        </c:txPr>\n`;
  return xml;
}

export function generateAxisCrossesAt(ax?: ChartAxisConfig): string {
  if (!ax || ax.crossesAt === undefined) return "";
  return `        <c:crossesAt val="${ax.crossesAt}"/>\n`;
}

export function emitAxisScalingXml(min?: number, max?: number): string {
  let xml = `        <c:scaling>\n`;
  xml += `          <c:orientation val="minMax"/>\n`;
  if (max !== undefined) xml += `          <c:max val="${max}"/>\n`;
  if (min !== undefined) xml += `          <c:min val="${min}"/>\n`;
  xml += `        </c:scaling>\n`;
  return xml;
}

export function emitCategoryAxisScalingXml(chartData: ChartData): string {
  const orientation = chartData.chartType === "radar" ? "maxMin" : "minMax";
  return `        <c:scaling><c:orientation val="${orientation}"/></c:scaling>\n`;
}

export function generateXValueAxis(chartData: ChartData): string {
  const ax = chartData.categoryAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";

  let xml = `      <c:valAx>\n`;
  xml += `        <c:axId val="${X_VAL_AX_ID}"/>\n`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>\n`;
  xml += `        <c:axPos val="b"/>\n`;

  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }

  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>\n`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  }

  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>\n`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>\n`;
  xml += `        <c:tickLblPos val="nextTo"/>\n`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${Y_VAL_AX_ID}"/>\n`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>\n`;
  xml += `      </c:valAx>\n`;
  return xml;
}

export function generateYValueAxis(chartData: ChartData): string {
  const ax = chartData.valueAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";

  let xml = `      <c:valAx>\n`;
  xml += `        <c:axId val="${Y_VAL_AX_ID}"/>\n`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>\n`;
  xml += `        <c:axPos val="l"/>\n`;

  if (ax?.gridlines) {
    xml += generateGridlinesXml(ax.gridlines);
  } else {
    xml += `        <c:majorGridlines/>\n`;
  }

  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }

  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>\n`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  }

  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>\n`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>\n`;
  xml += `        <c:tickLblPos val="nextTo"/>\n`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${X_VAL_AX_ID}"/>\n`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>\n`;
  xml += `      </c:valAx>\n`;
  return xml;
}

export function generateSecondaryCategoryAxis(
  chartData: ChartData,
  barDirection?: "col" | "bar",
): string {
  const ax = chartData.secondaryCategoryAxis ?? chartData.categoryAxis;
  const visible = ax?.visible ?? false;
  const deleteAttr = visible ? "0" : "1";
  const axisPosition = barDirection === "bar" ? "r" : "t";

  let xml = `      <c:catAx>\n`;
  xml += `        <c:axId val="${SEC_CAT_AX_ID}"/>\n`;
  xml += `        <c:scaling><c:orientation val="minMax"/></c:scaling>\n`;
  xml += `        <c:delete val="${deleteAttr}"/>\n`;
  xml += `        <c:axPos val="${axisPosition}"/>\n`;

  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }

  xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>\n`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>\n`;
  xml += `        <c:tickLblPos val="nextTo"/>\n`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${SEC_VAL_AX_ID}"/>\n`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>\n`;
  xml += `        <c:auto val="1"/>\n`;
  xml += `        <c:lblAlgn val="ctr"/>\n`;
  xml += `        <c:lblOffset val="100"/>\n`;
  xml += `      </c:catAx>\n`;
  return xml;
}

export function generateSecondaryValueAxis(chartData: ChartData): string {
  const ax = chartData.secondaryValueAxis ?? chartData.valueAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";

  let xml = `      <c:valAx>\n`;
  xml += `        <c:axId val="${SEC_VAL_AX_ID}"/>\n`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>\n`;
  xml += `        <c:axPos val="r"/>\n`;

  if (ax?.gridlines) {
    xml += generateGridlinesXml(ax.gridlines);
  }

  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }

  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>\n`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  }

  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>\n`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>\n`;
  xml += `        <c:tickLblPos val="nextTo"/>\n`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${SEC_CAT_AX_ID}"/>\n`;
  xml += generateAxisCrossesAt(ax);
  xml += `        <c:crosses val="max"/>\n`;
  xml += `        <c:crossBetween val="between"/>\n`;
  xml += `      </c:valAx>\n`;
  return xml;
}

export function generateCategoryAxis(
  chartData: ChartData,
  barDirection?: "col" | "bar",
): string {
  const ax = chartData.categoryAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  const axisPosition = barDirection === "bar" ? "l" : "b";

  let xml = `      <c:catAx>\n`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += emitCategoryAxisScalingXml(chartData);
  xml += `        <c:delete val="${deleteAttr}"/>\n`;
  xml += `        <c:axPos val="${axisPosition}"/>\n`;

  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }

  xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>\n`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>\n`;
  xml += `        <c:tickLblPos val="nextTo"/>\n`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${VAL_AX_ID}"/>\n`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>\n`;
  xml += `        <c:auto val="1"/>\n`;
  xml += `        <c:lblAlgn val="ctr"/>\n`;
  xml += `        <c:lblOffset val="100"/>\n`;
  xml += `      </c:catAx>\n`;
  return xml;
}

export function generateValueAxis(
  chartData: ChartData,
  barDirection?: "col" | "bar",
): string {
  const ax = chartData.valueAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  const axisPosition = barDirection === "bar" ? "b" : "l";

  let xml = `      <c:valAx>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>\n`;
  xml += `        <c:axPos val="${axisPosition}"/>\n`;

  if (ax?.gridlines) {
    xml += generateGridlinesXml(ax.gridlines);
  } else {
    xml += `        <c:majorGridlines/>\n`;
  }

  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }

  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>\n`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>\n`;
  }

  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>\n`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>\n`;
  xml += `        <c:tickLblPos val="nextTo"/>\n`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${CAT_AX_ID}"/>\n`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>\n`;
  xml += `        <c:crossBetween val="between"/>\n`;
  xml += `      </c:valAx>\n`;
  return xml;
}

export function generateAxisTitle(
  title: string,
  fontFamily?: string,
  fontSize?: number,
  fontColor?: string,
): string {
  const size = ooxmlTextFontSize(fontSize ?? 10, 10);
  const family = fontFamily ?? "Calibri";
  let colorXml = `<a:srgbClr val="000000"/>`;
  if (fontColor) {
    colorXml = `<a:srgbClr val="${toHex(fontColor)}"/>`;
  }

  let xml = `        <c:title>\n`;
  xml += `          <c:tx>\n`;
  xml += `            <c:rich>\n`;
  xml += `              <a:bodyPr/>\n`;
  xml += `              <a:lstStyle/>\n`;
  xml += `              <a:p>\n`;
  xml += `                <a:r>\n`;
  xml += `                  <a:rPr lang="en-US" sz="${size}">\n`;
  xml += `                    <a:solidFill>${colorXml}</a:solidFill>\n`;
  xml += `                    <a:latin typeface="${escapeXmlAttr(family)}"/>\n`;
  xml += `                  </a:rPr>\n`;
  xml += `                  <a:t>${escapeXml(title)}</a:t>\n`;
  xml += `                </a:r>\n`;
  xml += `              </a:p>\n`;
  xml += `            </c:rich>\n`;
  xml += `          </c:tx>\n`;
  xml += `          <c:overlay val="0"/>\n`;
  xml += `        </c:title>\n`;
  return xml;
}
