import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  classifyWarning
} from "../chunk-HW526CCL.js";
import "../chunk-BBZLJBOA.js";
import "../chunk-R2RGXBYY.js";
import "../chunk-H3JJGCUR.js";
import "../chunk-2SWG4VB5.js";
import "../chunk-MP76HATA.js";
import {
  PaperEngine
} from "../chunk-M3B54ZA7.js";
import "../chunk-X4XRBAXF.js";
import "../chunk-Z2EIZERW.js";
import "../chunk-JRK4KXDV.js";
import "../chunk-XVSKCRKS.js";
import "../chunk-M2YFSO2D.js";
import "../chunk-47T2WMZG.js";
import "../chunk-GWTKZPGY.js";
import "../chunk-AIRKBIKH.js";
import "../chunk-MVPJ57UB.js";
import "../chunk-BM2OZOTI.js";
import {
  repairPptxStructure,
  validatePptxStructure
} from "../chunk-NK2A5B54.js";
import "../chunk-E7KL3QDK.js";
import "../chunk-5GZJ6PGT.js";
import "../chunk-7V4ECWKA.js";
import "../chunk-TM4NN2PA.js";
import "../chunk-3VBGXE67.js";
import "../chunk-T7AK3EDB.js";
import "../chunk-XZ4AHITT.js";
import "../chunk-VCCW5PWJ.js";
import "../chunk-IC35FUMW.js";
import "../chunk-ERFVAWW7.js";
import "../chunk-RQNEGT4U.js";
import "../chunk-7BYJLCSM.js";
import "../chunk-BVMCDLHW.js";
import "../chunk-WVTVGR3K.js";
import "../chunk-5QLWVG23.js";
import "../chunk-DX2BYFTQ.js";
import "../chunk-IQGCGBYO.js";
import "../chunk-XU7YQ73E.js";
import "../chunk-MV7M6AY2.js";
import {
  MEDIA_TYPES,
  createArtifactBytes,
  hashBytes,
  hashValue,
  requireBytes,
  runOperation
} from "../chunk-JXF5SD3S.js";
import "../chunk-SFVKAOLH.js";
import "../chunk-VIXD5LXH.js";

// src/ops/index.ts
var DOMAIN = "pptx";
var ENGINE = { name: "@runstamp/pptx", version: "1.0.0" };
var ERROR_CONTEXT = { model: "core", domain: DOMAIN };
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
    operation: "pptx.render",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async (context) => {
      const artifact = inputHash();
      const buffer = await PaperEngine.render(input, {
        ...options?.render,
        deterministic: context.deterministic,
        // R16: the engine knows which properties the writer will drop and would
        // otherwise report it only to a logger.
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.render?.onInputWarning?.(warning);
        }
      });
      const value = createArtifactBytes(buffer, MEDIA_TYPES.pptx, "pptx");
      return { value, outputHash: value.hash };
    }
  });
}
async function validate(input, options) {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "pptx.validate",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async () => {
      const summary = await validatePptxStructure(buffer());
      const issueCount = Array.isArray(summary.issues) ? summary.issues.length : 0;
      return { value: { valid: summary.ok ?? issueCount === 0, summary } };
    }
  });
}
async function repair(input, options) {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "pptx.repair",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async (context) => {
      const artifact = hashBytes(buffer());
      const result = await repairPptxStructure(buffer());
      for (const action of result.actions ?? []) {
        const { loss, diagnostic } = classifyWarning(
          {
            code: action.code ?? "PPTX_UNKNOWN_REPAIR",
            message: action.description ?? `Repair applied: ${action.code ?? "unknown"}`,
            ...action.path !== void 0 ? { path: action.path } : {}
          },
          artifact
        );
        if (loss) context.addLoss(loss);
        if (diagnostic) context.addDiagnostic(diagnostic);
      }
      const value = createArtifactBytes(result.buffer ?? buffer(), MEDIA_TYPES.pptx, "pptx");
      return { value, outputHash: value.hash };
    }
  });
}
async function convert(input, options) {
  let cached;
  const inputHash = () => cached ??= hashValue(input);
  const target = options?.to ?? "pdf";
  return runOperation({
    operation: "pptx.convert.pdf",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...options !== void 0 ? { options } : {},
    execute: async (context) => {
      if (target !== "pdf") {
        throw Object.assign(new Error(`Unsupported conversion target "${String(target)}".`), {
          code: "UNSUPPORTED_FEATURE"
        });
      }
      const artifact = inputHash();
      const buffer = await PaperEngine.renderToPdf(input, {
        ...options?.pdf,
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.pdf?.onInputWarning?.(warning);
        }
      });
      const value = createArtifactBytes(buffer, MEDIA_TYPES.pdf, "pdf");
      return { value, outputHash: value.hash };
    }
  });
}
export {
  convert,
  render,
  repair,
  validate
};
//# sourceMappingURL=index.js.map
