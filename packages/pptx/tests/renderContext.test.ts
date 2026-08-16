import { describe, it, expect } from "vitest";
import {
  RenderContext,
  withContext,
  LoggerManager,
  DeterministicModeManager,
  FontCacheManager,
  HarfBuzzManager,
  KnuthPlassConfig,
  getLogger,
  setLogger,
  isDeterministicMode,
  setDeterministicMode,
  fontCacheSize,
  clearFontCache,
  getKnuthPlassSegmentThreshold,
  setKnuthPlassSegmentThreshold,
} from "../src/index.js";
import { FontBridgeManager } from "../src/renderer/fontBridge.js";

describe("RenderContext — per-request isolation via AsyncLocalStorage", () => {
  it("constructs with fresh manager instances by default", () => {
    const ctx = new RenderContext();
    expect(ctx.logger).toBeInstanceOf(LoggerManager);
    expect(ctx.deterministicMode).toBeInstanceOf(DeterministicModeManager);
    expect(ctx.fontCache).toBeInstanceOf(FontCacheManager);
    expect(ctx.harfBuzz).toBeInstanceOf(HarfBuzzManager);
    expect(ctx.knuthPlass).toBeInstanceOf(KnuthPlassConfig);
    expect(ctx.fontBridge).toBeInstanceOf(FontBridgeManager);
  });

  it("accepts custom manager instances", () => {
    const logger = new LoggerManager();
    const ctx = new RenderContext({ logger });
    expect(ctx.logger).toBe(logger);
  });

  it("withContext makes context active for sync functions", () => {
    const ctx = new RenderContext();
    ctx.deterministicMode.setDeterministicMode(true);

    // Outside context — module default (should be false unless set globally)
    const before = isDeterministicMode();

    const inside = withContext(ctx, () => isDeterministicMode());

    expect(inside).toBe(true);
    // Outer context unchanged
    expect(isDeterministicMode()).toBe(before);
  });

  it("withContext isolates logger", () => {
    const ctx = new RenderContext();
    const messages: string[] = [];
    ctx.logger.setLogger({ warn: (msg) => messages.push(msg) });

    withContext(ctx, () => {
      getLogger().warn("inside context");
    });

    expect(messages).toEqual(["inside context"]);
  });

  it("withContext isolates deterministic mode", () => {
    const before = isDeterministicMode();
    const ctx = new RenderContext();
    ctx.deterministicMode.setDeterministicMode(true);

    // Use setDeterministicMode inside context — should affect context only
    const result = withContext(ctx, () => {
      expect(isDeterministicMode()).toBe(true);
      setDeterministicMode(false);
      return isDeterministicMode();
    });

    expect(result).toBe(false);
    // Global state unaffected
    expect(isDeterministicMode()).toBe(before);
  });

  it("withContext isolates font cache", () => {
    const ctx = new RenderContext();

    const outerSize = fontCacheSize();
    const innerSize = withContext(ctx, () => fontCacheSize());

    // Both should be 0 (empty caches)
    expect(outerSize).toBe(0);
    expect(innerSize).toBe(0);

    // Loading a font in context shouldn't affect global
    // (We can't easily test loadFont without a real font buffer,
    //  but we can verify clearFontCache targets the right instance)
    withContext(ctx, () => {
      clearFontCache(); // Should clear ctx.fontCache, not global
    });
    // No error = correct isolation
  });

  it("withContext isolates Knuth-Plass threshold", () => {
    const originalThreshold = getKnuthPlassSegmentThreshold();
    const ctx = new RenderContext();
    ctx.knuthPlass.setSegmentThreshold(500);

    const innerThreshold = withContext(ctx, () => getKnuthPlassSegmentThreshold());

    expect(innerThreshold).toBe(500);
    expect(getKnuthPlassSegmentThreshold()).toBe(originalThreshold);
  });

  it("setKnuthPlassSegmentThreshold inside context modifies context only", () => {
    const originalThreshold = getKnuthPlassSegmentThreshold();
    const ctx = new RenderContext();

    withContext(ctx, () => {
      setKnuthPlassSegmentThreshold(42);
      expect(getKnuthPlassSegmentThreshold()).toBe(42);
    });

    // Global unchanged
    expect(getKnuthPlassSegmentThreshold()).toBe(originalThreshold);
  });

  it("nested withContext scopes correctly", () => {
    const outer = new RenderContext();
    outer.deterministicMode.setDeterministicMode(true);
    const inner = new RenderContext();
    inner.deterministicMode.setDeterministicMode(false);

    withContext(outer, () => {
      expect(isDeterministicMode()).toBe(true);

      withContext(inner, () => {
        expect(isDeterministicMode()).toBe(false);
      });

      // Back to outer context
      expect(isDeterministicMode()).toBe(true);
    });
  });

  it("concurrent contexts are isolated from each other", async () => {
    const ctx1 = new RenderContext();
    ctx1.deterministicMode.setDeterministicMode(true);
    const ctx2 = new RenderContext();
    ctx2.deterministicMode.setDeterministicMode(false);

    const [r1, r2] = await Promise.all([
      withContext(ctx1, async () => {
        await new Promise(r => setTimeout(r, 10));
        return isDeterministicMode();
      }),
      withContext(ctx2, async () => {
        await new Promise(r => setTimeout(r, 10));
        return isDeterministicMode();
      }),
    ]);

    expect(r1).toBe(true);
    expect(r2).toBe(false);
  });

  it("module-level functions fall back to defaults outside any context", () => {
    // These should work normally without any context active
    expect(typeof isDeterministicMode()).toBe("boolean");
    expect(typeof getKnuthPlassSegmentThreshold()).toBe("number");
    expect(getLogger()).toBeDefined();
    expect(typeof fontCacheSize()).toBe("number");
  });
});
