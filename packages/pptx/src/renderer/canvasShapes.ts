import type { SKRSContext2D } from "@napi-rs/canvas";
import type { LayoutNode } from "../layout/extract.js";
import { resolveEffectiveViewGeometry } from "../viewGeometry.js";

type ShapeDrawFn = (ctx: SKRSContext2D, x: number, y: number, width: number, height: number) => void;

function drawStar(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  points: number,
): void {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.4;
  const step = Math.PI / points;

  ctx.moveTo(centerX, centerY - outerRadius);
  for (let index = 0; index < 2 * points; index++) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * step;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.closePath();
}

function drawPolygon(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  sides: number,
): void {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const startAngle = -Math.PI / 2;

  ctx.moveTo(centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle));
  for (let index = 1; index <= sides; index++) {
    const angle = startAngle + (2 * Math.PI * index) / sides;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.closePath();
}

const shapeRegistry: Record<string, ShapeDrawFn> = {
  ellipse: (ctx, x, y, width, height) => {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  },
  roundRect: (ctx, x, y, width, height) => {
    const radius = Math.min(width, height) * 0.1;
    ctx.roundRect(x, y, width, height, radius);
  },
  triangle: (ctx, x, y, width, height) => {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  },
  diamond: (ctx, x, y, width, height) => {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, y + height / 2);
    ctx.closePath();
  },
  pentagon: (ctx, x, y, width, height) => drawPolygon(ctx, x, y, width, height, 5),
  hexagon: (ctx, x, y, width, height) => drawPolygon(ctx, x, y, width, height, 6),
  octagon: (ctx, x, y, width, height) => drawPolygon(ctx, x, y, width, height, 8),
  rightArrow: (ctx, x, y, width, height) => {
    const shaftHeight = height * 0.4;
    const shaftY = y + (height - shaftHeight) / 2;
    const headStart = x + width * 0.65;
    ctx.moveTo(x, shaftY);
    ctx.lineTo(headStart, shaftY);
    ctx.lineTo(headStart, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(headStart, y + height);
    ctx.lineTo(headStart, shaftY + shaftHeight);
    ctx.lineTo(x, shaftY + shaftHeight);
    ctx.closePath();
  },
  leftArrow: (ctx, x, y, width, height) => {
    const shaftHeight = height * 0.4;
    const shaftY = y + (height - shaftHeight) / 2;
    const headEnd = x + width * 0.35;
    ctx.moveTo(x + width, shaftY);
    ctx.lineTo(headEnd, shaftY);
    ctx.lineTo(headEnd, y);
    ctx.lineTo(x, y + height / 2);
    ctx.lineTo(headEnd, y + height);
    ctx.lineTo(headEnd, shaftY + shaftHeight);
    ctx.lineTo(x + width, shaftY + shaftHeight);
    ctx.closePath();
  },
  upArrow: (ctx, x, y, width, height) => {
    const shaftWidth = width * 0.4;
    const shaftX = x + (width - shaftWidth) / 2;
    const headEnd = y + height * 0.35;
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, headEnd);
    ctx.lineTo(shaftX + shaftWidth, headEnd);
    ctx.lineTo(shaftX + shaftWidth, y + height);
    ctx.lineTo(shaftX, y + height);
    ctx.lineTo(shaftX, headEnd);
    ctx.lineTo(x, headEnd);
    ctx.closePath();
  },
  downArrow: (ctx, x, y, width, height) => {
    const shaftWidth = width * 0.4;
    const shaftX = x + (width - shaftWidth) / 2;
    const headStart = y + height * 0.65;
    ctx.moveTo(shaftX, y);
    ctx.lineTo(shaftX + shaftWidth, y);
    ctx.lineTo(shaftX + shaftWidth, headStart);
    ctx.lineTo(x + width, headStart);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, headStart);
    ctx.lineTo(shaftX, headStart);
    ctx.closePath();
  },
  star5: (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 5),
  star4: (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 4),
  heart: (ctx, x, y, width, height) => {
    const centerX = x + width / 2;
    const topY = y + height * 0.3;
    ctx.moveTo(centerX, y + height);
    ctx.bezierCurveTo(x - width * 0.1, y + height * 0.55, x, y, centerX - width * 0.02, topY);
    ctx.bezierCurveTo(centerX - width * 0.01, y, centerX + width * 0.01, y, centerX + width * 0.02, topY);
    ctx.bezierCurveTo(x + width, y, x + width * 1.1, y + height * 0.55, centerX, y + height);
    ctx.closePath();
  },
  cloud: (ctx, x, y, width, height) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.arc(centerX, centerY + height * 0.1, width * 0.25, 0, Math.PI * 2);
    ctx.arc(centerX - width * 0.22, centerY, width * 0.2, 0, Math.PI * 2);
    ctx.arc(centerX + width * 0.22, centerY, width * 0.2, 0, Math.PI * 2);
    ctx.arc(centerX - width * 0.1, centerY - height * 0.15, width * 0.18, 0, Math.PI * 2);
    ctx.arc(centerX + width * 0.1, centerY - height * 0.15, width * 0.18, 0, Math.PI * 2);
  },
  flowChartTerminator: (ctx, x, y, width, height) => {
    const radius = height / 2;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + radius, radius, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
  },
  parallelogram: (ctx, x, y, width, height) => {
    const offset = width * 0.2;
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - offset, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  },
  trapezoid: (ctx, x, y, width, height) => {
    const offset = width * 0.15;
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + width - offset, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  },
  chevron: (ctx, x, y, width, height) => {
    const point = width * 0.2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - point, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width - point, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + point, y + height / 2);
    ctx.closePath();
  },
  plus: (ctx, x, y, width, height) => {
    const armWidth = width / 3;
    const armHeight = height / 3;
    ctx.moveTo(x + armWidth, y);
    ctx.lineTo(x + 2 * armWidth, y);
    ctx.lineTo(x + 2 * armWidth, y + armHeight);
    ctx.lineTo(x + width, y + armHeight);
    ctx.lineTo(x + width, y + 2 * armHeight);
    ctx.lineTo(x + 2 * armWidth, y + 2 * armHeight);
    ctx.lineTo(x + 2 * armWidth, y + height);
    ctx.lineTo(x + armWidth, y + height);
    ctx.lineTo(x + armWidth, y + 2 * armHeight);
    ctx.lineTo(x, y + 2 * armHeight);
    ctx.lineTo(x, y + armHeight);
    ctx.lineTo(x + armWidth, y + armHeight);
    ctx.closePath();
  },
  pieWedge: (ctx, x, y, width, height) => {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, y);
    ctx.ellipse(cx, cy, width / 2, height / 2, 0, -Math.PI / 2, 0);
    ctx.closePath();
  },
  wedgeRectCallout: (ctx, x, y, width, height) => {
    const bodyHeight = height * 0.75;
    ctx.rect(x, y, width, bodyHeight);
    ctx.moveTo(x + width * 0.15, y + bodyHeight);
    ctx.lineTo(x + width * 0.05, y + height);
    ctx.lineTo(x + width * 0.25, y + bodyHeight);
  },
  wedgeRoundRectCallout: (ctx, x, y, width, height) => {
    const bodyHeight = height * 0.75;
    const radius = Math.min(width, bodyHeight) * 0.1;
    ctx.roundRect(x, y, width, bodyHeight, radius);
    ctx.moveTo(x + width * 0.15, y + bodyHeight);
    ctx.lineTo(x + width * 0.05, y + height);
    ctx.lineTo(x + width * 0.25, y + bodyHeight);
  },
};

