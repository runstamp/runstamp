import type {
  PaperDocument,
  PaperChart,
  PaperImage,
  PaperNode,
  PaperSlide,
  PaperTable,
  PaperText,
  PaperView,
  TextRun,
  TextStyle,
} from "../types/ast.js";
import { computePolicyAutoFit } from "../typography/autoFit.js";
import { calculateRichTextMetrics } from "../typography/richMetrics.js";
import { hasUnbreakableTextSegment } from "../typography/breakAnywhere.js";
import { planTableLayout, type TableFitDiagnostics } from "../typography/tableLayout.js";
import { resolveLineHeightPixels } from "../typography/lineHeight.js";
import { collectChartFitDiagnostics, type ChartFitDiagnostics } from "./chartDiagnostics.js";
import { collectImageFitDiagnostics, type ImageFitDiagnostics } from "./imageDiagnostics.js";

export type AbsoluteLayoutIssueCode =
  | "TEXT_OVERFLOW"
  | "TEXT_CLIP"
  | "TEXT_BREAK_ANYWHERE"
  | "TEXT_WRAP_TIGHT"
  | "CONTAINER_CHILD_OUT_OF_BOUNDS"
  | "NODE_COLLISION"
  | "OUT_OF_BOUNDS"
  | "TABLE_ROW_COMPRESSED"
  | "TABLE_OVERFULL"
  | "CHART_LABEL_COLLISION"
  | "CHART_LEGEND_COLLISION"
  | "CHART_ANNOTATION_COLLISION"
  | "IMAGE_CROP_RISK"
  | "IMAGE_UPSCALE_RISK"
  | "IMAGE_ASPECT_RISK"
  | "REGION_TOO_SMALL"
  | "CONTENT_PAGINATED"
  | "CONTENT_CLIPPED"
  | "REGION_COLLISION";

export interface AbsoluteLayoutIssue {
  code: AbsoluteLayoutIssueCode;
  message: string;
  slideIndex: number;
  nodePath: string;
  relatedNodePath?: string;
  rect?: Rect;
  /** Composition-block index within `slide.composition.blocks[]`, when applicable. */
  blockIndex?: number;
  /** Composition primitive name (e.g. "metricStack", "matrixTable"), when applicable. */
  primitive?: string;
  /** Actual region dimensions reported in the input, when applicable. */
  actual?: { colSpan?: number; rowSpan?: number };
  /** Recommended minimum region dimensions for this primitive, when applicable. */
  minimum?: { colSpan?: number; rowSpan?: number };
  /** Human-readable, action-oriented hint for self-correction. */
  remediation?: string;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AbsoluteTextFitDiagnostics {
  availableWidth: number;
  availableHeight: number;
  overflow: boolean;
  nominalLineHeight: number;
  lineHeightClips: boolean;
  policy: string;
  lineCount: number;
  maxLines?: number;
  unexpectedWrap: boolean;
  tightWrap: boolean;
  minReadableWidth: number;
  fontScale: number;
  lnSpcReduction: number;
}

export interface AbsoluteLayoutDebugNode {
  path: string;
  nodeType: PaperNode["type"];
  rect: Rect;
  zIndex?: number;
  decorative?: boolean;
  textFit?: AbsoluteTextFitDiagnostics;
  tableFit?: TableFitDiagnostics;
  chartFit?: ChartFitDiagnostics;
  imageFit?: ImageFitDiagnostics;
}

export interface AbsoluteLayoutDebugIssue extends AbsoluteLayoutIssue {
  issueId: string;
  rect?: Rect;
  relatedRect?: Rect;
}

export interface AbsoluteSlideLayoutDebug {
  slideIndex: number;
  slideSize: { width: number; height: number };
  nodes: AbsoluteLayoutDebugNode[];
  issues: AbsoluteLayoutDebugIssue[];
}

interface AbsoluteNodeInfo {
  path: string;
  rect: Rect;
  zIndex?: number;
  decorative?: boolean;
}

function hasChildren(node: PaperNode): node is PaperNode & { children: PaperNode[] } {
  return "children" in node && Array.isArray(node.children);
}

function toTextRuns(value: string | TextRun[] | undefined): TextRun[] {
  if (!value) return [];
  return typeof value === "string" ? [{ text: value }] : value;
}

function paragraphsToRuns(paragraphs: Array<{ runs: TextRun[] }>): TextRun[] {
  const runs: TextRun[] = [];
  paragraphs.forEach((paragraph, index) => {
    runs.push(...paragraph.runs);
    if (index < paragraphs.length - 1) {
      runs.push({ text: "\n" });
    }
  });
  return runs;
}

function extractTextPayload(node: PaperNode): {
  runs: TextRun[];
  style: TextStyle | undefined;
  insets: TextStyle["textInsets"] | undefined;
} | null {
  if (node.type === "Text") {
    const textNode = node as PaperText;
    const runs = textNode.paragraphs
      ? paragraphsToRuns(textNode.paragraphs)
      : toTextRuns(textNode.content);
    return runs.length > 0 ? { runs, style: textNode.style, insets: textNode.style?.textInsets } : null;
  }

  if (node.type === "View") {
    const viewNode = node as PaperView;
    const runs = viewNode.textParagraphs
      ? paragraphsToRuns(viewNode.textParagraphs)
      : toTextRuns(viewNode.textContent);
    const style = viewNode.textStyle;
    return runs.length > 0 ? { runs, style, insets: style?.textInsets } : null;
  }

  return null;
}

function getAbsoluteRect(node: PaperNode, origin: { x: number; y: number }): Rect | null {
  const style = node.style;
  if (!style || style.position !== "absolute") {
    return null;
  }

  if (
    typeof style.left !== "number"
    || typeof style.top !== "number"
    || typeof style.width !== "number"
    || typeof style.height !== "number"
    || style.width <= 0
    || style.height <= 0
  ) {
    return null;
  }

  return {
    left: origin.x + style.left,
    top: origin.y + style.top,
    width: style.width,
    height: style.height,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width
    && a.left + a.width > b.left
    && a.top < b.top + b.height
    && a.top + a.height > b.top
  );
}

function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    outer.left <= inner.left
    && outer.top <= inner.top
    && outer.left + outer.width >= inner.left + inner.width
    && outer.top + outer.height >= inner.top + inner.height
  );
}

