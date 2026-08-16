import type {
  CompatibilityIssue,
  InternalAutoFitPolicy,
  LayoutCompatibilityMeta,
  LayoutNode,
  LayoutSlide,
  LayoutText,
  LayoutView,
  PptxCompatibilityMode,
} from "../layout/extract.js";
import type { Paragraph, TextRun, TextStyle } from "../types/ast.js";
import { computeClassicChartLayout, resolveClassicLegendPosition } from "../ooxml/chart/chartLayout.js";
import { isChartExType } from "../ooxml/chart/chartCapabilities.js";
import { getFontSubstitutions } from "../typography/fontCache.js";
import { runLayout } from "../layout/index.js";
import { applyGhostGrid } from "../layout/ghostGrid.js";
import { applyVisualOrder } from "../layout/visualOrder.js";
import type { PaperDocument } from "../types/ast.js";
import { DEFAULT_SLIDE_HEIGHT_PX, DEFAULT_SLIDE_WIDTH_PX } from "../ooxml/constants.js";
import { autoLoadDocumentFonts } from "../typography/autoFont.js";
import { hasVisualProperties } from "./shared.js";
import type { ResolvedFontIdentity } from "../typography/fontRegistry.js";

const APPROVED_NATIVE_FONTS = new Set([
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Courier New",
  "Aptos",
  "Carlito",
  "Liberation Sans",
  "Liberation Mono",
  "Gelasio",
  "Source Sans 3",
]);

export interface SlideCompatibilityReport {
  slideIndex: number;
  compatibilityVerdict: PptxCompatibilityMode;
  fallbackReason?: string;
  issues: CompatibilityIssue[];
  fontSubstitutions: Record<string, string>;
  fonts: string[];
  pixelGateEligible: boolean;
}

export interface DocumentCompatibilityReport {
  compatibilityVerdict: PptxCompatibilityMode;
  slides: SlideCompatibilityReport[];
  fontSubstitutions: Record<string, string>;
  pixelGateEligible: boolean;
}

function pushIssue(list: CompatibilityIssue[], issue: CompatibilityIssue): void {
  if (!list.some(existing => existing.code === issue.code && existing.message === issue.message)) {
    list.push(issue);
  }
}

function getPadding(style: LayoutNode["style"]): { top: number; right: number; bottom: number; left: number } {
  const padding = style?.padding ?? 0;
  return {
    top: style?.paddingTop ?? padding,
    right: style?.paddingRight ?? padding,
    bottom: style?.paddingBottom ?? padding,
    left: style?.paddingLeft ?? padding,
  };
}

function cloneRunsWithParentStyle(node: LayoutText): TextRun[] {
  if (Array.isArray(node.content)) {
    return node.content.map((run) => ({
      ...run,
      style: { ...(node.style ?? {}), ...(run.style ?? {}) },
    }));
  }
  const text = typeof node.content === "string" ? node.content : "";
  return [{ text, style: { ...(node.style ?? {}) } }];
}

function textNodeToParagraphs(node: LayoutText): Paragraph[] {
  if (node.paragraphs?.length) {
    return node.paragraphs.map((paragraph) => ({
      ...paragraph,
      runs: paragraph.runs.map((run) => ({
        ...run,
        style: { ...(node.style ?? {}), ...(run.style ?? {}) },
      })),
    }));
  }
  return [{ runs: cloneRunsWithParentStyle(node), align: node.style?.textAlign }];
}

function isEligibleSingleFrameCard(node: LayoutView): boolean {
  if (node.textContent !== undefined || (node.textParagraphs && node.textParagraphs.length > 0)) return false;
  if (!node.children || node.children.length < 2) return false;
  if (!hasVisualProperties(node)) return false;
  if (!(node.layout.width > 0 && node.layout.height > 0)) return false;
  if (node.style?.position === "absolute" && (node.style.width === undefined || node.style.height === undefined)) return false;

  return node.children.every((child) => {
    if (child.type !== "Text") return false;
    if (child.style?.display === "none") return false;
    return !child.children?.length;
  });
}

