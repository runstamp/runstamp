/**
 * Phase 1 — Structural validation tests for all 10 launch matrix templates.
 * Renders each template once and validates internal OOXML consistency.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import { validateStructure, type StructuralReport } from "./helpers/structuralValidator.js";

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

const ALL_KEYS: FixtureKey[] = fixtures.map(f => f.key);

// ---------------------------------------------------------------------------
// Shared state — render once, validate many
// ---------------------------------------------------------------------------

const buffers = new Map<string, Buffer>();
const reports = new Map<string, StructuralReport>();

beforeAll(async () => {
  for (const { key, load } of fixtures) {
    const doc = await load();
    const buffer = await PaperEngine.render(doc, { outputMode: "visual_safe" });
    buffers.set(key, buffer);
    reports.set(key, await validateStructure(buffer));
  }
}, 120_000);

// ---------------------------------------------------------------------------
// Per-template full structural validation
// ---------------------------------------------------------------------------

for (const key of ALL_KEYS) {
  describe(`${key} structural validation`, () => {
    it("passes all structural checks", () => {
      const report = reports.get(key)!;
      if (!report.passed) {
        for (const check of report.critical) {
          console.error(`[${key}] ${check.name}: ${check.errors.join(", ")}`);
        }
      }
      expect(report.passed).toBe(true);
    });
  });
}

// ---------------------------------------------------------------------------
// Individual check-level tests (aggregated across all templates)
// ---------------------------------------------------------------------------

describe("individual structural checks", () => {
  it("no duplicate content types across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "duplicateContentTypes")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has duplicate content types`).toBe(true);
    }
  });

  it("all relationship targets exist across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "relationshipTargetExistence")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has missing relationship targets`).toBe(true);
    }
  });

  it("no duplicate relationship IDs across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "duplicateRelationshipIds")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has duplicate relationship IDs`).toBe(true);
    }
  });

  it("presentation element order correct across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "presentationElementOrder")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has incorrect presentation element order`).toBe(true);
    }
  });

  it("required attributes present across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "requiredAttributes")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has missing required attributes`).toBe(true);
    }
  });

  it("theme schema valid across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "themeSchema")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has invalid theme schema`).toBe(true);
    }
  });

  it("slide-layout-master chain intact across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "slideLayoutMasterChain")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has broken slide-layout-master chain`).toBe(true);
    }
  });

  it("namespace consistency correct across all templates", () => {
    for (const key of ALL_KEYS) {
      const report = reports.get(key)!;
      const check = report.checks.find(c => c.name === "namespaceConsistency")!;
      if (!check.passed) {
        console.error(`[${key}] ${check.errors.join(", ")}`);
      }
      expect(check.passed, `${key} has namespace inconsistency`).toBe(true);
    }
  });
});
