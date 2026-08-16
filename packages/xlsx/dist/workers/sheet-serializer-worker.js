// src/workers/sheet-serializer-worker.ts
import { parentPort } from "node:worker_threads";

// src/types/spreadsheet-ast.ts
function isRichTextValue(value) {
  return Array.isArray(value);
}
function isErrorValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "error" in value;
}

// src/styles/presets.ts
var PRESETS = {
  header: {
    font: { bold: true, color: "#FFFFFF", size: 11, family: "Calibri" },
    fill: { color: "#4472C4" },
    border: { bottom: { style: "medium", color: "#2F5597" } },
    alignment: { horizontal: "center", vertical: "center" }
  },
  headerDark: {
    font: { bold: true, color: "#FFFFFF", size: 11 },
    fill: { color: "#1F3864" },
    border: { bottom: { style: "medium", color: "#0D2240" } },
    alignment: { horizontal: "center", vertical: "center" }
  },
  headerGreen: {
    font: { bold: true, color: "#FFFFFF", size: 11 },
    fill: { color: "#548235" },
    border: { bottom: { style: "medium", color: "#375623" } },
    alignment: { horizontal: "center", vertical: "center" }
  },
  subheader: {
    font: { bold: true, size: 10, color: "#1F3864" },
    fill: { color: "#D6E4F0" },
    border: { bottom: { style: "thin", color: "#9DC3E6" } }
  },
  total: {
    font: { bold: true },
    border: {
      top: { style: "thin", color: "#333333" },
      bottom: { style: "double", color: "#333333" }
    },
    numberFormat: "#,##0.00"
  },
  subtotal: {
    font: { bold: true, color: "#44546A" },
    border: { top: { style: "thin", color: "#D9D9D9" } },
    numberFormat: "#,##0.00"
  },
  currency: { alignment: { horizontal: "right" }, numberFormat: "$#,##0.00" },
  currencyKRW: { alignment: { horizontal: "right" }, numberFormat: "\u20A9#,##0" },
  currencyEUR: { alignment: { horizontal: "right" }, numberFormat: "\u20AC#,##0.00" },
  percentage: { alignment: { horizontal: "right" }, numberFormat: "0.0%" },
  percentageChange: {
    alignment: { horizontal: "right" },
    numberFormat: "+0.0%;-0.0%;0.0%"
  },
  integer: { alignment: { horizontal: "right" }, numberFormat: "#,##0" },
  decimal2: { alignment: { horizontal: "right" }, numberFormat: "#,##0.00" },
  date: { numberFormat: "yyyy-mm-dd" },
  datetime: { numberFormat: "yyyy-mm-dd hh:mm" },
  warning: { font: { color: "#9C5700" }, fill: { color: "#FFEB9C" } },
  error: { font: { color: "#9C0006" }, fill: { color: "#FFC7CE" } },
  success: { font: { color: "#006100" }, fill: { color: "#C6EFCE" } },
  neutral: { font: { color: "#44546A" }, fill: { color: "#F2F2F2" } }
};
var PRESET_NAMES = Object.keys(PRESETS);

// src/styles/style-utils.ts
var resolvedInlineStyleCache = /* @__PURE__ */ new WeakMap();
var resolvedInlineStyleValueCache = /* @__PURE__ */ new Map();
function fontStyleKey(font) {
  if (!font) {
    return "";
  }
  return [
    font.family ?? "",
    font.size ?? "",
    font.bold ? 1 : 0,
    font.italic ? 1 : 0,
    font.underline === true ? "single" : font.underline ?? "",
    font.strikethrough ? 1 : 0,
    font.color ?? "",
    font.vertAlign ?? "",
    font.charset ?? ""
  ].join("|");
}
function fillStyleKey(fill) {
  if (!fill) {
    return "";
  }
  return [
    fill.type ?? "",
    fill.patternType ?? "",
    fill.color ?? "",
    fill.fgColor ?? "",
    fill.bgColor ?? ""
  ].join("|");
}
function borderEdgeKey(edge) {
  if (!edge) {
    return "";
  }
  return `${edge.style ?? ""}:${edge.color ?? ""}`;
}
function borderDiagonalKey(diagonal) {
  if (!diagonal) {
    return "";
  }
  return `${diagonal.style ?? ""}:${diagonal.color ?? ""}:${diagonal.direction ?? ""}`;
}
function borderStyleKey(border) {
  if (!border) {
    return "";
  }
  return [
    borderEdgeKey(border.left),
    borderEdgeKey(border.right),
    borderEdgeKey(border.top),
    borderEdgeKey(border.bottom),
    borderDiagonalKey(border.diagonal)
  ].join("|");
}
function alignmentStyleKey(alignment) {
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
    alignment.readingOrder ?? ""
  ].join("|");
}
function protectionStyleKey(protection) {
  if (!protection) {
    return "";
  }
  return [
    protection.locked === void 0 ? "" : protection.locked ? 1 : 0,
    protection.hidden === void 0 ? "" : protection.hidden ? 1 : 0
  ].join("|");
}
function inlineStyleKey(style) {
  return [
    style.numberFormat ?? "",
    fontStyleKey(style.font),
    fillStyleKey(style.fill),
    borderStyleKey(style.border),
    alignmentStyleKey(style.alignment),
    protectionStyleKey(style.protection)
  ].join("||");
}
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function deepMerge(base, override) {
  if (base === void 0) return override;
  if (override === void 0) return base;
  if (!isObject(base) || !isObject(override)) {
    return override;
  }
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === void 0) {
      continue;
    }
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }
  return result;
}
function resolveStyleInput(style) {
  if (!style) {
    return void 0;
  }
  if (typeof style === "string") {
    return PRESETS[style];
  }
  const presetStyle = style.preset ? PRESETS[style.preset] : void 0;
  const { preset: _preset, ...rest } = style;
  void _preset;
  return deepMerge(presetStyle, rest);
}
function resolveNumberFormatAlias(numberFormat) {
  if (!numberFormat) {
    return void 0;
  }
  const aliasMap = {
    currency: "$#,##0.00",
    "currency:EUR": "\u20AC#,##0.00",
    "currency:GBP": "\xA3#,##0.00",
    "currency:KRW": "\u20A9#,##0",
    "currency:JPY": "\xA5#,##0",
    percentage: "0.0%",
    "percentage:0": "0%",
    "percentage:2": "0.00%",
    date: "yyyy-mm-dd",
    "date:us": "m/d/yyyy",
    "date:eu": "d/m/yyyy",
    "date:kr": "yyyy\uB144 m\uC6D4 d\uC77C",
    datetime: "yyyy-mm-dd hh:mm",
    time: "h:mm:ss",
    accounting: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
    "number:0": "#,##0",
    "number:2": "#,##0.00",
    scientific: "0.00E+00",
    text: "@"
  };
  return aliasMap[numberFormat] ?? numberFormat;
}
function resolveCellStyle(style, value, sheetBaseStyle) {
  if (sheetBaseStyle === void 0 && style !== void 0 && typeof style !== "string" && !style.preset && !(value instanceof Date && !style.numberFormat)) {
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
      numberFormat: resolveNumberFormatAlias(style.numberFormat)
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
      numberFormat: resolveNumberFormatAlias(resolved.numberFormat)
    };
  }
  return resolved;
}
function normalizeFont(font, defaults) {
  return {
    family: font?.family ?? defaults.family,
    size: font?.size ?? defaults.size,
    bold: font?.bold,
    italic: font?.italic,
    underline: font?.underline,
    strikethrough: font?.strikethrough,
    color: font?.color,
    vertAlign: font?.vertAlign,
    charset: font?.charset
  };
}
function normalizeFill(fill) {
  if (!fill) {
    return void 0;
  }
  if (fill.color) {
    return {
      type: "solid",
      fgColor: fill.color,
      bgColor: fill.bgColor,
      patternType: "solid"
    };
  }
  return {
    type: fill.type ?? "solid",
    fgColor: fill.fgColor,
    bgColor: fill.bgColor,
    patternType: fill.patternType ?? (fill.type === "pattern" ? "darkGray" : "solid")
  };
}

// src/worksheet/structure.ts
function cellKey(row, col) {
  return `${row}:${col}`;
}
function cloneCell(cell) {
  return {
    ...cell,
    value: cell.value,
    style: cell.style
  };
}
function mergeStylePatch(cell, patch) {
  const baseStyle = resolveStyleInput(cell?.style);
  return {
    ...cell ?? { value: null },
    style: deepMerge(baseStyle, patch)
  };
}
function quoteSheetName(sheetName) {
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(sheetName)) {
    return sheetName;
  }
  return `'${sheetName.replaceAll("'", "''")}'`;
}
function resolveAutoFilterRef(sheet, maxRow, maxCol) {
  if (!sheet.autoFilter) {
    return void 0;
  }
  if (sheet.autoFilter === true) {
    if (maxRow < 0 || maxCol < 0) {
      return "A1:A1";
    }
    return absRangeRef(0, 0, maxRow, maxCol).replaceAll("$", "");
  }
  return sheet.autoFilter.ref;
}
function compileSheetStructure(sheet) {
  const occupied = /* @__PURE__ */ new Set();
  const originCellMap = /* @__PURE__ */ new Map();
  const spanMerges = [];
  let maxRow = sheet.rows.length - 1;
  let maxCol = Math.max(-1, (sheet.columns?.length ?? 0) - 1);
  sheet.rows.forEach((row, rowIndex) => {
    let cursor = 0;
    row.cells.forEach((cellInput) => {
      while (occupied.has(cellKey(rowIndex, cursor))) {
        cursor += 1;
      }
      const cell = cloneCell(cellInput);
      const colSpan = cell.colSpan ?? 1;
      const rowSpan = cell.rowSpan ?? 1;
      originCellMap.set(cellKey(rowIndex, cursor), cell);
      maxRow = Math.max(maxRow, rowIndex + rowSpan - 1);
      maxCol = Math.max(maxCol, cursor + colSpan - 1);
      if (colSpan > 1 || rowSpan > 1) {
        spanMerges.push({
          ref: `${absRangeRef(rowIndex, cursor, rowIndex + rowSpan - 1, cursor + colSpan - 1).replaceAll("$", "")}`,
          bounds: {
            startRow: rowIndex,
            startCol: cursor,
            endRow: rowIndex + rowSpan - 1,
            endCol: cursor + colSpan - 1
          },
          source: "span"
        });
      }
      for (let occupiedRow = rowIndex; occupiedRow < rowIndex + rowSpan; occupiedRow += 1) {
        for (let occupiedCol = cursor; occupiedCol < cursor + colSpan; occupiedCol += 1) {
          if (occupiedRow === rowIndex && occupiedCol === cursor) {
            continue;
          }
          occupied.add(cellKey(occupiedRow, occupiedCol));
        }
      }
      cursor += colSpan;
    });
  });
  const explicitMerges = (sheet.mergedCells ?? []).map((ref) => ({
    ref,
    bounds: parseRangeRef(ref),
    source: "explicit"
  }));
  const mergeRanges = [...spanMerges, ...explicitMerges];
  const propagatedCellMap = new Map(originCellMap);
  for (const merge of mergeRanges) {
    const topLeftKey = cellKey(merge.bounds.startRow, merge.bounds.startCol);
    const topLeftCell = propagatedCellMap.get(topLeftKey);
    const border = resolveStyleInput(topLeftCell?.style)?.border;
    if (!border) {
      continue;
    }
    const applyEdge = (row, col, patch) => {
      const key = cellKey(row, col);
      propagatedCellMap.set(key, mergeStylePatch(propagatedCellMap.get(key), patch));
    };
    if (border.top) {
      for (let col = merge.bounds.startCol; col <= merge.bounds.endCol; col += 1) {
        applyEdge(merge.bounds.startRow, col, { border: { top: border.top } });
      }
    }
    if (border.bottom) {
      for (let col = merge.bounds.startCol; col <= merge.bounds.endCol; col += 1) {
        applyEdge(merge.bounds.endRow, col, { border: { bottom: border.bottom } });
      }
    }
    if (border.left) {
      for (let row = merge.bounds.startRow; row <= merge.bounds.endRow; row += 1) {
        applyEdge(row, merge.bounds.startCol, { border: { left: border.left } });
      }
    }
    if (border.right) {
      for (let row = merge.bounds.startRow; row <= merge.bounds.endRow; row += 1) {
        applyEdge(row, merge.bounds.endCol, { border: { right: border.right } });
      }
    }
  }
  const buildRows = (cellMap) => {
    const rowMap = /* @__PURE__ */ new Map();
    for (const [key, cell] of cellMap) {
      const [row, col] = key.split(":").map(Number);
      const rowCells = rowMap.get(row) ?? [];
      rowCells.push({ row, col, cell });
      rowMap.set(row, rowCells);
    }
    return [...rowMap.entries()].sort((left, right) => left[0] - right[0]).map(([row, cells]) => ({
      row,
      cells: cells.sort((left, right) => left.col - right.col)
    }));
  };
  return {
    rows: buildRows(propagatedCellMap),
    originCells: buildRows(originCellMap),
    mergeRanges,
    autoFilterRef: resolveAutoFilterRef(sheet, maxRow, maxCol),
    maxRow,
    maxCol
  };
}

// src/utils/cell-ref.ts
var EXCEL_MAX_COLUMNS = 16384;
var COLUMN_LETTERS = Array.from({ length: EXCEL_MAX_COLUMNS }, (_unused, index) => {
  let current = index + 1;
  let letters = "";
  while (current > 0) {
    current -= 1;
    letters = String.fromCharCode(65 + current % 26) + letters;
    current = Math.floor(current / 26);
  }
  return letters;
});
function colIndexToLetter(index) {
  if (!Number.isInteger(index) || index < 0 || index >= EXCEL_MAX_COLUMNS) {
    throw new RangeError(`Column index ${index} is outside Excel's supported range`);
  }
  return COLUMN_LETTERS[index];
}
function rowIndexToRowNum(index) {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`Row index ${index} must be a non-negative integer`);
  }
  return String(index + 1);
}
function cellRef(row, col) {
  return `${colIndexToLetter(col)}${rowIndexToRowNum(row)}`;
}
function absCellRef(row, col) {
  return `$${colIndexToLetter(col)}$${rowIndexToRowNum(row)}`;
}
function parseCellRef(ref) {
  const match = /^\$?([A-Z]+)\$?([1-9]\d*)$/.exec(ref);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }
  const [, letters, rowString] = match;
  let col = 0;
  for (const character of letters) {
    col = col * 26 + (character.charCodeAt(0) - 64);
  }
  return {
    row: Number(rowString) - 1,
    col: col - 1
  };
}
function parseRangeRef(ref) {
  const [startRef, endRef] = ref.split(":");
  if (!startRef || !endRef) {
    const parsed = parseCellRef(ref);
    return {
      startRow: parsed.row,
      startCol: parsed.col,
      endRow: parsed.row,
      endCol: parsed.col
    };
  }
  const start = parseCellRef(startRef);
  const end = parseCellRef(endRef);
  return {
    startRow: Math.min(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endRow: Math.max(start.row, end.row),
    endCol: Math.max(start.col, end.col)
  };
}
function absRangeRef(startRow, startCol, endRow, endCol) {
  return `${absCellRef(startRow, startCol)}:${absCellRef(endRow, endCol)}`;
}

// src/utils/hyperlinks.ts
function unquoteSheetName(value) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}
function splitHyperlinkLocation(value) {
  const normalized = value.startsWith("#") ? value.slice(1) : value;
  const separatorIndex = normalized.lastIndexOf("!");
  if (separatorIndex === -1) {
    return { ref: normalized };
  }
  return {
    sheetName: unquoteSheetName(normalized.slice(0, separatorIndex)),
    ref: normalized.slice(separatorIndex + 1)
  };
}
function isCellOrRangeRef(value) {
  try {
    parseRangeRef(value);
    return true;
  } catch {
    return false;
  }
}
function isInternalLocation(value) {
  const { ref } = splitHyperlinkLocation(value.trim());
  return isCellOrRangeRef(ref);
}
function normalizeHyperlinkLocation(value) {
  const { sheetName, ref } = splitHyperlinkLocation(value.trim());
  if (!sheetName) {
    return ref;
  }
  return `${quoteSheetName(sheetName)}!${ref}`;
}
function normalizeHyperlink(hyperlink) {
  if (typeof hyperlink === "string") {
    const normalized = hyperlink.trim();
    if (isInternalLocation(normalized)) {
      return {
        mode: "internal",
        location: normalizeHyperlinkLocation(normalized)
      };
    }
    return {
      mode: "external",
      target: normalized
    };
  }
  if ("location" in hyperlink) {
    return {
      mode: "internal",
      location: normalizeHyperlinkLocation(hyperlink.location),
      display: hyperlink.display,
      tooltip: hyperlink.tooltip
    };
  }
  return {
    mode: "external",
    target: hyperlink.target,
    display: hyperlink.display,
    tooltip: hyperlink.tooltip
  };
}

