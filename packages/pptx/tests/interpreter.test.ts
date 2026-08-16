import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  compileAgentDocument,
  compileAgentSlide,
} from "../src/interpreter/interpreter.js";
import { AgentDocumentSchema } from "../src/interpreter/agentSchema.js";
import { applyElasticPagination } from "../src/interpreter/slideSplitter.js";
import { resolveAgentDesignTokens } from "../src/interpreter/design-tokens.js";
import { validateAgentDocumentLayout } from "../src/interpreter/layout-validator.js";
import {
  assertAgentCompilationSemantics,
  assertAgentRecipeLayoutUtilization,
} from "../src/interpreter/agent-quality-gates.js";
import type { AgentDocument, AgentSlide } from "../src/interpreter/agentSchema.js";
import type { AgentDesignTokens } from "../src/interpreter/design-tokens.js";
import type { PaperSlide, PaperText, PaperNode } from "../src/types/ast.js";
import { PaperError } from "../src/errors.js";
import {
  DEFAULT_SLIDE_HEIGHT_PX,
  DEFAULT_SLIDE_WIDTH_PX,
} from "../src/ooxml/constants.js";
import { PaperDocumentSchema } from "../src/validator/schema.js";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { runLayout, type LayoutNode } from "../src/layout/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalAgentDoc(overrides?: Partial<AgentDocument>): AgentDocument {
  return {
    presentationTitle: "Test Deck",
    slides: [
      { pattern: "title", content: { title: "Hello" } },
    ],
    ...overrides,
  };
}

function minimalSlide(pattern: AgentSlide["pattern"], content: Partial<AgentSlide["content"]> = {}): AgentSlide {
  return { pattern, content: { title: "Test Title", ...content } };
}

function findTextNodes(slide: PaperSlide): PaperText[] {
  const result: PaperText[] = [];
  function walk(node: PaperNode) {
    if (node.type === "Text") result.push(node as PaperText);
    if ("children" in node && node.children) {
      for (const child of node.children) walk(child);
    }
  }
  for (const child of slide.children) walk(child);
  return result;
}

function findNodesByType(slide: PaperSlide, type: string): PaperNode[] {
  const result: PaperNode[] = [];
  function walk(node: PaperNode) {
    if (node.type === type) result.push(node);
    if ("children" in node && node.children) {
      for (const child of node.children) walk(child);
    }
  }
  for (const child of slide.children) walk(child);
  return result;
}

function findTextNodesInDocument(document: { slides: PaperSlide[] }): PaperText[] {
  return document.slides.flatMap((slide) => findTextNodes(slide));
}

function findLayoutNodes(root: LayoutNode, predicate: (node: LayoutNode) => boolean): LayoutNode[] {
  const result: LayoutNode[] = [];
  function walk(node: LayoutNode) {
    if (predicate(node)) result.push(node);
    for (const child of node.children ?? []) walk(child);
  }
  walk(root);
  return result;
}

function isRegisterRow(node: { type: string; children?: readonly PaperNode[] | readonly LayoutNode[] }): boolean {
  return node.type === "View" && Boolean(node.children?.some((child) => (
    child.type === "Text"
    && typeof child.content === "string"
    && /^\d{2}$/u.test(child.content)
  )));
}

function findRegisterRows(root: LayoutNode): LayoutNode[] {
  return findLayoutNodes(root, isRegisterRow);
}

function modernPresetSpec(theme: "midnight" | "terminal" | "editorial-wide"): AgentDesignTokens {
  if (theme === "terminal") {
    return { scale: "lg", density: "balanced", shape: "sharp" };
  }

  if (theme === "editorial-wide") {
    return { scale: "lg", density: "spacious", shape: "soft" };
  }

  return { scale: "lg", density: "spacious", shape: "round" };
}

