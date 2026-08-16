import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  createDiagnostic,
  createLoss,
  parseLocator
} from "./chunk-S4LZHR2L.js";

// src/ops/losses.ts
var TAXONOMY = {
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
    remediation: "Remove the property, or render with the full engine entry point rather than the size-constrained lite bundle."
  },
  PPTX_FONT_FALLBACK_USED: {
    contractCode: "pptx/FONT_SUBSTITUTED",
    severity: "substituted",
    subject: "font",
    avoidable: true,
    remediation: "Embed the requested font, or choose one present on the target machine."
  },
  PPTX_FONT_EMBED_FAILED: {
    contractCode: "pptx/FONT_EMBED_FAILED",
    severity: "substituted",
    subject: "font",
    avoidable: true,
    remediation: "Supply a font file the embedder can read, or drop the embedding request."
  },
  PPTX_FONT_EMBEDDING_UNAVAILABLE: {
    contractCode: "pptx/FONT_EMBED_UNAVAILABLE",
    severity: "substituted",
    subject: "font",
    avoidable: false
  },
  PPTX_OVERFLOW_BODY_TEXT: {
    contractCode: "pptx/TEXT_OVERFLOWS_SHAPE",
    severity: "degraded",
    subject: "body text",
    avoidable: true,
    remediation: "Shorten the text, enlarge the shape, or enable autofit."
  },
  PPTX_TABLE_CELL_TEXT_OVERFLOW: {
    contractCode: "pptx/TABLE_CELL_OVERFLOWS",
    severity: "degraded",
    subject: "table cell",
    avoidable: true,
    remediation: "Shorten the cell text or widen the column."
  },
  PPTX_CHART_WORKBOOK_MISSING: {
    contractCode: "pptx/CHART_DATA_MISSING",
    severity: "degraded",
    subject: "chart",
    avoidable: false
  },
  PPTX_CHART_FALLBACK_MISSING: {
    contractCode: "pptx/CHART_FALLBACK_MISSING",
    severity: "degraded",
    subject: "chart",
    avoidable: false
  },
  PPTX_CHART_LABEL_COLLISION: {
    contractCode: "pptx/CHART_LABELS_COLLIDE",
    severity: "degraded",
    subject: "chart labels",
    avoidable: true,
    remediation: "Reduce the number of data labels, or enlarge the chart."
  },
  PPTX_VISUAL_FALLBACK_MISSING: {
    contractCode: "pptx/VISUAL_FALLBACK_MISSING",
    severity: "degraded",
    subject: "visual",
    avoidable: false
  },
  PPTX_HYPERLINK_DANGLING: {
    contractCode: "pptx/HYPERLINK_DANGLING",
    severity: "degraded",
    subject: "hyperlink",
    avoidable: true,
    remediation: "Point the hyperlink at a slide or URL that exists."
  },
  PPTX_ANIMATION_REF_BROKEN: {
    contractCode: "pptx/ANIMATION_REFERENCE_BROKEN",
    severity: "dropped",
    subject: "animation",
    avoidable: true,
    remediation: "Reference a shape that exists on the slide, or remove the animation."
  },
  PPTX_RELATIONSHIP_TARGET_MISSING_LOSS: {
    contractCode: "pptx/RELATIONSHIP_TARGET_MISSING",
    severity: "degraded",
    subject: "deck part",
    avoidable: false
  },
  PPTX_ASSET_MISSING: {
    contractCode: "pptx/ASSET_MISSING",
    severity: "dropped",
    subject: "image",
    avoidable: true,
    remediation: "Supply a reachable source for the asset, or remove the reference."
  },
  PPTX_BRAND_MISMATCH: {
    contractCode: "pptx/BRAND_TOKEN_SUBSTITUTED",
    severity: "substituted",
    subject: "brand token",
    avoidable: true,
    remediation: "Define the token in the brand pack, or use one the pack provides."
  },
  PPTX_LAYOUT_SUBSTITUTED: {
    contractCode: "pptx/LAYOUT_SUBSTITUTED",
    severity: "substituted",
    subject: "slide layout",
    avoidable: true,
    remediation: "Choose a layout the master defines."
  },
  PPTX_MASTER_REF_UNRESOLVED: {
    contractCode: "pptx/MASTER_REFERENCE_UNRESOLVED",
    severity: "degraded",
    subject: "slide master",
    avoidable: false
  }
};
var QUALITY_FINDING_ALIASES = {
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
  UNSUPPORTED_LAYOUT_SELECTION: "PPTX_LAYOUT_SUBSTITUTED"
};
var DIAGNOSTIC_CODES = /* @__PURE__ */ new Set([
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
  "DESKTOP_VALIDATION_FAILED"
]);
var UNCLASSIFIED = {
  contractCode: "pptx/UNCLASSIFIED_CONDITION",
  severity: "degraded",
  subject: "document",
  avoidable: false
};
var SEGMENT_KINDS = {
  slides: "slide",
  children: "shape",
  rows: "row",
  cells: "cell",
  columns: "column",
  runs: "run",
  notes: "note"
};
var PATH_TOKEN = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/g;
function locatorFromEnginePath(path, artifact) {
  const segments = [];
  for (const match of path.matchAll(PATH_TOKEN)) {
    const kind = SEGMENT_KINDS[match[1] ?? ""];
    const index = match[2];
    if (kind !== void 0 && index !== void 0) {
      segments.push({ kind, index: Number(index) });
    }
  }
  if (segments.length === 0) return void 0;
  const text = `${artifact}/pptx:${segments.map((segment) => `${segment.kind}[${String(segment.index)}]`).join("/")}`;
  return parseLocator(text);
}
function classifyWarning(warning, artifact) {
  const code = QUALITY_FINDING_ALIASES[warning.code] ?? warning.code;
  const locator = warning.path === void 0 ? void 0 : locatorFromEnginePath(warning.path, artifact);
  if (DIAGNOSTIC_CODES.has(code)) {
    return {
      diagnostic: createDiagnostic({
        code: `pptx/${code}`,
        severity: "info",
        phase: "input",
        message: warning.message,
        ...locator !== void 0 ? { locator } : {},
        details: { path: warning.path ?? null, engineCode: warning.code }
      })
    };
  }
  const entry = TAXONOMY[code] ?? UNCLASSIFIED;
  return {
    loss: createLoss({
      code: entry.contractCode,
      severity: entry.severity,
      subject: entry.subject,
      message: warning.message,
      ...locator !== void 0 ? { locator } : {},
      ...warning.from !== void 0 ? { expected: String(warning.from) } : {},
      ...warning.to !== void 0 ? { actual: String(warning.to) } : {},
      avoidable: entry.avoidable,
      // R19: an avoidable loss the caller cannot act on is not actionable.
      ...entry.remediation !== void 0 ? { remediation: entry.remediation } : {},
      details: { path: warning.path ?? null, engineCode: warning.code }
    })
  };
}
var PPTX_LOSS_CODES = [
  ...new Set(Object.values(TAXONOMY).map((entry) => entry.contractCode)),
  UNCLASSIFIED.contractCode
];
var CLASSIFIED_ENGINE_CODES = [
  ...Object.keys(TAXONOMY),
  ...Object.keys(QUALITY_FINDING_ALIASES),
  ...DIAGNOSTIC_CODES
];

export {
  classifyWarning,
  PPTX_LOSS_CODES
};
//# sourceMappingURL=chunk-LNYSZAHA.js.map
