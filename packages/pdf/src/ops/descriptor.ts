/**
 * Registry descriptors for the `pdf` domain (OC-1 §6).
 *
 * This is the single declaration from which the SDK docs, the hosted HTTP
 * routes, the MCP tool catalog and the embedded UI are generated. It lives on a
 * sibling subpath rather than on `./ops` because R35 keeps that surface to
 * canonical verbs and types — descriptors are metadata about the operations, not
 * operations.
 *
 * `inputSchema` is derived from the engine's real zod schema rather than
 * hand-written: a hand-maintained copy drifts, and an MCP tool generated from a
 * drifted schema tells the model the wrong shape.
 */

import { defineOperations } from "@runstamp/contract";

import type { ErrorCode, JSONSchema, OperationDescriptor } from "@runstamp/contract";
import { z } from "zod";

import { PdfDocumentSchema } from "../schema.js";
import { PDF_LOSS_CODES } from "./losses.js";

const DOMAIN = "pdf" as const;

/**
 * Convert a zod schema to JSON Schema, tolerating constructs that have no JSON
 * Schema form (the engine accepts `Buffer` and `Uint8Array` for binary sources).
 * `io: "input"` describes what a caller may send, which is what a tool schema is.
 */
function jsonSchema(schema: z.ZodType): JSONSchema {
  return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JSONSchema;
}

/** Bytes in, for the verbs that read an existing artifact. */
const ARTIFACT_INPUT: JSONSchema = {
  type: "string",
  contentEncoding: "base64",
  description: "PDF bytes. Base64 over the wire; a Uint8Array or Buffer in-process.",
};

/** What every file-producing verb returns (R31). */
const ARTIFACT_VALUE: JSONSchema = {
  type: "object",
  required: ["bytes", "mediaType", "extension", "byteLength", "hash"],
  properties: {
    bytes: { type: "string", contentEncoding: "base64" },
    mediaType: { const: "application/pdf" },
    extension: { const: "pdf" },
    byteLength: { type: "integer", minimum: 0 },
    hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
  },
};

/**
 * Shared operation options. Callbacks and `signal` are deliberately absent: they
 * are in-process only and cannot cross the HTTP or MCP boundary.
 */
const OPTIONS_SCHEMA: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    deterministic: { type: "boolean", default: true },
    deterministicSeed: { type: "string" },
    timeoutMs: { type: "integer", minimum: 1 },
    locale: { type: "string" },
    lossPolicy: { enum: ["collect", "failOnDropped", "failOnAny"], default: "collect" },
    limits: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxInputBytes: { type: "integer", minimum: 1 },
        maxOutputBytes: { type: "integer", minimum: 1 },
        maxPages: { type: "integer", minimum: 1 },
        maxElements: { type: "integer", minimum: 1 },
        maxArchiveEntries: { type: "integer", minimum: 1 },
        maxExpansionRatio: { type: "number", minimum: 1 },
        maxDurationMs: { type: "integer", minimum: 1 },
      },
    },
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
 * `common/*` entries come from the harness itself — cancellation, timeout and
 * the loss policy are enforced in `runOperation`, so every operation inherits
 * them whether or not its own body can fail that way.
 */
const SHARED_ERRORS: readonly ErrorCode[] = [
  "common/SCHEMA_REJECTED",
  "common/CONTRACT_VIOLATION",
  "common/OPERATION_CANCELLED",
  "common/OPERATION_TIMEOUT",
  "common/RESOURCE_LIMIT_EXCEEDED",
  "pdf/LOSS_POLICY_VIOLATED",
];

/**
 * Hand-written operations. The projected evidence operations are appended below
 * so the catalog is one list, whatever produced each entry.
 */
