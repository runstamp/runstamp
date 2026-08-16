import type { SpreadsheetDocument } from "../../../src/index.js";

export const emptyWorkbook: SpreadsheetDocument = {
  sheets: [
    {
      name: "Empty",
      rows: [],
    },
  ],
};

export const singleCellWorkbook: SpreadsheetDocument = {
  sheets: [
    {
      name: "Hello",
      rows: [
        {
          cells: [{ value: "Hello" }],
        },
      ],
    },
  ],
};

export const mixedTypesWorkbook: SpreadsheetDocument = {
  meta: {
    title: "Phase 1 Mixed Types",
    creator: "Runstamp Test",
  },
  defaults: {
    columnWidth: 8.43,
    rowHeight: 15,
  },
  sheets: [
    {
      name: "Mixed",
      columns: [
        { width: 12.5 },
        { width: 18 },
        { hidden: true },
      ],
      rows: [
        {
          cells: [
            { value: "Label" },
            { value: "Revenue" },
            { value: "Closed" },
            { value: "As Of" },
            { value: "Optional" },
          ],
        },
        {
          cells: [
            { value: "Q1 2026" },
            { value: 420000 },
            { value: true },
            { value: new Date("2026-03-27T00:00:00.000Z") },
            { value: null },
          ],
        },
      ],
    },
    {
      name: "RTL",
      rightToLeft: true,
      rows: [
        {
          hidden: true,
          cells: [],
        },
        {
          height: 22,
          cells: [
            { value: "مرحبا" },
            { value: false },
          ],
        },
      ],
    },
  ],
};

export const xmlHostileWorkbook: SpreadsheetDocument = {
  sheets: [
    {
      name: "Strings",
      rows: [
        {
          cells: [
            { value: "<script>alert(1)</script>" },
            { value: "&amp;" },
            { value: "\"quotes\"" },
            { value: "'apos'" },
            { value: "\u0001bad\u0008text\u000B" },
            { value: "  padded  " },
          ],
        },
      ],
    },
  ],
};

export const determinismSeedWorkbook: SpreadsheetDocument = {
  meta: {
    title: "Deterministic Workbook",
  },
  sheets: [
    {
      name: "Revenue",
      rows: [
        {
          cells: [
            { value: "Quarter" },
            { value: "Revenue" },
          ],
        },
        {
          cells: [
            { value: "Q1" },
            { value: 100 },
          ],
        },
        {
          cells: [
            { value: "Q2" },
            { value: 110 },
          ],
        },
      ],
    },
    {
      name: "Summary",
      rows: [
        {
          cells: [
            { value: "Status" },
            { value: true },
          ],
        },
      ],
    },
  ],
};
