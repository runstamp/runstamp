// src/diagrams/list.ts — Vertical/horizontal list with items

import type { PaperGroup, PaperView, PaperNode, DiagramConfig, ColorValue } from "../types/ast.js";

const ITEM_WIDTH = 200;
const ITEM_HEIGHT = 40;
const SPACING = 10;
const ICON_SIZE = 30;
const ICON_GAP = 10;

export function generateList(config: DiagramConfig): PaperGroup {
  const items = config.items;
  const style = config.style ?? {};
  const direction = config.direction ?? "vertical";
  const accentColor: ColorValue = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 12;
  const fontFamily = style.fontFamily ?? "Arial";
  const spacing = style.spacing ?? SPACING;

  const isVertical = direction === "vertical";
  const children: PaperNode[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = isVertical ? 0 : i * (ITEM_WIDTH + spacing);
    const y = isVertical ? i * (ITEM_HEIGHT + spacing) : 0;
    const fillColor = item.color ?? accentColor;
    const hasIcon = !!item.icon;

    // Optional icon circle
    if (hasIcon) {
      const icon: PaperView = {
        type: "View",
        shapeType: "ellipse",
        style: {
          position: "absolute",
          left: x + 5,
          top: y + (ITEM_HEIGHT - ICON_SIZE) / 2,
          width: ICON_SIZE,
          height: ICON_SIZE,
          backgroundColor: fillColor,
        },
        textContent: item.icon!.charAt(0).toUpperCase(),
        textStyle: {
          fontSize: fontSize - 2,
          fontFamily,
          color: "#FFFFFF",
          textAlign: "center",
          verticalAlign: "middle",
        },
      };
      children.push(icon);
    }

    // Item rect
    const textOffset = hasIcon ? ICON_SIZE + ICON_GAP + 5 : 10;
    const itemRect: PaperView = {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        borderWidth: 1,
        borderColor: fillColor,
      },
      textContent: item.text,
      textStyle: {
        fontSize,
        fontFamily,
        color: "#333333",
        textAlign: "left",
        verticalAlign: "middle",
        textInsets: { left: textOffset },
      },
    };
    children.push(itemRect);
  }

  const totalWidth = isVertical ? ITEM_WIDTH : items.length * (ITEM_WIDTH + spacing) - spacing;
  const totalHeight = isVertical ? items.length * (ITEM_HEIGHT + spacing) - spacing : ITEM_HEIGHT;

  return {
    type: "Group",
    style: { width: totalWidth, height: totalHeight },
    children,
  };
}
