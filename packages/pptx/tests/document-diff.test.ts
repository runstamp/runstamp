import { describe, expect, it } from "vitest";
import { diffDocuments } from "../src/quality/document-diff.js";
import type { PaperDocument } from "../src/types/ast.js";

describe("diffDocuments", () => {
  it("returns no changes for identical PPTX documents", () => {
    const document: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children: [{ type: "Text", content: "Hello" }] }],
    };

    const result = diffDocuments(document, document);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBe("No changes");
  });

  it("reports semantic text changes", () => {
    const before: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children: [{ type: "Text", content: "Hello" }] }],
    };
    const after: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children: [{ type: "Text", content: "Updated" }] }],
    };

    const result = diffDocuments(before, after);

    expect(result.statistics.modified).toBe(1);
    expect(result.changes[0]?.description).toBe("Text changed on slide 1");
    expect(result.summary).toContain("1 text modified");
  });

  it("detects moved nodes when morphId is stable", () => {
    const before: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [
          { type: "Image", src: "https://example.com/a.png", morphId: "hero-a" },
          { type: "Image", src: "https://example.com/b.png", morphId: "hero-b" },
        ],
      }],
    };
    const after: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [
          { type: "Image", src: "https://example.com/b.png", morphId: "hero-b" },
          { type: "Image", src: "https://example.com/a.png", morphId: "hero-a" },
        ],
      }],
    };

    const result = diffDocuments(before, after);

    expect(result.statistics.moved).toBe(1);
    expect(result.changes[0]?.description).toBe("Image moved on slide 1");
  });

  it("reports table row additions semantically", () => {
    const before: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          tableData: {
            columns: [100, 100],
            rows: [{ cells: [{ text: "A" }, { text: "B" }] }],
          },
        }],
      }],
    };
    const after: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Table",
          tableData: {
            columns: [100, 100],
            rows: [
              { cells: [{ text: "A" }, { text: "B" }] },
              { cells: [{ text: "C" }, { text: "D" }] },
            ],
          },
        }],
      }],
    };

    const result = diffDocuments(before, after);

    expect(result.changes[0]?.description).toBe("Table row 2 added on slide 1");
    expect(result.summary).toContain("1 table row added");
  });
});
