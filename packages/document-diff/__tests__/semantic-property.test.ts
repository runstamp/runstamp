import { describe, expect, it } from "vitest";
import { compareSemanticDocuments, type SemanticDocument, type SemanticNode } from "../src/index.js";

function pseudoRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 0x1_0000_0000);
}

function makeDocument(seed: number, changed: boolean): SemanticDocument {
  const random = pseudoRandom(seed);
  const nodes: SemanticNode[] = Array.from({ length: 2 + Math.floor(random() * 20) }, (_, index) => ({
    id: `node-${index}`,
    kind: index % 4 === 0 ? "table" : "paragraph",
    locator: { artifactId: "property-doc", scheme: "docx.node", value: ["body", index] },
    text: `${seed}:${index}${changed && index === 0 ? ":edited" : ""}`,
    style: index % 3 === 0 ? { bold: Boolean(index % 2), size: 10 + index } : undefined,
    data: index % 4 === 0 ? { cells: [[index, Number(random().toFixed(6))]] } : undefined,
  }));
  if (changed && seed % 2 === 0) nodes.reverse();
  if (changed && seed % 3 === 0) nodes.pop();
  return { schemaVersion: 1, artifactId: "property-doc", artifactKind: "docx", version: { id: changed ? "v2" : "v1", sha256: (changed ? "b" : "a").repeat(64) }, nodes };
}

describe("semantic diff properties", () => {
  it("is deterministic, idempotent, locator-complete, and count-consistent across 250 generated pairs", async () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      const before = makeDocument(seed, false);
      const after = makeDocument(seed, true);
      const first = await compareSemanticDocuments(before, after);
      const second = await compareSemanticDocuments(before, after);
      expect(first).toEqual(second);
      expect((await compareSemanticDocuments(before, before)).changes).toEqual([]);
      expect(first.changes.every((change) => change.locator.artifactId === before.artifactId && change.locator.value.length > 0)).toBe(true);
      expect(Object.values(first.statistics).reduce((sum, count) => sum + count, 0)).toBe(first.changes.length);
      expect(new Set(first.changes.map((change) => change.id)).size).toBe(first.changes.length);
    }
  });

  it("canonicalizes record insertion order", async () => {
    const left = makeDocument(42, false);
    const right = makeDocument(42, true);
    right.nodes[0]!.data = { z: 1, a: { y: 2, b: 3 } };
    const reordered = structuredClone(right);
    reordered.nodes[0]!.data = { a: { b: 3, y: 2 }, z: 1 };
    expect((await compareSemanticDocuments(left, right)).changeSetHash).toBe((await compareSemanticDocuments(left, reordered)).changeSetHash);
  });
});
