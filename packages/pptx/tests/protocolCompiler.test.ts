import { describe, it, expect } from "vitest";
import { validateAbsoluteDocumentLayout } from "../src/layout/absoluteSafety.js";
import { compilePresentationSpec } from "../src/protocol/compiler.js";
import type { PresentationSpec } from "@runstamp/protocol";

// ---- Fixtures ----

function makeSpec(overrides?: Partial<PresentationSpec>): PresentationSpec {
  return {
    version: "2.0",
    title: "Test Deck",
    slides: [
      { slideType: "title-body", title: "Slide 1", body: ["Hello"] },
    ],
    ...overrides,
  };
}

// ---- Basic compilation ----

describe("compilePresentationSpec", () => {
  it("returns a PaperDocument with correct structure", () => {
    const doc = compilePresentationSpec(makeSpec());
    expect(doc.type).toBe("Document");
    expect(doc.slides).toHaveLength(1);
    expect(doc.meta?.title).toBe("Test Deck");
    expect(doc.slideSize).toEqual({ width: 960, height: 540 });
  });

  it("propagates accent color from spec", () => {
    const doc = compilePresentationSpec(makeSpec({ accentColor: "#FF0000" }));
    expect(doc.theme?.colorScheme?.accent1).toBe("#FF0000");
  });

  it("propagates accent color from options over spec", () => {
    const doc = compilePresentationSpec(
      makeSpec({ accentColor: "#FF0000" }),
      { accentColor: "#00FF00" },
    );
    expect(doc.theme?.colorScheme?.accent1).toBe("#00FF00");
  });

  it("uses BOOTSTRAP_TOKENS palette when no accent or tokens are provided", () => {
    // Phase-2 change: the default accent is the bootstrap black
    // (#0A0A0A), not the former hardcoded editorial blue (#2563EB).
    // Callers who want blue should pass a tokens bundle.
    const doc = compilePresentationSpec(makeSpec());
    expect(doc.theme?.colorScheme?.accent1).toBe("#0A0A0A");
  });

  it("uses a stable protocol theme name without layoutFamily", () => {
    const doc = compilePresentationSpec(makeSpec());
    expect(doc.theme?.name).toBe("Runstamp Protocol");
    // The namespace tracks the writer. Left as `runstamp.` this guard could never
    // fire again, since the compiler now only ever emits `runstamp.` properties.
    expect(doc.customProperties?.some((entry) => entry.name === "runstamp.layoutFamily")).toBe(false);
  });

  it("applies caller-supplied tokens to theme colors", () => {
    const doc = compilePresentationSpec(makeSpec({
      tokens: {
        version: "1.0",
        palette: { accent: "#DA291C", foreground: "#000000", muted: "#3A4651" },
      },
    }));
    expect(doc.theme?.colorScheme?.accent1).toBe("#DA291C");
    expect(doc.theme?.colorScheme?.dk1).toBe("#000000");
    expect(doc.theme?.colorScheme?.dk2).toBe("#3A4651");
  });

  it("applies caller-supplied tokens to fontScheme", () => {
    const doc = compilePresentationSpec(makeSpec({
      tokens: {
        version: "1.0",
        type: {
          title: { family: "Playfair Display" },
          body: { family: "Helvetica Neue" },
        },
      },
    }));
    expect(doc.theme?.fontScheme?.majorLatin).toBe("Playfair Display");
    expect(doc.theme?.fontScheme?.minorLatin).toBe("Helvetica Neue");
  });

  it("emits token-driven slide edge rules", () => {
    const doc = compilePresentationSpec(makeSpec({
      tokens: {
        version: "1.0",
        canvas: { margin: 40 },
        palette: { rule: "#ABCDEF" },
        rules: { edge: "1px solid token:rule" },
      },
    }));

    const edgeRule = doc.slides[0].children.find((node) =>
      node.type === "View"
      && node.style?.left === 40
      && node.style?.top === 46
      && node.style?.width === 880
      && node.style?.height === 1
    );
    expect(edgeRule?.style?.backgroundColor).toBe("#ABCDEF");
  });

  it("produces the same slide structure across layoutFamily values", () => {
    // Phase-2 change: layoutFamily no longer drives aesthetic. Two
    // specs that differ ONLY by layoutFamily produce structurally
    // identical slides (up to the theme.name label). Aesthetic
    // differentiation happens at the token layer instead.
    const editorial = compilePresentationSpec(makeSpec({
      layoutFamily: "editorial",
      slides: [{
        slideType: "timeline",
        title: "Roadmap",
        events: [{ label: "A" }, { label: "B" }, { label: "C" }],
      }],
    }));
    const immersive = compilePresentationSpec(makeSpec({
      layoutFamily: "immersive",
      slides: [{
        slideType: "timeline",
        title: "Roadmap",
        events: [{ label: "A" }, { label: "B" }, { label: "C" }],
      }],
    }));
    expect(editorial.slides[0].children).toEqual(immersive.slides[0].children);
  });

  it("does not emit hardcoded rounded-rectangle cards", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "kpi-grid",
        title: "Metrics",
        items: [
          { label: "ARR", value: "$12M", trend: "up" },
          { label: "NRR", value: "118%", trend: "up" },
          { label: "Pipeline", value: "$4.8M", trend: "flat" },
          { label: "Win Rate", value: "31%", trend: "down" },
        ],
      }],
    }));

    const shapeTypes = JSON.stringify(doc.slides[0].children);
    expect(shapeTypes).not.toContain("\"shapeType\":\"roundRect\"");
  });

  it("repairs long header stacks without collisions", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Board operating review covering restructuring milestones, commercial recovery sequencing, and the cross-functional execution risks we need to discuss today",
        subtitle: "Subtitle intentionally long enough to force the header stack to expand and exercise the readability-first layout pass instead of colliding with the board badge or body frame.",
        insight: "Management recommendation: sequence margin actions before channel expansion and keep the operating review decision-ready.",
        body: [
          "Margin reset workstream is now sequenced.",
          "Commercial re-acceleration starts after the support migration stabilizes.",
          "Board decision needed on pacing and investment trade-offs.",
        ],
      }],
    }));

    expect(validateAbsoluteDocumentLayout(doc)).toEqual([]);
    const safetyReport = doc.customProperties?.find((entry) => entry.name === "runstamp.layoutSafetyReport");
    expect(safetyReport?.value).toContain("\"mode\":");
  });

  it("emits no named-family badges on slides", () => {
    // Phase-2 change: "EDITORIAL REVIEW" / "BOARD VIEW" / etc. stamps
    // are retired along with named style families.
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Slide 1",
        body: ["Hello"],
      }],
    }));
    const serialized = JSON.stringify(doc.slides[0].children);
    expect(serialized).not.toContain("BOARD VIEW");
    expect(serialized).not.toContain("EDITORIAL REVIEW");
    expect(serialized).not.toContain("PRODUCT BRIEF");
    expect(serialized).not.toContain("IMMERSIVE VIEW");
  });

  it("keeps dense slide content safe", () => {
    for (const layoutFamily of ["editorial", "board", "product", "immersive"] as const) {
      const doc = compilePresentationSpec(makeSpec({
        layoutFamily,
        slides: [{
          slideType: "tombstone-grid",
          title: "Strategic activity review spanning follow-on financings, sponsor carve-outs, and public market exits",
          subtitle: "The same dense content should remain readable without family-specific collisions or clipping.",
          items: [
            { name: "Northstar Analytics", subtitle: "Series D", metrics: ["ARR $42M", "YoY +38%", "Rule of 40: 54"] },
            { name: "Meridian Health", subtitle: "Strategic sale", metrics: ["EV / Rev 7.8x", "Adj. EBITDA 21%"] },
            { name: "Axiom Industrial", subtitle: "Sponsor carve-out", metrics: ["Revenue $310M", "Margin uplift plan"] },
            { name: "Cobalt Payments", subtitle: "IPO candidate", metrics: ["TPV $18B", "NRR 122%"] },
          ],
        }],
      }));

      expect(validateAbsoluteDocumentLayout(doc), `${layoutFamily} layout issues`).toEqual([]);
    }
  });
});

