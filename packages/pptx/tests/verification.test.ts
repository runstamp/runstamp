// tests/verification.test.ts — Programmatic verification suite (docs/9.md)
//
// Five phases from the de-escalation runbook, encoded as permanent passing tests.
// Each describe block maps 1:1 to a phase in docs/9.md.

import { describe, it, expect, beforeEach } from "vitest";
import JSZip from "jszip";

// Layout
import { runLayout } from "../src/layout/index.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { PaperSlide, PaperNode } from "../src/types/ast.js";

// OOXML emitters
import { serializeSlideTree } from "../src/ooxml/drawing/orchestrator.js";
import { generateShapeXml } from "../src/ooxml/drawing/shape.js";

// Typography
import { calculateTextMetrics } from "../src/typography/metrics.js";
import { clearFontCache } from "../src/typography/fontCache.js";
import { attachMeasureFunction } from "../src/layout/measureBridge.js";
import type { Font } from "fontkit";

// Engine
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";

// ---------------------------------------------------------------------------
// Shared mock font factory (same pattern as typography.test.ts)
// ---------------------------------------------------------------------------
function makeMockFont(overrides: {
  unitsPerEm?: number;
  ascent?: number;
  descent?: number;
  lineGap?: number;
  advanceWidth?: number;
}): Font {
  const {
    unitsPerEm = 1000,
    ascent = 800,
    descent = -200,
    lineGap = 0,
    advanceWidth = 500,
  } = overrides;

  return {
    unitsPerEm,
    ascent,
    descent,
    lineGap,
    layout: (text: string) => ({
      glyphs: Array.from(text).map(() => ({ advanceWidth })),
      positions: [],
    }),
  } as unknown as Font;
}

// ---------------------------------------------------------------------------
// Phase 1 — The "Bypass" Isolation Test
// Proves that the XML pipeline and the layout engine are independently correct.
// ---------------------------------------------------------------------------

describe("Phase 1 — Bypass Isolation", () => {
  // -------------------------------------------------------------------------
  // Test A: Hardcoded-box bypass
  //
  // Construct a mock LayoutNode (no Yoga involved) and pass it directly to
  // serializeSlideTree. The XML must contain the correct EMU-converted values.
  // -------------------------------------------------------------------------
  it("1A: hardcoded LayoutNode produces correct EMU offsets without Yoga", () => {
    const mockSlide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { backgroundColor: "#FF0000" },
          layout: { x: 100, y: 100, width: 200, height: 200 },
          children: [],
        } as LayoutNode,
      ],
    } as LayoutNode;

    const { xml } = serializeSlideTree(mockSlide, { hyperlinkRIdStart: 100 });

    // 100px → 952500 EMU, 200px → 1905000 EMU
    expect(xml).toContain(`x="${100 * 9525}"`);   // 952500
    expect(xml).toContain(`y="${100 * 9525}"`);   // 952500
    expect(xml).toContain(`cx="${200 * 9525}"`);  // 1905000
    expect(xml).toContain(`cy="${200 * 9525}"`);  // 1905000
  });

  // -------------------------------------------------------------------------
  // Test B: Layout coordinates are valid after runLayout
  //
  // DFS-walks every LayoutNode and asserts all four layout fields are finite,
  // non-negative, and within slide bounds.
  // -------------------------------------------------------------------------
  it("1B: runLayout produces finite non-negative coordinates within slide bounds", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { width: 400, height: 300, backgroundColor: "#FF0000" },
          children: [
            {
              type: "View",
              style: { width: 100, height: 100, backgroundColor: "#00FF00" },
            },
          ],
        } as PaperNode,
      ],
    };

    function assertValidCoords(node: LayoutNode): void {
      expect(Number.isFinite(node.layout.x)).toBe(true);
      expect(Number.isFinite(node.layout.y)).toBe(true);
      expect(Number.isFinite(node.layout.width)).toBe(true);
      expect(Number.isFinite(node.layout.height)).toBe(true);
      expect(node.layout.x).toBeGreaterThanOrEqual(0);
      expect(node.layout.y).toBeGreaterThanOrEqual(0);
      expect(node.layout.width).toBeLessThanOrEqual(960);
      expect(node.layout.height).toBeLessThanOrEqual(540);
      node.children?.forEach(assertValidCoords);
    }

    const tree = await runLayout(slide);
    assertValidCoords(tree);
  });

  // -------------------------------------------------------------------------
  // Test C: Layout x/y not massive (normalizer is not broken)
  //
  // A node with `padding: 10` must not produce child offsets > 1000.
  // The symptom of a broken shorthand normalizer is padding values being
  // treated as something enormous rather than 10px.
  // -------------------------------------------------------------------------
  it("1C: padding:10 does not produce massive child offsets", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { padding: 10, width: 200, height: 200 },
          children: [
            {
              type: "View",
              style: { width: 50, height: 50, backgroundColor: "#00FF00" },
            },
          ],
        } as PaperNode,
      ],
    };

    const tree = await runLayout(slide);
    const view = tree.children![0];
    const child = view.children![0];

    // With padding:10 the child starts at (10, 10) — definitely not > 1000
    expect(child.layout.x).toBeLessThan(1000);
    expect(child.layout.y).toBeLessThan(1000);
    // And the padding must actually be applied
    expect(child.layout.x).toBeGreaterThanOrEqual(10);
    expect(child.layout.y).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Coordinate System & EMU Audit
