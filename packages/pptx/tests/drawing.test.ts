import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { toEmu, toHex, PIXEL_TO_EMU, cssAngleToOoxml, shadowPolar, emitFillXml, emitLineXml, emitEffectsXml, emitColorWithAlpha } from "../src/ooxml/drawing/math.js";
import { generateShapeXml } from "../src/ooxml/drawing/shape.js";
import { generateTextXml } from "../src/ooxml/drawing/text.js";
import { serializeSlideTree } from "../src/ooxml/drawing/orchestrator.js";
import { PptxArchive } from "../src/ooxml/zipper.js";
import { buildShapePath } from "../src/svg/shapePaths.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { FlexStyle } from "../src/types/ast.js";
import { PaperDocumentSchema } from "../src/validator/schema.js";

// ---------------------------------------------------------------------------
// Benchmark 1: EMU Math Accuracy
// ---------------------------------------------------------------------------
describe("Benchmark 1: EMU Math Accuracy", () => {
  it("PIXEL_TO_EMU constant is 9525", () => {
    expect(PIXEL_TO_EMU).toBe(9525);
  });

  it("toEmu rounds integer pixels exactly", () => {
    expect(toEmu(100)).toBe(952500);
  });

  it("toEmu rounds fractional pixels without decimals", () => {
    expect(toEmu(50.5)).toBe(481013);
    expect(Number.isInteger(toEmu(50.5))).toBe(true);
  });

  it("generates shape XML with correct EMU offsets: x=100, y=50.5", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#CCCCCC" },
      layout: { x: 100, y: 50.5, width: 200, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);

    expect(xml).toContain('<a:off x="952500" y="481013"/>');
    // No decimals anywhere in attribute values
    expect(xml).not.toMatch(/x="\d+\.\d+"/);
    expect(xml).not.toMatch(/y="\d+\.\d+"/);
    expect(xml).not.toMatch(/cx="\d+\.\d+"/);
    expect(xml).not.toMatch(/cy="\d+\.\d+"/);
  });

  it("toHex strips # and uppercases", () => {
    expect(toHex("#ff0000")).toBe("FF0000");
    expect(toHex("#FFFFFF")).toBe("FFFFFF");
    expect(toHex("abcdef")).toBe("ABCDEF");
  });
});

