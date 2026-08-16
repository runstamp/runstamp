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

export const transformVectors: Record<string, PaperDocument> = {
  // Rotated rectangle
  "transform-rotation": makeDoc("transform-rotation", [
    {
      type: "View",
      style: {
        width: 200,
        height: 150,
        position: "absolute",
        top: 150,
        left: 350,
        backgroundColor: "#4472C4",
        rotation: 30,
      },
    },
  ]),

  // Horizontal and vertical flips
  "transform-flip": makeDoc("transform-flip", [
    {
      type: "View",
      style: {
        width: 150,
        height: 100,
        position: "absolute",
        top: 100,
        left: 100,
        backgroundColor: "#ED7D31",
      },
      shapeType: "rightArrow",
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 100,
        position: "absolute",
        top: 100,
        left: 400,
        backgroundColor: "#ED7D31",
        flipH: true,
      },
      shapeType: "rightArrow",
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 100,
        position: "absolute",
        top: 300,
        left: 100,
        backgroundColor: "#70AD47",
        flipV: true,
      },
      shapeType: "triangle",
    },
  ]),

  // Various shape types: flowchart, callout, star
  "transform-shape-types": makeDoc("transform-shape-types", [
    {
      type: "View",
      style: {
        width: 150,
        height: 120,
        position: "absolute",
        top: 50,
        left: 50,
        backgroundColor: "#4472C4",
      },
      shapeType: "flowChartDecision",
    },
    {
      type: "View",
      style: {
        width: 200,
        height: 120,
        position: "absolute",
        top: 50,
        left: 250,
        backgroundColor: "#ED7D31",
      },
      shapeType: "wedgeRoundRectCallout",
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 150,
        position: "absolute",
        top: 50,
        left: 500,
        backgroundColor: "#FFC000",
      },
      shapeType: "star5",
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 120,
        position: "absolute",
        top: 250,
        left: 50,
        backgroundColor: "#70AD47",
      },
      shapeType: "hexagon",
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 120,
        position: "absolute",
        top: 250,
        left: 250,
        backgroundColor: "#9B59B6",
      },
      shapeType: "cloud",
    },
    {
      type: "View",
      style: {
        width: 150,
        height: 120,
        position: "absolute",
        top: 250,
        left: 500,
        backgroundColor: "#E74C3C",
      },
      shapeType: "heart",
    },
  ]),

  // Shape with border styling
  "transform-bordered": makeDoc("transform-bordered", [
    {
      type: "View",
      style: {
        width: 250,
        height: 180,
        position: "absolute",
        top: 80,
        left: 100,
        backgroundColor: "#E8F5E9",
        borderWidth: 3,
        borderColor: "#2E7D32",
        borderStyle: "solid",
      },
    },
    {
      type: "View",
      style: {
        width: 250,
        height: 180,
        position: "absolute",
        top: 80,
        left: 500,
        backgroundColor: "#FFF3E0",
        borderWidth: 2,
        borderColor: "#E65100",
        borderStyle: "dashed",
      },
    },
  ]),
};
