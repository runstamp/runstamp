// chart-slide.ts -- Editable bar chart with categories and series.
// The chart embeds a real Excel worksheet so users can right-click -> Edit Data.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/chart-slide.ts

import fs from "node:fs";
import { PaperEngine, type PaperDocument } from "../dist-lite/index.js";

const doc: PaperDocument = {
  meta: { title: "Quarterly Revenue" },
  slides: [
    {
      backgroundColor: "#F8FAFC",
      children: [
        // Slide title
        {
          type: "Text",
          content: "Quarterly Revenue by Region",
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
        // Editable bar chart
        {
          type: "Chart",
          style: {
            position: "absolute",
            top: 100,
            left: 60,
            width: 1160,
            height: 530,
          },
          chartData: {
            chartType: "bar",
            categories: ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"],
            series: [
              {
                name: "North America",
                values: [4200, 4800, 5100, 5600],
                color: "#2563EB",
              },
              {
                name: "Europe",
                values: [3100, 3400, 3700, 4000],
                color: "#7C3AED",
              },
              {
                name: "Asia Pacific",
                values: [2800, 3200, 3900, 4500],
                color: "#059669",
              },
            ],
            categoryAxis: { title: "Quarter" },
            valueAxis: {
              title: "Revenue ($K)",
              numberFormat: "$#,##0",
            },
            dataLabels: { showVal: true, position: "outEnd" },
          },
        },
      ],
    },
  ],
};

const pptx = await PaperEngine.render(doc);
fs.writeFileSync("chart-slide.pptx", pptx);
console.log("Wrote chart-slide.pptx");
