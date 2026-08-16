import type {
  ChartAnnotation,
  ChartAreaStyle,
  ChartData,
} from "../../types/ast.js";
import { escapeXml, escapeXmlAttr } from "../drawing/textUtils.js";
import { PIXEL_TO_EMU, toHex } from "../drawing/math.js";
import { ooxmlRatio, ooxmlTextFontSize, ooxmlUInt } from "../xmlValues.js";
import type { ChartFrameSize } from "./chartLayout.js";
import {
  computeClassicChartLayout,
  resolveClassicLegendPosition,
} from "./chartLayout.js";

export function generatePlotAreaLayout(
  chartData: ChartData,
  frame?: ChartFrameSize,
): string {
  const layout = computeClassicChartLayout(chartData, frame);
  if (!layout || !layout.shouldEmitManualLayout) {
    return `      <c:layout/>\n`;
  }

  return [
    `      <c:layout>`,
    `        <c:manualLayout>`,
    `          <c:layoutTarget val="inner"/>`,
    `          <c:xMode val="edge"/>`,
    `          <c:yMode val="edge"/>`,
    `          <c:wMode val="factor"/>`,
    `          <c:hMode val="factor"/>`,
    `          <c:x val="${layout.plotArea.x}"/>`,
    `          <c:y val="${layout.plotArea.y}"/>`,
    `          <c:w val="${layout.plotArea.w}"/>`,
    `          <c:h val="${layout.plotArea.h}"/>`,
    `        </c:manualLayout>`,
    `      </c:layout>\n`,
  ].join("\n");
}

export function generateTitle(chartData: ChartData): string {
  const title = chartData.title!;
  const fontSize = ooxmlTextFontSize(title.fontSize ?? 14, 14);
  const bold = title.bold ? ` b="1"` : "";
  const fontFamily = title.fontFamily ?? "Calibri";
  let colorXml = `<a:srgbClr val="000000"/>`;
  if (title.fontColor) {
    colorXml = `<a:srgbClr val="${toHex(title.fontColor)}"/>`;
  }

  let xml = `    <c:title>\n`;
  xml += `      <c:tx>\n`;
  xml += `        <c:rich>\n`;
  xml += `          <a:bodyPr/>\n`;
  xml += `          <a:lstStyle/>\n`;
  xml += `          <a:p>\n`;
  xml += `            <a:r>\n`;
  xml += `              <a:rPr lang="en-US" sz="${fontSize}"${bold}>\n`;
  xml += `                <a:solidFill>${colorXml}</a:solidFill>\n`;
  xml += `                <a:latin typeface="${escapeXmlAttr(fontFamily)}"/>\n`;
  xml += `              </a:rPr>\n`;
  xml += `              <a:t>${escapeXml(title.text!)}</a:t>\n`;
  xml += `            </a:r>\n`;
  xml += `          </a:p>\n`;
  xml += `        </c:rich>\n`;
  xml += `      </c:tx>\n`;
  xml += `      <c:overlay val="0"/>\n`;
  xml += `    </c:title>\n`;
  return xml;
}

export function generateAreaSpPr(area?: ChartAreaStyle): string {
  if (!area) return `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>`;
  let xml = `<c:spPr>`;
  if (area.fill) {
    xml += `<a:solidFill><a:srgbClr val="${toHex(area.fill)}"/></a:solidFill>`;
  } else {
    xml += `<a:noFill/>`;
  }
  if (area.borderColor || area.borderWidth) {
    const width = area.borderWidth
      ? ooxmlUInt(area.borderWidth * PIXEL_TO_EMU)
      : PIXEL_TO_EMU;
    const color = toHex(area.borderColor ?? "#000000");
    xml += `<a:ln w="${width}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>`;
  } else {
    xml += `<a:ln><a:noFill/></a:ln>`;
  }
  xml += `</c:spPr>`;
  return xml;
}

