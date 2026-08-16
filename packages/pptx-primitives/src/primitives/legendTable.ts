/**
 * legendTable — vertical legend pairing color swatch + label + optional
 * metric column. Used alongside chartBlock when the chart's intrinsic
 * legend isn't visible-friendly (Bain p20 stacked bar with a side
 * legend that includes percentage shares).
 *
 * Layout: a vertical stack of (swatch, label, value) rows. Row height
 * derives from caption type role; horizontal layout is column 1 swatch
 * (square), column 2 label flex, column 3 optional value.
 *
 * Tokens consumed:
 *   - type.caption (label + value text)
 *   - palette.foreground (default text color)
 */

import type { Primitive } from "./primitive.js";
import type { PrimitiveNode, TextNode, ViewNode } from "../layout/index.js";
import { estimateLineHeight } from "../util/estimateText.js";

export interface LegendItem {
  color: string; // hex
  label: string;
  value?: string;
}

export interface LegendTableInput {
  items: LegendItem[];
  /** Direction. Default "vertical". */
  direction?: "vertical" | "horizontal";
}

const SWATCH_SIZE = 12;
const SWATCH_GAP = 8;
const VALUE_GAP = 12;
const ROW_GAP = 4;

export const legendTable: Primitive<LegendTableInput> = (input, tokens, region) => {
  const caption = tokens.type.caption;
  const lineHeightPx = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
  const direction = input.direction ?? "vertical";
  const nodes: PrimitiveNode[] = [];

  if (direction === "vertical") {
    let cursor = region.top;
    const rowHeight = Math.max(lineHeightPx, SWATCH_SIZE + 2);
    for (const item of input.items) {
      if (cursor + rowHeight > region.top + region.height) break;
      const swatch: ViewNode = {
        kind: "view",
        shape: "rect",
        rect: {
          left: region.left,
          top: cursor + (rowHeight - SWATCH_SIZE) / 2,
          width: SWATCH_SIZE,
          height: SWATCH_SIZE,
        },
        fill: item.color,
        decorative: true,
      };
      nodes.push(swatch);

      const labelLeft = region.left + SWATCH_SIZE + SWATCH_GAP;
      const valueWidth = item.value ? Math.min(80, region.width * 0.3) : 0;
      const labelWidth = region.width - (SWATCH_SIZE + SWATCH_GAP) - (item.value ? VALUE_GAP + valueWidth : 0);

      const label: TextNode = {
        kind: "text",
        rect: { left: labelLeft, top: cursor, width: labelWidth, height: rowHeight },
        content: item.label,
        style: {
          family: caption.family,
          weight: caption.weight,
          size: caption.size,
          lineHeight: caption.lineHeight,
          letterSpacing: caption.letterSpacing,
          italic: caption.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "middle",
        },
        autoFit: false,
      };
      nodes.push(label);

      if (item.value) {
        const value: TextNode = {
          kind: "text",
          rect: {
            left: region.left + region.width - valueWidth,
            top: cursor,
            width: valueWidth,
            height: rowHeight,
          },
          content: item.value,
          style: {
            family: caption.family,
            weight: 700,
            size: caption.size,
            lineHeight: caption.lineHeight,
            color: tokens.palette.foreground,
            align: "right",
            verticalAlign: "middle",
          },
          autoFit: false,
        };
        nodes.push(value);
      }
      cursor += rowHeight + ROW_GAP;
    }
  } else {
    // Horizontal: swatch + label pairs side by side, equally spaced.
    const itemCount = input.items.length;
    const itemWidth = region.width / itemCount;
    for (let i = 0; i < itemCount; i++) {
      const item = input.items[i];
      const x = region.left + i * itemWidth;
      const swatch: ViewNode = {
        kind: "view",
        shape: "rect",
        rect: {
          left: x,
          top: region.top + (region.height - SWATCH_SIZE) / 2,
          width: SWATCH_SIZE,
          height: SWATCH_SIZE,
        },
        fill: item.color,
        decorative: true,
      };
      nodes.push(swatch);
      const label: TextNode = {
        kind: "text",
        rect: {
          left: x + SWATCH_SIZE + SWATCH_GAP,
          top: region.top,
          width: itemWidth - SWATCH_SIZE - SWATCH_GAP - 4,
          height: region.height,
        },
        content: item.label,
        style: {
          family: caption.family,
          weight: caption.weight,
          size: caption.size,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "middle",
        },
        autoFit: false,
      };
      nodes.push(label);
    }
  }

  return { nodes, overflow: { kind: "fit" } };
};
