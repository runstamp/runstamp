import type {
  SpreadsheetCellStyle,
  SpreadsheetDocument,
} from "../types/spreadsheet-ast.js";

const BORDER_STYLES = [
  "thin",
  "medium",
  "thick",
  "double",
  "dotted",
  "dashed",
  "dashDot",
  "dashDotDot",
  "hair",
  "mediumDashed",
  "mediumDashDot",
  "mediumDashDotDot",
  "slantDashDot",
] as const;

const H_ALIGNMENTS = [
  "left",
  "center",
  "right",
  "justify",
  "distributed",
  "general",
] as const;

const V_ALIGNMENTS = ["top", "center", "bottom"] as const;
const FORMAT_ALIASES = [
  "currency",
  "currency:KRW",
  "currency:EUR",
  "percentage",
  "percentage:2",
  "date",
  "datetime",
  "accounting",
  "number:0",
  "number:2",
] as const;

function createStyle(index: number): SpreadsheetCellStyle {
  const primary = (index * 2_654_435_761) % 0xFFFFFF;
  const secondary = (index * 40_503) % 0xFFFFFF;
  const tertiary = (index * 811) % 0xFFFFFF;
  return {
    font: {
      family: index % 3 === 0 ? "Calibri" : (index % 3 === 1 ? "Arial" : "Courier New"),
      size: 10 + (index % 4),
      bold: index % 2 === 0,
      italic: index % 5 === 0,
      underline: index % 7 === 0 ? "single" : undefined,
      color: `#${primary.toString(16).padStart(6, "0")}`,
    },
    fill: {
      color: `#${secondary.toString(16).padStart(6, "0")}`,
    },
    border: {
      bottom: {
        style: BORDER_STYLES[index % BORDER_STYLES.length],
        color: `#${tertiary.toString(16).padStart(6, "0")}`,
      },
    },
    alignment: {
      horizontal: H_ALIGNMENTS[index % H_ALIGNMENTS.length],
      vertical: V_ALIGNMENTS[index % V_ALIGNMENTS.length],
      wrapText: index % 4 === 0,
    },
    numberFormat: FORMAT_ALIASES[index % FORMAT_ALIASES.length],
  };
}

function createStylePalette(size: number): SpreadsheetCellStyle[] {
  return Array.from({ length: size }, (_unused, index) => createStyle(index));
}

export function createStyledWorkbook(
  rowCount: number,
  colCount: number,
  paletteSize: number,
  sheetName: string,
): SpreadsheetDocument {
  const palette = createStylePalette(paletteSize);
  const rows = Array.from({ length: rowCount }, (_rowUnused, rowIndex) => ({
    cells: Array.from({ length: colCount }, (_colUnused, colIndex) => {
      const ordinal = rowIndex * colCount + colIndex;
      const style = palette[ordinal % palette.length];

      if (colIndex % 5 === 0) {
        return { value: `Row ${rowIndex + 1}`, style };
      }
      if (colIndex % 5 === 1) {
        return { value: ordinal, style };
      }
      if (colIndex % 5 === 2) {
        return { value: (rowIndex + 1) / (colIndex + 1), style };
      }
      if (colIndex % 5 === 3) {
        return { value: rowIndex % 2 === 0, style };
      }
      return { value: new Date(Date.UTC(2026, 0, (rowIndex % 28) + 1)), style };
    }),
  }));

  return {
    meta: {
      title: `${sheetName} ${rowCount}x${colCount}`,
      creator: "Runstamp",
    },
    sheets: [
      {
        name: sheetName,
        rows,
      },
    ],
  };
}

