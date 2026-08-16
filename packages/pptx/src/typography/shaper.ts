// src/typography/shaper.ts — Phase B: HarfBuzz advance-width extraction

import { getHbInstance, getHbFont, getSharedBuffer } from "./harfbuzzLoader.js";
import type { ScriptClass } from "./fontFallback.js";
import type { BidiDirection } from "./bidi.js";

function hbDirection(sc: ScriptClass | undefined, direction?: BidiDirection): "ltr" | "rtl" {
  if (direction) return direction;
  return sc === "cs" ? "rtl" : "ltr";
}

/**
 * Returns the pixel width of `text` shaped with HarfBuzz, including kerning
 * and ligature adjustments that fontkit's naive advanceWidth sum misses.
 *
 * @param text       - The text segment to shape (a single UAX#14 break unit)
 * @param fontFamily - The registered HarfBuzz font family name
 * @param fontSize   - Target font size in pixels
 * @param upem       - Font units-per-em, from fontkit: font.unitsPerEm
 * @param script     - Optional script class for explicit direction setting
 * @returns Pixel width, or 0 if the font isn't registered (graceful fallback).
 */
export function shapeSegmentWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  upem: number,
  script?: ScriptClass,
  direction?: BidiDirection,
): number {
  if (text.length === 0) return 0;

  const hbFont = getHbFont(fontFamily);
  if (!hbFont) return 0;

  const hb = getHbInstance();
  const buf = getSharedBuffer();

  // Reset at the top so the buffer is clean even if a previous call threw.
  buf.reset();
  buf.addText(text);
  if (script || direction) {
    buf.setDirection(hbDirection(script, direction));
  }
  buf.guessSegmentProperties(); // fills script+language; preserves pre-set direction
  hb.shape(hbFont, buf);

  const totalAdvance = buf.json().reduce((sum, g) => sum + g.ax, 0);
  return totalAdvance * (fontSize / upem);
}
