import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PdfEngine } from "../src/engine.js";
import { prepareEmbeddedFonts } from "../src/font-embedding.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function compactText(value: string): string {
  return value.replace(/[\u202A-\u202E\u2066-\u2069]/gu, "").replace(/\s+/g, "");
}

function withTempPdf<T>(pdf: Buffer, name: string, run: (pdfPath: string) => T): T {
  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-phase2-"));
  const pdfPath = join(tempDir, name);

  try {
    writeFileSync(pdfPath, pdf);
    return run(pdfPath);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

describe("Phase 2 font embedding", () => {
  let fonts: Awaited<ReturnType<typeof ensurePhase2FontFixtures>>;

  beforeAll(async () => {
    fonts = await ensurePhase2FontFixtures();
  }, 120_000);

  it("embeds a Type0 CID font with ToUnicode for Latin text", async () => {
    const buffer = await PdfEngine.render({
      pages: [
        {
          text: {
            font: { family: "Inter", source: fonts.inter },
            fontSize: 24,
            value: "office ffi",
          },
        },
      ],
    });

    const content = buffer.toString("binary");
    expect(content).toContain("/Subtype /Type0");
    expect(content).toContain("/Subtype /CIDFontType2");
    expect(content).toContain("/Encoding /Identity-H");
    expect(content).toContain("/ToUnicode");
    expect(content).toContain("/FontFile2");
  });

  it("produces deterministic bytes for embedded fonts", async () => {
    const input = {
      pages: [
        {
          text: {
            font: { family: "Inter", source: fonts.inter },
            fontSize: 24,
            value: "Deterministic office ffi",
          },
        },
      ],
    } as const;

    const [first, second] = await Promise.all([PdfEngine.render(input), PdfEngine.render(input)]);
    expect(Buffer.compare(first, second)).toBe(0);
  });

  it("keeps embedded-font render state isolated under concurrent load", async () => {
    if (!hasBinary("qpdf") || !hasBinary("pdftotext")) {
      return;
    }

    const renderToken = (index: number): Promise<Buffer> => {
      const token = `DOC_TOKEN_${String(index).padStart(2, "0")}_DONE`;
      return PdfEngine.render({
        pages: [
          {
            text: {
              font: { family: "Lato", source: fonts.lato },
              fontSize: 18,
              value: `Document ${index} ${token}`,
              x: 72,
              y: 720,
            },
          },
        ],
      });
    };

    const firstBatch = await Promise.all(Array.from({ length: 10 }, (_, index) => renderToken(index + 1)));
    const secondBatch = await Promise.all(Array.from({ length: 10 }, (_, index) => renderToken(index + 1)));

    firstBatch.forEach((buffer, index) => {
      const token = `DOC_TOKEN_${String(index + 1).padStart(2, "0")}_DONE`;
      expect(Buffer.compare(buffer, secondBatch[index] as Buffer)).toBe(0);
      expect(buffer.toString("latin1")).not.toContain("NaN");

      const extracted = withTempPdf(buffer, `concurrent-${index + 1}.pdf`, (pdfPath) => {
        execFileSync("qpdf", ["--check", pdfPath], { stdio: "pipe" });
        return execFileSync("pdftotext", ["-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
          encoding: "utf8",
          stdio: "pipe",
        }).trim();
      });

      expect(extracted).toContain(token);
      for (let otherIndex = 1; otherIndex <= 10; otherIndex += 1) {
        const otherToken = `DOC_TOKEN_${String(otherIndex).padStart(2, "0")}_DONE`;
        if (otherToken !== token) {
          expect(extracted).not.toContain(otherToken);
        }
      }
    });
  }, 120_000);

  it("keys HarfBuzz registrations by the actual font program buffer", async () => {
    const subset = await prepareEmbeddedFonts([
      { alias: "F1", font: { family: "Lato", source: fonts.lato }, samples: ["Subset sample"] },
    ]);
    const full = await prepareEmbeddedFonts([
      { alias: "F1", font: { family: "Lato", source: fonts.lato }, samples: ["Subset sample"] },
    ], { subset: false });

    const [subsetFont] = subset.values();
    const [fullFont] = full.values();
    expect(subsetFont?.sourceHash).toBe(fullFont?.sourceHash);
    expect(subsetFont?.fontKey).not.toBe(fullFont?.fontKey);
  });

  it("round-trips CJK text through pdftotext when available", async () => {
    if (!hasBinary("pdftotext")) {
      return;
    }

    const text = [..."漢字かな交じり文東京大阪京都渋谷新宿明治大正昭和平成令和山川海空火水木金土日月花鳥風雪東西南北日本語表現"]
      .slice(0, 50)
      .join("");
    const lines = [text.slice(0, 25), text.slice(25)];
    const buffer = await PdfEngine.render({
      pages: [
        {
          texts: lines.map((value, index) => ({
            font: { family: "Noto Sans CJK JP", source: fonts.cjk },
            fontSize: 14,
            value,
            x: 72,
            y: 700 - (index * 28),
          })),
        },
      ],
    });

    const extracted = withTempPdf(buffer, "cjk.pdf", (pdfPath) => execFileSync("pdftotext", ["-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim());

    expect(compactText(extracted)).toContain(compactText(text));
  });

  it("round-trips ligatures through ToUnicode when available", async () => {
    if (!hasBinary("pdftotext")) {
      return;
    }

    const text = "office ffi";
    const buffer = await PdfEngine.render({
      pages: [
        {
          text: {
            font: { family: "Lato", source: fonts.lato },
            fontSize: 24,
            value: text,
          },
        },
      ],
    });

    const extracted = withTempPdf(buffer, "ligature.pdf", (pdfPath) => execFileSync("pdftotext", ["-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim());

    expect(compactText(extracted)).toContain(compactText(text));
  });

  it("renders five embedded fonts without conflicts when pdffonts is available", async () => {
    if (!hasBinary("pdffonts")) {
      return;
    }

    const buffer = await PdfEngine.render({
      pages: [
        {
          texts: [
            { font: { family: "Inter", source: fonts.inter }, fontSize: 20, value: "Inter sample", y: 720 },
            { font: { family: "Lato", source: fonts.lato }, fontSize: 20, value: "Lato sample", y: 680 },
            { font: { family: "Noto Sans CJK JP", source: fonts.cjk }, fontSize: 20, value: "漢字かな", y: 640 },
            { direction: "rtl", font: { family: "Noto Sans Arabic", source: fonts.arabic }, fontSize: 20, value: "مرحبا", x: 540, y: 600 },
            { font: { family: "Noto Sans Devanagari", source: fonts.devanagari }, fontSize: 20, value: "हिंदी", y: 560 },
          ],
        },
      ],
    });

    const fontLines = withTempPdf(buffer, "multi-face.pdf", (pdfPath) => execFileSync("pdffonts", [pdfPath], {
      encoding: "utf8",
      stdio: "pipe",
    }).split("\n").slice(2).map((line) => line.trim()).filter(Boolean));

    expect(fontLines.length).toBeGreaterThanOrEqual(5);
  });

  it("uses text-level fallback fonts when the primary embedded font lacks glyph coverage", async () => {
    if (!hasBinary("pdftotext")) {
      return;
    }

    const fallbackFonts = [
      { family: "Noto Sans CJK JP", source: fonts.cjk },
      { family: "Noto Sans Thai", source: fonts.thai },
      { family: "Noto Sans Symbols 2", source: fonts.symbols },
    ];
    const samples = [
      "Latin sample",
      "東京都",
      "ภาษาไทย",
      "☑ ★ ☂ ☀",
    ];

    const buffer = await PdfEngine.render({
      pages: [
        {
          texts: samples.map((value, index) => ({
            direction: "ltr" as const,
            fallbackFonts,
            font: { family: "Lato", source: fonts.lato },
            fontSize: 18,
            value,
            x: 72,
            y: 720 - (index * 44),
          })),
        },
      ],
    });

    const extracted = withTempPdf(buffer, "fallback-chain.pdf", (pdfPath) => execFileSync("pdftotext", ["-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim());

    for (const sample of samples) {
      expect(compactText(extracted)).toContain(compactText(sample));
    }
  });

  it("segments inline fallback fonts within one mixed-script text run", async () => {
    if (!hasBinary("pdftotext") || !hasBinary("pdffonts")) {
      return;
    }

    const text = "Latin العربية עברית";
    const buffer = await PdfEngine.render({
      pages: [
        {
          text: {
            direction: "ltr",
            fallbackFonts: [
              { family: "Noto Sans Arabic", source: fonts.arabic },
              { family: "Noto Sans Hebrew", source: fonts.hebrew },
            ],
            font: { family: "Lato", source: fonts.lato },
            fontSize: 18,
            value: text,
            x: 72,
            y: 720,
          },
        },
      ],
    });

    const { extracted, fontRows } = withTempPdf(buffer, "inline-fallback.pdf", (pdfPath) => ({
      extracted: execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
        encoding: "utf8",
        stdio: "pipe",
      }).trim(),
      fontRows: execFileSync("pdffonts", [pdfPath], {
        encoding: "utf8",
        stdio: "pipe",
      }).split("\n").slice(2).map((line) => line.trim()).filter(Boolean),
    }));

    expect(compactText(extracted)).toContain(compactText(text));
    expect(fontRows.some((line) => line.includes("Lato"))).toBe(true);
    expect(fontRows.some((line) => line.includes("NotoSansArabic"))).toBe(true);
    expect(fontRows.some((line) => line.includes("NotoSansHebrew"))).toBe(true);
  });

  it("preserves logical RTL extraction for Arabic and Hebrew text", async () => {
    if (!hasBinary("pdftotext")) {
      return;
    }

    const arabic = "بسم الله الرحمن الرحيم";
    const mixedArabic = "Total Revenue إجمالي الإيرادات: $4.2M";
    const mixedHebrew = "שלום עולם - Quarterly Report Q4";
    const buffer = await PdfEngine.render({
      pages: [
        {
          texts: [
            {
              direction: "rtl",
              font: { family: "Noto Sans Arabic", source: fonts.arabic },
              fontSize: 24,
              value: arabic,
              x: 72,
              y: 720,
            },
            {
              fallbackFonts: [{ family: "Noto Sans Arabic", source: fonts.arabic }],
              font: { family: "Lato", source: fonts.lato },
              fontSize: 14,
              value: mixedArabic,
              x: 72,
              y: 680,
            },
            {
              fallbackFonts: [{ family: "Noto Sans Hebrew", source: fonts.hebrew }],
              font: { family: "Lato", source: fonts.lato },
              fontSize: 14,
              value: mixedHebrew,
              x: 72,
              y: 650,
            },
          ],
        },
      ],
    });

    const extracted = withTempPdf(buffer, "rtl-actual-text.pdf", (pdfPath) => execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim());

    expect(compactText(extracted)).toContain(compactText(arabic));
    expect(compactText(extracted)).toContain(compactText(mixedArabic));
    expect(compactText(extracted)).toContain(compactText(mixedHebrew));
  });

  it("passes qpdf for an embedded-font PDF when available", async () => {
    if (!hasBinary("qpdf")) {
      return;
    }

    const buffer = await PdfEngine.render({
      pages: [
        {
          text: {
            font: { family: "Inter", source: fonts.inter },
            fontSize: 24,
            value: "qpdf embedded font check",
          },
        },
      ],
    });

    expect(() => withTempPdf(buffer, "qpdf.pdf", (pdfPath) => {
      execFileSync("qpdf", ["--check", pdfPath], { stdio: "pipe" });
    })).not.toThrow();
  });

  it("rejects unsupported color emoji fonts with a clear validation error", async () => {
    await expect(PdfEngine.render({
      pages: [
        {
          text: {
            font: { family: "Noto Color Emoji", source: fonts.emoji },
            fontSize: 48,
            value: "🙂🚀📄",
          },
        },
      ],
    })).rejects.toThrow(/Color emoji\/color glyph fonts are not supported.*Noto Color Emoji.*CBDT.*CBLC/);
  });
});
