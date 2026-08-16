import type { PaperDocument, PaperNode } from "../../src/types/ast.js";

function makeDoc(name: string, children: PaperNode[]): PaperDocument {
  return {
    type: "Document",
    meta: { title: name },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children,
      },
    ],
  };
}

export const connectorVectors: Record<string, PaperDocument> = {
  // Straight connector between two boxes
  "connector-straight": makeDoc("connector-straight", [
    {
      type: "View",
      style: {
        width: 150,
        height: 80,
        position: "absolute",
        top: 100,
        left: 100,
        backgroundColor: "#4472C4",
      },
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 80,
        position: "absolute",
        top: 100,
        left: 500,
        backgroundColor: "#ED7D31",
      },
    },
    {
      type: "Connector",
      connectorType: "straight",
      start: { x: 250, y: 140 },
      end: { x: 500, y: 140 },
      lineWidth: 2,
      lineColor: "#333333",
      arrowEnd: true,
    },
  ]),

  // Elbow connector
  "connector-elbow": makeDoc("connector-elbow", [
    {
      type: "View",
      style: {
        width: 150,
        height: 80,
        position: "absolute",
        top: 80,
        left: 100,
        backgroundColor: "#70AD47",
      },
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 80,
        position: "absolute",
        top: 300,
        left: 500,
        backgroundColor: "#FFC000",
      },
    },
    {
      type: "Connector",
      connectorType: "elbow",
      start: { x: 250, y: 120 },
      end: { x: 500, y: 340 },
      lineWidth: 2,
      lineColor: "#555555",
      arrowEnd: { type: "triangle", width: "med", length: "med" },
    },
  ]),

  // Curved connector with bidirectional arrows
  "connector-curved-bidir": makeDoc("connector-curved-bidir", [
    {
      type: "View",
      style: {
        width: 120,
        height: 120,
        position: "absolute",
        top: 60,
        left: 150,
        backgroundColor: "#9B59B6",
      },
      shapeType: "ellipse",
    },
    {
      type: "View",
      style: {
        width: 120,
        height: 120,
        position: "absolute",
        top: 300,
        left: 600,
        backgroundColor: "#E74C3C",
      },
      shapeType: "ellipse",
    },
    {
      type: "Connector",
      connectorType: "curved",
      start: { x: 270, y: 120 },
      end: { x: 600, y: 360 },
      lineWidth: 3,
      lineColor: "#2C3E50",
      lineDashStyle: "dashed",
      arrowStart: { type: "diamond", width: "med", length: "med" },
      arrowEnd: { type: "stealth", width: "lg", length: "lg" },
    },
  ]),
};
