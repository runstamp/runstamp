import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { serializeSlideTree } from "../src/ooxml/drawing/orchestrator.js";
import { PaperEngine } from "../src/engine.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { PaperDocument } from "../src/types/ast.js";

// Helper to build a minimal LayoutNode
function makeNode(
  type: string,
  shapeId: number,
  extra: Record<string, unknown> = {},
): LayoutNode {
  return {
    type,
    style: type === "View" ? { backgroundColor: "#CCCCCC" } : {},
    layout: { x: 0, y: 0, width: 100, height: 50 },
    ...extra,
  } as LayoutNode;
}

describe("Animation Manifest Collection", () => {
  it("collects animations from multiple nodes with correct shapeIds", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("Text", 2, {
          content: "Hello",
          animations: [
            { type: "entrance", effect: "fade", trigger: "onClick" },
          ],
        }),
        makeNode("View", 3, {
          backgroundColor: "#FF0000",
          style: { backgroundColor: "#FF0000" },
        }),
        makeNode("Text", 4, {
          content: "World",
          animations: [
            { type: "exit", effect: "appear", trigger: "afterPrevious" },
            { type: "emphasis", effect: "spin", trigger: "withPrevious" },
          ],
        }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree);
    expect(result.animationManifest).toHaveLength(3);
    expect(result.animationManifest[0].shapeId).toBe(2);
    expect(result.animationManifest[0].effect).toBe("fade");
    expect(result.animationManifest[0].animation.effect).toBe("fade");
    expect(result.animationManifest[1].shapeId).toBe(4);
    expect(result.animationManifest[1].effect).toBe("appear");
    expect(result.animationManifest[1].animation.effect).toBe("appear");
    expect(result.animationManifest[2].shapeId).toBe(4);
    expect(result.animationManifest[2].effect).toBe("spin");
    expect(result.animationManifest[2].animation.effect).toBe("spin");
  });

  it("returns empty manifest when no animations", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("Text", 2, { content: "No anims" }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree);
    expect(result.animationManifest).toHaveLength(0);
  });

  it("tracks emittedShapeIds for all shapes", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("Text", 2, { content: "A" }),
        makeNode("View", 3, { style: { backgroundColor: "#000000" } }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree);
    expect(result.emittedShapeIds.has(2)).toBe(true);
    expect(result.emittedShapeIds.has(3)).toBe(true);
  });

  it("preserves non-appear chart animation effects in the manifest", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        {
          type: "Chart",
          layout: { x: 0, y: 0, width: 400, height: 240 },
          style: { width: 400, height: 240 },
          chartData: {
            chartType: "bar",
            categories: ["A", "B"],
            series: [{ name: "Series 1", values: [1, 2] }],
          },
          chartAnimation: {
            buildType: "allAtOnce",
            effect: "fade",
            trigger: "withPrevious",
            duration: 900,
          },
        },
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree, {
      chartRIds: ["rId2"],
    });

    expect(result.animationManifest).toHaveLength(1);
    expect(result.animationManifest[0]?.effect).toBe("fade");
    expect(result.animationManifest[0]?.animation.effect).toBe("fade");
    expect(result.animationManifest[0]?.animation.trigger).toBe("withPrevious");
    expect(result.animationManifest[0]?.animation.duration).toBe(900);
  });

  it("derives hyperlink rIds from other relationships when no explicit seed is provided", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("Image", 2, { src: "data:image/png;base64,AAAA" }),
        makeNode("Image", 3, { src: "data:image/png;base64,BBBB" }),
        makeNode("Chart", 4, {
          chartData: {
            chartType: "bar",
            categories: ["A"],
            series: [{ name: "Series 1", values: [1] }],
          },
        }),
        makeNode("Text", 5, {
          content: [{ text: "Open", hyperlink: "https://example.com/truth-refresh" }],
        }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree, {
      mediaRIds: ["rId2", "rId3"],
      chartRIds: ["rId4"],
    });

    expect(result.hyperlinkRels).toHaveLength(1);
    expect(result.hyperlinkRels[0]?.rId).toBe("rId5");
  });
});

