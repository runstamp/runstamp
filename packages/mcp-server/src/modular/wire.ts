import { PaperError } from "@runstamp/contract";
import type { JSONSchema } from "@runstamp/contract";
import type { CatalogOperationDescriptor } from "@runstamp/catalog";

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

function branches(schema: JSONSchema): readonly JSONSchema[] {
  const union = schema.anyOf ?? schema.oneOf;
  return Array.isArray(union) ? union as JSONSchema[] : [];
}

function decode(schema: JSONSchema | undefined, value: unknown, path: string): unknown {
  if (schema === undefined || value === null || value === undefined || value instanceof Uint8Array) return value;
  if (typeof value === "string") {
    if (schema.contentEncoding !== "base64" && !branches(schema).some((branch) => branch.contentEncoding === "base64")) return value;
    const compact = value.replace(/\s+/g, "");
    if (compact.length % 4 !== 0 || !BASE64.test(compact)) {
      throw new PaperError({
        code: "common/SCHEMA_REJECTED", phase: "validation",
        message: `${path} must be valid RFC 4648 base64.`,
        remediation: "Encode file bytes as standard padded base64.",
      });
    }
    return new Uint8Array(Buffer.from(compact, "base64"));
  }
  if (Array.isArray(value)) {
    const items = schema.items as JSONSchema | undefined;
    return items === undefined ? value : value.map((entry, index) => decode(items, entry, `${path}[${String(index)}]`));
  }
  if (typeof value === "object") {
    const properties = schema.properties as Record<string, JSONSchema> | undefined;
    if (properties === undefined) return value;
    const decoded = { ...(value as Record<string, unknown>) };
    for (const [key, child] of Object.entries(properties)) if (key in decoded) decoded[key] = decode(child, decoded[key], `${path}.${key}`);
    return decoded;
  }
  return value;
}

export function decodeWireInput(descriptor: CatalogOperationDescriptor, value: unknown): unknown {
  return decode(descriptor.inputSchema, value, "input");
}

export function summarizeArtifacts(value: unknown, includeBytes: boolean): unknown {
  if (value instanceof Uint8Array) return includeBytes ? Buffer.from(value).toString("base64") : { byteLength: value.byteLength };
  if (Array.isArray(value)) return value.map((entry) => summarizeArtifacts(entry, includeBytes));
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  if (record.bytes instanceof Uint8Array) {
    const summary = { mediaType: record.mediaType, extension: record.extension, byteLength: record.byteLength, hash: record.hash };
    return includeBytes ? { ...summary, bytes: Buffer.from(record.bytes).toString("base64") } : summary;
  }
  return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, summarizeArtifacts(child, includeBytes)]));
}
