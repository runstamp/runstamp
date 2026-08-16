// agent-document.ts -- Legacy compatibility example using AgentDocument + compileAgentDocument().
// New public integrations should prefer the V2 PresentationSpec protocol. This example remains
// for older consumers that still depend on the AgentDocument semantic pattern contract, including
// the built-in theme presets and token overrides added for agent-mode deck styling.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/agent-document.ts

import fs from "node:fs";
import {
  PaperEngine,
  compileAgentDocument,
  type AgentDocument,
} from "../dist-lite/index.js";

const agentDoc: AgentDocument = {
  type: "presentation",
  version: "1.0",
  presentationTitle: "FY2025 Business Review",
  companyName: "Acme Corporation",
  accentColor: "#2563EB",
  theme: "editorial-serif",
  designTokens: {
    colors: {
      accent: "#C2410C",
    },
    typography: {
      heroTitleSize: 40,
      chartTitleSize: 18,
    },
  },
  slides: [
    {
      pattern: "title",
      content: {
        title: "FY2025 Business Review",
        subtitle: "Annual performance summary and outlook for Acme Corporation",
      },
    },
    {
      pattern: "dashboard",
      content: {
        title: "Key Performance Indicators",
        kpis: [
          { label: "Annual Revenue", value: "$48.2M", trend: "up", sublabel: "+18% YoY" },
          { label: "Gross Margin", value: "72.4%", trend: "up", sublabel: "+3.1pp" },
          { label: "Customer Count", value: "1,247", trend: "up", sublabel: "+205 net new" },
          { label: "NPS Score", value: "67", trend: "flat", sublabel: "Industry avg: 42" },
        ],
      },
    },
    {
      pattern: "chart-focus",
      content: {
        title: "Revenue Trend by Quarter",
        chart: {
          type: "bar",
          title: "Quarterly Revenue ($M)",
          series: [
            {
              name: "Product",
              dataPoints: [
                { category: "Q1", value: 8.2 },
                { category: "Q2", value: 9.4 },
                { category: "Q3", value: 10.8 },
                { category: "Q4", value: 12.1 },
              ],
            },
            {
              name: "Services",
              dataPoints: [
                { category: "Q1", value: 1.5 },
                { category: "Q2", value: 1.8 },
                { category: "Q3", value: 2.1 },
                { category: "Q4", value: 2.3 },
              ],
            },
          ],
        },
      },
    },
    {
      pattern: "bullets",
      content: {
        title: "Strategic Priorities for FY2026",
        bulletPoints: [
          "Expand enterprise sales team by 40% in North America and EMEA",
          "Launch self-serve platform targeting SMB segment ($10K-50K ACV)",
          "Achieve SOC 2 Type II and ISO 27001 certifications by Q2",
          "Release API v3 with real-time collaboration features",
          "Grow partner ecosystem to 25+ certified integration partners",
        ],
      },
    },
    {
      pattern: "chart-focus",
      content: {
        title: "Customer Growth Trajectory",
        chart: {
          type: "line",
          title: "Active Customers",
          series: [
            {
              name: "Enterprise",
              dataPoints: [
                { category: "Jan", value: 340 },
                { category: "Mar", value: 385 },
                { category: "May", value: 420 },
                { category: "Jul", value: 465 },
                { category: "Sep", value: 510 },
                { category: "Nov", value: 558 },
              ],
            },
            {
              name: "SMB",
              dataPoints: [
                { category: "Jan", value: 480 },
                { category: "Mar", value: 520 },
                { category: "May", value: 570 },
                { category: "Jul", value: 610 },
                { category: "Sep", value: 645 },
                { category: "Nov", value: 689 },
              ],
            },
          ],
        },
      },
    },
    {
      pattern: "statement",
      content: {
        title: "Thank You",
        subtitle: "Questions and discussion",
      },
    },
  ],
};

const paperDoc = compileAgentDocument(agentDoc);
const pptx = await PaperEngine.render(paperDoc);
fs.writeFileSync("agent-document.pptx", pptx);
console.log("Wrote agent-document.pptx");
