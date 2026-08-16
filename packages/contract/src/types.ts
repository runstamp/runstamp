/**
 * Shared type vocabulary for OC-1.
 *
 * This module is intentionally **runtime-free**: it contains only type aliases and
 * unions. Every other contract module may import it without creating a runtime
 * import cycle. See docs/architecture/operation-contract.md §3.
 */

/**
 * The domain a code, locator, or operation belongs to.
 *
 * Domains namespace error codes so that two packages cannot collide on the same
 * bare identifier — the defect OC-1 §1.1 documents between `PaperError` and
 * `DOCXError`, which both emitted `RESOURCE_LIMIT_EXCEEDED`.
 */
export type ErrorDomain =
  | "common"
  | "pptx"
  | "docx"
  | "xlsx"
  | "pdf"
  | "html"
  | "policy"
  | "license"
  | "connector"
  | "host";

export const ERROR_DOMAINS: readonly ErrorDomain[] = [
  "common",
  "pptx",
  "docx",
  "xlsx",
  "pdf",
  "html",
  "policy",
  "license",
  "connector",
  "host",
] as const;

/**
 * A stable, greppable, collision-proof code: `${domain}/${SCREAMING_SNAKE}`.
 *
 * Codes are contractual (OC-1 §9.1); messages are not. Consumers branch on `code`.
 */
export type ErrorCode = `${ErrorDomain}/${string}`;

/** The pipeline stage that produced an error, diagnostic, or loss. */
export type ErrorPhase =
  | "input"
  | "validation"
  | "compilation"
  | "layout"
  | "typography"
  | "media"
  | "chart"
  | "serialization"
  | "archive"
  | "font"
  | "template"
  | "rendering"
  | "parsing"
  | "policy"
  | "transport";

/** Severity of a non-fatal observation that is *not* a faithfulness deviation. */
export type DiagnosticSeverity = "debug" | "info" | "warn";

/**
 * How far an operation departed from faithfully representing its input.
 *
 * Ordered from least to most severe; `compareLossSeverity` relies on this order.
 */
export type LossSeverity =
  /** Preserved, but represented differently (e.g. font substituted, metrics equal). */
  | "substituted"
  /** Preserved with reduced fidelity (e.g. vector flattened to raster). */
  | "degraded"
  /** Not represented in the output at all. */
  | "dropped";

export const LOSS_SEVERITY_ORDER: readonly LossSeverity[] = [
  "substituted",
  "degraded",
  "dropped",
] as const;

/** A node kind addressable by a {@link import("./locator.js").Locator}. */
export type LocatorKind =
  | "page"
  | "slide"
  | "sheet"
  | "section"
  | "paragraph"
  | "run"
  | "table"
  | "row"
  | "column"
  | "cell"
  | "shape"
  | "image"
  | "chart"
  | "note"
  | "header"
  | "footer"
  | "comment"
  | "annotation"
  /** A raw package part (an OOXML part, a PDF object). */
  | "part";

export const LOCATOR_KINDS: readonly LocatorKind[] = [
  "page",
  "slide",
  "sheet",
  "section",
  "paragraph",
  "run",
  "table",
  "row",
  "column",
  "cell",
  "shape",
  "image",
  "chart",
  "note",
  "header",
  "footer",
  "comment",
  "annotation",
  "part",
] as const;

/**
 * The canonical verb taxonomy (OC-1 §4). Exactly these twelve.
 *
 * Packages may add *qualifiers* (`xlsx.extract.tables`) but never a new base verb;
 * a new verb requires an amendment to the contract.
 */
export type Verb =
  | "render"
  | "parse"
  | "inspect"
  | "validate"
  | "repair"
  | "convert"
  | "transform"
  | "diff"
  | "merge"
  | "split"
  | "extract"
  | "redact";

export const VERBS: readonly Verb[] = [
  "render",
  "parse",
  "inspect",
  "validate",
  "repair",
  "convert",
  "transform",
  "diff",
  "merge",
  "split",
  "extract",
  "redact",
] as const;

/**
 * A fully-qualified operation name: `${domain}.${verb}` with an optional qualifier.
 *
 * Examples: `docx.render`, `pdf.validate`, `xlsx.extract.tables`.
 */
export type OperationName = `${ErrorDomain}.${Verb}` | `${ErrorDomain}.${Verb}.${string}`;

/** A source of non-reproducibility actually consumed by an operation. */
export type NondeterminismSource =
  | "clock"
  | "random"
  | "network"
  | "locale"
  | "filesystem"
  | "environment"
  | "concurrency";

/** How losses affect the success/failure decision. */
export type LossPolicy = "collect" | "failOnDropped" | "failOnAny";

/** Side effects an operation may perform, declared in the registry. */
export type SideEffects = "none" | "network" | "filesystem";

/** Public stability of a registry entry. */
export type Stability = "experimental" | "stable" | "deprecated";
