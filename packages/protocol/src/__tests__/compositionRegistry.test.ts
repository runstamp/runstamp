import { describe, expect, it } from "vitest";
import {
  COMPOSITION_PRIMITIVE_NAMES,
  CompositionBlockSchema,
  type CompositionPrimitiveName,
} from "../composition.js";
import type {
  BannerBandInput,
  BulletListInput,
  CalloutBoxInput,
  ChartBlockInput,
  ChevronArrowInput,
  ComparisonBandInput,
  ConnectorLineInput,
  DiagonalStampInput,
  GroupBorderInput,
  HarveyBallInput,
  ImageBleedInput,
  InfoCardInput,
  KpiHeroInput,
  LegendTableInput,
  MatrixTableInput,
  MetricStackInput,
  NumberedChipInput,
  OrgTreeInput,
  PageStampInput,
  QuadrantMapInput,
  SectionRibbonInput,
  SectionTagInput,
  SourceLineInput,
  StepTimelineInput,
  TextBlockInput,
  TitleBlockInput,
  TocTilesInput,
  TombstoneStackInput,
  WaterfallBarsInput,
} from "@runstamp/pptx-primitives";

const primitiveExamples = {
  titleBlock: { title: "Market map", eyebrow: "API", subtitle: "One primitive schema" } satisfies TitleBlockInput,
  bulletList: { items: [{ text: "First" }, { text: "Nested", level: 2 }] } satisfies BulletListInput,
  sectionRibbon: { label: "Introduction" } satisfies SectionRibbonInput,
  sectionTag: { label: "Phase 1", fill: "accent" } satisfies SectionTagInput,
  sourceLine: { content: "Runstamp primitive audit", kind: "source" } satisfies SourceLineInput,
  textBlock: { content: "Editable text", role: "body", fill: "surface" } satisfies TextBlockInput,
  infoCard: {
    sideLabel: { text: "A", position: "left" },
    lead: "Card lead",
    body: [{ text: "Evidence line" }],
    footer: { text: "Footer note" },
  } satisfies InfoCardInput,
  matrixTable: {
    columnHeaders: ["", "Now", "Next"],
    rows: [{ label: "Reliability", cells: ["Measured", "Gated"] }],
  } satisfies MatrixTableInput,
  comparisonBand: {
    columns: ["Capability", "Status"],
    rows: [{ label: "Schema", values: ["Strict"] }],
  } satisfies ComparisonBandInput,
  stepTimeline: {
    steps: [
      { tag: "1", label: "Audit" },
      { tag: "2", label: "Proof" },
    ],
  } satisfies StepTimelineInput,
  waterfallBars: {
    steps: [
      { kind: "start", label: "Base", value: 10 },
      { kind: "up", label: "Lift", value: 5 },
      { kind: "end", label: "End", value: 15 },
    ],
  } satisfies WaterfallBarsInput,
  orgTree: {
    root: { title: "Engine" },
    children: [{ title: "Protocol" }, { title: "Primitives" }],
  } satisfies OrgTreeInput,
  tombstoneStack: {
    tiles: [{ title: "Primitive", body: "Stable" }],
  } satisfies TombstoneStackInput,
  tocTiles: {
    tiles: [{ marker: 1, title: "Audit", body: "Strict schema" }],
  } satisfies TocTilesInput,
  metricStack: {
    rows: [{ label: "Warnings", value: "0", trend: "down" }],
  } satisfies MetricStackInput,
  kpiHero: {
    label: "Stable primitives",
    value: "29",
    trend: "flat",
    support: "registered for composition",
  } satisfies KpiHeroInput,
  chartBlock: {
    chartData: {
      chartType: "bar",
      categories: ["A", "B"],
      series: [{ name: "Series", values: [1, 2] }],
    },
    altText: "Audit chart",
  } satisfies ChartBlockInput,
  quadrantMap: {
    xAxisLabel: { low: "low", high: "high" },
    yAxisLabel: { low: "low", high: "high" },
    quadrants: ["Watch", "Build", "Fix", "Scale"],
    points: [{ name: "API", x: 65, y: 70, emphasis: "primary" }],
  } satisfies QuadrantMapInput,
  imageBleed: {
    fallbackText: "Image fallback",
    bleed: "inline",
  } satisfies ImageBleedInput,
  harveyBall: { filled: 3 } satisfies HarveyBallInput,
  calloutBox: { content: "Strict input", shape: "rect" } satisfies CalloutBoxInput,
  chevronArrow: { label: "Next", direction: "right", fill: "accent" } satisfies ChevronArrowInput,
  numberedChip: { index: 9, size: 28, anchor: "center" } satisfies NumberedChipInput,
  diagonalStamp: { text: "DRAFT", rotation: -14, color: "faint" } satisfies DiagonalStampInput,
  legendTable: {
    items: [{ color: "#0F766E", label: "Pass", value: "100%" }],
  } satisfies LegendTableInput,
  bannerBand: { text: "Stable", fill: "accent" } satisfies BannerBandInput,
  connectorLine: {
    start: { x: 100, y: 100 },
    end: { x: 180, y: 140 },
    arrowEnd: true,
  } satisfies ConnectorLineInput,
  groupBorder: { label: "Group", style: "dashed" } satisfies GroupBorderInput,
  pageStamp: { fallbackText: "Runstamp" } satisfies PageStampInput,
} satisfies Record<CompositionPrimitiveName, unknown>;

