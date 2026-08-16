import { z } from "zod";
import { TokenBundleSchema } from "@runstamp/pptx-primitives";
import { CompositionBlockSchema } from "./composition.js";
export * from "./accessibility.js";
export * from "./extension-v1.js";
export * from "./extension-runtime.js";
export * from "./operation-projection.js";
export {
  COMPOSITION_PRIMITIVE_NAMES,
  CompositionBlockSchema,
  buildCompositionBlocks,
  type CompositionBlock,
  type CompositionCanvas,
  type CompositionPrimitiveName,
  type CompositionRegion,
} from "./composition.js";
export {
  MIN_REGION_STATIC,
  MIN_REGION_VARIABLE,
  minRegionFor,
  remediationFor,
  type RegionSize,
} from "./minRegion.js";

const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Expected a 6-digit hex color like #2563EB");

const RichTextArraySchema = z.array(z.string().min(1)).min(1).max(12);
const JsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const JsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  JsonScalarSchema,
  z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]));

export const ProtocolVersionSchema = z.literal("2.0");
export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;

export const LayoutFamilySchema = z.enum([
  "editorial",
  "board",
  "product",
  "immersive",
]);
export type LayoutFamily = z.infer<typeof LayoutFamilySchema>;

export const BrandRefSchema = z
  .object({
    brandPackId: z.string().min(1).optional(),
    brandPackVersionId: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.brandPackId || value.brandPackVersionId),
    "brandPackId or brandPackVersionId is required when brand is supplied",
  );
export type BrandRef = z.infer<typeof BrandRefSchema>;

export const ProtocolLineageSchema = z.object({
  sourceType: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  workflowRunId: z.string().min(1).optional(),
  releaseId: z.string().min(1).optional(),
  labels: z.record(z.string(), z.string()).optional(),
});
export type ProtocolLineage = z.infer<typeof ProtocolLineageSchema>;

export const ProtocolBindingSchema = z.object({
  bindingKey: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  path: z.string().min(1),
  targetPath: z.string().min(1).optional(),
  required: z.boolean().optional(),
  defaultValue: JsonValueSchema.optional(),
  transform: z.object({
    type: z.enum(["identity", "number", "string", "boolean", "json"]).default("identity"),
    fallback: JsonValueSchema.optional(),
  }).optional(),
});
export type ProtocolBinding = z.infer<typeof ProtocolBindingSchema>;

export const ProtocolKpiSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  trend: z.enum(["up", "down", "flat", "none"]).default("none"),
  sublabel: z.string().optional(),
});

export const ComparisonRowSchema = z.object({
  label: z.string().min(1),
  values: z.array(z.string().min(1)).min(2).max(6),
  highlight: z.boolean().optional(),
});

export const MarketMapCompanySchema = z.object({
  name: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  emphasis: z.enum(["primary", "secondary"]).default("secondary"),
});

export const TimelineEventSchema = z.object({
  label: z.string().min(1),
  date: z.string().optional(),
  description: z.string().optional(),
});

export const OrgChartNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: z.string().optional(),
  parentId: z.string().optional(),
});

export const WaterfallEntrySchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  type: z.enum(["increase", "decrease", "total"]),
});

export const TombstoneItemSchema = z.object({
  name: z.string().min(1),
  subtitle: z.string().optional(),
  metrics: z.array(z.string().min(1)).max(4).optional(),
});

export const ProtocolAnimationSchema = z.enum(["buildByPoint", "fadeIn", "none"]).optional();
export type ProtocolAnimation = z.infer<typeof ProtocolAnimationSchema>;

const ProtocolTransitionSchema = z.object({
  type: z.enum(["morph", "fade", "push", "wipe", "split", "cover", "zoom", "none"]),
  speed: z.enum(["slow", "med", "fast"]).optional(),
  advanceOnClick: z.boolean().optional(),
  advanceAfterMs: z.number().int().min(0).max(60000).optional(),
  morphOption: z.enum(["byObject", "byWord", "byChar"]).optional(),
}).optional();

