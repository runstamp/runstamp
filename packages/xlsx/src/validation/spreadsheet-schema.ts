import { z } from "zod";
import { SpreadsheetValidationError, zodIssueToSpreadsheetIssue } from "../errors.js";
import { preprocessSpreadsheetDocumentInput, type SpreadsheetRelaxedInputOptions } from "../relaxed-input.js";
import { PRESET_NAMES } from "../styles/presets.js";
import { getExplicitHyperlinkSheetName, normalizeHyperlink } from "../utils/hyperlinks.js";
import { extractSheetReferences, parseRangeRef } from "../utils/cell-ref.js";
import { MIN_EXCEL_SUPPORTED_DATE_UTC } from "../utils/date.js";
import { validateSheetStructure } from "../worksheet/structure.js";

const MAX_DRAWING_DIMENSION_PX = 4_096;
const MAX_DRAWING_OFFSET_PX = 4_096;
const MAX_DRAWING_COLUMN_INDEX = 16_383;
const MAX_DRAWING_ROW_INDEX = 1_048_575;

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, stableNormalize(entry)]));
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

const ThemeColorSchemeSchema = z.object({
  dk1: z.string().optional(),
  lt1: z.string().optional(),
  dk2: z.string().optional(),
  lt2: z.string().optional(),
  accent1: z.string().optional(),
  accent2: z.string().optional(),
  accent3: z.string().optional(),
  accent4: z.string().optional(),
  accent5: z.string().optional(),
  accent6: z.string().optional(),
  hlink: z.string().optional(),
  folHlink: z.string().optional(),
}).strict();

const ThemeFontSchemeSchema = z.object({
  majorLatin: z.string().optional(),
  minorLatin: z.string().optional(),
  majorEa: z.string().optional(),
  minorEa: z.string().optional(),
}).strict();

export const ThemeConfigSchema = z.object({
  name: z.string().optional(),
  colorScheme: ThemeColorSchemeSchema.optional(),
  fontScheme: ThemeFontSchemeSchema.optional(),
}).strict();

const AccessibilityConfigSchema = z.object({
  level: z.enum(["A", "AA", "AAA"]),
  language: z.string().optional(),
  title: z.string().optional(),
  autoAltText: z.boolean().optional(),
  enforceHeadingHierarchy: z.boolean().optional(),
  enforceTableHeaders: z.boolean().optional(),
}).strict();

export const SpreadsheetMetaSchema = z.object({
  title: z.string().optional(),
  language: z.string().optional(),
  creator: z.string().optional(),
  company: z.string().optional(),
  created: z.date().optional(),
  modified: z.date().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  keywords: z.array(z.string()).optional(),
}).strict();

const SpreadsheetCellDateSchema = z.date().superRefine((value, ctx) => {
  if (value.getTime() < MIN_EXCEL_SUPPORTED_DATE_UTC) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Spreadsheet dates must be on or after 1899-12-31",
      params: { spreadsheetCode: "DATE_OUT_OF_RANGE" },
    });
  }
});

export const SpreadsheetDefaultsSchema = z.object({
  font: z.object({
    family: z.string().min(1),
    size: z.number().positive(),
  }).strict().optional(),
  columnWidth: z.number().min(0).optional(),
  rowHeight: z.number().min(0).max(409).optional(),
}).strict();

export const SheetNameSchema = z
  .string()
  .min(1, "Sheet name cannot be empty")
  .max(31, "Sheet name cannot exceed 31 characters")
  .refine((name) => !/[[\]:*?/\\]/.test(name), {
    message: "Sheet name cannot contain [ ] : * ? / \\",
    params: { spreadsheetCode: "SHEET_NAME_INVALID_CHARS" },
  })
  .refine((name) => !name.startsWith("'") && !name.endsWith("'"), {
    message: "Sheet name cannot start or end with apostrophe",
    params: { spreadsheetCode: "SHEET_NAME_EDGE_APOSTROPHE" },
  });

const NumericCellValueSchema = z.union([z.number(), z.nan()]).superRefine((value, ctx) => {
  if (Number.isNaN(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "NaN is not a valid cell value",
      params: { spreadsheetCode: "CELL_VALUE_NAN" },
    });
    return;
  }

  if (!Number.isFinite(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Infinity is not a valid cell value",
      params: { spreadsheetCode: "CELL_VALUE_INFINITE" },
    });
  }
});

const SpreadsheetFontStyleSchema = z.object({
  family: z.string().optional(),
  size: z.number().positive().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.union([z.boolean(), z.enum(["single", "double", "singleAccounting", "doubleAccounting"])]).optional(),
  strikethrough: z.boolean().optional(),
  color: z.string().optional(),
  vertAlign: z.enum(["superscript", "subscript"]).optional(),
  charset: z.number().int().min(0).max(255).optional(),
}).strict();

const SpreadsheetFillStyleSchema = z.object({
  color: z.string().optional(),
  type: z.enum(["solid", "pattern"]).optional(),
  fgColor: z.string().optional(),
  bgColor: z.string().optional(),
  patternType: z.enum([
    "solid",
    "darkGray",
    "mediumGray",
    "lightGray",
    "gray125",
    "gray0625",
    "darkHorizontal",
    "darkVertical",
    "darkDown",
    "darkUp",
    "darkGrid",
    "darkTrellis",
    "lightHorizontal",
    "lightVertical",
    "lightDown",
    "lightUp",
    "lightGrid",
    "lightTrellis",
  ]).optional(),
}).strict();

const SpreadsheetBorderEdgeSchema = z.object({
  style: z.enum([
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
  ]),
  color: z.string().optional(),
}).strict();

