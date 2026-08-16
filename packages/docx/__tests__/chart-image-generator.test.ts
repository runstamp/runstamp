/**
 * Chart Image Generator Tests
 * ===========================
 * Tests for the chart image generation utilities.
 */

import {
  registerChartRenderer,
  clearChartRenderers,
  getChartRenderer,
  renderChartToImage,
  generateChartSVG,
  chartToSVGDataUri,
  canRenderChartToImage,
  type ChartRenderer,
  type ChartImageData,
} from '../src/elements/charts/chart-image-generator';
import type { ChartElement, ComputedStyle, BoundingBox } from '../src/types';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function createDefaultStyle(): ComputedStyle {
  return {
    backgroundColor: undefined,
    backgroundImage: undefined,
    borderTopWidth: 0,
    borderTopColor: '',
    borderTopStyle: 'none',
    borderRightWidth: 0,
    borderRightColor: '',
    borderRightStyle: 'none',
    borderBottomWidth: 0,
    borderBottomColor: '',
    borderBottomStyle: 'none',
    borderLeftWidth: 0,
    borderLeftColor: '',
    borderLeftStyle: 'none',
    borderRadius: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    textDecoration: 'none',
    color: '#000000',
    display: 'block',
    visibility: 'visible',
    overflow: 'visible',
    opacity: 1,
  };
}

function createBoundingBox(x = 0, y = 0, width = 400, height = 300): BoundingBox {
  return { x, y, width, height };
}

function createChartElement(
  chartType: ChartElement['chartType'],
  options: Partial<ChartElement> = {}
): ChartElement {
  return {
    id: options.id ?? 'chart-1',
    type: 'chart',
    chartType,
    title: options.title,
    series: options.series ?? [
      { name: 'Series 1', values: [10, 20, 30, 40] },
    ],
    categories: options.categories ?? ['A', 'B', 'C', 'D'],
    embedData: true,
    style: createDefaultStyle(),
    position: options.position ?? createBoundingBox(),
    zIndex: 0,
    opacity: 1,
    tagName: 'div',
    dataAttributes: {},
  };
}

// =============================================================================
// CHART RENDERER REGISTRY TESTS
// =============================================================================

describe('Chart Renderer Registry', () => {
  beforeEach(() => {
    clearChartRenderers();
  });

  afterEach(() => {
    clearChartRenderers();
  });

  it('should register and retrieve a default chart renderer', async () => {
    const mockRenderer: ChartRenderer = async (element) => ({
      data: 'test-data',
      width: 400,
      height: 300,
      format: 'png',
    });

    registerChartRenderer(mockRenderer);

    const chart = createChartElement('bar');
    const renderer = getChartRenderer(chart);

    expect(renderer).toBe(mockRenderer);
  });

  it('should register and retrieve a type-specific renderer', async () => {
    const barRenderer: ChartRenderer = async () => ({
      data: 'bar-data',
      width: 400,
      height: 300,
      format: 'png',
    });

    const pieRenderer: ChartRenderer = async () => ({
      data: 'pie-data',
      width: 400,
      height: 300,
      format: 'png',
    });

    registerChartRenderer(barRenderer, 'bar');
    registerChartRenderer(pieRenderer, 'pie');

    const barChart = createChartElement('bar');
    const pieChart = createChartElement('pie');

    expect(getChartRenderer(barChart)).toBe(barRenderer);
    expect(getChartRenderer(pieChart)).toBe(pieRenderer);
  });

  it('should prefer type-specific renderer over default', async () => {
    const defaultRenderer: ChartRenderer = async () => ({
      data: 'default',
      width: 400,
      height: 300,
      format: 'png',
    });

    const barRenderer: ChartRenderer = async () => ({
      data: 'bar-specific',
      width: 400,
      height: 300,
      format: 'png',
    });

    registerChartRenderer(defaultRenderer);
    registerChartRenderer(barRenderer, 'bar');

    const barChart = createChartElement('bar');
    const lineChart = createChartElement('line');

    expect(getChartRenderer(barChart)).toBe(barRenderer);
    expect(getChartRenderer(lineChart)).toBe(defaultRenderer);
  });

  it('should return undefined when no renderer is registered', () => {
    const chart = createChartElement('bar');
    expect(getChartRenderer(chart)).toBeUndefined();
  });

  it('should clear all renderers', () => {
    registerChartRenderer(async () => ({ data: '', width: 0, height: 0, format: 'png' }));
    registerChartRenderer(async () => ({ data: '', width: 0, height: 0, format: 'png' }), 'bar');

    clearChartRenderers();

    const chart = createChartElement('bar');
    expect(getChartRenderer(chart)).toBeUndefined();
  });

  it('should render chart using registered renderer', async () => {
    const mockData: ChartImageData = {
      data: Buffer.from('test-image'),
      width: 400,
      height: 300,
      format: 'png',
    };

    registerChartRenderer(async () => mockData);

    const chart = createChartElement('bar');
    const result = await renderChartToImage(chart);

    expect(result).toEqual(mockData);
  });

  it('should return null when no renderer available', async () => {
    const chart = createChartElement('bar');
    const result = await renderChartToImage(chart);

    expect(result).toBeNull();
  });
});