const SlideChromeOverrideSchema = z.object({
  headerRibbon: z.object({
    enabled: z.boolean().optional(),
    height: z.number().nonnegative().optional(),
    fill: z.enum(["foreground", "accent", "muted", "surface"]).optional(),
    type: z.enum(["nav", "eyebrow", "caption"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
  }).strict().optional(),
  footer: z.object({
    enabled: z.boolean().optional(),
    layout: z.array(z.enum(["disclaimer", "projectCode", "watermark", "pageNumber", "spacer"])).optional(),
    height: z.number().nonnegative().optional(),
    topRule: z.string().optional(),
    disclaimer: z.string().optional(),
    projectCode: z.string().optional(),
    watermark: z.string().optional(),
  }).strict().optional(),
}).strict().optional();

const SlideBaseSchema = z.object({
  id: z.string().min(1).optional(),
  slideId: z.string().min(1).optional(),
  componentId: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  insight: z.string().optional(),
  notes: z.array(z.string().min(1)).max(6).optional(),
  transition: ProtocolTransitionSchema,
  animation: ProtocolAnimationSchema,
  bindings: z.array(ProtocolBindingSchema).max(50).optional(),
  lineage: ProtocolLineageSchema.optional(),
  /** Per-slide chrome override. Merged into the resolved token bundle's
   *  chrome before regions and footer nodes are built for this slide. */
  chrome: SlideChromeOverrideSchema,
});

export const TitleBodySlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("title-body"),
  title: z.string().min(1),
  eyebrow: z.string().optional(),
  body: RichTextArraySchema,
});

export const KpiGridSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("kpi-grid"),
  title: z.string().min(1),
  items: z.array(ProtocolKpiSchema).min(2).max(6),
});

export const ComparisonTableSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("comparison-table"),
  title: z.string().min(1),
  // columns[0] is the label column header, columns[1..] are data column headers.
  // Min 3: label + at least 2 data columns (matching ComparisonRowSchema.values.min(2)).
  columns: z.array(z.string().min(1)).min(3).max(6),
  rows: z.array(ComparisonRowSchema).min(1).max(12),
}).refine(
  (data) => data.rows.every((r) => r.values.length === data.columns.length - 1),
  { message: "Each row must have exactly columns.length - 1 values (first column is the label header)" },
);

export const MarketMapSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("market-map"),
  title: z.string().min(1),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  quadrants: z.array(z.string().min(1)).length(4).optional(),
  companies: z.array(MarketMapCompanySchema).min(2).max(24),
});

export const TimelineSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("timeline"),
  title: z.string().min(1),
  events: z.array(TimelineEventSchema).min(2).max(10),
});

export const OrgChartSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("org-chart"),
  title: z.string().min(1),
  nodes: z.array(OrgChartNodeSchema).min(2).max(20),
}).superRefine((slide, ctx) => {
  const ids = new Set<string>();
  slide.nodes.forEach((node, i) => {
    if (ids.has(node.id)) {
      ctx.addIssue({ code: "custom", path: ["nodes", i, "id"], message: `Duplicate node id "${node.id}"` });
    }
    ids.add(node.id);
  });
  let hasRoot = false;
  slide.nodes.forEach((node, i) => {
    if (!node.parentId) {
      hasRoot = true;
    } else if (node.parentId === node.id) {
      ctx.addIssue({ code: "custom", path: ["nodes", i, "parentId"], message: `Node "${node.id}" cannot be its own parent` });
    } else if (!ids.has(node.parentId)) {
      ctx.addIssue({ code: "custom", path: ["nodes", i, "parentId"], message: `parentId "${node.parentId}" does not match any node id` });
    }
  });
  if (!hasRoot) {
    ctx.addIssue({ code: "custom", path: ["nodes"], message: "org-chart requires at least one root node (a node without parentId)" });
  }
});

export const WaterfallSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("waterfall"),
  title: z.string().min(1),
  entries: z.array(WaterfallEntrySchema).min(3).max(20),
}).superRefine((slide, ctx) => {
  // Totals must reconcile with the running sum of the preceding steps.
  // Magnitudes only — the compiler plots Math.abs of every value.
  let running = 0;
  slide.entries.forEach((entry, i) => {
    const magnitude = Math.abs(entry.value);
    if (entry.type === "increase") {
      running += magnitude;
    } else if (entry.type === "decrease") {
      running -= magnitude;
    } else if (i === 0) {
      running = magnitude;
    } else {
      const tolerance = Math.max(0.01, Math.abs(running) * 0.005);
      if (Math.abs(magnitude - running) > tolerance) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", i, "value"],
          message: `Total "${entry.label}" (${entry.value}) does not reconcile with the running total ${running} of the preceding entries`,
        });
      }
      running = magnitude;
    }
  });
});

