// agent-theme-presets.ts -- Generate one sample deck per built-in agent theme preset.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/agent-theme-presets.ts

import fs from "node:fs";
import path from "node:path";
import {
  PaperEngine,
  compileAgentDocument,
  type AgentDocument,
  type AgentThemePreset,
} from "../dist-lite/index.js";

const PRESETS: readonly AgentThemePreset[] = [
  "default-navy",
  "editorial-serif",
  "monochrome",
  "dark-punch",
  "midnight",
  "terminal",
  "editorial-wide",
];

const outputDir = path.join(process.cwd(), "agent-theme-presets");
fs.mkdirSync(outputDir, { recursive: true });

function buildPresetDoc(theme: AgentThemePreset): AgentDocument {
  return {
    type: "presentation",
    version: "1.0",
    presentationTitle: `${theme} preset sample`,
    companyName: "Runstamp",
    theme,
    slides: [
      {
        pattern: "title",
        content: {
          title: `${theme} preset`,
          subtitle: "Built-in agent-mode theme sample",
        },
      },
      {
        pattern: "dashboard",
        content: {
          title: "Quarterly snapshot",
          subtitle: "Preset verification",
          kpis: [
            { label: "ARR", value: "$12.4M", trend: "up", sublabel: "+41% YoY" },
            { label: "NRR", value: "118%", trend: "up", sublabel: "+4 pts" },
            { label: "Pipeline", value: "$6.1M", trend: "flat", sublabel: "3x coverage" },
            { label: "CAC Payback", value: "11 mo", trend: "down", sublabel: "-2 mo" },
          ],
          chart: {
            type: "bar",
            title: "Quarterly revenue",
            series: [
              {
                name: "Revenue",
                dataPoints: [
                  { category: "Q1", value: 8.4 },
                  { category: "Q2", value: 9.6 },
                  { category: "Q3", value: 11.2 },
                  { category: "Q4", value: 12.8 },
                ],
              },
            ],
          },
        },
      },
    ],
  };
}

for (const theme of PRESETS) {
  const paperDoc = compileAgentDocument(buildPresetDoc(theme));
  const pptx = await PaperEngine.render(paperDoc);
  const outputPath = path.join(outputDir, `${theme}.pptx`);
  fs.writeFileSync(outputPath, pptx);
  console.log(`Wrote ${outputPath}`);
}
