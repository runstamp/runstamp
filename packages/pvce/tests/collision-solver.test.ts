import { describe, expect, it } from "vitest";

import {
  AxisCollisionSolver,
  CollisionLevel,
} from "../src/index.js";

const BOUNDS = { x: 0, y: 0, width: 1000, height: 1000 };

describe("AxisCollisionSolver", () => {
  it("separates perfectly overlapping point labels", () => {
    const solver = new AxisCollisionSolver(undefined, { maxIterations: 20 });
    const placements = solver.resolvePointLabels([
      { x: 500, y: 500, label: "same" },
      { x: 500, y: 500, label: "same" },
    ], BOUNDS, 12);

    expect(placements).toHaveLength(2);
    expect(placements[0].position).not.toEqual(placements[1].position);
    const first = placements[0];
    const second = placements[1];
    const overlap = !(
      first.position.x + first.box.width <= second.position.x ||
      second.position.x + second.box.width <= first.position.x ||
      first.position.y + first.box.height <= second.position.y ||
      second.position.y + second.box.height <= first.position.y
    );
    expect(overlap).toBe(false);
  });

  it("leaves non-overlapping point labels at their initial positions", () => {
    const solver = new AxisCollisionSolver();
    const points = [
      { x: 200, y: 500, label: "left" },
      { x: 800, y: 500, label: "right" },
    ];
    const placements = solver.resolvePointLabels(points, BOUNDS, 12);

    placements.forEach((placement, index) => {
      expect(placement.position).toEqual({
        x: points[index].x - placement.box.width / 2,
        y: points[index].y - placement.box.height - 10,
      });
    });
    expect(placements.every((placement) => placement.collisionLevel === CollisionLevel.STANDARD)).toBe(true);
  });

  it("escalates crowded axis labels beyond the standard layout", () => {
    const solver = new AxisCollisionSolver();
    const result = solver.resolveAxisLabels(
      ["A very long first label", "A very long second label", "A very long third label"],
      0,
      100,
      200,
      12,
    );

    expect(result.level).not.toBe(CollisionLevel.STANDARD);
  });

  it("returns an empty standard layout for no axis labels", () => {
    const solver = new AxisCollisionSolver();
    expect(solver.resolveAxisLabels([], 0, 100, 200, 12)).toEqual({
      placements: [],
      level: CollisionLevel.STANDARD,
    });
  });
});
