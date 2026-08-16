import { performance } from "node:perf_hooks";
import process from "node:process";
import { SpreadsheetEngine } from "../spreadsheet-engine.js";
import { getPhase1Fixture } from "../fixtures/phase1.js";
import { validateXlsxStructure } from "../quality/structural-validation.js";

export interface BenchmarkStats {
  p50: number;
  p95: number;
  max: number;
}

export interface Phase1BenchmarkResult {
  name: string;
  stats: BenchmarkStats;
  rowsPerSecond: number;
  cellsPerSecond: number;
  fileSizeBytes: number;
  rssDeltaBytes: number;
}

function percentile(sorted: number[], point: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil((point / 100) * sorted.length) - 1));
  return sorted[position];
}

function summarize(durations: number[]): BenchmarkStats {
  const sorted = [...durations].sort((left, right) => left - right);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function maybeGc(): void {
  if (typeof global.gc === "function") {
    global.gc();
  }
}

export async function runRenderBenchmark(
  fixtureName: "large-10k" | "large-50k" | "large-100k",
  iterations = 10,
): Promise<Phase1BenchmarkResult> {
  const fixture = getPhase1Fixture(fixtureName);
  const durations: number[] = [];
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
    rowsPerSecond: fixture.rows / (stats.p95 / 1000),
    cellsPerSecond: cells / (stats.p95 / 1000),
    fileSizeBytes,
    rssDeltaBytes,
  };
}

export async function runCorrectnessSweep(): Promise<{ passed: number; total: number; failures: string[] }> {
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
    "determinism-seed",
  ] as const;

  const failures: string[] = [];
  for (const fixtureName of fixtureNames) {
    const fixture = getPhase1Fixture(fixtureName);
    maybeGc();
    const [first, second] = await Promise.all([
      SpreadsheetEngine.render(fixture.document),
      SpreadsheetEngine.render(fixture.document),
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
    failures,
  };
}

export async function renderPhase1BenchmarkReport(iterations = 10): Promise<string> {
  const correctness = await runCorrectnessSweep();
  const benchmarkNames = ["large-10k", "large-50k", "large-100k"] as const;
  const results = [];
  for (const benchmarkName of benchmarkNames) {
    results.push(await runRenderBenchmark(benchmarkName, iterations));
  }

  const lines: string[] = [
    "═══════════════════════════════════════════════════════════",
    "  Runstamp XLSX Engine — Phase 1 Local Benchmark Report",
    `  Node.js ${process.version} | ${process.platform} ${process.arch}`,
    "═══════════════════════════════════════════════════════════",
    "",
    `  STRUCTURAL CORRECTNESS (${correctness.passed}/${correctness.total} passing)`,
  ];

  if (correctness.failures.length === 0) {
    lines.push("  ✓ All structural fixture renders passed deterministic validation");
  } else {
    for (const failure of correctness.failures) {
      lines.push(`  ✗ ${failure}`);
    }
  }

  lines.push("");
  lines.push("  PERFORMANCE");
  lines.push("                    p50      p95      max      rows/sec      cells/sec      file size");
  for (const result of results) {
    lines.push(
      `  ${result.name.padEnd(12)} ${result.stats.p50.toFixed(0).padStart(5)}ms ${result.stats.p95.toFixed(0).padStart(7)}ms ${result.stats.max.toFixed(0).padStart(7)}ms ${result.rowsPerSecond.toFixed(0).padStart(12)} ${result.cellsPerSecond.toFixed(0).padStart(13)} ${String(result.fileSizeBytes).padStart(11)}`,
    );
  }

  lines.push("");
  lines.push("  MEMORY");
  for (const result of results) {
    lines.push(`  ${result.name.padEnd(12)} RSS delta ${Math.round(result.rssDeltaBytes / (1024 * 1024))} MB`);
  }
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}
