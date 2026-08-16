// src/ooxml/drawing/connector.ts — Connector shape emitter (<p:cxnSp>)
import type { PaperConnector, ConnectorType, ArrowHeadConfig } from "../../types/ast.js";
import { toEmu, emitColorXml } from "./math.js";
import { escapeXmlAttr, emitLocksXml, emitDecorativeExtXml } from "./textUtils.js";

const CONNECTOR_PRESET_MAP: Record<ConnectorType, string> = {
  straight: "line",
  elbow: "bentConnector3",
  curved: "curvedConnector3",
};

export function generateConnectorXml(
  connector: PaperConnector,
  shapeId: number,
): string {
  const { start, end, connectorType, arrowStart, arrowEnd } = connector;
  const morphId = connector.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Connector ${shapeId}`;

  // Compute bounding box
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  const bboxWidth = maxX - minX || 1; // avoid zero
  const bboxHeight = maxY - minY || 1;

  // Flip flags when end is above/left of start
  const flipH = end.x < start.x;
  const flipV = end.y < start.y;

  const prst = CONNECTOR_PRESET_MAP[connectorType] ?? "line";
  const lineWidth = connector.lineWidth ?? 1;
  const lineColor = connector.lineColor ?? "#000000";
  const dashStyle = connector.lineDashStyle;

  // Build xfrm attributes
  const xfrmAttrs: string[] = [];
  if (flipH) xfrmAttrs.push('flipH="1"');
  if (flipV) xfrmAttrs.push('flipV="1"');
  const xfrmAttrStr = xfrmAttrs.length > 0 ? " " + xfrmAttrs.join(" ") : "";

  const altText = connector.altText;
  const decorative = connector.decorative;
  const userLocks = connector.locks;

  let xml = `<p:cxnSp>\n`;

  // Non-visual properties
  xml += `  <p:nvCxnSpPr>\n`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  if (decorative) {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}>${emitDecorativeExtXml()}</p:cNvPr>\n`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>\n`;
  }
  // Connection point snapping + locks
  const hasStartShape = connector.startShape !== undefined;
  const hasEndShape = connector.endShape !== undefined;
  const hasLocks = userLocks !== undefined;
  if (hasStartShape || hasEndShape || hasLocks) {
    xml += `    <p:cNvCxnSpPr>`;
    if (hasLocks) xml += emitLocksXml("a:cxnSpLocks", userLocks!);
    if (hasStartShape) {
      xml += `<a:stCxn id="${connector.startShape!.shapeId}" idx="${connector.startShape!.site ?? 0}"/>`;
    }
    if (hasEndShape) {
      xml += `<a:endCxn id="${connector.endShape!.shapeId}" idx="${connector.endShape!.site ?? 0}"/>`;
    }
    xml += `</p:cNvCxnSpPr>\n`;
  } else {
    xml += `    <p:cNvCxnSpPr/>\n`;
  }
  xml += `    <p:nvPr/>\n`;
  xml += `  </p:nvCxnSpPr>\n`;

  // Shape properties
  xml += `  <p:spPr>\n`;
  xml += `    <a:xfrm${xfrmAttrStr}>\n`;
  xml += `      <a:off x="${toEmu(minX)}" y="${toEmu(minY)}"/>\n`;
  xml += `      <a:ext cx="${toEmu(bboxWidth)}" cy="${toEmu(bboxHeight)}"/>\n`;
  xml += `    </a:xfrm>\n`;
  xml += `    <a:prstGeom prst="${escapeXmlAttr(prst)}"><a:avLst/></a:prstGeom>\n`;

  // Line styling
  const lineWidthEmu = toEmu(lineWidth);
  xml += `    <a:ln w="${lineWidthEmu}">\n`;
  xml += `      <a:solidFill>${emitColorXml(lineColor)}</a:solidFill>\n`;

  if (dashStyle && dashStyle !== "solid") {
    const dashMap: Record<string, string> = { dashed: "dash", dotted: "dot", dotDash: "dashDot" };
    xml += `      <a:prstDash val="${dashMap[dashStyle] || "solid"}"/>\n`;
  }

  // Arrow heads — support both boolean and ArrowHeadConfig
  if (arrowStart) {
    if (typeof arrowStart === "object") {
      const cfg = arrowStart as ArrowHeadConfig;
      const wAttr = cfg.width ? ` w="${escapeXmlAttr(cfg.width)}"` : "";
      const lenAttr = cfg.length ? ` len="${escapeXmlAttr(cfg.length)}"` : "";
      xml += `      <a:headEnd type="${escapeXmlAttr(cfg.type)}"${wAttr}${lenAttr}/>\n`;
    } else {
      xml += `      <a:headEnd type="triangle"/>\n`;
    }
  }
  if (arrowEnd) {
    if (typeof arrowEnd === "object") {
      const cfg = arrowEnd as ArrowHeadConfig;
      const wAttr = cfg.width ? ` w="${escapeXmlAttr(cfg.width)}"` : "";
      const lenAttr = cfg.length ? ` len="${escapeXmlAttr(cfg.length)}"` : "";
      xml += `      <a:tailEnd type="${escapeXmlAttr(cfg.type)}"${wAttr}${lenAttr}/>\n`;
    } else {
      xml += `      <a:tailEnd type="triangle"/>\n`;
    }
  }

  xml += `    </a:ln>\n`;
  xml += `  </p:spPr>\n`;

  xml += `</p:cxnSp>\n`;
  return xml;
}
