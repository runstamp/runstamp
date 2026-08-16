// src/diagrams/processFlow.ts — Process flow diagram (horizontal/vertical chain of boxes with arrows)

import type { PaperGroup, PaperView, PaperConnector, PaperNode, DiagramConfig, ColorValue } from "../types/ast.js";

const DEFAULT_BOX_WIDTH = 120;
const DEFAULT_BOX_HEIGHT = 60;
const DEFAULT_SPACING = 40;

export function generateProcessFlow(config: DiagramConfig): PaperGroup {
  const items = config.items;
  const style = config.style ?? {};
  const direction = config.direction ?? "horizontal";
  const spacing = style.spacing ?? DEFAULT_SPACING;
  const accentColor: ColorValue = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 12;
  const fontFamily = style.fontFamily ?? "Arial";
  const connectorStyle = style.connectorStyle ?? "arrow";

  const isHorizontal = direction === "horizontal";
  const boxW = DEFAULT_BOX_WIDTH;
  const boxH = DEFAULT_BOX_HEIGHT;

  const children: PaperNode[] = [];
  const totalLength = items.length * (isHorizontal ? boxW : boxH) + (items.length - 1) * spacing;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = isHorizontal ? i * (boxW + spacing) : 0;
    const y = isHorizontal ? 0 : i * (boxH + spacing);
    const fillColor = item.color ?? accentColor;

    // Box shape
    const box: PaperView = {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: boxW,
        height: boxH,
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

    // Connector arrow (between boxes)
    if (i < items.length - 1 && connectorStyle !== "none") {
      const connector: PaperConnector = {
        type: "Connector",
        connectorType: "straight",
        start: {
          x: isHorizontal ? x + boxW : x + boxW / 2,
          y: isHorizontal ? boxH / 2 : y + boxH,
        },
        end: {
          x: isHorizontal ? x + boxW + spacing : x + boxW / 2,
          y: isHorizontal ? boxH / 2 : y + boxH + spacing,
        },
        lineWidth: 2,
        lineColor: "#666666",
        arrowEnd: connectorStyle === "arrow" ? { type: "triangle", width: "med", length: "med" } : false,
      };
      children.push(connector);
    }
  }

  const groupWidth = isHorizontal ? totalLength : boxW;
  const groupHeight = isHorizontal ? boxH : totalLength;

  return {
    type: "Group",
    style: {
      width: groupWidth,
      height: groupHeight,
    },
    children,
  };
}
