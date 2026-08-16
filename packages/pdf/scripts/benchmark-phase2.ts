import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { buildFontInputKey, prepareEmbeddedFonts, shapeEmbeddedText } from "../src/font-embedding.js";
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
  return join(packageRoot(), "output", "phase2");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "");
}

async function writePdfArtifact(name: string, document: Parameters<typeof PdfEngine.render>[0]): Promise<{ buffer: Buffer; path: string }> {
  const path = join(outputDir(), `${name}.pdf`);
  const buffer = await PdfEngine.render(document);
  writeFileSync(path, buffer);
  return { path, buffer };
}

function extractText(pdfPath: string): string {
  return execFileSync("pdftotext", ["-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
    encoding: "utf8",
    stdio: "pipe",
  }).replace(/\s+/g, " ").trim();
}

function rasterize(pdfPath: string, baseName: string): number {
  const prefix = join(outputDir(), baseName);
  execFileSync("pdftoppm", ["-png", "-r", "72", "-singlefile", "-f", "1", "-l", "1", pdfPath, prefix], {
    stdio: "pipe",
  });
  return readFileSync(`${prefix}.png`).length;
}

function listFonts(pdfPath: string): string[] {
  const output = execFileSync("pdffonts", [pdfPath], {
    encoding: "utf8",
    stdio: "pipe",
  });

  return output
    .split("\n")
    .slice(2)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function checkQpdf(pdfPath: string): void {
  execFileSync("qpdf", ["--check", pdfPath], { stdio: "pipe" });
}

function longestEmbeddedFontLength(pdf: Buffer): number {
  const matches = [...pdf.toString("binary").matchAll(/\/Length1 (\d+)/g)];
  return matches.reduce((max, match) => Math.max(max, Number(match[1] ?? 0)), 0);
}

function benchmarkResult(name: string, pass: boolean, detail: string): BenchmarkResult {
  return { name, pass, detail };
}

function resolvePythonForPillow(): string {
  const candidates = ["/opt/homebrew/bin/python3", "python3"];
  const script = "from PIL import ImageFont\nprint('ok')";

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["-c", script], { encoding: "utf8", stdio: "pipe" });
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Phase 2 width metrics benchmark requires python3 with Pillow installed");
}

