# Changelog

## 1.0.1 (2026-08-16)

- Correct package source, issue, and monorepo directory metadata. Runtime API and behavior are unchanged from 1.0.0.

## 0.0.9 (Pro)

- Keep routine implicit PowerPoint font-embedding capability diagnostics quiet
  on successful default renders; applications can opt in with `setLogger()`.

## 0.0.8 (Pro)

- Embed HarfBuzz WASM in the Pro server bundle so stock Next.js builds and
  traced production servers render without package-manager-specific paths.

## 0.0.7 (2026-07-28)

- Malformed presentation inputs now fail with a structured `PaperError` before layout walkers run.
- Routine automatic-font fallback diagnostics are quiet by default and remain available through `setLogger()`.
- Explicit `createEngine({ licenseKey })` values continue to take precedence over `RUNSTAMP_LICENSE_KEY` throughout Pro rendering.
- License failures expose stable `code`, `phase`, `feature`, `remediation`, and `upgradeUrl` fields.

## 0.0.1 (2026-03-09)

Initial release.

- JSON document tree to native `.pptx` generation
- Natively editable charts with embedded Excel data
- Yoga WASM flexbox layout engine
- OpenType text shaping via HarfBuzz
- 40+ OOXML preset shapes
- Tables with header styling, alternating rows, borders
- Template mutation (apply JSON data to existing `.pptx` templates)
- AI-friendly semantic interpreter (AgentDocument)
- SmartArt-like diagrams (6 types)
- Zod schema validation
- Font-aware text measurement (fontkit)
- TypeScript-first with full type definitions
