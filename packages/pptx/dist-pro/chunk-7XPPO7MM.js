import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  AgentThemePresetSchema,
  DesignTokensSchema,
  assertAgentCompilationSemantics,
  buildAgentPaginationFooter,
  buildBulletsLayout,
  buildChartFocusLayout,
  buildComparisonLayout,
  buildDashboardLayout,
  buildStatementLayout,
  buildTitleLayout,
  computePolicyAutoFit,
  hasUnbreakableTextSegment,
  parseComparisonEntry,
  parseComparisonOwnership,
  resolveAgentDesignTokens
} from "./chunk-5CDPNZPI.js";
import {
  autoLoadDocumentFonts,
  emitRenderabilityWarnings
} from "./chunk-FUBHCOLD.js";
import {
  ZodError,
  external_exports
} from "./chunk-SHJL7Z52.js";
import {
  calculateRichTextMetrics
} from "./chunk-625BFJJW.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/interpreter/agentSchema.ts
var KpiSchema = external_exports.object({
  label: external_exports.string().describe("Short label, e.g., 'Total Revenue'"),
  value: external_exports.string().describe("Formatted metric, e.g., '$4.2M'"),
  trend: external_exports.enum(["up", "down", "flat", "none"]).default("none"),
  sublabel: external_exports.string().optional().describe("Brief context line"),
  style: external_exports.enum(["gradient", "dark", "outline"]).optional().describe("Card visual style")
});
var DataSeriesSchema = external_exports.object({
  name: external_exports.string().describe("Name of the data series (e.g., '2025' or 'Product A')"),
  dataPoints: external_exports.array(
    external_exports.object({
      category: external_exports.string(),
      value: external_exports.number()
    })
  ).max(16384)
});
var ComparisonSchema = external_exports.object({
  leftLabel: external_exports.string().trim().min(1).describe("Label for the left comparison field"),
  rightLabel: external_exports.string().trim().min(1).describe("Label for the right comparison field"),
  rows: external_exports.array(external_exports.object({
    left: external_exports.string().trim().min(1),
    right: external_exports.string().trim().min(1)
  })).min(1).max(100)
});
var SlidePatternEnum = external_exports.enum([
  "title",
  "statement",
  "dashboard",
  "comparison",
  "chart-focus",
  "bullets"
]);
var AgentSlideSchema = external_exports.object({
  pattern: SlidePatternEnum.describe(
    "The semantic layout template to use for this slide."
  ),
  content: external_exports.object({
    title: external_exports.string(),
    subtitle: external_exports.string().optional(),
    prose: external_exports.array(external_exports.string()).max(100).optional().describe("Paragraphs of text"),
    bulletPoints: external_exports.array(external_exports.string()).max(200).optional(),
    comparison: ComparisonSchema.optional().describe(
      "Explicit left/right comparison semantics. Use instead of bulletPoints on comparison slides."
    ),
    kpis: external_exports.array(KpiSchema).max(4).optional(),
    chart: external_exports.object({
      // Only chart types whose emitters work with the simple categories/series
      // format produced by agentChartToChartData are listed here.
      //
      // Unsupported via agent schema (need specialized data fields in ChartData):
      //   scatter, bubble  — require xySeries (XYSeries[])
      //   waterfall        — requires waterfallData (WaterfallData)
      //   stock            — requires stockData (StockData)
      //   funnel           — requires funnelData (FunnelData)
      //   treemap, sunburst — require treemapData/sunburstData (TreemapCategory[])
      //   histogram        — requires histogramData (HistogramData)
      //   boxWhisker       — requires boxWhiskerData (BoxWhiskerData)
      //
      // These types are fully implemented in the OOXML emitters and can be used
      // directly via the PaperDocument AST (ChartData) with the correct data fields.
      type: external_exports.enum([
        "bar",
        "line",
        "pie",
        "area",
        "doughnut",
        "radar"
      ]).describe("Chart type. Supported: bar, line, pie, area, doughnut, radar."),
      areaGrouping: external_exports.enum(["standard", "stacked", "percentStacked"]).optional().describe("Area-chart grouping mode. Ignored for non-area charts."),
      title: external_exports.string().optional(),
      series: external_exports.array(DataSeriesSchema).max(255)
    }).optional()
  })
}).superRefine((slide, context) => {
  if (slide.content.comparison && slide.pattern !== "comparison") {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'content.comparison is only valid when pattern is "comparison".',
      path: ["content", "comparison"]
    });
  }
  if (slide.pattern === "comparison" && slide.content.comparison && slide.content.bulletPoints) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Explicit comparison rows and bulletPoints are mutually exclusive.",
      path: ["content", "bulletPoints"]
    });
  }
});
var AgentDocumentSchema = external_exports.object({
  type: external_exports.literal("presentation").default("presentation").describe(
    "Document discriminator for the hosted presentation agent contract."
  ),
  version: external_exports.literal("1.0").default("1.0").describe("Schema version for migration support"),
  presentationTitle: external_exports.string(),
  companyName: external_exports.string().optional(),
  accentColor: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color (e.g., '#2563EB')").optional().describe("Primary accent hex color"),
  theme: AgentThemePresetSchema.optional().describe("Built-in slide-design preset."),
  designTokens: DesignTokensSchema.optional().describe("Optional slide-design token overrides applied on top of the selected theme preset."),
  slides: external_exports.array(AgentSlideSchema).min(1).max(200)
});

