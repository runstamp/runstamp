import type {
  CellValue,
  SpreadsheetBorderDiagonal,
  SpreadsheetBorderEdge,
  SpreadsheetCellStyle,
  SpreadsheetCellStyleInput,
  SpreadsheetFillStyle,
  SpreadsheetFontStyle,
} from "../types/spreadsheet-ast.js";
import { PRESETS } from "./presets.js";

const resolvedInlineStyleCache = new WeakMap<SpreadsheetCellStyle, SpreadsheetCellStyle>();
const resolvedInlineStyleValueCache = new Map<string, SpreadsheetCellStyle>();

function fontStyleKey(font: SpreadsheetFontStyle | undefined): string {
  if (!font) {
    return "";
  }
  return [
    font.family ?? "",
    font.size ?? "",
    font.bold ? 1 : 0,
    font.italic ? 1 : 0,
    font.underline === true ? "single" : (font.underline ?? ""),
    font.strikethrough ? 1 : 0,
    font.color ?? "",
    font.vertAlign ?? "",
    font.charset ?? "",
  ].join("|");
}

function fillStyleKey(fill: SpreadsheetFillStyle | undefined): string {
  if (!fill) {
    return "";
  }
  return [
    fill.type ?? "",
    fill.patternType ?? "",
    fill.color ?? "",
    fill.fgColor ?? "",
    fill.bgColor ?? "",
  ].join("|");
}

function borderEdgeKey(edge: SpreadsheetBorderEdge | undefined): string {
  if (!edge) {
    return "";
  }
  return `${edge.style ?? ""}:${edge.color ?? ""}`;
}

function borderDiagonalKey(diagonal: SpreadsheetBorderDiagonal | undefined): string {
  if (!diagonal) {
    return "";
  }
  return `${diagonal.style ?? ""}:${diagonal.color ?? ""}:${diagonal.direction ?? ""}`;
}

function borderStyleKey(border: SpreadsheetCellStyle["border"] | undefined): string {
  if (!border) {
    return "";
  }
  return [
    borderEdgeKey(border.left),
    borderEdgeKey(border.right),
    borderEdgeKey(border.top),
    borderEdgeKey(border.bottom),
    borderDiagonalKey(border.diagonal),
  ].join("|");
}

function alignmentStyleKey(alignment: SpreadsheetCellStyle["alignment"] | undefined): string {
  if (!alignment) {
    return "";
  }
  return [
    alignment.horizontal ?? "",
    alignment.vertical ?? "",
    alignment.wrapText ? 1 : 0,
    alignment.textRotation ?? "",
    alignment.indent ?? "",
    alignment.shrinkToFit ? 1 : 0,
    alignment.readingOrder ?? "",
  ].join("|");
}

function protectionStyleKey(protection: SpreadsheetCellStyle["protection"] | undefined): string {
  if (!protection) {
    return "";
  }
  return [
    protection.locked === undefined ? "" : (protection.locked ? 1 : 0),
    protection.hidden === undefined ? "" : (protection.hidden ? 1 : 0),
  ].join("|");
}

