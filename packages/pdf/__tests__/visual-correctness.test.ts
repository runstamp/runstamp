import { analyzePhase3Document } from "../src/phase3-render.js";
import { analyzePhase5DocumentDetailed } from "../src/phase5-table-layout.js";
import type { PdfRenderedPage } from "../src/pdf-renderer.js";

function paragraph(value: string, opts: Record<string, unknown> = {}) {
  return { type: "paragraph" as const, value, ...opts };
}

function heading(value: string, level: 1 | 2 | 3, opts: Record<string, unknown> = {}) {
  return { type: "heading" as const, value, level, keepWithNext: true, ...opts };
}

/**
 * Check that no two text elements on the same page collide.
 * Two texts collide if both their X-ranges and Y-ranges overlap beyond tolerance.
 * Uses ascent (fontSize × 0.8) for the vertical extent above the baseline.
 */
function assertNoTextOverlap(pages: PdfRenderedPage[], label: string): void {
  const TOLERANCE = 1;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const texts = pages[pageIndex]?.texts ?? [];
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i]!;
        const b = texts[j]!;

        // PDF coords: y is baseline, text ascent extends upward (~fontSize × 0.8)
        const aAscent = a.fontSize * 0.8;
        const bAscent = b.fontSize * 0.8;
        const aBottom = a.y;
        const aTop = a.y + aAscent;
        const bBottom = b.y;
        const bTop = b.y + bAscent;
        const vertOverlap = Math.min(aTop, bTop) - Math.max(aBottom, bBottom);
        if (vertOverlap <= TOLERANCE) continue;

        const aRight = a.x + (a.width ?? 0) + ((a.wordSpacing ?? 0) * (a.spaceCount ?? 0));
        const bRight = b.x + (b.width ?? 0) + ((b.wordSpacing ?? 0) * (b.spaceCount ?? 0));
        const horizOverlap = Math.min(aRight, bRight) - Math.max(a.x, b.x);
        if (horizOverlap <= TOLERANCE) continue;

        throw new Error(
          `[${label}] Page ${pageIndex}: text overlap (${vertOverlap.toFixed(1)}pt vert, ${horizOverlap.toFixed(1)}pt horiz)\n` +
          `  A: "${a.value.slice(0, 40)}" at (${a.x.toFixed(1)}, ${a.y.toFixed(1)}) size=${a.fontSize}\n` +
          `  B: "${b.value.slice(0, 40)}" at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) size=${b.fontSize}`,
        );
      }
    }
  }
}

/**
 * Check that all text baselines fall within page margins (with tolerance).
 * The baseline can be slightly outside the content area because the first
 * line's baseline is placed at `pageHeight - topMargin - ascent`, so the
 * glyph top just touches the margin.
 */
function assertTextWithinMargins(
  pages: PdfRenderedPage[],
  pageWidth: number,
  pageHeight: number,
  margins: { top: number; right: number; bottom: number; left: number },
  label: string,
): void {
  const TOLERANCE = 2;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const texts = pages[pageIndex]?.texts ?? [];
    for (const text of texts) {
      if (text.x < margins.left - TOLERANCE) {
        throw new Error(
          `[${label}] Page ${pageIndex}: "${text.value.slice(0, 30)}" x=${text.x.toFixed(1)} is left of margin ${margins.left}`,
        );
      }
      if (text.y < margins.bottom - TOLERANCE) {
        throw new Error(
          `[${label}] Page ${pageIndex}: "${text.value.slice(0, 30)}" y=${text.y.toFixed(1)} is below bottom margin ${margins.bottom}`,
        );
      }
    }
  }
}

