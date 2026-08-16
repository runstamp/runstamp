/**
 * Edge case tests for image rendering.
 */
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../../../src/engine.js";
import { makeDoc, RED_PIXEL } from "../helpers/templateHelpers.js";
import {
  assertValidPptx, assertImageCount,
} from "../helpers/verificationUtils.js";
import type { PaperSlide, PaperImage } from "../../../src/types/ast.js";

const TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg==";

describe("Image Edge Cases", () => {
  // T-IMG-01: Transparent PNG renders
  it("T-IMG-01: transparent PNG renders", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [{
        type: "Image",
        src: TRANSPARENT_PIXEL,
        style: { position: "absolute", top: 100, left: 100, width: 200, height: 200 },
      } as PaperImage],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-IMG-02: 50 identical images should produce fewer than 50 media files (dedup)
  it("T-IMG-02: 50 identical images are deduplicated", async () => {
    const children = Array.from({ length: 50 }, (_, i) => ({
      type: "Image",
      src: RED_PIXEL,
      style: {
        position: "absolute",
        top: Math.floor(i / 10) * 50,
        left: (i % 10) * 90,
        width: 80,
        height: 40,
      },
    } as PaperImage));
    const doc = makeDoc([{ type: "Slide", children } as PaperSlide]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertImageCount(buffer, 1);
  });

  // T-IMG-03: Extreme aspect ratio image (very wide)
  it("T-IMG-03: extreme aspect ratio image renders", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [{
        type: "Image",
        src: RED_PIXEL,
        style: { position: "absolute", top: 200, left: 0, width: 960, height: 10 },
      } as PaperImage],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });
});