function buildModernPresetDeck(theme: "midnight" | "terminal" | "editorial-wide"): AgentDocument {
  return {
    presentationTitle: `${theme} six-pattern deck`,
    theme,
    designTokens: modernPresetSpec(theme),
    slides: [
      { pattern: "title", content: { title: `${theme} brief`, subtitle: "Q2 operating review" } },
      {
        pattern: "statement",
        content: {
          title: "Growth remains durable.",
          subtitle: "Three signals are compounding together.",
          prose: ["Expansion revenue, faster activation, and steadier retention are now reinforcing one another."],
        },
      },
      {
        pattern: "dashboard",
        content: {
          title: "Operating Snapshot",
          subtitle: `${theme} preset`,
          kpis: [
            { label: "ARR", value: "$18.4M", sublabel: "+28% YoY" },
            { label: "NRR", value: "121%", sublabel: "+5 pts" },
            { label: "Pipeline", value: "$7.2M", sublabel: "3.4x coverage" },
            { label: "Payback", value: "10 mo", sublabel: "-2 mo" },
          ],
          chart: {
            type: "bar",
            series: [{
              name: "Revenue",
              dataPoints: [
                { category: "Q1", value: 11.2 },
                { category: "Q2", value: 13.1 },
                { category: "Q3", value: 15.8 },
                { category: "Q4", value: 18.4 },
              ],
            }],
          },
        },
      },
      {
        pattern: "comparison",
        content: {
          title: "What scaled vs. what still needs work",
          subtitle: "Execution on both sides of the funnel",
          bulletPoints: [
            "Faster onboarding playbooks for enterprise launches",
            "More qualified expansion prompts inside active accounts",
            "Mid-market pipeline coverage remains thin in EMEA",
            "Pricing experiments still need tighter attribution",
          ],
        },
      },
      {
        pattern: "chart-focus",
        content: {
          title: "Retention by cohort",
          subtitle: "Improvement is landing earlier",
          chart: {
            type: "line",
            series: [
              {
                name: "Enterprise",
                dataPoints: [
                  { category: "Jan", value: 98 },
                  { category: "Mar", value: 103 },
                  { category: "May", value: 107 },
                  { category: "Jul", value: 112 },
                  { category: "Sep", value: 118 },
                ],
              },
              {
                name: "SMB",
                dataPoints: [
                  { category: "Jan", value: 94 },
                  { category: "Mar", value: 97 },
                  { category: "May", value: 99 },
                  { category: "Jul", value: 101 },
                  { category: "Sep", value: 103 },
                ],
              },
            ],
          },
          kpis: [
            { label: "Enterprise", value: "118%" },
            { label: "SMB", value: "103%" },
          ],
        },
      },
      {
        pattern: "bullets",
        content: {
          title: "Next quarter focus",
          subtitle: "Stay with the compounding loop",
          bulletPoints: [
            "Expand the enterprise onboarding pod",
            "Turn new health-score signals into renewal plays",
            "Shorten the path from product-qualified lead to first value",
          ],
          prose: ["The plan is to invest in the moments that widen expansion paths and keep early activation friction low."],
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// compileAgentDocument
// ---------------------------------------------------------------------------

describe("compileAgentDocument", () => {
  it("accepts a minimal valid document", () => {
    const doc = compileAgentDocument(minimalAgentDoc());
    expect(doc.type).toBe("Document");
    expect(doc.slides.length).toBe(1);
  });

  it("adds one professional pagination footer to every non-title slide", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "FY27 operating plan",
      companyName: "Northstar",
      slides: [
        { pattern: "title", content: { title: "FY27 operating plan" } },
        { pattern: "statement", content: { title: "Durable growth is the priority." } },
        {
          pattern: "dashboard",
          content: {
            title: "Operating pulse",
            kpis: [{ label: "ARR", value: "$18.4M" }, { label: "NRR", value: "121%" }],
          },
        },
        { pattern: "bullets", content: { title: "Decisions", bulletPoints: ["Fund expansion", "Hold hiring"] } },
      ],
    });
    const doc = compileAgentDocument(source);

    expect(findNodesByType(doc.slides[0], "View").filter((node) => node.altText === "Agent pagination footer")).toHaveLength(0);
    doc.slides.slice(1).forEach((slide, index) => {
      const footers = findNodesByType(slide, "View").filter((node) => node.altText === "Agent pagination footer");
      expect(footers).toHaveLength(1);
      expect(findTextNodes(slide).map((node) => node.content)).toContain(`0${index + 2} / 04`);
      expect(findTextNodes(slide).map((node) => node.content)).toContain("Northstar · FY27 operating plan");
    });
  });

  it("deduplicates normalized chart-heading echoes across financial and healthcare domains", () => {
    const cases: AgentDocument[] = [
      AgentDocumentSchema.parse({
        presentationTitle: "Finance review",
        slides: [{
          pattern: "dashboard",
          content: {
            title: "Revenue by quarter",
            chart: {
              type: "bar",
              title: "Revenue by quarter!",
              series: [{ name: "Revenue", dataPoints: [{ category: "Q1", value: 12 }, { category: "Q2", value: 15 }] }],
            },
          },
        }],
      }),
      AgentDocumentSchema.parse({
        presentationTitle: "Care delivery review",
        slides: [{
          pattern: "chart-focus",
          content: {
            title: "Patient access improved",
            subtitle: "Wait time by clinic",
            chart: {
              type: "line",
              title: "WAIT-TIME BY CLINIC",
              series: [{ name: "Days", dataPoints: [{ category: "North", value: 8 }, { category: "South", value: 6 }] }],
            },
          },
        }],
      }),
    ];

    for (const source of cases) {
      const doc = compileAgentDocument(source);
      const chart = findNodesByType(doc.slides[0], "Chart")[0];
      expect(chart?.type === "Chart" ? chart.chartData.title : undefined).toBeUndefined();
    }
  });

  it("preserves distinct chart evidence titles", () => {
    const doc = compileAgentDocument({
      presentationTitle: "Supply review",
      slides: [{
        pattern: "chart-focus",
        content: {
          title: "Inventory is returning to plan",
          subtitle: "Network health",
          chart: {
            type: "line",
            title: "Days of supply",
            series: [{ name: "Days", dataPoints: [{ category: "Jan", value: 43 }, { category: "Feb", value: 38 }] }],
          },
        },
      }],
    });
    const chart = findNodesByType(doc.slides[0], "Chart")[0];
    expect(chart?.type === "Chart" ? chart.chartData.title?.text : undefined).toBe("Days of supply");
  });

  it("deduplicates semantic chart-heading echoes without requiring verbatim copy", () => {
    const cases: AgentDocument[] = [
      AgentDocumentSchema.parse({
        presentationTitle: "Strategy review",
        slides: [{
          pattern: "chart-focus",
          content: {
            title: "ARR by customer segment — utilities now drive over half of the book",
            chart: {
              type: "bar",
              title: "Ending ARR by segment ($M)",
              series: [{ name: "ARR", dataPoints: [{ category: "Utilities", value: 45 }] }],
            },
          },
        }],
      }),
      AgentDocumentSchema.parse({
        presentationTitle: "Pipeline review",
        slides: [{
          pattern: "chart-focus",
          content: {
            title: "Pipeline coverage supports the acceleration case",
            chart: {
              type: "line",
              title: "Pipeline coverage ratio by month",
              series: [{ name: "Coverage", dataPoints: [{ category: "June", value: 4.2 }] }],
            },
          },
        }],
      }),
    ];

    for (const source of cases) {
      const doc = compileAgentDocument(source);
      const chart = findNodesByType(doc.slides[0], "Chart")[0];
      expect(chart?.type === "Chart" ? chart.chartData.title : undefined).toBeUndefined();
    }
  });

  it("rejects deterministic pagination and title-echo negative controls", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Quality controls",
      slides: [{
        pattern: "chart-focus",
        content: {
          title: "Activation by cohort",
          chart: {
            type: "bar",
            title: "Activation by cohort",
            series: [{ name: "Activation", dataPoints: [{ category: "A", value: 82 }, { category: "B", value: 91 }] }],
          },
        },
      }],
    });
    const compiled = compileAgentDocument(source);
    const chart = findNodesByType(compiled.slides[0], "Chart")[0];
    if (chart?.type === "Chart") chart.chartData.title = { text: "Activation by cohort" };
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/repeats the surrounding slide heading/);

    if (chart?.type === "Chart") chart.chartData.title = undefined;
    compiled.slides[0].children = compiled.slides[0].children.filter(
      (node) => !(node.type === "View" && node.altText === "Agent pagination footer"),
    );
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/missing deterministic pagination footer/);
  });

  it("rejects missing presentationTitle", () => {
    expect(() =>
      compileAgentDocument({ slides: [{ pattern: "title", content: { title: "X" } }] } as any),
    ).toThrow();
  });

  it("rejects unknown pattern", () => {
    expect(() =>
      compileAgentDocument({
        presentationTitle: "T",
        slides: [{ pattern: "unknown-layout" as any, content: { title: "X" } }],
      }),
    ).toThrow();
  });

  it("builds theme with accent1 = accentColor", () => {
    const doc = compileAgentDocument(minimalAgentDoc({ accentColor: "#FF0000" }));
    expect(doc.theme?.colorScheme?.accent1).toBe("#FF0000");
  });

  it("uses default accent when accentColor not provided", () => {
    const doc = compileAgentDocument(minimalAgentDoc());
    expect(doc.theme?.colorScheme?.accent1).toBe("#2563EB");
  });

  it("keeps default output stable when default-navy is selected explicitly", () => {
    const implicitDefault = compileAgentDocument(minimalAgentDoc());
    const explicitDefault = compileAgentDocument(
      minimalAgentDoc({ theme: "default-navy" }),
    );
    expect(explicitDefault).toEqual(implicitDefault);
  });

  it("sets fontScheme to the portable Liberation Sans default", () => {
    const doc = compileAgentDocument(minimalAgentDoc());
    expect(doc.theme?.fontScheme?.majorLatin).toBe("Liberation Sans");
    expect(doc.theme?.fontScheme?.minorLatin).toBe("Liberation Sans");
    expect(doc.fontStrategy).toBe("portable");
  });

  it("applies preset theme tokens for editorial-serif", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "editorial-serif",
      slides: [
        { pattern: "title", content: { title: "Feature Story", subtitle: "Serif preset" } },
      ],
    }));

    expect(doc.theme?.fontScheme?.majorLatin).toBe("Gelasio");
    expect(doc.theme?.colorScheme?.accent1).toBe("#C4493A");
    expect((doc.slides[0].background as any)?.color).toBe("#FFF8F1");
    const titleTexts = findTextNodes(doc.slides[0]);
    const title = titleTexts.find((node) => node.content === "Feature Story");
    expect(title?.style?.fontSize).toBe(42);
    expect(title?.style?.color).toBe("#43261B");
  });

  it("applies dark-punch tokens across non-title slides", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "dark-punch",
      slides: [
        { pattern: "statement", content: { title: "Night Shift", subtitle: "After hours review" } },
      ],
    }));

    expect((doc.slides[0].background as any)?.color).toBe("#050505");
    const texts = findTextNodes(doc.slides[0]);
    const heading = texts.find((node) => node.content === "Night Shift");
    expect(heading?.style?.color).toBe("#FFFFFF");
    expect(doc.theme?.fontScheme?.majorLatin).toBe("Source Sans 3");
  });

  it("applies midnight preset tokens to the metric protagonist without a card grid", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "midnight",
      slides: [
        {
          pattern: "dashboard",
          content: {
            title: "Midnight Snapshot",
            subtitle: "Modern preset",
            kpis: [
              { label: "ARR", value: "$12.4M" },
              { label: "NRR", value: "118%" },
            ],
          },
        },
      ],
    }));

    expect((doc.slides[0].background as any)?.color).toBe("#050B16");
    expect(doc.theme?.colorScheme?.accent1).toBe("#5EEAD4");

    const cards = findNodesByType(doc.slides[0], "View").filter(
      (node) => node.children?.some((child) => child.type === "Text" && child.content === "ARR"),
    );
    expect(cards.length).toBe(1);
    expect(cards[0].style?.backgroundColor).toBe("#5EEAD4");
    expect(cards[0].shapeType).toBeUndefined();
    expect(cards[0].style?.effects?.dropShadow).toBeUndefined();
  });

  it("applies terminal preset tokens with mono typography and sharp KPI cards", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "terminal",
      slides: [
        {
          pattern: "dashboard",
          content: {
            title: "Terminal Snapshot",
            subtitle: "Minimal preset",
            kpis: [
              { label: "ARR", value: "$12.4M" },
              { label: "NRR", value: "118%" },
            ],
          },
        },
      ],
    }));

    expect((doc.slides[0].background as any)?.color).toBe("#04070D");
    expect(doc.theme?.colorScheme?.accent1).toBe("#5EEAD4");
    expect(doc.theme?.fontScheme?.majorLatin).toBe("Liberation Mono");

    const cards = findNodesByType(doc.slides[0], "View").filter(
      (node) => node.children?.some((child) => child.type === "Text" && child.content === "ARR"),
    );
    expect(cards.length).toBe(1);
    expect(cards[0].shapeType).toBeUndefined();
    expect(cards[0].shapeAdjustments).toBeUndefined();
    expect(cards[0].style?.effects?.dropShadow).toBeUndefined();
  });

  it("applies editorial-wide preset tokens with warm framing and serif-led hierarchy", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "editorial-wide",
      slides: [
        { pattern: "title", content: { title: "Editorial Wide", subtitle: "Warm, spacious preset" } },
      ],
    }));

    expect((doc.slides[0].background as any)?.color).toBe("#FFF9F0");
    expect(doc.theme?.colorScheme?.accent1).toBe("#C86B36");
    expect(doc.theme?.fontScheme?.majorLatin).toBe("Gelasio");
    expect(doc.theme?.fontScheme?.minorLatin).toBe("Carlito");

    const titleText = findTextNodes(doc.slides[0]).find((node) => node.content === "Editorial Wide");
    expect(titleText?.style?.fontFamily).toBe("Gelasio");
    expect(titleText?.style?.fontSize).toBe(46);
  });

  it("applies design token overrides on top of preset tokens", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "monochrome",
      designTokens: {
        colors: { accent: "#10B981" },
        typography: { heroTitleSize: 44 },
      },
      slides: [
        {
          pattern: "chart-focus",
          content: {
            title: "Custom Accent",
            chart: {
              type: "bar",
              series: [{ name: "2026", dataPoints: [{ category: "Q1", value: 120 }] }],
            },
          },
        },
      ],
    }));

    expect(doc.theme?.colorScheme?.accent1).toBe("#10B981");
    const chart = findNodesByType(doc.slides[0], "Chart")[0] as any;
    expect(chart.chartData.series[0].color).toBe("#10B981");

    const titledDoc = compileAgentDocument(minimalAgentDoc({
      theme: "monochrome",
      designTokens: {
        typography: { heroTitleSize: 44 },
      },
      slides: [{ pattern: "title", content: { title: "Custom Scale" } }],
    }));
    const title = findTextNodes(titledDoc.slides[0]).find((node) => node.content === "Custom Scale");
    expect(title?.style?.fontSize).toBe(44);
  });

  it("defaults to portable and admitted preset families", () => {
    const tokens = resolveAgentDesignTokens();

    expect(tokens.typography.fontStrategy).toBe("portable");
    expect(tokens.typography.titleFontFamily).toBe("Liberation Sans");
    expect(tokens.typography.bodyFontFamily).toBe("Liberation Sans");
    expect(tokens.typography.titleFontFallback).toEqual(["Carlito", "Source Sans 3"]);
    expect(tokens.typography.bodyFontFallback).toEqual(["Carlito", "Source Sans 3"]);
  });

  it("switches to system-safe fonts when fontStrategy is system-safe", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      designTokens: {
        typography: { fontStrategy: "system-safe" },
      },
      slides: [
        { pattern: "dashboard", content: { title: "System Safe", chart: { type: "bar", series: [{ name: "ARR", dataPoints: [{ category: "Q1", value: 120 }] }] } } },
      ],
    }));

    expect(doc.theme?.fontScheme?.majorLatin).toBe("Liberation Sans");
    expect(doc.theme?.fontScheme?.minorLatin).toBe("Liberation Sans");

    const slideTexts = findTextNodes(doc.slides[0]);
    expect(slideTexts.length).toBeGreaterThan(0);
    for (const textNode of slideTexts) {
      expect(textNode.style?.fontFamily).toBe("Liberation Sans");
      expect(textNode.style?.fontFallback).toEqual(["Carlito", "Source Sans 3"]);
    }

    const chart = findNodesByType(doc.slides[0], "Chart")[0] as any;
    expect(chart.chartData.legend.fontFamily).toBe("Liberation Sans");
    expect(chart.chartData.categoryAxis.fontFamily).toBe("Liberation Sans");
    expect(chart.chartData.valueAxis.fontFamily).toBe("Liberation Sans");
  });

  it("preserves portable preset personality while adding admitted fallbacks", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      theme: "editorial-serif",
      slides: [{ pattern: "statement", content: { title: "Feature Story", subtitle: "Named preset" } }],
    }));

    const texts = findTextNodes(doc.slides[0]);
    const heading = texts.find((node) => node.content === "Feature Story");
    const subtitle = texts.find((node) => node.content === "Named preset");

    expect(heading?.style?.fontFamily).toBe("Gelasio");
    expect(heading?.style?.fontFallback).toEqual(["Liberation Sans", "Carlito", "Source Sans 3"]);
    expect(subtitle?.style?.fontFamily).toBe("Gelasio");
    expect(subtitle?.style?.fontFallback).toEqual(["Liberation Sans", "Carlito", "Source Sans 3"]);
  });

  it("keeps explicit typography overrides ahead of fontStrategy", () => {
    const tokens = resolveAgentDesignTokens({
      designTokens: {
        typography: {
          fontStrategy: "system-safe",
          titleFontFamily: "Georgia",
          bodyFontFamily: "Lato",
        },
      },
    });

    expect(tokens.typography.titleFontFamily).toBe("Georgia");
    expect(tokens.typography.bodyFontFamily).toBe("Lato");
    expect(tokens.typography.titleFontFallback).toEqual(["Liberation Sans", "Carlito", "Source Sans 3"]);
    expect(tokens.typography.bodyFontFallback).toEqual(["Liberation Sans", "Carlito", "Source Sans 3"]);
  });

  it("lets explicit call-site fontFamily override design token families and fontStrategy", () => {
    const tokens = resolveAgentDesignTokens({
      fontFamily: "Inter",
      designTokens: {
        typography: {
          fontStrategy: "system-safe",
          titleFontFamily: "Georgia",
          bodyFontFamily: "Lato",
        },
      },
    });

    expect(tokens.typography.titleFontFamily).toBe("Inter");
    expect(tokens.typography.bodyFontFamily).toBe("Inter");
    expect(tokens.typography.titleFontFallback).toEqual(["Liberation Sans", "Carlito", "Source Sans 3"]);
    expect(tokens.typography.bodyFontFallback).toEqual(["Liberation Sans", "Carlito", "Source Sans 3"]);
  });

  it("keeps midnight responsive to scale, density, and shape overrides", () => {
    const baseline = resolveAgentDesignTokens({ theme: "midnight" });
    const compactSharp = resolveAgentDesignTokens({
      theme: "midnight",
      designTokens: {
        scale: "sm",
        density: "compact",
        shape: "sharp",
      },
    });

    expect(baseline.controls.shape).toBe("round");
    expect(compactSharp.typography.heroTitleSize).toBeLessThan(baseline.typography.heroTitleSize);
    expect(compactSharp.layout.contentPaddingX).toBeLessThan(baseline.layout.contentPaddingX);
    expect(compactSharp.semantic.cardShapeType).toBe("rect");
  });

  it("keeps terminal and editorial-wide responsive to coupled control overrides", () => {
    for (const theme of ["terminal", "editorial-wide"] as const) {
      const baseline = resolveAgentDesignTokens({ theme });
      const override = resolveAgentDesignTokens({
        theme,
        designTokens: {
          scale: "sm",
          density: "compact",
          shape: "round",
        },
      });

      expect(override.typography.heroTitleSize).toBeLessThan(baseline.typography.heroTitleSize);
      expect(override.layout.contentPaddingX).toBeLessThan(baseline.layout.contentPaddingX);
      expect(override.semantic.cardShapeType).toBe("roundRect");
    }
  });

  it("defaults coupled controls to lg, balanced, and soft", () => {
    const tokens = resolveAgentDesignTokens();

    expect(tokens.controls).toEqual({
      scale: "lg",
      density: "balanced",
      shape: "soft",
    });
    expect(tokens.semantic.cardShapeType).toBe("roundRect");
    expect(tokens.semantic.cardShapeAdjustment).toBe(3000);
  });

  it("lets scale change both typography and framing layout values", () => {
    const compact = resolveAgentDesignTokens({
      designTokens: { scale: "sm" },
    });
    const roomy = resolveAgentDesignTokens({
      designTokens: { scale: "xl" },
    });

    expect(compact.typography.heroTitleSize).toBeLessThan(roomy.typography.heroTitleSize);
    expect(compact.layout.bodyTopWithSubtitle).toBeLessThan(roomy.layout.bodyTopWithSubtitle);
    expect(compact.layout.titlePaddingTop).toBeLessThan(roomy.layout.titlePaddingTop);
  });

  it("lets density change spacing without changing font sizes", () => {
    const compact = resolveAgentDesignTokens({
      designTokens: { density: "compact" },
    });
    const spacious = resolveAgentDesignTokens({
      designTokens: { density: "spacious" },
    });

    expect(compact.typography.heroTitleSize).toBe(spacious.typography.heroTitleSize);
    expect(compact.layout.contentPaddingX).toBeLessThan(spacious.layout.contentPaddingX);
    expect(compact.layout.dashboardGap).toBeLessThan(spacious.layout.dashboardGap);
  });

  it("lets atomic token overrides win over coupled controls", () => {
    const tokens = resolveAgentDesignTokens({
      designTokens: {
        scale: "sm",
        shape: "round",
        typography: {
          heroTitleSize: 51,
        },
        layout: {
          contentPaddingTop: 133,
        },
        effects: {
          kpiShapeAdjustment: 4321,
        },
      },
    });

    expect(tokens.typography.heroTitleSize).toBe(51);
    expect(tokens.layout.contentPaddingTop).toBe(133);
    expect(tokens.semantic.cardShapeAdjustment).toBe(4321);
  });

  it("uses no fallback cascade in embedded mode", () => {
    const tokens = resolveAgentDesignTokens({
      designTokens: {
        typography: {
          fontStrategy: "embedded",
          titleFontFamily: "Inter",
          bodyFontFamily: "Inter",
        },
      },
    });

    expect(tokens.typography.titleFontFamily).toBe("Inter");
    expect(tokens.typography.bodyFontFamily).toBe("Inter");
    expect(tokens.typography.titleFontFallback).toEqual([]);
    expect(tokens.typography.bodyFontFallback).toEqual([]);
  });

  it("applies global padding fallbacks across title and content patterns", () => {
    const doc = compileAgentDocument({
      presentationTitle: "Padding Cascade",
      designTokens: {
        layout: {
          paddingX: 104,
        },
      },
      slides: [
        { pattern: "title", content: { title: "Title" } },
        { pattern: "statement", content: { title: "Statement" } },
        { pattern: "dashboard", content: { title: "Dashboard", kpis: [{ label: "ARR", value: "$12M" }] } },
        { pattern: "comparison", content: { title: "Comparison", bulletPoints: ["Left", "Right"] } },
        {
          pattern: "chart-focus",
          content: {
            title: "Chart Focus",
            chart: {
              type: "line",
              series: [{ name: "Growth", dataPoints: [{ category: "Q1", value: 42 }] }],
            },
          },
        },
        { pattern: "bullets", content: { title: "Bullets", bulletPoints: ["One", "Two"] } },
      ],
    }, { layoutValidation: "off" });

    const expectedWidth = DEFAULT_SLIDE_WIDTH_PX - 104 - 104;

    const titleContainer = findNodesByType(doc.slides[0], "View").find(
      (node) => node.style?.paddingLeft === 104 && node.style?.paddingRight === 104,
    );
    expect(titleContainer).toBeDefined();

    const statementTitle = findTextNodes(doc.slides[1]).find((node) => node.content === "Statement");
    expect(statementTitle?.style?.left).toBe(104);

    const dashboardPanel = findNodesByType(doc.slides[2], "View").find(
      (node) => node.style?.position === "absolute" && node.style?.left === 104,
    );
    expect(dashboardPanel?.style?.left).toBe(104);

    const comparisonColumns = findNodesByType(doc.slides[3], "View").filter((node) =>
      node.children?.some((child) => isRegisterRow(child)),
    );
    expect(comparisonColumns).toHaveLength(2);
    expect(comparisonColumns[0]?.style?.left).toBe(104);
    const comparisonRight = Math.max(...comparisonColumns.map((node) =>
      Number(node.style?.left) + Number(node.style?.width),
    ));
    expect(comparisonRight).toBe(DEFAULT_SLIDE_WIDTH_PX - 104);

    const chartFocusChart = findNodesByType(doc.slides[4], "Chart")[0];
    expect(chartFocusChart?.style?.left).toBe(104);

    const bulletsBody = findNodesByType(doc.slides[5], "View").find(
      (node) => node.style?.position === "absolute"
        && node.style?.left === 104,
    );
    expect(bulletsBody?.style?.left).toBe(104);
    expect(bulletsBody?.style?.width).toBe(expectedWidth);
  });

  it("keeps shape controls from reintroducing KPI card grids", () => {
    const rounded = compileAgentDocument({
      presentationTitle: "Rounded",
      designTokens: { shape: "round" },
      slides: [
        {
          pattern: "dashboard",
          content: {
            title: "Dashboard",
            kpis: [{ label: "ARR", value: "$12M" }],
          },
        },
        {
          pattern: "chart-focus",
          content: {
            title: "Chart Focus",
            chart: {
              type: "bar",
              series: [{ name: "ARR", dataPoints: [{ category: "Q1", value: 120 }] }],
            },
            kpis: [{ label: "ARR", value: "$12M" }],
          },
        },
      ],
    }, { layoutValidation: "off" });
    const sharp = compileAgentDocument({
      presentationTitle: "Sharp",
      designTokens: { shape: "sharp" },
      slides: [
        {
          pattern: "dashboard",
          content: {
            title: "Dashboard",
            kpis: [{ label: "ARR", value: "$12M" }],
          },
        },
        {
          pattern: "chart-focus",
          content: {
            title: "Chart Focus",
            chart: {
              type: "bar",
              series: [{ name: "ARR", dataPoints: [{ category: "Q1", value: 120 }] }],
            },
            kpis: [{ label: "ARR", value: "$12M" }],
          },
        },
      ],
    }, { layoutValidation: "off" });

    const roundedViews = rounded.slides.flatMap((slide) => findNodesByType(slide, "View"));
    const sharpViews = sharp.slides.flatMap((slide) => findNodesByType(slide, "View"));
    expect(roundedViews.some((node) => node.shapeType === "roundRect")).toBe(false);
    expect(sharpViews.some((node) => node.shapeType === "roundRect")).toBe(false);
    expect(findTextNodesInDocument(rounded).filter((node) => node.content === "ARR")).toHaveLength(2);
    expect(findTextNodesInDocument(sharp).filter((node) => node.content === "ARR")).toHaveLength(2);
  });

  it("emits layout warnings for overflow, clipping, and collisions", () => {
    const warnings = validateAgentDocumentLayout({
      type: "Document",
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              style: {
                position: "absolute",
                left: 40,
                top: 40,
                width: 80,
                height: 14,
                fontSize: 20,
              },
              content: "This is intentionally too long for a short text frame and should overflow. ".repeat(8),
            },
            {
              type: "Text",
              style: {
                position: "absolute",
                left: 220,
                top: 40,
                width: 160,
                height: 16,
                fontSize: 28,
              },
              content: "Clip",
            },
            {
              type: "Text",
              style: {
                position: "absolute",
                left: 420,
                top: 80,
                width: 160,
                height: 40,
                fontSize: 18,
              },
              content: "A",
            },
            {
              type: "Text",
              style: {
                position: "absolute",
                left: 460,
                top: 95,
                width: 160,
                height: 40,
                fontSize: 18,
              },
              content: "B",
            },
          ],
        },
      ],
    } as any);

    expect(warnings.some((warning) => warning.code === "POTENTIAL_OVERFLOW")).toBe(true);
    expect(warnings.some((warning) => warning.code === "POTENTIAL_CLIP")).toBe(true);
    expect(warnings.some((warning) => warning.code === "POTENTIAL_COLLISION")).toBe(true);
  });

  it("warns on a legacy unowned comparison and rejects it in strict mode", () => {
    const input = {
      presentationTitle: "Legacy comparison",
      slides: [{
        pattern: "comparison",
        content: {
          title: "Compare",
          subtitle: "General comparison",
          bulletPoints: ["First item", "Second item"],
        },
      }],
    };
    const warnings: string[] = [];
    expect(() => compileAgentDocument(input, {
      layoutValidation: "warn",
      onLayoutWarning: (warning) => warnings.push(warning.code),
    })).not.toThrow();
    expect(warnings).toContain("POTENTIAL_UNOWNED_COMPARISON");
    expect(() => compileAgentDocument(input, { layoutValidation: "error" }))
      .toThrow(/POTENTIAL_UNOWNED_COMPARISON/);
  });

  it("throws AGENT_LAYOUT_VALIDATION_FAILED in error mode when warnings are present", () => {
    expect(() =>
      compileAgentDocument({
        presentationTitle: "Overflowing Header",
        slides: [
          {
            pattern: "dashboard",
            content: {
              title: "This dashboard heading is intentionally too long for a very narrow header frame and should trigger layout validation.",
              subtitle: "Still narrow",
              kpis: [{ label: "ARR", value: "$12M" }],
            },
          },
        ],
        designTokens: {
          typography: {
            headerSize: 60,
          },
          layout: {
            contentWidth: 120,
          },
        },
      }, {
        layoutValidation: "error",
      }),
    ).toThrowError(PaperError);

    try {
      compileAgentDocument({
        presentationTitle: "Overflowing Header",
        slides: [
          {
            pattern: "dashboard",
            content: {
              title: "This dashboard heading is intentionally too long for a very narrow header frame and should trigger layout validation.",
              subtitle: "Still narrow",
              kpis: [{ label: "ARR", value: "$12M" }],
            },
          },
        ],
        designTokens: {
          typography: {
            headerSize: 60,
          },
          layout: {
            contentWidth: 120,
          },
        },
      }, {
        layoutValidation: "error",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PaperError);
      expect((error as PaperError).code).toBe("AGENT_LAYOUT_VALIDATION_FAILED");
    }
  });

  it("keeps the canonical six-pattern deck warning-free for default and explicit lg scale", () => {
    const canonicalDoc = {
      presentationTitle: "Canonical Six Pattern Deck",
      slides: [
        { pattern: "title", content: { title: "Canonical Deck", subtitle: "Baseline" } },
        { pattern: "statement", content: { title: "Statement", prose: ["A short supporting paragraph."] } },
        {
          pattern: "dashboard",
          content: {
            title: "Dashboard",
            kpis: [
              { label: "ARR", value: "$12M" },
              { label: "NRR", value: "118%" },
            ],
            chart: {
              type: "bar",
              series: [{ name: "ARR", dataPoints: [{ category: "Q1", value: 120 }, { category: "Q2", value: 135 }] }],
            },
          },
        },
        { pattern: "comparison", content: { title: "Comparison", bulletPoints: ["Left", "Right", "Third", "Fourth"] } },
        {
          pattern: "chart-focus",
          content: {
            title: "Chart Focus",
            chart: {
              type: "line",
              series: [{ name: "Growth", dataPoints: [{ category: "Q1", value: 20 }, { category: "Q2", value: 28 }] }],
            },
            kpis: [{ label: "YoY", value: "+24%" }],
          },
        },
        { pattern: "bullets", content: { title: "Bullets", bulletPoints: ["One", "Two"], prose: ["Extra context."] } },
      ],
    };

    const implicitDefault = compileAgentDocument(canonicalDoc, { layoutValidation: "off" });
    const explicitScale = compileAgentDocument({
      ...canonicalDoc,
      designTokens: {
        scale: "lg",
      },
    }, { layoutValidation: "off" });

    expect(validateAgentDocumentLayout(implicitDefault)).toEqual([]);
    expect(validateAgentDocumentLayout(explicitScale)).toEqual([]);
  });

  it("keeps subtitle-driven agent layouts warning-free with default slot z-order", () => {
    const doc = compileAgentDocument({
      presentationTitle: "Subtitle Coverage",
      theme: "default-navy",
      slides: [
        { pattern: "title", content: { title: "Title", subtitle: "Subtitle" } },
        { pattern: "statement", content: { title: "Statement", subtitle: "Subtitle", prose: ["Short copy."] } },
        {
          pattern: "dashboard",
          content: {
            title: "Dashboard",
            subtitle: "Subtitle",
            kpis: [{ label: "ARR", value: "$12M" }],
            chart: {
              type: "bar",
              series: [{ name: "ARR", dataPoints: [{ category: "Q1", value: 120 }] }],
            },
          },
        },
        {
          pattern: "comparison",
          content: {
            title: "Comparison",
            subtitle: "Subtitle",
            bulletPoints: ["Left", "Right", "Third", "Fourth"],
          },
        },
        {
          pattern: "chart-focus",
          content: {
            title: "Chart Focus",
            subtitle: "Subtitle",
            chart: {
              type: "line",
              series: [{ name: "Growth", dataPoints: [{ category: "Q1", value: 20 }] }],
            },
            kpis: [{ label: "YoY", value: "+24%" }],
          },
        },
        {
          pattern: "bullets",
          content: {
            title: "Bullets",
            subtitle: "Subtitle",
            bulletPoints: ["One", "Two"],
            prose: ["Extra context."],
          },
        },
      ],
    }, { layoutValidation: "off" });

    expect(validateAgentDocumentLayout(doc)).toEqual([]);
  });

  it("keeps the midnight six-pattern deck warning-free at the recommended three-token spec", () => {
    const midnightDeck = compileAgentDocument(buildModernPresetDeck("midnight"), { layoutValidation: "off" });

    expect(validateAgentDocumentLayout(midnightDeck)).toEqual([]);
  });

  it("keeps terminal and editorial-wide six-pattern decks warning-free at their recommended specs", () => {
    for (const theme of ["terminal", "editorial-wide"] as const) {
      const deck = compileAgentDocument(buildModernPresetDeck(theme), { layoutValidation: "off" });
      expect(validateAgentDocumentLayout(deck), `${theme} layout warnings`).toEqual([]);
    }
  });

  it("sets meta.title from presentationTitle", () => {
    const doc = compileAgentDocument(minimalAgentDoc({ presentationTitle: "My Deck" }));
    expect(doc.meta?.title).toBe("My Deck");
  });

  it("sets meta.author from companyName", () => {
    const doc = compileAgentDocument(minimalAgentDoc({ companyName: "Acme Corp" }));
    expect(doc.meta?.author).toBe("Acme Corp");
  });

  it("produces one PaperSlide per input slide", () => {
    const doc = compileAgentDocument(minimalAgentDoc({
      slides: [
        { pattern: "title", content: { title: "Slide 1" } },
        { pattern: "bullets", content: { title: "Slide 2" } },
        { pattern: "statement", content: { title: "Slide 3" } },
      ],
    }));
    expect(doc.slides.length).toBe(3);
  });

  it("applies font fallbacks across all six agent slide patterns", () => {
    const doc = compileAgentDocument({
      presentationTitle: "All patterns",
      designTokens: {
        typography: { fontStrategy: "system-safe" },
      },
      slides: [
        { pattern: "title", content: { title: "Title" } },
        { pattern: "statement", content: { title: "Statement", prose: ["Paragraph"] } },
        {
          pattern: "dashboard",
          content: {
            title: "Dashboard",
            kpis: [{ label: "ARR", value: "$12M" }],
            chart: { type: "bar", series: [{ name: "ARR", dataPoints: [{ category: "Q1", value: 120 }] }] },
          },
        },
        { pattern: "comparison", content: { title: "Comparison", bulletPoints: ["Left", "Right"] } },
        {
          pattern: "chart-focus",
          content: {
            title: "Chart Focus",
            chart: { type: "line", series: [{ name: "Growth", dataPoints: [{ category: "Q1", value: 20 }] }] },
          },
        },
        { pattern: "bullets", content: { title: "Bullets", bulletPoints: ["One", "Two"], prose: ["More detail"] } },
      ],
    });

    for (const textNode of findTextNodesInDocument(doc)) {
      expect(textNode.style?.fontFamily).toBe("Liberation Sans");
      expect(textNode.style?.fontFallback).toEqual(["Carlito", "Source Sans 3"]);
    }

    const chartNodes = doc.slides.flatMap((slide) => findNodesByType(slide, "Chart")) as any[];
    expect(chartNodes.length).toBe(2);
    for (const chart of chartNodes) {
      expect(chart.chartData.legend.fontFamily).toBe("Liberation Sans");
      expect(chart.chartData.categoryAxis.fontFamily).toBe("Liberation Sans");
      expect(chart.chartData.valueAxis.fontFamily).toBe("Liberation Sans");
    }
  });

  it("rejects spreadsheet agent documents in the presentation interpreter", () => {
    expect(() =>
      AgentDocumentSchema.parse({
        type: "spreadsheet",
        presentationTitle: "Workbook",
        slides: [{ pattern: "title", content: { title: "Hello" } }],
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// accentColor hex validation (Sprint 2C)
// ---------------------------------------------------------------------------

describe("AgentDocumentSchema — accentColor validation", () => {
  it("rejects named color 'red'", () => {
    expect(() => AgentDocumentSchema.parse({ presentationTitle: "T", accentColor: "red", slides: [] })).toThrow();
  });

  it("rejects shorthand '#FFF'", () => {
    expect(() => AgentDocumentSchema.parse({ presentationTitle: "T", accentColor: "#FFF", slides: [] })).toThrow();
  });

  it("rejects 'rgb(255,0,0)'", () => {
    expect(() => AgentDocumentSchema.parse({ presentationTitle: "T", accentColor: "rgb(255,0,0)", slides: [] })).toThrow();
  });

  const minSlide = { pattern: "title" as const, content: { title: "T" } };

  it("accepts '#2563EB'", () => {
    const parsed = AgentDocumentSchema.parse({ presentationTitle: "T", accentColor: "#2563EB", slides: [minSlide] });
    expect(parsed.accentColor).toBe("#2563EB");
  });

  it("accepts '#ff0000' (lowercase)", () => {
    const parsed = AgentDocumentSchema.parse({ presentationTitle: "T", accentColor: "#ff0000", slides: [minSlide] });
    expect(parsed.accentColor).toBe("#ff0000");
  });

  it("accepts undefined accentColor", () => {
    const parsed = AgentDocumentSchema.parse({ presentationTitle: "T", slides: [minSlide] });
    expect(parsed.accentColor).toBeUndefined();
  });

  it("accepts built-in preset themes and partial designTokens", () => {
    const parsed = AgentDocumentSchema.parse({
      presentationTitle: "T",
      theme: "dark-punch",
      designTokens: {
        colors: { accent: "#10B981" },
        typography: { heroTitleSize: 44 },
      },
      slides: [minSlide],
    });
    expect(parsed.theme).toBe("dark-punch");
    expect(parsed.designTokens?.colors?.accent).toBe("#10B981");
    expect(parsed.designTokens?.typography?.heroTitleSize).toBe(44);
  });
});

describe("AgentDocumentSchema — area chart grouping", () => {
  it.each(["standard", "stacked", "percentStacked"] as const)(
    "preserves %s through schema parsing and agent compilation",
    (areaGrouping) => {
      const input = {
        presentationTitle: "Area grouping",
        slides: [{
          pattern: "chart-focus" as const,
          content: {
            title: "Capacity mix",
            chart: {
              type: "area" as const,
              areaGrouping,
              series: [{
                name: "Core",
                dataPoints: [
                  { category: "Q1", value: 20 },
                  { category: "Q2", value: 28 },
                ],
              }],
            },
          },
        }],
      };

      const parsed = AgentDocumentSchema.parse(input);
      expect(parsed.slides[0].content.chart?.areaGrouping).toBe(areaGrouping);

      const compiled = compileAgentDocument(input, { layoutValidation: "off" });
      const charts = findNodesByType(compiled.slides[0], "Chart");
      expect((charts[0] as Extract<PaperNode, { type: "Chart" }>).chartData.areaGrouping)
        .toBe(areaGrouping);
    },
  );

  it("emits every agent area grouping in rendered chart OOXML", async () => {
    const groupings = ["standard", "stacked", "percentStacked"] as const;
    const compiled = compileAgentDocument({
      presentationTitle: "Area grouping OOXML",
      slides: groupings.map((areaGrouping) => ({
        pattern: "chart-focus" as const,
        content: {
          title: areaGrouping,
          chart: {
            type: "area" as const,
            areaGrouping,
            series: [{
              name: "Core",
              dataPoints: [
                { category: "Q1", value: 20 },
                { category: "Q2", value: 28 },
              ],
            }],
          },
        },
      })),
    }, { layoutValidation: "off" });

    const buffer = await PaperEngine.render(compiled);
    const zip = await JSZip.loadAsync(buffer);

    await Promise.all(groupings.map(async (areaGrouping, index) => {
      const chartXml = await zip.file(`ppt/charts/chart${index + 1}.xml`)?.async("string");
      expect(chartXml).toContain("<c:areaChart>");
      expect(chartXml).toContain(`<c:grouping val="${areaGrouping}"/>`);
    }));
  });

  it("rejects a deliberately broken compiled area grouping", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Broken grouping control",
      slides: [{
        pattern: "chart-focus",
        content: {
          title: "Capacity",
          chart: {
            type: "area",
            areaGrouping: "stacked",
            series: [{ name: "Core", dataPoints: [{ category: "Q1", value: 1 }] }],
          },
        },
      }],
    });
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    const chart = findNodesByType(compiled.slides[0], "Chart")[0];
    if (chart?.type === "Chart") chart.chartData.areaGrouping = "standard";

    expect(() => assertAgentCompilationSemantics(source, compiled))
      .toThrow(/grouping was not preserved/);
  });
});

// ---------------------------------------------------------------------------
// compileAgentSlide — Title pattern
// ---------------------------------------------------------------------------

describe("compileAgentSlide — title", () => {
  it("has a deterministic solid title field", () => {
    const slide = compileAgentSlide(minimalSlide("title"), "#2563EB");
    expect(slide.background?.type).toBe("solid");
  });

  it("has a prominent title text", () => {
    const slide = compileAgentSlide(minimalSlide("title", { title: "Big Title" }), "#2563EB");
    const texts = findTextNodes(slide);
    const title = texts.find(t => typeof t.content === "string" && t.content === "Big Title");
    expect(title).toBeDefined();
    expect(title!.style?.fontSize).toBeGreaterThanOrEqual(42);
  });

  it("includes subtitle when provided", () => {
    const slide = compileAgentSlide(minimalSlide("title", { title: "T", subtitle: "Sub" }), "#2563EB");
    const texts = findTextNodes(slide);
    const sub = texts.find(t => typeof t.content === "string" && t.content === "Sub");
    expect(sub).toBeDefined();
  });

  it("omits subtitle when not provided", () => {
    const slide = compileAgentSlide(minimalSlide("title", { title: "T" }), "#2563EB");
    const texts = findTextNodes(slide);
    // Should only have 1 text (title), no subtitle
    const contentTexts = texts.filter(t => typeof t.content === "string" && t.content !== "T");
    // No subtitle text
    expect(contentTexts.every(t => t.style?.fontSize !== 18)).toBe(true);
  });

  it("uses a restrained editorial field to balance the title canvas", () => {
    const slide = compileAgentSlide(minimalSlide("title", { title: "T" }), "#2563EB");
    const fields = findNodesByType(slide, "View")
      .filter((node) => node.altText === "Agent title editorial field");
    expect(fields).toHaveLength(1);
    expect(fields[0]?.decorative).toBe(true);
    expect(fields[0]?.style?.height).toBe(DEFAULT_SLIDE_HEIGHT_PX);
    expect(fields[0]?.style?.width).toBeGreaterThan(180);
  });
});

// ---------------------------------------------------------------------------
// compileAgentSlide — Statement pattern
// ---------------------------------------------------------------------------

describe("compileAgentSlide — statement", () => {
  it("has OFF_WHITE solid background", () => {
    const slide = compileAgentSlide(minimalSlide("statement"), "#2563EB");
    expect(slide.background?.type).toBe("solid");
    expect((slide.background as any)?.color).toBe("#F8FAFC");
  });

  it("preserves prose items as separate entries in the editorial rail", () => {
    const slide = compileAgentSlide(
      minimalSlide("statement", { title: "T", prose: ["Paragraph 1", "Paragraph 2"] }),
      "#2563EB",
    );
    const texts = findTextNodes(slide);
    expect(texts.some((text) => text.content === "Paragraph 1")).toBe(true);
    expect(texts.some((text) => text.content === "Paragraph 2")).toBe(true);
    const fields = findNodesByType(slide, "View")
      .filter((node) => node.altText === "Agent statement evidence field");
    expect(fields).toHaveLength(1);
    expect(fields[0]?.style?.left).toBeGreaterThan(DEFAULT_SLIDE_WIDTH_PX / 2);
    expect(findNodesByType(slide, "View").filter((node) => node.altText === "Agent register row"))
      .toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// compileAgentSlide — Dashboard pattern
// ---------------------------------------------------------------------------

describe("compileAgentSlide — dashboard", () => {
  it("creates one metric protagonist and a supporting register", () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", {
        title: "KPIs",
        kpis: [
          { label: "Revenue", value: "$4.2M" },
          { label: "Growth", value: "12%" },
        ],
      }),
      "#2563EB",
    );
    const views = findNodesByType(slide, "View");
    const protagonist = views.find((view) => view.children?.some(
      (child) => child.type === "Text" && child.content === "Revenue",
    ));
    const support = views.find((view) => view.children?.some(
      (child) => child.type === "Text" && child.content === "Growth",
    ));
    expect(protagonist?.style?.backgroundColor).toBe("#2563EB");
    expect(Number(protagonist?.style?.width)).toBeLessThan(Number(support?.style?.width));
    const protagonistValue = findTextNodes(slide).find((text) => text.content === "$4.2M");
    expect(Number(protagonistValue?.style?.fontSize)).toBeGreaterThanOrEqual(78);
    expect(views.some((view) => view.shapeType === "roundRect")).toBe(false);
  });

  it("preserves explicit primary style without decorating every supporting metric", () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", {
        title: "KPIs",
        kpis: [
          { label: "A", value: "1", style: "dark" },
          { label: "B", value: "2" },
          { label: "C", value: "3" },
        ],
      }),
      "#2563EB",
    );
    const protagonist = findNodesByType(slide, "View").find((view) =>
      view.children?.some((child) => child.type === "Text" && child.content === "A"),
    );
    expect(protagonist?.style?.backgroundColor).toBe("#0F2540");
    expect(findNodesByType(slide, "View").some((view) => view.style?.fill?.type === "linear")).toBe(false);
    expect(findTextNodes(slide).filter((text) => ["1", "2", "3"].includes(String(text.content)))).toHaveLength(3);
  });

  it("derives labeled reference fields and highlights a source-defined threshold breach", () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", {
        title: "Operating metrics",
        kpis: [
          { label: "Revenue", value: "$48.2M", sublabel: "+18% YoY" },
          { label: "Office CRE", value: "168%", sublabel: "Capital; limit 150%" },
        ],
      }),
      "#FF6B35",
    );
    const texts = findTextNodes(slide);

    expect(texts.some((text) => text.content === "PRIOR YEAR")).toBe(true);
    expect(texts.some((text) => text.content === "$40.8M")).toBe(true);
    expect(texts.some((text) => text.content === "LIMIT")).toBe(true);
    expect(texts.some((text) => text.content === "150%")).toBe(true);
    expect(texts.some((text) => text.content === "NOW")).toBe(false);
    expect(texts.find((text) => text.content === "168%")?.style?.color).toBe("#DC2626");
    expect(texts.find((text) => text.content === "$48.2M")?.style?.color).not.toBe("#FFFFFF");
    expect(findNodesByType(slide, "View").filter((view) => view.altText === "Agent metric current bar")).toHaveLength(2);
    expect(findNodesByType(slide, "View").filter((view) => view.altText === "Agent metric reference bar")).toHaveLength(2);
  });

  it("handles 0 KPIs gracefully", () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", { title: "Empty Dashboard" }),
      "#2563EB",
    );
    expect(slide.type).toBe("Slide");
  });

  it("lays out a wrapping protagonist and supporting register without text overlap", async () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", {
        title: "Compensation metrics",
        subtitle: "Wrapping stress case",
        kpis: [
          {
            label: "Base salary target compensation",
            value: "$7.24M / monthly recurring revenue",
            sublabel: "FY26 target compensation",
          },
          { label: "Target bonus percentage", value: "225%", sublabel: "at maximum" },
          { label: "Long-term incentive allocation", value: "75/25", sublabel: "equity / cash" },
          { label: "Board-approved compensation", value: "$850K", sublabel: "base salary" },
        ],
      }),
      "#2563EB",
      undefined,
      { shape: "sharp", layout: { dashboardPanelWidthFull: 520 } },
    );
    const layout = await runLayout(slide);
    const values = new Set([
      "$7.24M / monthly recurring revenue",
      "225%",
      "75/25",
      "$850K",
    ]);
    const fields = findLayoutNodes(
      layout,
      (node) => node.type === "View" && Boolean(node.children?.some(
        (child) => child.type === "Text"
          && typeof child.content === "string"
          && values.has(child.content),
      )),
    );

    expect(fields).toHaveLength(2);
    expect(fields[0].layout.width).not.toBe(fields[1].layout.width);

    for (const field of fields) {
      const textNodes = findLayoutNodes(field, (node) => node.type === "Text")
        .sort((a, b) => a.layout.y - b.layout.y);
      for (let index = 1; index < textNodes.length; index += 1) {
        const previous = textNodes[index - 1];
        const current = textNodes[index];
        expect(previous.layout.y + previous.layout.height).toBeLessThanOrEqual(current.layout.y);
      }
      expect(textNodes.at(-1)!.layout.y + textNodes.at(-1)!.layout.height)
        .toBeLessThanOrEqual(field.layout.y + field.layout.height);
    }

    for (let left = 0; left < fields.length; left += 1) {
      for (let right = left + 1; right < fields.length; right += 1) {
        const a = fields[left].layout;
        const b = fields[right].layout;
        const overlaps = a.x < b.x + b.width
          && a.x + a.width > b.x
          && a.y < b.y + b.height
          && a.y + a.height > b.y;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("uses most of the dashboard body instead of clumping KPI cards at the top", async () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", {
        title: "Operating metrics",
        subtitle: "Balanced dashboard",
        kpis: [
          { label: "Revenue", value: "$48.2M" },
          { label: "Gross margin", value: "72.4%" },
          { label: "Customers", value: "1,247" },
          { label: "NPS", value: "67" },
        ],
      }),
      "#2563EB",
      undefined,
      { shape: "sharp" },
    );
    const layout = await runLayout(slide);
    const fields = findLayoutNodes(
      layout,
      (node) => node.type === "View"
        && Boolean(node.children?.some((child) => child.type === "Text"))
        && ["Revenue", "Gross margin", "Customers", "NPS"].some((label) =>
          findLayoutNodes(node, (child) => child.type === "Text" && child.content === label).length > 0),
    );
    const top = Math.min(...fields.map((field) => field.layout.y));
    const bottom = Math.max(...fields.map((field) => field.layout.y + field.layout.height));

    expect(fields).toHaveLength(2);
    expect((bottom - top) / DEFAULT_SLIDE_HEIGHT_PX).toBeGreaterThanOrEqual(0.7);
    expect(bottom / DEFAULT_SLIDE_HEIGHT_PX).toBeGreaterThanOrEqual(0.85);
  });

  it("rejects a deliberately top-clustered dashboard layout", async () => {
    const slide = compileAgentSlide(
      minimalSlide("dashboard", {
        title: "Broken dashboard control",
        kpis: [
          { label: "Revenue", value: "$1M" },
          { label: "Margin", value: "70%" },
        ],
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    for (const node of findLayoutNodes(
      layout,
      (candidate) => candidate.type === "View"
        && (candidate.style?.fill !== undefined
          || candidate.style?.backgroundColor !== undefined
          || candidate.style?.borderWidth !== undefined),
    )) {
      node.layout.y = 90;
      node.layout.height = 40;
    }

    expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX))
      .toThrow(/clusters content in the top band/);
  });
});

