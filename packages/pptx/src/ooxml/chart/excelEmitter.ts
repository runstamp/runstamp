// src/ooxml/chart/excelEmitter.ts — Lightweight .xlsx generator via JSZip

import JSZip from "jszip";
import { PaperError } from "../../errors.js";
import type { ChartData, TreemapCategory } from "../../types/ast.js";
import { colLetter } from "./chartXml.js";
import { DETERMINISTIC_DATE } from "../../deterministicMode.js";
import { escapeXml } from "../drawing/textUtils.js";
import { getChartExcelLayout } from "./chartCapabilities.js";
import { normalizeWaterfallData } from "./waterfallCompat.js";

/**
 * Forces every entry on the given JSZip instance — including folder
 * entries auto-created by JSZip when a nested file is added — to use
 * DETERMINISTIC_DATE for its local file header timestamp. JSZip
 * stamps auto-created folders with `new Date()` at the moment of
 * creation, which causes the outer PPTX to diverge across renders
 * even when all user-added files have a fixed `date`. Must be called
 * after all `zip.file(...)` calls and before `zip.generateAsync(...)`.
 */
function stampAllEntriesDeterministic(zip: JSZip): void {
  for (const entry of Object.values(zip.files)) {
    entry.date = DETERMINISTIC_DATE;
  }
}

/**
 * Generates a minimal Excel .xlsx buffer containing chart data.
 * For category charts: categories in column A, series values in B, C, D...
 * For scatter/bubble: numeric XY(+size) columns per series.
 * For ChartEx: treemap/sunburst hierarchical, histogram raw values, box & whisker per-series.
 */
