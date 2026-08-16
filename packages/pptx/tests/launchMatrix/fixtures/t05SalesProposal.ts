/**
 * T5: Sales Proposal — 14 slides
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperView, PaperImage,
  PaperConnector, SlideBackground,
} from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, contentSlide, photoGrid, financialTable,
  card, textNode, bulletList, accentBar, kpiTile, kpiGrid,
  connector, sourceFooter, actionTitle, ganttTimeline, pt,
  MBB_BLUE, MBB_NAVY, WHITE, OFF_WHITE,
  LOGO_PLACEHOLDER, SCREENSHOT_PLACEHOLDER,
  LIGHT_GRAY, MID_GRAY, DARK_GRAY, GREEN, RED, AMBER,
  DARK_GRADIENT, CONTENT_BG, MBB_DARK_BG,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Cover — Company name, tagline, prospect logo
// ---------------------------------------------------------------------------

const coverSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    textNode("Acme Solutions", {
      position: "absolute", top: 187, left: 80, width: 800,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    textNode("Accelerating Digital Transformation for Enterprise", {
      position: "absolute", top: 267, left: 80, width: 933,
      fontSize: pt(18), color: MID_GRAY,
    }),
    textNode("Prepared for GlobalCorp  •  March 2026", {
      position: "absolute", top: 320, left: 80, width: 667,
      fontSize: pt(14), color: MID_GRAY,
    }),
    // Prospect logo placeholder
    {
      type: "Image",
      src: LOGO_PLACEHOLDER,
      style: {
        position: "absolute", top: 213, left: 1013,
        width: 187, height: 107,
      },
    } as PaperImage,
  ],
};

// ---------------------------------------------------------------------------
// Slide 2: Market Shift — Large statistic, 2-sentence context, dark bg
// ---------------------------------------------------------------------------

const marketShiftSlide: PaperSlide = {
  type: "Slide",
  background: { type: "solid", color: MBB_DARK_BG },
  children: [
    accentBar(MBB_BLUE),
    textNode("73%", {
      position: "absolute", top: 160, left: 105, width: 1067,
      fontSize: pt(48), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("of enterprises will adopt AI-driven workflows by 2027", {
      position: "absolute", top: 267, left: 160, width: 960,
      fontSize: pt(22), color: "#888888", textAlign: "center",
    }),
    textNode(
      "The market is shifting from manual processes to intelligent automation at an unprecedented pace. " +
      "Organizations that fail to adapt risk losing competitive advantage within 18 months.",
      {
        position: "absolute", top: 347, left: 187, width: 907,
        fontSize: pt(14), color: "#666666", textAlign: "center", lineHeight: 1.6,
      },
    ),
    sourceFooter("Source: Gartner Technology Trends 2026"),
  ],
};

// ---------------------------------------------------------------------------
// Slide 3: The Problem — 3 pain points with descriptions
// ---------------------------------------------------------------------------

function painPointCard(
  icon: string, title: string, description: string, left: number,
): PaperNode {
  return card(
    [
      textNode(icon, {
        fontSize: pt(28), textAlign: "center", marginBottom: 11,
      }),
      textNode(title, {
        fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY,
        textAlign: "center", marginBottom: 11,
      }),
      textNode(description, {
        fontSize: pt(11), color: DARK_GRAY, textAlign: "center", lineHeight: 1.5,
      }),
    ],
    {
      width: 347, height: 293,
      style: { position: "absolute", top: 133, left },
    },
  );
}

const problemSlide: PaperSlide = contentSlide(
  "Your teams are spending too much time on low-value work",
  [
    painPointCard(
      "⏱", "Manual Processes",
      "Teams spend 60% of their time on repetitive data entry and reconciliation across siloed systems.",
      55,
    ),
    painPointCard(
      "🔍", "Poor Visibility",
      "Leadership lacks real-time insight into pipeline health, forcing decisions based on stale weekly reports.",
      427,
    ),
    painPointCard(
      "📉", "Revenue Leakage",
      "Inconsistent workflows and human error result in 12-18% revenue leakage across the sales cycle.",
      800,
    ),
  ],
  undefined,
  { notes: "Pause here to ask the prospect which pain point resonates most with their current situation." },
);

// ---------------------------------------------------------------------------
// Slide 4: Cost of Inaction — 3 cost metrics as large numbers
// ---------------------------------------------------------------------------

const costSlide: PaperSlide = contentSlide(
  "Every quarter of delay compounds the cost",
  [
    kpiGrid([
      kpiTile("Lost Revenue / Year", "$4.2M", "↑ Growing 15% QoQ", { valueColor: RED, trendColor: RED, width: 347, height: 160 }),
      kpiTile("Wasted FTE Hours", "28,000 hrs", "Equivalent to 14 FTEs", { valueColor: RED, trendColor: AMBER, width: 347, height: 160 }),
      kpiTile("Customer Churn Risk", "23%", "3× industry average", { valueColor: RED, trendColor: RED, width: 347, height: 160 }),
    ], 3),
    textNode(
      "Based on current trajectory, GlobalCorp stands to lose $16.8M over the next 4 years without intervention.",
      {
        position: "absolute", top: 373, left: 105, width: 1067,
        fontSize: pt(14), color: DARK_GRAY, textAlign: "center", fontStyle: "italic",
      },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 5: Social Proof — Grid of 16 logos in 4×4
// ---------------------------------------------------------------------------

const logoImages = Array.from({ length: 16 }, () => LOGO_PLACEHOLDER);

const logoSlide: PaperSlide = contentSlide(
  "Trusted by 500+ enterprises worldwide",
  [photoGrid(logoImages, 4, { top: 120, left: 105, width: 1067, height: 480, gap: 21 })],
);

// ---------------------------------------------------------------------------
// Slide 6: Value Proposition — Hero statement + 3 benefit pillars
// ---------------------------------------------------------------------------

function benefitPillar(
  title: string, description: string, metric: string, left: number,
): PaperNode {
  return card(
    [
      textNode(metric, {
        fontSize: pt(24), fontWeight: "bold", color: MBB_BLUE,
        textAlign: "center", marginBottom: 8,
      }),
      textNode(title, {
        fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY,
        textAlign: "center", marginBottom: 8,
      }),
      textNode(description, {
        fontSize: pt(11), color: DARK_GRAY, textAlign: "center", lineHeight: 1.4,
      }),
    ],
    {
      width: 347, height: 267,
      style: { position: "absolute", top: 267, left },
    },
  );
}

const valueSlide: PaperSlide = contentSlide(
  "One platform to unify, automate, and scale your revenue operations",
  [
    textNode(
      "Acme Solutions replaces fragmented tools with an intelligent, end-to-end platform that drives measurable outcomes.",
      {
        position: "absolute", top: 105, left: 80, width: 1120,
        fontSize: pt(16), color: DARK_GRAY, textAlign: "center",
      },
    ),
    benefitPillar("Automate Workflows", "Eliminate manual steps with AI-powered process automation across your entire GTM stack.", "10×", 55),
    benefitPillar("Unified Data Layer", "Single source of truth connecting CRM, ERP, and analytics in real time.", "99.5%", 427),
    benefitPillar("Actionable Intelligence", "Predictive insights that surface risks and opportunities before they impact revenue.", "3.2×", 800),
  ],
);

// ---------------------------------------------------------------------------
// Slide 7: How It Works — 4-step workflow with connectors
// ---------------------------------------------------------------------------

function stepBox(
  num: string, label: string, desc: string, left: number, color: string,
): PaperNode {
  return card(
    [
      textNode(num, {
        fontSize: pt(22), fontWeight: "bold", color, textAlign: "center",
      }),
      textNode(label, {
        fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY,
        textAlign: "center", marginTop: 5,
      }),
      textNode(desc, {
        fontSize: pt(10), color: DARK_GRAY, textAlign: "center", marginTop: 5,
      }),
    ],
    {
      width: 240, height: 200,
      style: { position: "absolute", top: 187, left },
    },
  );
}

const howItWorksSlide: PaperSlide = contentSlide(
  "Get started in four simple steps",
  [
    stepBox("01", "Connect", "Integrate your existing tools in minutes", 55, MBB_BLUE),
    stepBox("02", "Configure", "Set up workflows with our visual builder", 347, "#0070C0"),
    stepBox("03", "Automate", "AI handles routing, enrichment, and alerts", 640, "#00B050"),
    stepBox("04", "Optimize", "Continuously improve with predictive analytics", 933, "#7C3AED"),
    // Connectors between steps
    connector(295, 287, 347, 287, { arrowEnd: true, color: MID_GRAY, width: 2 }),
    connector(587, 287, 640, 287, { arrowEnd: true, color: MID_GRAY, width: 2 }),
    connector(880, 287, 933, 287, { arrowEnd: true, color: MID_GRAY, width: 2 }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 8: Product Screenshot — Full screenshot with callout annotations
// ---------------------------------------------------------------------------

const screenshotSlide: PaperSlide = contentSlide(
  "Intuitive interface designed for revenue teams",
  [
    {
      type: "Image",
      src: SCREENSHOT_PLACEHOLDER,
      style: {
        position: "absolute", top: 105, left: 133,
        width: 1013, height: 533,
      },
    } as PaperImage,
    textNode("Pipeline Dashboard", {
      position: "absolute", top: 120, left: 40, width: 87,
      fontSize: pt(9), fontWeight: "bold", color: MBB_BLUE,
      backgroundColor: "#EFF6FF", padding: 5, borderRadius: 3,
    }),
    textNode("AI Recommendations", {
      position: "absolute", top: 293, left: 1153, width: 100,
      fontSize: pt(9), fontWeight: "bold", color: MBB_BLUE,
      backgroundColor: "#EFF6FF", padding: 5, borderRadius: 3,
    }),
    textNode("Deal Scoring", {
      position: "absolute", top: 507, left: 40, width: 80,
      fontSize: pt(9), fontWeight: "bold", color: MBB_BLUE,
      backgroundColor: "#EFF6FF", padding: 5, borderRadius: 3,
    }),
    textNode("Activity Feed", {
      position: "absolute", top: 587, left: 1153, width: 87,
      fontSize: pt(9), fontWeight: "bold", color: MBB_BLUE,
      backgroundColor: "#EFF6FF", padding: 5, borderRadius: 3,
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 9: Before/After — Split layout with metrics
// ---------------------------------------------------------------------------

const beforeCard: PaperNode = card(
  [
    textNode("BEFORE", {
      fontSize: pt(11), fontWeight: "bold", color: "#991B1B", letterSpacing: 2, marginBottom: 11,
    }),
    textNode("Current State", {
      fontSize: pt(18), fontWeight: "bold", color: "#7F1D1D", marginBottom: 16,
    }),
    bulletList(
      [
        { text: "5 disconnected systems" },
        { text: "48-hour report turnaround" },
        { text: "15% reconciliation error rate" },
        { text: "No real-time pipeline visibility" },
        { text: "$4.2M annual revenue leakage" },
      ],
      { fontSize: pt(11), color: "#991B1B" },
    ),
  ],
  {
    width: 533, height: 427,
    bg: "#FEF2F2",
    style: { position: "absolute", top: 120, left: 55, borderColor: "#FECACA" },
  },
);

const afterCard: PaperNode = card(
  [
    textNode("AFTER", {
      fontSize: pt(11), fontWeight: "bold", color: "#166534", letterSpacing: 2, marginBottom: 11,
    }),
    textNode("With Acme Solutions", {
      fontSize: pt(18), fontWeight: "bold", color: "#14532D", marginBottom: 16,
    }),
    bulletList(
      [
        { text: "Unified platform, single source of truth" },
        { text: "Real-time dashboards and alerts" },
        { text: "99.5% data accuracy with validation" },
        { text: "Predictive pipeline forecasting" },
        { text: "3.2× ROI within first year" },
      ],
      { fontSize: pt(11), color: "#166534" },
    ),
  ],
  {
    width: 533, height: 427,
    bg: "#F0FDF4",
    style: { position: "absolute", top: 120, left: 667, borderColor: "#BBF7D0" },
  },
);

const beforeAfterSlide: PaperSlide = contentSlide(
  "Transformation Impact",
  [beforeCard, afterCard],
);

// ---------------------------------------------------------------------------
// Slide 10: Case Study — Challenge → Approach → Results, 3 headline metrics
// ---------------------------------------------------------------------------

const caseStudySlide: PaperSlide = contentSlide(
  "Case Study: How TechCorp reduced churn by 40% in 6 months",
  [
    // Headline metrics
    kpiGrid([
      kpiTile("Revenue Impact", "+$8.5M", "Annual recurring", { valueColor: GREEN, width: 347, height: 120 }),
      kpiTile("Churn Reduction", "−40%", "Within 6 months", { valueColor: GREEN, width: 347, height: 120 }),
      kpiTile("Time to Value", "3 weeks", "Full deployment", { valueColor: MBB_BLUE, width: 347, height: 120 }),
    ], 3),
    // Challenge / Approach / Results
    card(
      [
        textNode("Challenge", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 5 }),
        textNode("TechCorp's sales team relied on 6 disconnected tools, leading to poor handoffs and a 28% churn rate.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.4,
        }),
      ],
      { width: 347, height: 187, style: { position: "absolute", top: 293, left: 55 } },
    ),
    card(
      [
        textNode("Approach", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 5 }),
        textNode("Deployed Acme platform in 3 weeks. Automated lead routing, unified CRM data, and enabled predictive health scoring.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.4,
        }),
      ],
      { width: 347, height: 187, style: { position: "absolute", top: 293, left: 427 } },
    ),
    card(
      [
        textNode("Results", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 5 }),
        textNode("40% churn reduction, $8.5M incremental ARR, and 92% team adoption within 90 days.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.4,
        }),
      ],
      { width: 347, height: 187, style: { position: "absolute", top: 293, left: 800 } },
    ),
  ],
  undefined,
  { notes: "TechCorp is willing to serve as a reference; offer to connect the prospect with their VP of Sales." },
);

// ---------------------------------------------------------------------------
// Slide 11: Feature Comparison — Your product + 2 competitors × 8 features
// ---------------------------------------------------------------------------

const featureSlide: PaperSlide = contentSlide(
  "How we compare to alternatives",
  [
    financialTable(
      ["Capability", "Acme Solutions", "Competitor A", "Competitor B"],
      [
        ["AI-Powered Automation", "✓", "Partial", "✗"],
        ["Real-Time Analytics", "✓", "✓", "✗"],
        ["Native CRM Integration", "✓", "✓", "✓"],
        ["Predictive Forecasting", "✓", "✗", "✗"],
        ["Custom Workflow Builder", "✓", "✓", "Partial"],
        ["Enterprise SSO / SCIM", "✓", "✓", "✓"],
        ["Dedicated CSM", "✓", "✗", "✗"],
        ["99.99% SLA Guarantee", "✓", "✗", "✗"],
      ],
      { alternatingRows: true },
    ),
  ],
  "Based on publicly available feature documentation as of March 2026",
);

// ---------------------------------------------------------------------------
// Slide 12: Pricing — 3-tier pricing table
// ---------------------------------------------------------------------------

function pricingCard(
  title: string, price: string, features: string[], accentColor: string,
  left: number, highlighted?: boolean,
): PaperNode {
  return card(
    [
      accentBar(accentColor, 0, 4),
      textNode(title, {
        fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY,
        textAlign: "center", marginTop: 16,
      }),
      textNode(price, {
        fontSize: pt(24), fontWeight: "bold", color: accentColor,
        textAlign: "center", marginTop: 11,
      }),
      textNode("/month", {
        fontSize: pt(11), color: MID_GRAY, textAlign: "center",
      }),
      bulletList(
        features.map(f => ({ text: f })),
        { fontSize: pt(11), color: DARK_GRAY, marginTop: 16 },
      ),
    ],
    {
      width: 347, height: 480,
      bg: highlighted ? "#F0F9FF" : WHITE,
      style: {
        position: "absolute", top: 105, left,
        borderColor: highlighted ? MBB_BLUE : LIGHT_GRAY,
        borderWidth: highlighted ? 2 : 1,
      },
    },
  );
}

const pricingSlide: PaperSlide = contentSlide(
  "Flexible pricing that scales with your business",
  [
    pricingCard(
      "Growth", "$499",
      ["Up to 25 users", "50 GB storage", "Core automations", "Email support", "Standard analytics"],
      "#0070C0", 55,
    ),
    pricingCard(
      "Business", "$1,299",
      ["Up to 100 users", "500 GB storage", "Advanced AI automation", "Priority support", "Custom dashboards", "API access", "SSO"],
      MBB_BLUE, 453, true,
    ),
    pricingCard(
      "Enterprise", "Custom",
      ["Unlimited users", "Unlimited storage", "Full platform access", "Dedicated CSM", "Custom SLA", "On-prem option", "24/7 support"],
      "#00B050", 853,
    ),
  ],
  undefined,
  { notes: "Business tier is the recommended starting point for GlobalCorp; enterprise pricing available upon request." },
);

// ---------------------------------------------------------------------------
// Slide 13: Implementation Timeline — 4-phase horizontal timeline
// ---------------------------------------------------------------------------

const timelineSlide: PaperSlide = contentSlide(
  "Go live in 8 weeks with our proven implementation methodology",
  [
    ganttTimeline(
      [
        { name: "Discovery & Planning", start: 0, duration: 2, color: MBB_BLUE },
        { name: "Integration & Config", start: 2, duration: 3, color: "#0070C0" },
        { name: "Training & UAT", start: 5, duration: 2, color: "#00B050" },
        { name: "Go-Live & Optimization", start: 7, duration: 1, color: "#7C3AED" },
      ],
      { top: 133, left: 55, width: 1170, rowHeight: 53 },
    ),
    // Phase descriptions
    textNode("Weeks 1–2: Stakeholder interviews, data audit, integration mapping", {
      position: "absolute", top: 400, left: 80, width: 533,
      fontSize: pt(11), color: DARK_GRAY,
    }),
    textNode("Weeks 3–5: CRM/ERP connectors, workflow configuration, data migration", {
      position: "absolute", top: 427, left: 80, width: 533,
      fontSize: pt(11), color: DARK_GRAY,
    }),
    textNode("Weeks 6–7: Team training, user acceptance testing, feedback iteration", {
      position: "absolute", top: 453, left: 80, width: 533,
      fontSize: pt(11), color: DARK_GRAY,
    }),
    textNode("Week 8: Phased rollout, monitoring, optimization review", {
      position: "absolute", top: 480, left: 80, width: 533,
      fontSize: pt(11), color: DARK_GRAY,
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 14: Next Steps — CTA with timeline, contact info
// ---------------------------------------------------------------------------

const nextStepsSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    textNode("Next Steps", {
      position: "absolute", top: 133, left: 105, width: 1067,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    bulletList(
      [
        { text: "Schedule technical deep-dive with your IT team (Week 1)" },
        { text: "Pilot program kickoff with 10-user cohort (Week 2–3)" },
        { text: "Executive review of pilot results (Week 4)" },
        { text: "Contract finalization and full rollout planning (Week 5)" },
      ],
      {
        position: "absolute", top: 227, left: 105, width: 933,
        fontSize: pt(16), color: "#C0C0C0",
      },
    ),
    // Contact info
    textNode("Your Account Team", {
      position: "absolute", top: 467, left: 105,
      fontSize: pt(16), fontWeight: "bold", color: WHITE,
    }),
    textNode("Sarah Chen, VP Sales  •  sarah@acmesolutions.com  •  +1 (415) 555-0142", {
      position: "absolute", top: 507, left: 105, width: 933,
      fontSize: pt(14), color: MID_GRAY,
    }),
    textNode("James Park, Solutions Architect  •  james@acmesolutions.com", {
      position: "absolute", top: 533, left: 105, width: 933,
      fontSize: pt(14), color: MID_GRAY,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const salesProposalDeck: PaperDocument = makeDoc(
  [
    coverSlide,        // 1: Cover
    marketShiftSlide,  // 2: Market Shift
    problemSlide,      // 3: The Problem
    costSlide,         // 4: Cost of Inaction
    logoSlide,         // 5: Social Proof
    valueSlide,        // 6: Value Proposition
    howItWorksSlide,   // 7: How It Works
    screenshotSlide,   // 8: Product Screenshot
    beforeAfterSlide,  // 9: Before/After
    caseStudySlide,    // 10: Case Study
    featureSlide,      // 11: Feature Comparison
    pricingSlide,      // 12: Pricing
    timelineSlide,     // 13: Implementation Timeline
    nextStepsSlide,    // 14: Next Steps
  ],
  { title: "Sales Proposal — GlobalCorp Digital Transformation" },
);