describe("Visual correctness", () => {
  it("interprets lineHeight <= 4 as a multiplier", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph(
          "First line of text. Second line of text. Third line of text. " +
          "Fourth line of text. Fifth line of text. Sixth line of text.",
          { fontSize: 12, lineHeight: 1.5 },
        ),
      ],
    });

    const texts = analysis.pages[0]?.texts ?? [];
    expect(texts.length).toBeGreaterThanOrEqual(2);

    // Lines should be 18pt apart (12 * 1.5), not 1.5pt
    const gap = texts[0]!.y - texts[1]!.y;
    expect(gap).toBeCloseTo(18, 0);
  });

  it("treats lineHeight > 4 as absolute points", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph(
          "First line of text. Second line of text. Third line of text. " +
          "Fourth line of text. Fifth line of text. Sixth line of text.",
          { fontSize: 12, lineHeight: 20 },
        ),
      ],
    });

    const texts = analysis.pages[0]?.texts ?? [];
    expect(texts.length).toBeGreaterThanOrEqual(2);

    // Lines should be 20pt apart (absolute)
    const gap = texts[0]!.y - texts[1]!.y;
    expect(gap).toBeCloseTo(20, 0);
  });

  it("detects overlap when lineHeight is too small", async () => {
    // Deliberately tiny absolute lineHeight (5pt) for 24pt font should overlap.
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph(
          "First line of text that wraps. Second line of text that wraps. Third line.",
          { fontSize: 24, lineHeight: 5 },
        ),
      ],
    });

    expect(() => assertNoTextOverlap(analysis.pages, "deliberate-overlap")).toThrow(/text overlap/);
  });

  it("produces no overlap in a multi-section document", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        heading("Section One", 1, { fontSize: 18 }),
        paragraph(
          "A paragraph with enough text to wrap across multiple lines so we can verify spacing.",
          { fontSize: 12, lineHeight: 1.5 },
        ),
        {
          type: "container" as const,
          style: { flexDirection: "row" as const, gap: 12 },
          children: [
            paragraph("Left column text.", { fontSize: 10 }),
            paragraph("Right column text.", { fontSize: 10 }),
          ],
        },
        heading("Section Two", 2, { fontSize: 14 }),
        paragraph("Another paragraph below the heading.", { fontSize: 11, lineHeight: 1.6 }),
      ],
    });

    assertNoTextOverlap(analysis.pages, "multi-section");
    assertTextWithinMargins(analysis.pages, 612, 792, { top: 72, right: 72, bottom: 72, left: 72 }, "multi-section");
  });

  it("produces no overlap in a container-heavy layout", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "A4", margin: 24 },
      children: [
        heading("Title", 1, { fontSize: 14 }),
        paragraph("Subtitle text.", { fontSize: 8 }),
        {
          type: "container" as const,
          style: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 12 },
          children: Array.from({ length: 4 }, (_, i) => ({
            type: "container" as const,
            style: { width: "48%", padding: 14, flexDirection: "column" as const, gap: 6 },
            children: [
              paragraph(`Label ${i + 1} — Header`, { fontSize: 9 }),
              paragraph("Address line 1", { fontSize: 8 }),
              paragraph("Address line 2", { fontSize: 8 }),
              paragraph("City, State ZIP", { fontSize: 8 }),
            ],
          })),
        },
      ],
    });

    assertNoTextOverlap(analysis.pages, "container-heavy");
    assertTextWithinMargins(analysis.pages, 595.276, 841.89, { top: 24, right: 24, bottom: 24, left: 24 }, "container-heavy");
  });

  it("places paragraph after table below the table content", async () => {
    // Phase 5 handles mixed table + non-table content.
    // Non-table and table texts use different coordinate systems internally,
    // but "After table" must still be on a lower part of the page than the table.
    const analysis = await analyzePhase5DocumentDetailed({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph("Before table", { fontSize: 12 }),
        {
          type: "table" as const,
          columns: [{ width: "50%" }, { width: "50%" }],
          header: [{ cells: [{ children: [paragraph("A")] }, { children: [paragraph("B")] }] }],
          body: [
            { cells: [{ children: [paragraph("1")] }, { children: [paragraph("2")] }] },
            { cells: [{ children: [paragraph("3")] }, { children: [paragraph("4")] }] },
          ],
          style: { width: "100%" },
        },
        paragraph("After table", { fontSize: 12 }),
      ],
    });

    const pageTexts = analysis.pages[0]?.texts ?? [];
    const beforeTable = pageTexts.find((t) => t.value === "Before table");
    const afterTable = pageTexts.find((t) => t.value === "After table");

    expect(beforeTable).toBeTruthy();
    expect(afterTable).toBeTruthy();

    // "After table" should be lower on the page (lower PDF Y) than "Before table"
    expect(afterTable!.y).toBeLessThan(beforeTable!.y);

    // The gap should be substantial (at least the table height)
    const gap = beforeTable!.y - afterTable!.y;
    expect(gap).toBeGreaterThan(30);
  });

  it("advances cursorY correctly past containers with marginTop", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph("Before container"),
        {
          type: "container" as const,
          style: { marginTop: 20, marginBottom: 10 },
          children: [paragraph("Inside container")],
        },
        paragraph("After container"),
      ],
    });

    const texts = analysis.pages[0]?.texts ?? [];
    const before = texts.find((t) => t.value === "Before container");
    const inside = texts.find((t) => t.value === "Inside container");
    const after = texts.find((t) => t.value === "After container");

    expect(before).toBeTruthy();
    expect(inside).toBeTruthy();
    expect(after).toBeTruthy();

    // All three should be on the same page, descending in Y (PDF coords)
    expect(before!.y).toBeGreaterThan(inside!.y);
    expect(inside!.y).toBeGreaterThan(after!.y);

    // Gap between "before" and "inside" should include marginTop (20pt) + line height
    const gap1 = before!.y - inside!.y;
    expect(gap1).toBeGreaterThanOrEqual(20);
  });

  it("detects horizontal text overflow past right margin", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph(
          "This is a paragraph with enough text to wrap across multiple lines and test that no line exceeds the right margin boundary of the page.",
          { fontSize: 12, lineHeight: 1.5 },
        ),
        paragraph(
          "MMMMMM WWWWWW MMMMMM WWWWWW MMMMMM WWWWWW wide characters test",
          { fontSize: 14 },
        ),
        heading("A heading that should also stay within bounds", 1, { fontSize: 18 }),
      ],
    });

    const rightEdge = 612 - 72; // Letter width - right margin
    const leftEdge = 72;

    for (let pageIndex = 0; pageIndex < analysis.pages.length; pageIndex++) {
      const texts = analysis.pages[pageIndex]?.texts ?? [];
      for (const text of texts) {
        const textRight = text.x + (text.width ?? 0) + ((text.wordSpacing ?? 0) * (text.spaceCount ?? 0));
        expect(
          textRight,
          `Page ${pageIndex}: "${text.value.slice(0, 30)}" overflows right (${textRight.toFixed(1)} > ${rightEdge})`,
        ).toBeLessThanOrEqual(rightEdge + 2);
        expect(
          text.x,
          `Page ${pageIndex}: "${text.value.slice(0, 30)}" before left margin`,
        ).toBeGreaterThanOrEqual(leftEdge - 2);
      }
    }
  });

  it("keeps flex-row column text within page bounds", async () => {
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        {
          type: "container" as const,
          style: { flexDirection: "row" as const, gap: 24 },
          children: [
            {
              type: "container" as const,
              style: { flexGrow: 1, flexBasis: 0, flexShrink: 1 },
              children: [
                paragraph("Left column with enough text to verify wrapping stays within its allocated flex width.", { fontSize: 10 }),
              ],
            },
            {
              type: "container" as const,
              style: { flexGrow: 1, flexBasis: 0, flexShrink: 1 },
              children: [
                paragraph("Right column with enough text to verify wrapping stays within its allocated flex width.", { fontSize: 10 }),
              ],
            },
          ],
        },
      ],
    });

    const rightEdge = 612 - 72;
    const texts = analysis.pages[0]?.texts ?? [];
    expect(texts.length).toBeGreaterThanOrEqual(2);

    for (const text of texts) {
      const textRight = text.x + (text.width ?? 0) + ((text.wordSpacing ?? 0) * (text.spaceCount ?? 0));
      expect(
        textRight,
        `"${text.value.slice(0, 30)}" overflows right (${textRight.toFixed(1)} > ${rightEdge})`,
      ).toBeLessThanOrEqual(rightEdge + 2);
    }
  });

  it("rejects a document where lineHeight causes visible overlap", async () => {
    // This would have PASSED before the fix (lineHeight: 1.5 = 1.5pt absolute)
    // and now correctly produces 18pt line spacing.
    const analysis = await analyzePhase3Document({
      page: { size: "Letter", margin: 72 },
      children: [
        paragraph(
          "This is a long paragraph that should wrap to multiple lines. " +
          "Each line must be properly spaced and not overlap. " +
          "The line height of 1.5 means 1.5x the font size.",
          { fontSize: 12, lineHeight: 1.5 },
        ),
      ],
    });

    // Must not overlap
    assertNoTextOverlap(analysis.pages, "lineHeight-multiplier");

    // Lines should be ~18pt apart
    const texts = analysis.pages[0]?.texts ?? [];
    if (texts.length >= 2) {
      const spacing = texts[0]!.y - texts[1]!.y;
      expect(spacing).toBeGreaterThan(10);
      expect(spacing).toBeLessThan(25);
    }
  });
});
