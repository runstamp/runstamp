import initYoga, {
  MEASURE_MODE_AT_MOST,
  MEASURE_MODE_EXACTLY,
  type MeasureMode,
  type Node as YogaNode,
} from "yoga-wasm-web";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname as pathDirname, join as pathJoin } from "node:path";

declare const __RUNSTAMP_YOGA_WASM_BASE64__: string | undefined;

// yoga-wasm-web/auto resolves ./yoga.wasm relative to import.meta.url, which
// breaks on serverless hosts that build under one root and run under another
// (Vercel builds at /vercel/path0, runs at /var/task). Load the wasm through
// a candidate chain ending with a cwd walk immune to that translation.
function yogaWasmCandidates(): string[] {
  const out: string[] = [];
  try {
    out.push(fileURLToPath(new URL("./yoga.wasm", import.meta.url)));
  } catch {
    /* non-file URL — fall through */
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    for (const rel of [
      "packages/json-to-pdf/dist/yoga.wasm",
      "packages/json-to-pdf/dist-pro/yoga.wasm",
      "node_modules/yoga-wasm-web/dist/yoga.wasm",
    ]) {
      out.push(pathJoin(dir, rel));
    }
    const parent = pathDirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

async function loadYogaInstance() {
  if (typeof __RUNSTAMP_YOGA_WASM_BASE64__ === "string" && __RUNSTAMP_YOGA_WASM_BASE64__.length > 0) {
    return initYoga(Buffer.from(__RUNSTAMP_YOGA_WASM_BASE64__, "base64"));
  }
  const tried: string[] = [];
  for (const candidate of yogaWasmCandidates()) {
    tried.push(candidate);
    if (!existsSync(candidate)) continue;
    return initYoga(await readFile(candidate));
  }
  throw new Error(`yoga.wasm not found; tried:\n${tried.join("\n")}`);
}

const yoga = await loadYogaInstance();
import { prepareEmbeddedFonts, shapeEmbeddedText, type PdfEmbeddedFontInput, type PdfFontInput, type PreparedEmbeddedFont } from "./font-embedding.js";
import { measureHelveticaText } from "./helvetica-widths.js";
import { renderPdfPages, type PdfRenderableText, type PdfRenderedPage } from "./pdf-renderer.js";
import { breakTextIntoLines, type PdfBrokenLine, type PdfLineToken } from "./phase3-linebreak.js";
import { PDF_MAX_CONTAINER_DEPTH, PDF_UNBREAKABLE_TOKEN_LENGTH } from "./edge-policy.js";
import { PdfError } from "./errors.js";
import type { PdfGraphic } from "./phase4-types.js";
import type {
  PdfPhase3DividerNode,
  PdfDocumentPhase3,
  PdfDocumentLayoutNode,
  PdfPhase3ContainerNode,
  PdfPhase3HeadingNode,
  PdfPhase3Link,
  PdfPhase3Margins,
  PdfPhase3Node,
  PdfPhase3ParagraphNode,
  PdfPhase3PreformattedNode,
  PdfPhase3Style,
  PdfPhase3TextBase,
  PdfPhase3WidowOrphan,
} from "./phase3-types.js";

export interface PreparedPhase3Fonts {
  embedded: Map<string, PreparedEmbeddedFont>;
  measureCache: Map<string, number>;
}

export interface NormalizedPhase3Document {
  children: PdfPhase3Node[];
  meta: NonNullable<PdfDocumentPhase3["meta"]>;
  page: {
    height: number;
    margins: PdfPhase3Margins;
    width: number;
  };
}

interface TextLineLayout {
  ascent: number;
  direction: "auto" | "ltr" | "rtl";
  font: PdfFontInput;
  fontSize: number;
  height: number;
  lineHeight: number;
  spaceCount: number;
  text: string;
  textAlign: "center" | "justify" | "left" | "right";
  width: number;
  wordSpacing: number;
  x: number;
}

export interface TextBlockLayout {
  boxHeight: number;
  boxWidth: number;
  height: number;
  lines: TextLineLayout[];
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
}

export interface ContainerLayout {
  anchors: Array<{
    height: number;
    id: string;
    left: number;
    top: number;
    width: number;
  }>;
  boxHeight: number;
  height: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  texts: Array<Omit<PdfRenderableText, "x" | "y"> & {
    ascent: number;
    id?: string;
    kind: "heading" | "paragraph" | "preformatted";
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    link?: PdfPhase3Link;
    top: number;
    x: number;
  }>;
  graphics: Array<{
    bottom: number;
    graphic: PdfGraphic;
    top: number;
  }>;
  width: number;
}

export interface Phase3LinePlacement {
  blockId?: string;
  kind: "heading" | "paragraph" | "preformatted";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  link?: PdfPhase3Link;
  pageIndex: number;
  rect: [number, number, number, number];
  text: string;
}

export interface Phase3AnchorPlacement {
  id: string;
  kind: "container" | "heading" | "paragraph";
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  pageIndex: number;
  rect: [number, number, number, number];
  title?: string;
}

interface PreparedTextNode {
  align: "center" | "justify" | "left" | "right";
  ascent: number;
  direction: "auto" | "ltr" | "rtl";
  font: PdfFontInput;
  fontSize: number;
  lineHeight: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  node: PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  tokens: PdfLineToken[];
  preserveWhitespace: boolean;
}

interface BuiltYogaTree {
  children: BuiltYogaTree[];
  preparedText?: PreparedTextNode;
  root: YogaNode;
  source: PdfPhase3Node;
}

const DEFAULT_FONT = "Helvetica";
const DEFAULT_FONT_SIZE = 12;
const DEFAULT_HEADING_LEVEL_5_FONT_SIZE = 10;
const DEFAULT_HEADING_LEVEL_6_FONT_SIZE = 9;
const DEFAULT_LINE_HEIGHT = 1.2;
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const A4_WIDTH = 595.276;
const A4_HEIGHT = 841.89;
const HUGE_HEIGHT = 100_000;
export const MAX_CONTAINER_DEPTH = PDF_MAX_CONTAINER_DEPTH;
export const DEFAULT_DIVIDER_COLOR = { space: "rgb" as const, r: 0.72, g: 0.72, b: 0.72 };
const DEFAULT_DIVIDER_THICKNESS = 1;
const DEFAULT_DIVIDER_SPACING = 12;

function isEmbeddedFont(font: PdfFontInput | undefined): font is PdfEmbeddedFontInput {
  return typeof font === "object" && font !== null;
}

export function isTextNode(node: PdfPhase3Node): node is PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode {
  return node.type === "heading" || node.type === "paragraph" || node.type === "preformatted";
}

function getNodeText(node: PdfPhase3TextBase, label: string): string {
  const candidates = [node.value, node.text].filter((value): value is string => typeof value === "string");
  if (candidates.length === 0) {
    throw new TypeError(`${label} must provide text or value`);
  }

  const resolved = candidates[0] as string;
  if (resolved.trim().length === 0) {
    return "";
  }

  return resolved;
}

function resolveFontSize(node: PdfPhase3TextBase): number {
  if (node.fontSize !== undefined) {
    return node.fontSize;
  }
  if ("type" in node && node.type === "heading") {
    const heading = node as PdfPhase3HeadingNode;
    if (heading.level === 5) {
      return DEFAULT_HEADING_LEVEL_5_FONT_SIZE;
    }
    if (heading.level === 6) {
      return DEFAULT_HEADING_LEVEL_6_FONT_SIZE;
    }
  }
  return DEFAULT_FONT_SIZE;
}

function getDocumentChildren(document: PdfDocumentPhase3): PdfPhase3Node[] {
  const hasChildren = Array.isArray(document.children);
  const hasContent = Array.isArray(document.content);

  if (hasChildren && hasContent) {
    throw new TypeError('Phase 3 documents must use either "children" or "content", not both');
  }

  const nodes = hasChildren ? document.children : document.content;
  if (!nodes || nodes.length === 0) {
    throw new TypeError("Phase 3 documents must provide a non-empty children array");
  }

  const assertNoTables = (entries: PdfDocumentPhase3["children"]): void => {
    entries?.forEach((entry) => {
      if (entry.type === "table") {
        throw new TypeError("Phase 3 documents do not support table nodes");
      }
      if (entry.type === "container") {
        assertNoTables(entry.children);
      }
    });
  };

  assertNoTables(nodes);
  assertContainerDepth(nodes, 1);
  return nodes as PdfPhase3Node[];
}

function assertContainerDepth(nodes: PdfDocumentLayoutNode[], depth: number): void {
  if (depth > MAX_CONTAINER_DEPTH) {
    throw new PdfError(
      "LAYOUT_RECURSION_LIMIT",
      `Container nesting exceeds maximum depth of ${MAX_CONTAINER_DEPTH}.`,
      { cap: MAX_CONTAINER_DEPTH, depth, path: "children" },
    );
  }

  nodes.forEach((node) => {
    if (node.type === "container") {
      assertContainerDepth(node.children, depth + 1);
    }
  });
}

function normalizeMargins(margin?: number | Partial<PdfPhase3Margins>): PdfPhase3Margins {
  if (typeof margin === "number") {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }

  return {
    top: margin?.top ?? 72,
    right: margin?.right ?? 72,
    bottom: margin?.bottom ?? 72,
    left: margin?.left ?? 72,
  };
}

function normalizePageSize(size?: PdfDocumentPhase3["page"] extends infer T ? T extends { size?: infer U } ? U : never : never): { height: number; width: number } {
  if (!size || size === "Letter" || size === "letter") {
    return { width: LETTER_WIDTH, height: LETTER_HEIGHT };
  }
  if (size === "A4" || size === "a4") {
    return { width: A4_WIDTH, height: A4_HEIGHT };
  }
  return { width: size.width, height: size.height };
}

export function normalizePhase3Document(document: PdfDocumentPhase3): NormalizedPhase3Document {
  if (!document || typeof document !== "object") {
    throw new TypeError("PdfEngine.render requires a PDF document object");
  }

  const children = getDocumentChildren(document);
  const size = normalizePageSize(document.page?.size);
  const margins = normalizeMargins(document.page?.margin);

  return {
    children,
    meta: {
      author: document.meta?.author,
      creationDate: document.meta?.creationDate,
      creator: document.meta?.creator,
      keywords: document.meta?.keywords,
      modDate: document.meta?.modDate,
      producer: document.meta?.producer,
      subject: document.meta?.subject,
      title: document.meta?.title,
    },
    page: {
      width: size.width,
      height: size.height,
      margins,
    },
  };
}

function getStyleSpacing(style: PdfPhase3Style | undefined, key: "margin" | "padding", edge: "Top" | "Right" | "Bottom" | "Left"): number {
  const direct = style?.[`${key}${edge}` as keyof PdfPhase3Style];
  if (typeof direct === "number") {
    return direct;
  }
  return typeof style?.[key] === "number" ? style[key] as number : 0;
}

function resolveNumericDimension(value: number | string | undefined, availableSpace: number): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.endsWith("%")) {
    const percent = Number.parseFloat(value.slice(0, -1));
    if (Number.isFinite(percent)) {
      return (availableSpace * percent) / 100;
    }
  }
  return undefined;
}

