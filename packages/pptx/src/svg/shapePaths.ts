import type { CustomGeometry, CustomGeometryPath, ShapeType } from "../types/ast.js";
import { resolveEffectiveViewGeometry } from "../viewGeometry.js";

export interface ShapePathResult {
  d: string;
  fillRule?: "nonzero" | "evenodd";
}

function n(value: number): string {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
}

function midpoint(a: number, b: number): number {
  return a + (b - a) / 2;
}

function rectPath(x: number, y: number, width: number, height: number): string {
  return `M ${n(x)} ${n(y)} H ${n(x + width)} V ${n(y + height)} H ${n(x)} Z`;
}

function roundRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  if (r === 0) return rectPath(x, y, width, height);
  return [
    `M ${n(x + r)} ${n(y)}`,
    `H ${n(x + width - r)}`,
    `Q ${n(x + width)} ${n(y)} ${n(x + width)} ${n(y + r)}`,
    `V ${n(y + height - r)}`,
    `Q ${n(x + width)} ${n(y + height)} ${n(x + width - r)} ${n(y + height)}`,
    `H ${n(x + r)}`,
    `Q ${n(x)} ${n(y + height)} ${n(x)} ${n(y + height - r)}`,
    `V ${n(y + r)}`,
    `Q ${n(x)} ${n(y)} ${n(x + r)} ${n(y)}`,
    "Z",
  ].join(" ");
}

function ellipsePath(x: number, y: number, width: number, height: number): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  return [
    `M ${n(cx - rx)} ${n(cy)}`,
    `A ${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)}`,
    `A ${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)}`,
    "Z",
  ].join(" ");
}

function diamondPath(x: number, y: number, width: number, height: number): string {
  return `M ${n(midpoint(x, x + width))} ${n(y)} L ${n(x + width)} ${n(midpoint(y, y + height))} L ${n(midpoint(x, x + width))} ${n(y + height)} L ${n(x)} ${n(midpoint(y, y + height))} Z`;
}

function trianglePath(x: number, y: number, width: number, height: number): string {
  return `M ${n(midpoint(x, x + width))} ${n(y)} L ${n(x + width)} ${n(y + height)} L ${n(x)} ${n(y + height)} Z`;
}

function rtTrianglePath(x: number, y: number, width: number, height: number): string {
  return `M ${n(x)} ${n(y)} L ${n(x + width)} ${n(y + height)} L ${n(x)} ${n(y + height)} Z`;
}

function parallelogramPath(x: number, y: number, width: number, height: number): string {
  const inset = width * 0.2;
  return `M ${n(x + inset)} ${n(y)} H ${n(x + width)} L ${n(x + width - inset)} ${n(y + height)} H ${n(x)} Z`;
}

function trapezoidPath(x: number, y: number, width: number, height: number): string {
  const inset = width * 0.15;
  return `M ${n(x + inset)} ${n(y)} H ${n(x + width - inset)} L ${n(x + width)} ${n(y + height)} H ${n(x)} Z`;
}

function chevronPath(x: number, y: number, width: number, height: number): string {
  const inset = width * 0.2;
  return `M ${n(x)} ${n(y)} H ${n(x + width - inset)} L ${n(x + width)} ${n(y + height / 2)} L ${n(x + width - inset)} ${n(y + height)} H ${n(x)} L ${n(x + inset)} ${n(y + height / 2)} Z`;
}

function plusPath(x: number, y: number, width: number, height: number): string {
  const armW = width / 3;
  const armH = height / 3;
  return [
    `M ${n(x + armW)} ${n(y)}`,
    `H ${n(x + 2 * armW)}`,
    `V ${n(y + armH)}`,
    `H ${n(x + width)}`,
    `V ${n(y + 2 * armH)}`,
    `H ${n(x + 2 * armW)}`,
    `V ${n(y + height)}`,
    `H ${n(x + armW)}`,
    `V ${n(y + 2 * armH)}`,
    `H ${n(x)}`,
    `V ${n(y + armH)}`,
    `H ${n(x + armW)}`,
    "Z",
  ].join(" ");
}

