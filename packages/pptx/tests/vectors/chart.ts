import type { PaperDocument } from "../../src/types/ast.js";

export const chartVectors: Record<string, PaperDocument> = {
  "chart-bar-clustered": {
    type: "Document",
    meta: { title: "Chart Bar Clustered" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "bar",
              barGrouping: "clustered",
              categories: ["Q1", "Q2", "Q3", "Q4"],
              series: [
                { name: "Revenue", values: [12400, 15800, 14200, 18600], color: "#4472C4" },
                { name: "Expenses", values: [9800, 11200, 10500, 13100], color: "#ED7D31" },
              ],
            },
          },
        ],
      },
    ],
  },

  "chart-bar-stacked": {
    type: "Document",
    meta: { title: "Chart Bar Stacked" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "bar",
              barGrouping: "stacked",
              categories: ["Q1", "Q2", "Q3", "Q4"],
              series: [
                { name: "Hardware", values: [5200, 6100, 5800, 7300], color: "#4472C4" },
                { name: "Software", values: [8400, 9700, 10200, 11500], color: "#ED7D31" },
                { name: "Services", values: [3100, 3600, 4200, 4800], color: "#A5A5A5" },
              ],
            },
          },
        ],
      },
    ],
  },

  "chart-line-standard": {
    type: "Document",
    meta: { title: "Chart Line Standard" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "line",
              lineGrouping: "standard",
              categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
              series: [
                { name: "2024 Sales", values: [4200, 4800, 5100, 4700, 5600, 6200], color: "#4472C4" },
                { name: "2025 Sales", values: [4900, 5300, 5800, 5500, 6100, 6900], color: "#ED7D31" },
              ],
            },
          },
        ],
      },
    ],
  },

  "chart-line-stacked": {
    type: "Document",
    meta: { title: "Chart Line Stacked" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "line",
              lineGrouping: "stacked",
              categories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
              series: [
                { name: "Online Orders", values: [320, 410, 390, 470, 520], color: "#4472C4" },
                { name: "In-Store Orders", values: [180, 210, 195, 230, 260], color: "#ED7D31" },
              ],
            },
          },
        ],
      },
    ],
  },

  "chart-pie": {
    type: "Document",
    meta: { title: "Chart Pie" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "pie",
              categories: ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"],
              series: [
                { name: "Market Share", values: [38, 27, 21, 9, 5] },
              ],
            },
          },
        ],
      },
    ],
  },

  "chart-with-title": {
    type: "Document",
    meta: { title: "Chart With Title" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "bar",
              barGrouping: "clustered",
              categories: ["Q1", "Q2", "Q3", "Q4"],
              series: [
                { name: "Domestic", values: [22000, 25400, 27100, 30800], color: "#4472C4" },
                { name: "International", values: [14500, 17200, 19800, 23100], color: "#ED7D31" },
              ],
              title: { text: "Revenue Report", bold: true, fontSize: 18 },
            },
          },
        ],
      },
    ],
  },

  "chart-hidden-axes": {
    type: "Document",
    meta: { title: "Chart Hidden Axes" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "line",
              lineGrouping: "standard",
              categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
              series: [
                { name: "Response Time (ms)", values: [120, 95, 110, 88, 102], color: "#4472C4" },
                { name: "Error Rate (%)", values: [2.1, 1.8, 2.5, 1.4, 1.9], color: "#ED7D31" },
              ],
              categoryAxis: { visible: false },
              valueAxis: { visible: false },
            },
          },
        ],
      },
    ],
  },

  "chart-no-legend": {
    type: "Document",
    meta: { title: "Chart No Legend" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 700, height: 400 },
            chartData: {
              chartType: "bar",
              barGrouping: "clustered",
              categories: ["Product A", "Product B", "Product C", "Product D"],
              series: [
                { name: "Units Sold", values: [1450, 2300, 980, 1870], color: "#4472C4" },
              ],
              legend: { position: "none" },
            },
          },
        ],
      },
    ],
  },
};
