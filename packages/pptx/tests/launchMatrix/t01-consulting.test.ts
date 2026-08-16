/**
 * T1: Management Consulting Strategy Deck — Structural + Content Verification
 * 24-slide MBB-style deck with charts, Harvey balls, process flows, Gantt, appendix.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { consultingDeck } from "./fixtures/t01ConsultingDeck.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertChartEditable, assertTextOnSlide,
  assertFontSizePresent, assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T1: Management Consulting Strategy Deck", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(consultingDeck);
  }, 30000);

  // ── Layer 1: Structural ──────────────────────────────────────────────────

  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 24 slides", async () => {
    await assertSlideCount(buffer, 24);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // ── Layer 2: Content ─────────────────────────────────────────────────────

  it("slide 1: title slide with bold heading", async () => {
    await assertTextOnSlide(buffer, 0, "Strategic Growth Assessment");
    await assertFontSizePresent(buffer, 0, 48);
  });

  it("slide 2: exec summary has SCR framework", async () => {
    await assertTextOnSlide(buffer, 1, "Situation");
    await assertTextOnSlide(buffer, 1, "Complication");
    await assertTextOnSlide(buffer, 1, "Resolution");
  });

  it("slide 4: section divider — Market Analysis", async () => {
    await assertTextOnSlide(buffer, 3, "Market Analysis");
  });

  it("slide 5: market sizing stacked bar chart", async () => {
    await assertChartExists(buffer, 4, "bar");
  });

  it("slide 6: trend line chart", async () => {
    await assertChartExists(buffer, 5, "line");
  });

  it("slide 7: waterfall chart", async () => {
    await assertChartExists(buffer, 6, "waterfall");
  });

  it("slide 9: Harvey ball comparison table", async () => {
    await assertTextOnSlide(buffer, 8, "Criteria");
  });

  it("slide 17: pie chart — revenue mix", async () => {
    await assertChartExists(buffer, 16, "pie");
  });

  it("slide 20: recommendations with multiple cards", async () => {
    const count = await getSlideShapeCount(buffer, 19);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("slide 23: closing slide with speaker notes", async () => {
    await assertTextOnSlide(buffer, 22, "Thank You");
    await assertSpeakerNotes(buffer, 22, "Thank attendees");
  });
});
