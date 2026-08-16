import { inflateSync } from "node:zlib";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase3Document } from "../src/phase3-render.js";
import {
  PHASE3_EXPECTED_PARAGRAPH_LINES,
  createA4Document,
  createFlexRowDocument,
  createFlexWrapDocument,
  createJustifiedDocument,
  createLetterDocument,
  createNestedContainersDocument,
  createSingleParagraphDocument,
} from "../scripts/phase3-fixtures.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";

function extractFirstContentStream(pdf: Buffer): string {
  const marker = Buffer.from("stream\n", "ascii");
  const endMarker = Buffer.from("\nendstream", "ascii");
  let searchFrom = 0;

  while (searchFrom < pdf.length) {
    const start = pdf.indexOf(marker, searchFrom);
    if (start < 0) {
      break;
    }
    const end = pdf.indexOf(endMarker, start);
    if (end < 0) {
      break;
    }

    const stream = pdf.subarray(start + marker.length, end);
    try {
      const inflated = inflateSync(stream).toString("utf8");
      if (inflated.includes("BT") || inflated.includes(" re")) {
        return inflated;
      }
    } catch {
      // Ignore non-flate or binary streams while scanning for page content.
    }

    searchFrom = end + endMarker.length;
  }

  throw new Error("Unable to locate a page content stream");
}

