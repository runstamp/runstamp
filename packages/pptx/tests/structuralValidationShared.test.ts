import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { analyzeDocumentCompatibility } from "../src/compatibility/pptxCompatibility.js";
import { buildQualityReport } from "../src/quality/report.js";
import { validatePptxStructure } from "../src/quality/structuralValidation.js";
import { validateStructure } from "./launchMatrix/helpers/structuralValidator.js";

const document = {
  type: "Document" as const,
  meta: { title: "Shared Structural Validation" },
  slides: [
    {
      type: "Slide" as const,
      children: [
        { type: "Text" as const, content: "Alpha" },
        { type: "Text" as const, content: "Beta", style: { top: 48 } },
      ],
    },
  ],
};

const RED_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const TINY_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=";
const TINY_AUDIO = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMA==";

async function mutateSlideXml(mutator: (xml: string) => string): Promise<Buffer> {
  const buffer = await PaperEngine.render(document);
  const zip = await JSZip.loadAsync(buffer);
  const slidePath = "ppt/slides/slide1.xml";
  const slideXml = await zip.file(slidePath)!.async("string");
  zip.file(slidePath, mutator(slideXml));
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("shared structural validation", () => {
  it("uses the same runtime result for launch-matrix pass/fail", async () => {
    const buffer = await PaperEngine.render(document);
    const runtime = await validatePptxStructure(buffer);
    const launchMatrix = await validateStructure(buffer);

    expect(runtime.status).toBe("passed");
    expect(launchMatrix.passed).toBe(true);
    expect(launchMatrix.runtime.status).toBe(runtime.status);
  });

  it("maps duplicate non-visual shape IDs to a public quality finding", async () => {
    const broken = await mutateSlideXml((slideXml) => {
      const ids = [...slideXml.matchAll(/<p:cNvPr id="(\d+)"/g)];
      if (!ids[0]?.[1] || !ids[1]?.[1]) {
        throw new Error("Expected at least two p:cNvPr ids in slide XML.");
      }
      return slideXml.replace(
        `<p:cNvPr id="${ids[1][1]}"`,
        `<p:cNvPr id="${ids[0][1]}"`,
      );
    });

    const runtime = await validatePptxStructure(broken);
    const launchMatrix = await validateStructure(broken);
    const compatibility = await analyzeDocumentCompatibility(document);
    const report = buildQualityReport(compatibility, { validationMode: "structural" }, {
      structuralValidation: runtime,
    });

    expect(runtime.status).toBe("failed");
    expect(launchMatrix.checks.find((check) => check.name === "duplicateShapeIds")?.passed).toBe(false);
    expect(report.findings.some((finding) => finding.sharedCode === "PPTX_SHAPE_ID_NOT_UNIQUE")).toBe(true);
  });

  it("maps XML parse failures to a public shared finding", async () => {
    const broken = await mutateSlideXml((slideXml) => `${slideXml}<broken`);
    const runtime = await validatePptxStructure(broken);
    const compatibility = await analyzeDocumentCompatibility(document);
    const report = buildQualityReport(compatibility, { validationMode: "structural" }, {
      structuralValidation: runtime,
    });

    expect(runtime.status).toBe("failed");
    expect(runtime.checks.some((check) => check.id.startsWith("xml.parse.") && !check.passed)).toBe(true);
    expect(report.findings.some((finding) => finding.sharedCode === "SHARED_XML_PARSE_FAILURE")).toBe(true);
  });

  it("accepts custom properties with more than 3,000 character-entity escapes", async () => {
    const jsonPayload = JSON.stringify(Array.from({ length: 1_501 }, () => "value"));
    const buffer = await PaperEngine.render({
      ...document,
      customProperties: [{ name: "JsonPayload", value: jsonPayload }],
    });
    const zip = await JSZip.loadAsync(buffer);
    const customXml = await zip.file("docProps/custom.xml")!.async("string");
    const entityEscapeCount = customXml.match(/&quot;/g)?.length ?? 0;
    const runtime = await validatePptxStructure(buffer);
    const compatibility = await analyzeDocumentCompatibility(document);
    const report = buildQualityReport(compatibility, { validationMode: "structural" }, {
      structuralValidation: runtime,
    });

    expect(entityEscapeCount).toBeGreaterThan(3_000);
    expect(runtime.status).toBe("passed");
    expect(report.findings.some((finding) => finding.sharedCode === "PPTX_STRUCTURAL_VALIDATION_FAILED")).toBe(false);
  });

  it("retains a finite entity-expansion limit for untrusted OOXML", async () => {
    const buffer = await PaperEngine.render({
      ...document,
      customProperties: [{ name: "Payload", value: "safe" }],
    });
    const zip = await JSZip.loadAsync(buffer);
    const customPath = "docProps/custom.xml";
    const customXml = await zip.file(customPath)!.async("string");
    zip.file(customPath, customXml.replace("safe", "&quot;".repeat(100_001)));

    const runtime = await validatePptxStructure(await zip.generateAsync({ type: "nodebuffer" }));
    const parseFailure = runtime.checks.find((check) => check.id === `xml.parse.${customPath}`);

    expect(runtime.status).toBe("failed");
    expect(parseFailure?.passed).toBe(false);
    expect(parseFailure?.message).toMatch(/Entity expansion (?:count )?limit exceeded: 100001 > 100000/);
  });

  it("does not treat empty media relationship attributes as unresolved targets", async () => {
    const buffer = await PaperEngine.render({
      type: "Document",
      meta: { title: "Media Relationship Validation" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Video",
              src: TINY_VIDEO,
              poster: RED_PIXEL,
              mimeType: "video/mp4",
              style: { position: "absolute", left: 72, top: 72, width: 160, height: 96 },
              decorative: true,
            },
            {
              type: "Audio",
              src: TINY_AUDIO,
              mimeType: "audio/mp3",
              style: { position: "absolute", left: 260, top: 84, width: 72, height: 72 },
              decorative: true,
            },
          ],
        },
      ],
    });
    const runtime = await validatePptxStructure(buffer);
    expect(runtime.status).toBe("passed");
    expect(runtime.checks.some((check) => check.id.includes(".ref.") && !check.passed)).toBe(false);
  });
});
