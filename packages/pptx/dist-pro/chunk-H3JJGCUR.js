import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  normalizeWaterfallData,
  rasterizeChart
} from "./chunk-2SWG4VB5.js";
import {
  VERTICAL_ALIGN_MAP,
  emitDecorativeExtXml,
  emitLocksXml,
  emitParagraphsXml,
  normalizeToParagraphs,
  normalizeToParagraphsFromFields,
  resolveHyperlink,
  shouldOmitTransform
} from "./chunk-MP76HATA.js";
import {
  hasVisualProperties,
  isFeatureAvailable,
  resolveChartAnnotations
} from "./chunk-Z2EIZERW.js";
import {
  computeClassicChartLayout,
  getChartExcelLayout,
  isChartExType,
  resolveClassicLegendPosition
} from "./chunk-JRK4KXDV.js";
import {
  PIXEL_TO_EMU,
  cssAngleToOoxml,
  emitColorWithAlpha,
  emitColorXml,
  emitEffectsXml,
  emitFillXml,
  emitLineXml,
  emitScene3dXml,
  emitSp3dXml,
  escapeXml,
  escapeXmlAttr,
  toEmu,
  toHex
} from "./chunk-M2YFSO2D.js";
import {
  computeAutoFit
} from "./chunk-AIRKBIKH.js";
import {
  require_lib
} from "./chunk-5GZJ6PGT.js";
import {
  fetchWithRetry,
  resolveEffectiveViewGeometry
} from "./chunk-XZ4AHITT.js";
import {
  planTableLayout,
  resolveTableColumns
} from "./chunk-IC35FUMW.js";
import {
  DETERMINISTIC_DATE,
  isDeterministicMode
} from "./chunk-RQNEGT4U.js";
import {
  calculateRichTextMetrics
} from "./chunk-7BYJLCSM.js";
import {
  validateFetchUrlWithDns
} from "./chunk-WVTVGR3K.js";
import {
  getEngineMode,
  isLiteBundle
} from "./chunk-DX2BYFTQ.js";
import {
  FETCH_TIMEOUT_MS,
  MAX_FETCH_MEDIA_BYTES,
  MAX_RASTER_IMAGE_DIMENSION_PX,
  MAX_TOTAL_FETCH_MEDIA_BYTES,
  SLIDE_HEIGHT_EMU,
  SLIDE_ID_BASE,
  SLIDE_WIDTH_EMU,
  validateDataUrlSize
} from "./chunk-XU7YQ73E.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";
import {
  PaperError,
  RunstampFeatureError
} from "./chunk-SFVKAOLH.js";
import {
  __toESM
} from "./chunk-VIXD5LXH.js";

// src/ooxml/webVideoDetect.ts
function parseWebVideoUrl(src) {
  const ytId = extractYouTubeId(src);
  if (ytId) {
    return {
      platform: "youtube",
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
      posterUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    };
  }
  const vimeoId = extractVimeoId(src);
  if (vimeoId) {
    return {
      platform: "vimeo",
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      watchUrl: `https://vimeo.com/${vimeoId}`,
      posterUrl: ""
      // Resolved via oEmbed API in media.ts
    };
  }
  return null;
}
function isWebVideoUrl(src) {
  return parseWebVideoUrl(src) !== null;
}
function extractYouTubeId(src) {
  let url;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && isValidYouTubeId(id) ? id : null;
    }
    const embedMatch = /^\/embed\/([a-zA-Z0-9_-]{11})/.exec(url.pathname);
    if (embedMatch) return embedMatch[1];
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id && isValidYouTubeId(id) ? id : null;
  }
  return null;
}
function extractVimeoId(src) {
  let url;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "vimeo.com") {
    const match = /^\/(\d{6,})/.exec(url.pathname);
    return match ? match[1] : null;
  }
  if (host === "player.vimeo.com") {
    const match = /^\/video\/(\d{6,})/.exec(url.pathname);
    return match ? match[1] : null;
  }
  return null;
}
function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

// src/ooxml/media.ts
import { createHash } from "node:crypto";

// src/layout/traverse.ts
function traverseLayoutTree(node, visitor, options = {}) {
  if (options.skipHidden && node.style?.display === "none") {
    return;
  }
  visitor(node);
  for (const child of node.children ?? []) {
    traverseLayoutTree(child, visitor, options);
  }
}
function collectLayoutNodes(node, predicate, options = {}) {
  const results = [];
  traverseLayoutTree(node, (candidate) => {
    if (predicate(candidate)) {
      results.push(candidate);
    }
  }, options);
  return results;
}
function someLayoutNode(node, predicate, options = {}) {
  let found = false;
  traverseLayoutTree(node, (candidate) => {
    if (!found && predicate(candidate)) {
      found = true;
    }
  }, options);
  return found;
}

// src/ooxml/media.ts
function sanitizeUrlForLog(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.slice(0, 100);
  }
}
function createMediaFetchBudget(limitBytes = MAX_TOTAL_FETCH_MEDIA_BYTES) {
  return { limitBytes, consumedBytes: 0, reservedBytes: 0 };
}
function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}
function collectImageNodes(node) {
  return collectLayoutNodes(node, (candidate) => candidate.type === "Image", { skipHidden: true });
}
function collectImageFillNodes(node) {
  return collectLayoutNodes(node, (candidate) => {
    if (candidate.type !== "View" && candidate.type !== "Slide" || !candidate.style?.fill) {
      return false;
    }
    const fill = candidate.style.fill;
    return fill.type === "image" && !!fill.src;
  }, { skipHidden: true });
}
function collectVideoNodes(node) {
  return collectLayoutNodes(node, (candidate) => candidate.type === "Video", { skipHidden: true });
}
function collectAudioNodes(node) {
  return collectLayoutNodes(node, (candidate) => candidate.type === "Audio", { skipHidden: true });
}
function extFromVideoMime(mime) {
  switch (mime) {
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/x-msvideo":
    case "video/avi":
      return "avi";
    case "video/quicktime":
      return "mov";
    case "video/x-ms-wmv":
      return "wmv";
    default:
      return "mp4";
  }
}
function extFromAudioMime(mime) {
  switch (mime) {
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/mp4":
    case "audio/x-m4a":
      return "m4a";
    case "audio/x-ms-wma":
      return "wma";
    default:
      return "mp3";
  }
}
function extFromVideoUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split(".").pop()?.toLowerCase() ?? "";
    return ["mp4", "webm", "avi", "mov", "wmv"].includes(raw) ? raw : "mp4";
  } catch {
    return "mp4";
  }
}
function extFromAudioUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split(".").pop()?.toLowerCase() ?? "";
    return ["mp3", "wav", "ogg", "m4a", "wma"].includes(raw) ? raw : "mp3";
  } catch {
    return "mp3";
  }
}
function extFromMime(mime) {
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
function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split(".").pop()?.toLowerCase() ?? "";
    if (raw === "jpeg") return "jpg";
    return ["jpg", "png", "gif", "webp", "svg"].includes(raw) ? raw : "png";
  } catch {
    return "png";
  }
}
function validateBase64Buffer(buffer, b64data, mime) {
  if (buffer.length === 0 && b64data.length > 0) {
    getLogger().warn(`[media] Corrupt base64 data in data URL (MIME: ${mime}) \u2014 decoded to empty buffer`);
  }
}
function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 255 || buffer[1] !== 216) return void 0;
  const startOfFrameMarkers = /* @__PURE__ */ new Set([
    192,
    193,
    194,
    195,
    197,
    198,
    199,
    201,
    202,
    203,
    205,
    206,
    207
  ]);
  let offset = 2;
  while (offset + 3 < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 255) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset++];
    if (marker === 216 || marker === 217 || marker >= 208 && marker <= 215) continue;
    if (offset + 1 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }
    offset += segmentLength;
  }
  return void 0;
}
function readRasterDimensions(buffer) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.subarray(12, 16).toString("ascii") === "IHDR") {
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
      height: Math.abs(buffer.readInt32LE(22))
    };
  }
  if (buffer.length >= 30 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    const chunk = buffer.subarray(12, 16).toString("ascii");
    if (chunk === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3)
      };
    }
    if (chunk === "VP8 " && buffer.subarray(23, 26).equals(Buffer.from([157, 1, 42]))) {
      return {
        width: buffer.readUInt16LE(26) & 16383,
        height: buffer.readUInt16LE(28) & 16383
      };
    }
    if (chunk === "VP8L" && buffer[20] === 47) {
      return {
        width: 1 + buffer[21] + ((buffer[22] & 63) << 8),
        height: 1 + (buffer[22] >> 6) + (buffer[23] << 2) + ((buffer[24] & 15) << 10)
      };
    }
  }
  return readJpegDimensions(buffer);
}
function validateRasterPixelDimensions(buffer) {
  const dimensions = readRasterDimensions(buffer);
  if (!dimensions) return;
  if (dimensions.width > MAX_RASTER_IMAGE_DIMENSION_PX || dimensions.height > MAX_RASTER_IMAGE_DIMENSION_PX) {
    throw new PaperError(
      `Raster image dimensions ${dimensions.width}x${dimensions.height}px exceed the ${MAX_RASTER_IMAGE_DIMENSION_PX}px per-side limit`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" }
    );
  }
}
function decodeBase64DataUrl(dataUrl, options) {
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
function decodeDataUrl(dataUrl) {
  return decodeBase64DataUrl(dataUrl, {
    mediaKind: "image",
    defaultExt: "png",
    extensionFromMime: extFromMime
  });
}
function decodeVideoDataUrl(dataUrl) {
  return decodeBase64DataUrl(dataUrl, {
    mediaKind: "video",
    defaultExt: "mp4",
    extensionFromMime: extFromVideoMime
  });
}
function decodeAudioDataUrl(dataUrl) {
  return decodeBase64DataUrl(dataUrl, {
    mediaKind: "audio",
    defaultExt: "mp3",
    extensionFromMime: extFromAudioMime
  });
}
function aggregateLimitError(budget, url, totalBytes) {
  return new PaperError(
    `Aggregate fetched media too large: ${(totalBytes / 1024 / 1024).toFixed(1)} MB exceeds ${budget.limitBytes / 1024 / 1024} MB aggregate limit: ${sanitizeUrlForLog(url)}`,
    { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" }
  );
}
function reserveAggregateBytes(budget, bytes, url) {
  const nextTotal = budget.consumedBytes + budget.reservedBytes + bytes;
  if (nextTotal > budget.limitBytes) {
    throw aggregateLimitError(budget, url, nextTotal);
  }
  budget.reservedBytes += bytes;
}
function commitAggregateBytes(budget, reservedBytes, actualBytes) {
  budget.reservedBytes -= reservedBytes;
  budget.consumedBytes += actualBytes;
  return budget.consumedBytes + budget.reservedBytes;
}
function rethrowResourceLimitExceeded(error) {
  if (error instanceof PaperError && error.code === "RESOURCE_LIMIT_EXCEEDED") {
    throw error;
  }
}
async function readResponseWithSizeLimit(response, url, maxBytes = MAX_FETCH_MEDIA_BYTES, budget) {
  const contentLength = response.headers.get("content-length");
  const parsedContentLength = contentLength === null ? void 0 : Number.parseInt(contentLength, 10);
  const declaredBytes = parsedContentLength !== void 0 && Number.isFinite(parsedContentLength) && parsedContentLength >= 0 ? parsedContentLength : void 0;
  if (declaredBytes !== void 0 && declaredBytes > maxBytes) {
    throw new PaperError(
      `Media file too large: ${(declaredBytes / 1024 / 1024).toFixed(1)} MB exceeds ${maxBytes / 1024 / 1024} MB limit: ${sanitizeUrlForLog(url)}`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" }
    );
  }
  let reservedBytes = 0;
  if (budget && declaredBytes !== void 0) {
    reserveAggregateBytes(budget, declaredBytes, url);
    reservedBytes = declaredBytes;
  }
  let arrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    if (budget) budget.reservedBytes -= reservedBytes;
    if (error instanceof PaperError) throw error;
    throw new PaperError(
      `[media] Failed to read media response body: ${sanitizeUrlForLog(url)}`,
      { code: "MEDIA_FETCH_FAILED", phase: "media", cause: error }
    );
  }
  const aggregateTotal = budget ? commitAggregateBytes(budget, reservedBytes, arrayBuffer.byteLength) : void 0;
  if (arrayBuffer.byteLength > maxBytes) {
    throw new PaperError(
      `Media file too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB exceeds ${maxBytes / 1024 / 1024} MB limit: ${sanitizeUrlForLog(url)}`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" }
    );
  }
  if (budget && aggregateTotal !== void 0 && aggregateTotal > budget.limitBytes) {
    throw aggregateLimitError(budget, url, aggregateTotal);
  }
  return arrayBuffer;
}
async function fetchImageBuffer(url, budget, context) {
  return resolveImageSource(url, { context, mediaFetchBudget: budget });
}
async function resolveImageSource(src, options = {}) {
  if (src.startsWith("data:")) {
    return decodeDataUrl(src);
  }
  await (options.validateUrl ?? validateFetchUrlWithDns)(src);
  const response = await fetchWithRetry(src, { signal: options.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    const ctx = options.context ? ` (slide ${options.context.slideIndex}, ${options.context.nodeType})` : "";
    throw new PaperError(`[media] Failed to fetch image \u2014 HTTP ${response.status}${ctx}: ${sanitizeUrlForLog(src)}`, { code: "MEDIA_FETCH_FAILED", phase: "media" });
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  const mime = contentType.split(";")[0].trim();
  const arrayBuffer = await readResponseWithSizeLimit(response, src, MAX_FETCH_MEDIA_BYTES, options.mediaFetchBudget);
  const buffer = Buffer.from(arrayBuffer);
  validateRasterPixelDimensions(buffer);
  return {
    buffer,
    ext: extFromMime(mime) || extFromUrl(src)
  };
}
async function fetchVideoBuffer(url, budget, context) {
  await validateFetchUrlWithDns(url);
  const response = await fetchWithRetry(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    const ctx = context ? ` (slide ${context.slideIndex}, ${context.nodeType})` : "";
    throw new PaperError(`[media] Failed to fetch video \u2014 HTTP ${response.status}${ctx}: ${sanitizeUrlForLog(url)}`, { code: "MEDIA_FETCH_FAILED", phase: "media" });
  }
  const contentType = response.headers.get("content-type") ?? "video/mp4";
  const mime = contentType.split(";")[0].trim();
  const arrayBuffer = await readResponseWithSizeLimit(response, url, MAX_FETCH_MEDIA_BYTES, budget);
  return {
    buffer: Buffer.from(arrayBuffer),
    ext: extFromVideoMime(mime) || extFromVideoUrl(url)
  };
}
async function fetchAudioBuffer(url, budget, context) {
  await validateFetchUrlWithDns(url);
  const response = await fetchWithRetry(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    const ctx = context ? ` (slide ${context.slideIndex}, ${context.nodeType})` : "";
    throw new PaperError(`[media] Failed to fetch audio \u2014 HTTP ${response.status}${ctx}: ${sanitizeUrlForLog(url)}`, { code: "MEDIA_FETCH_FAILED", phase: "media" });
  }
  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  const mime = contentType.split(";")[0].trim();
  const arrayBuffer = await readResponseWithSizeLimit(response, url, MAX_FETCH_MEDIA_BYTES, budget);
  return {
    buffer: Buffer.from(arrayBuffer),
    ext: extFromAudioMime(mime) || extFromAudioUrl(url)
  };
}
var DEFAULT_CONCURRENCY = 6;
async function pMap(items, fn, concurrency = DEFAULT_CONCURRENCY) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
async function resolveImageSrc(src, budget) {
  return resolveImageSource(src, { mediaFetchBudget: budget });
}
function assignMediaPath(fetched, globalMediaCounter, deduplicationMap) {
  const { buffer, ext } = fetched;
  let mediaPath;
  let relativePath;
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
async function processSlideMedia(slideLayoutNode, globalMediaCounter, globalVideoAudioCounter = { current: 1 }, deduplicationMap, mediaFetchBudget = createMediaFetchBudget()) {
  const imageNodes = collectImageNodes(slideLayoutNode);
  const warnings = [];
  let rIdCounter = 2;
  const imageSources = imageNodes.map((n) => n.src);
  const fetchedImages = await pMap(imageSources, (src) => resolveImageSrc(src, mediaFetchBudget));
  const assets = [];
  for (const fetched of fetchedImages) {
    const assigned = assignMediaPath(fetched, globalMediaCounter, deduplicationMap);
    assets.push({
      rId: `rId${rIdCounter++}`,
      mediaPath: assigned.mediaPath,
      relativePath: assigned.relativePath,
      ext: assigned.ext,
      buffer: assigned.buffer
    });
  }
  const fillNodes = collectImageFillNodes(slideLayoutNode);
  const fillSources = fillNodes.map((n) => n.style.fill.src);
  const fetchedFills = await pMap(fillSources, (src) => resolveImageSrc(src, mediaFetchBudget));
  const fillAssets = [];
  for (const fetched of fetchedFills) {
    const assigned = assignMediaPath(fetched, globalMediaCounter, deduplicationMap);
    fillAssets.push({
      rId: `rId${rIdCounter++}`,
      mediaPath: assigned.mediaPath,
      relativePath: assigned.relativePath,
      ext: assigned.ext,
      buffer: assigned.buffer
    });
  }
  const videoNodes = collectVideoNodes(slideLayoutNode);
  const fetchedVideos = await pMap(videoNodes, async (videoNode) => {
    const video = videoNode;
    const src = video.src;
    const mimeType = video.mimeType;
    const webVideoInfo = parseWebVideoUrl(src);
    if (webVideoInfo) {
      if (!isFeatureAvailable("web-video-embedding", getEngineMode())) {
        throw new RunstampFeatureError(
          "YouTube/Vimeo video embedding is not bundled in the lite build. Use a direct video URL (MP4), or import the full engine entry.",
          "web-video-embedding"
        );
      }
      let posterUrl = webVideoInfo.posterUrl;
      if (webVideoInfo.platform === "vimeo" && !posterUrl) {
        try {
          const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(webVideoInfo.watchUrl)}`;
          await validateFetchUrlWithDns(oEmbedUrl);
          const resp = await fetchWithRetry(oEmbedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
          const oEmbedBuffer = await readResponseWithSizeLimit(resp, oEmbedUrl, MAX_FETCH_MEDIA_BYTES, mediaFetchBudget);
          const data = JSON.parse(Buffer.from(oEmbedBuffer).toString("utf-8"));
          posterUrl = data.thumbnail_url ?? "";
        } catch (e) {
          rethrowResourceLimitExceeded(e);
          getLogger().warn(`[media] Vimeo oEmbed fetch failed: ${e.message}`);
        }
      }
      let posterResult2 = null;
      if (posterUrl) {
        try {
          posterResult2 = await fetchImageBuffer(posterUrl, mediaFetchBudget);
        } catch (e) {
          rethrowResourceLimitExceeded(e);
          getLogger().warn(`[media] Web video poster fetch failed: ${e.message}`);
          posterResult2 = { buffer: Buffer.alloc(0), ext: "jpg" };
        }
      }
      return { buffer: Buffer.alloc(0), ext: "mp4", poster: posterResult2, webVideoInfo };
    }
    let buffer;
    let ext;
    try {
      if (src.startsWith("data:")) {
        ({ buffer, ext } = decodeVideoDataUrl(src));
      } else {
        ({ buffer, ext } = await fetchVideoBuffer(src, mediaFetchBudget));
      }
    } catch (e) {
      rethrowResourceLimitExceeded(e);
      const msg = `Video fetch failed for "${sanitizeUrlForLog(src)}": ${e.message}. Using empty buffer.`;
      getLogger().warn(`[media] ${msg}`);
      warnings.push(msg);
      buffer = Buffer.alloc(0);
      ext = mimeType ? extFromVideoMime(mimeType) : extFromVideoUrl(src);
    }
    if (mimeType) {
      ext = extFromVideoMime(mimeType);
    }
    let posterResult = null;
    if (video.poster) {
      try {
        if (video.poster.startsWith("data:")) {
          posterResult = decodeDataUrl(video.poster);
        } else {
          posterResult = await fetchImageBuffer(video.poster, mediaFetchBudget);
        }
      } catch (e) {
        rethrowResourceLimitExceeded(e);
        const posterMsg = `Poster image fetch failed for "${sanitizeUrlForLog(video.poster)}": ${e.message}. Using empty buffer.`;
        getLogger().warn(`[media] ${posterMsg}`);
        warnings.push(posterMsg);
        posterResult = { buffer: Buffer.alloc(0), ext: "png" };
      }
    }
    return { buffer, ext, poster: posterResult, webVideoInfo: void 0 };
  });
  const videoAssets = [];
  for (let vi = 0; vi < videoNodes.length; vi++) {
    const { buffer, ext, poster, webVideoInfo } = fetchedVideos[vi];
    if (webVideoInfo) {
      const asset = {
        videoRId: "",
        mediaRId: "",
        mediaPath: "",
        relativePath: "",
        ext: "mp4",
        buffer: Buffer.alloc(0),
        webVideo: {
          embedUrl: webVideoInfo.embedUrl,
          watchUrl: webVideoInfo.watchUrl,
          hyperlinkRId: `rId${rIdCounter++}`
        }
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
      const mediaIndex = globalVideoAudioCounter.current++;
      const fileName = `video${mediaIndex}.${ext}`;
      const videoRId = `rId${rIdCounter++}`;
      const mediaRId = `rId${rIdCounter++}`;
      const asset = {
        videoRId,
        mediaRId,
        mediaPath: `ppt/media/${fileName}`,
        relativePath: `../media/${fileName}`,
        ext,
        buffer
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
  const audioNodes = collectAudioNodes(slideLayoutNode);
  const fetchedAudios = await pMap(audioNodes, async (audioNode) => {
    const audio = audioNode;
    const src = audio.src;
    const mimeType = audio.mimeType;
    let buffer;
    let ext;
    try {
      if (src.startsWith("data:")) {
        ({ buffer, ext } = decodeAudioDataUrl(src));
      } else {
        ({ buffer, ext } = await fetchAudioBuffer(src, mediaFetchBudget));
      }
    } catch (e) {
      rethrowResourceLimitExceeded(e);
      const audioMsg = `Audio fetch failed for "${sanitizeUrlForLog(src)}": ${e.message}. Using empty buffer.`;
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
  const audioAssets = [];
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
      buffer
    });
  }
  const svgImageNodes = imageNodes.filter((n) => n.svgSrc);
  const fetchedSvgs = await pMap(svgImageNodes, async (imageNode) => {
    const svgSrc = imageNode.svgSrc;
    if (svgSrc.startsWith("data:")) {
      const commaIdx = svgSrc.indexOf(",");
      const header = svgSrc.slice(0, commaIdx);
      const b64data = svgSrc.slice(commaIdx + 1);
      const isBase64 = header.includes("base64");
      if (isBase64) {
        validateDataUrlSize(b64data);
        return { buffer: Buffer.from(b64data, "base64"), ok: true };
      }
      if (b64data.length > 50 * 1024 * 1024) {
        throw new PaperError(
          `SVG data URL exceeds maximum size limit (${(b64data.length / 1024 / 1024).toFixed(1)} MB)`,
          { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" }
        );
      }
      return { buffer: Buffer.from(decodeURIComponent(b64data), "utf-8"), ok: true };
    }
    try {
      await validateFetchUrlWithDns(svgSrc);
      const response = await fetchWithRetry(svgSrc, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        throw new PaperError(`HTTP ${response.status}`, {
          code: "MEDIA_FETCH_FAILED",
          phase: "media"
        });
      }
      const arrayBuffer = await readResponseWithSizeLimit(response, svgSrc, MAX_FETCH_MEDIA_BYTES, mediaFetchBudget);
      return { buffer: Buffer.from(arrayBuffer), ok: true };
    } catch (e) {
      rethrowResourceLimitExceeded(e);
      const svgMsg = `SVG fetch failed for "${sanitizeUrlForLog(svgSrc)}": ${e.message}. Skipping SVG.`;
      getLogger().warn(`[media] ${svgMsg}`);
      warnings.push(svgMsg);
      return { buffer: Buffer.alloc(0), ok: false };
    }
  });
  const svgAssets = [];
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
      svgBuffer: fetched.buffer
    });
  }
  return { assets, fillAssets, videoAssets, audioAssets, svgAssets, warnings };
}

// src/ooxml/zipper.ts
var import_jszip = __toESM(require_lib(), 1);

// src/ooxml/packageManifest.ts
var CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
var RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
function normalizeExtension(extension) {
  return extension.replace(/^\./, "").toLowerCase();
}
function normalizePartPath(path) {
  return path.replace(/^\/+/, "");
}
function overridePartName(path) {
  return `/${normalizePartPath(path)}`;
}
function getExtension(path) {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? void 0 : fileName.slice(dotIndex + 1).toLowerCase();
}
var PackageManifest = class {
  defaults = /* @__PURE__ */ new Map();
  overrides = /* @__PURE__ */ new Map();
  relationships = /* @__PURE__ */ new Map();
  addDefault(extension, contentType) {
    const normalized = normalizeExtension(extension);
    const existing = this.defaults.get(normalized);
    if (existing && existing !== contentType) {
      throw new PaperError(
        `Conflicting content type defaults for extension "${normalized}".`,
        { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" }
      );
    }
    this.defaults.set(normalized, contentType);
  }
  addPart(path, contentType) {
    const partName = overridePartName(path);
    const existing = this.overrides.get(partName);
    if (existing && existing !== contentType) {
      throw new PaperError(
        `Conflicting content type overrides for part "${partName}".`,
        { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" }
      );
    }
    this.overrides.set(partName, contentType);
  }
  addRelationship(ownerPath, relationship) {
    const ownerKey = ownerPath ? normalizePartPath(ownerPath) : "";
    const ownerRels = this.relationships.get(ownerKey) ?? /* @__PURE__ */ new Map();
    if (ownerRels.has(relationship.id)) {
      throw new PaperError(
        `Duplicate relationship id "${relationship.id}" for "${ownerKey || "/"}".`,
        { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" }
      );
    }
    ownerRels.set(relationship.id, relationship);
    this.relationships.set(ownerKey, ownerRels);
  }
  generateContentTypesXml() {
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
    xml += `<Types xmlns="${CONTENT_TYPES_NS}">`;
    for (const [extension, contentType] of this.defaults) {
      xml += `<Default Extension="${escapeXmlAttr(extension)}" ContentType="${escapeXmlAttr(contentType)}"/>`;
    }
    for (const [partName, contentType] of this.overrides) {
      xml += `<Override PartName="${escapeXmlAttr(partName)}" ContentType="${escapeXmlAttr(contentType)}"/>`;
    }
    xml += `</Types>`;
    return xml;
  }
  generateRelationshipsXml(ownerPath) {
    const ownerKey = ownerPath ? normalizePartPath(ownerPath) : "";
    const relationships = [...this.relationships.get(ownerKey)?.values() ?? []];
    return generateRelationshipsXml(relationships);
  }
};
function generateRelationshipsXml(relationships) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<Relationships xmlns="${RELATIONSHIPS_NS}">
`;
  for (const rel of relationships) {
    const targetMode = rel.targetMode ? ` TargetMode="${escapeXmlAttr(rel.targetMode)}"` : "";
    xml += `  <Relationship Id="${escapeXmlAttr(rel.id)}" Type="${escapeXmlAttr(rel.type)}" Target="${escapeXmlAttr(rel.target)}"${targetMode}/>
`;
  }
  xml += `</Relationships>`;
  return xml;
}
function getAttr(xml, attrName) {
  const match = new RegExp(`\\b${attrName}="([^"]*)"`).exec(xml);
  return match?.[1];
}
function resolveRelTarget(relsPath, target) {
  if (target.startsWith("/")) return normalizePartPath(target);
  const relsDir = relsPath.substring(0, relsPath.lastIndexOf("/") + 1);
  const parentDir = relsDir.replace(/_rels\/$/, "");
  const resolved = [];
  for (const part of `${parentDir}${target}`.split("/")) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}
function collectContentTypesDiagnostics(contentTypesXml) {
  const diagnostics = [];
  const defaults = /* @__PURE__ */ new Set();
  const overrides = /* @__PURE__ */ new Set();
  for (const match of contentTypesXml.matchAll(/<Default\b[^>]*>/g)) {
    const extension = getAttr(match[0], "Extension")?.toLowerCase();
    if (!extension) continue;
    if (defaults.has(extension)) {
      diagnostics.push(`Duplicate content type default for extension "${extension}".`);
    }
    defaults.add(extension);
  }
  for (const match of contentTypesXml.matchAll(/<Override\b[^>]*>/g)) {
    const partName = getAttr(match[0], "PartName")?.toLowerCase();
    if (!partName) continue;
    if (overrides.has(partName)) {
      diagnostics.push(`Duplicate content type override for part "${partName}".`);
    }
    overrides.add(partName);
  }
  return { diagnostics, defaults, overrides };
}
async function readText(zip, path) {
  return await zip.file(path).async("string");
}
async function assertOpcPackageInvariants(zip) {
  const packagePaths = Object.keys(zip.files).filter((path) => !zip.files[path].dir).sort();
  const packagePathSet = new Set(packagePaths);
  const diagnostics = [];
  if (!packagePathSet.has("[Content_Types].xml")) {
    diagnostics.push("Package is missing [Content_Types].xml.");
  }
  const contentTypesXml = packagePathSet.has("[Content_Types].xml") ? await readText(zip, "[Content_Types].xml") : "";
  const contentTypes = collectContentTypesDiagnostics(contentTypesXml);
  diagnostics.push(...contentTypes.diagnostics);
  for (const path of packagePaths) {
    if (path === "[Content_Types].xml") continue;
    const extension = getExtension(path);
    const hasOverride = contentTypes.overrides.has(overridePartName(path).toLowerCase());
    const hasDefault = extension ? contentTypes.defaults.has(extension) : false;
    if (!hasOverride && !hasDefault) {
      diagnostics.push(`Package part "${path}" has no content type default or override.`);
    }
  }
  const relsPaths = packagePaths.filter((path) => path.endsWith(".rels"));
  for (const relsPath of relsPaths) {
    const relsXml = await readText(zip, relsPath);
    const seenIds = /* @__PURE__ */ new Set();
    for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      const relXml = match[0];
      const relId = getAttr(relXml, "Id");
      const target = getAttr(relXml, "Target");
      const targetMode = getAttr(relXml, "TargetMode");
      if (!relId || !target) continue;
      if (seenIds.has(relId)) {
        diagnostics.push(`Duplicate relationship id "${relId}" in "${relsPath}".`);
      }
      seenIds.add(relId);
      if (targetMode === "External") continue;
      const resolvedTarget = resolveRelTarget(relsPath, target);
      if (!packagePathSet.has(resolvedTarget)) {
        diagnostics.push(`Relationship "${relId}" in "${relsPath}" points to missing target "${resolvedTarget}".`);
      }
    }
  }
  if (diagnostics.length > 0) {
    const issues = diagnostics.map((message, index) => ({
      path: `packageManifest.${index}`,
      message
    }));
    throw new PaperError(
      `PPTX package manifest invariant check failed with ${diagnostics.length} issue(s).`,
      {
        code: "STRUCTURAL_VALIDATION_FAILED",
        phase: "serialization",
        issues
      }
    );
  }
}

// src/ooxml/contentTypes.ts
var CONTENT_TYPES = {
  rels: "application/vnd.openxmlformats-package.relationships+xml",
  xml: "application/xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  tiff: "image/tiff",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  fntdata: "application/x-fontdata",
  presentation: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  slideMaster: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  slideLayout: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  theme: "application/vnd.openxmlformats-officedocument.theme+xml",
  presProps: "application/vnd.openxmlformats-officedocument.presentationml.presProps+xml",
  viewProps: "application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml",
  tableStyles: "application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml",
  coreProps: "application/vnd.openxmlformats-package.core-properties+xml",
  appProps: "application/vnd.openxmlformats-officedocument.extended-properties+xml",
  slide: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  chart: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
  chartEx: "application/vnd.ms-office.chartex+xml",
  chartDrawing: "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml",
  notesMaster: "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml",
  notesSlide: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  commentAuthors: "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml",
  comments: "application/vnd.openxmlformats-officedocument.presentationml.comments+xml",
  customProps: "application/vnd.openxmlformats-officedocument.custom-properties+xml",
  handoutMaster: "application/vnd.openxmlformats-officedocument.presentationml.handoutMaster+xml"
};
function generateContentTypes(slideCount = 1, chartCount = 0, hasNotes = false, notesSlideIndices = [], commentFileIndices, hasFontData = false, hasVideo = false, hasAudio = false, hasCustomProps = false, hasHandoutMaster = false, chartExCount = 0, chartDrawingIndices = [], hasSvg = false, layoutCount = 1, masterCount = 1) {
  const manifest = new PackageManifest();
  manifest.addDefault("rels", CONTENT_TYPES.rels);
  manifest.addDefault("xml", CONTENT_TYPES.xml);
  manifest.addDefault("png", CONTENT_TYPES.png);
  manifest.addDefault("jpg", CONTENT_TYPES.jpg);
  manifest.addDefault("jpeg", CONTENT_TYPES.jpeg);
  manifest.addDefault("gif", CONTENT_TYPES.gif);
  manifest.addDefault("webp", CONTENT_TYPES.webp);
  manifest.addDefault("tiff", CONTENT_TYPES.tiff);
  manifest.addDefault("bmp", CONTENT_TYPES.bmp);
  if (hasSvg) manifest.addDefault("svg", CONTENT_TYPES.svg);
  if (hasVideo) {
    manifest.addDefault("mp4", CONTENT_TYPES.mp4);
    manifest.addDefault("webm", CONTENT_TYPES.webm);
    manifest.addDefault("avi", CONTENT_TYPES.avi);
    manifest.addDefault("mov", CONTENT_TYPES.mov);
    manifest.addDefault("wmv", CONTENT_TYPES.wmv);
  }
  if (hasAudio) {
    manifest.addDefault("mp3", CONTENT_TYPES.mp3);
    manifest.addDefault("wav", CONTENT_TYPES.wav);
    manifest.addDefault("ogg", CONTENT_TYPES.ogg);
    manifest.addDefault("m4a", CONTENT_TYPES.m4a);
    manifest.addDefault("wma", CONTENT_TYPES.wma);
  }
  if (chartCount > 0 || chartExCount > 0) {
    manifest.addDefault("xlsx", CONTENT_TYPES.xlsx);
  }
  manifest.addPart("ppt/presentation.xml", CONTENT_TYPES.presentation);
  for (let i = 1; i <= masterCount; i++) {
    manifest.addPart(`ppt/slideMasters/slideMaster${i}.xml`, CONTENT_TYPES.slideMaster);
  }
  for (let i = 1; i <= layoutCount; i++) {
    manifest.addPart(`ppt/slideLayouts/slideLayout${i}.xml`, CONTENT_TYPES.slideLayout);
  }
  manifest.addPart("ppt/theme/theme1.xml", CONTENT_TYPES.theme);
  manifest.addPart("ppt/presProps.xml", CONTENT_TYPES.presProps);
  manifest.addPart("ppt/viewProps.xml", CONTENT_TYPES.viewProps);
  manifest.addPart("ppt/tableStyles.xml", CONTENT_TYPES.tableStyles);
  manifest.addPart("docProps/core.xml", CONTENT_TYPES.coreProps);
  manifest.addPart("docProps/app.xml", CONTENT_TYPES.appProps);
  for (let i = 1; i <= slideCount; i++) {
    manifest.addPart(`ppt/slides/slide${i}.xml`, CONTENT_TYPES.slide);
  }
  for (let i = 1; i <= chartCount; i++) {
    manifest.addPart(`ppt/charts/chart${i}.xml`, CONTENT_TYPES.chart);
  }
  for (let i = 1; i <= chartExCount; i++) {
    manifest.addPart(`ppt/charts/chartEx${i}.xml`, CONTENT_TYPES.chartEx);
  }
  for (const idx of chartDrawingIndices) {
    manifest.addPart(`ppt/drawings/drawing${idx}.xml`, CONTENT_TYPES.chartDrawing);
  }
  if (hasNotes) {
    manifest.addPart("ppt/theme/theme2.xml", CONTENT_TYPES.theme);
    manifest.addPart("ppt/notesMasters/notesMaster1.xml", CONTENT_TYPES.notesMaster);
    for (const idx of notesSlideIndices) {
      manifest.addPart(`ppt/notesSlides/notesSlide${idx + 1}.xml`, CONTENT_TYPES.notesSlide);
    }
  }
  if (commentFileIndices && commentFileIndices.length > 0) {
    manifest.addPart("ppt/commentAuthors.xml", CONTENT_TYPES.commentAuthors);
    for (const idx of commentFileIndices) {
      manifest.addPart(`ppt/comments/comment${idx}.xml`, CONTENT_TYPES.comments);
    }
  }
  if (hasFontData) {
    manifest.addDefault("fntdata", CONTENT_TYPES.fntdata);
  }
  if (hasCustomProps) {
    manifest.addPart("docProps/custom.xml", CONTENT_TYPES.customProps);
  }
  if (hasHandoutMaster) {
    manifest.addPart("ppt/handoutMasters/handoutMaster1.xml", CONTENT_TYPES.handoutMaster);
  }
  return manifest.generateContentTypesXml();
}

// src/ooxml/rIdCalc.ts
function computePresSlideRId(masterCount, slideIndex) {
  return masterCount + 1 + slideIndex;
}
function computePresNotesMasterRId(masterCount, slideCount) {
  return masterCount + slideCount + 5;
}
function computePresCommentsRId(masterCount, slideCount, hasNotes) {
  return masterCount + slideCount + 5 + (hasNotes ? 1 : 0);
}
function computePresHandoutMasterRId(masterCount, slideCount, hasNotes, hasComments) {
  return masterCount + slideCount + 5 + (hasNotes ? 1 : 0) + (hasComments ? 1 : 0);
}
function countVideoAudioRIds(videoAssets, audioCount) {
  let count = 0;
  for (const v of videoAssets) {
    if (v.webVideo) {
      count += 1;
      if (v.posterRId) count += 1;
    } else {
      count += 2;
      if (v.posterRId) count += 1;
    }
  }
  count += audioCount * 2;
  return count;
}
function computeChartStartRId(imageCount, fillCount, videoAudioRIdCount, svgCount = 0) {
  return 2 + imageCount + fillCount + videoAudioRIdCount + svgCount;
}

// src/ooxml/relationships.ts
var REL_TYPES = {
  officeDocument: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  coreProperties: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
  extendedProperties: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
  thumbnail: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail",
  customProperties: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties",
  slideMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  presProps: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",
  viewProps: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",
  tableStyles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",
  notesMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
  commentAuthors: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
  handoutMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster"
};
function generateGlobalRels(includeDocProps = false, includeCustomProps = false) {
  const rels = [
    { id: "rId1", type: REL_TYPES.officeDocument, target: "ppt/presentation.xml" }
  ];
  if (includeDocProps) {
    rels.push(
      { id: "rId2", type: REL_TYPES.coreProperties, target: "docProps/core.xml" },
      { id: "rId3", type: REL_TYPES.extendedProperties, target: "docProps/app.xml" },
      { id: "rId5", type: REL_TYPES.thumbnail, target: "docProps/thumbnail.jpeg" }
    );
  }
  if (includeCustomProps) {
    rels.push({ id: "rId4", type: REL_TYPES.customProperties, target: "docProps/custom.xml" });
  }
  return generateRelationshipsXml(rels);
}
function generatePresentationRels(slideCount = 1, hasNotes = false, hasComments = false, extraRels, hasHandoutMaster = false) {
  const rels = [
    { id: "rId1", type: REL_TYPES.slideMaster, target: "slideMasters/slideMaster1.xml" },
    { id: "rId2", type: REL_TYPES.theme, target: "theme/theme1.xml" }
  ];
  for (let i = 1; i <= slideCount; i++) {
    const rId = computePresSlideRId(1, i);
    rels.push({ id: `rId${rId}`, type: REL_TYPES.slide, target: `slides/slide${i}.xml` });
  }
  let nextRId = computePresSlideRId(1, slideCount) + 1;
  rels.push(
    { id: `rId${nextRId++}`, type: REL_TYPES.presProps, target: "presProps.xml" },
    { id: `rId${nextRId++}`, type: REL_TYPES.viewProps, target: "viewProps.xml" },
    { id: `rId${nextRId++}`, type: REL_TYPES.tableStyles, target: "tableStyles.xml" }
  );
  if (hasNotes) {
    const notesRId = computePresNotesMasterRId(1, slideCount);
    rels.push({ id: `rId${notesRId}`, type: REL_TYPES.notesMaster, target: "notesMasters/notesMaster1.xml" });
    nextRId = notesRId + 1;
  }
  if (hasComments) {
    const commentsRId = computePresCommentsRId(1, slideCount, hasNotes);
    rels.push({ id: `rId${commentsRId}`, type: REL_TYPES.commentAuthors, target: "commentAuthors.xml" });
    nextRId = commentsRId + 1;
  }
  if (hasHandoutMaster) {
    const handoutRId = computePresHandoutMasterRId(1, slideCount, hasNotes, hasComments);
    rels.push({ id: `rId${handoutRId}`, type: REL_TYPES.handoutMaster, target: "handoutMasters/handoutMaster1.xml" });
    nextRId = handoutRId + 1;
  }
  if (extraRels) {
    for (const rel of extraRels) {
      rels.push({ id: rel.rId, type: rel.type, target: rel.target });
      nextRId++;
    }
  }
  return generateRelationshipsXml(rels);
}

// src/ooxml/presentation.ts
function createSectionIdGenerator() {
  let counter = 0;
  return () => {
    const id = (counter++).toString(16).padStart(8, "0");
    return `00000000-0000-0000-0000-${id.padStart(12, "0")}`;
  };
}
function generatePresentationXml(slideCount, slideSize, options) {
  const generateSectionId = createSectionIdGenerator();
  const masterCount = Math.max(1, Math.floor(options?.masterCount ?? 1));
  const widthEmu = slideSize ? Math.round(slideSize.width * PIXEL_TO_EMU) : SLIDE_WIDTH_EMU;
  const heightEmu = slideSize ? Math.round(slideSize.height * PIXEL_TO_EMU) : SLIDE_HEIGHT_EMU;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
`;
  xml += `  <p:sldMasterIdLst>
`;
  for (let i = 0; i < masterCount; i += 1) {
    xml += `    <p:sldMasterId id="${2147483648 + i * 12}" r:id="rId${i + 1}"/>
`;
  }
  xml += `  </p:sldMasterIdLst>
`;
  if (options?.hasNotes && options.notesMasterRId) {
    xml += `  <p:notesMasterIdLst>
`;
    xml += `    <p:notesMasterId r:id="${options.notesMasterRId}"/>
`;
    xml += `  </p:notesMasterIdLst>
`;
  }
  if (options?.hasHandoutMaster) {
    const handoutRId = computePresHandoutMasterRId(
      masterCount,
      slideCount,
      !!options?.hasNotes,
      !!options?.hasComments
    );
    xml += `  <p:handoutMasterIdLst>
`;
    xml += `    <p:handoutMasterId r:id="rId${handoutRId}"/>
`;
    xml += `  </p:handoutMasterIdLst>
`;
  }
  xml += `  <p:sldIdLst>
`;
  for (let i = 1; i <= slideCount; i++) {
    const slideId = SLIDE_ID_BASE + i;
    const rId = computePresSlideRId(masterCount, i);
    xml += `    <p:sldId id="${slideId}" r:id="rId${rId}"/>
`;
  }
  xml += `  </p:sldIdLst>
`;
  xml += `  <p:sldSz cx="${widthEmu}" cy="${heightEmu}" type="custom"/>
`;
  const notesCx = options?.notesSize ? Math.round(options.notesSize.width * PIXEL_TO_EMU) : 6858e3;
  const notesCy = options?.notesSize ? Math.round(options.notesSize.height * PIXEL_TO_EMU) : 9144e3;
  xml += `  <p:notesSz cx="${notesCx}" cy="${notesCy}"/>
`;
  if (options?.embeddedFontListXml) {
    xml += options.embeddedFontListXml;
  }
  if (options?.customShows && options.customShows.length > 0) {
    xml += `  <p:custShowLst>
`;
    for (let i = 0; i < options.customShows.length; i++) {
      const show = options.customShows[i];
      xml += `    <p:custShow name="${escapeXmlAttr(show.name)}" id="${i}">
`;
      xml += `      <p:sldLst>
`;
      for (const idx of show.slideIndices) {
        const rId = computePresSlideRId(masterCount, idx + 1);
        xml += `        <p:sld r:id="rId${rId}"/>
`;
      }
      xml += `      </p:sldLst>
`;
      xml += `    </p:custShow>
`;
    }
    xml += `  </p:custShowLst>
`;
  }
  xml += `  <p:defaultTextStyle>
`;
  xml += `    <a:defPPr>
`;
  xml += `      <a:defRPr lang="en-US"/>
`;
  xml += `    </a:defPPr>
`;
  const levels = [
    { tag: "a:lvl1pPr", marL: "0", sz: "1800" },
    { tag: "a:lvl2pPr", marL: "457200", sz: "1600" },
    { tag: "a:lvl3pPr", marL: "914400", sz: "1400" },
    { tag: "a:lvl4pPr", marL: "1371600", sz: "1200" },
    { tag: "a:lvl5pPr", marL: "1828800", sz: "1000" }
  ];
  for (const lvl of levels) {
    xml += `    <${lvl.tag} marL="${lvl.marL}" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
`;
    xml += `      <a:defRPr sz="${lvl.sz}" kern="1200">
`;
    xml += `        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
`;
    xml += `        <a:latin typeface="+mn-lt"/>
`;
    xml += `        <a:ea typeface="+mn-ea"/>
`;
    xml += `        <a:cs typeface="+mn-cs"/>
`;
    xml += `      </a:defRPr>
`;
    xml += `    </${lvl.tag}>
`;
  }
  xml += `  </p:defaultTextStyle>
`;
  if (options?.protection) {
    const prot = options.protection;
    if (prot.readOnly) {
      xml += `  <p:modifyVerifier cryptProviderType="rsaAES" cryptAlgorithmClass="hash" cryptAlgorithmType="typeAny" cryptAlgorithmSid="14" spinCount="100000"`;
      if (prot.modifyPassword) {
        xml += ` hashData="${escapeXmlAttr(prot.modifyPassword)}"`;
      }
      xml += `/>
`;
    }
  }
  if (options?.sections && options.sections.length > 0) {
    xml += `  <p:extLst>
`;
    xml += `    <p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}">
`;
    xml += `      <p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
`;
    for (const section of options.sections) {
      xml += `        <p14:section name="${escapeXmlAttr(section.name)}" id="{${generateSectionId()}}">
`;
      xml += `          <p14:sldIdLst>
`;
      for (const slideIdx of section.slideIndices) {
        xml += `            <p14:sldId id="${SLIDE_ID_BASE + 1 + slideIdx}"/>
`;
      }
      xml += `          </p14:sldIdLst>
`;
      xml += `        </p14:section>
`;
    }
    xml += `      </p14:sectionLst>
`;
    xml += `    </p:ext>
`;
    xml += `  </p:extLst>
`;
  }
  xml += `</p:presentation>`;
  return xml;
}

// src/ooxml/deterministicIds.ts
import { createHash as createHash2, randomUUID } from "node:crypto";
function formatGuid(hex) {
  const chars = hex.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = (parseInt(chars[16] ?? "0", 16) & 3 | 8).toString(16);
  return [
    chars.slice(0, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
    chars.slice(16, 20).join(""),
    chars.slice(20, 32).join("")
  ].join("-").toUpperCase();
}
function createOoxmlGuid(scope) {
  if (!isDeterministicMode()) {
    return randomUUID().toUpperCase();
  }
  const hash = createHash2("sha256").update("paperjsx:pptx:ooxml-guid:").update(scope).digest("hex");
  return formatGuid(hash);
}

// src/ooxml/slide.ts
function emitBackgroundXml(bg, bgImageRId) {
  if (!bg) return "";
  let xml = `  <p:bg>
    <p:bgPr>
`;
  if (bg.type === "solid") {
    xml += `      <a:solidFill>${emitColorXml(bg.color)}</a:solidFill>
`;
  } else if (bg.type === "gradient") {
    xml += `      <a:gradFill>
`;
    xml += `        <a:gsLst>
`;
    for (const stop of bg.stops) {
      const pos = Math.min(1e5, Math.max(0, Math.round(stop.position * 1e3)));
      xml += `          <a:gs pos="${pos}">${emitColorXml(stop.color)}</a:gs>
`;
    }
    xml += `        </a:gsLst>
`;
    const ang = cssAngleToOoxml(bg.angle ?? 180);
    xml += `        <a:lin ang="${ang}" scaled="1"/>
`;
    xml += `      </a:gradFill>
`;
  } else if (bg.type === "pattern") {
    xml += `      <a:pattFill prst="${escapeXmlAttr(bg.pattern)}">
`;
    xml += `        <a:fgClr>${emitColorXml(bg.foreground)}</a:fgClr>
`;
    xml += `        <a:bgClr>${emitColorXml(bg.background)}</a:bgClr>
`;
    xml += `      </a:pattFill>
`;
  } else if (bg.type === "image" && bgImageRId) {
    xml += `      <a:blipFill>
`;
    xml += `        <a:blip r:embed="${bgImageRId}"/>
`;
    if (bg.tile) {
      xml += `        <a:tile tx="0" ty="0" sx="100000" sy="100000"/>
`;
    } else {
      xml += `        <a:stretch><a:fillRect/></a:stretch>
`;
    }
    xml += `      </a:blipFill>
`;
  }
  xml += `      <a:effectLst/>
`;
  xml += `    </p:bgPr>
  </p:bg>
`;
  return xml;
}
var HF_BOTTOM_MARGIN_RATIO = 11112 / SLIDE_HEIGHT_EMU;
var HF_HEIGHT = 365125;
var SLDNUM_X_RATIO = 8229600 / SLIDE_WIDTH_EMU;
var SLDNUM_CX_RATIO = 914400 / SLIDE_WIDTH_EMU;
var FOOTER_X_RATIO = 3028950 / SLIDE_WIDTH_EMU;
var FOOTER_CX_RATIO = 3086100 / SLIDE_WIDTH_EMU;
var DT_X_RATIO = 457200 / SLIDE_WIDTH_EMU;
var DT_CX_RATIO = 2133600 / SLIDE_WIDTH_EMU;
function emitHeaderFooterShapes(hf, slideWidthEmu, slideHeightEmu, fieldIdScope = "slide") {
  if (!hf) return "";
  const w = slideWidthEmu ?? SLIDE_WIDTH_EMU;
  const h = slideHeightEmu ?? SLIDE_HEIGHT_EMU;
  const y = Math.round(h - HF_HEIGHT - h * HF_BOTTOM_MARGIN_RATIO);
  let xml = "";
  let shapeId = 1e3;
  if (hf.slideNumber) {
    xml += `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId++}" name="Slide Number Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="sldNum" sz="quarter" idx="12"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(w * SLDNUM_X_RATIO)}" y="${y}"/>
      <a:ext cx="${Math.round(w * SLDNUM_CX_RATIO)}" cy="${HF_HEIGHT}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:fld id="{${createOoxmlGuid(`${fieldIdScope}:header-footer:slide-number`)}}" type="slidenum">
        <a:rPr lang="en-US" dirty="0"/>
        <a:t>&lt;#&gt;</a:t>
      </a:fld>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>
`;
  }
  if (hf.footer) {
    xml += `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId++}" name="Footer Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="ftr" sz="quarter" idx="11"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(w * FOOTER_X_RATIO)}" y="${y}"/>
      <a:ext cx="${Math.round(w * FOOTER_CX_RATIO)}" cy="${HF_HEIGHT}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr lang="en-US" dirty="0"/>
        <a:t>${escapeXml(hf.footer)}</a:t>
      </a:r>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>
`;
  }
  if (hf.dateTime) {
    xml += `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId++}" name="Date Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="dt" sz="half" idx="10"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(w * DT_X_RATIO)}" y="${y}"/>
      <a:ext cx="${Math.round(w * DT_CX_RATIO)}" cy="${HF_HEIGHT}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:fld id="{${createOoxmlGuid(`${fieldIdScope}:header-footer:date-time`)}}" type="datetime1">
        <a:rPr lang="en-US" dirty="0"/>
        <a:t></a:t>
      </a:fld>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>
`;
  }
  return xml;
}
function generateSlideShell(innerSpTree, transitionXml = "", timingXml = "", background, headerFooter, bgImageRId, slideWidthEmu, slideHeightEmu, fieldIdScope = "slide") {
  const bgXml = emitBackgroundXml(background, bgImageRId);
  const hfXml = emitHeaderFooterShapes(headerFooter, slideWidthEmu, slideHeightEmu, fieldIdScope);
  const extraXml = `${transitionXml}${timingXml}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" showMasterSp="0">
  <p:cSld>
${bgXml}    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      ${innerSpTree}${hfXml}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
${extraXml}</p:sld>`;
}
function generateSlideMasterMulti(layoutRIds, layoutBaseId = 2147483649, background) {
  const bgXml = emitBackgroundXml(background);
  let layoutListXml = "";
  for (let i = 0; i < layoutRIds.length; i++) {
    layoutListXml += `    <p:sldLayoutId id="${layoutBaseId + i}" r:id="${layoutRIds[i]}"/>
`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${bgXml}    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${layoutListXml}  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr marL="228600" indent="-228600" algn="l"><a:defRPr sz="2400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;
}
function generateSlideLayoutMulti(name = "Blank") {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1" showMasterSp="0">
  <p:cSld name="${escapeXmlAttr(name)}">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`;
}
function generateSlideMaster(layoutCount = 1) {
  let layoutListXml = "";
  for (let i = 0; i < layoutCount; i++) {
    layoutListXml += `    <p:sldLayoutId id="${2147483649 + i}" r:id="rId${i + 1}"/>
`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${layoutListXml}  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPct val="0"/></a:spcBef>
        <a:defRPr sz="4400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mj-lt"/>
          <a:ea typeface="+mj-ea"/>
          <a:cs typeface="+mj-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr marL="228600" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="1000"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="2400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
      <a:lvl2pPr marL="685800" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2013;"/>
        <a:defRPr sz="2000" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl2pPr>
      <a:lvl3pPr marL="1143000" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl3pPr>
      <a:lvl4pPr marL="1600200" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2013;"/>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl4pPr>
      <a:lvl5pPr marL="2057400" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="1600" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl5pPr>
    </p:bodyStyle>
    <p:otherStyle>
      <a:lvl1pPr>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;
}
var NOTES_MASTER_CREATION_ID = "758698067";
var NOTES_SLIDE_CREATION_ID = "3730747076";
var NOTES_DATE_PLACEHOLDER_TEXT = "1/1/00";
function generateNotesSlide(notes, slideNumber) {
  let notesBodyXml;
  const hyperlinkRels = [];
  if (typeof notes === "string") {
    notesBodyXml = `          <a:p>
            <a:r>
              <a:rPr lang="en-US" dirty="0"/>
              <a:t>${escapeXml(notes)}</a:t>
            </a:r>
            <a:endParaRPr lang="en-US" dirty="0"/>
          </a:p>`;
  } else {
    const hyperlinkRIdCounter = { current: 100 };
    notesBodyXml = emitParagraphsXml(notes, void 0, hyperlinkRels, hyperlinkRIdCounter);
  }
  const slideNumberFieldId = createOoxmlGuid(`notes-slide:${slideNumber}:slide-number`);
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Slide Image Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldImg"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Notes Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
${notesBodyXml}
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="5"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:fld id="{${slideNumberFieldId}}" type="slidenum">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>${escapeXml(String(slideNumber))}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
    <p:extLst>
      <p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}">
        <p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="${NOTES_SLIDE_CREATION_ID}"/>
      </p:ext>
    </p:extLst>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:notes>`;
  return { xml, hyperlinkRels };
}
function generateNotesMaster() {
  const dateFieldId = createOoxmlGuid("notes-master:date");
  const slideNumberFieldId = createOoxmlGuid("notes-master:slide-number");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Header Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="hdr" sz="quarter"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle><a:lvl1pPr algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Date Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="dt" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle><a:lvl1pPr algn="r"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p>
            <a:fld id="{${dateFieldId}}" type="datetimeFigureOut">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>${NOTES_DATE_PLACEHOLDER_TEXT}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Image Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="1143000"/>
            <a:ext cx="5486400" cy="3086100"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln w="12700"><a:solidFill><a:prstClr val="black"/></a:solidFill></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Notes Placeholder 4"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="4400550"/>
            <a:ext cx="5486400" cy="3600450"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"/><a:t>Click to edit Master text styles</a:t></a:r></a:p>
          <a:p><a:pPr lvl="1"/><a:r><a:rPr lang="en-US"/><a:t>Second level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="2"/><a:r><a:rPr lang="en-US"/><a:t>Third level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="3"/><a:r><a:rPr lang="en-US"/><a:t>Fourth level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="4"/><a:r><a:rPr lang="en-US"/><a:t>Fifth level</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="6" name="Footer Placeholder 5"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ftr" sz="quarter" idx="4"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle><a:lvl1pPr algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="7" name="Slide Number Placeholder 6"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="5"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle><a:lvl1pPr algn="r"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p>
            <a:fld id="{${slideNumberFieldId}}" type="slidenum">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>\u2039#\u203A</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
    <p:extLst>
      <p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}">
        <p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="${NOTES_MASTER_CREATION_ID}"/>
      </p:ext>
    </p:extLst>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:notesStyle>
    <a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl1pPr>
    <a:lvl2pPr marL="457200" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl2pPr>
    <a:lvl3pPr marL="914400" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl3pPr>
    <a:lvl4pPr marL="1371600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl4pPr>
    <a:lvl5pPr marL="1828800" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl5pPr>
    <a:lvl6pPr marL="2286000" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl6pPr>
    <a:lvl7pPr marL="2743200" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl7pPr>
    <a:lvl8pPr marL="3200400" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl8pPr>
    <a:lvl9pPr marL="3657600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl9pPr>
  </p:notesStyle>
</p:notesMaster>`;
}

