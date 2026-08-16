import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { renderPdfPages } from "../src/pdf-renderer.js";
import { createLinearizedDocument, createPerformancePages, createStreamingDocument } from "./phase9-fixtures.js";

interface BenchmarkResult {
  detail: string;
  name: string;
  pass: boolean;
}

function result(name: string, pass: boolean, detail: string): BenchmarkResult {
  return { detail, name, pass };
}

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(packageRoot(), "output", "phase9");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function pageCountFromBuffer(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Type \/Page\b/g);
  return matches?.length ?? 0;
}

async function collectStreamMetrics(stream: NodeJS.ReadableStream): Promise<{ buffer: Buffer; firstByteMs: number; totalMs: number }> {
  const chunks: Buffer[] = [];
  const start = performance.now();
  let firstByteMs: number | undefined;

  stream.on("data", (chunk) => {
    if (firstByteMs === undefined) {
      firstByteMs = performance.now() - start;
    }
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  await once(stream, "end");
  const totalMs = performance.now() - start;
  return {
    buffer: Buffer.concat(chunks),
    firstByteMs: firstByteMs ?? Number.POSITIVE_INFINITY,
    totalMs,
  };
}

function runQpdfCheck(path: string): void {
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  }
}

function checkLinearization(path: string): boolean {
  if (!hasBinary("qpdf")) {
    return readFileSync(path, "latin1").includes("/Linearized");
  }

  try {
    execFileSync("qpdf", ["--check-linearization", path], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function measurePagedRender(pageCount: number): Promise<{ buffer: Buffer; durationMs: number; peakRssMb: number }> {
  const rssSnapshots: number[] = [];
  const start = performance.now();
  const buffer = await renderPdfPages({
    pages: createPerformancePages(pageCount),
    runtimeOptions: {
      onPageSerialized() {
        rssSnapshots.push(process.memoryUsage().rss / (1024 * 1024));
      },
    },
  });
  const durationMs = performance.now() - start;
  const peakRssMb = Math.max(process.memoryUsage().rss / (1024 * 1024), ...rssSnapshots);
  return { buffer, durationMs, peakRssMb };
}

async function main(): Promise<void> {
  mkdirSync(outputDir(), { recursive: true });

  const perf100 = await measurePagedRender(100);
  const perf1000 = await measurePagedRender(1000);
  const perf100Path = join(outputDir(), "perf-100-page.pdf");
  const perf1000Path = join(outputDir(), "perf-1000-page.pdf");
  writeFileSync(perf100Path, perf100.buffer);
  writeFileSync(perf1000Path, perf1000.buffer);

  const streamingDoc = createStreamingDocument(180);
  const streamMetrics = await collectStreamMetrics(PdfEngine.renderStream(streamingDoc));
  const streamingPath = join(outputDir(), "perf-streaming.pdf");
  writeFileSync(streamingPath, streamMetrics.buffer);

  const linearizedBuffer = await PdfEngine.render(createLinearizedDocument(), { linearize: true });
  const nonLinearizedBuffer = await PdfEngine.render(createLinearizedDocument());
  const linearizedPath = join(outputDir(), "perf-linearized.pdf");
  writeFileSync(linearizedPath, linearizedBuffer);
  runQpdfCheck(linearizedPath);

  const results: BenchmarkResult[] = [
    result("perf-100-page", perf100.durationMs < 1000 && pageCountFromBuffer(perf100.buffer) === 100, `ms=${perf100.durationMs.toFixed(2)} pages=${pageCountFromBuffer(perf100.buffer)}`),
    result("perf-1000-page", perf1000.durationMs < 10000 && pageCountFromBuffer(perf1000.buffer) === 1000, `ms=${perf1000.durationMs.toFixed(2)} pages=${pageCountFromBuffer(perf1000.buffer)}`),
    result("perf-memory-1000", perf1000.peakRssMb < 300, `peak_rss_mb=${perf1000.peakRssMb.toFixed(2)}`),
    result("perf-streaming", streamMetrics.firstByteMs < streamMetrics.totalMs && streamMetrics.buffer.length > 0, `first_byte_ms=${streamMetrics.firstByteMs.toFixed(2)} total_ms=${streamMetrics.totalMs.toFixed(2)}`),
    result("perf-linearized", linearizedBuffer.toString("latin1").includes("/Linearized") && Buffer.compare(linearizedBuffer, nonLinearizedBuffer) !== 0 && checkLinearization(linearizedPath), `linearized_bytes=${linearizedBuffer.length}`),
  ];

  results.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.name} ${entry.detail}`);
  });
  console.log(`artifact_dir=${outputDir()}`);

  const failed = results.filter((entry) => !entry.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 9 benchmark failures: ${failed.map((entry) => entry.name).join(", ")}`);
  }
}

void main();
