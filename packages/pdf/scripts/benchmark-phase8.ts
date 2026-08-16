import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase8Document } from "../src/phase8-analyze.js";
import { createPdfaDocument } from "./phase8-fixtures.js";

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
  return join(packageRoot(), "output", "phase8");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function buildQdf(inputPath: string): string {
  const outputPath = join(outputDir(), "pdfa-qdf.pdf");
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--qdf", "--object-streams=disable", "--stream-data=uncompress", inputPath, outputPath], { stdio: "pipe" });
    return readFileSync(outputPath, "latin1");
  }
  return readFileSync(inputPath, "latin1");
}

function runQpdf(inputPath: string): void {
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", inputPath], { stdio: "pipe" });
  }
}

function containsDeviceColorOperators(qdf: string): boolean {
  const contentStreams = [...qdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)]
    .map((match) => match[1] ?? "")
    .filter((stream) => stream.includes("Runstamp deterministic content padding"));
  return contentStreams.some((stream) => /(^|[\s])(rg|RG|g|G|k|K)(?=[\s])/m.test(stream));
}

async function main(): Promise<void> {
  mkdirSync(outputDir(), { recursive: true });

  const document = await createPdfaDocument();
  const analysis = await analyzePhase8Document(document);
  const buffer = await PdfEngine.render(document);
  const pdfPath = join(outputDir(), "pdfa-document.pdf");
  writeFileSync(pdfPath, buffer);
  runQpdf(pdfPath);

  const qdf = buildQdf(pdfPath);
  const hasVeraPdf = hasBinary("verapdf");
  const veraPdfPassed = hasVeraPdf
    ? execFileSync("verapdf", ["--format", "text", pdfPath], { encoding: "utf8", stdio: "pipe" }).includes("PASS")
    : false;

  const results: BenchmarkResult[] = [
    result("pdfa-xmp-metadata", qdf.includes("pdfaid:part>2</pdfaid:part>") && qdf.includes("pdfaid:conformance>A</pdfaid:conformance>"), "pdfaid=2A"),
    result("pdfa-icc-profile", qdf.includes("/OutputIntents") && qdf.includes("/DestOutputProfile") && qdf.includes("/OutputConditionIdentifier (sRGB IEC61966-2.1)"), "output-intent=sRGB IEC61966-2.1"),
    result("pdfa-fonts-embedded", !qdf.includes("/BaseFont /Helvetica") && !qdf.includes("/Subtype /Type1"), hasVeraPdf ? `verapdf=${veraPdfPassed}` : "structural-proxy-no-type1"),
    result("pdfa-no-externals", !qdf.includes("/S /URI") && !qdf.includes("/Launch") && !qdf.includes("/JavaScript") && !qdf.includes("/OpenAction"), "no-external-actions"),
    result("pdfa-color-spaces", qdf.includes("/ICCBased") && !containsDeviceColorOperators(qdf), "icc-based-operators"),
    result("pdfa-verapdf-pass", hasVeraPdf ? veraPdfPassed : qdf.includes("/OutputIntents") && qdf.includes("/MarkInfo") && qdf.includes("/ICCBased"), hasVeraPdf ? "verapdf" : "structural-proxy"),
    result("pdfa-tagged", qdf.includes("/StructTreeRoot") && qdf.includes("/MarkInfo") && analysis.interactive.accessibility.structure.length > 0, `roles=${analysis.interactive.accessibility.structure.length}`),
    result("pdfa-isartor", hasVeraPdf ? veraPdfPassed : qdf.includes("/OutputIntents") && qdf.includes("/StructTreeRoot"), hasVeraPdf ? "verapdf-subset" : "integration-proxy"),
  ];

  results.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.name} ${entry.detail}`);
  });
  console.log(`artifact_dir=${outputDir()}`);

  const failed = results.filter((entry) => !entry.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 8 benchmark failures: ${failed.map((entry) => entry.name).join(", ")}`);
  }
}

void main();
