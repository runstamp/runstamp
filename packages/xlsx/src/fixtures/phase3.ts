import type { SpreadsheetDocument } from "../types/spreadsheet-ast.js";

export interface Phase3FixtureDefinition {
  name: string;
  description: string;
  document: SpreadsheetDocument;
}

function createRow(values: SpreadsheetDocument["sheets"][number]["rows"][number]["cells"]) {
  return { cells: values };
}

export const phase3Fixtures: Phase3FixtureDefinition[] = [
  {
    name: "phase3-merge-freeze-filter",
    description: "Merged title block with freeze panes and auto-filter",
    document: {
      sheets: [
        {
          name: "Revenue",
          tabColor: "#4472C4",
          freezePane: { row: 2, col: 1 },
          autoFilter: true,
          rows: [
            createRow([
              {
                value: "Revenue Report",
                colSpan: 4,
                rowSpan: 2,
                style: {
                  fill: { color: "#D9E2F3" },
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin", color: "#5B9BD5" },
                    bottom: { style: "thin", color: "#5B9BD5" },
                    left: { style: "thin", color: "#5B9BD5" },
                    right: { style: "thin", color: "#5B9BD5" },
                  },
                },
              },
              { value: "Status", style: "header" },
            ]),
            createRow([{ value: "Healthy" }]),
            createRow([{ value: "Quarter" }, { value: "Revenue" }, { value: "Growth" }, { value: "Region" }, { value: "Status" }]),
            createRow([{ value: "Q1" }, { value: 420000, style: "currency" }, { value: 0.24, style: "percentage" }, { value: "NA" }, { value: "Healthy" }]),
            createRow([{ value: "Q2" }, { value: 510000, style: "currency" }, { value: 0.27, style: "percentage" }, { value: "EMEA" }, { value: "At Risk" }]),
          ],
        },
      ],
    },
  },
  {
    name: "phase3-sheet-state-named-ranges",
    description: "Hidden sheet, visible summary sheet, and workbook named ranges",
    document: {
      namedRanges: [
        { name: "RevenueData", ref: "Data!$B$2:$B$4" },
        { name: "SummaryCell", ref: "Summary!$A$1", scope: "Summary" },
      ],
      sheets: [
        {
          name: "Data",
          state: "hidden",
          rows: [
            createRow([{ value: "Quarter" }, { value: "Revenue" }]),
            createRow([{ value: "Q1" }, { value: 420000 }]),
            createRow([{ value: "Q2" }, { value: 510000 }]),
            createRow([{ value: "Q3" }, { value: 630000 }]),
          ],
        },
        {
          name: "Summary",
          rows: [
            createRow([{ value: "Summary" }]),
          ],
        },
      ],
    },
  },
  {
    name: "phase3-validations-hyperlinks",
    description: "Sheet data validations with internal and external hyperlinks",
    document: {
      namedRanges: [
        { name: "StatusList", ref: "Lookups!$A$1:$A$3" },
      ],
      sheets: [
        {
          name: "Summary",
          dataValidations: [
            {
              ref: "B2:B10",
              type: "list",
              formula1: "=StatusList",
              showDropDown: true,
              allowBlank: true,
              showInputMessage: true,
              promptTitle: "Status",
              prompt: "Choose one of the approved statuses",
              showErrorMessage: true,
              errorTitle: "Invalid status",
              error: "Select a status from the dropdown",
              errorStyle: "stop",
            },
            {
              ref: "C2:C10",
              type: "whole",
              operator: "between",
              formula1: "0",
              formula2: "1000000",
            },
          ],
          rows: [
            createRow([{ value: "Account" }, { value: "Status" }, { value: "Budget" }, { value: "Docs" }]),
            createRow([
              { value: "Northwind" },
              { value: "Active" },
              { value: 250000, style: "currency" },
              {
                value: "Policy",
                hyperlink: {
                  target: "https://example.com/policy",
                  tooltip: "Open the policy guide",
                },
              },
            ]),
            createRow([
              { value: "Contoso" },
              { value: "Pending" },
              { value: 180000, style: "currency" },
              {
                value: "Jump to lookups",
                hyperlink: {
                  location: "Lookups!A1",
                  display: "Lookup values",
                },
              },
            ]),
          ],
        },
        {
          name: "Lookups",
          rows: [
            createRow([{ value: "Active" }]),
            createRow([{ value: "Inactive" }]),
            createRow([{ value: "Pending" }]),
          ],
        },
      ],
    },
  },
  {
    name: "phase3-print-setup",
    description: "Landscape print setup with print area and repeating titles",
    document: {
      sheets: [
        {
          name: "Report",
          pageSetup: {
            orientation: "landscape",
            paperSize: 1,
            scale: 85,
            fitToWidth: 1,
            fitToHeight: 0,
            printArea: "A1:D40",
            printTitles: {
              rows: { start: 0, end: 1 },
              columns: { start: 0, end: 0 },
            },
            options: {
              gridLines: true,
            },
            margins: {
              left: 0.7,
              right: 0.7,
              top: 0.75,
              bottom: 0.75,
              header: 0.3,
              footer: 0.3,
            },
          },
          rows: [
            createRow([{ value: "Region" }, { value: "Quarter" }, { value: "Revenue" }, { value: "Growth" }]),
            createRow([{ value: "NA" }, { value: "Q1" }, { value: 420000, style: "currency" }, { value: 0.24, style: "percentage" }]),
            ...Array.from({ length: 38 }, (_unused, index) => (
              createRow([
                { value: index % 2 === 0 ? "EMEA" : "APAC" },
                { value: `Q${(index % 4) + 1}` },
                { value: 100000 + (index * 5000), style: "currency" },
                { value: 0.1 + (index * 0.005), style: "percentage" },
              ])
            )),
          ],
        },
      ],
    },
  },
  {
    name: "phase3-formulas",
    description: "Formula pass-through with cached values, array ranges, and cross-sheet refs",
    document: {
      sheets: [
        {
          name: "Data Analysis",
          rows: [
            createRow([{ value: 2 }, { value: 3 }]),
          ],
        },
        {
          name: "Summary",
          rows: [
            createRow([
              { formula: "SUM('Data Analysis'!A1:B1)" },
              { formula: "IF(A2<B2,\"<less>\",\">=more\")" },
              { formula: "ROUND(ABS(-12.345),2)" },
              { formula: { expression: "SUM(A2:B2)", arrayRange: "D1:D3", cachedValue: 3 } },
              { formula: "IF(A2>B2,TRUE,FALSE)" },
              { formula: "IFERROR(VLOOKUP(A2,'Data Analysis'!A:B,2,FALSE),\"\")" },
              { formula: { expression: "A2/0", cachedValue: { error: "#DIV/0!" } } },
              { formula: { expression: "SEQUENCE(3)", dynamic: true } },
            ]),
            createRow([{ value: 1 }, { value: 2 }]),
          ],
        },
      ],
    },
  },
];

export function listPhase3Fixtures(): Phase3FixtureDefinition[] {
  return phase3Fixtures;
}
