/**
 * Registry descriptors for the `xlsx` domain (OC-1 §6).
 *
 * A sibling subpath rather than part of `./ops`, because R35 keeps that surface
 * to canonical verbs and types — descriptors are metadata about the operations,
 * not operations.
 */

import { defineOperations } from "@runstamp/contract";

import { XLSX_WORKFLOW } from "./workflow.js";
import type { ErrorCode, JSONSchema, OperationDescriptor } from "@runstamp/contract";
import { z } from "zod";

import { SpreadsheetDocumentSchema } from "../validation/spreadsheet-schema.js";
import { XLSX_LOSS_CODES } from "./losses.js";

const DOMAIN = "xlsx" as const;

function jsonSchema(schema: z.ZodType): JSONSchema {
  return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JSONSchema;
}

const ARTIFACT_INPUT: JSONSchema = {
  type: "string",
  contentEncoding: "base64",
  description: "XLSX bytes. Base64 over the wire; a Uint8Array or Buffer in-process.",
};

const XLSX_VALUE: JSONSchema = {
  type: "object",
  required: ["bytes", "mediaType", "extension", "byteLength", "hash"],
  properties: {
    bytes: { type: "string", contentEncoding: "base64" },
    mediaType: { const: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    extension: { const: "xlsx" },
    byteLength: { type: "integer", minimum: 0 },
    hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
  },
};

/** Callbacks and `signal` are omitted: they cannot cross HTTP or MCP. */
const OPTIONS_SCHEMA: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    deterministic: { type: "boolean", default: true },
    deterministicSeed: { type: "string" },
    timeoutMs: { type: "integer", minimum: 1 },
    locale: { type: "string" },
    lossPolicy: { enum: ["collect", "failOnDropped", "failOnAny"], default: "collect" },
  },
};

/**
 * Errors any verb here can return.
 *
 * The `common/*` entries come from the harness: cancellation, timeout and the
 * loss policy are enforced in `runOperation`, so every operation inherits them.
 */
const SHARED_ERRORS: readonly ErrorCode[] = [
  "common/SCHEMA_REJECTED",
  "common/CONTRACT_VIOLATION",
  "common/OPERATION_CANCELLED",
  "common/OPERATION_TIMEOUT",
  "common/RESOURCE_LIMIT_EXCEEDED",
  "common/INPUT_CORRUPT",
  "xlsx/TEMPLATE_PARSE_FAILED",
  "xlsx/TEMPLATE_ASSEMBLY_FAILED",
  "xlsx/LOSS_POLICY_VIOLATED",
];

const HAND_WRITTEN: readonly OperationDescriptor[] = defineOperations([
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
    stability: "stable",
  },
  {
    name: "xlsx.validate",
    domain: DOMAIN,
    verb: "validate",
    summary: "Lint a spreadsheet document, or inspect workbook bytes, without modifying either.",
    inputSchema: {
      anyOf: [jsonSchema(SpreadsheetDocumentSchema), ARTIFACT_INPUT],
      description: "A structured document to lint, or workbook bytes to inspect.",
    },
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: {
      type: "object",
      required: ["valid", "summary"],
      properties: {
        valid: { type: "boolean" },
        summary: { type: "object", description: "The engine's native report." },
      },
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
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
    stability: "stable",
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
    stability: "stable",
  },
]);

export const XLSX_OPERATIONS: readonly OperationDescriptor[] = defineOperations([
  ...HAND_WRITTEN,
  ...XLSX_WORKFLOW.descriptors,
]);

export default XLSX_OPERATIONS;
