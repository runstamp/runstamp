import type { SpreadsheetCellStyle } from "../types/spreadsheet-ast.js";

export const PRESETS = {
  header: {
    font: { bold: true, color: "#FFFFFF", size: 11, family: "Calibri" },
    fill: { color: "#4472C4" },
    border: { bottom: { style: "medium", color: "#2F5597" } },
    alignment: { horizontal: "center", vertical: "center" },
  },
  headerDark: {
    font: { bold: true, color: "#FFFFFF", size: 11 },
    fill: { color: "#1F3864" },
    border: { bottom: { style: "medium", color: "#0D2240" } },
    alignment: { horizontal: "center", vertical: "center" },
  },
  headerGreen: {
    font: { bold: true, color: "#FFFFFF", size: 11 },
    fill: { color: "#548235" },
    border: { bottom: { style: "medium", color: "#375623" } },
    alignment: { horizontal: "center", vertical: "center" },
  },
  subheader: {
    font: { bold: true, size: 10, color: "#1F3864" },
    fill: { color: "#D6E4F0" },
    border: { bottom: { style: "thin", color: "#9DC3E6" } },
  },
  total: {
    font: { bold: true },
    border: {
      top: { style: "thin", color: "#333333" },
      bottom: { style: "double", color: "#333333" },
    },
    numberFormat: "#,##0.00",
  },
  subtotal: {
    font: { bold: true, color: "#44546A" },
    border: { top: { style: "thin", color: "#D9D9D9" } },
    numberFormat: "#,##0.00",
  },
  currency: { alignment: { horizontal: "right" }, numberFormat: "$#,##0.00" },
  currencyKRW: { alignment: { horizontal: "right" }, numberFormat: "₩#,##0" },
  currencyEUR: { alignment: { horizontal: "right" }, numberFormat: "€#,##0.00" },
  percentage: { alignment: { horizontal: "right" }, numberFormat: "0.0%" },
  percentageChange: {
    alignment: { horizontal: "right" },
    numberFormat: "+0.0%;-0.0%;0.0%",
  },
  integer: { alignment: { horizontal: "right" }, numberFormat: "#,##0" },
  decimal2: { alignment: { horizontal: "right" }, numberFormat: "#,##0.00" },
  date: { numberFormat: "yyyy-mm-dd" },
  datetime: { numberFormat: "yyyy-mm-dd hh:mm" },
  warning: { font: { color: "#9C5700" }, fill: { color: "#FFEB9C" } },
  error: { font: { color: "#9C0006" }, fill: { color: "#FFC7CE" } },
  success: { font: { color: "#006100" }, fill: { color: "#C6EFCE" } },
  neutral: { font: { color: "#44546A" }, fill: { color: "#F2F2F2" } },
} as const satisfies Record<string, SpreadsheetCellStyle>;

export const PRESET_NAMES = Object.keys(PRESETS);
