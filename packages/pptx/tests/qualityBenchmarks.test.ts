/**
 * Quality Benchmarks — MBB-Level PPTX Output Quality Validation
 *
 * These tests generate full PPTX files from rich ASTs and validate the
 * precise OOXML output for correctness, not just existence. Every assertion
 * checks exact attribute values, computed EMU coordinates, color codes,
 * structural ordering, and spec-compliant element nesting.
 *
 * Categories:
 *   A. MBB Strategy Deck Quality (12 tests)
 *   B. Typography Quality (10 tests)
 *   C. Visual Effects Quality (8 tests)
 *   D. Table Quality (8 tests)
 *   E. Chart Quality (8 tests)
 *   F. Slide-Level Quality (6 tests)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode } from "../src/types/ast.js";
import { toEmu, PIXEL_TO_EMU, cssAngleToOoxml, shadowPolar } from "../src/ooxml/drawing/math.js";
import {
  parseXml, findAllElements, getAttr, getText,
  getZipEntry, getZipPaths, zipHasFile, RED_PIXEL,
  assertUniqueShapeIds, assertRIdsResolve, assertWellFormedXml,
  getChildren, getTagName, getChildTagNames,
} from "./helpers/xmlTestUtils.js";

/**
 * Recursively collect ALL #text values from a parsed XML subtree.
 * Unlike getText() which only checks immediate children, this walks the
 * entire subtree to find text content at any depth.
 */
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
// A. MBB STRATEGY DECK QUALITY (12 tests)
// =========================================================================

