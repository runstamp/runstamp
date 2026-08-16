// src/ooxml/drawing/chart.ts — Chart graphicFrame XML for slides
import type { LayoutChart } from "../../layout/extract.js";
import { toEmu } from "./math.js";
import { escapeXmlAttr } from "./textUtils.js";

/**
 * Generates an <mc:AlternateContent> wrapper that presents a native chart
 * to capable viewers and a rasterized PNG fallback to others.
 *
 * @param node             Layout node with position/size.
 * @param shapeId          Shape ID for the graphicFrame.
 * @param chartRId         rId linking to the chart XML part.
 * @param fallbackImageRId rId linking to the fallback PNG image.
 * @param isChartEx        true for ChartEx (cx:chart) types, false for classic.
 */
export function generateChartAlternateContentXml(
  node: LayoutChart,
  shapeId: number,
  chartRId: string,
  fallbackImageRId: string,
  isChartEx: boolean,
): string {
  // Reuse existing frame generators for the <mc:Choice> content
  const chartFrameXml = isChartEx
    ? generateChartExFrameXml(node, shapeId, chartRId)
    : generateChartFrameXml(node, shapeId, chartRId);

  const requiresAttr = isChartEx ? "cx" : "c";
  const requiresNs = isChartEx
    ? `xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"`
    : `xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"`;
  const { x, y, width, height } = node.layout;
  const fallbackShapeId = shapeId + 100000; // large offset to avoid collision with shape IDs

  let xml = `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ${requiresNs}>\n`;
  xml += `  <mc:Choice Requires="${requiresAttr}">\n`;
  xml += chartFrameXml;
  xml += `  </mc:Choice>\n`;
  xml += `  <mc:Fallback>\n`;
  xml += `    <p:pic>\n`;
  xml += `      <p:nvPicPr>\n`;
  xml += `        <p:cNvPr id="${fallbackShapeId}" name="Chart Fallback"/>\n`;
  xml += `        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>\n`;
  xml += `        <p:nvPr/>\n`;
  xml += `      </p:nvPicPr>\n`;
  xml += `      <p:blipFill>\n`;
  xml += `        <a:blip r:embed="${fallbackImageRId}"/>\n`;
  xml += `        <a:stretch><a:fillRect/></a:stretch>\n`;
  xml += `      </p:blipFill>\n`;
  xml += `      <p:spPr>\n`;
  xml += `        <a:xfrm>\n`;
  xml += `          <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
  xml += `          <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
  xml += `        </a:xfrm>\n`;
  xml += `        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
  xml += `      </p:spPr>\n`;
  xml += `    </p:pic>\n`;
  xml += `  </mc:Fallback>\n`;
  xml += `</mc:AlternateContent>\n`;

  return xml;
}

export function generateChartFallbackImageXml(
  node: LayoutChart,
  shapeId: number,
  fallbackImageRId: string,
): string {
  const { x, y, width, height } = node.layout;

  let xml = `<p:pic>\n`;
  xml += `  <p:nvPicPr>\n`;
  xml += `    <p:cNvPr id="${shapeId}" name="Chart Fallback"/>\n`;
  xml += `    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>\n`;
  xml += `    <p:nvPr/>\n`;
  xml += `  </p:nvPicPr>\n`;
  xml += `  <p:blipFill>\n`;
  xml += `    <a:blip r:embed="${fallbackImageRId}"/>\n`;
  xml += `    <a:stretch><a:fillRect/></a:stretch>\n`;
  xml += `  </p:blipFill>\n`;
  xml += `  <p:spPr>\n`;
  xml += `    <a:xfrm>\n`;
  xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
  xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
  xml += `    </a:xfrm>\n`;
  xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
  xml += `  </p:spPr>\n`;
  xml += `</p:pic>\n`;
  return xml;
}

/**
 * Generates the <p:graphicFrame> wrapper that embeds a classic chart into a slide.
 */
export function generateChartFrameXml(
  node: LayoutChart,
  shapeId: number,
  chartRId: string,
): string {
  const { x, y, width, height } = node.layout;

  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Chart ${shapeId}`;
  const altText = node.altText;

  let xml = `<p:graphicFrame>\n`;
  xml += `  <p:nvGraphicFramePr>\n`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>\n`;
  xml += `    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>\n`;
  xml += `    <p:nvPr/>\n`;
  xml += `  </p:nvGraphicFramePr>\n`;

  xml += `  <p:xfrm>\n`;
  xml += `    <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
  xml += `    <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
  xml += `  </p:xfrm>\n`;

  xml += `  <a:graphic>\n`;
  xml += `    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">\n`;
  xml += `      <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chartRId}"/>\n`;
  xml += `    </a:graphicData>\n`;
  xml += `  </a:graphic>\n`;
  xml += `</p:graphicFrame>\n`;

  return xml;
}

/**
 * Generates the <p:graphicFrame> wrapper that embeds a ChartEx (cx:chart) into a slide.
 * Used for treemap, sunburst, histogram, and box & whisker charts.
 */
export function generateChartExFrameXml(
  node: LayoutChart,
  shapeId: number,
  chartRId: string,
): string {
  const { x, y, width, height } = node.layout;

  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Chart ${shapeId}`;
  const altText = node.altText;

  let xml = `<p:graphicFrame>\n`;
  xml += `  <p:nvGraphicFramePr>\n`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>\n`;
  xml += `    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>\n`;
  xml += `    <p:nvPr/>\n`;
  xml += `  </p:nvGraphicFramePr>\n`;

  xml += `  <p:xfrm>\n`;
  xml += `    <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
  xml += `    <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
  xml += `  </p:xfrm>\n`;

  xml += `  <a:graphic>\n`;
  xml += `    <a:graphicData uri="http://schemas.microsoft.com/office/drawing/2014/chartex">\n`;
  xml += `      <cx:chart xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chartRId}"/>\n`;
  xml += `    </a:graphicData>\n`;
  xml += `  </a:graphic>\n`;
  xml += `</p:graphicFrame>\n`;

  return xml;
}
