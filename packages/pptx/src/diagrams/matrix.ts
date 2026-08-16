// src/diagrams/matrix.ts — 2x2 matrix (quadrant chart) diagram

import type { PaperGroup, PaperView, PaperNode, DiagramConfig, ColorValue } from "../types/ast.js";

const QUADRANT_SIZE = 150;
const GAP = 8;

export function generateMatrix(config: DiagramConfig): PaperGroup {
  const items = config.items;
  const style = config.style ?? {};
  const accentColor: ColorValue = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 12;
  const fontFamily = style.fontFamily ?? "Arial";

  const children: PaperNode[] = [];
  const colors: ColorValue[] = [
    items[0]?.color ?? accentColor,
    items[1]?.color ?? "#ED7D31",
    items[2]?.color ?? "#70AD47",
    items[3]?.color ?? "#FFC000",
  ];

  const totalWidth = QUADRANT_SIZE * 2 + GAP;
  const totalHeight = QUADRANT_SIZE * 2 + GAP;

  // Quadrant positions: TL, TR, BL, BR
  const positions = [
    { x: 0, y: 0 },
    { x: QUADRANT_SIZE + GAP, y: 0 },
    { x: 0, y: QUADRANT_SIZE + GAP },
    { x: QUADRANT_SIZE + GAP, y: QUADRANT_SIZE + GAP },
  ];

  for (let i = 0; i < 4 && i < items.length; i++) {
    const pos = positions[i];
    const item = items[i];

    const quadrant: PaperView = {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: QUADRANT_SIZE,
        height: QUADRANT_SIZE,
        backgroundColor: colors[i],
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
    children.push(quadrant);
  }

  return {
    type: "Group",
    style: { width: totalWidth, height: totalHeight },
    children,
  };
}