// ---------------------------------------------------------------------------
// Benchmark 2: Text Escaping & Sizing
// ---------------------------------------------------------------------------
describe("Benchmark 2: Text Escaping & Sizing", () => {
  it("emits sz in hundredths of a point: fontSize 32 → sz=2400", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Hello",
      style: { fontSize: 32 },
      layout: { x: 0, y: 0, width: 300, height: 50 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 3);
    expect(xml).toContain('sz="2400"');
  });

  it("escapes & < > \" ' in text content", () => {
    const node: LayoutNode = {
      type: "Text",
      content: 'Q&A < "Session"',
      style: { fontSize: 32 },
      layout: { x: 0, y: 0, width: 300, height: 50 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 3);
    expect(xml).toContain('<a:rPr lang="en-US" sz="2400"');
    expect(xml).toContain('<a:t>Q&amp;A &lt; &quot;Session&quot;</a:t>');
  });

  it("defaults fontSize to 16 when not specified (sz=1200)", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Default size",
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 4);
    expect(xml).toContain('sz="1200"');
  });

  it("emits txBox='1' on the cNvSpPr element", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Test",
      layout: { x: 0, y: 0, width: 100, height: 20 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 5);
    expect(xml).toContain('<p:cNvSpPr txBox="1"/>');
  });

  it("emits noFill on text box shape properties when no backgroundColor", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Test",
      layout: { x: 0, y: 0, width: 100, height: 20 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 5);
    expect(xml).toContain("<a:noFill/>");
  });

  it("emits b='1' when fontWeight is bold", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Bold text",
      style: { fontSize: 16, fontWeight: "bold" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 6);
    expect(xml).toContain(' b="1"');
  });

  it("does not emit b='1' when fontWeight is normal or unset", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Normal text",
      style: { fontSize: 16, fontWeight: "normal" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 6);
    expect(xml).not.toContain(' b="1"');
  });

  it("emits i='1' when fontStyle is italic", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Italic text",
      style: { fontSize: 16, fontStyle: "italic" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 7);
    expect(xml).toContain(' i="1"');
  });

  it("emits both b='1' and i='1' together", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Bold italic",
      style: { fontSize: 16, fontWeight: "bold", fontStyle: "italic" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 8);
    expect(xml).toContain(' b="1"');
    expect(xml).toContain(' i="1"');
  });

  it("emits algn='ctr' for textAlign center", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Centered",
      style: { fontSize: 16, textAlign: "center" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 9);
    expect(xml).toContain('algn="ctr"');
  });

  it("emits algn='r' for textAlign right", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Right",
      style: { fontSize: 16, textAlign: "right" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 10);
    expect(xml).toContain('algn="r"');
  });

  it("emits algn='l' for textAlign left", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Left",
      style: { fontSize: 16, textAlign: "left" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 11);
    expect(xml).toContain('algn="l"');
  });

  it("emits lnSpc with spcPts for lineHeight", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Spaced",
      style: { fontSize: 16, lineHeight: 32 },
      layout: { x: 0, y: 0, width: 200, height: 60 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 12);
    // 32px * 75 = 2400 hundredths of a point
    expect(xml).toContain('<a:lnSpc><a:spcPts val="2400"/></a:lnSpc>');
  });

  it("emits solidFill instead of noFill when text has backgroundColor", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Highlighted",
      style: { fontSize: 16, backgroundColor: "#FFFF00" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 13);
    // Fill should be solidFill (not noFill) — but a:ln still has noFill for border
    expect(xml).toContain("<a:solidFill>");
    expect(xml).toContain('<a:srgbClr val="FFFF00"/>');
    expect(xml).not.toMatch(/<a:noFill\/>\s*<a:ln>/); // no direct noFill before ln
  });

  it("always emits pPr with computed line spacing even without textAlign or lineHeight", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Plain",
      style: { fontSize: 16 },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 14);
    // Now always emits <a:pPr> with computed <a:lnSpc> to pin line spacing
    expect(xml).toContain("<a:pPr>");
    expect(xml).toContain("<a:lnSpc>");
    expect(xml).toContain("<a:spcPts");
  });
});