const SpreadsheetBorderStyleSchema = z.object({
  top: SpreadsheetBorderEdgeSchema.optional(),
  bottom: SpreadsheetBorderEdgeSchema.optional(),
  left: SpreadsheetBorderEdgeSchema.optional(),
  right: SpreadsheetBorderEdgeSchema.optional(),
  diagonal: SpreadsheetBorderEdgeSchema.extend({
    direction: z.enum(["up", "down", "both"]).optional(),
  }).optional(),
}).strict();

const SpreadsheetAlignmentStyleSchema = z.object({
  horizontal: z.enum(["left", "center", "right", "fill", "justify", "centerContinuous", "distributed", "general"]).optional(),
  vertical: z.enum(["top", "center", "bottom", "justify", "distributed"]).optional(),
  wrapText: z.boolean().optional(),
  textRotation: z.number().int().min(0).max(255).optional(),
  indent: z.number().int().min(0).max(250).optional(),
  shrinkToFit: z.boolean().optional(),
  readingOrder: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
}).strict();

const SpreadsheetProtectionStyleSchema = z.object({
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
}).strict();

const SpreadsheetCellStyleObjectSchema: z.ZodType<any> = z.object({
  preset: z.string().refine((name) => PRESET_NAMES.includes(name), "Unknown preset").optional(),
  numberFormat: z.string().optional(),
  font: SpreadsheetFontStyleSchema.optional(),
  fill: SpreadsheetFillStyleSchema.optional(),
  border: SpreadsheetBorderStyleSchema.optional(),
  alignment: SpreadsheetAlignmentStyleSchema.optional(),
  protection: SpreadsheetProtectionStyleSchema.optional(),
}).strict();

export const SpreadsheetCellStyleSchema = z.union([
  z.string().refine((name) => PRESET_NAMES.includes(name), "Unknown preset"),
  SpreadsheetCellStyleObjectSchema,
]);

const SpreadsheetRichTextRunSchema = z.object({
  text: z.string(),
  font: SpreadsheetFontStyleSchema.optional(),
}).strict();

const SpreadsheetRichTextValueSchema = z.array(SpreadsheetRichTextRunSchema).min(1);
const SpreadsheetErrorValueSchema = z.object({
  error: z.enum([
    "#NULL!",
    "#DIV/0!",
    "#VALUE!",
    "#REF!",
    "#NAME?",
    "#NUM!",
    "#N/A",
    "#GETTING_DATA",
    "#SPILL!",
    "#CALC!",
    "#FIELD!",
    "#BLOCKED!",
    "#UNKNOWN!",
    "#CONNECT!",
  ]),
}).strict();

export const CellValueSchema = z.union([
  z.string(),
  NumericCellValueSchema,
  z.boolean(),
  SpreadsheetCellDateSchema,
  z.null(),
  SpreadsheetRichTextValueSchema,
  SpreadsheetErrorValueSchema,
]);

const SpreadsheetCellCommentSchema = z.object({
  author: z.string().optional(),
  text: z.string(),
}).strict();

const AbsoluteRangeRefSchema = z.string().regex(
  /^\$?[A-Z]+\$?[1-9]\d*(?::\$?[A-Z]+\$?[1-9]\d*)?$/,
  "Expected A1 range reference",
);

const SpreadsheetHyperlinkSchema = z.union([
  z.string().min(1),
  z.object({
    target: z.string().min(1),
    display: z.string().optional(),
    tooltip: z.string().optional(),
  }).strict(),
  z.object({
    location: z.string().min(1),
    display: z.string().optional(),
    tooltip: z.string().optional(),
  }).strict(),
]);

const SpreadsheetCellFormulaSchema = z.union([
  z.string().min(1),
  z.object({
    expression: z.string().min(1),
    cachedValue: CellValueSchema.optional(),
    arrayRange: AbsoluteRangeRefSchema.optional(),
    dynamic: z.boolean().optional(),
  }).strict(),
]);

