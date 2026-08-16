// src/version.ts
var CONTRACT_VERSION = "1.0.0";

// src/types.ts
var ERROR_DOMAINS = [
  "common",
  "pptx",
  "docx",
  "xlsx",
  "pdf",
  "html",
  "policy",
  "license",
  "connector",
  "host"
];
var LOSS_SEVERITY_ORDER = [
  "substituted",
  "degraded",
  "dropped"
];
var LOCATOR_KINDS = [
  "page",
  "slide",
  "sheet",
  "section",
  "paragraph",
  "run",
  "table",
  "row",
  "column",
  "cell",
  "shape",
  "image",
  "chart",
  "note",
  "header",
  "footer",
  "comment",
  "annotation",
  "part"
];
var VERBS = [
  "render",
  "parse",
  "inspect",
  "validate",
  "repair",
  "convert",
  "transform",
  "diff",
  "merge",
  "split",
  "extract",
  "redact"
];

// src/errors.ts
var PaperError = class extends Error {
  code;
  phase;
  remediation;
  issues;
  retryable;
  constructor(init) {
    super(init.message, init.cause === void 0 ? void 0 : { cause: init.cause });
    this.name = "PaperError";
    this.code = init.code;
    this.phase = init.phase;
    this.remediation = init.remediation;
    this.issues = init.issues ?? [];
    this.retryable = init.retryable ?? false;
    if (init.locator !== void 0) this.locator = init.locator;
    if (init.details !== void 0) this.details = init.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  /** The domain segment of {@link code}. */
  get domain() {
    return this.code.slice(0, this.code.indexOf("/"));
  }
  toJSON() {
    const json = {
      name: "PaperError",
      code: this.code,
      phase: this.phase,
      message: this.message,
      remediation: this.remediation,
      issues: this.issues,
      retryable: this.retryable
    };
    if (this.locator !== void 0) json.locator = this.locator;
    if (this.details !== void 0) json.details = this.details;
    return json;
  }
};
function isPaperError(value) {
  if (value instanceof PaperError) return true;
  if (!(value instanceof Error) || value.name !== "PaperError") return false;
  const candidate = value;
  return typeof candidate.code === "string" && typeof candidate.remediation === "string";
}
function paperErrorFromJSON(json) {
  return new PaperError({
    code: json.code,
    phase: json.phase,
    message: json.message,
    remediation: json.remediation,
    issues: json.issues ?? [],
    retryable: json.retryable ?? false,
    ...json.locator !== void 0 ? { locator: json.locator } : {},
    ...json.details !== void 0 ? { details: json.details } : {}
  });
}
function contractViolation(message, details) {
  return new PaperError({
    code: "common/CONTRACT_VIOLATION",
    phase: "input",
    message,
    remediation: "This indicates a programming error rather than a data problem. Check the arguments passed to the operation against its documented signature.",
    ...details !== void 0 ? { details } : {}
  });
}

// src/codes.ts
var CONTRACT_VIOLATION = "common/CONTRACT_VIOLATION";
var SCHEMA_REJECTED = "common/SCHEMA_REJECTED";
var RESOURCE_LIMIT_EXCEEDED = "common/RESOURCE_LIMIT_EXCEEDED";
var OPERATION_CANCELLED = "common/OPERATION_CANCELLED";
var OPERATION_TIMEOUT = "common/OPERATION_TIMEOUT";
var OPTIONS_CONFLICT = "common/OPTIONS_CONFLICT";
var UNSUPPORTED_FEATURE = "common/UNSUPPORTED_FEATURE";
var UNSUPPORTED_VERSION = "common/UNSUPPORTED_VERSION";
var INPUT_CORRUPT = "common/INPUT_CORRUPT";
var INPUT_ENCRYPTED = "common/INPUT_ENCRYPTED";
var ASSET_REJECTED = "common/ASSET_REJECTED";
var ASSET_FETCH_FAILED = "common/ASSET_FETCH_FAILED";
var DETERMINISM_UNAVAILABLE = "common/DETERMINISM_UNAVAILABLE";
var NOT_IMPLEMENTED = "common/NOT_IMPLEMENTED";
var COMMON_ERROR_CODES = [
  CONTRACT_VIOLATION,
  SCHEMA_REJECTED,
  RESOURCE_LIMIT_EXCEEDED,
  OPERATION_CANCELLED,
  OPERATION_TIMEOUT,
  OPTIONS_CONFLICT,
  UNSUPPORTED_FEATURE,
  UNSUPPORTED_VERSION,
  INPUT_CORRUPT,
  INPUT_ENCRYPTED,
  ASSET_REJECTED,
  ASSET_FETCH_FAILED,
  DETERMINISM_UNAVAILABLE,
  NOT_IMPLEMENTED
];
function isCommonErrorCode(code) {
  return COMMON_ERROR_CODES.includes(code);
}

// src/locator.ts
var RESERVED_IN_ID = /[%[\]/#;]/g;
var PERCENT_ESCAPE = /%([0-9A-Fa-f]{2})/g;
var ARTIFACT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*:[0-9a-fA-F]+$/;
var SEGMENT_PATTERN = /^([a-z]+)(?:\[(.*)\])?$/;
var RANGE_SUFFIX_PATTERN = /#(\d+)-(\d+)$/;
function encodeId(value) {
  return value.replace(
    RESERVED_IN_ID,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`
  );
}
function decodeId(value) {
  return value.replace(
    PERCENT_ESCAPE,
    (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16))
  );
}
function isLocatorKind(value) {
  return LOCATOR_KINDS.includes(value);
}
function isErrorDomain(value) {
  return ERROR_DOMAINS.includes(value);
}
function assertIndex(index, context) {
  if (!Number.isInteger(index) || index < 0) {
    throw contractViolation(
      `Locator ${context} must be a non-negative integer, received ${String(index)}.`,
      { index, context }
    );
  }
}
function formatSegment(segment) {
  const { kind, index, id } = segment;
  if (!isLocatorKind(kind)) {
    throw contractViolation(`Unknown locator kind "${String(kind)}".`, { kind });
  }
  if (index !== void 0) assertIndex(index, `segment index for "${kind}"`);
  if (index !== void 0 && id !== void 0) {
    return `${kind}[${index};id=${encodeId(id)}]`;
  }
  if (id !== void 0) {
    return `${kind}[id=${encodeId(id)}]`;
  }
  if (index !== void 0) {
    return `${kind}[${index}]`;
  }
  return kind;
}
function parseSegment(text) {
  const match = SEGMENT_PATTERN.exec(text);
  if (match === null) {
    throw contractViolation(`Malformed locator segment "${text}".`, { segment: text });
  }
  const kind = match[1] ?? "";
  const inner = match[2];
  if (!isLocatorKind(kind)) {
    throw contractViolation(`Unknown locator kind "${kind}".`, { kind, segment: text });
  }
  if (inner === void 0) {
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
    segment: text
  });
}
function formatLocator(locator) {
  const { artifact, domain, path, range } = locator;
  if (typeof artifact !== "string" || !ARTIFACT_PATTERN.test(artifact)) {
    throw contractViolation(
      `Locator artifact must look like "<algorithm>:<hex>", received "${String(artifact)}".`,
      { artifact }
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
  if (range !== void 0) {
    assertIndex(range.start, "range start");
    assertIndex(range.end, "range end");
    if (range.end < range.start) {
      throw contractViolation(
        `Locator range end (${range.end}) precedes its start (${range.start}).`,
        { range }
      );
    }
    text += `#${range.start}-${range.end}`;
  }
  return text;
}
function parseLocator(text) {
  if (typeof text !== "string" || text.length === 0) {
    throw contractViolation("Locator string must be a non-empty string.", { text });
  }
  let body = text;
  let range;
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
  const slash = body.indexOf("/");
  if (slash === -1) {
    throw contractViolation(`Locator "${text}" is missing its artifact separator "/".`, { text });
  }
  const artifact = body.slice(0, slash);
  if (!ARTIFACT_PATTERN.test(artifact)) {
    throw contractViolation(
      `Locator artifact must look like "<algorithm>:<hex>", received "${artifact}".`,
      { text, artifact }
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
  return range === void 0 ? { artifact, domain, path } : { artifact, domain, path, range };
}
function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function compareSegments(a, b) {
  const byKind = compareStrings(a.kind, b.kind);
  if (byKind !== 0) return byKind;
  if (a.index !== void 0 || b.index !== void 0) {
    if (a.index === void 0) return 1;
    if (b.index === void 0) return -1;
    if (a.index !== b.index) return a.index - b.index;
  }
  if (a.id !== void 0 || b.id !== void 0) {
    if (a.id === void 0) return 1;
    if (b.id === void 0) return -1;
    return compareStrings(a.id, b.id);
  }
  return 0;
}
function compareLocators(a, b) {
  const byArtifact = compareStrings(a.artifact, b.artifact);
  if (byArtifact !== 0) return byArtifact;
  const byDomain = compareStrings(a.domain, b.domain);
  if (byDomain !== 0) return byDomain;
  const shared = Math.min(a.path.length, b.path.length);
  for (let i = 0; i < shared; i += 1) {
    const segmentA = a.path[i];
    const segmentB = b.path[i];
    if (segmentA === void 0 || segmentB === void 0) break;
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

// src/loss.ts
function createLoss(init) {
  const avoidable = init.avoidable ?? false;
  return {
    code: init.code,
    severity: init.severity,
    subject: init.subject,
    message: init.message,
    avoidable,
    ...init.locator !== void 0 ? { locator: init.locator } : {},
    ...init.expected !== void 0 ? { expected: init.expected } : {},
    ...init.actual !== void 0 ? { actual: init.actual } : {},
    ...init.remediation !== void 0 ? { remediation: init.remediation } : {},
    ...init.details !== void 0 ? { details: init.details } : {}
  };
}
function lossSeverityRank(severity) {
  return LOSS_SEVERITY_ORDER.indexOf(severity);
}
function compareLosses(a, b) {
  if (a.locator !== void 0 && b.locator !== void 0) {
    const byLocator = compareLocators(a.locator, b.locator);
    if (byLocator !== 0) return byLocator;
  } else if (a.locator !== void 0) {
    return -1;
  } else if (b.locator !== void 0) {
    return 1;
  }
  const bySeverity = lossSeverityRank(b.severity) - lossSeverityRank(a.severity);
  if (bySeverity !== 0) return bySeverity;
  if (a.code !== b.code) return a.code < b.code ? -1 : 1;
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
  return 0;
}
function sortLosses(losses) {
  return [...losses].sort(compareLosses);
}
function hasDroppedLoss(losses) {
  return losses.some((loss) => loss.severity === "dropped");
}

// src/registry.ts
function isVerb(value) {
  return VERBS.includes(value);
}
function defineOperations(descriptors) {
  const seen = /* @__PURE__ */ new Set();
  for (const descriptor of descriptors) {
    const parsed = parseOperationName(descriptor.name);
    if (parsed === void 0) {
      throw new Error(
        `Operation name "${descriptor.name}" is not \`domain.verb[.qualifier]\` with a canonical verb (OC-1 \xA74). Packages may add qualifiers, never new base verbs (R32).`
      );
    }
    if (parsed.domain !== descriptor.domain) {
      throw new Error(
        `Operation "${descriptor.name}" declares domain "${descriptor.domain}", which its name does not match.`
      );
    }
    if (parsed.verb !== descriptor.verb) {
      throw new Error(
        `Operation "${descriptor.name}" declares verb "${descriptor.verb}", which its name does not match.`
      );
    }
    if (seen.has(descriptor.name)) {
      throw new Error(`Operation "${descriptor.name}" is declared more than once.`);
    }
    seen.add(descriptor.name);
    if (descriptor.summary.trim().length === 0) {
      throw new Error(`Operation "${descriptor.name}" has an empty summary; it becomes the MCP tool description.`);
    }
    if (descriptor.errorCodes.length === 0) {
      throw new Error(`Operation "${descriptor.name}" declares no errorCodes; every operation can fail (R4).`);
    }
    for (const code of [...descriptor.errorCodes, ...descriptor.lossCodes]) {
      if (!code.startsWith(`${descriptor.domain}/`) && !code.startsWith("common/")) {
        throw new Error(
          `Operation "${descriptor.name}" declares code "${code}", which is namespaced to neither "${descriptor.domain}/" nor "common/" (R11).`
        );
      }
    }
  }
  assertDispatchable(descriptors);
  return Object.freeze([...descriptors]);
}
function assertDispatchable(descriptors) {
  const groups = /* @__PURE__ */ new Map();
  for (const descriptor of descriptors) {
    const key = `${descriptor.domain}.${descriptor.verb}`;
    groups.set(key, [...groups.get(key) ?? [], descriptor]);
  }
  for (const [verb, group] of groups) {
    if (group.length === 1) continue;
    const unbound = group.filter((descriptor) => descriptor.qualifier === void 0);
    if (unbound.length > 0) {
      throw new Error(
        `"${verb}" hosts ${String(group.length)} operations, so each must declare a \`qualifier\` binding saying which option value selects it. Missing on: ${unbound.map((descriptor) => descriptor.name).join(", ")}. Without it every projection would call the verb's default and silently return the wrong operation.`
      );
    }
    const bindings = new Set(group.map((d) => `${d.qualifier?.option ?? ""}=${d.qualifier?.value ?? ""}`));
    if (bindings.size !== group.length) {
      throw new Error(
        `Operations under "${verb}" declare duplicate \`qualifier\` bindings, so at least one can never be reached: ${group.map((d) => `${d.name} -> ${d.qualifier?.option ?? "?"}=${d.qualifier?.value ?? "?"}`).join(", ")}.`
      );
    }
  }
}
function parseOperationName(name) {
  const parts = name.split(".");
  const domain = parts[0];
  const verb = parts[1];
  if (parts.length < 2 || domain === void 0 || verb === void 0) return void 0;
  if (!isVerb(verb)) return void 0;
  const qualifier = parts.slice(2).join(".");
  return qualifier === "" ? { domain, verb } : { domain, verb, qualifier };
}

export { ASSET_FETCH_FAILED, ASSET_REJECTED, COMMON_ERROR_CODES, CONTRACT_VERSION, CONTRACT_VIOLATION, DETERMINISM_UNAVAILABLE, ERROR_DOMAINS, INPUT_CORRUPT, INPUT_ENCRYPTED, LOCATOR_KINDS, LOSS_SEVERITY_ORDER, NOT_IMPLEMENTED, OPERATION_CANCELLED, OPERATION_TIMEOUT, OPTIONS_CONFLICT, PaperError, RESOURCE_LIMIT_EXCEEDED, SCHEMA_REJECTED, UNSUPPORTED_FEATURE, UNSUPPORTED_VERSION, VERBS, compareLocators, compareLosses, contractViolation, createLoss, defineOperations, formatLocator, hasDroppedLoss, isCommonErrorCode, isPaperError, isVerb, lossSeverityRank, paperErrorFromJSON, parseLocator, parseOperationName, sortLosses };
//# sourceMappingURL=chunk-F26VKRFR.js.map
//# sourceMappingURL=chunk-F26VKRFR.js.map