// src/ooxml/slideRelationships.ts
var REL_TYPES2 = {
  slideLayout: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  video: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
  media: "http://schemas.microsoft.com/office/2007/relationships/media",
  audio: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  chartEx: "http://schemas.microsoft.com/office/2014/relationships/chartEx",
  chart: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  notesSlide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  comments: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  notesMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
  slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  slideMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"
};
function parseRIdValue(rId) {
  if (!rId) return null;
  const match = /^rId(\d+)$/.exec(rId);
  return match ? parseInt(match[1], 10) : null;
}
function generateSlideRels(mediaRels = [], hyperlinkRels = [], chartRels = [], notesSlideIndex, layoutTarget = "../slideLayouts/slideLayout1.xml", commentFileIndex, videoRels = [], audioRels = [], svgRels = []) {
  const relationships = [
    { id: "rId1", type: REL_TYPES2.slideLayout, target: layoutTarget }
  ];
  let maxRId = 1;
  for (const rel of mediaRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of hyperlinkRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of chartRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of videoRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.videoRId) ?? maxRId);
    maxRId = Math.max(maxRId, parseRIdValue(rel.mediaRId) ?? maxRId);
    maxRId = Math.max(maxRId, parseRIdValue(rel.posterRId) ?? maxRId);
  }
  for (const rel of audioRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.audioRId) ?? maxRId);
    maxRId = Math.max(maxRId, parseRIdValue(rel.mediaRId) ?? maxRId);
  }
  for (const rel of svgRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of mediaRels) {
    relationships.push({ id: rel.rId, type: REL_TYPES2.image, target: rel.target });
  }
  for (const rel of videoRels) {
    if (rel.videoRId) {
      relationships.push({ id: rel.videoRId, type: REL_TYPES2.video, target: rel.videoTarget });
    }
    if (rel.mediaRId) {
      relationships.push({ id: rel.mediaRId, type: REL_TYPES2.media, target: rel.videoTarget });
    }
    if (rel.posterRId && rel.posterTarget) {
      relationships.push({ id: rel.posterRId, type: REL_TYPES2.image, target: rel.posterTarget });
    }
  }
  for (const rel of audioRels) {
    relationships.push(
      { id: rel.audioRId, type: REL_TYPES2.audio, target: rel.audioTarget },
      { id: rel.mediaRId, type: REL_TYPES2.media, target: rel.audioTarget }
    );
  }
  for (const rel of svgRels) {
    relationships.push({ id: rel.rId, type: REL_TYPES2.image, target: rel.target });
  }
  for (const rel of hyperlinkRels) {
    const isExternal = rel.external !== false;
    relationships.push({
      id: rel.rId,
      type: REL_TYPES2.hyperlink,
      target: rel.url,
      targetMode: isExternal ? "External" : void 0
    });
  }
  for (const rel of chartRels) {
    if (rel.type === "chartEx") {
      relationships.push({ id: rel.rId, type: REL_TYPES2.chartEx, target: rel.target });
    } else {
      relationships.push({ id: rel.rId, type: REL_TYPES2.chart, target: rel.target });
    }
  }
  if (notesSlideIndex !== void 0) {
    const notesRId = maxRId + 1;
    relationships.push({ id: `rId${notesRId}`, type: REL_TYPES2.notesSlide, target: `../notesSlides/notesSlide${notesSlideIndex}.xml` });
    maxRId = notesRId;
  }
  if (commentFileIndex !== void 0) {
    const commentRId = maxRId + 1;
    relationships.push({ id: `rId${commentRId}`, type: REL_TYPES2.comments, target: `../comments/comment${commentFileIndex}.xml` });
  }
  return generateRelationshipsXml(relationships);
}
function generateNotesSlideRels(slideIndex, notesHyperlinkRels = []) {
  const relationships = [
    { id: "rId1", type: REL_TYPES2.notesMaster, target: "../notesMasters/notesMaster1.xml" },
    { id: "rId2", type: REL_TYPES2.slide, target: `../slides/slide${slideIndex}.xml` }
  ];
  for (const rel of notesHyperlinkRels) {
    relationships.push({
      id: rel.rId,
      type: REL_TYPES2.hyperlink,
      target: rel.url,
      targetMode: "External"
    });
  }
  return generateRelationshipsXml(relationships);
}
function generateNotesMasterRels(themeTarget = "../theme/theme2.xml") {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES2.theme, target: themeTarget }
  ]);
}
function generateSlideMasterRels(layoutCount = 1) {
  const relationships = [];
  for (let i = 1; i <= layoutCount; i++) {
    relationships.push({ id: `rId${i}`, type: REL_TYPES2.slideLayout, target: `../slideLayouts/slideLayout${i}.xml` });
  }
  relationships.push({ id: `rId${layoutCount + 1}`, type: REL_TYPES2.theme, target: "../theme/theme1.xml" });
  return generateRelationshipsXml(relationships);
}
function generateSlideLayoutRels(masterTarget = "../slideMasters/slideMaster1.xml") {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES2.slideMaster, target: masterTarget }
  ]);
}

