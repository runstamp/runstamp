// src/presets.ts — Named slide-spec factories.
//
// The hardest part of using Runstamp from a cold start isn't writing JSON,
// it's deciding *which* slides go in a McKinsey-style deck. These factories
// return fully-formed `SlideSpec` objects the caller can drop into a
// PresentationSpec, with sensible defaults and minimal required inputs.
//
// Compose with hand-written slides — `presets.cover(...)` returns the same
// shape as any slide in `spec.slides[]`. Skipping the preset and writing
// the JSON yourself remains fully supported.
//
// Start with three high-leverage presets (cover, executiveSummary,
// decisionAsk). More domain-specific factories (marketSize,
// competitiveLandscape, etc.) would require richer inputs and are deferred.

import type { CompositionSlide, TitleBodySlide } from "./index.js";

export interface CoverInput {
  title: string;
  subtitle?: string;
  footer?: string;
}

export interface ExecutiveSummaryInput {
  /** Title shown above the findings list. Defaults to "Executive summary". */
  title?: string;
  /** 3–6 short findings, one per bullet line. */
  findings: string[];
  /** Optional risk callout placed at the bottom of the slide. */
  risk?: string;
}

export interface DecisionAskInput {
  /** The decision-ask headline (1–2 lines). Replaces the action title. */
  headline: string;
  /** Optional eyebrow above the headline. */
  eyebrow?: string;
  /** Up to 3 supporting metrics. */
  metrics?: Array<{ label: string; value: string; trend?: "up" | "down" | "flat" }>;
}

export interface MarketSizeInput {
  /** Action-title sentence (e.g., "Korea SaaS market is $8.4B and growing 11% YoY"). */
  title: string;
  /** Optional eyebrow (e.g., "Market sizing"). */
  eyebrow?: string;
  /** Headline KPI — typically TAM. */
  total: { label: string; value: string; support?: string };
  /** 2–6 segment rows that sum (or break down) the total. */
  segments?: Array<{
    label: string;
    value: string;
    delta?: string;
    trend?: "up" | "down" | "flat";
  }>;
  /** Optional source / methodology footnote. */
  source?: string;
}

export interface CompetitiveLandscapeInput {
  /** Action-title sentence (e.g., "Two incumbents own enterprise; mid-market is open"). */
  title: string;
  eyebrow?: string;
  /** X-axis label endpoints. Default: { low: "Narrow scope", high: "Broad scope" }. */
  xAxisLabel?: { low: string; high: string };
  /** Y-axis label endpoints. Default: { low: "Low capability", high: "High capability" }. */
  yAxisLabel?: { low: string; high: string };
  /** Optional names for the 4 quadrants (TL, TR, BL, BR order). */
  quadrants?: [string, string, string, string];
  /** Competitors to plot. x/y are 0–100 in quadrant space. */
  competitors: Array<{
    name: string;
    x: number;
    y: number;
    emphasis?: "primary" | "secondary";
  }>;
}

export interface UnitEconomicsInput {
  /** Action-title sentence (e.g., "Unit economics: $42 contribution per order"). */
  title: string;
  eyebrow?: string;
  /**
   * Walk from revenue down to margin. Each step renders as a waterfall bar.
   * Use kind: "start" for opening, "down" for cost subtractions, "up" for
   * additions, "end" for the final margin total.
   */
  walk: Array<{
    kind: "start" | "end" | "up" | "down";
    label: string;
    value: number;
    valueLabel?: string;
  }>;
  /** Optional supporting metrics shown beneath the waterfall. */
  metrics?: Array<{
    label: string;
    value: string;
    delta?: string;
    trend?: "up" | "down" | "flat";
  }>;
}

export interface AccountTargetsInput {
  /** Action-title sentence (e.g., "Five anchor accounts represent $14M ARR"). */
  title: string;
  eyebrow?: string;
  /** Column headers — first entry is the row-label corner. */
  columns: string[];
  /** One row per account. cells.length should equal columns.length - 1. */
  accounts: Array<{
    name: string;
    cells: string[];
    accent?: boolean;
  }>;
}

export interface GtmComparisonInput {
  /** Action-title sentence (e.g., "Direct sales beats partner-led on speed and control"). */
  title: string;
  eyebrow?: string;
  /** GTM motions to compare (column headers). */
  motions: string[];
  /** Dimensions on which to compare (rows). */
  dimensions: Array<{
    label: string;
    values: string[];
    accent?: boolean;
  }>;
}

export interface RoadmapInput {
  /** Action-title sentence (e.g., "12-month launch plan, milestone-driven"). */
  title: string;
  eyebrow?: string;
  /** 2–10 ordered milestones. */
  milestones: Array<{
    /** Short tag (e.g., "Q1", "M1", "2026"). */
    tag: string;
    /** Milestone label. */
    label: string;
    /** Optional one-line description. */
    description?: string;
  }>;
}

