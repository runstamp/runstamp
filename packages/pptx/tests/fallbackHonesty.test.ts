import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartData, PaperDocument } from "../src/types/ast.js";

function makeDenseVisualFallbackDoc(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Visual fallback honesty" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "View",
            style: {
              position: "absolute",
              left: 40,
              top: 40,
              width: 520,
              height: 240,
              backgroundColor: "#F4F6F8",
              borderWidth: 1,
              borderColor: "#C8CED6",
            },
            children: [
              ...Array.from({ length: 4 }, (_, index) => ({
                type: "Text" as const,
                content: `Dense card line ${index + 1}`,
                style: {
                  position: "absolute" as const,
                  left: 24,
                  top: 24 + index * 44,
                  width: 420,
                  height: 30,
                  fontSize: 18,
                },
              })),
              {
                type: "View",
                style: {
                  position: "absolute",
                  left: 455,
                  top: 24,
                  width: 36,
                  height: 168,
                  backgroundColor: "#2E6BD9",
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeChartFallbackDoc(): PaperDocument {
  const chartData: ChartData = {
    chartType: "bar",
    categories: ["Q1", "Q2", "Q3"],
    series: [{ name: "Revenue", values: [100, 130, 160] }],
  };

  return {
    type: "Document",
    meta: { title: "Chart fallback honesty" },
    chartFallbackImages: true,
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            chartData,
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 420,
              height: 260,
            },
          },
        ],
      },
    ],
  };
}

function makeRiskyVisualSafeChartDoc(): PaperDocument {
  const chartData: ChartData = {
    chartType: "line",
    categories: ["Jan", "Feb", "Mar"],
    series: [{ name: "Sales", values: [10, 12, 9] }],
    legend: { position: "right" },
  };

  return {
    type: "Document",
    meta: { title: "Visual fallback mode contract" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            chartData,
            style: {
              position: "absolute",
              left: 40,
              top: 40,
              width: 320,
              height: 90,
            },
          },
        ],
      },
    ],
  };
}

async function importEngineWithRendererFailure() {
  vi.resetModules();
  vi.doMock("../src/renderer/index.js", async () => {
    const actual = await vi.importActual<typeof import("../src/renderer/index.js")>(
      "../src/renderer/index.js",
    );
    return {
      ...actual,
      renderSlideToBuffer: vi.fn().mockResolvedValue(undefined),
    };
  });
  return import("../src/engine.js");
}

async function importEngineWithChartRasterizerFailure() {
  vi.resetModules();
  vi.doMock("../src/ooxml/chart/rasterizer.js", async () => {
    const actual = await vi.importActual<typeof import("../src/ooxml/chart/rasterizer.js")>(
      "../src/ooxml/chart/rasterizer.js",
    );
    return {
      ...actual,
      rasterizeChart: vi.fn().mockResolvedValue(undefined),
    };
  });
  return import("../src/engine.js");
}

afterEach(() => {
  vi.doUnmock("../src/renderer/index.js");
  vi.doUnmock("../src/ooxml/chart/rasterizer.js");
  vi.resetModules();
});

describe("fallback honesty", () => {
  it("blocks visual_fallback slides when no full-slide image artifact is produced", async () => {
    const { PaperEngine } = await importEngineWithRendererFailure();

    await expect(PaperEngine.render(makeDenseVisualFallbackDoc(), {
      outputMode: "visual_safe",
    })).rejects.toMatchObject({
      code: "PPTX_VISUAL_FALLBACK_MISSING",
      phase: "rendering",
      slideIndex: 0,
    });
  });

  it("blocks chart fallback mode when no chart fallback image artifact is produced", async () => {
    const { PaperEngine } = await importEngineWithChartRasterizerFailure();

    await expect(PaperEngine.render(makeChartFallbackDoc(), {
      outputMode: "visual_safe",
    })).rejects.toMatchObject({
      code: "PPTX_CHART_FALLBACK_MISSING",
      phase: "chart",
    });
  });

  it("preflight makes visual fallback compatibility explicit by output mode", async () => {
    vi.resetModules();
    const { PaperEngine } = await import("../src/engine.js");

    const strict = await PaperEngine.preflight(makeRiskyVisualSafeChartDoc(), {
      outputMode: "strict_editable",
    });
    const editablePreferred = await PaperEngine.preflight(makeRiskyVisualSafeChartDoc(), {
      outputMode: "editable_preferred",
    });
    const visualSafe = await PaperEngine.preflight(makeRiskyVisualSafeChartDoc(), {
      outputMode: "visual_safe",
    });

    expect(strict.documentVerdict).toBe("rejected");
    expect(editablePreferred.documentVerdict).toBe("rejected");
    expect(visualSafe.documentVerdict).toBe("visual_fallback");
  });
});
