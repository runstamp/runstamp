import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseThemeXml } from "../src/template/themeResolver.js";
import { parseTemplate } from "../src/template/parser.js";
import { assembleFromTemplate } from "../src/template/mutator.js";
import type { MutatorOptions } from "../src/template/mutator.js";
import { setDeterministicMode } from "../src/deterministicMode.js";

describe("parseThemeXml — structured XML parsing", () => {
  it("extracts srgbClr color tokens", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test">
  <a:themeElements>
    <a:clrScheme name="Custom">
      <a:dk1><a:srgbClr val="0F2540"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
    </a:clrScheme>
    <a:fontScheme name="Custom">
      <a:majorFont><a:latin typeface="Helvetica"/></a:majorFont>
      <a:minorFont><a:latin typeface="Georgia"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;
    const result = parseThemeXml(xml);
    expect(result.colorScheme.dk1).toBe("0F2540");
    expect(result.colorScheme.lt1).toBe("FFFFFF");
    expect(result.colorScheme.accent1).toBe("4472C4");
    expect(result.colorScheme.accent2).toBe("ED7D31");
    expect(result.fontScheme.majorLatin).toBe("Helvetica");
    expect(result.fontScheme.minorLatin).toBe("Georgia");
  });

  it("extracts sysClr lastClr fallback", () => {
    const xml = `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;
    const result = parseThemeXml(xml);
    expect(result.colorScheme.dk1).toBe("000000");
    expect(result.colorScheme.lt1).toBe("FFFFFF");
  });

  it("uses defaults when font scheme is missing", () => {
    const xml = `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements>
    <a:clrScheme name="Minimal"/>
    <a:fontScheme name="Minimal"/>
  </a:themeElements>
</a:theme>`;
    const result = parseThemeXml(xml);
    expect(result.fontScheme.majorLatin).toBe("Calibri Light");
    expect(result.fontScheme.minorLatin).toBe("Calibri");
  });

  it("handles all 14 scheme color tokens", () => {
    const tokens = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
    const entries = tokens.map(t => `<a:${t}><a:srgbClr val="AABB${t.length.toString().padStart(2, "0")}"/></a:${t}>`).join("");
    const xml = `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:themeElements>
        <a:clrScheme name="Full">${entries}</a:clrScheme>
        <a:fontScheme name="Full"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>
      </a:themeElements>
    </a:theme>`;
    const result = parseThemeXml(xml);
    expect(Object.keys(result.colorScheme).length).toBeGreaterThanOrEqual(tokens.length);
  });
});

// ---------------------------------------------------------------------------
// Multi-master template parsing
// ---------------------------------------------------------------------------

/** Helper: build a minimal theme XML with specific accent1 color and heading font. */
function buildThemeXml(accent1: string, majorFont: string, minorFont: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Theme">
  <a:themeElements>
    <a:clrScheme name="Scheme">
      <a:dk1><a:srgbClr val="000000"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:accent1><a:srgbClr val="${accent1}"/></a:accent1>
    </a:clrScheme>
    <a:fontScheme name="Fonts">
      <a:majorFont><a:latin typeface="${majorFont}"/></a:majorFont>
      <a:minorFont><a:latin typeface="${minorFont}"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;
}

/** Helper: build a minimal slide master XML with a title style font size. */
function buildMasterXml(titleFontSize: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree/></p:cSld>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr><a:defRPr sz="${titleFontSize}"/></a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr>
    </p:bodyStyle>
  </p:txStyles>
</p:sldMaster>`;
}

/** Helper: build a rels XML from an array of {id, type, target}. */
function buildRelsXml(rels: Array<{ id: string; type: string; target: string }>): string {
  const inner = rels.map(
    r => `  <Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${r.type}" Target="${r.target}"/>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${inner}
</Relationships>`;
}

/** Helper: build a minimal slide layout XML with a given name. */
function buildLayoutXml(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld name="${name}"><p:spTree/></p:cSld>
</p:sldLayout>`;
}

/**
 * Builds a synthetic multi-master PPTX template with:
 *   - 2 themes (theme1 with accent1=FF0000/Helvetica, theme2 with accent1=0000FF/Georgia)
 *   - 2 slide masters (master1 → theme1, master2 → theme2)
 *   - 3 layouts: layout1+2 under master1, layout3 under master2
 */
async function buildMultiMasterTemplate(): Promise<Buffer> {
  const zip = new JSZip();

  // Content types
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`);

  // Global rels
  zip.file("_rels/.rels", buildRelsXml([
    { id: "rId1", type: "officeDocument", target: "ppt/presentation.xml" },
  ]));

  // Presentation XML (two masters referenced)
  zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
    <p:sldMasterId id="2147483649" r:id="rId2"/>
  </p:sldMasterIdLst>
  <p:sldIdLst/>
  <p:sldSz cx="9144000" cy="5143500"/>
</p:presentation>`);

  // Presentation rels (masters + themes)
  zip.file("ppt/_rels/presentation.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideMaster", target: "slideMasters/slideMaster1.xml" },
    { id: "rId2", type: "slideMaster", target: "slideMasters/slideMaster2.xml" },
    { id: "rId3", type: "theme", target: "theme/theme1.xml" },
    { id: "rId4", type: "theme", target: "theme/theme2.xml" },
  ]));

  // Theme 1: red accent, Helvetica
  zip.file("ppt/theme/theme1.xml", buildThemeXml("FF0000", "Helvetica", "Arial"));
  // Theme 2: blue accent, Georgia
  zip.file("ppt/theme/theme2.xml", buildThemeXml("0000FF", "Georgia", "Times New Roman"));

  // Master 1: title font 4400, owns layouts 1+2, uses theme1
  zip.file("ppt/slideMasters/slideMaster1.xml", buildMasterXml(4400));
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideLayout", target: "../slideLayouts/slideLayout1.xml" },
    { id: "rId2", type: "slideLayout", target: "../slideLayouts/slideLayout2.xml" },
    { id: "rId3", type: "theme", target: "../theme/theme1.xml" },
  ]));

  // Master 2: title font 3200, owns layout 3, uses theme2
  zip.file("ppt/slideMasters/slideMaster2.xml", buildMasterXml(3200));
  zip.file("ppt/slideMasters/_rels/slideMaster2.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideLayout", target: "../slideLayouts/slideLayout3.xml" },
    { id: "rId2", type: "theme", target: "../theme/theme2.xml" },
  ]));

  // Layouts
  zip.file("ppt/slideLayouts/slideLayout1.xml", buildLayoutXml("Title Slide"));
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideMaster", target: "../slideMasters/slideMaster1.xml" },
  ]));
  zip.file("ppt/slideLayouts/slideLayout2.xml", buildLayoutXml("Content Slide"));
  zip.file("ppt/slideLayouts/_rels/slideLayout2.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideMaster", target: "../slideMasters/slideMaster1.xml" },
  ]));
  zip.file("ppt/slideLayouts/slideLayout3.xml", buildLayoutXml("Alternate Layout"));
  zip.file("ppt/slideLayouts/_rels/slideLayout3.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideMaster", target: "../slideMasters/slideMaster2.xml" },
  ]));

  return await zip.generateAsync({ type: "nodebuffer" });
}

describe("parseTemplate — multi-master support", () => {
  it("enumerates all slide masters", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);
    expect(idx.slideMasters).toHaveLength(2);
  });

  it("enumerates all themes", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);
    expect(idx.themes).toHaveLength(2);
    expect(idx.themes[0].data.colorScheme.accent1).toBe("FF0000");
    expect(idx.themes[1].data.colorScheme.accent1).toBe("0000FF");
  });

  it("associates each master with its theme", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);
    // Master 1 → theme index 0 (theme1, red)
    expect(idx.slideMasters[0].themeIndex).toBe(0);
    // Master 2 → theme index 1 (theme2, blue)
    expect(idx.slideMasters[1].themeIndex).toBe(1);
  });

  it("parses per-master text styles", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);
    // Master 1 title font size = 4400
    expect(idx.slideMasters[0].textStyles.titleStyle?.fontSize).toBe(4400);
    // Master 2 title font size = 3200
    expect(idx.slideMasters[1].textStyles.titleStyle?.fontSize).toBe(3200);
  });

  it("associates layouts with their parent master", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);
    expect(idx.layouts).toHaveLength(3);

    // Layouts 1+2 belong to master 0
    const layout1 = idx.layouts.find(l => l.name === "Title Slide")!;
    const layout2 = idx.layouts.find(l => l.name === "Content Slide")!;
    expect(layout1.masterIndex).toBe(0);
    expect(layout2.masterIndex).toBe(0);

    // Layout 3 belongs to master 1
    const layout3 = idx.layouts.find(l => l.name === "Alternate Layout")!;
    expect(layout3.masterIndex).toBe(1);
  });

  it("backward-compat singular fields point to first master/theme", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);

    // .theme and .themeXml should be the first theme (red accent)
    expect(idx.theme.colorScheme.accent1).toBe("FF0000");
    expect(idx.theme.fontScheme.majorLatin).toBe("Helvetica");

    // .masterTextStyles should be from first master (4400 title size)
    expect(idx.masterTextStyles.titleStyle?.fontSize).toBe(4400);

    // .slideMasterXml should be parseable
    expect(idx.slideMasterXml).toContain("p:sldMaster");
  });

  it("resolves themes for layouts through multi-master chain", async () => {
    const buffer = await buildMultiMasterTemplate();
    const idx = await parseTemplate(buffer);

    // Layout "Alternate Layout" → masterIndex 1 → themeIndex 1 → blue accent, Georgia
    const altLayout = idx.layouts.find(l => l.name === "Alternate Layout")!;
    const master = idx.slideMasters[altLayout.masterIndex];
    const theme = idx.themes[master.themeIndex];
    expect(theme.data.colorScheme.accent1).toBe("0000FF");
    expect(theme.data.fontScheme.majorLatin).toBe("Georgia");

    // Layout "Title Slide" → masterIndex 0 → themeIndex 0 → red accent, Helvetica
    const titleLayout = idx.layouts.find(l => l.name === "Title Slide")!;
    const master0 = idx.slideMasters[titleLayout.masterIndex];
    const theme0 = idx.themes[master0.themeIndex];
    expect(theme0.data.colorScheme.accent1).toBe("FF0000");
    expect(theme0.data.fontScheme.majorLatin).toBe("Helvetica");
  });
});

// ---------------------------------------------------------------------------
// assembleFromTemplate — DOM-based XML mutation tests
// ---------------------------------------------------------------------------

/** Build a minimal single-master template for mutator tests. */
async function buildMutatorTemplate(extraPresRels?: Array<{ id: string; type: string; target: string }>): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`);

  zip.file("_rels/.rels", buildRelsXml([
    { id: "rId1", type: "officeDocument", target: "ppt/presentation.xml" },
  ]));

  const presRels = [
    { id: "rId1", type: "slideMaster", target: "slideMasters/slideMaster1.xml" },
    { id: "rId2", type: "slide", target: "slides/slide1.xml" },
    { id: "rId3", type: "theme", target: "theme/theme1.xml" },
    ...(extraPresRels ?? []),
  ];
  zip.file("ppt/_rels/presentation.xml.rels", buildRelsXml(presRels));

  zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="5143500"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

  zip.file("ppt/theme/theme1.xml", buildThemeXml("4472C4", "Calibri Light", "Calibri"));
  zip.file("ppt/slideMasters/slideMaster1.xml", buildMasterXml(4400));
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideLayout", target: "../slideLayouts/slideLayout1.xml" },
    { id: "rId2", type: "theme", target: "../theme/theme1.xml" },
  ]));
  zip.file("ppt/slideLayouts/slideLayout1.xml", buildLayoutXml("Title Slide"));
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildRelsXml([
    { id: "rId1", type: "slideMaster", target: "../slideMasters/slideMaster1.xml" },
  ]));

  // Dummy slide (will be replaced by mutator)
  zip.file("ppt/slides/slide1.xml", `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sld>`);

  return await zip.generateAsync({ type: "nodebuffer" });
}

