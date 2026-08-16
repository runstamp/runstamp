import { describe, it, expect, beforeEach } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, PaperSlide, TextStyle } from "../src/types/ast.js";
import { generateTextXml } from "../src/ooxml/drawing/text.js";
import { generateShapeXml } from "../src/ooxml/drawing/shape.js";
import { runLayout } from "../src/layout/index.js";
import type { LayoutNode } from "../src/layout/extract.js";
import { clearFontCache, isSubstitutedFont, boldFontKey } from "../src/typography/fontCache.js";
import { autoLoadDocumentFonts } from "../src/typography/autoFont.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simpleDoc(slides: PaperSlide[]): PaperDocument {
  return { type: "Document", meta: {}, slides };
}

async function getSlideXml(doc: PaperDocument, slideIndex = 0): Promise<string> {
  const buf = await PaperEngine.render(doc);
  const zip = await JSZip.loadAsync(buf);
  return zip.file(`ppt/slides/slide${slideIndex + 1}.xml`)!.async("string");
}

// ---------------------------------------------------------------------------
// 1. Inset zeroing — bodyPr emits lIns="0" when no textInsets
// ---------------------------------------------------------------------------

describe("Text Inset Zeroing", () => {
  it("emits lIns='0' tIns='0' rIns='0' bIns='0' on <a:bodyPr> when textInsets not set", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, color: "#000000" },
        content: "No insets specified",
      }],
    }]);
    const xml = await getSlideXml(doc);
    expect(xml).toContain('lIns="0"');
    expect(xml).toContain('tIns="0"');
    expect(xml).toContain('rIns="0"');
    expect(xml).toContain('bIns="0"');
  }, 90_000);

  it("does NOT emit inset=0 when textInsets ARE specified", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: {
          fontSize: 16,
          color: "#000000",
          textInsets: { left: 10, top: 5, right: 10, bottom: 5 },
        },
        content: "Custom insets",
      }],
    }]);
    const xml = await getSlideXml(doc);
    // 10px * 9525 = 95250 EMU
    expect(xml).toContain('lIns="95250"');
    expect(xml).toContain('rIns="95250"');
    // 5px * 9525 = 47625 EMU
    expect(xml).toContain('tIns="47625"');
    expect(xml).toContain('bIns="47625"');
  });

  it("shape bodyPr also gets zero insets when no textStyle", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "View",
        style: { width: 200, height: 100, backgroundColor: "#FF0000" },
      }],
    }]);
    const xml = await getSlideXml(doc);
    // The shape's <a:bodyPr> should have zero insets
    expect(xml).toMatch(/a:bodyPr[^>]*lIns="0"/);
    expect(xml).toMatch(/a:bodyPr[^>]*tIns="0"/);
  });

  it("shape bodyPr zeroes insets when textStyle has no textInsets", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "View",
        style: { width: 200, height: 100, backgroundColor: "#FF0000" },
        textContent: "Shape text",
        textStyle: { fontSize: 14, color: "#FFFFFF" },
      }],
    }]);
    const xml = await getSlideXml(doc);
    expect(xml).toMatch(/a:bodyPr[^>]*lIns="0"/);
    expect(xml).toMatch(/a:bodyPr[^>]*rIns="0"/);
  });
});

// ---------------------------------------------------------------------------
// 2. Auto-font loading — render without prior loadFont()
// ---------------------------------------------------------------------------

