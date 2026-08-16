import { describe, it, expect } from "vitest";
import { sortByZIndex, flattenDocumentZIndex } from "../src/zIndex.js";
import type { PaperDocument } from "../src/types/ast.js";

describe("sortByZIndex — Benchmark 3", () => {
  it("sorts by zIndex ascending and strips zIndex from output", () => {
    const input = [
      { id: "A", zIndex: 2 },
      { id: "B", zIndex: 1 },
      { id: "C", zIndex: 3 },
    ];
    expect(sortByZIndex(input)).toEqual([
      { id: "B" },
      { id: "A" },
      { id: "C" },
    ]);
  });

  it("uses original array index as stable tiebreaker for equal zIndex", () => {
    const input = [
      { id: "X", zIndex: 1 },
      { id: "Y", zIndex: 1 },
      { id: "Z", zIndex: 1 },
    ];
    expect(sortByZIndex(input)).toEqual([{ id: "X" }, { id: "Y" }, { id: "Z" }]);
  });

  it("treats missing zIndex as 0", () => {
    const input = [{ id: "A", zIndex: 1 }, { id: "B" }, { id: "C", zIndex: -1 }];
    expect(sortByZIndex(input)).toEqual([{ id: "C" }, { id: "B" }, { id: "A" }]);
  });
});

describe("flattenDocumentZIndex — AST walker", () => {
  it("sorts slide children by style.zIndex and removes zIndex from styles", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", style: { zIndex: 2 }, content: "A" },
            { type: "Text", style: { zIndex: 1 }, content: "B" },
            { type: "Image", style: { zIndex: 3 }, src: "data:image/png;base64,AA==" },
          ],
        },
      ],
    };

    const result = flattenDocumentZIndex(doc);
    const children = result.slides[0].children;

    // Order should be: B(z=1), A(z=2), Image(z=3)
    expect((children[0] as { content: string }).content).toBe("B");
    expect((children[1] as { content: string }).content).toBe("A");
    expect(children[2].type).toBe("Image");

    // zIndex should be stripped from all styles
    for (const child of children) {
      expect(child.style).not.toHaveProperty("zIndex");
    }
  });

  it("recursively sorts View children by style.zIndex", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              children: [
                { type: "Text", style: { zIndex: 5 }, content: "inner-A" },
                { type: "Text", style: { zIndex: 2 }, content: "inner-B" },
              ],
            },
          ],
        },
      ],
    };

    const result = flattenDocumentZIndex(doc);
    const view = result.slides[0].children[0] as {
      type: "View";
      children: Array<{ content: string }>;
    };
    expect(view.children[0].content).toBe("inner-B");
    expect(view.children[1].content).toBe("inner-A");
  });
});
