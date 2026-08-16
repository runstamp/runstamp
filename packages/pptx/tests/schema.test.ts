import { describe, it, expect } from "vitest";
import { PaperDocumentSchema } from "../src/validator/schema.js";

// ---------------------------------------------------------------------------
// Benchmark 1: Zod Recursion Safety
// A deeply nested Document must parse without a call-stack overflow.
// ---------------------------------------------------------------------------
describe("PaperDocumentSchema — Benchmark 1: recursion safety", () => {
  it("validates a deeply nested View tree (Slide→View→View→View→Text)", () => {
    const doc = {
      type: "Document",
      meta: { title: "Deep Deck" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              children: [
                {
                  type: "View",
                  children: [
                    {
                      type: "View",
                      children: [
                        { type: "Text", content: "leaf" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => PaperDocumentSchema.parse(doc)).not.toThrow();
    const result = PaperDocumentSchema.parse(doc);
    expect(result.type).toBe("Document");
  });

  it("accepts a valid document with all node types", () => {
    const doc = {
      type: "Document",
      meta: { author: "Runstamp" },
      slides: [
        {
          type: "Slide",
          style: { width: 960, height: 540 },
          children: [
            {
              type: "Text",
              style: { fontSize: 32, color: "#FFFFFF", backgroundColor: "#000000" },
              content: "Hello",
            },
            {
              type: "Image",
              style: { width: "50%" },
              src: "data:image/png;base64,AA==",
            },
            {
              type: "View",
              style: { flexDirection: "row" },
              children: [],
            },
          ],
        },
      ],
    };

    expect(() => PaperDocumentSchema.parse(doc)).not.toThrow();
  });

  it("rejects a document missing required slides array", () => {
    const bad = { type: "Document", meta: {} };
    expect(() => PaperDocumentSchema.parse(bad)).toThrow();
  });

  it("accepts a Text node with neither content nor paragraphs (renders empty)", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [{ type: "Text", style: {} }], // no content — valid, renders empty
        },
      ],
    };
    // content is optional (paragraphs can be used instead, or the node renders empty)
    expect(() => PaperDocumentSchema.parse(doc)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Benchmark 2: Strict Hex Color Validation
// CSS named colors must be rejected; only #RRGGBB format is valid.
// ---------------------------------------------------------------------------
describe("PaperDocumentSchema — Benchmark 2: hex color enforcement", () => {
  function docWithBgColor(color: string) {
    return {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          style: { backgroundColor: color },
          children: [],
        },
      ],
    };
  }

  it("rejects CSS named color 'red' in backgroundColor", () => {
    expect(() => PaperDocumentSchema.parse(docWithBgColor("red"))).toThrow();
  });

  it("rejects CSS named color 'white' in backgroundColor", () => {
    expect(() => PaperDocumentSchema.parse(docWithBgColor("white"))).toThrow();
  });

  it("rejects shorthand hex '#FFF'", () => {
    expect(() => PaperDocumentSchema.parse(docWithBgColor("#FFF"))).toThrow();
  });

  it("rejects rgb() notation", () => {
    expect(() =>
      PaperDocumentSchema.parse(docWithBgColor("rgb(255,0,0)")),
    ).toThrow();
  });

  it("accepts valid 6-digit lowercase hex", () => {
    expect(() =>
      PaperDocumentSchema.parse(docWithBgColor("#ff0000")),
    ).not.toThrow();
  });

  it("accepts valid 6-digit uppercase hex", () => {
    expect(() =>
      PaperDocumentSchema.parse(docWithBgColor("#FF0000")),
    ).not.toThrow();
  });

  it("rejects CSS named color 'blue' in Text style.color", () => {
    const doc = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", style: { color: "blue" }, content: "hi" },
          ],
        },
      ],
    };
    expect(() => PaperDocumentSchema.parse(doc)).toThrow();
  });
});
