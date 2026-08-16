import type { SpreadsheetDocument, SpreadsheetRenderOptions } from "../types/spreadsheet-ast.js";

export interface Phase4FixtureDefinition {
  name: string;
  description: string;
  document: SpreadsheetDocument;
  renderOptions?: SpreadsheetRenderOptions;
}

export const phase4Fixtures: Phase4FixtureDefinition[] = [
  {
    name: "phase4-inline-strings",
    description: "Buffer render using inline strings selected explicitly for high-uniqueness text data",
    renderOptions: {
      stringStrategy: "inlineStrings",
    },
    document: {
      sheets: [
        {
          name: "InlineStrings",
          rows: Array.from({ length: 120 }, (_unused, rowIndex) => ({
            cells: [
              { value: `customer-${rowIndex}-account` },
              { value: `memo-${rowIndex}-` + "x".repeat((rowIndex % 7) + 4) },
              { value: rowIndex },
            ],
          })),
        },
      ],
    },
  },
  {
    name: "phase4-auto-inline-strings",
    description: "Auto-planned large workbook that crosses the inline-string threshold without explicit override",
    document: {
      sheets: [
        {
          name: "AutoInline",
          rows: Array.from({ length: 50_001 }, (_unused, rowIndex) => ({
            cells: [
              { value: `customer-${rowIndex}-alpha` },
              { value: `customer-${rowIndex}-beta` },
              { value: rowIndex },
            ],
          })),
        },
      ],
    },
  },
  {
    name: "phase4-native-table",
    description: "Native Excel table with totals row, table style, and deterministic OOXML table parts",
    document: {
      sheets: [
        {
          name: "Revenue",
          rows: [
            { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Status" }] },
            { cells: [{ value: "APAC" }, { value: 120 }, { value: "Open" }] },
            { cells: [{ value: "EMEA" }, { value: 240 }, { value: "Closed" }] },
            { cells: [{ value: null }, { value: null }, { value: null }] },
          ],
          tables: [
            {
              name: "RevenueTable",
              ref: "A1:C4",
              totalsRow: true,
              columns: [
                { totalsRowLabel: "Total" },
                { totalsRowFunction: "sum" },
                {},
              ],
              style: {
                name: "TableStyleMedium9",
                showFirstColumn: true,
              },
            },
          ],
        },
      ],
    },
  },
];

export function listPhase4Fixtures(): Phase4FixtureDefinition[] {
  return phase4Fixtures;
}
