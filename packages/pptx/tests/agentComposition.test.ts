import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AgentDocumentSchema, type AgentDocument } from "../src/interpreter/agentSchema.js";
import { compileAgentDocument } from "../src/interpreter/interpreter.js";
import {
  assertAgentCompilationSemantics,
  assertAgentRecipeLayoutUtilization,
} from "../src/interpreter/agent-quality-gates.js";
import {
  isTimelineSequence,
  parseComparisonEntry,
  parseComparisonOwnership,
  parseTimelineEntry,
} from "../src/interpreter/composition-semantics.js";
import { runLayout, type LayoutNode } from "../src/layout/index.js";
import { DEFAULT_SLIDE_HEIGHT_PX } from "../src/ooxml/constants.js";
import type { PaperDocument, PaperNode, PaperText } from "../src/types/ast.js";
import { resolveLineHeightPixels } from "../src/typography/lineHeight.js";
import { isChartTitleEcho } from "../src/interpreter/templates.js";

const CORPUS_CASES = [
  "pptx-board-strategy-update",
  "pptx-earnings-q3-saas-highlights",
  "pptx-proposal-enterprise-software",
  "pptx-board-fy2027-budget-approval",
  "pptx-board-enterprise-risk-review",
] as const;

const ICP_PPTX_CASES = (() => {
  const manifestPath = fileURLToPath(new URL(
    "../../../ga/evals/vqh/icp-corpus/manifest.json",
    import.meta.url,
  ));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    version: number;
    documents: Array<{ caseId: string; format: string }>;
  };
  if (manifest.version !== 3) throw new Error("Agent composition tests require ICP corpus v3");
  return manifest.documents
    .filter((document) => document.format === "pptx")
    .map((document) => document.caseId);
})();

const PEDIATRIC_CARE_FIXTURE: AgentDocument = {
  presentationTitle: "Pediatric access huddle",
  theme: "editorial-wide",
  slides: [{
    pattern: "dashboard",
    content: {
      title: "Specialty access is recovering",
      subtitle: "Rolling 30-day operational view",
      kpis: [
        { label: "Median wait", value: "11 days", sublabel: "Down from 18 days" },
        { label: "Referral triage", value: "On track", sublabel: "All clinics within SLA" },
        { label: "Slots released", value: "264", sublabel: "Across five specialties" },
      ],
    },
  }],
};

const WATERSHED_FIXTURE: AgentDocument = {
  presentationTitle: "Watershed field plan",
  theme: "monochrome",
  slides: [{
    pattern: "bullets",
    content: {
      title: "Restoration sequence follows the seasonal access window",
      subtitle: "Source-ordered field register",
      bulletPoints: [
        "Survey spawning habitat before equipment mobilization",
        "Stabilize the north bank with locally sourced woody debris",
        "Replace the undersized culvert after the spring runoff",
        "Replant shaded reaches with native willow and alder",
        "Monitor turbidity during every in-channel work shift",
        "Publish the autumn habitat and survival observations",
      ],
    },
  }],
};

const POLAR_FIELDWORK_FIXTURE: AgentDocument = {
  presentationTitle: "Polar fieldwork runway",
  theme: "monochrome",
  slides: [{
    pattern: "bullets",
    content: {
      title: "The sampling window follows seasonal ice access",
      subtitle: "Source-authored dates and phases",
      bulletPoints: [
        "Aug 2028 — Calibrate the salinity and depth instruments",
        "Sep 2028 — Position the coastal monitoring stations",
        "Phase 3 — Complete the under-ice transects",
        "Q4 2028 — Publish the validated observation package",
      ],
    },
  }],
};

const LIBRARY_SERVICE_FIXTURE: AgentDocument = {
  presentationTitle: "Library service comparison",
  theme: "editorial-serif",
  slides: [{
    pattern: "comparison",
    content: {
      title: "The new service model shortens every handoff",
      subtitle: "Left: the current request path. Right: the proposed staffed service.",
      bulletPoints: [
        "Requests wait for a weekly inbox review — versus requests route to an on-duty specialist",
        "Patrons repeat context at each handoff — versus one case record follows the request",
        "Escalations have no response clock — versus named owners work to published service levels",
      ],
    },
  }],
};

function collectNodes(roots: readonly PaperNode[]): PaperNode[] {
  const result: PaperNode[] = [];
  const pending = [...roots];
  while (pending.length > 0) {
    const node = pending.pop() as PaperNode;
    result.push(node);
    if ("children" in node && node.children) pending.push(...node.children);
  }
  return result;
}

