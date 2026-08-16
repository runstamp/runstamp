import { createHash } from "node:crypto";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { assessKnownBadControl, runExtension } from "@runstamp/protocol/extension-runtime";
import {
  DOCX_CONTROLLED_DOCUMENT_MANIFEST,
  applyDocxRedactions,
  createDocxControlledDocumentExtension,
  exportControlledDocx,
  findControlledDocx,
  importControlledDocx,
  inspectControlledDocx,
  previewDocxRedactions,
  verifyControlledDocx,
} from "../src/controlled-document/index.js";
import { validateDocxWithReferenceApplication } from "../src/controlled-document/reference-validator.js";

const ZIP_DATE = new Date("2000-01-01T00:00:00.000Z");

async function packageWith(parts: Record<string, string | Uint8Array>): Promise<Buffer> {
  const zip = new JSZip();
  const defaults: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello controlled DOCX</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  };
  for (const [name, value] of Object.entries({ ...defaults, ...parts }).sort(([left], [right]) => left.localeCompare(right))) {
    zip.file(name, value, { date: ZIP_DATE, createFolders: false });
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
}

const paragraph = (inner: string) => `<w:p>${inner}</w:p>`;
const run = (text: string) => `<w:r><w:t>${text}</w:t></w:r>`;

describe("A01 DOCX controlled-document", () => {
  it("declares the exact seven contract operations", () => {
    expect(DOCX_CONTROLLED_DOCUMENT_MANIFEST.operations.map(({ name }) => name)).toEqual([
      "inspect", "import", "find", "preview-redaction", "apply-redaction", "export", "verify",
    ]);
  });

  it("imports minimal and unrelated-domain text with stable locators", async () => {
    const bytes = await packageWith({
      "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(`${run("Torque specification")}${run(" 42 Nm")}`)}<w:tbl><w:tr><w:tc>${paragraph(run("Part AX-4"))}</w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>`,
      "word/styles.xml": `<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"/><w:style w:type="paragraph" w:styleId="ManualStep"/></w:styles>`,
      "word/numbering.xml": `<?xml version="1.0"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"/></w:numbering>`,
    });
    const first = await importControlledDocx(bytes, { artifactId: "manual.docx" });
    const second = await importControlledDocx(bytes, { artifactId: "manual.docx" });
    expect(first).toEqual(second);
    expect(findControlledDocx(first, "Torque specification 42 Nm")).toHaveLength(1);
    expect(findControlledDocx(first, "Part AX-4")[0]?.locator.scheme).toBe("docx-ooxml-text-v1");
    expect(first.inspection.features).toMatchObject({ paragraphs: 2, runs: 3, tables: 1, sections: 1, styles: 2, numberingDefinitions: 1 });
  });

  it("finds and deletes run-split targets in body, header, comment, footnote, and endnote parts", async () => {
    const body = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(`${run("Customer: Ac")}${run("me Secret")}`)}<w:sectPr/></w:body></w:document>`;
    const auxiliary = (root: string, text: string) => `<?xml version="1.0"?><w:${root} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${paragraph(run(text))}</w:${root}>`;
    const bytes = await packageWith({
      "word/document.xml": body,
      "word/header1.xml": auxiliary("hdr", "Acme Secret header"),
      "word/footer1.xml": auxiliary("ftr", "Acme Secret footer"),
      "word/comments.xml": auxiliary("comments", "Acme Secret comment"),
      "word/footnotes.xml": auxiliary("footnotes", "Acme Secret footnote"),
      "word/endnotes.xml": auxiliary("endnotes", "Acme Secret endnote"),
    });
    const imported = await importControlledDocx(bytes, { artifactId: "agreement.docx" });
    const matches = findControlledDocx(imported, "Acme Secret");
    expect(matches).toHaveLength(6);
    expect(previewDocxRedactions(imported, matches.map(({ locator }) => locator)).residualCount).toBe(6);
    const redacted = await applyDocxRedactions(imported, matches.map(({ locator }) => locator));
    expect(redacted.proof.removedOccurrences).toBe(6);
    expect(redacted.proof.residualCount).toBe(0);
    const roundTrip = await importControlledDocx(exportControlledDocx(redacted.document), { artifactId: "agreement.docx" });
    expect(findControlledDocx(roundTrip, "Acme Secret")).toHaveLength(0);
    expect(findControlledDocx(roundTrip, "Customer:")).toHaveLength(1);
  });

  it("rejects encrypted and over-budget archives", async () => {
    const encrypted = await packageWith({ EncryptionInfo: "cipher", EncryptedPackage: "ciphertext" });
    await expect(inspectControlledDocx(encrypted)).rejects.toMatchObject({ code: "DOCX_ENCRYPTED_INPUT" });
    await expect(inspectControlledDocx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).rejects.toMatchObject({ code: "DOCX_ENCRYPTED_INPUT" });
    const many = await packageWith(Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`custom/item-${index}.xml`, "x"])));
    await expect(inspectControlledDocx(many, { maxEntries: 5 })).rejects.toMatchObject({ code: "DOCX_ARCHIVE_LIMIT" });
    const bomb = await packageWith({ "custom/high-ratio.bin": "A".repeat(100_000) });
    await expect(inspectControlledDocx(bomb, { maxCompressionRatio: 2 })).rejects.toMatchObject({ code: "DOCX_ARCHIVE_LIMIT" });
  });

  it("reports executable/opaque parts without executing or discarding them", async () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]);
    const bytes = await packageWith({ "word/vbaProject.bin": ole, "word/embeddings/oleObject1.bin": ole });
    const inspection = await inspectControlledDocx(bytes);
    expect(inspection.executableParts).toEqual(["word/vbaProject.bin"]);
    expect(inspection.oleParts).toEqual(["word/embeddings/oleObject1.bin"]);
    expect(inspection.losses.map(({ code }) => code)).toContain("DOCX_OPAQUE_PART_PRESERVED");
    const reference = await validateDocxWithReferenceApplication(bytes, { application: "word" });
    expect(reference.validator.status).toBe("FAIL");
    expect(reference.validator.issues[0]?.code).toBe("DOCX_REFERENCE_UNSAFE_INPUT");
  });

  it("honors tracked-change visibility without executing external links", async () => {
    const bytes = await packageWith({
      "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(`<w:del><w:r><w:delText>Old Secret</w:delText></w:r></w:del><w:ins>${run("New Secret")}</w:ins>`)}<w:sectPr/></w:body></w:document>`,
      "word/_rels/document.xml.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://invalid.example/never-fetch" TargetMode="External"/></Relationships>`,
    });
    const imported = await importControlledDocx(bytes);
    expect(findControlledDocx(imported, "New Secret", { visibility: "final" })).toHaveLength(1);
    expect(findControlledDocx(imported, "Old Secret", { visibility: "final" })).toHaveLength(0);
    expect(findControlledDocx(imported, "Old Secret", { visibility: "original" })).toHaveLength(1);
    expect(findControlledDocx(imported, "New Secret", { visibility: "original" })).toHaveLength(0);
    expect(imported.inspection.warnings.map(({ code }) => code)).toContain("DOCX_EXTERNAL_RELATIONSHIP");
  });

  it("rejects unsafe original paths and excessive XML depth", async () => {
    const unsafe = await packageWith({ "../evil.xml": "<evil/>" });
    await expect(inspectControlledDocx(unsafe)).rejects.toMatchObject({ code: "DOCX_UNSAFE_ARCHIVE_PATH" });
    const nested = `${"<x>".repeat(20)}${"</x>".repeat(20)}`;
    const deep = await packageWith({ "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${nested}<w:body><w:sectPr/></w:body></w:document>` });
    await expect(inspectControlledDocx(deep, { maxXmlDepth: 10 })).rejects.toMatchObject({ code: "DOCX_XML_LIMIT" });
  });

  it("rejects stale locators instead of editing a changed paragraph", async () => {
    const bytes = await packageWith({ "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(run("Stable Secret"))}<w:sectPr/></w:body></w:document>` });
    const imported = await importControlledDocx(bytes);
    const locator = findControlledDocx(imported, "Secret")[0]!.locator;
    const changed = structuredClone(imported);
    changed.parts[0]!.xml = changed.parts[0]!.xml.replace("Stable", "Changed");
    await expect(applyDocxRedactions(changed, [locator])).rejects.toMatchObject({ code: "DOCX_STALE_LOCATOR" });
  });

  it("fails malformed relationships and the black-overlay known-bad control", async () => {
    const malformed = await packageWith({
      "word/_rels/document.xml.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="urn:test" Target="missing.bin"/></Relationships>`,
    });
    const malformedReport = await verifyControlledDocx(malformed);
    expect(malformedReport.issues.map(({ code }) => code)).toContain("DOCX_RELATIONSHIP_TARGET_MISSING");

    const blackOverlay = await packageWith({
      "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(`${run("SSN 123-")}${run("45-6789")}<w:r><w:pict><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="black"/></w:pict></w:r>`)}<w:sectPr/></w:body></w:document>`,
    });
    const report = await verifyControlledDocx(blackOverlay, { forbiddenText: ["123-45-6789"] });
    expect(report.status).toBe("FAIL");
    expect(report.issues.map(({ code }) => code)).toEqual(["DOCX_RESIDUAL_TEXT"]);
    expect(assessKnownBadControl(report.validator).status).toBe("PASS");
  });

  it("emits deterministic bytes and preserves opaque parts byte-for-byte", async () => {
    const opaque = new Uint8Array([1, 2, 3, 4, 5]);
    const bytes = await packageWith({ "customXml/item1.bin": opaque, "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(run("Secret token and public clause"))}<w:sectPr/></w:body></w:document>` });
    const imported = await importControlledDocx(bytes, { artifactId: "contract.docx" });
    const locators = findControlledDocx(imported, "Secret token").map(({ locator }) => locator);
    const one = exportControlledDocx((await applyDocxRedactions(imported, locators)).document);
    const two = exportControlledDocx((await applyDocxRedactions(imported, locators)).document);
    expect(createHash("sha256").update(one).digest("hex")).toBe(createHash("sha256").update(two).digest("hex"));
    const outputZip = await JSZip.loadAsync(one);
    expect(await outputZip.file("customXml/item1.bin")?.async("uint8array")).toEqual(opaque);
    expect((await verifyControlledDocx(one, { forbiddenText: ["Secret token"] })).status).toBe("PASS");
  });

  it("composes apply-redaction through Extension Kit", async () => {
    const bytes = await packageWith({ "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(run("Remove Delta Secret"))}<w:sectPr/></w:body></w:document>` });
    const imported = await importControlledDocx(bytes, { artifactId: "composed.docx" });
    const locator = findControlledDocx(imported, "Delta Secret")[0]!.locator;
    const result = await runExtension(createDocxControlledDocumentExtension(), {
      schemaVersion: 1,
      extensionId: DOCX_CONTROLLED_DOCUMENT_MANIFEST.id,
      operation: "apply-redaction",
      input: { document: imported, locators: [locator] },
      context: {
        runId: "a01-composition",
        seed: "a01-seed",
        now: "2026-08-10T00:00:00.000Z",
        network: "disabled",
        budget: { maxInputBytes: 2_000_000, maxOutputBytes: 2_000_000, maxEntries: 1_000, maxDepth: 32, timeoutMs: 10_000 },
      },
    });
    expect(result.status).toBe("ok");
    expect(result.losses).toEqual([]);
  });
});
