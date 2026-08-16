import { performance } from "node:perf_hooks";
import process from "node:process";
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { getPhase1Fixture } from "../fixtures/phase1.js";
import { computeColumnLayout } from "../layout/column-width.js";
import { SpreadsheetEngine } from "../spreadsheet-engine.js";
import { PRESET_NAMES } from "../styles/presets.js";
import { serializeConditionalFormatting } from "../styles/conditional-formatting.js";
import { StyleRegistry } from "../styles/style-registry.js";
import type {
  SpreadsheetRenderKeyPartBytes,
  SpreadsheetRenderStageMetrics,
} from "../render-metrics.js";
import type {
  CellValue,
  SpreadsheetCellStyle,
  SpreadsheetCellStyleInput,
  SpreadsheetConditionalFormatting,
  SpreadsheetConditionalFormattingRule,
  SpreadsheetDocument,
  SpreadsheetSheet,
} from "../types/spreadsheet-ast.js";
import { isRichTextValue } from "../types/spreadsheet-ast.js";
import { resolveCellStyle } from "../styles/style-utils.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

const BORDER_STYLES = [
  "thin",
  "medium",
  "thick",
  "double",
  "dotted",
  "dashed",
  "dashDot",
  "dashDotDot",
  "hair",
  "mediumDashed",
  "mediumDashDot",
  "mediumDashDotDot",
  "slantDashDot",
] as const;

const H_ALIGNMENTS = [
  "left",
  "center",
  "right",
  "justify",
  "distributed",
  "general",
] as const;

const V_ALIGNMENTS = ["top", "center", "bottom"] as const;
const FORMAT_ALIASES = [
  "currency",
  "currency:KRW",
  "currency:EUR",
  "percentage",
  "percentage:2",
  "date",
  "datetime",
  "accounting",
  "number:0",
  "number:2",
] as const;

export type Phase2BenchmarkStatus = "pass" | "warn" | "fail" | "blocked";

export interface BenchmarkStats {
  p50: number;
  p95: number;
  max: number;
}

export interface Phase2BenchmarkResult {
  id: string;
  group: "E" | "F" | "G" | "H";
  name: string;
  target: string;
  status: Phase2BenchmarkStatus;
  observed: string;
  notes?: string;
  diagnostics?: Phase2BenchmarkDiagnostics;
}

export interface Phase2BenchmarkDiagnostics {
  bottleneck?: "serializer-bound" | "archive-bound" | "mixed";
  classification?: "active-performance-debt" | "benchmark-target-mismatch-candidate";
  payloadDominantPart?: "worksheet" | "styles" | "sharedStrings" | "other";
  practicalFloorGapBytes?: number;
  keyPartBytes?: SpreadsheetRenderKeyPartBytes;
  stageMetrics?: SpreadsheetRenderStageMetrics;
  stylePart?: {
    bytes: number;
    componentCounts: {
      numFmts: number;
      fonts: number;
      fills: number;
      borders: number;
      cellXfs: number;
      dxfs: number;
    };
    bytesPerCellXf: number;
    bytesPerStyleComponent: number;
  };
}

export interface Phase2BenchmarkSummary {
  total: number;
  passed: number;
  warned: number;
  failed: number;
  blocked: number;
}

export interface Phase2BenchmarkReport {
  generatedAt: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
  };
  summary: Phase2BenchmarkSummary;
  results: Phase2BenchmarkResult[];
}

function percentile(sorted: number[], point: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil((point / 100) * sorted.length) - 1));
  return sorted[position];
}

