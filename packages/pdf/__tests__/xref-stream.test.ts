/**
 * /Type /XRef cross-reference stream output (M6.b).
 *
 * When `pdfVersion >= "1.5"` the writer emits an indirect xref-stream
 * object instead of the classic `xref ... trailer` block. These tests
 * exercise the structural contract:
 *  - the file ends with a valid `startxref` pointing at the xref-stream
 *    object's byte offset;
 *  - the stream dictionary declares `/Type /XRef`, a `/W` field-widths
 *    array, the standard trailer entries, and FlateDecode;
 *  - the same content rendered classic vs xref-stream round-trips
 *    through `qpdf --check` when available;
 *  - and the xref-stream variant is byte-deterministic across renders.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";

const SIMPLE_DOC = {
  pages: [{ texts: [{ value: "Hello, xref stream.", x: 72, y: 720 }] }],
};

function findStartXref(buffer: Buffer): number {
  // Locate the integer immediately after the literal "startxref\n".
  const ascii = buffer.toString("latin1");
  const match = ascii.match(/startxref\s+(\d+)\s+%%EOF/);
  if (!match) {
    throw new Error("no startxref/%%EOF marker");
  }
  return Number.parseInt(match[1], 10);
}

function qpdfAvailable(): boolean {
  return spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
}

describe("xref stream output (pdfVersion >= 1.5)", () => {
  it("classic xref by default (no version requested)", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC);
    const ascii = buffer.toString("latin1");
    expect(ascii).toContain("\nxref\n");
    expect(ascii).toContain("\ntrailer\n");
  });

  it("classic xref when AES-128 bumps to 1.6 implicitly (no opt-in)", async () => {
    // Implicit feature-bump must NOT switch xref format on its own —
    // downstream tooling (validator, repair, signature byte-range
    // computation) is classic-xref-aware.
    const buffer = await PdfEngine.render(SIMPLE_DOC, { encryption: { userPassword: "pw" } });
    const ascii = buffer.toString("latin1");
    expect(ascii).toMatch(/^%PDF-1\.6/);
    expect(ascii).toContain("\nxref\n");
    expect(ascii).not.toContain("/Type /XRef");
  });

  it("emits an xref stream when pdfVersion: 1.5", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    const ascii = buffer.toString("latin1");
    expect(ascii).not.toContain("\nxref\n");
    expect(ascii).not.toContain("\ntrailer\n");
    expect(ascii).toContain("/Type /XRef");
    expect(ascii).toContain("/W [");
    expect(ascii).toContain("/Filter /FlateDecode");
  });

  it("startxref points to the xref-stream object's offset", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    const offset = findStartXref(buffer);
    // The byte at `offset` should be the start of an `N G obj\n` line.
    const head = buffer.subarray(offset, offset + 32).toString("latin1");
    expect(head).toMatch(/^\d+ \d+ obj\n/);
  });

  it("xref stream output is byte-deterministic across renders", async () => {
    const a = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    const b = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    expect(Buffer.compare(a, b)).toBe(0);
  });

  it("xref stream output passes qpdf --check (when available)", async () => {
    if (!qpdfAvailable()) {
      return;
    }
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-xref-stream-"));
    const path = join(dir, "out.pdf");
    try {
      writeFileSync(path, buffer);
      const result = spawnSync("qpdf", ["--check", path], { encoding: "utf8" });
      // qpdf returns 0 for clean, 3 for warnings only. Non-zero non-3
      // means a real structural failure.
      if (result.status !== 0 && result.status !== 3) {
        throw new Error(`qpdf --check exited ${result.status}: ${result.stdout}\n${result.stderr}`);
      }
      expect(result.stdout).toContain("No syntax or stream encoding errors");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("xref stream output round-trips through qpdf --qdf (when available)", async () => {
    if (!qpdfAvailable()) {
      return;
    }
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-xref-stream-qdf-"));
    const inputPath = join(dir, "in.pdf");
    const outputPath = join(dir, "out-qdf.pdf");
    try {
      writeFileSync(inputPath, buffer);
      execFileSync(
        "qpdf",
        ["--qdf", "--object-streams=disable", "--stream-data=uncompress", inputPath, outputPath],
        { stdio: "pipe" },
      );
      const expanded = execFileSync("cat", [outputPath], { encoding: "latin1", maxBuffer: 16 * 1024 * 1024 });
      // qpdf rewrites to classic xref + trailer in --qdf normalize mode.
      // The successful exit above already proves the xref stream parsed
      // cleanly; we additionally check that the normalized output has the
      // expected legacy structure. (We deliberately don't assert on the
      // literal text — under the Pro license the test harness uses the
      // bundled Lato font, so "Hello" is encoded as a glyph-CID byte
      // string in a Tj operator, not as ASCII.)
      expect(expanded).toContain("\nxref\n");
      expect(expanded).toContain("\ntrailer ");
      expect(expanded).toContain("/Type /Pages");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
