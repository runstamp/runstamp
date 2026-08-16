import type { PdfDocumentPhase3 } from "../src/phase3-types.js";
import type { PdfColor } from "../src/phase4-types.js";
import type { PdfPhase5TableCell, PdfPhase5TableNode, PdfPhase5TableRow } from "../src/phase5-types.js";

function rgb(r: number, g: number, b: number): PdfColor {
  return { space: "rgb", r, g, b };
}

function paragraph(value: string): { type: "paragraph"; value: string } {
  return { type: "paragraph", value };
}

function cell(
  value: string,
  options: Partial<PdfPhase5TableCell> = {},
): PdfPhase5TableCell {
  return {
    children: options.children ?? [paragraph(value)],
    colSpan: options.colSpan,
    role: options.role,
    rowSpan: options.rowSpan,
    style: options.style,
  };
}

function headerRow(labels: string[]): PdfPhase5TableRow {
  return {
    cells: labels.map((label) =>
      cell(label, {
        role: "th",
        style: {
          backgroundColor: rgb(0.92, 0.95, 0.99),
          borderBottom: { color: rgb(0.35, 0.45, 0.65), style: "solid", width: 1.5 },
          borderLeft: { color: rgb(0.55, 0.6, 0.72), style: "solid", width: 1 },
          borderRight: { color: rgb(0.55, 0.6, 0.72), style: "solid", width: 1 },
          borderTop: { color: rgb(0.55, 0.6, 0.72), style: "solid", width: 1 },
          padding: 6,
          verticalAlign: "middle",
        },
      }),
    ),
  };
}

function bodyRow(values: string[], minHeight = 30): PdfPhase5TableRow {
  return {
    cells: values.map((value) =>
      cell(value, {
        style: {
          borderBottom: { color: rgb(0.75, 0.78, 0.82), style: "solid", width: 1 },
          borderLeft: { color: rgb(0.75, 0.78, 0.82), style: "solid", width: 1 },
          borderRight: { color: rgb(0.75, 0.78, 0.82), style: "solid", width: 1 },
          borderTop: { color: rgb(0.75, 0.78, 0.82), style: "solid", width: 1 },
          minHeight,
          padding: 6,
          verticalAlign: "top",
        },
      }),
    ),
  };
}

function tableDocument(table: PdfPhase5TableNode, page?: PdfDocumentPhase3["page"]): PdfDocumentPhase3 {
  return {
    page: page ?? {
      margin: 48,
      size: "Letter",
    },
    children: [table],
  };
}

export function createSinglePageTableDocument(): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [
      { width: 90 },
      { width: "20%" },
      { width: "20%" },
      { width: "20%" },
      { width: "20%" },
    ],
    header: [headerRow(["ID", "Name", "Region", "Status", "Owner"])],
    body: Array.from({ length: 10 }, (_, index) =>
      bodyRow([`R-${index + 1}`, `Customer ${index + 1}`, index % 2 === 0 ? "North" : "South", index % 3 === 0 ? "Open" : "Closed", `Rep ${index + 1}`]),
    ),
    style: {
      marginTop: 12,
      width: "100%",
    },
  };

  return tableDocument(table);
}

export function createMultiPageTableDocument(rowCount = 100): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{ width: 64 }, {}, {}, {}, {}],
    header: [headerRow(["#", "Account", "Region", "Value", "Owner"])],
    body: Array.from({ length: rowCount }, (_, index) =>
      bodyRow([`${index + 1}`, `Account ${index + 1}`, ["North", "South", "East", "West"][index % 4] as string, `$${(index + 1) * 1000}`, `Owner ${index % 12}`], 34),
    ),
    style: {
      width: "100%",
    },
  };

  return tableDocument(table);
}

export function createRowspanSplitTableDocument(): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{ width: 90 }, {}, {}],
    header: [headerRow(["Group", "Task", "Notes"])],
    body: [
      {
        cells: [
          cell("Phase A", {
            rowSpan: 5,
            style: {
              backgroundColor: rgb(0.95, 0.97, 1),
              borderBottom: { color: rgb(0.5, 0.6, 0.8), style: "solid", width: 1.5 },
              borderLeft: { color: rgb(0.5, 0.6, 0.8), style: "solid", width: 1.5 },
              borderRight: { color: rgb(0.5, 0.6, 0.8), style: "solid", width: 1.5 },
              borderTop: { color: rgb(0.5, 0.6, 0.8), style: "solid", width: 1.5 },
              minHeight: 72,
              padding: 8,
              verticalAlign: "top",
            },
          }),
          cell("Discovery", { style: { minHeight: 72, padding: 8, borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 } } }),
          cell("Requirements workshop", { style: { minHeight: 72, padding: 8, borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 } } }),
        ],
      },
      bodyRow(["Design", "Interaction map"], 72),
      bodyRow(["Implementation", "Milestone 1"], 72),
      bodyRow(["QA", "Regression sweep"], 72),
      bodyRow(["Launch", "Pilot rollout"], 72),
    ],
    style: { width: "100%" },
  };

  return tableDocument(table, {
    margin: 36,
    size: { width: 612, height: 420 },
  });
}