export async function preparePhase3Fonts(document: PdfDocumentPhase3): Promise<PreparedPhase3Fonts> {
  const fontGroups = new Map<string, { alias: string; font: PdfEmbeddedFontInput; samples: string[] }>();
  let counter = 2;

  const visit = (node: PdfPhase3Node): void => {
    if (node.type === "container") {
      node.children.forEach((child) => {
        if (child.type === "table") {
          throw new TypeError("Phase 3 documents do not support table nodes");
        }
        visit(child);
      });
      return;
    }
    if (node.type === "divider" || node.type === "page-break") {
      return;
    }
    const font = node.font ?? DEFAULT_FONT;
    if (!isEmbeddedFont(font)) {
      return;
    }
    const key = `${font.family}::${typeof font.source === "string" ? font.source : "buffer"}::${font.postscriptName ?? ""}`;
    const text = getNodeText(node, `${node.type}.value`);
    const existing = fontGroups.get(key);
    if (existing) {
      existing.samples.push(text);
      return;
    }
    fontGroups.set(key, {
      alias: `F${counter}`,
      font,
      samples: [text],
    });
    counter += 1;
  };

  getDocumentChildren(document).forEach(visit);

  return {
    embedded: await prepareEmbeddedFonts([...fontGroups.values()]),
    measureCache: new Map<string, number>(),
  };
}

