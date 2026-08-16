import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  compareSlidePngs,
  type VisualCompareReport,
} from "../../launchMatrix/helpers/pptxVisualCompare.js";

function ensurePdfToPngAvailable(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isPdfVisualCompareAvailable(): boolean {
  return ensurePdfToPngAvailable();
}

function renderPdfToImages(pdfPath: string, outputDir: string): string[] {
  mkdirSync(outputDir, { recursive: true });
  const prefix = join(outputDir, "slide");
  execFileSync("pdftoppm", ["-png", "-r", "150", pdfPath, prefix], {
    stdio: "ignore",
  });
  return readdirSync(outputDir)
    .filter((file) => file.endsWith(".png"))
    .sort()
    .map((file) => join(outputDir, file));
}

export async function comparePowerPointPdfToGolden(
  pdfPath: string,
  goldenPngDir: string,
  threshold: number = 0.98,
): Promise<VisualCompareReport> {
  const generatedDir = resolve(
    tmpdir(),
    `pptx-desktop-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  renderPdfToImages(pdfPath, generatedDir);
  return compareSlidePngs(goldenPngDir, generatedDir, threshold);
}
