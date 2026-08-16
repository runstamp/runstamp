/**
 * Oracle Round-Trip validation helper.
 * Sends a Runstamp-generated PPTX through LibreOffice headless and diffs the result
 * to detect structural corruption that a real PPTX consumer would reject or mangle.
 */

import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import JSZip from "jszip";
import { parseXml, getZipPaths, getZipEntry } from "../../helpers/xmlTestUtils.js";

// ---------------------------------------------------------------------------
// LibreOffice availability
// ---------------------------------------------------------------------------

/** Check if LibreOffice is available on PATH */
export function isLibreOfficeAvailable(): boolean {
  try {
    execSync("libreoffice --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoundTripDiff {
  file: string;
  type: "added" | "removed" | "modified";
  category: "structural" | "chart" | "formatting" | "harmless";
}

export interface RoundTripReport {
  original: { fileCount: number; paths: string[] };
  roundTripped: { fileCount: number; paths: string[] };
  diffs: RoundTripDiff[];
  unknownStructural: RoundTripDiff[];
  passed: boolean;
}

// ---------------------------------------------------------------------------
// Round-trip via LibreOffice
// ---------------------------------------------------------------------------

/**
 * Round-trip a PPTX buffer through LibreOffice headless.
 * Writes temp file, converts via `libreoffice --headless --convert-to pptx`, reads back.
 */
export async function roundTripViaLibreOffice(buffer: Buffer): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `pptx-oracle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tmpDir, { recursive: true });
  const inputPath = join(tmpDir, "input.pptx");
  writeFileSync(inputPath, buffer);

  try {
    execSync(
      `libreoffice --headless --convert-to pptx --outdir "${tmpDir}" "${inputPath}"`,
      { stdio: "pipe", timeout: 60_000 },
    );

    // LibreOffice may output with the same name or a slightly different one.
    // Search for any .pptx in the output dir that is NOT the input file.
    const outputFiles = readdirSync(tmpDir).filter(f => f.endsWith(".pptx"));
    if (outputFiles.length === 0) {
      throw new Error("LibreOffice produced no .pptx output");
    }

    // Prefer a file that isn't the original input (in case LO overwrites)
    const outputName = outputFiles.length > 1
      ? outputFiles.find(f => f !== "input.pptx") ?? outputFiles[0]
      : outputFiles[0];

    const outputPath = join(tmpDir, outputName);
    return readFileSync(outputPath);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Diff engine
// ---------------------------------------------------------------------------

/**
 * Categorize a file path into a semantic bucket.
 */
export function categorizeChange(filePath: string): "structural" | "chart" | "formatting" | "harmless" {
  if (filePath === "[Content_Types].xml" || filePath.endsWith(".rels")) return "structural";
  if (filePath.includes("ppt/charts/")) return "chart";
  if (
    filePath.includes("ppt/slides/") ||
    filePath.includes("ppt/slideLayouts/") ||
    filePath.includes("ppt/slideMasters/")
  ) {
    return "formatting";
  }
  if (filePath.includes("docProps/") || filePath.includes("ppt/presProps") || filePath.includes("ppt/viewProps")) {
    return "harmless";
  }
  if (filePath.includes("ppt/theme/")) return "harmless";
  return "formatting";
}

/**
 * Normalize XML content for comparison by parsing and re-serializing via fast-xml-parser.
 * Falls back to raw string comparison if parsing fails.
 */
function normalizeXml(content: string): string {
  try {
    // Parsing round-trips attribute order and whitespace
    const parsed = parseXml(content);
    return JSON.stringify(parsed);
  } catch {
    // If XML is malformed, compare raw
    return content.replace(/\s+/g, " ").trim();
  }
}

/**
 * Diff two PPTX archives semantically.
 * Compares file lists and XML content (ignoring attribute order, whitespace).
 */
export async function diffPptxArchives(original: Buffer, roundTripped: Buffer): Promise<RoundTripDiff[]> {
  const originalPaths = await getZipPaths(original);
  const rtPaths = await getZipPaths(roundTripped);

  const originalSet = new Set(originalPaths);
  const rtSet = new Set(rtPaths);

  const diffs: RoundTripDiff[] = [];

  // Files removed by LibreOffice
  for (const path of originalPaths) {
    if (!rtSet.has(path)) {
      diffs.push({ file: path, type: "removed", category: categorizeChange(path) });
    }
  }

  // Files added by LibreOffice
  for (const path of rtPaths) {
    if (!originalSet.has(path)) {
      diffs.push({ file: path, type: "added", category: categorizeChange(path) });
    }
  }

  // Common files — compare content
  const commonPaths = originalPaths.filter(p => rtSet.has(p));

  const origZip = await JSZip.loadAsync(original);
  const rtZip = await JSZip.loadAsync(roundTripped);

  for (const path of commonPaths) {
    const origFile = origZip.file(path);
    const rtFile = rtZip.file(path);
    if (!origFile || !rtFile) continue;

    const isXml = path.endsWith(".xml") || path.endsWith(".rels");

    if (isXml) {
      const origContent = await origFile.async("string");
      const rtContent = await rtFile.async("string");

      const origNorm = normalizeXml(origContent);
      const rtNorm = normalizeXml(rtContent);

      if (origNorm !== rtNorm) {
        diffs.push({ file: path, type: "modified", category: categorizeChange(path) });
      }
    } else {
      // Binary compare
      const origBuf = await origFile.async("nodebuffer");
      const rtBuf = await rtFile.async("nodebuffer");

      if (!origBuf.equals(rtBuf)) {
        diffs.push({ file: path, type: "modified", category: categorizeChange(path) });
      }
    }
  }

  return diffs;
}

// ---------------------------------------------------------------------------
// Full report generator
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full round-trip validation flow:
 * 1. Round-trip the buffer through LibreOffice
 * 2. Diff the original and round-tripped archives
 * 3. Return a structured report
 */
export async function generateRoundTripReport(buffer: Buffer): Promise<RoundTripReport> {
  const rtBuffer = await roundTripViaLibreOffice(buffer);

  const originalPaths = await getZipPaths(buffer);
  const rtPaths = await getZipPaths(rtBuffer);

  const diffs = await diffPptxArchives(buffer, rtBuffer);

  // Unknown structural = structural diffs that aren't just harmless metadata changes
  const unknownStructural = diffs.filter(d => d.category === "structural");

  return {
    original: { fileCount: originalPaths.length, paths: originalPaths },
    roundTripped: { fileCount: rtPaths.length, paths: rtPaths },
    diffs,
    unknownStructural,
    passed: unknownStructural.length === 0,
  };
}
