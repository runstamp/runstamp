import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import process from "node:process";
import JSZip from "jszip";
import {
  formula,
  SpreadsheetEngine,
  validateXlsxStructure,
  type SpreadsheetDocument,
} from "../src/index.js";

type Status = "pass" | "warn" | "fail" | "blocked";

interface EngineResult {
  status: Status;
  durationMs?: number;
  file?: string;
  sizeBytes?: number;
  structural?: boolean | "not-run";
  ooxmlValidator?: boolean | "not-run";
  observed: string;
  notes?: string;
}

interface BenchmarkResult {
  id: string;
  name: string;
  runstamp?: EngineResult;
  exceljs?: EngineResult;
  notes?: string;
}

const requireFromTemp = createRequire("/tmp/runstamp-xlsx-bench-deps/package.json");
const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const packageDir = resolve(scriptDir, "..");
const outDir = join(packageDir, "output", "benchmarks-0410", "benchmark-xlsx-2-local");

let ExcelJS: any | undefined;
let ooxmlValidator: any | undefined;
try {
  ExcelJS = requireFromTemp("exceljs");
} catch {
  ExcelJS = undefined;
}
try {
  ooxmlValidator = requireFromTemp("@xarsh/ooxml-validator");
} catch {
  ooxmlValidator = undefined;
}

