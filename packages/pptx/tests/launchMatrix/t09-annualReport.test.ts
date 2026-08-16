/**
 * T9: Annual Report — Structural + Content Verification (16 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { annualReportDeck } from "./fixtures/t09AnnualReport.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertTextOnSlide, assertFontSizePresent,
  assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T9: Annual Report", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(annualReportDeck);
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
  it("slide 1: cover with annual report title", async () => {
    await assertTextOnSlide(buffer, 0, "2025 Annual Report");
    await assertTextOnSlide(buffer, 0, "Accelion Technologies");
  });

  it("slide 2: year-in-review KPI tiles", async () => {
    await assertTextOnSlide(buffer, 1, "$255M");
    await assertTextOnSlide(buffer, 1, "3,200+");
  });

  it("slide 4: revenue combo chart (bar + line)", async () => {
    await assertChartExists(buffer, 3, "bar");
  });

  it("slide 5: P&L waterfall chart", async () => {
    await assertChartExists(buffer, 4, "waterfall");
  });

  it("slide 6: treemap chart for revenue by segment", async () => {
    await assertChartExists(buffer, 5, "treemap");
  });

  it("slide 7: market share pie chart", async () => {
    await assertChartExists(buffer, 6, "pie");
  });

  it("slide 8: stacked area chart by region", async () => {
    await assertChartExists(buffer, 7, "area");
  });

  it("slide 15: thank you slide with board members", async () => {
    await assertTextOnSlide(buffer, 14, "Thank You");
    await assertTextOnSlide(buffer, 14, "Sarah Chen");
  });
});
