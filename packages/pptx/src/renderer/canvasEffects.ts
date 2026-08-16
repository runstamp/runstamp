import type { SKRSContext2D } from "@napi-rs/canvas";
import type { LayoutNode, LayoutView } from "../layout/extract.js";
import type {
  Fill,
  FlexStyle,
  GradientFill,
  PatternFill,
  Reflection,
  Scene3D,
  SolidFill,
  Sp3D,
  ThemeColorScheme,
} from "../types/ast.js";
import { resolveColorValue } from "./colorResolver.js";
import { drawShape } from "./canvasShapes.js";

export function paintFill(
  ctx: SKRSContext2D,
  fill: Fill,
  x: number,
  y: number,
  width: number,
  height: number,
  node: LayoutNode,
  themeColors?: ThemeColorScheme,
): void {
  const fillRule: CanvasFillRule = node.type === "View" && node.shapeType === "donut" ? "evenodd" : "nonzero";
  switch (fill.type) {
    case "solid": {
      ctx.fillStyle = resolveColorValue(fill.color, themeColors) ?? "transparent";
      drawShape(ctx, node, x, y, width, height);
      ctx.fill(fillRule);
      return;
    }
    case "linear":
    case "radial": {
      const gradient = fill.type === "linear"
        ? createLinearGradient(ctx, fill as GradientFill, x, y, width, height, themeColors)
        : createRadialGradient(ctx, fill as GradientFill, x, y, width, height, themeColors);
      if (gradient) {
        ctx.fillStyle = gradient;
        drawShape(ctx, node, x, y, width, height);
        ctx.fill(fillRule);
      }
      return;
    }
    case "pattern": {
      const foreground = resolveColorValue((fill as PatternFill).foreground, themeColors);
      ctx.fillStyle = foreground ?? "#CCCCCC";
      drawShape(ctx, node, x, y, width, height);
      ctx.fill(fillRule);
      return;
    }
    case "image": {
      ctx.fillStyle = "#F0F0F0";
      drawShape(ctx, node, x, y, width, height);
      ctx.fill(fillRule);
    }
  }
}

export function createLinearGradient(
  ctx: SKRSContext2D,
  fill: GradientFill,
  x: number,
  y: number,
  width: number,
  height: number,
  themeColors?: ThemeColorScheme,
): CanvasGradient | null {
  if (!fill.stops?.length) return null;
  const angle = ((fill.angle ?? 180) - 90) * Math.PI / 180;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const length = Math.max(width, height) / 2;
  const gradient = ctx.createLinearGradient(
    centerX - Math.cos(angle) * length,
    centerY - Math.sin(angle) * length,
    centerX + Math.cos(angle) * length,
    centerY + Math.sin(angle) * length,
  );
  for (const stop of fill.stops) {
    gradient.addColorStop(
      Math.max(0, Math.min(1, stop.position / 100)),
      resolveColorValue(stop.color, themeColors) ?? "#000000",
    );
  }
  return gradient;
}

export function createRadialGradient(
  ctx: SKRSContext2D,
  fill: GradientFill,
  x: number,
  y: number,
  width: number,
  height: number,
  themeColors?: ThemeColorScheme,
): CanvasGradient | null {
  if (!fill.stops?.length) return null;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.max(width, height) / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  for (const stop of fill.stops) {
    gradient.addColorStop(
      Math.max(0, Math.min(1, stop.position / 100)),
      resolveColorValue(stop.color, themeColors) ?? "#000000",
    );
  }
  return gradient;
}

function get3dLightOffset(scene3d?: Scene3D): [number, number] {
  const direction = scene3d?.lightRig?.direction ?? "tl";
  switch (direction) {
    case "t":
      return [0, 1];
    case "b":
      return [0, -1];
    case "l":
      return [1, 0];
    case "r":
      return [-1, 0];
    case "tl":
      return [1, 1];
    case "tr":
      return [-1, 1];
    case "bl":
      return [1, -1];
    case "br":
      return [-1, -1];
    default:
      return [1, 1];
  }
}

