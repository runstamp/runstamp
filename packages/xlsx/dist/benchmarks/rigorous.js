import {
  runCorrectnessSweep,
  runRenderBenchmark
} from "../chunk-A2LBVRNR.js";
import {
  runPhase2BenchmarkSuite
} from "../chunk-RLKZJTTE.js";
import {
  createDuplicateTableCorruptionBuffer,
  createRepairableCorruptionBuffer,
  createTemplateBenchmarkDocument
} from "../chunk-YFQX3O2E.js";
import {
  validateXlsxStructure
} from "../chunk-J44ZSVSV.js";
import {
  getPhase1Fixture
} from "../chunk-3B5LJNU7.js";
import {
  SpreadsheetEngine,
  validateSpreadsheetBuffer
} from "../chunk-GCRW3VCZ.js";
import "../chunk-YMTIFCEA.js";

// src/benchmarks/rigorous.ts
import { performance } from "node:perf_hooks";
import process from "node:process";
function createBenchmarkContext(options = {}) {
  const mode = options.mode ?? "free";
  return {
    mode,
    engine: options.engine ?? SpreadsheetEngine,
    metadata: {
      mode,
      buildType: options.buildType ?? "source",
      packageName: options.packageName ?? (mode === "pro" ? "@runstamp/xlsx-pro" : "@runstamp/xlsx"),
      keyPresent: options.keyPresent ?? Boolean(process.env.RUNSTAMP_LICENSE_KEY),
      gitSha: options.gitSha
    }
  };
}
function blockedBenchmark(context, id, group, name, target, observed, notes) {
  return {
    id,
    tier: context.mode,
    bucket: "pro-only",
    group,
    name,
    target,
    status: "blocked",
    observed,
    notes
  };
}
function validateBuffer(buffer) {
  return validateSpreadsheetBuffer(buffer);
}
function percentile(sorted, point) {
  if (sorted.length === 0) {
    return 0;
  }
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil(point / 100 * sorted.length) - 1));
  return sorted[position] ?? 0;
}
function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    min: sorted[0] ?? 0,
    mean: sorted.length === 0 ? 0 : total / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0
  };
}
async function measureAsync(iterations, operation) {
  const durations = [];
  const rssDeltas = [];
  let lastValue;
  for (let index = 0; index < iterations; index += 1) {
    if (typeof global.gc === "function") {
      global.gc();
    }
    const rssBefore = process.memoryUsage().rss;
    const start = performance.now();
    lastValue = await operation();
    durations.push(performance.now() - start);
    rssDeltas.push(Math.max(0, process.memoryUsage().rss - rssBefore));
  }
  if (lastValue === void 0) {
    throw new Error("Benchmark operation did not produce a result.");
  }
  return {
    measurement: {
      durationMs: summarize(durations),
      rssDeltaBytes: summarize(rssDeltas)
    },
    lastValue
  };
}
function formatMs(value) {
  return `${value.toFixed(1)}ms`;
}
function formatBytes(value) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}
function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}
function latencyStatus(measurement, passP95Ms, failP95Ms) {
  if (measurement.durationMs.p95 <= passP95Ms) {
    return "pass";
  }
  if (measurement.durationMs.p95 <= failP95Ms) {
    return "warn";
  }
  return "fail";
}
function reduceSummary(results) {
  return results.reduce((summary, result) => {
    summary.total += 1;
    if (result.status === "pass") summary.passed += 1;
    if (result.status === "warn") summary.warned += 1;
    if (result.status === "fail") summary.failed += 1;
    if (result.status === "blocked") summary.blocked += 1;
    return summary;
  }, {
    total: 0,
    passed: 0,
    warned: 0,
    failed: 0,
    blocked: 0
  });
}
function maybeGc() {
  if (typeof global.gc === "function") {
    global.gc();
  }
}
function mapPhase2Result(context, result) {
  return {
    id: result.id,
    tier: context.mode,
    bucket: result.status === "blocked" ? "shared" : "free-safe",
    group: `P2-${result.group}`,
    name: result.name,
    target: result.target,
    status: result.status,
    observed: result.observed,
    notes: result.notes,
    diagnostics: result.diagnostics
  };
}
async function runCoreBenchmarks(context, iterations) {
  const { engine, mode } = context;
  const correctness = await runCorrectnessSweep();
  const largeBuffer = await engine.render(getPhase1Fixture("large-50k").document);
  const validation = mode === "pro" ? await measureAsync(iterations, () => validateBuffer(largeBuffer)) : void 0;
  const metrics = await engine.renderWithMetrics(getPhase1Fixture("large-10k").document);
  const deltaRatio = metrics.plan.qualityReport.estimates.projectedZipBytes === 0 ? 0 : Math.abs(metrics.metrics.outputSizeDeltaBytes) / metrics.plan.qualityReport.estimates.projectedZipBytes;
  const largePreflight = mode === "pro" ? engine.preflight(getPhase1Fixture("large-100k").document, { largeDataset: true }) : void 0;
  const hasRenderStream = typeof engine.renderStream === "function";
  return [
    {
      id: "A1",
      tier: context.mode,
      bucket: "free-safe",
      group: "A",
      name: "Phase 1 structural correctness sweep",
      target: "14/14 fixture renders are structurally valid and deterministic",
      status: correctness.failures.length === 0 ? "pass" : "fail",
      observed: `${correctness.passed}/${correctness.total} fixtures passed`,
      notes: correctness.failures.length > 0 ? correctness.failures.join("; ") : void 0
    },
    mode === "pro" ? {
      id: "A2",
      tier: context.mode,
      bucket: "pro-only",
      group: "A",
      name: "Validate clean 50K workbook",
      target: "clean verdict and p95 < 1,500ms",
      status: validation.lastValue.verdict !== "clean" ? "fail" : latencyStatus(validation.measurement, 1500, 2500),
      observed: `verdict ${validation.lastValue.verdict}; p95 ${formatMs(validation.measurement.durationMs.p95)}`,
      notes: validation.lastValue.findings.length > 0 ? validation.lastValue.findings.map((finding) => finding.code).join(", ") : void 0,
      measurement: validation.measurement
    } : blockedBenchmark(
      context,
      "A2",
      "A",
      "Validate clean 50K workbook",
      "clean verdict and p95 < 1,500ms",
      "Skipped on free surface because buffer validation is a Pro capability."
    ),
    mode === "pro" ? {
      id: "A3",
      tier: context.mode,
      bucket: "pro-only",
      group: "A",
      name: "Preflight flags stream-mode workloads",
      target: "100K-row workbook recommends stream mode and emits STREAM_MODE_RECOMMENDED",
      status: largePreflight.recommendedRenderMode === "stream" && largePreflight.findings.some((finding) => finding.code === "STREAM_MODE_RECOMMENDED") ? "pass" : "fail",
      observed: `mode ${largePreflight.recommendedRenderMode}; findings ${largePreflight.findings.map((finding) => finding.code).join(", ") || "none"}`
    } : blockedBenchmark(
      context,
      "A3",
      "A",
      "Preflight flags stream-mode workloads",
      "100K-row workbook recommends stream mode and emits STREAM_MODE_RECOMMENDED",
      "Skipped on free surface because preflight quality reporting is a Pro capability."
    ),
    {
      id: "A4",
      tier: context.mode,
      bucket: "shared",
      group: "A",
      name: "Preflight size estimate delta",
      target: "Projected ZIP size is within 35% of the actual output",
      status: deltaRatio <= 0.35 ? "pass" : deltaRatio <= 0.6 ? "warn" : "fail",
      observed: `delta ${formatPercent(deltaRatio)}; estimated ${formatBytes(metrics.plan.qualityReport.estimates.projectedZipBytes)} vs actual ${formatBytes(metrics.metrics.outputSizeBytes)}`
    },
    {
      id: "A5",
      tier: context.mode,
      bucket: "free-safe",
      group: "A",
      name: "Stream execution path availability",
      target: "`renderStream(...)` exists when preflight recommends stream mode",
      status: hasRenderStream ? "pass" : "fail",
      observed: hasRenderStream ? "SpreadsheetEngine.renderStream is available" : "SpreadsheetEngine.renderStream is not implemented",
      notes: hasRenderStream ? void 0 : "Preflight can recommend stream mode today, but the package still has no stream render API."
    }
  ];
}
async function runQualityBenchmarks(context, iterations) {
  const { engine, mode } = context;
  if (mode === "free") {
    return [
      blockedBenchmark(context, "B1", "B", "Repairable corruption corpus is detected", "Validation surfaces the seeded repairable workbook defects", "Skipped on free surface because workbook repair lifecycle verification is a Pro capability."),
      blockedBenchmark(context, "B2", "B", "Repair repairable corruption corpus", "Repair returns a clean or warnings-only workbook and p95 < 1,800ms", "Skipped on free surface because repair is a Pro capability."),
      blockedBenchmark(context, "B3", "B", "Validate-and-repair repairable corruption corpus", "validateAndRepair converges to clean or warnings-only and p95 < 2,500ms", "Skipped on free surface because validateAndRepair is a Pro capability."),
      blockedBenchmark(context, "B4", "B", "Duplicate table recovery", "Duplicate table names and invalid table refs repair cleanly", "Skipped on free surface because repair is a Pro capability.")
    ];
  }
  const repairableBuffer = await createRepairableCorruptionBuffer();
  const duplicateTableBuffer = await createDuplicateTableCorruptionBuffer();
  const repairableOriginal = await validateBuffer(repairableBuffer);
  const duplicateOriginal = await validateBuffer(duplicateTableBuffer);
  const repairMeasurement = await measureAsync(Math.max(1, Math.min(iterations, 2)), () => engine.repair(repairableBuffer));
  const repairValidation = await validateBuffer(repairMeasurement.lastValue.buffer);
  const validateRepairMeasurement = await measureAsync(Math.max(1, Math.min(iterations, 2)), () => engine.validateAndRepair(repairableBuffer));
  const duplicateRepair = await measureAsync(iterations, () => engine.repair(duplicateTableBuffer));
  const duplicateValidation = await validateBuffer(duplicateRepair.lastValue.buffer);
  return [
    {
      id: "B1",
      tier: context.mode,
      bucket: "pro-only",
      group: "B",
      name: "Repairable corruption corpus is detected",
      target: "Validation surfaces the seeded repairable workbook defects",
      status: repairableOriginal.verdict === "errors" ? "pass" : "fail",
      observed: `verdict ${repairableOriginal.verdict}; findings ${repairableOriginal.findings.map((finding) => finding.code).join(", ") || "none"}`
    },
    {
      id: "B2",
      tier: context.mode,
      bucket: "pro-only",
      group: "B",
      name: "Repair repairable corruption corpus",
      target: "Repair returns a clean or warnings-only workbook and p95 < 1,800ms",
      status: repairValidation.verdict === "errors" ? "fail" : latencyStatus(repairMeasurement.measurement, 1800, 3e3),
      observed: `repaired verdict ${repairValidation.verdict}; p95 ${formatMs(repairMeasurement.measurement.durationMs.p95)}; actions ${repairMeasurement.lastValue.actions.length}`,
      notes: repairValidation.findings.length > 0 ? `post-repair findings: ${repairValidation.findings.map((finding) => finding.code).join(", ")}` : void 0,
      measurement: repairMeasurement.measurement
    },
    {
      id: "B3",
      tier: context.mode,
      bucket: "pro-only",
      group: "B",
      name: "Validate-and-repair repairable corruption corpus",
      target: "validateAndRepair converges to clean or warnings-only and p95 < 2,500ms",
      status: validateRepairMeasurement.lastValue.repaired.verdict === "errors" ? "fail" : latencyStatus(validateRepairMeasurement.measurement, 2500, 4e3),
      observed: `original ${validateRepairMeasurement.lastValue.original.verdict} -> repaired ${validateRepairMeasurement.lastValue.repaired.verdict}; p95 ${formatMs(validateRepairMeasurement.measurement.durationMs.p95)}`,
      notes: validateRepairMeasurement.lastValue.repair.actions.length > 0 ? `actions: ${validateRepairMeasurement.lastValue.repair.actions.map((action) => action.code).join(", ")}` : void 0,
      measurement: validateRepairMeasurement.measurement
    },
    {
      id: "B4",
      tier: context.mode,
      bucket: "pro-only",
      group: "B",
      name: "Duplicate table recovery",
      target: "Duplicate table names and invalid table refs repair cleanly",
      status: duplicateOriginal.findings.some((finding) => finding.code === "DUPLICATE_TABLE_NAME") && duplicateValidation.verdict !== "errors" ? latencyStatus(duplicateRepair.measurement, 1200, 2e3) : "fail",
      observed: `original findings ${duplicateOriginal.findings.map((finding) => finding.code).join(", ") || "none"}; repaired verdict ${duplicateValidation.verdict}; p95 ${formatMs(duplicateRepair.measurement.durationMs.p95)}`,
      notes: duplicateValidation.findings.length > 0 ? `post-repair findings: ${duplicateValidation.findings.map((finding) => finding.code).join(", ")}` : void 0,
      measurement: duplicateRepair.measurement
    }
  ];
}
function createTemplateAssemblyInput() {
  return {
    namedRanges: {
      InvoiceHeader: "Globex Corp"
    },
    cells: {
      Invoice: {
        B2: new Date(Date.UTC(2026, 3, 1))
      }
    }
  };
}
function createTemplateRowExpansionInput() {
  return {
    namedRanges: {
      InvoiceHeader: "Globex Corp"
    },
    rowExpansions: {
      LineItems: {
        rows: [
          ["Starter", 1, 10, void 0],
          ["Growth", 2, 25, void 0],
          ["Enterprise", 1, 80, void 0]
        ]
      }
    }
  };
}
async function runTemplateBenchmarks(context, iterations) {
  const { engine, mode } = context;
  if (mode === "free") {
    return [
      blockedBenchmark(context, "C1", "C", "Template inventory parse", "Template parsing inventories the workbook and p95 < 150ms", "Skipped on free surface because template parsing is a Pro capability."),
      blockedBenchmark(context, "C2", "C", "Template direct assembly", "Named-range/cell injection stays structurally valid and p95 < 250ms", "Skipped on free surface because template assembly is a Pro capability."),
      blockedBenchmark(context, "C3", "C", "Template row expansion", "Row expansion keeps formulas/tables structurally valid and p95 < 400ms", "Skipped on free surface because template assembly is a Pro capability.")
    ];
  }
  const templateDocument = createTemplateBenchmarkDocument();
  const templateBuffer = await engine.render(templateDocument);
  const parseMeasurement = await measureAsync(iterations, () => engine.parseTemplate(templateBuffer));
  const directAssembly = await measureAsync(iterations, async () => {
    const index = await engine.parseTemplate(templateBuffer);
    return engine.assembleFromTemplate(index, createTemplateAssemblyInput());
  });
  const rowExpansionAssembly = await measureAsync(iterations, async () => {
    const index = await engine.parseTemplate(templateBuffer);
    return engine.assembleFromTemplate(index, createTemplateRowExpansionInput());
  });
  const directStructure = await validateXlsxStructure(directAssembly.lastValue);
  const directValidation = await validateBuffer(directAssembly.lastValue);
  const rowExpansionStructure = await validateXlsxStructure(rowExpansionAssembly.lastValue);
  const rowExpansionValidation = await validateBuffer(rowExpansionAssembly.lastValue);
  return [
    {
      id: "C1",
      tier: context.mode,
      bucket: "pro-only",
      group: "C",
      name: "Template inventory parse",
      target: "Template parsing inventories the workbook and p95 < 150ms",
      status: parseMeasurement.lastValue.namedRanges.length >= 2 && parseMeasurement.lastValue.tables.length >= 1 ? latencyStatus(parseMeasurement.measurement, 150, 300) : "fail",
      observed: `named ranges ${parseMeasurement.lastValue.namedRanges.length}; tables ${parseMeasurement.lastValue.tables.length}; p95 ${formatMs(parseMeasurement.measurement.durationMs.p95)}`,
      measurement: parseMeasurement.measurement
    },
    {
      id: "C2",
      tier: context.mode,
      bucket: "pro-only",
      group: "C",
      name: "Template direct assembly",
      target: "Named-range/cell injection stays structurally valid and p95 < 250ms",
      status: directStructure.passed && directValidation.verdict !== "errors" ? latencyStatus(directAssembly.measurement, 250, 500) : "fail",
      observed: `structural ${directStructure.passed ? "pass" : "fail"}; verdict ${directValidation.verdict}; p95 ${formatMs(directAssembly.measurement.durationMs.p95)}`,
      notes: directValidation.findings.length > 0 ? `findings: ${directValidation.findings.map((finding) => finding.code).join(", ")}` : void 0,
      measurement: directAssembly.measurement
    },
    {
      id: "C3",
      tier: context.mode,
      bucket: "pro-only",
      group: "C",
      name: "Template row expansion",
      target: "Row expansion keeps formulas/tables structurally valid and p95 < 400ms",
      status: rowExpansionStructure.passed && rowExpansionValidation.verdict !== "errors" ? latencyStatus(rowExpansionAssembly.measurement, 400, 700) : "fail",
      observed: `structural ${rowExpansionStructure.passed ? "pass" : "fail"}; verdict ${rowExpansionValidation.verdict}; p95 ${formatMs(rowExpansionAssembly.measurement.durationMs.p95)}`,
      notes: rowExpansionValidation.findings.length > 0 ? `findings: ${rowExpansionValidation.findings.map((finding) => finding.code).join(", ")}` : void 0,
      measurement: rowExpansionAssembly.measurement
    }
  ];
}
function createCompatibilityBenchmarks(context) {
  return [
    {
      id: "X1",
      tier: context.mode,
      bucket: "shared",
      group: "X",
      name: "Cross-app import and round-trip matrix",
      target: "Open, edit, save, and re-open in Excel Win/Mac, Sheets, Numbers, and LibreOffice",
      status: "blocked",
      observed: "Requires target spreadsheet apps and manual captures",
      notes: "Needs Excel on Windows or macOS, a scripted Google Sheets account, Apple Numbers on macOS, and LibreOffice desktop automation to run a truthful open/edit/save/reopen matrix."
    },
    {
      id: "X2",
      tier: context.mode,
      bucket: "shared",
      group: "X",
      name: "Repaired workbook compatibility matrix",
      target: "Repaired third-party workbooks open without repair prompts across target apps",
      status: "blocked",
      observed: "Requires repaired-workbook validation in Excel-family apps",
      notes: "Use the chaos-lab repair corpus outputs once Excel on Windows or macOS, Google Sheets automation, Apple Numbers on macOS, and LibreOffice desktop automation are available."
    }
  ];
}
async function runRigorousBenchmarkSuite(options = 2) {
  const normalizedOptions = typeof options === "number" ? { iterations: options } : options;
  const context = createBenchmarkContext(normalizedOptions);
  const iterations = normalizedOptions.iterations ?? 2;
  maybeGc();
  const phase2 = await runPhase2BenchmarkSuite(iterations);
  maybeGc();
  const renderBaselines = [
    await runRenderBenchmark("large-10k", iterations),
    await runRenderBenchmark("large-50k", Math.max(1, Math.min(iterations, 2))),
    await runRenderBenchmark("large-100k", Math.max(1, Math.min(iterations, 2)))
  ];
  maybeGc();
  const core = await runCoreBenchmarks(context, iterations);
  maybeGc();
  const quality = await runQualityBenchmarks(context, iterations);
  maybeGc();
  const template = await runTemplateBenchmarks(context, iterations);
  const results = [
    ...core,
    ...quality,
    ...template,
    ...phase2.results.map((result) => mapPhase2Result(context, result)),
    ...createCompatibilityBenchmarks(context)
  ];
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    iterations,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    metadata: context.metadata,
    summary: reduceSummary(results),
    renderBaselines,
    results
  };
}
function renderBaselineTable(baselines) {
  const lines = [
    "| Fixture | p50 | p95 | max | rows/sec | cells/sec | file size | RSS delta |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];
  for (const baseline of baselines) {
    lines.push(
      `| ${baseline.name} | ${baseline.stats.p50.toFixed(1)}ms | ${baseline.stats.p95.toFixed(1)}ms | ${baseline.stats.max.toFixed(1)}ms | ${baseline.rowsPerSecond.toFixed(0)} | ${baseline.cellsPerSecond.toFixed(0)} | ${formatBytes(baseline.fileSizeBytes)} | ${formatBytes(baseline.rssDeltaBytes)} |`
    );
  }
  return lines;
}
function renderGroup(results, group, label) {
  const groupResults = results.filter((result) => result.group === group);
  if (groupResults.length === 0) {
    return [];
  }
  const lines = [`## ${label}`, ""];
  for (const result of groupResults) {
    const marker = result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : result.status === "fail" ? "FAIL" : "BLOCKED";
    lines.push(`- \`${result.id}\` ${marker} ${result.name}`);
    lines.push(`  tier: ${result.tier}; bucket: ${result.bucket}`);
    lines.push(`  target: ${result.target}`);
    lines.push(`  observed: ${result.observed}`);
    if (result.notes) {
      lines.push(`  notes: ${result.notes}`);
    }
  }
  lines.push("");
  return lines;
}
function formatRigorousBenchmarkReport(report) {
  const lines = [
    "# XLSX Rigorous Benchmark Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Environment: Node ${report.environment.node} on ${report.environment.platform} ${report.environment.arch}`,
    "",
    `Mode: ${report.metadata.mode}`,
    "",
    `Build: ${report.metadata.buildType}`,
    "",
    `Package: ${report.metadata.packageName}`,
    "",
    `License Key Present: ${report.metadata.keyPresent ? "yes" : "no"}`,
    "",
    `Git SHA: ${report.metadata.gitSha ?? "unknown"}`,
    "",
    `Summary: ${report.summary.passed} pass / ${report.summary.warned} warn / ${report.summary.failed} fail / ${report.summary.blocked} blocked / ${report.summary.total} total`,
    "",
    "## Large Render Baselines",
    "",
    ...renderBaselineTable(report.renderBaselines),
    "",
    ...renderGroup(report.results, "A", "Core"),
    ...renderGroup(report.results, "B", "Quality Lifecycle"),
    ...renderGroup(report.results, "C", "Template Lifecycle"),
    ...renderGroup(report.results, "P2-E", "Phase 2 Correctness"),
    ...renderGroup(report.results, "P2-F", "Phase 2 Style Performance"),
    ...renderGroup(report.results, "P2-G", "Phase 2 Size Efficiency"),
    ...renderGroup(report.results, "P2-H", "Phase 2 Layout Sizing"),
    ...renderGroup(report.results, "X", "Compatibility")
  ];
  return lines.join("\n");
}
async function renderRigorousBenchmarkReport(options = 2) {
  return formatRigorousBenchmarkReport(await runRigorousBenchmarkSuite(options));
}
export {
  formatRigorousBenchmarkReport,
  renderRigorousBenchmarkReport,
  runRigorousBenchmarkSuite
};
//# sourceMappingURL=rigorous.js.map
