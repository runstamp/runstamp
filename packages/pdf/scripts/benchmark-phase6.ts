import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase6Document } from "../src/phase6-analyze.js";
import {
  createCheckboxDocument,
  createDropdownDocument,
  createEditableFormDocument,
  createExternalLinkDocument,
  createMetadataDocument,
  createMixedFormDocument,
  createNavigationDocument,
  createPageNumberDocument,
  createRadioDocument,
  createTextFieldDocument,
} from "./phase6-fixtures.js";

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
  return join(packageRoot(), "output", "phase6");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function ensureQpdf(path: string): void {
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  }
}

function extractText(path: string, firstPage?: number, lastPage?: number): string {
  if (!hasBinary("pdftotext")) {
    return "";
  }
  const args = ["-layout"];
  if (firstPage !== undefined) {
    args.push("-f", String(firstPage));
  }
  if (lastPage !== undefined) {
    args.push("-l", String(lastPage));
  }
  args.push(path, "-");
  return execFileSync("pdftotext", args, { encoding: "utf8" });
}

async function renderArtifact(name: string, document: Parameters<typeof PdfEngine.render>[0]): Promise<string> {
  const path = join(outputDir(), `${name}.pdf`);
  writeFileSync(path, await PdfEngine.render(document));
  ensureQpdf(path);
  return path;
}

