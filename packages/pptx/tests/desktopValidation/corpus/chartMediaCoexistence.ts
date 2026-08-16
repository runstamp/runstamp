import type { PaperDocument } from "../../../src/index.js";
import { RED_PIXEL } from "../../helpers/xmlTestUtils.js";

/** Regression fixture for the chart + media relationship repair-prompt class. */
export const chartMediaCoexistenceDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Chart and Media Coexistence" },
  slides: [{
    type: "Slide",
    children: [
      {
        type: "Text",
        content: "Chart and media relationships remain independently resolvable",
        style: {
          position: "absolute",
          left: 56,
          top: 38,
          width: 840,
          height: 44,
          fontSize: 24,
          fontFamily: "Aptos",
          fontWeight: "bold",
          color: "#0F172A",
        },
      },
      {
        type: "Chart",
        style: { position: "absolute", left: 56, top: 112, width: 620, height: 330 },
        chartData: {
          chartType: "bar",
          categories: ["Q1", "Q2", "Q3"],
          series: [{ name: "Revenue", values: [12, 18, 27], color: "#2563EB" }],
          legend: { position: "bottom", fontFamily: "Aptos", fontSize: 10 },
        },
      },
      {
        type: "Image",
        src: RED_PIXEL,
        altText: "Red pixel relationship probe",
        style: { position: "absolute", left: 728, top: 176, width: 144, height: 144 },
      },
    ],
  }],
};