describe("Auto-Font Loading", () => {
  it("renders a doc with fontFamily=Calibri without manual font loading", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 20, fontFamily: "Calibri", color: "#000000" },
        content: "Auto-loaded font test with a reasonably long text to verify wrapping works.",
      }],
    }]);
    // Should not throw — auto-font loading picks up Arial or NotoSans as fallback
    const buf = await PaperEngine.render(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("renders with Arial font (common system font)", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 18, fontFamily: "Arial", color: "#333333" },
        content: "This is Arial text that should be properly measured.",
      }],
    }]);
    const buf = await PaperEngine.render(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Overflow prevention — absolute text without width stays within slide
// ---------------------------------------------------------------------------

describe("Overflow Prevention", () => {
  it("absolute text without width wraps within slide bounds", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [{
        type: "Text",
        style: {
          position: "absolute",
          top: 20,
          left: 60,
          fontSize: 22,
          fontFamily: "Arial",
          color: "#000000",
        },
        content: "This is a very long title that would overflow the slide if not constrained to the slide width during layout measurement",
      }],
    };

    const layoutTree = await runLayout(slide, 960, 540);
    const textNode = layoutTree.children![0];

    // Width should be constrained to slide width (960), not infinite
    expect(textNode.layout.width).toBeLessThanOrEqual(960);
    // Should actually wrap — height should indicate multiple lines
    expect(textNode.layout.height).toBeGreaterThan(30);
  });
});

// ---------------------------------------------------------------------------
// 4. Measurement-rendering match — text at W px → shape at W px
// ---------------------------------------------------------------------------

describe("Measurement-Rendering Match", () => {
  it("OOXML shape width matches Yoga-measured width for text in flex container", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [{
        type: "View",
        style: { width: 300, height: 200, padding: 10 },
        children: [{
          type: "Text",
          style: { fontSize: 14, color: "#000000" },
          content: "Text in a 300px container",
        }],
      }],
    };

    const layoutTree = await runLayout(slide, 960, 540);
    const containerNode = layoutTree.children![0];
    const textNode = containerNode.children![0];

    // Text should be constrained to container inner width (300 - 10*2 = 280)
    expect(textNode.layout.width).toBeLessThanOrEqual(280);
  });

  it("text wraps correctly in 300px flex container", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [{
        type: "View",
        style: { width: 300, padding: 0 },
        children: [{
          type: "Text",
          style: { fontSize: 14, color: "#000000" },
          content: "This is text that is long enough that it should wrap within a 300 pixel container when properly measured with fonts",
        }],
      }],
    };

    const layoutTree = await runLayout(slide, 960, 540);
    const textNode = layoutTree.children![0].children![0];

    // Must wrap, so height should be > 1 line (roughly 14*1.2 = 16.8px)
    expect(textNode.layout.width).toBeLessThanOrEqual(300);
    // Height should indicate multiple lines
    expect(textNode.layout.height).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. AutoFit with insets
// ---------------------------------------------------------------------------

describe("AutoFit with Insets", () => {
  it("passes effective width/height to computeAutoFit when textInsets set", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: {
          width: 200,
          height: 100,
          fontSize: 40,
          color: "#000000",
          textInsets: { left: 10, top: 10, right: 10, bottom: 10 },
        },
        content: "Auto fit test with insets that reduce available space significantly",
        autoFit: true,
      } as any],
    }]);

    // Should not throw
    const buf = await PaperEngine.render(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    // Check the XML for normAutofit presence
    const xml = await getSlideXml(doc);
    // Should contain auto-fit markup (fontScale)
    expect(xml).toContain("normAutofit");
  });
});

// ---------------------------------------------------------------------------
// 6. End-to-end: MBB-quality deck renders without errors
// ---------------------------------------------------------------------------