// ---- Input validation ----

describe("input validation", () => {
  it("throws descriptive error for invalid spec", () => {
    expect(() =>
      compilePresentationSpec({ title: "", slides: [] } as unknown as PresentationSpec),
    ).toThrow("Invalid PresentationSpec");
  });

  it("throws descriptive error for missing title", () => {
    expect(() =>
      compilePresentationSpec({ slides: [{ slideType: "title-body", title: "X", body: ["Y"] }] } as unknown as PresentationSpec),
    ).toThrow("Invalid PresentationSpec");
  });
});

// ---- All 8 slide types compile ----

describe("slide type compilation", () => {
  const slideFixtures: Array<{ name: string; slide: PresentationSpec["slides"][number] }> = [
    { name: "title-body", slide: { slideType: "title-body", title: "T", body: ["A", "B", "C"] } },
    { name: "kpi-grid", slide: { slideType: "kpi-grid", title: "T", items: [{ label: "L", value: "V", trend: "none" }, { label: "L2", value: "V2", trend: "none" }] } },
    { name: "comparison-table", slide: { slideType: "comparison-table", title: "T", columns: ["Dim", "A", "B"], rows: [{ label: "R", values: ["1", "2"] }] } },
    { name: "market-map", slide: { slideType: "market-map", title: "T", companies: [{ name: "X", x: 10, y: 20, emphasis: "primary" }, { name: "Y", x: 30, y: 40, emphasis: "secondary" }] } },
    { name: "timeline", slide: { slideType: "timeline", title: "T", events: [{ label: "A" }, { label: "B" }] } },
    { name: "org-chart", slide: { slideType: "org-chart", title: "T", nodes: [{ id: "1", label: "CEO" }, { id: "2", label: "CTO", parentId: "1" }] } },
    { name: "waterfall", slide: { slideType: "waterfall", title: "T", entries: [{ label: "A", value: 100, type: "increase" }, { label: "B", value: 30, type: "decrease" }, { label: "C", value: 70, type: "total" }] } },
    { name: "tombstone-grid", slide: { slideType: "tombstone-grid", title: "T", items: [{ name: "A" }, { name: "B" }] } },
  ];

  for (const { name, slide } of slideFixtures) {
    it(`compiles ${name} slide`, () => {
      const doc = compilePresentationSpec(makeSpec({ slides: [slide] }));
      expect(doc.type).toBe("Document");
      expect(doc.slides).toHaveLength(1);
      expect(doc.slides[0].type).toBe("Slide");
      expect(doc.slides[0].children.length).toBeGreaterThan(0);
    });
  }
});

