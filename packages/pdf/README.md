# @runstamp/pdf

Generate native PDF files from JSON or TypeScript. No headless Chromium, no wkhtmltopdf, no HTML conversion — a custom PDF object model with Yoga flex layout, fontkit / HarfBuzz text shaping, and a progressive capability pipeline.

[![npm](https://img.shields.io/npm/v/@runstamp/pdf)](https://www.npmjs.com/package/@runstamp/pdf)
[![license](https://img.shields.io/npm/l/@runstamp/pdf)](./LICENSE)

```bash
npm install @runstamp/pdf
```

Requires Node.js `>=18`. ESM only.

## Quick Start

```ts
import { PdfEngine } from "@runstamp/pdf";
import { writeFileSync } from "node:fs";

const buffer = await PdfEngine.render({
  meta: { title: "Monthly Update", author: "Acme Inc." },
  page: { size: "Letter", margin: 48 },
  children: [
    { type: "heading", value: "Monthly Update", level: 1 },
    { type: "paragraph", value: "Revenue grew 18% month over month." },
    {
      type: "table",
      columns: [{ width: 120 }, { width: 80 }],
      rows: [
        { isHeader: true, cells: [{ value: "Region" }, { value: "Revenue" }] },
        { cells: [{ value: "North America" }, { value: "$5.1M" }] },
        { cells: [{ value: "Europe" }, { value: "$3.6M" }] },
      ],
    },
  ],
});

writeFileSync("update.pdf", buffer);
```

## What You Get

- **Custom PDF object model** — full control over PDF output. No dependency on `pdfkit` or `pdf-lib` at runtime.
- **Flexbox layout** — Yoga-based structured layout with widow/orphan control and Knuth-Plass-style line breaking.
- **Text shaping** — fontkit for metrics, HarfBuzz (pro) for emoji / RTL / complex scripts, `subset-font` to shrink embedded fonts to used glyphs only.
- **Tables with spans** — row spans, column spans, cross-page continuation, header repeat.
- **Graphics** — solid fills, gradients, strokes, RGB + CMYK color, SVG paths parsed into PDF draw commands.
- **Interactive features** — forms, annotations, TOC, bookmarks, named destinations.
- **Accessibility primitives** — tagged-PDF structure for headings, lists, tables, figures, and language metadata. Application authors remain responsible for content accessibility and conformance testing.
- **PDF/A-2a** — ICC profile embedding and XMP metadata for long-term archival (pro).
- **Streaming output adapter** — `renderStream()` returns a Node `Readable` you can pipe to disk or HTTP. Note: the full PDF is built in memory first; the stream is a buffer-to-Readable adapter, not incremental page emission.
- **Digital signatures** — OpenSSL-based signing with timestamp support (pro).
- **Deterministic output** — same input, byte-identical PDF.

## Free vs Pro Capabilities

The free tier renders the standard 14 PDF base fonts (Helvetica, Times-Roman, Courier, etc., via Type1 + WinAnsi encoding). **Custom font embedding requires the Pro tier**, because every embedded font goes through HarfBuzz shaping (`requirePdfPro("harfbuzz-typography")`) — even for plain Latin text. Without a Pro license, passing an `embeddedFontInput` will throw `RunstampFeatureError`.

| Capability | Free | Pro |
|---|---|---|
| Standard 14 base fonts (Helvetica, etc.) | ✓ | ✓ |
| Custom embedded fonts | — | ✓ |
| Non-Latin / RTL / Indic / Arabic / CJK shaping | — | ✓ |
| Tables, forms, annotations, TOC, bookmarks | ✓ | ✓ |
| Tagged-PDF structure primitives | — | ✓ |
| PDF/A-2a archival | — | ✓ |
| Digital signatures + timestamps | — | ✓ |
| AES-128 user-password encryption | ✓ | ✓ |
| AES-256 / owner password / permission flags | — | ✓ |
| `linearize()` (output streaming via qpdf) | — | ✓ |
| `validate()` / `repair()` / `quality()` | — | ✓ |
| `inspectForm()` / `fillForm()` (existing PDFs) | — | ✓ |
| Dynamic page-aware headers/footers | — | ✓ |

To upgrade: install `@runstamp/pdf-pro` and set `RUNSTAMP_LICENSE_KEY`. See [pricing](https://runstamp.com/pricing).

## Two Input Shapes

The package accepts the same document through two surfaces — pick whichever matches how you generate input.

```
relaxed JSON (children[], rows[], hex colors)
        │
        ▼   preprocessPdfDocumentInput()  ← normalizes legacy shorthand
        │   normalizeShorthandTables()
        ▼
strict Zod schema (PdfDocumentSchema)     ← validates + canonicalizes colors
        │
        ▼   composePhases(phase2Flat, phase3Layout, phase5Tables, ...)
        ▼
renderPdfPages()  →  PDF buffer
```

- **Relaxed (Phase 3+ flow API)** — `children[]`, `rows[].cells[].value`, hex colors, named colors. This is what the **Quick Start** uses; it's what an LLM or hand-author is most likely to write. Recommended for almost every caller.
- **Strict (Phase 2 / Phase 5 drawing API)** — positioned `pages[].graphics[]`, full `header[].cells[].children[]` tables, canonical `{ space: "rgb", r, g, b }` colors. Use this when generating input from another deterministic system.

Both shapes flow through the same render pipeline. The relaxed → strict normalization happens automatically inside `PdfEngine.render()` and `validatePdfDocument()`.

## Verified Schema

The canonical PDF input surface is generated from the exported Zod schemas, including both the structured flow API and the lower-level phase-2 drawing API:

- Schema reference: [`docs/schema-reference.md`](./docs/schema-reference.md)
- Verified examples: [`docs/examples.md`](./docs/examples.md)

Pro users can validate input separately before rendering:

```ts
import { validatePdfDocument, isPdfError } from "@runstamp/pdf";

try {
  const parsed = validatePdfDocument(input);
  await PdfEngine.render(parsed);
} catch (e) {
  if (isPdfError(e) && e.code === "SCHEMA_REJECTED") {
    // e.details.issues contains the underlying Zod issues
  }
}
```

`PdfEngine.render` is strict by default in both packages: schema validation failures throw `PdfError("SCHEMA_REJECTED")` before bytes are written. The standalone validation APIs are Pro features. To temporarily keep the previous permissive render behavior during migration, pass `{ strict: false }`; schema failures are then surfaced via `onInputWarning` and the engine attempts to render the original input.

The engine auto-detects which capability phases are needed (simple docs skip table / interactive / accessibility / PDF/A pipelines), so minimal documents render on a minimal codepath.

## PDF Evidence Processing

The bounded evidence API inspects native PDFs, extracts text with page/geometry locators, routes scanned
pages to a caller-owned OCR adapter, finds text, previews exact rectangles, rebuilds a sanitized
redaction derivative, and verifies that forbidden content is absent. It rejects encrypted PDFs,
malformed structures, active JavaScript, resource overruns, and cancelled work. Redaction never paints
an overlay over retained text: selected text is omitted from newly generated content streams, while
unsupported graphics, metadata, annotations, attachments, form interactivity, and signatures are
reported as typed losses.

See [`docs/evidence-processing.md`](./docs/evidence-processing.md) for the contract, example, limits,
and external validator workflow.

## Errors

Errors thrown by the engine fall into two classes:

- **`PdfError`** (exported from this package) — runtime validation, option conflicts, and PDF/A constraint violations. Carries a stable `code` field — branch on `code`, not on the message string. Codes currently emitted: `SCHEMA_REJECTED`, `OPTIONS_CONFLICT`, `PDFA_VIOLATION`. Use `isPdfError(e)` to narrow.
- **`RunstampFeatureError`** (exported by the Pro package) — thrown when a Pro feature is used without a valid `RUNSTAMP_LICENSE_KEY`. Carries stable `code`, `feature`, `remediation`, and `upgradeUrl` fields.

## Streaming

`renderStream()` returns a Node `Readable` adapter. The engine builds the complete PDF buffer first, so this is convenient for piping but does not reduce peak render memory:

```ts
import { PdfEngine } from "@runstamp/pdf";
import { createWriteStream } from "node:fs";

const stream = PdfEngine.renderStream(doc);
stream.pipe(createWriteStream("large-report.pdf"));
```

## Tables

```ts
{
  type: "table",
  columns: [
    { width: 200 },
    { width: 100 },
    { width: 100 },
  ],
  rows: [
    {
      isHeader: true,
      cells: [{ value: "Item" }, { value: "Qty" }, { value: "Total" }],
    },
    {
      cells: [
        { value: "Enterprise License" },
        { value: "1" },
        { value: "$12,000.00" },
      ],
    },
  ],
  style: {
    backgroundColor: "#FFFFFF",
    borderTop:    { color: "#E5E7EB", width: 1, style: "solid" },
    borderBottom: { color: "#E5E7EB", width: 1, style: "solid" },
    borderLeft:   { color: "#E5E7EB", width: 1, style: "solid" },
    borderRight:  { color: "#E5E7EB", width: 1, style: "solid" },
  },
}
```

Color fields accept hex strings (`#RRGGBB`, `#RGB`), `rgb()`/`rgba()` strings, named colors (`black`, `white`, `red`, `green`, `blue`, `gray`), or canonical objects (`{ space: "rgb", r, g, b }` with components in 0–1). Per-row styling lives on the row's `style.backgroundColor`; for a tinted header row, set `backgroundColor` on the header row directly.

Tables longer than a page continue automatically with the header row repeated. `colSpan` and `rowSpan` are validated against the declared column count before rendering.

## Running Headers and Footers (Pro)

`dynamicHeader` and `dynamicFooter` are evaluated for every output page, including pages created by flowing text and table pagination. Use `{page}` and `{totalPages}` in string content for page-aware values. The legacy `{total}` token remains supported for compatibility.

```ts
await PdfEngine.render({
  page: { size: "Letter", margin: 36 },
  dynamicHeader: {
    content: {
      left: "Quarterly report",
      center: "2026-07-14",
      right: "{page} / {totalPages}",
    },
    height: 36,
    skipFirstPage: true,
  },
  dynamicFooter: {
    content: "Confidential - Page {page} of {totalPages}",
    height: 30,
  },
  children: [
    { type: "heading", value: "Enterprise report", level: 1 },
    { type: "paragraph", value: "Report body..." },
  ],
});
```

Zone content is string-based and aligns within the left, center, and right thirds of the configured `x`/`width` region. A string renders as one text operation, while an array of layout nodes is independently laid out on each page; tokens in layout-node string properties are materialized per page. `skipFirstPage` suppresses drawing on page 1 while retaining consistent body geometry across all pages.

Running-region space is reserved before pagination. If the authored top or bottom margin does not clear the configured region, the engine enlarges that margin on every page so body text cannot overlap the header or footer. Explicit margins that already clear the region are preserved.

## Fonts

```ts
import { PdfEngine } from "@runstamp/pdf";
import { readFileSync } from "node:fs";

await PdfEngine.render({
  ...doc,
  fonts: [
    { family: "Inter", weight: 400, source: readFileSync("./Inter-Regular.ttf") },
    { family: "Inter", weight: 700, source: readFileSync("./Inter-Bold.ttf") },
  ],
});
```

Fonts are subset to only the glyphs actually used in the document, typically reducing PDF size by 80–95%. Standard 14 PDF fonts (Helvetica, Times, Courier, etc.) are built in and do not need to be supplied.

## Images

```ts
{ type: "image", source: "./logo.png", width: 200, height: 80, x: 72, y: 640 }
{ type: "image", source: "data:image/png;base64,...", width: 300, height: 120, x: 72, y: 520 }
await PdfEngine.render(docWithRemoteImage, {
  assetPolicy: {
    allowRemoteSources: true,
    allowedSchemes: ["https"],
    maxSourceBytes: 5 * 1024 * 1024,
    timeoutMs: 3000,
  },
});
```

PNG and JPEG are decoded natively. Local file paths and `data:` URLs are enabled by default; `http:` and `https:` sources are rejected unless `assetPolicy.allowRemoteSources` is set for that render. Every source is bounded by loader defaults and optional `assetPolicy.maxSourceBytes`.

## Public API

```ts
PdfEngine.render(doc, options?)           // Uint8Array
PdfEngine.renderStream(doc, options?)      // Node Readable; full PDF buffered first

// Pro validation and quality APIs
validatePdfDocument(doc)
validatePdfBuffer(buffer)
repairPdfBuffer(buffer)
buildPdfQualityReport(buffer)

// Determinism
setDeterministicMode(true)
```

Full type surface in `dist/index.d.ts`.

## Determinism

```ts
import { setDeterministicMode } from "@runstamp/pdf";
setDeterministicMode(true);
```

Freezes creation timestamps, document IDs, and any other sources of nondeterminism. Verified with a byte-equality test suite.

## Error Handling

```ts
import { PdfError } from "@runstamp/pdf";

try {
  await PdfEngine.render(doc);
} catch (err) {
  if (err instanceof PdfError) {
    console.error(err.code, err.phase, err.message);
  }
  throw err;
}
```

## Upgrade to Pro

`@runstamp/pdf-pro` adds:

- commercial / self-hosted production license
- HarfBuzz text shaping (RTL, complex scripts, emoji)
- PDF/A-2a compliance (ICC profiles, XMP metadata)
- digital signatures with timestamping
- advanced typography (hyphenation, justification, OpenType features)
- validation & repair tooling (XRef rebuild, stream length fixing)
- PDF form fill

The API is identical — swap the import and provide `RUNSTAMP_LICENSE_KEY`.

## Links

- Docs: [runstamp.com/docs](https://runstamp.com/docs)
- Playground: [runstamp.com/playground](https://runstamp.com/playground)
- Pricing: [runstamp.com/pricing](https://runstamp.com/pricing)

## License

Apache-2.0. See `LICENSE`.
