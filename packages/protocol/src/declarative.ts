import { z } from "zod";
import { TokenBundleSchema } from "@runstamp/pptx-primitives";
import type { PresentationSpec } from "./index.js";

const ShortTextSchema = z.string().min(1).max(180);
const BodyTextSchema = z.string().min(1).max(500);

const DeclarativeSlideBaseSchema = z.strictObject({
  id: z.string().min(1).optional(),
  notes: z.array(z.string().min(1).max(2_000)).max(6).optional(),
});

export const DeclarativeMetricSchema = z.strictObject({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(80),
  delta: z.string().max(80).optional(),
  trend: z.enum(["up", "down", "flat", "none"]).optional(),
});

export const DeclarativeChartSeriesSchema = z.strictObject({
  name: z.string().min(1).max(80),
  dataPoints: z.array(z.strictObject({
    category: z.string().min(1).max(120),
    value: z.number().finite(),
  })).min(1).max(128),
});

export const DeclarativeChartSchema = z.strictObject({
  // These category/series shapes are editable in both free and Pro builds.
  // Scatter needs x/y pairs and radar is Pro-only, so neither is silently
  // coerced through this intentionally small facade.
  kind: z.enum(["bar", "line", "pie", "area", "doughnut"]),
  title: z.string().min(1).max(180).optional(),
  series: z.array(DeclarativeChartSeriesSchema).min(1).max(12),
}).superRefine((chart, ctx) => {
  const expectedCategories = chart.series[0]?.dataPoints.map((point) => point.category) ?? [];
  chart.series.slice(1).forEach((series, seriesIndex) => {
    const categories = series.dataPoints.map((point) => point.category);
    if (
      categories.length !== expectedCategories.length
      || categories.some((category, index) => category !== expectedCategories[index])
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["series", seriesIndex + 1, "dataPoints"],
        message: "Every chart series must use the same categories in the same order.",
        params: {
          runstampCode: "chart_category_mismatch",
          fix: "Use the first series' category list, in the same order, for every series.",
        },
      });
    }
  });

  if ((chart.kind === "pie" || chart.kind === "doughnut") && chart.series.length !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["series"],
      message: `${chart.kind} charts require exactly one series.`,
      params: {
        runstampCode: "chart_series_count",
        fix: `Keep one series for the ${chart.kind} chart, or use a bar chart for multiple series.`,
      },
    });
  }
});

const TitleSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: z.literal("title"),
  title: ShortTextSchema,
  subtitle: z.string().min(1).max(240).optional(),
  eyebrow: z.string().min(1).max(80).optional(),
});

const KpiRowSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: z.literal("kpi-row"),
  title: ShortTextSchema.optional(),
  metrics: z.array(DeclarativeMetricSchema).min(2).max(6),
});

const ChartSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: z.literal("chart"),
  title: ShortTextSchema,
  subtitle: z.string().min(1).max(240).optional(),
  chart: DeclarativeChartSchema,
});

const BulletsSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: z.literal("bullets"),
  title: ShortTextSchema,
  subtitle: z.string().min(1).max(240).optional(),
  bullets: z.array(BodyTextSchema).min(1).max(12),
});

const ComparisonSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: z.literal("comparison"),
  title: ShortTextSchema,
  subtitle: z.string().min(1).max(240).optional(),
  columns: z.array(z.string().min(1).max(80)).min(3).max(6),
  rows: z.array(z.strictObject({
    label: z.string().min(1).max(120),
    values: z.array(z.string().min(1).max(240)).min(2).max(5),
    highlight: z.boolean().optional(),
  })).min(1).max(8),
}).superRefine((slide, ctx) => {
  slide.rows.forEach((row, rowIndex) => {
    if (row.values.length !== slide.columns.length - 1) {
      ctx.addIssue({
        code: "custom",
        path: ["rows", rowIndex, "values"],
        message: "Each comparison row needs one value for every data column.",
        params: {
          runstampCode: "comparison_column_mismatch",
          fix: `Provide exactly ${slide.columns.length - 1} values for this row.`,
        },
      });
    }
  });
});

const TimelineSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: z.literal("timeline"),
  title: ShortTextSchema,
  subtitle: z.string().min(1).max(240).optional(),
  events: z.array(z.strictObject({
    label: z.string().min(1).max(100),
    date: z.string().min(1).max(80).optional(),
    description: z.string().min(1).max(240).optional(),
  })).min(2).max(8),
});

export const DeclarativeLayoutSchema = z.enum([
  "title",
  "kpi-row",
  "chart",
  "bullets",
  "comparison",
  "timeline",
]);

export const DeclarativeSlideSchema = z.discriminatedUnion("layout", [
  TitleSlideSchema,
  KpiRowSlideSchema,
  ChartSlideSchema,
  BulletsSlideSchema,
  ComparisonSlideSchema,
  TimelineSlideSchema,
]);

export const DeclarativeDocumentSchema = z.strictObject({
  version: z.literal("1.0").optional(),
  deckId: z.string().min(1).optional(),
  title: ShortTextSchema,
  tokens: TokenBundleSchema.optional(),
  slides: z.array(DeclarativeSlideSchema).min(1).max(200),
});

export type DeclarativeLayout = z.infer<typeof DeclarativeLayoutSchema>;
export type DeclarativeMetric = z.infer<typeof DeclarativeMetricSchema>;
export type DeclarativeChartSeries = z.infer<typeof DeclarativeChartSeriesSchema>;
export type DeclarativeChart = z.infer<typeof DeclarativeChartSchema>;
export type DeclarativeSlide = z.infer<typeof DeclarativeSlideSchema>;
export type DeclarativeDocument = z.infer<typeof DeclarativeDocumentSchema>;

