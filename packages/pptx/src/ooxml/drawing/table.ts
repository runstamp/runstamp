// src/ooxml/drawing/table.ts
import type { LayoutTable } from "../../layout/extract.js";
import type { TableCell, TableCellStyle, TableCellBorder, TableStyle, ColorValue, GradientFill, TextStyle } from "../../types/ast.js";
import { toEmu, emitColorXml, emitColorWithAlpha, cssAngleToOoxml } from "./math.js";
import {
  escapeXmlAttr,
  normalizeToParagraphsFromFields,
  emitParagraphsXml,
  type HyperlinkRel,
} from "./textUtils.js";
import { planTableLayout, resolveTableColumns } from "../../typography/tableLayout.js";
import { getLogger } from "../../logger.js";
import { isLiteBundle } from "../../engineMode.js";

export interface TableEmitResult {
  xml: string;
  hyperlinkRels: HyperlinkRel[];
}

const VERTICAL_ALIGN_MAP: Record<string, string> = {
  top: "t",
  middle: "ctr",
  bottom: "b",
};

function emitCellBorder(border: TableCellBorder, tagName: string): string {
  const w = toEmu(border.width ?? 1);
  const color = border.color ?? "#000000";
  return `<${tagName} w="${w}" cap="flat" cmpd="sng"><a:solidFill>${emitColorXml(color)}</a:solidFill><a:prstDash val="solid"/></${tagName}>`;
}

function resolveEffectiveCellStyle(
  cell: TableCell,
  rowIndex: number,
  colIndex: number,
  totalRows: number,
  totalCols: number,
  tableStyle?: TableStyle,
): TableCellStyle | undefined {
  if (!tableStyle) return cell.style;

  // Start with band style
  let resolved: TableCellStyle = {};

  // Band rows
  if (tableStyle.bandRow) {
    // Skip header row for banding (row 0 if firstRow is true)
    const bandStart = tableStyle.firstRow ? 1 : 0;
    if (rowIndex >= bandStart) {
      const bandIndex = rowIndex - bandStart;
      if (bandIndex % 2 === 0 && tableStyle.bandRowOddStyle) {
        resolved = { ...resolved, ...tableStyle.bandRowOddStyle };
      } else if (bandIndex % 2 === 1 && tableStyle.bandRowEvenStyle) {
        resolved = { ...resolved, ...tableStyle.bandRowEvenStyle };
      }
    }
  }

  // First/last row
  if (tableStyle.firstRow && rowIndex === 0 && tableStyle.headerRowStyle) {
    resolved = { ...resolved, ...tableStyle.headerRowStyle };
  }
  if (tableStyle.lastRow && rowIndex === totalRows - 1 && tableStyle.footerRowStyle) {
    resolved = { ...resolved, ...tableStyle.footerRowStyle };
  }

  // First/last column
  if (tableStyle.firstCol && colIndex === 0 && tableStyle.firstColStyle) {
    resolved = { ...resolved, ...tableStyle.firstColStyle };
  }
  if (tableStyle.lastCol && colIndex === totalCols - 1 && tableStyle.lastColStyle) {
    resolved = { ...resolved, ...tableStyle.lastColStyle };
  }

  // Table-level borders
  if (tableStyle.outerBorder || tableStyle.innerBorderH || tableStyle.innerBorderV) {
    const borders = { ...resolved.borders };

    // Outer borders
    if (tableStyle.outerBorder) {
      if (rowIndex === 0) borders.top = borders.top ?? tableStyle.outerBorder;
      if (rowIndex === totalRows - 1) borders.bottom = borders.bottom ?? tableStyle.outerBorder;
      if (colIndex === 0) borders.left = borders.left ?? tableStyle.outerBorder;
      if (colIndex === totalCols - 1) borders.right = borders.right ?? tableStyle.outerBorder;
    }

    // Inner borders
    if (tableStyle.innerBorderH) {
      if (rowIndex > 0) borders.top = borders.top ?? tableStyle.innerBorderH;
      if (rowIndex < totalRows - 1) borders.bottom = borders.bottom ?? tableStyle.innerBorderH;
    }
    if (tableStyle.innerBorderV) {
      if (colIndex > 0) borders.left = borders.left ?? tableStyle.innerBorderV;
      if (colIndex < totalCols - 1) borders.right = borders.right ?? tableStyle.innerBorderV;
    }

    if (Object.keys(borders).length > 0) {
      resolved.borders = borders;
    }
  }

  // Explicit cell style wins (override everything)
  if (cell.style) {
    resolved = { ...resolved, ...cell.style };
    // Merge borders carefully
    if (cell.style.borders) {
      resolved.borders = { ...resolved.borders, ...cell.style.borders };
    }
  }

  return Object.keys(resolved).length > 0 ? resolved : undefined;
}