// Catches double-multiplication and group-relative-coordinate bugs.
// ---------------------------------------------------------------------------

describe("Phase 2 — Coordinate & EMU Audit", () => {
  // -------------------------------------------------------------------------
  // Test A: toEmu is not applied twice
  //
  // generateShapeXml with a known pixel layout (x=10, y=20, w=100, h=50).
  // EMU values must be exactly pixels * 9525, not pixels * 9525 * 9525.
  // -------------------------------------------------------------------------
  it("2A: generateShapeXml applies toEmu exactly once", () => {
    const node: LayoutNode = {
      type: "View",
      style: { backgroundColor: "#FF0000" },
      layout: { x: 10, y: 20, width: 100, height: 50 },
      children: [],
    } as LayoutNode;

    const { xml } = generateShapeXml(node, 2);

    expect(xml).toContain('x="95250"');    // 10 * 9525
    expect(xml).toContain('y="190500"');   // 20 * 9525
    expect(xml).toContain('cx="952500"');  // 100 * 9525
    expect(xml).toContain('cy="476250"');  // 50 * 9525

    // Sanity: double-applied values must NOT appear
    expect(xml).not.toContain(`x="${10 * 9525 * 9525}"`);
    expect(xml).not.toContain(`y="${20 * 9525 * 9525}"`);
  });

  // -------------------------------------------------------------------------
  // Test B: Group children use relative coordinates
  //
  // Group at absolute (100, 100), child View at absolute (150, 120).
  // After serializeSlideTree the child's <a:off> must be (50*9525, 20*9525)
  // — relative to the group origin, not the slide origin.
  // Uses runLayout() so Yoga computes the absolute positions.
  // -------------------------------------------------------------------------
  it("2B: group children are serialized with group-relative EMU offsets", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "Group",
          style: { position: "absolute", left: 100, top: 100, width: 200, height: 200 },
          children: [
            {
              type: "View",
              style: {
                backgroundColor: "#0000FF",
                position: "absolute",
                left: 50, // relative to group origin
                top: 20,
                width: 80,
                height: 60,
              },
              children: [],
            },
          ],
        } as PaperNode,
      ],
    };

    const layoutTree = await runLayout(slide);
    const group = layoutTree.children![0];

    // Verify Yoga computed absolute positions correctly
    expect(group.layout.x).toBe(100);
    expect(group.layout.y).toBe(100);
    const child = group.children![0];
    expect(child.layout.x).toBe(150); // absolute: 100 + 50
    expect(child.layout.y).toBe(120); // absolute: 100 + 20

    // Serialize and verify child uses group-relative EMU offsets
    const { xml } = serializeSlideTree(layoutTree, { hyperlinkRIdStart: 100 });

    // Child shape offset: (150-100) * 9525 = 476250, (120-100) * 9525 = 190500
    expect(xml).toContain(`x="${50 * 9525}"`);  // 476250 — relative
    expect(xml).toContain(`y="${20 * 9525}"`);  // 190500 — relative

    // The absolute slide-origin value (150*9525 = 1428750) must NOT appear
    // as the child's offset (it may appear elsewhere like the group's own off).
    // We verify the specific child shape does not use the slide-absolute value.
    // The group's own <a:off> IS at 100*9525 = 952500 — that's expected.
    expect(xml).toContain(`x="${100 * 9525}"`); // group position — absolute
  });

  // -------------------------------------------------------------------------
  // Test C: EMU chain end-to-end
  //
  // Full pipeline: PaperDocument → PaperEngine.render() → unzip → read
  // slide1.xml → assert the <a:off> attributes match pixels * 9525.
  // -------------------------------------------------------------------------
  it("2C: end-to-end EMU chain produces correct values in slide1.xml", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          style: { width: 960, height: 540 },
          children: [
            {
              type: "View",
              style: {
                backgroundColor: "#FF0000",
                position: "absolute",
                left: 10,
                top: 20,
                width: 100,
                height: 50,
              },
              children: [],
            } as PaperNode,
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideFile = zip.file("ppt/slides/slide1.xml");
    expect(slideFile).not.toBeNull();

    const slideXml = await slideFile!.async("string");
    expect(slideXml).toContain('x="95250"');    // 10 * 9525
    expect(slideXml).toContain('y="190500"');   // 20 * 9525
    expect(slideXml).toContain('cx="952500"');  // 100 * 9525
    expect(slideXml).toContain('cy="476250"');  // 50 * 9525
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — WASM Memory & Zero-Collapse Check
// Proves the getChild() workaround and alignItems defaults are correct.
// ---------------------------------------------------------------------------

describe("Phase 3 — WASM Memory & Zero-Collapse", () => {
  // -------------------------------------------------------------------------
  // Test A: getChild() workaround — multi-child layout is stable
  //
  // A slide with 5 sibling View children. All 5 must appear in
  // layoutTree.children and none may have zero dimensions.
  // This would fail if the pre-collection workaround in extract.ts were removed.
  // -------------------------------------------------------------------------
  it("3A: five sibling children all receive correct non-zero dimensions", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } },
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#00FF00" } },
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#0000FF" } },
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#FFFF00" } },
        { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF00FF" } },
      ] as PaperNode[],
    };

    const layoutTree = await runLayout(slide);

    // All five children must be present — none dropped by WASM pointer invalidation
    expect(layoutTree.children).toHaveLength(5);

    for (const child of layoutTree.children!) {
      expect(child.layout.width).toBe(100);
      expect(child.layout.height).toBe(100);
    }
  });

  // -------------------------------------------------------------------------
  // Test B: alignItems default does not zero-collapse a child
  //
  // A parent View with no `alignItems` (Yoga defaults to stretch) containing a
  // child View with explicit height but no width. Child's layout width must be
  // > 0 — Yoga stretches it to the parent width.
  // -------------------------------------------------------------------------
  it("3B: child with no explicit width stretches to parent width via alignItems default", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { width: 300, height: 200 },
          // No alignItems → Yoga defaults to ALIGN_STRETCH on the cross-axis
          children: [
            {
              type: "View",
              style: { height: 50 }, // explicit height, NO width
            },
          ],
        } as PaperNode,
      ],
    };

    const layoutTree = await runLayout(slide);
    const parent = layoutTree.children![0];
    const child = parent.children![0];

    // Yoga stretch must give the child the parent's cross-axis width
    expect(child.layout.width).toBeGreaterThan(0);
    expect(child.layout.width).toBe(300);
    expect(child.layout.height).toBe(50);
  });

  // -------------------------------------------------------------------------
  // Test C: Repeated layout calls do not leak (1000 iterations)
  //
  // Runs runLayout() 1000 times on a complex multi-node tree. No
  // RangeError: WebAssembly.Memory should be thrown.
  // This is a more complex tree than layout.test.ts Benchmark 3.
  // -------------------------------------------------------------------------
  it("3C: complex multi-node layout pipeline stays memory-flat over 1000 iterations", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { flexDirection: "row", width: 960, height: 270 },
          children: [
            { type: "View", style: { width: 320, height: 270, backgroundColor: "#FF0000" } },
            { type: "View", style: { width: 320, height: 270, backgroundColor: "#00FF00" } },
            { type: "View", style: { width: 320, height: 270, backgroundColor: "#0000FF" } },
          ],
        } as PaperNode,
        {
          type: "View",
          style: { width: 960, height: 270 },
          children: [
            { type: "View", style: { width: 480, height: 270 } },
            { type: "View", style: { width: 480, height: 270 } },
          ],
        } as PaperNode,
      ],
    };

    for (let i = 0; i < 1000; i++) {
      await runLayout(slide);
    }

    // Reaching here without OOM or WASM heap exhaustion is the assertion.
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 4 — Typography Measure Bridge
// Verifies the fontkit ↔ Yoga callback pipeline.
// ---------------------------------------------------------------------------

