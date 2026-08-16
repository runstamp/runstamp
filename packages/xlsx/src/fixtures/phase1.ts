import type { SpreadsheetDocument, SpreadsheetSheet } from "../types/spreadsheet-ast.js";

export type Phase1FixtureName =
  | "empty"
  | "single-cell"
  | "types-mixed"
  | "types-edge"
  | "strings-unicode"
  | "strings-xml-hostile"
  | "strings-whitespace"
  | "dates-range"
  | "multi-sheet"
  | "sheet-names"
  | "columns-width"
  | "rows-hidden"
  | "medium"
  | "large-10k"
  | "large-50k"
  | "large-100k"
  | "determinism-seed";

export interface Phase1FixtureDefinition {
  name: Phase1FixtureName;
  description: string;
  document: SpreadsheetDocument;
  rows: number;
  cols: number;
  sheets: number;
}

function createRow(values: Array<string | number | boolean | Date | null>) {
  return {
    cells: values.map((value) => ({ value })),
  };
}

function createLargeWorkbook(rowCount: number, colCount: number, sheetName = "Data"): SpreadsheetDocument {
  const rows = Array.from({ length: rowCount }, (_unused, rowIndex) => ({
    cells: Array.from({ length: colCount }, (_colUnused, colIndex) => {
      if (colIndex % 5 === 0) {
        return { value: `Row ${rowIndex + 1}` };
      }
      if (colIndex % 5 === 1) {
        return { value: rowIndex * colCount + colIndex };
      }
      if (colIndex % 5 === 2) {
        return { value: (rowIndex + 1) / (colIndex + 1) };
      }
      if (colIndex % 5 === 3) {
        return { value: colIndex % 2 === 0 };
      }
      return { value: new Date(Date.UTC(2026, 0, ((rowIndex % 28) + 1))) };
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

function createMediumWorkbook(): SpreadsheetDocument {
  const productNames = ["Platform", "API", "Analytics", "Support", "Enterprise"];
  const regions = ["NA", "EMEA", "APAC"];
  const sheets: SpreadsheetSheet[] = ["Revenue", "Pipeline", "Retention"].map((sheetName, sheetIndex) => ({
    name: sheetName,
    rows: [
      createRow(["Month", "Product", "Region", "Bookings", "Margin", "Headcount", "Closed", "Run Date", "Segment", "Owner", "Expansion", "Notes"]),
      ...Array.from({ length: 499 }, (_unused, rowIndex) => {
        const month = ((rowIndex + sheetIndex) % 12) + 1;
        const day = (rowIndex % 28) + 1;
        const product = productNames[rowIndex % productNames.length];
        const region = regions[(rowIndex + sheetIndex) % regions.length];
        return createRow([
          `2026-${String(month).padStart(2, "0")}`,
          product,
          region,
          100_000 + (rowIndex * 137),
          Number(((rowIndex % 35) / 100).toFixed(3)),
          12 + (rowIndex % 40),
          rowIndex % 2 === 0,
          new Date(Date.UTC(2026, month - 1, day)),
          rowIndex % 3 === 0 ? "Enterprise" : "SMB",
          `Owner ${(rowIndex % 11) + 1}`,
          rowIndex % 5 === 0 ? 25_000 : null,
          rowIndex % 7 === 0 ? "Renewal at risk" : "",
        ]);
      }),
    ],
  }));

  return {
    meta: {
      title: "Medium Financial Dataset",
      creator: "Runstamp",
    },
    sheets,
  };
}

export const phase1Fixtures: Record<Phase1FixtureName, Phase1FixtureDefinition> = {
  "empty": {
    name: "empty",
    description: "Single sheet, zero rows",
    document: {
      sheets: [{ name: "Empty", rows: [] }],
    },
    rows: 0,
    cols: 0,
    sheets: 1,
  },
  "single-cell": {
    name: "single-cell",
    description: "One cell workbook",
    document: {
      sheets: [{ name: "Hello", rows: [createRow(["Hello"])] }],
    },
    rows: 1,
    cols: 1,
    sheets: 1,
  },
  "types-mixed": {
    name: "types-mixed",
    description: "String, number, boolean, date, null",
    document: {
      sheets: [{ name: "Mixed", rows: [createRow(["Text", 42, true, new Date(Date.UTC(2026, 2, 27)), null])] }],
    },
    rows: 1,
    cols: 5,
    sheets: 1,
  },
  "types-edge": {
    name: "types-edge",
    description: "Numeric and date edge cases",
    document: {
      sheets: [{ name: "Edges", rows: [createRow(["", 0, false, new Date(Date.UTC(1900, 0, 1)), 1e308, 1e-308, -0])] }],
    },
    rows: 1,
    cols: 7,
    sheets: 1,
  },
  "strings-unicode": {
    name: "strings-unicode",
    description: "Unicode coverage including CJK, RTL, emoji, and combining marks",
    document: {
      sheets: [{
        name: "Unicode",
        rows: [
          createRow(["Japanese", "Arabic", "Emoji"]),
          ...Array.from({ length: 19 }, (_unused, index) => createRow([
            `日本語シート ${index + 1}`,
            `مرحبا ${index + 1}`,
            `👋🏻 cafe\u0301 family-${index + 1} \u200D join`,
          ])),
        ],
      }],
    },
    rows: 20,
    cols: 3,
    sheets: 1,
  },
  "strings-xml-hostile": {
    name: "strings-xml-hostile",
    description: "XML escaping and control-character cleanup",
    document: {
      sheets: [{
        name: "Hostile",
        rows: Array.from({ length: 10 }, (_unused, index) => createRow([
          `<script>alert(${index})</script>`,
          `\u0001bad\u0008text ${index} &amp; "quotes" 'apos' <![CDATA[test]]>`,
        ])),
      }],
    },
    rows: 10,
    cols: 2,
    sheets: 1,
  },
  "strings-whitespace": {
    name: "strings-whitespace",
    description: "Leading, trailing, tabs, newlines, and empty-string preservation",
    document: {
      sheets: [{
        name: "Whitespace",
        rows: [
          createRow(["  leading", "trailing  ", "\tTabbed"]),
          createRow(["line\nbreak", "carriage\rreturn", "mixed\r\nnewline"]),
          createRow(["multiple   spaces", "", null]),
          ...Array.from({ length: 7 }, (_unused, index) => createRow([`  row ${index}  `, `line ${index}\nline ${index + 1}`, "\t"])),
        ],
      }],
    },
    rows: 10,
    cols: 3,
    sheets: 1,
  },
  "dates-range": {
    name: "dates-range",
    description: "Excel date serial boundaries",
    document: {
      sheets: [{
        name: "Dates",
        rows: [
          createRow(["Label", "Date"]),
          createRow(["day1", new Date(Date.UTC(1900, 0, 1))]),
          createRow(["day59", new Date(Date.UTC(1900, 1, 28))]),
          createRow(["day61", new Date(Date.UTC(1900, 2, 1))]),
          createRow(["today", new Date(Date.UTC(2026, 2, 27))]),
          createRow(["max-ish", new Date(Date.UTC(9999, 11, 31))]),
        ],
      }],
    },
    rows: 6,
    cols: 2,
    sheets: 1,
  },
  "multi-sheet": {
    name: "multi-sheet",
    description: "Three sheets with different shapes",
    document: {
      sheets: [
        { name: "Revenue", rows: Array.from({ length: 10 }, (_unused, index) => createRow([`Q${index + 1}`, 1000 + index, index % 2 === 0])) },
        { name: "Pipeline", rows: Array.from({ length: 20 }, (_unused, index) => createRow([`Deal ${index + 1}`, 50_000 + index * 100, "Open", new Date(Date.UTC(2026, 0, (index % 28) + 1)), null])) },
        { name: "Summary", rows: Array.from({ length: 5 }, (_unused, index) => createRow([`Metric ${index + 1}`, index * 10])) },
      ],
    },
    rows: 35,
    cols: 5,
    sheets: 3,
  },
  "sheet-names": {
    name: "sheet-names",
    description: "Representative valid sheet names",
    document: {
      sheets: [
        { name: "Revenue", rows: [createRow([1])] },
        { name: "Data & Analysis", rows: [createRow([1])] },
        { name: "Sheet 3", rows: [createRow([1])] },
        { name: "日本語シート", rows: [createRow([1])] },
        { name: "Thirty-One-Chars-Max-Name-Here!", rows: [createRow([1])] },
      ],
    },
    rows: 5,
    cols: 1,
    sheets: 5,
  },
  "columns-width": {
    name: "columns-width",
    description: "Explicit column widths",
    document: {
      sheets: [{
        name: "Widths",
        columns: [{ width: 5 }, { width: 15 }, { width: 30 }, { width: 100 }],
        rows: Array.from({ length: 5 }, (_unused, index) => createRow([`A${index}`, `B${index}`, `C${index}`, `D${index}`])),
      }],
    },
    rows: 5,
    cols: 4,
    sheets: 1,
  },
  "rows-hidden": {
    name: "rows-hidden",
    description: "Visible and hidden rows",
    document: {
      sheets: [{
        name: "HiddenRows",
        rows: Array.from({ length: 10 }, (_unused, index) => ({
          hidden: index % 3 === 0,
          cells: [
            { value: `Row ${index + 1}` },
            { value: index },
            { value: index % 2 === 0 },
          ],
        })),
      }],
    },
    rows: 10,
    cols: 3,
    sheets: 1,
  },
  "medium": {
    name: "medium",
    description: "Realistic financial dataset",
    document: createMediumWorkbook(),
    rows: 500,
    cols: 12,
    sheets: 3,
  },
  "large-10k": {
    name: "large-10k",
    description: "Scale test at 10K x 20",
    document: createLargeWorkbook(10_000, 20, "Large10K"),
    rows: 10_000,
    cols: 20,
    sheets: 1,
  },
  "large-50k": {
    name: "large-50k",
    description: "Scale test at 50K x 20",
    document: createLargeWorkbook(50_000, 20, "Large50K"),
    rows: 50_000,
    cols: 20,
    sheets: 1,
  },
  "large-100k": {
    name: "large-100k",
    description: "Scale test at 100K x 10",
    document: createLargeWorkbook(100_000, 10, "Large100K"),
    rows: 100_000,
    cols: 10,
    sheets: 1,
  },
  "determinism-seed": {
    name: "determinism-seed",
    description: "Small fixed dataset for byte-identical output checks",
    document: {
      meta: { title: "Determinism Seed" },
      sheets: [
        { name: "Revenue", rows: [createRow(["Quarter", "Revenue"]), createRow(["Q1", 100]), createRow(["Q2", 110])] },
        { name: "Summary", rows: [createRow(["Status", true])] },
      ],
    },
    rows: 4,
    cols: 2,
    sheets: 2,
  },
};

export function getPhase1Fixture(name: Phase1FixtureName): Phase1FixtureDefinition {
  return phase1Fixtures[name];
}

export function listPhase1Fixtures(): Phase1FixtureDefinition[] {
  return Object.values(phase1Fixtures);
}
