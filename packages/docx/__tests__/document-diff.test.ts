import { describe, expect, it } from "vitest";
import { diffDocxDocuments } from "../src/diff/document-diff.js";
import type { DocxDocument } from "../src/schema.js";

describe("diffDocxDocuments", () => {
  it("returns no changes for identical documents", () => {
    const document: DocxDocument = {
      type: "DocxDocument",
      pages: [{
        elements: [{ type: "paragraph", text: "Hello" }],
      }],
    };

    const result = diffDocxDocuments(document, document);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBe("No changes");
  });

  it("reports heading text changes semantically", () => {
    const before: DocxDocument = {
      type: "DocxDocument",
      pages: [{
        elements: [{ type: "heading", level: 1, text: "Before", bookmarkId: "intro" }],
      }],
    };
    const after: DocxDocument = {
      type: "DocxDocument",
      pages: [{
        elements: [{ type: "heading", level: 1, text: "After", bookmarkId: "intro" }],
      }],
    };

    const result = diffDocxDocuments(before, after);

    expect(result.statistics.modified).toBe(1);
    expect(result.changes[0]?.description).toBe("Heading text changed on page 1");
    expect(result.summary).toContain("1 heading text modified");
  });

  it("reports table row additions", () => {
    const before: DocxDocument = {
      type: "DocxDocument",
      pages: [{
        elements: [{
          type: "table",
          rows: [{ cells: [{ text: "A" }, { text: "B" }] }],
        }],
      }],
    };
    const after: DocxDocument = {
      type: "DocxDocument",
      pages: [{
        elements: [{
          type: "table",
          rows: [
            { cells: [{ text: "A" }, { text: "B" }] },
            { cells: [{ text: "C" }, { text: "D" }] },
          ],
        }],
      }],
    };

    const result = diffDocxDocuments(before, after);

    expect(result.changes[0]?.description).toBe("Table row 2 added on page 1");
    expect(result.summary).toContain("1 table row added");
  });

  it("reports root header changes once", () => {
    const before: DocxDocument = {
      type: "DocxDocument",
      header: { text: "Before" },
      pages: [{
        elements: [{ type: "paragraph", text: "Hello" }],
      }],
    };
    const after: DocxDocument = {
      type: "DocxDocument",
      header: { text: "After" },
      pages: [{
        elements: [{ type: "paragraph", text: "Hello" }],
      }],
    };

    const result = diffDocxDocuments(before, after);

    expect(result.changes[0]?.description).toBe("header changed");
    expect(result.summary).toContain("1 header/footer modified");
  });
});