function compiledStrings(document: PaperDocument): Set<string> {
  return new Set(document.slides.flatMap((slide) => collectNodes(slide.children))
    .filter((node): node is PaperText => node.type === "Text" && node.content !== undefined)
    .flatMap((node) => {
      const text = typeof node.content === "string"
        ? node.content
        : node.content.map((run) => run.text).join("");
      return text.split("\n");
    }));
}

function sourceStrings(source: AgentDocument): string[] {
  return source.slides.flatMap((slide) => {
    const content = slide.content;
    const ownership = slide.pattern === "comparison"
      ? parseComparisonOwnership(content.subtitle)
      : undefined;
    const subtitleFragments = ownership
      ? [ownership.left, ownership.right]
      : [content.subtitle];
    const bulletFragments = (content.bulletPoints ?? []).flatMap((entry) => {
      const timeline = isTimelineSequence(content.bulletPoints ?? [])
        ? parseTimelineEntry(entry)
        : undefined;
      if (timeline) return [timeline.prefix, timeline.body.trimStart()];
      const comparison = ownership ? parseComparisonEntry(entry) : undefined;
      return comparison ? [comparison.left, comparison.right] : [entry];
    });
    return [
      content.title,
      ...subtitleFragments,
      ...(content.prose ?? []),
      ...bulletFragments,
      ...(content.comparison
        ? [
            content.comparison.leftLabel,
            content.comparison.rightLabel,
            ...content.comparison.rows.flatMap((row) => [row.left, row.right]),
          ]
        : []),
      ...(content.kpis ?? []).flatMap((kpi) => [kpi.label, kpi.value, kpi.sublabel]),
    ].filter((value): value is string => typeof value === "string");
  });
}

function findLayoutNodes(root: LayoutNode, predicate: (node: LayoutNode) => boolean): LayoutNode[] {
  const result: LayoutNode[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop() as LayoutNode;
    if (predicate(node)) result.push(node);
    pending.push(...(node.children ?? []));
  }
  return result;
}