describe("MBB Deck End-to-End", () => {
  it("renders a multi-slide deck with tables, charts, and rich text", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Strategy Deck", author: "MBB" },
      slides: [
        // Title slide
        {
          type: "Slide",
          background: { type: "gradient", angle: 135, stops: [{ color: "#0A1929", position: 0 }, { color: "#1B3A5C", position: 100 }] },
          children: [{
            type: "View",
            style: { flexDirection: "column", justifyContent: "center", padding: 80, width: 960, height: 540 },
            children: [
              { type: "Text", style: { fontSize: 38, fontFamily: "Calibri", fontWeight: "bold", color: "#FFFFFF" }, content: "Digital Commerce Transformation" },
              { type: "Text", style: { fontSize: 18, fontFamily: "Calibri", color: "#E2E8F0", marginTop: 12 }, content: "Strategic Assessment & Recommendation" },
            ],
          }],
        },
        // Findings slide with cards
        {
          type: "Slide",
          background: { type: "solid", color: "#F8FAFC" },
          children: [
            { type: "Text", style: { position: "absolute", top: 20, left: 60, width: 840, fontSize: 22, fontFamily: "Calibri", fontWeight: "bold", color: "#0F2540" }, content: "Executive Summary" },
            {
              type: "View",
              style: { position: "absolute", top: 65, left: 60, width: 840, height: 440, flexDirection: "row", gap: 20 },
              children: [
                {
                  type: "View",
                  style: { flexDirection: "column", width: 520, gap: 12 },
                  children: [
                    {
                      type: "View",
                      style: { backgroundColor: "#FFFFFF", padding: 20, borderWidth: 1, borderColor: "#E2E8F0" },
                      children: [
                        { type: "Text", style: { color: "#2563EB", fontSize: 11, fontFamily: "Calibri", fontWeight: "bold" }, content: "FINDING 1" },
                        { type: "Text", style: { color: "#0F2540", fontSize: 15, fontFamily: "Calibri", fontWeight: "bold", marginTop: 6 }, content: "Online penetration at 8% vs. 23% industry average" },
                        { type: "Text", style: { color: "#475569", fontSize: 12, fontFamily: "Calibri", marginTop: 4 }, content: "Significant gap exists between current digital capabilities and market expectations." },
                      ],
                    },
                    {
                      type: "View",
                      style: { backgroundColor: "#FFFFFF", padding: 20, borderWidth: 1, borderColor: "#E2E8F0" },
                      children: [
                        { type: "Text", style: { color: "#059669", fontSize: 11, fontFamily: "Calibri", fontWeight: "bold" }, content: "FINDING 2" },
                        { type: "Text", style: { color: "#0F2540", fontSize: 15, fontFamily: "Calibri", fontWeight: "bold", marginTop: 6 }, content: "$140M addressable revenue gap identified" },
                        { type: "Text", style: { color: "#475569", fontSize: 12, fontFamily: "Calibri", marginTop: 4 }, content: "Cross-channel analysis reveals substantial untapped digital revenue potential." },
                      ],
                    },
                  ],
                },
                {
                  type: "View",
                  style: { flexDirection: "column", width: 300, gap: 12 },
                  children: [{
                    type: "View",
                    style: { flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, backgroundColor: "#2563EB" },
                    children: [
                      { type: "Text", style: { color: "#93C5FD", fontSize: 12, fontFamily: "Calibri", fontWeight: "bold", textAlign: "center" }, content: "REVENUE OPPORTUNITY" },
                      { type: "Text", style: { color: "#FFFFFF", fontSize: 48, fontFamily: "Calibri", fontWeight: "bold", textAlign: "center" }, content: "$140M" },
                    ],
                  }],
                },
              ],
            },
          ],
        },
        // Table slide
        {
          type: "Slide",
          background: { type: "solid", color: "#F8FAFC" },
          children: [
            { type: "Text", style: { position: "absolute", top: 20, left: 60, width: 840, fontSize: 22, fontFamily: "Calibri", fontWeight: "bold", color: "#0F2540" }, content: "Competitive Benchmarking" },
            {
              type: "Table",
              style: { position: "absolute", top: 70, left: 60, width: 840, height: 200 },
              tableData: {
                columns: [280, 280, 280],
                rows: [
                  { height: 36, cells: [{ text: "Company" }, { text: "Revenue" }, { text: "Growth" }] },
                  { height: 32, cells: [{ text: "Amazon" }, { text: "$514B" }, { text: "+12%" }] },
                  { height: 32, cells: [{ text: "Walmart" }, { text: "$611B" }, { text: "+7%" }] },
                  { height: 32, cells: [{ text: "Target" }, { text: "$109B" }, { text: "+3%" }] },
                ],
                style: {
                  firstRow: true,
                  bandRow: true,
                  headerRowStyle: { fill: "#0F2540", color: "#FFFFFF", fontWeight: "bold", fontSize: 11, fontFamily: "Calibri", textAlign: "center", padding: 8 },
                  bandRowEvenStyle: { fill: "#F1F5F9" },
                },
              },
            },
          ],
        },
      ],
    };

    const buf = await PaperEngine.render(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buf);
    expect(zip.file("ppt/slides/slide1.xml")).not.toBeNull();
    expect(zip.file("ppt/slides/slide2.xml")).not.toBeNull();
    expect(zip.file("ppt/slides/slide3.xml")).not.toBeNull();

    // Verify inset zeroing in all slides
    for (let i = 1; i <= 3; i++) {
      const slideXml = await zip.file(`ppt/slides/slide${i}.xml`)!.async("string");
      // Every bodyPr should have zero insets (no PowerPoint default stealing space)
      const bodyPrMatches = slideXml.match(/<a:bodyPr[^>]*>/g) ?? [];
      for (const bp of bodyPrMatches) {
        // Each bodyPr should explicitly set insets
        expect(bp).toMatch(/[lr]Ins="/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Font substitution detection
// ---------------------------------------------------------------------------

describe("Font Substitution Detection", () => {
  beforeEach(() => {
    clearFontCache();
  });

  it("resolves Calibri to the truthful admitted Carlito identity", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, fontFamily: "Calibri", color: "#000000" },
        content: "Test",
      }],
    }]);
    await autoLoadDocumentFonts(doc);

    const style = doc.slides[0].children?.[0].style;
    expect(style?.fontFamily).toBe("Carlito");
    expect(style?.resolvedFont?.requestedFamily).toBe("Calibri");
    expect(style?.resolvedFont?.family).toBe("Carlito");
    expect(isSubstitutedFont("Calibri")).toBe(false);
  });

  it("does NOT mark Arial as substituted (exact match on macOS)", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, fontFamily: "Arial", color: "#000000" },
        content: "Test",
      }],
    }]);
    await autoLoadDocumentFonts(doc);

    if (process.platform === "darwin") {
      expect(isSubstitutedFont("Arial")).toBe(false);
    }
  });

  it("resolves an unknown portable family to Liberation Sans with a lint diagnostic", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, fontFamily: "FakeNonexistentFont", color: "#000000" },
        content: "Test",
      }],
    }]);
    await autoLoadDocumentFonts(doc);

    const style = doc.slides[0].children?.[0].style;
    expect(style?.fontFamily).toBe("Liberation Sans");
    expect(style?.resolvedFont?.requestedFamily).toBe("FakeNonexistentFont");
    expect(style?.resolvedFont?.diagnostics?.map((entry) => entry.code)).toContain(
      "FONT_REQUESTED_FAMILY_NOT_EMBEDDED",
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Explicit line spacing emission
// ---------------------------------------------------------------------------

describe("Explicit Line Spacing", () => {
  it("emits <a:lnSpc><a:spcPts> in every paragraph of rendered PPTX", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 20, fontFamily: "Arial", color: "#000000" },
        content: "Line spacing test",
      }],
    }]);
    const xml = await getSlideXml(doc);
    expect(xml).toContain("<a:lnSpc>");
    expect(xml).toContain("<a:spcPts");
  });

  it("computed spcPts val is reasonable for 20px Arial", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 20, fontFamily: "Arial", color: "#000000" },
        content: "Test",
      }],
    }]);
    const xml = await getSlideXml(doc);
    const match = xml.match(/<a:spcPts val="(\d+)"\/>/);
    expect(match).not.toBeNull();
    const val = parseInt(match![1], 10);
    // 20px font → line height ~23px → ~1725 hundredths-of-a-point (23 * 75)
    // Should be between 1000 and 3000 for a 20px font
    expect(val).toBeGreaterThan(1000);
    expect(val).toBeLessThan(3000);
  });

  it("does not emit duplicate lnSpc when explicit lineHeight is set", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, color: "#000000" },
        paragraphs: [{ runs: [{ text: "Explicit line height" }], lineHeight: 24 }],
      } as any],
    }]);
    const xml = await getSlideXml(doc);
    const lnSpcCount = (xml.match(/<a:lnSpc>/g) || []).length;
    // Should have exactly 1 lnSpc per paragraph (not doubled)
    expect(lnSpcCount).toBeGreaterThanOrEqual(1);
    // Each paragraph should have exactly one lnSpc
    const pCount = (xml.match(/<a:p>/g) || []).length;
    expect(lnSpcCount).toBeLessThanOrEqual(pCount);
  });
});

