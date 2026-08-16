import { deflate } from "pako";
import { PdfEngine } from "../src/engine.js";
import { PDFArray, PDFDictionary, PDFName, PDFNumber, PDFRef, PDFString } from "../src/pdf-objects.js";
import { writePdfDocument } from "../src/pdf-writer.js";
import {
  createCheckboxDocument,
  createDropdownDocument,
  createRadioDocument,
  createTextFieldDocument,
} from "../scripts/phase6-fixtures.js";
import { createPhase10SignOptions, createPhase10SigningDocument, ensurePhase10CertificateFixtures } from "../scripts/phase10-fixtures.js";

function pdfText(buffer: Buffer): string {
  return buffer.toString("latin1");
}

function writeIndirect(objectNumber: number, body: string | Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(`${objectNumber} 0 obj\n`, "latin1"),
    typeof body === "string" ? Buffer.from(body, "latin1") : body,
    Buffer.from("\nendobj\n", "latin1"),
  ]);
}

function xrefEntry(type: number, field2: number, field3: number): Buffer {
  const buffer = Buffer.alloc(7);
  buffer.writeUInt8(type, 0);
  buffer.writeUInt32BE(field2, 1);
  buffer.writeUInt16BE(field3, 5);
  return buffer;
}

function createObjectStreamFormFixture(): Buffer {
  const chunks: Buffer[] = [Buffer.from("%PDF-1.7\n%\xff\xff\xff\xff\n", "latin1")];
  const offsets = new Map<number, number>();
  const pushObject = (objectNumber: number, body: string | Buffer): void => {
    offsets.set(objectNumber, Buffer.concat(chunks).length);
    chunks.push(writeIndirect(objectNumber, body));
  };

  pushObject(1, "<< /Type /Catalog /Pages 2 0 R /AcroForm 5 0 R >>");
  pushObject(2, "<< /Type /Pages /Count 1 /Kids [3 0 R] >>");
  pushObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [6 0 R] >>");
  pushObject(4, "<< /Producer (object-stream-fixture) >>");
  pushObject(5, "<< /Fields [6 0 R] >>");

  const compressedObjectBody = Buffer.from("6 0 << /Type /Annot /Subtype /Widget /FT /Tx /T (compressed_name) /Rect [10 10 180 34] /V (Ada) >>", "latin1");
  const objectStreamData = Buffer.from(deflate(compressedObjectBody));
  pushObject(7, Buffer.concat([
    Buffer.from(`<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length ${objectStreamData.length} >>\nstream\n`, "latin1"),
    objectStreamData,
    Buffer.from("\nendstream", "latin1"),
  ]));

  const xrefOffset = Buffer.concat(chunks).length;
  const entries = [
    xrefEntry(0, 0, 65535),
    xrefEntry(1, offsets.get(1) as number, 0),
    xrefEntry(1, offsets.get(2) as number, 0),
    xrefEntry(1, offsets.get(3) as number, 0),
    xrefEntry(1, offsets.get(4) as number, 0),
    xrefEntry(1, offsets.get(5) as number, 0),
    xrefEntry(2, 7, 0),
    xrefEntry(1, offsets.get(7) as number, 0),
    xrefEntry(1, xrefOffset, 0),
  ];
  const xrefData = Buffer.from(deflate(Buffer.concat(entries)));
  chunks.push(writeIndirect(8, Buffer.concat([
    Buffer.from(`<< /Type /XRef /Size 9 /Root 1 0 R /Info 4 0 R /W [1 4 2] /Index [0 9] /Filter /FlateDecode /Length ${xrefData.length} >>\nstream\n`, "latin1"),
    xrefData,
    Buffer.from("\nendstream", "latin1"),
  ])));
  chunks.push(Buffer.from(`startxref\n${xrefOffset}\n%%EOF\n`, "latin1"));
  return Buffer.concat(chunks);
}

