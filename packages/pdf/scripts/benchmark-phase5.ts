import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import {
  createAutoWidthTableDocument,
  createBorderCollapseTableDocument,
  createColspanTableDocument,
  createMultiPageTableDocument,
  createNestedTableDocument,
  createPerformanceTableDocument,
  createRowspanSplitTableDocument,
  createSinglePageTableDocument,
  createVerticalAlignTableDocument,
} from "./phase5-fixtures.js";

interface BenchmarkResult {
  detail: string;
  name: string;
  pass: boolean;
}

function benchmarkResult(name: string, pass: boolean, detail: string): BenchmarkResult {
  return { detail, name, pass };
}

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(packageRoot(), "output", "phase5");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

async function writeArtifact(name: string, document: Parameters<typeof PdfEngine.render>[0]): Promise<string> {
  const path = join(outputDir(), `${name}.pdf`);
  const buffer = await PdfEngine.render(document);
  writeFileSync(path, buffer);
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  }
  return path;
}

async function main(): Promise<void> {
  mkdirSync(outputDir(), { recursive: true });
  const start = performance.now();

  const single = createSinglePageTableDocument();
  const multi = createMultiPageTableDocument();
  const rowspan = createRowspanSplitTableDocument();
  const colspan = createColspanTableDocument();
  const nested = createNestedTableDocument();
  const autoWidth = createAutoWidthTableDocument();
  const verticalAlign = createVerticalAlignTableDocument();
  const borderCollapse = createBorderCollapseTableDocument();
  const performanceDoc = createPerformanceTableDocument();

  const singleAnalysis = await analyzePhase5Document(single);
  const multiAnalysis = await analyzePhase5Document(multi);
  const rowspanAnalysis = await analyzePhase5Document(rowspan);
  const colspanAnalysis = await analyzePhase5Document(colspan);
  const nestedAnalysis = await analyzePhase5Document(nested);
  const autoWidthAnalysis = await analyzePhase5Document(autoWidth);
  const verticalAlignAnalysis = await analyzePhase5Document(verticalAlign);
  const borderCollapseAnalysis = await analyzePhase5Document(borderCollapse);

  const performanceStart = performance.now();
  const performanceAnalysis = await analyzePhase5Document(performanceDoc);
  const performanceMs = performance.now() - performanceStart;
  const rssMb = process.memoryUsage().rss / (1024 * 1024);

  await Promise.all([
    writeArtifact("table-single-page", single),
    writeArtifact("table-multi-page", multi),
    writeArtifact("table-header-repeat", multi),
    writeArtifact("table-rowspan-split", rowspan),
    writeArtifact("table-colspan", colspan),
    writeArtifact("table-nested", nested),
    writeArtifact("table-1000-rows", performanceDoc),
    writeArtifact("table-auto-width", autoWidth),
    writeArtifact("table-vertical-align", verticalAlign),
    writeArtifact("table-border-collapse", borderCollapse),
  ]);

  const verticalValues = new Map(verticalAlignAnalysis.pages[0]?.texts.map((text) => [text.value, text.y]) ?? []);
  const borderLines = (borderCollapseAnalysis.pages[0]?.graphics ?? []).filter((graphic) =>
    graphic.type === "line" && Math.abs(graphic.x1 - graphic.x2) < 0.001 && Math.abs(graphic.x1 - 306) < 6,
  );
  const multiSeen = multiAnalysis.tables[0]?.fragments.flatMap((fragment) => fragment.bodyRowIndices) ?? [];
  const nestedPages = nestedAnalysis.pages.length;

  const results: BenchmarkResult[] = [
    benchmarkResult("table-single-page", singleAnalysis.pages.length === 1 && singleAnalysis.tables[0]?.totalBodyRows === 10, `pages=${singleAnalysis.pages.length}`),
    benchmarkResult("table-multi-page", multiAnalysis.pages.length >= 3 && new Set(multiSeen).size === 100, `pages=${multiAnalysis.pages.length}`),
    benchmarkResult("table-header-repeat", (multiAnalysis.tables[0]?.fragments.slice(1).every((fragment) => fragment.headerRowCount === 1) ?? false), `fragments=${multiAnalysis.tables[0]?.fragments.length ?? 0}`),
    benchmarkResult("table-rowspan-split", rowspanAnalysis.pages.length > 1 && (rowspanAnalysis.tables[0]?.fragments.length ?? 0) > 1, `pages=${rowspanAnalysis.pages.length}`),
    benchmarkResult("table-colspan", ((colspanAnalysis.tables[0]?.columnWidths[0] ?? 0) + (colspanAnalysis.tables[0]?.columnWidths[1] ?? 0) + (colspanAnalysis.tables[0]?.columnWidths[2] ?? 0)) > (colspanAnalysis.tables[0]?.columnWidths[3] ?? 0), `widths=${(colspanAnalysis.tables[0]?.columnWidths ?? []).map((value) => value.toFixed(1)).join(",")}`),
    benchmarkResult("table-nested", nestedPages > 1, `pages=${nestedPages}`),
    benchmarkResult("table-1000-rows", performanceMs < 2000 && rssMb < 200, `ms=${performanceMs.toFixed(2)} rss_mb=${rssMb.toFixed(2)}`),
    benchmarkResult("table-auto-width", ((autoWidthAnalysis.tables[0]?.columnWidths[1] ?? 0) > (autoWidthAnalysis.tables[0]?.columnWidths[0] ?? 0)), `widths=${(autoWidthAnalysis.tables[0]?.columnWidths ?? []).map((value) => value.toFixed(1)).join(",")}`),
    benchmarkResult(
      "table-vertical-align",
      (verticalValues.get("Top aligned") as number) > (verticalValues.get("Middle aligned") as number) &&
        (verticalValues.get("Middle aligned") as number) > (verticalValues.get("Bottom aligned") as number),
      `y=${JSON.stringify(Object.fromEntries(verticalValues))}`,
    ),
    benchmarkResult("table-border-collapse", borderLines.length === 2, `center_lines=${borderLines.length}`),
  ];

  results.forEach((result) => {
    console.log(`${result.pass ? "PASS" : "FAIL"} ${result.name} ${result.detail}`);
  });
  console.log(`artifact_dir=${outputDir()}`);
  console.log(`render_ms=${(performance.now() - start).toFixed(2)}`);

  const failed = results.filter((result) => !result.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 5 benchmark failures: ${failed.map((result) => result.name).join(", ")}`);
  }
}

void main();
