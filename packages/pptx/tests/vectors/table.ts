import type { PaperDocument } from "../../src/types/ast.js";

function makeDoc(name: string, child: any): PaperDocument {
  return {
    type: "Document",
    meta: { title: name },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [child],
      },
    ],
  };
}

export const tableVectors: Record<string, PaperDocument> = {
  // #23 — 3×3 basic table, simple text in each cell
  "table-simple": makeDoc("table-simple", {
    type: "Table",
    style: { width: 600, height: 120 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        { height: 40, cells: [{ text: "R1C1" }, { text: "R1C2" }, { text: "R1C3" }] },
        { height: 40, cells: [{ text: "R2C1" }, { text: "R2C2" }, { text: "R2C3" }] },
        { height: 40, cells: [{ text: "R3C1" }, { text: "R3C2" }, { text: "R3C3" }] },
      ],
    },
  }),

  // #24 — Horizontal merge: first row cell spans 2 columns, ghost with hMerge
  "table-colspan": makeDoc("table-colspan", {
    type: "Table",
    style: { width: 600, height: 80 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        {
          height: 40,
          cells: [
            { text: "Merged across 1-2", colSpan: 2 },
            { text: "", hMerge: true },
            { text: "R1C3" },
          ],
        },
        { height: 40, cells: [{ text: "R2C1" }, { text: "R2C2" }, { text: "R2C3" }] },
      ],
    },
  }),

  // #25 — Vertical merge: first column first cell spans 2 rows, ghost with vMerge
  "table-rowspan": makeDoc("table-rowspan", {
    type: "Table",
    style: { width: 600, height: 120 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        {
          height: 40,
          cells: [
            { text: "Merged down 1-2", rowSpan: 2 },
            { text: "R1C2" },
            { text: "R1C3" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "", vMerge: true },
            { text: "R2C2" },
            { text: "R2C3" },
          ],
        },
        { height: 40, cells: [{ text: "R3C1" }, { text: "R3C2" }, { text: "R3C3" }] },
      ],
    },
  }),

  // #26 — Both colSpan and rowSpan in the same table
  "table-mixed-merge": makeDoc("table-mixed-merge", {
    type: "Table",
    style: { width: 800, height: 160 },
    tableData: {
      columns: [200, 200, 200, 200],
      rows: [
        {
          height: 40,
          cells: [
            { text: "Col-span 2", colSpan: 2 },
            { text: "", hMerge: true },
            { text: "Row-span 2", rowSpan: 2 },
            { text: "R1C4" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "R2C1" },
            { text: "R2C2" },
            { text: "", vMerge: true },
            { text: "R2C4" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "R3C1" },
            { text: "R3C2" },
            { text: "R3C3" },
            { text: "R3C4" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "R4C1" },
            { text: "R4C2" },
            { text: "R4C3" },
            { text: "R4C4" },
          ],
        },
      ],
    },
  }),

  // #27 — 1×1 single-cell table edge case
  "table-single-cell": makeDoc("table-single-cell", {
    type: "Table",
    style: { width: 300, height: 40 },
    tableData: {
      columns: [300],
      rows: [{ height: 40, cells: [{ text: "Only cell" }] }],
    },
  }),

  // #28 — 10-column table with narrow columns
  "table-wide": makeDoc("table-wide", {
    type: "Table",
    style: { width: 900, height: 80 },
    tableData: {
      columns: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90],
      rows: [
        {
          height: 40,
          cells: [
            { text: "C1" }, { text: "C2" }, { text: "C3" }, { text: "C4" }, { text: "C5" },
            { text: "C6" }, { text: "C7" }, { text: "C8" }, { text: "C9" }, { text: "C10" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "D1" }, { text: "D2" }, { text: "D3" }, { text: "D4" }, { text: "D5" },
            { text: "D6" }, { text: "D7" }, { text: "D8" }, { text: "D9" }, { text: "D10" },
          ],
        },
      ],
    },
  }),

  // #29 — 20-row table with varying heights
  "table-tall": makeDoc("table-tall", {
    type: "Table",
    style: { width: 600, height: 520 },
    tableData: {
      columns: [200, 200, 200],
      rows: Array.from({ length: 20 }, (_, i) => ({
        height: 20 + (i % 3) * 5, // alternates 20, 25, 30
        cells: [
          { text: `R${i + 1}C1` },
          { text: `R${i + 1}C2` },
          { text: `R${i + 1}C3` },
        ],
      })),
    },
  }),

  // #30 — Cells containing XML-sensitive special characters
  "table-special-chars": makeDoc("table-special-chars", {
    type: "Table",
    style: { width: 600, height: 80 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        {
          height: 40,
          cells: [
            { text: "1 < 2" },
            { text: "3 > 2" },
            { text: "Tom & Jerry" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: 'She said "hello"' },
            { text: "it's fine" },
            { text: "<tag>&amp;</tag>" },
          ],
        },
      ],
    },
  }),
};