describe("MorphId Shape Names", () => {
  it("morphId on View → name with !! prefix", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("View", 2, {
          morphId: "heroBox",
          style: { backgroundColor: "#FF0000" },
        }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree);
    expect(result.xml).toContain('name="!!heroBox"');
  });

  it("morphId on Text → name with !! prefix", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("Text", 2, { morphId: "title1", content: "Hello" }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree);
    expect(result.xml).toContain('name="!!title1"');
  });

  it("no morphId → standard name", () => {
    const tree: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        makeNode("Text", 2, { content: "Hello" }),
      ],
    } as unknown as LayoutNode;

    const result = serializeSlideTree(tree);
    expect(result.xml).toContain('name="Text 2"');
  });
});

describe("E2E: PaperEngine with transitions and animations", () => {
  it("generates PPTX with fade transition", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Transition Test" },
      slides: [
        {
          type: "Slide",
          transition: { type: "fade", duration: 500 },
          children: [
            { type: "Text", content: "Slide 1" },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).toContain("<p:transition");
    expect(slideXml).toContain("<p:fade/>");
  });

  it("generates PPTX with animations → timing XML", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Animation Test" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              content: "Animated Text",
              animations: [
                { type: "entrance", effect: "fade", trigger: "onClick" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).toContain("<p:timing>");
    expect(slideXml).toContain("nodeType=\"tmRoot\"");
  });

  it("generates PPTX with paragraph build targets for text animations", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Paragraph Build Test" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              paragraphs: [
                { runs: [{ text: "First bullet" }], level: 0 },
                { runs: [{ text: "Nested bullet" }], level: 1 },
                { runs: [{ text: "Second bullet" }], level: 0 },
              ],
              animations: [
                {
                  type: "entrance",
                  effect: "fade",
                  trigger: "onClick",
                  build: { grouping: "byParagraph" },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).toContain("<p:bldP");
    expect(slideXml).toContain("<p:txEl>");
    expect(slideXml).toContain('<p:pRg st="0" end="0"/>');
    expect(slideXml).toContain('<p:pRg st="1" end="1"/>');
    expect(slideXml).toContain('<p:pRg st="2" end="2"/>');
  });

  it("generates PPTX with nested first-level build sequencing and dimAfter", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Nested Paragraph Build Test" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              paragraphs: [
                { runs: [{ text: "Parent 1" }], level: 0 },
                { runs: [{ text: "Child 1.1" }], level: 1 },
                { runs: [{ text: "Child 1.2" }], level: 1 },
                { runs: [{ text: "Parent 2" }], level: 0 },
              ],
              animations: [
                {
                  type: "entrance",
                  effect: "fade",
                  trigger: "onClick",
                  build: { grouping: "byFirstLevel", nested: true, dimAfter: "#CCCCCC" },
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).toContain('<p:pRg st="0" end="0"/>');
    expect(slideXml).toContain('<p:pRg st="1" end="1"/>');
    expect(slideXml).toContain('<p:pRg st="2" end="2"/>');
    expect(slideXml).toContain('val="CCCCCC"');
    expect(slideXml).toContain('style.color');
  });

  it("accepts legacy buildType alias for first-level paragraph builds", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Legacy Build Alias Test" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              paragraphs: [
                { runs: [{ text: "Parent 1" }], level: 0 },
                { runs: [{ text: "Child 1.1" }], level: 1 },
                { runs: [{ text: "Parent 2" }], level: 0 },
              ],
              animations: [
                {
                  type: "entrance",
                  effect: "fade",
                  trigger: "onClick",
                  buildType: "byFirstLevel",
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).toContain('<p:pRg st="0" end="0"/>');
    expect(slideXml).toContain('<p:pRg st="1" end="1"/>');
    expect(slideXml).toContain('<p:pRg st="2" end="2"/>');
    expect(slideXml).toContain('nodeType="afterEffect"');
  });

  it("backward compatibility: no transition/animation → clean output", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Plain" },
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "Plain slide" },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).not.toContain("<p:transition");
    expect(slideXml).not.toContain("<p:timing>");
  });

  it("morph identity matrix: matching morphIds across slides", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Morph Test" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              morphId: "heroBox",
              style: { backgroundColor: "#FF0000", width: 100, height: 100 },
              shapeType: "rect",
            },
          ],
        },
        {
          type: "Slide",
          children: [
            {
              type: "View",
              morphId: "heroBox",
              style: { backgroundColor: "#0000FF", width: 200, height: 200 },
              shapeType: "ellipse",
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);

    const slide1Xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const slide2Xml = await zip.file("ppt/slides/slide2.xml")!.async("string");

    // Both slides should have the !! prefix
    expect(slide1Xml).toContain('name="!!heroBox"');
    expect(slide2Xml).toContain('name="!!heroBox"');

    // Auto-enforcement: morphId present → morph transition applied
    // Slide 1 may or may not have morph (it's the first slide)
    // Slide 2 should have morph transition
    expect(slide2Xml).toContain("<p159:morph");
  });

  it("explicit transition is not overridden by morphId", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Override Test" },
      slides: [
        {
          type: "Slide",
          transition: { type: "fade" },
          children: [
            {
              type: "View",
              morphId: "box1",
              style: { backgroundColor: "#FF0000", width: 100, height: 100 },
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");

    // Should be fade, not morph
    expect(slideXml).toContain("<p:fade/>");
    expect(slideXml).not.toContain("<p159:morph");
  });

  it("all 10 PRD effects produce correct presetID and presetClass", async () => {
    const prdEffects = [
      { effect: "appear", type: "entrance", expectedPresetID: "1", expectedClass: "entr" },
      { effect: "fade", type: "entrance", expectedPresetID: "10", expectedClass: "entr" },
      { effect: "fly", type: "entrance", expectedPresetID: "2", expectedClass: "entr" },
      { effect: "wipe", type: "entrance", expectedPresetID: "22", expectedClass: "entr" },
      { effect: "float", type: "entrance", expectedPresetID: "42", expectedClass: "entr" },
      { effect: "fade", type: "exit", expectedPresetID: "10", expectedClass: "exit" },
      { effect: "fly", type: "exit", expectedPresetID: "2", expectedClass: "exit" },
      { effect: "appear", type: "exit", expectedPresetID: "1", expectedClass: "exit" },
      { effect: "wipe", type: "exit", expectedPresetID: "22", expectedClass: "exit" },
      { effect: "zoom", type: "exit", expectedPresetID: "53", expectedClass: "exit" },
    ] as const;

    for (const { effect, type, expectedPresetID, expectedClass } of prdEffects) {
      const doc: PaperDocument = {
        type: "Document",
        meta: { title: "Effect Test" },
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: `${type}/${effect}`,
                animations: [{ type, effect, trigger: "onClick" }],
              },
            ],
          },
        ],
      };
      const buffer = await PaperEngine.render(doc);
      const zip = await JSZip.loadAsync(buffer);
      const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
      expect(slideXml).toContain(`presetID="${expectedPresetID}"`);
      expect(slideXml).toContain(`presetClass="${expectedClass}"`);
    }
  });

  it("3-slide document with transitions + animations + morph", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Full Integration" },
      slides: [
        {
          type: "Slide",
          transition: { type: "fade" },
          children: [
            {
              type: "Text",
              content: "Slide 1",
              animations: [
                { type: "entrance", effect: "appear", trigger: "onClick" },
              ],
            },
          ],
        },
        {
          type: "Slide",
          transition: { type: "push", direction: "left" },
          children: [
            {
              type: "Text",
              content: "Slide 2",
              animations: [
                { type: "entrance", effect: "fly", trigger: "onClick", direction: "up" },
                { type: "emphasis", effect: "spin", trigger: "withPrevious", duration: 1000 },
              ],
            },
          ],
        },
        {
          type: "Slide",
          children: [
            {
              type: "View",
              morphId: "shared",
              style: { backgroundColor: "#00FF00", width: 50, height: 50 },
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);

    // Slide 1: fade transition + appear animation
    const s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(s1).toContain("<p:fade/>");
    expect(s1).toContain("<p:timing>");
    expect(s1).toContain("<p:set>");

    // Slide 2: push transition + fly + spin animations
    const s2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
    expect(s2).toContain("<p:push");
    expect(s2).toContain("<p:timing>");
    expect(s2).toContain("<p:animRot");

    // Slide 3: auto-morph transition, no animations
    const s3 = await zip.file("ppt/slides/slide3.xml")!.async("string");
    expect(s3).toContain("<p159:morph");
    expect(s3).toContain('name="!!shared"');
  });
});
