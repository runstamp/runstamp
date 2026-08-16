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

export const styledTableVectors: Record<string, PaperDocument> = {
  // Header row styling with bold white text on dark background
  "table-header-styled": makeDoc("table-header-styled", {
    type: "Table",
    style: { width: 700, height: 160, margin: 20 },
    tableData: {
      columns: [200, 150, 150, 200],
      rows: [
        {
          height: 40,
          cells: [
            { text: "Region" },
            { text: "Q1" },
            { text: "Q2" },
            { text: "Growth" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "North America" },
            { text: "$42.1M" },
            { text: "$47.8M" },
            { text: "+13.5%" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "Europe" },
            { text: "$31.5M" },
            { text: "$33.0M" },
            { text: "+4.8%" },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "APAC" },
            { text: "$18.4M" },
            { text: "$21.7M" },
            { text: "+17.9%" },
          ],
        },
      ],
      style: {
        firstRow: true,
        headerRowStyle: {
          fill: "#2C3E50",
          color: "#FFFFFF",
          fontWeight: "bold",
          fontSize: 14,
        },
      },
    },
  }),

  // Band rows (alternating row colors)
  "table-band-rows": makeDoc("table-band-rows", {
    type: "Table",
    style: { width: 600, height: 200, margin: 20 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        { height: 40, cells: [{ text: "Product" }, { text: "Units" }, { text: "Revenue" }] },
        { height: 40, cells: [{ text: "Widget A" }, { text: "1,200" }, { text: "$48K" }] },
        { height: 40, cells: [{ text: "Widget B" }, { text: "850" }, { text: "$34K" }] },
        { height: 40, cells: [{ text: "Widget C" }, { text: "2,100" }, { text: "$63K" }] },
        { height: 40, cells: [{ text: "Widget D" }, { text: "670" }, { text: "$20K" }] },
      ],
      style: {
        firstRow: true,
        bandRow: true,
        headerRowStyle: {
          fill: "#1565C0",
          color: "#FFFFFF",
          fontWeight: "bold",
        },
        bandRowEvenStyle: {
          fill: "#E3F2FD",
        },
      },
    },
  }),

  // Cell borders
  "table-cell-borders": makeDoc("table-cell-borders", {
    type: "Table",
    style: { width: 600, height: 120, margin: 20 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        {
          height: 40,
          cells: [
            {
              text: "Thick border",
              style: {
                borders: {
                  bottom: { width: 3, color: "#E74C3C" },
                },
              },
            },
            { text: "Normal" },
            {
              text: "All borders",
              style: {
                borders: {
                  top: { width: 2, color: "#2ECC71" },
                  right: { width: 2, color: "#2ECC71" },
                  bottom: { width: 2, color: "#2ECC71" },
                  left: { width: 2, color: "#2ECC71" },
                },
              },
            },
          ],
        },
        {
          height: 40,
          cells: [{ text: "R2C1" }, { text: "R2C2" }, { text: "R2C3" }],
        },
        {
          height: 40,
          cells: [{ text: "R3C1" }, { text: "R3C2" }, { text: "R3C3" }],
        },
      ],
    },
  }),

  // Merged cells with styling
  "table-merged-styled": makeDoc("table-merged-styled", {
    type: "Table",
    style: { width: 600, height: 120, margin: 20 },
    tableData: {
      columns: [200, 200, 200],
      rows: [
        {
          height: 40,
          cells: [
            {
              text: "Merged Header",
              colSpan: 3,
              style: {
                fill: "#2C3E50",
                color: "#FFFFFF",
                fontWeight: "bold",
                textAlign: "center",
                fontSize: 16,
              },
            },
            { text: "", hMerge: true },
            { text: "", hMerge: true },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "Column A", style: { fontWeight: "bold" } },
            { text: "Column B", style: { fontWeight: "bold" } },
            { text: "Column C", style: { fontWeight: "bold" } },
          ],
        },
        {
          height: 40,
          cells: [
            { text: "Data 1" },
            { text: "Data 2" },
            { text: "Data 3" },
          ],
        },
      ],
    },
  }),
};
