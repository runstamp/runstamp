/**
 * T07: Company All-Hands Meeting — 20 slides
 * Full quarterly all-hands with CEO message, scorecard, department spotlights,
 * new hires, roadmap, culture, transparency, and appendix.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperView, PaperText,
  PaperImage, SlideBackground,
} from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, sectionDivider, contentSlide, kpiGrid, kpiTile,
  photoGrid, card, textNode, richText, bulletList, financialTable,
  accentBar, actionTitle, sourceFooter, connector, pt,
  LOGO_PLACEHOLDER, PHOTO_PLACEHOLDER, MBB_BLUE, MBB_NAVY, WHITE, OFF_WHITE,
  LIGHT_GRAY, MID_GRAY, DARK_GRAY, GREEN, RED, AMBER,
  DARK_GRADIENT, CONTENT_BG,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Title — Company All-Hands
// ---------------------------------------------------------------------------

const titleSlide: PaperSlide = mbbTitleSlide(
  "Company All-Hands",
  "Q4 2025 • December 15, 2025",
);

// ---------------------------------------------------------------------------
// Slide 2: Icebreaker — Fun Fact
// ---------------------------------------------------------------------------

const icebreakerBg: SlideBackground = {
  type: "gradient",
  angle: 135,
  stops: [
    { color: "#1E1B4B", position: 0 },
    { color: "#312E81", position: 100 },
  ],
};

const icebreakerSlide: PaperSlide = {
  type: "Slide",
  background: icebreakerBg,
  children: [
    textNode("Fun Fact", {
      position: "absolute", top: 160, left: 105, width: 1070,
      fontSize: pt(18), fontWeight: "bold", color: AMBER, textAlign: "center",
      letterSpacing: 3,
    }),
    textNode("Our team has collectively visited 47 countries this year", {
      position: "absolute", top: 240, left: 105, width: 1070,
      fontSize: pt(36), fontWeight: "bold", color: WHITE, textAlign: "center",
      lineHeight: 48,
    }),
    textNode("Share yours in #random!", {
      position: "absolute", top: 400, left: 105, width: 1070,
      fontSize: pt(16), color: MID_GRAY, textAlign: "center",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 3: CEO Message — Strategic Headline + 3 Key Themes
// ---------------------------------------------------------------------------

const ceoSlide: PaperSlide = contentSlide(
  "From the CEO: Building the next chapter of durable growth",
  [
    textNode("We closed our strongest quarter ever — but what excites me most is the foundation we've built for the years ahead.", {
      position: "absolute", top: 105, left: 55, width: 1170,
      fontSize: pt(16), color: DARK_GRAY, lineHeight: 22,
    }),
    card(
      [
        textNode("1. Customer Obsession", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 4 }),
        textNode("NPS reached 72 — a record high. Every team contributed to this outcome.", { fontSize: pt(11), color: DARK_GRAY }),
      ],
      { width: 360, height: 187, style: { position: "absolute", top: 200, left: 55 } },
    ),
    card(
      [
        textNode("2. Operational Excellence", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 4 }),
        textNode("Gross margin improved 400bps YoY while accelerating R&D investment.", { fontSize: pt(11), color: DARK_GRAY }),
      ],
      { width: 360, height: 187, style: { position: "absolute", top: 200, left: 453 } },
    ),
    card(
      [
        textNode("3. Talent Density", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 4 }),
        textNode("We grew headcount 40% while improving revenue per employee by 15%.", { fontSize: pt(11), color: DARK_GRAY }),
      ],
      { width: 360, height: 187, style: { position: "absolute", top: 200, left: 853 } },
    ),
  ],
  undefined,
  { notes: "Ask the CEO to deliver this slide live, reinforcing the three themes with personal anecdotes." },
);

// ---------------------------------------------------------------------------
// Slide 4: Milestone Celebration — "$10M ARR!"
// ---------------------------------------------------------------------------

const celebrationBg: SlideBackground = {
  type: "gradient",
  angle: 150,
  stops: [
    { color: "#111111", position: 0 },
    { color: "#1E1B4B", position: 50 },
    { color: "#312E81", position: 100 },
  ],
};

const milestoneSlide: PaperSlide = {
  type: "Slide",
  background: celebrationBg,
  children: [
    textNode("$10M ARR!", {
      position: "absolute", top: 187, left: 105, width: 1070,
      fontSize: pt(72), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("Crossed in November — 18 months ahead of plan", {
      position: "absolute", top: 333, left: 105, width: 1070,
      fontSize: pt(18), color: MID_GRAY, textAlign: "center",
    }),
    textNode("Thank you to every single person in this room.", {
      position: "absolute", top: 400, left: 105, width: 1070,
      fontSize: pt(16), color: AMBER, textAlign: "center",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 5: Scorecard — 6 KPI Tiles (2×3)
// ---------------------------------------------------------------------------

const scorecardSlide: PaperSlide = contentSlide(
  "Company scorecard shows broad-based strength across all key metrics",
  [
    kpiGrid([
      kpiTile("ARR", "$10.2M", "+68% YoY", { width: 360, trendColor: GREEN }),
      kpiTile("Customers", "342", "+45% YoY", { width: 360, trendColor: GREEN }),
      kpiTile("NPS", "72", "+8pts QoQ", { width: 360, trendColor: GREEN }),
      kpiTile("Headcount", "156", "+40% YoY", { width: 360 }),
      kpiTile("Net Revenue Retention", "118%", "+6pts YoY", { width: 360, trendColor: GREEN }),
      kpiTile("Gross Margin", "78%", "+4pts YoY", { width: 360, trendColor: GREEN }),
    ], 3),
  ],
  "Source: Finance & RevOps — Q4 2025",
  { notes: "Highlight that all six KPIs are green — this is the first quarter where every metric hit target." },
);

// ---------------------------------------------------------------------------
// Slide 6: Revenue Chart — Stacked Bar (8 quarters, 3 segments)
// ---------------------------------------------------------------------------

const revenueChart: PaperChart = {
  type: "Chart",
  style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
  chartData: {
    chartType: "bar",
    barGrouping: "stacked",
    categories: ["Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25"],
    series: [
      {
        name: "SaaS Subscriptions",
        values: [0.8, 1.0, 1.2, 1.5, 1.8, 2.1, 2.5, 3.0],
        color: MBB_BLUE,
      },
      {
        name: "Professional Services",
        values: [0.3, 0.3, 0.4, 0.5, 0.5, 0.6, 0.7, 0.8],
        color: "#0070C0",
      },
      {
        name: "Platform & Marketplace",
        values: [0.1, 0.1, 0.2, 0.2, 0.3, 0.4, 0.5, 0.7],
        color: "#60A5FA",
      },
    ],
    valueAxis: { numberFormat: "$#,##0.0M", title: "Revenue ($M)" },
    categoryAxis: { title: "Quarter" },
    legend: { position: "bottom" },
  },
};

const revenueSlide: PaperSlide = contentSlide(
  "Revenue mix shift toward higher-margin SaaS underscores platform scalability",
  [revenueChart],
  "Source: Finance — FY2024-2025 actuals",
);

// ---------------------------------------------------------------------------
// Slide 7: Customer Wins — 4 Deal Cards with Logos
// ---------------------------------------------------------------------------

function dealCard(
  company: string, deal: string, segment: string, left: number,
): PaperNode {
  return card(
    [
      {
        type: "Image",
        src: LOGO_PLACEHOLDER,
        style: { width: 80, height: 40, marginBottom: 8 },
      } as PaperImage,
      textNode(company, { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY }),
      textNode(deal, { fontSize: pt(18), fontWeight: "bold", color: GREEN, marginTop: 4 }),
      textNode(segment, { fontSize: pt(10), color: MID_GRAY, marginTop: 4 }),
    ],
    { width: 267, height: 213, style: { position: "absolute", top: 130, left } },
  );
}

const customerWinsSlide: PaperSlide = contentSlide(
  "Four marquee logos closed in Q4, validating enterprise readiness",
  [
    dealCard("Meridian Health", "$420K ACV", "Healthcare", 55),
    dealCard("Atlas Financial", "$385K ACV", "Financial Services", 347),
    dealCard("NovaTech Mfg", "$310K ACV", "Manufacturing", 640),
    dealCard("Pinnacle Retail", "$275K ACV", "Retail & CPG", 933),
  ],
  "Source: CRM — Q4 2025 closed-won",
);

// ---------------------------------------------------------------------------
// Slides 8-10: Department Spotlights — Sales / Product / Engineering
// ---------------------------------------------------------------------------

const salesChart: PaperChart = {
  type: "Chart",
  style: { position: "absolute", top: 120, left: 55, width: 600, height: 373 },
  chartData: {
    chartType: "bar",
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "New Business", values: [1.2, 1.5, 1.8, 2.4], color: MBB_BLUE },
      { name: "Expansion", values: [0.4, 0.6, 0.8, 1.2], color: "#60A5FA" },
    ],
    valueAxis: { numberFormat: "$#,##0.0M" },
    legend: { position: "bottom" },
  },
};

const salesSpotlight: PaperSlide = contentSlide(
  "Sales: Pipeline coverage at 4.2x signals strong Q1 momentum",
  [
    salesChart,
    bulletList(
      [
        { text: "Closed $8.6M in new ACV (+72% YoY)" },
        { text: "Average deal size up 35% to $185K" },
        { text: "Win rate improved from 22% to 28%" },
        { text: "Pipeline coverage at 4.2x for Q1'26" },
      ],
      { position: "absolute", top: 120, left: 693, width: 533, fontSize: pt(11), color: DARK_GRAY },
    ),
    {
      type: "View",
      style: { position: "absolute", top: 427, left: 693, width: 267, height: 120 },
      children: [kpiTile("Quota Attainment", "112%", "+18pts QoQ", { width: 267, height: 120 })],
    } as PaperView,
  ],
  "Source: CRM & RevOps — Q4 2025",
);

const productChart: PaperChart = {
  type: "Chart",
  style: { position: "absolute", top: 120, left: 55, width: 600, height: 373 },
  chartData: {
    chartType: "line",
    categories: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    series: [
      { name: "DAU", values: [12400, 14200, 15800, 18200, 21500, 24800], color: MBB_BLUE },
      { name: "WAU", values: [28600, 31400, 34200, 38900, 44100, 51200], color: "#60A5FA" },
    ],
    valueAxis: { numberFormat: "#,##0" },
    legend: { position: "bottom" },
  },
};

const productSpotlight: PaperSlide = contentSlide(
  "Product: DAU doubled in H2 as new collaboration features drove daily habit",
  [
    productChart,
    bulletList(
      [
        { text: "Shipped 42 features (vs. 28 in H1)" },
        { text: "Real-time collaboration launched — 68% adoption in 4 weeks" },
        { text: "P99 latency reduced from 320ms to 180ms" },
        { text: "Mobile app launched on iOS and Android" },
      ],
      { position: "absolute", top: 120, left: 693, width: 533, fontSize: pt(11), color: DARK_GRAY },
    ),
    {
      type: "View",
      style: { position: "absolute", top: 427, left: 693, width: 267, height: 120 },
      children: [kpiTile("Feature Adoption", "68%", "4-week avg", { width: 267, height: 120 })],
    } as PaperView,
  ],
  "Source: Product Analytics — H2 2025",
);

const engineeringChart: PaperChart = {
  type: "Chart",
  style: { position: "absolute", top: 120, left: 55, width: 600, height: 373 },
  chartData: {
    chartType: "bar",
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "Velocity (pts/sprint)", values: [82, 94, 108, 126], color: GREEN },
      { name: "Incidents (P1/P2)", values: [12, 8, 5, 3], color: RED },
    ],
    valueAxis: { numberFormat: "#,##0" },
    legend: { position: "bottom" },
  },
};

const engineeringSpotlight: PaperSlide = contentSlide(
  "Engineering: Velocity up 54% while P1 incidents dropped 75%",
  [
    engineeringChart,
    bulletList(
      [
        { text: "Migrated to Kubernetes — 99.99% uptime in Q4" },
        { text: "CI/CD pipeline reduced deploy time from 45min to 8min" },
        { text: "Test coverage increased from 72% to 91%" },
        { text: "Hired 18 engineers (4 staff+, 14 senior)" },
      ],
      { position: "absolute", top: 120, left: 693, width: 533, fontSize: pt(11), color: DARK_GRAY },
    ),
    {
      type: "View",
      style: { position: "absolute", top: 427, left: 693, width: 267, height: 120 },
      children: [kpiTile("Uptime", "99.99%", "Q4 avg", { width: 267, height: 120 })],
    } as PaperView,
  ],
  "Source: Engineering Ops — Q4 2025",
);

// ---------------------------------------------------------------------------
// Slide 11: New Hires — 12 Photo Grid (4×3)
// ---------------------------------------------------------------------------

const hireImages = Array.from({ length: 12 }, () => PHOTO_PLACEHOLDER);

const newHiresSlide: PaperSlide = contentSlide(
  "Welcome to the 24 new team members who joined in Q4",
  [
    photoGrid(hireImages, 4, { top: 105, left: 55, width: 1170, height: 480 }),
    textNode("Engineering (8) • Product (4) • Sales (5) • G&A (3) • Marketing (4)", {
      position: "absolute", top: 613, left: 55, width: 1170,
      fontSize: pt(11), color: MID_GRAY, textAlign: "center",
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 12: Promotions & Recognition — 4 Employee Spotlights
// ---------------------------------------------------------------------------

const promotions = [
  { name: "Priya Sharma", from: "Senior Engineer", to: "Staff Engineer", quote: "Led the Kubernetes migration that achieved 99.99% uptime." },
  { name: "James Walker", from: "AE", to: "Senior AE", quote: "Closed 3 of our top 5 deals including Meridian Health." },
  { name: "Sofia Martinez", from: "Product Manager", to: "Senior PM", quote: "Drove collaboration feature from concept to 68% adoption." },
  { name: "David Okafor", from: "CSM", to: "CS Team Lead", quote: "Grew book of business NRR from 108% to 124%." },
];

const promoCards: PaperNode[] = promotions.map((p, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return card(
    [
      {
        type: "Image",
        src: PHOTO_PLACEHOLDER,
        style: { width: 44, height: 44, borderRadius: 22 },
      } as PaperImage,
      textNode(p.name, { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginTop: 6 }),
      textNode(`${p.from} → ${p.to}`, { fontSize: pt(11), color: GREEN, marginTop: 2 }),
      textNode(`"${p.quote}"`, { fontSize: pt(10), color: DARK_GRAY, marginTop: 6, lineHeight: 13 }),
    ],
    {
      width: 547, height: 213,
      style: { position: "absolute", left: 55 + col * 600, top: 105 + row * 240 },
    },
  );
});

const promotionsSlide: PaperSlide = contentSlide(
  "Celebrating our Q4 promotions — growth fueled by impact",
  promoCards,
);

// ---------------------------------------------------------------------------
// Slide 13: Product Roadmap — Now / Next / Later
// ---------------------------------------------------------------------------

function roadmapColumn(
  title: string, subtitle: string, items: string[], left: number, accent: string,
): PaperNode {
  return card(
    [
      accentBar(accent, 0, 4),
      textNode(title, { fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY, marginTop: 10 }),
      textNode(subtitle, { fontSize: pt(10), color: MID_GRAY, marginTop: 2, marginBottom: 8 }),
      bulletList(
        items.map(t => ({ text: t })),
        { fontSize: pt(11), color: "#333333" },
      ),
    ],
    { width: 360, height: 453, style: { position: "absolute", top: 105, left } },
  );
}

const roadmapSlide: PaperSlide = contentSlide(
  "Product roadmap balances near-term wins with long-term platform bets",
  [
    roadmapColumn("Now", "Q1 2026", [
      "API v2 with GraphQL support",
      "SOC 2 Type II certification",
      "Advanced permissions engine",
      "Slack & Teams integrations",
    ], 55, GREEN),
    roadmapColumn("Next", "Q2 2026", [
      "Enterprise SSO & SCIM provisioning",
      "Multi-region deployment (EU, APAC)",
      "AI-powered anomaly detection",
      "Custom workflow builder",
    ], 453, AMBER),
    roadmapColumn("Later", "H2 2026", [
      "Embedded analytics marketplace",
      "Low-code extension framework",
      "Self-serve onboarding portal",
      "FedRAMP Moderate certification",
    ], 853, MBB_BLUE),
  ],
);

// ---------------------------------------------------------------------------
// Slide 14: Culture & Values — Mission, DEI Metrics, Events
// ---------------------------------------------------------------------------

const cultureSlide: PaperSlide = contentSlide(
  "Our culture metrics reflect an increasingly diverse and engaged team",
  [
    card(
      [
        textNode("Our Mission", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        textNode("Empower every organization to make better decisions through data clarity and collaboration.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 18,
        }),
      ],
      { width: 533, height: 133, style: { position: "absolute", top: 105, left: 55 } },
    ),
    card(
      [
        textNode("DEI Metrics", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Women in leadership: 42% (+6pts YoY)" },
            { text: "Underrepresented minorities: 34% (+4pts)" },
            { text: "Pay equity audit: 99.2% parity" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 533, height: 187, style: { position: "absolute", top: 105, left: 640 } },
    ),
    card(
      [
        textNode("Upcoming Events", { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Jan 15 — Company ski trip (Tahoe)" },
            { text: "Feb 1 — Hackathon Week" },
            { text: "Mar 10 — Annual offsite (Austin)" },
            { text: "Apr 22 — Earth Day volunteer day" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 187, style: { position: "absolute", top: 320, left: 55 } },
    ),
  ],
  "Source: People Ops — December 2025",
);

// ---------------------------------------------------------------------------
// Slide 15: Challenges & Transparency — 3 Headwinds
// ---------------------------------------------------------------------------

const challengesSlide: PaperSlide = contentSlide(
  "Three headwinds we must address to sustain growth trajectory",
  [
    card(
      [
        textNode("1. Enterprise Sales Cycle Length", { fontSize: pt(14), fontWeight: "bold", color: "#991B1B" }),
        textNode("Average enterprise cycle stretched from 68 to 92 days due to procurement complexity. Action: dedicated deal desk team starting Q1.", {
          fontSize: pt(11), color: DARK_GRAY, marginTop: 6, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 133, style: { position: "absolute", top: 105, left: 55 }, bg: "#FEF2F2" },
    ),
    card(
      [
        textNode("2. Engineering Hiring Velocity", { fontSize: pt(14), fontWeight: "bold", color: "#92400E" }),
        textNode("Time-to-fill for senior engineers is 58 days (target: 40). Action: expanding referral bonus to $15K and adding 2 sourcers.", {
          fontSize: pt(11), color: DARK_GRAY, marginTop: 6, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 133, style: { position: "absolute", top: 260, left: 55 }, bg: "#FFFBEB" },
    ),
    card(
      [
        textNode("3. International Expansion Readiness", { fontSize: pt(14), fontWeight: "bold", color: "#92400E" }),
        textNode("GDPR compliance complete but APAC data residency requirements need engineering investment. Action: Q2 sprint allocated for multi-region.", {
          fontSize: pt(11), color: DARK_GRAY, marginTop: 6, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 133, style: { position: "absolute", top: 413, left: 55 }, bg: "#FFFBEB" },
    ),
  ],
  undefined,
  { notes: "Be transparent about these challenges — the team appreciates honesty and wants to help solve them." },
);

// ---------------------------------------------------------------------------
// Slide 16: Looking Ahead — Next Quarter Priorities
// ---------------------------------------------------------------------------

const lookingAheadSlide: PaperSlide = contentSlide(
  "Q1 2026 priorities: close the gap on enterprise readiness and international",
  [
    card(
      [
        textNode("Revenue", { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE, marginBottom: 4 }),
        bulletList(
          [
            { text: "Hit $3.2M quarterly ARR target" },
            { text: "Close 2 Fortune 500 logos" },
            { text: "Launch partner channel program" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 360, height: 293, style: { position: "absolute", top: 105, left: 55 } },
    ),
    card(
      [
        textNode("Product", { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE, marginBottom: 4 }),
        bulletList(
          [
            { text: "Ship API v2 (GraphQL)" },
            { text: "Complete SOC 2 Type II audit" },
            { text: "Launch AI insights beta" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 360, height: 293, style: { position: "absolute", top: 105, left: 453 } },
    ),
    card(
      [
        textNode("People", { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE, marginBottom: 4 }),
        bulletList(
          [
            { text: "Hire 22 across eng + sales" },
            { text: "Launch manager training program" },
            { text: "Open London office" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 360, height: 293, style: { position: "absolute", top: 105, left: 853 } },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 17: Q&A — "Your Questions" Centered
// ---------------------------------------------------------------------------

const qaSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    textNode("Your Questions", {
      position: "absolute", top: 240, left: 105, width: 1070,
      fontSize: pt(36), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("Submit live at go/allhands-questions or raise your hand", {
      position: "absolute", top: 347, left: 105, width: 1070,
      fontSize: pt(16), color: MID_GRAY, textAlign: "center",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 18: Appendix — Financial Metrics Table
// ---------------------------------------------------------------------------

const financialAppendix: PaperSlide = contentSlide(
  "Appendix A: Detailed Financial Metrics",
  [
    financialTable(
      ["Metric", "Q1'25", "Q2'25", "Q3'25", "Q4'25", "FY2025"],
      [
        ["Total Revenue", "$1.7M", "$2.1M", "$2.6M", "$3.4M", "$9.8M"],
        ["SaaS Revenue", "$1.2M", "$1.5M", "$1.9M", "$2.5M", "$7.1M"],
        ["Services Revenue", "$0.5M", "$0.6M", "$0.7M", "$0.9M", "$2.7M"],
        ["Gross Margin", "74%", "75%", "77%", "78%", "76%"],
        ["CAC Payback (mo)", "18", "16", "15", "14", "14"],
        ["LTV:CAC", "3.8x", "4.1x", "4.4x", "4.8x", "4.8x"],
        ["Burn Multiple", "2.1x", "1.8x", "1.5x", "1.2x", "1.6x"],
        ["Cash ($M)", "$18.2", "$16.4", "$15.1", "$14.8", "$14.8"],
      ],
      { alternatingRows: true },
    ),
  ],
  "Source: Finance — Unaudited FY2025",
);

// ---------------------------------------------------------------------------
// Slide 19: Appendix — Hiring Plan Table
// ---------------------------------------------------------------------------

const hiringAppendix: PaperSlide = contentSlide(
  "Appendix B: Q1 2026 Hiring Plan by Department",
  [
    financialTable(
      ["Department", "Current HC", "Q1 Target", "Open Reqs", "Priority Roles"],
      [
        ["Engineering", "62", "74", "12", "Staff Eng (2), Backend (4), Infra (3), QA (3)"],
        ["Sales", "28", "34", "6", "Enterprise AE (3), SDR (2), SE (1)"],
        ["Product", "14", "17", "3", "Senior PM (1), Designer (1), Analyst (1)"],
        ["Marketing", "12", "14", "2", "Growth (1), Content (1)"],
        ["Customer Success", "18", "21", "3", "Enterprise CSM (2), Onboarding (1)"],
        ["G&A", "22", "24", "2", "Controller (1), Recruiter (1)"],
        ["Total", "156", "184", "28", ""],
      ],
      { alternatingRows: true },
    ),
  ],
  "Source: People Ops — Approved Q1 2026 plan",
);

// ---------------------------------------------------------------------------
// Slide 20: Appendix — Competitive Update
// ---------------------------------------------------------------------------

const competitiveAppendix: PaperSlide = contentSlide(
  "Appendix C: Competitive landscape favors our platform approach",
  [
    financialTable(
      ["Capability", "Us", "Competitor A", "Competitor B", "Competitor C"],
      [
        ["Real-time Collaboration", "✓", "✓", "✗", "◐"],
        ["Enterprise SSO/SCIM", "Q1'26", "✓", "✓", "✗"],
        ["API-first Architecture", "✓", "◐", "✓", "✗"],
        ["Multi-region", "Q2'26", "✓", "✗", "✗"],
        ["AI/ML Insights", "Beta", "✗", "✗", "✓"],
        ["Mobile App", "✓", "✓", "◐", "✗"],
        ["SOC 2 Type II", "Q1'26", "✓", "✓", "✗"],
        ["Pricing (per seat)", "$45", "$65", "$55", "$40"],
      ],
      {
        alternatingRows: true,
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Market Comparison", colSpan: 4 },
        ],
      },
    ),
  ],
  "Source: Competitive Intel — December 2025",
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const allHandsDeck: PaperDocument = makeDoc(
  [
    titleSlide,           // 1
    icebreakerSlide,      // 2
    ceoSlide,             // 3
    milestoneSlide,       // 4
    scorecardSlide,       // 5
    revenueSlide,         // 6
    customerWinsSlide,    // 7
    salesSpotlight,       // 8
    productSpotlight,     // 9
    engineeringSpotlight, // 10
    newHiresSlide,        // 11
    promotionsSlide,      // 12
    roadmapSlide,         // 13
    cultureSlide,         // 14
    challengesSlide,      // 15
    lookingAheadSlide,    // 16
    qaSlide,              // 17
    financialAppendix,    // 18
    hiringAppendix,       // 19
    competitiveAppendix,  // 20
  ],
  { title: "Company All-Hands — Q4 2025" },
);