// src/ooxml/theme.ts
var DEFAULT_COLORS = {
  dk2: "44546A",
  lt2: "E7E6E6",
  accent1: "4472C4",
  accent2: "ED7D31",
  accent3: "A9D18E",
  accent4: "FFC000",
  accent5: "5B9BD5",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72"
};
function stripHash(hex) {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}
function emitColorSlot(slot, override) {
  if (override) {
    return `<a:${slot}><a:srgbClr val="${stripHash(override).toUpperCase()}"/></a:${slot}>`;
  }
  if (slot === "dk1") {
    return `<a:dk1><a:sysClr lastClr="000000" val="windowText"/></a:dk1>`;
  }
  if (slot === "lt1") {
    return `<a:lt1><a:sysClr lastClr="FFFFFF" val="window"/></a:lt1>`;
  }
  const defaultVal = DEFAULT_COLORS[slot];
  return `<a:${slot}><a:srgbClr val="${defaultVal}"/></a:${slot}>`;
}
function generateTheme(themeConfig) {
  const themeName = themeConfig?.name ?? "Office Theme";
  const cs = themeConfig?.colorScheme;
  const fs = themeConfig?.fontScheme;
  const colorSlots = [
    "dk1",
    "lt1",
    "dk2",
    "lt2",
    "accent1",
    "accent2",
    "accent3",
    "accent4",
    "accent5",
    "accent6",
    "hlink",
    "folHlink"
  ];
  const colorSchemeXml = colorSlots.map((slot) => emitColorSlot(slot, cs?.[slot])).join("\n      ");
  const majorLatinXml = fs?.majorLatin ? `<a:latin typeface="${escapeXml(fs.majorLatin)}"/>` : `<a:latin typeface="Carlito"/>`;
  const majorEaXml = fs?.majorEa ? `<a:ea typeface="${escapeXml(fs.majorEa)}"/>` : `<a:ea typeface=""/>`;
  const minorLatinXml = fs?.minorLatin ? `<a:latin typeface="${escapeXml(fs.minorLatin)}"/>` : `<a:latin typeface="Carlito"/>`;
  const minorEaXml = fs?.minorEa ? `<a:ea typeface="${escapeXml(fs.minorEa)}"/>` : `<a:ea typeface=""/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(themeName)}">
  <a:themeElements>
    <a:clrScheme name="${escapeXml(themeName)}">
      ${colorSchemeXml}
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        ${majorLatinXml}
        ${majorEaXml}
        <a:cs typeface=""/>
        <!-- Batch E will replace these script slots once matching assets are admitted. -->
        <a:font script="Jpan" typeface="Yu Gothic Light"/>
        <a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/>
        <a:font script="Hans" typeface="DengXian Light"/>
        <a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/>
        <a:font script="Arab" typeface="Times New Roman"/>
        <a:font script="Hebr" typeface="Times New Roman"/>
        <a:font script="Thai" typeface="Angsana New"/>
        <a:font script="Deva" typeface="Mangal"/>
      </a:majorFont>
      <a:minorFont>
        ${minorLatinXml}
        ${minorEaXml}
        <a:cs typeface=""/>
        <!-- Batch E will replace these script slots once matching assets are admitted. -->
        <a:font script="Jpan" typeface="Yu Gothic"/>
        <a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/>
        <a:font script="Hans" typeface="DengXian"/>
        <a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/>
        <a:font script="Arab" typeface="Arial"/>
        <a:font script="Hebr" typeface="Arial"/>
        <a:font script="Thai" typeface="Cordia New"/>
        <a:font script="Deva" typeface="Mangal"/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:lumMod val="102000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;
}
function generateNotesTheme() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0E2841"/></a:dk2><a:lt2><a:srgbClr val="E8E8E8"/></a:lt2><a:accent1><a:srgbClr val="156082"/></a:accent1><a:accent2><a:srgbClr val="E97132"/></a:accent2><a:accent3><a:srgbClr val="196B24"/></a:accent3><a:accent4><a:srgbClr val="0F9ED5"/></a:accent4><a:accent5><a:srgbClr val="A02B93"/></a:accent5><a:accent6><a:srgbClr val="4EA72E"/></a:accent6><a:hlink><a:srgbClr val="467886"/></a:hlink><a:folHlink><a:srgbClr val="96607D"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Carlito"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Jpan" typeface="\u6E38\u30B4\u30B7\u30C3\u30AF Light"/><a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/><a:font script="Hans" typeface="\u7B49\u7EBF Light"/><a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/><a:font script="Arab" typeface="Times New Roman"/><a:font script="Hebr" typeface="Times New Roman"/><a:font script="Thai" typeface="Angsana New"/><a:font script="Ethi" typeface="Nyala"/><a:font script="Beng" typeface="Vrinda"/><a:font script="Gujr" typeface="Shruti"/><a:font script="Khmr" typeface="MoolBoran"/><a:font script="Knda" typeface="Tunga"/><a:font script="Guru" typeface="Raavi"/><a:font script="Cans" typeface="Euphemia"/><a:font script="Cher" typeface="Plantagenet Cherokee"/><a:font script="Yiii" typeface="Microsoft Yi Baiti"/><a:font script="Tibt" typeface="Microsoft Himalaya"/><a:font script="Thaa" typeface="MV Boli"/><a:font script="Deva" typeface="Mangal"/><a:font script="Telu" typeface="Gautami"/><a:font script="Taml" typeface="Latha"/><a:font script="Syrc" typeface="Estrangelo Edessa"/><a:font script="Orya" typeface="Kalinga"/><a:font script="Mlym" typeface="Kartika"/><a:font script="Laoo" typeface="DokChampa"/><a:font script="Sinh" typeface="Iskoola Pota"/><a:font script="Mong" typeface="Mongolian Baiti"/><a:font script="Viet" typeface="Times New Roman"/><a:font script="Uigh" typeface="Microsoft Uighur"/><a:font script="Geor" typeface="Sylfaen"/><a:font script="Armn" typeface="Arial"/><a:font script="Bugi" typeface="Leelawadee UI"/><a:font script="Bopo" typeface="Microsoft JhengHei"/><a:font script="Java" typeface="Javanese Text"/><a:font script="Lisu" typeface="Segoe UI"/><a:font script="Mymr" typeface="Myanmar Text"/><a:font script="Nkoo" typeface="Ebrima"/><a:font script="Olck" typeface="Nirmala UI"/><a:font script="Osma" typeface="Ebrima"/><a:font script="Phag" typeface="Phagspa"/><a:font script="Syrn" typeface="Estrangelo Edessa"/><a:font script="Syrj" typeface="Estrangelo Edessa"/><a:font script="Syre" typeface="Estrangelo Edessa"/><a:font script="Sora" typeface="Nirmala UI"/><a:font script="Tale" typeface="Microsoft Tai Le"/><a:font script="Talu" typeface="Microsoft New Tai Lue"/><a:font script="Tfng" typeface="Ebrima"/></a:majorFont><a:minorFont><a:latin typeface="Carlito"/><a:ea typeface=""/><a:cs typeface=""/><a:font script="Jpan" typeface="\u6E38\u30B4\u30B7\u30C3\u30AF"/><a:font script="Hang" typeface="\uB9D1\uC740 \uACE0\uB515"/><a:font script="Hans" typeface="\u7B49\u7EBF"/><a:font script="Hant" typeface="\u65B0\u7D30\u660E\u9AD4"/><a:font script="Arab" typeface="Arial"/><a:font script="Hebr" typeface="Arial"/><a:font script="Thai" typeface="Cordia New"/><a:font script="Ethi" typeface="Nyala"/><a:font script="Beng" typeface="Vrinda"/><a:font script="Gujr" typeface="Shruti"/><a:font script="Khmr" typeface="DaunPenh"/><a:font script="Knda" typeface="Tunga"/><a:font script="Guru" typeface="Raavi"/><a:font script="Cans" typeface="Euphemia"/><a:font script="Cher" typeface="Plantagenet Cherokee"/><a:font script="Yiii" typeface="Microsoft Yi Baiti"/><a:font script="Tibt" typeface="Microsoft Himalaya"/><a:font script="Thaa" typeface="MV Boli"/><a:font script="Deva" typeface="Mangal"/><a:font script="Telu" typeface="Gautami"/><a:font script="Taml" typeface="Latha"/><a:font script="Syrc" typeface="Estrangelo Edessa"/><a:font script="Orya" typeface="Kalinga"/><a:font script="Mlym" typeface="Kartika"/><a:font script="Laoo" typeface="DokChampa"/><a:font script="Sinh" typeface="Iskoola Pota"/><a:font script="Mong" typeface="Mongolian Baiti"/><a:font script="Viet" typeface="Arial"/><a:font script="Uigh" typeface="Microsoft Uighur"/><a:font script="Geor" typeface="Sylfaen"/><a:font script="Armn" typeface="Arial"/><a:font script="Bugi" typeface="Leelawadee UI"/><a:font script="Bopo" typeface="Microsoft JhengHei"/><a:font script="Java" typeface="Javanese Text"/><a:font script="Lisu" typeface="Segoe UI"/><a:font script="Mymr" typeface="Myanmar Text"/><a:font script="Nkoo" typeface="Ebrima"/><a:font script="Olck" typeface="Nirmala UI"/><a:font script="Osma" typeface="Ebrima"/><a:font script="Phag" typeface="Phagspa"/><a:font script="Syrn" typeface="Estrangelo Edessa"/><a:font script="Syrj" typeface="Estrangelo Edessa"/><a:font script="Syre" typeface="Estrangelo Edessa"/><a:font script="Sora" typeface="Nirmala UI"/><a:font script="Tale" typeface="Microsoft Tai Le"/><a:font script="Talu" typeface="Microsoft New Tai Lue"/><a:font script="Tfng" typeface="Ebrima"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:lumMod val="102000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

// src/ooxml/docProps.ts
function generateCoreProperties(title, author, language) {
  const now = isDeterministicMode() ? DETERMINISTIC_DATE.toISOString().replace(/\.\d{3}Z/, "Z") : (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z/, "Z");
  const titleEl = title ? `  <dc:title>${escapeXml(title)}</dc:title>` : `  <dc:title/>`;
  const creatorEl = author ? `  <dc:creator>${escapeXml(author)}</dc:creator>` : `  <dc:creator>Runstamp</dc:creator>`;
  const languageEl = language ? `
  <dc:language>${escapeXml(language)}</dc:language>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
${titleEl}
${creatorEl}${languageEl}
  <cp:lastModifiedBy>${author ? escapeXml(author) : "Runstamp"}</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}
function generateAppProperties(slideCount, majorFont, minorFont) {
  const major = majorFont ?? "Carlito";
  const minor = minorFont ?? "Carlito";
  let titlesXml = "";
  titlesXml += `      <vt:lpstr>${escapeXml(minor)}</vt:lpstr>
`;
  titlesXml += `      <vt:lpstr>${escapeXml(major)}</vt:lpstr>
`;
  titlesXml += `      <vt:lpstr>Office Theme</vt:lpstr>
`;
  for (let i = 1; i <= slideCount; i++) {
    titlesXml += `      <vt:lpstr>Slide ${i}</vt:lpstr>
`;
  }
  const totalParts = 2 + 1 + slideCount;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Runstamp</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>${slideCount}</Slides>
  <HiddenSlides>0</HiddenSlides>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="6" baseType="variant">
      <vt:variant><vt:lpstr>Fonts Used</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>2</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Slide Titles</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${slideCount}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${totalParts}" baseType="lpstr">
${titlesXml}    </vt:vector>
  </TitlesOfParts>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;
}

// src/ooxml/customProps.ts
var FMTID = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";
function formatPropertyValue(value) {
  if (typeof value === "string") {
    return `<vt:lpwstr>${escapeXml(value)}</vt:lpwstr>`;
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return `<vt:i4>${value}</vt:i4>`;
    }
    return `<vt:r8>${value}</vt:r8>`;
  }
  if (typeof value === "boolean") {
    return `<vt:bool>${value}</vt:bool>`;
  }
  if (value instanceof Date) {
    const dateStr = isDeterministicMode() ? DETERMINISTIC_DATE.toISOString() : value.toISOString();
    return `<vt:filetime>${dateStr}</vt:filetime>`;
  }
  return `<vt:lpwstr>${escapeXml(String(value))}</vt:lpwstr>`;
}
function generateCustomProperties(props) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
`;
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const pid = i + 2;
    xml += `  <property fmtid="${FMTID}" pid="${pid}" name="${escapeXml(prop.name)}">${formatPropertyValue(prop.value)}</property>
`;
  }
  xml += `</Properties>`;
  return xml;
}

// src/ooxml/handoutMaster.ts
function generateHandoutMaster() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:handoutMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Header Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="hdr" sz="quarter"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Date Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="dt" sz="quarter" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Footer Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ftr" sz="quarter" idx="2"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Slide Number Placeholder 4"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="3"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle/>
          <a:p>
            <a:fld id="{B6F15528-F159-4107-1234-000000000010}" type="slidenum">
              <a:rPr lang="en-US" dirty="0"/>
              <a:t>&lt;#&gt;</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US" dirty="0"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
</p:handoutMaster>`;
}
function generateHandoutMasterRels() {
  return generateRelationshipsXml([
    {
      id: "rId1",
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
      target: "../theme/theme1.xml"
    }
  ]);
}

// src/ooxml/packageParts.ts
function generatePresProps(printSettings) {
  let innerXml = "";
  if (printSettings) {
    const attrs = [];
    if (printSettings.colorMode) attrs.push(`clrMode="${printSettings.colorMode}"`);
    if (printSettings.frameSlides) attrs.push(`frameSlides="1"`);
    if (printSettings.scaleToFitPaper) attrs.push(`scaleToFitPaper="1"`);
    if (attrs.length > 0) {
      innerXml += `  <p:prnPr ${attrs.join(" ")}/>
`;
    }
  }
  if (innerXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
${innerXml}</p:presentationPr>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;
}
function generateViewProps() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:normalViewPr>
    <p:restoredLeft sz="15620"/>
    <p:restoredTop sz="94660"/>
  </p:normalViewPr>
  <p:slideViewPr>
    <p:cSldViewPr>
      <p:cViewPr varScale="1">
        <p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale>
        <p:origin x="0" y="0"/>
      </p:cViewPr>
    </p:cSldViewPr>
  </p:slideViewPr>
</p:viewPr>`;
}
function generateTableStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`;
}

// src/ooxml/zipper.ts
function generatePlaceholderThumbnail() {
  const w = 256;
  const h = 192;
  const parts = [];
  const push = (...bytes) => parts.push(...bytes);
  push(255, 216);
  push(255, 224);
  const app0 = [
    74,
    70,
    73,
    70,
    0,
    // "JFIF\0"
    1,
    1,
    // version 1.1
    0,
    // aspect ratio units: 0 = no units
    0,
    1,
    0,
    1,
    // X/Y density = 1
    0,
    0
    // no thumbnail
  ];
  push(app0.length + 2 >> 8, app0.length + 2 & 255, ...app0);
  push(255, 219);
  const qt = [0];
  for (let i = 0; i < 64; i++) qt.push(1);
  push(qt.length + 2 >> 8, qt.length + 2 & 255, ...qt);
  push(255, 192);
  const sof = [
    8,
    // precision 8 bits
    h >> 8 & 255,
    h & 255,
    // height
    w >> 8 & 255,
    w & 255,
    // width
    1,
    // 1 component (grayscale)
    1,
    17,
    0
    // comp 1: id=1, sampling=1x1, quant table 0
  ];
  push(sof.length + 2 >> 8, sof.length + 2 & 255, ...sof);
  push(255, 196);
  const dhtDC = [
    0,
    // class=0 (DC), id=0
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // counts for lengths 1-8
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // counts for lengths 9-16
    0
    // symbol: category 0
  ];
  push(dhtDC.length + 2 >> 8, dhtDC.length + 2 & 255, ...dhtDC);
  push(255, 196);
  const dhtAC = [
    16,
    // class=1 (AC), id=0
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // counts for lengths 1-8
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // counts for lengths 9-16
    0
    // symbol: EOB (0/0)
  ];
  push(dhtAC.length + 2 >> 8, dhtAC.length + 2 & 255, ...dhtAC);
  push(255, 218);
  const sos = [
    1,
    // 1 component
    1,
    0,
    // comp 1: DC table 0, AC table 0
    0,
    63,
    0
    // spectral selection 0-63, successive approx 0
  ];
  push(sos.length + 2 >> 8, sos.length + 2 & 255, ...sos);
  const totalBlocks = w / 8 * (h / 8);
  const totalBits = totalBlocks * 2;
  const totalBytes = Math.ceil(totalBits / 8);
  for (let i = 0; i < totalBytes; i++) push(0);
  push(255, 217);
  return Buffer.from(parts);
}
function generateMultiMasterPresentationRels(slideCount, masterCount, hasNotes, hasComments = false, extraRels, hasHandoutMaster = false) {
  const relationships = [];
  for (let i = 1; i <= masterCount; i++) {
    relationships.push({
      id: `rId${i}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
      target: `slideMasters/slideMaster${i}.xml`
    });
  }
  let nextRId = masterCount + 1;
  relationships.push({
    id: `rId${nextRId++}`,
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
    target: "theme/theme1.xml"
  });
  for (let i = 1; i <= slideCount; i++) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
      target: `slides/slide${i}.xml`
    });
  }
  relationships.push(
    {
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",
      target: "presProps.xml"
    },
    {
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",
      target: "viewProps.xml"
    },
    {
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",
      target: "tableStyles.xml"
    }
  );
  if (hasNotes) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
      target: "notesMasters/notesMaster1.xml"
    });
  }
  if (hasComments) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
      target: "commentAuthors.xml"
    });
  }
  if (hasHandoutMaster) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster",
      target: "handoutMasters/handoutMaster1.xml"
    });
  }
  if (extraRels) {
    for (const rel of extraRels) {
      relationships.push({ id: rel.rId, type: rel.type, target: rel.target });
    }
  }
  return generateRelationshipsXml(relationships);
}
var PptxArchive = class {
  zip;
  masterLayoutMap;
  thumbnailBuffer;
  shouldValidateOpcInvariants = false;
  constructor() {
    this.zip = new import_jszip.default();
    this.initializeOPC();
  }
  zipOpts() {
    return isDeterministicMode() ? { date: DETERMINISTIC_DATE } : {};
  }
  addFolder(path) {
    const normalized = path.endsWith("/") ? path : `${path}/`;
    this.zip.file(normalized, null, { ...this.zipOpts(), dir: true });
    return this.zip.folder(path);
  }
  ensureParentFolders(path) {
    const segments = path.split("/").slice(0, -1);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const normalized = `${current}/`;
      if (!this.zip.files[normalized]) {
        this.zip.file(normalized, null, { ...this.zipOpts(), dir: true });
      }
    }
  }
  initializeOPC() {
    this.zip.file("[Content_Types].xml", generateContentTypes(), this.zipOpts());
    this.addFolder("_rels").file(".rels", generateGlobalRels(), this.zipOpts());
    this.addFolder("ppt");
    this.addFolder("ppt/_rels");
    this.addFolder("ppt/slides");
    this.addFolder("ppt/slides/_rels");
    this.addFolder("ppt/slideLayouts");
    this.addFolder("ppt/slideLayouts/_rels");
    this.addFolder("ppt/slideMasters");
    this.addFolder("ppt/slideMasters/_rels");
    this.addFolder("ppt/theme");
    this.addFolder("ppt/media");
  }
  // Helper for downstream emitters
  addFile(path, content) {
    this.ensureParentFolders(path);
    this.zip.file(path, content, this.zipOpts());
  }
  setThumbnail(buffer) {
    this.thumbnailBuffer = buffer;
    this.zip.file("docProps/thumbnail.jpeg", buffer, this.zipOpts());
  }
  /**
   * Assembles a complete, valid PPTX structure for the given slides.
   */
  assemblePresentation(slideCount, options = {}) {
    const slideContents = options.slideContents ?? [];
    const slideMediaManifests = options.slideMediaManifests ?? [];
    const slideChartManifests = options.slideChartManifests ?? [];
    const slideHyperlinkRels = options.slideHyperlinkRels ?? [];
    const slideTransitionXmls = options.slideTransitionXmls ?? [];
    const slideTimingXmls = options.slideTimingXmls ?? [];
    const slideBackgrounds = options.slideBackgrounds ?? [];
    const slideNotes = options.slideNotes ?? [];
    const meta = options.meta;
    const slideSize = options.slideSize;
    const slideHeaderFooters = options.slideHeaderFooters ?? [];
    const themeConfig = options.themeConfig;
    const sections = options.sections;
    const protection = options.protection;
    const customShows = options.customShows;
    const notesSize = options.notesSize;
    const embeddedFontListXml = options.embeddedFontListXml;
    const extraPresentationRels = options.extraPresentationRels;
    const commentSlideInfos = options.commentSlideInfos;
    const commentAuthorsXml = options.commentAuthorsXml;
    const fontDataFiles = options.fontDataFiles;
    const mastersConfig = options.mastersConfig;
    const slideMasterNames = options.slideMasterNames;
    const slideBgImageAssets = options.slideBgImageAssets;
    const customProperties = options.customProperties;
    const handoutLayout = options.handoutLayout;
    const printSettings = options.printSettings;
    const thumbnailBuffer = options.thumbnailBuffer;
    let totalCharts = 0;
    let totalChartEx = 0;
    const chartDrawingIndices = [];
    for (const manifest of slideChartManifests) {
      for (const chart of manifest.charts) {
        if (!chart.chartXml || !chart.chartRelsXml || !chart.excelBuffer) {
          continue;
        }
        if (chart.isChartEx) {
          totalChartEx++;
        } else {
          totalCharts++;
        }
        if (chart.chartDrawingXml) {
          chartDrawingIndices.push(chart.chartIndex);
        }
      }
    }
    const hasAnyNotes = slideNotes.some((n) => n !== void 0 && n !== "" && !(Array.isArray(n) && n.length === 0));
    const notesSlideIndices = [];
    for (let i = 0; i < slideCount; i++) {
      const n = slideNotes[i];
      if (n !== void 0 && n !== "" && !(Array.isArray(n) && n.length === 0)) {
        notesSlideIndices.push(i);
      }
    }
    const opts = this.zipOpts();
    const hasComments = commentSlideInfos && commentSlideInfos.length > 0;
    const hasAnyVideo = slideMediaManifests.some((m) => m.videoAssets && m.videoAssets.length > 0);
    const hasAnyAudio = slideMediaManifests.some((m) => m.audioAssets && m.audioAssets.length > 0);
    const hasAnySvg = slideMediaManifests.some((m) => m.svgAssets && m.svgAssets.length > 0);
    const hasCustomPropsFlag = customProperties !== void 0 && customProperties.length > 0;
    const hasHandoutMasterFlag = handoutLayout !== void 0;
    this.zip.file("[Content_Types].xml", generateContentTypes(
      slideCount,
      totalCharts,
      hasAnyNotes,
      notesSlideIndices,
      commentSlideInfos?.map((c) => c.commentFileIndex),
      fontDataFiles && fontDataFiles.length > 0,
      hasAnyVideo,
      hasAnyAudio,
      hasCustomPropsFlag,
      hasHandoutMasterFlag,
      totalChartEx,
      chartDrawingIndices,
      hasAnySvg
    ), opts);
    this.addFolder("docProps");
    this.zip.file("docProps/core.xml", generateCoreProperties(meta?.title, meta?.author, meta?.language), opts);
    this.zip.file("docProps/app.xml", generateAppProperties(
      slideCount,
      themeConfig?.fontScheme?.majorLatin,
      themeConfig?.fontScheme?.minorLatin
    ), opts);
    const hasCustomProps = customProperties && customProperties.length > 0;
    if (hasCustomProps) {
      this.zip.file("docProps/custom.xml", generateCustomProperties(customProperties), opts);
    }
    this.thumbnailBuffer = thumbnailBuffer ?? this.thumbnailBuffer ?? generatePlaceholderThumbnail();
    this.zip.file("docProps/thumbnail.jpeg", this.thumbnailBuffer, opts);
    this.addFolder("_rels").file(".rels", generateGlobalRels(true, hasCustomProps), opts);
    const hasHandoutMaster = handoutLayout !== void 0;
    if (hasHandoutMaster) {
      this.addFolder("ppt/handoutMasters");
      this.addFolder("ppt/handoutMasters/_rels");
      this.zip.file("ppt/handoutMasters/handoutMaster1.xml", generateHandoutMaster(), opts);
      this.zip.file("ppt/handoutMasters/_rels/handoutMaster1.xml.rels", generateHandoutMasterRels(), opts);
    }
    const notesMasterRId = hasAnyNotes ? `rId${computePresNotesMasterRId(1, slideCount)}` : void 0;
    this.zip.file("ppt/presentation.xml", generatePresentationXml(slideCount, slideSize, { sections, protection, customShows, notesSize, embeddedFontListXml, hasHandoutMaster, hasNotes: hasAnyNotes, hasComments: !!hasComments, notesMasterRId }), opts);
    this.zip.file("ppt/_rels/presentation.xml.rels", generatePresentationRels(
      slideCount,
      hasAnyNotes,
      hasComments,
      extraPresentationRels,
      hasHandoutMaster
    ), opts);
    if (hasComments && commentAuthorsXml) {
      this.zip.file("ppt/commentAuthors.xml", commentAuthorsXml, opts);
    }
    if (fontDataFiles) {
      this.addFolder("ppt/fonts");
      for (const font of fontDataFiles) {
        this.zip.file(font.path, font.buffer, opts);
      }
    }
    if (mastersConfig && mastersConfig.length > 0) {
      let globalLayoutIndex = 1;
      const masterLayoutMap = /* @__PURE__ */ new Map();
      for (let mi = 0; mi < mastersConfig.length; mi++) {
        const masterConfig = mastersConfig[mi];
        const masterIndex = mi + 1;
        const firstLayoutIndex = globalLayoutIndex;
        const layoutCount = masterConfig.layouts.length;
        masterLayoutMap.set(masterConfig.name, { masterIndex, firstLayoutIndex, layoutCount });
        const layoutRIds = [];
        for (let li = 0; li < layoutCount; li++) {
          const layoutIndex = globalLayoutIndex++;
          const layoutRId = `rId${li + 1}`;
          layoutRIds.push(layoutRId);
          this.zip.file(
            `ppt/slideLayouts/slideLayout${layoutIndex}.xml`,
            generateSlideLayoutMulti(masterConfig.layouts[li].name),
            opts
          );
          this.zip.file(
            `ppt/slideLayouts/_rels/slideLayout${layoutIndex}.xml.rels`,
            generateSlideLayoutRels(`../slideMasters/slideMaster${masterIndex}.xml`),
            opts
          );
        }
        const layoutBaseId = 2147483649 + (firstLayoutIndex - 1);
        this.zip.file(
          `ppt/slideMasters/slideMaster${masterIndex}.xml`,
          generateSlideMasterMulti(layoutRIds, layoutBaseId, masterConfig.background),
          opts
        );
        const masterRelationships = [];
        for (let li = 0; li < layoutCount; li++) {
          const layoutIndex = firstLayoutIndex + li;
          masterRelationships.push({
            id: `rId${li + 1}`,
            type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
            target: `../slideLayouts/slideLayout${layoutIndex}.xml`
          });
        }
        masterRelationships.push({
          id: `rId${layoutCount + 1}`,
          type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
          target: "../theme/theme1.xml"
        });
        this.zip.file(
          `ppt/slideMasters/_rels/slideMaster${masterIndex}.xml.rels`,
          generateRelationshipsXml(masterRelationships),
          opts
        );
      }
      const totalLayouts = globalLayoutIndex - 1;
      const updatedContentTypes = generateContentTypes(
        slideCount,
        totalCharts,
        hasAnyNotes,
        notesSlideIndices,
        commentSlideInfos?.map((c) => c.commentFileIndex),
        fontDataFiles && fontDataFiles.length > 0,
        hasAnyVideo,
        hasAnyAudio,
        hasCustomPropsFlag,
        hasHandoutMasterFlag,
        totalChartEx,
        chartDrawingIndices,
        hasAnySvg,
        totalLayouts,
        mastersConfig.length
      );
      this.zip.file("[Content_Types].xml", updatedContentTypes, opts);
      const mmNotesMasterRId = hasAnyNotes ? `rId${computePresNotesMasterRId(mastersConfig.length, slideCount)}` : void 0;
      const presXmlContent = generatePresentationXml(slideCount, slideSize, {
        sections,
        protection,
        customShows,
        notesSize,
        embeddedFontListXml,
        hasNotes: hasAnyNotes,
        hasComments: !!hasComments,
        hasHandoutMaster: hasHandoutMasterFlag,
        notesMasterRId: mmNotesMasterRId,
        masterCount: mastersConfig.length
      });
      this.zip.file("ppt/presentation.xml", presXmlContent, opts);
      const presRelsXml = generateMultiMasterPresentationRels(
        slideCount,
        mastersConfig.length,
        hasAnyNotes,
        hasComments,
        extraPresentationRels,
        hasHandoutMasterFlag
      );
      this.zip.file("ppt/_rels/presentation.xml.rels", presRelsXml, opts);
      this.masterLayoutMap = masterLayoutMap;
    } else {
      const STANDARD_LAYOUTS = ["Blank", "Title Slide", "Section Header", "Two Content", "Title Only"];
      const singleLayoutCount = STANDARD_LAYOUTS.length;
      this.zip.file("ppt/slideMasters/slideMaster1.xml", generateSlideMaster(singleLayoutCount), opts);
      this.zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", generateSlideMasterRels(singleLayoutCount), opts);
      for (let i = 0; i < singleLayoutCount; i++) {
        this.zip.file(`ppt/slideLayouts/slideLayout${i + 1}.xml`, generateSlideLayoutMulti(STANDARD_LAYOUTS[i]), opts);
        this.zip.file(`ppt/slideLayouts/_rels/slideLayout${i + 1}.xml.rels`, generateSlideLayoutRels(), opts);
      }
      this.zip.file("[Content_Types].xml", generateContentTypes(
        slideCount,
        totalCharts,
        hasAnyNotes,
        notesSlideIndices,
        commentSlideInfos?.map((c) => c.commentFileIndex),
        fontDataFiles && fontDataFiles.length > 0,
        hasAnyVideo,
        hasAnyAudio,
        hasCustomPropsFlag,
        hasHandoutMasterFlag,
        totalChartEx,
        chartDrawingIndices,
        hasAnySvg,
        singleLayoutCount
      ), opts);
    }
    this.zip.file("ppt/theme/theme1.xml", generateTheme(themeConfig), opts);
    if (hasAnyNotes) {
      this.zip.file("ppt/theme/theme2.xml", generateNotesTheme(), opts);
    }
    this.zip.file("ppt/presProps.xml", generatePresProps(printSettings), opts);
    this.zip.file("ppt/viewProps.xml", generateViewProps(), opts);
    this.zip.file("ppt/tableStyles.xml", generateTableStyles(), opts);
    if (hasAnyNotes) {
      this.addFolder("ppt/notesMasters");
      this.addFolder("ppt/notesMasters/_rels");
      this.addFolder("ppt/notesSlides");
      this.addFolder("ppt/notesSlides/_rels");
      this.zip.file("ppt/notesMasters/notesMaster1.xml", generateNotesMaster(), opts);
      this.zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels", generateNotesMasterRels(), opts);
    }
    if (totalCharts > 0 || totalChartEx > 0) {
      this.addFolder("ppt/charts");
      this.addFolder("ppt/charts/_rels");
      this.addFolder("ppt/embeddings");
    }
    if (chartDrawingIndices.length > 0) {
      this.addFolder("ppt/drawings");
    }
    for (let i = 1; i <= slideCount; i++) {
      const innerSpTree = slideContents[i - 1] ?? "";
      const mediaManifest = slideMediaManifests[i - 1];
      const chartManifest = slideChartManifests[i - 1];
      const hyperlinkRels = slideHyperlinkRels[i - 1] ?? [];
      const background = slideBackgrounds[i - 1];
      const notes = slideNotes[i - 1];
      const headerFooter = slideHeaderFooters[i - 1];
      const mediaRels = [];
      if (mediaManifest) {
        for (const asset of mediaManifest.assets) {
          this.zip.file(asset.mediaPath, asset.buffer, opts);
          mediaRels.push({ rId: asset.rId, target: asset.relativePath });
        }
        for (const asset of mediaManifest.fillAssets) {
          this.zip.file(asset.mediaPath, asset.buffer, opts);
          mediaRels.push({ rId: asset.rId, target: asset.relativePath });
        }
      }
      const videoRels = [];
      if (mediaManifest?.videoAssets) {
        for (const asset of mediaManifest.videoAssets) {
          if (asset.buffer.length > 0) {
            this.zip.file(asset.mediaPath, asset.buffer, opts);
          }
          if (asset.posterRId && asset.posterBuffer && asset.posterMediaPath && asset.posterRelativePath) {
            this.zip.file(asset.posterMediaPath, asset.posterBuffer, opts);
          }
          if (asset.webVideo) {
            if (asset.posterRId) {
              videoRels.push({
                videoRId: "",
                mediaRId: "",
                videoTarget: "",
                posterRId: asset.posterRId,
                posterTarget: asset.posterRelativePath
              });
            }
          } else {
            const rel = {
              videoRId: asset.videoRId,
              mediaRId: asset.mediaRId,
              videoTarget: asset.relativePath
            };
            if (asset.posterRId && asset.posterRelativePath) {
              rel.posterRId = asset.posterRId;
              rel.posterTarget = asset.posterRelativePath;
            }
            videoRels.push(rel);
          }
        }
      }
      const audioRels = [];
      if (mediaManifest?.audioAssets) {
        for (const asset of mediaManifest.audioAssets) {
          this.zip.file(asset.mediaPath, asset.buffer, opts);
          audioRels.push({
            audioRId: asset.audioRId,
            mediaRId: asset.mediaRId,
            audioTarget: asset.relativePath
          });
        }
      }
      const svgRels = [];
      if (mediaManifest?.svgAssets) {
        for (const asset of mediaManifest.svgAssets) {
          this.zip.file(asset.svgMediaPath, asset.svgBuffer, opts);
          svgRels.push({ rId: asset.svgRId, target: asset.svgRelativePath });
        }
      }
      const chartRels = [];
      if (chartManifest) {
        for (const chart of chartManifest.charts) {
          if (chart.chartXml && chart.chartRelsXml && chart.excelBuffer && chart.rId) {
            const prefix = chart.isChartEx ? "chartEx" : "chart";
            this.zip.file(`ppt/charts/${prefix}${chart.chartIndex}.xml`, chart.chartXml, opts);
            this.zip.file(`ppt/charts/_rels/${prefix}${chart.chartIndex}.xml.rels`, chart.chartRelsXml, opts);
            this.zip.file(`ppt/embeddings/${prefix}${chart.chartIndex}.xlsx`, chart.excelBuffer, opts);
            if (chart.chartDrawingXml) {
              this.zip.file(`ppt/drawings/drawing${chart.chartIndex}.xml`, chart.chartDrawingXml, opts);
            }
            chartRels.push({
              rId: chart.rId,
              target: `../charts/${prefix}${chart.chartIndex}.xml`,
              type: chart.isChartEx ? "chartEx" : "chart"
            });
          }
          if (chart.fallbackPng && chart.fallbackMediaPath) {
            this.zip.file(chart.fallbackMediaPath, chart.fallbackPng, opts);
            if (chart.fallbackRId && chart.fallbackRelativePath) {
              mediaRels.push({ rId: chart.fallbackRId, target: chart.fallbackRelativePath });
            }
          }
        }
      }
      const bgImageAsset = slideBgImageAssets?.[i - 1];
      if (bgImageAsset) {
        this.zip.file(bgImageAsset.mediaPath, bgImageAsset.buffer, opts);
        mediaRels.push({ rId: bgImageAsset.rId, target: bgImageAsset.relativePath });
      }
      const hasNotes = notes !== void 0 && notes !== "" && !(Array.isArray(notes) && notes.length === 0);
      const commentInfo = commentSlideInfos?.find((c) => c.slideIndex === i - 1);
      let slideLayoutTarget;
      if (mastersConfig && mastersConfig.length > 0 && slideMasterNames) {
        const masterName = slideMasterNames[i - 1];
        const masterLayoutMap = this.masterLayoutMap;
        if (masterLayoutMap && masterName) {
          const info = masterLayoutMap.get(masterName);
          if (info) {
            slideLayoutTarget = `../slideLayouts/slideLayout${info.firstLayoutIndex}.xml`;
          }
        }
        if (!slideLayoutTarget && masterLayoutMap) {
          const unresolvedName = slideMasterNames[i - 1];
          getLogger().warn(
            `[zipper] Slide ${i}: master name "${unresolvedName ?? "(undefined)"}" not found in masterLayoutMap. Falling back to first master's first layout. Available masters: [${[...masterLayoutMap.keys()].join(", ")}]`
          );
          const firstMaster = masterLayoutMap.values().next().value;
          if (firstMaster) {
            slideLayoutTarget = `../slideLayouts/slideLayout${firstMaster.firstLayoutIndex}.xml`;
          }
        }
      }
      const transitionXml = slideTransitionXmls[i - 1] ?? "";
      const timingXml = slideTimingXmls[i - 1] ?? "";
      const bgImageRId = bgImageAsset?.rId;
      const slideWidthEmu = slideSize ? Math.round(slideSize.width * PIXEL_TO_EMU) : void 0;
      const slideHeightEmu = slideSize ? Math.round(slideSize.height * PIXEL_TO_EMU) : void 0;
      this.zip.file(
        `ppt/slides/slide${i}.xml`,
        generateSlideShell(
          innerSpTree,
          transitionXml,
          timingXml,
          background,
          headerFooter,
          bgImageRId,
          slideWidthEmu,
          slideHeightEmu,
          `slide:${i}`
        ),
        opts
      );
      this.zip.file(
        `ppt/slides/_rels/slide${i}.xml.rels`,
        generateSlideRels(mediaRels, hyperlinkRels, chartRels, hasNotes ? i : void 0, slideLayoutTarget, commentInfo?.commentFileIndex, videoRels, audioRels, svgRels),
        opts
      );
      if (hasNotes) {
        const notesResult = generateNotesSlide(notes, i);
        this.zip.file(`ppt/notesSlides/notesSlide${i}.xml`, notesResult.xml, opts);
        this.zip.file(`ppt/notesSlides/_rels/notesSlide${i}.xml.rels`, generateNotesSlideRels(i, notesResult.hyperlinkRels), opts);
      }
    }
    this.shouldValidateOpcInvariants = true;
  }
  async generateBuffer() {
    if (this.shouldValidateOpcInvariants) {
      await assertOpcPackageInvariants(this.zip);
    }
    return await this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
  }
  generateStream() {
    return this.zip.generateNodeStream({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      streamFiles: true
    });
  }
};

