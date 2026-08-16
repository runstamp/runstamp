import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  computeClassicChartLayout,
  isChartExType,
  resolveClassicLegendPosition
} from "./chunk-JRK4KXDV.js";
import {
  autoLoadDocumentFonts
} from "./chunk-MVPJ57UB.js";
import {
  applyGhostGrid,
  runLayout
} from "./chunk-5QLWVG23.js";
import {
  getFontSubstitutions
} from "./chunk-IQGCGBYO.js";
import {
  DEFAULT_SLIDE_HEIGHT_PX,
  DEFAULT_SLIDE_WIDTH_PX
} from "./chunk-XU7YQ73E.js";
import {
  RunstampFeatureError
} from "./chunk-SFVKAOLH.js";

// src/feature-gate.ts
var IS_PRO = true;
var FREE_CHART_TYPES = [
  "bar",
  "line",
  "pie",
  "doughnut",
  "area",
  "scatter"
];
var FREE_SHAPE_COUNT = 40;
var LITE_IMAGE_MAX_WIDTH = 400;
var FREE_IMAGE_MAX_WIDTH = LITE_IMAGE_MAX_WIDTH;
var MAX_IMAGE_WIDTH = 3840;
var PRO_IMAGE_MAX_WIDTH = MAX_IMAGE_WIDTH;
var FREE_XLSX_CHART_TYPES = ["bar", "col", "line", "pie", "scatter"];
var PPTX_PRO_FEATURES = /* @__PURE__ */ new Set([
  "harfbuzz-typography",
  "chartex-types",
  "potx-templates",
  "smartart-diagrams",
  "multi-master",
  "pvce-collision",
  "elastic-pagination",
  "canvas-preview",
  "web-video-embedding"
]);
var DOCX_PRO_FEATURES = /* @__PURE__ */ new Set([
  "docx:pagination:engine",
  "docx:track-changes:generate",
  "docx:comments:serialize",
  "docx:compliance:validate",
  "docx:accessibility:audit",
  "docx:visual-polish:apply"
]);
var XLSX_PRO_FEATURES = /* @__PURE__ */ new Set([
  "template-assembly",
  "repair-pipeline",
  "advanced-chart-types"
]);
var PDF_PRO_FEATURES = /* @__PURE__ */ new Set([
  "embedded-fonts-and-complex-shaping",
  "pdfa-archival",
  "digital-signatures",
  "pdf-linearization",
  "tagged-accessibility"
]);
function isFeatureAvailable(feature, mode) {
  if (mode === "full" || mode === "pro") return true;
  const inLiteBundle = {
    "yoga-layout": true,
    "editable-excel-charts": true,
    "agent-document-schema": true,
    "basic-font-metrics": true,
    "basic-quality-check": true,
    "single-master": true,
    "greedy-line-break": true,
    "knuth-plass": true,
    "slide-to-image-thumbnail": true,
    "harfbuzz-typography": false,
    "chartex-types": false,
    "potx-templates": false,
    "smartart-diagrams": false,
    "multi-master": false,
    "pvce-collision": false,
    "elastic-pagination": false,
    "canvas-preview": false,
    "web-video-embedding": false
  };
  return inLiteBundle[feature] ?? false;
}
function validateImageRenderOptions(options, _mode) {
  const requestedWidth = options?.width;
  if (requestedWidth !== void 0 && requestedWidth > MAX_IMAGE_WIDTH) {
    throw new RunstampFeatureError(
      `Image width ${String(requestedWidth)}px exceeds the maximum ${String(MAX_IMAGE_WIDTH)}px.`,
      "slide-to-image"
    );
  }
}

