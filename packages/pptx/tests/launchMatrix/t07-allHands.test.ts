/**
 * T07: Company All-Hands Meeting — Structural + Content Verification (20 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { allHandsDeck } from "./fixtures/t07AllHands.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertTextOnSlide, assertFontSizePresent,
  assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T07: Company All-Hands Meeting", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(allHandsDeck);
  }, 30000);

  // --- Structural (3) ---

  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 20 slides", async () => {
    await assertSlideCount(buffer, 20);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // --- Content (7) ---

  it("slide 1: title slide with company name", async () => {
    await assertTextOnSlide(buffer, 0, "Company All-Hands");
  });

  it("slide 4: milestone celebration with 72pt metric", async () => {
    await assertFontSizePresent(buffer, 3, 96);
    await assertTextOnSlide(buffer, 3, "$10M ARR!");
  });

  it("slide 5: scorecard with at least 6 KPI tiles", async () => {
    const count = await getSlideShapeCount(buffer, 4);
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("slide 6: revenue stacked bar chart", async () => {
    await assertChartExists(buffer, 5, "bar");
  });

  it("slide 9: product spotlight with line chart", async () => {
    await assertChartExists(buffer, 8, "line");
  });

  it("slide 13: roadmap 3-column layout (Now / Next / Later)", async () => {
    await assertTextOnSlide(buffer, 12, "Now");
    await assertTextOnSlide(buffer, 12, "Next");
    await assertTextOnSlide(buffer, 12, "Later");
    const count = await getSlideShapeCount(buffer, 12);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("slide 17: Q&A slide", async () => {
    await assertTextOnSlide(buffer, 16, "Your Questions");
  });
});