describe("Phase 3 layout benchmarks", () => {
  let inter: { family: string; source: string };

  beforeAll(async () => {
    const fonts = await ensurePhase2FontFixtures();
    inter = { family: "Inter", source: fonts.inter };
  }, 120_000);

  it("matches the expected line breaks for the single paragraph benchmark", async () => {
    const analysis = await analyzePhase3Document(createSingleParagraphDocument(inter));
    expect(analysis.pages).toHaveLength(1);
    expect(analysis.pages[0]?.texts.map((line) => line.value)).toEqual(PHASE3_EXPECTED_PARAGRAPH_LINES);
  });

  it("keeps justified non-final lines within 0.5pt of the target width", async () => {
    const document = createJustifiedDocument(inter);
    const paragraph = document.children?.[0];
    if (paragraph?.type === "paragraph") paragraph.textAlign = "justify";
    const analysis = await analyzePhase3Document(document);
    const lines = analysis.pages[0]?.texts ?? [];
    expect(lines.length).toBeGreaterThan(2);

    const targetRight = 72 + 320;
    for (const line of lines.slice(0, -1)) {
      const rightEdge = (line.x ?? 0) + (line.width ?? 0) + ((line.wordSpacing ?? 0) * (line.spaceCount ?? 0));
      expect(Math.abs(targetRight - rightEdge)).toBeLessThanOrEqual(0.5);
      expect(line.wordSpacing ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it("lays out two text columns side by side in a flex row", async () => {
    const analysis = await analyzePhase3Document(createFlexRowDocument());
    expect(analysis.pages[0]?.texts).toEqual([
      expect.objectContaining({ value: "Left column text", x: 96, y: 686.4 }),
      expect.objectContaining({ value: "Right column text", x: 300, y: 686.4 }),
    ]);
  });

  it("keeps space-between masthead columns separated", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [{
        type: "container",
        style: { flexDirection: "row", justifyContent: "space-between" },
        children: [
          { type: "heading", level: 1, value: "Cedar Valley Clinical Laboratories", fontSize: 16 },
          { type: "paragraph", value: "FINAL REPORT", fontSize: 11 },
        ],
      }],
    });
    const lines = analysis.pages[0]?.texts ?? [];
    const report = lines.find((line) => line.value === "FINAL REPORT");
    const laboratoryLines = lines.filter((line) => line.value !== "FINAL REPORT");
    expect(report).toBeDefined();
    for (const line of laboratoryLines) {
      expect((line.x ?? 0) + (line.width ?? 0)).toBeLessThanOrEqual((report?.x ?? 0) - 12);
    }
  });

  it("uses compact defaults for unstyled H5 and H6 headings", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        { type: "heading", level: 4, value: "Section" },
        { type: "heading", level: 5, value: "Table total" },
        { type: "heading", level: 6, value: "Footnote total" },
        { type: "heading", level: 5, value: "Explicit total", fontSize: 11 },
      ],
    });

    expect(analysis.pages[0]?.texts).toEqual([
      expect.objectContaining({ fontSize: 12, value: "Section" }),
      expect.objectContaining({ fontSize: 10, value: "Table total" }),
      expect.objectContaining({ fontSize: 9, value: "Footnote total" }),
      expect.objectContaining({ fontSize: 11, value: "Explicit total" }),
    ]);
  });

  it("wraps flex items into multiple rows with stable geometry", async () => {
    const analysis = await analyzePhase3Document(createFlexWrapDocument());
    expect(analysis.pages[0]?.texts).toEqual([
      expect.objectContaining({ value: "Item 1", x: 96, y: 686.4 }),
      expect.objectContaining({ value: "Item 2", x: 216, y: 686.4 }),
      expect.objectContaining({ value: "Item 3", x: 96, y: 640.4 }),
      expect.objectContaining({ value: "Item 4", x: 216, y: 640.4 }),
      expect.objectContaining({ value: "Item 5", x: 96, y: 594.4 }),
    ]);
  });

  it("preserves nested container padding and margin offsets", async () => {
    const analysis = await analyzePhase3Document(createNestedContainersDocument());
    expect(analysis.pages[0]?.texts).toEqual([
      expect.objectContaining({ value: "Nested container text", x: 152, y: 632.4 }),
    ]);
  });

  it("places top-level absolute containers without consuming normal flow height", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        {
          children: [{ type: "paragraph", value: "Body paragraph" }],
          type: "container",
        },
        {
          children: [{ type: "paragraph", value: "Bottom note region" }],
          style: { bottom: 24, left: 12, position: "absolute", width: 220 },
          type: "container",
        },
      ],
    });

    const pageTexts = analysis.pages[0]?.texts ?? [];
    const body = pageTexts.find((entry) => entry.value === "Body paragraph");
    const note = pageTexts.find((entry) => entry.value === "Bottom note region");

    expect(body).toEqual(expect.objectContaining({ x: 72, y: 710.4 }));
    expect(note).toBeTruthy();
    expect((note?.y ?? 0)).toBeLessThan((body?.y ?? 0));
    expect(note?.x).toBe(84);
  });

  it("preserves preformatted whitespace and draws background and foreground graphics deterministically", async () => {
    const document = {
      page: { size: "Letter", margin: 72 },
      children: [
        {
          children: [
            {
              type: "preformatted",
              value: "  if (ready) {\n    run();\n  }",
            },
          ],
          graphics: [
            {
              fill: { color: { b: 0.94, g: 0.96, r: 0.99, space: "rgb" }, space: "solid" },
              height: 64,
              layer: "background",
              type: "rect",
              width: 220,
              x: 0,
              y: 0,
            },
            {
              layer: "foreground",
              stroke: { color: { b: 0.2, g: 0.2, r: 0.2, space: "rgb" }, style: "solid", width: 1.5 },
              type: "line",
              x1: 0,
              x2: 220,
              y1: 0,
              y2: 64,
            },
          ],
          style: { padding: 12, width: 220 },
          type: "container",
        },
      ],
    } as const;
    const [analysis, buffer] = await Promise.all([
      analyzePhase3Document(document),
      PdfEngine.render(document),
    ]);

    const inflated = extractFirstContentStream(buffer);
    expect(analysis.pages[0]?.texts.map((line) => line.value)).toEqual([
      "  if (ready) {",
      "    run();",
      "  }",
    ]);
    expect(inflated).toContain("84 644 220 64 re");
    expect(inflated.indexOf("84 644 220 64 re")).toBeLessThan(inflated.indexOf("BT"));
    expect(inflated.indexOf("BT")).toBeLessThan(inflated.lastIndexOf(" m"));
  });

  it("writes exact A4 and Letter media boxes", async () => {
    const a4Buffer = await PdfEngine.render(createA4Document());
    const letterBuffer = await PdfEngine.render(createLetterDocument());

    expect(a4Buffer.toString("binary")).toContain("/MediaBox [0 0 595.276 841.89]");
    expect(letterBuffer.toString("binary")).toContain("/MediaBox [0 0 612 792]");
  });
});
