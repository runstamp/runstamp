import { describe, it, expect } from "vitest";
import {
  PresentationSpecSchema,
  TitleBodySlideSchema,
  KpiGridSlideSchema,
  ComparisonTableSlideSchema,
  MarketMapSlideSchema,
  TimelineSlideSchema,
  OrgChartSlideSchema,
  WaterfallSlideSchema,
  TombstoneGridSlideSchema,
} from "../index.js";

// ---- Minimal valid fixtures ----

const titleBodySlide = {
  slideType: "title-body" as const,
  title: "Intro",
  body: ["Hello world"],
};

const kpiGridSlide = {
  slideType: "kpi-grid" as const,
  title: "KPIs",
  items: [
    { label: "Revenue", value: "$1M" },
    { label: "Growth", value: "20%" },
  ],
};

const comparisonTableSlide = {
  slideType: "comparison-table" as const,
  title: "Comparison",
  columns: ["Feature", "A", "B"],
  rows: [{ label: "Feature 1", values: ["Yes", "No"] }],
};

const marketMapSlide = {
  slideType: "market-map" as const,
  title: "Market",
  companies: [
    { name: "Acme", x: 50, y: 50 },
    { name: "Beta", x: 20, y: 80 },
  ],
};

const timelineSlide = {
  slideType: "timeline" as const,
  title: "Timeline",
  events: [
    { label: "Start" },
    { label: "End" },
  ],
};

const orgChartSlide = {
  slideType: "org-chart" as const,
  title: "Org",
  nodes: [
    { id: "1", label: "CEO" },
    { id: "2", label: "CTO", parentId: "1" },
  ],
};

const waterfallSlide = {
  slideType: "waterfall" as const,
  title: "Waterfall",
  entries: [
    { label: "Start", value: 100, type: "increase" as const },
    { label: "Cost", value: 30, type: "decrease" as const },
    { label: "End", value: 70, type: "total" as const },
  ],
};

const tombstoneGridSlide = {
  slideType: "tombstone-grid" as const,
  title: "Deals",
  items: [
    { name: "Deal A" },
    { name: "Deal B" },
  ],
};

// ---- Slide schema tests ----

describe("Slide schemas", () => {
  const schemas = [
    { name: "title-body", schema: TitleBodySlideSchema, valid: titleBodySlide },
    { name: "kpi-grid", schema: KpiGridSlideSchema, valid: kpiGridSlide },
    { name: "comparison-table", schema: ComparisonTableSlideSchema, valid: comparisonTableSlide },
    { name: "market-map", schema: MarketMapSlideSchema, valid: marketMapSlide },
    { name: "timeline", schema: TimelineSlideSchema, valid: timelineSlide },
    { name: "org-chart", schema: OrgChartSlideSchema, valid: orgChartSlide },
    { name: "waterfall", schema: WaterfallSlideSchema, valid: waterfallSlide },
    { name: "tombstone-grid", schema: TombstoneGridSlideSchema, valid: tombstoneGridSlide },
  ];

  for (const { name, schema, valid } of schemas) {
    it(`${name}: accepts valid input`, () => {
      expect(schema.safeParse(valid).success).toBe(true);
    });

    it(`${name}: rejects missing title`, () => {
      const { title, ...rest } = valid;
      expect(schema.safeParse(rest).success).toBe(false);
    });
  }
});

// ---- Cross-reference refines ----

describe("OrgChartSlideSchema cross-references", () => {
  it("rejects a parentId that matches no node id", () => {
    const result = OrgChartSlideSchema.safeParse({
      ...orgChartSlide,
      nodes: [
        { id: "1", label: "CEO" },
        { id: "2", label: "CTO", parentId: "missing" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate node ids", () => {
    const result = OrgChartSlideSchema.safeParse({
      ...orgChartSlide,
      nodes: [
        { id: "1", label: "CEO" },
        { id: "1", label: "CTO", parentId: "1" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node that is its own parent", () => {
    const result = OrgChartSlideSchema.safeParse({
      ...orgChartSlide,
      nodes: [
        { id: "1", label: "CEO" },
        { id: "2", label: "CTO", parentId: "2" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a chart with no root node", () => {
    const result = OrgChartSlideSchema.safeParse({
      ...orgChartSlide,
      nodes: [
        { id: "1", label: "CEO", parentId: "2" },
        { id: "2", label: "CTO", parentId: "1" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("WaterfallSlideSchema total reconciliation", () => {
  it("rejects a final total that does not reconcile", () => {
    const result = WaterfallSlideSchema.safeParse({
      ...waterfallSlide,
      entries: [
        { label: "Start", value: 100, type: "increase" },
        { label: "Cost", value: 30, type: "decrease" },
        { label: "End", value: 90, type: "total" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a leading total as the baseline", () => {
    const result = WaterfallSlideSchema.safeParse({
      ...waterfallSlide,
      entries: [
        { label: "FY24", value: 100, type: "total" },
        { label: "Growth", value: 25, type: "increase" },
        { label: "Churn", value: 5, type: "decrease" },
        { label: "FY25", value: 120, type: "total" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("tolerates display rounding within 0.5%", () => {
    const result = WaterfallSlideSchema.safeParse({
      ...waterfallSlide,
      entries: [
        { label: "A", value: 33.33, type: "increase" },
        { label: "B", value: 66.67, type: "increase" },
        { label: "End", value: 100, type: "total" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("reconciles magnitudes for negative-styled decrease values", () => {
    const result = WaterfallSlideSchema.safeParse({
      ...waterfallSlide,
      entries: [
        { label: "Start", value: 100, type: "increase" },
        { label: "Cost", value: -30, type: "decrease" },
        { label: "End", value: 70, type: "total" },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ---- PresentationSpec tests ----

describe("PresentationSpecSchema", () => {
  const validSpec = {
    version: "2.0",
    title: "Test Deck",
    slides: [titleBodySlide],
  };

  it("accepts a valid full spec", () => {
    expect(PresentationSpecSchema.safeParse(validSpec).success).toBe(true);
  });

  it("accepts deprecated explicit layout families for compatibility", () => {
    expect(
      PresentationSpecSchema.safeParse({ ...validSpec, layoutFamily: "immersive" }).success,
    ).toBe(true);
  });

  it("requires explicit protocol version", () => {
    const { version, ...withoutVersion } = validSpec;
    expect(PresentationSpecSchema.safeParse(withoutVersion).success).toBe(false);
  });

  it("does not require layoutFamily", () => {
    expect(PresentationSpecSchema.safeParse(validSpec).success).toBe(true);
  });

  it("rejects empty slides array", () => {
    expect(
      PresentationSpecSchema.safeParse({ version: "2.0", title: "X", slides: [] }).success,
    ).toBe(false);
  });

  it("rejects missing title", () => {
    expect(
      PresentationSpecSchema.safeParse({ version: "2.0", slides: [titleBodySlide] }).success,
    ).toBe(false);
  });

  it("rejects invalid accentColor", () => {
    expect(
      PresentationSpecSchema.safeParse({ ...validSpec, accentColor: "red" }).success,
    ).toBe(false);
  });

  it("accepts deprecated valid accentColor for compatibility", () => {
    expect(
      PresentationSpecSchema.safeParse({ ...validSpec, accentColor: "#FF0000" }).success,
    ).toBe(true);
  });
});
