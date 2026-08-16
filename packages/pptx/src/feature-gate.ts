// src/feature-gate.ts — deprecated tier constants, retained for the §9.5 window.
//
// The free/pro split was removed on 2026-08-12. No PPTX capability is gated by a
// licence any more: correctness is not a paid feature, and bm3 puts the local
// engines in the free rung with governance — not rendering fidelity — as the
// paywall.
//
// What survived is the *bundle* boundary. `@runstamp/pptx` is built from
// `index-lite.ts` and genuinely omits heavy subsystems (templates, the
// accessibility validator, shape downgrade, harfbuzz shaping), so
// `isFeatureAvailable` still reports honestly about what is present in a given
// build. That is a statement about bundled code, never about payment.
//
// Everything here is exported only because it was public before the split was
// removed. Nothing in this package consults these values to decide what a caller
// may do; they are scheduled for removal at the next major.

import type { EngineMode } from "./engineMode.js";
import type { ImageRenderOptions } from "./types/ast.js";
import { RunstampFeatureError } from "./errors.js";

/** @deprecated Always true. The free/pro split was removed; no capability is gated. */
export const IS_PRO = true;

/** @deprecated Every chart type renders in the published package. */
export const FREE_CHART_TYPES = [
  "bar",
  "line",
  "pie",
  "doughnut",
  "area",
  "scatter",
] as const;

/** @deprecated No shape-count limit is enforced. */
export const FREE_SHAPE_COUNT = 40;

/**
 * Default rasterized width in the lite bundle, in pixels.
 *
 * A size boundary, not a tier: the lite bundle omits the full preview pipeline,
 * so it defaults to a thumbnail rather than a 1920px render.
 */
export const LITE_IMAGE_MAX_WIDTH = 400;

/** @deprecated Renamed to {@link LITE_IMAGE_MAX_WIDTH}; it is a bundle, not a plan. */
export const FREE_IMAGE_MAX_WIDTH = LITE_IMAGE_MAX_WIDTH;

/**
 * Upper bound on rasterized slide width, in pixels.
 *
 * A resource guard, not a tier: beyond 4K the canvas allocation is what fails,
 * and a typed error beats an out-of-memory kill.
 */
export const MAX_IMAGE_WIDTH = 3840;

/** @deprecated Renamed to {@link MAX_IMAGE_WIDTH}; it is a resource cap, not a tier. */
export const PRO_IMAGE_MAX_WIDTH = MAX_IMAGE_WIDTH;

/** @deprecated Every chart type renders in the published package. */
export const FREE_XLSX_CHART_TYPES = ["bar", "col", "line", "pie", "scatter"] as const;

/** @deprecated Retained for the deprecation window; consulted by nothing. */
export const PPTX_PRO_FEATURES = new Set([
  "harfbuzz-typography",
  "chartex-types",
  "potx-templates",
  "smartart-diagrams",
  "multi-master",
  "pvce-collision",
  "elastic-pagination",
  "canvas-preview",
  "web-video-embedding",
]);

/** @deprecated Retained for the deprecation window; consulted by nothing. */
export const DOCX_PRO_FEATURES = new Set([
  "docx:pagination:engine",
  "docx:track-changes:generate",
  "docx:comments:serialize",
  "docx:compliance:validate",
  "docx:accessibility:audit",
  "docx:visual-polish:apply",
]);

/** @deprecated Retained for the deprecation window; consulted by nothing. */
export const XLSX_PRO_FEATURES = new Set([
  "template-assembly",
  "repair-pipeline",
  "advanced-chart-types",
]);

/** @deprecated Retained for the deprecation window; consulted by nothing. */
export const PDF_PRO_FEATURES = new Set([
  "embedded-fonts-and-complex-shaping",
  "pdfa-archival",
  "digital-signatures",
  "pdf-linearization",
  "tagged-accessibility",
]);

/** @deprecated Retained for the deprecation window; consulted by nothing. */
export const PPTX_CONVERSION_ADDONS = new Set(["pptx-to-pdf"]);

/**
 * Whether a subsystem is present in the current build.
 *
 * A statement about bundled code, not entitlement: the lite bundle omits
 * templates, SmartArt, harfbuzz shaping and the canvas preview to stay small, so
 * asking for them there cannot work regardless of what anyone has paid.
 */
export function isFeatureAvailable(feature: string, mode: EngineMode): boolean {
  // "pro" is the legacy spelling of "full"; both mean the complete bundle.
  if (mode === "full" || mode === "pro") return true;
  const inLiteBundle: Record<string, boolean> = {
    "yoga-layout": true,
    "editable-excel-charts": true,
    "agent-document-schema": true,
    "basic-font-metrics": true,
    "basic-quality-check": true,
    "single-master": true,
    "greedy-line-break": true,
    "knuth-plass": true,
    "slide-to-image-thumbnail": true,
    "harfbuzz-typography": false,
    "chartex-types": false,
    "potx-templates": false,
    "smartart-diagrams": false,
    "multi-master": false,
    "pvce-collision": false,
    "elastic-pagination": false,
    "canvas-preview": false,
    "web-video-embedding": false,
  };
  return inLiteBundle[feature] ?? false;
}

/**
 * Guard slide rasterization against an allocation that will fail.
 *
 * Previously this capped free-tier renders at 400px and rejected JPEG outright —
 * a pricing gate on output quality. Only the resource ceiling remains.
 */
export function validateImageRenderOptions(
  options: ImageRenderOptions | undefined,
  _mode?: EngineMode,
): void {
  const requestedWidth = options?.width;
  if (requestedWidth !== undefined && requestedWidth > MAX_IMAGE_WIDTH) {
    throw new RunstampFeatureError(
      `Image width ${String(requestedWidth)}px exceeds the maximum ${String(MAX_IMAGE_WIDTH)}px.`,
      "slide-to-image",
    );
  }
}
