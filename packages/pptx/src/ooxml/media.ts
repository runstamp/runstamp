// src/ooxml/media.ts — Media pipeline: buffer images for PPTX embedding
import { createHash } from "node:crypto";
import type { LayoutNode, LayoutImage, LayoutVideo, LayoutAudio } from "../layout/extract.js";
import { getLogger } from "../logger.js";
import {
  validateDataUrlSize,
  FETCH_TIMEOUT_MS,
  MAX_FETCH_MEDIA_BYTES,
  MAX_TOTAL_FETCH_MEDIA_BYTES,
  MAX_RASTER_IMAGE_DIMENSION_PX,
} from "./constants.js";
import { PaperError, RunstampFeatureError } from "../errors.js";
import { fetchWithRetry } from "../fetchRetry.js";
import { validateFetchUrlWithDns } from "./urlGuard.js";
import { collectLayoutNodes } from "../layout/traverse.js";
import { parseWebVideoUrl } from "./webVideoDetect.js";
import { getEngineMode } from "../engineMode.js";
import { isFeatureAvailable } from "../feature-gate.js";

/** Strip query string from URL for safe logging */
function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.slice(0, 100);
  }
}

export interface MediaAsset {
  rId: string;           // e.g., "rId2"
  mediaPath: string;     // e.g., "ppt/media/image1.png"  (ZIP path)
  relativePath: string;  // e.g., "../media/image1.png"   (.rels Target)
  ext: string;           // e.g., "png"
  buffer: Buffer;
}

export interface VideoMediaAsset {
  videoRId: string;      // for <a:videoFile r:link="rId..."/>
  mediaRId: string;      // for <p14:media r:embed="rId..."/>
  posterRId?: string;    // for <a:blip r:embed="rId..."/> (poster image)
  mediaPath: string;     // ZIP path: ppt/media/media1.mp4
  relativePath: string;  // rels target: ../media/media1.mp4
  ext: string;
  buffer: Buffer;
  posterMediaPath?: string;
  posterRelativePath?: string;
  posterExt?: string;
  posterBuffer?: Buffer;
  webVideo?: {
    embedUrl: string;
    watchUrl: string;
    hyperlinkRId: string;
  };
}

export interface AudioMediaAsset {
  audioRId: string;      // for <a:audioFile r:link="rId..."/>
  mediaRId: string;      // for <p14:media r:embed="rId..."/>
  mediaPath: string;
  relativePath: string;
  ext: string;
  buffer: Buffer;
}

export interface SvgMediaAsset {
  svgRId: string;          // rId for the SVG relationship
  svgMediaPath: string;    // ZIP path: ppt/media/imageN.svg
  svgRelativePath: string; // rels target: ../media/imageN.svg
  svgBuffer: Buffer;
}

export interface SlideMediaManifest {
  assets: MediaAsset[];
  fillAssets: MediaAsset[];  // Image fill media (rIds after regular images)
  videoAssets: VideoMediaAsset[];
  audioAssets: AudioMediaAsset[];
  svgAssets: SvgMediaAsset[];  // SVG assets for native SVG embedding
  /** Warnings for non-fatal issues (e.g. empty buffers from failed media fetches). */
  warnings: string[];
}

/**
 * Cross-slide image deduplication map. Keyed by SHA-256 hex digest of the
 * image buffer, stores the already-assigned ZIP paths. Passed into
 * processSlideMedia so identical images across slides share one ZIP entry.
 */
export type MediaDeduplicationMap = Map<string, { mediaPath: string; relativePath: string; ext: string; buffer: Buffer }>;

/** Render-scoped accounting for remotely fetched media response bodies. */
export interface MediaFetchBudget {
  limitBytes: number;
  consumedBytes: number;
  reservedBytes: number;
}

export function createMediaFetchBudget(limitBytes = MAX_TOTAL_FETCH_MEDIA_BYTES): MediaFetchBudget {
  return { limitBytes, consumedBytes: 0, reservedBytes: 0 };
}

export function hashBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// ---------------------------------------------------------------------------
// DFS collector: returns Image nodes in the same traversal order that
// serializeSlideTree visits them, ensuring rId indices stay aligned.
// ---------------------------------------------------------------------------

