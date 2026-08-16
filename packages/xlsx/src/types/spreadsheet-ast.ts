export interface SpreadsheetMeta {
  title?: string;
  language?: string;
  creator?: string;
  company?: string;
  created?: Date;
  modified?: Date;
  description?: string;
  category?: string;
  keywords?: string[];
}

export interface ThemeColorScheme {
  dk1?: string;
  lt1?: string;
  dk2?: string;
  lt2?: string;
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
  accent5?: string;
  accent6?: string;
  hlink?: string;
  folHlink?: string;
}

export interface ThemeFontScheme {
  majorLatin?: string;
  minorLatin?: string;
  majorEa?: string;
  minorEa?: string;
}

export interface ThemeConfig {
  name?: string;
  colorScheme?: ThemeColorScheme;
  fontScheme?: ThemeFontScheme;
}

export type AccessibilityLevel = "A" | "AA" | "AAA";

export interface AccessibilityConfigBase {
  title?: string;
  language?: string;
}

export interface AccessibilityConfig extends AccessibilityConfigBase {
  level: AccessibilityLevel;
  autoAltText?: boolean;
  enforceHeadingHierarchy?: boolean;
  enforceTableHeaders?: boolean;
}

export interface SpreadsheetDefaults {
  font?: {
    family: string;
    size: number;
  };
  columnWidth?: number;
  rowHeight?: number;
}

export interface SpreadsheetFontStyle {
  family?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean | "single" | "double" | "singleAccounting" | "doubleAccounting";
  strikethrough?: boolean;
  color?: string;
  vertAlign?: "superscript" | "subscript";
  charset?: number;
}

export type SpreadsheetPatternType =
  | "none"
  | "solid"
  | "darkGray"
  | "mediumGray"
  | "lightGray"
  | "gray125"
  | "gray0625"
  | "darkHorizontal"
  | "darkVertical"
  | "darkDown"
  | "darkUp"
  | "darkGrid"
  | "darkTrellis"
  | "lightHorizontal"
  | "lightVertical"
  | "lightDown"
  | "lightUp"
  | "lightGrid"
  | "lightTrellis";

export interface SpreadsheetFillStyle {
  color?: string;
  type?: "solid" | "pattern";
  fgColor?: string;
  bgColor?: string;
  patternType?: SpreadsheetPatternType;
}

export type SpreadsheetBorderLineStyle =
  | "thin"
  | "medium"
  | "thick"
  | "double"
  | "dotted"
  | "dashed"
  | "dashDot"
  | "dashDotDot"
  | "hair"
  | "mediumDashed"
  | "mediumDashDot"
  | "mediumDashDotDot"
  | "slantDashDot";

export interface SpreadsheetBorderEdge {
  style: SpreadsheetBorderLineStyle;
  color?: string;
}

export interface SpreadsheetBorderDiagonal extends SpreadsheetBorderEdge {
  direction?: "up" | "down" | "both";
}

export interface SpreadsheetBorderStyle {
  top?: SpreadsheetBorderEdge;
  bottom?: SpreadsheetBorderEdge;
  left?: SpreadsheetBorderEdge;
  right?: SpreadsheetBorderEdge;
  diagonal?: SpreadsheetBorderDiagonal;
}

export interface SpreadsheetAlignmentStyle {
  horizontal?:
    | "left"
    | "center"
    | "right"
    | "fill"
    | "justify"
    | "centerContinuous"
    | "distributed"
    | "general";
  vertical?: "top" | "center" | "bottom" | "justify" | "distributed";
  wrapText?: boolean;
  textRotation?: number;
  indent?: number;
  shrinkToFit?: boolean;
  readingOrder?: 0 | 1 | 2;
}

export interface SpreadsheetProtectionStyle {
  locked?: boolean;
  hidden?: boolean;
}

export interface SpreadsheetCellStyle {
  preset?: string;
  numberFormat?: string;
  font?: SpreadsheetFontStyle;
  fill?: SpreadsheetFillStyle;
  border?: SpreadsheetBorderStyle;
  alignment?: SpreadsheetAlignmentStyle;
  protection?: SpreadsheetProtectionStyle;
}

export type SpreadsheetCellStyleInput = string | SpreadsheetCellStyle;

export interface SpreadsheetRichTextRun {
  text: string;
  font?: SpreadsheetFontStyle;
}

export type SpreadsheetRichTextValue = SpreadsheetRichTextRun[];
export type SpreadsheetErrorCode =
  | "#NULL!"
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#NUM!"
  | "#N/A"
  | "#GETTING_DATA"
  | "#SPILL!"
  | "#CALC!"
  | "#FIELD!"
  | "#BLOCKED!"
  | "#UNKNOWN!"
  | "#CONNECT!";

