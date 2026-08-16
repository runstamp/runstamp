import { PdfEngine } from "../src/engine.js";
import { PDFArray, PDFDictionary, PDFName, PDFNumber, PDFRef, PDFStream, PDFString } from "../src/pdf-objects.js";
import { writePdfDocument } from "../src/pdf-writer.js";
import { runExtension } from "@runstamp/protocol/extension-runtime";
import { createAlphaPngBuffer } from "../scripts/phase4-fixtures.js";
import {
  createPhase10SignOptions,
  createPhase10SigningDocument,
  ensurePhase10CertificateFixtures,
} from "../scripts/phase10-fixtures.js";
import {
  PdfEvidenceError,
  createPdfEvidenceExtension,
  exportPdfEvidence,
  extractPdfEvidence,
  findPdfEvidence,
  inspectPdfEvidence,
  previewPdfRedactions,
  redactPdfEvidence,
  renderPdfEvidence,
  routePdfOcr,
  verifyPdfRedaction,
} from "../src/evidence-processing.js";

function request(pdf: Buffer, operation: string, extra: Record<string, string> = {}) {
  return {
    schemaVersion: 1 as const,
    extensionId: "runstamp.pdf-evidence",
    operation,
    input: { pdfBase64: pdf.toString("base64"), ...extra },
    context: {
      runId: "a03-test",
      seed: "a03-fixed-seed",
      now: "2026-08-10T00:00:00.000Z",
      network: "disabled" as const,
      budget: { maxInputBytes: 1_000_000, maxOutputBytes: 2_000_000, maxEntries: 10_000, maxDepth: 20, timeoutMs: 10_000 },
    },
  };
}

