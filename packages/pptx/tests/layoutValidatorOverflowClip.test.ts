// WS-4 completeness: existing engineLayoutValidator.test.ts covers
// POTENTIAL_COLLISION only. This suite adds focused reproducers for
// the two other warnings the validator is advertised to catch:
// POTENTIAL_OVERFLOW and POTENTIAL_CLIP. Without these, a regression
// that removed the text-fit or clip checks would pass all other
// tests while silently letting broken decks through.

import { describe, expect, it } from "vitest";
import { runEngineLayoutValidation } from "../src/engine/layoutValidator.js";
import { PaperError } from "../src/errors.js";
import type { PaperDocument } from "../src/types/ast.js";

function docWithClippedText(): PaperDocument {
  // fontSize 48, container height 20 → nominalLineHeight ~57.6 > 20 → CLIP
  return {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "Clipped",
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 400,
              height: 20,
              fontSize: 48,
            },
          },
        ],
      },
    ],
  };
}

function docWithOverflowingText(): PaperDocument {
  // 400+ characters of unbreakable-ish prose in a 120×40 container with
  // fontSize 28. computeAutoFit must report overflow=true.
  const longText =
    "This is an extremely long piece of prose intended to exceed the "
    + "horizontal and vertical bounds of its parent container by a "
    + "substantial margin; the validator's text-fit pass should catch "
    + "it before a render ever reaches the OOXML writer. Continuing on "
    + "at length to ensure the autoFit estimator exceeds the box.";
  return {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: longText,
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 120,
              height: 40,
              fontSize: 28,
            },
          },
        ],
      },
    ],
  };
}

function docWithHealthyText(): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "Small happy text",
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 800,
              height: 100,
              fontSize: 20,
            },
          },
        ],
      },
    ],
  };
}

describe("layout validator POTENTIAL_CLIP", () => {
  it("fires when fontSize × 1.2 × 0.95 exceeds container height", () => {
    const warnings = runEngineLayoutValidation(docWithClippedText(), {
      layoutValidation: "warn",
    });
    expect(warnings.some((w) => w.code === "POTENTIAL_CLIP")).toBe(true);
  });

  it("promotes to AGENT_LAYOUT_VALIDATION_FAILED in 'error' mode with structured path", () => {
    try {
      runEngineLayoutValidation(docWithClippedText(), { layoutValidation: "error" });
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      const pe = err as PaperError;
      expect(pe.code).toBe("AGENT_LAYOUT_VALIDATION_FAILED");
      expect(pe.message).toContain("POTENTIAL_CLIP");
      expect(pe.path && pe.path.length).toBeTruthy();
    }
  });

  it("does NOT fire when container height is comfortable for the font", () => {
    const warnings = runEngineLayoutValidation(docWithHealthyText(), {
      layoutValidation: "warn",
    });
    expect(warnings.some((w) => w.code === "POTENTIAL_CLIP")).toBe(false);
  });
});

describe("layout validator POTENTIAL_OVERFLOW", () => {
  it("fires when text is too long for the container rect", () => {
    const warnings = runEngineLayoutValidation(docWithOverflowingText(), {
      layoutValidation: "warn",
    });
    expect(warnings.some((w) => w.code === "POTENTIAL_OVERFLOW")).toBe(true);
  });

  it("promotes to AGENT_LAYOUT_VALIDATION_FAILED in 'error' mode", () => {
    try {
      runEngineLayoutValidation(docWithOverflowingText(), {
        layoutValidation: "error",
      });
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PaperError);
      const pe = err as PaperError;
      expect(pe.code).toBe("AGENT_LAYOUT_VALIDATION_FAILED");
      expect(pe.message).toMatch(/POTENTIAL_(OVERFLOW|CLIP)/);
    }
  });

  it("does NOT fire for a small string in a generous container", () => {
    const warnings = runEngineLayoutValidation(docWithHealthyText(), {
      layoutValidation: "warn",
    });
    expect(warnings.some((w) => w.code === "POTENTIAL_OVERFLOW")).toBe(false);
  });
});