function createXfaFormFixture(): Buffer {
  return writePdfDocument({
    info: new PDFRef(4),
    root: new PDFRef(1),
    objects: [
      {
        ref: new PDFRef(1),
        value: new PDFDictionary({
          AcroForm: new PDFRef(5),
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
        ref: new PDFRef(4),
        value: new PDFDictionary({
          Producer: new PDFString("Runstamp test"),
        }),
      },
      {
        ref: new PDFRef(5),
        value: new PDFDictionary({
          Fields: new PDFArray([]),
          XFA: new PDFString("template"),
        }),
      },
    ],
  });
}

describe("Existing PDF AcroForm fill", () => {
  it("inspects generated AcroForm fields", async () => {
    const buffer = await PdfEngine.render(createTextFieldDocument());
    const inspection = await PdfEngine.inspectForm(buffer);

    expect(inspection.isEncrypted).toBe(false);
    expect(inspection.hasXfa).toBe(false);
    expect(inspection.hasSignatures).toBe(false);
    expect(inspection.fields).toContainEqual(expect.objectContaining({
      maxLength: 64,
      name: "full_name",
      readOnly: true,
      required: true,
      type: "text",
      value: "Ada Lovelace",
      widgetCount: 1,
    }));
  });

  it("fills text fields by full rewrite and preserves inspectability", async () => {
    const buffer = await PdfEngine.render(createTextFieldDocument());
    const result = await PdfEngine.fillForm(buffer, { full_name: "Grace Hopper" }, { updateDefaultValues: true });
    const text = pdfText(result.buffer);
    const inspection = await PdfEngine.inspectForm(result.buffer);

    expect(result.filled).toEqual(["full_name"]);
    expect(result.warnings.some((warning) => warning.code === "field.readonly")).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "appearance.fallback_font")).toBe(false);
    expect(text).toContain("/V (Grace Hopper)");
    expect(text).toContain("/DV (Grace Hopper)");
    expect(text).toContain("/AP <<");
    expect(text).not.toMatch(/\/BaseFont \/Helvetica(?:\s|$)/);
    expect(inspection.fields.find((field) => field.name === "full_name")?.value).toBe("Grace Hopper");
    const validation = await PdfEngine.validate(result.buffer);
    expect(validation.verdict).not.toBe("errors");
  });

  it("fills checkbox, radio, and dropdown fields", async () => {
    const checkbox = await PdfEngine.fillForm(await PdfEngine.render(createCheckboxDocument()), { accept_terms: true });
    const radio = await PdfEngine.fillForm(await PdfEngine.render(createRadioDocument()), { delivery: "Monthly" });
    const dropdown = await PdfEngine.fillForm(await PdfEngine.render(createDropdownDocument()), { team: "Operations" });

    expect(pdfText(checkbox.buffer)).toContain("/AS /Yes");
    expect(pdfText(checkbox.buffer)).toContain("/V /Yes");
    expect(pdfText(radio.buffer)).toContain("/V /Monthly");
    expect(pdfText(radio.buffer)).toContain("/AS /Monthly");
    expect(pdfText(dropdown.buffer)).toContain("/V (Operations)");
    expect((await PdfEngine.inspectForm(dropdown.buffer)).fields.find((field) => field.name === "team")?.value).toBe("Operations");
  });

  it("can inspect and fill fields stored in object streams behind xref streams", async () => {
    const fixture = createObjectStreamFormFixture();
    const before = await PdfEngine.inspectForm(fixture);
    const filled = await PdfEngine.fillForm(fixture, { compressed_name: "Stored normally" });
    const after = await PdfEngine.inspectForm(filled.buffer);

    expect(before.fields).toContainEqual(expect.objectContaining({ name: "compressed_name", value: "Ada" }));
    expect(after.fields).toContainEqual(expect.objectContaining({ name: "compressed_name", value: "Stored normally" }));
    expect(pdfText(filled.buffer)).toContain("/T (compressed_name)");
    expect(pdfText(filled.buffer)).not.toContain("/ObjStm");
  });

  it("rejects invalid field updates clearly", async () => {
    await expect(
      PdfEngine.fillForm(await PdfEngine.render(createTextFieldDocument()), { full_name: "x".repeat(65) }),
    ).rejects.toThrow(/MaxLen 64/);

    await expect(
      PdfEngine.fillForm(await PdfEngine.render(createDropdownDocument()), { team: "Finance" }),
    ).rejects.toThrow(/does not contain option/);

    await expect(
      PdfEngine.fillForm(await PdfEngine.render(createCheckboxDocument()), { missing: true }),
    ).rejects.toThrow(/No AcroForm field named "missing"/);
  });

  it("supports non-strict unknown fields and explicit NeedAppearances mode", async () => {
    const result = await PdfEngine.fillForm(
      await PdfEngine.render(createTextFieldDocument()),
      { full_name: "Manual Appearance", missing: "ignored" },
      { appearance: "needAppearances", strict: false },
    );

    expect(result.filled).toEqual(["full_name"]);
    expect(result.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "field.unknown",
      "appearance.need_appearances",
    ]));
    expect(pdfText(result.buffer)).toContain("/NeedAppearances true");
  });

  it("rejects encrypted, XFA, and signed PDFs before mutation", async () => {
    const encrypted = await PdfEngine.render(createTextFieldDocument(), { encryption: { userPassword: "secret" } });
    await expect(PdfEngine.fillForm(encrypted, { full_name: "Nope" })).rejects.toThrow(/encrypted PDFs are not supported/);

    await expect(PdfEngine.fillForm(createXfaFormFixture(), { full_name: "Nope" })).rejects.toThrow(/XFA forms are not supported/);

    const fixtures = await ensurePhase10CertificateFixtures();
    const signed = await PdfEngine.sign(createPhase10SigningDocument(), createPhase10SignOptions(fixtures));
    await expect(PdfEngine.fillForm(signed, { full_name: "Nope" })).rejects.toThrow(/signed PDFs require/);
  });
});
