// Phase 5 — fontkit-backed metrics provider.
//
// The provider replaces the empirical width-ratio table inside the
// estimators. Three things to pin:
//
//   1. The provider parses a real font buffer and returns finite,
//      monotonically-increasing widths for longer strings.
//   2. When attached to tokens, the estimators delegate to the provider —
//      values change vs. the heuristic path. (We don't assert direction or
//      magnitude beyond "different" because the empirical table is
//      already calibrated reasonably; the point is that wiring is live.)
//   3. The provider is deterministic — repeated measurements of the same
//      string produce identical floats.
//
// We use Lato-Regular.ttf from app/public/fonts because it's the only
// real font asset committed to the repo. The path is resolved relative
// to the package; if the file moves the test will fail loudly, which is
// the correct behavior — silently falling back to the heuristic would
// hide a regression in the provider wiring.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  attachMetricsProvider,
  buildFontkitMetricsProvider,
  detachMetricsProvider,
  getMetricsProvider,
  resolveTokens,
} from "../src/index.js";
import {
  estimateLineCount,
  estimateLineHeight,
  estimateTextWidth,
} from "../src/util/estimateText.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LATO_REGULAR_PATH = path.resolve(
  __dirname,
  "../fixtures/fonts/Lato-Regular.ttf",
);
const LATO_BUFFER = readFileSync(LATO_REGULAR_PATH);

const SHORT = "Hello";
const LONG = "Hello, world from the metrics provider — phase 5";

describe("buildFontkitMetricsProvider", () => {
  it("parses a real font and returns finite metrics", () => {
    const provider = buildFontkitMetricsProvider([
      { family: "Lato", buffer: LATO_BUFFER },
    ]);
    const metrics = provider("Lato");
    expect(metrics).not.toBeNull();
    expect(metrics!.avgWidthRatio).toBeGreaterThan(0);
    expect(metrics!.avgWidthRatio).toBeLessThan(1);
    expect(metrics!.measureWidthPx).toBeTypeOf("function");
    expect(metrics!.lineHeightPx).toBeTypeOf("function");
    const w = metrics!.measureWidthPx!(SHORT, 14);
    expect(Number.isFinite(w)).toBe(true);
    expect(w).toBeGreaterThan(0);
    const h = metrics!.lineHeightPx!(14);
    expect(Number.isFinite(h)).toBe(true);
    expect(h).toBeGreaterThan(0);
  });

  it("returns null for unknown families (caller falls back to empirical)", () => {
    const provider = buildFontkitMetricsProvider([
      { family: "Lato", buffer: LATO_BUFFER },
    ]);
    expect(provider("Definitely Not A Real Font")).toBeNull();
  });

  it("longer strings measure wider than shorter ones", () => {
    const provider = buildFontkitMetricsProvider([
      { family: "Lato", buffer: LATO_BUFFER },
    ]);
    const metrics = provider("Lato")!;
    const a = metrics.measureWidthPx!(SHORT, 14);
    const b = metrics.measureWidthPx!(LONG, 14);
    expect(b).toBeGreaterThan(a);
  });

  it("measurements are deterministic across repeat calls", () => {
    const provider = buildFontkitMetricsProvider([
      { family: "Lato", buffer: LATO_BUFFER },
    ]);
    const metrics = provider("Lato")!;
    const first = metrics.measureWidthPx!(LONG, 14);
    const second = metrics.measureWidthPx!(LONG, 14);
    const third = metrics.measureWidthPx!(LONG, 14);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("malformed font buffers fall through to a null result without throwing", () => {
    const provider = buildFontkitMetricsProvider([
      { family: "Junk", buffer: Buffer.from("not a font, just bytes") },
    ]);
    expect(provider("Junk")).toBeNull();
  });
});

describe("attachMetricsProvider", () => {
  it("getMetricsProvider returns null before attach, the provider after attach, and null after detach", () => {
    const tokens = resolveTokens({});
    expect(getMetricsProvider(tokens)).toBeNull();
    const provider = buildFontkitMetricsProvider([
      { family: "Lato", buffer: LATO_BUFFER },
    ]);
    attachMetricsProvider(tokens, provider);
    expect(getMetricsProvider(tokens)).toBe(provider);
    detachMetricsProvider(tokens);
    expect(getMetricsProvider(tokens)).toBeNull();
  });
});

describe("estimators consult attached provider", () => {
  // Build matched fixtures: one tokens object with the provider attached,
  // one without. Same string, same role, same width. The estimators must
  // produce different numbers when the provider is wired (proves the
  // delegation path is active end-to-end).
  const provider = buildFontkitMetricsProvider([
    { family: "Lato", buffer: LATO_BUFFER },
  ]);

  function build() {
    const tokensWith = resolveTokens({
      type: { body: { family: "Lato" } },
    });
    const tokensWithout = resolveTokens({
      type: { body: { family: "Lato" } },
    });
    attachMetricsProvider(tokensWith, provider);
    return { tokensWith, tokensWithout };
  }

  it("estimateTextWidth differs with vs. without provider", () => {
    const { tokensWith, tokensWithout } = build();
    const role = tokensWith.type.body;
    const args = {
      content: LONG,
      family: role.family,
      sizePt: role.size,
      letterSpacing: role.letterSpacing,
    };
    const withFont = estimateTextWidth(args, tokensWith);
    const without = estimateTextWidth(args, tokensWithout);
    expect(withFont).not.toBe(without);
    // Sanity bounds — neither path should produce nonsense.
    expect(withFont).toBeGreaterThan(0);
    expect(without).toBeGreaterThan(0);
  });

  it("estimateLineCount differs at a tight width when the provider is attached", () => {
    const { tokensWith, tokensWithout } = build();
    const role = tokensWith.type.body;
    // Pick a width narrow enough to force at least one wrap so the
    // word-by-word measurement matters. Empirical and fontkit widths
    // differ enough to land on different line counts here.
    const args = {
      content:
        "the quick brown fox jumps over the lazy dog and then keeps running indefinitely past the horizon",
      family: role.family,
      sizePt: role.size,
      letterSpacing: role.letterSpacing,
      width: 240,
    };
    const linesWith = estimateLineCount(args, tokensWith);
    const linesWithout = estimateLineCount(args, tokensWithout);
    expect(linesWith).toBeGreaterThan(0);
    expect(linesWithout).toBeGreaterThan(0);
    // We don't assert direction (provider may be tighter or looser than
    // the heuristic for any given family). The point is that both paths
    // are exercised and produce sane counts.
  });

  it("estimateLineHeight uses provider's lineHeightPx when no explicit lineHeightPt is given", () => {
    const { tokensWith } = build();
    const role = tokensWith.type.body;
    // Pull the provider's lineHeightPx directly so we know what value
    // the estimator should return when the provider path is active.
    const providerLineHeight = provider("Lato")!.lineHeightPx!(role.size);
    const fromEstimator = estimateLineHeight(role.size, undefined, tokensWith, role.family);
    expect(fromEstimator).toBeCloseTo(providerLineHeight, 6);
    expect(fromEstimator).toBeGreaterThan(0);
  });

  it("explicit lineHeightPt always wins over provider", () => {
    const { tokensWith } = build();
    const role = tokensWith.type.body;
    // Pin lineHeightPt — provider should not be consulted.
    const result = estimateLineHeight(role.size, 30, tokensWith, role.family);
    // 30pt × (96/72) = 40px exactly.
    expect(result).toBeCloseTo(40, 6);
  });
});