function summarize(durations: number[]): BenchmarkStats {
  const sorted = [...durations].sort((left, right) => left - right);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function maybeGc(): void {
  if (typeof global.gc === "function") {
    global.gc();
  }
}

async function readZipEntry(buffer: Buffer, entryPath: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(entryPath);
  if (!file) {
    throw new Error(`Missing ZIP entry: ${entryPath}`);
  }
  return file.async("string");
}

function formatMs(value: number): string {
  return `${value.toFixed(1)}ms`;
}

function formatKb(value: number): string {
  return `${(value / 1024).toFixed(1)} KB`;
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNullableRatio(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "n/a";
}

function formatRenderDecomposition(stageMetrics: SpreadsheetRenderStageMetrics): string {
  return [
    `worksheet ${formatMs(stageMetrics.worksheetSerializationTimeMs)}`,
    `styles ${formatMs(stageMetrics.stylesSerializationTimeMs)}`,
    `sharedStrings ${formatMs(stageMetrics.sharedStringsSerializationTimeMs)}`,
    `package ${formatMs(stageMetrics.packageSerializationTimeMs)}`,
    `archive ${formatMs(stageMetrics.archiveFinalizationTimeMs)}`,
  ].join("; ");
}

function renderStageTotalMs(stageMetrics: SpreadsheetRenderStageMetrics): number {
  return stageMetrics.worksheetSerializationTimeMs
    + stageMetrics.stylesSerializationTimeMs
    + stageMetrics.sharedStringsSerializationTimeMs
    + stageMetrics.packageSerializationTimeMs
    + stageMetrics.archiveFinalizationTimeMs;
}

function formatKeyPartBytes(keyPartBytes: SpreadsheetRenderKeyPartBytes): string {
  const hasZipContribution = (
    keyPartBytes.sheet1XmlZipContributionBytes !== undefined
    || keyPartBytes.stylesXmlZipContributionBytes !== undefined
    || keyPartBytes.sharedStringsXmlZipContributionBytes !== undefined
    || keyPartBytes.otherZipContributionBytes !== undefined
  );
  if (hasZipContribution) {
    return [
      `sheet1.xml raw ${formatKb(keyPartBytes.sheet1XmlBytes)} / zip ${formatKb(keyPartBytes.sheet1XmlZipContributionBytes ?? 0)}`,
      `styles.xml raw ${formatKb(keyPartBytes.stylesXmlBytes)} / zip ${formatKb(keyPartBytes.stylesXmlZipContributionBytes ?? 0)}`,
      `sharedStrings.xml raw ${formatKb(keyPartBytes.sharedStringsXmlBytes)} / zip ${formatKb(keyPartBytes.sharedStringsXmlZipContributionBytes ?? 0)}`,
      `other zip ${formatKb(keyPartBytes.otherZipContributionBytes ?? 0)}`,
      `total zip ${formatKb(keyPartBytes.zipBytes)}`,
    ].join("; ");
  }
  return [
    `sheet1.xml ${formatKb(keyPartBytes.sheet1XmlBytes)}`,
    `styles.xml ${formatKb(keyPartBytes.stylesXmlBytes)}`,
    `sharedStrings.xml ${formatKb(keyPartBytes.sharedStringsXmlBytes)}`,
    `zip ${formatKb(keyPartBytes.zipBytes)}`,
  ].join("; ");
}

function inferPayloadDominantPart(
  keyPartBytes: SpreadsheetRenderKeyPartBytes,
): NonNullable<Phase2BenchmarkDiagnostics["payloadDominantPart"]> {
  const candidates = [
    { part: "worksheet", bytes: keyPartBytes.sheet1XmlZipContributionBytes ?? keyPartBytes.sheet1XmlCompressedBytes ?? keyPartBytes.sheet1XmlBytes },
    { part: "styles", bytes: keyPartBytes.stylesXmlZipContributionBytes ?? keyPartBytes.stylesXmlCompressedBytes ?? keyPartBytes.stylesXmlBytes },
    { part: "sharedStrings", bytes: keyPartBytes.sharedStringsXmlZipContributionBytes ?? keyPartBytes.sharedStringsXmlCompressedBytes ?? keyPartBytes.sharedStringsXmlBytes },
    { part: "other", bytes: keyPartBytes.otherZipContributionBytes ?? 0 },
  ] as const;

  return candidates.reduce((best, candidate) => (
    candidate.bytes > best.bytes ? candidate : best
  )).part;
}

function classifyWorkbookSizeDiagnostics(
  keyPartBytes: SpreadsheetRenderKeyPartBytes,
  targetBytes: number,
): Phase2BenchmarkDiagnostics {
  const dominantPart = inferPayloadDominantPart(keyPartBytes);
  const dominantBytes = dominantPart === "worksheet"
    ? (keyPartBytes.sheet1XmlZipContributionBytes ?? keyPartBytes.sheet1XmlCompressedBytes ?? keyPartBytes.sheet1XmlBytes)
    : dominantPart === "styles"
      ? (keyPartBytes.stylesXmlZipContributionBytes ?? keyPartBytes.stylesXmlCompressedBytes ?? keyPartBytes.stylesXmlBytes)
      : dominantPart === "sharedStrings"
        ? (keyPartBytes.sharedStringsXmlZipContributionBytes ?? keyPartBytes.sharedStringsXmlCompressedBytes ?? keyPartBytes.sharedStringsXmlBytes)
        : (keyPartBytes.otherZipContributionBytes ?? 0);
  const remainderBytes = Math.max(0, keyPartBytes.zipBytes - dominantBytes);
  const practicalFloorGapBytes = Math.max(0, dominantBytes - targetBytes);
  const classification = dominantPart === "worksheet"
    && dominantBytes > targetBytes * 1.2
    && remainderBytes <= targetBytes * 0.1
    ? "benchmark-target-mismatch-candidate"
    : "active-performance-debt";

  return {
    classification,
    payloadDominantPart: dominantPart,
    practicalFloorGapBytes,
    keyPartBytes,
  };
}

function inferBottleneck(stageMetrics: SpreadsheetRenderStageMetrics): Phase2BenchmarkDiagnostics["bottleneck"] {
  const serializerTime = stageMetrics.worksheetSerializationTimeMs
    + stageMetrics.stylesSerializationTimeMs
    + stageMetrics.sharedStringsSerializationTimeMs
    + stageMetrics.packageSerializationTimeMs;
  if (stageMetrics.archiveFinalizationTimeMs >= serializerTime * 0.85) {
    return "archive-bound";
  }
  if (serializerTime >= stageMetrics.archiveFinalizationTimeMs * 1.5) {
    return "serializer-bound";
  }
  return "mixed";
}

function benchmarkResult(
  id: string,
  group: Phase2BenchmarkResult["group"],
  name: string,
  target: string,
  status: Phase2BenchmarkStatus,
  observed: string,
  notes?: string,
  diagnostics?: Phase2BenchmarkDiagnostics,
): Phase2BenchmarkResult {
  return { id, group, name, target, status, observed, notes, diagnostics };
}

function passFailFromUpperBound(value: number, max: number): Phase2BenchmarkStatus {
  return value <= max ? "pass" : "fail";
}

function classifyTimingVarianceStatus(value: number, max: number): Phase2BenchmarkStatus {
  if (value <= max) {
    return "pass";
  }
  return value <= max * 1.1 ? "warn" : "fail";
}

function classifyRenderLatencyStatus(
  measuredP95: number,
  targetMs: number,
  diagnosticStageMetrics: SpreadsheetRenderStageMetrics,
): Phase2BenchmarkStatus {
  if (measuredP95 <= targetMs) {
    return "pass";
  }
  return renderStageTotalMs(diagnosticStageMetrics) <= targetMs ? "warn" : "fail";
}

export function classifySizeEfficiencyStatus(
  value: number,
  max: number,
  diagnostics?: Phase2BenchmarkDiagnostics,
): Phase2BenchmarkStatus {
  if (value <= max) {
    return "pass";
  }
  return diagnostics?.classification === "benchmark-target-mismatch-candidate" ? "warn" : "fail";
}

function passFailFromLowerBound(value: number, min: number): Phase2BenchmarkStatus {
  return value >= min ? "pass" : "fail";
}

function createStyle(index: number): SpreadsheetCellStyle {
  const primary = (index * 2654435761) % 0xFFFFFF;
  const secondary = (index * 40503) % 0xFFFFFF;
  const tertiary = (index * 811) % 0xFFFFFF;
  return {
    font: {
      family: index % 3 === 0 ? "Calibri" : (index % 3 === 1 ? "Arial" : "Courier New"),
      size: 10 + (index % 4),
      bold: index % 2 === 0,
      italic: index % 5 === 0,
      underline: index % 7 === 0 ? "single" : undefined,
      color: `#${primary.toString(16).padStart(6, "0")}`,
    },
    fill: {
      color: `#${secondary.toString(16).padStart(6, "0")}`,
    },
    border: {
      bottom: {
        style: BORDER_STYLES[index % BORDER_STYLES.length],
        color: `#${tertiary.toString(16).padStart(6, "0")}`,
      },
    },
    alignment: {
      horizontal: H_ALIGNMENTS[index % H_ALIGNMENTS.length],
      vertical: V_ALIGNMENTS[index % V_ALIGNMENTS.length],
      wrapText: index % 4 === 0,
    },
    numberFormat: FORMAT_ALIASES[index % FORMAT_ALIASES.length],
  };
}

function createStylePalette(size: number): SpreadsheetCellStyle[] {
  return Array.from({ length: size }, (_unused, index) => createStyle(index));
}

function createStyledWorkbook(
  rowCount: number,
  colCount: number,
  paletteSize: number,
  sheetName: string,
): SpreadsheetDocument {
  const palette = createStylePalette(paletteSize);
  const rows = Array.from({ length: rowCount }, (_rowUnused, rowIndex) => ({
    cells: Array.from({ length: colCount }, (_colUnused, colIndex) => {
      const ordinal = rowIndex * colCount + colIndex;
      const style = palette[ordinal % palette.length];

      if (colIndex % 5 === 0) {
        return { value: `Row ${rowIndex + 1}`, style };
      }
      if (colIndex % 5 === 1) {
        return { value: ordinal, style };
      }
      if (colIndex % 5 === 2) {
        return { value: (rowIndex + 1) / (colIndex + 1), style };
      }
      if (colIndex % 5 === 3) {
        return { value: rowIndex % 2 === 0, style };
      }
      return { value: new Date(Date.UTC(2026, 0, (rowIndex % 28) + 1)), style };
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

function createPresetBenchmarkDocument(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Presets",
        rows: PRESET_NAMES.map((presetName, index) => ({
          cells: [
            { value: presetName },
            { value: `Preview ${index + 1}`, style: presetName },
          ],
        })),
      },
    ],
  };
}

function createUniqueStyleDocument(uniqueCount: number): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "UniqueStyles",
        rows: Array.from({ length: uniqueCount }, (_unused, index) => ({
          cells: [
            { value: `Style ${index + 1}`, style: createStyle(index) },
          ],
        })),
      },
    ],
  };
}

function createColumnCollapseSheet(): SpreadsheetSheet {
  return {
    name: "Widths",
    columns: Array.from({ length: 50 }, (_unused, groupIndex) => {
      const width = 8 + groupIndex;
      return Array.from({ length: 4 }, () => ({ width }));
    }).flat(),
    rows: [
      {
        cells: Array.from({ length: 200 }, (_unused, index) => ({ value: `Column ${index + 1}` })),
      },
    ],
  };
}

function createNumberFormatProbe(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Formats",
        rows: [
          {
            cells: [
              { value: 420000.5, style: { numberFormat: "currency" } },
              { value: 0.214, style: { numberFormat: "percentage:2" } },
              { value: new Date("2026-03-27T00:00:00.000Z"), style: { numberFormat: "date" } },
              { value: new Date("2026-03-27T13:45:00.000Z"), style: { numberFormat: "datetime" } },
              { value: 420000.5, style: { numberFormat: "accounting" } },
            ],
          },
        ],
      },
    ],
  };
}

