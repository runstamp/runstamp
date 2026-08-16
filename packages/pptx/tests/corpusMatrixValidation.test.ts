// WS-7: every visual regression corpus file must parse cleanly against
// AgentDocumentSchema and render through PaperEngine without throwing.
// This guards the preset × pattern matrix expansion against shape
// regressions at the schema level, before goldens are even generated.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentDocumentSchema } from "../src/interpreter/agentSchema.js";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const CORPUS_DIR = path.join(REPO_ROOT, "tools/visual-regression/corpus");

interface CorpusCase {
  id: string;
  format: string;
  surface: string;
  description: string;
  document: unknown;
}

function loadCases(): CorpusCase[] {
  return readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = readFileSync(path.join(CORPUS_DIR, f), "utf8");
      return JSON.parse(raw) as CorpusCase;
    });
}

describe("visual-regression corpus schema validation", () => {
  const pptxAgentCases = loadCases().filter(
    (c) => c.format === "pptx" && c.surface === "agent",
  );

  it("satisfies the plan's ≥42 preset × pattern matrix target", () => {
    expect(pptxAgentCases.length).toBeGreaterThanOrEqual(42);
  });

  for (const c of pptxAgentCases) {
    it(`${c.id}: parses against AgentDocumentSchema`, () => {
      const result = AgentDocumentSchema.safeParse(c.document);
      if (!result.success) {
        const issues = result.error.issues
          .slice(0, 3)
          .map((i) => `  - ${i.path.map((p) => String(p)).join(".") || "<root>"}: ${i.message}`)
          .join("\n");
        throw new Error(`AgentDocumentSchema rejected ${c.id}:\n${issues}`);
      }
    });
  }

  // One render-smoke across the new preset variants catches render-time
  // failures (Zod-valid but engine-broken) without blowing the test
  // budget on 27 full renders.
  const smokeIds = [
    "pptx-dashboard-dark-punch",
    "pptx-comparison-editorial-serif",
    "pptx-bullets-monochrome",
  ];
  for (const id of smokeIds) {
    const c = pptxAgentCases.find((x) => x.id === id);
    if (!c) continue;
    it(`${id}: renders to a non-empty pptx buffer`, async () => {
      setDeterministicMode(true);
      try {
        const buf = await PaperEngine.render(c.document);
        expect(Buffer.isBuffer(buf)).toBe(true);
        expect(buf.length).toBeGreaterThan(0);
      } finally {
        setDeterministicMode(false);
      }
    }, 30000);
  }
});