// src/ooxml/drawing/geometry.ts
function emitCommand(cmd) {
  switch (cmd.type) {
    case "moveTo":
      return `<a:moveTo><a:pt x="${cmd.x}" y="${cmd.y}"/></a:moveTo>`;
    case "lineTo":
      return `<a:lnTo><a:pt x="${cmd.x}" y="${cmd.y}"/></a:lnTo>`;
    case "cubicBezTo":
      return `<a:cubicBezTo><a:pt x="${cmd.cp1x}" y="${cmd.cp1y}"/><a:pt x="${cmd.cp2x}" y="${cmd.cp2y}"/><a:pt x="${cmd.x}" y="${cmd.y}"/></a:cubicBezTo>`;
    case "quadBezTo":
      return `<a:quadBezTo><a:pt x="${cmd.cpx}" y="${cmd.cpy}"/><a:pt x="${cmd.x}" y="${cmd.y}"/></a:quadBezTo>`;
    case "arcTo":
      return `<a:arcTo wR="${cmd.wR}" hR="${cmd.hR}" stAng="${cmd.stAng}" swAng="${cmd.swAng}"/>`;
    case "close":
      return `<a:close/>`;
    default:
      return "";
  }
}
function emitCustomGeomXml(geom) {
  let xml = `    <a:custGeom>
`;
  xml += `      <a:avLst/>
`;
  xml += `      <a:gdLst/>
`;
  xml += `      <a:ahLst/>
`;
  xml += `      <a:cxnLst/>
`;
  xml += `      <a:rect l="l" t="t" r="r" b="b"/>
`;
  xml += `      <a:pathLst>
`;
  for (const path of geom.paths) {
    const w = path.width ?? 1e6;
    const h = path.height ?? 1e6;
    const fillAttr = path.fill ? ` fill="${path.fill}"` : "";
    xml += `        <a:path w="${w}" h="${h}"${fillAttr}>`;
    for (const cmd of path.commands) {
      xml += emitCommand(cmd);
    }
    xml += `</a:path>
`;
  }
  xml += `      </a:pathLst>
`;
  xml += `    </a:custGeom>
`;
  return xml;
}

// src/ooxml/drawing/autoFitPolicy.ts
var OVERFLOW_TOLERANCE = 0.98;
function flattenParagraphs(paragraphs) {
  const runs = [];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) runs.push({ text: "\n" });
    runs.push(...paragraph.runs);
  });
  return runs;
}
function resolveConditionalAutoFit(paragraphs, textStyle, layout, existingAutoFitResult) {
  if (existingAutoFitResult && Number.isFinite(existingAutoFitResult.fontScale) && Number.isFinite(existingAutoFitResult.lnSpcReduction)) {
    return existingAutoFitResult;
  }
  const insets = textStyle?.textInsets;
  const availableWidth = layout.width - (insets?.left ?? 0) - (insets?.right ?? 0);
  const availableHeight = layout.height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
  if (availableWidth <= 0 || availableHeight <= 0) return void 0;
  const runs = flattenParagraphs(paragraphs);
  const metrics = calculateRichTextMetrics(runs, textStyle, availableWidth);
  if (metrics.height <= availableHeight * OVERFLOW_TOLERANCE) {
    return void 0;
  }
  return computeAutoFit(runs, textStyle, availableWidth, availableHeight, {
    maxLines: textStyle?.textFit?.maxLines
  });
}
function resolveAutoFitPolicy(params) {
  const {
    paragraphs,
    textStyle,
    layout,
    existingAutoFitResult,
    requestedPolicy
  } = params;
  if (requestedPolicy === "none") {
    return { policy: "none" };
  }
  if (existingAutoFitResult && Number.isFinite(existingAutoFitResult.fontScale) && Number.isFinite(existingAutoFitResult.lnSpcReduction)) {
    return { policy: "shrink_text", autoFitResult: existingAutoFitResult };
  }
  if (requestedPolicy === "engine_conditional") {
    const conditional = resolveConditionalAutoFit(paragraphs, textStyle, layout, existingAutoFitResult);
    if (conditional) return { policy: "shrink_text", autoFitResult: conditional };
    return { policy: "office_default" };
  }
  if (requestedPolicy === "grow_shape") {
    return { policy: "grow_shape" };
  }
  return { policy: requestedPolicy ?? "office_default" };
}
function emitAutoFitXml(resolved) {
  if (resolved.policy === "shrink_text" && resolved.autoFitResult) {
    return `<a:normAutofit fontScale="${resolved.autoFitResult.fontScale}" lnSpcReduction="${resolved.autoFitResult.lnSpcReduction}"/>`;
  }
  if (resolved.policy === "office_default" || resolved.policy === "engine_conditional") {
    return '<a:normAutofit fontScale="100000"/>';
  }
  return "";
}

// src/ooxml/drawing/shape.ts
var LITE_SUPPORTED_SHAPES = /* @__PURE__ */ new Set([
  "rect",
  "roundRect",
  "ellipse",
  "triangle",
  "diamond",
  "rightArrow",
  "leftArrow",
  "upArrow",
  "downArrow",
  "leftRightArrow",
  "upDownArrow",
  "star4",
  "star5",
  "star6",
  "heart",
  "cloud",
  "hexagon",
  "pentagon",
  "octagon",
  "parallelogram",
  "trapezoid",
  "flowChartProcess",
  "flowChartDecision",
  "flowChartTerminator",
  "flowChartDocument",
  "flowChartData",
  "flowChartPredefinedProcess",
  "wedgeRoundRectCallout",
  "cloudCallout",
  "rightBrace",
  "leftBrace",
  "rightBracket",
  "leftBracket",
  "mathPlus",
  "mathMinus",
  "mathMultiply",
  "mathEqual",
  "line",
  "donut",
  "frame",
  "plaque"
]);
var VALID_PRESET_GEOMETRIES = /* @__PURE__ */ new Set([
  // BasicShape
  "rect",
  "ellipse",
  "roundRect",
  "triangle",
  "rtTriangle",
  "rightTriangle",
  "diamond",
  "parallelogram",
  "trapezoid",
  "nonIsoscelesTrapezoid",
  "heart",
  "plus",
  "chevron",
  "homePlate",
  "donut",
  "cloud",
  "hexagon",
  "pentagon",
  "octagon",
  "decagon",
  "heptagon",
  "dodecagon",
  "snip1Rect",
  "snip2SameRect",
  "snip2DiagRect",
  "snip2SameRect2",
  "snipRoundRect",
  "round1Rect",
  "round2SameRect",
  "round2DiagRect",
  "round1Rect2",
  "bevel",
  "noSmoking",
  "blockArc",
  "pie",
  "pieWedge",
  "arc",
  "chord",
  "corner",
  "diagStripe",
  "halfFrame",
  "frame",
  "foldedCorner",
  "can",
  "cube",
  "teardrop",
  "gear6",
  "gear9",
  "plaque",
  "smileyFace",
  "irregularSeal1",
  "irregularSeal2",
  "ribbon",
  "ribbon2",
  "leftRightRibbon",
  "lightningBolt",
  "moon",
  "sun",
  "funnel",
  "wave",
  "doubleWave",
  "ellipseRibbon",
  "ellipseRibbon2",
  "verticalScroll",
  "horizontalScroll",
  "line",
  "lineInv",
  // ArrowShape
  "rightArrow",
  "leftArrow",
  "upArrow",
  "downArrow",
  "leftRightArrow",
  "upDownArrow",
  "bentArrow",
  "uturnArrow",
  "bentUpArrow",
  "curvedRightArrow",
  "curvedLeftArrow",
  "curvedUpArrow",
  "curvedDownArrow",
  "stripedRightArrow",
  "notchedRightArrow",
  "circularArrow",
  "leftCircularArrow",
  "swooshArrow",
  "leftRightUpArrow",
  "quadArrow",
  "leftUpArrow",
  // ArrowCalloutShape
  "quadArrowCallout",
  "leftRightArrowCallout",
  "upDownArrowCallout",
  "leftArrowCallout",
  "rightArrowCallout",
  "upArrowCallout",
  "downArrowCallout",
  // FlowchartShape
  "flowChartProcess",
  "flowChartDecision",
  "flowChartDocument",
  "flowChartTerminator",
  "flowChartConnector",
  "flowChartMerge",
  "flowChartSort",
  "flowChartExtract",
  "flowChartPreparation",
  "flowChartManualInput",
  "flowChartManualOperation",
  "flowChartPredefinedProcess",
  "flowChartInternalStorage",
  "flowChartMultidocument",
  "flowChartOffpageConnector",
  "flowChartPunchedTape",
  "flowChartSummingJunction",
  "flowChartOr",
  "flowChartDelay",
  "flowChartAlternateProcess",
  "flowChartMagneticDisk",
  "flowChartMagneticDrum",
  "flowChartMagneticTape",
  "flowChartDisplay",
  "flowChartOnlineStorage",
  "flowChartCollate",
  "flowChartInputOutput",
  "flowChartOfflineStorage",
  // ActionButtonShape
  "actionButtonBlank",
  "actionButtonHome",
  "actionButtonHelp",
  "actionButtonInformation",
  "actionButtonBackPrevious",
  "actionButtonForwardNext",
  "actionButtonBeginning",
  "actionButtonEnd",
  "actionButtonReturn",
  "actionButtonSound",
  "actionButtonMovie",
  // CalloutShape
  "wedgeRoundRectCallout",
  "wedgeRectCallout",
  "wedgeEllipseCallout",
  "wedgeRoundRectCallout2",
  "cloudCallout",
  "borderCallout1",
  "borderCallout2",
  "borderCallout3",
  "callout1",
  "callout2",
  "callout3",
  "accentCallout1",
  "accentCallout2",
  "accentCallout3",
  "accentBorderCallout1",
  "accentBorderCallout2",
  "accentBorderCallout3",
  // MathShape
  "mathPlus",
  "mathMinus",
  "mathMultiply",
  "mathDivide",
  "mathEqual",
  "mathNotEqual",
  // StarShape
  "star4",
  "star5",
  "star6",
  "star7",
  "star8",
  "star10",
  "star12",
  "star16",
  "star24",
  "star32",
  // BracketBraceShape
  "leftBrace",
  "rightBrace",
  "leftBracket",
  "rightBracket",
  "bracePair",
  "bracketPair",
  // TabShape
  "plaqueTabs",
  "squareTabs",
  "roundTab",
  // ConnectorShape
  "curvedConnector2",
  "curvedConnector3",
  "curvedConnector4",
  "curvedConnector5",
  "straightConnector1",
  "bentConnector2",
  "bentConnector3",
  "bentConnector4",
  "bentConnector5"
]);
function emitNvPr(placeholder) {
  if (!placeholder) return `    <p:nvPr/>
`;
  const typeAttr = placeholder.type ? ` type="${placeholder.type}"` : "";
  const idxAttr = placeholder.idx !== void 0 ? ` idx="${placeholder.idx}"` : "";
  return `    <p:nvPr><p:ph${typeAttr}${idxAttr}/></p:nvPr>
`;
}
function generateShapeXml(node, shapeId, hyperlinkRIdStart = 200, imageFillRId) {
  const { x, y, width, height } = node.layout;
  const effectiveGeometry = resolveEffectiveViewGeometry(node, width, height);
  const shapeType = effectiveGeometry.shapeType || "rect";
  const adjustments = effectiveGeometry.shapeAdjustments;
  const placeholder = node.placeholder;
  const omitTransform = node._omitTransform;
  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `View ${shapeId}`;
  const rotation = node.style?.rotation;
  const flipH = node.style?.flipH;
  const flipV = node.style?.flipV;
  const opacity = node.style?.opacity;
  const textContent = node.textContent;
  const textParagraphs = node.textParagraphs;
  const textStyle = node.textStyle;
  const hasText = textContent !== void 0 || textParagraphs && textParagraphs.length > 0;
  const hyperlinkRels = [];
  const hyperlinkRIdCounter = { current: hyperlinkRIdStart };
  const hyperlink = node.hyperlink;
  const altText = node.altText;
  const decorative = node.decorative;
  const locks = node.locks;
  const customGeometry = effectiveGeometry.customGeometry;
  const adjustmentMap = effectiveGeometry.shapeAdjustmentMap;
  let xml = `<p:sp>
`;
  xml += `  <p:nvSpPr>
`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  if (hyperlink || decorative) {
    let cNvPrChildren = "";
    if (hyperlink) {
      const { hlinkXml } = resolveHyperlink(hyperlink, hyperlinkRels, hyperlinkRIdCounter);
      if (hlinkXml) cNvPrChildren += hlinkXml;
    }
    if (decorative) {
      cNvPrChildren += emitDecorativeExtXml();
    }
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}>${cNvPrChildren}</p:cNvPr>
`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>
`;
  }
  if (locks) {
    xml += `    <p:cNvSpPr>${emitLocksXml("a:spLocks", locks)}</p:cNvSpPr>
`;
  } else {
    xml += `    <p:cNvSpPr/>
`;
  }
  xml += emitNvPr(placeholder);
  xml += `  </p:nvSpPr>
`;
  xml += `  <p:spPr>
`;
  if (!shouldOmitTransform(node.layout, omitTransform)) {
    const xfrmAttrs = [];
    if (rotation !== void 0 && rotation !== 0) {
      xfrmAttrs.push(`rot="${Math.round(rotation * 6e4)}"`);
    }
    if (flipH) xfrmAttrs.push('flipH="1"');
    if (flipV) xfrmAttrs.push('flipV="1"');
    const xfrmAttrStr = xfrmAttrs.length > 0 ? " " + xfrmAttrs.join(" ") : "";
    xml += `    <a:xfrm${xfrmAttrStr}>
`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
    xml += `    </a:xfrm>
`;
  }
  if (customGeometry) {
    xml += emitCustomGeomXml(customGeometry);
  } else {
    let resolvedShape;
    if (isLiteBundle() && !LITE_SUPPORTED_SHAPES.has(shapeType)) {
      getLogger().warn(`[shape] Shape "${shapeType}" not supported in free mode \u2014 rendering as rectangle`);
      resolvedShape = "rect";
    } else {
      resolvedShape = VALID_PRESET_GEOMETRIES.has(shapeType) ? shapeType : "rect";
      if (resolvedShape !== shapeType) {
        getLogger().warn(`[shape] Invalid shapeType "${shapeType}" \u2014 falling back to "rect"`);
      }
    }
    xml += `    <a:prstGeom prst="${escapeXmlAttr(resolvedShape)}">
`;
    if (adjustmentMap && Object.keys(adjustmentMap).length > 0) {
      xml += `      <a:avLst>`;
      for (const [name, value] of Object.entries(adjustmentMap)) {
        xml += `<a:gd name="${escapeXmlAttr(name)}" fmla="val ${value}"/>`;
      }
      xml += `</a:avLst>
`;
    } else if (adjustments && adjustments.length > 0) {
      xml += `      <a:avLst>`;
      for (let i = 0; i < adjustments.length; i++) {
        xml += `<a:gd name="adj${i + 1 === 1 ? "" : i + 1}" fmla="val ${adjustments[i]}"/>`;
      }
      xml += `</a:avLst>
`;
    } else {
      xml += `      <a:avLst/>
`;
    }
    xml += `    </a:prstGeom>
`;
  }
  const fillXml = emitFillXml(node.style, opacity, imageFillRId);
  if (fillXml) {
    xml += `    ${fillXml}
`;
  } else {
    xml += `    <a:noFill/>
`;
  }
  xml += `    ${emitLineXml(node.style)}
`;
  const effectsXml = emitEffectsXml(node.style);
  if (effectsXml) {
    xml += `    ${effectsXml}
`;
  }
  if (node.style?.effects?.scene3d) {
    xml += `    ${emitScene3dXml(node.style.effects.scene3d)}
`;
  }
  if (node.style?.effects?.sp3d) {
    xml += `    ${emitSp3dXml(node.style.effects.sp3d)}
`;
  }
  xml += `  </p:spPr>
`;
  xml += `  <p:txBody>
`;
  if (hasText && textStyle) {
    const paragraphs = normalizeToParagraphsFromFields(textContent, textParagraphs);
    const resolvedAutoFit = resolveAutoFitPolicy({
      paragraphs,
      textStyle,
      layout: node.layout,
      existingAutoFitResult: node._autoFitResult,
      requestedPolicy: node._compatibility?.autoFitPolicy ?? "office_default"
    });
    const autoFitXml = emitAutoFitXml(resolvedAutoFit);
    const vertAlign = textStyle.verticalAlign;
    const textInsets = textStyle.textInsets;
    const textDir = textStyle.textDirection;
    const rtlCol = textStyle.rtl;
    const attrs = ['wrap="square"', `rtlCol="${rtlCol ? "1" : "0"}"`, 'spcFirstLastPara="0"'];
    if (vertAlign) {
      attrs.push(`anchor="${VERTICAL_ALIGN_MAP[vertAlign] || "t"}"`);
    }
    if (textInsets) {
      attrs.push(`lIns="${toEmu(textInsets.left ?? 0)}"`);
      attrs.push(`tIns="${toEmu(textInsets.top ?? 0)}"`);
      attrs.push(`rIns="${toEmu(textInsets.right ?? 0)}"`);
      attrs.push(`bIns="${toEmu(textInsets.bottom ?? 0)}"`);
    } else {
      attrs.push('lIns="0"', 'tIns="0"', 'rIns="0"', 'bIns="0"');
    }
    if (textDir === "vertical") attrs.push('vert="vert270"');
    else if (textDir === "verticalEA") attrs.push('vert="eaVert"');
    if (textStyle.columns !== void 0 && textStyle.columns > 1) {
      attrs.push(`numCol="${textStyle.columns}"`);
      if (textStyle.columnSpacing !== void 0) {
        attrs.push(`spcCol="${toEmu(textStyle.columnSpacing)}"`);
      }
    }
    if (textStyle.textWarp && textStyle.textWarp !== "textNoShape") {
      const children = [`<a:prstTxWarp prst="${escapeXmlAttr(textStyle.textWarp)}"><a:avLst/></a:prstTxWarp>`];
      if (autoFitXml) {
        children.push(autoFitXml);
      }
      xml += `    <a:bodyPr ${attrs.join(" ")}>${children.join("")}</a:bodyPr>
`;
    } else {
      if (autoFitXml) {
        xml += `    <a:bodyPr ${attrs.join(" ")}>${autoFitXml}</a:bodyPr>
`;
      } else {
        xml += `    <a:bodyPr ${attrs.join(" ")}/>
`;
      }
    }
  } else {
    xml += `    <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/>
`;
  }
  xml += `    <a:lstStyle/>
`;
  if (hasText) {
    const paragraphs = normalizeToParagraphsFromFields(textContent, textParagraphs);
    xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);
  } else {
    xml += `    <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`;
  }
  xml += `  </p:txBody>
`;
  xml += `</p:sp>
`;
  return { xml, hyperlinkRels };
}

// src/ooxml/drawing/text.ts
function emitBodyPr(textStyle, autoFitXml, singleLineShrinkWrapped) {
  const vertAlign = textStyle?.verticalAlign;
  const textInsets = textStyle?.textInsets;
  const textDir = textStyle?.textDirection;
  const rtl = textStyle?.rtl;
  const attrs = [
    `wrap="${singleLineShrinkWrapped ? "none" : "square"}"`,
    `rtlCol="${rtl ? "1" : "0"}"`,
    'spcFirstLastPara="0"'
  ];
  if (vertAlign) {
    attrs.push(`anchor="${VERTICAL_ALIGN_MAP[vertAlign] || "t"}"`);
  }
  if (textInsets) {
    attrs.push(`lIns="${toEmu(textInsets.left ?? 0)}"`);
    attrs.push(`tIns="${toEmu(textInsets.top ?? 0)}"`);
    attrs.push(`rIns="${toEmu(textInsets.right ?? 0)}"`);
    attrs.push(`bIns="${toEmu(textInsets.bottom ?? 0)}"`);
  } else {
    attrs.push('lIns="0"', 'tIns="0"', 'rIns="0"', 'bIns="0"');
  }
  if (textDir === "vertical") attrs.push('vert="vert270"');
  else if (textDir === "verticalEA") attrs.push('vert="eaVert"');
  if (textStyle?.columns !== void 0 && textStyle.columns > 1) {
    attrs.push(`numCol="${textStyle.columns}"`);
    if (textStyle.columnSpacing !== void 0) {
      attrs.push(`spcCol="${toEmu(textStyle.columnSpacing)}"`);
    }
  }
  const attrStr = attrs.join(" ");
  const bodyChildren = [];
  if (!isLiteBundle() && textStyle?.textWarp && textStyle.textWarp !== "textNoShape") {
    bodyChildren.push(`<a:prstTxWarp prst="${escapeXmlAttr(textStyle.textWarp)}"><a:avLst/></a:prstTxWarp>`);
  }
  if (autoFitXml) {
    bodyChildren.push(autoFitXml);
  }
  if (bodyChildren.length > 0) {
    return `    <a:bodyPr ${attrStr}>${bodyChildren.join("")}</a:bodyPr>
`;
  }
  return `    <a:bodyPr ${attrStr}/>
`;
}
function generateTextXml(node, shapeId, hyperlinkRIdStart = 100) {
  const { x, y, width, height } = node.layout;
  const textStyle = node.style;
  const bgColor = textStyle?.backgroundColor;
  const autoFitResult = node._autoFitResult;
  const insideVisualView = node._insideVisualView;
  const placeholder = node.placeholder;
  const omitTransform = node._omitTransform;
  const singleLineShrinkWrapped = node._singleLineShrinkWrappedWidth !== void 0 && Math.abs(node._singleLineShrinkWrappedWidth - width) <= 1 / 64;
  const hyperlinkRels = [];
  const hyperlinkRIdCounter = { current: hyperlinkRIdStart };
  const paragraphs = normalizeToParagraphs(node);
  let autoFitXml;
  if (isLiteBundle()) {
    autoFitXml = insideVisualView ? "" : `<a:normAutofit fontScale="100000"/>`;
  } else {
    const requestedPolicy = node.autoFit === false ? "none" : node._compatibility?.autoFitPolicy ?? (insideVisualView ? "engine_conditional" : "office_default");
    const resolvedPolicy = resolveAutoFitPolicy({
      paragraphs,
      textStyle,
      layout: node.layout,
      existingAutoFitResult: autoFitResult,
      requestedPolicy
    });
    autoFitXml = emitAutoFitXml(resolvedPolicy);
  }
  let nvPrXml;
  if (placeholder) {
    const typeAttr = placeholder.type ? ` type="${placeholder.type}"` : "";
    const idxAttr = placeholder.idx !== void 0 ? ` idx="${placeholder.idx}"` : "";
    nvPrXml = `    <p:nvPr><p:ph${typeAttr}${idxAttr}/></p:nvPr>
`;
  } else {
    nvPrXml = `    <p:nvPr/>
`;
  }
  const morphId = node.morphId;
  const decorative = node.decorative;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Text ${shapeId}`;
  let xml = `<p:sp>
`;
  xml += `  <p:nvSpPr>
`;
  if (decorative) {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}">${emitDecorativeExtXml()}</p:cNvPr>
`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"/>
`;
  }
  xml += `    <p:cNvSpPr txBox="1"/>
`;
  xml += nvPrXml;
  xml += `  </p:nvSpPr>
`;
  xml += `  <p:spPr>
`;
  if (!shouldOmitTransform(node.layout, omitTransform)) {
    xml += `    <a:xfrm>
`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
    xml += `    </a:xfrm>
`;
  }
  xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
  if (bgColor) {
    xml += `    <a:solidFill>
`;
    xml += `      ${emitColorXml(bgColor)}
`;
    xml += `    </a:solidFill>
`;
  } else {
    xml += `    <a:noFill/>
`;
  }
  xml += `    <a:ln><a:noFill/></a:ln>
`;
  xml += `  </p:spPr>
`;
  xml += `  <p:txBody>
`;
  xml += emitBodyPr(textStyle, autoFitXml, singleLineShrinkWrapped);
  xml += `    <a:lstStyle/>
`;
  xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);
  xml += `  </p:txBody>
`;
  xml += `</p:sp>
`;
  return { xml, hyperlinkRels };
}

// src/ooxml/drawing/image.ts
function generateImageXml(node, shapeId, rId, hyperlinkRIdStart = 200, svgRId) {
  const { x, y, width, height } = node.layout;
  const {
    placeholder,
    _omitTransform: omitTransform,
    crop,
    borderRadius,
    altText,
    hyperlink,
    decorative,
    locks: userLocks,
    imageEffects,
    morphId
  } = node;
  const hyperlinkRels = [];
  let nvPrXml;
  if (placeholder) {
    const typeAttr = placeholder.type ? ` type="${placeholder.type}"` : "";
    const idxAttr = placeholder.idx !== void 0 ? ` idx="${placeholder.idx}"` : "";
    nvPrXml = `    <p:nvPr><p:ph${typeAttr}${idxAttr}/></p:nvPr>
`;
  } else {
    nvPrXml = `    <p:nvPr/>
`;
  }
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Image ${shapeId}`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  let cNvPrChildren = "";
  if (hyperlink) {
    const hyperlinkRIdCounter = { current: hyperlinkRIdStart };
    const { hlinkXml } = resolveHyperlink(hyperlink, hyperlinkRels, hyperlinkRIdCounter);
    if (hlinkXml) {
      cNvPrChildren += hlinkXml;
    }
  }
  if (decorative) {
    cNvPrChildren += emitDecorativeExtXml();
  }
  const geomPreset = borderRadius && borderRadius > 0 ? "roundRect" : "rect";
  let xml = `<p:pic>
`;
  xml += `  <p:nvPicPr>
`;
  if (cNvPrChildren) {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}>${cNvPrChildren}</p:cNvPr>
`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>
`;
  }
  xml += `    <p:cNvPicPr>
`;
  const picLockDefaults = { noGrp: true, noChangeAspect: true };
  xml += `      ${emitLocksXml("a:picLocks", userLocks, picLockDefaults)}
`;
  xml += `    </p:cNvPicPr>
`;
  xml += nvPrXml;
  xml += `  </p:nvPicPr>
`;
  xml += `  <p:blipFill>
`;
  xml += `    <a:blip r:embed="${rId}">
`;
  if (imageEffects) {
    if (imageEffects.brightness !== void 0 || imageEffects.contrast !== void 0) {
      const brightAttr = imageEffects.brightness !== void 0 ? ` bright="${Math.round(imageEffects.brightness * 1e3)}"` : "";
      const contrastAttr = imageEffects.contrast !== void 0 ? ` contrast="${Math.round(imageEffects.contrast * 1e3)}"` : "";
      xml += `      <a:lum${brightAttr}${contrastAttr}/>
`;
    }
    if (imageEffects.grayscale) {
      xml += `      <a:grayscl/>
`;
    }
    if (imageEffects.biLevel !== void 0) {
      xml += `      <a:biLevel thresh="${imageEffects.biLevel}"/>
`;
    }
    if (imageEffects.duotone) {
      xml += `      <a:duotone>${emitColorXml(imageEffects.duotone.color1)}${emitColorXml(imageEffects.duotone.color2)}</a:duotone>
`;
    }
    if (imageEffects.blur !== void 0) {
      const blurRad = toEmu(imageEffects.blur);
      xml += `      <a:blur rad="${blurRad}" grow="0"/>
`;
    }
  }
  xml += `      <a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext>`;
  if (svgRId) {
    xml += `<a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${svgRId}"/></a:ext>`;
  }
  xml += `</a:extLst>
`;
  xml += `    </a:blip>
`;
  if (crop && (crop.left || crop.top || crop.right || crop.bottom)) {
    const l = Math.min(1e5, Math.max(0, Math.round((crop.left ?? 0) * 1e3)));
    const t = Math.min(1e5, Math.max(0, Math.round((crop.top ?? 0) * 1e3)));
    const r = Math.min(1e5, Math.max(0, Math.round((crop.right ?? 0) * 1e3)));
    const b = Math.min(1e5, Math.max(0, Math.round((crop.bottom ?? 0) * 1e3)));
    xml += `    <a:srcRect l="${l}" t="${t}" r="${r}" b="${b}"/>
`;
  }
  xml += `    <a:stretch><a:fillRect/></a:stretch>
`;
  xml += `  </p:blipFill>
`;
  xml += `  <p:spPr>
`;
  if (!shouldOmitTransform(node.layout, omitTransform)) {
    xml += `    <a:xfrm>
`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
    xml += `    </a:xfrm>
`;
  }
  if (geomPreset === "roundRect" && borderRadius) {
    const shorterSide = Math.min(width, height);
    const adjVal = shorterSide > 0 ? Math.round(borderRadius / shorterSide * 5e4) : 16667;
    xml += `    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adjVal}"/></a:avLst></a:prstGeom>
`;
  } else {
    xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
  }
  xml += `  </p:spPr>
`;
  xml += `</p:pic>
`;
  return { xml, hyperlinkRels };
}

