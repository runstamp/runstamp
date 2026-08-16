import { XMLParser } from "fast-xml-parser";
import { loadFontSourceBuffer } from "./font-source.js";
import type { PdfColor, PdfFill, PdfGraphic, PdfPathGraphic, PdfStrokeStyle, PdfSvgGraphic } from "./phase4-types.js";
import type { PdfAssetPolicy } from "./phase9-types.js";

interface SvgViewBox {
  height: number;
  minX: number;
  minY: number;
  width: number;
}

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseNumberValue(value: string | number, label: string): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid SVG numeric attribute ${label}: ${value}`);
    }
    return value;
  }
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid SVG numeric attribute ${label}: ${value}`);
  }
  return numeric;
}

function parseRequiredNumber(value: string | number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`Missing required SVG numeric attribute ${label}`);
  }
  return parseNumberValue(value, label);
}

function parseOptionalNumber(value: string | number | undefined, fallback: number, label: string): number {
  if (value === undefined) {
    return fallback;
  }
  return parseNumberValue(value, label);
}

function parseViewBox(svg: Record<string, unknown>): SvgViewBox {
  if (typeof svg.viewBox === "string") {
    const parts = svg.viewBox.trim().split(/[\s,]+/).map((entry) => Number.parseFloat(entry));
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return {
        minX: parts[0] as number,
        minY: parts[1] as number,
        width: parts[2] as number,
        height: parts[3] as number,
      };
    }
    throw new Error(`Invalid SVG viewBox: ${svg.viewBox}`);
  }

  return {
    minX: 0,
    minY: 0,
    width: parseOptionalNumber(svg.width as string | number | undefined, 100, "svg.width"),
    height: parseOptionalNumber(svg.height as string | number | undefined, 100, "svg.height"),
  };
}

function parseColor(value: string | undefined): PdfColor | undefined {
  if (!value || value === "none") {
    return undefined;
  }

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 6) {
      return {
        space: "rgb",
        r: Number.parseInt(hex.slice(0, 2), 16) / 255,
        g: Number.parseInt(hex.slice(2, 4), 16) / 255,
        b: Number.parseInt(hex.slice(4, 6), 16) / 255,
      };
    }
  }

  const rgb = value.match(/^rgb\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]?.split(",").map((part) => Number.parseFloat(part.trim()) / 255) ?? [];
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return {
        space: "rgb",
        r: parts[0] as number,
        g: parts[1] as number,
        b: parts[2] as number,
      };
    }
  }

  const named: Record<string, PdfColor> = {
    black: { space: "rgb", r: 0, g: 0, b: 0 },
    blue: { space: "rgb", r: 0, g: 0, b: 1 },
    green: { space: "rgb", r: 0, g: 0.5, b: 0 },
    red: { space: "rgb", r: 1, g: 0, b: 0 },
    white: { space: "rgb", r: 1, g: 1, b: 1 },
  };

  return named[value.toLowerCase()];
}

function parseOpacity(value: string | number | undefined): number | undefined {
  return value === undefined ? undefined : parseNumberValue(value, "opacity");
}

function parseFill(node: Record<string, unknown>): PdfFill | undefined {
  const color = parseColor(node.fill as string | undefined);
  if (!color) {
    return undefined;
  }
  return {
    color,
    opacity: parseOpacity(node["fill-opacity"] as string | number | undefined ?? node.opacity as string | number | undefined),
    space: "solid",
  };
}

function parseStroke(node: Record<string, unknown>): PdfStrokeStyle | undefined {
  const color = parseColor(node.stroke as string | undefined);
  if (!color) {
    return undefined;
  }

  const dashArray = typeof node["stroke-dasharray"] === "string"
    ? node["stroke-dasharray"].split(/[\s,]+/).map((entry) => Number.parseFloat(entry)).filter(Number.isFinite)
    : undefined;

  return {
    color,
    dash: dashArray && dashArray.length > 0 ? dashArray : undefined,
    opacity: parseOpacity(node["stroke-opacity"] as string | number | undefined ?? node.opacity as string | number | undefined),
    width: parseOptionalNumber(node["stroke-width"] as string | number | undefined, 1, "stroke-width"),
  };
}

function moveToPdfCoordinates(value: number, min: number, scale: number): number {
  return (value - min) * scale;
}

function buildRectPath(x: number, y: number, width: number, height: number): string {
  return `${x} ${y} ${width} ${height} re`;
}

