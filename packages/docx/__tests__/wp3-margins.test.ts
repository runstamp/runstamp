import { describe, expect, it } from "vitest";
import { preprocessDocxDocumentInput } from "../src/relaxed-input.js";
import { renderToDocx } from "../src/render.js";

describe("WP3.1 — margin twips coercion is atomic", () => {
  it("converts every provided side together when any side reads as twips", () => {
    const { value, warnings } = preprocessDocxDocumentInput(
      {
        type: "DocxDocument",
        margins: { top: 1080, bottom: 100, left: 100, right: 100 },
        pages: [{ elements: [{ type: "paragraph", text: "hi" }] }],
      },
      { relaxed: true },
    );

    const margins = (value as { margins: Record<string, number> }).margins;
    // All four provided sides are coerced together so downstream math sees
    // a consistent unit. Without this guarantee, applyHeaderFooterTabStops
    // could mix twips (top=1080) with points (others=100), producing the
    // negative-tab bug described in the directive.
    expect(margins).toEqual({ top: 54, bottom: 5, left: 5, right: 5 });
    expect(warnings.map((w) => w.code)).toEqual([
      "DOCX_RELAXED_MARGIN_TWIPS",
      "DOCX_RELAXED_MARGIN_TWIPS",
      "DOCX_RELAXED_MARGIN_TWIPS",
      "DOCX_RELAXED_MARGIN_TWIPS",
    ]);
  });

  it("leaves margins alone when no side exceeds the twips heuristic", () => {
    const { value, warnings } = preprocessDocxDocumentInput(
      {
        type: "DocxDocument",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        pages: [{ elements: [{ type: "paragraph", text: "hi" }] }],
      },
      { relaxed: true },
    );

    expect((value as { margins: Record<string, number> }).margins).toEqual({
      top: 72,
      bottom: 72,
      left: 72,
      right: 72,
    });
    expect(warnings.filter((w) => w.code === "DOCX_RELAXED_MARGIN_TWIPS")).toHaveLength(0);
  });
});

describe("WP3.2 — footer tab guard", () => {
  it("renders cleanly when twips margins are coerced via relaxed mode", async () => {
    const result = await renderToDocx(
      {
        type: "DocxDocument",
        margins: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
        footer: { text: "Tab demo", includePageNumber: true },
        pages: [{ elements: [{ type: "paragraph", text: "Body" }] }],
      } as never,
      { relaxed: true },
    );

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(
      result.warnings.some((w) => w.code === "DOCX_RELAXED_MARGIN_TWIPS"),
    ).toBe(true);
  });
});
