import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase3Document } from "../src/phase3-render.js";
import {
  PHASE3_EXPECTED_PARAGRAPH_LINES,
  createA4Document,
  createDeterministicDocument,
  createFlexRowDocument,
  createFlexWrapDocument,
  createHeadingOrphanDocument,
  createJustifiedDocument,
  createLetterDocument,
  createMultiPageDocument,
  createNestedContainersDocument,
  createSingleParagraphDocument,
} from "./phase3-fixtures.js";
import { ensurePhase2FontFixtures } from "./phase2-font-fixtures.js";

interface BenchmarkResult {
  detail: string;
  name: string;
  pass: boolean;
}

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(packageRoot(), "output", "phase3");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function benchmarkResult(name: string, pass: boolean, detail: string): BenchmarkResult {
  return { name, pass, detail };
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "");
}

function checkQpdf(pdfPath: string): void {
  if (!hasBinary("qpdf")) {
    return;
  }
  execFileSync("qpdf", ["--check", pdfPath], { stdio: "pipe" });
}

async function writePdfArtifact(name: string, document: Parameters<typeof PdfEngine.render>[0]): Promise<{ buffer: Buffer; path: string }> {
  const path = join(outputDir(), `${name}.pdf`);
  const buffer = await PdfEngine.render(document);
  writeFileSync(path, buffer);
  checkQpdf(path);
  return { buffer, path };
}