export function createColspanTableDocument(): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{}, {}, {}, {}],
    header: [headerRow(["Q1", "Q2", "Q3", "Q4"])],
    body: [
      {
        cells: [
          cell("Merged across three columns", {
            colSpan: 3,
            style: {
              backgroundColor: rgb(0.96, 0.92, 0.86),
              borderBottom: { color: rgb(0.8, 0.63, 0.32), width: 1.5 },
              borderLeft: { color: rgb(0.8, 0.63, 0.32), width: 1.5 },
              borderRight: { color: rgb(0.8, 0.63, 0.32), width: 1.5 },
              borderTop: { color: rgb(0.8, 0.63, 0.32), width: 1.5 },
              padding: 8,
              verticalAlign: "middle",
            },
          }),
          cell("Tail"),
        ],
      },
      bodyRow(["10", "20", "30", "40"]),
    ],
    style: { width: "100%" },
  };

  return tableDocument(table);
}

export function createAutoWidthTableDocument(): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{}, {}, {}],
    header: [headerRow(["Short", "Longest Header Label", "Mid"])],
    body: [
      bodyRow(["A", "Customer success escalation", "B"]),
      bodyRow(["AA", "Renewal forecast and expansion", "BB"]),
      bodyRow(["AAA", "Ops", "BBB"]),
    ],
    style: { width: "100%" },
  };

  return tableDocument(table);
}

export function createVerticalAlignTableDocument(): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{}, {}, {}],
    header: [headerRow(["Top", "Middle", "Bottom"])],
    body: [
      {
        cells: [
          cell("Top aligned", { style: { minHeight: 96, padding: 8, verticalAlign: "top", borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 } } }),
          cell("Middle aligned", { style: { minHeight: 96, padding: 8, verticalAlign: "middle", borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 } } }),
          cell("Bottom aligned", { style: { minHeight: 96, padding: 8, verticalAlign: "bottom", borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 }, borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 } } }),
        ],
      },
    ],
    style: { width: "100%" },
  };

  return tableDocument(table);
}

export function createBorderCollapseTableDocument(): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{ width: 160 }, { width: 160 }],
    body: [
      {
        cells: [
          cell("A1", {
            style: {
              borderBottom: { color: rgb(0.15, 0.2, 0.4), width: 4 },
              borderRight: { color: rgb(0.15, 0.2, 0.4), width: 4 },
              borderTop: { color: rgb(0.15, 0.2, 0.4), width: 4 },
              borderLeft: { color: rgb(0.15, 0.2, 0.4), width: 4 },
              padding: 8,
            },
          }),
          cell("A2", {
            style: {
              borderBottom: { color: rgb(0.7, 0.7, 0.7), width: 1 },
              borderLeft: { color: rgb(0.7, 0.7, 0.7), width: 1 },
              borderRight: { color: rgb(0.7, 0.7, 0.7), width: 1 },
              borderTop: { color: rgb(0.7, 0.7, 0.7), width: 1 },
              padding: 8,
            },
          }),
        ],
      },
      bodyRow(["B1", "B2"], 48),
    ],
    style: { width: "100%" },
  };

  return tableDocument(table);
}

export function createNestedTableDocument(): PdfDocumentPhase3 {
  const innerTable: PdfPhase5TableNode = {
    type: "table",
    columns: [{ width: 90 }, {}],
    header: [headerRow(["Week", "Status"])],
    body: Array.from({ length: 14 }, (_, index) =>
      bodyRow([`W${index + 1}`, index % 2 === 0 ? "On track" : "Needs review"], 32),
    ),
    style: { width: "100%" },
  };

  const outerTable: PdfPhase5TableNode = {
    type: "table",
    columns: [{ width: 120 }, {}],
    header: [headerRow(["Program", "Plan"])],
    body: [
      {
        cells: [
          cell("Platform migration", {
            style: {
              minHeight: 220,
              padding: 8,
              verticalAlign: "top",
              borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 },
              borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 },
              borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 },
              borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 },
            },
          }),
          {
            children: [innerTable],
            style: {
              minHeight: 220,
              padding: 6,
              verticalAlign: "top",
              borderTop: { color: rgb(0.7, 0.74, 0.8), width: 1 },
              borderBottom: { color: rgb(0.7, 0.74, 0.8), width: 1 },
              borderLeft: { color: rgb(0.7, 0.74, 0.8), width: 1 },
              borderRight: { color: rgb(0.7, 0.74, 0.8), width: 1 },
            },
          },
        ],
      },
    ],
    style: { width: "100%" },
  };

  return tableDocument(outerTable, {
    margin: 36,
    size: { width: 612, height: 420 },
  });
}

export function createPerformanceTableDocument(rowCount = 1000): PdfDocumentPhase3 {
  const table: PdfPhase5TableNode = {
    type: "table",
    columns: [{ width: 52 }, {}, {}, {}, {}],
    header: [headerRow(["#", "Customer", "Region", "ARR", "State"])],
    body: Array.from({ length: rowCount }, (_, index) =>
      bodyRow([`${index + 1}`, `Customer ${index + 1}`, ["NA", "EMEA", "APAC"][index % 3] as string, `$${(index + 1) * 25_000}`, index % 2 === 0 ? "Active" : "Pilot"], 28),
    ),
    style: { width: "100%" },
  };

  return tableDocument(table);
}
