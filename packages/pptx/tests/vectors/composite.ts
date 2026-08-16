import type { PaperDocument } from "../../src/types/ast.js";

const RED_1x1_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const BLUE_1x1_JPG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRJFiF2SEoqIyN/DwJDVCYXElFhQ0R1clYicoKyssEzY3Kji4UEHB/9oADAMBAAIRAxEAPwC5/9k=";

export const compositeVectors: Record<string, PaperDocument> = {
  // #47 — Dashboard: Text title + bar Chart + 3x2 Table + colored View, all on one slide
  "composite-dashboard": {
    type: "Document",
    meta: { title: "Composite Dashboard" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 24,
              fontWeight: "bold",
              color: "#1A1A2E",
              textAlign: "center",
              width: 960,
              height: 40,
            },
            content: "Q4 2025 Performance Dashboard",
          },
          {
            type: "Chart",
            style: { width: 400, height: 250, marginTop: 10 },
            chartData: {
              chartType: "bar",
              barGrouping: "clustered",
              categories: ["Oct", "Nov", "Dec"],
              series: [
                { name: "Revenue ($K)", values: [142, 168, 195], color: "#2E86AB" },
                { name: "Costs ($K)", values: [98, 107, 121], color: "#E8475F" },
              ],
              title: { text: "Monthly Revenue vs Costs", bold: true, fontSize: 14 },
              legend: { position: "bottom" },
            },
          },
          {
            type: "Table",
            style: { width: 480, height: 90, marginTop: 10 },
            tableData: {
              columns: [160, 160, 160],
              rows: [
                {
                  height: 30,
                  cells: [
                    { text: "Region" },
                    { text: "Deals Closed" },
                    { text: "Pipeline ($M)" },
                  ],
                },
                {
                  height: 30,
                  cells: [
                    { text: "North America" },
                    { text: "47" },
                    { text: "3.2" },
                  ],
                },
                {
                  height: 30,
                  cells: [
                    { text: "EMEA" },
                    { text: "31" },
                    { text: "2.1" },
                  ],
                },
              ],
            },
          },
          {
            type: "View",
            style: {
              width: 200,
              height: 80,
              backgroundColor: "#EDF7ED",
              padding: 10,
            },
            children: [
              {
                type: "Text",
                style: { fontSize: 12, color: "#2E7D32" },
                content: "Status: All systems operational",
              },
            ],
          },
        ],
      },
    ],
  },

  // #48 — Multi-slide: slide 1 has Text+View, slide 2 has Chart, slide 3 has Table
  "composite-multi-slide": {
    type: "Document",
    meta: { title: "Composite Multi-Slide" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 28,
              fontWeight: "bold",
              color: "#212121",
              textAlign: "center",
              width: 960,
              height: 50,
            },
            content: "Annual Report 2025",
          },
          {
            type: "View",
            style: {
              width: 800,
              height: 300,
              backgroundColor: "#F5F5F5",
              padding: 20,
              flexDirection: "column",
            },
            children: [
              {
                type: "Text",
                style: { fontSize: 16, color: "#424242" },
                content:
                  "This presentation covers the financial performance, market analysis, and strategic outlook for the fiscal year ending December 2025.",
              },
              {
                type: "Text",
                style: { fontSize: 14, fontStyle: "italic", color: "#757575", marginTop: 20 },
                content: "Prepared by the Office of the CFO",
              },
            ],
          },
        ],
      },
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 800, height: 450 },
            chartData: {
              chartType: "line",
              lineGrouping: "standard",
              categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              series: [
                {
                  name: "2024 Revenue",
                  values: [82, 78, 91, 87, 95, 102, 98, 105, 112, 118, 124, 131],
                  color: "#90A4AE",
                },
                {
                  name: "2025 Revenue",
                  values: [95, 92, 108, 104, 115, 123, 119, 128, 137, 142, 151, 163],
                  color: "#1565C0",
                },
              ],
              title: { text: "Revenue Trend ($M)", bold: true, fontSize: 16 },
              legend: { position: "bottom" },
            },
          },
        ],
      },
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Table",
            style: { width: 800, height: 200 },
            tableData: {
              columns: [200, 150, 150, 150, 150],
              rows: [
                {
                  height: 40,
                  cells: [
                    { text: "Business Unit" },
                    { text: "Q1" },
                    { text: "Q2" },
                    { text: "Q3" },
                    { text: "Q4" },
                  ],
                },
                {
                  height: 40,
                  cells: [
                    { text: "Cloud Services" },
                    { text: "$42.1M" },
                    { text: "$47.8M" },
                    { text: "$51.3M" },
                    { text: "$58.6M" },
                  ],
                },
                {
                  height: 40,
                  cells: [
                    { text: "Consulting" },
                    { text: "$18.4M" },
                    { text: "$19.2M" },
                    { text: "$21.7M" },
                    { text: "$24.1M" },
                  ],
                },
                {
                  height: 40,
                  cells: [
                    { text: "Licensing" },
                    { text: "$31.5M" },
                    { text: "$33.0M" },
                    { text: "$35.8M" },
                    { text: "$39.2M" },
                  ],
                },
                {
                  height: 40,
                  cells: [
                    { text: "Total" },
                    { text: "$92.0M" },
                    { text: "$100.0M" },
                    { text: "$108.8M" },
                    { text: "$121.9M" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },

  // #49 — Empty slide (children: [])
  "composite-empty-slide": {
    type: "Document",
    meta: { title: "Composite Empty Slide" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [],
      },
    ],
  },

  // #50 — Text + two Images + Group containing a View
  "composite-text-and-images": {
    type: "Document",
    meta: { title: "Composite Text and Images" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 20,
              fontWeight: "bold",
              color: "#333333",
              width: 960,
              height: 36,
              textAlign: "left",
            },
            content: "Product Gallery",
          },
          {
            type: "Image",
            style: { width: 200, height: 200, margin: 10 },
            src: RED_1x1_PNG,
          },
          {
            type: "Image",
            style: { width: 200, height: 200, margin: 10 },
            src: BLUE_1x1_JPG,
          },
          {
            type: "Group",
            style: {
              width: 400,
              height: 120,
              flexDirection: "row",
            },
            children: [
              {
                type: "View",
                style: {
                  width: 180,
                  height: 100,
                  backgroundColor: "#FFF3E0",
                  padding: 8,
                },
                children: [
                  {
                    type: "Text",
                    style: { fontSize: 11, color: "#E65100" },
                    content: "Featured product — limited availability. Order before March 31 for early-bird pricing.",
                  },
                ],
              },
              {
                type: "View",
                style: {
                  width: 180,
                  height: 100,
                  backgroundColor: "#E3F2FD",
                  padding: 8,
                },
                children: [
                  {
                    type: "Text",
                    style: { fontSize: 11, color: "#0D47A1" },
                    content: "New arrival — now shipping worldwide. Free returns within 30 days.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // #51 — Bar + Line + Pie charts all on one slide (~300x200 each)
  "composite-all-chart-types": {
    type: "Document",
    meta: { title: "Composite All Chart Types" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            style: { width: 300, height: 200 },
            chartData: {
              chartType: "bar",
              barGrouping: "clustered",
              categories: ["Alpha", "Beta", "Gamma", "Delta"],
              series: [
                { name: "Throughput", values: [840, 1120, 670, 980], color: "#4CAF50" },
                { name: "Latency", values: [320, 280, 410, 350], color: "#FF9800" },
              ],
              title: { text: "System Benchmarks", bold: true, fontSize: 12 },
              legend: { position: "bottom" },
            },
          },
          {
            type: "Chart",
            style: { width: 300, height: 200 },
            chartData: {
              chartType: "line",
              lineGrouping: "standard",
              categories: ["W1", "W2", "W3", "W4", "W5", "W6"],
              series: [
                { name: "Signups", values: [210, 245, 310, 295, 380, 420], color: "#1976D2" },
                { name: "Churn", values: [18, 22, 15, 20, 12, 9], color: "#D32F2F" },
              ],
              title: { text: "User Growth", bold: true, fontSize: 12 },
              legend: { position: "bottom" },
            },
          },
          {
            type: "Chart",
            style: { width: 300, height: 200 },
            chartData: {
              chartType: "pie",
              categories: ["Engineering", "Sales", "Marketing", "Operations", "Support"],
              series: [
                { name: "Headcount", values: [42, 28, 15, 10, 5] },
              ],
              title: { text: "Team Distribution", bold: true, fontSize: 12 },
              legend: { position: "bottom" },
            },
          },
        ],
      },
    ],
  },

  // #52 — Stress: 10 Texts + 5 colored Views + 2 Tables (2x2) + 1 bar Chart
  "composite-stress": {
    type: "Document",
    meta: { title: "Composite Stress" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          // 10 Text nodes with various sizes
          {
            type: "Text",
            style: { fontSize: 22, fontWeight: "bold", color: "#1A237E", width: 400, height: 30 },
            content: "Quarterly Business Review",
          },
          {
            type: "Text",
            style: { fontSize: 10, color: "#616161", width: 200, height: 16 },
            content: "Confidential — Internal Use Only",
          },
          {
            type: "Text",
            style: { fontSize: 14, color: "#212121", width: 300, height: 22 },
            content: "Revenue grew 18% year-over-year",
          },
          {
            type: "Text",
            style: { fontSize: 14, color: "#212121", width: 300, height: 22 },
            content: "Customer retention rate at 94.2%",
          },
          {
            type: "Text",
            style: { fontSize: 14, color: "#212121", width: 300, height: 22 },
            content: "NPS score improved from 62 to 71",
          },
          {
            type: "Text",
            style: { fontSize: 12, fontStyle: "italic", color: "#9E9E9E", width: 250, height: 18 },
            content: "Source: Internal Analytics Platform",
          },
          {
            type: "Text",
            style: { fontSize: 16, fontWeight: "bold", color: "#004D40", width: 300, height: 24 },
            content: "Key Initiatives for Next Quarter",
          },
          {
            type: "Text",
            style: { fontSize: 13, color: "#37474F", width: 350, height: 20 },
            content: "1. Launch self-service onboarding portal",
          },
          {
            type: "Text",
            style: { fontSize: 13, color: "#37474F", width: 350, height: 20 },
            content: "2. Expand APAC sales team by 40%",
          },
          {
            type: "Text",
            style: { fontSize: 13, color: "#37474F", width: 350, height: 20 },
            content: "3. Migrate infrastructure to multi-region",
          },

          // 5 colored View nodes
          {
            type: "View",
            style: { width: 80, height: 40, backgroundColor: "#E8F5E9" },
          },
          {
            type: "View",
            style: { width: 80, height: 40, backgroundColor: "#FFF8E1" },
          },
          {
            type: "View",
            style: { width: 80, height: 40, backgroundColor: "#FFEBEE" },
          },
          {
            type: "View",
            style: { width: 80, height: 40, backgroundColor: "#E3F2FD" },
          },
          {
            type: "View",
            style: { width: 80, height: 40, backgroundColor: "#F3E5F5" },
          },

          // 2 Tables (2x2 each)
          {
            type: "Table",
            style: { width: 300, height: 60 },
            tableData: {
              columns: [150, 150],
              rows: [
                {
                  height: 30,
                  cells: [{ text: "Metric" }, { text: "Value" }],
                },
                {
                  height: 30,
                  cells: [{ text: "MRR" }, { text: "$1.42M" }],
                },
              ],
            },
          },
          {
            type: "Table",
            style: { width: 300, height: 60 },
            tableData: {
              columns: [150, 150],
              rows: [
                {
                  height: 30,
                  cells: [{ text: "Region" }, { text: "Growth" }],
                },
                {
                  height: 30,
                  cells: [{ text: "EMEA" }, { text: "+23%" }],
                },
              ],
            },
          },

          // 1 bar Chart
          {
            type: "Chart",
            style: { width: 400, height: 200 },
            chartData: {
              chartType: "bar",
              barGrouping: "stacked",
              categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
              series: [
                { name: "New Deals", values: [14, 19, 22, 17, 25, 28], color: "#1B5E20" },
                { name: "Renewals", values: [31, 28, 35, 33, 37, 42], color: "#81C784" },
                { name: "Upsells", values: [8, 11, 9, 13, 15, 18], color: "#C8E6C9" },
              ],
              title: { text: "Deal Flow by Type", bold: true, fontSize: 12 },
              legend: { position: "bottom" },
            },
          },
        ],
      },
    ],
  },
};
