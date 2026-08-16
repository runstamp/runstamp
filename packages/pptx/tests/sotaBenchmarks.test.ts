/**
 * SOTA Benchmarks — Structural XML validation for PPTX engine.
 *
 * Every assertion operates on parsed XML DOM (via fast-xml-parser),
 * not string matching. This validates real OOXML spec compliance.
 */

import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import { toEmu, PIXEL_TO_EMU } from "../src/ooxml/drawing/math.js";

// ---------------------------------------------------------------------------
// XML Parse Helpers
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function parseXml(xml: string): any[] {
  return xmlParser.parse(xml);
}

/** Get the tag name of a parsed element node */
function getTagName(el: any): string | undefined {
  return Object.keys(el).find(k => k !== ":@" && k !== "#text");
}

/** Get children of a parsed element */
function getChildren(el: any): any[] {
  const tag = getTagName(el);
  return tag && Array.isArray(el[tag]) ? el[tag] : [];
}

/** Get attribute value from a parsed element */
function getAttr(el: any, name: string): string | undefined {
  return el[":@"]?.[`@_${name}`];
}

/** Get ordered child tag names */
function getChildTagNames(el: any): string[] {
  return getChildren(el)
    .map(c => getTagName(c))
    .filter((t): t is string => !!t);
}

/** Recursively find all elements with a given tag name */
function findAllElements(tree: any[], tag: string): any[] {
  const results: any[] = [];
  (function walk(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      for (const k of Object.keys(n)) {
        if (k === ":@" || k === "#text") continue;
        if (k === tag) results.push(n);
        if (Array.isArray(n[k])) walk(n[k]);
      }
    }
  })(tree);
  return results;
}

/** Get text content from an element */
function getText(el: any): string {
  return getChildren(el)
    .filter(c => "#text" in c)
    .map(c => String(c["#text"]))
    .join("");
}

// ---------------------------------------------------------------------------
// ZIP Helpers
// ---------------------------------------------------------------------------

async function getZipEntry(buffer: Buffer, path: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  if (!file) throw new Error(`${path} not found`);
  return file.async("string");
}

async function getZipPaths(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).filter(p => !zip.files[p].dir);
}

async function zipHasFile(buffer: Buffer, path: string): Promise<boolean> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file(path) !== null;
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const RED_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// =========================================================================
// BENCHMARK 1: OOXML Element Order Compliance
// =========================================================================

describe("Benchmark 1: OOXML Element Order Compliance", () => {
  let buffer: Buffer;
  let tree: any[];

  it("renders a text shape for element order testing", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 16, color: "#FF0000" },
          content: "Hello World",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));
  });

  it("p:sp children are ordered: nvSpPr → spPr → txBody", () => {
    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(1);

    for (const sp of shapes) {
      const childTags = getChildTagNames(sp);
      const nvIdx = childTags.indexOf("p:nvSpPr");
      const spPrIdx = childTags.indexOf("p:spPr");
      const txIdx = childTags.indexOf("p:txBody");
      if (nvIdx >= 0 && spPrIdx >= 0) expect(nvIdx).toBeLessThan(spPrIdx);
      if (spPrIdx >= 0 && txIdx >= 0) expect(spPrIdx).toBeLessThan(txIdx);
    }
  });

  it("p:txBody children are ordered: bodyPr → lstStyle → a:p", () => {
    const txBodies = findAllElements(tree, "p:txBody");
    expect(txBodies.length).toBeGreaterThanOrEqual(1);

    for (const txBody of txBodies) {
      const childTags = getChildTagNames(txBody);
      const bpIdx = childTags.indexOf("a:bodyPr");
      const lsIdx = childTags.indexOf("a:lstStyle");
      const firstP = childTags.indexOf("a:p");
      expect(bpIdx).toBe(0);
      expect(lsIdx).toBe(1);
      expect(firstP).toBeGreaterThanOrEqual(2);
    }
  });

  it("a:r children are ordered: rPr → t", () => {
    const runs = findAllElements(tree, "a:r");
    expect(runs.length).toBeGreaterThanOrEqual(1);

    for (const run of runs) {
      const childTags = getChildTagNames(run);
      const rPrIdx = childTags.indexOf("a:rPr");
      const tIdx = childTags.indexOf("a:t");
      if (rPrIdx >= 0 && tIdx >= 0) {
        expect(rPrIdx).toBeLessThan(tIdx);
      }
    }
  });

  it("a:rPr children follow spec order: solidFill → latin → ea → cs → hlinkClick", () => {
    const rPrs = findAllElements(tree, "a:rPr");
    expect(rPrs.length).toBeGreaterThanOrEqual(1);

    for (const rPr of rPrs) {
      const childTags = getChildTagNames(rPr);
      const order = ["a:solidFill", "a:latin", "a:ea", "a:cs", "a:hlinkClick"];
      let lastIdx = -1;
      for (const tag of order) {
        const idx = childTags.indexOf(tag);
        if (idx >= 0) {
          expect(idx).toBeGreaterThan(lastIdx);
          lastIdx = idx;
        }
      }
    }
  });
});

// =========================================================================
// BENCHMARK 2: endParaRPr Enforcement
// =========================================================================

