/**
 * /Type /ObjStm object-stream packing (M6.c).
 *
 * Object streams are the file-size payoff of opting into PDF 1.5+:
 * non-stream generation-0 dictionary objects get packed into a
 * Flate-compressed wrapper instead of being emitted as separate
 * indirect objects. The renderer enables packing automatically when
 * the user opts into `pdfVersion: "1.5"` (or higher) and no encryption
 * is requested. These tests exercise:
 *
 *  - packing actually happens (file contains `/Type /ObjStm`);
 *  - packed output is structurally valid (qpdf --check, --qdf);
 *  - file size shrinks meaningfully versus the unpacked 1.5 baseline;
 *  - byte-determinism survives the extra deflate pass;
 *  - encryption disables packing (ObjStm + encryption interop is
 *    deliberately deferred — see PDFWriteOptions docs).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { writePdfDocument } from "../src/pdf-writer.js";
import { PDFDictionary, PDFName, PDFNumber, PDFRef, PDFString } from "../src/pdf-objects.js";

// A document with several pages so there are enough indirect objects
// to make packing visibly worthwhile.
const MULTI_PAGE_DOC = {
  pages: Array.from({ length: 6 }, (_, pageIndex) => ({
    texts: Array.from({ length: 4 }, (_, textIndex) => ({
      value: `Page ${pageIndex + 1}, line ${textIndex + 1}`,
      x: 72,
      y: 720 - textIndex * 18,
    })),
  })),
};

function qpdfAvailable(): boolean {
  return spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
}

describe("object stream packing (M6.c)", () => {
  it("packs objects into /Type /ObjStm when pdfVersion >= 1.5", async () => {
    const buffer = await PdfEngine.render(MULTI_PAGE_DOC, { pdfVersion: "1.5" });
    const ascii = buffer.toString("latin1");
    expect(ascii).toContain("/Type /ObjStm");
    // ObjStm wrappers are FlateDecode-compressed.
    expect(ascii).toContain("/Filter /FlateDecode");
    // The /N field declares how many objects each ObjStm carries.
    expect(ascii).toMatch(/\/N \d+/);
    // The /First field declares where the body starts past the index table.
    expect(ascii).toMatch(/\/First \d+/);
  });

  it("does NOT pack when no version is requested (classic xref path)", async () => {
    const buffer = await PdfEngine.render(MULTI_PAGE_DOC);
    const ascii = buffer.toString("latin1");
    expect(ascii).not.toContain("/Type /ObjStm");
  });

  it("does NOT pack when encryption is enabled (interop deferred)", async () => {
    // Encryption disables ObjStm packing (the encryption-of-ObjStm-
    // payload path is intentionally not implemented yet — see
    // PDFWriteOptions docs). The xref-stream itself stays on, however,
    // because the writer encrypts the xref-stream payload correctly.
    const buffer = await PdfEngine.render(MULTI_PAGE_DOC, {
      pdfVersion: "1.5",
      encryption: { userPassword: "pw" },
    });
    const ascii = buffer.toString("latin1");
    expect(ascii).not.toContain("/Type /ObjStm");
  });

  it("packed output shrinks meaningfully vs unpacked xref-stream", async () => {
    // Both runs use xref-stream; only `packObjectStreams` differs. We
    // call writePdfDocument directly to isolate the size delta from
    // any rendering-side variability.
    const objects = [
      {
        ref: new PDFRef(1),
        value: new PDFDictionary({ Type: new PDFName("Catalog"), Pages: new PDFRef(2) }),
      },
      {
        ref: new PDFRef(2),
        value: new PDFDictionary({ Type: new PDFName("Pages"), Kids: new PDFRef(3), Count: new PDFNumber(0) }),
      },
      // A bunch of small dictionary objects to make the packing win obvious.
      ...Array.from({ length: 30 }, (_, i) => ({
        ref: new PDFRef(3 + i),
        value: new PDFDictionary({
          Tag: new PDFString(`object-${i}-with-some-payload-text-to-give-flate-something-to-work-with`),
          Index: new PDFNumber(i),
        }),
      })),
    ];

    const unpacked = writePdfDocument({
      info: new PDFRef(1),
      objects: [...objects],
      root: new PDFRef(1),
      useXrefStream: true,
      version: "1.5",
    });
    const packed = writePdfDocument({
      info: new PDFRef(1),
      objects: [...objects],
      packObjectStreams: true,
      root: new PDFRef(1),
      useXrefStream: true,
      version: "1.5",
    });
    expect(packed.length).toBeLessThan(unpacked.length);
    // We expect at least a 20% shrink on a payload like this — the
    // headers and per-object framing dominate without packing.
    expect(packed.length / unpacked.length).toBeLessThan(0.8);
  });

  it("packed output is byte-deterministic across renders", async () => {
    const a = await PdfEngine.render(MULTI_PAGE_DOC, { pdfVersion: "1.5" });
    const b = await PdfEngine.render(MULTI_PAGE_DOC, { pdfVersion: "1.5" });
    expect(Buffer.compare(a, b)).toBe(0);
  });

  it("packed output passes qpdf --check (when available)", async () => {
    if (!qpdfAvailable()) {
      return;
    }
    const buffer = await PdfEngine.render(MULTI_PAGE_DOC, { pdfVersion: "1.5" });
    const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-objstm-"));
    const path = join(dir, "out.pdf");
    try {
      writeFileSync(path, buffer);
      const result = spawnSync("qpdf", ["--check", path], { encoding: "utf8" });
      if (result.status !== 0 && result.status !== 3) {
        throw new Error(`qpdf --check exited ${result.status}: ${result.stdout}\n${result.stderr}`);
      }
      expect(result.stdout).toContain("No syntax or stream encoding errors");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("packed output round-trips through qpdf --qdf (when available)", async () => {
    if (!qpdfAvailable()) {
      return;
    }
    const buffer = await PdfEngine.render(MULTI_PAGE_DOC, { pdfVersion: "1.5" });
    const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-objstm-qdf-"));
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
      // After qpdf normalizes the file with --object-streams=disable,
      // the ObjStm wrappers are gone and the contained objects are
      // back as freestanding indirect objects under classic xref.
      expect(expanded).not.toContain("/Type /ObjStm");
      expect(expanded).toContain("\nxref\n");
      expect(expanded).toContain("/Type /Pages");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