// ---------------------------------------------------------------------------
// compileAgentSlide — Comparison pattern
// ---------------------------------------------------------------------------

describe("compileAgentSlide — comparison", () => {
  it("renders explicit comparison semantics as two labeled owned fields", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Operating model",
      slides: [{
        pattern: "comparison",
        content: {
          title: "Current and scaled model",
          comparison: {
            leftLabel: "Current model",
            rightLabel: "Scaled model",
            rows: [
              { left: "Manual forecast", right: "Governed weekly forecast" },
              { left: "Local stages", right: "Shared qualification model" },
            ],
          },
        },
      }],
    });
    const slide = compileAgentSlide(source.slides[0], "#2563EB");
    const owned = findNodesByType(slide, "View").filter((view) =>
      view.altText?.startsWith("Agent comparison owned field:"),
    );
    expect(owned).toHaveLength(2);
    expect(findTextNodes(slide).some((text) => text.content === "Current model")).toBe(true);
    expect(findTextNodes(slide).some((text) => text.content === "Governed weekly forecast")).toBe(true);
  });

  it("rejects ambiguous explicit and bullet comparison input", () => {
    expect(() => AgentDocumentSchema.parse({
      presentationTitle: "Ambiguous comparison",
      slides: [{
        pattern: "comparison",
        content: {
          title: "Compare",
          bulletPoints: ["Legacy"],
          comparison: {
            leftLabel: "Before",
            rightLabel: "After",
            rows: [{ left: "A", right: "B" }],
          },
        },
      }],
    })).toThrow(/mutually exclusive/);
  });

  it.each([
    { leftLabel: "", rightLabel: "Target", rows: [{ left: "A", right: "B" }] },
    { leftLabel: "Today", rightLabel: "", rows: [{ left: "A", right: "B" }] },
    { leftLabel: "Today", rightLabel: "Target", rows: [] },
    { leftLabel: "Today", rightLabel: "Target", rows: [{ left: "", right: "B" }] },
  ])("rejects empty explicit comparison labels, cells, and row sets", (comparison) => {
    expect(() => AgentDocumentSchema.parse({
      presentationTitle: "Invalid comparison",
      slides: [{ pattern: "comparison", content: { title: "Compare", comparison } }],
    })).toThrow();
  });

  it("creates two-column split", () => {
    const slide = compileAgentSlide(
      minimalSlide("comparison", {
        title: "Compare",
        bulletPoints: ["A", "B", "C", "D"],
      }),
      "#2563EB",
    );
    const columns = findNodesByType(slide, "View").filter((view) =>
      view.children?.some((child) => isRegisterRow(child)),
    );
    expect(columns.length).toBe(2);
    expect(columns[0].style?.height).toBe(columns[1].style?.height);
  });

  it("splits bullets at midpoint", () => {
    const slide = compileAgentSlide(
      minimalSlide("comparison", {
        title: "Compare",
        bulletPoints: ["A", "B", "C", "D"],
      }),
      "#2563EB",
    );
    const columns = findNodesByType(slide, "View").filter((view) =>
      view.children?.some((child) => isRegisterRow(child)),
    );
    expect(columns.map((column) => column.children?.filter(isRegisterRow).length)).toEqual([2, 2]);
    expect(findTextNodes(slide).filter((text) => ["A", "B", "C", "D"].includes(String(text.content)))).toHaveLength(4);
  });

  it("handles odd count", () => {
    const slide = compileAgentSlide(
      minimalSlide("comparison", {
        title: "Compare",
        bulletPoints: ["A", "B", "C"],
      }),
      "#2563EB",
    );
    const columns = findNodesByType(slide, "View").filter((view) =>
      view.children?.some((child) => isRegisterRow(child)),
    );
    expect(columns.map((column) => column.children?.filter(isRegisterRow).length)).toEqual([2, 1]);
  });

  it("enforces readable comparison type and centers it in full-width columns", async () => {
    const slide = compileAgentSlide(
      minimalSlide("comparison", {
        title: "Runstamp vs legacy pipeline",
        subtitle: "Comparison pattern",
        bulletPoints: [
          "Schema-validated input instead of implicit JSON contracts",
          "Generated docs instead of hand-maintained tables",
          "Relaxed parsing with structured warnings for LLM drift",
          "Cross-format visual regression instead of byte-only checks",
          "Theme presets plus token overrides for agent decks",
          "Audit corpus pinned to shipped npm behavior",
        ],
      }),
      "#2563EB",
    );
    const entries = new Set([
      "Schema-validated input instead of implicit JSON contracts",
      "Generated docs instead of hand-maintained tables",
      "Relaxed parsing with structured warnings for LLM drift",
      "Cross-format visual regression instead of byte-only checks",
      "Theme presets plus token overrides for agent decks",
      "Audit corpus pinned to shipped npm behavior",
    ]);
    const comparisonText = findTextNodes(slide).filter((node) =>
      typeof node.content === "string" && entries.has(node.content),
    );

    expect(comparisonText).toHaveLength(6);
    for (const node of comparisonText) {
      expect(node.style?.fontSize).toBeGreaterThanOrEqual(15);
      expect(node.autoFit).toBe(true);
      expect(node.style?.textAlign).toBe("left");
    }

    const layout = await runLayout(slide);
    const columns = findLayoutNodes(
      layout,
      (node) => node.type === "View"
        && node.children?.some(isRegisterRow) === true,
    );
    const body = columns[0].layout;
    const columnGap = columns[1].layout.x - (body.x + body.width);
    const usedWidth = body.width + columnGap + columns[1].layout.width;

    expect(columns).toHaveLength(2);
    expect(usedWidth).toBe(1140);
    expect(columns.every((column) => column.layout.height >= DEFAULT_SLIDE_HEIGHT_PX * 0.7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// compileAgentSlide — Chart-focus pattern
// ---------------------------------------------------------------------------

describe("compileAgentSlide — chart-focus", () => {
  it("includes Chart node", () => {
    const slide = compileAgentSlide(
      minimalSlide("chart-focus", {
        title: "Revenue",
        chart: {
          type: "bar",
          series: [{ name: "2025", dataPoints: [{ category: "Q1", value: 100 }] }],
        },
      }),
      "#2563EB",
    );
    const charts = findNodesByType(slide, "Chart");
    expect(charts.length).toBe(1);
  });

  it("keeps the chart dominant when KPIs are present", () => {
    const slide = compileAgentSlide(
      minimalSlide("chart-focus", {
        title: "Revenue",
        chart: {
          type: "bar",
          series: [{ name: "2025", dataPoints: [{ category: "Q1", value: 100 }] }],
        },
        kpis: [{ label: "Total", value: "$1M" }],
      }),
      "#2563EB",
    );
    const charts = findNodesByType(slide, "Chart");
    expect((charts[0] as any).style?.width).toBeGreaterThanOrEqual(DEFAULT_SLIDE_WIDTH_PX * 0.58);
    expect((charts[0] as any).style?.height).toBeGreaterThanOrEqual(DEFAULT_SLIDE_HEIGHT_PX * 0.65);
  });

  it("uses the full usable chart field without KPIs", () => {
    const slide = compileAgentSlide(
      minimalSlide("chart-focus", {
        title: "Revenue",
        chart: {
          type: "bar",
          series: [{ name: "2025", dataPoints: [{ category: "Q1", value: 100 }] }],
        },
      }),
      "#2563EB",
    );
    const charts = findNodesByType(slide, "Chart");
    expect((charts[0] as any).style?.width).toBeGreaterThanOrEqual(DEFAULT_SLIDE_WIDTH_PX * 0.8);
    expect(Number((charts[0] as any).style?.left) + Number((charts[0] as any).style?.width))
      .toBeLessThanOrEqual(DEFAULT_SLIDE_WIDTH_PX - 60);
  });

  it("converts agent chart data via agentChartToChartData", () => {
    const slide = compileAgentSlide(
      minimalSlide("chart-focus", {
        title: "Revenue",
        chart: {
          type: "bar",
          title: "Sales",
          series: [
            { name: "2025", dataPoints: [{ category: "Q1", value: 100 }, { category: "Q2", value: 200 }] },
          ],
        },
      }),
      "#2563EB",
    );
    const charts = findNodesByType(slide, "Chart");
    const chartData = (charts[0] as any).chartData;
    expect(chartData.chartType).toBe("bar");
    expect(chartData.categories).toEqual(["Q1", "Q2"]);
    expect(chartData.series[0].values).toEqual([100, 200]);
  });
});

// ---------------------------------------------------------------------------
// compileAgentSlide — Bullets pattern
// ---------------------------------------------------------------------------

describe("compileAgentSlide — bullets", () => {
  it("creates one measured register entry per list item", () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Points",
        bulletPoints: ["Point A", "Point B"],
      }),
      "#2563EB",
    );
    const entries = findTextNodes(slide).filter((text) => ["Point A", "Point B"].includes(String(text.content)));
    const indices = findTextNodes(slide).filter((text) => ["01", "02"].includes(String(text.content)));
    expect(entries).toHaveLength(2);
    expect(indices).toHaveLength(2);
    expect(entries.every((text) => text.style?.textFit?.policy === "fitFontSize")).toBe(true);
  });

  it("uses density-adaptive register rows instead of unconditional space-between", () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Points",
        bulletPoints: ["Point A", "Point B"],
      }),
      "#2563EB",
    );
    const register = findNodesByType(slide, "View").find((node) =>
      node.children?.every((child) => isRegisterRow(child)),
    );
    expect(register?.style?.position).toBe("absolute");
    expect(register?.style?.height).toBeGreaterThanOrEqual(DEFAULT_SLIDE_HEIGHT_PX * 0.7);
    expect(register?.children?.every((child) => child.style?.height === register.children?.[0]?.style?.height)).toBe(true);
  });

  it("spreads sparse bullets into the lower canvas without overlap", async () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Sparse priorities",
        subtitle: "Use the full canvas",
        bulletPoints: ["First priority", "Second priority", "Third priority"],
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    const rows = findRegisterRows(layout).sort((left, right) => left.layout.y - right.layout.y);

    expect(rows).toHaveLength(3);
    expect(rows.at(-1)!.layout.y + rows.at(-1)!.layout.height)
      .toBeGreaterThanOrEqual(DEFAULT_SLIDE_HEIGHT_PX * 0.9);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index].layout.y)
        .toBeGreaterThanOrEqual(rows[index - 1].layout.y + rows[index - 1].layout.height);
    }
  });

  it("uses two full-height columns for short six-plus-item lists", async () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Six priorities",
        bulletPoints: ["One", "Two", "Three", "Four", "Five", "Six"],
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    const columns = findLayoutNodes(layout, (node) => node.type === "View"
      && node.altText === "Agent register"
      && node.style?.height !== undefined);

    expect(columns).toHaveLength(2);
    expect(columns[0]?.layout.x).not.toBe(columns[1]?.layout.x);
    expect(columns.every((column) => column.layout.height >= DEFAULT_SLIDE_HEIGHT_PX * 0.7)).toBe(true);
  });

  it("shares paired row boundaries and closes odd two-column lists at full width", async () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Five priorities",
        bulletPoints: [
          "A short first priority",
          "A longer second priority that wraps into additional lines for the shared row",
          "Third priority",
          "Fourth priority with a little more supporting context",
          "Fifth priority",
        ],
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    const registers = findLayoutNodes(layout, (node) => node.type === "View"
      && node.children?.some((child) => child.type === "View" && child.altText === "Agent register row") === true)
      .sort((left, right) => left.layout.y - right.layout.y || left.layout.x - right.layout.x);
    expect(registers).toHaveLength(3);
    const [left, right, closing] = registers;
    const leftRows = left.children!.filter((child) => child.altText === "Agent register row");
    const rightRows = right.children!.filter((child) => child.altText === "Agent register row");
    expect(leftRows).toHaveLength(2);
    expect(rightRows).toHaveLength(2);
    expect(rightRows.map((row) => [row.layout.y, row.layout.height]))
      .toEqual(leftRows.map((row) => [row.layout.y, row.layout.height]));
    expect(closing.layout.x).toBe(left.layout.x);
    expect(closing.layout.width).toBeGreaterThan(left.layout.width + right.layout.width);
    expect(closing.layout.y).toBeGreaterThanOrEqual(left.layout.y + left.layout.height);
  });

  it("keeps dense wrapping bullets compact and non-overlapping", async () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Dense priorities",
        subtitle: "Wrapping stress case",
        bulletPoints: Array.from({ length: 8 }, (_, index) =>
          `Priority ${index + 1} coordinates regional launch readiness, customer evidence, and operational ownership across the next review cycle. `.repeat(2),
        ),
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    const bullets = findLayoutNodes(
      layout,
      (node) => node.type === "Text"
        && typeof node.content === "string"
        && node.content.startsWith("Priority "),
    );

    expect(bullets).toHaveLength(8);
    expect(bullets.some((bullet) => bullet.layout.height > 20)).toBe(true);
    for (const row of findRegisterRows(layout)) {
      const entry = row.children?.find((child) => child.type === "Text" && String(child.content).startsWith("Priority "));
      expect(entry?.layout.y).toBeGreaterThanOrEqual(row.layout.y);
      expect(Number(entry?.layout.y) + Number(entry?.layout.height))
        .toBeLessThanOrEqual(row.layout.y + row.layout.height);
    }
    expect(Math.max(...findRegisterRows(layout).map((row) => row.layout.y + row.layout.height)))
      .toBeGreaterThanOrEqual(DEFAULT_SLIDE_HEIGHT_PX * 0.9);
  });

  it("keeps an odd two-column bullet cell unnumbered and uses source prose as an editorial field", async () => {
    const prose = "The bullets layout should stay stable as the semantic list grows.";
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "What changed this quarter",
        subtitle: "Bullets pattern",
        bulletPoints: [
          "Expanded enterprise coverage in North America",
          "Shipped role-based dashboards and saved views",
          "Reduced PDF render latency in the long-tail corpus",
          "Closed the DOCX auto-width overflow regression",
          "Added generated schema docs for the MCP surface",
        ],
        prose: [prose],
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    const bullets = findRegisterRows(layout);
    const proseNode = findLayoutNodes(
      layout,
      (node) => node.type === "Text" && node.content === prose,
    )[0];
    const finalBullet = bullets.find((bullet) => (
      bullet.children?.some((child) => child.type === "Text" && child.content === "05")
    ));

    expect(finalBullet).toBeDefined();
    expect(proseNode.layout.x).toBeGreaterThan(Number(finalBullet?.layout.x));
    expect(proseNode.layout.y).toBeGreaterThanOrEqual(Number(finalBullet?.layout.y));
    expect(proseNode.layout.y + proseNode.layout.height)
      .toBeLessThanOrEqual(Number(finalBullet?.layout.y) + Number(finalBullet?.layout.height));
    expect(findLayoutNodes(
      layout,
      (node) => node.type === "Text" && node.content === "06",
    )).toHaveLength(0);
  });

  it("rejects a deliberately top-clustered bullet layout", async () => {
    const slide = compileAgentSlide(
      minimalSlide("bullets", {
        title: "Broken control",
        bulletPoints: ["First", "Second", "Third"],
      }),
      "#2563EB",
    );
    const layout = await runLayout(slide);
    for (const bullet of findRegisterRows(layout)) {
      bullet.layout.y = 100;
      bullet.layout.height = 20;
    }

    expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX))
      .toThrow(/clusters content in the top band/);
  });
});