export function createRepairCorpusDocument(): SpreadsheetDocument {
  return {
    namedRanges: [
      { name: "LedgerWindow", ref: "Ledger!$A$2:$D$5" },
    ],
    sheets: [
      {
        name: "Ledger",
        dataValidations: [
          {
            ref: "C3:C20",
            type: "list",
            formula1: "\"Open,Closed,Pending\"",
            allowBlank: true,
          },
        ],
        rows: [
          {
            cells: [
              {
                value: "Ledger Overview",
                colSpan: 4,
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
            ],
          },
          {
            cells: [
              { value: "Account", style: "header" },
              { value: "Amount", style: "header" },
              { value: "Status", style: "header" },
              { value: "Docs", style: "header" },
            ],
          },
          {
            cells: [
              { value: "Northwind" },
              { value: 120_000, style: "currency" },
              { value: "Open" },
              {
                value: "Policy",
                hyperlink: {
                  target: "https://example.com/policy",
                  tooltip: "Open the policy document",
                },
              },
            ],
          },
          {
            cells: [
              { value: "Contoso" },
              { value: 85_500, style: "currency" },
              { value: "Closed" },
              {
                value: "Guide",
                hyperlink: {
                  location: "Lookups!A1",
                  display: "Jump to lookup sheet",
                },
              },
            ],
          },
          {
            cells: [
              { value: "Fabrikam" },
              { value: 61_250, style: "currency" },
              { value: "Pending" },
              { value: "Escalated" },
            ],
          },
        ],
        tables: [
          {
            name: "LedgerTable",
            ref: "A2:D5",
            columns: [{}, {}, {}, {}],
            style: {
              name: "TableStyleMedium2",
            },
          },
        ],
      },
      {
        name: "Lookups",
        rows: [
          { cells: [{ value: "Open" }] },
          { cells: [{ value: "Closed" }] },
          { cells: [{ value: "Pending" }] },
        ],
      },
    ],
  };
}

export function createDuplicateTablesDocument(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "North",
        rows: [
          {
            cells: [
              { value: "Region" },
              { value: "Revenue" },
            ],
          },
          {
            cells: [
              { value: "NA" },
              { value: 120 },
            ],
          },
          {
            cells: [
              { value: "EMEA" },
              { value: 180 },
            ],
          },
        ],
        tables: [
          {
            name: "NorthTable",
            ref: "A1:B3",
            columns: [{}, {}],
          },
        ],
      },
      {
        name: "South",
        rows: [
          {
            cells: [
              { value: "Region" },
              { value: "Revenue" },
            ],
          },
          {
            cells: [
              { value: "APAC" },
              { value: 90 },
            ],
          },
          {
            cells: [
              { value: "LATAM" },
              { value: 75 },
            ],
          },
        ],
        tables: [
          {
            name: "SouthTable",
            ref: "A1:B3",
            columns: [{}, {}],
          },
        ],
      },
    ],
  };
}

export function createTemplateBenchmarkDocument(): SpreadsheetDocument {
  return {
    namedRanges: [
      { name: "InvoiceHeader", ref: "Invoice!$B$1" },
      { name: "LineItems", ref: "Invoice!$A$4:$D$4" },
    ],
    sheets: [
      {
        name: "Invoice",
        rows: [
          {
            cells: [
              { value: "Customer" },
              { value: "Acme Co" },
            ],
          },
          {
            cells: [
              { value: "Prepared" },
              { value: new Date(Date.UTC(2026, 2, 28)) },
            ],
          },
          {
            cells: [
              { value: "Item", style: "header" },
              { value: "Qty", style: "header" },
              { value: "Price", style: "header" },
              { value: "Total", style: "header" },
            ],
          },
          {
            cells: [
              { value: "Starter" },
              { value: 1 },
              { value: 10 },
              { formula: "B4*C4", style: "currency" },
            ],
          },
          {
            cells: [
              { value: "Grand Total" },
              { value: null },
              { value: null },
              { formula: "SUM(D4:D4)", style: "currency" },
            ],
          },
        ],
        tables: [
          {
            name: "InvoiceTable",
            ref: "A3:D4",
            columns: [{}, {}, {}, {}],
            style: {
              name: "TableStyleMedium9",
            },
          },
        ],
      },
    ],
  };
}