function heartPath(x: number, y: number, width: number, height: number): string {
  const cx = x + width / 2;
  const topY = y + height * 0.3;
  return [
    `M ${n(cx)} ${n(y + height)}`,
    `C ${n(x - width * 0.1)} ${n(y + height * 0.55)} ${n(x)} ${n(y)} ${n(cx - width * 0.02)} ${n(topY)}`,
    `C ${n(cx - width * 0.01)} ${n(y)} ${n(cx + width * 0.01)} ${n(y)} ${n(cx + width * 0.02)} ${n(topY)}`,
    `C ${n(x + width)} ${n(y)} ${n(x + width * 1.1)} ${n(y + height * 0.55)} ${n(cx)} ${n(y + height)}`,
    "Z",
  ].join(" ");
}

function cloudPath(x: number, y: number, width: number, height: number): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return [
    `M ${n(cx - width * 0.15)} ${n(cy + height * 0.1)}`,
    `C ${n(cx - width * 0.28)} ${n(cy - height * 0.05)} ${n(cx - width * 0.1)} ${n(y)} ${n(cx)} ${n(y + height * 0.08)}`,
    `C ${n(cx + width * 0.08)} ${n(y - height * 0.05)} ${n(cx + width * 0.26)} ${n(cy - height * 0.02)} ${n(cx + width * 0.2)} ${n(cy + height * 0.12)}`,
    `C ${n(cx + width * 0.28)} ${n(cy + height * 0.05)} ${n(cx + width * 0.24)} ${n(y + height)} ${n(cx - width * 0.02)} ${n(y + height)}`,
    `C ${n(cx - width * 0.24)} ${n(y + height)} ${n(cx - width * 0.3)} ${n(cy + height * 0.2)} ${n(cx - width * 0.15)} ${n(cy + height * 0.1)}`,
    "Z",
  ].join(" ");
}

