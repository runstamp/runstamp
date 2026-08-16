import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";

const EMU_PER_POINT = 12_700;
const CANONICAL_ADVANCE_PT = 47.91;
const REQUIRED_INTRINSIC_WIDTH_FACTOR = 1.03;

async function firstSlideXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("ppt/slides/slide1.xml")!.async("string");
}

function shapeContaining(xml: string, text: string): string {
  const shapes = xml.match(/<p:sp>.*?<\/p:sp>/gs) ?? [];
  const shape = shapes.find((candidate) => candidate.includes(`<a:t>${text}</a:t>`));
  if (!shape) throw new Error(`Text shape for ${text} was not emitted.`);
  return shape;
}

function emittedWidthPt(shapeXml: string): number {
  const cx = Number(shapeXml.match(/<a:ext cx="(\d+)" cy="\d+"\/>/)?.[1]);
  if (!Number.isFinite(cx)) throw new Error("Text shape extent was not emitted.");
  return cx / EMU_PER_POINT;
}

async function renderKpiValues(values: string[]): Promise<string> {
  return firstSlideXml(await PaperEngine.render({
    type: "presentation",
    version: "1.0",
    presentationTitle: "VQH-026 regression",
    designTokens: {
      typography: {
        titleFontFamily: "Carlito",
        bodyFontFamily: "Carlito",
        kpiValueSize: 26,
      },
    },
    slides: [{
      pattern: "dashboard",
      content: {
        title: "Executive compensation",
        kpis: values.map((value, index) => ({
          label: `Metric ${index + 1}`,
          value,
          sublabel: "Target allocation",
        })),
      },
    }],
  }));
}

describe("VQH-026 — zero-slack shrink-wrapped text", () => {
  it("adds 3% renderer slack and disables wrapping for the canonical Carlito Bold 19.5pt KPI value", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "View",
          style: {
            width: 900,
            height: 110,
            alignItems: "center",
            justifyContent: "center",
          },
          children: [{
            type: "Text",
            content: "75/25",
            style: {
              fontFamily: "Carlito",
              fontWeight: "bold",
              fontSize: 26,
              textInsets: { left: 0, top: 0, right: 0, bottom: 0 },
            },
          }],
        }],
      }],
    };
    const xml = await firstSlideXml(await PaperEngine.render(doc));
    const shape = shapeContaining(xml, "75/25");

    expect(shape).toContain("<a:t>75/25</a:t>");
    expect(shape).not.toContain("\u200B");
    expect(shape).not.toContain("…");
    expect(shape).toMatch(/<a:rPr\b[^>]*\bsz="1950"[^>]*\bb="1"/);
    expect(shape).toContain('typeface="Carlito"');
    expect(emittedWidthPt(shape)).toBeGreaterThanOrEqual(
      CANONICAL_ADVANCE_PT * REQUIRED_INTRINSIC_WIDTH_FACTOR,
    );
    expect(shape).toMatch(/<a:bodyPr\b[^>]*\bwrap="none"/);
  });

  it("preserves every KPI value exactly without break-anywhere or truncation markers", async () => {
    const values = ["225%", "75/25", "$7.24M", "CEO LTI mix"];
    const xml = await renderKpiValues(values);

    for (const value of values) {
      expect(xml).toContain(`<a:t>${value}</a:t>`);
    }
    expect(xml).not.toContain("\u200B");
    expect(xml).not.toContain("…");
  });

  it("keeps an externally constrained title at 685.5pt with square wrapping", async () => {
    const constrainedWidthPx = 914;
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "Grid-sized title",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: constrainedWidthPx,
            height: 40,
            fontFamily: "Carlito",
            fontSize: 24,
          },
        }],
      }],
    };

    const xml = await firstSlideXml(await PaperEngine.render(doc));
    const shape = shapeContaining(xml, "Grid-sized title");

    expect(emittedWidthPt(shape)).toBe(685.5);
    expect(shape).toMatch(/<a:bodyPr\b[^>]*\bwrap="square"/);
  });
});
