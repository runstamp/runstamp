// PRD P0-4: SlideBackground.type accepts "gradient" but the Zod
// discriminator for View.style.fill only accepts "linear" / "radial".
// Users (including LLM agents) routinely write "gradient" on View fills
// and get `invalid_union: No matching discriminator`. The fix lives in
// validateDocument: `normalizeGradientFillAlias` rewrites
// {type: "gradient", stops, ...} to {type: "linear", angle: 0|provided}.
// This test pins the alias so a regression that removed the normalizer
// doesn't silently reintroduce the error surface.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { validateDocument } from "../src/engine/documentValidation.js";
import type { PaperDocument } from "../src/types/ast.js";

function docWithGradientFill(): PaperDocument {
  // PaperDocumentSchema would reject {type:"gradient"} as fill.type;
  // normalizeDocumentFillAliases runs BEFORE the schema parse path
  // (checkNodeLimits first, then PaperDocumentSchema.parse which is
  // wrapped by normalizeDocumentFillAliases at line 150 of
  // documentValidation.ts). Cast through `unknown` because the TS
  // type doesn't accept "gradient" either.
  const doc = {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "View",
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 400,
              height: 200,
              fill: {
                type: "gradient",
                angle: 45,
                stops: [
                  { position: 0, color: "#3b82f6" },
                  { position: 1, color: "#8b5cf6" },
                ],
              },
            },
            children: [],
          },
        ],
      },
    ],
  } as unknown as PaperDocument;
  return doc;
}

describe("P0-4: gradient fill alias", () => {
  it("validateDocument accepts fill.type=\"gradient\" and normalizes it to \"linear\"", () => {
    const doc = docWithGradientFill();
    const validated = validateDocument(doc);
    const slide = validated.slides[0];
    const view = slide.children[0];
    expect(view.type).toBe("View");
    const fill = (view as { style?: { fill?: { type: string; angle?: number } } }).style?.fill;
    expect(fill?.type).toBe("linear");
    expect(fill?.angle).toBe(45);
  });

  it("falls back to angle=0 when alias input omits angle", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              style: {
                position: "absolute",
                left: 0,
                top: 0,
                width: 100,
                height: 100,
                fill: {
                  type: "gradient",
                  stops: [
                    { position: 0, color: "#000000" },
                    { position: 1, color: "#ffffff" },
                  ],
                },
              },
              children: [],
            },
          ],
        },
      ],
    } as unknown as PaperDocument;
    const validated = validateDocument(doc);
    const fill = (validated.slides[0].children[0] as { style?: { fill?: { type: string; angle?: number } } })
      .style?.fill;
    expect(fill?.type).toBe("linear");
    expect(fill?.angle).toBe(0);
  });

  it("non-gradient fills pass through unchanged", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              style: {
                position: "absolute",
                left: 0,
                top: 0,
                width: 100,
                height: 100,
                fill: { type: "solid", color: "#ff0000" },
              },
              children: [],
            },
          ],
        },
      ],
    };
    const validated = validateDocument(doc);
    const fill = (validated.slides[0].children[0] as { style?: { fill?: { type: string; color?: string } } })
      .style?.fill;
    expect(fill?.type).toBe("solid");
    expect(fill?.color).toBe("#ff0000");
  });

  it("rendering a gradient-aliased doc produces linear gradient OOXML", async () => {
    const doc = docWithGradientFill();
    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slide1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
    // Linear gradients in DrawingML emit <a:gradFill> with <a:lin>
    expect(slide1).toContain("<a:gradFill");
    expect(slide1).toMatch(/<a:lin[^>]*ang=/);
  }, 30000);
});
