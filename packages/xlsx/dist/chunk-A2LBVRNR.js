import {
  validateXlsxStructure
} from "./chunk-J44ZSVSV.js";
import {
  getPhase1Fixture
} from "./chunk-3B5LJNU7.js";
import {
  SpreadsheetEngine
} from "./chunk-GCRW3VCZ.js";

// src/benchmarks/report.ts
import { performance } from "node:perf_hooks";
import process from "node:process";
function percentile(sorted, point) {
  if (sorted.length === 0) {
    return 0;
  }
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil(point / 100 * sorted.length) - 1));
  return sorted[position];
}
function summarize(durations) {
  const sorted = [...durations].sort((left, right) => left - right);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0
  };
}
function maybeGc() {
  if (typeof global.gc === "function") {
    global.gc();
  }
}
async function runRenderBenchmark(fixtureName, iterations = 10) {
  const fixture = getPhase1Fixture(fixtureName);
  const durations = [];
  let fileSizeBytes = 0;
  const initialRss = process.memoryUsage().rss;
  for (let index = 0; index < iterations; index += 1) {
    maybeGc();
    const start = performance.now();
    const buffer = await SpreadsheetEngine.render(fixture.document);
    const elapsed = performance.now() - start;
    durations.push(elapsed);
    fileSizeBytes = buffer.length;
  }
  const rssDeltaBytes = Math.max(0, process.memoryUsage().rss - initialRss);
  const stats = summarize(durations);
  const cells = fixture.rows * fixture.cols;
  return {
    name: fixtureName,
    stats,
    rowsPerSecond: fixture.rows / (stats.p95 / 1e3),
    cellsPerSecond: cells / (stats.p95 / 1e3),
    fileSizeBytes,
    rssDeltaBytes
  };
}
async function runCorrectnessSweep() {
  const fixtureNames = [
    "empty",
    "single-cell",
    "types-mixed",
    "types-edge",
    "strings-unicode",
    "strings-xml-hostile",
    "strings-whitespace",
    "dates-range",
    "multi-sheet",
    "sheet-names",
    "columns-width",
    "rows-hidden",
    "medium",
    "determinism-seed"
  ];
  const failures = [];
  for (const fixtureName of fixtureNames) {
    const fixture = getPhase1Fixture(fixtureName);
    maybeGc();
    const [first, second] = await Promise.all([
      SpreadsheetEngine.render(fixture.document),
      SpreadsheetEngine.render(fixture.document)
    ]);
    const validation = await validateXlsxStructure(first);
    if (!validation.passed) {
      failures.push(`${fixtureName}: ${validation.checks.filter((check) => !check.passed).map((check) => check.name).join(", ")}`);
      continue;
    }
    if (Buffer.compare(first, second) !== 0) {
      failures.push(`${fixtureName}: deterministic render mismatch`);
    }
  }
  return {
    passed: fixtureNames.length - failures.length,
    total: fixtureNames.length,
    failures
  };
}
async function renderPhase1BenchmarkReport(iterations = 10) {
  const correctness = await runCorrectnessSweep();
  const benchmarkNames = ["large-10k", "large-50k", "large-100k"];
  const results = [];
  for (const benchmarkName of benchmarkNames) {
    results.push(await runRenderBenchmark(benchmarkName, iterations));
  }
  const lines = [
    "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
    "  Runstamp XLSX Engine \u2014 Phase 1 Local Benchmark Report",
    `  Node.js ${process.version} | ${process.platform} ${process.arch}`,
    "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
    "",
    `  STRUCTURAL CORRECTNESS (${correctness.passed}/${correctness.total} passing)`
  ];
  if (correctness.failures.length === 0) {
    lines.push("  \u2713 All structural fixture renders passed deterministic validation");
  } else {
    for (const failure of correctness.failures) {
      lines.push(`  \u2717 ${failure}`);
    }
  }
  lines.push("");
  lines.push("  PERFORMANCE");
  lines.push("                    p50      p95      max      rows/sec      cells/sec      file size");
  for (const result of results) {
    lines.push(
      `  ${result.name.padEnd(12)} ${result.stats.p50.toFixed(0).padStart(5)}ms ${result.stats.p95.toFixed(0).padStart(7)}ms ${result.stats.max.toFixed(0).padStart(7)}ms ${result.rowsPerSecond.toFixed(0).padStart(12)} ${result.cellsPerSecond.toFixed(0).padStart(13)} ${String(result.fileSizeBytes).padStart(11)}`
    );
  }
  lines.push("");
  lines.push("  MEMORY");
  for (const result of results) {
    lines.push(`  ${result.name.padEnd(12)} RSS delta ${Math.round(result.rssDeltaBytes / (1024 * 1024))} MB`);
  }
  lines.push("");
  lines.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  return lines.join("\n");
}

export {
  runRenderBenchmark,
  runCorrectnessSweep,
  renderPhase1BenchmarkReport
};
//# sourceMappingURL=chunk-A2LBVRNR.js.map