describe("N4 production composition", () => {
  it.each(ICP_PPTX_CASES)("keeps ICP v3 warning-free in strict mode: %s", (caseId) => {
    const sourcePath = fileURLToPath(new URL(`../../../tools/visual-regression/corpus/${caseId}.json`, import.meta.url));
    const wrapper = JSON.parse(readFileSync(sourcePath, "utf8"));
    expect(() => compileAgentDocument(wrapper.document, { layoutValidation: "error" })).not.toThrow();
  });

  it.each(CORPUS_CASES)("preserves and validates every slide in %s", async (caseId) => {
    const sourcePath = fileURLToPath(new URL(`../../../tools/visual-regression/corpus/${caseId}.json`, import.meta.url));
    const wrapper = JSON.parse(readFileSync(sourcePath, "utf8"));
    const source = AgentDocumentSchema.parse(wrapper.document);
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect(() => compileAgentDocument(source, { layoutValidation: "error" })).not.toThrow();
    expect(compiled.slides).toHaveLength(source.slides.length);
    expect([...new Set(sourceStrings(source))].every((fact) => compiledStrings(compiled).has(fact))).toBe(true);
    source.slides.forEach((slide, slideIndex) => {
      if (!slide.content.chart) return;
      const chart = collectNodes(compiled.slides[slideIndex].children).find((node) => node.type === "Chart");
      expect(chart?.type).toBe("Chart");
      if (chart?.type !== "Chart") return;
      expect(chart.chartData.chartType).toBe(slide.content.chart.type);
      const titleEcho = [slide.content.title, slide.content.subtitle]
        .some((title) => isChartTitleEcho(slide.content.chart!.title ?? "", title));
      expect(chart.chartData.title?.text).toBe(titleEcho ? undefined : slide.content.chart.title);
      expect(chart.chartData.series.map((series) => series.name))
        .toEqual(slide.content.chart.series.map((series) => series.name));
      expect(chart.chartData.series.map((series) => series.values))
        .toEqual(slide.content.chart.series.map((series) => series.dataPoints.map((point) => point.value)));
    });
    assertAgentCompilationSemantics(source, compiled);
    for (const slide of compiled.slides) {
      const layout = await runLayout(slide);
      expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX)).not.toThrow();
    }
  });

  it.each([
    ["pediatric care", PEDIATRIC_CARE_FIXTURE],
    ["watershed restoration", WATERSHED_FIXTURE],
    ["polar fieldwork", POLAR_FIELDWORK_FIXTURE],
    ["library services", LIBRARY_SERVICE_FIXTURE],
  ] as const)("generalizes beyond the ICP corpus: %s", async (_domain, source) => {
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect([...new Set(sourceStrings(source))].every((fact) => compiledStrings(compiled).has(fact))).toBe(true);
    const layout = await runLayout(compiled.slides[0]);
    expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX)).not.toThrow();
    const meaningful = findLayoutNodes(layout, (node) => node.type === "Text" || node.type === "Chart");
    expect(Math.max(...meaningful.map((node) => node.layout.y + node.layout.height)))
      .toBeGreaterThan(DEFAULT_SLIDE_HEIGHT_PX * 0.72);
  });

  it("treats qualitative KPI values as left-aligned statements", () => {
    const source = AgentDocumentSchema.parse(PEDIATRIC_CARE_FIXTURE);
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    const qualitative = collectNodes(compiled.slides[0].children).find(
      (node) => node.type === "Text" && node.content === "On track",
    );
    expect(qualitative?.style?.textAlign).toBe("left");
    if (qualitative?.type === "Text") qualitative.style = { ...qualitative.style, textAlign: "center" };
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/left-aligned statement/);
  });

  it("does not render qualitative KPI values as numeric-card artifacts", () => {
    const source = AgentDocumentSchema.parse(PEDIATRIC_CARE_FIXTURE);
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    const nodes = collectNodes(compiled.slides[0].children);
    const qualitative = nodes.find((node) => node.type === "Text" && node.content === "On track");
    expect(qualitative?.style?.fontSize).toBeLessThanOrEqual(30);
    expect(nodes.some((node) => (
      node.type === "View"
      && node.style?.width === 4
      && node.style?.backgroundColor !== undefined
    ))).toBe(false);
  });

  it("uses a source-owned closing row for odd two-column bullet registers", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Seven-point review",
      companyName: "Example Company",
      slides: [{
        pattern: "bullets",
        content: {
          title: "Seven decisions",
          bulletPoints: Array.from({ length: 7 }, (_, index) => `Decision ${index + 1}`),
        },
      }],
    });
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    const nodes = collectNodes(compiled.slides[0].children);
    expect(nodes.some((node) => node.altText === "Agent register deliberate empty field")).toBe(false);
    expect(nodes.filter((node) => node.type === "Text" && typeof node.content === "string" && node.content.startsWith("Decision "))).toHaveLength(7);
  });

  it("anchors title slides with a source-owned identity field", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Annual plan",
      companyName: "Example Company",
      slides: [{ pattern: "title", content: { title: "FY2027 Annual Plan", subtitle: "Board briefing" } }],
    });
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    const nodes = collectNodes(compiled.slides[0].children);
    expect(nodes.some((node) => node.altText === "Agent title source-owned identity field")).toBe(true);
    expect(nodes.some((node) => node.altText === "Agent title horizon rule")).toBe(true);
    expect(nodes.some((node) => node.type === "Text" && node.content === "Example Company")).toBe(true);
  });

  it("rejects a timid chart field", async () => {
    const source: AgentDocument = {
      presentationTitle: "Port dwell-time evidence",
      slides: [{
        pattern: "chart-focus",
        content: {
          title: "Berth dwell time is falling",
          chart: { type: "line", series: [{ name: "Hours", dataPoints: [{ category: "May", value: 31 }, { category: "June", value: 24 }] }] },
        },
      }],
    };
    const layout = await runLayout(compileAgentDocument(source, { layoutValidation: "off" }).slides[0]);
    const chart = findLayoutNodes(layout, (node) => node.type === "Chart")[0];
    chart.layout.width = 480;
    chart.layout.height = 280;
    expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX)).toThrow(/timid visual field/);
  });

  it("rejects a repeated equal-panel dashboard", async () => {
    const source = compileAgentDocument(PEDIATRIC_CARE_FIXTURE, { layoutValidation: "off" }).slides[0];
    const layout = await runLayout(source);
    layout.children = Array.from({ length: 4 }, (_, index) => ({
      type: "View" as const,
      style: { backgroundColor: "#FFFFFF" },
      layout: { x: 60 + (index % 2) * 320, y: 150 + Math.floor(index / 2) * 220, width: 300, height: 200 },
      children: [{
        type: "Text" as const,
        content: `Panel ${index + 1}`,
        layout: { x: 96, y: 176, width: 220, height: 30 },
      }],
    }));
    expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX)).toThrow(/equal-weight decorated panels/);
  });

  it("rejects text escaping a register row", async () => {
    const layout = await runLayout(compileAgentDocument(WATERSHED_FIXTURE, { layoutValidation: "off" }).slides[0]);
    const row = findLayoutNodes(layout, (node) => node.type === "View" && node.children?.some(
      (child) => child.type === "Text" && child.content === "01",
    ) === true)[0];
    const entry = row.children?.find((child) => child.type === "Text" && child.content !== "01");
    if (entry) entry.layout.y = row.layout.y + row.layout.height + 5;
    expect(() => assertAgentRecipeLayoutUtilization(layout, DEFAULT_SLIDE_HEIGHT_PX)).toThrow(/exceeds its assigned row/);
  });

  it("classifies date/month/phase-prefixed bullets as a runway and rejects the generic-list negative control", () => {
    const source = AgentDocumentSchema.parse(POLAR_FIELDWORK_FIXTURE);
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect(() => assertAgentCompilationSemantics(source, compiled)).not.toThrow();
    const milestone = collectNodes(compiled.slides[0].children).find(
      (node) => node.type === "View" && node.altText === "Agent timeline milestone",
    );
    expect(milestone).toBeDefined();
    if (milestone?.type === "View") milestone.altText = undefined;
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/source-ordered runway/);
  });

  it("creates source-owned comparison fields and rejects an unowned negative control", () => {
    const source = AgentDocumentSchema.parse(LIBRARY_SERVICE_FIXTURE);
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect(() => assertAgentCompilationSemantics(source, compiled)).not.toThrow();
    const right = collectNodes(compiled.slides[0].children).find(
      (node) => node.type === "View" && node.altText === "Agent comparison owned field: right",
    );
    expect(right).toBeDefined();
    if (right?.type === "View") right.altText = undefined;
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/two owned source fields/);
  });

  it("promotes verbatim register anchors and rejects a flattened-anchor negative control", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Civic works register",
      slides: [{
        pattern: "bullets",
        content: {
          title: "Delivery constraints are explicit",
          bulletPoints: [
            "Permitting: public notice closes on 18 March",
            "$4.2M — construction allowance held in the approved envelope",
            "Access plan: weekend closures remain subject to traffic review",
          ],
        },
      }],
    });
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect(() => assertAgentCompilationSemantics(source, compiled)).not.toThrow();
    const anchored = collectNodes(compiled.slides[0].children).find((node) => (
      node.type === "Text"
      && Array.isArray(node.content)
      && node.content.map((run) => run.text).join("") === source.slides[0].content.bulletPoints?.[0]
    ));
    expect(anchored?.type).toBe("Text");
    if (anchored?.type === "Text" && Array.isArray(anchored.content)) {
      anchored.content[0].style = { ...anchored.content[0].style, fontWeight: "normal" };
    }
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/promoted verbatim/);
  });

  it("keeps statement evidence at projection scale and rejects a micro-text negative control", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Decision brief",
      slides: [{
        pattern: "statement",
        content: {
          title: "Approve the maintenance window.",
          prose: ["The window protects the only available commissioning sequence."],
        },
      }],
    });
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect(() => assertAgentCompilationSemantics(source, compiled)).not.toThrow();
    const evidence = collectNodes(compiled.slides[0].children).find(
      (node) => node.type === "Text" && node.content === source.slides[0].content.prose?.[0],
    );
    if (evidence?.type === "Text") evidence.style = { ...evidence.style, fontSize: 11 };
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/18pt composition floor/);
  });

  it("keeps chart evidence labels and line markers legible and rejects a timid negative control", () => {
    const source = AgentDocumentSchema.parse({
      presentationTitle: "Migration evidence",
      slides: [{
        pattern: "chart-focus",
        content: {
          title: "Migration throughput is rising",
          chart: {
            type: "line",
            series: [{ name: "Records", dataPoints: [{ category: "Week 1", value: 12 }, { category: "Week 2", value: 19 }] }],
          },
        },
      }],
    });
    const compiled = compileAgentDocument(source, { layoutValidation: "off" });
    expect(() => assertAgentCompilationSemantics(source, compiled)).not.toThrow();
    const chart = collectNodes(compiled.slides[0].children).find((node) => node.type === "Chart");
    if (chart?.type === "Chart" && chart.chartData.legend) chart.chartData.legend.fontSize = 9;
    expect(() => assertAgentCompilationSemantics(source, compiled)).toThrow(/timid labels or line emphasis/);
  });

  it("keeps multiplier line height consistent with OOXML semantics", () => {
    expect(resolveLineHeightPixels(1.35, 20, 24)).toBeCloseTo(27, 5);
    expect(resolveLineHeightPixels(30, 20, 24)).toBe(30);
    expect(resolveLineHeightPixels(undefined, 20, 24)).toBe(24);
  });
});