// src/interpreter/relaxed-input.ts
var PPTX_RELAXED_INPUT_COERCIONS = [
  {
    code: "PPTX_RELAXED_DOCUMENT_TYPE",
    path: "type",
    description: 'Coerces legacy top-level `type: "Document"` into the deprecated package-local V1 discriminator.',
    legacyShape: '{ "type": "Document" }',
    modernShape: '{ "type": "presentation" }'
  },
  {
    code: "PPTX_RELAXED_META_TITLE",
    path: "meta.title",
    description: "Promotes legacy `meta.title` into the deprecated package-local V1 title field.",
    legacyShape: '{ "meta": { "title": "Board Update" } }',
    modernShape: '{ "presentationTitle": "Board Update" }'
  },
  {
    code: "PPTX_RELAXED_PATTERN_NAME",
    path: "slides[].pattern",
    description: "Rewrites legacy camelCase and old pattern names to the supported pattern set.",
    legacyShape: '`"chartFocus"` / `"chart"` / `"content"`',
    modernShape: '`"chart-focus"` / `"chart-focus"` / `"statement"`'
  },
  {
    code: "PPTX_RELAXED_SLIDE_CONTENT",
    path: "slides[]",
    description: "Wraps legacy flat slide fields under `slide.content`.",
    legacyShape: '{ "pattern": "dashboard", "title": "...", "kpis": [...] }',
    modernShape: '{ "pattern": "dashboard", "content": { "title": "...", "kpis": [...] } }'
  },
  {
    code: "PPTX_RELAXED_KPI_DELTA",
    path: "slides[].content.kpis[].delta",
    description: "Maps legacy KPI `delta` into the supported `sublabel` field.",
    legacyShape: '{ "delta": "+18%" }',
    modernShape: '{ "sublabel": "+18%" }'
  },
  {
    code: "PPTX_RELAXED_CHART_POINTS",
    path: "slides[].content.chart",
    description: "Converts legacy `categories[]` + `series[].values[]` into `series[].dataPoints[]`.",
    legacyShape: '{ "categories": ["Q1"], "series": [{ "values": [42] }] }',
    modernShape: '{ "series": [{ "dataPoints": [{ "category": "Q1", "value": 42 }] }] }'
  },
  {
    code: "PPTX_RELAXED_CHART_TYPE",
    path: "slides[].content.chart.type",
    description: "Downgrades unsupported legacy agent chart families to the closest supported editable family with a warning.",
    legacyShape: '`"scatter"` / `"waterfall"` / `"funnel"`',
    modernShape: '`"line"` / `"bar"` / `"bar"`'
  }
];
var LEGACY_PATTERN_MAP = {
  chart: "chart-focus",
  chartFocus: "chart-focus",
  content: "statement"
};
var LEGACY_CHART_TYPE_MAP = {
  funnel: "bar",
  scatter: "line",
  waterfall: "bar"
};
var LEGACY_CONTENT_KEYS = [
  "title",
  "subtitle",
  "prose",
  "bulletPoints",
  "comparison",
  "kpis",
  "chart"
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cloneInput(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
function pushWarning(warnings, options, warning) {
  warnings.push(warning);
  options?.onInputWarning?.(warning);
}
function looksLikeAgentDocumentInput(input) {
  if (!isRecord(input)) {
    return false;
  }
  if ("presentationTitle" in input || "companyName" in input || "accentColor" in input || "meta" in input) {
    return true;
  }
  if (!Array.isArray(input.slides)) {
    return false;
  }
  return input.slides.some((slide) => isRecord(slide) && ("pattern" in slide || "content" in slide || "title" in slide));
}
function normalizeLegacyPattern(slide, slideIndex, warnings, options) {
  if (typeof slide.pattern !== "string") {
    return;
  }
  const nextPattern = LEGACY_PATTERN_MAP[slide.pattern];
  if (!nextPattern) {
    return;
  }
  const previousPattern = slide.pattern;
  slide.pattern = nextPattern;
  pushWarning(warnings, options, {
    code: "PPTX_RELAXED_PATTERN_NAME",
    message: `Rewrote legacy slide pattern "${previousPattern}" to "${nextPattern}".`,
    path: `slides[${slideIndex}].pattern`,
    from: previousPattern,
    to: nextPattern
  });
}
function normalizeLegacyContent(slide, slideIndex, warnings, options) {
  const existingContent = isRecord(slide.content) ? slide.content : {};
  const content = { ...existingContent };
  let changed = !isRecord(slide.content);
  for (const key of LEGACY_CONTENT_KEYS) {
    if (!(key in slide) || key in content) {
      continue;
    }
    content[key] = slide[key];
    changed = true;
  }
  if (changed) {
    slide.content = content;
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_SLIDE_CONTENT",
      message: "Wrapped legacy flat slide fields under slide.content.",
      path: `slides[${slideIndex}]`
    });
  }
  return content;
}
function normalizeLegacyKpis(content, slideIndex, warnings, options) {
  if (!Array.isArray(content.kpis)) {
    return;
  }
  for (let index = 0; index < content.kpis.length; index += 1) {
    const kpi = content.kpis[index];
    if (!isRecord(kpi) || !("delta" in kpi) || "sublabel" in kpi) {
      continue;
    }
    const delta = kpi.delta;
    kpi.sublabel = typeof delta === "string" ? delta : String(delta ?? "");
    delete kpi.delta;
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_KPI_DELTA",
      message: "Mapped legacy KPI delta into sublabel.",
      path: `slides[${slideIndex}].content.kpis[${index}].delta`,
      from: delta,
      to: kpi.sublabel
    });
  }
}
function normalizeLegacyChart(content, slideIndex, warnings, options) {
  if (!isRecord(content.chart)) {
    return;
  }
  const chart = content.chart;
  if (typeof chart.type === "string") {
    const nextType = LEGACY_CHART_TYPE_MAP[chart.type];
    if (nextType) {
      const previousType = chart.type;
      chart.type = nextType;
      pushWarning(warnings, options, {
        code: "PPTX_RELAXED_CHART_TYPE",
        message: `Downgraded unsupported legacy agent chart type "${previousType}" to "${nextType}".`,
        path: `slides[${slideIndex}].content.chart.type`,
        from: previousType,
        to: nextType
      });
    }
  }
  const categories = Array.isArray(chart.categories) ? chart.categories.map((value) => String(value)) : void 0;
  if (!categories || !Array.isArray(chart.series)) {
    return;
  }
  let changed = false;
  chart.series = chart.series.map((series, seriesIndex) => {
    if (!isRecord(series) || Array.isArray(series.dataPoints) || !Array.isArray(series.values)) {
      return series;
    }
    changed = true;
    const dataPoints = series.values.map((value, pointIndex) => ({
      category: categories[pointIndex] ?? `Point ${pointIndex + 1}`,
      value: typeof value === "number" ? value : Number(value)
    }));
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_CHART_POINTS",
      message: "Converted legacy chart categories/values arrays into dataPoints.",
      path: `slides[${slideIndex}].content.chart.series[${seriesIndex}]`
    });
    return {
      ...series,
      dataPoints
    };
  });
  if (changed) {
    delete chart.categories;
    if (Array.isArray(chart.series)) {
      for (const series of chart.series) {
        if (isRecord(series) && "values" in series) {
          delete series.values;
        }
      }
    }
  }
}
function preprocessAgentDocumentInput(input, options) {
  if (!options?.relaxed || !isRecord(input)) {
    return { value: input, warnings: [] };
  }
  const warnings = [];
  const document = cloneInput(input);
  if (document.type === "Document") {
    document.type = "presentation";
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_DOCUMENT_TYPE",
      message: 'Rewrote legacy agent document type "Document" to "presentation".',
      path: "type",
      from: "Document",
      to: "presentation"
    });
  }
  if (typeof document.presentationTitle !== "string" && isRecord(document.meta) && typeof document.meta.title === "string") {
    document.presentationTitle = document.meta.title;
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_META_TITLE",
      message: "Promoted meta.title into presentationTitle.",
      path: "meta.title",
      from: document.meta.title,
      to: document.presentationTitle
    });
  }
  if (!Array.isArray(document.slides)) {
    return { value: document, warnings };
  }
  document.slides = document.slides.map((slide, slideIndex) => {
    if (!isRecord(slide)) {
      return slide;
    }
    normalizeLegacyPattern(slide, slideIndex, warnings, options);
    const content = normalizeLegacyContent(slide, slideIndex, warnings, options);
    normalizeLegacyKpis(content, slideIndex, warnings, options);
    normalizeLegacyChart(content, slideIndex, warnings, options);
    return slide;
  });
  return { value: document, warnings };
}

