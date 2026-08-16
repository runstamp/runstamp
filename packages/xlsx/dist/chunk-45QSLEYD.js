import {
  createXlsxStructuredWorkflowExtension
} from "./chunk-2CSFJDLR.js";
import {
  PaperError,
  createDiagnostic,
  createLoss,
  defineOperations,
  external_exports,
  fail,
  hashValue,
  isVerb,
  parseLocator,
  runOperation
} from "./chunk-YMTIFCEA.js";

// src/ops/losses.ts
var TAXONOMY = {
  XLSX_MACRO_STRIPPED: {
    contractCode: "xlsx/MACRO_STRIPPED",
    severity: "dropped",
    subject: "macro project",
    avoidable: false,
    remediation: "Keep the original .xlsm if the macros are required; repair cannot preserve a macro project it has to rewrite."
  },
  XLSX_EXTERNAL_CONNECTION_STRIPPED: {
    contractCode: "xlsx/EXTERNAL_CONNECTION_STRIPPED",
    severity: "dropped",
    subject: "external data connection",
    avoidable: false,
    remediation: "Re-create the connection in the repaired workbook, or keep the original if the live link is required."
  },
  XLSX_FORMULA_REF_BROKEN: {
    contractCode: "xlsx/FORMULA_REFERENCE_BROKEN",
    severity: "degraded",
    subject: "formula reference",
    avoidable: true,
    remediation: "Point the formula at a range that exists in the workbook."
  },
  XLSX_NAMED_RANGE_DEAD_REF: {
    contractCode: "xlsx/NAMED_RANGE_DEAD",
    severity: "degraded",
    subject: "named range",
    avoidable: true,
    remediation: "Redefine or remove the named range so it resolves to a live reference."
  },
  XLSX_HYPERLINK_TARGET_INVALID: {
    contractCode: "xlsx/HYPERLINK_TARGET_INVALID",
    severity: "degraded",
    subject: "hyperlink",
    avoidable: true,
    remediation: "Correct the hyperlink target so it is a well-formed URL or in-workbook reference."
  },
  XLSX_MERGE_OVERLAP: {
    contractCode: "xlsx/MERGE_OVERLAP",
    severity: "degraded",
    subject: "merged range",
    avoidable: true,
    remediation: "Make the merged ranges disjoint; Excel cannot represent overlapping merges."
  },
  XLSX_MERGE_RANGE_OUT_OF_BOUNDS: {
    contractCode: "xlsx/MERGE_OUT_OF_BOUNDS",
    severity: "degraded",
    subject: "merged range",
    avoidable: true,
    remediation: "Bring the merged range inside the sheet's used dimensions."
  },
  XLSX_SHARED_STRING_INDEX_OOB: {
    contractCode: "xlsx/SHARED_STRING_INDEX_INVALID",
    severity: "degraded",
    subject: "cell text",
    avoidable: false
  },
  XLSX_STYLE_INDEX_OOB: {
    contractCode: "xlsx/STYLE_INDEX_INVALID",
    severity: "degraded",
    subject: "cell style",
    avoidable: false
  },
  XLSX_RELATIONSHIP_TARGET_MISSING: {
    contractCode: "xlsx/RELATIONSHIP_TARGET_MISSING",
    severity: "degraded",
    subject: "workbook part",
    avoidable: false
  },
  XLSX_CHART_WORKBOOK_MISSING: {
    contractCode: "xlsx/CHART_DATA_MISSING",
    severity: "degraded",
    subject: "chart",
    avoidable: false
  },
  XLSX_TABLE_REF_INVALID: {
    contractCode: "xlsx/TABLE_REFERENCE_INVALID",
    severity: "degraded",
    subject: "table",
    avoidable: true,
    remediation: "Point the table at a range inside the sheet's used dimensions."
  },
  XLSX_TABLE_RELATIONSHIP_BROKEN: {
    contractCode: "xlsx/TABLE_RELATIONSHIP_BROKEN",
    severity: "degraded",
    subject: "table",
    avoidable: false
  },
  XLSX_RANGE_REF_INVALID_LOSS: {
    contractCode: "xlsx/RANGE_REFERENCE_CLIPPED",
    severity: "degraded",
    subject: "range reference",
    avoidable: true,
    remediation: "Point the range at cells inside the sheet's used dimensions."
  },
  XLSX_SHEET_NAME_SUBSTITUTED: {
    contractCode: "xlsx/SHEET_NAME_SUBSTITUTED",
    severity: "substituted",
    subject: "sheet name",
    avoidable: true,
    remediation: "Use a unique sheet name under 32 characters without \\ / * ? : [ ]."
  },
  XLSX_TABLE_NAME_SUBSTITUTED: {
    contractCode: "xlsx/TABLE_NAME_SUBSTITUTED",
    severity: "substituted",
    subject: "table name",
    avoidable: true,
    remediation: "Give each table a unique name."
  },
  XLSX_WORKSHEET_DIMENSION_MISMATCH: {
    contractCode: "xlsx/DIMENSION_MISMATCH",
    severity: "degraded",
    subject: "worksheet dimensions",
    avoidable: false
  }
};
var REPAIR_ACTION_ALIASES = {
  MACRO_STRIPPED: "XLSX_MACRO_STRIPPED",
  EXTERNAL_CONNECTION_STRIPPED: "XLSX_EXTERNAL_CONNECTION_STRIPPED",
  REMOVE_INVALID_DEFINED_NAMES: "XLSX_NAMED_RANGE_DEAD_REF",
  DEFINED_NAME_INVALID: "XLSX_NAMED_RANGE_DEAD_REF",
  REMOVE_INVALID_HYPERLINKS: "XLSX_HYPERLINK_TARGET_INVALID",
  HYPERLINK_TARGET_INVALID: "XLSX_HYPERLINK_TARGET_INVALID",
  MERGE_OVERLAP: "XLSX_MERGE_OVERLAP",
  REPAIR_MERGES: "XLSX_MERGE_OVERLAP",
  MERGE_RANGE_OUT_OF_BOUNDS: "XLSX_MERGE_RANGE_OUT_OF_BOUNDS",
  SHARED_STRING_INDEX_OOB: "XLSX_SHARED_STRING_INDEX_OOB",
  REPAIR_SHARED_STRING_INDEX: "XLSX_SHARED_STRING_INDEX_OOB",
  STYLE_INDEX_OOB: "XLSX_STYLE_INDEX_OOB",
  CLAMP_STYLE_INDEX: "XLSX_STYLE_INDEX_OOB",
  INVALID_TABLE_REF: "XLSX_TABLE_REF_INVALID",
  CLIP_TABLE_REF: "XLSX_TABLE_REF_INVALID",
  CLIP_DATA_VALIDATION_RANGES: "XLSX_RANGE_REF_INVALID_LOSS",
  INVALID_RANGE_REF: "XLSX_RANGE_REF_INVALID_LOSS",
  SHEET_NAME_INVALID: "XLSX_SHEET_NAME_SUBSTITUTED",
  NORMALIZE_SHEET_NAMES: "XLSX_SHEET_NAME_SUBSTITUTED",
  DUPLICATE_SHEET_NAME: "XLSX_SHEET_NAME_SUBSTITUTED",
  DUPLICATE_TABLE_NAME: "XLSX_TABLE_NAME_SUBSTITUTED",
  NORMALIZE_DUPLICATE_TABLE_NAME: "XLSX_TABLE_NAME_SUBSTITUTED",
  MISSING_WORKSHEET_PART: "XLSX_RELATIONSHIP_TARGET_MISSING",
  DIMENSION_MISMATCH: "XLSX_WORKSHEET_DIMENSION_MISMATCH"
};
var DIAGNOSTIC_CODES = /* @__PURE__ */ new Set([
  "XLSX_RELAXED_FREEZE_PANE",
  "XLSX_RELAXED_MERGES",
  "XLSX_RELAXED_META_SUBJECT",
  "XLSX_RELAXED_PRESET_NAME",
  "XLSX_LINT_AUTOFILTER_INVALID_REF",
  "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS",
  "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE",
  "XLSX_LINT_CF_REF_INVALID",
  "XLSX_LINT_CF_REF_OUT_OF_BOUNDS",
  "XLSX_LINT_CHART_CROSSES_PAGE_BREAK",
  "XLSX_LINT_CHART_EMPTY_SERIES",
  "XLSX_LINT_COLUMN_WIDTH_CAPPED",
  "XLSX_LINT_SHEET_NAME_DUPLICATE",
  "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS",
  "XLSX_LINT_SHEET_NAME_RESERVED",
  "XLSX_LINT_SHEET_NAME_TOO_LONG",
  "XLSX_LINT_WIDE_PRINT_RANGE",
  "XLSX_DATE_BEFORE_1900",
  "XLSX_DUPLICATE_SHEET_NAME",
  "XLSX_FORMULA_CACHED_VALUE_MISSING",
  "XLSX_GOOGLE_SHEETS_IMPORT_RISK",
  "XLSX_HIGH_UNIQUE_STRING_COUNT",
  "XLSX_LARGE_FILE_WARNING",
  "XLSX_NUMBERS_COMPATIBILITY_WARNING",
  "XLSX_RANGE_REF_INVALID",
  "XLSX_SHEET_NAME_INVALID",
  "XLSX_STREAM_MODE_RECOMMENDED",
  "XLSX_STYLE_CARDINALITY_EXCESSIVE",
  "XLSX_TABLE_NAME_DUPLICATE",
  // Repairs that only correct OOXML plumbing: no authored content changes.
  "FIX_CONTENT_TYPES",
  "MISSING_CONTENT_TYPE",
  "EXTRA_CONTENT_TYPE",
  "DEDUPE_RELATIONSHIP_IDS",
  "DUPLICATE_RELATIONSHIP_ID",
  "REMOVE_ORPHAN_RELATIONSHIPS",
  "RECALCULATE_DIMENSION",
  "ADD_FORMULA_CACHED_VALUES",
  "FORMULA_CACHED_VALUE_MISSING"
]);
var UNCLASSIFIED = {
  contractCode: "xlsx/UNCLASSIFIED_CONDITION",
  severity: "degraded",
  subject: "workbook",
  avoidable: false
};
var SEGMENT_KINDS = {
  sheets: "sheet",
  rows: "row",
  cells: "cell",
  columns: "column",
  charts: "chart",
  tables: "table"
};
var PATH_TOKEN = /([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?/g;
function locatorFromEnginePath(path, artifact) {
  const segments = [];
  for (const match of path.matchAll(PATH_TOKEN)) {
    const kind = SEGMENT_KINDS[match[1] ?? ""];
    const index = match[2];
    if (kind !== void 0 && index !== void 0) {
      segments.push({ kind, index: Number(index) });
    }
  }
  if (segments.length === 0) return void 0;
  const text = `${artifact}/xlsx:${segments.map((segment) => `${segment.kind}[${String(segment.index)}]`).join("/")}`;
  return parseLocator(text);
}
function classifyWarning(warning, artifact) {
  const code = REPAIR_ACTION_ALIASES[warning.code] ?? warning.code;
  const locator = warning.path === void 0 ? void 0 : locatorFromEnginePath(warning.path, artifact);
  if (DIAGNOSTIC_CODES.has(code)) {
    return {
      diagnostic: createDiagnostic({
        code: `xlsx/${code}`,
        severity: "info",
        phase: "input",
        message: warning.message,
        ...locator !== void 0 ? { locator } : {},
        details: { path: warning.path ?? null, engineCode: warning.code }
      })
    };
  }
  const entry = TAXONOMY[code] ?? UNCLASSIFIED;
  return {
    loss: createLoss({
      code: entry.contractCode,
      severity: entry.severity,
      subject: entry.subject,
      message: warning.message,
      ...locator !== void 0 ? { locator } : {},
      ...warning.from !== void 0 ? { expected: String(warning.from) } : {},
      ...warning.to !== void 0 ? { actual: String(warning.to) } : {},
      avoidable: entry.avoidable,
      // R19: an avoidable loss the caller cannot act on is not actionable.
      ...entry.remediation !== void 0 ? { remediation: entry.remediation } : {},
      details: { path: warning.path ?? null, engineCode: warning.code }
    })
  };
}
var XLSX_LOSS_CODES = [
  ...new Set(Object.values(TAXONOMY).map((entry) => entry.contractCode)),
  UNCLASSIFIED.contractCode
];
var CLASSIFIED_ENGINE_CODES = [
  ...Object.keys(TAXONOMY),
  ...Object.keys(REPAIR_ACTION_ALIASES),
  ...DIAGNOSTIC_CODES
];

// ../extension-kit/dist/index.js
var JsonScalarSchema = external_exports.union([external_exports.string(), external_exports.number().finite(), external_exports.boolean(), external_exports.null()]);
var JsonValueSchema = external_exports.lazy(() => external_exports.union([
  JsonScalarSchema,
  external_exports.array(JsonValueSchema),
  external_exports.record(external_exports.string(), JsonValueSchema)
]));
var StableCodeSchema = external_exports.string().regex(/^[A-Z][A-Z0-9_]{2,127}$/);
var Sha256Schema = external_exports.string().regex(/^[a-f0-9]{64}$/);
var ExtensionOperationSchema = external_exports.strictObject({
  name: external_exports.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  summary: external_exports.string().min(1).max(240),
  inputKinds: external_exports.array(external_exports.string().min(1)).min(1),
  outputKinds: external_exports.array(external_exports.string().min(1)).min(1)
});
var DeclaredCodeSchema = external_exports.strictObject({
  code: StableCodeSchema,
  description: external_exports.string().min(1).max(500)
});
var ExtensionManifestSchema = external_exports.strictObject({
  schemaVersion: external_exports.literal(1),
  id: external_exports.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/),
  version: external_exports.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  catalogItemId: external_exports.string().regex(/^(?:EX|A|O|G|D|W)\d{2}$/),
  title: external_exports.string().min(1).max(160),
  operations: external_exports.array(ExtensionOperationSchema).min(1),
  warningCodes: external_exports.array(DeclaredCodeSchema),
  lossCodes: external_exports.array(DeclaredCodeSchema)
}).superRefine((manifest, context) => {
  for (const [label, values] of [
    ["operation", manifest.operations.map((entry) => entry.name)],
    ["warning code", manifest.warningCodes.map((entry) => entry.code)],
    ["loss code", manifest.lossCodes.map((entry) => entry.code)]
  ]) {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: `Duplicate ${label} declarations are not allowed.` });
    }
  }
});
var ResourceBudgetSchema = external_exports.strictObject({
  maxInputBytes: external_exports.number().int().positive(),
  maxOutputBytes: external_exports.number().int().positive(),
  maxEntries: external_exports.number().int().positive(),
  maxDepth: external_exports.number().int().positive(),
  timeoutMs: external_exports.number().int().positive()
});
var DeterministicContextSchema = external_exports.strictObject({
  runId: external_exports.string().min(1).max(160),
  seed: external_exports.string().min(1).max(256),
  now: external_exports.iso.datetime({ offset: true }),
  network: external_exports.literal("disabled"),
  budget: ResourceBudgetSchema
});
var ExtensionRequestSchema = external_exports.strictObject({
  schemaVersion: external_exports.literal(1),
  extensionId: external_exports.string().min(1),
  operation: external_exports.string().min(1),
  input: JsonValueSchema,
  context: DeterministicContextSchema
});
var ExtensionLocatorSchema = external_exports.strictObject({
  artifactId: external_exports.string().min(1).max(256),
  scheme: external_exports.string().regex(/^[a-z][a-z0-9.-]{1,63}$/),
  value: external_exports.array(external_exports.union([external_exports.string(), external_exports.number().int().nonnegative()])).min(1)
});
var ExtensionDiagnosticSchema = external_exports.strictObject({
  code: StableCodeSchema,
  message: external_exports.string().min(1).max(2e3),
  severity: external_exports.enum(["info", "warning", "error"]).optional(),
  locator: ExtensionLocatorSchema.optional()
});
var ArtifactDescriptorSchema = external_exports.strictObject({
  name: external_exports.string().min(1).max(256),
  mediaType: external_exports.string().min(1).max(160),
  byteLength: external_exports.number().int().nonnegative(),
  sha256: Sha256Schema
});
var ExtensionSuccessSchema = external_exports.strictObject({
  status: external_exports.literal("ok"),
  output: JsonValueSchema,
  warnings: external_exports.array(ExtensionDiagnosticSchema),
  losses: external_exports.array(ExtensionDiagnosticSchema),
  artifacts: external_exports.array(ArtifactDescriptorSchema)
});
var ExtensionFailureSchema = external_exports.strictObject({
  status: external_exports.literal("error"),
  error: external_exports.strictObject({
    code: StableCodeSchema,
    message: external_exports.string().min(1).max(2e3),
    retryable: external_exports.boolean()
  }),
  warnings: external_exports.array(ExtensionDiagnosticSchema),
  losses: external_exports.array(ExtensionDiagnosticSchema),
  artifacts: external_exports.array(ArtifactDescriptorSchema)
});
var ExtensionResultSchema = external_exports.discriminatedUnion("status", [ExtensionSuccessSchema, ExtensionFailureSchema]);
var ProgressUpdateSchema = external_exports.strictObject({
  completed: external_exports.number().finite().nonnegative(),
  total: external_exports.number().finite().positive(),
  message: external_exports.string().min(1).max(500).optional()
}).refine((progress) => progress.completed <= progress.total, "completed cannot exceed total");
var ResourceUsageSchema = external_exports.strictObject({
  inputBytes: external_exports.number().int().nonnegative().optional(),
  outputBytes: external_exports.number().int().nonnegative().optional(),
  entries: external_exports.number().int().nonnegative().optional(),
  depth: external_exports.number().int().nonnegative().optional()
});
var ValidatorIssueSchema = external_exports.strictObject({
  code: StableCodeSchema,
  message: external_exports.string().min(1).max(2e3),
  severity: external_exports.enum(["info", "warning", "error"]),
  locator: ExtensionLocatorSchema.optional()
});
var ValidatorResultSchema = external_exports.strictObject({
  validator: external_exports.string().min(1).max(160),
  version: external_exports.string().min(1).max(160),
  required: external_exports.boolean(),
  status: external_exports.enum(["PASS", "FAIL", "ADVISORY", "BLOCKED_EXTERNAL"]),
  command: external_exports.string().min(1).max(2e3),
  issues: external_exports.array(ValidatorIssueSchema)
}).superRefine((result, context) => {
  if (result.required && result.status === "ADVISORY") {
    context.addIssue({ code: "custom", path: ["status"], message: "A required validator cannot be advisory." });
  }
  if (result.status === "PASS" && result.issues.some((issue) => issue.severity === "error")) {
    context.addIssue({ code: "custom", path: ["issues"], message: "A passing validator cannot contain error issues." });
  }
});
var FixtureDescriptorSchema = external_exports.strictObject({
  id: external_exports.string().regex(/^[a-z0-9][a-z0-9_-]{1,127}$/),
  kind: external_exports.enum(["minimal", "buyer_realistic", "unrelated_domain", "boundary", "hostile", "known_bad", "determinism", "round_trip", "composition"]),
  operation: external_exports.string().min(1),
  input: JsonValueSchema,
  expectedStatus: external_exports.enum(["ok", "error"]),
  validators: external_exports.array(external_exports.string().min(1))
});
var ExtensionExecutionError = class extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "ExtensionExecutionError";
    this.code = code;
    this.details = details;
  }
};
function encodedSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
function assertBudget(budget, usage) {
  const limits = [
    ["inputBytes", "maxInputBytes"],
    ["outputBytes", "maxOutputBytes"],
    ["entries", "maxEntries"],
    ["depth", "maxDepth"]
  ];
  for (const [usageKey, budgetKey] of limits) {
    const amount = usage[usageKey];
    if (amount !== void 0 && amount > budget[budgetKey]) {
      throw new ExtensionExecutionError("RESOURCE_LIMIT", `${usageKey} ${amount} exceeds ${budgetKey} ${budget[budgetKey]}.`, { usageKey, amount, budgetKey, limit: budget[budgetKey] });
    }
  }
}
function abortError(signal) {
  return new ExtensionExecutionError("EXTENSION_ABORTED", typeof signal.reason === "string" ? signal.reason : "Extension execution was aborted.");
}
function validateExtensionResult(manifestInput, resultInput) {
  const manifest = ExtensionManifestSchema.parse(manifestInput);
  const parsed = ExtensionResultSchema.safeParse(resultInput);
  if (!parsed.success)
    throw new ExtensionExecutionError("INVALID_RESULT", parsed.error.message);
  const warningCodes = new Set(manifest.warningCodes.map((entry) => entry.code));
  const lossCodes = new Set(manifest.lossCodes.map((entry) => entry.code));
  for (const warning of parsed.data.warnings) {
    if (!warningCodes.has(warning.code))
      throw new ExtensionExecutionError("INVALID_RESULT", `Extension ${manifest.id} emitted undeclared warning code ${warning.code}.`);
  }
  for (const loss of parsed.data.losses) {
    if (!lossCodes.has(loss.code))
      throw new ExtensionExecutionError("INVALID_RESULT", `Extension ${manifest.id} emitted undeclared loss code ${loss.code}.`);
  }
  return parsed.data;
}
async function runExtension(definitionInput, requestInput, options = {}) {
  const manifest = ExtensionManifestSchema.parse(definitionInput.manifest);
  const parsedRequest = ExtensionRequestSchema.safeParse(requestInput);
  if (!parsedRequest.success)
    throw new ExtensionExecutionError("INVALID_REQUEST", parsedRequest.error.message);
  const request = parsedRequest.data;
  if (request.extensionId !== manifest.id)
    throw new ExtensionExecutionError("INVALID_REQUEST", `Request extensionId ${request.extensionId} does not match ${manifest.id}.`);
  if (!manifest.operations.some((operation) => operation.name === request.operation))
    throw new ExtensionExecutionError("INVALID_REQUEST", `Extension ${manifest.id} does not declare operation ${request.operation}.`);
  if (options.signal?.aborted)
    throw abortError(options.signal);
  assertBudget(request.context.budget, { inputBytes: encodedSize(request.input) });
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort("Extension execution timed out."), request.context.budget.timeoutMs);
  const context = {
    signal: controller.signal,
    deterministic: request.context,
    budget: request.context.budget,
    reportProgress(update) {
      options.onProgress?.(ProgressUpdateSchema.parse(update));
    },
    checkpoint(usage) {
      assertBudget(request.context.budget, ResourceUsageSchema.parse(usage));
      if (controller.signal.aborted)
        throw abortError(controller.signal);
    }
  };
  const abortPromise = new Promise((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => reject(abortError(controller.signal)), { once: true });
  });
  try {
    const result = await Promise.race([definitionInput.execute(request, context), abortPromise]);
    const validated = validateExtensionResult(manifest, result);
    assertBudget(request.context.budget, { outputBytes: encodedSize(validated) });
    return validated;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

// ../ops-bridge/dist/index.js
var EXTENSION_BUDGET_CEILING_MS = 10 * 60 * 1e3;
var PERMISSIVE_SCHEMA = { description: "Declared by the extension manifest." };
var PHASE_FOR_VERB = {
  render: "rendering",
  convert: "rendering",
  transform: "rendering",
  repair: "rendering",
  merge: "archive",
  split: "archive",
  parse: "parsing",
  extract: "parsing",
  inspect: "parsing",
  validate: "validation",
  diff: "validation",
  redact: "policy"
};
function namespaced(domain, code) {
  return code.includes("/") ? code : `${domain}/${code}`;
}
function deterministicContext(inputHash, timeoutMs, budget) {
  const seed = inputHash.replace("sha256:", "");
  return {
    runId: `runstamp-${seed.slice(0, 32)}`,
    seed,
    // Fixed rather than current: an operation that stamps "now" cannot be
    // byte-reproduced tomorrow, which is what the receipt promises.
    now: "1970-01-01T00:00:00.000Z",
    network: "disabled",
    budget: {
      maxInputBytes: 64 * 1024 * 1024,
      maxOutputBytes: 64 * 1024 * 1024,
      maxEntries: 1e5,
      maxDepth: 64,
      ...budget,
      timeoutMs: budget?.timeoutMs ?? timeoutMs
    }
  };
}
function locatorDetails(locator) {
  if (typeof locator !== "object" || locator === null) return void 0;
  return { extensionLocator: locator };
}
async function guarded(run, binding, phase) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PaperError) throw error;
    const code = error.code;
    const raw = typeof code === "string" ? code : "EXTENSION_FAILED";
    throw new PaperError({
      message: error instanceof Error ? error.message : String(error),
      code: namespaced(binding.domain, raw),
      phase,
      remediation: binding.remediation[raw] ?? binding.fallbackRemediation,
      cause: error
    });
  }
}
function dispatcher(verb, domain, group) {
  const sole = group.size === 1 ? [...group.keys()][0] : void 0;
  const phase = PHASE_FOR_VERB[verb];
  return async (input, options) => {
    const requested = typeof options?.operation === "string" ? options.operation : sole;
    const route = requested === void 0 ? void 0 : group.get(requested);
    if (route === void 0) {
      return fail(
        new PaperError({
          message: requested === void 0 ? `"${domain}.${verb}" hosts ${String(group.size)} operations; the call did not say which.` : `"${requested}" is not an operation of "${domain}.${verb}".`,
          code: namespaced(domain, "SCHEMA_REJECTED"),
          phase,
          remediation: `Set options.operation to one of: ${[...group.keys()].join(", ")}.`
        })
      );
    }
    return route.run(input, options);
  };
}
function toLosses(result, binding, undeclared) {
  return result.losses.map((loss) => {
    const severity = binding.lossSeverity[loss.code];
    if (severity === void 0) undeclared.push(loss.code);
    return createLoss({
      code: namespaced(binding.domain, loss.code),
      // `degraded` is the honest reading of an unmapped code: something changed
      // and we cannot say it was a faithful substitution or a clean drop.
      severity: severity ?? "degraded",
      subject: binding.definition.manifest.id,
      message: loss.message,
      avoidable: false,
      details: {
        ...locatorDetails(loss.locator) ?? {},
        extensionCode: loss.code,
        ...severity === void 0 ? { severityUndeclared: true } : {}
      }
    });
  });
}
function projectExtension(binding) {
  const { manifest } = binding.definition;
  const declared = new Set(manifest.operations.map((operation) => operation.name));
  for (const name of Object.keys(binding.verbs)) {
    if (!declared.has(name)) {
      throw new Error(
        `Extension "${manifest.id}" has no operation named "${name}", but the binding maps it to a verb. Known operations: ${[...declared].join(", ")}.`
      );
    }
  }
  for (const [name, mapping] of Object.entries(binding.verbs)) {
    if (!isVerb(mapping.verb)) {
      throw new Error(
        `Operation "${name}" maps to "${mapping.verb}", which is not a canonical verb (R32). See docs/verb-reconciliation.md; packages add qualifiers, never base verbs.`
      );
    }
  }
  const missing = manifest.lossCodes.map((entry) => entry.code).filter((code) => binding.lossSeverity[code] === void 0);
  if (missing.length > 0) {
    throw new Error(
      `Extension "${manifest.id}" declares loss code(s) with no severity: ${missing.join(", ")}. Grade each as substituted, degraded or dropped \u2014 it cannot be inferred from the extension's own info/warning/error scale, which measures loudness rather than what happened to the content (R15).`
    );
  }
  const byVerb = /* @__PURE__ */ new Map();
  for (const [name, mapping] of Object.entries(binding.verbs)) {
    const key = `${mapping.verb}${mapping.qualifier === void 0 ? "" : `.${mapping.qualifier}`}`;
    byVerb.set(key, [...byVerb.get(key) ?? [], name]);
  }
  for (const [key, names] of byVerb) {
    if (names.length > 1) {
      throw new Error(
        `Operations ${names.map((name) => `"${name}"`).join(" and ")} both map to "${binding.domain}.${key}", so each must declare a \`qualifier\` binding saying which one a projection is asking for. Without it every projection reaches whichever was registered first.`
      );
    }
  }
  if (binding.fallbackRemediation.trim().length === 0) {
    throw new Error(
      `Extension "${manifest.id}" supplies an empty fallbackRemediation. R10: an error the caller cannot act on is a bug.`
    );
  }
  const errorCodes = [
    ...Object.keys(binding.remediation).map((code) => namespaced(binding.domain, code)),
    namespaced(binding.domain, "SCHEMA_REJECTED")
  ];
  const descriptors = defineOperations(
    Object.entries(binding.verbs).map(([name, mapping]) => {
      const operation = manifest.operations.find((entry) => entry.name === name);
      return {
        name: mapping.qualifier === void 0 ? `${binding.domain}.${mapping.verb}` : `${binding.domain}.${mapping.verb}.${mapping.qualifier}`,
        domain: binding.domain,
        verb: mapping.verb,
        ...mapping.qualifier === void 0 ? {} : (
          // The dispatch value is the *qualifier*, not the manifest operation
          // name. Two extensions in one domain can both call an operation
          // `inspect`, so the manifest name is not unique — the qualifier is,
          // because `defineOperations` already rejects a duplicate. Without
          // this the hosted route would set `operation: "inspect"` and reach
          // whichever extension registered it last.
          { qualifier: { option: "operation", value: mapping.qualifier } }
        ),
        summary: mapping.summary ?? operation?.summary ?? `${manifest.title}: ${name}.`,
        ...binding.module === void 0 ? {} : { implementation: binding.module },
        inputSchema: PERMISSIVE_SCHEMA,
        optionsSchema: PERMISSIVE_SCHEMA,
        valueSchema: PERMISSIVE_SCHEMA,
        errorCodes: errorCodes.length > 0 ? errorCodes : [namespaced(binding.domain, "EXTENSION_FAILED")],
        lossCodes: manifest.lossCodes.map((entry) => namespaced(binding.domain, entry.code)),
        deterministic: binding.deterministic ?? true,
        sideEffects: binding.sideEffects ?? "none",
        stability: mapping.stability ?? binding.stability ?? "experimental"
      };
    })
  );
  const routes = /* @__PURE__ */ new Map();
  for (const descriptor of descriptors) {
    const entry = Object.entries(binding.verbs).find(
      ([name, mapping2]) => mapping2.verb === descriptor.verb && (mapping2.qualifier ?? name) === (descriptor.qualifier?.value ?? name)
    );
    if (entry === void 0) continue;
    const [operationName, mapping] = entry;
    const key = mapping.qualifier ?? operationName;
    const phase = PHASE_FOR_VERB[descriptor.verb];
    const run = async (input, options) => {
      let cached;
      const inputHash = () => cached ??= hashValue(input);
      return runOperation({
        operation: descriptor.name,
        domain: binding.domain,
        engine: { name: manifest.id, version: binding.engineVersion },
        inputHash,
        ...options !== void 0 ? { options } : {},
        execute: async (context) => {
          const timeoutMs = EXTENSION_BUDGET_CEILING_MS;
          const result = await guarded(() => runExtension(
            binding.definition,
            {
              schemaVersion: 1,
              extensionId: manifest.id,
              operation: operationName,
              input,
              context: deterministicContext(inputHash(), timeoutMs, binding.budget)
            },
            context.signal === void 0 ? {} : { signal: context.signal }
          ), binding, phase);
          for (const warning of result.warnings) {
            context.addDiagnostic(
              createDiagnostic({
                code: namespaced(binding.domain, warning.code),
                // OC-1 diagnostics are debug | info | warn: an "error" that is
                // not a failure has nowhere to go, and R15 keeps the ledger for
                // content deviations, so it lands at warn rather than inventing
                // a severity or promoting an advisory into a loss.
                severity: warning.severity === "info" ? "info" : "warn",
                message: warning.message,
                phase,
                ...locatorDetails(warning.locator) === void 0 ? {} : { details: locatorDetails(warning.locator) }
              })
            );
          }
          const undeclared = [];
          for (const loss of toLosses(result, binding, undeclared)) context.addLoss(loss);
          for (const code of undeclared) {
            context.addDiagnostic(
              createDiagnostic({
                code: namespaced(binding.domain, "LOSS_SEVERITY_UNDECLARED"),
                severity: "warn",
                message: `Loss code "${code}" has no declared severity; reported as degraded.`,
                phase
              })
            );
          }
          if (result.status === "error") {
            throw new PaperError({
              message: result.error.message,
              code: namespaced(binding.domain, result.error.code),
              phase,
              remediation: binding.remediation[result.error.code] ?? binding.fallbackRemediation,
              retryable: result.error.retryable
            });
          }
          const artifacts = result.artifacts.map((artifact) => ({
            name: artifact.name,
            mediaType: artifact.mediaType,
            byteLength: artifact.byteLength,
            sha256: artifact.sha256
          }));
          return {
            value: { output: result.output, artifacts },
            // Only meaningful for a single artifact: with several there is no one
            // set of bytes the receipt is about, and inventing a combined hash
            // would make the receipt claim something it cannot support.
            ...artifacts.length === 1 && artifacts[0] !== void 0 ? { outputHash: `sha256:${artifacts[0].sha256}` } : {}
          };
        }
      });
    };
    const forVerb = routes.get(descriptor.verb) ?? /* @__PURE__ */ new Map();
    forVerb.set(key, { descriptor, run });
    routes.set(descriptor.verb, forVerb);
  }
  const ops = {};
  for (const [verb, group] of routes) ops[verb] = dispatcher(verb, binding.domain, group);
  return { descriptors, ops, routes: Object.fromEntries([...routes].map(([v, m]) => [v, Object.fromEntries(m)])) };
}

