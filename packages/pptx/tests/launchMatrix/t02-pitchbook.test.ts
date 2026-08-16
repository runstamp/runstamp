/**
 * T2: Investment Banking Pitch Book — Structural + Content Verification
 * 38-slide IB-style pitch book with comp tables, football field, DCF sensitivity,
 * buyer profiles, combo charts, S&U, and Gantt timeline.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { pitchBookDeck } from "./fixtures/t02PitchBook.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertChartEditable, assertTextOnSlide,
  assertFontSizePresent, assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T2: Investment Banking Pitch Book", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(pitchBookDeck);
  }, 30000);

  // ── Layer 1: Structural ──────────────────────────────────────────────────

  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 38 slides", async () => {
    await assertSlideCount(buffer, 38);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // ── Layer 2: Content ─────────────────────────────────────────────────────

  it("slide 1: cover with gradient and project codename", async () => {
    await assertTextOnSlide(buffer, 0, "Project Atlas");
    await assertTextOnSlide(buffer, 0, "Apex Industries");
  });

  it("slide 2: table of contents", async () => {
    await assertTextOnSlide(buffer, 1, "Table of Contents");
    await assertTextOnSlide(buffer, 1, "Executive Summary");
  });

  it("slide 6: sector M&A bar chart", async () => {
    await assertChartExists(buffer, 5, "bar");
  });

  it("slide 7: capital markets line chart", async () => {
    await assertChartExists(buffer, 6, "line");
  });

  it("slide 9: company overview with pie chart", async () => {
    await assertChartExists(buffer, 8, "pie");
    await assertTextOnSlide(buffer, 8, "Precision Components");
  });

  it("slide 11: income statement financials table", async () => {
    await assertTextOnSlide(buffer, 10, "Revenue");
  });

  it("slide 19: DCF sensitivity matrix", async () => {
    await assertTextOnSlide(buffer, 18, "WACC");
  });

  it("slide 20: football field chart", async () => {
    await assertChartExists(buffer, 19, "bar");
  });

  it("slide 21: sources & uses tables", async () => {
    await assertTextOnSlide(buffer, 20, "Sources");
    await assertTextOnSlide(buffer, 20, "Total Sources");
  });

  it("slide 23: first buyer profile (Honeywell)", async () => {
    await assertTextOnSlide(buffer, 22, "Honeywell");
    await assertTextOnSlide(buffer, 22, "Strategic Rationale");
  });
});
