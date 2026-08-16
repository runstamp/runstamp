## PDF Quality Audit

| Finding | Emitting source | Repair support | Fixture coverage | Release-gating |
| --- | --- | --- | --- | --- |
| `PDF_XREF_OFFSET_INCORRECT` | `src/phase10-validate.ts` | `XREF_OFFSET_MISMATCH` rebuild | Shared-quality test path | Yes |
| `PDF_XREF_ENTRY_ZERO_OFFSET` | `src/phase10-validate.ts` | Report only | Validation path | Yes |
| `PDF_XREF_TABLE_MISSING` | `src/phase10-validate.ts` | Rebuild xref | Validation path | Yes |
| `PDF_STREAM_LENGTH_INCORRECT` | `src/phase10-validate.ts` | `STREAM_LENGTH_MISMATCH` recalculation | Validation path | Yes |
| `PDF_EOF_MARKER_MISSING` | `src/phase10-validate.ts` | Rebuild xref trailer | `__tests__/render-with-quality.test.ts` plus chaos quality assertions | Yes |
| `PDF_ROOT_OBJECT_INVALID` | `src/phase10-validate.ts` | Report only | Validation path | Yes |
| `PDF_FONT_OBJECT_MISSING` | `src/phase10-validate.ts` | Report only | Validation path | Yes |
| `PDF_FONT_SUBSET_INCOMPLETE` | `src/phase10-validate.ts` | Report only | Validation path | Yes |
| `PDF_SIGNATURE_INVALID`, `PDF_SIGNATURE_MISSING`, `PDF_SIGNATURE_BYTERANGE_INVALID`, `PDF_TIMESTAMP_MISSING`, `PDF_TIMESTAMP_INVALID`, `PDF_PAGE_TREE_COUNT_MISMATCH`, `PDF_TAG_MCID_GAP`, `PDF_SELF_REFERENCE`, `PDF_METADATA_INFO_XMP_MISMATCH`, `PDF_OBJECT_NUMBER_REUSE` | `src/phase10-validate.ts` projected via `src/shared-quality.ts` | Mixed conservative repair/report-only | Validation path plus delivery gating | Yes |

Notes:

- The shared adapter now maps each active phase-10 finding exactly instead of collapsing non-core issues into `PDF_OBJECT_NUMBER_REUSE`.
- MCP PDF-producing tools now validate, auto-fix conservatively where supported, persist `-quality.json`, and block delivery on `rejected`.
