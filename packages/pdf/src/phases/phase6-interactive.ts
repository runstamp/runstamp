/**
 * Phase 6 wrapper — interactive features (forms, annotations, TOC,
 * outlines, dynamic headers/footers, named destinations).
 */

import type { Phase, PhaseInput, PhaseOutput } from "../phase.js";
import { applyBuiltInFontFallback, isPhase3Document, requiresPhase6DocumentRender } from "../phase-helpers.js";
import { analyzePhase6Document } from "../phase6-analyze.js";
import type { PdfDocumentPhase6 } from "../phase6-types.js";

export const phase6Interactive: Phase = {
  name: "phase6-interactive",
  matches(input: PhaseInput): boolean {
    return isPhase3Document(input.document) && requiresPhase6DocumentRender(input.document as PdfDocumentPhase6);
  },
  async run(input: PhaseInput): Promise<PhaseOutput> {
    const analysis = await analyzePhase6Document(input.document as PdfDocumentPhase6);
    const defaulted = applyBuiltInFontFallback(
      analysis.pages,
      analysis.interactive,
      input.automaticFallbackFont,
    );
    return {
      pages: defaulted.pages,
      meta: { ...analysis.meta, modificationDate: analysis.meta.modDate },
      interactive: defaulted.interactive,
    };
  },
};
