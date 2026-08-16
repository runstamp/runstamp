// validateDocument enforces two resource limits before Zod parsing:
//   MAX_TOTAL_NODES  = 50_000 → RESOURCE_LIMIT_EXCEEDED
//   MAX_NESTING_DEPTH = 20    → VALIDATION_FAILED
// Neither limit was exercised by a focused test previously. A regression
// that removed or re-ordered either check would let a pathological
// document slip through to the render pipeline, where it can cost
// gigabytes of memory or hang Yoga layout.

import { describe, expect, it } from "vitest";
import { validateDocument } from "../src/engine/documentValidation.js";
import { PaperError } from "../src/errors.js";
import type { PaperDocument, PaperNode, PaperView } from "../src/types/ast.js";

function buildDeeplyNestedView(depth: number): PaperNode {
  let node: PaperView = {
    type: "View",
    style: { position: "absolute", left: 0, top: 0, width: 10, height: 10 },
    children: [],
  };
  for (let i = 1; i < depth; i += 1) {
    const parent: PaperView = {
      type: "View",
      style: { position: "absolute", left: 0, top: 0, width: 10, height: 10 },
      children: [node],
    };
    node = parent;
  }
  return node;
}

describe("validateDocument resource limits", () => {
  it("accepts a document right at MAX_NESTING_DEPTH=20", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [buildDeeplyNestedView(19)],
        },
      ],
    };
    // checkNodeLimits iterates from depth=1; 19 nested Views under a
    // slide root sums to depth 20 — the stated maximum.
    expect(() => validateDocument(doc)).not.toThrow();
  });

  it("rejects a document exceeding MAX_NESTING_DEPTH with VALIDATION_FAILED", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [buildDeeplyNestedView(25)],
        },
      ],
    };
    try {
      validateDocument(doc);
      throw new Error("expected validateDocument to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      const pe = err as PaperError;
      expect(pe.code).toBe("VALIDATION_FAILED");
      expect(pe.phase).toBe("validation");
      expect(pe.message).toContain("nesting depth");
    }
  });

  it("rejects a document exceeding MAX_TOTAL_NODES with RESOURCE_LIMIT_EXCEEDED", () => {
    // 200 slides × 251 flat Text children = 50_200 nodes → over the
    // 50_000 cap. Uses Text nodes so each counts once (no recursion).
    const children = Array.from({ length: 251 }, (_, i) => ({
      type: "Text" as const,
      content: `n${i}`,
      style: { left: 0, top: 0, width: 10 },
    }));
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: Array.from({ length: 200 }, () => ({
        type: "Slide" as const,
        children: [...children],
      })),
    };
    try {
      validateDocument(doc);
      throw new Error("expected validateDocument to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      const pe = err as PaperError;
      expect(pe.code).toBe("RESOURCE_LIMIT_EXCEEDED");
      expect(pe.phase).toBe("validation");
      expect(pe.message).toContain("node count");
    }
  });

  it("accepts a document right under MAX_TOTAL_NODES", () => {
    // 100 slides × 400 = 40_000 nodes, under the cap.
    const children = Array.from({ length: 400 }, (_, i) => ({
      type: "Text" as const,
      content: `n${i}`,
      style: { left: 0, top: 0, width: 10 },
    }));
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: Array.from({ length: 100 }, () => ({
        type: "Slide" as const,
        children: [...children],
      })),
    };
    // Zod may take a moment on 40k nodes but must not throw at limit check.
    expect(() => validateDocument(doc)).not.toThrow();
  }, 30000);
});