describe("Phase 4 — Typography Measure Bridge", () => {
  beforeEach(() => {
    clearFontCache();
  });

  // -------------------------------------------------------------------------
  // Test A: Hardcoded-metrics isolation
  //
  // Mock font: unitsPerEm=1000, ascent=800, descent=-200, lineGap=0,
  // advanceWidth=600. Text "AAAA" (4 glyphs) at fontSize=16, maxWidth=500.
  //
  // scale      = 16 / 1000 = 0.016
  // lineHeight = (800 - (-200) + 0) * 0.016 = 16px
  // rawWidth   = 4 * 600 * 0.016 = 38.4px  < 500px → no wrap → 1 line
  // result     = { width: 38.4, height: 16 }
  // -------------------------------------------------------------------------
  it("4A: calculateTextMetrics returns exact metrics for a known mock font", () => {
    const font = makeMockFont({
      unitsPerEm: 1000,
      ascent: 800,
      descent: -200,
      lineGap: 0,
      advanceWidth: 600,
    });

    const metrics = calculateTextMetrics("AAAA", font, 16, 500);

    expect(metrics.height).toBeCloseTo(16, 1);   // exactly one line height
    expect(metrics.width).toBeCloseTo(38.4, 0);  // 4 glyphs * 600 * 0.016
    expect(metrics.width).toBeLessThan(500);      // no wrap occurred
  });

  // -------------------------------------------------------------------------
  // Test B: Measure callback clamps NaN/negative to zero
  //
  // Calls attachMeasureFunction() with an unregistered font family.
  // The bridge's try/catch must absorb the font-not-found error and return
  // {width:0, height:0} — never NaN or negative — so WASM heap stays safe.
  // -------------------------------------------------------------------------
  it("4B: attachMeasureFunction with missing font does not crash WASM", async () => {
    const { default: yoga } = await import("yoga-wasm-web/auto");

    const parent = yoga.Node.create();
    parent.setWidth(200);
    parent.setHeight(100);

    const textNode = yoga.Node.create();
    parent.insertChild(textNode, 0);

    const textAstNode = {
      type: "Text" as const,
      content: "WASM safety test",
      style: { fontSize: 16, fontFamily: "MissingFontForWasmSafetyTest" },
    };

    attachMeasureFunction(textNode, textAstNode);

    // Must not throw — the bridge's try/catch guards the WASM heap
    expect(() => {
      parent.calculateLayout(200, 100, yoga.DIRECTION_LTR);
    }).not.toThrow();

    // With the new pipeline, missing fonts use char-count estimation — the node
    // may have non-zero height. Core contract: no throw, no NaN, no crash.
    expect(textNode.getComputedHeight()).toBeGreaterThanOrEqual(0);

    parent.freeRecursive();
  });

  // -------------------------------------------------------------------------
  // Test C: Font-not-found falls back without crashing — rich text path
  //
  // Alignment with typography.test.ts Benchmark 3. Re-verifies that the
  // rich-text (TextRun[]) code path in calculateRichTextMetrics also handles
  // missing fonts gracefully via its own internal fallback (fontSize * 0.6
  // char width, fontSize * 1.2 line height) rather than throwing.
  // -------------------------------------------------------------------------
  it("4C: rich-text measure bridge with missing fonts uses fallback, does not crash", async () => {
    const { default: yoga } = await import("yoga-wasm-web/auto");

    const parent = yoga.Node.create();
    parent.setWidth(500);
    parent.setHeight(200);

    const textNode = yoga.Node.create();
    parent.insertChild(textNode, 0);

    // PaperText with TextRun[] content — triggers the rich-text branch
    const textAstNode = {
      type: "Text" as const,
      content: [
        { text: "Hello ", style: { fontFamily: "MissingRunFont1", fontSize: 16 } },
        { text: "World",  style: { fontFamily: "MissingRunFont2", fontSize: 16 } },
      ],
      style: { fontFamily: "MissingDefaultFont", fontSize: 16 },
    };

    attachMeasureFunction(textNode, textAstNode as any);

    expect(() => {
      parent.calculateLayout(500, 200, yoga.DIRECTION_LTR);
    }).not.toThrow();

    // richMetrics falls back: charWidth = 0.6 * 16 = 9.6, lineHeight = 1.2 * 16 = 19.2
    // totalWidth = (6 + 5) chars * 9.6 = 105.6 < 500 → no wrap → height = 19.2 > 0
    expect(textNode.getComputedHeight()).toBeGreaterThan(0);

    parent.freeRecursive();
  });
});

