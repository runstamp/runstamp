// src/renderer/canvasRenderer.ts — Core recursive DFS painter for LayoutNode → Canvas

import type { Canvas, SKRSContext2D } from "@napi-rs/canvas";
import type {
  LayoutNode, LayoutView, LayoutText, LayoutSlide,
} from "../layout/extract.js";
import type {
  FlexStyle, GradientFill, ThemeColorScheme,
} from "../types/ast.js";
import { resolveColorValue } from "./colorResolver.js";
import {
  createLinearGradient,
  paintReflection,
  paint3dBevel,
  paint3dExtrusion,
  paintFill,
} from "./canvasEffects.js";
import {
  paintChartPlaceholder,
  paintConnector,
  paintImagePlaceholder,
  paintMediaPlaceholder,
} from "./canvasPlaceholders.js";
import { drawShape } from "./canvasShapes.js";
import { paintTable } from "./canvasTable.js";
import {
  paintParagraphs,
  paintTextContent,
} from "./canvasText.js";
export { paintCharts, paintImages } from "./canvasAsync.js";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Render a post-layout slide LayoutNode tree to a canvas.
 * The canvas must already be created at the desired pixel dimensions.
 */
export function renderSlideToCanvas(
  slideNode: LayoutNode,
  canvas: Canvas,
  themeColors?: ThemeColorScheme,
  backgroundOverride?: string,
): void {
  const ctx = canvas.getContext("2d");
  const scaleX = canvas.width / slideNode.layout.width;
  const scaleY = canvas.height / slideNode.layout.height;
  ctx.scale(scaleX, scaleY);

  // Paint slide background
  paintSlideBackground(ctx, slideNode as LayoutSlide, themeColors, backgroundOverride);

  // Recurse children
  if (slideNode.children) {
    for (const child of slideNode.children) {
      paintNode(ctx, child, themeColors);
    }
  }
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

function paintSlideBackground(
  ctx: SKRSContext2D,
  node: LayoutSlide,
  themeColors?: ThemeColorScheme,
  backgroundOverride?: string,
): void {
  const { width, height } = node.layout;

  // Background override — solid color
  if (backgroundOverride) {
    ctx.fillStyle = backgroundOverride;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const bg = node.background;

  if (!bg) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  switch (bg.type) {
    case "solid": {
      ctx.fillStyle = resolveColorValue(bg.color, themeColors) ?? "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "gradient": {
      // GradientBackground is structurally compatible with GradientFill (same stops/angle);
      // only the discriminant type string differs ("gradient" vs "linear"/"radial").
      const grad = createLinearGradient(ctx, bg as unknown as GradientFill, 0, 0, width, height, themeColors);
      if (grad) {
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }
      break;
    }
    case "pattern": {
      // Degrade to background color
      ctx.fillStyle = resolveColorValue(bg.background, themeColors) ?? "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "image": {
      // Image backgrounds require async loading; for thumbnail, fill white
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    default: {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
  }
}

// ---------------------------------------------------------------------------
// DFS dispatcher
// ---------------------------------------------------------------------------

function paintNode(
  ctx: SKRSContext2D,
  node: LayoutNode,
  themeColors?: ThemeColorScheme,
): void {
  // Skip nodes hidden by the compatibility layer (e.g. Text children
  // collapsed into a parent View's textParagraphs).
  if ((node.style as any)?.display === "none") return;

  switch (node.type) {
    case "View":
      paintView(ctx, node, themeColors);
      break;
    case "Text":
      paintText(ctx, node, themeColors);
      break;
    case "Image":
      paintImagePlaceholder(ctx, node, themeColors);
      break;
    case "Chart":
      paintChartPlaceholder(ctx, node, themeColors);
      break;
    case "Table":
      paintTable(ctx, node, themeColors);
      break;
    case "Connector":
      paintConnector(ctx, node, themeColors);
      break;
    case "Group":
      paintGroup(ctx, node, themeColors);
      break;
    case "Video":
    case "Audio":
      paintMediaPlaceholder(ctx, node, themeColors);
      break;
    default:
      // Unknown node type — recurse children if any
      if (node.children) {
        for (const child of node.children) {
          paintNode(ctx, child, themeColors);
        }
      }
  }
}

// ---------------------------------------------------------------------------
// View (Shape) Painter
// ---------------------------------------------------------------------------

function paintView(
  ctx: SKRSContext2D,
  node: LayoutView,
  themeColors?: ThemeColorScheme,
): void {
  const { x, y, width, height } = node.layout;
  const style = node.style as FlexStyle | undefined;
  if (width <= 0 || height <= 0) return;

  ctx.save();

  // Rotation
  const rotation = style?.rotation;
  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Opacity
  if (style?.opacity !== undefined) {
    ctx.globalAlpha = style.opacity;
  }

  // 3D extrusion — offset copies behind the main shape to simulate depth
  const sp3d = style?.effects?.sp3d;
  if (sp3d?.extrudeHeight && sp3d.extrudeHeight > 0) {
    paint3dExtrusion(ctx, node, x, y, width, height, sp3d, style, themeColors);
  }

  // Drop shadow
  const shadow = style?.effects?.dropShadow;
  if (shadow) {
    ctx.shadowColor = resolveColorValue(shadow.color, themeColors) ?? "rgba(0,0,0,0.3)";
    ctx.shadowBlur = shadow.blurRadius;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
  }

  // Fill
  const fill = style?.fill;
  const bgColor = style?.backgroundColor;
  if (fill) {
    paintFill(ctx, fill, x, y, width, height, node, themeColors);
  } else if (bgColor !== undefined) {
    ctx.fillStyle = resolveColorValue(bgColor, themeColors) ?? "transparent";
    drawShape(ctx, node, x, y, width, height);
    ctx.fill(node.shapeType === "donut" ? "evenodd" : "nonzero");
  }

  // Clear shadow before border
  if (shadow) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Border
  const borderWidth = style?.borderWidth;
  const borderColor = style?.borderColor;
  if (borderWidth && borderColor) {
    ctx.strokeStyle = resolveColorValue(borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = borderWidth;
    if (style?.borderStyle === "dashed") ctx.setLineDash([borderWidth * 3, borderWidth * 2]);
    else if (style?.borderStyle === "dotted") ctx.setLineDash([borderWidth, borderWidth * 2]);
    else ctx.setLineDash([]);
    drawShape(ctx, node, x, y, width, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Reflection is painted after the main shape so it can fade below the base object.
  paintReflection(ctx, node, x, y, width, height, style, themeColors);

  // Inner shadow (clipped inset shadow via evenodd frame technique)
  const innerShadow = style?.effects?.innerShadow;
  if (innerShadow) {
    ctx.save();
    // Clip to the shape — only the interior is visible
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    // Configure shadow from the shape edge
    const resolved = resolveColorValue(innerShadow.color, themeColors) ?? "rgba(0,0,0,0.3)";
    ctx.shadowColor = resolved;
    ctx.shadowBlur = innerShadow.blurRadius;
    ctx.shadowOffsetX = innerShadow.offsetX;
    ctx.shadowOffsetY = innerShadow.offsetY;
    // Build a "frame" path: the shape sub-path (via drawShape which calls
    // beginPath) plus an outer rect (added to the same path without beginPath).
    // With evenodd fill rule, this fills the donut between them. Since we're
    // clipped to the shape, the donut fill is invisible (outside clip), but the
    // shadow from the donut's inner edge bleeds inward into the clip region.
    drawShape(ctx, node, x, y, width, height);
    const pad = 2000 + innerShadow.blurRadius;
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = resolved;
    ctx.fill("evenodd");
    ctx.restore();
  }

  // 3D bevel — highlight/shadow edges for raised appearance
  if (sp3d?.bevelTop || sp3d?.bevelBottom) {
    paint3dBevel(ctx, node, x, y, width, height, sp3d!, style?.effects?.scene3d);
  }

  // 3D contour — outline stroke around shape
  if (sp3d?.contourWidth && sp3d.contourColor) {
    ctx.save();
    ctx.strokeStyle = resolveColorValue(sp3d.contourColor, themeColors) ?? "#000000";
    ctx.lineWidth = sp3d.contourWidth;
    drawShape(ctx, node, x, y, width, height);
    ctx.stroke();
    ctx.restore();
  }

  // Shape text (View nodes with textContent / textParagraphs)
  if (node.textParagraphs || node.textContent) {
    const textStyle = node.textStyle;
    const insets = textStyle?.textInsets;
    const tx = x + (insets?.left ?? 0);
    const ty = y + (insets?.top ?? 0);
    const tw = width - (insets?.left ?? 0) - (insets?.right ?? 0);
    const th = height - (insets?.top ?? 0) - (insets?.bottom ?? 0);

    if (node.textParagraphs) {
      paintParagraphs(ctx, node.textParagraphs, textStyle, tx, ty, tw, th, themeColors);
    } else if (node.textContent) {
      paintTextContent(ctx, node.textContent, textStyle, tx, ty, tw, th, themeColors);
    }
  }

  // Recurse children — but skip if the View has textParagraphs/textContent,
  // meaning the PPTX compatibility layer collapsed the children into the
  // parent's text frame. Painting both would double-render.
  if (node.children && !node.textParagraphs && !node.textContent) {
    for (const child of node.children) {
      paintNode(ctx, child, themeColors);
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Text Painter
// ---------------------------------------------------------------------------

function paintText(
  ctx: SKRSContext2D,
  node: LayoutText,
  themeColors?: ThemeColorScheme,
): void {
  const { x, y, width, height } = node.layout;
  const style = node.style;

  ctx.save();

  // Background fill for text nodes
  const bgColor = style?.backgroundColor;
  const fill = style?.fill;
  if (fill) {
    paintFill(ctx, fill, x, y, width, height, node, themeColors);
  } else if (bgColor) {
    ctx.fillStyle = resolveColorValue(bgColor, themeColors) ?? "transparent";
    ctx.fillRect(x, y, width, height);
  }

  // Border
  if (style?.borderWidth && style?.borderColor) {
    ctx.strokeStyle = resolveColorValue(style.borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = style.borderWidth;
    ctx.strokeRect(x, y, width, height);
  }

  // Text insets — only apply when explicitly set on the node style.
  // Default to 0 so that Yoga-measured text height is not clipped by
  // implicit padding that the layout engine did not account for.
  const insets = style?.textInsets;
  const tx = x + (insets?.left ?? 0);
  const ty = y + (insets?.top ?? 0);
  const tw = width - (insets?.left ?? 0) - (insets?.right ?? 0);
  const th = height - (insets?.top ?? 0) - (insets?.bottom ?? 0);

  // AutoFit: scale font size from fontScale (25000–100000 represents 25%–100%)
  const autoFitResult = node._autoFitResult;
  const effectiveStyle = autoFitResult && autoFitResult.fontScale < 100000
    ? { ...style, fontSize: ((style?.fontSize ?? 14) * autoFitResult.fontScale) / 100000 }
    : style;

  if (node.paragraphs) {
    paintParagraphs(ctx, node.paragraphs, effectiveStyle, tx, ty, tw, th, themeColors);
  } else if (node.content) {
    paintTextContent(ctx, node.content, effectiveStyle, tx, ty, tw, th, themeColors);
  }

  // Recurse children (Text nodes can have children in some cases)
  if (node.children) {
    for (const child of node.children) {
      paintNode(ctx, child, themeColors);
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Group Painter
// ---------------------------------------------------------------------------

function paintGroup(
  ctx: SKRSContext2D,
  node: LayoutNode,
  themeColors?: ThemeColorScheme,
): void {
  const style = node.style as FlexStyle | undefined;
  const hasOpacity = style?.opacity !== undefined;
  const hasRotation = !!style?.rotation;

  if (hasOpacity || hasRotation) {
    ctx.save();
    if (hasRotation) {
      const { x, y, width, height } = node.layout;
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((style!.rotation! * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    if (hasOpacity) {
      ctx.globalAlpha = style!.opacity!;
    }
  }

  if (node.children) {
    for (const child of node.children) {
      paintNode(ctx, child, themeColors);
    }
  }

  if (hasOpacity || hasRotation) {
    ctx.restore();
  }
}