export async function generateExcelBuffer(chartData: ChartData): Promise<Buffer> {
  switch (getChartExcelLayout(chartData.chartType)) {
    case "xy":
      return generateXYExcelBuffer(chartData);
    case "waterfall":
      return generateWaterfallExcelBuffer(chartData);
    case "stock":
      return generateStockExcelBuffer(chartData);
    case "funnel":
      return generateFunnelExcelBuffer(chartData);
    case "hierarchy":
      return generateTreemapExcelBuffer(chartData);
    case "histogram":
      return generateHistogramExcelBuffer(chartData);
    case "boxWhisker":
      return generateBoxWhiskerExcelBuffer(chartData);
    case "standard":
      break;
  }
  const zip = new JSZip();

  // Collect all shared strings (series names + category names)
  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };

  // Pre-index all strings
  const series = chartData.series ?? [];
  const categories = chartData.categories ?? [];
  for (const s of series) {
    ssIndex(s.name);
  }
  for (const cat of categories) {
    ssIndex(cat);
  }

  // Always use DETERMINISTIC_DATE for the embedded XLSX's per-entry
  // local file header timestamps. The XLSX is never independently
  // opened by users — it's data for chart editing inside the PPTX —
  // so its mod-time has no semantic meaning. Decoupling from
  // isDeterministicMode() avoids cross-test AsyncLocalStorage leakage
  // that historically caused chart-path non-determinism flakes.
  const opts = { date: DETERMINISTIC_DATE };

  // [Content_Types].xml
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);

  // _rels/.rels
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);

  // xl/workbook.xml
  zip.file("xl/workbook.xml", generateWorkbook(), opts);

  // xl/_rels/workbook.xml.rels
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);

  // xl/styles.xml
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);

  // xl/sharedStrings.xml
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);

  // xl/worksheets/sheet1.xml
  zip.file("xl/worksheets/sheet1.xml", generateSheet(chartData, ssIndex), opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Simplified xlsx content types — no table, no theme, no docProps.
 * Matches python-pptx's minimal approach for maximum compatibility.
 */
function generateExcelContentTypesSimple(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;
}

function generateExcelRootRelsSimple(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function generateWorkbook(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function generateWorkbookRelsSimple(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

function generateMinimalStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
}

function generateSharedStrings(strings: string[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">\n`;
  for (const s of strings) {
    xml += `  <si><t>${escapeXml(s)}</t></si>\n`;
  }
  xml += `</sst>`;
  return xml;
}

function generateSheet(
  chartData: ChartData,
  ssIndex: (s: string) => number,
): string {
  const series = chartData.series ?? [];
  const categories = chartData.categories ?? [];
  const lastCol = colLetter(series.length);
  const lastRow = categories.length + 1;
  const ref = `A1:${lastCol}${lastRow}`;

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  xml += `  <dimension ref="${ref}"/>\n`;
  xml += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  xml += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  xml += `  <sheetData>\n`;

  // Row 1: Headers — empty A1, then series names in B1, C1, etc.
  xml += `    <row r="1">\n`;
  for (let i = 0; i < series.length; i++) {
    const col = colLetter(i + 1);
    xml += `      <c r="${col}1" t="s"><v>${ssIndex(series[i].name)}</v></c>\n`;
  }
  xml += `    </row>\n`;

  // Row 2+: category name in A, numeric values in B, C, D...
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    xml += `    <row r="${rowNum}">\n`;
    xml += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>\n`;
    for (let s = 0; s < series.length; s++) {
      const col = colLetter(s + 1);
      xml += `      <c r="${col}${rowNum}"><v>${series[s].values[r]}</v></c>\n`;
    }
    xml += `    </row>\n`;
  }

  xml += `  </sheetData>\n`;
  xml += `</worksheet>`;
  return xml;
}

/**
 * Generates Excel buffer for scatter/bubble charts with numeric XY(+size) columns.
 */
async function generateXYExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const xySeries = chartData.xySeries ?? [];
  const isBubble = chartData.chartType === "bubble";

  // Shared strings: only series names as headers
  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };

  // Pre-index series names
  for (const s of xySeries) {
    ssIndex(s.name);
  }

  const opts = { date: DETERMINISTIC_DATE };

  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  zip.file("xl/worksheets/sheet1.xml", generateXYSheet(xySeries, isBubble, ssIndex), opts);

  // Companion files
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function generateXYSheet(
  xySeries: import("../../types/ast.js").XYSeries[],
  isBubble: boolean,
  ssIndex: (s: string) => number,
): string {
  const colsPerSeries = isBubble ? 3 : 2;
  const totalCols = xySeries.length * colsPerSeries;
  const maxRows = Math.max(...xySeries.map(s => s.dataPoints.length), 0);
  const lastCol = colLetter(totalCols - 1);
  const ref = `A1:${lastCol}${maxRows + 1}`;

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  xml += `  <dimension ref="${ref}"/>\n`;
  xml += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  xml += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  xml += `  <sheetData>\n`;

  // Row 1: Headers — series name above the Y column (or first data column)
  xml += `    <row r="1">\n`;
  for (let i = 0; i < xySeries.length; i++) {
    const baseCol = i * colsPerSeries;
    // Put series name above Y column (baseCol + 1)
    const nameCol = colLetter(baseCol + 1);
    xml += `      <c r="${nameCol}1" t="s"><v>${ssIndex(xySeries[i].name)}</v></c>\n`;
  }
  xml += `    </row>\n`;

  // Row 2+: numeric data
  for (let r = 0; r < maxRows; r++) {
    const rowNum = r + 2;
    xml += `    <row r="${rowNum}">\n`;
    for (let i = 0; i < xySeries.length; i++) {
      const pts = xySeries[i].dataPoints;
      const baseCol = i * colsPerSeries;
      if (r < pts.length) {
        const xCol = colLetter(baseCol);
        const yCol = colLetter(baseCol + 1);
        xml += `      <c r="${xCol}${rowNum}"><v>${pts[r].x}</v></c>\n`;
        xml += `      <c r="${yCol}${rowNum}"><v>${pts[r].y}</v></c>\n`;
        if (isBubble) {
          const sizeCol = colLetter(baseCol + 2);
          xml += `      <c r="${sizeCol}${rowNum}"><v>${pts[r].size ?? 1}</v></c>\n`;
        }
      }
    }
    xml += `    </row>\n`;
  }

  xml += `  </sheetData>\n`;
  xml += `</worksheet>`;
  return xml;
}

/**
 * Generates Excel buffer for waterfall charts.
 * Columns: A=categories, B=Base (invisible), C=Increase, D=Decrease
 */
async function generateWaterfallExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const wd = normalizeWaterfallData(chartData);
  if (!wd) {
    throw new PaperError("waterfall chart requires normalized categories and values", {
      code: "VALIDATION_FAILED",
      phase: "chart",
    });
  }
  const categories = wd.categories;
  const values = wd.values;
  const totalIndices = new Set(wd.totalIndices ?? []);

  // Compute synthetic series (same logic as chartXml.ts)
  const baseValues: number[] = [];
  const increaseValues: number[] = [];
  const decreaseValues: number[] = [];

  let runningTotal = 0;
  for (let i = 0; i < values.length; i++) {
    if (totalIndices.has(i)) {
      baseValues.push(0);
      increaseValues.push(values[i]);
      decreaseValues.push(0);
      runningTotal = values[i];
    } else {
      const val = values[i];
      if (val >= 0) {
        baseValues.push(runningTotal);
        increaseValues.push(val);
        decreaseValues.push(0);
      } else {
        baseValues.push(runningTotal + val);
        increaseValues.push(0);
        decreaseValues.push(-val);
      }
      runningTotal += val;
    }
  }

  // Shared strings: category names + series headers
  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };

  // Pre-index strings
  ssIndex("Base");
  ssIndex("Increase");
  ssIndex("Decrease");
  for (const cat of categories) {
    ssIndex(cat);
  }

  const opts = { date: DETERMINISTIC_DATE };

  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  zip.file("xl/worksheets/sheet1.xml", generateWaterfallSheet(categories, baseValues, increaseValues, decreaseValues, ssIndex), opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function generateWaterfallSheet(
  categories: string[],
  baseValues: number[],
  increaseValues: number[],
  decreaseValues: number[],
  ssIndex: (s: string) => number,
): string {
  const ref = `A1:D${categories.length + 1}`;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  xml += `  <dimension ref="${ref}"/>\n`;
  xml += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  xml += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  xml += `  <sheetData>\n`;

  // Row 1: Headers — A1 empty, B1=Base, C1=Increase, D1=Decrease
  xml += `    <row r="1">\n`;
  xml += `      <c r="B1" t="s"><v>${ssIndex("Base")}</v></c>\n`;
  xml += `      <c r="C1" t="s"><v>${ssIndex("Increase")}</v></c>\n`;
  xml += `      <c r="D1" t="s"><v>${ssIndex("Decrease")}</v></c>\n`;
  xml += `    </row>\n`;

  // Row 2+: category name in A, numeric values in B, C, D
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    xml += `    <row r="${rowNum}">\n`;
    xml += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>\n`;
    xml += `      <c r="B${rowNum}"><v>${baseValues[r]}</v></c>\n`;
    xml += `      <c r="C${rowNum}"><v>${increaseValues[r]}</v></c>\n`;
    xml += `      <c r="D${rowNum}"><v>${decreaseValues[r]}</v></c>\n`;
    xml += `    </row>\n`;
  }

  xml += `  </sheetData>\n`;
  xml += `</worksheet>`;
  return xml;
}

/**
 * Generates Excel buffer for stock (OHLC) charts.
 * Columns: A=categories, B=Open, C=High, D=Low, E=Close
 */
async function generateStockExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const sd = chartData.stockData!;
  const categories = sd.categories;

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) { idx = sharedStrings.length; sharedStrings.push(s); sharedStringIndex.set(s, idx); }
    return idx;
  };

  ssIndex("Open"); ssIndex("High"); ssIndex("Low"); ssIndex("Close");
  for (const cat of categories) ssIndex(cat);

  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);

  const stockRef = `A1:E${categories.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  sheet += `  <dimension ref="${stockRef}"/>\n`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  sheet += `  <sheetData>\n`;
  sheet += `    <row r="1">\n`;
  sheet += `      <c r="B1" t="s"><v>${ssIndex("Open")}</v></c>\n`;
  sheet += `      <c r="C1" t="s"><v>${ssIndex("High")}</v></c>\n`;
  sheet += `      <c r="D1" t="s"><v>${ssIndex("Low")}</v></c>\n`;
  sheet += `      <c r="E1" t="s"><v>${ssIndex("Close")}</v></c>\n`;
  sheet += `    </row>\n`;
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    sheet += `    <row r="${rowNum}">\n`;
    sheet += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>\n`;
    sheet += `      <c r="B${rowNum}"><v>${sd.open[r]}</v></c>\n`;
    sheet += `      <c r="C${rowNum}"><v>${sd.high[r]}</v></c>\n`;
    sheet += `      <c r="D${rowNum}"><v>${sd.low[r]}</v></c>\n`;
    sheet += `      <c r="E${rowNum}"><v>${sd.close[r]}</v></c>\n`;
    sheet += `    </row>\n`;
  }
  sheet += `  </sheetData>\n`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