// src/layout/visualOrder.ts
function applyVisualOrder(node) {
  if (!node.children || node.children.length <= 1) return;
  for (const child of node.children) {
    applyVisualOrder(child);
  }
  const indexed = node.children.map((child, i) => ({ child, i }));
  indexed.sort((a, b) => {
    const za = a.child.style?.zIndex ?? 0;
    const zb = b.child.style?.zIndex ?? 0;
    if (za !== zb) return za - zb;
    const ra = "readingOrder" in a.child ? a.child.readingOrder ?? Infinity : Infinity;
    const rb = "readingOrder" in b.child ? b.child.readingOrder ?? Infinity : Infinity;
    if (ra !== rb) return ra - rb;
    return a.i - b.i;
  });
  node.children = indexed.map(({ child }) => child);
}

// src/compatibility/shared.ts
function hasVisualProperties(node) {
  const style = node.style;
  if (style?.backgroundColor || style?.fill || style?.effects) return true;
  if (style?.borderWidth && style.borderWidth > 0) return true;
  if (node.type === "View") {
    if (node.shapeType || node.customGeometry || node.hyperlink || node.altText || node.decorative || node.locks) {
      return true;
    }
    if (node.textContent !== void 0 || node.textParagraphs && node.textParagraphs.length > 0) {
      return true;
    }
  }
  return node.type === "Slide" && !!node.decorative;
}

