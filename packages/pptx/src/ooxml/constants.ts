// src/ooxml/constants.ts
import { PaperError } from "../errors.js";

export const EMU_PER_INCH = 914400;

// Default Widescreen 16:9 Dimensions (1280×720 pixels = 13.333"×7.5")
// This matches PowerPoint's standard "Widescreen (16:9)" preset.
export const DEFAULT_SLIDE_WIDTH_PX = 1280;
export const DEFAULT_SLIDE_HEIGHT_PX = 720;
// Width: 1280 * 9525 = 12192000
// Height: 720 * 9525 = 6858000
export const SLIDE_WIDTH_EMU = 12192000;
export const SLIDE_HEIGHT_EMU = 6858000;

/**
 * Base value for slide IDs in presentation.xml's sldIdLst.
 * OOXML (ECMA-376 §19.2.1.33) requires p:sldId/@id ≥ 256.
 * Slide i (1-indexed) gets id = SLIDE_ID_BASE + i → first slide = 256.
 */
export const SLIDE_ID_BASE = 255;

/** Maximum decoded size for data URLs (50 MB). */
export const MAX_DATA_URL_BYTES = 50 * 1024 * 1024;

/** Default timeout for network fetches (30 seconds). */
export const FETCH_TIMEOUT_MS = 30_000;

/** Maximum decompressed size for template ZIP files (500 MB). */
export const MAX_TEMPLATE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;

/** Maximum size for a single fetched media file (100 MB). */
export const MAX_FETCH_MEDIA_BYTES = 100 * 1024 * 1024;

/** Maximum aggregate size of all remotely fetched media in one render (512 MB). */
export const MAX_TOTAL_FETCH_MEDIA_BYTES = 512 * 1024 * 1024;

/** Maximum decoded raster width or height accepted for PPTX embedding. */
export const MAX_RASTER_IMAGE_DIMENSION_PX = 25_000;

/**
 * Validate that a base64 data URL does not exceed `MAX_DATA_URL_BYTES` when
 * decoded. Call BEFORE `Buffer.from(b64, "base64")` to avoid unbounded allocation.
 */
export function validateDataUrlSize(b64data: string): void {
  // base64 encodes 3 bytes in 4 chars; decoded size ≈ b64data.length * 3/4
  const estimatedBytes = Math.ceil(b64data.length * 3 / 4);
  if (estimatedBytes > MAX_DATA_URL_BYTES) {
    throw new PaperError(
      `Data URL exceeds maximum size limit (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB > ${MAX_DATA_URL_BYTES / 1024 / 1024} MB)`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" },
    );
  }
}
