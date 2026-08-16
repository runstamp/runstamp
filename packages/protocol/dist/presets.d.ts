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
    metrics?: Array<{
        label: string;
        value: string;
        trend?: "up" | "down" | "flat";
    }>;
}
export interface MarketSizeInput {
    /** Action-title sentence (e.g., "Korea SaaS market is $8.4B and growing 11% YoY"). */
    title: string;
    /** Optional eyebrow (e.g., "Market sizing"). */
    eyebrow?: string;
    /** Headline KPI — typically TAM. */
    total: {
        label: string;
        value: string;
        support?: string;
    };
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
    xAxisLabel?: {
        low: string;
        high: string;
    };
    /** Y-axis label endpoints. Default: { low: "Low capability", high: "High capability" }. */
    yAxisLabel?: {
        low: string;
        high: string;
    };
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
declare function cover(input: CoverInput): TitleBodySlide;
/**
 * Executive-summary composition slide: action title + bulleted findings,
 * with an optional risk callout at the bottom.
 */
declare function executiveSummary(input: ExecutiveSummaryInput): CompositionSlide;
/**
 * Decision-ask composition slide: a prominent banner headline + up to 3
 * supporting KPIs in a metric stack. The closing slide of most consulting
 * decks.
 */
declare function decisionAsk(input: DecisionAskInput): CompositionSlide;
/**
 * Market-sizing slide: action title + KPI hero (TAM) and a metric stack
 * showing segment breakdown. The combination consultancies typically use
 * for opening slides like "Korea SaaS market is $8.4B and growing 11% YoY".
 */
declare function marketSize(input: MarketSizeInput): CompositionSlide;
/**
 * Competitive-landscape slide: action title + a 2×2 quadrant map plotting
 * competitors. Default axes describe scope (x) and capability (y) — pass
 * `xAxisLabel`/`yAxisLabel` for domain-specific framings.
 */
declare function competitiveLandscape(input: CompetitiveLandscapeInput): CompositionSlide;
/**
 * Unit-economics slide: action title + a waterfall walk from revenue down
 * to contribution margin, with optional supporting metrics beneath.
 */
declare function unitEconomics(input: UnitEconomicsInput): CompositionSlide;
/**
 * Account-targets slide: action title + a matrix table listing target
 * accounts with arbitrary attribute columns (tier, owner, ARR, etc.).
 */
declare function accountTargets(input: AccountTargetsInput): CompositionSlide;
/**
 * GTM-comparison slide: action title + a comparisonBand contrasting two
 * or more go-to-market motions across shared dimensions.
 */
declare function gtmComparison(input: GtmComparisonInput): CompositionSlide;
/**
 * Roadmap slide: action title + a horizontal step timeline of milestones.
 */
declare function roadmap(input: RoadmapInput): CompositionSlide;
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
export declare const presets: {
    readonly cover: typeof cover;
    readonly executiveSummary: typeof executiveSummary;
    readonly decisionAsk: typeof decisionAsk;
    readonly marketSize: typeof marketSize;
    readonly competitiveLandscape: typeof competitiveLandscape;
    readonly unitEconomics: typeof unitEconomics;
    readonly accountTargets: typeof accountTargets;
    readonly gtmComparison: typeof gtmComparison;
    readonly roadmap: typeof roadmap;
};
export {};
//# sourceMappingURL=presets.d.ts.map