function getPreparedFont(fonts: PreparedPhase3Fonts, font: PdfFontInput | undefined): PreparedEmbeddedFont | undefined {
  if (!isEmbeddedFont(font)) {
    return undefined;
  }
  for (const prepared of fonts.embedded.values()) {
    if (prepared.family === font.family && prepared.postscriptName === (font.postscriptName ?? prepared.postscriptName)) {
      return prepared;
    }
  }
  return undefined;
}

async function measureTextWidth(
  fonts: PreparedPhase3Fonts,
  font: PdfFontInput | undefined,
  text: string,
  fontSize: number,
  direction: "auto" | "ltr" | "rtl" = "auto",
): Promise<number> {
  const resolvedFont = font ?? DEFAULT_FONT;
  const cacheKey = `${typeof resolvedFont === "string" ? resolvedFont : `${resolvedFont.family}:${resolvedFont.postscriptName ?? ""}`}:${fontSize}:${direction}:${text}`;
  const cached = fonts.measureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let width: number;
  const prepared = getPreparedFont(fonts, resolvedFont);
  if (prepared) {
    const shaped = await shapeEmbeddedText(prepared, text, fontSize, 0, 0, direction);
    width = shaped.totalAdvancePoints;
  } else {
    width = measureHelveticaText(text, fontSize);
  }

  fonts.measureCache.set(cacheKey, width);
  return width;
}

function resolveLineHeight(node: PdfPhase3TextBase): number {
  const fontSize = resolveFontSize(node);
  if (node.lineHeight == null) {
    return fontSize * DEFAULT_LINE_HEIGHT;
  }
  // Values ≤ 4 are CSS-style multipliers (1.5 → fontSize × 1.5).
  // Values > 4 are absolute points.
  return node.lineHeight <= 4 ? fontSize * node.lineHeight : node.lineHeight;
}

function resolveAscent(node: PdfPhase3TextBase, fonts: PreparedPhase3Fonts): number {
  const fontSize = resolveFontSize(node);
  const prepared = getPreparedFont(fonts, node.font);
  if (prepared) {
    return (prepared.font.ascent / prepared.unitsPerEm) * fontSize;
  }
  return fontSize * 0.8;
}

async function tokenizeText(
  fonts: PreparedPhase3Fonts,
  node: PdfPhase3TextBase,
  label: string,
  preserveWhitespace = false,
): Promise<PdfLineToken[]> {
  const fontSize = resolveFontSize(node);
  const direction = node.direction ?? "auto";
  const text = getNodeText(node, label)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[\u200B\u200D]/gu, "");
  if (preserveWhitespace) {
    const tokens: PdfLineToken[] = [];
    for (const char of text) {
      if (char === "\n") {
        tokens.push({ text: char, width: 0, isSpace: false, mandatory: true });
        continue;
      }
      tokens.push({
        text: char,
        width: await measureTextWidth(fonts, node.font, char, fontSize, direction),
        isSpace: char === " ",
        mandatory: false,
      });
    }
    return tokens;
  }
  const parts = text.match(/(\n|[ ]+|[^ \n]+)/g) ?? [text];
  const tokens: PdfLineToken[] = [];

  for (const part of parts) {
    if (part === "\n") {
      tokens.push({ text: part, width: 0, isSpace: false, mandatory: true });
      continue;
    }
    const isSpace = /^[ ]+$/u.test(part);
    const characters = Array.from(part);
    if (!isSpace && characters.length >= PDF_UNBREAKABLE_TOKEN_LENGTH) {
      for (const [index, character] of characters.entries()) {
        tokens.push({
          breakPenalty: index + 1 < characters.length ? 1_000_000 : 0,
          text: character,
          width: await measureTextWidth(fonts, node.font, character, fontSize, direction),
          isSpace: false,
          mandatory: false,
        });
      }
    } else {
      const characterTokens = isSpace ? undefined : await Promise.all(characters.map(async (character) => ({
        text: character,
        width: await measureTextWidth(fonts, node.font, character, fontSize, direction),
      })));
      tokens.push({
        characters: characterTokens,
        text: part,
        width: await measureTextWidth(fonts, node.font, part, fontSize, direction),
        isSpace,
        mandatory: false,
      });
    }
  }

  return tokens;
}

function resolveBoxWidth(style: PdfPhase3Style | undefined, availableWidth: number, marginLeft: number, marginRight: number): number {
  const explicitWidth = resolveNumericDimension(style?.width, availableWidth);
  return explicitWidth ?? Math.max(0, availableWidth - marginLeft - marginRight);
}

function resolveContentWidth(layoutWidth: number, paddingLeft: number, paddingRight: number): number {
  return Math.max(0, layoutWidth - paddingLeft - paddingRight);
}

function computeLineXOffset(
  line: PdfBrokenLine,
  boxWidth: number,
  paddingLeft: number,
  paddingRight: number,
  align: "center" | "justify" | "left" | "right",
): number {
  const contentWidth = resolveContentWidth(boxWidth, paddingLeft, paddingRight);

  if (align === "center") {
    return paddingLeft + Math.max(0, (contentWidth - line.width) / 2);
  }
  if (align === "right") {
    return paddingLeft + Math.max(0, contentWidth - line.width);
  }

  return paddingLeft;
}

async function prepareTextNode(
  node: PdfPhase3ParagraphNode | PdfPhase3HeadingNode | PdfPhase3PreformattedNode,
  fonts: PreparedPhase3Fonts,
): Promise<PreparedTextNode> {
  const preserveWhitespace = node.type === "preformatted";
  return {
    align: node.textAlign ?? "left",
    ascent: resolveAscent(node, fonts),
    direction: node.direction ?? "auto",
    font: node.type === "heading" && (!node.font || node.font === DEFAULT_FONT)
      ? "Helvetica-Bold"
      : node.font ?? DEFAULT_FONT,
    fontSize: resolveFontSize(node),
    lineHeight: resolveLineHeight(node),
    marginBottom: getStyleSpacing(node.style, "margin", "Bottom"),
    marginLeft: getStyleSpacing(node.style, "margin", "Left"),
    marginRight: getStyleSpacing(node.style, "margin", "Right"),
    marginTop: getStyleSpacing(node.style, "margin", "Top"),
    node,
    paddingBottom: getStyleSpacing(node.style, "padding", "Bottom"),
    paddingLeft: getStyleSpacing(node.style, "padding", "Left"),
    paddingRight: getStyleSpacing(node.style, "padding", "Right"),
    paddingTop: getStyleSpacing(node.style, "padding", "Top"),
    preserveWhitespace,
    tokens: await tokenizeText(fonts, node, `${node.type}.value`, preserveWhitespace),
  };
}