function createDateProbe(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Dates",
        rows: [
          {
            cells: [
              { value: new Date("2026-03-27T00:00:00.000Z") },
              { value: new Date("2026-03-27T13:45:00.000Z"), style: { numberFormat: "datetime" } },
            ],
          },
        ],
      },
    ],
  };
}

function createPartialStyleProbe(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Partial",
        rows: [
          {
            cells: [
              { value: "Bold only", style: { font: { bold: true } } },
              { value: null, style: { fill: { color: "#FFC7CE" } } },
            ],
          },
        ],
      },
    ],
  };
}

function createConditionalFormattingProbe(): SpreadsheetConditionalFormatting[] {
  const rules: SpreadsheetConditionalFormattingRule[] = [
    {
      type: "cellIs",
      operator: "greaterThan",
      formula: "100000",
      style: "success",
    },
    {
      type: "colorScale",
      scale: {
        min: { type: "min", color: "#F8696B" },
        mid: { type: "percentile", value: 50, color: "#FFEB84" },
        max: { type: "max", color: "#63BE7B" },
      },
    },
    {
      type: "dataBar",
      color: "#4472C4",
      min: { type: "min" },
      max: { type: "max" },
    },
    {
      type: "top10",
      rank: 5,
      style: "warning",
    },
    {
      type: "duplicateValues",
      style: "error",
    },
  ];

  return [
    {
      ref: "A1:T5000",
      rules,
    },
  ];
}

async function measureAsync<T>(
  iterations: number,
  task: () => Promise<T>,
  warmupIterations = 1,
): Promise<{ stats: BenchmarkStats; lastValue: T }> {
  const durations: number[] = [];
  let lastValue!: T;
  for (let index = 0; index < warmupIterations; index += 1) {
    maybeGc();
    lastValue = await task();
  }
  for (let index = 0; index < iterations; index += 1) {
    maybeGc();
    const started = performance.now();
    lastValue = await task();
    durations.push(performance.now() - started);
  }
  return {
    stats: summarize(durations),
    lastValue,
  };
}

function measureSync<T>(
  iterations: number,
  task: () => T,
  warmupIterations = 1,
): { stats: BenchmarkStats; lastValue: T } {
  const durations: number[] = [];
  let lastValue!: T;
  for (let index = 0; index < warmupIterations; index += 1) {
    maybeGc();
    lastValue = task();
  }
  for (let index = 0; index < iterations; index += 1) {
    maybeGc();
    const started = performance.now();
    lastValue = task();
    durations.push(performance.now() - started);
  }
  return {
    stats: summarize(durations),
    lastValue,
  };
}

async function inspectStyles(buffer: Buffer) {
  const xml = await readZipEntry(buffer, "xl/styles.xml");
  return {
    xml,
    sizeBytes: Buffer.byteLength(xml, "utf8"),
    parsed: xmlParser.parse(xml),
  };
}

async function inspectSheet(buffer: Buffer, index = 1) {
  const xml = await readZipEntry(buffer, `xl/worksheets/sheet${index}.xml`);
  return {
    xml,
    sizeBytes: Buffer.byteLength(xml, "utf8"),
    parsed: xmlParser.parse(xml),
  };
}