function collapseCardText(node: LayoutView, issues: CompatibilityIssue[]): void {
  const children = (node.children ?? []) as LayoutText[];
  const ordered = [...children].sort((a, b) => {
    if (Math.abs(a.layout.y - b.layout.y) > 1) return a.layout.y - b.layout.y;
    return a.layout.x - b.layout.x;
  });
  const padding = getPadding(node.style);
  const firstStyle = ordered[0].style ?? {};
  const textStyle: TextStyle = {
    ...node.textStyle,
    fontFamily: node.textStyle?.fontFamily ?? firstStyle.fontFamily ?? "Arial",
    fontSize: node.textStyle?.fontSize ?? firstStyle.fontSize ?? 12,
    color: node.textStyle?.color ?? firstStyle.color ?? "#000000",
    fontWeight: node.textStyle?.fontWeight ?? firstStyle.fontWeight,
    fontStyle: node.textStyle?.fontStyle ?? firstStyle.fontStyle,
    verticalAlign: node.style?.justifyContent === "center" ? "middle" : "top",
    textInsets: {
      left: node.textStyle?.textInsets?.left ?? padding.left,
      right: node.textStyle?.textInsets?.right ?? padding.right,
      top: node.textStyle?.textInsets?.top ?? padding.top,
      bottom: node.textStyle?.textInsets?.bottom ?? padding.bottom,
    },
  };

  let prevBottom = node.layout.y + padding.top;
  const textParagraphs: Paragraph[] = [];
  for (const child of ordered) {
    const paras = textNodeToParagraphs(child);
    const gapPx = Math.max(0, child.layout.y - prevBottom);
    prevBottom = child.layout.y + child.layout.height;
    paras.forEach((paragraph, index) => {
      textParagraphs.push({
        ...paragraph,
        align: paragraph.align ?? child.style?.textAlign,
        spaceBefore: textParagraphs.length === 0 && index === 0 ? paragraph.spaceBefore : (paragraph.spaceBefore ?? gapPx * 0.75),
      });
    });
    child.style = { ...(child.style ?? {}), display: "none" };
    child._compatibility = {
      mode: "native_anchored",
      reason: "Collapsed into parent card text frame.",
      textCompositionMode: "single_frame_card",
      autoFitPolicy: "office_default",
    };
  }

  node.textParagraphs = textParagraphs;
  node.textStyle = textStyle;
  node._autoFitResult = undefined;
  node._compatibility = {
    mode: "native_anchored",
    reason: "Collapsed simple card text stack into a single PowerPoint text frame.",
    textCompositionMode: "single_frame_card",
    autoFitPolicy: "office_default",
  };
  pushIssue(issues, {
    code: "text:single-frame-card",
    message: "Collapsed a card-style text stack into a single text frame for PowerPoint stability.",
    severity: "info",
    issueClass: "text_overflow_risk",
    fallbackLevel: "native_anchored",
    remediation: "Group related card copy into a single text frame when strict editability is required.",
  });
}

function inferChartMode(node: LayoutNode, issues: CompatibilityIssue[]): LayoutCompatibilityMeta | undefined {
  if (node.type !== "Chart") return undefined;
  const frame = { width: node.layout.width, height: node.layout.height };
  const chartData = node.chartData;
  const layout = computeClassicChartLayout(chartData, frame);
  const requestedLegend = chartData.legend?.position ?? "bottom";
  const legendPosition = resolveClassicLegendPosition(chartData, frame);
  const widthRatio = layout?.plotArea.w ?? 1;
  const heightRatio = layout?.plotArea.h ?? 1;

  const unsafeSmallChart = !isChartExType(chartData.chartType) && frame.height < 120;
  const unsafeRightLegend = requestedLegend === "right" && legendPosition !== "right";
  const heightUtilizationFloor = legendPosition === "bottom" ? 0.36 : 0.5;
  const lowUtilization = widthRatio < 0.8 || heightRatio < heightUtilizationFloor;
  const chartEx = isChartExType(chartData.chartType);

  let mode: PptxCompatibilityMode = "native_safe";
  let reason = "Chart is inside the native-safe contract.";
  let fallbackReason: string | undefined;

  if (chartEx) {
    mode = "native_anchored";
    reason = "ChartEx stays editable but is treated as native-anchored for compatibility.";
  }
  if (unsafeSmallChart || unsafeRightLegend || lowUtilization) {
    mode = "visual_fallback";
    fallbackReason = unsafeSmallChart
      ? "Chart frame is too short for reliable native layout."
      : unsafeRightLegend
        ? "Right legend would over-constrain plot area on Office for Mac."
        : "Chart plot utilization fell below the native-safe threshold.";
    reason = fallbackReason;
    pushIssue(issues, {
      code: "chart:fallback",
      message: fallbackReason,
      severity: "warning",
      issueClass: "chart_layout_risk",
      fallbackLevel: "visual_fallback",
      remediation: unsafeSmallChart
        ? "Increase the chart height above 120px to preserve editable native chart output."
        : unsafeRightLegend
          ? "Move the legend away from the right edge or widen the chart frame for reliable native layout."
          : "Increase plot area utilization or switch to visual_safe mode for deterministic output.",
    });
  }

  return {
    mode,
    reason,
    fallbackReason,
    chartUtilization: {
      widthRatio: Math.round(widthRatio * 10000) / 10000,
      heightRatio: Math.round(heightRatio * 10000) / 10000,
    },
  };
}

