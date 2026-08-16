# @runstamp/pptx

Generate native PowerPoint `.pptx` files from JSON or TypeScript. No browser, no headless Chromium, no conversion from HTML — real OOXML straight to a buffer.

[![npm](https://img.shields.io/npm/v/@runstamp/pptx)](https://www.npmjs.com/package/@runstamp/pptx)
[![license](https://img.shields.io/npm/l/@runstamp/pptx)](./LICENSE)

```bash
npm install @runstamp/pptx
```

Requires Node.js `>=20`. ESM only.

## Declarative Quick Start

Use named layouts when an application or agent should describe intent rather
than place elements with `x`, `y`, `w`, and `h` coordinates. `validate()` runs
the schema and layout-safety preflight without rendering, and every issue has
an exact path plus an actionable fix.

```ts docs-verify=render
import { writeFileSync } from "node:fs";
import {
  render,
  validate,
} from "@runstamp/pptx";

const doc = {
  title: "Q3 Board Review",
  slides: [
    { layout: "title", title: "Q3 Board Review", subtitle: "October 2026" },
    {
      layout: "kpi-row",
      title: "Operating metrics",
      metrics: [
        { label: "ARR", value: "$4.2M", delta: "+18%" },
        { label: "NRR", value: "112%", delta: "+4pt" },
      ],
    },
    {
      layout: "chart",
      title: "Revenue by quarter",
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
  throw new Error(JSON.stringify(result.issues, null, 2));
}

const buffer = await render(doc, { deterministic: true });
writeFileSync("board-review.pptx", buffer);
```

Available layouts are `title`, `kpi-row`, `chart`, `bullets`, `comparison`,
and `timeline`. The complete runnable script is in
[`quickstart/pptx.mjs`](./quickstart/pptx.mjs).

## Low-level AST Quick Start

```ts docs-verify=render
import { PaperEngine } from "@runstamp/pptx";
import { writeFileSync } from "node:fs";

const buffer = await PaperEngine.render({
  type: "Document",
  meta: { title: "Quarterly Update" },
  slides: [
    {
      type: "Slide",
      style: { padding: 40, backgroundColor: "#FFFFFF" },
      children: [
        {
          type: "Text",
          content: "Quarterly Update",
          style: { fontSize: 28, fontWeight: "bold", color: "#1E293B" },
        },
        {
          type: "Text",
          content: "Revenue grew 28% year over year.",
          style: { marginTop: 12, fontSize: 18, color: "#334155" },
        },
      ],
    },
  ],
});

writeFileSync("deck.pptx", buffer);
```

Output opens natively in PowerPoint, Keynote, Google Slides, and LibreOffice Impress — no compatibility layer.

## Fonts and Layout Drift

Use fonts installed in every target environment or accept metric drift.

PowerPoint layouts depend on text metrics. If your render environment measures one font and the viewer substitutes another, line wraps, chart labels, and card copy can shift. Until native embedding is available, ensure the exact fonts are installed in every environment that renders or opens the deck.

Runstamp currently measures admitted portable fonts but does not write them into PPTX: PowerPoint requires EOT/MicroType Express font payloads, and raw TrueType/OpenType bytes are rejected rather than mislabeled as embedded. `fontStrategy: "user-embedded"` therefore fails closed until a validated encoder is available. Use `fontStrategy: "system"` only when the exact fonts are installed in every render and viewer environment, or use a visual fallback when pixel fidelity matters more than editable native text.

```ts docs-verify=render
import { PaperEngine, loadFont } from "@runstamp/pptx";
import { readFileSync, writeFileSync } from "node:fs";

loadFont("Inter", readFileSync("./fonts/Inter-Regular.ttf"));

const doc = {
  type: "Document",
  meta: { title: "System-font deck" },
  fontStrategy: "system" as const,
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Measured with Inter",
          style: { fontFamily: "Inter", fontSize: 28, color: "#0F172A" },
        },
      ],
    },
  ],
};

const buffer = await PaperEngine.render(doc);
writeFileSync("font-safe-deck.pptx", buffer);
```

If you are drafting quickly and do not want to ship custom font files, prefer `Liberation Sans` or `DejaVu Sans`. They are the safest no-embed choices for LibreOffice-heavy CI and Linux preview environments.

## What You Get

- **Native PPTX output** — real ECMA-376 OOXML, not an image export or HTML conversion.
- **Flexbox layout** — Yoga-powered layout engine for rows, columns, gaps, padding, and alignment. Write layout with familiar flex primitives.
- **Editable charts** — bar, line, pie, scatter, area, combo. Rendered as real chart XML with embedded Excel data, so users can edit the underlying values in PowerPoint.
- **40+ shapes** — rectangles, ellipses, arrows, callouts, flowchart primitives, stars, connectors, custom geometry.
- **Tables** — header rows, cell spans, per-cell styling, row/column sizing.
- **Typography** — fontkit-based text measurement, line breaking, bullet lists, multi-run paragraphs, tab stops.
- **Diagrams** — cycle, hierarchy, matrix, process, list, venn (SmartArt-style, 6 generator types).
- **Semantic protocol compiler** — protocol_v2 `PresentationSpec` input with explicit slide types, compiled to the full layout engine for applications and agents.
- **Deterministic output** — same input, identical bytes. Safe for content-addressable caching and visual regression.

## Feature Matrix

| Capability                  | Free (`json-to-pptx`) | Pro (`json-to-pptx-pro`) |
| --------------------------- | :-------------------: | :----------------------: |
| Document generation         | ✔                     | ✔                        |
| 40+ shapes                  | ✔                     | ✔                        |
| 140+ shapes                 |                       | ✔                        |
| 6 basic chart types         | ✔                     | ✔                        |
| 9 advanced chart types      |                       | ✔                        |
| Flexbox layout (Yoga)       | ✔                     | ✔                        |
| Text measurement (fontkit)  | ✔                     | ✔                        |
| Complex text shaping (HarfBuzz, RTL, emoji) |       | ✔                        |
| `.potx` template ingestion  |                       | ✔                        |
| Canvas preview renderer     |                       | ✔                        |
| Semantic interpreter        | ✔                     | ✔                        |
| Tables, diagrams, animations | ✔                    | ✔                        |
| Production / self-hosted commercial license |       | ✔                        |

See [runstamp.com/pricing](https://runstamp.com/pricing) for Pro licensing and hosted usage.

## Verified Schema

The canonical PPTX input surfaces are generated from the exported Zod schemas instead of being maintained by hand:

- Schema reference: [`docs/schema-reference.md`](./docs/schema-reference.md)
- Verified examples: [`docs/examples.md`](./docs/examples.md)

The generated reference covers the full `PaperDocument` AST. For semantic presentation authoring, use the exported protocol_v2 `PresentationSpecSchema` and `compilePresentationSpec`. Every low-level element uses a `type` discriminator such as `View`, `Text`, `Image`, `Table`, `Chart`, `Shape`, `Group`, `Connector`, `Video`, or `Audio`, and styles follow flexbox semantics (`flexDirection`, `gap`, `padding`, `alignItems`, `justifyContent`).

Validate untrusted input against the Zod schema before rendering:

```ts docs-verify=render
import { PaperDocumentSchema } from "@runstamp/pptx";

const parsed = PaperDocumentSchema.parse(inputJson);
const buffer = await PaperEngine.render(parsed);
```

## Charts

```ts docs-verify=parse
{
  type: "Chart",
  style: { width: 720, height: 360 },
  chartData: {
    chartType: "bar",
    series: [
      { name: "2025", values: [120, 140, 180, 210] },
      { name: "2026", values: [160, 185, 235, 280] },
    ],
    categories: ["Q1", "Q2", "Q3", "Q4"],
    axes: { x: { title: "Quarter" }, y: { title: "Revenue ($K)" } },
  },
}
```

Supported types (free tier): `bar`, `line`, `pie`, `scatter`, `area`, `combo`. Output is editable in PowerPoint with the source data in an embedded workbook.

## Agent Mode (protocol_v2)

Agents should author a protocol_v2 `PresentationSpec`, validate it, and compile it before rendering:

```ts docs-verify=render
import {
  compilePresentationSpec,
  PaperEngine,
  PresentationSpecSchema,
} from "@runstamp/pptx";

const spec = PresentationSpecSchema.parse({
  version: "2.0",
  title: "Revenue Dashboard",
  accentColor: "#C2410C",
  slides: [
    {
      slideType: "title-body",
      title: "Revenue Dashboard",
      subtitle: "Board update for Q2",
      body: ["ARR and retention both finished above plan."],
    },
    {
      slideType: "kpi-grid",
      title: "Key Metrics",
      items: [
        { label: "ARR", value: "$12.4M", trend: "up", sublabel: "+41% YoY" },
        { label: "NRR", value: "118%", trend: "up", sublabel: "+4 pts" },
      ],
    },
  ],
});

const paperDoc = compilePresentationSpec(spec);
const buffer = await PaperEngine.render(paperDoc);
```

The earlier 1.0 semantic dialect remains available only for package compatibility and is deprecated for new integrations. Hosted V2 requests use this same `PresentationSpec` inside an envelope with `sourceSchema: "protocol_v2"`.

## Public API (selected)

```ts docs-verify=skip docs-verify-reason="reference export list"
// Engine
PaperEngine.render(doc, options?)    // Uint8Array
RenderContext, withContext           // AsyncLocalStorage-based per-request isolation

// Validation
PaperDocumentSchema, PaperSlideSchema, PaperNodeSchema   // Zod schemas
PresentationSpecSchema

// Layout
runLayout(node, containerSize)       // flex layout pass
calculateTextMetrics(text, style)    // width/height for a run

// Semantic protocol compilation
compilePresentationSpec(spec)
preflightPresentationSpec(spec, options?)
applyElasticPagination(slide)

// Diagrams
generateDiagram({ type: "cycle" | "hierarchy" | "matrix" | "process" | "list" | "venn", items })

// Fonts
loadFont(family, buffer)
autoLoadDocumentFonts(doc)
clearFontCache()

// Determinism + logging
setDeterministicMode(true)
setLogger({ debug, info, warn, error })

// Errors
PaperError, RunstampFeatureError, SchemaValidationError, PaperErrorCode
```

Full type surface in `dist-lite/index.d.ts` — every runtime export has a matching TypeScript definition.

## Determinism

```ts docs-verify=skip docs-verify-reason="configuration-only snippet"
import { setDeterministicMode } from "@runstamp/pptx";
setDeterministicMode(true);
```

Freezes timestamps, rIDs, and any other sources of nondeterminism. Use in CI for byte-stable snapshot testing.

## Error Handling

Rendering throws `PaperError` (with `.code` and `.phase`) for known failure modes and `RunstampFeatureError` when a pro-only feature is requested on the free build. Validation throws `SchemaValidationError` with the offending Zod path.

```ts docs-verify=skip docs-verify-reason="control-flow example"
import { PaperError, RunstampFeatureError } from "@runstamp/pptx";

try {
  await PaperEngine.render(doc);
} catch (err) {
  if (err instanceof RunstampFeatureError) {
    // Feature requires @runstamp/pptx-pro
  } else if (err instanceof PaperError) {
    console.error(err.code, err.phase, err.message);
  }
  throw err;
}
```

## Upgrade to Pro

Use [`@runstamp/pptx-pro`](https://www.npmjs.com/package/@runstamp/pptx-pro) when you need:

- commercial / self-hosted production licensing
- 140+ shapes, 9 additional chart types
- `.potx` template ingestion and mutation
- HarfBuzz text shaping (complex scripts, RTL, emoji)
- canvas preview rendering (PNG thumbnails)

The API is identical — swap the import and provide a license key.

## Links

- Docs: [runstamp.com/docs](https://runstamp.com/docs)
- Playground: [runstamp.com/playground](https://runstamp.com/playground)
- Pricing: [runstamp.com/pricing](https://runstamp.com/pricing)

## License

Apache-2.0. See `LICENSE`.
