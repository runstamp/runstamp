// src/ooxml/drawing/webVideo.ts — Web video (YouTube/Vimeo) XML generation
import type { LayoutVideo } from "../../layout/extract.js";
import { toEmu } from "./math.js";
import { escapeXmlAttr } from "./textUtils.js";

/**
 * Generates an <mc:AlternateContent> wrapper for web video embedding.
 * <mc:Choice Requires="we"> contains the web extension with embed URL.
 * <mc:Fallback> contains a static poster image with hyperlink.
 */
export function generateWebVideoXml(
  node: LayoutVideo,
  shapeId: number,
  webVideo: { embedUrl: string; watchUrl: string; hyperlinkRId: string },
  posterRId?: string,
): string {
  const { x, y, width, height } = node.layout;
  const name = `Web Video ${shapeId}`;
  const altText = node.altText ? ` descr="${escapeXmlAttr(node.altText)}"` : "";
  const fallbackShapeId = shapeId + 100000;

  let xml = `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">\n`;
  xml += `  <mc:Choice Requires="we">\n`;
  xml += `    <p:pic>\n`;
  xml += `      <p:nvPicPr>\n`;
  xml += `        <p:cNvPr id="${shapeId}" name="${name}"${altText}>\n`;
  xml += `          <a:hlinkClick r:id="${webVideo.hyperlinkRId}"/>\n`;
  xml += `        </p:cNvPr>\n`;
  xml += `        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>\n`;
  xml += `        <p:nvPr>\n`;
  xml += `          <p:extLst>\n`;
  xml += `            <p:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}">\n`;
  xml += `              <we:webextension xmlns:we="http://schemas.microsoft.com/office/webextensions/webextension/2010/11">\n`;
  xml += `                <we:webvideo h="${toEmu(height)}" w="${toEmu(width)}" src="${escapeXmlAttr(webVideo.embedUrl)}"/>\n`;
  xml += `              </we:webextension>\n`;
  xml += `            </p:ext>\n`;
  xml += `          </p:extLst>\n`;
  xml += `        </p:nvPr>\n`;
  xml += `      </p:nvPicPr>\n`;
  xml += `      <p:blipFill>\n`;
  xml += posterRId ? `        <a:blip r:embed="${posterRId}"/>\n` : `        <a:blip/>\n`;
  xml += `        <a:stretch><a:fillRect/></a:stretch>\n`;
  xml += `      </p:blipFill>\n`;
  xml += `      <p:spPr>\n`;
  xml += `        <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/></a:xfrm>\n`;
  xml += `        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
  xml += `      </p:spPr>\n`;
  xml += `    </p:pic>\n`;
  xml += `  </mc:Choice>\n`;
  xml += `  <mc:Fallback>\n`;
  xml += `    <p:pic>\n`;
  xml += `      <p:nvPicPr>\n`;
  xml += `        <p:cNvPr id="${fallbackShapeId}" name="Video Fallback">\n`;
  xml += `          <a:hlinkClick r:id="${webVideo.hyperlinkRId}"/>\n`;
  xml += `        </p:cNvPr>\n`;
  xml += `        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>\n`;
  xml += `        <p:nvPr/>\n`;
  xml += `      </p:nvPicPr>\n`;
  xml += `      <p:blipFill>\n`;
  xml += posterRId ? `        <a:blip r:embed="${posterRId}"/>\n` : `        <a:blip/>\n`;
  xml += `        <a:stretch><a:fillRect/></a:stretch>\n`;
  xml += `      </p:blipFill>\n`;
  xml += `      <p:spPr>\n`;
  xml += `        <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/></a:xfrm>\n`;
  xml += `        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
  xml += `      </p:spPr>\n`;
  xml += `    </p:pic>\n`;
  xml += `  </mc:Fallback>\n`;
  xml += `</mc:AlternateContent>\n`;

  return xml;
}
