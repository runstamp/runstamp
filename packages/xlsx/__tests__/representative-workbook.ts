import type { SpreadsheetDocument } from "../src/index.js";

export const CALC_ROUND_TRIP_SENTINEL = "CALC_ROUND_TRIP_SENTINEL";

export function createRepresentativeWorkbook(): SpreadsheetDocument {
  return {
    meta: {
      title: "Determinism and Calc round-trip workbook",
      creator: "Runstamp test suite",
    },
    sheets: [
      {
        name: "Summary",
        columns: [
          { width: 28 },
          { width: 16 },
          { width: 18 },
        ],
        mergedCells: ["A1:C1"],
        rows: [
          {
            height: 24,
            cells: [
              {
                value: "Quarterly revenue report",
                style: {
                  font: { bold: true, color: "FFFFFFFF", size: 16 },
                  fill: { color: "FF1F4E78" },
                  alignment: { horizontal: "center", vertical: "center" },
                },
              },
            ],
          },
          {
            cells: [
              {
                value: CALC_ROUND_TRIP_SENTINEL,
                comment: {
                  author: "Runstamp",
                  text: "LibreOffice should preserve and expose this value.",
                },
              },
              {
                value: new Date("2026-07-14T09:30:00.000Z"),
                style: { numberFormat: "yyyy-mm-dd hh:mm" },
              },
              {
                value: "Verified",
                style: {
                  font: { bold: true, color: "FF006100" },
                  fill: { color: "FFC6EFCE" },
                },
              },
            ],
          },
          {
            cells: [
              { value: "Region", style: "header" },
              { value: "Revenue", style: "header" },
              { value: "Share", style: "header" },
            ],
          },
          {
            cells: [
              { value: "North" },
              { value: 120, style: { numberFormat: "$#,##0" } },
              {
                formula: { expression: "B4/$B$7", cachedValue: 0.2 },
                style: { numberFormat: "0%" },
              },
            ],
          },
          {
            cells: [
              { value: "South" },
              { value: 180, style: { numberFormat: "$#,##0" } },
              {
                formula: { expression: "B5/$B$7", cachedValue: 0.3 },
                style: { numberFormat: "0%" },
              },
            ],
          },
          {
            cells: [
              { value: "West" },
              { value: 300, style: { numberFormat: "$#,##0" } },
              {
                formula: { expression: "B6/$B$7", cachedValue: 0.5 },
                style: { numberFormat: "0%" },
              },
            ],
          },
          {
            cells: [
              { value: "Total", style: { font: { bold: true } } },
              {
                formula: { expression: "SUM(B4:B6)", cachedValue: 600 },
                style: { font: { bold: true }, numberFormat: "$#,##0" },
              },
              {
                formula: { expression: "SUM(C4:C6)", cachedValue: 1 },
                style: { font: { bold: true }, numberFormat: "0%" },
              },
            ],
          },
        ],
        charts: [
          {
            type: "col",
            title: "Revenue by region",
            series: [
              {
                name: "Summary!$B$3",
                categories: "Summary!$A$4:$A$6",
                values: "Summary!$B$4:$B$6",
              },
            ],
            anchor: {
              from: { col: 4, row: 1 },
              to: { col: 11, row: 17 },
            },
          },
        ],
      },
      {
        name: "Details",
        rows: [
          {
            cells: [
              { value: "Metric", style: "header" },
              { value: "Value", style: "header" },
            ],
          },
          {
            cells: [
              { value: "Summary total" },
              { formula: { expression: "Summary!B7", cachedValue: 600 } },
            ],
          },
          {
            cells: [
              { value: "Highest region" },
              { formula: { expression: "MAX(Summary!B4:B6)", cachedValue: 300 } },
            ],
          },
        ],
      },
    ],
  };
}