function layoutPreparedTextNode(prepared: PreparedTextNode, availableWidth: number): TextBlockLayout {
  const boxWidth = resolveBoxWidth(prepared.node.style, availableWidth, prepared.marginLeft, prepared.marginRight);
  const contentWidth = resolveContentWidth(boxWidth, prepared.paddingLeft, prepared.paddingRight);
  const tokens = prepared.tokens.flatMap((token) => {
    const characters = token.characters;
    return token.width > contentWidth && characters && characters.length > 1
      ? characters.map((character, index) => ({
          ...character,
          breakPenalty: index + 1 < characters.length ? 1_000_000 : 0,
          isSpace: false,
          mandatory: false,
        }))
      : [token];
  });
  const brokenLines = breakTextIntoLines(
    tokens,
    contentWidth,
    prepared.preserveWhitespace ? "left" : prepared.align === "justify" ? "justify" : "left",
    { preserveWhitespace: prepared.preserveWhitespace },
  );
  const lines = brokenLines.map((line) => ({
    ascent: prepared.ascent,
    direction: prepared.direction,
    font: prepared.font,
    fontSize: prepared.fontSize,
    height: prepared.lineHeight,
    lineHeight: prepared.lineHeight,
    spaceCount: line.spaceCount,
    text: line.text,
    textAlign: prepared.align,
    width: line.width,
    wordSpacing: prepared.align === "justify" ? line.extraWordSpacing : 0,
    x: computeLineXOffset(line, boxWidth, prepared.paddingLeft, prepared.paddingRight, prepared.align),
  }));

  return {
    boxHeight: (lines.length * prepared.lineHeight) + prepared.paddingTop + prepared.paddingBottom,
    boxWidth,
    height: (lines.length * prepared.lineHeight) + prepared.paddingTop + prepared.paddingBottom + prepared.marginTop + prepared.marginBottom,
    lines,
    marginBottom: prepared.marginBottom,
    marginLeft: prepared.marginLeft,
    marginRight: prepared.marginRight,
    marginTop: prepared.marginTop,
    paddingBottom: prepared.paddingBottom,
    paddingLeft: prepared.paddingLeft,
    paddingRight: prepared.paddingRight,
    paddingTop: prepared.paddingTop,
  };
}

function applyStyle(node: YogaNode, style: PdfPhase3Style | undefined, availableWidth: number): void {
  const resolvedWidth = resolveNumericDimension(style?.width, availableWidth);
  const resolvedHeight = resolveNumericDimension(style?.height, availableWidth);
  const resolvedMinWidth = resolveNumericDimension(style?.minWidth, availableWidth);
  const resolvedMaxWidth = resolveNumericDimension(style?.maxWidth, availableWidth);
  const resolvedMinHeight = resolveNumericDimension(style?.minHeight, availableWidth);
  const resolvedMaxHeight = resolveNumericDimension(style?.maxHeight, availableWidth);

  node.setFlexDirection(style?.flexDirection === "row" ? yoga.FLEX_DIRECTION_ROW : yoga.FLEX_DIRECTION_COLUMN);
  node.setFlexWrap(style?.flexWrap === "wrap" ? yoga.WRAP_WRAP : yoga.WRAP_NO_WRAP);

  if (style?.justifyContent === "center") node.setJustifyContent(yoga.JUSTIFY_CENTER);
  else if (style?.justifyContent === "flex-end") node.setJustifyContent(yoga.JUSTIFY_FLEX_END);
  else if (style?.justifyContent === "space-between") node.setJustifyContent(yoga.JUSTIFY_SPACE_BETWEEN);
  else if (style?.justifyContent === "space-around") node.setJustifyContent(yoga.JUSTIFY_SPACE_AROUND);

  if (style?.alignItems === "center") node.setAlignItems(yoga.ALIGN_CENTER);
  else if (style?.alignItems === "flex-end") node.setAlignItems(yoga.ALIGN_FLEX_END);
  else if (style?.alignItems === "stretch") node.setAlignItems(yoga.ALIGN_STRETCH);
  else node.setAlignItems(yoga.ALIGN_FLEX_START);

  if (resolvedWidth !== undefined) node.setWidth(resolvedWidth);
  if (resolvedHeight !== undefined) node.setHeight(resolvedHeight);
  if (resolvedMinWidth !== undefined) node.setMinWidth(resolvedMinWidth);
  if (resolvedMaxWidth !== undefined) node.setMaxWidth(resolvedMaxWidth);
  if (resolvedMinHeight !== undefined) node.setMinHeight(resolvedMinHeight);
  if (resolvedMaxHeight !== undefined) node.setMaxHeight(resolvedMaxHeight);

  node.setPadding(yoga.EDGE_TOP, getStyleSpacing(style, "padding", "Top"));
  node.setPadding(yoga.EDGE_RIGHT, getStyleSpacing(style, "padding", "Right"));
  node.setPadding(yoga.EDGE_BOTTOM, getStyleSpacing(style, "padding", "Bottom"));
  node.setPadding(yoga.EDGE_LEFT, getStyleSpacing(style, "padding", "Left"));
  node.setMargin(yoga.EDGE_TOP, getStyleSpacing(style, "margin", "Top"));
  node.setMargin(yoga.EDGE_RIGHT, getStyleSpacing(style, "margin", "Right"));
  node.setMargin(yoga.EDGE_BOTTOM, getStyleSpacing(style, "margin", "Bottom"));
  node.setMargin(yoga.EDGE_LEFT, getStyleSpacing(style, "margin", "Left"));

  if (style?.gap !== undefined) node.setGap(yoga.GUTTER_ALL, style.gap);
  if (style?.rowGap !== undefined) node.setGap(yoga.GUTTER_ROW, style.rowGap);
  if (style?.columnGap !== undefined) node.setGap(yoga.GUTTER_COLUMN, style.columnGap);
  if (
    style?.flexDirection === "row"
    && style.justifyContent === "space-between"
    && style.gap === undefined
    && style.columnGap === undefined
  ) {
    node.setGap(yoga.GUTTER_COLUMN, 12);
  }

  if (style?.flexGrow !== undefined) node.setFlexGrow(style.flexGrow);
  if (style?.flexShrink !== undefined) node.setFlexShrink(style.flexShrink);

  if (style?.flexBasis !== undefined) {
    if (typeof style.flexBasis === "number") {
      node.setFlexBasis(style.flexBasis);
    } else if (style.flexBasis.endsWith("%")) {
      const percent = Number.parseFloat(style.flexBasis.slice(0, -1));
      if (Number.isFinite(percent)) {
        node.setFlexBasisPercent(percent);
      }
    }
  }

  if (style?.alignSelf === "center") node.setAlignSelf(yoga.ALIGN_CENTER);
  else if (style?.alignSelf === "flex-end") node.setAlignSelf(yoga.ALIGN_FLEX_END);
  else if (style?.alignSelf === "stretch") node.setAlignSelf(yoga.ALIGN_STRETCH);
  else if (style?.alignSelf === "flex-start") node.setAlignSelf(yoga.ALIGN_FLEX_START);

  if (style?.position === "absolute") {
    node.setPositionType(yoga.POSITION_TYPE_ABSOLUTE);
    if (style.top !== undefined) node.setPosition(yoga.EDGE_TOP, style.top);
    if (style.right !== undefined) node.setPosition(yoga.EDGE_RIGHT, style.right);
    if (style.bottom !== undefined) node.setPosition(yoga.EDGE_BOTTOM, style.bottom);
    if (style.left !== undefined) node.setPosition(yoga.EDGE_LEFT, style.left);
  }
}

