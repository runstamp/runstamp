import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve as resolvePath } from "node:path";
import { PdfError } from "./errors.js";
import type { PdfAssetPolicy } from "./phase9-types.js";

export type PdfFontSource = Buffer | Uint8Array | string;
export const MAX_FONT_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_PDF_FONT_SOURCE_BYTES = MAX_FONT_FILE_SIZE;
const DEFAULT_REMOTE_TIMEOUT_MS = 5000;

export interface PdfFontSourceContext {
  assetPolicy?: PdfAssetPolicy;
  family?: string;
  sourceKind?: string;
}

export function sha1Buffer(input: Buffer | Uint8Array | string): string {
  return createHash("sha1").update(input).digest("hex");
}

export function sanitizePostScriptName(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "");
}

function describeFontSource(source: PdfFontSource, context: PdfFontSourceContext | undefined): string {
  const sourceKind = context?.sourceKind ?? inferSourceKind(source);
  const family = context?.family ? ` family "${context.family}"` : "";
  const location = typeof source === "string" && sourceKind === "file" ? ` at ${resolveFileSource(source, context?.assetPolicy)}` : "";
  return `${sourceKind} font source${family}${location}`;
}

function inferSourceKind(source: PdfFontSource): string {
  if (typeof source !== "string") {
    return Buffer.isBuffer(source) ? "buffer" : "uint8array";
  }
  if (source.startsWith("data:")) {
    return "data-url";
  }
  const scheme = parseSourceScheme(source);
  return scheme ? `${scheme}-url` : "file";
}

function parseSourceScheme(value: string): string | undefined {
  const match = value.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  return match?.[1]?.toLowerCase();
}

function isSchemeAllowed(scheme: "file" | "data" | "http" | "https", policy: PdfAssetPolicy | undefined): boolean {
  return (policy?.allowedSchemes ?? ["file", "data", "http", "https"]).includes(scheme);
}

function effectiveMaxBytes(maxBytes: number, policy: PdfAssetPolicy | undefined): number {
  return policy?.maxSourceBytes === undefined ? maxBytes : Math.min(maxBytes, policy.maxSourceBytes);
}

function assetPolicyError(message: string, details: Record<string, unknown>): PdfError {
  return new PdfError("ASSET_SOURCE_REJECTED", message, details);
}

function assetLoadError(message: string, details: Record<string, unknown>, cause?: unknown): PdfError {
  return new PdfError("ASSET_SOURCE_FAILED", message, details, { cause });
}

function assertSourceSize(buffer: Buffer, maxBytes: number, description: string): void {
  if (buffer.length > maxBytes) {
    throw assetPolicyError(`Font source exceeds ${maxBytes} bytes: ${description}`, {
      maxBytes,
      sourceKind: description,
    });
  }
}

function resolveFileSource(source: string, policy: PdfAssetPolicy | undefined): string {
  const baseDirectory = policy?.baseDirectory ? resolvePath(policy.baseDirectory) : undefined;
  const resolved = baseDirectory && !isAbsolute(source)
    ? resolvePath(baseDirectory, source)
    : resolvePath(source);

  if (baseDirectory) {
    const pathWithinBase = relative(baseDirectory, resolved);
    if (pathWithinBase.startsWith("..") || isAbsolute(pathWithinBase)) {
      throw assetPolicyError("File source is outside the configured PDF asset baseDirectory.", {
        baseDirectory,
        scheme: "file",
        source,
      });
    }
  }

  return resolved;
}

function decodeDataUrl(source: string, maxBytes: number, description: string, policy: PdfAssetPolicy | undefined): Buffer {
  if (!isSchemeAllowed("data", policy)) {
    throw assetPolicyError("Data URL sources are not allowed by the PDF asset policy.", {
      scheme: "data",
    });
  }
  const commaIndex = source.indexOf(",");
  if (commaIndex < 0) {
    throw assetLoadError("Malformed data URL source.", { scheme: "data" });
  }
  const meta = source.slice(5, commaIndex);
  const payload = source.slice(commaIndex + 1);
  let buffer: Buffer;
  try {
    buffer = meta.toLowerCase().includes(";base64")
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
  } catch (error) {
    throw assetLoadError("Unable to decode data URL source.", { scheme: "data" }, error);
  }
  assertSourceSize(buffer, maxBytes, description);
  return buffer;
}