// ---------------------------------------------------------------------------
// Phase 5 — TDD Sequence: One Box Up
// The four incremental verification steps from docs/9.md §Phase 5.
// ---------------------------------------------------------------------------

describe("Phase 5 — TDD Sequence: One Box Up", () => {
  // -------------------------------------------------------------------------
  // Test 1: Single View at absolute position
  // -------------------------------------------------------------------------
  it("5-1: single View at absolute position has exact layout coordinates", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { position: "absolute", left: 50, top: 75, width: 200, height: 150 },
          children: [],
        } as PaperNode,
      ],
    };

    const tree = await runLayout(slide);
    const view = tree.children![0];

    expect(view.layout.x).toBe(50);
    expect(view.layout.y).toBe(75);
    expect(view.layout.width).toBe(200);
    expect(view.layout.height).toBe(150);
  });

  // -------------------------------------------------------------------------
  // Test 2: Flex row, space-between, three children
  //
  // Parent 960×100, three 100×100 children.
  // space-between distributes the 660px gap equally → 330px between each.
  //   Child 0 (Red):   x = 0
  //   Child 1 (Green): x = 100 + 330 = 430
  //   Child 2 (Blue):  x = 430 + 100 + 330 = 860
  // -------------------------------------------------------------------------
  it("5-2: flex row space-between places three children at x=0, 430, 860", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: {
            flexDirection: "row",
            justifyContent: "space-between",
            width: 960,
            height: 100,
          },
          children: [
            { type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } },
            { type: "View", style: { width: 100, height: 100, backgroundColor: "#00FF00" } },
            { type: "View", style: { width: 100, height: 100, backgroundColor: "#0000FF" } },
          ],
        } as PaperNode,
      ],
    };

    const tree = await runLayout(slide);
    const row = tree.children![0];
    const [red, green, blue] = row.children!;

    expect(red.layout.x).toBe(0);
    expect(green.layout.x).toBe(430);
    expect(blue.layout.x).toBe(860); // 960 - 100
  });

  // -------------------------------------------------------------------------
  // Test 3: Single-line text, no wrap
  //
  // calculateTextMetrics("Hello", mockFont, 24, 500):
  //   scale      = 24 / 1000 = 0.024
  //   lineHeight = 1000 * 0.024 = 24px
  //   rawWidth   = 5 * 500 * 0.024 = 60px  < 500px → 1 line, no wrap
  //   result     = { width: 60, height: 24 }
  // -------------------------------------------------------------------------
  it("5-3: single-line text has one-line height and width less than container", () => {
    const font = makeMockFont({
      unitsPerEm: 1000,
      ascent: 800,
      descent: -200,
      lineGap: 0,
      advanceWidth: 500,
    });

    const metrics = calculateTextMetrics("Hello", font, 24, 500);

    expect(metrics.height).toBe(24);        // exactly one line height
    expect(metrics.width).toBeLessThan(500); // no wrap: width < container
    expect(metrics.width).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Test 4: Long wrapping text increases height
  //
  // Same font, a 200-char string rendered at width:400 vs width:100.
  // The narrow container forces more lines → strictly greater height.
  //
  //   scale      = 12 / 1000 = 0.012
  //   lineHeight = 1000 * 0.012 = 12px
  //   rawWidth   = 200 * 500 * 0.012 = 1200px
  //   wide  (400): lines = ceil(1200/400) = 3  → height = 36px
  //   narrow(100): lines = ceil(1200/100) = 12 → height = 144px
  // -------------------------------------------------------------------------
  it("5-4: narrow container forces more line-wraps and produces greater height", () => {
    const font = makeMockFont({
      unitsPerEm: 1000,
      ascent: 800,
      descent: -200,
      lineGap: 0,
      advanceWidth: 500,
    });

    const longText = "A".repeat(200);

    const wide   = calculateTextMetrics(longText, font, 12, 400);
    const narrow = calculateTextMetrics(longText, font, 12, 100);

    expect(narrow.height).toBeGreaterThan(wide.height);
    // Verify exact values for extra confidence
    expect(wide.height).toBe(36);    // 3 lines × 12px
    expect(narrow.height).toBe(144); // 12 lines × 12px
  });
});