// src/interpreter/layout-validator.ts
function hasChildren(node) {
  return "children" in node && Array.isArray(node.children);
}
function toTextRuns(value) {
  if (!value) {
    return [];
  }
  return typeof value === "string" ? [{ text: value }] : value;
}
function paragraphsToRuns(paragraphs) {
  const runs = [];
  paragraphs.forEach((paragraph, index) => {
    runs.push(...paragraph.runs);
    if (index < paragraphs.length - 1) {
      runs.push({ text: "\n" });
    }
  });
  return runs;
}
function extractTextPayload(node) {
  if (node.type === "Text") {
    const textNode = node;
    const runs = textNode.paragraphs ? paragraphsToRuns(textNode.paragraphs) : toTextRuns(textNode.content);
    return runs.length > 0 ? { runs, style: textNode.style } : null;
  }
  if (node.type === "View") {
    const viewNode = node;
    const runs = viewNode.textParagraphs ? paragraphsToRuns(viewNode.textParagraphs) : toTextRuns(viewNode.textContent);
    return runs.length > 0 ? { runs, style: viewNode.textStyle ?? viewNode.style } : null;
  }
  return null;
}
function getContainerRect(node, origin) {
  const style = node.style;
  if (!style || style.position !== "absolute") {
    return null;
  }
  if (typeof style.left !== "number" || typeof style.top !== "number" || typeof style.width !== "number" || typeof style.height !== "number" || style.width <= 0 || style.height <= 0) {
    return null;
  }
  return {
    left: origin.x + style.left,
    top: origin.y + style.top,
    width: style.width,
    height: style.height
  };
}
function maxFontSize(runs, style) {
  let size = style?.fontSize ?? 16;
  for (const run of runs) {
    size = Math.max(size, run.style?.fontSize ?? size);
  }
  return size;
}
function minReadableTextWidth(runs, style) {
  const largestFont = maxFontSize(runs, style);
  return Math.max(48, largestFont * 3.4);
}
function textCharCount(runs) {
  return runs.reduce((count, run) => count + run.text.trim().length, 0);
}
var BOUNDS_TOLERANCE = 0.5;
function rectContainsWithTolerance(outer, inner, tolerance) {
  return outer.left <= inner.left + tolerance && outer.top <= inner.top + tolerance && outer.left + outer.width >= inner.left + inner.width - tolerance && outer.top + outer.height >= inner.top + inner.height - tolerance;
}
function pushWarning2(warnings, seen, warning) {
  const key = [
    warning.code,
    warning.slideIndex,
    warning.nodePath,
    warning.relatedNodePath ?? ""
  ].join("|");
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  warnings.push(warning);
}
function warnOnParentBounds(node, slideIndex, nodePath, parentPath, origin, parentRect, warnings, seen) {
  if (!parentRect || node.decorative) return;
  const rect = getContainerRect(node, origin);
  if (!rect || rectContainsWithTolerance(parentRect, rect, BOUNDS_TOLERANCE)) return;
  pushWarning2(warnings, seen, {
    code: "POTENTIAL_CONTAINER_CLIP",
    message: `Absolute child ${nodePath} exceeds parent container ${parentPath}.`,
    slideIndex,
    nodePath,
    relatedNodePath: parentPath
  });
}
function warnOnTextFit(node, slideIndex, nodePath, origin, warnings, seen) {
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
  const lineCount = fitPolicy === "fitFontSize" && autoFit.lineCount !== void 0 ? autoFit.lineCount : metrics.lineCount;
  const maxLines = style?.textFit?.maxLines;
  const unexpectedWrap = maxLines !== void 0 && lineCount > maxLines;
  const minReadableWidth = minReadableTextWidth(runs, style);
  const contentLength = textCharCount(runs);
  const tightWrap = availableWidth < minReadableWidth && (lineCount > 1 || contentLength >= 4 && autoFit.fontScale < 1e5);
  const hasUnbreakableString = runs.some((run) => hasUnbreakableTextSegment(run.text, style, availableWidth));
  if (fitPolicy !== "overflow" && hasUnbreakableString) {
    pushWarning2(warnings, seen, {
      code: "POTENTIAL_UNBREAKABLE_STRING",
      message: `Text contains a segment wider than ${Math.round(availableWidth)}px at ${nodePath}; break-anywhere fallback will be applied.`,
      slideIndex,
      nodePath
    });
  }
  if (fitPolicy !== "overflow" && (autoFit.overflow || unexpectedWrap)) {
    pushWarning2(warnings, seen, {
      code: "POTENTIAL_OVERFLOW",
      message: unexpectedWrap ? `Text wraps to ${lineCount} lines, exceeding maxLines=${maxLines} at ${nodePath}.` : `Text may overflow its ${availableWidth}x${availableHeight} container at ${nodePath}.`,
      slideIndex,
      nodePath
    });
  }
  if (fitPolicy !== "overflow" && tightWrap) {
    pushWarning2(warnings, seen, {
      code: "POTENTIAL_TIGHT_WRAP",
      message: `Text wraps in a cramped ${Math.round(availableWidth)}px column; needs about ${Math.round(minReadableWidth)}px for readable wrapping at ${nodePath}.`,
      slideIndex,
      nodePath
    });
  }
  if (fitPolicy !== "overflow" && availableHeight < nominalLineHeight * 0.95) {
    pushWarning2(warnings, seen, {
      code: "POTENTIAL_CLIP",
      message: `Text line height may clip inside its ${availableWidth}x${availableHeight} container at ${nodePath}.`,
      slideIndex,
      nodePath
    });
  }
}
function rectsOverlap(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}
function collectAbsoluteSiblingInfo(nodes, origin, parentPath) {
  return nodes.flatMap((node, index) => {
    const path = `${parentPath}[${index}]`;
    const rect = getContainerRect(node, origin);
    return rect ? [{
      path,
      rect,
      zIndex: node.style?.zIndex
    }] : [];
  });
}
function walkNodes(nodes, slideIndex, origin, parentPath, warnings, seen, parentRect) {
  nodes.forEach((node, index) => {
    if (node.type === "View" && node.altText?.includes("overflow")) {
      pushWarning2(warnings, seen, {
        code: "POTENTIAL_OVERFLOW",
        message: `Measured content demand exceeds the assigned register field at ${parentPath}[${index}].`,
        slideIndex,
        nodePath: `${parentPath}[${index}]`
      });
    }
  });
  const absoluteSiblings = collectAbsoluteSiblingInfo(nodes, origin, parentPath);
  for (let index = 0; index < absoluteSiblings.length; index += 1) {
    const current = absoluteSiblings[index];
    if (current.zIndex !== void 0) {
      continue;
    }
    for (let otherIndex = index + 1; otherIndex < absoluteSiblings.length; otherIndex += 1) {
      const other = absoluteSiblings[otherIndex];
      if (other.zIndex !== void 0 || !rectsOverlap(current.rect, other.rect)) {
        continue;
      }
      pushWarning2(warnings, seen, {
        code: "POTENTIAL_COLLISION",
        message: `Absolutely positioned nodes ${current.path} and ${other.path} overlap without zIndex separation.`,
        slideIndex,
        nodePath: current.path,
        relatedNodePath: other.path
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
    const nextOrigin = rect ? { x: rect.left, y: rect.top } : origin;
    walkNodes(node.children, slideIndex, nextOrigin, `${nodePath}.children`, warnings, seen, rect ?? parentRect);
  });
}
function validateSlideLayout(slide, slideIndex) {
  const warnings = [];
  const seen = /* @__PURE__ */ new Set();
  walkNodes(slide.children, slideIndex, { x: 0, y: 0 }, `slides[${slideIndex}].children`, warnings, seen);
  return warnings;
}
function validateAgentDocumentLayout(document) {
  return document.slides.flatMap((slide, slideIndex) => validateSlideLayout(slide, slideIndex));
}

// src/engine/layoutValidator.ts
var VALIDATED_DOCUMENTS = /* @__PURE__ */ new WeakSet();
function markLayoutValidated(doc) {
  VALIDATED_DOCUMENTS.add(doc);
}
function runEngineLayoutValidation(doc, options) {
  const mode = options?.layoutValidation ?? "warn";
  if (mode === "off") return [];
  if (VALIDATED_DOCUMENTS.has(doc)) return [];
  const warnings = validateAgentDocumentLayout(doc);
  warnings.forEach((warning) => options?.onLayoutWarning?.(warning));
  if (mode === "warn") {
    warnings.forEach((warning) => {
      getLogger().warn(
        `[layout] ${warning.code} on slide ${warning.slideIndex + 1} at ${warning.nodePath}: ${warning.message}`
      );
    });
    VALIDATED_DOCUMENTS.add(doc);
    return warnings;
  }
  if (warnings.length > 0) {
    const first = warnings[0];
    const summary = warnings.map((w) => `${w.code} slide ${w.slideIndex + 1} at ${w.nodePath}`).join("; ");
    throw new PaperError(
      `Pre-render layout validation failed: ${summary}`,
      {
        code: "AGENT_LAYOUT_VALIDATION_FAILED",
        phase: "layout",
        slideIndex: first.slideIndex,
        path: first.nodePath.split(".").filter((p) => p.length > 0),
        remediation: 'Reduce text length, increase container height/width, or loosen absolute overlaps. Pass `layoutValidation: "warn"` to downgrade this to a logged warning.'
      }
    );
  }
  VALIDATED_DOCUMENTS.add(doc);
  return warnings;
}

// src/interpreter/interpreter.ts
function comparisonSemanticWarnings(document) {
  return document.slides.flatMap((slide, slideIndex) => {
    if (slide.pattern !== "comparison" || slide.content.comparison || !slide.content.bulletPoints?.length) {
      return [];
    }
    const ownership = parseComparisonOwnership(slide.content.subtitle);
    const ownsEveryPair = ownership && slide.content.bulletPoints.every((entry) => parseComparisonEntry(entry) !== void 0);
    if (ownsEveryPair) return [];
    return [{
      code: "POTENTIAL_UNOWNED_COMPARISON",
      message: "Comparison content lacks explicit left/right ownership and will use the legacy generic split.",
      slideIndex,
      nodePath: `slides[${slideIndex}].content.bulletPoints`
    }];
  });
}
function buildTheme(tokens) {
  return {
    name: "Generated",
    colorScheme: {
      dk1: tokens.colors.themeDark1,
      lt1: tokens.colors.themeLight1,
      dk2: tokens.colors.themeDark2,
      lt2: tokens.colors.themeLight2,
      accent1: tokens.colors.accent,
      accent2: tokens.colors.chartPalette[1] ?? tokens.colors.chartPalette[0],
      accent3: tokens.colors.chartPalette[2] ?? tokens.colors.chartPalette[0],
      accent4: tokens.colors.chartPalette[3] ?? tokens.colors.chartPalette[0],
      accent5: tokens.colors.chartPalette[4] ?? tokens.colors.chartPalette[0],
      accent6: tokens.colors.chartPalette[5] ?? tokens.colors.chartPalette[0]
    },
    fontScheme: {
      majorLatin: tokens.typography.titleFontFamily,
      minorLatin: tokens.typography.bodyFontFamily
    }
  };
}
function compileAgentSlide(slide, accentColor, fontFamily, designTokens, companyName) {
  let compiled;
  switch (slide.pattern) {
    case "title":
      compiled = buildTitleLayout(slide.content, accentColor, fontFamily, designTokens, companyName);
      break;
    case "statement":
      compiled = buildStatementLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "dashboard":
      compiled = buildDashboardLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "comparison":
      compiled = buildComparisonLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "chart-focus":
      compiled = buildChartFocusLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "bullets":
      compiled = buildBulletsLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    default: {
      const _exhaustive = slide.pattern;
      void _exhaustive;
      getLogger().warn(
        `[interpreter] UNKNOWN_AGENT_PATTERN: slide.pattern="${slide.pattern}" has no registered builder; rendering as "bullets".`
      );
      compiled = buildBulletsLayout(slide.content, accentColor, fontFamily, designTokens);
    }
  }
  compiled.agentPattern = slide.pattern;
  return compiled;
}
function compileAgentDocument(input, options) {
  let validated;
  try {
    const prepared = preprocessAgentDocumentInput(input, options);
    validated = AgentDocumentSchema.parse(prepared.value);
  } catch (e) {
    if (e instanceof ZodError) {
      getLogger().schemaError?.({
        schemaName: "AgentDocumentSchema",
        errorCount: e.issues.length,
        issues: e.issues.slice(0, 20).map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message
        })),
        timestamp: Date.now()
      });
    }
    throw e;
  }
  if (validated.type !== "presentation") {
    throw new Error(
      `compileAgentDocument only supports presentation agent documents. Received "${validated.type}".`
    );
  }
  const tokens = resolveAgentDesignTokens({
    theme: validated.theme,
    accentColor: validated.accentColor,
    designTokens: validated.designTokens
  });
  const theme = buildTheme(tokens);
  const accentColor = tokens.colors.accent;
  const footerLabel = validated.companyName ? `${validated.companyName} \xB7 ${validated.presentationTitle}` : validated.presentationTitle;
  const slides = validated.slides.map((slide, slideIndex) => {
    const compiled = compileAgentSlide(slide, accentColor, void 0, tokens, validated.companyName);
    if (slide.pattern !== "title") {
      compiled.children.push(buildAgentPaginationFooter(
        footerLabel,
        slideIndex + 1,
        validated.slides.length,
        tokens
      ));
    }
    return compiled;
  });
  const document = {
    type: "Document",
    meta: {
      title: validated.presentationTitle,
      author: validated.companyName
    },
    theme,
    fontStrategy: tokens.typography.fontStrategy,
    slides
  };
  assertAgentCompilationSemantics(validated, document);
  emitRenderabilityWarnings(document);
  const layoutValidation = options?.layoutValidation ?? "warn";
  if (layoutValidation === "off") {
    markLayoutValidated(document);
    return document;
  }
  const warnings = [
    ...comparisonSemanticWarnings(validated),
    ...validateAgentDocumentLayout(document)
  ];
  warnings.forEach((warning) => options?.onLayoutWarning?.(warning));
  if (layoutValidation === "warn") {
    warnings.forEach((warning) => {
      getLogger().warn(
        `[agent-layout] ${warning.code} on slide ${warning.slideIndex + 1} at ${warning.nodePath}: ${warning.message}`
      );
    });
    markLayoutValidated(document);
    return document;
  }
  if (warnings.length > 0) {
    const first = warnings[0];
    const summary = warnings.map((warning) => `${warning.code} slide ${warning.slideIndex + 1} at ${warning.nodePath}`).join("; ");
    throw new PaperError(
      `Agent layout validation failed: ${summary}`,
      {
        code: "AGENT_LAYOUT_VALIDATION_FAILED",
        phase: "validation",
        slideIndex: first.slideIndex,
        path: first.nodePath.split(".").filter((p) => p.length > 0),
        remediation: 'Shorten text, enlarge the container, or loosen overlaps. Pass `layoutValidation: "warn"` to downgrade to a logged warning.'
      }
    );
  }
  markLayoutValidated(document);
  return document;
}
async function compileAgentDocumentWithFonts(input, options) {
  const probe = compileAgentDocument(input, { ...options, layoutValidation: "off" });
  await autoLoadDocumentFonts(probe);
  return compileAgentDocument(input, options);
}

export {
  KpiSchema,
  DataSeriesSchema,
  ComparisonSchema,
  SlidePatternEnum,
  AgentSlideSchema,
  AgentDocumentSchema,
  PPTX_RELAXED_INPUT_COERCIONS,
  looksLikeAgentDocumentInput,
  preprocessAgentDocumentInput,
  validateAgentDocumentLayout,
  runEngineLayoutValidation,
  compileAgentSlide,
  compileAgentDocument,
  compileAgentDocumentWithFonts
};
//# sourceMappingURL=chunk-7XPPO7MM.js.map
