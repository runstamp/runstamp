import { describe, expect, it } from "vitest";
import { normalizeForHash, openPptx } from "@runstamp/pptx-extractor";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { PaperEngine } from "../src/engine.js";
import { pitchBookDeck } from "./launchMatrix/fixtures/t02PitchBook.js";

const fixtureDeck = {
  ...pitchBookDeck,
  // The cover and contents slides collectively exercise text, shapes, a table,
  // and an embedded image without rendering the fixture's full 38-slide deck.
  slides: pitchBookDeck.slides.slice(0, 2),
};

describe("pptx-extractor deterministic output", () => {
  it("normalizes two deterministic renders of the same fixture equally", async () => {
    setDeterministicMode(true);

    try {
      const firstBuffer = await PaperEngine.render(fixtureDeck);
      const secondBuffer = await PaperEngine.render(fixtureDeck);
      const [first, second] = await Promise.all([
        openPptx(firstBuffer),
        openPptx(secondBuffer),
      ]);

      expect(normalizeForHash(first)).toEqual(normalizeForHash(second));
    } finally {
      setDeterministicMode(false);
    }
  }, 90_000);
});
