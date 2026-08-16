import { describe, expect, it } from "vitest";

import { PathOptimizer } from "../src/index.js";

describe("PathOptimizer", () => {
  it("preserves both endpoints while reducing collinear points", () => {
    const optimizer = new PathOptimizer({ areaThreshold: 0.1, subPixelThreshold: 0 });
    const result = optimizer.simplifyPath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);

    expect(result.optimizedPointCount).toBe(2);
    expect(result.pathData).toBe("M0,0L3,3");
  });

  it("retains a significant bend below the area tolerance", () => {
    const optimizer = new PathOptimizer({ areaThreshold: 0.5, subPixelThreshold: 0 });
    const result = optimizer.simplifyPath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);

    expect(result.optimizedPointCount).toBe(3);
    expect(result.pathData).toContain("L1,1");
  });

  it("removes that bend above the area tolerance", () => {
    const optimizer = new PathOptimizer({ areaThreshold: 2, subPixelThreshold: 0 });
    const result = optimizer.simplifyPath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);

    expect(result.optimizedPointCount).toBe(2);
    expect(result.pathData).toBe("M0,0L2,0");
  });

  it("handles empty and single-point paths without inventing geometry", () => {
    const optimizer = new PathOptimizer();

    expect(optimizer.simplifyPath([]).pathData).toBe("");
    expect(optimizer.simplifyPath([{ x: 4, y: 5 }]).pathData).toBe("M4,5");
  });
});
