import type {
  PaperDocument,
  PaperNode,
  PaperSlide,
  PaperText,
  PaperView,
  TextRun,
  TextStyle,
} from "../types/ast.js";
import { computePolicyAutoFit } from "../typography/autoFit.js";
import { calculateRichTextMetrics } from "../typography/richMetrics.js";
import { hasUnbreakableTextSegment } from "../typography/breakAnywhere.js";

export type AgentLayoutWarningCode =
  | "POTENTIAL_OVERFLOW"
  | "POTENTIAL_CLIP"
  | "POTENTIAL_UNBREAKABLE_STRING"
  | "POTENTIAL_TIGHT_WRAP"
  | "POTENTIAL_CONTAINER_CLIP"
  | "POTENTIAL_COLLISION"
  | "POTENTIAL_UNOWNED_COMPARISON";

export type AgentLayoutValidationMode = "off" | "warn" | "error";

export interface AgentLayoutWarning {
  code: AgentLayoutWarningCode;
  message: string;
  slideIndex: number;
  nodePath: string;
  relatedNodePath?: string;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface AbsoluteNodeInfo {
  path: string;
  rect: Rect;
  zIndex?: number;
}

function hasChildren(node: PaperNode): node is PaperNode & { children: PaperNode[] } {
  return "children" in node && Array.isArray(node.children);
}

function toTextRuns(value: string | TextRun[] | undefined): TextRun[] {
  if (!value) {
    return [];
  }
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
} | null {
  if (node.type === "Text") {
    const textNode = node as PaperText;
    const runs = textNode.paragraphs
      ? paragraphsToRuns(textNode.paragraphs)
      : toTextRuns(textNode.content);
    return runs.length > 0 ? { runs, style: textNode.style } : null;
  }

  if (node.type === "View") {
    const viewNode = node as PaperView;
    const runs = viewNode.textParagraphs
      ? paragraphsToRuns(viewNode.textParagraphs)
      : toTextRuns(viewNode.textContent);
    return runs.length > 0
      ? { runs, style: viewNode.textStyle ?? viewNode.style }
      : null;
  }

  return null;
}

function getContainerRect(node: PaperNode, origin: { x: number; y: number }): Rect | null {
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

const BOUNDS_TOLERANCE = 0.5;

function rectContainsWithTolerance(outer: Rect, inner: Rect, tolerance: number): boolean {
  return (
    outer.left <= inner.left + tolerance
    && outer.top <= inner.top + tolerance
    && outer.left + outer.width >= inner.left + inner.width - tolerance
    && outer.top + outer.height >= inner.top + inner.height - tolerance
  );
}

function pushWarning(
  warnings: AgentLayoutWarning[],
  seen: Set<string>,
  warning: AgentLayoutWarning,
): void {
  const key = [
    warning.code,
    warning.slideIndex,
    warning.nodePath,
    warning.relatedNodePath ?? "",
  ].join("|");
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  warnings.push(warning);
}

function warnOnParentBounds(
  node: PaperNode,
  slideIndex: number,
  nodePath: string,
  parentPath: string,
  origin: { x: number; y: number },
  parentRect: Rect | undefined,
  warnings: AgentLayoutWarning[],
  seen: Set<string>,
): void {
  if (!parentRect || node.decorative) return;
  const rect = getContainerRect(node, origin);
  if (!rect || rectContainsWithTolerance(parentRect, rect, BOUNDS_TOLERANCE)) return;
  pushWarning(warnings, seen, {
    code: "POTENTIAL_CONTAINER_CLIP",
    message: `Absolute child ${nodePath} exceeds parent container ${parentPath}.`,
    slideIndex,
    nodePath,
    relatedNodePath: parentPath,
  });
}

function warnOnTextFit(
  node: PaperNode,
  slideIndex: number,
  nodePath: string,
  origin: { x: number; y: number },
  warnings: AgentLayoutWarning[],
  seen: Set<string>,
): void {
  const payload = extractTextPayload(node);
  if (!payload) {
    return;
  }

  const rect = getContainerRect(node, origin);
  if (!rect) {
    return;
  }

  const { runs, style } = payload;
  const fitPolicy = style?.textFit?.policy ?? "strict";
  const insetWidth = (style?.textInsets?.left ?? 0) + (style?.textInsets?.right ?? 0);
  const insetHeight = (style?.textInsets?.top ?? 0) + (style?.textInsets?.bottom ?? 0);
  const availableWidth = Math.max(0, rect.width - insetWidth);
  const availableHeight = Math.max(0, rect.height - insetHeight);
  const autoFit = computePolicyAutoFit(runs, style, availableWidth, availableHeight);
  const largestFont = maxFontSize(runs, style);
  const nominalLineHeight = style?.lineHeight ?? largestFont * 1.2;
  const metrics = calculateRichTextMetrics(runs, style, availableWidth);
  const lineCount = fitPolicy === "fitFontSize" && autoFit.lineCount !== undefined
    ? autoFit.lineCount
    : metrics.lineCount;
  const maxLines = style?.textFit?.maxLines;
  const unexpectedWrap = maxLines !== undefined && lineCount > maxLines;
  const minReadableWidth = minReadableTextWidth(runs, style);
  const contentLength = textCharCount(runs);
  const tightWrap = availableWidth < minReadableWidth
    && (lineCount > 1 || (contentLength >= 4 && autoFit.fontScale < 100000));
  const hasUnbreakableString = runs.some((run) => (
    hasUnbreakableTextSegment(run.text, style, availableWidth)
  ));

  if (fitPolicy !== "overflow" && hasUnbreakableString) {
    pushWarning(warnings, seen, {
      code: "POTENTIAL_UNBREAKABLE_STRING",
      message: `Text contains a segment wider than ${Math.round(availableWidth)}px at ${nodePath}; break-anywhere fallback will be applied.`,
      slideIndex,
      nodePath,
    });
  }

  if (fitPolicy !== "overflow" && (autoFit.overflow || unexpectedWrap)) {
    pushWarning(warnings, seen, {
      code: "POTENTIAL_OVERFLOW",
      message: unexpectedWrap
        ? `Text wraps to ${lineCount} lines, exceeding maxLines=${maxLines} at ${nodePath}.`
        : `Text may overflow its ${availableWidth}x${availableHeight} container at ${nodePath}.`,
      slideIndex,
      nodePath,
    });
  }

  if (fitPolicy !== "overflow" && tightWrap) {
    pushWarning(warnings, seen, {
      code: "POTENTIAL_TIGHT_WRAP",
      message: `Text wraps in a cramped ${Math.round(availableWidth)}px column; needs about ${Math.round(minReadableWidth)}px for readable wrapping at ${nodePath}.`,
      slideIndex,
      nodePath,
    });
  }

  if (fitPolicy !== "overflow" && availableHeight < nominalLineHeight * 0.95) {
    pushWarning(warnings, seen, {
      code: "POTENTIAL_CLIP",
      message: `Text line height may clip inside its ${availableWidth}x${availableHeight} container at ${nodePath}.`,
      slideIndex,
      nodePath,
    });
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width
    && a.left + a.width > b.left
    && a.top < b.top + b.height
    && a.top + a.height > b.top
  );
}

function collectAbsoluteSiblingInfo(
  nodes: PaperNode[],
  origin: { x: number; y: number },
  parentPath: string,
): AbsoluteNodeInfo[] {
  return nodes.flatMap((node, index) => {
    const path = `${parentPath}[${index}]`;
    const rect = getContainerRect(node, origin);
    return rect
      ? [{
          path,
          rect,
          zIndex: node.style?.zIndex,
        }]
      : [];
  });
}

function walkNodes(
  nodes: PaperNode[],
  slideIndex: number,
  origin: { x: number; y: number },
  parentPath: string,
  warnings: AgentLayoutWarning[],
  seen: Set<string>,
  parentRect?: Rect,
): void {
  nodes.forEach((node, index) => {
    if (node.type === "View" && node.altText?.includes("overflow")) {
      pushWarning(warnings, seen, {
        code: "POTENTIAL_OVERFLOW",
        message: `Measured content demand exceeds the assigned register field at ${parentPath}[${index}].`,
        slideIndex,
        nodePath: `${parentPath}[${index}]`,
      });
    }
  });
  const absoluteSiblings = collectAbsoluteSiblingInfo(nodes, origin, parentPath);
  for (let index = 0; index < absoluteSiblings.length; index += 1) {
    const current = absoluteSiblings[index];
    if (current.zIndex !== undefined) {
      continue;
    }
    for (let otherIndex = index + 1; otherIndex < absoluteSiblings.length; otherIndex += 1) {
      const other = absoluteSiblings[otherIndex];
      if (other.zIndex !== undefined || !rectsOverlap(current.rect, other.rect)) {
        continue;
      }
      pushWarning(warnings, seen, {
        code: "POTENTIAL_COLLISION",
        message: `Absolutely positioned nodes ${current.path} and ${other.path} overlap without zIndex separation.`,
        slideIndex,
        nodePath: current.path,
        relatedNodePath: other.path,
      });
    }
  }

  nodes.forEach((node, index) => {
    const nodePath = `${parentPath}[${index}]`;
    warnOnParentBounds(node, slideIndex, nodePath, parentPath, origin, parentRect, warnings, seen);
    warnOnTextFit(node, slideIndex, nodePath, origin, warnings, seen);

    if (!hasChildren(node)) {
      return;
    }

    const rect = getContainerRect(node, origin);
    const nextOrigin = rect
      ? { x: rect.left, y: rect.top }
      : origin;
    walkNodes(node.children, slideIndex, nextOrigin, `${nodePath}.children`, warnings, seen, rect ?? parentRect);
  });
}

function validateSlideLayout(slide: PaperSlide, slideIndex: number): AgentLayoutWarning[] {
  const warnings: AgentLayoutWarning[] = [];
  const seen = new Set<string>();
  walkNodes(slide.children, slideIndex, { x: 0, y: 0 }, `slides[${slideIndex}].children`, warnings, seen);
  return warnings;
}

export function validateAgentDocumentLayout(document: PaperDocument): AgentLayoutWarning[] {
  return document.slides.flatMap((slide, slideIndex) => validateSlideLayout(slide, slideIndex));
}
