/**
 * Phase 2 wrapper — legacy flat-pages input.
 *
 * Matches when the input lacks `children` / `content` (i.e. is not a
 * structured document). Runs Phase 2 normalization, applies the
 * built-in font fallback, and emits pages straight to the renderer.
 */

import type { PdfDocumentPhase2 } from "../engine.js";
import { normalizeDocument } from "../phase2-normalize.js";
import type { Phase, PhaseInput, PhaseOutput } from "../phase.js";
import { applyBuiltInFontFallback, isPhase3Document } from "../phase-helpers.js";

export const phase2Flat: Phase = {
  name: "phase2-flat",
  matches(input: PhaseInput): boolean {
    return !isPhase3Document(input.document);
  },
  async run(input: PhaseInput): Promise<PhaseOutput> {
    const normalized = normalizeDocument(input.document as PdfDocumentPhase2);
    const defaulted = applyBuiltInFontFallback(
      normalized.pages,
      {},
      input.automaticFallbackFont,
    );
    return {
      pages: defaulted.pages,
      meta: normalized.meta,
      interactive: defaulted.interactive,
    };
  },
};
