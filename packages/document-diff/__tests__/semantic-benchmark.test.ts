import { describe, expect, it } from "vitest";
import { compareSemanticDocuments, type SemanticDocument } from "../src/index.js";

function largeDocument(version: "v1" | "v2"): SemanticDocument {
  return {
    schemaVersion: 1,
    artifactId: "large-deck",
    artifactKind: "pptx",
    version: { id: version, sha256: (version === "v1" ? "a" : "b").repeat(64) },
    nodes: Array.from({ length: 5_000 }, (_, index) => ({
      id: `shape-${index}`,
      kind: index % 20 === 0 ? "table" : "text",
      locator: { artifactId: "large-deck", scheme: "pptx.node", value: [Math.floor(index / 100), index % 100] },
      text: version === "v2" && index % 1000 === 0 ? `Edited ${index}` : `Text ${index}`,
      data: index % 20 === 0 ? { cells: [[index, index + 1]] } : undefined,
    })),
  };
}

describe("semantic diff performance", () => {
  it("compares 5,000 semantic nodes within the declared package budget", async () => {
    const started = performance.now();
    const result = await compareSemanticDocuments(largeDocument("v1"), largeDocument("v2"), { maxEntries: 5_000, maxInputBytes: 8_000_000 });
    const elapsedMs = performance.now() - started;
    expect(result.statistics.text).toBe(5);
    expect(elapsedMs).toBeLessThan(2_500);
  }, 5_000);
});
