// Archive structure contract: every rendered PPTX must contain the
// required OOXML parts or it won't open in PowerPoint / LibreOffice.
// A subtle regression that stopped emitting, say, theme/theme1.xml
// could make every deck silently un-openable while all other tests
// still pass (a rendered Buffer of the right general shape but
// broken structure).
//
// This test pins the minimum spec: the parts ECMA-376 / ISO-29500
// requires plus the relationship files that wire them together.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine, createEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";

const MINIMAL_AGENT = {
  type: "presentation",
  version: "1.0",
  presentationTitle: "Archive test",
  companyName: "Runstamp",
  slides: [
    { pattern: "title", content: { title: "Hello" } },
  ],
} as const;

const MULTI_SLIDE_AGENT = {
  type: "presentation",
  version: "1.0",
  presentationTitle: "Multi",
  companyName: "Runstamp",
  slides: [
    { pattern: "title", content: { title: "One" } },
    { pattern: "statement", content: { title: "Two", subtitle: "two" } },
    { pattern: "bullets", content: { title: "Three", bulletPoints: ["a", "b", "c"] } },
  ],
} as const;

const MINIMAL_PAPER: PaperDocument = {
  type: "Document",
  meta: { title: "Direct" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Hello",
          style: {
            position: "absolute",
            left: 80,
            top: 80,
            width: 800,
            height: 80,
            fontSize: 36,
          },
        },
      ],
    },
  ],
};

const REQUIRED_PARTS = [
  "[Content_Types].xml",
  "_rels/.rels",
  "ppt/presentation.xml",
  "ppt/_rels/presentation.xml.rels",
  "ppt/theme/theme1.xml",
  "docProps/core.xml",
] as const;

async function assertArchiveShape(
  buffer: Buffer,
  slideCount: number,
): Promise<JSZip> {
  expect(Buffer.isBuffer(buffer)).toBe(true);
  expect(buffer.length).toBeGreaterThan(0);
  const zip = await JSZip.loadAsync(buffer);
  for (const part of REQUIRED_PARTS) {
    expect(zip.file(part), `missing required part: ${part}`).not.toBeNull();
  }
  // Slide parts + per-slide rels
  for (let i = 1; i <= slideCount; i += 1) {
    expect(
      zip.file(`ppt/slides/slide${i}.xml`),
      `missing slide${i}.xml`,
    ).not.toBeNull();
    expect(
      zip.file(`ppt/slides/_rels/slide${i}.xml.rels`),
      `missing slide${i}.xml.rels`,
    ).not.toBeNull();
  }
  return zip;
}

async function collectTextFontSizeAttributes(buffer: Buffer): Promise<Array<{ path: string; value: string }>> {
  const zip = await JSZip.loadAsync(buffer);
  const values: Array<{ path: string; value: string }> = [];
  const xmlPaths = Object.keys(zip.files).filter((path) =>
    !zip.files[path].dir && (path.endsWith(".xml") || path.endsWith(".rels")),
  );
  for (const path of xmlPaths) {
    const xml = await zip.file(path)!.async("string");
    const pattern = /<a:(?:rPr|defRPr)\b[^>]*\ssz="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(xml)) !== null) {
      values.push({ path, value: match[1] });
    }
  }
  return values;
}

