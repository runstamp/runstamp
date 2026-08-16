import { describe, expect, it } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { validateAndRepairPptx } from "../src/quality/repair.js";
import {
  assertQualityContract,
  mergeDesktopValidationIntoQualityReport,
} from "../src/quality/report.js";
import { validatePptxStructure } from "../src/quality/structuralValidation.js";
import type { ChartData, PaperDocument } from "../src/types/ast.js";
import { buildForcedInvalidRelTargetDeck } from "./desktopValidation/fixtures/forcedInvalidDeck.js";
import { templateMutationDeck } from "./desktopValidation/fixtures/templateMutationDeck.js";

function makeSmallChartDoc(): PaperDocument {
  const chartData: ChartData = {
    chartType: "bar",
    categories: ["Q1", "Q2", "Q3"],
    series: [{ name: "Revenue", values: [10, 20, 30] }],
    legend: { position: "right" },
  };

  return {
    type: "Document",
    meta: { title: "Contract Test" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            chartData,
            style: {
              width: 240,
              height: 100,
              position: "absolute",
              left: 40,
              top: 40,
            },
          },
        ],
      },
    ],
  };
}

describe("Reliability Contract", () => {
  it("preflight surfaces compatibility risk with slide-level guidance", async () => {
    const report = await PaperEngine.preflight(makeSmallChartDoc(), {
      outputMode: "visual_safe",
    });

    expect(report.documentVerdict).toBe("visual_fallback");
    expect(report.fallbackCount).toBe(1);
    expect(report.slideReports[0]?.fallbackApplied?.level).toBe("visual_fallback");
    expect(report.slideReports[0]?.issues.some(
      issue => issue.issueClass === "chart_layout_risk",
    )).toBe(true);
    expect(report.slideReports[0]?.suggestedFix).toMatch(/chart/i);
  });

  it("strict_editable rejects slides that exceed the editable contract", async () => {
    await expect(PaperEngine.render(makeSmallChartDoc(), {
      outputMode: "strict_editable",
    })).rejects.toMatchObject({
      code: "COMPATIBILITY_CONTRACT_VIOLATION",
    });
  });

  it("structural validation passes for a basic supported deck", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Safe Deck" },
      slides: [
        {
          type: "Slide",
          children: [{ type: "Text", content: "Hello quality report" }],
        },
      ],
    };

    const result = await PaperEngine.renderWithQualityReport(doc, undefined, {
      validationMode: "structural",
    });

    expect(result.qualityReport.structuralValidation.status).toBe("passed");

    const standaloneValidation = await validatePptxStructure(result.pptx);
    expect(standaloneValidation.status).toBe("passed");
  });

  it("repairs deterministic structural issues and revalidates", async () => {
    const corrupted = await buildForcedInvalidRelTargetDeck();
    const before = await validatePptxStructure(corrupted);
    expect(before.status).toBe("failed");

    const repaired = await validateAndRepairPptx(corrupted);
    expect(repaired.repairSummary.state).toBe("repaired");
    expect(repaired.repairSummary.actions.some(
      action => action.id === "remove_orphaned_relationships",
    )).toBe(true);
    expect(repaired.finalValidation.status).toBe("passed");
  });

  it("marks unresolved template placeholders as unsafe during preflight", async () => {
    const unsafeTemplateDoc: PaperDocument = {
      ...templateMutationDeck,
      template: templateMutationDeck.template,
      slides: templateMutationDeck.slides.map((slide, slideIndex) => ({
        ...slide,
        children: slide.children.map((child, childIndex) => {
          if (slideIndex === 0 && childIndex === 0) {
            return {
              ...child,
              placeholder: {
                type: "chart",
                idx: 999,
              },
            };
          }
          return { ...child } as typeof child;
        }),
      })),
    };

    const report = await PaperEngine.preflight(unsafeTemplateDoc);
    expect(report.templateReport?.templateSupportLevel).toBe("unsafe");
    expect(report.templateReport?.missingPlaceholderCount).toBeGreaterThan(0);

    await expect(PaperEngine.render(unsafeTemplateDoc)).rejects.toMatchObject({
      code: "COMPATIBILITY_CONTRACT_VIOLATION",
    });
  });

  it("fails fast when desktop validation is requested without an oracle backend", async () => {
    await expect(PaperEngine.preflight(makeSmallChartDoc(), {
      validationMode: "desktop_blocking",
    })).rejects.toMatchObject({
      code: "VALIDATION_BACKEND_UNAVAILABLE",
    });
  });

  it("rejects reports that fail desktop validation after render", async () => {
    const result = await PaperEngine.renderWithQualityReport(makeSmallChartDoc(), undefined, {
      outputMode: "visual_safe",
    });

    const merged = mergeDesktopValidationIntoQualityReport(result.qualityReport, {
      status: "failed",
      available: true,
      backend: "powerpoint_macos",
      platform: "macos",
      failureCount: 1,
      checks: [
        {
          id: "desktop.open",
          passed: false,
          severity: "error",
          message: "PowerPoint desktop open failed for the rendered deck.",
        },
      ],
      details: ["PowerPoint reported a problem opening this presentation."],
    }, {
      validationMode: "desktop_blocking",
      desktopValidationId: "desktop-test-id",
    });

    expect(merged.validationMode).toBe("desktop_blocking");
    expect(merged.desktopValidationId).toBe("desktop-test-id");
    expect(merged.documentVerdict).toBe("rejected");
    expect(merged.contractPassed).toBe(false);

    expect(() => assertQualityContract(merged)).toThrowError(/desktop/i);
  });
});
