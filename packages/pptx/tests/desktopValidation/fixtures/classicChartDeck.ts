import type { PaperDocument } from "../../../src/index.js";

export const classicChartDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Classic Chart Baseline" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Quarterly bookings expanded in every region",
          style: {
            position: "absolute",
            left: 64,
            top: 42,
            width: 840,
            height: 50,
            fontSize: 28,
            fontWeight: "bold",
            fontFamily: "Aptos",
            color: "#0F172A",
          },
        },
        {
          type: "Chart",
          style: {
            position: "absolute",
            left: 72,
            top: 118,
            width: 816,
            height: 346,
          },
          chartData: {
            chartType: "bar",
            categories: ["North America", "Europe", "APAC", "LATAM"],
            title: {
              text: "Bookings by region",
              fontFamily: "Aptos",
              fontSize: 18,
              bold: true,
            },
            legend: {
              position: "bottom",
              fontFamily: "Aptos",
              fontSize: 11,
            },
            dataLabels: {
              showVal: true,
              position: "outEnd",
              fontFamily: "Aptos",
              fontSize: 10,
            },
            categoryAxis: {
              labelFont: { fontFamily: "Aptos", fontSize: 11 },
            },
            valueAxis: {
              labelFont: { fontFamily: "Aptos", fontSize: 11 },
              gridlines: { major: true, color: "#CBD5E1" },
            },
            series: [
              { name: "FY25", values: [42, 28, 31, 12], color: "#2563EB" },
              { name: "FY26", values: [54, 34, 39, 17], color: "#F97316" },
            ],
          },
        },
      ],
    },
  ],
};
