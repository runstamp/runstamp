// src/ooxml/drawing/shape.ts
import type { LayoutView } from "../../layout/extract.js";
import type { PlaceholderRef } from "../../types/ast.js";
import { toEmu, emitFillXml, emitLineXml, emitEffectsXml, emitScene3dXml, emitSp3dXml } from "./math.js";
import {
  normalizeToParagraphsFromFields,
  emitParagraphsXml,
  VERTICAL_ALIGN_MAP,
  escapeXmlAttr,
  emitLocksXml,
  emitDecorativeExtXml,
  shouldOmitTransform,
  resolveHyperlink,
  type HyperlinkRel,
} from "./textUtils.js";
import { emitCustomGeomXml } from "./geometry.js";
import { getLogger } from "../../logger.js";
import { emitAutoFitXml, resolveAutoFitPolicy } from "./autoFitPolicy.js";
import { isLiteBundle } from "../../engineMode.js";
import { resolveEffectiveViewGeometry } from "../../viewGeometry.js";

/**
 * Shapes supported in free mode (40 shapes).
 * Unsupported shapes render as rectangles with a warning.
 */
const LITE_SUPPORTED_SHAPES: ReadonlySet<string> = new Set([
  "rect", "roundRect", "ellipse", "triangle", "diamond",
  "rightArrow", "leftArrow", "upArrow", "downArrow", "leftRightArrow", "upDownArrow",
  "star4", "star5", "star6",
  "heart", "cloud", "hexagon", "pentagon", "octagon", "parallelogram", "trapezoid",
  "flowChartProcess", "flowChartDecision", "flowChartTerminator", "flowChartDocument",
  "flowChartData", "flowChartPredefinedProcess",
  "wedgeRoundRectCallout", "cloudCallout",
  "rightBrace", "leftBrace", "rightBracket", "leftBracket",
  "mathPlus", "mathMinus", "mathMultiply", "mathEqual",
  "line", "donut", "frame", "plaque",
]);

/**
 * Valid OOXML preset geometry names per ECMA-376 §20.1.10.56.
 * Used to validate shapeType before emission to prevent corrupt output.
 */