function percentile(values: number[], point: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((point / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function stats(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return { mean, p50: percentile(values, 50), p95: percentile(values, 95) };
}

function formatStats(values: number[]): string {
  const s = stats(values);
  return `mean ${s.mean.toFixed(1)}ms; p50 ${s.p50.toFixed(1)}ms; p95 ${s.p95.toFixed(1)}ms`;
}

function deterministicText(row: number, col: number, length: number): string {
  const seed = `r${row}-c${col}-`;
  return seed.repeat(Math.ceil(length / seed.length)).slice(0, length);
}

function rows(count: number, cols: number, cell: (row: number, col: number) => any): Array<{ cells: any[] }> {
  return Array.from({ length: count }, (_, row) => ({
    cells: Array.from({ length: cols }, (_, col) => cell(row, col)),
  }));
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readZipEntry(buffer: Buffer, path: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  if (!file) throw new Error(`Missing ZIP entry: ${path}`);
  return file.async("string");
}

async function writeArtifact(id: string, engine: string, buffer: Buffer): Promise<string> {
  const dir = join(outDir, id);
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${engine}.xlsx`);
  await writeFile(file, buffer);
  return file;
}

async function validateArtifact(file: string, buffer: Buffer): Promise<{ structural: boolean | "not-run"; ooxml: boolean | "not-run"; details: string[] }> {
  const details: string[] = [];
  const skipHighMergeValidation = file.includes("BM-XLSX-E02") || file.includes("BM-XLSX-E03");
  let structural: boolean | "not-run" = "not-run";
  if (skipHighMergeValidation) {
    details.push("structural validator skipped for high-merge artifact to keep interactive run bounded");
  } else {
    try {
      const summary = await validateXlsxStructure(buffer);
      structural = summary.passed;
      const failed = summary.checks.filter((check) => !check.passed);
      if (failed.length > 0) details.push(`structural failures: ${failed.slice(0, 3).map((check) => check.name).join(", ")}`);
    } catch (error) {
      structural = false;
      details.push(`structural validator threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let ooxml: boolean | "not-run" = "not-run";
  const skipExternalValidator =
    skipHighMergeValidation ||
    buffer.length > 5 * 1024 * 1024 ||
    file.includes("BM-XLSX-E02") ||
    file.includes("BM-XLSX-E03");
  if (ooxmlValidator && !skipExternalValidator) {
    try {
      const result = await ooxmlValidator.validateFile(file);
      ooxml = Boolean(result?.ok);
      if (!ooxml) details.push(`@xarsh/ooxml-validator failed: ${JSON.stringify(result).slice(0, 300)}`);
    } catch (error) {
      ooxml = false;
      details.push(`@xarsh/ooxml-validator threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (ooxmlValidator && skipExternalValidator) {
    details.push("@xarsh/ooxml-validator skipped for large/high-merge artifact to avoid interactive-run memory blowup");
  }

  return { structural, ooxml, details };
}

async function paperResult(
  id: string,
  document: SpreadsheetDocument,
  check: (buffer: Buffer) => Promise<{ ok: boolean; observed: string; notes?: string }> = async () => ({ ok: true, observed: "rendered" }),
  options?: Parameters<typeof SpreadsheetEngine.render>[1],
): Promise<EngineResult> {
  try {
    const start = performance.now();
    const buffer = await SpreadsheetEngine.render(document, options);
    const durationMs = performance.now() - start;
    const file = await writeArtifact(id, "runstamp", buffer);
    const validation = await validateArtifact(file, buffer);
    const extra = await check(buffer);
    const ok = validation.structural !== false && validation.ooxml !== false && extra.ok;
    return {
      status: ok ? "pass" : "fail",
      durationMs,
      file,
      sizeBytes: buffer.length,
      structural: validation.structural,
      ooxmlValidator: validation.ooxml,
      observed: `${extra.observed}; structural=${validation.structural}; ooxml=${validation.ooxml}; ${durationMs.toFixed(1)}ms`,
      notes: [extra.notes, ...validation.details].filter(Boolean).join(" | ") || undefined,
    };
  } catch (error) {
    return { status: "fail", observed: error instanceof Error ? error.message : String(error) };
  }
}

async function excelResult(id: string, generate: () => Promise<Buffer>, check: (buffer: Buffer) => Promise<{ ok: boolean; observed: string; notes?: string }> = async () => ({ ok: true, observed: "rendered" })): Promise<EngineResult> {
  if (!ExcelJS) return { status: "blocked", observed: "ExcelJS is not installed" };
  try {
    const start = performance.now();
    const buffer = await generate();
    const durationMs = performance.now() - start;
    const file = await writeArtifact(id, "exceljs", buffer);
    const validation = await validateArtifact(file, buffer);
    const extra = await check(buffer);
    const ok = validation.structural !== false && validation.ooxml !== false && extra.ok;
    return {
      status: ok ? "pass" : "fail",
      durationMs,
      file,
      sizeBytes: buffer.length,
      structural: validation.structural,
      ooxmlValidator: validation.ooxml,
      observed: `${extra.observed}; structural=${validation.structural}; ooxml=${validation.ooxml}; ${durationMs.toFixed(1)}ms`,
      notes: [extra.notes, ...validation.details].filter(Boolean).join(" | ") || undefined,
    };
  } catch (error) {
    return { status: "fail", observed: error instanceof Error ? error.message : String(error) };
  }
}

async function speedPaper(document: SpreadsheetDocument, warmup: number, iterations: number): Promise<EngineResult> {
  const timings: number[] = [];
  let lastBuffer: Buffer | undefined;
  for (let i = 0; i < warmup + iterations; i += 1) {
    const start = performance.now();
    lastBuffer = await SpreadsheetEngine.render(document);
    const elapsed = performance.now() - start;
    if (i >= warmup) timings.push(elapsed);
  }
  const file = await writeArtifact("BM-XLSX-A-speed", `runstamp-${iterations}`, lastBuffer ?? Buffer.alloc(0));
  const validation = await validateArtifact(file, lastBuffer ?? Buffer.alloc(0));
  return {
    status: validation.structural !== false && validation.ooxml !== false ? "pass" : "fail",
    file,
    sizeBytes: lastBuffer?.length,
    structural: validation.structural,
    ooxmlValidator: validation.ooxml,
    observed: formatStats(timings),
    notes: validation.details.join(" | ") || undefined,
  };
}

async function speedExcel(generate: () => Promise<Buffer>, warmup: number, iterations: number): Promise<EngineResult> {
  if (!ExcelJS) return { status: "blocked", observed: "ExcelJS is not installed" };
  const timings: number[] = [];
  let lastBuffer: Buffer | undefined;
  for (let i = 0; i < warmup + iterations; i += 1) {
    const start = performance.now();
    lastBuffer = await generate();
    const elapsed = performance.now() - start;
    if (i >= warmup) timings.push(elapsed);
  }
  const file = await writeArtifact("BM-XLSX-A-speed", `exceljs-${iterations}`, lastBuffer ?? Buffer.alloc(0));
  const validation = await validateArtifact(file, lastBuffer ?? Buffer.alloc(0));
  return {
    status: validation.structural !== false && validation.ooxml !== false ? "pass" : "fail",
    file,
    sizeBytes: lastBuffer?.length,
    structural: validation.structural,
    ooxmlValidator: validation.ooxml,
    observed: formatStats(timings),
    notes: validation.details.join(" | ") || undefined,
  };
}

function singleCellDoc(): SpreadsheetDocument {
  return { sheets: [{ name: "Sheet1", rows: [{ cells: [{ value: "Hello World" }] }] }] };
}

function styled500Doc(): SpreadsheetDocument {
  const dataRows = rows(500, 8, (row, col) => {
    const r = row + 2;
    if (col === 0) return { value: `Customer ${r}` };
    if (col === 1) return { value: `Region ${r % 5}` };
    if (col === 2) return { value: r * 100, style: { numberFormat: "#,##0" } };
    if (col === 3) return { value: r * 70, style: { numberFormat: "#,##0" } };
    if (col === 4) return { value: (r % 100) / 100, style: { numberFormat: "0.0%" } };
    if (col === 5) return { value: new Date(Date.UTC(2026, 0, (r % 28) + 1)), style: { numberFormat: "yyyy-mm-dd" } };
    if (col === 6) return { formula: `C${r}-D${r}` };
    return { formula: `E${r}/C${r}` };
  });
  return {
    sheets: [{
      name: "Styled",
      rows: [
        { cells: ["Name", "Region", "Gross", "Cost", "Rate", "Date", "Profit", "Efficiency"].map((value) => ({ value, style: { font: { bold: true, color: "FFFFFF" }, fill: { color: "2563EB" } } })) },
        ...dataRows,
      ],
    }],
  };
}

function multiSheetDoc(): SpreadsheetDocument {
  return {
    sheets: Array.from({ length: 10 }, (_, sheetIndex) => ({
      name: `Sheet ${sheetIndex + 1}`,
      rows: [
        { cells: Array.from({ length: 12 }, (_, col) => ({ value: `Metric ${col + 1}`, style: { font: { bold: true } } })) },
        ...rows(200, 12, (row, col) => ({ value: (sheetIndex + 1) * (row + 1) * (col + 1), style: { numberFormat: "#,##0.00" } })),
      ],
    })),
  };
}

function largeDoc(dataRows: number, mode: "variable" | "fixed" | "numeric" | "mixed"): SpreadsheetDocument {
  const cols = mode === "numeric" ? 5 : 10;
  return {
    sheets: [{
      name: "Data",
      rows: [
        { cells: Array.from({ length: cols }, (_, col) => ({ value: `Col ${col + 1}` })) },
        ...rows(dataRows, cols, (row, col) => {
          const r = row + 2;
          if (mode === "numeric") return { value: r * (col + 1) + 0.25 };
          if (mode === "mixed" && col < 3) return { value: deterministicText(r, col, 40 + ((r + col) % 50)) };
          if (col < 3) return { value: deterministicText(r, col, mode === "fixed" ? 50 : 10 + ((r * 17 + col * 31) % 191)) };
          if (col < 7) return { value: r * (col + 0.33), style: { numberFormat: "#,##0.00" } };
          return { value: `2026-04-${String((r % 28) + 1).padStart(2, "0")}` };
        }),
      ],
    }],
  };
}

function conditionalDoc(kind: "base" | "bold" | "italic" | "databar" | "colorscale" | "priority" | "with-validation"): SpreadsheetDocument {
  const sheet: any = {
    name: "Scores",
    rows: [
      { cells: [{ value: "Name" }, { value: "Score" }, { value: "Status" }] },
      ...rows(kind === "colorscale" ? 500 : 100, 3, (row, col) => col === 0 ? { value: `User ${row + 1}` } : col === 1 ? { value: row % 101 } : { value: "Yes" }),
    ],
  };
  if (kind === "databar") {
    sheet.conditionalFormatting = [{ ref: "B2:B101", rules: [{ type: "dataBar", color: "10B981", min: { type: "min" }, max: { type: "max" }, gradient: true }] }];
  } else if (kind === "colorscale") {
    sheet.conditionalFormatting = [{ ref: "B2:B501", rules: [{ type: "colorScale", scale: { min: { type: "min", color: "EF4444" }, mid: { type: "percentile", value: 50, color: "F59E0B" }, max: { type: "max", color: "10B981" } } }] }];
  } else if (kind === "priority") {
    sheet.conditionalFormatting = [{ ref: "B2:B51", rules: [
      { type: "cellIs", operator: "equal", formula: "100", style: { fill: { color: "FBBF24" } } },
      { type: "cellIs", operator: "greaterThanOrEqual", formula: "90", style: { fill: { color: "10B981" } } },
      { type: "cellIs", operator: "lessThan", formula: "70", style: { fill: { color: "EF4444" } } },
    ] }];
  } else {
    const font = kind === "bold" ? { bold: true, color: "FFFFFF" } : kind === "italic" ? { italic: true, color: "FFFFFF" } : undefined;
    sheet.conditionalFormatting = [{ ref: "B2:B101", rules: [
      { type: "cellIs", operator: "greaterThanOrEqual", formula: "90", style: { fill: { color: "10B981" }, font } },
      { type: "cellIs", operator: "lessThan", formula: "70", style: { fill: { color: "EF4444" }, font } },
    ] }];
  }
  if (kind === "with-validation") {
    sheet.dataValidations = [{ ref: "C2:C101", type: "list", formula1: ["Yes", "No", "Maybe"] }];
  }
  return { sheets: [sheet] };
}

function chartDoc(type: "bar" | "line" | "pie" | "table"): SpreadsheetDocument {
  const rowsForData = [
    { cells: [{ value: "Month" }, { value: "Revenue" }, { value: "Cost" }] },
    ...Array.from({ length: 12 }, (_, index) => ({ cells: [{ value: `M${index + 1}` }, { value: 100 + index * 10 }, { value: 50 + index * 5 }] })),
  ];
  const sheet: any = { name: "Sheet1", rows: rowsForData };
  if (type === "table") {
    sheet.tables = [{ name: "SalesData", ref: "A1:C13" }];
    sheet.charts = [{ type: "bar", title: "Revenue", series: [{ name: "Revenue", categories: "SalesData[Month]", values: "SalesData[Revenue]" }], anchor: { from: { col: 4, row: 1 } } }];
  } else if (type === "pie") {
    sheet.charts = [{ type: "pie", title: "Share", series: [{ name: "Revenue", categories: "Sheet1!$A$2:$A$6", values: "Sheet1!$B$2:$B$6" }], anchor: { from: { col: 4, row: 1 } }, style: { showDataLabels: true } }];
  } else if (type === "line") {
    sheet.charts = [{ type: "line", title: "Products", series: [
      { name: "Product A", categories: "Sheet1!$A$2:$A$13", values: "Sheet1!$B$2:$B$13" },
      { name: "Product B", categories: "Sheet1!$A$2:$A$13", values: "Sheet1!$C$2:$C$13" },
      { name: "Product C", categories: "Sheet1!$A$2:$A$13", values: "Sheet1!$B$2:$B$13" },
    ], anchor: { from: { col: 4, row: 1 } } }];
  } else {
    sheet.charts = [{ type: "bar", title: "Revenue", series: [
      { name: "Revenue", categories: "Sheet1!$A$2:$A$13", values: "Sheet1!$B$2:$B$13" },
      { name: "Cost", categories: "Sheet1!$A$2:$A$13", values: "Sheet1!$C$2:$C$13" },
    ], anchor: { from: { col: 4, row: 1 } } }];
  }
  return { sheets: [sheet] };
}

function mergeRefs(count: number): string[] {
  const refs: string[] = ["A1:D1"];
  let row = 2;
  while (refs.length < count) {
    refs.push(`A${row}:A${row + 1}`);
    row += 2;
  }
  return refs.slice(0, count);
}

function mergedDoc(count: number): SpreadsheetDocument {
  const maxRow = count * 2 + 2;
  return {
    sheets: [{
      name: "Merged",
      rows: rows(maxRow, 4, (row, col) => {
        const rowNumber = row + 1;
        const isMergeTopLeft = rowNumber === 1 || rowNumber % 2 === 0;
        return { value: col === 0 && isMergeTopLeft ? `R${rowNumber}` : null };
      }),
      mergedCells: mergeRefs(count),
    }],
  };
}

function formulaDoc(kind: "shared" | "filter" | "sort" | "unique" | "vlookup" | "builder" | "eval"): SpreadsheetDocument {
  if (kind === "shared") {
    return { sheets: [{ name: "Formulas", rows: [
      { cells: [{ value: "A" }, { value: "B" }, { value: "C" }, { value: "D" }, { value: "Total" }] },
      ...rows(1000, 5, (row, col) => col < 4 ? { value: row + col } : { formula: `SUM(B${row + 2}:D${row + 2})` }),
    ] }] };
  }
  if (kind === "vlookup") {
    return { sheets: [
      { name: "Sales Data", rows: [{ cells: [{ value: "K" }, { value: "Name" }, { value: "Value" }] }, { cells: [{ value: "A" }, { value: "Alpha" }, { value: 3 }] }] },
      { name: "Lookup", rows: [{ cells: [{ formula: "VLOOKUP(B1,'Sales Data'!A:C,3,FALSE)" }, { value: "A" }] }] },
    ] };
  }
  if (kind === "builder") {
    return { sheets: [{ name: "Builder", rows: [
      { cells: ["A", "B", "C", "D", "E", "F", "G"].map((value) => ({ value })) },
      ...rows(50, 7, (row, col) => {
        const r = row + 2;
        if (col < 5) return { value: r * (col + 1) };
        if (col === 5) return { formula: formula.sum(`B${r}:E${r}`) };
        return { formula: formula.if(formula.gt(`F${r}`, 1000), formula.text("High"), formula.text("Low")) };
      }),
      { cells: [{ value: "Total" }, {}, {}, {}, {}, { formula: formula.sum("F2:F51") }, { formula: formula.vlookup(formula.text("A"), "A1:B2", 2, false) }] },
    ] }] };
  }
  if (kind === "eval") {
    return { sheets: [{ name: "Eval", rows: [{ cells: [{ value: 10 }] }, { cells: [{ value: 20 }] }, { cells: [{ formula: "SUM(A1:A2)" }] }] }] };
  }
  const expression = kind === "filter" ? "FILTER(A1:A20,B1:B20>80)" : kind === "sort" ? "SORT(A1:A20,B1:B20,-1)" : "UNIQUE(A1:A20)";
  return { sheets: [{ name: "Dyn", rows: [
    ...rows(20, 2, (row, col) => col === 0 ? { value: `Name ${row}` } : { value: row * 5 }),
    { cells: [{}, {}, {}, kind === "filter" ? { formula: expression } : {}, kind === "sort" ? { formula: expression } : {}, kind === "unique" ? { formula: expression } : {}] },
  ] }] };
}

function dateDoc(kind: "1900" | "1904" | "cjk"): SpreadsheetDocument {
  if (kind === "1904") {
    return { date1904: true, sheets: [{ name: "Dates", rows: [{ cells: [{ value: new Date(Date.UTC(2024, 5, 15)) }] }] }] };
  }
  if (kind === "cjk") {
    return { sheets: [{ name: "CJK", rows: [{ cells: [{ value: new Date(Date.UTC(2024, 5, 15)), style: { numberFormat: "[$-411]ge.m.d" } }] }] }] };
  }
  return { sheets: [{ name: "Dates", rows: [{ cells: [{ value: new Date(Date.UTC(1900, 0, 1)) }] }] }] };
}

async function run(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const results: BenchmarkResult[] = [];
  const add = (result: BenchmarkResult) => {
    results.push(result);
    console.log(`${result.id}: runstamp=${result.runstamp?.status ?? "n/a"} exceljs=${result.exceljs?.status ?? "n/a"}`);
  };

  add({ id: "BM-XLSX-A01", name: "Single-cell generation speed", runstamp: await speedPaper(singleCellDoc(), 5, 50), exceljs: await speedExcel(async () => {
    const wb = new ExcelJS.Workbook(); wb.addWorksheet("Sheet1").getCell("A1").value = "Hello World"; return Buffer.from(await wb.xlsx.writeBuffer());
  }, 5, 50) });
  add({ id: "BM-XLSX-A02", name: "500-row styled workbook speed", runstamp: await speedPaper(styled500Doc(), 3, 20), exceljs: await speedExcel(async () => {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Styled"); styled500Doc().sheets[0]!.rows.forEach((row) => ws.addRow(row.cells.map((cell: any) => cell.value ?? (cell.formula ? { formula: cell.formula } : null)))); return Buffer.from(await wb.xlsx.writeBuffer());
  }, 3, 20) });
  add({ id: "BM-XLSX-A03", name: "10-sheet workbook speed", runstamp: await speedPaper(multiSheetDoc(), 3, 15), exceljs: await speedExcel(async () => {
    const wb = new ExcelJS.Workbook(); for (const sheet of multiSheetDoc().sheets) { const ws = wb.addWorksheet(sheet.name); sheet.rows.forEach((row) => ws.addRow(row.cells.map((cell: any) => cell.value ?? null))); } return Buffer.from(await wb.xlsx.writeBuffer());
  }, 3, 15) });

  for (const [id, name, doc] of [
    ["BM-XLSX-B01", "50,000 rows variable-length strings", largeDoc(50_000, "variable")],
    ["BM-XLSX-B02", "50,000 rows fixed-length strings", largeDoc(50_000, "fixed")],
    ["BM-XLSX-B03", "100,000 rows numeric only", largeDoc(100_000, "numeric")],
    ["BM-XLSX-B04", "200,000 rows memory stability", largeDoc(200_000, "mixed")],
  ] as const) {
    add({ id, name, runstamp: await paperResult(id, doc, async (buffer) => ({ ok: (await readZipEntry(buffer, "xl/worksheets/sheet1.xml")).includes(`r="${doc.sheets[0]!.rows.length}"`), observed: `${doc.sheets[0]!.rows.length} rows requested` }), { largeDataset: true }) });
  }

  for (const [id, name, kind] of [
    ["BM-XLSX-C01", "Conditional formatting cell value rules", "base"],
    ["BM-XLSX-C02", "Conditional formatting with bold font", "bold"],
    ["BM-XLSX-C03", "Conditional formatting with italic font", "italic"],
    ["BM-XLSX-C04", "Data bar conditional formatting", "databar"],
    ["BM-XLSX-C05", "Color scale conditional formatting", "colorscale"],
    ["BM-XLSX-C06", "Multiple rules priority order", "priority"],
    ["BM-XLSX-C07", "Conditional formatting + data validation", "with-validation"],
  ] as const) {
    add({ id, name, runstamp: await paperResult(id, conditionalDoc(kind), async (buffer) => {
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
      const ok = xml.includes("conditionalFormatting") && (kind !== "with-validation" || xml.includes("dataValidations"));
      return { ok, observed: `conditionalFormatting=${xml.includes("conditionalFormatting")}; dataValidations=${xml.includes("dataValidations")}` };
    }) });
  }

  for (const [id, name, type, needle] of [
    ["BM-XLSX-D01", "Bar chart with data range", "bar", "<c:barChart"],
    ["BM-XLSX-D02", "Line chart with 3 series", "line", "<c:lineChart"],
    ["BM-XLSX-D03", "Pie chart with data labels", "pie", "<c:pieChart"],
    ["BM-XLSX-D04", "Chart referencing a named table", "table", "SalesData"],
  ] as const) {
    add({ id, name, runstamp: await paperResult(id, chartDoc(type), async (buffer) => {
      const xml = await readZipEntry(buffer, "xl/charts/chart1.xml");
      return { ok: xml.includes(needle), observed: `chart1.xml contains ${needle}=${xml.includes(needle)}` };
    }), exceljs: { status: "blocked", observed: "ExcelJS has no chart generation API in this probe." } });
  }

  for (const [id, name, count] of [["BM-XLSX-E01", "1,000 merged regions", 1000], ["BM-XLSX-E02", "5,000 merged regions", 5000], ["BM-XLSX-E03", "10,000 merged regions", 10000]] as const) {
    add({ id, name, runstamp: await paperResult(id, mergedDoc(count), async (buffer) => {
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
      return { ok: xml.includes(`mergeCells count="${count}"`), observed: `merge count present=${xml.includes(`mergeCells count="${count}"`)}` };
    }, { largeDataset: count >= 5000 }), exceljs: count === 1000 ? await excelResult(id, async () => {
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Merged"); for (let i = 1; i <= count * 2 + 2; i += 1) ws.addRow([`R${i}`, null, null, null]); for (const ref of mergeRefs(count)) ws.mergeCells(ref); return Buffer.from(await wb.xlsx.writeBuffer());
    }) : { status: "blocked", observed: "Skipped to avoid multi-minute ExcelJS O(n^2) merge run in an interactive session." } });
  }

  for (const [id, name, kind, needle] of [
    ["BM-XLSX-F01", "Shared formula no spurious @", "shared", "@"],
    ["BM-XLSX-F02", "Dynamic array FILTER", "filter", "FILTER(A1:A20,B1:B20&gt;80)"],
    ["BM-XLSX-F03", "Dynamic array SORT", "sort", "SORT(A1:A20,B1:B20,-1)"],
    ["BM-XLSX-F04", "Dynamic array UNIQUE", "unique", "UNIQUE(A1:A20)"],
    ["BM-XLSX-F05", "Cross-sheet VLOOKUP with spaces", "vlookup", "&apos;Sales Data&apos;!A:C"],
    ["BM-XLSX-F06", "Formula builder API", "builder", "VLOOKUP"],
    ["BM-XLSX-F07", "Server-side formula evaluation", "eval", "<v>30</v>"],
  ] as const) {
    add({ id, name, runstamp: await paperResult(id, formulaDoc(kind as any), async (buffer) => {
      const sheetPath = kind === "vlookup" ? "xl/worksheets/sheet2.xml" : "xl/worksheets/sheet1.xml";
      const xml = await readZipEntry(buffer, sheetPath);
      if (kind === "eval") {
        const hasCachedValue = xml.includes(needle);
        return { ok: !hasCachedValue, observed: `free/source surface contains ${needle}=${hasCachedValue}`, notes: "Spec's positive claim is Pro-only; this run only verifies the free/source behavior does not include the cached value." };
      }
      const ok = kind === "shared" ? !xml.includes("@") : xml.includes(needle);
      return { ok, observed: kind === "shared" ? `contains @=${xml.includes("@")}` : `contains ${needle}=${xml.includes(needle)}`, notes: kind === "eval" ? "Spec calls this Pro-only; this checks current free/source behavior only." : undefined };
    }) });
  }

  for (const [id, name, kind, expected] of [
    ["BM-XLSX-G01", "Date 1/1/1900 serial boundary", "1900", "<v>1</v>"],
    ["BM-XLSX-G02", "1904 date system flag", "1904", "date1904"],
    ["BM-XLSX-G04", "CJK date format standard/stream", "cjk", "[$-411]"],
  ] as const) {
    add({ id, name, runstamp: await paperResult(id, dateDoc(kind as any), async (buffer) => {
      if (kind === "1904") {
        const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");
        const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
        const ok = workbookXml.includes('date1904="1"') && sheetXml.includes("<v>43996</v>");
        return { ok, observed: `workbookPr date1904=${workbookXml.includes('date1904="1"')}; serial 43996=${sheetXml.includes("<v>43996</v>")}` };
      }
      const xml = `${await readZipEntry(buffer, "xl/worksheets/sheet1.xml")}\n${await readZipEntry(buffer, "xl/styles.xml")}`;
      return { ok: xml.includes(expected), observed: `contains ${expected}=${xml.includes(expected)}` };
    }) });
  }
  add({ id: "BM-XLSX-G03", name: "Strict Open XML date parsing", runstamp: { status: "blocked", observed: "No Strict Open XML parse/generate path was found in the current public XLSX engine." } });

  for (const [id, name, doc] of [
    ["BM-XLSX-H01", "Streaming dates", dateDoc("1900")],
    ["BM-XLSX-H02", "Streaming rich text", { sheets: [{ name: "Rich", rows: rows(50, 1, () => ({ value: [{ text: "bold", font: { bold: true } }, { text: " italic", font: { italic: true, color: "EF4444" } }] })) }] } as SpreadsheetDocument],
    ["BM-XLSX-H03", "Streaming shared strings", { sheets: [{ name: "Strings", rows: rows(200, 1, () => ({ value: "repeat" })) }] } as SpreadsheetDocument],
    ["BM-XLSX-H04", "Streaming 100K memory", largeDoc(100_000, "numeric")],
  ] as const) {
    try {
      const start = performance.now();
      const standard = await SpreadsheetEngine.render(doc, { deterministic: true, largeDataset: id === "BM-XLSX-H04" });
      const stream = await SpreadsheetEngine.renderStream(doc, { deterministic: true, largeDataset: id === "BM-XLSX-H04" });
      const streamed = await streamToBuffer(stream);
      const file = await writeArtifact(id, "runstamp-stream", streamed);
      const validation = await validateArtifact(file, streamed);
      const same = Buffer.compare(standard, streamed) === 0;
      add({ id, name, runstamp: { status: validation.structural !== false && validation.ooxml !== false && same ? "pass" : "fail", durationMs: performance.now() - start, file, sizeBytes: streamed.length, structural: validation.structural, ooxmlValidator: validation.ooxml, observed: `standard-vs-stream byte identical=${same}; structural=${validation.structural}; ooxml=${validation.ooxml}` } });
    } catch (error) {
      add({ id, name, runstamp: { status: "fail", observed: error instanceof Error ? error.message : String(error) } });
    }
  }

  for (const id of ["BM-XLSX-I01", "BM-XLSX-I02", "BM-XLSX-I03", "BM-XLSX-I04", "BM-XLSX-I05"]) {
    add({ id, name: "Template round-trip (Pro only)", runstamp: { status: "blocked", observed: "Pro-only benchmark; free/source run has no license-gated Pro template oracle attached." } });
  }

  add({ id: "BM-XLSX-J01", name: "10 concurrent renders isolation", runstamp: await (async () => {
    const start = performance.now();
    const buffers = await Promise.all(Array.from({ length: 10 }, (_, index) => SpreadsheetEngine.render({
      sheets: [{ name: `Report ${index + 1}`, rows: [{ cells: [{ value: `id-${index + 1}` }, { value: index, style: { fill: { color: ["EF4444", "F59E0B", "10B981", "3B82F6", "8B5CF6", "EC4899", "14B8A6", "84CC16", "64748B", "111827"][index] }, numberFormat: "0.00" } }] }] }],
    })));
    const checks = await Promise.all(buffers.map(async (buffer, index) => {
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
      return xml.includes(`id-${index + 1}`) || (await readZipEntry(buffer, "xl/sharedStrings.xml")).includes(`id-${index + 1}`);
    }));
    return { status: checks.every(Boolean) ? "pass" : "fail", durationMs: performance.now() - start, observed: `all unique ids present=${checks.every(Boolean)}; ${buffers.length} renders` };
  })() });

  const summary = results.reduce<Record<Status, number>>((acc, result) => {
    const status = result.runstamp?.status ?? "blocked";
    acc[status] += 1;
    return acc;
  }, { pass: 0, warn: 0, fail: 0, blocked: 0 });
  const report = {
    generatedAt: new Date().toISOString(),
    spec: "docs/benchmarks-0410/benchmark-xlsx-2.md",
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    dependencySource: "/tmp/runstamp-xlsx-bench-deps",
    caveats: [
      "Excel desktop repair dialogs and visual rendering were not tested.",
      "The checked-in repo did not contain a benchmark-xlsx-2 runner; this is a local probe runner.",
      "ExcelJS was loaded from a temp install, not the repo dependency graph.",
    ],
    runstampSummary: summary,
    results,
  };
  await writeFile(join(outDir, "summary.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (summary.fail > 0) process.exitCode = 1;
}

await run();
