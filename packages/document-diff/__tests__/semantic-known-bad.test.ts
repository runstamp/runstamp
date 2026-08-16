import { describe, expect, it } from "vitest";
import { compareSemanticDocuments } from "../src/index.js";

describe("O03 known-bad missed deletion control", () => {
  it("reports deletion of a material contract clause", async () => {
    const base = {
      schemaVersion: 1 as const,
      artifactId: "contract-1",
      artifactKind: "docx" as const,
      version: { id: "v1", sha256: "a".repeat(64) },
      nodes: [
        { id: "clause-1", kind: "paragraph", locator: { artifactId: "contract-1", scheme: "docx.node", value: ["clause-1"] }, text: "Payment is due in 30 days." },
      ],
    };
    const revised = { ...base, version: { id: "v2", sha256: "b".repeat(64) }, nodes: [] };

    const result = await compareSemanticDocuments(base, revised);
    expect(result.changes).toContainEqual(expect.objectContaining({ category: "delete", nodeId: "clause-1" }));
  });
});
