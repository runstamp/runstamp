// src/ooxml/drawing/geometry.ts — Custom geometry path emitter
import type { CustomGeometry, PathCommand } from "../../types/ast.js";

function emitCommand(cmd: PathCommand): string {
  switch (cmd.type) {
    case "moveTo":
      return `<a:moveTo><a:pt x="${cmd.x}" y="${cmd.y}"/></a:moveTo>`;
    case "lineTo":
      return `<a:lnTo><a:pt x="${cmd.x}" y="${cmd.y}"/></a:lnTo>`;
    case "cubicBezTo":
      return `<a:cubicBezTo><a:pt x="${cmd.cp1x}" y="${cmd.cp1y}"/><a:pt x="${cmd.cp2x}" y="${cmd.cp2y}"/><a:pt x="${cmd.x}" y="${cmd.y}"/></a:cubicBezTo>`;
    case "quadBezTo":
      return `<a:quadBezTo><a:pt x="${cmd.cpx}" y="${cmd.cpy}"/><a:pt x="${cmd.x}" y="${cmd.y}"/></a:quadBezTo>`;
    case "arcTo":
      return `<a:arcTo wR="${cmd.wR}" hR="${cmd.hR}" stAng="${cmd.stAng}" swAng="${cmd.swAng}"/>`;
    case "close":
      return `<a:close/>`;
    default:
      return "";
  }
}

export function emitCustomGeomXml(geom: CustomGeometry): string {
  let xml = `    <a:custGeom>\n`;
  xml += `      <a:avLst/>\n`;
  xml += `      <a:gdLst/>\n`;
  xml += `      <a:ahLst/>\n`;
  xml += `      <a:cxnLst/>\n`;
  xml += `      <a:rect l="l" t="t" r="r" b="b"/>\n`;
  xml += `      <a:pathLst>\n`;

  for (const path of geom.paths) {
    const w = path.width ?? 1000000;
    const h = path.height ?? 1000000;
    const fillAttr = path.fill ? ` fill="${path.fill}"` : "";
    xml += `        <a:path w="${w}" h="${h}"${fillAttr}>`;
    for (const cmd of path.commands) {
      xml += emitCommand(cmd);
    }
    xml += `</a:path>\n`;
  }

  xml += `      </a:pathLst>\n`;
  xml += `    </a:custGeom>\n`;
  return xml;
}