// src/utils/xml.ts
var XML_ESCAPE_PATTERN = /[&<>"']/g;
var XML_ESCAPE_NEEDS_WORK = /[&<>"']/;
var FORBIDDEN_CONTROL_PATTERN = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");
var FORBIDDEN_CONTROL_PATTERN_GLOBAL = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "g");
var XML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;"
};
var XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function escapeXml(value) {
  if (!XML_ESCAPE_NEEDS_WORK.test(value)) {
    return value;
  }
  return value.replace(XML_ESCAPE_PATTERN, (character) => XML_ESCAPE_MAP[character] ?? character);
}
function sanitizeSharedString(value) {
  if (!FORBIDDEN_CONTROL_PATTERN.test(value)) {
    return value;
  }
  return value.replace(FORBIDDEN_CONTROL_PATTERN_GLOBAL, "");
}
function needsXmlSpacePreserve(value) {
  return /^\s/.test(value) || /\s$/.test(value) || /[\t\r\n]/.test(value);
}
function formatNumberForCell(value) {
  if (Object.is(value, -0)) {
    return "-0";
  }
  return String(value);
}

// src/styles/color.ts
function normalizeHex(color) {
  const raw = color.startsWith("#") ? color.slice(1) : color;
  if (raw.length === 6) {
    return `FF${raw.toUpperCase()}`;
  }
  if (raw.length === 8) {
    return raw.toUpperCase();
  }
  return raw.toUpperCase();
}
function serializeColorAttributes(color) {
  if (color.startsWith("theme:")) {
    const [, themeIndex, tint] = color.split(":");
    const attributes = [`theme="${escapeXml(themeIndex)}"`];
    if (tint !== void 0) {
      attributes.push(`tint="${escapeXml(tint)}"`);
    }
    return attributes.join(" ");
  }
  return `rgb="${normalizeHex(color)}"`;
}

// src/styles/font-serializer.ts
function serializeUnderline(underline) {
  if (!underline) {
    return "";
  }
  if (underline === true) {
    return '<u val="single"/>';
  }
  return `<u val="${escapeXml(underline)}"/>`;
}
function serializeFont(font) {
  const parts = ["<font>"];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.strikethrough) parts.push("<strike/>");
  const underline = serializeUnderline(font.underline);
  if (underline) parts.push(underline);
  if (font.vertAlign) parts.push(`<vertAlign val="${font.vertAlign}"/>`);
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) {
    parts.push(`<color ${serializeColorAttributes(font.color)}/>`);
  }
  parts.push(`<name val="${escapeXml(font.family)}"/>`);
  if (font.familyClassification !== void 0) {
    parts.push(`<family val="${font.familyClassification}"/>`);
  }
  if (font.charset !== void 0) {
    parts.push(`<charset val="${font.charset}"/>`);
  }
  if (font.scheme) {
    parts.push(`<scheme val="${font.scheme}"/>`);
  }
  parts.push("</font>");
  return parts.join("");
}
function serializeRichTextRunFont(font) {
  const parts = ["<rPr>"];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.strikethrough) parts.push("<strike/>");
  const underline = serializeUnderline(font.underline);
  if (underline) parts.push(underline);
  if (font.vertAlign) parts.push(`<vertAlign val="${font.vertAlign}"/>`);
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) {
    parts.push(`<color ${serializeColorAttributes(font.color)}/>`);
  }
  parts.push(`<rFont val="${escapeXml(font.family)}"/>`);
  if (font.charset !== void 0) {
    parts.push(`<charset val="${font.charset}"/>`);
  }
  parts.push("</rPr>");
  return parts.join("");
}

// src/styles/conditional-formatting.ts
function serializeCfvo(rulePoint) {
  const valAttr = rulePoint.value !== void 0 ? ` val="${rulePoint.value}"` : "";
  return `<cfvo type="${rulePoint.type}"${valAttr}/>`;
}
function serializeCellIs(rule, registry, priority) {
  const dxfId = registry.registerDxf(rule.style);
  const formulas = Array.isArray(rule.formula) ? `<formula>${rule.formula[0]}</formula><formula>${rule.formula[1]}</formula>` : `<formula>${rule.formula}</formula>`;
  return `<cfRule type="cellIs" dxfId="${dxfId}" priority="${priority}" operator="${rule.operator}">${formulas}</cfRule>`;
}
function serializeTop10(rule, registry, priority) {
  const dxfId = registry.registerDxf(rule.style);
  return `<cfRule type="top10" dxfId="${dxfId}" priority="${priority}" rank="${rule.rank}" percent="${rule.percent ? 1 : 0}" bottom="${rule.bottom ? 1 : 0}"/>`;
}
function serializeDuplicate(rule, registry, priority) {
  const dxfId = registry.registerDxf(rule.style);
  return `<cfRule type="${rule.type}" dxfId="${dxfId}" priority="${priority}"/>`;
}
function serializeColorScale(rule, priority) {
  const points = [rule.scale.min, rule.scale.mid, rule.scale.max].filter(
    (point) => point !== void 0
  );
  const colors = points.map((point) => `<color ${serializeColorAttributes(point.color)}/>`).join("");
  return `<cfRule type="colorScale" priority="${priority}"><colorScale>${points.map((point) => serializeCfvo(point)).join("")}${colors}</colorScale></cfRule>`;
}
function needsExtendedDataBar(rule) {
  return rule.negativeColor !== void 0 || rule.axisPosition !== void 0 && rule.axisPosition !== "automatic" || rule.gradient === false || rule.direction !== void 0;
}
function readableLegacyDataBarColor(rule) {
  const color = rule.color.replace(/^#/, "").toUpperCase();
  if (rule.gradient !== false || rule.showValue === false || !/^(?:[0-9A-F]{6}|[0-9A-F]{8})$/u.test(color)) {
    return rule.color;
  }
  const rgb = color.length === 8 ? color.slice(2) : color;
  const softened = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(rgb.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * 0.48).toString(16).padStart(2, "0").toUpperCase();
  }).join("");
  return color.length === 8 ? `${color.slice(0, 2)}${softened}` : softened;
}
function serializeDataBar(rule, priority) {
  const showValueAttr = rule.showValue === false ? ` showValue="0"` : "";
  const basic = `<cfRule type="dataBar" priority="${priority}"><dataBar${showValueAttr}>${serializeCfvo(rule.min)}${serializeCfvo(rule.max)}<color ${serializeColorAttributes(readableLegacyDataBarColor(rule))}/></dataBar></cfRule>`;
  if (!needsExtendedDataBar(rule)) {
    return { basic, extended: "" };
  }
  const guid = `{00000000-0000-0000-0000-${String(priority).padStart(12, "0")}}`;
  const extParts = [];
  extParts.push(`<x14:cfRule type="dataBar" id="${guid}">`);
  extParts.push(`<x14:dataBar`);
  const extAttrs = [];
  if (rule.gradient === false) {
    extAttrs.push(` gradient="0"`);
  }
  if (rule.direction !== void 0) {
    extAttrs.push(` direction="${rule.direction}"`);
  }
  if (rule.axisPosition !== void 0 && rule.axisPosition !== "automatic") {
    extAttrs.push(` axisPosition="${rule.axisPosition}"`);
  }
  extParts.push(extAttrs.join(""));
  extParts.push(">");
  extParts.push(serializeX14Cfvo(rule.min));
  extParts.push(serializeX14Cfvo(rule.max));
  if (rule.negativeColor !== void 0) {
    extParts.push(`<x14:negativeFillColor ${serializeColorAttributes(rule.negativeColor)}/>`);
  }
  if (rule.axisPosition !== "none") {
    extParts.push(`<x14:axisColor rgb="FF000000"/>`);
  }
  extParts.push("</x14:dataBar>");
  extParts.push("</x14:cfRule>");
  return { basic, extended: extParts.join("") };
}
function serializeX14Cfvo(cfvo) {
  const valAttr = cfvo.value !== void 0 ? `<xm:f>${cfvo.value}</xm:f>` : "";
  return `<x14:cfvo type="${cfvo.type}">${valAttr}</x14:cfvo>`;
}
var DEFAULT_THRESHOLDS = {
  3: [0, 33, 67],
  4: [0, 25, 50, 75],
  5: [0, 20, 40, 60, 80]
};
function serializeIconSet(rule, priority) {
  const iconCount = parseInt(rule.iconSet[0], 10);
  const attrs = [`iconSet="${rule.iconSet}"`];
  if (rule.showValue === false) {
    attrs.push(`showValue="0"`);
  }
  if (rule.reverse === true) {
    attrs.push(`reverse="1"`);
  }
  let cfvos;
  if (rule.thresholds) {
    cfvos = rule.thresholds.map((t) => serializeCfvo(t)).join("");
  } else {
    const defaults = DEFAULT_THRESHOLDS[iconCount];
    cfvos = defaults.map((val) => `<cfvo type="percent" val="${val}"/>`).join("");
  }
  return `<cfRule type="iconSet" priority="${priority}"><iconSet ${attrs.join(" ")}>${cfvos}</iconSet></cfRule>`;
}
function serializeRule(rule, registry, priority) {
  switch (rule.type) {
    case "cellIs":
      return { basic: serializeCellIs(rule, registry, priority), extended: "" };
    case "top10":
      return { basic: serializeTop10(rule, registry, priority), extended: "" };
    case "duplicateValues":
    case "uniqueValues":
      return { basic: serializeDuplicate(rule, registry, priority), extended: "" };
    case "colorScale":
      return { basic: serializeColorScale(rule, priority), extended: "" };
    case "dataBar":
      return serializeDataBar(rule, priority);
    case "iconSet":
      return { basic: serializeIconSet(rule, priority), extended: "" };
    default: {
      const _exhaustive = rule;
      void _exhaustive;
      return { basic: "", extended: "" };
    }
  }
}
function serializeConditionalFormatting(rules, registry) {
  if (!rules || rules.length === 0) {
    return { xml: "", extLst: "" };
  }
  let priority = 1;
  const xmlParts = [];
  const extEntries = [];
  for (const entry of rules) {
    const ruleParts = [];
    for (const rule of entry.rules) {
      const result = serializeRule(rule, registry, priority);
      ruleParts.push(result.basic);
      if (result.extended) {
        extEntries.push(
          `<x14:conditionalFormatting xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">${result.extended}<xm:sqref>${entry.ref}</xm:sqref></x14:conditionalFormatting>`
        );
      }
      priority += 1;
    }
    xmlParts.push(`<conditionalFormatting sqref="${entry.ref}">${ruleParts.join("")}</conditionalFormatting>`);
  }
  let extLst = "";
  if (extEntries.length > 0) {
    extLst = `<extLst><ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:conditionalFormattings>${extEntries.join("")}</x14:conditionalFormattings></ext></extLst>`;
  }
  return { xml: xmlParts.join(""), extLst };
}