/**
 * Generates Excel buffer for funnel charts.
 * Columns: A=categories, B=LeftSpacer, C=Value, D=RightSpacer
 */
async function generateFunnelExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const fd = chartData.funnelData!;
  const categories = fd.categories;
  const values = fd.values;
  const maxVal = Math.max(...values);

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) { idx = sharedStrings.length; sharedStrings.push(s); sharedStringIndex.set(s, idx); }
    return idx;
  };

  ssIndex("LeftSpacer"); ssIndex("Value"); ssIndex("RightSpacer");
  for (const cat of categories) ssIndex(cat);

  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);

  const funnelRef = `A1:D${categories.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  sheet += `  <dimension ref="${funnelRef}"/>\n`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  sheet += `  <sheetData>\n`;
  sheet += `    <row r="1">\n`;
  sheet += `      <c r="B1" t="s"><v>${ssIndex("LeftSpacer")}</v></c>\n`;
  sheet += `      <c r="C1" t="s"><v>${ssIndex("Value")}</v></c>\n`;
  sheet += `      <c r="D1" t="s"><v>${ssIndex("RightSpacer")}</v></c>\n`;
  sheet += `    </row>\n`;
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    const spacer = (maxVal - values[r]) / 2;
    sheet += `    <row r="${rowNum}">\n`;
    sheet += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>\n`;
    sheet += `      <c r="B${rowNum}"><v>${spacer}</v></c>\n`;
    sheet += `      <c r="C${rowNum}"><v>${values[r]}</v></c>\n`;
    sheet += `      <c r="D${rowNum}"><v>${spacer}</v></c>\n`;
    sheet += `    </row>\n`;
  }
  sheet += `  </sheetData>\n`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// ---------------------------------------------------------------------------