function darkenHex(hex: string, factor: number): string {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "#555555";
  const red = Math.round(parseInt(match[1], 16) * factor);
  const green = Math.round(parseInt(match[2], 16) * factor);
  const blue = Math.round(parseInt(match[3], 16) * factor);
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

export function paint3dExtrusion(
  ctx: SKRSContext2D,
  node: LayoutView,
  x: number,
  y: number,
  width: number,
  height: number,
  sp3d: Sp3D,
  style: FlexStyle | undefined,
  themeColors?: ThemeColorScheme,
): void {
  const extrudeHeight = sp3d.extrudeHeight!;
  const [dx, dy] = get3dLightOffset(style?.effects?.scene3d);

  let color: string;
  if (sp3d.extrudeColor) {
    color = resolveColorValue(sp3d.extrudeColor, themeColors) ?? "#555555";
  } else {
    const baseFill = style?.fill;
    const backgroundColor = style?.backgroundColor;
    const base = baseFill?.type === "solid"
      ? resolveColorValue((baseFill as SolidFill).color, themeColors)
      : backgroundColor
        ? resolveColorValue(backgroundColor, themeColors)
        : undefined;
    color = base ? darkenHex(base, 0.6) : "#555555";
  }

  const steps = Math.min(Math.ceil(extrudeHeight), 20);
  const stepSize = extrudeHeight / steps;
  const fillRule: CanvasFillRule = node.shapeType === "donut" ? "evenodd" : "nonzero";

  ctx.save();
  ctx.fillStyle = color;
  for (let index = steps; index >= 1; index--) {
    drawShape(ctx, node, x + dx * stepSize * index, y + dy * stepSize * index, width, height);
    ctx.fill(fillRule);
  }
  ctx.restore();
}

export function paint3dBevel(
  ctx: SKRSContext2D,
  node: LayoutView,
  x: number,
  y: number,
  width: number,
  height: number,
  sp3d: Sp3D,
  scene3d?: Scene3D,
): void {
  const [dx, dy] = get3dLightOffset(scene3d);

  if (sp3d.bevelTop) {
    const size = Math.max(sp3d.bevelTop.width ?? 4, sp3d.bevelTop.height ?? 4);
    const pad = 2000 + size;

    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = size * 0.7;
    ctx.shadowOffsetX = dx * size * 0.5;
    ctx.shadowOffsetY = dy * size * 0.5;
    drawShape(ctx, node, x, y, width, height);
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill("evenodd");
    ctx.restore();

    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = size * 0.7;
    ctx.shadowOffsetX = -dx * size * 0.5;
    ctx.shadowOffsetY = -dy * size * 0.5;
    drawShape(ctx, node, x, y, width, height);
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill("evenodd");
    ctx.restore();
  }

  if (sp3d.bevelBottom) {
    const size = Math.max(sp3d.bevelBottom.width ?? 4, sp3d.bevelBottom.height ?? 4);
    const pad = 2000 + size;

    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = size * 0.5;
    ctx.shadowOffsetX = dx * size * 0.3;
    ctx.shadowOffsetY = dy * size * 0.3;
    drawShape(ctx, node, x, y, width, height);
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill("evenodd");
    ctx.restore();
  }
}

export function paintReflection(
  ctx: SKRSContext2D,
  node: LayoutView,
  x: number,
  y: number,
  width: number,
  height: number,
  style: FlexStyle | undefined,
  themeColors?: ThemeColorScheme,
): void {
  const reflection = style?.effects?.reflection;
  if (!reflection || width <= 0 || height <= 0) {
    return;
  }

  const reflectedHeight = height * reflectionSize(reflection);
  if (reflectedHeight <= 0) {
    return;
  }

  const distance = reflection.distance ?? 0;
  const startOpacity = clampOpacity(reflection.startOpacity ?? 0.5);
  const endOpacity = clampOpacity(reflection.endOpacity ?? 0);
  const fillRule: CanvasFillRule = node.shapeType === "donut" ? "evenodd" : "nonzero";

  ctx.save();
  ctx.translate(0, 2 * (y + height) + distance);
  ctx.scale(1, -1);
  ctx.beginPath();
  ctx.rect(x, y + height - reflectedHeight, width, reflectedHeight);
  ctx.clip();

  const fill = style?.fill;
  const backgroundColor = style?.backgroundColor;
  if (fill) {
    paintFill(ctx, fill, x, y, width, height, node, themeColors);
  } else if (backgroundColor !== undefined) {
    ctx.fillStyle = resolveColorValue(backgroundColor, themeColors) ?? "transparent";
    drawShape(ctx, node, x, y, width, height);
    ctx.fill(fillRule);
  }

  if (style?.borderWidth && style.borderColor) {
    ctx.strokeStyle = resolveColorValue(style.borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = style.borderWidth;
    if (style.borderStyle === "dashed") ctx.setLineDash([style.borderWidth * 3, style.borderWidth * 2]);
    else if (style.borderStyle === "dotted") ctx.setLineDash([style.borderWidth, style.borderWidth * 2]);
    else ctx.setLineDash([]);
    drawShape(ctx, node, x, y, width, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, y + height, 0, y + height - reflectedHeight);
  fade.addColorStop(0, `rgba(0,0,0,${startOpacity})`);
  fade.addColorStop(1, `rgba(0,0,0,${endOpacity})`);
  ctx.fillStyle = fade;
  ctx.fillRect(x, y + height - reflectedHeight, width, reflectedHeight);

  ctx.restore();
}

function reflectionSize(reflection: Reflection): number {
  const size = reflection.size ?? 100;
  return Math.max(0, Math.min(1, size / 100));
}

function clampOpacity(value: number): number {
  return Math.max(0, Math.min(1, value));
}
