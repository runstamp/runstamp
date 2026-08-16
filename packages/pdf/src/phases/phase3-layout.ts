/**
 * Phase 3 wrapper — basic flexbox layout for headings, paragraphs,
 * containers, dividers. The fallback when no higher phase matches the
 * structured input.
 */

import type { Phase, PhaseInput, PhaseOutput } from "../phase.js";
import { analyzePhase3DocumentDetailed } from "../phase3-render.js";
import type { PdfDocumentPhase3 } from "../phase3-types.js";
import { applyBuiltInFontFallback, isPhase3Document } from "../phase-helpers.js";

export const phase3Layout: Phase = {
  name: "phase3-layout",
  matches(input: PhaseInput): boolean {
    return isPhase3Document(input.document);
  },
  async run(input: PhaseInput): Promise<PhaseOutput> {
    const analysis = await analyzePhase3DocumentDetailed(
      input.document as PdfDocumentPhase3,
      (overflow) => {
        input.options?.onInputWarning?.({
          code: "PDF_ELEMENT_PAGE_OVERFLOW",
          message:
            `A ${overflow.nodeType} line is ${overflow.lineHeight}pt tall but the printable page height is only ` +
            `${overflow.availableHeight}pt; the line was placed anyway and will be clipped.`,
          path: "page.height",
          from: overflow.lineHeight,
          to: overflow.availableHeight,
        });
      },
    );
    const defaulted = applyBuiltInFontFallback(
      analysis.pages,
      {},
      input.automaticFallbackFont,
    );
    return {
      pages: defaulted.pages,
      meta: analysis.meta,
      interactive: defaulted.interactive,
    };
  },
};
