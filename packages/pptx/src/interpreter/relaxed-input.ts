import type { AgentSlide } from "./agentSchema.js";
import type {
  AgentLayoutValidationMode,
  AgentLayoutWarning,
} from "./layout-validator.js";

export interface RelaxedInputCoercion {
  code: string;
  path: string;
  description: string;
  legacyShape: string;
  modernShape: string;
}

export interface PptxInputWarning {
  code: string;
  message: string;
  path: string;
  from?: unknown;
  to?: unknown;
}

export interface CompileAgentDocumentOptions {
  onInputWarning?: (warning: PptxInputWarning) => void;
  onLayoutWarning?: (warning: AgentLayoutWarning) => void;
  layoutValidation?: AgentLayoutValidationMode;
  relaxed?: boolean;
}

export const PPTX_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[] = [
  {
    code: "PPTX_RELAXED_DOCUMENT_TYPE",
    path: "type",
    description: 'Coerces legacy top-level `type: "Document"` into the deprecated package-local V1 discriminator.',
    legacyShape: '{ "type": "Document" }',
    modernShape: '{ "type": "presentation" }',
  },
  {
    code: "PPTX_RELAXED_META_TITLE",
    path: "meta.title",
    description: "Promotes legacy `meta.title` into the deprecated package-local V1 title field.",
    legacyShape: '{ "meta": { "title": "Board Update" } }',
    modernShape: '{ "presentationTitle": "Board Update" }',
  },
  {
    code: "PPTX_RELAXED_PATTERN_NAME",
    path: "slides[].pattern",
    description: "Rewrites legacy camelCase and old pattern names to the supported pattern set.",
    legacyShape: '`"chartFocus"` / `"chart"` / `"content"`',
    modernShape: '`"chart-focus"` / `"chart-focus"` / `"statement"`',
  },
  {
    code: "PPTX_RELAXED_SLIDE_CONTENT",
    path: "slides[]",
    description: "Wraps legacy flat slide fields under `slide.content`.",
    legacyShape: '{ "pattern": "dashboard", "title": "...", "kpis": [...] }',
    modernShape: '{ "pattern": "dashboard", "content": { "title": "...", "kpis": [...] } }',
  },
  {
    code: "PPTX_RELAXED_KPI_DELTA",
    path: "slides[].content.kpis[].delta",
    description: "Maps legacy KPI `delta` into the supported `sublabel` field.",
    legacyShape: '{ "delta": "+18%" }',
    modernShape: '{ "sublabel": "+18%" }',
  },
  {
    code: "PPTX_RELAXED_CHART_POINTS",
    path: "slides[].content.chart",
    description: "Converts legacy `categories[]` + `series[].values[]` into `series[].dataPoints[]`.",
    legacyShape: '{ "categories": ["Q1"], "series": [{ "values": [42] }] }',
    modernShape: '{ "series": [{ "dataPoints": [{ "category": "Q1", "value": 42 }] }] }',
  },
  {
    code: "PPTX_RELAXED_CHART_TYPE",
    path: "slides[].content.chart.type",
    description: "Downgrades unsupported legacy agent chart families to the closest supported editable family with a warning.",
    legacyShape: '`"scatter"` / `"waterfall"` / `"funnel"`',
    modernShape: '`"line"` / `"bar"` / `"bar"`',
  },
];

const LEGACY_PATTERN_MAP: Record<string, AgentSlide["pattern"]> = {
  chart: "chart-focus",
  chartFocus: "chart-focus",
  content: "statement",
};

const LEGACY_CHART_TYPE_MAP = {
  funnel: "bar",
  scatter: "line",
  waterfall: "bar",
} as const;

const LEGACY_CONTENT_KEYS = [
  "title",
  "subtitle",
  "prose",
  "bulletPoints",
  "comparison",
  "kpis",
  "chart",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneInput<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function pushWarning(
  warnings: PptxInputWarning[],
  options: CompileAgentDocumentOptions | undefined,
  warning: PptxInputWarning,
): void {
  warnings.push(warning);
  options?.onInputWarning?.(warning);
}

export function looksLikeAgentDocumentInput(input: unknown): boolean {
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

function normalizeLegacyPattern(
  slide: Record<string, unknown>,
  slideIndex: number,
  warnings: PptxInputWarning[],
  options: CompileAgentDocumentOptions | undefined,
): void {
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
    to: nextPattern,
  });
}

function normalizeLegacyContent(
  slide: Record<string, unknown>,
  slideIndex: number,
  warnings: PptxInputWarning[],
  options: CompileAgentDocumentOptions | undefined,
): Record<string, unknown> {
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
      path: `slides[${slideIndex}]`,
    });
  }

  return content;
}

function normalizeLegacyKpis(
  content: Record<string, unknown>,
  slideIndex: number,
  warnings: PptxInputWarning[],
  options: CompileAgentDocumentOptions | undefined,
): void {
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
      to: kpi.sublabel,
    });
  }
}

function normalizeLegacyChart(
  content: Record<string, unknown>,
  slideIndex: number,
  warnings: PptxInputWarning[],
  options: CompileAgentDocumentOptions | undefined,
): void {
  if (!isRecord(content.chart)) {
    return;
  }

  const chart = content.chart;

  if (typeof chart.type === "string") {
    const nextType = LEGACY_CHART_TYPE_MAP[chart.type as keyof typeof LEGACY_CHART_TYPE_MAP];
    if (nextType) {
      const previousType = chart.type;
      chart.type = nextType;
      pushWarning(warnings, options, {
        code: "PPTX_RELAXED_CHART_TYPE",
        message: `Downgraded unsupported legacy agent chart type "${previousType}" to "${nextType}".`,
        path: `slides[${slideIndex}].content.chart.type`,
        from: previousType,
        to: nextType,
      });
    }
  }

  const categories = Array.isArray(chart.categories)
    ? chart.categories.map((value) => String(value))
    : undefined;
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
      value: typeof value === "number" ? value : Number(value),
    }));

    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_CHART_POINTS",
      message: "Converted legacy chart categories/values arrays into dataPoints.",
      path: `slides[${slideIndex}].content.chart.series[${seriesIndex}]`,
    });

    return {
      ...series,
      dataPoints,
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

export function preprocessAgentDocumentInput(
  input: unknown,
  options?: CompileAgentDocumentOptions,
): { value: unknown; warnings: PptxInputWarning[] } {
  if (!options?.relaxed || !isRecord(input)) {
    return { value: input, warnings: [] };
  }

  const warnings: PptxInputWarning[] = [];
  const document = cloneInput(input) as Record<string, unknown>;

  if (document.type === "Document") {
    document.type = "presentation";
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_DOCUMENT_TYPE",
      message: 'Rewrote legacy agent document type "Document" to "presentation".',
      path: "type",
      from: "Document",
      to: "presentation",
    });
  }

  if (typeof document.presentationTitle !== "string" && isRecord(document.meta) && typeof document.meta.title === "string") {
    document.presentationTitle = document.meta.title;
    pushWarning(warnings, options, {
      code: "PPTX_RELAXED_META_TITLE",
      message: "Promoted meta.title into presentationTitle.",
      path: "meta.title",
      from: document.meta.title,
      to: document.presentationTitle,
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
