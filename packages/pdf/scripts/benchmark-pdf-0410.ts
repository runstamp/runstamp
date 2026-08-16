import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import type { PdfDocumentPhase3 } from "../src/phase3-types.js";
import type { PdfPhase5TableCell, PdfPhase5TableNode, PdfPhase5TableRow } from "../src/phase5-types.js";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { ensurePhase2FontFixtures } from "./phase2-font-fixtures.js";
import { createPdfaDocument } from "./phase8-fixtures.js";
import {
  createPhase10SignOptions,
  createPhase10SigningDocument,
  ensurePhase10CertificateFixtures,
  verifyDetachedCms,
} from "./phase10-fixtures.js";
import { createRowspanSplitTableDocument } from "./phase5-fixtures.js";
import { TEST_LICENSE_KEY } from "../../../scripts/test-license-fixture.mjs";

type PdfEngineApi = typeof import("../src/engine.js")["PdfEngine"];
type ExtractPdfSignaturesApi = typeof import("../src/phase10-validate.js")["extractPdfSignatures"];
type BenchmarkStatus = "FAIL" | "PARTIAL" | "PASS";

interface BenchmarkResult {
  artifact?: string;
  durationMs: number;
  id: string;
  metrics: Record<string, unknown>;
  name: string;
  notes: string[];
  status: BenchmarkStatus;
}

interface AcrobatValidationEvidence {
  acrobatVersion?: unknown;
  artifact?: unknown;
  benchmarkId?: unknown;
  signedPdfSha256?: unknown;
  status?: unknown;
  validatedAt?: unknown;
}

interface AcrobatValidationEvidenceResult {
  accepted: boolean;
  evidence?: AcrobatValidationEvidence;
  path: string;
  reasons: string[];
}

const CASE_NAMES: Record<string, string> = {
  "BM-PDF-001": "rowSpan table at page break",
  "BM-PDF-002": "keepTogether tall row",
  "BM-PDF-003": "invalid colspan placeholder",
  "BM-PDF-004": "100-page memory",
  "BM-PDF-005": "CJK font subsetting",
  "BM-PDF-006": "RTL Arabic/Hebrew mixed",
  "BM-PDF-007": "symbols and emoji handling",
  "BM-PDF-008": "digital signature",
  "BM-PDF-009": "PDF/A-2a compliance",
  "BM-PDF-010": "500-page memory",
  "BM-PDF-011": "input mutation",
  "BM-PDF-012": "concurrent render isolation",
};

const CASE_IDS = Object.keys(CASE_NAMES);
let proEngineModule: Promise<{
  PdfEngine: PdfEngineApi;
  extractPdfSignatures: ExtractPdfSignaturesApi;
}> | undefined;

async function loadProEngine(): Promise<{
  PdfEngine: PdfEngineApi;
  extractPdfSignatures: ExtractPdfSignaturesApi;
}> {
  proEngineModule ??= import("../dist-pro/index.js") as Promise<{
    PdfEngine: PdfEngineApi;
    extractPdfSignatures: ExtractPdfSignaturesApi;
  }>;
  return proEngineModule;
}

async function renderPdf(document: Parameters<PdfEngineApi["render"]>[0]): Promise<Buffer> {
  const { PdfEngine } = await loadProEngine();
  return PdfEngine.render(document);
}

async function signPdf(
  document: Parameters<PdfEngineApi["sign"]>[0],
  options: Parameters<PdfEngineApi["sign"]>[1],
): Promise<Buffer> {
  const { PdfEngine } = await loadProEngine();
  return PdfEngine.sign(document, options);
}

async function extractSignatures(buffer: Buffer): Promise<ReturnType<ExtractPdfSignaturesApi>> {
  const { extractPdfSignatures } = await loadProEngine();
  return extractPdfSignatures(buffer);
}

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(packageRoot(), "output", "benchmarks-0410");
}

