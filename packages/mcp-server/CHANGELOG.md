# Changelog

## 1.0.0

- Replaced the bundled generator suite with three catalog-driven MCP tools.
- Added optional local engine peers and auto/local/hosted execution routing.
- Added typed configuration failures and explicit preview API configuration.

## 0.2.0 (2026-04-20)

Free-tier-only rewrite. Breaking.

- Removed the hosted cloud renderer. The server now runs entirely in-process
  against the free-tier `@runstamp/json-to-*` packages. No `RUNSTAMP_API_KEY`,
  no network calls, no account required.
- Retargeted `generate_presentation` onto `@runstamp/pptx` via the
  `AgentDocument` schema and built-in layout builders (title / statement /
  dashboard / comparison / chart-focus / bullets).
- Retargeted `generate_invoice`, `generate_report`, and `generate_chart_document`
  onto `@runstamp/pdf` with hand-built `PdfDocument` ASTs. The chart
  tool now ships with a deterministic SVG renderer for bar / line / area / pie
  / scatter charts.
- Dropped the `render_template` and `preview_template` tools (required hosted
  template rendering).
- Dropped PDF export from `generate_presentation` (PPTX→PDF requires a Pro
  license); the tool now outputs PPTX only.
- Dropped the `compliance` block from the PDF invoice schema.
- Removed cloud-tier 401 / 403 error paths and every Pro-upsell string
  previously returned to agents at runtime.
- Trimmed `axios` from runtime dependencies.

## 0.1.0 (2026-03-09)

Initial release.

- MCP server for Claude, Cursor, and MCP-compatible AI agents
- Generate `.pptx`, `.docx`, `.xlsx`, and `.pdf` files as real file outputs
- Local DOCX rendering (no API key required for DOCX tools)
- Three DOCX tools: `generate_report_docx`, `generate_contract_docx`, `generate_invoice_docx`
- Presentation, report, invoice, and spreadsheet generation
- `runstamp-mcp` CLI entrypoint
