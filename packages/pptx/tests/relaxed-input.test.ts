import { describe, expect, it } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { compileAgentDocument } from "../src/interpreter/interpreter.js";
import { preprocessAgentDocumentInput } from "../src/interpreter/relaxed-input.js";

const legacyAgentDocument = {
  type: "Document",
  meta: { title: "Legacy Revenue Deck" },
  slides: [
    {
      pattern: "chartFocus",
      title: "Revenue Overview",
      subtitle: "Legacy shape",
      kpis: [
        { label: "Revenue", value: "$1.2M", delta: "+12%" },
      ],
      chart: {
        type: "scatter",
        categories: ["Q1", "Q2"],
        series: [
          { name: "2026", values: [120, 140] },
        ],
      },
    },
  ],
} as const;

describe("PPTX relaxed input", () => {
  it("keeps strict mode rejecting legacy agent shapes", () => {
    expect(() => compileAgentDocument(legacyAgentDocument)).toThrow();
  });

  it("coerces legacy agent shapes in relaxed mode and records warnings", () => {
    const warnings: Array<{ code: string; path: string }> = [];
    const prepared = preprocessAgentDocumentInput(legacyAgentDocument, {
      relaxed: true,
      onInputWarning: (warning) => warnings.push({ code: warning.code, path: warning.path }),
    });

    const document = compileAgentDocument(legacyAgentDocument, { relaxed: true });

    expect(document.meta?.title).toBe("Legacy Revenue Deck");
    expect(document.slides).toHaveLength(1);
    expect(warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "PPTX_RELAXED_DOCUMENT_TYPE",
      "PPTX_RELAXED_META_TITLE",
      "PPTX_RELAXED_PATTERN_NAME",
      "PPTX_RELAXED_SLIDE_CONTENT",
      "PPTX_RELAXED_KPI_DELTA",
      "PPTX_RELAXED_CHART_POINTS",
      "PPTX_RELAXED_CHART_TYPE",
    ]));

    expect(prepared.value).toMatchObject({
      type: "presentation",
      presentationTitle: "Legacy Revenue Deck",
      slides: [
        {
          pattern: "chart-focus",
          content: {
            kpis: [
              { label: "Revenue", value: "$1.2M", sublabel: "+12%" },
            ],
            chart: {
              type: "line",
              series: [
                {
                  name: "2026",
                  dataPoints: [
                    { category: "Q1", value: 120 },
                    { category: "Q2", value: 140 },
                  ],
                },
              ],
            },
          },
        },
      ],
    });
  });

  it("exposes relaxed parsing through PaperEngine preflight", async () => {
    await expect(PaperEngine.preflight(legacyAgentDocument as any)).rejects.toThrow();

    const warnings: string[] = [];
    const report = await PaperEngine.preflight(legacyAgentDocument as any, {
      relaxed: true,
      onInputWarning: (warning) => warnings.push(warning.code),
    });

    expect(report.verdict).toBeDefined();
    expect(warnings).toEqual(expect.arrayContaining([
      "PPTX_RELAXED_DOCUMENT_TYPE",
      "PPTX_RELAXED_PATTERN_NAME",
    ]));
  });

  it("promotes flat explicit comparison data into slide content", () => {
    const prepared = preprocessAgentDocumentInput({
      presentationTitle: "Operating model",
      slides: [{
        pattern: "comparison",
        title: "Today and target",
        comparison: {
          leftLabel: "Today",
          rightLabel: "Target",
          rows: [{ left: "Manual intake", right: "Policy-driven routing" }],
        },
      }],
    }, { relaxed: true });

    expect(prepared.value).toMatchObject({
      slides: [{
        content: {
          comparison: {
            leftLabel: "Today",
            rightLabel: "Target",
            rows: [{ left: "Manual intake", right: "Policy-driven routing" }],
          },
        },
      }],
    });
    expect(() => compileAgentDocument(prepared.value, { layoutValidation: "error" })).not.toThrow();
  });
});
