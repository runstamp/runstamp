import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  renderChartToSvg
} from "../chunk-56BKZXEH.js";
import {
  normalizeToParagraphsFromFields
} from "../chunk-VETY33ST.js";
import "../chunk-GRNMJIZR.js";
import "../chunk-QZ7YLVPL.js";
import "../chunk-66EJ4WIS.js";
import {
  fetchWithRetry,
  resolveColorValue,
  resolveEffectiveViewGeometry
} from "../chunk-BF4WWWMZ.js";
import "../chunk-MA6IZLCE.js";
import "../chunk-PUKAI6X5.js";
import {
  validateFetchUrl
} from "../chunk-YWT5KXVL.js";
import {
  resolveLineHeightPixels
} from "../chunk-P5JGOT4P.js";
import {
  FETCH_TIMEOUT_MS,
  validateDataUrlSize
} from "../chunk-3O47XGMU.js";
import {
  getLogger
} from "../chunk-HZBNNQK3.js";
import "../chunk-JXY3OJQ6.js";
import "../chunk-OWC7QHPZ.js";

// src/svg/shapePaths.ts
function n(value) {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
}
function midpoint(a, b) {
  return a + (b - a) / 2;
}
function rectPath(x, y, width, height) {
  return `M ${n(x)} ${n(y)} H ${n(x + width)} V ${n(y + height)} H ${n(x)} Z`;
}
function roundRectPath(x, y, width, height, radius) {
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
    "Z"
  ].join(" ");
}
function ellipsePath(x, y, width, height) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  return [
    `M ${n(cx - rx)} ${n(cy)}`,
    `A ${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)}`,
    `A ${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)}`,
    "Z"
  ].join(" ");
}
function diamondPath(x, y, width, height) {
  return `M ${n(midpoint(x, x + width))} ${n(y)} L ${n(x + width)} ${n(midpoint(y, y + height))} L ${n(midpoint(x, x + width))} ${n(y + height)} L ${n(x)} ${n(midpoint(y, y + height))} Z`;
}
function trianglePath(x, y, width, height) {
  return `M ${n(midpoint(x, x + width))} ${n(y)} L ${n(x + width)} ${n(y + height)} L ${n(x)} ${n(y + height)} Z`;
}
function rtTrianglePath(x, y, width, height) {
  return `M ${n(x)} ${n(y)} L ${n(x + width)} ${n(y + height)} L ${n(x)} ${n(y + height)} Z`;
}
function parallelogramPath(x, y, width, height) {
  const inset = width * 0.2;
  return `M ${n(x + inset)} ${n(y)} H ${n(x + width)} L ${n(x + width - inset)} ${n(y + height)} H ${n(x)} Z`;
}
function trapezoidPath(x, y, width, height) {
  const inset = width * 0.15;
  return `M ${n(x + inset)} ${n(y)} H ${n(x + width - inset)} L ${n(x + width)} ${n(y + height)} H ${n(x)} Z`;
}
function chevronPath(x, y, width, height) {
  const inset = width * 0.2;
  return `M ${n(x)} ${n(y)} H ${n(x + width - inset)} L ${n(x + width)} ${n(y + height / 2)} L ${n(x + width - inset)} ${n(y + height)} H ${n(x)} L ${n(x + inset)} ${n(y + height / 2)} Z`;
}
function plusPath(x, y, width, height) {
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
    "Z"
  ].join(" ");
}
function heartPath(x, y, width, height) {
  const cx = x + width / 2;
  const topY = y + height * 0.3;
  return [
    `M ${n(cx)} ${n(y + height)}`,
    `C ${n(x - width * 0.1)} ${n(y + height * 0.55)} ${n(x)} ${n(y)} ${n(cx - width * 0.02)} ${n(topY)}`,
    `C ${n(cx - width * 0.01)} ${n(y)} ${n(cx + width * 0.01)} ${n(y)} ${n(cx + width * 0.02)} ${n(topY)}`,
    `C ${n(x + width)} ${n(y)} ${n(x + width * 1.1)} ${n(y + height * 0.55)} ${n(cx)} ${n(y + height)}`,
    "Z"
  ].join(" ");
}
function cloudPath(x, y, width, height) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return [
    `M ${n(cx - width * 0.15)} ${n(cy + height * 0.1)}`,
    `C ${n(cx - width * 0.28)} ${n(cy - height * 0.05)} ${n(cx - width * 0.1)} ${n(y)} ${n(cx)} ${n(y + height * 0.08)}`,
    `C ${n(cx + width * 0.08)} ${n(y - height * 0.05)} ${n(cx + width * 0.26)} ${n(cy - height * 0.02)} ${n(cx + width * 0.2)} ${n(cy + height * 0.12)}`,
    `C ${n(cx + width * 0.28)} ${n(cy + height * 0.05)} ${n(cx + width * 0.24)} ${n(y + height)} ${n(cx - width * 0.02)} ${n(y + height)}`,
    `C ${n(cx - width * 0.24)} ${n(y + height)} ${n(cx - width * 0.3)} ${n(cy + height * 0.2)} ${n(cx - width * 0.15)} ${n(cy + height * 0.1)}`,
    "Z"
  ].join(" ");
}
function starPath(x, y, width, height, points) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.4;
  const step = Math.PI / points;
  const parts = [];
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
function linePath(x, y, width, height) {
  return `M ${n(x)} ${n(y)} L ${n(x + width)} ${n(y + height)}`;
}
function wedgeCalloutPath(x, y, width, height) {
  const bodyHeight = height * 0.75;
  return [
    `M ${n(x)} ${n(y)}`,
    `H ${n(x + width)}`,
    `V ${n(y + bodyHeight)}`,
    `H ${n(x + width * 0.25)}`,
    `L ${n(x + width * 0.15)} ${n(y + height)}`,
    `L ${n(x + width * 0.1)} ${n(y + bodyHeight)}`,
    `H ${n(x)}`,
    "Z"
  ].join(" ");
}
function customGeometryPath(geometry, x, y, width, height) {
  const path = geometry.paths?.[0];
  if (!path) return rectPath(x, y, width, height);
  const basisWidth = path.width ?? 1e6;
  const basisHeight = path.height ?? 1e6;
  const scaleX = width / basisWidth;
  const scaleY = height / basisHeight;
  const commands = [];
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
          `C ${n(x + command.cp1x * scaleX)} ${n(y + command.cp1y * scaleY)} ${n(x + command.cp2x * scaleX)} ${n(y + command.cp2y * scaleY)} ${n(x + command.x * scaleX)} ${n(y + command.y * scaleY)}`
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
function buildShapePath(node, x, y, width, height) {
  const effectiveGeometry = node.type === "View" ? resolveEffectiveViewGeometry(node, width, height) : {
    customGeometry: node.customGeometry,
    shapeAdjustments: node.shapeAdjustments,
    shapeType: node.shapeType
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
          effectiveGeometry.cornerRadiusPx ?? Math.min(width, height) * 0.05
        )
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
        fillRule: "evenodd"
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

// src/svg/exporter.ts
var SvgDocumentBuilder = class {
  constructor(slideIndex) {
    this.slideIndex = slideIndex;
  }
  defs = [];
  counter = 0;
  nextId(prefix) {
    return `s${this.slideIndex}-${prefix}-${this.counter++}`;
  }
  addDef(def) {
    this.defs.push(def);
  }
};
function escapeXmlText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function escapeXmlAttr(value) {
  return escapeXmlText(value).replaceAll('"', "&quot;");
}
function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
}
function toPx(points) {
  return points === void 0 ? void 0 : points * (96 / 72);
}
function resolveColor(color, themeColors) {
  return resolveColorValue(color, themeColors);
}
function alignToAnchor(align) {
  switch (align) {
    case "center":
      return "middle";
    case "right":
      return "end";
    default:
      return "start";
  }
}
function getFontSize(style) {
  return style?.fontSize ?? 14;
}
function getLineHeightPx(style, paragraph) {
  const fontSize = getFontSize(style);
  if (paragraph?.lineHeight !== void 0) {
    return paragraph.lineSpacingMode === "percentage" ? fontSize * (paragraph.lineHeight / 100) : resolveLineHeightPixels(paragraph.lineHeight, fontSize, fontSize * 1.2, "points");
  }
  return resolveLineHeightPixels(style?.lineHeight, fontSize, fontSize * 1.2);
}
function shapeTransform(node) {
  const rotation = node.style?.rotation;
  if (!rotation) return "";
  const cx = node.layout.x + node.layout.width / 2;
  const cy = node.layout.y + node.layout.height / 2;
  return `rotate(${formatNumber(rotation)} ${formatNumber(cx)} ${formatNumber(cy)})`;
}
function buildLinearGradient(builder, fill, bbox, themeColors) {
  const id = builder.nextId("lg");
  const angle = ((fill.angle ?? 180) - 90) * (Math.PI / 180);
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const length = Math.max(bbox.width, bbox.height) / 2;
  const x1 = cx - Math.cos(angle) * length;
  const y1 = cy - Math.sin(angle) * length;
  const x2 = cx + Math.cos(angle) * length;
  const y2 = cy + Math.sin(angle) * length;
  builder.addDef(
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}">${fill.stops.slice().sort((a, b) => a.position - b.position).map((stop) => `<stop offset="${Math.max(0, Math.min(100, stop.position))}%" stop-color="${escapeXmlAttr(resolveColor(stop.color, themeColors) ?? "#000000")}"${stop.alpha !== void 0 ? ` stop-opacity="${Math.max(0, Math.min(1, stop.alpha))}"` : ""}/>`).join("")}</linearGradient>`
  );
  return `url(#${id})`;
}
function buildRadialGradient(builder, fill, bbox, themeColors) {
  const id = builder.nextId("rg");
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const r = Math.max(bbox.width, bbox.height) / 2;
  builder.addDef(
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(r)}">${fill.stops.slice().sort((a, b) => a.position - b.position).map((stop) => `<stop offset="${Math.max(0, Math.min(100, stop.position))}%" stop-color="${escapeXmlAttr(resolveColor(stop.color, themeColors) ?? "#000000")}"${stop.alpha !== void 0 ? ` stop-opacity="${Math.max(0, Math.min(1, stop.alpha))}"` : ""}/>`).join("")}</radialGradient>`
  );
  return `url(#${id})`;
}
function buildPatternFill(builder, bbox, foreground, background, themeColors) {
  const id = builder.nextId("pat");
  const size = Math.max(8, Math.min(20, Math.round(Math.max(bbox.width, bbox.height) / 18) || 12));
  const fg = resolveColor(foreground, themeColors) ?? "#000000";
  const bg = resolveColor(background, themeColors) ?? "#FFFFFF";
  builder.addDef(
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${escapeXmlAttr(bg)}"/><path d="M 0 ${size} L ${size} 0" stroke="${escapeXmlAttr(fg)}" stroke-opacity="0.18" stroke-width="${Math.max(1, size / 6)}"/></pattern>`
  );
  return `url(#${id})`;
}
async function buildImageFill(builder, bbox, source) {
  const href = await inlineDataUri(source, source.toLowerCase().includes("svg"));
  if (!href) {
    return "transparent";
  }
  const id = builder.nextId("imgfill");
  builder.addDef(
    `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${formatNumber(bbox.x)}" y="${formatNumber(bbox.y)}" width="${formatNumber(Math.max(1, bbox.width))}" height="${formatNumber(Math.max(1, bbox.height))}"><image href="${escapeXmlAttr(href)}" x="${formatNumber(bbox.x)}" y="${formatNumber(bbox.y)}" width="${formatNumber(Math.max(1, bbox.width))}" height="${formatNumber(Math.max(1, bbox.height))}" preserveAspectRatio="none"/></pattern>`
  );
  return `url(#${id})`;
}
function buildShadowFilter(builder, bbox, color, blurRadius, offsetX, offsetY, opacity) {
  const id = builder.nextId("fx");
  const pad = Math.max(blurRadius * 2, 12);
  builder.addDef(
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${formatNumber(bbox.x - pad - Math.abs(offsetX))}" y="${formatNumber(bbox.y - pad - Math.abs(offsetY))}" width="${formatNumber(bbox.width + pad * 2 + Math.abs(offsetX) * 2)}" height="${formatNumber(bbox.height + pad * 2 + Math.abs(offsetY) * 2)}"><feDropShadow dx="${formatNumber(offsetX)}" dy="${formatNumber(offsetY)}" stdDeviation="${formatNumber(Math.max(0.1, blurRadius / 2))}" flood-color="${escapeXmlAttr(color)}" flood-opacity="${Math.max(0, Math.min(1, opacity))}"/></filter>`
  );
  return `url(#${id})`;
}
function buildInnerShadowFilter(builder, bbox, color, blurRadius, offsetX, offsetY, opacity) {
  const id = builder.nextId("is");
  const pad = Math.max(blurRadius * 2, 12);
  builder.addDef(
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${formatNumber(bbox.x - pad - Math.abs(offsetX))}" y="${formatNumber(bbox.y - pad - Math.abs(offsetY))}" width="${formatNumber(bbox.width + pad * 2 + Math.abs(offsetX) * 2)}" height="${formatNumber(bbox.height + pad * 2 + Math.abs(offsetY) * 2)}"><feFlood flood-color="${escapeXmlAttr(color)}" flood-opacity="${Math.max(0, Math.min(1, opacity))}" result="shadowColor"/><feComposite in="shadowColor" in2="SourceAlpha" operator="in" result="shadowAlpha"/><feGaussianBlur in="shadowAlpha" stdDeviation="${formatNumber(Math.max(0.1, blurRadius / 2))}" result="shadowBlur"/><feOffset in="shadowBlur" dx="${formatNumber(offsetX)}" dy="${formatNumber(offsetY)}" result="shadowOffset"/><feComposite in="shadowOffset" in2="SourceAlpha" operator="out" result="innerShadow"/><feComposite in="SourceGraphic" in2="innerShadow" operator="over"/></filter>`
  );
  return `url(#${id})`;
}
function buildReflectionMask(builder, bbox, startOpacity, endOpacity) {
  const id = builder.nextId("rm");
  const gradientId = builder.nextId("rg");
  const top = bbox.y + bbox.height;
  const bottom = bbox.y + bbox.height * 2;
  builder.addDef(
    `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${formatNumber(bbox.x)}" y1="${formatNumber(top)}" x2="${formatNumber(bbox.x)}" y2="${formatNumber(bottom)}"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="${Math.max(0, Math.min(1, startOpacity))}"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="${Math.max(0, Math.min(1, endOpacity))}"/></linearGradient>`
  );
  builder.addDef(
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${formatNumber(bbox.x)}" y="${formatNumber(top)}" width="${formatNumber(bbox.width)}" height="${formatNumber(bbox.height)}"><rect x="${formatNumber(bbox.x)}" y="${formatNumber(top)}" width="${formatNumber(bbox.width)}" height="${formatNumber(bbox.height)}" fill="url(#${gradientId})"/></mask>`
  );
  return `url(#${id})`;
}
function buildArrowMarker(builder, color, width, length) {
  const id = builder.nextId("mk");
  builder.addDef(
    `<marker id="${id}" markerUnits="strokeWidth" markerWidth="${formatNumber(Math.max(4, length))}" markerHeight="${formatNumber(Math.max(4, width))}" refX="${formatNumber(Math.max(4, length))}" refY="${formatNumber(Math.max(4, width) / 2)}" orient="auto"><path d="M 0 0 L ${formatNumber(Math.max(4, length))} ${formatNumber(Math.max(4, width) / 2)} L 0 ${formatNumber(Math.max(4, width))} Z" fill="${escapeXmlAttr(color)}"/></marker>`
  );
  return `url(#${id})`;
}
async function renderChildNodes(children, builder, themeColors) {
  if (!children?.length) return "";
  let markup = "";
  for (const child of children) {
    markup += await renderNode(child, builder, themeColors);
  }
  return markup;
}
async function inlineDataUri(source, preferSvg = false) {
  if (!source) return void 0;
  if (source.startsWith("data:")) {
    const commaIdx = source.indexOf(",");
    if (commaIdx === -1) return source;
    if (source.slice(0, commaIdx).toLowerCase().includes(";base64")) {
      try {
        validateDataUrlSize(source.slice(commaIdx + 1));
      } catch (err) {
        getLogger().warn(`[svg] Rejected oversized data URI: ${err.message}`);
        return void 0;
      }
    }
    return source;
  }
  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    return void 0;
  }
  try {
    validateFetchUrl(source);
    const response = await fetchWithRetry(source, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return void 0;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (preferSvg || contentType?.includes("svg")) {
      return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
    }
    return `data:${contentType ?? "image/png"};base64,${buffer.toString("base64")}`;
  } catch (err) {
    getLogger().warn(`[svg] Failed to inline image ${source}: ${err.message}`);
    return void 0;
  }
}
function buildRunMarkup(run, builder, themeColors) {
  const attrs = [];
  if (run.style?.fontFamily) attrs.push(`font-family="${escapeXmlAttr(run.style.fontFamily)}"`);
  if (run.style?.fontSize !== void 0) attrs.push(`font-size="${formatNumber(run.style.fontSize)}"`);
  if (run.style?.fontWeight) attrs.push(`font-weight="${escapeXmlAttr(run.style.fontWeight)}"`);
  if (run.style?.fontStyle) attrs.push(`font-style="${escapeXmlAttr(run.style.fontStyle)}"`);
  if (run.style?.textDecorationLine && run.style.textDecorationLine !== "none") {
    attrs.push(`text-decoration="${escapeXmlAttr(run.style.textDecorationLine.replaceAll("-", " "))}"`);
  }
  if (run.style?.color) {
    attrs.push(`fill="${escapeXmlAttr(resolveColor(run.style.color, themeColors) ?? "#000000")}"`);
  }
  if (run.style?.gradientFill) {
    const dummy = { x: 0, y: 0, width: 100, height: 100 };
    const fill = run.style.gradientFill.type === "linear" ? buildLinearGradient(builder, run.style.gradientFill, dummy, themeColors) : buildRadialGradient(builder, run.style.gradientFill, dummy, themeColors);
    attrs.push(`fill="${fill}"`);
  }
  return `<tspan${attrs.length ? ` ${attrs.join(" ")}` : ""}>${escapeXmlText(run.text)}</tspan>`;
}
function renderParagraphs(paragraphs, box, style, builder, themeColors) {
  const fontSize = getFontSize(style);
  const insets = style?.textInsets;
  const xBase = box.x + (insets?.left ?? 0);
  const yBase = box.y + (insets?.top ?? 0);
  const usableHeight = Math.max(0, box.height - (insets?.top ?? 0) - (insets?.bottom ?? 0));
  const metrics = paragraphs.map((paragraph) => {
    const before = (toPx(paragraph.spaceBefore) ?? 0) + (paragraph.spaceBeforePercent !== void 0 ? fontSize * (paragraph.spaceBeforePercent / 100) : 0);
    const after = (toPx(paragraph.spaceAfter) ?? 0) + (paragraph.spaceAfterPercent !== void 0 ? fontSize * (paragraph.spaceAfterPercent / 100) : 0);
    const lineHeight = getLineHeightPx(style, paragraph);
    return { paragraph, before, after, lineHeight, total: before + after + lineHeight };
  });
  const blockHeight = metrics.reduce((sum, item) => sum + item.total, 0);
  const verticalAlign = style?.verticalAlign ?? "top";
  const offsetY = verticalAlign === "middle" ? Math.max(0, (usableHeight - blockHeight) / 2) : verticalAlign === "bottom" ? Math.max(0, usableHeight - blockHeight) : 0;
  let currentY = yBase + offsetY;
  const result = [];
  for (const item of metrics) {
    currentY += item.before;
    const paragraph = item.paragraph;
    const runs = paragraph.runs ?? [];
    const textAnchor = alignToAnchor(paragraph.align ?? style?.textAlign);
    const x = xBase + (paragraph.marginLeft ?? 0) + (paragraph.indent ?? 0);
    const y = currentY + fontSize;
    const lineAttrs = [
      `x="${formatNumber(x)}"`,
      `y="${formatNumber(y)}"`,
      `text-anchor="${textAnchor}"`,
      `xml:space="preserve"`
    ];
    if (paragraph.rtl || style?.rtl) {
      lineAttrs.push(`direction="rtl"`, `unicode-bidi="bidi-override"`);
    }
    const runMarkup = runs.length ? runs.map((run) => buildRunMarkup(run, builder ?? new SvgDocumentBuilder(0), themeColors)).join("") : "";
    result.push(`<text ${lineAttrs.join(" ")}>${runMarkup || escapeXmlText("")}</text>`);
    currentY += item.lineHeight + item.after;
  }
  return result.join("");
}
function renderTextBlock(text, paragraphs, box, style, builder, themeColors, autoFitScale = 1) {
  const effectiveStyle = autoFitScale === 1 || !style ? style ?? {} : { ...style, fontSize: Math.max(1, (style.fontSize ?? 14) * autoFitScale) };
  const normalized = normalizeToParagraphsFromFields(text, paragraphs);
  const attrs = [];
  const color = resolveColor(effectiveStyle.color, themeColors);
  if (color) attrs.push(`fill="${escapeXmlAttr(color)}"`);
  if (effectiveStyle.fontFamily) attrs.push(`font-family="${escapeXmlAttr(effectiveStyle.fontFamily)}"`);
  if (effectiveStyle.fontSize !== void 0) attrs.push(`font-size="${formatNumber(effectiveStyle.fontSize)}"`);
  if (effectiveStyle.fontWeight) attrs.push(`font-weight="${escapeXmlAttr(effectiveStyle.fontWeight)}"`);
  if (effectiveStyle.fontStyle) attrs.push(`font-style="${escapeXmlAttr(effectiveStyle.fontStyle)}"`);
  return `<g${attrs.length ? ` ${attrs.join(" ")}` : ""}>${renderParagraphs(normalized, box, effectiveStyle, builder, themeColors)}</g>`;
}
async function renderBackground(slide, builder, themeColors, backgroundOverride) {
  const slideNode = slide;
  const { width, height } = slide.layout;
  if (backgroundOverride) {
    return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="${escapeXmlAttr(backgroundOverride)}"/>`;
  }
  const background = slideNode.background;
  if (!background) {
    return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#FFFFFF"/>`;
  }
  switch (background.type) {
    case "solid":
      return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="${escapeXmlAttr(resolveColor(background.color, themeColors) ?? "#FFFFFF")}"/>`;
    case "gradient":
      return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="${buildLinearGradient(builder, background, slide.layout, themeColors)}"/>`;
    case "pattern":
      return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="${buildPatternFill(builder, slide.layout, background.foreground, background.background, themeColors)}"/>`;
    case "image": {
      const href = await inlineDataUri(background.src, false);
      if (!href) {
        return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#FFFFFF"/>`;
      }
      return `<image href="${escapeXmlAttr(href)}" x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" preserveAspectRatio="none"/>`;
    }
    default:
      return `<rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#FFFFFF"/>`;
  }
}
function applyVisualEffects(node, content, builder, themeColors) {
  const transform = shapeTransform(node);
  const opacity = node.style?.opacity;
  const effects = node.style?.effects;
  let filter;
  if (effects?.dropShadow) {
    filter = buildShadowFilter(
      builder,
      node.layout,
      resolveColor(effects.dropShadow.color, themeColors) ?? "rgba(0,0,0,0.3)",
      effects.dropShadow.blurRadius,
      effects.dropShadow.offsetX,
      effects.dropShadow.offsetY,
      effects.dropShadow.opacity ?? 1
    );
  } else if (effects?.glow) {
    filter = buildShadowFilter(
      builder,
      node.layout,
      resolveColor(effects.glow.color, themeColors) ?? "rgba(255,255,255,0.65)",
      effects.glow.radius,
      0,
      0,
      effects.glow.opacity ?? 1
    );
  } else if (effects?.innerShadow) {
    filter = buildInnerShadowFilter(
      builder,
      node.layout,
      resolveColor(effects.innerShadow.color, themeColors) ?? "rgba(0,0,0,0.3)",
      effects.innerShadow.blurRadius,
      effects.innerShadow.offsetX,
      effects.innerShadow.offsetY,
      effects.innerShadow.opacity ?? 1
    );
  }
  const mainGroup = `<g${[
    transform ? `transform="${transform}"` : "",
    opacity !== void 0 ? `opacity="${formatNumber(opacity)}"` : "",
    filter ? `filter="${filter}"` : ""
  ].filter(Boolean).length ? ` ${[transform ? `transform="${transform}"` : "", opacity !== void 0 ? `opacity="${formatNumber(opacity)}"` : "", filter ? `filter="${filter}"` : ""].filter(Boolean).join(" ")}` : ""}>${content}</g>`;
  const reflection = effects?.reflection;
  if (!reflection) return mainGroup;
  const maskId = buildReflectionMask(builder, node.layout, reflection.startOpacity ?? 0.5, reflection.endOpacity ?? 0);
  const reflectionTransform = [
    transform,
    `translate(0 ${formatNumber(node.layout.height * 2 + (reflection.distance ?? 0))})`,
    "scale(1 -1)"
  ].filter(Boolean).join(" ");
  const reflected = `<g transform="${reflectionTransform}" opacity="${formatNumber(opacity ?? 1)}" mask="url(#${maskId})">${content}</g>`;
  return `${mainGroup}${reflected}`;
}
async function renderImageNode(node, builder) {
  const { x, y, width, height } = node.layout;
  const href = await inlineDataUri(node.svgSrc ?? node.src, Boolean(node.svgSrc));
  if (!href) {
    return `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#F1F5F9" stroke="#CBD5E1" stroke-dasharray="4 3"/><text x="${formatNumber(x + width / 2)}" y="${formatNumber(y + height / 2)}" text-anchor="middle" dominant-baseline="middle" fill="#94A3B8" font-family="monospace" font-size="11">[image]</text>`;
  }
  let markup = `<image href="${escapeXmlAttr(href)}" x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" preserveAspectRatio="none"/>`;
  if (node.borderRadius && node.borderRadius > 0) {
    const clipId = builder.nextId("clip");
    builder.addDef(`<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" rx="${formatNumber(node.borderRadius)}" ry="${formatNumber(node.borderRadius)}"/></clipPath>`);
    markup = `<g clip-path="url(#${clipId})">${markup}</g>`;
  }
  return markup;
}
function renderConnectorNode(node, builder, themeColors) {
  const color = resolveColor(node.lineColor, themeColors) ?? "#1F2937";
  const strokeWidth = node.lineWidth ?? 1.5;
  const dasharray = node.lineDashStyle === "dashed" ? `${strokeWidth * 3} ${strokeWidth * 2}` : node.lineDashStyle === "dotted" ? `${strokeWidth} ${strokeWidth * 2}` : node.lineDashStyle === "dotDash" ? `${strokeWidth} ${strokeWidth * 2} ${strokeWidth * 3} ${strokeWidth * 2}` : "";
  const arrowStart = typeof node.arrowStart === "object" ? node.arrowStart : node.arrowStart ? { type: "triangle", width: "med", length: "med" } : void 0;
  const arrowEnd = typeof node.arrowEnd === "object" ? node.arrowEnd : node.arrowEnd ? { type: "triangle", width: "med", length: "med" } : void 0;
  const markerStart = arrowStart ? buildArrowMarker(builder, color, arrowStart.width === "lg" ? 8 : arrowStart.width === "med" ? 6 : 4, arrowStart.length === "lg" ? 12 : arrowStart.length === "med" ? 9 : 6) : void 0;
  const markerEnd = arrowEnd ? buildArrowMarker(builder, color, arrowEnd.width === "lg" ? 8 : arrowEnd.width === "med" ? 6 : 4, arrowEnd.length === "lg" ? 12 : arrowEnd.length === "med" ? 9 : 6) : void 0;
  const { x: startX, y: startY } = node.start;
  const { x: endX, y: endY } = node.end;
  const d = node.connectorType === "elbow" ? `M ${formatNumber(startX)} ${formatNumber(startY)} L ${formatNumber((startX + endX) / 2)} ${formatNumber(startY)} L ${formatNumber((startX + endX) / 2)} ${formatNumber(endY)} L ${formatNumber(endX)} ${formatNumber(endY)}` : node.connectorType === "curved" ? `M ${formatNumber(startX)} ${formatNumber(startY)} Q ${formatNumber((startX + endX) / 2)} ${formatNumber(startY - Math.abs(endY - startY) * 0.25)} ${formatNumber(endX)} ${formatNumber(endY)}` : `M ${formatNumber(startX)} ${formatNumber(startY)} L ${formatNumber(endX)} ${formatNumber(endY)}`;
  const attrs = [
    `d="${d}"`,
    `fill="none"`,
    `stroke="${escapeXmlAttr(color)}"`,
    `stroke-width="${formatNumber(strokeWidth)}"`
  ];
  if (dasharray) attrs.push(`stroke-dasharray="${dasharray}"`);
  if (markerStart) attrs.push(`marker-start="${markerStart}"`);
  if (markerEnd) attrs.push(`marker-end="${markerEnd}"`);
  return `<path ${attrs.join(" ")} />`;
}
async function renderChartNode(node, themeColors) {
  const { x, y, width, height } = node.layout;
  const chartType = node.chartData.chartType;
  const title = node.chartData.title?.text ?? chartType;
  const rendered = await renderChartToSvg(
    node.chartData,
    { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) },
    themeColors
  );
  if (!rendered) {
    return `<g class="runstamp-chart-hook" data-chart-type="${escapeXmlAttr(chartType)}" data-chart-title="${escapeXmlAttr(title)}"><rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#F8FAFC" stroke="#94A3B8" stroke-dasharray="6 4" rx="6" ry="6"/><text x="${formatNumber(x + width / 2)}" y="${formatNumber(y + height / 2)}" text-anchor="middle" dominant-baseline="middle" fill="#64748B" font-family="monospace" font-size="12">Chart</text></g>`;
  }
  const embeddedSvg = rendered.svg.replace(/^\s*<\?xml[^>]*>\s*/i, "").replace(
    /<svg\b([^>]*)>/i,
    `<svg$1 x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" preserveAspectRatio="none">`
  );
  return `<g class="runstamp-chart" data-chart-renderer="${rendered.renderer}" data-chart-type="${escapeXmlAttr(chartType)}" data-chart-title="${escapeXmlAttr(title)}">${embeddedSvg}</g>`;
}
function renderTableCell(cell, box, builder, themeColors) {
  const fillStyle = cell.style?.fill;
  let fill = "#FFFFFF";
  if (fillStyle && typeof fillStyle === "object" && "type" in fillStyle) {
    fill = fillStyle.type === "linear" ? buildLinearGradient(builder, fillStyle, box, themeColors) : buildRadialGradient(builder, fillStyle, box, themeColors);
  } else if (fillStyle) {
    fill = resolveColor(fillStyle, themeColors) ?? "#FFFFFF";
  }
  const padding = cell.style?.padding ?? 4;
  const textBox = {
    x: box.x + padding,
    y: box.y + padding,
    width: Math.max(0, box.width - padding * 2),
    height: Math.max(0, box.height - padding * 2)
  };
  const textStyle = {
    fontFamily: cell.style?.fontFamily,
    fontSize: cell.style?.fontSize,
    fontWeight: cell.style?.fontWeight,
    fontStyle: cell.style?.fontStyle,
    color: cell.style?.color,
    textAlign: cell.style?.textAlign,
    verticalAlign: cell.style?.verticalAlign
  };
  const textMarkup = renderTextBlock(cell.content ?? cell.text, cell.paragraphs, textBox, textStyle, builder, themeColors);
  return `<g><rect x="${formatNumber(box.x)}" y="${formatNumber(box.y)}" width="${formatNumber(box.width)}" height="${formatNumber(box.height)}" fill="${escapeXmlAttr(fill)}"/>${textMarkup}</g>`;
}
function renderTable(node, builder, themeColors) {
  const { x, y, width, height } = node.layout;
  const table = node.tableData;
  const rowCount = table.rows.length || 1;
  const defaultRowHeight = height / rowCount;
  const rowHeights = table.rows.map((row) => row.height ?? row.minHeight ?? defaultRowHeight);
  const totalHeight = rowHeights.reduce((sum, value) => sum + value, 0) || height;
  let currentY = y;
  const rowsMarkup = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    let currentX = x;
    for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
      const cell = row.cells[colIndex];
      if (cell.vMerge || cell.hMerge) continue;
      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      const cellWidth = table.columns.slice(colIndex, colIndex + colSpan).reduce((sum, value) => sum + value, 0);
      const cellHeight = rowHeights.slice(rowIndex, rowIndex + rowSpan).reduce((sum, value) => sum + value, 0);
      rowsMarkup.push(renderTableCell(cell, { x: currentX, y: currentY, width: cellWidth, height: cellHeight }, builder, themeColors));
      currentX += cellWidth;
    }
    currentY += rowHeights[rowIndex] ?? defaultRowHeight;
  }
  const outerBorder = table.style?.outerBorder;
  const innerBorderH = table.style?.innerBorderH;
  const innerBorderV = table.style?.innerBorderV;
  const gridLines = [];
  if (innerBorderH) {
    let lineY = y;
    for (let rowIndex = 0; rowIndex < rowHeights.length - 1; rowIndex++) {
      lineY += rowHeights[rowIndex];
      gridLines.push(`<line x1="${formatNumber(x)}" y1="${formatNumber(lineY)}" x2="${formatNumber(x + width)}" y2="${formatNumber(lineY)}" stroke="${escapeXmlAttr(resolveColor(innerBorderH.color, themeColors) ?? "#E2E8F0")}" stroke-width="${formatNumber(innerBorderH.width ?? 1)}"/>`);
    }
  }
  if (innerBorderV) {
    let lineX = x;
    for (let colIndex = 0; colIndex < table.columns.length - 1; colIndex++) {
      lineX += table.columns[colIndex];
      gridLines.push(`<line x1="${formatNumber(lineX)}" y1="${formatNumber(y)}" x2="${formatNumber(lineX)}" y2="${formatNumber(y + totalHeight)}" stroke="${escapeXmlAttr(resolveColor(innerBorderV.color, themeColors) ?? "#E2E8F0")}" stroke-width="${formatNumber(innerBorderV.width ?? 1)}"/>`);
    }
  }
  if (outerBorder) {
    gridLines.push(`<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(totalHeight)}" fill="none" stroke="${escapeXmlAttr(resolveColor(outerBorder.color, themeColors) ?? "#CBD5E1")}" stroke-width="${formatNumber(outerBorder.width ?? 1)}"/>`);
  }
  return `<g>${rowsMarkup.join("")}${gridLines.join("")}</g>`;
}
async function renderShapeOrText(node, builder, themeColors) {
  const bbox = node.layout;
  let fill = resolveColor(node.style?.backgroundColor, themeColors) ?? "transparent";
  if (node.style?.fill) {
    switch (node.style.fill.type) {
      case "solid":
        fill = resolveColor(node.style.fill.color, themeColors) ?? "transparent";
        break;
      case "linear":
        fill = buildLinearGradient(builder, node.style.fill, bbox, themeColors);
        break;
      case "radial":
        fill = buildRadialGradient(builder, node.style.fill, bbox, themeColors);
        break;
      case "pattern":
        fill = buildPatternFill(builder, bbox, node.style.fill.foreground, node.style.fill.background, themeColors);
        break;
      case "image":
        fill = await buildImageFill(builder, bbox, node.style.fill.src);
        break;
    }
  }
  const stroke = node.style?.borderWidth && node.style?.borderColor ? resolveColor(node.style.borderColor, themeColors) ?? "#000000" : void 0;
  const strokeAttrs = stroke ? `stroke="${escapeXmlAttr(stroke)}" stroke-width="${formatNumber(node.style.borderWidth)}"${node.style?.borderStyle === "dashed" ? ` stroke-dasharray="${formatNumber(node.style.borderWidth * 3)} ${formatNumber(node.style.borderWidth * 2)}"` : node.style?.borderStyle === "dotted" ? ` stroke-dasharray="${formatNumber(node.style.borderWidth)} ${formatNumber(node.style.borderWidth * 2)}"` : ""}` : `stroke="none"`;
  const path = buildShapePath(node, bbox.x, bbox.y, bbox.width, bbox.height);
  const shapeMarkup = `<path d="${path.d}" fill="${escapeXmlAttr(fill)}"${path.fillRule ? ` fill-rule="${path.fillRule}"` : ""} ${strokeAttrs}/>`;
  const textMarkup = node.type === "View" ? node.textParagraphs || node.textContent ? renderTextBlock(
    node.textContent,
    node.textParagraphs,
    {
      x: bbox.x + (node.textStyle?.textInsets?.left ?? 0),
      y: bbox.y + (node.textStyle?.textInsets?.top ?? 0),
      width: bbox.width - (node.textStyle?.textInsets?.left ?? 0) - (node.textStyle?.textInsets?.right ?? 0),
      height: bbox.height - (node.textStyle?.textInsets?.top ?? 0) - (node.textStyle?.textInsets?.bottom ?? 0)
    },
    node.textStyle,
    builder,
    themeColors,
    node._autoFitResult?.fontScale ? node._autoFitResult.fontScale / 1e5 : 1
  ) : "" : renderTextBlock(
    node.content,
    node.paragraphs,
    bbox,
    node.style,
    builder,
    themeColors,
    node._autoFitResult?.fontScale ? node._autoFitResult.fontScale / 1e5 : 1
  );
  const childMarkup = node.type === "View" ? await renderChildNodes(node.children, builder, themeColors) : "";
  return applyVisualEffects(node, `${shapeMarkup}${childMarkup}${textMarkup}`, builder, themeColors);
}
async function renderNode(node, builder, themeColors) {
  if (node.style?.display === "none") {
    return "";
  }
  switch (node.type) {
    case "View":
      return renderShapeOrText(node, builder, themeColors);
    case "Text":
      return renderShapeOrText(node, builder, themeColors);
    case "Image":
      return renderImageNode(node, builder);
    case "Table":
      return renderTable(node, builder, themeColors);
    case "Chart":
      return renderChartNode(node, themeColors);
    case "Connector":
      return renderConnectorNode(node, builder, themeColors);
    case "Group": {
      const group = node;
      const children = await renderChildNodes(group.children, builder, themeColors);
      return applyVisualEffects(group, children, builder, themeColors);
    }
    case "Video":
    case "Audio":
      return "";
    default:
      return "";
  }
}
async function renderSlideSvg(slideNode, slideIndex, options) {
  const builder = new SvgDocumentBuilder(slideIndex);
  const slideWidth = slideNode.layout.width;
  const slideHeight = slideNode.layout.height;
  const scale = options?.scale ?? 1;
  const baseWidth = options?.width ?? (options?.height !== void 0 ? Math.round(options.height * (slideWidth / slideHeight)) : slideWidth);
  const baseHeight = options?.height ?? (options?.width !== void 0 ? Math.round(options.width / (slideWidth / slideHeight)) : slideHeight);
  const outputWidth = Math.max(1, Math.round(baseWidth * scale));
  const outputHeight = Math.max(1, Math.round(baseHeight * scale));
  const background = await renderBackground(slideNode, builder, options?.themeColors, options?.background);
  const children = await renderChildNodes(slideNode.children, builder, options?.themeColors);
  const defs = builder.defs.length ? `<defs>${builder.defs.join("")}</defs>` : "";
  return {
    slideIndex,
    width: outputWidth,
    height: outputHeight,
    svg: [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(outputWidth)}" height="${formatNumber(outputHeight)}" viewBox="0 0 ${formatNumber(slideWidth)} ${formatNumber(slideHeight)}" preserveAspectRatio="none" shape-rendering="geometricPrecision">`,
      defs,
      background,
      children,
      `</svg>`
    ].join("")
  };
}
async function renderToSvgSlide(slideNode, slideIndex, options) {
  return renderSlideSvg(slideNode, slideIndex, options);
}
async function renderToSvgSlides(slideNodes, slideIndices, options) {
  const results = [];
  for (let index = 0; index < slideNodes.length; index++) {
    results.push(await renderSlideSvg(slideNodes[index], slideIndices[index] ?? index, options));
  }
  return results;
}
export {
  renderToSvgSlide,
  renderToSvgSlides
};
//# sourceMappingURL=exporter.js.map