// ---- Speaker notes ----

describe("speaker notes", () => {
  it("attaches notes from protocol spec to compiled slide", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "With Notes",
        body: ["Content"],
        notes: ["First point", "Second point"],
      }],
    }));
    expect(doc.slides[0].notes).toBe("First point\nSecond point");
  });

  it("omits notes when not provided", () => {
    const doc = compilePresentationSpec(makeSpec());
    expect(doc.slides[0].notes).toBeUndefined();
  });

  it("handles single note string", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "T",
        body: ["B"],
        notes: ["Solo note"],
      }],
    }));
    expect(doc.slides[0].notes).toBe("Solo note");
  });
});

// ---- Transitions ----

describe("transitions", () => {
  it("attaches morph transition from protocol spec", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Morph",
        body: ["Content"],
        transition: { type: "morph" },
      }],
    }));
    expect(doc.slides[0].transition).toEqual({
      type: "morph",
      duration: 500,
    });
  });

  it("maps speed to duration correctly", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Fast",
        body: ["Content"],
        transition: { type: "fade", speed: "fast" },
      }],
    }));
    expect(doc.slides[0].transition?.duration).toBe(200);
  });

  it("maps advanceAfterMs to advanceAfterTime", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Auto",
        body: ["Content"],
        transition: { type: "wipe", advanceAfterMs: 3000 },
      }],
    }));
    expect(doc.slides[0].transition?.advanceAfterTime).toBe(3000);
  });

  it("omits transition when type is none", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "None",
        body: ["Content"],
        transition: { type: "none" },
      }],
    }));
    expect(doc.slides[0].transition).toBeUndefined();
  });

  it("omits transition when not provided", () => {
    const doc = compilePresentationSpec(makeSpec());
    expect(doc.slides[0].transition).toBeUndefined();
  });
});

// ---- Animations ----