// ---------------------------------------------------------------------------
// Benchmark 3: Visual Output (Integration)
// ---------------------------------------------------------------------------
describe("Benchmark 3: Visual Output Integration", () => {
  it("serializeSlideTree produces shape XML for a View with backgroundColor", () => {
    const viewNode: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#FF0000" },
      layout: { x: 50, y: 50, width: 200, height: 150 },
      children: [],
    } as LayoutNode;

    const { xml } = serializeSlideTree(viewNode);
    expect(xml).toContain('<a:srgbClr val="FF0000"/>');
    expect(xml).toContain('<p:cNvPr id="2"');
  });

  it("serializeSlideTree emits text nodes inside a View's children", () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      children: [
        {
          type: "View",
          style: { backgroundColor: "#FF0000" },
          layout: { x: 50, y: 50, width: 400, height: 300 },
          children: [
            {
              type: "Text",
              content: "Hello Slide",
              style: { fontSize: 24, color: "#FFFFFF" },
              layout: { x: 60, y: 60, width: 380, height: 40 },
            } as LayoutNode,
          ],
        } as LayoutNode,
      ],
      layout: { x: 0, y: 0, width: 1280, height: 720 },
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);
    expect(xml).toContain('<a:srgbClr val="FF0000"/>');
    expect(xml).toContain("Hello Slide");
    expect(xml).toContain('<a:srgbClr val="FFFFFF"/>');
    expect(xml).toContain('sz="1800"');
  });

  it("generates a valid PPTX buffer containing the red View and nested Text", async () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      children: [
        {
          type: "View",
          style: { backgroundColor: "#FF0000" },
          layout: { x: 50, y: 50, width: 400, height: 300 },
          children: [
            {
              type: "Text",
              content: "Integration Test",
              style: { fontSize: 20, color: "#FFFFFF", fontFamily: "Calibri" },
              layout: { x: 60, y: 60, width: 380, height: 40 },
            } as LayoutNode,
          ],
        } as LayoutNode,
      ],
      layout: { x: 0, y: 0, width: 1280, height: 720 },
    } as LayoutNode;

    const result = serializeSlideTree(slideNode);
    const archive = new PptxArchive();
    archive.assemblePresentation(1, { slideContents: [result.xml] });
    const buffer = await archive.generateBuffer();

    // Must be a valid ZIP
    const zip = await JSZip.loadAsync(buffer);

    // Slide file must exist
    const slideFile = zip.file("ppt/slides/slide1.xml");
    expect(slideFile).not.toBeNull();

    const slideXml = await slideFile!.async("string");

    // Red rectangle shape
    expect(slideXml).toContain('<a:srgbClr val="FF0000"/>');
    // Text content
    expect(slideXml).toContain("Integration Test");
    // Custom font
    expect(slideXml).toContain('typeface="Calibri"');
    // No Repair: slide must have the correct namespace
    expect(slideXml).toContain(
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"',
    );
  });

  it("serializeSlideTree skips shape emission for View without backgroundColor", () => {
    const viewNode: LayoutNode = {
      type: "View",
      style: {},
      layout: { x: 0, y: 0, width: 100, height: 100 },
      children: [
        {
          type: "Text",
          content: "Bare text",
          layout: { x: 5, y: 5, width: 90, height: 30 },
        } as LayoutNode,
      ],
    } as LayoutNode;

    const { xml } = serializeSlideTree(viewNode);
    // No shape emitted for the transparent View, but text child still renders
    expect(xml).not.toContain("View 2");
    expect(xml).toContain("Bare text");
  });

  it("idCounter increments correctly across siblings", () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      children: [
        {
          type: "View",
          style: { backgroundColor: "#111111" },
          layout: { x: 0, y: 0, width: 100, height: 100 },
          children: [],
        } as LayoutNode,
        {
          type: "View",
          style: { backgroundColor: "#222222" },
          layout: { x: 100, y: 0, width: 100, height: 100 },
          children: [],
        } as LayoutNode,
      ],
      layout: { x: 0, y: 0, width: 1280, height: 720 },
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);
    expect(xml).toContain('id="2"');
    expect(xml).toContain('id="3"');
  });
});

// ---------------------------------------------------------------------------
// Text Decoration Tests (Feature 1.2)
// ---------------------------------------------------------------------------
describe("Text Decorations", () => {
  it("emits u='sng' for underline solid", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Underlined",
      style: { fontSize: 16, textDecorationLine: "underline" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' u="sng"');
  });

  it("emits u='dbl' for underline double", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Double underline",
      style: { fontSize: 16, textDecorationLine: "underline", textDecorationStyle: "double" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' u="dbl"');
  });

  it("emits strike='sngStrike' for strikethrough", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Strikethrough",
      style: { fontSize: 16, textDecorationLine: "strikethrough" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' strike="sngStrike"');
    expect(xml).not.toContain(' u="');
  });

  it("emits both u and strike for underline-strikethrough", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Both",
      style: { fontSize: 16, textDecorationLine: "underline-strikethrough" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' u="sng"');
    expect(xml).toContain(' strike="sngStrike"');
  });

  it("run-level decoration overrides paragraph-level", () => {
    const node: LayoutNode = {
      type: "Text",
      content: [
        { text: "underlined run", style: { textDecorationLine: "underline" } },
      ],
      style: { fontSize: 16, textDecorationLine: "strikethrough" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' u="sng"');
    expect(xml).not.toContain(' strike="');
  });

  it("emits u='dot' for underline dotted", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Dotted underline",
      style: { fontSize: 16, textDecorationLine: "underline", textDecorationStyle: "dotted" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' u="dot"');
  });

  it("emits strike='dblStrike' for strikethrough double", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Double strike",
      style: { fontSize: 16, textDecorationLine: "strikethrough", textDecorationStyle: "double" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain(' strike="dblStrike"');
  });
});

