// full-report.ts -- Complete quarterly business report with ~10 slides.
// Showcases charts, tables, KPI cards, styled text, and varied layouts.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/full-report.ts

import fs from "node:fs";
import { PaperEngine, type PaperDocument, type PaperSlide } from "../dist-lite/index.js";

// -- Slide 1: Title --------------------------------------------------------

const titleSlide: PaperSlide = {
  backgroundColor: "#0F172A",
  children: [
    {
      type: "View",
      style: { position: "absolute", top: 0, left: 0, width: 1280, height: 720, backgroundColor: "#0F172A" },
      shapeType: "rect",
    },
    {
      type: "Text",
      content: "Q4 2025 Business Review",
      style: {
        position: "absolute", top: 200, left: 100, width: 1080, height: 80,
        fontSize: 48, fontWeight: "bold", color: "#FFFFFF", textAlign: "center",
      },
    },
    {
      type: "Text",
      content: "Meridian Technologies, Inc.",
      style: {
        position: "absolute", top: 300, left: 100, width: 1080, height: 40,
        fontSize: 22, color: "#94A3B8", textAlign: "center",
      },
    },
    {
      type: "Text",
      content: "Prepared for the Board of Directors  |  January 2026  |  Confidential",
      style: {
        position: "absolute", top: 620, left: 100, width: 1080, height: 30,
        fontSize: 11, color: "#475569", textAlign: "center",
      },
    },
  ],
};

// -- Slide 2: Agenda -------------------------------------------------------

const agendaSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Agenda",
      style: {
        position: "absolute", top: 30, left: 60, width: 400, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Text",
      paragraphs: [
        { runs: [{ text: "1.  Financial Highlights", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "2.  Revenue Breakdown", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "3.  Customer Metrics", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "4.  Product Performance", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "5.  Regional Analysis", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "6.  Operating Expenses", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "7.  Outlook and Guidance", style: { fontSize: 20, color: "#1E293B" } }], spaceAfter: 14 },
        { runs: [{ text: "8.  Appendix", style: { fontSize: 20, color: "#1E293B" } }] },
      ],
      style: {
        position: "absolute", top: 110, left: 120, width: 800, height: 500,
      },
    },
  ],
};

// -- Slide 3: Financial Highlights (KPI cards) -----------------------------

function kpiCard(top: number, left: number, label: string, value: string, change: string, changeColor: string): PaperSlide["children"][number] {
  return {
    type: "View",
    style: {
      position: "absolute", top, left, width: 250, height: 140,
      backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 8,
    },
    shapeType: "roundRect",
    textParagraphs: [
      { runs: [{ text: label, style: { fontSize: 12, color: "#64748B" } }], align: "center", spaceAfter: 6 },
      { runs: [{ text: value, style: { fontSize: 32, fontWeight: "bold", color: "#0F172A" } }], align: "center", spaceAfter: 4 },
      { runs: [{ text: change, style: { fontSize: 13, fontWeight: "bold", color: changeColor } }], align: "center" },
    ],
  };
}

const financialSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Financial Highlights",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    kpiCard(110, 60, "REVENUE", "$18.4M", "+22% QoQ", "#059669"),
    kpiCard(110, 340, "GROSS MARGIN", "74.2%", "+1.8pp QoQ", "#059669"),
    kpiCard(110, 620, "NET INCOME", "$3.1M", "+35% QoQ", "#059669"),
    kpiCard(110, 900, "FREE CASH FLOW", "$2.8M", "+28% QoQ", "#059669"),
    kpiCard(290, 60, "ARR", "$68.5M", "+41% YoY", "#059669"),
    kpiCard(290, 340, "CUSTOMERS", "1,247", "+89 net new", "#2563EB"),
    kpiCard(290, 620, "NRR", "118%", "+2pp QoQ", "#059669"),
    kpiCard(290, 900, "EMPLOYEES", "312", "+24 Q4", "#2563EB"),
    {
      type: "Text", content: "All figures unaudited. QoQ = quarter-over-quarter; YoY = year-over-year.",
      style: {
        position: "absolute", top: 660, left: 60, width: 1000, height: 20,
        fontSize: 10, color: "#94A3B8",
      },
    },
  ],
};

// -- Slide 4: Revenue Breakdown (bar chart) --------------------------------

const revenueSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Revenue Breakdown",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 60, width: 1160, height: 540 },
      chartData: {
        chartType: "bar",
        categories: ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"],
        series: [
          { name: "Subscription", values: [9800, 10900, 12300, 14200], color: "#2563EB" },
          { name: "Professional Services", values: [1400, 1600, 1800, 2100], color: "#7C3AED" },
          { name: "Marketplace", values: [800, 1100, 1500, 2100], color: "#059669" },
        ],
        barGrouping: "stacked",
        valueAxis: { title: "Revenue ($K)", numberFormat: "$#,##0" },
        categoryAxis: { title: "Quarter" },
        dataLabels: { showVal: true, position: "ctr", fontColor: "#FFFFFF", fontSize: 10 },
      },
    },
  ],
};

// -- Slide 5: Customer Metrics (line chart) --------------------------------

const customerSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Customer Growth",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 60, width: 700, height: 540 },
      chartData: {
        chartType: "line",
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        series: [
          { name: "Enterprise", values: [340, 352, 368, 385, 398, 412, 430, 448, 465, 488, 510, 538], color: "#2563EB" },
          { name: "Mid-Market", values: [280, 295, 310, 328, 345, 362, 378, 395, 412, 430, 448, 468], color: "#7C3AED" },
          { name: "SMB", values: [120, 128, 138, 150, 162, 175, 188, 198, 210, 220, 232, 241], color: "#F59E0B" },
        ],
        valueAxis: { title: "Active Customers" },
      },
    },
    // Churn stats sidebar
    {
      type: "View",
      style: {
        position: "absolute", top: 110, left: 800, width: 420, height: 180,
        backgroundColor: "#FEF2F2", borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "Churn Analysis", style: { fontSize: 16, fontWeight: "bold", color: "#991B1B" } }], spaceAfter: 8 },
        { runs: [{ text: "Logo churn: 2.1% (down from 3.4%)", style: { fontSize: 13, color: "#7F1D1D" } }], spaceAfter: 4 },
        { runs: [{ text: "Revenue churn: 0.8% (best quarter ever)", style: { fontSize: 13, color: "#7F1D1D" } }], spaceAfter: 4 },
        { runs: [{ text: "Top reason: budget cuts (38%)", style: { fontSize: 13, color: "#7F1D1D" } }] },
      ],
    },
    {
      type: "View",
      style: {
        position: "absolute", top: 320, left: 800, width: 420, height: 180,
        backgroundColor: "#F0FDF4", borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "Expansion Revenue", style: { fontSize: 16, fontWeight: "bold", color: "#166534" } }], spaceAfter: 8 },
        { runs: [{ text: "Upsell: $1.2M (+45% QoQ)", style: { fontSize: 13, color: "#14532D" } }], spaceAfter: 4 },
        { runs: [{ text: "Cross-sell: $680K (+22% QoQ)", style: { fontSize: 13, color: "#14532D" } }], spaceAfter: 4 },
        { runs: [{ text: "Net Revenue Retention: 118%", style: { fontSize: 13, color: "#14532D" } }] },
      ],
    },
  ],
};

// -- Slide 6: Product Mix (doughnut chart) ---------------------------------

const productSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Product Mix",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 60, width: 560, height: 520 },
      chartData: {
        chartType: "doughnut",
        categories: ["Platform Core", "Analytics Suite", "Integration Hub", "Security Add-on", "Support Premium"],
        series: [{ name: "Revenue Share", values: [42, 24, 18, 10, 6] }],
        dataLabels: { showPercent: true, showCatName: true, position: "outEnd" },
      },
    },
    // Product table on the right
    {
      type: "Table",
      style: { position: "absolute", top: 120, left: 660, width: 560, height: 400 },
      tableData: {
        columns: [160, 100, 100, 100, 100],
        rows: [
          {
            height: 40,
            cells: [
              { text: "Product" },
              { text: "Revenue" },
              { text: "Growth" },
              { text: "Margin" },
              { text: "NPS" },
            ],
          },
          { cells: [{ text: "Platform Core" }, { text: "$7.7M" }, { text: "+18%" }, { text: "82%" }, { text: "71" }] },
          { cells: [{ text: "Analytics Suite" }, { text: "$4.4M" }, { text: "+31%" }, { text: "78%" }, { text: "65" }] },
          { cells: [{ text: "Integration Hub" }, { text: "$3.3M" }, { text: "+45%" }, { text: "69%" }, { text: "58" }] },
          { cells: [{ text: "Security Add-on" }, { text: "$1.8M" }, { text: "+62%" }, { text: "85%" }, { text: "72" }] },
          { cells: [{ text: "Support Premium" }, { text: "$1.1M" }, { text: "+12%" }, { text: "91%" }, { text: "74" }] },
        ],
        style: {
          firstRow: true,
          bandRow: true,
          headerRowStyle: { fill: "#1E293B", color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
          bandRowEvenStyle: { fill: "#F1F5F9" },
          outerBorder: { width: 1, color: "#CBD5E1" },
          innerBorderH: { width: 0.5, color: "#E2E8F0" },
        },
      },
    },
  ],
};

