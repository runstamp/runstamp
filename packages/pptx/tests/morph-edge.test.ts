import { describe, it, expect } from "vitest";
import { generateShapeXml } from "../src/ooxml/drawing/shape.js";
import { generateTextXml } from "../src/ooxml/drawing/text.js";
import type { LayoutNode } from "../src/layout/extract.js";

function makeShapeNode(overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    type: "View",
    style: { backgroundColor: "#CCCCCC" },
    layout: { x: 0, y: 0, width: 200, height: 100 },
    ...overrides,
  } as LayoutNode;
}

describe("Morph Edge Cases", () => {
  it("morphId with XML-special characters is properly escaped in shape name", () => {
    const node = makeShapeNode({ morphId: 'hero<"card">' } as any);
    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('name="!!hero&lt;&quot;card&quot;&gt;"');
    expect(xml).not.toContain('name="!!hero<"card">"');
  });

  it("morphId with ampersand is escaped", () => {
    const node = makeShapeNode({ morphId: "a&b" } as any);
    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('name="!!a&amp;b"');
  });

  it("very long morphId (>200 chars) still serializes without error", () => {
    const longId = "x".repeat(250);
    const node = makeShapeNode({ morphId: longId } as any);
    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain(`name="!!${longId}"`);
    expect(xml).toContain("<p:sp>");
  });
});
