// Negative-path fuzz for the agent compile gate. The WS-8 promise is:
// every failed render from malformed agent input produces a structured
// PaperError with code AGENT_INPUT_INVALID, a non-empty `path` from the
// failing Zod issue, a helpful `remediation`, and the full issue list
// on `issues`. This fuzz builds a menu of deliberately-broken variants
// and asserts the promise holds for each.

import { describe, expect, it } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { PaperError } from "../src/errors.js";
import { normalizeRenderInput } from "../src/engine/inputNormalizer.js";

interface NegativeCase {
  name: string;
  input: unknown;
  expectPathContains?: string;
}

const NEGATIVE_CASES: NegativeCase[] = [
  {
    name: "missing slides",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "no slides",
      companyName: "X",
      // slides omitted entirely
    },
    expectPathContains: "slides",
  },
  {
    name: "slide with invalid pattern",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "bad pattern",
      companyName: "X",
      slides: [{ pattern: "spreadsheet", content: { title: "x" } }],
    },
    expectPathContains: "pattern",
  },
  {
    name: "pattern without required content",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "no content",
      companyName: "X",
      slides: [{ pattern: "title" }], // content missing
    },
    expectPathContains: "content",
  },
  {
    name: "invalid scale value",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "bad scale",
      companyName: "X",
      designTokens: { scale: "gigantic" },
      slides: [{ pattern: "title", content: { title: "x" } }],
    },
    expectPathContains: "scale",
  },
  {
    name: "invalid density value",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "bad density",
      companyName: "X",
      designTokens: { density: "tiny" },
      slides: [{ pattern: "title", content: { title: "x" } }],
    },
    expectPathContains: "density",
  },
  {
    name: "invalid shape value",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "bad shape",
      companyName: "X",
      designTokens: { shape: "triangular" },
      slides: [{ pattern: "title", content: { title: "x" } }],
    },
    expectPathContains: "shape",
  },
  {
    name: "invalid preset name",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "bad preset",
      companyName: "X",
      theme: "neon-chaos",
      slides: [{ pattern: "title", content: { title: "x" } }],
    },
    expectPathContains: "theme",
  },
  {
    name: "negative fontSize override",
    input: {
      type: "presentation",
      version: "1.0",
      presentationTitle: "bad font",
      companyName: "X",
      designTokens: { typography: { kpiValueSize: -42 } },
      slides: [{ pattern: "title", content: { title: "x" } }],
    },
    expectPathContains: "kpiValueSize",
  },
];

describe("agent negative-path fuzz (structured error promise)", () => {
  for (const tc of NEGATIVE_CASES) {
    it(`${tc.name}: throws PaperError AGENT_INPUT_INVALID with structured fields`, () => {
      try {
        normalizeRenderInput(tc.input);
        throw new Error("expected normalizeRenderInput to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(PaperError);
        const pe = err as PaperError;
        expect(pe.code).toBe("AGENT_INPUT_INVALID");
        expect(pe.phase).toBe("compilation");
        expect(pe.issues, "issues populated").toBeDefined();
        expect(pe.issues!.length).toBeGreaterThan(0);
        expect(pe.remediation, "remediation non-empty").toBeTruthy();
        expect(typeof pe.remediation).toBe("string");
        if (tc.expectPathContains) {
          const firstPath = pe.issues![0].path;
          expect(firstPath).toContain(tc.expectPathContains);
        }
      }
    });

    it(`${tc.name}: PaperEngine.render rejects with matching error`, async () => {
      await expect(PaperEngine.render(tc.input as never)).rejects.toMatchObject({
        code: "AGENT_INPUT_INVALID",
        phase: "compilation",
      });
    });
  }

  it("every issue in the full list has a non-empty path string", () => {
    // A multi-issue malformed input — ensures every issue (not just the
    // first) carries a structured path.
    try {
      normalizeRenderInput({
        type: "presentation",
        // missing presentationTitle, companyName
        designTokens: { scale: "huge", density: "thin" },
        slides: [
          { pattern: "???", content: {} },
        ],
      });
      throw new Error("expected to throw");
    } catch (err) {
      const pe = err as PaperError;
      expect(pe.issues!.length).toBeGreaterThan(1);
      for (const issue of pe.issues!) {
        expect(typeof issue.path).toBe("string");
        expect(issue.path.length).toBeGreaterThan(0);
        expect(issue.message).toBeTruthy();
      }
    }
  });
});
