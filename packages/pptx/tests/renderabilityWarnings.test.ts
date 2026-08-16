// WS-1b: renderability warnings registry. Every rule here catches a
// property that parses against PaperDocumentSchema but produces no
// output bytes (or surprising output) without a sibling property being
// set. Users — especially LLM agents — must see the warning rather than
// ship a silently-broken deck.

import { describe, expect, it } from "vitest";
import { emitRenderabilityWarnings } from "../src/engine/renderabilityWarnings.js";
import type { PaperDocument } from "../src/types/ast.js";

function makeDoc(children: PaperDocument["slides"][number]["children"]): PaperDocument {
  return {
    type: "Document",
    slides: [{ type: "Slide", children }],
  };
}

describe("renderabilityWarnings", () => {
  it("flags textDecorationStyle without textDecorationLine on Text", () => {
    const doc = makeDoc([
      {
        type: "Text",
        content: "x",
        style: { left: 0, top: 0, width: 100, textDecorationStyle: "dashed" },
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    expect(warnings.some((w) => w.propertyPath === "style.textDecorationStyle")).toBe(true);
  });

  it("does NOT flag textDecorationStyle when paired with textDecorationLine", () => {
    const doc = makeDoc([
      {
        type: "Text",
        content: "x",
        style: {
          left: 0,
          top: 0,
          width: 100,
          textDecorationStyle: "dashed",
          textDecorationLine: "underline",
        },
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    expect(warnings.some((w) => w.propertyPath === "style.textDecorationStyle")).toBe(false);
  });

  it("flags out-of-range lineHeight on Text", () => {
    const doc = makeDoc([
      {
        type: "Text",
        content: "x",
        style: { left: 0, top: 0, width: 100, lineHeight: -3 },
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    expect(warnings.some((w) => w.propertyPath === "style.lineHeight")).toBe(true);
  });

  it("flags borderRadius on View when shapeType overrides it", () => {
    const doc = makeDoc([
      {
        type: "View",
        shapeType: "ellipse",
        style: { left: 0, top: 0, width: 100, height: 100, borderRadius: 12 },
        children: [],
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    expect(warnings.some((w) => w.propertyPath === "style.borderRadius")).toBe(true);
  });

  it("flags out-of-range opacity on View and Text", () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { left: 0, top: 0, width: 10, height: 10, opacity: 75 },
        children: [],
      },
      {
        type: "Text",
        content: "x",
        style: { left: 0, top: 20, width: 100, opacity: -1 },
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    const paths = warnings.map((w) => `${w.nodeType}.${w.propertyPath}`);
    expect(paths).toContain("View.style.opacity");
    expect(paths).toContain("Text.style.opacity");
  });

  it("flags absurd rotation values on View", () => {
    const doc = makeDoc([
      {
        type: "View",
        style: { left: 0, top: 0, width: 10, height: 10, rotation: 7200 },
        children: [],
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    expect(warnings.some((w) => w.propertyPath === "style.rotation")).toBe(true);
  });

  it("produces no warnings for a clean document", () => {
    const doc = makeDoc([
      {
        type: "Text",
        content: "hello",
        style: { left: 0, top: 0, width: 200, fontSize: 16, opacity: 0.9 },
      },
      {
        type: "View",
        style: { left: 0, top: 40, width: 100, height: 50, borderRadius: 8, opacity: 1, rotation: 15 },
        children: [],
      },
    ]);
    const warnings = emitRenderabilityWarnings(doc);
    expect(warnings).toHaveLength(0);
  });
});
