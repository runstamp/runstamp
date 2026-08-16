/**
 * T4: QBR — Quarterly Business Review (16 slides)
 * Comprehensive QBR with financial dashboards, OKR tracking, customer health,
 * competitive analysis, product delivery, risk register, and action items.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperView, PaperText,
  PaperTable, TableRow, TableCellStyle,
} from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, contentSlide, textNode, richText, bulletList,
  financialTable, card, kpiTile, kpiGrid, gaugeChart, sourceFooter, actionTitle,
  accentBar, pt,
  MBB_NAVY, MBB_BLUE, WHITE, OFF_WHITE, LIGHT_GRAY, MID_GRAY, DARK_GRAY,
  GREEN, RED, AMBER, DARK_GRADIENT, CONTENT_BG,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// RAG helper
// ---------------------------------------------------------------------------
const ragStyle = (status: "Green" | "Amber" | "Red"): TableCellStyle => ({
  fill: status === "Green" ? GREEN : status === "Amber" ? AMBER : RED,
  color: WHITE, fontWeight: "bold", fontSize: pt(10), textAlign: "center", padding: 5,
  borders: { bottom: { width: 0.5, color: LIGHT_GRAY } },
});

// ---------------------------------------------------------------------------
// Slide 1: Title
// ---------------------------------------------------------------------------
const titleSlide = mbbTitleSlide("Q2 2026 Quarterly Business Review", "Acme Corp • Confidential");

// ---------------------------------------------------------------------------
// Slide 2: Executive Summary — KPI tiles + narrative
// ---------------------------------------------------------------------------
const execSummarySlide = contentSlide(
  "Strong quarter across revenue and retention; hiring and pipeline require attention",
  [
    kpiGrid([
      kpiTile("Revenue", "$14.8M", "+18% YoY", { trendColor: GREEN }),
      kpiTile("ARR", "$56M", "+33% YoY", { trendColor: GREEN }),
      kpiTile("NRR", "118%", "+3pp QoQ", { trendColor: GREEN }),
      kpiTile("Headcount", "185", "12 open roles", { trendColor: AMBER }),
    ], 4),
    richText(
      [
        {
          runs: [
            { text: "Q2 highlights: ", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Revenue exceeded target by 8%, driven by enterprise upsells and 3 new logos >$500K ACV. NRR reached an all-time high of 118%. Product shipped AI copilot (65% adoption in first 6 weeks). Key risk: sales pipeline coverage at 2.4x vs 3.0x target.", style: { fontSize: pt(11) } },
          ],
          spaceBefore: 0,
        },
      ],
      { position: "absolute", top: 293, left: 55, width: 1170, height: 267 },
    ),
  ],
  "Source: Internal systems, as of June 30, 2026",
  { notes: "Emphasize that revenue beat was enterprise-driven; pipeline coverage gap is the top concern heading into Q3." },
);

// ---------------------------------------------------------------------------
// Slide 3: Financial Dashboard — 4 mini charts
// ---------------------------------------------------------------------------
const financialDashboardSlide = contentSlide(
  "All four financial indicators trending positively; EBITDA margin hit 20%",
  [
    // Revenue trend (line)
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 560, height: 240 },
      chartData: {
        chartType: "line",
        categories: ["Q1'25", "Q2'25", "Q3'25", "Q4'25", "Q1'26", "Q2'26"],
        series: [{ name: "Revenue ($M)", values: [10.1, 10.9, 11.7, 14.0, 13.8, 14.8], color: MBB_BLUE, marker: { symbol: "circle", size: 4 } }],
        valueAxis: { numberFormat: "$#,##0M" },
        legend: { position: "none" },
        title: { text: "Revenue Trend", fontSize: pt(11) },
      },
    } as PaperChart,
    // ARR growth (bar)
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 667, width: 560, height: 240 },
      chartData: {
        chartType: "bar",
        categories: ["Q1'25", "Q2'25", "Q3'25", "Q4'25", "Q1'26", "Q2'26"],
        series: [{ name: "ARR ($M)", values: [30.2, 32.8, 35.0, 42.0, 48.5, 56.0], color: MBB_BLUE }],
        valueAxis: { numberFormat: "$#,##0M" },
        legend: { position: "none" },
        title: { text: "ARR Growth", fontSize: pt(11) },
      },
    } as PaperChart,
    // Expense breakdown (stacked bar)
    {
      type: "Chart",
      style: { position: "absolute", top: 387, left: 55, width: 560, height: 240 },
      chartData: {
        chartType: "bar",
        barGrouping: "stacked",
        categories: ["Q1'25", "Q2'25", "Q3'25", "Q4'25", "Q1'26", "Q2'26"],
        series: [
          { name: "S&M", values: [3.5, 3.6, 3.8, 4.2, 4.0, 4.3], color: "#0070C0" },
          { name: "R&D", values: [2.8, 2.9, 3.0, 3.2, 3.3, 3.5], color: GREEN },
          { name: "G&A", values: [1.0, 1.0, 1.1, 1.2, 1.1, 1.2], color: AMBER },
        ],
        valueAxis: { numberFormat: "$#,##0M" },
        legend: { position: "bottom" },
        title: { text: "OpEx Breakdown", fontSize: pt(11) },
      },
    } as PaperChart,
    // EBITDA margin (area)
    {
      type: "Chart",
      style: { position: "absolute", top: 387, left: 667, width: 560, height: 240 },
      chartData: {
        chartType: "area",
        categories: ["Q1'25", "Q2'25", "Q3'25", "Q4'25", "Q1'26", "Q2'26"],
        series: [{ name: "EBITDA Margin %", values: [6, 10, 11, 18, 17, 20], color: GREEN }],
        valueAxis: { numberFormat: "0%", max: 30 },
        legend: { position: "none" },
        title: { text: "EBITDA Margin", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: Internal finance, unaudited",
);

// ---------------------------------------------------------------------------
// Slide 4: Revenue vs Target — Clustered column (12 months)
// ---------------------------------------------------------------------------
const revenueVsTargetSlide = contentSlide(
  "Revenue outperformed target in 10 of 12 months; Q2 beat driven by enterprise deals",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "bar",
        barGrouping: "clustered",
        categories: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        series: [
          {
            name: "Actual ($M)",
            values: [3.8, 3.9, 4.0, 4.2, 4.6, 5.2, 4.5, 4.4, 4.9, 4.7, 4.8, 5.3],
            color: MBB_BLUE,
          },
          {
            name: "Target ($M)",
            values: [3.9, 3.9, 3.9, 4.2, 4.2, 4.5, 4.5, 4.5, 4.5, 4.8, 4.8, 4.8],
            color: "#C0C0C0",
            dataLabels: { showVal: false },
          },
        ],
        valueAxis: { numberFormat: "$#,##0.0M", title: "Monthly Revenue" },
        categoryAxis: { title: "Month" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
  ],
  "Source: Finance team monthly close, FY26",
);

// ---------------------------------------------------------------------------
// Slide 5: Sales Pipeline Funnel (6 stages)
// ---------------------------------------------------------------------------
const pipelineFunnelSlide = contentSlide(
  "Pipeline coverage at 2.4x; MQL-to-SQL conversion improving but below 3x target",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 160, width: 960, height: 507 },
      chartData: {
        chartType: "funnel",
        funnelData: {
          categories: ["Leads", "MQLs", "SQLs", "Opportunities", "Proposals", "Closed Won"],
          values: [8200, 3100, 1250, 480, 190, 62],
          colors: [MBB_BLUE, "#0070C0", "#2196F3", GREEN, AMBER, "#FF6600"],
        },
        legend: { position: "none" },
        dataLabels: { showVal: true, showCatName: true, position: "ctr", fontSize: pt(11) },
      },
    } as PaperChart,
  ],
  "Source: Salesforce CRM, Q2 2026",
);

// ---------------------------------------------------------------------------
// Slide 6: OKR Progress — 4 objectives × 3 KRs each
// ---------------------------------------------------------------------------
const okrHeaders = ["Objective", "Key Result", "Target", "Actual", "% Complete", "Status"];

const okrData: { data: string[]; status: "Green" | "Amber" | "Red" }[] = [
  { data: ["Grow Revenue", "Close $15M net new ARR", "$15M", "$13.8M", "92%"], status: "Green" },
  { data: ["", "Expand into 2 new verticals", "2", "2", "100%"], status: "Green" },
  { data: ["", "Achieve 120% NRR", "120%", "118%", "98%"], status: "Green" },
  { data: ["Scale GTM", "Hire 8 enterprise AEs", "8", "5", "63%"], status: "Red" },
  { data: ["", "Build partner channel ($2M ARR)", "$2M", "$1.4M", "70%"], status: "Amber" },
  { data: ["", "Achieve 3x pipeline coverage", "3.0x", "2.4x", "80%"], status: "Amber" },
  { data: ["Product Excellence", "Ship AI copilot GA", "GA", "GA", "100%"], status: "Green" },
  { data: ["", "99.95% uptime SLA", "99.95%", "99.97%", "100%"], status: "Green" },
  { data: ["", "Reduce P1 incidents <2/mo", "<2", "1.5", "100%"], status: "Green" },
  { data: ["People & Culture", "eNPS > 60", "60", "58", "97%"], status: "Amber" },
  { data: ["", "Complete DEI training 100%", "100%", "92%", "92%"], status: "Amber" },
  { data: ["", "Promote 5 to senior roles", "5", "4", "80%"], status: "Amber" },
];

const okrTableNode = financialTable(
  okrHeaders,
  okrData.map(r => [...r.data, r.status]),
  { alternatingRows: true, columnWidths: [173, 253, 107, 107, 113, 100], style: { top: 100, left: 40 } },
);

// Patch RAG cells
if (okrTableNode.type === "Table") {
  const dataRows = okrTableNode.tableData.rows.slice(1);
  okrData.forEach((r, i) => {
    if (dataRows[i]) {
      const lastCell = dataRows[i].cells[dataRows[i].cells.length - 1];
      Object.assign(lastCell, { style: ragStyle(r.status as "Green" | "Amber" | "Red") });
    }
  });
}

const okrSlide: PaperSlide = contentSlide(
  "9 of 12 key results on track; GTM hiring and pipeline coverage are primary gaps",
  [okrTableNode],
  "Source: OKR tracking system, as of June 30, 2026",
  { notes: "Three red/amber KRs in GTM are linked; resolving AE hiring will improve both pipeline and partner channel metrics." },
);

// ---------------------------------------------------------------------------
// Slide 7: Customer Health — NPS Gauge + Retention Donut + Top 5 Table
// ---------------------------------------------------------------------------
const customerHealthSlide = contentSlide(
  "Customer health strong: NPS 52, logo retention 97.8%, top accounts expanding",
  [
    gaugeChart(52, 100, "NPS Score", { color: GREEN, style: { position: "absolute", top: 105, left: 55, width: 267, height: 227 } }),
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 360, width: 267, height: 227 },
      chartData: {
        chartType: "doughnut",
        holeSize: 65,
        categories: ["Retained", "Churned"],
        series: [{ name: "Retention", values: [97.8, 2.2], pointColors: [GREEN, "#E5E7EB"] }],
        legend: { position: "none" },
        title: { text: "Logo Retention", fontSize: pt(11) },
      },
    } as PaperChart,
    financialTable(
      ["Customer", "ARR", "Health", "NRR", "Next Renewal"],
      [
        ["GlobalCorp", "$2.8M", "Strong", "135%", "Sep 2026"],
        ["TechVentures", "$1.9M", "Strong", "128%", "Dec 2026"],
        ["MegaBank", "$1.5M", "At Risk", "95%", "Aug 2026"],
        ["RetailCo", "$1.2M", "Strong", "142%", "Nov 2026"],
        ["HealthFirst", "$1.1M", "Moderate", "110%", "Oct 2026"],
      ],
      { alternatingRows: true, columnWidths: [187, 133, 107, 107, 147], style: { top: 373, left: 55 } },
    ),
  ],
  "Source: Gainsight CS platform, Delighted NPS",
);

// ---------------------------------------------------------------------------
// Slide 8: Competitive Analysis — Scatter + Win/Loss Table
// ---------------------------------------------------------------------------
const competitiveSlide = contentSlide(
  "We win on product depth; losing deals primarily on price and brand awareness",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 55, width: 560, height: 333 },
      chartData: {
        chartType: "scatter",
        xySeries: [
          { name: "Acme (Us)", dataPoints: [{ x: 8.2, y: 7.5 }], color: MBB_BLUE },
          { name: "Competitor A", dataPoints: [{ x: 7.0, y: 8.8 }], color: RED },
          { name: "Competitor B", dataPoints: [{ x: 6.5, y: 6.0 }], color: AMBER },
          { name: "Competitor C", dataPoints: [{ x: 9.0, y: 5.5 }], color: MID_GRAY },
        ],
        valueAxis: { title: "Market Presence (10-pt)", min: 0, max: 10 },
        categoryAxis: { title: "Product Capability (10-pt)" },
        legend: { position: "bottom" },
        title: { text: "Competitive Positioning", fontSize: pt(11) },
      },
    } as PaperChart,
    financialTable(
      ["Competitor", "Deals Won", "Deals Lost", "Win Rate", "Primary Loss Reason"],
      [
        ["vs Competitor A", "12", "18", "40%", "Price / discounting"],
        ["vs Competitor B", "22", "8", "73%", "Brand awareness"],
        ["vs Competitor C", "15", "5", "75%", "Incumbent relationship"],
        ["vs Other", "13", "4", "76%", "Feature gaps"],
      ],
      { alternatingRows: true, columnWidths: [173, 120, 120, 120, 267], style: { top: 453, left: 55 } },
    ),
  ],
  "Source: CRM win/loss analysis, trailing 12 months",
);

// ---------------------------------------------------------------------------
// Slide 9: Product Delivery — Feature Release Table
// ---------------------------------------------------------------------------
const productDeliverySlide = contentSlide(
  "Shipped 11 features on time in Q2; AI copilot driving highest adoption",
  [
    financialTable(
      ["Feature", "Category", "Status", "Ship Date", "Adoption", "Impact"],
      [
        ["AI Copilot GA", "Core", "Shipped", "Apr 8", "65%", "High"],
        ["API v3.1", "Developer", "Shipped", "Apr 22", "34%", "High"],
        ["Advanced Analytics", "Analytics", "Shipped", "May 5", "48%", "Medium"],
        ["SCIM Provisioning", "Security", "Shipped", "May 15", "28%", "Medium"],
        ["Workflow Builder v2", "Automation", "Shipped", "May 28", "52%", "High"],
        ["Real-time Dashboards", "Analytics", "Shipped", "Jun 10", "41%", "Medium"],
        ["Custom Roles", "Security", "Shipped", "Jun 18", "30%", "Medium"],
        ["Slack Integration v2", "Integrations", "Shipped", "Jun 25", "55%", "Medium"],
        ["Mobile Push Alerts", "Mobile", "Delayed", "Jul (est)", "—", "Low"],
        ["Data Export API", "Developer", "In Progress", "Jul 15", "—", "Medium"],
      ],
      { alternatingRows: true, columnWidths: [213, 133, 107, 107, 107, 93], style: { top: 100, left: 40 } },
    ),
  ],
  "Source: Product analytics & Jira, as of June 30, 2026",
);

// ---------------------------------------------------------------------------
// Slide 10: Operational Metrics — 6 KPI Tiles (2×3)
// ---------------------------------------------------------------------------
const operationalMetricsSlide = contentSlide(
  "Operational metrics healthy; uptime and support SLAs exceed targets",
  [
    kpiGrid([
      kpiTile("Uptime", "99.97%", "Target: 99.95%", { valueColor: GREEN, trendColor: GREEN }),
      kpiTile("Avg Response Time", "142ms", "-18% QoQ", { trendColor: GREEN }),
      kpiTile("Support CSAT", "4.7/5.0", "+0.2 QoQ", { trendColor: GREEN }),
      kpiTile("Median TTR (P1)", "38 min", "-12 min QoQ", { trendColor: GREEN }),
      kpiTile("Deploy Frequency", "14/week", "+3/week QoQ", { trendColor: GREEN }),
      kpiTile("Change Failure Rate", "1.8%", "-0.4pp QoQ", { trendColor: GREEN }),
    ], 3),
  ],
  "Source: Datadog, PagerDuty, Zendesk",
);

// ---------------------------------------------------------------------------
// Slide 11: Team & Hiring — Headcount Bar + Open Roles Table
// ---------------------------------------------------------------------------
const teamHiringSlide = contentSlide(
  "Team grew to 185; 12 open roles concentrated in engineering and sales",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 100, left: 55, width: 560, height: 293 },
      chartData: {
        chartType: "bar",
        barGrouping: "clustered",
        categories: ["Engineering", "Product", "Sales", "Marketing", "CS", "G&A"],
        series: [
          { name: "Current", values: [78, 16, 38, 14, 22, 17], color: MBB_BLUE },
          { name: "Plan", values: [85, 18, 45, 15, 25, 18], color: "#C0C0C0" },
        ],
        valueAxis: { title: "Headcount" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
    financialTable(
      ["Role", "Department", "Level", "Priority", "Days Open"],
      [
        ["Sr. Backend Engineer", "Engineering", "L5", "P0", "32"],
        ["ML Engineer", "Engineering", "L5", "P0", "45"],
        ["Platform Engineer", "Engineering", "L4", "P1", "18"],
        ["Frontend Engineer", "Engineering", "L4", "P1", "22"],
        ["Enterprise AE", "Sales", "Senior", "P0", "28"],
        ["Enterprise AE", "Sales", "Senior", "P0", "15"],
        ["SDR Manager", "Sales", "Manager", "P1", "38"],
        ["Solutions Engineer", "Sales", "Mid", "P1", "12"],
        ["Product Designer", "Product", "Senior", "P1", "25"],
        ["Data Analyst", "Product", "Mid", "P2", "8"],
        ["CS Manager", "CS", "Manager", "P1", "20"],
        ["G&A Analyst", "G&A", "Mid", "P2", "5"],
      ],
      { alternatingRows: true, columnWidths: [227, 147, 107, 93, 120], style: { top: 413, left: 55 } },
    ),
  ],
  "Source: Greenhouse ATS, HR system",
);

// ---------------------------------------------------------------------------
// Slide 12: Risk Register (8 risks)
// ---------------------------------------------------------------------------
const riskData: { data: string[]; rag: "Green" | "Amber" | "Red" }[] = [
  { data: ["Key engineer attrition", "High", "High", "Retention packages, growth plans", "VP Eng"], rag: "Red" },
  { data: ["Pipeline coverage <3x", "High", "High", "Accelerate SDR hiring, demand gen", "CRO"], rag: "Red" },
  { data: ["Competitor price war", "Medium", "High", "Value selling training, case studies", "CRO"], rag: "Amber" },
  { data: ["Data center outage", "Low", "High", "Multi-region failover, chaos testing", "CTO"], rag: "Green" },
  { data: ["SOC2 remediation delay", "Medium", "Medium", "Dedicated security sprint", "CISO"], rag: "Amber" },
  { data: ["Enterprise deal slippage", "Medium", "High", "Weekly deal review, exec sponsors", "CRO"], rag: "Amber" },
  { data: ["APAC regulatory complexity", "Medium", "Medium", "Engage local counsel", "GC"], rag: "Amber" },
  { data: ["AI cost scaling", "Low", "Medium", "Optimize inference, caching layer", "VP Eng"], rag: "Green" },
];

const riskTableNode = financialTable(
  ["Risk", "Likelihood", "Impact", "Mitigation", "Owner"],
  riskData.map(r => r.data),
  { alternatingRows: true, columnWidths: [240, 107, 93, 373, 107], style: { top: 100, left: 40 } },
);

const riskSlide: PaperSlide = contentSlide(
  "Two red risks require immediate attention: attrition and pipeline coverage",
  [riskTableNode],
  "Updated: June 30, 2026",
  { notes: "Retention packages for key engineers are already in draft; board should expect a budget request at the next meeting." },
);

// ---------------------------------------------------------------------------
// Slide 13: Challenges & Blockers — 3 blocks
// ---------------------------------------------------------------------------
const challengesSlide = contentSlide(
  "Three systemic challenges must be addressed in Q3 to sustain growth trajectory",
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
            textNode("1. GTM Hiring Velocity", { fontSize: pt(14), fontWeight: "bold", color: RED, marginBottom: 11 }),
            textNode(
              "We are 3 AEs behind plan, resulting in $4M uncovered territory. Root cause: compensation not competitive for enterprise AEs in Tier 1 markets. Proposed fix: adjust OTE to 75th percentile (+15%) and add signing bonuses for Q3 hires.",
              { fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.5 },
            ),
          ],
          { width: 373, height: 427 },
        ),
        card(
          [
            textNode("2. Pipeline Generation", { fontSize: pt(14), fontWeight: "bold", color: AMBER, marginBottom: 11 }),
            textNode(
              "Pipeline coverage dropped from 3.2x to 2.4x over two quarters. Inbound leads flat despite 20% increase in marketing spend. Proposed fix: launch outbound motion with 4 dedicated SDRs, invest in ABM for top 50 enterprise targets.",
              { fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.5 },
            ),
          ],
          { width: 373, height: 427 },
        ),
        card(
          [
            textNode("3. Enterprise Churn Signal", { fontSize: pt(14), fontWeight: "bold", color: AMBER, marginBottom: 11 }),
            textNode(
              "Lost 2 enterprise logos in Q2 ($1.8M ARR). Both cited lack of advanced analytics and reporting. Product gap partially addressed by Advanced Analytics feature, but need dedicated enterprise success team. Proposed fix: hire 2 strategic CSMs.",
              { fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.5 },
            ),
          ],
          { width: 373, height: 427 },
        ),
      ],
    } as PaperView,
  ],
);

// ---------------------------------------------------------------------------
// Slide 14: Next Quarter Priorities
// ---------------------------------------------------------------------------
const prioritiesSlide = contentSlide(
  "Q3 priorities focused on closing GTM gaps and preparing for Series C",
  [
    bulletList(
      [
        { text: "1. Close AE hiring gap — fill 3 remaining enterprise AE roles by Aug 15 (Owner: VP Sales)" },
        { text: "2. Rebuild pipeline to 3x — launch ABM program targeting 50 enterprise accounts (Owner: VP Marketing)" },
        { text: "3. Complete SOC2 Type II audit — remediate 4 remaining findings by Jul 31 (Owner: CISO)" },
        { text: "4. Ship enterprise analytics module — advanced reporting GA by Sep 1 (Owner: VP Product)" },
        { text: "5. Prepare Series C materials — data room, banker selection, preliminary deck (Owner: CEO / CFO)" },
        { text: "6. Launch APAC pilot — 2 lighthouse customers in Singapore by Sep 30 (Owner: VP International)" },
        { text: "7. Achieve EBITDA breakeven on monthly basis — target Aug (Owner: CFO)" },
        { text: "8. Reduce AI inference costs 30% — caching layer + model distillation (Owner: VP Eng)" },
      ],
      { position: "absolute", top: 105, left: 67, width: 1147, fontSize: pt(11) },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 15: Action Items (10 items)
// ---------------------------------------------------------------------------
const actionItemsSlide: PaperSlide = contentSlide(
  "10 action items from this QBR — owners and dates confirmed",
  [
    financialTable(
      ["#", "Action Item", "Owner", "Due Date", "Status"],
      [
        ["1", "Adjust AE compensation to 75th percentile", "VP Sales / CFO", "2026-07-15", "Not Started"],
        ["2", "Launch ABM program for top 50 accounts", "VP Marketing", "2026-07-22", "In Progress"],
        ["3", "Remediate SOC2 findings (4 items)", "CISO", "2026-07-31", "In Progress"],
        ["4", "Ship enterprise analytics module", "VP Product", "2026-09-01", "In Progress"],
        ["5", "Hire 2 strategic CSMs for enterprise", "VP CS", "2026-08-15", "Not Started"],
        ["6", "Prepare Series C data room", "CFO", "2026-08-31", "Not Started"],
        ["7", "Select investment bankers (shortlist 3)", "CEO", "2026-07-31", "In Progress"],
        ["8", "Launch Singapore pilot program", "VP International", "2026-09-30", "Planning"],
        ["9", "Deploy AI inference caching layer", "VP Eng", "2026-08-15", "In Progress"],
        ["10", "Conduct competitive pricing analysis", "Product Strategy", "2026-07-31", "Not Started"],
      ],
      { alternatingRows: true, columnWidths: [40, 400, 187, 133, 120], style: { top: 100, left: 40 } },
    ),
  ],
);
actionItemsSlide.notes = "Review action items bi-weekly; escalate blockers to exec team";

// ---------------------------------------------------------------------------
// Slide 16: Appendix — Supporting Data Tables
// ---------------------------------------------------------------------------
const appendixSlide: PaperSlide = contentSlide(
  "Appendix: Quarterly financial detail ($000s)",
  [
    financialTable(
      ["Line Item", "Q1'26 Actual", "Q2'26 Actual", "Q2'26 Budget", "Var $", "Var %", "H1 Total"],
      [
        ["Subscription Revenue", "12,600", "13,500", "12,800", "+700", "+5%", "26,100"],
        ["Services Revenue", "1,200", "1,300", "1,000", "+300", "+30%", "2,500"],
        ["Total Revenue", "13,800", "14,800", "13,800", "+1,000", "+7%", "28,600"],
        ["COGS", "2,900", "3,100", "3,000", "-100", "-3%", "6,000"],
        ["Gross Profit", "10,900", "11,700", "10,800", "+900", "+8%", "22,600"],
        ["GM%", "79%", "79%", "78%", "+1pp", "", "79%"],
        ["S&M", "4,000", "4,300", "4,500", "+200", "+4%", "8,300"],
        ["R&D", "3,300", "3,500", "3,600", "+100", "+3%", "6,800"],
        ["G&A", "1,100", "1,200", "1,200", "0", "0%", "2,300"],
        ["EBITDA", "2,500", "2,700", "1,500", "+1,200", "+80%", "5,200"],
        ["EBITDA%", "18%", "18%", "11%", "+7pp", "", "18%"],
      ],
      {
        alternatingRows: true,
        columnWidths: [200, 127, 127, 127, 100, 87, 127],
        style: { top: 100, left: 40 },
      },
    ),
  ],
  "Source: Internal finance, unaudited",
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const qbrDeck: PaperDocument = makeDoc(
  [
    titleSlide,                // 1
    execSummarySlide,          // 2
    financialDashboardSlide,   // 3
    revenueVsTargetSlide,      // 4
    pipelineFunnelSlide,       // 5
    okrSlide,                  // 6
    customerHealthSlide,       // 7
    competitiveSlide,          // 8
    productDeliverySlide,      // 9
    operationalMetricsSlide,   // 10
    teamHiringSlide,           // 11
    riskSlide,                 // 12
    challengesSlide,           // 13
    prioritiesSlide,           // 14
    actionItemsSlide,          // 15
    appendixSlide,             // 16
  ],
  { title: "Q2 2026 Quarterly Business Review" },
);
