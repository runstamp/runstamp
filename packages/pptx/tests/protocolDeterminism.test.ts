// Byte-reproducibility for the protocol → engine path.
//
// `createEngineDeterminism.test.ts` covers the AgentDocument/PaperDocument
// route. This file pins the same invariant for the V2 protocol path
// (compilePresentationSpec → engine.render), because that's the surface
// MCP and external SDK callers actually hit. If a primitive or composition
// dispatcher introduces wall-clock state, random IDs, or insertion-order-
// dependent map iteration, golden-image comparisons in tools/visual-
// regression go silent.
//
// One spec per slide type (8 templates + composition). Each spec is
// rendered twice through a fresh createEngine (matching the production
// MCP server pattern) and the buffers must be byte-equal.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { compilePresentationSpec } from "../src/protocol/compiler.js";
import type { PresentationSpec } from "@runstamp/protocol";

type SlideSpec = PresentationSpec["slides"][number];

const SLIDES: Record<string, SlideSpec> = {
  "title-body": {
    slideType: "title-body",
    title: "Opening",
    body: ["First", "Second"],
    insight: "Net-net it works.",
  },
  "kpi-grid": {
    slideType: "kpi-grid",
    title: "Snapshot",
    items: [
      { label: "ARR", value: "$10M", trend: "up" },
      { label: "NRR", value: "118%", trend: "up" },
      { label: "Churn", value: "1.4%", trend: "down" },
      { label: "Margin", value: "78%", trend: "flat" },
    ],
  },
  "comparison-table": {
    slideType: "comparison-table",
    title: "Options",
    columns: ["Dimension", "Current", "Target"],
    rows: [
      { label: "Cycle", values: ["90d", "45d"] },
      { label: "Cost", values: ["High", "Mid"] },
    ],
  },
  "market-map": {
    slideType: "market-map",
    title: "Landscape",
    companies: [
      { name: "Us", x: 70, y: 82, emphasis: "primary" },
      { name: "Peer", x: 42, y: 50 },
    ],
  },
  timeline: {
    slideType: "timeline",
    title: "Roadmap",
    events: [
      { label: "Discover", date: "Q1" },
      { label: "Launch", date: "Q2" },
    ],
  },
  "org-chart": {
    slideType: "org-chart",
    title: "Team",
    nodes: [
      { id: "ceo", label: "CEO" },
      { id: "ops", label: "Ops", parentId: "ceo" },
      { id: "eng", label: "Eng", parentId: "ceo" },
    ],
  },
  waterfall: {
    slideType: "waterfall",
    title: "Bridge",
    entries: [
      { label: "Start", value: 100, type: "total" },
      { label: "Expansion", value: 20, type: "increase" },
      { label: "Churn", value: -5, type: "decrease" },
      { label: "End", value: 115, type: "total" },
    ],
  },
  "tombstone-grid": {
    slideType: "tombstone-grid",
    title: "Comparables",
    items: [
      { name: "Acme", subtitle: "Series C", metrics: ["ARR $20M"] },
      { name: "Nova", subtitle: "Public", metrics: ["EV / Rev 8.2x"] },
    ],
  },
  composition: {
    slideType: "composition",
    title: "Strategic snapshot",
    blocks: [
      {
        primitive: "titleBlock",
        region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
        input: { title: "Three numbers", eyebrow: "Snapshot" },
      },
      {
        primitive: "kpiHero",
        region: { col: 0, row: 2, colSpan: 6, rowSpan: 6 },
        input: { label: "ARR", value: "$1.8M", delta: "+12% QoQ", trend: "up" },
      },
      {
        primitive: "metricStack",
        region: { col: 6, row: 2, colSpan: 6, rowSpan: 6 },
        input: {
          rows: [
            { label: "Churn", value: "1.4%", delta: "-0.2 pts", trend: "down" },
            { label: "NPS", value: "69", delta: "+4 pts", trend: "up" },
          ],
        },
      },
      {
        primitive: "sourceLine",
        region: { col: 0, row: 11, colSpan: 12, rowSpan: 1 },
        input: { content: "Internal data, Apr 2026.", kind: "source" },
      },
    ],
  },
};

function buildSpec(slide: SlideSpec): PresentationSpec {
  return {
    version: "2.0",
    title: `Determinism — ${slide.slideType}`,
    layoutFamily: "editorial",
    slides: [slide],
  };
}

describe("protocol path byte-reproducibility", () => {
  beforeAll(() => {
    setDeterministicMode(true);
  });

  afterAll(() => {
    setDeterministicMode(false);
  });

  for (const [name, slide] of Object.entries(SLIDES)) {
    it(`renders identical bytes twice for slideType="${name}"`, async () => {
      const engine = createEngine({ mode: "pro" });
      const doc = compilePresentationSpec(buildSpec(slide));
      const a = await engine.render(doc);
      const b = await engine.render(doc);
      expect(
        a.equals(b),
        `slideType="${name}" rendered different bytes on identical input — protocol or engine introduced non-determinism`,
      ).toBe(true);
    }, 60000);
  }

  it("renders identical bytes for a multi-slide deck across all types", async () => {
    const spec: PresentationSpec = {
      version: "2.0",
      title: "Determinism — full deck",
      layoutFamily: "editorial",
      slides: Object.values(SLIDES),
    };
    const engine = createEngine({ mode: "pro" });
    const doc = compilePresentationSpec(spec);
    const a = await engine.render(doc);
    const b = await engine.render(doc);
    expect(a.equals(b)).toBe(true);
  }, 120000);

  it("does not leak wall-clock between renders separated in time", async () => {
    const engine = createEngine({ mode: "pro" });
    const doc = compilePresentationSpec(buildSpec(SLIDES.composition));
    const first = await engine.render(doc);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await engine.render(doc);
    expect(first.equals(second)).toBe(true);
  }, 60000);
});
