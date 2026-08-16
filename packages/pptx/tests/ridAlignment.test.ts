/**
 * rId Alignment Tests — Ensures that display:"none" nodes don't shift rIds,
 * that rIds are unique per slide, and cross-slide isolation holds.
 */
import { describe, test, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import JSZip from "jszip";
import {
  getZipEntry,
  getZipPaths,
  parseXml,
  findAllElements,
  getAttr,
  assertUniqueShapeIds,
  RED_PIXEL,
} from "./helpers/xmlTestUtils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(slides: any[]): PaperDocument {
  return {
    type: "Document",
    meta: { title: "rId test" },
    slides,
  } as PaperDocument;
}

// ---------------------------------------------------------------------------
// A: display:"none" Image doesn't shift rIds
// ---------------------------------------------------------------------------

describe("A: display:none rId alignment", () => {
  test("A1: hidden Image between two visible Images does not shift rIds", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100, display: "none" },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");

    // Parse rels to check rId assignments
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const imageRels = rels.filter(
      (r) => getAttr(r, "Type")?.includes("/image")
    );

    // Should have exactly 2 image relationships (not 3)
    expect(imageRels).toHaveLength(2);

    // Parse slide XML to verify only 2 p:pic elements
    const slideTree = parseXml(slideXml);
    const pics = findAllElements(slideTree, "p:pic");
    expect(pics).toHaveLength(2);

    // All shape IDs must be unique
    assertUniqueShapeIds(slideTree);
  });

  test("A2: hidden View with image fill doesn't create unused rId", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "View",
            style: {
              width: 100,
              height: 100,
              fill: { type: "image", src: RED_PIXEL },
              display: "none",
            },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const imageRels = rels.filter(
      (r) => getAttr(r, "Type")?.includes("/image")
    );

    // Only 1 image relationship (the visible Image, not the hidden fill)
    expect(imageRels).toHaveLength(1);
  });

  test("A3: hidden container hides all children's media too", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "View",
            style: { display: "none" },
            children: [
              {
                type: "Image",
                src: RED_PIXEL,
                style: { width: 50, height: 50 },
              },
              {
                type: "Image",
                src: RED_PIXEL,
                style: { width: 50, height: 50 },
              },
            ],
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const imageRels = rels.filter(
      (r) => getAttr(r, "Type")?.includes("/image")
    );

    // Only 1 visible image (the 2 inside hidden container are skipped)
    expect(imageRels).toHaveLength(1);

    // Slide XML should have exactly 1 p:pic
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const slideTree = parseXml(slideXml);
    const pics = findAllElements(slideTree, "p:pic");
    expect(pics).toHaveLength(1);
  });

  test("A4: rId references in slide XML all resolve to declared rels", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100, display: "none" },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 200, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");

    // Every r:embed in slide XML must have a matching Relationship
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const declaredIds = new Set(rels.map((r) => getAttr(r, "Id")));

    const embedPattern = /r:embed="(rId\d+)"/g;
    let match: RegExpExecArray | null;
    while ((match = embedPattern.exec(slideXml)) !== null) {
      expect(declaredIds.has(match[1])).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// B: Cross-slide isolation
// ---------------------------------------------------------------------------

describe("B: Cross-slide isolation", () => {
  test("B1: shapes from slide 1 don't appear in slide 2's XML", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "SLIDE_ONE_MARKER",
            style: { fontSize: 24 },
          },
        ],
      },
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "SLIDE_TWO_MARKER",
            style: { fontSize: 24 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const slide1Xml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    const slide2Xml = await getZipEntry(buf, "ppt/slides/slide2.xml");

    expect(slide1Xml).toContain("SLIDE_ONE_MARKER");
    expect(slide1Xml).not.toContain("SLIDE_TWO_MARKER");
    expect(slide2Xml).toContain("SLIDE_TWO_MARKER");
    expect(slide2Xml).not.toContain("SLIDE_ONE_MARKER");
  });

  test("B2: image media paths are globally unique across slides", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
        ],
      },
      {
        type: "Slide",
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const rels1 = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    const rels2 = await getZipEntry(buf, "ppt/slides/_rels/slide2.xml.rels");

    // Extract image targets
    const targetPattern = /Target="(\.\.\/media\/[^"]+)"/g;
    const targets1: string[] = [];
    const targets2: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = targetPattern.exec(rels1)) !== null) targets1.push(m[1]);
    targetPattern.lastIndex = 0;
    while ((m = targetPattern.exec(rels2)) !== null) targets2.push(m[1]);

    // Each slide should have its own image reference
    expect(targets1).toHaveLength(1);
    expect(targets2).toHaveLength(1);
  });

  test("B3: shape IDs are unique within each slide", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "A",
            style: { fontSize: 20 },
          },
          {
            type: "View",
            style: { backgroundColor: "#FF0000", width: 100, height: 100 },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 50, height: 50 },
          },
        ],
      },
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "B",
            style: { fontSize: 20 },
          },
          {
            type: "View",
            style: { backgroundColor: "#0000FF", width: 100, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);

    for (let i = 1; i <= 2; i++) {
      const slideXml = await getZipEntry(buf, `ppt/slides/slide${i}.xml`);
      const tree = parseXml(slideXml);
      assertUniqueShapeIds(tree);
    }
  });
});

// ---------------------------------------------------------------------------
// C: rId uniqueness per slide
// ---------------------------------------------------------------------------

describe("C: rId uniqueness", () => {
  test("C1: same image on 3 slides = 1 file in ZIP (deduplication)", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
        ],
      },
      {
        type: "Slide",
        children: [
          { type: "Image", src: RED_PIXEL, style: { width: 200, height: 200 } },
        ],
      },
      {
        type: "Slide",
        children: [
          { type: "Image", src: RED_PIXEL, style: { width: 50, height: 50 } },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const paths = await getZipPaths(buf);
    const mediaFiles = paths.filter((p) => p.startsWith("ppt/media/image"));

    // All 3 slides reference the same image data → only 1 file in ZIP
    expect(mediaFiles).toHaveLength(1);

    // But each slide still has its own rels pointing to it
    for (let i = 1; i <= 3; i++) {
      const relsXml = await getZipEntry(buf, `ppt/slides/_rels/slide${i}.xml.rels`);
      const relsTree = parseXml(relsXml);
      const rels = findAllElements(relsTree, "Relationship");
      const imageRels = rels.filter((r) => getAttr(r, "Type")?.includes("/image"));
      expect(imageRels).toHaveLength(1);
    }
  });

  test("C2: all rIds in slide rels are unique", async () => {
    const doc = makeDoc([
      {
        type: "Slide",
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
          {
            type: "Image",
            src: RED_PIXEL,
            style: { width: 100, height: 100 },
          },
        ],
      },
    ]);

    const buf = await PaperEngine.render(doc);
    const relsXml = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    const relsTree = parseXml(relsXml);
    const rels = findAllElements(relsTree, "Relationship");
    const ids = rels.map((r) => getAttr(r, "Id")).filter(Boolean);

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