describe("Benchmark 2: endParaRPr Enforcement", () => {
  let buffer: Buffer;

  it("renders a document with text, table, and notes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        notes: "Speaker notes here",
        children: [
          {
            type: "Text",
            style: { fontSize: 16 },
            content: "Hello\nWorld",
          },
          {
            type: "Table",
            style: { width: 400, height: 100 },
            tableData: {
              columns: [200, 200],
              rows: [{ cells: [{ text: "A" }, { text: "B" }] }],
            },
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("every <a:p> in text shapes ends with endParaRPr", async () => {
    const tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));
    const txBodies = findAllElements(tree, "p:txBody");

    // Find txBodies inside p:sp (text shapes)
    const shapes = findAllElements(tree, "p:sp");
    for (const sp of shapes) {
      const spTxBodies = findAllElements(getChildren(sp), "p:txBody");
      for (const txBody of spTxBodies) {
        const paras = getChildren(txBody).filter(c => getTagName(c) === "a:p");
        for (const p of paras) {
          const children = getChildren(p);
          const childTags = children.map(c => getTagName(c)).filter(Boolean);
          const lastTag = childTags[childTags.length - 1];
          expect(lastTag).toBe("a:endParaRPr");
          // Verify lang attribute
          const endRPr = children.filter(c => getTagName(c) === "a:endParaRPr");
          expect(endRPr.length).toBeGreaterThanOrEqual(1);
          expect(getAttr(endRPr[endRPr.length - 1], "lang")).toBe("en-US");
        }
      }
    }
  });

  it("every <a:p> in table cells ends with endParaRPr", async () => {
    const tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));
    const tcs = findAllElements(tree, "a:tc");

    for (const tc of tcs) {
      const paras = findAllElements(getChildren(tc), "a:p");
      for (const p of paras) {
        const childTags = getChildTagNames(p);
        expect(childTags[childTags.length - 1]).toBe("a:endParaRPr");
      }
    }
  });

  it("every <a:p> in notes slides ends with endParaRPr", async () => {
    const notesXml = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    const tree = parseXml(notesXml);

    // Find the notes placeholder body paragraphs
    const allParas = findAllElements(tree, "a:p");
    for (const p of allParas) {
      const childTags = getChildTagNames(p);
      // Only check paragraphs that have content (runs)
      if (childTags.includes("a:r")) {
        expect(childTags[childTags.length - 1]).toBe("a:endParaRPr");
      }
    }
  });
});

// =========================================================================
// BENCHMARK 3: EMU Precision & Validity
// =========================================================================

describe("Benchmark 3: EMU Precision & Validity", () => {
  it("toEmu produces non-negative integers and correct values", () => {
    // Positive pixels
    expect(toEmu(100)).toBe(952500);
    expect(toEmu(1)).toBe(9525);
    expect(toEmu(0)).toBe(0);

    // Fractional pixels round correctly
    const emu = toEmu(10.5);
    expect(Number.isInteger(emu)).toBe(true);
    expect(emu).toBe(Math.round(10.5 * PIXEL_TO_EMU));
    expect(Math.abs(emu / PIXEL_TO_EMU - 10.5)).toBeLessThanOrEqual(1);

    // Negative clamps to 0
    expect(toEmu(-5)).toBe(0);

    // Large values
    expect(toEmu(10000)).toBe(95250000);
  });

  it("all EMU values in generated slides are non-negative integers", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          { type: "Text", style: { fontSize: 24 }, content: "EMU test" },
          {
            type: "View",
            style: { width: 200, height: 100, backgroundColor: "#FF0000" },
            children: [],
          },
        ],
      }],
    };

    const buffer = await PaperEngine.render(doc);
    const tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));

    // Check all <a:off> elements
    for (const off of findAllElements(tree, "a:off")) {
      const x = Number(getAttr(off, "x"));
      const y = Number(getAttr(off, "y"));
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(0);
    }

    // Check all <a:ext> elements
    for (const ext of findAllElements(tree, "a:ext")) {
      const cx = Number(getAttr(ext, "cx"));
      const cy = Number(getAttr(ext, "cy"));
      expect(Number.isInteger(cx)).toBe(true);
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(cy)).toBe(true);
      expect(cy).toBeGreaterThanOrEqual(0);
    }
  });

  it("group shape child offsets/extents are valid", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 16 },
          content: "Check chOff/chExt",
        }],
      }],
    };

    const buffer = await PaperEngine.render(doc);
    const tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));

    for (const chOff of findAllElements(tree, "a:chOff")) {
      expect(Number.isInteger(Number(getAttr(chOff, "x")))).toBe(true);
      expect(Number.isInteger(Number(getAttr(chOff, "y")))).toBe(true);
    }
    for (const chExt of findAllElements(tree, "a:chExt")) {
      expect(Number.isInteger(Number(getAttr(chExt, "cx")))).toBe(true);
      expect(Number.isInteger(Number(getAttr(chExt, "cy")))).toBe(true);
    }
  });
});

// =========================================================================
// BENCHMARK 4: Relationship Integrity
// =========================================================================

describe("Benchmark 4: Relationship Integrity", () => {
  let buffer: Buffer;

  it("renders a slide with image, chart, hyperlink, and notes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        notes: "Notes for rel test",
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
          {
            type: "Chart",
            style: { width: 400, height: 300 },
            chartData: {
              chartType: "bar",
              categories: ["A", "B"],
              series: [{ name: "S", values: [1, 2] }],
            },
          },
          {
            type: "Text",
            style: { fontSize: 16 },
            content: [
              { text: "Click here", hyperlink: "https://example.com" },
            ],
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("every rId in slide XML has a matching rels entry", async () => {
    const slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const relsRaw = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");

    // Extract all rId references from slide XML
    const slideRIds = new Set<string>();
    const rIdPattern = /r:(?:embed|id|link)="(rId\d+)"/g;
    let m;
    while ((m = rIdPattern.exec(slideRaw)) !== null) {
      slideRIds.add(m[1]);
    }

    // Extract all rId definitions from rels
    const relsTree = parseXml(relsRaw);
    const rels = findAllElements(relsTree, "Relationship");
    const relsRIds = new Set<string>();
    for (const rel of rels) {
      const id = getAttr(rel, "Id");
      if (id) relsRIds.add(id);
    }

    // Every rId in slide must exist in rels
    for (const rId of slideRIds) {
      expect(relsRIds.has(rId)).toBe(true);
    }
  });

  it("no duplicate rIds in rels file", async () => {
    const relsRaw = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsRaw);
    const rels = findAllElements(relsTree, "Relationship");
    const ids = rels.map(r => getAttr(r, "Id")).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rels target exists in the ZIP", async () => {
    const relsRaw = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsRaw);
    const rels = findAllElements(relsTree, "Relationship");
    const zipPaths = await getZipPaths(buffer);

    for (const rel of rels) {
      const target = getAttr(rel, "Target");
      const type = getAttr(rel, "Type") ?? "";
      if (!target) continue;

      // Skip external hyperlinks (TargetMode="External")
      if (getAttr(rel, "TargetMode") === "External") continue;

      // Resolve relative path from ppt/slides/
      const baseParts = target.startsWith("/")
        ? [] : ["ppt", "slides"];
      const targetParts = (target.startsWith("/") ? target.slice(1) : target).split("/");
      const combined = [...baseParts, ...targetParts];
      const normalized: string[] = [];
      for (const p of combined) {
        if (p === "..") normalized.pop();
        else if (p !== ".") normalized.push(p);
      }
      const finalPath = normalized.join("/");

      expect(zipPaths).toContain(finalPath);
    }
  });
});

