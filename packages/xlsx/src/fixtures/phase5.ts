import type {
  SpreadsheetCell,
  SpreadsheetDocument,
  SpreadsheetImage,
  SpreadsheetRow,
} from "../types/spreadsheet-ast.js";

export interface Phase5FixtureDefinition {
  name: string;
  description: string;
  document: SpreadsheetDocument;
}

// Tiny 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

// Minimal JFIF JPEG
const TINY_JPEG = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9,
]);

function colLetter(index: number): string {
  let current = index + 1;
  let letters = "";
  while (current > 0) {
    current -= 1;
    letters = String.fromCharCode(65 + (current % 26)) + letters;
    current = Math.floor(current / 26);
  }
  return letters;
}

function createCommentsTortureFixture(): SpreadsheetDocument {
  const cells: SpreadsheetCell[] = [];

  // Row 1: comments on every cell A1:Z1 (26 cells)
  for (let col = 0; col < 26; col++) {
    cells.push({
      value: `Cell ${colLetter(col)}1`,
      comment: {
        author: `Author-${col}`,
        text: `Comment on ${colLetter(col)}1`,
      },
    });
  }

  const rows: SpreadsheetRow[] = [{ cells }];

  // Row 2: XML-hostile comment text
  rows.push({
    cells: [
      {
        value: "XML hostile 1",
        comment: { author: "Tester", text: 'Ampersand & less-than < greater-than > "double" \'single\'' },
      },
      {
        value: "XML hostile 2",
        comment: { author: "Tester", text: "<script>alert('xss')</script> & CDATA: <![CDATA[test]]>" },
      },
      {
        value: "XML hostile 3",
        comment: { text: "Nested <<tags>> && entities &amp; &lt;" },
      },
    ],
  });

  // Row 3: Very long comment text (500+ chars)
  const longText = "This is a very long comment that exceeds 500 characters. ".repeat(12);
  rows.push({
    cells: [
      {
        value: "Long comment",
        comment: { author: "Verbose Author", text: longText },
      },
    ],
  });

  // Row 4: Unicode author names
  rows.push({
    cells: [
      {
        value: "CJK author",
        comment: { author: "田中太郎", text: "Comment from Japanese author" },
      },
      {
        value: "Arabic author",
        comment: { author: "أحمد", text: "Comment from Arabic author" },
      },
      {
        value: "Emoji author",
        comment: { author: "User 🎉", text: "Comment from emoji author" },
      },
    ],
  });

  // Row 5: Empty-string comment text
  rows.push({
    cells: [
      {
        value: "Empty comment",
        comment: { author: "Ghost", text: "" },
      },
    ],
  });

  // Row 6: Comment on a merged cell
  rows.push({
    cells: [
      {
        value: "Merged cell with comment",
        colSpan: 3,
        comment: { author: "Merger", text: "This cell is merged" },
      },
    ],
  });

  // Rows 7-30: Fill additional comments to reach 50+
  for (let r = 0; r < 24; r++) {
    rows.push({
      cells: [
        {
          value: `Extra ${r + 1}`,
          comment: { author: `Bulk-${r}`, text: `Bulk comment number ${r + 1}` },
        },
      ],
    });
  }

  return {
    meta: { title: "Comments Torture Test" },
    sheets: [{ name: "Comments", rows }],
  };
}

function createImagesMultiFixture(): SpreadsheetDocument {
  const images: SpreadsheetImage[] = [
    {
      data: TINY_PNG,
      type: "png",
      anchor: { from: { col: 0, row: 0 } },
      name: "PNG1",
      width: 50,
      height: 50,
    },
    {
      data: TINY_PNG,
      type: "png",
      anchor: { from: { col: 2, row: 0 } },
      name: "PNG2",
      width: 75,
      height: 75,
    },
    {
      data: TINY_JPEG,
      type: "jpeg",
      anchor: { from: { col: 4, row: 0 } },
      name: "JPEG1",
      width: 60,
      height: 40,
    },
    {
      data: TINY_JPEG,
      type: "jpeg",
      anchor: { from: { col: 6, row: 0 } },
      name: "JPEG2",
      width: 80,
      height: 60,
    },
    {
      data: TINY_PNG,
      type: "png",
      anchor: {
        from: { col: 0, row: 5 },
        to: { col: 3, row: 10 },
      },
      name: "PNG-TwoCell",
      width: 200,
      height: 150,
    },
  ];

  return {
    meta: { title: "Multi-Image Test" },
    sheets: [{
      name: "Images",
      rows: [
        { cells: [{ value: "Image test sheet" }] },
      ],
      images,
    }],
  };
}

