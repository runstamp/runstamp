import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { PptxArchive } from "../src/ooxml/zipper.js";
import { generateContentTypes } from "../src/ooxml/contentTypes.js";
import { generateGlobalRels, generatePresentationRels } from "../src/ooxml/relationships.js";

// ---------------------------------------------------------------------------
// Benchmark 1: Archive Structure Validation
// ---------------------------------------------------------------------------
describe("Benchmark 1: Archive Structure Validation", () => {
  it("generates a valid ZIP buffer with required files at the archive root", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Unzip in memory with JSZip
    const zip = await JSZip.loadAsync(buffer);
    const fileNames = Object.keys(zip.files);

    // Required files must exist at exact root paths
    expect(fileNames).toContain("[Content_Types].xml");
    expect(fileNames).toContain("_rels/.rels");
  });

  it("scaffolds ppt/ directories without nesting inside a parent folder", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const fileNames = Object.keys(zip.files);

    // Directories must be at the top level of the archive, not inside a wrapper folder
    const hasPptDir = fileNames.some((f) => f.startsWith("ppt/"));
    const hasRelsDir = fileNames.some((f) => f.startsWith("_rels/"));
    expect(hasPptDir).toBe(true);
    expect(hasRelsDir).toBe(true);

    // Ensure there is no erroneous wrapper folder (e.g., "output/ppt/")
    const hasWrongNesting = fileNames.some(
      (f) => /^[^/]+\/ppt\//.test(f) && !f.startsWith("ppt/")
    );
    expect(hasWrongNesting).toBe(false);
  });

  it("Content_Types.xml contains correct XML content", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const contentTypesFile = zip.file("[Content_Types].xml");
    expect(contentTypesFile).not.toBeNull();

    const content = await contentTypesFile!.async("string");
    expect(content).toContain('xmlns="http://schemas.openxmlformats.org/package/2006/content-types"');
    expect(content).toContain('Extension="rels"');
    expect(content).toContain('Extension="xml"');
  });

  it("_rels/.rels contains the officeDocument relationship", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const relsFile = zip.file("_rels/.rels");
    expect(relsFile).not.toBeNull();

    const content = await relsFile!.async("string");
    expect(content).toContain("ppt/presentation.xml");
    expect(content).toContain("officeDocument");
  });

  it("addFile() injects files that appear in the generated archive", async () => {
    const archive = new PptxArchive();
    archive.addFile("ppt/presentation.xml", "<presentation/>");
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const presentationFile = zip.file("ppt/presentation.xml");
    expect(presentationFile).not.toBeNull();
    const content = await presentationFile!.async("string");
    expect(content).toBe("<presentation/>");
  });
});

// ---------------------------------------------------------------------------
// Benchmark 2: Strict XML Header Check
// ---------------------------------------------------------------------------
describe("Benchmark 2: Strict XML Header Check", () => {
  it("generateContentTypes() starts with the exact XML declaration", () => {
    const xml = generateContentTypes(1);
    expect(xml).toMatch(
      /^<\?xml version="1\.0" encoding="UTF-8" standalone="yes"\?>/
    );
  });

  it("generateContentTypes() has no leading whitespace before the XML declaration", () => {
    const xml = generateContentTypes(1);
    expect(xml[0]).toBe("<");
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  it("generateContentTypes() contains slide overrides for each slide", () => {
    const xml3 = generateContentTypes(3);
    expect(xml3).toContain('PartName="/ppt/slides/slide1.xml"');
    expect(xml3).toContain('PartName="/ppt/slides/slide2.xml"');
    expect(xml3).toContain('PartName="/ppt/slides/slide3.xml"');
  });

  it("generateContentTypes() contains all mandatory part overrides", () => {
    const xml = generateContentTypes(1);
    expect(xml).toContain('PartName="/ppt/presentation.xml"');
    expect(xml).toContain('PartName="/ppt/slideMasters/slideMaster1.xml"');
    expect(xml).toContain('PartName="/ppt/slideLayouts/slideLayout1.xml"');
    expect(xml).toContain('PartName="/ppt/theme/theme1.xml"');
  });

  it("generateGlobalRels() starts with the exact XML declaration", () => {
    const xml = generateGlobalRels();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
  });

  it("generatePresentationRels() starts with the exact XML declaration", () => {
    const xml = generatePresentationRels(1);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
  });

  it("generatePresentationRels() assigns correct rId offsets for slides", () => {
    const xml = generatePresentationRels(3);
    // Core elements take rId1 (slideMaster) and rId2 (theme)
    // Slides start at rId3
    expect(xml).toContain('Id="rId3"');
    expect(xml).toContain('Id="rId4"');
    expect(xml).toContain('Id="rId5"');
    expect(xml).toContain('Target="slides/slide1.xml"');
    expect(xml).toContain('Target="slides/slide2.xml"');
    expect(xml).toContain('Target="slides/slide3.xml"');
  });
});

// ---------------------------------------------------------------------------
// Benchmark 3: Compression Standard
// ---------------------------------------------------------------------------
describe("Benchmark 3: Compression Standard (DEFLATE)", () => {
  it("generateBuffer() returns a valid ZIP magic bytes buffer", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();

    // All ZIP files start with the Local File Header signature: PK (0x50, 0x4B)
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it("generateBuffer() produces a ZIP that JSZip can re-parse without error", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();

    // If the buffer is not a valid ZIP this will throw
    await expect(JSZip.loadAsync(buffer)).resolves.toBeDefined();
  });

  it("files in the archive use DEFLATE compression (method byte = 8)", async () => {
    const archive = new PptxArchive();
    archive.addFile("ppt/presentation.xml", "<presentation/>");
    const buffer = await archive.generateBuffer();

    // ZIP Local File Header layout (offsets relative to entry start):
    //   0-3:  signature (PK\x03\x04)
    //   4-5:  version needed
    //   6-7:  general purpose bit flag
    //   8-9:  compression method (0 = STORE, 8 = DEFLATE)
    //  10-11: last mod time
    //  ...
    let offset = 0;
    let foundDeflate = false;

    while (offset < buffer.length - 4) {
      // Look for Local File Header signature: 0x50 0x4B 0x03 0x04
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);

        // Only files with actual content will be DEFLATE; empty entries may be STORE (0)
        if (compressedSize > 0 && compressionMethod === 8) {
          foundDeflate = true;
          break;
        }

        // Advance past this header to find next entry
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);
        offset += 30 + fileNameLength + extraFieldLength + compressedSize;
      } else {
        offset++;
      }
    }

    expect(foundDeflate).toBe(true);
  });

  it("generateBuffer() produces a non-trivially sized archive (not empty ZIP)", async () => {
    const archive = new PptxArchive();
    const buffer = await archive.generateBuffer();
    // A valid ZIP with real content will be well above 100 bytes
    expect(buffer.length).toBeGreaterThan(100);
  });
});