export function collectImageNodes(node: LayoutNode): LayoutNode[] {
  return collectLayoutNodes(node, candidate => candidate.type === "Image", { skipHidden: true });
}

/**
 * DFS collector for nodes with image fills (style.fill.type === "image").
 * Must match the DFS order in serializeSlideTree.
 */
export function collectImageFillNodes(node: LayoutNode): LayoutNode[] {
  return collectLayoutNodes(node, (candidate) => {
    if ((candidate.type !== "View" && candidate.type !== "Slide") || !candidate.style?.fill) {
      return false;
    }
    const fill = candidate.style.fill as { type: string; src?: string };
    return fill.type === "image" && !!fill.src;
  }, { skipHidden: true });
}

// ---------------------------------------------------------------------------
// DFS collector: returns Video nodes in the same traversal order that
// serializeSlideTree visits them, ensuring rId indices stay aligned.
// ---------------------------------------------------------------------------

export function collectVideoNodes(node: LayoutNode): LayoutNode[] {
  return collectLayoutNodes(node, candidate => candidate.type === "Video", { skipHidden: true });
}

// ---------------------------------------------------------------------------
// DFS collector: returns Audio nodes in the same traversal order that
// serializeSlideTree visits them, ensuring rId indices stay aligned.
// ---------------------------------------------------------------------------

export function collectAudioNodes(node: LayoutNode): LayoutNode[] {
  return collectLayoutNodes(node, candidate => candidate.type === "Audio", { skipHidden: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extFromVideoMime(mime: string): string {
  switch (mime) {
    case "video/mp4": return "mp4";
    case "video/webm": return "webm";
    case "video/x-msvideo":
    case "video/avi": return "avi";
    case "video/quicktime": return "mov";
    case "video/x-ms-wmv": return "wmv";
    default: return "mp4";
  }
}

function extFromAudioMime(mime: string): string {
  switch (mime) {
    case "audio/mpeg":
    case "audio/mp3": return "mp3";
    case "audio/wav":
    case "audio/x-wav": return "wav";
    case "audio/ogg": return "ogg";
    case "audio/mp4":
    case "audio/x-m4a": return "m4a";
    case "audio/x-ms-wma": return "wma";
    default: return "mp3";
  }
}

function extFromVideoUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split(".").pop()?.toLowerCase() ?? "";
    return ["mp4", "webm", "avi", "mov", "wmv"].includes(raw) ? raw : "mp4";
  } catch {
    return "mp4";
  }
}

function extFromAudioUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split(".").pop()?.toLowerCase() ?? "";
    return ["mp3", "wav", "ogg", "m4a", "wma"].includes(raw) ? raw : "mp3";
  } catch {
    return "mp3";
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/tiff":
      return "tiff";
    case "image/bmp":
    case "image/x-ms-bmp":
      return "bmp";
    default:
      return "png";
  }
}

function extFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split(".").pop()?.toLowerCase() ?? "";
    if (raw === "jpeg") return "jpg";
    return ["jpg", "png", "gif", "webp", "svg"].includes(raw) ? raw : "png";
  } catch {
    return "png";
  }
}

function validateBase64Buffer(buffer: Buffer, b64data: string, mime: string): void {
  if (buffer.length === 0 && b64data.length > 0) {
    getLogger().warn(`[media] Corrupt base64 data in data URL (MIME: ${mime}) — decoded to empty buffer`);
  }
}

interface RasterDimensions {
  width: number;
  height: number;
}

function readJpegDimensions(buffer: Buffer): RasterDimensions | undefined {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 3 < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return undefined;
}

