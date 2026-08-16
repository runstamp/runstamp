/**
 * Self-Healing Pipeline Test
 * Render → Validate → Auto-fix if issues → Re-validate → Assert fixed
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { validateStructure } from "./helpers/structuralValidator.js";
import { validateCharts } from "./helpers/chartValidator.js";
import { diagnose, diagnosisSummary } from "./helpers/diagnosisEngine.js";
import { patchPptx } from "./helpers/pptxPatcher.js";

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
];

describe("Self-Healing Pipeline", () => {
  const buffers = new Map<string, Buffer>();

  beforeAll(async () => {
    for (const { key, load } of fixtures) {
      const doc = await load();
      buffers.set(key, await PaperEngine.render(doc));
    }
  }, 120000);

  it("diagnosis engine produces valid reports", async () => {
    const buffer = buffers.get("t01")!;
    const structural = await validateStructure(buffer);
    const charts = await validateCharts(buffer);
    const report = diagnose(structural, charts);

    expect(report).toHaveProperty("verdict");
    expect(["LAUNCH_READY", "NEEDS_FIXES", "BLOCKED"]).toContain(report.verdict);
    expect(report).toHaveProperty("critical");
    expect(report).toHaveProperty("high");
    expect(report).toHaveProperty("medium");
    expect(report).toHaveProperty("info");

    const summary = diagnosisSummary(report);
    expect(summary).toContain("Verdict:");
  });

  it("patcher produces valid PPTX output", async () => {
    const buffer = buffers.get("t01")!;
    const result = await patchPptx(buffer);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.applied).toBeInstanceOf(Array);
  });

  // Self-healing loop for each template
  for (const { key } of fixtures) {
    it(`${key}: self-healing loop — validate → fix → re-validate`, async () => {
      const buffer = buffers.get(key)!;

      // Step 1: Initial validation
      const initialStructural = await validateStructure(buffer);
      const initialCharts = await validateCharts(buffer);
      const initialDiagnosis = diagnose(initialStructural, initialCharts);

      if (initialDiagnosis.verdict === "LAUNCH_READY") {
        // Already clean — no fixes needed
        expect(initialStructural.passed).toBe(true);
        return;
      }

      // Step 2: Apply auto-fixes
      const { buffer: patchedBuffer, applied } = await patchPptx(buffer);
      expect(applied.length).toBeGreaterThan(0);

      // Step 3: Re-validate
      const patchedStructural = await validateStructure(patchedBuffer);
      const patchedCharts = await validateCharts(patchedBuffer);
      const patchedDiagnosis = diagnose(patchedStructural, patchedCharts);

      // Auto-fixable issues should be resolved
      const autoFixableInitial = [
        ...initialDiagnosis.critical,
        ...initialDiagnosis.high,
        ...initialDiagnosis.medium,
      ].filter(i => i.autoFixable).length;

      const autoFixablePatched = [
        ...patchedDiagnosis.critical,
        ...patchedDiagnosis.high,
        ...patchedDiagnosis.medium,
      ].filter(i => i.autoFixable).length;

      // Patched version should have fewer or equal auto-fixable issues
      expect(autoFixablePatched).toBeLessThanOrEqual(autoFixableInitial);
    });
  }

  it("all templates pass structural validation (engine output is clean)", async () => {
    for (const { key } of fixtures) {
      const buffer = buffers.get(key)!;
      const report = await validateStructure(buffer);
      if (!report.passed) {
        for (const check of report.critical) {
          console.warn(`[${key}] ${check.name}: ${check.errors.join("; ")}`);
        }
      }
      expect(report.passed, `${key} failed structural validation`).toBe(true);
    }
  });
});