export interface SpreadsheetErrorValue {
  error: SpreadsheetErrorCode;
}

export type CellValue = string | number | boolean | Date | null | SpreadsheetRichTextValue | SpreadsheetErrorValue;

export interface SpreadsheetCellComment {
  author?: string;
  text: string;
}

export interface SpreadsheetCellFormula {
  expression: string;
  cachedValue?: CellValue;
  arrayRange?: string;
  dynamic?: boolean;
}

export type SpreadsheetCellFormulaInput = string | SpreadsheetCellFormula;

export interface SpreadsheetExternalHyperlink {
  target: string;
  display?: string;
  tooltip?: string;
}

export interface SpreadsheetInternalHyperlink {
  location: string;
  display?: string;
  tooltip?: string;
}

export type SpreadsheetHyperlink = string | SpreadsheetExternalHyperlink | SpreadsheetInternalHyperlink;

export interface SpreadsheetCell {
  value?: CellValue;
  style?: SpreadsheetCellStyleInput;
  formula?: SpreadsheetCellFormulaInput;
  hyperlink?: SpreadsheetHyperlink;
  comment?: SpreadsheetCellComment;
  colSpan?: number;
  rowSpan?: number;
}

export interface SpreadsheetColumn {
  width?: number;
  hidden?: boolean;
  bestFit?: boolean;
}

export interface SpreadsheetRow {
  height?: number;
  hidden?: boolean;
  cells: SpreadsheetCell[];
}

export interface SpreadsheetFreezePane {
  row: number;
  col: number;
}

export interface SpreadsheetAutoFilterConfig {
  ref: string;
}

export interface SpreadsheetNamedRange {
  name: string;
  ref: string;
  scope?: string;
}

export interface SpreadsheetPrintRange {
  start: number;
  end: number;
}

export interface SpreadsheetPrintTitles {
  rows?: SpreadsheetPrintRange;
  columns?: SpreadsheetPrintRange;
}

export interface SpreadsheetPrintOptions {
  gridLines?: boolean;
  headings?: boolean;
}

export interface SpreadsheetPageMargins {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  header?: number;
  footer?: number;
}

export interface SpreadsheetPageSetup {
  paperSize?: number;
  orientation?: "portrait" | "landscape";
  scale?: number;
  fitToWidth?: number;
  fitToHeight?: number;
  printArea?: string;
  printTitles?: SpreadsheetPrintTitles;
  options?: SpreadsheetPrintOptions;
  margins?: SpreadsheetPageMargins;
}

export type SpreadsheetDataValidationType =
  | "whole"
  | "decimal"
  | "list"
  | "date"
  | "time"
  | "textLength"
  | "custom";

export type SpreadsheetDataValidationOperator =
  | "between"
  | "notBetween"
  | "equal"
  | "notEqual"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

export type SpreadsheetDataValidationErrorStyle = "stop" | "warning" | "information";

export interface SpreadsheetDataValidation {
  ref: string;
  type: SpreadsheetDataValidationType;
  operator?: SpreadsheetDataValidationOperator;
  formula1: string | number | string[];
  formula2?: string | number;
  allowBlank?: boolean;
  showDropDown?: boolean;
  showInputMessage?: boolean;
  promptTitle?: string;
  prompt?: string;
  showErrorMessage?: boolean;
  errorTitle?: string;
  error?: string;
  errorStyle?: SpreadsheetDataValidationErrorStyle;
}

export interface SpreadsheetSheetStyling {
  headerRow?: SpreadsheetCellStyleInput;
  alternateRows?: {
    odd?: SpreadsheetCellStyleInput;
    even?: SpreadsheetCellStyleInput;
  };
}

export interface SpreadsheetCfvo {
  type: "min" | "max" | "num" | "percent" | "percentile" | "formula";
  value?: number | string;
  color?: string;
}

export type SpreadsheetIconSetType =
  | "3Arrows" | "3ArrowsGray" | "3Flags"
  | "3TrafficLights1" | "3TrafficLights2" | "3Signs"
  | "3Symbols" | "3Symbols2" | "3Stars" | "3Triangles" | "3Smilies"
  | "4Arrows" | "4ArrowsGray" | "4RedToBlack" | "4Rating" | "4TrafficLights"
  | "5Arrows" | "5ArrowsGray" | "5Rating" | "5Quarters";

