import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  EMOJI_FONT_FILES,
  UNICODE_FALLBACK_FILES
} from "./chunk-ERFVAWW7.js";
import {
  calculateRichTextMetrics
} from "./chunk-7BYJLCSM.js";
import {
  getCachedFontBuffer,
  resolveRegistryFont
} from "./chunk-BVMCDLHW.js";
import {
  getFontOrNull
} from "./chunk-IQGCGBYO.js";
import {
  getActiveContext,
  getLogger
} from "./chunk-MV7M6AY2.js";

// src/renderer/fontBridge.ts
import { existsSync } from "node:fs";
var HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? "";
var SYSTEM_FONT_DIRS_MAC = [
  ...HOME_DIR ? [`${HOME_DIR}/Library/Fonts`] : [],
  "/System/Library/Fonts/Supplemental",
  "/Library/Fonts",
  "/System/Library/Fonts"
];
var SYSTEM_FONT_DIRS_WIN = [
  ...HOME_DIR ? [`${HOME_DIR}\\AppData\\Local\\Microsoft\\Windows\\Fonts`] : [],
  "C:\\Windows\\Fonts"
];
var SYSTEM_FONT_DIRS_LINUX = [
  ...HOME_DIR ? [`${HOME_DIR}/.local/share/fonts`, `${HOME_DIR}/.fonts`] : [],
  "/usr/share/fonts/truetype/dejavu",
  "/usr/share/fonts/truetype/liberation",
  "/usr/share/fonts/truetype",
  "/usr/share/fonts"
];
var FontBridgeManager = class {
  registeredFaces = /* @__PURE__ */ new Set();
  registerFontFamily(fontFamily, GlobalFonts, identity) {
    const registrationKey = `${fontFamily}\0${identity?.sha256 ?? identity?.face ?? "system"}`;
    if (this.registeredFaces.has(registrationKey)) return true;
    const registryAsset = identity ? identity.source === "registry" ? resolveRegistryFont(identity.family, identity.face) : null : resolveRegistryFont(fontFamily, "Regular");
    const sharedBuffer = identity?.source === "system" ? null : getCachedFontBuffer(identity?.sha256) ?? registryAsset?.buffer;
    if (sharedBuffer) {
      try {
        GlobalFonts.register(sharedBuffer, identity?.family ?? registryAsset?.family ?? fontFamily);
        this.registeredFaces.add(registrationKey);
        return true;
      } catch (err) {
        getLogger().warn?.(`[fontBridge] Failed to register shared buffer for "${fontFamily}": ${err instanceof Error ? err.message : err}`);
        return false;
      }
    }
    if (identity && identity.source !== "system") return false;
    const fontPath = resolveSystemFontPath(fontFamily);
    if (!fontPath) {
      getLogger().warn?.(`[fontBridge] Font "${fontFamily}" not found on system \u2014 text will use fallback font`);
      return false;
    }
    try {
      GlobalFonts.registerFromPath(fontPath, fontFamily);
      this.registeredFaces.add(registrationKey);
      return true;
    } catch (err) {
      getLogger().warn?.(`[fontBridge] Failed to register font "${fontFamily}" from ${fontPath}: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }
};
var defaultManager = new FontBridgeManager();
function resolveSystemFontPath(fontFamily) {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN : SYSTEM_FONT_DIRS_LINUX;
  const candidates = [
    `${fontFamily}.ttf`,
    `${fontFamily}-Regular.ttf`,
    `${fontFamily} Regular.ttf`,
    `${fontFamily}.otf`,
    `${fontFamily}-Regular.otf`
  ];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}
function registerFontFamily(fontFamily, GlobalFonts, identity) {
  const ctx = getActiveContext();
  const mgr = ctx?.fontBridge ?? defaultManager;
  return mgr.registerFontFamily(fontFamily, GlobalFonts, identity);
}
var unicodeFallbackRegistered = false;
function ensureUnicodeFallbackRegistered(GlobalFonts) {
  if (unicodeFallbackRegistered) return;
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN : SYSTEM_FONT_DIRS_LINUX;
  for (const file of UNICODE_FALLBACK_FILES) {
    for (const dir of dirs) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "PaperFallback");
          unicodeFallbackRegistered = true;
          return;
        } catch {
        }
      }
    }
  }
  if (process.platform === "darwin") {
    for (const file of UNICODE_FALLBACK_FILES) {
      const p = `/System/Library/Fonts/Supplemental/${file}`;
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "PaperFallback");
          unicodeFallbackRegistered = true;
          return;
        } catch {
        }
      }
    }
  }
}
var emojiFontRegistered = false;
function ensureEmojiFontRegistered(GlobalFonts) {
  if (emojiFontRegistered) return;
  for (const { file, dirs } of EMOJI_FONT_FILES) {
    for (const dir of dirs) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "PaperEmoji");
          emojiFontRegistered = true;
          return;
        } catch {
        }
      }
    }
  }
}
function ensureFontsRegistered(node, GlobalFonts) {
  ensureUnicodeFallbackRegistered(GlobalFonts);
  ensureEmojiFontRegistered(GlobalFonts);
  const families = /* @__PURE__ */ new Map();
  collectFonts(node, families);
  for (const { family, identity } of families.values()) {
    registerFontFamily(family, GlobalFonts, identity);
  }
}
function addFont(families, family, identity) {
  const key = `${family}\0${identity?.sha256 ?? identity?.face ?? "default"}`;
  families.set(key, { family, identity });
}
function collectFonts(node, families) {
  if (node.style?.fontFamily) addFont(families, node.style.fontFamily, node.style.resolvedFont);
  if (node.textStyle?.fontFamily) addFont(families, node.textStyle.fontFamily, node.textStyle.resolvedFont);
  collectFromRuns(node.content, families);
  collectFromParagraphs(node.paragraphs, families);
  collectFromRuns(node.textContent, families);
  collectFromParagraphs(node.textParagraphs, families);
  collectNestedFonts(node.chartData, families);
  if (node.tableData?.rows) {
    for (const row of node.tableData.rows) {
      for (const cell of row.cells ?? []) {
        if (cell.style?.fontFamily) addFont(families, cell.style.fontFamily, cell.style.resolvedFont);
        collectFromRuns(cell.content, families);
        collectFromParagraphs(cell.paragraphs, families);
      }
    }
    if (node.tableData.style?.headerRowStyle?.fontFamily) {
      const header = node.tableData.style.headerRowStyle;
      addFont(families, header.fontFamily, header.resolvedFont);
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectFonts(child, families);
    }
  }
}
function collectNestedFonts(value, families, seen = /* @__PURE__ */ new Set()) {
  if (!value || typeof value !== "object" || Buffer.isBuffer(value) || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectNestedFonts(item, families, seen);
    return;
  }
  const record = value;
  for (const [key, nested] of Object.entries(record)) {
    if ((key === "fontFamily" || key.endsWith("FontFamily")) && typeof nested === "string") {
      addFont(families, nested, record[`${key}ResolvedFont`] ?? record.resolvedFont);
    } else {
      collectNestedFonts(nested, families, seen);
    }
  }
}
function collectFromRuns(content, families) {
  if (!Array.isArray(content)) return;
  for (const run of content) {
    if (run?.style?.fontFamily) addFont(families, run.style.fontFamily, run.style.resolvedFont);
  }
}
function collectFromParagraphs(paragraphs, families) {
  if (!Array.isArray(paragraphs)) return;
  for (const para of paragraphs) {
    collectFromRuns(para?.runs, families);
  }
}

// src/typography/tableAutoSize.ts
function cellToRuns(cell) {
  if (cell.paragraphs && cell.paragraphs.length > 0) {
    return cell.paragraphs.flatMap((p) => p.runs);
  }
  if (cell.content && Array.isArray(cell.content)) {
    return cell.content;
  }
  if (typeof cell.text === "string" && cell.text.length > 0) {
    return [{ text: cell.text }];
  }
  return [];
}
function charCountWidth(cell, fontSize, fontWeight) {
  const isBold = fontWeight === "bold";
  const charWidthFactor = isBold ? 0.65 : 0.6;
  const runs = cellToRuns(cell);
  return runs.reduce((max, run) => {
    const runFontSize = run.style?.fontSize ?? fontSize;
    const runBold = (run.style?.fontWeight ?? (isBold ? "bold" : "normal")) === "bold";
    const factor = runBold ? 0.65 : 0.6;
    return Math.max(max, run.text.length * runFontSize * factor);
  }, (cell.text ?? "").length * fontSize * charWidthFactor);
}
function hasFontData(runs, defaultFontFamily) {
  const checked = /* @__PURE__ */ new Set();
  const families = [
    defaultFontFamily ?? "Helvetica",
    ...runs.map((r) => r.style?.fontFamily).filter(Boolean)
  ];
  for (const fam of families) {
    if (!checked.has(fam)) {
      checked.add(fam);
      if (getFontOrNull(fam)) return true;
    }
  }
  return false;
}
function estimateCellTextWidth(cell, defaultFontSize = 16) {
  const fontSize = cell.style?.fontSize ?? defaultFontSize;
  const fontFamily = cell.style?.fontFamily;
  const fontWeight = cell.style?.fontWeight;
  const defaultStyle = { fontSize, fontFamily, fontWeight };
  const runs = cellToRuns(cell);
  if (runs.length === 0) return 0;
  if (!hasFontData(runs, fontFamily)) {
    return charCountWidth(cell, fontSize, fontWeight);
  }
  if (cell.paragraphs && cell.paragraphs.length > 1) {
    let maxWidth = 0;
    for (const para of cell.paragraphs) {
      if (para.runs.length === 0) continue;
      const metrics = calculateRichTextMetrics(para.runs, defaultStyle);
      maxWidth = Math.max(maxWidth, metrics.width);
    }
    return maxWidth;
  }
  return calculateRichTextMetrics(runs, defaultStyle).width;
}
var MIN_COLUMN_WIDTH = 30;
function autoSizeTableColumns(tableData, containerWidth) {
  const colCount = tableData.columns.length;
  if (colCount === 0) return [];
  if (tableData.autoFit === "distribute") {
    const colWidth = containerWidth / colCount;
    return new Array(colCount).fill(colWidth);
  }
  const maxWidths = new Array(colCount).fill(0);
  for (const row of tableData.rows) {
    let colIdx = 0;
    for (const cell of row.cells) {
      if (colIdx >= colCount) break;
      if (cell.vMerge || cell.hMerge) {
        colIdx++;
        continue;
      }
      const cellWidth = estimateCellTextWidth(cell);
      const padding = cell.style?.padding ?? 5;
      const totalWidth = cellWidth + padding * 2;
      const span = cell.colSpan ?? 1;
      if (span === 1) {
        maxWidths[colIdx] = Math.max(maxWidths[colIdx], totalWidth);
      } else {
        const perCol = totalWidth / span;
        for (let s = 0; s < span && colIdx + s < colCount; s++) {
          maxWidths[colIdx + s] = Math.max(maxWidths[colIdx + s], perCol);
        }
      }
      colIdx += span;
    }
  }
  for (let i = 0; i < colCount; i++) {
    maxWidths[i] = Math.max(maxWidths[i], MIN_COLUMN_WIDTH);
  }
  const totalContentWidth = maxWidths.reduce((sum, w) => sum + w, 0);
  if (totalContentWidth <= 0) {
    const colWidth = containerWidth / colCount;
    return new Array(colCount).fill(colWidth);
  }
  const scale = containerWidth / totalContentWidth;
  return maxWidths.map((w) => w * scale);
}

// src/typography/tableLayout.ts
var DEFAULT_FONT_SIZE = 12;
var DEFAULT_PADDING = 5;
var MIN_ROW_HEIGHT = 18;
var HEIGHT_TOLERANCE = 0.5;
function cellToRuns2(cell) {
  if (cell.paragraphs && cell.paragraphs.length > 0) {
    const runs = [];
    cell.paragraphs.forEach((paragraph, index) => {
      runs.push(...paragraph.runs);
      if (index < cell.paragraphs.length - 1) {
        runs.push({ text: "\n" });
      }
    });
    return runs;
  }
  if (cell.content && Array.isArray(cell.content)) {
    return cell.content;
  }
  if (typeof cell.text === "string" && cell.text.length > 0) {
    return [{ text: cell.text }];
  }
  return [];
}
function spanWidth(columns, start, span) {
  let width = 0;
  for (let offset = 0; offset < span && start + offset < columns.length; offset += 1) {
    width += columns[start + offset] ?? 0;
  }
  return width;
}
function estimateCellHeight(cell, availableWidth) {
  const padding = cell.style?.padding ?? DEFAULT_PADDING;
  const fontSize = cell.style?.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = fontSize * 1.2;
  const textWidth = Math.max(1, availableWidth - padding * 2);
  const runs = cellToRuns2(cell);
  if (runs.length === 0) {
    return {
      availableWidth: textWidth,
      naturalHeight: Math.max(MIN_ROW_HEIGHT, lineHeight + padding * 2),
      lineCount: 1
    };
  }
  const metrics = calculateRichTextMetrics(runs, {
    fontSize,
    fontFamily: cell.style?.fontFamily,
    fontWeight: cell.style?.fontWeight,
    fontStyle: cell.style?.fontStyle,
    color: cell.style?.color
  }, textWidth);
  const lineCount = Math.max(1, Math.ceil(metrics.height / Math.max(1, lineHeight)));
  return {
    availableWidth: textWidth,
    naturalHeight: Math.max(MIN_ROW_HEIGHT, metrics.height + padding * 2),
    lineCount
  };
}
function rowDeclaredMinimum(row, tableData) {
  return Math.max(MIN_ROW_HEIGHT, row.minHeight ?? 0, tableData.rowLayout?.minRowHeight ?? 0);
}
function resolveTableColumns(tableData, tableWidth) {
  if (tableData.autoFit && tableData.columns.length > 0) {
    return autoSizeTableColumns(tableData, tableWidth);
  }
  const declaredTotal = tableData.columns.reduce((sum, width) => sum + width, 0);
  if (declaredTotal > 0 && Math.abs(declaredTotal - tableWidth) > HEIGHT_TOLERANCE) {
    const scale = tableWidth / declaredTotal;
    return tableData.columns.map((width) => width * scale);
  }
  return tableData.columns;
}
function planTableLayout(tableData, tableWidth, tableHeight) {
  const columns = resolveTableColumns(tableData, tableWidth);
  const rows = tableData.rows;
  const diagnosticsRows = [];
  let totalNaturalHeight = 0;
  rows.forEach((row, rowIndex) => {
    let colIndex = 0;
    const cellDiagnostics = [];
    let naturalHeight = rowDeclaredMinimum(row, tableData);
    for (const cell of row.cells) {
      if (colIndex >= columns.length) break;
      const span = Math.max(1, cell.colSpan ?? 1);
      const width = spanWidth(columns, colIndex, span);
      const cellFit = estimateCellHeight(cell, width);
      naturalHeight = Math.max(naturalHeight, cellFit.naturalHeight);
      cellDiagnostics.push({
        colIndex,
        availableWidth: cellFit.availableWidth,
        availableHeight: 0,
        naturalHeight: cellFit.naturalHeight,
        lineCount: cellFit.lineCount
      });
      colIndex += span;
    }
    const minHeight = rowDeclaredMinimum(row, tableData);
    const assignedHeight = Math.max(naturalHeight, minHeight, row.height ?? 0);
    totalNaturalHeight += naturalHeight;
    diagnosticsRows.push({
      rowIndex,
      assignedHeight,
      naturalHeight,
      declaredHeight: row.height,
      minHeight,
      compressed: assignedHeight + HEIGHT_TOLERANCE < naturalHeight || assignedHeight + HEIGHT_TOLERANCE < minHeight,
      cells: cellDiagnostics
    });
  });
  const totalAssignedBeforeFill = diagnosticsRows.reduce((sum, row) => sum + row.assignedHeight, 0);
  const fillMode = tableData.rowLayout?.mode !== "natural";
  if (fillMode && rows.length > 0 && totalAssignedBeforeFill < tableHeight - HEIGHT_TOLERANCE) {
    const extraPerRow = (tableHeight - totalAssignedBeforeFill) / rows.length;
    for (const row of diagnosticsRows) {
      row.assignedHeight += extraPerRow;
    }
  }
  for (const row of diagnosticsRows) {
    for (const cell of row.cells) {
      cell.availableHeight = Math.max(0, row.assignedHeight - DEFAULT_PADDING * 2);
    }
  }
  const totalAssignedHeight = diagnosticsRows.reduce((sum, row) => sum + row.assignedHeight, 0);
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    tableWidth,
    tableHeight,
    totalAssignedHeight,
    totalNaturalHeight,
    fillsFrame: totalAssignedHeight >= tableHeight - HEIGHT_TOLERANCE,
    overfull: totalAssignedHeight > tableHeight + HEIGHT_TOLERANCE,
    compressedRows: diagnosticsRows.filter((row) => row.compressed).map((row) => row.rowIndex),
    rows: diagnosticsRows
  };
}

export {
  FontBridgeManager,
  ensureFontsRegistered,
  resolveTableColumns,
  planTableLayout
};
//# sourceMappingURL=chunk-IC35FUMW.js.map