function emitTcPr(style?: TableCellStyle): string {
  if (!style) return `            <a:tcPr/>\n`;

  const attrs: string[] = [];

  // Vertical alignment
  if (style.verticalAlign) {
    attrs.push(`anchor="${VERTICAL_ALIGN_MAP[style.verticalAlign] || "t"}"`);
  }

  // Text direction
  if (style.textDirection && style.textDirection !== "horizontal") {
    const vertMap: Record<string, string> = { vertical: "vert270", verticalEA: "eaVert" };
    attrs.push(`vert="${vertMap[style.textDirection]}"`);
  }

  // Padding (uniform)
  if (style.padding !== undefined) {
    const pad = toEmu(style.padding);
    attrs.push(`marL="${pad}" marR="${pad}" marT="${pad}" marB="${pad}"`);
  }

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  // Check if we need children
  const hasBorders = style.borders && (style.borders.top || style.borders.right || style.borders.bottom || style.borders.left || style.borders.diagonalDown || style.borders.diagonalUp);
  const hasFill = style.fill !== undefined;

  if (!hasBorders && !hasFill) {
    return `            <a:tcPr${attrStr}/>\n`;
  }

  let xml = `            <a:tcPr${attrStr}>\n`;

  // Borders
  if (style.borders) {
    if (style.borders.left) xml += `              ${emitCellBorder(style.borders.left, "a:lnL")}\n`;
    if (style.borders.right) xml += `              ${emitCellBorder(style.borders.right, "a:lnR")}\n`;
    if (style.borders.top) xml += `              ${emitCellBorder(style.borders.top, "a:lnT")}\n`;
    if (style.borders.bottom) xml += `              ${emitCellBorder(style.borders.bottom, "a:lnB")}\n`;
    // Phase 5: Diagonal borders
    if (style.borders.diagonalDown) xml += `              ${emitCellBorder(style.borders.diagonalDown, "a:lnTlToBr")}\n`;
    if (style.borders.diagonalUp) xml += `              ${emitCellBorder(style.borders.diagonalUp, "a:lnBlToTr")}\n`;
  }

  // Fill — solid or gradient
  if (style.fill !== undefined) {
    if (typeof style.fill === "object" && "type" in style.fill) {
      // Gradient fill
      const gf = style.fill as GradientFill;
      xml += `              <a:gradFill><a:gsLst>`;
      for (const stop of gf.stops) {
        const pos = Math.min(100000, Math.max(0, Math.round(stop.position * 1000)));
        xml += `<a:gs pos="${pos}">${stop.alpha !== undefined ? emitColorWithAlpha(stop.color, stop.alpha) : emitColorXml(stop.color)}</a:gs>`;
      }
      xml += `</a:gsLst>`;
      if (gf.type === "linear") {
        const ang = cssAngleToOoxml(gf.angle ?? 180);
        xml += `<a:lin ang="${ang}" scaled="1"/>`;
      } else {
        xml += `<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>`;
      }
      xml += `</a:gradFill>\n`;
    } else {
      xml += `              <a:solidFill>${emitColorXml(style.fill as ColorValue)}</a:solidFill>\n`;
    }
  }

  xml += `            </a:tcPr>\n`;
  return xml;
}