function createChartsAllTypesFixture(): SpreadsheetDocument {
  const headerRow: SpreadsheetRow = {
    cells: [
      { value: "Category" },
      { value: "Series A" },
      { value: "Series B" },
      { value: "Series C" },
      { value: "Series D" },
    ],
  };

  const dataRows: SpreadsheetRow[] = Array.from({ length: 9 }, (_, i) => ({
    cells: [
      { value: `Cat ${i + 1}` },
      { value: 10 + i * 5 },
      { value: 20 + i * 3 },
      { value: 15 + i * 7 },
      { value: 8 + i * 4 },
    ],
  }));

  return {
    meta: { title: "All Chart Types" },
    sheets: [{
      name: "ChartData",
      rows: [headerRow, ...dataRows],
      charts: [
        {
          type: "bar",
          title: "Bar Chart",
          series: [
            { name: "Series A", categories: "ChartData!$A$2:$A$10", values: "ChartData!$B$2:$B$10" },
            { name: "Series B", categories: "ChartData!$A$2:$A$10", values: "ChartData!$C$2:$C$10" },
          ],
          anchor: { from: { col: 6, row: 0 } },
        },
        {
          type: "col",
          title: "Column Chart",
          series: [
            { name: "Series C", categories: "ChartData!$A$2:$A$10", values: "ChartData!$D$2:$D$10" },
            { name: "Series D", categories: "ChartData!$A$2:$A$10", values: "ChartData!$E$2:$E$10" },
          ],
          anchor: { from: { col: 6, row: 16 } },
        },
        {
          type: "line",
          title: "Line Chart",
          series: [
            { name: "Series A", categories: "ChartData!$A$2:$A$10", values: "ChartData!$B$2:$B$10" },
            { name: "Series C", categories: "ChartData!$A$2:$A$10", values: "ChartData!$D$2:$D$10" },
          ],
          anchor: { from: { col: 6, row: 32 } },
        },
        {
          type: "pie",
          title: "Pie Chart",
          series: [
            { name: "Series B", categories: "ChartData!$A$2:$A$10", values: "ChartData!$C$2:$C$10" },
            { name: "Series D", categories: "ChartData!$A$2:$A$10", values: "ChartData!$E$2:$E$10" },
          ],
          anchor: { from: { col: 6, row: 48 } },
        },
      ],
    }],
  };
}

function createProtectionMatrixFixture(): SpreadsheetDocument {
  return {
    meta: { title: "Protection Matrix" },
    sheets: [
      {
        name: "FullProtection",
        protection: {
          password: "secret123",
          sheet: true,
          objects: true,
          scenarios: true,
        },
        rows: [
          {
            cells: [
              { value: "Locked cell", style: { protection: { locked: true } } },
              { value: "Hidden formula", style: { protection: { locked: true, hidden: true } } },
            ],
          },
          {
            cells: [
              { value: "Also locked" },
              { value: 42 },
            ],
          },
        ],
      },
      {
        name: "SelectivePerms",
        protection: {
          sheet: true,
          formatCells: false,     // allowed (false = not disallowed)
          insertRows: true,       // blocked
          deleteRows: true,       // blocked
          sort: true,             // blocked
        },
        rows: [
          {
            cells: [
              { value: "Format allowed" },
              { value: "Insert blocked" },
            ],
          },
        ],
      },
      {
        name: "NoPassword",
        protection: {
          sheet: true,
        },
        rows: [
          {
            cells: [
              { value: "Protected without password" },
              { value: "Still locked" },
            ],
          },
        ],
      },
    ],
  };
}

