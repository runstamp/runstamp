/**
 * SOTA Benchmarks 6 — Phase 5 MBB Enterprise-Grade Feature Validation
 *
 * 50+ tests across 9 categories:
 *   A: Extended Color Modifiers (lumMod, satMod, comp, inv, gray, hue)
 *   B: 3D Effects (scene3d, sp3d with bevel, extrude, contour)
 *   C: Advanced Image Effects (brightness, contrast, grayscale, duotone, blur)
 *   D: Video/Audio Media Embedding (actual files in ZIP, not placeholders)
 *   E: Slide Background Patterns & Images
 *   F: Justified Text & Advanced Line Spacing
 *   G: WordArt / Text Warp Presets
 *   H: Table Cell Diagonal Borders
 *   I: Advanced Connector Features (arrow types, sizes)
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL,
} from "./helpers/xmlTestUtils.js";

// =========================================================================
// CATEGORY A: EXTENDED COLOR MODIFIERS (7 tests)
// =========================================================================

describe("A: Extended Color Modifiers", () => {
  it("A1: lumMod on theme color → <a:lumMod> child inside <a:schemeClr>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent1", lumMod: 75 },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("schemeClr");
    expect(slideXml).toContain("lumMod");
    // lumMod 75 → val="75000" in OOXML (percentage * 1000)
    expect(slideXml).toMatch(/lumMod.*val="75000"/);
  });

  it("A2: lumOff on theme color → <a:lumOff> with correct value", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "dk1", lumOff: 25 },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("lumOff");
    expect(slideXml).toMatch(/lumOff.*val="25000"/);
  });

  it("A3: satMod on theme color → <a:satMod> child element", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent2", satMod: 120 },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("satMod");
    expect(slideXml).toMatch(/satMod.*val="120000"/);
  });

  it("A4: combined lumMod + lumOff (light tint) → both children present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent1", lumMod: 40, lumOff: 60 },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("lumMod");
    expect(slideXml).toContain("lumOff");
    expect(slideXml).toMatch(/lumMod.*val="40000"/);
    expect(slideXml).toMatch(/lumOff.*val="60000"/);
  });

  it("A5: comp modifier → <a:comp/> child (complement color)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent3", comp: true },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:comp/>");
  });

  it("A6: inv modifier → <a:inv/> child (inverse color)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent4", inv: true },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:inv/>");
  });

  it("A7: gray modifier → <a:gray/> child (grayscale color)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: { scheme: "accent5", gray: true },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:gray/>");
  });
});

// =========================================================================
// CATEGORY B: 3D EFFECTS ON SHAPES (7 tests)
// =========================================================================

describe("B: 3D Effects on Shapes", () => {
  it("B1: scene3d with camera preset → <a:scene3d><a:camera prst='...'/></a:scene3d>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#4472C4",
            effects: {
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:scene3d>");
    expect(slideXml).toContain('prst="orthographicFront"');
    expect(slideXml).toContain("<a:lightRig");
    expect(slideXml).toContain('rig="threePt"');
    expect(slideXml).toContain('dir="t"');
  });

  it("B2: sp3d with bevel top → <a:sp3d><a:bevelT w='...' h='...'/>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#ED7D31",
            effects: {
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
              sp3d: {
                bevelTop: { width: 5, height: 3, preset: "circle" },
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:sp3d>");
    expect(slideXml).toContain("<a:bevelT");
    expect(slideXml).toContain('prst="circle"');
  });

  it("B3: sp3d with bevel bottom → <a:bevelB> present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#A5A5A5",
            effects: {
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
              sp3d: {
                bevelBottom: { width: 4, height: 2, preset: "relaxedInset" },
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:bevelB");
    expect(slideXml).toContain('prst="relaxedInset"');
  });

  it("B4: sp3d with extrude depth + color → extrusionH and extrusionClr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#4472C4",
            effects: {
              scene3d: {
                camera: { preset: "perspectiveFront" },
                lightRig: { type: "balanced", direction: "t" },
              },
              sp3d: {
                extrudeHeight: 10,
                extrudeColor: "#333333",
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:sp3d");
    expect(slideXml).toContain("extrusionH=");
    expect(slideXml).toContain("<a:extrusionClr>");
  });

  it("B5: sp3d with contour → contourW and contourClr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#70AD47",
            effects: {
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
              sp3d: {
                contourWidth: 2,
                contourColor: "#000000",
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("contourW=");
    expect(slideXml).toContain("<a:contourClr>");
  });

  it("B6: sp3d with material preset → prstMaterial attribute", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#4472C4",
            effects: {
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
              sp3d: {
                material: "metal",
                bevelTop: { width: 5, height: 5, preset: "circle" },
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('prstMaterial="metal"');
  });

  it("B7: full 3D combo (scene3d + sp3d with all properties) → complete 3D XML", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#4472C4",
            effects: {
              dropShadow: { color: "#000000", offsetX: 3, offsetY: 3, blurRadius: 6, opacity: 0.5 },
              scene3d: {
                camera: { preset: "perspectiveAbove" },
                lightRig: { type: "balanced", direction: "tl" },
              },
              sp3d: {
                material: "warmMatte",
                bevelTop: { width: 8, height: 4, preset: "angle" },
                bevelBottom: { width: 3, height: 2, preset: "circle" },
                extrudeHeight: 5,
                extrudeColor: "#222222",
                contourWidth: 1,
                contourColor: "#FFFFFF",
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // All 3D elements must be present
    expect(slideXml).toContain("<a:scene3d>");
    expect(slideXml).toContain("<a:sp3d");
    expect(slideXml).toContain("<a:bevelT");
    expect(slideXml).toContain("<a:bevelB");
    expect(slideXml).toContain("<a:extrusionClr>");
    expect(slideXml).toContain("<a:contourClr>");

    // Must also have the shadow (coexistence)
    expect(slideXml).toContain("<a:outerShdw");
  });
});

// =========================================================================
// CATEGORY C: ADVANCED IMAGE EFFECTS (6 tests)
// =========================================================================

describe("C: Advanced Image Effects", () => {
  it("C1: brightness + contrast adjustments on image → <a:lum> in extLst", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          imageEffects: {
            brightness: 20,   // +20%
            contrast: -10,    // -10%
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:lum");
    // brightness 20 → bright="20000", contrast -10 → contrast="-10000"
    expect(slideXml).toMatch(/bright="20000"/);
    expect(slideXml).toMatch(/contrast="-10000"/);
  });

  it("C2: grayscale effect → <a:grayscl/> inside <a:blip>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          imageEffects: {
            grayscale: true,
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:grayscl/>");
  });

  it("C3: biLevel (black & white threshold) → <a:biLevel thresh='...'>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          imageEffects: {
            biLevel: 50000,  // 50% threshold
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:biLevel");
    expect(slideXml).toContain('thresh="50000"');
  });

  it("C4: duotone → <a:duotone> with 2 color children", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          imageEffects: {
            duotone: { color1: "#000000", color2: "#4472C4" },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:duotone>");
    const tree = parseXml(slideXml);
    const duotones = findAllElements(tree, "a:duotone");
    expect(duotones.length).toBe(1);
  });

  it("C5: blur effect → <a:blur rad='...' grow='0'/>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          imageEffects: {
            blur: 5, // 5px blur radius
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:blur");
  });

  it("C6: combined effects (grayscale + brightness) → both present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          imageEffects: {
            grayscale: true,
            brightness: 10,
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:grayscl/>");
    expect(slideXml).toContain("a:lum");
  });
});

// =========================================================================
// CATEGORY D: VIDEO/AUDIO MEDIA EMBEDDING (5 tests)
// =========================================================================

// Minimal MP4 header for testing (not a real video, but tests the embedding pipeline)
const TINY_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=";
const TINY_AUDIO = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMA==";

describe("D: Video/Audio Media Embedding", () => {
  it("D1: video node → media file in ppt/media/ and relationship entry", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Video",
          style: { width: 640, height: 360 },
          src: TINY_VIDEO,
          mimeType: "video/mp4",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    // Must have a media file
    const mediaFiles = paths.filter(p => p.startsWith("ppt/media/") && p.includes("video"));
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1);

    // Slide must reference video (not just a plain rectangle)
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("p:pic");
  });

  it("D2: audio node → media file in ppt/media/ and relationship entry", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Audio",
          style: { width: 200, height: 50 },
          src: TINY_AUDIO,
          mimeType: "audio/mp3",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    // Must have a media file
    const mediaFiles = paths.filter(p => p.startsWith("ppt/media/") && p.includes("audio"));
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1);
  });

  it("D3: video with poster frame → poster image also embedded", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Video",
          style: { width: 640, height: 360 },
          src: TINY_VIDEO,
          poster: RED_PIXEL,
          mimeType: "video/mp4",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    // Must have both video and poster image
    const videoFiles = paths.filter(p => p.startsWith("ppt/media/") && p.includes("video"));
    const imageFiles = paths.filter(p => p.startsWith("ppt/media/") && p.includes("image"));
    expect(videoFiles.length).toBeGreaterThanOrEqual(1);
    expect(imageFiles.length).toBeGreaterThanOrEqual(1);
  });

  it("D4: video node → content type registered for video", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Video",
          style: { width: 640, height: 360 },
          src: TINY_VIDEO,
          mimeType: "video/mp4",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain("video/mp4");
  });

  it("D5: video + audio on same slide → no rId collision", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Video",
            style: { width: 320, height: 180, position: "absolute", left: 0, top: 0 },
            src: TINY_VIDEO,
            mimeType: "video/mp4",
          },
          {
            type: "Audio",
            style: { width: 200, height: 50, position: "absolute", left: 0, top: 200 },
            src: TINY_AUDIO,
            mimeType: "audio/mp3",
          },
        ],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    const mediaFiles = paths.filter(p => p.startsWith("ppt/media/"));
    expect(mediaFiles.length).toBeGreaterThanOrEqual(2);

    // Verify no rId collision in rels
    const relsXml = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const rIdMatches = relsXml.match(/Id="rId(\d+)"/g) ?? [];
    const rIds = rIdMatches.map(m => m.match(/rId(\d+)/)![1]);
    const uniqueRIds = new Set(rIds);
    expect(uniqueRIds.size).toBe(rIds.length);
  });
});

// =========================================================================
// CATEGORY E: SLIDE BACKGROUND PATTERNS & IMAGES (4 tests)
// =========================================================================

describe("E: Slide Background Patterns & Images", () => {
  it("E1: pattern background → <a:pattFill> in <p:bgPr>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "pattern",
          pattern: "dkDnDiag",
          foreground: "#333333",
          background: "#FFFFFF",
        },
        children: [{
          type: "Text",
          style: { width: 200, height: 50, color: "#000000" },
          content: "Test",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<p:bg>");
    expect(slideXml).toContain("<p:bgPr>");
    expect(slideXml).toContain("a:pattFill");
    expect(slideXml).toContain('prst="dkDnDiag"');
  });

  it("E2: image background → <a:blipFill> in <p:bgPr> with media file", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "image",
          src: RED_PIXEL,
        },
        children: [{
          type: "Text",
          style: { width: 200, height: 50, color: "#FFFFFF" },
          content: "Over image",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<p:bg>");
    expect(slideXml).toContain("a:blipFill");
    expect(slideXml).toContain("r:embed=");

    // Image must be in media folder
    const paths = await getZipPaths(buffer);
    const bgImages = paths.filter(p => p.startsWith("ppt/media/"));
    expect(bgImages.length).toBeGreaterThanOrEqual(1);
  });

  it("E3: tiled image background → <a:tile> element present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "image",
          src: RED_PIXEL,
          tile: true,
        },
        children: [{
          type: "Text",
          style: { width: 200, height: 50 },
          content: "Tiled",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:tile");
  });

  it("E4: pattern + gradient on different slides → both render correctly", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          style: { width: 960, height: 540 },
          background: {
            type: "pattern",
            pattern: "ltHorz",
            foreground: "#000000",
            background: "#EEEEEE",
          },
          children: [{ type: "Text", style: { width: 100, height: 50 }, content: "Slide 1" }],
        },
        {
          type: "Slide",
          style: { width: 960, height: 540 },
          background: {
            type: "gradient",
            stops: [
              { color: "#FF0000", position: 0 },
              { color: "#0000FF", position: 100 },
            ],
          },
          children: [{ type: "Text", style: { width: 100, height: 50 }, content: "Slide 2" }],
        },
      ],
    };
    const buffer = await PaperEngine.render(doc);
    const slide1Xml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const slide2Xml = await getZipEntry(buffer, "ppt/slides/slide2.xml");
    expect(slide1Xml).toContain("a:pattFill");
    expect(slide2Xml).toContain("a:gradFill");
  });
});

// =========================================================================
// CATEGORY F: JUSTIFIED TEXT & ADVANCED LINE SPACING (6 tests)
// =========================================================================

describe("F: Justified Text & Advanced Line Spacing", () => {
  it("F1: textAlign 'justify' on TextStyle → algn='just' on a:pPr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200, textAlign: "justify" },
          content: "This is a long paragraph that should be justified across the full width of the text box to create clean edges on both sides.",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('algn="just"');
  });

  it("F2: line spacing percentage mode → <a:spcPct> instead of <a:spcPts>", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200 },
          paragraphs: [{
            runs: [{ text: "150% line spacing" }],
            lineSpacingMode: "percentage",
            lineHeight: 150,  // 150%
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:spcPct");
    expect(slideXml).toContain('val="150000"');
  });

  it("F3: text highlight color → <a:highlight> in run properties", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200 },
          content: [
            { text: "Normal text " },
            { text: "highlighted text", style: { highlight: "#FFFF00" } },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:highlight>");
    expect(slideXml).toContain("FFFF00");
  });

  it("F4: space before/after in percentage mode → <a:spcPct> in spcBef/spcAft", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200 },
          paragraphs: [
            {
              runs: [{ text: "First paragraph" }],
              spaceAfterPercent: 50,  // 50% of font size
            },
            {
              runs: [{ text: "Second paragraph" }],
              spaceBeforePercent: 100, // 100% of font size
            },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // At least one spcPct for spacing
    const tree = parseXml(slideXml);
    const spcPcts = findAllElements(tree, "a:spcPct");
    expect(spcPcts.length).toBeGreaterThanOrEqual(1);
  });

  it("F5: kerning attribute on text runs → kern attribute in rPr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200 },
          content: [
            { text: "Kerned text", style: { kerning: 12 } },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // kern="1200" (points * 100)
    expect(slideXml).toContain('kern="1200"');
  });

  it("F6: justify on paragraph level + points line spacing coexist", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200 },
          paragraphs: [{
            runs: [{ text: "Justified with specific line spacing in points." }],
            align: "justify",
            lineHeight: 24, // 24pt
          }],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('algn="just"');
    expect(slideXml).toContain("<a:spcPts");
  });
});

// =========================================================================
// CATEGORY G: WORDART / TEXT WARP PRESETS (5 tests)
// =========================================================================

describe("G: WordArt / Text Warp Presets", () => {
  it("G1: textWarp 'textArchUp' → <a:prstTxWarp prst='textArchUp'> in bodyPr", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200, textWarp: "textArchUp" },
          content: "Arched Text",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:prstTxWarp");
    expect(slideXml).toContain('prst="textArchUp"');
  });

  it("G2: textWarp 'textWave1' → correct preset", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200, textWarp: "textWave1" },
          content: "Wavy Text",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('prst="textWave1"');
  });

  it("G3: textWarp 'textCircle' → correct preset with avLst", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200, textWarp: "textCircle" },
          content: "Circle Text",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('prst="textCircle"');
    expect(slideXml).toContain("<a:avLst");
  });

  it("G4: textWarp on shape text (View.textStyle) → also works", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: { width: 400, height: 200, backgroundColor: "#4472C4" },
          textContent: "Shape with warped text",
          textStyle: { textWarp: "textDeflate", color: "#FFFFFF", fontSize: 24 },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('prst="textDeflate"');
  });

  it("G5: textWarp 'textNoShape' (no warp) → no prstTxWarp element", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200, textWarp: "textNoShape" },
          content: "No warp applied",
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // textNoShape means no warp, so prstTxWarp should either not be present
    // or be present with prst="textNoShape" (both are valid)
    const hasWarp = slideXml.includes('prst="textNoShape"');
    const noWarp = !slideXml.includes("prstTxWarp");
    expect(hasWarp || noWarp).toBe(true);
  });
});

// =========================================================================
// CATEGORY H: TABLE CELL DIAGONAL BORDERS (4 tests)
// =========================================================================

describe("H: Table Cell Diagonal Borders", () => {
  it("H1: diagonal top-left to bottom-right → <a:lnTlToBr> in tcPr", async () => {
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
            columns: [200, 200],
            rows: [{
              cells: [
                {
                  text: "Diagonal",
                  style: {
                    borders: {
                      diagonalDown: { width: 1, color: "#FF0000" },
                    },
                  },
                },
                { text: "Normal" },
              ],
            }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:lnTlToBr");
  });

  it("H2: diagonal bottom-left to top-right → <a:lnBlToTr> in tcPr", async () => {
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
            columns: [200, 200],
            rows: [{
              cells: [
                {
                  text: "Diagonal Up",
                  style: {
                    borders: {
                      diagonalUp: { width: 2, color: "#0000FF" },
                    },
                  },
                },
                { text: "Normal" },
              ],
            }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:lnBlToTr");
  });

  it("H3: both diagonals on same cell → X pattern", async () => {
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
            columns: [200, 200],
            rows: [{
              cells: [
                {
                  text: "X",
                  style: {
                    borders: {
                      diagonalDown: { width: 1, color: "#FF0000" },
                      diagonalUp: { width: 1, color: "#0000FF" },
                    },
                  },
                },
                { text: "Normal" },
              ],
            }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:lnTlToBr");
    expect(slideXml).toContain("a:lnBlToTr");
  });

  it("H4: diagonal borders coexist with regular borders", async () => {
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
            columns: [200, 200],
            rows: [{
              cells: [
                {
                  text: "All borders",
                  style: {
                    borders: {
                      top: { width: 2, color: "#000000" },
                      bottom: { width: 2, color: "#000000" },
                      left: { width: 2, color: "#000000" },
                      right: { width: 2, color: "#000000" },
                      diagonalDown: { width: 1, color: "#FF0000" },
                    },
                  },
                },
                { text: "Normal" },
              ],
            }],
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:lnL");
    expect(slideXml).toContain("a:lnR");
    expect(slideXml).toContain("a:lnT");
    expect(slideXml).toContain("a:lnB");
    expect(slideXml).toContain("a:lnTlToBr");
  });
});

// =========================================================================
// CATEGORY I: ADVANCED CONNECTOR FEATURES (5 tests)
// =========================================================================

describe("I: Advanced Connector Features", () => {
  it("I1: arrow head types (stealth, diamond, oval) → <a:headEnd>/<a:tailEnd> with type", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Connector",
          connectorType: "straight",
          start: { x: 100, y: 100 },
          end: { x: 400, y: 300 },
          lineWidth: 2,
          lineColor: "#000000",
          arrowStart: { type: "stealth" },
          arrowEnd: { type: "diamond" },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('type="stealth"');
    expect(slideXml).toContain('type="diamond"');
  });

  it("I2: arrow sizes (small, medium, large) → w and len attributes", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Connector",
          connectorType: "straight",
          start: { x: 100, y: 100 },
          end: { x: 400, y: 300 },
          lineWidth: 2,
          lineColor: "#000000",
          arrowEnd: { type: "triangle", width: "lg", length: "lg" },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('w="lg"');
    expect(slideXml).toContain('len="lg"');
  });

  it("I3: oval arrow head → type='oval'", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Connector",
          connectorType: "elbow",
          start: { x: 100, y: 100 },
          end: { x: 400, y: 300 },
          lineWidth: 2,
          lineColor: "#4472C4",
          arrowEnd: { type: "oval" },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('type="oval"');
  });

  it("I4: no arrow (type='none') → type='none' on headEnd/tailEnd", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Connector",
          connectorType: "straight",
          start: { x: 100, y: 100 },
          end: { x: 400, y: 300 },
          lineWidth: 2,
          lineColor: "#000000",
          arrowStart: { type: "none" },
          arrowEnd: { type: "triangle", width: "sm", length: "med" },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('<a:headEnd type="none"');
    expect(slideXml).toContain('<a:tailEnd type="triangle"');
  });

  it("I5: backward-compatible boolean arrowStart/arrowEnd still works", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Connector",
          connectorType: "straight",
          start: { x: 100, y: 100 },
          end: { x: 400, y: 300 },
          lineWidth: 2,
          lineColor: "#000000",
          arrowStart: true,
          arrowEnd: true,
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("headEnd");
    expect(slideXml).toContain("tailEnd");
    expect(slideXml).toContain('type="triangle"');
  });
});

// =========================================================================
// CATEGORY J: INTEGRATION & STRESS (6 tests)
// =========================================================================

describe("J: Phase 5 Integration & Stress", () => {
  it("J1: all Phase 5 features on single slide → no corruption", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Phase 5 Integration", author: "MBB Test" },
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "pattern",
          pattern: "ltDnDiag",
          foreground: "#CCCCCC",
          background: "#FFFFFF",
        },
        children: [
          // Extended color modifier shape
          {
            type: "View",
            style: {
              width: 200, height: 100,
              position: "absolute", left: 10, top: 10,
              backgroundColor: { scheme: "accent1", lumMod: 60, lumOff: 40 },
              effects: {
                scene3d: {
                  camera: { preset: "orthographicFront" },
                  lightRig: { type: "threePt", direction: "t" },
                },
                sp3d: {
                  bevelTop: { width: 4, height: 2, preset: "circle" },
                },
              },
            },
          },
          // Image with effects
          {
            type: "Image",
            style: { width: 200, height: 150, position: "absolute", left: 220, top: 10 },
            src: RED_PIXEL,
            imageEffects: { brightness: 10, grayscale: true },
          },
          // Justified text with highlight
          {
            type: "Text",
            style: {
              width: 300, height: 100,
              position: "absolute", left: 10, top: 120,
              textAlign: "justify",
            },
            content: [
              { text: "This is " },
              { text: "highlighted", style: { highlight: "#FFFF00" } },
              { text: " justified text." },
            ],
          },
          // Table with diagonal borders
          {
            type: "Table",
            style: { width: 400, height: 100, position: "absolute", left: 10, top: 230 },
            tableData: {
              columns: [200, 200],
              rows: [{
                cells: [
                  {
                    text: "Diagonal",
                    style: {
                      borders: {
                        diagonalDown: { width: 1, color: "#FF0000" },
                      },
                    },
                  },
                  { text: "Normal" },
                ],
              }],
            },
          },
          // Connector with arrow types
          {
            type: "Connector",
            connectorType: "straight",
            start: { x: 500, y: 50 },
            end: { x: 700, y: 200 },
            lineWidth: 2,
            lineColor: "#000000",
            arrowEnd: { type: "stealth", width: "med", length: "med" },
          },
        ],
      }],
    };

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // All feature markers should be present
    expect(slideXml).toContain("lumMod");
    expect(slideXml).toContain("a:scene3d");
    expect(slideXml).toContain("a:pattFill");
    expect(slideXml).toContain('algn="just"');
    expect(slideXml).toContain("a:lnTlToBr");
    expect(slideXml).toContain('type="stealth"');
  });

  it("J2: 10-slide deck with mixed Phase 5 features → all slides render", async () => {
    const slides = Array.from({ length: 10 }, (_, i) => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      background: i % 3 === 0
        ? { type: "pattern" as const, pattern: "smCheck" as const, foreground: "#333333" as const, background: "#FFFFFF" as const }
        : i % 3 === 1
          ? { type: "solid" as const, color: "#F0F0F0" }
          : { type: "gradient" as const, stops: [{ color: "#FF0000", position: 0 }, { color: "#0000FF", position: 100 }] },
      children: [{
        type: "Text" as const,
        style: { width: 400, height: 100, textAlign: i % 2 === 0 ? "justify" as const : "left" as const },
        content: `Slide ${i + 1} content with justified text alignment`,
      }],
    }));

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides,
    };

    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);
    const slideFiles = paths.filter(p => p.match(/ppt\/slides\/slide\d+\.xml/));
    expect(slideFiles.length).toBe(10);
  });

  it("J3: 3D effects + drop shadow + glow coexist → effectLst + scene3d + sp3d all present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 200, height: 100,
            backgroundColor: "#4472C4",
            effects: {
              dropShadow: { color: "#000000", offsetX: 3, offsetY: 3, blurRadius: 6 },
              glow: { color: "#FFFF00", radius: 10 },
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
              sp3d: {
                bevelTop: { width: 5, height: 3, preset: "circle" },
              },
            },
          },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("<a:effectLst>");
    expect(slideXml).toContain("<a:outerShdw");
    expect(slideXml).toContain("<a:glow");
    expect(slideXml).toContain("<a:scene3d>");
    expect(slideXml).toContain("<a:sp3d");
  });

  it("J4: extended color modifiers on text runs → correct OOXML in run properties", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Text",
          style: { width: 400, height: 200 },
          content: [
            {
              text: "Themed text",
              style: { color: { scheme: "accent1", lumMod: 75, lumOff: 25 } },
            },
          ],
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('val="accent1"');
    expect(slideXml).toContain("lumMod");
    expect(slideXml).toContain("lumOff");
  });

  it("J5: WordArt + 3D effects combo → both prstTxWarp and scene3d present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "View",
          style: {
            width: 400, height: 200,
            backgroundColor: "#4472C4",
            effects: {
              scene3d: {
                camera: { preset: "orthographicFront" },
                lightRig: { type: "threePt", direction: "t" },
              },
              sp3d: {
                bevelTop: { width: 5, height: 3, preset: "circle" },
              },
            },
          },
          textContent: "3D WordArt",
          textStyle: { textWarp: "textArchUp", color: "#FFFFFF", fontSize: 36 },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("prstTxWarp");
    expect(slideXml).toContain("a:scene3d");
  });

  it("J6: image effects + crop coexist → both srcRect and blip effects present", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [{
          type: "Image",
          style: { width: 400, height: 300 },
          src: RED_PIXEL,
          crop: { left: 10, top: 10, right: 10, bottom: 10 },
          imageEffects: { brightness: 15, contrast: 5 },
        }],
      }],
    };
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("a:srcRect");
    expect(slideXml).toContain("a:lum");
  });
});
