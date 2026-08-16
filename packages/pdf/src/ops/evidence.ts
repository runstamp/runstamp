/**
 * The PDF evidence extension, projected onto canonical verbs.
 *
 * `createPdfEvidenceExtension` has shipped inside this package for a while:
 * redaction, evidence extraction, text search and OCR routing, all tested. None
 * of it was reachable through the contract, because it was never given a verb.
 * The gap was projection, not construction — so this is a binding, not an
 * implementation.
 *
 * Three verbs land here and none of them collide with the hand-written surface:
 *
 * - `redact` — the first `redact` operation in the whole catalog, and the cell a
 *   buyer comparing against a heavyweight PDF SDK checks on their first page.
 * - `convert` — the extension's `export`, producing a sanitized derivative.
 * - `inspect` — three read-only operations (`inspect`, `find`,
 *   `preview-redaction`) collapse here, which is exactly what qualifiers are
 *   for: they stay individually addressable as `pdf.inspect.<qualifier>`.
 *
 * The extension's `extract`, `render`, `ocr-route` and `verify` are deliberately
 * *not* projected yet. Each collides with a hand-written verb that already has a
 * different signature, and a shared verb needs a dispatcher rather than a
 * binding. That is a separate, well-understood piece of work; shipping the
 * collision-free half first is not a shortcut, it is what keeps the surface
 * honest in the meantime.
 */

import { projectExtension } from "@runstamp/protocol/operation-projection";
import type { ExtensionBinding, ExtensionProjection } from "@runstamp/protocol/operation-projection";

import { createPdfEvidenceExtension } from "../evidence-processing.js";

/**
 * What each declared loss means for the customer's content.
 *
 * Graded from the manifest's own descriptions, not from the code names.
 * `substituted` means something stood in for the original, `degraded` that it
 * survived with less fidelity, `dropped` that it is not in the output at all —
 * and most of what redaction and sanitization do is genuinely dropping.
 */
const LOSS_SEVERITY = {
  // Sanitized derivatives do not carry these across at all.
  PDF_ANNOTATIONS_STRIPPED: "dropped",
  PDF_ATTACHMENTS_STRIPPED: "dropped",
  PDF_METADATA_STRIPPED: "dropped",
  PDF_GRAPHICS_NOT_PRESERVED: "dropped",
  PDF_FORM_INTERACTIVITY_STRIPPED: "dropped",
  // The signature is still present but no longer proves anything, which is a
  // loss the caller must be told about before they distribute the file.
  PDF_SIGNATURE_INVALIDATED: "dropped",
  // Text that could not be decoded, or needs OCR the caller has to supply, is
  // absent from the result rather than approximated.
  PDF_TEXT_UNDECODABLE: "dropped",
  PDF_OCR_REQUIRED: "dropped",
  // Geometry survives, but as canonical boxes rather than exact source metrics.
  PDF_GEOMETRY_APPROXIMATED: "degraded",
} as const;

const REMEDIATION = {
  INVALID_INPUT:
    "Send the request shape this operation documents, with the PDF bytes base64-encoded under the documented key.",
  RESOURCE_LIMIT:
    "The document exceeded a bounded resource budget. Split it, or raise the budget on the request context.",
  TIMEOUT: "Retry with a longer timeoutMs, or split the document into smaller units of work.",
  PDF_UNSUPPORTED:
    "The request asked for something this operation cannot do on this document — an empty query, a locator from a different PDF, or overlapping redaction ranges. Check the message, which names which.",
} as const;

const BINDING: ExtensionBinding = {
  domain: "pdf",
  // `PdfEvidenceExtensionDefinition` is a parallel declaration of the same
  // shape, written before this package depended on `@runstamp/extension-kit`:
  // its result type is looser, with an optional `output` and a `status` that is
  // not a discriminated union. The narrowing is safe because `runExtension`
  // validates every result against the manifest with zod before returning it, so
  // a result that does not in fact match arrives as a typed `INVALID_RESULT`
  // failure rather than as a silent mis-typed value. Collapsing the two
  // declarations belongs with the wider extension-kit adoption, not here.
  definition: createPdfEvidenceExtension() as unknown as ExtensionBinding["definition"],
  verbs: {
    redact: { verb: "redact", summary: "Apply a redaction plan to PDF bytes, reporting every removal as a loss." },
    export: { verb: "convert", summary: "Export a sanitized derivative of a PDF, without active content." },
    inspect: {
      verb: "inspect",
      qualifier: "evidence",
      summary: "Inspect a PDF's evidence structure without executing active content.",
    },
    find: { verb: "inspect", qualifier: "find", summary: "Locate text within a PDF and return bound locators." },
    "preview-redaction": {
      verb: "inspect",
      qualifier: "redaction-preview",
      // The non-mutating half of the redaction pair. Mapping it to `transform`
      // would throw away the only guarantee that makes a preview worth having.
      summary: "Preview what a redaction plan would remove, without modifying the document.",
    },
  },
  lossSeverity: LOSS_SEVERITY,
  remediation: REMEDIATION,
  fallbackRemediation:
    "Check the request against the PDF evidence operation's documented shape; if it is well formed, report the code with the document that produced it.",
  engineVersion: "1.0.0",
  sideEffects: "none",
  stability: "stable",
};

export const PDF_EVIDENCE: ExtensionProjection = projectExtension(BINDING);