const VALID_PRESET_GEOMETRIES: ReadonlySet<string> = new Set([
  // BasicShape
  "rect", "ellipse", "roundRect", "triangle", "rtTriangle", "rightTriangle",
  "diamond", "parallelogram", "trapezoid", "nonIsoscelesTrapezoid", "heart",
  "plus", "chevron", "homePlate", "donut", "cloud", "hexagon",
  "pentagon", "octagon", "decagon", "heptagon", "dodecagon",
  "snip1Rect", "snip2SameRect", "snip2DiagRect", "snip2SameRect2",
  "snipRoundRect",
  "round1Rect", "round2SameRect", "round2DiagRect", "round1Rect2",
  "bevel", "noSmoking", "blockArc", "pie", "pieWedge",
  "arc", "chord", "corner", "diagStripe", "halfFrame",
  "frame", "foldedCorner", "can", "cube", "teardrop",
  "gear6", "gear9", "plaque", "smileyFace",
  "irregularSeal1", "irregularSeal2",
  "ribbon", "ribbon2", "leftRightRibbon",
  "lightningBolt", "moon", "sun", "funnel",
  "wave", "doubleWave", "ellipseRibbon", "ellipseRibbon2",
  "verticalScroll", "horizontalScroll",
  "line", "lineInv",
  // ArrowShape
  "rightArrow", "leftArrow", "upArrow", "downArrow",
  "leftRightArrow", "upDownArrow", "bentArrow", "uturnArrow", "bentUpArrow",
  "curvedRightArrow", "curvedLeftArrow", "curvedUpArrow", "curvedDownArrow",
  "stripedRightArrow", "notchedRightArrow",
  "circularArrow", "leftCircularArrow", "swooshArrow",
  "leftRightUpArrow", "quadArrow", "leftUpArrow",
  // ArrowCalloutShape
  "quadArrowCallout", "leftRightArrowCallout", "upDownArrowCallout",
  "leftArrowCallout", "rightArrowCallout", "upArrowCallout", "downArrowCallout",
  // FlowchartShape
  "flowChartProcess", "flowChartDecision", "flowChartDocument",
  "flowChartTerminator", "flowChartConnector", "flowChartMerge",
  "flowChartSort", "flowChartExtract", "flowChartPreparation",
  "flowChartManualInput", "flowChartManualOperation",
  "flowChartPredefinedProcess", "flowChartInternalStorage",
  "flowChartMultidocument", "flowChartOffpageConnector",
  "flowChartPunchedTape", "flowChartSummingJunction", "flowChartOr",
  "flowChartDelay", "flowChartAlternateProcess",
  "flowChartMagneticDisk", "flowChartMagneticDrum",
  "flowChartMagneticTape", "flowChartDisplay",
  "flowChartOnlineStorage", "flowChartCollate",
  "flowChartInputOutput", "flowChartOfflineStorage",
  // ActionButtonShape
  "actionButtonBlank", "actionButtonHome", "actionButtonHelp",
  "actionButtonInformation", "actionButtonBackPrevious",
  "actionButtonForwardNext", "actionButtonBeginning",
  "actionButtonEnd", "actionButtonReturn",
  "actionButtonSound", "actionButtonMovie",
  // CalloutShape
  "wedgeRoundRectCallout", "wedgeRectCallout", "wedgeEllipseCallout",
  "wedgeRoundRectCallout2", "cloudCallout",
  "borderCallout1", "borderCallout2", "borderCallout3",
  "callout1", "callout2", "callout3",
  "accentCallout1", "accentCallout2", "accentCallout3",
  "accentBorderCallout1", "accentBorderCallout2", "accentBorderCallout3",
  // MathShape
  "mathPlus", "mathMinus", "mathMultiply", "mathDivide",
  "mathEqual", "mathNotEqual",
  // StarShape
  "star4", "star5", "star6", "star7", "star8",
  "star10", "star12", "star16", "star24", "star32",
  // BracketBraceShape
  "leftBrace", "rightBrace", "leftBracket", "rightBracket",
  "bracePair", "bracketPair",
  // TabShape
  "plaqueTabs", "squareTabs", "roundTab",
  // ConnectorShape
  "curvedConnector2", "curvedConnector3", "curvedConnector4", "curvedConnector5",
  "straightConnector1", "bentConnector2", "bentConnector3", "bentConnector4", "bentConnector5",
]);

export interface ShapeEmitResult {
  xml: string;
  hyperlinkRels: HyperlinkRel[];
}

function emitNvPr(placeholder?: PlaceholderRef): string {
  if (!placeholder) return `    <p:nvPr/>\n`;
  const typeAttr = placeholder.type ? ` type="${placeholder.type}"` : "";
  const idxAttr = placeholder.idx !== undefined ? ` idx="${placeholder.idx}"` : "";
  return `    <p:nvPr><p:ph${typeAttr}${idxAttr}/></p:nvPr>\n`;
}

