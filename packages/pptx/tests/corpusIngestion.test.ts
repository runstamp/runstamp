import { describe, expect, it } from "vitest";
import {
  anonymizeCorpusDocument,
  anonymizeCorpusValue,
  classifyFailureFamilies,
} from "../src/quality/corpus.js";
import type { PaperDocument } from "../src/types/ast.js";

describe("Failure Corpus Ingestion Helpers", () => {
  it("anonymizes freeform content while preserving structure", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Secret Project 2026" },
      slides: [
        {
          type: "Slide",
          notes: "CEO talking points",
          children: [
            {
              type: "Text",
              content: "Revenue grew 123% in Seoul",
            },
            {
              type: "Image",
              src: "https://runstamp.com/assets/customer-logo.png",
            },
          ],
        },
      ],
    };

    const anonymized = anonymizeCorpusDocument(doc).document as Record<string, unknown>;
    const meta = anonymized.meta as Record<string, unknown>;
    const slides = anonymized.slides as Array<Record<string, unknown>>;
    const firstSlide = slides[0];
    const firstText = (firstSlide.children as Array<Record<string, unknown>>)[0];
    const firstImage = (firstSlide.children as Array<Record<string, unknown>>)[1];

    expect(meta.title).toBe("Xxxxxx Xxxxxxx 0000");
    expect(firstSlide.notes).toBe("XXX xxxxxxx xxxxxx");
    expect(firstText.content).toBe("Xxxxxxx xxxx 000% xx Xxxxx");
    expect(firstImage.src).toBe("https://redacted.invalid/asset");
  });

  it("handles malformed raw input anonymization without crashing", () => {
    const raw = {
      title: "Private Notes",
      nested: [{ text: "Call customer Jane Doe" }],
    };

    const anonymized = anonymizeCorpusValue(raw).document as Record<string, unknown>;
    expect(anonymized.title).toBe("Xxxxxxx Xxxxx");
    expect((anonymized.nested as Array<Record<string, unknown>>)[0].text).toBe("Xxxx xxxxxxxx Xxxx Xxx");
  });

  it("classifies high-risk fixtures into the right failure families", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Classifier" },
      template: Buffer.from("fake"),
      slides: [
        {
          type: "Slide",
          notes: "Long narrative",
          children: [
            {
              type: "Text",
              content: "x".repeat(400),
              style: { fontFamily: "Arial" },
            },
            {
              type: "Chart",
              chartData: {
                chartType: "treemap",
                categories: ["A"],
                series: [{ name: "S1", values: [1] }],
              },
            },
            {
              type: "Table",
              tableData: {
                rows: [
                  {
                    cells: [{ text: "A" }],
                  },
                ],
              },
            },
            {
              type: "Image",
              src: "data:image/png;base64,ABC",
            },
          ],
        },
      ],
    };

    const families = classifyFailureFamilies(doc, {
      requestedOutputMode: "editable_preferred",
      validationMode: "none",
      maxFallbackLevel: "native_anchored",
      documentVerdict: "editable_with_constraints",
      repairRisk: "medium",
      editabilityScore: 75,
      fallbackCount: 1,
      slideReports: [
        {
          slideIndex: 0,
          compatibilityVerdict: "native_anchored",
          issues: [
            {
              code: "font-risk",
              message: "Font substitution likely",
              severity: "warning",
              issueClass: "font_substitution_risk",
            },
            {
              code: "chart-risk",
              message: "Chart layout risk",
              severity: "warning",
              issueClass: "chart_layout_risk",
            },
          ],
          fallbackApplied: { level: "native_anchored" },
          editabilityVerdict: "editable_with_constraints",
          fonts: ["Arial", "Aptos", "Georgia"],
          fontSubstitutions: {},
        },
      ],
      structuralValidation: {
        status: "not_run",
        checks: [],
        failureCount: 0,
      },
      repairSummary: { state: "not_requested", actions: [] },
      templateReport: {
        templateSupportLevel: "unsafe",
        unsafeLayouts: ["TITLE_AND_CONTENT"],
        placeholderCoverage: 0.5,
        expectedFallbackRisk: "high",
        missingPlaceholderCount: 1,
      },
      contractPassed: false,
    }, "Validation failed");

    expect(families).toEqual(expect.arrayContaining([
      "long_text",
      "tables",
      "chartex",
      "template_mutation",
      "media",
      "comments_notes",
      "chart_layout",
      "font_substitution",
      "template_placeholder",
    ]));
  });
});
