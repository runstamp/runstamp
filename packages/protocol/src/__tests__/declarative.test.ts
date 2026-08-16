import { describe, expect, it } from "vitest";
import {
  DeclarativeDocumentSchema,
  toPresentationSpec,
  validate,
} from "../index.js";

const allLayoutsDocument = {
  title: "Q3 Board Review",
  slides: [
    { layout: "title", title: "Q3 Board Review", subtitle: "October 2026" },
    {
      layout: "kpi-row",
      title: "Operating metrics",
      metrics: [
        { label: "ARR", value: "$4.2M", delta: "+18%" },
        { label: "NRR", value: "112%", delta: "+4pt" },
      ],
    },
    {
      layout: "chart",
      title: "Revenue by quarter",
      chart: {
        kind: "bar",
        series: [
          {
            name: "Revenue",
            dataPoints: [
              { category: "Q1", value: 1.8 },
              { category: "Q2", value: 2.4 },
              { category: "Q3", value: 3.1 },
            ],
          },
        ],
      },
    },
    { layout: "bullets", title: "What changed", bullets: ["Enterprise expansion accelerated.", "Churn remained below plan."] },
    {
      layout: "comparison",
      title: "Plan comparison",
      columns: ["Dimension", "Plan", "Actual"],
      rows: [{ label: "ARR", values: ["$4.0M", "$4.2M"], highlight: true }],
    },
    {
      layout: "timeline",
      title: "Next milestones",
      events: [
        { date: "Oct", label: "Planning", description: "Lock operating plan" },
        { date: "Nov", label: "Launch", description: "Release enterprise tier" },
      ],
    },
  ],
} as const;

describe("declarative authoring facade", () => {
  it("accepts and normalizes every named layout to PresentationSpec", () => {
    expect(DeclarativeDocumentSchema.safeParse(allLayoutsDocument).success).toBe(true);
    expect(validate(allLayoutsDocument)).toEqual({ ok: true, issues: [] });

    const protocol = toPresentationSpec(DeclarativeDocumentSchema.parse(allLayoutsDocument));
    expect(protocol.slides.map((slide) => slide.slideType)).toEqual([
      "composition",
      "kpi-grid",
      "composition",
      "title-body",
      "comparison-table",
      "timeline",
    ]);
  });

  it("does not expose coordinate fields in the declarative contract", () => {
    const result = validate({
      title: "Unsafe",
      slides: [{ layout: "title", title: "Unsafe", x: 10, y: 20 }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      path: ["slides", 0],
      code: "schema_unrecognized_keys",
      severity: "error",
    }));
    expect(result.issues[0]?.fix).toMatch(/Remove unsupported fields/);
  });

  it("preserves all schema paths and gives every issue an actionable fix", () => {
    const result = validate({
      title: "Broken deck",
      slides: [
        { layout: "kpi-row", metrics: [{ label: "ARR", value: "" }] },
        { layout: "timeline", title: "Roadmap", events: [{ label: "Start" }] },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      ["slides", 0, "metrics", 0, "value"],
      ["slides", 0, "metrics"],
      ["slides", 1, "events"],
    ]));
    expect(result.issues.every((issue) => issue.fix.length > 0)).toBe(true);
  });

  it("rejects chart data that can produce malformed or ambiguous chart XML", () => {
    const result = validate({
      title: "Broken chart",
      slides: [{
        layout: "chart",
        title: "Revenue",
        chart: {
          kind: "pie",
          series: [
            { name: "Plan", dataPoints: [{ category: "Q1", value: 10 }] },
            { name: "Actual", dataPoints: [{ category: "Q2", value: 12 }] },
          ],
        },
      }],
    });

    expect(result).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: ["slides", 0, "chart", "series", 1, "dataPoints"],
          code: "chart_category_mismatch",
          severity: "error",
        }),
        expect.objectContaining({
          path: ["slides", 0, "chart", "series"],
          code: "chart_series_count",
          severity: "error",
        }),
      ]),
    });
  });

  it("rejects chart kinds that are not editable in the free category-series path", () => {
    const result = validate({
      title: "Unsupported chart",
      slides: [{
        layout: "chart",
        title: "Radar",
        chart: {
          kind: "radar",
          series: [{ name: "Score", dataPoints: [{ category: "A", value: 10 }] }],
        },
      }],
    });

    expect(result).toEqual({
      ok: false,
      issues: [expect.objectContaining({
        path: ["slides", 0, "chart", "kind"],
        code: "schema_invalid_value",
        severity: "error",
      })],
    });
  });

});
