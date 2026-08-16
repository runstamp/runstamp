/**
 * Regression test for the Phase-5 (charts) engine fix:
 *
 * The bar/column/line/area chart SVG generator emitted category labels
 * verbatim without checking whether they fit the per-category gutter.
 * Long labels overran their slots and bled into adjacent labels — the
 * proof rendering of `F-DX-CH-007` showed
 * "Enterprise — North AmericaEnterprise — Europe..." running together
 * as one streak of unreadable glyphs. The horizontal-bar / pie / radar
 * chart paths already truncated with `.substring(0, N)` so the bug
 * lived only in the wider chart family.
 *
 * Fix: column charts rotate exact category names when the horizontal slot is
 * too narrow. Chart types with fixed label gutters continue to truncate
 * defensively.
 */
import { describe, expect, it } from 'vitest';
import { generateChartSVG } from '../src/elements/charts/chart-image-generator';
import type { ChartElement } from '../src/types';

function makeChart(overrides: Partial<ChartElement> = {}): ChartElement {
  return {
    id: 'chart-test',
    type: 'chart',
    chartType: 'column',
    position: { x: 0, y: 0, width: 480, height: 320 },
    zIndex: 0,
    opacity: 1,
    style: undefined as never,
    title: 'Customer segments',
    series: [{ name: 'Revenue', values: [250, 180, 320, 95, 410, 75] }],
    categories: [
      'Enterprise — North America',
      'Enterprise — Europe / Middle East / Africa',
      'Mid-market — Asia Pacific',
      'SMB — Latin America',
      'Self-serve — Global',
      'Education non-profit partners',
    ],
    ...overrides,
  } as ChartElement;
}

describe('chart category-label fitting', () => {
  it('rotates long column-chart labels without losing category names', () => {
    const svg = generateChartSVG(makeChart(), { width: 480, height: 320 });
    expect(svg).toContain('transform="rotate(-35 ');
    expect(svg).toContain('Enterprise — North America');
    expect(svg).toContain('Enterprise — Europe / Middle East / Africa');
    expect(svg).not.toContain('…');
  });

  it('keeps short labels intact', () => {
    const svg = generateChartSVG(
      makeChart({
        categories: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
      }),
      { width: 480, height: 320 },
    );
    expect(svg).toContain('>Q1<');
    expect(svg).toContain('>Q6<');
    expect(svg).not.toContain('transform="rotate(-35 ');
    expect(svg).not.toContain('…');
  });

  it('also truncates radar chart axis labels', () => {
    const svg = generateChartSVG(
      makeChart({
        chartType: 'radar',
        categories: [
          'Quality of Service Delivery',
          'Average Resolution Time',
          'Customer Satisfaction Score',
          'Employee Engagement Index',
          'Operational Efficiency Score',
        ],
      }),
      { width: 480, height: 320 },
    );
    expect(svg).toContain('…');
    expect(svg).not.toContain('Quality of Service Delivery');
  });

  it('also truncates horizontal-bar chart category labels', () => {
    const svg = generateChartSVG(
      makeChart({
        chartType: 'bar',
        categories: [
          'Verylongproductnameone',
          'Anotherreallylongname',
          'Shortname',
        ],
        series: [{ name: 'Revenue', values: [100, 200, 300] }],
      }),
      { width: 480, height: 320 },
    );
    expect(svg).toContain('…');
    expect(svg).toContain('Shortname');
  });
});