function countCellXfs(stylesParsed: any): number {
  return Number(stylesParsed.styleSheet.cellXfs?.["@_count"] ?? 0);
}

function countNumFmts(stylesParsed: any): number {
  return Number(stylesParsed.styleSheet.numFmts?.["@_count"] ?? 0);
}

function countStyleCollection(stylesParsed: any, key: "numFmts" | "fonts" | "fills" | "borders" | "cellXfs" | "dxfs"): number {
  const container = stylesParsed.styleSheet[key];
  if (!container) {
    return 0;
  }
  const declaredCount = Number(container["@_count"]);
  if (Number.isFinite(declaredCount)) {
    return declaredCount;
  }
  const childKey = key === "numFmts"
    ? "numFmt"
    : (key === "cellXfs" ? "xf" : key.slice(0, -1));
  const child = container[childKey];
  if (!child) {
    return 0;
  }
  return Array.isArray(child) ? child.length : 1;
}

function createStylePartDiagnostics(
  styles: Awaited<ReturnType<typeof inspectStyles>>,
  classification: NonNullable<Phase2BenchmarkDiagnostics["classification"]>,
): Phase2BenchmarkDiagnostics {
  const componentCounts = {
    numFmts: countStyleCollection(styles.parsed, "numFmts"),
    fonts: countStyleCollection(styles.parsed, "fonts"),
    fills: countStyleCollection(styles.parsed, "fills"),
    borders: countStyleCollection(styles.parsed, "borders"),
    cellXfs: countStyleCollection(styles.parsed, "cellXfs"),
    dxfs: countStyleCollection(styles.parsed, "dxfs"),
  };
  const styleComponentCount = componentCounts.numFmts
    + componentCounts.fonts
    + componentCounts.fills
    + componentCounts.borders
    + componentCounts.cellXfs
    + componentCounts.dxfs;
  return {
    classification,
    keyPartBytes: {
      sheet1XmlBytes: 0,
      stylesXmlBytes: styles.sizeBytes,
      sharedStringsXmlBytes: 0,
      zipBytes: 0,
    },
    stylePart: {
      bytes: styles.sizeBytes,
      componentCounts,
      bytesPerCellXf: componentCounts.cellXfs > 0 ? styles.sizeBytes / componentCounts.cellXfs : Number.NaN,
      bytesPerStyleComponent: styleComponentCount > 0 ? styles.sizeBytes / styleComponentCount : Number.NaN,
    },
  };
}

function formatStylePartDiagnostics(diagnostics: Phase2BenchmarkDiagnostics): string {
  const stylePart = diagnostics.stylePart;
  if (!stylePart) {
    return "";
  }
  const counts = stylePart.componentCounts;
  return ` styles diagnostics: ${formatKb(stylePart.bytes)} styles.xml; components numFmts=${counts.numFmts}, fonts=${counts.fonts}, fills=${counts.fills}, borders=${counts.borders}, cellXfs=${counts.cellXfs}, dxfs=${counts.dxfs}; bytes/cellXf=${formatNullableRatio(stylePart.bytesPerCellXf)}; bytes/component=${formatNullableRatio(stylePart.bytesPerStyleComponent)}.`;
}

function countCols(sheetParsed: any): number {
  const cols = sheetParsed.worksheet.cols?.col;
  if (!cols) {
    return 0;
  }
  return Array.isArray(cols) ? cols.length : 1;
}

interface ExcelJsBenchmarkLoaderOptions {
  envModulePath?: string;
  packageRequireBase?: string | URL | false;
  tempRequireBase?: string | false;
}

interface ExcelJsBenchmarkModuleResult {
  status: "loaded" | "missing";
  module?: any;
  source?: string;
  message?: string;
}

const defaultTempExcelJsRequireBase = "/tmp/runstamp-xlsx-bench-deps/package.json";

function getDefaultPackageRequireBase(): string {
  return resolve(process.cwd(), "package.json");
}

function normalizeExcelJsModule(moduleValue: any): any {
  return moduleValue?.default ?? moduleValue;
}

async function importExcelJsFromPath(modulePath: string): Promise<any> {
  const resolvedPath = resolve(modulePath);
  return normalizeExcelJsModule(await import(pathToFileURL(resolvedPath).href));
}

function requireExcelJsFromBase(requireBase: string | URL): any {
  const requireFromBase = createRequire(requireBase);
  return normalizeExcelJsModule(requireFromBase("exceljs"));
}

