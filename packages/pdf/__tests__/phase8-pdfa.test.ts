import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase8Document } from "../src/phase8-analyze.js";
import {
  createPdfa1bTransparencyDocument,
  createPdfaConformanceDocument,
  createPdfaDocument,
  createPdfaExternalLinkDocument,
} from "../scripts/phase8-fixtures.js";

function inflateWithQpdf(buffer: Buffer): string {
  if (spawnSync("which", ["qpdf"], { stdio: "ignore" }).status !== 0) {
    return buffer.toString("latin1");
  }

  const dir = mkdtempSync(join(tmpdir(), "json-to-pdf-phase8-"));
  const inputPath = join(dir, "input.pdf");
  const outputPath = join(dir, "output-qdf.pdf");
  try {
    writeFileSync(inputPath, buffer);
    execFileSync("qpdf", ["--qdf", "--object-streams=disable", "--stream-data=uncompress", inputPath, outputPath], { stdio: "pipe" });
    return execFileSync("cat", [outputPath], { encoding: "latin1", maxBuffer: 64 * 1024 * 1024 });
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

describe("Phase 8 PDF/A", () => {
  it("builds PDF/A metadata and output intents without standard Helvetica", async () => {
    const buffer = await PdfEngine.render(await createPdfaDocument());
    const qdf = inflateWithQpdf(buffer);

    expect(qdf).toContain("/OutputIntents");
    expect(qdf).toContain("/S /GTS_PDFA1");
    expect(qdf).toContain("/DestOutputProfile");
    expect(qdf).toContain("pdfaid:part>2</pdfaid:part>");
    expect(qdf).toContain("pdfaid:conformance>A</pdfaid:conformance>");
    expect(qdf).toContain("/ICCBased");
    expect(buffer.toString("binary")).toMatch(/\/ID \[<[0-9A-F]{32}> <[0-9A-F]{32}>]/);
    expect(qdf).not.toContain("/BaseFont /Helvetica");
    expect(qdf).not.toContain("/Subtype /Type1");
    expect(qdf).not.toMatch(/<0000>\s+Tj/);
  });

  it("rejects PDF/A fallback fonts that do not cover document text", async () => {
    const doc = await createPdfaDocument();
    delete doc.pdfa!.fallbackFonts;

    await expect(PdfEngine.render(doc)).rejects.toThrow(/fallback fonts do not cover text/i);
  });

  it("rejects external URI links in PDF/A mode", async () => {
    await expect(PdfEngine.render(await createPdfaExternalLinkDocument())).rejects.toThrow(/PDF\/A/i);
  });

  it("keeps tagged accessibility data enabled for PDF/A-2a", async () => {
    const analysis = await analyzePhase8Document(await createPdfaDocument());
    expect(analysis.interactive.accessibility.structure.some((entry) => entry.role === "Document")).toBe(true);
    expect(analysis.interactive.metadataXml).toContain("pdfaid:conformance>A</pdfaid:conformance>");
  });
});

describe("Phase 8 PDF/A-1b", () => {
  it("produces PDF version 1.4 header and correct XMP metadata", async () => {
    const buffer = await PdfEngine.render(await createPdfaConformanceDocument("1b"));
    const header = buffer.subarray(0, 10).toString("ascii");
    const qdf = inflateWithQpdf(buffer);

    expect(header).toMatch(/^%PDF-1\.4/);
    expect(qdf).toContain("pdfaid:part>1</pdfaid:part>");
    expect(qdf).toContain("pdfaid:conformance>B</pdfaid:conformance>");
    expect(qdf).toContain("/OutputIntents");
    expect(qdf).toContain("/S /GTS_PDFA1");
    expect(qdf).toContain("/ICCBased");
  });

  it("does not force tagged structure for conformance level b", async () => {
    const doc = await createPdfaConformanceDocument("1b");
    doc.accessibility = { lang: "en-US" };
    const buffer = await PdfEngine.render(doc);
    const qdf = inflateWithQpdf(buffer);

    expect(qdf).not.toContain("/StructTreeRoot");
    expect(qdf).not.toContain("/MarkInfo");
  });

  it("rejects transparency (opacity) in PDF/A-1b mode", async () => {
    const doc = await createPdfa1bTransparencyDocument();
    await expect(PdfEngine.render(doc)).rejects.toThrow(/PDF\/A-1b.*transparency/i);
  });
});

describe("Phase 8 PDF/A-2b", () => {
  it("produces PDF version 1.7 header and correct XMP metadata", async () => {
    const buffer = await PdfEngine.render(await createPdfaConformanceDocument("2b"));
    const header = buffer.subarray(0, 10).toString("ascii");
    const qdf = inflateWithQpdf(buffer);

    expect(header).toMatch(/^%PDF-1\.7/);
    expect(qdf).toContain("pdfaid:part>2</pdfaid:part>");
    expect(qdf).toContain("pdfaid:conformance>B</pdfaid:conformance>");
    expect(qdf).toContain("/OutputIntents");
    expect(qdf).toContain("/ICCBased");
  });

  it("allows transparency in PDF/A-2b mode", async () => {
    const doc = await createPdfa1bTransparencyDocument();
    doc.pdfa!.conformance = "2b";
    const buffer = await PdfEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 10).toString("ascii")).toMatch(/^%PDF-1\.7/);
  });

  it("does not force tagged structure for conformance level b", async () => {
    const doc = await createPdfaConformanceDocument("2b");
    doc.accessibility = { lang: "en-US" };
    const buffer = await PdfEngine.render(doc);
    const qdf = inflateWithQpdf(buffer);

    expect(qdf).not.toContain("/StructTreeRoot");
    expect(qdf).not.toContain("/MarkInfo");
  });
});

