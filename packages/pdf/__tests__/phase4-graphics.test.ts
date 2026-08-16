import { inflate } from "pako";
import { PdfEngine } from "../src/engine.js";
import {
  createBorderStylesDocument,
  createCmykDocument,
  createLinearGradientDocument,
  createOpacityDocument,
  createRectFillDocument,
  createRoundedRectDocument,
  createSvgDocument,
  createPhase4SvgFixture,
} from "../scripts/phase4-fixtures.js";

function inflateStreams(pdf: Buffer): string[] {
  const marker = Buffer.from("stream\n", "ascii");
  const lengthMarker = Buffer.from("/Length ", "ascii");
  const streams: string[] = [];
  let searchIndex = 0;

  while (searchIndex < pdf.length) {
    const start = pdf.indexOf(marker, searchIndex);
    if (start < 0) {
      break;
    }
    const lengthStart = pdf.lastIndexOf(lengthMarker, start);
    if (lengthStart < 0) {
      break;
    }

    let cursor = lengthStart + lengthMarker.length;
    let digits = "";
    while (cursor < pdf.length && /\d/.test(String.fromCharCode(pdf[cursor] as number))) {
      digits += String.fromCharCode(pdf[cursor] as number);
      cursor += 1;
    }

    const length = Number(digits);
    const slice = pdf.subarray(start + marker.length, start + marker.length + length);
    try {
      streams.push(Buffer.from(inflate(slice)).toString("utf8"));
    } catch {
      // Ignore non-Flate streams such as JPEG XObjects.
    }
    searchIndex = start + marker.length + length;
  }

  return streams;
}

function contentStream(pdf: Buffer): string {
  const stream = inflateStreams(pdf).find((entry) => entry.includes("Runstamp deterministic content padding"));
  if (!stream) {
    throw new Error("Unable to find inflated content stream");
  }
  return stream;
}

describe("Phase 4 graphics primitives", () => {
  it("renders a filled rectangle with exact re operator geometry", async () => {
    const pdf = await PdfEngine.render(createRectFillDocument());
    const stream = contentStream(pdf);

    expect(stream).toContain("100 500 120 80 re");
    expect(stream).toContain("0.85 0.2 0.2 rg");
    expect(stream).toContain("f");
  });

  it("renders rounded rectangles using cubic curves", async () => {
    const pdf = await PdfEngine.render(createRoundedRectDocument());
    const stream = contentStream(pdf);
    const curveOperators = stream
      .split("\n")
      .filter((line) => line.trimEnd().endsWith(" c"));

    expect(curveOperators).toHaveLength(4);
    expect(stream).not.toContain("80 500 120 80 re");
  });

  it("renders solid, dashed, and dotted border styles", async () => {
    const pdf = await PdfEngine.render(createBorderStylesDocument());
    const stream = contentStream(pdf);

    expect(stream).toContain("[] 0 d");
    expect(stream).toContain("[6 3] 0 d");
    expect(stream).toContain("[1 3] 0 d");
  });

  it("emits ExtGState and CMYK operators for opacity and CMYK fills", async () => {
    const opacityPdf = await PdfEngine.render(createOpacityDocument());
    const cmykPdf = await PdfEngine.render(createCmykDocument());
    const opacityContent = opacityPdf.toString("binary");
    const cmykStream = contentStream(cmykPdf);

    expect(opacityContent).toContain("/ExtGState");
    expect(opacityContent).toContain("/ca 0.5");
    expect(cmykStream).toContain("0.1 0.8 0.2 0 k");
  });

  it("embeds SVG as vector path commands instead of raster images", async () => {
    const pdf = await PdfEngine.render(createSvgDocument(createPhase4SvgFixture()));
    const stream = contentStream(pdf);
    const binary = pdf.toString("binary");

    expect(stream).toContain("re");
    expect(stream).toContain(" l");
    expect(stream).toContain(" c");
    expect(binary).not.toContain("/Subtype /Image");
  });

  it("rejects malformed SVG required numeric attributes instead of defaulting silently", async () => {
    await expect(PdfEngine.render(createSvgDocument(
      '<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="nope" height="24" /></svg>',
    ))).rejects.toThrow(/Invalid SVG numeric attribute rect\.width/);
  });

  it("rejects malformed SVG viewBox values instead of inventing a fallback box", async () => {
    await expect(PdfEngine.render(createSvgDocument(
      '<svg viewBox="0 0 nope 80" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="24" /></svg>',
    ))).rejects.toThrow(/Invalid SVG viewBox/);
  });

  it("rejects 0..255-style RGB components with a normalized component error", async () => {
    await expect(PdfEngine.render({
      pages: [
        {
          graphics: [
            {
              fill: {
                color: { b: 0, g: 0, r: 255, space: "rgb" },
                space: "solid",
              },
              height: 20,
              type: "rect",
              width: 20,
              x: 72,
              y: 720,
            },
          ],
        },
      ],
    } as any, { strict: false })).rejects.toThrow(/rgb\.r must use normalized 0\.\.1 PDF color components/);
  });

  it("creates shading resources for linear gradients", async () => {
    const pdf = await PdfEngine.render(createLinearGradientDocument());
    const binary = pdf.toString("binary");

    expect(binary).toContain("/ShadingType 2");
    expect(binary).toContain("/Shading");
  });
});
