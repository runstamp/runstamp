/**
 * The `pdf` fidelity taxonomy (OC-1 §3.5, R16–R19).
 *
 * The engine already detects every condition below and reports it through
 * `onInputWarning`. What it does not do is classify: a caller receives a flat
 * list of strings with no way to distinguish "we rewrote your legacy input
 * shape and lost nothing" from "four characters of your document were replaced
 * with question marks". This module is that classification, and it is the whole
 * point of Phase 4 — `losses: []` is only meaningful as a fidelity claim if the
 * things that *are* losses reliably show up in it.
 *
 * Two rules govern the table:
 *
 * - **R16/R17.** A warning becomes a `Loss` when the output does not faithfully
 *   represent the input, and a `Diagnostic` when it does. A coercion between two
 *   spellings of the same document is not a loss; a substituted glyph is.
 * - **R17, second half.** An unrecognized warning code is *not* dropped. Silence
 *   would be a false fidelity claim, so it degrades to a `degraded` loss.
 */

import { parseLocator } from "@runstamp/contract";
import type { Diagnostic, ErrorCode, Locator, Loss, LossSeverity } from "@runstamp/contract";

/** The engine's warning shape (`PdfInputWarning`), restated to avoid a cycle. */
export interface EngineWarning {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly from?: unknown;
  readonly to?: unknown;
}

interface TaxonomyEntry {
  readonly contractCode: ErrorCode;
  readonly severity: LossSeverity;
  /** What the caller thinks of as the affected thing. */
  readonly subject: string;
  readonly avoidable: boolean;
  /** Required when `avoidable` (R19): names the option that prevents it. */
  readonly remediation?: string;
  /**
   * What was actually emitted, when it is not `warning.to`.
   *
   * `PDF_WINANSI_UNMAPPABLE` carries the ASCII *suggestion* in `to`, which is
   * advice, not output — the byte written to the page is `?`. Reporting the
   * suggestion as `actual` would misreport the produced document.
   */
  readonly actualOverride?: string;
}

/**
 * Every code reachable through `onInputWarning`, exhaustively.
 *
 * Verified against the emit sites in `engine.ts`, `edge-policy.ts`,
 * `relaxed-input.ts` and `phases/phase3-layout.ts`. The C5 case in
 * `__tests__/ops-loss.test.ts` re-scans those files, so a warning code cannot be
 * added to the engine without being classified here.
 */
const TAXONOMY: Readonly<Record<string, TaxonomyEntry>> = {
  PDF_WINANSI_UNMAPPABLE: {
    contractCode: "pdf/TEXT_CHARACTER_UNMAPPABLE",
    severity: "substituted",
    subject: "text character",
    avoidable: true,
    remediation:
      "Embed a font that covers the character via the document's `font` option; the standard-14 PDF fonts are limited to WinAnsiEncoding.",
    actualOverride: "?",
  },
  PDF_FONT_GLYPH_MISSING: {
    contractCode: "pdf/TEXT_GLYPH_MISSING",
    // `dropped`, not `substituted`: nothing legible reaches the page. A reader
    // sees a blank or a box where the character was, so the content is gone
    // rather than approximated — and unlike a "?", nothing marks its absence.
    severity: "dropped",
    subject: "text character",
    avoidable: true,
    remediation:
      "Embed a font covering the character's script via the text's `font` or `fallbackFonts`; the bundled fallback (Lato) covers Latin, Greek and Cyrillic only.",
    actualOverride: "",
  },
  PDF_PAGE_SIZE_CLAMPED: {
    contractCode: "pdf/PAGE_SIZE_CLAMPED",
    severity: "degraded",
    subject: "page size",
    avoidable: true,
    remediation: "Set `page.size` within the range the PDF format permits so no clamping is required.",
  },
  PDF_ELEMENT_PAGE_OVERFLOW: {
    contractCode: "pdf/ELEMENT_OVERFLOWS_PAGE",
    severity: "degraded",
    subject: "element geometry",
    avoidable: true,
    remediation:
      "Reduce the element's height/minHeight, or increase the page size or reduce its margins, so the element fits the printable area.",
  },
  PDF_UNBREAKABLE_TOKEN_WRAPPED: {
    contractCode: "pdf/TOKEN_WRAPPED",
    severity: "degraded",
    subject: "text run",
    avoidable: true,
    remediation:
      "Insert a soft break (or a zero-width space) in the token, or widen the printable area, so the wrap point is chosen by you rather than by the layout engine.",
  },
  PDF_SCHEMA_VALIDATION_FAILED: {
    contractCode: "pdf/SCHEMA_FALLBACK_UNVERIFIED",
    severity: "degraded",
    subject: "document",
    avoidable: true,
    // R17: fidelity is *unknown* here, not known-good. Claiming full fidelity
    // for a document that bypassed schema validation would be a false claim.
    remediation:
      "Render with `strict: true` and fix the reported schema issues; with `strict: false` the document bypasses validation and its fidelity is unverified.",
  },
};

