/**
 * Edge case tests for layout rendering.
 */
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../../../src/engine.js";
import { makeDoc, textNode } from "../helpers/templateHelpers.js";
import {
  assertValidPptx, getSlideShapeCount,
} from "../helpers/verificationUtils.js";
import type { PaperSlide, PaperView, PaperNode } from "../../../src/types/ast.js";

describe("Layout Edge Cases", () => {
  // T-LAYOUT-01: 50+ shapes on a single slide
  it("T-LAYOUT-01: 50+ shapes on a single slide renders", async () => {
    const children: PaperNode[] = Array.from({ length: 55 }, (_, i) => ({
      type: "View",
      style: {
        position: "absolute",
        top: Math.floor(i / 11) * 100,
        left: (i % 11) * 85,
        width: 75,
        height: 90,
        backgroundColor: `#${((i * 47) % 256).toString(16).padStart(2, "0")}88FF`,
      },
    } as PaperView));
    const doc = makeDoc([{ type: "Slide", children } as PaperSlide]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    const count = await getSlideShapeCount(buffer, 0);
    expect(count).toBeGreaterThanOrEqual(50);
  });

  // T-LAYOUT-02: Deeply nested Views (10 levels deep)
  it("T-LAYOUT-02: 10 levels of nested Views render", async () => {
    // Build inside-out: innermost first
    let current: PaperNode = textNode("Innermost", {
      fontSize: 10, color: "#FFFFFF",
    });

    for (let i = 9; i >= 0; i--) {
      current = {
        type: "View",
        style: {
          padding: 4,
          backgroundColor: `#${(i * 25).toString(16).padStart(2, "0")}${(i * 20).toString(16).padStart(2, "0")}${(255 - i * 20).toString(16).padStart(2, "0")}`,
          flexDirection: "column",
        },
        children: [current],
      } as PaperView;
    }

    const doc = makeDoc([{
      type: "Slide",
      children: [{
        type: "View",
        style: { position: "absolute", top: 40, left: 40, width: 880, height: 460 },
        children: [current],
      } as PaperView],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });
});