async function buildYogaTree(
  node: PdfPhase3ContainerNode,
  availableWidth: number,
  fonts: PreparedPhase3Fonts,
): Promise<BuiltYogaTree> {
  const buildNode = async (current: PdfPhase3Node, width: number): Promise<BuiltYogaTree> => {
    const yogaNode = yoga.Node.create();
    applyStyle(yogaNode, current.style, width);

    if (current.type === "container") {
      const childWidth = resolveNumericDimension(current.style?.width, width) ?? width;
      const children: BuiltYogaTree[] = [];
      for (const child of current.children) {
        if (child.type === "table") {
          throw new TypeError("Phase 3 documents do not support table nodes inside containers");
        }
        const builtChild = await buildNode(child, childWidth);
        if (current.style?.flexDirection === "row" && child.style?.flexShrink === undefined) {
          builtChild.root.setFlexShrink(1);
        }
        children.push(builtChild);
        yogaNode.insertChild(builtChild.root, yogaNode.getChildCount());
      }

      return {
        children,
        root: yogaNode,
        source: current,
      };
    }

    if (current.type === "divider" || current.type === "page-break") {
      throw new TypeError(`Phase 3 only supports "${current.type}" at the top document level.`);
    }

    const preparedText = await prepareTextNode(current, fonts);
    yogaNode.setMeasureFunc((maxWidth: number, widthMode: MeasureMode) => {
      const rawConstraint = widthMode === MEASURE_MODE_EXACTLY || widthMode === MEASURE_MODE_AT_MOST ? maxWidth : width;
      const constraint = Number.isFinite(rawConstraint) && rawConstraint > 0 ? rawConstraint : width;
      const layout = layoutPreparedTextNode(preparedText, constraint);

      return {
        width: layout.boxWidth,
        height: layout.boxHeight,
      };
    });

    return {
      children: [],
      preparedText,
      root: yogaNode,
      source: current,
    };
  };

  return buildNode(node, availableWidth);
}

function freeYogaTree(node: YogaNode): void {
  const children: YogaNode[] = [];
  for (let index = 0; index < node.getChildCount(); index += 1) {
    children.push(node.getChild(index));
  }
  children.forEach(freeYogaTree);
  node.free();
}

export async function layoutContainerNode(
  node: PdfPhase3ContainerNode,
  availableWidth: number,
  fonts: PreparedPhase3Fonts,
): Promise<ContainerLayout> {
  const marginTop = getStyleSpacing(node.style, "margin", "Top");
  const marginRight = getStyleSpacing(node.style, "margin", "Right");
  const marginBottom = getStyleSpacing(node.style, "margin", "Bottom");
  const marginLeft = getStyleSpacing(node.style, "margin", "Left");
  const paddingTop = getStyleSpacing(node.style, "padding", "Top");
  const paddingLeft = getStyleSpacing(node.style, "padding", "Left");
  const width = resolveNumericDimension(node.style?.width, availableWidth) ?? Math.max(0, availableWidth - marginLeft - marginRight);
  const built = await buildYogaTree(node, width, fonts);

  try {
    built.root.calculateLayout(width, undefined, yoga.DIRECTION_LTR);

    const texts: ContainerLayout["texts"] = [];
    const anchors: ContainerLayout["anchors"] = [];
    const graphics: ContainerLayout["graphics"] = [];

    const collectTexts = (entry: BuiltYogaTree, offsetLeft: number, offsetTop: number): void => {
      const layout = entry.root.getComputedLayout();
      const absoluteLeft = offsetLeft + layout.left;
      const absoluteTop = offsetTop + layout.top;
      const sourceNode = entry.source;

      if (sourceNode.type === "container" && sourceNode.id) {
        anchors.push({
          height: Math.max(1, layout.height),
          id: sourceNode.id,
          left: absoluteLeft,
          top: absoluteTop,
          width: Math.max(1, layout.width),
        });
      }

      if (entry.preparedText) {
        const textNode = entry.source as PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode;
        const textBlock = layoutPreparedTextNode(entry.preparedText, layout.width);
        textBlock.lines.forEach((line, lineIndex) => {
          texts.push({
            ascent: line.ascent,
            direction: line.direction,
            font: line.font,
            fontSize: line.fontSize,
            id: textNode.id,
            kind: textNode.type,
            level: textNode.type === "heading" ? textNode.level : undefined,
            link: textNode.link,
            spaceCount: line.spaceCount,
            top: absoluteTop + textBlock.paddingTop + (lineIndex * line.lineHeight),
            value: line.text,
            width: line.width,
            wordSpacing: line.wordSpacing,
            x: absoluteLeft + line.x,
          });
        });
      }

      if (sourceNode.type === "container") {
        for (const graphic of sourceNode.graphics ?? []) {
          const translated = structuredClone(graphic) as PdfGraphic;
          if (translated.type === "rect" || translated.type === "image" || translated.type === "svg") {
            translated.x += absoluteLeft;
            translated.y += absoluteTop;
            graphics.push({
              bottom: translated.y + translated.height,
              graphic: translated,
              top: translated.y,
            });
            continue;
          }
          if (translated.type === "line") {
            translated.x1 += absoluteLeft;
            translated.x2 += absoluteLeft;
            translated.y1 += absoluteTop;
            translated.y2 += absoluteTop;
            graphics.push({
              bottom: Math.max(translated.y1, translated.y2),
              graphic: translated,
              top: Math.min(translated.y1, translated.y2),
            });
            continue;
          }
          if (translated.type === "path") {
            translated.x = (translated.x ?? 0) + absoluteLeft;
            translated.y = (translated.y ?? 0) + absoluteTop;
            graphics.push({
              bottom: translated.y ?? absoluteTop,
              graphic: translated,
              top: translated.y ?? absoluteTop,
            });
          }
        }
      }

      entry.children.forEach((child) => {
        collectTexts(child, absoluteLeft, absoluteTop);
      });
    };

    collectTexts(built, paddingLeft, paddingTop);

    const computedBoxHeight = built.root.getComputedLayout().height;
    const intrinsicBoxHeight = Math.max(
      0,
      ...texts.map((text) => text.top + (text.fontSize * DEFAULT_LINE_HEIGHT)),
      ...graphics.map((graphic) => graphic.bottom),
      ...anchors.map((anchor) => anchor.top + anchor.height),
    );
    const boxHeight = node.style?.position === "absolute" && computedBoxHeight >= HUGE_HEIGHT / 2
      ? intrinsicBoxHeight
      : computedBoxHeight;

    return {
      anchors,
      boxHeight,
      height: boxHeight + marginTop + marginBottom,
      marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      graphics,
      texts,
      width,
    };
  } finally {
    freeYogaTree(built.root);
  }
}

