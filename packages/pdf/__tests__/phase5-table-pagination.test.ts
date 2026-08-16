import { PdfEngine } from "../src/engine.js";
import { preprocessPdfDocumentInput } from "../src/relaxed-input.js";
import { PdfDocumentSchema } from "../src/schema.js";
import {
  analyzePhase5Document,
  assertHeadingRelocationCoordinates,
  assertTablePaginationQualityGate,
  pageUsages,
  terminalPageUsage,
} from "../src/phase5-table-layout.js";
import {
  createMultiPageTableDocument,
  createNestedTableDocument,
  createRowspanSplitTableDocument,
} from "../scripts/phase5-fixtures.js";

describe("Phase 5 table pagination", () => {
  it("retries the whole document to remove a low-fill terminal page", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 306 } },
      children: [
        {
          type: "table",
          columns: [{}],
          body: [{ cells: [{ children: [{ type: "paragraph", value: "Status" }] }] }],
        },
        ...Array.from({ length: 27 }, (_, index) => ({
          type: "paragraph" as const,
          value: `Decision note ${index + 1}`,
          fontSize: 12,
          style: { marginBottom: 6 },
        })),
      ],
    });

    expect(analysis.pages).toHaveLength(2);
    expect(terminalPageUsage(analysis)).toBeGreaterThan(0.9);
  });

  it("balances a naturally uneven two-page document at a legal section boundary", async () => {
    const children = Array.from({ length: 6 }, (_unused, sectionIndex) => [
      {
        type: "heading" as const,
        level: 2 as const,
        value: `Section ${sectionIndex + 1}`,
        style: { marginTop: 8, marginBottom: 4 },
      },
      {
        type: "paragraph" as const,
        value: `Primary note for section ${sectionIndex + 1}.`,
        style: { marginBottom: 8 },
      },
      {
        type: "paragraph" as const,
        value: `Secondary note for section ${sectionIndex + 1}.`,
        style: { marginBottom: 8 },
      },
    ]).flat();
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children,
    });
    const usages = pageUsages(analysis);

    expect(analysis.pages).toHaveLength(2);
    expect(Math.min(...usages)).toBeGreaterThanOrEqual(0.68);
    expect(Math.abs((usages[0] ?? 0) - (usages[1] ?? 0))).toBeLessThanOrEqual(0.22);
    expect(analysis.pages[1]?.texts[0]?.value).toMatch(/^Section /u);
  });

  it("expands one-page vertical rhythm only after an eight-point usage gain", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [
        {
          type: "paragraph",
          value: "Executive summary",
          style: { marginBottom: 170 },
        },
        {
          type: "paragraph",
          value: "Closing decision",
        },
      ],
    });

    expect(analysis.pages).toHaveLength(1);
    expect(pageUsages(analysis)[0]).toBeGreaterThanOrEqual(0.82);
    expect(analysis.pages[0]?.texts.map((text) => text.fontSize)).toEqual([12, 12]);
  });

  it("uses a legal two-row-or-larger table split when it materially balances both pages", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [
        {
          type: "paragraph",
          value: "Context before the rate table",
          style: { marginBottom: 88 },
        },
        {
          type: "table",
          columns: [{}, {}],
          header: [{
            cells: [
              { role: "th", style: { backgroundColor: "#eeeeee", minHeight: 24, padding: 0 }, children: [{ type: "paragraph", value: "Role" }] },
              { role: "th", style: { backgroundColor: "#eeeeee", minHeight: 24, padding: 0 }, children: [{ type: "paragraph", value: "Rate" }] },
            ],
          }],
          body: Array.from({ length: 6 }, (_unused, rowIndex) => ({
            cells: [
              { style: { backgroundColor: "#f8f8f8", minHeight: rowIndex < 2 ? 29 : 41, padding: 0 }, children: [{ type: "paragraph", value: `Role ${rowIndex + 1}` }] },
              { style: { backgroundColor: "#f8f8f8", minHeight: rowIndex < 2 ? 29 : 41, padding: 0 }, children: [{ type: "paragraph", value: `$${200 + rowIndex}` }] },
            ],
          })),
        },
      ],
    });
    const fragments = analysis.tables[0]?.fragments ?? [];

    expect(analysis.pages).toHaveLength(2);
    expect(fragments).toHaveLength(2);
    expect(fragments.every((fragment) => new Set(fragment.bodyRowIndices).size >= 2)).toBe(true);
    expect(Math.min(...pageUsages(analysis))).toBeGreaterThanOrEqual(0.68);
  });

  it("balances a dense invoice table against its terminal totals and payment block", async () => {
    const fixture = JSON.parse(await readFile(
      new URL("../fixtures/public/corpus/pdf-invoice-professional-services.json", import.meta.url),
      "utf8",
    )) as { document: Parameters<typeof analyzePhase5Document>[0] };
    const prepared = preprocessPdfDocumentInput(fixture.document, {});
    const parsed = PdfDocumentSchema.parse(prepared.value) as unknown as {
      children?: Array<{ type: string }>;
    };
    const analysis = await analyzePhase5Document(
      {
        ...parsed,
        children: parsed.children?.filter((node) => node.type !== "list"),
      } as Parameters<typeof analyzePhase5Document>[0],
    );

    expect(analysis.pages).toHaveLength(2);
    expect(Math.min(...pageUsages(analysis))).toBeGreaterThanOrEqual(0.55);
  });

  it("compacts a detachable utility payment stub onto its populated first page", async () => {
    const fixture = JSON.parse(await readFile(
      new URL("../fixtures/public/corpus/pdf-invoice-utility-bill.json", import.meta.url),
      "utf8",
    )) as { document: Parameters<typeof analyzePhase5Document>[0] };
    const analysis = await analyzePhase5Document(fixture.document);

    expect(analysis.pages).toHaveLength(1);
    expect(pageUsages(analysis)[0]).toBeGreaterThanOrEqual(0.82);
  });

  it("splits a deferred policy-summary table to fill an underused opening page", async () => {
    const fixture = JSON.parse(await readFile(
      new URL("../fixtures/public/corpus/pdf-notice-privacy-policy-update.json", import.meta.url),
      "utf8",
    )) as { document: Parameters<typeof analyzePhase5Document>[0] };
    const prepared = preprocessPdfDocumentInput(fixture.document, {});
    const parsed = PdfDocumentSchema.parse(prepared.value) as unknown as {
      children?: Array<{ type: string }>;
    };
    const analysis = await analyzePhase5Document(
      {
        ...parsed,
        children: parsed.children?.filter((node) => node.type !== "list"),
      } as Parameters<typeof analyzePhase5Document>[0],
    );

    expect(analysis.pages).toHaveLength(2);
    expect(Math.min(...pageUsages(analysis))).toBeGreaterThanOrEqual(0.4);
  });

  it("does not compact across an explicit document page break", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [
        { type: "table", columns: [{}], body: [{ cells: [{ children: [{ type: "paragraph", value: "Page one" }] }] }] },
        { type: "page-break" },
        { type: "paragraph", value: "Intentional second page" },
      ],
    });

    expect(analysis.pages).toHaveLength(2);
    expect(analysis.pages[0]?.texts.map((text) => text.value)).toEqual(["Page one"]);
    expect(analysis.pages[1]?.texts.map((text) => text.value)).toEqual(["Intentional second page"]);
  });

  it("rejects deliberately broken table pagination and heading coordinates", () => {
    expect(() => assertTablePaginationQualityGate({
      adjacentHeadingFits: true,
      adjacentHeadingPageIndex: 0,
      documentPageStartIndex: 1,
      firstFragmentTableTop: 120,
      fitsOnFreshPage: true,
      fragmentPageIndices: [1, 2],
      wouldSplitOnCurrentPage: true,
    })).toThrow(/deferred intact/);
    expect(() => assertHeadingRelocationCoordinates(
      [{ y: 100 }],
      [{ y: 80 }],
      20,
    )).toThrow(/bottom-up PDF y coordinates/);
    expect(() => assertTablePaginationQualityGate({
      adjacentHeadingFits: false,
      documentPageStartIndex: 3,
      firstFragmentTableTop: 0,
      fitsOnFreshPage: false,
      fragmentPageIndices: [0, 1],
      wouldSplitOnCurrentPage: false,
    })).toThrow(/document-relative and contiguous/);
    expect(() => assertTablePaginationQualityGate({
      adjacentHeadingFits: true,
      adjacentHeadingPageIndex: 0,
      documentPageStartIndex: 1,
      firstFragmentTableTop: 24,
      fitsOnFreshPage: true,
      fragmentPageIndices: [1],
      wouldSplitOnCurrentPage: true,
    })).toThrow(/adjacent heading/);
  });

  it("defers a fresh-page-sized table instead of splitting it in remaining space", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [
        {
          type: "paragraph",
          value: "Context before the table",
          style: { marginBottom: 100 },
        },
        {
          type: "table",
          columns: [{}, {}],
          body: [
            {
              cells: [
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Row 1A" }] },
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Row 1B" }] },
              ],
            },
            {
              cells: [
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Row 2A" }] },
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Row 2B" }] },
              ],
            },
          ],
        },
      ],
    });

    expect(analysis.pages).toHaveLength(2);
    expect(analysis.tables[0]?.fragments).toHaveLength(1);
    expect(analysis.tables[0]?.fragments[0]).toMatchObject({
      bodyRowIndices: [0, 1],
      tableTop: 0,
    });
    expect(analysis.pages[0]?.texts.map((text) => text.value)).toEqual(["Context before the table"]);
    expect(analysis.pages[1]?.texts.map((text) => text.value)).toEqual(["Row 1A", "Row 1B", "Row 2A", "Row 2B"]);
  });

  it("moves an immediately preceding heading with a deferred table when both fit", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [
        {
          type: "paragraph",
          value: "Executive context",
          style: { marginBottom: 100 },
        },
        { type: "heading", level: 2, value: "Decision table" },
        {
          type: "table",
          columns: [{}, {}],
          body: [
            {
              cells: [
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Option A" }] },
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Recommended" }] },
              ],
            },
            {
              cells: [
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Option B" }] },
                { style: { minHeight: 70 }, children: [{ type: "paragraph", value: "Deferred" }] },
              ],
            },
          ],
        },
      ],
    });

    expect(analysis.pages).toHaveLength(2);
    expect(analysis.tables[0]?.fragments).toHaveLength(1);
    expect(analysis.pages[0]?.texts.map((text) => text.value)).toEqual(["Executive context"]);
    expect(analysis.pages[1]?.texts.map((text) => text.value)).toEqual([
      "Decision table",
      "Option A",
      "Recommended",
      "Option B",
      "Deferred",
    ]);
    expect(analysis.linePlacements.map((line) => `${line.pageIndex}:${line.text}`)).toEqual([
      "0:Executive context",
      "1:Decision table",
      "1:Option A",
      "1:Recommended",
      "1:Option B",
      "1:Deferred",
    ]);
    const freshHeading = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [{ type: "heading", level: 2, value: "Decision table" }],
    });
    expect(analysis.linePlacements.find((line) => line.text === "Decision table")?.rect)
      .toEqual(freshHeading.linePlacements[0]?.rect);
  });

  it("keeps consecutive headings with the following body block", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 360, height: 300 } },
      children: [
        {
          type: "paragraph",
          value: "Context before the finding",
          style: { marginBottom: 210 },
        },
        { type: "heading", level: 2, value: "Finding F-01" },
        { type: "heading", level: 3, value: "Observation" },
        {
          type: "paragraph",
          value: "The observation body stays with both headings when the complete group fits on a fresh page.",
        },
      ],
    });

    expect(analysis.pages).toHaveLength(2);
    expect(analysis.pages[0]?.texts.map((text) => text.value)).toEqual([
      "Context before the finding",
    ]);
    expect(analysis.pages[1]?.texts.map((text) => text.value)).toEqual([
      "Finding F-01",
      "Observation",
      "The observation body stays with both headings when the",
      "complete group fits on a fresh page.",
    ]);
  });

  it("splits a 100-row table across multiple pages with stable row order", async () => {
    const analysis = await analyzePhase5Document(createMultiPageTableDocument());
    const fragments = analysis.tables[0]?.fragments ?? [];
    const seen = fragments.flatMap((fragment) => fragment.bodyRowIndices);

    expect(analysis.pages.length).toBeGreaterThanOrEqual(3);
    expect(new Set(seen).size).toBe(100);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(99);
  });

  it("reports table fragments with document-relative page indices", async () => {
    const fixture = createMultiPageTableDocument();
    const analysis = await analyzePhase5Document({
      ...fixture,
      children: [
        { type: "paragraph", value: "Preface" },
        { type: "page-break" },
        ...(fixture.children ?? []),
      ],
    });
    const pageIndices = analysis.tables[0]?.fragments.map((fragment) => fragment.pageIndex) ?? [];

    expect(pageIndices[0]).toBe(1);
    expect(pageIndices).toEqual(pageIndices.map((_value, index) => index + 1));
  });

  it("repeats header rows at the top of continuation pages", async () => {
    const analysis = await analyzePhase5Document(createMultiPageTableDocument());
    const fragments = analysis.tables[0]?.fragments ?? [];

    expect(fragments.length).toBeGreaterThanOrEqual(3);
    expect(fragments.slice(1).every((fragment) => fragment.headerRowCount === 1)).toBe(true);
  });

  it("keeps rowspan cells open across page breaks", async () => {
    const analysis = await analyzePhase5Document(createRowspanSplitTableDocument());
    const fragments = analysis.tables[0]?.fragments ?? [];
    const secondPage = analysis.pages[1];
    const continuationRect = secondPage?.graphics?.find((graphic) =>
      graphic.type === "rect" &&
      graphic.x === 36 &&
      graphic.width === 90 &&
      graphic.height === 72
    );
    const continuationText = secondPage?.texts.find((text) => text.value === "Launch");

    expect(analysis.pages.length).toBeGreaterThan(1);
    expect(fragments.length).toBeGreaterThan(1);
    expect(continuationRect).toBeTruthy();
    expect(continuationText?.x).toBeGreaterThan(126);
  });

  it("moves a keepTogether row to the next page instead of clipping it", async () => {
    const analysis = await analyzePhase5Document({
      page: {
        margin: 24,
        size: { width: 360, height: 240 },
      },
      children: [
        {
          type: "paragraph",
          value: "Intro block before the table.",
          style: { marginBottom: 96 },
        },
        {
          type: "table",
          columns: [{}, {}],
          header: [
            {
              cells: [
                { role: "th", children: [{ type: "paragraph", value: "Name" }] },
                { role: "th", children: [{ type: "paragraph", value: "Status" }] },
              ],
            },
          ],
          body: [
            {
              keepTogether: true,
              cells: [
                {
                  style: { minHeight: 72, padding: 6 },
                  children: [{ type: "paragraph", value: "Must stay intact" }],
                },
                {
                  style: { minHeight: 72, padding: 6 },
                  children: [{ type: "paragraph", value: "Moved to next page" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const fragments = analysis.tables[0]?.fragments ?? [];
    const rowFragments = fragments.flatMap((fragment) =>
      fragment.rowFragments
        .filter((rowFragment) => rowFragment.bodyRowIndex === 0)
        .map((rowFragment) => ({ ...rowFragment, pageIndex: fragment.pageIndex })),
    );

    expect(rowFragments).toHaveLength(1);
    expect(rowFragments[0]).toMatchObject({ pageIndex: 1, rowSliceStart: 0 });
    expect(rowFragments[0]?.height).toBeGreaterThanOrEqual(72);
    expect(analysis.pages[0]?.texts.map((text) => text.value)).not.toContain("Must stay intact");
    expect(analysis.pages[1]?.texts.map((text) => text.value)).toContain("Must stay intact");
  });

  it("preserves compact identifier columns while compressing prose", async () => {
    const analysis = await analyzePhase5Document({
      page: { margin: 24, size: { width: 420, height: 360 } },
      children: [{
        type: "table",
        columns: [{}, {}, {}],
        header: [{ cells: [
          { role: "th", children: [{ type: "paragraph", value: "SKU" }] },
          { role: "th", children: [{ type: "paragraph", value: "Description" }] },
          { role: "th", children: [{ type: "paragraph", value: "Price" }] },
        ] }],
        body: [{ cells: [
          { children: [{ type: "paragraph", value: "CAB-C6A-305W" }] },
          { children: [{ type: "paragraph", value: "A deliberately long product description with many safe wrapping opportunities" }] },
          { children: [{ type: "paragraph", value: "$1,249.00" }] },
        ] }],
      }],
    });
    const widths = analysis.tables[0]?.columnWidths ?? [];

    expect(widths).toHaveLength(3);
    expect(widths[0]).toBeGreaterThanOrEqual(80);
    expect(widths[2]).toBeGreaterThanOrEqual(50);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeLessThanOrEqual(372.01);
  });

  it("renders nested tables and produces a readable PDF buffer", async () => {
    const analysis = await analyzePhase5Document(createNestedTableDocument());
    const buffer = await PdfEngine.render(createNestedTableDocument());

    expect(analysis.pages.length).toBeGreaterThan(1);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
import { readFile } from "node:fs/promises";
