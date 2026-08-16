import type { SKRSContext2D } from "@napi-rs/canvas";
import type { LayoutTable } from "../layout/extract.js";
import type { ColorValue, ThemeColorScheme } from "../types/ast.js";
import { resolveColorValue } from "./colorResolver.js";
import { buildFontString, paintParagraphs, paintTextContent } from "./canvasText.js";
import { planTableLayout, resolveTableColumns } from "../typography/tableLayout.js";

export function paintTable(
  ctx: SKRSContext2D,
  node: LayoutTable,
  themeColors?: ThemeColorScheme,
): void {
  const { x, y, width, height } = node.layout;
  const tableData = node.tableData;
  if (!tableData) return;

  ctx.save();

  const columns = resolveTableColumns(tableData, width);
  const rows = tableData.rows;
  const tablePlan = planTableLayout(tableData, width, height);
  const colScale = 1;

  const colPositions: number[] = [];
  let currentX = x;
  for (const colWidth of columns) {
    colPositions.push(currentX);
    currentX += colWidth * colScale;
  }

  let rowY = y;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowHeight = tablePlan.rows[rowIndex]?.assignedHeight ?? row.height ?? 20;

    for (let colIndex = 0; colIndex < row.cells.length && colIndex < columns.length; colIndex++) {
      const cell = row.cells[colIndex];
      const cellX = colPositions[colIndex];
      const cellWidth = columns[colIndex] * colScale;
      const isHeaderRow = rowIndex === 0 && tableData.style?.firstRow !== false;

      if (isHeaderRow) {
        ctx.fillStyle = resolveColorValue(
          tableData.style?.headerRowStyle?.fill as ColorValue | undefined,
          themeColors,
        ) ?? "#1E293B";
      } else if (rowIndex % 2 === 1 && tableData.style?.bandRow !== false) {
        ctx.fillStyle = "#F1F5F9";
      } else {
        const cellFill = cell.style?.fill;
        ctx.fillStyle = cellFill
          ? (resolveColorValue(cellFill as ColorValue, themeColors) ?? "#FFFFFF")
          : "#FFFFFF";
      }
      ctx.fillRect(cellX, rowY, cellWidth, rowHeight);

      const innerBorder = tableData.style?.innerBorderH ?? tableData.style?.innerBorderV;
      ctx.strokeStyle = resolveColorValue(innerBorder?.color, themeColors) ?? "#CBD5E1";
      ctx.lineWidth = innerBorder?.width ?? 0.75;
      ctx.strokeRect(cellX, rowY, cellWidth, rowHeight);

      if (isHeaderRow) {
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cellX, rowY + rowHeight);
        ctx.lineTo(cellX + cellWidth, rowY + rowHeight);
        ctx.stroke();
      }

      const fontSize = cell.style?.fontSize ?? 10;
      const fontFamily = cell.style?.fontFamily ?? "Arial";
      const fontWeight = cell.style?.fontWeight ?? (isHeaderRow ? "bold" : "normal");
      const fontStyle = cell.style?.fontStyle ?? "normal";
      const textColor = cell.style?.color;

      ctx.font = buildFontString(fontSize, fontFamily, fontWeight, fontStyle);
      const defaultTextColor = isHeaderRow ? "#FFFFFF" : "#000000";
      ctx.fillStyle = resolveColorValue(textColor, themeColors) ?? defaultTextColor;
      ctx.textBaseline = "top";

      const padding = cell.style?.padding ?? 5;
      const maxTextWidth = cellWidth - padding * 2;
      const cellText = cell.text ?? "";

      if (cell.paragraphs) {
        paintParagraphs(
          ctx,
          cell.paragraphs,
          undefined,
          cellX + padding,
          rowY + padding,
          maxTextWidth,
          rowHeight - padding * 2,
          themeColors,
        );
      } else if (cell.content) {
        paintTextContent(
          ctx,
          cell.content,
          undefined,
          cellX + padding,
          rowY + padding,
          maxTextWidth,
          rowHeight - padding * 2,
          themeColors,
        );
      } else if (cellText) {
        ctx.fillText(cellText, cellX + padding, rowY + padding, maxTextWidth);
      }
    }

    rowY += rowHeight;
  }

  ctx.restore();
}
