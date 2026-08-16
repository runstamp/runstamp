/**
 * Stress tests for presentation rendering.
 */
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../../../src/engine.js";
import { makeDoc, textNode } from "../helpers/templateHelpers.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption, assertSpeakerNotes,
  assertTextOnSlide,
} from "../helpers/verificationUtils.js";
import { getZipEntry } from "../../helpers/xmlTestUtils.js";
import type { PaperSlide } from "../../../src/types/ast.js";

describe("Stress Tests", () => {
  // T-PRES-01: 100-slide deck renders in <60 seconds
  it("T-PRES-01: 100-slide deck renders", async () => {
    const slides: PaperSlide[] = Array.from({ length: 100 }, (_, i) => ({
      type: "Slide",
      children: [
        textNode(`Slide ${i + 1} Title`, {
          position: "absolute", top: 40, left: 60, width: 840,
          fontSize: 24, fontWeight: "bold",
        }),
        textNode(`This is the body text for slide number ${i + 1}. It provides supporting detail.`, {
          position: "absolute", top: 100, left: 60, width: 840,
          fontSize: 14,
        }),
      ],
    }));
    const start = Date.now();
    const doc = makeDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(60000);
    await assertValidPptx(buffer);
    await assertSlideCount(buffer, 100);
  }, { timeout: 120000 });

  // T-PRES-02: 10K-character speaker notes
  it("T-PRES-02: 10K-character speaker notes render", async () => {
    const longNotes = "Speaker note sentence for testing purposes. ".repeat(222).slice(0, 10000);
    const doc = makeDoc([{
      type: "Slide",
      notes: longNotes,
      children: [
        textNode("Slide with long notes", {
          position: "absolute", top: 40, left: 60, width: 840, fontSize: 24,
        }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertSpeakerNotes(buffer, 0, "Speaker note sentence");
  });

  // T-PRES-03: 10 concurrent renders
  it("T-PRES-03: 10 concurrent renders complete successfully", async () => {
    const docs = Array.from({ length: 10 }, (_, i) =>
      makeDoc([{
        type: "Slide",
        children: [
          textNode(`Concurrent render #${i + 1}`, {
            position: "absolute", top: 40, left: 60, width: 840, fontSize: 24,
          }),
        ],
      }]),
    );
    const results = await Promise.all(docs.map(d => PaperEngine.render(d)));
    expect(results).toHaveLength(10);
    for (const buffer of results) {
      await assertValidPptx(buffer);
    }
  }, { timeout: 120000 });

  // T-PRES-04: Custom slide dimensions (4:3 aspect ratio)
  it("T-PRES-04: 4:3 slide dimensions render correctly", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode("4:3 Aspect Ratio Slide", {
          position: "absolute", top: 40, left: 60, width: 840, fontSize: 24,
        }),
      ],
    }]);
    doc.slideSize = { width: 960, height: 720 };
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    // Verify the presentation XML has the correct sldSz
    // 960px * 9525 EMU/px = 9144000; 720px * 9525 = 6858000
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    expect(presXml).toContain('cx="9144000"');
    expect(presXml).toContain('cy="6858000"');
  });

  // T-PRES-05: Full i18n deck (English + CJK + RTL)
  it("T-PRES-05: i18n deck with English, CJK, and RTL text", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          textNode("English Title: Strategic Overview", {
            position: "absolute", top: 40, left: 60, width: 840, fontSize: 24,
          }),
        ],
      },
      {
        type: "Slide",
        children: [
          textNode("日本語タイトル：戦略的概要 / 中文标题：战略概述", {
            position: "absolute", top: 40, left: 60, width: 840, fontSize: 24,
          }),
        ],
      },
      {
        type: "Slide",
        children: [
          textNode("عنوان عربي: نظرة استراتيجية عامة", {
            position: "absolute", top: 40, left: 60, width: 840, fontSize: 24,
          }),
        ],
      },
    ]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertSlideCount(buffer, 3);
    await assertTextOnSlide(buffer, 0, "Strategic Overview");
    await assertTextOnSlide(buffer, 1, "戦略的概要");
    await assertTextOnSlide(buffer, 2, "عنوان عربي");
  });

  // T-PRES-06: Mixed content density (empty slide + dense slide)
  it("T-PRES-06: mixed content density — empty and dense slides", async () => {
    const emptySlide: PaperSlide = { type: "Slide", children: [] };
    const denseSlide: PaperSlide = {
      type: "Slide",
      children: Array.from({ length: 100 }, (_, i) =>
        textNode(`Item ${i}`, {
          position: "absolute",
          top: Math.floor(i / 10) * 50,
          left: (i % 10) * 90,
          width: 80,
          fontSize: 8,
        }),
      ),
    };
    const doc = makeDoc([emptySlide, denseSlide, emptySlide]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertSlideCount(buffer, 3);
  });
});