// src/layout/column-width.ts
var MAX_EXCEL_COLUMN_WIDTH = 255;
function clampColumnWidth(width) {
  return Math.min(width, MAX_EXCEL_COLUMN_WIDTH);
}
function columnNeedsHeuristicWidth(column) {
  return column?.width === void 0 && column?.bestFit === true;
}
function stringifyDisplayValue(value, style) {
  if (value === null || value === void 0) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    const numberFormat2 = resolveNumberFormatAlias(style?.numberFormat);
    if (numberFormat2 === "m/d/yyyy") return "1/1/2026";
    if (numberFormat2 === "d/m/yyyy") return "1/1/2026";
    return "2026-01-01";
  }
  const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
  if (!numberFormat) {
    return formatNumberForCell(value);
  }
  if (numberFormat.includes("%")) {
    const decimals = (numberFormat.split(".")[1]?.match(/0/g) ?? []).length;
    return `${(value * 100).toFixed(decimals)}%`;
  }
  if (numberFormat.includes("\u20A9")) return `\u20A9${Math.round(value).toLocaleString("en-US")}`;
  if (numberFormat.includes("$")) return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (numberFormat.includes("\u20AC")) return `\u20AC${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (numberFormat.includes("#,##0.00")) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (numberFormat.includes("#,##0")) return Math.round(value).toLocaleString("en-US");
  return formatNumberForCell(value);
}
function isCJKCharacter(codePoint) {
  return codePoint >= 11904 && codePoint <= 40959 || codePoint >= 63744 && codePoint <= 64255 || codePoint >= 65072 && codePoint <= 65103;
}
function estimateCharacterBaseWidth(char) {
  const codePoint = char.codePointAt(0) ?? 0;
  return isCJKCharacter(codePoint) ? 1.8 : 1;
}
function estimateStringWidth(value) {
  let maxLineWidth = 0;
  let currentLineWidth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\n" || ch === "\r") {
      maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
      currentLineWidth = 0;
      if (ch === "\r" && value[i + 1] === "\n") {
        i++;
      }
      continue;
    }
    currentLineWidth += estimateCharacterBaseWidth(ch);
  }
  return Math.max(maxLineWidth, currentLineWidth);
}
function longestLineLength(value) {
  return value.split(/\r\n|\r|\n/).reduce(
    (max, line) => Math.max(max, line.length),
    0
  );
}
function countIntegerDigits(value) {
  if (!Number.isFinite(value) || value === 0) {
    return 1;
  }
  return Math.floor(Math.log10(Math.abs(value))) + 1;
}
function countGroupedDigits(value) {
  const digits = countIntegerDigits(value);
  return digits + Math.max(0, Math.floor((digits - 1) / 3));
}
function countDecimalPlaces(format) {
  const decimalSection = format.split(".")[1] ?? "";
  const match = decimalSection.match(/0/g);
  return match?.length ?? 0;
}
function estimateNumberDisplayLength(value, numberFormat) {
  if (!numberFormat) {
    return formatNumberForCell(value).length;
  }
  const absValue = Math.abs(value);
  const sign = value < 0 ? 1 : 0;
  if (numberFormat.includes("E+")) {
    return sign + 8;
  }
  if (numberFormat.includes("%")) {
    const decimals = countDecimalPlaces(numberFormat);
    const scaled = absValue * 100;
    return sign + countIntegerDigits(scaled) + (decimals > 0 ? decimals + 1 : 0) + 1;
  }
  if (numberFormat.includes("\u20A9")) {
    return sign + 1 + countGroupedDigits(absValue);
  }
  if (numberFormat.includes("$") || numberFormat.includes("\u20AC") || numberFormat.includes("\xA3") || numberFormat.includes("\xA5")) {
    const decimals = countDecimalPlaces(numberFormat);
    return sign + 1 + countGroupedDigits(absValue) + (decimals > 0 ? decimals + 1 : 0);
  }
  if (numberFormat.includes("#,##0")) {
    const decimals = countDecimalPlaces(numberFormat);
    return sign + countGroupedDigits(absValue) + (decimals > 0 ? decimals + 1 : 0);
  }
  if (numberFormat === "@") {
    return String(value).length;
  }
  return formatNumberForCell(value).length;
}
function resolveWidthCoefficient(style, defaults) {
  const fontFamily = style?.font?.family ?? defaults?.font?.family ?? "Calibri";
  return fontFamily === "Courier New" ? 1 : 1.15;
}
function estimateDisplayCharWidth(value, style) {
  if (value === null || value === void 0) {
    return void 0;
  }
  const boldMultiplier = style?.font?.bold === true ? 1.05 : 1;
  if (Array.isArray(value)) {
    return estimateStringWidth(value.map((run) => run.text).join("")) * boldMultiplier;
  }
  if (isErrorValue(value)) {
    return estimateStringWidth(value.error) * boldMultiplier;
  }
  if (typeof value === "string") {
    return estimateStringWidth(value) * boldMultiplier;
  }
  return estimateDisplayLength(value, style) * boldMultiplier;
}
function estimateDisplayWidth(value, style, defaults) {
  const charWidth = estimateDisplayCharWidth(value, style);
  if (charWidth === void 0 || charWidth === 0) {
    return void 0;
  }
  const coefficient = resolveWidthCoefficient(style, defaults);
  return Math.min(Math.max(charWidth * coefficient + 2, 8.43), MAX_EXCEL_COLUMN_WIDTH);
}
function estimateDisplayLength(value, style) {
  if (value === null || value === void 0) {
    return 0;
  }
  if (Array.isArray(value)) {
    return longestLineLength(value.map((run) => run.text).join(""));
  }
  if (isErrorValue(value)) {
    return value.error.length;
  }
  if (typeof value === "string") {
    return longestLineLength(value);
  }
  if (typeof value === "boolean") {
    return value ? 4 : 5;
  }
  if (value instanceof Date) {
    const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
    if (numberFormat === "yyyy-mm-dd hh:mm") return 16;
    if (numberFormat === "h:mm:ss") return 8;
    if (numberFormat === "m/d/yyyy") return 10;
    if (numberFormat === "d/m/yyyy") return 10;
    return 10;
  }
  return estimateNumberDisplayLength(value, resolveNumberFormatAlias(style?.numberFormat));
}
function estimateHeuristicColumnWidth(value, style, defaults) {
  return estimateDisplayWidth(value, style, defaults);
}
function getSheetColumnCount(sheet) {
  let maxColumnCount = sheet.columns?.length ?? 0;
  for (const row of sheet.rows) {
    if (row.cells.length > maxColumnCount) {
      maxColumnCount = row.cells.length;
    }
  }
  return maxColumnCount;
}
function buildColumnLayout(sheet, computedColumns, defaults) {
  const columnCount = computedColumns.length;
  const columnWidths = computedColumns.map(
    (column, index) => clampColumnWidth(
      sheet.columns?.[index]?.width ?? column?.width ?? (defaults?.columnWidth ?? 8.43)
    )
  );
  const segments = [];
  for (let index = 0; index < columnCount; index += 1) {
    const explicit = sheet.columns?.[index];
    const computed = computedColumns[index];
    const descriptor = {
      width: clampColumnWidth(explicit?.width ?? computed?.width ?? (defaults?.columnWidth ?? 8.43)),
      hidden: explicit?.hidden,
      bestFit: explicit?.bestFit ?? computed?.bestFit,
      customWidth: explicit?.width !== void 0 || computed?.width !== void 0
    };
    const shouldEmitSegment = descriptor.customWidth || descriptor.hidden || descriptor.bestFit;
    if (!shouldEmitSegment) {
      continue;
    }
    const previous = segments[segments.length - 1];
    if (previous && previous.end === index && previous.width === descriptor.width && previous.hidden === descriptor.hidden && previous.bestFit === descriptor.bestFit && previous.customWidth === descriptor.customWidth) {
      previous.end = index + 1;
      continue;
    }
    segments.push({
      start: index + 1,
      end: index + 1,
      ...descriptor
    });
  }
  return {
    columnCount,
    columnWidths,
    segments
  };
}
function computeColumnLayout(sheet, defaults) {
  const columnCount = getSheetColumnCount(sheet);
  const computedColumns = Array.from({ length: columnCount }, () => void 0);
  const explicitColumns = sheet.columns ?? [];
  const headerRowStyle = resolveCellStyle(sheet.styling?.headerRow, void 0);
  const alternateOddStyle = resolveCellStyle(sheet.styling?.alternateRows?.odd, void 0);
  const alternateEvenStyle = resolveCellStyle(sheet.styling?.alternateRows?.even, void 0);
  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex];
    if (!row) {
      continue;
    }
    const rowStyle = rowIndex === 0 ? headerRowStyle : (rowIndex + 1) % 2 === 0 ? alternateEvenStyle : alternateOddStyle;
    for (let columnIndex = 0; columnIndex < row.cells.length; columnIndex += 1) {
      const explicitColumn = explicitColumns[columnIndex];
      if (!columnNeedsHeuristicWidth(explicitColumn)) {
        continue;
      }
      const cell = row.cells[columnIndex];
      if (!cell) {
        continue;
      }
      const style = resolveCellStyle(cell.style, cell.value, rowStyle);
      const width = estimateDisplayWidth(cell.value, style, defaults);
      if (width === void 0) {
        continue;
      }
      const existing = computedColumns[columnIndex];
      if (!existing || width > existing.width) {
        computedColumns[columnIndex] = {
          width,
          bestFit: true
        };
      }
    }
  }
  const layout = buildColumnLayout(sheet, computedColumns, defaults);
  return {
    columnCount: layout.columnCount,
    computedColumns,
    columnWidths: layout.columnWidths,
    segments: layout.segments
  };
}

// src/serializers/sheet-xml-builder.ts
var WORKSHEET_SECTION_ORDER = {
  sheetPr: 1,
  dimension: 2,
  sheetViews: 3,
  sheetFormatPr: 4,
  cols: 5,
  sheetData: 6,
  autoFilter: 11,
  sheetProtection: 13,
  mergeCells: 15,
  conditionalFormatting: 17,
  dataValidations: 18,
  hyperlinks: 19,
  printOptions: 20,
  pageMargins: 21,
  pageSetup: 22,
  rowBreaks: 23,
  drawing: 24,
  legacyDrawing: 25,
  tableParts: 26,
  pivotTableParts: 27,
  extLst: 28
};
var SHEET_DATA_POSITION = WORKSHEET_SECTION_ORDER.sheetData;
var SheetXmlBuilder = class {
  constructor(rootAttributes) {
    this.rootAttributes = rootAttributes;
  }
  sections = /* @__PURE__ */ new Map();
  setSheetPr(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetPr, xml);
  }
  setDimension(xml) {
    this.set(WORKSHEET_SECTION_ORDER.dimension, xml);
  }
  setSheetViews(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetViews, xml);
  }
  setSheetFormatPr(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetFormatPr, xml);
  }
  setCols(xml) {
    this.set(WORKSHEET_SECTION_ORDER.cols, xml);
  }
  setSheetData(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetData, xml);
  }
  setAutoFilter(xml) {
    this.set(WORKSHEET_SECTION_ORDER.autoFilter, xml);
  }
  setSheetProtection(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetProtection, xml);
  }
  setMergeCells(xml) {
    this.set(WORKSHEET_SECTION_ORDER.mergeCells, xml);
  }
  addConditionalFormatting(xml) {
    this.add(WORKSHEET_SECTION_ORDER.conditionalFormatting, xml);
  }
  setDataValidations(xml) {
    this.set(WORKSHEET_SECTION_ORDER.dataValidations, xml);
  }
  setHyperlinks(xml) {
    this.set(WORKSHEET_SECTION_ORDER.hyperlinks, xml);
  }
  setPrintOptions(xml) {
    this.set(WORKSHEET_SECTION_ORDER.printOptions, xml);
  }
  setPageMargins(xml) {
    this.set(WORKSHEET_SECTION_ORDER.pageMargins, xml);
  }
  setPageSetup(xml) {
    this.set(WORKSHEET_SECTION_ORDER.pageSetup, xml);
  }
  setRowBreaks(xml) {
    this.set(WORKSHEET_SECTION_ORDER.rowBreaks, xml);
  }
  setTableParts(xml) {
    this.set(WORKSHEET_SECTION_ORDER.tableParts, xml);
  }
  setPivotTableParts(xml) {
    this.set(WORKSHEET_SECTION_ORDER.pivotTableParts, xml);
  }
  setExtLst(xml) {
    this.set(WORKSHEET_SECTION_ORDER.extLst, xml);
  }
  setLegacyDrawing(xml) {
    this.set(WORKSHEET_SECTION_ORDER.legacyDrawing, xml);
  }
  setDrawing(xml) {
    this.set(WORKSHEET_SECTION_ORDER.drawing, xml);
  }
  build() {
    const parts = [
      XML_DECLARATION,
      `<worksheet ${this.rootAttributes.join(" ")}>`
    ];
    for (const [, sectionParts] of [...this.sections.entries()].sort((left, right) => left[0] - right[0])) {
      parts.push(...sectionParts);
    }
    parts.push("</worksheet>");
    return parts.join("");
  }
  buildSheetDataEnvelope() {
    const prefix = [
      XML_DECLARATION,
      `<worksheet ${this.rootAttributes.join(" ")}>`
    ];
    const suffix = [];
    for (const [position, sectionParts] of [...this.sections.entries()].sort((left, right) => left[0] - right[0])) {
      if (position < SHEET_DATA_POSITION) {
        prefix.push(...sectionParts);
        continue;
      }
      if (position > SHEET_DATA_POSITION) {
        suffix.push(...sectionParts);
      }
    }
    prefix.push("<sheetData>");
    suffix.unshift("</sheetData>");
    suffix.push("</worksheet>");
    return {
      prefix: prefix.join(""),
      suffix: suffix.join("")
    };
  }
  set(position, xml) {
    if (!xml) {
      return;
    }
    this.sections.set(position, [xml]);
  }
  add(position, xml) {
    if (!xml) {
      return;
    }
    const section = this.sections.get(position) ?? [];
    section.push(xml);
    this.sections.set(position, section);
  }
};

// src/serializers/worksheet-rels-serializer.ts
var RELATIONSHIP_TYPE_URIS = {
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  table: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table",
  vmlDrawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
  comment: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  drawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
  pivotTable: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotTable"
};
function serializeWorksheetRelationships(relationships) {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    ...relationships.map((relationship) => {
      const typeUri = RELATIONSHIP_TYPE_URIS[relationship.type];
      const targetMode = relationship.type === "hyperlink" ? ` TargetMode="External"` : "";
      return `<Relationship Id="${relationship.id}" Type="${typeUri}" Target="${escapeXml(relationship.target)}"${targetMode}/>`;
    }),
    `</Relationships>`
  ].join("");
}

// src/serializers/table-serializer.ts
function totalsRowFunctionCode(value) {
  switch (value) {
    case "average":
      return 101;
    case "countNums":
      return 102;
    case "count":
      return 103;
    case "max":
      return 104;
    case "min":
      return 105;
    case "stdDev":
      return 107;
    case "sum":
      return 109;
    case "var":
      return 110;
    default:
      return null;
  }
}
function createTotalsRowCell(table, range, column, columnIndex) {
  if (column?.totalsRowLabel) {
    return { value: column.totalsRowLabel };
  }
  if (column?.totalsRowFormula) {
    return {
      formula: column.totalsRowFormula.startsWith("=") ? column.totalsRowFormula.slice(1) : column.totalsRowFormula
    };
  }
  if (column?.totalsRowFunction) {
    const functionCode = totalsRowFunctionCode(column.totalsRowFunction);
    const dataStartRow = range.startRow + 1;
    const dataEndRow = Math.max(range.startRow + 1, range.endRow - 1);
    if (functionCode !== null && dataEndRow >= dataStartRow) {
      return {
        formula: `SUBTOTAL(${functionCode},${cellRef(dataStartRow, columnIndex)}:${cellRef(dataEndRow, columnIndex)})`
      };
    }
  }
  if (table.totalsRow) {
    return { value: "" };
  }
  return { value: "" };
}
function buildWorksheetSyntheticTableCells(bindings) {
  const cellsByRow = /* @__PURE__ */ new Map();
  for (const binding of bindings ?? []) {
    const table = binding.definition;
    if (table.totalsRow !== true) {
      continue;
    }
    const range = parseRangeRef(table.ref);
    const totalsRowIndex = range.endRow;
    const columns = table.columns ?? [];
    const rowCells = cellsByRow.get(totalsRowIndex) ?? [];
    for (let offset = 0; offset <= range.endCol - range.startCol; offset += 1) {
      const columnIndex = range.startCol + offset;
      rowCells.push({
        row: totalsRowIndex,
        col: columnIndex,
        cell: createTotalsRowCell(table, range, columns[offset], columnIndex)
      });
    }
    cellsByRow.set(totalsRowIndex, rowCells);
  }
  return cellsByRow;
}

// src/utils/date.ts
var EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
var EXCEL_1904_EPOCH_UTC = Date.UTC(1904, 0, 1);
var MIN_EXCEL_SUPPORTED_DATE_UTC = Date.UTC(1899, 11, 31);
var LOTUS_RAW_THRESHOLD = 61;
function isSupportedExcelDate(value) {
  return !Number.isNaN(value.getTime()) && value.getTime() >= MIN_EXCEL_SUPPORTED_DATE_UTC;
}
function assertSupportedExcelDate(value) {
  if (!isSupportedExcelDate(value)) {
    const received = Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
    throw new RangeError(
      `Spreadsheet dates must be on or after 1899-12-31T00:00:00.000Z. Received ${received}.`
    );
  }
}
function dateToSerial(value, dateSystem = "1900") {
  assertSupportedExcelDate(value);
  if (dateSystem === "1904") {
    return (value.getTime() - EXCEL_1904_EPOCH_UTC) / 864e5;
  }
  const raw = (value.getTime() - EXCEL_EPOCH_UTC) / 864e5;
  if (raw >= 1 && raw < LOTUS_RAW_THRESHOLD) {
    return raw - 1;
  }
  return raw;
}
function dateToSerialString(value, dateSystem = "1900") {
  return formatNumberForCell(dateToSerial(value, dateSystem));
}

// src/layout/row-height.ts
function resolveSheetStyleInput(sheet, rowIndex) {
  if (rowIndex === 0) {
    return sheet.styling?.headerRow;
  }
  return (rowIndex + 1) % 2 === 0 ? sheet.styling?.alternateRows?.even : sheet.styling?.alternateRows?.odd;
}
function estimateRowHeight(row, rowIndex, sheet, columnWidths, defaults) {
  if (row.height !== void 0) {
    return row.height;
  }
  let maxHeight = defaults?.rowHeight ?? 15;
  let adjusted = false;
  for (let columnIndex = 0; columnIndex < row.cells.length; columnIndex += 1) {
    const cell = row.cells[columnIndex];
    const style = resolveCellStyle(cell.style, cell.value, resolveSheetStyleInput(sheet, rowIndex));
    if (!style?.alignment?.wrapText) continue;
    const text = stringifyDisplayValue(cell.value, style);
    if (!text) continue;
    const charsPerLine = Math.max(1, Math.floor((columnWidths[columnIndex] ?? defaults?.columnWidth ?? 8.43) * 1.6));
    const lines = Math.ceil(text.length / charsPerLine);
    if (lines <= 1) continue;
    const fontSize = style.font?.size ?? defaults?.font?.size ?? 11;
    const estimatedHeight = Math.min(lines * fontSize * 1.4, 409);
    if (estimatedHeight <= (defaults?.rowHeight ?? 15)) continue;
    maxHeight = Math.max(maxHeight, estimatedHeight);
    adjusted = true;
  }
  return adjusted ? maxHeight : void 0;
}

// src/layout/print-layout.ts
var POINTS_PER_INCH = 72;
var DEFAULT_COLUMN_WIDTH = 8.43;
var DEFAULT_ROW_HEIGHT = 15;
var DEFAULT_CHART_HEIGHT_PIXELS = 300;
var PIXELS_PER_ROW = 20;
var PAPER_DIMENSIONS_INCHES = {
  1: [8.5, 11],
  // Letter
  5: [8.5, 14],
  // Legal
  8: [11.69, 16.54],
  // A3
  9: [8.27, 11.69],
  // A4
  11: [5.83, 8.27]
  // A5
};
function paperDimensions(pageSetup) {
  const dimensions = PAPER_DIMENSIONS_INCHES[pageSetup?.paperSize ?? 1] ?? PAPER_DIMENSIONS_INCHES[1];
  return pageSetup?.orientation === "landscape" ? [dimensions[1], dimensions[0]] : dimensions;
}
function columnWidthToPoints(width) {
  const pixels = Math.floor((256 * width + Math.floor(128 / 7)) / 256 * 7) + 5;
  return pixels * 0.75;
}
function printAreaLastColumn(sheet) {
  const ref = sheet.pageSetup?.printArea;
  if (!ref) return void 0;
  try {
    return parseRangeRef(ref).endCol;
  } catch {
    return void 0;
  }
}
function estimatePrintLayout(sheet, defaults) {
  const columnLayout = computeColumnLayout(sheet, defaults);
  const lastPrintColumn = printAreaLastColumn(sheet);
  const usedColumnCount = lastPrintColumn === void 0 ? columnLayout.columnWidths.length : Math.max(columnLayout.columnWidths.length, lastPrintColumn + 1);
  const printableColumnWidths = Array.from(
    { length: usedColumnCount },
    (_unused, index) => columnLayout.columnWidths[index] ?? sheet.columns?.[index]?.width ?? defaults?.columnWidth ?? DEFAULT_COLUMN_WIDTH
  );
  const contentWidthPoints = printableColumnWidths.reduce((total, width, index) => {
    if (sheet.columns?.[index]?.hidden) return total;
    return total + columnWidthToPoints(width);
  }, 0);
  const [paperWidth, paperHeight] = paperDimensions(sheet.pageSetup);
  const leftMargin = sheet.pageSetup?.margins?.left ?? 0.7;
  const rightMargin = sheet.pageSetup?.margins?.right ?? 0.7;
  const topMargin = sheet.pageSetup?.margins?.top ?? 0.75;
  const bottomMargin = sheet.pageSetup?.margins?.bottom ?? 0.75;
  const printableWidthPoints = Math.max(1, paperWidth - leftMargin - rightMargin) * POINTS_PER_INCH;
  const printableHeightPoints = Math.max(1, paperHeight - topMargin - bottomMargin) * POINTS_PER_INCH;
  const requestedScale = sheet.pageSetup?.scale === void 0 ? 1 : sheet.pageSetup.scale / 100;
  const fitWidthScale = sheet.pageSetup?.fitToWidth === 1 && contentWidthPoints > 0 ? Math.min(1, printableWidthPoints / contentWidthPoints) : 1;
  const rowHeights = sheet.rows.map((row, rowIndex) => {
    if (row.hidden) return 0;
    return estimateRowHeight(row, rowIndex, sheet, columnLayout.columnWidths, defaults) ?? defaults?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  });
  return {
    columnWidths: printableColumnWidths,
    rowHeights,
    contentWidthPoints,
    printableWidthPoints,
    printableHeightPoints,
    scale: Math.min(requestedScale, fitWidthScale)
  };
}
function sheetExceedsPrintableWidth(sheet, defaults) {
  const layout = estimatePrintLayout(sheet, defaults);
  return layout.contentWidthPoints * layout.scale > layout.printableWidthPoints;
}
function rowTop(row, rowHeights, defaultHeight) {
  let top = 0;
  for (let index = 0; index < row; index += 1) {
    top += rowHeights[index] ?? defaultHeight;
  }
  return top;
}
function repeatedTitleHeight(sheet, rowHeights, defaultHeight) {
  const titles = sheet.pageSetup?.printTitles?.rows;
  if (!titles) return 0;
  let height = 0;
  for (let row = titles.start; row <= titles.end; row += 1) {
    height += rowHeights[row] ?? defaultHeight;
  }
  return height;
}
function chartCrossesEstimatedPageBreak(sheet, chart, defaults) {
  if (sheet.pageSetup?.fitToHeight === 1) return false;
  const layout = estimatePrintLayout(sheet, defaults);
  const defaultHeight = defaults?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const scaledPageHeight = layout.printableHeightPoints / Math.max(layout.scale, 0.1);
  const titleHeight = repeatedTitleHeight(sheet, layout.rowHeights, defaultHeight);
  const continuationHeight = Math.max(defaultHeight, scaledPageHeight - titleHeight);
  const start = rowTop(chart.anchor.from.row, layout.rowHeights, defaultHeight);
  const endRow = chart.anchor.to?.row ?? chart.anchor.from.row + Math.ceil((chart.height ?? DEFAULT_CHART_HEIGHT_PIXELS) / PIXELS_PER_ROW);
  const end = rowTop(endRow, layout.rowHeights, defaultHeight);
  if (end <= scaledPageHeight) return false;
  if (start < scaledPageHeight) return true;
  return Math.floor((start - scaledPageHeight) / continuationHeight) !== Math.floor((Math.max(start, end - 0.01) - scaledPageHeight) / continuationHeight);
}
function chartSafeRowBreaks(sheet, defaults) {
  if (sheet.pageSetup?.fitToHeight === 1) return [];
  const breakRows = /* @__PURE__ */ new Set();
  const fittedPageCount = sheet.pageSetup?.fitToHeight;
  if ((sheet.charts?.length ?? 0) === 0 && typeof fittedPageCount === "number" && fittedPageCount > 1 && sheet.rows.length > fittedPageCount) {
    const rowsPerPage = Math.ceil(sheet.rows.length / fittedPageCount);
    for (let page = 1; page < fittedPageCount; page += 1) {
      const breakRow = rowsPerPage * page;
      if (breakRow < sheet.rows.length) breakRows.add(breakRow);
    }
  }
  for (const chart of sheet.charts ?? []) {
    const followsData = chart.anchor.from.row >= sheet.rows.length;
    if (chart.anchor.from.row > 0 && (followsData || chartCrossesEstimatedPageBreak(sheet, chart, defaults))) {
      breakRows.add(chart.anchor.from.row);
    }
  }
  return [...breakRows].sort((left, right) => left - right);
}

// src/serializers/sheet-serializer.ts
var noRefCellOpenTagCache = /* @__PURE__ */ new Map();
var noRefCellEmptyTagCache = /* @__PURE__ */ new Map();
var noRefInlineStringOpenTagCache = /* @__PURE__ */ new Map();
var LARGE_ROW_REF_OMISSION_THRESHOLD = 512;
var SIMPLE_ROW_OPEN_TAG = "<row>";
var SIMPLE_ROW_CLOSE_TAG = "</row>";
var DEFAULT_FITTED_PAGE_MARGINS = {
  bottom: 0.3,
  footer: 0.15,
  header: 0.15,
  left: 0.35,
  right: 0.35,
  top: 0.3
};
function inferredPrintArea(sheet, structure) {
  if (sheet.pageSetup?.printArea) return sheet.pageSetup.printArea;
  const bounds = structure.originCells.flatMap((row) => row.cells.map((entry) => ({
    endCol: entry.col + (entry.cell.colSpan ?? 1) - 1,
    endRow: entry.row + (entry.cell.rowSpan ?? 1) - 1,
    startCol: entry.col,
    startRow: entry.row
  })));
  for (const merge of structure.mergeRanges) bounds.push(merge.bounds);
  for (const table of sheet.tables ?? []) bounds.push(parseRangeRef(table.ref));
  const addDrawing = (drawing) => {
    const fallbackEndCol = drawing.anchor.from.col + Math.max(1, Math.ceil((drawing.width ?? 64) / 64));
    const fallbackEndRow = drawing.anchor.from.row + Math.max(1, Math.ceil((drawing.height ?? 20) / 20));
    bounds.push({
      startCol: drawing.anchor.from.col,
      startRow: drawing.anchor.from.row,
      endCol: drawing.anchor.to?.col ?? fallbackEndCol,
      endRow: drawing.anchor.to?.row ?? fallbackEndRow
    });
  };
  for (const chart of sheet.charts ?? []) addDrawing(chart);
  for (const image of sheet.images ?? []) addDrawing(image);
  if (bounds.length === 0) return void 0;
  let startRow = bounds[0].startRow;
  let startCol = bounds[0].startCol;
  let endRow = bounds[0].endRow;
  let endCol = bounds[0].endCol;
  for (let index = 1; index < bounds.length; index += 1) {
    const bound = bounds[index];
    startRow = Math.min(startRow, bound.startRow);
    startCol = Math.min(startCol, bound.startCol);
    endRow = Math.max(endRow, bound.endRow);
    endCol = Math.max(endCol, bound.endCol);
  }
  return absRangeRef(startRow, startCol, endRow, endCol).replaceAll("$", "");
}
function sheetHasMaterialTextOverflow(sheet) {
  return sheet.rows.some((row) => row.cells.length > 1 && row.cells.some((cell, columnIndex) => {
    const width = sheet.columns?.[columnIndex]?.width;
    return typeof cell.value === "string" && width !== void 0 && cell.value.length > width * 1.35;
  }));
}
function densityAdaptivePageSetup(sheet, printArea) {
  let pageSetup = sheet.pageSetup ? { ...sheet.pageSetup } : void 0;
  if (!printArea) return pageSetup;
  const used = parseRangeRef(printArea);
  const usedRows = used.endRow - used.startRow + 1;
  const usedColumns = used.endCol - used.startCol + 1;
  const hasDrawings = (sheet.charts?.length ?? 0) + (sheet.images?.length ?? 0) > 0;
  const hasMaterialTextOverflow = sheetHasMaterialTextOverflow(sheet);
  const denseCompactTable = hasMaterialTextOverflow && usedRows >= 10 && !sheet.rows.some((row) => row.cells.length === 0);
  if (pageSetup === void 0 && hasDrawings && usedRows <= 24 && usedColumns <= 12) {
    pageSetup = {
      fitToHeight: 1,
      fitToWidth: 1,
      margins: DEFAULT_FITTED_PAGE_MARGINS,
      orientation: "landscape",
      paperSize: 11,
      printArea
    };
  } else if (pageSetup?.scale === void 0 && pageSetup?.paperSize === void 0 && !hasDrawings && usedRows <= 24 && usedColumns <= 8) {
    pageSetup = {
      ...pageSetup,
      // Auto-configured compact sheets use a single page. Preserve an explicit
      // zero unless material text overflow would otherwise force microtext;
      // that dense compact case is safer as a wrapped one-page table.
      fitToHeight: denseCompactTable ? 1 : pageSetup?.fitToHeight ?? 1,
      fitToWidth: 1,
      orientation: "landscape",
      paperSize: 11,
      printArea
    };
  } else if (usedRows > 24 && pageSetup?.scale === void 0 && pageSetup?.fitToWidth === 1 && pageSetup.fitToHeight === void 0) {
    if (hasDrawings) {
      const maximumChartSpan = Math.max(0, ...(sheet.charts ?? []).map((chart) => (chart.anchor.to?.row ?? chart.anchor.from.row + Math.ceil((chart.height ?? 300) / 20)) - chart.anchor.from.row));
      const compactChartSheet = maximumChartSpan > 0 && sheet.rows.length + maximumChartSpan <= 42;
      pageSetup = { ...pageSetup, fitToHeight: compactChartSheet ? 1 : 0 };
    } else if (usedRows <= 34 && usedColumns > 10) {
      pageSetup = { ...pageSetup, fitToHeight: 1 };
    } else if (usedRows > 32 && usedColumns > 10) {
      pageSetup = { ...pageSetup, fitToHeight: 2 };
    } else if (usedRows > 48) {
      pageSetup = { ...pageSetup, fitToHeight: Math.ceil(usedRows / 48) };
    }
  }
  if (pageSetup?.scale === void 0 && pageSetup?.fitToWidth === 1 && pageSetup.margins === void 0 && (hasDrawings || pageSetup.paperSize === 11 && usedRows >= 6)) {
    pageSetup = { ...pageSetup, margins: DEFAULT_FITTED_PAGE_MARGINS };
  }
  return pageSetup;
}
function printRowExpansionFactor(sheet, defaults, printArea, pageSetup) {
  if (!printArea || pageSetup?.scale !== void 0 || (sheet.images?.length ?? 0) > 0) return 1;
  const hasCharts = (sheet.charts?.length ?? 0) > 0;
  if (hasCharts && pageSetup?.fitToHeight !== 0) return 1;
  const used = parseRangeRef(printArea);
  const usedColumnCount = used.endCol - used.startCol + 1;
  const contentEndRow = hasCharts ? sheet.rows.length - 1 : used.endRow;
  const contentRowCount = contentEndRow - used.startRow + 1;
  const fittedPageCount = typeof pageSetup?.fitToHeight === "number" && pageSetup.fitToHeight > 1 ? pageSetup.fitToHeight : 1;
  if (Math.ceil(contentRowCount / fittedPageCount) > 48) return 1;
  const layout = estimatePrintLayout({
    ...sheet,
    pageSetup: { ...pageSetup, printArea }
  }, defaults);
  const contentHeight = layout.rowHeights.slice(used.startRow, contentEndRow + 1).reduce((sum, height) => sum + height, 0);
  const printedContentHeight = contentHeight / fittedPageCount * Math.max(0.01, layout.scale);
  const hasRepeatedTitles = sheet.pageSetup?.printTitles?.rows !== void 0;
  const hasKeyValueSummary = sheet.rows.slice(0, 10).filter((row) => row.cells.length === 2 && typeof row.cells[0]?.value === "string").length >= 3 && sheet.rows.some((row) => row.cells.length >= 5);
  const compactFittedPage = pageSetup?.paperSize === 11 && pageSetup.fitToHeight === 1;
  const denseCompactFittedPage = compactFittedPage && contentRowCount >= 10 && !sheet.rows.some((row) => row.cells.length === 0);
  const compactTargetFillRatio = denseCompactFittedPage ? 1.4 : 0.95;
  const targetFillRatio = hasCharts ? 0.8 : hasRepeatedTitles ? pageSetup?.orientation === "portrait" ? hasKeyValueSummary ? 1.05 : contentRowCount <= 30 ? 0.99 : 0.94 : 0.82 : pageSetup?.paperSize === 11 && usedColumnCount <= 4 && contentRowCount >= 6 && contentRowCount <= 10 ? usedColumnCount <= 3 ? 1.15 : 1.04 : compactFittedPage ? compactTargetFillRatio : pageSetup?.fitToHeight === 1 ? 0.95 : contentRowCount > 12 ? 0.82 : 0.95;
  const maximumExpansion = !hasCharts && usedColumnCount >= 12 ? 1.6 : denseCompactFittedPage ? 3.75 : pageSetup?.paperSize === 11 && usedColumnCount <= 4 && contentRowCount >= 6 && contentRowCount <= 10 ? usedColumnCount <= 3 ? 4 : 3.2 : 2.75;
  return Math.max(1, Math.min(maximumExpansion, layout.printableHeightPoints * targetFillRatio / Math.max(1, printedContentHeight)));
}
function balancedUnconstrainedTablePages(sheet, pageSetup, printArea, serializedRowHeights, defaults) {
  if (!printArea || pageSetup?.fitToWidth !== 1 || pageSetup.fitToHeight !== 0 || (sheet.charts?.length ?? 0) > 0 || (sheet.images?.length ?? 0) > 0 || sheet.pageSetup?.printTitles?.rows === void 0) return { breaks: [] };
  const used = parseRangeRef(printArea);
  const titleRows = sheet.pageSetup.printTitles.rows;
  const dataStart = Math.max(used.startRow, titleRows.end + 1);
  const dataEnd = Math.min(used.endRow, serializedRowHeights.length - 1);
  if (dataEnd - dataStart + 1 < 24) return { breaks: [] };
  const layout = estimatePrintLayout({ ...sheet, pageSetup: { ...pageSetup, printArea } }, defaults);
  const pageHeight = layout.printableHeightPoints / Math.max(0.1, layout.scale);
  const sumHeights = (start, end) => {
    let total = 0;
    for (let row = start; row <= end; row += 1) total += serializedRowHeights[row] ?? 0;
    return total;
  };
  const preambleHeight = sumHeights(used.startRow, dataStart - 1);
  const repeatedTitleHeight2 = sumHeights(titleRows.start, titleRows.end);
  const dataHeight = sumHeights(dataStart, dataEnd);
  const firstPageCapacity = Math.max(1, pageHeight - preambleHeight);
  const continuationCapacity = Math.max(1, pageHeight - repeatedTitleHeight2);
  let pageCount = 1;
  while (firstPageCapacity + continuationCapacity * (pageCount - 1) < dataHeight && pageCount < dataEnd - dataStart + 1) pageCount += 1;
  if (pageCount <= 1) return { breaks: [] };
  if (pageCount > 1) {
    const compactPageCount = pageCount - 1;
    const compactCapacity = firstPageCapacity + continuationCapacity * (compactPageCount - 1);
    if (dataHeight / compactCapacity <= 1.06) {
      return { breaks: [], fitToHeight: compactPageCount };
    }
  }
  const totalCapacity = firstPageCapacity + continuationCapacity * (pageCount - 1);
  const breaks = [];
  let accumulatedHeight = 0;
  let nextBreakPage = 1;
  for (let row = dataStart; row <= dataEnd && nextBreakPage < pageCount; row += 1) {
    accumulatedHeight += serializedRowHeights[row] ?? 0;
    const capacityThroughPage = firstPageCapacity + continuationCapacity * (nextBreakPage - 1);
    const targetHeight = dataHeight * capacityThroughPage / totalCapacity;
    const remainingRows = dataEnd - row;
    const remainingPages = pageCount - nextBreakPage;
    if (accumulatedHeight >= targetHeight && remainingRows >= remainingPages) {
      breaks.push(row + 1);
      nextBreakPage += 1;
    }
  }
  return { breaks };
}
function getNoRefCellOpenTag(styleAttr, typeAttr) {
  const key = `${typeAttr}|${styleAttr}`;
  const cached = noRefCellOpenTagCache.get(key);
  if (cached !== void 0) {
    return cached;
  }
  const tag = `<c${typeAttr}${styleAttr}><v>`;
  noRefCellOpenTagCache.set(key, tag);
  return tag;
}
function getNoRefCellEmptyTag(styleAttr) {
  const cached = noRefCellEmptyTagCache.get(styleAttr);
  if (cached !== void 0) {
    return cached;
  }
  const tag = `<c${styleAttr}/>`;
  noRefCellEmptyTagCache.set(styleAttr, tag);
  return tag;
}
function getNoRefInlineStringOpenTag(styleAttr) {
  const cached = noRefInlineStringOpenTagCache.get(styleAttr);
  if (cached !== void 0) {
    return cached;
  }
  const tag = `<c t="inlineStr"${styleAttr}>`;
  noRefInlineStringOpenTagCache.set(styleAttr, tag);
  return tag;
}
function serializeSheetPr(sheet, pageSetup = sheet.pageSetup) {
  const parts = [];
  if (sheet.tabColor) {
    parts.push(`<tabColor rgb="FF${sheet.tabColor.replace(/^#/, "").toUpperCase()}"/>`);
  }
  if (pageSetup && (pageSetup.fitToWidth !== void 0 || pageSetup.fitToHeight !== void 0)) {
    parts.push(`<pageSetUpPr fitToPage="1"/>`);
  }
  return parts.length > 0 ? `<sheetPr>${parts.join("")}</sheetPr>` : "";
}
function serializePrintOptions(sheet) {
  const options = sheet.pageSetup?.options;
  if (!options) {
    return "";
  }
  const attributes = [];
  if (options.gridLines !== void 0) {
    attributes.push(`gridLines="${options.gridLines ? 1 : 0}"`);
  }
  if (options.headings !== void 0) {
    attributes.push(`headings="${options.headings ? 1 : 0}"`);
  }
  return attributes.length > 0 ? `<printOptions ${attributes.join(" ")}/>` : "";
}
function serializePageMargins(sheet) {
  const margins = sheet.pageSetup?.margins;
  if (!margins) {
    return "";
  }
  const attributes = [];
  if (margins.left !== void 0) attributes.push(`left="${margins.left}"`);
  if (margins.right !== void 0) attributes.push(`right="${margins.right}"`);
  if (margins.top !== void 0) attributes.push(`top="${margins.top}"`);
  if (margins.bottom !== void 0) attributes.push(`bottom="${margins.bottom}"`);
  if (margins.header !== void 0) attributes.push(`header="${margins.header}"`);
  if (margins.footer !== void 0) attributes.push(`footer="${margins.footer}"`);
  return attributes.length > 0 ? `<pageMargins ${attributes.join(" ")}/>` : "";
}
function serializePageSetup(pageSetup) {
  if (!pageSetup) {
    return "";
  }
  const attributes = [];
  if (pageSetup.paperSize !== void 0) attributes.push(`paperSize="${pageSetup.paperSize}"`);
  if (pageSetup.orientation) attributes.push(`orientation="${pageSetup.orientation}"`);
  if (pageSetup.scale !== void 0) attributes.push(`scale="${pageSetup.scale}"`);
  if (pageSetup.fitToWidth !== void 0) attributes.push(`fitToWidth="${pageSetup.fitToWidth}"`);
  if (pageSetup.fitToHeight !== void 0) attributes.push(`fitToHeight="${pageSetup.fitToHeight}"`);
  return attributes.length > 0 ? `<pageSetup ${attributes.join(" ")}/>` : "";
}
function dateToSerial2(value, dateSystem) {
  return dateToSerialString(value, dateSystem);
}
function serializeRichText(value, cellStyle, defaults) {
  const runs = value.map((run) => {
    const font = normalizeFont({
      ...cellStyle?.font,
      ...run.font
    }, defaults);
    const textAttrs = needsXmlSpacePreserve(run.text) ? ` xml:space="preserve"` : "";
    return `<r>${serializeRichTextRunFont(font)}<t${textAttrs}>${escapeXml(run.text)}</t></r>`;
  }).join("");
  return `<is>${runs}</is>`;
}
function serializeInlineString(value) {
  const sanitized = sanitizeSharedString(value);
  const textAttrs = needsXmlSpacePreserve(sanitized) ? ` xml:space="preserve"` : "";
  return `<is><t${textAttrs}>${escapeXml(sanitized)}</t></is>`;
}
function serializeCell(ref, cell, styleAttr, resolvedStyle, defaults, sheetName, formulaEvaluator, sharedStrings, dateSystem) {
  const refAttr = ref ? ` r="${ref}"` : "";
  const rawFormula = cell.formula;
  if (!rawFormula) {
    if (cell.value === null || cell.value === void 0) {
      if (!styleAttr) {
        return "";
      }
      return refAttr ? `<c${refAttr}${styleAttr}/>` : getNoRefCellEmptyTag(styleAttr);
    }
    if (isRichTextValue(cell.value)) {
      const defaultFont = {
        family: defaults?.font?.family ?? "Calibri",
        size: defaults?.font?.size ?? 11
      };
      return `<c${refAttr} t="inlineStr"${styleAttr}>${serializeRichText(cell.value, resolvedStyle, defaultFont)}</c>`;
    }
    if (isErrorValue(cell.value)) {
      const openTag2 = refAttr ? `<c${refAttr} t="e"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="e"`);
      return `${openTag2}${cell.value.error}</v></c>`;
    }
    if (typeof cell.value === "string") {
      if (sharedStrings) {
        const sharedIndex = sharedStrings.register(cell.value);
        const openTag3 = refAttr ? `<c${refAttr} t="s"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="s"`);
        return `${openTag3}${sharedIndex}</v></c>`;
      }
      const openTag2 = refAttr ? `<c${refAttr} t="inlineStr"${styleAttr}>` : getNoRefInlineStringOpenTag(styleAttr);
      return `${openTag2}${serializeInlineString(cell.value)}</c>`;
    }
    if (typeof cell.value === "boolean") {
      const openTag2 = refAttr ? `<c${refAttr} t="b"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="b"`);
      return `${openTag2}${cell.value ? 1 : 0}</v></c>`;
    }
    if (cell.value instanceof Date) {
      const openTag2 = refAttr ? `<c${refAttr}${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, "");
      return `${openTag2}${dateToSerial2(cell.value, dateSystem)}</v></c>`;
    }
    const openTag = refAttr ? `<c${refAttr}${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, "");
    return `${openTag}${formatNumberForCell(cell.value)}</v></c>`;
  }
  const formula = formulaEvaluator?.getFormulaDefinition(cell) ?? null;
  if (!formula) {
    const rawExpression = typeof rawFormula === "string" ? rawFormula : rawFormula.expression;
    const formulaTag2 = `<f>${escapeXml(rawExpression)}</f>`;
    return `<c${refAttr}${styleAttr}>${formulaTag2}</c>`;
  }
  const cachedValue = formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheetName, ref ?? "");
  const formulaAttributes = [];
  const dynamicAttr = formula.dynamic ? ` cm="1"` : "";
  if (formula.arrayRange) {
    formulaAttributes.push(`t="array"`, `ref="${formula.arrayRange}"`);
  }
  const formulaTag = formulaAttributes.length > 0 ? `<f ${formulaAttributes.join(" ")}>${escapeXml(formula.expression)}</f>` : `<f>${escapeXml(formula.expression)}</f>`;
  if (cachedValue === void 0 || cachedValue === null) {
    return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}</c>`;
  }
  if (isRichTextValue(cachedValue)) {
    const text = cachedValue.map((run) => run.text).join("");
    return `<c${refAttr} t="str"${styleAttr}${dynamicAttr}>${formulaTag}<v>${escapeXml(text)}</v></c>`;
  }
  if (isErrorValue(cachedValue)) {
    return `<c${refAttr} t="e"${styleAttr}${dynamicAttr}>${formulaTag}<v>${cachedValue.error}</v></c>`;
  }
  if (typeof cachedValue === "string") {
    return `<c${refAttr} t="str"${styleAttr}${dynamicAttr}>${formulaTag}<v>${escapeXml(cachedValue)}</v></c>`;
  }
  if (typeof cachedValue === "boolean") {
    return `<c${refAttr} t="b"${styleAttr}${dynamicAttr}>${formulaTag}<v>${cachedValue ? 1 : 0}</v></c>`;
  }
  if (cachedValue instanceof Date) {
    return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}<v>${dateToSerial2(cachedValue, dateSystem)}</v></c>`;
  }
  return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}<v>${formatNumberForCell(cachedValue)}</v></c>`;
}
function resolveStyleAttr(styleRegistry, resolvedStyle, cache) {
  if (!resolvedStyle) {
    return "";
  }
  const cached = cache.get(resolvedStyle);
  if (cached !== void 0) {
    return cached;
  }
  const styleIndex = styleRegistry.registerResolvedStyle(resolvedStyle);
  const styleAttr = styleIndex > 0 ? ` s="${styleIndex}"` : "";
  cache.set(resolvedStyle, styleAttr);
  return styleAttr;
}
function canCacheRawCellStyle(style, value, rowStyle) {
  return rowStyle === void 0 && typeof style === "object" && style !== null && style.preset === void 0 && !(value instanceof Date && style.numberFormat === void 0);
}
function resolveCellStyleBundle(cell, rowStyle, styleRegistry, styleAttrCache, rawStyleCache) {
  if (canCacheRawCellStyle(cell.style, cell.value, rowStyle)) {
    const cached = rawStyleCache.get(cell.style);
    if (cached !== void 0) {
      return cached;
    }
    const resolvedStyle2 = resolveCellStyle(cell.style, cell.value, rowStyle);
    const bundle = {
      resolvedStyle: resolvedStyle2,
      styleAttr: resolveStyleAttr(styleRegistry, resolvedStyle2, styleAttrCache)
    };
    rawStyleCache.set(cell.style, bundle);
    return bundle;
  }
  const resolvedStyle = resolveCellStyle(cell.style, cell.value, rowStyle);
  return {
    resolvedStyle,
    styleAttr: resolveStyleAttr(styleRegistry, resolvedStyle, styleAttrCache)
  };
}
function getDisplayValueForMetrics(cell, formulaEvaluator, sheetName, ref) {
  if (!cell.formula || !formulaEvaluator) {
    return cell.value;
  }
  const formula = formulaEvaluator.getFormulaDefinition(cell);
  if (!formula) {
    return cell.value;
  }
  return formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheetName, ref);
}
function resolveCellOverflowStyle(resolvedStyle, displayValue, columnWidth, defaults, textOverflowMode) {
  if (columnWidth === void 0 || resolvedStyle?.alignment?.wrapText === true || resolvedStyle?.alignment?.shrinkToFit === true) {
    return resolvedStyle;
  }
  const requiredWidth = estimateHeuristicColumnWidth(displayValue, resolvedStyle, defaults);
  if (requiredWidth === void 0 || requiredWidth <= columnWidth) return resolvedStyle;
  if (typeof displayValue === "string" && textOverflowMode !== null && requiredWidth > columnWidth * 1.35) {
    if (textOverflowMode === "wrap") {
      return {
        ...resolvedStyle,
        alignment: {
          ...resolvedStyle?.alignment,
          vertical: resolvedStyle?.alignment?.vertical ?? "top",
          wrapText: true
        }
      };
    }
    return {
      ...resolvedStyle,
      alignment: {
        ...resolvedStyle?.alignment,
        shrinkToFit: true
      }
    };
  }
  if (typeof displayValue !== "number" || requiredWidth <= columnWidth * 1.2) return resolvedStyle;
  return {
    ...resolvedStyle,
    alignment: {
      ...resolvedStyle?.alignment,
      shrinkToFit: true
    }
  };
}
function estimateWrappedCellHeight(cell, resolvedStyle, columnWidth, defaults) {
  if (!resolvedStyle?.alignment?.wrapText) {
    return void 0;
  }
  const displayLength = estimateDisplayLength(cell.value, resolvedStyle);
  if (displayLength === 0) {
    return void 0;
  }
  const charsPerLine = Math.max(1, Math.floor((columnWidth || (defaults?.columnWidth ?? 8.43)) * 1.15));
  const rawText = typeof cell.value === "string" ? cell.value : Array.isArray(cell.value) ? cell.value.map((run) => run.text).join("") : "";
  const explicitLineCount = rawText.length > 0 ? rawText.split(/\r\n|\r|\n/).length : 1;
  const lines = Math.max(explicitLineCount, Math.ceil(displayLength / charsPerLine));
  if (lines <= 1) {
    return void 0;
  }
  const fontSize = resolvedStyle.font?.size ?? defaults?.font?.size ?? 11;
  const estimatedHeight = Math.min(lines * fontSize * 1.6, 409);
  const defaultRowHeight = defaults?.rowHeight ?? 15;
  return estimatedHeight > defaultRowHeight ? estimatedHeight : void 0;
}
function formatFormula(value, type, dateSystem) {
  if (Array.isArray(value)) return `"${value.join(",")}"`;
  if (typeof value === "number") return String(value);
  if (type === "date" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    return dateToSerial2(new Date(value), dateSystem);
  }
  return value;
}
function serializeDataValidations(dataValidations, dateSystem) {
  if (!dataValidations || dataValidations.length === 0) {
    return "";
  }
  return `<dataValidations count="${dataValidations.length}">${dataValidations.map((validation) => {
    const attributes = [
      `sqref="${validation.ref}"`,
      `type="${validation.type}"`
    ];
    if (validation.operator) attributes.push(`operator="${validation.operator}"`);
    attributes.push(`allowBlank="${validation.allowBlank === false ? 0 : 1}"`);
    if (validation.showInputMessage !== void 0) attributes.push(`showInputMessage="${validation.showInputMessage ? 1 : 0}"`);
    attributes.push(`showErrorMessage="${validation.showErrorMessage === false ? 0 : 1}"`);
    if (validation.showDropDown !== void 0) attributes.push(`showDropDown="${validation.showDropDown ? 0 : 1}"`);
    if (validation.errorStyle) attributes.push(`errorStyle="${validation.errorStyle}"`);
    if (validation.errorTitle) attributes.push(`errorTitle="${escapeXml(validation.errorTitle)}"`);
    if (validation.error) attributes.push(`error="${escapeXml(validation.error)}"`);
    if (validation.promptTitle) attributes.push(`promptTitle="${escapeXml(validation.promptTitle)}"`);
    if (validation.prompt) attributes.push(`prompt="${escapeXml(validation.prompt)}"`);
    const f1 = formatFormula(validation.formula1, validation.type, dateSystem);
    const formulas = [`<formula1>${escapeXml(f1)}</formula1>`];
    if (validation.formula2 !== void 0) {
      const f2 = formatFormula(validation.formula2, validation.type, dateSystem);
      formulas.push(`<formula2>${escapeXml(f2)}</formula2>`);
    }
    return `<dataValidation ${attributes.join(" ")}>${formulas.join("")}</dataValidation>`;
  }).join("")}</dataValidations>`;
}
function hashPassword(password) {
  let hash = 0;
  for (let i = password.length - 1; i >= 0; i--) {
    hash = hash >> 14 & 1 | hash << 1 & 32767;
    hash ^= password.charCodeAt(i);
  }
  hash ^= password.length;
  hash ^= 52811;
  return hash.toString(16).toUpperCase().padStart(4, "0");
}
function serializeSheetProtection(protection) {
  if (!protection) {
    return "";
  }
  const attributes = [];
  if (protection.password) {
    attributes.push(`password="${hashPassword(protection.password)}"`);
  }
  const sheetEnabled = protection.sheet !== false;
  attributes.push(`sheet="${sheetEnabled ? "1" : "0"}"`);
  if (protection.objects !== void 0) {
    attributes.push(`objects="${protection.objects ? "1" : "0"}"`);
  }
  if (protection.scenarios !== void 0) {
    attributes.push(`scenarios="${protection.scenarios ? "1" : "0"}"`);
  }
  const protectedByDefault = [
    ["formatCells", "formatCells"],
    ["formatColumns", "formatColumns"],
    ["formatRows", "formatRows"],
    ["insertColumns", "insertColumns"],
    ["insertRows", "insertRows"],
    ["insertHyperlinks", "insertHyperlinks"],
    ["deleteColumns", "deleteColumns"],
    ["deleteRows", "deleteRows"],
    ["sort", "sort"],
    ["autoFilter", "autoFilter"],
    ["pivotTables", "pivotTables"]
  ];
  for (const [key, attr] of protectedByDefault) {
    const value = protection[key];
    if (value !== void 0) {
      attributes.push(`${attr}="${value ? "1" : "0"}"`);
    }
  }
  if (protection.selectLockedCells !== void 0) {
    attributes.push(`selectLockedCells="${protection.selectLockedCells ? "1" : "0"}"`);
  }
  if (protection.selectUnlockedCells !== void 0) {
    attributes.push(`selectUnlockedCells="${protection.selectUnlockedCells ? "1" : "0"}"`);
  }
  return `<sheetProtection ${attributes.join(" ")}/>`;
}
function isEmptyPlaceholderCell(cell) {
  return cell.formula === void 0 && (cell.value === null || cell.value === void 0);
}
function serializesCellWithoutGap(cell) {
  return cell.formula !== void 0 || cell.value !== null && cell.value !== void 0 || cell.style !== void 0;
}
function canInferCellRefFromPosition(cell) {
  return cell.formula === void 0 && cell.hyperlink === void 0 && cell.comment === void 0;
}
function columnNeedsHeuristicWidth2(column) {
  return column?.width === void 0 && column?.bestFit === true;
}
function shouldEstimateWrappedRowHeights(sheet, totalSourceRows, sheetColumnCount, rowExpansionFactor) {
  if (rowExpansionFactor !== 1 || sheet.pageSetup?.printArea || sheet.pageSetup?.fitToHeight !== void 0) {
    return true;
  }
  return totalSourceRows * Math.max(1, sheetColumnCount) <= 1e5;
}
function serializeSheetChunks(sheet, options) {
  const defaultColWidth = String(clampColumnWidth(options.defaults?.columnWidth ?? 8.43));
  const rowChunkSize = Math.min(1e4, Math.max(100, options.rowChunkSize ?? 1e3));
  const sheetColumnCount = getSheetColumnCount(sheet);
  const columnLetters = Array.from({ length: sheetColumnCount }, (_unused, index) => colIndexToLetter(index));
  const tableBindings = options.tableBindings ?? [];
  const pivotTableBindings = options.pivotTableBindings ?? [];
  const dateSystem = options.dateSystem ?? "1900";
  const builder = new SheetXmlBuilder([
    `xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`,
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`
  ]);
  const structure = compileSheetStructure(sheet);
  const printArea = inferredPrintArea(sheet, structure);
  const densityPageSetup = densityAdaptivePageSetup(sheet, printArea);
  const printBounds = printArea === void 0 ? void 0 : parseRangeRef(printArea);
  const usedPrintRows = printBounds === void 0 ? 0 : printBounds.endRow - printBounds.startRow + 1;
  const usedPrintColumns = printBounds === void 0 ? 0 : printBounds.endCol - printBounds.startCol + 1;
  const autoWrapMaterialText = densityPageSetup?.paperSize !== 11 || usedPrintRows >= 10 && !sheet.rows.some((row) => row.cells.length === 0);
  const hasDedicatedChartFollowingData = (sheet.charts ?? []).some((chart) => chart.anchor.from.row >= sheet.rows.length);
  const onePageDashboardWrapColumn = hasDedicatedChartFollowingData && sheet.pageSetup?.fitToHeight === 1 ? (sheet.columns ?? []).findIndex((column, columnIndex) => column.width !== void 0 && column.width >= 24 && sheet.rows.some((row) => {
    const value = row.cells[columnIndex]?.value;
    return typeof value === "string" && value.length > column.width * 1.35;
  })) : -1;
  const explicitColumnWidth = (sheet.columns ?? []).reduce((sum, column) => sum + (column.width ?? 0), 0);
  const hasCompactKeyValueSummary = sheet.rows.slice(0, 10).some((row) => row.cells.length === 2 && typeof row.cells[0]?.value === "string" && row.cells[0].value.length >= 12) && sheet.rows.some((row) => row.cells.length >= 5);
  const semanticMinimumColumnWidths = (sheet.columns ?? []).map((_column, columnIndex) => Math.min(
    30,
    Math.max(0, ...sheet.rows.map((row) => {
      const cell = row.cells[columnIndex];
      const style = typeof cell?.style === "object" && cell.style !== null ? cell.style : void 0;
      const explicitWidth = sheet.columns?.[columnIndex]?.width;
      return typeof cell?.value === "string" && style?.alignment?.horizontal === "right" && explicitWidth !== void 0 && cell.value.length > explicitWidth * 1.6 ? cell.value.length / 1.05 : 0;
    }))
  ));
  const dedicatedDashboardColumnExpansion = hasDedicatedChartFollowingData && usedPrintColumns <= 10 && explicitColumnWidth > 0 ? Math.max(1, Math.min(1.4, 125 / explicitColumnWidth)) : 1;
  const portraitRegisterColumnExpansion = (sheet.charts?.length ?? 0) === 0 && densityPageSetup?.orientation === "portrait" && densityPageSetup.fitToWidth === 1 && densityPageSetup.fitToHeight === 0 && usedPrintRows >= 10 && usedPrintColumns <= 7 && explicitColumnWidth > 0 ? Math.max(1, Math.min(1.8, 105 / explicitColumnWidth)) : 1;
  const columnExpansionFactor = dedicatedDashboardColumnExpansion > 1 ? dedicatedDashboardColumnExpansion : portraitRegisterColumnExpansion > 1 ? portraitRegisterColumnExpansion : densityPageSetup?.paperSize === 11 && densityPageSetup.fitToHeight === 1 && usedPrintRows >= 10 && usedPrintRows <= 24 && usedPrintColumns <= 8 && sheetHasMaterialTextOverflow(sheet) && !sheet.rows.some((row) => row.cells.length === 0) ? 1.55 : densityPageSetup?.fitToHeight === 2 && usedPrintRows <= 48 && usedPrintColumns > 10 && (sheet.charts?.length ?? 0) === 0 && (sheet.images?.length ?? 0) === 0 ? 1.35 : 1;
  const expandedColumnWidth = (width, index) => Math.max(
    width * columnExpansionFactor,
    hasCompactKeyValueSummary && index === 0 ? 18 : 0,
    semanticMinimumColumnWidths[index] ?? 0
  );
  const hasSemanticColumnExpansion = (sheet.columns ?? []).some((column, index) => column.width !== void 0 && (semanticMinimumColumnWidths[index] ?? 0) > column.width);
  const printLayoutSheet = columnExpansionFactor === 1 && !hasCompactKeyValueSummary && !hasSemanticColumnExpansion ? sheet : {
    ...sheet,
    columns: sheet.columns?.map((column, index) => column.width === void 0 ? column : { ...column, width: expandedColumnWidth(column.width, index) })
  };
  const rowExpansionFactor = printRowExpansionFactor(
    printLayoutSheet,
    options.defaults,
    printArea,
    densityPageSetup
  );
  const hasChartDrawings = (sheet.charts?.length ?? 0) > 0;
  const defaultRowHeight = String((options.defaults?.rowHeight ?? 15) * (hasChartDrawings ? 1 : rowExpansionFactor));
  const sheetViewAttributes = [`workbookViewId="0"`];
  if (options.selected) {
    sheetViewAttributes.push(`tabSelected="1"`);
  }
  if (sheet.rightToLeft) {
    sheetViewAttributes.push(`rightToLeft="1"`);
  }
  const freezePane = sheet.freezePane;
  if ((freezePane?.row ?? 0) > 0 || (freezePane?.col ?? 0) > 0) {
    const xSplit = freezePane && freezePane.col > 0 ? ` xSplit="${freezePane.col}"` : "";
    const ySplit = freezePane && freezePane.row > 0 ? ` ySplit="${freezePane.row}"` : "";
    const topLeftCell = cellRef(freezePane?.row ?? 0, freezePane?.col ?? 0);
    const activePane = freezePane && freezePane.row > 0 && freezePane.col > 0 ? "bottomRight" : freezePane && freezePane.row > 0 ? "bottomLeft" : "topRight";
    builder.setSheetViews(
      `<sheetViews><sheetView ${sheetViewAttributes.join(" ")}><pane${xSplit}${ySplit} topLeftCell="${topLeftCell}" activePane="${activePane}" state="frozen"/><selection pane="${activePane}" activeCell="${topLeftCell}" sqref="${topLeftCell}"/></sheetView></sheetViews>`
    );
  } else {
    builder.setSheetViews(`<sheetViews><sheetView ${sheetViewAttributes.join(" ")}/></sheetViews>`);
  }
  const dimensionRef = structure.maxCol >= 0 && structure.maxRow >= 0 ? structure.maxCol === 0 && structure.maxRow === 0 ? cellRef(0, 0) : absRangeRef(0, 0, structure.maxRow, structure.maxCol).replaceAll("$", "") : "A1";
  builder.setDimension(`<dimension ref="${dimensionRef}"/>`);
  builder.setSheetFormatPr(`<sheetFormatPr defaultRowHeight="${defaultRowHeight}" defaultColWidth="${defaultColWidth}"/>`);
  const columnCount = getSheetColumnCount(sheet);
  const computedColumns = Array.from(
    { length: columnCount },
    (_unused, index) => {
      const explicit = sheet.columns?.[index];
      return explicit?.width !== void 0 ? { width: clampColumnWidth(expandedColumnWidth(explicit.width, index)), bestFit: explicit.bestFit ?? false } : void 0;
    }
  );
  const hyperlinkParts = [];
  const collectedComments = [];
  const worksheetRelationships = [];
  const styleAttrCache = /* @__PURE__ */ new WeakMap();
  const rawCellStyleCache = /* @__PURE__ */ new WeakMap();
  const syntheticTableCellsByRow = buildWorksheetSyntheticTableCells(tableBindings);
  const syntheticRowIndices = [...syntheticTableCellsByRow.keys()];
  const maxSyntheticRowIndex = syntheticRowIndices.length > 0 ? Math.max(...syntheticRowIndices) : -1;
  const totalSourceRows = Math.max(sheet.rows.length, maxSyntheticRowIndex + 1);
  const estimateWrappedRowHeights = shouldEstimateWrappedRowHeights(
    sheet,
    totalSourceRows,
    sheetColumnCount,
    rowExpansionFactor
  );
  const rowChunks = [];
  let chunkStartRowNumber = 0;
  let chunkEndRowNumber = 0;
  let chunkSourceRowCount = 0;
  let chunkSerializedRowCount = 0;
  let chunkCellCount = 0;
  let chunkXml = "";
  let totalSerializedRows = 0;
  let totalCellsWritten = 0;
  const serializedRowHeights = Array.from(
    { length: totalSourceRows },
    () => Number(defaultRowHeight)
  );
  const canUseSimpleRowPath = syntheticTableCellsByRow.size === 0 && structure.mergeRanges.length === 0 && structure.rows.length === sheet.rows.length && structure.rows.every((structuredRow, rowIndex) => structuredRow.row === rowIndex && structuredRow.cells.length === (sheet.rows[rowIndex]?.cells.length ?? 0) && structuredRow.cells.every((entry, columnIndex) => entry.col === columnIndex));
  const flushChunk = () => {
    if (chunkSourceRowCount === 0) {
      return;
    }
    const xml = chunkXml;
    rowChunks.push({
      startRowNumber: chunkStartRowNumber,
      endRowNumber: chunkEndRowNumber,
      sourceRowCount: chunkSourceRowCount,
      serializedRowCount: chunkSerializedRowCount,
      cellCount: chunkCellCount,
      byteLength: Buffer.byteLength(xml, "utf8"),
      xml
    });
    chunkStartRowNumber = 0;
    chunkEndRowNumber = 0;
    chunkSourceRowCount = 0;
    chunkSerializedRowCount = 0;
    chunkCellCount = 0;
    chunkXml = "";
  };
  const positionedRowMap = canUseSimpleRowPath ? void 0 : new Map(structure.rows.map((row) => [row.row, row]));
  const originRowMap = canUseSimpleRowPath ? void 0 : new Map(structure.originCells.map((row) => [row.row, row]));
  const headerRowStyle = resolveCellStyle(sheet.styling?.headerRow, void 0);
  const alternateOddStyle = resolveCellStyle(sheet.styling?.alternateRows?.odd, void 0);
  const alternateEvenStyle = resolveCellStyle(sheet.styling?.alternateRows?.even, void 0);
  for (let rowIndex = 0; rowIndex < totalSourceRows; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? { cells: [] };
    const mergedCells = canUseSimpleRowPath ? [] : (() => {
      const positionedRow = positionedRowMap?.get(rowIndex) ?? { row: rowIndex, cells: [] };
      const syntheticCells = syntheticTableCellsByRow.get(rowIndex) ?? [];
      const cellMap = new Map(
        positionedRow.cells.map((entry) => [entry.col, entry])
      );
      syntheticCells.forEach((entry) => {
        const existing = cellMap.get(entry.col);
        if (!existing || isEmptyPlaceholderCell(existing.cell)) {
          cellMap.set(entry.col, {
            col: entry.col,
            cell: entry.cell
          });
        }
      });
      return [...cellMap.values()].sort((left, right) => left.col - right.col);
    })();
    const rowNumber = rowIndex + 1;
    if (chunkSourceRowCount === 0) {
      chunkStartRowNumber = rowNumber;
    }
    chunkEndRowNumber = rowNumber;
    chunkSourceRowCount += 1;
    const rowStyle = rowIndex === 0 ? headerRowStyle : rowNumber % 2 === 0 ? alternateEvenStyle : alternateOddStyle;
    let cellXml = "";
    let cellCount = 0;
    const preserveCompactSpacerHeight = row.height === void 0 && rowExpansionFactor > 1 && row.cells.length === 0;
    const expandChartTableRow = row.height === void 0 && hasChartDrawings && rowExpansionFactor > 1 && row.cells.length > 0;
    let estimatedHeight = row.height === void 0 ? preserveCompactSpacerHeight || expandChartTableRow ? (options.defaults?.rowHeight ?? 15) * (expandChartTableRow ? rowExpansionFactor : 1) : void 0 : row.height * rowExpansionFactor;
    let adjustedHeight = row.height !== void 0 || preserveCompactSpacerHeight || expandChartTableRow;
    const originColumns = canUseSimpleRowPath ? void 0 : new Set((originRowMap?.get(rowIndex)?.cells ?? []).map((cell) => cell.col));
    const canOmitCellRefs = canUseSimpleRowPath && row.cells.length >= 16 && row.cells.every((cell) => serializesCellWithoutGap(cell) && canInferCellRefFromPosition(cell));
    if (canUseSimpleRowPath) {
      for (let col = 0; col < row.cells.length; col += 1) {
        const cell = row.cells[col];
        const needsColumnWidth = columnNeedsHeuristicWidth2(sheet.columns?.[col]);
        const needsWrappedHeight = estimateWrappedRowHeights && row.height === void 0;
        const needsRef = !canOmitCellRefs || cell.hyperlink !== void 0 || cell.comment !== void 0 || options.formulaEvaluator !== null && cell.formula !== void 0;
        let fallbackRef;
        const getFallbackRef = () => {
          if (fallbackRef === void 0) {
            fallbackRef = `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`;
          }
          return fallbackRef;
        };
        const ref = needsRef ? getFallbackRef() : void 0;
        const styleBundle = resolveCellStyleBundle(
          cell,
          rowStyle,
          options.styleRegistry,
          styleAttrCache,
          rawCellStyleCache
        );
        const resolvedStyle = resolveCellOverflowStyle(
          styleBundle.resolvedStyle,
          getDisplayValueForMetrics(cell, options.formulaEvaluator, sheet.name, ref ?? getFallbackRef()),
          sheet.columns?.[col]?.width === void 0 ? void 0 : computedColumns[col]?.width,
          options.defaults,
          (cell.colSpan ?? 1) !== 1 || row.cells.length <= 1 ? null : hasDedicatedChartFollowingData ? col === onePageDashboardWrapColumn ? "wrap" : "shrink" : autoWrapMaterialText ? densityPageSetup?.fitToHeight === 1 && usedPrintColumns < 8 ? "wrap" : "shrink" : null
        );
        const styleAttr = resolvedStyle === styleBundle.resolvedStyle ? styleBundle.styleAttr : resolveStyleAttr(options.styleRegistry, resolvedStyle, styleAttrCache);
        const serialized = serializeCell(
          ref,
          cell,
          styleAttr,
          resolvedStyle,
          options.defaults,
          sheet.name,
          options.formulaEvaluator,
          options.sharedStrings,
          dateSystem
        );
        if (serialized) {
          cellXml += serialized;
          cellCount += 1;
        }
        let displayValue;
        if (needsColumnWidth || needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          displayValue = getDisplayValueForMetrics(
            cell,
            options.formulaEvaluator,
            sheet.name,
            ref ?? getFallbackRef()
          );
        }
        if (needsColumnWidth) {
          const heuristicWidth = estimateHeuristicColumnWidth(
            displayValue,
            resolvedStyle,
            options.defaults
          );
          if (heuristicWidth !== void 0) {
            const existing = computedColumns[col];
            if (!existing || heuristicWidth > existing.width) {
              computedColumns[col] = {
                width: heuristicWidth,
                bestFit: true
              };
            }
          }
        }
        if (cell.hyperlink) {
          const hyperlink = normalizeHyperlink(cell.hyperlink);
          const attributes = [`ref="${ref}"`];
          if (hyperlink.display) {
            attributes.push(`display="${escapeXml(hyperlink.display)}"`);
          }
          if (hyperlink.tooltip) {
            attributes.push(`tooltip="${escapeXml(hyperlink.tooltip)}"`);
          }
          if (hyperlink.mode === "internal") {
            attributes.push(`location="${escapeXml(hyperlink.location)}"`);
          } else {
            const relationshipId = `rId${worksheetRelationships.length + 1}`;
            worksheetRelationships.push({
              id: relationshipId,
              target: hyperlink.target,
              type: "hyperlink"
            });
            attributes.push(`r:id="${relationshipId}"`);
          }
          hyperlinkParts.push(`<hyperlink ${attributes.join(" ")}/>`);
        }
        if (cell.comment) {
          collectedComments.push({
            ref,
            row: rowIndex,
            col,
            author: cell.comment.author,
            text: cell.comment.text
          });
        }
        if (needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          const wrappedHeight = estimateWrappedCellHeight(
            { ...cell, value: displayValue },
            resolvedStyle,
            Array.from({ length: cell.colSpan ?? 1 }, (_unused, offset) => computedColumns[col + offset]?.width ?? (options.defaults?.columnWidth ?? 8.43)).reduce((sum, width) => sum + width, 0),
            options.defaults
          );
          if (wrappedHeight !== void 0) {
            estimatedHeight = Math.max(
              estimatedHeight ?? (options.defaults?.rowHeight ?? 15) * rowExpansionFactor,
              wrappedHeight * rowExpansionFactor
            );
            adjustedHeight = true;
          }
        }
      }
    } else {
      for (const { cell, col } of mergedCells) {
        let ref;
        const isOriginCell = originColumns?.has(col) === true;
        const needsColumnWidth = isOriginCell && columnNeedsHeuristicWidth2(sheet.columns?.[col]);
        const needsWrappedHeight = estimateWrappedRowHeights && row.height === void 0;
        const needsRef = !canOmitCellRefs || isOriginCell && (cell.hyperlink !== void 0 || cell.comment !== void 0) || options.formulaEvaluator !== null && cell.formula !== void 0;
        const ensureRef = () => {
          if (ref === void 0) {
            ref = `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`;
          }
          return ref;
        };
        const styleBundle = resolveCellStyleBundle(
          cell,
          rowStyle,
          options.styleRegistry,
          styleAttrCache,
          rawCellStyleCache
        );
        const resolvedStyle = resolveCellOverflowStyle(
          styleBundle.resolvedStyle,
          getDisplayValueForMetrics(
            cell,
            options.formulaEvaluator,
            sheet.name,
            needsRef ? ensureRef() : `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`
          ),
          sheet.columns?.[col]?.width === void 0 ? void 0 : computedColumns[col]?.width,
          options.defaults,
          (cell.colSpan ?? 1) !== 1 || mergedCells.length <= 1 ? null : hasDedicatedChartFollowingData ? col === onePageDashboardWrapColumn ? "wrap" : "shrink" : autoWrapMaterialText ? densityPageSetup?.fitToHeight === 1 && usedPrintColumns < 8 ? "wrap" : "shrink" : null
        );
        const styleAttr = resolvedStyle === styleBundle.resolvedStyle ? styleBundle.styleAttr : resolveStyleAttr(options.styleRegistry, resolvedStyle, styleAttrCache);
        const serialized = serializeCell(
          needsRef ? ensureRef() : void 0,
          cell,
          styleAttr,
          resolvedStyle,
          options.defaults,
          sheet.name,
          options.formulaEvaluator,
          options.sharedStrings,
          dateSystem
        );
        if (serialized) {
          cellXml += serialized;
          cellCount += 1;
        }
        let displayValue;
        const getDisplayValue = () => {
          if (displayValue === void 0) {
            displayValue = getDisplayValueForMetrics(
              cell,
              options.formulaEvaluator,
              sheet.name,
              needsRef ? ensureRef() : `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`
            );
          }
          return displayValue;
        };
        if (needsColumnWidth) {
          const heuristicWidth = estimateHeuristicColumnWidth(
            getDisplayValue(),
            resolvedStyle,
            options.defaults
          );
          if (heuristicWidth !== void 0) {
            const existing = computedColumns[col];
            if (!existing || heuristicWidth > existing.width) {
              computedColumns[col] = {
                width: heuristicWidth,
                bestFit: true
              };
            }
          }
        }
        if (isOriginCell && cell.hyperlink) {
          const refValue = ensureRef();
          const hyperlink = normalizeHyperlink(cell.hyperlink);
          const attributes = [`ref="${refValue}"`];
          if (hyperlink.display) {
            attributes.push(`display="${escapeXml(hyperlink.display)}"`);
          }
          if (hyperlink.tooltip) {
            attributes.push(`tooltip="${escapeXml(hyperlink.tooltip)}"`);
          }
          if (hyperlink.mode === "internal") {
            attributes.push(`location="${escapeXml(hyperlink.location)}"`);
          } else {
            const relationshipId = `rId${worksheetRelationships.length + 1}`;
            worksheetRelationships.push({
              id: relationshipId,
              target: hyperlink.target,
              type: "hyperlink"
            });
            attributes.push(`r:id="${relationshipId}"`);
          }
          hyperlinkParts.push(`<hyperlink ${attributes.join(" ")}/>`);
        }
        if (isOriginCell && cell.comment) {
          collectedComments.push({
            ref: ensureRef(),
            row: rowIndex,
            col,
            author: cell.comment.author,
            text: cell.comment.text
          });
        }
        if (needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          const wrappedHeight = estimateWrappedCellHeight(
            { ...cell, value: getDisplayValue() },
            resolvedStyle,
            Array.from({ length: cell.colSpan ?? 1 }, (_unused, offset) => computedColumns[col + offset]?.width ?? (options.defaults?.columnWidth ?? 8.43)).reduce((sum, width) => sum + width, 0),
            options.defaults
          );
          if (wrappedHeight !== void 0) {
            estimatedHeight = Math.max(
              estimatedHeight ?? (options.defaults?.rowHeight ?? 15) * rowExpansionFactor,
              wrappedHeight * rowExpansionFactor
            );
            adjustedHeight = true;
          }
        }
      }
    }
    serializedRowHeights[rowIndex] = row.hidden ? 0 : estimatedHeight ?? Number(defaultRowHeight);
    const shouldSerializeRow = cellCount > 0 || row.hidden || estimatedHeight !== void 0;
    if (!shouldSerializeRow) {
      continue;
    }
    const canOmitRowRef = canOmitCellRefs && totalSourceRows >= LARGE_ROW_REF_OMISSION_THRESHOLD && !adjustedHeight && !row.hidden;
    if (canOmitRowRef) {
      chunkXml += `${SIMPLE_ROW_OPEN_TAG}${cellXml}${SIMPLE_ROW_CLOSE_TAG}`;
    } else if (!adjustedHeight && !row.hidden) {
      chunkXml += `<row r="${rowNumber}">${cellXml}</row>`;
    } else {
      const rowAttributes = [`r="${rowNumber}"`];
      if (estimatedHeight !== void 0 && adjustedHeight) {
        rowAttributes.push(`ht="${estimatedHeight}"`, `customHeight="1"`);
      }
      if (row.hidden) {
        rowAttributes.push(`hidden="1"`);
      }
      chunkXml += `<row ${rowAttributes.join(" ")}>${cellXml}</row>`;
    }
    chunkSerializedRowCount += 1;
    totalSerializedRows += 1;
    chunkCellCount += cellCount;
    totalCellsWritten += cellCount;
    if (chunkSourceRowCount >= rowChunkSize) {
      flushChunk();
    }
  }
  flushChunk();
  const columnLayout = buildColumnLayout(printLayoutSheet, computedColumns, options.defaults);
  if (columnLayout.segments.length > 0) {
    builder.setCols(`<cols>${columnLayout.segments.map((segment) => {
      const attributes = [`min="${segment.start}"`, `max="${segment.end}"`, `width="${segment.width}"`];
      if (segment.customWidth) attributes.push(`customWidth="1"`);
      if (segment.hidden) attributes.push(`hidden="1"`);
      if (segment.bestFit) attributes.push(`bestFit="1"`);
      return `<col ${attributes.join(" ")}/>`;
    }).join("")}</cols>`);
  }
  const densityAwareSheet = densityPageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: densityPageSetup };
  const autoFitToWidth = densityPageSetup?.scale === void 0 && densityPageSetup?.fitToWidth === void 0 && sheetExceedsPrintableWidth(densityAwareSheet, options.defaults);
  const widthAwarePageSetup = autoFitToWidth ? { ...densityPageSetup, fitToWidth: 1, fitToHeight: densityPageSetup?.fitToHeight ?? 0 } : densityPageSetup;
  const effectivePageSetup = densityAdaptivePageSetup(
    widthAwarePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: widthAwarePageSetup },
    printArea
  );
  const sheetPr = serializeSheetPr(sheet, effectivePageSetup);
  if (sheetPr) {
    builder.setSheetPr(sheetPr);
  }
  if (structure.autoFilterRef) {
    builder.setAutoFilter(`<autoFilter ref="${structure.autoFilterRef}"/>`);
  }
  const sheetProtectionXml = serializeSheetProtection(sheet.protection);
  if (sheetProtectionXml) {
    builder.setSheetProtection(sheetProtectionXml);
  }
  if (structure.mergeRanges.length > 0) {
    builder.setMergeCells(
      `<mergeCells count="${structure.mergeRanges.length}">${structure.mergeRanges.map((merge) => `<mergeCell ref="${merge.ref}"/>`).join("")}</mergeCells>`
    );
  }
  const conditionalFormatting = serializeConditionalFormatting(sheet.conditionalFormatting, options.styleRegistry);
  if (conditionalFormatting.xml) {
    builder.addConditionalFormatting(conditionalFormatting.xml);
  }
  if (conditionalFormatting.extLst) {
    builder.setExtLst(conditionalFormatting.extLst);
  }
  const dataValidations = serializeDataValidations(sheet.dataValidations, dateSystem);
  if (dataValidations) {
    builder.setDataValidations(dataValidations);
  }
  if (hyperlinkParts.length > 0) {
    builder.setHyperlinks(`<hyperlinks>${hyperlinkParts.join("")}</hyperlinks>`);
  }
  const printOptions = serializePrintOptions(sheet);
  if (printOptions) {
    builder.setPrintOptions(printOptions);
  }
  const pageMargins = serializePageMargins(
    effectivePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: effectivePageSetup }
  );
  if (pageMargins) {
    builder.setPageMargins(pageMargins);
  }
  const candidateRowBreaks = chartSafeRowBreaks(
    effectivePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: effectivePageSetup },
    options.defaults
  );
  const balancedTablePages = balancedUnconstrainedTablePages(
    printLayoutSheet,
    effectivePageSetup,
    printArea,
    serializedRowHeights,
    options.defaults
  );
  const rowBreaks = [.../* @__PURE__ */ new Set([
    ...(sheet.charts?.length ?? 0) > 0 || hasCompactKeyValueSummary ? candidateRowBreaks : [],
    ...balancedTablePages.breaks
  ])].sort((left, right) => left - right);
  const pageSetupWithManualBalance = rowBreaks.length > 0 && (sheet.charts?.length ?? 0) === 0 && typeof effectivePageSetup?.fitToHeight === "number" && effectivePageSetup.fitToHeight > 1 && hasCompactKeyValueSummary && sheet.pageSetup?.fitToHeight !== effectivePageSetup.fitToHeight ? { ...effectivePageSetup, fitToHeight: 0 } : effectivePageSetup;
  const pageSetup = serializePageSetup(
    balancedTablePages.fitToHeight === void 0 ? pageSetupWithManualBalance : { ...pageSetupWithManualBalance, fitToHeight: balancedTablePages.fitToHeight }
  );
  if (pageSetup) {
    builder.setPageSetup(pageSetup);
  }
  if (rowBreaks.length > 0) {
    const breaks = rowBreaks.map((row) => `<brk id="${row}" min="0" max="16383" man="1"/>`).join("");
    builder.setRowBreaks(`<rowBreaks count="${rowBreaks.length}" manualBreakCount="${rowBreaks.length}">${breaks}</rowBreaks>`);
  }
  if (tableBindings.length > 0) {
    const tableParts = tableBindings.map((binding) => {
      const relationshipId = `rId${worksheetRelationships.length + 1}`;
      worksheetRelationships.push({
        id: relationshipId,
        target: `../tables/${binding.partName}`,
        type: "table"
      });
      return `<tablePart r:id="${relationshipId}"/>`;
    });
    builder.setTableParts(`<tableParts count="${tableParts.length}">${tableParts.join("")}</tableParts>`);
  }
  if (pivotTableBindings.length > 0) {
    pivotTableBindings.forEach((binding) => {
      const relationshipId = `rId${worksheetRelationships.length + 1}`;
      worksheetRelationships.push({
        id: relationshipId,
        target: `../pivotTables/${binding.partName}`,
        type: "pivotTable"
      });
    });
  }
  if (collectedComments.length > 0) {
    const sheetNumber = options.sheetIndex + 1;
    const commentRelId = `rId${worksheetRelationships.length + 1}`;
    worksheetRelationships.push({
      id: commentRelId,
      target: `../comments${sheetNumber}.xml`,
      type: "comment"
    });
    const vmlRelId = `rId${worksheetRelationships.length + 1}`;
    worksheetRelationships.push({
      id: vmlRelId,
      target: `../drawings/vmlDrawing${sheetNumber}.vml`,
      type: "vmlDrawing"
    });
    builder.setLegacyDrawing(`<legacyDrawing r:id="${vmlRelId}"/>`);
  }
  const hasImages = sheet.images && sheet.images.length > 0;
  const hasCharts = sheet.charts && sheet.charts.length > 0;
  if (hasImages || hasCharts) {
    const drawingRelId = `rId${worksheetRelationships.length + 1}`;
    const sheetNumber = options.sheetIndex + 1;
    worksheetRelationships.push({
      id: drawingRelId,
      target: `../drawings/drawing${sheetNumber}.xml`,
      type: "drawing"
    });
    builder.setDrawing(`<drawing r:id="${drawingRelId}"/>`);
  }
  const envelope = builder.buildSheetDataEnvelope();
  return {
    prefix: envelope.prefix,
    suffix: envelope.suffix,
    rowChunks,
    comments: collectedComments,
    metrics: {
      totalRowsWritten: totalSourceRows,
      totalSerializedRows,
      totalCellsWritten,
      chunkCount: rowChunks.length
    },
    autoFilterRef: structure.autoFilterRef,
    printArea,
    printTitles: sheet.pageSetup?.printTitles,
    relationships: worksheetRelationships.length > 0 ? serializeWorksheetRelationships(worksheetRelationships) : void 0
  };
}

// src/styles/component-registry.ts
function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, stableNormalize(entry)]));
  }
  return value;
}
function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}
var ComponentRegistry = class {
  constructor(seedEntries = [], keyFn = stableStringify) {
    this.keyFn = keyFn;
    for (const entry of seedEntries) {
      this.register(entry);
    }
  }
  entries = [];
  keyMap = /* @__PURE__ */ new Map();
  refMap = /* @__PURE__ */ new WeakMap();
  register(entry) {
    if (entry && typeof entry === "object") {
      const cached = this.refMap.get(entry);
      if (cached !== void 0) {
        return cached;
      }
    }
    const key = this.keyFn(entry);
    const existing = this.keyMap.get(key);
    if (existing !== void 0) {
      if (entry && typeof entry === "object") {
        this.refMap.set(entry, existing);
      }
      return existing;
    }
    const index = this.entries.length;
    this.entries.push(entry);
    this.keyMap.set(key, index);
    if (entry && typeof entry === "object") {
      this.refMap.set(entry, index);
    }
    return index;
  }
  get size() {
    return this.entries.length;
  }
  get values() {
    return this.entries;
  }
};

// src/styles/fill-serializer.ts
var NONE_FILL = { type: "pattern", patternType: "none" };
var GRAY125_FILL = { type: "pattern", patternType: "gray125" };
function serializeFill(fill) {
  if (fill.patternType === "none" || fill.patternType === "gray125") {
    return `<fill><patternFill patternType="${fill.patternType}"/></fill>`;
  }
  const patternType = fill.patternType ?? (fill.type === "pattern" ? "darkGray" : "solid");
  const parts = [`<fill><patternFill patternType="${patternType}">`];
  if (fill.fgColor) {
    parts.push(`<fgColor ${serializeColorAttributes(fill.fgColor)}/>`);
  }
  if (fill.type !== "solid" && fill.bgColor) {
    parts.push(`<bgColor ${serializeColorAttributes(fill.bgColor)}/>`);
  }
  parts.push("</patternFill></fill>");
  return parts.join("");
}
function serializeDxfFill(fill) {
  if (!fill?.fgColor && !fill?.bgColor) {
    return "";
  }
  const color = fill.bgColor ?? fill.fgColor;
  if (!color) {
    return "";
  }
  return `<fill><patternFill><bgColor ${serializeColorAttributes(color)}/></patternFill></fill>`;
}

// src/styles/border-serializer.ts
var EMPTY_BORDER = {};
function serializeEdge(name, edge) {
  if (!edge) {
    return "";
  }
  const parts = [`<${name} style="${edge.style}">`];
  if (edge.color) {
    parts.push(`<color ${serializeColorAttributes(edge.color)}/>`);
  }
  parts.push(`</${name}>`);
  return parts.join("");
}
function serializeBorder(border) {
  const diagonalUp = border.diagonal?.direction === "up" || border.diagonal?.direction === "both" ? ` diagonalUp="1"` : "";
  const diagonalDown = border.diagonal?.direction === "down" || border.diagonal?.direction === "both" ? ` diagonalDown="1"` : "";
  const left = serializeEdge("left", border.left);
  const right = serializeEdge("right", border.right);
  const top = serializeEdge("top", border.top);
  const bottom = serializeEdge("bottom", border.bottom);
  const diagonal = serializeEdge("diagonal", border.diagonal);
  if (!diagonalUp && !diagonalDown && !left && !right && !top && !bottom && !diagonal) {
    return "<border/>";
  }
  return [
    `<border${diagonalUp}${diagonalDown}>`,
    left,
    right,
    top,
    bottom,
    diagonal,
    `</border>`
  ].join("");
}
function serializeDxfBorder(border) {
  if (!border) {
    return "";
  }
  return serializeBorder(border);
}

// src/styles/numfmt-registry.ts
var BUILT_IN_FORMATS = /* @__PURE__ */ new Map([
  ["General", 0],
  ["0", 1],
  ["0.00", 2],
  ["#,##0", 3],
  ["#,##0.00", 4],
  ["0%", 9],
  ["0.00%", 10],
  ["0.00E+00", 11],
  ["# ?/?", 12],
  ["# ??/??", 13],
  ["mm-dd-yy", 14],
  ["d-mmm-yy", 15],
  ["d-mmm", 16],
  ["mmm-yy", 17],
  ["h:mm AM/PM", 18],
  ["h:mm:ss AM/PM", 19],
  ["h:mm", 20],
  ["h:mm:ss", 21],
  ["m/d/yy h:mm", 22],
  ["#,##0 ;(#,##0)", 37],
  ["#,##0 ;[Red](#,##0)", 38],
  ["#,##0.00;(#,##0.00)", 39],
  ["#,##0.00;[Red](#,##0.00)", 40],
  ["mm:ss", 45],
  ["[h]:mm:ss", 46],
  ["mmss.0", 47],
  ["##0.0E+0", 48],
  ["@", 49]
]);
var NumFmtRegistry = class {
  customFormats = /* @__PURE__ */ new Map();
  nextCustomId = 164;
  register(formatCode) {
    if (!formatCode) {
      return 0;
    }
    const builtIn = BUILT_IN_FORMATS.get(formatCode);
    if (builtIn !== void 0) {
      return builtIn;
    }
    const existing = this.customFormats.get(formatCode);
    if (existing !== void 0) {
      return existing;
    }
    const id = this.nextCustomId;
    this.customFormats.set(formatCode, id);
    this.nextCustomId += 1;
    return id;
  }
  toXml() {
    if (this.customFormats.size === 0) {
      return "";
    }
    const parts = [`<numFmts count="${this.customFormats.size}">`];
    for (const [formatCode, id] of this.customFormats) {
      parts.push(`<numFmt numFmtId="${id}" formatCode="${escapeXml(formatCode)}"/>`);
    }
    parts.push(`</numFmts>`);
    return parts.join("");
  }
};

// src/styles/style-registry.ts
function fontKey(font) {
  return [
    font.family,
    font.size,
    font.bold ? 1 : 0,
    font.italic ? 1 : 0,
    font.underline === true ? "single" : font.underline ?? "",
    font.strikethrough ? 1 : 0,
    font.color ?? "",
    font.vertAlign ?? "",
    font.charset ?? "",
    font.familyClassification ?? "",
    font.scheme ?? ""
  ].join("|");
}
function fillKey(fill) {
  return [
    fill.type,
    fill.patternType ?? "",
    fill.fgColor ?? "",
    fill.bgColor ?? "",
    fill.color ?? ""
  ].join("|");
}
function edgeKey(edge) {
  if (!edge) {
    return "";
  }
  return `${edge.style}:${edge.color ?? ""}`;
}
function borderKey(border) {
  return [
    edgeKey(border.left),
    edgeKey(border.right),
    edgeKey(border.top),
    edgeKey(border.bottom),
    border.diagonal ? `${border.diagonal.style}:${border.diagonal.color ?? ""}:${border.diagonal.direction ?? ""}` : ""
  ].join("|");
}
function alignmentKey(alignment) {
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
    alignment.readingOrder ?? ""
  ].join("|");
}
function protectionKey(protection) {
  if (!protection) {
    return "";
  }
  return [
    protection.locked === void 0 ? "" : protection.locked ? 1 : 0,
    protection.hidden === void 0 ? "" : protection.hidden ? 1 : 0
  ].join("|");
}
function cellXfKey(xf) {
  return [
    xf.numFmtId,
    xf.fontId,
    xf.fillId,
    xf.borderId,
    xf.xfId,
    alignmentKey(xf.alignment),
    protectionKey(xf.protection)
  ].join("|");
}
function styleKey(style) {
  return [
    style.numberFormat ?? "",
    style.font ? fontKey({
      family: style.font.family ?? "",
      size: style.font.size ?? 0,
      bold: style.font.bold,
      italic: style.font.italic,
      underline: style.font.underline,
      strikethrough: style.font.strikethrough,
      color: style.font.color,
      vertAlign: style.font.vertAlign,
      charset: style.font.charset
    }) : "",
    style.fill ? fillKey(style.fill) : "",
    style.border ? borderKey(style.border) : "",
    alignmentKey(style.alignment),
    protectionKey(style.protection)
  ].join("||");
}
var DEFAULT_FONT_FAMILY = "Calibri";
var DEFAULT_FONT_SIZE = 11;
var DEFAULT_FONT = {
  family: DEFAULT_FONT_FAMILY,
  size: DEFAULT_FONT_SIZE,
  color: "theme:1",
  familyClassification: 2,
  scheme: "minor"
};
var DEFAULT_XF = {
  numFmtId: 0,
  fontId: 0,
  fillId: 0,
  borderId: 0,
  xfId: 0
};
function serializeAlignment(alignment) {
  if (!alignment) {
    return "";
  }
  const attributes = [];
  if (alignment.horizontal) attributes.push(`horizontal="${alignment.horizontal}"`);
  if (alignment.vertical) attributes.push(`vertical="${alignment.vertical}"`);
  if (alignment.wrapText) attributes.push(`wrapText="1"`);
  if (alignment.textRotation !== void 0) attributes.push(`textRotation="${alignment.textRotation}"`);
  if (alignment.indent !== void 0) attributes.push(`indent="${alignment.indent}"`);
  if (alignment.shrinkToFit) attributes.push(`shrinkToFit="1"`);
  if (alignment.readingOrder !== void 0) attributes.push(`readingOrder="${alignment.readingOrder}"`);
  return attributes.length > 0 ? `<alignment ${attributes.join(" ")}/>` : "";
}
function serializeProtection(protection) {
  if (!protection) {
    return "";
  }
  const attributes = [];
  if (protection.locked !== void 0) attributes.push(`locked="${protection.locked ? 1 : 0}"`);
  if (protection.hidden !== void 0) attributes.push(`hidden="${protection.hidden ? 1 : 0}"`);
  return attributes.length > 0 ? `<protection ${attributes.join(" ")}/>` : "";
}
function serializeCellXf(xf) {
  const attributes = [
    `numFmtId="${xf.numFmtId}"`,
    `fontId="${xf.fontId}"`,
    `fillId="${xf.fillId}"`,
    `borderId="${xf.borderId}"`
  ];
  if (xf.xfId !== 0) {
    attributes.push(`xfId="${xf.xfId}"`);
  }
  const alignment = serializeAlignment(xf.alignment);
  const protection = serializeProtection(xf.protection);
  if (!alignment && !protection) {
    return `<xf ${attributes.join(" ")}/>`;
  }
  return `<xf ${attributes.join(" ")}>${alignment}${protection}</xf>`;
}
function normalizeFont2(font, defaults) {
  return {
    family: font?.family ?? defaults?.font?.family ?? DEFAULT_FONT_FAMILY,
    size: font?.size ?? defaults?.font?.size ?? DEFAULT_FONT_SIZE,
    bold: font?.bold,
    italic: font?.italic,
    underline: font?.underline,
    strikethrough: font?.strikethrough,
    color: font?.color,
    vertAlign: font?.vertAlign,
    charset: font?.charset
  };
}
var StyleRegistry = class {
  constructor(defaults) {
    this.defaults = defaults;
    const seededDefaultFont = {
      ...DEFAULT_FONT,
      family: defaults?.font?.family ?? DEFAULT_FONT.family,
      size: defaults?.font?.size ?? DEFAULT_FONT.size
    };
    this.defaultFontFamily = seededDefaultFont.family;
    this.defaultFontSize = seededDefaultFont.size;
    this.fontRegistry = new ComponentRegistry([seededDefaultFont], fontKey);
    this.fillRegistry = new ComponentRegistry([NONE_FILL, GRAY125_FILL], fillKey);
    this.borderRegistry = new ComponentRegistry([EMPTY_BORDER], borderKey);
    this.cellXfRegistry = new ComponentRegistry([DEFAULT_XF], cellXfKey);
    this.dxfRegistry = new ComponentRegistry([], styleKey);
  }
  fontRegistry;
  fillRegistry;
  borderRegistry;
  numFmtRegistry = new NumFmtRegistry();
  cellXfRegistry;
  dxfRegistry;
  styleIndexCache = /* @__PURE__ */ new WeakMap();
  dxfIndexCache = /* @__PURE__ */ new WeakMap();
  defaultFontFamily;
  defaultFontSize;
  registerStyle(styleInput, cellValue) {
    const style = resolveCellStyle(styleInput, cellValue);
    return this.registerResolvedStyle(style);
  }
  registerResolvedStyle(style) {
    if (!style) {
      return 0;
    }
    const cached = this.styleIndexCache.get(style);
    if (cached !== void 0) {
      return cached;
    }
    const numFmtId = this.numFmtRegistry.register(style.numberFormat);
    const fontDef = normalizeFont2(style.font, this.defaults);
    const fontId = fontDef.family === this.defaultFontFamily && fontDef.size === this.defaultFontSize && !fontDef.bold && !fontDef.italic && !fontDef.underline && !fontDef.strikethrough && !fontDef.color && !fontDef.vertAlign && fontDef.charset === void 0 ? 0 : this.fontRegistry.register(fontDef);
    const fillDef = normalizeFill(style.fill);
    const fillId = fillDef ? this.fillRegistry.register(fillDef) : 0;
    const borderId = style.border ? this.borderRegistry.register(style.border) : 0;
    const xf = {
      numFmtId,
      fontId,
      fillId,
      borderId,
      xfId: 0,
      alignment: style.alignment,
      protection: style.protection
    };
    const index = this.cellXfRegistry.register(xf);
    this.styleIndexCache.set(style, index);
    return index;
  }
  registerDxf(styleInput) {
    const style = resolveCellStyle(styleInput, void 0);
    if (!style) {
      return 0;
    }
    const cached = this.dxfIndexCache.get(style);
    if (cached !== void 0) {
      return cached;
    }
    const index = this.dxfRegistry.register(style);
    this.dxfIndexCache.set(style, index);
    return index;
  }
  getDefaultFont() {
    return this.fontRegistry.values[0] ?? DEFAULT_FONT;
  }
  get cellStyleCount() {
    return this.cellXfRegistry.size;
  }
  get differentialStyleCount() {
    return this.dxfRegistry.values.length;
  }
  toXml() {
    const dxfs = this.dxfRegistry.values;
    return [
      XML_DECLARATION,
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
      this.numFmtRegistry.toXml(),
      `<fonts count="${this.fontRegistry.size}">${this.fontRegistry.values.map((font) => serializeFont(font)).join("")}</fonts>`,
      `<fills count="${this.fillRegistry.size}">${this.fillRegistry.values.map((fill) => serializeFill(fill)).join("")}</fills>`,
      `<borders count="${this.borderRegistry.size}">${this.borderRegistry.values.map((border) => serializeBorder(border)).join("")}</borders>`,
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`,
      `<cellXfs count="${this.cellXfRegistry.size}">${this.cellXfRegistry.values.map((xf) => serializeCellXf(xf)).join("")}</cellXfs>`,
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`,
      dxfs.length === 0 ? `<dxfs count="0"/>` : `<dxfs count="${dxfs.length}">${dxfs.map((style) => {
        const font = style.font ? `<font>${serializeFont(normalizeFont2(style.font, this.defaults)).replace(/^<font>|<\/font>$/g, "")}</font>` : "";
        const fill = serializeDxfFill(normalizeFill(style.fill));
        const border = serializeDxfBorder(style.border);
        const numFmt = style.numberFormat ? `<numFmt numFmtId="0" formatCode="${escapeXml(style.numberFormat)}"/>` : "";
        const alignment = serializeAlignment(style.alignment);
        return `<dxf>${numFmt}${font}${fill}${border}${alignment}</dxf>`;
      }).join("")}</dxfs>`,
      `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>`,
      `</styleSheet>`
    ].join("");
  }
};

// src/workers/sheet-serializer-worker.ts
if (!parentPort) {
  throw new Error("XLSX sheet serializer worker requires parentPort");
}
parentPort.on("message", (request) => {
  try {
    const artifacts = request.tasks.map((task) => serializeSheetChunks(task.sheet, {
      dateSystem: task.dateSystem,
      defaults: task.defaults,
      formulaEvaluator: null,
      rowChunkSize: task.rowChunkSize,
      selected: task.selected,
      sheetIndex: task.sheetIndex,
      stringStrategy: task.stringStrategy,
      styleRegistry: new StyleRegistry(task.defaults)
    }));
    parentPort.postMessage({
      id: request.id,
      ok: true,
      artifacts
    });
  } catch (error) {
    parentPort.postMessage({
      id: request.id,
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      }
    });
  }
});
//# sourceMappingURL=sheet-serializer-worker.js.map
