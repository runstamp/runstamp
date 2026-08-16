/**
 * T10: Training Course Deck (18 slides)
 * Full training course: title, objectives, agenda, section dividers, concept slides,
 * deep bullet hierarchy, process diagram, case study, knowledge checks, exercises,
 * summary, resources, Q&A, and certificate placeholder.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperTable, PaperText,
  PaperView, PaperImage, PaperConnector, Paragraph, TableRow,
} from "../../../src/types/ast.js";
import {
  makeDoc, contentSlide, sectionDivider, mbbTitleSlide, card, textNode, richText,
  bulletList, accentBar, actionTitle, sourceFooter, financialTable, connector, pt,
  MBB_NAVY, MBB_BLUE, WHITE, OFF_WHITE, LIGHT_GRAY, MID_GRAY, DARK_GRAY,
  GREEN, RED, AMBER, DARK_GRADIENT, CONTENT_BG, LOGO_PLACEHOLDER, SCREENSHOT_PLACEHOLDER, TABLE_ALT_ROW,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Title — Course name, instructor, date, course code
// ---------------------------------------------------------------------------
const titleSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    textNode("Enterprise Platform Engineering", {
      position: "absolute", top: 187, left: 105, width: 1065,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    textNode("Comprehensive Technical Training Program", {
      position: "absolute", top: 267, left: 105, width: 933,
      fontSize: pt(18), color: MID_GRAY,
    }),
    // Instructor & details
    textNode("Instructor: Dr. Alex Rivera, Principal Architect", {
      position: "absolute", top: 400, left: 105, width: 800,
      fontSize: pt(14), color: WHITE,
    }),
    textNode("March 2026  |  Course Code: EPE-401  |  Duration: 3 Days", {
      position: "absolute", top: 433, left: 105, width: 800,
      fontSize: pt(11), color: MID_GRAY,
    }),
    // Decorative line
    {
      type: "View",
      style: {
        position: "absolute", top: 373, left: 105,
        width: 133, height: 2, backgroundColor: MBB_BLUE,
      },
    } as PaperView,
  ],
};

// ---------------------------------------------------------------------------
// Slide 2: Learning Objectives — 5 measurable objectives
// ---------------------------------------------------------------------------
const objectivesSlide: PaperSlide = contentSlide(
  "Learning Objectives",
  [
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 105, left: 80, width: 1120, height: 507 },
      paragraphs: [
        { runs: [{ text: "By the end of this course, participants will be able to:", style: { fontSize: pt(14), color: DARK_GRAY } }], spaceBefore: 0 },
        {
          runs: [
            { text: "1. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Design and implement microservices architectures using domain-driven design principles, achieving service isolation with <5ms inter-service latency.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 16,
        },
        {
          runs: [
            { text: "2. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Configure and manage Kubernetes clusters with auto-scaling policies, maintaining 99.95% availability under 10,000 RPS load.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 12,
        },
        {
          runs: [
            { text: "3. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Implement end-to-end observability using OpenTelemetry, including distributed tracing, custom metrics, and automated alerting.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 12,
        },
        {
          runs: [
            { text: "4. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Build CI/CD pipelines with blue-green deployment strategies, reducing deployment risk and achieving <15 minute rollback capability.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 12,
        },
        {
          runs: [
            { text: "5. ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
            { text: "Apply zero-trust security patterns including mTLS, RBAC, and network policies to satisfy SOC 2 Type II and FedRAMP requirements.", style: { fontSize: pt(14) } },
          ],
          spaceBefore: 12,
        },
      ],
    } as PaperText,
  ],
  undefined,
  { notes: "Review each objective and confirm the audience's baseline experience level before proceeding." },
);

// ---------------------------------------------------------------------------
// Slide 3: Agenda — 6 modules with estimated times in table
// ---------------------------------------------------------------------------
const agendaTable: PaperTable = {
  type: "Table",
  style: { position: "absolute", top: 105, left: 80, width: 1120 },
  tableData: {
    columns: [107, 427, 187, 187, 213],
    rows: [
      {
        height: 30,
        cells: [
          { text: "Module", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
          { text: "Topic", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
          { text: "Duration", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
          { text: "Format", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
          { text: "Day", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
        ],
      },
      { height: 28, cells: [
        { text: "1", style: { fontSize: pt(11), textAlign: "center", padding: 4, fontWeight: "bold" } },
        { text: "Platform Architecture & Design Patterns", style: { fontSize: pt(11), padding: 4 } },
        { text: "3.5 hours", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
        { text: "Lecture + Lab", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
        { text: "Day 1 — AM", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
      ]},
      { height: 28, cells: [
        { text: "2", style: { fontSize: pt(11), textAlign: "center", padding: 4, fontWeight: "bold", fill: "#F2F2F2" } },
        { text: "Container Orchestration & Kubernetes", style: { fontSize: pt(11), padding: 4, fill: "#F2F2F2" } },
        { text: "3.0 hours", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
        { text: "Lecture + Lab", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
        { text: "Day 1 — PM", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
      ]},
      { height: 28, cells: [
        { text: "3", style: { fontSize: pt(11), textAlign: "center", padding: 4, fontWeight: "bold" } },
        { text: "Observability & Monitoring", style: { fontSize: pt(11), padding: 4 } },
        { text: "3.0 hours", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
        { text: "Lecture + Demo", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
        { text: "Day 2 — AM", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
      ]},
      { height: 28, cells: [
        { text: "4", style: { fontSize: pt(11), textAlign: "center", padding: 4, fontWeight: "bold", fill: "#F2F2F2" } },
        { text: "CI/CD & Deployment Strategies", style: { fontSize: pt(11), padding: 4, fill: "#F2F2F2" } },
        { text: "3.5 hours", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
        { text: "Lecture + Lab", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
        { text: "Day 2 — PM", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
      ]},
      { height: 28, cells: [
        { text: "5", style: { fontSize: pt(11), textAlign: "center", padding: 4, fontWeight: "bold" } },
        { text: "Security & Compliance", style: { fontSize: pt(11), padding: 4 } },
        { text: "3.0 hours", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
        { text: "Lecture + Lab", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
        { text: "Day 3 — AM", style: { fontSize: pt(11), textAlign: "center", padding: 4 } },
      ]},
      { height: 28, cells: [
        { text: "6", style: { fontSize: pt(11), textAlign: "center", padding: 4, fontWeight: "bold", fill: "#F2F2F2" } },
        { text: "Capstone Project & Assessment", style: { fontSize: pt(11), padding: 4, fill: "#F2F2F2" } },
        { text: "3.0 hours", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
        { text: "Project + Exam", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
        { text: "Day 3 — PM", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
      ]},
    ],
  },
};

const agendaSlide: PaperSlide = contentSlide(
  "Course Agenda: 3-Day Program",
  [agendaTable],
  "Total instruction time: 19 hours | Prerequisites: Basic cloud experience",
);

// ---------------------------------------------------------------------------
// Slide 4: Section Divider — Module 1
// ---------------------------------------------------------------------------
const section1Slide: PaperSlide = sectionDivider(
  "MODULE 1", "Platform Architecture & Design Patterns", MBB_NAVY,
);

// ---------------------------------------------------------------------------
// Slide 5: Concept Introduction — 2-column layout (text + diagram)
// ---------------------------------------------------------------------------
const conceptSlide: PaperSlide = contentSlide(
  "Microservices Architecture: Core Principles",
  [
    // Left column: text
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 105, left: 55, width: 560, height: 507 },
      paragraphs: [
        { runs: [{ text: "Single Responsibility", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } }], spaceBefore: 0 },
        { runs: [{ text: "Each service owns one bounded context. Services communicate via well-defined APIs, never sharing databases directly.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 4 },
        { runs: [{ text: "Independent Deployment", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } }], spaceBefore: 16 },
        { runs: [{ text: "Services are deployed independently with their own CI/CD pipelines. Zero-downtime deployments via blue-green or canary strategies.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 4 },
        { runs: [{ text: "Resilience & Fault Isolation", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } }], spaceBefore: 16 },
        { runs: [{ text: "Circuit breakers, retries with exponential backoff, and bulkhead patterns prevent cascading failures across service boundaries.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 4 },
        { runs: [{ text: "Observability by Design", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } }], spaceBefore: 16 },
        { runs: [{ text: "Distributed tracing (OpenTelemetry), structured logging (JSON), and RED metrics (Rate, Errors, Duration) are built into every service from day one.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 4 },
      ],
    } as PaperText,
    // Right column: architecture diagram (placeholder boxes + connectors)
    {
      type: "View",
      style: { position: "absolute", top: 105, left: 667, width: 560, height: 507 },
      children: [
        // API Gateway box
        card(
          [textNode("API Gateway", { fontSize: pt(11), fontWeight: "bold", color: WHITE, textAlign: "center" })],
          { width: 213, height: 53, bg: MBB_BLUE, style: { position: "absolute", top: 13, left: 173 } },
        ),
        // Service boxes
        card(
          [textNode("User Service", { fontSize: pt(10), fontWeight: "bold", color: MBB_NAVY, textAlign: "center" })],
          { width: 160, height: 47, style: { position: "absolute", top: 120, left: 13 } },
        ),
        card(
          [textNode("Order Service", { fontSize: pt(10), fontWeight: "bold", color: MBB_NAVY, textAlign: "center" })],
          { width: 160, height: 47, style: { position: "absolute", top: 120, left: 200 } },
        ),
        card(
          [textNode("Payment Service", { fontSize: pt(10), fontWeight: "bold", color: MBB_NAVY, textAlign: "center" })],
          { width: 160, height: 47, style: { position: "absolute", top: 120, left: 387 } },
        ),
        // Message bus
        {
          type: "View",
          style: {
            position: "absolute", top: 220, left: 40, width: 480, height: 40,
            backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: AMBER,
            borderRadius: 4,
          },
          children: [
            textNode("Event Bus (Kafka)", { fontSize: pt(10), fontWeight: "bold", color: "#92400E", textAlign: "center", marginTop: 8 }),
          ],
        } as PaperView,
        // Database boxes
        card(
          [textNode("Users DB", { fontSize: pt(9), color: DARK_GRAY, textAlign: "center" })],
          { width: 133, height: 40, bg: "#F2F2F2", style: { position: "absolute", top: 313, left: 27 } },
        ),
        card(
          [textNode("Orders DB", { fontSize: pt(9), color: DARK_GRAY, textAlign: "center" })],
          { width: 133, height: 40, bg: "#F2F2F2", style: { position: "absolute", top: 313, left: 213 } },
        ),
        card(
          [textNode("Payments DB", { fontSize: pt(9), color: DARK_GRAY, textAlign: "center" })],
          { width: 133, height: 40, bg: "#F2F2F2", style: { position: "absolute", top: 313, left: 400 } },
        ),
      ],
    } as PaperView,
  ],
  undefined,
  { notes: "Walk through the architecture diagram on the right, tracing a request from API Gateway through the event bus to the databases." },
);

// ---------------------------------------------------------------------------
// Slide 6: Deep Bullet Hierarchy — 6 levels (16→14→12→11→10→9 pt)
// ---------------------------------------------------------------------------
const bulletParagraphs: Paragraph[] = [
  // Level 0: 16pt
  { runs: [{ text: "Platform Architecture Overview", style: { fontSize: pt(18), fontWeight: "bold" } }], bullet: { char: "■" }, level: 0, spaceBefore: 0 },
  // Level 1: 14pt
  { runs: [{ text: "Microservices Design Patterns", style: { fontSize: pt(16), fontWeight: "bold" } }], bullet: { char: "•" }, level: 1, spaceBefore: 4 },
  // Level 2: 12pt
  { runs: [{ text: "API Gateway — routing, rate limiting, authentication", style: { fontSize: pt(14) } }], bullet: { char: "–" }, level: 2, spaceBefore: 3 },
  // Level 3: 11pt
  { runs: [{ text: "Circuit breaker configuration (open/half-open/closed states)", style: { fontSize: pt(11) } }], bullet: { char: "›" }, level: 3, spaceBefore: 2 },
  // Level 4: 10pt
  { runs: [{ text: "Failure threshold: 5 errors in 30-second window", style: { fontSize: pt(11) } }], bullet: { char: "○" }, level: 4, spaceBefore: 2 },
  // Level 5: 9pt
  { runs: [{ text: "Recovery timeout: exponential backoff from 1s to 60s", style: { fontSize: pt(10) } }], bullet: { char: "▸" }, level: 5, spaceBefore: 2 },

  // Second top-level topic
  { runs: [{ text: "Container Orchestration", style: { fontSize: pt(18), fontWeight: "bold" } }], bullet: { char: "■" }, level: 0, spaceBefore: 10 },
  { runs: [{ text: "Kubernetes Resource Management", style: { fontSize: pt(16), fontWeight: "bold" } }], bullet: { char: "•" }, level: 1, spaceBefore: 4 },
  { runs: [{ text: "Pod scheduling and affinity rules", style: { fontSize: pt(14) } }], bullet: { char: "–" }, level: 2, spaceBefore: 3 },
  { runs: [{ text: "Resource quotas per namespace (CPU, memory, storage)", style: { fontSize: pt(11) } }], bullet: { char: "›" }, level: 3, spaceBefore: 2 },
  { runs: [{ text: "Horizontal Pod Autoscaler: target CPU 70%, min 2, max 20", style: { fontSize: pt(11) } }], bullet: { char: "○" }, level: 4, spaceBefore: 2 },
  { runs: [{ text: "Custom metrics: requests-per-second via Prometheus adapter", style: { fontSize: pt(10) } }], bullet: { char: "▸" }, level: 5, spaceBefore: 2 },

  // Third top-level topic
  { runs: [{ text: "Observability Stack", style: { fontSize: pt(18), fontWeight: "bold" } }], bullet: { char: "■" }, level: 0, spaceBefore: 10 },
  { runs: [{ text: "Distributed Tracing with OpenTelemetry", style: { fontSize: pt(16), fontWeight: "bold" } }], bullet: { char: "•" }, level: 1, spaceBefore: 4 },
  { runs: [{ text: "Trace context propagation (W3C TraceContext)", style: { fontSize: pt(14) } }], bullet: { char: "–" }, level: 2, spaceBefore: 3 },
  { runs: [{ text: "Span attributes: service.name, http.method, http.status_code", style: { fontSize: pt(11) } }], bullet: { char: "›" }, level: 3, spaceBefore: 2 },
  { runs: [{ text: "Sampling strategy: 10% head-based, 100% error tail-based", style: { fontSize: pt(11) } }], bullet: { char: "○" }, level: 4, spaceBefore: 2 },
  { runs: [{ text: "Retention: 7 days hot (Tempo), 90 days cold (S3)", style: { fontSize: pt(10) } }], bullet: { char: "▸" }, level: 5, spaceBefore: 2 },
];

const bulletHierarchySlide: PaperSlide = contentSlide(
  "Technical Deep Dive: Component Hierarchy",
  [
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 100, left: 80, width: 1120, height: 573 },
      paragraphs: bulletParagraphs,
    } as PaperText,
  ],
);

// ---------------------------------------------------------------------------
// Slide 7: Process Diagram — 5-step with decision diamond
// ---------------------------------------------------------------------------
const processSteps = [
  { label: "Receive\nRequest", x: 55, color: MBB_BLUE },
  { label: "Validate\nInput", x: 280, color: MBB_BLUE },
  { label: "Authorized?", x: 507, color: AMBER },  // diamond
  { label: "Process\nPayload", x: 747, color: MBB_BLUE },
  { label: "Return\nResponse", x: 987, color: GREEN },
];

const processSlide: PaperSlide = contentSlide(
  "Request Processing Pipeline",
  [
    // Step boxes
    ...processSteps.map((step, i) => {
      const isDiamond = i === 2;
      return card(
        [textNode(step.label, { fontSize: pt(11), fontWeight: "bold", color: WHITE, textAlign: "center" })],
        {
          width: isDiamond ? 147 : 173, height: isDiamond ? 93 : 80,
          bg: step.color,
          style: {
            position: "absolute",
            top: isDiamond ? 260 : 267,
            left: step.x,
            borderRadius: isDiamond ? 0 : 6,
            transform: isDiamond ? "rotate(0deg)" : undefined,
          },
        },
      );
    }),
    // Arrows between steps
    connector(233, 307, 280, 307, { color: MBB_NAVY, width: 2, arrowEnd: true }),
    connector(460, 307, 507, 307, { color: MBB_NAVY, width: 2, arrowEnd: true }),
    connector(660, 307, 747, 307, { color: MBB_NAVY, width: 2, arrowEnd: true }),
    connector(927, 307, 987, 307, { color: MBB_NAVY, width: 2, arrowEnd: true }),
    // Reject path from diamond
    connector(580, 357, 580, 453, { color: RED, width: 1.5, arrowEnd: true }),
    card(
      [textNode("401\nUnauthorized", { fontSize: pt(10), fontWeight: "bold", color: RED, textAlign: "center" })],
      { width: 133, height: 60, style: { position: "absolute", top: 460, left: 513 } },
    ),
    // "Yes" / "No" labels
    textNode("Yes", { position: "absolute", top: 287, left: 667, fontSize: pt(10), fontWeight: "bold", color: GREEN }),
    textNode("No", { position: "absolute", top: 360, left: 593, fontSize: pt(10), fontWeight: "bold", color: RED }),
    // Step numbers
    ...processSteps.map((step, i) => textNode(`${i + 1}`, {
      position: "absolute", top: 233, left: step.x + (i === 2 ? 67 : 77),
      fontSize: pt(10), fontWeight: "bold", color: MID_GRAY,
    })),
  ],
);

// ---------------------------------------------------------------------------
// Slide 8: Example/Case Study — Scenario + 4-factor analysis table
// ---------------------------------------------------------------------------
const caseStudySlide: PaperSlide = contentSlide(
  "Case Study: E-Commerce Platform Migration",
  [
    // Scenario description
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 100, left: 55, width: 1170, height: 107 },
      paragraphs: [
        { runs: [{ text: "Scenario: ", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_NAVY } }, { text: "GlobalShop, a $2B e-commerce retailer, needs to migrate from a monolithic Java application (500K LOC) to microservices. The system handles 15,000 orders/hour during peak and must maintain 99.95% uptime during migration. Budget: $4.2M over 18 months.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 0 },
      ],
    } as PaperText,
    // 4-factor analysis table
    {
      type: "Table",
      style: { position: "absolute", top: 227, left: 55, width: 1170 },
      tableData: {
        columns: [213, 480, 480],
        rows: [
          {
            height: 28,
            cells: [
              { text: "Factor", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
              { text: "Current State", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
              { text: "Target State", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
            ],
          },
          { height: 73, cells: [
            { text: "Architecture", style: { fontSize: pt(11), fontWeight: "bold", padding: 6, fill: "#E3F2FD", verticalAlign: "top" } },
            { text: "Monolithic Java (Spring) app\n• Single WAR deployment\n• Shared Oracle DB (2.4TB)", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
            { text: "12 bounded-context microservices\n• Independent deployments\n• Service-specific PostgreSQL + Redis", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
          ]},
          { height: 73, cells: [
            { text: "Performance", style: { fontSize: pt(11), fontWeight: "bold", padding: 6, fill: "#E8F5E9", verticalAlign: "top" } },
            { text: "Avg response: 450ms (p99: 2.8s)\n• Vertical scaling only\n• Max 8,000 orders/hr before degradation", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
            { text: "Avg response: 85ms (p99: 350ms)\n• Horizontal auto-scaling\n• 50,000 orders/hr capacity", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
          ]},
          { height: 73, cells: [
            { text: "Deployment", style: { fontSize: pt(11), fontWeight: "bold", padding: 6, fill: "#FFF8E1", verticalAlign: "top" } },
            { text: "Monthly release windows (4hr downtime)\n• Manual QA (3-week cycle)\n• 12% rollback rate", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
            { text: "50+ deployments/day\n• Automated testing (15min pipeline)\n• <1% rollback rate, <15min recovery", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
          ]},
          { height: 73, cells: [
            { text: "Cost", style: { fontSize: pt(11), fontWeight: "bold", padding: 6, fill: "#FDECEA", verticalAlign: "top" } },
            { text: "Infrastructure: $85K/month\n• Over-provisioned for peak\n• Oracle licensing: $240K/year", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
            { text: "Infrastructure: $42K/month (avg)\n• Right-sized with auto-scaling\n• OSS databases: $0 licensing", style: { fontSize: pt(10), padding: 6, verticalAlign: "top" } },
          ]},
        ],
      },
    } as PaperTable,
  ],
);

// ---------------------------------------------------------------------------
// Slide 9: Knowledge Check 1 — Multiple choice (A-D), answer in notes
// ---------------------------------------------------------------------------
const question1Text = textNode(
  "Which deployment strategy allows traffic to be gradually shifted from the old version to the new version while monitoring error rates?",
  { position: "absolute", top: 105, left: 80, width: 1120, fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY },
);

const kc1Answers = [
  { letter: "A", text: "Blue-Green Deployment" },
  { letter: "B", text: "Canary Deployment" },
  { letter: "C", text: "Rolling Update" },
  { letter: "D", text: "Recreate Deployment" },
];

const kc1AnswerCards: PaperNode[] = kc1Answers.map((ans, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return card(
    [textNode(`${ans.letter}. ${ans.text}`, { fontSize: pt(16), color: MBB_NAVY })],
    {
      width: 507, height: 87,
      style: { position: "absolute", left: 80 + col * 560, top: 213 + row * 120 },
    },
  );
});

const knowledgeCheck1Slide: PaperSlide = {
  type: "Slide",
  background: { type: "solid", color: OFF_WHITE },
  notes: "Correct answer: B. Canary Deployment gradually shifts traffic (e.g., 5% → 25% → 100%) while monitoring error rates, latency, and business metrics. Blue-Green is an all-or-nothing switch. Rolling Update replaces instances sequentially but doesn't support traffic percentage control. Recreate takes everything down first.",
  children: [
    { type: "View", style: { position: "absolute", top: 0, left: 0, width: 1280, height: 4, backgroundColor: MBB_BLUE } } as PaperView,
    textNode("Knowledge Check — Module 1", {
      position: "absolute", top: 27, left: 55, width: 1170, height: 67,
      fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY,
    }),
    question1Text,
    ...kc1AnswerCards,
    textNode("Select the best answer. Discussion to follow.", {
      position: "absolute", bottom: 40, left: 80, fontSize: pt(11), color: MID_GRAY, fontStyle: "italic",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 10: Section Divider — Module 2
// ---------------------------------------------------------------------------
const section2Slide: PaperSlide = sectionDivider(
  "MODULE 2", "Container Orchestration & Kubernetes", MBB_NAVY,
);

// ---------------------------------------------------------------------------
// Slide 11: Comparison Table — Container Runtimes
// ---------------------------------------------------------------------------
const comparisonSlide: PaperSlide = contentSlide(
  "Container Runtime Comparison",
  [
    {
      type: "Table",
      style: { position: "absolute", top: 105, left: 55, width: 1170 },
      tableData: {
        columns: [213, 240, 240, 240, 240],
        rows: [
          {
            height: 30,
            cells: [
              { text: "Feature", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
              { text: "Docker", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
              { text: "containerd", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
              { text: "CRI-O", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
              { text: "gVisor", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
            ],
          },
          { height: 26, cells: [
            { text: "OCI Compliant", style: { fontSize: pt(10), padding: 4, fontWeight: "bold" } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, color: GREEN } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, color: GREEN } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, color: GREEN } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, color: GREEN } },
          ]},
          { height: 26, cells: [
            { text: "K8s Native", style: { fontSize: pt(10), padding: 4, fontWeight: "bold", fill: "#F2F2F2" } },
            { text: "Via shim", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2", color: AMBER } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2", color: GREEN } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2", color: GREEN } },
            { text: "✓", style: { fontSize: pt(11), textAlign: "center", padding: 4, fill: "#F2F2F2", color: GREEN } },
          ]},
          { height: 26, cells: [
            { text: "Startup Time", style: { fontSize: pt(10), padding: 4, fontWeight: "bold" } },
            { text: "~500ms", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
            { text: "~300ms", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
            { text: "~250ms", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
            { text: "~800ms", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
          ]},
          { height: 26, cells: [
            { text: "Memory Overhead", style: { fontSize: pt(10), padding: 4, fontWeight: "bold", fill: "#F2F2F2" } },
            { text: "~100MB", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
            { text: "~40MB", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
            { text: "~35MB", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
            { text: "~150MB", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
          ]},
          { height: 26, cells: [
            { text: "Security Isolation", style: { fontSize: pt(10), padding: 4, fontWeight: "bold" } },
            { text: "Namespace", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
            { text: "Namespace", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
            { text: "Namespace", style: { fontSize: pt(10), textAlign: "center", padding: 4 } },
            { text: "Kernel-level", style: { fontSize: pt(10), textAlign: "center", padding: 4, color: GREEN, fontWeight: "bold" } },
          ]},
          { height: 26, cells: [
            { text: "Recommendation", style: { fontSize: pt(10), padding: 4, fontWeight: "bold", fill: "#F2F2F2" } },
            { text: "Dev/Test", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
            { text: "Production ★", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2", color: MBB_BLUE, fontWeight: "bold" } },
            { text: "OpenShift", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
            { text: "Multi-tenant", style: { fontSize: pt(10), textAlign: "center", padding: 4, fill: "#F2F2F2" } },
          ]},
        ],
      },
    } as PaperTable,
  ],
  "Source: CNCF Runtime Landscape 2025",
);

// ---------------------------------------------------------------------------
// Slide 12: Annotated Screenshot + Definition List
// ---------------------------------------------------------------------------
const annotatedSlide: PaperSlide = contentSlide(
  "Kubernetes Dashboard: Key Components",
  [
    // Screenshot placeholder
    {
      type: "Image",
      src: SCREENSHOT_PLACEHOLDER,
      style: { position: "absolute", top: 105, left: 55, width: 693, height: 453 },
    } as PaperImage,
    // Annotation callouts
    ...([
      { label: "1. Namespace Selector", y: 127, desc: "Scope view to specific namespace" },
      { label: "2. Pod Status Grid", y: 213, desc: "Real-time pod health indicators" },
      { label: "3. Resource Utilization", y: 300, desc: "CPU/memory gauges per node" },
      { label: "4. Event Stream", y: 387, desc: "Cluster events with severity levels" },
    ] as const).map((a) =>
      textNode(`${a.label}`, {
        position: "absolute", top: a.y, left: 93, width: 240,
        fontSize: pt(9), fontWeight: "bold", color: WHITE,
        backgroundColor: MBB_BLUE, padding: 3, borderRadius: 2,
      }),
    ),
    // Definition list on right
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 105, left: 787, width: 453, height: 453 },
      paragraphs: [
        { runs: [{ text: "Key Terms", style: { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY } }], spaceBefore: 0 },
        { runs: [{ text: "Pod", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_BLUE } }, { text: " — Smallest deployable unit; one or more containers sharing network/storage.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 10 },
        { runs: [{ text: "ReplicaSet", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_BLUE } }, { text: " — Ensures a specified number of pod replicas are running at all times.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 8 },
        { runs: [{ text: "Deployment", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_BLUE } }, { text: " — Declarative updates for Pods and ReplicaSets with rollback support.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 8 },
        { runs: [{ text: "Service", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_BLUE } }, { text: " — Stable network endpoint that load-balances across healthy pod replicas.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 8 },
        { runs: [{ text: "Ingress", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_BLUE } }, { text: " — HTTP/HTTPS routing rules mapping external URLs to internal services.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 8 },
      ],
    } as PaperText,
  ],
);

// ---------------------------------------------------------------------------
// Slide 13: Interactive Exercise — Instructions + blank table for input
// ---------------------------------------------------------------------------
const exerciseSlide: PaperSlide = contentSlide(
  "Hands-On Exercise: Design a Deployment Strategy",
  [
    // Instructions
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 100, left: 55, width: 1170, height: 93 },
      paragraphs: [
        { runs: [{ text: "Instructions: ", style: { fontSize: pt(11), fontWeight: "bold", color: MBB_NAVY } }, { text: "For each service below, define the deployment strategy, replica count, resource limits, and health check configuration. Consider the service characteristics when making your decisions. You have 25 minutes.", style: { fontSize: pt(11), color: DARK_GRAY } }], spaceBefore: 0 },
      ],
    } as PaperText,
    // Blank table for participant input
    {
      type: "Table",
      style: { position: "absolute", top: 213, left: 55, width: 1170 },
      tableData: {
        columns: [213, 187, 133, 187, 213, 240],
        rows: [
          {
            height: 30,
            cells: [
              { text: "Service", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(10), padding: 6 } },
              { text: "Strategy", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(10), textAlign: "center", padding: 6 } },
              { text: "Replicas", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(10), textAlign: "center", padding: 6 } },
              { text: "CPU / Memory", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(10), textAlign: "center", padding: 6 } },
              { text: "Health Check", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(10), textAlign: "center", padding: 6 } },
              { text: "Justification", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(10), padding: 6 } },
            ],
          },
          ...[
            "API Gateway (stateless, high traffic)",
            "User Auth Service (stateless, critical)",
            "Order Processor (stateful, async)",
            "Notification Service (stateless, low priority)",
            "Analytics Pipeline (batch, resource-heavy)",
          ].map((svc, i) => ({
            height: 60,
            cells: [
              { text: svc, style: { fontSize: pt(10), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE } },
              { text: "", style: { fontSize: pt(10), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE, borderWidth: 1, borderColor: LIGHT_GRAY } },
              { text: "", style: { fontSize: pt(10), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE, borderWidth: 1, borderColor: LIGHT_GRAY } },
              { text: "", style: { fontSize: pt(10), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE, borderWidth: 1, borderColor: LIGHT_GRAY } },
              { text: "", style: { fontSize: pt(10), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE, borderWidth: 1, borderColor: LIGHT_GRAY } },
              { text: "", style: { fontSize: pt(10), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE, borderWidth: 1, borderColor: LIGHT_GRAY } },
            ],
          })),
        ],
      },
    } as PaperTable,
    textNode("Time: 25 minutes  |  Work in pairs  |  Be prepared to present", {
      position: "absolute", bottom: 40, left: 55,
      fontSize: pt(11), color: MID_GRAY, fontStyle: "italic",
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 14: Knowledge Check 2 — True/False, 5 statements, answer in notes
// ---------------------------------------------------------------------------
const tfStatements = [
  { num: 1, text: "A Kubernetes Service of type ClusterIP is accessible from outside the cluster.", answer: false },
  { num: 2, text: "Horizontal Pod Autoscaler can scale based on custom Prometheus metrics.", answer: true },
  { num: 3, text: "A ConfigMap can store binary data up to 1MB in size.", answer: true },
  { num: 4, text: "Pod disruption budgets guarantee zero-downtime during node maintenance.", answer: false },
  { num: 5, text: "Readiness probes determine whether a pod should receive traffic.", answer: true },
];

const knowledgeCheck2Slide: PaperSlide = {
  type: "Slide",
  background: { type: "solid", color: OFF_WHITE },
  notes: `Correct answers:\n1. FALSE — ClusterIP is internal only. Use NodePort, LoadBalancer, or Ingress for external access.\n2. TRUE — HPA supports custom metrics via the custom.metrics.k8s.io API, commonly backed by Prometheus Adapter.\n3. TRUE — ConfigMaps support binaryData field, with a 1MiB total size limit per ConfigMap.\n4. FALSE — PDBs set minimum available / maximum unavailable bounds but do not guarantee zero downtime; they limit voluntary disruptions.\n5. TRUE — Readiness probes control Service endpoint membership; failing probes remove the pod from the Service's endpoints.`,
  children: [
    { type: "View", style: { position: "absolute", top: 0, left: 0, width: 1280, height: 4, backgroundColor: MBB_BLUE } } as PaperView,
    textNode("Knowledge Check — Module 2: True or False", {
      position: "absolute", top: 27, left: 55, width: 1170, height: 67,
      fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY,
    }),
    ...tfStatements.map((s, i) =>
      card(
        [
          {
            type: "Text",
            style: { fontFamily: "Arial", width: 1065 },
            paragraphs: [{
              runs: [
                { text: `${s.num}. `, style: { fontSize: pt(14), fontWeight: "bold", color: MBB_BLUE } },
                { text: s.text, style: { fontSize: pt(14), color: MBB_NAVY } },
              ],
              spaceBefore: 0,
            }],
          } as PaperText,
        ],
        {
          width: 1120, height: 67,
          style: { position: "absolute", left: 80, top: 113 + i * 87 },
        },
      ),
    ),
    // True / False column headers
    textNode("T          F", {
      position: "absolute", top: 587, left: 507, width: 267,
      fontSize: pt(18), fontWeight: "bold", color: MBB_NAVY, textAlign: "center",
    }),
    textNode("Write T or F next to each statement. Answers are in speaker notes.", {
      position: "absolute", bottom: 33, left: 80, fontSize: pt(11), color: MID_GRAY, fontStyle: "italic",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 15: Summary — 6 key takeaways with bold lead-ins
// ---------------------------------------------------------------------------
const summarySlide: PaperSlide = contentSlide(
  "Key Takeaways",
  [
    {
      type: "Text",
      style: { fontFamily: "Arial", position: "absolute", top: 105, left: 80, width: 1120, height: 507 },
      paragraphs: [
        {
          runs: [
            { text: "Design for Failure: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Every service will fail. Circuit breakers, retries, and bulkheads are not optional — they are architectural requirements.", style: { fontSize: pt(14), color: DARK_GRAY } },
          ],
          bullet: { char: "■" }, level: 0, spaceBefore: 0,
        },
        {
          runs: [
            { text: "Observe Everything: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Distributed tracing, structured logging, and RED metrics provide the visibility needed to operate microservices at scale.", style: { fontSize: pt(14), color: DARK_GRAY } },
          ],
          bullet: { char: "■" }, level: 0, spaceBefore: 12,
        },
        {
          runs: [
            { text: "Automate Deployments: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "CI/CD pipelines with canary deployments reduce risk and enable 50+ daily releases with confidence.", style: { fontSize: pt(14), color: DARK_GRAY } },
          ],
          bullet: { char: "■" }, level: 0, spaceBefore: 12,
        },
        {
          runs: [
            { text: "Right-Size Resources: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Set resource requests and limits based on actual usage profiles. Use HPA with custom metrics for cost-efficient scaling.", style: { fontSize: pt(14), color: DARK_GRAY } },
          ],
          bullet: { char: "■" }, level: 0, spaceBefore: 12,
        },
        {
          runs: [
            { text: "Security is Non-Negotiable: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "mTLS between services, network policies, RBAC, and pod security standards form the zero-trust foundation.", style: { fontSize: pt(14), color: DARK_GRAY } },
          ],
          bullet: { char: "■" }, level: 0, spaceBefore: 12,
        },
        {
          runs: [
            { text: "Start Small, Iterate Fast: ", style: { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY } },
            { text: "Strangle the monolith incrementally. Extract high-value bounded contexts first and validate patterns before scaling.", style: { fontSize: pt(14), color: DARK_GRAY } },
          ],
          bullet: { char: "■" }, level: 0, spaceBefore: 12,
        },
      ],
    } as PaperText,
  ],
  undefined,
  { notes: "Ask participants to pick their top two takeaways and share with the group before moving to resources." },
);

// ---------------------------------------------------------------------------
// Slide 16: Resources — 8 resources table (title, type, URL, description)
// ---------------------------------------------------------------------------
const resourceTable: PaperTable = {
  type: "Table",
  style: { position: "absolute", top: 105, left: 40, width: 1200 },
  tableData: {
    columns: [267, 107, 347, 480],
    rows: [
      {
        height: 28,
        cells: [
          { text: "Resource", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
          { text: "Type", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), textAlign: "center", padding: 6 } },
          { text: "URL", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
          { text: "Description", style: { fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(11), padding: 6 } },
        ],
      },
      ...[
        { title: "Kubernetes Official Docs", type: "Docs", url: "https://kubernetes.io/docs", desc: "Comprehensive reference for all K8s resources and APIs" },
        { title: "CNCF Landscape", type: "Guide", url: "https://landscape.cncf.io", desc: "Interactive map of cloud-native technologies and vendors" },
        { title: "12-Factor App Methodology", type: "Guide", url: "https://12factor.net", desc: "Best practices for building SaaS applications" },
        { title: "OpenTelemetry Documentation", type: "Docs", url: "https://opentelemetry.io/docs", desc: "Instrumentation, SDK, and collector configuration guides" },
        { title: "Platform Lab Environment", type: "Lab", url: "https://lab.training.accelion.com", desc: "Hands-on sandbox with pre-configured K8s clusters" },
        { title: "Course Video Recordings", type: "Video", url: "https://learn.accelion.com/epe-401", desc: "Recorded sessions and supplementary walkthroughs" },
        { title: "Helm Chart Repository", type: "Repo", url: "https://github.com/accelion/helm-charts", desc: "Production-ready Helm charts for all platform services" },
        { title: "Support & Q&A Forum", type: "Forum", url: "https://community.accelion.com/training", desc: "Post-course questions and peer discussion" },
      ].map((r, i) => ({
        height: 32,
        cells: [
          { text: r.title, style: { fontSize: pt(10), padding: 4, fontWeight: "bold" as const, fill: i % 2 === 1 ? "#F2F2F2" : WHITE } },
          { text: r.type, style: { fontSize: pt(10), textAlign: "center" as const, padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE } },
          { text: r.url, content: [{ text: r.url, hyperlink: r.url, style: { fontSize: pt(9), color: "#0563C1" } }], style: { fontSize: pt(9), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE } },
          { text: r.desc, style: { fontSize: pt(9), padding: 4, fill: i % 2 === 1 ? "#F2F2F2" : WHITE } },
        ],
      })),
    ],
  },
};

const resourceSlide: PaperSlide = contentSlide(
  "Additional Resources & References",
  [resourceTable],
);

// ---------------------------------------------------------------------------
// Slide 17: Q&A — Centered "Questions?"
// ---------------------------------------------------------------------------
const qaSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    textNode("Questions?", {
      position: "absolute", top: 253, left: 105, width: 1065,
      fontSize: pt(48), fontWeight: "bold", color: WHITE, textAlign: "center",
    }),
    textNode("Dr. Alex Rivera  |  alex.rivera@accelion.com  |  Slack: #epe-401-support", {
      position: "absolute", top: 387, left: 105, width: 1065,
      fontSize: pt(14), color: MID_GRAY, textAlign: "center",
    }),
    // Decorative lines
    {
      type: "View",
      style: {
        position: "absolute", top: 360, left: 507,
        width: 267, height: 2, backgroundColor: MBB_BLUE,
      },
    } as PaperView,
  ],
};

// ---------------------------------------------------------------------------
// Slide 18: Certificate Placeholder
// ---------------------------------------------------------------------------
const certificateSlide: PaperSlide = {
  type: "Slide",
  background: { type: "solid", color: "#F8FAFC" },
  children: [
    // Outer decorative border
    {
      type: "View",
      style: {
        position: "absolute", top: 27, left: 27, width: 1227, height: 667,
        borderWidth: 3, borderColor: MBB_BLUE,
        backgroundColor: WHITE,
      },
    } as PaperView,
    // Inner decorative border
    {
      type: "View",
      style: {
        position: "absolute", top: 40, left: 40, width: 1200, height: 640,
        borderWidth: 1, borderColor: LIGHT_GRAY,
      },
    } as PaperView,
    // Corner accents (top-left, top-right, bottom-left, bottom-right)
    ...([
      { top: 47, left: 47, width: 53, height: 2 }, { top: 47, left: 47, width: 2, height: 53 },
      { top: 47, left: 1185, width: 53, height: 2 }, { top: 47, left: 1238, width: 2, height: 53 },
      { top: 677, left: 47, width: 53, height: 2 }, { top: 624, left: 47, width: 2, height: 53 },
      { top: 677, left: 1185, width: 53, height: 2 }, { top: 624, left: 1238, width: 2, height: 53 },
    ] as const).map((c) => ({
      type: "View",
      style: { position: "absolute", ...c, backgroundColor: MBB_BLUE },
    } as PaperView)),
    // Logo placeholder
    {
      type: "Image",
      src: LOGO_PLACEHOLDER,
      style: { position: "absolute", top: 73, left: 560, width: 160, height: 53 },
    } as PaperImage,
    // Title
    textNode("Certificate of Completion", {
      position: "absolute", top: 147, left: 80, width: 1120,
      fontSize: pt(36), fontWeight: "bold", color: MBB_NAVY, textAlign: "center",
    }),
    // Decorative line
    {
      type: "View",
      style: {
        position: "absolute", top: 220, left: 467, width: 347, height: 2,
        backgroundColor: MBB_BLUE,
      },
    } as PaperView,
    // "This certifies that"
    textNode("This certifies that", {
      position: "absolute", top: 253, left: 80, width: 1120,
      fontSize: pt(14), color: MID_GRAY, textAlign: "center",
    }),
    // Participant name
    textNode("[Participant Name]", {
      position: "absolute", top: 293, left: 80, width: 1120,
      fontSize: pt(28), fontWeight: "bold", color: MBB_NAVY, textAlign: "center",
    }),
    // "has successfully completed"
    textNode("has successfully completed", {
      position: "absolute", top: 360, left: 80, width: 1120,
      fontSize: pt(14), color: MID_GRAY, textAlign: "center",
    }),
    // Course name
    textNode("Enterprise Platform Engineering (EPE-401)", {
      position: "absolute", top: 393, left: 80, width: 1120,
      fontSize: pt(18), fontWeight: "bold", color: MBB_BLUE, textAlign: "center",
    }),
    // Duration & date
    textNode("3-Day Comprehensive Technical Training Program", {
      position: "absolute", top: 440, left: 80, width: 1120,
      fontSize: pt(11), color: DARK_GRAY, textAlign: "center",
    }),
    textNode("March 2026", {
      position: "absolute", top: 473, left: 80, width: 1120,
      fontSize: pt(11), color: MID_GRAY, textAlign: "center",
    }),
    // Signature lines
    {
      type: "View",
      style: { position: "absolute", top: 560, left: 187, width: 267, height: 1, backgroundColor: MBB_NAVY },
    } as PaperView,
    textNode("Dr. Alex Rivera\nLead Instructor", {
      position: "absolute", top: 567, left: 187, width: 267,
      fontSize: pt(10), color: DARK_GRAY, textAlign: "center",
    }),
    {
      type: "View",
      style: { position: "absolute", top: 560, left: 827, width: 267, height: 1, backgroundColor: MBB_NAVY },
    } as PaperView,
    textNode("Sarah Chen\nCEO, Accelion Technologies", {
      position: "absolute", top: 567, left: 827, width: 267,
      fontSize: pt(10), color: DARK_GRAY, textAlign: "center",
    }),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const trainingDeck: PaperDocument = makeDoc(
  [
    titleSlide,           // 1  — Title
    objectivesSlide,      // 2  — Learning Objectives
    agendaSlide,          // 3  — Agenda
    section1Slide,        // 4  — Section Divider: Module 1
    conceptSlide,         // 5  — Concept Introduction (2-column)
    bulletHierarchySlide, // 6  — Deep Bullet Hierarchy (6 levels)
    processSlide,         // 7  — Process Diagram (5-step + decision)
    caseStudySlide,       // 8  — Case Study
    knowledgeCheck1Slide, // 9  — Knowledge Check 1 (A-D, answer in notes)
    section2Slide,        // 10 — Section Divider: Module 2
    comparisonSlide,      // 11 — Comparison Table
    annotatedSlide,       // 12 — Annotated Screenshot + Definitions
    exerciseSlide,        // 13 — Interactive Exercise
    knowledgeCheck2Slide, // 14 — Knowledge Check 2 (T/F, answers in notes)
    summarySlide,         // 15 — Summary (6 takeaways)
    resourceSlide,        // 16 — Resources (8-row table)
    qaSlide,              // 17 — Q&A
    certificateSlide,     // 18 — Certificate Placeholder
  ],
  { title: "Enterprise Platform Engineering — EPE-401" },
);