async function readRemoteSource(source: string, maxBytes: number, description: string, policy: PdfAssetPolicy | undefined): Promise<Buffer> {
  const url = new URL(source);
  const scheme = url.protocol.slice(0, -1) as "http" | "https";
  if (!isSchemeAllowed(scheme, policy)) {
    throw assetPolicyError(`Remote ${scheme}: sources are not allowed by the PDF asset policy.`, {
      scheme,
      url: source,
    });
  }
  if (!policy?.allowRemoteSources) {
    throw assetPolicyError("Remote PDF asset sources are disabled. Pass assetPolicy.allowRemoteSources: true to enable http(s) loading.", {
      scheme,
      url: source,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), policy.timeoutMs ?? DEFAULT_REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw assetLoadError(`Remote source responded with HTTP ${response.status}.`, {
        scheme,
        status: response.status,
        url: source,
      });
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
      throw assetPolicyError(`Remote source exceeds ${maxBytes} bytes: ${description}`, {
        contentLength: Number.parseInt(contentLength, 10),
        maxBytes,
        scheme,
        url: source,
      });
    }
    if (!response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      assertSourceSize(buffer, maxBytes, description);
      return buffer;
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        controller.abort();
        throw assetPolicyError(`Remote source exceeds ${maxBytes} bytes: ${description}`, {
          maxBytes,
          scheme,
          url: source,
        });
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof PdfError) {
      throw error;
    }
    throw assetLoadError(`Unable to read remote PDF asset source: ${error instanceof Error ? error.message : String(error)}`, {
      scheme,
      url: source,
    }, error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadFontSourceBuffer(
  source: PdfFontSource,
  maxBytes = MAX_PDF_FONT_SOURCE_BYTES,
  context?: PdfFontSourceContext,
): Promise<Buffer> {
  const description = describeFontSource(source, context);
  const cappedMaxBytes = effectiveMaxBytes(maxBytes, context?.assetPolicy);
  if (typeof source === "string") {
    const scheme = parseSourceScheme(source);
    if (scheme === "data") {
      return decodeDataUrl(source, cappedMaxBytes, description, context?.assetPolicy);
    }
    if (scheme === "http" || scheme === "https") {
      return readRemoteSource(source, cappedMaxBytes, description, context?.assetPolicy);
    }
    if (scheme && scheme !== "file") {
      throw assetPolicyError(`Unsupported PDF asset source scheme "${scheme}:".`, {
        scheme,
      });
    }
    if (!isSchemeAllowed("file", context?.assetPolicy)) {
      throw assetPolicyError("File sources are not allowed by the PDF asset policy.", {
        scheme: "file",
      });
    }
    const resolved = scheme === "file"
      ? resolveFileSource(new URL(source).pathname, context?.assetPolicy)
      : resolveFileSource(source, context?.assetPolicy);
    let info;
    try {
      info = await stat(resolved);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw assetLoadError(`Unable to read metadata for ${description}: ${reason}`, {
        scheme: "file",
        source,
      }, error);
    }
    if (info.size > cappedMaxBytes) {
      throw assetPolicyError(`Font source exceeds ${cappedMaxBytes} bytes: ${description}`, {
        maxBytes: cappedMaxBytes,
        scheme: "file",
        source,
      });
    }
    let buffer: Buffer;
    try {
      buffer = await readFile(resolved);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw assetLoadError(`Unable to read ${description}: ${reason}`, {
        scheme: "file",
        source,
      }, error);
    }
    assertSourceSize(buffer, cappedMaxBytes, description);
    return buffer;
  }

  const buffer = Buffer.from(source);
  assertSourceSize(buffer, cappedMaxBytes, description);
  return buffer;
}

export function buildPdfBinarySourceKey(source: PdfFontSource): string {
  if (typeof source !== "string") {
    return sha1Buffer(Buffer.from(source));
  }
  const scheme = parseSourceScheme(source);
  if (scheme === "data") {
    return `data:${sha1Buffer(source)}`;
  }
  if (scheme === "http" || scheme === "https" || scheme === "file") {
    return source;
  }
  return resolvePath(source);
}

export function buildFontSourceKey(source: PdfFontSource, family: string): string {
  const sourcePart = buildPdfBinarySourceKey(source);
  return `${family}::${sourcePart}`;
}
