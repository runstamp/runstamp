import { contractViolation, CONTRACT_VERSION, PaperError, SCHEMA_REJECTED, isPaperError, sortLosses, hasDroppedLoss, ERROR_DOMAINS, OPERATION_CANCELLED, OPERATION_TIMEOUT } from './chunk-F26VKRFR.js';
export { ASSET_FETCH_FAILED, ASSET_REJECTED, COMMON_ERROR_CODES, CONTRACT_VERSION, CONTRACT_VIOLATION, DETERMINISM_UNAVAILABLE, ERROR_DOMAINS, INPUT_CORRUPT, INPUT_ENCRYPTED, LOCATOR_KINDS, LOSS_SEVERITY_ORDER, NOT_IMPLEMENTED, OPERATION_CANCELLED, OPERATION_TIMEOUT, OPTIONS_CONFLICT, PaperError, RESOURCE_LIMIT_EXCEEDED, SCHEMA_REJECTED, UNSUPPORTED_FEATURE, UNSUPPORTED_VERSION, VERBS, compareLocators, compareLosses, contractViolation, createLoss, defineOperations, formatLocator, hasDroppedLoss, isCommonErrorCode, isPaperError, isVerb, lossSeverityRank, paperErrorFromJSON, parseLocator, parseOperationName, sortLosses } from './chunk-F26VKRFR.js';
import { createHash } from 'node:crypto';

// src/result.ts
function ok(value, parts) {
  return {
    ok: true,
    value,
    losses: parts.losses ?? [],
    diagnostics: parts.diagnostics ?? [],
    receipt: parts.receipt
  };
}
function fail(error, parts) {
  return {
    ok: false,
    error,
    losses: parts?.losses ?? [],
    diagnostics: parts?.diagnostics ?? [],
    ...parts?.receipt !== void 0 ? { receipt: parts.receipt } : {}
  };
}
function isOk(result) {
  return result.ok;
}
function isFail(result) {
  return !result.ok;
}
function unwrap(result) {
  if (result.ok) return result.value;
  throw result.error;
}