export interface ValidationIssue {
  /** Exact schema path segments. Numeric array indexes remain numeric. */
  path: Array<string | number>;
  code: string;
  severity: "error" | "warning";
  fix: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export class DeclarativeValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(`Invalid declarative document: ${issues.map((issue) => `${formatPath(issue.path)}: ${issue.fix}`).join("; ")}`);
    this.name = "DeclarativeValidationError";
    this.issues = issues;
  }
}

function inferTrend(delta: string | undefined): "up" | "down" | "flat" | "none" {
  if (!delta) return "none";
  if (/^\s*[+↑]/u.test(delta)) return "up";
  if (/^\s*[-−↓]/u.test(delta)) return "down";
  return "flat";
}

/** Normalize the coordinate-free authoring facade to the existing protocol. */
export function toPresentationSpec(doc: DeclarativeDocument): PresentationSpec {
  return {
    version: "2.0",
    ...(doc.deckId ? { deckId: doc.deckId } : {}),
    title: doc.title,
    ...(doc.tokens ? { tokens: doc.tokens } : {}),
    slides: doc.slides.map((slide) => {
      const common = {
        ...(slide.id ? { id: slide.id } : {}),
        ...(slide.notes ? { notes: slide.notes } : {}),
      };
      switch (slide.layout) {
        case "title":
          return {
            ...common,
            slideType: "composition" as const,
            title: slide.title,
            gap: 16,
            blocks: [{
              primitive: "titleBlock" as const,
              region: { col: 0, row: 2, colSpan: 12, rowSpan: 6 },
              input: {
                title: slide.title,
                ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
                ...(slide.eyebrow ? { eyebrow: slide.eyebrow } : {}),
              },
            }],
          };
        case "kpi-row":
          return {
            ...common,
            slideType: "kpi-grid" as const,
            title: slide.title ?? doc.title,
            items: slide.metrics.map((metric) => ({
              label: metric.label,
              value: metric.value,
              trend: metric.trend ?? inferTrend(metric.delta),
              ...(metric.delta ? { sublabel: metric.delta } : {}),
            })),
          };
        case "chart": {
          const categories = slide.chart.series[0]?.dataPoints.map((point) => point.category) ?? [];
          return {
            ...common,
            slideType: "composition" as const,
            title: slide.title,
            gap: 16,
            blocks: [
              {
                primitive: "titleBlock" as const,
                region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
                input: {
                  title: slide.title,
                  ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
                },
              },
              {
                primitive: "chartBlock" as const,
                region: { col: 0, row: 3, colSpan: 12, rowSpan: 8 },
                input: {
                  altText: slide.chart.title ?? slide.title,
                  chartData: {
                    chartType: slide.chart.kind,
                    categories,
                    series: slide.chart.series.map((series) => ({
                      name: series.name,
                      values: series.dataPoints.map((point) => point.value),
                    })),
                    ...(slide.chart.title ? { title: { text: slide.chart.title } } : {}),
                    legend: { position: "bottom" as const },
                  },
                },
              },
            ],
          };
        }
        case "bullets":
          return {
            ...common,
            slideType: "title-body" as const,
            title: slide.title,
            ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
            body: slide.bullets,
          };
        case "comparison":
          return {
            ...common,
            slideType: "comparison-table" as const,
            title: slide.title,
            ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
            columns: slide.columns,
            rows: slide.rows,
          };
        case "timeline":
          return {
            ...common,
            slideType: "timeline" as const,
            title: slide.title,
            ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
            events: slide.events,
          };
      }
    }),
  };
}

function formatPath(path: Array<string | number>): string {
  if (path.length === 0) return "$";
  return path.reduce<string>((result, segment) => (
    typeof segment === "number" ? `${result}[${segment}]` : `${result}.${segment}`
  ), "$");
}

function schemaPath(path: PropertyKey[]): Array<string | number> {
  return path.map((segment) => typeof segment === "symbol" ? String(segment) : segment);
}

function fixForZodIssue(issue: z.core.$ZodIssue): string {
  const params = "params" in issue && issue.params && typeof issue.params === "object"
    ? issue.params as Record<string, unknown>
    : undefined;
  if (typeof params?.fix === "string") return params.fix;

  const path = formatPath(schemaPath(issue.path));
  switch (issue.code) {
    case "invalid_type": return `Set ${path} to the expected type (${issue.message}).`;
    case "too_small": return `Add the required content at ${path} (${issue.message}).`;
    case "too_big": return `Reduce the content at ${path} (${issue.message}).`;
    case "unrecognized_keys": return `Remove unsupported fields from ${path}: ${issue.keys.join(", ")}.`;
    case "invalid_value": return `Use one of the supported values at ${path} (${issue.message}).`;
    default: return `Correct ${path}: ${issue.message}`;
  }
}

function issueFromZod(issue: z.core.$ZodIssue): ValidationIssue {
  const params = "params" in issue && issue.params && typeof issue.params === "object"
    ? issue.params as Record<string, unknown>
    : undefined;
  return {
    path: schemaPath(issue.path),
    code: typeof params?.runstampCode === "string" ? params.runstampCode : `schema_${issue.code}`,
    severity: "error",
    fix: fixForZodIssue(issue),
  };
}

/**
 * Validate declarative input without rendering. Schema errors keep their exact
 * paths. Engine-specific layout preflight belongs to the consuming renderer.
 */
export function validate(input: unknown): ValidationResult {
  const parsed = DeclarativeDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map(issueFromZod) };
  }

  return { ok: true, issues: [] };
}
