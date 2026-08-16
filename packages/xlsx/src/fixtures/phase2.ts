import type { SpreadsheetDocument } from "../types/spreadsheet-ast.js";

export interface Phase2FixtureDefinition {
  name: string;
  description: string;
  document: SpreadsheetDocument;
}

function createRow(values: SpreadsheetDocument["sheets"][number]["rows"][number]["cells"]) {
  return { cells: values };
}

export const phase2Fixtures: Phase2FixtureDefinition[] = [
  {
    name: "phase2-presets",
    description: "Built-in preset styles across headers, totals, and statuses",
    document: {
      sheets: [
        {
          name: "Presets",
          rows: [
            createRow([{ value: "Preset" }, { value: "Preview" }, { value: "Value" }]),
            createRow([{ value: "header" }, { value: "Revenue", style: "header" }, { value: 420000, style: "currency" }]),
            createRow([{ value: "headerDark" }, { value: "Costs", style: "headerDark" }, { value: 320000, style: "currency" }]),
            createRow([{ value: "headerGreen" }, { value: "Margin", style: "headerGreen" }, { value: 0.238, style: "percentage" }]),
            createRow([{ value: "subheader" }, { value: "Pipeline", style: "subheader" }, { value: 18450, style: "integer" }]),
            createRow([{ value: "warning" }, { value: "Delayed", style: "warning" }, { value: "At Risk" }]),
            createRow([{ value: "error" }, { value: "Down", style: "error" }, { value: "Escalate" }]),
            createRow([{ value: "success" }, { value: "Healthy", style: "success" }, { value: "On Track" }]),
            createRow([{ value: "neutral" }, { value: "Pending", style: "neutral" }, { value: "Review" }]),
            createRow([{ value: "total" }, { value: "Grand Total", style: "total" }, { value: 740000, style: "total" }]),
          ],
        },
      ],
    },
  },
  {
    name: "phase2-font-fill-border",
    description: "Fonts, fills, and border styles",
    document: {
      sheets: [
        {
          name: "Styles",
          rows: [
            createRow([
              { value: "Bold", style: { font: { bold: true } } },
              { value: "Italic", style: { font: { italic: true } } },
              { value: "Underline", style: { font: { underline: true } } },
              { value: "Strike", style: { font: { strikethrough: true } } },
            ]),
            createRow([
              { value: "Fill", style: { fill: { color: "#DDEBF7" } } },
              { value: "Border", style: { border: { bottom: { style: "thick", color: "#333333" } } } },
              { value: "Accent", style: { font: { color: "#4472C4" }, fill: { color: "#E2F0D9" } } },
              { value: "Center", style: { alignment: { horizontal: "center", vertical: "center" } } },
            ]),
          ],
        },
      ],
    },
  },
  {
    name: "phase2-number-formats",
    description: "Number and date format aliases",
    document: {
      sheets: [
        {
          name: "Formats",
          rows: [
            createRow([{ value: "Currency" }, { value: "Percentage" }, { value: "Date" }, { value: "Datetime" }, { value: "Accounting" }]),
            createRow([
              { value: 420000.5, style: "currency" },
              { value: 0.214, style: "percentage" },
              { value: new Date("2026-03-27T00:00:00.000Z"), style: "date" },
              { value: new Date("2026-03-27T13:45:00.000Z"), style: "datetime" },
              { value: 420000.5, style: { numberFormat: "accounting" } },
            ]),
          ],
        },
      ],
    },
  },
  {
    name: "phase2-alignment-richtext",
    description: "Wrap text, row height growth, and rich text runs",
    document: {
      sheets: [
        {
          name: "Alignment",
          columns: [{ width: 12 }, { width: 18 }],
          rows: [
            createRow([
              { value: "Wrapped text example that should increase row height", style: { alignment: { wrapText: true } } },
              {
                value: [
                  { text: "Revenue: ", font: { bold: true } },
                  { text: "$420,000", font: { bold: true, color: "#006100" } },
                  { text: " (+21.4%)", font: { italic: true, color: "#666666" } },
                ],
              },
            ]),
          ],
        },
      ],
    },
  },
  {
    name: "phase2-conditional-formatting",
    description: "Conditional formatting rules across a simple score range",
    document: {
      sheets: [
        {
          name: "CF",
          conditionalFormatting: [
            {
              ref: "B2:B11",
              rules: [
                {
                  type: "cellIs",
                  operator: "greaterThan",
                  formula: "80",
                  style: "success",
                },
                {
                  type: "colorScale",
                  scale: {
                    min: { type: "min", color: "#F8696B" },
                    mid: { type: "percentile", value: 50, color: "#FFEB84" },
                    max: { type: "max", color: "#63BE7B" },
                  },
                },
                {
                  type: "dataBar",
                  color: "#4472C4",
                  min: { type: "min" },
                  max: { type: "max" },
                },
              ],
            },
          ],
          rows: [
            createRow([{ value: "Name" }, { value: "Score" }]),
            ...Array.from({ length: 10 }, (_unused, index) => createRow([
              { value: `Item ${index + 1}` },
              { value: 10 + (index * 10) },
            ])),
          ],
        },
      ],
    },
  },
  {
    name: "phase2-sheet-styling",
    description: "Header row and alternating row styling sugar",
    document: {
      sheets: [
        {
          name: "Sugar",
          styling: {
            headerRow: "header",
            alternateRows: {
              even: "neutral",
            },
          },
          rows: [
            createRow([{ value: "Quarter" }, { value: "Revenue" }, { value: "Growth" }]),
            createRow([{ value: "Q1" }, { value: 420000, style: "currency" }, { value: 0.214, style: "percentage" }]),
            createRow([{ value: "Q2" }, { value: 510000, style: "currency" }, { value: 0.235, style: "percentage" }]),
            createRow([{ value: "Q3" }, { value: 630000, style: "currency" }, { value: 0.238, style: "percentage" }]),
          ],
        },
      ],
    },
  },
];

export function listPhase2Fixtures(): Phase2FixtureDefinition[] {
  return phase2Fixtures;
}
