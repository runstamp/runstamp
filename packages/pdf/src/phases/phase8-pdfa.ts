/**
 * Phase 8 wrapper — PDF/A conformance.
 *
 * Matches when the input document has `pdfa.enabled === true`. Injects
 * the engine-resolved automatic fallback font when the document hasn't
 * declared its own PDF/A fallback. Delegates to `analyzePhase8Document`
 * for ICC-profile / output-intent / XMP construction.
 */

import type { Phase, PhaseInput, PhaseOutput } from "../phase.js";
import { isPhase3Document, requiresPhase8DocumentRender } from "../phase-helpers.js";
import { analyzePhase8Document } from "../phase8-analyze.js";
import type { PdfDocumentPhase8 } from "../phase8-types.js";

export const phase8Pdfa: Phase = {
  name: "phase8-pdfa",
  matches(input: PhaseInput): boolean {
    return isPhase3Document(input.document)
      && requiresPhase8DocumentRender(input.document as PdfDocumentPhase8);
  },
  async run(input: PhaseInput): Promise<PhaseOutput> {
    const phase8Document = input.document as PdfDocumentPhase8;
    if (!phase8Document.pdfa?.fallbackFont && input.automaticFallbackFont) {
      phase8Document.pdfa = {
        ...phase8Document.pdfa,
        fallbackFont: input.automaticFallbackFont,
      };
    }
    const analysis = await analyzePhase8Document(phase8Document);
    return {
      pages: analysis.pages,
      meta: { ...analysis.meta, modificationDate: analysis.meta.modDate },
      interactive: analysis.interactive,
    };
  },
};
