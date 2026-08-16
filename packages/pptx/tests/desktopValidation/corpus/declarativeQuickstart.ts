import { PaperEngine, compileDeclarativeDocument } from "../../../src/index.js";

// JSON-equivalent to packages/core/quickstart/pptx.mjs. This buffer-builder
// form ensures the desktop corpus exercises the public declarative compiler.
const publicQuickstartDocument = {
  title: "Q3 Board Review",
  slides: [
    { layout: "title", title: "Q3 Board Review", subtitle: "October 2026" },
    {
      layout: "kpi-row",
      title: "Operating metrics",
      metrics: [
        { label: "ARR", value: "$4.2M", delta: "+18%" },
        { label: "NRR", value: "112%", delta: "+4pt" },
        { label: "Pipeline", value: "$8.6M", delta: "+12%" },
      ],
    },
    {
      layout: "chart",
      title: "Revenue accelerated through Q3",
      chart: {
        kind: "bar",
        series: [{
          name: "Revenue",
          dataPoints: [
            { category: "Q1", value: 1.8 },
            { category: "Q2", value: 2.4 },
            { category: "Q3", value: 3.1 },
          ],
        }],
      },
    },
  ],
} as const;

export async function buildDeclarativeQuickstartDeck(): Promise<Buffer> {
  return PaperEngine.render(compileDeclarativeDocument(publicQuickstartDocument));
}
