import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/ooxml/constants.ts
var EMU_PER_INCH = 914400;
var DEFAULT_SLIDE_WIDTH_PX = 1280;
var DEFAULT_SLIDE_HEIGHT_PX = 720;
var SLIDE_WIDTH_EMU = 12192e3;
var SLIDE_HEIGHT_EMU = 6858e3;
var SLIDE_ID_BASE = 255;
var MAX_DATA_URL_BYTES = 50 * 1024 * 1024;
var FETCH_TIMEOUT_MS = 3e4;
var MAX_TEMPLATE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;
var MAX_FETCH_MEDIA_BYTES = 100 * 1024 * 1024;
var MAX_TOTAL_FETCH_MEDIA_BYTES = 512 * 1024 * 1024;
var MAX_RASTER_IMAGE_DIMENSION_PX = 25e3;
function validateDataUrlSize(b64data) {
  const estimatedBytes = Math.ceil(b64data.length * 3 / 4);
  if (estimatedBytes > MAX_DATA_URL_BYTES) {
    throw new PaperError(
      `Data URL exceeds maximum size limit (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB > ${MAX_DATA_URL_BYTES / 1024 / 1024} MB)`,
      { code: "RESOURCE_LIMIT_EXCEEDED", phase: "media" }
    );
  }
}

export {
  EMU_PER_INCH,
  DEFAULT_SLIDE_WIDTH_PX,
  DEFAULT_SLIDE_HEIGHT_PX,
  SLIDE_WIDTH_EMU,
  SLIDE_HEIGHT_EMU,
  SLIDE_ID_BASE,
  MAX_DATA_URL_BYTES,
  FETCH_TIMEOUT_MS,
  MAX_TEMPLATE_UNCOMPRESSED_BYTES,
  MAX_FETCH_MEDIA_BYTES,
  MAX_TOTAL_FETCH_MEDIA_BYTES,
  MAX_RASTER_IMAGE_DIMENSION_PX,
  validateDataUrlSize
};
//# sourceMappingURL=chunk-3O47XGMU.js.map
