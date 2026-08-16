import {
  CATALOG,
  findOperation,
  httpRoute,
} from "@runstamp/catalog";
import type { CatalogOperationDescriptor } from "@runstamp/catalog";
import { isPaperError } from "@runstamp/contract";
import { decodeWireInput, summarizeArtifacts } from "./wire.js";

export type ExecutionMode = "auto" | "local" | "hosted";

export interface RuntimeConfiguration {
  readonly mode?: ExecutionMode;
  readonly apiBaseUrl?: string;
  readonly apiKey?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly importModule?: (specifier: string) => Promise<Record<string, unknown>>;
}

export interface ToolContent { readonly type: "text"; readonly text: string }
export interface ToolResult { readonly content: readonly ToolContent[]; readonly isError?: boolean }
export interface ModularTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  execute(arguments_: unknown): Promise<ToolResult>;
}

interface InvokeArguments {
  readonly operation?: string;
  readonly input?: unknown;
  readonly options?: Record<string, unknown>;
  readonly execution_mode?: ExecutionMode;
  readonly include_bytes?: boolean;
}

const LOCAL_MODULES: Readonly<Record<string, string>> = Object.freeze({
  docx: "@runstamp/docx/ops",
  pdf: "@runstamp/pdf/ops",
  pptx: "@runstamp/pptx/ops",
  xlsx: "@runstamp/xlsx/ops",
});

// Extension descriptors can share an engine domain, so domain alone is not a
// safe local-dispatch signal. These are the operations owned by the four peers.
const LOCAL_OPERATIONS = new Set([
  "docx.convert.pdf", "docx.diff", "docx.inspect.controlled", "docx.inspect.find",
  "docx.inspect.redaction-preview", "docx.parse", "docx.redact", "docx.render",
  "docx.transform.html", "docx.validate", "pdf.convert", "pdf.extract.signatures",
  "pdf.inspect.evidence", "pdf.inspect.find", "pdf.inspect.redaction-preview", "pdf.redact",
  "pdf.render", "pdf.repair", "pdf.transform", "pdf.validate", "pptx.convert.pdf",
  "pptx.render", "pptx.repair", "pptx.validate", "xlsx.convert", "xlsx.inspect",
  "xlsx.parse", "xlsx.render", "xlsx.repair", "xlsx.transform", "xlsx.validate",
]);

function text(value: unknown, isError = false): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) };
}

function configurationError(message: string, remediation: string): ToolResult {
  return text({
    ok: false,
    error: { code: "common/CONFIGURATION_REQUIRED", phase: "configuration", message, remediation },
    losses: [],
    diagnostics: [],
  }, true);
}

function inputError(message: string): ToolResult {
  return text({
    ok: false,
    error: {
      code: "common/SCHEMA_REJECTED",
      phase: "validation",
      message,
      remediation: "Call runstamp_list_operations, then runstamp_describe_operation with an exact operation name.",
    },
    losses: [],
    diagnostics: [],
  }, true);
}

function defaultImporter(specifier: string): Promise<Record<string, unknown>> {
  switch (specifier) {
    case "@runstamp/docx/ops": return import("@runstamp/docx/ops");
    case "@runstamp/pdf/ops": return import("@runstamp/pdf/ops");
    case "@runstamp/pptx/ops": return import("@runstamp/pptx/ops");
    case "@runstamp/xlsx/ops": return import("@runstamp/xlsx/ops");
    default: return Promise.reject(new Error(`Unsupported local module ${specifier}.`));
  }
}

function selectedMode(value: unknown, fallback: ExecutionMode): ExecutionMode | undefined {
  const mode = value ?? fallback;
  return mode === "auto" || mode === "local" || mode === "hosted" ? mode : undefined;
}

async function invokeLocal(
  descriptor: CatalogOperationDescriptor,
  args: InvokeArguments,
  importer: (specifier: string) => Promise<Record<string, unknown>>,
): Promise<ToolResult> {
  const specifier = LOCAL_MODULES[descriptor.domain];
  if (specifier === undefined || !LOCAL_OPERATIONS.has(descriptor.name)) {
    return configurationError(
      `${descriptor.name} is a managed operation and has no local implementation.`,
      "Configure RUNSTAMP_API_BASE_URL and RUNSTAMP_API_KEY, then use hosted or auto mode.",
    );
  }

  let module: Record<string, unknown>;
  try {
    module = await importer(specifier);
  } catch {
    return configurationError(
      `The optional peer ${specifier.replace("/ops", "")} is not installed.`,
      `Install ${specifier.replace("/ops", "")} or configure hosted execution.`,
    );
  }
  const operation = module[descriptor.verb];
  if (typeof operation !== "function") {
    return configurationError(
      `${specifier} does not export ${descriptor.verb}.`,
      "Install a compatible 1.x engine release or use hosted execution.",
    );
  }

  let input: unknown;
  try {
    input = decodeWireInput(descriptor, args.input);
  } catch (error) {
    if (!isPaperError(error)) throw error;
    return text({ ok: false, error: error.toJSON(), losses: [], diagnostics: [] }, true);
  }
  const options = descriptor.qualifier === undefined
    ? args.options
    : { ...args.options, [descriptor.qualifier.option]: descriptor.qualifier.value };
  const result = await (operation as (input: unknown, options?: unknown) => Promise<Record<string, unknown>>)(input, options);
  const serialized = { ...result } as Record<string, unknown>;
  if ("value" in serialized) serialized.value = summarizeArtifacts(serialized.value, args.include_bytes === true);
  return text(serialized, serialized.ok === false);
}

