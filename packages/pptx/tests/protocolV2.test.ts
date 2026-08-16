import { describe, expect, it } from "vitest";
import { PresentationSpecSchema } from "@runstamp/protocol";
import { compilePresentationSpec } from "../src/protocol/compiler.js";

describe("protocol_v2 schema and compiler", () => {
  it("validates and compiles the supported slide types", () => {
    const spec = PresentationSpecSchema.parse({
      version: "2.0",
      title: "Protocol deck",
      accentColor: "#2563EB",
      slides: [
        {
          slideType: "title-body",
          title: "Opening",
          body: ["One", "Two"],
        },
        {
          slideType: "kpi-grid",
          title: "Snapshot",
          items: [
            { label: "ARR", value: "$10M", trend: "up" },
            { label: "NRR", value: "118%", trend: "up" },
          ],
        },
        {
          slideType: "comparison-table",
          title: "Options",
          columns: ["Current", "Target"],
          rows: [{ label: "Cycle", values: ["90d", "45d"] }],
        },
        {
          slideType: "market-map",
          title: "Landscape",
          companies: [
            { name: "Us", x: 70, y: 82, emphasis: "primary" },
            { name: "Peer", x: 42, y: 50 },
          ],
        },
        {
          slideType: "timeline",
          title: "Roadmap",
          events: [
            { label: "Discover", date: "Q1" },
            { label: "Launch", date: "Q2" },
          ],
        },
        {
          slideType: "org-chart",
          title: "Team",
          nodes: [
            { id: "ceo", label: "CEO" },
            { id: "ops", label: "Ops", parentId: "ceo" },
          ],
        },
        {
          slideType: "waterfall",
          title: "Bridge",
          entries: [
            { label: "Start", value: 100, type: "total" },
            { label: "Expansion", value: 20, type: "increase" },
            { label: "End", value: 120, type: "total" },
          ],
        },
        {
          slideType: "tombstone-grid",
          title: "Comparables",
          items: [
            { name: "Acme", subtitle: "Series C", metrics: ["ARR $20M"] },
            { name: "Nova", subtitle: "Public", metrics: ["EV / Rev 8.2x"] },
          ],
        },
      ],
    });

    const doc = compilePresentationSpec(spec, {
      archetypeLayoutMap: {
        "title-body": "Title Layout",
        "kpi-grid": "KPI Dashboard",
      },
    });

    expect(doc.meta.title).toBe("Protocol deck");
    expect(doc.slides).toHaveLength(8);
    expect(doc.slides[0]?.layoutName).toBe("Title Layout");
    expect(doc.slides[1]?.layoutName).toBe("KPI Dashboard");
    expect(doc.slides[6]?.children.some((node) => node.type === "Chart")).toBe(true);
  });
});
