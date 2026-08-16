# Changelog

## 1.0.1 (2026-08-16)

- Correct package source, issue, and monorepo directory metadata. Runtime API and behavior are unchanged from 1.0.0.

## 0.0.8 (Pro)

- Embed HarfBuzz WASM in the Pro server bundle for zero-configuration Next.js
  deployment and portable font shaping.

## 0.4.2 (2026-07-28)

- `PdfRenderOptions.licenseKey` now takes precedence over `RUNSTAMP_LICENSE_KEY` for the full asynchronous render pipeline.
- License failures expose the shared structured license-error fields.

## 0.4.0 (2026-07-13)

- **Breaking: remote asset sources disabled by default** — `http:` / `https:` URLs for images, SVGs, fonts, and ICC profiles are now rejected unless you opt in. Documents that previously fetched remote assets will fail with an asset-policy error. To restore the old behavior:

  ```ts
  await engine.render(doc, {
    assetPolicy: { allowRemoteSources: true },
  });
  ```

  Remote fetches run with a 5s timeout (`assetPolicy.timeoutMs`) and per-loader byte limits (cap further with `assetPolicy.maxSourceBytes`); local file paths can be confined with `assetPolicy.baseDirectory`. Local files and `data:` URLs remain enabled by default. This is the correct security posture for server-side rendering of untrusted input — prefer inlining assets as `data:` URLs or Buffers over re-enabling remote fetches.
- **Deterministic test bootstrap** — New top-level `setDeterministicMode(enabled?)` / `isDeterministicModeEnabled()` exports let test suites opt into byte-stable trailer identifiers. The package Vitest setup now enables deterministic mode before tests run.
- **Breaking: strict schema validation by default** — `PdfEngine.render(doc)` now throws `PdfError("SCHEMA_REJECTED")` when input fails the Zod schema. Pass `{ strict: false }` to keep the previous permissive behavior that reports `PDF_SCHEMA_VALIDATION_FAILED` through `onInputWarning` and attempts to render the original input. The legacy `{ strictSchema: false }` opt-out remains supported.
- **`PdfEngine.validate(doc)` soft validator** — New synchronous overload returns `{ ok, issues: PdfValidationIssue[] }` without throwing, mirroring `validateDocxDocument` and `lintSpreadsheetDocument` so a tool can call `validate(doc)` against any free engine and get a uniform issue list. The existing `PdfEngine.validate(buffer)` (post-emit summary, async) is unchanged. Also exposed as the standalone `validatePdfDocumentSafe` export. (Driven by `docs/0428-claude-test-based-directive2.md` cross-engine §"Add a `validate(doc)` public method on every engine".)
- **Color inputs at the API boundary** — Hex strings (`#RRGGBB` / `#RGB`), `rgb()` / `rgba()` strings, named colors (`black`, `white`, `red`, `green`, `blue`, `gray`), and shorthand `{ r, g, b }` / `{ c, m, y, k }` objects are now accepted everywhere the schema admits a color. They are normalized to the canonical `{ space, … }` shape with 0..1 components by `PdfColorSchema`. The deep-stack `cmyk.c must use normalized 0..1 PDF color components; received undefined` failure on hex inputs is gone. (Driven by `docs/0428-claude-test-based-directive2.md` §"@runstamp/pdf" items 1–3.)
- **New top-level `parseColor(input, path?)` and `tryParseColor(input, path?)` exports** — Returns the canonical PDF color shape; throws `PdfColorParseError` (also exported) with a path-prefixed message on bad input. Use this when you need to normalize a color before handing it to a non-schema-validated code path.
- **WinAnsi unmappable-character warnings** — When standard-14 fonts encounter a character outside WinAnsiEncoding (Greek glyphs, ≥/≤, →, …), the renderer now surfaces a `PDF_WINANSI_UNMAPPABLE` warning via `onInputWarning` carrying `{ char, codePoint, suggestion, textPreview, pageIndex, elementId? }` instead of silently emitting a `?` glyph. Embed a custom font that covers the character or use the suggested ASCII replacement to silence the warning. Exposed type: `PdfTextEncodingWarning`.
- **Relaxed input on by default** — `relaxed: true` is the new default for `PdfEngine.render` and `validatePdfDocument`; the legacy table `rows[]` / `cells[].value` and list-item `value` shorthand documented in the README now work without an opt-in flag. Pass `relaxed: false` to keep the strict-only behavior.
- **README** — Replaced the broken `style: { borderColor, headerBackground }` table example with a working canonical version that uses `borderTop`/`borderLeft`/etc. with hex strings. Added a "Two Input Shapes" section that documents the relaxed → strict pipeline.
- Expanded Phase 6 AcroForms with additive radio-button support plus richer text, checkbox, and dropdown metadata including `tooltip`, `required`, `readOnly`, and text `maxLength`.
- Added Phase 6 fixture and benchmark coverage for radio groups, mixed nested-container form ordering, and updated manual validation guidance for Acrobat, Preview, Chrome, and pdf.js.
- Hardened Phase 3/8 follow-through for form-heavy documents by preserving authored widget order through nested container anchors and preparing PDF/A fallback fonts for widget-only documents.

## 0.0.1 (2026-03-09)

Initial release.

- Deterministic PDF byte generation
- Multi-page layout with paragraphs, headings, flex containers
- Multi-page tables with repeating headers, rowSpan, colSpan, nested tables
- Vector graphics, images, SVG expansion, opacity, gradients
- Links, TOC generation, bookmarks, page labels, AcroForms
- Tagged PDF output with structure trees for accessibility
- PDF/A-2a mode with embedded fonts and ICC-based colors
- HarfBuzz shaping and Yoga-based block layout
- PKCS#7 signatures and RFC 3161 timestamps
- Streaming and scale helpers
- TypeScript-first with full type definitions
