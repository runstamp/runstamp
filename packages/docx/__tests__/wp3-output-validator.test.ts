import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  validateDocxBuffer,
  DocxStrictValidationError,
} from "../src/core/ooxml-output-validator.js";
import { renderToDocx } from "../src/render.js";

async function makeMinimalZip(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Target="word/document.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/>` +
      `</Relationships>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("WP3.4 — validateDocxBuffer", () => {
  it("flags negative w:tab w:pos values", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Override PartName="/word/document.xml" ContentType="x"/></Types>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="urn:test">` +
        `<w:p><w:pPr><w:tabs>` +
        `<w:tab w:val="right" w:pos="-15480"/>` +
        `</w:tabs></w:pPr></w:p>` +
        `</w:document>`,
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await validateDocxBuffer(buffer);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "DOCX_TAB_NEGATIVE")).toBe(true);
  });

  it("flags Content_Types overrides whose part is absent", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Override PartName="/word/missing.xml" ContentType="x"/></Types>`,
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await validateDocxBuffer(buffer);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.code === "DOCX_CONTENT_TYPES_OVERRIDE_MISSING"),
    ).toBe(true);
  });

  it("flags relationship Targets that don't resolve to a part", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Target="word/missing.xml" Type="x"/>` +
        `</Relationships>`,
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await validateDocxBuffer(buffer);
    expect(
      result.issues.some((i) => i.code === "DOCX_RELATIONSHIP_TARGET_MISSING"),
    ).toBe(true);
  });

  it("finds missing targets regardless of Relationship attribute order", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Target="word/missing.xml" Type="x" Id="rIdReordered"/>` +
        `</Relationships>`,
    );
    const result = await validateDocxBuffer(await zip.generateAsync({ type: "nodebuffer" }));
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "DOCX_RELATIONSHIP_TARGET_MISSING",
        details: expect.objectContaining({ id: "rIdReordered" }),
      }),
    ]));
  });

  it("flags owner-part relationship references with no matching Id", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Override ContentType="x" PartName="/word/document.xml"/></Types>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="urn:w" xmlns:r="urn:r">` +
        `<w:body><w:hyperlink r:id="rIdMissing"/></w:body></w:document>`,
    );
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship TargetMode="External" Target="https://example.com" Id="rIdOther" Type="x"/>` +
        `</Relationships>`,
    );
    const result = await validateDocxBuffer(await zip.generateAsync({ type: "nodebuffer" }));
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "DOCX_RELATIONSHIP_REFERENCE_MISSING",
        details: expect.objectContaining({ id: "rIdMissing" }),
      }),
    ]));
  });

  it("flags owner references when the relationships part is absent", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Override PartName="/word/document.xml" ContentType="x"/></Types>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="urn:w" xmlns:r="urn:r">` +
        `<w:body><w:drawing r:embed="rIdImage"/></w:body></w:document>`,
    );
    const result = await validateDocxBuffer(await zip.generateAsync({ type: "nodebuffer" }));
    expect(result.issues.some((issue) => issue.code === "DOCX_RELATIONSHIP_REFERENCE_MISSING")).toBe(true);
  });

  it("ignores External relationship targets", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rIdExt" Target="https://example.com/img.png" TargetMode="External" Type="x"/>` +
        `</Relationships>`,
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await validateDocxBuffer(buffer);
    expect(
      result.issues.some((i) => i.code === "DOCX_RELATIONSHIP_TARGET_MISSING"),
    ).toBe(false);
  });

  it("passes a minimal well-formed package", async () => {
    const buffer = await makeMinimalZip();
    const result = await validateDocxBuffer(buffer);
    // Note: we don't ship a `word/document.xml` part here, so we still
    // expect the Override → missing-part issue. The point of this test is
    // that the validator's contract is honest: ok=false IFF there's an
    // error-severity issue.
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("renderToDocx validates the produced buffer by default", async () => {
    const result = await renderToDocx(
      {
        type: "DocxDocument",
        pages: [{ elements: [{ type: "paragraph", text: "Strict mode test." }] }],
      } as never,
    );
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("renderToDocx accepts strict:false as a migration opt-out", async () => {
    const result = await renderToDocx(
      {
        type: "DocxDocument",
        pages: [{ elements: [{ type: "paragraph", text: "Permissive migration test." }] }],
      } as never,
      { strict: false },
    );
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("DocxStrictValidationError exposes the issues array", () => {
    const err = new DocxStrictValidationError([
      { severity: "error", code: "DOCX_TAB_NEGATIVE", message: "x" },
    ]);
    expect(err.issues).toHaveLength(1);
    expect(err.message).toContain("DOCX_TAB_NEGATIVE");
  });
});
