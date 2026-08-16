import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";

function extractInflatedStreams(pdf: Buffer): string[] {
  const source = pdf.toString("latin1");
  return [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((match) => inflateSync(Buffer.from(match[1] as string, "latin1")).toString("latin1"));
}

function compactText(value: string): string {
  return value.replace(/[\u202A-\u202E\u2066-\u2069]/gu, "").replace(/\s+/g, "");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function withTempPdf<T>(pdf: Buffer, name: string, run: (pdfPath: string) => T): T {
  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-whitespace-"));
  const pdfPath = join(tempDir, name);

  try {
    writeFileSync(pdfPath, pdf);
    return run(pdfPath);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function extractRenderedText(pdf: Buffer, name: string): string | null {
  if (!hasBinary("pdftotext")) {
    return null;
  }

  return withTempPdf(pdf, name, (pdfPath) => execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
    encoding: "utf8",
    stdio: "pipe",
  }));
}

async function renderContent(document: unknown, name: string): Promise<{ extractedText: string | null; streams: string[] }> {
  const pdf = await PdfEngine.render(document as any);
  return {
    extractedText: extractRenderedText(pdf, name),
    streams: extractInflatedStreams(pdf),
  };
}

function expectNoFallbackGlyphs(streams: string[], extractedText: string | null): void {
  const content = streams.join("\n");
  expect(content).not.toContain("(?) Tj");
  expect(content).not.toContain("<003F> Tj");
  expect(content).not.toContain("<003f> Tj");

  if (extractedText !== null) {
    const standaloneQuestionMarks = extractedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line === "?");
    expect(standaloneQuestionMarks).toHaveLength(0);
  }
}

describe("PDF whitespace regressions", () => {
  it("does not emit fallback glyphs for preformatted newline breaks", async () => {
    const { extractedText, streams } = await renderContent({
      page: { size: "A4", margin: 48 },
      children: [{ type: "preformatted", value: "line one\nline two\nline three" }],
    }, "preformatted-newlines.pdf");

    expectNoFallbackGlyphs(streams, extractedText);
    if (extractedText !== null) {
      expect(compactText(extractedText)).toContain(compactText("line one line two line three"));
    }
  });

  it("normalizes paragraph CRLF and LF without rendering fallback glyphs", async () => {
    const { extractedText, streams } = await renderContent({
      page: { size: "A4", margin: 48 },
      children: [{ type: "paragraph", value: "alpha\r\nbeta\ngamma" }],
    }, "paragraph-newlines.pdf");

    expectNoFallbackGlyphs(streams, extractedText);
    if (extractedText !== null) {
      expect(compactText(extractedText)).toContain(compactText("alpha beta gamma"));
    }
  });

  it("normalizes tabs and zero-width characters without fallback glyphs", async () => {
    const { extractedText, streams } = await renderContent({
      page: { size: "A4", margin: 48 },
      children: [
        { type: "preformatted", value: "tab\tseparated" },
        { type: "paragraph", value: "join\u200Bup\u200Dnow" },
      ],
    }, "tab-zero-width.pdf");

    expectNoFallbackGlyphs(streams, extractedText);
    if (extractedText !== null) {
      expect(compactText(extractedText)).toContain(compactText("tab separated joinupnow"));
    }
  });
});
