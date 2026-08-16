import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generatePresentationXml } from "../src/ooxml/presentation.js";
import { generatePresentationRels } from "../src/ooxml/relationships.js";
import { generateSlideShell, generateSlideLayout, generateSlideMaster } from "../src/ooxml/slide.js";
import { generateSlideRels, generateSlideMasterRels, generateSlideLayoutRels } from "../src/ooxml/slideRelationships.js";
import { SLIDE_WIDTH_EMU, SLIDE_HEIGHT_EMU, EMU_PER_INCH } from "../src/ooxml/constants.js";
import { computePresSlideRId, computePresNotesMasterRId } from "../src/ooxml/rIdCalc.js";
import { PptxArchive } from "../src/ooxml/zipper.js";

// ---------------------------------------------------------------------------
// Benchmark 1: Canvas Math Execution
// ---------------------------------------------------------------------------
describe("Benchmark 1: Canvas Math Execution", () => {
  it("SLIDE_WIDTH_EMU equals 1280px * 9525 EMU/px (standard 13.33in widescreen)", () => {
    expect(EMU_PER_INCH).toBe(914400);
    expect(SLIDE_WIDTH_EMU).toBe(12192000);
    expect(SLIDE_HEIGHT_EMU).toBe(6858000);
  });

  it("generatePresentationXml(2) contains the correct EMU slide size", () => {
    const xml = generatePresentationXml(2);
    expect(xml).toContain('<p:sldSz cx="12192000" cy="6858000" type="custom"/>');
  });

  it("generatePresentationXml() does not contain pixel values", () => {
    const xml = generatePresentationXml(1);
    // Must not use 1920x1080 or similar pixel dimensions
    expect(xml).not.toContain('cx="1920"');
    expect(xml).not.toContain('cy="1080"');
  });

  it("generatePresentationXml() starts with the exact XML declaration", () => {
    const xml = generatePresentationXml(1);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Benchmark 2: Relationship ID Mapping
// ---------------------------------------------------------------------------
describe("Benchmark 2: Relationship ID Mapping", () => {
  it("slide master registers at id=2147483648 with r:id=rId1", () => {
    const xml = generatePresentationXml(1);
    expect(xml).toContain('<p:sldMasterId id="2147483648" r:id="rId1"/>');
  });

  it("3-slide presentation assigns rId3, rId4, rId5 to slides", () => {
    const xml = generatePresentationXml(3);
    expect(xml).toContain('r:id="rId3"');
    expect(xml).toContain('r:id="rId4"');
    expect(xml).toContain('r:id="rId5"');
  });

  it("slide IDs increment from 256 (255 + index)", () => {
    const xml = generatePresentationXml(3);
    expect(xml).toContain('id="256"'); // 255 + 1
    expect(xml).toContain('id="257"'); // 255 + 2
    expect(xml).toContain('id="258"'); // 255 + 3
  });

  it("single slide gets rId3", () => {
    const xml = generatePresentationXml(1);
    expect(xml).toContain('r:id="rId3"');
    expect(xml).not.toContain('r:id="rId4"');
  });
});

// ---------------------------------------------------------------------------
// Slide Shell Tests
// ---------------------------------------------------------------------------
describe("generateSlideShell()", () => {
  it("wraps innerSpTree in a valid p:sld structure", () => {
    const xml = generateSlideShell("");
    expect(xml).toContain("<p:sld");
    expect(xml).toContain("<p:cSld>");
    expect(xml).toContain("<p:spTree>");
    expect(xml).toContain("</p:sld>");
  });

  it("includes the nvGrpSpPr and grpSpPr boilerplate", () => {
    const xml = generateSlideShell("");
    expect(xml).toContain("<p:nvGrpSpPr>");
    expect(xml).toContain("<p:grpSpPr>");
    expect(xml).toContain('<a:off x="0" y="0"/>');
  });

  it("injects innerSpTree content into the spTree", () => {
    const inner = '<p:sp><p:nvSpPr/></p:sp>';
    const xml = generateSlideShell(inner);
    expect(xml).toContain(inner);
  });

  it("includes masterClrMapping override", () => {
    const xml = generateSlideShell("");
    expect(xml).toContain("<p:clrMapOvr>");
    expect(xml).toContain("<a:masterClrMapping/>");
  });

  it("starts with the exact XML declaration", () => {
    const xml = generateSlideShell("");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Slide Layout Tests
// ---------------------------------------------------------------------------
describe("generateSlideLayout()", () => {
  it("generates a blank layout with type=blank", () => {
    const xml = generateSlideLayout();
    expect(xml).toContain('type="blank"');
    expect(xml).toContain("<p:sldLayout");
    expect(xml).toContain("</p:sldLayout>");
  });

  it("starts with the exact XML declaration", () => {
    const xml = generateSlideLayout();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Slide Master Tests
// ---------------------------------------------------------------------------
describe("generateSlideMaster()", () => {
  it("generates a valid slide master structure", () => {
    const xml = generateSlideMaster();
    expect(xml).toContain("<p:sldMaster");
    expect(xml).toContain("</p:sldMaster>");
  });

  it("references slideLayout1 in sldLayoutIdLst", () => {
    const xml = generateSlideMaster();
    expect(xml).toContain('<p:sldLayoutId');
    expect(xml).toContain('r:id="rId1"');
  });

  it("includes a clrMap element", () => {
    const xml = generateSlideMaster();
    expect(xml).toContain('<p:clrMap');
  });

  it("starts with the exact XML declaration", () => {
    const xml = generateSlideMaster();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Relationship Tests
// ---------------------------------------------------------------------------
describe("generateSlideRels()", () => {
  it("links to slideLayout1.xml", () => {
    const xml = generateSlideRels();
    expect(xml).toContain('Target="../slideLayouts/slideLayout1.xml"');
    expect(xml).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"');
  });
});

describe("generateSlideMasterRels()", () => {
  it("links to slideLayout1.xml and theme1.xml", () => {
    const xml = generateSlideMasterRels();
    expect(xml).toContain('Target="../slideLayouts/slideLayout1.xml"');
    expect(xml).toContain('Target="../theme/theme1.xml"');
  });
});

describe("generateSlideLayoutRels()", () => {
  it("links back to slideMaster1.xml", () => {
    const xml = generateSlideLayoutRels();
    expect(xml).toContain('Target="../slideMasters/slideMaster1.xml"');
  });
});

// ---------------------------------------------------------------------------
// Benchmark 3: Structural Integrity (Phase 4a + 4b combined)
// ---------------------------------------------------------------------------
describe("Benchmark 3: Structural Integrity", () => {
  it("assemblePresentation() produces a ZIP with all required PPTX parts", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1);
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);

    expect(files).toContain("[Content_Types].xml");
    expect(files).toContain("_rels/.rels");
    expect(files).toContain("ppt/presentation.xml");
    expect(files).toContain("ppt/_rels/presentation.xml.rels");
    expect(files).toContain("ppt/slideMasters/slideMaster1.xml");
    expect(files).toContain("ppt/slideMasters/_rels/slideMaster1.xml.rels");
    expect(files).toContain("ppt/slideLayouts/slideLayout1.xml");
    expect(files).toContain("ppt/slideLayouts/_rels/slideLayout1.xml.rels");
    expect(files).toContain("ppt/theme/theme1.xml");
    expect(files).toContain("ppt/slides/slide1.xml");
    expect(files).toContain("ppt/slides/_rels/slide1.xml.rels");
  });

  it("assemblePresentation(3) creates 3 slides and their rels", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(3);
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);

    expect(files).toContain("ppt/slides/slide1.xml");
    expect(files).toContain("ppt/slides/slide2.xml");
    expect(files).toContain("ppt/slides/slide3.xml");
    expect(files).toContain("ppt/slides/_rels/slide1.xml.rels");
    expect(files).toContain("ppt/slides/_rels/slide2.xml.rels");
    expect(files).toContain("ppt/slides/_rels/slide3.xml.rels");
  });

  it("assembled presentation.xml has correct EMU canvas dimensions", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1);
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const presFile = zip.file("ppt/presentation.xml");
    expect(presFile).not.toBeNull();

    const content = await presFile!.async("string");
    expect(content).toContain('<p:sldSz cx="12192000" cy="6858000" type="custom"/>');
  });

  it("assembled content types references all parts correctly", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(2);
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const ctFile = zip.file("[Content_Types].xml");
    const content = await ctFile!.async("string");

    expect(content).toContain('PartName="/ppt/presentation.xml"');
    expect(content).toContain('PartName="/ppt/slideMasters/slideMaster1.xml"');
    expect(content).toContain('PartName="/ppt/slideLayouts/slideLayout1.xml"');
    expect(content).toContain('PartName="/ppt/theme/theme1.xml"');
    expect(content).toContain('PartName="/ppt/slides/slide1.xml"');
    expect(content).toContain('PartName="/ppt/slides/slide2.xml"');
  });

  it("assembled archive produces valid ZIP magic bytes", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1);
    const buffer = await archive.generateBuffer();

    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it("assembled slides accept injected innerSpTree content", async () => {
    const shapeXml = '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Box"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr></p:sp>';
    const archive = new PptxArchive();
    archive.assemblePresentation(1, { slideContents: [shapeXml] });
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const slide = zip.file("ppt/slides/slide1.xml");
    const content = await slide!.async("string");
    expect(content).toContain(shapeXml);
  });
});

// ---------------------------------------------------------------------------
// rId Round-Trip Tests — ensure presentation.xml and presentation.xml.rels agree
// ---------------------------------------------------------------------------
describe("rId round-trip: presentation.xml ↔ presentation.xml.rels", () => {
  /**
   * Extract all Relationship/@Id values from a rels XML string.
   * Returns a Set of rId strings (e.g. "rId3", "rId7").
   */
  function extractRIds(relsXml: string): Set<string> {
    const matches = relsXml.matchAll(/Id="(rId[^"]+)"/g);
    return new Set([...matches].map(m => m[1]));
  }

  /**
   * Extract all r:id values referenced in presentation.xml sldIdLst.
   */
  function extractSlideRIds(presXml: string): string[] {
    const matches = presXml.matchAll(/<p:sldId[^>]+r:id="([^"]+)"/g);
    return [...matches].map(m => m[1]);
  }

  /**
   * Extract the notesMaster r:id from presentation.xml.
   */
  function extractNotesMasterRId(presXml: string): string | null {
    const m = presXml.match(/<p:notesMasterId[^>]+r:id="([^"]+)"/);
    return m ? m[1] : null;
  }

  it("single-master (5 slides): every sldId r:id in presentation.xml exists in rels", () => {
    const slideCount = 5;
    const presXml = generatePresentationXml(slideCount);
    const relsXml = generatePresentationRels(slideCount);

    const rIdSet = extractRIds(relsXml);
    const slideRIds = extractSlideRIds(presXml);

    expect(slideRIds).toHaveLength(slideCount);
    for (const rId of slideRIds) {
      expect(rIdSet, `${rId} from presentation.xml not found in rels`).toContain(rId);
    }
  });

  it("single-master (5 slides): slide rIds match computePresSlideRId(1, i)", () => {
    const slideCount = 5;
    const presXml = generatePresentationXml(slideCount);
    const slideRIds = extractSlideRIds(presXml);

    for (let i = 1; i <= slideCount; i++) {
      expect(slideRIds[i - 1]).toBe(`rId${computePresSlideRId(1, i)}`);
    }
  });

  it("single-master with notes: notesMaster rId in presentation.xml matches rels", () => {
    const slideCount = 4;
    const notesMasterRId = `rId${computePresNotesMasterRId(1, slideCount)}`;
    const presXml = generatePresentationXml(slideCount, undefined, { hasNotes: true, notesMasterRId });
    const relsXml = generatePresentationRels(slideCount, true);

    const rIdSet = extractRIds(relsXml);
    const presNotesMasterRId = extractNotesMasterRId(presXml);

    expect(presNotesMasterRId).not.toBeNull();
    expect(rIdSet, `notesMaster rId "${presNotesMasterRId}" missing from rels`).toContain(presNotesMasterRId!);
    expect(presNotesMasterRId).toBe(notesMasterRId);
  });

  it("single-master with notes emits notesMasterIdLst before sldIdLst", () => {
    const xml = generatePresentationXml(2, undefined, {
      hasNotes: true,
      notesMasterRId: "rId7",
    });

    expect(xml.indexOf("p:notesMasterIdLst")).toBeGreaterThan(-1);
    expect(xml.indexOf("p:sldMasterIdLst")).toBeLessThan(xml.indexOf("p:notesMasterIdLst"));
    expect(xml.indexOf("p:notesMasterIdLst")).toBeLessThan(xml.indexOf("p:sldIdLst"));
  });

  it("assembled PPTX (single-master, 3 slides, notes): presentation.xml and rels are consistent", async () => {
    const archive = new PptxArchive();
    const notes = ["Slide 1 notes", "Slide 2 notes", "Slide 3 notes"];
    archive.assemblePresentation(3, { slideNotes: notes });
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const presXml = await zip.file("ppt/presentation.xml")!.async("string");
    const relsXml = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string");

    const rIdSet = extractRIds(relsXml);
    const slideRIds = extractSlideRIds(presXml);
    const notesMasterRId = extractNotesMasterRId(presXml);

    // All slide rIds in XML must be in rels
    for (const rId of slideRIds) {
      expect(rIdSet).toContain(rId);
    }

    // notesMaster rId must be in rels
    expect(notesMasterRId).not.toBeNull();
    expect(rIdSet).toContain(notesMasterRId!);
  });

  it("assembled PPTX (multi-master, 4 slides, notes): presentation.xml and rels are consistent", async () => {
    const archive = new PptxArchive();
    const mastersConfig = [
      { name: "Dark", background: undefined, layouts: [{ name: "Blank" }, { name: "Title Slide" }] },
      { name: "Light", background: undefined, layouts: [{ name: "Blank" }, { name: "Title Slide" }] },
    ];
    const notes = ["Note 1", undefined, "Note 3", undefined];
    archive.assemblePresentation(4, {
      mastersConfig,
      slideMasterNames: ["Dark", "Light", "Dark", "Light"],
      slideNotes: notes,
    });
    const buffer = await archive.generateBuffer();

    const zip = await JSZip.loadAsync(buffer);
    const presXml = await zip.file("ppt/presentation.xml")!.async("string");
    const relsXml = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string");

    const rIdSet = extractRIds(relsXml);
    const slideRIds = extractSlideRIds(presXml);
    const notesMasterRId = extractNotesMasterRId(presXml);

    expect(slideRIds).toHaveLength(4);
    for (const rId of slideRIds) {
      expect(rIdSet).toContain(rId);
    }

    expect(notesMasterRId).not.toBeNull();
    expect(rIdSet).toContain(notesMasterRId!);
  });
});
