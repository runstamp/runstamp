// src/ooxml/drawing/text.ts
import type { LayoutNode, LayoutText } from "../../layout/extract.js";
import type {
  TextStyle, ColorValue,
} from "../../types/ast.js";
import { toEmu, emitColorXml } from "./math.js";
import {
  normalizeToParagraphs,
  VERTICAL_ALIGN_MAP,
  emitParagraphsXml,
  escapeXmlAttr,
  shouldOmitTransform,
  emitDecorativeExtXml,
} from "./textUtils.js";
import { emitAutoFitXml, resolveAutoFitPolicy } from "./autoFitPolicy.js";
import { isLiteBundle } from "../../engineMode.js";

// Re-export HyperlinkRel from textUtils for backward compatibility
export type { HyperlinkRel } from "./textUtils.js";
import type { HyperlinkRel } from "./textUtils.js";

export interface TextEmitResult {
  xml: string;
  hyperlinkRels: HyperlinkRel[];
}

// ---------------------------------------------------------------------------
// Text body properties
// ---------------------------------------------------------------------------

function emitBodyPr(
  textStyle: TextStyle | undefined,
  autoFitXml: string,
  singleLineShrinkWrapped: boolean,
): string {
  const vertAlign = textStyle?.verticalAlign;
  const textInsets = textStyle?.textInsets;
  const textDir = textStyle?.textDirection;
  const rtl = textStyle?.rtl;

  const attrs: string[] = [
    `wrap="${singleLineShrinkWrapped ? "none" : "square"}"`,
    `rtlCol="${rtl ? "1" : "0"}"`,
    'spcFirstLastPara="0"',
  ];

  if (vertAlign) {
    attrs.push(`anchor="${VERTICAL_ALIGN_MAP[vertAlign] || "t"}"`);
  }

  if (textInsets) {
    attrs.push(`lIns="${toEmu(textInsets.left ?? 0)}"`);
    attrs.push(`tIns="${toEmu(textInsets.top ?? 0)}"`);
    attrs.push(`rIns="${toEmu(textInsets.right ?? 0)}"`);
    attrs.push(`bIns="${toEmu(textInsets.bottom ?? 0)}"`);
  } else {
    // Zero out PowerPoint's implicit 91440 EMU (9.6px) defaults so Yoga
    // measurement matches rendered text width exactly.
    attrs.push('lIns="0"', 'tIns="0"', 'rIns="0"', 'bIns="0"');
  }

  // Vertical text direction
  if (textDir === "vertical") attrs.push('vert="vert270"');
  else if (textDir === "verticalEA") attrs.push('vert="eaVert"');

  // Text columns
  if (textStyle?.columns !== undefined && textStyle.columns > 1) {
    attrs.push(`numCol="${textStyle.columns}"`);
    if (textStyle.columnSpacing !== undefined) {
      attrs.push(`spcCol="${toEmu(textStyle.columnSpacing)}"`);
    }
  }

  const attrStr = attrs.join(" ");

  // Build body children
  const bodyChildren: string[] = [];

  // TextWarp (WordArt) — not supported in free mode
  if (!isLiteBundle() && textStyle?.textWarp && textStyle.textWarp !== "textNoShape") {
    bodyChildren.push(`<a:prstTxWarp prst="${escapeXmlAttr(textStyle.textWarp)}"><a:avLst/></a:prstTxWarp>`);
  }

  if (autoFitXml) {
    bodyChildren.push(autoFitXml);
  }

  if (bodyChildren.length > 0) {
    return `    <a:bodyPr ${attrStr}>${bodyChildren.join("")}</a:bodyPr>\n`;
  }

  return `    <a:bodyPr ${attrStr}/>\n`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generates the DrawingML XML for a text shape, supporting rich text runs,
 * hyperlinks, scheme colors, font fallback tags, auto-fit, multi-paragraph,
 * bullets, text body properties, and superscript/subscript.
 */
export function generateTextXml(
  node: LayoutNode,
  shapeId: number,
  hyperlinkRIdStart: number = 100,
): TextEmitResult {
  const { x, y, width, height } = node.layout;
  const textStyle = node.style as TextStyle | undefined;
  const bgColor: ColorValue | undefined = textStyle?.backgroundColor;
  const autoFitResult = node._autoFitResult;
  const insideVisualView = node._insideVisualView;
  const placeholder = (node as LayoutText).placeholder;
  const omitTransform = node._omitTransform;
  const singleLineShrinkWrapped = node._singleLineShrinkWrappedWidth !== undefined
    && Math.abs(node._singleLineShrinkWrappedWidth - width) <= 1 / 64;

  const hyperlinkRels: HyperlinkRel[] = [];
  const hyperlinkRIdCounter = { current: hyperlinkRIdStart };

  // Normalize to paragraphs
  const paragraphs = normalizeToParagraphs(node);
  let autoFitXml: string;
  if (isLiteBundle()) {
    // Free: use PowerPoint's native normAutofit for top-level text, skip for visual views
    autoFitXml = insideVisualView ? "" : `<a:normAutofit fontScale="100000"/>`;
  } else {
    const requestedPolicy = (node as LayoutText).autoFit === false
      ? "none"
      : node._compatibility?.autoFitPolicy ?? (insideVisualView ? "engine_conditional" : "office_default");
    const resolvedPolicy = resolveAutoFitPolicy({
      paragraphs,
      textStyle,
      layout: node.layout,
      existingAutoFitResult: autoFitResult,
      requestedPolicy,
    });
    autoFitXml = emitAutoFitXml(resolvedPolicy);
  }

  // Emit nvPr with optional placeholder reference
  let nvPrXml: string;
  if (placeholder) {
    const typeAttr = placeholder.type ? ` type="${placeholder.type}"` : "";
    const idxAttr = placeholder.idx !== undefined ? ` idx="${placeholder.idx}"` : "";
    nvPrXml = `    <p:nvPr><p:ph${typeAttr}${idxAttr}/></p:nvPr>\n`;
  } else {
    nvPrXml = `    <p:nvPr/>\n`;
  }

  const morphId = (node as LayoutText).morphId;
  const decorative = (node as LayoutText).decorative;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Text ${shapeId}`;

  let xml = `<p:sp>\n`;
  xml += `  <p:nvSpPr>\n`;
  if (decorative) {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}">${emitDecorativeExtXml()}</p:cNvPr>\n`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"/>\n`;
  }
  xml += `    <p:cNvSpPr txBox="1"/>\n`;
  xml += nvPrXml;
  xml += `  </p:nvSpPr>\n`;

  xml += `  <p:spPr>\n`;
  if (!shouldOmitTransform(node.layout, omitTransform)) {
    xml += `    <a:xfrm>\n`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
    xml += `    </a:xfrm>\n`;
  }
  xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;

  if (bgColor) {
    xml += `    <a:solidFill>\n`;
    xml += `      ${emitColorXml(bgColor)}\n`;
    xml += `    </a:solidFill>\n`;
  } else {
    xml += `    <a:noFill/>\n`;
  }
  xml += `    <a:ln><a:noFill/></a:ln>\n`;

  xml += `  </p:spPr>\n`;

  // Text Body
  xml += `  <p:txBody>\n`;
  xml += emitBodyPr(textStyle, autoFitXml, singleLineShrinkWrapped);
  xml += `    <a:lstStyle/>\n`;

  xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);

  xml += `  </p:txBody>\n`;
  xml += `</p:sp>\n`;

  return { xml, hyperlinkRels };
}