describe("A03 PDF evidence processing", () => {
  it("rejects the overlay-only known-bad control because secret content remains", async () => {
    const overlayOnly = await PdfEngine.render({
      pages: [{
        graphics: [{ type: "rect", x: 150, y: 694, width: 100, height: 18, fill: { space: "solid", color: { space: "rgb", r: 0, g: 0, b: 0 } } }],
        text: { value: "BORROWER SSN 123-45-6789", x: 72, y: 700 },
      }],
    });
    const verdict = await verifyPdfRedaction(overlayOnly, ["123-45-6789"]);
    expect(verdict.status).toBe("FAIL");
    expect(verdict.residuals).toEqual(expect.arrayContaining([expect.objectContaining({ channel: "text" })]));
  });

  it("exposes a typed neutral extension definition", () => {
    expect(createPdfEvidenceExtension().manifest.catalogItemId).toBe("A03");
  });

  it("inspects, extracts, finds, previews, redacts, exports, and verifies native text", async () => {
    const source = await PdfEngine.render({
      meta: { author: "Underwriting", title: "Application evidence" },
      pages: [{ texts: [
        { value: "Borrower: Ada", x: 72, y: 720, fontSize: 12 },
        { value: "Account: 998877", x: 72, y: 700, fontSize: 12 },
        { value: "Decision: review", x: 72, y: 680, fontSize: 12 },
      ] }],
    });
    const inspection = await inspectPdfEvidence(source);
    expect(inspection.pages).toHaveLength(1);
    expect(inspection.metadata).toMatchObject({ Author: "Underwriting", Title: "Application evidence" });
    expect(inspection.isEncrypted).toBe(false);
    expect(inspection.hasJavaScript).toBe(false);

    const extraction = await extractPdfEvidence(source);
    expect(extraction.textRuns.map((run) => run.text)).toEqual(["Borrower: Ada", "Account: 998877", "Decision: review"]);
    expect(extraction.textRuns.map((run) => run.order)).toEqual([0, 1, 2]);
    expect(extraction.textRuns.every((run) => run.locator.scheme === "pdf.text" && run.locator.value.length === 6)).toBe(true);

    const matches = findPdfEvidence(extraction, "998877");
    expect(matches).toHaveLength(1);
    expect(previewPdfRedactions(matches).rectangles[0]?.rect.width).toBeGreaterThan(0);
    const redaction = await redactPdfEvidence(source, matches);
    expect(redaction.losses.map((loss) => loss.code)).toEqual(expect.arrayContaining(["PDF_METADATA_STRIPPED", "PDF_GRAPHICS_NOT_PRESERVED"]));
    await expect(verifyPdfRedaction(redaction.buffer, ["998877"])).resolves.toMatchObject({ status: "PASS" });
    expect((await extractPdfEvidence(redaction.buffer)).textRuns.map((run) => run.text).join(" ")).toContain("Account:");
    const exported = await exportPdfEvidence(redaction.buffer);
    expect(exported.sha256).toBe(redaction.sha256);
    expect(exported.byteLength).toBe(redaction.buffer.length);
  });

  it("keeps stable reading order and conservatively identifies aligned table rows", async () => {
    const source = await PdfEngine.render({ pages: [{ texts: [
      { value: "Year", x: 72, y: 720, fontSize: 10 },
      { value: "Revenue", x: 200, y: 720, fontSize: 10 },
      { value: "2025", x: 72, y: 700, fontSize: 10 },
      { value: "42", x: 200, y: 700, fontSize: 10 },
    ] }] });
    const extraction = await extractPdfEvidence(source);
    expect(extraction.textRuns.map((run) => run.text)).toEqual(["Year", "Revenue", "2025", "42"]);
    expect(extraction.tables).toHaveLength(1);
    expect(extraction.tables[0]?.rows.map((row) => row.cells.map((cell) => cell.text))).toEqual([["Year", "Revenue"], ["2025", "42"]]);
  });

  it("uses page-tree Kids order rather than indirect object-number order", async () => {
    const root = new PDFRef(1);
    const pages = new PDFRef(2);
    const secondPage = new PDFRef(3);
    const secondContent = new PDFRef(4);
    const firstContent = new PDFRef(5);
    const firstPage = new PDFRef(6);
    const font = new PDFRef(7);
    const info = new PDFRef(8);
    const pageDictionary = (parent: PDFRef, contents: PDFRef) => new PDFDictionary({
      Contents: contents,
      MediaBox: new PDFArray([0, 0, 612, 792].map((value) => new PDFNumber(value))),
      Parent: parent,
      Resources: new PDFDictionary({ Font: new PDFDictionary({ F1: font }) }),
      Type: new PDFName("Page"),
    });
    const source = writePdfDocument({ root, info, objects: [
      { ref: root, value: new PDFDictionary({ Pages: pages, Type: new PDFName("Catalog") }) },
      { ref: pages, value: new PDFDictionary({ Count: new PDFNumber(2), Kids: new PDFArray([firstPage, secondPage]), Type: new PDFName("Pages") }) },
      { ref: secondPage, value: pageDictionary(pages, secondContent) },
      { ref: secondContent, value: new PDFStream({}, Buffer.from("BT\n/F1 12 Tf\n1 0 0 1 72 700 Tm\n(second) Tj\nET", "ascii")) },
      { ref: firstContent, value: new PDFStream({}, Buffer.from("BT\n/F1 12 Tf\n1 0 0 1 72 700 Tm\n(first) Tj\nET", "ascii")) },
      { ref: firstPage, value: pageDictionary(pages, firstContent) },
      { ref: font, value: new PDFDictionary({ BaseFont: new PDFName("Helvetica"), Subtype: new PDFName("Type1"), Type: new PDFName("Font") }) },
      { ref: info, value: new PDFDictionary({ Producer: new PDFString("A03 page-order fixture") }) },
    ] });
    const extraction = await extractPdfEvidence(source);
    expect(extraction.textRuns.map((run) => run.text)).toEqual(["first", "second"]);
    expect(extraction.textRuns.map((run) => run.pageIndex)).toEqual([0, 1]);
  });

  it("routes image-only pages to a caller-supplied abort-aware OCR adapter", async () => {
    const png = createAlphaPngBuffer();
    const source = await PdfEngine.render({ pages: [{ graphics: [{ type: "image", format: "png", source: png, x: 72, y: 680, width: 24, height: 24 }] }] });
    const recognize = vi.fn(async (_pdf: Buffer, context: { signal: AbortSignal }) => {
      expect(context.signal.aborted).toBe(false);
      return { confidence: 0.91, runs: [{ text: "OCR mortgage page", rect: { x: 72, y: 680, width: 120, height: 12 } }] };
    });
    const routed = await routePdfOcr(source, { id: "fixture-ocr", recognize });
    expect(routed.pages).toEqual([{ pageIndex: 0, route: "scanned", reviewed: true }]);
    expect(routed.extraction.textRuns.at(-1)).toMatchObject({ source: "ocr", confidence: 0.91, text: "OCR mortgage page" });
    expect(recognize).toHaveBeenCalledOnce();
  });

  it("reports forms, annotations, and metadata without invoking document actions", async () => {
    const source = await PdfEngine.render({
      children: [
        { name: "claim_id", type: "form-text", value: "CLM-42" },
        { title: "Reviewer", contents: "Needs evidence", type: "note-annotation" },
      ],
      meta: { author: "Claims", title: "Review form" },
    });
    const inspection = await inspectPdfEvidence(source);
    expect(inspection.form.fields).toEqual(expect.arrayContaining([expect.objectContaining({ name: "claim_id", value: "CLM-42" })]));
    expect(inspection.annotations.length).toBeGreaterThan(0);
    expect(inspection.metadata).toMatchObject({ Author: "Claims", Title: "Review form" });
  });

  it("inspects signatures and declares invalidation when signed content is mutated", async () => {
    const fixtures = await ensurePhase10CertificateFixtures();
    const signed = await PdfEngine.sign(createPhase10SigningDocument(), createPhase10SignOptions(fixtures));
    const inspection = await inspectPdfEvidence(signed);
    expect(inspection.signatures).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "signature", subFilter: "adbe.pkcs7.detached" })]));
    const extraction = await extractPdfEvidence(signed);
    const target = extraction.textRuns.find((run) => run.text.length > 0);
    expect(target).toBeTruthy();
    const redaction = await redactPdfEvidence(signed, [{ end: target!.text.length, locator: target!.locator, matchedText: target!.text, rect: target!.rect, start: 0 }]);
    expect(redaction.losses.map((loss) => loss.code)).toContain("PDF_SIGNATURE_INVALIDATED");
    expect((await inspectPdfEvidence(redaction.buffer)).signatures).toHaveLength(0);
  }, 120_000);

  it("rejects protected, active-content, malformed, oversized, and aborted input", async () => {
    const plain = await PdfEngine.render({ pages: [{ text: { value: "safe" } }] });
    const latin = plain.toString("latin1");
    const trailerRoot = latin.match(/\/Root\s+\d+\s+\d+\s+R/)?.[0];
    expect(trailerRoot).toBeTruthy();
    const protectedPdf = Buffer.from(latin.replace(trailerRoot as string, `/Encrypt 999 0 R\n${trailerRoot}`), "latin1");
    await expect(inspectPdfEvidence(protectedPdf)).rejects.toMatchObject({ code: "PDF_PROTECTED" });

    const active = await PdfEngine.render({ children: [{ calculate: "event.value = '42';", name: "answer", type: "form-text", value: "42" }] });
    await expect(inspectPdfEvidence(active)).rejects.toMatchObject({ code: "PDF_ACTIVE_CONTENT_REJECTED" });
    await expect(inspectPdfEvidence(Buffer.from("not a pdf"))).rejects.toMatchObject({ code: "PDF_MALFORMED" });
    await expect(inspectPdfEvidence(plain, { maxInputBytes: 4 })).rejects.toMatchObject({ code: "PDF_RESOURCE_LIMIT" });
    const controller = new AbortController();
    controller.abort("fixture cancelled");
    await expect(inspectPdfEvidence(plain, { signal: controller.signal })).rejects.toMatchObject({ code: "PDF_ABORTED" });
  });

  it("does not copy an unsupported content stream and returns a typed loss", async () => {
    const root = new PDFRef(1);
    const pages = new PDFRef(2);
    const page = new PDFRef(3);
    const content = new PDFRef(4);
    const info = new PDFRef(5);
    const encoded = Buffer.from(`${Buffer.from("q\nQ\n", "ascii").toString("hex").toUpperCase()}>`, "ascii");
    const source = writePdfDocument({
      root,
      info,
      objects: [
        { ref: root, value: new PDFDictionary({ Pages: pages, Type: new PDFName("Catalog") }) },
        { ref: pages, value: new PDFDictionary({ Count: new PDFNumber(1), Kids: new PDFArray([page]), Type: new PDFName("Pages") }) },
        { ref: page, value: new PDFDictionary({ Contents: content, MediaBox: new PDFArray([0, 0, 612, 792].map((value) => new PDFNumber(value))), Parent: pages, Resources: new PDFDictionary(), Type: new PDFName("Page") }) },
        { ref: content, value: new PDFStream({ Filter: new PDFName("ASCIIHexDecode") }, encoded) },
        { ref: info, value: new PDFDictionary({ Producer: new PDFString("A03 unsupported-filter fixture") }) },
      ],
    });
    const extraction = await extractPdfEvidence(source);
    expect(extraction.losses).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PDF_TEXT_UNDECODABLE" })]));
    expect(extraction.textRuns).toHaveLength(0);
  });

  it("rejects stale locators and risky regular expressions", async () => {
    const source = await PdfEngine.render({ pages: [{ text: { value: "invoice 42" } }] });
    const extraction = await extractPdfEvidence(source);
    expect(() => findPdfEvidence(extraction, "(a+)+$", { mode: "regex" })).toThrow(PdfEvidenceError);
    const match = findPdfEvidence(extraction, "42")[0]!;
    await expect(redactPdfEvidence(source, [{ ...match, locator: { ...match.locator, value: [99, 0, 0, 0, 0, 0] } }])).rejects.toMatchObject({ code: "PDF_UNSUPPORTED" });
    await expect(redactPdfEvidence(source, [{ ...match, locator: { ...match.locator, artifactId: "0".repeat(64) } }])).rejects.toMatchObject({ code: "PDF_UNSUPPORTED" });
  });

  it("renders byte-identical canonical output for the same extraction", async () => {
    const source = await PdfEngine.render({ pages: [{ text: { value: "deterministic evidence" } }] });
    const extraction = await extractPdfEvidence(source);
    const [first, second] = await Promise.all([renderPdfEvidence(extraction), renderPdfEvidence(extraction)]);
    expect(Buffer.compare(first, second)).toBe(0);
  });

  it("runs through Extension Kit with declared losses and resource checkpoints", async () => {
    const source = await PdfEngine.render({ meta: { title: "Extension fixture" }, pages: [{ text: { value: "remove-token" } }] });
    const result = await runExtension(createPdfEvidenceExtension(), request(source, "redact", { query: "remove-token" }));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.losses.map((loss) => loss.code)).toEqual(expect.arrayContaining(["PDF_METADATA_STRIPPED", "PDF_GRAPHICS_NOT_PRESERVED"]));
      expect(result.artifacts).toEqual([expect.objectContaining({ name: "sanitized.pdf", mediaType: "application/pdf" })]);
    }
  });
});
