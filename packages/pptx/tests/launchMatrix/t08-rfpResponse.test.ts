/**
 * T08: RFP Response — Structural + Content Verification (22 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { rfpResponseDeck } from "./fixtures/t08RfpResponse.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertTextOnSlide, assertFontSizePresent,
  assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T08: RFP Response", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(rfpResponseDeck);
  }, 30000);

  // --- Structural (3) ---

  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 22 slides", async () => {
    await assertSlideCount(buffer, 22);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // --- Content (7) ---

  it("slide 1: cover with RFP reference and client name", async () => {
    await assertTextOnSlide(buffer, 0, "GlobalCorp");
    await assertTextOnSlide(buffer, 0, "RFP");
  });

  it("slide 2: executive summary with challenge and solution", async () => {
    await assertTextOnSlide(buffer, 1, "The Challenge");
    await assertTextOnSlide(buffer, 1, "Our Solution");
  });

  it("slide 5: compliance matrix table", async () => {
    const count = await getSlideShapeCount(buffer, 4);
    expect(count).toBeGreaterThanOrEqual(1);
    await assertTextOnSlide(buffer, 4, "Compliance");
  });

  it("slide 6: architecture overview with diagram shapes", async () => {
    const count = await getSlideShapeCount(buffer, 5);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it("slide 13: success metrics with KPI values", async () => {
    const count = await getSlideShapeCount(buffer, 12);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("slide 19: pricing TCO table", async () => {
    await assertTextOnSlide(buffer, 18, "Total");
  });

  it("slide 21: next steps slide", async () => {
    await assertTextOnSlide(buffer, 20, "next steps");
  });
});
