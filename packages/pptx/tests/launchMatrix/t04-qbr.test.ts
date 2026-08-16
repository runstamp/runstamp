/**
 * T4: QBR — Quarterly Business Review — Structural + Content Verification (16 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { qbrDeck } from "./fixtures/t04Qbr.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertChartEditable, assertTextOnSlide,
  assertFontSizePresent, assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T4: Quarterly Business Review", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(qbrDeck);
  }, 30000);

  // Layer 1 — Structural
  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 16 slides", async () => {
    await assertSlideCount(buffer, 16);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // Layer 2 — Content
  it("slide 1: title slide with QBR header", async () => {
    await assertTextOnSlide(buffer, 0, "Quarterly Business Review");
  });

  it("slide 2: exec summary with KPI tiles", async () => {
    const count = await getSlideShapeCount(buffer, 1);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it("slide 4: revenue vs target bar chart", async () => {
    await assertChartExists(buffer, 3, "bar");
  });

  it("slide 5: pipeline funnel chart", async () => {
    await assertChartExists(buffer, 4, "funnel");
  });

  it("slide 6: OKR tracking table with objectives", async () => {
    await assertTextOnSlide(buffer, 5, "Objective");
    await assertTextOnSlide(buffer, 5, "Grow Revenue");
  });

  it("slide 8: competitive analysis scatter chart", async () => {
    await assertChartExists(buffer, 7, "scatter");
  });

  it("slide 12: risk register table", async () => {
    await assertTextOnSlide(buffer, 11, "Risk");
    await assertTextOnSlide(buffer, 11, "Mitigation");
  });

  it("slide 15: action items with speaker notes", async () => {
    await assertTextOnSlide(buffer, 14, "Action Item");
    await assertSpeakerNotes(buffer, 14, "Review action items");
  });
});