// src/ooxml/drawing/table.ts
var VERTICAL_ALIGN_MAP2 = {
  top: "t",
  middle: "ctr",
  bottom: "b"
};
function emitCellBorder(border, tagName) {
  const w = toEmu(border.width ?? 1);
  const color = border.color ?? "#000000";
  return `<${tagName} w="${w}" cap="flat" cmpd="sng"><a:solidFill>${emitColorXml(color)}</a:solidFill><a:prstDash val="solid"/></${tagName}>`;
}
function resolveEffectiveCellStyle(cell, rowIndex, colIndex, totalRows, totalCols, tableStyle) {
  if (!tableStyle) return cell.style;
  let resolved = {};
  if (tableStyle.bandRow) {
    const bandStart = tableStyle.firstRow ? 1 : 0;
    if (rowIndex >= bandStart) {
      const bandIndex = rowIndex - bandStart;
      if (bandIndex % 2 === 0 && tableStyle.bandRowOddStyle) {
        resolved = { ...resolved, ...tableStyle.bandRowOddStyle };
      } else if (bandIndex % 2 === 1 && tableStyle.bandRowEvenStyle) {
        resolved = { ...resolved, ...tableStyle.bandRowEvenStyle };
      }
    }
  }
  if (tableStyle.firstRow && rowIndex === 0 && tableStyle.headerRowStyle) {
    resolved = { ...resolved, ...tableStyle.headerRowStyle };
  }
  if (tableStyle.lastRow && rowIndex === totalRows - 1 && tableStyle.footerRowStyle) {
    resolved = { ...resolved, ...tableStyle.footerRowStyle };
  }
  if (tableStyle.firstCol && colIndex === 0 && tableStyle.firstColStyle) {
    resolved = { ...resolved, ...tableStyle.firstColStyle };
  }
  if (tableStyle.lastCol && colIndex === totalCols - 1 && tableStyle.lastColStyle) {
    resolved = { ...resolved, ...tableStyle.lastColStyle };
  }
  if (tableStyle.outerBorder || tableStyle.innerBorderH || tableStyle.innerBorderV) {
    const borders = { ...resolved.borders };
    if (tableStyle.outerBorder) {
      if (rowIndex === 0) borders.top = borders.top ?? tableStyle.outerBorder;
      if (rowIndex === totalRows - 1) borders.bottom = borders.bottom ?? tableStyle.outerBorder;
      if (colIndex === 0) borders.left = borders.left ?? tableStyle.outerBorder;
      if (colIndex === totalCols - 1) borders.right = borders.right ?? tableStyle.outerBorder;
    }
    if (tableStyle.innerBorderH) {
      if (rowIndex > 0) borders.top = borders.top ?? tableStyle.innerBorderH;
      if (rowIndex < totalRows - 1) borders.bottom = borders.bottom ?? tableStyle.innerBorderH;
    }
    if (tableStyle.innerBorderV) {
      if (colIndex > 0) borders.left = borders.left ?? tableStyle.innerBorderV;
      if (colIndex < totalCols - 1) borders.right = borders.right ?? tableStyle.innerBorderV;
    }
    if (Object.keys(borders).length > 0) {
      resolved.borders = borders;
    }
  }
  if (cell.style) {
    resolved = { ...resolved, ...cell.style };
    if (cell.style.borders) {
      resolved.borders = { ...resolved.borders, ...cell.style.borders };
    }
  }
  return Object.keys(resolved).length > 0 ? resolved : void 0;
}
function emitTcPr(style) {
  if (!style) return `            <a:tcPr/>
`;
  const attrs = [];
  if (style.verticalAlign) {
    attrs.push(`anchor="${VERTICAL_ALIGN_MAP2[style.verticalAlign] || "t"}"`);
  }
  if (style.textDirection && style.textDirection !== "horizontal") {
    const vertMap = { vertical: "vert270", verticalEA: "eaVert" };
    attrs.push(`vert="${vertMap[style.textDirection]}"`);
  }
  if (style.padding !== void 0) {
    const pad = toEmu(style.padding);
    attrs.push(`marL="${pad}" marR="${pad}" marT="${pad}" marB="${pad}"`);
  }
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  const hasBorders = style.borders && (style.borders.top || style.borders.right || style.borders.bottom || style.borders.left || style.borders.diagonalDown || style.borders.diagonalUp);
  const hasFill = style.fill !== void 0;
  if (!hasBorders && !hasFill) {
    return `            <a:tcPr${attrStr}/>
`;
  }
  let xml = `            <a:tcPr${attrStr}>
`;
  if (style.borders) {
    if (style.borders.left) xml += `              ${emitCellBorder(style.borders.left, "a:lnL")}
`;
    if (style.borders.right) xml += `              ${emitCellBorder(style.borders.right, "a:lnR")}
`;
    if (style.borders.top) xml += `              ${emitCellBorder(style.borders.top, "a:lnT")}
`;
    if (style.borders.bottom) xml += `              ${emitCellBorder(style.borders.bottom, "a:lnB")}
`;
    if (style.borders.diagonalDown) xml += `              ${emitCellBorder(style.borders.diagonalDown, "a:lnTlToBr")}
`;
    if (style.borders.diagonalUp) xml += `              ${emitCellBorder(style.borders.diagonalUp, "a:lnBlToTr")}
`;
  }
  if (style.fill !== void 0) {
    if (typeof style.fill === "object" && "type" in style.fill) {
      const gf = style.fill;
      xml += `              <a:gradFill><a:gsLst>`;
      for (const stop of gf.stops) {
        const pos = Math.min(1e5, Math.max(0, Math.round(stop.position * 1e3)));
        xml += `<a:gs pos="${pos}">${stop.alpha !== void 0 ? emitColorWithAlpha(stop.color, stop.alpha) : emitColorXml(stop.color)}</a:gs>`;
      }
      xml += `</a:gsLst>`;
      if (gf.type === "linear") {
        const ang = cssAngleToOoxml(gf.angle ?? 180);
        xml += `<a:lin ang="${ang}" scaled="1"/>`;
      } else {
        xml += `<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>`;
      }
      xml += `</a:gradFill>
`;
    } else {
      xml += `              <a:solidFill>${emitColorXml(style.fill)}</a:solidFill>
`;
    }
  }
  xml += `            </a:tcPr>
`;
  return xml;
}
function emitCellText(cell, hyperlinkRels, hyperlinkRIdCounter, effectiveStyle) {
  const style = effectiveStyle ?? cell.style;
  const rtlCol = style?.rtl ? "1" : "0";
  const textStyle = style ? {
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontFallback: style.fontFallback,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    textAlign: style.textAlign,
    rtl: style.rtl,
    lang: style.lang
  } : void 0;
  if (cell.paragraphs || cell.content) {
    const paragraphs2 = normalizeToParagraphsFromFields(
      cell.content,
      cell.paragraphs
    );
    let xml2 = `            <a:txBody>
`;
    xml2 += `              <a:bodyPr rtlCol="${rtlCol}" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`;
    xml2 += emitParagraphsXml(paragraphs2, textStyle, hyperlinkRels, hyperlinkRIdCounter);
    xml2 += `            </a:txBody>
`;
    return xml2;
  }
  const text = cell.text ?? "";
  const paragraphs = normalizeToParagraphsFromFields(
    [{ text }],
    void 0
  ).map((paragraph) => ({
    ...paragraph,
    align: style?.textAlign,
    rtl: style?.rtl
  }));
  let xml = `            <a:txBody>
`;
  xml += `              <a:bodyPr rtlCol="${rtlCol}" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`;
  xml += emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter);
  xml += `            </a:txBody>
`;
  return xml;
}
function generateTableXml(node, shapeId, hyperlinkRIdStart = 200) {
  const { x, y, width, height } = node.layout;
  const tableData = node.tableData;
  const tablePlan = tableData ? planTableLayout(tableData, width, height) : void 0;
  const frameHeight = tablePlan ? Math.max(height, tablePlan.totalAssignedHeight) : height;
  const columns = tableData ? resolveTableColumns(tableData, width) : [];
  const rows = tableData?.rows ?? [];
  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Table ${shapeId}`;
  const altText = node.altText;
  const hyperlinkRels = [];
  const hyperlinkRIdCounter = { current: hyperlinkRIdStart };
  let xml = `<p:graphicFrame>
`;
  xml += `  <p:nvGraphicFramePr>
`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>
`;
  xml += `    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
`;
  xml += `    <p:nvPr/>
`;
  xml += `  </p:nvGraphicFramePr>
`;
  xml += `  <p:xfrm>
`;
  xml += `    <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
  xml += `    <a:ext cx="${toEmu(width)}" cy="${toEmu(frameHeight)}"/>
`;
  xml += `  </p:xfrm>
`;
  xml += `  <a:graphic>
`;
  xml += `    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
`;
  xml += `      <a:tbl>
`;
  const tableStyle = tableData?.style;
  const tblPrAttrs = [];
  if (tableStyle?.firstRow) tblPrAttrs.push('firstRow="1"');
  else tblPrAttrs.push('firstRow="0"');
  if (tableStyle?.lastRow) tblPrAttrs.push('lastRow="1"');
  if (tableStyle?.firstCol) tblPrAttrs.push('firstCol="1"');
  if (tableStyle?.lastCol) tblPrAttrs.push('lastCol="1"');
  if (tableStyle?.bandRow) tblPrAttrs.push('bandRow="1"');
  else tblPrAttrs.push('bandRow="0"');
  if (tableStyle?.bandCol) tblPrAttrs.push('bandCol="1"');
  xml += `        <a:tblPr ${tblPrAttrs.join(" ")}/>
`;
  xml += `        <a:tblGrid>
`;
  for (const colWidth of columns) {
    xml += `          <a:gridCol w="${toEmu(colWidth)}"/>
`;
  }
  xml += `        </a:tblGrid>
`;
  if (rows.length === 0) {
    xml += `        <a:tr h="${toEmu(30)}">
`;
    xml += `          <a:tc>
`;
    xml += `            <a:txBody>
`;
    xml += `              <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`;
    xml += `              <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`;
    xml += `            </a:txBody>
`;
    xml += `            <a:tcPr/>
`;
    xml += `          </a:tc>
`;
    xml += `        </a:tr>
`;
  }
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowHeight = tablePlan?.rows[rowIdx]?.assignedHeight ?? row.minHeight ?? row.height ?? 30;
    const rowHeightEmu = toEmu(Math.max(rowHeight, 1));
    xml += `        <a:tr h="${rowHeightEmu}">
`;
    if (row.cells.length !== columns.length) {
      getLogger().warn(
        `[table] Row ${rowIdx} has ${row.cells.length} cells but table has ${columns.length} columns \u2014 padding/truncating to match`
      );
    }
    const cellCount = Math.min(row.cells.length, columns.length);
    for (let colIdx = 0; colIdx < cellCount; colIdx++) {
      const cell = row.cells[colIdx];
      const effectiveStyle = resolveEffectiveCellStyle(cell, rowIdx, colIdx, rows.length, columns.length, tableStyle);
      const lite = isLiteBundle();
      const hasMerge = (cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1 || cell.vMerge || cell.hMerge;
      if (lite && hasMerge) {
        getLogger().warn(`[table] Merged table cells flattened in free mode (row ${rowIdx}, col ${colIdx})`);
      }
      const gridSpanAttr = !lite && (cell.colSpan ?? 1) > 1 ? ` gridSpan="${cell.colSpan}"` : "";
      const rowSpanAttr = !lite && (cell.rowSpan ?? 1) > 1 ? ` rowSpan="${cell.rowSpan}"` : "";
      const vMergeAttr = !lite && cell.vMerge ? ` vMerge="1"` : "";
      const hMergeAttr = !lite && cell.hMerge ? ` hMerge="1"` : "";
      xml += `          <a:tc${gridSpanAttr}${rowSpanAttr}${vMergeAttr}${hMergeAttr}>
`;
      xml += emitCellText(cell, hyperlinkRels, hyperlinkRIdCounter, effectiveStyle);
      xml += emitTcPr(effectiveStyle);
      xml += `          </a:tc>
`;
    }
    for (let colIdx = cellCount; colIdx < columns.length; colIdx++) {
      xml += `          <a:tc>
`;
      xml += `            <a:txBody>
`;
      xml += `              <a:bodyPr rtlCol="0" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>
`;
      xml += `              <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`;
      xml += `            </a:txBody>
`;
      xml += `            <a:tcPr/>
`;
      xml += `          </a:tc>
`;
    }
    xml += `        </a:tr>
`;
  }
  xml += `      </a:tbl>
`;
  xml += `    </a:graphicData>
`;
  xml += `  </a:graphic>
`;
  xml += `</p:graphicFrame>
`;
  return { xml, hyperlinkRels };
}

// src/ooxml/drawing/chart.ts
function generateChartAlternateContentXml(node, shapeId, chartRId, fallbackImageRId, isChartEx) {
  const chartFrameXml = isChartEx ? generateChartExFrameXml(node, shapeId, chartRId) : generateChartFrameXml(node, shapeId, chartRId);
  const requiresAttr = isChartEx ? "cx" : "c";
  const requiresNs = isChartEx ? `xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"` : `xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"`;
  const { x, y, width, height } = node.layout;
  const fallbackShapeId = shapeId + 1e5;
  let xml = `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ${requiresNs}>
`;
  xml += `  <mc:Choice Requires="${requiresAttr}">
`;
  xml += chartFrameXml;
  xml += `  </mc:Choice>
`;
  xml += `  <mc:Fallback>
`;
  xml += `    <p:pic>
`;
  xml += `      <p:nvPicPr>
`;
  xml += `        <p:cNvPr id="${fallbackShapeId}" name="Chart Fallback"/>
`;
  xml += `        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`;
  xml += `        <p:nvPr/>
`;
  xml += `      </p:nvPicPr>
`;
  xml += `      <p:blipFill>
`;
  xml += `        <a:blip r:embed="${fallbackImageRId}"/>
`;
  xml += `        <a:stretch><a:fillRect/></a:stretch>
`;
  xml += `      </p:blipFill>
`;
  xml += `      <p:spPr>
`;
  xml += `        <a:xfrm>
`;
  xml += `          <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
  xml += `          <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
  xml += `        </a:xfrm>
`;
  xml += `        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
  xml += `      </p:spPr>
`;
  xml += `    </p:pic>
`;
  xml += `  </mc:Fallback>
`;
  xml += `</mc:AlternateContent>
`;
  return xml;
}
function generateChartFallbackImageXml(node, shapeId, fallbackImageRId) {
  const { x, y, width, height } = node.layout;
  let xml = `<p:pic>
`;
  xml += `  <p:nvPicPr>
`;
  xml += `    <p:cNvPr id="${shapeId}" name="Chart Fallback"/>
`;
  xml += `    <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`;
  xml += `    <p:nvPr/>
`;
  xml += `  </p:nvPicPr>
`;
  xml += `  <p:blipFill>
`;
  xml += `    <a:blip r:embed="${fallbackImageRId}"/>
`;
  xml += `    <a:stretch><a:fillRect/></a:stretch>
`;
  xml += `  </p:blipFill>
`;
  xml += `  <p:spPr>
`;
  xml += `    <a:xfrm>
`;
  xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
  xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
  xml += `    </a:xfrm>
`;
  xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
  xml += `  </p:spPr>
`;
  xml += `</p:pic>
`;
  return xml;
}
function generateChartFrameXml(node, shapeId, chartRId) {
  const { x, y, width, height } = node.layout;
  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Chart ${shapeId}`;
  const altText = node.altText;
  let xml = `<p:graphicFrame>
`;
  xml += `  <p:nvGraphicFramePr>
`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>
`;
  xml += `    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
`;
  xml += `    <p:nvPr/>
`;
  xml += `  </p:nvGraphicFramePr>
`;
  xml += `  <p:xfrm>
`;
  xml += `    <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
  xml += `    <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
  xml += `  </p:xfrm>
`;
  xml += `  <a:graphic>
`;
  xml += `    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
`;
  xml += `      <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chartRId}"/>
`;
  xml += `    </a:graphicData>
`;
  xml += `  </a:graphic>
`;
  xml += `</p:graphicFrame>
`;
  return xml;
}
function generateChartExFrameXml(node, shapeId, chartRId) {
  const { x, y, width, height } = node.layout;
  const morphId = node.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Chart ${shapeId}`;
  const altText = node.altText;
  let xml = `<p:graphicFrame>
`;
  xml += `  <p:nvGraphicFramePr>
`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>
`;
  xml += `    <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
`;
  xml += `    <p:nvPr/>
`;
  xml += `  </p:nvGraphicFramePr>
`;
  xml += `  <p:xfrm>
`;
  xml += `    <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
  xml += `    <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
  xml += `  </p:xfrm>
`;
  xml += `  <a:graphic>
`;
  xml += `    <a:graphicData uri="http://schemas.microsoft.com/office/drawing/2014/chartex">
`;
  xml += `      <cx:chart xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${chartRId}"/>
`;
  xml += `    </a:graphicData>
`;
  xml += `  </a:graphic>
`;
  xml += `</p:graphicFrame>
`;
  return xml;
}

// src/ooxml/drawing/connector.ts
var CONNECTOR_PRESET_MAP = {
  straight: "line",
  elbow: "bentConnector3",
  curved: "curvedConnector3"
};
function generateConnectorXml(connector, shapeId) {
  const { start, end, connectorType, arrowStart, arrowEnd } = connector;
  const morphId = connector.morphId;
  const shapeName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Connector ${shapeId}`;
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);
  const bboxWidth = maxX - minX || 1;
  const bboxHeight = maxY - minY || 1;
  const flipH = end.x < start.x;
  const flipV = end.y < start.y;
  const prst = CONNECTOR_PRESET_MAP[connectorType] ?? "line";
  const lineWidth = connector.lineWidth ?? 1;
  const lineColor = connector.lineColor ?? "#000000";
  const dashStyle = connector.lineDashStyle;
  const xfrmAttrs = [];
  if (flipH) xfrmAttrs.push('flipH="1"');
  if (flipV) xfrmAttrs.push('flipV="1"');
  const xfrmAttrStr = xfrmAttrs.length > 0 ? " " + xfrmAttrs.join(" ") : "";
  const altText = connector.altText;
  const decorative = connector.decorative;
  const userLocks = connector.locks;
  let xml = `<p:cxnSp>
`;
  xml += `  <p:nvCxnSpPr>
`;
  const descrAttr = altText ? ` descr="${escapeXmlAttr(altText)}"` : "";
  if (decorative) {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}>${emitDecorativeExtXml()}</p:cNvPr>
`;
  } else {
    xml += `    <p:cNvPr id="${shapeId}" name="${shapeName}"${descrAttr}/>
`;
  }
  const hasStartShape = connector.startShape !== void 0;
  const hasEndShape = connector.endShape !== void 0;
  const hasLocks = userLocks !== void 0;
  if (hasStartShape || hasEndShape || hasLocks) {
    xml += `    <p:cNvCxnSpPr>`;
    if (hasLocks) xml += emitLocksXml("a:cxnSpLocks", userLocks);
    if (hasStartShape) {
      xml += `<a:stCxn id="${connector.startShape.shapeId}" idx="${connector.startShape.site ?? 0}"/>`;
    }
    if (hasEndShape) {
      xml += `<a:endCxn id="${connector.endShape.shapeId}" idx="${connector.endShape.site ?? 0}"/>`;
    }
    xml += `</p:cNvCxnSpPr>
`;
  } else {
    xml += `    <p:cNvCxnSpPr/>
`;
  }
  xml += `    <p:nvPr/>
`;
  xml += `  </p:nvCxnSpPr>
`;
  xml += `  <p:spPr>
`;
  xml += `    <a:xfrm${xfrmAttrStr}>
`;
  xml += `      <a:off x="${toEmu(minX)}" y="${toEmu(minY)}"/>
`;
  xml += `      <a:ext cx="${toEmu(bboxWidth)}" cy="${toEmu(bboxHeight)}"/>
`;
  xml += `    </a:xfrm>
`;
  xml += `    <a:prstGeom prst="${escapeXmlAttr(prst)}"><a:avLst/></a:prstGeom>
`;
  const lineWidthEmu = toEmu(lineWidth);
  xml += `    <a:ln w="${lineWidthEmu}">
`;
  xml += `      <a:solidFill>${emitColorXml(lineColor)}</a:solidFill>
`;
  if (dashStyle && dashStyle !== "solid") {
    const dashMap = { dashed: "dash", dotted: "dot", dotDash: "dashDot" };
    xml += `      <a:prstDash val="${dashMap[dashStyle] || "solid"}"/>
`;
  }
  if (arrowStart) {
    if (typeof arrowStart === "object") {
      const cfg = arrowStart;
      const wAttr = cfg.width ? ` w="${escapeXmlAttr(cfg.width)}"` : "";
      const lenAttr = cfg.length ? ` len="${escapeXmlAttr(cfg.length)}"` : "";
      xml += `      <a:headEnd type="${escapeXmlAttr(cfg.type)}"${wAttr}${lenAttr}/>
`;
    } else {
      xml += `      <a:headEnd type="triangle"/>
`;
    }
  }
  if (arrowEnd) {
    if (typeof arrowEnd === "object") {
      const cfg = arrowEnd;
      const wAttr = cfg.width ? ` w="${escapeXmlAttr(cfg.width)}"` : "";
      const lenAttr = cfg.length ? ` len="${escapeXmlAttr(cfg.length)}"` : "";
      xml += `      <a:tailEnd type="${escapeXmlAttr(cfg.type)}"${wAttr}${lenAttr}/>
`;
    } else {
      xml += `      <a:tailEnd type="triangle"/>
`;
    }
  }
  xml += `    </a:ln>
`;
  xml += `  </p:spPr>
`;
  xml += `</p:cxnSp>
`;
  return xml;
}

// src/ooxml/drawing/webVideo.ts
function generateWebVideoXml(node, shapeId, webVideo, posterRId) {
  const { x, y, width, height } = node.layout;
  const name = `Web Video ${shapeId}`;
  const altText = node.altText ? ` descr="${escapeXmlAttr(node.altText)}"` : "";
  const fallbackShapeId = shapeId + 1e5;
  let xml = `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
`;
  xml += `  <mc:Choice Requires="we">
`;
  xml += `    <p:pic>
`;
  xml += `      <p:nvPicPr>
`;
  xml += `        <p:cNvPr id="${shapeId}" name="${name}"${altText}>
`;
  xml += `          <a:hlinkClick r:id="${webVideo.hyperlinkRId}"/>
`;
  xml += `        </p:cNvPr>
`;
  xml += `        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`;
  xml += `        <p:nvPr>
`;
  xml += `          <p:extLst>
`;
  xml += `            <p:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}">
`;
  xml += `              <we:webextension xmlns:we="http://schemas.microsoft.com/office/webextensions/webextension/2010/11">
`;
  xml += `                <we:webvideo h="${toEmu(height)}" w="${toEmu(width)}" src="${escapeXmlAttr(webVideo.embedUrl)}"/>
`;
  xml += `              </we:webextension>
`;
  xml += `            </p:ext>
`;
  xml += `          </p:extLst>
`;
  xml += `        </p:nvPr>
`;
  xml += `      </p:nvPicPr>
`;
  xml += `      <p:blipFill>
`;
  xml += posterRId ? `        <a:blip r:embed="${posterRId}"/>
` : `        <a:blip/>
`;
  xml += `        <a:stretch><a:fillRect/></a:stretch>
`;
  xml += `      </p:blipFill>
`;
  xml += `      <p:spPr>
`;
  xml += `        <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/></a:xfrm>
`;
  xml += `        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
  xml += `      </p:spPr>
`;
  xml += `    </p:pic>
`;
  xml += `  </mc:Choice>
`;
  xml += `  <mc:Fallback>
`;
  xml += `    <p:pic>
`;
  xml += `      <p:nvPicPr>
`;
  xml += `        <p:cNvPr id="${fallbackShapeId}" name="Video Fallback">
`;
  xml += `          <a:hlinkClick r:id="${webVideo.hyperlinkRId}"/>
`;
  xml += `        </p:cNvPr>
`;
  xml += `        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
`;
  xml += `        <p:nvPr/>
`;
  xml += `      </p:nvPicPr>
`;
  xml += `      <p:blipFill>
`;
  xml += posterRId ? `        <a:blip r:embed="${posterRId}"/>
` : `        <a:blip/>
`;
  xml += `        <a:stretch><a:fillRect/></a:stretch>
`;
  xml += `      </p:blipFill>
`;
  xml += `      <p:spPr>
`;
  xml += `        <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/></a:xfrm>
`;
  xml += `        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
  xml += `      </p:spPr>
`;
  xml += `    </p:pic>
`;
  xml += `  </mc:Fallback>
`;
  xml += `</mc:AlternateContent>
`;
  return xml;
}