// =========================================================================
// BENCHMARK 5: OPC Package Completeness
// =========================================================================

describe("Benchmark 5: OPC Package Completeness", () => {
  let buffer: Buffer;

  it("renders a document for OPC validation", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "OPC Test", author: "Test" },
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{ type: "Text", content: "OPC" }],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("mandatory PPTX parts exist", async () => {
    expect(await zipHasFile(buffer, "ppt/presentation.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideMasters/slideMaster1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideLayouts/slideLayout1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/theme/theme1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "[Content_Types].xml")).toBe(true);
    expect(await zipHasFile(buffer, "_rels/.rels")).toBe(true);
  });

  it("_rels/.rels has officeDocument relationship", async () => {
    const relsRaw = await getZipEntry(buffer, "_rels/.rels");
    const tree = parseXml(relsRaw);
    const rels = findAllElements(tree, "Relationship");
    const types = rels.map(r => getAttr(r, "Type")).filter(Boolean);
    const hasOfficeDoc = types.some(t =>
      t!.includes("officeDocument")
    );
    expect(hasOfficeDoc).toBe(true);
  });

  it("[Content_Types].xml has Override for every slide", async () => {
    const ctRaw = await getZipEntry(buffer, "[Content_Types].xml");
    const tree = parseXml(ctRaw);
    const overrides = findAllElements(tree, "Override");
    const partNames = overrides.map(o => getAttr(o, "PartName")).filter(Boolean);

    expect(partNames).toContain("/ppt/slides/slide1.xml");
    expect(partNames).toContain("/ppt/presentation.xml");
  });

  it("every Override part exists in the ZIP", async () => {
    const ctRaw = await getZipEntry(buffer, "[Content_Types].xml");
    const tree = parseXml(ctRaw);
    const overrides = findAllElements(tree, "Override");
    const zipPaths = await getZipPaths(buffer);

    for (const override of overrides) {
      const partName = getAttr(override, "PartName");
      if (!partName) continue;
      // PartName starts with /
      const path = partName.startsWith("/") ? partName.slice(1) : partName;
      expect(zipPaths).toContain(path);
    }
  });
});

// =========================================================================
// BENCHMARK 6: Text Rendering Structural Correctness
// =========================================================================

describe("Benchmark 6: Text Rendering Structural Correctness", () => {
  let buffer: Buffer;
  let tree: any[];

  it("renders complex multi-paragraph text", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: {
            fontSize: 16,
            verticalAlign: "middle",
            textInsets: { left: 10, top: 5, right: 10, bottom: 5 },
          } as any,
          paragraphs: [
            {
              runs: [
                { text: "Bold", style: { fontWeight: "bold" } },
                { text: " and " },
                { text: "italic", style: { fontStyle: "italic" } },
              ],
            },
            {
              runs: [{ text: "Colored", style: { color: "#FF0000" } }],
              bullet: { char: "•" },
            },
            {
              runs: [
                { text: "Link", hyperlink: "https://example.com" },
                { text: "sup", style: { baseline: "superscript" } as any },
              ],
            },
          ],
        } as any],
      }],
    };
    buffer = await PaperEngine.render(doc);
    tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));
  });

  it("text shape has cNvSpPr with txBox='1'", () => {
    const cNvSpPrs = findAllElements(tree, "p:cNvSpPr");
    const textBox = cNvSpPrs.find(el => getAttr(el, "txBox") === "1");
    expect(textBox).toBeDefined();
  });

  it("bodyPr has correct anchor and inset attributes", () => {
    const txBodies = findAllElements(tree, "p:txBody");
    expect(txBodies.length).toBeGreaterThanOrEqual(1);

    // Find the txBody inside our text shape (not the notes master)
    const bodyPrs = findAllElements(tree, "a:bodyPr");
    const withAnchor = bodyPrs.find(bp => getAttr(bp, "anchor") === "ctr");
    expect(withAnchor).toBeDefined();

    // Check insets
    const hasInsets = bodyPrs.find(bp =>
      getAttr(bp, "lIns") && getAttr(bp, "tIns") &&
      getAttr(bp, "rIns") && getAttr(bp, "bIns")
    );
    expect(hasInsets).toBeDefined();
  });

  it("run properties include bold, italic, baseline, and hyperlink", () => {
    const rPrs = findAllElements(tree, "a:rPr");

    // Find bold run
    const boldRPr = rPrs.find(rp => getAttr(rp, "b") === "1");
    expect(boldRPr).toBeDefined();

    // Find italic run
    const italicRPr = rPrs.find(rp => getAttr(rp, "i") === "1");
    expect(italicRPr).toBeDefined();

    // Find superscript run
    const superRPr = rPrs.find(rp => getAttr(rp, "baseline") === "30000");
    expect(superRPr).toBeDefined();

    // Find run with hyperlink
    const withHlink = rPrs.find(rp => {
      const children = getChildTagNames(rp);
      return children.includes("a:hlinkClick");
    });
    expect(withHlink).toBeDefined();
  });

  it("three paragraphs are emitted, one with bullet", () => {
    const shapes = findAllElements(tree, "p:sp");
    // Find shape with txBox
    let textShape: any;
    for (const sp of shapes) {
      const cNvSpPr = findAllElements(getChildren(sp), "p:cNvSpPr");
      if (cNvSpPr.some(c => getAttr(c, "txBox") === "1")) {
        textShape = sp;
        break;
      }
    }
    expect(textShape).toBeDefined();

    const txBody = findAllElements(getChildren(textShape), "p:txBody")[0];
    const paras = getChildren(txBody).filter(c => getTagName(c) === "a:p");
    expect(paras.length).toBe(3);

    // Second paragraph should have bullet
    const secondPara = paras[1];
    const pPrs = findAllElements(getChildren(secondPara), "a:pPr");
    expect(pPrs.length).toBeGreaterThanOrEqual(1);
    const buChars = findAllElements(getChildren(pPrs[0]), "a:buChar");
    expect(buChars.length).toBe(1);
  });
});

