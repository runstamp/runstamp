import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { analyzeDocumentCompatibility } from "../src/compatibility/pptxCompatibility.js";
import { buildQualityReport } from "../src/quality/report.js";
import { repairPptxStructure, validateAndRepairPptx } from "../src/quality/repair.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("PaperEngine.preflight quality pipeline", () => {
  it("runs the render-quality path and returns repair metadata fields", async () => {
    const document = {
      type: "Document" as const,
      meta: { title: "Preflight Quality" },
      slides: [
        {
          type: "Slide" as const,
          children: [{ type: "Text" as const, content: "Preflight" }],
        },
      ],
    };
    const report = await PaperEngine.preflight(document);

    expect(report.verdict).toMatch(/native_editable|editable_with_constraints|visual_fallback|rejected/);
    expect(Array.isArray(report.repairLog)).toBe(true);
    expect(report.autoFixesApplied).toBeGreaterThanOrEqual(0);
  });

  it("maps duplicate slide ids into specific PPTX shared findings", async () => {
    const document = {
      type: "Document" as const,
      meta: { title: "Duplicate Slide IDs" },
      slides: [
        { type: "Slide" as const, children: [{ type: "Text" as const, content: "Slide 1" }] },
        { type: "Slide" as const, children: [{ type: "Text" as const, content: "Slide 2" }] },
      ],
    };
    const buffer = await PaperEngine.render(document);
    const zip = await JSZip.loadAsync(buffer);
    const presentationXml = await zip.file("ppt/presentation.xml")!.async("string");
    const ids = Array.from(presentationXml.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"/g));
    const firstId = ids[0]?.[1];
    const secondId = ids[1]?.[1];
    if (!firstId || !secondId) {
      throw new Error("Expected two slide ids in presentation.xml");
    }
    zip.file("ppt/presentation.xml", presentationXml.replace(`id="${secondId}"`, `id="${firstId}"`));

    const repaired = await validateAndRepairPptx(await zip.generateAsync({ type: "nodebuffer" }));
    const compatibility = await analyzeDocumentCompatibility(document);
    const report = buildQualityReport(compatibility, { validationMode: "structural", repairMode: "structural" }, {
      structuralValidation: repaired.initialValidation,
      repairSummary: repaired.repairSummary,
    });

    expect(report.findings.some((finding) => finding.sharedCode === "PPTX_SLIDE_ID_NOT_UNIQUE")).toBe(true);
    expect(report.repairLog.some((entry) => entry.finding === "PPTX_SLIDE_ID_NOT_UNIQUE")).toBe(true);
  });

  it("repairs identical bytes identically under different clocks", async () => {
    const document = {
      type: "Document" as const,
      meta: { title: "Deterministic repair" },
      slides: [
        { type: "Slide" as const, children: [{ type: "Text" as const, content: "Slide 1" }] },
        { type: "Slide" as const, children: [{ type: "Text" as const, content: "Slide 2" }] },
      ],
    };
    const rendered = await PaperEngine.render(document);
    const unchanged = await repairPptxStructure(rendered);
    expect(unchanged.actions).toEqual([]);
    expect(unchanged.buffer.equals(rendered)).toBe(true);

    const zip = await JSZip.loadAsync(rendered);
    const presentation = zip.file("ppt/presentation.xml")!;
    const presentationXml = await presentation.async("string");
    const ids = Array.from(presentationXml.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"/g));
    const firstId = ids[0]?.[1];
    const secondId = ids[1]?.[1];
    if (!firstId || !secondId) throw new Error("Expected two slide ids in presentation.xml");
    zip.file(
      "ppt/presentation.xml",
      presentationXml.replace(`id="${secondId}"`, `id="${firstId}"`),
      { date: presentation.date },
    );
    const input = await zip.generateAsync({ type: "nodebuffer" });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-13T00:00:00.000Z"));
    const first = await repairPptxStructure(input);
    vi.setSystemTime(new Date("2026-08-13T00:00:04.000Z"));
    const second = await repairPptxStructure(input);

    expect(first.actions.some((action) => action.id === "dedupe_slide_ids")).toBe(true);
    expect(second.actions).toEqual(first.actions);
    expect(second.buffer.equals(first.buffer)).toBe(true);
  });

  it("does not force legacy compatibility findings into unrelated shared codes", () => {
    const report = buildQualityReport({
      compatibilityVerdict: "native_anchored",
      fontSubstitutions: {},
      slides: [{
        slideIndex: 0,
        compatibilityVerdict: "native_anchored",
        fallbackReason: "Template placeholders are missing",
        fonts: [],
        fontSubstitutions: {},
        issues: [{
          code: "TPL-001",
          message: "Template placeholder mapping is incomplete.",
          severity: "warning",
          issueClass: "template_placeholder_risk",
        }],
      }],
    });

    const finding = report.findings.find((entry) => entry.code === "BRAND_TOKEN_MISSING");
    expect(finding).toBeDefined();
    expect(finding?.sharedCode).toBeUndefined();
    expect(finding?.autoFixed).toBe(false);
  });
});
