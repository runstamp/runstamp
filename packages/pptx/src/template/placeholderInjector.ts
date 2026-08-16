// src/template/placeholderInjector.ts — Injects template placeholder geometry into AST nodes

import type { PaperNode, PaperSlide, PlaceholderRef, TextStyle } from "../types/ast.js";
import type { PlaceholderInfo, PlaceholderTextStyle, MasterTextStyles } from "./parser.js";
import type { ThemeData } from "./themeResolver.js";
import { resolveTextStyle } from "./themeResolver.js";
import { PIXEL_TO_EMU } from "../ooxml/drawing/math.js";

/**
 * Walks slide children, matching nodes with `placeholder` to template PlaceholderInfo.
 * Injects absolute position/size from template when the node has no explicit geometry.
 * Sets `_omitTransform: true` when ALL geometry came from the template.
 * Optionally injects resolved typographic defaults from the master cascade.
 */
export function injectPlaceholderGeometry(
  slide: PaperSlide,
  placeholders: PlaceholderInfo[],
  masterTextStyles?: MasterTextStyles,
  theme?: ThemeData,
): void {
  for (const child of slide.children) {
    injectNode(child, placeholders, masterTextStyles, theme);
  }
}

function injectNode(
  node: PaperNode,
  placeholders: PlaceholderInfo[],
  masterTextStyles?: MasterTextStyles,
  theme?: ThemeData,
): void {
  const ph = (node as unknown as { placeholder?: PlaceholderRef }).placeholder;
  if (!ph) return;

  const info = findPlaceholder(ph, placeholders);
  if (!info) return;

  const style = ((node as unknown as { style?: Record<string, unknown> }).style ??= {});

  // Check if user specified any geometry
  const hasUserWidth = style.width !== undefined;
  const hasUserHeight = style.height !== undefined;
  const hasUserLeft = style.left !== undefined;
  const hasUserTop = style.top !== undefined;
  const hasAnyUserGeometry = hasUserWidth || hasUserHeight || hasUserLeft || hasUserTop;

  if (!hasAnyUserGeometry) {
    // Inject all geometry from template (EMU → pixels)
    style.position = "absolute";
    style.left = info.x / PIXEL_TO_EMU;
    style.top = info.y / PIXEL_TO_EMU;
    style.width = info.cx / PIXEL_TO_EMU;
    style.height = info.cy / PIXEL_TO_EMU;
    (node as unknown as Record<string, unknown>)._omitTransform = true;
  }

  // Inject resolved typographic defaults from the 3-tier cascade
  if (theme) {
    const resolved = resolveTextStyle(
      info.type ?? ph.type,
      info.textStyle,
      masterTextStyles,
      theme,
    );
    injectTypographyDefaults(node, style, resolved);
  }
}

/**
 * Injects resolved typographic defaults into a node's style,
 * only when the node hasn't specified its own values.
 */
function injectTypographyDefaults(
  node: PaperNode,
  style: Record<string, unknown>,
  resolved: PlaceholderTextStyle,
): void {
  // Only apply to text-bearing nodes (Text, View with textContent)
  if (node.type !== "Text" && node.type !== "View") return;

  const textStyle = getTextStyleTarget(node, style);

  if (resolved.fontFamily && textStyle.fontFamily === undefined) {
    textStyle.fontFamily = resolved.fontFamily;
  }
  // Inject East Asian font as a fallback for CJK text rendering
  if (resolved.fontFamilyEa && textStyle.fontFallback === undefined) {
    textStyle.fontFallback = [resolved.fontFamilyEa];
  }
  if (resolved.fontSize !== undefined && textStyle.fontSize === undefined) {
    // Convert from OOXML hundredths-of-a-point to points
    // OOXML sz="2400" means 24pt → divide by 100
    textStyle.fontSize = resolved.fontSize / 100;
  }
  if (resolved.bold && textStyle.fontWeight === undefined) {
    textStyle.fontWeight = "bold";
  }
  if (resolved.italic && textStyle.fontStyle === undefined) {
    textStyle.fontStyle = "italic";
  }
  if (resolved.color && textStyle.color === undefined) {
    textStyle.color = resolved.color;
  }
  if (resolved.lineSpacing !== undefined && textStyle.lineHeight === undefined) {
    // OOXML spcPts val is in hundredths of a point. TextStyle.lineHeight is
    // measured in pixels elsewhere in the engine, and the emitter later
    // converts px -> spcPts by multiplying by 75.
    textStyle.lineHeight = resolved.lineSpacing / 75;
  }
}

function getTextStyleTarget(
  node: PaperNode,
  style: Record<string, unknown>,
): Record<string, unknown> {
  if (node.type === "View") {
    const view = node as PaperNode & { textStyle?: TextStyle };
    view.textStyle ??= {};
    return view.textStyle as unknown as Record<string, unknown>;
  }
  return style;
}

function findPlaceholder(
  ref: PlaceholderRef,
  placeholders: PlaceholderInfo[],
): PlaceholderInfo | undefined {
  const compatibleTypes = getCompatiblePlaceholderTypes(ref.type);
  // Match by idx first (most specific)
  if (ref.idx !== undefined) {
    const byIdx = placeholders.find((p) => p.idx === String(ref.idx));
    if (byIdx) return byIdx;
  }
  // Then match by type
  if (compatibleTypes.length > 0) {
    return placeholders.find((p) => p.type && compatibleTypes.includes(p.type));
  }
  return undefined;
}

function getCompatiblePlaceholderTypes(type: PlaceholderRef["type"]): string[] {
  switch (type) {
    case "title":
      return ["title", "ctrTitle"];
    case "ctrTitle":
      return ["ctrTitle", "title"];
    case "subTitle":
      return ["subTitle", "body"];
    case "body":
      return ["body", "subTitle"];
    case "pic":
    case "chart":
    case "tbl":
    case "dgm":
    case "media":
    case "clipArt":
      return [type, "obj"];
    case "obj":
      return ["obj", "pic", "chart", "tbl", "dgm", "media", "clipArt"];
    default:
      return type ? [type] : [];
  }
}
