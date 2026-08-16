/**
 * Phase 5 wrapper — table layout with row/column spans and pagination.
 */

import type { Phase, PhaseInput, PhaseOutput } from "../phase.js";
import { analyzePhase5DocumentDetailed } from "../phase5-table-layout.js";
import type { PdfDocumentLayoutNode } from "../phase3-types.js";
import type { PdfDocumentPhase3 } from "../phase3-types.js";
import { applyBuiltInFontFallback, containsTableNode, isPhase3Document } from "../phase-helpers.js";

export const phase5Tables: Phase = {
  name: "phase5-tables",
  matches(input: PhaseInput): boolean {
    if (!isPhase3Document(input.document)) {
      return false;
    }
    const layoutNodes = (input.document.children ?? input.document.content) as PdfDocumentLayoutNode[] | undefined;
    return containsTableNode(layoutNodes);
  },
  async run(input: PhaseInput): Promise<PhaseOutput> {
    const analysis = await analyzePhase5DocumentDetailed(input.document as PdfDocumentPhase3);
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