// src/ooxml/drawing/orchestrator.ts
function withRelativeLayout(child, parentX, parentY) {
  return {
    ...child,
    layout: {
      ...child.layout,
      x: child.layout.x - parentX,
      y: child.layout.y - parentY
    },
    children: child.children ? child.children.map((c) => withRelativeLayout(c, parentX, parentY)) : void 0
  };
}
function countVideoAudioRelationshipSlots(videoMediaInfo, audioMediaInfo) {
  let count = 0;
  for (const video of videoMediaInfo) {
    if (video.webVideo) {
      count += 1;
      if (video.posterRId) count += 1;
      continue;
    }
    count += 2;
    if (video.posterRId) count += 1;
  }
  return count + audioMediaInfo.length * 2;
}
function countChartRelationshipSlots(chartAssets, chartRIds, chartFallbackRIds) {
  if (chartAssets.length > 0) {
    return chartAssets.reduce((count2, chart) => {
      let next = count2;
      if (chart.rId) next += 1;
      if (chart.fallbackRId) next += 1;
      return next;
    }, 0);
  }
  let count = 0;
  for (const rId of chartRIds) {
    if (rId) count += 1;
  }
  for (const fallbackRId of chartFallbackRIds) {
    if (fallbackRId) count += 1;
  }
  return count;
}
function computeDefaultHyperlinkRIdStart(opts) {
  const videoAudioCount = countVideoAudioRelationshipSlots(opts.videoMediaInfo, opts.audioMediaInfo);
  const chartStart = 2 + opts.mediaRIds.length + opts.fillMediaRIds.length + videoAudioCount + opts.svgRIds.length;
  return chartStart + countChartRelationshipSlots(opts.chartAssets, opts.chartRIds, opts.chartFallbackRIds);
}
function serializeSlideTree(node, opts = {}) {
  const idCounter = opts.idCounter ?? { current: 2 };
  const mediaRIds = opts.mediaRIds ?? [];
  const imageCounter = opts.imageCounter ?? { current: 0 };
  const chartRIds = opts.chartRIds ?? [];
  const chartCounter = opts.chartCounter ?? { current: 0 };
  const fillMediaRIds = opts.fillMediaRIds ?? [];
  const fillImageCounter = opts.fillImageCounter ?? { current: 0 };
  const videoMediaInfo = opts.videoMediaInfo ?? [];
  const videoCounter = opts.videoCounter ?? { current: 0 };
  const audioMediaInfo = opts.audioMediaInfo ?? [];
  const audioCounter = opts.audioCounter ?? { current: 0 };
  const chartAssets = opts.chartAssets ?? [];
  const chartFallbackRIds = opts.chartFallbackRIds ?? [];
  const svgRIds = opts.svgRIds ?? [];
  const svgCounter = opts.svgCounter ?? { current: 0 };
  const hyperlinkRIdStart = opts.hyperlinkRIdStart ?? computeDefaultHyperlinkRIdStart({
    mediaRIds,
    fillMediaRIds,
    videoMediaInfo,
    audioMediaInfo,
    chartAssets,
    chartRIds,
    chartFallbackRIds,
    svgRIds
  });
  let xml = "";
  const allHyperlinkRels = [];
  let currentHyperlinkRId = hyperlinkRIdStart;
  const allAnimations = [];
  const allChartBuilds = [];
  const allMediaPlayback = [];
  const emittedShapeIds = /* @__PURE__ */ new Set();
  function getAnimationTargetInfo(node2) {
    if (node2.type === "Text") {
      const paragraphs = normalizeToParagraphsFromFields(node2.content, node2.paragraphs);
      return {
        kind: "text",
        textTarget: {
          paragraphCount: paragraphs.length,
          paragraphLevels: paragraphs.map((paragraph) => paragraph.level ?? 0)
        }
      };
    }
    if (node2.type === "View") {
      if (node2.textContent !== void 0 || node2.textParagraphs && node2.textParagraphs.length > 0) {
        const paragraphs = normalizeToParagraphsFromFields(node2.textContent, node2.textParagraphs);
        return {
          kind: "text",
          textTarget: {
            paragraphCount: paragraphs.length,
            paragraphLevels: paragraphs.map((paragraph) => paragraph.level ?? 0)
          }
        };
      }
    }
    return { kind: "shape" };
  }
  function collectAnimations(node2, shapeId) {
    emittedShapeIds.add(shapeId);
    const target = getAnimationTargetInfo(node2);
    if ("animations" in node2 && node2.animations) {
      for (const a of node2.animations) {
        allAnimations.push({ shapeId, effect: a.effect, animation: a, target });
      }
    }
    if ("animationGroups" in node2 && node2.animationGroups) {
      for (const group of node2.animationGroups) {
        for (const a of group.animations) {
          const animation = { ...a, trigger: a.trigger ?? group.trigger ?? "onClick" };
          allAnimations.push({ shapeId, effect: animation.effect, animation, target });
        }
      }
    }
  }
  function handleViewOrSlide(node2) {
    if (hasVisualProperties(node2)) {
      const shapeId = idCounter.current++;
      let imageFillRId;
      const fill = node2.style?.fill;
      if (fill?.type === "image") {
        const idx = fillImageCounter.current++;
        imageFillRId = fillMediaRIds[idx];
        if (imageFillRId === void 0) {
          getLogger().warn(`[orchestrator] Image fill rId out of bounds: index ${idx} >= fillMediaRIds.length ${fillMediaRIds.length}`);
        }
      }
      const result = generateShapeXml(node2, shapeId, currentHyperlinkRId, imageFillRId);
      xml += result.xml;
      allHyperlinkRels.push(...result.hyperlinkRels);
      currentHyperlinkRId += result.hyperlinkRels.length;
      collectAnimations(node2, shapeId);
    }
    if (node2.children) {
      const insideVisual = hasVisualProperties(node2) || node2._insideVisualView;
      for (const child of node2.children) {
        if (insideVisual) {
          child._insideVisualView = true;
        }
        recurse(child);
      }
    }
  }
  function handleText(node2) {
    const shapeId = idCounter.current++;
    const result = generateTextXml(node2, shapeId, currentHyperlinkRId);
    xml += result.xml;
    allHyperlinkRels.push(...result.hyperlinkRels);
    currentHyperlinkRId += result.hyperlinkRels.length;
    collectAnimations(node2, shapeId);
  }
  function handleImage(node2) {
    const imgIdx = imageCounter.current++;
    const rId = mediaRIds[imgIdx];
    if (rId === void 0 && mediaRIds.length > 0) {
      getLogger().warn(`[orchestrator] Image rId out of bounds: index ${imgIdx} >= mediaRIds.length ${mediaRIds.length}`);
    }
    if (rId !== void 0) {
      const shapeId = idCounter.current++;
      const svgIdx = node2.svgSrc ? svgCounter.current++ : -1;
      if (svgIdx >= 0 && svgIdx >= svgRIds.length) {
        getLogger().warn(`[orchestrator] SVG rId out of bounds: index ${svgIdx} >= svgRIds.length ${svgRIds.length}`);
      }
      const nodeSvgRId = svgIdx >= 0 ? svgRIds[svgIdx] : void 0;
      const result = generateImageXml(node2, shapeId, rId, currentHyperlinkRId, nodeSvgRId);
      xml += result.xml;
      allHyperlinkRels.push(...result.hyperlinkRels);
      currentHyperlinkRId += result.hyperlinkRels.length;
      collectAnimations(node2, shapeId);
    }
  }
  function handleTable(node2) {
    const shapeId = idCounter.current++;
    const result = generateTableXml(node2, shapeId, currentHyperlinkRId);
    xml += result.xml;
    allHyperlinkRels.push(...result.hyperlinkRels);
    currentHyperlinkRId += result.hyperlinkRels.length;
    collectAnimations(node2, shapeId);
  }
  function handleChart(node2) {
    const chartIdx = chartCounter.current++;
    const chartAsset = chartAssets[chartIdx];
    const rId = chartAsset?.rId ?? chartRIds[chartIdx];
    if (rId === void 0 && chartRIds.length > 0 && chartAsset?.renderMode !== "image-only") {
      getLogger().warn(`[orchestrator] Chart rId out of bounds: index ${chartIdx} >= chartRIds.length ${chartRIds.length}`);
    }
    const fallbackRId = chartAsset?.fallbackRId ?? chartFallbackRIds[chartIdx];
    const usesChartEx = chartAsset?.isChartEx ?? isChartExType(node2.chartData.chartType);
    const renderMode = chartAsset?.renderMode;
    const imageOnlyFallback = node2._compatibility?.mode === "visual_fallback" || renderMode === "image-only";
    if (rId !== void 0 || fallbackRId !== void 0) {
      const shapeId = idCounter.current++;
      if (imageOnlyFallback && fallbackRId) {
        xml += generateChartFallbackImageXml(node2, shapeId, fallbackRId);
      } else if (fallbackRId && rId) {
        xml += generateChartAlternateContentXml(node2, shapeId, rId, fallbackRId, usesChartEx);
      } else if (rId && usesChartEx) {
        xml += generateChartExFrameXml(node2, shapeId, rId);
      } else if (rId) {
        xml += generateChartFrameXml(node2, shapeId, rId);
      } else if (fallbackRId) {
        xml += generateChartFallbackImageXml(node2, shapeId, fallbackRId);
      }
      collectAnimations(node2, shapeId);
      const resolved = resolveChartAnnotations(node2.chartData, {
        x: node2.layout.x,
        y: node2.layout.y,
        width: node2.layout.width,
        height: node2.layout.height
      });
      for (const conn of resolved.connectors) {
        const connId = idCounter.current++;
        xml += generateConnectorXml(conn, connId);
      }
      for (const lbl of resolved.labels) {
        const lblId = idCounter.current++;
        const styleAny = lbl.style;
        const labelLayout = {
          x: styleAny?.left ?? node2.layout.x,
          y: styleAny?.top ?? node2.layout.y,
          width: styleAny?.width ?? 0,
          height: styleAny?.height ?? 0
        };
        const lblNode = { ...lbl, layout: labelLayout };
        const lblResult = generateTextXml(lblNode, lblId, currentHyperlinkRId);
        xml += lblResult.xml;
        allHyperlinkRels.push(...lblResult.hyperlinkRels);
        currentHyperlinkRId += lblResult.hyperlinkRels.length;
      }
      const chartAnim = node2.chartAnimation;
      if (chartAnim) {
        const effect = chartAnim.effect ?? "appear";
        allAnimations.push({
          shapeId,
          effect,
          animation: {
            trigger: chartAnim.trigger ?? "onClick",
            effect,
            duration: chartAnim.duration ?? 500,
            type: "entrance"
          },
          target: { kind: "shape" }
        });
      }
    }
  }
  function handleConnector(node2) {
    const shapeId = idCounter.current++;
    xml += generateConnectorXml(node2, shapeId);
    collectAnimations(node2, shapeId);
  }
  function handleGroup(node2) {
    const { x, y, width, height } = node2.layout;
    const shapeId = idCounter.current++;
    const morphId = node2.morphId;
    const groupName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Group ${shapeId}`;
    const groupAltText = node2.altText;
    const groupDecorative = node2.decorative;
    const groupLocks = node2.locks;
    xml += `<p:grpSp>
`;
    xml += `  <p:nvGrpSpPr>
`;
    const grpDescrAttr = groupAltText ? ` descr="${escapeXmlAttr(groupAltText)}"` : "";
    if (groupDecorative) {
      xml += `    <p:cNvPr id="${shapeId}" name="${groupName}"${grpDescrAttr}>${emitDecorativeExtXml()}</p:cNvPr>
`;
    } else {
      xml += `    <p:cNvPr id="${shapeId}" name="${groupName}"${grpDescrAttr}/>
`;
    }
    xml += `    <p:cNvGrpSpPr>${emitLocksXml("a:grpSpLocks", groupLocks, { noGrp: true })}</p:cNvGrpSpPr>
`;
    xml += `    <p:nvPr/>
`;
    xml += `  </p:nvGrpSpPr>
`;
    xml += `  <p:grpSpPr>
`;
    xml += `    <a:xfrm>
`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
    xml += `      <a:chOff x="0" y="0"/>
`;
    xml += `      <a:chExt cx="${toEmu(width)}" cy="${toEmu(height)}"/>
`;
    xml += `    </a:xfrm>
`;
    xml += `  </p:grpSpPr>
`;
    collectAnimations(node2, shapeId);
    if (node2.children) {
      for (const child of node2.children) {
        recurse(withRelativeLayout(child, x, y));
      }
    }
    xml += `</p:grpSp>
`;
  }
  function handleVideoOrAudio(node2) {
    const isVideo = node2.type === "Video";
    const mediaInfo = isVideo ? videoMediaInfo[videoCounter.current++] : audioMediaInfo[audioCounter.current++];
    const shapeId = idCounter.current++;
    const { x, y, width, height } = node2.layout;
    const mediaAltText = node2.altText;
    const mediaDescr = mediaAltText ? ` descr="${escapeXmlAttr(mediaAltText)}"` : "";
    const mediaName = `${node2.type} ${shapeId}`;
    const playback = node2.playback;
    const videoWebVideo = isVideo ? mediaInfo?.webVideo : void 0;
    if (isVideo && videoWebVideo) {
      xml += generateWebVideoXml(
        node2,
        shapeId,
        videoWebVideo,
        mediaInfo.posterRId
      );
    } else if (mediaInfo) {
      const linkRId = isVideo ? mediaInfo.videoRId : mediaInfo.audioRId;
      const embedRId = mediaInfo.mediaRId;
      const posterRId = isVideo ? mediaInfo.posterRId : void 0;
      xml += `<p:pic>
`;
      xml += `  <p:nvPicPr>
`;
      xml += `    <p:cNvPr id="${shapeId}" name="${mediaName}"${mediaDescr}>
`;
      xml += `      <a:hlinkClick r:id="" action="ppaction://media"/>
`;
      xml += `    </p:cNvPr>
`;
      xml += `    <p:cNvPicPr>
`;
      xml += `      <a:picLocks noChangeAspect="1"/>
`;
      xml += `    </p:cNvPicPr>
`;
      xml += `    <p:nvPr>
`;
      xml += `      <a:${isVideo ? "video" : "audio"}File r:link="${linkRId}"/>
`;
      xml += `      <p:extLst>
`;
      xml += `        <p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">
`;
      const hasTrim = playback && (playback.trimStart !== void 0 || playback.trimEnd !== void 0);
      if (hasTrim) {
        xml += `          <p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${embedRId}">`;
        xml += `<p14:trim st="${playback.trimStart ?? 0}" end="${playback.trimEnd ?? 0}"/>`;
        xml += `</p14:media>
`;
      } else {
        xml += `          <p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${embedRId}"/>
`;
      }
      xml += `        </p:ext>
`;
      xml += `      </p:extLst>
`;
      xml += `    </p:nvPr>
`;
      xml += `  </p:nvPicPr>
`;
      xml += `  <p:blipFill>
`;
      xml += posterRId ? `    <a:blip r:embed="${posterRId}"/>
` : `    <a:blip/>
`;
      xml += `    <a:stretch><a:fillRect/></a:stretch>
`;
      xml += `  </p:blipFill>
`;
      xml += `  <p:spPr>
`;
      xml += `    <a:xfrm>
`;
      const effectiveWidth = !isVideo && node2.icon === "none" ? 0 : width;
      const effectiveHeight = !isVideo && node2.icon === "none" ? 0 : height;
      xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>
`;
      xml += `      <a:ext cx="${toEmu(effectiveWidth)}" cy="${toEmu(effectiveHeight)}"/>
`;
      xml += `    </a:xfrm>
`;
      xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
      xml += `  </p:spPr>
`;
      xml += `</p:pic>
`;
      if (playback) {
        allMediaPlayback.push({
          shapeId,
          mediaType: isVideo ? "video" : "audio",
          playback,
          playAcrossSlides: !isVideo ? node2.playAcrossSlides : void 0
        });
      }
    } else {
      xml += `<p:sp>
`;
      xml += `  <p:nvSpPr>
`;
      xml += `    <p:cNvPr id="${shapeId}" name="${mediaName}"${mediaDescr}/>
`;
      xml += `    <p:cNvSpPr/>
`;
      xml += `    <p:nvPr/>
`;
      xml += `  </p:nvSpPr>
`;
      xml += `  <p:spPr>
`;
      xml += `    <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/></a:xfrm>
`;
      xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
`;
      xml += `    <a:noFill/>
`;
      xml += `    <a:ln><a:noFill/><a:round/></a:ln>
`;
      xml += `  </p:spPr>
`;
      xml += `  <p:txBody>
`;
      xml += `    <a:bodyPr rtlCol="0"/>
`;
      xml += `    <a:lstStyle/>
`;
      xml += `    <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>
`;
      xml += `  </p:txBody>
`;
      xml += `</p:sp>
`;
    }
    collectAnimations(node2, shapeId);
  }
  const SERIALIZERS = {
    View: (node2) => handleViewOrSlide(node2),
    Slide: (node2) => handleViewOrSlide(node2),
    Text: (node2) => handleText(node2),
    Image: (node2) => handleImage(node2),
    Table: (node2) => handleTable(node2),
    Chart: (node2) => handleChart(node2),
    Connector: (node2) => handleConnector(node2),
    Group: (node2) => handleGroup(node2),
    Video: (node2) => handleVideoOrAudio(node2),
    Audio: (node2) => handleVideoOrAudio(node2)
  };
  function recurse(node2) {
    if (node2.style?.display === "none") return;
    const handler = SERIALIZERS[node2.type];
    if (handler) {
      handler(node2);
      return;
    }
    getLogger().warn(
      `[orchestrator] UNKNOWN_NODE_TYPE: no serializer registered for node.type="${node2.type}". Node was dropped from slide XML.`
    );
  }
  recurse(node);
  return { xml, hyperlinkRels: allHyperlinkRels, animationManifest: allAnimations, chartBuildEntries: allChartBuilds, mediaPlaybackEntries: allMediaPlayback, emittedShapeIds };
}

// src/ooxml/xmlValues.ts
function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function clamp(value, options) {
  let next = value;
  if (options.min !== void 0) next = Math.max(options.min, next);
  if (options.max !== void 0) next = Math.min(options.max, next);
  return next;
}
function trimDecimal(value, digits) {
  return value.toFixed(digits).replace(/\.?0+$/, "");
}
function ooxmlInt(value, options = {}) {
  const rounded = Math.round(finiteNumber(value, options.fallback));
  return String(clamp(rounded, options));
}
function ooxmlUInt(value, options = {}) {
  return ooxmlInt(value, { ...options, min: Math.max(0, options.min ?? 0) });
}
function ooxmlBool(value) {
  return value ? "1" : "0";
}
function ooxmlRatio(value) {
  const safe = clamp(finiteNumber(value, 0), { min: 0, max: 1 });
  return trimDecimal(safe, 4);
}
function ooxmlTextFontSize(points, fallback = 10) {
  return ooxmlUInt(finiteNumber(points, fallback) * 75, { min: 1 });
}
function ooxmlAngle(degrees, fallback = 0) {
  return ooxmlInt(finiteNumber(degrees, fallback) * 6e4);
}

// src/ooxml/chart/chartXmlShared.ts
var DEFAULT_COLORS2 = [
  "4472C4",
  "ED7D31",
  "A9D18E",
  "FFC000",
  "5B9BD5",
  "70AD47",
  "264478",
  "9B57A0"
];
var CAT_AX_ID = "111111111";
var VAL_AX_ID = "222222222";
var X_VAL_AX_ID = "333333333";
var Y_VAL_AX_ID = "444444444";
var SEC_VAL_AX_ID = "555555555";
var SEC_CAT_AX_ID = "666666666";
function colLetter(index) {
  let result = "";
  let value = index;
  while (value >= 0) {
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26) - 1;
  }
  return result;
}

// src/ooxml/chart/chartXmlAxes.ts
function generateGridlinesXml(gridlines) {
  if (!gridlines) return "";
  let xml = "";
  if (gridlines.major !== false) {
    if (gridlines.color) {
      xml += `        <c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="${toHex(gridlines.color)}"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>
`;
    } else {
      xml += `        <c:majorGridlines/>
`;
    }
  }
  if (gridlines.minor) {
    xml += `        <c:minorGridlines/>
`;
  }
  return xml;
}
function generateAxisTickMarks(ax) {
  if (!ax) return "";
  let xml = "";
  if (ax.tickMark?.major) {
    xml += `        <c:majorTickMark val="${ax.tickMark.major}"/>
`;
  }
  if (ax.tickMark?.minor) {
    xml += `        <c:minorTickMark val="${ax.tickMark.minor}"/>
`;
  }
  return xml;
}
function generateAxisTxPr(ax) {
  if (!ax || !ax.labelFont && ax.labelRotation === void 0) return "";
  const fontSize = ooxmlTextFontSize(ax.labelFont?.fontSize ?? 10, 10);
  const fontFamily = ax.labelFont?.fontFamily ?? "Calibri";
  const rotation = ax.labelRotation !== void 0 ? ooxmlAngle(ax.labelRotation) : "0";
  let colorXml = "";
  if (ax.labelFont?.fontColor) {
    colorXml = `<a:solidFill><a:srgbClr val="${toHex(ax.labelFont.fontColor)}"/></a:solidFill>`;
  }
  const boldAttr = ax.labelFont?.bold ? ` b="1"` : "";
  const italicAttr = ax.labelFont?.italic ? ` i="1"` : "";
  let xml = `        <c:txPr>
`;
  xml += `          <a:bodyPr rot="${rotation}"/>
`;
  xml += `          <a:lstStyle/>
`;
  xml += `          <a:p>
`;
  xml += `            <a:pPr><a:defRPr sz="${fontSize}"${boldAttr}${italicAttr}>${colorXml}<a:latin typeface="${escapeXmlAttr(fontFamily)}"/></a:defRPr></a:pPr>
`;
  xml += `            <a:endParaRPr lang="en-US" dirty="0"/>
`;
  xml += `          </a:p>
`;
  xml += `        </c:txPr>
`;
  return xml;
}
function generateAxisCrossesAt(ax) {
  if (!ax || ax.crossesAt === void 0) return "";
  return `        <c:crossesAt val="${ax.crossesAt}"/>
`;
}
function emitAxisScalingXml(min, max) {
  let xml = `        <c:scaling>
`;
  xml += `          <c:orientation val="minMax"/>
`;
  if (max !== void 0) xml += `          <c:max val="${max}"/>
`;
  if (min !== void 0) xml += `          <c:min val="${min}"/>
`;
  xml += `        </c:scaling>
`;
  return xml;
}
function emitCategoryAxisScalingXml(chartData) {
  const orientation = chartData.chartType === "radar" ? "maxMin" : "minMax";
  return `        <c:scaling><c:orientation val="${orientation}"/></c:scaling>
`;
}
function generateXValueAxis(chartData) {
  const ax = chartData.categoryAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  let xml = `      <c:valAx>
`;
  xml += `        <c:axId val="${X_VAL_AX_ID}"/>
`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>
`;
  xml += `        <c:axPos val="b"/>
`;
  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }
  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>
`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  }
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>
`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>
`;
  xml += `        <c:tickLblPos val="nextTo"/>
`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${Y_VAL_AX_ID}"/>
`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>
`;
  xml += `      </c:valAx>
`;
  return xml;
}
function generateYValueAxis(chartData) {
  const ax = chartData.valueAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  let xml = `      <c:valAx>
`;
  xml += `        <c:axId val="${Y_VAL_AX_ID}"/>
`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>
`;
  xml += `        <c:axPos val="l"/>
`;
  if (ax?.gridlines) {
    xml += generateGridlinesXml(ax.gridlines);
  } else {
    xml += `        <c:majorGridlines/>
`;
  }
  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }
  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>
`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  }
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>
`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>
`;
  xml += `        <c:tickLblPos val="nextTo"/>
`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${X_VAL_AX_ID}"/>
`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>
`;
  xml += `      </c:valAx>
`;
  return xml;
}
function generateSecondaryCategoryAxis(chartData, barDirection) {
  const ax = chartData.secondaryCategoryAxis ?? chartData.categoryAxis;
  const visible = ax?.visible ?? false;
  const deleteAttr = visible ? "0" : "1";
  const axisPosition = barDirection === "bar" ? "r" : "t";
  let xml = `      <c:catAx>
`;
  xml += `        <c:axId val="${SEC_CAT_AX_ID}"/>
`;
  xml += `        <c:scaling><c:orientation val="minMax"/></c:scaling>
`;
  xml += `        <c:delete val="${deleteAttr}"/>
`;
  xml += `        <c:axPos val="${axisPosition}"/>
`;
  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }
  xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>
`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>
`;
  xml += `        <c:tickLblPos val="nextTo"/>
`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${SEC_VAL_AX_ID}"/>
`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>
`;
  xml += `        <c:auto val="1"/>
`;
  xml += `        <c:lblAlgn val="ctr"/>
`;
  xml += `        <c:lblOffset val="100"/>
`;
  xml += `      </c:catAx>
`;
  return xml;
}
function generateSecondaryValueAxis(chartData) {
  const ax = chartData.secondaryValueAxis ?? chartData.valueAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  let xml = `      <c:valAx>
`;
  xml += `        <c:axId val="${SEC_VAL_AX_ID}"/>
`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>
`;
  xml += `        <c:axPos val="r"/>
`;
  if (ax?.gridlines) {
    xml += generateGridlinesXml(ax.gridlines);
  }
  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }
  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>
`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  }
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>
`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>
`;
  xml += `        <c:tickLblPos val="nextTo"/>
`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${SEC_CAT_AX_ID}"/>
`;
  xml += generateAxisCrossesAt(ax);
  xml += `        <c:crosses val="max"/>
`;
  xml += `        <c:crossBetween val="between"/>
`;
  xml += `      </c:valAx>
`;
  return xml;
}
function generateCategoryAxis(chartData, barDirection) {
  const ax = chartData.categoryAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  const axisPosition = barDirection === "bar" ? "l" : "b";
  let xml = `      <c:catAx>
`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += emitCategoryAxisScalingXml(chartData);
  xml += `        <c:delete val="${deleteAttr}"/>
`;
  xml += `        <c:axPos val="${axisPosition}"/>
`;
  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }
  xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>
`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>
`;
  xml += `        <c:tickLblPos val="nextTo"/>
`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${VAL_AX_ID}"/>
`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>
`;
  xml += `        <c:auto val="1"/>
`;
  xml += `        <c:lblAlgn val="ctr"/>
`;
  xml += `        <c:lblOffset val="100"/>
`;
  xml += `      </c:catAx>
`;
  return xml;
}
function generateValueAxis(chartData, barDirection) {
  const ax = chartData.valueAxis;
  const visible = ax?.visible !== false;
  const deleteAttr = visible ? "0" : "1";
  const axisPosition = barDirection === "bar" ? "b" : "l";
  let xml = `      <c:valAx>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += emitAxisScalingXml(ax?.min, ax?.max);
  xml += `        <c:delete val="${deleteAttr}"/>
`;
  xml += `        <c:axPos val="${axisPosition}"/>
`;
  if (ax?.gridlines) {
    xml += generateGridlinesXml(ax.gridlines);
  } else {
    xml += `        <c:majorGridlines/>
`;
  }
  if (ax?.title) {
    xml += generateAxisTitle(ax.title, ax.fontFamily, ax.fontSize, ax.fontColor);
  }
  if (ax?.numberFormat) {
    xml += `        <c:numFmt formatCode="${escapeXml(ax.numberFormat)}" sourceLinked="0"/>
`;
  } else {
    xml += `        <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  }
  xml += generateAxisTickMarks(ax);
  if (!ax?.tickMark?.major) xml += `        <c:majorTickMark val="out"/>
`;
  if (!ax?.tickMark?.minor) xml += `        <c:minorTickMark val="none"/>
`;
  xml += `        <c:tickLblPos val="nextTo"/>
`;
  xml += `        <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += generateAxisTxPr(ax);
  xml += `        <c:crossAx val="${CAT_AX_ID}"/>
`;
  xml += generateAxisCrossesAt(ax);
  if (!ax?.crossesAt) xml += `        <c:crosses val="autoZero"/>
`;
  xml += `        <c:crossBetween val="between"/>
`;
  xml += `      </c:valAx>
`;
  return xml;
}
function generateAxisTitle(title, fontFamily, fontSize, fontColor) {
  const size = ooxmlTextFontSize(fontSize ?? 10, 10);
  const family = fontFamily ?? "Calibri";
  let colorXml = `<a:srgbClr val="000000"/>`;
  if (fontColor) {
    colorXml = `<a:srgbClr val="${toHex(fontColor)}"/>`;
  }
  let xml = `        <c:title>
`;
  xml += `          <c:tx>
`;
  xml += `            <c:rich>
`;
  xml += `              <a:bodyPr/>
`;
  xml += `              <a:lstStyle/>
`;
  xml += `              <a:p>
`;
  xml += `                <a:r>
`;
  xml += `                  <a:rPr lang="en-US" sz="${size}">
`;
  xml += `                    <a:solidFill>${colorXml}</a:solidFill>
`;
  xml += `                    <a:latin typeface="${escapeXmlAttr(family)}"/>
`;
  xml += `                  </a:rPr>
`;
  xml += `                  <a:t>${escapeXml(title)}</a:t>
`;
  xml += `                </a:r>
`;
  xml += `              </a:p>
`;
  xml += `            </c:rich>
`;
  xml += `          </c:tx>
`;
  xml += `          <c:overlay val="0"/>
`;
  xml += `        </c:title>
`;
  return xml;
}

// src/ooxml/chart/chartXmlXY.ts
function generateScatterChart(chartData) {
  let xml = `      <c:scatterChart>
`;
  xml += `        <c:scatterStyle val="lineMarker"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  const xySeries = chartData.xySeries ?? [];
  for (let index = 0; index < xySeries.length; index++) {
    xml += generateXYSeries(xySeries[index], index);
  }
  xml += `        <c:axId val="${X_VAL_AX_ID}"/>
`;
  xml += `        <c:axId val="${Y_VAL_AX_ID}"/>
`;
  xml += `      </c:scatterChart>
`;
  return xml;
}
function generateBubbleChart(chartData) {
  let xml = `      <c:bubbleChart>
`;
  xml += `        <c:varyColors val="0"/>
`;
  const xySeries = chartData.xySeries ?? [];
  for (let index = 0; index < xySeries.length; index++) {
    xml += generateBubbleSeries(xySeries[index], index);
  }
  xml += `        <c:bubbleScale val="100"/>
`;
  xml += `        <c:axId val="${X_VAL_AX_ID}"/>
`;
  xml += `        <c:axId val="${Y_VAL_AX_ID}"/>
`;
  xml += `      </c:bubbleChart>
`;
  return xml;
}
function generateXYSeries(series, index) {
  const color = toHex(series.color ?? DEFAULT_COLORS2[index % DEFAULT_COLORS2.length]);
  const points = series.dataPoints;
  const baseCol = index * 2;
  let xml = `        <c:ser>
`;
  xml += `          <c:idx val="${index}"/>
`;
  xml += `          <c:order val="${index}"/>
`;
  xml += `          <c:tx>
`;
  xml += `            <c:strRef>
`;
  xml += `              <c:f>Sheet1!$${colLetter(baseCol + 1)}$1</c:f>
`;
  xml += `              <c:strCache>
`;
  xml += `                <c:ptCount val="1"/>
`;
  xml += `                <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>
`;
  xml += `              </c:strCache>
`;
  xml += `            </c:strRef>
`;
  xml += `          </c:tx>
`;
  xml += `          <c:spPr>
`;
  xml += `            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
`;
  xml += `          </c:spPr>
`;
  const xCol = colLetter(baseCol);
  xml += `          <c:xVal>
`;
  xml += `            <c:numRef>
`;
  xml += `              <c:f>Sheet1!$${xCol}$2:$${xCol}$${points.length + 1}</c:f>
`;
  xml += `              <c:numCache>
`;
  xml += `                <c:formatCode>General</c:formatCode>
`;
  xml += `                <c:ptCount val="${points.length}"/>
`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].x}</c:v></c:pt>
`;
  }
  xml += `              </c:numCache>
`;
  xml += `            </c:numRef>
`;
  xml += `          </c:xVal>
`;
  const yCol = colLetter(baseCol + 1);
  xml += `          <c:yVal>
`;
  xml += `            <c:numRef>
`;
  xml += `              <c:f>Sheet1!$${yCol}$2:$${yCol}$${points.length + 1}</c:f>
`;
  xml += `              <c:numCache>
`;
  xml += `                <c:formatCode>General</c:formatCode>
`;
  xml += `                <c:ptCount val="${points.length}"/>
`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].y}</c:v></c:pt>
`;
  }
  xml += `              </c:numCache>
`;
  xml += `            </c:numRef>
`;
  xml += `          </c:yVal>
`;
  xml += `        </c:ser>
`;
  return xml;
}
function generateBubbleSeries(series, index) {
  const color = toHex(series.color ?? DEFAULT_COLORS2[index % DEFAULT_COLORS2.length]);
  const points = series.dataPoints;
  const baseCol = index * 3;
  let xml = `        <c:ser>
`;
  xml += `          <c:idx val="${index}"/>
`;
  xml += `          <c:order val="${index}"/>
`;
  xml += `          <c:tx>
`;
  xml += `            <c:strRef>
`;
  xml += `              <c:f>Sheet1!$${colLetter(baseCol + 1)}$1</c:f>
`;
  xml += `              <c:strCache>
`;
  xml += `                <c:ptCount val="1"/>
`;
  xml += `                <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>
`;
  xml += `              </c:strCache>
`;
  xml += `            </c:strRef>
`;
  xml += `          </c:tx>
`;
  xml += `          <c:spPr>
`;
  xml += `            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
`;
  xml += `          </c:spPr>
`;
  const xCol = colLetter(baseCol);
  xml += `          <c:xVal>
`;
  xml += `            <c:numRef>
`;
  xml += `              <c:f>Sheet1!$${xCol}$2:$${xCol}$${points.length + 1}</c:f>
`;
  xml += `              <c:numCache>
`;
  xml += `                <c:formatCode>General</c:formatCode>
`;
  xml += `                <c:ptCount val="${points.length}"/>
`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].x}</c:v></c:pt>
`;
  }
  xml += `              </c:numCache>
`;
  xml += `            </c:numRef>
`;
  xml += `          </c:xVal>
`;
  const yCol = colLetter(baseCol + 1);
  xml += `          <c:yVal>
`;
  xml += `            <c:numRef>
`;
  xml += `              <c:f>Sheet1!$${yCol}$2:$${yCol}$${points.length + 1}</c:f>
`;
  xml += `              <c:numCache>
`;
  xml += `                <c:formatCode>General</c:formatCode>
`;
  xml += `                <c:ptCount val="${points.length}"/>
`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].y}</c:v></c:pt>
`;
  }
  xml += `              </c:numCache>
`;
  xml += `            </c:numRef>
`;
  xml += `          </c:yVal>
`;
  const sizeCol = colLetter(baseCol + 2);
  xml += `          <c:bubbleSize>
`;
  xml += `            <c:numRef>
`;
  xml += `              <c:f>Sheet1!$${sizeCol}$2:$${sizeCol}$${points.length + 1}</c:f>
`;
  xml += `              <c:numCache>
`;
  xml += `                <c:formatCode>General</c:formatCode>
`;
  xml += `                <c:ptCount val="${points.length}"/>
`;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${points[pointIndex].size ?? 1}</c:v></c:pt>
`;
  }
  xml += `              </c:numCache>
`;
  xml += `            </c:numRef>
`;
  xml += `          </c:bubbleSize>
`;
  xml += `        </c:ser>
`;
  return xml;
}

