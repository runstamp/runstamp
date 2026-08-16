// tests/renderToImages.test.ts — Image rendering test suite
import { describe, it, expect } from "vitest";
import {
  validateImageRenderOptions,
  LITE_IMAGE_MAX_WIDTH,
  PRO_IMAGE_MAX_WIDTH,
} from "../src/feature-gate.js";
import { PaperError, RunstampFeatureError } from "../src/errors.js";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, SlideImage } from "../src/types/ast.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(slideCount = 1): PaperDocument {
  return {
    type: "Document",
    meta: { title: "test" },
    slides: Array.from({ length: slideCount }, (_, i) => ({
      type: "Slide" as const,
      children: [
        {
          type: "View" as const,
          style: {
            width: 200,
            height: 100,
            backgroundColor: i % 2 === 0 ? "#FF0000" : "#0000FF",
          },
        },
      ],
    })),
  } as PaperDocument;
}

function makeDoc43(slideCount = 1): PaperDocument {
  return {
    type: "Document",
    meta: { title: "test-4:3" },
    slideSize: { width: 1280, height: 960 },
    slides: Array.from({ length: slideCount }, () => ({
      type: "Slide" as const,
      children: [
        {
          type: "View" as const,
          style: { width: 100, height: 100, backgroundColor: "#00FF00" },
        },
      ],
    })),
  } as PaperDocument;
}

// ---------------------------------------------------------------------------
// 1. Feature Gating (unit tests for validateImageRenderOptions)
// ---------------------------------------------------------------------------

describe("validateImageRenderOptions", () => {
  // The 400px cap and the JPEG block were a pricing gate on output quality, not
  // a bundle constraint, and went with the free/pro split. What remains is the
  // resource ceiling: past 4K the canvas allocation is what fails, and a typed
  // error beats an out-of-memory kill.
  it.each(["lite", "pro"] as const)("allows a full-resolution PNG in %s mode", (mode) => {
    expect(() => validateImageRenderOptions({ width: 3840, format: "png" }, mode)).not.toThrow();
  });

  it.each(["lite", "pro"] as const)("allows JPEG in %s mode", (mode) => {
    expect(() => validateImageRenderOptions({ format: "jpeg" }, mode)).not.toThrow();
  });

  it.each(["lite", "pro"] as const)("allows no options in %s mode", (mode) => {
    expect(() => validateImageRenderOptions(undefined, mode)).not.toThrow();
  });

  it.each(["lite", "pro"] as const)("rejects a width past the 4K ceiling in %s mode", (mode) => {
    expect(() => validateImageRenderOptions({ width: 3841 }, mode)).toThrow(RunstampFeatureError);
  });
});

// ---------------------------------------------------------------------------
// 2. Happy Path (integration — requires @napi-rs/canvas)
// ---------------------------------------------------------------------------

let canvasAvailable = false;
try {
  await import("@napi-rs/canvas");
  canvasAvailable = true;
} catch {
  // Optional dependency is unavailable in the default OSS test environment.
}

