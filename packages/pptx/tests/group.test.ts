import { describe, it, expect } from "vitest";
import { serializeSlideTree } from "../src/ooxml/drawing/orchestrator.js";
import { flattenDocumentZIndex } from "../src/zIndex.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { PaperDocument } from "../src/types/ast.js";

describe("Group Shapes", () => {
  it("emits <p:grpSp> wrapper for Group nodes", () => {
    const groupNode: LayoutNode = {
      type: "Group",
      layout: { x: 100, y: 100, width: 400, height: 300 },
      children: [
        {
          type: "Text",
          content: "Inside group",
          style: { fontSize: 16 },
          layout: { x: 110, y: 110, width: 200, height: 30 },
        } as LayoutNode,
      ],
    } as LayoutNode;

    const slideNode: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [groupNode],
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);
    expect(xml).toContain("<p:grpSp>");
    expect(xml).toContain("</p:grpSp>");
    expect(xml).toContain("<p:nvGrpSpPr>");
    expect(xml).toContain("Inside group");
  });

  it("converts child coordinates to group-relative", () => {
    const groupNode: LayoutNode = {
      type: "Group",
      layout: { x: 100, y: 50, width: 400, height: 300 },
      children: [
        {
          type: "View",
          style: { backgroundColor: "#FF0000" },
          layout: { x: 200, y: 100, width: 100, height: 50 },
          children: [],
        } as LayoutNode,
      ],
    } as LayoutNode;

    const slideNode: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [groupNode],
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);

    // Group itself at absolute (100, 50)
    const groupOff = xml.match(/<p:grpSpPr>[\s\S]*?<a:off x="(\d+)" y="(\d+)"/);
    expect(groupOff).not.toBeNull();
    expect(parseInt(groupOff![1])).toBe(100 * 9525); // toEmu(100)
    expect(parseInt(groupOff![2])).toBe(50 * 9525);  // toEmu(50)

    // Child at relative (100, 50) = absolute (200, 100) - group (100, 50)
    // The child View shape should have offset x=952500 (100*9525), y=476250 (50*9525)
    expect(xml).toContain(`x="${100 * 9525}"`);
    expect(xml).toContain(`y="${50 * 9525}"`);
  });

  it("assigns shape IDs correctly with groups", () => {
    const groupNode: LayoutNode = {
      type: "Group",
      layout: { x: 0, y: 0, width: 400, height: 300 },
      children: [
        {
          type: "Text",
          content: "A",
          layout: { x: 10, y: 10, width: 50, height: 20 },
        } as LayoutNode,
        {
          type: "Text",
          content: "B",
          layout: { x: 10, y: 40, width: 50, height: 20 },
        } as LayoutNode,
      ],
    } as LayoutNode;

    const slideNode: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [groupNode],
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);
    // Group gets id 2, first child gets id 3, second child gets id 4
    expect(xml).toContain('id="2"');
    expect(xml).toContain('id="3"');
    expect(xml).toContain('id="4"');
  });

  it("supports nested groups", () => {
    const innerGroup: LayoutNode = {
      type: "Group",
      layout: { x: 50, y: 50, width: 200, height: 150 },
      children: [
        {
          type: "Text",
          content: "Nested",
          layout: { x: 60, y: 60, width: 100, height: 20 },
        } as LayoutNode,
      ],
    } as LayoutNode;

    const outerGroup: LayoutNode = {
      type: "Group",
      layout: { x: 10, y: 10, width: 400, height: 300 },
      children: [innerGroup],
    } as LayoutNode;

    const slideNode: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [outerGroup],
    } as LayoutNode;

    const { xml } = serializeSlideTree(slideNode);
    // Should have two <p:grpSp> elements (outer and inner)
    const grpSpCount = (xml.match(/<p:grpSp>/g) ?? []).length;
    expect(grpSpCount).toBe(2);
    expect(xml).toContain("Nested");
  });

  it("z-index flattening handles Group nodes", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Group",
              style: { zIndex: 2 },
              children: [
                { type: "Text", content: "A", style: { zIndex: 1 } },
                { type: "Text", content: "B", style: { zIndex: 0 } },
              ],
            },
            { type: "Text", content: "C", style: { zIndex: 1 } },
          ],
        },
      ],
    };

    const result = flattenDocumentZIndex(doc);
    const children = result.slides[0].children;
    // C (zIndex 1) should come before Group (zIndex 2) after flattening
    expect(children[0].type).toBe("Text");
    expect((children[0] as any).content).toBe("C");
    expect(children[1].type).toBe("Group");
    // Group's children should also be sorted: B (0) before A (1)
    const groupChildren = (children[1] as any).children;
    expect((groupChildren[0] as any).content).toBe("B");
    expect((groupChildren[1] as any).content).toBe("A");
  });
});
