/**
 * T09: Annual Report Deck (16 slides)
 * Full annual report: cover, year-in-review, CEO letter, financials, market position,
 * geographic footprint, strategy, products, people, sustainability, forward guidance,
 * thank you, and appendix.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperTable, PaperText,
  PaperView, PaperImage, PaperGroup, Paragraph, TableRow,
} from "../../../src/types/ast.js";
import {
  makeDoc, contentSlide, mbbTitleSlide, textNode, richText, kpiTile, kpiGrid,
  card, photoGrid, bulletList, accentBar, actionTitle, sourceFooter, financialTable, pt,
  MBB_NAVY, MBB_BLUE, WHITE, OFF_WHITE, LIGHT_GRAY, MID_GRAY, DARK_GRAY,
  GREEN, RED, AMBER, DARK_GRADIENT, CONTENT_BG, PHOTO_PLACEHOLDER, SCREENSHOT_PLACEHOLDER, TABLE_ALT_ROW,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Cover
// ---------------------------------------------------------------------------
const coverSlide: PaperSlide = {
  type: "Slide",
  background: { type: "image", src: SCREENSHOT_PLACEHOLDER },
  children: [
    // Dark overlay
    {
      type: "View",
      style: {
        position: "absolute", top: 0, left: 0, width: 1280, height: 720,
        backgroundColor: "#000000", opacity: 0.55,
      },
    } as PaperView,
    accentBar(MBB_BLUE),
    textNode("2025 Annual Report", {
      position: "absolute", top: 240, left: 105, width: 1065,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    textNode("Accelion Technologies, Inc.", {
      position: "absolute", top: 333, left: 105, width: 800,
      fontSize: pt(18), color: "#C0C0C0",
    }),
    textNode("Fiscal Year Ended December 31, 2025", {
      position: "absolute", top: 387, left: 105, width: 800,
      fontSize: pt(16), color: MID_GRAY,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 2: Year-in-Review — 5 headline achievement tiles
// ---------------------------------------------------------------------------
const yearInReviewSlide: PaperSlide = contentSlide(
  "Year in Review: Key Achievements",
  [
    kpiGrid([
      kpiTile("Revenue", "$255M", "+21% YoY", { width: 220 }),
      kpiTile("Customers", "3,200+", "+28% YoY", { width: 220 }),
      kpiTile("NPS", "74", "+6 pts", { width: 220 }),
      kpiTile("Markets", "42 Countries", "+8 new", { width: 220 }),
      kpiTile("Employees", "1,850", "+32% YoY", { width: 220 }),
    ], 5),
  ],
  "Source: FY2025 Audited Results",
  { notes: "Each KPI represents a record high — emphasize that growth was broad-based across all dimensions." },
);

// ---------------------------------------------------------------------------
// Slide 3: CEO Letter
// ---------------------------------------------------------------------------
const ceoLetterSlide: PaperSlide = {
  type: "Slide",
  background: CONTENT_BG,
  children: [
    accentBar(MBB_BLUE),
    actionTitle("Letter from Our CEO"),
    // CEO Photo
    {
      type: "Image",
      src: PHOTO_PLACEHOLDER,
      style: {
        position: "absolute", top: 105, left: 933, width: 267, height: 333,
        borderRadius: 8,
      },
    } as PaperImage,
    // Letter body
    {
      type: "Text",
      style: {
        fontFamily: "Arial", position: "absolute", top: 105, left: 55, width: 853, height: 533,
        fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.6,
      },
      paragraphs: [
        { runs: [{ text: "Dear Shareholders,", style: { fontSize: pt(11), fontWeight: "bold" } }], spaceBefore: 0 },
        { runs: [{ text: "Fiscal year 2025 marks a transformative chapter for Accelion Technologies. We achieved $255 million in revenue, representing 21% year-over-year growth, while simultaneously expanding into eight new international markets. Our strategic investments in AI-native product capabilities and enterprise-grade security positioned us as a leader in the rapidly evolving cloud platform landscape.", style: { fontSize: pt(11) } }], spaceBefore: 8 },
        { runs: [{ text: "Our customer base grew to over 3,200 organizations spanning financial services, healthcare, technology, and manufacturing verticals. The launch of our Intelligent Automation Suite in Q2 drove a 45% increase in enterprise deal sizes, while our platform processed over 2.8 billion API calls daily with 99.97% uptime — a testament to our engineering team's relentless focus on reliability.", style: { fontSize: pt(11) } }], spaceBefore: 8 },
        { runs: [{ text: "We also made significant progress on our sustainability commitments. Our operations are now 100% powered by renewable energy, and we reduced our carbon intensity per revenue dollar by 38%. Our diversity metrics improved across all dimensions, with women now representing 42% of our global workforce and 35% of leadership roles.", style: { fontSize: pt(11) } }], spaceBefore: 8 },
        { runs: [{ text: "Looking ahead, we see tremendous opportunity in the convergence of AI, automation, and enterprise software. Our $85 million R&D investment in 2025 — the largest in our history — positions us to capture the estimated $12 billion addressable market by 2028. We remain committed to delivering exceptional value for our customers, employees, and shareholders.", style: { fontSize: pt(11) } }], spaceBefore: 8 },
        { runs: [{ text: "With gratitude,", style: { fontSize: pt(11) } }], spaceBefore: 12 },
        { runs: [{ text: "Sarah Chen", style: { fontSize: pt(11), fontWeight: "bold" } }, { text: "\nChief Executive Officer", style: { fontSize: pt(9), color: MID_GRAY } }], spaceBefore: 4 },
      ],
    } as PaperText,
  ],
};

// ---------------------------------------------------------------------------
// Slide 4: Revenue Performance — Combo chart (bars + line)
// ---------------------------------------------------------------------------
const revenueComboSlide: PaperSlide = contentSlide(
  "Revenue Performance: 5-Year Trajectory",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "bar",
        series: [
          { name: "Revenue ($M)", values: [120, 145, 178, 210, 255], color: MBB_BLUE },
          { name: "Growth Rate (%)", values: [18, 21, 23, 18, 21], color: "#FF6600", overrideType: "line", targetAxis: "secondary" },
        ],
        categories: ["FY21", "FY22", "FY23", "FY24", "FY25"],
        valueAxis: { numberFormat: "$#,##0", title: "Revenue ($M)" },
        secondaryValueAxis: { numberFormat: "0%", title: "YoY Growth" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
  ],
  "Source: Audited Financial Statements FY21–FY25",
  { notes: "Note the consistent 18-23% growth rate over five years, demonstrating durable compounding." },
);

// ---------------------------------------------------------------------------
// Slide 5: P&L Bridge — Waterfall
// ---------------------------------------------------------------------------
const waterfallSlide: PaperSlide = contentSlide(
  "Profitability Bridge: Revenue to Net Income",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "waterfall",
        waterfallData: {
          categories: [
            "Revenue", "COGS", "Gross Profit",
            "R&D", "Sales & Marketing", "G&A",
            "EBITDA", "D&A", "Interest", "Tax",
            "Net Income",
          ],
          values: [255, -82, 173, -85, -38, -18, 32, -14, -3, -4, 11],
          totalIndices: [2, 6, 10],
          increaseColor: GREEN,
          decreaseColor: RED,
          totalColor: MBB_BLUE,
          connectorLines: true,
        },
        valueAxis: { numberFormat: "$#,##0M", title: "$ Millions" },
        legend: { position: "none" },
      },
    } as PaperChart,
  ],
  "Source: FY2025 Consolidated P&L",
);

// ---------------------------------------------------------------------------
// Slide 6: Segment Breakdown — Treemap (8 segments, 2 hierarchy levels)
// ---------------------------------------------------------------------------
const treemapSlide: PaperSlide = contentSlide(
  "Revenue by Segment",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "treemap",
        treemapData: {
          categories: [
            {
              name: "Platform",
              children: [
                { name: "SaaS Subscriptions", value: 92 },
                { name: "Usage-Based", value: 38 },
                { name: "Marketplace", value: 15 },
              ],
            },
            {
              name: "Services",
              children: [
                { name: "Professional Services", value: 42 },
                { name: "Managed Services", value: 28 },
              ],
            },
            {
              name: "Ecosystem",
              children: [
                { name: "Partner Licensing", value: 22 },
                { name: "Training & Certification", value: 12 },
                { name: "Support Contracts", value: 6 },
              ],
            },
          ],
        },
      },
    } as PaperChart,
  ],
  "Source: Segment Reporting, FY2025",
);

// ---------------------------------------------------------------------------
// Slide 7: Market Position — Pie chart (market share)
// ---------------------------------------------------------------------------
const marketShareSlide: PaperSlide = contentSlide(
  "Market Position: Enterprise Cloud Platform",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 187, width: 907, height: 507 },
      chartData: {
        chartType: "pie",
        categories: ["Accelion", "CompetitorA", "CompetitorB", "CompetitorC", "Others"],
        series: [{
          name: "Market Share",
          values: [18.5, 24.2, 15.8, 12.1, 29.4],
          pointColors: [MBB_BLUE, "#888888", "#666666", "#C0C0C0", "#E0E0E0"],
        }],
        dataLabels: { showVal: true, showCatName: true, position: "outEnd", fontSize: pt(11) },
        legend: { position: "bottom" },
      },
    } as PaperChart,
    textNode("Total Addressable Market: $8.4B (2025)", {
      position: "absolute", bottom: 40, left: 55,
      fontSize: pt(11), color: MID_GRAY, fontStyle: "italic",
    }),
  ],
  "Source: Gartner Magic Quadrant 2025",
);

// ---------------------------------------------------------------------------
// Slide 8: Revenue by Region — Stacked area chart
// ---------------------------------------------------------------------------
const stackedAreaSlide: PaperSlide = contentSlide(
  "Revenue by Region: 5-Year Trend",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "area",
        areaGrouping: "stacked",
        categories: ["FY21", "FY22", "FY23", "FY24", "FY25"],
        series: [
          { name: "North America", values: [62, 72, 86, 102, 118], color: "#003DA5" },
          { name: "Europe", values: [28, 35, 44, 52, 68], color: "#0070C0" },
          { name: "Asia-Pacific", values: [18, 24, 32, 38, 48], color: "#00B050" },
          { name: "Rest of World", values: [12, 14, 16, 18, 21], color: "#FFC000" },
        ],
        valueAxis: { numberFormat: "$#,##0M", title: "Revenue ($M)" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
  ],
  "Source: Regional P&L Reports FY21–FY25",
);

// ---------------------------------------------------------------------------
// Slide 9: Geographic Footprint — World map + location markers
// ---------------------------------------------------------------------------
const locationMarkers: { city: string; x: number; y: number }[] = [
  { city: "San Francisco", x: 160, y: 260 },
  { city: "New York", x: 293, y: 247 },
  { city: "Toronto", x: 280, y: 220 },
  { city: "São Paulo", x: 360, y: 453 },
  { city: "London", x: 573, y: 213 },
  { city: "Frankfurt", x: 620, y: 220 },
  { city: "Dubai", x: 733, y: 300 },
  { city: "Mumbai", x: 787, y: 333 },
  { city: "Singapore", x: 867, y: 387 },
  { city: "Tokyo", x: 987, y: 260 },
  { city: "Sydney", x: 1000, y: 493 },
  { city: "Seoul", x: 960, y: 260 },
  { city: "Stockholm", x: 613, y: 180 },
  { city: "Lagos", x: 593, y: 367 },
  { city: "Mexico City", x: 207, y: 327 },
];

const geoSlide: PaperSlide = {
  type: "Slide",
  background: CONTENT_BG,
  children: [
    accentBar(MBB_BLUE),
    actionTitle("Global Footprint: 42 Countries, 15 Offices"),
    // World map placeholder
    {
      type: "Image",
      src: SCREENSHOT_PLACEHOLDER,
      style: { position: "absolute", top: 93, left: 55, width: 1170, height: 560, opacity: 0.15 },
    } as PaperImage,
    // Location markers (dots + labels)
    ...locationMarkers.map((loc) => ({
      type: "View",
      style: {
        position: "absolute", top: loc.y, left: loc.x,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: MBB_BLUE,
      },
    } as PaperView)),
    ...locationMarkers.filter((_, i) => i % 2 === 0).map((loc) =>
      textNode(loc.city, {
        position: "absolute", top: loc.y - 14, left: loc.x - 10,
        fontSize: pt(9), color: MBB_NAVY, fontWeight: "bold",
      }),
    ),
    sourceFooter("Offices as of December 31, 2025"),
  ],
};

// ---------------------------------------------------------------------------
// Slide 10: Strategic Achievements — SWOT 2×2 matrix (colored cells)
// ---------------------------------------------------------------------------
const swotTable: PaperTable = {
  type: "Table",
  style: { position: "absolute", top: 105, left: 80, width: 1120 },
  tableData: {
    columns: [560, 560],
    rows: [
      {
        height: 253,
        cells: [
          {
            text: "Strengths\n• Market-leading NPS of 74\n• Proprietary AI/ML platform (12 patents)\n• 99.97% uptime SLA\n• 3,200+ enterprise customers\n• $85M annual R&D investment",
            style: { fill: "#E6F4EA", color: "#1B5E20", fontSize: pt(11), fontWeight: "bold", padding: 16, verticalAlign: "top" },
          },
          {
            text: "Weaknesses\n• High customer acquisition cost ($18K)\n• Limited presence in DACH region\n• Legacy monolith migration (18mo remaining)\n• Thin partner ecosystem vs. competitors\n• Single cloud provider dependency",
            style: { fill: "#FDECEA", color: "#B71C1C", fontSize: pt(11), fontWeight: "bold", padding: 16, verticalAlign: "top" },
          },
        ],
      },
      {
        height: 253,
        cells: [
          {
            text: "Opportunities\n• TAM expanding to $12B by 2028\n• AI-native automation suite\n• FedRAMP certification (Q3 2026)\n• Vertical-specific solutions (HealthTech, FinTech)\n• Strategic M&A pipeline ($150M warchest)",
            style: { fill: "#E3F2FD", color: "#0D47A1", fontSize: pt(11), fontWeight: "bold", padding: 16, verticalAlign: "top" },
          },
          {
            text: "Threats\n• Aggressive pricing from CompetitorA\n• EU AI Act compliance requirements\n• Talent competition for ML engineers\n• Open-source alternatives maturing\n• Macro slowdown in enterprise IT spend",
            style: { fill: "#FFF8E1", color: "#E65100", fontSize: pt(11), fontWeight: "bold", padding: 16, verticalAlign: "top" },
          },
        ],
      },
    ],
  },
};

const swotSlide: PaperSlide = contentSlide("Strategic Position: SWOT Analysis", [swotTable]);

// ---------------------------------------------------------------------------
// Slide 11: Product Portfolio — 6 product cards in 2×3 grid
// ---------------------------------------------------------------------------
const products = [
  { name: "CloudCore Platform", desc: "Enterprise infrastructure orchestration", icon: "☁️", revenue: "$92M" },
  { name: "DataFlow Analytics", desc: "Real-time data pipeline & BI", icon: "📊", revenue: "$42M" },
  { name: "SecureShield", desc: "Zero-trust security & compliance", icon: "🛡️", revenue: "$38M" },
  { name: "AutomateIQ", desc: "AI-powered workflow automation", icon: "⚡", revenue: "$35M" },
  { name: "ConnectHub", desc: "Integration & API management", icon: "🔗", revenue: "$28M" },
  { name: "DevOps Suite", desc: "CI/CD and developer tooling", icon: "🔧", revenue: "$20M" },
];

const productCards: PaperNode[] = products.map((p, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return card(
    [
      textNode(p.name, { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 4 }),
      textNode(p.desc, { fontSize: pt(10), color: DARK_GRAY, marginBottom: 8 }),
      textNode(p.revenue, { fontSize: pt(18), fontWeight: "bold", color: MBB_BLUE }),
    ],
    {
      width: 360, height: 173,
      style: { position: "absolute", left: 55 + col * 393, top: 113 + row * 207 },
    },
  );
});

const productSlide: PaperSlide = contentSlide(
  "Product Portfolio: FY2025 Revenue Contribution",
  productCards,
  "Source: Product P&L Reports",
);

// ---------------------------------------------------------------------------
// Slide 12: People & Culture — Donut chart + diversity bar chart
// ---------------------------------------------------------------------------
const peopleCultureSlide: PaperSlide = contentSlide(
  "People & Culture",
  [
    // Donut: Headcount by department
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 533, height: 480 },
      chartData: {
        chartType: "doughnut",
        holeSize: 60,
        categories: ["Engineering", "Sales & Marketing", "Customer Success", "G&A", "Product", "People Ops"],
        series: [{
          name: "Headcount",
          values: [680, 420, 310, 185, 155, 100],
          pointColors: ["#003DA5", "#0070C0", "#00B050", "#FFC000", "#FF6600", "#C00000"],
        }],
        dataLabels: { showVal: true, showCatName: true, fontSize: pt(9) },
        legend: { position: "none" },
      },
    } as PaperChart,
    // Diversity bar chart
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 640, width: 587, height: 480 },
      chartData: {
        chartType: "bar",
        barDirection: "bar",
        categories: ["Women in Workforce", "Women in Leadership", "Underrepresented Minorities", "Veterans", "Employees with Disabilities"],
        series: [{
          name: "Percentage",
          values: [42, 35, 28, 6, 8],
          pointColors: ["#003DA5", "#0070C0", "#00B050", "#FFC000", "#FF6600"],
        }],
        valueAxis: { numberFormat: "0%", max: 50 },
        legend: { position: "none" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(9) },
      },
    } as PaperChart,
    textNode("Total Headcount: 1,850 | 42 Countries | 28 Languages", {
      position: "absolute", bottom: 33, left: 55,
      fontSize: pt(11), color: MID_GRAY,
    }),
  ],
  "Source: People Operations — December 2025",
);

// ---------------------------------------------------------------------------
// Slide 13: Sustainability — 3 ESG metrics with trend lines
// ---------------------------------------------------------------------------
const esgMetrics = [
  { label: "Carbon Intensity", unit: "tCO₂e/$M Rev", data: [48, 42, 35, 28, 18], color: GREEN, target: "Net Zero by 2030" },
  { label: "Renewable Energy", unit: "% of Operations", data: [60, 72, 85, 94, 100], color: "#0070C0", target: "100% Achieved" },
  { label: "Water Usage", unit: "ML per Employee", data: [3.2, 2.8, 2.4, 2.1, 1.7], color: "#00B0D0", target: "1.0 ML by 2028" },
];

const sustainabilitySlide: PaperSlide = contentSlide(
  "Environmental, Social & Governance",
  [
    ...esgMetrics.map((m, i) => ({
      type: "Chart",
      style: { position: "absolute", top: 113, left: 55 + i * 400, width: 367, height: 267 },
      chartData: {
        chartType: "line",
        categories: ["FY21", "FY22", "FY23", "FY24", "FY25"],
        series: [{ name: m.label, values: m.data, color: m.color }],
        valueAxis: { title: m.unit, numberFormat: "#,##0.0" },
        legend: { position: "none" },
        dataLabels: { showVal: true, fontSize: pt(9) },
      },
    } as PaperChart)),
    // Target labels
    ...esgMetrics.map((m, i) =>
      textNode(`Target: ${m.target}`, {
        position: "absolute", top: 400, left: 55 + i * 400, width: 367,
        fontSize: pt(10), color: DARK_GRAY, textAlign: "center", fontWeight: "bold",
      }),
    ),
  ],
  "Source: ESG Report FY2025 — Verified by Deloitte",
);

// ---------------------------------------------------------------------------
// Slide 14: Forward Guidance — Projected revenue bar + strategic priorities
// ---------------------------------------------------------------------------
const forwardGuidanceSlide: PaperSlide = contentSlide(
  "FY2026 Forward Guidance",
  [
    // Projected revenue chart
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 667, height: 453 },
      chartData: {
        chartType: "bar",
        categories: ["FY24 Actual", "FY25 Actual", "FY26 Low", "FY26 Mid", "FY26 High"],
        series: [{
          name: "Revenue ($M)",
          values: [210, 255, 295, 315, 340],
          pointColors: [MID_GRAY, MBB_BLUE, "#93C5FD", "#3B82F6", "#1D4ED8"],
        }],
        valueAxis: { numberFormat: "$#,##0", title: "Revenue ($M)" },
        legend: { position: "none" },
        dataLabels: { showVal: true, position: "outEnd", fontSize: pt(11) },
      },
    } as PaperChart,
    // Strategic priorities
    card(
      [
        textNode("Strategic Priorities", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 8 }),
        bulletList([
          { text: "AI-native product suite expansion" },
          { text: "FedRAMP High authorization" },
          { text: "APAC go-to-market acceleration" },
          { text: "Strategic acquisitions (2–3 targets)" },
          { text: "Operating margin improvement to 15%" },
        ], { fontSize: pt(11), color: DARK_GRAY }),
      ],
      {
        width: 453, height: 453,
        style: { position: "absolute", top: 105, left: 760 },
      },
    ),
  ],
  "Source: Management Guidance — Board Approved February 2026",
  { notes: "The midpoint scenario of $315M assumes 24% growth; discuss key assumptions around APAC expansion and AI suite adoption." },
);

// ---------------------------------------------------------------------------
// Slide 15: Thank You — Board of Directors
// ---------------------------------------------------------------------------
const boardMembers = [
  { name: "Sarah Chen", role: "CEO & Chair" },
  { name: "Dr. James Whitfield", role: "Lead Independent Director" },
  { name: "Maria Gonzalez", role: "Audit Committee Chair" },
  { name: "Robert Nakamura", role: "Compensation Committee Chair" },
  { name: "Dr. Aisha Patel", role: "Technology Committee Chair" },
  { name: "Thomas Bergström", role: "Governance Committee Chair" },
  { name: "Linda Chow", role: "Independent Director" },
  { name: "Michael O'Brien", role: "Independent Director" },
];

const thankYouSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    textNode("Thank You", {
      position: "absolute", top: 80, left: 105, width: 1065,
      fontSize: pt(36), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("Board of Directors", {
      position: "absolute", top: 153, left: 105, width: 1065,
      fontSize: pt(16), color: MID_GRAY, textAlign: "center",
    }),
    // Board member list (2 columns)
    ...boardMembers.map((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return {
        type: "View",
        style: {
          position: "absolute",
          left: 160 + col * 507,
          top: 220 + row * 107,
          width: 453, height: 80,
          flexDirection: "column",
          justifyContent: "center",
        },
        children: [
          textNode(m.name, { fontSize: pt(16), fontWeight: "bold", color: WHITE }),
          textNode(m.role, { fontSize: pt(11), color: MID_GRAY, marginTop: 2 }),
        ],
      } as PaperView;
    }),
    textNode("ir@accelion.com  |  accelion.com/investors", {
      position: "absolute", bottom: 40, left: 105, width: 1065,
      fontSize: pt(11), color: MID_GRAY, textAlign: "center",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 16: Appendix — Detailed Financial Statements (IS, BS, CF)
// ---------------------------------------------------------------------------

// Income Statement
const incomeStatementTable = financialTable(
  ["", "FY2025", "FY2024", "FY2023"],
  [
    ["Revenue", "$255.0M", "$210.0M", "$178.0M"],
    ["Cost of Revenue", "($82.0M)", "($69.3M)", "($60.5M)"],
    ["Gross Profit", "$173.0M", "$140.7M", "$117.5M"],
    ["R&D Expense", "($85.0M)", "($67.2M)", "($55.1M)"],
    ["Sales & Marketing", "($38.0M)", "($33.6M)", "($29.5M)"],
    ["General & Admin", "($18.0M)", "($14.7M)", "($12.8M)"],
    ["EBITDA", "$32.0M", "$25.2M", "$20.1M"],
    ["Net Income", "$11.0M", "$8.4M", "$5.8M"],
  ],
  {
    columnWidths: [293, 147, 147, 147],
    alternatingRows: true,
    style: { position: "absolute", top: 105, left: 55 },
  },
);

// Balance Sheet (summary)
const balanceSheetTable = financialTable(
  ["", "FY2025", "FY2024"],
  [
    ["Cash & Equivalents", "$192M", "$148M"],
    ["Accounts Receivable", "$58M", "$46M"],
    ["Total Current Assets", "$285M", "$224M"],
    ["Total Assets", "$520M", "$412M"],
    ["Total Current Liabilities", "$95M", "$78M"],
    ["Total Liabilities", "$185M", "$152M"],
    ["Shareholders' Equity", "$335M", "$260M"],
  ],
  {
    columnWidths: [240, 120, 120],
    alternatingRows: true,
    style: { position: "absolute", top: 105, left: 680 },
  },
);

// Cash Flow (summary — placed below income statement)
const cashFlowTable = financialTable(
  ["Cash Flows", "FY2025", "FY2024"],
  [
    ["Operating Activities", "$68M", "$52M"],
    ["Investing Activities", "($35M)", "($28M)"],
    ["Financing Activities", "$11M", "$8M"],
    ["Net Change in Cash", "$44M", "$32M"],
  ],
  {
    columnWidths: [293, 147, 147],
    alternatingRows: true,
    style: { position: "absolute", top: 460, left: 55 },
  },
);

const appendixSlide: PaperSlide = {
  type: "Slide",
  background: CONTENT_BG,
  children: [
    accentBar(MBB_BLUE),
    actionTitle("Appendix: Consolidated Financial Statements"),
    incomeStatementTable,
    balanceSheetTable,
    cashFlowTable,
    sourceFooter("All figures audited by PricewaterhouseCoopers LLP"),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const annualReportDeck: PaperDocument = makeDoc(
  [
    coverSlide,             // 1
    yearInReviewSlide,      // 2
    ceoLetterSlide,         // 3
    revenueComboSlide,      // 4
    waterfallSlide,         // 5
    treemapSlide,           // 6
    marketShareSlide,       // 7
    stackedAreaSlide,       // 8
    geoSlide,               // 9
    swotSlide,              // 10
    productSlide,           // 11
    peopleCultureSlide,     // 12
    sustainabilitySlide,    // 13
    forwardGuidanceSlide,   // 14
    thankYouSlide,          // 15
    appendixSlide,          // 16
  ],
  { title: "Accelion Technologies — 2025 Annual Report" },
);
