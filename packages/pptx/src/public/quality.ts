export type * from "../quality/report.js";
export {
  assertQualityContract,
  buildQualityReport,
  compatibilityModeToFallbackLevel,
  getDefaultMaxFallbackLevel,
  mergeDesktopValidationIntoQualityReport,
} from "../quality/report.js";

export { validatePptxStructure } from "../quality/structuralValidation.js";
export { repairPptxStructure, validateAndRepairPptx } from "../quality/repair.js";

export type * from "../quality/packageDiff.js";
export { diffNormalizedPackages } from "../quality/packageDiff.js";
export type * from "../quality/document-diff.js";
export { diffDocuments } from "../quality/document-diff.js";

export type * from "../quality/desktopValidationRecord.js";
export {
  computeDesktopValidationContentHash,
  desktopValidationRecordToSummary,
} from "../quality/desktopValidationRecord.js";

export type * from "../quality/editabilityProbe.js";
export {
  inspectPptxEditability,
  mergeEditabilityProbeIntoQualityReport,
} from "../quality/editabilityProbe.js";

export type * from "../quality/chartInventory.js";
export { inspectChartInventory } from "../quality/chartInventory.js";

export type * from "../compatibility/shared.js";