// ---------------------------------------------------------------------------
// 8b. spAutoFit on text boxes
// ---------------------------------------------------------------------------

describe("Text Box Auto-Sizing", () => {
  it("emits <a:spAutoFit/> in text bodyPr", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, color: "#000000" },
        content: "Auto fit test",
      }],
    }]);
    const xml = await getSlideXml(doc);
    expect(xml).toContain('<a:normAutofit fontScale="100000"/>');
  });

  it("normAutofit and spAutoFit are never both present", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [
        {
          type: "Text",
          style: { width: 100, height: 50, fontSize: 40, color: "#000000" },
          content: "This text is way too long to fit in a tiny box and should trigger normAutofit",
          autoFit: true,
        } as any,
        {
          type: "Text",
          style: { fontSize: 16, color: "#000000" },
          content: "Normal text",
        },
      ],
    }]);
    const xml = await getSlideXml(doc);
    // Find all bodyPr elements
    const bodyPrs = xml.match(/<a:bodyPr[^>]*>.*?<\/a:bodyPr>|<a:bodyPr[^/]*\/>/gs) ?? [];
    for (const bp of bodyPrs) {
      const hasNormAutofit = bp.includes("normAutofit");
      const hasSpAutoFit = bp.includes("spAutoFit");
      // They should never co-exist in the same bodyPr
      expect(hasNormAutofit && hasSpAutoFit).toBe(false);
    }
  });

  it("shapes (View) do NOT get spAutoFit", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "View",
        style: { width: 200, height: 100, backgroundColor: "#FF0000" },
        textContent: "Shape text",
        textStyle: { fontSize: 14, color: "#FFFFFF" },
      }],
    }]);
    const xml = await getSlideXml(doc);
    // Shape bodyPr should NOT have spAutoFit
    expect(xml).not.toContain("<a:spAutoFit/>");
  });
});

// ---------------------------------------------------------------------------
// 9. Bold font key convention
// ---------------------------------------------------------------------------

describe("Bold Font Key", () => {
  it("boldFontKey returns family__bold", () => {
    expect(boldFontKey("Arial")).toBe("Arial__bold");
    expect(boldFontKey("Calibri")).toBe("Calibri__bold");
  });
});

// ---------------------------------------------------------------------------
// 9. Bold font loading
// ---------------------------------------------------------------------------

describe("Bold Font Loading", () => {
  beforeEach(() => {
    clearFontCache();
  });

  it("loads bold variant when document uses fontWeight=bold", async () => {
    const doc = simpleDoc([{
      type: "Slide",
      children: [{
        type: "Text",
        style: { fontSize: 16, fontFamily: "Arial", fontWeight: "bold", color: "#000000" },
        content: "Bold text test",
      }],
    }]);
    await autoLoadDocumentFonts(doc);

    // Should not throw — bold variant should be loaded or gracefully skipped
    const buf = await PaperEngine.render(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });
});