// src/diagnostics.ts
function createDiagnostic(init) {
  return {
    code: init.code,
    severity: init.severity,
    message: init.message,
    phase: init.phase,
    ...init.locator !== void 0 ? { locator: init.locator } : {},
    ...init.details !== void 0 ? { details: init.details } : {}
  };
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function encode(value, path, ancestors) {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw contractViolation(
          `Cannot canonicalize non-finite number at ${path}. NaN and Infinity have no JSON form.`,
          { path }
        );
      }
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case "undefined":
      throw contractViolation(
        `Cannot canonicalize \`undefined\` at ${path}. Omit the property instead.`,
        { path }
      );
    case "function":
    case "symbol":
      throw contractViolation(`Cannot canonicalize a ${typeof value} at ${path}.`, { path });
    case "bigint":
      throw contractViolation(
        `Cannot canonicalize a bigint at ${path}. Encode it as a string first.`,
        { path }
      );
  }
  const object = value;
  if (ancestors.has(object)) {
    throw contractViolation(`Cannot canonicalize a circular structure at ${path}.`, { path });
  }
  ancestors.add(object);
  let encoded;
  if (Array.isArray(value)) {
    encoded = `[${value.map((item, i) => encode(item, `${path}[${i}]`, ancestors)).join(",")}]`;
  } else if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const key of keys) {
      const entry = value[key];
      if (entry === void 0) continue;
      parts.push(`${JSON.stringify(key)}:${encode(entry, `${path}.${key}`, ancestors)}`);
    }
    encoded = `{${parts.join(",")}}`;
  } else {
    throw contractViolation(
      `Cannot canonicalize ${object.constructor?.name ?? "a non-plain object"} at ${path}. Convert it to a plain JSON value first \u2014 implicit conversions would make hashes depend on runtime behavior.`,
      { path }
    );
  }
  ancestors.delete(object);
  return encoded;
}
function canonicalJson(value) {
  return encode(value, "$", /* @__PURE__ */ new Set());
}
function sha256Hex(input) {
  return createHash("sha256").update(typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input)).digest("hex");
}
function hashBytes(bytes) {
  return `sha256:${sha256Hex(bytes)}`;
}
function hashValue(value) {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

// src/options.ts
var DEFAULT_DETERMINISTIC = true;
var DEFAULT_LOSS_POLICY = "collect";
var TRUTHY = /* @__PURE__ */ new Set(["1", "true", "on", "yes"]);
var FALSY = /* @__PURE__ */ new Set(["0", "false", "off", "no"]);
var DEFAULT_MANAGER_KEY = /* @__PURE__ */ Symbol.for("paperjsx.deterministicMode.defaultManager");
function getDefaultHolder() {
  const scope = globalThis;
  const existing = scope[DEFAULT_MANAGER_KEY];
  if (existing) return existing;
  let enabled = DEFAULT_DETERMINISTIC;
  const created = {
    setDeterministicMode(value) {
      enabled = value;
    },
    isDeterministicMode() {
      return enabled;
    }
  };
  scope[DEFAULT_MANAGER_KEY] = created;
  return created;
}
function setDeterministicMode(enabled = true) {
  getDefaultHolder().setDeterministicMode(enabled);
}
function resetDeterministicMode() {
  getDefaultHolder().setDeterministicMode(DEFAULT_DETERMINISTIC);
}
function environmentDeterministic() {
  const raw = globalThis.process?.env?.RUNSTAMP_DETERMINISTIC;
  if (raw === void 0) return void 0;
  const normalized = raw.trim().toLowerCase();
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return void 0;
}
function isDeterministicModeEnabled(options) {
  if (options?.deterministic !== void 0) return options.deterministic;
  return environmentDeterministic() ?? getDefaultHolder().isDeterministicMode();
}
function resolveOptions(options) {
  return {
    deterministic: isDeterministicModeEnabled(options),
    lossPolicy: options?.lossPolicy ?? DEFAULT_LOSS_POLICY,
    ...options?.deterministicSeed !== void 0 ? { deterministicSeed: options.deterministicSeed } : {},
    ...options?.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {},
    ...options?.limits !== void 0 ? { limits: options.limits } : {},
    ...options?.locale !== void 0 ? { locale: options.locale } : {}
  };
}

// src/receipt.ts
function buildReceipt(init) {
  const effective = init.effectiveOptions ?? resolveOptions(init.options);
  const deterministic = effective.deterministic;
  const sources = init.nondeterminismSources ?? [];
  if (!deterministic && sources.length === 0) {
    throw contractViolation(
      "A non-deterministic receipt must name at least one nondeterminism source. If the operation is in fact reproducible, set deterministic to true instead.",
      { operation: init.operation }
    );
  }
  if (deterministic && sources.length > 0) {
    throw contractViolation(
      `A deterministic receipt cannot declare nondeterminism sources: received [${sources.join(", ")}] for ${init.operation}.`,
      { operation: init.operation, sources }
    );
  }
  const receipt = {
    contractVersion: CONTRACT_VERSION,
    operation: init.operation,
    domain: init.domain,
    engine: init.engine,
    inputHash: init.inputHash,
    optionsHash: hashValue(effective),
    deterministic,
    nondeterminismSources: sources
  };
  if (init.outputHash !== void 0) receipt.outputHash = init.outputHash;
  if (init.tools !== void 0) receipt.tools = init.tools;
  if (!deterministic && init.producedAt !== void 0) receipt.producedAt = init.producedAt;
  return receipt;
}

// src/artifact.ts
var MEDIA_TYPES = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  html: "text/html"
};
function createArtifactBytes(bytes, mediaType, extension) {
  if (!(bytes instanceof Uint8Array)) {
    throw contractViolation("Artifact bytes must be a Uint8Array.", {
      received: typeof bytes
    });
  }
  if (extension.startsWith(".")) {
    throw contractViolation(
      `Artifact extension must not include a leading dot, received "${extension}".`,
      { extension }
    );
  }
  return {
    bytes,
    mediaType,
    extension,
    byteLength: bytes.byteLength,
    hash: hashBytes(bytes)
  };
}
function requireBytes(input, expected = "the document bytes") {
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new PaperError({
    message: `This operation reads ${expected}, but received ${describe(input)}.`,
    code: SCHEMA_REJECTED,
    phase: "validation",
    remediation: "Pass the file contents as a Uint8Array, Buffer or ArrayBuffer. If you have a document object, render it first and pass the resulting bytes.",
    details: { received: describe(input) }
  });
}
function describe(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return `an object${value.constructor?.name === void 0 ? "" : ` (${value.constructor.name})`}`;
  return `a ${typeof value}`;
}

