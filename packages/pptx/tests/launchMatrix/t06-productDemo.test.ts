/**
 * T6: Product Demo — Structural + Content Verification (12 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { productDemoDeck } from "./fixtures/t06ProductDemo.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertTextOnSlide, assertFontSizePresent,
  assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T6: Product Demo", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(productDemoDeck);
  }, 30000);

  // --- Structural ---

  it("produces valid PPTX", async () => {
    await assertValidPptx(buffer);
  });

  it("has 12 slides", async () => {
    await assertSlideCount(buffer, 12);
  });

  it("passes corruption check", async () => {
    await assertNoCorruption(buffer);
  });

  // --- Content ---

  it("slide 1: title slide has product name and gradient", async () => {
    await assertTextOnSlide(buffer, 0, "NexusFlow");
    await assertFontSizePresent(buffer, 0, 48);
  });

  it("slide 2: industry trend shows 4.7x statistic", async () => {
    await assertTextOnSlide(buffer, 1, "4.7");
    await assertFontSizePresent(buffer, 1, 64);
  });

  it("slide 3: problem statement lists pain points", async () => {
    await assertTextOnSlide(buffer, 2, "Fragmented Tooling");
    await assertTextOnSlide(buffer, 2, "Slow Incident Response");
    await assertTextOnSlide(buffer, 2, "Deployment Bottleneck");
  });

  it("slide 5: architecture diagram has components and connectors", async () => {
    await assertTextOnSlide(buffer, 4, "Workflow Engine");
    await assertTextOnSlide(buffer, 4, "Build Service");
    await assertTextOnSlide(buffer, 4, "Event Bus");
    const count = await getSlideShapeCount(buffer, 4);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  it("slide 7: hero screenshot #1 has callout labels", async () => {
    await assertTextOnSlide(buffer, 6, "DAG Editor");
    await assertTextOnSlide(buffer, 6, "Live Preview");
  });

  it("slide 9: before/after metrics shows DORA improvements", async () => {
    await assertTextOnSlide(buffer, 8, "BEFORE NEXUSFLOW");
    await assertTextOnSlide(buffer, 8, "AFTER NEXUSFLOW");
    await assertTextOnSlide(buffer, 8, "Deploy Frequency");
  });

  it("slide 10: integration grid renders logo images", async () => {
    const count = await getSlideShapeCount(buffer, 9);
    expect(count).toBeGreaterThanOrEqual(5);
    await assertTextOnSlide(buffer, 9, "200+ integrations");
  });

  it("slide 12: CTA has trial info and contact details", async () => {
    await assertTextOnSlide(buffer, 11, "Start Your Free Trial");
    await assertTextOnSlide(buffer, 11, "Request Demo");
    await assertTextOnSlide(buffer, 11, "alex@nexusflow.io");
  });
});
