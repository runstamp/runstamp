// src/renderer/index.ts — Public API for canvas-based slide rendering

import type { LayoutNode } from "../layout/extract.js";
import type { ImageFormat, SlideImage, ThemeColorScheme } from "../types/ast.js";
import { getLogger } from "../logger.js";
import { ensureFontsRegistered } from "./fontBridge.js";
import { renderSlideToCanvas, paintImages, paintCharts } from "./canvasRenderer.js";

export interface RenderOptions {
  /** Canvas width in CSS pixels (default 960) */
  width?: number;
  /** Canvas height in CSS pixels (default 540) */
  height?: number;
  /** DPR scale factor (default 2 → 1920×1080 actual pixels) */
  scale?: number;
  /** Theme color scheme for resolving scheme tokens */
  themeColors?: ThemeColorScheme;
  /** Output format — 'png' (default) or 'jpeg'. */
  format?: ImageFormat;
  /** JPEG quality 0–100 (default 85). Ignored for PNG. */
  quality?: number;
  /** Override slide background with a solid hex color. */
  backgroundOverride?: string;
}

type ModuleLoadError = Error & { code?: string };

/** Distinguish an unavailable optional canvas capability from a render defect. */
export function isOptionalCanvasUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const moduleError = error as ModuleLoadError;
  const missingModule = moduleError.code === "ERR_MODULE_NOT_FOUND"
    || moduleError.code === "MODULE_NOT_FOUND"
    || error.message.includes("Cannot find module")
    || error.message.includes("Cannot find package")
    || error.message.includes("could not load the native binding");
  return missingModule && (
    error.message.includes("@napi-rs/canvas")
    || error.message.includes("canvas-")
    || error.message.includes("native binding")
  );
}

function recordCanvasUnavailable(error: unknown): void {
  getLogger().metric?.("runstamp.optional_capability_unavailable", 1, {
    capability: "canvas-preview",
    reason: error instanceof Error && error.message.includes("native binding")
      ? "native-binding-unavailable"
      : "package-not-installed",
  });
}

/**
 * Render a single slide LayoutNode tree to a PNG buffer.
 * Uses @napi-rs/canvas (dynamic import — stays optional peer dep).
 * Returns `undefined` if canvas is unavailable or rendering fails.
 */
export async function renderSlideToBuffer(
  slideNode: LayoutNode,
  options?: RenderOptions,
): Promise<Buffer | undefined> {
  try {
    const { createCanvas, GlobalFonts, loadImage } = await import("@napi-rs/canvas");

    const width = options?.width ?? 960;
    const height = options?.height ?? 540;
    const scale = options?.scale ?? 2;
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);

    // Register fonts referenced in the tree
    ensureFontsRegistered(slideNode as any, GlobalFonts);

    // Create canvas and render
    const canvas = createCanvas(pixelWidth, pixelHeight);
    renderSlideToCanvas(slideNode, canvas, options?.themeColors);

    // Async pass: load and paint actual images, then charts
    await paintImages(canvas, slideNode, loadImage);
    await paintCharts(canvas, slideNode, loadImage, options?.themeColors);

    return canvas.toBuffer("image/png");
  } catch (err) {
    // @napi-rs/canvas not available or render failed — graceful degradation
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
    } else {
      getLogger().warn(`[renderer] renderSlideToBuffer failed: ${err instanceof Error ? err.message : err}`);
    }
    return undefined;
  }
}

/**
 * Render all slide LayoutNode trees to PNG buffers.
 * Returns `undefined` if canvas is unavailable or rendering fails.
 */
export async function renderAllSlidesToBuffers(
  slideNodes: LayoutNode[],
  options?: RenderOptions,
): Promise<Buffer[] | undefined> {
  try {
    const { createCanvas, GlobalFonts, loadImage } = await import("@napi-rs/canvas");

    const width = options?.width ?? 960;
    const height = options?.height ?? 540;
    const scale = options?.scale ?? 2;
    const format: ImageFormat = options?.format ?? "png";
    const quality = Math.round(Math.min(100, Math.max(0, options?.quality ?? 85)));
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);

    // Register fonts for all slides
    for (const node of slideNodes) {
      ensureFontsRegistered(node as any, GlobalFonts);
    }

    const buffers: Buffer[] = [];

    for (const slideNode of slideNodes) {
      const canvas = createCanvas(pixelWidth, pixelHeight);
      renderSlideToCanvas(slideNode, canvas, options?.themeColors);

      // Async pass: load and paint actual images, then charts
      await paintImages(canvas, slideNode, loadImage);
      await paintCharts(canvas, slideNode, loadImage, options?.themeColors);

      buffers.push(
        format === "jpeg"
          ? canvas.toBuffer("image/jpeg", quality)
          : canvas.toBuffer("image/png"),
      );
    }

    return buffers;
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
    } else {
      getLogger().warn(`[renderer] renderAllSlidesToBuffers failed: ${err instanceof Error ? err.message : err}`);
    }
    return undefined;
  }
}

