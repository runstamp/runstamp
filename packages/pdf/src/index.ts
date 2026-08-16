export {
  PDFArray,
  PDFDictionary,
  PDFName,
  PDFNumber,
  PDFRaw,
  PDFRef,
  PDFStream,
  PDFString,
  serializePdfObject,
} from "./pdf-objects.js";

export { writePdfDocument } from "./pdf-writer.js";
export { PdfEngine } from "./engine.js";
export {
  PdfEvidenceError,
  createPdfEvidenceExtension,
  exportPdfEvidence,
  extractPdfEvidence,
  findPdfEvidence,
  inspectPdfEvidence,
  previewPdfRedactions,
  redactPdfEvidence,
  renderPdfEvidence,
  routePdfOcr,
  verifyPdfRedaction,
} from "./evidence-processing.js";
export type {
  PdfEvidenceBudget,
  PdfEvidenceExport,
  PdfEvidenceExtensionDefinition,
  PdfEvidenceExtraction,
  PdfEvidenceInspection,
  PdfEvidenceLocator,
  PdfEvidenceLoss,
  PdfEvidenceMatch,
  PdfEvidencePage,
  PdfEvidenceRedaction,
  PdfEvidenceTextRun,
  PdfEvidenceVerification,
  PdfOcrAdapter,
  PdfOcrAdapterContext,
  PdfOcrAdapterResult,
  PdfOcrRoute,
} from "./evidence-processing.js";
export { validatePdfDocument } from "./engine.js";
import { validatePdfDocumentSafe as _validatePdfDocumentSafe } from "./validate-document.js";
export type {
  PdfValidationIssue,
  PdfValidationIssueCode,
  PdfValidationResult,
} from "./validate-document.js";
export { parseColor, tryParseColor, PdfColorParseError } from "./parse-color.js";
export type { PdfColorInput } from "./parse-color.js";
export { renderPdfPages } from "./pdf-renderer.js";
export type { PdfTextEncodingWarning } from "./pdf-renderer.js";
export { SRGB_ICC_PROFILE } from "./pdfa/srgb-icc-profile.js";
export { analyzePdfCapabilities, planPdfCapabilities } from "./capability-planner.js";
export {
  PDF_RELAXED_INPUT_COERCIONS,
  preprocessPdfDocumentInput,
} from "./relaxed-input.js";
export {
  PdfBinarySourceSchema,
  PdfDocumentSchema,
  PdfEmbeddedFontInputSchema,
  PdfRawDocumentSchema,
  PdfStructuredDocumentSchema,
} from "./schema.js";

export { hasPdfProLicense } from "./pro-guard.js";

export { linearizePdfBuffer } from "./phase9-stream.js";

export { extractPdfSignatures } from "./phase10-validate.js";

export { buildPdfQualityReport } from "./phase10-quality.js";
export { buildSharedPdfQualityReport } from "./shared-quality.js";

export type {
  PdfExistingFormFieldType,
  PdfFillExistingFormOptions,
  PdfFillExistingFormResult,
  PdfFormFieldInfo,
  PdfFormFillWarning,
  PdfFormInspection,
  PdfFormValue,
} from "./pdf-form-fill.js";
export type {
  FindingCode,
  QualityFinding,
  QualityReport,
  QualityVerdict,
  RenderWithQualityResult,
  RepairEntry,
  RepairRisk,
} from "./public-quality-types.js";
export { repairPdfBuffer } from "./phase10-repair.js";

export { validateAndRepairPdfBuffer } from "./phase10-repair.js";

export { validatePdfBuffer } from "./phase10-validate.js";

export function validatePdfDocumentSafe(
  ...args: Parameters<typeof _validatePdfDocumentSafe>
) {
  return _validatePdfDocumentSafe(...args);
}
export { PdfError, isPdfError } from "./errors.js";
export type { PdfErrorCode, PdfErrorDetails } from "./errors.js";
export { setDeterministicMode, isDeterministicModeEnabled } from "./deterministic-mode.js";
export type { PdfAssetPolicy, PdfRenderTrace, PdfVersion } from "./phase9-types.js";
export type {
  PdfCapabilities,
  PdfCapabilityPlan,
  PdfSelectedPhase,
} from "./capability-planner.js";
export type { PdfEmbeddedFontInput, PdfFontInput } from "./font-embedding.js";
export type { PdfInputWarning, PdfRelaxedInputOptions } from "./relaxed-input.js";

export type {
  PDFDictionaryEntries,
  PDFIndirectObject,
  PDFValue,
} from "./pdf-objects.js";

export type {
  PdfDocument,
  PdfRenderOptions,
} from "./engine.js";

export type {
  PdfCertificateSource,
  PdfComplianceLevel,
  PdfExtractedSignature,
  PdfFindingCategory,
  PdfFindingCode,
  PdfFindingSeverity,
  PdfP12CertificateSource,
  PdfPemCertificateSource,
  PdfQualityFinding,
  PdfQualityReport,
  PdfQualityVerdict,
  PdfRepairAction,
  PdfRepairOptions,
  PdfRepairResult,
  PdfRepairValidationResult,
  PdfSignOptions,
  PdfTimestampAuthorityOptions,
  PdfValidationCheck,
  PdfValidationSummary,
  PdfValidationVerdict,
} from "./phase10-types.js";

export type { PdfDocumentLayoutNode } from "./phase3-types.js";

export type {
  PdfPhase5TableCell as PdfTableCell,
  PdfPhase5TableRow as PdfTableRow,
} from "./phase5-types.js";

export type {
  PdfBinarySource,
  PdfColor,
  PdfFill,
  PdfGradientStop,
  PdfGraphic,
  PdfImageGraphic,
  PdfLineGraphic,
  PdfLinearGradientFill,
  PdfPathGraphic,
  PdfRadialGradientFill,
  PdfRectGraphic,
  PdfSolidFill,
  PdfStrokeStyle,
  PdfSvgGraphic,
} from "./phase4-types.js";

export type {
  PdfAccessibilityStructureSpec,
  PdfDocumentAccessibilitySpec,
  PdfDocumentInteractiveSpec,
  PdfExternalLinkAnnotationSpec,
  PdfInternalLinkAnnotationSpec,
  PdfMarkedContentSpec,
  PdfPageAnnotationSpec,
  PdfPageExtraCommand,
  PdfRenderedPage,
  PdfRenderMeta,
  PdfRenderableGraphic,
  PdfRenderableText,
  PdfSignatureWidgetSpec,
  PdfTextAnnotationSpec,
  PdfTransformMatrix,
} from "./pdf-renderer.js";

export type {
  PdfDynamicFooterOptions,
  PdfDynamicHeaderFooterConfiguredContent,
  PdfDynamicHeaderFooterContent,
  PdfDynamicHeaderFooterOptions,
  PdfDynamicHeaderFooterZones,
  PdfDynamicHeaderOptions,
} from "./phase6-types.js";

export type { PdfaConformanceLevel } from "./phase8-types.js";

export type {
  PdfEncryptionAlgorithm,
  PdfEncryptionConfig,
  PdfPermissionFlags,
} from "./encryption/types.js";
