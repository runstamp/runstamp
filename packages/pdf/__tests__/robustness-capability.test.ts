import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { analyzePdfCapabilities } from "../src/capability-planner.js";
import { analyzePhase6Document } from "../src/phase6-analyze.js";
import { isPdfError } from "../src/errors.js";
import type { PdfRenderTrace } from "../src/phase9-types.js";

function tableCellLinkDocument(kind: "external" | "internal") {
  return {
    page: { margin: 48, size: "Letter" as const },
    children: [
      {
        id: "target",
        level: 1,
        type: "heading" as const,
        value: "Target heading",
      },
      {
        type: "table" as const,
        columns: [{}, {}],
        header: [
          {
            cells: [
              { role: "th" as const, children: [{ type: "paragraph" as const, value: "Name" }] },
              { role: "th" as const, children: [{ type: "paragraph" as const, value: "Action" }] },
            ],
          },
        ],
        body: [
          {
            cells: [
              { children: [{ type: "paragraph" as const, value: "Runstamp" }] },
              {
                children: [
                  {
                    type: "paragraph" as const,
                    value: kind === "external" ? "Open docs" : "Jump to target",
                    link: kind === "external"
                      ? { kind: "external" as const, url: "https://runstamp.com/docs" }
                      : { kind: "internal" as const, target: "target" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry);
    }
  }
  return value;
}

describe("PDF robustness capability planner", () => {
  it("selects the interactive reducer when a table cell contains an external link", async () => {
    const document = tableCellLinkDocument("external");
    const capabilities = analyzePdfCapabilities(document);
    const traces: PdfRenderTrace[] = [];
    const analysis = await analyzePhase6Document(document);
    const buffer = await PdfEngine.render(document, {
      deterministic: true,
      onRenderTrace: (trace) => traces.push(trace),
    });

    expect(capabilities.tables).toBe(true);
    expect(capabilities.interactive).toBe(true);
    expect(analysis.pages.some((page) => page.annotations?.some((annotation) => annotation.kind === "link-external"))).toBe(true);
    expect(traces[0]).toMatchObject({
      selectedPhase: "phase6-interactive",
      annotationsCount: 1,
    });
    expect(traces[0]?.passes).toEqual(expect.arrayContaining(["table-materialization", "interactive-annotation-pass"]));
    expect(buffer.toString("latin1")).toContain("/S /URI");
    expect(buffer.toString("latin1")).toContain("(https://runstamp.com/docs)");
  });

  it("preserves table-cell internal links as GoTo annotations", async () => {
    const document = tableCellLinkDocument("internal");
    const traces: PdfRenderTrace[] = [];
    const analysis = await analyzePhase6Document(document);
    const buffer = await PdfEngine.render(document, {
      deterministic: true,
      onRenderTrace: (trace) => traces.push(trace),
    });

    expect(analysis.pages.some((page) => page.annotations?.some((annotation) => annotation.kind === "link-internal"))).toBe(true);
    expect(traces[0]?.selectedPhase).toBe("phase6-interactive");
    expect(buffer.toString("latin1")).toContain("/S /GoTo");
  });

  it("does not mutate frozen shorthand-table input during normalization", async () => {
    const document = deepFreeze({
      children: [
        {
          type: "table" as const,
          columns: [{}, {}],
          header: [["A", "B"]],
          body: [["C", "D"]],
        },
      ],
    });

    const before = JSON.stringify(document);
    const buffer = await PdfEngine.render(document as never, {
      deterministic: true,
      relaxed: false,
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(JSON.stringify(document)).toBe(before);
  });

  it("does not write pdfa options back to caller input", async () => {
    const document = deepFreeze({
      children: [{ type: "paragraph" as const, value: "PDF/A mutation guard" }],
    });
    const before = JSON.stringify(document);

    const buffer = await PdfEngine.render(document as never, { pdfA: "PDF/A-1b" });
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(JSON.stringify(document)).toBe(before);
  });

  it("rejects non-coercible strict:false input before phase execution", async () => {
    let thrown: unknown;
    try {
      await PdfEngine.render({
        children: [{ type: "mystery-node", value: "not renderable" }],
      } as never, { strict: false });
    } catch (error) {
      thrown = error;
    }

    expect(isPdfError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "SCHEMA_REJECTED",
      details: { phase: "input-normalization" },
    });
  });
});