shapeRegistry.flowChartProcess = (ctx, x, y, width, height) => ctx.rect(x, y, width, height);
shapeRegistry.flowChartDecision = shapeRegistry.diamond;
shapeRegistry.cross = shapeRegistry.plus;
shapeRegistry.oval = shapeRegistry.ellipse;
shapeRegistry.flowChartAlternateProcess = shapeRegistry.roundRect;
shapeRegistry.flowChartPredefinedProcess = (ctx, x, y, width, height) => ctx.rect(x, y, width, height);
shapeRegistry.flowChartDocument = (ctx, x, y, width, height) => {
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height * 0.85);
  ctx.quadraticCurveTo(x + width * 0.75, y + height, x + width * 0.5, y + height * 0.85);
  ctx.quadraticCurveTo(x + width * 0.25, y + height * 0.7, x, y + height * 0.85);
  ctx.closePath();
};
shapeRegistry.flowChartInputOutput = shapeRegistry.parallelogram;
shapeRegistry.flowChartManualInput = (ctx, x, y, width, height) => {
  ctx.moveTo(x, y + height * 0.2);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
};
shapeRegistry.flowChartPreparation = shapeRegistry.hexagon;
shapeRegistry.flowChartExtract = shapeRegistry.triangle;
shapeRegistry.star6 = (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 6);
shapeRegistry.star8 = (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 8);

const DONUT_SHAPE = "donut";

export function drawShape(
  ctx: SKRSContext2D,
  node: LayoutNode,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const effectiveGeometry = node.type === "View"
    ? resolveEffectiveViewGeometry(node, width, height)
    : undefined;
  const shapeType = effectiveGeometry?.shapeType;
  ctx.beginPath();

  if (shapeType === DONUT_SHAPE) {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    const innerRatio = 0.55;
    ctx.moveTo(x + width / 2 + width * innerRatio / 2, y + height / 2);
    ctx.ellipse(
      x + width / 2,
      y + height / 2,
      width * innerRatio / 2,
      height * innerRatio / 2,
      0,
      0,
      Math.PI * 2,
      true,
    );
    return;
  }

  if (shapeType === "roundRect") {
    const radius = effectiveGeometry?.cornerRadiusPx ?? Math.min(width, height) * 0.05;
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const drawFn = shapeType ? shapeRegistry[shapeType] : undefined;
  if (drawFn) {
    drawFn(ctx, x, y, width, height);
    return;
  }

  ctx.rect(x, y, width, height);
}