function collectFontsFromRuns(runs: TextRun[] | undefined, fonts: Set<string>, fallback?: string): void {
  if (!runs) return;
  for (const run of runs) {
    fonts.add(run.style?.fontFamily ?? fallback ?? "Arial");
  }
}

function collectFonts(node: LayoutNode, fonts: Set<string>): void {
  if (node.type === "Text") {
    if (node.style?.fontFamily) fonts.add(node.style.fontFamily);
    collectFontsFromRuns(Array.isArray(node.content) ? node.content : undefined, fonts, node.style?.fontFamily);
    for (const paragraph of node.paragraphs ?? []) collectFontsFromRuns(paragraph.runs, fonts, node.style?.fontFamily);
  }
  if (node.type === "View") {
    if (node.textStyle?.fontFamily) fonts.add(node.textStyle.fontFamily);
    for (const paragraph of node.textParagraphs ?? []) collectFontsFromRuns(paragraph.runs, fonts, node.textStyle?.fontFamily);
  }
  if (node.children) {
    node.children.forEach(child => collectFonts(child, fonts));
  }
}

function collectResolvedFontIdentities(
  value: unknown,
  identities: ResolvedFontIdentity[],
  seen = new Set<object>(),
): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectResolvedFontIdentities(item, identities, seen);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if ((key === "resolvedFont" || key.endsWith("ResolvedFont")) && nested && typeof nested === "object") {
      identities.push(nested as ResolvedFontIdentity);
    } else {
      collectResolvedFontIdentities(nested, identities, seen);
    }
  }
}

function scoreVisualTextDensity(node: LayoutNode): number {
  if (!node.children?.length) return 0;
  let score = 0;
  for (const child of node.children) {
    if (child.type === "Text" && child.style?.display !== "none") score += 1;
    score += scoreVisualTextDensity(child);
  }
  return score;
}

function isValidatedAgentComposition(node: LayoutNode): boolean {
  return node.type === "View"
    && typeof node.altText === "string"
    && node.altText.startsWith("Agent ");
}

function maxCompatibilityMode(a: PptxCompatibilityMode, b: PptxCompatibilityMode): PptxCompatibilityMode {
  if (a === "visual_fallback" || b === "visual_fallback") return "visual_fallback";
  if (a === "native_anchored" || b === "native_anchored") return "native_anchored";
  return "native_safe";
}

function collectWorstNodeMode(node: LayoutNode): PptxCompatibilityMode {
  let mode = node._compatibility?.mode ?? "native_safe";
  for (const child of node.children ?? []) {
    mode = maxCompatibilityMode(mode, collectWorstNodeMode(child));
  }
  return mode;
}

function annotateNode(node: LayoutNode, slideIssues: CompatibilityIssue[], inheritedInsideVisual = false): void {
  node._insideVisualView = node._insideVisualView || inheritedInsideVisual;

  if (node.type === "View" && isEligibleSingleFrameCard(node)) {
    collapseCardText(node, slideIssues);
  }

  const chartMeta = inferChartMode(node, slideIssues);
  if (chartMeta) {
    node._compatibility = {
      ...(node._compatibility ?? {}),
      ...chartMeta,
    };
  }

  if (node.type === "Text") {
    const autoFitPolicy: InternalAutoFitPolicy = node._insideVisualView ? "office_default" : (node.autoFit ? "engine_conditional" : "office_default");
    node._compatibility = {
      ...(node._compatibility ?? { mode: "native_safe" }),
      mode: node._compatibility?.mode ?? "native_safe",
      textCompositionMode: "shape_per_text",
      autoFitPolicy,
    };
  }

  if (node.type === "View" && (node.textParagraphs?.length || node.textContent !== undefined)) {
    node._compatibility = {
      ...(node._compatibility ?? { mode: "native_anchored" }),
      mode: node._compatibility?.mode ?? "native_anchored",
      textCompositionMode: node._compatibility?.textCompositionMode ?? "single_frame_card",
      autoFitPolicy: node._compatibility?.autoFitPolicy ?? "office_default",
    };
  }

  const childInsideVisual = inheritedInsideVisual || hasVisualProperties(node);
  node.children?.forEach(child => annotateNode(child, slideIssues, childInsideVisual));
}