describe("Phase 8 PDF/A backward compatibility", () => {
  it("defaults to PDF/A-2a when conformance is omitted", async () => {
    const doc = await createPdfaDocument();
    const analysis = await analyzePhase8Document(doc);

    expect(analysis.interactive.pdfa?.conformance).toBe("2a");
    expect(analysis.interactive.metadataXml).toContain("pdfaid:part>2</pdfaid:part>");
    expect(analysis.interactive.metadataXml).toContain("pdfaid:conformance>A</pdfaid:conformance>");
  });

  it("uses bundled sRGB ICC profile when iccProfile is omitted", async () => {
    const doc = await createPdfaConformanceDocument("1b");
    delete (doc.pdfa as Record<string, unknown>).iccProfile;
    const buffer = await PdfEngine.render(doc);
    const qdf = inflateWithQpdf(buffer);

    expect(qdf).toContain("/ICCBased");
    expect(qdf).toContain("/DestOutputProfile");
  });

  it("supports pdfA render option without document-level pdfa config", async () => {
    // createPdfaConformanceDocument builds a Phase 3 doc with children (headings, paragraphs).
    // Keep pdfa.fallbackFont for Helvetica replacement, but remove conformance/enabled so the
    // engine's pdfA bridging is the sole trigger.
    const doc = await createPdfaConformanceDocument("2b");
    const fallbackFont = doc.pdfa!.fallbackFont;
    const fallbackFonts = doc.pdfa!.fallbackFonts;
    const iccProfile = doc.pdfa!.iccProfile;
    doc.pdfa = { fallbackFont, fallbackFonts, iccProfile };
    const buffer = await PdfEngine.render(doc, { pdfA: "PDF/A-1b" });
    const header = buffer.subarray(0, 10).toString("ascii");
    const qdf = inflateWithQpdf(buffer);

    expect(header).toMatch(/^%PDF-1\.4/);
    expect(qdf).toContain("pdfaid:part>1</pdfaid:part>");
    expect(qdf).toContain("pdfaid:conformance>B</pdfaid:conformance>");
  });
});
