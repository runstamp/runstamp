import { PDFArray, PDFDictionary, PDFName, PDFNumber, PDFRef, PDFStream, PDFString } from "../src/pdf-objects.js";
import { writePdfDocument } from "../src/pdf-writer.js";
import { scanPdfBuffer } from "../src/phase10-validate.js";
import { PdfEngine } from "../src/engine.js";
import {
  createPhase10SignOptions,
  createPhase10SigningDocument,
  ensurePhase10CertificateFixtures,
  injectQualityDefects,
} from "../scripts/phase10-fixtures.js";
import { createTextFieldDocument } from "../scripts/phase6-fixtures.js";
import { createPdfaDocument } from "../scripts/phase8-fixtures.js";

describe("Phase 10 validation hardening", () => {
  it("flags tampered signed PDFs instead of reporting them as signed", async () => {
    const fixtures = await ensurePhase10CertificateFixtures();
    const signed = await PdfEngine.sign(
      createPhase10SigningDocument(),
      createPhase10SignOptions(fixtures),
    );
    const tampered = injectQualityDefects(signed).buffer;
    const validation = await PdfEngine.validate(tampered);

    expect(validation.findings.some((finding) => finding.code === "SIGNATURE_INVALID")).toBe(true);
    expect(validation.complianceLevel).not.toBe("signed");
    expect(validation.complianceLevel).not.toBe("signed_timestamped");
  });

  it("does not hallucinate indirect objects from stream payload text", () => {
    const buffer = writePdfDocument({
      info: new PDFRef(5),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Pages: new PDFRef(2),
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: new PDFRef(2),
          value: new PDFDictionary({
            Count: new PDFNumber(1),
            Kids: new PDFArray([new PDFRef(3)]),
            Type: new PDFName("Pages"),
          }),
        },
        {
          ref: new PDFRef(3),
          value: new PDFDictionary({
            Contents: new PDFRef(4),
            MediaBox: new PDFArray([0, 0, 612, 792].map((value) => new PDFNumber(value))),
            Parent: new PDFRef(2),
            Resources: new PDFDictionary({}),
            Type: new PDFName("Page"),
          }),
        },
        {
          ref: new PDFRef(4),
          value: new PDFStream(
            {
              Filter: new PDFName("FlateDecode"),
            },
            Buffer.from("noise\n12 0 obj\nfake object\nendobj\nstill stream data", "utf8"),
          ),
        },
        {
          ref: new PDFRef(5),
          value: new PDFDictionary({
            Producer: new PDFString("Runstamp"),
          }),
        },
      ],
    });

    const scan = scanPdfBuffer(buffer);
    expect(scan.objects.map((object) => object.objectNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not treat object-looking text inside PDF strings as real object references", () => {
    const buffer = writePdfDocument({
      info: new PDFRef(3),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Pages: new PDFRef(2),
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: new PDFRef(2),
          value: new PDFDictionary({
            Count: new PDFNumber(0),
            Kids: new PDFArray([]),
            Type: new PDFName("Pages"),
          }),
        },
        {
          ref: new PDFRef(3),
          value: new PDFDictionary({
            Producer: new PDFString("not an indirect ref: 999 0 R"),
          }),
        },
      ],
    });

    const scan = scanPdfBuffer(buffer);
    expect(scan.objects.find((object) => object.objectNumber === 3)?.refs).toEqual([]);
  });

  it("repairs metadata sync without leaving a stale stream length", async () => {
    const document = await createPdfaDocument();
    const clean = await PdfEngine.render(document);
    const tampered = Buffer.from(
      clean.toString("latin1").replace(
        /<rdf:li[^>]*>.*?<\/rdf:li>/,
        '<rdf:li xml:lang="x-default">A Much Longer Metadata Title For Repair Validation</rdf:li>',
      ),
      "latin1",
    );

    const before = await PdfEngine.validate(tampered);
    const repaired = await PdfEngine.repair(tampered);
    const after = await PdfEngine.validate(repaired.buffer);

    expect(before.findings.some((finding) => finding.code === "INFO_XMP_MISMATCH")).toBe(true);
    expect(after.findings.some((finding) => finding.code === "INFO_XMP_MISMATCH")).toBe(false);
    expect(after.findings.some((finding) => finding.code === "STREAM_LENGTH_MISMATCH")).toBe(false);
  });

  it("preserves PDF/A trailer IDs when rebuilding xref tables", async () => {
    const clean = await PdfEngine.render(await createPdfaDocument());
    const repaired = await PdfEngine.repair(clean);
    const trailerIdPattern = /\/ID \[<[0-9A-F]{32}> <[0-9A-F]{32}>]/;

    expect(clean.toString("binary")).toMatch(trailerIdPattern);
    expect(repaired.buffer.toString("binary")).toMatch(trailerIdPattern);
  });

  it("does not report stream length mismatches for standard rendered form PDFs", async () => {
    const buffer = await PdfEngine.render(createTextFieldDocument());
    const validation = await PdfEngine.validate(buffer);

    expect(validation.findings.some((finding) => finding.code === "STREAM_LENGTH_MISMATCH")).toBe(false);
  });
});