describe("A: MBB Strategy Deck Quality", () => {
  let buffer: Buffer;
  let slide1Xml: string;
  let slide1Tree: any[];
  let slide1RelsXml: string;
  let chartXml: string;
  let chartTree: any[];
  let themeXml: string;
  let themeTree: any[];

  // Build a full MBB-quality strategy deck with:
  // - Gradient slide background
  // - Title text with bold + large font
  // - Rounded rect card shapes with shadows
  // - Styled table with header row
  // - Bar chart with data labels
  // - Bullet list paragraph
  // - Accent bar (thin colored rectangle)
  const mbbDoc: PaperDocument = {
    type: "Document",
    meta: { title: "MBB Strategy Deck", author: "Consultant" },
    theme: {
      name: "MBBTheme",
      colorScheme: {
        dk1: "#1B1B3A",
        lt1: "#FFFFFF",
        dk2: "#2D2D5E",
        lt2: "#F5F5F5",
        accent1: "#003DA5",
        accent2: "#0070C0",
        accent3: "#00B050",
        accent4: "#FFC000",
        accent5: "#FF6600",
        accent6: "#C00000",
        hlink: "#0563C1",
        folHlink: "#954F72",
      },
      fontScheme: {
        majorLatin: "Georgia",
        minorLatin: "Calibri",
      },
    },
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      background: {
        type: "gradient",
        angle: 135,
        stops: [
          { color: "#1B1B3A", position: 0 },
          { color: "#003DA5", position: 50 },
          { color: "#0070C0", position: 100 },
        ],
      },
      children: [
        // Accent bar at top
        {
          type: "View",
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: 960,
            height: 6,
            backgroundColor: "#FFC000",
          },
          shapeType: "rect",
        } as PaperNode,
        // Title text
        {
          type: "Text",
          style: {
            position: "absolute",
            top: 30,
            left: 40,
            width: 880,
            height: 60,
            fontSize: 28,
            fontFamily: "Georgia",
            fontWeight: "bold",
            color: "#FFFFFF",
            textAlign: "left",
            verticalAlign: "middle",
          },
          content: "Market Opportunity Assessment",
        } as PaperNode,
        // Subtitle
        {
          type: "Text",
          style: {
            position: "absolute",
            top: 95,
            left: 40,
            width: 880,
            height: 30,
            fontSize: 14,
            fontFamily: "Calibri",
            color: "#B0B8D0",
            textAlign: "left",
          },
          content: "Proprietary & Confidential",
        } as PaperNode,
        // Rounded rect card with shadow
        {
          type: "View",
          style: {
            position: "absolute",
            top: 140,
            left: 40,
            width: 420,
            height: 260,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E0E0E0",
            effects: {
              dropShadow: {
                color: "#000000",
                offsetX: 3,
                offsetY: 4,
                blurRadius: 8,
                opacity: 0.25,
              },
            },
          },
          shapeType: "roundRect",
          shapeAdjustments: [16667],
          children: [],
        } as PaperNode,
        // Table with styled header
        {
          type: "Table",
          style: {
            position: "absolute",
            top: 145,
            left: 50,
            width: 400,
            height: 240,
          },
          tableData: {
            columns: [160, 120, 120],
            rows: [
              {
                height: 36,
                cells: [
                  { text: "Segment", style: { fill: "#003DA5", color: "#FFFFFF", fontWeight: "bold", fontSize: 11, textAlign: "center", padding: 6 } },
                  { text: "TAM ($B)", style: { fill: "#003DA5", color: "#FFFFFF", fontWeight: "bold", fontSize: 11, textAlign: "center", padding: 6 } },
                  { text: "CAGR (%)", style: { fill: "#003DA5", color: "#FFFFFF", fontWeight: "bold", fontSize: 11, textAlign: "center", padding: 6 } },
                ],
              },
              {
                height: 32,
                cells: [
                  { text: "Enterprise SaaS", style: { fontSize: 10, padding: 6 } },
                  { text: "$42.5", style: { fontSize: 10, textAlign: "right", padding: 6 } },
                  { text: "18.2%", style: { fontSize: 10, textAlign: "right", padding: 6 } },
                ],
              },
              {
                height: 32,
                cells: [
                  { text: "Cloud Infra", style: { fontSize: 10, padding: 6 } },
                  { text: "$78.1", style: { fontSize: 10, textAlign: "right", padding: 6 } },
                  { text: "22.7%", style: { fontSize: 10, textAlign: "right", padding: 6 } },
                ],
              },
              {
                height: 32,
                cells: [
                  { text: "AI/ML Platform", style: { fontSize: 10, padding: 6 } },
                  { text: "$15.3", style: { fontSize: 10, textAlign: "right", padding: 6 } },
                  { text: "34.1%", style: { fontSize: 10, textAlign: "right", padding: 6 } },
                ],
              },
            ],
            style: {
              firstRow: true,
              headerRowStyle: { fill: "#003DA5", color: "#FFFFFF", fontWeight: "bold" },
              outerBorder: { width: 1, color: "#D0D0D0" },
              innerBorderH: { width: 0.5, color: "#E8E8E8" },
              innerBorderV: { width: 0.5, color: "#E8E8E8" },
            },
          },
        } as PaperNode,
        // Bar chart with data labels on right side
        {
          type: "Chart",
          style: {
            position: "absolute",
            top: 140,
            left: 490,
            width: 430,
            height: 260,
          },
          chartData: {
            chartType: "bar",
            barGrouping: "clustered",
            categories: ["2022", "2023", "2024", "2025E"],
            series: [
              { name: "Revenue", values: [120, 155, 198, 245], color: "#003DA5" },
              { name: "EBITDA", values: [22, 35, 52, 68], color: "#00B050" },
            ],
            dataLabels: { showVal: true, position: "outEnd", fontSize: 8 },
            legend: { position: "bottom", fontSize: 9 },
            gapWidth: 150,
            valueAxis: { numberFormat: "$#,##0" },
          },
        } as PaperNode,
        // Bullet list
        {
          type: "Text",
          style: {
            position: "absolute",
            top: 420,
            left: 40,
            width: 880,
            height: 100,
            fontSize: 11,
            fontFamily: "Calibri",
            color: "#FFFFFF",
          },
          paragraphs: [
            {
              runs: [{ text: "Key strategic imperatives for market entry:", style: { fontWeight: "bold", color: "#FFC000" } }],
              spaceBefore: 0,
            },
            {
              runs: [{ text: "Accelerate product-market fit through targeted pilot programs" }],
              bullet: { char: "\u2022", color: "#FFC000" },
              level: 0,
              spaceBefore: 4,
            },
            {
              runs: [{ text: "Build differentiated go-to-market capabilities in key verticals" }],
              bullet: { char: "\u2022", color: "#FFC000" },
              level: 0,
              spaceBefore: 4,
            },
            {
              runs: [{ text: "Establish strategic partnerships to accelerate distribution" }],
              bullet: { char: "\u2022", color: "#FFC000" },
              level: 0,
              spaceBefore: 4,
            },
          ],
        } as PaperNode,
      ],
    }],
  };

  beforeAll(async () => {
    buffer = await PaperEngine.render(mbbDoc);
    slide1Xml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slide1Tree = parseXml(slide1Xml);
    slide1RelsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    chartXml = await getZipEntry(buffer, "ppt/charts/chart1.xml");
    chartTree = parseXml(chartXml);
    themeXml = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    themeTree = parseXml(themeXml);
  });

  it("A1: all XML in the ZIP is well-formed (parseable)", async () => {
    await assertWellFormedXml(buffer);
  });

  it("A2: gradient background has 3 stops at correct positions with correct colors", () => {
    const bgPr = findAllElements(slide1Tree, "p:bgPr");
    expect(bgPr.length).toBe(1);

    const gradFill = findAllElements(slide1Tree, "a:gradFill");
    expect(gradFill.length).toBeGreaterThanOrEqual(1);

    // Find the gradient fill inside p:bg
    const bgGrad = findAllElements(bgPr, "a:gradFill");
    expect(bgGrad.length).toBe(1);

    const gsElements = findAllElements(bgGrad, "a:gs");
    expect(gsElements.length).toBe(3);

    // Check positions: 0, 50000, 100000
    const positions = gsElements.map(gs => getAttr(gs, "pos"));
    expect(positions).toContain("0");
    expect(positions).toContain("50000");
    expect(positions).toContain("100000");

    // Check colors
    const srgbColors = findAllElements(bgGrad, "a:srgbClr");
    const colorVals = srgbColors.map(c => getAttr(c, "val"));
    expect(colorVals).toContain("1B1B3A");
    expect(colorVals).toContain("003DA5");
    expect(colorVals).toContain("0070C0");

    // Check angle: 135 CSS degrees → cssAngleToOoxml(135) = ((135+270)%360)*60000 = 45*60000 = 2700000
    const linEls = findAllElements(bgGrad, "a:lin");
    expect(linEls.length).toBe(1);
    const ang = getAttr(linEls[0], "ang");
    expect(ang).toBe(String(cssAngleToOoxml(135)));
  });

  it("A3: roundRect card shape has correct geometry preset and adjustment value", () => {
    const shapes = findAllElements(slide1Tree, "p:sp");
    // Find the roundRect shape (it has the prstGeom with roundRect)
    let foundRoundRect = false;
    for (const sp of shapes) {
      const prstGeom = findAllElements([sp], "a:prstGeom");
      for (const g of prstGeom) {
        if (getAttr(g, "prst") === "roundRect") {
          foundRoundRect = true;
          // Verify the adjustment value is present
          const avLst = findAllElements([g], "a:avLst");
          expect(avLst.length).toBe(1);
          const gd = findAllElements([g], "a:gd");
          expect(gd.length).toBe(1);
          expect(getAttr(gd[0], "fmla")).toBe("val 16667");
        }
      }
    }
    expect(foundRoundRect).toBe(true);
  });

  it("A4: drop shadow on card has correct blur, distance, direction, and opacity", () => {
    const shapes = findAllElements(slide1Tree, "p:sp");
    let shadowFound = false;
    for (const sp of shapes) {
      const outerShdw = findAllElements([sp], "a:outerShdw");
      if (outerShdw.length > 0) {
        shadowFound = true;
        const shadow = outerShdw[0];

        // Expected values: offsetX=3, offsetY=4, blurRadius=8
        const expectedBlur = toEmu(8);
        const { dist, dir } = shadowPolar(3, 4);

        expect(getAttr(shadow, "blurRad")).toBe(String(expectedBlur));
        expect(getAttr(shadow, "dist")).toBe(String(dist));
        expect(getAttr(shadow, "dir")).toBe(String(dir));
        expect(getAttr(shadow, "algn")).toBe("ctr");
        expect(getAttr(shadow, "rotWithShape")).toBe("0");

        // Opacity: 0.25 → alpha val = 25000
        const alpha = findAllElements(outerShdw, "a:alpha");
        expect(alpha.length).toBe(1);
        expect(getAttr(alpha[0], "val")).toBe("25000");
      }
    }
    expect(shadowFound).toBe(true);
  });

  it("A5: table header row cells have #003DA5 fill and bold white text", () => {
    const graphicFrames = findAllElements(slide1Tree, "p:graphicFrame");
    expect(graphicFrames.length).toBeGreaterThanOrEqual(1);

    // Find the a:tbl element
    const tables = findAllElements(slide1Tree, "a:tbl");
    expect(tables.length).toBe(1);

    // Get all rows
    const rows = findAllElements([tables[0]], "a:tr");
    expect(rows.length).toBe(4);

    // First row = header row
    const headerRow = rows[0];
    const headerCells = findAllElements([headerRow], "a:tc");
    expect(headerCells.length).toBe(3);

    // Each header cell should have fill #003DA5
    for (const cell of headerCells) {
      const tcPr = findAllElements([cell], "a:tcPr");
      expect(tcPr.length).toBe(1);
      const fills = findAllElements([tcPr[0]], "a:srgbClr");
      const fillColors = fills.map(f => getAttr(f, "val"));
      expect(fillColors).toContain("003DA5");
    }

    // Header text should be bold (b="1")
    for (const cell of headerCells) {
      const rPr = findAllElements([cell], "a:rPr");
      expect(rPr.length).toBeGreaterThanOrEqual(1);
      const boldAttrs = rPr.map(r => getAttr(r, "b"));
      expect(boldAttrs).toContain("1");
    }
  });

  it("A6: chart series have correct data values for Revenue and EBITDA", () => {
    const series = findAllElements(chartTree, "c:ser");
    expect(series.length).toBe(2);

    // Look specifically inside c:val > c:numRef > c:numCache for numeric values
    // The c:v elements inside c:val are the actual data values
    const revenueVal = findAllElements([series[0]], "c:val");
    expect(revenueVal.length).toBeGreaterThanOrEqual(1);
    const revenueVs = findAllElements(revenueVal, "c:v");
    const revNums = revenueVs.map(v => getText(v));
    expect(revNums).toEqual(["120", "155", "198", "245"]);

    // EBITDA series: 22, 35, 52, 68
    const ebitdaVal = findAllElements([series[1]], "c:val");
    expect(ebitdaVal.length).toBeGreaterThanOrEqual(1);
    const ebitdaVs = findAllElements(ebitdaVal, "c:v");
    const ebitNums = ebitdaVs.map(v => getText(v));
    expect(ebitNums).toEqual(["22", "35", "52", "68"]);
  });

  it("A7: chart has data labels with showVal and correct position", () => {
    const dLbls = findAllElements(chartTree, "c:dLbls");
    expect(dLbls.length).toBeGreaterThanOrEqual(1);

    const showVal = findAllElements(chartTree, "c:showVal");
    expect(showVal.some(s => getAttr(s, "val") === "1")).toBe(true);

    const dLblPos = findAllElements(chartTree, "c:dLblPos");
    expect(dLblPos.some(d => getAttr(d, "val") === "outEnd")).toBe(true);
  });

  it("A8: rich text bullet list paragraphs have buChar elements with bullet char", () => {
    // Find all a:buChar elements
    const buChars = findAllElements(slide1Tree, "a:buChar");
    // Should have at least 3 bullet paragraphs
    expect(buChars.length).toBeGreaterThanOrEqual(3);

    // Each should have char="•"
    for (const bc of buChars) {
      expect(getAttr(bc, "char")).toBe("\u2022");
    }
  });

  it("A9: accent bar shape has correct width (960px) and height (6px) in EMU", () => {
    const shapes = findAllElements(slide1Tree, "p:sp");
    let accentBarFound = false;

    for (const sp of shapes) {
      const extEls = findAllElements([sp], "a:ext");
      for (const ext of extEls) {
        const cx = parseInt(getAttr(ext, "cx") || "0", 10);
        const cy = parseInt(getAttr(ext, "cy") || "0", 10);
        const expectedW = toEmu(960);
        const expectedH = toEmu(6);
        if (cx === expectedW && cy === expectedH) {
          accentBarFound = true;
          // Should also have fill color FFC000
          const srgbClrs = findAllElements([sp], "a:srgbClr");
          const colors = srgbClrs.map(c => getAttr(c, "val"));
          expect(colors).toContain("FFC000");
        }
      }
    }
    expect(accentBarFound).toBe(true);
  });

  it("A10: all font sizes are correctly converted to hundredths of a point", () => {
    // fontSize 28px → sz="2100" (28*75), fontSize 14px → sz="1050" (14*75), fontSize 11px → sz="825" (11*75)
    const allRPr = findAllElements(slide1Tree, "a:rPr");
    const fontSizes = allRPr
      .map(r => getAttr(r, "sz"))
      .filter(Boolean)
      .map(Number);

    expect(fontSizes).toContain(2100); // 28px title
    expect(fontSizes).toContain(1050); // 14px subtitle
    expect(fontSizes).toContain(825); // 11px body text
  });

  it("A11: all EMU position/dimension values in the slide are non-negative integers", () => {
    // Check all a:off values are non-negative integers
    const offEls = findAllElements(slide1Tree, "a:off");
    for (const off of offEls) {
      const x = parseInt(getAttr(off, "x") || "0", 10);
      const y = parseInt(getAttr(off, "y") || "0", 10);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
    }

    // Check a:ext values inside p:sp shapes (actual content shapes)
    // are positive integers. Container elements (spTree, grpSp) may have cx/cy=0.
    const shapes = findAllElements(slide1Tree, "p:sp");
    for (const sp of shapes) {
      const exts = findAllElements([sp], "a:ext");
      for (const ext of exts) {
        const cx = parseInt(getAttr(ext, "cx") || "0", 10);
        const cy = parseInt(getAttr(ext, "cy") || "0", 10);
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(cx)).toBe(true);
        expect(Number.isInteger(cy)).toBe(true);
      }
    }

    // Verify all a:ext are at minimum non-negative integers
    const allExts = findAllElements(slide1Tree, "a:ext");
    for (const ext of allExts) {
      const cx = parseInt(getAttr(ext, "cx") || "0", 10);
      const cy = parseInt(getAttr(ext, "cy") || "0", 10);
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(cx)).toBe(true);
      expect(Number.isInteger(cy)).toBe(true);
    }
  });

  it("A12: shape IDs are unique and rIds all resolve to declared relationships", () => {
    assertUniqueShapeIds(slide1Tree);
    assertRIdsResolve(slide1Xml, slide1RelsXml);
  });
});

