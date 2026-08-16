import { getLogger } from "../logger.js";
import { fetchWithRetry } from "../fetchRetry.js";
import { validateFetchUrl } from "../ooxml/urlGuard.js";
import { FETCH_TIMEOUT_MS, validateDataUrlSize } from "../ooxml/constants.js";
import { renderChartToSvg } from "../ooxml/chart/rasterizer.js";
import { resolveColorValue } from "../renderer/colorResolver.js";
import { normalizeToParagraphsFromFields } from "../ooxml/drawing/textUtils.js";
import type {
  LayoutChart,
  LayoutConnector,
  LayoutGroup,
  LayoutImage,
  LayoutMetrics,
  LayoutNode,
  LayoutSlide,
  LayoutTable,
  LayoutText,
  LayoutView,
} from "../layout/extract.js";
import type {
  ArrowHeadConfig,
  ColorValue,
  FlexStyle,
  GradientFill,
  PaperChart,
  PaperConnector,
  PaperGroup,
  PaperImage,
  PaperNode,
  PaperSlide,
  PaperTable,
  PaperText,
  PaperView,
  Paragraph,
  SlideSvg,
  SvgRenderOptions,
  TableCell,
  TextRun,
  TextStyle,
  ThemeColorScheme,
} from "../types/ast.js";
import { buildShapePath } from "./shapePaths.js";
import { resolveLineHeightPixels } from "../typography/lineHeight.js";

type InternalSvgRenderOptions = SvgRenderOptions & {
  themeColors?: ThemeColorScheme;
};

interface SvgBuilder {
  readonly defs: string[];
  nextId(prefix: string): string;
  addDef(def: string): void;
}

class SvgDocumentBuilder implements SvgBuilder {
  readonly defs: string[] = [];
  private counter = 0;

  constructor(private readonly slideIndex: number) {}

  nextId(prefix: string): string {
    return `s${this.slideIndex}-${prefix}-${this.counter++}`;
  }

  addDef(def: string): void {
    this.defs.push(def);
  }
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replaceAll('"', "&quot;");
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
}

function toPx(points?: number): number | undefined {
  return points === undefined ? undefined : points * (96 / 72);
}

function resolveColor(color: ColorValue | undefined, themeColors?: ThemeColorScheme): string | undefined {
  return resolveColorValue(color, themeColors);
}

function alignToAnchor(align?: "left" | "center" | "right" | "justify"): "start" | "middle" | "end" {
  switch (align) {
    case "center":
      return "middle";
    case "right":
      return "end";
    default:
      return "start";
  }
}

function getFontSize(style?: TextStyle): number {
  return style?.fontSize ?? 14;
}

function getLineHeightPx(style?: TextStyle, paragraph?: Paragraph): number {
  const fontSize = getFontSize(style);
  if (paragraph?.lineHeight !== undefined) {
    return paragraph.lineSpacingMode === "percentage"
      ? fontSize * (paragraph.lineHeight / 100)
      : resolveLineHeightPixels(paragraph.lineHeight, fontSize, fontSize * 1.2, "points");
  }
  return resolveLineHeightPixels(style?.lineHeight, fontSize, fontSize * 1.2);
}

function shapeTransform(node: { layout: LayoutMetrics; style?: FlexStyle }): string {
  const rotation = node.style?.rotation;
  if (!rotation) return "";
  const cx = node.layout.x + node.layout.width / 2;
  const cy = node.layout.y + node.layout.height / 2;
  return `rotate(${formatNumber(rotation)} ${formatNumber(cx)} ${formatNumber(cy)})`;
}

function buildLinearGradient(
  builder: SvgBuilder,
  fill: { angle?: number; stops: { color: ColorValue; position: number; alpha?: number }[] },
  bbox: LayoutMetrics,
  themeColors?: ThemeColorScheme,
): string {
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
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}">${fill.stops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((stop) => `<stop offset="${Math.max(0, Math.min(100, stop.position))}%" stop-color="${escapeXmlAttr(resolveColor(stop.color, themeColors) ?? "#000000")}"${stop.alpha !== undefined ? ` stop-opacity="${Math.max(0, Math.min(1, stop.alpha))}"` : ""}/>`).join("")}</linearGradient>`,
  );
  return `url(#${id})`;
}

