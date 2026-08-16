import type { PaperDocument } from "../../src/types/ast.js";
import { qbrDeck } from "../../../../app/app/lib/templates.js";

/**
 * QBR deck test vectors — one per slide from the Quarterly Business Review template.
 */
export const qbrDeckVectors: Record<string, PaperDocument> = {};

for (let i = 0; i < qbrDeck.slides.length; i++) {
  const slide = qbrDeck.slides[i];
  qbrDeckVectors[`qbr-deck-slide${i + 1}`] = {
    type: "Document",
    meta: { title: `QBR Deck - Slide ${i + 1}`, author: "Test Suite" },
    theme: qbrDeck.theme,
    slides: [slide],
  };
}
