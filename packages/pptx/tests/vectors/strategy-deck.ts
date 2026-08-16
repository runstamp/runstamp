import type { PaperDocument } from "../../src/types/ast.js";
import { strategyDeck } from "../../../../app/app/lib/templates.js";

/**
 * Strategy deck test vectors — one per slide from the MBB-grade strategyDeck template.
 * These test the full card-with-text-children rendering pipeline that previously
 * had a normAutofit z-order/visibility bug.
 */
export const strategyDeckVectors: Record<string, PaperDocument> = {};

for (let i = 0; i < strategyDeck.slides.length; i++) {
  const slide = strategyDeck.slides[i];
  strategyDeckVectors[`strategy-deck-slide${i + 1}`] = {
    type: "Document",
    meta: { title: `Strategy Deck - Slide ${i + 1}`, author: "Test Suite" },
    theme: strategyDeck.theme,
    slides: [slide],
  };
}
