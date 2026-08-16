import type { PaperDocument } from "../../src/types/ast.js";
import { pitchDeck } from "../../../../app/app/lib/templates.js";

/**
 * Pitch deck test vectors — one per slide from the Series A pitch deck template.
 */
export const pitchDeckVectors: Record<string, PaperDocument> = {};

for (let i = 0; i < pitchDeck.slides.length; i++) {
  const slide = pitchDeck.slides[i];
  pitchDeckVectors[`pitch-deck-slide${i + 1}`] = {
    type: "Document",
    meta: { title: `Pitch Deck - Slide ${i + 1}`, author: "Test Suite" },
    theme: pitchDeck.theme,
    slides: [slide],
  };
}