// src/ooxml/chart/chartXmlSeries.ts
function generateDataLabelsXml(dataLabels, suppressedPointIndices = []) {
  if (!dataLabels) return "";
  let xml = `        <c:dLbls>
`;
  for (const pointIndex of suppressedPointIndices) {
    xml += `          <c:dLbl><c:idx val="${pointIndex}"/><c:delete val="1"/></c:dLbl>
`;
  }
  if (dataLabels.formatCode) {
    xml += `          <c:numFmt formatCode="${escapeXmlAttr(dataLabels.formatCode)}" sourceLinked="0"/>
`;
  } else {
    xml += `          <c:numFmt formatCode="General" sourceLinked="1"/>
`;
  }
  if (dataLabels.fontFamily || dataLabels.fontSize || dataLabels.fontColor) {
    const size = ooxmlTextFontSize(dataLabels.fontSize ?? 10, 10);
    const family = dataLabels.fontFamily ?? "Calibri";
    let colorXml = "";
    if (dataLabels.fontColor) {
      colorXml = `<a:solidFill><a:srgbClr val="${toHex(dataLabels.fontColor)}"/></a:solidFill>`;
    }
    xml += `          <c:txPr>
`;
    xml += `            <a:bodyPr/>
`;
    xml += `            <a:lstStyle/>
`;
    xml += `            <a:p>
`;
    xml += `              <a:pPr><a:defRPr sz="${size}">${colorXml}<a:latin typeface="${escapeXmlAttr(family)}"/></a:defRPr></a:pPr>
`;
    xml += `              <a:endParaRPr lang="en-US" dirty="0"/>
`;
    xml += `            </a:p>
`;
    xml += `          </c:txPr>
`;
  }
  if (dataLabels.position) {
    xml += `          <c:dLblPos val="${dataLabels.position}"/>
`;
  }
  xml += `          <c:showLegendKey val="0"/>
`;
  xml += `          <c:showVal val="${ooxmlBool(dataLabels.showVal)}"/>
`;
  xml += `          <c:showCatName val="${ooxmlBool(dataLabels.showCatName)}"/>
`;
  xml += `          <c:showSerName val="${ooxmlBool(dataLabels.showSerName)}"/>
`;
  xml += `          <c:showPercent val="${ooxmlBool(dataLabels.showPercent)}"/>
`;
  xml += `          <c:showBubbleSize val="0"/>
`;
  xml += `        </c:dLbls>
`;
  return xml;
}
function generateMarkerXml(marker) {
  let xml = `<c:marker><c:symbol val="${marker.symbol}"/>`;
  if (marker.size !== void 0) {
    xml += `<c:size val="${marker.size}"/>`;
  }
  if (marker.color) {
    xml += `<c:spPr><a:solidFill><a:srgbClr val="${toHex(marker.color)}"/></a:solidFill></c:spPr>`;
  }
  xml += `</c:marker>`;
  return xml;
}
var TRENDLINE_TYPE_MAP = {
  linear: "linear",
  exponential: "exp",
  logarithmic: "log",
  polynomial: "poly",
  power: "power",
  movingAvg: "movingAvg"
};
function generateTrendlineXml(trendline) {
  let xml = `          <c:trendline>
`;
  if (trendline.color) {
    xml += `            <c:spPr><a:ln><a:solidFill><a:srgbClr val="${toHex(trendline.color)}"/></a:solidFill></a:ln></c:spPr>
`;
  }
  const ooxmlType = TRENDLINE_TYPE_MAP[trendline.type] ?? trendline.type;
  xml += `            <c:trendlineType val="${ooxmlType}"/>
`;
  if (trendline.type === "polynomial" && trendline.order !== void 0) {
    xml += `            <c:order val="${trendline.order}"/>
`;
  }
  if (trendline.type === "movingAvg" && trendline.period !== void 0) {
    xml += `            <c:period val="${trendline.period}"/>
`;
  }
  if (trendline.forward !== void 0) {
    xml += `            <c:forward val="${trendline.forward}"/>
`;
  }
  if (trendline.backward !== void 0) {
    xml += `            <c:backward val="${trendline.backward}"/>
`;
  }
  if (trendline.displayEquation) {
    xml += `            <c:dispEq val="1"/>
`;
  }
  if (trendline.displayRSquared) {
    xml += `            <c:dispRSqr val="1"/>
`;
  }
  xml += `          </c:trendline>
`;
  return xml;
}
function generateErrorBarsXml(errorBars) {
  let xml = `          <c:errBars>
`;
  xml += `            <c:errDir val="${errorBars.direction === "x" ? "x" : "y"}"/>
`;
  xml += `            <c:errBarType val="both"/>
`;
  xml += `            <c:errValType val="${errorBars.type}"/>
`;
  if (errorBars.value !== void 0) {
    xml += `            <c:val val="${errorBars.value}"/>
`;
  }
  xml += `          </c:errBars>
`;
  return xml;
}
function generateSeriesEntries(chartData, options) {
  const series = chartData.series ?? [];
  let xml = "";
  for (let index = 0; index < series.length; index++) {
    xml += generateSingleSeries(chartData, series[index], index, false, options);
  }
  return xml;
}
function generateSingleSeries(chartData, series, index, isPie, options) {
  const color = toHex(series.color ?? DEFAULT_COLORS2[index % DEFAULT_COLORS2.length]);
  const categories = chartData.categories ?? [];
  const categoryCount = categories.length;
  let xml = `        <c:ser>
`;
  xml += `          <c:idx val="${index}"/>
`;
  xml += `          <c:order val="${index}"/>
`;
  xml += `          <c:tx>
`;
  xml += `            <c:strRef>
`;
  xml += `              <c:f>Sheet1!$${colLetter(index + 1)}$1</c:f>
`;
  xml += `              <c:strCache>
`;
  xml += `                <c:ptCount val="1"/>
`;
  xml += `                <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>
`;
  xml += `              </c:strCache>
`;
  xml += `            </c:strRef>
`;
  xml += `          </c:tx>
`;
  if (!isPie) {
    const isStrokeChart = chartData.chartType === "line" || chartData.chartType === "scatter";
    xml += `          <c:spPr>
`;
    xml += `            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
`;
    if (isStrokeChart) {
      xml += `            <a:ln w="19050"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>
`;
    }
    xml += `          </c:spPr>
`;
  } else {
    for (let pointIndex = 0; pointIndex < series.values.length; pointIndex++) {
      const pointColor = toHex(series.pointColors?.[pointIndex] ?? DEFAULT_COLORS2[pointIndex % DEFAULT_COLORS2.length]);
      xml += `          <c:dPt>
`;
      xml += `            <c:idx val="${pointIndex}"/>
`;
      if (chartData.explosion !== void 0) {
        xml += `            <c:explosion val="${chartData.explosion}"/>
`;
      }
      xml += `            <c:spPr><a:solidFill><a:srgbClr val="${pointColor}"/></a:solidFill></c:spPr>
`;
      xml += `          </c:dPt>
`;
    }
  }
  const effectiveMarker = series.marker ?? options?.defaultMarker;
  if (effectiveMarker && options?.allowMarker !== false) {
    xml += `          ${generateMarkerXml(effectiveMarker)}
`;
  }
  if (!isPie && series.pointColors) {
    for (let pointIndex = 0; pointIndex < series.pointColors.length; pointIndex++) {
      if (series.pointColors[pointIndex]) {
        xml += `          <c:dPt>
`;
        xml += `            <c:idx val="${pointIndex}"/>
`;
        xml += `            <c:spPr><a:solidFill><a:srgbClr val="${toHex(series.pointColors[pointIndex])}"/></a:solidFill></c:spPr>
`;
        xml += `          </c:dPt>
`;
      }
    }
  }
  if (series.dataLabels && options?.allowDataLabels !== false) {
    xml += generateDataLabelsXml(series.dataLabels);
  }
  if (series.trendline) {
    xml += generateTrendlineXml(series.trendline);
  }
  if (series.errorBars) {
    xml += generateErrorBarsXml(series.errorBars);
  }
  xml += `          <c:cat>
`;
  xml += `            <c:strRef>
`;
  xml += `              <c:f>Sheet1!$A$2:$A$${categoryCount + 1}</c:f>
`;
  xml += `              <c:strCache>
`;
  xml += `                <c:ptCount val="${categoryCount}"/>
`;
  for (let pointIndex = 0; pointIndex < categoryCount; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${escapeXml(categories[pointIndex])}</c:v></c:pt>
`;
  }
  xml += `              </c:strCache>
`;
  xml += `            </c:strRef>
`;
  xml += `          </c:cat>
`;
  const valueCol = colLetter(index + 1);
  xml += `          <c:val>
`;
  xml += `            <c:numRef>
`;
  xml += `              <c:f>Sheet1!$${valueCol}$2:$${valueCol}$${categoryCount + 1}</c:f>
`;
  xml += `              <c:numCache>
`;
  xml += `                <c:formatCode>General</c:formatCode>
`;
  xml += `                <c:ptCount val="${categoryCount}"/>
`;
  for (let pointIndex = 0; pointIndex < series.values.length; pointIndex++) {
    xml += `                <c:pt idx="${pointIndex}"><c:v>${series.values[pointIndex]}</c:v></c:pt>
`;
  }
  xml += `              </c:numCache>
`;
  xml += `            </c:numRef>
`;
  xml += `          </c:val>
`;
  if (options?.smooth) {
    xml += `          <c:smooth val="1"/>
`;
  }
  xml += `        </c:ser>
`;
  return xml;
}

// src/ooxml/chart/chartXmlClassic.ts
function generateBarChart(chartData) {
  const grouping = chartData.barGrouping ?? "clustered";
  const barDir = chartData.barDirection ?? "col";
  let xml = `      <c:barChart>
`;
  xml += `        <c:barDir val="${barDir}"/>
`;
  xml += `        <c:grouping val="${grouping}"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  xml += generateSeriesEntries(chartData, { allowMarker: false });
  xml += generateDataLabelsXml(chartData.dataLabels);
  if (chartData.gapWidth !== void 0) {
    xml += `        <c:gapWidth val="${chartData.gapWidth}"/>
`;
  }
  if (chartData.overlap !== void 0) {
    xml += `        <c:overlap val="${chartData.overlap}"/>
`;
  }
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:barChart>
`;
  return xml;
}
function generateLineChart(chartData) {
  const grouping = chartData.lineGrouping ?? "standard";
  let xml = `      <c:lineChart>
`;
  xml += `        <c:grouping val="${grouping}"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  xml += generateSeriesEntries(chartData, {
    smooth: chartData.smooth,
    defaultMarker: chartData.marker,
    // PowerPoint for Mac rejects native line-chart data-label blocks that
    // currently validate structurally but still fail to open reliably.
    allowDataLabels: false
  });
  xml += `        <c:marker val="${chartData.marker ? "1" : "0"}"/>
`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:lineChart>
`;
  return xml;
}
function generatePieChart(chartData) {
  let xml = `      <c:pieChart>
`;
  xml += `        <c:varyColors val="1"/>
`;
  const series = chartData.series ?? [];
  if (series.length > 0) {
    xml += generateSingleSeries(chartData, series[0], 0, true);
  }
  xml += generateDataLabelsXml(chartData.dataLabels);
  if (chartData.firstSliceAng !== void 0) {
    xml += `        <c:firstSliceAng val="${chartData.firstSliceAng}"/>
`;
  }
  xml += `      </c:pieChart>
`;
  return xml;
}
function generateAreaChart(chartData) {
  const grouping = chartData.areaGrouping ?? "standard";
  let xml = `      <c:areaChart>
`;
  xml += `        <c:grouping val="${grouping}"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  xml += generateSeriesEntries(chartData, { allowMarker: false });
  const lastCategoryIndex = (chartData.categories?.length ?? 0) - 1;
  xml += generateDataLabelsXml(
    chartData.dataLabels,
    lastCategoryIndex >= 2 ? [0, lastCategoryIndex] : []
  );
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:areaChart>
`;
  return xml;
}
function generateDoughnutChart(chartData) {
  let xml = `      <c:doughnutChart>
`;
  xml += `        <c:varyColors val="1"/>
`;
  if (chartData.series && chartData.series.length > 0) {
    xml += generateSingleSeries(chartData, chartData.series[0], 0, true);
  }
  xml += generateDataLabelsXml(chartData.dataLabels);
  xml += `        <c:holeSize val="${chartData.holeSize ?? 50}"/>
`;
  if (chartData.firstSliceAng !== void 0) {
    xml += `        <c:firstSliceAng val="${chartData.firstSliceAng}"/>
`;
  }
  xml += `      </c:doughnutChart>
`;
  return xml;
}
function generateRadarChart(chartData) {
  let style = chartData.radarStyle ?? "marker";
  if (style === "radar") style = "marker";
  let xml = `      <c:radarChart>
`;
  xml += `        <c:radarStyle val="${style}"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  xml += generateSeriesEntries(chartData);
  xml += generateDataLabelsXml(chartData.dataLabels);
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:radarChart>
`;
  return xml;
}
function generateDataTableXml(dt) {
  let xml = `      <c:dTable>
`;
  xml += `        <c:showHorzBorder val="${ooxmlBool(dt.showHorzBorder !== false)}"/>
`;
  xml += `        <c:showVertBorder val="${ooxmlBool(dt.showVertBorder !== false)}"/>
`;
  xml += `        <c:showOutline val="${ooxmlBool(dt.showOutline !== false)}"/>
`;
  xml += `        <c:showKeys val="${ooxmlBool(dt.showKeys)}"/>
`;
  if (dt.fontFamily || dt.fontSize) {
    const sz = ooxmlTextFontSize(dt.fontSize ?? 10, 10);
    const ff = dt.fontFamily ?? "Calibri";
    xml += `        <c:txPr>
`;
    xml += `          <a:bodyPr/>
`;
    xml += `          <a:lstStyle/>
`;
    xml += `          <a:p>
`;
    xml += `            <a:pPr><a:defRPr sz="${sz}"><a:latin typeface="${escapeXmlAttr(ff)}"/></a:defRPr></a:pPr>
`;
    xml += `            <a:endParaRPr lang="en-US" dirty="0"/>
`;
    xml += `          </a:p>
`;
    xml += `        </c:txPr>
`;
  }
  xml += `      </c:dTable>
`;
  return xml;
}
function generateComboChart(chartData) {
  const series = chartData.series ?? [];
  const groups = /* @__PURE__ */ new Map();
  for (let i = 0; i < series.length; i++) {
    const effectiveType = series[i].overrideType ?? chartData.chartType;
    if (!groups.has(effectiveType)) groups.set(effectiveType, []);
    groups.get(effectiveType).push({ series: series[i], originalIndex: i });
  }
  let xml = "";
  for (const [chartType, entries] of groups) {
    const usesSecondary = entries.some(
      (entry) => entry.series.targetAxis === "secondary"
    );
    const axIdVal = usesSecondary ? SEC_VAL_AX_ID : VAL_AX_ID;
    switch (chartType) {
      case "bar": {
        const barDir = chartData.barDirection ?? "col";
        xml += `      <c:barChart>
`;
        xml += `        <c:barDir val="${barDir}"/>
`;
        xml += `        <c:grouping val="${chartData.barGrouping ?? "clustered"}"/>
`;
        xml += `        <c:varyColors val="0"/>
`;
        for (const entry of entries) {
          xml += generateSingleSeries(
            chartData,
            entry.series,
            entry.originalIndex,
            false,
            { allowMarker: false }
          );
        }
        xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
        xml += `        <c:axId val="${axIdVal}"/>
`;
        xml += `      </c:barChart>
`;
        break;
      }
      case "line": {
        xml += `      <c:lineChart>
`;
        xml += `        <c:grouping val="${chartData.lineGrouping ?? "standard"}"/>
`;
        xml += `        <c:varyColors val="0"/>
`;
        for (const entry of entries) {
          xml += generateSingleSeries(
            chartData,
            entry.series,
            entry.originalIndex,
            false,
            { smooth: chartData.smooth, defaultMarker: chartData.marker }
          );
        }
        xml += `        <c:marker val="${chartData.marker ? "1" : "0"}"/>
`;
        xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
        xml += `        <c:axId val="${axIdVal}"/>
`;
        xml += `      </c:lineChart>
`;
        break;
      }
      case "area": {
        xml += `      <c:areaChart>
`;
        xml += `        <c:grouping val="${chartData.areaGrouping ?? "standard"}"/>
`;
        xml += `        <c:varyColors val="0"/>
`;
        for (const entry of entries) {
          xml += generateSingleSeries(
            chartData,
            entry.series,
            entry.originalIndex,
            false,
            { allowMarker: false }
          );
        }
        xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
        xml += `        <c:axId val="${axIdVal}"/>
`;
        xml += `      </c:areaChart>
`;
        break;
      }
    }
  }
  return xml;
}

// src/ooxml/chart/chartXmlDecor.ts
function generatePlotAreaLayout(chartData, frame) {
  const layout = computeClassicChartLayout(chartData, frame);
  if (!layout || !layout.shouldEmitManualLayout) {
    return `      <c:layout/>
`;
  }
  return [
    `      <c:layout>`,
    `        <c:manualLayout>`,
    `          <c:layoutTarget val="inner"/>`,
    `          <c:xMode val="edge"/>`,
    `          <c:yMode val="edge"/>`,
    `          <c:wMode val="factor"/>`,
    `          <c:hMode val="factor"/>`,
    `          <c:x val="${layout.plotArea.x}"/>`,
    `          <c:y val="${layout.plotArea.y}"/>`,
    `          <c:w val="${layout.plotArea.w}"/>`,
    `          <c:h val="${layout.plotArea.h}"/>`,
    `        </c:manualLayout>`,
    `      </c:layout>
`
  ].join("\n");
}
function generateTitle(chartData) {
  const title = chartData.title;
  const fontSize = ooxmlTextFontSize(title.fontSize ?? 14, 14);
  const bold = title.bold ? ` b="1"` : "";
  const fontFamily = title.fontFamily ?? "Calibri";
  let colorXml = `<a:srgbClr val="000000"/>`;
  if (title.fontColor) {
    colorXml = `<a:srgbClr val="${toHex(title.fontColor)}"/>`;
  }
  let xml = `    <c:title>
`;
  xml += `      <c:tx>
`;
  xml += `        <c:rich>
`;
  xml += `          <a:bodyPr/>
`;
  xml += `          <a:lstStyle/>
`;
  xml += `          <a:p>
`;
  xml += `            <a:r>
`;
  xml += `              <a:rPr lang="en-US" sz="${fontSize}"${bold}>
`;
  xml += `                <a:solidFill>${colorXml}</a:solidFill>
`;
  xml += `                <a:latin typeface="${escapeXmlAttr(fontFamily)}"/>
`;
  xml += `              </a:rPr>
`;
  xml += `              <a:t>${escapeXml(title.text)}</a:t>
`;
  xml += `            </a:r>
`;
  xml += `          </a:p>
`;
  xml += `        </c:rich>
`;
  xml += `      </c:tx>
`;
  xml += `      <c:overlay val="0"/>
`;
  xml += `    </c:title>
`;
  return xml;
}
function generateAreaSpPr(area) {
  if (!area) return `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>`;
  let xml = `<c:spPr>`;
  if (area.fill) {
    xml += `<a:solidFill><a:srgbClr val="${toHex(area.fill)}"/></a:solidFill>`;
  } else {
    xml += `<a:noFill/>`;
  }
  if (area.borderColor || area.borderWidth) {
    const width = area.borderWidth ? ooxmlUInt(area.borderWidth * PIXEL_TO_EMU) : PIXEL_TO_EMU;
    const color = toHex(area.borderColor ?? "#000000");
    xml += `<a:ln w="${width}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>`;
  } else {
    xml += `<a:ln><a:noFill/></a:ln>`;
  }
  xml += `</c:spPr>`;
  return xml;
}
function generateLegend(chartData, frame) {
  const pos = resolveClassicLegendPosition(chartData, frame);
  if (pos === "none") return "";
  const layout = computeClassicChartLayout(chartData, frame);
  const posMap = {
    bottom: "b",
    top: "t",
    left: "l",
    right: "r"
  };
  let xml = `    <c:legend>
`;
  xml += `      <c:legendPos val="${posMap[pos] ?? "b"}"/>
`;
  xml += generateLegendLayout(layout, frame);
  if (chartData.chartType === "waterfall") {
    xml += `      <c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>
`;
  } else if (chartData.chartType === "funnel") {
    xml += `      <c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>
`;
    xml += `      <c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry>
`;
  }
  xml += `      <c:overlay val="0"/>
`;
  const legendFill = chartData.legend?.fill;
  const legendBorder = chartData.legend?.border;
  if (legendFill || legendBorder) {
    xml += `      <c:spPr>
`;
    if (legendFill) {
      const fillColor = toHex(legendFill);
      xml += `        <a:solidFill><a:srgbClr val="${fillColor}"/></a:solidFill>
`;
    }
    if (legendBorder) {
      const borderColor = toHex(legendBorder.color ?? "#000000");
      const borderWidth = legendBorder.width ? ooxmlUInt(legendBorder.width * PIXEL_TO_EMU) : PIXEL_TO_EMU;
      xml += `        <a:ln w="${borderWidth}"><a:solidFill><a:srgbClr val="${borderColor}"/></a:solidFill></a:ln>
`;
    }
    xml += `      </c:spPr>
`;
  }
  if (chartData.legend?.fontFamily || chartData.legend?.fontSize || chartData.legend?.fontColor) {
    const size = ooxmlTextFontSize(chartData.legend.fontSize ?? 10, 10);
    const family = chartData.legend.fontFamily ?? "Calibri";
    let colorXml = "";
    if (chartData.legend.fontColor) {
      const color = toHex(chartData.legend.fontColor);
      colorXml = `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`;
    }
    xml += `      <c:txPr>
`;
    xml += `        <a:bodyPr/>
`;
    xml += `        <a:lstStyle/>
`;
    xml += `        <a:p>
`;
    xml += `          <a:pPr><a:defRPr sz="${size}">${colorXml}<a:latin typeface="${escapeXmlAttr(family)}"/></a:defRPr></a:pPr>
`;
    xml += `          <a:endParaRPr lang="en-US" dirty="0"/>
`;
    xml += `        </a:p>
`;
    xml += `      </c:txPr>
`;
  }
  xml += `    </c:legend>
`;
  return xml;
}
function generateLegendLayout(layout, frame) {
  const box = layout?.legendBox;
  if (!frame || !layout?.shouldEmitManualLayout || !box) return "";
  const xNumber = Math.min(1, Math.max(0, box.left / frame.width));
  const yNumber = Math.min(1, Math.max(0, box.top / frame.height));
  const x = ooxmlRatio(xNumber);
  const y = ooxmlRatio(yNumber);
  const w = ooxmlRatio(Math.min(box.width / frame.width, 1 - xNumber));
  const h = ooxmlRatio(Math.min(box.height / frame.height, 1 - yNumber));
  return [
    `      <c:layout>`,
    `        <c:manualLayout>`,
    `          <c:xMode val="edge"/>`,
    `          <c:yMode val="edge"/>`,
    `          <c:wMode val="factor"/>`,
    `          <c:hMode val="factor"/>`,
    `          <c:x val="${x}"/>`,
    `          <c:y val="${y}"/>`,
    `          <c:w val="${w}"/>`,
    `          <c:h val="${h}"/>`,
    `        </c:manualLayout>`,
    `      </c:layout>
`
  ].join("\n");
}
function generateChartDrawingXml(annotations) {
  const textAnnotations = annotations.filter(
    (a) => (a.kind ?? "text") === "text"
  );
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<c:userShapes xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:cdr="http://schemas.openxmlformats.org/drawingml/2006/chartDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
`;
  for (let i = 0; i < textAnnotations.length; i++) {
    const annotation = textAnnotations[i];
    const fromX = ooxmlRatio(annotation.x / 100);
    const fromY = ooxmlRatio(annotation.y / 100);
    const toX = ooxmlRatio((annotation.x + (annotation.width ?? 20)) / 100);
    const toY = ooxmlRatio((annotation.y + (annotation.height ?? 10)) / 100);
    const shape = annotation.shapeType ?? "rect";
    const fontSize = ooxmlTextFontSize(annotation.fontSize ?? 10, 10);
    const fontFamily = annotation.fontFamily ?? "Calibri";
    const bold = annotation.bold ? ` b="1"` : "";
    const italic = annotation.italic ? ` i="1"` : "";
    xml += `  <cdr:relSizeAnchor>
`;
    xml += `    <cdr:from><cdr:x>${fromX}</cdr:x><cdr:y>${fromY}</cdr:y></cdr:from>
`;
    xml += `    <cdr:to><cdr:x>${toX}</cdr:x><cdr:y>${toY}</cdr:y></cdr:to>
`;
    xml += `    <cdr:sp>
`;
    xml += `      <cdr:nvSpPr>
`;
    xml += `        <cdr:cNvPr id="${i + 2}" name="Annotation ${i + 1}"/>
`;
    xml += `        <cdr:cNvSpPr/>
`;
    xml += `      </cdr:nvSpPr>
`;
    xml += `      <cdr:spPr>
`;
    xml += `        <a:prstGeom prst="${shape}"><a:avLst/></a:prstGeom>
`;
    if (annotation.fill) {
      const fillColor = toHex(annotation.fill);
      xml += `        <a:solidFill><a:srgbClr val="${fillColor}"/></a:solidFill>
`;
    } else {
      xml += `        <a:noFill/>
`;
    }
    if (annotation.borderColor || annotation.borderWidth) {
      const borderColor = toHex(annotation.borderColor ?? "#000000");
      const borderWidth = annotation.borderWidth ? ooxmlUInt(annotation.borderWidth * PIXEL_TO_EMU) : PIXEL_TO_EMU;
      xml += `        <a:ln w="${borderWidth}"><a:solidFill><a:srgbClr val="${borderColor}"/></a:solidFill></a:ln>
`;
    }
    xml += `      </cdr:spPr>
`;
    xml += `      <cdr:txBody>
`;
    xml += `        <a:bodyPr vertOverflow="clip" wrap="square"/>
`;
    xml += `        <a:lstStyle/>
`;
    xml += `        <a:p>
`;
    xml += `          <a:r>
`;
    let colorXml = "";
    if (annotation.fontColor) {
      const fontColor = toHex(annotation.fontColor);
      colorXml = `<a:solidFill><a:srgbClr val="${fontColor}"/></a:solidFill>`;
    }
    xml += `            <a:rPr lang="en-US" sz="${fontSize}"${bold}${italic}>${colorXml}<a:latin typeface="${escapeXmlAttr(fontFamily)}"/></a:rPr>
`;
    xml += `            <a:t>${escapeXml(annotation.text)}</a:t>
`;
    xml += `          </a:r>
`;
    xml += `        </a:p>
`;
    xml += `      </cdr:txBody>
`;
    xml += `    </cdr:sp>
`;
    xml += `  </cdr:relSizeAnchor>
`;
  }
  xml += `</c:userShapes>`;
  return xml;
}

// src/ooxml/chart/chartXmlSpecial.ts
function generateWaterfallChart(chartData) {
  const wd = normalizeWaterfallData(chartData);
  if (!wd) return "";
  const categories = wd.categories;
  const values = wd.values;
  const totalIndices = new Set(wd.totalIndices ?? []);
  const increaseColor = toHex(wd.increaseColor ?? "#4472C4");
  const decreaseColor = toHex(wd.decreaseColor ?? "#ED7D31");
  const totalColor = toHex(wd.totalColor ?? "#A9D18E");
  const baseValues = [];
  const increaseValues = [];
  const decreaseValues = [];
  let runningTotal = 0;
  for (let index = 0; index < values.length; index++) {
    if (totalIndices.has(index)) {
      baseValues.push(0);
      increaseValues.push(values[index]);
      decreaseValues.push(0);
      runningTotal = values[index];
    } else {
      const value = values[index];
      if (value >= 0) {
        baseValues.push(runningTotal);
        increaseValues.push(value);
        decreaseValues.push(0);
      } else {
        baseValues.push(runningTotal + value);
        increaseValues.push(0);
        decreaseValues.push(-value);
      }
      runningTotal += value;
    }
  }
  let xml = `      <c:barChart>
`;
  xml += `        <c:barDir val="col"/>
`;
  xml += `        <c:grouping val="stacked"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  xml += `        <c:ser>
`;
  xml += `          <c:idx val="0"/>
`;
  xml += `          <c:order val="0"/>
`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Base</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
  xml += `          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>
`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${baseValues[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>
`;
  xml += `        </c:ser>
`;
  xml += `        <c:ser>
`;
  xml += `          <c:idx val="1"/>
`;
  xml += `          <c:order val="1"/>
`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Increase</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
  xml += `          <c:spPr><a:solidFill><a:srgbClr val="${increaseColor}"/></a:solidFill></c:spPr>
`;
  for (let index = 0; index < categories.length; index++) {
    if (totalIndices.has(index)) {
      xml += `          <c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${totalColor}"/></a:solidFill></c:spPr></c:dPt>
`;
    }
  }
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>
`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$C$2:$C$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    const value = totalIndices.has(index) ? values[index] : increaseValues[index];
    xml += `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>
`;
  xml += `        </c:ser>
`;
  xml += `        <c:ser>
`;
  xml += `          <c:idx val="2"/>
`;
  xml += `          <c:order val="2"/>
`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$D$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Decrease</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
  xml += `          <c:spPr><a:solidFill><a:srgbClr val="${decreaseColor}"/></a:solidFill></c:spPr>
`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>
`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$D$2:$D$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${decreaseValues[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>
`;
  xml += `        </c:ser>
`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:barChart>
`;
  return xml;
}
function generateStockChart(chartData) {
  const sd = chartData.stockData;
  if (!sd) return "";
  const categories = sd.categories;
  const hiLowLines = sd.hiLowLines !== false;
  const upDownBars = sd.upDownBars !== false;
  let xml = `      <c:stockChart>
`;
  const seriesData = [
    { name: "Open", values: sd.open, col: "B" },
    { name: "High", values: sd.high, col: "C" },
    { name: "Low", values: sd.low, col: "D" },
    { name: "Close", values: sd.close, col: "E" }
  ];
  for (let index = 0; index < seriesData.length; index++) {
    const series = seriesData[index];
    xml += `        <c:ser>
`;
    xml += `          <c:idx val="${index}"/>
`;
    xml += `          <c:order val="${index}"/>
`;
    xml += `          <c:tx><c:strRef><c:f>Sheet1!$${series.col}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
    xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
    for (let pointIndex = 0; pointIndex < categories.length; pointIndex++) {
      xml += `<c:pt idx="${pointIndex}"><c:v>${escapeXml(categories[pointIndex])}</c:v></c:pt>`;
    }
    xml += `</c:strCache></c:strRef></c:cat>
`;
    xml += `          <c:val><c:numRef><c:f>Sheet1!$${series.col}$2:$${series.col}$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
    for (let pointIndex = 0; pointIndex < series.values.length; pointIndex++) {
      xml += `<c:pt idx="${pointIndex}"><c:v>${series.values[pointIndex]}</c:v></c:pt>`;
    }
    xml += `</c:numCache></c:numRef></c:val>
`;
    xml += `        </c:ser>
`;
  }
  if (hiLowLines) {
    xml += `        <c:hiLowLines/>
`;
  }
  if (upDownBars) {
    const upColor = toHex(sd.upColor ?? "#FFFFFF");
    const downColor = toHex(sd.downColor ?? "#000000");
    xml += `        <c:upDownBars>
`;
    xml += `          <c:gapWidth val="150"/>
`;
    xml += `          <c:upBars><c:spPr><a:solidFill><a:srgbClr val="${upColor}"/></a:solidFill></c:spPr></c:upBars>
`;
    xml += `          <c:downBars><c:spPr><a:solidFill><a:srgbClr val="${downColor}"/></a:solidFill></c:spPr></c:downBars>
`;
    xml += `        </c:upDownBars>
`;
  }
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:stockChart>
`;
  return xml;
}
function generateFunnelChart(chartData) {
  const fd = chartData.funnelData;
  if (!fd) return "";
  const categories = fd.categories;
  const values = fd.values;
  const maxValue = Math.max(...values);
  const leftSpacers = [];
  const rightSpacers = [];
  for (let index = 0; index < values.length; index++) {
    const spacer = (maxValue - values[index]) / 2;
    leftSpacers.push(spacer);
    rightSpacers.push(spacer);
  }
  let xml = `      <c:barChart>
`;
  xml += `        <c:barDir val="bar"/>
`;
  xml += `        <c:grouping val="stacked"/>
`;
  xml += `        <c:varyColors val="0"/>
`;
  xml += `        <c:ser>
`;
  xml += `          <c:idx val="0"/>
`;
  xml += `          <c:order val="0"/>
`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>LeftSpacer</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
  xml += `          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>
`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${leftSpacers[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>
`;
  xml += `        </c:ser>
`;
  xml += `        <c:ser>
`;
  xml += `          <c:idx val="1"/>
`;
  xml += `          <c:order val="1"/>
`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Value</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
  xml += `          <c:spPr><a:solidFill><a:srgbClr val="${DEFAULT_COLORS2[0]}"/></a:solidFill></c:spPr>
`;
  for (let index = 0; index < categories.length; index++) {
    const color = toHex(fd.colors?.[index] ?? DEFAULT_COLORS2[index % DEFAULT_COLORS2.length]);
    xml += `          <c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:dPt>
`;
  }
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>
`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$C$2:$C$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${values[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>
`;
  xml += `        </c:ser>
`;
  xml += `        <c:ser>
`;
  xml += `          <c:idx val="2"/>
`;
  xml += `          <c:order val="2"/>
`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$D$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>RightSpacer</c:v></c:pt></c:strCache></c:strRef></c:tx>
`;
  xml += `          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>
`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$D$2:$D$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${rightSpacers[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>
`;
  xml += `        </c:ser>
`;
  xml += `        <c:gapWidth val="50"/>
`;
  xml += `        <c:overlap val="100"/>
`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>
`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>
`;
  xml += `      </c:barChart>
`;
  return xml;
}

// src/ooxml/chart/chartXml.ts
function generateChartXml(chartData, excelRId, frame) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  xml += `  <c:date1904 val="0"/>
`;
  xml += `  <c:lang val="en-US"/>
`;
  xml += `  <c:roundedCorners val="0"/>
`;
  xml += `  <c:chart>
`;
  if (chartData.title?.text) {
    xml += generateTitle(chartData);
  } else {
    xml += `    <c:autoTitleDeleted val="1"/>
`;
  }
  xml += `    <c:plotArea>
`;
  xml += generatePlotAreaLayout(chartData, frame);
  const isCombo = chartData.series?.some((s) => s.overrideType !== void 0) ?? false;
  if (isCombo) {
    xml += generateComboChart(chartData);
  } else {
    switch (chartData.chartType) {
      case "bar":
        xml += generateBarChart(chartData);
        break;
      case "line":
        xml += generateLineChart(chartData);
        break;
      case "pie":
        xml += generatePieChart(chartData);
        break;
      case "area":
        xml += generateAreaChart(chartData);
        break;
      case "doughnut":
        xml += generateDoughnutChart(chartData);
        break;
      case "scatter":
        xml += generateScatterChart(chartData);
        break;
      case "bubble":
        xml += generateBubbleChart(chartData);
        break;
      case "radar":
        xml += generateRadarChart(chartData);
        break;
      case "waterfall":
        xml += generateWaterfallChart(chartData);
        break;
      case "stock":
        xml += generateStockChart(chartData);
        break;
      case "funnel":
        xml += generateFunnelChart(chartData);
        break;
    }
  }
  if (chartData.chartType === "scatter" || chartData.chartType === "bubble") {
    xml += generateXValueAxis(chartData);
    xml += generateYValueAxis(chartData);
  } else if (chartData.chartType !== "pie" && chartData.chartType !== "doughnut") {
    const barDir = chartData.chartType === "funnel" ? "bar" : chartData.chartType === "waterfall" || chartData.chartType === "stock" ? "col" : chartData.barDirection;
    xml += generateCategoryAxis(chartData, barDir);
    xml += generateValueAxis(chartData, barDir);
    const hasSecondaryAxis = isCombo && chartData.series?.some((s) => s.targetAxis === "secondary");
    if (hasSecondaryAxis) {
      xml += generateSecondaryCategoryAxis(chartData, barDir);
      xml += generateSecondaryValueAxis(chartData);
    }
  }
  if (chartData.dataTable) {
    xml += generateDataTableXml(chartData.dataTable);
  }
  xml += `      ${generateAreaSpPr(chartData.plotArea)}
`;
  xml += `    </c:plotArea>
`;
  xml += generateLegend(chartData, frame);
  xml += `    <c:plotVisOnly val="1"/>
`;
  if (chartData.dispBlanksAs) {
    xml += `    <c:dispBlanksAs val="${chartData.dispBlanksAs}"/>
`;
  }
  xml += `  </c:chart>
`;
  if (chartData.chartArea) {
    xml += `  ${generateAreaSpPr(chartData.chartArea)}
`;
  }
  xml += `  <c:externalData r:id="${excelRId}">
`;
  xml += `    <c:autoUpdate val="0"/>
`;
  xml += `  </c:externalData>
`;
  xml += `  <c:printSettings>
`;
  xml += `    <c:headerFooter/>
`;
  xml += `    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
`;
  xml += `    <c:pageSetup/>
`;
  xml += `  </c:printSettings>
`;
  if (chartData.annotations && chartData.annotations.length > 0) {
    xml += `  <c:userShapes r:id="rId2"/>
`;
  }
  xml += `</c:chartSpace>`;
  return xml;
}

// src/ooxml/chart/chartRels.ts
var REL_TYPES3 = {
  package: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package",
  chartUserShapes: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartUserShapes"
};
function generateChartExRels(excelRelPath) {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES3.package, target: excelRelPath }
  ]);
}
function generateChartRelsSimple(excelRelPath) {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES3.package, target: excelRelPath }
  ]);
}
function generateChartRelsWithDrawingSimple(excelRelPath, drawingRelPath) {
  const relationships = [
    { id: "rId1", type: REL_TYPES3.package, target: excelRelPath },
    { id: "rId2", type: REL_TYPES3.chartUserShapes, target: drawingRelPath }
  ];
  return generateRelationshipsXml(relationships);
}

// src/ooxml/chart/excelEmitter.ts
var import_jszip2 = __toESM(require_lib(), 1);
function stampAllEntriesDeterministic(zip) {
  for (const entry of Object.values(zip.files)) {
    entry.date = DETERMINISTIC_DATE;
  }
}
async function generateExcelBuffer(chartData) {
  switch (getChartExcelLayout(chartData.chartType)) {
    case "xy":
      return generateXYExcelBuffer(chartData);
    case "waterfall":
      return generateWaterfallExcelBuffer(chartData);
    case "stock":
      return generateStockExcelBuffer(chartData);
    case "funnel":
      return generateFunnelExcelBuffer(chartData);
    case "hierarchy":
      return generateTreemapExcelBuffer(chartData);
    case "histogram":
      return generateHistogramExcelBuffer(chartData);
    case "boxWhisker":
      return generateBoxWhiskerExcelBuffer(chartData);
    case "standard":
      break;
  }
  const zip = new import_jszip2.default();
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  const series = chartData.series ?? [];
  const categories = chartData.categories ?? [];
  for (const s of series) {
    ssIndex(s.name);
  }
  for (const cat of categories) {
    ssIndex(cat);
  }
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  zip.file("xl/worksheets/sheet1.xml", generateSheet(chartData, ssIndex), opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}
function generateExcelContentTypesSimple() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;
}
function generateExcelRootRelsSimple() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}
function generateWorkbook() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}
function generateWorkbookRelsSimple() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}
function generateMinimalStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
}
function generateSharedStrings(strings) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
`;
  for (const s of strings) {
    xml += `  <si><t>${escapeXml(s)}</t></si>
`;
  }
  xml += `</sst>`;
  return xml;
}
function generateSheet(chartData, ssIndex) {
  const series = chartData.series ?? [];
  const categories = chartData.categories ?? [];
  const lastCol = colLetter(series.length);
  const lastRow = categories.length + 1;
  const ref = `A1:${lastCol}${lastRow}`;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  xml += `  <dimension ref="${ref}"/>
`;
  xml += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  xml += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  xml += `  <sheetData>
`;
  xml += `    <row r="1">
`;
  for (let i = 0; i < series.length; i++) {
    const col = colLetter(i + 1);
    xml += `      <c r="${col}1" t="s"><v>${ssIndex(series[i].name)}</v></c>
`;
  }
  xml += `    </row>
`;
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    xml += `    <row r="${rowNum}">
`;
    xml += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>
`;
    for (let s = 0; s < series.length; s++) {
      const col = colLetter(s + 1);
      xml += `      <c r="${col}${rowNum}"><v>${series[s].values[r]}</v></c>
`;
    }
    xml += `    </row>
`;
  }
  xml += `  </sheetData>
`;
  xml += `</worksheet>`;
  return xml;
}
async function generateXYExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const xySeries = chartData.xySeries ?? [];
  const isBubble = chartData.chartType === "bubble";
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  for (const s of xySeries) {
    ssIndex(s.name);
  }
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  zip.file("xl/worksheets/sheet1.xml", generateXYSheet(xySeries, isBubble, ssIndex), opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}
function generateXYSheet(xySeries, isBubble, ssIndex) {
  const colsPerSeries = isBubble ? 3 : 2;
  const totalCols = xySeries.length * colsPerSeries;
  const maxRows = Math.max(...xySeries.map((s) => s.dataPoints.length), 0);
  const lastCol = colLetter(totalCols - 1);
  const ref = `A1:${lastCol}${maxRows + 1}`;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  xml += `  <dimension ref="${ref}"/>
`;
  xml += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  xml += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  xml += `  <sheetData>
`;
  xml += `    <row r="1">
`;
  for (let i = 0; i < xySeries.length; i++) {
    const baseCol = i * colsPerSeries;
    const nameCol = colLetter(baseCol + 1);
    xml += `      <c r="${nameCol}1" t="s"><v>${ssIndex(xySeries[i].name)}</v></c>
`;
  }
  xml += `    </row>
`;
  for (let r = 0; r < maxRows; r++) {
    const rowNum = r + 2;
    xml += `    <row r="${rowNum}">
`;
    for (let i = 0; i < xySeries.length; i++) {
      const pts = xySeries[i].dataPoints;
      const baseCol = i * colsPerSeries;
      if (r < pts.length) {
        const xCol = colLetter(baseCol);
        const yCol = colLetter(baseCol + 1);
        xml += `      <c r="${xCol}${rowNum}"><v>${pts[r].x}</v></c>
`;
        xml += `      <c r="${yCol}${rowNum}"><v>${pts[r].y}</v></c>
`;
        if (isBubble) {
          const sizeCol = colLetter(baseCol + 2);
          xml += `      <c r="${sizeCol}${rowNum}"><v>${pts[r].size ?? 1}</v></c>
`;
        }
      }
    }
    xml += `    </row>
`;
  }
  xml += `  </sheetData>
`;
  xml += `</worksheet>`;
  return xml;
}
async function generateWaterfallExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const wd = normalizeWaterfallData(chartData);
  if (!wd) {
    throw new PaperError("waterfall chart requires normalized categories and values", {
      code: "VALIDATION_FAILED",
      phase: "chart"
    });
  }
  const categories = wd.categories;
  const values = wd.values;
  const totalIndices = new Set(wd.totalIndices ?? []);
  const baseValues = [];
  const increaseValues = [];
  const decreaseValues = [];
  let runningTotal = 0;
  for (let i = 0; i < values.length; i++) {
    if (totalIndices.has(i)) {
      baseValues.push(0);
      increaseValues.push(values[i]);
      decreaseValues.push(0);
      runningTotal = values[i];
    } else {
      const val = values[i];
      if (val >= 0) {
        baseValues.push(runningTotal);
        increaseValues.push(val);
        decreaseValues.push(0);
      } else {
        baseValues.push(runningTotal + val);
        increaseValues.push(0);
        decreaseValues.push(-val);
      }
      runningTotal += val;
    }
  }
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  ssIndex("Base");
  ssIndex("Increase");
  ssIndex("Decrease");
  for (const cat of categories) {
    ssIndex(cat);
  }
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  zip.file("xl/worksheets/sheet1.xml", generateWaterfallSheet(categories, baseValues, increaseValues, decreaseValues, ssIndex), opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}
function generateWaterfallSheet(categories, baseValues, increaseValues, decreaseValues, ssIndex) {
  const ref = `A1:D${categories.length + 1}`;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  xml += `  <dimension ref="${ref}"/>
`;
  xml += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  xml += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  xml += `  <sheetData>
`;
  xml += `    <row r="1">
`;
  xml += `      <c r="B1" t="s"><v>${ssIndex("Base")}</v></c>
`;
  xml += `      <c r="C1" t="s"><v>${ssIndex("Increase")}</v></c>
`;
  xml += `      <c r="D1" t="s"><v>${ssIndex("Decrease")}</v></c>
`;
  xml += `    </row>
`;
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    xml += `    <row r="${rowNum}">
`;
    xml += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>
`;
    xml += `      <c r="B${rowNum}"><v>${baseValues[r]}</v></c>
`;
    xml += `      <c r="C${rowNum}"><v>${increaseValues[r]}</v></c>
`;
    xml += `      <c r="D${rowNum}"><v>${decreaseValues[r]}</v></c>
`;
    xml += `    </row>
`;
  }
  xml += `  </sheetData>
`;
  xml += `</worksheet>`;
  return xml;
}
async function generateStockExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const sd = chartData.stockData;
  const categories = sd.categories;
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  ssIndex("Open");
  ssIndex("High");
  ssIndex("Low");
  ssIndex("Close");
  for (const cat of categories) ssIndex(cat);
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  const stockRef = `A1:E${categories.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  sheet += `  <dimension ref="${stockRef}"/>
`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  sheet += `  <sheetData>
`;
  sheet += `    <row r="1">
`;
  sheet += `      <c r="B1" t="s"><v>${ssIndex("Open")}</v></c>
`;
  sheet += `      <c r="C1" t="s"><v>${ssIndex("High")}</v></c>
`;
  sheet += `      <c r="D1" t="s"><v>${ssIndex("Low")}</v></c>
`;
  sheet += `      <c r="E1" t="s"><v>${ssIndex("Close")}</v></c>
`;
  sheet += `    </row>
`;
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    sheet += `    <row r="${rowNum}">
`;
    sheet += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>
`;
    sheet += `      <c r="B${rowNum}"><v>${sd.open[r]}</v></c>
`;
    sheet += `      <c r="C${rowNum}"><v>${sd.high[r]}</v></c>
`;
    sheet += `      <c r="D${rowNum}"><v>${sd.low[r]}</v></c>
`;
    sheet += `      <c r="E${rowNum}"><v>${sd.close[r]}</v></c>
`;
    sheet += `    </row>
`;
  }
  sheet += `  </sheetData>
`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
async function generateFunnelExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const fd = chartData.funnelData;
  const categories = fd.categories;
  const values = fd.values;
  const maxVal = Math.max(...values);
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  ssIndex("LeftSpacer");
  ssIndex("Value");
  ssIndex("RightSpacer");
  for (const cat of categories) ssIndex(cat);
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  const funnelRef = `A1:D${categories.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  sheet += `  <dimension ref="${funnelRef}"/>
`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  sheet += `  <sheetData>
`;
  sheet += `    <row r="1">
`;
  sheet += `      <c r="B1" t="s"><v>${ssIndex("LeftSpacer")}</v></c>
`;
  sheet += `      <c r="C1" t="s"><v>${ssIndex("Value")}</v></c>
`;
  sheet += `      <c r="D1" t="s"><v>${ssIndex("RightSpacer")}</v></c>
`;
  sheet += `    </row>
`;
  for (let r = 0; r < categories.length; r++) {
    const rowNum = r + 2;
    const spacer = (maxVal - values[r]) / 2;
    sheet += `    <row r="${rowNum}">
`;
    sheet += `      <c r="A${rowNum}" t="s"><v>${ssIndex(categories[r])}</v></c>
`;
    sheet += `      <c r="B${rowNum}"><v>${spacer}</v></c>
`;
    sheet += `      <c r="C${rowNum}"><v>${values[r]}</v></c>
`;
    sheet += `      <c r="D${rowNum}"><v>${spacer}</v></c>
`;
    sheet += `    </row>
`;
  }
  sheet += `  </sheetData>
`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
function flattenHierarchyForExcel(categories, ancestors = []) {
  const leaves = [];
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      leaves.push(...flattenHierarchyForExcel(cat.children, [cat.name, ...ancestors]));
    } else {
      leaves.push({ path: [cat.name, ...ancestors], value: cat.value ?? 0 });
    }
  }
  return leaves;
}
async function generateTreemapExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const data = chartData.treemapData ?? chartData.sunburstData;
  if (!data) return generateMinimalExcelBuffer();
  const leaves = flattenHierarchyForExcel(data.categories);
  const maxDepth = Math.max(...leaves.map((l) => l.path.length), 1);
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  const headers = [];
  for (let d = maxDepth - 1; d >= 0; d--) {
    headers.push(d === 0 ? "Category" : `Level${d}`);
  }
  headers.push("Value");
  for (const h of headers) ssIndex(h);
  for (const leaf of leaves) {
    for (const name of leaf.path) ssIndex(name);
  }
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  const treemapLastCol = colLetter(headers.length - 1);
  const treemapRef = `A1:${treemapLastCol}${leaves.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  sheet += `  <dimension ref="${treemapRef}"/>
`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  sheet += `  <sheetData>
`;
  sheet += `    <row r="1">
`;
  for (let c = 0; c < headers.length; c++) {
    sheet += `      <c r="${colLetter(c)}1" t="s"><v>${ssIndex(headers[c])}</v></c>
`;
  }
  sheet += `    </row>
`;
  for (let r = 0; r < leaves.length; r++) {
    const rowNum = r + 2;
    const leaf = leaves[r];
    sheet += `    <row r="${rowNum}">
`;
    for (let d = maxDepth - 1; d >= 0; d--) {
      const col = maxDepth - 1 - d;
      const name = d < leaf.path.length ? leaf.path[d] : "";
      if (name) {
        sheet += `      <c r="${colLetter(col)}${rowNum}" t="s"><v>${ssIndex(name)}</v></c>
`;
      }
    }
    sheet += `      <c r="${colLetter(maxDepth)}${rowNum}"><v>${leaf.value}</v></c>
`;
    sheet += `    </row>
`;
  }
  sheet += `  </sheetData>
`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
async function generateHistogramExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const data = chartData.histogramData;
  if (!data) return generateMinimalExcelBuffer();
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  const seriesName = data.seriesName ?? "Values";
  ssIndex(seriesName);
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  const histRef = `A1:A${data.values.length + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  sheet += `  <dimension ref="${histRef}"/>
`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  sheet += `  <sheetData>
`;
  sheet += `    <row r="1">
`;
  sheet += `      <c r="A1" t="s"><v>${ssIndex(seriesName)}</v></c>
`;
  sheet += `    </row>
`;
  for (let r = 0; r < data.values.length; r++) {
    const rowNum = r + 2;
    sheet += `    <row r="${rowNum}">
`;
    sheet += `      <c r="A${rowNum}"><v>${data.values[r]}</v></c>
`;
    sheet += `    </row>
`;
  }
  sheet += `  </sheetData>
`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
async function generateBoxWhiskerExcelBuffer(chartData) {
  const zip = new import_jszip2.default();
  const data = chartData.boxWhiskerData;
  if (!data) return generateMinimalExcelBuffer();
  const sharedStrings = [];
  const sharedStringIndex = /* @__PURE__ */ new Map();
  const ssIndex = (s) => {
    let idx = sharedStringIndex.get(s);
    if (idx === void 0) {
      idx = sharedStrings.length;
      sharedStrings.push(s);
      sharedStringIndex.set(s, idx);
    }
    return idx;
  };
  for (const cat of data.categories) ssIndex(cat);
  for (const s of data.series) ssIndex(s.name);
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings(sharedStrings), opts);
  const maxRows = Math.max(...data.series.map((s) => s.values.length), 0);
  const bwLastCol = colLetter(data.series.length);
  const bwRef = `A1:${bwLastCol}${maxRows + 1}`;
  let sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  sheet += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
`;
  sheet += `  <dimension ref="${bwRef}"/>
`;
  sheet += `  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
`;
  sheet += `  <sheetFormatPr defaultRowHeight="15"/>
`;
  sheet += `  <sheetData>
`;
  sheet += `    <row r="1">
`;
  for (let s = 0; s < data.series.length; s++) {
    sheet += `      <c r="${colLetter(s + 1)}1" t="s"><v>${ssIndex(data.series[s].name)}</v></c>
`;
  }
  sheet += `    </row>
`;
  for (let r = 0; r < maxRows; r++) {
    const rowNum = r + 2;
    sheet += `    <row r="${rowNum}">
`;
    if (data.categories.length > 0) {
      const catIdx = r % data.categories.length;
      sheet += `      <c r="A${rowNum}" t="s"><v>${ssIndex(data.categories[catIdx])}</v></c>
`;
    }
    for (let s = 0; s < data.series.length; s++) {
      if (r < data.series[s].values.length) {
        sheet += `      <c r="${colLetter(s + 1)}${rowNum}"><v>${data.series[s].values[r]}</v></c>
`;
      }
    }
    sheet += `    </row>
`;
  }
  sheet += `  </sheetData>
`;
  sheet += `
`;
  sheet += `</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
async function generateMinimalExcelBuffer() {
  const zip = new import_jszip2.default();
  const opts = { date: DETERMINISTIC_DATE };
  zip.file("[Content_Types].xml", generateExcelContentTypesSimple(), opts);
  zip.file("_rels/.rels", generateExcelRootRelsSimple(), opts);
  zip.file("xl/workbook.xml", generateWorkbook(), opts);
  zip.file("xl/_rels/workbook.xml.rels", generateWorkbookRelsSimple(), opts);
  zip.file("xl/styles.xml", generateMinimalStyles(), opts);
  zip.file("xl/sharedStrings.xml", generateSharedStrings([]), opts);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData/></worksheet>`, opts);
  stampAllEntriesDeterministic(zip);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// src/ooxml/chart/chartExXml.ts
function flattenHierarchy(categories, ancestors = []) {
  const leaves = [];
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      leaves.push(...flattenHierarchy(cat.children, [cat.name, ...ancestors]));
    } else {
      leaves.push({ path: [cat.name, ...ancestors], value: cat.value ?? 0, color: cat.color });
    }
  }
  return leaves;
}
function generateChartExXml(chartData, excelRId) {
  switch (chartData.chartType) {
    case "treemap":
      return generateTreemapXml(chartData.treemapData, excelRId, chartData);
    case "sunburst":
      return generateSunburstXml(chartData.sunburstData, excelRId, chartData);
    case "histogram":
      return generateHistogramXml(chartData.histogramData, excelRId, chartData);
    case "boxWhisker":
      return generateBoxWhiskerXml(chartData.boxWhiskerData, excelRId, chartData);
    default:
      return "";
  }
}
function chartExPreamble() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cx:chartSpace xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
`;
}
function emitExternalData(excelRId) {
  return `    <cx:externalData r:id="${excelRId}"/>
`;
}
function emitStrDimLevels(leaves, maxDepth) {
  let xml = `      <cx:strDim type="cat">
`;
  for (let level = 0; level < maxDepth; level++) {
    xml += `        <cx:lvl ptCount="${leaves.length}">
`;
    for (let i = 0; i < leaves.length; i++) {
      const name = level < leaves[i].path.length ? leaves[i].path[level] : "";
      xml += `          <cx:pt idx="${i}">${escapeXml(name)}</cx:pt>
`;
    }
    xml += `        </cx:lvl>
`;
  }
  xml += `      </cx:strDim>
`;
  return xml;
}
function emitNumDimValues(values) {
  let xml = `      <cx:numDim type="val">
`;
  xml += `        <cx:lvl ptCount="${values.length}">
`;
  for (let i = 0; i < values.length; i++) {
    xml += `          <cx:pt idx="${i}">${values[i]}</cx:pt>
`;
  }
  xml += `        </cx:lvl>
`;
  xml += `      </cx:numDim>
`;
  return xml;
}
function emitDataLabels(dataLabels) {
  if (!dataLabels) return "";
  const pos = dataLabels.position ?? "ctr";
  const showVal = dataLabels.showVal ? "1" : "0";
  const showCat = dataLabels.showCatName ? "1" : "0";
  const showSer = dataLabels.showSerName ? "1" : "0";
  let xml = `          <cx:dataLabels pos="${pos}">
`;
  xml += `            <cx:visibility seriesName="${showSer}" categoryName="${showCat}" value="${showVal}"/>
`;
  xml += `          </cx:dataLabels>
`;
  return xml;
}
function emitDataPointColors(leaves) {
  let xml = "";
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].color) {
      const c = toHex(leaves[i].color);
      xml += `          <cx:dataPt idx="${i}">
`;
      xml += `            <cx:spPr>
`;
      xml += `              <a:solidFill><a:srgbClr val="${c}"/></a:solidFill>
`;
      xml += `            </cx:spPr>
`;
      xml += `          </cx:dataPt>
`;
    }
  }
  return xml;
}
function emitLegend(chartData) {
  const legend = chartData.legend;
  if (legend?.position === "none") return "";
  const posMap = { bottom: "b", top: "t", left: "l", right: "r" };
  const pos = posMap[legend?.position ?? "bottom"] ?? "b";
  return `    <cx:legend pos="${pos}" align="ctr" overlay="0"/>
`;
}
function emitTitle(chartData) {
  if (!chartData.title?.text) return "";
  const t = chartData.title;
  const fontSize = ooxmlTextFontSize(t.fontSize ?? 14, 14);
  const bold = t.bold ? ` b="1"` : "";
  const fontFamily = t.fontFamily ?? "Calibri";
  let colorXml = `<a:srgbClr val="000000"/>`;
  if (t.fontColor) {
    colorXml = `<a:srgbClr val="${toHex(t.fontColor)}"/>`;
  }
  let xml = `    <cx:title>
`;
  xml += `      <cx:tx>
`;
  xml += `        <cx:rich>
`;
  xml += `          <a:bodyPr/>
`;
  xml += `          <a:lstStyle/>
`;
  xml += `          <a:p>
`;
  xml += `            <a:r>
`;
  xml += `              <a:rPr lang="en-US" sz="${fontSize}"${bold}>
`;
  xml += `                <a:solidFill>${colorXml}</a:solidFill>
`;
  xml += `                <a:latin typeface="${escapeXmlAttr(fontFamily)}"/>
`;
  xml += `              </a:rPr>
`;
  xml += `              <a:t>${escapeXml(t.text)}</a:t>
`;
  xml += `            </a:r>
`;
  xml += `          </a:p>
`;
  xml += `        </cx:rich>
`;
  xml += `      </cx:tx>
`;
  xml += `    </cx:title>
`;
  return xml;
}
function generateTreemapXml(data, excelRId, chartData) {
  const leaves = flattenHierarchy(data.categories);
  const maxDepth = Math.max(...leaves.map((l) => l.path.length), 1);
  let xml = chartExPreamble();
  xml += `  <cx:chartData>
`;
  xml += emitExternalData(excelRId);
  xml += `    <cx:data id="0">
`;
  xml += emitStrDimLevels(leaves, maxDepth);
  xml += emitNumDimValues(leaves.map((l) => l.value));
  xml += `    </cx:data>
`;
  xml += `  </cx:chartData>
`;
  xml += `  <cx:chart>
`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>
`;
  xml += `      <cx:plotAreaRegion>
`;
  xml += `        <cx:series layoutId="treemap">
`;
  xml += emitDataPointColors(leaves);
  xml += emitDataLabels(data.dataLabels);
  xml += `          <cx:dataId val="0"/>
`;
  xml += `        </cx:series>
`;
  xml += `      </cx:plotAreaRegion>
`;
  xml += `    </cx:plotArea>
`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>
`;
  xml += `</cx:chartSpace>`;
  return xml;
}
function generateSunburstXml(data, excelRId, chartData) {
  const leaves = flattenHierarchy(data.categories);
  const maxDepth = Math.max(...leaves.map((l) => l.path.length), 1);
  let xml = chartExPreamble();
  xml += `  <cx:chartData>
`;
  xml += emitExternalData(excelRId);
  xml += `    <cx:data id="0">
`;
  xml += emitStrDimLevels(leaves, maxDepth);
  xml += emitNumDimValues(leaves.map((l) => l.value));
  xml += `    </cx:data>
`;
  xml += `  </cx:chartData>
`;
  xml += `  <cx:chart>
`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>
`;
  xml += `      <cx:plotAreaRegion>
`;
  xml += `        <cx:series layoutId="sunburst">
`;
  xml += emitDataPointColors(leaves);
  xml += emitDataLabels(data.dataLabels);
  xml += `          <cx:dataId val="0"/>
`;
  xml += `        </cx:series>
`;
  xml += `      </cx:plotAreaRegion>
`;
  xml += `    </cx:plotArea>
`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>
`;
  xml += `</cx:chartSpace>`;
  return xml;
}
function generateHistogramXml(data, excelRId, chartData) {
  const values = data.values;
  let xml = chartExPreamble();
  xml += `  <cx:chartData>
`;
  xml += emitExternalData(excelRId);
  xml += `    <cx:data id="0">
`;
  xml += emitNumDimValues(values);
  xml += `    </cx:data>
`;
  xml += `  </cx:chartData>
`;
  xml += `  <cx:chart>
`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>
`;
  xml += `      <cx:plotAreaRegion>
`;
  xml += `        <cx:series layoutId="clusteredColumn">
`;
  if (data.color) {
    const c = toHex(data.color);
    xml += `          <cx:spPr>
`;
    xml += `            <a:solidFill><a:srgbClr val="${c}"/></a:solidFill>
`;
    xml += `          </cx:spPr>
`;
  }
  xml += emitDataLabels(data.dataLabels);
  xml += `          <cx:dataId val="0"/>
`;
  xml += `        </cx:series>
`;
  xml += `      </cx:plotAreaRegion>
`;
  xml += `    </cx:plotArea>
`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>
`;
  xml += `</cx:chartSpace>`;
  return xml;
}
function generateBoxWhiskerXml(data, excelRId, chartData) {
  let xml = chartExPreamble();
  xml += `  <cx:chartData>
`;
  xml += emitExternalData(excelRId);
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];
    xml += `    <cx:data id="${i}">
`;
    if (data.categories.length > 0) {
      xml += `      <cx:strDim type="cat">
`;
      xml += `        <cx:lvl ptCount="${series.values.length}">
`;
      for (let j = 0; j < series.values.length; j++) {
        const catIdx = j % data.categories.length;
        xml += `          <cx:pt idx="${j}">${escapeXml(data.categories[catIdx])}</cx:pt>
`;
      }
      xml += `        </cx:lvl>
`;
      xml += `      </cx:strDim>
`;
    }
    xml += `      <cx:numDim type="val">
`;
    xml += `        <cx:lvl ptCount="${series.values.length}">
`;
    for (let j = 0; j < series.values.length; j++) {
      xml += `          <cx:pt idx="${j}">${series.values[j]}</cx:pt>
`;
    }
    xml += `        </cx:lvl>
`;
    xml += `      </cx:numDim>
`;
    xml += `    </cx:data>
`;
  }
  xml += `  </cx:chartData>
`;
  xml += `  <cx:chart>
`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>
`;
  xml += `      <cx:plotAreaRegion>
`;
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];
    xml += `        <cx:series layoutId="boxWhisker">
`;
    xml += `          <cx:tx>
`;
    xml += `            <cx:txData><cx:v>${escapeXml(series.name)}</cx:v></cx:txData>
`;
    xml += `          </cx:tx>
`;
    if (series.color) {
      const c = toHex(series.color);
      xml += `          <cx:spPr>
`;
      xml += `            <a:solidFill><a:srgbClr val="${c}"/></a:solidFill>
`;
      xml += `          </cx:spPr>
`;
    }
    xml += emitDataLabels(data.dataLabels);
    xml += `          <cx:dataId val="${i}"/>
`;
    xml += `        </cx:series>
`;
  }
  xml += `      </cx:plotAreaRegion>
`;
  xml += `    </cx:plotArea>
`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>
`;
  xml += `</cx:chartSpace>`;
  return xml;
}

// src/ooxml/chart/index.ts
var FREE_CHART_TYPES_SET = /* @__PURE__ */ new Set([
  "bar",
  "line",
  "pie",
  "doughnut",
  "scatter",
  "area"
]);
function countChartRelationshipSlots2(manifest) {
  return manifest.charts.reduce((sum, chart) => {
    let count = sum;
    if (chart.rId) count += 1;
    if (chart.fallbackRId) count += 1;
    return count;
  }, 0);
}
function collectChartNodes(node) {
  return collectLayoutNodes(node, (candidate) => candidate.type === "Chart", { skipHidden: true });
}
async function processSlideCharts(layoutTree, globalChartCounter, startRId, globalChartExCounter = { current: 1 }, globalMediaCounter, enableFallbackImages, themeColors) {
  const chartNodes = collectChartNodes(layoutTree);
  if (chartNodes.length === 0) return { charts: [] };
  const free = isLiteBundle();
  let rIdCounter = startRId;
  const allocations = chartNodes.map((chartNode) => {
    const chartData = chartNode.chartData;
    if (free) {
      if (!FREE_CHART_TYPES_SET.has(chartData.chartType)) {
        throw new PaperError(
          `Chart type "${chartData.chartType}" requires Runstamp Pro. Free tier supports: bar, line, pie, doughnut, scatter, area. See https://runstamp.com/pricing`,
          { code: "FEATURE_REQUIRES_UPGRADE", phase: "chart" }
        );
      }
      if (chartData.series?.some((s) => s.overrideType !== void 0)) {
        throw new PaperError(
          `Combo charts (mixed chart types) are not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.`,
          { code: "FEATURE_REQUIRES_UPGRADE", phase: "chart" }
        );
      }
    }
    const isChartEx = isChartExType(chartData.chartType);
    const compatibilityMode = chartNode._compatibility?.mode;
    const imageOnly = compatibilityMode === "visual_fallback";
    const chartIndex = imageOnly ? 0 : isChartEx ? globalChartExCounter.current++ : globalChartCounter.current++;
    const rId = imageOnly ? void 0 : `rId${rIdCounter++}`;
    let fallbackRId;
    let mediaIdx;
    const requiresFallbackImage = imageOnly || enableFallbackImages;
    if (requiresFallbackImage && !globalMediaCounter) {
      throw new PaperError(
        "Chart fallback rasterization was required, but no media allocation context was available for the fallback image.",
        {
          code: "PPTX_CHART_FALLBACK_MISSING",
          phase: "chart"
        }
      );
    }
    if (requiresFallbackImage && globalMediaCounter) {
      fallbackRId = `rId${rIdCounter++}`;
      mediaIdx = globalMediaCounter.current++;
    }
    return {
      chartNode,
      chartData,
      isChartEx,
      chartIndex,
      rId,
      fallbackRId,
      mediaIdx,
      imageOnly,
      requiresFallbackImage
    };
  });
  const charts = await Promise.all(allocations.map(async (alloc) => {
    const { chartNode, chartData, isChartEx, chartIndex, rId, imageOnly } = alloc;
    let fallbackRId;
    let fallbackPng;
    let fallbackMediaPath;
    let fallbackRelativePath;
    if (alloc.requiresFallbackImage && alloc.fallbackRId != null && alloc.mediaIdx != null) {
      const { width, height } = chartNode.layout;
      fallbackPng = await rasterizeChart(chartData, { width, height }, themeColors);
      if (!fallbackPng) {
        throw new PaperError(
          "Chart fallback rasterization was required, but no fallback image artifact was produced.",
          {
            code: "PPTX_CHART_FALLBACK_MISSING",
            phase: "chart"
          }
        );
      }
      if (fallbackPng) {
        fallbackRId = alloc.fallbackRId;
        fallbackMediaPath = `ppt/media/image${alloc.mediaIdx}.png`;
        fallbackRelativePath = `../media/image${alloc.mediaIdx}.png`;
      }
    }
    let excelBuffer;
    let chartXml;
    let chartRelsXml;
    let chartDrawingXml;
    if (!imageOnly) {
      excelBuffer = await generateExcelBuffer(chartData);
      const textAnnotationCount = (chartData.annotations ?? []).reduce(
        (count, a) => count + ((a.kind ?? "text") === "text" ? 1 : 0),
        0
      );
      const hasAnnotations = !isChartEx && textAnnotationCount > 0;
      const prefix = isChartEx ? `chartEx${chartIndex}` : `chart${chartIndex}`;
      const excelRelPath = `../embeddings/${prefix}.xlsx`;
      if (isChartEx) {
        chartXml = generateChartExXml(chartData, "rId1");
        chartRelsXml = generateChartExRels(excelRelPath);
      } else {
        chartXml = generateChartXml(chartData, "rId1", { width: chartNode.layout.width, height: chartNode.layout.height });
        if (hasAnnotations) {
          chartDrawingXml = generateChartDrawingXml(chartData.annotations);
          chartRelsXml = generateChartRelsWithDrawingSimple(excelRelPath, `../drawings/drawing${chartIndex}.xml`);
        } else {
          chartRelsXml = generateChartRelsSimple(excelRelPath);
        }
      }
    }
    return {
      chartIndex,
      rId,
      chartXml,
      chartRelsXml,
      excelBuffer,
      isChartEx,
      chartDrawingXml,
      fallbackPng,
      fallbackRId,
      fallbackMediaPath,
      fallbackRelativePath,
      renderMode: imageOnly ? "image-only" : fallbackRId ? "alternate" : "native"
    };
  }));
  return { charts };
}

export {
  someLayoutNode,
  parseWebVideoUrl,
  isWebVideoUrl,
  createMediaFetchBudget,
  hashBuffer,
  collectImageNodes,
  resolveImageSource,
  processSlideMedia,
  countVideoAudioRIds,
  computeChartStartRId,
  generateSlideShell,
  generateNotesSlide,
  generateNotesMaster,
  generateSlideRels,
  generateNotesSlideRels,
  generateNotesMasterRels,
  generateNotesTheme,
  PptxArchive,
  serializeSlideTree,
  countChartRelationshipSlots2 as countChartRelationshipSlots,
  collectChartNodes,
  processSlideCharts
};
//# sourceMappingURL=chunk-H3JJGCUR.js.map
