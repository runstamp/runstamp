/**
 * M7 — Per-document HarfBuzz shape cache.
 *
 * The cache is internal (lives on `PreparedEmbeddedFont.hbShapeCache`),
 * so we exercise it from the public `shapeEmbeddedText` API: a second
 * call with the same `(text, direction)` for the same prepared font
 * must reuse the cached HB output. We assert this two ways:
 *   1. The map size grows by exactly one per unique key.
 *   2. Calling `shapeEmbeddedText` repeatedly on the same input returns
 *      structurally identical glyph data (same gid sequence, same
 *      total advance) — exercises the cache transparency contract.
 */
import { describe, it, expect } from "vitest";
import { prepareEmbeddedFonts, shapeEmbeddedText } from "../src/font-embedding.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";

describe("shapeEmbeddedText per-document cache (M7)", () => {
  it("populates hbShapeCache with one entry per unique (text, direction)", async () => {
    const fonts = await ensurePhase2FontFixtures();
    const prepared = await prepareEmbeddedFonts(
      [{ alias: "F1", font: { family: "Inter", source: fonts.inter }, samples: ["Hello world", "Bye"] }],
      { subset: true },
    );
    const inter = [...prepared.values()][0];

    expect(inter.hbShapeCache.size).toBe(0);

    await shapeEmbeddedText(inter, "Hello world", 12, 0, 0, "ltr");
    expect(inter.hbShapeCache.size).toBe(1);

    // Same key — no new entry.
    await shapeEmbeddedText(inter, "Hello world", 12, 100, 50, "ltr", 5);
    expect(inter.hbShapeCache.size).toBe(1);

    // Different text — new entry.
    await shapeEmbeddedText(inter, "Bye", 12, 0, 0, "ltr");
    expect(inter.hbShapeCache.size).toBe(2);
  });

  it("returns structurally identical glyph data for the same input", async () => {
    const fonts = await ensurePhase2FontFixtures();
    const prepared = await prepareEmbeddedFonts(
      [{ alias: "F1", font: { family: "Inter", source: fonts.inter }, samples: ["The quick brown fox"] }],
      { subset: true },
    );
    const inter = [...prepared.values()][0];

    const a = await shapeEmbeddedText(inter, "The quick brown fox", 12, 0, 0, "ltr");
    const b = await shapeEmbeddedText(inter, "The quick brown fox", 12, 0, 0, "ltr");

    expect(b.glyphs.map((g) => g.gid)).toEqual(a.glyphs.map((g) => g.gid));
    expect(b.totalAdvancePoints).toBe(a.totalAdvancePoints);
    expect(b.direction).toBe(a.direction);
  });

  it("isolates caches between independently prepared fonts", async () => {
    const fonts = await ensurePhase2FontFixtures();
    const prep1 = await prepareEmbeddedFonts(
      [{ alias: "F1", font: { family: "Inter", source: fonts.inter }, samples: ["Hello"] }],
      { subset: true },
    );
    const prep2 = await prepareEmbeddedFonts(
      [{ alias: "F1", font: { family: "Inter", source: fonts.inter }, samples: ["Hello"] }],
      { subset: true },
    );

    const inter1 = [...prep1.values()][0];
    const inter2 = [...prep2.values()][0];

    await shapeEmbeddedText(inter1, "Hello", 12, 0, 0, "ltr");
    expect(inter1.hbShapeCache.size).toBe(1);
    expect(inter2.hbShapeCache.size).toBe(0);
  });
});
