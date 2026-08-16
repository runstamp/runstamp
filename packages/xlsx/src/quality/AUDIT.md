## XLSX Quality Audit

| Finding | Emitting source | Repair support | Fixture coverage | Release-gating |
| --- | --- | --- | --- | --- |
| `XLSX_SHARED_STRING_INDEX_OOB` | `src/quality/workbook-quality.ts` | `REPAIR_SHARED_STRING_INDEX` | `__tests__/render-with-quality.test.ts` | Yes |
| `XLSX_STYLE_INDEX_OOB` | `src/quality/workbook-quality.ts` | `CLAMP_STYLE_INDEX` | Buffer validation path | Yes |
| `XLSX_SHEET_NAME_INVALID` | `src/quality/workbook-quality.ts` | `NORMALIZE_SHEET_NAMES` | `__tests__/render-with-quality.test.ts` plus chaos quality assertions | Yes |
| `XLSX_DUPLICATE_SHEET_NAME` | `src/quality/workbook-quality.ts` | `NORMALIZE_SHEET_NAMES` | `__tests__/render-with-quality.test.ts` | Yes |
| `XLSX_RELATIONSHIP_TARGET_MISSING` | `src/quality/workbook-quality.ts` | `REMOVE_ORPHAN_RELATIONSHIPS` | Buffer validation path | Yes |
| `SHARED_RID_NOT_UNIQUE` | `src/quality/workbook-quality.ts` | `DEDUPE_RELATIONSHIP_IDS` | Buffer validation path | Yes |
| `XLSX_FORMULA_CACHED_VALUE_MISSING` | `src/quality/workbook-quality.ts` | `ADD_FORMULA_CACHED_VALUES` | Buffer validation path | Yes |
| `XLSX_NAMED_RANGE_DEAD_REF` | `src/quality/workbook-quality.ts` | `REMOVE_INVALID_DEFINED_NAMES` | Buffer validation path | Yes |
| `XLSX_MERGE_OVERLAP` / `XLSX_MERGE_RANGE_OUT_OF_BOUNDS` | `src/quality/workbook-quality.ts` | `REPAIR_MERGES` | Buffer validation path | Yes |
| `SHARED_CONTENT_TYPE_MISSING` / `SHARED_CONTENT_TYPE_UNEXPECTED` | `src/quality/workbook-quality.ts` | `FIX_CONTENT_TYPES` | Buffer validation path | Yes |
| `XLSX_TABLE_RELATIONSHIP_BROKEN`, `XLSX_TABLE_NAME_DUPLICATE`, `XLSX_TABLE_REF_INVALID`, `XLSX_WORKSHEET_DIMENSION_MISMATCH`, `XLSX_RANGE_REF_INVALID`, `XLSX_HYPERLINK_TARGET_INVALID`, `XLSX_MACRO_STRIPPED`, `XLSX_EXTERNAL_CONNECTION_STRIPPED`, `XLSX_GOOGLE_SHEETS_IMPORT_RISK`, `XLSX_NUMBERS_COMPATIBILITY_WARNING`, `XLSX_HIGH_UNIQUE_STRING_COUNT`, `XLSX_STYLE_CARDINALITY_EXCESSIVE`, `XLSX_STREAM_MODE_RECOMMENDED`, `XLSX_FORMULA_REF_BROKEN`, `XLSX_DATE_BEFORE_1900`, `XLSX_LARGE_FILE_WARNING` | `src/quality/workbook-quality.ts` projected via `src/quality/shared-quality.ts` | Mixed conservative repair/report-only | Buffer validation path plus chaos parity | Yes |

Notes:

- The shared adapter now maps active workbook findings and repair entries exactly instead of collapsing them into `SHARED_XML_PARSE_FAILURE`.
- `SpreadsheetEngine.renderWithQuality()` remains additive and now backs MCP spreadsheet delivery gating.
