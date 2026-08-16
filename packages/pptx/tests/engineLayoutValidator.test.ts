// WS-4: engine-level pre-render layout validator. The interpreter-side
// validator has always covered Agent-mode. This test suite pins the same
// check on direct PaperDocument inputs through the public PaperEngine
// entry point.

import { describe, expect, it } from "vitest";
import { runEngineLayoutValidation } from "../src/engine/layoutValidator.js";
import { PaperEngine } from "../src/engine.js";
import { PaperError } from "../src/errors.js";
import type { PaperDocument } from "../src/types/ast.js";

function docWithOverlappingShapes(): PaperDocument {
  // Two absolutely-positioned Views with identical rect and no zIndex —
  // the layout validator fires POTENTIAL_COLLISION for this shape.
  return {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "View",
            style: {
              position: "absolute",
              left: 100,
              top: 100,
              width: 200,
              height: 100,
              fill: { type: "solid", color: "#ff0000" },
            },
            children: [],
          },
          {
            type: "View",
            style: {
              position: "absolute",
              left: 100,
              top: 100,
              width: 200,
              height: 100,
              fill: { type: "solid", color: "#00ff00" },
            },
            children: [],
          },
        ],
      },
    ],
  };
}

function cleanDoc(): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "Hello",
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 800,
              height: 80,
              fontSize: 48,
            },
          },
        ],
      },
    ],
  };
}

describe("engine layout validator", () => {
  it("returns warnings for overlapping absolute views in 'warn' mode", () => {
    const doc = docWithOverlappingShapes();
    const warnings = runEngineLayoutValidation(doc, { layoutValidation: "warn" });
    expect(warnings.some((w) => w.code === "POTENTIAL_COLLISION")).toBe(true);
  });

  it("throws AGENT_LAYOUT_VALIDATION_FAILED in 'error' mode when warnings fire", () => {
    const doc = docWithOverlappingShapes();
    expect(() =>
      runEngineLayoutValidation(doc, { layoutValidation: "error" }),
    ).toThrow(PaperError);
    try {
      runEngineLayoutValidation(docWithOverlappingShapes(), {
        layoutValidation: "error",
      });
    } catch (err) {
      const pe = err as PaperError;
      expect(pe.code).toBe("AGENT_LAYOUT_VALIDATION_FAILED");
      expect(pe.phase).toBe("layout");
      expect(pe.remediation).toBeTruthy();
      expect(Array.isArray(pe.path)).toBe(true);
    }
  });

  it("skips validation in 'off' mode", () => {
    const doc = docWithOverlappingShapes();
    const warnings = runEngineLayoutValidation(doc, { layoutValidation: "off" });
    expect(warnings).toEqual([]);
  });

  it("does not double-validate the same document", () => {
    const doc = docWithOverlappingShapes();
    const first = runEngineLayoutValidation(doc, { layoutValidation: "warn" });
    const second = runEngineLayoutValidation(doc, { layoutValidation: "warn" });
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]); // already marked validated
  });

  it("invokes onLayoutWarning for each warning", () => {
    const doc = docWithOverlappingShapes();
    const collected: string[] = [];
    runEngineLayoutValidation(doc, {
      layoutValidation: "warn",
      onLayoutWarning: (w) => collected.push(w.code),
    });
    expect(collected.length).toBeGreaterThan(0);
  });

  it("PaperEngine.render honors layoutValidation: 'error' on direct PaperDocument input", async () => {
    await expect(
      PaperEngine.render(docWithOverlappingShapes(), { layoutValidation: "error" }),
    ).rejects.toThrow(/AGENT_LAYOUT_VALIDATION_FAILED|Pre-render layout validation failed/);
  });

  it("PaperEngine.render succeeds on clean document with layoutValidation: 'error'", async () => {
    const buf = await PaperEngine.render(cleanDoc(), { layoutValidation: "error" });
    expect(Buffer.isBuffer(buf)).toBe(true);
  }, 30000);
});
