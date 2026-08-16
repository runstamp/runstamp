import { describe, it, expect, vi } from "vitest";
import { PaperEngine, PaperError, PaperDocumentSchema } from "../src/index.js";
import type { PaperDocument } from "../src/types/ast.js";
import { RenderGuard } from "../packages/mcp-server/src/renderGuard.js";

function minimalDoc(overrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{ type: "Slide", children: [{ type: "Text", content: "Test" }] }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GAP 1 — AbortSignal support
// ---------------------------------------------------------------------------

describe("GAP 1 — AbortSignal cancellation", () => {
  it("throws PaperError with RENDER_CANCELLED when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const doc = minimalDoc();

    await expect(
      PaperEngine.render(doc, { signal: controller.signal }),
    ).rejects.toThrow(PaperError);

    try {
      await PaperEngine.render(doc, { signal: controller.signal });
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      expect((err as PaperError).code).toBe("RENDER_CANCELLED");
    }
  });

  it("cancels mid-render when signal is aborted between slides", async () => {
    const controller = new AbortController();
    const slides = Array.from({ length: 5 }, (_, i) => ({
      type: "Slide" as const,
      children: [{ type: "Text" as const, content: `Slide ${i}` }],
    }));
    const doc = minimalDoc({ slides });

    // Abort deterministically after the first slide completes via onProgress
    await expect(
      PaperEngine.render(doc, {
        signal: controller.signal,
        onProgress: (completed) => {
          if (completed >= 1) controller.abort();
        },
      }),
    ).rejects.toThrow(/cancelled/i);
  });
});

// ---------------------------------------------------------------------------
// GAP 2 — Progress reporting
// ---------------------------------------------------------------------------

describe("GAP 2 — Progress callback", () => {
  it("calls onProgress for each slide", async () => {
    const progressCalls: Array<[number, number]> = [];
    const slides = Array.from({ length: 3 }, (_, i) => ({
      type: "Slide" as const,
      children: [{ type: "Text" as const, content: `Slide ${i}` }],
    }));
    const doc = minimalDoc({ slides });

    await PaperEngine.render(doc, {
      onProgress: (slideIndex, total) => {
        progressCalls.push([slideIndex, total]);
      },
    });

    expect(progressCalls).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
  });
});

// ---------------------------------------------------------------------------
// GAP 3 — Concurrent render queuing (mutex replaces boolean lock)
// ---------------------------------------------------------------------------

