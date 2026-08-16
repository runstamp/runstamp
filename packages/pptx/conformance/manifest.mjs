/**
 * OC-1 conformance manifest for the `pptx` domain (OC-1 §7).
 *
 * Consumed by `pnpm contract:verify pptx`. Plain ESM so the runner can import it
 * without a build step, and so the fixtures stay readable as data rather than
 * being buried in a test file.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { completeFixtureCoverage } from "@runstamp/contract/verify";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");

/**
 * Engine warning codes this package classifies into losses or diagnostics.
 *
 * Declared here rather than imported from `src/ops/losses.ts`: R35 keeps the
 * taxonomy off the `./ops` surface, and an independent declaration is what lets
 * C5 detect drift.
 */
const CLASSIFIED = [
  "PPTX_PROPERTY_NOT_RENDERED",
  "PPTX_FONT_FALLBACK_USED",
  "PPTX_FONT_EMBED_FAILED",
  "PPTX_FONT_EMBEDDING_UNAVAILABLE",
  "PPTX_OVERFLOW_BODY_TEXT",
  "PPTX_TABLE_CELL_TEXT_OVERFLOW",
  "PPTX_CHART_WORKBOOK_MISSING",
  "PPTX_CHART_FALLBACK_MISSING",
  "PPTX_CHART_LABEL_COLLISION",
  "PPTX_VISUAL_FALLBACK_MISSING",
  "PPTX_HYPERLINK_DANGLING",
  "PPTX_ANIMATION_REF_BROKEN",
  "PPTX_MASTER_REF_UNRESOLVED",
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
  // The quality report speaks a short vocabulary; the taxonomy aliases it.
  "FONT_FALLBACK_USED",
  "FONT_COVERAGE_FALLBACK_USED",
  "FONT_REQUESTED_FAMILY_NOT_EMBEDDED",
  "FONT_MISSING_FACE_VARIANT",
  "FONT_EMBEDDING_UNAVAILABLE",
  "FONT_SYSTEM_OPT_IN",
  "OVERFLOW_BODY_TEXT",
  "TABLE_TOO_DENSE",
  "CHART_LABEL_COLLISION",
  "CHART_WORKBOOK_MISSING",
  "CHART_FALLBACK_MISSING",
  "VISUAL_FALLBACK_MISSING",
  "MASTER_REF_UNRESOLVED",
  "RELATIONSHIP_TARGET_MISSING",
  "ASSET_MISSING",
  "REQUIRED_LOGO_MISSING",
  "BRAND_FONT_MISMATCH",
  "BRAND_COLOR_MISMATCH",
  "BRAND_TOKEN_MISSING",
  "UNSUPPORTED_LAYOUT_SELECTION",
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
  "PPTX_RELATIONSHIP_TARGET_MISSING_LOSS",
  "PPTX_ASSET_MISSING",
  "PPTX_BRAND_MISMATCH",
  "PPTX_LAYOUT_SUBSTITUTED",
];

const slide = (children) => ({ type: "Slide", children });

const CLEAN_DECK = {
  type: "Document",
  meta: { title: "clean" },
  slides: [{ type: "Slide", children: [{ type: "Text", text: "Plain ASCII text.", style: { fontSize: 24 } }] }],
};

/**
 * Bytes for the byte-input verbs, from the package's own `render`.
 *
 * Generated rather than committed so `validate` and `repair` are always judged
 * against what the current writer emits. `render` is deterministic (C7).
 */
const { render: renderForBytes } = await import(resolve(pkg, "dist-pro/ops/index.js"));
const renderedDeck = await renderForBytes(CLEAN_DECK);
if (!renderedDeck.ok) {
  throw new Error(`Conformance manifest could not render its byte fixture: ${renderedDeck.error.message}`);
}
const deckBytes = Buffer.from(renderedDeck.value.bytes);
const text = (value, style = {}) => ({ type: "Text", text: value, style: { fontSize: 24, ...style } });

