import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { processSlideMedia } from "../src/ooxml/media.js";
import { generateImageXml } from "../src/ooxml/drawing/image.js";
import { generateSlideRels } from "../src/ooxml/slideRelationships.js";
import { PptxArchive } from "../src/ooxml/zipper.js";
import type { LayoutNode } from "../src/layout/extract.js";

// Minimal valid 1×1 pixel PNG (base64)
const TINY_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Build a LayoutNode with type "Image" and a base64 src
function makeImageNode(src: string): LayoutNode {
  return {
    type: "Image",
    style: { width: 200, height: 150 },
    src,
    layout: { x: 10, y: 10, width: 200, height: 150 },
  } as unknown as LayoutNode;
}

// Build a slide LayoutNode that wraps an image
function makeSlideWithImage(src: string): LayoutNode {
  const imageNode = makeImageNode(src);
  return {
    type: "Slide",
    style: { width: 960, height: 540 },
    layout: { x: 0, y: 0, width: 960, height: 540 },
    children: [imageNode],
  } as unknown as LayoutNode;
}

describe("Media Pipeline — Benchmark 3", () => {
  it("decodes a base64 PNG into a Buffer with correct rId and path", async () => {
    const slideNode = makeSlideWithImage(TINY_PNG_BASE64);
    const counter = { current: 1 };

    const manifest = await processSlideMedia(slideNode, counter);

    expect(manifest.assets).toHaveLength(1);

    const asset = manifest.assets[0];
    expect(asset.rId).toBe("rId2");
    expect(asset.mediaPath).toBe("ppt/media/image1.png");
    expect(asset.relativePath).toBe("../media/image1.png");
    expect(asset.ext).toBe("png");
    expect(asset.buffer).toBeInstanceOf(Buffer);
    expect(asset.buffer.length).toBeGreaterThan(0);
  });

  it("produces a valid PNG buffer (PNG magic bytes)", async () => {
    const slideNode = makeSlideWithImage(TINY_PNG_BASE64);
    const manifest = await processSlideMedia(slideNode, { current: 1 });

    const buffer = manifest.assets[0].buffer;
    // PNG files start with the 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // 'P'
    expect(buffer[2]).toBe(0x4e); // 'N'
    expect(buffer[3]).toBe(0x47); // 'G'
  });

  it("assigns sequential rIds across multiple images in a slide", async () => {
    const imageNode1 = makeImageNode(TINY_PNG_BASE64);
    const imageNode2 = makeImageNode(TINY_PNG_BASE64);
    const slideNode: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [imageNode1, imageNode2],
    } as unknown as LayoutNode;

    const counter = { current: 1 };
    const manifest = await processSlideMedia(slideNode, counter);

    expect(manifest.assets).toHaveLength(2);
    expect(manifest.assets[0].rId).toBe("rId2");
    expect(manifest.assets[0].mediaPath).toBe("ppt/media/image1.png");
    expect(manifest.assets[1].rId).toBe("rId3");
    expect(manifest.assets[1].mediaPath).toBe("ppt/media/image2.png");
    // globalMediaCounter should have advanced by 2
    expect(counter.current).toBe(3);
  });

  it("generates correct slide .rels XML with an image relationship", () => {
    const rels = generateSlideRels([
      { rId: "rId2", target: "../media/image1.png" },
    ]);

    expect(rels).toContain('Id="rId1"');
    expect(rels).toContain("slideLayout");
    expect(rels).toContain('Id="rId2"');
    expect(rels).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"',
    );
    expect(rels).toContain('Target="../media/image1.png"');
  });

  it("generates <p:pic> XML with the correct rId in r:embed", () => {
    const imageNode = makeImageNode(TINY_PNG_BASE64);
    const { xml } = generateImageXml(imageNode, 3, "rId2");

    expect(xml).toContain("<p:pic>");
    expect(xml).toContain('r:embed="rId2"');
    expect(xml).toContain("<a:blip ");
    expect(xml).toContain("<p:blipFill>");
    expect(xml).toContain("<a:stretch><a:fillRect/></a:stretch>");
    expect(xml).not.toContain("<p:txBody>");
  });

  it("writes decorative metadata in DrawingML extLst under cNvPr", () => {
    const imageNode = {
      ...makeImageNode(TINY_PNG_BASE64),
      decorative: true,
    } as LayoutNode;
    const { xml } = generateImageXml(imageNode as any, 3, "rId2");

    expect(xml).toContain("<a:extLst>");
    expect(xml).toContain("<a:ext ");
    expect(xml).toContain("adec:decorative");
    expect(xml).not.toContain("<p:extLst>");
  });

  it("stores ppt/media/image1.png in the ZIP via PptxArchive", async () => {
    const slideNode = makeSlideWithImage(TINY_PNG_BASE64);
    const counter = { current: 1 };
    const manifest = await processSlideMedia(slideNode, counter);

    // Build slide XML using the rId from the manifest
    const imageNode = (slideNode.children ?? [])[0] as LayoutNode;
    const { xml: imageXml } = generateImageXml(imageNode, 2, manifest.assets[0].rId);

    const archive = new PptxArchive();
    archive.assemblePresentation(1, { slideContents: [imageXml], slideMediaManifests: [manifest] });

    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // Condition 1: ppt/media/image1.png must exist in the ZIP
    const mediaFile = zip.file("ppt/media/image1.png");
    expect(mediaFile).not.toBeNull();

    const mediaContent = await mediaFile!.async("nodebuffer");
    expect(mediaContent.length).toBeGreaterThan(0);

    // Condition 2: slide1.xml.rels must reference rId2 pointing to the image
    const relsFile = zip.file("ppt/slides/_rels/slide1.xml.rels");
    expect(relsFile).not.toBeNull();

    const relsContent = await relsFile!.async("string");
    expect(relsContent).toContain('Id="rId2"');
    expect(relsContent).toContain("../media/image1.png");
    expect(relsContent).toContain(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );

    // Condition 3: slide1.xml must contain <p:pic> with <a:blip r:embed="rId2">
    const slideFile = zip.file("ppt/slides/slide1.xml");
    expect(slideFile).not.toBeNull();

    const slideContent = await slideFile!.async("string");
    expect(slideContent).toContain("<p:pic>");
    expect(slideContent).toContain('r:embed="rId2"');
  });

  it("decodes video and audio data URLs with media-specific extensions", async () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        {
          type: "Video",
          src: "data:video/webm;base64,AAECAw==",
          layout: { x: 0, y: 0, width: 320, height: 180 },
          style: { width: 320, height: 180 },
        },
        {
          type: "Audio",
          src: "data:audio/ogg;base64,BAUGBw==",
          layout: { x: 0, y: 220, width: 320, height: 40 },
          style: { width: 320, height: 40 },
        },
      ],
    } as unknown as LayoutNode;

    const manifest = await processSlideMedia(slideNode, { current: 1 }, { current: 1 });

    expect(manifest.videoAssets).toHaveLength(1);
    expect(manifest.videoAssets[0]).toMatchObject({
      videoRId: "rId2",
      mediaRId: "rId3",
      mediaPath: "ppt/media/video1.webm",
      relativePath: "../media/video1.webm",
      ext: "webm",
    });
    expect(manifest.videoAssets[0].buffer).toEqual(Buffer.from([0, 1, 2, 3]));

    expect(manifest.audioAssets).toHaveLength(1);
    expect(manifest.audioAssets[0]).toMatchObject({
      audioRId: "rId4",
      mediaRId: "rId5",
      mediaPath: "ppt/media/audio2.ogg",
      relativePath: "../media/audio2.ogg",
      ext: "ogg",
    });
    expect(manifest.audioAssets[0].buffer).toEqual(Buffer.from([4, 5, 6, 7]));
  });

  it("uses media-specific defaults for malformed video and audio data URLs", async () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      style: {},
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        {
          type: "Video",
          src: "data:video/mp4;base64",
          layout: { x: 0, y: 0, width: 320, height: 180 },
          style: { width: 320, height: 180 },
        },
        {
          type: "Audio",
          src: "data:audio/mpeg;base64",
          layout: { x: 0, y: 220, width: 320, height: 40 },
          style: { width: 320, height: 40 },
        },
      ],
    } as unknown as LayoutNode;

    const manifest = await processSlideMedia(slideNode, { current: 1 }, { current: 1 });

    expect(manifest.videoAssets[0].ext).toBe("mp4");
    expect(manifest.videoAssets[0].buffer).toHaveLength(0);
    expect(manifest.audioAssets[0].ext).toBe("mp3");
    expect(manifest.audioAssets[0].buffer).toHaveLength(0);
  });
});
