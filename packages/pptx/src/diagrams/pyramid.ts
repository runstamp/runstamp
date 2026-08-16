// src/diagrams/pyramid.ts — Pyramid/funnel shape stack

import type { PaperGroup, PaperView, PaperNode, DiagramConfig, ColorValue } from "../types/ast.js";

const BASE_WIDTH = 300;
const LEVEL_HEIGHT = 50;
const V_GAP = 4;

export function generatePyramid(config: DiagramConfig): PaperGroup {
  const items = config.items;
  const style = config.style ?? {};
  const accentColor: ColorValue = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 11;
  const fontFamily = style.fontFamily ?? "Arial";

  const n = items.length;
  if (n === 0) {
    return { type: "Group", style: { width: 0, height: 0 }, children: [] };
  }

  const children: PaperNode[] = [];
  const totalHeight = n * LEVEL_HEIGHT + (n - 1) * V_GAP;

  for (let i = 0; i < n; i++) {
    const item = items[i];
    // Width decreases as we go up (i=0 is the top, narrowest)
    const ratio = (n - i) / n;
    const levelWidth = BASE_WIDTH * ratio;
    const x = (BASE_WIDTH - levelWidth) / 2;
    const y = i * (LEVEL_HEIGHT + V_GAP);
    const fillColor = item.color ?? accentColor;

    const level: PaperView = {
      type: "View",
      shapeType: "trapezoid",
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: levelWidth,
        height: LEVEL_HEIGHT,
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
    children.push(level);
  }

  return {
    type: "Group",
    style: { width: BASE_WIDTH, height: totalHeight },
    children,
  };
}
