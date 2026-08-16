/**
 * Cross-phase composition fixtures (W2).
 *
 * Each builder targets the boundary between two adjacent phases. The
 * goal is regression coverage for `composePhases([…])` itself: the
 * point isn't to re-test what each phase does in isolation, it's to
 * catch when a higher phase silently strips, mis-routes, or
 * shadow-emits state that a lower phase needed to see.
 *
 * Boundaries covered (top-down):
 *   phase8-on-phase7 — PDF/A wrapper around a tagged document
 *   phase7-on-phase6 — tagged structure around interactive widgets
 *   phase6-on-phase5 — interactive widgets inside a paginated table
 *   phase5-on-phase3 — table inside a multi-column paginated layout
 */
import type { PdfDocumentPhase8 } from "../src/engine.js";
import type { PdfDocumentPhase7 } from "../src/phase7-types.js";
import type { PdfDocumentPhase6 } from "../src/phase6-types.js";
import type { PdfDocumentPhase3 } from "../src/phase3-types.js";
import { createTaggedDocument } from "./phase7-fixtures.js";
import { createMixedFormDocument } from "./phase6-fixtures.js";
import { ensurePhase2FontFixtures } from "./phase2-font-fixtures.js";
import { resolvePdfaIccProfilePath } from "./phase8-fixtures.js";

/**
 * Phase 8 wrapping Phase 7. Verifies that PDF/A-2a output preserves
 * the underlying tagged structure (StructTreeRoot, MarkInfo, role
 * map) instead of stripping it for the conformance pass.
 */
export async function createPhase8OnPhase7Document(): Promise<PdfDocumentPhase8> {
  const fonts = await ensurePhase2FontFixtures();
  const tagged = createTaggedDocument();
  return {
    ...tagged,
    accessibility: {
      ...(tagged.accessibility ?? {}),
      lang: "en-US",
      tagged: true,
    },
    meta: {
      ...(tagged.meta ?? {}),
      author: "Runstamp",
      creationDate: "2026-04-23T00:00:00.000Z",
      modDate: "2026-04-23T00:00:00.000Z",
      producer: "Runstamp json-to-pdf",
      title: "Composition: PDF/A wrapping tagged accessibility",
    },
    pdfa: {
      enabled: true,
      fallbackFont: { family: "Lato", source: fonts.lato },
      fallbackFonts: [{ family: "Noto Sans CJK JP", source: fonts.cjk }],
      iccProfile: resolvePdfaIccProfilePath(),
    },
  };
}

/**
 * Phase 7 wrapping Phase 6. Tagged structure must carry the
 * interactive form widgets along — each widget needs a /StructParent
 * back-reference and a Form role in the structure tree.
 */
export function createPhase7OnPhase6Document(): PdfDocumentPhase7 {
  return {
    accessibility: {
      lang: "en-US",
      tagged: true,
    },
    children: [
      {
        level: 1,
        type: "heading",
        value: "Membership application",
      },
      {
        type: "paragraph",
        value:
          "Tagged-tree structure must survive even when interactive widgets are interleaved with prose. The first/last name pair below must each have a /StructParent that resolves into the structure tree.",
      },
      {
        children: [
          {
            label: "First name",
            name: "first_name",
            style: { width: 220 },
            type: "form-text",
            value: "Ada",
          },
          {
            label: "Last name",
            name: "last_name",
            style: { marginTop: 8, width: 220 },
            type: "form-text",
            value: "Lovelace",
          },
          {
            checked: true,
            name: "subscribe",
            size: 14,
            style: { marginTop: 12 },
            type: "form-checkbox",
          },
        ],
        style: { marginTop: 16, width: 240 },
        type: "container",
      },
    ],
    meta: { title: "Composition: tagged structure + form widgets" },
  };
}

