// bidi-js has no published types. The ambient declaration lives at
// ../bidi-js.d.ts and is picked up by core's own tsconfig (src/**/*), but
// lite's typecheck reaches this file via a path alias that doesn't include
// core/src — so we also /// reference it directly. eslint-disable is needed
// because the project lint rule prefers import style, which doesn't work for
// ambient-only module shims.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../bidi-js.d.ts" />
import bidiFactory from "bidi-js";

import type { Paragraph, TextRun, TextStyle } from "../types/ast.js";

export type BidiDirection = "ltr" | "rtl";

interface BidiApi {
  getEmbeddingLevels(text: string, explicitDirection?: BidiDirection): {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  };
}

const bidi = (bidiFactory as () => BidiApi)();

function directionForLevel(level: number): BidiDirection {
  return (level & 1) === 1 ? "rtl" : "ltr";
}

function explicitDirectionFor(para: Paragraph, textStyle: TextStyle | undefined): BidiDirection | undefined {
  const rtl = para.rtl ?? textStyle?.rtl;
  if (rtl === true) return "rtl";
  if (rtl === false) return "ltr";
  return undefined;
}

export function resolveParagraphDirection(text: string, explicitDirection?: BidiDirection): BidiDirection {
  if (text.length === 0) return explicitDirection ?? "ltr";
  const embedding = bidi.getEmbeddingLevels(text, explicitDirection);
  const paragraph = embedding.paragraphs[0];
  return paragraph ? directionForLevel(paragraph.level) : explicitDirection ?? "ltr";
}

export function splitBidiText(text: string, explicitDirection?: BidiDirection): Array<{ text: string; direction: BidiDirection }> {
  if (text.length === 0) return [];

  const embedding = bidi.getEmbeddingLevels(text, explicitDirection);
  const { levels } = embedding;
  if (levels.length === 0) return [{ text, direction: explicitDirection ?? "ltr" }];

  const runs: Array<{ text: string; direction: BidiDirection }> = [];
  let start = 0;
  let direction = directionForLevel(levels[0] ?? 0);

  for (let index = 1; index < text.length; index++) {
    const nextDirection = directionForLevel(levels[index] ?? levels[index - 1] ?? 0);
    if (nextDirection === direction) continue;
    runs.push({ text: text.slice(start, index), direction });
    start = index;
    direction = nextDirection;
  }

  runs.push({ text: text.slice(start), direction });
  return runs.filter((run) => run.text.length > 0);
}

function languageForDirection(direction: BidiDirection, existingLang: string | undefined): string {
  if (existingLang && existingLang !== "en-US") return existingLang;
  return direction === "rtl" ? "ar-SA" : existingLang ?? "en-US";
}

export function applyBidiToParagraph(para: Paragraph, textStyle: TextStyle | undefined): Paragraph {
  if (para.rtl === false) {
    return {
      ...para,
      rtl: false,
      runs: para.runs.map((run) => ({
        ...run,
        style: {
          ...run.style,
          lang: run.style?.lang ?? textStyle?.lang ?? "en-US",
        },
      })),
    };
  }

  const explicitDirection = explicitDirectionFor(para, textStyle);
  const paragraphText = para.runs.map((run) => run.text).join("");
  const paragraphDirection = resolveParagraphDirection(paragraphText, explicitDirection);
  const runs: TextRun[] = [];

  for (const run of para.runs) {
    const bidiRuns = splitBidiText(run.text, paragraphDirection);
    if (bidiRuns.length <= 1) {
      const direction = bidiRuns[0]?.direction ?? paragraphDirection;
      runs.push({
        ...run,
        style: {
          ...run.style,
          lang: languageForDirection(direction, run.style?.lang ?? textStyle?.lang),
        },
      });
      continue;
    }

    for (const bidiRun of bidiRuns) {
      runs.push({
        ...run,
        text: bidiRun.text,
        style: {
          ...run.style,
          lang: languageForDirection(bidiRun.direction, run.style?.lang ?? textStyle?.lang),
        },
      });
    }
  }

  return {
    ...para,
    rtl: para.rtl ?? textStyle?.rtl ?? (paragraphDirection === "rtl" ? true : undefined),
    runs: paragraphDirection === "rtl" ? runs.reverse() : runs,
  };
}
