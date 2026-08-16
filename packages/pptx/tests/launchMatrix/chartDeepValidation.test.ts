/**
 * Phase 2: Chart Deep Validation — verifies structural integrity of all charts
 * across chart-heavy templates (T1, T2, T3, T4, T9).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../src/engine.js";
import {
  validateCharts,
  findAllCharts,
  type ChartValidationReport,
} from "./helpers/chartValidator.js";

// ---------------------------------------------------------------------------
// Setup: render all chart-bearing templates once
// ---------------------------------------------------------------------------

const buffers = new Map<string, Buffer>();
const reports = new Map<string, ChartValidationReport>();

const chartTemplates = [
  { key: "t01", load: () => import("./fixtures/t01ConsultingDeck.js").then(m => m.consultingDeck) },
  { key: "t02", load: () => import("./fixtures/t02PitchBook.js").then(m => m.pitchBookDeck) },
  { key: "t03", load: () => import("./fixtures/t03SaasBoard.js").then(m => m.saasBoardDeck) },
  { key: "t04", load: () => import("./fixtures/t04Qbr.js").then(m => m.qbrDeck) },
  { key: "t09", load: () => import("./fixtures/t09AnnualReport.js").then(m => m.annualReportDeck) },
];

beforeAll(async () => {
  await Promise.all(
    chartTemplates.map(async ({ key, load }) => {
      const deck = await load();
      const buf = await PaperEngine.render(deck);
      buffers.set(key, buf);
      reports.set(key, await validateCharts(buf));
    }),
  );
}, 120_000);

// ---------------------------------------------------------------------------
// Per-template: full validation pass
// ---------------------------------------------------------------------------

describe.each(chartTemplates.map(t => t.key))(
  "Chart deep validation — %s",
  (key) => {
    it("passes all chart checks", () => {
      const report = reports.get(key)!;
      const failures = report.charts.filter(c => !c.passed);
      if (failures.length > 0) {
        const detail = failures
          .map(f => `  [${f.name}] ${f.chartPath}: ${f.errors.join("; ")}`)
          .join("\n");
        expect.fail(
          `${failures.length} chart check(s) failed for ${key}:\n${detail}`,
        );
      }
      expect(report.passed).toBe(true);
    });
  },
);

// ---------------------------------------------------------------------------
// Cross-template: specific check categories
// ---------------------------------------------------------------------------

describe("Cross-template chart checks", () => {
  it("all charts have valid series indices", () => {
    const errors: string[] = [];
    for (const [key, report] of reports) {
      const failures = report.charts.filter(
        c => c.name === "seriesIndexOrder" && !c.passed,
      );
      for (const f of failures) {
        errors.push(`${key} ${f.chartPath}: ${f.errors.join("; ")}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("all charts have embedded Excel", () => {
    const errors: string[] = [];
    for (const [key, report] of reports) {
      const failures = report.charts.filter(
        c => c.name === "embeddedExcelExistence" && !c.passed,
      );
      for (const f of failures) {
        errors.push(`${key} ${f.chartPath}: ${f.errors.join("; ")}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("all charts are within slide bounds", () => {
    const errors: string[] = [];
    for (const [key, report] of reports) {
      const failures = report.charts.filter(
        c => c.name === "chartPositioning" && !c.passed,
      );
      for (const f of failures) {
        errors.push(`${key} ${f.chartPath}: ${f.errors.join("; ")}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("chart type elements are present", () => {
    const errors: string[] = [];
    for (const [key, report] of reports) {
      const failures = report.charts.filter(
        c => c.name === "chartTypePresence" && !c.passed,
      );
      for (const f of failures) {
        errors.push(`${key} ${f.chartPath}: ${f.errors.join("; ")}`);
      }
    }
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Template-specific chart count expectations
// ---------------------------------------------------------------------------

describe("Template chart counts", () => {
  it("t01 has at least 2 charts", async () => {
    const report = reports.get("t01")!;
    const uniqueCharts = new Set(report.charts.map(c => c.chartPath));
    expect(uniqueCharts.size).toBeGreaterThanOrEqual(2);
  });

  it("t02 has at least 2 charts", async () => {
    const report = reports.get("t02")!;
    const uniqueCharts = new Set(report.charts.map(c => c.chartPath));
    expect(uniqueCharts.size).toBeGreaterThanOrEqual(2);
  });

  it("t03 has at least 3 charts", async () => {
    const report = reports.get("t03")!;
    const uniqueCharts = new Set(report.charts.map(c => c.chartPath));
    expect(uniqueCharts.size).toBeGreaterThanOrEqual(3);
  });

  it("t04 has at least 1 chart", async () => {
    const report = reports.get("t04")!;
    const uniqueCharts = new Set(report.charts.map(c => c.chartPath));
    expect(uniqueCharts.size).toBeGreaterThanOrEqual(1);
  });

  it("t09 has at least 1 chart", async () => {
    const report = reports.get("t09")!;
    const uniqueCharts = new Set(report.charts.map(c => c.chartPath));
    expect(uniqueCharts.size).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Legend and axis integrity
// ---------------------------------------------------------------------------

describe("Legend and axis validation", () => {
  it("all chart legends have valid positions", () => {
    const errors: string[] = [];
    for (const [key, report] of reports) {
      const failures = report.charts.filter(
        c => c.name === "legendAndAxis" && !c.passed,
      );
      for (const f of failures) {
        errors.push(`${key} ${f.chartPath}: ${f.errors.join("; ")}`);
      }
    }
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Data cache consistency
// ---------------------------------------------------------------------------

describe("Data cache consistency", () => {
  it("all embedded xlsx files are valid ZIPs with worksheets", () => {
    const errors: string[] = [];
    for (const [key, report] of reports) {
      const failures = report.charts.filter(
        c => c.name === "dataCacheConsistency" && !c.passed,
      );
      for (const f of failures) {
        errors.push(`${key} ${f.chartPath}: ${f.errors.join("; ")}`);
      }
    }
    expect(errors).toEqual([]);
  });
});
