import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase3Document } from "../src/phase3-render.js";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { addPageNumbers } from "../src/phase6-analyze.js";
import type { PdfRenderedPage } from "../src/pdf-renderer.js";

function hasPdftotext(): boolean {
  return spawnSync("which", ["pdftotext"], { stdio: "ignore" }).status === 0;
}

function extractText(pdf: Buffer): string {
  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-vqh-systemic-"));
  const pdfPath = join(tempDir, "output.pdf");
  try {
    writeFileSync(pdfPath, pdf);
    return execFileSync("pdftotext", ["-enc", "UTF-8", pdfPath, "-"], { encoding: "utf8" });
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function emptyPage(): PdfRenderedPage {
  return { height: 200, texts: [], width: 300 };
}

describe("VQH-017 page-number token substitution", () => {
  it("materializes page and total tokens into one stable text run", () => {
    const pages = [emptyPage(), emptyPage(), emptyPage()];
    addPageNumbers(pages, { format: "Booking NRX7P42J - Page {page} of {total}" }, {});

    expect(pages.map((page) => page.texts)).toEqual([
      [expect.objectContaining({ value: "Booking NRX7P42J - Page 1 of 3", x: 72 })],
      [expect.objectContaining({ value: "Booking NRX7P42J - Page 2 of 3", x: 72 })],
      [expect.objectContaining({ value: "Booking NRX7P42J - Page 3 of 3", x: 72 })],
    ]);
  });
});

describe("VQH-019 paragraph alignment", () => {
  it("does not justify paragraphs unless textAlign explicitly requests it", async () => {
    const value = "A short line followed by enough words to wrap onto another line cleanly.";
    const defaultAnalysis = await analyzePhase3Document({
      page: { margin: 20, size: { height: 200, width: 180 } },
      children: [{ type: "paragraph", fontSize: 10, value }],
    });
    const justifiedAnalysis = await analyzePhase3Document({
      page: { margin: 20, size: { height: 200, width: 180 } },
      children: [{ type: "paragraph", fontSize: 10, textAlign: "justify", value }],
    });

    expect(defaultAnalysis.pages[0]!.texts.every((text) => (text.wordSpacing ?? 0) === 0)).toBe(true);
    expect(justifiedAnalysis.pages[0]!.texts.some((text) => (text.wordSpacing ?? 0) > 0)).toBe(true);
  });

  it("wraps an over-wide unspaced table value before it reaches a sibling cell", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 20, size: { height: 200, width: 300 } },
      children: [{
        type: "table",
        columns: [{}, {}, {}, {}],
        body: [{ cells: [
          { children: [{ type: "paragraph", value: "12345678901234567890" }] },
          { children: [{ type: "paragraph", value: "Second" }] },
          { children: [{ type: "paragraph", value: "Third" }] },
          { children: [{ type: "paragraph", value: "Fourth" }] },
        ] }],
      }],
    });
    const firstCellLines = analysis.pages[0]!.texts.filter((text) => /^\d+$/u.test(text.value));
    const firstCellRight = 20 + analysis.tables[0]!.columnWidths[0]!;

    expect(firstCellLines.length).toBeGreaterThan(1);
    expect(firstCellLines.every((text) => text.x + (text.width ?? 0) <= firstCellRight + 0.001)).toBe(true);
  });
});

describe("VQH-015 flex-row containment", () => {
  it("shrinks implicit-width row children inside the printable width", async () => {
    const analysis = await analyzePhase3Document({
      page: { margin: 20, size: { height: 200, width: 260 } },
      children: [{
        type: "container",
        style: { flexDirection: "row", justifyContent: "space-between" },
        children: [
          { type: "paragraph", value: "Left-side report heading" },
          { type: "paragraph", textAlign: "right", value: "Right-side reference block" },
        ],
      }],
    });

    expect(analysis.pages[0]!.texts.length).toBeGreaterThan(1);
    expect(analysis.pages[0]!.texts.every((text) => text.x + (text.width ?? 0) <= 240.001)).toBe(true);
  });
});

describe("VQH-021 table maxWidth", () => {
  it("caps the rendered table and its columns at style.maxWidth", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 20, size: { height: 200, width: 300 } },
      children: [{
        type: "table",
        style: { backgroundColor: "#EEEEEE", maxWidth: "60%" },
        columns: [{}, {}],
        body: [{ cells: [
          { children: [{ type: "paragraph", value: "Fare" }] },
          { children: [{ type: "paragraph", value: "$120" }] },
        ] }],
      }],
    });
    const fills = analysis.pages[0]!.graphics!.filter((graphic) => graphic.type === "rect");

    expect(fills).toHaveLength(2);
    expect(fills.reduce((sum, graphic) => sum + (graphic.type === "rect" ? graphic.width : 0), 0)).toBeCloseTo(156);
  });
});

describe("VQH-022 built-in heading weight", () => {
  it("emits Helvetica-Bold for headings while body text remains Helvetica", async () => {
    const pdf = await PdfEngine.render({
      children: [
        { type: "heading", font: "Helvetica", level: 1, value: "Bold hierarchy" },
        { type: "paragraph", value: "Regular body" },
      ],
    });
    const source = pdf.toString("latin1");

    expect(source).toContain("/BaseFont /Helvetica-Bold");
    expect(source).toContain("/BaseFont /Helvetica");
  });
});

describe.skipIf(!hasPdftotext())("VQH-016 built-in glyph fallback", () => {
  it("preserves math symbols and subscripts instead of replacing them with question marks", async () => {
    const value = "Range ≥ 5 ≤ 9; 7 − 2 × 3; H₂O and CO₃";
    const pdf = await PdfEngine.render({ children: [{ type: "paragraph", value }] });
    const text = extractText(pdf);

    expect(text).toContain(value);
    expect(text).not.toContain("?");
  });
});
