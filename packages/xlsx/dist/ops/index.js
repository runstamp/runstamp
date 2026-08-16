import {
  XLSX_WORKFLOW,
  classifyWarning
} from "../chunk-XZXZHIBP.js";
import "../chunk-2CSFJDLR.js";
import {
  SpreadsheetEngine,
  lintSpreadsheetDocument,
  repairSpreadsheetBuffer,
  validateSpreadsheetBuffer
} from "../chunk-GCRW3VCZ.js";
import {
  MEDIA_TYPES,
  SpreadsheetDocumentSchema,
  createArtifactBytes,
  hashBytes,
  hashValue,
  requireBytes,
  runOperation
} from "../chunk-YMTIFCEA.js";

// src/ops/index.ts
var DOMAIN = "xlsx";
var ENGINE = { name: "@runstamp/xlsx", version: "1.0.0" };
var ERROR_CONTEXT = { model: "xlsx", domain: DOMAIN };
function toBuffer(bytes) {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}
function lazyBuffer(input) {
  let cached;
  return () => cached ??= toBuffer(requireBytes(input));
}
async function render(input, options) {
  let cached;
  const inputHash = () => cached ??= hashValue(input);
  return runOperation({
    operation: "xlsx.render",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async (context) => {
      const artifact = inputHash();
      const buffer = await SpreadsheetEngine.render(input, {
        ...options?.render,
        deterministic: context.deterministic,
        // R16: the engine detects every input coercion here and would otherwise
        // report it to nobody.
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.render?.onInputWarning?.(warning);
        }
      });
      const value = createArtifactBytes(buffer, MEDIA_TYPES.xlsx, "xlsx");
      return { value, outputHash: value.hash };
    }
  });
}
async function validate(input, options) {
  const isBytes = input instanceof Uint8Array || Buffer.isBuffer(input);
  const buffer = isBytes ? toBuffer(input) : void 0;
  return runOperation({
    operation: "xlsx.validate",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => buffer === void 0 ? hashValue(input) : hashBytes(buffer),
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async () => {
      if (buffer !== void 0) {
        const summary2 = await validateSpreadsheetBuffer(buffer);
        const findings2 = Array.isArray(summary2.findings) ? summary2.findings.length : 0;
        return { value: { valid: findings2 === 0, summary: summary2 } };
      }
      const parsed = SpreadsheetDocumentSchema.safeParse(input);
      if (!parsed.success) {
        return {
          value: {
            valid: false,
            summary: {
              findings: parsed.error.issues.map((issue) => ({
                code: "XLSX_SCHEMA_INVALID",
                message: issue.message,
                path: issue.path
              }))
            }
          }
        };
      }
      const summary = lintSpreadsheetDocument(parsed.data);
      const findings = Array.isArray(summary.findings) ? summary.findings.length : 0;
      return { value: { valid: findings === 0, summary } };
    }
  });
}
async function repair(input, options) {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "xlsx.repair",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async (context) => {
      const artifact = hashBytes(buffer());
      const result = await repairSpreadsheetBuffer(buffer());
      for (const action of result.actions ?? []) {
        const { loss, diagnostic } = classifyWarning(
          {
            code: action.code ?? "XLSX_UNKNOWN_REPAIR",
            message: action.description ?? `Repair applied: ${action.code ?? "unknown"}`,
            ...action.path !== void 0 ? { path: action.path } : {}
          },
          artifact
        );
        if (loss) context.addLoss(loss);
        if (diagnostic) context.addDiagnostic(diagnostic);
      }
      const value = createArtifactBytes(result.buffer ?? buffer(), MEDIA_TYPES.xlsx, "xlsx");
      return { value, outputHash: value.hash };
    }
  });
}
async function inspect(input, options) {
  let cached;
  const inputHash = () => cached ??= hashValue(input);
  return runOperation({
    operation: "xlsx.inspect",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async () => ({ value: SpreadsheetEngine.plan(input) })
  });
}
var parse = XLSX_WORKFLOW.ops.parse;
var transform = XLSX_WORKFLOW.ops.transform;
var convert = XLSX_WORKFLOW.ops.convert;
export {
  convert,
  inspect,
  parse,
  render,
  repair,
  transform,
  validate
};
//# sourceMappingURL=index.js.map