function buildRadialGradient(
  builder: SvgBuilder,
  fill: { stops: { color: ColorValue; position: number; alpha?: number }[] },
  bbox: LayoutMetrics,
  themeColors?: ThemeColorScheme,
): string {
  const id = builder.nextId("rg");
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const r = Math.max(bbox.width, bbox.height) / 2;
  builder.addDef(
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(r)}">${fill.stops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((stop) => `<stop offset="${Math.max(0, Math.min(100, stop.position))}%" stop-color="${escapeXmlAttr(resolveColor(stop.color, themeColors) ?? "#000000")}"${stop.alpha !== undefined ? ` stop-opacity="${Math.max(0, Math.min(1, stop.alpha))}"` : ""}/>`).join("")}</radialGradient>`,
  );
  return `url(#${id})`;
}

function buildPatternFill(
  builder: SvgBuilder,
  bbox: LayoutMetrics,
  foreground: ColorValue,
  background: ColorValue,
  themeColors?: ThemeColorScheme,
): string {
  const id = builder.nextId("pat");
  const size = Math.max(8, Math.min(20, Math.round(Math.max(bbox.width, bbox.height) / 18) || 12));
  const fg = resolveColor(foreground, themeColors) ?? "#000000";
  const bg = resolveColor(background, themeColors) ?? "#FFFFFF";
  builder.addDef(
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${escapeXmlAttr(bg)}"/><path d="M 0 ${size} L ${size} 0" stroke="${escapeXmlAttr(fg)}" stroke-opacity="0.18" stroke-width="${Math.max(1, size / 6)}"/></pattern>`,
  );
  return `url(#${id})`;
}

async function buildImageFill(
  builder: SvgBuilder,
  bbox: LayoutMetrics,
  source: string,
): Promise<string> {
  const href = await inlineDataUri(source, source.toLowerCase().includes("svg"));
  if (!href) {
    return "transparent";
  }
  const id = builder.nextId("imgfill");
  builder.addDef(
    `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${formatNumber(bbox.x)}" y="${formatNumber(bbox.y)}" width="${formatNumber(Math.max(1, bbox.width))}" height="${formatNumber(Math.max(1, bbox.height))}"><image href="${escapeXmlAttr(href)}" x="${formatNumber(bbox.x)}" y="${formatNumber(bbox.y)}" width="${formatNumber(Math.max(1, bbox.width))}" height="${formatNumber(Math.max(1, bbox.height))}" preserveAspectRatio="none"/></pattern>`,
  );
  return `url(#${id})`;
}

function buildShadowFilter(
  builder: SvgBuilder,
  bbox: LayoutMetrics,
  color: string,
  blurRadius: number,
  offsetX: number,
  offsetY: number,
  opacity: number,
): string {
  const id = builder.nextId("fx");
  const pad = Math.max(blurRadius * 2, 12);
  builder.addDef(
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${formatNumber(bbox.x - pad - Math.abs(offsetX))}" y="${formatNumber(bbox.y - pad - Math.abs(offsetY))}" width="${formatNumber(bbox.width + pad * 2 + Math.abs(offsetX) * 2)}" height="${formatNumber(bbox.height + pad * 2 + Math.abs(offsetY) * 2)}"><feDropShadow dx="${formatNumber(offsetX)}" dy="${formatNumber(offsetY)}" stdDeviation="${formatNumber(Math.max(0.1, blurRadius / 2))}" flood-color="${escapeXmlAttr(color)}" flood-opacity="${Math.max(0, Math.min(1, opacity))}"/></filter>`,
  );
  return `url(#${id})`;
}

