# Changelog

## 1.0.1 (2026-08-16)

- Correct package source, issue, and monorepo directory metadata. Runtime API and behavior are unchanged from 1.0.0.

## 0.5.7 (2026-08-10)

- Reject unknown public element and table-cell fields instead of silently dropping semantic content.
- Correct point-unit sizing, document language output, logical page-count labeling, and deterministic batch archives.
- Add DNS/IP-aware remote-image guards and hydration archive expansion limits.
- Parse and validate OOXML relationships without relying on XML attribute order.
- Strengthen packed-artifact semantic smoke tests and publish new versions behind a verification tag before promotion.
- Correct the ESM/API/security documentation and include package documentation in the tarball.

## 0.0.11 (Pro, 2026-08-10)

- Align the Pro manifest with the current free/PDF/Zod runtime and remove the unused legacy `docx` dependency.
- Require the strict Level C release matrix to import and render the Pro artifact.

## 0.0.8 (Pro)

- Declare `pdf-lib` and `opentype.js` as runtime dependencies so stock Next.js
  server builds resolve the Pro bundle without consumer-installed peers.

## 0.5.4 (2026-07-28)

- `DocxDocument.orientation` is optional in the public TypeScript input contract and defaults to `"portrait"` during schema parsing.
- License failures expose the shared structured license-error fields.

## 0.5.0 (2026-07-14)

- **Breaking: external image fetching is now off by default** — Remote `http(s)` image sources now use the existing structured image-fetch failure path unless the render explicitly opts in with `imageFetch: { allowExternal: true }`. Data URIs, buffers, and `assetId` sources are unchanged. Deterministic renders continue to force-disable external fetching even when the flag is set.
- **Document-level external-fetch budgets** — Native renders now cap aggregate external-fetch wall time at 30 seconds and fetched bytes at 50MB by default, while retaining the existing concurrency limit. Configure the limits with `imageFetch.maxTotalExternalFetchTimeMs`, `imageFetch.maxTotalExternalFetchBytes`, and `imageFetch.maxConcurrentExternalFetches`.

## 0.4.0 (2026-07-13)

- **Breaking: `visualPolish` moved under `experimental`** — The top-level `visualPolish` export is gone; it now ships as `experimental.visualPolish`. Migration:

  ```ts
  // before
  import { visualPolish } from "@runstamp/docx";
  // after
  import { experimental } from "@runstamp/docx";
  experimental.visualPolish(...);
  ```
- **Breaking: default input resource limits** — Renders now enforce defaults of 25MB input JSON, 1MB per input string, and 14MB per base64 payload (plus 25MB total serialized XML). Very large documents that previously rendered can now be rejected with a resource-limit error. Raise the ceilings per render via `options.resourceLimits` (a `Partial<ResourceLimits>`) when you trust the input.
- **Deterministic test bootstrap** — New top-level `setDeterministicMode(enabled?, seed?)` / `isDeterministicModeEnabled()` exports make the serializer seed explicit for byte-stable relationship IDs, RSIDs, ZIP dates, and generated OOXML IDs. The package Vitest setup now enables deterministic mode before tests run.
- **Breaking: strict OOXML validation by default** — `renderToDocx(doc)` now runs the post-emit Word-strict validator by default and throws `DocxStrictValidationError` for negative tab stops, missing content-type targets, or unresolved relationships. Pass `{ strict: false }` to skip this post-emit guard during migration.
- **Cross-engine `validate(doc)` parity** — The existing `validateDocxDocument(doc)` is the docx side of a uniform soft-validator API now also implemented as `PdfEngine.validate(doc)` (json-to-pdf) and `SpreadsheetEngine.lint(doc)` (json-to-xlsx). All three return `{ ok | valid, issues }` with `{ severity, code, message, path }` so a tool can call one shape against any engine.
- **High-level builders** — `buildReportDocx`, `buildInvoiceDocx`, and `buildContractDocx` now ship from the package root. They mirror the MCP wrapper shapes (`generate_report_docx`, etc.) so the same JSON spec works against both the MCP server and Mode B (`buildReportDocx(...) → renderToDocx(...)`). Driven by `docs/0428-claude-test-based-directive2.md` §"@runstamp/docx" item "Make the canonical Mode B shape match `references/examples.md`".
- **Post-emit OOXML strict validator** — New `validateDocxBuffer(buffer)` and `DocxStrictValidationError` exports detect three failure modes that LibreOffice silently accepts but Word rejects with a "needs repair" prompt: (a) `<w:tab w:pos="N"/>` with `N < 0`, (b) `<Override>` entries in `[Content_Types].xml` whose target part is absent, (c) `r:id` references in `*.rels` files that don't resolve.
- **Footer tab math is defensive** — `applyHeaderFooterTabStops` now throws `DOCX_FOOTER_TAB_NEGATIVE` when content width turns negative (margins exceed page width), naming the offending margins so the failure is loud instead of producing a damaged file. (`docs/0428-claude-test-based-directive2.md` item "Fix the footer-tab-position calculator to use post-coercion margins consistently".)
- **Atomic margin twips coercion** — `DOCX_RELAXED_MARGIN_TWIPS` no longer treats sides individually. If any provided side reads as twips (> 500), every provided side is coerced together so downstream math runs on a single unit. Previously `margins: { top: 1080, left: 100 }` could mix twips and points and feed the negative-tab calculator.
- **`<w:tblHeader/>` cleanup handles all OOXML "false" forms** — The structured serializer's regex now strips `w:val="false"`, `w:val="0"`, and `w:val="off"` so multi-table documents emit consistent header markers across rows.
- Added Phase 2 tracked-change OOXML support for paragraph property revisions, table property revisions, table cell insert/delete revisions, and paragraph/heading moves
- Added structural OOXML regression coverage for TOC, page-break, mixed body-order, and direct-authored tracked-change edge cases
- Added a repeatable manual-validation fixture pack and checklist for Word accept-all/reject-all verification

## 0.0.1 (2026-03-09)

Initial release.

- JSON schema to native `.docx` generation
- No DOM, Puppeteer, or browser required
- Direct OOXML binary output
- Themes and configurable page sizes (A4, Letter, etc.)
- Tables with striped styling and borders
- Native chart embedding
- Headings, paragraphs, and rich text formatting
- Image embedding with optional PDF/sharp processing
- TypeScript-first with full type definitions
