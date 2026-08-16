/**
 * Registry descriptors for the `pptx` domain (OC-1 §6).
 *
 * A sibling subpath rather than part of `./ops`, because R35 keeps that surface
 * to canonical verbs and types — descriptors are metadata about the operations,
 * not operations.
 */

import { defineOperations } from "@runstamp/contract";
import type { ErrorCode, JSONSchema, OperationDescriptor } from "@runstamp/contract";
import { z } from "zod";

import { PaperDocumentSchema } from "../validator/schema.js";
import { PPTX_LOSS_CODES } from "./losses.js";

const DOMAIN = "pptx" as const;

function jsonSchema(schema: z.ZodType): JSONSchema {
  return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JSONSchema;
}

const ARTIFACT_INPUT: JSONSchema = {
  type: "string",
  contentEncoding: "base64",
  description: "PPTX bytes. Base64 over the wire; a Uint8Array or Buffer in-process.",
};

function artifactValue(mediaType: string, extension: string): JSONSchema {
  return {
    type: "object",
    required: ["bytes", "mediaType", "extension", "byteLength", "hash"],
    properties: {
      bytes: { type: "string", contentEncoding: "base64" },
      mediaType: { const: mediaType },
      extension: { const: extension },
      byteLength: { type: "integer", minimum: 0 },
      hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
    },
  };
}

const PPTX_VALUE = artifactValue(
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "pptx",
);
const PDF_VALUE = artifactValue("application/pdf", "pdf");

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

function withOptions(extra: Record<string, JSONSchema>): JSONSchema {
  return {
    ...OPTIONS_SCHEMA,
    properties: { ...(OPTIONS_SCHEMA.properties as Record<string, JSONSchema>), ...extra },
  };
}

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
  "pptx/LOSS_POLICY_VIOLATED",
];

export const PPTX_OPERATIONS: readonly OperationDescriptor[] = defineOperations([
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
    stability: "stable",
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
        summary: { type: "object", description: "The engine's native structural report." },
      },
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
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
    stability: "stable",
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
    stability: "stable",
  },
]);

export default PPTX_OPERATIONS;
