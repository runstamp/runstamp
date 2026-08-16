import { deflate } from "pako";
import { PNG } from "pngjs";
import { loadFontSourceBuffer, sha1Buffer } from "./font-source.js";
import type { PdfAssetPolicy } from "./phase9-types.js";

const MAX_PDF_IMAGE_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_PDF_IMAGE_DIMENSION = 16_384;
export const MAX_IMAGE_PIXELS = 50_000_000;
const MAX_PDF_IMAGE_PIXELS = MAX_IMAGE_PIXELS;
const MAX_PDF_IMAGE_RAW_BYTES = 256 * 1024 * 1024;

export interface PreparedJpegImage {
  buffer: Buffer;
  colorSpace: "DeviceCMYK" | "DeviceGray" | "DeviceRGB";
  format: "jpeg";
  hash: string;
  height: number;
  width: number;
}

export interface PreparedPngImage {
  alphaBuffer?: Buffer;
  colorSpace: "DeviceRGB";
  compressedAlpha?: Buffer;
  compressedRgb: Buffer;
  format: "png";
  hash: string;
  height: number;
  rawAlphaLength?: number;
  rawRgbLength: number;
  width: number;
}

export type PreparedPdfImage = PreparedJpegImage | PreparedPngImage;

function assertMarker(buffer: Buffer, index: number, first: number, second: number): void {
  if (buffer[index] !== first || buffer[index + 1] !== second) {
    throw new Error("Invalid JPEG marker sequence");
  }
}

function detectJpegColorSpace(componentCount: number): PreparedJpegImage["colorSpace"] {
  if (componentCount === 1) {
    return "DeviceGray";
  }
  if (componentCount === 4) {
    return "DeviceCMYK";
  }
  return "DeviceRGB";
}

export function looksLikeJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
}

export function looksLikePng(buffer: Buffer): boolean {
  return buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
}

function parsePngDimensions(buffer: Buffer): {
  height: number;
  width: number;
} {
  if (!looksLikePng(buffer) || buffer.length < 33) {
    throw new Error("Invalid PNG header");
  }

  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.toString("ascii", 12, 16);
  if (ihdrType !== "IHDR" || ihdrLength < 8) {
    throw new Error("Invalid PNG IHDR chunk");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function parseJpegDimensions(buffer: Buffer): {
  colorSpace: PreparedJpegImage["colorSpace"];
  height: number;
  width: number;
} {
  assertMarker(buffer, 0, 0xff, 0xd8);
  let offset = 2;

  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset] as number;
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      throw new Error("Invalid JPEG segment length");
    }

    const isStartOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3,
      0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf,
    ].includes(marker);

    if (isStartOfFrame) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      const components = buffer[offset + 7] as number;
      return {
        colorSpace: detectJpegColorSpace(components),
        height,
        width,
      };
    }

    offset += segmentLength;
  }

  throw new Error("Unable to locate JPEG dimensions");
}

function assertImageDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Image dimensions must be positive finite numbers");
  }
  if (width > MAX_PDF_IMAGE_DIMENSION || height > MAX_PDF_IMAGE_DIMENSION) {
    throw new Error(`Image dimensions exceed ${MAX_PDF_IMAGE_DIMENSION}px limit`);
  }
  if (width * height > MAX_PDF_IMAGE_PIXELS) {
    throw new Error(`Image exceeds ${MAX_PDF_IMAGE_PIXELS} pixel limit`);
  }
}

function buildPredictorBuffer(width: number, height: number, bytesPerPixel: number, values: Uint8Array): Buffer {
  const rowLength = width * bytesPerPixel;
  const output = Buffer.allocUnsafe((rowLength + 1) * height);

  for (let row = 0; row < height; row += 1) {
    const outputOffset = row * (rowLength + 1);
    const inputOffset = row * rowLength;
    output[outputOffset] = 0;
    Buffer.from(values.subarray(inputOffset, inputOffset + rowLength)).copy(output, outputOffset + 1);
  }

  return output;
}

export async function preparePdfImage(
  source: Buffer | Uint8Array | string,
  formatHint?: "jpeg" | "png",
  assetPolicy?: PdfAssetPolicy,
): Promise<PreparedPdfImage> {
  const buffer = await loadFontSourceBuffer(source, MAX_PDF_IMAGE_SOURCE_BYTES, {
    assetPolicy,
    sourceKind: "image",
  });

  if (formatHint === "jpeg" || looksLikeJpeg(buffer)) {
    const dimensions = parseJpegDimensions(buffer);
    assertImageDimensions(dimensions.width, dimensions.height);
    return {
      buffer,
      colorSpace: dimensions.colorSpace,
      format: "jpeg",
      hash: sha1Buffer(buffer),
      height: dimensions.height,
      width: dimensions.width,
    };
  }

  if (formatHint === "png" || looksLikePng(buffer)) {
    const dimensions = parsePngDimensions(buffer);
    assertImageDimensions(dimensions.width, dimensions.height);
    const png = PNG.sync.read(buffer);
    const rawRgbBytes = png.width * png.height * 3;
    const rawAlphaBytes = png.width * png.height;
    if (rawRgbBytes + rawAlphaBytes > MAX_PDF_IMAGE_RAW_BYTES) {
      throw new Error(`Decoded PNG exceeds ${MAX_PDF_IMAGE_RAW_BYTES} byte limit`);
    }
    const rgbValues = Buffer.allocUnsafe(png.width * png.height * 3);
    const alphaValues = Buffer.allocUnsafe(png.width * png.height);
    let hasAlpha = false;

    for (let pixelIndex = 0; pixelIndex < png.width * png.height; pixelIndex += 1) {
      const inputOffset = pixelIndex * 4;
      const rgbOffset = pixelIndex * 3;
      rgbValues[rgbOffset] = png.data[inputOffset] as number;
      rgbValues[rgbOffset + 1] = png.data[inputOffset + 1] as number;
      rgbValues[rgbOffset + 2] = png.data[inputOffset + 2] as number;
      const alpha = png.data[inputOffset + 3] as number;
      alphaValues[pixelIndex] = alpha;
      if (alpha !== 255) {
        hasAlpha = true;
      }
    }

    const predictorRgb = buildPredictorBuffer(png.width, png.height, 3, rgbValues);
    const predictorAlpha = hasAlpha ? buildPredictorBuffer(png.width, png.height, 1, alphaValues) : undefined;

    return {
      alphaBuffer: predictorAlpha,
      colorSpace: "DeviceRGB",
      compressedAlpha: predictorAlpha ? Buffer.from(deflate(predictorAlpha)) : undefined,
      compressedRgb: Buffer.from(deflate(predictorRgb)),
      format: "png",
      hash: sha1Buffer(buffer),
      height: png.height,
      rawAlphaLength: predictorAlpha?.length,
      rawRgbLength: predictorRgb.length,
      width: png.width,
    };
  }

  throw new Error("Unsupported image format. Phase 4 supports JPEG and PNG sources.");
}