export const TombstoneGridSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("tombstone-grid"),
  title: z.string().min(1),
  items: z.array(TombstoneItemSchema).min(2).max(12),
});

/**
 * Composition slide — caller-supplied primitive layout.
 *
 * Escape hatch for callers that need layouts beyond the eight
 * slideType templates. Each block places a primitive on a 12×12 grid
 * carved from the usable canvas (slide minus margins and footer
 * reserve). Title chrome is NOT auto-emitted — the caller composes
 * their own header via a titleBlock block when needed.
 *
 * Footer chrome (when tokens.chrome.footer.enabled) is still
 * automatically emitted below the composition canvas.
 */
export const CompositionSlideSchema = SlideBaseSchema.extend({
  slideType: z.literal("composition"),
  /** Used for diagnostics + lineage. Not rendered automatically. */
  title: z.string().min(1),
  blocks: z.array(CompositionBlockSchema).min(1).max(20),
  /** Gutter (px) between adjacent grid cells. Each cell is inset by
   *  `gap/2` on every side so adjacent siblings leave a full `gap` of
   *  white space between them. Defaults to 0. */
  gap: z.number().nonnegative().optional(),
});

export const SlideSpecSchema = z.discriminatedUnion("slideType", [
  TitleBodySlideSchema,
  KpiGridSlideSchema,
  ComparisonTableSlideSchema,
  MarketMapSlideSchema,
  TimelineSlideSchema,
  OrgChartSlideSchema,
  WaterfallSlideSchema,
  TombstoneGridSlideSchema,
  CompositionSlideSchema,
]);

export const PresentationSpecSchema = z.object({
  version: ProtocolVersionSchema,
  deckId: z.string().min(1).optional(),
  title: z.string().min(1),
  /** Deprecated. Named style families are retired. Omit this field; the
   *  compiler ignores it and emits PROTOCOL_LAYOUTFAMILY_DEPRECATED when
   *  legacy callers still pass it. */
  layoutFamily: LayoutFamilySchema.optional(),
  /** Deprecated. Use `tokens.palette.accent` instead. Accepted only as a
   *  legacy convenience while callers migrate. */
  accentColor: HexColorSchema.optional(),
  /** Caller-supplied open token bundle. Drives all aesthetic decisions —
   *  palette, typography, rules, chrome, ornament. Omit to use
   *  BOOTSTRAP_TOKENS (reasonable default). This field replaces
   *  `layoutFamily` as the aesthetic contract. */
  tokens: TokenBundleSchema.optional(),
  brand: BrandRefSchema.optional(),
  variables: z.record(z.string(), JsonValueSchema).optional(),
  bindings: z.array(ProtocolBindingSchema).max(200).optional(),
  lineage: ProtocolLineageSchema.optional(),
  slides: z.array(SlideSpecSchema).min(1).max(200),
});

export type ProtocolKpi = z.infer<typeof ProtocolKpiSchema>;
export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;
export type MarketMapCompany = z.infer<typeof MarketMapCompanySchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type OrgChartNode = z.infer<typeof OrgChartNodeSchema>;
export type WaterfallEntry = z.infer<typeof WaterfallEntrySchema>;
export type TombstoneItem = z.infer<typeof TombstoneItemSchema>;
export type TitleBodySlide = z.infer<typeof TitleBodySlideSchema>;
export type KpiGridSlide = z.infer<typeof KpiGridSlideSchema>;
export type ComparisonTableSlide = z.infer<typeof ComparisonTableSlideSchema>;
export type MarketMapSlide = z.infer<typeof MarketMapSlideSchema>;
export type TimelineSlide = z.infer<typeof TimelineSlideSchema>;
export type OrgChartSlide = z.infer<typeof OrgChartSlideSchema>;
export type WaterfallSlide = z.infer<typeof WaterfallSlideSchema>;
export type TombstoneGridSlide = z.infer<typeof TombstoneGridSlideSchema>;
export type CompositionSlide = z.infer<typeof CompositionSlideSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;
export type PresentationSpec = z.infer<typeof PresentationSpecSchema>;

