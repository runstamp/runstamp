# @runstamp/docx

Generate native Microsoft Word `.docx` files from JSON or TypeScript. Headings, paragraphs, nested lists, tables with spans, images, charts, shapes, headers/footers, footnotes, columns, TOC, and template hydration — all emitted as real OOXML.

[![npm](https://img.shields.io/npm/v/@runstamp/docx)](https://www.npmjs.com/package/@runstamp/docx)
[![license](https://img.shields.io/npm/l/@runstamp/docx)](./LICENSE)

```bash
npm install @runstamp/docx
```

Requires Node.js `>=18`. The package publishes an ESM entry point.

## Quick Start

```ts
import { renderToDocx } from "@runstamp/docx";
import { writeFileSync } from "node:fs";

const result = await renderToDocx({
  type: "DocxDocument",
  pageSize: "a4",
  pages: [
    {
      elements: [
        { type: "heading", level: 1, text: "Annual Report" },
        {
          type: "paragraph",
          text: "Revenue grew 34% year over year, driven by enterprise expansion.",
        },
        {
          type: "table",
          rows: [
            { isHeader: true, cells: [{ text: "Region" }, { text: "Revenue" }] },
            { cells: [{ text: "North America" }, { text: "$5.1M" }] },
            { cells: [{ text: "Europe" }, { text: "$3.6M" }] },
          ],
        },
      ],
    },
  ],
});

writeFileSync("report.docx", result.buffer);
```

## Supported Elements

| Element       | Notes                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| `heading`     | Levels 1–6, with bookmarks and TOC participation.                           |
| `paragraph`   | Rich runs (bold / italic / underline / color / size), hyperlinks, footnote refs. |
| `list`        | Bullet, numbered, lettered, and roman, with nested lists.                   |
| `table`       | Row/column spans, nested content, header repeat, 6 presets, per-cell styling. |
| `image`       | Inline or floating, wrap modes, data URIs/Buffers, and opt-in guarded remote fetch. |
| `chart`       | 8 chart types rendered as embedded images.                                 |
| `shape`       | Rectangle, ellipse, triangle, diamond, line, arrow.                        |
| `code-block`  | Monospace with language hint and optional line numbers.                    |
| `divider`     | Horizontal rule.                                                            |
| `page-break`  | Force a new page.                                                           |

## Verified Schema

The canonical DOCX input surface is generated from the exported Zod schema, not maintained by hand:

- Schema reference: [`docs/schema-reference.md`](./docs/schema-reference.md)
- Verified examples: [`docs/examples.md`](./docs/examples.md)

Validate untrusted input before rendering:

```ts
import { DocxDocumentSchema, renderToDocx } from "@runstamp/docx";

const parsed = DocxDocumentSchema.safeParse(input);
if (!parsed.success) {
  throw parsed.error;
}

const result = await renderToDocx(parsed.data);
```

Use `validateDocxDocument(input)` when you want a non-throwing `{ valid, issues, stats }` report instead of parsed data.

`renderToDocx` is strict by default: after generating the DOCX package, it checks Word-sensitive OOXML invariants such as non-negative tab stops, content-type targets, and relationship references. Pass `{ strict: false }` only as a temporary migration escape hatch.

## Template Hydration

Hydrate an existing `.docx` template by replacing `{{placeholder}}` tokens with typed values. Run-split placeholders—where Word divides a token across XML runs during editing—are normalized before injection.

```ts
import { readFile, writeFile } from "node:fs/promises";
import { hydrateDocx } from "@runstamp/docx";

const template = await readFile("invoice-template.docx");

const hydrated = await hydrateDocx(template, {
  customer: { name: "Acme Corp" },
  invoice: { number: "INV-2026-042", total: "$14,400.00" },
  items: {
    type: "table",
    headers: ["Description", "Qty", "Unit price"],
    rows: [
      ["Enterprise License", "1", "$12,000"],
      ["Support Package", "1", "$2,400"],
    ],
    style: "bordered",
  },
});

await writeFile("invoice-2026-042.docx", hydrated.buffer);
```

Nested paths such as `{{customer.name}}` are supported. A standalone placeholder paragraph can be replaced with a typed `table`, `image`, or `richtext` value. `hydrateDocx` returns the standard `{ buffer, warnings, stats }` result; use `onMissing: "remove" | "error"` to change how unmatched placeholders are handled.

## Tables

```ts
{
  type: "table",
  tableStyle: "bordered",     // plain | striped | bordered | modern | minimal | corporate
  keepWithNext: true,         // attach the table's closing row to the next block when possible
  columns: [
    { width: 80 },
    { width: 280 },
    { width: 80 },
  ],                           // widths are points
  rows: [
    {
      isHeader: true,
      cells: [{ text: "SKU" }, { text: "Description" }, { text: "Price" }],
    },
    {
      cells: [
        { text: "A-100" },
        { text: "Professional plan" },
        { text: "$99/mo", style: { textAlign: "right" } },
      ],
    },
  ],
}
```

Header rows repeat on every page automatically, and the final two non-header rows receive best-effort widow control. Cell `colSpan` / `rowSpan`, background colors, borders, padding, and vertical alignment are all supported. Use `keepTogether: true` on a short table, or on a vertical `container`, when a compact approval, signature, revision-history, or closing block should remain together. These hints are bounded and never chain across explicit page or section breaks.

## Charts

```ts
{
  type: "chart",
  chartType: "bar",          // bar | column | line | area | pie | doughnut | scatter | radar
  title: "Revenue by Quarter",
  categories: ["Q1", "Q2", "Q3", "Q4"],
  series: [
    { name: "2025", values: [120, 140, 180, 210] },
    { name: "2026", values: [160, 185, 235, 280] },
  ],
  width: 450, height: 270, // points
}
```

The native DOCX renderer embeds a deterministic chart image. You can also supply a custom `chartAdapter` in `RenderOptions` when you need a different rendering pipeline.

## Public API

```ts
renderToDocx(input, options?)      // { buffer, warnings, stats, mimeType, extension }
validateDocxDocument(input)        // { valid, issues, stats }
validateDocxBuffer(buffer)         // post-emit Word-strict OOXML checks
setDeterministicMode(true)         // stable ZIP dates, rel IDs, RSIDs, generated IDs
hydrateDocx(templateBuffer, data, options?) // returns a DocxResult

// Errors
DOCXError                          // { code, message, recovery, context }
```

Full type surface in `dist/index.d.ts`.

## Controlled import and true redaction

The A01 controlled-document API inspects untrusted DOCX archives before import, never fetches external
relationships, and never executes macros, ActiveX, or OLE. Encrypted and over-budget packages fail
closed. Redaction deletes located WordprocessingML text; it does not add a black visual overlay.

```ts
import {
  applyDocxRedactions,
  exportControlledDocx,
  findControlledDocx,
  importControlledDocx,
  verifyControlledDocx,
} from "@runstamp/docx";

const controlled = await importControlledDocx(uploadedBytes, {
  artifactId: "agreement.docx",
});
const targets = findControlledDocx(controlled, "Acme Secret Holdings");
const redacted = await applyDocxRedactions(
  controlled,
  targets.map(({ locator }) => locator),
);
const output = exportControlledDocx(redacted.document);
const proof = await verifyControlledDocx(output, {
  forbiddenText: ["Acme Secret Holdings"],
});

if (proof.status !== "PASS" || redacted.proof.residualCount !== 0) {
  throw new Error("Redacted content is still recoverable");
}
```

Locators use the stable `docx-ooxml-text-v1` scheme and bind the artifact, part, paragraph, text-node
offsets, tracked-change visibility, and paragraph hash. Applying a stale or cross-artifact locator is
rejected. Unknown macro/OLE parts are preserved as opaque bytes with a typed loss.

## Themes

Six preset names select a default table treatment. Supply `theme.fonts` or `theme.colors` alongside the preset to override document fonts and palette values:

```ts
renderToDocx({
  ...doc,
  theme: {
    preset: "modern",
    fonts: { heading: "Aptos Display", body: "Aptos" },
    colors: { primary: "1F4E79", accent: "2E75B6" },
  },
});
```

Presets: `corporate`, `modern`, `academic`, `classic`, `minimal`, `dark`.

## Error Handling

```ts
import { DOCXError } from "@runstamp/docx";

try {
  const { buffer, warnings } = await renderToDocx(doc);
  if (warnings.length) {
    for (const w of warnings) console.warn(w.code, w.message);
  }
} catch (err) {
  if (err instanceof DOCXError) {
    console.error(err.code, err.message, err.context, "→", err.recovery);
  }
  throw err;
}
```

`DOCXError` carries a stable error code, optional context, and a remediation hint. Non-fatal issues are surfaced through `warnings[]` instead of throwing.

## Security

- Remote image fetching is disabled by default. When explicitly enabled with `imageFetch.allowExternal`, URLs pass through scheme, credential, localhost, and non-public-address checks.
- Text is sanitized for null bytes and forbidden control characters.
- Default resource limits cap pages, elements, text, table/list nesting, image sizes, and aggregate media/XML bytes. Limits can be lowered through `RenderOptions.resourceLimits`.
- Hydration rejects oversized or over-expanded template archives by default; tune `HydrationOptions.archiveLimits` only for trusted larger templates.

## Upgrade to Pro

`@runstamp/docx-pro` adds:

- commercial / self-hosted production license
- visual polish (design tokens, shadow physics, gradients, ICC color profiles)
- compliance validation (Indian GST, EU reverse charge, Brazilian DANFE)
- SecurePDF utilities for merging, metadata, page extraction, watermarks, and visual signatures. `SecurePDF.protect` fails closed when the installed PDF backend has no encryption support.
- font subsetting via `opentype.js`
- tracked changes / compare flows

Identical API — swap the import and provide a license key.

## Links

- Docs: [runstamp.com/docs](https://runstamp.com/docs)
- Playground: [runstamp.com/playground](https://runstamp.com/playground)
- Pricing: [runstamp.com/pricing](https://runstamp.com/pricing)

## License

Apache-2.0. See `LICENSE`.
