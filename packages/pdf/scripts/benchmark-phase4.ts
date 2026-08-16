import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { inflate } from "pako";
import { PdfEngine } from "../src/engine.js";
import {
  createAlphaPngBuffer,
  createBorderStylesDocument,
  createCmykDocument,
  createJpegDocument,
  createLargeJpegBuffer,
  createLinearGradientDocument,
  createOpacityDocument,
  createPngAlphaDocument,
  createRadialGradientDocument,
  createRectFillDocument,
  createRoundedRectDocument,
  createSmallJpegBuffer,
  createSvgDocument,
  createSvgSample,
} from "./phase4-fixtures.js";

interface BenchmarkResult {
  detail: string;
  name: string;
  pass: boolean;
}

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(packageRoot(), "output", "phase4");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function benchmarkResult(name: string, pass: boolean, detail: string): BenchmarkResult {
  return { name, pass, detail };
}

async function writePdfArtifact(name: string, document: Parameters<typeof PdfEngine.render>[0]): Promise<{ buffer: Buffer; path: string }> {
  const path = join(outputDir(), `${name}.pdf`);
  const buffer = await PdfEngine.render(document);
  writeFileSync(path, buffer);
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  }
  return { buffer, path };
}

function rasterize(pdfPath: string, baseName: string): PNG {
  const prefix = join(outputDir(), baseName);
  execFileSync("pdftoppm", ["-png", "-r", "72", "-singlefile", "-f", "1", "-l", "1", pdfPath, prefix], {
    stdio: "pipe",
  });
  return PNG.sync.read(readFileSync(`${prefix}.png`));
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

async function main(): Promise<void> {
  if (!hasBinary("pdftoppm")) {
    throw new Error("Phase 4 benchmarks require pdftoppm to be installed");
  }

  const start = performance.now();
  mkdirSync(outputDir(), { recursive: true });

  const smallJpeg = createSmallJpegBuffer();
  const largeJpeg = createLargeJpegBuffer();
  const alphaPng = createAlphaPngBuffer();
  const svg = createSvgSample();

  const rectFill = await writePdfArtifact("gfx-rect-fill", createRectFillDocument());
  const rectRounded = await writePdfArtifact("gfx-rect-rounded", createRoundedRectDocument());
  const borderStyles = await writePdfArtifact("gfx-border-styles", createBorderStylesDocument());
  const opacity = await writePdfArtifact("gfx-opacity", createOpacityDocument());
  const cmyk = await writePdfArtifact("gfx-cmyk-color", createCmykDocument());
  const jpegPass = await writePdfArtifact("img-jpeg-passthrough", createJpegDocument(smallJpeg));
  const jpegLarge = await writePdfArtifact("img-jpeg-filesize", createJpegDocument(largeJpeg));
  const pngAlpha = await writePdfArtifact("img-png-alpha", createPngAlphaDocument(alphaPng));
  const svgVector = await writePdfArtifact("svg-vector-embed", createSvgDocument(svg));
  const linear = await writePdfArtifact("gfx-gradient-linear", createLinearGradientDocument());
  const radial = await writePdfArtifact("gfx-gradient-radial", createRadialGradientDocument());

  const rectPng = rasterize(rectFill.path, "gfx-rect-fill");
  const roundedPng = rasterize(rectRounded.path, "gfx-rect-rounded");
  const opacityPng = rasterize(opacity.path, "gfx-opacity");
  const pngAlphaRaster = rasterize(pngAlpha.path, "img-png-alpha");
  const svgRaster = rasterize(svgVector.path, "svg-vector-embed");
  const linearRaster = rasterize(linear.path, "gfx-gradient-linear");
  const radialRaster = rasterize(radial.path, "gfx-gradient-radial");

  const rectCenter = samplePngAtPdfPoint(rectPng, 160, 540);
  const roundedCorner = samplePngAtPdfPoint(roundedPng, 82, 578);
  const roundedInside = samplePngAtPdfPoint(roundedPng, 94, 568);
  const opacityCenter = samplePngAtPdfPoint(opacityPng, 120, 540);
  const alphaCenter = samplePngAtPdfPoint(pngAlphaRaster, 136, 564);
  const linearLeft = samplePngAtPdfPoint(linearRaster, 86, 545);
  const linearRight = samplePngAtPdfPoint(linearRaster, 238, 545);
  const radialCenter = samplePngAtPdfPoint(radialRaster, 162, 545);
  const radialEdge = samplePngAtPdfPoint(radialRaster, 88, 545);
  const borderStream = contentStream(borderStyles.buffer);
  const cmykStream = contentStream(cmyk.buffer);
  const svgStream = contentStream(svgVector.buffer);

  const results: BenchmarkResult[] = [
    benchmarkResult("gfx-rect-fill", rectCenter.r > 180 && rectCenter.g < 90 && rectCenter.b < 90, `center=${JSON.stringify(rectCenter)}`),
    benchmarkResult("gfx-rect-rounded", roundedCorner.r > 220 && roundedInside.b > 180, `corner=${JSON.stringify(roundedCorner)} inside=${JSON.stringify(roundedInside)}`),
    benchmarkResult(
      "gfx-border-styles",
      borderStream.includes("[] 0 d") &&
        borderStream.includes("[6 3] 0 d") &&
        borderStream.includes("[1 3] 0 d"),
      "dash operators present for solid/dashed/dotted borders",
    ),
    benchmarkResult("gfx-opacity", opacityCenter.r > 90 && opacityCenter.b > 90, `center=${JSON.stringify(opacityCenter)}`),
    benchmarkResult("gfx-cmyk-color", cmykStream.includes("0.1 0.8 0.2 0 k"), "content stream contains DeviceCMYK fill operator"),
    benchmarkResult("img-jpeg-passthrough", jpegPass.buffer.indexOf(smallJpeg) >= 0, `jpeg_bytes=${smallJpeg.length}`),
    benchmarkResult("img-jpeg-filesize", largeJpeg.length >= 500_000 && jpegLarge.buffer.length < largeJpeg.length + 20_000, `jpeg=${largeJpeg.length} pdf=${jpegLarge.buffer.length}`),
    benchmarkResult("img-png-alpha", alphaCenter.r > 120 && alphaCenter.b > 80, `center=${JSON.stringify(alphaCenter)}`),
    benchmarkResult("img-png-predictor", pngAlpha.buffer.toString("binary").includes("/Predictor 15"), "png image stream uses predictor 15"),
    benchmarkResult(
      "svg-vector-embed",
      svgStream.includes(" m") &&
        svgStream.includes(" l") &&
        svgStream.includes(" c") &&
        !svgVector.buffer.toString("binary").includes("/Subtype /Image") &&
        svgRaster.data.some((value) => value !== 255),
      "vector commands present and raster output is non-empty",
    ),
    benchmarkResult("gfx-gradient-linear", Math.abs(linearLeft.r - linearRight.r) > 40, `left=${JSON.stringify(linearLeft)} right=${JSON.stringify(linearRight)}`),
    benchmarkResult("gfx-gradient-radial", Math.abs(radialCenter.b - radialEdge.b) > 40, `center=${JSON.stringify(radialCenter)} edge=${JSON.stringify(radialEdge)}`),
  ];

  results.forEach((result) => {
    console.log(`${result.pass ? "PASS" : "FAIL"} ${result.name} ${result.detail}`);
  });

  console.log(`artifact_dir=${outputDir()}`);
  console.log(`render_ms=${(performance.now() - start).toFixed(2)}`);

  const failed = results.filter((result) => !result.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 4 benchmark failures: ${failed.map((result) => result.name).join(", ")}`);
  }
}

void main();