export function applyPptxCompatibility(slideTree: LayoutSlide, slideIndex: number): SlideCompatibilityReport {
  const issues: CompatibilityIssue[] = [];
  annotateNode(slideTree, issues);

  const denseVisualViews = (slideTree.children ?? []).filter((child) =>
    child.type === "View" &&
    hasVisualProperties(child) &&
    scoreVisualTextDensity(child) >= 4 &&
    !isValidatedAgentComposition(child) &&
    child._compatibility?.textCompositionMode !== "single_frame_card",
  );
  if (denseVisualViews.length > 0) {
    slideTree._compatibility = {
      mode: "visual_fallback",
      reason: "Slide contains dense multi-shape visual text groups that remain risky in PowerPoint.",
      fallbackReason: "dense_visual_text",
    };
    pushIssue(issues, {
      code: "slide:visual-fallback",
      message: "Marked slide for deterministic visual fallback because dense card text could not be collapsed safely.",
      severity: "warning",
      issueClass: "text_overflow_risk",
      fallbackLevel: "visual_fallback",
      remediation: "Reduce dense multi-shape card text or convert it into a single text frame to keep the slide editable.",
    });
  } else if (!slideTree._compatibility) {
    slideTree._compatibility = { mode: "native_safe", reason: "Slide stayed within the native-safe contract." };
  }

  slideTree._compatibility.mode = maxCompatibilityMode(
    slideTree._compatibility.mode,
    collectWorstNodeMode(slideTree),
  );

  const fonts = new Set<string>();
  collectFonts(slideTree, fonts);
  const resolvedIdentities: ResolvedFontIdentity[] = [];
  collectResolvedFontIdentities(slideTree, resolvedIdentities);
  for (const identity of resolvedIdentities) {
    for (const diagnostic of identity.diagnostics ?? []) {
      pushIssue(issues, {
        code: diagnostic.code,
        message: diagnostic.message,
        severity: "warning",
        issueClass: "font_substitution_risk",
        fallbackLevel: "native_anchored",
        remediation: diagnostic.code === "FONT_SYSTEM_OPT_IN"
          ? "Install the exact named fonts in every render and viewer environment, or use visual fallback for deterministic output."
          : diagnostic.code === "FONT_EMBEDDING_UNAVAILABLE"
            ? "Use fontStrategy=\"system\" until a validated PowerPoint EOT/MicroType Express encoder is configured."
          : "Supply an admitted face with the required variant and script coverage.",
      });
    }
  }
  const unapprovedFonts = [...fonts].filter(font => !APPROVED_NATIVE_FONTS.has(font));
  for (const font of unapprovedFonts) {
    pushIssue(issues, {
      code: "font:unapproved",
      message: `Font "${font}" is outside the approved native font profile for Mac validation.`,
      severity: "warning",
      issueClass: "font_substitution_risk",
      fallbackLevel: "native_anchored",
      remediation: `Embed or replace "${font}" with an approved desktop font when strict editability matters.`,
    });
    if (slideTree._compatibility.mode === "native_safe") {
      slideTree._compatibility.mode = "native_anchored";
      slideTree._compatibility.reason = "Slide uses non-profile fonts and is treated as native-anchored.";
    }
  }

  return {
    slideIndex,
    compatibilityVerdict: slideTree._compatibility.mode,
    fallbackReason: slideTree._compatibility.fallbackReason,
    issues,
    fontSubstitutions: getFontSubstitutions(),
    fonts: [...fonts].sort(),
    pixelGateEligible: resolvedIdentities.every((identity) => identity.pixelGateEligible),
  };
}

export function summarizeDocumentCompatibility(
  slides: SlideCompatibilityReport[],
): DocumentCompatibilityReport {
  const compatibilityVerdict = slides.some(slide => slide.compatibilityVerdict === "visual_fallback")
    ? "visual_fallback"
    : slides.some(slide => slide.compatibilityVerdict === "native_anchored")
      ? "native_anchored"
      : "native_safe";

  return {
    compatibilityVerdict,
    slides,
    fontSubstitutions: getFontSubstitutions(),
    pixelGateEligible: slides.every((slide) => slide.pixelGateEligible),
  };
}

export async function analyzeDocumentCompatibility(doc: PaperDocument): Promise<DocumentCompatibilityReport> {
  await autoLoadDocumentFonts(doc);
  const width = doc.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX;
  const height = doc.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX;
  const slides: SlideCompatibilityReport[] = [];

  for (let i = 0; i < doc.slides.length; i++) {
    const layoutTree = await runLayout(doc.slides[i], width, height);
    applyGhostGrid(layoutTree);
    applyVisualOrder(layoutTree);
    slides.push(applyPptxCompatibility(layoutTree as LayoutSlide, i));
  }

  return summarizeDocumentCompatibility(slides);
}
