// styled-table.ts -- Table with header styling, alternating row bands, and borders.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/styled-table.ts

import fs from "node:fs";
import { PaperEngine, type PaperDocument } from "../dist-lite/index.js";

const doc: PaperDocument = {
  meta: { title: "Sales Pipeline" },
  slides: [
    {
      backgroundColor: "#FFFFFF",
      children: [
        // Title
        {
          type: "Text",
          content: "Sales Pipeline Summary",
          style: {
            position: "absolute",
            top: 30,
            left: 60,
            width: 600,
            height: 50,
            fontSize: 28,
            fontWeight: "bold",
            color: "#0F172A",
          },
        },
        // Table
        {
          type: "Table",
          style: {
            position: "absolute",
            top: 110,
            left: 60,
            width: 1160,
            height: 480,
          },
          tableData: {
            columns: [280, 220, 180, 180, 160, 140],
            rows: [
              {
                height: 50,
                cells: [
                  { text: "Account" },
                  { text: "Contact" },
                  { text: "Stage" },
                  { text: "Value" },
                  { text: "Close Date" },
                  { text: "Probability" },
                ],
              },
              {
                cells: [
                  { text: "Acme Corp" },
                  { text: "Jane Smith" },
                  { text: "Negotiation" },
                  { text: "$240,000", style: { fontWeight: "bold" } },
                  { text: "2025-04-15" },
                  { text: "75%", style: { color: "#059669" } },
                ],
              },
              {
                cells: [
                  { text: "Globex Inc" },
                  { text: "Bob Chen" },
                  { text: "Proposal" },
                  { text: "$185,000", style: { fontWeight: "bold" } },
                  { text: "2025-05-01" },
                  { text: "50%", style: { color: "#D97706" } },
                ],
              },
              {
                cells: [
                  { text: "Initech" },
                  { text: "Carol Davis" },
                  { text: "Discovery" },
                  { text: "$320,000", style: { fontWeight: "bold" } },
                  { text: "2025-06-30" },
                  { text: "25%", style: { color: "#DC2626" } },
                ],
              },
              {
                cells: [
                  { text: "Umbrella Ltd" },
                  { text: "David Park" },
                  { text: "Closed Won" },
                  { text: "$410,000", style: { fontWeight: "bold" } },
                  { text: "2025-03-01" },
                  { text: "100%", style: { color: "#059669", fontWeight: "bold" } },
                ],
              },
              {
                cells: [
                  { text: "Stark Industries" },
                  { text: "Pepper Potts" },
                  { text: "Qualification" },
                  { text: "$95,000", style: { fontWeight: "bold" } },
                  { text: "2025-07-15" },
                  { text: "10%", style: { color: "#DC2626" } },
                ],
              },
            ],
            style: {
              firstRow: true,
              bandRow: true,
              headerRowStyle: {
                fill: "#1E40AF",
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: 14,
                textAlign: "center",
              },
              bandRowEvenStyle: {
                fill: "#EFF6FF",
              },
              bandRowOddStyle: {
                fill: "#FFFFFF",
              },
              outerBorder: { width: 1, color: "#CBD5E1" },
              innerBorderH: { width: 0.5, color: "#E2E8F0" },
              innerBorderV: { width: 0.5, color: "#E2E8F0" },
            },
          },
        },
      ],
    },
  ],
};

const pptx = await PaperEngine.render(doc);
fs.writeFileSync("styled-table.pptx", pptx);
console.log("Wrote styled-table.pptx");
