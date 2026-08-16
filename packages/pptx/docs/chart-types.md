# Chart Types

`@runstamp/pptx` supports six editable chart types. Every chart includes an embedded Excel workbook, so recipients can double-click the chart in PowerPoint to edit the underlying data.

---

## Supported Types

| Type | `chartType` Value | Best For |
|------|-------------------|----------|
| Bar | `"bar"` | Comparing categories |
| Line | `"line"` | Trends over time |
| Pie | `"pie"` | Proportions of a whole |
| Doughnut | `"doughnut"` | Proportions with a center label |
| Scatter | `"scatter"` | Correlation between two variables |
| Area | `"area"` | Volume trends over time |

---

## ChartData Structure

All chart types share the same `ChartData` interface:

```typescript docs-verify=parse
{
  type: "Chart",
  style: { x: 80, y: 100, width: 500, height: 350 },
  chartData: {
    chartType: "bar",            // one of the six types above
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "Revenue", values: [100, 200, 300, 400] },
    ],
    // Optional configuration:
    colors: ["#2563EB", "#F59E0B", "#10B981"],
    title: { text: "Quarterly Revenue" },
    legend: { position: "bottom" },
    categoryAxis: { title: "Quarter" },
    valueAxis: { title: "Revenue ($K)" },
  },
}
```

---

## Examples by Type

### Bar Chart

```typescript docs-verify=parse
chartData: {
  chartType: "bar",
  categories: ["North", "South", "East", "West"],
  series: [
    { name: "2025", values: [120, 90, 140, 110] },
    { name: "2026", values: [150, 110, 160, 130] },
  ],
  barGrouping: "clustered",   // "clustered" | "stacked" | "percentStacked"
  colors: ["#3B82F6", "#EF4444"],
}
```

### Line Chart

```typescript docs-verify=parse
chartData: {
  chartType: "line",
  categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [
    { name: "Users", values: [1000, 1200, 1800, 2400, 3100, 4000] },
    { name: "Sessions", values: [2000, 2500, 3600, 4800, 6200, 8000] },
  ],
  lineGrouping: "standard",  // "standard" | "stacked" | "percentStacked"
  colors: ["#2563EB", "#10B981"],
}
```

### Pie Chart

```typescript docs-verify=parse
chartData: {
  chartType: "pie",
  categories: ["Desktop", "Mobile", "Tablet"],
  series: [
    { name: "Traffic", values: [55, 35, 10] },
  ],
  colors: ["#3B82F6", "#F59E0B", "#8B5CF6"],
}
```

### Doughnut Chart

```typescript docs-verify=parse
chartData: {
  chartType: "doughnut",
  categories: ["Completed", "In Progress", "Not Started"],
  series: [
    { name: "Tasks", values: [42, 18, 7] },
  ],
  holeSize: 60,   // inner hole percentage (0-90)
  colors: ["#10B981", "#F59E0B", "#EF4444"],
}
```

### Scatter Chart

Scatter charts use `xySeries` with explicit `{ x, y }` data points instead of categories:

```typescript docs-verify=parse
chartData: {
  chartType: "scatter",
  xySeries: [
    {
      name: "Dataset A",
      dataPoints: [
        { x: 1, y: 2.1 },
        { x: 2, y: 3.5 },
        { x: 3, y: 3.8 },
        { x: 4, y: 5.2 },
        { x: 5, y: 6.0 },
        { x: 6, y: 7.1 },
      ],
    },
  ],
  colors: ["#8B5CF6"],
  categoryAxis: { title: "X Axis" },
  valueAxis: { title: "Y Axis" },
}
```

### Area Chart

```typescript docs-verify=parse
chartData: {
  chartType: "area",
  categories: ["Q1", "Q2", "Q3", "Q4"],
  series: [
    { name: "Product A", values: [30, 45, 60, 80] },
    { name: "Product B", values: [20, 35, 50, 65] },
  ],
  areaGrouping: "stacked",   // "standard" | "stacked" | "percentStacked"
  colors: ["#3B82F6", "#10B981"],
}
```

---

## Styling Options

### Colors

The `colors` array assigns a color to each series (bar, line, area) or each segment (pie, doughnut). Colors are hex strings.

```typescript docs-verify=skip docs-verify-reason="partial styling fragment"
colors: ["#2563EB", "#F59E0B", "#10B981", "#EF4444"]
```

### Chart Title

```typescript docs-verify=skip docs-verify-reason="partial styling fragment"
title: { text: "Revenue by Region" }
```

### Legend

```typescript docs-verify=skip docs-verify-reason="partial styling fragment"
legend: {
  position: "bottom",  // "bottom" | "top" | "left" | "right" | "none"
}
```

### Axis Configuration

```typescript docs-verify=skip docs-verify-reason="partial styling fragment"
categoryAxis: {
  title: "Quarter",
  min: 0,
  max: 100,
},
valueAxis: {
  title: "Revenue ($K)",
  min: 0,
  max: 500,
  gridlines: { color: "#E5E7EB" },
}
```

### Data Labels

```typescript docs-verify=skip docs-verify-reason="partial styling fragment"
dataLabels: {
  showVal: true,        // show the value
  showCatName: false,   // show the category name
  showSerName: false,   // show the series name
  showPercent: true,    // show percentage (pie/doughnut)
  position: "outsideEnd",
}
```

### Per-Series Styling

Individual series can override markers and trendlines:

```typescript docs-verify=skip docs-verify-reason="partial styling fragment"
series: [{
  name: "Revenue",
  values: [100, 200, 300],
  marker: { symbol: "circle", size: 8 },
  trendline: { type: "linear", displayEquation: true },
}]
```

---

## Embedded Excel

Every chart rendered by `@runstamp/pptx` includes a fully functional embedded Excel workbook (`.xlsx`) inside the `.pptx` file. When a user double-clicks the chart in PowerPoint, Excel opens with the source data, and any edits to that data update the chart immediately.

This is the same behavior as charts created natively in PowerPoint. No macros, no external data links.

---

## Need More Chart Types?

`@runstamp/pptx` covers the six most common chart types. If your project requires advanced chart types, upgrade to `@runstamp/pptx-pro`, which adds:

- Waterfall charts
- Combo charts (mixed bar + line)
- Treemap and sunburst charts
- Funnel charts
- Radar charts
- Bubble charts
- Stock charts (OHLC)
- Histogram and box-whisker charts

See [UPGRADE.md](../UPGRADE.md) for the migration guide.
