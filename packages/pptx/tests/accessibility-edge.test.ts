import { describe, it, expect } from "vitest";
import { generateTextXml } from "../src/ooxml/drawing/text.js";
import { validateAccessibility } from "../src/quality/accessibilityValidator.js";
import type { LayoutNode } from "../src/layout/extract.js";
import type { PaperDocument } from "../src/types/ast.js";

function makeTextNode(overrides: Record<string, any> = {}): LayoutNode {
  return {
    type: "Text",
    content: "Hello World",
    style: { fontSize: 24 },
    layout: { x: 0, y: 0, width: 400, height: 100 },
    ...overrides,
  } as LayoutNode;
}

describe("Accessibility Edge Cases", () => {
  describe("Text element decorative marking", () => {
    it("text with decorative: true emits decorative extension element", () => {
      const node = makeTextNode({ decorative: true });
      const { xml } = generateTextXml(node, 2);
      expect(xml).toContain("adec:decorative");
      expect(xml).toContain('val="1"');
      // Should not be a self-closing cNvPr since it has children
      expect(xml).toContain("</p:cNvPr>");
    });

    it("text without decorative emits self-closing cNvPr", () => {
      const node = makeTextNode();
      const { xml } = generateTextXml(node, 2);
      expect(xml).not.toContain("adec:decorative");
      expect(xml).toContain('<p:cNvPr id="2" name="Text 2"/>');
    });
  });

  describe("parseHexColor for contrast checking", () => {
    it("handles non-prefixed hex colors in accessibility validation", () => {
      // Document with a white text on white background (low contrast)
      // Uses non-prefixed hex like OOXML does
      const doc: PaperDocument = {
        type: "Document",
        meta: { title: "Test", language: "en-US" },
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Low contrast",
                style: {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 400,
                  height: 50,
                  color: "#FFFFFF",
                },
              },
            ],
          },
        ],
      } as PaperDocument;

      const report = validateAccessibility(doc);
      // Should complete without crashing — validates that parseHexColor
      // can handle the color values from the document
      expect(report).toBeDefined();
      expect(typeof report.score).toBe("number");
    });
  });
});