/**
 * Title slide. Renders as a `title-body` slide with the subtitle (if any)
 * surfaced as a single body bullet — the cleanest path through the
 * existing slide-type templates without inventing a new schema.
 */
function cover(input: CoverInput): TitleBodySlide {
  const slide: TitleBodySlide = {
    slideType: "title-body",
    title: input.title,
    body: input.subtitle ? [input.subtitle] : [""],
  };
  if (input.footer) {
    // Footer text rides on the chrome.footer.disclaimer override.
    slide.chrome = { footer: { disclaimer: input.footer } };
  }
  return slide;
}

function actionTitleBlocks(
  eyebrow: string,
  title: string,
): CompositionSlide["blocks"] {
  return [
    {
      primitive: "sectionTag",
      region: { col: 0, row: 0, colSpan: 4, rowSpan: 1 },
      input: { label: eyebrow, transform: "upper" },
    },
    {
      primitive: "textBlock",
      region: { col: 0, row: 1, colSpan: 12, rowSpan: 2 },
      input: { content: title, role: "title", size: 22, weight: 500 },
    },
  ];
}

/**
 * Executive-summary composition slide: action title + bulleted findings,
 * with an optional risk callout at the bottom.
 */
function executiveSummary(input: ExecutiveSummaryInput): CompositionSlide {
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks("Executive summary", input.title ?? "Executive summary"),
    {
      primitive: "bulletList",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: input.risk ? 6 : 8 },
      input: {
        items: input.findings.slice(0, 6).map((text) => ({ text })),
      },
    },
  ];

  if (input.risk) {
    // Sharp rectangular surface (no rounded calloutBox) — see project memory.
    blocks.push({
      primitive: "bannerBand",
      region: { col: 0, row: 9, colSpan: 12, rowSpan: 2 },
      input: { text: input.risk, fill: "muted" },
    });
  }

  return {
    slideType: "composition",
    title: input.title ?? "Executive summary",
    blocks,
  };
}

/**
 * Decision-ask composition slide: a prominent banner headline + up to 3
 * supporting KPIs in a metric stack. The closing slide of most consulting
 * decks.
 */
function decisionAsk(input: DecisionAskInput): CompositionSlide {
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "Decision ask", input.headline),
  ];

  if (input.metrics && input.metrics.length > 0) {
    const n = Math.min(input.metrics.length, 3);
    blocks.push({
      primitive: "metricStack",
      region: { col: 0, row: 4, colSpan: 12, rowSpan: Math.max(4, n + 1) },
      input: {
        rows: input.metrics.slice(0, 3).map((m) => ({
          label: m.label,
          value: m.value,
          trend: m.trend,
        })),
      },
    });
  } else {
    blocks.push({
      primitive: "bannerBand",
      region: { col: 0, row: 5, colSpan: 12, rowSpan: 2 },
      input: { text: "Recommend approval to proceed" },
    });
  }

  return {
    slideType: "composition",
    title: input.headline,
    blocks,
  };
}

/**
 * Market-sizing slide: action title + KPI hero (TAM) and a metric stack
 * showing segment breakdown. The combination consultancies typically use
 * for opening slides like "Korea SaaS market is $8.4B and growing 11% YoY".
 */
function marketSize(input: MarketSizeInput): CompositionSlide {
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "Market sizing", input.title),
  ];

  const hasSegments = input.segments && input.segments.length > 0;

  if (hasSegments) {
    blocks.push({
      primitive: "kpiHero",
      region: { col: 0, row: 3, colSpan: 5, rowSpan: 6 },
      input: {
        label: input.total.label,
        value: input.total.value,
        support: input.total.support,
        verticalAlign: "center",
      },
    });
    const n = Math.min(input.segments!.length, 6);
    blocks.push({
      primitive: "metricStack",
      region: { col: 5, row: 3, colSpan: 7, rowSpan: Math.max(4, n + 1) },
      input: {
        rows: input.segments!.slice(0, 6).map((s) => ({
          label: s.label,
          value: s.value,
          delta: s.delta,
          trend: s.trend,
        })),
      },
    });
  } else {
    blocks.push({
      primitive: "kpiHero",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 6 },
      input: {
        label: input.total.label,
        value: input.total.value,
        support: input.total.support,
        verticalAlign: "center",
      },
    });
  }

  if (input.source) {
    blocks.push({
      primitive: "sourceLine",
      region: { col: 0, row: 11, colSpan: 12, rowSpan: 1 },
      input: { content: input.source },
    });
  }

  return {
    slideType: "composition",
    title: input.title,
    blocks,
  };
}

/**
 * Competitive-landscape slide: action title + a 2×2 quadrant map plotting
 * competitors. Default axes describe scope (x) and capability (y) — pass
 * `xAxisLabel`/`yAxisLabel` for domain-specific framings.
 */