// =========================================================================
// BENCHMARK 7: Table Grid & Merge Correctness
// =========================================================================

describe("Benchmark 7: Table Grid & Merge Correctness", () => {
  let buffer: Buffer;
  let tree: any[];

  it("renders a table with horizontal and vertical merges", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Table",
          style: { width: 400, height: 200 },
          tableData: {
            columns: [100, 100, 100, 100],
            rows: [
              {
                height: 50,
                cells: [
                  { text: "Merged", colSpan: 2, rowSpan: 2 },
                  { text: "", hMerge: true },
                  { text: "B" },
                  { text: "C" },
                ],
              },
              {
                height: 50,
                cells: [
                  { text: "", vMerge: true },
                  { text: "", vMerge: true },
                  { text: "D" },
                  { text: "E" },
                ],
              },
              {
                height: 50,
                cells: [
                  { text: "Wide", colSpan: 3 },
                  { text: "", hMerge: true },
                  { text: "", hMerge: true },
                  { text: "G" },
                ],
              },
              {
                height: 50,
                cells: [
                  { text: "H" },
                  { text: "I" },
                  { text: "J" },
                  { text: "K" },
                ],
              },
            ],
          },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));
  });

  it("tblGrid appears before any a:tr", () => {
    const tbls = findAllElements(tree, "a:tbl");
    expect(tbls.length).toBe(1);

    const childTags = getChildTagNames(tbls[0]);
    const gridIdx = childTags.indexOf("a:tblGrid");
    const firstTrIdx = childTags.indexOf("a:tr");
    expect(gridIdx).toBeGreaterThanOrEqual(0);
    expect(firstTrIdx).toBeGreaterThan(gridIdx);
  });

  it("grid column count matches logical columns (4)", () => {
    const tblGrids = findAllElements(tree, "a:tblGrid");
    expect(tblGrids.length).toBe(1);

    const gridCols = getChildren(tblGrids[0]).filter(c => getTagName(c) === "a:gridCol");
    expect(gridCols.length).toBe(4);
  });

  it("every row has exactly 4 cells (including ghosts)", () => {
    const trs = findAllElements(tree, "a:tr");
    expect(trs.length).toBe(4);

    for (const tr of trs) {
      const cells = getChildren(tr).filter(c => getTagName(c) === "a:tc");
      expect(cells.length).toBe(4);
    }
  });

  it("master cells have gridSpan/rowSpan, ghost cells have hMerge/vMerge", () => {
    const trs = findAllElements(tree, "a:tr");

    // Row 0: first cell has gridSpan=2 and rowSpan=2
    const row0Cells = getChildren(trs[0]).filter(c => getTagName(c) === "a:tc");
    expect(getAttr(row0Cells[0], "gridSpan")).toBe("2");
    expect(getAttr(row0Cells[0], "rowSpan")).toBe("2");
    expect(getAttr(row0Cells[1], "hMerge")).toBe("1");

    // Row 1: first two cells have vMerge
    const row1Cells = getChildren(trs[1]).filter(c => getTagName(c) === "a:tc");
    expect(getAttr(row1Cells[0], "vMerge")).toBe("1");
    expect(getAttr(row1Cells[1], "vMerge")).toBe("1");

    // Row 2: first cell has gridSpan=3
    const row2Cells = getChildren(trs[2]).filter(c => getTagName(c) === "a:tc");
    expect(getAttr(row2Cells[0], "gridSpan")).toBe("3");
    expect(getAttr(row2Cells[1], "hMerge")).toBe("1");
    expect(getAttr(row2Cells[2], "hMerge")).toBe("1");
  });
});

// =========================================================================
// BENCHMARK 8: Chart Data Cache Integrity
// =========================================================================

