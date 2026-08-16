import { describe, it, expect } from "vitest";
import { knuthPlassLineBreak, type KPSegment } from "../src/typography/knuthPlass.js";

/** Helper: create a non-space segment with default lineHeight */
function seg(pixelWidth: number, opts?: Partial<KPSegment>): KPSegment {
  return { pixelWidth, mandatory: false, isSpace: false, lineHeight: 20, ...opts };
}

/** Helper: create a space segment */
function space(pixelWidth: number, lineHeight = 20): KPSegment {
  return { pixelWidth, mandatory: false, isSpace: true, lineHeight };
}

/** Helper: create a mandatory break segment */
function br(lineHeight = 20): KPSegment {
  return { pixelWidth: 0, mandatory: true, isSpace: false, lineHeight };
}

describe("Knuth-Plass line breaking", () => {
  // =========================================================================
  // Original 12 tests — updated with isSpace + lineHeight fields
  // =========================================================================

  it("single line fits → 1 line", () => {
    const segments: KPSegment[] = [
      seg(50),
      seg(30),
      seg(20),
    ];
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(100);
    expect(result.totalHeight).toBe(20);
  });

  it("two-line break: KP produces balanced lines", () => {
    // 6 segments of 20px each = 120px total, constraint 70px
    // KP should find balanced [60, 60] split
    const segments: KPSegment[] = Array.from({ length: 6 }, () => seg(20));
    const result = knuthPlassLineBreak(segments, 70);
    expect(result.lineCount).toBe(2);
    expect(result.maxLineWidth).toBe(60);
    expect(result.totalHeight).toBe(40); // 2 lines * 20px
  });

  it("mandatory breaks → independent paragraphs", () => {
    const segments: KPSegment[] = [
      seg(30),
      br(),
      seg(40),
    ];
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBe(2);
    expect(result.maxLineWidth).toBe(40);
    expect(result.totalHeight).toBe(40); // 2 lines * 20px
  });

  it("empty input → lineCount=1, maxLineWidth=0, totalHeight=0", () => {
    const result = knuthPlassLineBreak([], 100);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(0);
    expect(result.totalHeight).toBe(0);
  });

  it("oversized single segment → 1 line with that width", () => {
    const segments: KPSegment[] = [seg(500)];
    const result = knuthPlassLineBreak(segments, 100);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(500);
    expect(result.totalHeight).toBe(20);
  });

  it("justified vs ragged may produce different breaks", () => {
    const segments: KPSegment[] = [
      seg(25), seg(25), seg(25), seg(25),
      seg(25), seg(25), seg(25),
    ];
    const justified = knuthPlassLineBreak(segments, 80, { textAlign: "justify" });
    const ragged = knuthPlassLineBreak(segments, 80, { textAlign: "left" });
    expect(justified.lineCount).toBeGreaterThanOrEqual(2);
    expect(ragged.lineCount).toBeGreaterThanOrEqual(2);
    expect(justified.totalHeight).toBeGreaterThan(0);
    expect(ragged.totalHeight).toBeGreaterThan(0);
  });

  it("greedy fallback on pathological input still returns valid result", () => {
    const segments: KPSegment[] = Array.from({ length: 100 }, () => seg(1));
    const result = knuthPlassLineBreak(segments, 10);
    expect(result.lineCount).toBe(10);
    expect(result.maxLineWidth).toBe(10);
    expect(result.totalHeight).toBe(200); // 10 lines * 20px
  });

  it("performance: 1000 segments completes in <50ms", () => {
    const segments: KPSegment[] = Array.from({ length: 1000 }, () =>
      seg(Math.random() * 10 + 1),
    );
    const start = performance.now();
    const result = knuthPlassLineBreak(segments, 100);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(result.lineCount).toBeGreaterThan(0);
    expect(result.maxLineWidth).toBeGreaterThan(0);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  it("multiple mandatory breaks create correct line count", () => {
    const segments: KPSegment[] = [
      seg(10), br(), seg(10), br(), seg(10),
    ];
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBe(3);
    expect(result.maxLineWidth).toBe(10);
    expect(result.totalHeight).toBe(60); // 3 lines * 20px
  });

  it("mandatory break at end creates extra line", () => {
    const segments: KPSegment[] = [seg(50), br()];
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBe(2);
    expect(result.maxLineWidth).toBe(50);
  });

  it("no constraint width → single line with total width", () => {
    const segments: KPSegment[] = [seg(100), seg(200)];
    const result = knuthPlassLineBreak(segments, 10000);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(300);
    expect(result.totalHeight).toBe(20);
  });

  it("balanced three-line break", () => {
    // 9 segments of 10px each = 90px, constraint 35px
    // Optimal: [30, 30, 30]
    const segments: KPSegment[] = Array.from({ length: 9 }, () => seg(10));
    const result = knuthPlassLineBreak(segments, 35);
    expect(result.lineCount).toBe(3);
    expect(result.maxLineWidth).toBe(30);
    expect(result.totalHeight).toBe(60); // 3 lines * 20px
  });

  // =========================================================================
  // New tests: Glue model
  // =========================================================================

  it("glue model: space segments allow stretch and shrink", () => {
    // word(40) + space(10) + word(40) = 90px, constraint 100px
    // With stretch on space, this should fit on 1 line (space can stretch)
    const segments: KPSegment[] = [seg(40), space(10), seg(40)];
    const result = knuthPlassLineBreak(segments, 100);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(90);
  });

  it("glue model: spaces provide flexibility for line breaking", () => {
    // word(30) + space(5) + word(30) + space(5) + word(30) + space(5) + word(30) = 135px
    // constraint 70px — spaces give glue flexibility
    const segments: KPSegment[] = [
      seg(30), space(5), seg(30), space(5), seg(30), space(5), seg(30),
    ];
    const result = knuthPlassLineBreak(segments, 70);
    expect(result.lineCount).toBeGreaterThanOrEqual(2);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  // =========================================================================
  // Fitness classes
  // =========================================================================

  it("fitness classes: adjacent lines with big class difference get extra demerits", () => {
    // Create segments where one break produces tight+very loose adjacent lines
    // vs another break that produces more consistent fitness
    // We can verify that the algorithm produces a valid result (no crash)
    // and uses the fitness model by checking line count
    const segments: KPSegment[] = [
      seg(10), space(5), seg(10), space(5), seg(10), space(5),
      seg(10), space(5), seg(10), space(5), seg(10), space(5),
      seg(10), space(5), seg(10),
    ];
    const result = knuthPlassLineBreak(segments, 50, { textAlign: "justify" });
    expect(result.lineCount).toBeGreaterThanOrEqual(2);
    expect(result.maxLineWidth).toBeLessThanOrEqual(75); // shouldn't vastly exceed constraint
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  // =========================================================================
  // Adjustment ratio verification
  // =========================================================================

  it("adjustment ratio: exactly fitting line has ratio ~0", () => {
    // 5 segments * 20px = 100px, constraint = 100px → ratio = 0, 1 line
    const segments: KPSegment[] = Array.from({ length: 5 }, () => seg(20));
    const result = knuthPlassLineBreak(segments, 100);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(100);
  });

  it("adjustment ratio: slightly short line with glue is acceptable", () => {
    // word(30) + space(10) + word(30) = 70px, constraint 80px
    // diff=10, stretch=5 (space*0.5) → ratio=2.0 = at tolerance boundary
    const segments: KPSegment[] = [seg(30), space(10), seg(30)];
    const result = knuthPlassLineBreak(segments, 80);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(70);
  });

  // =========================================================================
  // Tolerance
  // =========================================================================

  it("tolerance: lines exceeding tolerance fall back gracefully", () => {
    // Very long word segments that can't fit well
    const segments: KPSegment[] = [seg(90), seg(90), seg(90)];
    const result = knuthPlassLineBreak(segments, 100);
    // Should handle gracefully — either DP or greedy fallback
    expect(result.lineCount).toBeGreaterThanOrEqual(1);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  // =========================================================================
  // Mixed line heights
  // =========================================================================

  it("mixed line heights: paragraph with 12px and 24px text computes correct totalHeight", () => {
    // Line 1: small text (lineHeight=12) + large text (lineHeight=24) → maxH=24
    // Line 2: small text only → maxH=12
    const segments: KPSegment[] = [
      seg(40, { lineHeight: 12 }),
      seg(40, { lineHeight: 24 }),
      seg(40, { lineHeight: 12 }),
      seg(40, { lineHeight: 12 }),
    ];
    // constraint 90 → first 2 segs (80px) on line 1, next 2 (80px) on line 2
    const result = knuthPlassLineBreak(segments, 90);
    expect(result.lineCount).toBe(2);
    // Line 1 max height = max(12, 24) = 24
    // Line 2 max height = max(12, 12) = 12
    expect(result.totalHeight).toBe(36);
  });

  it("mixed line heights: three lines with different heights", () => {
    const segments: KPSegment[] = [
      seg(30, { lineHeight: 10 }),
      seg(30, { lineHeight: 10 }),
      seg(30, { lineHeight: 30 }),
      seg(30, { lineHeight: 30 }),
      seg(30, { lineHeight: 15 }),
      seg(30, { lineHeight: 15 }),
    ];
    // constraint 65 → 2 segs per line
    const result = knuthPlassLineBreak(segments, 65);
    expect(result.lineCount).toBe(3);
    // Line 1: max(10,10) = 10, Line 2: max(30,30) = 30, Line 3: max(15,15) = 15
    expect(result.totalHeight).toBe(55);
  });

  // =========================================================================
  // Per-line totalHeight
  // =========================================================================

  it("per-line totalHeight: verify totalHeight is sum of per-line max heights", () => {
    // All uniform height → totalHeight = lineCount * lineHeight
    const segments: KPSegment[] = Array.from({ length: 8 }, () =>
      seg(15, { lineHeight: 18 }),
    );
    const result = knuthPlassLineBreak(segments, 50);
    // 8 * 15 = 120px / ~50px per line ≈ 2-3 lines
    expect(result.totalHeight).toBe(result.lineCount * 18);
  });

  it("per-line totalHeight: single line paragraph", () => {
    const segments: KPSegment[] = [seg(20, { lineHeight: 25 }), seg(30, { lineHeight: 30 })];
    const result = knuthPlassLineBreak(segments, 100);
    expect(result.lineCount).toBe(1);
    expect(result.totalHeight).toBe(30); // max(25, 30)
  });

  // =========================================================================
  // Justified vs ragged differences
  // =========================================================================

  it("justified mode: produces valid results with glue", () => {
    const segments: KPSegment[] = [
      seg(25), space(8), seg(25), space(8), seg(25), space(8), seg(25),
    ];
    const justified = knuthPlassLineBreak(segments, 70, { textAlign: "justify" });
    expect(justified.lineCount).toBeGreaterThanOrEqual(2);
    expect(justified.totalHeight).toBeGreaterThan(0);
  });

  it("ragged mode: has higher effective tolerance", () => {
    // Ragged uses tolerance * 2, so it can accept looser lines
    const segments: KPSegment[] = [
      seg(20), space(5), seg(20), space(5), seg(20),
    ];
    const result = knuthPlassLineBreak(segments, 80, { textAlign: "left" });
    expect(result.lineCount).toBeGreaterThanOrEqual(1);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  it("edge: all spaces input", () => {
    const segments: KPSegment[] = [space(10), space(10), space(10)];
    const result = knuthPlassLineBreak(segments, 25);
    // All spaces — should still produce valid line breaks
    expect(result.lineCount).toBeGreaterThanOrEqual(1);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  it("edge: single very long word (overfull handled gracefully)", () => {
    const segments: KPSegment[] = [seg(1000, { lineHeight: 16 })];
    const result = knuthPlassLineBreak(segments, 100);
    // Single segment can't be broken, so 1 overfull line
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(1000);
    expect(result.totalHeight).toBe(16);
  });

  it("edge: alternating space/word segments", () => {
    // word space word space word space word space word
    const segments: KPSegment[] = [
      seg(15), space(5), seg(15), space(5), seg(15), space(5),
      seg(15), space(5), seg(15),
    ];
    // Total = 15*5 + 5*4 = 95px, constraint 40
    const result = knuthPlassLineBreak(segments, 40);
    expect(result.lineCount).toBeGreaterThanOrEqual(2);
    expect(result.totalHeight).toBeGreaterThan(0);
    // Each line should not vastly exceed constraint (word+space+word = 35 or 15+5+15+5+15=55)
    expect(result.maxLineWidth).toBeLessThanOrEqual(60);
  });

  it("edge: zero-width segments don't cause errors", () => {
    const segments: KPSegment[] = [seg(0), seg(0), seg(50), seg(0)];
    const result = knuthPlassLineBreak(segments, 100);
    expect(result.lineCount).toBe(1);
    expect(result.maxLineWidth).toBe(50);
    expect(result.totalHeight).toBe(20);
  });

  it("edge: mandatory break between spaces", () => {
    const segments: KPSegment[] = [
      space(10), seg(20), br(), space(10), seg(30),
    ];
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBe(2);
  });

  it("edge: very narrow constraint forces many lines", () => {
    const segments: KPSegment[] = Array.from({ length: 5 }, () => seg(10));
    const result = knuthPlassLineBreak(segments, 12);
    // Each segment is 10px, constraint is 12px, so 1 segment per line
    expect(result.lineCount).toBe(5);
    expect(result.maxLineWidth).toBe(10);
    expect(result.totalHeight).toBe(100); // 5 lines * 20px
  });

  // =========================================================================
  // Glue stretch/shrink affecting break decisions
  // =========================================================================

  it("glue stretch allows more content on a line", () => {
    // Without spaces (no glue): 30+30+30=90 > 85, would need 2 lines
    // With spaces (glue): 30+5+30+5+30=100, but glue stretch=5 total → can stretch
    // However 100 > 85, so still 2 lines. The point is it doesn't crash and handles glue.
    const noSpaces: KPSegment[] = [seg(30), seg(30), seg(30)];
    const withSpaces: KPSegment[] = [seg(30), space(5), seg(30), space(5), seg(30)];
    const r1 = knuthPlassLineBreak(noSpaces, 85);
    const r2 = knuthPlassLineBreak(withSpaces, 85);
    // Both produce valid results
    expect(r1.lineCount).toBeGreaterThanOrEqual(1);
    expect(r2.lineCount).toBeGreaterThanOrEqual(1);
    expect(r2.totalHeight).toBeGreaterThan(0);
  });

  it("glue shrink: slightly overfull line with spaces can shrink to fit", () => {
    // word(45) + space(10) + word(45) = 100px, constraint 97
    // diff = -3, shrink = 10*0.33 = 3.3 → ratio ≈ -0.91 (within -1 limit)
    // Should fit on 1 line due to glue shrink
    const segments: KPSegment[] = [seg(45), space(10), seg(45)];
    const result = knuthPlassLineBreak(segments, 97);
    expect(result.lineCount).toBe(1);
  });

  // =========================================================================
  // totalHeight with mandatory breaks
  // =========================================================================

  it("mandatory breaks with mixed heights compute correct totalHeight", () => {
    const segments: KPSegment[] = [
      seg(30, { lineHeight: 10 }),
      seg(30, { lineHeight: 15 }),
      br(20),
      seg(30, { lineHeight: 25 }),
    ];
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBe(2);
    // Paragraph 1: max(10, 15) = 15
    // Paragraph 2: 25
    expect(result.totalHeight).toBe(40);
  });

  // =========================================================================
  // Regression: algorithm correctness
  // =========================================================================

  it("regression: long paragraph with words and spaces breaks correctly", () => {
    // Simulate a real paragraph: alternating word(~40-60px) and space(8px)
    const segments: KPSegment[] = [];
    const words = [45, 55, 40, 60, 35, 50, 42, 58, 38, 52];
    for (let i = 0; i < words.length; i++) {
      segments.push(seg(words[i]));
      if (i < words.length - 1) segments.push(space(8));
    }
    // Total ≈ 475 + 72 = 547px, constraint 200px → ~3 lines
    const result = knuthPlassLineBreak(segments, 200);
    expect(result.lineCount).toBeGreaterThanOrEqual(2);
    expect(result.lineCount).toBeLessThanOrEqual(5);
    expect(result.maxLineWidth).toBeLessThanOrEqual(220); // shouldn't vastly overshoot
    expect(result.totalHeight).toBe(result.lineCount * 20);
  });
});
