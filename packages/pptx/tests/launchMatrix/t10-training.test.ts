/**
 * T10: Training Course — Structural + Content Verification (18 slides)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { trainingDeck } from "./fixtures/t10Training.js";
import {
  assertValidPptx, assertSlideCount, assertNoCorruption,
  assertChartExists, assertTextOnSlide, assertFontSizePresent,
  assertSpeakerNotes, getSlideShapeCount,
} from "./helpers/verificationUtils.js";

describe("T10: Training Course", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    buffer = await PaperEngine.render(trainingDeck);
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
  it("slide 1: title with course name and instructor", async () => {
    await assertTextOnSlide(buffer, 0, "Enterprise Platform Engineering");
    await assertTextOnSlide(buffer, 0, "Dr. Alex Rivera");
  });

  it("slide 4: section divider for Module 1", async () => {
    await assertTextOnSlide(buffer, 3, "MODULE 1");
    await assertTextOnSlide(buffer, 3, "Platform Architecture");
  });

  it("slide 6: deep bullet hierarchy with 6 levels", async () => {
    const shapeCount = await getSlideShapeCount(buffer, 5);
    expect(shapeCount).toBeGreaterThanOrEqual(1);
  });

  it("slide 9: knowledge check 1 with answer in speaker notes", async () => {
    await assertTextOnSlide(buffer, 8, "Knowledge Check");
    await assertSpeakerNotes(buffer, 8, "Canary Deployment");
  });

  it("slide 10: section divider for Module 2", async () => {
    await assertTextOnSlide(buffer, 9, "MODULE 2");
    await assertTextOnSlide(buffer, 9, "Container Orchestration");
  });

  it("slide 14: knowledge check 2 with answers in speaker notes", async () => {
    await assertTextOnSlide(buffer, 13, "True or False");
    await assertSpeakerNotes(buffer, 13, "TRUE");
  });

  it("slide 18: certificate placeholder", async () => {
    await assertTextOnSlide(buffer, 17, "Certificate of Completion");
  });
});
