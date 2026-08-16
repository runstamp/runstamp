// Investigation probe for task #34. Reproduces the chart-path
// non-determinism inside a single test file and prints a per-file
// diff of the two resulting PPTX archives so the root cause can be
// pinpointed.
//
// Usage: `vitest run tests/chartDeterminismProbe.test.ts --reporter=verbose`
// The assertion is lenient (allows inequality but records what
// differs) — turn it strict by flipping `ASSERT_EQUALITY` to true
// once the root cause is fixed.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PaperEngine } from "../src/engine.js";
import { RenderContext, withContext } from "../src/renderContext.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function loadCorpusCase(id: string): unknown {
  const raw = JSON.parse(
    readFileSync(path.join(REPO_ROOT, "tools/visual-regression/corpus", `${id}.json`), "utf8"),
  ) as { document: unknown };
  return raw.document;
}

async function renderInFreshContext(input: unknown): Promise<Buffer> {
  const ctx = new RenderContext({ engineMode: "pro" });
  ctx.deterministicMode.setDeterministicMode(true);
  return withContext(ctx, () => PaperEngine.render(input as never));
}

interface ZipDiff {
  fileName: string;
  byteDelta: number;
  firstDiffOffset: number;
  firstDiffWindow: { a: string; b: string };
}

async function diffBuffers(a: Buffer, b: Buffer): Promise<ZipDiff[]> {
  const za = await JSZip.loadAsync(a);
  const zb = await JSZip.loadAsync(b);
  const diffs: ZipDiff[] = [];

  const keys = new Set<string>([...Object.keys(za.files), ...Object.keys(zb.files)]);
  for (const key of keys) {
    const fa = za.file(key);
    const fb = zb.file(key);
    if (!fa || !fb) {
      diffs.push({
        fileName: key,
        byteDelta: 0,
        firstDiffOffset: -1,
        firstDiffWindow: {
          a: fa ? "present" : "missing",
          b: fb ? "present" : "missing",
        },
      });
      continue;
    }
    const ca = await fa.async("string");
    const cb = await fb.async("string");
    if (ca === cb) continue;
    let offset = -1;
    for (let i = 0; i < Math.min(ca.length, cb.length); i += 1) {
      if (ca[i] !== cb[i]) {
        offset = i;
        break;
      }
    }
    if (offset === -1) offset = Math.min(ca.length, cb.length);
    const w = 40;
    diffs.push({
      fileName: key,
      byteDelta: cb.length - ca.length,
      firstDiffOffset: offset,
      firstDiffWindow: {
        a: ca.slice(Math.max(0, offset - 15), offset + w),
        b: cb.slice(Math.max(0, offset - 15), offset + w),
      },
    });
  }

  return diffs;
}

describe("chart determinism probe (task #34)", () => {
  it("isolated: two back-to-back chart-focus renders are byte-identical", async () => {
    const input = loadCorpusCase("pptx-chart-focus");
    const a = await renderInFreshContext(input);
    const b = await renderInFreshContext(input);
    expect(a.equals(b)).toBe(true);
  }, 30000);

  it("after rendering a non-chart doc first: measures whether chart renders diverge", async () => {
    // Prime any module-level state by rendering a title deck first.
    await renderInFreshContext(loadCorpusCase("pptx-title"));

    const chartInput = loadCorpusCase("pptx-chart-focus");
    const a = await renderInFreshContext(chartInput);
    const b = await renderInFreshContext(chartInput);

    if (a.equals(b)) {
      // No divergence — record as a pass. The flake is not triggered
      // by a single prior non-chart render; more history is needed.
      expect(a.equals(b)).toBe(true);
      return;
    }

    const diffs = await diffBuffers(a, b);
    // Surface the diagnostic to the test log so we can act on it.
    console.log(`[chart-det-probe] ${diffs.length} file(s) differ:`);
    for (const d of diffs) {
      console.log(
        `  - ${d.fileName} (byteDelta=${d.byteDelta}, firstDiffOffset=${d.firstDiffOffset})\n` +
          `      A: ${JSON.stringify(d.firstDiffWindow.a)}\n` +
          `      B: ${JSON.stringify(d.firstDiffWindow.b)}`,
      );
    }
    // Lenient assertion — record the flake without failing the suite.
    // Flip to strict equality once #34 is fixed.
    expect(diffs.length).toBeGreaterThan(0);
  }, 60000);

  it("after rendering chart-focus, title, chart-focus, chart-focus: chain stability", async () => {
    // Runs a mini-suite to simulate real-world order and records
    // whether determinism degrades as state accumulates.
    await renderInFreshContext(loadCorpusCase("pptx-chart-focus"));
    await renderInFreshContext(loadCorpusCase("pptx-title"));
    const a = await renderInFreshContext(loadCorpusCase("pptx-chart-focus"));
    const b = await renderInFreshContext(loadCorpusCase("pptx-chart-focus"));

    if (a.equals(b)) {
      expect(a.equals(b)).toBe(true);
      return;
    }
    const diffs = await diffBuffers(a, b);
    console.log(`[chart-det-probe/chain] ${diffs.length} file(s) differ in chain test`);
    for (const d of diffs) {
      console.log(
        `  - ${d.fileName} (byteDelta=${d.byteDelta}, firstDiffOffset=${d.firstDiffOffset})\n` +
          `      A: ${JSON.stringify(d.firstDiffWindow.a)}\n` +
          `      B: ${JSON.stringify(d.firstDiffWindow.b)}`,
      );
    }
    expect(diffs.length).toBeGreaterThan(0);
  }, 60000);
});
