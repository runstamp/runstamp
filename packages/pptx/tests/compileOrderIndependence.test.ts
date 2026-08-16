// Compilation must be a function of the document, not of what rendered before it.
//
// `determinismInvariant.test.ts` renders the same input twice in a row and asserts the bytes
// match. That invariant holds even when this one is broken, because both renders in a pair see
// the same font-cache state — which is exactly why the defect below survived: the existing gate
// could not fail on it.
//
// The defect: `compileAgentDocument` is synchronous, so it cannot load a font. Fonts are loaded
// later, inside `PaperEngine.render`. Every autofit decision the templates make is therefore
// measured against whatever the process-global cache happens to hold, and `resolveBoldFamily`
// (typography/segmentCache.ts:212) silently measures bold text with the regular face until the
// bold face has been loaded. Render one deck, and the *next* deck measures against the first
// deck's fonts — same input, different bytes.
//
// Measured on the ICP corpus: rendering `pptx-earnings-q3-saas-highlights` first in a process
// gave a void-band ratio of 0.231; rendering it after any other deck gave 0.368. That moved 28 of
// 80 pages in the GA benchmark and broke the void-band metric's separation between judge-flagged
// and judge-clean pages. See docs/quality-policy.md.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PaperEngine } from "../src/engine.js";
import { compileAgentDocument, compileAgentDocumentWithFonts } from "../src/interpreter/index.js";
import { clearFontCache } from "../src/typography/fontCache.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { RenderContext, withContext } from "../src/renderContext.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function loadCorpusCase(id: string): unknown {
  const file = path.join(REPO_ROOT, "tools/visual-regression/corpus", `${id}.json`);
  return (JSON.parse(readFileSync(file, "utf8")) as { document: unknown }).document;
}

// `default-navy` and `midnight` resolve to different faces, so rendering one populates the cache
// with a face the other's compile step will silently pick up.
const SUBJECT = "pptx-earnings-q3-saas-highlights";
const INTERFERER = "pptx-board-executive-compensation";

/**
 * A fresh RenderContext per render, as `determinismInvariant.test.ts` does. The font cache is
 * context-scoped, so this hands every render an empty one.
 */
async function render(document: unknown): Promise<Buffer> {
  const context = new RenderContext({ engineMode: "pro" });
  context.deterministicMode.setDeterministicMode(true);
  return withContext(context, () => PaperEngine.render(document as never));
}

/**
 * No context, which is what `PaperEngine.render` does when a caller does not build one — the ICP
 * harness (`packages/chaos-lab/scripts/vqh/judge.mts:229`), and any server rendering more than one
 * document per process. These callers share one cache, and that is where the order dependence
 * lives. Deterministic mode is process-global here for the same reason.
 */
async function renderOnSharedCache(document: unknown): Promise<Buffer> {
  return PaperEngine.render(document as never);
}

describe("compilation is order-independent", () => {
  it("compileAgentDocumentWithFonts yields identical bytes whatever rendered first", async () => {
    clearFontCache();
    const first = await render(await compileAgentDocumentWithFonts(loadCorpusCase(SUBJECT)));

    await render(await compileAgentDocumentWithFonts(loadCorpusCase(INTERFERER)));

    const afterInterference = await render(await compileAgentDocumentWithFonts(loadCorpusCase(SUBJECT)));
    expect(afterInterference.equals(first)).toBe(true);
  }, 180000);

  it("resolves to the fonts-loaded measurement, not the empty-cache estimate", async () => {
    // Both orderings must agree, and they must agree on the *correct* answer. Compiling with a
    // warm cache is what a long-running server does on every request after the first, so that is
    // the measurement to converge on — converging on the cold-cache estimate would make every
    // deployment's first document the odd one out instead.
    clearFontCache();
    await render(await compileAgentDocumentWithFonts(loadCorpusCase(INTERFERER)));
    const warm = await render(await compileAgentDocumentWithFonts(loadCorpusCase(SUBJECT)));

    clearFontCache();
    const cold = await render(await compileAgentDocumentWithFonts(loadCorpusCase(SUBJECT)));
    expect(cold.equals(warm)).toBe(true);
  }, 180000);

  it("holds on the shared cache, where the synchronous path does not", async () => {
    setDeterministicMode(true);
    try {
      clearFontCache();
      const coldSync = await renderOnSharedCache(compileAgentDocument(loadCorpusCase(SUBJECT)));
      await renderOnSharedCache(compileAgentDocument(loadCorpusCase(INTERFERER)));
      const warmSync = await renderOnSharedCache(compileAgentDocument(loadCorpusCase(SUBJECT)));

      // Pinned, not merely described. If a later change folds the font-loading guarantee into the
      // engine, this equality flips and the message says so rather than the suite quietly passing
      // on a property it stopped checking.
      expect(
        coldSync.equals(warmSync),
        "compileAgentDocument is now order-independent on the shared cache — fold this into the"
        + " engine's normalizeRenderInput and simplify this test",
      ).toBe(false);

      clearFontCache();
      const coldFixed = await renderOnSharedCache(await compileAgentDocumentWithFonts(loadCorpusCase(SUBJECT)));
      await renderOnSharedCache(await compileAgentDocumentWithFonts(loadCorpusCase(INTERFERER)));
      const warmFixed = await renderOnSharedCache(await compileAgentDocumentWithFonts(loadCorpusCase(SUBJECT)));
      expect(coldFixed.equals(warmFixed)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  }, 180000);
});