function readRasterDimensions(buffer: Buffer): RasterDimensions | undefined {
  if (
    buffer.length >= 24
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    && buffer.subarray(12, 16).toString("ascii") === "IHDR"
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 10 && /^GIF8[79]a$/u.test(buffer.subarray(0, 6).toString("ascii"))) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (buffer.length >= 26 && buffer.subarray(0, 2).toString("ascii") === "BM") {
    const dibHeaderSize = buffer.readUInt32LE(14);
    if (dibHeaderSize === 12) {
      return { width: buffer.readUInt16LE(18), height: buffer.readUInt16LE(20) };
    }
    return {
      width: Math.abs(buffer.readInt32LE(18)),
      height: Math.abs(buffer.readInt32LE(22)),
    };
  }
  if (
    buffer.length >= 30
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    const chunk = buffer.subarray(12, 16).toString("ascii");
    if (chunk === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (chunk === "VP8 " && buffer.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === "VP8L" && buffer[20] === 0x2f) {
      return {
        width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
        height: 1 + (buffer[22] >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10),
      };
    }
  }
  return readJpegDimensions(buffer);
}

function validateRasterPixelDimensions(buffer: Buffer): void {
  const dimensions = readRasterDimensions(buffer);
  if (!dimensions) return;
  if (
    dimensions.width > MAX_RASTER_IMAGE_DIMENSION_PX
    || dimensions.height > MAX_RASTER_IMAGE_DIMENSION_PX
  ) {
    throw new PaperError(
      `Raster image dimensions ${dimensions.width}x${dimensions.height}px exceed the ${MAX_RASTER_IMAGE_DIMENSION_PX}px per-side limit`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" },
    );
  }
}

function decodeBase64DataUrl(
  dataUrl: string,
  options: {
    mediaKind: "image" | "video" | "audio";
    defaultExt: string;
    extensionFromMime: (mime: string) => string;
  },
): { buffer: Buffer; ext: string } {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) {
    getLogger().warn(`[media] Malformed ${options.mediaKind} data URL: missing comma separator`);
    return { buffer: Buffer.alloc(0), ext: options.defaultExt };
  }
  const header = dataUrl.slice(0, commaIdx);
  const b64data = dataUrl.slice(commaIdx + 1);
  validateDataUrlSize(b64data);
  const mime = header.split(";")[0].slice(5);
  const buffer = Buffer.from(b64data, "base64");
  validateBase64Buffer(buffer, b64data, mime);
  if (options.mediaKind === "image") validateRasterPixelDimensions(buffer);
  return { buffer, ext: options.extensionFromMime(mime) };
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  return decodeBase64DataUrl(dataUrl, {
    mediaKind: "image",
    defaultExt: "png",
    extensionFromMime: extFromMime,
  });
}

function decodeVideoDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  return decodeBase64DataUrl(dataUrl, {
    mediaKind: "video",
    defaultExt: "mp4",
    extensionFromMime: extFromVideoMime,
  });
}

function decodeAudioDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  return decodeBase64DataUrl(dataUrl, {
    mediaKind: "audio",
    defaultExt: "mp3",
    extensionFromMime: extFromAudioMime,
  });
}