// ---------------------------------------------------------------------------
// applyElasticPagination
// ---------------------------------------------------------------------------

describe("applyElasticPagination", () => {
  it("returns unchanged doc when no overflow", () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        {
          type: "Slide" as const,
          children: [
            { type: "Text" as const, style: { fontSize: 14 }, content: "Short text" } as PaperText,
          ],
        },
      ],
    };

    const result = applyElasticPagination(doc);
    expect(result.slides.length).toBe(1);
  });

  it("splits overflowing slide with many paragraphs", () => {
    // Create a text body with many paragraphs that will overflow a small container
    const longParagraphs = Array.from({ length: 50 }, (_, i) => ({
      runs: [{ text: `This is paragraph ${i + 1} with enough text to take up space in the layout. `.repeat(3) }],
    }));

    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        {
          type: "Slide" as const,
          children: [
            { type: "Text" as const, style: { fontSize: 20 }, content: "Title" } as PaperText,
            {
              type: "Text" as const,
              style: { fontSize: 14 },
              paragraphs: longParagraphs,
            } as PaperText,
          ],
        },
      ],
    };

    // Use small container dimensions to force overflow
    const result = applyElasticPagination(doc, { textWidth: 200, textHeight: 100 });
    expect(result.slides.length).toBeGreaterThanOrEqual(2);
  }, 180_000);

  it("appends (Cont.) to title on continuation slides", () => {
    const longParagraphs = Array.from({ length: 50 }, (_, i) => ({
      runs: [{ text: `Paragraph ${i + 1} with text content. `.repeat(5) }],
    }));

    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        {
          type: "Slide" as const,
          children: [
            { type: "Text" as const, style: { fontSize: 20 }, content: "My Title" } as PaperText,
            {
              type: "Text" as const,
              style: { fontSize: 14 },
              paragraphs: longParagraphs,
            } as PaperText,
          ],
        },
      ],
    };

    const result = applyElasticPagination(doc, { textWidth: 200, textHeight: 100 });
    if (result.slides.length >= 2) {
      const secondSlide = result.slides[1];
      const titleTexts = findTextNodes(secondSlide).filter(
        t => typeof t.content === "string" && t.content.includes("(Cont.)"),
      );
      expect(titleTexts.length).toBeGreaterThanOrEqual(1);
    }
  }, 180_000);

  it("returns unchanged when content is unsplittable single char", () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        {
          type: "Slide" as const,
          children: [
            { type: "Text" as const, style: { fontSize: 14 }, content: "X" } as PaperText,
          ],
        },
      ],
    };

    const result = applyElasticPagination(doc);
    expect(result.slides.length).toBe(1);
  });

  it("respects maxDepth option", () => {
    const longParagraphs = Array.from({ length: 100 }, (_, i) => ({
      runs: [{ text: `Paragraph ${i + 1} long text. `.repeat(10) }],
    }));

    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        {
          type: "Slide" as const,
          children: [
            { type: "Text" as const, style: { fontSize: 20 }, content: "Title" } as PaperText,
            {
              type: "Text" as const,
              style: { fontSize: 14 },
              paragraphs: longParagraphs,
            } as PaperText,
          ],
        },
      ],
    };

    const result = applyElasticPagination(doc, { maxDepth: 2, textWidth: 200, textHeight: 50 });
    // With maxDepth=2, split can produce at most 2^2 = 4 slides
    expect(result.slides.length).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// modern-deck-paperdoc example
// ---------------------------------------------------------------------------

describe("modern-deck-paperdoc example", () => {
  it("builds a valid PaperDocument and renders successfully", async () => {
    const { buildModernDeckPaperDocument } = await import("../examples/modern-deck-paperdoc/deck.ts");

    const doc = buildModernDeckPaperDocument();
    expect(() => PaperDocumentSchema.parse(doc)).not.toThrow();

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("renders byte-identically in deterministic mode", async () => {
    const { buildModernDeckPaperDocument } = await import("../examples/modern-deck-paperdoc/deck.ts");

    setDeterministicMode(true);
    try {
      const first = await PaperEngine.render(buildModernDeckPaperDocument());
      const second = await PaperEngine.render(buildModernDeckPaperDocument());

      expect(first.equals(second)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });
});
