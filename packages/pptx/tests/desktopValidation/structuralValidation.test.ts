import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../../src/index.js";
import { analyzeDocumentCompatibility } from "../../src/compatibility/pptxCompatibility.js";
import { validateStructure } from "../launchMatrix/helpers/structuralValidator.js";
import { buildCorpusFixture } from "./helpers/corpus.js";
import { buildForcedInvalidRelTargetDeck } from "./fixtures/forcedInvalidDeck.js";
import { richMediaDeck } from "./fixtures/richMediaDeck.js";

describe("desktop structural validation extensions", () => {
  it("flags an invalid relationship target", async () => {
    const buffer = await buildForcedInvalidRelTargetDeck();
    const report = await validateStructure(buffer);
    const relationshipCheck = report.checks.find((check) => check.name === "relationshipTargetExistence");
    expect(relationshipCheck?.passed).toBe(false);
  });

  it("flags duplicate non-visual shape ids within a slide", async () => {
    const base = await PaperEngine.render({
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "A" },
            { type: "Text", content: "B", style: { top: 40 } },
          ],
        },
      ],
    });

    const zip = await JSZip.loadAsync(base);
    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const ids = [...slide.matchAll(/<p:cNvPr id="(\d+)"/g)];
    expect(ids.length).toBeGreaterThan(1);
    const mutated = slide.replace(
      `<p:cNvPr id="${ids[1][1]}"`,
      `<p:cNvPr id="${ids[0][1]}"`,
    );
    zip.file("ppt/slides/slide1.xml", mutated);

    const broken = await zip.generateAsync({ type: "nodebuffer" });
    const report = await validateStructure(broken);
    const duplicateShapeCheck = report.checks.find((check) => check.name === "duplicateShapeIds");
    expect(duplicateShapeCheck?.passed).toBe(false);
  });

  it("keeps notes and comments relationship ids unique when media and background images are present", async () => {
    const buffer = await PaperEngine.render(richMediaDeck);
    const report = await validateStructure(buffer);
    const duplicateRelationshipCheck = report.checks.find((check) => check.name === "duplicateRelationshipIds");
    expect(duplicateRelationshipCheck?.passed).toBe(true);
  });

  it("flags out-of-range chart manual layout values", async () => {
    const buffer = await PaperEngine.render({
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Chart",
              style: { position: "absolute", top: 40, left: 40, width: 640, height: 240 },
              chartData: {
                chartType: "bar",
                categories: ["A", "B", "C"],
                series: [{ name: "Series", values: [1, 2, 3] }],
                legend: { position: "bottom" },
              },
            } as any,
          ],
        },
      ],
    });

    const zip = await JSZip.loadAsync(buffer);
    const chartXml = await zip.file("ppt/charts/chart1.xml")!.async("string");
    zip.file("ppt/charts/chart1.xml", chartXml.replace(/<c:h val="[^"]+"\/>/, '<c:h val="1.1111"/>'));

    const broken = await zip.generateAsync({ type: "nodebuffer" });
    const report = await validateStructure(broken);
    const manualLayoutCheck = report.checks.find((check) => check.name === "chartManualLayoutBounds");
    expect(manualLayoutCheck?.passed).toBe(false);
  });

  it("passes stricter chart manual layout checks for the Strategy Studio fixture", async () => {
    const built = await buildCorpusFixture("strategy-studio");
    const report = await validateStructure(built.buffer);
    const manualLayoutCheck = report.checks.find((check) => check.name === "chartManualLayoutBounds");
    expect(manualLayoutCheck?.passed).toBe(true);
  });

  it("classifies risky Strategy slides into compatibility fallback paths", async () => {
    const built = await buildCorpusFixture("strategy-studio");
    const compatibility = await analyzeDocumentCompatibility(built.normalizedDoc as any);
    expect(
      compatibility.slides.some((slide) => slide.compatibilityVerdict === "visual_fallback"),
    ).toBe(true);
  });
});
