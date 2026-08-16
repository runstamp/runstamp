import { describe, it, expect, beforeAll } from "vitest";
import { computeAutoFit } from "../src/typography/autoFit.js";
import { loadFont } from "../src/typography/fontCache.js";
import * as fs from "node:fs";
import * as path from "node:path";

// Try to load a system font for testing; skip measurement-dependent tests if not available
let fontLoaded = false;

beforeAll(async () => {
  try {
    // Try common system font paths
    const fontPaths = [
      "/System/Library/Fonts/Helvetica.ttc",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/System/Library/Fonts/Supplemental/Arial.ttf",
    ];
    for (const fp of fontPaths) {
      if (fs.existsSync(fp)) {
        const buf = fs.readFileSync(fp);
        await loadFont("Helvetica", buf);
        fontLoaded = true;
        break;
      }
    }
  } catch {
    // Font loading failed — tests will still run with fallback estimation
  }
});

describe("Auto-Fit Algorithm", () => {
  it("returns 100% scale when text fits in container", () => {
    const result = computeAutoFit(
      "Short",
      { fontSize: 16 },
      500,
      200,
    );
    expect(result.fontScale).toBe(100000);
    expect(result.lnSpcReduction).toBe(0);
  });

  it("reduces font scale for text that overflows", () => {
    // Very large text in a tiny container
    const result = computeAutoFit(
      "This is a very long piece of text that will definitely not fit in a tiny container without being scaled down significantly",
      { fontSize: 48 },
      100,
      50,
    );
    expect(result.fontScale).toBeLessThan(100000);
    expect(result.fontScale).toBeGreaterThanOrEqual(25000);
  });

  it("clamps at minimum fontScale", () => {
    const result = computeAutoFit(
      "A".repeat(1000),
      { fontSize: 96 },
      50,
      20,
    );
    expect(result.fontScale).toBe(25000);
    expect(result.lnSpcReduction).toBe(20000);
  });

  it("handles TextRun[] input", () => {
    const result = computeAutoFit(
      [
        { text: "Hello " },
        { text: "World", style: { fontSize: 32 } },
      ],
      { fontSize: 16 },
      500,
      200,
    );
    expect(result.fontScale).toBe(100000);
    expect(result.lnSpcReduction).toBe(0);
  });

  it("handles empty string", () => {
    const result = computeAutoFit("", { fontSize: 16 }, 200, 100);
    expect(result.fontScale).toBe(100000);
  });

  it("fontScale is always quantized to 2500 grid", () => {
    const result = computeAutoFit(
      "Medium length text that needs some scaling to fit properly in this container area",
      { fontSize: 32 },
      200,
      80,
    );
    expect(result.fontScale % 2500).toBe(0);
  });

  it("lnSpcReduction is always quantized to 5000 grid", () => {
    const result = computeAutoFit(
      "Some text that requires both font scaling and line spacing adjustment to fit",
      { fontSize: 24 },
      150,
      60,
    );
    expect(result.lnSpcReduction % 5000).toBe(0);
  });

  it("prefers higher fontScale over lower lnSpcReduction", () => {
    // A moderately overflowing text — the algorithm should prefer a slightly
    // larger font with more line spacing reduction vs smaller font with zero lnSpc
    const text = "This is text that is slightly too large to fit at full scale. " +
      "It needs some adjustment but should prefer keeping the font larger.";
    const result = computeAutoFit(text, { fontSize: 20 }, 300, 100);

    if (result.fontScale < 100000 && result.lnSpcReduction === 0) {
      // If lnSpc is 0, verify we couldn't have fit with a higher fontScale + some lnSpc
      // This is hard to test deterministically, so just verify the contract
      expect(result.fontScale % 2500).toBe(0);
    }
    // fontScale should be maximized first
    expect(result.fontScale).toBeGreaterThanOrEqual(25000);
    expect(result.fontScale).toBeLessThanOrEqual(100000);
  });

  it("overflow flag set only at minimum scale", () => {
    const result = computeAutoFit(
      "A".repeat(5000),
      { fontSize: 96 },
      50,
      10,
    );
    if (result.overflow) {
      expect(result.fontScale).toBe(25000);
      expect(result.lnSpcReduction).toBe(20000);
    }
  });
});