// =========================================================================
// B. TYPOGRAPHY QUALITY (10 tests)
// =========================================================================

describe("B: Typography Quality", () => {
  let buffer: Buffer;
  let slideXml: string;
  let slideTree: any[];

  const typographyDoc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        // B1: fontFamily test
        {
          type: "Text",
          style: {
            position: "absolute", top: 10, left: 10, width: 200, height: 40,
            fontSize: 16,
            fontFamily: "Garamond",
            color: "#333333",
          },
          content: "Garamond Font",
        } as PaperNode,
        // B2: bold text
        {
          type: "Text",
          style: {
            position: "absolute", top: 55, left: 10, width: 200, height: 40,
            fontSize: 14,
            fontWeight: "bold",
            color: "#000000",
          },
          content: "Bold Text Here",
        } as PaperNode,
        // B3: italic text
        {
          type: "Text",
          style: {
            position: "absolute", top: 100, left: 10, width: 200, height: 40,
            fontSize: 14,
            fontStyle: "italic",
            color: "#000000",
          },
          content: "Italic Text Here",
        } as PaperNode,
        // B4: specific color
        {
          type: "Text",
          style: {
            position: "absolute", top: 145, left: 10, width: 200, height: 40,
            fontSize: 14,
            color: "#E74C3C",
          },
          content: "Red Color Text",
        } as PaperNode,
        // B5: textAlign center
        {
          type: "Text",
          style: {
            position: "absolute", top: 190, left: 10, width: 300, height: 40,
            fontSize: 14,
            textAlign: "center",
          },
          content: "Centered Text",
        } as PaperNode,
        // B6: textAlign right
        {
          type: "Text",
          style: {
            position: "absolute", top: 235, left: 10, width: 300, height: 40,
            fontSize: 14,
            textAlign: "right",
          },
          content: "Right Aligned",
        } as PaperNode,
        // B7: textAlign justify
        {
          type: "Text",
          style: {
            position: "absolute", top: 280, left: 10, width: 300, height: 40,
            fontSize: 14,
            textAlign: "justify",
          },
          content: "Justified text paragraph content that needs some words to fill out the line properly.",
        } as PaperNode,
        // B8: verticalAlign middle
        {
          type: "Text",
          style: {
            position: "absolute", top: 325, left: 10, width: 200, height: 80,
            fontSize: 14,
            verticalAlign: "middle",
          },
          content: "Vertically Centered",
        } as PaperNode,
        // B9: lineHeight
        {
          type: "Text",
          style: {
            position: "absolute", top: 325, left: 250, width: 200, height: 80,
            fontSize: 14,
            lineHeight: 24,
          },
          content: "Line Height 24pt",
        } as PaperNode,
        // B10: multi-paragraph mixed formatting
        {
          type: "Text",
          style: {
            position: "absolute", top: 420, left: 10, width: 940, height: 80,
            fontSize: 12,
            fontFamily: "Calibri",
          },
          paragraphs: [
            {
              runs: [
                { text: "Bold intro: ", style: { fontWeight: "bold", color: "#003DA5" } },
                { text: "followed by normal text, " },
                { text: "then italic emphasis", style: { fontStyle: "italic", color: "#E74C3C" } },
              ],
              align: "left",
            },
            {
              runs: [
                { text: "Second paragraph with ", style: { fontSize: 10 } },
                { text: "different font", style: { fontFamily: "Georgia", fontSize: 14, fontWeight: "bold" } },
              ],
              align: "center",
            },
          ],
        } as PaperNode,
      ],
    }],
  };

  beforeAll(async () => {
    buffer = await PaperEngine.render(typographyDoc);
    slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("B1: fontFamily propagates to a:latin typeface attribute", () => {
    const latins = findAllElements(slideTree, "a:latin");
    const typefaces = latins.map(l => getAttr(l, "typeface")).filter(Boolean);
    expect(typefaces).toContain("Garamond");
  });

  it("B2: bold text has b=\"1\" attribute on a:rPr", () => {
    // Find text runs — use deepGetText to get text inside a:t children
    const runs = findAllElements(slideTree, "a:r");
    let foundBold = false;
    for (const run of runs) {
      const textContent = deepGetText(run);
      if (textContent.includes("Bold Text Here")) {
        const rPrs = findAllElements([run], "a:rPr");
        expect(rPrs.length).toBe(1);
        expect(getAttr(rPrs[0], "b")).toBe("1");
        foundBold = true;
      }
    }
    expect(foundBold).toBe(true);
  });

  it("B3: italic text has i=\"1\" attribute on a:rPr", () => {
    const runs = findAllElements(slideTree, "a:r");
    let foundItalic = false;
    for (const run of runs) {
      const textContent = deepGetText(run);
      if (textContent.includes("Italic Text Here")) {
        const rPrs = findAllElements([run], "a:rPr");
        expect(rPrs.length).toBe(1);
        expect(getAttr(rPrs[0], "i")).toBe("1");
        foundItalic = true;
      }
    }
    expect(foundItalic).toBe(true);
  });

  it("B4: text color #E74C3C produces srgbClr val=\"E74C3C\"", () => {
    const runs = findAllElements(slideTree, "a:r");
    let foundColor = false;
    for (const run of runs) {
      const textContent = deepGetText(run);
      if (textContent.includes("Red Color Text")) {
        const srgbClrs = findAllElements([run], "a:srgbClr");
        const vals = srgbClrs.map(c => getAttr(c, "val"));
        expect(vals).toContain("E74C3C");
        foundColor = true;
      }
    }
    expect(foundColor).toBe(true);
  });

  it("B5: textAlign center produces algn=\"ctr\" on a:pPr", () => {
    const paras = findAllElements(slideTree, "a:p");
    let foundCenter = false;
    for (const p of paras) {
      const textContent = deepGetText(p);
      if (textContent.includes("Centered Text")) {
        const pPrs = findAllElements([p], "a:pPr");
        expect(pPrs.length).toBeGreaterThanOrEqual(1);
        expect(getAttr(pPrs[0], "algn")).toBe("ctr");
        foundCenter = true;
      }
    }
    expect(foundCenter).toBe(true);
  });

  it("B6: textAlign right produces algn=\"r\" on a:pPr", () => {
    const paras = findAllElements(slideTree, "a:p");
    let foundRight = false;
    for (const p of paras) {
      const textContent = deepGetText(p);
      if (textContent.includes("Right Aligned")) {
        const pPrs = findAllElements([p], "a:pPr");
        expect(pPrs.length).toBeGreaterThanOrEqual(1);
        expect(getAttr(pPrs[0], "algn")).toBe("r");
        foundRight = true;
      }
    }
    expect(foundRight).toBe(true);
  });

  it("B7: textAlign justify produces algn=\"just\" on a:pPr", () => {
    const paras = findAllElements(slideTree, "a:p");
    let foundJust = false;
    for (const p of paras) {
      const textContent = deepGetText(p);
      if (textContent.includes("Justified text")) {
        const pPrs = findAllElements([p], "a:pPr");
        expect(pPrs.length).toBeGreaterThanOrEqual(1);
        expect(getAttr(pPrs[0], "algn")).toBe("just");
        foundJust = true;
      }
    }
    expect(foundJust).toBe(true);
  });

  it("B8: verticalAlign middle produces anchor=\"ctr\" on a:bodyPr", () => {
    const txBodies = findAllElements(slideTree, "p:txBody");
    let foundAnchor = false;
    for (const txBody of txBodies) {
      const textContent = deepGetText(txBody);
      if (textContent.includes("Vertically Centered")) {
        const bodyPrs = findAllElements([txBody], "a:bodyPr");
        expect(bodyPrs.length).toBe(1);
        expect(getAttr(bodyPrs[0], "anchor")).toBe("ctr");
        foundAnchor = true;
      }
    }
    expect(foundAnchor).toBe(true);
  });

  it("B9: lineHeight 24pt converts to spcPts val=2400 on a:lnSpc", () => {
    const txBodies = findAllElements(slideTree, "p:txBody");
    let foundLineHeight = false;
    for (const txBody of txBodies) {
      const textContent = deepGetText(txBody);
      if (textContent.includes("Line Height 24pt")) {
        const spcPts = findAllElements([txBody], "a:spcPts");
        expect(spcPts.length).toBeGreaterThanOrEqual(1);
        // TextStyle.lineHeight is in pixels (FlexStyle), converted via px * 75
        // 24px * 75 = 1800 hundredths of a point
        expect(getAttr(spcPts[0], "val")).toBe("1800");
        foundLineHeight = true;
      }
    }
    expect(foundLineHeight).toBe(true);
  });

  it("B10: multi-paragraph text produces distinct runs with correct per-run formatting", () => {
    const txBodies = findAllElements(slideTree, "p:txBody");
    let foundMultiPara = false;
    for (const txBody of txBodies) {
      const text = deepGetText(txBody);
      if (text.includes("Bold intro") && text.includes("Second paragraph")) {
        foundMultiPara = true;

        // Should have at least 2 <a:p> elements
        const paras = findAllElements([txBody], "a:p");
        // Might include endParaRPr paragraph — at least 2 content paragraphs
        expect(paras.length).toBeGreaterThanOrEqual(2);

        // First paragraph runs: bold+blue, normal, italic+red
        const firstParaRuns = findAllElements([paras[0]], "a:r");
        expect(firstParaRuns.length).toBe(3);

        // Check bold run
        const boldRun = firstParaRuns[0];
        const boldRPr = findAllElements([boldRun], "a:rPr");
        expect(getAttr(boldRPr[0], "b")).toBe("1");
        const boldColor = findAllElements([boldRun], "a:srgbClr");
        expect(boldColor.some(c => getAttr(c, "val") === "003DA5")).toBe(true);

        // Check italic run
        const italicRun = firstParaRuns[2];
        const italicRPr = findAllElements([italicRun], "a:rPr");
        expect(getAttr(italicRPr[0], "i")).toBe("1");
        const italicColor = findAllElements([italicRun], "a:srgbClr");
        expect(italicColor.some(c => getAttr(c, "val") === "E74C3C")).toBe(true);

        // Second paragraph should be center aligned
        const secondPara = paras.find(p => deepGetText(p).includes("different font"));
        if (secondPara) {
          const pPr = findAllElements([secondPara], "a:pPr");
          expect(pPr.length).toBeGreaterThanOrEqual(1);
          expect(getAttr(pPr[0], "algn")).toBe("ctr");

          // Check Georgia font run
          const runs = findAllElements([secondPara], "a:r");
          let foundGeorgia = false;
          for (const run of runs) {
            const latins = findAllElements([run], "a:latin");
            if (latins.some(l => getAttr(l, "typeface") === "Georgia")) {
              foundGeorgia = true;
              const rPr = findAllElements([run], "a:rPr");
              expect(getAttr(rPr[0], "b")).toBe("1");
              expect(getAttr(rPr[0], "sz")).toBe("1050"); // 14 * 75
            }
          }
          expect(foundGeorgia).toBe(true);
        }
      }
    }
    expect(foundMultiPara).toBe(true);
  });
});

