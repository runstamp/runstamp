import { describe, it, expect } from "vitest";
import { generateTextXml } from "../src/ooxml/drawing/text.js";
import { generateShapeXml } from "../src/ooxml/drawing/shape.js";
import type { LayoutNode } from "../src/layout/extract.js";

describe("Rich Text Runs", () => {
  it("normalizes string content to a single run", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Hello",
      style: { fontSize: 16 },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain("<a:t>Hello</a:t>");
    // Should have exactly one <a:r> block
    expect((xml.match(/<a:r>/g) ?? []).length).toBe(1);
  });

  it("emits multiple <a:r> blocks for TextRun[] content", () => {
    const node: LayoutNode = {
      type: "Text",
      content: [
        { text: "Hello " },
        { text: "World", style: { fontWeight: "bold" } },
      ],
      style: { fontSize: 16, color: "#000000" },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect((xml.match(/<a:r>/g) ?? []).length).toBe(2);
    expect(xml).toContain("<a:t>Hello </a:t>");
    expect(xml).toContain("<a:t>World</a:t>");
    expect(xml).toContain(' b="1"');
  });

  it("merges run style over node defaults", () => {
    const node: LayoutNode = {
      type: "Text",
      content: [
        { text: "Default" },
        { text: "Custom", style: { fontSize: 24, color: "#FF0000" } },
      ],
      style: { fontSize: 16, color: "#000000" },
      layout: { x: 0, y: 0, width: 300, height: 50 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    // Default run: sz=1200 (16px * 75)
    expect(xml).toContain('sz="1200"');
    // Custom run: sz=1800 (24px * 75)
    expect(xml).toContain('sz="1800"');
    // Custom run color
    expect(xml).toContain('<a:srgbClr val="FF0000"/>');
  });

  it("emits hyperlink <a:hlinkClick> and collects rels", () => {
    const node: LayoutNode = {
      type: "Text",
      content: [
        { text: "Click here", hyperlink: "https://example.com" },
      ],
      style: { fontSize: 16 },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml, hyperlinkRels } = generateTextXml(node, 2, 50);
    expect(xml).toContain('a:hlinkClick r:id="rId50"');
    expect(hyperlinkRels).toHaveLength(1);
    expect(hyperlinkRels[0].rId).toBe("rId50");
    expect(hyperlinkRels[0].url).toBe("https://example.com");
  });

  it("handles mixed runs with some having hyperlinks", () => {
    const node: LayoutNode = {
      type: "Text",
      content: [
        { text: "Visit " },
        { text: "example.com", hyperlink: "https://example.com", style: { color: "#0000FF" } },
        { text: " for more." },
      ],
      style: { fontSize: 16 },
      layout: { x: 0, y: 0, width: 400, height: 30 },
    } as LayoutNode;

    const { xml, hyperlinkRels } = generateTextXml(node, 2, 10);
    expect((xml.match(/<a:r>/g) ?? []).length).toBe(3);
    expect(hyperlinkRels).toHaveLength(1);
    expect(xml).toContain("<a:t>Visit </a:t>");
    expect(xml).toContain("<a:t>example.com</a:t>");
    expect(xml).toContain("<a:t> for more.</a:t>");
  });

  it("emits scheme color for theme tokens", () => {
    const node: LayoutNode = {
      type: "Text",
      content: [{ text: "Theme color", style: { color: "accent1" } }],
      style: { fontSize: 16 },
      layout: { x: 0, y: 0, width: 200, height: 30 },
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain('<a:schemeClr val="accent1"/>');
  });

  it("emits auto-fit normAutofit when _autoFitResult is present", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Long text that needs shrinking",
      style: { fontSize: 32 },
      layout: { x: 0, y: 0, width: 200, height: 50 },
    } as unknown as LayoutNode;

    // Manually attach auto-fit result
    (node as any)._autoFitResult = { fontScale: 75000, lnSpcReduction: 10000 };

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain('<a:normAutofit fontScale="75000" lnSpcReduction="10000"/>');
    expect(xml).not.toContain("<a:spAutoFit/>");
  });

  it("computes conditional normAutofit for overflowing text inside visual containers", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "This is intentionally too long for a short visual container and should trigger conditional autofit in the emitted OOXML.",
      style: { fontSize: 28, lineHeight: 34, textInsets: { top: 4, bottom: 4, left: 4, right: 4 } },
      layout: { x: 0, y: 0, width: 180, height: 48 },
      _insideVisualView: true,
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    expect(xml).toContain("<a:normAutofit");
  });

  it("keeps default normAutofit available for bounded text inside visual containers", () => {
    const node: LayoutNode = {
      type: "Text",
      content: "Metric label",
      style: { fontSize: 16 },
      layout: { x: 0, y: 0, width: 180, height: 40 },
      _insideVisualView: true,
    } as LayoutNode;

    const { xml } = generateTextXml(node, 2);
    // The writer emits the explicit default rather than a bare element: both
    // are legal and identical in meaning, but writing it stops `repair` from
    // reporting a change on every deck this engine produces.
    expect(xml).toContain('<a:normAutofit fontScale="100000"/>');
  });

  it("computes conditional normAutofit for overflowing shape text", () => {
    const node: LayoutNode = {
      type: "View",
      textContent: "This label is much too long for its fixed-height card and should emit PowerPoint autofit as a safety net.",
      textStyle: { fontSize: 24, lineHeight: 30, textInsets: { top: 4, bottom: 4, left: 4, right: 4 } },
      layout: { x: 0, y: 0, width: 200, height: 56 },
      shapeType: "rect",
    } as unknown as LayoutNode;

    const { xml } = generateShapeXml(node, 9);
    expect(xml).toContain("<a:normAutofit");
  });
});
