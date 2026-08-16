/**
 * SOTA Benchmarks 5 — Phase 5 Feature Validation
 *
 * 57 tests across 12 categories: Slide Comments, Multi-Master, Font Embedding,
 * Video/Audio, Language Tags, Attribute Escaping, Shape Locks, Notes Size +
 * Accessibility, Animation Effects, Motion Paths, Custom Geometry, Integration Stress.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, PaperNode, AnimationIntent, AnimationEffect } from "../src/types/ast.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL, getText,
  getChildren, getTagName, getChildTagNames,
} from "./helpers/xmlTestUtils.js";

const FONT_ASSET_DIR = join(import.meta.dirname, "../assets/fonts");
const fontDataUri = (fileName: string): string =>
  `data:font/ttf;base64,${readFileSync(join(FONT_ASSET_DIR, fileName)).toString("base64")}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSlide(children: PaperNode[], overrides?: Partial<PaperSlide>): PaperSlide {
  return { type: "Slide", style: { width: 960, height: 540 }, children, ...overrides };
}

function makeDoc(slides: PaperSlide[], overrides?: Partial<PaperDocument>): PaperDocument {
  return { type: "Document", meta: {}, slides, ...overrides };
}

// =========================================================================
// CATEGORY A: SLIDE COMMENTS (8 tests)
// =========================================================================

describe("A: Slide Comments", () => {
  it("A1: Single comment has correct authorId, idx, and text", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [{ author: "Alice", text: "Great slide!", date: "2026-01-15T10:30:00Z", x: 50, y: 75 }],
    })]);

    const buffer = await PaperEngine.render(doc);

    // Verify comment file exists
    expect(await zipHasFile(buffer, "ppt/comments/comment1.xml")).toBe(true);

    const commentXml = await getZipEntry(buffer, "ppt/comments/comment1.xml");
    const tree = parseXml(commentXml);
    const cms = findAllElements(tree, "p:cm");
    expect(cms.length).toBe(1);

    const cm = cms[0];
    expect(getAttr(cm, "authorId")).toBe("0");
    expect(getAttr(cm, "idx")).toBe("1");
    expect(getAttr(cm, "dt")).toBe("2026-01-15T10:30:00Z");

    // Verify text
    const textEls = findAllElements(tree, "p:text");
    expect(textEls.length).toBe(1);
    expect(getText(textEls[0])).toBe("Great slide!");

    // Verify position in EMU (50 * 9525 = 476250, 75 * 9525 = 714375)
    const posEls = findAllElements(tree, "p:pos");
    expect(posEls.length).toBe(1);
    expect(getAttr(posEls[0], "x")).toBe("476250");
    expect(getAttr(posEls[0], "y")).toBe("714375");
  });

  it("A2: Multiple comments, same author → single author in commentAuthors.xml, lastIdx matches count", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [
        { author: "Bob", text: "Comment 1", date: "2026-01-01T00:00:00Z" },
        { author: "Bob", text: "Comment 2", date: "2026-01-02T00:00:00Z" },
        { author: "Bob", text: "Comment 3", date: "2026-01-03T00:00:00Z" },
      ],
    })]);

    const buffer = await PaperEngine.render(doc);

    const authorsXml = await getZipEntry(buffer, "ppt/commentAuthors.xml");
    const authTree = parseXml(authorsXml);
    const authors = findAllElements(authTree, "p:cmAuthor");
    expect(authors.length).toBe(1);
    expect(getAttr(authors[0], "name")).toBe("Bob");
    expect(getAttr(authors[0], "lastIdx")).toBe("3");

    const commentXml = await getZipEntry(buffer, "ppt/comments/comment1.xml");
    const cmTree = parseXml(commentXml);
    const cms = findAllElements(cmTree, "p:cm");
    expect(cms.length).toBe(3);
  });

  it("A3: Multiple authors → unique id and clrIdx per author", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [
        { author: "Alice", text: "From Alice" },
        { author: "Bob", text: "From Bob" },
        { author: "Charlie", text: "From Charlie" },
      ],
    })]);

    const buffer = await PaperEngine.render(doc);
    const authorsXml = await getZipEntry(buffer, "ppt/commentAuthors.xml");
    const tree = parseXml(authorsXml);
    const authors = findAllElements(tree, "p:cmAuthor");
    expect(authors.length).toBe(3);

    const ids = authors.map(a => getAttr(a, "id"));
    const clrIdxs = authors.map(a => getAttr(a, "clrIdx"));
    // All unique
    expect(new Set(ids).size).toBe(3);
    expect(new Set(clrIdxs).size).toBe(3);
  });

  it("A4: Comment positioning → EMU values correct", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [{ author: "X", text: "Pos test", x: 100, y: 200 }],
    })]);

    const buffer = await PaperEngine.render(doc);
    const commentXml = await getZipEntry(buffer, "ppt/comments/comment1.xml");
    const tree = parseXml(commentXml);
    const posEls = findAllElements(tree, "p:pos");
    expect(posEls.length).toBe(1);
    // 100 * 9525 = 952500, 200 * 9525 = 1905000
    expect(getAttr(posEls[0], "x")).toBe("952500");
    expect(getAttr(posEls[0], "y")).toBe("1905000");
  });

  it("A5: Special XML chars in comment text → properly escaped", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [{ author: "Dev", text: "x < y & z > w \"quoted\"" }],
    })]);

    const buffer = await PaperEngine.render(doc);
    const commentXml = await getZipEntry(buffer, "ppt/comments/comment1.xml");
    // Verify the raw XML has escaped entities
    expect(commentXml).toContain("&lt;");
    expect(commentXml).toContain("&amp;");
    expect(commentXml).toContain("&gt;");
  });

  it("A6: Comments on multiple slides → per-slide comment files + correct content type overrides", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], {
        comments: [{ author: "A", text: "Slide 1 comment" }],
      }),
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], {
        comments: [{ author: "B", text: "Slide 2 comment" }],
      }),
    ]);

    const buffer = await PaperEngine.render(doc);
    expect(await zipHasFile(buffer, "ppt/comments/comment1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/comments/comment2.xml")).toBe(true);

    // Verify content types
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).toContain("comment1.xml");
    expect(ctXml).toContain("comment2.xml");
    expect(ctXml).toContain("commentAuthors.xml");
  });

  it("A7: Comment date formatting → ISO 8601 dt attribute", async () => {
    const isoDate = "2026-02-22T14:30:00.000Z";
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [{ author: "T", text: "Date test", date: isoDate }],
    })]);

    const buffer = await PaperEngine.render(doc);
    const commentXml = await getZipEntry(buffer, "ppt/comments/comment1.xml");
    const tree = parseXml(commentXml);
    const cms = findAllElements(tree, "p:cm");
    expect(getAttr(cms[0], "dt")).toBe(isoDate);
  });

  it("A8: Slide with comments + slide without → only relevant comment files exist", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], {
        comments: [{ author: "A", text: "Has comment" }],
      }),
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], {
        comments: [{ author: "A", text: "Also has comment" }],
      }),
    ]);

    const buffer = await PaperEngine.render(doc);
    expect(await zipHasFile(buffer, "ppt/comments/comment1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/comments/comment2.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/comments/comment3.xml")).toBe(false);

    // Verify slide rels: only slide 1 and 3 have comment rels
    const slide1Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(slide1Rels).toContain("comments/comment1.xml");

    const slide2Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide2.xml.rels");
    expect(slide2Rels).not.toContain("comments");

    const slide3Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide3.xml.rels");
    expect(slide3Rels).toContain("comments/comment2.xml");
  });
});

// =========================================================================
// CATEGORY B: MULTI-MASTER (6 tests)
// =========================================================================

describe("B: Multi-Master", () => {
  it("B9: Two masters, one layout each → correct slideMaster and slideLayout files", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "Corporate" }),
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "Creative" }),
    ], {
      masters: [
        { name: "Corporate", layouts: [{ name: "Title Slide" }] },
        { name: "Creative", layouts: [{ name: "Content" }] },
      ],
    });

    const buffer = await PaperEngine.render(doc);

    // Verify both masters exist
    expect(await zipHasFile(buffer, "ppt/slideMasters/slideMaster1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideMasters/slideMaster2.xml")).toBe(true);

    // Verify both layouts exist
    expect(await zipHasFile(buffer, "ppt/slideLayouts/slideLayout1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideLayouts/slideLayout2.xml")).toBe(true);

    // Verify master 1's layout list references its layout
    const master1Xml = await getZipEntry(buffer, "ppt/slideMasters/slideMaster1.xml");
    const master1Tree = parseXml(master1Xml);
    const master1LayoutIds = findAllElements(master1Tree, "p:sldLayoutId");
    expect(master1LayoutIds.length).toBe(1);
    expect(getAttr(master1LayoutIds[0], "r:id")).toBe("rId1");

    // Verify master 2's layout list
    const master2Xml = await getZipEntry(buffer, "ppt/slideMasters/slideMaster2.xml");
    const master2Tree = parseXml(master2Xml);
    const master2LayoutIds = findAllElements(master2Tree, "p:sldLayoutId");
    expect(master2LayoutIds.length).toBe(1);
    expect(getAttr(master2LayoutIds[0], "r:id")).toBe("rId1");
  });

  it("B10: Master with background → <p:bg> in master XML", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "Dark" }),
    ], {
      masters: [
        { name: "Dark", layouts: [{ name: "Blank" }], background: { type: "solid", color: "#1a1a1a" } },
      ],
    });

    const buffer = await PaperEngine.render(doc);
    const masterXml = await getZipEntry(buffer, "ppt/slideMasters/slideMaster1.xml");
    const tree = parseXml(masterXml);
    const bgs = findAllElements(tree, "p:bg");
    expect(bgs.length).toBe(1);

    // Verify solid fill color
    const solidFills = findAllElements(tree, "a:solidFill");
    expect(solidFills.length).toBeGreaterThanOrEqual(1);
  });

  it("B11: Slide targeting specific master → slide rels layoutTarget points to correct layout", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "MasterA" }),
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "MasterB" }),
    ], {
      masters: [
        { name: "MasterA", layouts: [{ name: "LayoutA" }] },
        { name: "MasterB", layouts: [{ name: "LayoutB" }] },
      ],
    });

    const buffer = await PaperEngine.render(doc);

    // Slide 1 should reference slideLayout1 (MasterA's layout)
    const slide1Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(slide1Rels).toContain("slideLayout1.xml");

    // Slide 2 should reference slideLayout2 (MasterB's layout)
    const slide2Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide2.xml.rels");
    expect(slide2Rels).toContain("slideLayout2.xml");
  });

  it("B12: Master with 3 layouts → 3 layout files + master rels lists all 3", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "Rich" }),
    ], {
      masters: [
        {
          name: "Rich",
          layouts: [
            { name: "Title" },
            { name: "Content" },
            { name: "Blank" },
          ],
        },
      ],
    });

    const buffer = await PaperEngine.render(doc);

    // 3 layout files
    expect(await zipHasFile(buffer, "ppt/slideLayouts/slideLayout1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideLayouts/slideLayout2.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideLayouts/slideLayout3.xml")).toBe(true);

    // Master rels should list all 3
    const masterRels = await getZipEntry(buffer, "ppt/slideMasters/_rels/slideMaster1.xml.rels");
    expect(masterRels).toContain("slideLayout1.xml");
    expect(masterRels).toContain("slideLayout2.xml");
    expect(masterRels).toContain("slideLayout3.xml");

    // Master XML should have 3 sldLayoutId entries
    const masterXml = await getZipEntry(buffer, "ppt/slideMasters/slideMaster1.xml");
    const tree = parseXml(masterXml);
    const layoutIds = findAllElements(tree, "p:sldLayoutId");
    expect(layoutIds.length).toBe(3);
  });

  it("B13: Unknown masterName fallback → no crash, falls back to first master", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "NonExistent" }),
    ], {
      masters: [
        { name: "Default", layouts: [{ name: "Blank" }] },
      ],
    });

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    // Should still produce a valid slide with fallback layout
    const slideRels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    expect(slideRels).toContain("slideLayout");
  });

  it("B14: Presentation.xml master IDs → values >= 2147483648 and unique", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "A" }),
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }], { masterName: "B" }),
    ], {
      masters: [
        { name: "A", layouts: [{ name: "L1" }] },
        { name: "B", layouts: [{ name: "L2" }] },
      ],
    });

    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presXml);
    const masterIds = findAllElements(tree, "p:sldMasterId");
    expect(masterIds.length).toBe(2);

    const ids = masterIds.map(m => parseInt(getAttr(m, "id")!, 10));
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(2147483648);
    }
    expect(new Set(ids).size).toBe(2);
  });
});

// =========================================================================
// CATEGORY C: FONT EMBEDDING (5 tests)
// =========================================================================

describe("C: Font Embedding", () => {
  const regularFontDataUri = fontDataUri("Carlito-Regular.ttf");

  it("C15: Implicit portable mode omits unsupported PowerPoint font parts", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "Text", content: "Portable", style: { fontFamily: "Carlito", width: 300, height: 50 } }]),
    ]);

    const buffer = await PaperEngine.render(doc);

    expect(await zipHasFile(buffer, "ppt/fonts/font1.fntdata")).toBe(false);
    const ctXml = await getZipEntry(buffer, "[Content_Types].xml");
    expect(ctXml).not.toContain("application/x-fontdata");
    const presRels = await getZipEntry(buffer, "ppt/_rels/presentation.xml.rels");
    expect(presRels).not.toContain("relationships/font");
  });

  it("C16: Explicit user-embedded mode fails closed", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
    ], {
      fontStrategy: "user-embedded",
      embeddedFonts: [{ fontFamily: "Carlito", src: regularFontDataUri }],
    });

    await expect(PaperEngine.render(doc)).rejects.toMatchObject({
      code: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
      phase: "font",
    });
  });

  it("C17: Legacy embeddedFonts shorthand also fails closed", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
    ], {
      embeddedFonts: [
        { fontFamily: "Carlito", src: regularFontDataUri },
      ],
    });

    await expect(PaperEngine.render(doc)).rejects.toMatchObject({
      code: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
    });
  });

  it("C18: Fail-closed error gives an actionable system-font remediation", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
    ], {
      embeddedFonts: [{ fontFamily: "Carlito", src: regularFontDataUri }],
    });

    await expect(PaperEngine.render(doc)).rejects.toMatchObject({
      remediation: expect.stringContaining('fontStrategy="system"'),
    });
  });

  it("C19: System mode remains a valid no-font-part export", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
    ], {
      fontStrategy: "system",
    });

    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    expect(presXml).not.toContain("embeddedFontLst");
    expect(await zipHasFile(buffer, "ppt/fonts/font1.fntdata")).toBe(false);
  });
});

// =========================================================================
// CATEGORY D: VIDEO/AUDIO (6 tests)
// =========================================================================

describe("D: Video/Audio", () => {
  it("D20: Video node → renders as placeholder shape (no crash)", async () => {
    const doc = makeDoc([makeSlide([
      { type: "Video", style: { width: 640, height: 360 }, src: "https://example.com/video.mp4" } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    // Should have a shape element
    expect(slideXml).toContain("p:sp");
  });

  it("D21: Audio node → renders as placeholder shape (no crash)", async () => {
    const doc = makeDoc([makeSlide([
      { type: "Audio", style: { width: 200, height: 200 }, src: "https://example.com/audio.mp3" } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("D22: Video without poster → no crash, graceful handling", async () => {
    const doc = makeDoc([makeSlide([
      { type: "Video", style: { width: 320, height: 240 }, src: "https://example.com/no-poster.mp4" } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("D23: Video node renders valid ZIP structure", async () => {
    const doc = makeDoc([makeSlide([
      { type: "Video", style: { width: 640, height: 360 }, src: "https://example.com/test.mp4" } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    // Should have standard PPTX structure
    expect(paths).toContain("ppt/slides/slide1.xml");
    expect(paths).toContain("ppt/presentation.xml");
    expect(paths).toContain("[Content_Types].xml");
  });

  it("D24: Multiple media nodes across slides → valid output", async () => {
    const doc = makeDoc([
      makeSlide([
        { type: "Video", style: { width: 640, height: 360 }, src: "https://example.com/v1.mp4" } as any,
      ]),
      makeSlide([
        { type: "Video", style: { width: 640, height: 360 }, src: "https://example.com/v2.mp4" } as any,
      ]),
    ]);

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);
    expect(await zipHasFile(buffer, "ppt/slides/slide1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slides/slide2.xml")).toBe(true);
  });

  it("D25: Video + images on same slide → no rId collision", async () => {
    const doc = makeDoc([makeSlide([
      { type: "Image", style: { width: 200, height: 200 }, src: RED_PIXEL } as any,
      { type: "Video", style: { width: 640, height: 360 }, src: "https://example.com/v.mp4" } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify slide rels have no duplicate rIds
    const slideRels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const rIdMatches = slideRels.match(/Id="(rId\d+)"/g) ?? [];
    const rIds = rIdMatches.map(m => m.match(/rId\d+/)![0]);
    expect(new Set(rIds).size).toBe(rIds.length);
  });
});

// =========================================================================
// CATEGORY E: LANGUAGE TAGS (4 tests)
// =========================================================================

describe("E: Language Tags", () => {
  it("E26: Japanese text lang='ja-JP' → <a:rPr lang='ja-JP'> (NOT en-US)", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Text",
        style: { width: 400, height: 100, lang: "ja-JP" },
        content: "こんにちは",
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");

    // At least one rPr should have lang="ja-JP"
    const jpRuns = rPrs.filter(r => getAttr(r, "lang") === "ja-JP");
    expect(jpRuns.length).toBeGreaterThan(0);
  });

  it("E27: Mixed languages per run → per-run lang attributes differ", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Text",
        style: { width: 400, height: 100 },
        content: [
          { text: "Hello ", style: { lang: "en-US" } },
          { text: "世界", style: { lang: "zh-CN" } },
        ],
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");

    const langs = rPrs.map(r => getAttr(r, "lang")).filter(Boolean);
    expect(langs).toContain("en-US");
    expect(langs).toContain("zh-CN");
  });

  it("E28: Default lang inherited from TextStyle → all runs use inherited lang", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Text",
        style: { width: 400, height: 100, lang: "fr-FR" },
        content: [
          { text: "Bonjour" },
          { text: " le monde" },
        ],
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");

    // All run props should have lang="fr-FR" (inherited from TextStyle)
    const runLangs = rPrs.map(r => getAttr(r, "lang")).filter(Boolean);
    for (const lang of runLangs) {
      expect(lang).toBe("fr-FR");
    }
  });

  it("E29: altLang attribute → altLang='ja-JP' on <a:rPr>", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Text",
        style: { width: 400, height: 100 },
        content: [
          { text: "Test", style: { lang: "en-US", altLang: "ja-JP" } },
        ],
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const rPrs = findAllElements(tree, "a:rPr");

    const altLangs = rPrs.map(r => getAttr(r, "altLang")).filter(Boolean);
    expect(altLangs).toContain("ja-JP");
  });
});

// =========================================================================
// CATEGORY F: ATTRIBUTE ESCAPING (4 tests)
// =========================================================================

describe("F: Attribute Escaping", () => {
  it("F30: Shape altText with < > & \" → properly escaped descr attribute", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        altText: 'Shape with <angles> & "quotes"',
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // The raw XML should contain escaped entities in the descr attribute
    expect(slideXml).toContain("&lt;angles&gt;");
    expect(slideXml).toContain("&amp;");
    expect(slideXml).toContain("&quot;quotes&quot;");
    // Should NOT contain unescaped < or > within the attribute
    expect(slideXml).not.toMatch(/descr="[^"]*<angles>/);
  });

  it("F31: Comment text with XML entities → <p:text> escaping", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 } },
    ], {
      comments: [{ author: "Dev", text: "if (a < b && c > d) return 'yes'" }],
    })]);

    const buffer = await PaperEngine.render(doc);
    const commentXml = await getZipEntry(buffer, "ppt/comments/comment1.xml");
    expect(commentXml).toContain("&lt;");
    expect(commentXml).toContain("&amp;&amp;");
    expect(commentXml).toContain("&gt;");
  });

  it("F32: Text content with control chars (U+0001) → stripped from output", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Text",
        style: { width: 400, height: 100 },
        content: "Hello\x01World\x08Test",
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Control chars should be stripped
    expect(slideXml).not.toContain("\x01");
    expect(slideXml).not.toContain("\x08");
    // But the text around them should remain
    expect(slideXml).toContain("HelloWorldTest");
  });

  it("F33: Hyperlink URL with & → &amp; in rels", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        hyperlink: "https://example.com?a=1&b=2&c=3",
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideRels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");

    // The & should be escaped in the XML rels
    expect(slideRels).toContain("&amp;");
    // Ensure the unescaped literal `&b` does not appear
    expect(slideRels).not.toMatch(/a=1&b/);
  });
});

// =========================================================================
// CATEGORY G: SHAPE LOCKS (4 tests)
// =========================================================================

describe("G: Shape Locks", () => {
  it("G34: View with noRot lock → <a:spLocks noRot='1'/>", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 200, height: 100 }, locks: { noRot: true } },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const spLocks = findAllElements(tree, "a:spLocks");
    expect(spLocks.length).toBeGreaterThan(0);
    expect(getAttr(spLocks[0], "noRot")).toBe("1");
  });

  it("G35: Image with custom locks merged with defaults → both noChangeAspect and custom attrs", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Image",
        style: { width: 200, height: 200 },
        src: RED_PIXEL,
        locks: { noRot: true, noMove: true },
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Images use <a:picLocks>
    const picLocks = findAllElements(tree, "a:picLocks");
    expect(picLocks.length).toBeGreaterThan(0);

    // Should have defaults (noGrp, noChangeAspect) AND custom (noRot, noMove)
    expect(getAttr(picLocks[0], "noChangeAspect")).toBe("1");
    expect(getAttr(picLocks[0], "noGrp")).toBe("1");
    expect(getAttr(picLocks[0], "noRot")).toBe("1");
    expect(getAttr(picLocks[0], "noMove")).toBe("1");
  });

  it("G36: Connector locks → <a:cxnSpLocks>", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "Connector",
        style: { width: 200, height: 0 },
        connectorType: "straight",
        start: { x: 0, y: 100 },
        end: { x: 200, y: 100 },
        locks: { noSelect: true },
      } as any,
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const cxnLocks = findAllElements(tree, "a:cxnSpLocks");
    expect(cxnLocks.length).toBeGreaterThan(0);
    expect(getAttr(cxnLocks[0], "noSelect")).toBe("1");
  });

  it("G37: Multiple lock attributes on one shape → all present", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        locks: { noGrp: true, noRot: true, noMove: true, noResize: true, noTextEdit: true },
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);
    const spLocks = findAllElements(tree, "a:spLocks");
    expect(spLocks.length).toBeGreaterThan(0);

    expect(getAttr(spLocks[0], "noGrp")).toBe("1");
    expect(getAttr(spLocks[0], "noRot")).toBe("1");
    expect(getAttr(spLocks[0], "noMove")).toBe("1");
    expect(getAttr(spLocks[0], "noResize")).toBe("1");
    expect(getAttr(spLocks[0], "noTextEdit")).toBe("1");
  });
});

// =========================================================================
// CATEGORY H: NOTES SIZE + ACCESSIBILITY (4 tests)
// =========================================================================

describe("H: Notes Size + Accessibility", () => {
  it("H38: Custom notes size → <p:notesSz> matches input", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
    ], {
      notesSize: { width: 800, height: 600 },
    });

    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presXml);
    const notesSz = findAllElements(tree, "p:notesSz");
    expect(notesSz.length).toBe(1);

    // 800 * 9525 = 7620000, 600 * 9525 = 5715000
    expect(getAttr(notesSz[0], "cx")).toBe("7620000");
    expect(getAttr(notesSz[0], "cy")).toBe("5715000");
  });

  it("H39: Decorative shape → extension element with decorative val='1'", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 200, height: 100 }, decorative: true },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // Verify decorative extension URI
    expect(slideXml).toContain("{C183D7F6-B498-43B3-948B-1728B52AA6E4}");
    expect(slideXml).toContain("adec:decorative");
    expect(slideXml).toContain('val="1"');
  });

  it("H40: Reading order sorts shapes → XML emission order matches specified order", async () => {
    const doc = makeDoc([makeSlide([
      { type: "View", style: { width: 100, height: 100 }, altText: "ShapeC", readingOrder: 3 },
      { type: "View", style: { width: 100, height: 100 }, altText: "ShapeA", readingOrder: 1 },
      { type: "View", style: { width: 100, height: 100 }, altText: "ShapeB", readingOrder: 2 },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");

    // ShapeA (readingOrder 1) should come before ShapeB (2) which is before ShapeC (3)
    const posA = slideXml.indexOf("ShapeA");
    const posB = slideXml.indexOf("ShapeB");
    const posC = slideXml.indexOf("ShapeC");
    expect(posA).toBeGreaterThan(-1);
    expect(posB).toBeGreaterThan(-1);
    expect(posC).toBeGreaterThan(-1);
    expect(posA).toBeLessThan(posB);
    expect(posB).toBeLessThan(posC);
  });

  it("H41: Default notes size unchanged when not specified", async () => {
    const doc = makeDoc([
      makeSlide([{ type: "View", style: { width: 100, height: 100 } }]),
    ]);

    const buffer = await PaperEngine.render(doc);
    const presXml = await getZipEntry(buffer, "ppt/presentation.xml");
    const tree = parseXml(presXml);
    const notesSz = findAllElements(tree, "p:notesSz");
    expect(notesSz.length).toBe(1);

    // Default: 6858000 x 9144000
    expect(getAttr(notesSz[0], "cx")).toBe("6858000");
    expect(getAttr(notesSz[0], "cy")).toBe("9144000");
  });
});

// =========================================================================
// CATEGORY I: ANIMATION EFFECTS (6 tests)
// =========================================================================

describe("I: Animation Effects", () => {
  it("I42: Bounce animation → presetID='26' and keyframe <p:tav> entries", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{ type: "entrance", effect: "bounce", trigger: "onClick", duration: 1000 }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Verify presetID="26"
    const cTns = findAllElements(tree, "p:cTn");
    const bounceCtn = cTns.find(c => getAttr(c, "presetID") === "26");
    expect(bounceCtn).toBeDefined();

    // Verify bounce has keyframe entries (p:tav)
    const tavs = findAllElements(tree, "p:tav");
    expect(tavs.length).toBeGreaterThanOrEqual(3); // bounce has 4 keyframes

    // Verify ppt_y attribute is animated
    expect(slideXml).toContain("ppt_y");
  });

  it("I43: Wipe animation → presetID='22' and filter='wipe(...)'", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{ type: "entrance", effect: "wipe", trigger: "onClick", direction: "right" }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Verify presetID="22"
    const cTns = findAllElements(tree, "p:cTn");
    const wipeCtn = cTns.find(c => getAttr(c, "presetID") === "22");
    expect(wipeCtn).toBeDefined();

    // Verify wipe filter
    const animEffects = findAllElements(tree, "p:animEffect");
    expect(animEffects.length).toBeGreaterThan(0);
    const wipeEffect = animEffects.find(e => getAttr(e, "filter")?.startsWith("wipe"));
    expect(wipeEffect).toBeDefined();
  });

  it("I44: Pulse emphasis → presetClass='emph' and <p:animScale> oscillation", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{ type: "emphasis", effect: "pulse", trigger: "onClick" }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Verify presetClass="emph"
    const cTns = findAllElements(tree, "p:cTn");
    const emphCtn = cTns.find(c => getAttr(c, "presetClass") === "emph");
    expect(emphCtn).toBeDefined();

    // Verify animScale with repeat
    const animScales = findAllElements(tree, "p:animScale");
    expect(animScales.length).toBeGreaterThan(0);

    // Verify it has repeatCount
    const scaleCtn = findAllElements(tree, "p:cTn").find(c => getAttr(c, "repeatCount") === "3");
    expect(scaleCtn).toBeDefined();
  });

  it("I45: All 15 effects on one slide → all unique presetIDs present", async () => {
    const effects: Array<{ effect: AnimationEffect; type: "entrance" | "exit" | "emphasis" }> = [
      { effect: "appear", type: "entrance" },
      { effect: "fade", type: "entrance" },
      { effect: "fly", type: "entrance" },
      { effect: "zoom", type: "entrance" },
      { effect: "spin", type: "emphasis" },
      { effect: "bounce", type: "entrance" },
      { effect: "float", type: "entrance" },
      { effect: "grow", type: "emphasis" },
      { effect: "shrink", type: "emphasis" },
      { effect: "pulse", type: "emphasis" },
      { effect: "teeter", type: "emphasis" },
      { effect: "wipe", type: "entrance" },
      { effect: "split", type: "entrance" },
      { effect: "dissolve", type: "entrance" },
      { effect: "swivel", type: "entrance" },
    ];

    const children: PaperNode[] = effects.map((e, i) => ({
      type: "View" as const,
      style: { width: 50, height: 50 },
      shapeType: "rect" as const,
      animations: [{
        type: e.type,
        effect: e.effect,
        trigger: "onClick" as const,
      }],
    }));

    const doc = makeDoc([makeSlide(children)]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Collect all presetIDs
    const cTns = findAllElements(tree, "p:cTn");
    const presetIDs = new Set(cTns.map(c => getAttr(c, "presetID")).filter(Boolean));

    // Expected unique IDs: 1(appear), 10(fade), 2(fly), 53(zoom), 8(spin),
    // 26(bounce), 42(float), 6(grow/shrink share), 7(pulse), 27(teeter),
    // 22(wipe), 16(split), 35(dissolve), 15(swivel)
    // grow & shrink share presetID 6, so 14 unique IDs total
    expect(presetIDs.size).toBeGreaterThanOrEqual(13);
  });

  it("I46: Easing easeInOut → accel='50000' decel='50000' on <p:cTn>", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{ type: "entrance", effect: "fade", trigger: "onClick", easing: "easeInOut" }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cTns = findAllElements(tree, "p:cTn");
    const easedCtn = cTns.find(c => getAttr(c, "accel") === "50000" && getAttr(c, "decel") === "50000");
    expect(easedCtn).toBeDefined();
  });

  it("I47: Easing easeIn → accel='100000' present, no decel", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{ type: "entrance", effect: "fade", trigger: "onClick", easing: "easeIn" }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cTns = findAllElements(tree, "p:cTn");
    const accelCtn = cTns.find(c => getAttr(c, "accel") === "100000");
    expect(accelCtn).toBeDefined();

    // The same cTn should NOT have decel
    if (accelCtn) {
      expect(getAttr(accelCtn, "decel")).toBeUndefined();
    }
  });
});

// =========================================================================
// CATEGORY J: MOTION PATHS (3 tests)
// =========================================================================

describe("J: Motion Paths", () => {
  it("J48: Linear motion path → <p:animMotion path='M 0 0 L 1 0' origin='layout'>", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{
          type: "entrance",
          effect: "motionPath",
          trigger: "onClick",
          motionPath: { path: "M 0 0 L 1 0", origin: "layout" },
        }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const motions = findAllElements(tree, "p:animMotion");
    expect(motions.length).toBe(1);
    expect(getAttr(motions[0], "origin")).toBe("layout");
    expect(getAttr(motions[0], "path")).toBe("M 0 0 L 1 0");
    expect(getAttr(motions[0], "pathEditMode")).toBe("relative");
  });

  it("J49: Curved path → <p:animMotion> with C commands in path", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [{
          type: "entrance",
          effect: "motionPath",
          trigger: "onClick",
          motionPath: { path: "M 0 0 C 0.25 0.1 0.75 0.9 1 1" },
        }],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const motions = findAllElements(tree, "p:animMotion");
    expect(motions.length).toBe(1);
    const pathAttr = getAttr(motions[0], "path");
    expect(pathAttr).toContain("C");
  });

  it("J50: Motion path + fade combo → both <p:animMotion> and <p:animEffect> in same slide", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 100 },
        shapeType: "rect",
        animations: [
          {
            type: "entrance",
            effect: "motionPath",
            trigger: "onClick",
            motionPath: { path: "M 0 0 L 0.5 0.5" },
          },
          {
            type: "entrance",
            effect: "fade",
            trigger: "withPrevious",
          },
        ],
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const motions = findAllElements(tree, "p:animMotion");
    expect(motions.length).toBe(1);

    const animEffects = findAllElements(tree, "p:animEffect");
    expect(animEffects.length).toBeGreaterThanOrEqual(1);
    const fadeEffect = animEffects.find(e => getAttr(e, "filter") === "fade");
    expect(fadeEffect).toBeDefined();
  });
});

// =========================================================================
// CATEGORY K: CUSTOM GEOMETRY (4 tests)
// =========================================================================

describe("K: Custom Geometry", () => {
  it("K51: Triangle via 3 lines → <a:custGeom> with moveTo, 2x lineTo, close; NO prstGeom", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 200 },
        customGeometry: {
          paths: [{
            commands: [
              { type: "moveTo", x: 500000, y: 0 },
              { type: "lineTo", x: 1000000, y: 1000000 },
              { type: "lineTo", x: 0, y: 1000000 },
              { type: "close" },
            ],
          }],
        },
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Should have custGeom
    const custGeoms = findAllElements(tree, "a:custGeom");
    expect(custGeoms.length).toBe(1);

    // Should NOT have prstGeom
    const prstGeoms = findAllElements(tree, "a:prstGeom");
    expect(prstGeoms.length).toBe(0);

    // Verify path commands
    const moveTos = findAllElements(tree, "a:moveTo");
    expect(moveTos.length).toBe(1);

    const lnTos = findAllElements(tree, "a:lnTo");
    expect(lnTos.length).toBe(2);

    const closes = findAllElements(tree, "a:close");
    expect(closes.length).toBe(1);
  });

  it("K52: Bezier curve → <a:cubicBezTo> with 3 <a:pt> children", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 200 },
        customGeometry: {
          paths: [{
            commands: [
              { type: "moveTo", x: 0, y: 500000 },
              { type: "cubicBezTo", cp1x: 250000, cp1y: 0, cp2x: 750000, cp2y: 1000000, x: 1000000, y: 500000 },
            ],
          }],
        },
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const cubicBezTos = findAllElements(tree, "a:cubicBezTo");
    expect(cubicBezTos.length).toBe(1);

    // cubicBezTo should have 3 <a:pt> children
    const pts = findAllElements([cubicBezTos[0]], "a:pt");
    expect(pts.length).toBe(3);
  });

  it("K53: Multiple paths → <a:pathLst> has 2+ <a:path> children", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 200 },
        customGeometry: {
          paths: [
            {
              commands: [
                { type: "moveTo", x: 0, y: 0 },
                { type: "lineTo", x: 500000, y: 500000 },
              ],
              width: 500000,
              height: 500000,
            },
            {
              commands: [
                { type: "moveTo", x: 500000, y: 500000 },
                { type: "lineTo", x: 1000000, y: 0 },
              ],
              width: 1000000,
              height: 500000,
            },
          ],
        },
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const pathLsts = findAllElements(tree, "a:pathLst");
    expect(pathLsts.length).toBe(1);

    const paths = findAllElements(tree, "a:path");
    expect(paths.length).toBe(2);
  });

  it("K54: Path with fill='none' → fill attribute on <a:path>", async () => {
    const doc = makeDoc([makeSlide([
      {
        type: "View",
        style: { width: 200, height: 200 },
        customGeometry: {
          paths: [{
            commands: [
              { type: "moveTo", x: 0, y: 0 },
              { type: "lineTo", x: 1000000, y: 1000000 },
            ],
            fill: "none",
          }],
        },
      },
    ])]);

    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const paths = findAllElements(tree, "a:path");
    expect(paths.length).toBe(1);
    expect(getAttr(paths[0], "fill")).toBe("none");
  });
});

// =========================================================================
// CATEGORY L: INTEGRATION STRESS (3 tests)
// =========================================================================

describe("L: Integration Stress", () => {
  it("L55: Document with comments + multi-master → no rId collision", async () => {
    const doc = makeDoc([
      makeSlide([
        { type: "Image", style: { width: 200, height: 200 }, src: RED_PIXEL } as any,
        { type: "View", style: { width: 100, height: 100 } },
      ], {
        masterName: "Master1",
        comments: [{ author: "Alice", text: "Integration comment" }],
      }),
      makeSlide([
        { type: "View", style: { width: 100, height: 100 } },
      ], {
        masterName: "Master2",
      }),
    ], {
      masters: [
        { name: "Master1", layouts: [{ name: "L1" }] },
        { name: "Master2", layouts: [{ name: "L2" }] },
      ],
    });

    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify no rId collision in presentation rels
    const presRels = await getZipEntry(buffer, "ppt/_rels/presentation.xml.rels");
    const presRIdMatches = presRels.match(/Id="(rId\d+)"/g) ?? [];
    const presRIds = presRIdMatches.map(m => m.match(/rId\d+/)![0]);
    expect(new Set(presRIds).size).toBe(presRIds.length);

    // Verify no rId collision in slide 1 rels
    const slide1Rels = await getZipEntry(buffer, "ppt/slides/_rels/slide1.xml.rels");
    const slide1RIdMatches = slide1Rels.match(/Id="(rId\d+)"/g) ?? [];
    const slide1RIds = slide1RIdMatches.map(m => m.match(/rId\d+/)![0]);
    expect(new Set(slide1RIds).size).toBe(slide1RIds.length);

    // Verify all key files exist
    expect(await zipHasFile(buffer, "ppt/comments/comment1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/commentAuthors.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/fonts/font1.fntdata")).toBe(false);
    expect(await zipHasFile(buffer, "ppt/slideMasters/slideMaster1.xml")).toBe(true);
    expect(await zipHasFile(buffer, "ppt/slideMasters/slideMaster2.xml")).toBe(true);
  });

  it("L56: 20-slide deck with multi-master, comments on every slide, notes → all expected files", async () => {
    const slides: PaperSlide[] = Array.from({ length: 20 }, (_, i) => makeSlide(
      [{ type: "View", style: { width: 100, height: 100 } }],
      {
        masterName: i % 2 === 0 ? "Even" : "Odd",
        comments: [{ author: `Author${i % 3}`, text: `Comment on slide ${i + 1}` }],
        notes: `Notes for slide ${i + 1}`,
      },
    ));

    const doc = makeDoc(slides, {
      masters: [
        { name: "Even", layouts: [{ name: "EvenLayout" }] },
        { name: "Odd", layouts: [{ name: "OddLayout" }] },
      ],
    });

    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);

    // Verify all 20 slides exist
    for (let i = 1; i <= 20; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }

    // Verify all 20 comment files exist
    for (let i = 1; i <= 20; i++) {
      expect(paths).toContain(`ppt/comments/comment${i}.xml`);
    }

    // Verify notes
    expect(paths).toContain("ppt/notesMasters/notesMaster1.xml");
    for (let i = 1; i <= 20; i++) {
      expect(paths).toContain(`ppt/notesSlides/notesSlide${i}.xml`);
    }

    // Verify both masters
    expect(paths).toContain("ppt/slideMasters/slideMaster1.xml");
    expect(paths).toContain("ppt/slideMasters/slideMaster2.xml");
  });

  it("L57: All 15 animation effects + easing + motion path on single slide → timing XML integrity", async () => {
    const effects: Array<{ effect: AnimationEffect; type: "entrance" | "emphasis"; easing?: "easeIn" | "easeOut" | "easeInOut" }> = [
      { effect: "appear", type: "entrance" },
      { effect: "fade", type: "entrance", easing: "easeIn" },
      { effect: "fly", type: "entrance", easing: "easeOut" },
      { effect: "zoom", type: "entrance", easing: "easeInOut" },
      { effect: "spin", type: "emphasis" },
      { effect: "bounce", type: "entrance" },
      { effect: "float", type: "entrance" },
      { effect: "grow", type: "emphasis" },
      { effect: "shrink", type: "emphasis" },
      { effect: "pulse", type: "emphasis" },
      { effect: "teeter", type: "emphasis" },
      { effect: "wipe", type: "entrance" },
      { effect: "split", type: "entrance" },
      { effect: "dissolve", type: "entrance" },
      { effect: "swivel", type: "entrance" },
    ];

    const children: PaperNode[] = effects.map((e, i) => ({
      type: "View" as const,
      style: { width: 40, height: 40 },
      shapeType: "rect" as const,
      animations: [{
        type: e.type,
        effect: e.effect,
        trigger: "onClick" as const,
        easing: e.easing,
      }],
    }));

    // Add one more shape with motion path
    children.push({
      type: "View",
      style: { width: 40, height: 40 },
      shapeType: "rect",
      animations: [{
        type: "entrance",
        effect: "motionPath",
        trigger: "onClick",
        motionPath: { path: "M 0 0 L 0.5 0.5 L 1 0" },
      }],
    });

    const doc = makeDoc([makeSlide(children)]);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    // Verify timing XML exists
    const timings = findAllElements(tree, "p:timing");
    expect(timings.length).toBe(1);

    // Verify we have the timing root
    const tnLst = findAllElements(tree, "p:tnLst");
    expect(tnLst.length).toBe(1);

    // Verify motion path is present
    const motions = findAllElements(tree, "p:animMotion");
    expect(motions.length).toBe(1);

    // Verify easing attributes exist somewhere in the tree
    const cTns = findAllElements(tree, "p:cTn");
    const withAccel = cTns.filter(c => getAttr(c, "accel"));
    const withDecel = cTns.filter(c => getAttr(c, "decel"));
    expect(withAccel.length).toBeGreaterThanOrEqual(2); // easeIn + easeInOut
    expect(withDecel.length).toBeGreaterThanOrEqual(2); // easeOut + easeInOut

    // Verify the total number of animated shapes (16 shapes = 15 effects + 1 motion)
    const spTgts = findAllElements(tree, "p:spTgt");
    expect(spTgts.length).toBeGreaterThanOrEqual(16);
  });
});
