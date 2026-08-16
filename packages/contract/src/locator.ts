/**
 * The universal address into an artifact (OC-1 §3.6).
 *
 * A locator is the substrate every later capability depends on: citation
 * resolution, redaction plans, privilege logs, governance receipts and RAG
 * provenance all need to name "this exact position in these exact bytes" in a way
 * that survives JSON, a log line, and an agent's context window.
 *
 * Two properties are contractual:
 *
 * - **Bijective** — `parseLocator(formatLocator(l))` deep-equals `l`, and
 *   `formatLocator(parseLocator(s)) === s` for any canonically-formatted `s` (R20).
 * - **Stable** — the same logical position in the same bytes always produces the
 *   same string, across processes and platforms (R21).
 *
 * Canonical string form:
 *
 * ```
 * sha256:ab12…/pptx:slide[2]/shape[0]/run[3]
 * sha256:cd34…/xlsx:sheet[id=Sheet1]/cell[id=R4C7]
 * sha256:ef56…/pdf:page[11]/paragraph[4]#120-168
 * ```
 */

import { contractViolation } from "./errors.js";
import type { ErrorDomain, LocatorKind } from "./types.js";
import { ERROR_DOMAINS, LOCATOR_KINDS } from "./types.js";

/** One step in a locator path. */
export interface LocatorSegment {
  readonly kind: LocatorKind;
  /** Zero-based ordinal within the parent. */
  readonly index?: number;
  /** Stable native identity when the format provides one (sheet name, XML id). */
  readonly id?: string;
}

/** A character range within the addressed node. */
export interface LocatorRange {
  readonly start: number;
  readonly end: number;
}

export interface Locator {
  /**
   * Content hash of the artifact this locator points into, e.g. `sha256:<hex>`.
   * Binding the address to the bytes is what stops a locator from silently
   * resolving against a different version of the document (R22).
   */
  readonly artifact: string;
  readonly domain: ErrorDomain;
  /** Ordered, most-significant first. */
  readonly path: readonly LocatorSegment[];
  readonly range?: LocatorRange;
}

/**
 * Characters that would otherwise be structural in the canonical string form.
 * Percent-encoded inside ids so the grammar stays unambiguous.
 */