// -- Slide 7: Regional Analysis (area chart) -------------------------------

const regionalSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Regional Revenue Trends",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 60, width: 1160, height: 540 },
      chartData: {
        chartType: "area",
        categories: ["Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25"],
        series: [
          { name: "North America", values: [5200, 5600, 6100, 6800, 7400, 8200, 9100, 10200], color: "#2563EB" },
          { name: "EMEA", values: [2800, 3000, 3300, 3600, 3900, 4300, 4800, 5400], color: "#7C3AED" },
          { name: "APAC", values: [1200, 1400, 1600, 1900, 2100, 2400, 2800, 3200], color: "#059669" },
        ],
        valueAxis: { title: "Revenue ($K)", numberFormat: "$#,##0" },
        categoryAxis: { title: "Quarter" },
      },
    },
  ],
};

// -- Slide 8: OpEx Table ---------------------------------------------------

const opexSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "Operating Expenses",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Table",
      style: { position: "absolute", top: 100, left: 60, width: 1160, height: 440 },
      tableData: {
        columns: [260, 180, 180, 180, 180, 180],
        rows: [
          {
            height: 45,
            cells: [
              { text: "Category" },
              { text: "Q3 2025" },
              { text: "Q4 2025" },
              { text: "QoQ Change" },
              { text: "FY 2025" },
              { text: "% of Rev" },
            ],
          },
          { cells: [{ text: "R&D" }, { text: "$4.2M" }, { text: "$4.8M" }, { text: "+14%", style: { color: "#DC2626" } }, { text: "$17.1M" }, { text: "28%" }] },
          { cells: [{ text: "Sales & Marketing" }, { text: "$3.8M" }, { text: "$4.1M" }, { text: "+8%", style: { color: "#DC2626" } }, { text: "$14.8M" }, { text: "24%" }] },
          { cells: [{ text: "General & Admin" }, { text: "$1.6M" }, { text: "$1.7M" }, { text: "+6%", style: { color: "#DC2626" } }, { text: "$6.4M" }, { text: "10%" }] },
          { cells: [{ text: "Infrastructure" }, { text: "$1.1M" }, { text: "$1.2M" }, { text: "+9%", style: { color: "#DC2626" } }, { text: "$4.3M" }, { text: "7%" }] },
          { cells: [{ text: "Total OpEx", style: { fontWeight: "bold" } }, { text: "$10.7M", style: { fontWeight: "bold" } }, { text: "$11.8M", style: { fontWeight: "bold" } }, { text: "+10%", style: { fontWeight: "bold", color: "#DC2626" } }, { text: "$42.6M", style: { fontWeight: "bold" } }, { text: "69%", style: { fontWeight: "bold" } }] },
        ],
        style: {
          firstRow: true,
          bandRow: true,
          headerRowStyle: { fill: "#1E40AF", color: "#FFFFFF", fontWeight: "bold", fontSize: 13, textAlign: "center" },
          bandRowEvenStyle: { fill: "#EFF6FF" },
          bandRowOddStyle: { fill: "#FFFFFF" },
          outerBorder: { width: 1.5, color: "#1E40AF" },
          innerBorderH: { width: 0.5, color: "#CBD5E1" },
          innerBorderV: { width: 0.5, color: "#CBD5E1" },
        },
      },
    },
    {
      type: "Text",
      content: "OpEx as a percentage of revenue improved from 73% in FY2024 to 69% in FY2025, reflecting improving operational leverage.",
      style: {
        position: "absolute", top: 580, left: 60, width: 1100, height: 40,
        fontSize: 13, color: "#475569",
      },
    },
  ],
};

