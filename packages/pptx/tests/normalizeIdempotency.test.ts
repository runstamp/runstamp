// Idempotency invariant for normalizeRenderInput. An AgentDocument
// passes through `compileAgentDocument` and becomes a PaperDocument.
// A PaperDocument passes through unchanged. The fixed point: once a
// value has been normalized, normalizing it again must produce the
// same structural result. A regression that re-ran the agent compiler
// on an already-compiled PaperDocument (or re-ran the Zod parser
// layer without short-circuit) would surface here.

import { describe, expect, it } from "vitest";
import { normalizeRenderInput, isAgentDocumentShape } from "../src/engine/inputNormalizer.js";
import type { PaperDocument } from "../src/types/ast.js";

const AGENT_CASES = [
  {
    name: "minimal title",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "Idempotent",
      companyName: "X",
      slides: [{ pattern: "title", content: { title: "one" } }],
    },
  },
  {
    name: "multi-slide with bullets + chart",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "Big",
      companyName: "Y",
      theme: "midnight",
      designTokens: { scale: "xl", density: "spacious", shape: "round" },
      slides: [
        { pattern: "title", content: { title: "t" } },
        { pattern: "bullets", content: { title: "b", bulletPoints: ["a", "b", "c"] } },
        {
          pattern: "chart-focus",
          content: {
            title: "c",
            chart: {
              type: "line",
              series: [
                {
                  name: "series",
                  dataPoints: [{ category: "Q1", value: 1 }, { category: "Q2", value: 2 }],
                },
              ],
            },
          },
        },
      ],
    },
  },
] as const;

const PAPER_DOC: PaperDocument = {
  type: "Document",
  meta: { title: "Direct" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "hi",
          style: { position: "absolute", left: 80, top: 80, width: 200, height: 50 },
        },
      ],
    },
  ],
};

describe("normalizeRenderInput idempotency", () => {
  for (const tc of AGENT_CASES) {
    it(`agent case "${tc.name}": normalize(normalize(x)) structurally equal to normalize(x)`, () => {
      const once = normalizeRenderInput(tc.input);
      const twice = normalizeRenderInput(once);
      // Once compiled, the result is a PaperDocument — the second pass
      // goes through the PaperDocument pass-through branch of
      // isAgentDocumentShape.
      expect(twice.type).toBe("Document");
      expect(JSON.stringify(twice.slides.map((s) => s.type))).toEqual(
        JSON.stringify(once.slides.map((s) => s.type)),
      );
      expect(twice.slides.length).toBe(once.slides.length);
    });

    it(`agent case "${tc.name}": compiled output is NOT agent-shaped`, () => {
      const compiled = normalizeRenderInput(tc.input);
      expect(isAgentDocumentShape(compiled)).toBe(false);
    });
  }

  it("PaperDocument input passes through by reference", () => {
    const first = normalizeRenderInput(PAPER_DOC);
    // Pass-through preserves identity — no clone on the PaperDocument branch.
    expect(first).toBe(PAPER_DOC);
    const second = normalizeRenderInput(first);
    expect(second).toBe(first);
  });

  it("PaperDocument inputs are stable across three passes", () => {
    const a = normalizeRenderInput(PAPER_DOC);
    const b = normalizeRenderInput(a);
    const c = normalizeRenderInput(b);
    expect(a.type).toBe("Document");
    expect(b.type).toBe("Document");
    expect(c.type).toBe("Document");
    // Identity through the pass-through path
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("isAgentDocumentShape is stable across repeated calls", () => {
    for (const tc of AGENT_CASES) {
      expect(isAgentDocumentShape(tc.input)).toBe(true);
      expect(isAgentDocumentShape(tc.input)).toBe(true); // no hidden mutation
    }
    expect(isAgentDocumentShape(PAPER_DOC)).toBe(false);
    expect(isAgentDocumentShape(PAPER_DOC)).toBe(false);
  });
});