function starPath(x: number, y: number, width: number, height: number, points: number): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.4;
  const step = Math.PI / points;
  const parts: string[] = [];
  for (let index = 0; index < 2 * points; index++) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * step;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    parts.push(`${index === 0 ? "M" : "L"} ${n(px)} ${n(py)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function linePath(x: number, y: number, width: number, height: number): string {
  return `M ${n(x)} ${n(y)} L ${n(x + width)} ${n(y + height)}`;
}

function wedgeCalloutPath(x: number, y: number, width: number, height: number): string {
  const bodyHeight = height * 0.75;
  return [
    `M ${n(x)} ${n(y)}`,
    `H ${n(x + width)}`,
    `V ${n(y + bodyHeight)}`,
    `H ${n(x + width * 0.25)}`,
    `L ${n(x + width * 0.15)} ${n(y + height)}`,
    `L ${n(x + width * 0.1)} ${n(y + bodyHeight)}`,
    `H ${n(x)}`,
    "Z",
  ].join(" ");
}

function customGeometryPath(geometry: CustomGeometry, x: number, y: number, width: number, height: number): string {
  const path = geometry.paths?.[0];
  if (!path) return rectPath(x, y, width, height);
  const basisWidth = path.width ?? 1_000_000;
  const basisHeight = path.height ?? 1_000_000;
  const scaleX = width / basisWidth;
  const scaleY = height / basisHeight;
  const commands: string[] = [];
  for (const command of path.commands) {
    switch (command.type) {
      case "moveTo":
        commands.push(`M ${n(x + command.x * scaleX)} ${n(y + command.y * scaleY)}`);
        break;
      case "lineTo":
        commands.push(`L ${n(x + command.x * scaleX)} ${n(y + command.y * scaleY)}`);
        break;
      case "cubicBezTo":
        commands.push(
          `C ${n(x + command.cp1x * scaleX)} ${n(y + command.cp1y * scaleY)} ${n(x + command.cp2x * scaleX)} ${n(y + command.cp2y * scaleY)} ${n(x + command.x * scaleX)} ${n(y + command.y * scaleY)}`,
        );
        break;
      case "quadBezTo":
        commands.push(`Q ${n(x + command.cpx * scaleX)} ${n(y + command.cpy * scaleY)} ${n(x + command.x * scaleX)} ${n(y + command.y * scaleY)}`);
        break;
      case "arcTo":
        commands.push(`L ${n(x + width)} ${n(y + height)}`);
        break;
      case "close":
        commands.push("Z");
        break;
    }
  }
  return commands.join(" ") || rectPath(x, y, width, height);
}

export function buildShapePath(
  node: {
    style?: { borderRadius?: number };
    type?: string;
    shapeType?: ShapeType | string;
    shapeAdjustments?: number[];
    shapeAdjustmentMap?: Record<string, number>;
    customGeometry?: CustomGeometry;
  },
  x: number,
  y: number,
  width: number,
  height: number,
): ShapePathResult {
  const effectiveGeometry = node.type === "View"
    ? resolveEffectiveViewGeometry(node, width, height)
    : {
        customGeometry: node.customGeometry,
        shapeAdjustments: node.shapeAdjustments,
        shapeType: node.shapeType,
      };

  if (effectiveGeometry.customGeometry) {
    return { d: customGeometryPath(effectiveGeometry.customGeometry, x, y, width, height) };
  }

  switch (effectiveGeometry.shapeType) {
    case "ellipse":
      return { d: ellipsePath(x, y, width, height) };
    case "roundRect":
    case "snipRoundRect":
    case "snipRound2SameRect":
    case "round1Rect":
    case "round2SameRect":
    case "round2DiagRect":
    case "round1Rect2":
    case "wedgeRoundRectCallout":
    case "wedgeRoundRectCallout2":
    case "actionButtonBlank":
      return {
        d: roundRectPath(
          x,
          y,
          width,
          height,
          effectiveGeometry.cornerRadiusPx ?? Math.min(width, height) * 0.05,
        ),
      };
    case "triangle":
    case "rtTriangle":
      return { d: trianglePath(x, y, width, height) };
    case "rightTriangle":
      return { d: rtTrianglePath(x, y, width, height) };
    case "diamond":
      return { d: diamondPath(x, y, width, height) };
    case "parallelogram":
      return { d: parallelogramPath(x, y, width, height) };
    case "trapezoid":
    case "nonIsoscelesTrapezoid":
      return { d: trapezoidPath(x, y, width, height) };
    case "chevron":
      return { d: chevronPath(x, y, width, height) };
    case "homePlate":
      return { d: wedgeCalloutPath(x, y, width, height) };
    case "donut":
      return {
        d: `${ellipsePath(x, y, width, height)} ${ellipsePath(x + width * 0.3, y + height * 0.3, width * 0.4, height * 0.4)}`,
        fillRule: "evenodd",
      };
    case "cloud":
    case "cloudCallout":
      return { d: cloudPath(x, y, width, height) };
    case "plus":
    case "cross":
    case "mathPlus":
    case "mathMinus":
    case "mathMultiply":
    case "mathDivide":
    case "mathEqual":
    case "mathNotEqual":
    case "mathNotEqual2":
      return { d: plusPath(x, y, width, height) };
    case "heart":
      return { d: heartPath(x, y, width, height) };
    case "line":
    case "lineInv":
      return { d: linePath(x, y, width, height) };
    case "star4":
      return { d: starPath(x, y, width, height, 4) };
    case "star5":
      return { d: starPath(x, y, width, height, 5) };
    case "star6":
      return { d: starPath(x, y, width, height, 6) };
    case "star7":
      return { d: starPath(x, y, width, height, 7) };
    case "star8":
      return { d: starPath(x, y, width, height, 8) };
    case "star10":
      return { d: starPath(x, y, width, height, 10) };
    case "star12":
      return { d: starPath(x, y, width, height, 12) };
    case "star16":
      return { d: starPath(x, y, width, height, 16) };
    case "star24":
      return { d: starPath(x, y, width, height, 24) };
    case "star32":
      return { d: starPath(x, y, width, height, 32) };
    case "flowChartTerminator":
    case "flowChartProcess":
    case "flowChartPredefinedProcess":
    case "flowChartAlternateProcess":
    case "flowChartInternalStorage":
    case "flowChartDocument":
    case "flowChartDisplay":
    case "flowChartOfflineStorage":
    case "flowChartOnlineStorage":
    case "flowChartExtract":
    case "flowChartPreparation":
    case "flowChartSort":
    case "flowChartMerge":
    case "flowChartDelay":
    case "flowChartManualInput":
    case "flowChartManualOperation":
    case "flowChartInputOutput":
    case "flowChartConnector":
    case "flowChartSummingJunction":
    case "flowChartOr":
    case "flowChartPunchedTape":
    case "flowChartMagneticDisk":
    case "flowChartMagneticDrum":
    case "flowChartMagneticTape":
    case "flowChartCollate":
    case "flowChartDecision":
      return { d: rectPath(x, y, width, height) };
    default:
      return { d: rectPath(x, y, width, height) };
  }
}
