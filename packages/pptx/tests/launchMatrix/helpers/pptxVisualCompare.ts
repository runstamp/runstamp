/**
 * PPTX Visual Comparison helper.
 * Renders PPTX slides to PNG images via LibreOffice + pdftoppm,
 * then compares against golden master PNGs using byte-level similarity.
 */

import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlideComparison {
  slideIndex: number;
  similarity: number; // 0–1
  diffPixels: number;
  totalPixels: number;
}

export interface VisualCompareReport {
  slides: SlideComparison[];
  overallSimilarity: number;
  passed: boolean; // all slides >= threshold
}

// ---------------------------------------------------------------------------
// Tool availability
// ---------------------------------------------------------------------------

/** Check if required tools (LibreOffice + pdftoppm) are available */
export function isVisualToolsAvailable(): boolean {
  try {
    execSync("libreoffice --version", { stdio: "pipe" });
    // pdftoppm -v writes to stderr; execSync only throws on non-zero exit
    execSync("which pdftoppm", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PPTX → PNG rendering
// ---------------------------------------------------------------------------

/**
 * Render PPTX to per-slide PNG images using LibreOffice -> PDF -> pdftoppm.
 * @returns Sorted array of PNG file paths (one per slide).
 */
export async function renderPptxToImages(buffer: Buffer, outputDir: string): Promise<string[]> {
  mkdirSync(outputDir, { recursive: true });

  const tmpDir = join(tmpdir(), `pptx-visual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tmpDir, { recursive: true });

  const pptxPath = join(tmpDir, "presentation.pptx");
  writeFileSync(pptxPath, buffer);

  try {
    // Step 1: PPTX → PDF via LibreOffice
    execSync(
      `libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${pptxPath}"`,
      { stdio: "pipe", timeout: 60_000 },
    );

    // Find the generated PDF
    const pdfFiles = readdirSync(tmpDir).filter(f => f.endsWith(".pdf"));
    if (pdfFiles.length === 0) {
      throw new Error("LibreOffice produced no PDF output");
    }
    const pdfPath = join(tmpDir, pdfFiles[0]);

    // Step 2: PDF → PNGs via pdftoppm
    const slidePrefix = join(outputDir, "slide");
    execSync(
      `pdftoppm -png -r 150 "${pdfPath}" "${slidePrefix}"`,
      { stdio: "pipe", timeout: 60_000 },
    );

    // Collect and sort output PNGs
    const pngs = readdirSync(outputDir)
      .filter(f => f.startsWith("slide") && f.endsWith(".png"))
      .sort();

    return pngs.map(f => join(outputDir, f));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Pixel comparison
// ---------------------------------------------------------------------------

/**
 * Compare two PNG files using byte-level similarity.
 * Returns the ratio of matching bytes to total bytes.
 * This is a lightweight comparison that does not require pixelmatch.
 */
function comparePngBuffers(
  golden: Buffer,
  generated: Buffer,
): { similarity: number; diffPixels: number; totalPixels: number } {
  // Use the shorter buffer length as the comparison range
  const minLen = Math.min(golden.length, generated.length);
  const maxLen = Math.max(golden.length, generated.length);

  if (maxLen === 0) {
    return { similarity: 1, diffPixels: 0, totalPixels: 0 };
  }

  let matchingBytes = 0;
  for (let i = 0; i < minLen; i++) {
    if (golden[i] === generated[i]) {
      matchingBytes++;
    }
  }

  // Bytes beyond the shorter buffer count as differences
  const totalBytes = maxLen;
  const diffBytes = totalBytes - matchingBytes;

  // Approximate pixel count (PNG compressed, so this is a rough estimate)
  // We report byte-level diff as a proxy for pixel diff
  return {
    similarity: matchingBytes / totalBytes,
    diffPixels: diffBytes,
    totalPixels: totalBytes,
  };
}

/**
 * Compare two directories of slide PNGs using byte-level comparison.
 * @param goldenDir  Directory containing golden master PNGs
 * @param generatedDir  Directory containing newly generated PNGs
 * @param threshold  Minimum similarity score to pass (default 0.98)
 */
export async function compareSlidePngs(
  goldenDir: string,
  generatedDir: string,
  threshold: number = 0.98,
): Promise<VisualCompareReport> {
  if (!existsSync(goldenDir)) {
    throw new Error(`Golden PNG directory does not exist: ${goldenDir}`);
  }
  if (!existsSync(generatedDir)) {
    throw new Error(`Generated PNG directory does not exist: ${generatedDir}`);
  }

  const goldenFiles = readdirSync(goldenDir)
    .filter(f => f.endsWith(".png"))
    .sort();
  const generatedFiles = readdirSync(generatedDir)
    .filter(f => f.endsWith(".png"))
    .sort();

  // Match files by index position (slide-01.png, slide-02.png, etc.)
  const slideCount = Math.max(goldenFiles.length, generatedFiles.length);

  if (slideCount === 0) {
    return { slides: [], overallSimilarity: 1, passed: true };
  }

  const slides: SlideComparison[] = [];

  for (let i = 0; i < slideCount; i++) {
    if (i >= goldenFiles.length || i >= generatedFiles.length) {
      // Missing slide on one side — total mismatch
      slides.push({ slideIndex: i, similarity: 0, diffPixels: 1, totalPixels: 1 });
      continue;
    }

    const goldenBuf = readFileSync(join(goldenDir, goldenFiles[i]));
    const genBuf = readFileSync(join(generatedDir, generatedFiles[i]));
    const result = comparePngBuffers(goldenBuf, genBuf);

    slides.push({
      slideIndex: i,
      similarity: result.similarity,
      diffPixels: result.diffPixels,
      totalPixels: result.totalPixels,
    });
  }

  const overallSimilarity =
    slides.length > 0
      ? slides.reduce((sum, s) => sum + s.similarity, 0) / slides.length
      : 1;

  const passed = slides.every(s => s.similarity >= threshold);

  return { slides, overallSimilarity, passed };
}
