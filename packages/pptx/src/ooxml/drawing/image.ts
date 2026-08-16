// src/ooxml/drawing/image.ts
import type { LayoutImage } from "../../layout/extract.js";
import type { ShapeLocks } from "../../types/ast.js";
import { toEmu, emitColorXml } from "./math.js";
import { escapeXmlAttr, emitLocksXml, emitDecorativeExtXml, shouldOmitTransform, resolveHyperlink, type HyperlinkRel } from "./textUtils.js";

export interface ImageEmitResult {
  xml: string;
  hyperlinkRels: HyperlinkRel[];
}

export function generateImageXml(
  node: LayoutImage,
  shapeId: number,
  rId: string,
  hyperlinkRIdStart: number = 200,
  svgRId?: string,
): ImageEmitResult {
  const { x, y, width, height } = node.layout;
  const { placeholder, _omitTransform: omitTransform, crop, borderRadius,
    altText, hyperlink, decorative, locks: userLocks, imageEffects, morphId } = node;

  const hyperlinkRels: HyperlinkRel[] = [];

  // Emit nvPr with optional placeholder reference
  let nvPrXml: string;
  if (placeholder) {
    const typeAttr = placeholder.type ? ` type="${placeholder.type}"` : "";
    const idxAttr = placeholder.idx !== undefined ? ` idx="${placeholder.idx}"` : "";
    nvPrXml = `    <p:nvPr><p:ph${typeAttr}${idxAttr}/></p:nvPr>\n`;
  } else {
    nvPrXml = `    <p:nvPr/>\n`;
  }
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Image ${shapeId}`;

  // Alt text and hyperlink on cNvPr
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  let cNvPrChildren = "";
  if (hyperlink) {
    const hyperlinkRIdCounter = { current: hyperlinkRIdStart };
    const { hlinkXml } = resolveHyperlink(hyperlink, hyperlinkRels, hyperlinkRIdCounter);
    if (hlinkXml) {
      cNvPrChildren += hlinkXml;
    }
  }
  if (decorative) {
    cNvPrChildren += emitDecorativeExtXml();
  }

  // Determine geometry based on borderRadius
  const geomPreset = borderRadius && borderRadius > 0 ? "roundRect" : "rect";

  let xml = `<p:pic>\n`;
  xml += `  <p:nvPicPr>\n`;
  if (cNvPrChildren) {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}>${cNvPrChildren}</p:cNvPr>\n`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>\n`;
  }
  xml += `    <p:cNvPicPr>\n`;
  const picLockDefaults: ShapeLocks = { noGrp: true, noChangeAspect: true };
  xml += `      ${emitLocksXml("a:picLocks", userLocks, picLockDefaults)}\n`;
  xml += `    </p:cNvPicPr>\n`;
  xml += nvPrXml;
  xml += `  </p:nvPicPr>\n`;

  xml += `  <p:blipFill>\n`;
  xml += `    <a:blip r:embed="${rId}">\n`;

  // Image effects (inside blip, before extLst)
  if (imageEffects) {
    // Luminance (brightness + contrast)
    if (imageEffects.brightness !== undefined || imageEffects.contrast !== undefined) {
      const brightAttr = imageEffects.brightness !== undefined ? ` bright="${Math.round(imageEffects.brightness * 1000)}"` : "";
      const contrastAttr = imageEffects.contrast !== undefined ? ` contrast="${Math.round(imageEffects.contrast * 1000)}"` : "";
      xml += `      <a:lum${brightAttr}${contrastAttr}/>\n`;
    }
    // Grayscale
    if (imageEffects.grayscale) {
      xml += `      <a:grayscl/>\n`;
    }
    // BiLevel (black & white threshold)
    if (imageEffects.biLevel !== undefined) {
      xml += `      <a:biLevel thresh="${imageEffects.biLevel}"/>\n`;
    }
    // Duotone
    if (imageEffects.duotone) {
      xml += `      <a:duotone>${emitColorXml(imageEffects.duotone.color1)}${emitColorXml(imageEffects.duotone.color2)}</a:duotone>\n`;
    }
    // Blur
    if (imageEffects.blur !== undefined) {
      const blurRad = toEmu(imageEffects.blur);
      xml += `      <a:blur rad="${blurRad}" grow="0"/>\n`;
    }
  }

  xml += `      <a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext>`;
  if (svgRId) {
    xml += `<a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${svgRId}"/></a:ext>`;
  }
  xml += `</a:extLst>\n`;
  xml += `    </a:blip>\n`;

  // Crop (srcRect)
  if (crop && (crop.left || crop.top || crop.right || crop.bottom)) {
    const l = Math.min(100000, Math.max(0, Math.round((crop.left ?? 0) * 1000)));
    const t = Math.min(100000, Math.max(0, Math.round((crop.top ?? 0) * 1000)));
    const r = Math.min(100000, Math.max(0, Math.round((crop.right ?? 0) * 1000)));
    const b = Math.min(100000, Math.max(0, Math.round((crop.bottom ?? 0) * 1000)));
    xml += `    <a:srcRect l="${l}" t="${t}" r="${r}" b="${b}"/>\n`;
  }

  xml += `    <a:stretch><a:fillRect/></a:stretch>\n`;
  xml += `  </p:blipFill>\n`;

  xml += `  <p:spPr>\n`;
  if (!shouldOmitTransform(node.layout, omitTransform)) {
    xml += `    <a:xfrm>\n`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
    xml += `    </a:xfrm>\n`;
  }

  // Geometry
  if (geomPreset === "roundRect" && borderRadius) {
    // Convert pixel borderRadius to OOXML adjustment value
    // Adjustment is in 1/50000ths of the shorter side
    const shorterSide = Math.min(width, height);
    const adjVal = shorterSide > 0 ? Math.round((borderRadius / shorterSide) * 50000) : 16667;
    xml += `    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adjVal}"/></a:avLst></a:prstGeom>\n`;
  } else {
    xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
  }

  xml += `  </p:spPr>\n`;
  xml += `</p:pic>\n`;

  return { xml, hyperlinkRels };
}
