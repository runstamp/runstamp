#!/usr/bin/env node

// src/index.ts
import { pathToFileURL } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";

// src/modular/runtime.ts
import {
  CATALOG,
  findOperation,
  httpRoute
} from "@runstamp/catalog";
import { isPaperError } from "@runstamp/contract";

// src/modular/wire.ts
import { PaperError } from "@runstamp/contract";
var BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
function branches(schema) {
  const union = schema.anyOf ?? schema.oneOf;
  return Array.isArray(union) ? union : [];
}
function decode(schema, value, path) {
  if (schema === void 0 || value === null || value === void 0 || value instanceof Uint8Array) return value;
  if (typeof value === "string") {
    if (schema.contentEncoding !== "base64" && !branches(schema).some((branch) => branch.contentEncoding === "base64")) return value;
    const compact = value.replace(/\s+/g, "");
    if (compact.length % 4 !== 0 || !BASE64.test(compact)) {
      throw new PaperError({
        code: "common/SCHEMA_REJECTED",
        phase: "validation",
        message: `${path} must be valid RFC 4648 base64.`,
        remediation: "Encode file bytes as standard padded base64."
      });
    }
    return new Uint8Array(Buffer.from(compact, "base64"));
  }
  if (Array.isArray(value)) {
    const items = schema.items;
    return items === void 0 ? value : value.map((entry, index) => decode(items, entry, `${path}[${String(index)}]`));
  }
  if (typeof value === "object") {
    const properties = schema.properties;
    if (properties === void 0) return value;
    const decoded = { ...value };
    for (const [key, child] of Object.entries(properties)) if (key in decoded) decoded[key] = decode(child, decoded[key], `${path}.${key}`);
    return decoded;
  }
  return value;
}
function decodeWireInput(descriptor, value) {
  return decode(descriptor.inputSchema, value, "input");
}
function summarizeArtifacts(value, includeBytes) {
  if (value instanceof Uint8Array) return includeBytes ? Buffer.from(value).toString("base64") : { byteLength: value.byteLength };
  if (Array.isArray(value)) return value.map((entry) => summarizeArtifacts(entry, includeBytes));
  if (typeof value !== "object" || value === null) return value;
  const record = value;
  if (record.bytes instanceof Uint8Array) {
    const summary = { mediaType: record.mediaType, extension: record.extension, byteLength: record.byteLength, hash: record.hash };
    return includeBytes ? { ...summary, bytes: Buffer.from(record.bytes).toString("base64") } : summary;
  }
  return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, summarizeArtifacts(child, includeBytes)]));
}

