import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import type { PaperDocument } from "../src/types/ast.js";

function makeDeck(index: number): PaperDocument {
  return {
    type: "Document",
    meta: { title: `CreateEngine Deterministic ${index}`, author: "determinism-regression" },
    slides: [
      {
        type: "Slide",
        notes: `Speaker notes for deck ${index}`,
        headerFooter: {
          slideNumber: true,
          dateTime: true,
          footer: `Deck ${index}`,
        },
        children: [
          {
            type: "Text",
            content: `Deck ${index}`,
            style: { fontSize: 24, width: 320, height: 48 },
          },
        ],
      },
    ],
  };
}

function makeCommentDeck(index: number): PaperDocument {
  return {
    type: "Document",
    meta: { title: `CreateEngine Comment Deterministic ${index}`, author: "determinism-regression" },
    slides: [
      {
        type: "Slide",
        notes: `Speaker notes for comment deck ${index}`,
        comments: [
          {
            author: "QA",
            text: `Comment for deck ${index}`,
            date: "2026-01-01T00:00:00Z",
            x: 72,
            y: 72,
          },
        ],
        children: [
          {
            type: "Text",
            content: `Comment Deck ${index}`,
            style: { fontSize: 24, width: 320, height: 48 },
          },
        ],
      },
    ],
  };
}

describe("createEngine deterministic mode", () => {
  beforeAll(() => {
    setDeterministicMode(true);
  });

  afterAll(() => {
    setDeterministicMode(false);
  });

  it("inherits deterministic mode for sequential and concurrent renders", async () => {
    const engine = createEngine({ mode: "pro" });
    const docs = Array.from({ length: 4 }, (_unused, index) => makeDeck(index + 1));

    const sequential: Buffer[] = [];
    for (const doc of docs) {
      sequential.push(await engine.render(doc));
    }
    const concurrent = await Promise.all(docs.map((doc) => engine.render(doc)));

    for (let index = 0; index < docs.length; index++) {
      expect(
        sequential[index].equals(concurrent[index]),
        `createEngine render #${index + 1} differs between sequential and concurrent paths`,
      ).toBe(true);
    }
  });

  it("does not leak wall-clock ZIP directory dates through createEngine", async () => {
    const engine = createEngine({ mode: "pro" });
    const doc = makeDeck(1);

    const first = await engine.render(doc);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const second = await engine.render(doc);

    expect(first.equals(second)).toBe(true);
  });

  it("preserves deterministic context for queued comment renders", async () => {
    const engine = createEngine({ mode: "pro" });
    const docs = Array.from({ length: 4 }, (_unused, index) => makeCommentDeck(index + 1));

    const sequential: Buffer[] = [];
    for (const doc of docs) {
      sequential.push(await engine.render(doc));
    }
    const concurrent = await Promise.all(docs.map((doc) => engine.render(doc)));

    for (let index = 0; index < docs.length; index++) {
      expect(
        sequential[index].equals(concurrent[index]),
        `comment render #${index + 1} differs between sequential and queued concurrent paths`,
      ).toBe(true);
    }
  });

  it("keeps comment package folder metadata deterministic after unrelated renders", async () => {
    const engine = createEngine({ mode: "pro" });
    const doc = makeCommentDeck(1);

    const first = await engine.render(doc);
    await engine.render(makeDeck(99));
    await new Promise(resolve => setTimeout(resolve, 1100));
    const second = await engine.render(doc);

    expect(first.equals(second)).toBe(true);
  });
});
