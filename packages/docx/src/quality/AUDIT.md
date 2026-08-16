## DOCX Quality Audit

| Finding | Emitting source | Repair support | Fixture coverage | Release-gating |
| --- | --- | --- | --- | --- |
| `DOCX_RELATIONSHIP_TARGET_MISSING` | `src/quality/structural.ts` | `remove_orphan_relationships` plus placeholder media insertion | Structural quality path | Yes |
| `SHARED_RID_NOT_UNIQUE` | `src/quality/structural.ts` | Report only | Structural quality path | Yes |
| `DOCX_NUMBERING_DEF_MISSING` | `src/quality/structural.ts` | `create_numbering_xml` / `append_numbering_definition` | Structural quality path | Yes |
| `DOCX_STYLE_REF_MISSING` | `src/quality/structural.ts` | `repair_style_references` | Structural quality path | Yes |
| `DOCX_SECT_PR_MISSING` | `src/quality/structural.ts` | `append_minimal_sectpr` | Structural quality path | Yes |
| `DOCX_TABLE_WIDTH_MISMATCH` | `src/quality/structural.ts` | Report only | Structural quality path | Yes |
| `DOCX_TRACKED_CHANGE_MALFORMED` | `src/quality/structural.ts` | `repair_tracked_change_metadata` | `__tests__/quality-report.test.ts` | Yes |
| `DOCX_CONTENT_CONTROL_REF_BROKEN` | `src/quality/structural.ts` | `repair_content_controls` | `__tests__/quality-report.test.ts` | Yes |
| `DOCX_HEADING_HIERARCHY_BROKEN` | `src/quality/content.ts` | Report only | Chaos quality assertions | Yes |
| `DOCX_RUN_SPLIT_FORMATTING_LOSS` | `src/quality/content.ts` | Report only | Content quality path | Yes |
| `DOCX_IMAGE_REF_MISSING` | `src/quality/content.ts` | Report only | Content quality path | Yes |
| `DOCX_PARAGRAPH_OVERFLOW` | `src/quality/content.ts` | Report only | Content quality path | Yes |

Notes:

- `renderToDocxWithQuality()` remains additive; `renderToDocx()` is unchanged.
- MCP DOCX generators now block `rejected` artifacts before save and persist `-quality.json` sidecars for accepted outputs.
