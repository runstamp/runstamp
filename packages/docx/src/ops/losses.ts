/**
 * Fidelity taxonomy for the `docx` domain (OC-1 §3.5).
 *
 * Two channels feed this. `DocxInputWarning` reports coercions applied to the
 * caller's document before rendering; `DocxWarning` reports what the serializer,
 * the PDF bridge and the hydrator could not preserve. Both are mapped here, and
 * anything unrecognised becomes a `degraded` loss rather than silence — R17
 * makes an empty ledger a positive claim, so an unclassified condition must not
 * be able to slip through it.
 *
 * The dividing line follows R15: a coercion that renders exactly what the caller
 * meant is a `Diagnostic`, not a `Loss`. The relaxed-input codes are all of that
 * kind — a legacy spelling and the modern one describe the same document — so
 * counting them would make `losses: []` unreachable for correct input and
 * destroy the signal the ledger exists to carry.
 */

import { createDiagnostic, createLoss, formatLocator, parseLocator } from "@runstamp/contract";
import type { Diagnostic, ErrorCode, Locator, Loss, LossSeverity } from "@runstamp/contract";

/** The shape both docx warning channels reduce to. */
export interface EngineWarning {
  code: string;
  message: string;
  path?: string;
  from?: unknown;
  to?: unknown;
  recovery?: string;
  context?: Record<string, unknown>;
}

interface TaxonomyEntry {
  contractCode: ErrorCode;
  severity: LossSeverity;
  subject: string;
  avoidable: boolean;
  remediation?: string;
}

const TAXONOMY: Readonly<Record<string, TaxonomyEntry>> = {
  // The hydrator leaves the literal `{{placeholder}}` in the document, so the
  // reader sees template syntax where a value belonged. The text is present but
  // wrong, which is a degradation rather than a drop.
  DOCX_HYDRATE_UNFILLED_PLACEHOLDER: {
    contractCode: "docx/PLACEHOLDER_UNFILLED",
    severity: "degraded",
    subject: "template placeholder",
    avoidable: true,
    remediation:
      "Provide a value for the placeholder in the `data` argument, or pass `onMissing: \"remove\"` to strip it.",
  },
  // Word can split a placeholder across runs when it is edited in place. The
  // hydrator then cannot match it, so the value never lands.
  DOCX_HYDRATE_SPLIT_PLACEHOLDER: {
    contractCode: "docx/PLACEHOLDER_SPLIT",
    severity: "degraded",
    subject: "template placeholder",
    avoidable: true,
    remediation:
      "Retype the placeholder in one editing action so Word stores it as a single run, then re-save the template.",
  },
  // The PDF bridge approximates constructs Word expresses and PDF does not.
  DOCX_PDF_BRIDGE_FALLBACK: {
    contractCode: "docx/PDF_BRIDGE_APPROXIMATED",
    severity: "degraded",
    subject: "document element",
    avoidable: false,
  },
  // The HTML adapter drops constructs with no DOCX equivalent.
  DOCX_HTML_CONVERSION_WARNING: {
    contractCode: "docx/HTML_CONSTRUCT_UNSUPPORTED",
    severity: "degraded",
    subject: "HTML element",
    avoidable: false,
  },
  // Free-text from the serializer. The fidelity impact is genuinely unknown, so
  // R17 requires reporting it rather than assuming it was harmless.
  DOCX_SERIALIZER_WARNING: {
    contractCode: "docx/SERIALIZER_CONDITION",
    severity: "degraded",
    subject: "document",
    avoidable: false,
  },
};

/**
 * Codes that are observations, not fidelity deviations.
 *
 * The relaxed-input coercions rewrite a legacy spelling into the modern one and
 * render exactly what was meant. `DOCX_VALIDATE_*` are findings produced by
 * `validate`, where they are the value rather than a loss. The strict validator
 * warning reports a non-fatal OOXML nit in output Word opens correctly.
 */
const DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  "DOCX_RELAXED_THEME_STRING",
  "DOCX_RELAXED_CODE_BLOCK",
  "DOCX_RELAXED_MARGIN_TWIPS",
  "DOCX_RELAXED_PAGE_NUMBERS",
  "DOCX_RELAXED_META_KEY",
  "DOCX_RELAXED_CHART_POINTS",
  "DOCX_RELAXED_KIND_INJECTED",
  "DOCX_VALIDATE_SCHEMA",
  "DOCX_VALIDATE_IMAGE_NO_SRC",
  "DOCX_VALIDATE_TABLE_EMPTY",
  "DOCX_VALIDATE_CHART_NO_DATA",
  "DOCX_VALIDATE_HEADING_EMPTY",
  "DOCX_STRICT_VALIDATOR_WARNING",
]);

const UNCLASSIFIED: TaxonomyEntry = {
  contractCode: "docx/UNCLASSIFIED_CONDITION",
  severity: "degraded",
  subject: "document",
  avoidable: false,
};

/** Path segment names the docx document model uses → OC-1 locator kinds. */
const SEGMENT_KINDS: Readonly<Record<string, string>> = {
  pages: "page",
  elements: "part",
  children: "part",
  rows: "row",
  cells: "cell",
  columns: "column",
  items: "part",
  runs: "run",
  header: "header",
  footer: "footer",
  sections: "section",
};

const PATH_TOKEN = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/g;

/**
 * Build a locator from an engine path such as `pages[0].elements[2].rows[1]`.
 *
 * Returns `undefined` when the path addresses nothing structural — a locator is
 * a promise that the caller can navigate to the position, and a fabricated one
 * is worse than none (R22 binds the address to specific bytes).
 */
export function locatorFromEnginePath(path: string, artifact: string): Locator | undefined {
  const segments: { kind: string; index: number }[] = [];
  for (const match of path.matchAll(PATH_TOKEN)) {
    const kind = SEGMENT_KINDS[match[1] ?? ""];
    const index = match[2];
    if (kind !== undefined && index !== undefined) {
      segments.push({ kind, index: Number(index) });
    }
  }
  if (segments.length === 0) return undefined;

  const text = `${artifact}/docx:${segments
    .map((segment) => `${segment.kind}[${String(segment.index)}]`)
    .join("/")}`;
  // Round-tripping through the codec keeps C9 true by construction rather than
  // by assertion: anything this emits is something `parseLocator` accepts.
  return parseLocator(text);
}

export interface ClassifiedWarning {
  loss?: Loss;
  diagnostic?: Diagnostic;
}

export function classifyWarning(warning: EngineWarning, artifact: string): ClassifiedWarning {
  const locator =
    warning.path === undefined ? undefined : locatorFromEnginePath(warning.path, artifact);

  if (DIAGNOSTIC_CODES.has(warning.code)) {
    return {
      diagnostic: createDiagnostic({
        code: `docx/${warning.code}` as ErrorCode,
        severity: "info",
        phase: "input",
        message: warning.message,
        ...(locator !== undefined ? { locator } : {}),
        details: { path: warning.path ?? null, engineCode: warning.code },
      }),
    };
  }

  const entry = TAXONOMY[warning.code] ?? UNCLASSIFIED;
  const remediation = warning.recovery ?? entry.remediation;

  return {
    loss: createLoss({
      code: entry.contractCode,
      severity: entry.severity,
      subject: entry.subject,
      message: warning.message,
      ...(locator !== undefined ? { locator } : {}),
      ...(warning.from !== undefined ? { expected: String(warning.from) } : {}),
      ...(warning.to !== undefined ? { actual: String(warning.to) } : {}),
      avoidable: entry.avoidable,
      // R19: an avoidable loss the caller cannot act on is not actionable.
      ...(remediation !== undefined ? { remediation } : {}),
      details: { path: warning.path ?? null, engineCode: warning.code, ...warning.context },
    }),
  };
}

/** Loss codes this package can emit, for the C5 registry check. */
export const DOCX_LOSS_CODES: readonly ErrorCode[] = [
  ...new Set(Object.values(TAXONOMY).map((entry) => entry.contractCode)),
  UNCLASSIFIED.contractCode,
];

/** Engine warning codes this package classifies, for the C5 coverage check. */
export const CLASSIFIED_ENGINE_CODES: readonly string[] = [
  ...Object.keys(TAXONOMY),
  ...DIAGNOSTIC_CODES,
];

export { formatLocator };