function competitiveLandscape(input: CompetitiveLandscapeInput): CompositionSlide {
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "Competitive landscape", input.title),
    {
      primitive: "quadrantMap",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        xAxisLabel: input.xAxisLabel ?? { low: "Narrow scope", high: "Broad scope" },
        yAxisLabel: input.yAxisLabel ?? { low: "Low capability", high: "High capability" },
        quadrants: input.quadrants,
        points: input.competitors.slice(0, 24).map((c) => ({
          name: c.name,
          x: c.x,
          y: c.y,
          emphasis: c.emphasis,
        })),
      },
    },
  ];

  return {
    slideType: "composition",
    title: input.title,
    blocks,
  };
}

/**
 * Unit-economics slide: action title + a waterfall walk from revenue down
 * to contribution margin, with optional supporting metrics beneath.
 */
function unitEconomics(input: UnitEconomicsInput): CompositionSlide {
  const hasMetrics = input.metrics && input.metrics.length > 0;
  const waterfallRowSpan = hasMetrics ? 6 : 9;

  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "Unit economics", input.title),
    {
      primitive: "waterfallBars",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: waterfallRowSpan },
      input: {
        steps: input.walk.slice(0, 20).map((s) => ({
          kind: s.kind,
          label: s.label,
          value: s.value,
          valueLabel: s.valueLabel,
        })),
      },
    },
  ];

  if (hasMetrics) {
    const n = Math.min(input.metrics!.length, 4);
    blocks.push({
      primitive: "metricStack",
      region: { col: 0, row: 9, colSpan: 12, rowSpan: Math.max(2, Math.ceil(n / 2) + 1) },
      input: {
        rows: input.metrics!.slice(0, 4).map((m) => ({
          label: m.label,
          value: m.value,
          delta: m.delta,
          trend: m.trend,
        })),
      },
    });
  }

  return {
    slideType: "composition",
    title: input.title,
    blocks,
  };
}

/**
 * Account-targets slide: action title + a matrix table listing target
 * accounts with arbitrary attribute columns (tier, owner, ARR, etc.).
 */
function accountTargets(input: AccountTargetsInput): CompositionSlide {
  const dataColumnHeaders = input.columns.slice(1);
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "Account targets", input.title),
    {
      primitive: "matrixTable",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        columnHeaders: [input.columns[0] ?? null, ...dataColumnHeaders],
        rows: input.accounts.slice(0, 20).map((a) => ({
          label: a.name,
          cells: a.cells.slice(0, dataColumnHeaders.length),
          accent: a.accent,
        })),
      },
    },
  ];

  return {
    slideType: "composition",
    title: input.title,
    blocks,
  };
}

/**
 * GTM-comparison slide: action title + a comparisonBand contrasting two
 * or more go-to-market motions across shared dimensions.
 */
function gtmComparison(input: GtmComparisonInput): CompositionSlide {
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "GTM comparison", input.title),
    {
      primitive: "comparisonBand",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        columns: input.motions.slice(0, 8),
        rows: input.dimensions.slice(0, 20).map((d) => ({
          label: d.label,
          values: d.values.slice(0, input.motions.length),
          accent: d.accent,
        })),
      },
    },
  ];

  return {
    slideType: "composition",
    title: input.title,
    blocks,
  };
}

/**
 * Roadmap slide: action title + a horizontal step timeline of milestones.
 */
function roadmap(input: RoadmapInput): CompositionSlide {
  const blocks: CompositionSlide["blocks"] = [
    ...actionTitleBlocks(input.eyebrow ?? "Roadmap", input.title),
    {
      primitive: "stepTimeline",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        steps: input.milestones.slice(0, 10).map((m) => ({
          tag: m.tag,
          label: m.label,
          description: m.description,
        })),
      },
    },
  ];

  return {
    slideType: "composition",
    title: input.title,
    blocks,
  };
}

/**
 * Named slide-spec factories. Drop the result into `spec.slides[]`.
 *
 * @example
 *   import { presets, compilePresentationSpec, PaperEngine } from "@runstamp/pptx";
 *
 *   const spec = {
 *     version: "2.0",
 *     title: "Korea expansion",
 *     slides: [
 *       presets.cover({ title: "Korea expansion", subtitle: "$8.4B SaaS market" }),
 *       presets.executiveSummary({
 *         findings: ["Workflow grows 2× the market", "5 anchor accounts"],
 *         risk: "Local incumbents may file IP claims",
 *       }),
 *       presets.decisionAsk({
 *         headline: "Greenlight $4M Y1 budget",
 *         metrics: [{ label: "Y1 ARR", value: "$4.2M", trend: "up" }],
 *       }),
 *     ],
 *   };
 */
export const presets = {
  cover,
  executiveSummary,
  decisionAsk,
  marketSize,
  competitiveLandscape,
  unitEconomics,
  accountTargets,
  gtmComparison,
  roadmap,
} as const;