export function generateLegend(
  chartData: ChartData,
  frame?: ChartFrameSize,
): string {
  const pos = resolveClassicLegendPosition(chartData, frame);
  if (pos === "none") return "";
  const layout = computeClassicChartLayout(chartData, frame);

  const posMap: Record<string, string> = {
    bottom: "b",
    top: "t",
    left: "l",
    right: "r",
  };

  let xml = `    <c:legend>\n`;
  xml += `      <c:legendPos val="${posMap[pos] ?? "b"}"/>\n`;
  xml += generateLegendLayout(layout, frame);

  if (chartData.chartType === "waterfall") {
    xml += `      <c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>\n`;
  } else if (chartData.chartType === "funnel") {
    xml += `      <c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>\n`;
    xml += `      <c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry>\n`;
  }

  xml += `      <c:overlay val="0"/>\n`;

  const legendFill = chartData.legend?.fill;
  const legendBorder = chartData.legend?.border;
  if (legendFill || legendBorder) {
    xml += `      <c:spPr>\n`;
    if (legendFill) {
      const fillColor = toHex(legendFill);
      xml += `        <a:solidFill><a:srgbClr val="${fillColor}"/></a:solidFill>\n`;
    }
    if (legendBorder) {
      const borderColor = toHex(legendBorder.color ?? "#000000");
      const borderWidth = legendBorder.width
        ? ooxmlUInt(legendBorder.width * PIXEL_TO_EMU)
        : PIXEL_TO_EMU;
      xml += `        <a:ln w="${borderWidth}"><a:solidFill><a:srgbClr val="${borderColor}"/></a:solidFill></a:ln>\n`;
    }
    xml += `      </c:spPr>\n`;
  }

  if (
    chartData.legend?.fontFamily ||
    chartData.legend?.fontSize ||
    chartData.legend?.fontColor
  ) {
    const size = ooxmlTextFontSize(chartData.legend.fontSize ?? 10, 10);
    const family = chartData.legend.fontFamily ?? "Calibri";
    let colorXml = "";
    if (chartData.legend.fontColor) {
      const color = toHex(chartData.legend.fontColor);
      colorXml = `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`;
    }
    xml += `      <c:txPr>\n`;
    xml += `        <a:bodyPr/>\n`;
    xml += `        <a:lstStyle/>\n`;
    xml += `        <a:p>\n`;
    xml += `          <a:pPr><a:defRPr sz="${size}">${colorXml}<a:latin typeface="${escapeXmlAttr(family)}"/></a:defRPr></a:pPr>\n`;
    xml += `          <a:endParaRPr lang="en-US" dirty="0"/>\n`;
    xml += `        </a:p>\n`;
    xml += `      </c:txPr>\n`;
  }

  xml += `    </c:legend>\n`;
  return xml;
}

function generateLegendLayout(
  layout: ReturnType<typeof computeClassicChartLayout>,
  frame?: ChartFrameSize,
): string {
  const box = layout?.legendBox;
  if (!frame || !layout?.shouldEmitManualLayout || !box) return "";
  const xNumber = Math.min(1, Math.max(0, box.left / frame.width));
  const yNumber = Math.min(1, Math.max(0, box.top / frame.height));
  const x = ooxmlRatio(xNumber);
  const y = ooxmlRatio(yNumber);
  const w = ooxmlRatio(Math.min(box.width / frame.width, 1 - xNumber));
  const h = ooxmlRatio(Math.min(box.height / frame.height, 1 - yNumber));
  return [
    `      <c:layout>`,
    `        <c:manualLayout>`,
    `          <c:xMode val="edge"/>`,
    `          <c:yMode val="edge"/>`,
    `          <c:wMode val="factor"/>`,
    `          <c:hMode val="factor"/>`,
    `          <c:x val="${x}"/>`,
    `          <c:y val="${y}"/>`,
    `          <c:w val="${w}"/>`,
    `          <c:h val="${h}"/>`,
    `        </c:manualLayout>`,
    `      </c:layout>\n`,
  ].join("\n");
}

