import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { PdfEngine } from "../src/engine.js";
import {
  createJpegDocument,
  createLinearGradientDocument,
  createPhase4LargeJpegBuffer,
  createPhase4PngAlphaBuffer,
  createPhase4SmallJpegBuffer,
  createPngDocument,
  createRadialGradientDocument,
} from "../scripts/phase4-fixtures.js";

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function withRaster<T>(pdf: Buffer, name: string, run: (png: PNG) => T): T {
  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-phase4-"));
  const pdfPath = join(tempDir, `${name}.pdf`);
  const prefix = join(tempDir, name);

  try {
    writeFileSync(pdfPath, pdf);
    execFileSync("pdftoppm", ["-png", "-r", "72", "-singlefile", "-f", "1", "-l", "1", pdfPath, prefix], {
      stdio: "pipe",
    });
    return run(PNG.sync.read(readFileSync(`${prefix}.png`)));
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function samplePixel(png: PNG, x: number, yFromBottom: number): { b: number; g: number; r: number } {
  const y = png.height - yFromBottom;
  const offset = (png.width * y + x) * 4;
  return {
    r: png.data[offset] as number,
    g: png.data[offset + 1] as number,
    b: png.data[offset + 2] as number,
  };
}

describe("Phase 4 images and gradients", () => {
  it("passes JPEG bytes through with DCTDecode and minimal overhead", async () => {
    const smallJpeg = createPhase4SmallJpegBuffer();
    const pdf = await PdfEngine.render(createJpegDocument(smallJpeg));
    expect(pdf.indexOf(smallJpeg)).toBeGreaterThan(-1);
    expect(pdf.toString("binary")).toContain("/Filter /DCTDecode");

    const largeJpeg = createPhase4LargeJpegBuffer();
    const largePdf = await PdfEngine.render(createJpegDocument(largeJpeg));
    expect(largeJpeg.length).toBeGreaterThanOrEqual(500_000);
    expect(largePdf.length).toBeLessThan(largeJpeg.length + 20_000);
  }, 120_000);

  it("embeds PNG images with predictor filters and a soft mask", async () => {
    const png = createPhase4PngAlphaBuffer();
    const pdf = await PdfEngine.render(createPngDocument(png));
    const binary = pdf.toString("binary");

    expect(binary).toContain("/Subtype /Image");
    expect(binary).toContain("/Predictor 15");
    expect(binary).toContain("/SMask");
  });

  it("composites PNG alpha and gradients correctly when pdftoppm is available", async () => {
    if (!hasBinary("pdftoppm")) {
      return;
    }

    const pngPdf = await PdfEngine.render(createPngDocument(createPhase4PngAlphaBuffer()));
    const linearPdf = await PdfEngine.render(createLinearGradientDocument());
    const radialPdf = await PdfEngine.render(createRadialGradientDocument());

    withRaster(pngPdf, "png-alpha", (png) => {
      const blended = samplePixel(png, 136, 564);
      expect(blended.r).toBeGreaterThan(120);
      expect(blended.b).toBeGreaterThan(80);
    });

    withRaster(linearPdf, "linear-gradient", (png) => {
      const left = samplePixel(png, 86, 545);
      const right = samplePixel(png, 238, 545);
      expect(Math.abs(left.r - right.r)).toBeGreaterThan(40);
      expect(Math.abs(left.b - right.b)).toBeGreaterThan(40);
    });

    withRaster(radialPdf, "radial-gradient", (png) => {
      const center = samplePixel(png, 162, 545);
      const edge = samplePixel(png, 88, 545);
      expect(Math.abs(center.r - edge.r)).toBeGreaterThan(40);
      expect(Math.abs(center.b - edge.b)).toBeGreaterThan(40);
    });
  });
});
