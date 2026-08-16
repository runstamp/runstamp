/**
 * W2 — cross-phase composition coverage.
 *
 * `composePhases([phase8, phase7, phase6, phase5, phase3, phase2])`
 * is what selects the correct phase based on the input shape, then
 * unwraps each layer in order. The dangerous failure mode is a
 * higher phase silently dropping or corrupting state that a lower
 * phase needed to see (e.g. PDF/A wrapping erases tagged-tree
 * structure, table paginator clobbers widget /Rect coordinates).
 *
 * These tests render each adjacent-phase pair end-to-end and verify
 * that BOTH layers' output shows up in the final PDF. They're
 * deliberately structural — they look at the qpdf-decoded byte
 * stream, not at semantic content — so they catch regressions
 * regardless of whether the underlying behaviour is HarfBuzz-shaped
 * or WinAnsi-encoded.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";
import {
  createPhase5OnPhase3Document,
  createPhase6OnPhase5Document,
  createPhase7OnPhase6Document,
  createPhase8OnPhase7Document,
} from "../scripts/composition-fixtures.js";

function commandAvailable(command: string): boolean {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function qpdfAvailable(): boolean {
  return commandAvailable("qpdf");
}

function inflateWithQpdf(buffer: Buffer): string {
  if (!qpdfAvailable()) {
    return buffer.toString("latin1");
  }
  const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-composition-"));
  const inputPath = join(dir, "in.pdf");
  const outputPath = join(dir, "out-qdf.pdf");
  try {
    writeFileSync(inputPath, buffer);
    execFileSync(
      "qpdf",
      ["--qdf", "--object-streams=disable", "--stream-data=uncompress", inputPath, outputPath],
      { stdio: "pipe" },
    );
    return execFileSync("cat", [outputPath], { encoding: "latin1", maxBuffer: 64 * 1024 * 1024 });
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

function extractTextWithPdftotext(buffer: Buffer): string | undefined {
  if (!commandAvailable("pdftotext")) {
    return undefined;
  }
  const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-composition-text-"));
  const inputPath = join(dir, "in.pdf");
  try {
    writeFileSync(inputPath, buffer);
    return execFileSync("pdftotext", [inputPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

describe("Phase composition — adjacent-phase regression coverage", () => {
  it("Phase 8 (PDF/A) preserves Phase 7 tagged structure", async () => {
    const buffer = await PdfEngine.render(await createPhase8OnPhase7Document());
    const qdf = inflateWithQpdf(buffer);

    // Phase 8 markers — must be present.
    expect(qdf).toContain("/OutputIntents");
    expect(qdf).toContain("/S /GTS_PDFA1");
    expect(qdf).toContain("pdfaid:part");
    // Phase 7 markers — must NOT have been stripped by the PDF/A wrap.
    expect(qdf).toContain("/StructTreeRoot");
    expect(qdf).toContain("/MarkInfo");
    expect(qdf).toContain("/Lang (en-US)");
  });

  it("Phase 7 (tagged) preserves Phase 6 interactive widgets", async () => {
    const buffer = await PdfEngine.render(createPhase7OnPhase6Document(), { strict: false });
    const qdf = inflateWithQpdf(buffer);

    // Phase 7 markers.
    expect(qdf).toContain("/StructTreeRoot");
    expect(qdf).toContain("/MarkInfo");
    // Phase 6 widgets — AcroForm dictionary plus the actual widget annots.
    expect(qdf).toContain("/AcroForm");
    expect(qdf).toContain("/Subtype /Widget");
    // Each declared field must appear in the field tree (T = field name).
    expect(qdf).toContain("/T (first_name)");
    expect(qdf).toContain("/T (last_name)");
    expect(qdf).toContain("/T (subscribe)");
  });

  it("Phase 6 (widgets) lays out after a paginated Phase 5 table", async () => {
    const buffer = await PdfEngine.render(createPhase6OnPhase5Document());
    const qdf = inflateWithQpdf(buffer);

    // The 60-row table must have forced multiple Page objects.
    const pageMatches = qdf.match(/\/Type \/Page\b/g) ?? [];
    expect(pageMatches.length).toBeGreaterThanOrEqual(2);

    // Each declared widget after the table must reach the writer.
    expect(qdf).toContain("/T (approver_name)");
    expect(qdf).toContain("/T (approve_all)");
    expect(qdf).toContain("/T (approver_role)");

    // The AcroForm dictionary aggregates them.
    expect(qdf).toContain("/AcroForm");

    // Every widget must end up as a /Subtype /Widget annot.
    const subtypeMatches = qdf.match(/\/Subtype \/Widget/g) ?? [];
    expect(subtypeMatches.length).toBeGreaterThanOrEqual(3);
  });

  it("Phase 5 (table) paginates inside Phase 3 layout", async () => {
    const buffer = await PdfEngine.render(createPhase5OnPhase3Document());
    const qdf = inflateWithQpdf(buffer);

    // 60 body rows + a header row repeated per page should easily push
    // past one page even at 11" tall.
    const pageMatches = qdf.match(/\/Type \/Page\b/g) ?? [];
    expect(pageMatches.length).toBeGreaterThanOrEqual(2);

    // The table must have produced enough text-show operators to
    // account for both header + body content. We don't assert specific
    // strings (Pro-tier HarfBuzz emits glyph-CID byte strings, not
    // ASCII Tj args), only that there's substantial text content.
    if (qpdfAvailable()) {
      const tjCount = (qdf.match(/\sTJ\b|\sTj\b/g) ?? []).length;
      expect(tjCount).toBeGreaterThan(40);
    } else {
      const text = extractTextWithPdftotext(buffer);
      expect(text).toBeDefined();
      expect(text).toContain("Quarterly metrics");
      expect(text).toContain("Customer 60");
      expect(text?.match(/Customer \d+/g)?.length ?? 0).toBeGreaterThan(40);
    }
  });

  it("composition output is deterministic across renders", async () => {
    // Pick the deepest stack — if determinism survives the full cascade
    // of analyzers + transformers it's almost certainly safe everywhere.
    const a = await PdfEngine.render(await createPhase8OnPhase7Document());
    const b = await PdfEngine.render(await createPhase8OnPhase7Document());
    expect(Buffer.compare(a, b)).toBe(0);
  });
});
