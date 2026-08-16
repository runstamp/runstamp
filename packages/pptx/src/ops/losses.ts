/**
 * Fidelity taxonomy for the `pptx` domain (OC-1 §3.5).
 *
 * The engine feeds this through `EngineRenderOptions.onInputWarning`. Anything
 * unrecognised becomes a `degraded` loss rather than silence — R17 makes an
 * empty ledger a positive claim, so an unclassified condition must not be able
 * to slip through it.
 *
 * The dividing line follows R15: a coercion that renders exactly what the caller
 * meant is a `Diagnostic`, not a `Loss`. The relaxed-input codes are all of that
 * kind, so counting them would make `losses: []` unreachable for correct input
 * and destroy the signal the ledger exists to carry.
 */

import { createDiagnostic, createLoss, parseLocator } from "@runstamp/contract";
import type { Diagnostic, ErrorCode, Locator, Loss, LossSeverity } from "@runstamp/contract";

/** The shape the engine's warning channel reduces to. */
export interface EngineWarning {
  code: string;
  message: string;
  path?: string;
  from?: unknown;
  to?: unknown;
}

interface TaxonomyEntry {
  contractCode: ErrorCode;
  severity: LossSeverity;
  subject: string;
  avoidable: boolean;
  remediation?: string;
}

const TAXONOMY: Readonly<Record<string, TaxonomyEntry>> = {
  /**
   * The silent-drop inventory: properties the schema accepts and the PPTX
   * writer emits no bytes for. Before the ledger existed these reached a logger
   * and nothing else, so a deck lost the effect and reported success.
   */
  PPTX_PROPERTY_NOT_RENDERED: {
    contractCode: "pptx/PROPERTY_NOT_RENDERED",
    severity: "dropped",
    subject: "shape property",
    avoidable: true,
    remediation:
      "Remove the property, or render with the full engine entry point rather than the size-constrained lite bundle.",
  },
  PPTX_FONT_FALLBACK_USED: {
    contractCode: "pptx/FONT_SUBSTITUTED",
    severity: "substituted",
    subject: "font",
    avoidable: true,
    remediation: "Embed the requested font, or choose one present on the target machine.",
  },
  PPTX_FONT_EMBED_FAILED: {
    contractCode: "pptx/FONT_EMBED_FAILED",
    severity: "substituted",
    subject: "font",
    avoidable: true,
    remediation: "Supply a font file the embedder can read, or drop the embedding request.",
  },
  PPTX_FONT_EMBEDDING_UNAVAILABLE: {
    contractCode: "pptx/FONT_EMBED_UNAVAILABLE",
    severity: "substituted",
    subject: "font",
    avoidable: false,
  },
  PPTX_OVERFLOW_BODY_TEXT: {
    contractCode: "pptx/TEXT_OVERFLOWS_SHAPE",
    severity: "degraded",
    subject: "body text",
    avoidable: true,
    remediation: "Shorten the text, enlarge the shape, or enable autofit.",
  },
  PPTX_TABLE_CELL_TEXT_OVERFLOW: {
    contractCode: "pptx/TABLE_CELL_OVERFLOWS",
    severity: "degraded",
    subject: "table cell",
    avoidable: true,
    remediation: "Shorten the cell text or widen the column.",
  },
  PPTX_CHART_WORKBOOK_MISSING: {
    contractCode: "pptx/CHART_DATA_MISSING",
    severity: "degraded",
    subject: "chart",
    avoidable: false,
  },
  PPTX_CHART_FALLBACK_MISSING: {
    contractCode: "pptx/CHART_FALLBACK_MISSING",
    severity: "degraded",
    subject: "chart",
    avoidable: false,
  },
  PPTX_CHART_LABEL_COLLISION: {
    contractCode: "pptx/CHART_LABELS_COLLIDE",
    severity: "degraded",
    subject: "chart labels",
    avoidable: true,
    remediation: "Reduce the number of data labels, or enlarge the chart.",
  },
  PPTX_VISUAL_FALLBACK_MISSING: {
    contractCode: "pptx/VISUAL_FALLBACK_MISSING",
    severity: "degraded",
    subject: "visual",
    avoidable: false,
  },
  PPTX_HYPERLINK_DANGLING: {
    contractCode: "pptx/HYPERLINK_DANGLING",
    severity: "degraded",
    subject: "hyperlink",
    avoidable: true,
    remediation: "Point the hyperlink at a slide or URL that exists.",
  },
  PPTX_ANIMATION_REF_BROKEN: {
    contractCode: "pptx/ANIMATION_REFERENCE_BROKEN",
    severity: "dropped",
    subject: "animation",
    avoidable: true,
    remediation: "Reference a shape that exists on the slide, or remove the animation.",
  },
  PPTX_RELATIONSHIP_TARGET_MISSING_LOSS: {
    contractCode: "pptx/RELATIONSHIP_TARGET_MISSING",
    severity: "degraded",
    subject: "deck part",
    avoidable: false,
  },
  PPTX_ASSET_MISSING: {
    contractCode: "pptx/ASSET_MISSING",
    severity: "dropped",
    subject: "image",
    avoidable: true,
    remediation: "Supply a reachable source for the asset, or remove the reference.",
  },
  PPTX_BRAND_MISMATCH: {
    contractCode: "pptx/BRAND_TOKEN_SUBSTITUTED",
    severity: "substituted",
    subject: "brand token",
    avoidable: true,
    remediation: "Define the token in the brand pack, or use one the pack provides.",
  },
  PPTX_LAYOUT_SUBSTITUTED: {
    contractCode: "pptx/LAYOUT_SUBSTITUTED",
    severity: "substituted",
    subject: "slide layout",
    avoidable: true,
    remediation: "Choose a layout the master defines.",
  },
  PPTX_MASTER_REF_UNRESOLVED: {
    contractCode: "pptx/MASTER_REFERENCE_UNRESOLVED",
    severity: "degraded",
    subject: "slide master",
    avoidable: false,
  },
};


