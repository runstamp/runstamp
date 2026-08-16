import type { CustomGeometry, FlexStyle, ShapeType } from "./types/ast.js";

const ROUND_RECT_ADJUSTMENT_SCALE = 100000;
const DEFAULT_ROUND_RECT_RADIUS_RATIO = 0.05;

type ViewGeometryInput = {
  customGeometry?: CustomGeometry;
  shapeAdjustmentMap?: Record<string, number>;
  shapeAdjustments?: number[];
  shapeType?: ShapeType | string;
  style?: Pick<FlexStyle, "borderRadius">;
};

export interface EffectiveViewGeometry {
  cornerRadiusPx?: number;
  customGeometry?: CustomGeometry;
  shapeAdjustmentMap?: Record<string, number>;
  shapeAdjustments?: number[];
  shapeType?: ShapeType | string;
}

function hasExplicitViewGeometry(node: ViewGeometryInput): boolean {
  return Boolean(
    node.customGeometry
    || node.shapeType
    || (node.shapeAdjustments && node.shapeAdjustments.length > 0)
    || (node.shapeAdjustmentMap && Object.keys(node.shapeAdjustmentMap).length > 0),
  );
}

function clampCornerRadius(borderRadius: number | undefined, width: number, height: number): number | undefined {
  if (!Number.isFinite(borderRadius) || borderRadius === undefined || borderRadius <= 0) {
    return undefined;
  }
  const shorterSide = Math.min(width, height);
  if (!Number.isFinite(shorterSide) || shorterSide <= 0) {
    return undefined;
  }
  return Math.min(borderRadius, shorterSide / 2);
}

export function roundRectAdjustmentToRadiusPx(
  shapeAdjustments: number[] | undefined,
  width: number,
  height: number,
): number {
  const shorterSide = Math.min(width, height);
  if (!Number.isFinite(shorterSide) || shorterSide <= 0) {
    return 0;
  }

  const ratio = shapeAdjustments?.[0] !== undefined
    ? shapeAdjustments[0] / ROUND_RECT_ADJUSTMENT_SCALE
    : DEFAULT_ROUND_RECT_RADIUS_RATIO;

  return Math.max(0, Math.min(shorterSide / 2, shorterSide * ratio));
}

export function borderRadiusPxToAdjustment(
  borderRadius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  const clampedRadius = clampCornerRadius(borderRadius, width, height);
  if (clampedRadius === undefined) {
    return undefined;
  }

  const shorterSide = Math.min(width, height);
  if (!Number.isFinite(shorterSide) || shorterSide <= 0) {
    return undefined;
  }

  return Math.round((clampedRadius / shorterSide) * ROUND_RECT_ADJUSTMENT_SCALE);
}

export function resolveEffectiveViewGeometry(
  node: ViewGeometryInput,
  width: number,
  height: number,
): EffectiveViewGeometry {
  if (hasExplicitViewGeometry(node)) {
    return {
      customGeometry: node.customGeometry,
      shapeAdjustmentMap: node.shapeAdjustmentMap,
      shapeAdjustments: node.shapeAdjustments,
      shapeType: node.shapeType,
      cornerRadiusPx: node.shapeType === "roundRect"
        ? roundRectAdjustmentToRadiusPx(node.shapeAdjustments, width, height)
        : undefined,
    };
  }

  const adjustment = borderRadiusPxToAdjustment(node.style?.borderRadius, width, height);
  if (adjustment === undefined) {
    return {
      customGeometry: node.customGeometry,
      shapeAdjustmentMap: node.shapeAdjustmentMap,
      shapeAdjustments: node.shapeAdjustments,
      shapeType: node.shapeType,
    };
  }

  return {
    shapeAdjustments: [adjustment],
    shapeType: "roundRect",
    cornerRadiusPx: roundRectAdjustmentToRadiusPx([adjustment], width, height),
  };
}
