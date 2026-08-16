import type { LayoutNode } from "../layout/extract.js";
import { computePolicyAutoFit, type AutoFitResult } from "../typography/autoFit.js";
import { calculateRichTextMetrics } from "../typography/richMetrics.js";
import { applyBreakAnywhereFallback, splitGraphemes } from "../typography/breakAnywhere.js";
import type { Paragraph, TextRun, TextStyle } from "../types/ast.js";

type RichTextRun = TextRun;

function truncateTextToFit(
  text: string,
  textStyle: TextStyle | undefined,
  width: number,
  height: number,
  marker = "…",
): string {
  const chars = splitGraphemes(text);
  const fits = (value: string): boolean => {
    const metrics = calculateRichTextMetrics([{ text: value }], textStyle, width);
    return metrics.height <= height && metrics.maxLineWidth <= width;
  };
  if (fits(text)) return text;
  if (chars.length === 0) return "";

  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${chars.slice(0, mid).join("").trimEnd()}${marker}`;
    if (fits(candidate)) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? marker : `${chars.slice(0, lo).join("").trimEnd()}${marker}`;
}

function scaleTextStyle(style: TextStyle | undefined, scale: number): void {
  if (!style || scale >= 0.999) return;
  const baseFontSize = style.fontSize ?? 16;
  style.fontSize = baseFontSize * scale;
  if (style.lineHeight !== undefined && style.lineHeight >= 4) {
    style.lineHeight *= scale;
  }
}

function scaleRuns(runs: RichTextRun[], scale: number, fallbackFontSize: number): RichTextRun[] {
  if (scale >= 0.999) return runs;
  return runs.map((run) => {
    if (!run.style?.fontSize) return run;
    return {
      ...run,
      style: {
        ...run.style,
        fontSize: (run.style.fontSize ?? fallbackFontSize) * scale,
      },
    };
  });
}

function applyDeterministicFitFontSize(params: {
  node: LayoutNode & {
    autoFit?: boolean;
    _autoFitResult?: AutoFitResult;
  };
  textStyle: TextStyle | undefined;
  content: string | RichTextRun[] | undefined;
  writeContent: (value: string | RichTextRun[]) => void;
}): void {
  const result = params.node._autoFitResult;
  if (!result) return;

  const scale = result.fontScale / 100000;
  if (scale >= 0.999) {
    params.node.autoFit = false;
    return;
  }

  const fallbackFontSize = params.textStyle?.fontSize ?? 16;
  scaleTextStyle(params.textStyle, scale);
  if (Array.isArray(params.content)) {
    params.writeContent(scaleRuns(params.content, scale, fallbackFontSize));
  }

  // Renderer portability: do not rely on each Office-compatible renderer to
  // interpret a:normAutofit/fontScale identically. Emit the resolved size.
  params.node.autoFit = false;
}

function applyTextFitToNode(params: {
  node: LayoutNode & {
    autoFit?: boolean;
    content?: string | TextRun[];
    textContent?: string | TextRun[];
    _autoFitResult?: AutoFitResult;
  };
  textStyle: TextStyle | undefined;
  content: string | TextRun[] | undefined;
  writeContent: (value: string | TextRun[]) => void;
}): void {
  const { node, textStyle, content, writeContent } = params;
  const insets = textStyle?.textInsets;
  const effectiveWidth = node.layout.width - (insets?.left ?? 0) - (insets?.right ?? 0);
  const effectiveHeight = node.layout.height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
  const width = Math.max(0, effectiveWidth);
  const height = Math.max(0, effectiveHeight);
  const policy = textStyle?.textFit?.policy;

  const breakableContent = policy !== "overflow" && typeof content === "string"
    ? applyBreakAnywhereFallback(content, textStyle, width)
    : content;
  if (breakableContent !== undefined && breakableContent !== content) {
    writeContent(breakableContent);
  }

  if (policy === "truncate" && typeof breakableContent === "string") {
    const truncated = truncateTextToFit(
      breakableContent,
      textStyle,
      width,
      height,
      textStyle?.textFit?.marker ?? "…",
    );
    writeContent(truncated);
    return;
  }

  if (node.autoFit || policy === "fitFontSize") {
    node._autoFitResult = computePolicyAutoFit(
      breakableContent ?? "",
      textStyle,
      width,
      height,
    );
    if (policy === "fitFontSize") {
      applyDeterministicFitFontSize({ node, textStyle, content: breakableContent, writeContent });
      if (node._autoFitResult?.overflow && typeof breakableContent === "string") {
        writeContent(truncateTextToFit(breakableContent, textStyle, width, height));
      }
    }
  }

  if (policy === "fitHeight") {
    const metrics = calculateRichTextMetrics(
      typeof breakableContent === "string" ? [{ text: breakableContent }] : breakableContent ?? [],
      textStyle,
      width,
    );
    const requiredHeight = metrics.height + (insets?.top ?? 0) + (insets?.bottom ?? 0);
    if (requiredHeight > node.layout.height) {
      node.layout.height = requiredHeight;
    }
  }
}

export function applyAutoFit(node: LayoutNode): void {
  if (node.type === "Text") {
    const textNode = node as LayoutNode & {
      autoFit?: boolean;
      content?: string | TextRun[];
      _autoFitResult?: AutoFitResult;
    };
    applyTextFitToNode({
      node: textNode,
      textStyle: node.style as TextStyle | undefined,
      content: textNode.content,
      writeContent: (value) => {
        textNode.content = value;
      },
    });
  } else if (node.type === "View") {
    const viewNode = node as LayoutNode & {
      textContent?: string | TextRun[];
      textParagraphs?: Paragraph[];
      textStyle?: TextStyle;
      _autoFitResult?: AutoFitResult;
    };
    if (viewNode.textContent !== undefined || viewNode.textParagraphs !== undefined) {
      applyTextFitToNode({
        node: viewNode,
        textStyle: viewNode.textStyle,
        content: viewNode.textContent,
        writeContent: (value) => {
          viewNode.textContent = value;
        },
      });
    }
  }

  if (node.children) {
    for (const child of node.children) {
      applyAutoFit(child);
    }
  }
}
