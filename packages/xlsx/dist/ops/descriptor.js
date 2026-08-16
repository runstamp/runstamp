import {
  XLSX_LOSS_CODES,
  XLSX_WORKFLOW
} from "../chunk-45QSLEYD.js";
import "../chunk-2CSFJDLR.js";
import {
  SpreadsheetDocumentSchema,
  defineOperations,
  external_exports
} from "../chunk-YMTIFCEA.js";

// src/ops/descriptor.ts
var DOMAIN = "xlsx";
function jsonSchema(schema) {
  return external_exports.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
}
var ARTIFACT_INPUT = {
  type: "string",
  contentEncoding: "base64",
  description: "XLSX bytes. Base64 over the wire; a Uint8Array or Buffer in-process."
};
var XLSX_VALUE = {
  type: "object",
  required: ["bytes", "mediaType", "extension", "byteLength", "hash"],
  properties: {
    bytes: { type: "string", contentEncoding: "base64" },
    mediaType: { const: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    extension: { const: "xlsx" },
    byteLength: { type: "integer", minimum: 0 },
    hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" }
  }
};
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
var SHARED_ERRORS = [
  "common/SCHEMA_REJECTED",
  "common/CONTRACT_VIOLATION",
  "common/OPERATION_CANCELLED",
  "common/OPERATION_TIMEOUT",
  "common/RESOURCE_LIMIT_EXCEEDED",
  "common/INPUT_CORRUPT",
  "xlsx/TEMPLATE_PARSE_FAILED",
  "xlsx/TEMPLATE_ASSEMBLY_FAILED",
  "xlsx/LOSS_POLICY_VIOLATED"
];
var HAND_WRITTEN = defineOperations([
  {
    name: "xlsx.render",
    domain: DOMAIN,
    verb: "render",
    summary: "Render a structured document to a native Excel (.xlsx) workbook.",
    inputSchema: jsonSchema(SpreadsheetDocumentSchema),
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: XLSX_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: XLSX_LOSS_CODES,
    deterministic: true,
    sideEffects: "none",
    stability: "stable"
  },
  {
    name: "xlsx.validate",
    domain: DOMAIN,
    verb: "validate",
    summary: "Lint a spreadsheet document, or inspect workbook bytes, without modifying either.",
    inputSchema: {
      anyOf: [jsonSchema(SpreadsheetDocumentSchema), ARTIFACT_INPUT],
      description: "A structured document to lint, or workbook bytes to inspect."
    },
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: {
      type: "object",
      required: ["valid", "summary"],
      properties: {
        valid: { type: "boolean" },
        summary: { type: "object", description: "The engine's native report." }
      }
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable"
  },
  {
    name: "xlsx.repair",
    domain: DOMAIN,
    verb: "repair",
    summary: "Repair defects in workbook bytes, reporting every change as a loss.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: XLSX_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: XLSX_LOSS_CODES,
    deterministic: true,
    sideEffects: "none",
    stability: "stable"
  },
  {
    name: "xlsx.inspect",
    domain: DOMAIN,
    verb: "inspect",
    summary: "Estimate the cost and shape of a render without producing the workbook.",
    inputSchema: jsonSchema(SpreadsheetDocumentSchema),
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: { type: "object", description: "The engine's render plan." },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable"
  }
]);
var XLSX_OPERATIONS = defineOperations([
  ...HAND_WRITTEN,
  ...XLSX_WORKFLOW.descriptors
]);
var descriptor_default = XLSX_OPERATIONS;
export {
  XLSX_OPERATIONS,
  descriptor_default as default
};
//# sourceMappingURL=descriptor.js.map