function aggregateLimitError(budget: MediaFetchBudget, url: string, totalBytes: number): PaperError {
  return new PaperError(
    `Aggregate fetched media too large: ${(totalBytes / 1024 / 1024).toFixed(1)} MB exceeds ${budget.limitBytes / 1024 / 1024} MB aggregate limit: ${sanitizeUrlForLog(url)}`,
    { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" },
  );
}

function reserveAggregateBytes(budget: MediaFetchBudget, bytes: number, url: string): void {
  const nextTotal = budget.consumedBytes + budget.reservedBytes + bytes;
  if (nextTotal > budget.limitBytes) {
    throw aggregateLimitError(budget, url, nextTotal);
  }
  budget.reservedBytes += bytes;
}

function commitAggregateBytes(
  budget: MediaFetchBudget,
  reservedBytes: number,
  actualBytes: number,
): number {
  budget.reservedBytes -= reservedBytes;
  budget.consumedBytes += actualBytes;
  return budget.consumedBytes + budget.reservedBytes;
}

function rethrowResourceLimitExceeded(error: unknown): void {
  if (error instanceof PaperError && error.code === "RESOURCE_LIMIT_EXCEEDED") {
    throw error;
  }
}

/** Reads a response body while enforcing per-item and render-wide limits. */
async function readResponseWithSizeLimit(
  response: Response,
  url: string,
  maxBytes: number = MAX_FETCH_MEDIA_BYTES,
  budget?: MediaFetchBudget,
): Promise<ArrayBuffer> {
  // Check Content-Length header first for early rejection
  const contentLength = response.headers.get("content-length");
  const parsedContentLength = contentLength === null ? undefined : Number.parseInt(contentLength, 10);
  const declaredBytes = parsedContentLength !== undefined && Number.isFinite(parsedContentLength) && parsedContentLength >= 0
    ? parsedContentLength
    : undefined;
  if (declaredBytes !== undefined && declaredBytes > maxBytes) {
    throw new PaperError(
      `Media file too large: ${(declaredBytes / 1024 / 1024).toFixed(1)} MB exceeds ${maxBytes / 1024 / 1024} MB limit: ${sanitizeUrlForLog(url)}`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" },
    );
  }

  let reservedBytes = 0;
  if (budget && declaredBytes !== undefined) {
    reserveAggregateBytes(budget, declaredBytes, url);
    reservedBytes = declaredBytes;
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    if (budget) budget.reservedBytes -= reservedBytes;
    if (error instanceof PaperError) throw error;
    throw new PaperError(
      `[media] Failed to read media response body: ${sanitizeUrlForLog(url)}`,
      { code: "MEDIA_FETCH_FAILED", phase: "media", cause: error },
    );
  }
  const aggregateTotal = budget
    ? commitAggregateBytes(budget, reservedBytes, arrayBuffer.byteLength)
    : undefined;
  if (arrayBuffer.byteLength > maxBytes) {
    throw new PaperError(
      `Media file too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB exceeds ${maxBytes / 1024 / 1024} MB limit: ${sanitizeUrlForLog(url)}`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" },
    );
  }
  if (budget && aggregateTotal !== undefined && aggregateTotal > budget.limitBytes) {
    throw aggregateLimitError(budget, url, aggregateTotal);
  }
  return arrayBuffer;
}

async function fetchImageBuffer(
  url: string,
  budget: MediaFetchBudget,
  context?: { slideIndex?: number; nodeType?: string },
): Promise<{ buffer: Buffer; ext: string }> {
  return resolveImageSource(url, { context, mediaFetchBudget: budget });
}

export interface ResolveImageSourceOptions {
  context?: { slideIndex?: number; nodeType?: string };
  signal?: AbortSignal;
  validateUrl?: (url: string) => void | Promise<void>;
  mediaFetchBudget?: MediaFetchBudget;
}

export async function resolveImageSource(
  src: string,
  options: ResolveImageSourceOptions = {},
): Promise<{ buffer: Buffer; ext: string }> {
  if (src.startsWith("data:")) {
    return decodeDataUrl(src);
  }

  await (options.validateUrl ?? validateFetchUrlWithDns)(src);
  const response = await fetchWithRetry(src, { signal: options.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    const ctx = options.context ? ` (slide ${options.context.slideIndex}, ${options.context.nodeType})` : "";
    throw new PaperError(`[media] Failed to fetch image — HTTP ${response.status}${ctx}: ${sanitizeUrlForLog(src)}`, { code: "MEDIA_FETCH_FAILED", phase: "media" });
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  const mime = contentType.split(";")[0].trim();
  const arrayBuffer = await readResponseWithSizeLimit(response, src, MAX_FETCH_MEDIA_BYTES, options.mediaFetchBudget);
  const buffer = Buffer.from(arrayBuffer);
  validateRasterPixelDimensions(buffer);
  return {
    buffer,
    ext: extFromMime(mime) || extFromUrl(src),
  };
}

async function fetchVideoBuffer(
  url: string,
  budget: MediaFetchBudget,
  context?: { slideIndex?: number; nodeType?: string },
): Promise<{ buffer: Buffer; ext: string }> {
  await validateFetchUrlWithDns(url);
  const response = await fetchWithRetry(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    const ctx = context ? ` (slide ${context.slideIndex}, ${context.nodeType})` : "";
    throw new PaperError(`[media] Failed to fetch video — HTTP ${response.status}${ctx}: ${sanitizeUrlForLog(url)}`, { code: "MEDIA_FETCH_FAILED", phase: "media" });
  }
  const contentType = response.headers.get("content-type") ?? "video/mp4";
  const mime = contentType.split(";")[0].trim();
  const arrayBuffer = await readResponseWithSizeLimit(response, url, MAX_FETCH_MEDIA_BYTES, budget);
  return {
    buffer: Buffer.from(arrayBuffer),
    ext: extFromVideoMime(mime) || extFromVideoUrl(url),
  };
}

async function fetchAudioBuffer(
  url: string,
  budget: MediaFetchBudget,
  context?: { slideIndex?: number; nodeType?: string },
): Promise<{ buffer: Buffer; ext: string }> {
  await validateFetchUrlWithDns(url);
  const response = await fetchWithRetry(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    const ctx = context ? ` (slide ${context.slideIndex}, ${context.nodeType})` : "";
    throw new PaperError(`[media] Failed to fetch audio — HTTP ${response.status}${ctx}: ${sanitizeUrlForLog(url)}`, { code: "MEDIA_FETCH_FAILED", phase: "media" });
  }
  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  const mime = contentType.split(";")[0].trim();
  const arrayBuffer = await readResponseWithSizeLimit(response, url, MAX_FETCH_MEDIA_BYTES, budget);
  return {
    buffer: Buffer.from(arrayBuffer),
    ext: extFromAudioMime(mime) || extFromAudioUrl(url),
  };
}

// ---------------------------------------------------------------------------
// Concurrency-limited parallel mapping (preserves order)
// ---------------------------------------------------------------------------

const DEFAULT_CONCURRENCY = 6;

async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Helpers for parallel fetch phases
// ---------------------------------------------------------------------------

interface FetchedMedia {
  buffer: Buffer;
  ext: string;
}

async function resolveImageSrc(src: string, budget: MediaFetchBudget): Promise<FetchedMedia> {
  return resolveImageSource(src, { mediaFetchBudget: budget });
}

function assignMediaPath(
  fetched: FetchedMedia,
  globalMediaCounter: { current: number },
  deduplicationMap?: MediaDeduplicationMap,
): { buffer: Buffer; ext: string; mediaPath: string; relativePath: string } {
  const { buffer, ext } = fetched;
  let mediaPath: string;
  let relativePath: string;

  if (deduplicationMap) {
    const hash = hashBuffer(buffer);
    const existing = deduplicationMap.get(hash);
    if (existing) {
      return { buffer: existing.buffer, ext: existing.ext, mediaPath: existing.mediaPath, relativePath: existing.relativePath };
    }
    const mediaIndex = globalMediaCounter.current++;
    const fileName = `image${mediaIndex}.${ext}`;
    mediaPath = `ppt/media/${fileName}`;
    relativePath = `../media/${fileName}`;
    deduplicationMap.set(hash, { mediaPath, relativePath, ext, buffer });
  } else {
    const mediaIndex = globalMediaCounter.current++;
    const fileName = `image${mediaIndex}.${ext}`;
    mediaPath = `ppt/media/${fileName}`;
    relativePath = `../media/${fileName}`;
  }

  return { buffer, ext, mediaPath, relativePath };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Processes all Image, Video, and Audio nodes found in a slide's layout tree.
 *
 * Runs BEFORE serializeSlideTree so that rIds are known when XML is emitted.
 *
 * Images are fetched in parallel (up to 6 concurrent) for performance,
 * then rIds and media paths are assigned sequentially to preserve DFS order.
 *
 * @param slideLayoutNode  Root LayoutNode for a single slide.
 * @param globalMediaCounter  Shared mutable counter for sequential file naming
 *   across all slides (starts at 1 → image1.png, image2.png …).
 * @param globalVideoAudioCounter  Shared mutable counter for video/audio file naming
 *   across all slides (starts at 1 → media1.mp4, media2.wav …).
 * @returns SlideMediaManifest with every media asset's rId, buffer, and ZIP path.
 *
 * rId assignment:
 *   rId1  → slideLayout (reserved by generateSlideRels)
 *   rId2+ → images, in DFS traversal order
 *   then  → fill images
 *   then  → video/audio (each video gets 2-3 rIds, each audio gets 2 rIds)
 */
export async function processSlideMedia(
  slideLayoutNode: LayoutNode,
  globalMediaCounter: { current: number },
  globalVideoAudioCounter: { current: number } = { current: 1 },
  deduplicationMap?: MediaDeduplicationMap,
  mediaFetchBudget: MediaFetchBudget = createMediaFetchBudget(),
): Promise<SlideMediaManifest> {
  const imageNodes = collectImageNodes(slideLayoutNode);
  const warnings: string[] = [];

  // rId1 is reserved for slideLayout; media rIds start at 2
  let rIdCounter = 2;

  // Phase 1: Fetch all images in parallel (order-preserving)
  const imageSources = imageNodes.map((n) => (n as LayoutImage).src);
  const fetchedImages = await pMap(imageSources, (src) => resolveImageSrc(src, mediaFetchBudget));

  // Phase 2: Assign rIds and media paths sequentially (dedup + counter must be serial)
  const assets: MediaAsset[] = [];
  for (const fetched of fetchedImages) {
    const assigned = assignMediaPath(fetched, globalMediaCounter, deduplicationMap);
    assets.push({
      rId: `rId${rIdCounter++}`,
      mediaPath: assigned.mediaPath,
      relativePath: assigned.relativePath,
      ext: assigned.ext,
      buffer: assigned.buffer,
    });
  }

  // Image fill assets: fetch in parallel, assign rIds sequentially
  const fillNodes = collectImageFillNodes(slideLayoutNode);
  const fillSources = fillNodes.map((n) => (n.style!.fill as { type: string; src: string }).src);
  const fetchedFills = await pMap(fillSources, (src) => resolveImageSrc(src, mediaFetchBudget));

  const fillAssets: MediaAsset[] = [];
  for (const fetched of fetchedFills) {
    const assigned = assignMediaPath(fetched, globalMediaCounter, deduplicationMap);
    fillAssets.push({
      rId: `rId${rIdCounter++}`,
      mediaPath: assigned.mediaPath,
      relativePath: assigned.relativePath,
      ext: assigned.ext,
      buffer: assigned.buffer,
    });
  }

  // Video assets: fetch in parallel
  const videoNodes = collectVideoNodes(slideLayoutNode);
  const fetchedVideos = await pMap(videoNodes, async (videoNode) => {
    const video = videoNode as LayoutVideo;
    const src = video.src;
    const mimeType = video.mimeType;

    // Web video detection (YouTube/Vimeo)
    const webVideoInfo = parseWebVideoUrl(src);
    if (webVideoInfo) {
      if (!isFeatureAvailable("web-video-embedding", getEngineMode())) {
        throw new RunstampFeatureError(
          "YouTube/Vimeo video embedding is not bundled in the lite build. Use a direct video URL (MP4), or import the full engine entry.",
          "web-video-embedding",
        );
      }

      // Don't download the video — only fetch the poster thumbnail
      let posterUrl = webVideoInfo.posterUrl;

      // Vimeo: fetch poster URL from oEmbed API
      if (webVideoInfo.platform === "vimeo" && !posterUrl) {
        try {
          const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(webVideoInfo.watchUrl)}`;
          await validateFetchUrlWithDns(oEmbedUrl);
          const resp = await fetchWithRetry(oEmbedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
          const oEmbedBuffer = await readResponseWithSizeLimit(resp, oEmbedUrl, MAX_FETCH_MEDIA_BYTES, mediaFetchBudget);
          const data = JSON.parse(Buffer.from(oEmbedBuffer).toString("utf-8")) as { thumbnail_url?: string };
          posterUrl = data.thumbnail_url ?? "";
        } catch (e) {
          rethrowResourceLimitExceeded(e);
          getLogger().warn(`[media] Vimeo oEmbed fetch failed: ${(e as Error).message}`);
        }
      }

      // Fetch poster through SSRF-protected pipeline
      let posterResult: { buffer: Buffer; ext: string } | null = null;
      if (posterUrl) {
        try {
          posterResult = await fetchImageBuffer(posterUrl, mediaFetchBudget);
        } catch (e) {
          rethrowResourceLimitExceeded(e);
          getLogger().warn(`[media] Web video poster fetch failed: ${(e as Error).message}`);
          posterResult = { buffer: Buffer.alloc(0), ext: "jpg" };
        }
      }

      return { buffer: Buffer.alloc(0), ext: "mp4", poster: posterResult, webVideoInfo };
    }

    let buffer: Buffer;
    let ext: string;

    try {
      if (src.startsWith("data:")) {
        ({ buffer, ext } = decodeVideoDataUrl(src));
      } else {
        ({ buffer, ext } = await fetchVideoBuffer(src, mediaFetchBudget));
      }
    } catch (e) {
      rethrowResourceLimitExceeded(e);
      const msg = `Video fetch failed for "${sanitizeUrlForLog(src)}": ${(e as Error).message}. Using empty buffer.`;
      getLogger().warn(`[media] ${msg}`);
      warnings.push(msg);
      buffer = Buffer.alloc(0);
      ext = mimeType ? extFromVideoMime(mimeType) : extFromVideoUrl(src);
    }

    if (mimeType) {
      ext = extFromVideoMime(mimeType);
    }

    // Also fetch poster in parallel with the video
    let posterResult: { buffer: Buffer; ext: string } | null = null;
    if (video.poster) {
      try {
        if (video.poster.startsWith("data:")) {
          posterResult = decodeDataUrl(video.poster);
        } else {
          posterResult = await fetchImageBuffer(video.poster, mediaFetchBudget);
        }
      } catch (e) {
        rethrowResourceLimitExceeded(e);
        const posterMsg = `Poster image fetch failed for "${sanitizeUrlForLog(video.poster)}": ${(e as Error).message}. Using empty buffer.`;
        getLogger().warn(`[media] ${posterMsg}`);
        warnings.push(posterMsg);
        posterResult = { buffer: Buffer.alloc(0), ext: "png" };
      }
    }

    return { buffer, ext, poster: posterResult, webVideoInfo: undefined };
  });

  // Assign video rIds sequentially
  const videoAssets: VideoMediaAsset[] = [];
  for (let vi = 0; vi < videoNodes.length; vi++) {
    const { buffer, ext, poster, webVideoInfo } = fetchedVideos[vi];

    if (webVideoInfo) {
      // Web video: only poster + hyperlink rIds (no video/media rIds)
      const asset: VideoMediaAsset = {
        videoRId: "",
        mediaRId: "",
        mediaPath: "",
        relativePath: "",
        ext: "mp4",
        buffer: Buffer.alloc(0),
        webVideo: {
          embedUrl: webVideoInfo.embedUrl,
          watchUrl: webVideoInfo.watchUrl,
          hyperlinkRId: `rId${rIdCounter++}`,
        },
      };
      if (poster) {
        const posterIndex = globalMediaCounter.current++;
        const posterFileName = `image${posterIndex}.${poster.ext}`;
        asset.posterRId = `rId${rIdCounter++}`;
        asset.posterMediaPath = `ppt/media/${posterFileName}`;
        asset.posterRelativePath = `../media/${posterFileName}`;
        asset.posterExt = poster.ext;
        asset.posterBuffer = poster.buffer;
      }
      videoAssets.push(asset);
    } else {
      // Existing local video logic
      const mediaIndex = globalVideoAudioCounter.current++;
      const fileName = `video${mediaIndex}.${ext}`;

      const videoRId = `rId${rIdCounter++}`;
      const mediaRId = `rId${rIdCounter++}`;

      const asset: VideoMediaAsset = {
        videoRId,
        mediaRId,
        mediaPath: `ppt/media/${fileName}`,
        relativePath: `../media/${fileName}`,
        ext,
        buffer,
      };

      if (poster) {
        const posterIndex = globalMediaCounter.current++;
        const posterFileName = `image${posterIndex}.${poster.ext}`;
        const posterRId = `rId${rIdCounter++}`;

        asset.posterRId = posterRId;
        asset.posterMediaPath = `ppt/media/${posterFileName}`;
        asset.posterRelativePath = `../media/${posterFileName}`;
        asset.posterExt = poster.ext;
        asset.posterBuffer = poster.buffer;
      }

      videoAssets.push(asset);
    }
  }

  // Audio assets: fetch in parallel
  const audioNodes = collectAudioNodes(slideLayoutNode);
  const fetchedAudios = await pMap(audioNodes, async (audioNode) => {
    const audio = audioNode as LayoutAudio;
    const src = audio.src;
    const mimeType = audio.mimeType;

    let buffer: Buffer;
    let ext: string;

    try {
      if (src.startsWith("data:")) {
        ({ buffer, ext } = decodeAudioDataUrl(src));
      } else {
        ({ buffer, ext } = await fetchAudioBuffer(src, mediaFetchBudget));
      }
    } catch (e) {
      rethrowResourceLimitExceeded(e);
      const audioMsg = `Audio fetch failed for "${sanitizeUrlForLog(src)}": ${(e as Error).message}. Using empty buffer.`;
      getLogger().warn(`[media] ${audioMsg}`);
      warnings.push(audioMsg);
      buffer = Buffer.alloc(0);
      ext = mimeType ? extFromAudioMime(mimeType) : extFromAudioUrl(src);
    }

    if (mimeType) {
      ext = extFromAudioMime(mimeType);
    }

    return { buffer, ext };
  });

  // Assign audio rIds sequentially
  const audioAssets: AudioMediaAsset[] = [];
  for (const { buffer, ext } of fetchedAudios) {
    const mediaIndex = globalVideoAudioCounter.current++;
    const fileName = `audio${mediaIndex}.${ext}`;

    const audioRId = `rId${rIdCounter++}`;
    const mediaRId = `rId${rIdCounter++}`;

    audioAssets.push({
      audioRId,
      mediaRId,
      mediaPath: `ppt/media/${fileName}`,
      relativePath: `../media/${fileName}`,
      ext,
      buffer,
    });
  }

  // SVG assets: fetch in parallel
  const svgImageNodes = imageNodes.filter((n) => (n as LayoutImage).svgSrc);
  const fetchedSvgs = await pMap(svgImageNodes, async (imageNode) => {
    const svgSrc = (imageNode as LayoutImage).svgSrc!;

    if (svgSrc.startsWith("data:")) {
      const commaIdx = svgSrc.indexOf(",");
      const header = svgSrc.slice(0, commaIdx);
      const b64data = svgSrc.slice(commaIdx + 1);
      const isBase64 = header.includes("base64");
      if (isBase64) {
        validateDataUrlSize(b64data);
        return { buffer: Buffer.from(b64data, "base64"), ok: true as const };
      }
      if (b64data.length > 50 * 1024 * 1024) {
        throw new PaperError(
          `SVG data URL exceeds maximum size limit (${(b64data.length / 1024 / 1024).toFixed(1)} MB)`,
          { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" },
        );
      }
      return { buffer: Buffer.from(decodeURIComponent(b64data), "utf-8"), ok: true as const };
    }

    try {
      await validateFetchUrlWithDns(svgSrc);
      const response = await fetchWithRetry(svgSrc, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        throw new PaperError(`HTTP ${response.status}`, {
          code: "MEDIA_FETCH_FAILED",
          phase: "media",
        });
      }
      const arrayBuffer = await readResponseWithSizeLimit(response, svgSrc, MAX_FETCH_MEDIA_BYTES, mediaFetchBudget);
      return { buffer: Buffer.from(arrayBuffer), ok: true as const };
    } catch (e) {
      rethrowResourceLimitExceeded(e);
      const svgMsg = `SVG fetch failed for "${sanitizeUrlForLog(svgSrc)}": ${(e as Error).message}. Skipping SVG.`;
      getLogger().warn(`[media] ${svgMsg}`);
      warnings.push(svgMsg);
      return { buffer: Buffer.alloc(0), ok: false as const };
    }
  });

  // Assign SVG rIds sequentially
  const svgAssets: SvgMediaAsset[] = [];
  for (let si = 0; si < fetchedSvgs.length; si++) {
    const fetched = fetchedSvgs[si];
    if (!fetched.ok) continue;

    const svgIndex = globalMediaCounter.current++;
    const svgFileName = `image${svgIndex}.svg`;
    const svgRId = `rId${rIdCounter++}`;

    svgAssets.push({
      svgRId,
      svgMediaPath: `ppt/media/${svgFileName}`,
      svgRelativePath: `../media/${svgFileName}`,
      svgBuffer: fetched.buffer,
    });
  }

  return { assets, fillAssets, videoAssets, audioAssets, svgAssets, warnings };
}