function buildCirclePath(cx: number, cy: number, r: number): string {
  const kappa = 0.5522847498307936;
  const control = r * kappa;
  return [
    `${cx + r} ${cy} m`,
    `${cx + r} ${cy + control} ${cx + control} ${cy + r} ${cx} ${cy + r} c`,
    `${cx - control} ${cy + r} ${cx - r} ${cy + control} ${cx - r} ${cy} c`,
    `${cx - r} ${cy - control} ${cx - control} ${cy - r} ${cx} ${cy - r} c`,
    `${cx + control} ${cy - r} ${cx + r} ${cy - control} ${cx + r} ${cy} c`,
    "h",
  ].join("\n");
}

function convertQuadraticToCubic(
  currentX: number,
  currentY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
): [number, number, number, number, number, number] {
  return [
    currentX + ((2 / 3) * (controlX - currentX)),
    currentY + ((2 / 3) * (controlY - currentY)),
    endX + ((2 / 3) * (controlX - endX)),
    endY + ((2 / 3) * (controlY - endY)),
    endX,
    endY,
  ];
}

interface CubicArcSegment {
  control1X: number;
  control1Y: number;
  control2X: number;
  control2Y: number;
  endX: number;
  endY: number;
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const magnitude = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (magnitude === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, ((ux * vx) + (uy * vy)) / magnitude));
  return (ux * vy) - (uy * vx) < 0 ? -Math.acos(cosine) : Math.acos(cosine);
}

/** Convert an SVG endpoint-parameterized elliptical arc to PDF cubic curves. */
function convertArcToCubics(
  startX: number,
  startY: number,
  radiusXValue: number,
  radiusYValue: number,
  rotationDegrees: number,
  largeArc: boolean,
  sweep: boolean,
  endX: number,
  endY: number,
): CubicArcSegment[] {
  let radiusX = Math.abs(radiusXValue);
  let radiusY = Math.abs(radiusYValue);
  if (radiusX === 0 || radiusY === 0 || (startX === endX && startY === endY)) return [];

  const rotation = (rotationDegrees % 360) * (Math.PI / 180);
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const halfX = (startX - endX) / 2;
  const halfY = (startY - endY) / 2;
  const transformedX = (cosRotation * halfX) + (sinRotation * halfY);
  const transformedY = (-sinRotation * halfX) + (cosRotation * halfY);

  const radiusScale = ((transformedX * transformedX) / (radiusX * radiusX))
    + ((transformedY * transformedY) / (radiusY * radiusY));
  if (radiusScale > 1) {
    const scale = Math.sqrt(radiusScale);
    radiusX *= scale;
    radiusY *= scale;
  }

  const radiusXSquared = radiusX * radiusX;
  const radiusYSquared = radiusY * radiusY;
  const transformedXSquared = transformedX * transformedX;
  const transformedYSquared = transformedY * transformedY;
  const denominator = (radiusXSquared * transformedYSquared) + (radiusYSquared * transformedXSquared);
  const numerator = Math.max(0, (radiusXSquared * radiusYSquared) - denominator);
  const coefficient = (largeArc === sweep ? -1 : 1) * Math.sqrt(denominator === 0 ? 0 : numerator / denominator);
  const centerTransformedX = coefficient * ((radiusX * transformedY) / radiusY);
  const centerTransformedY = coefficient * (-(radiusY * transformedX) / radiusX);
  const centerX = (cosRotation * centerTransformedX) - (sinRotation * centerTransformedY) + ((startX + endX) / 2);
  const centerY = (sinRotation * centerTransformedX) + (cosRotation * centerTransformedY) + ((startY + endY) / 2);

  const startUnitX = (transformedX - centerTransformedX) / radiusX;
  const startUnitY = (transformedY - centerTransformedY) / radiusY;
  const endUnitX = (-transformedX - centerTransformedX) / radiusX;
  const endUnitY = (-transformedY - centerTransformedY) / radiusY;
  const startAngle = vectorAngle(1, 0, startUnitX, startUnitY);
  let sweepAngle = vectorAngle(startUnitX, startUnitY, endUnitX, endUnitY);
  if (!sweep && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  if (sweep && sweepAngle < 0) sweepAngle += 2 * Math.PI;

  const segmentCount = Math.max(1, Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2)));
  const segmentAngle = sweepAngle / segmentCount;
  const transformPoint = (unitX: number, unitY: number): [number, number] => [
    centerX + (radiusX * ((cosRotation * unitX) - (sinRotation * unitY))),
    centerY + (radiusY * ((sinRotation * unitX) + (cosRotation * unitY))),
  ];

  const segments: CubicArcSegment[] = [];
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const angle1 = startAngle + (segmentIndex * segmentAngle);
    const angle2 = angle1 + segmentAngle;
    const alpha = (4 / 3) * Math.tan(segmentAngle / 4);
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    const [control1X, control1Y] = transformPoint(cos1 - (alpha * sin1), sin1 + (alpha * cos1));
    const [control2X, control2Y] = transformPoint(cos2 + (alpha * sin2), sin2 - (alpha * cos2));
    const [arcEndX, arcEndY] = transformPoint(cos2, sin2);
    segments.push({ control1X, control1Y, control2X, control2Y, endX: arcEndX, endY: arcEndY });
  }
  // Eliminate accumulated floating-point error at the endpoint.
  const finalSegment = segments.at(-1);
  if (finalSegment) {
    finalSegment.endX = endX;
    finalSegment.endY = endY;
  }
  return segments;
}

