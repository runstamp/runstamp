import { describe, expect, it } from "vitest";
import {
  collectAbsoluteDocumentLayoutDebug,
  collectAbsoluteSlideLayoutDebug,
} from "../src/layout/absoluteSafety.js";
import type { PaperDocument } from "../src/types/ast.js";

function diagnosticDoc(): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "This copy is deliberately too large for the box.",
          style: {
            position: "absolute",
            left: 40,
            top: 50,
            width: 120,
            height: 22,
            fontSize: 34,
          },
        },
        {
          type: "View",
          style: {
            position: "absolute",
            left: 70,
            top: 60,
            width: 140,
            height: 80,
            fill: { type: "solid", color: "#ff0000" },
          },
          children: [],
        },
      ],
    }],
  };
}

describe("absolute layout debug model", () => {
  it("captures absolute node coordinates, text measurement, and stable issue ids", () => {
    const doc = diagnosticDoc();
    const [debug] = collectAbsoluteDocumentLayoutDebug(doc);

    expect(debug.nodes).toHaveLength(2);
    expect(debug.nodes[0].rect).toMatchObject({ left: 40, top: 50, width: 120, height: 22 });
    expect(debug.nodes[0].textFit?.availableWidth).toBe(120);
    expect(debug.nodes[0].textFit?.lineHeightClips).toBe(true);
    expect(debug.issues.some((issue) => issue.code === "TEXT_CLIP")).toBe(true);
    expect(debug.issues.some((issue) => issue.code === "NODE_COLLISION")).toBe(true);
    expect(debug.issues.every((issue) => issue.issueId.length > issue.code.length)).toBe(true);
    expect(debug.issues.every((issue) => issue.rect)).toBe(true);
  });

  it("uses the requested slide size in debug output", () => {
    const slide = diagnosticDoc().slides[0];
    const debug = collectAbsoluteSlideLayoutDebug(slide, 0, { width: 1000, height: 600 });
    expect(debug.slideSize).toEqual({ width: 1000, height: 600 });
  });
});
