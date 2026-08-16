import type { PaperDocument } from "../../src/types/ast.js";

function makeChartDoc(name: string, chartData: any): PaperDocument {
  return {
    type: "Document",
    meta: { title: name },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400, margin: 20 },
            chartData,
          },
        ],
      },
    ],
  };
}

export const advancedChartVectors: Record<string, PaperDocument> = {
  // Pie chart with explosion
  "chart-pie-exploded": makeChartDoc("chart-pie-exploded", {
    chartType: "pie",
    categories: ["Engineering", "Sales", "Marketing", "Operations"],
    series: [{ name: "Headcount", values: [42, 28, 15, 10] }],
    explosion: 25,
    title: { text: "Team Distribution", bold: true, fontSize: 16 },
  }),

  // Doughnut chart
  "chart-doughnut": makeChartDoc("chart-doughnut", {
    chartType: "doughnut",
    categories: ["Product A", "Product B", "Product C", "Product D"],
    series: [{ name: "Revenue", values: [35, 25, 22, 18] }],
    holeSize: 50,
    title: { text: "Revenue Split", bold: true, fontSize: 16 },
    legend: { position: "bottom" },
  }),

  // Area chart (stacked)
  "chart-area-stacked": makeChartDoc("chart-area-stacked", {
    chartType: "area",
    areaGrouping: "stacked",
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "Organic", values: [1200, 1500, 1800, 2200], color: "#4472C4" },
      { name: "Paid", values: [800, 1100, 1400, 1700], color: "#ED7D31" },
      { name: "Referral", values: [400, 600, 700, 900], color: "#70AD47" },
    ],
    title: { text: "Traffic Sources (Stacked)", bold: true, fontSize: 16 },
    legend: { position: "bottom" },
  }),

  // Radar chart
  "chart-radar": makeChartDoc("chart-radar", {
    chartType: "radar",
    radarStyle: "radar",
    categories: ["Speed", "Reliability", "Cost", "Features", "Support", "Security"],
    series: [
      { name: "Product A", values: [90, 75, 60, 85, 70, 95], color: "#4472C4" },
      { name: "Product B", values: [70, 85, 80, 65, 90, 75], color: "#ED7D31" },
    ],
    title: { text: "Product Comparison", bold: true, fontSize: 16 },
    legend: { position: "bottom" },
  }),

  // Stacked bar (horizontal)
  "chart-bar-horizontal-stacked": makeChartDoc("chart-bar-horizontal-stacked", {
    chartType: "bar",
    barGrouping: "stacked",
    barDirection: "bar",
    categories: ["North America", "Europe", "APAC", "LATAM"],
    series: [
      { name: "Enterprise", values: [42, 31, 28, 15], color: "#4472C4" },
      { name: "Mid-Market", values: [35, 28, 22, 12], color: "#ED7D31" },
      { name: "SMB", values: [20, 18, 15, 8], color: "#A5A5A5" },
    ],
    title: { text: "Revenue by Segment", bold: true, fontSize: 16 },
    legend: { position: "bottom" },
  }),

  // Line chart with markers and smooth lines
  "chart-line-smooth-markers": makeChartDoc("chart-line-smooth-markers", {
    chartType: "line",
    lineGrouping: "standard",
    smooth: true,
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    series: [
      {
        name: "Actual",
        values: [120, 145, 135, 165, 155, 180],
        color: "#4472C4",
        marker: { symbol: "circle", size: 8 },
      },
      {
        name: "Target",
        values: [130, 140, 150, 160, 170, 180],
        color: "#ED7D31",
        marker: { symbol: "diamond", size: 6 },
      },
    ],
    title: { text: "Actual vs Target", bold: true, fontSize: 16 },
    legend: { position: "bottom" },
  }),
};
