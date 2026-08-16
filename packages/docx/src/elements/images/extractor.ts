/**
 * Image extraction utilities for DOCX.
 *
 * Extracts image information from StructuredDocument elements.
 * Production-ready with timeout, retry logic, and size limits.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { ImageElement, ComputedStyle } from '../../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Image fetching configuration for production reliability.
 */
export interface ImageFetchConfig {
  /** Whether remote http(s) image fetching is allowed (default: false) */
  allowExternal?: boolean;
  /** Timeout in milliseconds for image fetch (default: 10000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Maximum HTTP redirects to follow (default: 3) */
  maxRedirects?: number;
  /** Maximum image size in bytes (default: 10MB) */
  maxSize?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryBaseDelay?: number;
}

export interface ImageFetchRuntimeBudget {
  /** Hard wall-time deadline for this operation, supplied by the render context. */
  totalTimeoutMs?: number;
}

/**
 * Default fetch configuration.
 */
const DEFAULT_FETCH_CONFIG: Required<ImageFetchConfig> = {
  allowExternal: false,
  timeout: 10000,      // 10 seconds
  retries: 3,          // 3 attempts
  maxRedirects: 3,      // Bounded redirects for release/deterministic gates
  maxSize: 10485760,   // 10MB
  retryBaseDelay: 1000, // 1 second base delay
};

function parseIpv4(address: string): number[] | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  return octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? octets
    : null;
}

