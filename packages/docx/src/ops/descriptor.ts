/**
 * Registry descriptors for the `docx` domain (OC-1 §6).
 *
 * A sibling subpath rather than part of `./ops`, because R35 keeps that surface
 * to canonical verbs and types — descriptors are metadata about the operations,
 * not operations.
 *
 * `inputSchema` is derived from the engine's real zod schema rather than
 * hand-written: a hand-maintained copy drifts, and an MCP tool generated from a
 * drifted schema tells the model the wrong document shape.
 */

import { defineOperations } from "@runstamp/contract";

import { DOCX_CONTROLLED } from "./controlled.js";
import type { ErrorCode, JSONSchema, OperationDescriptor } from "@runstamp/contract";
import { z } from "zod";

import { DocxDocumentSchema } from "../schema.js";
import { DOCX_LOSS_CODES } from "./losses.js";

const DOMAIN = "docx" as const;

function jsonSchema(schema: z.ZodType): JSONSchema {
  return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JSONSchema;
}

const ARTIFACT_INPUT: JSONSchema = {
  type: "string",
  contentEncoding: "base64",
  description: "DOCX bytes. Base64 over the wire; a Uint8Array or Buffer in-process.",
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

const DOCX_VALUE = artifactValue(
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "docx",
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
 * loss policy are enforced in `runOperation`, so every operation inherits them
 * whether or not its own body can fail that way.
 */
const SHARED_ERRORS: readonly ErrorCode[] = [
  "common/SCHEMA_REJECTED",
  "common/CONTRACT_VIOLATION",
  "common/OPERATION_CANCELLED",
  "common/OPERATION_TIMEOUT",
  "common/RESOURCE_LIMIT_EXCEEDED",
  "docx/DOC_INVALID",
  "docx/LOSS_POLICY_VIOLATED",
];

const HAND_WRITTEN: readonly OperationDescriptor[] = defineOperations([
  {
    name: "docx.render",
    domain: DOMAIN,
    verb: "render",
    summary: "Render a structured document to a native Word (.docx) file.",
    inputSchema: jsonSchema(DocxDocumentSchema),
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: DOCX_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: DOCX_LOSS_CODES,
    deterministic: true,
    // Images may be fetched over the network when a document references a URL.
    sideEffects: "network",
    stability: "stable",
  },
  {
    name: "docx.parse",
    domain: DOMAIN,
    verb: "parse",
    summary: "Convert a Word document model into the shared structured model.",
    inputSchema: jsonSchema(DocxDocumentSchema),
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: { type: "object", description: "A StructuredDocument." },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
  {
    name: "docx.validate",
    domain: DOMAIN,
    verb: "validate",
    summary: "Check a Word document for schema and content defects without modifying it.",
    inputSchema: { description: "Any value; the report says whether it is a valid document." },
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: {
      type: "object",
      required: ["valid", "issues"],
      properties: {
        valid: { type: "boolean" },
        issues: { type: "array", items: { type: "object" } },
      },
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
  {
    name: "docx.convert.pdf",
    domain: DOMAIN,
    verb: "convert",
    qualifier: { option: "to", value: "pdf" },
    summary: "Convert a Word document to PDF, reporting every bridge approximation as a loss.",
    inputSchema: jsonSchema(DocxDocumentSchema),
    optionsSchema: withOptions({ to: { enum: ["pdf"], default: "pdf" } }),
    valueSchema: PDF_VALUE,
    errorCodes: [...SHARED_ERRORS, "common/UNSUPPORTED_FEATURE"],
    lossCodes: DOCX_LOSS_CODES,
    deterministic: true,
    sideEffects: "network",
    stability: "stable",
  },
  {
    name: "docx.diff",
    domain: DOMAIN,
    verb: "diff",
    summary: "Compare two Word documents and return the revision with tracked changes applied.",
    inputSchema: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: ARTIFACT_INPUT,
      description: "The [before, after] pair of DOCX files.",
    },
    optionsSchema: withOptions({ author: { type: "string" }, date: { type: "string" } }),
    valueSchema: {
      type: "object",
      required: ["artifact", "changes", "summary", "statistics"],
      properties: {
        artifact: DOCX_VALUE,
        changes: { type: "array", items: { type: "object" } },
        summary: { type: "string" },
        statistics: { type: "object" },
      },
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: DOCX_LOSS_CODES,
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
  {
    name: "docx.transform.html",
    domain: DOMAIN,
    verb: "transform",
    summary: "Convert an HTML string into a Word document, reporting unsupported constructs.",
    inputSchema: { type: "string", description: "An HTML fragment or document." },
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: DOCX_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: DOCX_LOSS_CODES,
    deterministic: true,
    sideEffects: "network",
    stability: "stable",
  },
]);

export const DOCX_OPERATIONS: readonly OperationDescriptor[] = defineOperations([
  ...HAND_WRITTEN,
  ...DOCX_CONTROLLED.descriptors,
]);

export default DOCX_OPERATIONS;