describe.skipIf(!canvasAvailable)("renderToImages (requires canvas)", () => {
  it("single slide renders to PNG with all SlideImage fields", async () => {
    const doc = makeDoc(1);
    const images = await PaperEngine.renderToImages(doc, { width: 200 });
    expect(images).toHaveLength(1);
    const img = images[0];
    expect(img.slideIndex).toBe(0);
    expect(img.buffer).toBeInstanceOf(Buffer);
    expect(img.buffer.length).toBeGreaterThan(0);
    expect(img.width).toBe(200);
    expect(img.height).toBeGreaterThan(0);
    expect(img.format).toBe("png");
  });

  it("multi-slide (3 slides) returns 3 SlideImages with correct indices", async () => {
    const doc = makeDoc(3);
    const images = await PaperEngine.renderToImages(doc, { width: 200 });
    expect(images).toHaveLength(3);
    expect(images.map((img) => img.slideIndex)).toEqual([0, 1, 2]);
  });

  it("JPEG format returns buffer starting with JPEG magic bytes", async () => {
    const doc = makeDoc(1);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      format: "jpeg",
    });
    expect(images).toHaveLength(1);
    expect(images[0].format).toBe("jpeg");
    // JPEG magic bytes: 0xFF 0xD8
    expect(images[0].buffer[0]).toBe(0xff);
    expect(images[0].buffer[1]).toBe(0xd8);
  });

  it("PNG format returns buffer starting with PNG magic bytes", async () => {
    const doc = makeDoc(1);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      format: "png",
    });
    expect(images).toHaveLength(1);
    expect(images[0].format).toBe("png");
    // PNG magic bytes: 0x89 0x50
    expect(images[0].buffer[0]).toBe(0x89);
    expect(images[0].buffer[1]).toBe(0x50);
  });

  it("background override replaces slide background", async () => {
    const doc = makeDoc(1);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      background: "#00FF00",
    });
    expect(images).toHaveLength(1);
    expect(images[0].buffer.length).toBeGreaterThan(0);
  });

  it("scale factor: width 400, scale 2 produces width 800", async () => {
    const doc = makeDoc(1);
    const images = await PaperEngine.renderToImages(doc, {
      width: 400,
      scale: 2,
    });
    expect(images).toHaveLength(1);
    expect(images[0].width).toBe(800);
  });

  it("auto height from 16:9 aspect: width 400 produces height ~225", async () => {
    const doc = makeDoc(1);
    const images = await PaperEngine.renderToImages(doc, { width: 400 });
    expect(images).toHaveLength(1);
    // Default slide size is 16:9 → 400 / (16/9) ≈ 225
    expect(images[0].height).toBeGreaterThanOrEqual(220);
    expect(images[0].height).toBeLessThanOrEqual(230);
  });

  it("specific slides: [0, 2] on 3-slide doc returns 2 images", async () => {
    const doc = makeDoc(3);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      slides: [0, 2],
    });
    expect(images).toHaveLength(2);
    expect(images[0].slideIndex).toBe(0);
    expect(images[1].slideIndex).toBe(2);
  });

  it("empty slides array returns empty array", async () => {
    const doc = makeDoc(3);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      slides: [],
    });
    expect(images).toHaveLength(0);
  });

  it("renderToImage convenience returns single SlideImage", async () => {
    const doc = makeDoc(3);
    const img = await PaperEngine.renderToImage(doc, 1, { width: 200 });
    expect(img.slideIndex).toBe(1);
    expect(img.buffer).toBeInstanceOf(Buffer);
    expect(img.format).toBe("png");
  });
});

// ---------------------------------------------------------------------------
// 3. Error Cases
// ---------------------------------------------------------------------------

describe.skipIf(!canvasAvailable)("renderToImages error cases", () => {
  it("invalid slide index throws INVALID_SLIDE_INDEX", async () => {
    const doc = makeDoc(3);
    await expect(
      PaperEngine.renderToImages(doc, { width: 200, slides: [5] }),
    ).rejects.toThrow(PaperError);

    try {
      await PaperEngine.renderToImages(doc, { width: 200, slides: [5] });
    } catch (err) {
      expect((err as PaperError).code).toBe("INVALID_SLIDE_INDEX");
    }
  });

  it("negative slide index throws INVALID_SLIDE_INDEX", async () => {
    const doc = makeDoc(3);
    await expect(
      PaperEngine.renderToImages(doc, { width: 200, slides: [-1] }),
    ).rejects.toThrow(PaperError);

    try {
      await PaperEngine.renderToImages(doc, { width: 200, slides: [-1] });
    } catch (err) {
      expect((err as PaperError).code).toBe("INVALID_SLIDE_INDEX");
    }
  });

  it("pre-aborted signal throws RENDER_CANCELLED", async () => {
    const doc = makeDoc(1);
    const controller = new AbortController();
    controller.abort();

    await expect(
      PaperEngine.renderToImages(doc, {
        width: 200,
        signal: controller.signal,
      }),
    ).rejects.toThrow(PaperError);

    try {
      await PaperEngine.renderToImages(doc, {
        width: 200,
        signal: controller.signal,
      });
    } catch (err) {
      expect((err as PaperError).code).toBe("RENDER_CANCELLED");
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Edge Cases
// ---------------------------------------------------------------------------

describe.skipIf(!canvasAvailable)("renderToImages edge cases", () => {
  it("duplicate slide indices [0, 0] returns 2 images both with slideIndex 0", async () => {
    const doc = makeDoc(2);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      slides: [0, 0],
    });
    expect(images).toHaveLength(2);
    expect(images[0].slideIndex).toBe(0);
    expect(images[1].slideIndex).toBe(0);
  });

  it("out-of-order indices [2, 0] renders in that order", async () => {
    const doc = makeDoc(3);
    const images = await PaperEngine.renderToImages(doc, {
      width: 200,
      slides: [2, 0],
    });
    expect(images).toHaveLength(2);
    expect(images[0].slideIndex).toBe(2);
    expect(images[1].slideIndex).toBe(0);
  });

  it("4:3 aspect ratio (1280x960): width 400 produces height 300", async () => {
    const doc = makeDoc43(1);
    const images = await PaperEngine.renderToImages(doc, { width: 400 });
    expect(images).toHaveLength(1);
    expect(images[0].width).toBe(400);
    expect(images[0].height).toBe(300);
  });
});
