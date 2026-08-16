// src/diagrams/index.ts — SmartArt-like diagram generators
// Each returns a PaperGroup that can be placed on any slide.

import type { PaperGroup, DiagramConfig } from "../types/ast.js";
import { generateProcessFlow } from "./processFlow.js";
import { generateHierarchy } from "./hierarchy.js";
import { generateCycle } from "./cycle.js";
import { generateMatrix } from "./matrix.js";
import { generatePyramid } from "./pyramid.js";
import { generateList } from "./list.js";

/**
 * Generates a SmartArt-like diagram as a PaperGroup.
 * The group can be placed on a slide as a regular element.
 * @experimental This API is subject to change in future versions.
 */
export function generateDiagram(config: DiagramConfig): PaperGroup {
  switch (config.type) {
    case "process":
      return generateProcessFlow(config);
    case "hierarchy":
      return generateHierarchy(config);
    case "cycle":
      return generateCycle(config);
    case "matrix":
      return generateMatrix(config);
    case "pyramid":
      return generatePyramid(config);
    case "list":
      return generateList(config);
    default:
      throw new Error(`Unknown diagram type: ${(config as { type: string }).type}`);
  }
}

export { generateProcessFlow } from "./processFlow.js";
export { generateHierarchy } from "./hierarchy.js";
export { generateCycle } from "./cycle.js";
export { generateMatrix } from "./matrix.js";
export { generatePyramid } from "./pyramid.js";
export { generateList } from "./list.js";