// src/compatibility/pptxCompatibility.ts
var APPROVED_NATIVE_FONTS = /* @__PURE__ */ new Set([
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
  "Source Sans 3"
]);
function pushIssue(list, issue) {
  if (!list.some((existing) => existing.code === issue.code && existing.message === issue.message)) {
    list.push(issue);
  }
}
function getPadding(style) {
  const padding = style?.padding ?? 0;
  return {
    top: style?.paddingTop ?? padding,
    right: style?.paddingRight ?? padding,
    bottom: style?.paddingBottom ?? padding,
    left: style?.paddingLeft ?? padding
  };
}
function cloneRunsWithParentStyle(node) {
  if (Array.isArray(node.content)) {
    return node.content.map((run) => ({
      ...run,
      style: { ...node.style ?? {}, ...run.style ?? {} }
    }));
  }
  const text = typeof node.content === "string" ? node.content : "";
  return [{ text, style: { ...node.style ?? {} } }];
}
function textNodeToParagraphs(node) {
  if (node.paragraphs?.length) {
    return node.paragraphs.map((paragraph) => ({
      ...paragraph,
      runs: paragraph.runs.map((run) => ({
        ...run,
        style: { ...node.style ?? {}, ...run.style ?? {} }
      }))
    }));
  }
  return [{ runs: cloneRunsWithParentStyle(node), align: node.style?.textAlign }];
}
function isEligibleSingleFrameCard(node) {
  if (node.textContent !== void 0 || node.textParagraphs && node.textParagraphs.length > 0) return false;
  if (!node.children || node.children.length < 2) return false;
  if (!hasVisualProperties(node)) return false;
  if (!(node.layout.width > 0 && node.layout.height > 0)) return false;
  if (node.style?.position === "absolute" && (node.style.width === void 0 || node.style.height === void 0)) return false;
  return node.children.every((child) => {
    if (child.type !== "Text") return false;
    if (child.style?.display === "none") return false;
    return !child.children?.length;
  });
}
function collapseCardText(node, issues) {
  const children = node.children ?? [];
  const ordered = [...children].sort((a, b) => {
    if (Math.abs(a.layout.y - b.layout.y) > 1) return a.layout.y - b.layout.y;
    return a.layout.x - b.layout.x;
  });
  const padding = getPadding(node.style);
  const firstStyle = ordered[0].style ?? {};
  const textStyle = {
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
      bottom: node.textStyle?.textInsets?.bottom ?? padding.bottom
    }
  };
  let prevBottom = node.layout.y + padding.top;
  const textParagraphs = [];
  for (const child of ordered) {
    const paras = textNodeToParagraphs(child);
    const gapPx = Math.max(0, child.layout.y - prevBottom);
    prevBottom = child.layout.y + child.layout.height;
    paras.forEach((paragraph, index) => {
      textParagraphs.push({
        ...paragraph,
        align: paragraph.align ?? child.style?.textAlign,
        spaceBefore: textParagraphs.length === 0 && index === 0 ? paragraph.spaceBefore : paragraph.spaceBefore ?? gapPx * 0.75
      });
    });
    child.style = { ...child.style ?? {}, display: "none" };
    child._compatibility = {
      mode: "native_anchored",
      reason: "Collapsed into parent card text frame.",
      textCompositionMode: "single_frame_card",
      autoFitPolicy: "office_default"
    };
  }
  node.textParagraphs = textParagraphs;
  node.textStyle = textStyle;
  node._autoFitResult = void 0;
  node._compatibility = {
    mode: "native_anchored",
    reason: "Collapsed simple card text stack into a single PowerPoint text frame.",
    textCompositionMode: "single_frame_card",
    autoFitPolicy: "office_default"
  };
  pushIssue(issues, {
    code: "text:single-frame-card",
    message: "Collapsed a card-style text stack into a single text frame for PowerPoint stability.",
    severity: "info",
    issueClass: "text_overflow_risk",
    fallbackLevel: "native_anchored",
    remediation: "Group related card copy into a single text frame when strict editability is required."
  });
}
function inferChartMode(node, issues) {
  if (node.type !== "Chart") return void 0;
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
  let mode = "native_safe";
  let reason = "Chart is inside the native-safe contract.";
  let fallbackReason;
  if (chartEx) {
    mode = "native_anchored";
    reason = "ChartEx stays editable but is treated as native-anchored for compatibility.";
  }
  if (unsafeSmallChart || unsafeRightLegend || lowUtilization) {
    mode = "visual_fallback";
    fallbackReason = unsafeSmallChart ? "Chart frame is too short for reliable native layout." : unsafeRightLegend ? "Right legend would over-constrain plot area on Office for Mac." : "Chart plot utilization fell below the native-safe threshold.";
    reason = fallbackReason;
    pushIssue(issues, {
      code: "chart:fallback",
      message: fallbackReason,
      severity: "warning",
      issueClass: "chart_layout_risk",
      fallbackLevel: "visual_fallback",
      remediation: unsafeSmallChart ? "Increase the chart height above 120px to preserve editable native chart output." : unsafeRightLegend ? "Move the legend away from the right edge or widen the chart frame for reliable native layout." : "Increase plot area utilization or switch to visual_safe mode for deterministic output."
    });
  }
  return {
    mode,
    reason,
    fallbackReason,
    chartUtilization: {
      widthRatio: Math.round(widthRatio * 1e4) / 1e4,
      heightRatio: Math.round(heightRatio * 1e4) / 1e4
    }
  };
}
function collectFontsFromRuns(runs, fonts, fallback) {
  if (!runs) return;
  for (const run of runs) {
    fonts.add(run.style?.fontFamily ?? fallback ?? "Arial");
  }
}
function collectFonts(node, fonts) {
  if (node.type === "Text") {
    if (node.style?.fontFamily) fonts.add(node.style.fontFamily);
    collectFontsFromRuns(Array.isArray(node.content) ? node.content : void 0, fonts, node.style?.fontFamily);
    for (const paragraph of node.paragraphs ?? []) collectFontsFromRuns(paragraph.runs, fonts, node.style?.fontFamily);
  }
  if (node.type === "View") {
    if (node.textStyle?.fontFamily) fonts.add(node.textStyle.fontFamily);
    for (const paragraph of node.textParagraphs ?? []) collectFontsFromRuns(paragraph.runs, fonts, node.textStyle?.fontFamily);
  }
  if (node.children) {
    node.children.forEach((child) => collectFonts(child, fonts));
  }
}
function collectResolvedFontIdentities(value, identities, seen = /* @__PURE__ */ new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectResolvedFontIdentities(item, identities, seen);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if ((key === "resolvedFont" || key.endsWith("ResolvedFont")) && nested && typeof nested === "object") {
      identities.push(nested);
    } else {
      collectResolvedFontIdentities(nested, identities, seen);
    }
  }
}
function scoreVisualTextDensity(node) {
  if (!node.children?.length) return 0;
  let score = 0;
  for (const child of node.children) {
    if (child.type === "Text" && child.style?.display !== "none") score += 1;
    score += scoreVisualTextDensity(child);
  }
  return score;
}
function isValidatedAgentComposition(node) {
  return node.type === "View" && typeof node.altText === "string" && node.altText.startsWith("Agent ");
}
function maxCompatibilityMode(a, b) {
  if (a === "visual_fallback" || b === "visual_fallback") return "visual_fallback";
  if (a === "native_anchored" || b === "native_anchored") return "native_anchored";
  return "native_safe";
}
function collectWorstNodeMode(node) {
  let mode = node._compatibility?.mode ?? "native_safe";
  for (const child of node.children ?? []) {
    mode = maxCompatibilityMode(mode, collectWorstNodeMode(child));
  }
  return mode;
}
function annotateNode(node, slideIssues, inheritedInsideVisual = false) {
  node._insideVisualView = node._insideVisualView || inheritedInsideVisual;
  if (node.type === "View" && isEligibleSingleFrameCard(node)) {
    collapseCardText(node, slideIssues);
  }
  const chartMeta = inferChartMode(node, slideIssues);
  if (chartMeta) {
    node._compatibility = {
      ...node._compatibility ?? {},
      ...chartMeta
    };
  }
  if (node.type === "Text") {
    const autoFitPolicy = node._insideVisualView ? "office_default" : node.autoFit ? "engine_conditional" : "office_default";
    node._compatibility = {
      ...node._compatibility ?? { mode: "native_safe" },
      mode: node._compatibility?.mode ?? "native_safe",
      textCompositionMode: "shape_per_text",
      autoFitPolicy
    };
  }
  if (node.type === "View" && (node.textParagraphs?.length || node.textContent !== void 0)) {
    node._compatibility = {
      ...node._compatibility ?? { mode: "native_anchored" },
      mode: node._compatibility?.mode ?? "native_anchored",
      textCompositionMode: node._compatibility?.textCompositionMode ?? "single_frame_card",
      autoFitPolicy: node._compatibility?.autoFitPolicy ?? "office_default"
    };
  }
  const childInsideVisual = inheritedInsideVisual || hasVisualProperties(node);
  node.children?.forEach((child) => annotateNode(child, slideIssues, childInsideVisual));
}
function applyPptxCompatibility(slideTree, slideIndex) {
  const issues = [];
  annotateNode(slideTree, issues);
  const denseVisualViews = (slideTree.children ?? []).filter(
    (child) => child.type === "View" && hasVisualProperties(child) && scoreVisualTextDensity(child) >= 4 && !isValidatedAgentComposition(child) && child._compatibility?.textCompositionMode !== "single_frame_card"
  );
  if (denseVisualViews.length > 0) {
    slideTree._compatibility = {
      mode: "visual_fallback",
      reason: "Slide contains dense multi-shape visual text groups that remain risky in PowerPoint.",
      fallbackReason: "dense_visual_text"
    };
    pushIssue(issues, {
      code: "slide:visual-fallback",
      message: "Marked slide for deterministic visual fallback because dense card text could not be collapsed safely.",
      severity: "warning",
      issueClass: "text_overflow_risk",
      fallbackLevel: "visual_fallback",
      remediation: "Reduce dense multi-shape card text or convert it into a single text frame to keep the slide editable."
    });
  } else if (!slideTree._compatibility) {
    slideTree._compatibility = { mode: "native_safe", reason: "Slide stayed within the native-safe contract." };
  }
  slideTree._compatibility.mode = maxCompatibilityMode(
    slideTree._compatibility.mode,
    collectWorstNodeMode(slideTree)
  );
  const fonts = /* @__PURE__ */ new Set();
  collectFonts(slideTree, fonts);
  const resolvedIdentities = [];
  collectResolvedFontIdentities(slideTree, resolvedIdentities);
  for (const identity of resolvedIdentities) {
    for (const diagnostic of identity.diagnostics ?? []) {
      pushIssue(issues, {
        code: diagnostic.code,
        message: diagnostic.message,
        severity: "warning",
        issueClass: "font_substitution_risk",
        fallbackLevel: "native_anchored",
        remediation: diagnostic.code === "FONT_SYSTEM_OPT_IN" ? "Install the exact named fonts in every render and viewer environment, or use visual fallback for deterministic output." : diagnostic.code === "FONT_EMBEDDING_UNAVAILABLE" ? 'Use fontStrategy="system" until a validated PowerPoint EOT/MicroType Express encoder is configured.' : "Supply an admitted face with the required variant and script coverage."
      });
    }
  }
  const unapprovedFonts = [...fonts].filter((font) => !APPROVED_NATIVE_FONTS.has(font));
  for (const font of unapprovedFonts) {
    pushIssue(issues, {
      code: "font:unapproved",
      message: `Font "${font}" is outside the approved native font profile for Mac validation.`,
      severity: "warning",
      issueClass: "font_substitution_risk",
      fallbackLevel: "native_anchored",
      remediation: `Embed or replace "${font}" with an approved desktop font when strict editability matters.`
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
    pixelGateEligible: resolvedIdentities.every((identity) => identity.pixelGateEligible)
  };
}
function summarizeDocumentCompatibility(slides) {
  const compatibilityVerdict = slides.some((slide) => slide.compatibilityVerdict === "visual_fallback") ? "visual_fallback" : slides.some((slide) => slide.compatibilityVerdict === "native_anchored") ? "native_anchored" : "native_safe";
  return {
    compatibilityVerdict,
    slides,
    fontSubstitutions: getFontSubstitutions(),
    pixelGateEligible: slides.every((slide) => slide.pixelGateEligible)
  };
}
async function analyzeDocumentCompatibility(doc) {
  await autoLoadDocumentFonts(doc);
  const width = doc.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX;
  const height = doc.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX;
  const slides = [];
  for (let i = 0; i < doc.slides.length; i++) {
    const layoutTree = await runLayout(doc.slides[i], width, height);
    applyGhostGrid(layoutTree);
    applyVisualOrder(layoutTree);
    slides.push(applyPptxCompatibility(layoutTree, i));
  }
  return summarizeDocumentCompatibility(slides);
}

// src/ooxml/chart/resolveAnnotations.ts
var DEFAULT_ANNOTATION_COLOR = "#C8102E";
var DEFAULT_ANNOTATION_WIDTH = 1.5;
var DEFAULT_LABEL_FONT_SIZE = 9;
var TREND_ARROW_CLEARANCE_PX = 22;
var TREND_LABEL_CLEARANCE_PX = 18;
var TARGET_LABEL_CLEARANCE_PX = 20;
var TARGET_LABEL_MARK_CLEARANCE_PX = 10;
var TARGET_LABEL_RIGHT_INSET_PX = 8;
function resolveChartAnnotations(chartData, frame) {
  const annotations = chartData.annotations ?? [];
  if (annotations.length === 0) {
    return { textAnnotations: [], connectors: [], labels: [] };
  }
  const layout = computeClassicChartLayout(chartData, {
    width: frame.width,
    height: frame.height
  });
  const plotPx = layout?.plotAreaPx;
  const markRects = plotPx ? chartMarkRects(chartData, frame, plotPx) : [];
  const textAnnotations = [];
  const connectors = [];
  const labels = [];
  for (const annotation of annotations) {
    const kind = annotation.kind ?? "text";
    if (kind === "text") {
      textAnnotations.push(annotation);
      continue;
    }
    if (!plotPx) continue;
    if (kind === "trendArrow") {
      const trend = annotation;
      const start = resolveAnchor(trend.from, chartData, frame, plotPx);
      const end = resolveAnchor(trend.to, chartData, frame, plotPx);
      if (!start || !end) continue;
      const color = trend.color ?? DEFAULT_ANNOTATION_COLOR;
      const shifted = shiftLineAwayFromPlot(start, end, -TREND_ARROW_CLEARANCE_PX, frame, plotPx);
      connectors.push(makeArrow(shifted.start, shifted.end, color, trend.width ?? DEFAULT_ANNOTATION_WIDTH, trend.dashStyle));
      if (trend.label) {
        labels.push(
          makeLabel(
            trend.label,
            midpoint(shifted.start, shifted.end),
            trend.labelFontFamily,
            trend.labelFontSize,
            trend.labelColor ?? color,
            {
              clearance: TREND_LABEL_CLEARANCE_PX,
              avoidRects: markRects,
              plotBounds: plotBounds(frame, plotPx)
            }
          )
        );
      }
    } else if (kind === "targetLine") {
      const tline = annotation;
      const yPx = valueToPx(tline.value, chartData, frame, plotPx);
      if (yPx === null) continue;
      const start = { x: frame.x + plotPx.left, y: yPx };
      const end = { x: frame.x + plotPx.left + plotPx.width, y: yPx };
      const color = tline.color ?? DEFAULT_ANNOTATION_COLOR;
      connectors.push(
        makeArrow(start, end, color, tline.width ?? 1, tline.dashStyle ?? "dashed", false)
      );
      if (tline.label) {
        labels.push(
          makeLabel(
            tline.label,
            { x: end.x, y: yPx },
            tline.labelFontFamily,
            tline.labelFontSize,
            tline.labelColor ?? color,
            {
              align: "right",
              avoidRectClearance: TARGET_LABEL_MARK_CLEARANCE_PX,
              avoidRects: markRects,
              clearance: TARGET_LABEL_CLEARANCE_PX,
              rightInset: TARGET_LABEL_RIGHT_INSET_PX,
              plotBounds: plotBounds(frame, plotPx)
            }
          )
        );
      }
    }
  }
  return { textAnnotations, connectors, labels };
}
function resolveAnchor(anchor, chartData, frame, plotPx) {
  const categories = chartData.categories ?? [];
  if (categories.length === 0) return null;
  const series = chartData.series ?? [];
  const seriesIdx = anchor.seriesIndex ?? 0;
  const seriesValues = series[seriesIdx]?.values ?? [];
  const slotWidth = plotPx.width / categories.length;
  const x = frame.x + plotPx.left + slotWidth * (anchor.categoryIndex + 0.5);
  let value;
  if (anchor.anchor === "barBottom") {
    value = chartData.valueAxis?.min ?? 0;
  } else if (anchor.anchor === "value") {
    if (typeof anchor.value !== "number") return null;
    value = anchor.value;
  } else {
    const idx = Math.round(anchor.categoryIndex);
    if (idx < 0 || idx >= seriesValues.length) return null;
    value = seriesValues[idx];
  }
  const y = valueToPx(value, chartData, frame, plotPx);
  if (y === null) return null;
  return { x, y };
}
function valueToPx(value, chartData, frame, plotPx) {
  const range = inferValueRange(chartData);
  if (!range || range.max <= range.min) return null;
  const frac = (range.max - value) / (range.max - range.min);
  return frame.y + plotPx.top + frac * plotPx.height;
}
function inferValueRange(chartData) {
  const axisMin = chartData.valueAxis?.min;
  const axisMax = chartData.valueAxis?.max;
  if (typeof axisMin === "number" && typeof axisMax === "number") {
    return { min: axisMin, max: axisMax };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const series of chartData.series ?? []) {
    for (const v of series.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (typeof axisMin === "number") min = axisMin;
  if (typeof axisMax === "number") max = axisMax;
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}
function makeArrow(start, end, color, width, dashStyle, arrowEnd = true) {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  return {
    type: "Connector",
    connectorType: "straight",
    start,
    end,
    lineWidth: width,
    lineColor: color,
    lineDashStyle: dashStyle ?? "solid",
    arrowEnd: arrowEnd ? true : void 0,
    style: {
      position: "absolute",
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    }
  };
}
function makeLabel(text, at, fontFamily, fontSize, color, options) {
  const size = fontSize ?? DEFAULT_LABEL_FONT_SIZE;
  const width = Math.max(44, text.length * size * 0.64);
  const height = size * 1.45;
  const clearance = options?.clearance ?? 2;
  const rightInset = options?.rightInset ?? 0;
  const left = options?.align === "right" ? at.x - width - rightInset : at.x - width / 2;
  const minTop = options?.plotBounds ? options.plotBounds.top + 2 : -Infinity;
  let top = at.y - height - clearance;
  const labelRect = { left, top, width, height };
  const avoidRectClearance = options?.avoidRectClearance ?? clearance;
  for (const avoidRect of options?.avoidRects ?? []) {
    if (!rectsOverlapX(labelRect, avoidRect)) continue;
    top = Math.min(top, avoidRect.top - height - avoidRectClearance);
  }
  top = Math.max(minTop, top);
  return {
    type: "Text",
    content: text,
    style: {
      position: "absolute",
      left,
      top,
      width,
      height,
      fontFamily,
      fontSize: size,
      color,
      textAlign: options?.align === "right" ? "right" : "center"
    }
  };
}
function chartMarkRects(chartData, frame, plotPx) {
  if (chartData.chartType !== "bar" || chartData.barDirection === "bar") return [];
  const categories = chartData.categories ?? [];
  const series = chartData.series ?? [];
  if (categories.length === 0 || series.length === 0) return [];
  const range = inferValueRange(chartData);
  if (!range) return [];
  const baselineValue = Math.min(range.max, Math.max(range.min, 0));
  const baseline = valueToPx(baselineValue, chartData, frame, plotPx);
  if (baseline === null) return [];
  const slotWidth = plotPx.width / categories.length;
  const barGroupWidth = slotWidth * 0.64;
  const barWidth = barGroupWidth / Math.max(1, series.length);
  const leftPad = (slotWidth - barGroupWidth) / 2;
  const rects = [];
  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex += 1) {
      const value = series[seriesIndex]?.values?.[categoryIndex];
      if (typeof value !== "number") continue;
      const valueY = valueToPx(value, chartData, frame, plotPx);
      if (valueY === null) continue;
      const top = Math.min(valueY, baseline);
      const bottom = Math.max(valueY, baseline);
      rects.push({
        left: frame.x + plotPx.left + slotWidth * categoryIndex + leftPad + barWidth * seriesIndex,
        top,
        width: Math.max(1, barWidth),
        height: Math.max(1, bottom - top)
      });
    }
  }
  return rects;
}
function rectsOverlapX(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left;
}
function plotBounds(frame, plotPx) {
  return {
    left: frame.x + plotPx.left,
    top: frame.y + plotPx.top,
    right: frame.x + plotPx.left + plotPx.width,
    bottom: frame.y + plotPx.top + plotPx.height
  };
}
function shiftLineAwayFromPlot(start, end, dy, frame, plotPx) {
  const bounds = plotBounds(frame, plotPx);
  const minY = bounds.top + 4;
  const shift = (point) => ({
    x: point.x,
    y: Math.max(minY, point.y + dy)
  });
  return { start: shift(start), end: shift(end) };
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export {
  IS_PRO,
  FREE_CHART_TYPES,
  FREE_SHAPE_COUNT,
  LITE_IMAGE_MAX_WIDTH,
  FREE_IMAGE_MAX_WIDTH,
  PRO_IMAGE_MAX_WIDTH,
  FREE_XLSX_CHART_TYPES,
  PPTX_PRO_FEATURES,
  DOCX_PRO_FEATURES,
  XLSX_PRO_FEATURES,
  PDF_PRO_FEATURES,
  isFeatureAvailable,
  validateImageRenderOptions,
  applyVisualOrder,
  hasVisualProperties,
  applyPptxCompatibility,
  summarizeDocumentCompatibility,
  analyzeDocumentCompatibility,
  resolveChartAnnotations
};
//# sourceMappingURL=chunk-Z2EIZERW.js.map
