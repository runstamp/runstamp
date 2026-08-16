import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { PaperEngine } from "../src/engine.js";
import { runLayout } from "../src/layout/index.js";
import { renderSlideToBuffer } from "../src/renderer/index.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { allVectors } from "./vectors/index.js";

// ---------------------------------------------------------------------------
// Canvas availability check
// ---------------------------------------------------------------------------

let canvasAvailable = false;
try {
  await import("@napi-rs/canvas");
  canvasAvailable = true;
} catch {
  // @napi-rs/canvas not installed
}

const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";
const IS_CI = process.env.CI === "true";
const VISUAL_QUICK = process.env.VISUAL_QUICK === "1";
const GOLDEN_DIR = IS_CI
  ? path.join(import.meta.dirname, "golden")
  : path.join(import.meta.dirname, "golden-local");
const PIXEL_THRESHOLD = 0.1; // per-pixel color distance threshold (0-1)
const MAX_DIFF_PERCENT = IS_CI ? 0.5 : 2.0; // relaxed threshold locally (macOS ≠ Linux rendering)
const DIFF_COLOR: [number, number, number] = [255, 0, 60]; // neon red
const DIFF_ALPHA = 0.3; // fade matching pixels

// Quick mode: subset of critical vectors for fast feedback (~10s vs ~60s)
const QUICK_VECTORS = new Set([
  "text-plain", "text-rich-runs", "layout-row", "layout-absolute-position",
  "table-simple", "chart-pie", "group-basic", "image-base64-png",
  "composite-empty-slide",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderVectorToPng(name: string, doc: typeof allVectors[string], outDir: string): Promise<string> {
  const layoutWidth = doc.slideSize?.width ?? 960;
  const layoutHeight = doc.slideSize?.height ?? 540;
  const slide = doc.slides[0];
  const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
  const buf = await renderSlideToBuffer(layoutTree, {
    width: layoutWidth,
    height: layoutHeight,
    themeColors: doc.theme?.colorScheme,
  });

  if (!buf) {
    throw new Error(`Canvas render produced no output for "${name}"`);
  }

  const pngPath = path.join(outDir, `${name}.png`);
  fs.writeFileSync(pngPath, buf);
  return pngPath;
}

function cropToSize(img: PNG, w: number, h: number): Buffer {
  if (img.width === w && img.height === h) return img.data;
  const cropped = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    img.data.copy(cropped, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
  }
  return cropped;
}

function comparePngs(
  actualPath: string,
  goldenPath: string,
  diffPath?: string,
): { diffPixels: number; totalPixels: number; diffPercent: number } {
  const actualBuf = fs.readFileSync(actualPath);
  const goldenBuf = fs.readFileSync(goldenPath);

  const actual = PNG.sync.read(actualBuf);
  const golden = PNG.sync.read(goldenBuf);

  const width = Math.min(actual.width, golden.width);
  const height = Math.min(actual.height, golden.height);

  const actualData = cropToSize(actual, width, height);
  const goldenData = cropToSize(golden, width, height);

  // Create diff image if path provided
  let diffOutput: PNG | null = null;
  let diffData: Buffer | null = null;
  if (diffPath) {
    diffOutput = new PNG({ width, height });
    diffData = diffOutput.data;
  }

  const diffPixels = pixelmatch(
    actualData,
    goldenData,
    diffData,
    width,
    height,
    {
      threshold: PIXEL_THRESHOLD,
      diffColor: DIFF_COLOR,
      alpha: DIFF_ALPHA,
    },
  );

  // Write diff image
  if (diffOutput && diffPath) {
    fs.writeFileSync(diffPath, PNG.sync.write(diffOutput));
  }

  // If dimensions differ, count the extra area as different
  const dimDiff =
    Math.abs(actual.width * actual.height - golden.width * golden.height);
  const effectiveDiff = diffPixels + dimDiff;
  const effectiveTotal = Math.max(
    actual.width * actual.height,
    golden.width * golden.height,
  );

  return {
    diffPixels: effectiveDiff,
    totalPixels: effectiveTotal,
    diffPercent: (effectiveDiff / effectiveTotal) * 100,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: Array<{ name: string; diffPercent: string; diffPixels: number; totalPixels: number }>;
}

describe.skipIf(!canvasAvailable)("Visual Regression", () => {
  let tmpDir: string;
  let actualDir: string;
  let diffDir: string;
  const summary: TestSummary = { total: 0, passed: 0, failed: 0, skipped: 0, failures: [] };

  beforeAll(() => {
    setDeterministicMode(true);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runstamp-visual-"));
    actualDir = path.join(tmpDir, "actual");
    diffDir = path.join(tmpDir, "diffs");
    fs.mkdirSync(actualDir, { recursive: true });
    fs.mkdirSync(diffDir, { recursive: true });
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    console.log(`  [visual] Artifacts: ${tmpDir}`);
  });

  afterAll(() => {
    setDeterministicMode(false);

    // Write summary JSON
    const summaryPath = path.join(tmpDir, "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`  [visual] Summary: ${summary.passed}/${summary.total} passed`);
    if (summary.failures.length > 0) {
      console.log(`  [visual] Failures:`);
      for (const f of summary.failures) {
        console.log(`    - ${f.name}: ${f.diffPercent}% diff`);
      }
    }

    // Also copy summary to visual-artifacts if it exists (for CI)
    const artifactsDir = path.join(process.cwd(), "visual-artifacts");
    if (fs.existsSync(artifactsDir)) {
      fs.copyFileSync(summaryPath, path.join(artifactsDir, "summary.json"));
    }
  });

  const vectors = VISUAL_QUICK
    ? Object.entries(allVectors).filter(([name]) => QUICK_VECTORS.has(name))
    : Object.entries(allVectors);

  for (const [name, doc] of vectors) {
    it(`renders ${name} without visual regression`, async () => {
      summary.total++;

      // Render to PNG via canvas
      const pngPath = await renderVectorToPng(name, doc, actualDir);
      const goldenPath = path.join(GOLDEN_DIR, `${name}.png`);

      if (UPDATE_GOLDEN) {
        fs.copyFileSync(pngPath, goldenPath);
        console.log(`  [golden] Updated: ${name}.png`);
        summary.passed++;
        return;
      }

      expect(
        fs.existsSync(goldenPath),
        `Missing visual baseline for "${name}": ${goldenPath}. ` +
          "Run pnpm test:visual:update in the pinned visual environment, review the PNG, and commit it.",
      ).toBe(true);

      // Compare against golden
      const diffPath = path.join(diffDir, `${name}-diff.png`);
      const result = comparePngs(pngPath, goldenPath, diffPath);

      if (result.diffPercent > MAX_DIFF_PERCENT) {
        summary.failed++;
        summary.failures.push({
          name,
          diffPercent: result.diffPercent.toFixed(2),
          diffPixels: result.diffPixels,
          totalPixels: result.totalPixels,
        });
        console.log(`  [diff saved] ${diffPath}`);
      } else {
        summary.passed++;
      }

      expect(
        result.diffPercent,
        `Visual regression for "${name}": ${result.diffPixels}/${result.totalPixels} pixels differ (${result.diffPercent.toFixed(2)}%). Diff: ${diffPath}`,
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    });
  }
});
