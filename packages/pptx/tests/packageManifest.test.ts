import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { generateContentTypes } from "../src/ooxml/contentTypes.js";
import { PptxArchive } from "../src/ooxml/zipper.js";
import { PaperEngine } from "../src/engine.js";
import { PaperError } from "../src/errors.js";
import { PackageManifest } from "../src/ooxml/packageManifest.js";
import { validatePptxStructure } from "../src/quality/structuralValidation.js";
import type { PaperDocument } from "../src/types/ast.js";

function collectContentTypeOverrides(xml: string): string[] {
  return Array.from(
    xml.matchAll(/<Override\b[^>]*\bPartName="([^"]+)"/g),
    (match) => match[1],
  );
}

async function expectPackageManifestFailure(
  action: () => Promise<unknown>,
  expectedMessage: string,
): Promise<void> {
  try {
    await action();
    throw new Error("Expected package manifest invariant failure.");
  } catch (error) {
    expect(error).toMatchObject({
      code: "STRUCTURAL_VALIDATION_FAILED",
      phase: "serialization",
    });
    expect(String((error as { issues?: Array<{ message?: string }> }).issues?.[0]?.message ?? ""))
      .toContain(expectedMessage);
  }
}

describe("OPC package manifest", () => {
  it.each([
    {
      configure: (manifest: PackageManifest) => {
        manifest.addDefault("png", "image/png");
        manifest.addDefault("png", "application/octet-stream");
      },
      message: 'Conflicting content type defaults for extension "png".',
    },
    {
      configure: (manifest: PackageManifest) => {
        manifest.addPart("ppt/presentation.xml", "type/a");
        manifest.addPart("ppt/presentation.xml", "type/b");
      },
      message: 'Conflicting content type overrides for part "/ppt/presentation.xml".',
    },
    {
      configure: (manifest: PackageManifest) => {
        const relationship = { id: "rId1", type: "type", target: "target.xml" };
        manifest.addRelationship(null, relationship);
        manifest.addRelationship(null, relationship);
      },
      message: 'Duplicate relationship id "rId1" for "/".',
    },
  ])("throws typed structural errors for manifest conflicts: $message", ({ configure, message }) => {
    try {
      configure(new PackageManifest());
      throw new Error("Expected package manifest conflict to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(PaperError);
      expect(error).toMatchObject({
        code: "STRUCTURAL_VALIDATION_FAILED",
        phase: "serialization",
      });
      expect((error as Error).message).toBe(message);
    }
  });

  it("generates multi-master content types without string-patched duplicate overrides", () => {
    const xml = generateContentTypes(
      2,
      1,
      true,
      [0],
      [1],
      true,
      true,
      true,
      true,
      true,
      1,
      [1],
      true,
      6,
      3,
    );
    const overrides = collectContentTypeOverrides(xml);
    const uniqueOverrides = new Set(overrides);

    expect(overrides).toContain("/ppt/slideMasters/slideMaster1.xml");
    expect(overrides).toContain("/ppt/slideMasters/slideMaster2.xml");
    expect(overrides).toContain("/ppt/slideMasters/slideMaster3.xml");
    expect(overrides).toContain("/ppt/slideLayouts/slideLayout6.xml");
    expect(uniqueOverrides.size).toBe(overrides.length);
  });

  it("blocks duplicate relationship ids before ZIP buffer generation", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1, { slideContents: [""] });
    archive.addFile("ppt/slides/_rels/slide1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/missing.png"/>
</Relationships>`);

    await expectPackageManifestFailure(
      () => archive.generateBuffer(),
      'Duplicate relationship id "rId1"',
    );
  });

  it("blocks parts without a content type before ZIP buffer generation", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1, { slideContents: [""] });
    archive.addFile("ppt/unknown/data.bin", Buffer.from("untyped"));

    await expectPackageManifestFailure(
      () => archive.generateBuffer(),
      'Package part "ppt/unknown/data.bin" has no content type',
    );
  });

  it("keeps multi-master packages structurally valid through the manifest path", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Manifest multi-master" },
      masters: [
        { name: "A", layouts: [{ name: "Title" }, { name: "Body" }] },
        { name: "B", layouts: [{ name: "Title" }, { name: "Body" }] },
      ],
      slides: [
        {
          type: "Slide",
          masterName: "A",
          notes: "Manifest notes",
          children: [
            {
              type: "Text",
              content: "Master A",
              style: { position: "absolute", left: 64, top: 64, width: 360, height: 64, fontSize: 28 },
            },
          ],
        },
        {
          type: "Slide",
          masterName: "B",
          children: [
            {
              type: "Chart",
              chartData: {
                chartType: "bar",
                categories: ["A", "B"],
                series: [{ name: "Revenue", values: [1, 2] }],
              },
              style: { position: "absolute", left: 72, top: 72, width: 420, height: 280 },
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc, { validationMode: "structural" });
    const zip = await JSZip.loadAsync(buffer);
    const contentTypesXml = await zip.file("[Content_Types].xml")!.async("string");
    expect(contentTypesXml).toContain('/ppt/slideMasters/slideMaster2.xml');
    expect(contentTypesXml).toContain('/ppt/slideLayouts/slideLayout4.xml');

    const structural = await validatePptxStructure(buffer);
    expect(structural.status).toBe("passed");
  });

  it("uses the shared presentation generator for multi-master presentation-level features", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(2, {
      mastersConfig: [
        { name: "A", layouts: [{ name: "Title" }] },
        { name: "B", layouts: [{ name: "Title" }] },
      ],
      slideMasterNames: ["A", "B"],
      sections: [{ name: "Parity", slideIndices: [0, 1] }],
      customShows: [{ name: "Cross master", slideIndices: [0, 1] }],
      protection: { readOnly: true, modifyPassword: "hash" },
      notesSize: { width: 640, height: 480 },
    });

    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const presentationXml = await zip.file("ppt/presentation.xml")!.async("string");

    expect(presentationXml).toContain("<p:custShowLst>");
    expect(presentationXml).toContain('name="Cross master"');
    expect(presentationXml).toContain("<p14:sectionLst");
    expect(presentationXml).toContain('name="Parity"');
    expect(presentationXml).toContain("<p:modifyVerifier");
    expect(presentationXml).toContain('cx="6096000" cy="4572000"');
  });

  it("rejects unresolved multi-master names in strict editable mode", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Strict master failure" },
      masters: [{ name: "Known", layouts: [{ name: "Blank" }] }],
      slides: [
        {
          type: "Slide",
          masterName: "Missing",
          children: [{ type: "Text", content: "Strict master contract" }],
        },
      ],
    };

    await expect(PaperEngine.render(doc, { outputMode: "strict_editable" }))
      .rejects.toMatchObject({
        code: "VALIDATION_FAILED",
        issues: [expect.objectContaining({ code: "MASTER_CONFIGURATION_INVALID" })],
      });
  });
});