async function main(): Promise<void> {
  const start = performance.now();
  mkdirSync(outputDir(), { recursive: true });

  const fonts = await ensurePhase2FontFixtures();
  const inter = { family: "Inter", source: fonts.inter } as const;

  const singleParagraphDocument = createSingleParagraphDocument(inter);
  const justifiedDocument = createJustifiedDocument(inter);
  const multiPageDocument = createMultiPageDocument(inter);
  const deterministicDocument = createDeterministicDocument(inter);

  const singleParagraph = await writePdfArtifact("layout-single-paragraph", singleParagraphDocument);
  const justified = await writePdfArtifact("layout-justified", justifiedDocument);
  const multiPage = await writePdfArtifact("layout-multi-page", multiPageDocument);
  const headingOrphan = await writePdfArtifact("layout-heading-orphan", createHeadingOrphanDocument());
  const flexRow = await writePdfArtifact("layout-flexbox-row", createFlexRowDocument());
  const flexWrap = await writePdfArtifact("layout-flexbox-wrap", createFlexWrapDocument());
  const nested = await writePdfArtifact("layout-nested-containers", createNestedContainersDocument());
  const a4 = await writePdfArtifact("layout-page-size-a4", createA4Document());
  const letter = await writePdfArtifact("layout-page-size-letter", createLetterDocument());
  const deterministic = await writePdfArtifact("layout-deterministic", deterministicDocument);

  const singleParagraphAnalysis = await analyzePhase3Document(singleParagraphDocument);
  const justifiedAnalysis = await analyzePhase3Document(justifiedDocument);
  const multiPageAnalysis = await analyzePhase3Document(multiPageDocument);
  const headingAnalysis = await analyzePhase3Document(createHeadingOrphanDocument());
  const flexRowAnalysis = await analyzePhase3Document(createFlexRowDocument());
  const flexWrapAnalysis = await analyzePhase3Document(createFlexWrapDocument());
  const nestedAnalysis = await analyzePhase3Document(createNestedContainersDocument());
  const a4Analysis = await analyzePhase3Document(createA4Document());
  const letterAnalysis = await analyzePhase3Document(createLetterDocument());

  const justificationTargetRight = 72 + 320;
  const justificationDeltas = (justifiedAnalysis.pages[0]?.texts ?? [])
    .slice(0, -1)
    .map((line) => Math.abs(justificationTargetRight - ((line.x ?? 0) + (line.width ?? 0) + ((line.wordSpacing ?? 0) * (line.spaceCount ?? 0)))));

  const deterministicPass = Array.from({ length: 100 }, async () => PdfEngine.render(deterministicDocument));
  const deterministicBuffers = await Promise.all(deterministicPass);
  const deterministicBytes = deterministicBuffers.every((buffer) => Buffer.compare(deterministicBuffers[0] as Buffer, buffer) === 0);

  const results: BenchmarkResult[] = [
    benchmarkResult(
      "layout-single-paragraph",
      JSON.stringify(singleParagraphAnalysis.pages[0]?.texts.map((line) => line.value)) === JSON.stringify(PHASE3_EXPECTED_PARAGRAPH_LINES),
      `line_count=${singleParagraphAnalysis.pages[0]?.texts.length}`,
    ),
    benchmarkResult(
      "layout-justified",
      justificationDeltas.every((delta) => delta <= 0.5) &&
        (justifiedAnalysis.pages[0]?.texts ?? []).slice(0, -1).every((line) => (line.wordSpacing ?? 0) >= 0),
      `max_delta=${Math.max(...justificationDeltas).toFixed(3)}`,
    ),
    benchmarkResult(
      "layout-multi-page",
      multiPageAnalysis.pages.length === 13 &&
        compactText(multiPageAnalysis.pages.flatMap((page) => page.texts.map((line) => line.value)).join(" ")).length > 10_000,
      `pages=${multiPageAnalysis.pages.length}`,
    ),
    benchmarkResult(
      "layout-heading-orphan",
      !(headingAnalysis.pages[0]?.texts ?? []).some((line) => line.value === "Heading should move") &&
        (headingAnalysis.pages[1]?.texts ?? []).some((line) => line.value === "Heading should move"),
      `page_count=${headingAnalysis.pages.length}`,
    ),
    benchmarkResult(
      "layout-flexbox-row",
      JSON.stringify((flexRowAnalysis.pages[0]?.texts ?? []).map((line) => ({ value: line.value, x: line.x, y: line.y }))) === JSON.stringify([
        { value: "Left column text", x: 96, y: 686.4 },
        { value: "Right column text", x: 300, y: 686.4 },
      ]),
      `positions=${JSON.stringify((flexRowAnalysis.pages[0]?.texts ?? []).map((line) => [line.value, line.x, line.y]))}`,
    ),
    benchmarkResult(
      "layout-flexbox-wrap",
      JSON.stringify((flexWrapAnalysis.pages[0]?.texts ?? []).map((line) => ({ value: line.value, x: line.x, y: line.y }))) === JSON.stringify([
        { value: "Item 1", x: 96, y: 686.4 },
        { value: "Item 2", x: 216, y: 686.4 },
        { value: "Item 3", x: 96, y: 640.4 },
        { value: "Item 4", x: 216, y: 640.4 },
        { value: "Item 5", x: 96, y: 594.4 },
      ]),
      `positions=${JSON.stringify((flexWrapAnalysis.pages[0]?.texts ?? []).map((line) => [line.value, line.x, line.y]))}`,
    ),
    benchmarkResult(
      "layout-nested-containers",
      JSON.stringify((nestedAnalysis.pages[0]?.texts ?? []).map((line) => ({ value: line.value, x: line.x, y: line.y }))) === JSON.stringify([
        { value: "Nested container text", x: 152, y: 632.4 },
      ]),
      `positions=${JSON.stringify((nestedAnalysis.pages[0]?.texts ?? []).map((line) => [line.value, line.x, line.y]))}`,
    ),
    benchmarkResult(
      "layout-page-size-a4",
      a4Analysis.page.width === 595.276 &&
        a4Analysis.page.height === 841.89 &&
        a4.buffer.toString("binary").includes("/MediaBox [0 0 595.276 841.89]"),
      `media_box=${a4Analysis.page.width}x${a4Analysis.page.height}`,
    ),
    benchmarkResult(
      "layout-page-size-letter",
      letterAnalysis.page.width === 612 &&
        letterAnalysis.page.height === 792 &&
        letter.buffer.toString("binary").includes("/MediaBox [0 0 612 792]"),
      `media_box=${letterAnalysis.page.width}x${letterAnalysis.page.height}`,
    ),
    benchmarkResult(
      "layout-deterministic",
      deterministicBytes && deterministic.buffer.length > 0,
      `render_count=100 bytes=${deterministic.buffer.length}`,
    ),
  ];

  results.forEach((result) => {
    console.log(`${result.pass ? "PASS" : "FAIL"} ${result.name} ${result.detail}`);
  });

  console.log(`artifact_dir=${outputDir()}`);
  console.log(`render_ms=${(performance.now() - start).toFixed(2)}`);

  const failed = results.filter((result) => !result.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 3 benchmark failures: ${failed.map((result) => result.name).join(", ")}`);
  }

  void singleParagraph;
  void justified;
  void multiPage;
  void headingOrphan;
  void flexRow;
  void flexWrap;
  void nested;
}

void main();
