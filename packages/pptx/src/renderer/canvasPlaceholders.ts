import type { SKRSContext2D } from "@napi-rs/canvas";
import type {
  LayoutChart,
  LayoutConnector,
  LayoutImage,
  LayoutNode,
} from "../layout/extract.js";
import type { ThemeColorScheme } from "../types/ast.js";
import { resolveColorValue } from "./colorResolver.js";

export function paintImagePlaceholder(
  ctx: SKRSContext2D,
  node: LayoutImage,
  themeColors?: ThemeColorScheme,
): void {
  const { x, y, width, height } = node.layout;
  const style = node.style;

  ctx.save();

  if (node.borderRadius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, node.borderRadius);
    ctx.clip();
  }

  ctx.fillStyle = "#E5E7EB";
  ctx.fillRect(x, y, width, height);

  if (style?.borderWidth && style?.borderColor) {
    ctx.strokeStyle = resolveColorValue(style.borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = style.borderWidth;
    ctx.strokeRect(x, y, width, height);
  }

  ctx.restore();
}

export function paintChartPlaceholder(
  ctx: SKRSContext2D,
  node: LayoutChart,
  _themeColors?: ThemeColorScheme,
): void {
  const { x, y, width, height } = node.layout;

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

export function paintConnector(
  ctx: SKRSContext2D,
  node: LayoutConnector,
  themeColors?: ThemeColorScheme,
): void {
  const { start, end } = node;
  if (!start || !end) return;

  ctx.save();

  const lineColor = resolveColorValue(node.lineColor, themeColors) ?? "#000000";
  const lineWidth = node.lineWidth ?? 1;

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;

  if (node.lineDashStyle === "dashed") {
    ctx.setLineDash([lineWidth * 4, lineWidth * 2]);
  } else if (node.lineDashStyle === "dotted") {
    ctx.setLineDash([lineWidth, lineWidth * 2]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (node.arrowEnd) {
    drawArrowHead(ctx, start.x, start.y, end.x, end.y, lineWidth, lineColor);
  }
  if (node.arrowStart) {
    drawArrowHead(ctx, end.x, end.y, start.x, start.y, lineWidth, lineColor);
  }

  ctx.restore();
}

function drawArrowHead(
  ctx: SKRSContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  lineWidth: number,
  color: string,
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = Math.max(6, lineWidth * 4);

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function paintMediaPlaceholder(
  ctx: SKRSContext2D,
  node: LayoutNode,
  _themeColors?: ThemeColorScheme,
): void {
  const { x, y, width, height } = node.layout;

  ctx.save();
  ctx.fillStyle = "#1F2937";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 0.7;
  const triangleSize = Math.min(width, height) * 0.25;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  ctx.beginPath();
  ctx.moveTo(centerX - triangleSize / 2, centerY - triangleSize / 2);
  ctx.lineTo(centerX + triangleSize / 2, centerY);
  ctx.lineTo(centerX - triangleSize / 2, centerY + triangleSize / 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