describe("animations", () => {
  it("buildByPoint on title-body produces onClick fadeIn on body children", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Build",
        body: ["Point A", "Point B", "Point C"],
        animation: "buildByPoint",
      }],
    }));
    const slide = doc.slides[0];
    const animated = slide.children.filter((c: any) => c.animations?.length > 0);
    expect(animated.length).toBeGreaterThan(0);
    for (const child of animated) {
      expect((child as any).animations[0]).toMatchObject({
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
      });
    }
  });

  it("buildByPoint on kpi-grid produces onClick fadeIn on items", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "kpi-grid",
        title: "KPIs",
        items: [
          { label: "Rev", value: "$1M", trend: "up" },
          { label: "Growth", value: "20%", trend: "none" },
        ],
        animation: "buildByPoint",
      }],
    }));
    const animated = doc.slides[0].children.filter((c: any) => c.animations?.length > 0);
    expect(animated.length).toBeGreaterThan(0);
  });

  it("buildByPoint compiles without error on all 8 slide types", () => {
    const slideFixtures: Array<{ name: string; slide: any }> = [
      { name: "title-body", slide: { slideType: "title-body", title: "T", body: ["A", "B", "C"], animation: "buildByPoint" } },
      { name: "kpi-grid", slide: { slideType: "kpi-grid", title: "T", items: [{ label: "L", value: "V", trend: "none" }, { label: "L2", value: "V2", trend: "none" }], animation: "buildByPoint" } },
      { name: "comparison-table", slide: { slideType: "comparison-table", title: "T", columns: ["Dim", "A", "B"], rows: [{ label: "R", values: ["1", "2"] }], animation: "buildByPoint" } },
      { name: "market-map", slide: { slideType: "market-map", title: "T", companies: [{ name: "X", x: 10, y: 20, emphasis: "primary" }, { name: "Y", x: 30, y: 40, emphasis: "secondary" }], animation: "buildByPoint" } },
      { name: "timeline", slide: { slideType: "timeline", title: "T", events: [{ label: "A" }, { label: "B" }], animation: "buildByPoint" } },
      { name: "org-chart", slide: { slideType: "org-chart", title: "T", nodes: [{ id: "1", label: "CEO" }, { id: "2", label: "CTO", parentId: "1" }], animation: "buildByPoint" } },
      { name: "waterfall", slide: { slideType: "waterfall", title: "T", entries: [{ label: "A", value: 100, type: "increase" }, { label: "B", value: 30, type: "decrease" }, { label: "C", value: 70, type: "total" }], animation: "buildByPoint" } },
      { name: "tombstone-grid", slide: { slideType: "tombstone-grid", title: "T", items: [{ name: "A" }, { name: "B" }], animation: "buildByPoint" } },
    ];
    for (const { name, slide } of slideFixtures) {
      expect(() => compilePresentationSpec(makeSpec({ slides: [slide] }))).not.toThrow();
    }
  });

  it("fadeIn produces withPrevious fadeIn on all content", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "Fade",
        body: ["Content"],
        animation: "fadeIn",
      }],
    }));
    const animated = doc.slides[0].children.filter((c: any) => c.animations?.length > 0);
    expect(animated.length).toBeGreaterThan(0);
    for (const child of animated) {
      expect((child as any).animations[0]).toMatchObject({
        type: "entrance",
        effect: "fade",
        trigger: "withPrevious",
      });
    }
  });

  it("animation: none produces no animations", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "title-body",
        title: "None",
        body: ["Content"],
        animation: "none",
      }],
    }));
    const animated = doc.slides[0].children.filter((c: any) => c.animations?.length > 0);
    expect(animated).toHaveLength(0);
  });

  it("omitted animation produces no animations", () => {
    const doc = compilePresentationSpec(makeSpec());
    const animated = doc.slides[0].children.filter((c: any) => c.animations?.length > 0);
    expect(animated).toHaveLength(0);
  });
});

// ---- Division guard boundary values ----

describe("division guards", () => {
  it("comparison-table with minimum columns does not crash", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "comparison-table",
        title: "T",
        columns: ["Dim", "A", "B"],
        rows: [{ label: "R", values: ["1", "2"] }],
      }],
    }));
    expect(doc.slides).toHaveLength(1);
  });

  it("timeline with minimum events does not crash", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "timeline",
        title: "T",
        events: [{ label: "A" }, { label: "B" }],
      }],
    }));
    expect(doc.slides).toHaveLength(1);
  });

  it("org-chart with minimum nodes does not crash", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "org-chart",
        title: "T",
        nodes: [{ id: "1", label: "A" }, { id: "2", label: "B", parentId: "1" }],
      }],
    }));
    expect(doc.slides).toHaveLength(1);
  });
});

// ---- Composition slide ----