function createKitchenSinkFixture(): SpreadsheetDocument {
  return {
    meta: {
      title: "Kitchen Sink Stress Test",
      creator: "Runstamp Chaos Lab",
    },
    namedRanges: [
      { name: "DataRange", ref: "Main!$A$1:$J$20" },
      { name: "LookupCol", ref: "Lookup!$A$1:$B$5" },
    ],
    sheets: [
      {
        name: "Main",
        freezePane: { row: 1, col: 1 },
        conditionalFormatting: [
          {
            ref: "B2:B20",
            rules: [
              {
                type: "cellIs",
                operator: "greaterThan",
                formula: "100",
                style: { fill: { color: "#C6EFCE" } },
              },
            ],
          },
        ],
        dataValidations: [
          {
            ref: "D2:D20",
            type: "list",
            formula1: '"Active,Inactive,Pending"',
            allowBlank: true,
          },
        ],
        tables: [
          {
            name: "MainTable",
            ref: "A1:J5",
            columns: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
            style: { name: "TableStyleMedium2" },
          },
        ],
        images: [
          {
            data: TINY_PNG,
            type: "png",
            anchor: { from: { col: 11, row: 0 } },
            name: "Logo",
            width: 100,
            height: 50,
          },
        ],
        charts: [
          {
            type: "col",
            title: "Revenue Overview",
            series: [
              { name: "Revenue", categories: "Main!$A$2:$A$5", values: "Main!$B$2:$B$5" },
            ],
            anchor: { from: { col: 11, row: 6 } },
          },
        ],
        rows: [
          {
            cells: [
              { value: "Name", style: "header" },
              { value: "Revenue", style: "header" },
              { value: "Growth", style: "header" },
              { value: "Status", style: "header" },
              { value: "Joined", style: "header" },
              { value: "Lookup", style: "header" },
              { value: "DateCalc", style: "header" },
              { value: "TextOp", style: "header" },
              { value: "TrimOp", style: "header" },
              { value: "Link", style: "header" },
            ],
          },
          {
            cells: [
              { value: "Acme Corp" },
              { value: 150000, style: "currency" },
              { value: 0.24, style: "percentage" },
              { value: "Active" },
              { value: new Date(Date.UTC(2024, 5, 15)), style: "date" },
              { formula: { expression: 'VLOOKUP(A2,Lookup!$A$1:$B$5,2,FALSE)', cachedValue: 100 } },
              { formula: { expression: "DATE(2024,6,15)", cachedValue: 45458 } },
              { formula: { expression: 'CONCATENATE("Hello"," ","World")', cachedValue: "Hello World" } },
              { formula: { expression: 'TRIM("  spaced  out  ")', cachedValue: "spaced out" } },
              {
                value: "Website",
                hyperlink: { target: "https://example.com", tooltip: "Visit site" },
              },
            ],
          },
          {
            cells: [
              {
                value: "Beta Inc",
                comment: { author: "Reviewer", text: "Key account - handle with care" },
              },
              { value: 220000, style: "currency" },
              { value: 0.31, style: "percentage" },
              { value: "Active" },
              { value: new Date(Date.UTC(2023, 0, 10)), style: "date" },
              { formula: { expression: 'VLOOKUP(A3,Lookup!$A$1:$B$5,2,FALSE)', cachedValue: 200 } },
              { formula: { expression: "DATE(2023,1,10)", cachedValue: 44936 } },
              { formula: { expression: 'TEXT(B3,"$#,##0")', cachedValue: "$220,000" } },
              { formula: { expression: 'TRIM("  beta  test  ")', cachedValue: "beta test" } },
              {
                value: "Jump to Lookup",
                hyperlink: { location: "Lookup!A1", display: "Lookup sheet" },
              },
            ],
          },
          {
            cells: [
              { value: "Gamma Ltd" },
              { value: null },
              { value: "Pending" },
              { value: new Date(Date.UTC(2025, 11, 1)), style: "date" },
              { value: null },
              { value: null },
              { value: null },
              { value: null },
              { value: null },
            ],
          },
          {
            cells: [
              { value: "Delta Co" },
              { value: 95000, style: "currency" },
              { value: -0.05, style: "percentage" },
              { value: "Inactive" },
              { value: new Date(Date.UTC(2022, 6, 20)), style: "date" },
              { value: null },
              { value: null },
              {
                value: [
                  { text: "Rich ", font: { bold: true } },
                  { text: "text ", font: { italic: true, color: "#FF0000" } },
                  { text: "content" },
                ],
              },
              { value: null },
              { value: null },
            ],
          },
        ],
      },
      {
        name: "Lookup",
        rows: [
          { cells: [{ value: "Acme Corp" }, { value: 100 }] },
          { cells: [{ value: "Beta Inc" }, { value: 200 }] },
          { cells: [{ value: "Gamma Ltd" }, { value: 300 }] },
          { cells: [{ value: "Delta Co" }, { value: 400 }] },
          { cells: [{ value: "Epsilon SA" }, { value: 500 }] },
        ],
      },
      {
        name: "Hidden",
        state: "hidden",
        rows: [
          { cells: [{ value: "This sheet is hidden" }] },
        ],
      },
      {
        name: "Protected",
        protection: {
          sheet: true,
          password: "lock",
        },
        rows: [
          { cells: [{ value: "This sheet is protected" }] },
        ],
      },
    ],
  };
}

