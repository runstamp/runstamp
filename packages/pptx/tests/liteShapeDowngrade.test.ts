// Lite / free mode has a curated subset of ~40 OOXML preset shapes
// (LITE_SUPPORTED_SHAPES in ooxml/drawing/shape.ts). A View whose
// shapeType is outside that set must:
//   (a) emit a [shape] logger.warn naming the unsupported shape, and
//   (b) render as a plain "rect" preset geometry.
//
// Pro mode lets the same shape through unchanged. This contract pins
// the degrade-gracefully promise so a regression that silently
// rendered un-supported shapes in lite — producing broken decks on
// viewer side — fails loudly in tests.

import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { createEngine, PaperEngine } from "../src/engine.js";
import * as loggerModule from "../src/logger.js";
import type { PaperDocument } from "../src/types/ast.js";

function docWithShape(shape: string): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "View",
            shapeType: shape as never,
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 400,
              height: 200,
              fill: { type: "solid", color: "#3b82f6" },
            },
            children: [],
          },
        ],
      },
    ],
  };
}

async function slide1Xml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("ppt/slides/slide1.xml")!.async("string");
}

function captureShapeWarnings(fn: () => Promise<void>): Promise<string[]> {
  const warn = vi.fn();
  const orig = loggerModule.getLogger();
  const spy = vi
    .spyOn(loggerModule, "getLogger")
    .mockReturnValue({ ...orig, warn } as ReturnType<typeof loggerModule.getLogger>);
  return fn().finally(() => spy.mockRestore()).then(() =>
    warn.mock.calls
      .map((args) => (typeof args[0] === "string" ? args[0] : ""))
      .filter((m) => m.includes("[shape]")),
  );
}

// "chevron" and "moon" are valid OOXML preset geometries (pro supports
// them) but NOT in LITE_SUPPORTED_SHAPES. "star12" is the same: valid
// but pro-only. Any of these proves the downgrade path.
const PRO_ONLY_SHAPES = ["chevron", "moon", "star12"] as const;

describe("lite mode shape downgrade", () => {
  for (const shape of PRO_ONLY_SHAPES) {
    it(`shape "${shape}" renders as rect in lite mode and logs a [shape] warning`, async () => {
      const engine = createEngine({ mode: "lite" });
      const warnings = await captureShapeWarnings(async () => {
        const buf = await engine.render(docWithShape(shape));
        const xml = await slide1Xml(buf);
        // Lite output must carry prstGeom prst="rect" — the downgrade target.
        expect(xml).toMatch(/<a:prstGeom\s+prst="rect"/);
        // And must NOT carry the original shape name (except incidentally
        // in a non-prstGeom attribute — the regex below pins the
        // geometry attribute specifically).
        const prstMatch = xml.match(/<a:prstGeom\s+prst="([^"]+)"/);
        expect(prstMatch?.[1]).toBe("rect");
      });
      expect(warnings.some((m) => m.includes(shape))).toBe(true);
    }, 30000);

    it(`shape "${shape}" is preserved (no downgrade) in pro mode`, async () => {
      // The default PaperEngine.render is pro. Use it to contrast.
      const buf = await PaperEngine.render(docWithShape(shape));
      const xml = await slide1Xml(buf);
      expect(xml).toMatch(new RegExp(`<a:prstGeom\\s+prst="${shape}"`));
    }, 30000);
  }

  it("a lite-supported shape (e.g., ellipse) is NOT downgraded", async () => {
    const engine = createEngine({ mode: "lite" });
    const warnings = await captureShapeWarnings(async () => {
      const buf = await engine.render(docWithShape("ellipse"));
      const xml = await slide1Xml(buf);
      expect(xml).toMatch(/<a:prstGeom\s+prst="ellipse"/);
    });
    // Ellipse is in LITE_SUPPORTED_SHAPES — no downgrade warning expected.
    expect(warnings.some((m) => m.includes("ellipse"))).toBe(false);
  }, 30000);
});
