// src/diagrams/cycle.ts — Circular cycle diagram

import type { PaperGroup, PaperView, PaperConnector, PaperNode, DiagramConfig, ColorValue } from "../types/ast.js";

const NODE_RADIUS = 50;
const CIRCLE_RADIUS = 120;

export function generateCycle(config: DiagramConfig): PaperGroup {
  const items = config.items;
  const style = config.style ?? {};
  const accentColor: ColorValue = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 11;
  const fontFamily = style.fontFamily ?? "Arial";
  const connectorStyle = style.connectorStyle ?? "arrow";
  const n = items.length;

  if (n === 0) {
    return { type: "Group", style: { width: 0, height: 0 }, children: [] };
  }

  const circleR = Math.max(CIRCLE_RADIUS, n * 30);
  const nodeSize = NODE_RADIUS * 2;
  const totalSize = (circleR + NODE_RADIUS) * 2;
  const centerX = totalSize / 2;
  const centerY = totalSize / 2;

  const children: PaperNode[] = [];
  const positions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2; // start from top
    const cx = centerX + circleR * Math.cos(angle);
    const cy = centerY + circleR * Math.sin(angle);
    positions.push({ x: cx, y: cy });

    const item = items[i];
    const fillColor = item.color ?? accentColor;

    const box: PaperView = {
      type: "View",
      shapeType: "ellipse",
      style: {
        position: "absolute",
        left: cx - NODE_RADIUS,
        top: cy - NODE_RADIUS,
        width: nodeSize,
        height: nodeSize,
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
  }

  // Connectors between adjacent nodes
  if (n > 1 && connectorStyle !== "none") {
    for (let i = 0; i < n; i++) {
      const from = positions[i];
      const to = positions[(i + 1) % n];

      // Calculate edge points (on the circle of each node)
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;

      const connector: PaperConnector = {
        type: "Connector",
        connectorType: "curved",
        start: {
          x: from.x + nx * NODE_RADIUS,
          y: from.y + ny * NODE_RADIUS,
        },
        end: {
          x: to.x - nx * NODE_RADIUS,
          y: to.y - ny * NODE_RADIUS,
        },
        lineWidth: 2,
        lineColor: "#666666",
        arrowEnd: connectorStyle === "arrow" ? { type: "triangle", width: "med", length: "med" } : false,
      };
      children.push(connector);
    }
  }

  return {
    type: "Group",
    style: { width: totalSize, height: totalSize },
    children,
  };
}