const RESERVED_IN_ID = /[%[\]/#;]/g;
const PERCENT_ESCAPE = /%([0-9A-Fa-f]{2})/g;

const ARTIFACT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*:[0-9a-fA-F]+$/;
const SEGMENT_PATTERN = /^([a-z]+)(?:\[(.*)\])?$/;
const RANGE_SUFFIX_PATTERN = /#(\d+)-(\d+)$/;

function encodeId(value: string): string {
  return value.replace(
    RESERVED_IN_ID,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

function decodeId(value: string): string {
  return value.replace(PERCENT_ESCAPE, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function isLocatorKind(value: string): value is LocatorKind {
  return (LOCATOR_KINDS as readonly string[]).includes(value);
}

function isErrorDomain(value: string): value is ErrorDomain {
  return (ERROR_DOMAINS as readonly string[]).includes(value);
}

function assertIndex(index: number, context: string): void {
  if (!Number.isInteger(index) || index < 0) {
    throw contractViolation(
      `Locator ${context} must be a non-negative integer, received ${String(index)}.`,
      { index, context },
    );
  }
}

function formatSegment(segment: LocatorSegment): string {
  const { kind, index, id } = segment;
  if (!isLocatorKind(kind)) {
    throw contractViolation(`Unknown locator kind "${String(kind)}".`, { kind });
  }
  if (index !== undefined) assertIndex(index, `segment index for "${kind}"`);

  if (index !== undefined && id !== undefined) {
    return `${kind}[${index};id=${encodeId(id)}]`;
  }
  if (id !== undefined) {
    return `${kind}[id=${encodeId(id)}]`;
  }
  if (index !== undefined) {
    return `${kind}[${index}]`;
  }
  return kind;
}

function parseSegment(text: string): LocatorSegment {
  const match = SEGMENT_PATTERN.exec(text);
  if (match === null) {
    throw contractViolation(`Malformed locator segment "${text}".`, { segment: text });
  }
  const kind = match[1] ?? "";
  const inner = match[2];

  if (!isLocatorKind(kind)) {
    throw contractViolation(`Unknown locator kind "${kind}".`, { kind, segment: text });
  }
  if (inner === undefined) {
    return { kind };
  }
  if (inner === "") {
    throw contractViolation(`Empty locator selector in segment "${text}".`, { segment: text });
  }

  const both = /^(\d+);id=(.*)$/.exec(inner);
  if (both !== null) {
    return { kind, index: Number.parseInt(both[1] ?? "", 10), id: decodeId(both[2] ?? "") };
  }
  if (inner.startsWith("id=")) {
    return { kind, id: decodeId(inner.slice(3)) };
  }
  if (/^\d+$/.test(inner)) {
    return { kind, index: Number.parseInt(inner, 10) };
  }
  throw contractViolation(`Malformed locator selector "[${inner}]" in segment "${text}".`, {
    segment: text,
  });
}

/** Render a locator in its canonical string form. */
export function formatLocator(locator: Locator): string {
  const { artifact, domain, path, range } = locator;

  if (typeof artifact !== "string" || !ARTIFACT_PATTERN.test(artifact)) {
    throw contractViolation(
      `Locator artifact must look like "<algorithm>:<hex>", received "${String(artifact)}".`,
      { artifact },
    );
  }
  if (!isErrorDomain(domain)) {
    throw contractViolation(`Unknown locator domain "${String(domain)}".`, { domain });
  }
  if (!Array.isArray(path) || path.length === 0) {
    throw contractViolation("Locator path must contain at least one segment.", { domain });
  }

  const segments = path.map(formatSegment).join("/");
  let text = `${artifact}/${domain}:${segments}`;

  if (range !== undefined) {
    assertIndex(range.start, "range start");
    assertIndex(range.end, "range end");
    if (range.end < range.start) {
      throw contractViolation(
        `Locator range end (${range.end}) precedes its start (${range.start}).`,
        { range },
      );
    }
    text += `#${range.start}-${range.end}`;
  }
  return text;
}

/** Parse a canonical locator string. Throws `common/CONTRACT_VIOLATION` if malformed. */
export function parseLocator(text: string): Locator {
  if (typeof text !== "string" || text.length === 0) {
    throw contractViolation("Locator string must be a non-empty string.", { text });
  }

  let body = text;
  let range: LocatorRange | undefined;

  const rangeMatch = RANGE_SUFFIX_PATTERN.exec(body);
  if (rangeMatch !== null) {
    const start = Number.parseInt(rangeMatch[1] ?? "", 10);
    const end = Number.parseInt(rangeMatch[2] ?? "", 10);
    if (end < start) {
      throw contractViolation(`Locator range end (${end}) precedes its start (${start}).`, { text });
    }
    range = { start, end };
    body = body.slice(0, rangeMatch.index);
  }

  // The artifact hash contains a colon but never a slash, so the first slash is
  // unambiguously the artifact terminator.
  const slash = body.indexOf("/");
  if (slash === -1) {
    throw contractViolation(`Locator "${text}" is missing its artifact separator "/".`, { text });
  }
  const artifact = body.slice(0, slash);
  if (!ARTIFACT_PATTERN.test(artifact)) {
    throw contractViolation(
      `Locator artifact must look like "<algorithm>:<hex>", received "${artifact}".`,
      { text, artifact },
    );
  }

  const remainder = body.slice(slash + 1);
  const colon = remainder.indexOf(":");
  if (colon === -1) {
    throw contractViolation(`Locator "${text}" is missing its domain separator ":".`, { text });
  }
  const domain = remainder.slice(0, colon);
  if (!isErrorDomain(domain)) {
    throw contractViolation(`Unknown locator domain "${domain}".`, { text, domain });
  }

  const pathText = remainder.slice(colon + 1);
  if (pathText === "") {
    throw contractViolation(`Locator "${text}" has an empty path.`, { text });
  }
  const path = pathText.split("/").map(parseSegment);

  return range === undefined ? { artifact, domain, path } : { artifact, domain, path, range };
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareSegments(a: LocatorSegment, b: LocatorSegment): number {
  const byKind = compareStrings(a.kind, b.kind);
  if (byKind !== 0) return byKind;

  // Compare ordinals numerically, not lexically: slide[2] must sort before
  // slide[10]. A segment carrying an index sorts ahead of one that does not.
  if (a.index !== undefined || b.index !== undefined) {
    if (a.index === undefined) return 1;
    if (b.index === undefined) return -1;
    if (a.index !== b.index) return a.index - b.index;
  }
  if (a.id !== undefined || b.id !== undefined) {
    if (a.id === undefined) return 1;
    if (b.id === undefined) return -1;
    return compareStrings(a.id, b.id);
  }
  return 0;
}

/**
 * Total, stable ordering over locators, approximating document order.
 *
 * Ordinals compare numerically so `slide[2]` precedes `slide[10]`; a shorter path
 * sorts ahead of a longer path that extends it, so a parent precedes its children.
 * Used to keep loss ledgers identical across runs (R18).
 */
export function compareLocators(a: Locator, b: Locator): number {
  const byArtifact = compareStrings(a.artifact, b.artifact);
  if (byArtifact !== 0) return byArtifact;

  const byDomain = compareStrings(a.domain, b.domain);
  if (byDomain !== 0) return byDomain;

  const shared = Math.min(a.path.length, b.path.length);
  for (let i = 0; i < shared; i += 1) {
    const segmentA = a.path[i];
    const segmentB = b.path[i];
    if (segmentA === undefined || segmentB === undefined) break;
    const bySegment = compareSegments(segmentA, segmentB);
    if (bySegment !== 0) return bySegment;
  }
  if (a.path.length !== b.path.length) return a.path.length - b.path.length;

  const startA = a.range?.start ?? -1;
  const startB = b.range?.start ?? -1;
  if (startA !== startB) return startA - startB;

  const endA = a.range?.end ?? -1;
  const endB = b.range?.end ?? -1;
  return endA - endB;
}