/**
 * Conditions the engine reports that are *not* fidelity losses.
 *
 * A relaxed-input coercion rewrites a legacy spelling into the modern one and
 * renders exactly what was meant; a header-only table renders exactly the table
 * that was described. Classifying these as losses would inflate the ledger and
 * make `losses: []` unachievable for correct documents — which would in turn
 * make it worthless as a signal.
 */
const DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  "PDF_RELAXED_TABLE_ROWS",
  "PDF_RELAXED_LIST_ITEMS",
  "PDF_TABLE_HEADER_ONLY",
]);

/** Engine path key → locator kind. Keys absent here are property accessors, not nodes. */
const SEGMENT_KINDS: Readonly<Record<string, string>> = {
  pages: "page",
  children: "part",
  header: "row",
  body: "row",
  footer: "row",
  rows: "row",
  items: "part",
  cells: "cell",
  columns: "column",
};

const PATH_TOKEN = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/g;

/**
 * Convert an engine path (`children[0].header[1].cells[2].style.minHeight`) into
 * a `Locator` bound to the artifact hash.
 *
 * Only tokens that name a real structural node with an index become segments.
 * Trailing property accessors (`.style.minHeight`, `.text`) are deliberately
 * *not* invented as locator segments — a locator must address something that
 * exists in the document tree, or C9/C10 round-tripping is meaningless. The full
 * engine path is preserved in `details.path` instead, so no precision is lost.
 *
 * Returns `undefined` when the path names no addressable node, in which case the
 * loss is reported without a locator rather than with a fabricated one.
 */
export function locatorFromEnginePath(path: string, artifact: string): Locator | undefined {
  const segments: { kind: string; index: number }[] = [];
  PATH_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATH_TOKEN.exec(path)) !== null) {
    const [, name, rawIndex] = match;
    if (name === undefined || rawIndex === undefined) continue;
    const kind = SEGMENT_KINDS[name];
    if (kind === undefined) continue;
    segments.push({ kind, index: Number(rawIndex) });
  }
  if (segments.length === 0) return undefined;

  // Built through the codec rather than by hand so anything this function can
  // emit is, by construction, something `parseLocator` accepts (C9).
  const rendered = `${artifact}/pdf:${segments.map((s) => `${s.kind}[${s.index}]`).join("/")}`;
  return parseLocator(rendered);
}

export interface ClassifiedWarning {
  readonly loss?: Loss;
  readonly diagnostic?: Diagnostic;
}

/**
 * Classify one engine warning as a loss or a diagnostic.
 *
 * `artifact` is the hash of the *input*, because at warning time the output does
 * not exist yet — the locator addresses the source document the caller handed us,
 * which is the thing they can actually go and fix.
 */
export function classifyWarning(warning: EngineWarning, artifact: string): ClassifiedWarning {
  if (DIAGNOSTIC_CODES.has(warning.code)) {
    return {
      diagnostic: {
        code: `pdf/${warning.code}`,
        severity: "info",
        // All three are decided while normalizing the caller's input, before layout.
        phase: "input",
        message: warning.message,
        ...(warning.path ? { details: { path: warning.path } } : {}),
      },
    };
  }

  const entry = TAXONOMY[warning.code] ?? UNCLASSIFIED;
  const locator = warning.path ? locatorFromEnginePath(warning.path, artifact) : undefined;
  const actual = entry.actualOverride ?? (warning.to !== undefined ? String(warning.to) : undefined);
  const expected = warning.from !== undefined ? String(warning.from) : undefined;

  return {
    loss: {
      code: entry.contractCode,
      severity: entry.severity,
      subject: entry.subject,
      message: warning.message,
      avoidable: entry.avoidable,
      ...(entry.remediation !== undefined ? { remediation: entry.remediation } : {}),
      ...(locator !== undefined ? { locator } : {}),
      ...(expected !== undefined ? { expected } : {}),
      ...(actual !== undefined ? { actual } : {}),
      details: { path: warning.path, engineCode: warning.code },
    },
  };
}

/**
 * The fallback for a warning code this table has never seen.
 *
 * Reporting it as a `degraded` loss is the conservative choice R17 demands:
 * an unclassified condition means fidelity is unknown, and unknown fidelity must
 * not be reported as full fidelity.
 */
const UNCLASSIFIED: TaxonomyEntry = {
  contractCode: "pdf/UNCLASSIFIED_CONDITION",
  severity: "degraded",
  subject: "document",
  avoidable: false,
};

/** The loss codes this package can emit, for the C5 registry check. */
export const PDF_LOSS_CODES: readonly ErrorCode[] = [
  ...new Set(Object.values(TAXONOMY).map((entry) => entry.contractCode)),
  UNCLASSIFIED.contractCode,
];

/** Engine warning codes this package classifies, for the coverage test. */
export const CLASSIFIED_ENGINE_CODES: readonly string[] = [
  ...Object.keys(TAXONOMY),
  ...DIAGNOSTIC_CODES,
];
