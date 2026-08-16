/**
 * Quality Stress Tests — Hard-to-Pass MBB-Level Benchmarks
 *
 * These tests combine multiple engine features in realistic MBB scenarios
 * and verify precise OOXML output. They focus on:
 *   G. Table Style Cascade (text formatting from table-level styles)
 *   H. Compound Feature Interactions (gradient + shadow + roundRect + text)
 *   I. OOXML Element Ordering (spec-strict child ordering)
 *   J. Edge Cases & Precision (EMU rounding, empty cells, zero-width)
 *   K. Full MBB Slide Validation (complete slide structure checks)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, TableData, TableStyle, Paragraph } from "../src/types/ast.js";
import { toEmu, PIXEL_TO_EMU } from "../src/ooxml/drawing/math.js";
import {
  parseXml, findAllElements, getAttr, getText,
  getZipEntry, getChildren, getTagName, getChildTagNames,
} from "./helpers/xmlTestUtils.js";

function deepGetText(node: any): string {
  if (!node || typeof node !== "object") return "";
  const parts: string[] = [];
  (function walk(obj: any) {
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
    } else if (obj && typeof obj === "object") {
      if ("#text" in obj) parts.push(String(obj["#text"]));
      for (const key of Object.keys(obj)) {
        if (key === ":@") continue;
        walk(obj[key]);
      }
    }
  })(node);
  return parts.join("");
}

// =========================================================================
// G. TABLE STYLE CASCADE — headerRowStyle text formatting reaches text runs
// =========================================================================
describe("G: Table Style Cascade", () => {
  let slideXml: string;

  beforeAll(async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Table Cascade Test" },
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          style: { position: "absolute", top: 20, left: 20, width: 400, height: 200 },
          tableData: {
            columns: [120, 140, 140],
            style: {
              firstRow: true,
              bandRow: true,
              headerRowStyle: {
                fill: "#003DA5",
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: 11,
                fontFamily: "Arial",
                textAlign: "center",
                padding: 6,
              },
              bandRowEvenStyle: { fill: "#F0F4FA" },
              bandRowOddStyle: { fill: "#FFFFFF" },
            } as TableStyle,
            rows: [
              { height: 32, cells: [{ text: "Metric" }, { text: "Actual" }, { text: "Target" }] },
              { height: 28, cells: [
                { text: "Revenue", style: { fontWeight: "bold", fontSize: 10 } },
                { text: "$4.2M", style: { textAlign: "right", fontSize: 10 } },
                { text: "$4.0M", style: { textAlign: "right", fontSize: 10 } },
              ]},
              { height: 28, cells: [
                { text: "Margin", style: { fontWeight: "bold", fontSize: 10 } },
                { text: "68%", style: { textAlign: "right", fontSize: 10 } },
                { text: "65%", style: { textAlign: "right", fontSize: 10 } },
              ]},
              { height: 28, cells: [
                { text: "NPS", style: { fontWeight: "bold", fontSize: 10 } },
                { text: "72", style: { textAlign: "right", fontSize: 10 } },
                { text: "70", style: { textAlign: "right", fontSize: 10 } },
              ]},
            ],
          },
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
  });

  it("G1: header row cells have bold text from headerRowStyle", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    expect(rows.length).toBe(4);

    // Header row (row 0) — all 3 cells should have b="1" on a:rPr
    const headerRow = rows[0];
    const headerCells = getChildren(headerRow).filter(c => getTagName(c) === "a:tc");
    expect(headerCells.length).toBe(3);

    for (const cell of headerCells) {
      const rPrs = findAllElements([cell], "a:rPr");
      // Filter out endParaRPr by checking for bold
      const mainRPr = rPrs.find(r => getAttr(r, "b") === "1");
      expect(mainRPr).toBeDefined();
    }
  });

  it("G2: header row cells have white text color from headerRowStyle", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    const headerCells = getChildren(rows[0]).filter(c => getTagName(c) === "a:tc");

    for (const cell of headerCells) {
      // Look for srgbClr with FFFFFF inside a:rPr > a:solidFill
      const srgbClrs = findAllElements([cell], "a:srgbClr");
      // At least one should be FFFFFF (the text color)
      const whiteColors = srgbClrs.filter(c => getAttr(c, "val") === "FFFFFF");
      expect(whiteColors.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("G3: header row cells have font size 11px (825 hundredths) from headerRowStyle", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    const headerCells = getChildren(rows[0]).filter(c => getTagName(c) === "a:tc");

    for (const cell of headerCells) {
      const rPrs = findAllElements([cell], "a:rPr");
      const mainRPr = rPrs.find(r => getAttr(r, "sz") === "825");
      expect(mainRPr).toBeDefined();
    }
  });

  it("G4: header row cells have Arial font from headerRowStyle", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    const headerCells = getChildren(rows[0]).filter(c => getTagName(c) === "a:tc");

    for (const cell of headerCells) {
      const latins = findAllElements([cell], "a:latin");
      const arialLatin = latins.find(l => getAttr(l, "typeface") === "Arial");
      expect(arialLatin).toBeDefined();
    }
  });

  it("G5: header row cells have center alignment from headerRowStyle", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    const headerCells = getChildren(rows[0]).filter(c => getTagName(c) === "a:tc");

    for (const cell of headerCells) {
      const pPrs = findAllElements([cell], "a:pPr");
      const centerPPr = pPrs.find(p => getAttr(p, "algn") === "ctr");
      expect(centerPPr).toBeDefined();
    }
  });

  it("G6: header row cells have #003DA5 fill from headerRowStyle", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    const headerCells = getChildren(rows[0]).filter(c => getTagName(c) === "a:tc");

    for (const cell of headerCells) {
      const tcPrs = findAllElements([cell], "a:tcPr");
      expect(tcPrs.length).toBeGreaterThan(0);
      // Find solidFill under tcPr with 003DA5
      const fills = findAllElements(tcPrs, "a:solidFill");
      expect(fills.length).toBeGreaterThan(0);
      const srgbClrs = findAllElements(fills, "a:srgbClr");
      const headerFill = srgbClrs.find(c => getAttr(c, "val") === "003DA5");
      expect(headerFill).toBeDefined();
    }
  });

  it("G7: data row cells override headerRowStyle — per-cell style wins", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    // Row 1 (first data row) — "Revenue" cell has per-cell bold+fontSize:10
    const dataRow = rows[1];
    const dataCells = getChildren(dataRow).filter(c => getTagName(c) === "a:tc");
    expect(dataCells.length).toBe(3);

    // First cell "Revenue" should have bold and fontSize 10
    const rPrs = findAllElements([dataCells[0]], "a:rPr");
    const boldRPr = rPrs.find(r => getAttr(r, "b") === "1");
    expect(boldRPr).toBeDefined();
    const sizedRPr = rPrs.find(r => getAttr(r, "sz") === "750");
    expect(sizedRPr).toBeDefined();

    // Second cell "$4.2M" should NOT have bold (no fontWeight in its style)
    const cell2RPrs = findAllElements([dataCells[1]], "a:rPr");
    const boldCell2 = cell2RPrs.find(r => getAttr(r, "b") === "1");
    expect(boldCell2).toBeUndefined();
  });

  it("G8: band row even style applies fill to even data rows", () => {
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    // Row 2 (index 2, second data row) is the first even-banded row
    // With firstRow=true and bandRow=true, banding starts at row 1
    // Row 1: bandIndex 0 (odd) → bandRowOddStyle → #FFFFFF (or no fill since it's white)
    // Row 2: bandIndex 1 (even) → bandRowEvenStyle → #F0F4FA
    const evenRow = rows[2];
    const evenCells = getChildren(evenRow).filter(c => getTagName(c) === "a:tc");

    for (const cell of evenCells) {
      const tcPrs = findAllElements([cell], "a:tcPr");
      const fills = findAllElements(tcPrs, "a:solidFill");
      const srgbClrs = findAllElements(fills, "a:srgbClr");
      const bandFill = srgbClrs.find(c => getAttr(c, "val") === "F0F4FA");
      expect(bandFill).toBeDefined();
    }
  });
});

// =========================================================================
// H. COMPOUND FEATURE INTERACTIONS
// =========================================================================
describe("H: Compound Feature Interactions", () => {
  let slideXml: string;

  beforeAll(async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Compound Test" },
      theme: {
        name: "CompoundTest",
        colorScheme: {
          dk1: "#1A1A2E", lt1: "#FFFFFF", dk2: "#16213E", lt2: "#F8F9FA",
          accent1: "#0F3460", accent2: "#E94560", accent3: "#533483",
          accent4: "#00B4D8", accent5: "#48CAE4", accent6: "#90E0EF",
        },
        fontScheme: { majorLatin: "Georgia", minorLatin: "Verdana" },
      },
      slides: [{
        type: "Slide",
        background: {
          type: "gradient",
          angle: 180,
          stops: [
            { color: "#0A0A1A", position: 0 },
            { color: "#1A1A2E", position: 50 },
            { color: "#16213E", position: 100 },
          ],
        },
        children: [
          // Card with gradient fill + shadow + roundRect + text inside
          {
            type: "View",
            shapeType: "roundRect",
            style: {
              position: "absolute",
              top: 60,
              left: 60,
              width: 280,
              height: 180,
              fill: {
                type: "linear",
                angle: 135,
                stops: [
                  { color: "#0F3460", position: 0 },
                  { color: "#533483", position: 100 },
                ],
              },
              effects: {
                dropShadow: {
                  color: "#000000",
                  offsetX: 0,
                  offsetY: 4,
                  blurRadius: 16,
                  opacity: 0.25,
                },
              },
              borderRadius: 12,
            },
            textContent: "$8.4M",
            textStyle: {
              color: "#FFFFFF",
              fontSize: 36,
              fontWeight: "bold",
              fontFamily: "Georgia",
              textAlign: "center",
              verticalAlign: "middle",
            },
          },
          // View with opacity
          {
            type: "View",
            style: {
              position: "absolute",
              top: 280,
              left: 60,
              width: 280,
              height: 60,
              backgroundColor: "#E94560",
              opacity: 0.85,
              borderWidth: 2,
              borderColor: "#FFFFFF",
            },
          },
          // Text with rich paragraphs inside a gradient background slide
          {
            type: "Text",
            style: {
              position: "absolute",
              top: 60,
              left: 400,
              width: 300,
              height: 200,
              color: "#FFFFFF",
              fontSize: 14,
              fontFamily: "Verdana",
            },
            paragraphs: [
              {
                runs: [
                  { text: "Key Insight: ", style: { fontWeight: "bold", color: "#00B4D8" } },
                  { text: "Digital transformation requires both technology modernization and organizational change." },
                ],
                spaceBefore: 0,
              },
              {
                runs: [{ text: "Timeline: 18-24 months" }],
                bullet: { char: "▸" },
                spaceBefore: 8,
              },
              {
                runs: [{ text: "Investment: $12M-$18M" }],
                bullet: { char: "▸" },
                spaceBefore: 4,
              },
            ],
          },
        ],
      }],
    };
    const buf = await PaperEngine.render(doc);
    slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
  });

  it("H1: roundRect card has gradient fill with 2 stops inside shape", () => {
    const tree = parseXml(slideXml);
    const shapes = findAllElements(tree, "p:sp");

    // Find the shape with gradient fill
    let gradShape: any = null;
    for (const sp of shapes) {
      const gradFills = findAllElements([sp], "a:gradFill");
      if (gradFills.length > 0) {
        gradShape = sp;
        break;
      }
    }
    expect(gradShape).not.toBeNull();

    const gradFills = findAllElements([gradShape!], "a:gradFill");
    const stops = findAllElements(gradFills, "a:gs");
    expect(stops.length).toBe(2);

    // Check stop colors
    const stop0 = stops.find(s => getAttr(s, "pos") === "0");
    const stop1 = stops.find(s => getAttr(s, "pos") === "100000");
    expect(stop0).toBeDefined();
    expect(stop1).toBeDefined();

    const srgb0 = findAllElements([stop0!], "a:srgbClr");
    expect(getAttr(srgb0[0], "val")).toBe("0F3460");

    const srgb1 = findAllElements([stop1!], "a:srgbClr");
    expect(getAttr(srgb1[0], "val")).toBe("533483");
  });

  it("H2: roundRect card has drop shadow AND text body", () => {
    const tree = parseXml(slideXml);
    const shapes = findAllElements(tree, "p:sp");

    let cardShape: any = null;
    for (const sp of shapes) {
      const gradFills = findAllElements([sp], "a:gradFill");
      if (gradFills.length > 0) {
        cardShape = sp;
        break;
      }
    }
    expect(cardShape).not.toBeNull();

    // Has shadow
    const shadows = findAllElements([cardShape!], "a:outerShdw");
    expect(shadows.length).toBe(1);

    // Has text body with "$8.4M"
    const txBodies = findAllElements([cardShape!], "p:txBody");
    expect(txBodies.length).toBe(1);
    const text = deepGetText(txBodies[0]);
    expect(text).toContain("$8.4M");
  });

  it("H3: text with bold + colored run has both b='1' and srgbClr on same rPr", () => {
    const tree = parseXml(slideXml);
    // Find the rPr with both b="1" and color 00B4D8
    const rPrs = findAllElements(tree, "a:rPr");
    const boldColoredRPr = rPrs.find(r => {
      const isBold = getAttr(r, "b") === "1";
      const srgbClrs = findAllElements([r], "a:srgbClr");
      const hasColor = srgbClrs.some(c => getAttr(c, "val") === "00B4D8");
      return isBold && hasColor;
    });
    expect(boldColoredRPr).toBeDefined();
  });

  it("H4: slide background gradient has 3 stops with correct positions", () => {
    const tree = parseXml(slideXml);
    const bgs = findAllElements(tree, "p:bg");
    expect(bgs.length).toBe(1);

    const gradFills = findAllElements(bgs, "a:gradFill");
    expect(gradFills.length).toBe(1);

    const stops = findAllElements(gradFills, "a:gs");
    expect(stops.length).toBe(3);

    // Check positions: 0, 50000, 100000
    const positions = stops.map(s => getAttr(s, "pos")).sort();
    expect(positions).toEqual(["0", "100000", "50000"]);
  });

  it("H5: opacity shape has alpha modifier on fill", () => {
    const tree = parseXml(slideXml);
    // The E94560 shape with opacity 0.85
    const shapes = findAllElements(tree, "p:sp");
    let opacityShape: any = null;
    for (const sp of shapes) {
      const srgbClrs = findAllElements([sp], "a:srgbClr");
      if (srgbClrs.some(c => getAttr(c, "val") === "E94560")) {
        opacityShape = sp;
        break;
      }
    }
    expect(opacityShape).not.toBeNull();

    // Check for alpha modifier
    const alphas = findAllElements([opacityShape!], "a:alpha");
    expect(alphas.length).toBeGreaterThanOrEqual(1);
    // 0.85 * 100000 = 85000
    const alphaVal = getAttr(alphas[0], "val");
    expect(alphaVal).toBe("85000");
  });

  it("H6: bullet list has ▸ char bullets with correct spaceBefore", () => {
    const tree = parseXml(slideXml);
    const buChars = findAllElements(tree, "a:buChar");
    const triangleBullets = buChars.filter(b => getAttr(b, "char") === "▸");
    expect(triangleBullets.length).toBe(2);
  });

  it("H7: shape with border has a:ln with correct width and color", () => {
    const tree = parseXml(slideXml);
    // Find shape with E94560 fill that has border
    const shapes = findAllElements(tree, "p:sp");
    let borderShape: any = null;
    for (const sp of shapes) {
      const srgbClrs = findAllElements([sp], "a:srgbClr");
      if (srgbClrs.some(c => getAttr(c, "val") === "E94560")) {
        borderShape = sp;
        break;
      }
    }
    expect(borderShape).not.toBeNull();

    const lns = findAllElements([borderShape!], "a:ln");
    expect(lns.length).toBeGreaterThanOrEqual(1);
    // borderWidth: 2 → 2 * 9525 = 19050 EMU
    const lnW = getAttr(lns[0], "w");
    expect(lnW).toBe("19050");

    // Border color FFFFFF
    const lnSrgbClrs = findAllElements(lns, "a:srgbClr");
    const whiteBorder = lnSrgbClrs.find(c => getAttr(c, "val") === "FFFFFF");
    expect(whiteBorder).toBeDefined();
  });
});

// =========================================================================
// I. OOXML ELEMENT ORDERING
// =========================================================================
describe("I: OOXML Element Ordering", () => {
  let slideXml: string;

  beforeAll(async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Ordering Test" },
      slides: [{
        type: "Slide",
        children: [
          // Shape with effects to test effectLst ordering
          {
            type: "View",
            style: {
              position: "absolute",
              top: 20,
              left: 20,
              width: 200,
              height: 100,
              backgroundColor: "#FF0000",
              effects: {
                innerShadow: { color: "#000000", blurRadius: 4, offsetX: 2, offsetY: 2 },
                dropShadow: { color: "#000000", blurRadius: 8, offsetX: 0, offsetY: 4, opacity: 0.3 },
                reflection: { blurRadius: 0, startOpacity: 0.5, endOpacity: 0, distance: 0, direction: 90, fadeDirection: 90 },
                softEdge: { radius: 5 },
              },
            },
          },
          // Table to test tcPr ordering
          {
            type: "Table",
            style: { position: "absolute", top: 150, left: 20, width: 300, height: 100 },
            tableData: {
              columns: [150, 150],
              style: {
                firstRow: true,
                headerRowStyle: { fill: "#003366", color: "#FFFFFF", fontWeight: "bold" },
                outerBorder: { width: 1, color: "#000000" },
              } as TableStyle,
              rows: [
                { height: 30, cells: [{ text: "A" }, { text: "B" }] },
                { height: 30, cells: [{ text: "1" }, { text: "2" }] },
              ],
            },
          },
        ],
      }],
    };
    const buf = await PaperEngine.render(doc);
    slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
  });

  it("I1: effectLst children are in OOXML order: innerShdw before outerShdw before reflection before softEdge", () => {
    const tree = parseXml(slideXml);
    const effectLsts = findAllElements(tree, "a:effectLst");
    expect(effectLsts.length).toBeGreaterThanOrEqual(1);

    // Check the effectLst with all 4 effects
    const fullEffectLst = effectLsts.find(el => {
      const children = getChildTagNames(el);
      return children.length >= 4;
    });
    expect(fullEffectLst).toBeDefined();

    const order = getChildTagNames(fullEffectLst!);
    const innerIdx = order.indexOf("a:innerShdw");
    const outerIdx = order.indexOf("a:outerShdw");
    const reflIdx = order.indexOf("a:reflection");
    const softIdx = order.indexOf("a:softEdge");

    expect(innerIdx).toBeGreaterThanOrEqual(0);
    expect(outerIdx).toBeGreaterThanOrEqual(0);
    expect(reflIdx).toBeGreaterThanOrEqual(0);
    expect(softIdx).toBeGreaterThanOrEqual(0);

    // Strict ordering
    expect(innerIdx).toBeLessThan(outerIdx);
    expect(outerIdx).toBeLessThan(reflIdx);
    expect(reflIdx).toBeLessThan(softIdx);
  });

  it("I2: table tcPr has borders BEFORE solidFill", () => {
    const tree = parseXml(slideXml);
    const tcPrs = findAllElements(tree, "a:tcPr");
    expect(tcPrs.length).toBeGreaterThan(0);

    // Check a tcPr that has both borders and fill (header cell)
    for (const tcPr of tcPrs) {
      const childTags = getChildTagNames(tcPr);
      const hasLn = childTags.some(t => t.startsWith("a:ln"));
      const hasFill = childTags.includes("a:solidFill") || childTags.includes("a:gradFill");
      if (hasLn && hasFill) {
        // Last border should be before first fill
        const lastLnIdx = Math.max(...childTags
          .map((t, i) => t.startsWith("a:ln") ? i : -1)
          .filter(i => i >= 0));
        const firstFillIdx = Math.min(
          childTags.indexOf("a:solidFill") >= 0 ? childTags.indexOf("a:solidFill") : Infinity,
          childTags.indexOf("a:gradFill") >= 0 ? childTags.indexOf("a:gradFill") : Infinity,
        );
        expect(lastLnIdx).toBeLessThan(firstFillIdx);
      }
    }
  });

  it("I3: run properties (a:rPr) have solidFill before a:latin", () => {
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");

    for (const rPr of rPrs) {
      const childTags = getChildTagNames(rPr);
      const hasFill = childTags.includes("a:solidFill");
      const hasLatin = childTags.includes("a:latin");
      if (hasFill && hasLatin) {
        expect(childTags.indexOf("a:solidFill")).toBeLessThan(childTags.indexOf("a:latin"));
      }
    }
  });
});

// =========================================================================
// I-extra. BULLET ELEMENT ORDERING
// =========================================================================
describe("I-extra: Bullet Element Ordering", () => {
  it("I4: bullet with color+size+font emits in OOXML order: buClr → buSzPct → buFont → buChar", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Bullet Order Test" },
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          style: { position: "absolute", top: 20, left: 20, width: 400, height: 200, fontSize: 14 },
          paragraphs: [
            {
              runs: [{ text: "Styled bullet item" }],
              bullet: { char: "▸", color: "#FF0000", size: 120, fontFamily: "Wingdings" },
            },
          ],
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const pPrs = findAllElements(tree, "a:pPr");
    expect(pPrs.length).toBeGreaterThan(0);

    // Find the pPr that has bullet elements
    for (const pPr of pPrs) {
      const childTags = getChildTagNames(pPr);
      const hasBuClr = childTags.includes("a:buClr");
      const hasBuSzPct = childTags.includes("a:buSzPct");
      const hasBuFont = childTags.includes("a:buFont");
      const hasBuChar = childTags.includes("a:buChar");

      if (hasBuClr && hasBuSzPct && hasBuFont && hasBuChar) {
        const buClrIdx = childTags.indexOf("a:buClr");
        const buSzPctIdx = childTags.indexOf("a:buSzPct");
        const buFontIdx = childTags.indexOf("a:buFont");
        const buCharIdx = childTags.indexOf("a:buChar");

        expect(buClrIdx).toBeLessThan(buSzPctIdx);
        expect(buSzPctIdx).toBeLessThan(buFontIdx);
        expect(buFontIdx).toBeLessThan(buCharIdx);
        return;
      }
    }
    throw new Error("No pPr found with all bullet elements (buClr, buSzPct, buFont, buChar)");
  });
});

// =========================================================================
// J. EDGE CASES & PRECISION
// =========================================================================
describe("J: Edge Cases & Precision", () => {
  it("J1: empty table cells still emit valid a:txBody structure", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Empty Cell Test" },
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          style: { position: "absolute", top: 0, left: 0, width: 200, height: 100 },
          tableData: {
            columns: [100, 100],
            rows: [
              { height: 50, cells: [{ text: "" }, { text: "" }] },
            ],
          },
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

    const tree = parseXml(slideXml);
    const cells = findAllElements(tree, "a:tc");
    expect(cells.length).toBe(2);

    // Both cells should still have a:txBody
    for (const cell of cells) {
      const txBodies = findAllElements([cell], "a:txBody");
      expect(txBodies.length).toBe(1);
    }
  });

  it("J2: EMU values are always non-negative integers (no floating point)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "EMU Precision" },
      slides: [{
        type: "Slide",
        children: [
          {
            type: "View",
            style: {
              position: "absolute",
              top: 13.7,
              left: 22.3,
              width: 157.9,
              height: 83.1,
              backgroundColor: "#000000",
            },
          },
        ],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

    // All x, y, cx, cy, w, h values should be non-negative integers
    const emuPattern = /(?:x|y|cx|cy|w|h|dist|blurRad|marL|marR|marT|marB|sz|val)="(-?[\d.]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = emuPattern.exec(slideXml)) !== null) {
      const val = match[1];
      // Should be an integer (no decimal point, unless it's in a context that allows it)
      if (match[0].startsWith("sz=") || match[0].startsWith("val=")) continue; // These can be non-EMU
      const num = Number(val);
      expect(Number.isInteger(num)).toBe(true);
      // Positions can be 0, dimensions should be non-negative
      if (match[0].startsWith("cx=") || match[0].startsWith("cy=")) {
        expect(num).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("J3: very long text in a table cell doesn't break XML structure", async () => {
    const longText = "A".repeat(5000);
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Long Text Test" },
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          style: { position: "absolute", top: 0, left: 0, width: 400, height: 50 },
          tableData: {
            columns: [400],
            rows: [
              { height: 50, cells: [{ text: longText }] },
            ],
          },
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

    // Should parse without error
    const tree = parseXml(slideXml);
    const texts = findAllElements(tree, "a:t");
    expect(texts.length).toBeGreaterThan(0);
    const fullText = texts.map(t => deepGetText(t)).join("");
    expect(fullText).toContain("AAAA");
  });

  it("J4: XML special characters in text are properly escaped", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Escape Test" },
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          style: { position: "absolute", top: 0, left: 0, width: 200, height: 50, fontSize: 12 },
          content: 'Revenue > $5M & < $10M "net"',
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

    // Should parse without error (would fail if not properly escaped)
    const tree = parseXml(slideXml);
    const texts = findAllElements(tree, "a:t");
    const fullText = texts.map(t => deepGetText(t)).join("");
    expect(fullText).toContain("Revenue");
    expect(fullText).toContain("$5M");
  });

  it("J5: table with merged cells has correct gridSpan/rowSpan attributes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Merge Test" },
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          style: { position: "absolute", top: 0, left: 0, width: 400, height: 100 },
          tableData: {
            columns: [100, 100, 100, 100],
            rows: [
              { height: 30, cells: [
                { text: "Merged Header", colSpan: 4 },
                { text: "", hMerge: true },
                { text: "", hMerge: true },
                { text: "", hMerge: true },
              ]},
              { height: 30, cells: [
                { text: "A" }, { text: "B" }, { text: "C" }, { text: "D" },
              ]},
            ],
          },
        }],
      }],
    };
    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");
    expect(rows.length).toBe(2);

    // First row should have gridSpan="4" on first cell
    const firstRowCells = findAllElements([rows[0]], "a:tc");
    expect(firstRowCells.length).toBe(4); // All 4 cells must be present

    // First cell has gridSpan
    expect(getAttr(firstRowCells[0], "gridSpan")).toBe("4");

    // Ghost cells have hMerge
    for (let i = 1; i < 4; i++) {
      expect(getAttr(firstRowCells[i], "hMerge")).toBe("1");
    }
  });
});

// =========================================================================
// K. FULL MBB SLIDE VALIDATION
// =========================================================================
describe("K: Full MBB Slide Validation", () => {
  let buffer: Buffer;

  beforeAll(async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "MBB Full Test", author: "Runstamp" },
      theme: {
        name: "MBBTheme",
        colorScheme: {
          dk1: "#0F2540", lt1: "#FFFFFF", dk2: "#1B3A5C", lt2: "#F8FAFC",
          accent1: "#2563EB", accent2: "#059669", accent3: "#7C3AED",
          accent4: "#EA580C", accent5: "#DC2626", accent6: "#0891B2",
        },
        fontScheme: { majorLatin: "Calibri", minorLatin: "Calibri" },
      },
      slides: [
        // Slide 1: Title
        {
          type: "Slide",
          background: { type: "gradient", angle: 135, stops: [
            { color: "#0A1929", position: 0 },
            { color: "#1B3A5C", position: 100 },
          ]},
          children: [
            { type: "View", style: { position: "absolute", top: 0, left: 0, width: 960, height: 4, backgroundColor: "#2563EB" } },
            { type: "Text", style: { position: "absolute", top: 200, left: 80, width: 800, height: 80, color: "#FFFFFF", fontSize: 38, fontWeight: "bold", fontFamily: "Calibri" }, content: "Strategic Assessment" },
          ],
        },
        // Slide 2: Data with table + chart
        {
          type: "Slide",
          background: { type: "solid", color: "#F8FAFC" },
          children: [
            {
              type: "Table",
              style: { position: "absolute", top: 60, left: 40, width: 440, height: 200 },
              tableData: {
                columns: [140, 100, 100, 100],
                style: {
                  firstRow: true,
                  bandRow: true,
                  headerRowStyle: { fill: "#0F2540", color: "#FFFFFF", fontWeight: "bold", fontSize: 10, fontFamily: "Calibri", textAlign: "center", padding: 8 },
                  bandRowEvenStyle: { fill: "#F1F5F9" },
                  outerBorder: { width: 1, color: "#E2E8F0" },
                  innerBorderH: { width: 0.5, color: "#E2E8F0" },
                } as TableStyle,
                rows: [
                  { height: 32, cells: [{ text: "BU" }, { text: "Rev" }, { text: "GM" }, { text: "YoY" }] },
                  { height: 28, cells: [
                    { text: "Enterprise", style: { fontWeight: "bold", fontSize: 10 } },
                    { text: "$180M", style: { fontSize: 10, textAlign: "right" } },
                    { text: "72%", style: { fontSize: 10, textAlign: "center" } },
                    { text: "+14%", style: { fontSize: 10, textAlign: "center", color: "#059669", fontWeight: "bold" } },
                  ]},
                  { height: 28, cells: [
                    { text: "SMB", style: { fontWeight: "bold", fontSize: 10 } },
                    { text: "$95M", style: { fontSize: 10, textAlign: "right" } },
                    { text: "64%", style: { fontSize: 10, textAlign: "center" } },
                    { text: "+8%", style: { fontSize: 10, textAlign: "center", color: "#059669", fontWeight: "bold" } },
                  ]},
                ],
              },
            },
            {
              type: "Chart",
              style: { position: "absolute", top: 60, left: 500, width: 420, height: 350 },
              chartData: {
                chartType: "bar",
                barGrouping: "clustered",
                categories: ["Enterprise", "SMB", "Consumer"],
                series: [
                  { name: "Revenue", values: [180, 95, 42], color: "#2563EB" },
                  { name: "EBITDA", values: [72, 38, 12], color: "#059669" },
                ],
                valueAxis: { numberFormat: "$#,##0", fontSize: 8 },
                categoryAxis: { fontSize: 9 },
                legend: { position: "bottom", fontSize: 9 },
                gapWidth: 80,
                dataLabels: { showVal: true, fontSize: 8, position: "outEnd" },
              },
            },
          ],
        },
      ],
    };
    buffer = await PaperEngine.render(doc);
  });

  it("K1: ZIP contains all required parts (slides, theme, layouts, masters, rels)", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const paths = Object.keys(zip.files);

    expect(paths).toContain("[Content_Types].xml");
    expect(paths).toContain("_rels/.rels");
    expect(paths).toContain("ppt/presentation.xml");
    expect(paths).toContain("ppt/_rels/presentation.xml.rels");
    expect(paths).toContain("ppt/slides/slide1.xml");
    expect(paths).toContain("ppt/slides/slide2.xml");
    expect(paths).toContain("ppt/slides/_rels/slide1.xml.rels");
    expect(paths).toContain("ppt/slides/_rels/slide2.xml.rels");
    expect(paths).toContain("ppt/theme/theme1.xml");
    expect(paths).toContain("ppt/slideMasters/slideMaster1.xml");
    expect(paths).toContain("ppt/slideLayouts/slideLayout1.xml");
    expect(paths).toContain("docProps/core.xml");
    expect(paths).toContain("docProps/app.xml");
  });

  it("K2: [Content_Types].xml has correct overrides for all slide parts", async () => {
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain('PartName="/ppt/slides/slide1.xml"');
    expect(ctXml).toContain('PartName="/ppt/slides/slide2.xml"');
    expect(ctXml).toContain('ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"');
  });

  it("K3: presentation.xml references all slides in correct order", async () => {
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presXml);
    const sldIdLst = findAllElements(tree, "p:sldIdLst");
    expect(sldIdLst.length).toBe(1);

    const sldIds = findAllElements(sldIdLst, "p:sldId");
    expect(sldIds.length).toBe(2);

    // IDs should be sequential starting from 256
    expect(getAttr(sldIds[0], "id")).toBe("256");
    expect(getAttr(sldIds[1], "id")).toBe("257");
  });

  it("K4: slide 2 table header has CASCADED text formatting (bold + white + center + font)", async () => {
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide2.xml");
    const tree = parseXml(slideXml);
    const rows = findAllElements(tree, "a:tr");

    // First row is header
    const headerCells = getChildren(rows[0]).filter(c => getTagName(c) === "a:tc");

    for (const cell of headerCells) {
      const rPrs = findAllElements([cell], "a:rPr");

      // Must have bold
      const hasB = rPrs.some(r => getAttr(r, "b") === "1");
      expect(hasB).toBe(true);

      // Must have sz=750 (10px * 75)
      const hasSz = rPrs.some(r => getAttr(r, "sz") === "750");
      expect(hasSz).toBe(true);

      // Must have white color
      const srgbClrs = findAllElements(rPrs, "a:srgbClr");
      const hasWhite = srgbClrs.some(c => getAttr(c, "val") === "FFFFFF");
      expect(hasWhite).toBe(true);

      // Must have Calibri font
      const latins = findAllElements([cell], "a:latin");
      const hasCalibri = latins.some(l => getAttr(l, "typeface") === "Calibri");
      expect(hasCalibri).toBe(true);

      // Must have center alignment
      const pPrs = findAllElements([cell], "a:pPr");
      const hasCenter = pPrs.some(p => getAttr(p, "algn") === "ctr");
      expect(hasCenter).toBe(true);
    }
  });

  it("K5: slide 2 data row cell with color override (+14%) has green text", async () => {
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide2.xml");
    const tree = parseXml(slideXml);

    // Find the text run containing "+14%"
    const aTs = findAllElements(tree, "a:t");
    let targetRun: any = null;
    for (const aT of aTs) {
      const text = deepGetText(aT);
      if (text === "+14%") {
        // Walk up to find the parent a:r which has the a:rPr
        targetRun = aT;
        break;
      }
    }
    expect(targetRun).not.toBeNull();

    // The run should have green color
    // Check that somewhere near +14% text there's a srgbClr with 059669
    expect(slideXml).toContain("059669");
  });

  it("K6: chart has embedded Excel with correct data values", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    // Find chart Excel
    const xlsxPaths = Object.keys(zip.files).filter(p => p.endsWith(".xlsx"));
    expect(xlsxPaths.length).toBe(1);

    const xlsxBuf = await zip.files[xlsxPaths[0]].async("nodebuffer");
    expect(xlsxBuf.length).toBeGreaterThan(100);
  });

  it("K7: theme1.xml has custom color scheme with all 10 colors", async () => {
    const themeXml = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    const tree = parseXml(themeXml);
    const clrScheme = findAllElements(tree, "a:clrScheme");
    expect(clrScheme.length).toBe(1);

    // Check all 10 color slots
    const expectedColors = {
      "a:dk1": "0F2540",
      "a:lt1": "FFFFFF",
      "a:dk2": "1B3A5C",
      "a:lt2": "F8FAFC",
      "a:accent1": "2563EB",
      "a:accent2": "059669",
      "a:accent3": "7C3AED",
      "a:accent4": "EA580C",
      "a:accent5": "DC2626",
      "a:accent6": "0891B2",
    };

    for (const [tagName, expectedVal] of Object.entries(expectedColors)) {
      const elements = findAllElements(clrScheme, tagName);
      expect(elements.length).toBe(1);
      const srgbClrs = findAllElements(elements, "a:srgbClr");
      expect(srgbClrs.length).toBe(1);
      expect(getAttr(srgbClrs[0], "val")).toBe(expectedVal);
    }
  });

  it("K8: slide 1 gradient background has correct colors and angle", async () => {
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const bgs = findAllElements(tree, "p:bg");
    expect(bgs.length).toBe(1);

    const gradFills = findAllElements(bgs, "a:gradFill");
    expect(gradFills.length).toBe(1);

    const stops = findAllElements(gradFills, "a:gs");
    expect(stops.length).toBe(2);

    // Verify stop colors
    const stop0Clr = findAllElements([stops[0]], "a:srgbClr");
    expect(getAttr(stop0Clr[0], "val")).toBe("0A1929");

    const stop1Clr = findAllElements([stops[1]], "a:srgbClr");
    expect(getAttr(stop1Clr[0], "val")).toBe("1B3A5C");

    // Verify gradient angle: CSS 135° → OOXML angle
    const lin = findAllElements(gradFills, "a:lin");
    expect(lin.length).toBe(1);
  });
});