function measureWidthWithPython(fontPath: string, text: string, fontSize: number): number {
  const script = [
    "from PIL import ImageFont",
    "import sys",
    "font = ImageFont.truetype(sys.argv[1], size=int(float(sys.argv[3])))",
    "print(font.getlength(sys.argv[2]))",
  ].join("\n");

  return Number(execFileSync(resolvePythonForPillow(), ["-c", script, fontPath, text, String(fontSize)], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim());
}

async function main(): Promise<void> {
  const start = performance.now();
  mkdirSync(outputDir(), { recursive: true });

  const fonts = await ensurePhase2FontFixtures();
  const inter = { family: "Inter", source: fonts.inter } as const;
  const lato = { family: "Lato", source: fonts.lato } as const;
  const cjk = { family: "Noto Sans CJK JP", source: fonts.cjk } as const;
  const arabic = { family: "Noto Sans Arabic", source: fonts.arabic } as const;
  const devanagari = { family: "Noto Sans Devanagari", source: fonts.devanagari } as const;
  const emoji = { family: "Noto Color Emoji", source: fonts.emoji } as const;

  const cjkSearchText = [..."漢字かな交じり文東京大阪京都渋谷新宿明治大正昭和平成令和山川海空火水木金土日月花鳥風雪東西南北日本語表現能力試験用文章データ"]
    .slice(0, 50)
    .join("");
  const cjkLines = [cjkSearchText.slice(0, 25), cjkSearchText.slice(25)];
  const latinText = "The quick brown fox jumps over office ffi ligature tests.";
  const arabicText = "مرحبا بالعالم من محرك بي دي إف";
  const devanagariText = "प्रज्ञा क्षत्रिय हिंदी परीक्षण पाठ";
  const emojiText = "🙂🚀📄";
  const ligatureText = "office ffi";

  const latinPdf = await writePdfArtifact("latin-inter", {
    meta: { title: "Phase 2 Latin" },
    pages: [{ text: { font: inter, fontSize: 24, value: latinText, x: 72, y: 680 } }],
  });
  const cjkPdf = await writePdfArtifact("cjk", {
    meta: { title: "Phase 2 CJK" },
    pages: [
      {
        texts: cjkLines.map((value, index) => ({
          font: cjk,
          fontSize: 14,
          value,
          x: 72,
          y: 700 - (index * 28),
        })),
      },
    ],
  });
  const arabicPdf = await writePdfArtifact("arabic", {
    meta: { title: "Phase 2 Arabic" },
    pages: [{ text: { direction: "rtl", font: arabic, fontSize: 24, value: arabicText, x: 540, y: 680 } }],
  });
  const devanagariPdf = await writePdfArtifact("devanagari", {
    meta: { title: "Phase 2 Devanagari" },
    pages: [{ text: { font: devanagari, fontSize: 24, value: devanagariText, x: 72, y: 680 } }],
  });
  const emojiPdf = await writePdfArtifact("emoji", {
    meta: { title: "Phase 2 Emoji" },
    pages: [{ text: { font: emoji, fontSize: 48, value: emojiText, x: 72, y: 680 } }],
  });
  const ligaturePdf = await writePdfArtifact("ligature", {
    meta: { title: "Phase 2 Ligature" },
    pages: [{ text: { font: lato, fontSize: 24, value: ligatureText, x: 72, y: 680 } }],
  });
  const multiFacePdf = await writePdfArtifact("multi-face", {
    meta: { title: "Phase 2 Multi-Face" },
    pages: [
      {
        texts: [
          { font: inter, fontSize: 20, value: "Inter sample", x: 72, y: 720 },
          { font: lato, fontSize: 20, value: "Lato sample", x: 72, y: 680 },
          { font: cjk, fontSize: 20, value: "漢字かな交じり", x: 72, y: 640 },
          { direction: "rtl", font: arabic, fontSize: 20, value: "مرحبا بالعالم", x: 540, y: 600 },
          { font: devanagari, fontSize: 20, value: "हिंदी परीक्षण", x: 72, y: 560 },
        ],
      },
    ],
  });

  const results: BenchmarkResult[] = [];

  const latinFonts = listFonts(latinPdf.path);
  const cjkFonts = listFonts(cjkPdf.path);
  const arabicFonts = listFonts(arabicPdf.path);
  const devanagariFonts = listFonts(devanagariPdf.path);
  const multiFonts = listFonts(multiFacePdf.path);

  const latinTextExtracted = extractText(latinPdf.path);
  const cjkTextExtracted = extractText(cjkPdf.path);
  const arabicTextExtracted = extractText(arabicPdf.path);
  const devanagariTextExtracted = extractText(devanagariPdf.path);
  const ligatureTextExtracted = extractText(ligaturePdf.path);

  const latinRasterBytes = rasterize(latinPdf.path, "latin-inter");
  const cjkRasterBytes = rasterize(cjkPdf.path, "cjk");
  const arabicRasterBytes = rasterize(arabicPdf.path, "arabic");
  const devanagariRasterBytes = rasterize(devanagariPdf.path, "devanagari");
  const emojiRasterBytes = rasterize(emojiPdf.path, "emoji");

  checkQpdf(latinPdf.path);
  checkQpdf(cjkPdf.path);
  checkQpdf(arabicPdf.path);
  checkQpdf(devanagariPdf.path);
  checkQpdf(emojiPdf.path);
  checkQpdf(multiFacePdf.path);

  const complexPreparedFonts = await prepareEmbeddedFonts([
    { alias: "F3", font: arabic, samples: [arabicText] },
    { alias: "F4", font: devanagari, samples: [devanagariText] },
  ]);
  const shapedArabic = await shapeEmbeddedText(
    complexPreparedFonts.get(buildFontInputKey(arabic))!,
    arabicText,
    24,
    540,
    680,
    "rtl",
  );
  const shapedDevanagari = await shapeEmbeddedText(
    complexPreparedFonts.get(buildFontInputKey(devanagari))!,
    devanagariText,
    24,
    72,
    680,
    "ltr",
  );

  results.push(benchmarkResult(
    "font-embed-latin",
    latinFonts.some((line) => /CID TrueType/i.test(line)) && latinTextExtracted.includes("office ffi") && latinRasterBytes > 0,
    `fonts=${latinFonts.length} extracted="${latinTextExtracted}" raster_png_bytes=${latinRasterBytes}`,
  ));
  results.push(benchmarkResult(
    "font-embed-cjk",
    compactText(cjkTextExtracted).includes(compactText(cjkSearchText)) && cjkRasterBytes > 0,
    `subset_length1=${longestEmbeddedFontLength(cjkPdf.buffer)} extracted_length=${cjkTextExtracted.length} raster_png_bytes=${cjkRasterBytes}`,
  ));
  results.push(benchmarkResult(
    "font-embed-arabic",
    arabicFonts.some((line) => /CID TrueType/i.test(line)) &&
      arabicRasterBytes > 0 &&
      shapedArabic.glyphs.length > 0 &&
      shapedArabic.usesPerGlyphPositioning,
    `fonts=${arabicFonts.length} extracted="${arabicTextExtracted}" glyphs=${shapedArabic.glyphs.length} raster_png_bytes=${arabicRasterBytes}`,
  ));
  results.push(benchmarkResult(
    "font-embed-devanagari",
    devanagariFonts.some((line) => /CID TrueType/i.test(line)) &&
      devanagariRasterBytes > 0 &&
      shapedDevanagari.glyphs.length > 0,
    `fonts=${devanagariFonts.length} extracted="${devanagariTextExtracted}" glyphs=${shapedDevanagari.glyphs.length} raster_png_bytes=${devanagariRasterBytes}`,
  ));
  results.push(benchmarkResult(
    "font-embed-emoji",
    emojiPdf.buffer.length > 0 && emojiRasterBytes > 0,
    `pdf_bytes=${emojiPdf.buffer.length} raster_png_bytes=${emojiRasterBytes}`,
  ));
  results.push(benchmarkResult(
    "font-subset-size",
    longestEmbeddedFontLength(cjkPdf.buffer) > 0 && longestEmbeddedFontLength(cjkPdf.buffer) < 500_000,
    `subset_length1=${longestEmbeddedFontLength(cjkPdf.buffer)}`,
  ));
  results.push(benchmarkResult(
    "font-tounicode-copy",
    compactText(cjkTextExtracted).includes(compactText(cjkSearchText)),
    `extracted="${cjkTextExtracted}"`,
  ));
  results.push(benchmarkResult(
    "font-tounicode-ligature",
    compactText(ligatureTextExtracted).includes(compactText(ligatureText)),
    `extracted="${ligatureTextExtracted}"`,
  ));
  results.push(benchmarkResult(
    "font-tounicode-search",
    compactText(cjkTextExtracted).includes(compactText(cjkSearchText)),
    `proxy=pdftotext extracted_length=${cjkTextExtracted.length}`,
  ));

  const widthProbeText = "office waffle AV";
  const preparedFonts = await prepareEmbeddedFonts([{ alias: "F2", font: inter, samples: [widthProbeText] }]);
  const preparedFont = preparedFonts.values().next().value;
  if (!preparedFont) {
    throw new Error("Failed to prepare Inter font for width benchmark");
  }
  const shaped = await shapeEmbeddedText(preparedFont, widthProbeText, 32, 72, 680, "ltr");
  const pythonWidth = measureWidthWithPython(fonts.inter, widthProbeText, 32);
  const widthDelta = Math.abs(shaped.totalAdvancePoints - pythonWidth);
  results.push(benchmarkResult(
    "font-width-metrics",
    widthDelta <= 0.5,
    `pdf_points=${shaped.totalAdvancePoints.toFixed(3)} python_pixels=${pythonWidth.toFixed(3)} delta=${widthDelta.toFixed(3)}`,
  ));

  results.push(benchmarkResult(
    "font-multi-face",
    multiFonts.length >= 5,
    `fonts=${multiFonts.length}`,
  ));
  results.push(benchmarkResult(
    "font-qpdf-check",
    true,
    "qpdf --check passed for latin, cjk, arabic, devanagari, emoji, and multi-face outputs",
  ));

  const durationMs = performance.now() - start;
  results.forEach((result) => {
    console.log(`${result.pass ? "PASS" : "FAIL"} ${result.name} ${result.detail}`);
  });
  console.log(`artifact_dir=${outputDir()}`);
  console.log(`render_ms=${durationMs.toFixed(2)}`);

  const failed = results.filter((result) => !result.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 2 benchmark failures: ${failed.map((result) => result.name).join(", ")}`);
  }
}

if (!hasBinary("pdffonts") || !hasBinary("pdftoppm") || !hasBinary("pdftotext") || !hasBinary("qpdf")) {
  throw new Error("Phase 2 benchmarks require pdffonts, pdftoppm, pdftotext, and qpdf to be installed");
}

void main();
