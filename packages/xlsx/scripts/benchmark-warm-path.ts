import { execFile } from "node:child_process";
import { availableParallelism } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import type {
  SpreadsheetDocument,
  SpreadsheetRenderOptions,
  SpreadsheetRenderResult,
} from "../src/index.js";

const execFileAsync = promisify(execFile);

type BenchmarkTarget = "source" | "dist";

type SpreadsheetEngineLike = {
  renderWithMetrics(
    document: SpreadsheetDocument,
    options?: SpreadsheetRenderOptions,
  ): Promise<SpreadsheetRenderResult>;
};

type BenchmarkCase = {
  name: string;
  document: SpreadsheetDocument;
  options?: SpreadsheetRenderOptions;
};

type BenchmarkSample = {
  totalGenerationTimeMs: number;
  worksheetSerializationTimeMs: number;
  packageSerializationTimeMs: number;
  zipFinalizationTimeMs: number;
};

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDir = resolve(packageDir, "output", "benchmarks");

function parseIterations(): number {
  const iterationsFlagIndex = process.argv.indexOf("--iterations");
  const raw = iterationsFlagIndex >= 0
    ? Number(process.argv[iterationsFlagIndex + 1])
    : 5;
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
}

function parseTarget(): BenchmarkTarget {
  const targetFlagIndex = process.argv.indexOf("--target");
  const raw = targetFlagIndex >= 0 ? process.argv[targetFlagIndex + 1] : "source";
  if (!raw) {
    throw new Error("Missing value for --target. Expected \"source\" or \"dist\".");
  }
  if (raw === "source" || raw === "dist") {
    return raw;
  }
  throw new Error(`Unsupported warm-path benchmark target "${raw}". Expected "source" or "dist".`);
}

function parseOutputPath(target: BenchmarkTarget): string {
  const outputFlagIndex = process.argv.indexOf("--out");
  if (outputFlagIndex >= 0) {
    const raw = process.argv[outputFlagIndex + 1];
    if (!raw) {
      throw new Error("Missing value for --out.");
    }
    return resolve(process.cwd(), raw);
  }
  return resolve(defaultOutputDir, `warm-path-report.${target}.json`);
}

async function getGitSha(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", packageDir, "rev-parse", "--short", "HEAD"]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function loadEngine(target: BenchmarkTarget): Promise<{
  cleanup: () => Promise<void>;
  engine: SpreadsheetEngineLike;
  entrypoint: string;
}> {
  if (target === "source") {
    const [{ SpreadsheetEngine }, { terminateWorkerSheetSerializationPool }] = await Promise.all([
      import("../src/index.js"),
      import("../src/workers/sheet-serialization-worker-pool.js"),
    ]);
    return {
      cleanup: terminateWorkerSheetSerializationPool,
      engine: SpreadsheetEngine,
      entrypoint: "src/index.ts",
    };
  }

  const distEntrypoint = resolve(packageDir, "dist", "index.js");
  const { SpreadsheetEngine } = await import(pathToFileURL(distEntrypoint).href);
  return {
    cleanup: async () => {},
    engine: SpreadsheetEngine,
    entrypoint: "dist/index.js",
  };
}

function makeSingleCellWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Hello",
        rows: [{ cells: [{ value: "Hello world" }] }],
      },
    ],
  };
}

function makeMediumWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Operational report",
      creator: "Runstamp Warm Path Benchmark",
    },
    sheets: [
      {
        name: "Report",
        rows: Array.from({ length: 600 }, (_unused, rowIndex) => ({
          cells: [
            { value: `customer-${rowIndex}` },
            { value: rowIndex * 10 },
            { value: rowIndex % 2 === 0 },
            { value: `segment-${rowIndex % 12}` },
          ],
        })),
      },
      {
        name: "Summary",
        rows: [
          { cells: [{ value: "Total rows" }, { value: 600 }] },
        ],
      },
    ],
  };
}

function makeMultiSheetWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Multi-sheet warm path probe",
      creator: "Runstamp Warm Path Benchmark",
    },
    sheets: Array.from({ length: 12 }, (_unused, sheetIndex) => ({
      name: `Region${sheetIndex + 1}`,
      freezePane: { row: 1, col: 1 },
      rows: [
        { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Status" }] },
        ...Array.from({ length: 800 }, (_unusedRow, rowIndex) => ({
          cells: [
            { value: `region-${sheetIndex + 1}` },
            { value: rowIndex * (sheetIndex + 1), style: { numberFormat: "currency" } },
            { value: rowIndex % 3 === 0 ? "Open" : "Closed" },
          ],
        })),
      ],
    })),
  };
}

function makeWorkerEligibleMultiSheetWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Worker-eligible multi-sheet warm path probe",
      creator: "Runstamp Warm Path Benchmark",
    },
    sheets: Array.from({ length: 12 }, (_unused, sheetIndex) => ({
      name: `WorkerRegion${sheetIndex + 1}`,
      freezePane: { row: 1, col: 1 },
      rows: [
        { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Open" }] },
        ...Array.from({ length: 800 }, (_unusedRow, rowIndex) => ({
          cells: [
            { value: `region-${sheetIndex + 1}` },
            { value: rowIndex * (sheetIndex + 1) },
            { value: rowIndex % 3 === 0 },
          ],
        })),
      ],
    })),
  };
}

function makeLargeWorkerEligibleMultiSheetWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Large worker-eligible multi-sheet warm path probe",
      creator: "Runstamp Warm Path Benchmark",
    },
    sheets: Array.from({ length: 32 }, (_unused, sheetIndex) => ({
      name: `LargeWorkerRegion${sheetIndex + 1}`,
      rows: [
        { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Open" }] },
        ...Array.from({ length: 2_000 }, (_unusedRow, rowIndex) => ({
          cells: [
            { value: `region-${sheetIndex + 1}` },
            { value: rowIndex * (sheetIndex + 1) },
            { value: rowIndex % 3 === 0 },
          ],
        })),
      ],
    })),
  };
}

function summarize(samples: BenchmarkSample[]) {
  const sorted = samples
    .map((sample) => sample.totalGenerationTimeMs)
    .sort((left, right) => left - right);
  const sum = sorted.reduce((total, value) => total + value, 0);
  const withoutFirst = samples.slice(1);
  const withoutFirstSum = withoutFirst.reduce((total, sample) => total + sample.totalGenerationTimeMs, 0);
  const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
  return {
    iterations: samples.length,
    minMs: Math.round((sorted[0] ?? 0) * 100) / 100,
    p50Ms: Math.round(p50 * 100) / 100,
    p95Ms: Math.round(p95 * 100) / 100,
    avgMs: Math.round((sum / Math.max(samples.length, 1)) * 100) / 100,
    avgExcludingFirstMs: withoutFirst.length > 0
      ? Math.round((withoutFirstSum / withoutFirst.length) * 100) / 100
      : null,
    worksheetSerializationAvgMs: Math.round(
      samples.reduce((total, sample) => total + sample.worksheetSerializationTimeMs, 0)
      / Math.max(samples.length, 1)
      * 100,
    ) / 100,
    packageSerializationAvgMs: Math.round(
      samples.reduce((total, sample) => total + sample.packageSerializationTimeMs, 0)
      / Math.max(samples.length, 1)
      * 100,
    ) / 100,
    zipFinalizationAvgMs: Math.round(
      samples.reduce((total, sample) => total + sample.zipFinalizationTimeMs, 0)
      / Math.max(samples.length, 1)
      * 100,
    ) / 100,
  };
}

async function runCase(
  engine: SpreadsheetEngineLike,
  benchmarkCase: BenchmarkCase,
  iterations: number,
  warmPath: boolean,
): Promise<BenchmarkSample[]> {
  const samples: BenchmarkSample[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const rendered = await engine.renderWithMetrics(benchmarkCase.document, {
      deterministic: true,
      ...benchmarkCase.options,
      warmPath,
    });
    samples.push({
      totalGenerationTimeMs: rendered.metrics.totalGenerationTimeMs,
      worksheetSerializationTimeMs: rendered.metrics.stageMetrics.worksheetSerializationTimeMs,
      packageSerializationTimeMs: rendered.metrics.stageMetrics.packageSerializationTimeMs,
      zipFinalizationTimeMs: rendered.metrics.zipFinalizationTimeMs,
    });
  }
  return samples;
}

const iterations = parseIterations();
const target = parseTarget();
const outputPath = parseOutputPath(target);
const gitSha = await getGitSha();
const loaded = await loadEngine(target);
const cases: BenchmarkCase[] = [
  { name: "single-cell", document: makeSingleCellWorkbook() },
  { name: "medium", document: makeMediumWorkbook() },
  { name: "multi-sheet-styled-ineligible", document: makeMultiSheetWorkbook() },
  {
    name: "multi-sheet-inline-small-thresholded",
    document: makeWorkerEligibleMultiSheetWorkbook(),
    options: { stringStrategy: "inlineStrings" },
  },
  {
    name: "multi-sheet-inline-large-worker-eligible",
    document: makeLargeWorkerEligibleMultiSheetWorkbook(),
    options: { stringStrategy: "inlineStrings" },
  },
];

const results = [];
for (const benchmarkCase of cases) {
  const cold = await runCase(loaded.engine, benchmarkCase, iterations, false);
  const warm = await runCase(loaded.engine, benchmarkCase, iterations, true);
  results.push({
    name: benchmarkCase.name,
    options: benchmarkCase.options ?? {},
    cold: {
      summary: summarize(cold),
      samples: cold,
    },
    warm: {
      summary: summarize(warm),
      samples: warm,
    },
  });
}
await loaded.cleanup();

const report = {
  generatedAt: new Date().toISOString(),
  gitSha,
  iterations,
  target,
  entrypoint: loaded.entrypoint,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    availableParallelism: availableParallelism(),
  },
  methodology: [
    "Cold samples render with warmPath:false.",
    "Warm samples render with warmPath:true after cold samples for the same case.",
    "The harness records timings only and does not assert wall-clock thresholds.",
    "Chaos Lab XLSX comparison evidence must continue to render through the cold/default path.",
  ],
  note: "Timing harness only; do not use as a correctness assertion or public benchmark without regenerating comparison evidence.",
  results,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