const SpreadsheetDataValidationSchema = z.object({
  ref: AbsoluteRangeRefSchema,
  type: z.enum(["whole", "decimal", "list", "date", "time", "textLength", "custom"]),
  operator: z.enum([
    "between",
    "notBetween",
    "equal",
    "notEqual",
    "greaterThan",
    "lessThan",
    "greaterThanOrEqual",
    "lessThanOrEqual",
  ]).optional(),
  formula1: z.union([z.string().min(1), z.number(), z.array(z.string().min(1)).min(1)]),
  formula2: z.union([z.string().min(1), z.number()]).optional(),
  allowBlank: z.boolean().optional(),
  showDropDown: z.boolean().optional(),
  showInputMessage: z.boolean().optional(),
  promptTitle: z.string().optional(),
  prompt: z.string().optional(),
  showErrorMessage: z.boolean().optional(),
  errorTitle: z.string().optional(),
  error: z.string().optional(),
  errorStyle: z.enum(["stop", "warning", "information"]).optional(),
}).strict().superRefine((validation, ctx) => {
  const requiresOperator = validation.type !== "list" && validation.type !== "custom";
  const isRangeOperator = validation.operator === "between" || validation.operator === "notBetween";

  if (requiresOperator && !validation.operator) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Validation type ${validation.type} requires an operator`,
      params: { spreadsheetCode: "DATA_VALIDATION_INVALID" },
    });
  }

  if (isRangeOperator && !validation.formula2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Validation operator ${validation.operator} requires formula2`,
      path: ["formula2"],
      params: { spreadsheetCode: "DATA_VALIDATION_INVALID" },
    });
  }

  if (!isRangeOperator && validation.formula2 !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "formula2 is only valid with between/notBetween operators",
      path: ["formula2"],
      params: { spreadsheetCode: "DATA_VALIDATION_INVALID" },
    });
  }

  if (Array.isArray(validation.formula1) && validation.type !== "list") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "formula1 as string[] is only valid for type \"list\"",
      path: ["formula1"],
      params: { spreadsheetCode: "DATA_VALIDATION_INVALID" },
    });
  }

  if (Array.isArray(validation.formula1)) {
    const joined = `"${validation.formula1.join(",")}"`;
    if (joined.length > 255) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Inline list formula exceeds 255 characters (got ${joined.length})`,
        path: ["formula1"],
        params: { spreadsheetCode: "DATA_VALIDATION_INVALID" },
      });
    }
    const itemsWithCommas = validation.formula1.filter((item: string) => item.includes(","));
    if (itemsWithCommas.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `List items cannot contain commas: ${itemsWithCommas.map((i: string) => `"${i}"`).join(", ")}`,
        path: ["formula1"],
        params: { spreadsheetCode: "DATA_VALIDATION_INVALID" },
      });
    }
  }
});

const SpreadsheetPrintRangeSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
}).strict().superRefine((range, ctx) => {
  if (range.end < range.start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Print range end must be greater than or equal to start",
      params: { spreadsheetCode: "PRINT_SETUP_INVALID" },
    });
  }
});

const SpreadsheetPrintTitlesSchema = z.object({
  rows: SpreadsheetPrintRangeSchema.optional(),
  columns: SpreadsheetPrintRangeSchema.optional(),
}).strict().superRefine((titles, ctx) => {
  if (!titles.rows && !titles.columns) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Print titles must include rows and/or columns",
      params: { spreadsheetCode: "PRINT_SETUP_INVALID" },
    });
  }
});

const SpreadsheetPrintOptionsSchema = z.object({
  gridLines: z.boolean().optional(),
  headings: z.boolean().optional(),
}).strict();

const SpreadsheetPageMarginsSchema = z.object({
  left: z.number().min(0).optional(),
  right: z.number().min(0).optional(),
  top: z.number().min(0).optional(),
  bottom: z.number().min(0).optional(),
  header: z.number().min(0).optional(),
  footer: z.number().min(0).optional(),
}).strict();

const SpreadsheetPageSetupSchema = z.object({
  paperSize: z.number().int().positive().optional(),
  orientation: z.enum(["portrait", "landscape"]).optional(),
  scale: z.number().int().min(10).max(400).optional(),
  fitToWidth: z.number().int().min(0).max(32767).optional(),
  fitToHeight: z.number().int().min(0).max(32767).optional(),
  printArea: AbsoluteRangeRefSchema.optional(),
  printTitles: SpreadsheetPrintTitlesSchema.optional(),
  options: SpreadsheetPrintOptionsSchema.optional(),
  margins: SpreadsheetPageMarginsSchema.optional(),
}).strict();

const SpreadsheetCfvoSchema = z.object({
  type: z.enum(["min", "max", "num", "percent", "percentile", "formula"]),
  value: z.union([z.number(), z.string()]).optional(),
  color: z.string().optional(),
}).strict();

const ConditionalFormattingRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cellIs"),
    operator: z.enum(["between", "equal", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "notBetween", "notEqual"]),
    formula: z.union([z.string(), z.tuple([z.string(), z.string()])]),
    style: SpreadsheetCellStyleSchema,
  }).strict().refine(
    (rule) => {
      const isRange = rule.operator === "between" || rule.operator === "notBetween";
      const isTuple = Array.isArray(rule.formula);
      return isRange ? isTuple : !isTuple;
    },
    {
      message: "operator 'between'/'notBetween' requires a [lower, upper] tuple formula; other operators require a single formula string",
      path: ["formula"],
    },
  ),
  z.object({
    type: z.literal("colorScale"),
    scale: z.object({
      min: SpreadsheetCfvoSchema.extend({ color: z.string() }),
      mid: SpreadsheetCfvoSchema.extend({ color: z.string() }).optional(),
      max: SpreadsheetCfvoSchema.extend({ color: z.string() }),
    }).strict(),
  }).strict(),
  z.object({
    type: z.literal("dataBar"),
    color: z.string(),
    min: SpreadsheetCfvoSchema,
    max: SpreadsheetCfvoSchema,
    gradient: z.boolean().optional(),
    showValue: z.boolean().optional(),
    negativeColor: z.string().optional(),
    axisPosition: z.enum(["automatic", "middle", "none"]).optional(),
    direction: z.enum(["leftToRight", "rightToLeft"]).optional(),
  }).strict(),
  z.object({
    type: z.literal("top10"),
    rank: z.number().int().min(1).max(1000),
    percent: z.boolean().optional(),
    bottom: z.boolean().optional(),
    style: SpreadsheetCellStyleSchema,
  }).strict(),
  z.object({
    type: z.literal("duplicateValues"),
    style: SpreadsheetCellStyleSchema,
  }).strict(),
  z.object({
    type: z.literal("uniqueValues"),
    style: SpreadsheetCellStyleSchema,
  }).strict(),
  z.object({
    type: z.literal("iconSet"),
    iconSet: z.enum([
      "3Arrows", "3ArrowsGray", "3Flags",
      "3TrafficLights1", "3TrafficLights2", "3Signs",
      "3Symbols", "3Symbols2", "3Stars", "3Triangles", "3Smilies",
      "4Arrows", "4ArrowsGray", "4RedToBlack", "4Rating", "4TrafficLights",
      "5Arrows", "5ArrowsGray", "5Rating", "5Quarters",
    ]),
    showValue: z.boolean().optional(),
    reverse: z.boolean().optional(),
    thresholds: z.array(SpreadsheetCfvoSchema).optional(),
  }).strict().superRefine((data, ctx) => {
    if (data.thresholds !== undefined) {
      const iconCount = parseInt(data.iconSet[0], 10);
      if (data.thresholds.length !== iconCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Icon set "${data.iconSet}" requires exactly ${iconCount} thresholds, got ${data.thresholds.length}`,
          path: ["thresholds"],
        });
      }
    }
  }),
]);