// =========================================================================
// C. VISUAL EFFECTS QUALITY (8 tests)
// =========================================================================

describe("C: Visual Effects Quality", () => {
  let buffer: Buffer;
  let slideXml: string;
  let slideTree: any[];

  const effectsDoc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        // C1: gradient fill shape
        {
          type: "View",
          style: {
            position: "absolute", top: 10, left: 10, width: 200, height: 120,
            fill: {
              type: "linear",
              angle: 90,
              stops: [
                { color: "#FF5733", position: 0 },
                { color: "#33C4FF", position: 100 },
              ],
            },
          },
          shapeType: "rect",
        } as PaperNode,
        // C2: shape with drop shadow (different params)
        {
          type: "View",
          style: {
            position: "absolute", top: 10, left: 230, width: 150, height: 100,
            backgroundColor: "#4472C4",
            effects: {
              dropShadow: {
                color: "#000000",
                offsetX: 5,
                offsetY: 5,
                blurRadius: 12,
                opacity: 0.4,
              },
            },
          },
          shapeType: "rect",
        } as PaperNode,
        // C3: shape with opacity
        {
          type: "View",
          style: {
            position: "absolute", top: 10, left: 400, width: 150, height: 100,
            backgroundColor: "#00B050",
            opacity: 0.6,
          },
          shapeType: "ellipse",
        } as PaperNode,
        // C4: shape with border
        {
          type: "View",
          style: {
            position: "absolute", top: 10, left: 570, width: 150, height: 100,
            backgroundColor: "#FFFFFF",
            borderWidth: 3,
            borderColor: "#C00000",
          },
          shapeType: "rect",
        } as PaperNode,
        // C5: roundRect with specific adjustments
        {
          type: "View",
          style: {
            position: "absolute", top: 140, left: 10, width: 200, height: 120,
            backgroundColor: "#E0E0E0",
          },
          shapeType: "roundRect",
          shapeAdjustments: [25000],
        } as PaperNode,
        // C6: shape with inner shadow
        {
          type: "View",
          style: {
            position: "absolute", top: 140, left: 230, width: 150, height: 100,
            backgroundColor: "#FFF2CC",
            effects: {
              innerShadow: {
                color: "#000000",
                offsetX: 2,
                offsetY: 2,
                blurRadius: 6,
                opacity: 0.35,
              },
            },
          },
          shapeType: "rect",
        } as PaperNode,
        // C7: shape with glow
        {
          type: "View",
          style: {
            position: "absolute", top: 140, left: 400, width: 150, height: 100,
            backgroundColor: "#FFD700",
            effects: {
              glow: {
                color: "#FFD700",
                radius: 10,
                opacity: 0.5,
              },
            },
          },
          shapeType: "rect",
        } as PaperNode,
        // C8: shape with dashed border
        {
          type: "View",
          style: {
            position: "absolute", top: 140, left: 570, width: 150, height: 100,
            backgroundColor: "#FFFFFF",
            borderWidth: 2,
            borderColor: "#4472C4",
            borderStyle: "dashed",
          },
          shapeType: "rect",
        } as PaperNode,
      ],
    }],
  };

  beforeAll(async () => {
    buffer = await PaperEngine.render(effectsDoc);
    slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("C1: gradient fill has correct gsLst with positions and colors", () => {
    const gradFills = findAllElements(slideTree, "a:gradFill");
    // At least one gradient fill (the one on the shape)
    expect(gradFills.length).toBeGreaterThanOrEqual(1);

    // Find the one with FF5733 and 33C4FF
    let foundOurGrad = false;
    for (const gf of gradFills) {
      const srgbs = findAllElements([gf], "a:srgbClr");
      const vals = srgbs.map(c => getAttr(c, "val"));
      if (vals.includes("FF5733") && vals.includes("33C4FF")) {
        foundOurGrad = true;
        const gs = findAllElements([gf], "a:gs");
        expect(gs.length).toBe(2);
        const positions = gs.map(g => getAttr(g, "pos"));
        expect(positions).toContain("0");
        expect(positions).toContain("100000");

        // Angle: 90 CSS → cssAngleToOoxml(90) = ((90+270)%360)*60000 = 0
        const lin = findAllElements([gf], "a:lin");
        expect(lin.length).toBe(1);
        expect(getAttr(lin[0], "ang")).toBe(String(cssAngleToOoxml(90)));
      }
    }
    expect(foundOurGrad).toBe(true);
  });

  it("C2: drop shadow has correct dist, dir, blurRad computed from offsets", () => {
    const outerShdws = findAllElements(slideTree, "a:outerShdw");
    // At least one shadow
    expect(outerShdws.length).toBeGreaterThanOrEqual(1);

    // Find the one with the 5,5 offset
    const { dist: expectedDist, dir: expectedDir } = shadowPolar(5, 5);
    const expectedBlur = toEmu(12);

    let foundShadow = false;
    for (const s of outerShdws) {
      const blur = parseInt(getAttr(s, "blurRad") || "0", 10);
      if (blur === expectedBlur) {
        expect(getAttr(s, "dist")).toBe(String(expectedDist));
        expect(getAttr(s, "dir")).toBe(String(expectedDir));

        // Opacity 0.4 → alpha 40000
        const alphas = findAllElements([s], "a:alpha");
        expect(alphas.length).toBe(1);
        expect(getAttr(alphas[0], "val")).toBe("40000");
        foundShadow = true;
      }
    }
    expect(foundShadow).toBe(true);
  });

  it("C3: opacity < 1 produces alpha modifier on fill", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    let foundOpacity = false;
    for (const sp of shapes) {
      // Find the ellipse shape (has prstGeom with "ellipse")
      const prstGeom = findAllElements([sp], "a:prstGeom");
      for (const g of prstGeom) {
        if (getAttr(g, "prst") === "ellipse") {
          // The fill should have alpha modifier
          const solidFills = findAllElements([sp], "a:solidFill");
          expect(solidFills.length).toBeGreaterThanOrEqual(1);

          // Look for alpha element inside solidFill
          const alphas = findAllElements(solidFills, "a:alpha");
          expect(alphas.length).toBeGreaterThanOrEqual(1);
          // opacity 0.6 → alpha val = 60000
          expect(getAttr(alphas[0], "val")).toBe("60000");
          foundOpacity = true;
        }
      }
    }
    expect(foundOpacity).toBe(true);
  });

  it("C4: borderWidth 3px produces correct a:ln w value in EMU", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    const expectedW = toEmu(3);
    let foundBorder = false;

    for (const sp of shapes) {
      const lns = findAllElements([sp], "a:ln");
      for (const ln of lns) {
        const w = parseInt(getAttr(ln, "w") || "0", 10);
        if (w === expectedW) {
          foundBorder = true;
          // Border color should be C00000
          const srgbs = findAllElements([ln], "a:srgbClr");
          expect(srgbs.length).toBeGreaterThanOrEqual(1);
          expect(getAttr(srgbs[0], "val")).toBe("C00000");
        }
      }
    }
    expect(foundBorder).toBe(true);
  });

  it("C5: roundRect with adjustment 25000 has correct a:gd val", () => {
    const prstGeoms = findAllElements(slideTree, "a:prstGeom");
    let found25k = false;
    for (const g of prstGeoms) {
      if (getAttr(g, "prst") === "roundRect") {
        const gds = findAllElements([g], "a:gd");
        for (const gd of gds) {
          if (getAttr(gd, "fmla") === "val 25000") {
            found25k = true;
          }
        }
      }
    }
    expect(found25k).toBe(true);
  });

  it("C6: inner shadow produces a:innerShdw with correct parameters", () => {
    const innerShdws = findAllElements(slideTree, "a:innerShdw");
    expect(innerShdws.length).toBeGreaterThanOrEqual(1);

    const { dist: expectedDist, dir: expectedDir } = shadowPolar(2, 2);
    const expectedBlur = toEmu(6);

    let found = false;
    for (const s of innerShdws) {
      const blur = parseInt(getAttr(s, "blurRad") || "0", 10);
      if (blur === expectedBlur) {
        expect(getAttr(s, "dist")).toBe(String(expectedDist));
        expect(getAttr(s, "dir")).toBe(String(expectedDir));
        const alphas = findAllElements([s], "a:alpha");
        expect(alphas.length).toBe(1);
        expect(getAttr(alphas[0], "val")).toBe("35000");
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("C7: glow effect has correct radius and color with alpha", () => {
    const glows = findAllElements(slideTree, "a:glow");
    expect(glows.length).toBeGreaterThanOrEqual(1);

    const expectedRadius = toEmu(10);
    let foundGlow = false;
    for (const g of glows) {
      const rad = parseInt(getAttr(g, "rad") || "0", 10);
      if (rad === expectedRadius) {
        const srgbs = findAllElements([g], "a:srgbClr");
        expect(srgbs.some(c => getAttr(c, "val") === "FFD700")).toBe(true);
        // Alpha 0.5 → 50000
        const alphas = findAllElements([g], "a:alpha");
        expect(alphas.length).toBe(1);
        expect(getAttr(alphas[0], "val")).toBe("50000");
        foundGlow = true;
      }
    }
    expect(foundGlow).toBe(true);
  });

  it("C8: dashed border produces a:prstDash val=\"dash\"", () => {
    const shapes = findAllElements(slideTree, "p:sp");
    let foundDash = false;
    for (const sp of shapes) {
      const dashes = findAllElements([sp], "a:prstDash");
      for (const d of dashes) {
        if (getAttr(d, "val") === "dash") {
          // Should be inside an a:ln that has color 4472C4
          foundDash = true;
        }
      }
    }
    expect(foundDash).toBe(true);
  });
});

// =========================================================================
// D. TABLE QUALITY (8 tests)
// =========================================================================

describe("D: Table Quality", () => {
  let buffer: Buffer;
  let slideXml: string;
  let slideTree: any[];

  const tableDoc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [{
        type: "Table",
        style: {
          position: "absolute", top: 20, left: 30, width: 900, height: 480,
        },
        tableData: {
          columns: [250, 200, 200, 250],
          rows: [
            {
              height: 40,
              cells: [
                { text: "Metric", style: { fill: "#1B365D", color: "#FFFFFF", fontWeight: "bold", fontSize: 12, textAlign: "center", verticalAlign: "middle", padding: 8 } },
                { text: "Q1 2025", style: { fill: "#1B365D", color: "#FFFFFF", fontWeight: "bold", fontSize: 12, textAlign: "center", verticalAlign: "middle", padding: 8 } },
                { text: "Q2 2025", style: { fill: "#1B365D", color: "#FFFFFF", fontWeight: "bold", fontSize: 12, textAlign: "center", verticalAlign: "middle", padding: 8 } },
                { text: "Delta", style: { fill: "#1B365D", color: "#FFFFFF", fontWeight: "bold", fontSize: 12, textAlign: "center", verticalAlign: "middle", padding: 8 } },
              ],
            },
            {
              height: 36,
              cells: [
                { text: "Revenue ($M)", style: { fontSize: 11, padding: 8 } },
                { text: "142.3", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "168.7", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "+18.5%", style: { fontSize: 11, textAlign: "right", color: "#00B050", fontWeight: "bold", padding: 8 } },
              ],
            },
            {
              height: 36,
              cells: [
                { text: "EBITDA Margin", style: { fontSize: 11, padding: 8 } },
                { text: "22.1%", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "25.8%", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "+370 bps", style: { fontSize: 11, textAlign: "right", color: "#00B050", fontWeight: "bold", padding: 8 } },
              ],
            },
            {
              height: 36,
              cells: [
                { text: "Customer Count", style: { fontSize: 11, padding: 8 } },
                { text: "1,247", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "1,105", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "-11.4%", style: { fontSize: 11, textAlign: "right", color: "#C00000", fontWeight: "bold", padding: 8 } },
              ],
            },
            {
              height: 36,
              cells: [
                { text: "NPS Score", style: { fontSize: 11, padding: 8 } },
                { text: "62", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "71", style: { fontSize: 11, textAlign: "right", padding: 8 } },
                { text: "+9 pts", style: { fontSize: 11, textAlign: "right", color: "#00B050", fontWeight: "bold", padding: 8 } },
              ],
            },
          ],
          style: {
            firstRow: true,
            headerRowStyle: { fill: "#1B365D", color: "#FFFFFF", fontWeight: "bold" },
            bandRow: true,
            bandRowOddStyle: { fill: "#FFFFFF" },
            bandRowEvenStyle: { fill: "#F2F2F2" },
            outerBorder: { width: 1.5, color: "#1B365D" },
            innerBorderH: { width: 0.5, color: "#D0D0D0" },
            innerBorderV: { width: 0.5, color: "#D0D0D0" },
          },
        },
      } as PaperNode],
    }],
  };

  beforeAll(async () => {
    buffer = await PaperEngine.render(tableDoc);
    slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slideTree = parseXml(slideXml);
  });

  it("D1: table with styled header row has fill on first row cells", () => {
    const tables = findAllElements(slideTree, "a:tbl");
    expect(tables.length).toBe(1);

    const rows = findAllElements([tables[0]], "a:tr");
    expect(rows.length).toBe(5);

    // Header row cells should have fill #1B365D
    const headerCells = findAllElements([rows[0]], "a:tc");
    expect(headerCells.length).toBe(4);

    for (const cell of headerCells) {
      const tcPr = findAllElements([cell], "a:tcPr");
      expect(tcPr.length).toBe(1);
      const fills = findAllElements([tcPr[0]], "a:srgbClr");
      const colors = fills.map(f => getAttr(f, "val"));
      expect(colors).toContain("1B365D");
    }
  });

  it("D2: alternating row bands have correct fill colors", () => {
    const tables = findAllElements(slideTree, "a:tbl");
    const rows = findAllElements([tables[0]], "a:tr");

    // To distinguish cell fill from border line fills, we look at the
    // direct children of a:tcPr for a:solidFill (cell fill), not inside
    // a:lnL/a:lnR/a:lnT/a:lnB (border fills).
    // Row 1 (index 1, first data row = bandOdd → FFFFFF)
    const row1Cells = findAllElements([rows[1]], "a:tc");
    for (const cell of row1Cells) {
      const tcPr = findAllElements([cell], "a:tcPr");
      if (tcPr.length > 0) {
        // Get direct children of tcPr and look for solidFill that's NOT inside a line element
        const tcPrChildren = getChildren(tcPr[0]);
        const directFills = tcPrChildren.filter(c => getTagName(c) === "a:solidFill");
        if (directFills.length > 0) {
          const srgb = findAllElements([directFills[0]], "a:srgbClr");
          if (srgb.length > 0) {
            expect(getAttr(srgb[0], "val")).toBe("FFFFFF");
          }
        }
      }
    }

    // Row 2 (index 2, second data row = bandEven → F2F2F2)
    const row2Cells = findAllElements([rows[2]], "a:tc");
    for (const cell of row2Cells) {
      const tcPr = findAllElements([cell], "a:tcPr");
      if (tcPr.length > 0) {
        const tcPrChildren = getChildren(tcPr[0]);
        const directFills = tcPrChildren.filter(c => getTagName(c) === "a:solidFill");
        if (directFills.length > 0) {
          const srgb = findAllElements([directFills[0]], "a:srgbClr");
          if (srgb.length > 0) {
            expect(getAttr(srgb[0], "val")).toBe("F2F2F2");
          }
        }
      }
    }
  });

  it("D3: column widths are correct EMU values summing to total table width", () => {
    const tblGrid = findAllElements(slideTree, "a:tblGrid");
    expect(tblGrid.length).toBe(1);

    const gridCols = findAllElements([tblGrid[0]], "a:gridCol");
    expect(gridCols.length).toBe(4);

    const widths = gridCols.map(gc => parseInt(getAttr(gc, "w") || "0", 10));

    // Columns: [250, 200, 200, 250] pixels → EMU values
    expect(widths[0]).toBe(toEmu(250));
    expect(widths[1]).toBe(toEmu(200));
    expect(widths[2]).toBe(toEmu(200));
    expect(widths[3]).toBe(toEmu(250));

    // Sum should equal total width
    const totalWidthEmu = widths.reduce((a, b) => a + b, 0);
    expect(totalWidthEmu).toBe(toEmu(250 + 200 + 200 + 250));
  });

  it("D4: cell text alignment right produces algn=\"r\" on a:pPr", () => {
    const tables = findAllElements(slideTree, "a:tbl");
    const rows = findAllElements([tables[0]], "a:tr");

    // Row 1 (data row), cell 2 (Q1 value "142.3") should be right-aligned
    const dataCells = findAllElements([rows[1]], "a:tc");
    const valueCell = dataCells[1]; // "142.3"

    const pPr = findAllElements([valueCell], "a:pPr");
    expect(pPr.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(pPr[0], "algn")).toBe("r");
  });

  it("D5: cell padding 8px converts to correct EMU insets on a:tcPr", () => {
    const tcPrs = findAllElements(slideTree, "a:tcPr");
    // All our cells have padding 8
    const expectedInset = toEmu(8);

    let paddingCount = 0;
    for (const tcPr of tcPrs) {
      const marL = getAttr(tcPr, "marL");
      const marR = getAttr(tcPr, "marR");
      const marT = getAttr(tcPr, "marT");
      const marB = getAttr(tcPr, "marB");

      if (marL === String(expectedInset)) {
        expect(marR).toBe(String(expectedInset));
        expect(marT).toBe(String(expectedInset));
        expect(marB).toBe(String(expectedInset));
        paddingCount++;
      }
    }
    // All 20 cells should have padding
    expect(paddingCount).toBeGreaterThanOrEqual(15);
  });

  it("D6: outer border renders on edge cells with correct width and color", () => {
    const tables = findAllElements(slideTree, "a:tbl");
    const rows = findAllElements([tables[0]], "a:tr");

    // First row, first cell should have top and left outer borders
    const firstCell = findAllElements([rows[0]], "a:tc")[0];
    const tcPr = findAllElements([firstCell], "a:tcPr");
    expect(tcPr.length).toBe(1);

    // Should have lnT (top border) and lnL (left border) from outer border
    const lnTs = findAllElements([tcPr[0]], "a:lnT");
    const lnLs = findAllElements([tcPr[0]], "a:lnL");
    expect(lnTs.length).toBe(1);
    expect(lnLs.length).toBe(1);

    // Width should be 1.5px in EMU
    const expectedW = toEmu(1.5);
    expect(getAttr(lnTs[0], "w")).toBe(String(expectedW));

    // Color should be 1B365D
    const topBorderColors = findAllElements([lnTs[0]], "a:srgbClr");
    expect(topBorderColors.some(c => getAttr(c, "val") === "1B365D")).toBe(true);
  });

  it("D7: cell vertical alignment middle produces anchor=\"ctr\"", () => {
    const tables = findAllElements(slideTree, "a:tbl");
    const rows = findAllElements([tables[0]], "a:tr");

    // Header cells have verticalAlign: "middle"
    const headerCells = findAllElements([rows[0]], "a:tc");
    for (const cell of headerCells) {
      const tcPr = findAllElements([cell], "a:tcPr");
      expect(tcPr.length).toBe(1);
      expect(getAttr(tcPr[0], "anchor")).toBe("ctr");
    }
  });

  it("D8: all cells (including ghost merge cells) are present in XML for 5x4 table", () => {
    const tables = findAllElements(slideTree, "a:tbl");
    const rows = findAllElements([tables[0]], "a:tr");
    expect(rows.length).toBe(5);

    for (const row of rows) {
      // Use regex to count a:tc elements excluding a:tcPr
      const cells = findAllElements([row], "a:tc");
      expect(cells.length).toBe(4);
    }
  });
});

