/**
 * Phase 5 — PPTX Visual Regression tests.
 * Renders templates to slide PNGs via LibreOffice + pdftoppm, then compares
 * against golden master PNGs in tests/launchMatrix/golden-pngs/.
 *
 * Requires: LibreOffice + pdftoppm. Skipped if unavailable.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { PaperEngine } from "../../src/engine.js";
import {
  isVisualToolsAvailable,
  renderPptxToImages,
  compareSlidePngs,
  type VisualCompareReport,
} from "./helpers/pptxVisualCompare.js";

const HAS_VISUAL_TOOLS = isVisualToolsAvailable();

const GOLDEN_DIR = join(__dirname, "golden-pngs");
const SIMILARITY_THRESHOLD = 0.95;

// ---------------------------------------------------------------------------
// Fixture loaders
// ---------------------------------------------------------------------------

const fixtures = [
  { key: "t01", load: () => import("./fixtures/t01ConsultingDeck.js").then(m => m.consultingDeck) },
  { key: "t02", load: () => import("./fixtures/t02PitchBook.js").then(m => m.pitchBookDeck) },
  { key: "t03", load: () => import("./fixtures/t03SaasBoard.js").then(m => m.saasBoardDeck) },
  { key: "t04", load: () => import("./fixtures/t04Qbr.js").then(m => m.qbrDeck) },
  { key: "t05", load: () => import("./fixtures/t05SalesProposal.js").then(m => m.salesProposalDeck) },
  { key: "t06", load: () => import("./fixtures/t06ProductDemo.js").then(m => m.productDemoDeck) },
  { key: "t07", load: () => import("./fixtures/t07AllHands.js").then(m => m.allHandsDeck) },
  { key: "t08", load: () => import("./fixtures/t08RfpResponse.js").then(m => m.rfpResponseDeck) },
  { key: "t09", load: () => import("./fixtures/t09AnnualReport.js").then(m => m.annualReportDeck) },
  { key: "t10", load: () => import("./fixtures/t10Training.js").then(m => m.trainingDeck) },
] as const;

type FixtureKey = (typeof fixtures)[number]["key"];

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

const reports = new Map<string, VisualCompareReport>();
let tmpBaseDir: string;

describe.skipIf(!HAS_VISUAL_TOOLS)("PPTX Visual Regression", () => {
  beforeAll(async () => {
    tmpBaseDir = join(tmpdir(), `pptx-visual-regression-${Date.now()}`);
    mkdirSync(tmpBaseDir, { recursive: true });

    if (!existsSync(GOLDEN_DIR)) {
      // If golden PNGs don't exist yet, skip comparison but still render
      // to validate the rendering pipeline doesn't crash.
      console.warn(`Golden PNG directory not found: ${GOLDEN_DIR}. Tests will validate render-only.`);
    }

    for (const { key, load } of fixtures) {
      const doc = await load();
      const buffer = await PaperEngine.render(doc);

      const slideDir = join(tmpBaseDir, key);
      await renderPptxToImages(buffer, slideDir);

      const goldenSubDir = join(GOLDEN_DIR, key);
      if (existsSync(goldenSubDir)) {
        reports.set(key, await compareSlidePngs(goldenSubDir, slideDir, SIMILARITY_THRESHOLD));
      }
    }
  }, 300_000);

  afterAll(() => {
    if (tmpBaseDir && existsSync(tmpBaseDir)) {
      rmSync(tmpBaseDir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // Per-template visual checks
  // -------------------------------------------------------------------------

  for (const { key } of fixtures) {
    it(`${key} — slides render without crash`, () => {
      // If we got here, rendering succeeded in beforeAll
      expect(true).toBe(true);
    });

    it(`${key} — visual similarity above threshold`, () => {
      const report = reports.get(key);
      if (!report) {
        // Golden PNGs not available — skip comparison
        return;
      }
      expect(
        report.overallSimilarity,
        `${key}: overall similarity ${(report.overallSimilarity * 100).toFixed(1)}% below ${SIMILARITY_THRESHOLD * 100}%`,
      ).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    });

    it(`${key} — no slide completely missing`, () => {
      const report = reports.get(key);
      if (!report) return;
      const zeroSlides = report.slides.filter(s => s.similarity === 0);
      expect(zeroSlides, `${key}: ${zeroSlides.length} slides have zero similarity`).toEqual([]);
    });
  }

  // -------------------------------------------------------------------------
  // Aggregate
  // -------------------------------------------------------------------------

  it("all templates with golden PNGs pass visual threshold", () => {
    for (const [key, report] of reports) {
      expect(report.passed, `${key}: visual regression failed`).toBe(true);
    }
  });
});