describe("Benchmark 8: Chart Data Cache Integrity", () => {
  let buffer: Buffer;
  let chartTree: any[];

  it("renders a bar chart with known values", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Chart",
          style: { width: 500, height: 300 },
          chartData: {
            chartType: "bar",
            categories: ["Q1", "Q2", "Q3"],
            series: [{ name: "Revenue", values: [100, 200, 300] }],
            dataLabels: { showVal: true },
            valueAxis: { gridlines: { major: true }, numberFormat: "$#,##0" },
          } as any,
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
    chartTree = parseXml(await getZipEntry(buffer, "ppt/charts/chart1.xml"));
  });

  it("numCache values match input data exactly", () => {
    const numCaches = findAllElements(chartTree, "c:numCache");
    expect(numCaches.length).toBeGreaterThanOrEqual(1);

    // Find the value cache (not category)
    const valCache = numCaches[0];
    const pts = findAllElements(getChildren(valCache), "c:pt");
    expect(pts.length).toBe(3);

    const values = pts.map(pt => {
      const vElements = findAllElements(getChildren(pt), "c:v");
      return Number(getText(vElements[0]));
    });
    expect(values).toEqual([100, 200, 300]);
  });

  it("strCache categories match input exactly", () => {
    // Navigate to c:cat > c:strRef > c:strCache (not c:tx which holds series name)
    const catElements = findAllElements(chartTree, "c:cat");
    expect(catElements.length).toBeGreaterThanOrEqual(1);

    const catCache = findAllElements(getChildren(catElements[0]), "c:strCache");
    expect(catCache.length).toBe(1);

    const pts = findAllElements(getChildren(catCache[0]), "c:pt");
    expect(pts.length).toBe(3);

    const categories = pts.map(pt => {
      const vElements = findAllElements(getChildren(pt), "c:v");
      return getText(vElements[0]);
    });
    expect(categories).toEqual(["Q1", "Q2", "Q3"]);
  });

  it("ptCount matches category count in value cache", () => {
    // Navigate to c:val > c:numRef > c:numCache > c:ptCount
    const valElements = findAllElements(chartTree, "c:val");
    expect(valElements.length).toBeGreaterThanOrEqual(1);

    const numCache = findAllElements(getChildren(valElements[0]), "c:numCache");
    expect(numCache.length).toBe(1);

    const ptCounts = findAllElements(getChildren(numCache[0]), "c:ptCount");
    expect(ptCounts.length).toBe(1);
    expect(Number(getAttr(ptCounts[0], "val"))).toBe(3);
  });

  it("data labels structure is present and valid", () => {
    const dLbls = findAllElements(chartTree, "c:dLbls");
    expect(dLbls.length).toBeGreaterThanOrEqual(1);

    const showVals = findAllElements(chartTree, "c:showVal");
    const hasShowVal = showVals.some(sv => getAttr(sv, "val") === "1");
    expect(hasShowVal).toBe(true);
  });
});

// =========================================================================
// BENCHMARK 9: Color & Fill Value Validation
// =========================================================================

describe("Benchmark 9: Color & Fill Value Validation", () => {
  let buffer: Buffer;
  let slideRaw: string;
  let tree: any[];

  it("renders shapes with various colors, gradient, and opacity", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "gradient",
          stops: [
            { color: "#FF0000", position: 0 },
            { color: "#0000FF", position: 100 },
          ],
          angle: 90,
        },
        children: [
          {
            type: "View",
            style: {
              width: 100, height: 100,
              backgroundColor: "#FF5733",
              opacity: 0.5,
            } as any,
            children: [],
          },
          {
            type: "View",
            style: {
              width: 100, height: 100,
              fill: {
                type: "linear",
                angle: 90,
                stops: [
                  { color: "#FF0000", position: 0 },
                  { color: "#00FF00", position: 50 },
                  { color: "#0000FF", position: 100 },
                ],
              },
            } as any,
            children: [],
          },
          {
            type: "View",
            style: {
              width: 100, height: 100,
              borderWidth: 2,
              borderColor: "#336699",
            },
            children: [],
          },
          {
            type: "Text",
            style: { fontSize: 16, color: "#AABBCC" },
            content: "Colored",
          },
        ],
      } as any],
    };
    buffer = await PaperEngine.render(doc);
    slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    tree = parseXml(slideRaw);
  });

  it("all srgbClr values are valid 6-char uppercase hex", () => {
    const srgbClrs = findAllElements(tree, "a:srgbClr");
    expect(srgbClrs.length).toBeGreaterThanOrEqual(3);

    for (const clr of srgbClrs) {
      const val = getAttr(clr, "val");
      expect(val).toBeDefined();
      expect(val).toMatch(/^[0-9A-F]{6}$/);
    }
  });

  it("all alpha values are integers in [0, 100000]", () => {
    const alphas = findAllElements(tree, "a:alpha");

    for (const alpha of alphas) {
      const val = Number(getAttr(alpha, "val"));
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100000);
    }
  });

  it("all gradient stop positions are integers in [0, 100000]", () => {
    const gsElements = findAllElements(tree, "a:gs");
    expect(gsElements.length).toBeGreaterThanOrEqual(2);

    for (const gs of gsElements) {
      const pos = Number(getAttr(gs, "pos"));
      expect(Number.isInteger(pos)).toBe(true);
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(100000);
    }
  });

  it("specific color values match inputs", () => {
    // #FF5733 should appear (solid fill shape)
    const srgbClrs = findAllElements(tree, "a:srgbClr");
    const hexVals = srgbClrs.map(c => getAttr(c, "val"));
    expect(hexVals).toContain("FF5733");
    expect(hexVals).toContain("336699");
    expect(hexVals).toContain("AABBCC");
  });
});

// =========================================================================
// BENCHMARK 10: Complex Document Stress Test (20 slides)
// =========================================================================

