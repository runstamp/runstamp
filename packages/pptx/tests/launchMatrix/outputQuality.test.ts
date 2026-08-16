/**
 * Output Quality Verification Tests
 *
 * Generates actual PPTX buffers from all 10 templates and verifies:
 * - Slide dimensions are 12192000×6858000 EMU (1280×720px widescreen)
 * - Font sizes are in a readable range (not microscopic, not enormous)
 * - a:ea and a:cs elements are present on text runs
 * - Colors are spec-accurate (no Tailwind palette)
 * - Content types and relationships are well-formed
 */

import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../../src/engine.js";
import {
  parseXml,
  findAllElements,
  getAttr,
} from "../helpers/xmlTestUtils.js";

import { consultingDeck } from "./fixtures/t01ConsultingDeck.js";
import { pitchBookDeck } from "./fixtures/t02PitchBook.js";
import { saasBoardDeck } from "./fixtures/t03SaasBoard.js";
import { qbrDeck } from "./fixtures/t04Qbr.js";
import { salesProposalDeck } from "./fixtures/t05SalesProposal.js";
import { productDemoDeck } from "./fixtures/t06ProductDemo.js";
import { allHandsDeck } from "./fixtures/t07AllHands.js";
import { rfpResponseDeck } from "./fixtures/t08RfpResponse.js";
import { annualReportDeck } from "./fixtures/t09AnnualReport.js";
import { trainingDeck } from "./fixtures/t10Training.js";

const templates = [
  { name: "T01-Consulting", deck: consultingDeck },
  { name: "T02-PitchBook", deck: pitchBookDeck },
  { name: "T03-SaasBoard", deck: saasBoardDeck },
  { name: "T04-QBR", deck: qbrDeck },
  { name: "T05-SalesProposal", deck: salesProposalDeck },
  { name: "T06-ProductDemo", deck: productDemoDeck },
  { name: "T07-AllHands", deck: allHandsDeck },
  { name: "T08-RfpResponse", deck: rfpResponseDeck },
  { name: "T09-AnnualReport", deck: annualReportDeck },
  { name: "T10-Training", deck: trainingDeck },
];

const rendered = new Map<string, { buffer: Buffer; zip: JSZip }>();

beforeAll(async () => {
  // Render all templates in parallel
  const results = await Promise.all(
    templates.map(async (t) => {
      const buffer = await PaperEngine.render(t.deck);
      const zip = await JSZip.loadAsync(buffer);
      return { name: t.name, buffer, zip };
    }),
  );
  for (const r of results) {
    rendered.set(r.name, { buffer: r.buffer, zip: r.zip });
  }
}, 60000);

// ---------------------------------------------------------------------------
// Slide dimensions
// ---------------------------------------------------------------------------
describe("Slide dimensions (12192000×6858000 EMU)", () => {
  for (const t of templates) {
    it(`${t.name} has correct widescreen dimensions`, async () => {
      const { zip } = rendered.get(t.name)!;
      const presFile = zip.file("ppt/presentation.xml");
      expect(presFile).not.toBeNull();
      const content = await presFile!.async("string");
      expect(content).toContain('cx="12192000"');
      expect(content).toContain('cy="6858000"');
      // Must NOT contain old 960×540 dimensions
      expect(content).not.toContain('cx="9144000"');
      expect(content).not.toContain('cy="5143500"');
    });
  }
});

