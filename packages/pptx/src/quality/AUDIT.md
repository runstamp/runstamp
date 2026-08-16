## PPTX Quality Audit

| Finding | Emitting source | Repair support | Fixture coverage | Release-gating |
| --- | --- | --- | --- | --- |
| `PPTX_NORMAUTOFIT_MISSING_FONTSCALE` | `src/quality/structuralValidation.ts` | `add_normautofit_font_scale` | `tests/preflight-quality.test.ts` plus chaos quality assertions | Yes |
| `PPTX_TABLE_CELL_TEXT_OVERFLOW` | `src/quality/structuralValidation.ts` | Report only | Chaos quality assertions | Yes |
| `PPTX_CHART_FORMAT_CODE_UNESCAPED` | `src/quality/structuralValidation.ts` | `escape_chart_format_codes` | Chaos quality assertions | Yes |
| `PPTX_CHART_WORKBOOK_MISSING` | `src/quality/structuralValidation.ts` | Report only | Structural validation path | Yes |
| `PPTX_LAYOUT_SHOULD_SPLIT` | `src/quality/report.ts` | Report only | `tests/preflight-quality.test.ts` | Yes |
| `PPTX_VISUAL_FALLBACK_MISSING` | `src/engine/slideProcessor.ts` | Report only | `tests/fallbackHonesty.test.ts` | Yes |
| `PPTX_CHART_FALLBACK_MISSING` | `src/ooxml/chart/index.ts` | Report only | `tests/fallbackHonesty.test.ts` | Yes |
| `PPTX_SLIDE_ID_NOT_UNIQUE` | `src/quality/structuralValidation.ts` | `dedupe_slide_ids` | `tests/preflight-quality.test.ts` plus chaos quality assertions | Yes |
| `PPTX_SHAPE_ID_NOT_UNIQUE` | `src/quality/structuralValidation.ts` | Report only | `tests/desktopValidation/structuralValidation.test.ts` | Yes |
| `PPTX_CUSTDATALIST_CONFLICT` | `src/quality/structuralValidation.ts` | `collapse_custdatalist` | Structural validation path | Yes |
| `PPTX_ELEMENT_ORDER_VIOLATION` | `src/quality/structuralValidation.ts` | `reorder_presentation_elements` | Structural validation path | Yes |
| `PPTX_MASTER_REF_UNRESOLVED` | `src/quality/structuralValidation.ts` | Report only | `tests/launchMatrix/structuralValidation.test.ts` | Yes |
| `PPTX_ELEMENT_POSITION_CASCADE` | `src/quality/structuralValidation.ts` | Report only | `tests/desktopValidation/structuralValidation.test.ts` | Yes |
| `SHARED_RELATIONSHIP_TARGET_MISSING` | `src/quality/structuralValidation.ts` | `remove_orphaned_relationships` | Structural validation path | Yes |
| `SHARED_RID_NOT_UNIQUE` | `src/quality/structuralValidation.ts` | Report only | Structural validation path | Yes |
| `SHARED_CONTENT_TYPE_DUPLICATE` | `src/quality/structuralValidation.ts` | `remove_duplicate_content_types` | Structural validation path | Yes |
| `SHARED_CONTENT_TYPE_MISSING` | `src/quality/structuralValidation.ts` | Report only | `tests/packageManifest.test.ts` | Yes |
| `SHARED_XML_PARSE_FAILURE` | `src/quality/structuralValidation.ts` | Report only | `tests/structuralValidationShared.test.ts` | Yes |
| `PPTX_STRUCTURAL_VALIDATION_FAILED` | `src/quality/structuralValidation.ts` | Report only | Structural validation path | Yes |
| Legacy slide-compatibility findings such as `OVERFLOW_BODY_TEXT`, `TABLE_TOO_DENSE`, `CHART_LABEL_COLLISION`, `FONT_FALLBACK_USED` | `src/quality/report.ts` from compatibility analysis | Report only | Existing compatibility suite plus `tests/preflight-quality.test.ts` smoke | No direct release block unless verdict degrades |

Notes:

- Shared-code projection now stays exact for structural findings and does not collapse unrelated legacy slide-quality findings into generic shared codes.
- Release gating flows through `pnpm run check:quality`, `pnpm run launch:check:public`, and `pnpm run check:enterprise`.