function resolveWidowOrphanSettings(node: PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode): Required<PdfPhase3WidowOrphan> {
  if (node.type === "preformatted") {
    return {
      minLinesAfterBreak: node.widowOrphan?.minLinesAfterBreak ?? 1,
      minLinesBeforeBreak: node.widowOrphan?.minLinesBeforeBreak ?? 1,
    };
  }
  return {
    minLinesAfterBreak: node.widowOrphan?.minLinesAfterBreak ?? (node.type === "paragraph" ? 2 : 1),
    minLinesBeforeBreak: node.widowOrphan?.minLinesBeforeBreak ?? (node.type === "paragraph" ? 2 : 1),
  };
}

function fitLineSlice(
  block: TextBlockLayout,
  lineCursor: number,
  remainingHeight: number,
  settings: Required<PdfPhase3WidowOrphan>,
): number {
  const lineHeight = block.lines[0]?.lineHeight ?? 0;
  if (lineHeight <= 0) {
    return 0;
  }

  let linesThatFit = Math.floor(remainingHeight / lineHeight);
  if (linesThatFit <= 0) {
    return 0;
  }

  const remainingLines = block.lines.length - lineCursor;
  linesThatFit = Math.min(linesThatFit, remainingLines);

  if (lineCursor === 0 && remainingLines > settings.minLinesBeforeBreak && linesThatFit < settings.minLinesBeforeBreak) {
    return 0;
  }

  const leftover = remainingLines - linesThatFit;
  if (leftover > 0 && leftover < settings.minLinesAfterBreak) {
    const adjusted = remainingLines - settings.minLinesAfterBreak;
    if (adjusted >= settings.minLinesBeforeBreak) {
      linesThatFit = adjusted;
    }
  }

  return Math.max(0, Math.min(linesThatFit, remainingLines));
}

export async function layoutTopLevelTextNode(
  node: PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode,
  availableWidth: number,
  fonts: PreparedPhase3Fonts,
): Promise<TextBlockLayout> {
  return layoutPreparedTextNode(await prepareTextNode(node, fonts), availableWidth);
}

async function estimateKeepWithNextHeight(
  current: PdfPhase3HeadingNode,
  nextNode: PdfPhase3Node | undefined,
  availableWidth: number,
  fonts: PreparedPhase3Fonts,
): Promise<number> {
  const headingBlock = await layoutTopLevelTextNode(current, availableWidth, fonts);
  if (!(current.keepWithNext ?? true) || !nextNode || nextNode.type !== "paragraph") {
    return headingBlock.height;
  }

  const nextBlock = await layoutTopLevelTextNode(nextNode, availableWidth, fonts);
  const nextLineHeight = nextBlock.lines[0]?.lineHeight ?? 0;
  return headingBlock.height + (Math.min(2, nextBlock.lines.length) * nextLineHeight);
}

interface Phase3PaginationResult {
  anchors: Phase3AnchorPlacement[];
  linePlacements: Phase3LinePlacement[];
  pages: PdfRenderedPage[];
}

function stripTopLevelAbsoluteStyle(node: PdfPhase3ContainerNode): PdfPhase3ContainerNode {
  if (node.style?.position !== "absolute") {
    return node;
  }
  return {
    ...node,
    style: {
      ...node.style,
      bottom: undefined,
      left: undefined,
      position: "relative",
      right: undefined,
      top: undefined,
    },
  };
}

function resolveAbsoluteContainerTop(
  style: PdfPhase3Style | undefined,
  availableHeight: number,
  containerBoxHeight: number,
): number {
  if (typeof style?.top === "number") {
    return style.top;
  }
  if (typeof style?.bottom === "number") {
    return Math.max(0, availableHeight - style.bottom - containerBoxHeight);
  }
  return 0;
}

function resolveAbsoluteContainerLeft(
  style: PdfPhase3Style | undefined,
  availableWidth: number,
  containerWidth: number,
): number {
  if (typeof style?.left === "number") {
    return style.left;
  }
  if (typeof style?.right === "number") {
    return Math.max(0, availableWidth - style.right - containerWidth);
  }
  return 0;
}

function estimateContainerIntrinsicHeight(container: ContainerLayout): number {
  return Math.max(
    0,
    ...container.texts.map((text) => text.top + (text.fontSize * DEFAULT_LINE_HEIGHT)),
    ...container.graphics.map((graphic) => graphic.bottom),
    ...container.anchors.map((anchor) => anchor.top + anchor.height),
  );
}

function buildLineRect(
  pageHeight: number,
  topMargin: number,
  top: number,
  ascent: number,
  x: number,
  width: number,
  height: number,
): [number, number, number, number] {
  const topEdge = pageHeight - topMargin - top;
  const bottomEdge = topEdge - height;
  return [x, bottomEdge, x + Math.max(0, width), topEdge];
}

