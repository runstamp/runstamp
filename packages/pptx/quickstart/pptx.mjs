import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  render,
  validate,
} from "@runstamp/pptx";

export const doc = {
  title: "Q3 Board Review",
  slides: [
    {
      layout: "title",
      title: "Q3 Board Review",
      subtitle: "October 2026",
    },
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
};

const result = validate(doc);
if (!result.ok) {
  console.error(JSON.stringify(result.issues, null, 2));
  process.exitCode = 1;
} else {
  const outputPath = resolve(process.argv[2] ?? "runstamp-quickstart.pptx");
  const pptx = await render(doc, { deterministic: true });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pptx);
  console.log(`Wrote ${outputPath}`);
}