/** Parse a template buffer and build default MutatorOptions for N slides. */
async function prepareMutator(templateBuf: Buffer, slideCount: number): Promise<{ idx: Awaited<ReturnType<typeof parseTemplate>>; opts: MutatorOptions }> {
  const idx = await parseTemplate(templateBuf);
  const opts: MutatorOptions = {
    slideCount,
    slideContents: Array.from({ length: slideCount }, () => "<p:sp/>"),
    slideMediaManifests: Array.from({ length: slideCount }, () => ({
      assets: [],
      fillAssets: [],
      svgAssets: [],
      videoAssets: [],
      audioAssets: [],
    })),
  };
  return { idx, opts };
}

/** Unzip a buffer and read a text file from it. */
async function readZipFile(buf: Buffer, path: string): Promise<string> {
  const z = await JSZip.loadAsync(buf);
  const f = z.file(path);
  if (!f) throw new Error(`Missing file in ZIP: ${path}`);
  return await f.async("text");
}

describe("assembleFromTemplate — DOM-based XML mutation", () => {
  it("generates correct content types for 3 slides", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 3);
      const result = await assembleFromTemplate(idx, opts);
      const ct = await readZipFile(result, "[Content_Types].xml");

      // Old slide override removed and re-added for all 3 slides
      expect(ct).toContain("/ppt/slides/slide1.xml");
      expect(ct).toContain("/ppt/slides/slide2.xml");
      expect(ct).toContain("/ppt/slides/slide3.xml");
      // But no slide4
      expect(ct).not.toContain("/ppt/slides/slide4.xml");
      // Template non-slide overrides should be preserved
      expect(ct).toContain("presentation.xml");
      expect(ct).toContain("slideMaster1.xml");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("generates correct presentation.xml sldIdLst", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 2);
      const result = await assembleFromTemplate(idx, opts);
      const presXml = await readZipFile(result, "ppt/presentation.xml");

      // Should have 2 slide IDs (256, 257)
      expect(presXml).toContain('id="256"');
      expect(presXml).toContain('id="257"');
      // Should NOT have the old rId2 slide ref
      expect(presXml).not.toContain('r:id="rId2"');
      // Should have new rIds starting from slideRIdBase
      // The template has rId1, rId2, rId3 → max=3 → base=101
      expect(presXml).toContain('r:id="rId101"');
      expect(presXml).toContain('r:id="rId102"');
    } finally {
      setDeterministicMode(false);
    }
  });

  it("generates correct presentation.xml.rels", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 2);
      const result = await assembleFromTemplate(idx, opts);
      const rels = await readZipFile(result, "ppt/_rels/presentation.xml.rels");

      // Old slide rel (rId2 → slides/slide1.xml) should be removed
      // New slide rels should be added
      expect(rels).toContain("slides/slide1.xml");
      expect(rels).toContain("slides/slide2.xml");
      // Non-slide rels preserved
      expect(rels).toContain("slideMaster");
      expect(rels).toContain("theme");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("handles high rId templates without collision", async () => {
    setDeterministicMode(true);
    try {
      // Build template with rId200 existing
      const tplBuf = await buildMutatorTemplate([
        { id: "rId200", type: "tags", target: "tags/tag1.xml" },
      ]);
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      const result = await assembleFromTemplate(idx, opts);
      const presXml = await readZipFile(result, "ppt/presentation.xml");
      const rels = await readZipFile(result, "ppt/_rels/presentation.xml.rels");

      // Slide rId should be ≥201 to avoid collision with rId200
      expect(presXml).toContain('r:id="rId201"');
      expect(rels).toContain('Id="rId201"');
      // The rId200 tag rel should still be present
      expect(rels).toContain("rId200");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("adds notes slide overrides and rels", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 2);
      opts.slideNotes = ["Speaker notes for slide 1", undefined];
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      expect(ct).toContain("notesSlide1.xml");
      expect(ct).not.toContain("notesSlide2.xml"); // slide 2 has no notes
      expect(ct).toContain("notesMaster1.xml");

      const rels = await readZipFile(result, "ppt/_rels/presentation.xml.rels");
      expect(rels).toContain("notesMaster");

      const notesSlideXml = await readZipFile(result, "ppt/notesSlides/notesSlide1.xml");
      expect(notesSlideXml).toContain("Slide Image Placeholder 1");
      expect(notesSlideXml).toContain("Slide Number Placeholder 3");
      expect(notesSlideXml).toContain("creationId");

      const notesSlideRels = await readZipFile(result, "ppt/notesSlides/_rels/notesSlide1.xml.rels");
      expect(notesSlideRels).toContain('Id="rId1"');
      expect(notesSlideRels).toContain('Target="../notesMasters/notesMaster1.xml"');
      expect(notesSlideRels).toContain('Id="rId2"');
      expect(notesSlideRels).toContain('Target="../slides/slide1.xml"');

      const notesMasterRels = await readZipFile(result, "ppt/notesMasters/_rels/notesMaster1.xml.rels");
      expect(notesMasterRels).toContain("../theme/theme2.xml");
      expect(ct).toContain("/ppt/theme/theme2.xml");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("adds comment overrides and rels", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      opts.commentSlideInfos = [{ slideIndex: 0, commentFileIndex: 1 }];
      opts.commentAuthorsXml = `<p:cmAuthorLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cmAuthor id="0" name="Test"/></p:cmAuthorLst>`;
      opts.commentFilesMap = new Map([
        ["ppt/comments/comment1.xml", `<p:cmLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cm authorId="0"><p:text>Hello</p:text></p:cm></p:cmLst>`],
      ]);
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      expect(ct).toContain("comment1.xml");
      expect(ct).toContain("commentAuthors.xml");

      const rels = await readZipFile(result, "ppt/_rels/presentation.xml.rels");
      expect(rels).toContain("commentAuthors");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("adds chart overrides with xlsx default", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      opts.slideChartManifests = [{
        charts: [{
          chartIndex: 1,
          rId: "rId10",
          chartXml: "<c:chartSpace/>",
          chartRelsXml: "<Relationships/>",
          excelBuffer: Buffer.from("fake-xlsx"),
          isChartEx: false,
        }],
      }];
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      expect(ct).toContain("chart1.xml");
      expect(ct).toContain('Extension="xlsx"');
    } finally {
      setDeterministicMode(false);
    }
  });

  it("adds SVG default extension when SVG assets present", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      opts.slideMediaManifests = [{
        assets: [],
        fillAssets: [],
        svgAssets: [{ svgRId: "rIdSvg1", svgMediaPath: "ppt/media/image1.svg", svgBuffer: Buffer.from("<svg/>"), svgRelativePath: "../media/image1.svg" }],
        videoAssets: [],
        audioAssets: [],
      }];
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      expect(ct).toContain('Extension="svg"');
    } finally {
      setDeterministicMode(false);
    }
  });

  it("adds font data default and injects embeddedFontLst", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      opts.fontDataFiles = [{ path: "ppt/fonts/font1.fntdata", buffer: Buffer.from("fake-font") }];
      opts.embeddedFontListXml = `<p:embeddedFontLst><p:embeddedFont><p:font typeface="TestFont"/><p:regular r:id="rIdFont1"/></p:embeddedFont></p:embeddedFontLst>`;
      opts.extraPresentationRels = [{ rId: "rIdFont1", type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font", target: "fonts/font1.fntdata" }];
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      expect(ct).toContain('Extension="fntdata"');

      const presXml = await readZipFile(result, "ppt/presentation.xml");
      expect(presXml).toContain("embeddedFontLst");
      expect(presXml).toContain("TestFont");

      // Verify font data rels are added to presentation rels
      const rels = await readZipFile(result, "ppt/_rels/presentation.xml.rels");
      expect(rels).toContain("rIdFont1");
      expect(rels).toContain("font1.fntdata");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("normalizes out-of-order notes master elements from the template", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate([
        { id: "rId4", type: "notesMaster", target: "notesMasters/notesMaster1.xml" },
      ]);
      const zip = await JSZip.loadAsync(tplBuf);
      zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:notesMasterIdLst>
    <p:notesMasterId r:id="rId4"/>
  </p:notesMasterIdLst>
  <p:sldSz cx="9144000" cy="5143500"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);
      zip.file("ppt/notesMasters/notesMaster1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:notesMaster>`);
      zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels", buildRelsXml([
        { id: "rId1", type: "theme", target: "../theme/theme1.xml" },
      ]));

      const result = await assembleFromTemplate(
        await parseTemplate(await zip.generateAsync({ type: "nodebuffer" })),
        (await prepareMutator(await zip.generateAsync({ type: "nodebuffer" }), 1)).opts,
      );
      const presXml = await readZipFile(result, "ppt/presentation.xml");

      expect(presXml.indexOf("p:notesMasterIdLst")).toBeGreaterThan(-1);
      expect(presXml.indexOf("p:sldMasterIdLst")).toBeLessThan(presXml.indexOf("p:notesMasterIdLst"));
      expect(presXml.indexOf("p:notesMasterIdLst")).toBeLessThan(presXml.indexOf("p:sldIdLst"));
      expect(presXml.indexOf("p:sldIdLst")).toBeLessThan(presXml.indexOf("p:sldSz"));
    } finally {
      setDeterministicMode(false);
    }
  });

  it("injects notesMasterIdLst when notes are added to a notes-free template", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      opts.slideNotes = ["Template note"];

      const result = await assembleFromTemplate(idx, opts);
      const presXml = await readZipFile(result, "ppt/presentation.xml");
      const relsXml = await readZipFile(result, "ppt/_rels/presentation.xml.rels");

      expect(presXml).toContain("p:notesMasterIdLst");
      expect(presXml.indexOf("p:notesMasterIdLst")).toBeLessThan(presXml.indexOf("p:sldIdLst"));
      expect(relsXml).toContain("relationships/notesMaster");
      expect(relsXml).toContain('Id="rIdNotesMaster"');
    } finally {
      setDeterministicMode(false);
    }
  });

  it("preserves XML declaration in output", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 1);
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      const presXml = await readZipFile(result, "ppt/presentation.xml");
      const rels = await readZipFile(result, "ppt/_rels/presentation.xml.rels");

      expect(ct).toContain("<?xml");
      expect(presXml).toContain("<?xml");
      expect(rels).toContain("<?xml");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("removes old slide overrides from template content types", async () => {
    setDeterministicMode(true);
    try {
      const tplBuf = await buildMutatorTemplate();
      const { idx, opts } = await prepareMutator(tplBuf, 0);
      opts.slideCount = 0;
      opts.slideContents = [];
      opts.slideMediaManifests = [];
      const result = await assembleFromTemplate(idx, opts);

      const ct = await readZipFile(result, "[Content_Types].xml");
      // With 0 slides, there should be no slide overrides at all
      expect(ct).not.toMatch(/\/ppt\/slides\/slide\d+\.xml/);
      // But non-slide overrides preserved
      expect(ct).toContain("presentation.xml");
    } finally {
      setDeterministicMode(false);
    }
  });
});