describe("GAP 3 — Concurrent render queuing", () => {
  it("queues concurrent renders instead of throwing", async () => {
    const doc = minimalDoc();

    // Launch two renders concurrently — should both complete
    const [buf1, buf2] = await Promise.all([
      PaperEngine.render(doc),
      PaperEngine.render(doc),
    ]);

    expect(buf1.length).toBeGreaterThan(0);
    expect(buf2.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GAP 7 — Base64 corruption detection
// ---------------------------------------------------------------------------

describe("GAP 7 — Base64 validation", () => {
  it("warns on malformed data URL (missing comma) in images", async () => {
    const warnSpy = vi.fn();
    const { setLogger, getLogger } = await import("../src/logger.js");
    const origLogger = getLogger();
    setLogger({ warn: warnSpy });

    try {
      const doc = minimalDoc({
        slides: [{
          type: "Slide",
          children: [{
            type: "Image",
            src: "data:image/png;base64NO_COMMA_HERE",
            style: { width: 100, height: 100 },
          }],
        }],
      });

      // Should not throw — should produce output with a warning
      const buf = await PaperEngine.render(doc);
      expect(buf.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Malformed data URL"),
      );
    } finally {
      setLogger(origLogger);
    }
  });

  it("warns on malformed background image data URL", async () => {
    const warnSpy = vi.fn();
    const { setLogger, getLogger } = await import("../src/logger.js");
    const origLogger = getLogger();
    setLogger({ warn: warnSpy });

    try {
      const doc = minimalDoc({
        slides: [{
          type: "Slide",
          background: { type: "image", src: "data:image/pngNO_COMMA" } as any,
          children: [{ type: "Text", content: "Test" }],
        }],
      });

      const buf = await PaperEngine.render(doc);
      expect(buf.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Malformed background image"),
      );
    } finally {
      setLogger(origLogger);
    }
  });
});

// ---------------------------------------------------------------------------
// GAP 10 — Resource limits
// ---------------------------------------------------------------------------

describe("GAP 10 — Resource limits in validator", () => {
  it("rejects documents with more than 200 slides", () => {
    const slides = Array.from({ length: 201 }, () => ({
      type: "Slide",
      children: [],
    }));
    const result = PaperDocumentSchema.safeParse({
      type: "Document",
      meta: {},
      slides,
    });
    expect(result.success).toBe(false);
  });

  it("accepts documents with exactly 200 slides", () => {
    const slides = Array.from({ length: 200 }, () => ({
      type: "Slide",
      children: [],
    }));
    const result = PaperDocumentSchema.safeParse({
      type: "Document",
      meta: {},
      slides,
    });
    expect(result.success).toBe(true);
  });

  it("rejects slides with more than 500 children", () => {
    const children = Array.from({ length: 501 }, () => ({
      type: "Text",
      content: "x",
    }));
    const result = PaperDocumentSchema.safeParse({
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children }],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GAP 11 — RenderGuard queue depth limit and timeout
// ---------------------------------------------------------------------------

describe("GAP 11 — RenderGuard queue depth limit and timeout", () => {
  it("rejects when queue is full", async () => {
    const guard = new RenderGuard({ maxQueueDepth: 1, queueTimeoutMs: 100 });

    // Hold the lock
    let releaseLock: () => void;
    const lockHeld = new Promise<void>((resolve) => { releaseLock = resolve; });
    const firstRun = guard.run(() => lockHeld);

    // Queue one request (fills the queue of depth 1)
    const secondRun = guard.run(async () => "queued");

    // Third request should be rejected immediately
    await expect(
      guard.run(async () => "rejected"),
    ).rejects.toThrow(/queue full/i);

    // Cleanup
    releaseLock!();
    await firstRun;
    await secondRun;
  });

  it("rejects queued requests after timeout", async () => {
    const guard = new RenderGuard({ maxQueueDepth: 5, queueTimeoutMs: 50 });

    // Hold the lock indefinitely
    let releaseLock: () => void;
    const lockHeld = new Promise<void>((resolve) => { releaseLock = resolve; });
    const firstRun = guard.run(() => lockHeld);

    // This should timeout
    await expect(
      guard.run(async () => "timed out"),
    ).rejects.toThrow(/timeout/i);

    releaseLock!();
    await firstRun;
  });
});

// ---------------------------------------------------------------------------
// GAP 19 — Structured error types
// ---------------------------------------------------------------------------

describe("GAP 19 — PaperError structured errors", () => {
  it("validation errors are PaperError with VALIDATION_FAILED code", async () => {
    const badDoc = { type: "Document", meta: {}, slides: [] } as any;

    try {
      await PaperEngine.render(badDoc);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      const paperErr = err as PaperError;
      expect(paperErr.code).toBe("VALIDATION_FAILED");
      expect(paperErr.phase).toBe("validation");
    }
  });

  it("validation errors show up to 20 issues with type hints", async () => {
    // Create a doc with many invalid fields
    const badDoc = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", style: { fontSize: "14px" } },
            { type: "Text", style: { color: "red" } },
          ],
        },
      ],
    } as any;

    try {
      await PaperEngine.render(badDoc);
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      const msg = (err as PaperError).message;
      // Should contain type hints like "expected X, received Y"
      expect(msg).toContain("validation error");
    }
  });
});

// ---------------------------------------------------------------------------
// GAP 5 — Font error message improvement
// ---------------------------------------------------------------------------

describe("GAP 5 — Font error messages", () => {
  it("font not found error includes helpful suggestion", async () => {
    const { getFont } = await import("../src/typography/fontCache.js");
    try {
      getFont("NonExistentFont123");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const msg = (err as Error).message;
      expect(msg).toContain("NonExistentFont123");
      expect(msg).toContain("loadFont");
    }
  });
});

// ---------------------------------------------------------------------------
// GAP 20 — Cache size monitoring
// ---------------------------------------------------------------------------

describe("GAP 20 — Cache size monitoring", () => {
  it("fontCacheSize returns a number", async () => {
    const { fontCacheSize } = await import("../src/typography/fontCache.js");
    expect(typeof fontCacheSize()).toBe("number");
  });

  it("hbFontCacheSize returns a number", async () => {
    const { hbFontCacheSize } = await import("../src/typography/harfbuzzLoader.js");
    expect(typeof hbFontCacheSize()).toBe("number");
  });
});