// src/modular/runtime.ts
var LOCAL_MODULES = Object.freeze({
  docx: "@runstamp/docx/ops",
  pdf: "@runstamp/pdf/ops",
  pptx: "@runstamp/pptx/ops",
  xlsx: "@runstamp/xlsx/ops"
});
var LOCAL_OPERATIONS = /* @__PURE__ */ new Set([
  "docx.convert.pdf",
  "docx.diff",
  "docx.inspect.controlled",
  "docx.inspect.find",
  "docx.inspect.redaction-preview",
  "docx.parse",
  "docx.redact",
  "docx.render",
  "docx.transform.html",
  "docx.validate",
  "pdf.convert",
  "pdf.extract.signatures",
  "pdf.inspect.evidence",
  "pdf.inspect.find",
  "pdf.inspect.redaction-preview",
  "pdf.redact",
  "pdf.render",
  "pdf.repair",
  "pdf.transform",
  "pdf.validate",
  "pptx.convert.pdf",
  "pptx.render",
  "pptx.repair",
  "pptx.validate",
  "xlsx.convert",
  "xlsx.inspect",
  "xlsx.parse",
  "xlsx.render",
  "xlsx.repair",
  "xlsx.transform",
  "xlsx.validate"
]);
function text(value, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...isError ? { isError: true } : {} };
}
function configurationError(message, remediation) {
  return text({
    ok: false,
    error: { code: "common/CONFIGURATION_REQUIRED", phase: "configuration", message, remediation },
    losses: [],
    diagnostics: []
  }, true);
}
function inputError(message) {
  return text({
    ok: false,
    error: {
      code: "common/SCHEMA_REJECTED",
      phase: "validation",
      message,
      remediation: "Call runstamp_list_operations, then runstamp_describe_operation with an exact operation name."
    },
    losses: [],
    diagnostics: []
  }, true);
}
function defaultImporter(specifier) {
  switch (specifier) {
    case "@runstamp/docx/ops":
      return import("@runstamp/docx/ops");
    case "@runstamp/pdf/ops":
      return import("@runstamp/pdf/ops");
    case "@runstamp/pptx/ops":
      return import("@runstamp/pptx/ops");
    case "@runstamp/xlsx/ops":
      return import("@runstamp/xlsx/ops");
    default:
      return Promise.reject(new Error(`Unsupported local module ${specifier}.`));
  }
}
function selectedMode(value, fallback) {
  const mode = value ?? fallback;
  return mode === "auto" || mode === "local" || mode === "hosted" ? mode : void 0;
}
async function invokeLocal(descriptor, args, importer) {
  const specifier = LOCAL_MODULES[descriptor.domain];
  if (specifier === void 0 || !LOCAL_OPERATIONS.has(descriptor.name)) {
    return configurationError(
      `${descriptor.name} is a managed operation and has no local implementation.`,
      "Configure RUNSTAMP_API_BASE_URL and RUNSTAMP_API_KEY, then use hosted or auto mode."
    );
  }
  let module;
  try {
    module = await importer(specifier);
  } catch {
    return configurationError(
      `The optional peer ${specifier.replace("/ops", "")} is not installed.`,
      `Install ${specifier.replace("/ops", "")} or configure hosted execution.`
    );
  }
  const operation = module[descriptor.verb];
  if (typeof operation !== "function") {
    return configurationError(
      `${specifier} does not export ${descriptor.verb}.`,
      "Install a compatible 1.x engine release or use hosted execution."
    );
  }
  let input;
  try {
    input = decodeWireInput(descriptor, args.input);
  } catch (error) {
    if (!isPaperError(error)) throw error;
    return text({ ok: false, error: error.toJSON(), losses: [], diagnostics: [] }, true);
  }
  const options = descriptor.qualifier === void 0 ? args.options : { ...args.options, [descriptor.qualifier.option]: descriptor.qualifier.value };
  const result = await operation(input, options);
  const serialized = { ...result };
  if ("value" in serialized) serialized.value = summarizeArtifacts(serialized.value, args.include_bytes === true);
  return text(serialized, serialized.ok === false);
}
async function invokeHosted(descriptor, args, configuration) {
  if (!configuration.apiBaseUrl || !configuration.apiKey) {
    return configurationError(
      "Hosted execution requires an explicit API base URL and API key.",
      "Set RUNSTAMP_API_BASE_URL to the approved preview endpoint and RUNSTAMP_API_KEY to a Runstamp API key."
    );
  }
  let base;
  try {
    base = new URL(configuration.apiBaseUrl);
  } catch {
    return configurationError("RUNSTAMP_API_BASE_URL is not a valid absolute URL.", "Set it to an https:// preview origin.");
  }
  if (base.protocol !== "https:" && base.hostname !== "127.0.0.1" && base.hostname !== "localhost") {
    return configurationError("Hosted execution refuses a non-HTTPS remote origin.", "Use an https:// preview origin.");
  }
  const route = httpRoute(descriptor).replace(/^\//, "");
  const response = await configuration.fetch(new URL(route, `${base.toString().replace(/\/$/, "")}/`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
    body: JSON.stringify({ input: args.input, options: args.options })
  });
  const body = await response.json().catch(() => ({
    ok: false,
    error: { code: "common/HOST_RESPONSE_INVALID", message: `Hosted API returned ${String(response.status)} without JSON.` },
    losses: [],
    diagnostics: []
  }));
  return text(body, !response.ok || body.ok === false);
}
function createModularTools(configuration = {}) {
  const fallbackMode = selectedMode(configuration.mode ?? process.env.RUNSTAMP_EXECUTION_MODE, "auto") ?? "auto";
  const resolved = {
    ...configuration,
    apiBaseUrl: configuration.apiBaseUrl ?? process.env.RUNSTAMP_API_BASE_URL,
    apiKey: configuration.apiKey ?? process.env.RUNSTAMP_API_KEY,
    fetch: configuration.fetch ?? globalThis.fetch
  };
  const importer = configuration.importModule ?? defaultImporter;
  return [
    {
      name: "runstamp_list_operations",
      description: "List the stable Runstamp operation catalog. Filter by domain to keep context small.",
      inputSchema: { type: "object", properties: { domain: { type: "string" } }, additionalProperties: false },
      async execute(raw) {
        const domain = raw?.domain;
        const operations = domain === void 0 ? CATALOG : CATALOG.filter((operation) => operation.domain === domain);
        return text({ ok: true, count: operations.length, operations: operations.map(({ name, domain: d, verb, summary, stability }) => ({ name, domain: d, verb, summary, stability })) });
      }
    },
    {
      name: "runstamp_describe_operation",
      description: "Return the exact schemas, errors, losses, and route for one catalog operation.",
      inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } }, additionalProperties: false },
      async execute(raw) {
        const name = raw?.name;
        const descriptor = name === void 0 ? void 0 : findOperation(name);
        return descriptor === void 0 ? inputError(`Unknown operation ${String(name)}.`) : text({ ok: true, operation: descriptor, httpRoute: httpRoute(descriptor), localEligible: LOCAL_OPERATIONS.has(descriptor.name) });
      }
    },
    {
      name: "runstamp_invoke_operation",
      description: "Invoke one operation locally when an optional engine is installed, or through the configured hosted /v1 API.",
      inputSchema: {
        type: "object",
        required: ["operation", "input"],
        additionalProperties: false,
        properties: {
          operation: { type: "string" },
          input: {},
          options: { type: "object" },
          execution_mode: { enum: ["auto", "local", "hosted"] },
          include_bytes: { type: "boolean", default: false }
        }
      },
      async execute(raw) {
        const args = raw ?? {};
        const descriptor = args.operation === void 0 ? void 0 : findOperation(args.operation);
        if (descriptor === void 0) return inputError(`Unknown operation ${String(args.operation)}.`);
        const mode = selectedMode(args.execution_mode, fallbackMode);
        if (mode === void 0) return inputError(`Unknown execution mode ${String(args.execution_mode)}.`);
        if (!LOCAL_OPERATIONS.has(descriptor.name)) return invokeHosted(descriptor, args, resolved);
        if (mode === "hosted") return invokeHosted(descriptor, args, resolved);
        if (mode === "local") return invokeLocal(descriptor, args, importer);
        const local = await invokeLocal(descriptor, args, importer);
        const payload = JSON.parse(local.content[0]?.text ?? "{}");
        if (payload.error?.code !== "common/CONFIGURATION_REQUIRED") return local;
        return invokeHosted(descriptor, args, resolved);
      }
    }
  ];
}

// src/index.ts
function createServer() {
  const tools = createModularTools();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const server = new Server(
    { name: "runstamp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (tool === void 0) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    const result = await tool.execute(request.params.arguments);
    return {
      content: result.content.map((item) => ({ type: "text", text: item.text })),
      ...result.isError === true ? { isError: true } : {}
    };
  });
  return server;
}
async function main() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error("[Runstamp MCP] Server started (v1.0.0; auto execution mode)");
}
if (process.argv[1] !== void 0 && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[Runstamp MCP] Fatal error:", error);
    process.exitCode = 1;
  });
}
export {
  createModularTools,
  createServer
};
//# sourceMappingURL=index.js.map