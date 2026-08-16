import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { runExtension } from "@runstamp/protocol";
import {
  createPptxTemplateRoundTripExtension,
  exportPptxTemplate,
  importPptxTemplate,
  inspectPptxTemplate,
  mutatePptxTemplate,
  verifyPptxTemplate,
} from "../src/template/roundTrip.js";

async function minimalPptx(options: { dangling?: boolean; external?: boolean; slides?: number; timing?: boolean; unsupportedSlot?: boolean } = {}): Promise<Buffer> {
  const zip = new JSZip();
  const slideCount = options.slides ?? 1;
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
  zip.file("ppt/presentation.xml", `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`);
  zip.file("ppt/theme/theme1.xml", `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:clrScheme name="Brand"><a:accent1><a:srgbClr val="112233"/></a:accent1></a:clrScheme><a:fontScheme name="Brand"/></a:themeElements></a:theme>`);
  zip.file("ppt/slideMasters/slideMaster1.xml", `<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sldMaster>`);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`);
  zip.file("ppt/slideLayouts/slideLayout1.xml", `<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Title"><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:nvPr><p:ph type="title" idx="1"/></p:nvPr></p:nvSpPr></p:sp></p:spTree></p:cSld></p:sldLayout>`);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  for (let i = 1; i <= slideCount; i++) {
    zip.file(`ppt/slides/slide${i}.xml`, `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="runstamp:slot:title-${i}"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>Original ${i}</a:t></a:r></a:p></p:txBody></p:sp>${options.unsupportedSlot && i === 1 ? `<p:pic><p:nvPicPr><p:cNvPr id="3" name="runstamp:slot:hero-media"/></p:nvPicPr></p:pic>` : ""}</p:spTree></p:cSld>${options.timing ? "<p:timing/>" : ""}</p:sld>`);
    zip.file(`ppt/slides/_rels/slide${i}.xml.rels`, `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>${i === 1 ? `<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${options.dangling ? "../media/missing.png" : "../media/image1.png"}"/>` : ""}${options.external && i === 1 ? `<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/never-fetched" TargetMode="External"/>` : ""}</Relationships>`);
  }
  zip.file("ppt/media/image1.png", Buffer.from([137, 80, 78, 71]));
  zip.file("ppt/customXml/item1.xml", "<safe xmlns=\"urn:example\">opaque</safe>");
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

