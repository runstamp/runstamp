// Deterministic reproducibility invariant. With setDeterministicMode(true),
// two successive PaperEngine.render calls over the same input must
// produce byte-identical PPTX buffers. Visual regression (tools/visual-
// regression) and its golden manifest depend on this: if the engine
// introduced a non-deterministic element (timestamp, random UUID,
// insertion-order-dependent dict iteration), every preview/golden
// comparison breaks silently.
//
// Covered variants: PaperDocument path, AgentDocument path, each of the
// seven presets × six patterns (smoke subset).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PaperEngine, createEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { RenderContext, withContext } from "../src/renderContext.js";
import type { PaperDocument } from "../src/types/ast.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function loadCorpusCase(id: string): unknown {
  const file = path.join(
    REPO_ROOT,
    "tools/visual-regression/corpus",
    `${id}.json`,
  );
  const raw = JSON.parse(readFileSync(file, "utf8")) as { document: unknown };
  return raw.document;
}

// Use a fresh RenderContext per render so shared-state leakage (font
// caches, chart-asset counters, media dedup tables from prior tests)
// doesn't bleed into the determinism assertion. This matches the path
// `createEngine` production callers take and pins the invariant as
// "identical-input + fresh-context = identical-output."
async function renderTwice(input: unknown): Promise<[Buffer, Buffer]> {
  async function one(): Promise<Buffer> {
    const ctx = new RenderContext({ engineMode: "pro" });
    ctx.deterministicMode.setDeterministicMode(true);
    return withContext(ctx, () => PaperEngine.render(input as never));
  }
  const a = await one();
  const b = await one();
  return [a, b];
}

describe("deterministic reproducibility", () => {
  it("AgentDocument: two renders of the default-navy title baseline are byte-identical", async () => {
    const [a, b] = await renderTwice(loadCorpusCase("pptx-title"));
    expect(a.equals(b)).toBe(true);
  }, 60000);

  it("AgentDocument: every preset's title variant is byte-deterministic", async () => {
    const presetCases = [
      "pptx-title",
      "pptx-title-editorial-serif",
      "pptx-title-monochrome",
      "pptx-title-dark-punch",
      "pptx-title-midnight",
      "pptx-title-terminal",
      "pptx-title-editorial-wide",
    ];
    for (const id of presetCases) {
      const [a, b] = await renderTwice(loadCorpusCase(id));
      expect(a.equals(b), `${id} not byte-equal across renders`).toBe(true);
    }
  }, 120000);

  it("AgentDocument: every pattern on the default preset is byte-deterministic", async () => {
    const patternCases = [
      "pptx-title",
      "pptx-statement",
      "pptx-dashboard",
      "pptx-comparison",
      "pptx-chart-focus",
      "pptx-bullets",
    ];
    for (const id of patternCases) {
      const [a, b] = await renderTwice(loadCorpusCase(id));
      expect(a.equals(b), `${id} not byte-equal across renders`).toBe(true);
    }
  }, 120000);

  it("PaperDocument: direct-AST input is byte-deterministic", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Determinism" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              content: "DeterministicAnchor",
              style: {
                position: "absolute",
                left: 80,
                top: 80,
                width: 800,
                height: 80,
                fontSize: 36,
              },
            },
            {
              type: "View",
              style: {
                position: "absolute",
                left: 80,
                top: 200,
                width: 400,
                height: 200,
                fill: { type: "solid", color: "#3b82f6" },
                borderRadius: 12,
              },
              children: [],
            },
          ],
        },
      ],
    };
    const [a, b] = await renderTwice(doc);
    expect(a.equals(b)).toBe(true);
  }, 60000);

  it("determinism requires the flag — without it, identical inputs MAY differ", async () => {
    // Not an enforced assertion (non-det output is allowed to coincide),
    // but documents the contract: callers must opt into determinism.
    const input = loadCorpusCase("pptx-title");
    const ctx1 = new RenderContext({ engineMode: "pro" });
    const ctx2 = new RenderContext({ engineMode: "pro" });
    const a = await withContext(ctx1, () => PaperEngine.render(input as never));
    const b = await withContext(ctx2, () => PaperEngine.render(input as never));
    expect(Buffer.isBuffer(a)).toBe(true);
    expect(Buffer.isBuffer(b)).toBe(true);
  }, 60000);

  it("createEngine instances are byte-deterministic in isolation", async () => {
    // Public-API-shaped check — callers who use createEngine should
    // get byte-identical output across calls when determinism is set.
    const engine = createEngine({ mode: "pro" });
    const input = loadCorpusCase("pptx-title");
    setDeterministicMode(true);
    try {
      const a = await engine.render(input as never);
      const b = await engine.render(input as never);
      expect(a.equals(b)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  }, 60000);
});
