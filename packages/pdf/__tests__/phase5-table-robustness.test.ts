import { describe, expect, it } from "vitest";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { isPdfError } from "../src/errors.js";

function tableWithHeaderMinHeight(headerMinHeight: number, bodyMinHeight = 24, keepTogether = false) {
  return {
    page: {
      margin: 10,
      size: { width: 240, height: 120 },
    },
    children: [
      {
        type: "table" as const,
        columns: [{}],
        header: [
          {
            cells: [
              {
                role: "th" as const,
                style: { minHeight: headerMinHeight, padding: 0 },
                children: [{ type: "paragraph" as const, value: "Header" }],
              },
            ],
          },
        ],
        body: [
          {
            keepTogether,
            cells: [
              {
                style: { minHeight: bodyMinHeight, padding: 0 },
                children: [{ type: "paragraph" as const, value: "Body" }],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("Phase 5 table robustness guardrails", () => {
  it("rejects repeated headers that consume the full page body", async () => {
    let thrown: unknown;
    try {
      await analyzePhase5Document(tableWithHeaderMinHeight(100));
    } catch (error) {
      thrown = error;
    }

    expect(isPdfError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "LAYOUT_IMPOSSIBLE",
      details: {
        capability: "tables",
        rowGroup: "header",
        tableId: "T1",
      },
    });
  });

  it("rejects keepTogether body rows that cannot fit after a repeated header", async () => {
    let thrown: unknown;
    try {
      await analyzePhase5Document(tableWithHeaderMinHeight(24, 120, true));
    } catch (error) {
      thrown = error;
    }

    expect(isPdfError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "LAYOUT_IMPOSSIBLE",
      details: {
        capability: "tables",
        rowGroup: "body",
        tableId: "T1",
      },
    });
  });
});