export const SpreadsheetCellSchema = z.object({
  value: CellValueSchema.optional(),
  style: SpreadsheetCellStyleSchema.optional(),
  formula: SpreadsheetCellFormulaSchema.optional(),
  hyperlink: SpreadsheetHyperlinkSchema.optional(),
  comment: SpreadsheetCellCommentSchema.optional(),
  colSpan: z.number().int().min(1).optional(),
  rowSpan: z.number().int().min(1).optional(),
}).strict();

export const SpreadsheetRowSchema = z.object({
  height: z.number().min(0).max(409).optional(),
  hidden: z.boolean().optional(),
  cells: z.array(SpreadsheetCellSchema).max(16_384, "Rows cannot exceed 16,384 columns"),
}).strict();

export const SpreadsheetColumnSchema = z.object({
  width: z.number().min(0).optional(),
  hidden: z.boolean().optional(),
  bestFit: z.boolean().optional(),
}).strict();

const SpreadsheetSheetStylingSchema = z.object({
  headerRow: SpreadsheetCellStyleSchema.optional(),
  alternateRows: z.object({
    odd: SpreadsheetCellStyleSchema.optional(),
    even: SpreadsheetCellStyleSchema.optional(),
  }).strict().optional(),
}).strict();

const SpreadsheetFreezePaneSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
}).strict();

const SpreadsheetAutoFilterSchema = z.union([
  z.literal(true),
  z.object({
    ref: AbsoluteRangeRefSchema,
  }).strict(),
]);

const SpreadsheetConditionalFormattingSchema = z.object({
  ref: z.string().min(1),
  rules: z.array(ConditionalFormattingRuleSchema).min(1),
}).strict();

const SpreadsheetTableColumnSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  totalsRowLabel: z.string().min(1).max(255).optional(),
  totalsRowFunction: z.enum(["sum", "min", "max", "average", "count", "countNums", "stdDev", "var"]).optional(),
  totalsRowFormula: z.string().min(1).optional(),
}).strict();

const SpreadsheetTableStyleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  showFirstColumn: z.boolean().optional(),
  showLastColumn: z.boolean().optional(),
  showRowStripes: z.boolean().optional(),
  showColumnStripes: z.boolean().optional(),
}).strict();

const SpreadsheetImageAnchorPointSchema = z.object({
  col: z.number().int().min(0).max(
    MAX_DRAWING_COLUMN_INDEX,
    "Drawing anchor column must stay within Excel's 16,384-column limit",
  ),
  row: z.number().int().min(0).max(
    MAX_DRAWING_ROW_INDEX,
    "Drawing anchor row must stay within Excel's 1,048,576-row limit",
  ),
  colOffset: z.number().int().min(0).max(
    MAX_DRAWING_OFFSET_PX,
    `Drawing anchor offsets must be <= ${MAX_DRAWING_OFFSET_PX}px`,
  ).optional(),
  rowOffset: z.number().int().min(0).max(
    MAX_DRAWING_OFFSET_PX,
    `Drawing anchor offsets must be <= ${MAX_DRAWING_OFFSET_PX}px`,
  ).optional(),
}).strict();

const SpreadsheetImageAnchorSchema = z.object({
  from: SpreadsheetImageAnchorPointSchema,
  to: SpreadsheetImageAnchorPointSchema.optional(),
}).strict();

const SpreadsheetChartSeriesSchema = z.object({
  name: z.string().optional(),
  categories: z.string().optional(),
  values: z.string(),
}).strict();

const SpreadsheetChartStyleSchema = z.object({
  showLegend: z.boolean().optional(),
  showDataLabels: z.boolean().optional(),
}).strict();

const SpreadsheetChartSchema = z.object({
  type: z.enum(["bar", "col", "line", "pie", "scatter", "area", "doughnut", "radar", "bubble", "stock", "surface"]),
  title: z.string().optional(),
  series: z.array(SpreadsheetChartSeriesSchema).min(1).max(255),
  anchor: SpreadsheetImageAnchorSchema,
  width: z.number().int().positive().max(
    MAX_DRAWING_DIMENSION_PX,
    `Drawing dimensions must be <= ${MAX_DRAWING_DIMENSION_PX}px`,
  ).optional(),
  height: z.number().int().positive().max(
    MAX_DRAWING_DIMENSION_PX,
    `Drawing dimensions must be <= ${MAX_DRAWING_DIMENSION_PX}px`,
  ).optional(),
  style: SpreadsheetChartStyleSchema.optional(),
}).strict();

const SpreadsheetPivotSubtotalSchema = z.enum([
  "sum",
  "count",
  "average",
  "max",
  "min",
  "product",
  "countNums",
  "stdDev",
  "stdDevP",
  "var",
  "varP",
]);

const SpreadsheetPivotDimensionSchema = z.object({
  name: z.string().min(1),
  subtotals: z.union([
    z.literal(false),
    z.array(SpreadsheetPivotSubtotalSchema).min(1),
  ]).optional(),
}).strict();

const SpreadsheetPivotValueFieldSchema = z.object({
  name: z.string().min(1),
  summarizeBy: SpreadsheetPivotSubtotalSchema.optional(),
  title: z.string().min(1).optional(),
}).strict();

const SpreadsheetPivotCalculatedFieldSchema = z.object({
  name: z.string().min(1),
  formula: z.string().min(1),
}).strict();

const SpreadsheetPivotTableStyleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  showRowHeaders: z.boolean().optional(),
  showColumnHeaders: z.boolean().optional(),
  showRowStripes: z.boolean().optional(),
  showColumnStripes: z.boolean().optional(),
  showLastColumn: z.boolean().optional(),
}).strict();

const SpreadsheetPivotTableSchema = z.object({
  name: z.string().min(1).max(255),
  sourceSheet: SheetNameSchema,
  sourceRef: AbsoluteRangeRefSchema,
  targetCell: z.string().min(1),
  rowFields: z.array(z.union([z.string().min(1), SpreadsheetPivotDimensionSchema])).optional(),
  columnFields: z.array(z.union([z.string().min(1), SpreadsheetPivotDimensionSchema])).optional(),
  filterFields: z.array(z.string().min(1)).optional(),
  valueFields: z.array(SpreadsheetPivotValueFieldSchema).min(1),
  calculatedFields: z.array(SpreadsheetPivotCalculatedFieldSchema).optional(),
  valuesAxis: z.enum(["row", "column"]).optional(),
  showRowGrandTotals: z.boolean().optional(),
  showColumnGrandTotals: z.boolean().optional(),
  style: SpreadsheetPivotTableStyleSchema.optional(),
}).strict();

const SpreadsheetPivotChartSchema = z.object({
  pivotTable: z.string().min(1),
  type: z.enum(["bar", "col", "line", "pie", "scatter", "area", "doughnut", "radar", "bubble", "stock", "surface"]),
  title: z.string().optional(),
  anchor: SpreadsheetImageAnchorSchema,
  width: z.number().int().positive().max(
    MAX_DRAWING_DIMENSION_PX,
    `Drawing dimensions must be <= ${MAX_DRAWING_DIMENSION_PX}px`,
  ).optional(),
  height: z.number().int().positive().max(
    MAX_DRAWING_DIMENSION_PX,
    `Drawing dimensions must be <= ${MAX_DRAWING_DIMENSION_PX}px`,
  ).optional(),
  style: SpreadsheetChartStyleSchema.optional(),
}).strict();

const SpreadsheetImageSchema = z.object({
  data: z.instanceof(Buffer),
  type: z.enum(["png", "jpeg"]),
  anchor: SpreadsheetImageAnchorSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  width: z.number().int().positive().max(
    MAX_DRAWING_DIMENSION_PX,
    `Drawing dimensions must be <= ${MAX_DRAWING_DIMENSION_PX}px`,
  ).optional(),
  height: z.number().int().positive().max(
    MAX_DRAWING_DIMENSION_PX,
    `Drawing dimensions must be <= ${MAX_DRAWING_DIMENSION_PX}px`,
  ).optional(),
}).strict();

const SpreadsheetSheetProtectionSchema = z.object({
  password: z.string().optional(),
  sheet: z.boolean().optional(),
  objects: z.boolean().optional(),
  scenarios: z.boolean().optional(),
  formatCells: z.boolean().optional(),
  formatColumns: z.boolean().optional(),
  formatRows: z.boolean().optional(),
  insertColumns: z.boolean().optional(),
  insertRows: z.boolean().optional(),
  insertHyperlinks: z.boolean().optional(),
  deleteColumns: z.boolean().optional(),
  deleteRows: z.boolean().optional(),
  selectLockedCells: z.boolean().optional(),
  sort: z.boolean().optional(),
  autoFilter: z.boolean().optional(),
  pivotTables: z.boolean().optional(),
  selectUnlockedCells: z.boolean().optional(),
}).strict();

const SpreadsheetTableSchema = z.object({
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255).optional(),
  ref: AbsoluteRangeRefSchema,
  totalsRow: z.boolean().optional(),
  columns: z.array(SpreadsheetTableColumnSchema).min(1).optional(),
  style: SpreadsheetTableStyleSchema.optional(),
}).strict();

export const SpreadsheetSheetSchema = z.object({
  name: SheetNameSchema,
  columns: z.array(SpreadsheetColumnSchema).max(16_384, "Sheets cannot exceed 16,384 columns").optional(),
  rows: z.array(SpreadsheetRowSchema).max(1_048_576, "Sheets cannot exceed 1,048,576 rows"),
  mergedCells: z.array(AbsoluteRangeRefSchema).optional(),
  freezePane: SpreadsheetFreezePaneSchema.optional(),
  autoFilter: SpreadsheetAutoFilterSchema.optional(),
  dataValidations: z.array(SpreadsheetDataValidationSchema).optional(),
  pageSetup: SpreadsheetPageSetupSchema.optional(),
  state: z.enum(["visible", "hidden", "veryHidden"]).optional(),
  tabColor: z.string().optional(),
  rightToLeft: z.boolean().optional(),
  styling: SpreadsheetSheetStylingSchema.optional(),
  conditionalFormatting: z.array(SpreadsheetConditionalFormattingSchema).optional(),
  tables: z.array(SpreadsheetTableSchema).optional(),
  protection: SpreadsheetSheetProtectionSchema.optional(),
  images: z.array(SpreadsheetImageSchema).optional(),
  charts: z.array(SpreadsheetChartSchema).optional(),
  pivotTables: z.array(SpreadsheetPivotTableSchema).optional(),
  pivotCharts: z.array(SpreadsheetPivotChartSchema).optional(),
}).strict();

const SpreadsheetNamedRangeSchema = z.object({
  name: z.string().min(1).max(255),
  ref: z.string().min(1),
  scope: z.string().optional(),
}).strict();

