import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  PPTX_LOSS_CODES
} from "../chunk-HW526CCL.js";
import {
  PaperDocumentSchema
} from "../chunk-7V4ECWKA.js";
import "../chunk-TM4NN2PA.js";
import {
  external_exports
} from "../chunk-3VBGXE67.js";
import {
  defineOperations
} from "../chunk-JXF5SD3S.js";
import "../chunk-VIXD5LXH.js";

// src/ops/descriptor.ts
var DOMAIN = "pptx";
function jsonSchema(schema) {
  return external_exports.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
}
var ARTIFACT_INPUT = {
  type: "string",
  contentEncoding: "base64",
  description: "PPTX bytes. Base64 over the wire; a Uint8Array or Buffer in-process."
};
function artifactValue(mediaType, extension) {
  return {
    type: "object",
    required: ["bytes", "mediaType", "extension", "byteLength", "hash"],
    properties: {
      bytes: { type: "string", contentEncoding: "base64" },
      mediaType: { const: mediaType },
      extension: { const: extension },
      byteLength: { type: "integer", minimum: 0 },
      hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" }
    }
  };
}
var PPTX_VALUE = artifactValue(
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "pptx"
);
var PDF_VALUE = artifactValue("application/pdf", "pdf");
var OPTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    deterministic: { type: "boolean", default: true },
    deterministicSeed: { type: "string" },
    timeoutMs: { type: "integer", minimum: 1 },
    locale: { type: "string" },
    lossPolicy: { enum: ["collect", "failOnDropped", "failOnAny"], default: "collect" }
  }
};
function withOptions(extra) {
  return {
    ...OPTIONS_SCHEMA,
    properties: { ...OPTIONS_SCHEMA.properties, ...extra }
  };
}
var SHARED_ERRORS = [
  "common/SCHEMA_REJECTED",
  "common/CONTRACT_VIOLATION",
  "common/OPERATION_CANCELLED",
  "common/OPERATION_TIMEOUT",
  "common/RESOURCE_LIMIT_EXCEEDED",
  "common/INPUT_CORRUPT",
  "pptx/LOSS_POLICY_VIOLATED"
];
var PPTX_OPERATIONS = defineOperations([
  {
    name: "pptx.render",
    domain: DOMAIN,
    verb: "render",
    summary: "Render a structured document to a native PowerPoint (.pptx) deck.",
    inputSchema: jsonSchema(PaperDocumentSchema),
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: PPTX_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: PPTX_LOSS_CODES,
    deterministic: true,
    // Images and fonts may be fetched when a deck references a URL.
    sideEffects: "network",
    stability: "stable"
  },
  {
    name: "pptx.validate",
    domain: DOMAIN,
    verb: "validate",
    summary: "Check PowerPoint bytes for structural defects without modifying them.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: {
      type: "object",
      required: ["valid", "summary"],
      properties: {
        valid: { type: "boolean" },
        summary: { type: "object", description: "The engine's native structural report." }
      }
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable"
  },
  {
    name: "pptx.repair",
    domain: DOMAIN,
    verb: "repair",
    summary: "Repair structural defects in PowerPoint bytes, reporting every change as a loss.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: PPTX_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: PPTX_LOSS_CODES,
    deterministic: true,
    sideEffects: "none",
    stability: "stable"
  },
  {
    name: "pptx.convert.pdf",
    domain: DOMAIN,
    verb: "convert",
    qualifier: { option: "to", value: "pdf" },
    summary: "Convert a deck to PDF, reporting every approximation as a loss.",
    inputSchema: jsonSchema(PaperDocumentSchema),
    optionsSchema: withOptions({ to: { enum: ["pdf"], default: "pdf" } }),
    valueSchema: PDF_VALUE,
    errorCodes: [...SHARED_ERRORS, "common/UNSUPPORTED_FEATURE"],
    lossCodes: PPTX_LOSS_CODES,
    deterministic: true,
    sideEffects: "network",
    stability: "stable"
  }
]);
var descriptor_default = PPTX_OPERATIONS;
export {
  PPTX_OPERATIONS,
  descriptor_default as default
};
//# sourceMappingURL=descriptor.js.map
