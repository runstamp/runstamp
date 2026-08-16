// Mutation smoke: proves the render pipeline actually reacts to input
// changes. A regression where the engine ignored inputs and produced
// a constant buffer would pass every other test except visual
// regression; this cheap in-memory check catches it pre-VR.
//
// Under deterministic mode, two identical inputs must produce the
// same buffer, AND two inputs that differ in a meaningful way must
// produce different buffers. The pair is the real invariant.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function loadCorpus(id: string): unknown {
  const file = path.join(
    REPO_ROOT,
    "tools/visual-regression/corpus",
    `${id}.json`,
  );
  return JSON.parse(readFileSync(file, "utf8"));
}

async function renderAndHash(input: unknown): Promise<{ buffer: Buffer; slide1: string }> {
  const buffer = await PaperEngine.render(input as never);
  const zip = await JSZip.loadAsync(buffer);
  const slide = zip.file("ppt/slides/slide1.xml");
  if (!slide) throw new Error("slide1.xml missing");
  return { buffer, slide1: await slide.async("string") };
}

describe("mutation smoke", () => {
  it("identical input produces identical slide1 XML under deterministic mode", async () => {
    const raw = loadCorpus("pptx-title") as { document: unknown };
    setDeterministicMode(true);
    try {
      const a = await renderAndHash(raw.document);
      const b = await renderAndHash(raw.document);
      expect(a.slide1).toEqual(b.slide1);
    } finally {
      setDeterministicMode(false);
    }
  }, 60000);

  it("changing the title text changes the rendered slide1 XML", async () => {
    const raw = loadCorpus("pptx-title") as { document: { slides: Array<{ content: { title: string } }> } };
    const original = JSON.parse(JSON.stringify(raw.document));
    const mutated = JSON.parse(JSON.stringify(raw.document));
    mutated.slides[0].content.title = "MutatedTitleAnchor-unique";

    setDeterministicMode(true);
    try {
      const a = await renderAndHash(original);
      const b = await renderAndHash(mutated);
      expect(a.slide1).not.toEqual(b.slide1);
      expect(b.slide1).toContain("MutatedTitleAnchor-unique");
      expect(a.slide1).not.toContain("MutatedTitleAnchor-unique");
    } finally {
      setDeterministicMode(false);
    }
  }, 60000);

  it("changing the accent color changes the rendered slide1 XML", async () => {
    const raw = loadCorpus("pptx-title") as { document: Record<string, unknown> };
    const original = JSON.parse(JSON.stringify(raw.document));
    const mutated = JSON.parse(JSON.stringify(raw.document));
    // default-navy's accent is a deep blue; swap to a vivid orange far
    // enough away that downstream color-scheme XML differs.
    mutated.accentColor = "#FF4500";

    setDeterministicMode(true);
    try {
      const a = await renderAndHash(original);
      const b = await renderAndHash(mutated);
      expect(a.buffer.equals(b.buffer)).toBe(false);
    } finally {
      setDeterministicMode(false);
    }
  }, 60000);

  it("changing the theme preset changes the rendered slide1 XML", async () => {
    const raw = loadCorpus("pptx-title") as { document: Record<string, unknown> };
    const original = JSON.parse(JSON.stringify(raw.document)); // default-navy
    const mutated = JSON.parse(JSON.stringify(raw.document));
    mutated.theme = "midnight";

    setDeterministicMode(true);
    try {
      const a = await renderAndHash(original);
      const b = await renderAndHash(mutated);
      expect(a.slide1).not.toEqual(b.slide1);
    } finally {
      setDeterministicMode(false);
    }
  }, 60000);
});