/**
 * The quality report speaks a short vocabulary (`FONT_FALLBACK_USED`) while
 * input warnings speak the prefixed one (`PPTX_RELAXED_CHART_TYPE`). Both reach
 * `classifyWarning`, so the short forms are mapped here.
 *
 * The font findings matter most. `mapSharedCode` gives them no shared code
 * because they have no cross-format equivalent, which meant they had no route
 * into the ledger at all — yet an unembedded font is the single most common way
 * a deck looks wrong on someone else's machine.
 */
const QUALITY_FINDING_ALIASES: Readonly<Record<string, string>> = {
  FONT_FALLBACK_USED: "PPTX_FONT_FALLBACK_USED",
  FONT_COVERAGE_FALLBACK_USED: "PPTX_FONT_FALLBACK_USED",
  FONT_REQUESTED_FAMILY_NOT_EMBEDDED: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
  FONT_MISSING_FACE_VARIANT: "PPTX_FONT_EMBED_FAILED",
  OVERFLOW_BODY_TEXT: "PPTX_OVERFLOW_BODY_TEXT",
  TABLE_TOO_DENSE: "PPTX_TABLE_CELL_TEXT_OVERFLOW",
  CHART_LABEL_COLLISION: "PPTX_CHART_LABEL_COLLISION",
  CHART_WORKBOOK_MISSING: "PPTX_CHART_WORKBOOK_MISSING",
  CHART_FALLBACK_MISSING: "PPTX_CHART_FALLBACK_MISSING",
  VISUAL_FALLBACK_MISSING: "PPTX_VISUAL_FALLBACK_MISSING",
  MASTER_REF_UNRESOLVED: "PPTX_MASTER_REF_UNRESOLVED",
  RELATIONSHIP_TARGET_MISSING: "PPTX_RELATIONSHIP_TARGET_MISSING_LOSS",
  ASSET_MISSING: "PPTX_ASSET_MISSING",
  REQUIRED_LOGO_MISSING: "PPTX_ASSET_MISSING",
  BRAND_FONT_MISMATCH: "PPTX_BRAND_MISMATCH",
  BRAND_COLOR_MISMATCH: "PPTX_BRAND_MISMATCH",
  BRAND_TOKEN_MISSING: "PPTX_BRAND_MISMATCH",
  UNSUPPORTED_LAYOUT_SELECTION: "PPTX_LAYOUT_SUBSTITUTED",
};

/**
 * Codes that are observations, not fidelity deviations.
 *
 * The relaxed-input coercions rewrite a legacy spelling into the modern one and
 * produce exactly the deck the caller meant. The structural and ordering codes
 * are findings surfaced by `validate`, where they are the value rather than a
 * loss from rendering.
 */
const DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  "PPTX_RELAXED_CHART_POINTS",
  "PPTX_RELAXED_CHART_TYPE",
  "PPTX_RELAXED_DOCUMENT_TYPE",
  "PPTX_RELAXED_KPI_DELTA",
  "PPTX_RELAXED_META_TITLE",
  "PPTX_RELAXED_PATTERN_NAME",
  "PPTX_RELAXED_SLIDE_CONTENT",
  "PPTX_STRUCTURAL_VALIDATION_FAILED",
  "PPTX_ELEMENT_ORDER_VIOLATION",
  "PPTX_ELEMENT_POSITION_CASCADE",
  "PPTX_SHAPE_ID_NOT_UNIQUE",
  "PPTX_SLIDE_ID_NOT_UNIQUE",
  "PPTX_CUSTDATALIST_CONFLICT",
  "PPTX_LAYOUT_SHOULD_SPLIT",
  "PPTX_NORMAUTOFIT_MISSING_FONTSCALE",
  "PPTX_CHART_FORMAT_CODE_UNESCAPED",
  // Quality findings that report structure rather than lost fidelity: the deck
  // opens correctly and nothing the caller authored has changed.
  "FONT_SYSTEM_OPT_IN",
  // A capability note, not a deviation: it fires on every render because the
  // engine has no validated EOT encoder, and says nothing about whether *this*
  // deck lost a font. Reporting it as a loss would put a false positive in every
  // ledger, which is precisely what makes a ledger worthless.
  "FONT_EMBEDDING_UNAVAILABLE",
  "LAYOUT_SHOULD_SPLIT",
  "NORMAUTOFIT_MISSING_FONTSCALE",
  "CHART_FORMAT_CODE_UNESCAPED",
  "SLIDE_ID_NOT_UNIQUE",
  "CUSTDATALIST_CONFLICT",
  "ELEMENT_ORDER_VIOLATION",
  "ELEMENT_POSITION_CASCADE",
  "SHAPE_ID_NOT_UNIQUE",
  "RID_NOT_UNIQUE",
  "CONTENT_TYPE_DUPLICATE",
  "CONTENT_TYPE_MISSING",
  "XML_PARSE_FAILURE",
  "STRUCTURAL_VALIDATION_FAILED",
  "DESKTOP_VALIDATION_FAILED",
]);

const UNCLASSIFIED: TaxonomyEntry = {
  contractCode: "pptx/UNCLASSIFIED_CONDITION",
  severity: "degraded",
  subject: "document",
  avoidable: false,
};

/** Path segment names the deck model uses → OC-1 locator kinds. */
const SEGMENT_KINDS: Readonly<Record<string, string>> = {
  slides: "slide",
  children: "shape",
  rows: "row",
  cells: "cell",
  columns: "column",
  runs: "run",
  notes: "note",
};

const PATH_TOKEN = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/g;

/**
 * Build a locator from an engine path such as `slides[2].children[0]`.
 *
 * Returns `undefined` when the path addresses nothing structural — a locator
 * promises the caller can navigate to the position, and a fabricated one is
 * worse than none (R22 binds the address to specific bytes).
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

  const text = `${artifact}/pptx:${segments
    .map((segment) => `${segment.kind}[${String(segment.index)}]`)
    .join("/")}`;
  // Round-tripping through the codec keeps C9 true by construction.
  return parseLocator(text);
}

export interface ClassifiedWarning {
  loss?: Loss;
  diagnostic?: Diagnostic;
}

export function classifyWarning(warning: EngineWarning, artifact: string): ClassifiedWarning {
  const code = QUALITY_FINDING_ALIASES[warning.code] ?? warning.code;
  const locator =
    warning.path === undefined ? undefined : locatorFromEnginePath(warning.path, artifact);

  if (DIAGNOSTIC_CODES.has(code)) {
    return {
      diagnostic: createDiagnostic({
        code: `pptx/${code}` as ErrorCode,
        severity: "info",
        phase: "input",
        message: warning.message,
        ...(locator !== undefined ? { locator } : {}),
        details: { path: warning.path ?? null, engineCode: warning.code },
      }),
    };
  }

  const entry = TAXONOMY[code] ?? UNCLASSIFIED;

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
      ...(entry.remediation !== undefined ? { remediation: entry.remediation } : {}),
      details: { path: warning.path ?? null, engineCode: warning.code },
    }),
  };
}

/** Loss codes this package can emit, for the C5 registry check. */
export const PPTX_LOSS_CODES: readonly ErrorCode[] = [
  ...new Set(Object.values(TAXONOMY).map((entry) => entry.contractCode)),
  UNCLASSIFIED.contractCode,
];

/** Engine warning codes this package classifies, for the C5 coverage check. */
export const CLASSIFIED_ENGINE_CODES: readonly string[] = [
  ...Object.keys(TAXONOMY),
  ...Object.keys(QUALITY_FINDING_ALIASES),
  ...DIAGNOSTIC_CODES,
];
