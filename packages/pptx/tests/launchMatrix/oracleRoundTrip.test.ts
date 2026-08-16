/**
 * Phase 4 — Oracle Round-Trip Validation.
 * Renders templates through PaperEngine, round-trips them through LibreOffice,
 * and asserts that no structural corruption occurs.
 *
 * Requires: LibreOffice installed (headless mode). Skipped if unavailable.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import {
  isLibreOfficeAvailable,
  generateRoundTripReport,
  type RoundTripReport,
} from "./helpers/oracleRoundTrip.js";

const HAS_LIBREOFFICE = isLibreOfficeAvailable();

// ---------------------------------------------------------------------------
// Fixture loaders — same as structuralValidation.test.ts
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

// Start with simpler templates, then chart-heavy ones
const PRIORITY_ORDER: FixtureKey[] = ["t05", "t07", "t10", "t01", "t03", "t02", "t04", "t06", "t08", "t09"];

// ---------------------------------------------------------------------------
// Shared state — render once, round-trip once
// ---------------------------------------------------------------------------

const buffers = new Map<string, Buffer>();
const reports = new Map<string, RoundTripReport>();

describe.skipIf(!HAS_LIBREOFFICE)("Oracle Round-Trip Validation", () => {
  beforeAll(async () => {
    for (const key of PRIORITY_ORDER) {
      const fixture = fixtures.find(f => f.key === key)!;
      const doc = await fixture.load();
      const buffer = await PaperEngine.render(doc);
      buffers.set(key, buffer);
      reports.set(key, await generateRoundTripReport(buffer));
    }
  }, 300_000);

  // -------------------------------------------------------------------------
  // Simple text-only templates (no charts)
  // -------------------------------------------------------------------------

  it("t05 (Sales Proposal) — zero structural diffs", () => {
    const report = reports.get("t05")!;
    expect(report.unknownStructural).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("t07 (All Hands) — zero structural diffs", () => {
    const report = reports.get("t07")!;
    expect(report.unknownStructural).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("t10 (Training) — zero structural diffs", () => {
    const report = reports.get("t10")!;
    expect(report.unknownStructural).toEqual([]);
    expect(report.passed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Chart-heavy templates
  // -------------------------------------------------------------------------

  it("t01 (Consulting Deck) — zero structural diffs", () => {
    const report = reports.get("t01")!;
    expect(report.unknownStructural).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("t03 (SaaS Board) — zero structural diffs", () => {
    const report = reports.get("t03")!;
    expect(report.unknownStructural).toEqual([]);
    expect(report.passed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Remaining templates
  // -------------------------------------------------------------------------

  for (const key of PRIORITY_ORDER.slice(5)) {
    it(`${key} — zero structural diffs`, () => {
      const report = reports.get(key)!;
      expect(report.unknownStructural).toEqual([]);
      expect(report.passed).toBe(true);
    });
  }

  // -------------------------------------------------------------------------
  // Aggregate checks
  // -------------------------------------------------------------------------

  it("all templates preserve file count within tolerance", () => {
    for (const [key, report] of reports) {
      const origCount = report.original.fileCount;
      const rtCount = report.roundTripped.fileCount;
      // LibreOffice may add/remove a few metadata files, but large deltas = corruption
      const delta = Math.abs(origCount - rtCount);
      expect(delta, `${key}: file count delta ${delta} exceeds tolerance`).toBeLessThanOrEqual(10);
    }
  });

  it("no template has chart files removed", () => {
    for (const [key, report] of reports) {
      const removedCharts = report.diffs.filter(d => d.type === "removed" && d.category === "chart");
      expect(removedCharts, `${key}: chart files were removed`).toEqual([]);
    }
  });
});
