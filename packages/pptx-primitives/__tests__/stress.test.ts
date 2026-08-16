/**
 * Phase 4 stress harness for primitives.
 *
 * Per the primitive contract (primitive.ts §1–4), every primitive is a
 * pure function of (input, tokens, region) that always returns a
 * structurally-valid PrimitiveResult — even when content overflows the
 * region. This test pushes each primitive through:
 *
 *   • A minimal valid input
 *   • A stress input (max-count items, very long unicode, emoji)
 *   • A range of region shapes (square, wide, tall, tiny)
 *
 * Assertions are deliberately *contract-level*, not visual:
 *   1. The primitive must not throw on any (valid input × any region)
 *      combination.
 *   2. `result.nodes` must be a non-null array.
 *   3. `result.overflow.kind` must be one of "fit"|"compressed"|
 *      "paginated"|"clipped".
 *   4. If kind=="clipped", `droppedCount` and `reason` must be populated
 *      (silent clipping is a reliability violation).
 *   5. If kind=="compressed", `scale` must be in (0, 1].
 *   6. Two calls with identical args must produce structurally-identical
 *      output (purity check; the engine determinism test pins the byte
 *      level on the rendered side).
 */

import { describe, expect, it } from "vitest";
import {
  bulletList,
  comparisonBand,
  kpiHero,
  matrixTable,
  metricStack,
  orgTree,
  quadrantMap,
  resolveTokens,
  sectionRibbon,
  sectionTag,
  sourceLine,
  stepTimeline,
  titleBlock,
  tocTiles,
  tombstoneStack,
  waterfallBars,
} from "../src/index.js";
import type { OverflowResult, PrimitiveResult } from "../src/index.js";
import type { Rect } from "../src/layout/types.js";

const tokens = resolveTokens({
  version: "1.0",
  palette: { accent: "#2563EB" },
});

const REGIONS: Record<string, Rect> = {
  square: { left: 40, top: 40, width: 360, height: 240 },
  wide: { left: 40, top: 40, width: 800, height: 120 },
  tall: { left: 40, top: 40, width: 200, height: 400 },
  tiny: { left: 40, top: 40, width: 80, height: 60 },
};

const LONG_UNICODE =
  "重组优化的战略路径 — résumé naïveté façade — straße — 🚀 launch into Q3 with confidence and clarity (forty-two words and counting and counting and counting and counting and counting)";

function assertValidResult(label: string, result: PrimitiveResult): void {
  expect(result, `${label}: missing result`).toBeTruthy();
  expect(Array.isArray(result.nodes), `${label}: nodes not array`).toBe(true);
  const kind = result.overflow.kind;
  expect(
    ["fit", "compressed", "paginated", "clipped"].includes(kind),
    `${label}: invalid overflow.kind="${kind}"`,
  ).toBe(true);
  if (result.overflow.kind === "clipped") {
    expect(typeof result.overflow.droppedCount, `${label}: clipped missing droppedCount`).toBe("number");
    expect(typeof result.overflow.reason, `${label}: clipped missing reason`).toBe("string");
    expect(result.overflow.reason.length, `${label}: clipped reason empty`).toBeGreaterThan(0);
  }
  if (result.overflow.kind === "compressed") {
    expect(result.overflow.scale, `${label}: compressed scale out of range`).toBeGreaterThan(0);
    expect(result.overflow.scale).toBeLessThanOrEqual(1);
  }
  for (const node of result.nodes) {
    expect(typeof node.kind, `${label}: node missing kind`).toBe("string");
    expect(node.rect, `${label}: node missing rect`).toBeTruthy();
    expect(Number.isFinite(node.rect.left)).toBe(true);
    expect(Number.isFinite(node.rect.top)).toBe(true);
    expect(node.rect.width).toBeGreaterThanOrEqual(0);
    expect(node.rect.height).toBeGreaterThanOrEqual(0);
  }
}

function structurallyEqual(a: PrimitiveResult, b: PrimitiveResult): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Case<TInput> {
  name: string;
  input: TInput;
}