const region = { col: 0, row: 0, colSpan: 4, rowSpan: 2 };

describe("composition primitive registry", () => {
  it("has a typed example for every registered public primitive", () => {
    expect(COMPOSITION_PRIMITIVE_NAMES.toSorted()).toEqual(Object.keys(primitiveExamples).toSorted());
  });

  it("accepts the TypeScript-shaped example input for every registered primitive", () => {
    for (const primitive of COMPOSITION_PRIMITIVE_NAMES) {
      const result = CompositionBlockSchema.safeParse({
        primitive,
        region,
        input: primitiveExamples[primitive],
      });
      expect(result.success, primitive).toBe(true);
    }
  });

  it("rejects unknown input fields for every registered primitive", () => {
    for (const primitive of COMPOSITION_PRIMITIVE_NAMES) {
      const result = CompositionBlockSchema.safeParse({
        primitive,
        region,
        input: {
          ...(primitiveExamples[primitive] as Record<string, unknown>),
          strayField: true,
        },
      });
      expect(result.success, primitive).toBe(false);
    }
  });

  it("does not register the retired actionTitle primitive", () => {
    expect(COMPOSITION_PRIMITIVE_NAMES).not.toContain("actionTitle" as CompositionPrimitiveName);
    expect(CompositionBlockSchema.safeParse({
      primitive: "actionTitle",
      region,
      input: { eyebrow: "Market", title: "Use sectionTag plus textBlock instead" },
    }).success).toBe(false);
  });

  it("rejects common cookbook drift aliases", () => {
    const invalidBlocks = [
      {
        primitive: "matrixTable",
        input: { headers: ["", "A"], rows: [{ label: "R", cells: ["C"] }] },
      },
      {
        primitive: "metricStack",
        input: { metrics: [{ label: "ARR", value: "$1M" }] },
      },
      {
        primitive: "kpiHero",
        input: { label: "ARR", value: "$1M", verticalAlign: "middle" },
      },
      {
        primitive: "harveyBall",
        input: { value: 0.75 },
      },
      {
        primitive: "waterfallBars",
        input: { bars: [{ kind: "total", label: "Start", value: 1 }] },
      },
      {
        primitive: "quadrantMap",
        input: { items: [{ label: "A", x: 0.5, y: 0.5 }] },
      },
      {
        primitive: "pageStamp",
        input: { index: 1, total: 10 },
      },
    ];

    for (const block of invalidBlocks) {
      const result = CompositionBlockSchema.safeParse({
        primitive: block.primitive,
        region,
        input: block.input,
      });
      expect(result.success, block.primitive).toBe(false);
    }
  });
});
