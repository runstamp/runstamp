import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { serializeSheetChunks } from "../src/serializers/sheet-serializer.js";
import { StyleRegistry } from "../src/serializers/style-registry.js";
import {
  getWorkerSheetSerializationEligibility,
  getWorkerSheetSerializationPoolStats,
  serializeSheetsInWorkers,
  terminateWorkerSheetSerializationPool,
  type WorkerSheetSerializationTask,
} from "../src/workers/sheet-serialization-worker-pool.js";
import { readZipEntry } from "./helpers.js";

type WarmPathHarness = {
  warmPathCache: Map<string, unknown>;
};

function getWarmPathCache(): Map<string, unknown> {
  return (SpreadsheetEngine as unknown as WarmPathHarness).warmPathCache;
}

function makeWarmPathWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Warm path fixture",
      creator: "Runstamp Test Suite",
    },
    sheets: [
      {
        name: "Data",
        rows: [
          { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Status" }] },
          { cells: [{ value: "APAC" }, { value: 120 }, { value: "Open" }] },
          { cells: [{ value: "EMEA" }, { value: 240 }, { value: "Closed" }] },
          { cells: [{ value: "AMER" }, { value: 180 }, { value: "Open" }] },
        ],
        tables: [
          {
            name: "RevenueTable",
            ref: "A1:C4",
          },
        ],
        conditionalFormatting: [
          {
            ref: "B2:B4",
            rules: [
              {
                type: "cellIs",
                operator: "greaterThan",
                formula: "150",
                style: {
                  fill: { color: "#FFC7CE" },
                },
              },
            ],
          },
        ],
      },
      {
        name: "Summary",
        rows: [
          { cells: [{ value: "Total" }, { formula: "SUM(Data!B2:B4)" }] },
        ],
        charts: [
          {
            type: "bar",
            title: "Revenue by region",
            series: [
              {
                name: "Data!$B$1",
                categories: "Data!$A$2:$A$4",
                values: "Data!$B$2:$B$4",
              },
            ],
            anchor: { from: { col: 3, row: 0 }, to: { col: 10, row: 12 } },
          },
        ],
      },
    ],
  };
}

function makeWorkerEligibleWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Worker eligible workbook",
      creator: "Runstamp Test Suite",
    },
    defaults: {
      columnWidth: 12,
      rowHeight: 16,
    },
    sheets: [
      {
        name: "North",
        freezePane: { row: 1, col: 1 },
        rows: [
          { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Active" }] },
          { cells: [{ value: "North" }, { value: 1200 }, { value: true }] },
          { cells: [{ value: "Updated" }, { value: new Date("2026-04-10T00:00:00.000Z") }, { value: null }] },
        ],
      },
      {
        name: "South",
        rows: [
          { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Active" }] },
          { cells: [{ value: "South" }, { value: 980 }, { value: false }] },
        ],
      },
      {
        name: "East",
        rows: [
          { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Active" }] },
          { cells: [{ value: "East" }, { value: 1430 }, { value: true }] },
        ],
      },
    ],
  };
}

function makeWorkerEligibleFeatureWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Merged",
        columns: [{ bestFit: true }, { bestFit: true }, { bestFit: true }],
        pageSetup: {
          orientation: "landscape",
          printArea: "A1:C4",
          printTitles: { rows: { start: 1, end: 1 } },
          options: { gridLines: true },
        },
        rows: [
          { cells: [{ value: "Merged title", colSpan: 3 }] },
          { cells: [{ value: "Label" }, { value: "Value" }, { value: "Note" }] },
          { cells: [{ value: "North" }, { value: 42 }, { value: "best fit source" }] },
        ],
      },
      {
        name: "Links",
        dataValidations: [
          {
            ref: "B2:B5",
            type: "whole",
            operator: "between",
            formula1: 1,
            formula2: 10,
          },
        ],
        protection: {
          password: "secret",
          formatCells: true,
          selectUnlockedCells: true,
        },
        rows: [
          {
            cells: [
              { value: "External" },
              {
                value: "Runstamp",
                hyperlink: {
                  target: "https://runstamp.com",
                  display: "Runstamp",
                },
                comment: {
                  author: "QA",
                  text: "external link",
                },
              },
            ],
          },
          {
            cells: [
              { value: "Internal" },
              {
                value: "Jump",
                hyperlink: {
                  location: "'Merged'!A1",
                  display: "Merged",
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeLargeWorkerEligibleWorkbook(): SpreadsheetDocument {
  return {
    sheets: Array.from({ length: 32 }, (_unused, sheetIndex) => ({
      name: `Region${sheetIndex + 1}`,
      rows: [
        { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Open" }] },
        ...Array.from({ length: 2_000 }, (_rowUnused, rowIndex) => ({
          cells: [
            { value: `region-${sheetIndex + 1}` },
            { value: rowIndex * (sheetIndex + 1) },
            { value: rowIndex % 3 === 0 },
          ],
        })),
      ],
    })),
  };
}

function makeWorkerEligibleRichTextAndErrorsWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "RichText",
        rows: [
          {
            cells: [
              {
                value: [
                  { text: "High ", font: { bold: true } },
                  { text: "touch", font: { italic: true, color: "#3366CC" } },
                ],
              },
              { value: { error: "#N/A" } },
            ],
          },
        ],
      },
      {
        name: "Errors",
        rows: [
          {
            cells: [
              { value: { error: "#DIV/0!" } },
              {
                value: [
                  { text: "plain " },
                  { text: "run", font: { underline: true } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function expectWorkerEligible(
  document: SpreadsheetDocument,
  stringStrategy: "sharedStrings" | "inlineStrings" = "inlineStrings",
): void {
  const options = {
    deterministic: true,
    stringStrategy,
    warmPath: true,
  } as const;
  const plan = SpreadsheetEngine.plan(document, options);
  expect(getWorkerSheetSerializationEligibility({
    document,
    options,
    resolvedStringStrategy: plan.resolvedStringStrategy,
  })).toEqual({ eligible: true });
}

async function expectWarmPathByteEquality(
  document: SpreadsheetDocument,
  stringStrategy: "sharedStrings" | "inlineStrings" = "inlineStrings",
): Promise<void> {
  expectWorkerEligible(document, stringStrategy);

  const coldBuffer = await SpreadsheetEngine.render(document, {
    deterministic: true,
    stringStrategy,
  });
  const warmBuffer = await SpreadsheetEngine.render(document, {
    deterministic: true,
    stringStrategy,
    warmPath: true,
  });

  expect(warmBuffer).toEqual(coldBuffer);
}

describe("Warm path rendering", () => {
  beforeEach(async () => {
    getWarmPathCache().clear();
    await terminateWorkerSheetSerializationPool();
  });

  afterAll(async () => {
    await terminateWorkerSheetSerializationPool();
  });

  it("keeps the default cold path unchanged", async () => {
    const document = makeWarmPathWorkbook();

    const first = await SpreadsheetEngine.render(document, { deterministic: true });
    const second = await SpreadsheetEngine.render(document, { deterministic: true });

    expect(getWarmPathCache().size).toBe(0);
    expect(second).toEqual(first);
  });

  it("reuses cached scaffold data only when warmPath is enabled", async () => {
    const document = makeWarmPathWorkbook();

    const coldBuffer = await SpreadsheetEngine.render(document, { deterministic: true });
    const firstWarmBuffer = await SpreadsheetEngine.render(document, {
      deterministic: true,
      warmPath: true,
    });
    const secondWarmBuffer = await SpreadsheetEngine.render(document, {
      deterministic: true,
      warmPath: true,
    });

    expect(getWarmPathCache().size).toBe(1);
    expect(firstWarmBuffer).toEqual(coldBuffer);
    expect(secondWarmBuffer).toEqual(coldBuffer);
  });

  it("invalidates warm-path reuse when the document is mutated in place", async () => {
    const document = makeWarmPathWorkbook();

    await SpreadsheetEngine.render(document, {
      deterministic: true,
      warmPath: true,
    });
    expect(getWarmPathCache().size).toBe(1);

    document.sheets[0]!.rows[1]!.cells[1]!.value = 130;

    const mutatedBuffer = await SpreadsheetEngine.render(document, {
      deterministic: true,
      warmPath: true,
    });
    const sheetXml = await readZipEntry(mutatedBuffer, "xl/worksheets/sheet1.xml");

    expect(getWarmPathCache().size).toBe(2);
    expect(sheetXml).toContain("<v>130</v>");
    expect(sheetXml).not.toContain("<v>120</v>");
  });

  it("serializes eligible sheet XML in a real worker with sequential byte parity", async () => {
    const document = makeWorkerEligibleFeatureWorkbook();
    expectWorkerEligible(document);
    const tasks = document.sheets.map((sheet, index): WorkerSheetSerializationTask => ({
      defaults: document.defaults,
      rowChunkSize: 100,
      selected: index === 0,
      sheet,
      sheetIndex: index,
      stringStrategy: "inlineStrings",
    }));

    const workerSheets = await serializeSheetsInWorkers(tasks);
    const sequentialSheets = document.sheets.map((sheet, index) => serializeSheetChunks(sheet, {
      defaults: document.defaults,
      formulaEvaluator: null,
      rowChunkSize: 100,
      selected: index === 0,
      sheetIndex: index,
      stringStrategy: "inlineStrings",
      styleRegistry: new StyleRegistry(document.defaults),
    }));

    expect(workerSheets).toEqual(sequentialSheets);
  });

  it("keeps warm-path output byte-identical for eligible plain multi-sheet workbooks", async () => {
    await expectWarmPathByteEquality(makeWorkerEligibleWorkbook());
  });

  it("keeps warm-path worker output byte-identical for eligible sheet features", async () => {
    await expectWarmPathByteEquality(makeWorkerEligibleFeatureWorkbook());
  });

  it("keeps rich text and error values eligible because they do not require workbook-global registries", async () => {
    await expectWarmPathByteEquality(makeWorkerEligibleRichTextAndErrorsWorkbook());
  });

  it("keeps small eligible warm-path workbooks on the sequential path until workers are primed", async () => {
    await expectWarmPathByteEquality(makeWorkerEligibleWorkbook());

    expect(getWorkerSheetSerializationPoolStats().workerCount).toBe(0);
  });

  it("reuses the same worker pool across repeated eligible warm-path renders", async () => {
    const document = makeLargeWorkerEligibleWorkbook();
    const options = {
      deterministic: true,
      stringStrategy: "inlineStrings",
      warmPath: true,
    } as const;

    const first = await SpreadsheetEngine.render(document, options);
    const afterFirstRender = getWorkerSheetSerializationPoolStats();
    const second = await SpreadsheetEngine.render(document, options);
    const afterSecondRender = getWorkerSheetSerializationPoolStats();

    expect(second).toEqual(first);
    expect(afterFirstRender.workerCount).toBeGreaterThan(0);
    expect(afterSecondRender.workerCount).toBe(afterFirstRender.workerCount);
    expect(afterSecondRender.createdWorkerCount).toBe(afterFirstRender.createdWorkerCount);
  }, 30_000);

  it("keeps registry-sensitive workbooks off the worker path", () => {
    const base = makeWorkerEligibleWorkbook();
    const cases: Array<[string, SpreadsheetDocument, string]> = [
      [
        "shared strings",
        base,
        "shared strings require workbook-global string ordering",
      ],
      [
        "cell styles",
        {
          sheets: [
            { name: "A", rows: [{ cells: [{ value: "styled", style: { font: { bold: true } } }] }] },
            { name: "B", rows: [{ cells: [{ value: "plain" }] }] },
          ],
        },
        "cell styles require workbook-global style ordering",
      ],
      [
        "formulas",
        {
          sheets: [
            { name: "A", rows: [{ cells: [{ value: 1 }] }] },
            { name: "B", rows: [{ cells: [{ formula: "A!A1" }] }] },
          ],
        },
        "formulas require main-thread formula evaluation and ordering",
      ],
      [
        "conditional formatting",
        {
          sheets: [
            {
              name: "A",
              rows: [{ cells: [{ value: 1 }] }],
              conditionalFormatting: [{
                ref: "A1",
                rules: [{
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "0",
                  style: { fill: { color: "#FFEEAA" } },
                }],
              }],
            },
            { name: "B", rows: [{ cells: [{ value: 2 }] }] },
          ],
        },
        "conditional formatting requires workbook-global DXF style ordering",
      ],
      [
        "tables",
        {
          sheets: [
            {
              name: "A",
              rows: [
                { cells: [{ value: "Name" }] },
                { cells: [{ value: "North" }] },
              ],
              tables: [{ name: "T_A", ref: "A1:A2" }],
            },
            { name: "B", rows: [{ cells: [{ value: "plain" }] }] },
          ],
        },
        "tables require workbook-global table part ordering",
      ],
      [
        "charts",
        {
          sheets: [
            {
              name: "A",
              rows: [
                { cells: [{ value: "Label" }, { value: "Value" }] },
                { cells: [{ value: "North" }, { value: 1 }] },
              ],
              charts: [{
                type: "bar",
                series: [{ categories: "A!$A$2:$A$2", values: "A!$B$2:$B$2" }],
                anchor: { from: { col: 3, row: 1 }, to: { col: 8, row: 12 } },
              }],
            },
            { name: "B", rows: [{ cells: [{ value: "plain" }] }] },
          ],
        },
        "drawings require workbook-global media/chart part ordering",
      ],
      [
        "pivots",
        {
          sheets: [
            {
              name: "Data",
              rows: [
                { cells: [{ value: "Region" }, { value: "Value" }] },
                { cells: [{ value: "North" }, { value: 1 }] },
              ],
            },
            {
              name: "Pivot",
              rows: [],
              pivotTables: [{
                name: "PivotOne",
                sourceSheet: "Data",
                sourceRef: "A1:B2",
                targetCell: "A1",
                rowFields: ["Region"],
                valueFields: [{ name: "Value" }],
              }],
            },
          ],
        },
        "pivots require workbook-global pivot part ordering",
      ],
    ];

    const sharedStringPlan = SpreadsheetEngine.plan(base, {
      deterministic: true,
      stringStrategy: "sharedStrings",
      warmPath: true,
    });
    expect(getWorkerSheetSerializationEligibility({
      document: base,
      options: { deterministic: true, stringStrategy: "sharedStrings", warmPath: true },
      resolvedStringStrategy: sharedStringPlan.resolvedStringStrategy,
    })).toEqual({
      eligible: false,
      reason: "shared strings require workbook-global string ordering",
    });

    for (const [name, document, reason] of cases.slice(1)) {
      const options = { deterministic: true, stringStrategy: "inlineStrings", warmPath: true } as const;
      const plan = SpreadsheetEngine.plan(document, options);
      expect(getWorkerSheetSerializationEligibility({
        document,
        options,
        resolvedStringStrategy: plan.resolvedStringStrategy,
      }), name).toEqual({ eligible: false, reason });
    }
  });
});