// src/deprecate.ts
var announced = /* @__PURE__ */ new Set();
function announce(name, replacement) {
  if (announced.has(name)) return;
  announced.add(name);
  if (globalThis.process?.env?.RUNSTAMP_SUPPRESS_DEPRECATION === "1") return;
  globalThis.console?.warn?.(
    `[runstamp] ${name} is deprecated and will be removed at the next major. ${replacement}`
  );
}
function deprecate(name, replacement, value) {
  if (typeof value === "function") {
    const fn = value;
    const wrapped = function(...args) {
      announce(name, replacement);
      return Reflect.apply(fn, this, args);
    };
    Object.defineProperty(wrapped, "name", { value: fn.name, configurable: true });
    Object.defineProperty(wrapped, "length", { value: fn.length, configurable: true });
    Object.assign(wrapped, fn);
    return wrapped;
  }
  if (typeof value === "object" && value !== null) {
    return new Proxy(value, {
      get(target, property, receiver) {
        announce(name, replacement);
        return Reflect.get(target, property, receiver);
      }
    });
  }
  return value;
}
function resetDeprecationNotices() {
  announced.clear();
}

// src/legacy-codes.ts
var CORE_LEGACY_CODES = {
  VALIDATION_FAILED: {
    contractCode: "common/SCHEMA_REJECTED",
    phase: "validation",
    remediation: "Correct the reported issues in the document and retry."
  },
  AGENT_INPUT_INVALID: {
    contractCode: "pptx/AGENT_INPUT_INVALID",
    phase: "validation",
    remediation: "Correct the agent input against the published agent schema and retry."
  },
  AGENT_LAYOUT_VALIDATION_FAILED: {
    contractCode: "pptx/AGENT_LAYOUT_VALIDATION_FAILED",
    phase: "layout",
    remediation: "Adjust the offending region's size or content so it satisfies the layout rules."
  },
  RESOURCE_LIMIT_EXCEEDED: {
    contractCode: "common/RESOURCE_LIMIT_EXCEEDED",
    phase: "rendering",
    remediation: "Reduce document complexity or raise the corresponding value in options.limits."
  },
  RENDER_CANCELLED: {
    contractCode: "common/OPERATION_CANCELLED",
    phase: "rendering",
    remediation: "The caller's AbortSignal fired. Retry without aborting to obtain output.",
    retryable: true
  },
  WASM_INIT_FAILED: {
    contractCode: "pptx/WASM_INIT_FAILED",
    phase: "compilation",
    remediation: "Verify the WASM asset is reachable and the host permits WebAssembly compilation."
  },
  FONT_NOT_FOUND: {
    contractCode: "pptx/FONT_NOT_FOUND",
    phase: "font",
    remediation: "Register the font with the engine or choose a font that is already available."
  },
  PPTX_FONT_EMBEDDING_UNAVAILABLE: {
    contractCode: "pptx/FONT_EMBEDDING_UNAVAILABLE",
    phase: "font",
    remediation: "Supply a font whose embedding permissions allow it, or disable font embedding for this render."
  },
  MEDIA_FETCH_FAILED: {
    contractCode: "common/ASSET_FETCH_FAILED",
    phase: "media",
    remediation: "Verify the media URL is reachable, or embed the asset as a data URI.",
    retryable: true
  },
  MEDIA_CORRUPT: {
    contractCode: "pptx/MEDIA_CORRUPT",
    phase: "media",
    remediation: "Replace the media asset; its bytes could not be decoded as the declared type."
  },
  RENDER_TIMEOUT: {
    contractCode: "common/OPERATION_TIMEOUT",
    phase: "rendering",
    remediation: "Increase options.timeoutMs or reduce document complexity.",
    retryable: true
  },
  QUEUE_TIMEOUT: {
    contractCode: "common/OPERATION_TIMEOUT",
    phase: "rendering",
    remediation: "The render queue did not free a slot in time. Retry, or raise the queue timeout.",
    retryable: true
  },
  QUEUE_FULL: {
    contractCode: "pptx/QUEUE_FULL",
    phase: "rendering",
    remediation: "Retry after in-flight renders drain, or raise the queue capacity.",
    retryable: true
  },
  COMPATIBILITY_CONTRACT_VIOLATION: {
    contractCode: "pptx/COMPATIBILITY_CONTRACT_VIOLATION",
    phase: "serialization",
    remediation: "Remove the feature that breaks the declared compatibility contract."
  },
  PPTX_VISUAL_FALLBACK_MISSING: {
    contractCode: "pptx/VISUAL_FALLBACK_MISSING",
    phase: "rendering",
    remediation: "Provide a visual fallback for the element, or remove the element."
  },
  PPTX_CHART_FALLBACK_MISSING: {
    contractCode: "pptx/CHART_FALLBACK_MISSING",
    phase: "chart",
    remediation: "Provide a chart fallback image, or use a natively supported chart type."
  },
  STRUCTURAL_VALIDATION_FAILED: {
    contractCode: "pptx/STRUCTURAL_VALIDATION_FAILED",
    phase: "validation",
    remediation: "Inspect the reported structural issues in the generated package and retry."
  },
  DESKTOP_VALIDATION_FAILED: {
    contractCode: "pptx/DESKTOP_VALIDATION_FAILED",
    phase: "validation",
    remediation: "The reference desktop application rejected the output. Inspect the attached report."
  },
  VALIDATION_BACKEND_UNAVAILABLE: {
    contractCode: "pptx/VALIDATION_BACKEND_UNAVAILABLE",
    phase: "validation",
    remediation: "Start the validation backend, or run without desktop validation enabled.",
    retryable: true
  },
  CANVAS_UNAVAILABLE: {
    contractCode: "pptx/CANVAS_UNAVAILABLE",
    phase: "rendering",
    remediation: "Install the optional canvas dependency, or disable features that rasterize."
  },
  INVALID_SLIDE_INDEX: {
    contractCode: "pptx/INVALID_SLIDE_INDEX",
    phase: "input",
    remediation: "Pass a slide index within the deck's bounds."
  },
  FEATURE_REQUIRES_UPGRADE: {
    contractCode: "license/FEATURE_REQUIRES_UPGRADE",
    phase: "policy",
    remediation: "Provide a valid Runstamp Pro license for this feature, or remove its use."
  },
  REGION_TOO_SMALL: {
    contractCode: "pptx/REGION_TOO_SMALL",
    phase: "layout",
    remediation: "Increase the region's colSpan/rowSpan to at least the reported minimum."
  },
  CONTENT_PAGINATED: {
    contractCode: "pptx/CONTENT_PAGINATED",
    phase: "layout",
    remediation: "Reduce content or enlarge the region to keep it on a single slide."
  },
  CONTENT_CLIPPED: {
    contractCode: "pptx/CONTENT_CLIPPED",
    phase: "layout",
    remediation: "Reduce content or enlarge the region so nothing is clipped."
  },
  REGION_COLLISION: {
    contractCode: "pptx/REGION_COLLISION",
    phase: "layout",
    remediation: "Adjust the composition so the overlapping regions no longer intersect."
  },
  LOCKED_TOKEN_VIOLATION: {
    contractCode: "pptx/LOCKED_TOKEN_VIOLATION",
    phase: "template",
    remediation: "Remove the override of a locked brand token, or unlock it in the brand pack."
  }
};
var PDF_LEGACY_CODES = {
  SCHEMA_REJECTED: {
    contractCode: "common/SCHEMA_REJECTED",
    phase: "validation",
    remediation: "Correct the reported schema issues, or pass options.relaxed to opt out."
  },
  LAYOUT_IMPOSSIBLE: {
    contractCode: "pdf/LAYOUT_IMPOSSIBLE",
    phase: "layout",
    remediation: "Enlarge the page, reduce margins, or shrink the content that cannot fit."
  },
  PAGE_MARGINS_INVALID: {
    contractCode: "pdf/PAGE_MARGINS_INVALID",
    phase: "layout",
    remediation: "Reduce the page margins so a positive printable area remains."
  },
  LAYOUT_RECURSION_LIMIT: {
    contractCode: "pdf/LAYOUT_RECURSION_LIMIT",
    phase: "layout",
    remediation: "Flatten the container nesting below the documented depth cap."
  },
  OPTIONS_CONFLICT: {
    contractCode: "common/OPTIONS_CONFLICT",
    phase: "input",
    remediation: "Remove one of the two conflicting options; they cannot be combined."
  },
  PDFA_VIOLATION: {
    contractCode: "pdf/PDFA_VIOLATION",
    phase: "serialization",
    remediation: "Embed the offending font, remove the external URI, or disable PDF/A conformance."
  },
  ASSET_SOURCE_REJECTED: {
    contractCode: "common/ASSET_REJECTED",
    phase: "media",
    remediation: "Allow the asset source in the asset policy, or inline the asset as a data URI."
  },
  ASSET_SOURCE_FAILED: {
    contractCode: "common/ASSET_FETCH_FAILED",
    phase: "media",
    remediation: "Verify the asset is reachable and decodable as its declared type.",
    retryable: true
  }
};
var DOCX_LEGACY_CODES = {
  DOCX_DOC_INVALID: {
    contractCode: "docx/DOC_INVALID",
    phase: "validation",
    remediation: "Correct the document structure against the DOCX input schema."
  },
  DOCX_DOC_NO_PAGES: {
    contractCode: "docx/DOC_NO_PAGES",
    phase: "validation",
    remediation: "Add at least one page to the document."
  },
  DOCX_DOC_NO_DIMENSIONS: {
    contractCode: "docx/DOC_NO_DIMENSIONS",
    phase: "validation",
    remediation: "Declare page width and height on the document."
  },
  DOCX_DOC_INVALID_DIMENSIONS: {
    contractCode: "docx/DOC_INVALID_DIMENSIONS",
    phase: "validation",
    remediation: "Use positive, finite page dimensions."
  },
  DOCX_ELEMENT_UNKNOWN: {
    contractCode: "docx/ELEMENT_UNKNOWN",
    phase: "compilation",
    remediation: "Remove the unrecognized element, or replace it with a supported one."
  },
  DOCX_ELEMENT_INVALID: {
    contractCode: "docx/ELEMENT_INVALID",
    phase: "compilation",
    remediation: "Correct the element's properties against its documented shape."
  },
  DOCX_ELEMENT_MISSING_CONTENT: {
    contractCode: "docx/ELEMENT_MISSING_CONTENT",
    phase: "compilation",
    remediation: "Give the element content, or remove it."
  },
  DOCX_ELEMENT_NOT_IMPLEMENTED: {
    contractCode: "docx/ELEMENT_NOT_IMPLEMENTED",
    phase: "compilation",
    remediation: "Replace the element with a supported equivalent; it is not yet implemented."
  },
  DOCX_IMAGE_FETCH_FAILED: {
    contractCode: "common/ASSET_FETCH_FAILED",
    phase: "media",
    remediation: "Verify the image URL is reachable, or embed the image as a data URI.",
    retryable: true
  },
  DOCX_IMAGE_TIMEOUT: {
    contractCode: "docx/IMAGE_TIMEOUT",
    phase: "media",
    remediation: "Increase the image fetch timeout, or embed the image as a data URI.",
    retryable: true
  },
  DOCX_IMAGE_TOO_LARGE: {
    contractCode: "docx/IMAGE_TOO_LARGE",
    phase: "media",
    remediation: "Downscale the image, or raise the image size limit in options.limits."
  },
  DOCX_IMAGE_INVALID_FORMAT: {
    contractCode: "docx/IMAGE_INVALID_FORMAT",
    phase: "media",
    remediation: "Convert the image to a supported format (PNG, JPEG, GIF, BMP)."
  },
  DOCX_IMAGE_DECODE_FAILED: {
    contractCode: "docx/IMAGE_DECODE_FAILED",
    phase: "media",
    remediation: "Replace the image; its bytes could not be decoded."
  },
  DOCX_IMAGE_CONVERSION_FAILED: {
    contractCode: "docx/IMAGE_CONVERSION_FAILED",
    phase: "media",
    remediation: "Supply the image in a format that does not require conversion."
  },
  DOCX_CHART_NO_DATA: {
    contractCode: "docx/CHART_NO_DATA",
    phase: "chart",
    remediation: "Provide at least one data series for the chart."
  },
  DOCX_CHART_RENDER_FAILED: {
    contractCode: "docx/CHART_RENDER_FAILED",
    phase: "chart",
    remediation: "Simplify the chart definition, or supply a fallback image."
  },
  DOCX_CHART_INVALID_TYPE: {
    contractCode: "docx/CHART_INVALID_TYPE",
    phase: "chart",
    remediation: "Use one of the supported chart types."
  },
  DOCX_SHAPE_NOT_SUPPORTED: {
    contractCode: "docx/SHAPE_NOT_SUPPORTED",
    phase: "compilation",
    remediation: "Replace the shape with a supported shape, or an image."
  },
  DOCX_SHAPE_RENDER_FAILED: {
    contractCode: "docx/SHAPE_RENDER_FAILED",
    phase: "rendering",
    remediation: "Simplify the shape definition, or replace it with an image."
  },
  DOCX_TABLE_INVALID_STRUCTURE: {
    contractCode: "docx/TABLE_INVALID_STRUCTURE",
    phase: "compilation",
    remediation: "Ensure every row declares the same number of grid columns."
  },
  DOCX_TABLE_CELL_MERGE_ERROR: {
    contractCode: "docx/TABLE_CELL_MERGE_ERROR",
    phase: "compilation",
    remediation: "Correct the row/column spans so merged cells do not overlap or exceed the grid."
  },
  TABLE_GRID_MISMATCH: {
    contractCode: "docx/TABLE_GRID_MISMATCH",
    phase: "compilation",
    remediation: "Align the table's column definitions with the cells present in each row."
  },
  DOCX_STYLE_NOT_FOUND: {
    contractCode: "docx/STYLE_NOT_FOUND",
    phase: "template",
    remediation: "Define the referenced style, or reference one that exists."
  },
  DOCX_STYLE_INVALID: {
    contractCode: "docx/STYLE_INVALID",
    phase: "template",
    remediation: "Correct the style definition against the supported style properties."
  },
  INVALID_COLOR: {
    contractCode: "docx/INVALID_COLOR",
    phase: "typography",
    remediation: "Use a supported color form such as a #RRGGBB hex string."
  },
  INVALID_FONT_SIZE: {
    contractCode: "docx/INVALID_FONT_SIZE",
    phase: "typography",
    remediation: "Use a positive, finite font size within the supported range."
  },
  RESOURCE_LIMIT_EXCEEDED: {
    contractCode: "common/RESOURCE_LIMIT_EXCEEDED",
    phase: "serialization",
    remediation: "Reduce document complexity or raise the corresponding value in options.limits."
  },
  IMAGE_SIZE_EXCEEDED: {
    contractCode: "docx/IMAGE_SIZE_EXCEEDED",
    phase: "media",
    remediation: "Downscale the image, or raise the image size limit in options.limits."
  },
  DOCX_DEPENDENCY_MISSING: {
    contractCode: "docx/DEPENDENCY_MISSING",
    phase: "compilation",
    remediation: "Install the optional dependency this feature requires."
  },
  DOCX_DEPENDENCY_VERSION: {
    contractCode: "docx/DEPENDENCY_VERSION",
    phase: "compilation",
    remediation: "Upgrade the dependency to a version within the supported range."
  },
  DOCX_INTERNAL_ERROR: {
    contractCode: "docx/INTERNAL_ERROR",
    phase: "rendering",
    remediation: "This is a defect in the engine. Report it with the input that triggered it."
  },
  DOCX_SERIALIZATION_FAILED: {
    contractCode: "docx/SERIALIZATION_FAILED",
    phase: "serialization",
    remediation: "Inspect the reported package part; the OOXML package could not be written."
  },
  DOCX_RENDER_ABORTED: {
    contractCode: "common/OPERATION_CANCELLED",
    phase: "rendering",
    remediation: "The caller's AbortSignal fired. Retry without aborting to obtain output.",
    retryable: true
  }
};
var LICENSE_LEGACY_CODES = {
  FEATURE_REQUIRES_UPGRADE: {
    contractCode: "license/FEATURE_REQUIRES_UPGRADE",
    phase: "policy",
    remediation: "Provide a valid Runstamp Pro license for this feature, or remove its use."
  },
  LICENSE_REQUIRED: {
    contractCode: "license/LICENSE_REQUIRED",
    phase: "policy",
    remediation: "Supply a Runstamp license key."
  },
  LICENSE_INVALID: {
    contractCode: "license/LICENSE_INVALID",
    phase: "policy",
    remediation: "Supply a valid, unexpired Runstamp license key."
  }
};
var XLSX_LEGACY_CODES = {
  SpreadsheetValidationError: {
    contractCode: "common/SCHEMA_REJECTED",
    phase: "validation",
    remediation: "Correct the reported issues in `details.issues`; each names the path in the document that failed."
  },
  SpreadsheetTemplateParseError: {
    contractCode: "xlsx/TEMPLATE_PARSE_FAILED",
    phase: "template",
    remediation: "Open the template in Excel and re-save it, or remove the unsupported part named in `details.issues`."
  },
  SpreadsheetTemplateAssemblyError: {
    contractCode: "xlsx/TEMPLATE_ASSEMBLY_FAILED",
    phase: "template",
    remediation: "Check that every placeholder in the template has a matching value and that the named ranges still resolve."
  }
};
var LEGACY_CODE_TABLES = {
  core: CORE_LEGACY_CODES,
  pdf: PDF_LEGACY_CODES,
  docx: DOCX_LEGACY_CODES,
  license: LICENSE_LEGACY_CODES,
  xlsx: XLSX_LEGACY_CODES
};
function lookupLegacyCode(model, legacyCode) {
  return LEGACY_CODE_TABLES[model][legacyCode];
}

