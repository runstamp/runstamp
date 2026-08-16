# Getting Started with @runstamp/pptx

Generate native, editable PowerPoint files from declarative JSON. No COM automation, no LibreOffice, no templates required.

## Installation

```bash
npm install @runstamp/pptx
```

Requires Node.js 18 or later.

## Recommended Local Flow

For new local usage, start with `PaperEngine.render(...)` and a `PaperDocument` AST. If you are building against the public hosted runtime, use `sourceSchema: "protocol_v2"` there and treat this package as the local PPTX renderer. `compileAgentDocument(...)` remains available below for older integrations.

## Your First Slide

```typescript docs-verify=render
import { PaperEngine } from "@runstamp/pptx";
import { writeFileSync } from "node:fs";

const doc = {
  type: "Document",
  meta: { title: "Hello, PowerPoint" },
  slides: [{
    type: "Slide",
    children: [
      { type: "Text", content: "Hello, PowerPoint", style: { x: 100, y: 80, fontSize: 36, fontWeight: "bold" } },
      { type: "Text", content: "Generated with @runstamp/pptx", style: { x: 100, y: 160, fontSize: 18, color: "#666666" } },
    ],
  }],
};

const buffer = await PaperEngine.render(doc);
writeFileSync("output.pptx", buffer);
```

Run the file and open `output.pptx` in PowerPoint, Keynote, or Google Slides:

```bash
npx tsx your-file.ts
```

## Adding a Chart

Charts are embedded with a real Excel workbook, so recipients can edit the data directly in PowerPoint.

```typescript docs-verify=render
const doc = {
  type: "Document",
  meta: { title: "Q4 Revenue" },
  slides: [{
    type: "Slide",
    children: [
      { type: "Text", content: "Q4 Revenue", style: { x: 100, y: 40, fontSize: 28, fontWeight: "bold" } },
      {
        type: "Chart",
        style: { x: 80, y: 100, width: 500, height: 350 },
        chartData: {
          chartType: "bar",
          categories: ["Oct", "Nov", "Dec"],
          series: [
            { name: "Product A", values: [120, 150, 180] },
            { name: "Product B", values: [90, 110, 140] },
          ],
          colors: ["#2563EB", "#F59E0B"],
        },
      },
    ],
  }],
};

const buffer = await PaperEngine.render(doc);
```

See [chart-types.md](chart-types.md) for all six supported chart types and their configuration options.

## Adding a Table

```typescript docs-verify=render
const doc = {
  type: "Document",
  meta: { title: "Regional Revenue Table" },
  slides: [{
    type: "Slide",
    children: [
      {
        type: "Table",
        style: { x: 80, y: 60 },
        tableData: {
          columns: [200, 120, 120],
          rows: [
            { cells: [{ text: "Region" }, { text: "Q3" }, { text: "Q4" }] },
            { cells: [{ text: "North" }, { text: "$1.2M" }, { text: "$1.5M" }] },
            { cells: [{ text: "South" }, { text: "$0.8M" }, { text: "$1.1M" }] },
          ],
          style: {
            headerRow: true,
            bandedRows: true,
            headerFill: "#1E3A5F",
            headerFontColor: "#FFFFFF",
          },
        },
      },
    ],
  }],
};
```

## Font Loading

Embed your fonts or accept metric drift.

Text measurement controls wrapping and layout fit. If the render host measures one font and the deck opens with another, headings and labels can reflow. For reliable output, load the exact font files you intend to ship:

```typescript docs-verify=render
import { PaperEngine, loadFont } from "@runstamp/pptx";
import { readFileSync } from "node:fs";

loadFont("Inter", readFileSync("./fonts/Inter-Regular.ttf"));

const doc = {
  type: "Document",
  meta: { title: "Loaded font example" },
  slides: [{
    type: "Slide",
    children: [
      {
        type: "Text",
        content: "Measured with Inter",
        style: { fontFamily: "Inter", fontSize: 28, color: "#0F172A" },
      },
    ],
  }],
};

const buffer = await PaperEngine.render(doc);
```

## Auto-loading Installed Fonts

If you want to use installed system fonts without reading the files manually, call `autoLoadDocumentFonts(...)` first:

```typescript docs-verify=render
import { PaperEngine, autoLoadDocumentFonts } from "@runstamp/pptx";

const doc = {
  type: "Document",
  meta: { title: "Auto-loaded font example" },
  slides: [{
    type: "Slide",
    children: [
      {
        type: "Text",
        content: "Measured with Arial",
        style: { fontFamily: "Arial", fontSize: 28, color: "#0F172A" },
      },
    ],
  }],
};

await autoLoadDocumentFonts(doc);
const buffer = await PaperEngine.render(doc);
```

For quick drafts and CI environments where you do not plan to ship custom font files, prefer `Liberation Sans` or `DejaVu Sans`.

## Legacy Semantic Compatibility

If you are maintaining an older integration, the `AgentDocument` format is still available as a legacy semantic compatibility layer. New public integrations should prefer the hosted `protocol_v2` contract and either use the hosted runtime or compile into `PaperDocument` upstream.

```typescript docs-verify=render
import { compileAgentDocument, applyElasticPagination, PaperEngine } from "@runstamp/pptx";

const agentDoc = {
  presentationTitle: "Quarterly Review",
  slides: [
    {
      pattern: "title",
      content: { title: "Q4 Results", subtitle: "Financial Summary" },
    },
    {
      pattern: "chart-focus",
      content: {
        title: "Revenue Trend",
        chart: {
          type: "line",
          series: [
            {
              name: "Revenue",
              dataPoints: [
                { category: "Q1", value: 10 },
                { category: "Q2", value: 20 },
                { category: "Q3", value: 35 },
                { category: "Q4", value: 50 },
              ],
            },
          ],
        },
      },
    },
  ],
};

const paperDoc = compileAgentDocument(agentDoc);
const paginated = applyElasticPagination(paperDoc);
const buffer = await PaperEngine.render(paginated);
```

The legacy semantic compiler also accepts `compileAgentDocument(agentDoc, { layoutValidation: "warn" | "error" | "off" })` when you want a pre-render sanity check for likely overflow, clipping, or absolute-position collisions. The same `designTokens` object now supports top-level `scale`, `density`, and `shape` controls in addition to atomic token overrides.

## Next Steps

- [API Reference](api-reference.md) -- full documentation of all exports
- [Chart Types](chart-types.md) -- all six chart types with examples
- [examples/](../examples/) -- runnable example scripts, including `modern-deck-paperdoc/` for the hand-rolled modern baseline
