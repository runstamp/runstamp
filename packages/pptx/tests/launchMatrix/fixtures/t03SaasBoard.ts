/**
 * T3: SaaS Board Deck (18 slides)
 * Comprehensive board-level SaaS metrics: T9Q tables, ARR waterfall & combo,
 * cohort heatmap, funnel, NPS trend, product/eng updates, cash & runway,
 * working session, asks, and appendices.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperView, PaperText,
  PaperTable, TableRow, TableCellStyle,
} from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, sectionDivider, contentSlide, textNode, richText,
  bulletList, financialTable, card, kpiTile, kpiGrid, gaugeChart, sourceFooter,
  actionTitle, accentBar, pt, TABLE_ALT_ROW,
  MBB_NAVY, MBB_BLUE, WHITE, OFF_WHITE, LIGHT_GRAY, MID_GRAY, DARK_GRAY,
  GREEN, RED, AMBER, DARK_GRADIENT, CONTENT_BG,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Title
// ---------------------------------------------------------------------------
const titleSlide = mbbTitleSlide("Q4 2025 Board Meeting", "Confidential • Series B • $42M ARR");

// ---------------------------------------------------------------------------
// Slide 2: Agenda
// ---------------------------------------------------------------------------
const agendaSlide = contentSlide(
  "Structured agenda enables focused discussion across all key topics",
  [
    financialTable(
      ["Time", "Topic", "Owner", "Duration"],
      [
        ["10:00", "CEO Update & Good/Bad/Ugly", "Sarah Chen, CEO", "15 min"],
        ["10:15", "Operating & Financial Metrics", "David Park, CFO", "20 min"],
        ["10:35", "ARR & Cohort Deep Dive", "David Park, CFO", "15 min"],
        ["10:50", "Sales Performance", "Lisa Martinez, CRO", "10 min"],
        ["11:00", "Customer Health & NPS", "James Wright, CCO", "10 min"],
        ["11:10", "Product & Engineering Update", "Priya Sharma, CPO", "15 min"],
        ["11:25", "Cash & Runway", "David Park, CFO", "10 min"],
        ["11:35", "Working Session: Pricing Strategy", "All", "20 min"],
        ["11:55", "Board Asks & Next Steps", "Sarah Chen, CEO", "5 min"],
      ],
      { alternatingRows: true, columnWidths: [107, 453, 347, 133] },
    ),
  ],
  "Board meeting agenda — December 15, 2025",
);

// ---------------------------------------------------------------------------
// Slide 3: CEO Update — Good / Bad / Ugly
// ---------------------------------------------------------------------------
const ceoUpdateSlide = contentSlide(
  "Strong quarter overall; sales capacity and enterprise churn require attention",
  [
    {
      type: "View",
      style: {
        position: "absolute", top: 105, left: 55, width: 1170,
        flexDirection: "row", gap: 21,
      },
      children: [
        card(
          [
            textNode("The Good", { fontSize: pt(16), fontWeight: "bold", color: GREEN, marginBottom: 11 }),
            bulletList(
              [
                { text: "ARR grew 48% YoY to $42M" },
                { text: "Net retention hit 122%, best ever" },
                { text: "Gross margin improved to 79.2%" },
                { text: "Cash runway extended to 28 months" },
              ],
              { fontSize: pt(11) },
            ),
          ],
          { width: 373, height: 400 },
        ),
        card(
          [
            textNode("The Bad", { fontSize: pt(16), fontWeight: "bold", color: AMBER, marginBottom: 11 }),
            bulletList(
              [
                { text: "AE hiring behind plan (8 of 12)" },
                { text: "SMB churn ticked up to 3.2%" },
                { text: "Pipeline coverage dropped to 2.8x" },
                { text: "APAC expansion delayed by 1 quarter" },
              ],
              { fontSize: pt(11) },
            ),
          ],
          { width: 373, height: 400 },
        ),
        card(
          [
            textNode("The Ugly", { fontSize: pt(16), fontWeight: "bold", color: RED, marginBottom: 11 }),
            bulletList(
              [
                { text: "Lost 2 enterprise logos ($1.2M ARR)" },
                { text: "Key competitor raised $80M, aggressive pricing" },
                { text: "SOC2 Type II remediation overdue" },
              ],
              { fontSize: pt(11) },
            ),
          ],
          { width: 373, height: 400 },
        ),
      ],
    } as PaperView,
  ],
  undefined,
  { notes: "Highlight the two lost enterprise logos and competitive threat as items requiring board input." },
);

// ---------------------------------------------------------------------------
// Slide 4: Operating Metrics T9Q (10 metrics × 11 columns)
// ---------------------------------------------------------------------------
const opsMetricsSlide = contentSlide(
  "Operating metrics show sustained improvement across 9 quarters",
  [
    financialTable(
      ["Metric", "Q4'23", "Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25", "YoY", "Plan%"],
      [
        ["ARR ($M)", "19.0", "21.0", "23.5", "26.0", "28.4", "30.2", "32.8", "35.0", "42.0", "+48%", "105%"],
        ["Net New ARR ($M)", "2.8", "2.5", "3.0", "2.8", "3.2", "2.4", "3.1", "2.8", "7.0", "+119%", "117%"],
        ["Customers", "320", "340", "365", "390", "420", "445", "475", "510", "560", "+33%", "107%"],
        ["NRR", "110%", "112%", "114%", "115%", "116%", "118%", "119%", "120%", "122%", "+6pp", "106%"],
        ["Gross Margin", "75%", "76%", "76.5%", "77%", "77.5%", "78%", "78.5%", "79%", "79.2%", "+1.7pp", "102%"],
        ["CAC Payback (mo)", "18", "17", "16", "15", "14.5", "14", "13.5", "13", "12", "-3mo", "125%"],
        ["LTV/CAC", "3.5x", "3.7x", "3.9x", "4.0x", "4.1x", "4.3x", "4.5x", "4.6x", "4.8x", "+0.7x", "120%"],
        ["Logo Churn (mo)", "2.2%", "2.1%", "2.0%", "1.9%", "1.8%", "1.8%", "1.7%", "1.6%", "1.5%", "-0.3pp", "133%"],
        ["Burn Multiple", "2.1x", "1.9x", "1.8x", "1.6x", "1.5x", "1.4x", "1.3x", "1.2x", "1.1x", "-0.4x", "136%"],
        ["Headcount", "85", "92", "100", "108", "118", "125", "132", "140", "152", "+29%", "95%"],
      ],
      {
        alternatingRows: true,
        columnWidths: [147, 73, 73, 73, 73, 73, 73, 73, 73, 73, 73, 73],
        mergedHeaderGroups: [
          { text: "", colSpan: 2 },
          { text: "FY2024", colSpan: 4 },
          { text: "FY2025", colSpan: 4 },
          { text: "Δ", colSpan: 2 },
        ],
        style: { top: 100, left: 33 },
      },
    ),
  ],
  "Source: Internal finance, as of December 31, 2025",
);

// ---------------------------------------------------------------------------
// Slide 5: P&L Metrics T9Q
// ---------------------------------------------------------------------------
const plMetricsSlide = contentSlide(
  "Path to profitability accelerating — EBITDA margin turned positive in Q4",
  [
    financialTable(
      ["P&L Line", "Q4'23", "Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25", "YoY", "Plan%"],
      [
        ["Revenue ($M)", "6.3", "7.0", "7.8", "8.7", "9.5", "10.1", "10.9", "11.7", "14.0", "+47%", "108%"],
        ["COGS ($M)", "1.6", "1.7", "1.8", "2.0", "2.1", "2.2", "2.3", "2.5", "2.9", "+38%", "97%"],
        ["Gross Profit ($M)", "4.7", "5.3", "6.0", "6.7", "7.4", "7.9", "8.6", "9.2", "11.1", "+50%", "110%"],
        ["GM%", "75%", "76%", "77%", "77%", "78%", "78%", "79%", "79%", "79%", "+1pp", "101%"],
        ["S&M ($M)", "2.8", "3.0", "3.2", "3.4", "3.6", "3.5", "3.6", "3.8", "4.2", "+17%", "95%"],
        ["R&D ($M)", "2.0", "2.2", "2.4", "2.5", "2.7", "2.8", "2.9", "3.0", "3.2", "+19%", "94%"],
        ["G&A ($M)", "0.8", "0.8", "0.9", "0.9", "1.0", "1.0", "1.0", "1.1", "1.2", "+20%", "100%"],
        ["EBITDA ($M)", "-0.9", "-0.7", "-0.5", "-0.1", "0.1", "0.6", "1.1", "1.3", "2.5", "+$2.4M", "167%"],
        ["EBITDA%", "-14%", "-10%", "-6%", "-1%", "1%", "6%", "10%", "11%", "18%", "+17pp", "180%"],
      ],
      {
        alternatingRows: true,
        columnWidths: [147, 73, 73, 73, 73, 73, 73, 73, 73, 73, 73, 73],
        mergedHeaderGroups: [
          { text: "", colSpan: 2 },
          { text: "FY2024", colSpan: 4 },
          { text: "FY2025", colSpan: 4 },
          { text: "Δ", colSpan: 2 },
        ],
        style: { top: 100, left: 33 },
      },
    ),
  ],
  "Source: Internal finance, unaudited",
);

// ---------------------------------------------------------------------------
// Slide 6: ARR Bridge Waterfall
// ---------------------------------------------------------------------------
const arrWaterfallSlide = contentSlide(
  "ARR grew $7M in Q4, driven by new business ($5.5M) and expansion ($3.2M)",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "waterfall",
        waterfallData: {
          categories: ["Starting ARR", "New Business", "Expansion", "Contraction", "Churn", "Ending ARR"],
          values: [35, 5.5, 3.2, -0.5, -1.2, 42],
          totalIndices: [0, 5],
          increaseColor: GREEN,
          decreaseColor: RED,
          totalColor: MBB_BLUE,
          connectorLines: true,
        },
        valueAxis: { numberFormat: "$#,##0.0M", title: "ARR ($M)" },
        legend: { position: "none" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(10) },
      },
    } as PaperChart,
  ],
  "Source: Subscription analytics, Q4 2025",
  { notes: "Net new ARR of $7M is the strongest quarter to date; expansion revenue exceeded new business for the first time." },
);

// ---------------------------------------------------------------------------
// Slide 7: ARR Trend Combo — Bar (ARR) + Line (Growth %)
// ---------------------------------------------------------------------------
const arrTrendSlide = contentSlide(
  "ARR growth rate re-accelerating after mid-year investment in sales capacity",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "bar",
        categories: ["Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25"],
        series: [
          {
            name: "ARR ($M)",
            values: [21, 23.5, 26, 28.4, 30.2, 32.8, 35, 42],
            color: MBB_BLUE,
          },
          {
            name: "YoY Growth %",
            values: [55, 50, 45, 42, 44, 40, 35, 48],
            color: "#FF6600",
            overrideType: "line",
            targetAxis: "secondary",
            marker: { symbol: "circle", size: 5 },
          },
        ],
        valueAxis: { title: "ARR ($M)", numberFormat: "$#,##0" },
        secondaryValueAxis: { title: "YoY Growth (%)", numberFormat: "0%" },
        legend: { position: "bottom" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(9) },
      },
    } as PaperChart,
  ],
  "Source: Internal finance",
);

// ---------------------------------------------------------------------------
// Slide 8: Cohort Retention Heatmap
// ---------------------------------------------------------------------------
function heatmapCellColor(pct: number): string {
  if (pct >= 95) return GREEN;
  if (pct >= 85) return "#70C050";
  if (pct >= 75) return "#A8D08D";
  if (pct >= 65) return AMBER;
  if (pct >= 55) return "#FF8C00";
  return RED;
}

function heatmapCell(pct: number): { text: string; style: TableCellStyle } {
  return {
    text: `${pct}%`,
    style: {
      fill: heatmapCellColor(pct),
      color: pct >= 65 ? MBB_NAVY : WHITE,
      fontSize: pt(9), textAlign: "center", padding: 4,
    },
  };
}

const cohortHeaders = ["Cohort", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];

const cohortData: [string, ...number[]][] = [
  ["2022 H1", 100, 92, 87, 83, 80, 78, 76, 74, 73, 72, 71, 70],
  ["2022 H2", 100, 94, 89, 85, 82, 80, 78, 76, 75, 74, 73, 72],
  ["2023 H1", 100, 95, 91, 87, 84, 82, 80, 79, 78, 77, 76, 75],
  ["2023 H2", 100, 96, 92, 89, 86, 84, 82, 81, 80, 79, 78, 77],
  ["2024 H1", 100, 97, 93, 90, 88, 86, 84, 83, 82, 81, 80, 79],
  ["2024 H2", 100, 97, 94, 91, 89, 87, 86, 85, 84, 83, 82, 81],
  ["2025 H1", 100, 98, 95, 92, 90, 88, 87, 86, 85, 84, 83, 82],
  ["2025 H2", 100, 98, 96, 93, 91, 90, 0, 0, 0, 0, 0, 0],
];

const heatmapHeaderStyle: TableCellStyle = {
  fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(9),
  textAlign: "center", padding: 4,
  borders: { bottom: { width: 2, color: MBB_BLUE } },
};

const heatmapTableRows: TableRow[] = [
  {
    height: 24,
    cells: cohortHeaders.map((h, i) => ({
      text: h,
      style: { ...heatmapHeaderStyle, textAlign: i === 0 ? "left" as const : "center" as const },
    })),
  },
  ...cohortData.map(([cohort, ...values]) => ({
    height: 22,
    cells: [
      { text: cohort as string, style: { fontSize: pt(9), fontWeight: "bold" as const, padding: 4, fill: WHITE } },
      ...values.map(v => v === 0
        ? { text: "—", style: { fontSize: pt(9), textAlign: "center" as const, padding: 4, fill: TABLE_ALT_ROW, color: MBB_NAVY } as TableCellStyle }
        : heatmapCell(v),
      ),
    ],
  })),
];

const colW = Math.floor(1170 / cohortHeaders.length);

const cohortHeatmapSlide = contentSlide(
  "Cohort retention has improved steadily — 2025 cohorts retaining 90%+ at M5",
  [
    {
      type: "Table",
      style: { position: "absolute", top: 105, left: 55, width: 1170 },
      tableData: {
        columns: [120, ...Array(12).fill(colW) as number[]],
        rows: heatmapTableRows,
      },
    } as PaperTable,
  ],
  "Source: Subscription analytics, logo-based retention",
  { notes: "2025 cohorts are retaining significantly better than prior years, validating onboarding improvements made in H1." },
);

// ---------------------------------------------------------------------------
// Slide 9: Sales Funnel
// ---------------------------------------------------------------------------
const funnelSlide = contentSlide(
  "1.5% lead-to-close conversion rate; focus on MQL-to-SQL conversion for Q1",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 187, width: 907, height: 507 },
      chartData: {
        chartType: "funnel",
        funnelData: {
          categories: ["Leads", "MQLs", "SQLs", "Opportunities", "Closed Won"],
          values: [5000, 2000, 800, 300, 75],
          colors: [MBB_BLUE, "#0070C0", GREEN, AMBER, "#FF6600"],
        },
        legend: { position: "none" },
        dataLabels: { showVal: true, showCatName: true, position: "ctr", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: Salesforce CRM, Q4 2025",
);

// ---------------------------------------------------------------------------
// Slide 10: Customer Health — NPS Trend (12 months)
// ---------------------------------------------------------------------------
const npsTrendSlide = contentSlide(
  "NPS has risen from 38 to 52 over 12 months, crossing the 'excellent' threshold",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "line",
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        series: [
          {
            name: "NPS",
            values: [38, 39, 41, 42, 44, 45, 46, 48, 49, 50, 51, 52],
            color: MBB_BLUE,
            marker: { symbol: "circle", size: 5 },
          },
          {
            name: "Industry Benchmark",
            values: [42, 42, 42, 42, 43, 43, 43, 43, 43, 44, 44, 44],
            color: MID_GRAY,
            lineStyle: "dash",
          },
        ],
        valueAxis: { title: "NPS Score", min: 30, max: 60 },
        legend: { position: "bottom" },
      },
    } as PaperChart,
  ],
  "Source: Delighted NPS surveys, trailing 12 months",
);

// ---------------------------------------------------------------------------
// Slide 11: Product Update — Feature Release Table
// ---------------------------------------------------------------------------
const productUpdateSlide = contentSlide(
  "Shipped 14 major features in Q4, including AI copilot and API v3",
  [
    financialTable(
      ["Feature", "Category", "Release Date", "Adoption", "Impact"],
      [
        ["AI Copilot", "Core Platform", "Oct 15", "42% of users", "High"],
        ["API v3", "Developer", "Oct 22", "28% of integrations", "High"],
        ["Custom Dashboards", "Analytics", "Nov 5", "65% of admins", "Medium"],
        ["SSO (Okta/Azure)", "Security", "Nov 12", "35% of enterprise", "High"],
        ["Bulk Import Tool", "Data", "Nov 20", "18% of users", "Medium"],
        ["Mobile App v2", "Platform", "Dec 1", "22% of users", "Medium"],
        ["Workflow Automations", "Core Platform", "Dec 8", "31% of teams", "High"],
        ["Advanced Permissions", "Security", "Dec 15", "40% of enterprise", "Medium"],
      ],
      { alternatingRows: true, columnWidths: [240, 160, 133, 213, 107] },
    ),
  ],
  "Source: Product analytics, as of December 31, 2025",
);

// ---------------------------------------------------------------------------
// Slide 12: Engineering & People — Headcount + Gauge
// ---------------------------------------------------------------------------
const engPeopleSlide = contentSlide(
  "Engineering velocity up 22%; hiring 95% to plan across all departments",
  [
    financialTable(
      ["Department", "Q3 HC", "Q4 HC", "Open Roles", "Plan HC", "% to Plan"],
      [
        ["Engineering", "62", "68", "4", "72", "94%"],
        ["Product", "12", "14", "1", "15", "93%"],
        ["Sales", "28", "32", "4", "35", "91%"],
        ["Marketing", "10", "12", "1", "12", "100%"],
        ["CS / Support", "15", "18", "2", "20", "90%"],
        ["G&A", "13", "8", "0", "8", "100%"],
        ["Total", "140", "152", "12", "162", "94%"],
      ],
      { alternatingRows: true, columnWidths: [187, 133, 133, 133, 133, 133], style: { top: 105, left: 55 } },
    ),
    gaugeChart(152, 162, "Headcount", { color: MBB_BLUE, style: { position: "absolute", top: 413, left: 773, width: 373, height: 240 } }),
  ],
  "Source: HR system, as of December 31, 2025",
);

// ---------------------------------------------------------------------------
// Slide 13: Cash & Runway — Cash Waterfall + KPI Tiles
// ---------------------------------------------------------------------------
const cashRunwaySlide = contentSlide(
  "Cash position strengthened to $48M with 28-month runway at current burn",
  [
    kpiGrid([
      kpiTile("Cash Balance", "$48M", "+$6M QoQ", { valueColor: GREEN }),
      kpiTile("Monthly Burn", "$1.7M", "-12% QoQ", { trendColor: GREEN }),
      kpiTile("Runway", "28 mo", "+4 mo QoQ", { trendColor: GREEN }),
    ], 3),
    {
      type: "Chart",
      style: { position: "absolute", top: 293, left: 55, width: 1170, height: 347 },
      chartData: {
        chartType: "waterfall",
        waterfallData: {
          categories: ["Q3 Cash", "Revenue", "Payroll", "Infra", "S&M", "Other", "Q4 Cash"],
          values: [42, 14, -5.8, -1.2, -1.8, -0.2, 48],
          totalIndices: [0, 6],
          increaseColor: GREEN,
          decreaseColor: RED,
          totalColor: MBB_BLUE,
          connectorLines: true,
        },
        valueAxis: { numberFormat: "$#,##0M" },
        legend: { position: "none" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(9) },
      },
    } as PaperChart,
  ],
  "Source: Treasury, as of December 31, 2025",
  { notes: "Runway of 28 months provides flexibility to delay Series C if market conditions are unfavorable." },
);

// ---------------------------------------------------------------------------
// Slides 14-15: Working Session — Scatter + Pricing Analysis
// ---------------------------------------------------------------------------
const workingSessionScatter: PaperSlide = contentSlide(
  "Competitive pricing analysis reveals opportunity to increase enterprise ASP 15-20%",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "scatter",
        xySeries: [
          { name: "Us", dataPoints: [{ x: 7.5, y: 42 }], color: MBB_BLUE },
          { name: "Competitor A", dataPoints: [{ x: 6.0, y: 85 }], color: RED },
          { name: "Competitor B", dataPoints: [{ x: 8.5, y: 35 }], color: AMBER },
          { name: "Competitor C", dataPoints: [{ x: 5.5, y: 60 }], color: "#0070C0" },
          { name: "Competitor D", dataPoints: [{ x: 9.0, y: 20 }], color: MID_GRAY },
          { name: "Competitor E", dataPoints: [{ x: 4.0, y: 110 }], color: "#FF6600" },
        ],
        valueAxis: { title: "Feature Score (10-pt scale)", min: 0, max: 10 },
        categoryAxis: { title: "ARR ($M)" },
        legend: { position: "bottom" },
        dataLabels: { showVal: false, showCatName: true, fontSize: pt(10) },
      },
    } as PaperChart,
  ],
  "Source: Market intelligence, competitive tear-downs",
);

const workingSessionPricing: PaperSlide = contentSlide(
  "Proposed tier restructuring could drive $4-6M incremental ARR in FY26",
  [
    financialTable(
      ["Tier", "Current Price", "Proposed Price", "Δ%", "Customers", "ARR Impact"],
      [
        ["Starter", "$29/user/mo", "$29/user/mo", "0%", "280", "$0"],
        ["Professional", "$79/user/mo", "$89/user/mo", "+13%", "195", "+$1.8M"],
        ["Business", "$149/user/mo", "$179/user/mo", "+20%", "62", "+$2.4M"],
        ["Enterprise", "$299/user/mo", "$349/user/mo", "+17%", "23", "+$1.1M"],
        ["Total Impact", "", "", "", "560", "+$5.3M"],
      ],
      { alternatingRows: true, columnWidths: [173, 173, 173, 80, 133, 160] },
    ),
    textNode("Assumption: 10% elasticity-driven churn at Professional tier, 5% at Business/Enterprise", {
      position: "absolute", top: 480, left: 55, width: 1170,
      fontSize: pt(10), color: DARK_GRAY, fontStyle: "italic",
    }),
  ],
  "Source: Pricing committee analysis, November 2025",
);

// ---------------------------------------------------------------------------
// Slide 16: Asks to Board
// ---------------------------------------------------------------------------
const asksSlide = contentSlide(
  "Three asks for board consideration and approval",
  [
    financialTable(
      ["Request", "Details", "Owner", "Timeline", "Decision Needed"],
      [
        ["Series C Prep", "Engage bankers for $60-80M raise", "CEO / CFO", "Q1 2026", "Approve banker selection"],
        ["Pricing Increase", "Implement new tier pricing per analysis", "CRO / CPO", "Feb 2026", "Approve go-live date"],
        ["APAC Expansion", "Open Singapore office, 5 initial hires", "COO", "Q2 2026", "Approve $1.2M budget"],
        ["Board Observer", "Add strategic advisor for AI/ML", "CEO", "Q1 2026", "Nominate candidates"],
      ],
      { alternatingRows: true, columnWidths: [173, 293, 147, 133, 240] },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 17: Appendix — Detailed Financials
// ---------------------------------------------------------------------------
const appendixFinancials: PaperSlide = contentSlide(
  "Appendix: Detailed quarterly P&L ($000s)",
  [
    financialTable(
      ["Line Item", "Q1'25", "Q2'25", "Q3'25", "Q4'25", "FY2025"],
      [
        ["Subscription Revenue", "9,200", "9,950", "10,800", "12,800", "42,750"],
        ["Services Revenue", "900", "950", "900", "1,200", "3,950"],
        ["Total Revenue", "10,100", "10,900", "11,700", "14,000", "46,700"],
        ["COGS — Hosting", "1,200", "1,300", "1,400", "1,600", "5,500"],
        ["COGS — Support", "1,000", "1,000", "1,100", "1,300", "4,400"],
        ["Gross Profit", "7,900", "8,600", "9,200", "11,100", "36,800"],
        ["S&M", "3,500", "3,600", "3,800", "4,200", "15,100"],
        ["R&D", "2,800", "2,900", "3,000", "3,200", "11,900"],
        ["G&A", "1,000", "1,000", "1,100", "1,200", "4,300"],
        ["EBITDA", "600", "1,100", "1,300", "2,500", "5,500"],
      ],
      {
        alternatingRows: true,
        columnWidths: [240, 147, 147, 147, 147, 147],
        style: { top: 100, left: 55 },
      },
    ),
  ],
  "Source: Internal finance, unaudited",
);

// ---------------------------------------------------------------------------
// Slide 18: Appendix — Definitions
// ---------------------------------------------------------------------------
const appendixDefinitions: PaperSlide = contentSlide(
  "Appendix: Key metric definitions",
  [
    financialTable(
      ["Metric", "Definition"],
      [
        ["ARR", "Annualized run-rate of active subscriptions at period end"],
        ["Net Revenue Retention (NRR)", "ARR from existing customers at period end ÷ ARR from same customers at prior period start"],
        ["Logo Churn", "Number of customers lost in period ÷ customers at period start (monthly)"],
        ["CAC Payback", "Fully-loaded S&M cost per new customer ÷ monthly gross margin per new customer"],
        ["LTV/CAC", "Customer lifetime value (GM × avg lifespan) ÷ fully-loaded customer acquisition cost"],
        ["Burn Multiple", "Net burn ÷ net new ARR; <1x = efficient, 1-2x = acceptable, >2x = inefficient"],
        ["Gross Margin", "(Revenue − COGS) ÷ Revenue; includes hosting, support, and professional services costs"],
        ["Pipeline Coverage", "Weighted pipeline value ÷ quota for period; target >3x"],
      ],
      { alternatingRows: true, columnWidths: [293, 747] },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const saasBoardDeck: PaperDocument = makeDoc(
  [
    titleSlide,                // 1
    agendaSlide,               // 2
    ceoUpdateSlide,            // 3
    opsMetricsSlide,           // 4
    plMetricsSlide,            // 5
    arrWaterfallSlide,         // 6
    arrTrendSlide,             // 7
    cohortHeatmapSlide,        // 8
    funnelSlide,               // 9
    npsTrendSlide,             // 10
    productUpdateSlide,        // 11
    engPeopleSlide,            // 12
    cashRunwaySlide,           // 13
    workingSessionScatter,     // 14
    workingSessionPricing,     // 15
    asksSlide,                 // 16
    appendixFinancials,        // 17
    appendixDefinitions,       // 18
  ],
  { title: "Q4 2025 Board Meeting — SaaS Metrics" },
);
