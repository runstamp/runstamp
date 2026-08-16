import { describe, expect, it } from "vitest";

import {
  compileChart,
  PVCECompiler,
  type ChartInput,
  type SceneNode,
  type ChartType,
} from "../src/index.js";

const CHART_TYPES: ChartType[] = [
  "bar",
  "line",
  "scatter",
  "pie",
  "donut",
  "waterfall",
  "marimekko",
  "area",
  "stacked-bar",
  "grouped-bar",
  "combo",
];

const REAL_MULTI_SERIES_TYPES: ChartType[] = [
  "area",
  "stacked-bar",
  "grouped-bar",
  "combo",
];

function dataForChart(chartType: ChartType, values: number[]): unknown {
  const categories = values.map((_, index) => `Category ${index + 1}`);

  if (chartType === "scatter") {
    return {
      points: values.map((value, index) => ({
        x: index + 1,
        y: value,
        label: `Point ${index + 1}`,
      })),
    };
  }

  if (chartType === "waterfall") {
    return {
      categories,
      values,
      isTotal: values.map((_, index) => index === values.length - 1),
    };
  }

  if (REAL_MULTI_SERIES_TYPES.includes(chartType)) {
    return {
      categories,
      series: [
        { name: "Primary", values },
        {
          name: "Secondary",
          values: values.map((value) =>
            chartType === "combo" ? value * 100 : value / 2
          ),
        },
      ],
    };
  }

  return { categories, values };
}

function inputFor(chartType: ChartType, values: number[]): ChartInput<unknown> {
  return {
    data: dataForChart(chartType, values),
    encoding: {},
    constraints: { width: 800, height: 600 },
    config: { title: `${chartType} fixture` },
  };
}

function expectFiniteSvg(svg: string): void {
  expect(svg).toContain("<svg");
  expect(svg).not.toContain("NaN");
  expect(svg).not.toContain("Infinity");
}

function flattenNodes(node: SceneNode): SceneNode[] {
  return [node, ...(node.children ?? []).flatMap(flattenNodes)];
}

function nodeWithId(
  result: ReturnType<typeof compileChart>,
  id: string,
): SceneNode {
  const node = flattenNodes(result.sceneGraph.root).find(
    (candidate) => candidate.id === id,
  );
  expect(node, `Expected scene node ${id}`).toBeDefined();
  return node!;
}

function rectGeometry(node: SceneNode): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: node.x,
    y: node.y,
    width: node.attributes.width ?? 0,
    height: node.attributes.height ?? 0,
  };
}

describe("golden SVG output", () => {
  it.each(CHART_TYPES)("renders a byte-stable %s golden", (chartType) => {
    const compiler = new PVCECompiler({ seed: 42, prettyPrint: true });
    const first = compiler.compile(chartType, inputFor(chartType, [3, 7, 4]));
    const second = compiler.compile(chartType, inputFor(chartType, [3, 7, 4]));

    expect(first.svg).toBe(second.svg);
    expectFiniteSvg(first.svg);
    expect(first.svg).toMatchSnapshot();
  });
});

describe("adversarial numeric matrix", () => {
  const cases: Array<[string, number[]]> = [
    ["empty data", []],
    ["single point", [5]],
    ["all-identical values", [7, 7, 7]],
    [
      "NaN and infinity",
      [
        Number.NaN,
        1,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        2,
      ],
    ],
    ["negative-only values", [-9, -4, -1]],
    ["huge magnitudes", [1e15, -5e14, 2.5e14]],
    ["tiny magnitudes", [1e-15, -5e-16, 2.5e-16]],
  ];

  const matrix = CHART_TYPES.flatMap((chartType) =>
    cases.map(([name, values]) => [chartType, name, values] as const)
  );

  it.each(matrix)("compiles %s with %s", (chartType, _name, values) => {
    const result = compileChart(chartType, inputFor(chartType, values), {
      seed: 42,
    });
    expectFiniteSvg(result.svg);
  });

  it("compiles every chart type when all declared series are empty", () => {
    for (const chartType of CHART_TYPES) {
      const data = chartType === "line" || chartType === "area"
        ? {
            categories: [],
            series: [{ values: [] }, { values: [] }],
          }
        : dataForChart(chartType, []);
      const result = compileChart(chartType, {
        data,
        encoding: {},
        constraints: { width: 800, height: 600 },
      }, { seed: 42 });
      expectFiniteSvg(result.svg);
    }
  });
});