// src/interop.ts
var NAME_TO_MODEL = {
  PaperError: "core",
  PdfError: "pdf",
  DOCXError: "docx",
  RunstampFeatureError: "license",
  // The spreadsheet engine keys on class name; see XLSX_LEGACY_CODES.
  SpreadsheetValidationError: "xlsx",
  SpreadsheetTemplateParseError: "xlsx",
  SpreadsheetTemplateAssemblyError: "xlsx"
};
var DOMAIN_TO_MODEL = {
  pptx: "core",
  pdf: "pdf",
  docx: "docx",
  license: "license",
  xlsx: "xlsx"
};
var FALLBACK_REMEDIATION = "This error was not recognized by the contract's legacy mapping. Inspect details.legacyCode and the message, and report it so a mapping can be added.";
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function normalizeIssues(value) {
  if (!Array.isArray(value)) return [];
  const issues = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === void 0) continue;
    const path = asString(record.path) ?? "";
    const message = asString(record.message) ?? "";
    if (message === "") continue;
    issues.push({
      path,
      message,
      ...asString(record.expected) !== void 0 ? { expected: asString(record.expected) } : {},
      ...asString(record.received) !== void 0 ? { received: asString(record.received) } : {},
      ...asString(record.remediation) !== void 0 ? { remediation: asString(record.remediation) } : {}
    });
  }
  return issues;
}
function resolveModel(error, options) {
  if (options?.model !== void 0) return options.model;
  const name = asString(error.name);
  if (name !== void 0 && name in NAME_TO_MODEL) return NAME_TO_MODEL[name];
  if (options?.domain !== void 0) return DOMAIN_TO_MODEL[options.domain];
  return void 0;
}
function isNamespacedCode(code) {
  const slash = code.indexOf("/");
  if (slash <= 0) return false;
  return ERROR_DOMAINS.includes(code.slice(0, slash));
}
function toPaperError(value, options) {
  if (isPaperError(value) && isNamespacedCode(value.code)) return value;
  const domain = options?.domain ?? "common";
  if (!isRecord(value)) {
    return new PaperError({
      code: `${domain}/UNKNOWN_THROWN_VALUE`,
      phase: options?.phase ?? "rendering",
      message: `A non-error value was thrown: ${String(value)}`,
      remediation: "An engine threw a non-Error value. This is a defect; report it with the input that triggered it.",
      details: { thrown: String(value) }
    });
  }
  const model = resolveModel(value, options);
  const explicitCode = asString(value.code);
  const namedCode = asString(value.name);
  const mappedByName = explicitCode === void 0 && model !== void 0 && namedCode !== void 0 ? lookupLegacyCode(model, namedCode) : void 0;
  const legacyCode = explicitCode ?? (mappedByName !== void 0 ? namedCode : void 0);
  const mapping = mappedByName ?? (model !== void 0 && legacyCode !== void 0 ? lookupLegacyCode(model, legacyCode) : void 0);
  const message = asString(value.message) ?? "An unknown error occurred.";
  const carried = asString(value.remediation) ?? asString(value.recovery);
  const remediation = carried ?? mapping?.remediation ?? FALLBACK_REMEDIATION;
  const carriedDetails = asRecord(value.details) ?? asRecord(value.context) ?? {};
  const details = { ...carriedDetails };
  if (legacyCode !== void 0) details.legacyCode = legacyCode;
  if (model !== void 0) details.legacyModel = model;
  let code;
  if (mapping !== void 0) {
    code = mapping.contractCode;
  } else if (legacyCode !== void 0 && isNamespacedCode(legacyCode)) {
    code = legacyCode;
  } else if (legacyCode !== void 0) {
    code = `${domain}/${legacyCode}`;
  } else {
    code = `${domain}/UNMAPPED_ERROR`;
  }
  const phase = mapping?.phase ?? asString(value.phase) ?? options?.phase ?? "rendering";
  const issues = normalizeIssues(value.issues);
  return new PaperError({
    code,
    phase,
    message,
    remediation,
    issues,
    retryable: mapping?.retryable ?? false,
    details,
    cause: value
  });
}

