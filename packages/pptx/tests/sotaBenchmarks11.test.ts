/**
 * SOTA Benchmarks 11 — OOXML Spec Compliance
 *
 * 40 tests across 5 categories:
 *   A: Element Ordering — sp children, effect order, table order, txBody order
 *   B: Namespace Declarations — required xmlns on slide/chart/presentation/rels
 *   C: Attribute Value Ranges — EMU non-negative, unique IDs, font size, rotation
 *   D: OPC Integrity — Content_Types, no orphans, consecutive numbering
 *   E: XML Well-Formedness — parseable, no unescaped chars, UTF-8
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode, TableData } from "../src/types/ast.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL,
  assertUniqueShapeIds, assertElementOrder, getChildTagNames,
  assertWellFormedXml, getAllXmlFiles, getChildren, getTagName,
} from "./helpers/xmlTestUtils.js";

// =========================================================================
// Helpers
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
// CATEGORY A: ELEMENT ORDERING (8 tests)
// =========================================================================

describe("A: Element Ordering", () => {
  it("A1: <p:sp> children order → nvSpPr → spPr → txBody", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 200, height: 100, backgroundColor: "#FF0000" },
      textContent: "Hello",
      textStyle: { fontSize: 14 },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(1);

    for (const sp of sps) {
      const childTags = getChildTagNames(sp);
      // nvSpPr must come before spPr, spPr before txBody
      const nvIdx = childTags.indexOf("p:nvSpPr");
      const spPrIdx = childTags.indexOf("p:spPr");
      const txBodyIdx = childTags.indexOf("p:txBody");
      if (nvIdx >= 0 && spPrIdx >= 0) expect(nvIdx).toBeLessThan(spPrIdx);
      if (spPrIdx >= 0 && txBodyIdx >= 0) expect(spPrIdx).toBeLessThan(txBodyIdx);
    }
  });

  it("A2: <p:txBody> children order → bodyPr → lstStyle → p", async () => {
    const doc = makeDoc([{
      type: "Text",
      style: { width: 200, height: 50, fontSize: 14 },
      content: "Test",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const txBodies = findAllElements(tree, "p:txBody");
    expect(txBodies.length).toBeGreaterThanOrEqual(1);

    for (const txBody of txBodies) {
      const childTags = getChildTagNames(txBody);
      const bodyPrIdx = childTags.indexOf("a:bodyPr");
      const lstStyleIdx = childTags.indexOf("a:lstStyle");
      const pIdx = childTags.indexOf("a:p");
      if (bodyPrIdx >= 0 && lstStyleIdx >= 0) expect(bodyPrIdx).toBeLessThan(lstStyleIdx);
      if (lstStyleIdx >= 0 && pIdx >= 0) expect(lstStyleIdx).toBeLessThan(pIdx);
      if (bodyPrIdx >= 0 && pIdx >= 0) expect(bodyPrIdx).toBeLessThan(pIdx);
    }
  });

  it("A3: Effect order → glow → innerShdw → outerShdw → reflection → softEdge", async () => {
    const doc = makeDoc([{
      type: "View",
      style: {
        width: 200, height: 100,
        backgroundColor: "#4472C4",
        effects: {
          glow: { color: "#FFD700", radius: 10 },
          innerShadow: { color: "#000000", offsetX: 2, offsetY: 2, blurRadius: 4 },
          dropShadow: { color: "#000000", offsetX: 5, offsetY: 5, blurRadius: 10 },
          reflection: { blurRadius: 4 },
          softEdge: { radius: 5 },
        },
      },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const effectLsts = findAllElements(tree, "a:effectLst");
    expect(effectLsts.length).toBeGreaterThanOrEqual(1);

    for (const effectLst of effectLsts) {
      assertElementOrder(effectLst, [
        "a:glow", "a:innerShdw", "a:outerShdw", "a:reflection", "a:softEdge",
      ]);
    }
  });

  it("A4: Table element order → tblPr → tblGrid → tr", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [{ cells: [{ text: "A" }, { text: "B" }] }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 200, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const tbls = findAllElements(tree, "a:tbl");
    expect(tbls.length).toBeGreaterThanOrEqual(1);

    for (const tbl of tbls) {
      assertElementOrder(tbl, ["a:tblPr", "a:tblGrid", "a:tr"]);
    }
  });

  it("A5: <p:cxnSp> children order → nvCxnSpPr → spPr", async () => {
    const doc = makeDoc([{
      type: "Connector",
      connectorType: "straight",
      start: { x: 50, y: 50 },
      end: { x: 300, y: 300 },
      lineWidth: 2,
      lineColor: "#000000",
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cxnSps = findAllElements(tree, "p:cxnSp");
    expect(cxnSps.length).toBe(1);

    const childTags = getChildTagNames(cxnSps[0]);
    const nvIdx = childTags.indexOf("p:nvCxnSpPr");
    const spPrIdx = childTags.indexOf("p:spPr");
    expect(nvIdx).toBeLessThan(spPrIdx);
  });

  it("A6: <p:graphicFrame> for chart → nvGraphicFramePr → xfrm → graphic", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const gfs = findAllElements(tree, "p:graphicFrame");
    expect(gfs.length).toBeGreaterThanOrEqual(1);

    for (const gf of gfs) {
      assertElementOrder(gf, ["p:nvGraphicFramePr", "p:xfrm", "a:graphic"]);
    }
  });

  it("A7: <p:pic> children order → nvPicPr → blipFill → spPr", async () => {
    const doc = makeDoc([{
      type: "Image",
      src: RED_PIXEL,
      style: { width: 100, height: 100 },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const pics = findAllElements(tree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);

    for (const pic of pics) {
      assertElementOrder(pic, ["p:nvPicPr", "p:blipFill", "p:spPr"]);
    }
  });

  it("A8: Slide XML top-level order → cSld (→ bg → spTree) → transition → timing", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 100, height: 100, backgroundColor: "#FF0000" },
      animations: [{ type: "entrance", effect: "fade", trigger: "onClick" }],
    }], {
      transition: { type: "fade", duration: 300 },
      background: { type: "solid", color: "#003366" },
    });
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Find the p:sld root
    const slds = findAllElements(tree, "p:sld");
    expect(slds.length).toBe(1);
    const sld = slds[0];
    assertElementOrder(sld, ["p:cSld", "p:clrMapOvr", "p:transition", "p:timing"]);
  });
});

// =========================================================================
// CATEGORY B: NAMESPACE DECLARATIONS (8 tests)
// =========================================================================

describe("B: Namespace Declarations", () => {
  it("B1: Slide XML has required namespaces (a, r, p)", async () => {
    const doc = makeDoc([{ type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    expect(slideXml).toContain("xmlns:a=");
    expect(slideXml).toContain("xmlns:r=");
    expect(slideXml).toContain("xmlns:p=");
  });

  it("B2: Chart XML has required namespaces (c, a, r)", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");

    expect(chartXml).toContain("xmlns:c=");
    expect(chartXml).toContain("xmlns:a=");
    expect(chartXml).toContain("xmlns:r=");
  });

  it("B3: Presentation XML has required namespaces", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");

    expect(presXml).toContain("xmlns:a=");
    expect(presXml).toContain("xmlns:r=");
    expect(presXml).toContain("xmlns:p=");
  });

  it("B4: Relationships files use correct namespace", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "_rels/.rels");
    expect(relsXml).toContain("xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"");
  });

  it("B5: Content_Types.xml uses correct namespace", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain("xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"");
  });

  it("B6: Slide rels file uses correct namespace", async () => {
    const doc = makeDoc([{ type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } }]);
    const buffer = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(relsXml).toContain("xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"");
  });

  it("B7: Theme XML has required namespaces (a)", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    const themeXml = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    expect(themeXml).toContain("xmlns:a=");
  });

  it("B8: Notes slide XML has required namespaces", async () => {
    const doc = makeDoc([], { notes: "Test notes" });
    const buffer = await PaperEngine.render(doc);
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    expect(notesXml).toContain("xmlns:a=");
    expect(notesXml).toContain("xmlns:r=");
    expect(notesXml).toContain("xmlns:p=");
  });
});

// =========================================================================
// CATEGORY C: ATTRIBUTE VALUE RANGES (8 tests)
// =========================================================================

describe("C: Attribute Value Ranges", () => {
  it("C1: All EMU values are non-negative integers", async () => {
    const doc = makeDoc([
      { type: "View", style: { width: 200, height: 150, backgroundColor: "#FF0000" } },
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 80 } },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Check all <a:ext> and <a:off> elements
    const exts = findAllElements(tree, "a:ext");
    for (const ext of exts) {
      const cx = getAttr(ext, "cx");
      const cy = getAttr(ext, "cy");
      if (cx) expect(parseInt(cx, 10)).toBeGreaterThanOrEqual(0);
      if (cy) expect(parseInt(cy, 10)).toBeGreaterThanOrEqual(0);
    }

    const offs = findAllElements(tree, "a:off");
    for (const off of offs) {
      const x = getAttr(off, "x");
      const y = getAttr(off, "y");
      if (x) expect(parseInt(x, 10)).toBeGreaterThanOrEqual(0);
      if (y) expect(parseInt(y, 10)).toBeGreaterThanOrEqual(0);
    }
  });

  it("C2: Shape IDs are unique within a slide", async () => {
    const doc = makeDoc([
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } },
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#00FF00" } },
      { type: "Text", style: { width: 200, height: 50, fontSize: 14 }, content: "Hello" },
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    assertUniqueShapeIds(tree);
  });

  it("C3: Shape IDs start at 2 (id=1 reserved for groupShape)", async () => {
    const doc = makeDoc([
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cNvPrs = findAllElements(tree, "p:cNvPr");
    const ids = cNvPrs.map(el => parseInt(getAttr(el, "id")!, 10)).filter(id => !isNaN(id));
    // The first real shape should have id >= 2
    const contentShapeIds = ids.filter(id => id > 1);
    expect(contentShapeIds.length).toBeGreaterThanOrEqual(1);
    expect(Math.min(...contentShapeIds)).toBeGreaterThanOrEqual(2);
  });

  it("C4: Font size is always a positive integer (in 100ths of a point)", async () => {
    const doc = makeDoc([
      { type: "Text", style: { width: 200, height: 50, fontSize: 12 }, content: "Small" },
      { type: "Text", style: { width: 200, height: 50, fontSize: 72 }, content: "Large" },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Extract all sz attributes
    const szMatches = slideXml.matchAll(/sz="(\d+)"/g);
    for (const match of szMatches) {
      const size = parseInt(match[1], 10);
      expect(size).toBeGreaterThan(0);
      expect(Number.isInteger(size)).toBe(true);
    }
  });

  it("C5: Rotation values are within 0-21600000 range", async () => {
    const doc = makeDoc([
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000", rotation: 45 } },
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#00FF00", rotation: 180 } },
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#0000FF", rotation: 350 } },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    const rotMatches = slideXml.matchAll(/rot="(\d+)"/g);
    for (const match of rotMatches) {
      const rot = parseInt(match[1], 10);
      expect(rot).toBeGreaterThanOrEqual(0);
      expect(rot).toBeLessThanOrEqual(21600000);
    }
  });

  it("C6: Alpha values are within 0-100000 range", async () => {
    const doc = makeDoc([
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000", opacity: 0.5 } },
    ]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const alphas = findAllElements(tree, "a:alpha");
    for (const alpha of alphas) {
      const val = parseInt(getAttr(alpha, "val")!, 10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100000);
    }
  });

  it("C7: gridCol widths sum approximately equals table width in EMU", async () => {
    const tableData: TableData = {
      columns: [100, 150, 200],
      rows: [{ cells: [{ text: "A" }, { text: "B" }, { text: "C" }] }],
    };
    const doc = makeDoc([{
      type: "Table",
      style: { width: 450, height: 50 },
      tableData,
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const gridCols = findAllElements(tree, "a:gridCol");
    const widthSum = gridCols.reduce((sum, gc) => sum + parseInt(getAttr(gc, "w")!, 10), 0);

    // Table width in EMU: 450 * 9525 = 4286250
    // Allow some tolerance for rounding
    const expectedEmu = 450 * 9525;
    expect(Math.abs(widthSum - expectedEmu)).toBeLessThan(expectedEmu * 0.01);
  });

  it("C8: Line widths are positive EMU values", async () => {
    const doc = makeDoc([{
      type: "View",
      style: { width: 100, height: 100, borderWidth: 2, borderColor: "#000000" },
    }]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const lns = findAllElements(tree, "a:ln");
    for (const ln of lns) {
      const w = getAttr(ln, "w");
      if (w) {
        const width = parseInt(w, 10);
        expect(width).toBeGreaterThan(0);
      }
    }
  });
});

// =========================================================================
// CATEGORY D: OPC INTEGRITY (8 tests)
// =========================================================================

describe("D: OPC Integrity", () => {
  it("D1: [Content_Types].xml covers all slide parts", async () => {
    const slides: PaperSlide[] = Array.from({ length: 3 }, () => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [],
    }));
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");

    for (let i = 1; i <= 3; i++) {
      expect(ctXml).toContain(`/ppt/slides/slide${i}.xml`);
    }
  });

  it("D2: [Content_Types].xml covers chart parts", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
    }]);
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain("/ppt/charts/chart1.xml");
  });

  it("D3: Slide numbering is consecutive (slide1, slide2, slide3...)", async () => {
    const slides: PaperSlide[] = Array.from({ length: 5 }, () => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [],
    }));
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    for (let i = 1; i <= 5; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }
  });

  it("D4: Every slide has a corresponding rels file", async () => {
    const slides: PaperSlide[] = Array.from({ length: 3 }, () => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [],
    }));
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    for (let i = 1; i <= 3; i++) {
      expect(paths).toContain(`ppt/slides/_rels/slide${i}.xml.rels`);
    }
  });

  it("D5: No orphaned media files (every media file referenced by at least one rel)", async () => {
    const doc = makeDoc([
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
    ]);
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);
    const mediaPaths = paths.filter(p => p.startsWith("ppt/media/"));

    // Each media file should be referenced in a rels file
    for (const mediaPath of mediaPaths) {
      const relativePath = "../" + mediaPath.replace("ppt/", "");
      // Find it in some rels file
      const relsFiles = paths.filter(p => p.endsWith(".rels"));
      let found = false;
      for (const relsPath of relsFiles) {
        const relsContent = await getZipEntry(buffer, relsPath);
        if (relsContent.includes(mediaPath.split("/").pop()!)) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }
  });

  it("D6: Notes rels are correct (notes slides link to notesMaster)", async () => {
    const doc = makeDoc([], { notes: "Speaker notes" });
    const buffer = await PaperEngine.render(doc);
    const notesRelsXml = await getZipEntry(buffer, "ppt/notesSlides/_rels/notesSlide1.xml.rels");
    // Must reference notesMaster
    expect(notesRelsXml).toContain("notesMaster");
  });

  it("D7: Chart rels reference Excel embedding", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
    }]);
    const buffer = await PaperEngine.render(doc);
    const chartRelsXml = await getZipEntry(buffer, "ppt/charts/_rels/chart1.xml.rels");
    // Must reference embedded xlsx (via package relationship type)
    expect(chartRelsXml).toContain("chart1.xlsx");
    expect(chartRelsXml).toContain("Relationship");
  });

  it("D8: Presentation rels reference all required parts", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    const presRelsXml = await getZipEntry(buffer, "ppt/_rels/presentation.xml.rels");

    // Must reference slideMaster, theme, slide(s)
    expect(presRelsXml).toContain("slideMaster");
    expect(presRelsXml).toContain("theme");
    expect(presRelsXml).toContain("slide1.xml");
  });
});

// =========================================================================
// CATEGORY E: XML WELL-FORMEDNESS (8 tests)
// =========================================================================

describe("E: XML Well-Formedness", () => {
  it("E1: All XML files in simple doc are parseable", async () => {
    const doc = makeDoc([
      { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } },
    ]);
    const buffer = await PaperEngine.render(doc);
    await assertWellFormedXml(buffer);
  });

  it("E2: All XML files with chart are parseable", async () => {
    const doc = makeDoc([{
      type: "Chart",
      style: { width: 400, height: 300 },
      chartData: { chartType: "bar", categories: ["A", "B", "C"], series: [{ name: "S", values: [10, 20, 30] }] },
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertWellFormedXml(buffer);
  });

  it("E3: All XML files with table + effects are parseable", async () => {
    const tableData: TableData = {
      columns: [100, 100],
      rows: [{ cells: [{ text: "A" }, { text: "B" }] }],
    };
    const doc = makeDoc([
      { type: "Table", style: { width: 200, height: 50 }, tableData },
      {
        type: "View",
        style: {
          width: 200, height: 100,
          backgroundColor: "#4472C4",
          effects: {
            dropShadow: { color: "#000000", offsetX: 5, offsetY: 5, blurRadius: 10 },
            reflection: { blurRadius: 4 },
          },
        },
      },
    ]);
    const buffer = await PaperEngine.render(doc);
    await assertWellFormedXml(buffer);
  });

  it("E4: No unescaped ampersands in any XML file", async () => {
    const doc = makeDoc([
      { type: "Text", style: { width: 300, height: 50, fontSize: 14 }, content: "Tom & Jerry" },
    ]);
    const buffer = await PaperEngine.render(doc);
    const xmlFiles = await getAllXmlFiles(buffer);

    for (const [path, content] of xmlFiles) {
      // Check for bare & not followed by amp; lt; gt; quot; apos; or #
      const bareAmpersands = content.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
      if (bareAmpersands) {
        throw new Error(`Unescaped ampersand in ${path}: found ${bareAmpersands.length} occurrences`);
      }
    }
  });

  it("E5: UTF-8 XML declarations present", async () => {
    const doc = makeDoc([]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toMatch(/^<\?xml.*encoding=["']UTF-8["']/i);
  });

  it("E6: Complex multi-feature doc produces well-formed XML", async () => {
    const slides: PaperSlide[] = [
      {
        type: "Slide", style: { width: 960, height: 540 },
        background: { type: "gradient", angle: 45, stops: [{ color: "#000000", position: 0 }, { color: "#FFFFFF", position: 100 }] },
        children: [
          { type: "Text", style: { width: 400, height: 60, fontSize: 24 }, content: "Title" },
          { type: "Image", src: RED_PIXEL, style: { width: 200, height: 200 } },
        ],
        notes: "Notes here",
        transition: { type: "fade" },
      },
      {
        type: "Slide", style: { width: 960, height: 540 },
        children: [{
          type: "Chart", style: { width: 600, height: 400 },
          chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
        }],
      },
    ];
    const doc = makeMultiSlideDoc(slides, {
      meta: { title: "Test", author: "Author" },
      customProperties: [{ name: "Prop", value: "Value" }],
    });
    const buffer = await PaperEngine.render(doc);
    await assertWellFormedXml(buffer);
  });

  it("E7: Rels files are well-formed XML", async () => {
    const doc = makeDoc([
      { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
      {
        type: "Chart", style: { width: 400, height: 300 },
        chartData: { chartType: "bar", categories: ["A"], series: [{ name: "S", values: [10] }] },
      },
    ]);
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);
    const relsPaths = paths.filter(p => p.endsWith(".rels"));

    for (const relsPath of relsPaths) {
      const content = await getZipEntry(buffer, relsPath);
      // Should parse without error
      const tree = parseXml(content);
      expect(tree).toBeDefined();
    }
  });

  it("E8: All XML starts with <?xml declaration or valid root element", async () => {
    const doc = makeDoc([
      { type: "Text", style: { width: 200, height: 50, fontSize: 14 }, content: "Test" },
    ]);
    const buffer = await PaperEngine.render(doc);
    const xmlFiles = await getAllXmlFiles(buffer);

    for (const [path, content] of xmlFiles) {
      const trimmed = content.trim();
      expect(
        trimmed.startsWith("<?xml") || trimmed.startsWith("<"),
      ).toBe(true);
    }
  });
});