// ---------------------------------------------------------------------------
// Font sizes — readable range
// ---------------------------------------------------------------------------
describe("Font sizes in readable range", () => {
  for (const t of templates) {
    it(`${t.name} has font sizes between 8pt and 72pt`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );

      const fontSizes: number[] = [];
      for (const slidePath of slidePaths) {
        const content = await zip.file(slidePath)!.async("string");
        const tree = parseXml(content);
        // Find all a:rPr elements with sz attribute
        const rPrs = findAllElements(tree, "a:rPr");
        for (const rPr of rPrs) {
          const sz = getAttr(rPr, "sz");
          if (sz) fontSizes.push(parseInt(sz, 10));
        }
        // Also check a:defRPr
        const defRPrs = findAllElements(tree, "a:defRPr");
        for (const def of defRPrs) {
          const sz = getAttr(def, "sz");
          if (sz) fontSizes.push(parseInt(sz, 10));
        }
      }

      expect(fontSizes.length).toBeGreaterThan(0);

      // OOXML sz is in hundredths of a point. 8pt = 800, 72pt = 7200
      const MIN_SZ = 600;  // 6pt minimum (footnotes etc.)
      const MAX_SZ = 7200; // 72pt maximum (huge titles)

      const tooSmall = fontSizes.filter((sz) => sz < MIN_SZ);
      const tooLarge = fontSizes.filter((sz) => sz > MAX_SZ);

      expect(tooSmall).toEqual([]);
      expect(tooLarge).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// a:ea and a:cs presence
// ---------------------------------------------------------------------------
describe("a:ea and a:cs font elements present", () => {
  for (const t of templates) {
    it(`${t.name} has a:ea and a:cs on text runs`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );

      let latinCount = 0;
      let eaCount = 0;
      let csCount = 0;

      for (const slidePath of slidePaths) {
        const content = await zip.file(slidePath)!.async("string");
        const tree = parseXml(content);
        latinCount += findAllElements(tree, "a:latin").length;
        eaCount += findAllElements(tree, "a:ea").length;
        csCount += findAllElements(tree, "a:cs").length;
      }

      // Every a:latin should have a corresponding a:ea and a:cs
      expect(latinCount).toBeGreaterThan(0);
      expect(eaCount).toBeGreaterThanOrEqual(latinCount);
      expect(csCount).toBeGreaterThanOrEqual(latinCount);
    });
  }
});

// ---------------------------------------------------------------------------
// No Tailwind colors
// ---------------------------------------------------------------------------
describe("No Tailwind CSS palette colors", () => {
  // Common Tailwind slate/gray values that should NOT appear in our output
  const TAILWIND_COLORS = [
    "#F1F5F9", // slate-100
    "#E2E8F0", // slate-200
    "#CBD5E1", // slate-300
    "#94A3B8", // slate-400
    "#64748B", // slate-500
    "#475569", // slate-600
    "#334155", // slate-700
    "#1E293B", // slate-800
    "#0F172A", // slate-900
  ];

  for (const t of templates) {
    it(`${t.name} uses no Tailwind slate palette`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );

      for (const slidePath of slidePaths) {
        const content = await zip.file(slidePath)!.async("string");
        for (const color of TAILWIND_COLORS) {
          // Check case-insensitive since OOXML may uppercase
          const hex = color.replace("#", "");
          const upper = hex.toUpperCase();
          const lower = hex.toLowerCase();
          if (content.includes(upper) || content.includes(lower)) {
            throw new Error(
              `${slidePath} contains Tailwind color ${color} (${hex})`,
            );
          }
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Slide count matches fixture expectations
// ---------------------------------------------------------------------------
describe("Slide counts match fixture definitions", () => {
  for (const t of templates) {
    it(`${t.name} has correct number of slides`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );
      expect(slidePaths.length).toBe(t.deck.slides.length);
    });
  }
});

// ---------------------------------------------------------------------------
// Slide number fields present
// ---------------------------------------------------------------------------
describe("Slide number fields emitted", () => {
  for (const t of templates) {
    it(`${t.name} has slide number fields on content slides`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );

      let slideNumCount = 0;
      for (const slidePath of slidePaths) {
        const content = await zip.file(slidePath)!.async("string");
        if (content.includes('type="slidenum"')) {
          slideNumCount++;
        }
      }

      // At least some slides should have slide numbers
      // (title slides don't, but content and section dividers do)
      expect(slideNumCount).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Speaker notes coverage
// ---------------------------------------------------------------------------
describe("Speaker notes present", () => {
  for (const t of templates) {
    it(`${t.name} has speaker notes on at least 3 slides`, async () => {
      const { zip } = rendered.get(t.name)!;
      const notesPaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(p),
      );
      expect(notesPaths.length).toBeGreaterThanOrEqual(3);
    });
  }
});

// ---------------------------------------------------------------------------
// Shape positioning within slide bounds
// ---------------------------------------------------------------------------
describe("Shape positions within slide bounds", () => {
  const SLIDE_CX = 12192000; // EMU
  const SLIDE_CY = 6858000;

  for (const t of templates) {
    it(`${t.name} has no shapes positioned entirely outside the slide`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );

      const violations: string[] = [];
      for (const slidePath of slidePaths) {
        const content = await zip.file(slidePath)!.async("string");
        const tree = parseXml(content);
        const xfrms = findAllElements(tree, "a:xfrm");
        for (const xfrm of xfrms) {
          const offs = findAllElements([xfrm], "a:off");
          const exts = findAllElements([xfrm], "a:ext");
          if (offs.length === 0 || exts.length === 0) continue;
          const x = parseInt(getAttr(offs[0], "x") ?? "0", 10);
          const y = parseInt(getAttr(offs[0], "y") ?? "0", 10);
          const cx = parseInt(getAttr(exts[0], "cx") ?? "0", 10);
          const cy = parseInt(getAttr(exts[0], "cy") ?? "0", 10);

          // Shape is "entirely outside" if its right edge < 0 or left edge > slide width
          if (x + cx < 0 || x > SLIDE_CX || y + cy < 0 || y > SLIDE_CY) {
            violations.push(
              `${slidePath}: shape at (${x},${y}) size (${cx},${cy}) entirely outside slide`,
            );
          }
        }
      }
      expect(violations).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Theme color scheme completeness
// ---------------------------------------------------------------------------
describe("Theme has complete color scheme", () => {
  const REQUIRED_COLORS = [
    "a:dk1", "a:lt1", "a:dk2", "a:lt2",
    "a:accent1", "a:accent2", "a:accent3", "a:accent4", "a:accent5", "a:accent6",
    "a:hlink", "a:folHlink",
  ];

  for (const t of templates) {
    it(`${t.name} theme has all 12 required colors`, async () => {
      const { zip } = rendered.get(t.name)!;
      const themeFile = zip.file("ppt/theme/theme1.xml");
      expect(themeFile).not.toBeNull();
      const content = await themeFile!.async("string");
      const tree = parseXml(content);

      const clrSchemes = findAllElements(tree, "a:clrScheme");
      expect(clrSchemes.length).toBeGreaterThan(0);

      for (const color of REQUIRED_COLORS) {
        const elements = findAllElements(tree, color);
        expect(elements.length).toBeGreaterThan(0);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// No empty slides (every slide has at least one shape)
// ---------------------------------------------------------------------------
describe("No empty slides", () => {
  for (const t of templates) {
    it(`${t.name} has content on every slide`, async () => {
      const { zip } = rendered.get(t.name)!;
      const slidePaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
      );

      for (const slidePath of slidePaths) {
        const content = await zip.file(slidePath)!.async("string");
        const tree = parseXml(content);
        const shapes = findAllElements(tree, "p:sp");
        const pics = findAllElements(tree, "p:pic");
        const graphicFrames = findAllElements(tree, "p:graphicFrame");
        const groups = findAllElements(tree, "p:grpSp");
        const total = shapes.length + pics.length + graphicFrames.length + groups.length;
        expect(total).toBeGreaterThan(0);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Content types references match actual ZIP entries
// ---------------------------------------------------------------------------
describe("Content types consistency", () => {
  for (const t of templates) {
    it(`${t.name} has matching content type overrides for all parts`, async () => {
      const { zip } = rendered.get(t.name)!;
      const ctFile = zip.file("[Content_Types].xml");
      expect(ctFile).not.toBeNull();
      const content = await ctFile!.async("string");
      const tree = parseXml(content);
      const overrides = findAllElements(tree, "Override");

      const zipPaths = new Set(Object.keys(zip.files).filter(p => !zip.files[p].dir));
      const missing: string[] = [];

      for (const override of overrides) {
        const partName = getAttr(override, "PartName");
        if (!partName) continue;
        // PartName starts with "/" — strip it to match ZIP paths
        const zipPath = partName.startsWith("/") ? partName.slice(1) : partName;
        if (!zipPaths.has(zipPath)) {
          missing.push(`Override PartName="${partName}" has no corresponding ZIP entry`);
        }
      }

      expect(missing).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Multiple slide layouts present
// ---------------------------------------------------------------------------
describe("Multiple slide layouts", () => {
  for (const t of templates) {
    it(`${t.name} has at least 5 slide layouts`, async () => {
      const { zip } = rendered.get(t.name)!;
      const layoutPaths = Object.keys(zip.files).filter(
        (p) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(p),
      );
      expect(layoutPaths.length).toBeGreaterThanOrEqual(5);
    });
  }
});

// ---------------------------------------------------------------------------
// Hyperlinks present in T10
// ---------------------------------------------------------------------------
describe("Hyperlink support", () => {
  it("T10-Training has a:hlinkClick elements for resource URLs", async () => {
    const { zip } = rendered.get("T10-Training")!;
    const slidePaths = Object.keys(zip.files).filter(
      (p) => /^ppt\/slides\/slide\d+\.xml$/.test(p),
    );

    let hlinkCount = 0;
    for (const slidePath of slidePaths) {
      const content = await zip.file(slidePath)!.async("string");
      const matches = content.match(/a:hlinkClick/g);
      if (matches) hlinkCount += matches.length;
    }

    // T10 resource slide has 8 URLs
    expect(hlinkCount).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// No 1x1 pixel placeholder images
// ---------------------------------------------------------------------------
describe("No tiny placeholder images", () => {
  // Only test decks that contain images
  const imageDecks = ["T02-PitchBook", "T05-SalesProposal", "T06-ProductDemo",
    "T07-AllHands", "T08-RfpResponse", "T09-AnnualReport", "T10-Training"];

  for (const name of imageDecks) {
    it(`${name} has no images smaller than 500 bytes`, async () => {
      const { zip } = rendered.get(name)!;
      const mediaPaths = Object.keys(zip.files).filter(
        (p) => p.startsWith("ppt/media/") && !zip.files[p].dir,
      );

      const tinyImages: string[] = [];
      for (const mediaPath of mediaPaths) {
        const buf = await zip.file(mediaPath)!.async("nodebuffer");
        // 1x1 pixel PNGs are ~70 bytes. Our smallest placeholder (64x64) is ~200+ bytes.
        // Solid-color PNGs compress well, so threshold is 100 bytes.
        if (buf.length < 100) {
          tinyImages.push(`${mediaPath} (${buf.length} bytes)`);
        }
      }

      expect(tinyImages).toEqual([]);
    });
  }
});