describe("real multi-series renderers", () => {
  it("closes each area fill to the zero baseline and overlays distinct translucent series", () => {
    const result = compileChart("area", {
      data: {
        categories: ["A", "B", "C"],
        series: [
          { name: "North", values: [2, 5, 3] },
          { name: "South", values: [1, 3, 4] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    }, { seed: 42, prettyPrint: true });

    const firstFill = nodeWithId(result, "area-fill-0");
    const secondFill = nodeWithId(result, "area-fill-1");
    expect(firstFill.attributes.d).toMatch(/L9500,9200 L818,9200 Z$/);
    expect(secondFill.attributes.d).toMatch(/L9500,9200 L818,9200 Z$/);
    expect(firstFill.attributes.opacity).toBe(0.35);
    expect(firstFill.attributes.fill).not.toBe(secondFill.attributes.fill);
    expect(result.svg).toMatchSnapshot();
  });

  it("stacks positive bar segments so the upper segment starts at the lower segment end", () => {
    const result = compileChart("stacked-bar", {
      data: {
        categories: ["A", "B"],
        series: [
          { name: "Base", values: [2, 4] },
          { name: "Top", values: [3, 1] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    }, { seed: 42, prettyPrint: true });

    const lower = rectGeometry(nodeWithId(result, "stacked-bar-0-0"));
    const upper = rectGeometry(nodeWithId(result, "stacked-bar-1-0"));
    expect(upper.y + upper.height).toBeCloseTo(lower.y, 6);
    expect(upper.y).toBe(500);
    expect(result.svg).toMatchSnapshot();
  });

  it("stacks negative bar segments independently below the zero axis", () => {
    const result = compileChart("stacked-bar", {
      data: {
        categories: ["A"],
        series: [
          { name: "Base", values: [-2] },
          { name: "Bottom", values: [-3] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    });

    const first = rectGeometry(nodeWithId(result, "stacked-bar-0-0"));
    const second = rectGeometry(nodeWithId(result, "stacked-bar-1-0"));
    expect(first.y + first.height).toBeCloseTo(second.y, 6);
    expect(second.y + second.height).toBe(9200);
  });

  it("places grouped bars side-by-side with a 10% bar gap and non-overlapping category groups", () => {
    const result = compileChart("grouped-bar", {
      data: {
        categories: ["A", "B"],
        series: [
          { name: "First", values: [3, 4] },
          { name: "Second", values: [2, 1] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    }, { seed: 42, prettyPrint: true });

    const first = rectGeometry(nodeWithId(result, "grouped-bar-0-0"));
    const second = rectGeometry(nodeWithId(result, "grouped-bar-1-0"));
    const nextGroup = rectGeometry(nodeWithId(result, "grouped-bar-0-1"));
    expect(first.x + first.width).toBeLessThan(second.x);
    expect(second.x - (first.x + first.width)).toBeCloseTo(first.width * 0.1, 6);
    expect(second.x + second.width).toBeLessThan(nextGroup.x);
    expect(result.svg).toMatchSnapshot();
  });

  it("renders combo bars and a line with a right axis when magnitudes differ by more than 10x", () => {
    const result = compileChart("combo", {
      data: {
        categories: ["A", "B", "C"],
        series: [
          { name: "Units", values: [2, 5, 3] },
          { name: "Revenue", values: [2000, 5000, 3000] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    }, { seed: 42, prettyPrint: true });

    expect(nodeWithId(result, "combo-bar-0").type).toBe("rect");
    expect(nodeWithId(result, "combo-line").type).toBe("path");
    expect(nodeWithId(result, "right-y-label-0").type).toBe("text");
    expect(result.accessibility.altText).toContain("separate right-hand axis");
    expect(result.svg).toMatchSnapshot();
  });

  it("uses a shared axis for combo series within one order of magnitude", () => {
    const result = compileChart("combo", {
      data: {
        categories: ["A", "B"],
        series: [
          { name: "Bars", values: [20, 40] },
          { name: "Line", values: [30, 50] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    });

    expect(
      flattenNodes(result.sceneGraph.root).some((node) =>
        node.id.startsWith("right-y-label-")
      ),
    ).toBe(false);
    expect(result.accessibility.altText).toContain("shared value axis");
  });

  it.each([
    ["area", "Area chart"],
    ["stacked-bar", "Stacked bar chart"],
    ["grouped-bar", "Grouped bar chart"],
    ["combo", "Combo chart"],
  ] as const)("generates a sane multi-series accessibility description for %s", (chartType, name) => {
    const result = compileChart(chartType, {
      data: {
        categories: ["A", "B"],
        series: [
          { name: "First", values: [1, 2] },
          { name: "Second", values: [3, 4] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
      config: { title: "Accessible fixture" },
    });

    expect(result.accessibility.altText).toContain(`${name} titled \"Accessible fixture\"`);
    expect(result.accessibility.altText).toContain("2 series across 2 categories");
    expect(result.accessibility.dataSummary).toHaveLength(4);
    expect(
      result.accessibility.dataSummary.every((point) =>
        point.category.includes(" – ")
      ),
    ).toBe(true);
  });

  it("filters a non-finite series value without shifting later category positions", () => {
    const result = compileChart("grouped-bar", {
      data: {
        categories: ["A", "B", "C"],
        series: [
          { name: "First", values: [1, Number.NaN, 3] },
          { name: "Second", values: [4, 5, 6] },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    });

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "NON_FINITE_DATA",
        path: "data.series[0].values[1]",
      }),
    ]);
    expect(nodeWithId(result, "grouped-bar-0-2").metadata?.category).toBe("C");
    expectFiniteSvg(result.svg);
  });
});

describe("warning surface", () => {
  it("warns when marimekko uses the explicit bar fallback", () => {
    const result = compileChart("marimekko", inputFor("marimekko", [1, 2, 3]));

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "UNSUPPORTED_CHART_TYPE",
        path: "chartType",
        value: "marimekko",
        message: expect.stringContaining("not natively supported, rendered as bar"),
      }),
    ]);
    expect(result.svg).toContain("bar-0");
  });

  it("filters non-finite values and returns structured warnings", () => {
    const result = compileChart("bar", inputFor("bar", [1, Number.NaN, Number.POSITIVE_INFINITY, 2]));
    const warnings = result.warnings ?? [];

    expect(warnings).toHaveLength(2);
    expect(warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "NON_FINITE_DATA",
        path: "data.values[1]",
        value: Number.NaN,
      }),
      expect.objectContaining({
        code: "NON_FINITE_DATA",
        path: "data.values[2]",
        value: Number.POSITIVE_INFINITY,
      }),
    ]));
    expect(result.accessibility.dataSummary.map((point) => point.value)).toEqual([1, 2]);
    expectFiniteSvg(result.svg);
  });

  it("drops a scatter point when either coordinate is non-finite", () => {
    const result = compileChart("scatter", {
      data: {
        points: [
          { x: 1, y: 2, label: "valid" },
          { x: Number.POSITIVE_INFINITY, y: 3, label: "invalid" },
        ],
      },
      encoding: {},
      constraints: { width: 800, height: 600 },
    });

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "NON_FINITE_DATA",
        path: "data.points[1].x",
      }),
    ]);
    expect(result.accessibility.dataSummary).toHaveLength(1);
    expectFiniteSvg(result.svg);
  });

  it("names an unknown chart type while preserving fallback rendering", () => {
    const unknownType = "heatmap" as ChartType;
    const result = compileChart(unknownType, inputFor("bar", [1, 2, 3]));

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "UNKNOWN_CHART_TYPE",
        path: "chartType",
        value: "heatmap",
        message: expect.stringContaining("heatmap"),
      }),
    ]);
    expect(result.svg).toContain("bar-0");
    expectFiniteSvg(result.svg);
  });
});