// src/run.ts
var Cancellation = class extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
    this.name = "Cancellation";
  }
};
function createCancellation(options) {
  const callerSignal = options?.signal;
  const timeoutMs = options?.timeoutMs;
  if (callerSignal === void 0 && timeoutMs === void 0) {
    return { signal: void 0, raced: void 0, dispose: () => {
    } };
  }
  const controller = new AbortController();
  let timer;
  let onAbort;
  const raced = new Promise((_resolve, reject) => {
    if (callerSignal?.aborted === true) {
      controller.abort();
      reject(new Cancellation("cancelled"));
      return;
    }
    if (callerSignal !== void 0) {
      onAbort = () => {
        controller.abort();
        reject(new Cancellation("cancelled"));
      };
      callerSignal.addEventListener("abort", onAbort, { once: true });
    }
    if (timeoutMs !== void 0) {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Cancellation("timeout"));
      }, timeoutMs);
      timer.unref?.();
    }
  });
  raced.catch(() => {
  });
  return {
    signal: controller.signal,
    raced,
    dispose: () => {
      if (timer !== void 0) clearTimeout(timer);
      if (onAbort !== void 0 && callerSignal !== void 0) {
        callerSignal.removeEventListener("abort", onAbort);
      }
    }
  };
}
function cancellationError(kind, timeoutMs) {
  return kind === "cancelled" ? new PaperError({
    code: OPERATION_CANCELLED,
    phase: "transport",
    message: "The operation was cancelled by its caller.",
    remediation: "Do not abort options.signal if the result is still required, then run the operation again.",
    retryable: true
  }) : new PaperError({
    code: OPERATION_TIMEOUT,
    phase: "transport",
    message: `The operation exceeded its ${String(timeoutMs)}ms budget.`,
    remediation: "Raise options.timeoutMs, or reduce the size or complexity of the input document.",
    retryable: true,
    details: { timeoutMs }
  });
}
async function runOperation(init) {
  const effectiveOptions = resolveOptions(init.options);
  const losses = [];
  const diagnostics = [];
  const nondeterminism = /* @__PURE__ */ new Set();
  const tools = [];
  const cancellation = createCancellation(init.options);
  const context = {
    effectiveOptions,
    deterministic: effectiveOptions.deterministic,
    // The linked signal, not the caller's: it also fires on `timeoutMs`.
    ...cancellation.signal !== void 0 ? { signal: cancellation.signal } : {},
    addLoss(loss) {
      losses.push(loss);
      init.options?.onLoss?.(loss);
    },
    addDiagnostic(diagnostic) {
      diagnostics.push(diagnostic);
      init.options?.onDiagnostic?.(diagnostic);
    },
    addNondeterminism(source) {
      nondeterminism.add(source);
    },
    addTool(tool) {
      tools.push(tool);
    }
  };
  let inputHash;
  const finish = (outputHash) => {
    if (inputHash === void 0) {
      throw contractViolation("Cannot build a receipt before the input hash is resolved.");
    }
    return buildReceipt({
      operation: init.operation,
      domain: init.domain,
      engine: init.engine,
      inputHash,
      effectiveOptions,
      ...outputHash !== void 0 ? { outputHash } : {},
      nondeterminismSources: effectiveOptions.deterministic ? [] : [...nondeterminism],
      ...tools.length > 0 ? { tools } : {}
    });
  };
  let outcome;
  try {
    inputHash = typeof init.inputHash === "function" ? init.inputHash() : init.inputHash;
    if (init.options?.signal?.aborted === true) throw new Cancellation("cancelled");
    const running = init.execute(context);
    outcome = cancellation.raced === void 0 ? await running : await Promise.race([running, cancellation.raced]);
  } catch (error) {
    const normalized = error instanceof Cancellation ? cancellationError(error.kind, init.options?.timeoutMs) : toPaperError(error, init.errorContext ?? { domain: init.domain });
    let receipt;
    try {
      receipt = finish();
    } catch {
      receipt = void 0;
    }
    return fail(normalized, {
      losses: sortLosses(losses),
      diagnostics,
      ...receipt !== void 0 ? { receipt } : {}
    });
  } finally {
    cancellation.dispose();
  }
  const ordered = sortLosses(losses);
  const policy = effectiveOptions.lossPolicy;
  const violates = policy === "failOnAny" ? ordered.length > 0 : policy === "failOnDropped" && hasDroppedLoss(ordered);
  if (violates) {
    const dropped = ordered.filter((loss) => loss.severity === "dropped").length;
    return fail(
      new PaperError({
        code: `${init.domain}/LOSS_POLICY_VIOLATED`,
        phase: "validation",
        message: policy === "failOnAny" ? `The operation completed with ${ordered.length} loss(es) and lossPolicy is "failOnAny".` : `The operation dropped ${dropped} item(s) and lossPolicy is "failOnDropped".`,
        remediation: 'Inspect result.losses to see what could not be preserved, then either accept the loss with lossPolicy "collect" or change the input or options so the loss does not occur.',
        details: { lossPolicy: policy, lossCount: ordered.length, droppedCount: dropped }
      }),
      { losses: ordered, diagnostics, receipt: finish(outcome.outputHash) }
    );
  }
  return ok(outcome.value, {
    losses: ordered,
    diagnostics,
    receipt: finish(outcome.outputHash)
  });
}

export { CORE_LEGACY_CODES, DEFAULT_DETERMINISTIC, DEFAULT_LOSS_POLICY, DOCX_LEGACY_CODES, LEGACY_CODE_TABLES, LICENSE_LEGACY_CODES, MEDIA_TYPES, PDF_LEGACY_CODES, XLSX_LEGACY_CODES, buildReceipt, canonicalJson, createArtifactBytes, createDiagnostic, deprecate, fail, hashBytes, hashValue, isDeterministicModeEnabled, isFail, isOk, lookupLegacyCode, ok, requireBytes, resetDeprecationNotices, resetDeterministicMode, resolveOptions, runOperation, setDeterministicMode, sha256Hex, toPaperError, unwrap };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map