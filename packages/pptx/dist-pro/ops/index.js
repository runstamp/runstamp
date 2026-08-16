import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  classifyWarning
} from "../chunk-LNYSZAHA.js";
import "../chunk-MOLI65TP.js";
import "../chunk-3MAFQYVW.js";
import "../chunk-OV2ZPS4E.js";
import "../chunk-56BKZXEH.js";
import "../chunk-VETY33ST.js";
import {
  PaperEngine
} from "../chunk-DRWOFXA4.js";
import "../chunk-JHKUGPWV.js";
import "../chunk-EE5SX3QK.js";
import "../chunk-GRNMJIZR.js";
import "../chunk-ADNRG6JQ.js";
import "../chunk-QZ7YLVPL.js";
import "../chunk-EEQDAC67.js";
import "../chunk-7XPPO7MM.js";
import "../chunk-5CDPNZPI.js";
import "../chunk-FUBHCOLD.js";
import "../chunk-PQOYJWL5.js";
import {
  repairPptxStructure,
  validatePptxStructure
} from "../chunk-5JIO2X5F.js";
import "../chunk-BKM7I4JR.js";
import "../chunk-FL4YUJCS.js";
import "../chunk-6QXZRXYS.js";
import "../chunk-66EJ4WIS.js";
import "../chunk-SHJL7Z52.js";
import "../chunk-ZLZIUC4K.js";
import "../chunk-BF4WWWMZ.js";
import "../chunk-MA6IZLCE.js";
import "../chunk-SV4OEGHV.js";
import "../chunk-QSVRDIHM.js";
import "../chunk-PUKAI6X5.js";
import "../chunk-625BFJJW.js";
import "../chunk-2W7D7VOC.js";
import "../chunk-YWT5KXVL.js";
import "../chunk-4IGUCOJJ.js";
import "../chunk-DYXX63XE.js";
import "../chunk-P5JGOT4P.js";
import "../chunk-3O47XGMU.js";
import "../chunk-HZBNNQK3.js";
import {
  MEDIA_TYPES,
  createArtifactBytes,
  hashBytes,
  hashValue,
  requireBytes,
  runOperation
} from "../chunk-S4LZHR2L.js";
import "../chunk-JXY3OJQ6.js";
import "../chunk-OWC7QHPZ.js";

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