// ---------------------------------------------------------------------------
// Shape Geometry Tests (Feature 1.3)
// ---------------------------------------------------------------------------
describe("Shape Geometry", () => {
  it("emits prst='ellipse' for ellipse shapeType", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#FF0000" },
      shapeType: "ellipse",
      layout: { x: 0, y: 0, width: 100, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('prst="ellipse"');
  });

  it("emits prst='roundRect' with adjustment values", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#FF0000" },
      shapeType: "roundRect",
      shapeAdjustments: [16667],
      layout: { x: 0, y: 0, width: 200, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('prst="roundRect"');
    expect(xml).toContain('<a:gd name="adj" fmla="val 16667"/>');
  });

  it("accepts style.borderRadius on View nodes through schema validation", () => {
    expect(() => PaperDocumentSchema.parse({
      type: "Document",
      meta: { title: "Border radius parse" },
      slides: [{
        type: "Slide",
        children: [{
          type: "View",
          style: {
            width: 240,
            height: 120,
            backgroundColor: "#FF0000",
            borderRadius: 24,
          },
          children: [],
        }],
      }],
    })).not.toThrow();
  });

  it("synthesizes roundRect geometry from style.borderRadius on View nodes", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#FF0000", borderRadius: 20 },
      layout: { x: 0, y: 0, width: 200, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('prst="roundRect"');
    expect(xml).toContain('<a:gd name="adj" fmla="val 20000"/>');
  });

  it("builds an SVG rounded-rectangle path from style.borderRadius on View nodes", () => {
    const result = buildShapePath(
      {
        type: "View",
        style: { borderRadius: 20 },
      },
      0,
      0,
      100,
      50,
    );

    expect(result.d).toContain("M 20 0");
    expect(result.d).toContain("Q 100 0 100 20");
  });

  it("preserves explicit shapeType precedence over style.borderRadius", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#FF0000", borderRadius: 20 },
      shapeType: "ellipse",
      layout: { x: 0, y: 0, width: 200, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('prst="ellipse"');
    expect(xml).not.toContain('prst="roundRect"');
  });

  it("defaults to prst='rect' when no shapeType", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#0000FF" },
      layout: { x: 0, y: 0, width: 100, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('prst="rect"');
  });

  it("emits shapeType via serializeSlideTree when shapeType is set", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#00FF00" },
      shapeType: "diamond",
      layout: { x: 10, y: 10, width: 80, height: 80 },
      children: [],
    } as LayoutNode;

    const { xml } = serializeSlideTree(node);
    expect(xml).toContain('prst="diamond"');
  });

  it("emits shape for View with shapeType but no backgroundColor", () => {
    const node: LayoutNode = {
      type: "View",
      style: {},
      shapeType: "ellipse",
      layout: { x: 0, y: 0, width: 100, height: 100 },
      children: [],
    } as LayoutNode;

    const { xml } = serializeSlideTree(node);
    expect(xml).toContain('prst="ellipse"');
  });
});