/** @type {import("@runstamp/contract/verify").ConformanceManifest} */
export default {
  package: "@runstamp/pptx",
  domain: "pptx",
  ops: resolve(pkg, "dist-pro/ops/index.js"),
  descriptor: resolve(pkg, "dist-pro/ops/descriptor.js"),

  fixtures: await completeFixtureCoverage(resolve(pkg, "dist-pro/ops/descriptor.js"), [
    {
      name: "clean-deck",
      verb: "render",
      input: {
        type: "Document",
        meta: { title: "clean" },
        slides: [slide([text("Plain ASCII text.")])],
      },
      expect: "ok",
      // R17: the positive fidelity claim. Without it the ledger is unfalsifiable.
      lossFree: true,
    },
    {
      name: "word-art-warping-renders-in-the-full-engine",
      verb: "render",
      // `textWarp` is on the engine's silent-drop inventory, but only for the
      // size-constrained lite bundle. The full engine emits it, so a faithful
      // render reports nothing — asserting a loss here would be a false
      // positive, and a ledger with false positives is not a ledger.
      input: {
        type: "Document",
        meta: { title: "warped" },
        slides: [slide([text("Warped", { textWarp: "textArchUp" })])],
      },
      expect: "ok",
      lossFree: true,
    },
    {
      name: "requested-font-cannot-be-embedded",
      verb: "render",
      // The adversarial case C11 exists for, and the most common way a deck
      // looks wrong on someone else's machine: the requested family is not
      // admitted, so the text is rendered in something else. The engine knew
      // this on every render and reported it only inside a quality report the
      // plain `render` verb discarded.
      input: {
        type: "Document",
        meta: { title: "branded" },
        slides: [slide([text("Branded", { fontFamily: "Definitely Not Installed Sans" })])],
      },
      expect: "ok",
      losses: [{ code: "pptx/FONT_EMBED_UNAVAILABLE", severity: "substituted", count: 1 }],
    },
    {
      name: "rejected-schema",
      verb: "render",
      // R4: bad data is a document condition, so it arrives as a typed failure
      // with an actionable remediation rather than as a throw. Before the render
      // path guarded its input this escaped as a native TypeError from
      // `slides.flatMap` deep inside the interpreter, reaching the caller as
      // UNMAPPED_ERROR with no remediation at all.
      input: "not a deck",
      expect: "fail",
      code: "common/SCHEMA_REJECTED",
    },
    {
      name: "slides-not-an-array",
      verb: "render",
      input: { type: "Document", meta: { title: "t" }, slides: "many" },
      expect: "fail",
      code: "common/SCHEMA_REJECTED",
    },

    // C18: `validate`, `repair` and `convert` were registered operations with no
    // fixture, so three quarters of this package's catalog was certified by
    // nothing.
    {
      name: "validate-a-clean-deck",
      verb: "validate",
      input: deckBytes,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "repair-a-freshly-rendered-deck",
      verb: "repair",
      // This fixture used to pin thirteen losses on a deck the engine had just
      // written. Eleven were false positives -- the repair transforms parse and
      // re-serialise, so the text differed where nothing semantic did, and each
      // reformat was reported as a repair. One more was a bare
      // `<a:normAutofit/>`, legal but not what the engine's own quality rule
      // asks for. Both are fixed, so this is now the strongest claim R17 allows:
      // repairing our own output changes nothing, and says so.
      input: deckBytes,
      expect: "ok",
      lossFree: true,
    },
    {
      name: "convert-a-clean-deck-to-pdf",
      verb: "convert",
      options: { to: "pdf" },
      input: CLEAN_DECK,
      expect: "ok",
      lossFree: true,
    },
  ]),

  codeScan: {
    files: [
      resolve(pkg, "src/interpreter/relaxed-input.ts"),
      resolve(pkg, "src/engine.ts"),
      resolve(pkg, "src/quality/report.ts"),
    ],
    pattern: String.raw`["'](PPTX_[A-Z0-9_]+)["']`,
    classified: CLASSIFIED,
  },

  surfaces: {
    ops: resolve(pkg, "dist-pro/types/ops/index.d.ts"),
    root: resolve(pkg, "dist-pro/types/index.d.ts"),
  },

  apiReport: resolve(pkg, "etc/json-to-pptx.api.md"),
};
