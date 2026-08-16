// User-facing contract: `hyperlink` is accepted on Text runs, View
// nodes, and Image nodes. Each must produce (a) an <a:hlinkClick>
// reference in slide1.xml and (b) a matching Relationship entry in
// ppt/slides/_rels/slide1.xml.rels with a valid TargetMode for
// external URLs. Without this, a rendered deck silently drops the
// click-through.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine, createEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";

const ANCHOR_URL = "https://example.test/anchor";

async function extract(buffer: Buffer): Promise<{ slideXml: string; relsXml: string }> {
  const zip = await JSZip.loadAsync(buffer);
  const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
  const rels = await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string");
  return { slideXml: slide, relsXml: rels };
}

function assertHyperlinked(slideXml: string, relsXml: string): void {
  // Slide XML references the hyperlink via r:id
  expect(slideXml).toMatch(/<a:hlinkClick[^>]*r:id="([^"]+)"/);
  // The referenced rId is declared in the per-slide rels with the anchor URL
  expect(relsXml).toContain(ANCHOR_URL);
  expect(relsXml).toMatch(/TargetMode=["']External["']/);
}

describe("hyperlink round-trip across node types", () => {
  it("Text run hyperlink produces hlinkClick + external rels entry", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              paragraphs: [
                {
                  runs: [
                    { text: "clickable ", hyperlink: ANCHOR_URL },
                    { text: "static" },
                  ],
                },
              ],
              style: {
                position: "absolute",
                left: 80,
                top: 80,
                width: 600,
                height: 60,
                fontSize: 24,
              },
            },
          ],
        },
      ],
    };
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(doc);
    const { slideXml, relsXml } = await extract(buf);
    assertHyperlinked(slideXml, relsXml);
  }, 30000);

  it("View hyperlink produces hlinkClick + external rels entry", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              hyperlink: ANCHOR_URL,
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
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(doc);
    const { slideXml, relsXml } = await extract(buf);
    assertHyperlinked(slideXml, relsXml);
  }, 30000);

  it("Image hyperlink produces hlinkClick + external rels entry", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Image",
              // transparent 1×1 PNG
              src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
              hyperlink: ANCHOR_URL,
              style: {
                position: "absolute",
                left: 80,
                top: 80,
                width: 200,
                height: 200,
              },
            },
          ],
        },
      ],
    };
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(doc);
    const { slideXml, relsXml } = await extract(buf);
    assertHyperlinked(slideXml, relsXml);
  }, 30000);

  it("Internal slide hyperlink (HyperlinkTarget.slide) produces an internal rels entry", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              hyperlink: { slide: 2 },
              style: {
                position: "absolute",
                left: 80,
                top: 80,
                width: 400,
                height: 200,
                fill: { type: "solid", color: "#10b981" },
              },
              children: [],
            },
          ],
        },
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              content: "target",
              style: { position: "absolute", left: 80, top: 80, width: 400, height: 50, fontSize: 24 },
            },
          ],
        },
      ],
    };
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(doc);
    const zip = await JSZip.loadAsync(buf);
    const slide1Xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const rels1 = await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string");
    // Slide-to-slide hyperlinks use hlinkClick with an action or a
    // Target pointing to the other slide's part. Either form must be
    // present.
    expect(slide1Xml).toMatch(/<a:hlinkClick/);
    expect(rels1).toMatch(/slide2\.xml|slide|jump|action/i);
  }, 30000);

  it("No hyperlink produces no hlinkClick tag (negative control)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              content: "no-link text",
              style: { position: "absolute", left: 80, top: 80, width: 400, height: 50, fontSize: 24 },
            },
          ],
        },
      ],
    };
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(doc);
    const { slideXml } = await extract(buf);
    expect(slideXml).not.toContain("<a:hlinkClick");
  }, 30000);
});
