import type { PaperImage } from "../types/ast.js";
import type { Rect } from "./absoluteSafety.js";

export interface ImageFitDiagnostics {
  frame: Rect;
  sourceWidth?: number;
  sourceHeight?: number;
  sourceFormat?: "png" | "jpeg" | "unknown";
  frameAspect: number;
  sourceAspect?: number;
  crop: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    visibleFraction: number;
  };
  upscaleFactor?: number;
  cropRisk: boolean;
  upscaleRisk: boolean;
  aspectRisk: boolean;
  issues: Array<{
    code: "IMAGE_CROP_RISK" | "IMAGE_UPSCALE_RISK" | "IMAGE_ASPECT_RISK";
    message: string;
    rect: Rect;
  }>;
}

const CROP_VISIBLE_FRACTION_FLOOR = 0.35;
const CROP_EDGE_FLOOR = 38;
const UPSCALE_FACTOR_LIMIT = 1.75;
const ASPECT_RATIO_LIMIT = 0.28;

function dataUrlBytes(src: string): Uint8Array | undefined {
  const match = src.match(/^data:image\/[^;]+;base64,(.+)$/u);
  if (!match) return undefined;
  return Buffer.from(match[1], "base64");
}

function readPngSize(bytes: Uint8Array): { width: number; height: number; format: "png" } | undefined {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    format: "png",
  };
}

function readJpegSize(bytes: Uint8Array): { width: number; height: number; format: "jpeg" } | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) return undefined;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
        format: "jpeg",
      };
    }
    offset += 2 + length;
  }
  return undefined;
}

function imageSizeFromDataUrl(src: string): { width: number; height: number; format: "png" | "jpeg" } | undefined {
  const bytes = dataUrlBytes(src);
  if (!bytes) return undefined;
  return readPngSize(bytes) ?? readJpegSize(bytes);
}

function styleRect(style: PaperImage["style"]): Rect | null {
  if (
    style?.position !== "absolute" ||
    typeof style.left !== "number" ||
    typeof style.top !== "number" ||
    typeof style.width !== "number" ||
    typeof style.height !== "number"
  ) {
    return null;
  }
  return { left: style.left, top: style.top, width: style.width, height: style.height };
}

export function collectImageFitDiagnostics(image: PaperImage, frameOverride?: Rect): ImageFitDiagnostics | undefined {
  const frame = frameOverride ?? styleRect(image.style);
  if (!frame || frame.width <= 0 || frame.height <= 0) return undefined;
  const size = imageSizeFromDataUrl(image.src);
  const frameAspect = frame.width / frame.height;
  const sourceAspect = size ? size.width / size.height : undefined;
  const crop = {
    left: image.crop?.left ?? 0,
    top: image.crop?.top ?? 0,
    right: image.crop?.right ?? 0,
    bottom: image.crop?.bottom ?? 0,
    visibleFraction: Math.max(0, (100 - (image.crop?.left ?? 0) - (image.crop?.right ?? 0)) / 100) *
      Math.max(0, (100 - (image.crop?.top ?? 0) - (image.crop?.bottom ?? 0)) / 100),
  };
  const upscaleFactor = size
    ? Math.max(frame.width / Math.max(1, size.width), frame.height / Math.max(1, size.height))
    : undefined;
  const likelyColorSwatch = Boolean(size && size.width === size.height && size.width <= 256 && !image.crop);
  const cropRisk =
    crop.visibleFraction < CROP_VISIBLE_FRACTION_FLOOR ||
    Math.max(crop.left, crop.top, crop.right, crop.bottom) >= CROP_EDGE_FLOOR;
  const upscaleRisk = !likelyColorSwatch && upscaleFactor !== undefined && upscaleFactor > UPSCALE_FACTOR_LIMIT;
  const aspectRisk = !likelyColorSwatch && sourceAspect !== undefined && Math.abs(Math.log(frameAspect / sourceAspect)) > ASPECT_RATIO_LIMIT && !image.crop;
  const issues: ImageFitDiagnostics["issues"] = [];

  if (cropRisk) {
    issues.push({
      code: "IMAGE_CROP_RISK",
      message: `Image crop leaves ${Math.round(crop.visibleFraction * 100)}% of the source visible.`,
      rect: frame,
    });
  }
  if (upscaleRisk) {
    issues.push({
      code: "IMAGE_UPSCALE_RISK",
      message: `Image is scaled ${upscaleFactor?.toFixed(1)}x beyond source dimensions.`,
      rect: frame,
    });
  }
  if (aspectRisk) {
    issues.push({
      code: "IMAGE_ASPECT_RISK",
      message: "Image frame aspect ratio differs materially from the source and no explicit crop is set.",
      rect: frame,
    });
  }

  return {
    frame,
    sourceWidth: size?.width,
    sourceHeight: size?.height,
    sourceFormat: size?.format ?? "unknown",
    frameAspect,
    sourceAspect,
    crop,
    upscaleFactor,
    cropRisk,
    upscaleRisk,
    aspectRisk,
    issues,
  };
}