// =============================================================================
// SVG CHART GENERATION TESTS
// =============================================================================

describe('SVG Chart Generation', () => {
  describe('Bar Charts', () => {
    it('should generate valid SVG for bar chart', () => {
      const chart = createChartElement('bar', {
        title: 'Sales Data',
        series: [
          { name: 'Q1', values: [100, 200, 150, 250] },
        ],
        categories: ['Jan', 'Feb', 'Mar', 'Apr'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('Sales Data');
      expect(svg).toContain('Jan');
      expect(svg).toContain('Q1');
    });

    it('should generate SVG for column chart', () => {
      const chart = createChartElement('column', {
        series: [{ name: 'Values', values: [10, 20, 30] }],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('<rect'); // Bars should be rectangles
    });

    it('should handle multiple series in bar chart', () => {
      const chart = createChartElement('bar', {
        series: [
          { name: 'Series A', values: [10, 20, 30] },
          { name: 'Series B', values: [15, 25, 35] },
        ],
        categories: ['X', 'Y', 'Z'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('Series A');
      expect(svg).toContain('Series B');
    });
  });

  describe('Line Charts', () => {
    it('should generate valid SVG for line chart', () => {
      const chart = createChartElement('line', {
        title: 'Trend Data',
        series: [
          { name: 'Trend', values: [10, 25, 15, 30, 20] },
        ],
        categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Trend Data');
      expect(svg).toContain('<polyline'); // Lines use polyline
      expect(svg).toContain('<circle'); // Points use circles
    });

    it('should handle multiple series in line chart', () => {
      const chart = createChartElement('line', {
        series: [
          { name: 'Line 1', values: [1, 2, 3] },
          { name: 'Line 2', values: [3, 2, 1] },
        ],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('Line 1');
      expect(svg).toContain('Line 2');
    });

    it('spaces year categories by elapsed time', () => {
      const chart = createChartElement('line', {
        series: [{ name: 'Trajectory', values: [10, 20, 30] }],
        categories: ['2023', '2024', '2026T'],
      });

      const svg = generateChartSVG(chart, { width: 400, padding: 40 });

      expect(svg).toContain('cx="170"');
      expect(svg).not.toContain('cx="217.5"');
    });
  });

  describe('Pie Charts', () => {
    it('should generate valid SVG for pie chart', () => {
      const chart = createChartElement('pie', {
        title: 'Market Share',
        series: [
          { name: 'Share', values: [30, 25, 20, 15, 10] },
        ],
        categories: ['Product A', 'Product B', 'Product C', 'Product D', 'Other'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Market Share');
      expect(svg).toContain('<path'); // Pie slices use paths
      expect(svg).toContain('30.0%');
      expect(svg).toContain('Product A');
    });

    it('preserves complete long legend labels', () => {
      const chart = createChartElement('pie', {
        series: [{ name: 'Share', values: [60, 40] }],
        categories: ['Abelard Diabetes Care', 'Meridian Biosensors'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('Abelard Diabetes Care');
      expect(svg).toContain('Meridian Biosensors');
    });

    it('should generate doughnut chart with inner radius', () => {
      const chart = createChartElement('doughnut', {
        series: [
          { name: 'Data', values: [40, 30, 30] },
        ],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('<path');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty series', () => {
      const chart = createChartElement('bar', {
        series: [],
        categories: [],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('No chart data available');
    });

    it('should handle zero values', () => {
      const chart = createChartElement('bar', {
        series: [{ name: 'Zero', values: [0, 0, 0] }],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
    });

    it('should handle negative values', () => {
      const chart = createChartElement('bar', {
        series: [{ name: 'Mixed', values: [-10, 20, -5, 15] }],
        categories: ['A', 'B', 'C', 'D'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
    });

    it('should escape XML special characters in title', () => {
      const chart = createChartElement('bar', {
        title: 'Sales < 2024 & Growth > 0',
        series: [{ name: 'Data', values: [10, 20] }],
        categories: ['A', 'B'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('&lt;');
      expect(svg).toContain('&gt;');
      expect(svg).toContain('&amp;');
    });

    it('should handle missing categories', () => {
      const chart = createChartElement('bar', {
        series: [{ name: 'Data', values: [10, 20, 30] }],
        categories: undefined,
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('1'); // Auto-generated category
    });
  });

  describe('Custom Options', () => {
    it('should respect custom dimensions', () => {
      const chart = createChartElement('bar');

      const svg = generateChartSVG(chart, {
        width: 800,
        height: 600,
      });

      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="600"');
    });

    it('should respect custom colors', () => {
      const chart = createChartElement('bar', {
        series: [{ name: 'Data', values: [10, 20] }],
      });

      const svg = generateChartSVG(chart, {
        colors: ['#FF0000', '#00FF00'],
      });

      expect(svg).toContain('#FF0000');
    });

    it('should respect custom background color', () => {
      const chart = createChartElement('bar');

      const svg = generateChartSVG(chart, {
        backgroundColor: '#EEEEEE',
      });

      expect(svg).toContain('fill="#EEEEEE"');
    });
  });
});

// =============================================================================
// DATA URI GENERATION TESTS
// =============================================================================

describe('Chart to Data URI', () => {
  it('should generate valid SVG data URI', () => {
    const chart = createChartElement('bar', {
      title: 'Test',
      series: [{ name: 'Data', values: [10, 20] }],
    });

    const dataUri = chartToSVGDataUri(chart);

    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should decode to valid SVG', () => {
    const chart = createChartElement('bar', {
      title: 'Decode Test',
    });

    const dataUri = chartToSVGDataUri(chart);
    const base64 = dataUri.replace('data:image/svg+xml;base64,', '');
    const svg = Buffer.from(base64, 'base64').toString('utf-8');

    expect(svg).toContain('<svg');
    expect(svg).toContain('Decode Test');
  });
});

// =============================================================================
// RENDER CAPABILITY TESTS
// =============================================================================

describe('Can Render Chart', () => {
  it('should return true for chart with data', () => {
    const chart = createChartElement('bar', {
      series: [{ name: 'Data', values: [1, 2, 3] }],
    });

    expect(canRenderChartToImage(chart)).toBe(true);
  });

  it('should return false for chart with empty series', () => {
    const chart = createChartElement('bar', {
      series: [],
    });

    expect(canRenderChartToImage(chart)).toBe(false);
  });

  it('should return false for chart with empty values', () => {
    const chart = createChartElement('bar', {
      series: [{ name: 'Empty', values: [] }],
    });

    expect(canRenderChartToImage(chart)).toBe(false);
  });

  it('should return true if any series has values', () => {
    const chart = createChartElement('bar', {
      series: [
        { name: 'Empty', values: [] },
        { name: 'Has Data', values: [1, 2, 3] },
      ],
    });

    expect(canRenderChartToImage(chart)).toBe(true);
  });
});

// =============================================================================
// AXIS LABEL TESTS
// =============================================================================

describe('Chart Axis Labels', () => {
  describe('Column Chart Y-Axis Labels', () => {
    it('should include Y-axis value labels', () => {
      const chart = createChartElement('column', {
        series: [{ name: 'Data', values: [0, 50, 100] }],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      // Should have numeric labels on Y-axis
      expect(svg).toContain('text-anchor="end"'); // Y-axis labels are right-aligned
      expect(svg).toContain('0'); // Min value
      expect(svg).toContain('100'); // Max value
    });

    it('should format large values with K suffix', () => {
      const chart = createChartElement('column', {
        series: [{ name: 'Data', values: [0, 5000, 10000] }],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      // Should contain K suffix for thousands
      expect(svg).toContain('K');
    });

    it('should format very large values with M suffix', () => {
      const chart = createChartElement('column', {
        series: [{ name: 'Data', values: [0, 5000000, 10000000] }],
        categories: ['A', 'B', 'C'],
      });

      const svg = generateChartSVG(chart);

      // Should contain M suffix for millions
      expect(svg).toContain('M');
    });
  });

  describe('Horizontal Bar Chart X-Axis Labels', () => {
    it('should include X-axis value labels', () => {
      const chart = createChartElement('bar', {
        series: [{ name: 'Data', values: [25, 50, 75] }],
        categories: ['Item 1', 'Item 2', 'Item 3'],
      });

      const svg = generateChartSVG(chart);

      // Should have numeric labels on X-axis (middle-aligned at bottom)
      expect(svg).toContain('text-anchor="middle"');
    });
  });

  describe('Line Chart Y-Axis Labels', () => {
    it('should include Y-axis value labels', () => {
      const chart = createChartElement('line', {
        series: [{ name: 'Trend', values: [10, 30, 20, 40, 25] }],
        categories: ['W1', 'W2', 'W3', 'W4', 'W5'],
      });

      const svg = generateChartSVG(chart);

      // Should have Y-axis labels
      expect(svg).toContain('text-anchor="end"');
    });
  });

  describe('Area Chart Y-Axis Labels', () => {
    it('should include Y-axis value labels', () => {
      const chart = createChartElement('area', {
        series: [{ name: 'Area', values: [100, 200, 150, 300] }],
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      });

      const svg = generateChartSVG(chart);

      // Should have Y-axis labels
      expect(svg).toContain('text-anchor="end"');
      // Should have polygon for area
      expect(svg).toContain('<polygon');
    });
  });

  describe('Scatter Chart Dual Axis Labels', () => {
    it('should include both X and Y axis labels', () => {
      const chart = createChartElement('scatter', {
        series: [{ name: 'Points', values: [10, 40, 25, 60, 35] }],
      });

      const svg = generateChartSVG(chart);

      // Should have both middle-aligned (X-axis) and end-aligned (Y-axis) labels
      expect(svg).toContain('text-anchor="middle"');
      expect(svg).toContain('text-anchor="end"');
    });
  });

  describe('Radar Chart', () => {
    it('should generate valid radar chart SVG', () => {
      const chart = createChartElement('radar', {
        series: [{ name: 'Skills', values: [80, 70, 90, 60, 85] }],
        categories: ['Speed', 'Power', 'Accuracy', 'Defense', 'Agility'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('<polygon'); // Radar uses polygons
      expect(svg).toContain('<circle'); // Grid circles
      expect(svg).toContain('Speed'); // Category labels
    });

    it('should handle multiple series in radar chart', () => {
      const chart = createChartElement('radar', {
        series: [
          { name: 'Player 1', values: [80, 70, 90] },
          { name: 'Player 2', values: [60, 85, 75] },
        ],
        categories: ['Skill A', 'Skill B', 'Skill C'],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('Player 1');
      expect(svg).toContain('Player 2');
    });
  });

  describe('Bubble Chart', () => {
    it('should generate valid bubble chart SVG', () => {
      const chart = createChartElement('bubble', {
        series: [{ name: 'Bubbles', values: [10, 50, 30, 80] }],
      });

      const svg = generateChartSVG(chart);

      expect(svg).toContain('<svg');
      expect(svg).toContain('<circle'); // Bubbles are circles
      // Bubble sizes should vary based on values
    });
  });
});
