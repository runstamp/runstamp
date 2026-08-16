/**
 * The XLSX structured-workflow extension, projected onto canonical verbs.
 *
 * Three verbs land here, all new to the xlsx surface:
 *
 * - `parse` — the extension's `read`: workbook bytes into the structured model.
 *   Until now xlsx could be written but not read through the contract, which
 *   made it a generator rather than a document-operations surface.
 * - `transform` — `map`, applying a mapping to a workbook.
 * - `convert` — `export`.
 *
 * `inspect`, `import`, `write` and `verify` are not projected: each collides
 * with a hand-written verb of a different signature, and a shared verb needs a
 * dispatcher rather than a binding.
 */

import { projectExtension } from "@runstamp/protocol/operation-projection";
import type { ExtensionBinding, ExtensionProjection } from "@runstamp/protocol/operation-projection";

import { createXlsxStructuredWorkflowExtension } from "../structured-workflow.js";

const BINDING: ExtensionBinding = {
  domain: "xlsx",
  definition: createXlsxStructuredWorkflowExtension() as unknown as ExtensionBinding["definition"],
  verbs: {
    read: { verb: "parse", summary: "Read workbook bytes into the structured model." },
    map: { verb: "transform", summary: "Apply a mapping to a workbook and return the result." },
    export: { verb: "convert", summary: "Export a workbook to the requested target form." },
  },
  lossSeverity: {
    // Preserved verbatim but uninterpreted: nothing is removed, but the caller
    // cannot be told what the part contains.
    XLSX_OPAQUE_PART_PRESERVED: "degraded",
  },
  remediation: {
    INVALID_INPUT: "Send the request shape this operation documents, with the workbook bytes base64-encoded.",
    RESOURCE_LIMIT: "The workbook exceeded a bounded resource budget. Split it, or raise the budget on the request.",
    TIMEOUT: "Retry with a longer timeoutMs, or split the workbook into smaller units of work.",
    XLSX_ABORTED: "Retry without aborting the operation, or allow a longer deadline.",
    XLSX_ARCHIVE_UNSAFE: "Send a valid XLSX ZIP package with safe part paths and the required workbook relationships.",
    XLSX_BUDGET_EXCEEDED: "Reduce the workbook size or raise the applicable input, part, or cell budget.",
    XLSX_CELL_NOT_FOUND: "Use a worksheet and cell reference present in the imported workbook.",
    XLSX_ENCRYPTED_UNSUPPORTED: "Decrypt the workbook before processing it.",
    XLSX_FORMULA_INJECTION: "Send the value as text or explicitly choose a safe formula policy.",
    XLSX_MAPPING_UNRESOLVED: "Correct the mapping target so it resolves to a unique workbook cell.",
  },
  fallbackRemediation:
    "Check the request against the structured-workflow operation's documented shape; if it is well formed, report the code with the workbook that produced it.",
  engineVersion: "1.0.0",
  sideEffects: "none",
  stability: "stable",
};

export const XLSX_WORKFLOW: ExtensionProjection = projectExtension(BINDING);
