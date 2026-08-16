import { describe, expect, it } from "vitest";

import { applyAutoFit } from "../src/engine/textFit.js";
import type { LayoutNode } from "../src/layout/extract.js";

describe("engine text fit", () => {
  it("truncates overflowing text content in place", () => {
    const node = {
      type: "Text",
      content: "This sentence is intentionally too long for the box.",
      layout: { x: 0, y: 0, width: 48, height: 20 },
      style: {
        fontSize: 18,
        textFit: { policy: "truncate", marker: "..." },
      },
    } as unknown as LayoutNode & { content: string };

    applyAutoFit(node);

    expect(node.content).toMatch(/\.\.\.$/);
    expect(node.content.length).toBeLessThan("This sentence is intentionally too long for the box.".length);
  });

  it("expands fitHeight text nodes to the required measured height", () => {
    const node = {
      type: "Text",
      content: "Alpha beta gamma delta epsilon zeta eta theta.",
      layout: { x: 0, y: 0, width: 60, height: 10 },
      style: {
        fontSize: 18,
        textFit: { policy: "fitHeight" },
      },
    } as unknown as LayoutNode;

    applyAutoFit(node);

    expect(node.layout.height).toBeGreaterThan(10);
  });
});