function acrobatEvidencePath(): string {
  return join(outputDir(), "bm-pdf-008-acrobat-validation.json");
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function round(value: number, places = 1): number {
  return Number(value.toFixed(places));
}

function peakRssMb(): number {
  return round(process.resourceUsage().maxRSS / 1024, 1);
}

function compactText(value: string): string {
  return value.replace(/[\u202A-\u202E\u2066-\u2069]/gu, "").replace(/\s+/g, "");
}

function writePdf(name: string, buffer: Buffer): string {
  const path = join(outputDir(), name);
  writeFileSync(path, buffer);
  return path;
}

function commandText(command: string, args: string[]): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: "pipe",
  });
}

function commandOk(command: string, args: string[]): boolean {
  if (!hasBinary(command)) {
    return false;
  }
  try {
    execFileSync(command, args, { maxBuffer: 64 * 1024 * 1024, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function qpdfCheck(path: string): boolean {
  return commandOk("qpdf", ["--check", path]);
}

function pageCount(path: string): number | undefined {
  if (!hasBinary("qpdf")) {
    return undefined;
  }
  return Number(commandText("qpdf", ["--show-npages", path]).trim());
}

function extractText(path: string, raw = false): string {
  if (!hasBinary("pdftotext")) {
    return "";
  }
  return commandText("pdftotext", [
    ...(raw ? ["-raw"] : []),
    "-enc",
    "UTF-8",
    "-nopgbrk",
    path,
    "-",
  ]).trim();
}

function pdffontRows(path: string): string[] {
  if (!hasBinary("pdffonts")) {
    return [];
  }
  return commandText("pdffonts", [path])
    .split("\n")
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readAcrobatValidationEvidence(signedPdf: Buffer): AcrobatValidationEvidenceResult {
  const path = acrobatEvidencePath();
  if (!existsSync(path)) {
    return {
      accepted: false,
      path,
      reasons: [`missing ${path}`],
    };
  }

  let evidence: AcrobatValidationEvidence;
  try {
    evidence = JSON.parse(readFileSync(path, "utf8")) as AcrobatValidationEvidence;
  } catch (error) {
    return {
      accepted: false,
      path,
      reasons: [`invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const reasons: string[] = [];
  if (evidence.benchmarkId !== "BM-PDF-008") {
    reasons.push("benchmarkId must be BM-PDF-008");
  }
  if (evidence.status !== "valid") {
    reasons.push('status must be "valid"');
  }
  if (typeof evidence.acrobatVersion !== "string" || evidence.acrobatVersion.length === 0) {
    reasons.push("acrobatVersion must be recorded");
  }
  if (typeof evidence.validatedAt !== "string" || Number.isNaN(Date.parse(evidence.validatedAt))) {
    reasons.push("validatedAt must be an ISO timestamp");
  }
  const expectedHash = sha256Buffer(signedPdf);
  if (evidence.signedPdfSha256 !== expectedHash) {
    reasons.push("signedPdfSha256 does not match the generated signed PDF");
  }
  if (typeof evidence.artifact !== "string" || evidence.artifact.length === 0) {
    reasons.push("artifact path must be recorded");
  } else {
    const artifact = isAbsolute(evidence.artifact) ? evidence.artifact : join(outputDir(), evidence.artifact);
    if (!existsSync(artifact)) {
      reasons.push(`artifact does not exist: ${artifact}`);
    }
  }

  return {
    accepted: reasons.length === 0,
    evidence,
    path,
    reasons,
  };
}

function verapdfPass(path: string): boolean | undefined {
  if (!hasBinary("verapdf")) {
    return undefined;
  }
  try {
    return commandText("verapdf", ["--format", "text", path]).includes("PASS");
  } catch {
    return false;
  }
}

function buildQdf(path: string): string {
  if (!hasBinary("qpdf")) {
    return readFileSync(path, "latin1");
  }
  const qdfPath = join(outputDir(), `${path.split("/").pop() ?? "document"}.qdf.pdf`);
  execFileSync("qpdf", ["--qdf", "--object-streams=disable", "--stream-data=uncompress", path, qdfPath], {
    maxBuffer: 64 * 1024 * 1024,
    stdio: "pipe",
  });
  return readFileSync(qdfPath, "latin1");
}

function paragraph(value: string): { type: "paragraph"; value: string } {
  return { type: "paragraph", value };
}

function tableCell(value: string, options: Partial<PdfPhase5TableCell> = {}): PdfPhase5TableCell {
  return {
    children: options.children ?? [paragraph(value)],
    colSpan: options.colSpan,
    role: options.role,
    rowSpan: options.rowSpan,
    style: options.style,
  };
}

function createKeepTogetherDocument(): PdfDocumentPhase3 {
  return {
    page: {
      margin: 24,
      size: { height: 240, width: 360 },
    },
    children: [
      {
        type: "paragraph",
        value: "Intro block before the table.",
        style: { marginBottom: 96 },
      },
      {
        type: "table",
        columns: [{}, {}],
        header: [
          {
            cells: [
              tableCell("Name", { role: "th" }),
              tableCell("Status", { role: "th" }),
            ],
          },
        ],
        body: [
          {
            keepTogether: true,
            cells: [
              tableCell("Must stay intact", { style: { minHeight: 72, padding: 6 } }),
              tableCell("Moved to next page", { style: { minHeight: 72, padding: 6 } }),
            ],
          },
        ],
      },
    ],
  };
}

function createInvalidPlaceholderDocument(): PdfDocumentPhase3 {
  return {
    children: [{
      type: "table",
      body: [
        {
          cells: [
            tableCell("carry", { rowSpan: 2 }),
            tableCell("middle"),
            tableCell("tail"),
          ],
        },
        {
          cells: [
            tableCell("missing trailing placeholder"),
          ],
        },
      ],
    }],
    page: {
      margin: 48,
      size: "Letter",
    },
  };
}

function runLargePageNodeProbe(pageTotal: number, paragraphsPerPage: number, artifactName: string): {
  bytes: number;
  peakRssMb: number;
} {
  const artifact = join(outputDir(), artifactName);
  const enginePath = join(packageRoot(), "dist-pro", "index.js");
  const code = `
    import { writeFileSync } from "node:fs";
    import { PdfEngine } from ${JSON.stringify(enginePath)};
    const repeatedWords = (prefix, count) => Array.from({ length: count }, (_, index) => \`\${prefix}-\${index + 1}\`).join(" ");
    const pageTotal = ${pageTotal};
    const paragraphsPerPage = ${paragraphsPerPage};
    const paragraphText = repeatedWords("w", 100);
    const document = {
      pages: Array.from({ length: pageTotal }, (_, pageIndex) => ({
        texts: [
          { fontSize: 24, value: \`Benchmark Page \${pageIndex + 1}\`, x: 54, y: 740 },
          ...Array.from({ length: paragraphsPerPage }, (_, paragraphIndex) => ({
            fontSize: 10,
            value: paragraphText,
            x: 54,
            y: 700 - paragraphIndex * 76,
          })),
          { fontSize: 9, value: \`Page \${pageIndex + 1} of \${pageTotal}\`, x: 270, y: 36 },
        ],
      })),
    };
    const buffer = await PdfEngine.render(document);
    writeFileSync(${JSON.stringify(artifact)}, buffer);
    process.stdout.write(JSON.stringify({
      bytes: buffer.length,
      peakRssMb: Number((process.resourceUsage().maxRSS / 1024).toFixed(1)),
    }));
  `;
  const stdout = commandText("node", ["--input-type=module", "-e", code]);
  return JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}") as { bytes: number; peakRssMb: number };
}

function cjkString(start: number, length: number): string {
  return Array.from({ length }, (_, index) => String.fromCodePoint(0x4E00 + ((start + index) % 2000))).join("");
}

async function createCjkSubsetDocument(): Promise<PdfDocumentPhase3 & { pages: unknown[] }> {
  const fonts = await ensurePhase2FontFixtures();
  return {
    pages: Array.from({ length: 50 }, (_, pageIndex) => ({
      texts: [{
        font: { family: "Noto Sans CJK JP", source: fonts.cjk },
        fontSize: 11,
        value: cjkString(pageIndex * 40, 300),
        x: 48,
        y: 720,
      }],
    })),
  };
}

async function createRtlDocument(): Promise<PdfDocumentPhase3 & { pages: unknown[] }> {
  const fonts = await ensurePhase2FontFixtures();
  return {
    pages: [{
      texts: [
        {
          direction: "rtl",
          font: { family: "Noto Sans Arabic", source: fonts.arabic },
          fontSize: 24,
          value: "بسم الله الرحمن الرحيم",
          x: 72,
          y: 720,
        },
        {
          fallbackFonts: [{ family: "Noto Sans Arabic", source: fonts.arabic }],
          font: { family: "Lato", source: fonts.lato },
          fontSize: 14,
          value: "Total Revenue إجمالي الإيرادات: $4.2M",
          x: 72,
          y: 680,
        },
        {
          fallbackFonts: [{ family: "Noto Sans Hebrew", source: fonts.hebrew }],
          font: { family: "Lato", source: fonts.lato },
          fontSize: 14,
          value: "שלום עולם - Quarterly Report Q4",
          x: 72,
          y: 650,
        },
        {
          direction: "rtl",
          font: { family: "Noto Sans Arabic", source: fonts.arabic },
          fontSize: 13,
          value: "المنتج   السعر",
          x: 72,
          y: 610,
        },
      ],
    }],
  };
}

async function createSymbolDocument(): Promise<PdfDocumentPhase3 & { pages: unknown[] }> {
  const fonts = await ensurePhase2FontFixtures();
  return {
    pages: [{
      texts: [
        { font: { family: "Noto Sans Symbols 2", source: fonts.symbols }, fontSize: 14, value: "Status: ✓ Complete  ✗ Failed  ★ Priority", x: 72, y: 720 },
        { font: { family: "Noto Sans Symbols 2", source: fonts.symbols }, fontSize: 14, value: "Arrows: → ← ↑ ↓ ⇒ ⇐", x: 72, y: 696 },
        { font: { family: "Noto Sans Symbols 2", source: fonts.symbols }, fontSize: 14, value: "Symbols: © ® ™ § ¶ † ‡ ° ± × ÷", x: 72, y: 672 },
        { font: { family: "Noto Sans Symbols 2", source: fonts.symbols }, fontSize: 14, value: "Math: ∑ ∏ ∫ √ ∞ ≈ ≠ ≤ ≥", x: 72, y: 648 },
        { font: { family: "Noto Sans Symbols 2", source: fonts.symbols }, fontSize: 14, value: "Warning: ⚠ Caution", x: 72, y: 624 },
      ],
    }],
  };
}

async function createEmojiDocument(): Promise<PdfDocumentPhase3 & { pages: unknown[] }> {
  const fonts = await ensurePhase2FontFixtures();
  return {
    pages: [{
      text: {
        font: { family: "Noto Color Emoji", source: fonts.emoji },
        fontSize: 16,
        value: "Unsupported astral emoji 🎯 📊",
        x: 72,
        y: 720,
      },
    }],
  };
}

function createMutationDocument(sharedItems: string[]): PdfDocumentPhase3 {
  return {
    children: [
      paragraph("List 1:"),
      paragraph(sharedItems.join(", ")),
      paragraph("List 2:"),
      paragraph(sharedItems.join(", ")),
    ],
    page: {
      margin: 48,
      size: "Letter",
    },
  };
}

function finish(
  id: string,
  status: BenchmarkStatus,
  metrics: Record<string, unknown>,
  notes: string[],
  artifact?: string,
): Omit<BenchmarkResult, "durationMs"> {
  return {
    artifact,
    id,
    metrics: {
      ...metrics,
      peakRssMb: metrics.peakRssMb ?? peakRssMb(),
    },
    name: CASE_NAMES[id] as string,
    notes,
    status,
  };
}

async function run001(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const document = createRowspanSplitTableDocument();
  const analysis = await analyzePhase5Document(document);
  const buffer = await renderPdf(document);
  const artifact = writePdf("bm-pdf-001-rowspan.pdf", buffer);
  const extracted = extractText(artifact);
  const fragments = analysis.tables[0]?.fragments ?? [];
  const secondPage = analysis.pages[1];
  const continuationRect = secondPage?.graphics?.some((graphic) =>
    graphic.type === "rect"
    && graphic.x === 36
    && graphic.width === 90
    && graphic.height === 72
  ) ?? false;
  const continuationText = secondPage?.texts.find((text) => text.value === "Launch");
  const ok = qpdfCheck(artifact)
    && analysis.pages.length > 1
    && fragments.length > 1
    && continuationRect
    && (continuationText?.x ?? 0) > 126
    && extracted.includes("Launch");
  return finish("BM-PDF-001", ok ? "PASS" : "FAIL", {
    bytes: buffer.length,
    continuationRect,
    launchX: continuationText?.x,
    pages: pageCount(artifact),
    qpdf: qpdfCheck(artifact),
  }, [
    `layoutFragments=${fragments.length}`,
    `continuationRect=${continuationRect}`,
    `continuedTextRightOfSpan=${(continuationText?.x ?? 0) > 126}`,
  ], artifact);
}

async function run002(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const document = createKeepTogetherDocument();
  const analysis = await analyzePhase5Document(document);
  const buffer = await renderPdf(document);
  const artifact = writePdf("bm-pdf-002-keep-together.pdf", buffer);
  const fragments = analysis.tables[0]?.fragments ?? [];
  const rowFragments = fragments.flatMap((fragment) =>
    fragment.rowFragments
      .filter((rowFragment) => rowFragment.bodyRowIndex === 0)
      .map((rowFragment) => ({ ...rowFragment, pageIndex: fragment.pageIndex })),
  );
  const ok = qpdfCheck(artifact)
    && rowFragments.length === 1
    && rowFragments[0]?.pageIndex === 1
    && rowFragments[0].rowSliceStart === 0
    && !analysis.pages[0]?.texts.some((text) => text.value === "Must stay intact")
    && (analysis.pages[1]?.texts.some((text) => text.value === "Must stay intact") ?? false);
  return finish("BM-PDF-002", ok ? "PASS" : "FAIL", {
    bytes: buffer.length,
    pages: pageCount(artifact),
    qpdf: qpdfCheck(artifact),
    rowFragments,
  }, [
    `rowFragmentCount=${rowFragments.length}`,
    `rowStartPage=${rowFragments[0]?.pageIndex}`,
    `rowSliceStart=${rowFragments[0]?.rowSliceStart}`,
  ], artifact);
}

async function run003(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const started = performance.now();
  let message = "";
  try {
    await analyzePhase5Document(createInvalidPlaceholderDocument());
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  const elapsedMs = round(performance.now() - started, 2);
  const ok = elapsedMs < 1000 && /placeholder cells/i.test(message);
  return finish("BM-PDF-003", ok ? "PASS" : "FAIL", {
    elapsedMs,
    message,
  }, [
    `error in ${elapsedMs}ms`,
    message,
  ]);
}

async function run004(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const artifact = join(outputDir(), "bm-pdf-004-100-pages.pdf");
  const rendered = runLargePageNodeProbe(100, 8, "bm-pdf-004-100-pages.pdf");
  const pages = pageCount(artifact);
  const qpdf = qpdfCheck(artifact);
  const rss = rendered.peakRssMb;
  const ok = qpdf && pages === 100 && rss < 200;
  return finish("BM-PDF-004", ok ? "PASS" : "FAIL", {
    bytes: rendered.bytes,
    pages,
    peakRssMb: rss,
    qpdf,
    targetRssMb: 200,
  }, [
    `pages=${pages}`,
    `peakRssMb=${rss}`,
    `bytes=${rendered.bytes}`,
  ], artifact);
}

async function run005(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const fonts = await ensurePhase2FontFixtures();
  const buffer = await renderPdf(await createCjkSubsetDocument());
  const artifact = writePdf("bm-pdf-005-cjk-subset.pdf", buffer);
  const sourceFontBytes = statSync(fonts.cjk).size;
  const sourceToOutputRatio = round(sourceFontBytes / buffer.length, 2);
  const rows = pdffontRows(artifact);
  const ok = qpdfCheck(artifact) && pageCount(artifact) === 50 && sourceToOutputRatio > 10 && rows.length === 1;
  return finish("BM-PDF-005", ok ? "PASS" : "FAIL", {
    bytes: buffer.length,
    fontRows: rows,
    pages: pageCount(artifact),
    qpdf: qpdfCheck(artifact),
    sourceFontBytes,
    sourceToOutputRatio,
  }, [
    `output=${buffer.length}B`,
    `sourceFont=${sourceFontBytes}B`,
    `ratio=${sourceToOutputRatio}x`,
    `${rows.length} font row(s)`,
  ], artifact);
}

async function run006(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const arabic = "بسم الله الرحمن الرحيم";
  const mixedArabic = "Total Revenue إجمالي الإيرادات: $4.2M";
  const mixedHebrew = "שלום עולם - Quarterly Report Q4";
  const buffer = await renderPdf(await createRtlDocument());
  const artifact = writePdf("bm-pdf-006-rtl.pdf", buffer);
  const extracted = extractText(artifact, true);
  const compact = compactText(extracted);
  const hasArabic = compact.includes(compactText(arabic));
  const hasMixedArabicTokens = compact.includes("TotalRevenue")
    && compact.includes("إجمالي")
    && compact.includes("$4.2M");
  const hasExactMixedArabic = compact.includes(compactText(mixedArabic));
  const hasHebrew = compact.includes(compactText(mixedHebrew));
  const status: BenchmarkStatus = hasArabic && hasMixedArabicTokens && hasHebrew
    ? hasExactMixedArabic ? "PASS" : "PARTIAL"
    : "FAIL";
  return finish("BM-PDF-006", status, {
    bytes: buffer.length,
    hasArabic,
    hasExactMixedArabic,
    hasHebrew,
    hasMixedArabicTokens,
    pages: pageCount(artifact),
    qpdf: qpdfCheck(artifact),
    rawCompactText: compact,
  }, [
    `arabicTextExtracted=${hasArabic}`,
    `hebrewTextExtracted=${hasHebrew}`,
    `mixedArabicTokens=${hasMixedArabicTokens}`,
    `exactMixedArabic=${hasExactMixedArabic}`,
    hasExactMixedArabic
      ? "Poppler raw extraction preserves the exact mixed Arabic logical string, including lam-alef clustering."
      : "Poppler raw extraction still misses exact lam-alef logical clustering for the mixed Arabic line.",
  ], artifact);
}

async function run007(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const symbols = await renderPdf(await createSymbolDocument());
  const artifact = writePdf("bm-pdf-007-symbols.pdf", symbols);
  let emojiRejected = false;
  let emojiMessage = "";
  try {
    await renderPdf(await createEmojiDocument());
  } catch (error) {
    emojiRejected = true;
    emojiMessage = error instanceof Error ? error.message : String(error);
  }
  const ok = qpdfCheck(artifact) && emojiRejected;
  return finish("BM-PDF-007", ok ? "PASS" : "FAIL", {
    bytes: symbols.length,
    emojiMessage,
    emojiRejected,
    pages: pageCount(artifact),
    qpdf: qpdfCheck(artifact),
  }, [
    `symbol PDF qpdf=${qpdfCheck(artifact)}`,
    `emojiRejected=${emojiRejected}`,
    emojiMessage,
  ], artifact);
}

async function run008(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const fixtures = await ensurePhase10CertificateFixtures();
  const buffer = await signPdf(createPhase10SigningDocument(), createPhase10SignOptions(fixtures));
  const artifact = writePdf("bm-pdf-008-signed.pdf", buffer);
  const signatures = await extractSignatures(buffer);
  const qpdf = qpdfCheck(artifact);
  const opensslDetachedCms = verifyDetachedCms(buffer);
  const acrobatEvidence = readAcrobatValidationEvidence(buffer);
  const automatedOk = qpdf && signatures.length > 0 && opensslDetachedCms;
  const status: BenchmarkStatus = automatedOk
    ? acrobatEvidence.accepted ? "PASS" : "PARTIAL"
    : "FAIL";
  return finish("BM-PDF-008", status, {
    acrobatEvidenceAccepted: acrobatEvidence.accepted,
    acrobatEvidencePath: acrobatEvidence.path,
    acrobatEvidenceReasons: acrobatEvidence.reasons,
    acrobatVersion: acrobatEvidence.evidence?.acrobatVersion,
    bytes: buffer.length,
    opensslDetachedCms,
    pages: pageCount(artifact),
    qpdf,
    signatureCount: signatures.length,
  }, [
    `signatureCount=${signatures.length}`,
    `opensslDetachedCms=${opensslDetachedCms}`,
    acrobatEvidence.accepted
      ? `Adobe Acrobat validation artifact accepted: ${acrobatEvidence.evidence?.artifact as string}`
      : `Adobe Acrobat validation evidence not accepted: ${acrobatEvidence.reasons.join("; ")}`,
  ], artifact);
}

async function run009(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const buffer = await renderPdf(await createPdfaDocument());
  const artifact = writePdf("bm-pdf-009-pdfa-2a.pdf", buffer);
  const qpdf = qpdfCheck(artifact);
  const veraPdfOk = verapdfPass(artifact);
  const qdf = buildQdf(artifact);
  const noNotDefHex = !/<0000>\s+Tj/.test(qdf);
  const status: BenchmarkStatus = qpdf && veraPdfOk === true && noNotDefHex
    ? "PASS"
    : veraPdfOk === undefined && qpdf && noNotDefHex ? "PARTIAL" : "FAIL";
  return finish("BM-PDF-009", status, {
    bytes: buffer.length,
    noNotDefHex,
    pages: pageCount(artifact),
    qpdf,
    veraPdfAvailable: veraPdfOk !== undefined,
    veraPdfOk,
  }, [
    `qpdf=${qpdf}`,
    `veraPdfOk=${veraPdfOk}`,
    `noNotDefHex=${noNotDefHex}`,
  ], artifact);
}

async function run010(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const artifact = join(outputDir(), "bm-pdf-010-500-pages.pdf");
  const rendered = runLargePageNodeProbe(500, 6, "bm-pdf-010-500-pages.pdf");
  const pages = pageCount(artifact);
  const qpdf = qpdfCheck(artifact);
  const rss = rendered.peakRssMb;
  const ok = qpdf && pages === 500 && rss < 500;
  return finish("BM-PDF-010", ok ? "PASS" : "FAIL", {
    bytes: rendered.bytes,
    pages,
    peakRssMb: rss,
    qpdf,
    targetRssMb: 500,
  }, [
    `pages=${pages}`,
    `peakRssMb=${rss}`,
    `bytes=${rendered.bytes}`,
  ], artifact);
}

async function run011(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const sharedItems = ["Item A", "Item B", "Item C"];
  const document = createMutationDocument(sharedItems);
  const before = JSON.stringify({ document, sharedItems });
  const buffer = await renderPdf(document);
  const artifact = writePdf("bm-pdf-011-input-mutation.pdf", buffer);
  const after = JSON.stringify({ document, sharedItems });
  const extracted = extractText(artifact);
  const itemAOccurrences = (extracted.match(/Item A/g) ?? []).length;
  const ok = qpdfCheck(artifact) && before === after && itemAOccurrences === 2;
  return finish("BM-PDF-011", ok ? "PASS" : "FAIL", {
    bytes: buffer.length,
    inputUnchanged: before === after,
    itemAOccurrences,
    pages: pageCount(artifact),
    qpdf: qpdfCheck(artifact),
  }, [
    `inputUnchanged=${before === after}`,
    `itemAOccurrences=${itemAOccurrences}`,
    "This uses repeated shared data because the current layout API does not expose a list node.",
  ], artifact);
}

async function run012(): Promise<Omit<BenchmarkResult, "durationMs">> {
  const fonts = await ensurePhase2FontFixtures();
  const renderToken = (index: number): Promise<Buffer> => {
    const token = `DOC_TOKEN_${String(index).padStart(2, "0")}_DONE`;
    return renderPdf({
      pages: [{
        text: {
          font: { family: "Lato", source: fonts.lato },
          fontSize: 18,
          value: `Document ${index} ${token}`,
          x: 72,
          y: 720,
        },
      }],
    });
  };

  const concurrent = await Promise.all(Array.from({ length: 10 }, (_, index) => renderToken(index + 1)));
  const sequential: Buffer[] = [];
  for (let index = 1; index <= 10; index += 1) {
    sequential.push(await renderToken(index));
  }
  const artifacts = concurrent.map((buffer, index) => writePdf(`bm-pdf-012-concurrent-${index + 1}.pdf`, buffer));
  const deterministic = concurrent.every((buffer, index) => Buffer.compare(buffer, sequential[index] as Buffer) === 0);
  const valid = artifacts.every((artifact) => qpdfCheck(artifact));
  const isolated = artifacts.every((artifact, index) => {
    const text = extractText(artifact);
    const token = `DOC_TOKEN_${String(index + 1).padStart(2, "0")}_DONE`;
    return text.includes(token)
      && Array.from({ length: 10 }, (_, otherIndex) => `DOC_TOKEN_${String(otherIndex + 1).padStart(2, "0")}_DONE`)
        .filter((otherToken) => otherToken !== token)
        .every((otherToken) => !text.includes(otherToken));
  });
  return finish("BM-PDF-012", valid && isolated && deterministic ? "PASS" : "FAIL", {
    bytes: concurrent.map((buffer) => buffer.length),
    count: concurrent.length,
    deterministic,
    isolated,
    valid,
  }, [
    `valid=${valid}`,
    `isolated=${isolated}`,
    `deterministic=${deterministic}`,
  ], artifacts[0]);
}

async function runCase(id: string): Promise<Omit<BenchmarkResult, "durationMs">> {
  switch (id) {
    case "BM-PDF-001":
      return run001();
    case "BM-PDF-002":
      return run002();
    case "BM-PDF-003":
      return run003();
    case "BM-PDF-004":
      return run004();
    case "BM-PDF-005":
      return run005();
    case "BM-PDF-006":
      return run006();
    case "BM-PDF-007":
      return run007();
    case "BM-PDF-008":
      return run008();
    case "BM-PDF-009":
      return run009();
    case "BM-PDF-010":
      return run010();
    case "BM-PDF-011":
      return run011();
    case "BM-PDF-012":
      return run012();
    default:
      throw new Error(`Unknown benchmark case "${id}"`);
  }
}

async function runCaseWithTiming(id: string): Promise<BenchmarkResult> {
  const started = performance.now();
  try {
    return {
      ...await runCase(id),
      durationMs: round(performance.now() - started, 1),
    };
  } catch (error) {
    return {
      durationMs: round(performance.now() - started, 1),
      id,
      metrics: {
        peakRssMb: peakRssMb(),
      },
      name: CASE_NAMES[id] ?? id,
      notes: [error instanceof Error ? error.stack ?? error.message : String(error)],
      status: "FAIL",
    };
  }
}

function countStatuses(results: BenchmarkResult[]): Record<BenchmarkStatus, number> {
  return {
    FAIL: results.filter((result) => result.status === "FAIL").length,
    PARTIAL: results.filter((result) => result.status === "PARTIAL").length,
    PASS: results.filter((result) => result.status === "PASS").length,
  };
}

async function runChild(): Promise<void> {
  const caseIndex = process.argv.indexOf("--case");
  const id = process.argv[caseIndex + 1];
  if (!id) {
    throw new Error("--case requires a benchmark id");
  }
  mkdirSync(outputDir(), { recursive: true });
  process.stdout.write(`${JSON.stringify(await runCaseWithTiming(id))}\n`);
}

function runAll(): void {
  mkdirSync(outputDir(), { recursive: true });
  const scriptPath = fileURLToPath(import.meta.url);
  const results = CASE_IDS.map((id) => {
    const stdout = execFileSync("pnpm", ["exec", "tsx", scriptPath, "--case", id], {
      cwd: packageRoot(),
      encoding: "utf8",
      env: { ...process.env, RUNSTAMP_LICENSE_KEY: process.env.RUNSTAMP_LICENSE_KEY ?? TEST_LICENSE_KEY },
      maxBuffer: 128 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}") as BenchmarkResult;
  });
  const summary = {
    counts: countStatuses(results),
    generatedAt: new Date().toISOString(),
    outputDir: outputDir(),
    results,
    spec: "docs/benchmarks-0410/benchmark-pdf.md",
  };
  const summaryPath = join(outputDir(), "summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  results.forEach((result) => {
    console.log(`${result.status.padEnd(7)} ${result.id} ${result.name} (${result.durationMs}ms)`);
  });
  console.log(`summary=${summaryPath}`);
}

if (process.argv.includes("--case")) {
  void runChild();
} else {
  runAll();
}
