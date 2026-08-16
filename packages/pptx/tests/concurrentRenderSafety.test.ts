// Concurrent render safety. Per the architecture audit, RenderContext
// is "load-bearing — per-request isolation prevents cross-request
// contamination in SaaS scenarios". This test exercises that promise:
// N parallel renders with distinct inputs must each produce the right
// output for their own input, with no anchor bleed between them.
//
// #23 (determinism) caught leakage on sequential renders through the
// shared default context. This test caught it in the concurrent case
// where the bug is more severe — two users' decks could interleave.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine, createEngine } from "../src/engine.js";
import { RenderContext, withContext } from "../src/renderContext.js";

const PRESETS = [
  "default-navy",
  "editorial-serif",
  "monochrome",
  "dark-punch",
  "midnight",
  "terminal",
  "editorial-wide",
] as const;

function buildDoc(anchor: string, preset: string): unknown {
  return {
    type: "presentation",
    version: "1.0",
    presentationTitle: `Concurrent ${anchor}`,
    companyName: "Runstamp",
    theme: preset,
    slides: [
      {
        pattern: "title",
        content: { title: anchor, subtitle: `preset=${preset}` },
      },
    ],
  };
}

async function slide1Xml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slide = zip.file("ppt/slides/slide1.xml");
  if (!slide) throw new Error("slide1.xml missing");
  return slide.async("string");
}

describe("concurrent render safety", () => {
  it("7 parallel renders via createEngine produce correct anchor per input", async () => {
    const engine = createEngine({ mode: "pro" });
    const docs = PRESETS.map((preset, i) =>
      buildDoc(`ParallelAnchor-${i}`, preset),
    );

    const buffers = await Promise.all(docs.map((d) => engine.render(d as never)));
    expect(buffers.length).toBe(PRESETS.length);

    const xmls = await Promise.all(buffers.map(slide1Xml));
    for (let i = 0; i < xmls.length; i += 1) {
      const anchor = `ParallelAnchor-${i}`;
      expect(xmls[i], `render ${i}`).toContain(anchor);
      // No other render's anchor should have leaked into this slide.
      for (let j = 0; j < xmls.length; j += 1) {
        if (j === i) continue;
        expect(xmls[i], `render ${i} leaked render ${j}'s anchor`).not.toContain(
          `ParallelAnchor-${j}`,
        );
      }
    }
  }, 60000);

  it("explicit RenderContext per render isolates concurrent work", async () => {
    const docs = PRESETS.map((preset, i) =>
      buildDoc(`CtxAnchor-${i}`, preset),
    );

    const buffers = await Promise.all(
      docs.map((d) => {
        const ctx = new RenderContext({ engineMode: "pro" });
        return withContext(ctx, () => PaperEngine.render(d as never));
      }),
    );

    const xmls = await Promise.all(buffers.map(slide1Xml));
    for (let i = 0; i < xmls.length; i += 1) {
      expect(xmls[i]).toContain(`CtxAnchor-${i}`);
      for (let j = 0; j < xmls.length; j += 1) {
        if (j === i) continue;
        expect(xmls[i]).not.toContain(`CtxAnchor-${j}`);
      }
    }
  }, 60000);

  it("N=12 parallel renders on a single createEngine instance each hit the correct preset", async () => {
    const engine = createEngine({ mode: "pro" });
    const inputs: Array<{ anchor: string; preset: (typeof PRESETS)[number] }> = [];
    for (let i = 0; i < 12; i += 1) {
      inputs.push({ anchor: `HeavyAnchor-${i}`, preset: PRESETS[i % PRESETS.length] });
    }
    const buffers = await Promise.all(
      inputs.map(({ anchor, preset }) => engine.render(buildDoc(anchor, preset) as never)),
    );
    const xmls = await Promise.all(buffers.map(slide1Xml));
    for (let i = 0; i < xmls.length; i += 1) {
      expect(xmls[i], `render ${i}`).toContain(inputs[i].anchor);
    }
  }, 120000);
});