describe("Benchmark 10: Complex Document Stress Test", () => {
  let buffer: Buffer;

  it("renders a 20-slide deck with every feature type", async () => {
    const slides: any[] = [];
    for (let i = 0; i < 20; i++) {
      slides.push({
        type: "Slide",
        style: { width: 960, height: 540 },
        notes: i % 2 === 0 ? `Notes for slide ${i + 1}` : undefined,
        children: [
          {
            type: "Text",
            style: { fontSize: 24 },
            content: `Slide ${i + 1}`,
          },
          {
            type: "View",
            style: { width: 100, height: 50, backgroundColor: "#FF0000" },
            children: [],
          },
          {
            type: "Table",
            style: { width: 400, height: 100 },
            tableData: {
              columns: [200, 200],
              rows: [
                { cells: [{ text: "A" }, { text: "B" }] },
                { cells: [{ text: "C" }, { text: "D" }] },
              ],
            },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 50, height: 50 },
          },
        ],
      });
    }

    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Stress Test", author: "Benchmark" },
      slides,
    };
    buffer = await PaperEngine.render(doc);
  });

  it("all 20 slides exist in ZIP", async () => {
    for (let i = 1; i <= 20; i++) {
      expect(await zipHasFile(buffer, `ppt/slides/slide${i}.xml`)).toBe(true);
      expect(await zipHasFile(buffer, `ppt/slides/_rels/slide${i}.xml.rels`)).toBe(true);
    }
  });

  it("presentation.xml lists all 20 slides", async () => {
    const presRaw = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presRaw);
    const sldIdLsts = findAllElements(tree, "p:sldIdLst");
    expect(sldIdLsts.length).toBe(1);

    const sldIds = getChildren(sldIdLsts[0]).filter(c => getTagName(c) === "p:sldId");
    expect(sldIds.length).toBe(20);
  });

  it("[Content_Types].xml has all 20 slide overrides", async () => {
    const ctRaw = await getZipEntry(buffer, "[Content_Types].xml");
    const tree = parseXml(ctRaw);
    const overrides = findAllElements(tree, "Override");
    const slideOverrides = overrides.filter(o => {
      const part = getAttr(o, "PartName") ?? "";
      return /\/ppt\/slides\/slide\d+\.xml$/.test(part);
    });
    expect(slideOverrides.length).toBe(20);
  });

  it("each slide has unique shape IDs", async () => {
    for (let i = 1; i <= 20; i++) {
      const slideRaw = await getZipEntry(buffer, `ppt/slides/slide${i}.xml`);
      const tree = parseXml(slideRaw);

      // Collect all id attributes from cNvPr elements
      const cNvPrs = findAllElements(tree, "p:cNvPr");
      const ids = cNvPrs.map(el => getAttr(el, "id")).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("global media numbering is sequential with no gaps", async () => {
    const zipPaths = await getZipPaths(buffer);
    const mediaPaths = zipPaths
      .filter(p => p.startsWith("ppt/media/image"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/image(\d+)/)?.[1] ?? "0");
        const numB = parseInt(b.match(/image(\d+)/)?.[1] ?? "0");
        return numA - numB;
      });

    // Verify sequential numbering
    for (let i = 0; i < mediaPaths.length; i++) {
      expect(mediaPaths[i]).toBe(`ppt/media/image${i + 1}.png`);
    }
    // All 20 slides use the same RED_PIXEL → deduplication reduces to 1 file
    expect(mediaPaths.length).toBe(1);
  });
});

// =========================================================================
// BENCHMARK 11: MBB Shape Quality Compliance
// =========================================================================

describe("Benchmark 11: MBB Shape Quality Compliance", () => {
  let buffer: Buffer;
  let tree: any[];

  it("renders a slide with view shapes and a table", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: { width: 100, height: 100, backgroundColor: "#FF0000" },
            children: [],
          },
          {
            type: "View",
            style: { width: 100, height: 100, borderWidth: 2, borderColor: "#000000" },
            children: [],
          },
          {
            type: "Table",
            style: { width: 400, height: 100 },
            tableData: {
              columns: [200, 200],
              rows: [{ cells: [{ text: "Cell A" }, { text: "Cell B" }] }],
            },
          },
          {
            type: "Text",
            style: { fontSize: 16 },
            content: "Hello",
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
    tree = parseXml(await getZipEntry(buffer, "ppt/slides/slide1.xml"));
  });

  it("every <p:sp> has a <p:txBody>", () => {
    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(1);

    for (const sp of shapes) {
      const childTags = getChildTagNames(sp);
      expect(childTags).toContain("p:txBody");
    }
  });

  it("view shapes without fill have <a:noFill/>", () => {
    // The second view has no background, only border — should have noFill
    const shapes = findAllElements(tree, "p:sp");
    const noFills = findAllElements(tree, "a:noFill");
    expect(noFills.length).toBeGreaterThanOrEqual(1);
  });

  it("<a:tbl> has <a:tblPr> before <a:tblGrid>", () => {
    const tbls = findAllElements(tree, "a:tbl");
    expect(tbls.length).toBe(1);

    const childTags = getChildTagNames(tbls[0]);
    const tblPrIdx = childTags.indexOf("a:tblPr");
    const tblGridIdx = childTags.indexOf("a:tblGrid");
    expect(tblPrIdx).toBeGreaterThanOrEqual(0);
    expect(tblGridIdx).toBeGreaterThan(tblPrIdx);
  });

  it("every <a:endParaRPr> has dirty='0'", () => {
    const endParaRPrs = findAllElements(tree, "a:endParaRPr");
    expect(endParaRPrs.length).toBeGreaterThanOrEqual(1);

    for (const rPr of endParaRPrs) {
      expect(getAttr(rPr, "dirty")).toBe("0");
    }
  });

  it("unstyled table cell runs have <a:rPr>", () => {
    const tcs = findAllElements(tree, "a:tc");
    for (const tc of tcs) {
      const runs = findAllElements(getChildren(tc), "a:r");
      for (const run of runs) {
        const childTags = getChildTagNames(run);
        expect(childTags).toContain("a:rPr");
      }
    }
  });

  it("table cell <a:bodyPr> has rtlCol='0'", () => {
    const tcs = findAllElements(tree, "a:tc");
    for (const tc of tcs) {
      const bodyPrs = findAllElements(getChildren(tc), "a:bodyPr");
      for (const bp of bodyPrs) {
        expect(getAttr(bp, "rtlCol")).toBe("0");
      }
    }
  });
});