function buildInnerShadowFilter(
  builder: SvgBuilder,
  bbox: LayoutMetrics,
  color: string,
  blurRadius: number,
  offsetX: number,
  offsetY: number,
  opacity: number,
): string {
  const id = builder.nextId("is");
  const pad = Math.max(blurRadius * 2, 12);
  builder.addDef(
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${formatNumber(bbox.x - pad - Math.abs(offsetX))}" y="${formatNumber(bbox.y - pad - Math.abs(offsetY))}" width="${formatNumber(bbox.width + pad * 2 + Math.abs(offsetX) * 2)}" height="${formatNumber(bbox.height + pad * 2 + Math.abs(offsetY) * 2)}"><feFlood flood-color="${escapeXmlAttr(color)}" flood-opacity="${Math.max(0, Math.min(1, opacity))}" result="shadowColor"/><feComposite in="shadowColor" in2="SourceAlpha" operator="in" result="shadowAlpha"/><feGaussianBlur in="shadowAlpha" stdDeviation="${formatNumber(Math.max(0.1, blurRadius / 2))}" result="shadowBlur"/><feOffset in="shadowBlur" dx="${formatNumber(offsetX)}" dy="${formatNumber(offsetY)}" result="shadowOffset"/><feComposite in="shadowOffset" in2="SourceAlpha" operator="out" result="innerShadow"/><feComposite in="SourceGraphic" in2="innerShadow" operator="over"/></filter>`,
  );
  return `url(#${id})`;
}

function buildReflectionMask(
  builder: SvgBuilder,
  bbox: LayoutMetrics,
  startOpacity: number,
  endOpacity: number,
): string {
  const id = builder.nextId("rm");
  const gradientId = builder.nextId("rg");
  const top = bbox.y + bbox.height;
  const bottom = bbox.y + bbox.height * 2;
  builder.addDef(
    `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${formatNumber(bbox.x)}" y1="${formatNumber(top)}" x2="${formatNumber(bbox.x)}" y2="${formatNumber(bottom)}"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="${Math.max(0, Math.min(1, startOpacity))}"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="${Math.max(0, Math.min(1, endOpacity))}"/></linearGradient>`,
  );
  builder.addDef(
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${formatNumber(bbox.x)}" y="${formatNumber(top)}" width="${formatNumber(bbox.width)}" height="${formatNumber(bbox.height)}"><rect x="${formatNumber(bbox.x)}" y="${formatNumber(top)}" width="${formatNumber(bbox.width)}" height="${formatNumber(bbox.height)}" fill="url(#${gradientId})"/></mask>`,
  );
  return `url(#${id})`;
}

function buildArrowMarker(
  builder: SvgBuilder,
  color: string,
  width: number,
  length: number,
): string {
  const id = builder.nextId("mk");
  builder.addDef(
    `<marker id="${id}" markerUnits="strokeWidth" markerWidth="${formatNumber(Math.max(4, length))}" markerHeight="${formatNumber(Math.max(4, width))}" refX="${formatNumber(Math.max(4, length))}" refY="${formatNumber(Math.max(4, width) / 2)}" orient="auto"><path d="M 0 0 L ${formatNumber(Math.max(4, length))} ${formatNumber(Math.max(4, width) / 2)} L 0 ${formatNumber(Math.max(4, width))} Z" fill="${escapeXmlAttr(color)}"/></marker>`,
  );
  return `url(#${id})`;
}

async function renderChildNodes(
  children: LayoutNode[] | undefined,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): Promise<string> {
  if (!children?.length) return "";
  let markup = "";
  for (const child of children) {
    markup += await renderNode(child, builder, themeColors);
  }
  return markup;
}

async function inlineDataUri(source: string | undefined, preferSvg = false): Promise<string | undefined> {
  if (!source) return undefined;

  if (source.startsWith("data:")) {
    const commaIdx = source.indexOf(",");
    if (commaIdx === -1) return source;
    if (source.slice(0, commaIdx).toLowerCase().includes(";base64")) {
      try {
        validateDataUrlSize(source.slice(commaIdx + 1));
      } catch (err) {
        getLogger().warn(`[svg] Rejected oversized data URI: ${(err as Error).message}`);
        return undefined;
      }
    }
    return source;
  }

  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    return undefined;
  }

  try {
    validateFetchUrl(source);
    const response = await fetchWithRetry(source, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (preferSvg || contentType?.includes("svg")) {
      return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
    }
    return `data:${contentType ?? "image/png"};base64,${buffer.toString("base64")}`;
  } catch (err) {
    getLogger().warn(`[svg] Failed to inline image ${source}: ${(err as Error).message}`);
    return undefined;
  }
}

function buildRunMarkup(run: TextRun, builder: SvgBuilder, themeColors?: ThemeColorScheme): string {
  const attrs: string[] = [];
  if (run.style?.fontFamily) attrs.push(`font-family="${escapeXmlAttr(run.style.fontFamily)}"`);
  if (run.style?.fontSize !== undefined) attrs.push(`font-size="${formatNumber(run.style.fontSize)}"`);
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
    const fill = run.style.gradientFill.type === "linear"
      ? buildLinearGradient(builder, run.style.gradientFill, dummy, themeColors)
      : buildRadialGradient(builder, run.style.gradientFill, dummy, themeColors);
    attrs.push(`fill="${fill}"`);
  }
  return `<tspan${attrs.length ? ` ${attrs.join(" ")}` : ""}>${escapeXmlText(run.text)}</tspan>`;
}