describe("PPTX archive structure", () => {
  it("AgentDocument (single slide) emits all required parts", async () => {
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(MINIMAL_AGENT as never);
    const zip = await assertArchiveShape(buf, 1);

    // Content types must declare presentation + slide + theme
    const ct = await zip.file("[Content_Types].xml")!.async("string");
    expect(ct).toMatch(/presentationml\.presentation\.main/);
    expect(ct).toMatch(/presentationml\.slide\+xml/);
    expect(ct).toMatch(/theme\+xml/);
  }, 30000);

  it("AgentDocument (multi-slide) emits one slide part + rels per slide", async () => {
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(MULTI_SLIDE_AGENT as never);
    const zip = await assertArchiveShape(buf, MULTI_SLIDE_AGENT.slides.length);

    // Presentation rels link to each slide
    const presRels = await zip
      .file("ppt/_rels/presentation.xml.rels")!
      .async("string");
    for (let i = 1; i <= MULTI_SLIDE_AGENT.slides.length; i += 1) {
      expect(presRels).toContain(`slides/slide${i}.xml`);
    }
  }, 30000);

  it("Direct PaperDocument input emits the same archive shape", async () => {
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(MINIMAL_PAPER);
    await assertArchiveShape(buf, 1);
  }, 30000);

  it("Core properties part includes the presentation title", async () => {
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(MINIMAL_AGENT as never);
    const zip = await JSZip.loadAsync(buf);
    const coreXml = await zip.file("docProps/core.xml")!.async("string");
    expect(coreXml).toContain("Archive test");
  }, 30000);

  it("Theme part is ECMA-376 conformant (a:theme root, scheme elements)", async () => {
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(MINIMAL_AGENT as never);
    const zip = await JSZip.loadAsync(buf);
    const theme = await zip.file("ppt/theme/theme1.xml")!.async("string");
    expect(theme).toContain("<a:theme");
    expect(theme).toContain("<a:clrScheme");
    expect(theme).toContain("<a:fontScheme");
    expect(theme).toContain("<a:fmtScheme");
  }, 30000);

  it("Package-level _rels/.rels links to the presentation", async () => {
    const engine = createEngine({ mode: "pro" });
    const buf = await engine.render(MINIMAL_AGENT as never);
    const zip = await JSZip.loadAsync(buf);
    const rels = await zip.file("_rels/.rels")!.async("string");
    expect(rels).toMatch(/Target=["']ppt\/presentation\.xml["']/);
  }, 30000);

  it("emits integer OOXML text font-size attributes", async () => {
    const engine = createEngine({ mode: "pro" });
    const fortyPtInPx = 40 * (96 / 72);
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Integer sz regression" },
      slides: [{
        type: "Slide",
        children: [
          {
            type: "Text",
            content: [
              { text: "Large", style: { fontSize: fortyPtInPx } },
              { text: " Small", style: { fontSize: 10 * (96 / 72) } },
            ],
            style: {
              position: "absolute",
              left: 40,
              top: 40,
              width: 460,
              height: 80,
              fontSize: fortyPtInPx,
            },
          },
          {
            type: "Table",
            style: {
              position: "absolute",
              left: 40,
              top: 140,
              width: 360,
              height: 80,
            },
            tableData: {
              columns: [180, 180],
              rows: [{
                cells: [
                  { text: "A", style: { fontSize: fortyPtInPx } },
                  { text: "B", style: { fontSize: 10 * (96 / 72) } },
                ],
              }],
            },
          },
          {
            type: "Chart",
            style: {
              position: "absolute",
              left: 430,
              top: 130,
              width: 440,
              height: 300,
            },
            chartData: {
              chartType: "line",
              categories: ["2024", "2025", "2026"],
              series: [{ name: "Index", values: [80, 96, 121] }],
              title: { text: "Trend", fontSize: 14.5 },
              legend: { position: "bottom", fontSize: 10.5 },
              categoryAxis: { labelFont: { fontSize: 10.5 } },
              valueAxis: { labelFont: { fontSize: 10.5 } },
              annotations: [{
                kind: "text",
                text: "Inflection",
                x: 50,
                y: 18,
                fontSize: 9.5,
              }],
            },
          },
        ],
      }],
    };

    const buf = await engine.render(doc);
    const attrs = await collectTextFontSizeAttributes(buf);
    expect(attrs.length).toBeGreaterThan(0);
    const nonIntegers = attrs.filter(({ value }) => !/^\d+$/.test(value));
    expect(nonIntegers).toEqual([]);
  }, 30000);
});