/**
 * Phase 6 wrapping Phase 5. Interactive widgets and a paginated
 * table coexist at the document level — both must survive the
 * paginator and end up on the page their layout-pass placed them on.
 * (Form widgets cannot live INSIDE table cells in the current
 * paginator — the cell content tokenizer expects text-bearing
 * children. The composition concern is whether widget /Rect
 * coordinates and table row coordinates both reflow correctly when
 * the table forces a page break.)
 */
export function createPhase6OnPhase5Document(): PdfDocumentPhase6 {
  return {
    children: [
      {
        level: 1,
        type: "heading",
        value: "Approval table",
      },
      {
        // Paginated table — its rows must split across page breaks.
        body: Array.from({ length: 60 }, (_, index) => ({
          cells: [
            { children: [{ type: "paragraph", value: `Row ${index + 1}` }] },
            { children: [{ type: "paragraph", value: index % 2 === 0 ? "Approved" : "Pending" }] },
            { children: [{ type: "paragraph", value: `Notes for row ${index + 1}.` }] },
          ],
        })),
        columns: [{ width: 80 }, { width: 80 }, {}],
        header: [
          {
            cells: [
              { children: [{ type: "paragraph", value: "ID" }], role: "th" },
              { children: [{ type: "paragraph", value: "Status" }], role: "th" },
              { children: [{ type: "paragraph", value: "Notes" }], role: "th" },
            ],
          },
        ],
        style: { marginTop: 12, width: "100%" },
        type: "table",
      },
      // After the table — form widgets that must end up on the LAST
      // page (or further), proving the paginator handed back the
      // correct cursor position to the interactive layer.
      {
        label: "Approver name",
        name: "approver_name",
        style: { marginTop: 24, width: 220 },
        type: "form-text",
        value: "",
      },
      {
        checked: false,
        name: "approve_all",
        size: 14,
        style: { marginTop: 12 },
        type: "form-checkbox",
      },
      {
        name: "approver_role",
        options: ["Manager", "Director", "VP"],
        style: { marginTop: 12, width: 180 },
        type: "form-dropdown",
        value: "Manager",
      },
    ],
    meta: { title: "Composition: form widgets after paginated table" },
  };
}

/**
 * Phase 5 wrapping Phase 3. A table inside a multi-page layout: the
 * paginator must let the table's row-splitter run inside the column,
 * not bypass it. This is the boundary where row-spanning failures
 * historically appeared as table-shaped holes on page breaks.
 */
export function createPhase5OnPhase3Document(): PdfDocumentPhase3 {
  return {
    children: [
      {
        level: 1,
        type: "heading",
        value: "Quarterly metrics",
      },
      {
        type: "paragraph",
        value:
          "Multi-page layout containing a long-running table. Each row must split cleanly at page boundaries; row-spans must reflow correctly.",
      },
      {
        body: Array.from({ length: 60 }, (_, index) => ({
          cells: [
            { children: [{ type: "paragraph", value: `Q${(index % 4) + 1}` }] },
            { children: [{ type: "paragraph", value: `Region ${(index % 5) + 1}` }] },
            {
              children: [
                {
                  type: "paragraph",
                  value: `Customer ${index + 1}, monthly revenue ${100 + index * 7}, churn risk ${(index % 3 === 0 ? "low" : index % 3 === 1 ? "medium" : "high")}.`,
                },
              ],
            },
          ],
        })),
        columns: [{ width: 60 }, { width: 100 }, {}],
        header: [
          {
            cells: [
              { children: [{ type: "paragraph", value: "Quarter" }], role: "th" },
              { children: [{ type: "paragraph", value: "Region" }], role: "th" },
              { children: [{ type: "paragraph", value: "Detail" }], role: "th" },
            ],
          },
        ],
        style: { marginTop: 12, width: "100%" },
        type: "table",
      },
      {
        type: "paragraph",
        value: "Trailing prose ensures that what comes after the table also flows correctly across page breaks.",
      },
    ],
    meta: { title: "Composition: table inside multi-page layout" },
  };
}

// Re-export the underlying mixed-form fixture so the test file can
// reference a single import for "any Phase 6 document".
export { createMixedFormDocument };