export function generateChartDrawingXml(
  annotations: ChartAnnotation[],
): string {
  // Only the legacy text-kind annotations render as chart-bound user
  // shapes. trendArrow / targetLine kinds are resolved upstream into
  // slide-level Connector + Text shapes (see resolveAnnotations.ts), so
  // we skip them here.
  const textAnnotations = annotations.filter(
    (a) => (a.kind ?? "text") === "text",
  ) as Array<Extract<ChartAnnotation, { kind?: "text" }>>;

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<c:userShapes xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:cdr="http://schemas.openxmlformats.org/drawingml/2006/chartDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">\n`;

  for (let i = 0; i < textAnnotations.length; i++) {
    const annotation = textAnnotations[i];
    const fromX = ooxmlRatio(annotation.x / 100);
    const fromY = ooxmlRatio(annotation.y / 100);
    const toX = ooxmlRatio((annotation.x + (annotation.width ?? 20)) / 100);
    const toY = ooxmlRatio((annotation.y + (annotation.height ?? 10)) / 100);
    const shape = annotation.shapeType ?? "rect";
    const fontSize = ooxmlTextFontSize(annotation.fontSize ?? 10, 10);
    const fontFamily = annotation.fontFamily ?? "Calibri";
    const bold = annotation.bold ? ` b="1"` : "";
    const italic = annotation.italic ? ` i="1"` : "";

    xml += `  <cdr:relSizeAnchor>\n`;
    xml += `    <cdr:from><cdr:x>${fromX}</cdr:x><cdr:y>${fromY}</cdr:y></cdr:from>\n`;
    xml += `    <cdr:to><cdr:x>${toX}</cdr:x><cdr:y>${toY}</cdr:y></cdr:to>\n`;
    xml += `    <cdr:sp>\n`;
    xml += `      <cdr:nvSpPr>\n`;
    xml += `        <cdr:cNvPr id="${i + 2}" name="Annotation ${i + 1}"/>\n`;
    xml += `        <cdr:cNvSpPr/>\n`;
    xml += `      </cdr:nvSpPr>\n`;
    xml += `      <cdr:spPr>\n`;
    xml += `        <a:prstGeom prst="${shape}"><a:avLst/></a:prstGeom>\n`;

    if (annotation.fill) {
      const fillColor = toHex(annotation.fill);
      xml += `        <a:solidFill><a:srgbClr val="${fillColor}"/></a:solidFill>\n`;
    } else {
      xml += `        <a:noFill/>\n`;
    }

    if (annotation.borderColor || annotation.borderWidth) {
      const borderColor = toHex(annotation.borderColor ?? "#000000");
      const borderWidth = annotation.borderWidth
        ? ooxmlUInt(annotation.borderWidth * PIXEL_TO_EMU)
        : PIXEL_TO_EMU;
      xml += `        <a:ln w="${borderWidth}"><a:solidFill><a:srgbClr val="${borderColor}"/></a:solidFill></a:ln>\n`;
    }

    xml += `      </cdr:spPr>\n`;
    xml += `      <cdr:txBody>\n`;
    xml += `        <a:bodyPr vertOverflow="clip" wrap="square"/>\n`;
    xml += `        <a:lstStyle/>\n`;
    xml += `        <a:p>\n`;
    xml += `          <a:r>\n`;

    let colorXml = "";
    if (annotation.fontColor) {
      const fontColor = toHex(annotation.fontColor);
      colorXml = `<a:solidFill><a:srgbClr val="${fontColor}"/></a:solidFill>`;
    }
    xml += `            <a:rPr lang="en-US" sz="${fontSize}"${bold}${italic}>${colorXml}<a:latin typeface="${escapeXmlAttr(fontFamily)}"/></a:rPr>\n`;
    xml += `            <a:t>${escapeXml(annotation.text)}</a:t>\n`;
    xml += `          </a:r>\n`;
    xml += `        </a:p>\n`;
    xml += `      </cdr:txBody>\n`;
    xml += `    </cdr:sp>\n`;
    xml += `  </cdr:relSizeAnchor>\n`;
  }

  xml += `</c:userShapes>`;
  return xml;
}