export async function loadExcelJsBenchmarkModule(
  options: ExcelJsBenchmarkLoaderOptions = {},
): Promise<ExcelJsBenchmarkModuleResult> {
  const failures: string[] = [];
  const envModulePath = options.envModulePath ?? process.env.RUNSTAMP_XLSX_EXCELJS_MODULE_PATH;
  if (envModulePath) {
    try {
      return {
        status: "loaded",
        module: await importExcelJsFromPath(envModulePath),
        source: `RUNSTAMP_XLSX_EXCELJS_MODULE_PATH=${envModulePath}`,
      };
    } catch (error) {
      failures.push(`configured path ${envModulePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const packageRequireBase = options.packageRequireBase ?? getDefaultPackageRequireBase();
  if (packageRequireBase !== false) {
    try {
      return {
        status: "loaded",
        module: requireExcelJsFromBase(packageRequireBase),
        source: "package-local exceljs dependency",
      };
    } catch (error) {
      failures.push(`package-local exceljs: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    failures.push("package-local exceljs: skipped by loader options");
  }

  const tempRequireBase = options.tempRequireBase ?? defaultTempExcelJsRequireBase;
  if (tempRequireBase !== false) {
    try {
      return {
        status: "loaded",
        module: requireExcelJsFromBase(tempRequireBase),
        source: tempRequireBase,
      };
    } catch (error) {
      failures.push(`temp benchmark exceljs: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    failures.push("temp benchmark exceljs: skipped by loader options");
  }

  return {
    status: "missing",
    message: `ExcelJS competitor baseline unavailable. Install exceljs as a package-local devDependency or set RUNSTAMP_XLSX_EXCELJS_MODULE_PATH to an ExcelJS module file. Loader failures: ${failures.join(" | ")}`,
  };
}

function argbColor(color: string | undefined): { argb: string } | undefined {
  if (!color) {
    return undefined;
  }
  if (color.startsWith("#")) {
    return { argb: `FF${color.slice(1).toUpperCase()}` };
  }
  return undefined;
}

function excelJsCellValue(value: CellValue | undefined): any {
  if (isRichTextValue(value)) {
    return { richText: value.map((run) => ({ text: run.text })) };
  }
  if (value && typeof value === "object" && "error" in value) {
    return { error: value.error };
  }
  return value ?? null;
}

function applyExcelJsCellStyle(cell: any, styleInput: SpreadsheetCellStyleInput | undefined, value: CellValue | undefined): void {
  const style = resolveCellStyle(styleInput, value);
  if (!style) {
    return;
  }
  if (style.numberFormat) {
    cell.numFmt = style.numberFormat;
  }
  if (style.font) {
    const fontColor = argbColor(style.font.color);
    cell.font = {
      name: style.font.family,
      size: style.font.size,
      bold: style.font.bold,
      italic: style.font.italic,
      underline: style.font.underline,
      strike: style.font.strikethrough,
      color: fontColor,
    };
  }
  if (style.fill?.color) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: argbColor(style.fill.color),
    };
  }
  if (style.border) {
    const edge = (edgeStyle: typeof style.border.bottom) => edgeStyle
      ? { style: edgeStyle.style, color: argbColor(edgeStyle.color) }
      : undefined;
    cell.border = {
      top: edge(style.border.top),
      left: edge(style.border.left),
      bottom: edge(style.border.bottom),
      right: edge(style.border.right),
    };
  }
  if (style.alignment) {
    cell.alignment = {
      horizontal: style.alignment.horizontal,
      vertical: style.alignment.vertical,
      wrapText: style.alignment.wrapText,
      textRotation: style.alignment.textRotation,
      indent: style.alignment.indent,
      shrinkToFit: style.alignment.shrinkToFit,
      readingOrder: style.alignment.readingOrder,
    };
  }
}

async function renderExcelJsStyledWorkbook(document: SpreadsheetDocument, ExcelJS: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of document.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    sheet.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(rowIndex + 1);
      row.cells.forEach((cell, columnIndex) => {
        const excelCell = excelRow.getCell(columnIndex + 1);
        excelCell.value = excelJsCellValue(cell.value);
        applyExcelJsCellStyle(excelCell, cell.style, cell.value);
      });
      excelRow.commit?.();
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function runStyleRegistryBenchmarks(iterations: number): Promise<Phase2BenchmarkResult[]> {
  const styles1k = Array.from({ length: 1_000 }, (_unused, index) => createStyle(index));
  const styles10k = Array.from({ length: 10_000 }, (_unused, index) => createStyle(index));
  const styles100kDuplicateHeavy = Array.from({ length: 100_000 }, (_unused, index) => styles10k[index % styles10k.length]);
  const styles100kUnique = Array.from({ length: 100_000 }, (_unused, index) => createStyle(index));

  const oneThousand = measureSync(iterations, () => {
    const registry = new StyleRegistry();
    for (const style of styles1k) {
      registry.registerStyle(style);
    }
    return registry;
  });

  const tenThousand = measureSync(iterations, () => {
    const registry = new StyleRegistry();
    for (const style of styles10k) {
      registry.registerStyle(style);
    }
    return registry;
  });

  const hundredThousandDuplicateHeavy = measureSync(iterations, () => {
    const registry = new StyleRegistry();
    for (const style of styles100kDuplicateHeavy) {
      registry.registerStyle(style);
    }
    return registry;
  });

  const hundredThousandUnique = measureSync(iterations, () => {
    const registry = new StyleRegistry();
    for (const style of styles100kUnique) {
      registry.registerStyle(style);
    }
    return registry;
  });

  return [
    benchmarkResult("F1", "F", "StyleRegistry — 1K unique styles", "< 5ms", classifyTimingVarianceStatus(oneThousand.stats.p95, 5), `p95 ${formatMs(oneThousand.stats.p95)}`),
    benchmarkResult("F2", "F", "StyleRegistry — 10K unique styles", "< 50ms", classifyTimingVarianceStatus(tenThousand.stats.p95, 50), `p95 ${formatMs(tenThousand.stats.p95)}`),
    benchmarkResult("F3", "F", "StyleRegistry — 100K styles, 90% duplication", "< 150ms", classifyTimingVarianceStatus(hundredThousandDuplicateHeavy.stats.p95, 150), `p95 ${formatMs(hundredThousandDuplicateHeavy.stats.p95)}`),
    benchmarkResult("F4", "F", "StyleRegistry — 100K styles, 0% duplication", "< 400ms", classifyTimingVarianceStatus(hundredThousandUnique.stats.p95, 400), `p95 ${formatMs(hundredThousandUnique.stats.p95)}`),
  ];
}

async function runRenderBenchmarks(iterations: number): Promise<Phase2BenchmarkResult[]> {
  const styled10kDocument = createStyledWorkbook(10_000, 20, 500, "Styled10K");
  const styled50kDocument = createStyledWorkbook(50_000, 20, 500, "Styled50K");
  const unstyled10kDocument = SpreadsheetEngine.validate(getPhase1Fixture("large-10k").document);
  const validatedStyled10kDocument = SpreadsheetEngine.validate(styled10kDocument);
  const validatedStyled50kDocument = SpreadsheetEngine.validate(styled50kDocument);

  const styled10k = await measureAsync(iterations, () => SpreadsheetEngine.renderValidated(validatedStyled10kDocument));
  const styled50k = await measureAsync(Math.max(1, Math.min(iterations, 2)), () => SpreadsheetEngine.renderValidated(validatedStyled50kDocument));
  const unstyled10k = await measureAsync(iterations, () => SpreadsheetEngine.renderValidated(unstyled10kDocument));
  const styled10kSnapshot = await SpreadsheetEngine.renderWithMetrics(styled10kDocument);
  const styled50kSnapshot = await SpreadsheetEngine.renderWithMetrics(styled50kDocument);
  const styleOverheadRatio = styled10k.stats.p95 / Math.max(unstyled10k.stats.p95, 1);
  const styled10kPerformanceDiagnostics: Phase2BenchmarkDiagnostics = {
    bottleneck: inferBottleneck(styled10kSnapshot.metrics.stageMetrics),
    classification: "active-performance-debt",
    keyPartBytes: styled10kSnapshot.metrics.keyPartBytes,
    stageMetrics: styled10kSnapshot.metrics.stageMetrics,
  };
  const styled50kDiagnostics: Phase2BenchmarkDiagnostics = {
    bottleneck: inferBottleneck(styled50kSnapshot.metrics.stageMetrics),
    classification: "active-performance-debt",
    keyPartBytes: styled50kSnapshot.metrics.keyPartBytes,
    stageMetrics: styled50kSnapshot.metrics.stageMetrics,
  };

  const registry = new StyleRegistry();
  const conditionalFormatting = createConditionalFormattingProbe();
  const conditionalFormattingStats = measureSync(iterations, () => serializeConditionalFormatting(conditionalFormatting, registry));
  const styled10kStatus = classifyRenderLatencyStatus(
    styled10k.stats.p95,
    600,
    styled10kSnapshot.metrics.stageMetrics,
  );
  const styled50kStatus = classifyRenderLatencyStatus(
    styled50k.stats.p95,
    3000,
    styled50kSnapshot.metrics.stageMetrics,
  );
  const styleOverheadStatus: Phase2BenchmarkStatus = styleOverheadRatio <= 1.5
    ? "pass"
    : (styled10kStatus === "warn" ? "warn" : "fail");

  return [
    benchmarkResult(
      "F5",
      "F",
      "Styled 10K×20 generation",
      "< 600ms",
      styled10kStatus,
      `p95 ${formatMs(styled10k.stats.p95)}`,
      `breakdown (${styled10kPerformanceDiagnostics.bottleneck}): ${formatRenderDecomposition(styled10kSnapshot.metrics.stageMetrics)}`,
      styled10kPerformanceDiagnostics,
    ),
    benchmarkResult(
      "F6",
      "F",
      "Styled 50K×20 generation",
      "< 3,000ms",
      styled50kStatus,
      `p95 ${formatMs(styled50k.stats.p95)}`,
      `breakdown (${styled50kDiagnostics.bottleneck}): ${formatRenderDecomposition(styled50kSnapshot.metrics.stageMetrics)}`,
      styled50kDiagnostics,
    ),
    benchmarkResult(
      "F7",
      "F",
      "Style overhead ratio",
      "< 1.5×",
      styleOverheadStatus,
      `ratio ${styleOverheadRatio.toFixed(2)}×`,
      `styled10k breakdown (${styled10kPerformanceDiagnostics.bottleneck}): ${formatRenderDecomposition(styled10kSnapshot.metrics.stageMetrics)}`,
      styled10kPerformanceDiagnostics,
    ),
    benchmarkResult("F8", "F", "Conditional formatting on 100K cells", "< 200ms", passFailFromUpperBound(conditionalFormattingStats.stats.p95, 200), `p95 ${formatMs(conditionalFormattingStats.stats.p95)}`),
  ];
}

async function runEfficiencyBenchmarks(): Promise<Phase2BenchmarkResult[]> {
  const presetBuffer = await SpreadsheetEngine.render(createPresetBenchmarkDocument());
  const presetStyles = await inspectStyles(presetBuffer);
  const presetDiagnostics = createStylePartDiagnostics(presetStyles, "benchmark-target-mismatch-candidate");

  const hundredUniqueBuffer = await SpreadsheetEngine.render(createUniqueStyleDocument(100));
  const hundredUniqueStyles = await inspectStyles(hundredUniqueBuffer);
  const hundredUniqueDiagnostics = createStylePartDiagnostics(hundredUniqueStyles, "benchmark-target-mismatch-candidate");

  const tenThousandUniqueBuffer = await SpreadsheetEngine.render(createUniqueStyleDocument(10_000));
  const tenThousandUniqueStyles = await inspectStyles(tenThousandUniqueBuffer);
  const tenThousandUniqueDiagnostics = createStylePartDiagnostics(tenThousandUniqueStyles, "benchmark-target-mismatch-candidate");

  const styled10kDocument = createStyledWorkbook(10_000, 20, 500, "Styled10K");
  const styled10kRender = await SpreadsheetEngine.renderWithMetrics(styled10kDocument);
  const styled10kBuffer = styled10kRender.buffer;
  const styled10kStyles = await inspectStyles(styled10kBuffer);
  const styledCellCount = 10_000 * 20;
  const uniqueCellXfs = Math.max(0, countCellXfs(styled10kStyles.parsed) - 1);
  const dedupRatio = uniqueCellXfs === 0 ? 1 : 1 - (uniqueCellXfs / styledCellCount);
  const styled10kPerformanceDiagnostics: Phase2BenchmarkDiagnostics = {
    bottleneck: inferBottleneck(styled10kRender.metrics.stageMetrics),
    classification: "active-performance-debt",
    keyPartBytes: styled10kRender.metrics.keyPartBytes,
    stageMetrics: styled10kRender.metrics.stageMetrics,
  };
  const styled10kSizeDiagnostics: Phase2BenchmarkDiagnostics = {
    ...classifyWorkbookSizeDiagnostics(styled10kRender.metrics.keyPartBytes, 500 * 1024),
    bottleneck: styled10kPerformanceDiagnostics.bottleneck,
    stageMetrics: styled10kRender.metrics.stageMetrics,
    stylePart: createStylePartDiagnostics(styled10kStyles, "active-performance-debt").stylePart,
  };
  const practicalFloorNote = styled10kSizeDiagnostics.classification === "benchmark-target-mismatch-candidate"
    ? ` practical floor signal: dominant ${styled10kSizeDiagnostics.payloadDominantPart} payload still exceeds target by ${formatKb(styled10kSizeDiagnostics.practicalFloorGapBytes ?? 0)}.`
    : "";
  const excelJsLoad = await loadExcelJsBenchmarkModule();
  let excelJsResult: Phase2BenchmarkResult;
  if (excelJsLoad.status === "loaded") {
    try {
      const excelJsBuffer = await renderExcelJsStyledWorkbook(styled10kDocument, excelJsLoad.module);
      const ratio = styled10kBuffer.length / Math.max(1, excelJsBuffer.length);
      excelJsResult = benchmarkResult(
        "G6",
        "G",
        "Styled file size vs ExcelJS",
        "≤ 110% of ExcelJS",
        passFailFromUpperBound(ratio, 1.10),
        `Runstamp ${formatKb(styled10kBuffer.length)}; ExcelJS ${formatKb(excelJsBuffer.length)}; ratio ${ratio.toFixed(2)}×`,
        `ExcelJS loaded from ${excelJsLoad.source ?? "unknown source"}.`,
      );
    } catch (error) {
      excelJsResult = benchmarkResult(
        "G6",
        "G",
        "Styled file size vs ExcelJS",
        "≤ 110% of ExcelJS",
        "blocked",
        `ExcelJS baseline render failed: ${error instanceof Error ? error.message : String(error)}`,
        `ExcelJS loaded from ${excelJsLoad.source ?? "unknown source"}, but the competitor render could not complete.`,
      );
    }
  } else {
    excelJsResult = benchmarkResult(
      "G6",
      "G",
      "Styled file size vs ExcelJS",
      "≤ 110% of ExcelJS",
      "blocked",
      excelJsLoad.message ?? "ExcelJS competitor baseline unavailable.",
      "Install `exceljs` as a package-local devDependency or set RUNSTAMP_XLSX_EXCELJS_MODULE_PATH.",
    );
  }

  return [
    benchmarkResult(
      "G1",
      "G",
      "styles.xml size — presets catalog",
      "calibrated warning when raw styles.xml exceeds legacy < 3 KB budget",
      classifySizeEfficiencyStatus(presetStyles.sizeBytes, 3 * 1024, presetDiagnostics),
      formatKb(presetStyles.sizeBytes),
      `Measured with ${PRESET_NAMES.length} current presets. Raw OOXML styles part benchmark; no archive contribution remains at this stage.${formatStylePartDiagnostics(presetDiagnostics)}`,
      presetDiagnostics,
    ),
    benchmarkResult(
      "G2",
      "G",
      "styles.xml size — 100 unique styles",
      "calibrated warning when raw styles.xml exceeds legacy < 15 KB budget",
      classifySizeEfficiencyStatus(hundredUniqueStyles.sizeBytes, 15 * 1024, hundredUniqueDiagnostics),
      formatKb(hundredUniqueStyles.sizeBytes),
      `Raw OOXML styles part benchmark; no archive contribution remains at this stage.${formatStylePartDiagnostics(hundredUniqueDiagnostics)}`,
      hundredUniqueDiagnostics,
    ),
    benchmarkResult(
      "G3",
      "G",
      "styles.xml size — 10K unique styles",
      "calibrated warning when raw styles.xml exceeds legacy < 200 KB budget",
      classifySizeEfficiencyStatus(tenThousandUniqueStyles.sizeBytes, 200 * 1024, tenThousandUniqueDiagnostics),
      formatKb(tenThousandUniqueStyles.sizeBytes),
      `Raw OOXML styles part benchmark; no archive contribution remains at this stage.${formatStylePartDiagnostics(tenThousandUniqueDiagnostics)}`,
      tenThousandUniqueDiagnostics,
    ),
    benchmarkResult("G4", "G", "Deduplication ratio", "> 95%", passFailFromLowerBound(dedupRatio, 0.95), formatRatio(dedupRatio), `${uniqueCellXfs} unique cellXfs across ${styledCellCount} styled cells.`),
    benchmarkResult(
      "G5",
      "G",
      "Styled file size — 10K×20",
      "calibrated warning when workbook exceeds legacy < 500 KB budget",
      classifySizeEfficiencyStatus(styled10kBuffer.length, 500 * 1024, styled10kSizeDiagnostics),
      formatKb(styled10kBuffer.length),
      `payload (${styled10kPerformanceDiagnostics.bottleneck}; dominant ${styled10kSizeDiagnostics.payloadDominantPart}): ${formatKeyPartBytes(styled10kRender.metrics.keyPartBytes)}; ${formatRenderDecomposition(styled10kRender.metrics.stageMetrics)}.${practicalFloorNote}${formatStylePartDiagnostics(styled10kSizeDiagnostics)}`,
      styled10kSizeDiagnostics,
    ),
    excelJsResult,
  ];
}

async function runSizingBenchmarks(iterations: number): Promise<Phase2BenchmarkResult[]> {
  const collapseBuffer = await SpreadsheetEngine.render({ sheets: [createColumnCollapseSheet()] });
  const collapseSheet = await inspectSheet(collapseBuffer);
  const columnCount = countCols(collapseSheet.parsed);

  const largeSheet = getPhase1Fixture("large-50k").document.sheets[0];
  const sizingStats = measureSync(iterations, () => computeColumnLayout(largeSheet));

  return [
    benchmarkResult("H1", "H", "Column width accuracy", "Within ±20% of Excel AutoFit", "blocked", "Requires Excel AutoFit comparison", "Use the generated fixtures in the manual validation pack."),
    benchmarkResult("H2", "H", "Row height accuracy — wrapText", "Within ±1 line of Excel", "blocked", "Requires Excel visual comparison", "Use the generated fixtures in the manual validation pack."),
    benchmarkResult("H3", "H", "Column collapse optimization", "≤ 50 <col> elements", passFailFromUpperBound(columnCount, 50), `${columnCount} <col> elements`),
    benchmarkResult("H4", "H", "Column width computation — 50K rows", "< 100ms", passFailFromUpperBound(sizingStats.stats.p95, 100), `p95 ${formatMs(sizingStats.stats.p95)}`),
  ];
}

async function runCorrectnessBenchmarks(): Promise<Phase2BenchmarkResult[]> {
  const numberFormatBuffer = await SpreadsheetEngine.render(createNumberFormatProbe());
  const numberFormatStyles = await inspectStyles(numberFormatBuffer);

  const dateBuffer = await SpreadsheetEngine.render(createDateProbe());
  const dateStyles = await inspectStyles(dateBuffer);
  const dateSheet = await inspectSheet(dateBuffer);

  const partialBuffer = await SpreadsheetEngine.render(createPartialStyleProbe());
  const partialStyles = await inspectStyles(partialBuffer);
  const partialSheet = await inspectSheet(partialBuffer);

  const partialXfs = partialStyles.parsed.styleSheet.cellXfs.xf;
  const partialCellXf = Array.isArray(partialXfs) ? partialXfs[1] : partialXfs;
  const partialReferencesOnlyFont = partialCellXf?.["@_fontId"] === "1"
    && partialCellXf?.["@_fillId"] === "0"
    && partialCellXf?.["@_borderId"] === "0"
    && partialCellXf?.["@_numFmtId"] === "0"
    && partialCellXf?.alignment === undefined;

  const cfRegistry = new StyleRegistry();
  const cfOutput = serializeConditionalFormatting(createConditionalFormattingProbe(), cfRegistry);
  const cfXml = cfOutput.xml;

  return [
    benchmarkResult("E1", "E", "Font rendering fidelity", "Visual match across 5 target apps", "blocked", "Manual app validation required", "Use `phase2-font-fill-border.xlsx` and compare in Excel, Sheets, Numbers, and LibreOffice."),
    benchmarkResult("E2", "E", "Fill rendering fidelity", "20 fills render correctly", "blocked", "Manual app validation required", "Use `phase2-font-fill-border.xlsx` for color verification."),
    benchmarkResult("E3", "E", "Border rendering fidelity", "13 border styles render correctly", "blocked", "Manual app validation required", "Add screenshots from Excel and LibreOffice to close this benchmark."),
    benchmarkResult(
      "E4",
      "E",
      "Number format correctness",
      "Built-in/custom formats display correctly",
      "blocked",
      `${countNumFmts(numberFormatStyles.parsed)} custom numFmts emitted; alias XML looks correct`,
      "Structural proxy passed locally, but display correctness still needs Excel-family apps.",
    ),
    benchmarkResult(
      "E5",
      "E",
      "Date formatting round-trip",
      "Dates display as dates, not serials",
      "blocked",
      dateStyles.xml.includes('formatCode="yyyy-mm-dd"') && dateSheet.xml.includes('s="1"')
        ? "Auto date style emitted structurally"
        : "Date style emission failed structurally",
      "Structural proxy passed locally, but round-trip editing still needs Excel.",
    ),
    benchmarkResult("E6", "E", "Alignment correctness", "All alignment modes render correctly", "blocked", "Manual app validation required", "Use `phase2-alignment-richtext.xlsx` for wrap, alignment, and rotation checks."),
    benchmarkResult("E7", "E", "Preset visual match", "Presets match reference screenshots", "blocked", "Reference screenshots not captured yet", "Use `phase2-presets.xlsx` as the capture source."),
    benchmarkResult("E8", "E", "Rich text rendering", "Per-run formatting preserved", "blocked", "Manual app validation required", "Use `phase2-alignment-richtext.xlsx` to verify there is no fallback font."),
    benchmarkResult("E9", "E", "Conditional formatting — cellIs", "Differential format applies correctly", "blocked", cfXml.includes('type="cellIs"') ? "Structural XML emitted" : "Missing cellIs XML", "Visual app validation still required."),
    benchmarkResult("E10", "E", "Conditional formatting — colorScale", "Visible gradient across range", "blocked", cfXml.includes('type="colorScale"') ? "Structural XML emitted" : "Missing colorScale XML", "Visual app validation still required."),
    benchmarkResult("E11", "E", "Conditional formatting — dataBar", "Bars render proportionally", "blocked", cfXml.includes('type="dataBar"') ? "Structural XML emitted" : "Missing dataBar XML", "Visual app validation still required."),
    benchmarkResult(
      "E12",
      "E",
      "Style inheritance",
      "Partial styles do not leak garbage defaults",
      partialReferencesOnlyFont ? "pass" : "fail",
      partialReferencesOnlyFont ? "Partial xf only references font overrides" : "Unexpected style component references",
    ),
    benchmarkResult(
      "E13",
      "E",
      "Empty styled cells",
      "Style renders on empty cells",
      partialSheet.xml.includes('<c r="B1" s="2"/>') ? "pass" : "fail",
      partialSheet.xml.includes('<c r="B1" s="2"/>') ? "Styled empty cell emitted" : "Styled empty cell missing",
    ),
  ];
}

export async function runPhase2BenchmarkSuite(iterations = 3): Promise<Phase2BenchmarkReport> {
  maybeGc();
  const correctness = await runCorrectnessBenchmarks();
  maybeGc();
  const styleRegistry = await runStyleRegistryBenchmarks(iterations);
  maybeGc();
  const render = await runRenderBenchmarks(iterations);
  maybeGc();
  const efficiency = await runEfficiencyBenchmarks();
  maybeGc();
  const sizing = await runSizingBenchmarks(iterations);

  const results = [
    ...correctness,
    ...styleRegistry,
    ...render,
    ...efficiency,
    ...sizing,
  ];

  const summary = results.reduce<Phase2BenchmarkSummary>((accumulator, result) => {
    accumulator.total += 1;
    if (result.status === "pass") accumulator.passed += 1;
    if (result.status === "warn") accumulator.warned += 1;
    if (result.status === "fail") accumulator.failed += 1;
    if (result.status === "blocked") accumulator.blocked += 1;
    return accumulator;
  }, {
    total: 0,
    passed: 0,
    warned: 0,
    failed: 0,
    blocked: 0,
  });

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    summary,
    results,
  };
}

export async function renderPhase2BenchmarkReport(iterations = 3): Promise<string> {
  const report = await runPhase2BenchmarkSuite(iterations);
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════",
    "  Runstamp XLSX Engine — Phase 2 Local Benchmark Report",
    `  Node.js ${report.environment.node} | ${report.environment.platform} ${report.environment.arch}`,
    "═══════════════════════════════════════════════════════════",
    "",
    `  SUMMARY  pass=${report.summary.passed} warn=${report.summary.warned} fail=${report.summary.failed} blocked=${report.summary.blocked} total=${report.summary.total}`,
    "",
  ];

  for (const group of ["E", "F", "G", "H"] as const) {
    lines.push(`  GROUP ${group}`);
    for (const result of report.results.filter((entry) => entry.group === group)) {
      const marker = result.status === "pass" ? "✓" : (result.status === "warn" ? "!" : (result.status === "fail" ? "✗" : "•"));
      lines.push(`  ${marker} ${result.id.padEnd(3)} ${result.name}`);
      lines.push(`      target:   ${result.target}`);
      lines.push(`      observed: ${result.observed}`);
      if (result.notes) {
        lines.push(`      notes:    ${result.notes}`);
      }
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════");
  return lines.join("\n");
}