const HAND_WRITTEN: readonly OperationDescriptor[] = defineOperations([
  {
    name: "pdf.render",
    domain: DOMAIN,
    verb: "render",
    summary: "Render a structured document to a native PDF file.",
    inputSchema: jsonSchema(PdfDocumentSchema),
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: ARTIFACT_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: PDF_LOSS_CODES,
    deterministic: true,
    // Remote images and fonts are reachable only when the caller opts in via
    // assetPolicy.allowRemoteSources, but the capability is part of the verb.
    sideEffects: "network",
    stability: "stable",
  },
  {
    name: "pdf.validate",
    domain: DOMAIN,
    verb: "validate",
    summary: "Check PDF bytes for conformance defects without modifying them.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: {
      type: "object",
      required: ["valid", "summary"],
      properties: {
        valid: { type: "boolean" },
        summary: { type: "object", description: "The engine's native validation report." },
      },
    },
    errorCodes: SHARED_ERRORS,
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
  {
    name: "pdf.repair",
    domain: DOMAIN,
    verb: "repair",
    summary: "Repair structural defects in PDF bytes, reporting every change as a loss.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: OPTIONS_SCHEMA,
    valueSchema: ARTIFACT_VALUE,
    errorCodes: SHARED_ERRORS,
    lossCodes: ["pdf/REPAIR_APPLIED"],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
  {
    name: "pdf.transform",
    domain: DOMAIN,
    verb: "transform",
    summary: "Apply a bounded in-format mutation to PDF bytes, such as linearization.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: withOptions({
      plan: {
        type: "object",
        required: ["kind"],
        properties: { kind: { enum: ["linearize"] } },
      },
    }),
    valueSchema: ARTIFACT_VALUE,
    errorCodes: [...SHARED_ERRORS, "common/UNSUPPORTED_FEATURE"],
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
  {
    name: "pdf.extract.signatures",
    domain: DOMAIN,
    verb: "extract",
    qualifier: { option: "selector", value: "signatures" },
    summary: "Extract digital signature records from PDF bytes.",
    inputSchema: ARTIFACT_INPUT,
    optionsSchema: withOptions({ selector: { enum: ["signatures"] } }),
    valueSchema: {
      type: "object",
      required: ["selector", "items"],
      properties: {
        selector: { const: "signatures" },
        items: { type: "array", items: { type: "object" } },
      },
    },
    errorCodes: [...SHARED_ERRORS, "common/UNSUPPORTED_FEATURE"],
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
  },
]);

// Keep catalog metadata independent of the executable evidence extension.
// Importing the projection here pulled the entire PDF renderer (including its
// native-loader fallbacks) into the descriptor-only subpath. Registry consumers
// then received multi-megabyte runtime code and webpack emitted a critical
// dynamic-require warning for a route that only reads metadata. The equality
// assertion in ops-contract.test.ts keeps this lightweight declaration locked to
// the executable projection.
const EVIDENCE_SCHEMA: JSONSchema = { description: "Declared by the extension manifest." };
const EVIDENCE_ERRORS: readonly ErrorCode[] = [
  "pdf/INVALID_INPUT",
  "pdf/RESOURCE_LIMIT",
  "pdf/TIMEOUT",
  "pdf/PDF_UNSUPPORTED",
  "pdf/SCHEMA_REJECTED",
];
const EVIDENCE_LOSSES: readonly ErrorCode[] = [
  "pdf/PDF_ANNOTATIONS_STRIPPED",
  "pdf/PDF_ATTACHMENTS_STRIPPED",
  "pdf/PDF_FORM_INTERACTIVITY_STRIPPED",
  "pdf/PDF_GEOMETRY_APPROXIMATED",
  "pdf/PDF_GRAPHICS_NOT_PRESERVED",
  "pdf/PDF_METADATA_STRIPPED",
  "pdf/PDF_OCR_REQUIRED",
  "pdf/PDF_SIGNATURE_INVALIDATED",
  "pdf/PDF_TEXT_UNDECODABLE",
];
const EVIDENCE_COMMON = {
  inputSchema: EVIDENCE_SCHEMA,
  optionsSchema: EVIDENCE_SCHEMA,
  valueSchema: EVIDENCE_SCHEMA,
  errorCodes: EVIDENCE_ERRORS,
  lossCodes: EVIDENCE_LOSSES,
  deterministic: true,
  sideEffects: "none",
  stability: "stable",
} as const;

const EVIDENCE_OPERATIONS: readonly OperationDescriptor[] = defineOperations([
  {
    ...EVIDENCE_COMMON,
    name: "pdf.redact",
    domain: DOMAIN,
    verb: "redact",
    summary: "Apply a redaction plan to PDF bytes, reporting every removal as a loss.",
  },
  {
    ...EVIDENCE_COMMON,
    name: "pdf.convert",
    domain: DOMAIN,
    verb: "convert",
    summary: "Export a sanitized derivative of a PDF, without active content.",
  },
  {
    ...EVIDENCE_COMMON,
    name: "pdf.inspect.evidence",
    domain: DOMAIN,
    verb: "inspect",
    qualifier: { option: "operation", value: "evidence" },
    summary: "Inspect a PDF's evidence structure without executing active content.",
  },
  {
    ...EVIDENCE_COMMON,
    name: "pdf.inspect.find",
    domain: DOMAIN,
    verb: "inspect",
    qualifier: { option: "operation", value: "find" },
    summary: "Locate text within a PDF and return bound locators.",
  },
  {
    ...EVIDENCE_COMMON,
    name: "pdf.inspect.redaction-preview",
    domain: DOMAIN,
    verb: "inspect",
    qualifier: { option: "operation", value: "redaction-preview" },
    summary: "Preview what a redaction plan would remove, without modifying the document.",
  },
]);

export const PDF_OPERATIONS: readonly OperationDescriptor[] = defineOperations([
  ...HAND_WRITTEN,
  ...EVIDENCE_OPERATIONS,
]);

export default PDF_OPERATIONS;