// -- Slide 9: Outlook (pie chart + guidance) -------------------------------

const outlookSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text", content: "FY2026 Outlook",
      style: {
        position: "absolute", top: 30, left: 60, width: 600, height: 50,
        fontSize: 32, fontWeight: "bold", color: "#0F172A",
      },
    },
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 60, width: 500, height: 440 },
      chartData: {
        chartType: "pie",
        categories: ["Subscription Growth", "New Products", "Expansion Revenue", "Services"],
        series: [{ name: "Revenue Contribution", values: [45, 20, 25, 10] }],
        dataLabels: { showPercent: true, showCatName: true, position: "outEnd" },
      },
    },
    // Guidance text box
    {
      type: "View",
      style: {
        position: "absolute", top: 100, left: 600, width: 620, height: 440,
        backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "FY2026 Guidance", style: { fontSize: 20, fontWeight: "bold", color: "#0F172A" } }], spaceAfter: 12 },
        { runs: [{ text: "Revenue: $82M - $88M (+34-43% YoY)", style: { fontSize: 15, color: "#334155" } }], spaceAfter: 6, bullet: { char: "\u2022", color: "#2563EB" } },
        { runs: [{ text: "Gross Margin: 74-76%", style: { fontSize: 15, color: "#334155" } }], spaceAfter: 6, bullet: { char: "\u2022", color: "#2563EB" } },
        { runs: [{ text: "Operating Margin: 8-12% (first full year positive)", style: { fontSize: 15, color: "#334155" } }], spaceAfter: 6, bullet: { char: "\u2022", color: "#2563EB" } },
        { runs: [{ text: "Customer Count: 1,600+ (28% growth)", style: { fontSize: 15, color: "#334155" } }], spaceAfter: 6, bullet: { char: "\u2022", color: "#2563EB" } },
        { runs: [{ text: "Headcount: 380-400 (22-28% growth)", style: { fontSize: 15, color: "#334155" } }], spaceAfter: 6, bullet: { char: "\u2022", color: "#2563EB" } },
        { runs: [{ text: "Key Investment Areas:", style: { fontSize: 15, fontWeight: "bold", color: "#0F172A" } }], spaceBefore: 12, spaceAfter: 6 },
        { runs: [{ text: "AI/ML capabilities, APAC expansion, FedRAMP certification", style: { fontSize: 14, color: "#475569" } }] },
      ],
    },
  ],
};

// -- Slide 10: Closing -----------------------------------------------------

const closingSlide: PaperSlide = {
  backgroundColor: "#0F172A",
  children: [
    {
      type: "Text", content: "Q4 2025 Business Review",
      style: {
        position: "absolute", top: 200, left: 100, width: 1080, height: 60,
        fontSize: 36, fontWeight: "bold", color: "#FFFFFF", textAlign: "center",
      },
    },
    {
      type: "Text", content: "Thank you for your time.",
      style: {
        position: "absolute", top: 290, left: 100, width: 1080, height: 40,
        fontSize: 22, color: "#94A3B8", textAlign: "center",
      },
    },
    {
      type: "View",
      style: {
        position: "absolute", top: 380, left: 440, width: 400, height: 2,
        backgroundColor: "#334155",
      },
      shapeType: "rect",
    },
    {
      type: "Text",
      paragraphs: [
        { runs: [{ text: "Contact: investor-relations@meridiantech.com", style: { fontSize: 13, color: "#64748B" } }], align: "center", spaceAfter: 4 },
        { runs: [{ text: "This document contains forward-looking statements.", style: { fontSize: 10, color: "#475569" } }], align: "center" },
      ],
      style: {
        position: "absolute", top: 420, left: 100, width: 1080, height: 80,
      },
    },
  ],
};

// -- Assemble ---------------------------------------------------------------

const doc: PaperDocument = {
  meta: {
    title: "Q4 2025 Business Review",
    author: "Meridian Technologies, Inc.",
    subject: "Quarterly board presentation",
  },
  slides: [
    titleSlide,
    agendaSlide,
    financialSlide,
    revenueSlide,
    customerSlide,
    productSlide,
    regionalSlide,
    opexSlide,
    outlookSlide,
    closingSlide,
  ],
};

const pptx = await PaperEngine.render(doc);
fs.writeFileSync("full-report.pptx", pptx);
console.log("Wrote full-report.pptx (10 slides)");
