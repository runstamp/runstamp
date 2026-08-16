/**
 * T1: Management Consulting Strategy Deck (24 slides)
 * MBB-style strategic assessment with full chart suite, Harvey balls,
 * process flows, Gantt timeline, and appendix.
 */
import type { PaperDocument, PaperSlide, PaperNode, PaperChart, PaperView, PaperText } from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, sectionDivider, contentSlide,
  financialTable, card, textNode, richText, bulletList,
  harveyBall, ganttTimeline, accentBar, actionTitle, sourceFooter, pt,
  MBB_BLUE, MBB_NAVY, MBB_DARK_BG, WHITE, OFF_WHITE, LIGHT_GRAY, MID_GRAY, DARK_GRAY,
  GREEN, RED, AMBER, DARK_GRADIENT, CONTENT_BG,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Title Slide
// ---------------------------------------------------------------------------
const titleSlide = mbbTitleSlide(
  "Strategic Growth Assessment",
  "Confidential • March 2026",
);

// ---------------------------------------------------------------------------
// Slide 2: Executive Summary (SCR)
// ---------------------------------------------------------------------------
const execSummarySlide = contentSlide(
  "Revenue growth has stalled; a three-pronged strategy can restore 15% CAGR",
  [
    richText(
      [
        {
          runs: [
            { text: "Situation: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Core market revenue growth has decelerated from 18% to 6% over the past three years, driven by increased competition and commoditization of base offerings.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 0,
        },
        {
          runs: [
            { text: "Complication: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Without intervention, projected FY27 revenue will fall 22% below board targets. Current M&A pipeline lacks transformative assets, and organic initiatives have underperformed.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 12,
        },
        {
          runs: [
            { text: "Resolution: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "A three-pronged strategy combining pricing optimization (+$10M), targeted bolt-on acquisitions (+$15M), and product-led expansion (+$25M) can restore 15% revenue CAGR by FY28.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 12,
        },
      ],
      { position: "absolute", top: 105, left: 80, width: 1120, height: 505 },
    ),
  ],
  "Source: Management interviews, internal financial data",
  { notes: "Walk through each SCR element. Emphasize the $50M combined opportunity and the urgency of acting before FY27 board review." },
);

// ---------------------------------------------------------------------------
// Slide 3: Agenda / Roadmap
// ---------------------------------------------------------------------------
const agendaSlide = contentSlide(
  "Today's discussion covers three strategic pillars across market, competitive, and recommendations",
  [
    richText(
      [
        {
          runs: [
            { text: "01  Market Analysis", style: { fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY } },
            { text: "    ................................................  p. 4", style: { fontSize: pt(14), color: MID_GRAY } },
          ],
          spaceBefore: 0,
        },
        {
          runs: [
            { text: "     Market sizing, trends, revenue bridge, competitive positioning, and segment composition", style: { fontSize: pt(11), color: DARK_GRAY } },
          ],
          spaceBefore: 4,
        },
        {
          runs: [
            { text: "02  Competitive Analysis", style: { fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY } },
            { text: "    ........................................  p. 11", style: { fontSize: pt(14), color: MID_GRAY } },
          ],
          spaceBefore: 20,
        },
        {
          runs: [
            { text: "     Landscape mapping, process evaluation, key findings, and deep-dive analytics", style: { fontSize: pt(11), color: DARK_GRAY } },
          ],
          spaceBefore: 4,
        },
        {
          runs: [
            { text: "03  Recommendations", style: { fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY } },
            { text: "    ............................................  p. 19", style: { fontSize: pt(14), color: MID_GRAY } },
          ],
          spaceBefore: 20,
        },
        {
          runs: [
            { text: "     Strategic initiatives, implementation roadmap, next steps, and appendix", style: { fontSize: pt(11), color: DARK_GRAY } },
          ],
          spaceBefore: 4,
        },
        {
          runs: [
            { text: "04  Appendix", style: { fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY } },
            { text: "    ....................................................  p. 24", style: { fontSize: pt(14), color: MID_GRAY } },
          ],
          spaceBefore: 20,
        },
        {
          runs: [
            { text: "     Supporting data tables and methodology notes", style: { fontSize: pt(11), color: DARK_GRAY } },
          ],
          spaceBefore: 4,
        },
      ],
      { position: "absolute", top: 105, left: 105, width: 1065, height: 505 },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 4: Section Divider — Market Analysis
// ---------------------------------------------------------------------------
const section01 = sectionDivider("01", "Market Analysis", MBB_NAVY);

// ---------------------------------------------------------------------------
// Slide 5: Market Sizing (Mekko → bar chart approximation)
// ---------------------------------------------------------------------------
const marketSizingSlide = contentSlide(
  "Total addressable market reaches $14.2B with Enterprise capturing 48% of value",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "bar",
        barGrouping: "stacked",
        barDirection: "col",
        categories: ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"],
        series: [
          { name: "Enterprise", values: [2800, 1900, 1400, 420, 280], color: MBB_BLUE },
          { name: "Mid-Market", values: [1600, 1100, 850, 310, 190], color: "#0070C0" },
          { name: "SMB", values: [950, 680, 520, 240, 120], color: "#5B9BD5" },
        ],
        valueAxis: { numberFormat: "$#,##0M", title: "Market Size ($M)" },
        categoryAxis: { title: "Region" },
        legend: { position: "bottom" },
        dataLabels: { showVal: true, position: "ctr", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: Gartner Market Guide 2025, IDC Worldwide Tracker",
  { notes: "Highlight that North America and Europe represent 72% of TAM. Enterprise segment alone is nearly half the total market value." },
);

// ---------------------------------------------------------------------------
// Slide 6: Trend Analysis (Line chart)
// ---------------------------------------------------------------------------
const trendSlide = contentSlide(
  "Enterprise segment sustains 12% CAGR while SMB growth decelerates to 4%",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "line",
        categories: ["Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25"],
        series: [
          { name: "Enterprise", values: [82, 88, 91, 97, 103, 110, 116, 124], color: MBB_BLUE },
          { name: "Mid-Market", values: [45, 47, 49, 51, 54, 56, 58, 61], color: "#0070C0" },
          { name: "SMB", values: [32, 33, 33, 34, 34, 35, 35, 36], color: "#5B9BD5" },
        ],
        valueAxis: { numberFormat: "$#,##0M", title: "Revenue ($M)" },
        categoryAxis: { title: "Quarter" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
  ],
  "Source: Internal CRM data, FY24-FY25 actuals",
);

// ---------------------------------------------------------------------------
// Slide 7: Revenue Bridge (Waterfall)
// ---------------------------------------------------------------------------
const waterfallSlide = contentSlide(
  "Revenue bridge shows $38M growth opportunity offset by $12M churn",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "waterfall",
        waterfallData: {
          categories: ["FY25 Base", "New Logos", "Upsell", "Price Increase", "M&A", "Churn", "Downsell", "FX Impact", "FY26 Target"],
          values: [100, 15, 12, 8, 3, -7, -3, -2, 126],
          totalIndices: [0, 8],
          increaseColor: GREEN,
          decreaseColor: RED,
          totalColor: MBB_BLUE,
          connectorLines: true,
        },
        valueAxis: { numberFormat: "$#,##0M" },
        legend: { position: "none" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: FY25 actuals, FY26 management forecast",
  { notes: "Call out that new logos and upsell together contribute $27M in growth, but churn and downsell erode $10M. Net retention improvement is the key lever." },
);

// ---------------------------------------------------------------------------
// Slide 8: Framework — BCG Growth-Share Matrix (Scatter)
// ---------------------------------------------------------------------------
const frameworkSlide = contentSlide(
  "Portfolio analysis reveals two stars, three cash cows, and five question marks",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "bubble",
        xySeries: [
          {
            name: "Stars",
            dataPoints: [
              { x: 0.65, y: 18, size: 45 },
              { x: 0.72, y: 22, size: 60 },
            ],
            color: GREEN,
          },
          {
            name: "Cash Cows",
            dataPoints: [
              { x: 0.58, y: 4, size: 80 },
              { x: 0.48, y: 3, size: 55 },
              { x: 0.55, y: 5, size: 65 },
            ],
            color: MBB_BLUE,
          },
          {
            name: "Question Marks",
            dataPoints: [
              { x: 0.15, y: 15, size: 20 },
              { x: 0.22, y: 20, size: 25 },
              { x: 0.18, y: 12, size: 15 },
              { x: 0.28, y: 25, size: 30 },
              { x: 0.12, y: 10, size: 18 },
            ],
            color: AMBER,
          },
        ],
        valueAxis: { title: "Market Growth Rate (%)", max: 30 },
        categoryAxis: { title: "Relative Market Share" },
        legend: { position: "right" },
      },
    } as PaperChart,
  ],
  "Source: BCG Growth-Share framework, internal estimates",
);

// ---------------------------------------------------------------------------
// Slide 9: Comparison Table (Harvey balls)
// ---------------------------------------------------------------------------
const harveyTableSlide = contentSlide(
  "Company A leads across most evaluation criteria; Company C strongest on cost",
  [
    financialTable(
      ["Criteria", "Company A", "Company B", "Company C", "Company D", "Company E"],
      [
        ["Market Position", harveyBall(4), harveyBall(3), harveyBall(2), harveyBall(1), harveyBall(2)],
        ["Technology Stack", harveyBall(3), harveyBall(4), harveyBall(2), harveyBall(2), harveyBall(3)],
        ["Management Team", harveyBall(4), harveyBall(2), harveyBall(3), harveyBall(1), harveyBall(2)],
        ["Financial Health", harveyBall(3), harveyBall(3), harveyBall(4), harveyBall(2), harveyBall(3)],
        ["Cultural Fit", harveyBall(4), harveyBall(2), harveyBall(1), harveyBall(3), harveyBall(2)],
        ["Cost Structure", harveyBall(2), harveyBall(1), harveyBall(4), harveyBall(3), harveyBall(4)],
        ["Integration Risk", harveyBall(3), harveyBall(2), harveyBall(1), harveyBall(4), harveyBall(2)],
      ],
      { alternatingRows: true },
    ),
  ],
  "Source: Due diligence findings, Q1 2026",
  { notes: "Company A is the recommended acquisition target based on strongest overall score. Company C is a backup option if cost structure is the primary constraint." },
);

// ---------------------------------------------------------------------------
// Slide 10: Stacked Bar — Revenue Composition
// ---------------------------------------------------------------------------
const stackedBarSlide = contentSlide(
  "Enterprise segment drives majority of growth across all time periods",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "bar",
        barGrouping: "stacked",
        barDirection: "col",
        categories: ["FY21", "FY22", "FY23", "FY24", "FY25", "FY26E"],
        series: [
          { name: "Enterprise", values: [45, 52, 60, 72, 82, 97], color: MBB_BLUE },
          { name: "Mid-Market", values: [22, 25, 28, 32, 38, 44], color: "#0070C0" },
          { name: "SMB", values: [15, 16, 18, 19, 20, 21], color: "#5B9BD5" },
          { name: "Government", values: [8, 9, 10, 11, 12, 14], color: AMBER },
        ],
        valueAxis: { numberFormat: "$#,##0M", title: "Revenue ($M)" },
        categoryAxis: { title: "Fiscal Year" },
        legend: { position: "bottom" },
        dataLabels: { showVal: true, position: "ctr", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: CRM data, FY21-FY25 actuals, FY26 forecast",
);

// ---------------------------------------------------------------------------
// Slide 11: Section Divider — Competitive Analysis
// ---------------------------------------------------------------------------
const section02 = sectionDivider("02", "Competitive Analysis", MBB_NAVY);

// ---------------------------------------------------------------------------
// Slide 12: Competitive Landscape (Scatter/Bubble)
// ---------------------------------------------------------------------------
const competitiveLandscapeSlide = contentSlide(
  "Three competitors occupy premium positioning while market remains fragmented below",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "bubble",
        xySeries: [
          {
            name: "Leaders",
            dataPoints: [
              { x: 8.5, y: 85, size: 120 },
              { x: 9.1, y: 92, size: 95 },
              { x: 7.8, y: 78, size: 80 },
            ],
            color: MBB_BLUE,
          },
          {
            name: "Challengers",
            dataPoints: [
              { x: 6.2, y: 62, size: 60 },
              { x: 5.8, y: 58, size: 45 },
              { x: 7.0, y: 70, size: 55 },
              { x: 6.5, y: 55, size: 50 },
            ],
            color: "#0070C0",
          },
          {
            name: "Niche Players",
            dataPoints: [
              { x: 3.5, y: 40, size: 25 },
              { x: 4.2, y: 35, size: 20 },
              { x: 2.8, y: 28, size: 15 },
              { x: 3.0, y: 45, size: 18 },
              { x: 4.8, y: 48, size: 30 },
              { x: 3.8, y: 32, size: 22 },
              { x: 4.5, y: 42, size: 28 },
              { x: 2.5, y: 25, size: 12 },
            ],
            color: MID_GRAY,
          },
        ],
        valueAxis: { title: "Customer Satisfaction Score", max: 100 },
        categoryAxis: { title: "Product Capability (1-10)" },
        legend: { position: "right" },
      },
    } as PaperChart,
  ],
  "Source: Forrester Wave Q4 2025, G2 Crowd Reviews",
);

// ---------------------------------------------------------------------------
// Slide 13: Process Flow (6-step chevron)
// ---------------------------------------------------------------------------
const chevronW = 173;
const chevronGap = 16;
const chevronTop = 213;
const chevronLeft = 55;

function chevronShape(label: string, sublabel: string, index: number, color: string): PaperView {
  return {
    type: "View",
    shapeType: "chevron",
    style: {
      position: "absolute",
      top: chevronTop,
      left: chevronLeft + index * (chevronW + chevronGap),
      width: chevronW,
      height: 107,
      backgroundColor: color,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 11,
    },
    children: [
      textNode(label, { fontSize: pt(11), fontWeight: "bold", color: WHITE, textAlign: "center" }),
      textNode(sublabel, { fontSize: pt(11), color: "#D1D5DB", textAlign: "center", marginTop: 5 }),
    ],
  } as PaperView;
}

const processFlowSlide = contentSlide(
  "Six-phase delivery model ensures structured execution from discovery to scale",
  [
    chevronShape("Discovery", "Weeks 1-2", 0, MBB_BLUE),
    chevronShape("Analysis", "Weeks 3-4", 1, "#0050B5"),
    chevronShape("Design", "Weeks 5-8", 2, "#0060C0"),
    chevronShape("Build", "Weeks 9-14", 3, "#0070D0"),
    chevronShape("Test", "Weeks 15-16", 4, "#0080E0"),
    chevronShape("Scale", "Weeks 17-20", 5, "#0090F0"),
    // Step descriptions below chevrons
    {
      type: "View",
      style: { position: "absolute", top: 347, left: 55, width: 1170, height: 240 },
      children: [
        textNode("1. Stakeholder interviews & data collection", { fontSize: pt(11), color: DARK_GRAY, position: "absolute", top: 0, left: 0, width: 187 }),
        textNode("2. Market sizing & competitive benchmarking", { fontSize: pt(11), color: DARK_GRAY, position: "absolute", top: 0, left: 189, width: 187 }),
        textNode("3. Solution architecture & business case", { fontSize: pt(11), color: DARK_GRAY, position: "absolute", top: 0, left: 378, width: 187 }),
        textNode("4. MVP development & integration planning", { fontSize: pt(11), color: DARK_GRAY, position: "absolute", top: 0, left: 567, width: 187 }),
        textNode("5. UAT, performance testing & validation", { fontSize: pt(11), color: DARK_GRAY, position: "absolute", top: 0, left: 757, width: 187 }),
        textNode("6. Rollout, training & continuous improvement", { fontSize: pt(11), color: DARK_GRAY, position: "absolute", top: 0, left: 946, width: 187 }),
      ],
    } as PaperView,
  ],
  "Source: Proprietary delivery methodology",
);

// ---------------------------------------------------------------------------
// Slide 14: Key Findings (Text)
// ---------------------------------------------------------------------------
const keyFindingsSlide = contentSlide(
  "Four critical findings emerge from our competitive deep-dive analysis",
  [
    richText(
      [
        {
          runs: [
            { text: "1. Market share concentration is accelerating", style: { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 0,
        },
        {
          runs: [{ text: "   • Top 3 players now control 62% of enterprise revenue, up from 48% in FY23", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 4,
        },
        {
          runs: [{ text: "   • Mid-tier vendors face margin compression as pricing pressure intensifies", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "2. Product-led growth models outperform traditional sales by 2.3×", style: { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   • PLG companies achieve 35% lower CAC with 18-month faster payback", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 4,
        },
        {
          runs: [{ text: "   • Self-serve onboarding drives 4× trial-to-paid conversion in SMB segment", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "3. AI integration has become a table-stakes differentiator", style: { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   • 78% of enterprise buyers rank AI capabilities in top-3 evaluation criteria", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 4,
        },
        {
          runs: [{ text: "   • Companies without AI roadmap see 15% higher churn in renewals", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "4. Geographic expansion requires localized go-to-market strategies", style: { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   • APAC markets demand 40% more customization than North American deployments", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 4,
        },
        {
          runs: [{ text: "   • Local partnerships reduce time-to-revenue by an average of 6 months", style: { fontSize: pt(11), color: DARK_GRAY } }],
          spaceBefore: 2,
        },
      ],
      { position: "absolute", top: 93, left: 80, width: 1120, height: 533 },
    ),
  ],
  "Source: Competitive intelligence interviews (n=42), win/loss analysis FY24-25",
  { notes: "Findings 2 and 3 are the most actionable. PLG adoption and AI roadmap should be prioritized in Q1-Q2 initiatives." },
);

// ---------------------------------------------------------------------------
// Slide 15: Horizontal Bar — Customer Priorities
// ---------------------------------------------------------------------------
const horizBarSlide = contentSlide(
  "Enterprise buyers rank AI capabilities and integration depth as top purchase drivers",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "bar",
        barDirection: "bar",
        barGrouping: "clustered",
        categories: ["AI / ML Capabilities", "Integration Depth", "Security & Compliance", "Total Cost of Ownership", "Customer Support", "Scalability", "Ease of Use"],
        series: [
          { name: "Enterprise", values: [92, 88, 85, 72, 68, 82, 65], color: MBB_BLUE },
          { name: "Mid-Market", values: [65, 72, 78, 85, 80, 70, 88], color: "#0070C0" },
        ],
        valueAxis: { numberFormat: "#,##0%", title: "% Citing as Top-3 Factor" },
        legend: { position: "bottom" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: Customer survey (n=384), Q4 2025",
);

// ---------------------------------------------------------------------------
// Slide 16: Clustered Column — Win Rate by Quarter
// ---------------------------------------------------------------------------
const clusteredColSlide = contentSlide(
  "Win rates have improved 8pp year-over-year in Enterprise but declined in SMB",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "bar",
        barDirection: "col",
        barGrouping: "clustered",
        categories: ["Q1'25", "Q2'25", "Q3'25", "Q4'25"],
        series: [
          { name: "Enterprise", values: [38, 41, 44, 46], color: MBB_BLUE },
          { name: "Mid-Market", values: [32, 33, 34, 35], color: "#0070C0" },
          { name: "SMB", values: [28, 26, 24, 22], color: "#5B9BD5" },
        ],
        valueAxis: { numberFormat: "#,##0%", title: "Win Rate (%)" },
        categoryAxis: { title: "Quarter" },
        legend: { position: "bottom" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: CRM win/loss data, FY25",
);

// ---------------------------------------------------------------------------
// Slide 17: Pie Chart — Revenue Mix
// ---------------------------------------------------------------------------
const pieSlide = contentSlide(
  "Subscription revenue now represents 68% of total, up from 52% three years ago",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 187, width: 907, height: 505 },
      chartData: {
        chartType: "pie",
        categories: ["Subscription", "Professional Services", "Maintenance", "License", "Other"],
        series: [{
          name: "Revenue Mix",
          values: [68, 14, 9, 6, 3],
          pointColors: [MBB_BLUE, "#0070C0", "#5B9BD5", AMBER, MID_GRAY],
        }],
        legend: { position: "right" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: FY25 audited financials",
);

// ---------------------------------------------------------------------------
// Slide 18: Line Chart — NPS Trend
// ---------------------------------------------------------------------------
const npsLineSlide = contentSlide(
  "NPS scores correlate strongly with renewal rates, validating customer success investment",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 505 },
      chartData: {
        chartType: "line",
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        series: [
          { name: "NPS Score", values: [42, 44, 46, 48, 52, 55, 58, 61], color: MBB_BLUE },
          { name: "Renewal Rate (%)", values: [88, 89, 89, 90, 91, 92, 93, 94], color: GREEN },
        ],
        valueAxis: { title: "Score / Rate" },
        categoryAxis: { title: "Month (2025)" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
  ],
  "Source: Medallia NPS data, internal renewal tracking",
);

// ---------------------------------------------------------------------------
// Slide 19: Section Divider — Recommendations
// ---------------------------------------------------------------------------
const section03 = sectionDivider("03", "Recommendations", MBB_NAVY);

// ---------------------------------------------------------------------------
// Slide 20: Recommendations — 3 Columns
// ---------------------------------------------------------------------------
const recommendationsSlide = contentSlide(
  "Three strategic initiatives can collectively deliver $50M incremental revenue",
  [
    {
      type: "View",
      style: {
        position: "absolute", top: 105, left: 55, width: 1170,
        flexDirection: "row", gap: 27,
      },
      children: [
        card(
          [
            textNode("Pricing Optimization", {
              fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 11,
            }),
            textNode("+$10M Revenue Impact", {
              fontSize: pt(11), fontWeight: "bold", color: GREEN, marginBottom: 11,
            }),
            bulletList(
              [
                { text: "Implement value-based pricing tiers" },
                { text: "Reduce discounting by 30%" },
                { text: "Launch premium support packages" },
                { text: "Introduce annual commitment incentives" },
              ],
              { fontSize: pt(11) },
            ),
          ],
          { width: 360, height: 400 },
        ),
        card(
          [
            textNode("Bolt-on Acquisitions", {
              fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 11,
            }),
            textNode("+$15M Revenue Impact", {
              fontSize: pt(11), fontWeight: "bold", color: GREEN, marginBottom: 11,
            }),
            bulletList(
              [
                { text: "Target 2-3 complementary SaaS vendors" },
                { text: "Focus on data analytics capabilities" },
                { text: "Budget: $50-80M total consideration" },
                { text: "Close first acquisition by Q3 FY26" },
              ],
              { fontSize: pt(11) },
            ),
          ],
          { width: 360, height: 400 },
        ),
        card(
          [
            textNode("Product-Led Expansion", {
              fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 11,
            }),
            textNode("+$25M Revenue Impact", {
              fontSize: pt(11), fontWeight: "bold", color: GREEN, marginBottom: 11,
            }),
            bulletList(
              [
                { text: "Launch self-serve SMB product" },
                { text: "Expand into 3 adjacent verticals" },
                { text: "Build developer ecosystem & APIs" },
                { text: "Hire VP of PLG by end of Q1" },
              ],
              { fontSize: pt(11) },
            ),
          ],
          { width: 360, height: 400 },
        ),
      ],
    } as PaperView,
  ],
  undefined,
  { notes: "Spend time on each pillar. Pricing is the fastest win; PLG has the highest upside but longest ramp. M&A depends on target availability." },
);

// ---------------------------------------------------------------------------
// Slide 21: Implementation Roadmap (Gantt)
// ---------------------------------------------------------------------------
const roadmapSlide = contentSlide(
  "Implementation spans four quarters with quick wins in Q1 and strategic bets in Q3-Q4",
  [
    ganttTimeline([
      { name: "Pricing audit", start: 0, duration: 2, color: MBB_BLUE },
      { name: "Tier restructuring", start: 1, duration: 3, color: MBB_BLUE },
      { name: "M&A target screening", start: 0, duration: 3, color: "#0070C0" },
      { name: "Due diligence", start: 3, duration: 4, color: "#0070C0" },
      { name: "Integration planning", start: 6, duration: 3, color: "#0070C0" },
      { name: "PLG MVP build", start: 2, duration: 5, color: GREEN },
      { name: "Beta launch", start: 7, duration: 2, color: GREEN },
      { name: "GA & scale", start: 9, duration: 3, color: GREEN },
    ]),
    // Quarter labels
    textNode("Q1 FY26", { position: "absolute", top: 105, left: 400, fontSize: pt(11), fontWeight: "bold", color: MID_GRAY }),
    textNode("Q2 FY26", { position: "absolute", top: 105, left: 640, fontSize: pt(11), fontWeight: "bold", color: MID_GRAY }),
    textNode("Q3 FY26", { position: "absolute", top: 105, left: 880, fontSize: pt(11), fontWeight: "bold", color: MID_GRAY }),
    textNode("Q4 FY26", { position: "absolute", top: 105, left: 1120, fontSize: pt(11), fontWeight: "bold", color: MID_GRAY }),
  ],
  "Source: PMO workstream estimates, validated with functional leads",
  { notes: "Emphasize that pricing audit and M&A screening start in parallel during Q1. PLG MVP build begins in Q1 but GA is not until Q4." },
);

// ---------------------------------------------------------------------------
// Slide 22: Next Steps
// ---------------------------------------------------------------------------
const nextStepsSlide = contentSlide(
  "Five immediate actions required to maintain momentum over the next 30 days",
  [
    richText(
      [
        {
          runs: [
            { text: "1. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Finalize pricing tier structure with Finance & Product", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 0,
        },
        {
          runs: [{ text: "   Owner: CFO / VP Product  •  Due: March 22, 2026", style: { fontSize: pt(11), color: MID_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "2. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Engage investment bank for M&A target outreach", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   Owner: VP Corp Dev  •  Due: March 29, 2026", style: { fontSize: pt(11), color: MID_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "3. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Post VP of Product-Led Growth role and begin recruiter search", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   Owner: CHRO  •  Due: March 15, 2026", style: { fontSize: pt(11), color: MID_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "4. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Launch customer advisory board for AI feature prioritization", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   Owner: CTO / VP Customer Success  •  Due: April 5, 2026", style: { fontSize: pt(11), color: MID_GRAY } }],
          spaceBefore: 2,
        },
        {
          runs: [
            { text: "5. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Schedule board update for Q2 strategy approval", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [{ text: "   Owner: CEO / Chief of Staff  •  Due: April 12, 2026", style: { fontSize: pt(11), color: MID_GRAY } }],
          spaceBefore: 2,
        },
      ],
      { position: "absolute", top: 93, left: 80, width: 1120, height: 533 },
    ),
  ],
  undefined,
  { notes: "Confirm ownership assignments with each executive before leaving the room. Ensure March 15 CHRO deadline is feasible." },
);

// ---------------------------------------------------------------------------
// Slide 23: Closing Slide
// ---------------------------------------------------------------------------
const closingSlide: PaperSlide = {
  ...mbbTitleSlide("Thank You", "Questions & Discussion"),
  notes: "Thank attendees. Reiterate three initiatives: pricing, M&A, PLG. Confirm next check-in April 15. Share deck via secure portal.",
  children: [
    accentBar(MBB_BLUE),
    textNode("Thank You", {
      position: "absolute", top: 187, left: 80, width: 1120,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    textNode("Questions & Discussion", {
      position: "absolute", top: 267, left: 80, width: 933,
      fontSize: pt(18), color: MID_GRAY,
    }),
    textNode("Jane Smith, Partner  •  jane.smith@consultingfirm.com  •  +1 (212) 555-0142", {
      position: "absolute", top: 453, left: 80, width: 1120,
      fontSize: pt(11), color: MID_GRAY,
    }),
    textNode("© 2026 Consulting Firm LLP. All rights reserved. Confidential.", {
      position: "absolute", top: 493, left: 80, width: 1120,
      fontSize: pt(11), color: MID_GRAY,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 24: Appendix Header + Data
// ---------------------------------------------------------------------------
const appendixSlide = contentSlide(
  "Appendix: Detailed financial assumptions and methodology",
  [
    financialTable(
      ["Assumption", "FY25 Actual", "FY26 Base", "FY26 Upside", "FY27 Target"],
      [
        ["Revenue Growth Rate", "6.2%", "8.0%", "12.5%", "15.0%"],
        ["Gross Margin", "72.4%", "73.0%", "74.5%", "75.0%"],
        ["S&M as % Revenue", "38.1%", "36.0%", "34.0%", "32.0%"],
        ["R&D as % Revenue", "22.3%", "23.0%", "24.0%", "22.0%"],
        ["G&A as % Revenue", "8.4%", "8.0%", "7.5%", "7.0%"],
        ["EBITDA Margin", "3.6%", "6.0%", "9.0%", "14.0%"],
        ["Net Revenue Retention", "108%", "112%", "118%", "125%"],
        ["Customer Count", "1,284", "1,450", "1,620", "1,900"],
        ["Avg. Contract Value", "$82K", "$88K", "$95K", "$105K"],
        ["Employee Headcount", "842", "910", "980", "1,050"],
      ],
      { alternatingRows: true },
    ),
  ],
  "Source: FY25 audited financials, FY26-27 management plan assumptions",
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const consultingDeck: PaperDocument = makeDoc(
  [
    titleSlide,           // 1
    execSummarySlide,     // 2
    agendaSlide,          // 3
    section01,            // 4
    marketSizingSlide,    // 5
    trendSlide,           // 6
    waterfallSlide,       // 7
    frameworkSlide,       // 8
    harveyTableSlide,     // 9
    stackedBarSlide,      // 10
    section02,            // 11
    competitiveLandscapeSlide, // 12
    processFlowSlide,     // 13
    keyFindingsSlide,     // 14
    horizBarSlide,        // 15
    clusteredColSlide,    // 16
    pieSlide,             // 17
    npsLineSlide,         // 18
    section03,            // 19
    recommendationsSlide, // 20
    roadmapSlide,         // 21
    nextStepsSlide,       // 22
    closingSlide,         // 23
    appendixSlide,        // 24
  ],
  { title: "Strategic Growth Assessment — Consulting Deck" },
);