export function resolveDividerLayout(
  node: PdfPhase3DividerNode,
  availableWidth: number,
): {
  boxHeight: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  strokeWidth: number;
  width: number;
} {
  const marginTop = getStyleSpacing(node.style, "margin", "Top") || DEFAULT_DIVIDER_SPACING;
  const marginRight = getStyleSpacing(node.style, "margin", "Right");
  const marginBottom = getStyleSpacing(node.style, "margin", "Bottom") || DEFAULT_DIVIDER_SPACING;
  const marginLeft = getStyleSpacing(node.style, "margin", "Left");
  const strokeWidth = resolveNumericDimension(node.style?.height, availableWidth) ?? DEFAULT_DIVIDER_THICKNESS;
  const width = resolveBoxWidth(node.style, availableWidth, marginLeft, marginRight);

  return {
    boxHeight: strokeWidth,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    strokeWidth,
    width,
  };
}

/** Reported when a line had to be force-placed because no page could contain it. */
export interface Phase3LineOverflow {
  lineHeight: number;
  availableHeight: number;
  nodeType: string;
}

async function paginatePhase3Document(
  document: NormalizedPhase3Document,
  fonts: PreparedPhase3Fonts,
  onOverflow?: (overflow: Phase3LineOverflow) => void,
): Promise<Phase3PaginationResult> {
  const availableWidth = document.page.width - document.page.margins.left - document.page.margins.right;
  const availableHeight = document.page.height - document.page.margins.top - document.page.margins.bottom;
  const pages: PdfRenderedPage[] = [];
  const anchors: Phase3AnchorPlacement[] = [];
  const linePlacements: Phase3LinePlacement[] = [];
  let currentPage: PdfRenderedPage = { graphics: [], width: document.page.width, height: document.page.height, texts: [] };
  let cursorY = 0;

  const pushPage = (): void => {
    pages.push(currentPage);
    currentPage = { graphics: [], width: document.page.width, height: document.page.height, texts: [] };
    cursorY = 0;
  };

  for (let index = 0; index < document.children.length; index += 1) {
    const node = document.children[index] as PdfPhase3Node;
    if (node.type === "page-break") {
      if (currentPage.texts.length > 0 || (currentPage.graphics?.length ?? 0) > 0) {
        pushPage();
      }
      continue;
    }

    if (node.type === "divider") {
      const divider = resolveDividerLayout(node, availableWidth);
      const requiredHeight = divider.marginTop + divider.boxHeight + divider.marginBottom;

      if (cursorY > 0 && cursorY + requiredHeight > availableHeight) {
        pushPage();
      }

      const startY = cursorY + divider.marginTop;
      const y = document.page.height
        - document.page.margins.top
        - startY
        - (divider.strokeWidth / 2);
      const x = document.page.margins.left + divider.marginLeft;
      currentPage.graphics?.push({
        type: "line",
        x1: x,
        x2: x + divider.width,
        y1: y,
        y2: y,
        stroke: {
          color: DEFAULT_DIVIDER_COLOR,
          width: divider.strokeWidth,
        },
      });
      cursorY = startY + divider.boxHeight + divider.marginBottom;
      continue;
    }

    if (isTextNode(node)) {
      const block = await layoutTopLevelTextNode(node, availableWidth, fonts);
      const orphanGuardHeight = node.type === "heading"
        ? await estimateKeepWithNextHeight(node, document.children[index + 1], availableWidth, fonts)
        : block.height;

      if (cursorY > 0 && cursorY + orphanGuardHeight > availableHeight) {
        pushPage();
      }

      const settings = resolveWidowOrphanSettings(node);
      let lineCursor = 0;
      while (lineCursor < block.lines.length) {
        const marginTop = lineCursor === 0 ? block.marginTop : 0;
        const paddingTop = lineCursor === 0 ? block.paddingTop : 0;
        const paddingBottom = lineCursor + 1 >= block.lines.length ? block.paddingBottom : 0;
        const marginBottom = lineCursor + 1 >= block.lines.length ? block.marginBottom : 0;
        const remainingHeight = availableHeight - cursorY - marginTop - paddingTop - paddingBottom - marginBottom;
        let linesThatFit = fitLineSlice(block, lineCursor, remainingHeight, settings);

        if (linesThatFit <= 0) {
          // A fresh page has already been pushed and the line still does not fit,
          // so the line is taller than the entire printable area. Pushing another
          // page cannot help: `pushPage` resets cursorY to 0, which is the state
          // we are already in, so this loop would append pages until the heap is
          // exhausted. (It did: a 300x18pt page with default margins killed the
          // process rather than returning.) Place the line anyway to guarantee
          // forward progress, and report the clipping rather than hiding it.
          if (cursorY === 0) {
            onOverflow?.({
              lineHeight: block.lines[lineCursor]?.height ?? 0,
              availableHeight,
              nodeType: node.type,
            });
            linesThatFit = 1;
          } else {
            pushPage();
            continue;
          }
        }

        const startY = cursorY + marginTop + paddingTop;
        const slice = block.lines.slice(lineCursor, lineCursor + linesThatFit);
        slice.forEach((line, lineIndex) => {
          const top = startY + (lineIndex * line.height);
          const pdfY = document.page.height - document.page.margins.top - top - line.ascent;
          const x = document.page.margins.left + block.marginLeft + line.x;
          const width = line.width + ((line.wordSpacing ?? 0) * (line.spaceCount ?? 0));
          currentPage.texts.push({
            direction: line.direction,
            font: line.font,
            fontSize: line.fontSize,
            spaceCount: line.spaceCount,
            value: line.text,
            width: line.width,
            wordSpacing: line.wordSpacing,
            x,
            y: pdfY,
          });
          linePlacements.push({
            blockId: node.id,
            kind: node.type,
            level: node.type === "heading" ? node.level : undefined,
            link: node.link,
            pageIndex: pages.length,
            rect: buildLineRect(document.page.height, document.page.margins.top, top, line.ascent, x, width, line.height),
            text: line.text,
          });
          if (node.id && lineCursor === 0 && lineIndex === 0) {
            anchors.push({
              id: node.id,
              kind: node.type === "preformatted" ? "paragraph" : node.type,
              level: node.type === "heading" ? node.level : undefined,
              pageIndex: pages.length,
              rect: buildLineRect(document.page.height, document.page.margins.top, top, line.ascent, x, Math.max(width, 1), line.height),
              title: getNodeText(node, `${node.type}.value`),
            });
          }
        });

        lineCursor += slice.length;
        cursorY = startY + (slice.length * (block.lines[0]?.height ?? 0));
        if (lineCursor >= block.lines.length) {
          cursorY += block.paddingBottom + block.marginBottom;
        }
        if (lineCursor < block.lines.length) {
          pushPage();
        }
      }

      continue;
    }

    const isAbsoluteTopLevelContainer = node.style?.position === "absolute";
    const container = await layoutContainerNode(
      isAbsoluteTopLevelContainer ? stripTopLevelAbsoluteStyle(node) : node,
      availableWidth,
      fonts,
    );
    if (!isAbsoluteTopLevelContainer && cursorY > 0 && cursorY + container.height > availableHeight) {
      pushPage();
    }

    const absoluteBoxHeight = isAbsoluteTopLevelContainer && container.boxHeight >= HUGE_HEIGHT / 2
      ? estimateContainerIntrinsicHeight(container)
      : container.boxHeight;
    const offsetX = isAbsoluteTopLevelContainer
      ? resolveAbsoluteContainerLeft(node.style, availableWidth, container.width)
      : 0;
    const startY = isAbsoluteTopLevelContainer
      ? resolveAbsoluteContainerTop(node.style, availableHeight, absoluteBoxHeight)
      : cursorY + container.marginTop;
    for (const placement of container.graphics) {
      const graphic = structuredClone(placement.graphic) as typeof placement.graphic;
      if (graphic.type === "rect" || graphic.type === "image" || graphic.type === "svg") {
        graphic.x = document.page.margins.left + offsetX + container.marginLeft + graphic.x;
        graphic.y = document.page.height - document.page.margins.top - (startY + placement.top) - graphic.height;
      } else if (graphic.type === "line") {
        graphic.x1 = document.page.margins.left + offsetX + container.marginLeft + graphic.x1;
        graphic.x2 = document.page.margins.left + offsetX + container.marginLeft + graphic.x2;
        graphic.y1 = document.page.height - document.page.margins.top - (startY + placement.top);
        graphic.y2 = document.page.height - document.page.margins.top - (startY + placement.bottom);
      } else if (graphic.type === "path") {
        graphic.x = document.page.margins.left + offsetX + container.marginLeft + (graphic.x ?? 0);
        graphic.y = document.page.height - document.page.margins.top - (startY + placement.top);
      }
      currentPage.graphics?.push(graphic);
    }
    container.texts.forEach((text) => {
      const x = document.page.margins.left + offsetX + container.marginLeft + text.x;
      const width = (text.width ?? 0) + ((text.wordSpacing ?? 0) * (text.spaceCount ?? 0));
      const top = startY + text.top;
      const pdfY = document.page.height - document.page.margins.top - (startY + text.top) - text.ascent;
      currentPage.texts.push({
        direction: text.direction,
        font: text.font,
        fontSize: text.fontSize,
        spaceCount: text.spaceCount,
        value: text.value,
        width: text.width,
        wordSpacing: text.wordSpacing,
        x,
        y: pdfY,
      });
      linePlacements.push({
        blockId: text.id,
        kind: text.kind,
        level: text.level,
        link: text.link,
        pageIndex: pages.length,
        rect: buildLineRect(document.page.height, document.page.margins.top, top, text.ascent, x, width, text.fontSize * DEFAULT_LINE_HEIGHT),
        text: text.value,
      });
      if (text.id && !anchors.some((anchor) => anchor.id === text.id)) {
        anchors.push({
          id: text.id,
          kind: text.kind === "preformatted" ? "paragraph" : text.kind,
          level: text.level,
          pageIndex: pages.length,
          rect: buildLineRect(document.page.height, document.page.margins.top, top, text.ascent, x, Math.max(width, 1), text.fontSize * DEFAULT_LINE_HEIGHT),
          title: text.value,
        });
      }
    });
    container.anchors.forEach((anchor) => {
      if (anchors.some((entry) => entry.id === anchor.id)) {
        return;
      }
      const x = document.page.margins.left + offsetX + container.marginLeft + anchor.left;
      const top = startY + anchor.top;
      anchors.push({
        id: anchor.id,
        kind: "container",
        pageIndex: pages.length,
        rect: buildLineRect(
          document.page.height,
          document.page.margins.top,
          top,
          0,
          x,
          anchor.width,
          anchor.height,
        ),
      });
    });
    if (node.id && !anchors.some((anchor) => anchor.id === node.id)) {
      const x = document.page.margins.left + offsetX + container.marginLeft;
      const top = startY;
      anchors.push({
        id: node.id,
        kind: "container",
        pageIndex: pages.length,
        rect: buildLineRect(
          document.page.height,
          document.page.margins.top,
          top,
          0,
          x,
          Math.max(1, container.width),
          Math.max(1, container.boxHeight),
        ),
      });
    }
    if (!isAbsoluteTopLevelContainer) {
      cursorY = startY + container.boxHeight + container.marginBottom;
    }
  }

  pages.push(currentPage);
  return { anchors, linePlacements, pages };
}