function createStreamingStressFixture(): SpreadsheetDocument {
  const rows: SpreadsheetRow[] = [];

  for (let r = 0; r < 10_000; r++) {
    const cells: SpreadsheetCell[] = [];

    for (let c = 0; c < 9; c++) {
      const cell: SpreadsheetCell = {
        value: r * 10 + c,
      };

      // Alternating row styles
      if (r % 2 === 0) {
        cell.style = { fill: { color: "#F2F2F2" } };
      }

      cells.push(cell);
    }

    // Column J: SUM formula for columns A:I
    cells.push({
      formula: `SUM(A${r + 1}:I${r + 1})`,
    });

    // Comment on every 100th row
    if (r % 100 === 0) {
      cells[0] = {
        ...cells[0],
        comment: { author: "System", text: `Checkpoint row ${r + 1}` },
      };
    }

    rows.push({ cells });
  }

  return {
    meta: { title: "Streaming Stress Test" },
    sheets: [{
      name: "StressData",
      rows,
      charts: [
        {
          type: "line",
          title: "Column A Trend",
          series: [
            { name: "Values", values: "StressData!$A$1:$A$100" },
          ],
          anchor: { from: { col: 11, row: 0 } },
        },
      ],
    }],
  };
}

export const phase5Fixtures: Phase5FixtureDefinition[] = [
  {
    name: "phase5-comments-torture",
    description: "50+ comments with XML-hostile text, Unicode authors, empty text, and merged cells",
    document: createCommentsTortureFixture(),
  },
  {
    name: "phase5-images-multi",
    description: "5 images: 2 PNG, 2 JPEG, 1 PNG with twoCellAnchor",
    document: createImagesMultiFixture(),
  },
  {
    name: "phase5-charts-all-types",
    description: "4 chart types (bar, col, line, pie) with 2 series each",
    document: createChartsAllTypesFixture(),
  },
  {
    name: "phase5-protection-matrix",
    description: "3 sheets: full protection, selective permissions, no-password protection",
    document: createProtectionMatrixFixture(),
  },
  {
    name: "phase5-kitchen-sink",
    description: "All features combined: comments, images, charts, protection, formulas, tables, validation, rich text, hyperlinks, freeze panes, named ranges, merged cells, hidden sheets",
    document: createKitchenSinkFixture(),
  },
  {
    name: "phase5-streaming-stress",
    description: "10K rows x 10 cols with comments every 100 rows, formulas, alternating styles, and chart",
    document: createStreamingStressFixture(),
  },
];

export function listPhase5Fixtures(): Phase5FixtureDefinition[] {
  return phase5Fixtures;
}
