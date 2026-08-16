/**
 * T3: SaaS Board Deck — Structural + Content Verification (18 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { saasBoardDeck } from "./fixtures/t03SaasBoard.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertChartEditable, assertTextOnSlide,
  assertFontSizePresent, assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T3: SaaS Board Deck", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(saasBoardDeck);
  }, 30000);

  // Layer 1 — Structural
  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 18 slides", async () => {
    await assertSlideCount(buffer, 18);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // Layer 2 — Content
  it("slide 1: title slide with board meeting header", async () => {
    await assertTextOnSlide(buffer, 0, "Q4 2025 Board Meeting");
  });

  it("slide 2: agenda table with topic rows", async () => {
    await assertTextOnSlide(buffer, 1, "Topic");
    await assertTextOnSlide(buffer, 1, "CEO Update");
  });

  it("slide 4: ops metrics T9Q table with ARR data", async () => {
    await assertTextOnSlide(buffer, 3, "ARR");
    await assertTextOnSlide(buffer, 3, "Q4");
  });

  it("slide 6: ARR waterfall chart", async () => {
    await assertChartExists(buffer, 5, "waterfall");
  });

  it("slide 7: ARR trend combo chart", async () => {
    await assertChartExists(buffer, 6, "bar");
  });

  it("slide 9: funnel chart", async () => {
    await assertChartExists(buffer, 8, "funnel");
  });

  it("slide 10: NPS line chart", async () => {
    await assertChartExists(buffer, 9, "line");
  });

  it("slide 14: scatter chart for competitive pricing", async () => {
    await assertChartExists(buffer, 13, "scatter");
  });
});