export function translateSvgPathToPdf(d: string): string {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const commands: string[] = [];
  let index = 0;
  let command = "";
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let cubicControlX: number | undefined;
  let cubicControlY: number | undefined;
  let quadraticControlX: number | undefined;
  let quadraticControlY: number | undefined;

  const readNumber = (): number => {
    const token = tokens[index];
    if (token === undefined || /^[a-zA-Z]$/.test(token)) {
      throw new Error("Invalid SVG path data: missing numeric coordinate");
    }
    index += 1;
    return parseNumberValue(token, "path.d");
  };

  while (index < tokens.length) {
    const token = tokens[index] as string;
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      index += 1;
    }

    if (!command) {
      throw new Error("Invalid SVG path data");
    }

    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();

    if (upper === "M") {
      const x = readNumber();
      const y = readNumber();
      currentX = relative ? currentX + x : x;
      currentY = relative ? currentY + y : y;
      startX = currentX;
      startY = currentY;
      cubicControlX = undefined;
      cubicControlY = undefined;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      commands.push(`${currentX} ${currentY} m`);
      command = relative ? "l" : "L";
      continue;
    }

    if (upper === "L") {
      const x = readNumber();
      const y = readNumber();
      currentX = relative ? currentX + x : x;
      currentY = relative ? currentY + y : y;
      commands.push(`${currentX} ${currentY} l`);
      cubicControlX = undefined;
      cubicControlY = undefined;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    if (upper === "H") {
      const x = readNumber();
      currentX = relative ? currentX + x : x;
      commands.push(`${currentX} ${currentY} l`);
      cubicControlX = undefined;
      cubicControlY = undefined;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    if (upper === "V") {
      const y = readNumber();
      currentY = relative ? currentY + y : y;
      commands.push(`${currentX} ${currentY} l`);
      cubicControlX = undefined;
      cubicControlY = undefined;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    if (upper === "C") {
      const x1 = readNumber();
      const y1 = readNumber();
      const x2 = readNumber();
      const y2 = readNumber();
      const x = readNumber();
      const y = readNumber();
      const control1X = relative ? currentX + x1 : x1;
      const control1Y = relative ? currentY + y1 : y1;
      const control2X = relative ? currentX + x2 : x2;
      const control2Y = relative ? currentY + y2 : y2;
      currentX = relative ? currentX + x : x;
      currentY = relative ? currentY + y : y;
      commands.push(`${control1X} ${control1Y} ${control2X} ${control2Y} ${currentX} ${currentY} c`);
      cubicControlX = control2X;
      cubicControlY = control2Y;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    if (upper === "S") {
      const x2 = readNumber();
      const y2 = readNumber();
      const x = readNumber();
      const y = readNumber();
      const control1X = cubicControlX === undefined ? currentX : (2 * currentX) - cubicControlX;
      const control1Y = cubicControlY === undefined ? currentY : (2 * currentY) - cubicControlY;
      const control2X = relative ? currentX + x2 : x2;
      const control2Y = relative ? currentY + y2 : y2;
      currentX = relative ? currentX + x : x;
      currentY = relative ? currentY + y : y;
      commands.push(`${control1X} ${control1Y} ${control2X} ${control2Y} ${currentX} ${currentY} c`);
      cubicControlX = control2X;
      cubicControlY = control2Y;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    if (upper === "Q") {
      const qx = readNumber();
      const qy = readNumber();
      const x = readNumber();
      const y = readNumber();
      const controlX = relative ? currentX + qx : qx;
      const controlY = relative ? currentY + qy : qy;
      const endX = relative ? currentX + x : x;
      const endY = relative ? currentY + y : y;
      const cubic = convertQuadraticToCubic(currentX, currentY, controlX, controlY, endX, endY);
      currentX = endX;
      currentY = endY;
      commands.push(`${cubic[0]} ${cubic[1]} ${cubic[2]} ${cubic[3]} ${cubic[4]} ${cubic[5]} c`);
      quadraticControlX = controlX;
      quadraticControlY = controlY;
      cubicControlX = undefined;
      cubicControlY = undefined;
      continue;
    }

    if (upper === "T") {
      const x = readNumber();
      const y = readNumber();
      const controlX = quadraticControlX === undefined ? currentX : (2 * currentX) - quadraticControlX;
      const controlY = quadraticControlY === undefined ? currentY : (2 * currentY) - quadraticControlY;
      const endX = relative ? currentX + x : x;
      const endY = relative ? currentY + y : y;
      const cubic = convertQuadraticToCubic(currentX, currentY, controlX, controlY, endX, endY);
      currentX = endX;
      currentY = endY;
      commands.push(`${cubic[0]} ${cubic[1]} ${cubic[2]} ${cubic[3]} ${cubic[4]} ${cubic[5]} c`);
      quadraticControlX = controlX;
      quadraticControlY = controlY;
      cubicControlX = undefined;
      cubicControlY = undefined;
      continue;
    }

    if (upper === "A") {
      const radiusX = readNumber();
      const radiusY = readNumber();
      const rotation = readNumber();
      const largeArcFlag = readNumber();
      const sweepFlag = readNumber();
      const x = readNumber();
      const y = readNumber();
      if (![0, 1].includes(largeArcFlag) || ![0, 1].includes(sweepFlag)) {
        throw new Error("Invalid SVG path data: arc flags must be 0 or 1");
      }
      const endX = relative ? currentX + x : x;
      const endY = relative ? currentY + y : y;
      if (radiusX === 0 || radiusY === 0) {
        commands.push(`${endX} ${endY} l`);
      } else {
        const arcs = convertArcToCubics(currentX, currentY, radiusX, radiusY, rotation, largeArcFlag === 1, sweepFlag === 1, endX, endY);
        for (const arc of arcs) commands.push(`${arc.control1X} ${arc.control1Y} ${arc.control2X} ${arc.control2Y} ${arc.endX} ${arc.endY} c`);
      }
      currentX = endX;
      currentY = endY;
      cubicControlX = undefined;
      cubicControlY = undefined;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    if (upper === "Z") {
      currentX = startX;
      currentY = startY;
      commands.push("h");
      cubicControlX = undefined;
      cubicControlY = undefined;
      quadraticControlX = undefined;
      quadraticControlY = undefined;
      continue;
    }

    throw new Error(`Unsupported SVG path command "${command}"`);
  }

  return commands.join("\n");
}

function normalizeGraphicScale(graphic: PdfSvgGraphic, viewBox: SvgViewBox): { scaleX: number; scaleY: number } {
  return {
    scaleX: graphic.width / viewBox.width,
    scaleY: graphic.height / viewBox.height,
  };
}

export async function expandSvgGraphic(graphic: PdfSvgGraphic, assetPolicy?: PdfAssetPolicy): Promise<PdfGraphic[]> {
  const xml = typeof graphic.source === "string" && graphic.source.trim().startsWith("<")
    ? graphic.source
    : (await loadFontSourceBuffer(graphic.source, undefined, {
        assetPolicy,
        sourceKind: "svg",
      })).toString("utf8");
  const parsed = parser.parse(xml) as { svg?: Record<string, unknown> };
  if (!parsed.svg) {
    throw new Error("Invalid SVG source");
  }

  const viewBox = parseViewBox(parsed.svg);
  const { scaleX, scaleY } = normalizeGraphicScale(graphic, viewBox);
  const elements = [
    ...ensureArray(parsed.svg.rect as Record<string, unknown> | Record<string, unknown>[] | undefined),
    ...ensureArray(parsed.svg.circle as Record<string, unknown> | Record<string, unknown>[] | undefined),
    ...ensureArray(parsed.svg.line as Record<string, unknown> | Record<string, unknown>[] | undefined),
    ...ensureArray(parsed.svg.polyline as Record<string, unknown> | Record<string, unknown>[] | undefined),
    ...ensureArray(parsed.svg.path as Record<string, unknown> | Record<string, unknown>[] | undefined),
  ];

  return elements.map((element) => {
    const fill = parseFill(element);
    const stroke = parseStroke(element);
    const name = (element["#name"] as string | undefined) ?? "";

    if ("d" in element) {
      const translated = translateSvgPathToPdf(String(element.d));
      return {
        d: translated,
        fill,
        scaleX,
        scaleY: -scaleY,
        stroke,
        type: "path",
        x: graphic.x - (viewBox.minX * scaleX),
        y: graphic.y + graphic.height + (viewBox.minY * scaleY),
      } satisfies PdfPathGraphic;
    }

    if ("points" in element || name === "polyline") {
      const pointValue = element.points;
      if (pointValue === undefined) {
        throw new Error("Missing required SVG numeric attribute polyline.points");
      }
      const points = String(pointValue)
        .trim()
        .split(/[\s,]+/)
        .map((value) => Number.parseFloat(value));
      if (points.length < 4 || points.length % 2 !== 0 || !points.every(Number.isFinite)) {
        throw new Error(`Invalid SVG numeric attribute polyline.points: ${String(pointValue)}`);
      }
      const commands: string[] = [];
      for (let pointIndex = 0; pointIndex < points.length; pointIndex += 2) {
        const x = graphic.x + moveToPdfCoordinates(points[pointIndex] as number, viewBox.minX, scaleX);
        const y = graphic.y + graphic.height - moveToPdfCoordinates(points[pointIndex + 1] as number, viewBox.minY, scaleY);
        commands.push(pointIndex === 0 ? `${x} ${y} m` : `${x} ${y} l`);
      }
      return {
        d: commands.join("\n"),
        stroke,
        type: "path",
      } satisfies PdfPathGraphic;
    }

    if ("x1" in element && "y1" in element && "x2" in element && "y2" in element) {
      return {
        stroke: stroke ?? { color: { space: "rgb", r: 0, g: 0, b: 0 }, width: 1 },
        type: "line",
        x1: graphic.x + moveToPdfCoordinates(parseRequiredNumber(element.x1 as string | number | undefined, "line.x1"), viewBox.minX, scaleX),
        x2: graphic.x + moveToPdfCoordinates(parseRequiredNumber(element.x2 as string | number | undefined, "line.x2"), viewBox.minX, scaleX),
        y1: graphic.y + graphic.height - moveToPdfCoordinates(parseRequiredNumber(element.y1 as string | number | undefined, "line.y1"), viewBox.minY, scaleY),
        y2: graphic.y + graphic.height - moveToPdfCoordinates(parseRequiredNumber(element.y2 as string | number | undefined, "line.y2"), viewBox.minY, scaleY),
      };
    }

    if ("cx" in element && "cy" in element && "r" in element) {
      const cx = graphic.x + moveToPdfCoordinates(parseRequiredNumber(element.cx as string | number | undefined, "circle.cx"), viewBox.minX, scaleX);
      const cy = graphic.y + graphic.height - moveToPdfCoordinates(parseRequiredNumber(element.cy as string | number | undefined, "circle.cy"), viewBox.minY, scaleY);
      const radius = parseRequiredNumber(element.r as string | number | undefined, "circle.r") * ((scaleX + scaleY) / 2);
      return {
        d: buildCirclePath(cx, cy, radius),
        fill,
        stroke,
        type: "path",
      } satisfies PdfPathGraphic;
    }

    const x = graphic.x + moveToPdfCoordinates(parseOptionalNumber(element.x as string | number | undefined, 0, "rect.x"), viewBox.minX, scaleX);
    const yTop = moveToPdfCoordinates(parseOptionalNumber(element.y as string | number | undefined, 0, "rect.y"), viewBox.minY, scaleY);
    const width = parseRequiredNumber(element.width as string | number | undefined, "rect.width") * scaleX;
    const height = parseRequiredNumber(element.height as string | number | undefined, "rect.height") * scaleY;

    return {
      d: buildRectPath(x, graphic.y + graphic.height - yTop - height, width, height),
      fill,
      stroke,
      type: "path",
    } satisfies PdfPathGraphic;
  });
}