function renderParagraphs(
  paragraphs: Paragraph[],
  box: LayoutMetrics,
  style?: TextStyle,
  builder?: SvgBuilder,
  themeColors?: ThemeColorScheme,
): string {
  const fontSize = getFontSize(style);
  const insets = style?.textInsets;
  const xBase = box.x + (insets?.left ?? 0);
  const yBase = box.y + (insets?.top ?? 0);
  const usableHeight = Math.max(0, box.height - (insets?.top ?? 0) - (insets?.bottom ?? 0));
  const metrics = paragraphs.map((paragraph) => {
    const before = (toPx(paragraph.spaceBefore) ?? 0) + (paragraph.spaceBeforePercent !== undefined ? fontSize * (paragraph.spaceBeforePercent / 100) : 0);
    const after = (toPx(paragraph.spaceAfter) ?? 0) + (paragraph.spaceAfterPercent !== undefined ? fontSize * (paragraph.spaceAfterPercent / 100) : 0);
    const lineHeight = getLineHeightPx(style, paragraph);
    return { paragraph, before, after, lineHeight, total: before + after + lineHeight };
  });
  const blockHeight = metrics.reduce((sum, item) => sum + item.total, 0);
  const verticalAlign = style?.verticalAlign ?? "top";
  const offsetY = verticalAlign === "middle"
    ? Math.max(0, (usableHeight - blockHeight) / 2)
    : verticalAlign === "bottom"
      ? Math.max(0, usableHeight - blockHeight)
      : 0;

  let currentY = yBase + offsetY;
  const result: string[] = [];

  for (const item of metrics) {
    currentY += item.before;
    const paragraph = item.paragraph;
    const runs = paragraph.runs ?? [];
    const textAnchor = alignToAnchor(paragraph.align ?? style?.textAlign);
    const x = xBase + (paragraph.marginLeft ?? 0) + (paragraph.indent ?? 0);
    const y = currentY + fontSize;
    const lineAttrs: string[] = [
      `x="${formatNumber(x)}"`,
      `y="${formatNumber(y)}"`,
      `text-anchor="${textAnchor}"`,
      `xml:space="preserve"`,
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

function renderTextBlock(
  text: string | TextRun[] | undefined,
  paragraphs: Paragraph[] | undefined,
  box: LayoutMetrics,
  style?: TextStyle,
  builder?: SvgBuilder,
  themeColors?: ThemeColorScheme,
  autoFitScale = 1,
): string {
  const effectiveStyle: TextStyle = autoFitScale === 1 || !style
    ? (style ?? {})
    : { ...style, fontSize: Math.max(1, (style.fontSize ?? 14) * autoFitScale) };
  const normalized = normalizeToParagraphsFromFields(text, paragraphs);
  const attrs: string[] = [];
  const color = resolveColor(effectiveStyle.color, themeColors);
  if (color) attrs.push(`fill="${escapeXmlAttr(color)}"`);
  if (effectiveStyle.fontFamily) attrs.push(`font-family="${escapeXmlAttr(effectiveStyle.fontFamily)}"`);
  if (effectiveStyle.fontSize !== undefined) attrs.push(`font-size="${formatNumber(effectiveStyle.fontSize)}"`);
  if (effectiveStyle.fontWeight) attrs.push(`font-weight="${escapeXmlAttr(effectiveStyle.fontWeight)}"`);
  if (effectiveStyle.fontStyle) attrs.push(`font-style="${escapeXmlAttr(effectiveStyle.fontStyle)}"`);
  return `<g${attrs.length ? ` ${attrs.join(" ")}` : ""}>${renderParagraphs(normalized, box, effectiveStyle, builder, themeColors)}</g>`;
}

async function renderBackground(
  slide: LayoutNode,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
  backgroundOverride?: string,
): Promise<string> {
  const slideNode = slide as PaperSlide;
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

function applyVisualEffects(
  node: { layout: LayoutMetrics; style?: FlexStyle },
  content: string,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): string {
  const transform = shapeTransform(node);
  const opacity = node.style?.opacity;
  const effects = node.style?.effects;

  let filter: string | undefined;
  if (effects?.dropShadow) {
    filter = buildShadowFilter(
      builder,
      node.layout,
      resolveColor(effects.dropShadow.color, themeColors) ?? "rgba(0,0,0,0.3)",
      effects.dropShadow.blurRadius,
      effects.dropShadow.offsetX,
      effects.dropShadow.offsetY,
      effects.dropShadow.opacity ?? 1,
    );
  } else if (effects?.glow) {
    filter = buildShadowFilter(
      builder,
      node.layout,
      resolveColor(effects.glow.color, themeColors) ?? "rgba(255,255,255,0.65)",
      effects.glow.radius,
      0,
      0,
      effects.glow.opacity ?? 1,
    );
  } else if (effects?.innerShadow) {
    filter = buildInnerShadowFilter(
      builder,
      node.layout,
      resolveColor(effects.innerShadow.color, themeColors) ?? "rgba(0,0,0,0.3)",
      effects.innerShadow.blurRadius,
      effects.innerShadow.offsetX,
      effects.innerShadow.offsetY,
      effects.innerShadow.opacity ?? 1,
    );
  }

  const mainGroup = `<g${[
    transform ? `transform="${transform}"` : "",
    opacity !== undefined ? `opacity="${formatNumber(opacity)}"` : "",
    filter ? `filter="${filter}"` : "",
  ].filter(Boolean).length ? ` ${[transform ? `transform="${transform}"` : "", opacity !== undefined ? `opacity="${formatNumber(opacity)}"` : "", filter ? `filter="${filter}"` : ""].filter(Boolean).join(" ")}` : ""}>${content}</g>`;

  const reflection = effects?.reflection;
  if (!reflection) return mainGroup;

  const maskId = buildReflectionMask(builder, node.layout, reflection.startOpacity ?? 0.5, reflection.endOpacity ?? 0);
  const reflectionTransform = [
    transform,
    `translate(0 ${formatNumber((node.layout.height * 2) + (reflection.distance ?? 0))})`,
    "scale(1 -1)",
  ].filter(Boolean).join(" ");
  const reflected = `<g transform="${reflectionTransform}" opacity="${formatNumber(opacity ?? 1)}" mask="url(#${maskId})">${content}</g>`;
  return `${mainGroup}${reflected}`;
}

async function renderImageNode(
  node: LayoutImage,
  builder: SvgBuilder,
): Promise<string> {
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

function renderConnectorNode(
  node: LayoutConnector,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): string {
  const color = resolveColor(node.lineColor, themeColors) ?? "#1F2937";
  const strokeWidth = node.lineWidth ?? 1.5;
  const dasharray = node.lineDashStyle === "dashed"
    ? `${strokeWidth * 3} ${strokeWidth * 2}`
    : node.lineDashStyle === "dotted"
      ? `${strokeWidth} ${strokeWidth * 2}`
      : node.lineDashStyle === "dotDash"
        ? `${strokeWidth} ${strokeWidth * 2} ${strokeWidth * 3} ${strokeWidth * 2}`
        : "";

  const arrowStart: ArrowHeadConfig | undefined = typeof node.arrowStart === "object"
    ? node.arrowStart
    : node.arrowStart
      ? { type: "triangle", width: "med", length: "med" }
      : undefined;
  const arrowEnd: ArrowHeadConfig | undefined = typeof node.arrowEnd === "object"
    ? node.arrowEnd
    : node.arrowEnd
      ? { type: "triangle", width: "med", length: "med" }
      : undefined;
  const markerStart = arrowStart ? buildArrowMarker(builder, color, arrowStart.width === "lg" ? 8 : arrowStart.width === "med" ? 6 : 4, arrowStart.length === "lg" ? 12 : arrowStart.length === "med" ? 9 : 6) : undefined;
  const markerEnd = arrowEnd ? buildArrowMarker(builder, color, arrowEnd.width === "lg" ? 8 : arrowEnd.width === "med" ? 6 : 4, arrowEnd.length === "lg" ? 12 : arrowEnd.length === "med" ? 9 : 6) : undefined;

  const { x: startX, y: startY } = node.start;
  const { x: endX, y: endY } = node.end;
  const d = node.connectorType === "elbow"
    ? `M ${formatNumber(startX)} ${formatNumber(startY)} L ${formatNumber((startX + endX) / 2)} ${formatNumber(startY)} L ${formatNumber((startX + endX) / 2)} ${formatNumber(endY)} L ${formatNumber(endX)} ${formatNumber(endY)}`
    : node.connectorType === "curved"
      ? `M ${formatNumber(startX)} ${formatNumber(startY)} Q ${formatNumber((startX + endX) / 2)} ${formatNumber(startY - Math.abs(endY - startY) * 0.25)} ${formatNumber(endX)} ${formatNumber(endY)}`
      : `M ${formatNumber(startX)} ${formatNumber(startY)} L ${formatNumber(endX)} ${formatNumber(endY)}`;

  const attrs = [
    `d="${d}"`,
    `fill="none"`,
    `stroke="${escapeXmlAttr(color)}"`,
    `stroke-width="${formatNumber(strokeWidth)}"`,
  ];
  if (dasharray) attrs.push(`stroke-dasharray="${dasharray}"`);
  if (markerStart) attrs.push(`marker-start="${markerStart}"`);
  if (markerEnd) attrs.push(`marker-end="${markerEnd}"`);
  return `<path ${attrs.join(" ")} />`;
}

async function renderChartNode(
  node: LayoutChart,
  themeColors?: ThemeColorScheme,
): Promise<string> {
  const { x, y, width, height } = node.layout;
  const chartType = node.chartData.chartType;
  const title = node.chartData.title?.text ?? chartType;
  const rendered = await renderChartToSvg(
    node.chartData,
    { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) },
    themeColors,
  );
  if (!rendered) {
    return `<g class="runstamp-chart-hook" data-chart-type="${escapeXmlAttr(chartType)}" data-chart-title="${escapeXmlAttr(title)}"><rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#F8FAFC" stroke="#94A3B8" stroke-dasharray="6 4" rx="6" ry="6"/><text x="${formatNumber(x + width / 2)}" y="${formatNumber(y + height / 2)}" text-anchor="middle" dominant-baseline="middle" fill="#64748B" font-family="monospace" font-size="12">Chart</text></g>`;
  }

  const embeddedSvg = rendered.svg
    .replace(/^\s*<\?xml[^>]*>\s*/i, "")
    .replace(
      /<svg\b([^>]*)>/i,
      `<svg$1 x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(width)}" height="${formatNumber(height)}" preserveAspectRatio="none">`,
    );
  return `<g class="runstamp-chart" data-chart-renderer="${rendered.renderer}" data-chart-type="${escapeXmlAttr(chartType)}" data-chart-title="${escapeXmlAttr(title)}">${embeddedSvg}</g>`;
}

function renderTableCell(
  cell: TableCell,
  box: LayoutMetrics,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): string {
  const fillStyle = cell.style?.fill;
  let fill = "#FFFFFF";
  if (fillStyle && typeof fillStyle === "object" && "type" in fillStyle) {
    fill = fillStyle.type === "linear"
      ? buildLinearGradient(builder, fillStyle as GradientFill, box, themeColors)
      : buildRadialGradient(builder, fillStyle as GradientFill, box, themeColors);
  } else if (fillStyle) {
    fill = resolveColor(fillStyle as ColorValue, themeColors) ?? "#FFFFFF";
  }
  const padding = cell.style?.padding ?? 4;
  const textBox: LayoutMetrics = {
    x: box.x + padding,
    y: box.y + padding,
    width: Math.max(0, box.width - padding * 2),
    height: Math.max(0, box.height - padding * 2),
  };
  const textStyle: TextStyle = {
    fontFamily: cell.style?.fontFamily,
    fontSize: cell.style?.fontSize,
    fontWeight: cell.style?.fontWeight,
    fontStyle: cell.style?.fontStyle,
    color: cell.style?.color,
    textAlign: cell.style?.textAlign,
    verticalAlign: cell.style?.verticalAlign,
  };
  const textMarkup = renderTextBlock(cell.content ?? cell.text, cell.paragraphs, textBox, textStyle, builder, themeColors);
  return `<g><rect x="${formatNumber(box.x)}" y="${formatNumber(box.y)}" width="${formatNumber(box.width)}" height="${formatNumber(box.height)}" fill="${escapeXmlAttr(fill)}"/>${textMarkup}</g>`;
}

function renderTable(
  node: LayoutTable,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): string {
  const { x, y, width, height } = node.layout;
  const table = node.tableData;
  const rowCount = table.rows.length || 1;
  const defaultRowHeight = height / rowCount;
  const rowHeights = table.rows.map((row) => row.height ?? row.minHeight ?? defaultRowHeight);
  const totalHeight = rowHeights.reduce((sum, value) => sum + value, 0) || height;
  let currentY = y;
  const rowsMarkup: string[] = [];

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
  const gridLines: string[] = [];

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

async function renderShapeOrText(
  node: LayoutView | LayoutText,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): Promise<string> {
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

  const stroke = node.style?.borderWidth && node.style?.borderColor
    ? resolveColor(node.style.borderColor, themeColors) ?? "#000000"
    : undefined;
  const strokeAttrs = stroke
    ? `stroke="${escapeXmlAttr(stroke)}" stroke-width="${formatNumber(node.style!.borderWidth!)}"${node.style?.borderStyle === "dashed" ? ` stroke-dasharray="${formatNumber(node.style!.borderWidth! * 3)} ${formatNumber(node.style!.borderWidth! * 2)}"` : node.style?.borderStyle === "dotted" ? ` stroke-dasharray="${formatNumber(node.style!.borderWidth!)} ${formatNumber(node.style!.borderWidth! * 2)}"` : ""}`
    : `stroke="none"`;

  const path = buildShapePath(node as any, bbox.x, bbox.y, bbox.width, bbox.height);
  const shapeMarkup = `<path d="${path.d}" fill="${escapeXmlAttr(fill)}"${path.fillRule ? ` fill-rule="${path.fillRule}"` : ""} ${strokeAttrs}/>`;

  const textMarkup = node.type === "View"
    ? ((node.textParagraphs || node.textContent)
      ? renderTextBlock(
          node.textContent,
          node.textParagraphs,
          {
            x: bbox.x + (node.textStyle?.textInsets?.left ?? 0),
            y: bbox.y + (node.textStyle?.textInsets?.top ?? 0),
            width: bbox.width - (node.textStyle?.textInsets?.left ?? 0) - (node.textStyle?.textInsets?.right ?? 0),
            height: bbox.height - (node.textStyle?.textInsets?.top ?? 0) - (node.textStyle?.textInsets?.bottom ?? 0),
          },
          node.textStyle,
          builder,
          themeColors,
          (node as any)._autoFitResult?.fontScale ? (node as any)._autoFitResult.fontScale / 100000 : 1,
        )
      : "")
    : renderTextBlock(
        node.content,
        node.paragraphs,
        bbox,
        node.style,
        builder,
        themeColors,
        (node as any)._autoFitResult?.fontScale ? (node as any)._autoFitResult.fontScale / 100000 : 1,
  );
  const childMarkup = node.type === "View" ? await renderChildNodes(node.children, builder, themeColors) : "";
  return applyVisualEffects(node as any, `${shapeMarkup}${childMarkup}${textMarkup}`, builder, themeColors);
}

async function renderNode(
  node: LayoutNode,
  builder: SvgBuilder,
  themeColors?: ThemeColorScheme,
): Promise<string> {
  if ((node.style as FlexStyle | undefined)?.display === "none") {
    return "";
  }

  switch (node.type) {
    case "View":
      return renderShapeOrText(node as LayoutView, builder, themeColors);
    case "Text":
      return renderShapeOrText(node as LayoutText, builder, themeColors);
    case "Image":
      return renderImageNode(node as LayoutImage, builder);
    case "Table":
      return renderTable(node as LayoutTable, builder, themeColors);
    case "Chart":
      return renderChartNode(node as LayoutChart, themeColors);
    case "Connector":
      return renderConnectorNode(node as LayoutConnector, builder, themeColors);
    case "Group": {
      const group = node as LayoutGroup;
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

async function renderSlideSvg(
  slideNode: LayoutSlide,
  slideIndex: number,
  options?: InternalSvgRenderOptions,
): Promise<SlideSvg> {
  const builder = new SvgDocumentBuilder(slideIndex);
  const slideWidth = slideNode.layout.width;
  const slideHeight = slideNode.layout.height;
  const scale = options?.scale ?? 1;
  const baseWidth = options?.width ?? (options?.height !== undefined ? Math.round(options.height * (slideWidth / slideHeight)) : slideWidth);
  const baseHeight = options?.height ?? (options?.width !== undefined ? Math.round(options.width / (slideWidth / slideHeight)) : slideHeight);
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
      `</svg>`,
    ].join(""),
  };
}

export async function renderToSvgSlide(
  slideNode: LayoutSlide,
  slideIndex: number,
  options?: SvgRenderOptions & { themeColors?: ThemeColorScheme },
): Promise<SlideSvg> {
  return renderSlideSvg(slideNode, slideIndex, options as InternalSvgRenderOptions | undefined);
}

export async function renderToSvgSlides(
  slideNodes: LayoutSlide[],
  slideIndices: number[],
  options?: SvgRenderOptions & { themeColors?: ThemeColorScheme },
): Promise<SlideSvg[]> {
  const results: SlideSvg[] = [];
  for (let index = 0; index < slideNodes.length; index++) {
    results.push(await renderSlideSvg(slideNodes[index], slideIndices[index] ?? index, options as InternalSvgRenderOptions | undefined));
  }
  return results;
}
