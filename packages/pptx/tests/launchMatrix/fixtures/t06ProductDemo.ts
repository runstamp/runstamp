/**
 * T6: Product Demo — 12 slides
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperView, PaperImage,
  PaperConnector, SlideBackground,
} from "../../../src/types/ast.js";
import {
  makeDoc, contentSlide, photoGrid, textNode, connector, card,
  bulletList, accentBar, kpiTile, kpiGrid, sourceFooter, actionTitle, pt,
  WHITE, MBB_NAVY, MBB_BLUE, MID_GRAY,
  DARK_GRAY, LIGHT_GRAY, OFF_WHITE, GREEN, RED, AMBER,
  DARK_GRADIENT, CONTENT_BG, MBB_DARK_BG,
  LOGO_PLACEHOLDER, SCREENSHOT_PLACEHOLDER,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Title (Dark) — Product name, tagline, dark gradient
// ---------------------------------------------------------------------------

const darkGradientBg: SlideBackground = {
  type: "gradient",
  angle: 135,
  stops: [
    { color: "#111111", position: 0 },
    { color: "#312E81", position: 100 },
  ],
};

const titleSlide: PaperSlide = {
  type: "Slide",
  background: darkGradientBg,
  children: [
    accentBar("#6366F1"),
    textNode("NexusFlow", {
      position: "absolute", top: 213, left: 105, width: 1070,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    textNode("Intelligent workflow orchestration for modern engineering teams", {
      position: "absolute", top: 307, left: 105, width: 930,
      fontSize: pt(18), color: "#818CF8",
    }),
    textNode("Product Demo  •  March 2026", {
      position: "absolute", top: 373, left: 105, width: 530,
      fontSize: pt(14), color: "#666666",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 2: Industry Trend — Large statistic (60pt), trend description
// ---------------------------------------------------------------------------

const trendSlide: PaperSlide = {
  type: "Slide",
  background: { type: "solid", color: MBB_DARK_BG },
  children: [
    accentBar("#6366F1"),
    textNode("4.7×", {
      position: "absolute", top: 130, left: 105, width: 1070,
      fontSize: pt(48), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("increase in CI/CD pipeline complexity since 2023", {
      position: "absolute", top: 267, left: 187, width: 907,
      fontSize: pt(22), color: "#A5B4FC", textAlign: "center",
    }),
    textNode(
      "Engineering teams now manage an average of 14 microservices, 8 deployment targets, and 23 integration " +
      "points per application. Legacy orchestration tools were not built for this level of complexity.",
      {
        position: "absolute", top: 347, left: 213, width: 853,
        fontSize: pt(14), color: "#666666", textAlign: "center", lineHeight: 1.6,
      },
    ),
    sourceFooter("Source: DORA State of DevOps Report 2025"),
  ],
};

// ---------------------------------------------------------------------------
// Slide 3: Problem Statement — Current workflow pain points
// ---------------------------------------------------------------------------

const problemSlide: PaperSlide = contentSlide(
  "Engineering teams are drowning in orchestration overhead",
  [
    card(
      [
        textNode("Fragmented Tooling", {
          fontSize: pt(16), fontWeight: "bold", color: "#991B1B", marginBottom: 6,
        }),
        textNode(
          "Teams juggle 5+ tools for CI/CD, monitoring, incident response, and deployments. " +
          "Context switching wastes 11 hours per developer per week.",
          { fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.5 },
        ),
      ],
      { width: 530, height: 160, bg: "#FEF2F2", style: { position: "absolute", top: 120, left: 55, borderColor: "#FECACA" } },
    ),
    card(
      [
        textNode("Slow Incident Response", {
          fontSize: pt(16), fontWeight: "bold", color: "#991B1B", marginBottom: 6,
        }),
        textNode(
          "Mean time to detection is 47 minutes. Runbook execution is manual and inconsistent, " +
          "extending MTTR to over 2 hours for critical incidents.",
          { fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.5 },
        ),
      ],
      { width: 530, height: 160, bg: "#FEF2F2", style: { position: "absolute", top: 120, left: 667, borderColor: "#FECACA" } },
    ),
    card(
      [
        textNode("Deployment Bottleneck", {
          fontSize: pt(16), fontWeight: "bold", color: "#991B1B", marginBottom: 6,
        }),
        textNode(
          "Only 2 engineers can approve production deploys. Average deploy queue is 6 hours, " +
          "causing feature delays and merge conflicts.",
          { fontSize: pt(11), color: DARK_GRAY, lineHeight: 1.5 },
        ),
      ],
      { width: 1147, height: 147, bg: "#FEF2F2", style: { position: "absolute", top: 320, left: 55, borderColor: "#FECACA" } },
    ),
  ],
  undefined,
  { notes: "Pause on each pain point and ask the audience which resonates most with their team." },
);

// ---------------------------------------------------------------------------
// Slide 4: Solution Overview — 3 benefit pillars as cards
// ---------------------------------------------------------------------------

function pillarCard(
  icon: string, title: string, description: string, left: number, color: string,
): PaperNode {
  return card(
    [
      textNode(icon, { fontSize: pt(28), textAlign: "center", marginBottom: 6 }),
      textNode(title, {
        fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY,
        textAlign: "center", marginBottom: 8,
      }),
      textNode(description, {
        fontSize: pt(11), color: DARK_GRAY, textAlign: "center", lineHeight: 1.5,
      }),
      {
        type: "View",
        style: {
          width: 80, height: 4, backgroundColor: color,
          marginTop: 12, alignSelf: "center",
        },
      } as PaperView,
    ],
    {
      width: 347, height: 320,
      style: { position: "absolute", top: 130, left },
    },
  );
}

const solutionSlide: PaperSlide = contentSlide(
  "NexusFlow: One platform for your entire delivery lifecycle",
  [
    pillarCard(
      "🔄", "Unified Orchestration",
      "Connect CI/CD, infrastructure, monitoring, and incident response in a single declarative workflow engine.",
      55, "#6366F1",
    ),
    pillarCard(
      "🤖", "AI-Powered Automation",
      "Intelligent runbook execution, auto-remediation, and predictive scaling reduce manual intervention by 80%.",
      427, "#10B981",
    ),
    pillarCard(
      "📊", "Deep Observability",
      "Trace every deployment from commit to production with unified logs, metrics, and distributed tracing.",
      800, "#F59E0B",
    ),
  ],
  undefined,
  { notes: "Emphasize that all three pillars ship out of the box — no third-party integrations required." },
);

// ---------------------------------------------------------------------------
// Slide 5: Architecture Diagram — 5 components connected by arrows
// ---------------------------------------------------------------------------

function componentBox(
  label: string, subtitle: string, left: number, top: number, color: string,
): PaperNode {
  return {
    type: "View",
    shapeType: "roundRect",
    style: {
      position: "absolute", left, top,
      width: 200, height: 93,
      backgroundColor: color,
      borderWidth: 1, borderColor: LIGHT_GRAY,
      padding: 8,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    children: [
      textNode(label, {
        fontSize: pt(11), fontWeight: "bold", color: MBB_NAVY, textAlign: "center",
      }),
      textNode(subtitle, {
        fontSize: pt(9), color: DARK_GRAY, textAlign: "center", marginTop: 2,
      }),
    ],
  } as PaperView;
}

const archSlide: PaperSlide = contentSlide(
  "Platform Architecture",
  [
    // Top: Workflow Engine
    componentBox("Workflow Engine", "Declarative DAGs", 533, 105, "#DBEAFE"),
    // Middle row: 3 services
    componentBox("Build Service", "CI/CD Pipelines", 160, 293, "#FEF3C7"),
    componentBox("Deploy Service", "Multi-target rollout", 533, 293, "#D1FAE5"),
    componentBox("Monitor Service", "Observability stack", 907, 293, "#FCE7F3"),
    // Bottom: Data Lake
    componentBox("Event Bus", "Async messaging", 533, 480, "#E0E7FF"),
    // Connectors: Engine -> all 3 middle services
    connector(633, 200, 260, 293, { arrowEnd: true, color: MID_GRAY, width: 1.5 }),
    connector(633, 200, 633, 293, { arrowEnd: true, color: MID_GRAY, width: 1.5 }),
    connector(633, 200, 1007, 293, { arrowEnd: true, color: MID_GRAY, width: 1.5 }),
    // Middle services -> Event Bus
    connector(260, 387, 633, 480, { arrowEnd: true, color: MID_GRAY, width: 1.5 }),
    connector(633, 387, 633, 480, { arrowEnd: true, color: MID_GRAY, width: 1.5 }),
    connector(1007, 387, 633, 480, { arrowEnd: true, color: MID_GRAY, width: 1.5 }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 6: Workflow Demo — 4-step process with mini-screenshots
// ---------------------------------------------------------------------------

function demoStep(
  num: string, title: string, desc: string, left: number,
): PaperNode {
  return card(
    [
      // Mini screenshot placeholder
      {
        type: "Image",
        src: SCREENSHOT_PLACEHOLDER,
        style: { width: 213, height: 120, marginBottom: 8 },
      } as PaperImage,
      textNode(`${num}. ${title}`, {
        fontSize: pt(11), fontWeight: "bold", color: MBB_NAVY, marginBottom: 4,
      }),
      textNode(desc, {
        fontSize: pt(10), color: DARK_GRAY, lineHeight: 1.4,
      }),
    ],
    {
      width: 260, height: 307,
      style: { position: "absolute", top: 120, left },
    },
  );
}

const workflowSlide: PaperSlide = contentSlide(
  "See it in action: From commit to production in minutes",
  [
    demoStep("1", "Push Code", "Commit triggers automated build pipeline", 55),
    demoStep("2", "Test & Scan", "Parallel test suites and security scans", 347),
    demoStep("3", "Stage & Validate", "Canary deploy with automated health checks", 640),
    demoStep("4", "Ship to Prod", "Progressive rollout with instant rollback", 933),
    // Flow arrows
    connector(315, 273, 347, 273, { arrowEnd: true, color: MID_GRAY, width: 2 }),
    connector(607, 273, 640, 273, { arrowEnd: true, color: MID_GRAY, width: 2 }),
    connector(900, 273, 933, 273, { arrowEnd: true, color: MID_GRAY, width: 2 }),
  ],
  undefined,
  { notes: "This is the live demo slide — switch to the product and walk through each step in real time." },
);

// ---------------------------------------------------------------------------
// Slide 7: Hero Screenshot #1 — Full-slide product screenshot with callouts
// ---------------------------------------------------------------------------

const hero1Slide: PaperSlide = contentSlide(
  "Workflow Builder — Visual pipeline configuration",
  [
    {
      type: "Image",
      src: SCREENSHOT_PLACEHOLDER,
      style: {
        position: "absolute", top: 105, left: 133,
        width: 1013, height: 533,
      },
    } as PaperImage,
    textNode("DAG Editor", {
      position: "absolute", top: 120, left: 40, width: 87,
      fontSize: pt(9), fontWeight: "bold", color: "#6366F1",
      backgroundColor: "#EEF2FF", padding: 4, borderRadius: 2,
    }),
    textNode("Stage Config", {
      position: "absolute", top: 267, left: 1160, width: 93,
      fontSize: pt(9), fontWeight: "bold", color: "#6366F1",
      backgroundColor: "#EEF2FF", padding: 4, borderRadius: 2,
    }),
    textNode("Live Preview", {
      position: "absolute", top: 533, left: 40, width: 87,
      fontSize: pt(9), fontWeight: "bold", color: "#6366F1",
      backgroundColor: "#EEF2FF", padding: 4, borderRadius: 2,
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 8: Hero Screenshot #2 — Monitoring dashboard with callouts
// ---------------------------------------------------------------------------

const hero2Slide: PaperSlide = contentSlide(
  "Observability Dashboard — Real-time deployment health",
  [
    {
      type: "Image",
      src: SCREENSHOT_PLACEHOLDER,
      style: {
        position: "absolute", top: 105, left: 133,
        width: 1013, height: 533,
      },
    } as PaperImage,
    textNode("Service Map", {
      position: "absolute", top: 120, left: 40, width: 87,
      fontSize: pt(9), fontWeight: "bold", color: "#059669",
      backgroundColor: "#ECFDF5", padding: 4, borderRadius: 2,
    }),
    textNode("Error Traces", {
      position: "absolute", top: 333, left: 1160, width: 93,
      fontSize: pt(9), fontWeight: "bold", color: "#059669",
      backgroundColor: "#ECFDF5", padding: 4, borderRadius: 2,
    }),
    textNode("Latency Heatmap", {
      position: "absolute", top: 587, left: 1160, width: 107,
      fontSize: pt(9), fontWeight: "bold", color: "#059669",
      backgroundColor: "#ECFDF5", padding: 4, borderRadius: 2,
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 9: Before/After Metrics — Split layout with red/green tinting
// ---------------------------------------------------------------------------

const metricsBefore: PaperNode = card(
  [
    textNode("BEFORE NEXUSFLOW", {
      fontSize: pt(11), fontWeight: "bold", color: "#991B1B", letterSpacing: 2, marginBottom: 12,
    }),
    kpiTile("Deploy Frequency", "2/week", undefined, { valueColor: RED, width: 227, height: 93 }),
    kpiTile("MTTR", "127 min", undefined, { valueColor: RED, width: 227, height: 93 }),
    kpiTile("Change Failure Rate", "18%", undefined, { valueColor: RED, width: 227, height: 93 }),
    kpiTile("Lead Time", "14 days", undefined, { valueColor: RED, width: 227, height: 93 }),
  ],
  {
    width: 560, height: 507,
    bg: "#FEF2F2",
    style: { position: "absolute", top: 105, left: 40, borderColor: "#FECACA" },
  },
);

const metricsAfter: PaperNode = card(
  [
    textNode("AFTER NEXUSFLOW", {
      fontSize: pt(11), fontWeight: "bold", color: "#166534", letterSpacing: 2, marginBottom: 12,
    }),
    kpiTile("Deploy Frequency", "12/day", "↑ 42×", { valueColor: GREEN, trendColor: GREEN, width: 227, height: 93 }),
    kpiTile("MTTR", "8 min", "↓ 94%", { valueColor: GREEN, trendColor: GREEN, width: 227, height: 93 }),
    kpiTile("Change Failure Rate", "2.1%", "↓ 88%", { valueColor: GREEN, trendColor: GREEN, width: 227, height: 93 }),
    kpiTile("Lead Time", "45 min", "↓ 99.8%", { valueColor: GREEN, trendColor: GREEN, width: 227, height: 93 }),
  ],
  {
    width: 560, height: 507,
    bg: "#F0FDF4",
    style: { position: "absolute", top: 105, left: 667, borderColor: "#BBF7D0" },
  },
);

const beforeAfterSlide: PaperSlide = contentSlide(
  "DORA metrics transformation: from laggard to elite",
  [metricsBefore, metricsAfter],
  undefined,
  { notes: "These are real customer results from a mid-market SaaS company after 90 days on NexusFlow." },
);

// ---------------------------------------------------------------------------
// Slide 10: Integration Ecosystem — Logo grid of 20 partners
// ---------------------------------------------------------------------------

const integrationLogos = Array.from({ length: 20 }, () => LOGO_PLACEHOLDER);

const integrationSlide: PaperSlide = contentSlide(
  "Connects to your entire stack — 200+ integrations",
  [
    photoGrid(integrationLogos, 5, { top: 120, left: 80, width: 1120, height: 453, gap: 12 }),
    textNode("GitHub  •  GitLab  •  Jenkins  •  AWS  •  GCP  •  Azure  •  Datadog  •  PagerDuty  •  Slack  •  Jira  •  and 190 more", {
      position: "absolute", top: 600, left: 105, width: 1070,
      fontSize: pt(10), color: MID_GRAY, textAlign: "center",
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 11: Customer Results — 3 case study cards
// ---------------------------------------------------------------------------

function caseCard(
  company: string, metric: string, metricLabel: string,
  quote: string, left: number,
): PaperNode {
  return card(
    [
      textNode(company, {
        fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 8,
      }),
      textNode(metric, {
        fontSize: pt(28), fontWeight: "bold", color: GREEN, textAlign: "center", marginBottom: 2,
      }),
      textNode(metricLabel, {
        fontSize: pt(11), color: DARK_GRAY, textAlign: "center", marginBottom: 10,
      }),
      textNode(`"${quote}"`, {
        fontSize: pt(10), color: MID_GRAY, fontStyle: "italic", lineHeight: 1.4,
      }),
    ],
    {
      width: 360, height: 347,
      style: { position: "absolute", top: 130, left },
    },
  );
}

const customerSlide: PaperSlide = contentSlide(
  "Teams ship faster and sleep better with NexusFlow",
  [
    caseCard(
      "FinServ Global", "94%", "reduction in MTTR",
      "NexusFlow cut our incident response from hours to minutes. Our on-call engineers finally get uninterrupted sleep.",
      55,
    ),
    caseCard(
      "HealthTech Inc", "50×", "more deploys per week",
      "We went from weekly releases to continuous deployment. The rollback safety net gave us the confidence to ship fast.",
      440,
    ),
    caseCard(
      "RetailOS", "$2.4M", "saved in engineering time",
      "Automated orchestration freed up 8 engineers worth of capacity. We reinvested that into product development.",
      827,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 12: CTA — "Start Your Trial" with contact info
// ---------------------------------------------------------------------------

const ctaSlide: PaperSlide = {
  type: "Slide",
  background: darkGradientBg,
  children: [
    accentBar("#6366F1"),
    textNode("Start Your Free Trial", {
      position: "absolute", top: 187, left: 105, width: 1070,
      fontSize: pt(36), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("14 days, no credit card required. Full platform access.", {
      position: "absolute", top: 267, left: 187, width: 907,
      fontSize: pt(18), color: "#A5B4FC", textAlign: "center",
    }),
    // CTA button approximation
    {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute", top: 347, left: 453,
        width: 373, height: 67,
        backgroundColor: "#6366F1",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
      },
      children: [
        textNode("Request Demo →", {
          fontSize: pt(18), fontWeight: "bold", color: WHITE, textAlign: "center",
        }),
      ],
    } as PaperView,
    // Contact info
    textNode("nexusflow.io/demo", {
      position: "absolute", top: 453, left: 105, width: 1070,
      fontSize: pt(16), color: "#818CF8", textAlign: "center",
    }),
    textNode("Alex Rivera, Solutions Engineer  •  alex@nexusflow.io  •  +1 (628) 555-0198", {
      position: "absolute", top: 520, left: 105, width: 1070,
      fontSize: pt(14), color: "#666666", textAlign: "center",
    }),
    textNode("Maya Patel, Account Executive  •  maya@nexusflow.io", {
      position: "absolute", top: 553, left: 105, width: 1070,
      fontSize: pt(14), color: "#666666", textAlign: "center",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const productDemoDeck: PaperDocument = makeDoc(
  [
    titleSlide,        // 1: Title (Dark)
    trendSlide,        // 2: Industry Trend
    problemSlide,      // 3: Problem Statement
    solutionSlide,     // 4: Solution Overview
    archSlide,         // 5: Architecture Diagram
    workflowSlide,     // 6: Workflow Demo
    hero1Slide,        // 7: Hero Screenshot #1
    hero2Slide,        // 8: Hero Screenshot #2
    beforeAfterSlide,  // 9: Before/After Metrics
    integrationSlide,  // 10: Integration Ecosystem
    customerSlide,     // 11: Customer Results
    ctaSlide,          // 12: CTA
  ],
  { title: "NexusFlow — Product Demo" },
);