export interface SpreadsheetConditionalFormattingCellIsRule {
  type: "cellIs";
  operator:
    | "between"
    | "equal"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual"
    | "notBetween"
    | "notEqual";
  /**
   * Single formula for unary operators; `[lower, upper]` tuple for
   * `between` / `notBetween`. Excel rejects single-formula `between` rules.
   */
  formula: string | [string, string];
  style: SpreadsheetCellStyleInput;
}

export interface SpreadsheetConditionalFormattingColorScaleRule {
  type: "colorScale";
  scale: {
    min: SpreadsheetCfvo & { color: string };
    mid?: SpreadsheetCfvo & { color: string };
    max: SpreadsheetCfvo & { color: string };
  };
}

export interface SpreadsheetConditionalFormattingDataBarRule {
  type: "dataBar";
  color: string;
  min: SpreadsheetCfvo;
  max: SpreadsheetCfvo;
  gradient?: boolean;
  showValue?: boolean;
  negativeColor?: string;
  axisPosition?: "automatic" | "middle" | "none";
  direction?: "leftToRight" | "rightToLeft";
}

export interface SpreadsheetConditionalFormattingIconSetRule {
  type: "iconSet";
  iconSet: SpreadsheetIconSetType;
  showValue?: boolean;
  reverse?: boolean;
  thresholds?: SpreadsheetCfvo[];
}

export interface SpreadsheetConditionalFormattingTop10Rule {
  type: "top10";
  rank: number;
  percent?: boolean;
  bottom?: boolean;
  style: SpreadsheetCellStyleInput;
}

export interface SpreadsheetConditionalFormattingDuplicateRule {
  type: "duplicateValues" | "uniqueValues";
  style: SpreadsheetCellStyleInput;
}

export type SpreadsheetConditionalFormattingRule =
  | SpreadsheetConditionalFormattingCellIsRule
  | SpreadsheetConditionalFormattingColorScaleRule
  | SpreadsheetConditionalFormattingDataBarRule
  | SpreadsheetConditionalFormattingIconSetRule
  | SpreadsheetConditionalFormattingTop10Rule
  | SpreadsheetConditionalFormattingDuplicateRule;

export interface SpreadsheetConditionalFormatting {
  ref: string;
  rules: SpreadsheetConditionalFormattingRule[];
}

export type SpreadsheetTableTotalsRowFunction =
  | "sum"
  | "min"
  | "max"
  | "average"
  | "count"
  | "countNums"
  | "stdDev"
  | "var";

export interface SpreadsheetTableColumn {
  name?: string;
  totalsRowLabel?: string;
  totalsRowFunction?: SpreadsheetTableTotalsRowFunction;
  totalsRowFormula?: string;
}

export interface SpreadsheetTableStyle {
  name?: string;
  showFirstColumn?: boolean;
  showLastColumn?: boolean;
  showRowStripes?: boolean;
  showColumnStripes?: boolean;
}

export interface SpreadsheetTable {
  name: string;
  displayName?: string;
  ref: string;
  totalsRow?: boolean;
  columns?: SpreadsheetTableColumn[];
  style?: SpreadsheetTableStyle;
}

export interface SpreadsheetSheetProtection {
  password?: string;
  sheet?: boolean;
  objects?: boolean;
  scenarios?: boolean;
  formatCells?: boolean;
  formatColumns?: boolean;
  formatRows?: boolean;
  insertColumns?: boolean;
  insertRows?: boolean;
  insertHyperlinks?: boolean;
  deleteColumns?: boolean;
  deleteRows?: boolean;
  selectLockedCells?: boolean;
  sort?: boolean;
  autoFilter?: boolean;
  pivotTables?: boolean;
  selectUnlockedCells?: boolean;
}

export interface SpreadsheetImageAnchor {
  from: { col: number; row: number; colOffset?: number; rowOffset?: number };
  to?: { col: number; row: number; colOffset?: number; rowOffset?: number };
}

export interface SpreadsheetImage {
  data: Buffer;
  type: "png" | "jpeg";
  anchor: SpreadsheetImageAnchor;
  name?: string;
  description?: string;
  width?: number;   // pixels (converted to EMU internally: 1px = 9525 EMU)
  height?: number;  // pixels
}

/**
 * Free tier chart types (must beat ExcelJS): bar, col, line, pie, scatter.
 * Pro tier adds: area, doughnut, radar, bubble, stock, surface.
 */
/**
 * @deprecated Every chart type renders in the published package; this list no
 * longer marks a boundary. Retained for the §9.5 deprecation window.
 */
export const FREE_XLSX_CHART_TYPES = ["bar", "col", "line", "pie", "scatter"] as const;
export type FreeXlsxChartType = (typeof FREE_XLSX_CHART_TYPES)[number];
export type ProXlsxChartType = "area" | "doughnut" | "radar" | "bubble" | "stock" | "surface";
export type SpreadsheetChartType = FreeXlsxChartType | ProXlsxChartType;