describe("composition slide", () => {
  it("allows per-slide footer chrome overrides without changing deck-wide tokens", () => {
    const doc = compilePresentationSpec(makeSpec({
      tokens: {
        version: "1.0",
        chrome: {
          footer: {
            enabled: true,
            layout: ["projectCode", "spacer", "pageNumber"],
            projectCode: "BASE PROJECT",
          },
        },
      },
      slides: [
        {
          slideType: "title-body",
          title: "Cover",
          body: ["Opening"],
          chrome: { footer: { enabled: false } },
        },
        {
          slideType: "title-body",
          title: "Section",
          body: ["Default footer"],
        },
        {
          slideType: "title-body",
          title: "Section override",
          body: ["Custom footer"],
          chrome: { footer: { projectCode: "SECTION PROJECT" } },
        },
      ],
    }));

    expect(JSON.stringify(doc.slides[0].children)).not.toContain("BASE PROJECT");
    expect(JSON.stringify(doc.slides[1].children)).toContain("BASE PROJECT");
    expect(JSON.stringify(doc.slides[2].children)).not.toContain("BASE PROJECT");
    expect(JSON.stringify(doc.slides[2].children)).toContain("SECTION PROJECT");
  });

  it("compiles a basic composition with title + bullets + source line", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Composition smoke",
        blocks: [
          {
            primitive: "titleBlock",
            region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
            input: { title: "Hello composition" },
          },
          {
            primitive: "bulletList",
            region: { col: 0, row: 3, colSpan: 12, rowSpan: 6 },
            input: { items: [{ text: "Point A" }, { text: "Point B" }] },
          },
          {
            primitive: "sourceLine",
            region: { col: 0, row: 11, colSpan: 12, rowSpan: 1 },
            input: { content: "Internal data, Apr 2026.", kind: "source" },
          },
        ],
      }],
    }));
    expect(doc.slides).toHaveLength(1);
    const report = doc.customProperties?.find((p) => p.name === "runstamp.layoutSafetyReport")?.value;
    expect(report).toBeDefined();
    const diagnostics = JSON.parse(String(report!));
    expect(diagnostics[0].slideType).toBe("composition");
    expect(diagnostics[0].mode).toBe("standard");
    expect(diagnostics[0].overflows).toHaveProperty("titleBlock_0");
    expect(diagnostics[0].overflows).toHaveProperty("bulletList_1");
    expect(diagnostics[0].overflows).toHaveProperty("sourceLine_2");
    expect(diagnostics[0].layoutDebug.nodes.length).toBeGreaterThan(0);
    expect(diagnostics[0].layoutDebug.nodes.some((node: any) => node.blockKey === "titleBlock_0")).toBe(true);
    expect(diagnostics[0].validationIssueCount).toBe(0);
  });

  it("applies zIndex from composition blocks to emitted PaperNodes", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Layered annotation",
        blocks: [
          {
            primitive: "textBlock",
            region: { col: 0, row: 2, colSpan: 4, rowSpan: 3 },
            zIndex: 1,
            input: { content: "Base layer", role: "body" },
          },
          {
            primitive: "textBlock",
            region: { col: 3, row: 2, colSpan: 4, rowSpan: 3 },
            zIndex: 2,
            input: { content: "Annotation", role: "body" },
          },
        ],
      }],
    }));

    const styled = doc.slides[0].children
      .map((child: any) => child.style?.zIndex)
      .filter((value: unknown) => value !== undefined);
    expect(styled).toEqual([1, 2]);
    expect(validateAbsoluteDocumentLayout(doc)).toEqual([]);
  });

  it("reports composition validation issues using caller block keys", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Unlayered overlap",
        blocks: [
          {
            primitive: "textBlock",
            region: { col: 0, row: 2, colSpan: 4, rowSpan: 3 },
            input: { content: "Base layer", role: "body" },
          },
          {
            primitive: "textBlock",
            region: { col: 3, row: 2, colSpan: 4, rowSpan: 3 },
            input: { content: "Annotation", role: "body" },
          },
        ],
      }],
    }))).toThrow(/NODE_COLLISION@textBlock_0~textBlock_1/);
  });

  it("passes chartBlock annotations through the composition path", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Annotated chart",
        blocks: [{
          primitive: "chartBlock",
          region: { col: 0, row: 2, colSpan: 12, rowSpan: 8 },
          input: {
            chartData: {
              chartType: "line",
              categories: ["2024", "2025", "2026"],
              series: [{ name: "Index", values: [80, 96, 121] }],
              annotations: [{
                kind: "trendArrow",
                from: { categoryIndex: 0, anchor: "value", value: 80 },
                to: { categoryIndex: 2, anchor: "value", value: 121 },
                label: "Acceleration",
              }],
            },
          },
        }],
      }],
    }));

    const chart = doc.slides[0].children.find((child: any) => child.type === "Chart") as any;
    expect(chart?.chartData?.annotations).toHaveLength(1);
    expect(chart?.chartData?.annotations?.[0]?.kind).toBe("trendArrow");
  });

  it("validates region grid bounds (col + colSpan <= 12)", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Bad region",
        blocks: [{
          primitive: "titleBlock",
          region: { col: 6, row: 0, colSpan: 8, rowSpan: 2 },
          input: { title: "T" },
        }],
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("rejects unknown primitive name", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Bad primitive",
        blocks: [{
          // @ts-expect-error testing runtime rejection
          primitive: "bogus",
          region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
          input: { title: "T" },
        }],
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("rejects mismatched primitive input shape", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Mismatched input",
        blocks: [{
          primitive: "titleBlock",
          region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
          // titleBlock requires `title`, not `items` — runtime validation
          // catches the mismatch even though TS no longer flags it (the
          // schema lifted `input` past strict narrowing when the recursive
          // container variant was added to CompositionBlockSchema).
          input: { items: [{ text: "x" }] } as never,
        }],
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("blocks share the canvas — non-overlapping regions render side-by-side", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Side-by-side",
        blocks: [
          {
            primitive: "titleBlock",
            region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
            input: { title: "Snapshot" },
          },
          {
            primitive: "kpiHero",
            region: { col: 0, row: 2, colSpan: 6, rowSpan: 8 },
            input: { label: "ARR", value: "$1.8M" },
          },
          {
            primitive: "metricStack",
            region: { col: 6, row: 2, colSpan: 6, rowSpan: 8 },
            input: {
              rows: [
                { label: "Churn", value: "1.4%" },
                { label: "NPS", value: "69" },
              ],
            },
          },
        ],
      }],
    }));
    expect(doc.slides).toHaveLength(1);
  });

  it("rejects composition slides whose blocks would silently clip or paginate", () => {
    // metricStack with 6 rows in a tiny region paginates → reject.
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Lossy",
        blocks: [{
          primitive: "metricStack",
          region: { col: 0, row: 0, colSpan: 4, rowSpan: 2 },
          input: {
            rows: Array.from({ length: 6 }, (_, i) => ({
              label: `Metric ${i + 1}`,
              value: `${i + 1}`,
            })),
          },
        }],
      }],
    }))).toThrow(/Protocol layout safety failed/);
  });

  it("rejects composition with too many blocks (>20)", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Too many",
        blocks: Array.from({ length: 21 }, () => ({
          primitive: "titleBlock" as const,
          region: { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
          input: { title: "T" },
        })),
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("rejects composition with zero blocks", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Empty",
        blocks: [],
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("rejects region with row + rowSpan > 12", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Row overflow",
        blocks: [{
          primitive: "titleBlock",
          region: { col: 0, row: 6, colSpan: 12, rowSpan: 8 },
          input: { title: "T" },
        }],
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("rejects region with colSpan=0", () => {
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Zero span",
        blocks: [{
          primitive: "titleBlock",
          region: { col: 0, row: 0, colSpan: 0, rowSpan: 2 },
          input: { title: "T" },
        }],
      }],
    }))).toThrow(/Invalid PresentationSpec/);
  });

  it("rejects composition when a primitive returns clipped (e.g., region too narrow for matrixTable)", () => {
    // matrixTable in a 1-column region cannot fit row labels + cells; the
    // primitive returns kind="clipped" and the compiler must reject.
    expect(() => compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Narrow matrix",
        blocks: [{
          primitive: "matrixTable",
          region: { col: 0, row: 0, colSpan: 1, rowSpan: 6 },
          input: {
            columnHeaders: ["", "Col 1", "Col 2", "Col 3"],
            rows: [
              { label: "Row 1", cells: ["a", "b", "c"] },
              { label: "Row 2", cells: ["d", "e", "f"] },
            ],
          },
        }],
      }],
    }))).toThrow(/Protocol layout safety failed/);
  });

  it("composition slides skip readability retry", () => {
    const doc = compilePresentationSpec(makeSpec({
      slides: [{
        slideType: "composition",
        title: "Long composition title",
        blocks: [{
          primitive: "titleBlock",
          region: { col: 0, row: 0, colSpan: 12, rowSpan: 4 },
          input: {
            title: "A wide composition can host a longer title without falling back to readability",
          },
        }],
      }],
    }));
    const report = doc.customProperties?.find((p) => p.name === "runstamp.layoutSafetyReport")?.value;
    const diagnostics = JSON.parse(String(report!));
    expect(diagnostics[0].mode).toBe("standard");
  });
});
