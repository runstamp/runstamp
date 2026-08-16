import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { PaperEngine } from "../src/engine.js";
import { validateDocument } from "../src/engine/documentValidation.js";
import { PaperError } from "../src/errors.js";
import { validateAbsoluteDocumentLayout } from "../src/layout/absoluteSafety.js";
import { MAX_RASTER_IMAGE_DIMENSION_PX } from "../src/ooxml/constants.js";
import { resolveImageSource } from "../src/ooxml/media.js";
import { calculateRichTextMetrics } from "../src/typography/richMetrics.js";
import type { AgentLayoutWarningCode } from "../src/interpreter/layout-validator.js";
import type { PaperDocument, PaperNode, PaperView } from "../src/types/ast.js";

async function firstSlideXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("ppt/slides/slide1.xml")!.async("string");
}

function emittedText(xml: string): string {
  return Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/gu), (match) => match[1]).join("");
}

function textDocument(
  content: string,
  width: number,
  height: number,
  fontSize = 32,
  minFontSize = 16,
): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      children: [{
        type: "Text",
        content,
        style: {
          position: "absolute",
          left: 40,
          top: 40,
          width,
          height,
          fontSize,
          textFit: { policy: "fitFontSize", minFontSize },
        },
      }],
    }],
  };
}

function pngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function dataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function nestedView(depth: number): PaperNode {
  let node: PaperView = {
    type: "View",
    style: { position: "absolute", left: 0, top: 0, width: 10, height: 10 },
    children: [],
  };
  for (let level = 1; level < depth; level += 1) {
    node = {
      type: "View",
      style: { position: "absolute", left: 0, top: 0, width: 10, height: 10 },
      children: [node],
    };
  }
  return node;
}

describe("GA edge matrix Batch B — pptx core", () => {
  it("cell 1: shrinks to the configured minimum, warns, then truncates only at grapheme boundaries", async () => {
    const glyph = "👩‍💻";
    const doc = textDocument(`${glyph} `.repeat(80), 140, 26);
    const warnings: AgentLayoutWarningCode[] = [];

    expect(validateAbsoluteDocumentLayout(doc).some((issue) => issue.code === "TEXT_OVERFLOW")).toBe(true);
    const xml = await firstSlideXml(await PaperEngine.render(doc, {
      onLayoutWarning: (warning) => warnings.push(warning.code),
    }));
    const visible = emittedText(xml);
    const prefix = visible.slice(0, -1).trim();

    expect(warnings).toContain("POTENTIAL_OVERFLOW");
    expect(xml).toContain('sz="1200"');
    expect(visible).toMatch(/…$/u);
    expect(prefix.length).toBeGreaterThan(0);
    expect(prefix.replaceAll(glyph, "").trim()).toBe("");
    expect(visible).not.toContain("�");
  });

  it("cell 2: inserts break-anywhere opportunities for a 300+ character token and surfaces a structured warning", async () => {
    const content = `https://example.com/${"A".repeat(300)}`;
    const doc = textDocument(content, 180, 400, 24, 8);
    const warnings: AgentLayoutWarningCode[] = [];

    expect(validateAbsoluteDocumentLayout(doc).some((issue) => issue.code === "TEXT_BREAK_ANYWHERE")).toBe(true);
    const xml = await firstSlideXml(await PaperEngine.render(doc, {
      onLayoutWarning: (warning) => warnings.push(warning.code),
    }));
    const wrapped = emittedText(xml);
    const metrics = calculateRichTextMetrics([{ text: wrapped }], { fontSize: 24 }, 180);

    expect(warnings).toContain("POTENTIAL_UNBREAKABLE_STRING");
    expect(wrapped).toContain("\u200B");
    expect(wrapped.replaceAll("\u200B", "").replace(/…$/u, "")).toBe(content);
    expect(metrics.maxLineWidth).toBeLessThanOrEqual(180);
  });

  it("cell 6: rejects slide geometry outside the documented EMU-safe range with a typed error", () => {
    for (const slideSize of [
      { width: 5_601, height: 720 },
      { width: 1_280, height: 0 },
    ]) {
      const doc: PaperDocument = {
        type: "Document",
        meta: {},
        slideSize,
        slides: [{ type: "Slide", children: [] }],
      };

      expect(() => validateDocument(doc)).toThrowError(expect.objectContaining({
        name: "PaperError",
        code: "VALIDATION_FAILED",
        phase: "validation",
      }));
    }
  });

  it("cell 8-dimension: accepts 25000px raster sides and rejects larger headers with a typed media error", async () => {
    await expect(resolveImageSource(dataUrl(pngHeader(MAX_RASTER_IMAGE_DIMENSION_PX, 1))))
      .resolves.toMatchObject({ ext: "png" });

    try {
      await resolveImageSource(dataUrl(pngHeader(MAX_RASTER_IMAGE_DIMENSION_PX + 1, 1)));
      throw new Error("expected oversized raster dimensions to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PaperError);
      expect(error).toMatchObject({ code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" });
      expect((error as Error).message).toContain("25000px per-side limit");
    }
  });

  it("cell 9: rejects containers past depth 20 with a typed error, never a stack overflow", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children: [nestedView(25)] }],
    };

    try {
      validateDocument(doc);
      throw new Error("expected excessive nesting to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PaperError);
      expect(error).not.toBeInstanceOf(RangeError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED", phase: "validation" });
      expect((error as Error).message).toContain("maximum nesting depth of 20");
    }
  });
});
