/**
 * Phase composition interface for the PDF engine.
 *
 * Replaces the ad-hoc if-else ladder in `engine.ts:renderBuffer` with a
 * data-driven `composePhases([...])` runner. Each phase declares a
 * `matches(input)` predicate and a `run(input)` reducer; the runner
 * picks the first matching phase. Order in the array matters: phases
 * with stricter predicates (PDF/A → tagged accessibility → interactive
 * forms → tables → layout → flat) come first so the highest-applicable
 * phase wins.
 */

import type { PdfDocument, PdfRenderOptions } from "./engine.js";
import { PdfError } from "./errors.js";
import type { PdfEmbeddedFontInput } from "./font-embedding.js";
import type { PdfDocumentInteractiveSpec, PdfRenderedPage, PdfRenderMeta } from "./pdf-renderer.js";

export interface PhaseInput {
  /** The validated, preprocessed document. */
  document: PdfDocument;
  /** User-supplied render options (already conflict-checked by the engine). */
  options: PdfRenderOptions | undefined;
  /** Engine-resolved automatic fallback font (Pro-license-gated). */
  automaticFallbackFont: PdfEmbeddedFontInput | undefined;
}

export interface PhaseOutput {
  pages: PdfRenderedPage[];
  meta: PdfRenderMeta;
  interactive?: PdfDocumentInteractiveSpec;
}

export interface Phase {
  /** Human-readable name for diagnostics — e.g. "phase8-pdfa". */
  readonly name: string;
  /** Predicate: does this phase apply to the given input? */
  matches(input: PhaseInput): boolean;
  /** Materialize pages, meta, and interactive spec ready for `renderPdfPages`. */
  run(input: PhaseInput): Promise<PhaseOutput>;
}

export async function composePhases(input: PhaseInput, phases: ReadonlyArray<Phase>): Promise<PhaseOutput> {
  for (const phase of phases) {
    if (phase.matches(input)) {
      return phase.run(input);
    }
  }
  throw new PdfError(
    "SCHEMA_REJECTED",
    "No phase matched the input document. This usually means the document shape is neither a Phase 2 flat-pages document nor a Phase 3+ structured document.",
    { phasesTried: phases.map((p) => p.name) },
  );
}
