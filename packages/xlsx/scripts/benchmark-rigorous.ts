import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  formatRigorousBenchmarkReport,
  runRigorousBenchmarkSuite,
  type XlsxRigorousBenchmarkReport,
} from "../src/benchmarks/rigorous.js";
import {
  TEST_LICENSE_KEY as TEST_XLSX_LICENSE_KEY,
  TEST_PUBLIC_KEY_PEM,
} from "../../../scripts/test-license-fixture.mjs";

const execFileAsync = promisify(execFile);

type BenchmarkMode = "free" | "pro" | "both";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, "..");
const outputDir = join(packageDir, "output", "benchmarks");
const markdownPath = resolve(packageDir, "..", "..", "docs", "runstamp-xlsx", "XLSX_RIGOROUS_BENCHMARK_REPORT.md");

function parseIterations(): number {
  const iterationsFlagIndex = process.argv.indexOf("--iterations");
  const iterations = iterationsFlagIndex >= 0
    ? Number(process.argv[iterationsFlagIndex + 1])
    : 2;
  return Number.isFinite(iterations) && iterations > 0 ? iterations : 2;
}

function parseMode(): BenchmarkMode {
  const modeFlagIndex = process.argv.indexOf("--mode");
  const mode = modeFlagIndex >= 0 ? process.argv[modeFlagIndex + 1] : "free";
  if (mode === "free" || mode === "pro" || mode === "both") {
    return mode;
  }
  return "free";
}

async function getGitSha(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", packageDir, "rev-parse", "--short", "HEAD"]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function ensureProBuild(): Promise<void> {
  await execFileAsync("node", ["scripts/build-pro.mjs"], {
    cwd: packageDir,
    env: process.env,
  });
}

async function loadProSpreadsheetEngine() {
  const distPath = join(packageDir, "dist-pro", "index.js");
  return import(pathToFileURL(distPath).href);
}

async function runFreeBenchmark(iterations: number, gitSha?: string): Promise<XlsxRigorousBenchmarkReport> {
  return runRigorousBenchmarkSuite({
    iterations,
    mode: "free",
    buildType: "source",
    packageName: "@runstamp/xlsx",
    keyPresent: Boolean(process.env.RUNSTAMP_LICENSE_KEY),
    gitSha,
  });
}

async function runProBenchmark(iterations: number, gitSha?: string): Promise<XlsxRigorousBenchmarkReport> {
  await ensureProBuild();
  const proModule = await loadProSpreadsheetEngine();
  const proEngine = proModule.SpreadsheetEngine;
  return runRigorousBenchmarkSuite({
    iterations,
    mode: "pro",
    engine: proEngine,
    buildType: "dist-pro",
    packageName: "@runstamp/xlsx-pro",
    keyPresent: true,
    gitSha,
  });
}

async function writeSingleReport(mode: Exclude<BenchmarkMode, "both">, report: XlsxRigorousBenchmarkReport): Promise<void> {
  const jsonPath = join(outputDir, `rigorous-report.${mode}.json`);
  const markdown = formatRigorousBenchmarkReport(report);
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(markdownPath, `${markdown}\n`);
}

async function main(): Promise<void> {
  const iterations = parseIterations();
  const mode = parseMode();
  const gitSha = await getGitSha();
  const previousKey = process.env.RUNSTAMP_LICENSE_KEY;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTestPublicKey = process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2;

  await mkdir(outputDir, { recursive: true });
  await mkdir(dirname(markdownPath), { recursive: true });

  if (mode === "free") {
    const report = await runFreeBenchmark(iterations, gitSha);
    await writeFile(join(outputDir, "rigorous-report.json"), JSON.stringify(report, null, 2));
    await writeSingleReport("free", report);
    console.log(formatRigorousBenchmarkReport(report));
    if (report.summary.failed > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (mode === "pro") {
    process.env.RUNSTAMP_LICENSE_KEY = previousKey ?? TEST_XLSX_LICENSE_KEY;
    if (!previousKey) {
      process.env.NODE_ENV = process.env.NODE_ENV === "test" ? "test" : "development";
      process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 = TEST_PUBLIC_KEY_PEM;
    }
    try {
      const report = await runProBenchmark(iterations, gitSha);
      await writeFile(join(outputDir, "rigorous-report.json"), JSON.stringify(report, null, 2));
      await writeSingleReport("pro", report);
      console.log(formatRigorousBenchmarkReport(report));
      if (report.summary.failed > 0) {
        process.exitCode = 1;
      }
    } finally {
      if (previousKey) {
        process.env.RUNSTAMP_LICENSE_KEY = previousKey;
      } else {
        delete process.env.RUNSTAMP_LICENSE_KEY;
      }
      if (previousNodeEnv) {
        process.env.NODE_ENV = previousNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      if (previousTestPublicKey) {
        process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 = previousTestPublicKey;
      } else {
        delete process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2;
      }
    }
    return;
  }

  process.env.RUNSTAMP_LICENSE_KEY = previousKey ?? TEST_XLSX_LICENSE_KEY;
  if (!previousKey) {
    process.env.NODE_ENV = process.env.NODE_ENV === "test" ? "test" : "development";
    process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 = TEST_PUBLIC_KEY_PEM;
  }
  try {
    const [freeReport, proReport] = await Promise.all([
      runFreeBenchmark(iterations, gitSha),
      runProBenchmark(iterations, gitSha),
    ]);

    await writeFile(join(outputDir, "rigorous-report.free.json"), JSON.stringify(freeReport, null, 2));
    await writeFile(join(outputDir, "rigorous-report.pro.json"), JSON.stringify(proReport, null, 2));
    await writeFile(
      join(outputDir, "rigorous-report.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), free: freeReport, pro: proReport }, null, 2),
    );

    const combinedMarkdown = [
      "# XLSX Dual-Surface Rigorous Benchmark Report",
      "",
      "## Free Surface",
      "",
      formatRigorousBenchmarkReport(freeReport),
      "",
      "## Pro Surface",
      "",
      formatRigorousBenchmarkReport(proReport),
      "",
    ].join("\n");
    await writeFile(markdownPath, combinedMarkdown);

    console.log(combinedMarkdown);
    if (freeReport.summary.failed > 0 || proReport.summary.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (previousKey) {
      process.env.RUNSTAMP_LICENSE_KEY = previousKey;
    } else {
      delete process.env.RUNSTAMP_LICENSE_KEY;
    }
    if (previousNodeEnv) {
      process.env.NODE_ENV = previousNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    if (previousTestPublicKey) {
      process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 = previousTestPublicKey;
    } else {
      delete process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2;
    }
  }
}

await main();