/**
 * Emits cell text content. Three modes:
 * 1. paragraphs (richest) — multi-paragraph rich text
 * 2. content (TextRun[]) — rich text runs
 * 3. text (string) — plain text with optional cell style formatting
 */
function emitCellText(
  cell: TableCell,
  hyperlinkRels: HyperlinkRel[],
  hyperlinkRIdCounter: { current: number },
  effectiveStyle?: TableCellStyle,
): string {
  const style = effectiveStyle ?? cell.style;
  const rtlCol = style?.rtl ? "1" : "0";
  const textStyle: TextStyle | undefined = style ? {
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontFallback: style.fontFallback,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    textAlign: style.textAlign,
    rtl: style.rtl,
    lang: style.lang,
  } : undefined;

  // Rich text modes
  if (cell.paragraphs || cell.content) {
    const paragraphs = normalizeToParagraphsFromFields(
      cell.content,
      cell.paragraphs,
    );

    let xml = `            <a:txBody>\n`;
    xml += `              <a:bodyPr rtlCol="${rtlCol}" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>\n`;
    xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);
    xml += `            </a:txBody>\n`;
    return xml;
  }

  // Plain text mode
  const text = cell.text ?? "";
  const paragraphs = normalizeToParagraphsFromFields(
    [{ text }],
    undefined,
  ).map((paragraph) => ({
    ...paragraph,
    align: style?.textAlign,
    rtl: style?.rtl,
  }));

  let xml = `            <a:txBody>\n`;
  xml += `              <a:bodyPr rtlCol="${rtlCol}" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>\n`;
  xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);
  xml += `            </a:txBody>\n`;
  return xml;
}