// ---------------------------------------------------------------------------
// Stroke / Border Tests (Feature 2.1)
// ---------------------------------------------------------------------------
describe("Strokes / Borders", () => {
  it("emits <a:ln w=...> with solid fill for borderWidth", () => {
    const style: FlexStyle = { borderWidth: 2, borderColor: "#FF0000" };
    const xml = emitLineXml(style);
    expect(xml).toContain(`w="${toEmu(2)}"`);
    expect(xml).toContain('<a:srgbClr val="FF0000"/>');
  });

  it("emits <a:prstDash val='dash'/> for dashed border", () => {
    const style: FlexStyle = { borderWidth: 1, borderColor: "#000000", borderStyle: "dashed" };
    const xml = emitLineXml(style);
    expect(xml).toContain('<a:prstDash val="dash"/>');
  });

  it("emits <a:prstDash val='dot'/> for dotted border", () => {
    const style: FlexStyle = { borderWidth: 1, borderColor: "#000000", borderStyle: "dotted" };
    const xml = emitLineXml(style);
    expect(xml).toContain('<a:prstDash val="dot"/>');
  });

  it("emits <a:ln><a:noFill/><a:round/></a:ln> for no border", () => {
    const xml = emitLineXml({});
    expect(xml).toBe('<a:ln><a:noFill/><a:round/></a:ln>');
  });

  it("emits cap attribute for borderCap", () => {
    const style: FlexStyle = { borderWidth: 2, borderColor: "#000000", borderCap: "round" };
    const xml = emitLineXml(style);
    expect(xml).toContain('cap="rnd"');
  });

  it("shape XML includes border line", () => {
    const node: LayoutNode = {
      type: "View",
      style: { borderWidth: 3, borderColor: "#0000FF" },
      layout: { x: 0, y: 0, width: 100, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain(`w="${toEmu(3)}"`);
    expect(xml).toContain('<a:srgbClr val="0000FF"/>');
  });
});

// ---------------------------------------------------------------------------
// Gradient Tests (Feature 2.2)
// ---------------------------------------------------------------------------
describe("Gradients", () => {
  it("CSS 180° (top-to-bottom) converts to OOXML ang=5400000", () => {
    expect(cssAngleToOoxml(180)).toBe(5400000);
  });

  it("CSS 0° (bottom-to-top) converts to OOXML ang=16200000", () => {
    expect(cssAngleToOoxml(0)).toBe(16200000);
  });

  it("CSS 90° (left-to-right) converts to OOXML ang=0", () => {
    expect(cssAngleToOoxml(90)).toBe(0);
  });

  it("emits gradient stops with correct position quantization", () => {
    const style: FlexStyle = {
      fill: {
        type: "linear",
        angle: 180,
        stops: [
          { color: "#FF0000", position: 0 },
          { color: "#0000FF", position: 50 },
          { color: "#00FF00", position: 100 },
        ],
      },
    };
    const xml = emitFillXml(style);
    expect(xml).toContain('<a:gs pos="0">');
    expect(xml).toContain('<a:gs pos="50000">');
    expect(xml).toContain('<a:gs pos="100000">');
    expect(xml).toContain('ang="5400000"');
  });

  it("emits radial gradient with circle path", () => {
    const style: FlexStyle = {
      fill: {
        type: "radial",
        stops: [
          { color: "#FFFFFF", position: 0 },
          { color: "#000000", position: 100 },
        ],
      },
    };
    const xml = emitFillXml(style);
    expect(xml).toContain('<a:path path="circle">');
    expect(xml).toContain('<a:fillToRect l="50000" t="50000" r="50000" b="50000"/>');
  });

  it("solid fill via fill property", () => {
    const style: FlexStyle = {
      fill: { type: "solid", color: "#AABBCC" },
    };
    const xml = emitFillXml(style);
    expect(xml).toContain('<a:srgbClr val="AABBCC"/>');
  });

  it("fill takes precedence over backgroundColor", () => {
    const style: FlexStyle = {
      backgroundColor: "#FF0000",
      fill: { type: "solid", color: "#00FF00" },
    };
    const xml = emitFillXml(style);
    expect(xml).toContain('<a:srgbClr val="00FF00"/>');
    expect(xml).not.toContain('FF0000');
  });
});

// ---------------------------------------------------------------------------
// Effects Tests (Feature 2.3)
// ---------------------------------------------------------------------------
describe("Effects", () => {
  it("shadow polar math: offsetX=10, offsetY=10", () => {
    const { dist, dir } = shadowPolar(10, 10);
    // sqrt(100+100) * 9525 ≈ 14.142 * 9525 ≈ 134703
    expect(dist).toBe(Math.round(Math.sqrt(200) * 9525));
    // atan2(10,10) = 45° → 2700000
    expect(dir).toBe(2700000);
  });

  it("alpha modifier: opacity 0.5 → <a:alpha val='50000'/>", () => {
    const xml = emitColorWithAlpha("#FF0000", 0.5);
    expect(xml).toContain('<a:alpha val="50000"/>');
    expect(xml).toContain('val="FF0000"');
  });

  it("no alpha modifier when opacity is 1", () => {
    const xml = emitColorWithAlpha("#FF0000", 1);
    expect(xml).not.toContain("a:alpha");
  });

  it("emits glow radius in EMU", () => {
    const style: FlexStyle = {
      effects: {
        glow: { color: "#FFFF00", radius: 5, opacity: 0.8 },
      },
    };
    const xml = emitEffectsXml(style);
    expect(xml).toContain(`rad="${toEmu(5)}"`);
    expect(xml).toContain('<a:alpha val="80000"/>');
  });

  it("emits drop shadow with blur, dist, dir", () => {
    const style: FlexStyle = {
      effects: {
        dropShadow: {
          color: "#000000",
          offsetX: 5,
          offsetY: 5,
          blurRadius: 10,
          opacity: 0.5,
        },
      },
    };
    const xml = emitEffectsXml(style);
    expect(xml).toContain(`blurRad="${toEmu(10)}"`);
    expect(xml).toContain('<a:alpha val="50000"/>');
    expect(xml).toContain("<a:outerShdw");
  });

  it("returns empty string when no effects", () => {
    expect(emitEffectsXml({})).toBe("");
    expect(emitEffectsXml(undefined)).toBe("");
  });

  it("shape XML includes effectLst when effects present", () => {
    const node: LayoutNode = {
      type: "View",
      style: {
        backgroundColor: "#FF0000",
        effects: {
          dropShadow: { color: "#000000", offsetX: 3, offsetY: 3, blurRadius: 6 },
        },
      },
      layout: { x: 0, y: 0, width: 100, height: 100 },
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain("<a:effectLst>");
    expect(xml).toContain("<a:outerShdw");
  });
});

// ---------------------------------------------------------------------------
// Display None Tests
// ---------------------------------------------------------------------------
describe("Display None", () => {
  it("serializeSlideTree skips nodes with display:none", () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      children: [
        {
          type: "View",
          style: { backgroundColor: "#FF0000", display: "none" },
          layout: { x: 0, y: 0, width: 100, height: 100 },
          children: [],
        } as LayoutNode,
        {
          type: "Text",
          content: "Visible",
          style: { fontSize: 16 },
          layout: { x: 0, y: 100, width: 200, height: 30 },
        } as LayoutNode,
      ],
      layout: { x: 0, y: 0, width: 1280, height: 720 },
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);
    expect(xml).not.toContain('FF0000');
    expect(xml).toContain("Visible");
  });

  it("serializeSlideTree emits shape for View with effects but no bg", () => {
    const node: LayoutNode = {
      type: "View",
      style: {
        effects: {
          glow: { color: "#FFFF00", radius: 5 },
        },
      },
      layout: { x: 0, y: 0, width: 100, height: 100 },
      children: [],
    } as LayoutNode;

    const { xml } = serializeSlideTree(node);
    expect(xml).toContain("<a:effectLst>");
  });
});
