import type { InternalAutoFitPolicy, LayoutMetrics } from "../../layout/extract.js";
import type { Paragraph, TextRun, TextStyle } from "../../types/ast.js";
import { computeAutoFit, type AutoFitResult } from "../../typography/autoFit.js";
import { calculateRichTextMetrics } from "../../typography/richMetrics.js";

const OVERFLOW_TOLERANCE = 0.98;

function flattenParagraphs(paragraphs: Paragraph[]): TextRun[] {
  const runs: TextRun[] = [];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) runs.push({ text: "\n" });
    runs.push(...paragraph.runs);
  });
  return runs;
}

export function resolveConditionalAutoFit(
  paragraphs: Paragraph[],
  textStyle: TextStyle | undefined,
  layout: LayoutMetrics,
  existingAutoFitResult?: AutoFitResult,
): AutoFitResult | undefined {
  if (
    existingAutoFitResult &&
    Number.isFinite(existingAutoFitResult.fontScale) &&
    Number.isFinite(existingAutoFitResult.lnSpcReduction)
  ) {
    return existingAutoFitResult;
  }

  const insets = textStyle?.textInsets;
  const availableWidth = layout.width - (insets?.left ?? 0) - (insets?.right ?? 0);
  const availableHeight = layout.height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
  if (availableWidth <= 0 || availableHeight <= 0) return undefined;

  const runs = flattenParagraphs(paragraphs);
  const metrics = calculateRichTextMetrics(runs, textStyle, availableWidth);
  if (metrics.height <= availableHeight * OVERFLOW_TOLERANCE) {
    return undefined;
  }

  return computeAutoFit(runs, textStyle, availableWidth, availableHeight, {
    maxLines: textStyle?.textFit?.maxLines,
  });
}

export interface ResolvedAutoFitPolicy {
  policy: InternalAutoFitPolicy;
  autoFitResult?: AutoFitResult;
}

export function resolveAutoFitPolicy(params: {
  paragraphs: Paragraph[];
  textStyle: TextStyle | undefined;
  layout: LayoutMetrics;
  existingAutoFitResult?: AutoFitResult;
  requestedPolicy?: InternalAutoFitPolicy;
}): ResolvedAutoFitPolicy {
  const {
    paragraphs,
    textStyle,
    layout,
    existingAutoFitResult,
    requestedPolicy,
  } = params;

  if (requestedPolicy === "none") {
    return { policy: "none" };
  }

  if (
    existingAutoFitResult &&
    Number.isFinite(existingAutoFitResult.fontScale) &&
    Number.isFinite(existingAutoFitResult.lnSpcReduction)
  ) {
    return { policy: "shrink_text", autoFitResult: existingAutoFitResult };
  }

  if (requestedPolicy === "engine_conditional") {
    const conditional = resolveConditionalAutoFit(paragraphs, textStyle, layout, existingAutoFitResult);
    if (conditional) return { policy: "shrink_text", autoFitResult: conditional };
    return { policy: "office_default" };
  }

  if (requestedPolicy === "grow_shape") {
    return { policy: "grow_shape" };
  }

  return { policy: requestedPolicy ?? "office_default" };
}

export function emitAutoFitXml(resolved: ResolvedAutoFitPolicy): string {
  if (resolved.policy === "shrink_text" && resolved.autoFitResult) {
    return `<a:normAutofit fontScale="${resolved.autoFitResult.fontScale}" lnSpcReduction="${resolved.autoFitResult.lnSpcReduction}"/>`;
  }
  if (resolved.policy === "office_default" || resolved.policy === "engine_conditional") {
    // The explicit default rather than a bare `<a:normAutofit/>`. Both are legal
    // and mean the same thing, but the engine's own quality rule and its
    // repairer both ask for the attribute to be written — so omitting it made
    // `repair` report a change on every deck this writer produced, which put a
    // loss in the ledger for a file that was never defective.
    return '<a:normAutofit fontScale="100000"/>';
  }
  return "";
}
