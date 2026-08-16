import type { PaperDocument } from "../../../src/index.js";

export const chartExDeck: PaperDocument = {
  type: "Document",
  meta: { title: "ChartEx Treemap Corpus" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "ChartEx coverage is part of the permanent desktop corpus",
          style: {
            position: "absolute",
            left: 52,
            top: 32,
            width: 860,
            height: 42,
            fontSize: 24,
            fontWeight: "bold",
          },
        },
        {
          type: "Chart",
          style: {
            position: "absolute",
            left: 70,
            top: 102,
            width: 820,
            height: 340,
          },
          chartData: {
            chartType: "treemap",
            title: { text: "ARR by product family", fontSize: 18, bold: true },
            treemapData: {
              categories: [
                {
                  name: "Platform",
                  children: [
                    { name: "Core", value: 58, color: "#2563EB" },
                    { name: "Automation", value: 24, color: "#0EA5E9" },
                  ],
                },
                {
                  name: "Services",
                  children: [
                    { name: "Implementation", value: 18, color: "#F97316" },
                    { name: "Advisory", value: 12, color: "#FB923C" },
                  ],
                },
              ],
            },
          },
        },
      ],
    },
  ],
};
