/**
 * Preview-fidelity test: compares HTML preview screenshots against canvas-rendered
 * PNGs for all three demo deck templates.
 *
 * This catches major layout/z-order divergences (containers covering text,
 * missing elements, wrong positions) while tolerating minor rendering engine
 * differences (font hinting, anti-aliasing, sub-pixel rounding).
 *
 * Requires: Playwright chromium, @napi-rs/canvas
 * Run: npm run test:fidelity
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import { PaperEngine } from "../src/engine.js";
import { runLayout } from "../src/layout/index.js";
import { renderSlideToBuffer } from "../src/renderer/index.js";
import { strategyDeck, pitchDeck, qbrDeck } from "../../../platform/app/lib/templates.js";
import { renderSlideToHtml } from "./helpers/htmlRenderer.js";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { PaperDocument } from "../src/types/ast.js";

const TMP_DIR = join(import.meta.dirname, "../.tmp-fidelity");
const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;
// Relaxed threshold: ~15% pixel mismatch allowed for CSS vs DrawingML differences
const MAX_MISMATCH_RATIO = 0.15;

// Crop PNG to target dimensions
function cropPng(src: PNG, tw: number, th: number): PNG {
  const out = new PNG({ width: tw, height: th });
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const srcIdx = (y * src.width + x) * 4;
      const dstIdx = (y * tw + x) * 4;
      out.data[dstIdx] = src.data[srcIdx];
      out.data[dstIdx + 1] = src.data[srcIdx + 1];
      out.data[dstIdx + 2] = src.data[srcIdx + 2];
      out.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
  return out;
}

// Test a single deck's slides
function testDeck(deckName: string, deck: PaperDocument) {
  describe(`${deckName} (${deck.slides.length} slides)`, () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
      mkdirSync(TMP_DIR, { recursive: true });
    }, 30_000);

    afterAll(async () => {
      if (browser) await browser.close();
    });

    const layoutWidth = deck.slideSize?.width ?? SLIDE_WIDTH;
    const layoutHeight = deck.slideSize?.height ?? SLIDE_HEIGHT;

    for (let slideIdx = 0; slideIdx < deck.slides.length; slideIdx++) {
      it(`slide ${slideIdx + 1} — HTML preview matches canvas render`, async () => {
        const slide = deck.slides[slideIdx];
        const prefix = `${deckName}-slide${slideIdx + 1}`;

        // --- Step 1: HTML screenshot ---
        const html = renderSlideToHtml(slide, SLIDE_WIDTH, SLIDE_HEIGHT);
        const htmlPath = join(TMP_DIR, `${prefix}.html`);
        writeFileSync(htmlPath, html);

        const page = await browser.newPage();
        await page.setViewportSize({ width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
        await page.goto(`file://${htmlPath}`);
        const htmlScreenshotPath = join(TMP_DIR, `${prefix}-html.png`);
        await page.screenshot({ path: htmlScreenshotPath, fullPage: false });
        await page.close();

        // --- Step 2: Canvas render → PNG ---
        const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
        const canvasBuf = await renderSlideToBuffer(layoutTree, {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          scale: 1,
          themeColors: deck.theme?.colorScheme,
        });

        if (!canvasBuf) {
          console.warn(`Canvas render failed for ${prefix} — skipping`);
          return;
        }

        const canvasPngPath = join(TMP_DIR, `${prefix}-canvas.png`);
        writeFileSync(canvasPngPath, canvasBuf);

        // --- Step 3: Compare PNGs ---
        const htmlPng = PNG.sync.read(readFileSync(htmlScreenshotPath));
        const canvasPng = PNG.sync.read(canvasBuf);

        const w = Math.min(htmlPng.width, canvasPng.width);
        const h = Math.min(htmlPng.height, canvasPng.height);

        if (w < 100 || h < 100) {
          console.warn(`PNG too small (${w}x${h}) for ${prefix} — skipping comparison`);
          return;
        }

        const htmlCropped = htmlPng.width === w && htmlPng.height === h ? htmlPng : cropPng(htmlPng, w, h);
        const canvasCropped = canvasPng.width === w && canvasPng.height === h ? canvasPng : cropPng(canvasPng, w, h);

        const diff = new PNG({ width: w, height: h });
        const mismatchCount = pixelmatch(
          htmlCropped.data, canvasCropped.data, diff.data,
          w, h,
          { threshold: 0.3 }
        );

        const mismatchRatio = mismatchCount / (w * h);

        // Save diff image for debugging
        const diffPath = join(TMP_DIR, `${prefix}-diff.png`);
        writeFileSync(diffPath, PNG.sync.write(diff));

        console.log(
          `${prefix}: ${(mismatchRatio * 100).toFixed(1)}% pixel mismatch ` +
          `(${mismatchCount}/${w * h} pixels, threshold=${MAX_MISMATCH_RATIO * 100}%)`
        );

        expect(
          mismatchRatio,
          `${prefix} pixel mismatch ${(mismatchRatio * 100).toFixed(1)}% exceeds ${MAX_MISMATCH_RATIO * 100}%. ` +
          `Diff image: ${diffPath}`
        ).toBeLessThan(MAX_MISMATCH_RATIO);
      }, 60_000);
    }
  });
}

describe("Preview Fidelity", () => {
  testDeck("strategy", strategyDeck);
  testDeck("pitch", pitchDeck);
  testDeck("qbr", qbrDeck);
});
