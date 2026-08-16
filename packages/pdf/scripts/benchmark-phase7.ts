import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase7Document } from "../src/phase7-analyze.js";
import { createTaggedDocument } from "./phase7-fixtures.js";

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
  return join(packageRoot(), "output", "phase7");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function ensureQpdf(path: string): void {
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  }
}

function buildQdf(inputPath: string): string {
  const outputPath = join(outputDir(), "tagged-qdf.pdf");
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--qdf", "--object-streams=disable", "--stream-data=uncompress", inputPath, outputPath], { stdio: "pipe" });
    return readFileSync(outputPath, "latin1");
  }
  return readFileSync(inputPath, "latin1");
}

async function main(): Promise<void> {
  mkdirSync(outputDir(), { recursive: true });

  const document = createTaggedDocument();
  const analysis = await analyzePhase7Document(document);
  const pdfPath = join(outputDir(), "tagged-document.pdf");
  writeFileSync(pdfPath, await PdfEngine.render(document));
  ensureQpdf(pdfPath);

  const qdf = buildQdf(pdfPath);
  const roles = analysis.interactive.accessibility.structure.map((entry) => entry.role);
  const allPagesHaveArtifacts = analysis.pages.every((page) =>
    page.texts.some((text) => text.accessibility?.artifact) &&
    (page.extraCommands ?? []).some((entry) => typeof entry !== "string" && entry.accessibility?.artifact),
  );

  const results: BenchmarkResult[] = [
    result("tag-structure-tree", qdf.includes("/StructTreeRoot") && qdf.includes("/S /Document") && qdf.includes("/S /H1") && qdf.includes("/S /P") && qdf.includes("/S /Table"), "structure-tree-present"),
    result("tag-heading-levels", roles.includes("H1") && roles.includes("H2") && roles.includes("H3") && roles.indexOf("H1") < roles.indexOf("H2") && roles.indexOf("H2") < roles.indexOf("H3"), `roles=${roles.join(",")}`),
    result("tag-table-headers", qdf.includes("/S /TH") && qdf.includes("/Scope /Column") && qdf.includes("/S /TD"), "table-header-structure"),
    result("tag-alt-text", qdf.includes("/S /Figure") && qdf.includes("/Alt (Quarterly revenue chart)"), "alt=Quarterly revenue chart"),
    result("tag-reading-order", roles.indexOf("H1") < roles.indexOf("P") && roles.indexOf("P") < roles.indexOf("L") && roles.indexOf("L") < roles.indexOf("Table"), `roles=${roles.join(",")}`),
    result("tag-artifact", qdf.includes("/Artifact BMC") && allPagesHaveArtifacts, `artifact_pages=${analysis.pages.length}`),
    result("tag-language", qdf.includes("/Lang (en-US)") && qdf.includes("/Lang (ko-KR)"), "langs=en-US,ko-KR"),
    result("tag-list-structure", qdf.includes("/S /L") && qdf.includes("/S /LI") && qdf.includes("/S /Lbl") && qdf.includes("/S /LBody"), "list-roles-present"),
    result("pdfua-pac-check", qdf.includes("/MarkInfo") && qdf.includes("/ParentTree") && qdf.includes("/Alt (Quarterly revenue chart)") && qdf.includes("/Scope /Column") && qdf.includes("/Artifact BMC"), "structural-pac-proxy"),
    result("pdfua-acrobat-check", qdf.includes("/StructParents") && qdf.includes("/Tabs /S") && qdf.includes("/Lang (en-US)") && qdf.includes("/StructTreeRoot"), "structural-acrobat-proxy"),
  ];

  results.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.name} ${entry.detail}`);
  });
  console.log(`artifact_dir=${outputDir()}`);

  const failed = results.filter((entry) => !entry.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 7 benchmark failures: ${failed.map((entry) => entry.name).join(", ")}`);
  }
}

void main();
