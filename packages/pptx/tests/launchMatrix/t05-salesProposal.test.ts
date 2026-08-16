/**
 * T5: Sales Proposal — Structural + Content Verification (14 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { salesProposalDeck } from "./fixtures/t05SalesProposal.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertTextOnSlide, assertFontSizePresent,
  assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T5: Sales Proposal", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(salesProposalDeck);
  }, 30000);

  // --- Structural ---

  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 14 slides", async () => {
    await assertSlideCount(buffer, 14);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // --- Content ---

  it("slide 1: cover has company name", async () => {
    await assertTextOnSlide(buffer, 0, "Acme Solutions");
    await assertTextOnSlide(buffer, 0, "GlobalCorp");
  });

  it("slide 2: market shift shows 73% statistic", async () => {
    await assertTextOnSlide(buffer, 1, "73%");
    await assertFontSizePresent(buffer, 1, 64);
  });

  it("slide 3: problem slide has pain points", async () => {
    await assertTextOnSlide(buffer, 2, "Manual Processes");
    await assertTextOnSlide(buffer, 2, "Revenue Leakage");
  });

  it("slide 5: logo grid has images", async () => {
    const count = await getSlideShapeCount(buffer, 4);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("slide 9: before/after comparison", async () => {
    await assertTextOnSlide(buffer, 8, "BEFORE");
    await assertTextOnSlide(buffer, 8, "AFTER");
    await assertTextOnSlide(buffer, 8, "Current State");
  });

  it("slide 11: feature comparison table has competitor columns", async () => {
    await assertTextOnSlide(buffer, 10, "Acme Solutions");
    await assertTextOnSlide(buffer, 10, "Competitor A");
  });

  it("slide 12: pricing tiers render 3+ cards", async () => {
    const count = await getSlideShapeCount(buffer, 11);
    expect(count).toBeGreaterThanOrEqual(3);
    await assertTextOnSlide(buffer, 11, "Growth");
    await assertTextOnSlide(buffer, 11, "Enterprise");
  });

  it("slide 14: next steps has contact info", async () => {
    await assertTextOnSlide(buffer, 13, "Next Steps");
    await assertTextOnSlide(buffer, 13, "sarah@acmesolutions.com");
  });
});