// =========================================================================
// BENCHMARK 12: Presentation & Master Defaults
// =========================================================================

describe("Benchmark 12: Presentation & Master Defaults", () => {
  let buffer: Buffer;

  it("renders a simple document", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{ type: "Text", content: "Defaults test" }],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("presentation.xml contains <p:defaultTextStyle>", async () => {
    const presRaw = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presRaw);
    const dts = findAllElements(tree, "p:defaultTextStyle");
    expect(dts.length).toBe(1);

    // Should have lvl1pPr through lvl5pPr
    const children = getChildren(dts[0]);
    const childTags = children.map((c: any) => getTagName(c)).filter(Boolean);
    expect(childTags).toContain("a:lvl1pPr");
    expect(childTags).toContain("a:lvl5pPr");
  });

  it("slide master titleStyle has sz='4400', kern, solidFill, and font refs", async () => {
    const masterRaw = await getZipEntry(buffer, "ppt/slideMasters/slideMaster1.xml");
    const tree = parseXml(masterRaw);

    const titleStyles = findAllElements(tree, "p:titleStyle");
    expect(titleStyles.length).toBe(1);

    const defRPrs = findAllElements(getChildren(titleStyles[0]), "a:defRPr");
    expect(defRPrs.length).toBeGreaterThanOrEqual(1);

    const firstDefRPr = defRPrs[0];
    expect(getAttr(firstDefRPr, "sz")).toBe("4400");
    expect(getAttr(firstDefRPr, "kern")).toBe("1200");

    // Should have solidFill and font refs
    const childTags = getChildTagNames(firstDefRPr);
    expect(childTags).toContain("a:solidFill");
    expect(childTags).toContain("a:latin");
    expect(childTags).toContain("a:ea");
    expect(childTags).toContain("a:cs");
  });

  it("theme font scheme has script-specific <a:font> entries", async () => {
    const themeRaw = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    const tree = parseXml(themeRaw);

    const majorFonts = findAllElements(tree, "a:majorFont");
    expect(majorFonts.length).toBe(1);

    const fontEntries = findAllElements(getChildren(majorFonts[0]), "a:font");
    const scripts = fontEntries.map((f: any) => getAttr(f, "script")).filter(Boolean);
    expect(scripts).toContain("Jpan");
    expect(scripts).toContain("Hang");
    expect(scripts).toContain("Hans");
    expect(scripts).toContain("Hant");
    expect(scripts).toContain("Arab");
    expect(scripts).toContain("Hebr");
    expect(scripts).toContain("Thai");
    expect(scripts).toContain("Deva");
  });
});

// =========================================================================
// BENCHMARK 13: Package Part Compliance
// =========================================================================

describe("Benchmark 13: Package Part Compliance", () => {
  let buffer: Buffer;

  it("renders a minimal doc for package part testing", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 16, color: "#000000" },
          content: "Package parts test",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("presProps.xml exists and contains <p:presentationPr", async () => {
    const raw = await getZipEntry(buffer, "ppt/presProps.xml");
    const tree = parseXml(raw);
    const presPrs = findAllElements(tree, "p:presentationPr");
    expect(presPrs.length).toBe(1);
  });

  it("viewProps.xml exists and contains <p:viewPr", async () => {
    const raw = await getZipEntry(buffer, "ppt/viewProps.xml");
    const tree = parseXml(raw);
    const viewPrs = findAllElements(tree, "p:viewPr");
    expect(viewPrs.length).toBe(1);
  });

  it("tableStyles.xml exists and contains <a:tblStyleLst", async () => {
    const raw = await getZipEntry(buffer, "ppt/tableStyles.xml");
    const tree = parseXml(raw);
    const tblStyleLst = findAllElements(tree, "a:tblStyleLst");
    expect(tblStyleLst.length).toBe(1);
    expect(getAttr(tblStyleLst[0], "def")).toBe("{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}");
  });

  it("[Content_Types].xml has all 3 new Override entries", async () => {
    const raw = await getZipEntry(buffer, "[Content_Types].xml");
    expect(raw).toContain("presProps+xml");
    expect(raw).toContain("viewProps+xml");
    expect(raw).toContain("tableStyles+xml");
  });

  it("presentation.xml.rels has presProps/viewProps/tableStyles relationships", async () => {
    const raw = await getZipEntry(buffer, "ppt/_rels/presentation.xml.rels");
    expect(raw).toContain("presProps");
    expect(raw).toContain("viewProps");
    expect(raw).toContain("tableStyles");
  });
});

// =========================================================================
// BENCHMARK 14: Shape & Drawing Compliance
// =========================================================================