function runCases<TInput>(
  primitiveName: string,
  fn: (input: TInput, tokens_: typeof tokens, region: Rect) => PrimitiveResult,
  cases: Case<TInput>[],
): void {
  describe(primitiveName, () => {
    for (const c of cases) {
      for (const [regionName, region] of Object.entries(REGIONS)) {
        it(`${c.name} @ ${regionName}`, () => {
          const r = fn(c.input, tokens, region);
          assertValidResult(`${primitiveName}/${c.name}@${regionName}`, r);
          // Purity: a second call must be structurally identical.
          const r2 = fn(c.input, tokens, region);
          expect(
            structurallyEqual(r, r2),
            `${primitiveName} not pure — successive calls differ`,
          ).toBe(true);
        });
      }
    }
  });
}

describe("primitive stress harness", () => {
  // titleBlock
  runCases("titleBlock", titleBlock, [
    { name: "minimal", input: { title: "Hello" } },
    {
      name: "stress",
      input: {
        eyebrow: LONG_UNICODE,
        title: LONG_UNICODE,
        subtitle: LONG_UNICODE,
      },
    },
  ]);

  // bulletList
  runCases("bulletList", bulletList, [
    { name: "minimal", input: { items: [{ text: "One" }] } },
    {
      name: "stress",
      input: {
        items: Array.from({ length: 30 }, (_, i) => ({
          text: `${i}: ${LONG_UNICODE}`,
          level: ((i % 2) + 1) as 1 | 2,
        })),
      },
    },
  ]);

  // sectionRibbon
  runCases("sectionRibbon", sectionRibbon, [
    { name: "minimal", input: { label: "Outlook" } },
    { name: "stress", input: { label: LONG_UNICODE } },
  ]);

  // sectionTag
  runCases("sectionTag", sectionTag, [
    { name: "minimal", input: { label: "S-curve" } },
    { name: "stress", input: { label: LONG_UNICODE, fill: "accent", transform: "none" } },
  ]);

  // sourceLine
  runCases("sourceLine", sourceLine, [
    { name: "minimal", input: { content: "Internal data, 2026." } },
    { name: "stress", input: { content: LONG_UNICODE, kind: "note", align: "right" } },
  ]);

  // matrixTable
  runCases("matrixTable", matrixTable, [
    {
      name: "minimal",
      input: {
        rows: [{ label: "Row 1", cells: ["Cell"] }],
      },
    },
    {
      name: "stress",
      input: {
        columnHeaders: ["", "Col 1", "Col 2", "Col 3", "Col 4"],
        rows: Array.from({ length: 12 }, (_, i) => ({
          label: `Row ${i + 1}: ${LONG_UNICODE}`,
          cells: ["A", "B", LONG_UNICODE, ["multi", "line", "cell"]],
          accent: i === 3,
        })),
      },
    },
  ]);

  // comparisonBand
  runCases("comparisonBand", comparisonBand, [
    {
      name: "minimal",
      input: {
        columns: ["Dim", "Now", "Plan"],
        rows: [{ label: "Cycle", values: ["90d", "45d"] }],
      },
    },
    {
      name: "stress",
      input: {
        columns: ["Dim", "Col A", "Col B", "Col C", "Col D"],
        rows: Array.from({ length: 20 }, (_, i) => ({
          label: `${LONG_UNICODE} (${i})`,
          values: ["v1", "v2", LONG_UNICODE, "v4"],
          accent: i === 5,
        })),
      },
    },
  ]);

  // stepTimeline
  runCases("stepTimeline", stepTimeline, [
    { name: "minimal", input: { steps: [{ tag: "Q1", label: "Discover" }] } },
    {
      name: "stress",
      input: {
        steps: Array.from({ length: 8 }, (_, i) => ({
          tag: `STEP ${i + 1}`,
          label: LONG_UNICODE,
          description: LONG_UNICODE,
        })),
      },
    },
  ]);

  // waterfallBars
  runCases("waterfallBars", waterfallBars, [
    {
      name: "minimal",
      input: {
        steps: [
          { kind: "start", label: "Start", value: 100 },
          { kind: "end", label: "End", value: 120 },
        ],
      },
    },
    {
      name: "stress",
      input: {
        steps: [
          { kind: "start", label: "Start", value: 1000 },
          ...Array.from({ length: 10 }, (_, i) => ({
            kind: i % 2 === 0 ? ("up" as const) : ("down" as const),
            label: `${LONG_UNICODE} ${i}`,
            value: i % 2 === 0 ? 50 : -30,
          })),
          { kind: "end", label: "End", value: 1100 },
        ],
      },
    },
  ]);

  // orgTree
  runCases("orgTree", orgTree, [
    {
      name: "minimal",
      input: {
        root: { title: "Root" },
        children: [{ title: "Child" }],
      },
    },
    {
      name: "stress",
      input: {
        root: { title: LONG_UNICODE, subtitle: LONG_UNICODE },
        children: Array.from({ length: 10 }, (_, i) => ({
          title: `${LONG_UNICODE} ${i}`,
          subtitle: LONG_UNICODE,
          accent: i === 0,
        })),
      },
    },
  ]);

  // tombstoneStack
  runCases("tombstoneStack", tombstoneStack, [
    {
      name: "minimal",
      input: {
        tiles: [{ title: "Acme" }],
      },
    },
    {
      name: "stress",
      input: {
        tiles: Array.from({ length: 16 }, (_, i) => ({
          title: `Tile ${i}`,
          body: LONG_UNICODE,
          accent: i === 2,
        })),
        columns: 4,
      },
    },
  ]);

  // tocTiles
  runCases("tocTiles", tocTiles, [
    {
      name: "minimal",
      input: { tiles: [{ marker: 1, title: "Intro" }] },
    },
    {
      name: "stress",
      input: {
        tiles: Array.from({ length: 6 }, (_, i) => ({
          marker: `Phase ${i + 1}`,
          title: LONG_UNICODE,
          body: LONG_UNICODE,
        })),
      },
    },
  ]);

  // metricStack
  runCases("metricStack", metricStack, [
    {
      name: "minimal",
      input: { rows: [{ label: "ARR", value: "$1M" }] },
    },
    {
      name: "stress",
      input: {
        rows: Array.from({ length: 8 }, (_, i) => ({
          label: `${LONG_UNICODE} (${i})`,
          value: `$${i + 1}.${i}M`,
          delta: LONG_UNICODE,
          trend: (["up", "down", "flat"] as const)[i % 3],
        })),
      },
    },
  ]);

  // kpiHero
  runCases("kpiHero", kpiHero, [
    {
      name: "minimal",
      input: { label: "ARR", value: "$1.8M" },
    },
    {
      name: "stress",
      input: {
        label: LONG_UNICODE,
        value: LONG_UNICODE,
        delta: LONG_UNICODE,
        trend: "up",
        support: LONG_UNICODE,
        verticalAlign: "top",
      },
    },
  ]);

  // quadrantMap
  runCases("quadrantMap", quadrantMap, [
    {
      name: "minimal",
      input: {
        points: [{ name: "P1", x: 50, y: 50 }],
      },
    },
    {
      name: "stress",
      input: {
        xAxisLabel: { low: LONG_UNICODE, high: LONG_UNICODE },
        yAxisLabel: { low: LONG_UNICODE, high: LONG_UNICODE },
        quadrants: [LONG_UNICODE, LONG_UNICODE, LONG_UNICODE, LONG_UNICODE],
        points: Array.from({ length: 25 }, (_, i) => ({
          name: `${LONG_UNICODE} ${i}`,
          x: (i * 7) % 100,
          y: (i * 13) % 100,
          emphasis: i === 0 ? ("primary" as const) : undefined,
        })),
      },
    },
    {
      name: "out-of-range coords",
      input: {
        points: [
          { name: "below", x: -50, y: -50 },
          { name: "above", x: 200, y: 200 },
        ],
      },
    },
  ]);
});