export const presentationSpecJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runstamp.com/schema/protocol/v2/presentation-spec.json",
  title: "Runstamp PresentationSpec",
  type: "object",
  additionalProperties: false,
  required: ["version", "title", "slides"],
  properties: {
    version: { const: "2.0" },
    deckId: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    tokens: { type: "object", additionalProperties: true },
    layoutFamily: {
      type: "string",
      enum: ["editorial", "board", "product", "immersive"],
      deprecated: true,
      description: "Retired. Omit this field; tokens drive PPTX styling.",
    },
    accentColor: {
      type: "string",
      pattern: "^#[0-9A-Fa-f]{6}$",
      deprecated: true,
      description: "Retired. Use tokens.palette.accent instead.",
    },
    brand: {
      type: "object",
      additionalProperties: false,
      properties: {
        brandPackId: { type: "string", minLength: 1 },
        brandPackVersionId: { type: "string", minLength: 1 },
      },
      anyOf: [{ required: ["brandPackId"] }, { required: ["brandPackVersionId"] }],
    },
    variables: {
      type: "object",
      additionalProperties: true,
    },
    bindings: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bindingKey", "path"],
        properties: {
          bindingKey: { type: "string", minLength: 1 },
          sourceId: { type: "string", minLength: 1 },
          path: { type: "string", minLength: 1 },
          targetPath: { type: "string", minLength: 1 },
          required: { type: "boolean" },
          defaultValue: {},
          transform: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { enum: ["identity", "number", "string", "boolean", "json"] },
              fallback: {},
            },
          },
        },
      },
    },
    lineage: {
      type: "object",
      additionalProperties: false,
      properties: {
        sourceType: { type: "string", minLength: 1 },
        sourceId: { type: "string", minLength: 1 },
        workflowId: { type: "string", minLength: 1 },
        workflowRunId: { type: "string", minLength: 1 },
        releaseId: { type: "string", minLength: 1 },
        labels: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
    },
    slides: {
      type: "array",
      minItems: 1,
      maxItems: 200,
      items: {
        oneOf: [
          { type: "object", required: ["slideType", "title", "body"], properties: { slideType: { const: "title-body" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "items"], properties: { slideType: { const: "kpi-grid" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "columns", "rows"], properties: { slideType: { const: "comparison-table" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "companies"], properties: { slideType: { const: "market-map" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "events"], properties: { slideType: { const: "timeline" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "nodes"], properties: { slideType: { const: "org-chart" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "entries"], properties: { slideType: { const: "waterfall" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "items"], properties: { slideType: { const: "tombstone-grid" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
          { type: "object", required: ["slideType", "title", "blocks"], properties: { slideType: { const: "composition" }, animation: { type: "string", enum: ["buildByPoint", "fadeIn", "none"] } } },
        ],
      },
    },
  },
} as const;

export {
  DeclarativeChartSchema,
  DeclarativeChartSeriesSchema,
  DeclarativeDocumentSchema,
  DeclarativeLayoutSchema,
  DeclarativeMetricSchema,
  DeclarativeSlideSchema,
  DeclarativeValidationError,
  toPresentationSpec,
  validate,
} from "./declarative.js";
export type {
  DeclarativeChart,
  DeclarativeChartSeries,
  DeclarativeDocument,
  DeclarativeLayout,
  DeclarativeMetric,
  DeclarativeSlide,
  ValidationIssue,
  ValidationResult,
} from "./declarative.js";
export { presets } from "./presets.js";
export type {
  CoverInput,
  ExecutiveSummaryInput,
  DecisionAskInput,
  MarketSizeInput,
  CompetitiveLandscapeInput,
  UnitEconomicsInput,
  AccountTargetsInput,
  GtmComparisonInput,
  RoadmapInput,
} from "./presets.js";