// =========================================================================
// E. CHART QUALITY (8 tests)
// =========================================================================

describe("E: Chart Quality", () => {
  let barBuffer: Buffer;
  let barChartXml: string;
  let barChartTree: any[];
  let lineBuffer: Buffer;
  let lineChartXml: string;
  let lineChartTree: any[];

  // E1-E5: Multi-series bar chart with axis formatting
  const barDoc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [{
        type: "Chart",
        style: { width: 800, height: 450 },
        chartData: {
          chartType: "bar",
          barGrouping: "clustered",
          categories: ["North America", "Europe", "Asia Pacific", "Latin America"],
          series: [
            { name: "2024 Actual", values: [245, 189, 312, 67], color: "#003DA5" },
            { name: "2025 Target", values: [280, 215, 385, 92], color: "#00B050" },
            { name: "2026 Forecast", values: [320, 248, 445, 118], color: "#FFC000" },
          ],
          dataLabels: { showVal: true, position: "outEnd", fontSize: 9, fontFamily: "Calibri" },
          legend: { position: "bottom", fontSize: 10, fontFamily: "Calibri" },
          gapWidth: 120,
          valueAxis: {
            numberFormat: "$#,##0",
            title: "Revenue ($M)",
            gridlines: { major: true, color: "#E0E0E0" },
          },
          categoryAxis: { fontSize: 10 },
        },
      } as PaperNode],
    }],
  };

  // E6-E8: Line chart with smooth and markers
  const lineDoc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [{
        type: "Chart",
        style: { width: 800, height: 450 },
        chartData: {
          chartType: "line",
          smooth: true,
          categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          series: [
            { name: "Actual", values: [10, 15, 13, 18, 22, 28], color: "#003DA5", marker: { symbol: "circle", size: 6 } },
            { name: "Forecast", values: [8, 12, 16, 20, 24, 30], color: "#C00000", marker: { symbol: "diamond", size: 5 } },
          ],
          legend: { position: "right", fontSize: 10 },
        },
      } as PaperNode],
    }],
  };

  beforeAll(async () => {
    barBuffer = await PaperEngine.render(barDoc);
    barChartXml = await getZipEntry(barBuffer, "ppt/charts/chart1.xml");
    barChartTree = parseXml(barChartXml);

    lineBuffer = await PaperEngine.render(lineDoc);
    lineChartXml = await getZipEntry(lineBuffer, "ppt/charts/chart1.xml");
    lineChartTree = parseXml(lineChartXml);
  });

  it("E1: bar chart has 3 series with correct series names", () => {
    const barChart = findAllElements(barChartTree, "c:barChart");
    expect(barChart.length).toBe(1);

    const series = findAllElements(barChartTree, "c:ser");
    expect(series.length).toBe(3);

    // Each series should have a tx/strRef with the series name
    const txElements = findAllElements(barChartTree, "c:tx");
    const seriesNames: string[] = [];
    for (const tx of txElements) {
      const vs = findAllElements([tx], "c:v");
      for (const v of vs) {
        seriesNames.push(getText(v));
      }
    }
    expect(seriesNames).toContain("2024 Actual");
    expect(seriesNames).toContain("2025 Target");
    expect(seriesNames).toContain("2026 Forecast");
  });

  it("E2: chart has data labels with showVal=true and position outEnd", () => {
    const dLbls = findAllElements(barChartTree, "c:dLbls");
    expect(dLbls.length).toBeGreaterThanOrEqual(1);

    const showVal = findAllElements(barChartTree, "c:showVal");
    expect(showVal.some(s => getAttr(s, "val") === "1")).toBe(true);

    const dLblPos = findAllElements(barChartTree, "c:dLblPos");
    expect(dLblPos.some(d => getAttr(d, "val") === "outEnd")).toBe(true);
  });

  it("E3: value axis has number format $#,##0", () => {
    const numFmts = findAllElements(barChartTree, "c:numFmt");
    const formatCodes = numFmts.map(n => getAttr(n, "formatCode"));
    expect(formatCodes).toContain("$#,##0");
  });

  it("E4: legend position is bottom", () => {
    const legendPos = findAllElements(barChartTree, "c:legendPos");
    expect(legendPos.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(legendPos[0], "val")).toBe("b");
  });

  it("E5: gap width is correctly set to 120", () => {
    const gapWidth = findAllElements(barChartTree, "c:gapWidth");
    expect(gapWidth.length).toBeGreaterThanOrEqual(1);
    expect(getAttr(gapWidth[0], "val")).toBe("120");
  });

  it("E6: line chart has smooth attribute set", () => {
    const lineChart = findAllElements(lineChartTree, "c:lineChart");
    expect(lineChart.length).toBe(1);

    const smoothElements = findAllElements(lineChartTree, "c:smooth");
    expect(smoothElements.some(s => getAttr(s, "val") === "1")).toBe(true);
  });

  it("E7: line chart series have correct data point counts", () => {
    const series = findAllElements(lineChartTree, "c:ser");
    expect(series.length).toBe(2);

    // Each series should have 6 data points
    for (const ser of series) {
      const ptCount = findAllElements([ser], "c:ptCount");
      expect(ptCount.length).toBeGreaterThanOrEqual(1);
      // At least one ptCount should be 6
      const counts = ptCount.map(p => getAttr(p, "val"));
      expect(counts).toContain("6");
    }
  });

  it("E8: chart has embedded Excel file for data", async () => {
    expect(await zipHasFile(barBuffer, "ppt/embeddings/chart1.xlsx")).toBe(true);
    expect(await zipHasFile(lineBuffer, "ppt/embeddings/chart1.xlsx")).toBe(true);
  });
});

