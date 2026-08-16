// src/diagrams/hierarchy.ts — Tree hierarchy (org chart) diagram

import type { PaperGroup, PaperView, PaperConnector, PaperNode, DiagramConfig, DiagramItem, ColorValue } from "../types/ast.js";

const BOX_WIDTH = 120;
const BOX_HEIGHT = 50;
const H_SPACING = 30;
const V_SPACING = 60;

function countLeaves(item: DiagramItem): number {
  if (!item.children || item.children.length === 0) return 1;
  return item.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

function treeWidth(item: DiagramItem): number {
  const leaves = countLeaves(item);
  return leaves * BOX_WIDTH + (leaves - 1) * H_SPACING;
}

function layoutHierarchy(
  item: DiagramItem,
  x: number,
  y: number,
  accentColor: ColorValue,
  fontSize: number,
  fontFamily: string,
  children: PaperNode[],
  depth: number,
): { cx: number } {
  const myWidth = treeWidth(item);
  const boxX = x + myWidth / 2 - BOX_WIDTH / 2;
  const fillColor = item.color ?? accentColor;

  const box: PaperView = {
    type: "View",
    shapeType: depth === 0 ? "roundRect" : "rect",
    style: {
      position: "absolute",
      left: boxX,
      top: y,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      backgroundColor: fillColor,
    },
    textContent: item.text,
    textStyle: {
      fontSize,
      fontFamily,
      color: "#FFFFFF",
      textAlign: "center",
      verticalAlign: "middle",
    },
  };
  children.push(box);

  const parentCx = boxX + BOX_WIDTH / 2;
  const parentBottom = y + BOX_HEIGHT;

  if (item.children && item.children.length > 0) {
    let childX = x;
    for (const child of item.children) {
      const childWidth = treeWidth(child);
      const { cx: childCx } = layoutHierarchy(
        child, childX, y + BOX_HEIGHT + V_SPACING,
        accentColor, fontSize, fontFamily, children, depth + 1,
      );

      // Elbow connector from parent to child
      const connector: PaperConnector = {
        type: "Connector",
        connectorType: "elbow",
        start: { x: parentCx, y: parentBottom },
        end: { x: childCx, y: y + BOX_HEIGHT + V_SPACING },
        lineWidth: 1.5,
        lineColor: "#999999",
      };
      children.push(connector);

      childX += childWidth + H_SPACING;
    }
  }

  return { cx: parentCx };
}

function treeDepth(item: DiagramItem): number {
  if (!item.children || item.children.length === 0) return 1;
  return 1 + Math.max(...item.children.map(treeDepth));
}

export function generateHierarchy(config: DiagramConfig): PaperGroup {
  const style = config.style ?? {};
  const accentColor: ColorValue = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 11;
  const fontFamily = style.fontFamily ?? "Arial";

  // Build from the first item as root (or create a virtual root)
  const root = config.items[0];
  if (!root) {
    return { type: "Group", style: { width: 0, height: 0 }, children: [] };
  }

  // If multiple top-level items, treat them as children of a virtual root
  const effectiveRoot: DiagramItem = config.items.length === 1
    ? root
    : { text: "", children: config.items };

  const children: PaperNode[] = [];
  const width = treeWidth(effectiveRoot);
  const depth = treeDepth(effectiveRoot);
  const height = depth * BOX_HEIGHT + (depth - 1) * V_SPACING;

  layoutHierarchy(effectiveRoot, 0, 0, accentColor, fontSize, fontFamily, children, 0);

  return {
    type: "Group",
    style: { width, height },
    children,
  };
}