export async function analyzePhase3Document(document: PdfDocumentPhase3): Promise<{
  meta: NonNullable<PdfDocumentPhase3["meta"]>;
  page: NormalizedPhase3Document["page"];
  pages: PdfRenderedPage[];
}> {
  const analysis = await analyzePhase3DocumentDetailed(document);

  return {
    meta: analysis.meta,
    page: analysis.page,
    pages: analysis.pages,
  };
}

export async function analyzePhase3DocumentDetailed(
  document: PdfDocumentPhase3,
  onOverflow?: (overflow: Phase3LineOverflow) => void,
): Promise<{
  anchors: Phase3AnchorPlacement[];
  linePlacements: Phase3LinePlacement[];
  meta: NonNullable<PdfDocumentPhase3["meta"]>;
  page: NormalizedPhase3Document["page"];
  pages: PdfRenderedPage[];
}> {
  const normalized = normalizePhase3Document(document);
  const fonts = await preparePhase3Fonts(document);
  const pagination = await paginatePhase3Document(normalized, fonts, onOverflow);

  return {
    anchors: pagination.anchors,
    linePlacements: pagination.linePlacements,
    meta: normalized.meta,
    page: normalized.page,
    pages: pagination.pages,
  };
}

export async function renderPhase3Document(document: PdfDocumentPhase3): Promise<Buffer> {
  const analysis = await analyzePhase3Document(document);
  return renderPdfPages({
    meta: analysis.meta,
    pages: analysis.pages,
  });
}