export function generateTableXml(
  node: LayoutTable,
  shapeId: number,
  hyperlinkRIdStart: number = 200,
): TableEmitResult {
  const { x, y, width, height } = node.layout;
  const tableData = node.tableData;
  const tablePlan = tableData ? planTableLayout(tableData, width, height) : undefined;
  const frameHeight = tablePlan ? Math.max(height, tablePlan.totalAssignedHeight) : height;
  const columns = tableData ? resolveTableColumns(tableData, width) : [];
  const rows = tableData?.rows ?? [];

  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Table ${shapeId}`;
  const altText = node.altText;

  const hyperlinkRels: HyperlinkRel[] = [];
  const hyperlinkRIdCounter = { current: hyperlinkRIdStart };

  let xml = `<p:graphicFrame>\n`;
  xml += `  <p:nvGraphicFramePr>\n`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>\n`;
  xml += `    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>\n`;
  xml += `    <p:nvPr/>\n`;
  xml += `  </p:nvGraphicFramePr>\n`;

  xml += `  <p:xfrm>\n`;
  xml += `    <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
  xml += `    <a:ext cx="${toEmu(width)}" cy="${toEmu(frameHeight)}"/>\n`;
  xml += `  </p:xfrm>\n`;

  xml += `  <a:graphic>\n`;
  xml += `    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">\n`;
  xml += `      <a:tbl>\n`;

  // Dynamic table properties based on table style
  const tableStyle = tableData?.style;
  const tblPrAttrs: string[] = [];
  if (tableStyle?.firstRow) tblPrAttrs.push('firstRow="1"');
  else tblPrAttrs.push('firstRow="0"');
  if (tableStyle?.lastRow) tblPrAttrs.push('lastRow="1"');
  if (tableStyle?.firstCol) tblPrAttrs.push('firstCol="1"');
  if (tableStyle?.lastCol) tblPrAttrs.push('lastCol="1"');
  if (tableStyle?.bandRow) tblPrAttrs.push('bandRow="1"');
  else tblPrAttrs.push('bandRow="0"');
  if (tableStyle?.bandCol) tblPrAttrs.push('bandCol="1"');
  xml += `        <a:tblPr ${tblPrAttrs.join(" ")}/>\n`;

  // 1. The Grid Definition — every column must be declared before any rows
  xml += `        <a:tblGrid>\n`;
  for (const colWidth of columns) {
    xml += `          <a:gridCol w="${toEmu(colWidth)}"/>\n`;
  }
  xml += `        </a:tblGrid>\n`;

  // 2. Rows and Cells — ghost cells for merges must still be emitted
  // P3-13: OOXML requires at least one <a:tr> in <a:tbl>
  if (rows.length === 0) {
    xml += `        <a:tr h="${toEmu(30)}">\n`;
    xml += `          <a:tc>\n`;
    xml += `            <a:txBody>\n`;
    xml += `              <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>\n`;
    xml += `              <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>\n`;
    xml += `            </a:txBody>\n`;
    xml += `            <a:tcPr/>\n`;
    xml += `          </a:tc>\n`;
    xml += `        </a:tr>\n`;
  }
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowHeight = tablePlan?.rows[rowIdx]?.assignedHeight ?? row.minHeight ?? row.height ?? 30;
    // P3-14: OOXML <a:tr> requires positive h attribute
    const rowHeightEmu = toEmu(Math.max(rowHeight, 1));
    xml += `        <a:tr h="${rowHeightEmu}">\n`;

    // Validate cell count matches column count to prevent corrupt OOXML
    if (row.cells.length !== columns.length) {
      getLogger().warn(
        `[table] Row ${rowIdx} has ${row.cells.length} cells but table has ${columns.length} columns — padding/truncating to match`,
      );
    }
    const cellCount = Math.min(row.cells.length, columns.length);

    for (let colIdx = 0; colIdx < cellCount; colIdx++) {
      const cell = row.cells[colIdx];
      const effectiveStyle = resolveEffectiveCellStyle(cell, rowIdx, colIdx, rows.length, columns.length, tableStyle);
      // In free mode, merged cells are flattened (no gridSpan/rowSpan/vMerge/hMerge)
      const lite = isLiteBundle();
      const hasMerge = (cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1 || cell.vMerge || cell.hMerge;
      if (lite && hasMerge) {
        getLogger().warn(`[table] Merged table cells flattened in free mode (row ${rowIdx}, col ${colIdx})`);
      }
      const gridSpanAttr = !lite && (cell.colSpan ?? 1) > 1 ? ` gridSpan="${cell.colSpan}"` : "";
      const rowSpanAttr = !lite && (cell.rowSpan ?? 1) > 1 ? ` rowSpan="${cell.rowSpan}"` : "";
      const vMergeAttr = !lite && cell.vMerge ? ` vMerge="1"` : "";
      const hMergeAttr = !lite && cell.hMerge ? ` hMerge="1"` : "";

      xml += `          <a:tc${gridSpanAttr}${rowSpanAttr}${vMergeAttr}${hMergeAttr}>\n`;
      xml += emitCellText(cell, hyperlinkRels, hyperlinkRIdCounter, effectiveStyle);
      xml += emitTcPr(effectiveStyle);
      xml += `          </a:tc>\n`;
    }

    // Pad missing cells with empty cells so every row matches the grid
    for (let colIdx = cellCount; colIdx < columns.length; colIdx++) {
      xml += `          <a:tc>\n`;
      xml += `            <a:txBody>\n`;
      xml += `              <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>\n`;
      xml += `              <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>\n`;
      xml += `            </a:txBody>\n`;
      xml += `            <a:tcPr/>\n`;
      xml += `          </a:tc>\n`;
    }

    xml += `        </a:tr>\n`;
  }

  xml += `      </a:tbl>\n`;
  xml += `    </a:graphicData>\n`;
  xml += `  </a:graphic>\n`;
  xml += `</p:graphicFrame>\n`;

  return { xml, hyperlinkRels };
}
