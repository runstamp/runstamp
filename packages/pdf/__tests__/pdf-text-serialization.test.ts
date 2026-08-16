import { inflateSync } from "node:zlib";
import { resolve } from "node:path";

import {
  assertExplicitWordSpacingOperators,
  renderPdfPages,
} from "../src/pdf-renderer.js";

function extractPageContent(pdf: Buffer): string {
  const streamMarker = Buffer.from("stream\n", "ascii");
  const endMarker = Buffer.from("\nendstream", "ascii");
  let searchFrom = 0;

  while (searchFrom < pdf.length) {
    const start = pdf.indexOf(streamMarker, searchFrom);
    if (start < 0) break;
    const end = pdf.indexOf(endMarker, start + streamMarker.length);
    if (end < 0) break;
    try {
      const content = inflateSync(pdf.subarray(start + streamMarker.length, end)).toString("utf8");
      if (content.includes("Runstamp deterministic content padding")) return content;
    } catch {
      // Font programs and image streams are not page-content streams.
    }
    searchFrom = end + endMarker.length;
  }

  throw new Error("Unable to locate the PDF page content stream");
}

function textObjects(content: string): string[] {
  return content.match(/BT\n[\s\S]*?\nET/gu) ?? [];
}

function expectEveryTextObjectToSetWordSpacing(content: string): string[] {
  const objects = textObjects(content);
  expect(objects.length).toBeGreaterThan(0);
  for (const object of objects) {
    expect(object.match(/^-?(?:\d+\.?\d*|\.\d+) Tw$/gmu)).toHaveLength(1);
  }
  return objects;
}

describe("PDF text word-spacing serialization", () => {
  it("scopes an explicit text fill color around each text command", async () => {
    const pdf = await renderPdfPages({
      deterministic: true,
      pages: [{
        height: 200,
        width: 300,
        texts: [{
          color: { space: "rgb", r: 1, g: 1, b: 1 },
          font: "Helvetica",
          fontSize: 18,
          value: "White on dark",
          x: 20,
          y: 160,
        }],
      }],
    });

    const content = extractPageContent(pdf);
    expect(content).toContain("q\n1 1 1 rg\nBT");
    expect(content).toContain("\nET\nQ");
  });

  it("rejects a deliberately state-leaking text object", () => {
    expect(() => assertExplicitWordSpacingOperators("BT\n/F1 12 Tf\n(Leaked spacing) Tj\nET"))
      .toThrow(/explicit Tw/);
  });

  it("writes Tw for nonzero and zero built-in-font text objects", async () => {
    const pdf = await renderPdfPages({
      deterministic: true,
      pages: [{
        height: 200,
        width: 300,
        texts: [
          { font: "Helvetica", fontSize: 12, value: "A B", wordSpacing: 2.5, x: 20, y: 160 },
          { font: "Helvetica", fontSize: 12, value: "C D", wordSpacing: 0, x: 20, y: 130 },
        ],
      }],
    });

    const objects = expectEveryTextObjectToSetWordSpacing(extractPageContent(pdf));
    expect(objects).toHaveLength(2);
    expect(objects[0]).toContain("2.5 Tw");
    expect(objects[1]).toContain("0 Tw");
  });

  it("resets Tw in every built-in fallback fragment", async () => {
    const pdf = await renderPdfPages({
      deterministic: true,
      pages: [{
        height: 200,
        width: 300,
        texts: [{ font: "Helvetica", fontSize: 12, value: "Before ≥ after", wordSpacing: 3, x: 20, y: 160 }],
      }],
    });

    const objects = expectEveryTextObjectToSetWordSpacing(extractPageContent(pdf));
    expect(objects.length).toBeGreaterThanOrEqual(3);
    expect(objects.some((object) => object.includes("3 Tw"))).toBe(true);
    expect(objects.some((object) => object.includes("0 Tw"))).toBe(true);
  });

  it("writes Tw for every embedded-font text object, including zero", async () => {
    const font = {
      family: "Lato",
      source: resolve(import.meta.dirname, "../fixtures/fonts/Lato-Regular.ttf"),
    };
    const pdf = await renderPdfPages({
      deterministic: true,
      pages: [{
        height: 200,
        width: 300,
        texts: [
          { font, fontSize: 12, value: "Embedded words", wordSpacing: 1.75, x: 20, y: 160 },
          { font, fontSize: 12, value: "Reset spacing", wordSpacing: 0, x: 20, y: 130 },
        ],
      }],
    });

    const objects = expectEveryTextObjectToSetWordSpacing(extractPageContent(pdf));
    expect(objects).toHaveLength(2);
    expect(objects[0]).toContain("1.75 Tw");
    expect(objects[1]).toContain("0 Tw");
  });
});