function isNonPublicIpv4(address: string): boolean {
  const octets = parseIpv4(address);
  if (!octets) return true;
  const [a, b, c] = octets;

  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 192 && b === 88 && c === 99)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function parseIpv6(address: string): number[] | null {
  let normalized = address.toLowerCase();
  const zoneIndex = normalized.indexOf('%');
  if (zoneIndex >= 0) normalized = normalized.slice(0, zoneIndex);

  const ipv4Tail = normalized.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (ipv4Tail) {
    const octets = parseIpv4(ipv4Tail);
    if (!octets) return null;
    normalized = normalized.slice(0, -ipv4Tail.length)
      + `${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const omitted = 8 - left.length - right.length;
  if ((halves.length === 1 && omitted !== 0) || omitted < 0) return null;
  const groups = [...left, ...Array(omitted).fill('0'), ...right];
  const words = groups.map((group) => Number.parseInt(group || '0', 16));
  return words.length === 8 && words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff)
    ? words
    : null;
}

/** Return true for addresses that must never be contacted by remote image fetches. */
export function isNonPublicIpAddress(address: string): boolean {
  if (isIP(address) === 4) return isNonPublicIpv4(address);
  if (isIP(address) !== 6) return true;

  const words = parseIpv6(address);
  if (!words) return true;
  const [a, b, c, d, e, f, g, h] = words;

  // Unspecified, loopback, unique-local, link-local, multicast, documentation,
  // discard-only, and benchmarking ranges are not valid public fetch targets.
  if (words.every((word) => word === 0)
    || (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && g === 0 && h === 1)
    || (a! & 0xfe00) === 0xfc00
    || (a! & 0xffc0) === 0xfe80
    || (a! & 0xffc0) === 0xfec0
    || (a! & 0xff00) === 0xff00
    || (a === 0x2001 && b === 0)
    || (a === 0x2001 && b === 0x0db8)
    || (a === 0x2001 && b === 0x0002)
    || (a! & 0xfff0) === 0x3ff0
    || (a === 0x0100 && b === 0 && c === 0 && d === 0)) {
    return true;
  }

  // IPv4-mapped/compatible, NAT64, and 6to4 addresses inherit the security
  // classification of the embedded IPv4 destination.
  const embeddedIpv4 = `${g! >> 8}.${g! & 0xff}.${h! >> 8}.${h! & 0xff}`;
  if ((a === 0 && b === 0 && c === 0 && d === 0
      && ((e === 0 && (f === 0 || f === 0xffff)) || (e === 0xffff && f === 0)))
    || (a === 0x0064 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0)) {
    return isNonPublicIpv4(embeddedIpv4);
  }
  if (a === 0x0064 && b === 0xff9b && c === 1) return true;
  if (a === 0x2002) {
    const sixToFourIpv4 = `${b! >> 8}.${b! & 0xff}.${c! >> 8}.${c! & 0xff}`;
    return isNonPublicIpv4(sixToFourIpv4);
  }
  if (f === 0x5efe && (e === 0 || e === 0x0200)) {
    return isNonPublicIpv4(embeddedIpv4);
  }

  return false;
}

async function assertSafeExternalUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl);
  } catch {
    throw new Error(`External image URL is invalid: ${rawUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`External image URL must use http or https: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('External image URL credentials are not allowed');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error(`External image URL resolves to a non-public host: ${hostname}`);
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);
  if (addresses.length === 0) {
    throw new Error(`External image host did not resolve: ${hostname}`);
  }
  const blocked = addresses.find(isNonPublicIpAddress);
  if (blocked) {
    throw new Error(`External image URL resolves to a non-public address: ${blocked}`);
  }

  return parsed.toString();
}

/**
 * Check if an image appears to be floating/wrapped.
 */
function isFloatingImageStyle(style: ComputedStyle | undefined): boolean {
  if (!style) return false;
  // ComputedStyle doesn't have float/position, so floating detection is limited
  return false;
}

/**
 * Detect image alignment from styles.
 */
function detectImageAlignmentFromStyle(style: ComputedStyle | undefined): 'left' | 'center' | 'right' {
  if (!style) return 'left';

  // Check text align
  if (style.textAlign === 'center') return 'center';
  if (style.textAlign === 'right') return 'right';

  return 'left';
}

/**
 * Supported image types.
 * Note: 'webp' and 'heic' require conversion for Word compatibility.
 */
export type ImageType = 'png' | 'jpeg' | 'gif' | 'bmp' | 'svg' | 'webp' | 'heic';

/**
 * Image types that require conversion for Word compatibility.
 */
export const CONVERSION_REQUIRED_TYPES: ImageType[] = ['webp', 'heic', 'svg'];

/**
 * Check if an image type requires conversion for Word.
 */
export function requiresConversion(type: ImageType): boolean {
  return CONVERSION_REQUIRED_TYPES.includes(type);
}

/**
 * Extracted image data.
 */
export interface ExtractedImage {
  id: string;
  src: string;
  width: number; // pixels
  height: number; // pixels
  alt: string;
  title?: string;
  position: 'inline' | 'floating';
  alignment: 'left' | 'center' | 'right';
  type: ImageType;
  isDataUri: boolean;
  isExternalUrl: boolean;
  /** True if format requires conversion for Word compatibility (webp, heic, svg) */
  needsConversion: boolean;
  /** True if the image is decorative (no alt text for screen readers) */
  decorative?: boolean;
}

/**
 * Image data ready for rendering.
 */
export interface PreparedImage extends ExtractedImage {
  buffer?: Buffer;
  error?: string;
  /** External response bytes downloaded before an error was detected. */
  fetchedBytes?: number;
}

/**
 * Generate a unique image ID.
 */
let imageIdCounter = 0;
export function generateImageId(): string {
  return `img-${++imageIdCounter}`;
}

/**
 * Detect image type from source.
 */
export function detectImageType(src: string): ImageType {
  // Check data URI mime type (handles svg+xml format)
  const dataUriMatch = src.match(/^data:image\/([\w+]+);/);
  if (dataUriMatch) {
    const type = dataUriMatch[1].toLowerCase();
    if (type === 'jpeg' || type === 'jpg') return 'jpeg';
    if (type === 'png') return 'png';
    if (type === 'gif') return 'gif';
    if (type === 'bmp') return 'bmp';
    if (type === 'svg' || type === 'svg+xml') return 'svg';
    if (type === 'webp') return 'webp';
    if (type === 'heic' || type === 'heif') return 'heic';
    return 'png'; // Default
  }

  // Check file extension
  const extMatch = src.match(/\.(\w+)(?:\?.*)?$/i);
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    if (ext === 'jpeg' || ext === 'jpg') return 'jpeg';
    if (ext === 'png') return 'png';
    if (ext === 'gif') return 'gif';
    if (ext === 'bmp') return 'bmp';
    if (ext === 'svg') return 'svg';
    if (ext === 'webp') return 'webp';
    if (ext === 'heic' || ext === 'heif') return 'heic';
  }

  return 'png'; // Default to PNG
}

/**
 * Check if source is a data URI.
 */
export function isDataUri(src: string): boolean {
  return src.startsWith('data:');
}

/**
 * Check if source is an external URL.
 */
export function isExternalUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
}

/**
 * Extract image data from a data URI.
 */
export function extractDataUriBuffer(dataUri: string): Buffer | null {
  const match = dataUri.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

/**
 * Extract image information from an ImageElement.
 */
export function extractImage(element: ImageElement): ExtractedImage {
  const src = element.src || '';
  const width = element.position?.width || 400;
  const height = element.position?.height || 300;
  const type = detectImageType(src);

  return {
    id: generateImageId(),
    src,
    width,
    height,
    alt: element.alt || '',
    title: undefined, // ImageElement doesn't have title
    position: isFloatingImageStyle(element.style) ? 'floating' : 'inline',
    alignment: detectImageAlignmentFromStyle(element.style),
    type,
    isDataUri: isDataUri(src),
    isExternalUrl: isExternalUrl(src),
    needsConversion: requiresConversion(type),
    decorative: element.decorative,
  };
}

/**
 * Prepare image data for rendering (sync version - data URIs only).
 */
export function prepareImageSync(extracted: ExtractedImage): PreparedImage {
  if (extracted.isDataUri) {
    const buffer = extractDataUriBuffer(extracted.src);
    if (buffer) {
      return { ...extracted, buffer };
    }
    return { ...extracted, error: 'Failed to decode data URI' };
  }

  if (extracted.isExternalUrl) {
    return { ...extracted, error: 'External URLs require async fetching' };
  }

  return { ...extracted, error: 'Unknown image source type' };
}

/**
 * Sleep utility for retry backoff.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timeoutId = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      resolve();
    }, { once: true });
  });
}

/**
 * Fetch image with timeout.
 * Returns the response or throws on timeout/error.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Runstamp-DOCX/1.0',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFollowingRedirects(
  url: string,
  config: Required<ImageFetchConfig>,
  signal?: AbortSignal,
): Promise<Response | { error: string }> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= config.maxRedirects; redirectCount += 1) {
    // Resolve and classify every hop. Requiring every A/AAAA answer to be
    // public prevents an attacker from hiding a private destination among
    // otherwise-public DNS answers.
    currentUrl = await assertSafeExternalUrl(currentUrl);
    const response = await fetchWithTimeout(currentUrl, config.timeout, signal);
    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      return { error: `Redirect response ${response.status} did not include a Location header` };
    }
    if (redirectCount >= config.maxRedirects) {
      return { error: `Too many redirects while fetching image (max: ${config.maxRedirects})` };
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  return { error: `Too many redirects while fetching image (max: ${config.maxRedirects})` };
}

/**
 * Calculate delay with exponential backoff and jitter.
 * Jitter prevents thundering herd when many requests fail simultaneously.
 * @param attempt - The attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds with ±25% jitter
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  // Exponential: baseDelay * 2^attempt (0, 1, 2, 3...)
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter: ±25% randomization
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponentialDelay + jitter);
}

/**
 * Fetch image with retry logic and exponential backoff.
 * Production-ready with:
 * - Configurable timeout per request
 * - Exponential backoff with jitter to prevent thundering herd
 * - Smart retry logic (no retry on 4xx except 429)
 * - Size validation before and after download
 */
async function fetchWithRetry(
  url: string,
  config: Required<ImageFetchConfig>,
  signal?: AbortSignal,
): Promise<{ buffer: Buffer } | { error: string; fetchedBytes?: number }> {
  let lastError: string = 'Unknown error';
  const errors: string[] = [];

  for (let attempt = 0; attempt < config.retries; attempt++) {
    try {
      // Exponential backoff with jitter (skip delay on first attempt)
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, config.retryBaseDelay);
        await sleep(delay, signal);
        if (signal?.aborted) {
          return { error: 'External image fetch time budget exceeded' };
        }
      }

      const response = await fetchFollowingRedirects(url, config, signal);
      if ('error' in response) {
        return { error: response.error };
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        errors.push(`Attempt ${attempt + 1}: ${lastError}`);

        // Don't retry on 4xx client errors (except 429 rate limiting)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return { error: `${lastError} (not retryable)` };
        }
        continue; // Retry on 5xx or 429
      }

      // Check Content-Length if available
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > config.maxSize) {
        const sizeMB = (parseInt(contentLength, 10) / 1024 / 1024).toFixed(2);
        const maxMB = (config.maxSize / 1024 / 1024).toFixed(2);
        return { error: `Image too large: ${sizeMB}MB (max: ${maxMB}MB)` };
      }

      const arrayBuffer = await response.arrayBuffer();

      // Verify actual size
      if (arrayBuffer.byteLength > config.maxSize) {
        const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
        const maxMB = (config.maxSize / 1024 / 1024).toFixed(2);
        return {
          error: `Image too large: ${sizeMB}MB (max: ${maxMB}MB)`,
          fetchedBytes: arrayBuffer.byteLength,
        };
      }

      return { buffer: Buffer.from(arrayBuffer) };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = `Timeout after ${config.timeout}ms`;
        } else {
          lastError = error.message;
        }
      } else {
        lastError = String(error);
      }
      errors.push(`Attempt ${attempt + 1}: ${lastError}`);
      // Continue to retry
    }
  }

  // Provide detailed error message
  const summary = errors.length > 1
    ? `Failed after ${config.retries} attempts. Last error: ${lastError}`
    : lastError;
  return { error: summary };
}

/**
 * Prepare image data for rendering (async version - supports URLs).
 * Production-ready with timeout, retry logic, and size limits.
 */
export async function prepareImageAsync(
  extracted: ExtractedImage,
  config: ImageFetchConfig = {},
  runtimeBudget: ImageFetchRuntimeBudget = {},
): Promise<PreparedImage> {
  const mergedConfig = { ...DEFAULT_FETCH_CONFIG, ...config };

  // Handle data URIs synchronously
  if (extracted.isDataUri) {
    const result = prepareImageSync(extracted);

    // Check size for data URIs too
    if (result.buffer && result.buffer.length > mergedConfig.maxSize) {
      return {
        ...extracted,
        error: `Image too large: ${result.buffer.length} bytes (max: ${mergedConfig.maxSize})`
      };
    }

    return result;
  }

  // Handle external URLs with retry logic
  if (extracted.isExternalUrl) {
    if (!mergedConfig.allowExternal) {
      return {
        ...extracted,
        error: 'External image fetching is disabled for this render. Use a data URI, Buffer, assetId, or set imageFetch.allowExternal explicitly.',
      };
    }

    const totalTimeoutMs = runtimeBudget.totalTimeoutMs;
    const budgetController = totalTimeoutMs !== undefined
      ? new AbortController()
      : undefined;
    let budgetTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      fetchWithRetry(extracted.src, mergedConfig, budgetController?.signal),
      ...(budgetController && totalTimeoutMs !== undefined
        ? [new Promise<{ error: string }>((resolve) => {
          budgetTimeoutId = setTimeout(() => {
            budgetController.abort();
            resolve({ error: `External image fetch time budget exceeded after ${totalTimeoutMs}ms` });
          }, totalTimeoutMs);
        })]
        : []),
    ]).finally(() => {
      if (budgetTimeoutId !== undefined) {
        clearTimeout(budgetTimeoutId);
      }
    });

    if ('error' in result) {
      return {
        ...extracted,
        error: result.error,
        fetchedBytes: 'fetchedBytes' in result ? result.fetchedBytes : undefined,
      };
    }

    return { ...extracted, buffer: result.buffer };
  }

  return { ...extracted, error: 'Unknown image source type' };
}

/**
 * Get default fetch configuration.
 */
export function getDefaultFetchConfig(): Required<ImageFetchConfig> {
  return { ...DEFAULT_FETCH_CONFIG };
}

/**
 * Calculate image dimensions maintaining aspect ratio.
 */
export function calculateImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;
  const aspectRatio = width / height;

  // Scale down to max width
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Scale down to max height if provided
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Convert pixels to EMUs (English Metric Units) for DOCX images.
 * 1 pixel at 96 DPI = 9525 EMUs
 */
export function pixelsToEmu(px: number): number {
  return Math.round(px * 9525);
}