export const SpreadsheetDocumentSchema = z.object({
  accessible: z.union([z.boolean(), AccessibilityConfigSchema]).optional(),
  meta: SpreadsheetMetaSchema.optional(),
  theme: ThemeConfigSchema.optional(),
  defaults: SpreadsheetDefaultsSchema.optional(),
  date1904: z.boolean().optional(),
  namedRanges: z.array(SpreadsheetNamedRangeSchema).optional(),
  sheets: z.array(SpreadsheetSheetSchema)
    .min(1, "Workbook must contain at least one sheet")
    .max(255, "Workbook cannot exceed 255 sheets")
    .refine((sheets) => {
      const normalized = sheets.map((sheet) => sheet.name.toLowerCase());
      return new Set(normalized).size === normalized.length;
    }, {
      message: "Sheet names must be unique (case-insensitive)",
      params: { spreadsheetCode: "SHEET_NAME_DUPLICATE" },
    }),
}).strict();

export type SpreadsheetDocumentInput = z.input<typeof SpreadsheetDocumentSchema>;
export type SpreadsheetDocumentParsed = z.output<typeof SpreadsheetDocumentSchema>;

function internDocumentStyles(document: SpreadsheetDocumentParsed): void {
  const styleCache = new Map<string, Exclude<typeof document.sheets[number]["rows"][number]["cells"][number]["style"], undefined>>();
  const internStyle = <T extends string | Record<string, unknown> | undefined>(style: T): T => {
    if (style === undefined || typeof style === "string") {
      return style;
    }
    const key = stableStringify(style);
    const cached = styleCache.get(key);
    if (cached) {
      return cached as T;
    }
    styleCache.set(key, style);
    return style;
  };

  for (const sheet of document.sheets) {
    if (sheet.styling) {
      sheet.styling.headerRow = internStyle(sheet.styling.headerRow);
      if (sheet.styling.alternateRows) {
        sheet.styling.alternateRows.odd = internStyle(sheet.styling.alternateRows.odd);
        sheet.styling.alternateRows.even = internStyle(sheet.styling.alternateRows.even);
      }
    }

    for (const conditionalFormatting of sheet.conditionalFormatting ?? []) {
      for (const rule of conditionalFormatting.rules) {
        if ("style" in rule) {
          rule.style = internStyle(rule.style);
        }
      }
    }

    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        cell.style = internStyle(cell.style);
      }
    }
  }
}