async function main(): Promise<void> {
  mkdirSync(outputDir(), { recursive: true });

  const externalLinkDoc = createExternalLinkDocument();
  const navigationDoc = createNavigationDocument();
  const textFieldDoc = createTextFieldDocument();
  const checkboxDoc = createCheckboxDocument();
  const dropdownDoc = createDropdownDocument();
  const radioDoc = createRadioDocument();
  const mixedFormDoc = createMixedFormDocument();
  const editableFormDoc = createEditableFormDocument();
  const pageNumberDoc = createPageNumberDocument();
  const metadataDoc = createMetadataDocument();

  const navigationAnalysis = await analyzePhase6Document(navigationDoc);
  const mixedFormAnalysis = await analyzePhase6Document(mixedFormDoc);
  const pageNumberAnalysis = await analyzePhase6Document(pageNumberDoc);

  const externalLinkPath = await renderArtifact("link-external", externalLinkDoc);
  const navigationPath = await renderArtifact("navigation", navigationDoc);
  const textFieldPath = await renderArtifact("form-text-field", textFieldDoc);
  const checkboxPath = await renderArtifact("form-checkbox", checkboxDoc);
  const dropdownPath = await renderArtifact("form-dropdown", dropdownDoc);
  const radioPath = await renderArtifact("form-radio", radioDoc);
  const mixedFormPath = await renderArtifact("form-mixed", mixedFormDoc);
  const editableFormPath = await renderArtifact("form-editable", editableFormDoc);
  const pageNumberPath = await renderArtifact("page-x-of-y", pageNumberDoc);
  const metadataPath = await renderArtifact("metadata-xmp", metadataDoc);

  const externalText = readFileSync(externalLinkPath).toString("latin1");
  const navigationText = readFileSync(navigationPath).toString("latin1");
  const textFieldText = readFileSync(textFieldPath).toString("latin1");
  const checkboxText = readFileSync(checkboxPath).toString("latin1");
  const dropdownText = readFileSync(dropdownPath).toString("latin1");
  const radioText = readFileSync(radioPath).toString("latin1");
  const mixedFormText = readFileSync(mixedFormPath).toString("latin1");
  const editableFormText = readFileSync(editableFormPath).toString("latin1");
  const metadataText = readFileSync(metadataPath).toString("latin1");

  const tocText = extractText(navigationPath, 1, 1);
  const pageNumberExtracted = extractText(pageNumberPath);

  const rightEdges = navigationAnalysis.headings.map((heading) => heading.pageNumber);
  const mixedAnnotationKinds = mixedFormAnalysis.pages[0]?.annotations?.map((annotation) => annotation.kind) ?? [];

  const results: BenchmarkResult[] = [
    result("link-external", externalText.includes("/Subtype /Link") && externalText.includes("/S /URI") && externalText.includes("(https://runstamp.com/docs)"), "uri=https://runstamp.com/docs"),
    result("link-internal", navigationText.includes("/S /GoTo") && (navigationAnalysis.pages[0]?.annotations?.some((annotation) => annotation.kind === "link-internal") ?? false), `annotations=${navigationAnalysis.pages[0]?.annotations?.length ?? 0}`),
    result("bookmark-tree", navigationText.includes("/Outlines") && navigationText.includes("(Introduction)") && navigationText.includes("(Configuration)"), `headings=${navigationAnalysis.headings.length}`),
    result("bookmark-navigation", navigationAnalysis.interactive.outlines?.length === 3 && navigationAnalysis.headings.every((heading) => heading.destination.pageIndex >= 0), `outlines=${navigationAnalysis.interactive.outlines?.length ?? 0}`),
    result("toc-page-numbers", navigationAnalysis.headings.every((heading) => tocText.includes(String(heading.pageNumber))), `pages=${rightEdges.join(",")}`),
    result("toc-dot-leaders", /\.\.\.+\s+\d+/m.test(tocText), `toc=${JSON.stringify(tocText.split("\n").filter(Boolean).slice(0, 5))}`),
    result("form-text-field", textFieldText.includes("/FT /Tx") && textFieldText.includes("/V (Ada Lovelace)") && textFieldText.includes("/MaxLen 64"), "value=Ada Lovelace"),
    result("form-checkbox", checkboxText.includes("/FT /Btn") && checkboxText.includes("/AS /Off") && checkboxText.includes("/V /Off"), "state=Off"),
    result("form-dropdown", dropdownText.includes("/FT /Ch") && dropdownText.includes("/V (Engineering)") && dropdownText.includes("(Operations)"), "value=Engineering options=3"),
    result("form-radio", radioText.includes("/FT /Btn") && radioText.includes("/T (delivery)") && radioText.includes("/Kids [") && radioText.includes("/V /Annual") && (radioText.match(/\/Subtype \/Widget/g) ?? []).length === 2, "group=delivery value=Annual"),
    result("form-mixed-order", mixedAnnotationKinds.join(",") === "form-text,form-radio,form-checkbox,form-radio,form-dropdown" && mixedFormText.includes("/AcroForm") && (mixedFormText.match(/\/Subtype \/Widget/g) ?? []).length === 5, `order=${mixedAnnotationKinds.join(",")}`),
    result("form-editable", !/\/Ff 1(?!\d)/.test(editableFormText) && editableFormText.includes("/T (approve_release)") && editableFormText.includes("/T (billing_cycle)") && editableFormText.includes("/T (project_name)") && editableFormText.includes("/T (team)") && (editableFormText.match(/\/Subtype \/Widget/g) ?? []).length === 5, "widgets=5 editable=true"),
    result("page-x-of-y", pageNumberAnalysis.pages.length > 1 && pageNumberExtracted.includes(`Page 1 of ${pageNumberAnalysis.pages.length}`), `pages=${pageNumberAnalysis.pages.length}`),
    result("metadata-xmp", metadataText.includes("/Metadata") && metadataText.includes("/Title (Phase 6 Metadata)") && metadataText.includes("<dc:title>") && metadataText.includes("<xmp:ModifyDate>2026-03-29T11:30:00.000Z</xmp:ModifyDate>"), "title=Phase 6 Metadata"),
  ];

  results.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.name} ${entry.detail}`);
  });
  console.log(`artifact_dir=${outputDir()}`);

  const failed = results.filter((entry) => !entry.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 6 benchmark failures: ${failed.map((entry) => entry.name).join(", ")}`);
  }
}

void main();