function inlineStyleKey(style: SpreadsheetCellStyle): string {
  return [
    style.numberFormat ?? "",
    fontStyleKey(style.font),
    fillStyleKey(style.fill),
    borderStyleKey(style.border),
    alignmentStyleKey(style.alignment),
    protectionStyleKey(style.protection),
  ].join("||");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge<T>(base: T | undefined, override: T | undefined): T | undefined {
  if (base === undefined) return override;
  if (override === undefined) return base;
  if (!isObject(base) || !isObject(override)) {
    return override;
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }
  return result as T;
}

export function resolveStyleInput(style: SpreadsheetCellStyleInput | undefined): SpreadsheetCellStyle | undefined {
  if (!style) {
    return undefined;
  }

  if (typeof style === "string") {
    return PRESETS[style as keyof typeof PRESETS] as SpreadsheetCellStyle | undefined;
  }

  const presetStyle = style.preset ? PRESETS[style.preset as keyof typeof PRESETS] as SpreadsheetCellStyle | undefined : undefined;
  const { preset: _preset, ...rest } = style;
  void _preset;
  return deepMerge(presetStyle, rest);
}

export function resolveNumberFormatAlias(numberFormat: string | undefined): string | undefined {
  if (!numberFormat) {
    return undefined;
  }

  const aliasMap: Record<string, string> = {
    currency: "$#,##0.00",
    "currency:EUR": "€#,##0.00",
    "currency:GBP": "£#,##0.00",
    "currency:KRW": "₩#,##0",
    "currency:JPY": "¥#,##0",
    percentage: "0.0%",
    "percentage:0": "0%",
    "percentage:2": "0.00%",
    date: "yyyy-mm-dd",
    "date:us": "m/d/yyyy",
    "date:eu": "d/m/yyyy",
    "date:kr": "yyyy년 m월 d일",
    datetime: "yyyy-mm-dd hh:mm",
    time: "h:mm:ss",
    accounting: "_($* #,##0.00_);_($* (#,##0.00);_($* \"-\"??_);_(@_)",
    "number:0": "#,##0",
    "number:2": "#,##0.00",
    scientific: "0.00E+00",
    text: "@",
  };

  return aliasMap[numberFormat] ?? numberFormat;
}

export function resolveCellStyle(
  style: SpreadsheetCellStyleInput | undefined,
  value: CellValue | undefined,
  sheetBaseStyle?: SpreadsheetCellStyleInput,
): SpreadsheetCellStyle | undefined {
  if (
    sheetBaseStyle === undefined &&
    style !== undefined &&
    typeof style !== "string" &&
    !style.preset &&
    !(value instanceof Date && !style.numberFormat)
  ) {
    if (!style.numberFormat) {
      return style;
    }

    const cached = resolvedInlineStyleCache.get(style);
    if (cached) {
      return cached;
    }
    const valueKey = inlineStyleKey(style);
    const cachedByValue = resolvedInlineStyleValueCache.get(valueKey);
    if (cachedByValue) {
      resolvedInlineStyleCache.set(style, cachedByValue);
      return cachedByValue;
    }

    const resolvedInline = {
      ...style,
      numberFormat: resolveNumberFormatAlias(style.numberFormat),
    };
    resolvedInlineStyleCache.set(style, resolvedInline);
    resolvedInlineStyleValueCache.set(valueKey, resolvedInline);
    return resolvedInline;
  }

  const baseStyle = resolveStyleInput(sheetBaseStyle);
  let resolved = deepMerge(baseStyle, resolveStyleInput(style));

  if (value instanceof Date && !resolved?.numberFormat) {
    resolved = deepMerge(resolved, { numberFormat: "date" });
  }

  if (resolved?.numberFormat) {
    resolved = {
      ...resolved,
      numberFormat: resolveNumberFormatAlias(resolved.numberFormat),
    };
  }

  return resolved;
}

export function normalizeFont(font: SpreadsheetFontStyle | undefined, defaults: { family: string; size: number }): Required<Pick<SpreadsheetFontStyle, "family" | "size">> & SpreadsheetFontStyle {
  return {
    family: font?.family ?? defaults.family,
    size: font?.size ?? defaults.size,
    bold: font?.bold,
    italic: font?.italic,
    underline: font?.underline,
    strikethrough: font?.strikethrough,
    color: font?.color,
    vertAlign: font?.vertAlign,
    charset: font?.charset,
  };
}

export function normalizeFill(fill: SpreadsheetFillStyle | undefined): SpreadsheetFillStyle | undefined {
  if (!fill) {
    return undefined;
  }

  if (fill.color) {
    return {
      type: "solid",
      fgColor: fill.color,
      bgColor: fill.bgColor,
      patternType: "solid",
    };
  }

  return {
    type: fill.type ?? "solid",
    fgColor: fill.fgColor,
    bgColor: fill.bgColor,
    patternType: fill.patternType ?? (fill.type === "pattern" ? "darkGray" : "solid"),
  };
}
