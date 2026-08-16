import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { inflate } from "pako";
import { PdfEngine } from "../src/engine.js";
import {
  createAlphaPngBuffer,
  createJpegDocument,
  createLargeJpegBuffer,
  createPngAlphaDocument,
  createSmallJpegBuffer,
  createSvgDocument,
  createSvgSample,
} from "../scripts/phase4-fixtures.js";

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function rasterize(pdf: Buffer): PNG {
  if (!hasBinary("pdftoppm")) {
    throw new Error("pdftoppm is required for Phase 4 raster checks");
  }

  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-phase4-"));
  const pdfPath = join(tempDir, "test.pdf");
  const outputPrefix = join(tempDir, "page");

  try {
    writeFileSync(pdfPath, pdf);
    execFileSync("pdftoppm", ["-png", "-r", "72", "-singlefile", "-f", "1", "-l", "1", pdfPath, outputPrefix], {
      stdio: "pipe",
    });
    return PNG.sync.read(readFileSync(`${outputPrefix}.png`));
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function samplePngAtPdfPoint(png: PNG, x: number, y: number): { b: number; g: number; r: number } {
  const px = Math.max(0, Math.min(png.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(png.height - 1, png.height - 1 - Math.round(y)));
  const offset = (py * png.width + px) * 4;
  return {
    r: png.data[offset] as number,
    g: png.data[offset + 1] as number,
    b: png.data[offset + 2] as number,
  };
}

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

describe("Phase 4 image and SVG embedding", () => {
  it("passes JPEG bytes through without re-encoding", async () => {
    const jpeg = createSmallJpegBuffer();
    const pdf = await PdfEngine.render(createJpegDocument(jpeg));
    expect(pdf.indexOf(jpeg)).toBeGreaterThanOrEqual(0);
  });

  it("keeps PDF overhead small for a large JPEG", async () => {
    const jpeg = createLargeJpegBuffer();
    const pdf = await PdfEngine.render(createJpegDocument(jpeg));
    expect(jpeg.length).toBeGreaterThan(500_000);
    expect(pdf.length).toBeLessThan(jpeg.length + 20_000);
  }, 120_000);

  it("embeds PNG alpha with predictor data and visible transparency", async () => {
    const pngBuffer = createAlphaPngBuffer();
    const pdf = await PdfEngine.render(createPngAlphaDocument(pngBuffer));
    const content = pdf.toString("binary");
    expect(content).toContain("/Predictor 15");
    const raster = rasterize(pdf);
    const center = samplePngAtPdfPoint(raster, 136, 564);
    expect(center.r).toBeGreaterThan(120);
    expect(center.b).toBeGreaterThan(80);
  });

  it("embeds SVG as vector path commands instead of raster images", async () => {
    const pdf = await PdfEngine.render(createSvgDocument(createSvgSample()));
    const stream = contentStream(pdf);
    const binary = pdf.toString("binary");
    expect(stream).toContain(" m");
    expect(stream).toContain(" l");
    expect(stream).toContain(" c");
    expect(binary).not.toContain("/Subtype /Image");
  });
});
