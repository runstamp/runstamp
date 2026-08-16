import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { openPptx } from "../src/open.js";
import { normalizeXml, normalizeForHash } from "../src/normalize.js";

const coreXml = (created: string, modified: string) =>
  `<?xml version="1.0"?>
<cp:coreProperties xmlns:cp="x" xmlns:dc="x" xmlns:dcterms="x">
  <dc:creator>Engine</dc:creator>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${modified}</dcterms:modified>
  <cp:lastModifiedBy>Engine</cp:lastModifiedBy>
</cp:coreProperties>`;

describe("normalizeXml", () => {
  it("strips volatile fields from docProps/core.xml", () => {
    const a = Buffer.from(coreXml("2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z"));
    const b = Buffer.from(coreXml("2026-05-03T12:34:56Z", "2026-05-03T12:35:00Z"));

    const na = normalizeXml("docProps/core.xml", a);
    const nb = normalizeXml("docProps/core.xml", b);

    expect(na).toBe(nb);
    expect(na).not.toContain("dcterms:created");
    expect(na).not.toContain("dcterms:modified");
    expect(na).not.toContain("cp:revision");
    expect(na).not.toContain("dc:creator");
    expect(na).not.toContain("cp:lastModifiedBy");
  });

  it("does not modify non-metadata XML", () => {
    const slide = Buffer.from("<slide><sp/></slide>");
    expect(normalizeXml("ppt/slides/slide1.xml", slide)).toBe("<slide><sp/></slide>");
  });
});

async function buildPptxWith(coreContent: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("ppt/presentation.xml", "<presentation/>");
  zip.file("ppt/slides/slide1.xml", "<slide/>");
  zip.file("docProps/core.xml", coreContent);
  return await zip.generateAsync({ type: "nodebuffer" });
}

describe("normalizeForHash", () => {
  it("produces identical digest for runs that differ only in timestamps", async () => {
    const aBuf = await buildPptxWith(coreXml("2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z"));
    const bBuf = await buildPptxWith(coreXml("2026-05-03T12:34:56Z", "2026-05-03T12:35:00Z"));

    const a = await openPptx(aBuf);
    const b = await openPptx(bBuf);

    const na = normalizeForHash(a);
    const nb = normalizeForHash(b);

    expect(na.digest).toBe(nb.digest);
    expect(na.parts.map((p) => p.path)).toEqual(nb.parts.map((p) => p.path));
  });

  it("produces a different digest when slide content differs", async () => {
    const aBuf = await buildPptxWith(coreXml("x", "y"));
    const a = await openPptx(aBuf);

    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    zip.file("ppt/presentation.xml", "<presentation/>");
    zip.file("ppt/slides/slide1.xml", "<slide><different/></slide>");
    zip.file("docProps/core.xml", coreXml("x", "y"));
    const cBuf = await zip.generateAsync({ type: "nodebuffer" });
    const c = await openPptx(cBuf);

    expect(normalizeForHash(a).digest).not.toBe(normalizeForHash(c).digest);
  });

  it("manifest sorts parts by path so insertion order does not affect hash", async () => {
    const z1 = new JSZip();
    z1.file("a.xml", "<a/>");
    z1.file("b.xml", "<b/>");
    const buf1 = await z1.generateAsync({ type: "nodebuffer" });

    const z2 = new JSZip();
    z2.file("b.xml", "<b/>");
    z2.file("a.xml", "<a/>");
    const buf2 = await z2.generateAsync({ type: "nodebuffer" });

    const o1 = await openPptx(buf1);
    const o2 = await openPptx(buf2);
    expect(normalizeForHash(o1).digest).toBe(normalizeForHash(o2).digest);
  });
});