/**
 * Render a single slide LayoutNode tree to a SlideImage.
 * Supports PNG and JPEG output with configurable quality.
 * Returns `undefined` if @napi-rs/canvas is unavailable.
 * Throws on render failure (unlike renderSlideToBuffer which swallows errors).
 */
export async function renderSlideToImage(
  slideNode: LayoutNode,
  slideIndex: number,
  options?: RenderOptions,
): Promise<SlideImage | undefined> {
  let createCanvas: any;
  let GlobalFonts: any;
  let loadImage: any;

  try {
    const napiCanvas = await import("@napi-rs/canvas");
    createCanvas = napiCanvas.createCanvas;
    GlobalFonts = napiCanvas.GlobalFonts;
    loadImage = napiCanvas.loadImage;
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
      return undefined; // Canvas not installed — caller (engine) decides whether to throw
    }
    throw err;
  }

  const width = options?.width ?? 960;
  const height = options?.height ?? 540;
  const scale = options?.scale ?? 1;
  const format: ImageFormat = options?.format ?? "png";
  const quality = Math.round(Math.min(100, Math.max(0, options?.quality ?? 85)));
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);

  ensureFontsRegistered(slideNode as any, GlobalFonts);

  const canvas = createCanvas(pixelWidth, pixelHeight);
  renderSlideToCanvas(slideNode, canvas, options?.themeColors, options?.backgroundOverride);

  await paintImages(canvas, slideNode, loadImage);
  await paintCharts(canvas, slideNode, loadImage, options?.themeColors);

  const buffer: Buffer =
    format === "jpeg"
      ? canvas.toBuffer("image/jpeg", quality)
      : canvas.toBuffer("image/png");

  return {
    slideIndex,
    buffer,
    width: pixelWidth,
    height: pixelHeight,
    format,
  };
}

/**
 * Render multiple slide LayoutNode trees to SlideImage[].
 * Each entry in slideIndices maps to the corresponding slideNode.
 * Returns `undefined` if @napi-rs/canvas is unavailable.
 */
export async function renderSlidesToImages(
  slideNodes: LayoutNode[],
  slideIndices: number[],
  options?: RenderOptions,
): Promise<SlideImage[] | undefined> {
  let createCanvas: any;
  let GlobalFonts: any;
  let loadImage: any;

  try {
    const napiCanvas = await import("@napi-rs/canvas");
    createCanvas = napiCanvas.createCanvas;
    GlobalFonts = napiCanvas.GlobalFonts;
    loadImage = napiCanvas.loadImage;
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
      return undefined;
    }
    throw err;
  }

  const width = options?.width ?? 960;
  const height = options?.height ?? 540;
  const scale = options?.scale ?? 1;
  const format: ImageFormat = options?.format ?? "png";
  const quality = Math.round(Math.min(100, Math.max(0, options?.quality ?? 85)));
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);

  // Register fonts for all slides upfront
  for (const node of slideNodes) {
    ensureFontsRegistered(node as any, GlobalFonts);
  }

  const images: SlideImage[] = [];

  for (let i = 0; i < slideNodes.length; i++) {
    const slideNode = slideNodes[i];
    const canvas = createCanvas(pixelWidth, pixelHeight);
    renderSlideToCanvas(slideNode, canvas, options?.themeColors, options?.backgroundOverride);

    await paintImages(canvas, slideNode, loadImage);
    await paintCharts(canvas, slideNode, loadImage, options?.themeColors);

    const buffer: Buffer =
      format === "jpeg"
        ? canvas.toBuffer("image/jpeg", quality)
        : canvas.toBuffer("image/png");

    images.push({
      slideIndex: slideIndices[i],
      buffer,
      width: pixelWidth,
      height: pixelHeight,
      format,
    });
  }

  return images;
}
