import { describe, expect, it } from "vitest";
import { createDiffKey, diffDocuments, type DiffPlugin } from "../src/index.js";

interface TestDocument {
  items: Array<{ id?: string; label: string; __diffKey?: string }>;
}

const plugin: DiffPlugin<TestDocument> = {
  normalize(document) {
    const parsed = structuredClone(document as TestDocument);
    parsed.items.forEach((item) => {
      if (item.id) {
        item.__diffKey = createDiffKey("item", item.id);
      }
    });
    return parsed;
  },
  interpretChange(context) {
    if (context.path[0] === "items" && typeof context.path[1] === "number") {
      return {
        description: `Item ${context.type}`,
        severity: context.type === "modified" ? "minor" : "major",
        summaryLabel: `item ${context.type === "modified" ? "modified" : context.type}`,
      };
    }
    return {
      description: `${context.pathString} ${context.type}`,
      severity: "minor",
      summaryLabel: `field ${context.type === "modified" ? "modified" : context.type}`,
    };
  },
};

describe("@runstamp/document-diff", () => {
  it("returns an empty changeset for identical documents", () => {
    const document = { items: [{ id: "a", label: "Alpha" }] };

    const result = diffDocuments(document, document, plugin);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBe("No changes");
    expect(result.statistics).toEqual({
      added: 0,
      removed: 0,
      modified: 0,
      moved: 0,
    });
  });

  it("detects stable array moves via __diffKey", () => {
    const before = {
      items: [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
      ],
    };
    const after = {
      items: [
        { id: "b", label: "Beta" },
        { id: "a", label: "Alpha" },
      ],
    };

    const result = diffDocuments(before, after, plugin);

    expect(result.statistics.moved).toBe(1);
    expect(result.changes[0]?.type).toBe("moved");
    expect(result.summary).toContain("1 item moved");
  });

  it("builds semantic summaries for mixed changes", () => {
    const before = {
      items: [{ id: "a", label: "Alpha" }],
    };
    const after = {
      items: [
        { id: "a", label: "Updated" },
        { id: "b", label: "Beta" },
      ],
    };

    const result = diffDocuments(before, after, plugin);

    expect(result.statistics).toEqual({
      added: 1,
      removed: 0,
      modified: 1,
      moved: 0,
    });
    expect(result.summary).toBe("2 changes: 1 item modified, 1 item added");
  });
});
