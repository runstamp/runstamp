// Unified engine entry point: PaperEngine.render must accept both
// PaperDocument and AgentDocument inputs (WS-2).

import { describe, expect, it } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { isAgentDocumentShape, normalizeRenderInput } from "../src/engine/inputNormalizer.js";
import { PaperError } from "../src/errors.js";
import type { PaperDocument } from "../src/types/ast.js";

const minimalAgentDoc = {
  type: "presentation",
  presentationTitle: "Robustness Plan",
  companyName: "Runstamp",
  accentColor: "#3b82f6",
  slides: [
    {
      pattern: "title",
      content: { title: "Hello, Agent", subtitle: "Unified entry point" },
    },
  ],
} as const;

const minimalPaperDoc: PaperDocument = {
  type: "Document",
  meta: { title: "PaperDoc" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Hello, PaperDoc",
          style: { left: 80, top: 80, width: 800, fontSize: 48 },
        },
      ],
    },
  ],
};

describe("unified PaperEngine.render entry point", () => {
  describe("isAgentDocumentShape", () => {
    it("recognizes AgentDocument by discriminator", () => {
      expect(isAgentDocumentShape(minimalAgentDoc)).toBe(true);
    });

    it("recognizes AgentDocument by slide.pattern even with legacy type", () => {
      expect(
        isAgentDocumentShape({
          type: "Document",
          slides: [{ pattern: "title", title: "x" }],
        }),
      ).toBe(true);
    });

    it("treats canonical PaperDocument as non-agent", () => {
      expect(isAgentDocumentShape(minimalPaperDoc)).toBe(false);
    });

    it("returns false for null/primitive/non-object", () => {
      expect(isAgentDocumentShape(null)).toBe(false);
      expect(isAgentDocumentShape(undefined)).toBe(false);
      expect(isAgentDocumentShape("hello")).toBe(false);
      expect(isAgentDocumentShape(42)).toBe(false);
    });
  });

  describe("normalizeRenderInput", () => {
    it("passes PaperDocument through unchanged", () => {
      const out = normalizeRenderInput(minimalPaperDoc);
      expect(out).toBe(minimalPaperDoc);
    });

    it("compiles AgentDocument into PaperDocument", () => {
      const out = normalizeRenderInput(minimalAgentDoc);
      expect(out.type).toBe("Document");
      expect(out.slides.length).toBe(1);
      expect(out.meta?.title).toBe("Robustness Plan");
    });

    it("throws AGENT_INPUT_INVALID with structured issues on malformed agent input", () => {
      try {
        normalizeRenderInput({
          type: "presentation",
          // Missing required fields: presentationTitle, companyName, etc.
          slides: [{ pattern: "title" /* missing content */ }],
        });
        throw new Error("expected normalizeRenderInput to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(PaperError);
        const pe = err as PaperError;
        expect(pe.code).toBe("AGENT_INPUT_INVALID");
        expect(pe.phase).toBe("compilation");
        expect(pe.issues).toBeDefined();
        expect(pe.issues!.length).toBeGreaterThan(0);
        expect(pe.remediation).toBeTruthy();
        // First issue should have a path string
        expect(typeof pe.issues![0].path).toBe("string");
      }
    });
  });

  describe("PaperEngine.render", () => {
    it("accepts AgentDocument and returns a Buffer", async () => {
      const buf = await PaperEngine.render(minimalAgentDoc);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    }, 30000);

    it("accepts PaperDocument and returns a Buffer", async () => {
      const buf = await PaperEngine.render(minimalPaperDoc);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    }, 30000);

    it("throws AGENT_INPUT_INVALID (not low-level PaperDocument errors) for malformed agent input", async () => {
      try {
        await PaperEngine.render({
          type: "presentation",
          slides: [{ pattern: "title" }],
        } as never);
        throw new Error("expected PaperEngine.render to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(PaperError);
        const pe = err as PaperError;
        expect(pe.code).toBe("AGENT_INPUT_INVALID");
        expect(pe.phase).toBe("compilation");
      }
    });
  });
});