async function invokeHosted(
  descriptor: CatalogOperationDescriptor,
  args: InvokeArguments,
  configuration: Required<Pick<RuntimeConfiguration, "fetch">> & RuntimeConfiguration,
): Promise<ToolResult> {
  if (!configuration.apiBaseUrl || !configuration.apiKey) {
    return configurationError(
      "Hosted execution requires an explicit API base URL and API key.",
      "Set RUNSTAMP_API_BASE_URL to the approved preview endpoint and RUNSTAMP_API_KEY to a Runstamp API key.",
    );
  }
  let base: URL;
  try { base = new URL(configuration.apiBaseUrl); }
  catch { return configurationError("RUNSTAMP_API_BASE_URL is not a valid absolute URL.", "Set it to an https:// preview origin."); }
  if (base.protocol !== "https:" && base.hostname !== "127.0.0.1" && base.hostname !== "localhost") {
    return configurationError("Hosted execution refuses a non-HTTPS remote origin.", "Use an https:// preview origin.");
  }
  const route = httpRoute(descriptor).replace(/^\//, "");
  const response = await configuration.fetch(new URL(route, `${base.toString().replace(/\/$/, "")}/`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
    body: JSON.stringify({ input: args.input, options: args.options }),
  });
  const body = await response.json().catch(() => ({
    ok: false,
    error: { code: "common/HOST_RESPONSE_INVALID", message: `Hosted API returned ${String(response.status)} without JSON.` },
    losses: [], diagnostics: [],
  }));
  return text(body, !response.ok || (body as { ok?: boolean }).ok === false);
}

export function createModularTools(configuration: RuntimeConfiguration = {}): readonly ModularTool[] {
  const fallbackMode = selectedMode(configuration.mode ?? process.env.RUNSTAMP_EXECUTION_MODE, "auto") ?? "auto";
  const resolved: Required<Pick<RuntimeConfiguration, "fetch">> & RuntimeConfiguration = {
    ...configuration,
    apiBaseUrl: configuration.apiBaseUrl ?? process.env.RUNSTAMP_API_BASE_URL,
    apiKey: configuration.apiKey ?? process.env.RUNSTAMP_API_KEY,
    fetch: configuration.fetch ?? globalThis.fetch,
  };
  const importer = configuration.importModule ?? defaultImporter;

  return [
    {
      name: "runstamp_list_operations",
      description: "List the stable Runstamp operation catalog. Filter by domain to keep context small.",
      inputSchema: { type: "object", properties: { domain: { type: "string" } }, additionalProperties: false },
      async execute(raw) {
        const domain = (raw as { domain?: string } | undefined)?.domain;
        const operations = domain === undefined
          ? CATALOG
          : CATALOG.filter((operation) => operation.domain === domain);
        return text({ ok: true, count: operations.length, operations: operations.map(({ name, domain: d, verb, summary, stability }) => ({ name, domain: d, verb, summary, stability })) });
      },
    },
    {
      name: "runstamp_describe_operation",
      description: "Return the exact schemas, errors, losses, and route for one catalog operation.",
      inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } }, additionalProperties: false },
      async execute(raw) {
        const name = (raw as { name?: string } | undefined)?.name;
        const descriptor = name === undefined ? undefined : findOperation(name);
        return descriptor === undefined ? inputError(`Unknown operation ${String(name)}.`) : text({ ok: true, operation: descriptor, httpRoute: httpRoute(descriptor), localEligible: LOCAL_OPERATIONS.has(descriptor.name) });
      },
    },
    {
      name: "runstamp_invoke_operation",
      description: "Invoke one operation locally when an optional engine is installed, or through the configured hosted /v1 API.",
      inputSchema: {
        type: "object", required: ["operation", "input"], additionalProperties: false,
        properties: {
          operation: { type: "string" }, input: {}, options: { type: "object" },
          execution_mode: { enum: ["auto", "local", "hosted"] }, include_bytes: { type: "boolean", default: false },
        },
      },
      async execute(raw) {
        const args = (raw ?? {}) as InvokeArguments;
        const descriptor = args.operation === undefined ? undefined : findOperation(args.operation);
        if (descriptor === undefined) return inputError(`Unknown operation ${String(args.operation)}.`);
        const mode = selectedMode(args.execution_mode, fallbackMode);
        if (mode === undefined) return inputError(`Unknown execution mode ${String(args.execution_mode)}.`);
        // Managed operations are hosted by definition. A local override may
        // never turn a managed descriptor into an engine-domain guess.
        if (!LOCAL_OPERATIONS.has(descriptor.name)) return invokeHosted(descriptor, args, resolved);
        if (mode === "hosted") return invokeHosted(descriptor, args, resolved);
        if (mode === "local") return invokeLocal(descriptor, args, importer);
        const local = await invokeLocal(descriptor, args, importer);
        const payload = JSON.parse(local.content[0]?.text ?? "{}") as { error?: { code?: string } };
        if (payload.error?.code !== "common/CONFIGURATION_REQUIRED") return local;
        return invokeHosted(descriptor, args, resolved);
      },
    },
  ];
}
