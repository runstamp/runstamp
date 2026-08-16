/**
 * The DOCX controlled-document extension, projected onto canonical verbs.
 *
 * Redaction, controlled-document round-trip and text search have shipped inside
 * this package and were reachable through no contract at all, because they were
 * never given verbs. This is a binding, not an implementation.
 *
 * Two verbs land here, both new to the docx surface and neither colliding with
 * a hand-written one:
 *
 * - `redact` — the extension's `apply-redaction`. Redaction gets its own verb in
 *   OC-1 rather than being a flavour of `transform`, because it is the one
 *   transformation whose whole point is that it is irreversible and auditable.
 * - `inspect` — `inspect`, `find` and `preview-redaction` collapse here as
 *   qualifiers, so each stays addressable as `docx.inspect.<qualifier>`.
 *
 * `import`, `export` and `verify` are deliberately not projected yet: each
 * collides with a hand-written verb that has a different signature, and a shared
 * verb needs a dispatcher rather than a binding.
 */

import { projectExtension } from "@runstamp/protocol";
import type { ExtensionBinding, ExtensionProjection } from "@runstamp/protocol";

import { createDocxControlledDocumentExtension } from "../controlled-document/index.js";

const BINDING: ExtensionBinding = {
  domain: "docx",
  definition: createDocxControlledDocumentExtension(),
  verbs: {
    "apply-redaction": {
      verb: "redact",
      summary: "Apply a redaction plan to a Word document, reporting every removal as a loss.",
    },
    inspect: {
      verb: "inspect",
      qualifier: "controlled",
      summary: "Inspect a controlled Word document's parts and relationships.",
    },
    find: { verb: "inspect", qualifier: "find", summary: "Locate text in a Word document and return bound locators." },
    "preview-redaction": {
      verb: "inspect",
      qualifier: "redaction-preview",
      // The non-mutating half of the pair; mapping it to `transform` would throw
      // away the only guarantee that makes a preview worth having.
      summary: "Preview what a redaction plan would remove, without modifying the document.",
    },
  },
  lossSeverity: {
    // The part survives byte-for-byte but its meaning is not interpreted, so a
    // caller cannot be told what is inside it. Degraded, not dropped: nothing
    // was removed.
    DOCX_OPAQUE_PART_PRESERVED: "degraded",
  },
  remediation: {
    INVALID_INPUT: "Send the request shape this operation documents, with the DOCX bytes base64-encoded.",
    RESOURCE_LIMIT: "The document exceeded a bounded resource budget. Split it, or raise the budget on the request.",
    TIMEOUT: "Retry with a longer timeoutMs, or split the document into smaller units of work.",
    DOCX_INVALID_PACKAGE:
      "The bytes are not a readable .docx package. Confirm the file opens in Word, and that it was base64-encoded without truncation.",
    DOCX_OPERATION_FAILED:
      "The operation could not complete on this document. Check that every field the operation documents is present — a missing redaction plan or locator is the usual cause — then retry.",
  },
  fallbackRemediation:
    "Check the request against the controlled-document operation's documented shape; if it is well formed, report the code with the document that produced it.",
  engineVersion: "1.0.0",
  sideEffects: "none",
  stability: "stable",
};

export const DOCX_CONTROLLED: ExtensionProjection = projectExtension(BINDING);
