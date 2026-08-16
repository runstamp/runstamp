/**
 * T08: RFP Response Deck — 22 slides
 * Enterprise RFP response with compliance matrix, solution architecture,
 * implementation plan, case studies, team bios, pricing, and next steps.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperView, PaperText,
  PaperImage, PaperTable, PaperConnector, TableRow, SlideBackground,
} from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, sectionDivider, contentSlide, kpiGrid, kpiTile,
  photoGrid, card, textNode, richText, bulletList, financialTable,
  ganttTimeline, complianceRow, connector, accentBar, actionTitle, sourceFooter, pt,
  LOGO_PLACEHOLDER, PHOTO_PLACEHOLDER, MBB_BLUE, MBB_NAVY, WHITE, OFF_WHITE,
  LIGHT_GRAY, MID_GRAY, DARK_GRAY, GREEN, RED, AMBER,
  DARK_GRADIENT, CONTENT_BG,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Slide 1: Cover — "[Client] — Response to RFP #XXX", both logos
// ---------------------------------------------------------------------------

const coverSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    // Client logo (left)
    {
      type: "Image",
      src: LOGO_PLACEHOLDER,
      style: { position: "absolute", top: 53, left: 80, width: 160, height: 53 },
    } as PaperImage,
    // Our logo (right)
    {
      type: "Image",
      src: LOGO_PLACEHOLDER,
      style: { position: "absolute", top: 53, right: 80, left: 1040, width: 160, height: 53 },
    } as PaperImage,
    textNode("GlobalCorp — Response to RFP #2026-0142", {
      position: "absolute", top: 213, left: 80, width: 1120,
      fontSize: pt(28), fontWeight: "bold", color: WHITE,
    }),
    textNode("Enterprise Data Platform • Submitted March 2026", {
      position: "absolute", top: 293, left: 80, width: 933,
      fontSize: pt(16), color: MID_GRAY,
    }),
    textNode("CONFIDENTIAL", {
      position: "absolute", top: 640, left: 80,
      fontSize: pt(10), fontWeight: "bold", color: MID_GRAY, letterSpacing: 2,
    }),
  ],
};

// ---------------------------------------------------------------------------
// Slide 2: Executive Summary
// ---------------------------------------------------------------------------

const execSummarySlide: PaperSlide = contentSlide(
  "We uniquely address GlobalCorp's need for a unified, compliant data platform",
  [
    card(
      [
        textNode("The Challenge", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        textNode("GlobalCorp's data infrastructure spans 14 legacy systems across 3 regions, creating data silos, compliance risk, and $4.2M in annual reconciliation costs.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 120, style: { position: "absolute", top: 105, left: 55 } },
    ),
    card(
      [
        textNode("Our Solution", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        textNode("A cloud-native, API-first platform that consolidates data workflows with built-in compliance (SOC 2, GDPR, HIPAA), reducing time-to-insight from days to minutes.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 120, style: { position: "absolute", top: 240, left: 55 } },
    ),
    // 3 Differentiators
    card(
      [
        textNode("1. Compliance-First", { fontSize: pt(14), fontWeight: "bold", color: GREEN }),
        textNode("SOC 2 Type II, GDPR, HIPAA certified — no add-ons required", { fontSize: pt(10), color: DARK_GRAY, marginTop: 4 }),
      ],
      { width: 360, height: 133, style: { position: "absolute", top: 387, left: 55 } },
    ),
    card(
      [
        textNode("2. Fastest Time-to-Value", { fontSize: pt(14), fontWeight: "bold", color: GREEN }),
        textNode("12-week implementation vs. industry avg of 24 weeks", { fontSize: pt(10), color: DARK_GRAY, marginTop: 4 }),
      ],
      { width: 360, height: 133, style: { position: "absolute", top: 387, left: 453 } },
    ),
    card(
      [
        textNode("3. Total Cost Advantage", { fontSize: pt(14), fontWeight: "bold", color: GREEN }),
        textNode("38% lower 3-year TCO through platform consolidation", { fontSize: pt(10), color: DARK_GRAY, marginTop: 4 }),
      ],
      { width: 360, height: 133, style: { position: "absolute", top: 387, left: 853 } },
    ),
  ],
  undefined,
  { notes: "Tailor the three differentiators to GlobalCorp's evaluation criteria from the RFP scoring rubric." },
);

// ---------------------------------------------------------------------------
// Slides 3-4: Understanding Requirements
// ---------------------------------------------------------------------------

const reqSlide1: PaperSlide = contentSlide(
  "We have mapped each requirement to proven capabilities in our platform",
  [
    card(
      [
        textNode("Data Integration (RFP §3.1)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Native connectors for SAP, Oracle, Salesforce, and 200+ sources" },
            { text: "Real-time CDC (Change Data Capture) with sub-second latency" },
            { text: "Schema evolution support with automatic migration" },
            { text: "Bi-directional sync for hybrid cloud environments" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 547, height: 293, style: { position: "absolute", top: 105, left: 55 } },
    ),
    card(
      [
        textNode("Security & Compliance (RFP §3.2)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "AES-256 encryption at rest, TLS 1.3 in transit" },
            { text: "Role-based + attribute-based access control (RBAC + ABAC)" },
            { text: "Immutable audit trail with 7-year retention" },
            { text: "Annual SOC 2 Type II audit by Deloitte" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 547, height: 293, style: { position: "absolute", top: 105, left: 653 } },
    ),
    card(
      [
        textNode("Scalability (RFP §3.3)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Horizontal auto-scaling to 10M events/sec" },
            { text: "Multi-region deployment (US, EU, APAC)" },
            { text: "99.99% uptime SLA with automated failover" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 547, height: 213, style: { position: "absolute", top: 427, left: 55 } },
    ),
    card(
      [
        textNode("Analytics & Reporting (RFP §3.4)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Drag-and-drop report builder with 50+ templates" },
            { text: "Scheduled and ad-hoc report distribution" },
            { text: "Embedded analytics with white-label support" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 547, height: 213, style: { position: "absolute", top: 427, left: 653 } },
    ),
  ],
);

const reqSlide2: PaperSlide = contentSlide(
  "Additional requirement areas demonstrate depth of platform capability",
  [
    card(
      [
        textNode("User Experience (RFP §3.5)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Modern web interface with responsive design" },
            { text: "Native mobile apps (iOS & Android)" },
            { text: "Accessibility WCAG 2.1 AA compliance" },
            { text: "Single sign-on with all major identity providers" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 547, height: 267, style: { position: "absolute", top: 105, left: 55 } },
    ),
    card(
      [
        textNode("Support & SLA (RFP §3.6)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "24/7 support with 15-min P1 response time" },
            { text: "Dedicated customer success manager" },
            { text: "Quarterly business reviews with executive sponsor" },
            { text: "99.9% uptime guarantee with financial credits" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 547, height: 267, style: { position: "absolute", top: 105, left: 653 } },
    ),
    card(
      [
        textNode("Migration & Integration (RFP §3.7)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Proven migration playbook for SAP and Oracle environments" },
            { text: "Zero-downtime cutover methodology" },
            { text: "REST, GraphQL, and SOAP API support" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 187, style: { position: "absolute", top: 400, left: 55 } },
    ),
  ],
);

// ---------------------------------------------------------------------------
// Slide 5: Compliance Matrix — 15 requirements, merged category headers
// ---------------------------------------------------------------------------

const complianceHeaderStyle = {
  fill: MBB_NAVY, color: WHITE, fontWeight: "bold" as const,
  fontSize: pt(11), padding: 6,
};

const categoryRowStyle = {
  fill: "#E0E0E0", fontWeight: "bold" as const,
  fontSize: pt(11), padding: 4, color: MBB_NAVY,
};

const complianceTable: PaperTable = {
  type: "Table",
  style: { position: "absolute", top: 93, left: 27, width: 1227 },
  tableData: {
    columns: [293, 80, 427, 427],
    rows: [
      // Header
      {
        height: 35,
        cells: [
          { text: "Requirement", style: { ...complianceHeaderStyle } },
          { text: "Status", style: { ...complianceHeaderStyle, textAlign: "center" } },
          { text: "Capability", style: { ...complianceHeaderStyle } },
          { text: "Evidence", style: { ...complianceHeaderStyle } },
        ],
      },
      // Category: Security (rows 1-5)
      {
        height: 29,
        cells: [
          { text: "SECURITY & COMPLIANCE", colSpan: 4, style: categoryRowStyle },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
        ],
      },
      { height: 27, cells: [...complianceRow("SSO / SAML 2.0", "full", "Native SAML 2.0 + OIDC"), { text: "IdP integration guide v4.2", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("RBAC", "full", "Granular roles + custom permissions"), { text: "Security whitepaper §3", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("Encryption at Rest", "full", "AES-256 with KMS integration"), { text: "SOC 2 report, Control CC6.1", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("Encryption in Transit", "full", "TLS 1.3 enforced"), { text: "Penetration test report 2025", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("SOC 2 Type II", "full", "Annual audit by Deloitte"), { text: "Latest report available under NDA", style: { fontSize: pt(10), padding: 4 } }] },
      // Category: Data Management (rows 6-10)
      {
        height: 29,
        cells: [
          { text: "DATA MANAGEMENT", colSpan: 4, style: categoryRowStyle },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
        ],
      },
      { height: 27, cells: [...complianceRow("GDPR Compliance", "full", "Full compliance with DPA"), { text: "DPA template, EU processing records", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("HIPAA Compliance", "full", "BAA available, PHI controls"), { text: "BAA template, HIPAA assessment", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("Data Residency", "partial", "US-East, EU-West live; APAC Q3'26"), { text: "Infrastructure architecture doc", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("Audit Logging", "full", "Immutable trail, 7yr retention"), { text: "Audit module documentation", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("Disaster Recovery", "partial", "RPO <1hr, RTO <4hr; improving"), { text: "DR runbook, annual DR test results", style: { fontSize: pt(10), padding: 4 } }] },
      // Category: Platform (rows 11-15)
      {
        height: 29,
        cells: [
          { text: "PLATFORM & INTEGRATION", colSpan: 4, style: categoryRowStyle },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
          { text: "", hMerge: true },
        ],
      },
      { height: 27, cells: [...complianceRow("Custom Reporting", "full", "Drag-and-drop builder, 50+ templates"), { text: "Product demo recording", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("API Rate Limiting", "partial", "Configurable limits; burst in dev"), { text: "API docs §7 Rate Limits", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("Legacy Integration", "partial", "REST + SOAP; mainframe beta"), { text: "Integration cookbook v2.1", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("On-Premise Option", "none", "Cloud-only; VPC peering available"), { text: "Network architecture diagram", style: { fontSize: pt(10), padding: 4 } }] },
      { height: 27, cells: [...complianceRow("24/7 Support SLA", "full", "15-min P1 response time"), { text: "SLA agreement template", style: { fontSize: pt(10), padding: 4 } }] },
    ],
  },
};

const complianceSlide: PaperSlide = contentSlide(
  "11 of 15 requirements fully met; 3 partial with clear roadmap to full",
  [complianceTable],
  "Source: Requirements matrix mapped to RFP #2026-0142 §3",
  { notes: "Call out the three partial items proactively and explain the roadmap to full compliance." },
);

// ---------------------------------------------------------------------------
// Slides 6-7: Solution Architecture — System Diagram (8 components + connectors)
// ---------------------------------------------------------------------------

function archComponent(
  label: string, x: number, y: number, color: string,
  opts?: { width?: number; height?: number },
): PaperNode {
  const w = opts?.width ?? 187;
  const h = opts?.height ?? 80;
  return card(
    [
      textNode(label, { fontSize: pt(11), fontWeight: "bold", color: WHITE, textAlign: "center" }),
    ],
    {
      width: w, height: h, bg: color, padding: 8,
      style: { position: "absolute", left: x, top: y, borderColor: color },
    },
  );
}

const archSlide1: PaperSlide = contentSlide(
  "Platform architecture delivers security, scalability, and extensibility by design",
  [
    // Top row — external systems
    archComponent("SAP ERP", 55, 105, "#2D5F8A"),
    archComponent("Oracle DB", 267, 105, "#2D5F8A"),
    archComponent("Salesforce", 480, 105, "#2D5F8A"),
    archComponent("Legacy APIs", 693, 105, "#2D5F8A"),

    // Middle — integration layer
    archComponent("Integration Hub", 267, 240, MBB_BLUE, { width: 400, height: 67 }),

    // Core platform
    archComponent("Data Engine", 107, 360, MBB_NAVY, { width: 213, height: 80 }),
    archComponent("Analytics Core", 373, 360, MBB_NAVY, { width: 213, height: 80 }),
    archComponent("Security Layer", 640, 360, "#1B5E20", { width: 213, height: 80 }),

    // Bottom — outputs
    archComponent("Dashboards", 160, 493, "#0070C0"),
    archComponent("Reports", 400, 493, "#0070C0"),
    archComponent("API Gateway", 640, 493, "#0070C0"),

    // Connectors
    connector(147, 187, 400, 240, { arrowEnd: true, color: MID_GRAY }),
    connector(360, 187, 453, 240, { arrowEnd: true, color: MID_GRAY }),
    connector(573, 187, 507, 240, { arrowEnd: true, color: MID_GRAY }),
    connector(787, 187, 560, 240, { arrowEnd: true, color: MID_GRAY }),
    connector(467, 307, 213, 360, { arrowEnd: true, color: MID_GRAY }),
    connector(467, 307, 480, 360, { arrowEnd: true, color: MID_GRAY }),
    connector(467, 307, 747, 360, { arrowEnd: true, color: MID_GRAY }),
    connector(213, 440, 253, 493, { arrowEnd: true, color: MID_GRAY }),
    connector(480, 440, 493, 493, { arrowEnd: true, color: MID_GRAY }),
    connector(747, 440, 733, 493, { arrowEnd: true, color: MID_GRAY }),
  ],
  "Source: Solution Architecture — Technical Proposal §4",
);

const archSlide2: PaperSlide = contentSlide(
  "Infrastructure design ensures 99.99% availability across regions",
  [
    // Region boxes
    card(
      [
        textNode("US-East (Primary)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "3 availability zones" },
            { text: "Active-active configuration" },
            { text: "Auto-scaling 2-100 nodes" },
            { text: "RPO: <1 minute" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 360, height: 267, style: { position: "absolute", top: 105, left: 55 } },
    ),
    card(
      [
        textNode("EU-West (Secondary)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "2 availability zones" },
            { text: "Active-standby configuration" },
            { text: "GDPR data residency compliant" },
            { text: "RPO: <5 minutes" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 360, height: 267, style: { position: "absolute", top: 105, left: 453 } },
    ),
    card(
      [
        textNode("APAC (Planned Q3'26)", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Singapore + Tokyo regions" },
            { text: "Active-standby configuration" },
            { text: "Local data residency" },
            { text: "RPO: <15 minutes" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 360, height: 267, style: { position: "absolute", top: 105, left: 853 } },
    ),
    // Cross-region connectors
    connector(413, 240, 453, 240, { arrowEnd: true, color: MBB_BLUE, width: 2 }),
    connector(813, 240, 853, 240, { arrowEnd: true, color: MBB_BLUE, width: 2 }),

    // SLA summary
    card(
      [
        textNode("SLA Summary", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Guaranteed uptime: 99.99% (52 min/year max downtime)" },
            { text: "Financial credits: 10% per 0.01% below SLA" },
            { text: "Maintenance windows: pre-scheduled, zero-downtime deployments" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 160, style: { position: "absolute", top: 413, left: 55 } },
    ),
  ],
  "Source: Infrastructure Design — Technical Proposal §5",
);

// ---------------------------------------------------------------------------
// Slides 8-10: Requirement Deep-Dives
// ---------------------------------------------------------------------------

const deepDive1: PaperSlide = contentSlide(
  "Data integration workflow eliminates manual reconciliation across 14 systems",
  [
    // Workflow diagram
    archComponent("Source Systems", 55, 120, "#2D5F8A", { width: 160, height: 67 }),
    archComponent("CDC Capture", 267, 120, MBB_BLUE, { width: 160, height: 67 }),
    archComponent("Transform", 480, 120, MBB_BLUE, { width: 160, height: 67 }),
    archComponent("Data Lake", 693, 120, MBB_NAVY, { width: 160, height: 67 }),
    archComponent("Analytics", 907, 120, GREEN, { width: 160, height: 67 }),

    connector(213, 153, 267, 153, { arrowEnd: true, color: DARK_GRAY }),
    connector(427, 153, 480, 153, { arrowEnd: true, color: DARK_GRAY }),
    connector(640, 153, 693, 153, { arrowEnd: true, color: DARK_GRAY }),
    connector(853, 153, 907, 153, { arrowEnd: true, color: DARK_GRAY }),

    card(
      [
        textNode("How It Works", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Change Data Capture monitors all 14 source systems in real-time" },
            { text: "Schema-aware transformations handle format differences automatically" },
            { text: "Conflict resolution uses configurable priority rules per data domain" },
            { text: "Reconciliation runs continuously — not in nightly batch windows" },
            { text: "Anomaly detection flags data quality issues within 60 seconds" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 267, style: { position: "absolute", top: 240, left: 55 } },
    ),
  ],
  "Source: Technical Proposal §4.1 — Data Integration Architecture",
);

const deepDive2: PaperSlide = contentSlide(
  "Security architecture provides defense-in-depth across all data flows",
  [
    archComponent("Perimeter\n(WAF + DDoS)", 55, 120, "#1B5E20", { width: 213, height: 67 }),
    archComponent("Identity\n(SSO + MFA)", 320, 120, "#1B5E20", { width: 213, height: 67 }),
    archComponent("Authorization\n(RBAC + ABAC)", 587, 120, "#1B5E20", { width: 213, height: 67 }),
    archComponent("Encryption\n(AES-256 + TLS)", 853, 120, "#1B5E20", { width: 213, height: 67 }),

    connector(267, 153, 320, 153, { arrowEnd: true, color: GREEN }),
    connector(533, 153, 587, 153, { arrowEnd: true, color: GREEN }),
    connector(800, 153, 853, 153, { arrowEnd: true, color: GREEN }),

    card(
      [
        textNode("Security Controls", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "All data encrypted at rest (AES-256) and in transit (TLS 1.3)" },
            { text: "Fine-grained ABAC policies enforce row-level and column-level security" },
            { text: "Immutable audit logs retained for 7 years with tamper-proof hashing" },
            { text: "Automated vulnerability scanning (weekly) and pen testing (quarterly)" },
            { text: "SOC 2 Type II, GDPR, HIPAA controls verified by independent auditor" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 267, style: { position: "absolute", top: 240, left: 55 } },
    ),
  ],
  "Source: Technical Proposal §4.2 — Security Architecture",
);

const deepDive3: PaperSlide = contentSlide(
  "Analytics workflow delivers sub-second queries on petabyte-scale datasets",
  [
    archComponent("Data Ingestion", 55, 120, MBB_BLUE, { width: 173, height: 67 }),
    archComponent("Query Engine", 280, 120, MBB_BLUE, { width: 173, height: 67 }),
    archComponent("Caching Layer", 507, 120, MBB_BLUE, { width: 173, height: 67 }),
    archComponent("Visualization", 733, 120, MBB_BLUE, { width: 173, height: 67 }),
    archComponent("Alerting", 960, 120, AMBER, { width: 133, height: 67 }),

    connector(227, 153, 280, 153, { arrowEnd: true, color: DARK_GRAY }),
    connector(453, 153, 507, 153, { arrowEnd: true, color: DARK_GRAY }),
    connector(680, 153, 733, 153, { arrowEnd: true, color: DARK_GRAY }),
    connector(907, 153, 960, 153, { arrowEnd: true, color: DARK_GRAY }),

    card(
      [
        textNode("Analytics Capabilities", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Columnar storage engine optimized for analytical workloads" },
            { text: "Materialized views with automatic refresh for dashboard performance" },
            { text: "50+ pre-built report templates for common enterprise use cases" },
            { text: "Embedded analytics SDK for white-label customer-facing dashboards" },
            { text: "ML-powered anomaly detection with configurable alert thresholds" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 267, style: { position: "absolute", top: 240, left: 55 } },
    ),
  ],
  "Source: Technical Proposal §4.3 — Analytics Architecture",
);

// ---------------------------------------------------------------------------
// Slides 11-12: Implementation Plan — Gantt (12 tasks, 4 phases, 16 weeks)
// ---------------------------------------------------------------------------

const implSlide1: PaperSlide = contentSlide(
  "16-week implementation delivers value at each phase gate",
  [
    ganttTimeline(
      [
        // Phase 1: Discovery (Weeks 1-3)
        { name: "Stakeholder Interviews", start: 0, duration: 2, color: MBB_BLUE },
        { name: "Requirements Validation", start: 1, duration: 2, color: MBB_BLUE },
        { name: "Architecture Design", start: 2, duration: 2, color: MBB_BLUE },
        // Phase 2: Build (Weeks 4-9)
        { name: "Core Platform Setup", start: 3, duration: 3, color: "#0070C0" },
        { name: "Data Migration (Wave 1)", start: 4, duration: 4, color: "#0070C0" },
        { name: "Integration Development", start: 5, duration: 4, color: "#0070C0" },
        // Phase 3: Test (Weeks 8-13)
        { name: "UAT Preparation", start: 7, duration: 2, color: GREEN },
        { name: "User Acceptance Testing", start: 9, duration: 3, color: GREEN },
        { name: "Performance Testing", start: 10, duration: 2, color: GREEN },
        // Phase 4: Launch (Weeks 12-16)
        { name: "Training & Enablement", start: 11, duration: 3, color: AMBER },
        { name: "Staged Rollout", start: 13, duration: 2, color: AMBER },
        { name: "Hypercare Support", start: 14, duration: 2, color: AMBER },
      ],
      { top: 105, left: 55, width: 1170, rowHeight: 37 },
    ),
    // Phase legend
    textNode("Phase 1: Discovery (Wk 1-3)  •  Phase 2: Build (Wk 4-9)  •  Phase 3: Test (Wk 8-13)  •  Phase 4: Launch (Wk 12-16)", {
      position: "absolute", top: 587, left: 55, width: 1170,
      fontSize: pt(10), color: MID_GRAY, textAlign: "center",
    }),
  ],
  "Source: Implementation Plan — Project Charter v1.2",
);

const implSlide2: PaperSlide = contentSlide(
  "Each phase gate includes defined deliverables and sign-off criteria",
  [
    financialTable(
      ["Phase", "Duration", "Key Deliverables", "Sign-off Criteria"],
      [
        ["1. Discovery", "Weeks 1-3", "Requirements doc, architecture design, project plan", "Stakeholder approval of design"],
        ["2. Build", "Weeks 4-9", "Platform config, data migration, integrations", "All systems connected, data flowing"],
        ["3. Test", "Weeks 8-13", "UAT complete, performance validated, defects resolved", "Zero P1/P2 open defects"],
        ["4. Launch", "Weeks 12-16", "Training complete, staged rollout, hypercare", "Go-live sign-off by project sponsor"],
      ],
      { alternatingRows: true },
    ),
  ],
  "Source: Implementation Plan — Phase Gate Framework",
);

// ---------------------------------------------------------------------------
// Slide 13: Success Metrics — 6 KPIs with baseline/target/method/frequency
// ---------------------------------------------------------------------------

const successMetricsSlide: PaperSlide = contentSlide(
  "Six measurable KPIs will track ROI from day one of go-live",
  [
    financialTable(
      ["KPI", "Baseline", "12-Mo Target", "Measurement Method", "Frequency"],
      [
        ["Data reconciliation time", "72 hours", "< 1 hour", "Automated job completion logs", "Daily"],
        ["Report generation time", "4-6 hours", "< 5 minutes", "Platform analytics module", "Weekly"],
        ["Data quality score", "78%", "> 95%", "Automated DQ rules engine", "Daily"],
        ["System availability", "97.5%", "99.99%", "Uptime monitoring (PagerDuty)", "Monthly"],
        ["User adoption rate", "0%", "> 80%", "DAU / total licensed users", "Weekly"],
        ["Annual reconciliation cost", "$4.2M", "< $1.5M", "Finance tracking (GL codes)", "Quarterly"],
      ],
      {
        alternatingRows: true,
        style: { top: 105, left: 27, width: 1227 },
      },
    ),
  ],
  "Source: Business Case — ROI Model v2.0",
);

// ---------------------------------------------------------------------------
// Slides 14-15: Case Studies
// ---------------------------------------------------------------------------

const caseStudy1: PaperSlide = contentSlide(
  "Case Study: Meridian Health reduced data latency from days to seconds",
  [
    card(
      [
        textNode("The Challenge", { fontSize: pt(14), fontWeight: "bold", color: "#991B1B", marginBottom: 6 }),
        textNode("Meridian Health operated 8 disconnected EHR and billing systems across 12 hospitals. Clinical data reconciliation took 72+ hours, delaying patient care decisions and costing $3.8M annually in manual processes.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 147, style: { position: "absolute", top: 105, left: 55 }, bg: "#FEF2F2" },
    ),
    card(
      [
        textNode("Our Approach", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Deployed CDC connectors to all 8 source systems in parallel" },
            { text: "Built HIPAA-compliant data lake with row-level security" },
            { text: "Implemented real-time clinical dashboards for 2,400 physicians" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 160, style: { position: "absolute", top: 273, left: 55 } },
    ),
    card(
      [
        textNode("Results (12 Months Post-Launch)", { fontSize: pt(14), fontWeight: "bold", color: "#14532D", marginBottom: 6 }),
        bulletList(
          [
            { text: "Data latency: 72 hours → 8 seconds (99.997% reduction)" },
            { text: "Annual cost savings: $3.1M (82% reduction)" },
            { text: "Physician adoption: 91% within 6 months" },
            { text: "Patient satisfaction scores: +14 points" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 173, style: { position: "absolute", top: 453, left: 55 }, bg: "#F0FDF4" },
    ),
  ],
  "Source: Meridian Health case study (published with permission)",
  { notes: "Offer to arrange a reference call with Meridian Health's CTO to validate these results." },
);

const caseStudy2: PaperSlide = contentSlide(
  "Case Study: Atlas Financial cut reporting cycle from 5 days to 15 minutes",
  [
    card(
      [
        textNode("The Challenge", { fontSize: pt(14), fontWeight: "bold", color: "#991B1B", marginBottom: 6 }),
        textNode("Atlas Financial's regulatory reporting required manual data extraction from 6 trading systems. Each monthly cycle consumed 120 analyst-hours and frequently missed SEC filing deadlines.", {
          fontSize: pt(11), color: DARK_GRAY, lineHeight: 16,
        }),
      ],
      { width: 1170, height: 147, style: { position: "absolute", top: 105, left: 55 }, bg: "#FEF2F2" },
    ),
    card(
      [
        textNode("Our Approach", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        bulletList(
          [
            { text: "Unified 6 trading systems into single data model with full lineage" },
            { text: "Built automated regulatory report templates (SEC, FINRA, OCC)" },
            { text: "Deployed anomaly detection to flag data quality issues pre-submission" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 160, style: { position: "absolute", top: 273, left: 55 } },
    ),
    card(
      [
        textNode("Results (12 Months Post-Launch)", { fontSize: pt(14), fontWeight: "bold", color: "#14532D", marginBottom: 6 }),
        bulletList(
          [
            { text: "Reporting cycle: 5 days → 15 minutes (99.8% reduction)" },
            { text: "Analyst hours saved: 1,200/year → redeployed to strategic analysis" },
            { text: "Zero missed filing deadlines (vs. 4 in prior year)" },
            { text: "Data accuracy: 94% → 99.7%" },
          ],
          { fontSize: pt(11), color: DARK_GRAY },
        ),
      ],
      { width: 1170, height: 173, style: { position: "absolute", top: 453, left: 55 }, bg: "#F0FDF4" },
    ),
  ],
  "Source: Atlas Financial case study (published with permission)",
);

// ---------------------------------------------------------------------------
// Slides 16-17: Team Bios — 6 members in grid (3×2 per slide)
// ---------------------------------------------------------------------------

interface TeamMember {
  name: string;
  title: string;
  bio: string;
}

function teamBioCard(member: TeamMember, col: number, row: number): PaperNode {
  return card(
    [
      {
        type: "Image",
        src: PHOTO_PLACEHOLDER,
        style: { width: 48, height: 48, borderRadius: 24 },
      } as PaperImage,
      textNode(member.name, { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginTop: 6 }),
      textNode(member.title, { fontSize: pt(11), color: "#0070C0", marginTop: 2 }),
      textNode(member.bio, { fontSize: pt(10), color: DARK_GRAY, marginTop: 6, lineHeight: 13 }),
    ],
    {
      width: 360, height: 240,
      style: {
        position: "absolute",
        left: 55 + col * 400,
        top: 105 + row * 267,
      },
    },
  );
}

const teamMembers1: TeamMember[] = [
  { name: "Sarah Chen", title: "Engagement Lead", bio: "15 years enterprise consulting. Former VP at Deloitte Digital. Led 40+ platform implementations." },
  { name: "Marcus Johnson", title: "Solution Architect", bio: "Cloud migration specialist. AWS & Azure certified. Designed systems for 3 Fortune 100 firms." },
  { name: "Elena Rodriguez", title: "Project Manager, PMP", bio: "50+ enterprise implementations. Agile transformation expert. 98% on-time delivery rate." },
];

const teamMembers2: TeamMember[] = [
  { name: "David Kim", title: "Technical Lead", bio: "12 years full-stack engineering. Microservices & API design. Former Google SRE." },
  { name: "Amara Osei", title: "Data Migration Lead", bio: "Specialized in SAP & Oracle migrations. Led 15 zero-downtime cutovers. ETL architecture expert." },
  { name: "James Patterson", title: "Security & Compliance Lead", bio: "CISSP, CISM certified. Former CISO at mid-market bank. SOC 2 & HIPAA audit specialist." },
];

const teamSlide1: PaperSlide = contentSlide(
  "Your dedicated team: proven leaders with deep enterprise expertise",
  teamMembers1.map((m, i) => teamBioCard(m, i, 0)),
);

const teamSlide2: PaperSlide = contentSlide(
  "Technical specialists bring domain-specific depth to your implementation",
  teamMembers2.map((m, i) => teamBioCard(m, i, 0)),
);

// ---------------------------------------------------------------------------
// Slide 18: Security & Compliance — Certification Badges Grid
// ---------------------------------------------------------------------------

const certifications = [
  { name: "SOC 2 Type II", detail: "Annual audit by Deloitte\nLatest report: Oct 2025", color: MBB_NAVY },
  { name: "ISO 27001", detail: "Certified since 2023\nSurveillance audit: Q2 2025", color: MBB_NAVY },
  { name: "GDPR", detail: "Full compliance\nDPA & SCCs available", color: "#1B5E20" },
  { name: "HIPAA", detail: "BAA available\nPHI controls validated", color: "#1B5E20" },
];

const certCards: PaperNode[] = certifications.map((cert, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return card(
    [
      {
        type: "View",
        style: {
          width: 85, height: 85, borderRadius: 43,
          backgroundColor: cert.color, alignItems: "center", justifyContent: "center",
        },
        children: [
          textNode(cert.name.split(" ")[0], { fontSize: pt(11), fontWeight: "bold", color: WHITE, textAlign: "center" }),
        ],
      } as PaperView,
      textNode(cert.name, { fontSize: pt(16), fontWeight: "bold", color: MBB_NAVY, marginTop: 8 }),
      textNode(cert.detail, { fontSize: pt(10), color: DARK_GRAY, marginTop: 4, lineHeight: 13 }),
    ],
    {
      width: 533, height: 213,
      style: { position: "absolute", left: 55 + col * 587, top: 105 + row * 240 },
    },
  );
});

const securitySlide: PaperSlide = contentSlide(
  "Four industry certifications provide independent validation of our security posture",
  certCards,
  "Source: Compliance & Security — Certification registry",
);

// ---------------------------------------------------------------------------
// Slide 19: Pricing Summary — 3-Year TCO Table
// ---------------------------------------------------------------------------

const pricingSlide: PaperSlide = contentSlide(
  "3-year TCO of $1.47M delivers 38% savings vs. incumbent multi-vendor approach",
  [
    financialTable(
      ["Component", "Year 1", "Year 2", "Year 3", "3-Year Total"],
      [
        ["Platform License (250 seats)", "$225,000", "$225,000", "$225,000", "$675,000"],
        ["Implementation Services", "$180,000", "$0", "$0", "$180,000"],
        ["Data Migration", "$95,000", "$0", "$0", "$95,000"],
        ["Training & Enablement", "$35,000", "$15,000", "$10,000", "$60,000"],
        ["Premium Support (24/7)", "$45,000", "$45,000", "$45,000", "$135,000"],
        ["Infrastructure (cloud)", "$75,000", "$82,000", "$90,000", "$247,000"],
        ["Contingency (10%)", "$65,500", "$36,700", "$37,000", "$139,200"],
        ["Total", "$720,500", "$403,700", "$407,000", "$1,531,200"],
      ],
      {
        alternatingRows: true,
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Investment by Year", colSpan: 3 },
          { text: "", colSpan: 1 },
        ],
      },
    ),
  ],
  "Source: Commercial Proposal — Pricing Schedule A",
  { notes: "Emphasize the 38% TCO savings vs. incumbent and note that volume discounts are available for multi-year commitments." },
);

// ---------------------------------------------------------------------------
// Slide 20: Implementation Timeline — Phase Gate Diagram
// ---------------------------------------------------------------------------

const phaseGateSlide: PaperSlide = contentSlide(
  "Four phase gates ensure quality and alignment at every major milestone",
  [
    // Phase boxes
    archComponent("Phase 1\nDiscovery", 55, 160, MBB_BLUE, { width: 240, height: 93 }),
    archComponent("Phase 2\nBuild", 347, 160, "#0070C0", { width: 240, height: 93 }),
    archComponent("Phase 3\nTest", 640, 160, GREEN, { width: 240, height: 93 }),
    archComponent("Phase 4\nLaunch", 933, 160, AMBER, { width: 240, height: 93 }),

    // Gate diamonds (represented as small cards)
    card(
      [textNode("Gate 1", { fontSize: pt(9), fontWeight: "bold", color: WHITE, textAlign: "center" })],
      { width: 53, height: 40, bg: MBB_NAVY, padding: 4, style: { position: "absolute", left: 307, top: 187 } },
    ),
    card(
      [textNode("Gate 2", { fontSize: pt(9), fontWeight: "bold", color: WHITE, textAlign: "center" })],
      { width: 53, height: 40, bg: MBB_NAVY, padding: 4, style: { position: "absolute", left: 600, top: 187 } },
    ),
    card(
      [textNode("Gate 3", { fontSize: pt(9), fontWeight: "bold", color: WHITE, textAlign: "center" })],
      { width: 53, height: 40, bg: MBB_NAVY, padding: 4, style: { position: "absolute", left: 893, top: 187 } },
    ),

    // Connectors between phases
    connector(293, 207, 347, 207, { arrowEnd: true, color: MBB_NAVY, width: 2 }),
    connector(587, 207, 640, 207, { arrowEnd: true, color: MBB_NAVY, width: 2 }),
    connector(880, 207, 933, 207, { arrowEnd: true, color: MBB_NAVY, width: 2 }),

    // Phase details
    card(
      [
        textNode("Weeks 1-3", { fontSize: pt(11), fontWeight: "bold", color: MBB_BLUE }),
        bulletList(
          [
            { text: "Stakeholder alignment" },
            { text: "Technical discovery" },
            { text: "Architecture sign-off" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 240, height: 173, style: { position: "absolute", top: 293, left: 55 } },
    ),
    card(
      [
        textNode("Weeks 4-9", { fontSize: pt(11), fontWeight: "bold", color: "#0070C0" }),
        bulletList(
          [
            { text: "Platform configuration" },
            { text: "Data migration Wave 1" },
            { text: "Integration development" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 240, height: 173, style: { position: "absolute", top: 293, left: 347 } },
    ),
    card(
      [
        textNode("Weeks 8-13", { fontSize: pt(11), fontWeight: "bold", color: GREEN }),
        bulletList(
          [
            { text: "UAT with 20 users" },
            { text: "Performance validation" },
            { text: "Defect remediation" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 240, height: 173, style: { position: "absolute", top: 293, left: 640 } },
    ),
    card(
      [
        textNode("Weeks 12-16", { fontSize: pt(11), fontWeight: "bold", color: AMBER }),
        bulletList(
          [
            { text: "End-user training" },
            { text: "Staged rollout" },
            { text: "30-day hypercare" },
          ],
          { fontSize: pt(10), color: DARK_GRAY },
        ),
      ],
      { width: 240, height: 173, style: { position: "absolute", top: 293, left: 933 } },
    ),
  ],
  "Source: Implementation Plan — Phase Gate Framework v1.2",
);

// ---------------------------------------------------------------------------
// Slide 21: Next Steps — 5 Numbered Action Items
// ---------------------------------------------------------------------------

const nextStepsSlide: PaperSlide = contentSlide(
  "Five clear next steps to move from proposal to signed contract",
  [
    card(
      [
        textNode("1", { fontSize: pt(22), fontWeight: "bold", color: WHITE, textAlign: "center" }),
      ],
      { width: 53, height: 53, bg: MBB_BLUE, padding: 8, style: { position: "absolute", top: 120, left: 55 } },
    ),
    textNode("Schedule technical deep-dive with your IT architecture team (Week of March 11)", {
      position: "absolute", top: 128, left: 133, width: 1070, fontSize: pt(14), color: MBB_NAVY,
    }),

    card(
      [
        textNode("2", { fontSize: pt(22), fontWeight: "bold", color: WHITE, textAlign: "center" }),
      ],
      { width: 53, height: 53, bg: MBB_BLUE, padding: 8, style: { position: "absolute", top: 207, left: 55 } },
    ),
    textNode("Conduct reference calls with Meridian Health and Atlas Financial (Week of March 18)", {
      position: "absolute", top: 215, left: 133, width: 1070, fontSize: pt(14), color: MBB_NAVY,
    }),

    card(
      [
        textNode("3", { fontSize: pt(22), fontWeight: "bold", color: WHITE, textAlign: "center" }),
      ],
      { width: 53, height: 53, bg: MBB_BLUE, padding: 8, style: { position: "absolute", top: 293, left: 55 } },
    ),
    textNode("Complete security questionnaire review with your CISO office (Week of March 25)", {
      position: "absolute", top: 301, left: 133, width: 1070, fontSize: pt(14), color: MBB_NAVY,
    }),

    card(
      [
        textNode("4", { fontSize: pt(22), fontWeight: "bold", color: WHITE, textAlign: "center" }),
      ],
      { width: 53, height: 53, bg: MBB_BLUE, padding: 8, style: { position: "absolute", top: 380, left: 55 } },
    ),
    textNode("Finalize commercial terms and negotiate Master Services Agreement (Week of April 1)", {
      position: "absolute", top: 388, left: 133, width: 1070, fontSize: pt(14), color: MBB_NAVY,
    }),

    card(
      [
        textNode("5", { fontSize: pt(22), fontWeight: "bold", color: WHITE, textAlign: "center" }),
      ],
      { width: 53, height: 53, bg: MBB_BLUE, padding: 8, style: { position: "absolute", top: 467, left: 55 } },
    ),
    textNode("Execute contract and kick off Phase 1 Discovery (Target: April 14, 2026)", {
      position: "absolute", top: 475, left: 133, width: 1070, fontSize: pt(14), color: MBB_NAVY, fontWeight: "bold",
    }),
  ],
);

// ---------------------------------------------------------------------------
// Slide 22: Contact & Legal
// ---------------------------------------------------------------------------

const contactSlide: PaperSlide = {
  type: "Slide",
  background: DARK_GRADIENT,
  children: [
    accentBar(MBB_BLUE),
    textNode("Thank You", {
      position: "absolute", top: 133, left: 80, width: 1120,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    // Contact info
    card(
      [
        textNode("Primary Contact", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        textNode("Sarah Chen, Engagement Lead", { fontSize: pt(11), color: DARK_GRAY }),
        textNode("sarah.chen@company.com  •  +1 (415) 555-0142", { fontSize: pt(11), color: MID_GRAY, marginTop: 4 }),
        textNode("123 Market Street, Suite 400, San Francisco, CA 94105", { fontSize: pt(11), color: MID_GRAY, marginTop: 2 }),
      ],
      { width: 533, height: 173, style: { position: "absolute", top: 240, left: 80 } },
    ),
    card(
      [
        textNode("Legal & Procurement", { fontSize: pt(14), fontWeight: "bold", color: MBB_NAVY, marginBottom: 6 }),
        textNode("James Patterson, VP Legal", { fontSize: pt(11), color: DARK_GRAY }),
        textNode("legal@company.com  •  +1 (415) 555-0199", { fontSize: pt(11), color: MID_GRAY, marginTop: 4 }),
        textNode("Contract terms valid for 90 days from submission date", { fontSize: pt(11), color: MID_GRAY, marginTop: 2 }),
      ],
      { width: 533, height: 173, style: { position: "absolute", top: 240, left: 640 } },
    ),
    // Legal disclaimer
    textNode("This proposal is confidential and intended solely for GlobalCorp. Pricing is valid through June 30, 2026. All terms are subject to mutual agreement on a Master Services Agreement. This document does not constitute a binding contract.", {
      position: "absolute", top: 507, left: 80, width: 1120,
      fontSize: pt(9), color: MID_GRAY, lineHeight: 12,
    }),
    // Logos
    {
      type: "Image",
      src: LOGO_PLACEHOLDER,
      style: { position: "absolute", top: 613, left: 80, width: 133, height: 47 },
    } as PaperImage,
    {
      type: "Image",
      src: LOGO_PLACEHOLDER,
      style: { position: "absolute", top: 613, left: 1067, width: 133, height: 47 },
    } as PaperImage,
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const rfpResponseDeck: PaperDocument = makeDoc(
  [
    coverSlide,          // 1
    execSummarySlide,    // 2
    reqSlide1,           // 3
    reqSlide2,           // 4
    complianceSlide,     // 5
    archSlide1,          // 6
    archSlide2,          // 7
    deepDive1,           // 8
    deepDive2,           // 9
    deepDive3,           // 10
    implSlide1,          // 11
    implSlide2,          // 12
    successMetricsSlide, // 13
    caseStudy1,          // 14
    caseStudy2,          // 15
    teamSlide1,          // 16
    teamSlide2,          // 17
    securitySlide,       // 18
    pricingSlide,        // 19
    phaseGateSlide,      // 20
    nextStepsSlide,      // 21
    contactSlide,        // 22
  ],
  { title: "GlobalCorp — Response to RFP #2026-0142" },
);
