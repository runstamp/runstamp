import { describe, expect, it } from "vitest";
import { PaperEngine } from "../src/engine.js";
import {
  inspectPptxEditability,
  mergeEditabilityProbeIntoQualityReport,
} from "../src/quality/editabilityProbe.js";
import type { PaperDocument } from "../src/types/ast.js";

function makeEditableProbeDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Editability probe" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            paragraphs: [
              {
                runs: [{ text: "Native bullet" }],
                bullet: { type: "char", char: "*" },
                level: 0,
              },
            ],
            style: { position: "absolute", left: 40, top: 30, width: 260, height: 60 },
          },
          {
            type: "Table",
            tableData: {
              columns: [120, 120],
              rows: [
                { cells: [{ text: "A" }, { text: "B" }] },
                { cells: [{ text: "1" }, { text: "2" }] },
              ],
            },
            style: { position: "absolute", left: 40, top: 110, width: 240, height: 120 },
          },
          {
            type: "Chart",
            chartData: {
              chartType: "bar",
              categories: ["Q1", "Q2"],
              series: [{ name: "Revenue", values: [4, 7] }],
            },
            style: { position: "absolute", left: 340, top: 70, width: 360, height: 260 },
          },
          {
            type: "Connector",
            connectorType: "straight",
            start: { x: 80, y: 280 },
            end: { x: 280, y: 330 },
            lineWidth: 2,
            lineColor: "#334155",
          },
        ],
      },
    ],
  };
}

describe("PPTX editability probe", () => {
  it("reports native editable components from generated slide XML", async () => {
    const result = await PaperEngine.renderWithQualityReport(makeEditableProbeDeck(), undefined, {
      validationMode: "structural",
    });
    const probe = await inspectPptxEditability(result.pptx);
    const merged = mergeEditabilityProbeIntoQualityReport(result.qualityReport, probe);

    expect(probe.status).toBe("passed");
    expect(probe.slideCount).toBe(1);
    expect(probe.slides[0]).toMatchObject({
      nativeChartCount: 1,
      nativeTableCount: 1,
      nativeBulletParagraphCount: 1,
      nativeConnectorCount: 1,
    });
    expect(merged.editabilityProbe?.nativeComponentCount).toBeGreaterThanOrEqual(4);
  });
});