// Treemap / Sunburst Excel Buffer
// ---------------------------------------------------------------------------

interface FlatLeafExcel {
  path: string[];  // [leafName, parentName, grandparentName, ...]
  value: number;
}

function flattenHierarchyForExcel(categories: TreemapCategory[], ancestors: string[] = []): FlatLeafExcel[] {
  const leaves: FlatLeafExcel[] = [];
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      leaves.push(...flattenHierarchyForExcel(cat.children, [cat.name, ...ancestors]));
    } else {
      leaves.push({ path: [cat.name, ...ancestors], value: cat.value ?? 0 });
    }
  }
  return leaves;
}

async function generateTreemapExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const data = chartData.treemapData ?? chartData.sunburstData;
  if (!data) return generateMinimalExcelBuffer();

  const leaves = flattenHierarchyForExcel(data.categories);
  const maxDepth = Math.max(...leaves.map(l => l.path.length), 1);

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) { idx = sharedStrings.length; sharedStrings.push(s); sharedStringIndex.set(s, idx); }
    return idx;
  };

  // Pre-index: column headers + all leaf path names
  const headers: string[] = [];
  for (let d = maxDepth - 1; d >= 0; d--) {
    headers.push(d === 0 ? "Category" : `Level${d}`);
  }
  headers.push("Value");
  for (const h of headers) ssIndex(h);
  for (const leaf of leaves) {
    for (const name of leaf.path) ssIndex(name);
  }

  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);

  // Sheet: columns = hierarchy levels (outermost to innermost) + value
  const treemapLastCol = colLetter(headers.length - 1);
  const treemapRef = `A1:${treemapLastCol}${leaves.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  sheet += `  <dimension ref="${treemapRef}"/>\n`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  sheet += `  <sheetData>\n`;

  // Row 1: headers
  sheet += `    <row r="1">\n`;
  for (let c = 0; c < headers.length; c++) {
    sheet += `      <c r="${colLetter(c)}1" t="s"><v>${ssIndex(headers[c])}</v></c>\n`;
  }
  sheet += `    </row>\n`;

  // Row 2+: data (outermost level first, then inner, then value)
  for (let r = 0; r < leaves.length; r++) {
    const rowNum = r + 2;
    const leaf = leaves[r];
    sheet += `    <row r="${rowNum}">\n`;
    // Path reversed: outermost first
    for (let d = maxDepth - 1; d >= 0; d--) {
      const col = maxDepth - 1 - d;
      const name = d < leaf.path.length ? leaf.path[d] : "";
      if (name) {
        sheet += `      <c r="${colLetter(col)}${rowNum}" t="s"><v>${ssIndex(name)}</v></c>\n`;
      }
    }
    // Value column
    sheet += `      <c r="${colLetter(maxDepth)}${rowNum}"><v>${leaf.value}</v></c>\n`;
    sheet += `    </row>\n`;
  }

  sheet += `  </sheetData>\n`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// ---------------------------------------------------------------------------
// Histogram Excel Buffer
// ---------------------------------------------------------------------------

async function generateHistogramExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const data = chartData.histogramData;
  if (!data) return generateMinimalExcelBuffer();

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) { idx = sharedStrings.length; sharedStrings.push(s); sharedStringIndex.set(s, idx); }
    return idx;
  };

  const seriesName = data.seriesName ?? "Values";
  ssIndex(seriesName);

  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);

  // Sheet: Column A = series name header, then raw values
  const histRef = `A1:A${data.values.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  sheet += `  <dimension ref="${histRef}"/>\n`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  sheet += `  <sheetData>\n`;
  sheet += `    <row r="1">\n`;
  sheet += `      <c r="A1" t="s"><v>${ssIndex(seriesName)}</v></c>\n`;
  sheet += `    </row>\n`;
  for (let r = 0; r < data.values.length; r++) {
    const rowNum = r + 2;
    sheet += `    <row r="${rowNum}">\n`;
    sheet += `      <c r="A${rowNum}"><v>${data.values[r]}</v></c>\n`;
    sheet += `    </row>\n`;
  }
  sheet += `  </sheetData>\n`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// ---------------------------------------------------------------------------
// Box & Whisker Excel Buffer
// ---------------------------------------------------------------------------

async function generateBoxWhiskerExcelBuffer(chartData: ChartData): Promise<Buffer> {
  const zip = new JSZip();
  const data = chartData.boxWhiskerData;
  if (!data) return generateMinimalExcelBuffer();

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();
  const ssIndex = (s: string): number => {
    let idx = sharedStringIndex.get(s);
    if (idx === undefined) { idx = sharedStrings.length; sharedStrings.push(s); sharedStringIndex.set(s, idx); }
    return idx;
  };

  // Pre-index: category names + series names
  for (const cat of data.categories) ssIndex(cat);
  for (const s of data.series) ssIndex(s.name);

  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);

  // Sheet: Column A = category (repeated), Columns B+ = series values
  const maxRows = Math.max(...data.series.map(s => s.values.length), 0);
  const bwLastCol = colLetter(data.series.length);
  const bwRef = `A1:${bwLastCol}${maxRows + 1}`;

  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  sheet += `  <dimension ref="${bwRef}"/>\n`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>\n`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>\n`;
  sheet += `  <sheetData>\n`;

  // Row 1: headers
  sheet += `    <row r="1">\n`;
  for (let s = 0; s < data.series.length; s++) {
    sheet += `      <c r="${colLetter(s + 1)}1" t="s"><v>${ssIndex(data.series[s].name)}</v></c>\n`;
  }
  sheet += `    </row>\n`;

  // Data rows
  for (let r = 0; r < maxRows; r++) {
    const rowNum = r + 2;
    sheet += `    <row r="${rowNum}">\n`;
    // Category column (cycling through categories)
    if (data.categories.length > 0) {
      const catIdx = r % data.categories.length;
      sheet += `      <c r="A${rowNum}" t="s"><v>${ssIndex(data.categories[catIdx])}</v></c>\n`;
    }
    // Series value columns
    for (let s = 0; s < data.series.length; s++) {
      if (r < data.series[s].values.length) {
        sheet += `      <c r="${colLetter(s + 1)}${rowNum}"><v>${data.series[s].values[r]}</v></c>\n`;
      }
    }
    sheet += `    </row>\n`;
  }

  sheet += `  </sheetData>\n`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);

  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// (Companion files like table, theme, docProps, sheet rels were removed
// to match python-pptx's minimal xlsx approach — avoids PowerPoint Mac
// chart repair issues caused by table/theme validation conflicts.)

// ---------------------------------------------------------------------------
// Minimal fallback Excel buffer
// ---------------------------------------------------------------------------

async function generateMinimalExcelBuffer(): Promise<Buffer> {
  const zip = new JSZip();
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings([]), opts);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData/></worksheet>`, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
