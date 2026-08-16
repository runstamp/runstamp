/**
 * Master Verification Runner
 * CLI: npx tsx tests/launchMatrix/runVerification.ts [--template t01] [--fix] [--json]
 *
 * Sequential pipeline:
 * 1. Generate .pptx from fixture
 * 2. Structural validation
 * 3. Chart deep validation
 * 4. Diagnosis
 * 5. Auto-fix if --fix and issues found
 * 6. Oracle round-trip if LibreOffice available
 * 7. Output JSON report + verdict
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PaperEngine } from "../../src/engine.js";
import { validateStructure, type StructuralReport } from "./helpers/structuralValidator.js";
import { validateCharts, type ChartValidationReport } from "./helpers/chartValidator.js";
import { diagnose, diagnosisSummary, type DiagnosisReport } from "./helpers/diagnosisEngine.js";
import { patchPptx, type PatchResult } from "./helpers/pptxPatcher.js";
import type { PaperDocument } from "../../src/types/ast.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Fixture registry
// ---------------------------------------------------------------------------

interface FixtureEntry {
  key: string;
  name: string;
  load: () => Promise<PaperDocument>;
}

const ALL_FIXTURES: FixtureEntry[] = [
  { key: "t01", name: "consulting", load: () => import("./fixtures/t01ConsultingDeck.js").then(m => m.consultingDeck) },
  { key: "t02", name: "pitchbook", load: () => import("./fixtures/t02PitchBook.js").then(m => m.pitchBookDeck) },
  { key: "t03", name: "saasBoard", load: () => import("./fixtures/t03SaasBoard.js").then(m => m.saasBoardDeck) },
  { key: "t04", name: "qbr", load: () => import("./fixtures/t04Qbr.js").then(m => m.qbrDeck) },
  { key: "t05", name: "salesProposal", load: () => import("./fixtures/t05SalesProposal.js").then(m => m.salesProposalDeck) },
  { key: "t06", name: "productDemo", load: () => import("./fixtures/t06ProductDemo.js").then(m => m.productDemoDeck) },
  { key: "t07", name: "allHands", load: () => import("./fixtures/t07AllHands.js").then(m => m.allHandsDeck) },
  { key: "t08", name: "rfpResponse", load: () => import("./fixtures/t08RfpResponse.js").then(m => m.rfpResponseDeck) },
  { key: "t09", name: "annualReport", load: () => import("./fixtures/t09AnnualReport.js").then(m => m.annualReportDeck) },
  { key: "t10", name: "training", load: () => import("./fixtures/t10Training.js").then(m => m.trainingDeck) },
];

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

interface TemplateReport {
  key: string;
  name: string;
  renderTimeMs: number;
  fileSizeKB: number;
  slideCount: number;
  structural: StructuralReport;
  charts: ChartValidationReport;
  diagnosis: DiagnosisReport;
  patchApplied: string[];
  postPatchDiagnosis?: DiagnosisReport;
  verdict: "LAUNCH_READY" | "NEEDS_FIXES" | "BLOCKED";
}

interface VerificationReport {
  timestamp: string;
  templates: TemplateReport[];
  overallVerdict: "LAUNCH_READY" | "NEEDS_FIXES" | "BLOCKED";
  summary: {
    total: number;
    launchReady: number;
    needsFixes: number;
    blocked: number;
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runVerification(opts: {
  templateFilter?: string;
  fix: boolean;
  json: boolean;
}) {
  const fixtures = opts.templateFilter
    ? ALL_FIXTURES.filter(f => f.key === opts.templateFilter)
    : ALL_FIXTURES;

  if (fixtures.length === 0) {
    console.error(`No fixture found for: ${opts.templateFilter}`);
    process.exit(1);
  }

  const outputDir = join(__dirname, "output");
  mkdirSync(outputDir, { recursive: true });

  const templateReports: TemplateReport[] = [];

  for (const fixture of fixtures) {
    if (!opts.json) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`  ${fixture.key}: ${fixture.name}`);
      console.log(`${"=".repeat(60)}`);
    }

    // 1. Render
    const doc = await fixture.load();
    const start = Date.now();
    let buffer = await PaperEngine.render(doc);
    const renderTime = Date.now() - start;

    if (!opts.json) {
      console.log(`  Rendered: ${doc.slides.length} slides, ${renderTime}ms, ${(buffer.length / 1024).toFixed(0)}KB`);
    }

    // Save .pptx
    const outPath = join(outputDir, `${fixture.key}-${fixture.name}.pptx`);
    writeFileSync(outPath, buffer);

    // 2. Structural validation
    const structural = await validateStructure(buffer);
    if (!opts.json) {
      const status = structural.passed ? "PASS" : "FAIL";
      const failCount = structural.critical.length;
      console.log(`  Structural: ${status} (${structural.checks.length} checks, ${failCount} failures)`);
    }

    // 3. Chart deep validation
    const charts = await validateCharts(buffer);
    if (!opts.json) {
      const status = charts.passed ? "PASS" : "FAIL";
      console.log(`  Charts: ${status} (${charts.charts.length} charts validated)`);
    }

    // 4. Diagnosis
    const diagnosis = diagnose(structural, charts);
    if (!opts.json) {
      console.log(`  Diagnosis: ${diagnosis.verdict}`);
      if (diagnosis.critical.length > 0) {
        for (const issue of diagnosis.critical) {
          console.log(`    CRITICAL: ${issue.issue}`);
        }
      }
      if (diagnosis.high.length > 0) {
        for (const issue of diagnosis.high) {
          console.log(`    HIGH: ${issue.issue}`);
        }
      }
    }

    // 5. Auto-fix if requested
    let patchApplied: string[] = [];
    let postPatchDiagnosis: DiagnosisReport | undefined;

    if (opts.fix && diagnosis.verdict !== "LAUNCH_READY") {
      const result = await patchPptx(buffer);
      patchApplied = result.applied;
      buffer = result.buffer;

      // Save fixed version
      const fixedPath = join(outputDir, `${fixture.key}-${fixture.name}-fixed.pptx`);
      writeFileSync(fixedPath, buffer);

      // Re-validate
      const patchedStructural = await validateStructure(buffer);
      const patchedCharts = await validateCharts(buffer);
      postPatchDiagnosis = diagnose(patchedStructural, patchedCharts);

      if (!opts.json) {
        console.log(`  Patched: ${patchApplied.length} fixes applied`);
        console.log(`  Post-patch verdict: ${postPatchDiagnosis.verdict}`);
      }
    }

    const finalVerdict = postPatchDiagnosis?.verdict ?? diagnosis.verdict;

    templateReports.push({
      key: fixture.key,
      name: fixture.name,
      renderTimeMs: renderTime,
      fileSizeKB: Math.round(buffer.length / 1024),
      slideCount: doc.slides.length,
      structural,
      charts,
      diagnosis,
      patchApplied,
      postPatchDiagnosis,
      verdict: finalVerdict,
    });
  }

  // Overall verdict
  const overallVerdict: VerificationReport["overallVerdict"] =
    templateReports.some(r => r.verdict === "BLOCKED") ? "BLOCKED"
    : templateReports.some(r => r.verdict === "NEEDS_FIXES") ? "NEEDS_FIXES"
    : "LAUNCH_READY";

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    templates: templateReports,
    overallVerdict,
    summary: {
      total: templateReports.length,
      launchReady: templateReports.filter(r => r.verdict === "LAUNCH_READY").length,
      needsFixes: templateReports.filter(r => r.verdict === "NEEDS_FIXES").length,
      blocked: templateReports.filter(r => r.verdict === "BLOCKED").length,
    },
  };

  // Output
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  OVERALL VERDICT: ${overallVerdict}`);
    console.log(`  ${report.summary.launchReady}/${report.summary.total} templates launch-ready`);
    if (report.summary.needsFixes > 0) {
      console.log(`  ${report.summary.needsFixes} need fixes`);
    }
    if (report.summary.blocked > 0) {
      console.log(`  ${report.summary.blocked} blocked`);
    }
    console.log(`${"=".repeat(60)}`);
  }

  // Save report
  const reportPath = join(outputDir, "verification-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  if (!opts.json) {
    console.log(`\nReport saved: ${reportPath}`);
  }

  process.exit(overallVerdict === "BLOCKED" ? 1 : 0);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const templateIdx = args.indexOf("--template");
const templateFilter = templateIdx >= 0 ? args[templateIdx + 1] : undefined;
const fix = args.includes("--fix");
const json = args.includes("--json");

runVerification({ templateFilter, fix, json }).catch(err => {
  console.error(err);
  process.exit(1);
});
