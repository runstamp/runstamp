# Changelog

## 1.0.1 (2026-08-16)

- Correct package source, issue, and monorepo directory metadata. Runtime API and behavior are unchanged from 1.0.0.

## 0.3.4 (2026-07-28)

- `SpreadsheetEngine` render options now accept `licenseKey`; an explicit key takes precedence over `RUNSTAMP_LICENSE_KEY` in Pro builds.
- License failures expose the shared structured license-error fields.

## 0.3.1 (2026-07-13)

- **Deterministic test bootstrap** — `setDeterministicMode(enabled?)` / `isDeterministicModeEnabled()` are exported from the package root, and the package Vitest setup now enables deterministic mode before tests run. Rendering remains deterministic by default unless an individual render passes `{ deterministic: false }`.
- **Strict validation default confirmed** — XLSX rendering already fails closed at the schema and workbook-invariant layers before writing bytes. This release aligns the version line with the cross-engine strict-default change; use `relaxed: true` only to enable documented legacy-shape coercions before the same strict validation pass.
- **Cross-engine `validate(doc)` parity** — `SpreadsheetEngine.lint(doc)` is the xlsx side of a uniform soft-validator API now also implemented as `PdfEngine.validate(doc)` (json-to-pdf) and `validateDocxDocument(doc)` (json-to-docx). All three return `{ ok | valid, issues }` with `{ severity, code, message, path }` so an LLM/CLI can call one shape against any engine.
- **`cellIs` formula accepts `[lower, upper]` tuples** — `between` and `notBetween` rules now require a tuple formula at the schema boundary; the serializer emits two `<formula>` children. Previous single-string `formula` for `between` rules silently produced a workbook Excel rejected. Driven by `docs/0428-claude-test-based-directive2.md` §"@runstamp/xlsx" item "Conditional formatting `between` operator emits a single `<formula>` element".
- **`SpreadsheetEngine.lint(document)`** — new static lint pass returning `{ ok, issues: SpreadsheetLintIssue[] }`. Catches structural issues that produce a syntactically valid `.xlsx` but trip Excel: sheet name length > 31, illegal chars (`\\ / ? * [ ] :`), reserved name `History`, duplicate names case-insensitively, `autoFilter` and conditional-formatting refs extending past sheet bounds, and `between`/`notBetween` rules with non-tuple formulas. Also exported as `lintSpreadsheetDocument`. (Directive item "expose `SpreadsheetEngine.lint(doc)` ...".)
- **README — Conditional Formatting evaluation order** documented with a worked example; the previous CF example was rewritten to match the actual schema (`conditionalFormatting`/`ref`/`rules` instead of `conditionalFormats`/`range`).

## 0.0.1 (2026-03-09)

Initial release.

- JSON to native `.xlsx` workbook generation
- Shared and inline strings, numbers, booleans, dates
- Multiple sheets with configurable names and visibility
- Fonts, fills, borders, alignment, number formats
- Rich text inline strings
- Formulas with cached evaluation support
- Merges, freeze panes, filters, validations, hyperlinks, named ranges
- Conditional formatting (cellIs, colorScale, dataBar, top10, duplicateValues, uniqueValues)
- Native Excel tables with totals rows and table styles
- Deterministic output with dual ESM/CJS exports
- Template parsing, inspection, and assembly
- Streamed ZIP output
- Workbook-level validation, repair, and quality analysis
- TypeScript-first with full type definitions