export function generateShapeXml(
  node: LayoutView,
  shapeId: number,
  hyperlinkRIdStart: number = 200,
  imageFillRId?: string,
): ShapeEmitResult {
  const { x, y, width, height } = node.layout;
  const effectiveGeometry = resolveEffectiveViewGeometry(node, width, height);
  const shapeType = effectiveGeometry.shapeType || "rect";
  const adjustments = effectiveGeometry.shapeAdjustments;
  const placeholder = node.placeholder;
  const omitTransform = node._omitTransform;

  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `View ${shapeId}`;

  // Transform properties
  const rotation = node.style?.rotation;
  const flipH = node.style?.flipH;
  const flipV = node.style?.flipV;
  const opacity = node.style?.opacity;

  // Shape text properties
  const textContent = node.textContent;
  const textParagraphs = node.textParagraphs;
  const textStyle = node.textStyle;
  const hasText = textContent !== undefined || (textParagraphs && textParagraphs.length > 0);

  const hyperlinkRels: HyperlinkRel[] = [];
  const hyperlinkRIdCounter = { current: hyperlinkRIdStart };

  const hyperlink = node.hyperlink;
  const altText = node.altText;
  const decorative = node.decorative;
  const locks = node.locks;
  const customGeometry = effectiveGeometry.customGeometry;
  const adjustmentMap = effectiveGeometry.shapeAdjustmentMap;

  let xml = `<p:sp>\n`;

  // Non-Visual Properties
  xml += `  <p:nvSpPr>\n`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  if (hyperlink || decorative) {
    let cNvPrChildren = "";
    if (hyperlink) {
      const { hlinkXml } = resolveHyperlink(hyperlink, hyperlinkRels, hyperlinkRIdCounter);
      if (hlinkXml) cNvPrChildren += hlinkXml;
    }
    if (decorative) {
      cNvPrChildren += emitDecorativeExtXml();
    }
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}>${cNvPrChildren}</p:cNvPr>\n`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>\n`;
  }
  if (locks) {
    xml += `    <p:cNvSpPr>${emitLocksXml("a:spLocks", locks)}</p:cNvSpPr>\n`;
  } else {
    xml += `    <p:cNvSpPr/>\n`;
  }
  xml += emitNvPr(placeholder);
  xml += `  </p:nvSpPr>\n`;

  // Visual Properties & Layout
  xml += `  <p:spPr>\n`;
  if (!shouldOmitTransform(node.layout, omitTransform)) {
    // Build xfrm attributes
    const xfrmAttrs: string[] = [];
    if (rotation !== undefined && rotation !== 0) {
      xfrmAttrs.push(`rot="${Math.round(rotation * 60000)}"`);
    }
    if (flipH) xfrmAttrs.push('flipH="1"');
    if (flipV) xfrmAttrs.push('flipV="1"');
    const xfrmAttrStr = xfrmAttrs.length > 0 ? " " + xfrmAttrs.join(" ") : "";

    xml += `    <a:xfrm${xfrmAttrStr}>\n`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
    xml += `    </a:xfrm>\n`;
  }

  // Geometry: custom geometry takes precedence over shapeType
  if (customGeometry) {
    xml += emitCustomGeomXml(customGeometry);
  } else {
    // Validate shapeType is a valid OOXML preset geometry to prevent corrupt output.
    // In lite mode, only a subset of 40 shapes is supported — others fall back to rect.
    let resolvedShape: string;
    if (isLiteBundle() && !LITE_SUPPORTED_SHAPES.has(shapeType)) {
      getLogger().warn(`[shape] Shape "${shapeType}" not supported in free mode — rendering as rectangle`);
      resolvedShape = "rect";
    } else {
      resolvedShape = VALID_PRESET_GEOMETRIES.has(shapeType) ? shapeType : "rect";
      if (resolvedShape !== shapeType) {
        getLogger().warn(`[shape] Invalid shapeType "${shapeType}" — falling back to "rect"`);
      }
    }
    xml += `    <a:prstGeom prst="${escapeXmlAttr(resolvedShape)}">\n`;
    if (adjustmentMap && Object.keys(adjustmentMap).length > 0) {
      xml += `      <a:avLst>`;
      for (const [name, value] of Object.entries(adjustmentMap)) {
        xml += `<a:gd name="${escapeXmlAttr(name)}" fmla="val ${value}"/>`;
      }
      xml += `</a:avLst>\n`;
    } else if (adjustments && adjustments.length > 0) {
      xml += `      <a:avLst>`;
      for (let i = 0; i < adjustments.length; i++) {
        xml += `<a:gd name="adj${i + 1 === 1 ? "" : i + 1}" fmla="val ${adjustments[i]}"/>`;
      }
      xml += `</a:avLst>\n`;
    } else {
      xml += `      <a:avLst/>\n`;
    }
    xml += `    </a:prstGeom>\n`;
  }

  // Fill (with opacity support and optional image fill rId)
  const fillXml = emitFillXml(node.style, opacity, imageFillRId);
  if (fillXml) {
    xml += `    ${fillXml}\n`;
  } else {
    xml += `    <a:noFill/>\n`;
  }

  // Line (border)
  xml += `    ${emitLineXml(node.style)}\n`;

  // Effects
  const effectsXml = emitEffectsXml(node.style);
  if (effectsXml) {
    xml += `    ${effectsXml}\n`;
  }

  // 3D Effects (scene3d + sp3d)
  if (node.style?.effects?.scene3d) {
    xml += `    ${emitScene3dXml(node.style.effects.scene3d)}\n`;
  }
  if (node.style?.effects?.sp3d) {
    xml += `    ${emitSp3dXml(node.style.effects.sp3d)}\n`;
  }

  xml += `  </p:spPr>\n`;

  // Text Body
  xml += `  <p:txBody>\n`;
  if (hasText && textStyle) {
    const paragraphs = normalizeToParagraphsFromFields(textContent, textParagraphs);
    const resolvedAutoFit = resolveAutoFitPolicy({
      paragraphs,
      textStyle,
      layout: node.layout,
      existingAutoFitResult: node._autoFitResult,
      requestedPolicy: node._compatibility?.autoFitPolicy ?? "office_default",
    });
    const autoFitXml = emitAutoFitXml(resolvedAutoFit);
    const vertAlign = textStyle.verticalAlign;
    const textInsets = textStyle.textInsets;
    const textDir = textStyle.textDirection;
    const rtlCol = textStyle.rtl;

    const attrs: string[] = ['wrap="square"', `rtlCol="${rtlCol ? "1" : "0"}"`, 'spcFirstLastPara="0"'];
    if (vertAlign) {
      attrs.push(`anchor="${VERTICAL_ALIGN_MAP[vertAlign] || "t"}"`);
    }
    if (textInsets) {
      attrs.push(`lIns="${toEmu(textInsets.left ?? 0)}"`);
      attrs.push(`tIns="${toEmu(textInsets.top ?? 0)}"`);
      attrs.push(`rIns="${toEmu(textInsets.right ?? 0)}"`);
      attrs.push(`bIns="${toEmu(textInsets.bottom ?? 0)}"`);
    } else {
      attrs.push('lIns="0"', 'tIns="0"', 'rIns="0"', 'bIns="0"');
    }
    if (textDir === "vertical") attrs.push('vert="vert270"');
    else if (textDir === "verticalEA") attrs.push('vert="eaVert"');

    // Text columns
    if (textStyle.columns !== undefined && textStyle.columns > 1) {
      attrs.push(`numCol="${textStyle.columns}"`);
      if (textStyle.columnSpacing !== undefined) {
        attrs.push(`spcCol="${toEmu(textStyle.columnSpacing)}"`);
      }
    }

    // TextWarp (WordArt)
    if (textStyle.textWarp && textStyle.textWarp !== "textNoShape") {
      const children = [`<a:prstTxWarp prst="${escapeXmlAttr(textStyle.textWarp)}"><a:avLst/></a:prstTxWarp>`];
      if (autoFitXml) {
        children.push(autoFitXml);
      }
      xml += `    <a:bodyPr ${attrs.join(" ")}>${children.join("")}</a:bodyPr>\n`;
    } else {
      if (autoFitXml) {
        xml += `    <a:bodyPr ${attrs.join(" ")}>${autoFitXml}</a:bodyPr>\n`;
      } else {
        xml += `    <a:bodyPr ${attrs.join(" ")}/>\n`;
      }
    }
  } else {
    xml += `    <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/>\n`;
  }
  xml += `    <a:lstStyle/>\n`;

  if (hasText) {
    const paragraphs = normalizeToParagraphsFromFields(textContent, textParagraphs);
    xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);
  } else {
    xml += `    <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>\n`;
  }

  xml += `  </p:txBody>\n`;
  xml += `</p:sp>\n`;

  return { xml, hyperlinkRels };
}