export function validateSpreadsheetDocument(
  input: unknown,
  options?: SpreadsheetRelaxedInputOptions,
): SpreadsheetDocumentParsed {
  const prepared = preprocessSpreadsheetDocumentInput(input, options);
  const result = SpreadsheetDocumentSchema.safeParse(prepared.value);
  if (!result.success) {
    throw new SpreadsheetValidationError(result.error.issues.map(zodIssueToSpreadsheetIssue));
  }

  const issues: Array<ReturnType<typeof zodIssueToSpreadsheetIssue>> = [];
  const document = result.data;
  internDocumentStyles(document);
  const visibleSheets = document.sheets.filter((sheet) => (sheet.state ?? "visible") === "visible");
  if (visibleSheets.length === 0) {
    issues.push({
      path: "sheets",
      code: "VALIDATION_FAILED",
      message: "Workbook must contain at least one visible sheet",
    });
  }

  document.sheets.forEach((sheet, sheetIndex) => {
    for (const issue of validateSheetStructure(sheet)) {
      issues.push({
        path: issue.path.reduce<string>((path, segment) => (
          typeof segment === "number"
            ? `${path}[${segment}]`
            : (path.length === 0 ? `sheets[${sheetIndex}].${segment}` : `${path}.${segment}`)
        ), ""),
        code: issue.code,
        message: issue.message,
      });
    }

    sheet.rows.forEach((row, rowIndex) => {
      row.cells.forEach((cell, cellIndex) => {
        if (!cell.hyperlink) {
          return;
        }

        const normalizedHyperlink = normalizeHyperlink(cell.hyperlink);
        if (normalizedHyperlink.mode !== "internal") {
          return;
        }

        const explicitSheetName = getExplicitHyperlinkSheetName(normalizedHyperlink.location);
        if (!explicitSheetName) {
          return;
        }

        const targetSheetExists = document.sheets.some((candidate) => candidate.name === explicitSheetName);
        if (!targetSheetExists) {
          issues.push({
            path: `sheets[${sheetIndex}].rows[${rowIndex}].cells[${cellIndex}].hyperlink`,
            code: "HYPERLINK_INVALID",
            message: `Hyperlink target sheet ${explicitSheetName} does not exist`,
          });
        }
      });
    });

    if (sheet.tables) {
      const effectiveColumnCount = Math.max(
        sheet.columns?.length ?? 0,
        ...sheet.rows.map((row) => row.cells.length),
      );
      const tableNamePattern = /^[A-Za-z_][A-Za-z0-9_.]*$/;
      const seenTableRects: Array<{ index: number; startRow: number; endRow: number; startCol: number; endCol: number }> = [];

      sheet.tables.forEach((table, tableIndex) => {
        if (!tableNamePattern.test(table.name)) {
          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].name`,
            code: "VALIDATION_FAILED",
            message: `Table name ${table.name} is invalid`,
          });
        }

        if (table.displayName && !tableNamePattern.test(table.displayName)) {
          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].displayName`,
            code: "VALIDATION_FAILED",
            message: `Table displayName ${table.displayName} is invalid`,
          });
        }

        const range = parseRangeRef(table.ref);
        const width = range.endCol - range.startCol + 1;
        const height = range.endRow - range.startRow + 1;

        if (range.endRow >= sheet.rows.length) {
          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].ref`,
            code: "VALIDATION_FAILED",
            message: `Table ${table.name} extends beyond populated sheet rows`,
          });
        }

        if (range.endCol >= effectiveColumnCount) {
          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].ref`,
            code: "VALIDATION_FAILED",
            message: `Table ${table.name} extends beyond populated sheet columns`,
          });
        }

        if (table.totalsRow && height < 2) {
          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].ref`,
            code: "VALIDATION_FAILED",
            message: `Table ${table.name} must span at least a header row and totals row when totalsRow is enabled`,
          });
        }

        if (table.columns && table.columns.length !== width) {
          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].columns`,
            code: "VALIDATION_FAILED",
            message: `Table ${table.name} expects exactly ${width} column definitions`,
          });
        }

        table.columns?.forEach((column, columnIndex) => {
          const hasTotalsMetadata = column.totalsRowLabel !== undefined
            || column.totalsRowFunction !== undefined
            || column.totalsRowFormula !== undefined;

          if (hasTotalsMetadata && !table.totalsRow) {
            issues.push({
              path: `sheets[${sheetIndex}].tables[${tableIndex}].columns[${columnIndex}]`,
              code: "VALIDATION_FAILED",
              message: `Table ${table.name} column totals metadata requires totalsRow: true`,
            });
          }

          if (column.totalsRowFunction && column.totalsRowFormula) {
            issues.push({
              path: `sheets[${sheetIndex}].tables[${tableIndex}].columns[${columnIndex}]`,
              code: "VALIDATION_FAILED",
              message: `Table ${table.name} column cannot define both totalsRowFunction and totalsRowFormula`,
            });
          }

          if (column.totalsRowLabel && (column.totalsRowFunction || column.totalsRowFormula)) {
            issues.push({
              path: `sheets[${sheetIndex}].tables[${tableIndex}].columns[${columnIndex}]`,
              code: "VALIDATION_FAILED",
              message: `Table ${table.name} column totalsRowLabel cannot be combined with totalsRowFunction or totalsRowFormula`,
            });
          }
        });

        for (const seen of seenTableRects) {
          const overlaps = !(range.endRow < seen.startRow
            || range.startRow > seen.endRow
            || range.endCol < seen.startCol
            || range.startCol > seen.endCol);

          if (!overlaps) {
            continue;
          }

          issues.push({
            path: `sheets[${sheetIndex}].tables[${tableIndex}].ref`,
            code: "VALIDATION_FAILED",
            message: `Table ${table.name} overlaps table ${sheet.tables?.[seen.index]?.name ?? seen.index + 1}`,
          });
        }

        seenTableRects.push({
          index: tableIndex,
          startRow: range.startRow,
          endRow: range.endRow,
          startCol: range.startCol,
          endCol: range.endCol,
        });
      });
    }

    const pivotTableNames = new Set<string>();
    const sourceSheetByName = new Map(document.sheets.map((candidate) => [candidate.name, candidate]));
    const sourceFieldNames = (pivotTable: NonNullable<typeof sheet.pivotTables>[number]): string[] => {
      const sourceSheet = sourceSheetByName.get(pivotTable.sourceSheet);
      if (!sourceSheet) {
        return [];
      }

      const range = parseRangeRef(pivotTable.sourceRef);
      const headerRow = sourceSheet.rows[range.startRow];
      const names: string[] = [];
      for (let column = range.startCol; column <= range.endCol; column += 1) {
        const value = headerRow?.cells[column]?.value;
        names.push(typeof value === "string" && value.trim().length > 0 ? value.trim() : `Column${column - range.startCol + 1}`);
      }
      return names;
    };
    const normalizePivotFieldName = (field: string | { name: string }) => typeof field === "string" ? field : field.name;

    sheet.pivotTables?.forEach((pivotTable, pivotIndex) => {
      const pivotPath = `sheets[${sheetIndex}].pivotTables[${pivotIndex}]`;
      const normalizedName = pivotTable.name.toLowerCase();
      if (pivotTableNames.has(normalizedName)) {
        issues.push({
          path: `${pivotPath}.name`,
          code: "VALIDATION_FAILED",
          message: `Pivot table name ${pivotTable.name} must be unique within sheet ${sheet.name}`,
        });
      }
      pivotTableNames.add(normalizedName);

      const sourceSheet = sourceSheetByName.get(pivotTable.sourceSheet);
      if (!sourceSheet) {
        issues.push({
          path: `${pivotPath}.sourceSheet`,
          code: "VALIDATION_FAILED",
          message: `Pivot table ${pivotTable.name} references missing source sheet ${pivotTable.sourceSheet}`,
        });
        return;
      }

      try {
        parseRangeRef(pivotTable.targetCell);
      } catch {
        issues.push({
          path: `${pivotPath}.targetCell`,
          code: "VALIDATION_FAILED",
          message: `Pivot table ${pivotTable.name} targetCell must be a valid cell reference`,
        });
      }

      const sourceRange = parseRangeRef(pivotTable.sourceRef);
      const sourceHeaderRow = sourceSheet.rows[sourceRange.startRow];
      const sourceWidth = sourceRange.endCol - sourceRange.startCol + 1;
      if (!sourceHeaderRow || sourceWidth < 1) {
        issues.push({
          path: `${pivotPath}.sourceRef`,
          code: "VALIDATION_FAILED",
          message: `Pivot table ${pivotTable.name} sourceRef must include a header row`,
        });
      }

      const availableFieldNames = new Set(sourceFieldNames(pivotTable));
      pivotTable.calculatedFields?.forEach((field) => availableFieldNames.add(field.name));

      const referencedFields = [
        ...(pivotTable.rowFields ?? []).map(normalizePivotFieldName),
        ...(pivotTable.columnFields ?? []).map(normalizePivotFieldName),
        ...(pivotTable.filterFields ?? []),
        ...pivotTable.valueFields.map((field) => field.name),
      ];

      referencedFields.forEach((fieldName, fieldIndex) => {
        if (!availableFieldNames.has(fieldName)) {
          issues.push({
            path: `${pivotPath}.fields[${fieldIndex}]`,
            code: "VALIDATION_FAILED",
            message: `Pivot table ${pivotTable.name} references unknown field ${fieldName}`,
          });
        }
      });
    });

    sheet.pivotCharts?.forEach((pivotChart, pivotChartIndex) => {
      const targetExists = document.sheets.some((candidate) => (
        candidate.pivotTables?.some((pivotTable) => pivotTable.name === pivotChart.pivotTable)
      ));
      if (!targetExists) {
        issues.push({
          path: `sheets[${sheetIndex}].pivotCharts[${pivotChartIndex}].pivotTable`,
          code: "VALIDATION_FAILED",
          message: `Pivot chart references missing pivot table ${pivotChart.pivotTable}`,
        });
      }
    });
  });

  const seenTableNames = new Set<string>();
  const seenTableDisplayNames = new Set<string>();
  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.tables?.forEach((table, tableIndex) => {
      const normalizedName = table.name.toLowerCase();
      if (seenTableNames.has(normalizedName)) {
        issues.push({
          path: `sheets[${sheetIndex}].tables[${tableIndex}].name`,
          code: "VALIDATION_FAILED",
          message: `Table name ${table.name} is duplicated in the workbook`,
        });
      }
      seenTableNames.add(normalizedName);

      const displayName = (table.displayName ?? table.name).toLowerCase();
      if (seenTableDisplayNames.has(displayName)) {
        issues.push({
          path: `sheets[${sheetIndex}].tables[${tableIndex}].displayName`,
          code: "VALIDATION_FAILED",
          message: `Table displayName ${table.displayName ?? table.name} is duplicated in the workbook`,
        });
      }
      seenTableDisplayNames.add(displayName);
    });
  });

  if (document.namedRanges) {
    const seen = new Set<string>();
    const normalizedSheetNames = new Map(document.sheets.map((sheet, index) => [sheet.name, index]));
    const cellRefPattern = /^\$?[A-Z]+\$?[1-9]\d*$/;
    const namePattern = /^[A-Za-z_\\][A-Za-z0-9_.\\]*$/;

    document.namedRanges.forEach((namedRange, index) => {
      if (!namePattern.test(namedRange.name) || cellRefPattern.test(namedRange.name)) {
        issues.push({
          path: `namedRanges[${index}].name`,
          code: "NAMED_RANGE_INVALID",
          message: `Named range ${namedRange.name} is invalid`,
        });
      }

      if (namedRange.scope && !normalizedSheetNames.has(namedRange.scope)) {
        issues.push({
          path: `namedRanges[${index}].scope`,
          code: "NAMED_RANGE_INVALID",
          message: `Named range scope ${namedRange.scope} does not match a sheet name`,
        });
      }

      const scopeKey = namedRange.scope ?? "__workbook__";
      const uniquenessKey = `${scopeKey.toLowerCase()}::${namedRange.name.toLowerCase()}`;
      if (seen.has(uniquenessKey)) {
        issues.push({
          path: `namedRanges[${index}].name`,
          code: "NAMED_RANGE_DUPLICATE",
          message: `Named range ${namedRange.name} is duplicated within its scope`,
        });
      }
      seen.add(uniquenessKey);

      const [sheetNamePart] = namedRange.ref.split("!");
      if (sheetNamePart && namedRange.ref.includes("!")) {
        const normalizedSheetName = sheetNamePart.startsWith("'") && sheetNamePart.endsWith("'")
          ? sheetNamePart.slice(1, -1).replaceAll("''", "'")
          : sheetNamePart;
        if (!normalizedSheetNames.has(normalizedSheetName)) {
          issues.push({
            path: `namedRanges[${index}].ref`,
            code: "NAMED_RANGE_INVALID",
            message: `Named range ${namedRange.name} references missing sheet ${normalizedSheetName}`,
          });
        }
      }

    });
  }

  // Cross-sheet formula reference validation
  const sheetNameSet = new Set(document.sheets.map((s) => s.name));

  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.rows.forEach((row, rowIndex) => {
      row.cells.forEach((cell, cellIndex) => {
        const formulaExpr = typeof cell.formula === "string"
          ? cell.formula
          : cell.formula?.expression;

        if (!formulaExpr) return;

        const referencedSheets = extractSheetReferences(formulaExpr);
        for (const refSheet of referencedSheets) {
          if (!sheetNameSet.has(refSheet)) {
            issues.push({
              path: `sheets[${sheetIndex}].rows[${rowIndex}].cells[${cellIndex}].formula`,
              code: "VALIDATION_FAILED",
              message: `Formula references non-existent sheet "${refSheet}"`,
            });
          }
        }
      });
    });

    // Check conditional formatting formulas
    sheet.conditionalFormatting?.forEach((cf, cfIndex) => {
      cf.rules.forEach((rule, ruleIndex) => {
        const formula = "formula" in rule ? rule.formula : undefined;
        if (typeof formula === "string") {
          const referencedSheets = extractSheetReferences(formula);
          for (const refSheet of referencedSheets) {
            if (!sheetNameSet.has(refSheet)) {
              issues.push({
                path: `sheets[${sheetIndex}].conditionalFormatting[${cfIndex}].rules[${ruleIndex}].formula`,
                code: "VALIDATION_FAILED",
                message: `Conditional formatting formula references non-existent sheet "${refSheet}"`,
              });
            }
          }
        }
      });
    });
  });

  if (issues.length > 0) {
    throw new SpreadsheetValidationError(issues);
  }

  return document;
}
