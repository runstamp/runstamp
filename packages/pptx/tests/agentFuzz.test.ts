// Render-invariant fuzz for the Agent compiler. Seeded so it is
// deterministic across runs: any regression fails the same way in
// local and CI. Goal from the plan: "either XML contains the property
// or a warning was emitted" — scoped here to the subset of properties
// the test actually generates (title text, subtitle text), which is
// what PaperEngine.render is guaranteed to surface in slide1.xml.
//
// 60 iterations is the bounded budget — large enough to cover preset ×
// pattern × scale × density × shape crosses, small enough to keep the
// test under 60 seconds on local dev.

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { AgentDocumentSchema } from "../src/interpreter/agentSchema.js";
import { setDeterministicMode } from "../src/deterministicMode.js";

const PRESETS = [
  "default-navy",
  "editorial-serif",
  "monochrome",
  "dark-punch",
  "midnight",
  "terminal",
  "editorial-wide",
] as const;
const SCALES = ["sm", "md", "lg", "xl"] as const;
const DENSITIES = ["compact", "balanced", "spacious"] as const;
const SHAPES = ["sharp", "soft", "round"] as const;
const PATTERNS = ["title", "statement", "dashboard", "comparison", "chart-focus", "bullets"] as const;

// mulberry32 — small seeded PRNG. Deterministic means the same seed
// produces the same test matrix every run, so a regression hits the
// same index every time and can be replayed locally.
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

function buildContentForPattern(
  pattern: typeof PATTERNS[number],
  rng: () => number,
  anchor: string,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    title: anchor,
    subtitle: `subtitle ${Math.floor(rng() * 1000)}`,
  };
  switch (pattern) {
    case "title":
      return base;
    case "statement":
      return {
        ...base,
        prose: ["Some prose supporting the statement."],
      };
    case "dashboard":
      return {
        ...base,
        kpis: [
          { label: "KPI A", value: "42", sublabel: "+1" },
          { label: "KPI B", value: "88%", sublabel: "flat" },
        ],
      };
    case "comparison":
      return {
        ...base,
        bulletPoints: ["Item A", "Item B", "Item C"],
      };
    case "chart-focus":
      return {
        ...base,
        chart: {
          type: "bar",
          series: [
            {
              name: "Revenue",
              dataPoints: [
                { category: "Q1", value: 10 },
                { category: "Q2", value: 12 },
              ],
            },
          ],
        },
      };
    case "bullets":
      return {
        ...base,
        bulletPoints: ["First point", "Second point", "Third point"],
      };
  }
}

interface FuzzSample {
  anchor: string;
  document: unknown;
  config: {
    preset: string;
    pattern: string;
    scale: string;
    density: string;
    shape: string;
  };
}

function generate(seed: number): FuzzSample {
  const rng = mulberry32(seed);
  const preset = pick(rng, PRESETS);
  const pattern = pick(rng, PATTERNS);
  const scale = pick(rng, SCALES);
  const density = pick(rng, DENSITIES);
  const shape = pick(rng, SHAPES);
  const anchor = `FuzzAnchor-${seed}`;
  const doc = {
    type: "presentation",
    version: "1.0",
    presentationTitle: `Fuzz ${seed}`,
    companyName: "Fuzz Co",
    theme: preset,
    designTokens: { scale, density, shape },
    slides: [
      {
        pattern,
        content: buildContentForPattern(pattern, rng, anchor),
      },
    ],
  };
  return {
    anchor,
    document: doc,
    config: { preset, pattern, scale, density, shape },
  };
}

async function slide1Xml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slide = zip.file("ppt/slides/slide1.xml");
  if (!slide) throw new Error("slide1.xml missing");
  return slide.async("string");
}

describe("agent render fuzz (seeded)", () => {
  const ITERATIONS = 60;
  const BASE_SEED = 0x5be17ca5;

  it("every generated document parses against AgentDocumentSchema", () => {
    for (let i = 0; i < ITERATIONS; i += 1) {
      const sample = generate(BASE_SEED + i);
      const result = AgentDocumentSchema.safeParse(sample.document);
      if (!result.success) {
        throw new Error(
          `Seed ${BASE_SEED + i} (${JSON.stringify(sample.config)}): ${result.error.issues[0]?.message}`,
        );
      }
    }
  });

  it(`renders ${ITERATIONS} fuzz samples and finds anchor text in slide1.xml`, async () => {
    setDeterministicMode(true);
    try {
      for (let i = 0; i < ITERATIONS; i += 1) {
        const sample = generate(BASE_SEED + i);
        let buf: Buffer;
        try {
          buf = await PaperEngine.render(sample.document);
        } catch (err) {
          throw new Error(
            `Seed ${BASE_SEED + i} (${JSON.stringify(sample.config)}): render threw ${(err as Error).message}`,
          );
        }
        expect(Buffer.isBuffer(buf), `seed ${BASE_SEED + i}`).toBe(true);
        expect(buf.length, `seed ${BASE_SEED + i}`).toBeGreaterThan(0);
        const xml = await slide1Xml(buf);
        if (!xml.includes(sample.anchor)) {
          throw new Error(
            `Seed ${BASE_SEED + i} (${JSON.stringify(sample.config)}): anchor "${sample.anchor}" missing from slide1.xml`,
          );
        }
      }
    } finally {
      setDeterministicMode(false);
    }
  }, 120000);
});