describe("PPTX template round trip", () => {
  it("rejects the known-bad dangling relationship even though ZIP parsing succeeds", async () => {
    const input = await minimalPptx({ dangling: true });
    await expect(JSZip.loadAsync(input)).resolves.toBeDefined();
    const verdict = await verifyPptxTemplate(input);
    expect(verdict.status).toBe("FAIL");
    expect(verdict.issues.some((issue) => issue.code === "PPTX_RELATIONSHIP_TARGET_MISSING")).toBe(true);
  });

  it("inspects stable slides, objects, slots, and package inventories", async () => {
    const report = await inspectPptxTemplate(await minimalPptx());
    expect(report.counts).toMatchObject({ slides: 1, masters: 1, layouts: 1, themes: 1, media: 1 });
    expect(report.slides[0]?.locator.value).toEqual(["ppt/slides/slide1.xml"]);
    expect(report.slides[0]?.objects[0]?.locator.value).toEqual(["ppt/slides/slide1.xml", "2"]);
    expect(report.slots[0]?.id).toBe("title-1");
    expect(report.opaqueParts.map((part) => part.path)).toContain("ppt/customXml/item1.xml");
  });

  it("mutates only designated slots and theme tokens while preserving safe opaque bytes", async () => {
    const source = await minimalPptx();
    const imported = await importPptxTemplate(source);
    const mutation = await mutatePptxTemplate(imported, {
      textSlots: { "title-1": "Approved & editable" },
      themeColors: { "112233": "445566" },
    });
    const exported = await exportPptxTemplate(mutation);
    const opened = await JSZip.loadAsync(exported.buffer);
    expect(await opened.file("ppt/slides/slide1.xml")!.async("string")).toContain("Approved &amp; editable");
    expect(await opened.file("ppt/theme/theme1.xml")!.async("string")).toContain("445566");
    expect(await opened.file("ppt/customXml/item1.xml")!.async("string")).toBe("<safe xmlns=\"urn:example\">opaque</safe>");
    const verdict = await verifyPptxTemplate(exported.buffer, imported.inspection);
    expect(verdict.status).toBe("PASS");
  });

  it("is byte deterministic and preserves a 55-slide semantic count", async () => {
    const imported = await importPptxTemplate(await minimalPptx({ slides: 55 }));
    const mutation = await mutatePptxTemplate(imported, { textSlots: { "title-55": "Closing" } });
    const [one, two] = await Promise.all([exportPptxTemplate(mutation), exportPptxTemplate(mutation)]);
    expect(one.sha256).toBe(two.sha256);
    expect(one.buffer.equals(two.buffer)).toBe(true);
    expect((await inspectPptxTemplate(one.buffer)).counts.slides).toBe(55);
  });

  it("reports unverified animation preservation and supports cancellation", async () => {
    const source = await minimalPptx({ timing: true, external: true });
    const imported = await importPptxTemplate(source);
    expect(imported.losses.map((loss) => loss.code)).toContain("PPTX_ANIMATION_PRESERVATION_UNVERIFIED");
    expect(imported.losses.map((loss) => loss.code)).toContain("PPTX_EXTERNAL_RELATIONSHIP_NOT_FOLLOWED");
    const controller = new AbortController();
    controller.abort("cancel test");
    await expect(inspectPptxTemplate(source, { signal: controller.signal })).rejects.toMatchObject({ code: "PPTX_ABORTED" });
  });

  it("preserves the existing rich corporate corpus across import and export", async () => {
    for (const fixture of [
      "tests/desktopValidation/artifacts/template-mutation/generated.pptx",
      "tests/desktopValidation/artifacts/strategy-studio/generated.pptx",
      "tests/desktopValidation/artifacts/notes-comments-media/generated.pptx",
    ]) {
      const source = await readFile(new URL(`../${fixture}`, import.meta.url));
      const imported = await importPptxTemplate(source);
      const exported = await exportPptxTemplate(imported);
      const verdict = await verifyPptxTemplate(exported.buffer, imported.inspection);
      expect(verdict.status, fixture).toBe("PASS");
    }
    const strategy = await inspectPptxTemplate(await readFile(new URL("../tests/desktopValidation/artifacts/strategy-studio/generated.pptx", import.meta.url)));
    expect(strategy.counts).toMatchObject({ charts: 6, media: 4, slides: 25, tables: 9 });
    const notes = await inspectPptxTemplate(await readFile(new URL("../tests/desktopValidation/artifacts/notes-comments-media/generated.pptx", import.meta.url)));
    expect(notes.counts).toMatchObject({ comments: 1, media: 1, notes: 2 });
    const corporate = await inspectPptxTemplate(await readFile(new URL("../tests/desktopValidation/artifacts/template-mutation/generated.pptx", import.meta.url)));
    expect(corporate.counts).toMatchObject({ layouts: 37, masters: 3, media: 1, themes: 4 });
  });

  it("fails closed for active content and resource exhaustion", async () => {
    const macro = await JSZip.loadAsync(await minimalPptx());
    macro.file("ppt/vbaProject.bin", Buffer.from("never execute"));
    await expect(inspectPptxTemplate(await macro.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "PPTX_ACTIVE_CONTENT_REJECTED" });
    const ole = await JSZip.loadAsync(await minimalPptx());
    ole.file("ppt/embeddings/oleObject1.bin", Buffer.from("never execute"));
    await expect(inspectPptxTemplate(await ole.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "PPTX_ACTIVE_CONTENT_REJECTED" });
    const encrypted = await JSZip.loadAsync(await minimalPptx());
    encrypted.file("EncryptionInfo", Buffer.from("protected"));
    encrypted.file("EncryptedPackage", Buffer.from("ciphertext"));
    await expect(inspectPptxTemplate(await encrypted.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "PPTX_ENCRYPTED" });
    const malformed = await JSZip.loadAsync(await minimalPptx());
    malformed.file("ppt/slides/slide1.xml", "<p:sld><unclosed></p:sld>");
    await expect(inspectPptxTemplate(await malformed.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "PPTX_MALFORMED" });
    await expect(inspectPptxTemplate(await minimalPptx({ slides: 2 }), { maxSlides: 1 })).rejects.toMatchObject({ code: "PPTX_RESOURCE_LIMIT" });
    await expect(inspectPptxTemplate(await minimalPptx(), { maxEntries: 2 })).rejects.toMatchObject({ code: "PPTX_RESOURCE_LIMIT" });
  });

  it("rejects mutation outside designated slots", async () => {
    const imported = await importPptxTemplate(await minimalPptx());
    await expect(mutatePptxTemplate(imported, { textSlots: { arbitrary: "no" } })).rejects.toMatchObject({ code: "PPTX_SLOT_NOT_FOUND" });
  });

  it("preserves designated non-text slots with an explicit typed loss", async () => {
    const imported = await importPptxTemplate(await minimalPptx({ unsupportedSlot: true }));
    expect(imported.inspection.slots.find((slot) => slot.id === "hero-media")?.kind).toBe("unsupported");
    expect(imported.losses.map((loss) => loss.code)).toContain("PPTX_SLOT_KIND_UNSUPPORTED");
    await expect(mutatePptxTemplate(imported, { textSlots: { "hero-media": "not flattening this picture" } })).rejects.toMatchObject({ code: "PPTX_SLOT_NOT_FOUND" });
  });

  it("composes with the EX01 Extension Kit contract", async () => {
    const extension = createPptxTemplateRoundTripExtension();
    expect(extension.manifest.catalogItemId).toBe("A04");
    expect(extension.manifest.operations.map((operation) => operation.name)).toEqual(["inspect", "import", "mutate", "export", "verify"]);
    const source = await minimalPptx();
    const result = await runExtension(extension, {
      schemaVersion: 1,
      extensionId: extension.manifest.id,
      operation: "inspect",
      input: { sourceBase64: source.toString("base64") },
      context: {
        runId: "a04-composition",
        seed: "fixed",
        now: "2026-08-10T00:00:00.000Z",
        network: "disabled",
        budget: { maxInputBytes: 10_000_000, maxOutputBytes: 10_000_000, maxEntries: 1_000, maxDepth: 32, timeoutMs: 10_000 },
      },
    });
    expect(result.status).toBe("ok");
  });
});
