import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { isPdfError } from "../src/errors.js";
import {
  createAutoWidthTableDocument,
  createBorderCollapseTableDocument,
  createColspanTableDocument,
  createSinglePageTableDocument,
  createVerticalAlignTableDocument,
} from "../scripts/phase5-fixtures.js";

function paragraph(value: string) {
  return { type: "paragraph" as const, value };
}

function cell(
  value: string,
  options: {
    children?: Array<ReturnType<typeof paragraph>>;
    colSpan?: number;
  } = {},
) {
  return {
    children: options.children ?? [paragraph(value)],
    colSpan: options.colSpan,
  };
}

describe("Phase 5 table layout", () => {
  it("renders the single-page benchmark table on exactly one page", async () => {
    const analysis = await analyzePhase5Document(createSinglePageTableDocument());
    expect(analysis.pages).toHaveLength(1);
    expect(analysis.tables[0]?.columnWidths).toHaveLength(5);
    expect(analysis.tables[0]?.totalBodyRows).toBe(10);
  });

  it("resolves colspan cells to the combined width of the spanned columns", async () => {
    const analysis = await analyzePhase5Document(createColspanTableDocument());
    const widths = analysis.tables[0]?.columnWidths as number[];
    const mergedWidth = widths[0] + widths[1] + widths[2];
    expect(mergedWidth).toBeGreaterThan(widths[3]);
  });

  it("auto-width columns expand to measured content without collapsing the longest column", async () => {
    const analysis = await analyzePhase5Document(createAutoWidthTableDocument());
    const widths = analysis.tables[0]?.columnWidths as number[];
    expect(widths[1]).toBeGreaterThan(widths[0]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it("uses fixed width hints and span content to keep mixed columns balanced", async () => {
    const analysis = await analyzePhase5Document({
      children: [{
        body: [
          {
            cells: [
              cell("Fixed"),
              cell("A long spanning cell should lean toward the hinted column", { colSpan: 2 }),
              cell("Tail"),
            ],
          },
          {
            cells: [
              cell("A"),
              cell("B"),
              cell("Content that should keep the flexible column open and readable"),
              cell("D"),
            ],
          },
        ],
        columns: [
          { width: 96 },
          { width: "25%" },
          {},
          {},
        ],
        header: [{
          cells: [
            cell("One", { children: [paragraph("One")] }),
            cell("Two", { children: [paragraph("Two")] }),
            cell("Three", { children: [paragraph("Three")] }),
            cell("Four", { children: [paragraph("Four")] }),
          ],
        }],
        style: { width: "100%" },
        type: "table",
      }],
      page: { margin: 48, size: "Letter" },
    });

    const widths = analysis.tables[0]?.columnWidths as number[];
    expect(widths[0]).toBeCloseTo(96, 0);
    expect(widths[1]).toBeGreaterThan(100);
    expect(widths[2]).toBeGreaterThan(150);
    expect(widths[1] + widths[2]).toBeGreaterThan(250);
  });

  it("positions top, middle, and bottom aligned cells at different vertical offsets", async () => {
    const analysis = await analyzePhase5Document(createVerticalAlignTableDocument());
    const values = new Map(
      analysis.pages[0]?.texts.map((text) => [text.value, text.y]) ?? [],
    );
    expect((values.get("Top aligned") as number) > (values.get("Middle aligned") as number)).toBe(true);
    expect((values.get("Middle aligned") as number) > (values.get("Bottom aligned") as number)).toBe(true);
  });

  it("collapses shared borders so the center divider is emitted once", async () => {
    const analysis = await analyzePhase5Document(createBorderCollapseTableDocument());
    const verticalCenterLines = (analysis.pages[0]?.graphics ?? []).filter((graphic) =>
      graphic.type === "line" && Math.abs(graphic.x1 - graphic.x2) < 0.001 && Math.abs(graphic.x1 - 306) < 6,
    );
    expect(verticalCenterLines).toHaveLength(2);
  });

  it("rejects cells whose colSpan exceeds the declared column count", async () => {
    await expect(analyzePhase5Document({
      children: [{
        type: "table",
        columns: [{}, {}],
        body: [{
          cells: [
            {
              children: [{ type: "paragraph", value: "Too wide" }],
              colSpan: 3,
            },
          ],
        }],
      }],
      page: {
        margin: 48,
        size: "Letter",
      },
    })).rejects.toThrow(/spans beyond declared columns/);
  });

  it("rejects rows that leave uncovered columns after spanning cells", async () => {
    try {
      await analyzePhase5Document({
        children: [{
          type: "table",
          body: [
            {
              cells: [
                {
                  children: [{ type: "paragraph", value: "carry" }],
                  rowSpan: 2,
                },
                {
                  children: [{ type: "paragraph", value: "middle" }],
                },
                {
                  children: [{ type: "paragraph", value: "tail" }],
                },
              ],
            },
            {
              cells: [
                {
                  children: [{ type: "paragraph", value: "missing trailing placeholder" }],
                },
              ],
            },
          ],
        }],
        page: {
          margin: 48,
          size: "Letter",
        },
      });
      throw new Error("expected analyzePhase5Document to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(isPdfError(error)).toBe(true);
      expect((error as Error).message).toMatch(/placeholder cells/);
      if (isPdfError(error)) {
        expect(error.code).toBe("SCHEMA_REJECTED");
        expect(error.details?.rule).toBe("table-missing-placeholder-cell");
      }
    }
  });

  it("allows empty paragraph nodes inside table cells without crashing width measurement", async () => {
    const analysis = await analyzePhase5Document({
      children: [{
        type: "table",
        columns: [{}, {}],
        body: [{
          cells: [
            {
              children: [{ type: "paragraph", value: "" }],
            },
            {
              children: [{ type: "paragraph", value: "Still measured" }],
            },
          ],
        }],
      }],
      page: {
        margin: 48,
        size: "Letter",
      },
    });

    expect(analysis.tables[0]?.columnWidths).toHaveLength(2);
  });
});