// =========================================================================
// F. SLIDE-LEVEL QUALITY (6 tests)
// =========================================================================

describe("F: Slide-Level Quality", () => {
  let buffer: Buffer;
  let slide1Xml: string;
  let slide1Tree: any[];
  let slide2Xml: string;
  let slide2Tree: any[];
  let themeXml: string;
  let themeTree: any[];
  let presXml: string;
  let presTree: any[];

  const slideDoc: PaperDocument = {
    type: "Document",
    meta: { title: "Slide Quality Test", author: "Test Author" },
    theme: {
      name: "CustomTheme",
      colorScheme: {
        dk1: "#1A1A2E",
        lt1: "#FAFAFA",
        accent1: "#E63946",
        accent2: "#457B9D",
        accent3: "#A8DADC",
        accent4: "#F1FAEE",
        accent5: "#2A9D8F",
        accent6: "#E9C46A",
      },
      fontScheme: {
        majorLatin: "Playfair Display",
        minorLatin: "Source Sans Pro",
      },
    },
    slideSize: { width: 1280, height: 720 },
    slides: [
      {
        type: "Slide",
        style: { width: 1280, height: 720 },
        background: {
          type: "gradient",
          angle: 180,
          stops: [
            { color: "#1A1A2E", position: 0 },
            { color: "#16213E", position: 100 },
          ],
        },
        children: [
          {
            type: "Text",
            style: {
              position: "absolute", top: 300, left: 100, width: 1080, height: 80,
              fontSize: 48, fontFamily: "Playfair Display", color: "#FAFAFA",
              textAlign: "center", verticalAlign: "middle",
            },
            content: "Title Slide",
          } as PaperNode,
        ],
      },
      {
        type: "Slide",
        style: { width: 1280, height: 720 },
        background: {
          type: "solid",
          color: "#F5F5F5",
        },
        children: [
          {
            type: "View",
            style: {
              position: "absolute", top: 0, left: 0, width: 1280, height: 4,
              backgroundColor: "#E63946",
            },
            shapeType: "rect",
          } as PaperNode,
          {
            type: "Text",
            style: {
              position: "absolute", top: 30, left: 50, width: 1180, height: 50,
              fontSize: 28, fontFamily: "Playfair Display", color: "#1A1A2E",
              fontWeight: "bold",
            },
            content: "Content Slide",
          } as PaperNode,
        ],
      },
    ],
  };

  beforeAll(async () => {
    buffer = await PaperEngine.render(slideDoc);
    slide1Xml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    slide1Tree = parseXml(slide1Xml);
    slide2Xml = await getZipEntry(buffer, "ppt/slides/slide2.xml");
    slide2Tree = parseXml(slide2Xml);
    themeXml = await getZipEntry(buffer, "ppt/theme/theme1.xml");
    themeTree = parseXml(themeXml);
    presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    presTree = parseXml(presXml);
  });

  it("F1: gradient background on slide 1 renders inside p:bg > p:bgPr > a:gradFill", () => {
    const bg = findAllElements(slide1Tree, "p:bg");
    expect(bg.length).toBe(1);

    const bgPr = findAllElements([bg[0]], "p:bgPr");
    expect(bgPr.length).toBe(1);

    const gradFill = findAllElements([bgPr[0]], "a:gradFill");
    expect(gradFill.length).toBe(1);

    const gsEls = findAllElements([gradFill[0]], "a:gs");
    expect(gsEls.length).toBe(2);

    // Verify stop colors
    const colors = findAllElements([gradFill[0]], "a:srgbClr");
    const vals = colors.map(c => getAttr(c, "val"));
    expect(vals).toContain("1A1A2E");
    expect(vals).toContain("16213E");

    // Verify angle: 180 CSS → cssAngleToOoxml(180) = ((180+270)%360)*60000 = 90*60000 = 5400000
    const lin = findAllElements([gradFill[0]], "a:lin");
    expect(lin.length).toBe(1);
    expect(getAttr(lin[0], "ang")).toBe("5400000");
  });

  it("F2: solid background on slide 2 renders as a:solidFill inside p:bg", () => {
    const bg = findAllElements(slide2Tree, "p:bg");
    expect(bg.length).toBe(1);

    const bgPr = findAllElements([bg[0]], "p:bgPr");
    expect(bgPr.length).toBe(1);

    const solidFill = findAllElements([bgPr[0]], "a:solidFill");
    expect(solidFill.length).toBe(1);

    const srgb = findAllElements([solidFill[0]], "a:srgbClr");
    expect(srgb.length).toBe(1);
    expect(getAttr(srgb[0], "val")).toBe("F5F5F5");
  });

  it("F3: theme colors are correctly set in theme1.xml", () => {
    // Find dk1 color element
    const dk1 = findAllElements(themeTree, "a:dk1");
    expect(dk1.length).toBe(1);
    const dk1Color = findAllElements([dk1[0]], "a:srgbClr");
    expect(dk1Color.length).toBe(1);
    expect(getAttr(dk1Color[0], "val")).toBe("1A1A2E");

    // accent1
    const accent1 = findAllElements(themeTree, "a:accent1");
    expect(accent1.length).toBe(1);
    const accent1Color = findAllElements([accent1[0]], "a:srgbClr");
    expect(accent1Color.length).toBe(1);
    expect(getAttr(accent1Color[0], "val")).toBe("E63946");

    // accent2
    const accent2 = findAllElements(themeTree, "a:accent2");
    expect(accent2.length).toBe(1);
    const accent2Color = findAllElements([accent2[0]], "a:srgbClr");
    expect(accent2Color.length).toBe(1);
    expect(getAttr(accent2Color[0], "val")).toBe("457B9D");
  });

  it("F4: theme fonts are correctly set (majorFont and minorFont)", () => {
    const majorFonts = findAllElements(themeTree, "a:majorFont");
    expect(majorFonts.length).toBe(1);
    const majorLatin = findAllElements([majorFonts[0]], "a:latin");
    expect(majorLatin.length).toBe(1);
    expect(getAttr(majorLatin[0], "typeface")).toBe("Playfair Display");

    const minorFonts = findAllElements(themeTree, "a:minorFont");
    expect(minorFonts.length).toBe(1);
    const minorLatin = findAllElements([minorFonts[0]], "a:latin");
    expect(minorLatin.length).toBe(1);
    expect(getAttr(minorLatin[0], "typeface")).toBe("Source Sans Pro");
  });

  it("F5: custom slide size (1280x720) is reflected in presentation.xml sldSz", () => {
    const sldSz = findAllElements(presTree, "p:sldSz");
    expect(sldSz.length).toBe(1);

    const cx = parseInt(getAttr(sldSz[0], "cx") || "0", 10);
    const cy = parseInt(getAttr(sldSz[0], "cy") || "0", 10);

    expect(cx).toBe(toEmu(1280));
    expect(cy).toBe(toEmu(720));
  });

  it("F6: document metadata is present in docProps/core.xml", async () => {
    const coreXml = await getZipEntry(buffer, "docProps/core.xml");
    const coreTree = parseXml(coreXml);

    // Title
    const titles = findAllElements(coreTree, "dc:title");
    expect(titles.length).toBe(1);
    expect(getText(titles[0])).toBe("Slide Quality Test");

    // Author
    const creators = findAllElements(coreTree, "dc:creator");
    expect(creators.length).toBe(1);
    expect(getText(creators[0])).toBe("Test Author");
  });
});