export interface SpreadsheetChartSeries {
  name?: string;              // Series label
  categories?: string;        // Cell range for X-axis labels, e.g., "Sheet1!$A$2:$A$10"
  values: string;             // Cell range for Y-axis values, e.g., "Sheet1!$B$2:$B$10"
}

export interface SpreadsheetChart {
  type: SpreadsheetChartType;
  title?: string;
  series: SpreadsheetChartSeries[];
  anchor: SpreadsheetImageAnchor;   // Reuse existing anchor type
  width?: number;                    // pixels, default 480
  height?: number;                   // pixels, default 300
  style?: {
    showLegend?: boolean;
    showDataLabels?: boolean;
  };
}

export type SpreadsheetPivotSubtotal =
  | "sum"
  | "count"
  | "average"
  | "max"
  | "min"
  | "product"
  | "countNums"
  | "stdDev"
  | "stdDevP"
  | "var"
  | "varP";

export interface SpreadsheetPivotDimension {
  name: string;
  subtotals?: false | SpreadsheetPivotSubtotal[];
}

export interface SpreadsheetPivotValueField {
  name: string;
  summarizeBy?: SpreadsheetPivotSubtotal;
  title?: string;
}

export interface SpreadsheetPivotCalculatedField {
  name: string;
  formula: string;
}

export interface SpreadsheetPivotTableStyle {
  name?: string;
  showRowHeaders?: boolean;
  showColumnHeaders?: boolean;
  showRowStripes?: boolean;
  showColumnStripes?: boolean;
  showLastColumn?: boolean;
}

export interface SpreadsheetPivotTable {
  name: string;
  sourceSheet: string;
  sourceRef: string;
  targetCell: string;
  rowFields?: Array<string | SpreadsheetPivotDimension>;
  columnFields?: Array<string | SpreadsheetPivotDimension>;
  filterFields?: string[];
  valueFields: SpreadsheetPivotValueField[];
  calculatedFields?: SpreadsheetPivotCalculatedField[];
  valuesAxis?: "row" | "column";
  showRowGrandTotals?: boolean;
  showColumnGrandTotals?: boolean;
  style?: SpreadsheetPivotTableStyle;
}

export interface SpreadsheetPivotChart {
  pivotTable: string;
  type: SpreadsheetChartType;
  title?: string;
  anchor: SpreadsheetImageAnchor;
  width?: number;
  height?: number;
  style?: {
    showLegend?: boolean;
    showDataLabels?: boolean;
  };
}

export interface SpreadsheetSheet {
  name: string;
  columns?: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  mergedCells?: string[];
  freezePane?: SpreadsheetFreezePane;
  autoFilter?: boolean | SpreadsheetAutoFilterConfig;
  dataValidations?: SpreadsheetDataValidation[];
  pageSetup?: SpreadsheetPageSetup;
  state?: "visible" | "hidden" | "veryHidden";
  tabColor?: string;
  rightToLeft?: boolean;
  styling?: SpreadsheetSheetStyling;
  conditionalFormatting?: SpreadsheetConditionalFormatting[];
  tables?: SpreadsheetTable[];
  protection?: SpreadsheetSheetProtection;
  images?: SpreadsheetImage[];
  charts?: SpreadsheetChart[];
  pivotTables?: SpreadsheetPivotTable[];
  pivotCharts?: SpreadsheetPivotChart[];
}

export interface SpreadsheetDocument {
  meta?: SpreadsheetMeta;
  accessible?: boolean | AccessibilityConfig;
  theme?: ThemeConfig;
  defaults?: SpreadsheetDefaults;
  date1904?: boolean;
  namedRanges?: SpreadsheetNamedRange[];
  sheets: SpreadsheetSheet[];
}

export interface SpreadsheetRenderOptions {
  deterministic?: boolean;
  largeDataset?: boolean;
  /** Explicit signed license. Takes precedence over RUNSTAMP_LICENSE_KEY. */
  licenseKey?: string;
  onInputWarning?: (warning: import("../relaxed-input.js").SpreadsheetInputWarning) => void;
  relaxed?: boolean;
  rowChunkSize?: number;
  stringStrategy?: "auto" | "sharedStrings" | "inlineStrings";
  warmPath?: boolean;
}

export function isRichTextValue(value: CellValue | undefined): value is SpreadsheetRichTextValue {
  return Array.isArray(value);
}

export function isErrorValue(value: CellValue | undefined): value is SpreadsheetErrorValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "error" in value;
}
