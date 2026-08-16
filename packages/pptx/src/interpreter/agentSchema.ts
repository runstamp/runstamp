// src/interpreter/agentSchema.ts — Zod schemas for LLM-facing contract
//
// These schemas define the simplified, intent-driven format that AI agents
// produce. The Semantic Interpreter compiles these into full PaperDocument AST.

import { z } from "zod";
import {
  AgentThemePresetSchema,
  DesignTokensSchema,
} from "./design-tokens.js";

// ---------------------------------------------------------------------------
// Data primitives
// ---------------------------------------------------------------------------

export const KpiSchema = z.object({
  label: z.string().describe("Short label, e.g., 'Total Revenue'"),
  value: z.string().describe("Formatted metric, e.g., '$4.2M'"),
  trend: z.enum(["up", "down", "flat", "none"]).default("none"),
  sublabel: z.string().optional().describe("Brief context line"),
  style: z
    .enum(["gradient", "dark", "outline"])
    .optional()
    .describe("Card visual style"),
});

export const DataSeriesSchema = z.object({
  name: z
    .string()
    .describe("Name of the data series (e.g., '2025' or 'Product A')"),
  dataPoints: z.array(
    z.object({
      category: z.string(),
      value: z.number(),
    }),
  ).max(16384),
});

export const ComparisonSchema = z.object({
  leftLabel: z.string().trim().min(1).describe("Label for the left comparison field"),
  rightLabel: z.string().trim().min(1).describe("Label for the right comparison field"),
  rows: z.array(z.object({
    left: z.string().trim().min(1),
    right: z.string().trim().min(1),
  })).min(1).max(100),
});

// ---------------------------------------------------------------------------
// Slide pattern enum
// ---------------------------------------------------------------------------

export const SlidePatternEnum = z.enum([
  "title",
  "statement",
  "dashboard",
  "comparison",
  "chart-focus",
  "bullets",
]);

// ---------------------------------------------------------------------------
// Agent slide schema
// ---------------------------------------------------------------------------

export const AgentSlideSchema = z.object({
  pattern: SlidePatternEnum.describe(
    "The semantic layout template to use for this slide.",
  ),

  content: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    prose: z.array(z.string()).max(100).optional().describe("Paragraphs of text"),
    bulletPoints: z.array(z.string()).max(200).optional(),
    comparison: ComparisonSchema.optional().describe(
      "Explicit left/right comparison semantics. Use instead of bulletPoints on comparison slides.",
    ),
    kpis: z.array(KpiSchema).max(4).optional(),
    chart: z
      .object({
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
        type: z.enum([
          "bar", "line", "pie", "area", "doughnut", "radar",
        ]).describe("Chart type. Supported: bar, line, pie, area, doughnut, radar."),
        areaGrouping: z
          .enum(["standard", "stacked", "percentStacked"])
          .optional()
          .describe("Area-chart grouping mode. Ignored for non-area charts."),
        title: z.string().optional(),
        series: z.array(DataSeriesSchema).max(255),
      })
      .optional(),
  }),
}).superRefine((slide, context) => {
  if (slide.content.comparison && slide.pattern !== "comparison") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'content.comparison is only valid when pattern is "comparison".',
      path: ["content", "comparison"],
    });
  }
  if (slide.pattern === "comparison" && slide.content.comparison && slide.content.bulletPoints) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Explicit comparison rows and bulletPoints are mutually exclusive.",
      path: ["content", "bulletPoints"],
    });
  }
});

// ---------------------------------------------------------------------------
// Root document schema
// ---------------------------------------------------------------------------

export const AgentDocumentSchema = z.object({
  type: z.literal("presentation").default("presentation").describe(
    "Document discriminator for the hosted presentation agent contract.",
  ),
  version: z.literal("1.0").default("1.0").describe("Schema version for migration support"),
  presentationTitle: z.string(),
  companyName: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color (e.g., '#2563EB')").optional().describe("Primary accent hex color"),
  theme: AgentThemePresetSchema.optional().describe("Built-in slide-design preset."),
  designTokens: DesignTokensSchema.optional().describe("Optional slide-design token overrides applied on top of the selected theme preset."),
  slides: z.array(AgentSlideSchema).min(1).max(200),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Kpi = z.infer<typeof KpiSchema>;
export type DataSeries = z.infer<typeof DataSeriesSchema>;
export type Comparison = z.infer<typeof ComparisonSchema>;
export type SlidePattern = z.infer<typeof SlidePatternEnum>;
export type AgentSlide = z.infer<typeof AgentSlideSchema>;
export type AgentDocument = z.infer<typeof AgentDocumentSchema>;