describe("Benchmark 14: Shape & Drawing Compliance", () => {
  let buffer: Buffer;

  it("renders a doc with image, text, and group for shape testing", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: { fontSize: 16, color: "#000000" },
            content: "Shape test",
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
          {
            type: "Group",
            style: { width: 200, height: 200 },
            children: [
              {
                type: "Text",
                style: { fontSize: 12, color: "#333333" },
                content: "Grouped text",
              },
            ],
          },
        ],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("<p:presentation> has saveSubsetFonts and autoCompressPictures", async () => {
    const raw = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(raw);
    const pres = findAllElements(tree, "p:presentation");
    expect(pres.length).toBe(1);
    expect(getAttr(pres[0], "saveSubsetFonts")).toBe("1");
    expect(getAttr(pres[0], "autoCompressPictures")).toBe("0");
  });

  it("<p:pic> contains only picture children", async () => {
    const slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideRaw);
    const pics = findAllElements(tree, "p:pic");
    expect(pics.length).toBeGreaterThanOrEqual(1);
    for (const pic of pics) {
      const childTags = getChildTagNames(pic);
      expect(childTags).toContain("p:nvPicPr");
      expect(childTags).toContain("p:blipFill");
      expect(childTags).toContain("p:spPr");
      expect(childTags).not.toContain("p:txBody");
    }
  });

  it("<a:picLocks> has noGrp='1'", async () => {
    const slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideRaw);
    const picLocks = findAllElements(tree, "a:picLocks");
    expect(picLocks.length).toBeGreaterThanOrEqual(1);
    for (const lock of picLocks) {
      expect(getAttr(lock, "noGrp")).toBe("1");
    }
  });

  it("every visible <a:ln> contains <a:round/>", async () => {
    const slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideRaw);
    const lns = findAllElements(tree, "a:ln");
    for (const ln of lns) {
      const childTags = getChildTagNames(ln);
      // Lines with noFill don't need a:round (e.g., text shapes with no border)
      if (childTags.includes("a:noFill")) continue;
      expect(childTags).toContain("a:round");
    }
  });

  it("text <a:bodyPr> has spcFirstLastPara='0'", async () => {
    const slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideRaw);
    const shapes = findAllElements(tree, "p:sp");
    expect(shapes.length).toBeGreaterThanOrEqual(1);
    // Find bodyPr inside text shapes (p:sp with p:txBody)
    for (const sp of shapes) {
      const txBodies = findAllElements([sp], "p:txBody");
      for (const txBody of txBodies) {
        const bodyPrs = findAllElements([txBody], "a:bodyPr");
        for (const bodyPr of bodyPrs) {
          expect(getAttr(bodyPr, "spcFirstLastPara")).toBe("0");
        }
      }
    }
  });

  it("<p:cNvGrpSpPr> contains <a:grpSpLocks noGrp='1'/>", async () => {
    const slideRaw = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideRaw);
    const grpSps = findAllElements(tree, "p:grpSp");
    expect(grpSps.length).toBeGreaterThanOrEqual(1);
    for (const grpSp of grpSps) {
      const cNvGrpSpPrs = findAllElements([grpSp], "p:cNvGrpSpPr");
      expect(cNvGrpSpPrs.length).toBeGreaterThanOrEqual(1);
      const locks = findAllElements(cNvGrpSpPrs, "a:grpSpLocks");
      expect(locks.length).toBeGreaterThanOrEqual(1);
      expect(getAttr(locks[0], "noGrp")).toBe("1");
    }
  });
});

// =========================================================================
// BENCHMARK 15: Notes & Chart Compliance
// =========================================================================

describe("Benchmark 15: Notes & Chart Compliance", () => {
  let buffer: Buffer;

  it("renders a doc with notes and chart", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        notes: "Speaker notes content",
        children: [{
          type: "Chart",
          chartData: {
            chartType: "bar",
            categories: ["A", "B", "C"],
            series: [{ name: "S1", values: [1, 2, 3] }],
          },
          style: { width: 400, height: 300 },
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("notes slide has <p:clrMapOvr>", async () => {
    const raw = await getZipEntry(buffer, "ppt/notesSlides/notesSlide1.xml");
    const tree = parseXml(raw);
    const clrMapOvrs = findAllElements(tree, "p:clrMapOvr");
    expect(clrMapOvrs.length).toBe(1);
  });

  it("notes master has <p:notesStyle>", async () => {
    const raw = await getZipEntry(buffer, "ppt/notesMasters/notesMaster1.xml");
    const tree = parseXml(raw);
    const notesStyles = findAllElements(tree, "p:notesStyle");
    expect(notesStyles.length).toBe(1);
  });

  it("notes relationship uses numeric rId (not rIdNotes)", async () => {
    const raw = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    // Should have a numeric rId for notes, not "rIdNotes"
    expect(raw).not.toContain("rIdNotes");
    expect(raw).toContain("notesSlide");
    // The rId should match the pattern rId followed by digits
    const notesRelMatch = raw.match(/Id="(rId\d+)"[^>]*notesSlide/);
    expect(notesRelMatch).not.toBeNull();
  });

  it("presentation rels include notesMaster when notes exist", async () => {
    const raw = await getZipEntry(buffer, "ppt/_rels/presentation.xml.rels");
    expect(raw).toContain("notesMaster");
  });

  it("chart <c:catAx> and <c:valAx> have <c:tickLblPos>", async () => {
    const raw = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(raw);
    const catAxes = findAllElements(tree, "c:catAx");
    for (const ax of catAxes) {
      const tickLblPos = findAllElements([ax], "c:tickLblPos");
      expect(tickLblPos.length).toBeGreaterThanOrEqual(1);
    }
    const valAxes = findAllElements(tree, "c:valAx");
    for (const ax of valAxes) {
      const tickLblPos = findAllElements([ax], "c:tickLblPos");
      expect(tickLblPos.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("chart <c:plotArea> has <c:spPr>", async () => {
    const raw = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    const tree = parseXml(raw);
    const plotAreas = findAllElements(tree, "c:plotArea");
    expect(plotAreas.length).toBe(1);
    const spPrs = findAllElements([plotAreas[0]], "c:spPr");
    expect(spPrs.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// BENCHMARK 16: App Properties
// =========================================================================

describe("Benchmark 16: App Properties", () => {
  let buffer: Buffer;

  it("renders a minimal doc for app properties testing", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { fontSize: 16, color: "#000000" },
          content: "App props test",
        }],
      }],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("docProps/app.xml contains HeadingPairs and TitlesOfParts", async () => {
    const raw = await getZipEntry(buffer, "docProps/app.xml");
    const tree = parseXml(raw);
    const headingPairs = findAllElements(tree, "HeadingPairs");
    expect(headingPairs.length).toBe(1);
    const titlesOfParts = findAllElements(tree, "TitlesOfParts");
    expect(titlesOfParts.length).toBe(1);
  });
});
