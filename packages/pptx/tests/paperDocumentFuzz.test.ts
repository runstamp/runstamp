// Render-invariant fuzz for the direct PaperDocument path. The agent
// fuzz test (agentFuzz.test.ts) covers AgentDocument → compile →
// render. This suite covers raw PaperDocument → validateDocument →
// buildArchive, which is a distinct code path: different schema,
// different pre-render hooks, and (since WS-4) the engine-level layout
// validator runs here too.
//
// Content shape: random mix of Text, View, and Image nodes with
// absolute positioning on a single slide. 40 seeded iterations.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { PaperDocumentSchema } from "../src/validator/schema.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import type { PaperDocument, PaperNode } from "../src/types/ast.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randColor(rng: () => number): string {
  const hex = Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
}

function buildChildren(
  rng: () => number,
  anchor: string,
): PaperNode[] {
  // Always include an anchor-text Text node at a known position so the
  // render invariant (anchor appears in slide XML) can be asserted.
  const children: PaperNode[] = [
    {
      type: "Text",
      content: anchor,
      style: {
        position: "absolute",
        left: 80,
        top: 80,
        width: 800,
        height: 80,
        fontSize: 36,
        color: "#0F172A",
      },
    },
  ];

  const extraCount = Math.floor(rng() * 4); // 0..3 extras
  for (let i = 0; i < extraCount; i += 1) {
    const kind = pick(rng, ["Text", "View", "Image"] as const);
    const left = 80 + Math.floor(rng() * 600);
    // Skew top down so extras don't overlap the anchor at (80, 80)
    // — POTENTIAL_COLLISION warnings are noise for this test.
    const top = 200 + Math.floor(rng() * 250);
    const width = 80 + Math.floor(rng() * 200);
    const height = 40 + Math.floor(rng() * 120);

    if (kind === "Text") {
      children.push({
        type: "Text",
        content: `extra-${i}`,
        style: {
          position: "absolute",
          left,
          top,
          width,
          height,
          fontSize: 12 + Math.floor(rng() * 16),
          color: randColor(rng),
        },
      });
    } else if (kind === "View") {
      children.push({
        type: "View",
        style: {
          position: "absolute",
          left,
          top,
          width,
          height,
          fill: { type: "solid", color: randColor(rng) },
          borderRadius: Math.floor(rng() * 12),
        },
        children: [],
      });
    } else {
      // Transparent 1×1 PNG so the engine has valid bytes without a fetch.
      children.push({
        type: "Image",
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        style: {
          position: "absolute",
          left,
          top,
          width,
          height,
        },
      });
    }
  }

  return children;
}

function generate(seed: number): { anchor: string; doc: PaperDocument } {
  const rng = mulberry32(seed);
  const anchor = `PaperAnchor-${seed}`;
  const doc: PaperDocument = {
    type: "Document",
    meta: { title: `Fuzz ${seed}` },
    slides: [
      {
        type: "Slide",
        children: buildChildren(rng, anchor),
      },
    ],
  };
  return { anchor, doc };
}

async function slide1Xml(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slide = zip.file("ppt/slides/slide1.xml");
  if (!slide) throw new Error("slide1.xml missing");
  return slide.async("string");
}

describe("PaperDocument render fuzz (seeded)", () => {
  const ITERATIONS = 40;
  const BASE_SEED = 0x1e2a5678;

  it("every generated document passes PaperDocumentSchema", () => {
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { doc } = generate(BASE_SEED + i);
      const result = PaperDocumentSchema.safeParse(doc);
      if (!result.success) {
        throw new Error(
          `Seed ${BASE_SEED + i}: ${result.error.issues[0]?.message} at ${result.error.issues[0]?.path.join(".")}`,
        );
      }
    }
  });

  it(`renders ${ITERATIONS} fuzz samples and finds anchor in slide1.xml`, async () => {
    setDeterministicMode(true);
    try {
      for (let i = 0; i < ITERATIONS; i += 1) {
        const { anchor, doc } = generate(BASE_SEED + i);
        let buf: Buffer;
        try {
          buf = await PaperEngine.render(doc, { layoutValidation: "off" });
        } catch (err) {
          throw new Error(
            `Seed ${BASE_SEED + i}: render threw ${(err as Error).message}`,
          );
        }
        expect(Buffer.isBuffer(buf), `seed ${BASE_SEED + i}`).toBe(true);
        const xml = await slide1Xml(buf);
        if (!xml.includes(anchor)) {
          throw new Error(
            `Seed ${BASE_SEED + i}: anchor "${anchor}" missing from slide1.xml`,
          );
        }
      }
    } finally {
      setDeterministicMode(false);
    }
  }, 120000);
});
