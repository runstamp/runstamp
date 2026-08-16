/**
 * Canonical JSON encoding and hashing (OC-1 §3.7 R27).
 *
 * `optionsHash`, `inputHash` and `outputHash` in every receipt are derived here,
 * so this module defines what "the same input" means platform-wide. The encoding
 * is deliberately strict: anything whose JSON form could vary between runs is
 * rejected rather than silently coerced, because a determinism claim built on a
 * lenient encoder is not a guarantee.
 *
 * The `node:crypto` dependency is isolated to this file so a Web Crypto backend
 * can be substituted for browser/embedded targets without touching callers.
 */

import { createHash } from "node:crypto";

import { contractViolation } from "./errors.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function encode(value: unknown, path: string, ancestors: Set<object>): string {
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
          { path },
        );
      }
      // Normalize -0 to 0 so two structurally equal values cannot hash differently.
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case "undefined":
      throw contractViolation(
        `Cannot canonicalize \`undefined\` at ${path}. Omit the property instead.`,
        { path },
      );
    case "function":
    case "symbol":
      throw contractViolation(`Cannot canonicalize a ${typeof value} at ${path}.`, { path });
    case "bigint":
      throw contractViolation(
        `Cannot canonicalize a bigint at ${path}. Encode it as a string first.`,
        { path },
      );
    default:
      break;
  }

  const object = value as object;
  if (ancestors.has(object)) {
    throw contractViolation(`Cannot canonicalize a circular structure at ${path}.`, { path });
  }
  ancestors.add(object);

  let encoded: string;
  if (Array.isArray(value)) {
    // Array order is meaningful and preserved.
    encoded = `[${value.map((item, i) => encode(item, `${path}[${i}]`, ancestors)).join(",")}]`;
  } else if (isPlainObject(value)) {
    // Key order is *not* meaningful, so it is normalized. This is what lets two
    // option objects built in different orders hash identically.
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const entry = value[key];
      if (entry === undefined) continue; // absent and explicitly-undefined are the same
      parts.push(`${JSON.stringify(key)}:${encode(entry, `${path}.${key}`, ancestors)}`);
    }
    encoded = `{${parts.join(",")}}`;
  } else {
    throw contractViolation(
      `Cannot canonicalize ${object.constructor?.name ?? "a non-plain object"} at ${path}. ` +
        "Convert it to a plain JSON value first — implicit conversions would make hashes " +
        "depend on runtime behavior.",
      { path },
    );
  }

  ancestors.delete(object);
  return encoded;
}

/**
 * Deterministic JSON: object keys sorted recursively, no insignificant whitespace,
 * `undefined` properties omitted, arrays order-preserving.
 */
export function canonicalJson(value: unknown): string {
  return encode(value, "$", new Set<object>());
}

/** Lowercase hex SHA-256 of a UTF-8 string or raw bytes. */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256")
    .update(typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input))
    .digest("hex");
}

/** `sha256:<hex>` digest of raw bytes — the form used by `artifact` and `outputHash`. */
export function hashBytes(bytes: Uint8Array): string {
  return `sha256:${sha256Hex(bytes)}`;
}

/** `sha256:<hex>` digest of any canonicalizable value. */
export function hashValue(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}
