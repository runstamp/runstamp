/**
 * SOTA Benchmarks 7 — Phase 6 Feature Validation
 *
 * 50+ tests across 8 categories:
 *   A: Hyperlinks — tooltips, mailto, internal slide links, navigation actions, mixed
 *   B: Rich Notes — multi-paragraph, bullets, mixed formatting, backward compat
 *   C: Custom Properties — types, escaping, sequential pids, content types, rels
 *   D: Handout Master — ZIP presence, rels, presentation ref, content type
 *   E: Table Auto-Sizing — auto-fit, distribute, merged cells, manual override
 *   F: Animation — repeat, infinite loop, text build, parallel/sequence groups, mixed triggers
 *   G: Diagrams — process flow, hierarchy, cycle, matrix, pyramid, list, full render
 *   H: Print Settings — printSettings element, grayscale, frameSlides
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode } from "../src/types/ast.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL, getText,
} from "./helpers/xmlTestUtils.js";
import { generateDiagram } from "../src/diagrams/index.js";

// =========================================================================
// Helper: minimal 1-slide doc
// =========================================================================
function makeDoc(children: PaperNode[], slideOverrides?: Partial<PaperSlide>, docOverrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children,
      ...slideOverrides,
    } as PaperSlide],
    ...docOverrides,
  } as PaperDocument;
}

function makeMultiSlideDoc(slides: PaperSlide[], docOverrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides,
    ...docOverrides,
  } as PaperDocument;
}

// =========================================================================
// CATEGORY A: HYPERLINKS (10 tests)
// =========================================================================

describe("A: Hyperlinks", () => {
  it("A1: External URL with tooltip → tooltip attr on <a:hlinkClick>", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 14 },
      content: [{
        text: "Visit site",
        hyperlink: { url: "https://example.com", tooltip: "Go to Example" },
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);
    const hlink = hlinks[0];
    expect(getAttr(hlink, "tooltip")).toBe("Go to Example");
    expect(getAttr(hlink, "r:id")).toBeTruthy();
  });

  it("A2: Mailto link → rel target starts with mailto:", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 14 },
      content: [{
        text: "Email us",
        hyperlink: { mailto: "hello@example.com" },
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hyperlinkRel = rels.find(r =>
      getAttr(r, "Type")?.includes("hyperlink"),
    );
    expect(hyperlinkRel).toBeDefined();
    expect(getAttr(hyperlinkRel!, "Target")).toMatch(/^mailto:hello@example\.com$/);
    expect(getAttr(hyperlinkRel!, "TargetMode")).toBe("External");
  });

  it("A3: Internal slide link → action=ppaction://hlinksldjump, rel target is slide{N}.xml, NO TargetMode", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 300, height: 50, fontSize: 14 },
          content: [{
            text: "Go to slide 2",
            hyperlink: { slide: 2 },
          }],
        }],
      },
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 100, height: 100, backgroundColor: "#FF0000" },
        }],
      },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    // Check slide XML for action attribute
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);
    const hlink = hlinks[0];
    expect(getAttr(hlink, "action")).toBe("ppaction://hlinksldjump");

    // Check rels: should have internal target with NO TargetMode
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hyperlinkRel = rels.find(r =>
      getAttr(r, "Type")?.includes("hyperlink"),
    );
    expect(hyperlinkRel).toBeDefined();
    expect(getAttr(hyperlinkRel!, "Target")).toBe("slide2.xml");
    // Internal links should NOT have TargetMode="External"
    expect(getAttr(hyperlinkRel!, "TargetMode")).toBeUndefined();
  });

  it("A4: Navigation action (nextSlide) → action=ppaction://hlinkshowjump, empty r:id", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 50, fontSize: 14 },
      content: [{
        text: "Next",
        hyperlink: { action: "nextSlide" },
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);
    const hlink = hlinks[0];
    expect(getAttr(hlink, "action")).toBe("ppaction://hlinkshowjump?jump=nextslide");
    expect(getAttr(hlink, "r:id")).toBe("");
  });

  it("A5: Mixed hyperlinks on single slide (external + internal + mailto) → rId uniqueness", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 600, height: 50, fontSize: 14 },
          content: [
            { text: "External", hyperlink: { url: "https://example.com" } },
            { text: " | " },
            { text: "Internal", hyperlink: { slide: 2 } },
            { text: " | " },
            { text: "Email", hyperlink: { mailto: "test@example.com" } },
          ],
        }],
      },
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } }],
      },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hyperlinkRels = rels.filter(r =>
      getAttr(r, "Type")?.includes("hyperlink"),
    );
    // Should have 3 hyperlink rels (external, internal, mailto)
    expect(hyperlinkRels.length).toBe(3);

    // All rIds must be unique
    const rIds = hyperlinkRels.map(r => getAttr(r, "Id"));
    const uniqueRIds = new Set(rIds);
    expect(uniqueRIds.size).toBe(3);

    // Verify targets
    const targets = hyperlinkRels.map(r => getAttr(r, "Target")!);
    expect(targets).toContain("https://example.com");
    expect(targets).toContain("slide2.xml");
    expect(targets).toContain("mailto:test@example.com");
  });

  it("A6: Shape click to specific slide → <a:hlinkClick> on <p:cNvPr> with action", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 200, height: 100, backgroundColor: "#4472C4" },
          hyperlink: { slide: 2, tooltip: "Jump to details" },
        }],
      },
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } }],
      },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);
    const hlink = hlinks[0];
    expect(getAttr(hlink, "action")).toBe("ppaction://hlinksldjump");
    expect(getAttr(hlink, "tooltip")).toBe("Jump to details");
  });

  it("A7: Image with tooltip hyperlink → tooltip on image <a:hlinkClick>", async () => {
    const doc = makeDoc([{
      type: "Image",
      style: { width: 200, height: 150 },
      src: RED_PIXEL,
      hyperlink: { url: "https://example.com/image", tooltip: "View full size" },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(hlinks[0], "tooltip")).toBe("View full size");

    // Verify rels
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const hypRel = rels.find(r => getAttr(r, "Type")?.includes("hyperlink"));
    expect(hypRel).toBeDefined();
    expect(getAttr(hypRel!, "Target")).toBe("https://example.com/image");
  });

  it("A8: Table cell with internal slide link → hyperlink in table text run", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 400, height: 100 },
          tableData: {
            columns: [200, 200],
            rows: [{
              cells: [
                { text: "Normal cell" },
                {
                  content: [{ text: "Linked cell", hyperlink: { slide: 2 } }],
                },
              ],
            }],
          },
        }],
      },
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } }],
      },
    ];
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const hlinks = findAllElements(tree, "a:hlinkClick");
    expect(hlinks.length).toBeGreaterThanOrEqual(1);
    // Should have internal slide action
    const internalLink = hlinks.find(h => getAttr(h, "action") === "ppaction://hlinksldjump");
    expect(internalLink).toBeDefined();
  });

  it("A9: Hyperlink with special chars in URL → XML escaping (&amp;)", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 400, height: 50, fontSize: 14 },
      content: [{
        text: "Search",
        hyperlink: { url: "https://example.com/search?q=test&lang=en&page=1" },
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    // The ampersands should be escaped in the XML
    expect(relsXml).toContain("&amp;");
    // The URL should be reconstructable
    expect(relsXml).toContain("q=test&amp;lang=en&amp;page=1");
  });

  it("A10: 20-slide deck with cross-linking → all internal links resolve", async () => {
    const slides: PaperSlide[] = [];
    for (let i = 0; i < 20; i++) {
      const targetSlide = (i + 1) % 20 + 1; // Link to next slide (wrapping)
      slides.push({
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 300, height: 50, fontSize: 14 },
          content: [{
            text: `Go to slide ${targetSlide}`,
            hyperlink: { slide: targetSlide },
          }],
        }],
      });
    }
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    // Verify all 20 slides exist
    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 20; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }

    // Spot-check a few rels
    for (const idx of [1, 5, 10, 15, 20]) {
      const relsXml = await getZipEntry(buffer, `ppt/slides/_rels/slide${idx}.xml.rels`);
      const relsTree = parseXml(relsXml);
      const rels = findAllElements(relsTree, "Relationship");
      const hypRel = rels.find(r => getAttr(r, "Type")?.includes("hyperlink"));
      expect(hypRel).toBeDefined();
      const target = getAttr(hypRel!, "Target")!;
      expect(target).toMatch(/^slide\d+\.xml$/);
    }
  });
});

// =========================================================================
// CATEGORY B: RICH NOTES (6 tests)
// =========================================================================

describe("B: Rich Notes", () => {
  it("B11: Multi-paragraph notes with bold/italic → <a:rPr b='1'/>, multiple <a:p>", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {
        notes: [
          { runs: [{ text: "Bold note", style: { fontWeight: "bold" } }] },
          { runs: [{ text: "Italic note", style: { fontStyle: "italic" } }] },
          { runs: [{ text: "Normal note" }] },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    const tree = parseXml(notesXml);

    // Multiple paragraphs
    const paragraphs = findAllElements(tree, "a:p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);

    // Bold run property
    expect(notesXml).toMatch(/b="1"/);
    // Italic run property
    expect(notesXml).toMatch(/i="1"/);
  });

  it("B12: Notes with bullets → <a:buChar> in notes", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {
        notes: [
          {
            runs: [{ text: "First bullet" }],
            bullet: { type: "char", char: "\u2022" },
          },
          {
            runs: [{ text: "Second bullet" }],
            bullet: { type: "char", char: "\u2022" },
          },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    expect(notesXml).toContain("a:buChar");
  });

  it("B13: Notes with mixed formatting → per-run properties", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {
        notes: [
          {
            runs: [
              { text: "Bold", style: { fontWeight: "bold" } },
              { text: " and ", style: {} },
              { text: "italic", style: { fontStyle: "italic" } },
            ],
          },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    const tree = parseXml(notesXml);

    // Should have multiple <a:r> elements in the notes
    const runs = findAllElements(tree, "a:r");
    expect(runs.length).toBeGreaterThanOrEqual(3);
  });

  it("B14: Backward compat: string notes → single <a:r> output", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      { notes: "Simple plain text note" },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    expect(notesXml).toContain("Simple plain text note");
    const tree = parseXml(notesXml);
    // Notes body placeholder
    const bodyPhs = findAllElements(tree, "a:bodyPr");
    expect(bodyPhs.length).toBeGreaterThanOrEqual(1);
  });

  it("B15: Notes with 5+ paragraphs different alignment → <a:pPr algn='...'/> per paragraph", async () => {
    const alignments = ["left", "center", "right", "left", "center"] as const;
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {
        notes: alignments.map((algn, i) => ({
          runs: [{ text: `Paragraph ${i + 1}` }],
          align: algn,
        })),
      },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    const tree = parseXml(notesXml);

    // Each paragraph should have alignment
    const pPrs = findAllElements(tree, "a:pPr");
    const algnValues = pPrs.map(p => getAttr(p, "algn")).filter(Boolean);
    expect(algnValues.length).toBeGreaterThanOrEqual(3); // at least the l/ctr/r
    expect(algnValues).toContain("ctr");
    expect(algnValues).toContain("r");
  });

  it("B16: Notes with superscript → baseline attribute", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {
        notes: [
          {
            runs: [
              { text: "E = mc" },
              { text: "2", style: { baseline: "superscript" } },
            ],
          },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    // Superscript emits baseline attribute
    expect(notesXml).toMatch(/baseline="30000"/);
  });
});

// =========================================================================
// CATEGORY C: CUSTOM PROPERTIES (5 tests)
// =========================================================================

describe("C: Custom Properties", () => {
  it("C17: String, number, boolean, date properties → correct vt: type elements", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      {
        customProperties: [
          { name: "Project", value: "Alpha" },
          { name: "Version", value: 42 },
          { name: "Released", value: true },
          { name: "ReleaseDate", value: new Date("2025-06-15T00:00:00Z") },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const customXml = await getZipEntry(buffer, "docProps/custom.xml");

    expect(customXml).toContain("vt:lpwstr");
    expect(customXml).toContain("Alpha");
    expect(customXml).toContain("vt:i4");
    expect(customXml).toContain("42");
    expect(customXml).toContain("vt:bool");
    expect(customXml).toContain("true");
    expect(customXml).toContain("vt:filetime");
  });

  it("C18: Special characters in property names/values → XML escaping", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      {
        customProperties: [
          { name: "Company & Division", value: "R&D <Team>" },
        ],
      },
    );
    const buffer = await PaperEngine.render(doc);
    const customXml = await getZipEntry(buffer, "docProps/custom.xml");
    // Names and values must be XML-escaped
    expect(customXml).toContain("Company &amp; Division");
    expect(customXml).toContain("R&amp;D &lt;Team&gt;");
  });

  it("C19: 20+ custom properties → sequential pid numbering from 2", async () => {
    const props = Array.from({ length: 25 }, (_, i) => ({
      name: `Prop${i + 1}`,
      value: `Value${i + 1}`,
    }));
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { customProperties: props },
    );
    const buffer = await PaperEngine.render(doc);
    const customXml = await getZipEntry(buffer, "docProps/custom.xml");
    const tree = parseXml(customXml);
    const properties = findAllElements(tree, "property");
    expect(properties.length).toBe(25);

    // PIDs should be 2, 3, 4, ..., 26
    const pids = properties.map(p => getAttr(p, "pid"));
    expect(pids[0]).toBe("2");
    expect(pids[24]).toBe("26");
  });

  it("C20: Custom properties content type in [Content_Types].xml", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { customProperties: [{ name: "Test", value: "Yes" }] },
    );
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain("docProps/custom.xml");
    expect(ctXml).toContain("custom-properties");
  });

  it("C21: Custom properties relationship in _rels/.rels", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { customProperties: [{ name: "Test", value: "Yes" }] },
    );
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "_rels/.rels");
    expect(relsXml).toContain("custom-properties");
    expect(relsXml).toContain("docProps/custom.xml");
  });
});

// =========================================================================
// CATEGORY D: HANDOUT MASTER (4 tests)
// =========================================================================

describe("D: Handout Master", () => {
  it("D22: Handout master exists in ZIP", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { handoutLayout: "4" },
    );
    const buffer = await PaperEngine.render(doc);
    const exists = await zipHasFile(buffer, "ppt/handoutMasters/handoutMaster1.xml");
    expect(exists).toBe(true);
  });

  it("D23: Handout master rels link to theme", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { handoutLayout: "4" },
    );
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "ppt/handoutMasters/_rels/handoutMaster1.xml.rels");
    expect(relsXml).toContain("theme");
    expect(relsXml).toContain("theme1.xml");
  });

  it("D24: presentation.xml contains <p:handoutMasterIdLst>", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { handoutLayout: "4" },
    );
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    expect(presXml).toContain("p:handoutMasterIdLst");
    expect(presXml).toContain("p:handoutMasterId");
    const handoutMatch = presXml.match(/handoutMasterId r:id="(rId\d+)"/);
    expect(handoutMatch).not.toBeNull();
  });

  it("D25: Content types include handout master override", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { handoutLayout: "4" },
    );
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain("handoutMaster+xml");
    expect(ctXml).toContain("handoutMaster1.xml");
  });
});

// =========================================================================
// CATEGORY E: TABLE AUTO-SIZING (6 tests)
// =========================================================================

describe("E: Table Auto-Sizing", () => {
  it("E26: Auto-fit with mixed content widths → column widths non-equal", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 600, height: 100 },
      tableData: {
        columns: [200, 200, 200],
        rows: [{
          cells: [
            { text: "Short" },
            { text: "A much longer piece of text content here" },
            { text: "Med" },
          ],
        }],
        autoFit: true,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(3);

    const widths = gridCols.map(c => parseInt(getAttr(c, "w")!, 10));
    // Column 2 (longer text) should be wider than column 1 and 3
    expect(widths[1]).toBeGreaterThan(widths[0]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it("E27: Distribute evenly on 5-column table → all <a:gridCol> equal w values", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 500, height: 100 },
      tableData: {
        columns: [100, 100, 100, 100, 100],
        rows: [{
          cells: [
            { text: "A" },
            { text: "BB" },
            { text: "CCC" },
            { text: "DDDD" },
            { text: "EEEEE" },
          ],
        }],
        autoFit: "distribute",
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(5);

    const widths = gridCols.map(c => parseInt(getAttr(c, "w")!, 10));
    // All should be equal
    const firstWidth = widths[0];
    for (const w of widths) {
      expect(w).toBe(firstWidth);
    }
  });

  it("E28: Auto-fit with merged cells → grid widths account for spans", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 100 },
      tableData: {
        columns: [100, 100, 100, 100],
        rows: [
          {
            cells: [
              { text: "Merged across 2 cols which is longer", colSpan: 2 },
              { hMerge: true } as any,
              { text: "C" },
              { text: "D" },
            ],
          },
          {
            cells: [
              { text: "A" },
              { text: "B" },
              { text: "C" },
              { text: "D" },
            ],
          },
        ],
        autoFit: true,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(4);

    // All widths should be positive
    const widths = gridCols.map(c => parseInt(getAttr(c, "w")!, 10));
    for (const w of widths) {
      expect(w).toBeGreaterThan(0);
    }
  });

  it("E29: Auto-fit with rich text (bold wider) → bold column wider", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 400, height: 100 },
      tableData: {
        columns: [200, 200],
        rows: [{
          cells: [
            { text: "Same length text" },
            { text: "Same length text", style: { fontWeight: "bold" } },
          ],
        }],
        autoFit: true,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(2);

    const widths = gridCols.map(c => parseInt(getAttr(c, "w")!, 10));
    // Bold text is wider (0.65 factor vs 0.6), so column 2 should be wider
    expect(widths[1]).toBeGreaterThan(widths[0]);
  });

  it("E30: Auto-fit respects container width → sum of gridCol widths approx container", async () => {
    const containerWidth = 700;
    const doc = makeDoc([{
      type: "Table",
      style: { width: containerWidth, height: 100 },
      tableData: {
        columns: [100, 100, 100],
        rows: [{
          cells: [
            { text: "Column 1" },
            { text: "Column 2 has more text" },
            { text: "Col 3" },
          ],
        }],
        autoFit: true,
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    const widths = gridCols.map(c => parseInt(getAttr(c, "w")!, 10));
    const totalEmu = widths.reduce((sum, w) => sum + w, 0);
    // containerWidth in EMU = 700 * 9525 = 6667500
    const containerEmu = containerWidth * 9525;
    // Allow 1% tolerance
    expect(Math.abs(totalEmu - containerEmu) / containerEmu).toBeLessThan(0.01);
  });

  it("E31: Manual columns override auto-fit → explicit widths used when autoFit is falsy", async () => {
    const doc = makeDoc([{
      type: "Table",
      style: { width: 600, height: 100 },
      tableData: {
        columns: [100, 300, 200],
        rows: [{
          cells: [
            { text: "AAAAAA very long content here" },
            { text: "B" },
            { text: "C" },
          ],
        }],
        // autoFit NOT set — manual widths should be used as-is
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const gridCols = findAllElements(tree, "a:gridCol");
    expect(gridCols.length).toBe(3);

    const widths = gridCols.map(c => parseInt(getAttr(c, "w")!, 10));
    // Manual widths: 100, 300, 200 in pixels => EMU
    expect(widths[0]).toBe(100 * 9525);
    expect(widths[1]).toBe(300 * 9525);
    expect(widths[2]).toBe(200 * 9525);
  });
});

// =========================================================================
// CATEGORY F: ANIMATION (8 tests)
// =========================================================================

describe("F: Animation", () => {
  it("F32: Repeat count on animation → repeatCount attribute on <p:cTn>", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 200, height: 100, backgroundColor: "#4472C4" },
      animations: [{
        type: "emphasis",
        effect: "spin",
        trigger: "onClick",
        duration: 1000,
        repeatCount: 3,
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const cTns = findAllElements(tree, "p:cTn");
    // Find a cTn with repeatCount (3 * 1000 = "3000")
    const repeatCTn = cTns.find(c => {
      const rc = getAttr(c, "repeatCount");
      return rc !== undefined && rc !== "indefinite";
    });
    expect(repeatCTn).toBeDefined();
    expect(getAttr(repeatCTn!, "repeatCount")).toBe("3000");
  });

  it("F33: Infinite loop → repeatCount='indefinite'", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 200, height: 100, backgroundColor: "#4472C4" },
      animations: [{
        type: "emphasis",
        effect: "spin",
        trigger: "onClick",
        duration: 1000,
        repeatCount: "indefinite",
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const cTns = findAllElements(tree, "p:cTn");
    const indefiniteCTn = cTns.find(c => getAttr(c, "repeatCount") === "indefinite");
    expect(indefiniteCTn).toBeDefined();
  });

  it("F34: Text build by paragraph → <p:bldLst><p:bldP> with build='p'", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 300, height: 200, fontSize: 14 },
      paragraphs: [
        { runs: [{ text: "First paragraph" }] },
        { runs: [{ text: "Second paragraph" }] },
        { runs: [{ text: "Third paragraph" }] },
      ],
      animations: [{
        type: "entrance",
        effect: "fade",
        trigger: "onClick",
        buildType: "byParagraph",
      }],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("p:bldLst");
    expect(slideXml).toContain("p:bldP");
    expect(slideXml).toContain('build="p"');
  });

  it("F35: AnimationGroup parallel → single <p:par> containing child animations", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 200, height: 100, backgroundColor: "#4472C4" },
      animations: [
        { type: "entrance", effect: "fade", trigger: "onClick", duration: 500 },
        { type: "entrance", effect: "zoom", trigger: "withPrevious", duration: 500 },
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have timing
    const timings = findAllElements(tree, "p:timing");
    expect(timings.length).toBe(1);

    // withPrevious nodeType
    const cTns = findAllElements(tree, "p:cTn");
    const withCTn = cTns.find(c => getAttr(c, "nodeType") === "withEffect");
    expect(withCTn).toBeDefined();
  });

  it("F36: AnimationGroup sequence → sequential <p:par> with staggered delays", async () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { width: 200, height: 100, backgroundColor: "#4472C4" },
        animations: [
          { type: "entrance", effect: "fade", trigger: "onClick", duration: 500, delay: 0 },
        ],
      },
      {
        type: "View",
        style: { width: 200, height: 100, backgroundColor: "#ED7D31" },
        animations: [
          { type: "entrance", effect: "fade", trigger: "afterPrevious", duration: 500, delay: 200 },
        ],
      },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cTns = findAllElements(tree, "p:cTn");
    const afterCTn = cTns.find(c => getAttr(c, "nodeType") === "afterEffect");
    expect(afterCTn).toBeDefined();
  });

  it("F37: Mixed triggers: onClick + withPrevious + afterPrevious", async () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { width: 100, height: 50, backgroundColor: "#4472C4" },
        animations: [
          { type: "entrance", effect: "fade", trigger: "onClick" },
        ],
      },
      {
        type: "View",
        style: { width: 100, height: 50, backgroundColor: "#ED7D31" },
        animations: [
          { type: "entrance", effect: "zoom", trigger: "withPrevious" },
        ],
      },
      {
        type: "View",
        style: { width: 100, height: 50, backgroundColor: "#70AD47" },
        animations: [
          { type: "entrance", effect: "wipe", trigger: "afterPrevious" },
        ],
      },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cTns = findAllElements(tree, "p:cTn");
    const nodeTypes = cTns.map(c => getAttr(c, "nodeType")).filter(Boolean);
    expect(nodeTypes).toContain("clickEffect");
    expect(nodeTypes).toContain("withEffect");
    expect(nodeTypes).toContain("afterEffect");
  });

  it("F38: Animation on grouped shape → correct spid targeting", async () => {
    const doc = makeDoc([{
      type: "Group",
      style: { width: 300, height: 100 },
      animations: [
        { type: "entrance", effect: "fade", trigger: "onClick" },
      ],
      children: [
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#4472C4" } },
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#ED7D31" } },
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have timing with spTgt referencing the group shape
    const spTgts = findAllElements(tree, "p:spTgt");
    expect(spTgts.length).toBeGreaterThanOrEqual(1);

    // The spid should match the group's shape id
    const spids = spTgts.map(s => getAttr(s, "spid"));
    expect(spids.length).toBeGreaterThanOrEqual(1);
    for (const spid of spids) {
      expect(parseInt(spid!, 10)).toBeGreaterThanOrEqual(2);
    }
  });

  it("F39: 10-shape sequential build → timing chain", async () => {
    const children: PaperNode[] = [];
    for (let i = 0; i < 10; i++) {
      children.push({
        type: "View",
        style: { width: 80, height: 40, backgroundColor: "#4472C4" },
        animations: [{
          type: "entrance",
          effect: "fade",
          trigger: i === 0 ? "onClick" : "afterPrevious",
          delay: 100,
        }],
      });
    }
    const doc = makeDoc(children);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have 10 spTgt elements (one per animated shape)
    const spTgts = findAllElements(tree, "p:spTgt");
    expect(spTgts.length).toBeGreaterThanOrEqual(10);

    // Verify timing structure exists
    const timings = findAllElements(tree, "p:timing");
    expect(timings.length).toBe(1);

    // Verify all 10 animation nodes
    const cTns = findAllElements(tree, "p:cTn");
    const effectNodes = cTns.filter(c => {
      const nt = getAttr(c, "nodeType");
      return nt === "clickEffect" || nt === "afterEffect";
    });
    expect(effectNodes.length).toBe(10);
  });
});

// =========================================================================
// CATEGORY G: DIAGRAMS (8 tests)
// =========================================================================

describe("G: Diagrams", () => {
  it("G40: Process flow (5 steps) → PaperGroup has 5 shape + 4 connector children", () => {
    const group = generateDiagram({
      type: "process",
      items: [
        { text: "Step 1" },
        { text: "Step 2" },
        { text: "Step 3" },
        { text: "Step 4" },
        { text: "Step 5" },
      ],
    });
    expect(group.type).toBe("Group");
    // 5 boxes + 4 connectors = 9 children
    const views = group.children.filter(c => c.type === "View");
    const connectors = group.children.filter(c => c.type === "Connector");
    expect(views.length).toBe(5);
    expect(connectors.length).toBe(4);
  });

  it("G41: Hierarchy (3 levels) → parent-child connectors", () => {
    const group = generateDiagram({
      type: "hierarchy",
      items: [{
        text: "CEO",
        children: [
          {
            text: "VP Engineering",
            children: [
              { text: "Dev Lead" },
              { text: "QA Lead" },
            ],
          },
          {
            text: "VP Sales",
            children: [
              { text: "Account Mgr" },
            ],
          },
        ],
      }],
    });
    expect(group.type).toBe("Group");
    const views = group.children.filter(c => c.type === "View");
    const connectors = group.children.filter(c => c.type === "Connector");
    // 6 nodes: CEO, VP Eng, VP Sales, Dev Lead, QA Lead, Account Mgr
    expect(views.length).toBe(6);
    // 5 connectors: CEO->VP Eng, CEO->VP Sales, VP Eng->Dev Lead, VP Eng->QA Lead, VP Sales->Account Mgr
    expect(connectors.length).toBe(5);
  });

  it("G42: Cycle (4 items) → circular arrangement", () => {
    const group = generateDiagram({
      type: "cycle",
      items: [
        { text: "Plan" },
        { text: "Do" },
        { text: "Check" },
        { text: "Act" },
      ],
    });
    expect(group.type).toBe("Group");
    const views = group.children.filter(c => c.type === "View");
    const connectors = group.children.filter(c => c.type === "Connector");
    expect(views.length).toBe(4);
    // 4 connectors (circular: 1->2, 2->3, 3->4, 4->1)
    expect(connectors.length).toBe(4);

    // Width and height should be equal (circular)
    const w = group.style?.width as number;
    const h = group.style?.height as number;
    expect(w).toBe(h);
  });

  it("G43: Matrix (4 quadrants) → 2x2 grid layout", () => {
    const group = generateDiagram({
      type: "matrix",
      items: [
        { text: "Q1: High Impact / High Effort" },
        { text: "Q2: High Impact / Low Effort" },
        { text: "Q3: Low Impact / High Effort" },
        { text: "Q4: Low Impact / Low Effort" },
      ],
    });
    expect(group.type).toBe("Group");
    const views = group.children.filter(c => c.type === "View");
    expect(views.length).toBe(4);

    // Matrix should have no connectors
    const connectors = group.children.filter(c => c.type === "Connector");
    expect(connectors.length).toBe(0);
  });

  it("G44: Pyramid (4 levels) → decreasing widths", () => {
    const group = generateDiagram({
      type: "pyramid",
      items: [
        { text: "Top" },
        { text: "Second" },
        { text: "Third" },
        { text: "Base" },
      ],
    });
    expect(group.type).toBe("Group");
    const views = group.children.filter(c => c.type === "View");
    expect(views.length).toBe(4);

    // Widths decrease with index: i=0 is widest (base), i=3 is narrowest (top)
    const widths = views.map(v => (v as any).style.width as number);
    // Pyramid: i=0 is base (widest), i=3 is tip (narrowest)
    expect(widths[0]).toBeGreaterThan(widths[3]);
    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
    expect(widths[2]).toBeGreaterThan(widths[3]);
  });

  it("G45: List (6 items) → vertical stack", () => {
    const group = generateDiagram({
      type: "list",
      items: [
        { text: "Item 1" },
        { text: "Item 2" },
        { text: "Item 3" },
        { text: "Item 4" },
        { text: "Item 5" },
        { text: "Item 6" },
      ],
      direction: "vertical",
    });
    expect(group.type).toBe("Group");
    // List items are views (each item is a rect), optionally with icon circles
    const views = group.children.filter(c => c.type === "View");
    expect(views.length).toBe(6);

    // Height should be taller than wide for vertical list
    const w = group.style?.width as number;
    const h = group.style?.height as number;
    expect(h).toBeGreaterThan(w);
  });

  it("G46: Process flow renders valid PPTX → full engine render + valid XML", async () => {
    const diagramGroup = generateDiagram({
      type: "process",
      items: [
        { text: "Research" },
        { text: "Design" },
        { text: "Build" },
        { text: "Test" },
      ],
    });
    // Place the diagram group on a slide
    const doc = makeDoc([diagramGroup]);
    const buffer = await PaperEngine.render(doc);

    // Verify the ZIP is valid
    const paths = await getZipPaths(buffer);
    expect(paths).toContain("ppt/slides/slide1.xml");

    // Verify slide XML contains shape elements
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have group shape
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);

    // Should have shape elements inside the group
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(4); // At least 4 step boxes

    // Should have connector elements
    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBeGreaterThanOrEqual(3); // 3 connectors between 4 steps
  });

  it("G47: Hierarchy with custom colors → fill colors match config", async () => {
    const diagramGroup = generateDiagram({
      type: "hierarchy",
      items: [{
        text: "Root",
        color: "#FF0000",
        children: [
          { text: "Child A", color: "#00FF00" },
          { text: "Child B", color: "#0000FF" },
        ],
      }],
      style: { accentColor: "#999999" },
    });

    // Verify the group structure has correct colors
    const views = diagramGroup.children.filter(c => c.type === "View") as any[];
    expect(views.length).toBe(3);

    // The root should have red fill
    const rootView = views.find((v: any) => v.textContent === "Root");
    expect(rootView).toBeDefined();
    expect(rootView!.style.backgroundColor).toBe("#FF0000");

    // Child A should have green fill
    const childA = views.find((v: any) => v.textContent === "Child A");
    expect(childA).toBeDefined();
    expect(childA!.style.backgroundColor).toBe("#00FF00");

    // Render to verify no crash
    const doc = makeDoc([diagramGroup]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("FF0000");
    expect(slideXml).toContain("00FF00");
    expect(slideXml).toContain("0000FF");
  });
});

// =========================================================================
// CATEGORY H: PRINT SETTINGS (3 tests)
// =========================================================================

describe("H: Print Settings", () => {
  it("H48: Print settings in presProps.xml → <p:prnPr>", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { printSettings: { colorMode: "clr" } },
    );
    const buffer = await PaperEngine.render(doc);
    const presPropsXml = await getZipEntry(buffer, "ppt/presProps.xml");
    expect(presPropsXml).toContain("p:prnPr");
  });

  it("H49: Grayscale mode → clrMode='gray'", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { printSettings: { colorMode: "gray" } },
    );
    const buffer = await PaperEngine.render(doc);
    const presPropsXml = await getZipEntry(buffer, "ppt/presProps.xml");
    expect(presPropsXml).toContain('clrMode="gray"');
  });

  it("H50: Frame slides flag → frameSlides='1'", async () => {
    const doc = makeDoc(
      [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#CCCCCC" } }],
      {},
      { printSettings: { frameSlides: true, colorMode: "clr" } },
    );
    const buffer = await PaperEngine.render(doc);
    const presPropsXml = await getZipEntry(buffer, "ppt/presProps.xml");
    expect(presPropsXml).toContain('frameSlides="1"');
  });
});