// src/ops/workflow.ts
var BINDING = {
  domain: "xlsx",
  definition: createXlsxStructuredWorkflowExtension(),
  verbs: {
    read: { verb: "parse", summary: "Read workbook bytes into the structured model." },
    map: { verb: "transform", summary: "Apply a mapping to a workbook and return the result." },
    export: { verb: "convert", summary: "Export a workbook to the requested target form." }
  },
  lossSeverity: {
    // Preserved verbatim but uninterpreted: nothing is removed, but the caller
    // cannot be told what the part contains.
    XLSX_OPAQUE_PART_PRESERVED: "degraded"
  },
  remediation: {
    INVALID_INPUT: "Send the request shape this operation documents, with the workbook bytes base64-encoded.",
    RESOURCE_LIMIT: "The workbook exceeded a bounded resource budget. Split it, or raise the budget on the request.",
    TIMEOUT: "Retry with a longer timeoutMs, or split the workbook into smaller units of work.",
    XLSX_ABORTED: "Retry without aborting the operation, or allow a longer deadline.",
    XLSX_ARCHIVE_UNSAFE: "Send a valid XLSX ZIP package with safe part paths and the required workbook relationships.",
    XLSX_BUDGET_EXCEEDED: "Reduce the workbook size or raise the applicable input, part, or cell budget.",
    XLSX_CELL_NOT_FOUND: "Use a worksheet and cell reference present in the imported workbook.",
    XLSX_ENCRYPTED_UNSUPPORTED: "Decrypt the workbook before processing it.",
    XLSX_FORMULA_INJECTION: "Send the value as text or explicitly choose a safe formula policy.",
    XLSX_MAPPING_UNRESOLVED: "Correct the mapping target so it resolves to a unique workbook cell."
  },
  fallbackRemediation: "Check the request against the structured-workflow operation's documented shape; if it is well formed, report the code with the workbook that produced it.",
  engineVersion: "1.0.0",
  sideEffects: "none",
  stability: "stable"
};
var XLSX_WORKFLOW = projectExtension(BINDING);

export {
  classifyWarning,
  XLSX_LOSS_CODES,
  XLSX_WORKFLOW
};
//# sourceMappingURL=chunk-45QSLEYD.js.map
