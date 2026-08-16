/**
 * Phase 7 wrapper — tagged accessibility (PDF/UA structure trees).
 *
 * Matches when the document declares accessibility metadata or uses
 * Phase 7-only nodes (figure / graphic / list). Picks the fallback
 * font from the document's PDF/A entry first if tagged-and-PDF/A,
 * otherwise the engine-supplied automatic fallback.
 */

import type { Phase, PhaseInput, PhaseOutput } from "../phase.js";
import { applyBuiltInFontFallback, isPhase3Document, requiresPhase7DocumentRender } from "../phase-helpers.js";
import { analyzePhase7Document } from "../phase7-analyze.js";
import type { PdfDocumentPhase7 } from "../phase7-types.js";
import type { PdfDocumentPhase8 } from "../phase8-types.js";

export const phase7Tagged: Phase = {
  name: "phase7-tagged",
  matches(input: PhaseInput): boolean {
    return isPhase3Document(input.document) && requiresPhase7DocumentRender(input.document as PdfDocumentPhase7);
  },
  async run(input: PhaseInput): Promise<PhaseOutput> {
    const document = input.document as PdfDocumentPhase7;
    const analysis = await analyzePhase7Document(document);
    const taggedFallback = applyBuiltInFontFallback(
      analysis.pages,
      analysis.interactive,
      (document.accessibility?.tagged ? (input.document as PdfDocumentPhase8).pdfa?.fallbackFont : undefined) ?? input.automaticFallbackFont,
    );
    return {
      pages: taggedFallback.pages,
      meta: { ...analysis.meta, modificationDate: analysis.meta.modDate },
      interactive: taggedFallback.interactive,
    };
  },
};