function rectContainsWithTolerance(outer: Rect, inner: Rect, tolerance: number): boolean {
  return (
    outer.left <= inner.left + tolerance
    && outer.top <= inner.top + tolerance
    && outer.left + outer.width >= inner.left + inner.width - tolerance
    && outer.top + outer.height >= inner.top + inner.height - tolerance
  );
}

function overlapArea(a: Rect, b: Rect): number {
  const horizontal = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const vertical = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return horizontal * vertical;
}

function maxFontSize(runs: TextRun[], style: TextStyle | undefined): number {
  let size = style?.fontSize ?? 16;
  for (const run of runs) {
    size = Math.max(size, run.style?.fontSize ?? size);
  }
  return size;
}

function minReadableTextWidth(runs: TextRun[], style: TextStyle | undefined): number {
  const largestFont = maxFontSize(runs, style);
  return Math.max(48, largestFont * 3.4);
}

function textCharCount(runs: TextRun[]): number {
  return runs.reduce((count, run) => count + run.text.trim().length, 0);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function measureTextFit(
  node: PaperNode,
  rect: Rect,
): AbsoluteTextFitDiagnostics | undefined {
  if (node.decorative) return undefined;
  const payload = extractTextPayload(node);
  if (!payload) return undefined;

  const insetWidth = (payload.insets?.left ?? 0) + (payload.insets?.right ?? 0);
  const insetHeight = (payload.insets?.top ?? 0) + (payload.insets?.bottom ?? 0);
  const isVertical = payload.style?.textDirection === "vertical";
  const availableWidth = Math.max(0, (isVertical ? rect.height : rect.width) - (isVertical ? insetHeight : insetWidth));
  const availableHeight = Math.max(0, (isVertical ? rect.width : rect.height) - (isVertical ? insetWidth : insetHeight));
  const policy = payload.style?.textFit?.policy ?? "strict";
  const autoFit = computePolicyAutoFit(payload.runs, payload.style, availableWidth, availableHeight);
  const largestFont = maxFontSize(payload.runs, payload.style);
  const nominalLineHeight = resolveLineHeightPixels(
    payload.style?.lineHeight,
    largestFont,
    largestFont * 1.2,
  );
  const metrics = calculateRichTextMetrics(payload.runs, payload.style, availableWidth);
  const lineCount = policy === "fitFontSize" && autoFit.lineCount !== undefined
    ? autoFit.lineCount
    : metrics.lineCount;
  const maxLines = payload.style?.textFit?.maxLines;
  const minReadableWidth = minReadableTextWidth(payload.runs, payload.style);
  const contentLength = textCharCount(payload.runs);
  // Secondary clause uses autoFit's simulated shrink as evidence that
  // text didn't fit at full size. estimateTextWidth disagrees with the
  // renderer by ~1-2px on average, so a tiny shrink (<=5%) is measurement
  // noise rather than a real readability issue. Require a 10%+ shrink so
  // intentionally tight labels (e.g., scatter-plot point labels sized via
  // estimateTextWidth + a small buffer) don't false-positive.
  const SHRINK_NOISE_FLOOR = 90000;
  const tightWrap = availableWidth < minReadableWidth
    && (lineCount > 1 || (contentLength >= 4 && autoFit.fontScale < SHRINK_NOISE_FLOOR));

  return {
    availableWidth,
    availableHeight,
    overflow: autoFit.overflow,
    nominalLineHeight,
    lineHeightClips: availableHeight < nominalLineHeight * 0.95,
    policy,
    lineCount,
    maxLines,
    unexpectedWrap: maxLines !== undefined && lineCount > maxLines,
    tightWrap,
    minReadableWidth,
    fontScale: autoFit.fontScale,
    lnSpcReduction: autoFit.lnSpcReduction,
  };
}

function measureTableFit(node: PaperNode, rect: Rect): TableFitDiagnostics | undefined {
  if (node.decorative || node.type !== "Table") return undefined;
  const table = node as PaperTable;
  return planTableLayout(table.tableData, rect.width, rect.height);
}

function measureChartFit(node: PaperNode, rect: Rect): ChartFitDiagnostics | undefined {
  if (node.decorative || node.type !== "Chart") return undefined;
  return collectChartFitDiagnostics(node as PaperChart, rect);
}

function measureImageFit(node: PaperNode, rect: Rect): ImageFitDiagnostics | undefined {
  if (node.decorative || node.type !== "Image") return undefined;
  return collectImageFitDiagnostics(node as PaperImage, rect);
}

function pushIssue(
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
  issue: AbsoluteLayoutIssue,
): void {
  const key = [
    issue.code,
    issue.slideIndex,
    issue.nodePath,
    issue.relatedNodePath ?? "",
  ].join("|");
  if (seen.has(key)) return;
  seen.add(key);
  issues.push(issue);
}

// Sub-pixel tolerance so primitives that compute distributions like
// `(region.width - gap*(n-1)) / n` and emit a final rect whose right
// edge mathematically equals `region.right` aren't punished for
// floating-point drift of ε. 0.5px is below display resolution and
// matches the tolerance `layoutFooter` already uses for its own
// clip-vs-fit gate.
const BOUNDS_TOLERANCE = 0.5;

function warnOnBounds(
  node: PaperNode,
  rect: Rect | null,
  slideSize: { width: number; height: number },
  slideIndex: number,
  nodePath: string,
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
): void {
  if (!rect || node.decorative) return;
  if (
    rect.left < -BOUNDS_TOLERANCE
    || rect.top < -BOUNDS_TOLERANCE
    || rect.left + rect.width > slideSize.width + BOUNDS_TOLERANCE
    || rect.top + rect.height > slideSize.height + BOUNDS_TOLERANCE
  ) {
    pushIssue(issues, seen, {
      code: "OUT_OF_BOUNDS",
      message: `Absolute node ${nodePath} exceeds slide bounds ${slideSize.width}x${slideSize.height}.`,
      slideIndex,
      nodePath,
    });
  }
}

function warnOnParentBounds(
  node: PaperNode,
  rect: Rect | null,
  parentRect: Rect | undefined,
  slideIndex: number,
  nodePath: string,
  parentPath: string,
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
): void {
  if (!rect || !parentRect || node.decorative) return;
  if (rectContainsWithTolerance(parentRect, rect, BOUNDS_TOLERANCE)) return;
  pushIssue(issues, seen, {
    code: "CONTAINER_CHILD_OUT_OF_BOUNDS",
    message: `Absolute child ${nodePath} exceeds parent container ${parentPath}.`,
    slideIndex,
    nodePath,
    relatedNodePath: parentPath,
    rect,
  });
}

function warnOnTextFit(
  node: PaperNode,
  slideIndex: number,
  nodePath: string,
  origin: { x: number; y: number },
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
): void {
  if (node.decorative) return;
  const payload = extractTextPayload(node);
  if (!payload) return;

  const rect = getAbsoluteRect(node, origin);
  if (!rect) return;

  const insetWidth = (payload.insets?.left ?? 0) + (payload.insets?.right ?? 0);
  const insetHeight = (payload.insets?.top ?? 0) + (payload.insets?.bottom ?? 0);
  // For `textDirection: "vertical"` (OOXML vert270), text wraps across the
  // rect's height instead of its width. Swap the dims before measuring so
  // the autoFit pass uses the right wrap budget for rotated row labels and
  // vertical axis captions.
  const isVertical = payload.style?.textDirection === "vertical";
  const wrapBudget = Math.max(0, (isVertical ? rect.height : rect.width) - (isVertical ? insetHeight : insetWidth));
  const blockBudget = Math.max(0, (isVertical ? rect.width : rect.height) - (isVertical ? insetWidth : insetHeight));
  const availableWidth = wrapBudget;
  const availableHeight = blockBudget;

  const fitPolicy = payload.style?.textFit?.policy ?? "strict";
  const autoFit = computePolicyAutoFit(payload.runs, payload.style, availableWidth, availableHeight);
  const metrics = calculateRichTextMetrics(payload.runs, payload.style, availableWidth);
  const largestFont = maxFontSize(payload.runs, payload.style);
  const nominalLineHeight = resolveLineHeightPixels(
    payload.style?.lineHeight,
    largestFont,
    largestFont * 1.2,
  );
  const lineCount = fitPolicy === "fitFontSize" && autoFit.lineCount !== undefined
    ? autoFit.lineCount
    : metrics.lineCount;
  const maxLines = payload.style?.textFit?.maxLines;
  const unexpectedWrap = maxLines !== undefined && lineCount > maxLines;
  const minReadableWidth = minReadableTextWidth(payload.runs, payload.style);
  const contentLength = textCharCount(payload.runs);
  // See SHRINK_NOISE_FLOOR comment in measureTextFit.
  const SHRINK_NOISE_FLOOR = 90000;
  const tightWrap = !isVertical
    && availableWidth < minReadableWidth
    && (lineCount > 1 || (contentLength >= 4 && autoFit.fontScale < SHRINK_NOISE_FLOOR));
  const hasUnbreakableString = !isVertical && payload.runs.some((run) => (
    hasUnbreakableTextSegment(run.text, payload.style, availableWidth)
  ));

  if (fitPolicy !== "overflow" && hasUnbreakableString) {
    pushIssue(issues, seen, {
      code: "TEXT_BREAK_ANYWHERE",
      message: `Text contains a segment wider than ${Math.round(availableWidth)}px at ${nodePath}; break-anywhere fallback will be applied.`,
      slideIndex,
      nodePath,
      rect,
    });
  }

  if (fitPolicy !== "overflow" && (autoFit.overflow || unexpectedWrap)) {
    pushIssue(issues, seen, {
      code: "TEXT_OVERFLOW",
      message: unexpectedWrap
        ? `Text wraps to ${lineCount} lines, exceeding maxLines=${maxLines} at ${nodePath}.`
        : `Text may overflow its ${Math.round(availableWidth)}x${Math.round(availableHeight)} container at ${nodePath}.`,
      slideIndex,
      nodePath,
    });
  }

  if (fitPolicy !== "overflow" && tightWrap) {
    pushIssue(issues, seen, {
      code: "TEXT_WRAP_TIGHT",
      message: `Text wraps in a cramped ${Math.round(availableWidth)}px column; needs about ${Math.round(minReadableWidth)}px for readable wrapping at ${nodePath}.`,
      slideIndex,
      nodePath,
      rect,
    });
  }

  if (fitPolicy !== "overflow" && availableHeight < nominalLineHeight * 0.95) {
    pushIssue(issues, seen, {
      code: "TEXT_CLIP",
      message: `Text line height may clip inside its ${Math.round(availableWidth)}x${Math.round(availableHeight)} container at ${nodePath}.`,
      slideIndex,
      nodePath,
    });
  }
}

function warnOnTableFit(
  node: PaperNode,
  rect: Rect | null,
  slideIndex: number,
  nodePath: string,
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
): void {
  if (!rect || node.decorative || node.type !== "Table") return;
  const table = node as PaperTable;
  const fit = planTableLayout(table.tableData, rect.width, rect.height);
  if (table.tableData.rowLayout?.overflow !== "allow" && fit.overfull) {
    pushIssue(issues, seen, {
      code: "TABLE_OVERFULL",
      message: `Table rows require ${Math.round(fit.totalAssignedHeight)}px but allocated height is ${Math.round(rect.height)}px at ${nodePath}.`,
      slideIndex,
      nodePath,
      rect,
    });
  }
  for (const rowIndex of fit.compressedRows) {
    const row = fit.rows[rowIndex];
    pushIssue(issues, seen, {
      code: "TABLE_ROW_COMPRESSED",
      message: `Table row ${rowIndex + 1} is assigned ${Math.round(row.assignedHeight)}px but needs ${Math.round(row.naturalHeight)}px at ${nodePath}.`,
      slideIndex,
      nodePath,
      rect,
    });
  }
}

function warnOnChartFit(
  node: PaperNode,
  rect: Rect | null,
  slideIndex: number,
  nodePath: string,
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
): void {
  if (!rect || node.decorative || node.type !== "Chart") return;
  const chartFit = collectChartFitDiagnostics(node as PaperChart, rect);
  if (!chartFit) return;
  for (const issue of chartFit.issues) {
    pushIssue(issues, seen, {
      code: issue.code,
      message: issue.message,
      slideIndex,
      nodePath,
      rect: issue.rect,
    });
  }
}

function warnOnImageFit(
  node: PaperNode,
  rect: Rect | null,
  slideIndex: number,
  nodePath: string,
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
): void {
  if (!rect || node.decorative || node.type !== "Image") return;
  const imageFit = collectImageFitDiagnostics(node as PaperImage, rect);
  if (!imageFit) return;
  for (const issue of imageFit.issues) {
    pushIssue(issues, seen, {
      code: issue.code,
      message: issue.message,
      slideIndex,
      nodePath,
      rect: issue.rect,
    });
  }
}

function collectAbsoluteSiblingInfo(
  nodes: PaperNode[],
  origin: { x: number; y: number },
  parentPath: string,
): AbsoluteNodeInfo[] {
  return nodes.flatMap((node, index) => {
    const rect = getAbsoluteRect(node, origin);
    if (!rect) return [];
    return [{
      path: `${parentPath}[${index}]`,
      rect,
      zIndex: node.style?.zIndex,
      decorative: node.decorative,
    }];
  });
}

function walkNodes(
  nodes: PaperNode[],
  slideIndex: number,
  slideSize: { width: number; height: number },
  origin: { x: number; y: number },
  parentPath: string,
  issues: AbsoluteLayoutIssue[],
  seen: Set<string>,
  parentRect?: Rect,
): void {
  const absoluteSiblings = collectAbsoluteSiblingInfo(nodes, origin, parentPath);
  for (let index = 0; index < absoluteSiblings.length; index += 1) {
    const current = absoluteSiblings[index];
    for (let otherIndex = index + 1; otherIndex < absoluteSiblings.length; otherIndex += 1) {
      const other = absoluteSiblings[otherIndex];
      if (
        !rectsOverlap(current.rect, other.rect)
        || rectContains(current.rect, other.rect)
        || rectContains(other.rect, current.rect)
        || overlapArea(current.rect, other.rect) < 120
        || current.decorative
        || other.decorative
        || (current.zIndex !== undefined && other.zIndex !== undefined && current.zIndex !== other.zIndex)
      ) {
        continue;
      }
      pushIssue(issues, seen, {
        code: "NODE_COLLISION",
        message: `Absolutely positioned nodes ${current.path} and ${other.path} overlap.`,
        slideIndex,
        nodePath: current.path,
        relatedNodePath: other.path,
      });
    }
  }

  nodes.forEach((node, index) => {
    const nodePath = `${parentPath}[${index}]`;
    const rect = getAbsoluteRect(node, origin);
    warnOnBounds(node, rect, slideSize, slideIndex, nodePath, issues, seen);
    warnOnParentBounds(node, rect, parentRect, slideIndex, nodePath, parentPath, issues, seen);
    warnOnTextFit(node, slideIndex, nodePath, origin, issues, seen);
    warnOnTableFit(node, rect, slideIndex, nodePath, issues, seen);
    warnOnChartFit(node, rect, slideIndex, nodePath, issues, seen);
    warnOnImageFit(node, rect, slideIndex, nodePath, issues, seen);

    if (!hasChildren(node)) return;
    const nextOrigin = rect
      ? { x: rect.left, y: rect.top }
      : origin;
    walkNodes(node.children, slideIndex, slideSize, nextOrigin, `${nodePath}.children`, issues, seen, rect ?? parentRect);
  });
}

function collectDebugNodes(
  nodes: PaperNode[],
  origin: { x: number; y: number },
  parentPath: string,
  output: AbsoluteLayoutDebugNode[],
): void {
  nodes.forEach((node, index) => {
    const nodePath = `${parentPath}[${index}]`;
    const rect = getAbsoluteRect(node, origin);
    if (rect) {
      output.push({
        path: nodePath,
        nodeType: node.type,
        rect,
        zIndex: node.style?.zIndex,
        decorative: node.decorative,
        textFit: measureTextFit(node, rect),
        tableFit: measureTableFit(node, rect),
        chartFit: measureChartFit(node, rect),
        imageFit: measureImageFit(node, rect),
      });
    }
    if (!hasChildren(node)) return;
    const nextOrigin = rect
      ? { x: rect.left, y: rect.top }
      : origin;
    collectDebugNodes(node.children, nextOrigin, `${nodePath}.children`, output);
  });
}

function enrichIssue(
  issue: AbsoluteLayoutIssue,
  rectByPath: Map<string, Rect>,
): AbsoluteLayoutDebugIssue {
  const stableKey = [
    issue.code,
    issue.slideIndex,
    issue.nodePath,
    issue.relatedNodePath ?? "",
  ].join("|");
  return {
    ...issue,
    issueId: `${issue.code.toLowerCase().replace(/_/g, "-")}-${hashString(stableKey)}`,
    rect: issue.rect ?? rectByPath.get(issue.nodePath),
    relatedRect: issue.relatedNodePath ? rectByPath.get(issue.relatedNodePath) : undefined,
  };
}

export function validateAbsoluteSlideLayout(
  slide: PaperSlide,
  slideIndex: number,
  slideSize: { width: number; height: number },
): AbsoluteLayoutIssue[] {
  const issues: AbsoluteLayoutIssue[] = [];
  const seen = new Set<string>();
  walkNodes(slide.children, slideIndex, slideSize, { x: 0, y: 0 }, `slides[${slideIndex}].children`, issues, seen);
  return issues;
}

export function collectAbsoluteSlideLayoutDebug(
  slide: PaperSlide,
  slideIndex: number,
  slideSize: { width: number; height: number },
): AbsoluteSlideLayoutDebug {
  const nodes: AbsoluteLayoutDebugNode[] = [];
  collectDebugNodes(slide.children, { x: 0, y: 0 }, `slides[${slideIndex}].children`, nodes);
  const rectByPath = new Map(nodes.map((node) => [node.path, node.rect]));
  const issues = validateAbsoluteSlideLayout(slide, slideIndex, slideSize)
    .map((issue) => enrichIssue(issue, rectByPath));
  return { slideIndex, slideSize, nodes, issues };
}

export function collectAbsoluteDocumentLayoutDebug(document: PaperDocument): AbsoluteSlideLayoutDebug[] {
  const slideSize = document.slideSize ?? { width: 960, height: 540 };
  return document.slides.map((slide, slideIndex) =>
    collectAbsoluteSlideLayoutDebug(slide, slideIndex, slideSize),
  );
}

export function validateAbsoluteDocumentLayout(document: PaperDocument): AbsoluteLayoutIssue[] {
  const slideSize = document.slideSize ?? { width: 960, height: 540 };
  return document.slides.flatMap((slide, slideIndex) =>
    validateAbsoluteSlideLayout(slide, slideIndex, slideSize),
  );
}
