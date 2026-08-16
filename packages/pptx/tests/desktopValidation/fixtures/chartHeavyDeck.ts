import type { PaperDocument } from "../../../src/index.js";

export const chartHeavyDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Chart Heavy Corpus" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Legend reservation should not shrink plot area to 2/3 width",
          style: {
            position: "absolute",
            left: 54,
            top: 28,
            width: 860,
            height: 44,
            fontSize: 24,
            fontWeight: "bold",
          },
        },
        {
          type: "Chart",
          style: {
            position: "absolute",
            left: 60,
            top: 96,
            width: 840,
            height: 360,
          },
          chartData: {
            chartType: "line",
            title: { text: "Pipeline coverage by segment", fontSize: 18, bold: true },
            categories: ["SMB", "Mid-market", "Enterprise", "Public Sector", "Partners"],
            legend: { position: "right", fontSize: 11, fontFamily: "Aptos" },
            dataLabels: { showVal: true, position: "bestFit", fontSize: 9 },
            categoryAxis: { labelRotation: -20, labelFont: { fontSize: 10, fontFamily: "Aptos" } },
            valueAxis: { gridlines: { major: true, color: "#E2E8F0" }, labelFont: { fontSize: 10 } },
            series: [
              { name: "Coverage", values: [2.1, 2.7, 3.4, 2.8, 2.3], color: "#2563EB" },
              { name: "Target", values: [2.5, 2.8, 3.1, 2.9, 2.4], color: "#16A34A" },
              { name: "Prior quarter", values: [1.8, 2.3, 3.0, 2.2, 2.0], color: "#F97316" },
            ],
          },
        },
      ],
    },
    {
      type: "Slide",
      children: [
        {
          type: "Chart",
          style: {
            position: "absolute",
            left: 48,
            top: 48,
            width: 410,
            height: 380,
          },
          chartData: {
            chartType: "pie",
            title: { text: "Revenue mix", fontSize: 16, bold: true },
            legend: { position: "bottom", fontSize: 10 },
            dataLabels: { showPercent: true, showCatName: true, position: "bestFit", fontSize: 9 },
            categories: ["Platform", "Services", "Support", "Usage"],
            series: [{ name: "FY26", values: [52, 21, 14, 13], color: "#2563EB" }],
          },
        },
        {
          type: "Chart",
          style: {
            position: "absolute",
            left: 492,
            top: 48,
            width: 410,
            height: 380,
          },
          chartData: {
            chartType: "bar",
            title: { text: "Expansion drivers", fontSize: 16, bold: true },
            categories: ["Seat growth", "New SKUs", "Price uplift", "Renewal recovery"],
            legend: { position: "bottom", fontSize: 10 },
            dataLabels: { showVal: true, position: "outEnd", fontSize: 9 },
            series: [
              { name: "Contribution ($M)", values: [8.1, 4.4, 3.2, 2.7], color: "#0EA5E9" },
            ],
          },
        },
      ],
    },
  ],
};
