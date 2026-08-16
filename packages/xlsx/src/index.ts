export type {
  CellValue,
  SpreadsheetCell,
  SpreadsheetCellComment,
  SpreadsheetCellFormula,
  SpreadsheetCellFormulaInput,
  AccessibilityConfig,
  AccessibilityConfigBase,
  AccessibilityLevel,
  SpreadsheetFreezePane,
  SpreadsheetCellStyleInput,
  SpreadsheetCellStyle,
  SpreadsheetColumn,
  SpreadsheetConditionalFormatting,
  SpreadsheetConditionalFormattingIconSetRule,
  SpreadsheetConditionalFormattingRule,
  SpreadsheetDataValidation,
  SpreadsheetDataValidationErrorStyle,
  SpreadsheetDataValidationOperator,
  SpreadsheetDataValidationType,
  SpreadsheetDefaults,
  SpreadsheetDocument,
  SpreadsheetErrorCode,
  SpreadsheetErrorValue,
  SpreadsheetExternalHyperlink,
  SpreadsheetFillStyle,
  SpreadsheetFontStyle,
  SpreadsheetHyperlink,
  SpreadsheetInternalHyperlink,
  SpreadsheetMeta,
  SpreadsheetNamedRange,
  SpreadsheetPageMargins,
  SpreadsheetPageSetup,
  SpreadsheetPrintOptions,
  SpreadsheetPrintRange,
  SpreadsheetPrintTitles,
  SpreadsheetRichTextRun,
  SpreadsheetRichTextValue,
  SpreadsheetRenderOptions,
  SpreadsheetRow,
  SpreadsheetSheet,
  SpreadsheetSheetStyling,
  SpreadsheetTable,
  SpreadsheetTableColumn,
  SpreadsheetTableStyle,
  SpreadsheetTableTotalsRowFunction,
  SpreadsheetIconSetType,
  SpreadsheetImage,
  SpreadsheetImageAnchor,
  SpreadsheetChart,
  SpreadsheetChartSeries,
  SpreadsheetChartType,
  SpreadsheetPivotCalculatedField,
  SpreadsheetPivotChart,
  SpreadsheetPivotDimension,
  SpreadsheetPivotSubtotal,
  SpreadsheetPivotTable,
  SpreadsheetPivotTableStyle,
  SpreadsheetPivotValueField,
  SpreadsheetSheetProtection,
  ThemeColorScheme,
  ThemeConfig,
  ThemeFontScheme,
} from "./types/spreadsheet-ast.js";

export { FREE_XLSX_CHART_TYPES } from "./types/spreadsheet-ast.js";
export type { FreeXlsxChartType, ProXlsxChartType } from "./types/spreadsheet-ast.js";

export {
  SpreadsheetTemplateAssemblyError,
  SpreadsheetValidationError,
  SpreadsheetTemplateParseError,
} from "./errors.js";
export type {
  SpreadsheetTemplateAssemblyIssue,
  SpreadsheetTemplateAssemblyIssueCode,
  SpreadsheetTemplateParseIssue,
  SpreadsheetTemplateParseIssueCode,
  SpreadsheetValidationIssue,
  SpreadsheetValidationIssueCode,
} from "./errors.js";

export { SpreadsheetEngine } from "./spreadsheet-engine.js";
export type { SpreadsheetEngineCapability } from "./spreadsheet-engine.js";
export { setDeterministicMode, isDeterministicModeEnabled } from "./deterministic-mode.js";
export { lintSpreadsheetDocument } from "./quality/lint.js";
export type {
  SpreadsheetLintIssue,
  SpreadsheetLintIssueCode,
  SpreadsheetLintResult,
} from "./quality/lint.js";
export type {
  FindingCode,
  QualityFinding,
  QualityReport,
  QualityVerdict,
  RenderWithQualityResult,
  RepairEntry,
  RepairRisk,
} from "./public-quality-types.js";
export {
  remediateSpreadsheetAccessibility,
  validateSpreadsheetAccessibility,
} from "./quality/accessibility.js";
export type {
  AccessibilityFix,
  AccessibilityIssue,
  AccessibilityIssueCode,
  AccessibilityReport,
  AccessibilityRemediationResult,
  AccessibilitySeverity,
  AccessibilitySummary,
  SpreadsheetAccessibilityConfig,
  SpreadsheetAccessibilityConfigBase,
} from "./quality/accessibility.js";
export { F as formula } from "./formulas/builder.js";
export { FormulaEvaluator } from "./formulas/evaluator.js";
export { offsetFormulaRows, shiftFormulaRows } from "./formulas/shift.js";
export { preflightSpreadsheet } from "./preflight.js";
export { createRenderPlan } from "./render-plan.js";
export type {
  SpreadsheetRenderKeyPartBytes,
  SpreadsheetPartRenderMetrics,
  SpreadsheetRenderStageMetrics,
  SpreadsheetRenderMetrics,
  SpreadsheetRenderResult,
  SpreadsheetSheetChunkMetrics,
  SpreadsheetSheetRenderMetrics,
} from "./render-metrics.js";
export {
  validateSpreadsheetBuffer,
} from "./quality/workbook-quality.js";
export type {
  SpreadsheetBufferValidateOptions,
  SpreadsheetFinding,
  SpreadsheetFindingCategory,
  SpreadsheetFindingCode,
  SpreadsheetFindingSeverity,
  SpreadsheetRepairAction,
  SpreadsheetRepairOptions,
  SpreadsheetRepairResult,
  SpreadsheetRepairValidationResult,
  SpreadsheetValidationSummary,
  SpreadsheetValidationVerdict,
} from "./quality/workbook-quality.js";
export type {
  SpreadsheetQualityReport,
  SpreadsheetRenderModeRecommendation,
  SpreadsheetStringStrategy,
  SpreadsheetWorkloadEstimate,
} from "./preflight.js";
export type {
  SpreadsheetPartManifestEntry,
  SpreadsheetRenderPlan,
  SpreadsheetRequestedStringStrategy,
  SpreadsheetSheetRenderPlan,
} from "./render-plan.js";
export type {
  SpreadsheetTemplateAssemblyInput,
  SpreadsheetTemplateAssemblyOptions,
  SpreadsheetTemplateRangeInput,
  SpreadsheetTemplateRowExpansionInput,
  SpreadsheetTemplateRowExpansionValue,
  SpreadsheetTemplateSyntax,
  SpreadsheetTemplateValueInput,
} from "./template-assembler.js";
export type {
  SpreadsheetPreservedOpaquePart,
  SpreadsheetTemplateIndex,
  SpreadsheetTemplateInjectionAnchor,
  SpreadsheetTemplateInspectionReport,
  SpreadsheetTemplateNamedRange,
  SpreadsheetTemplateParseOptions,
  SpreadsheetTemplateRelationship,
  SpreadsheetTemplateRowHint,
  SpreadsheetTemplateSanitizationAction,
  SpreadsheetTemplateSanitizationDisposition,
  SpreadsheetTemplateSheet,
  SpreadsheetTemplateStylesInventory,
  SpreadsheetTemplateTable,
} from "./template-parser.js";
export {
  SheetNameSchema,
  SpreadsheetCellSchema,
  SpreadsheetColumnSchema,
  SpreadsheetDefaultsSchema,
  SpreadsheetDocumentSchema,
  SpreadsheetMetaSchema,
  SpreadsheetRowSchema,
  SpreadsheetSheetSchema,
  ThemeConfigSchema,
  validateSpreadsheetDocument,
} from "./validation/spreadsheet-schema.js";
export {
  XLSX_RELAXED_INPUT_COERCIONS,
  preprocessSpreadsheetDocumentInput,
} from "./relaxed-input.js";
export type {
  SpreadsheetInputWarning,
  SpreadsheetRelaxedInputOptions,
} from "./relaxed-input.js";
export { SharedStringTable } from "./serializers/shared-strings.js";
export { StyleRegistry } from "./serializers/style-registry.js";
export { normalizeHyperlink, normalizeHyperlinkLocation } from "./utils/hyperlinks.js";
export {
  colIndexToLetter,
  rowIndexToRowNum,
  cellRef,
  absCellRef,
  parseCellRef,
  parseRangeRef,
  rangeRef,
  absRangeRef,
  formatSheetRef,
  formatSheetRange,
  extractSheetReferences,
} from "./utils/cell-ref.js";
export { PRESETS, PRESET_NAMES } from "./styles/presets.js";
export { validateXlsxStructure } from "./quality/structural-validation.js";
export type { StructuralValidationCheck, StructuralValidationSummary } from "./quality/structural-validation.js";
export { diffSpreadsheetDocuments } from "./diff/document-diff.js";
export type { Change, ChangeSet, DiffOptions } from "./diff/document-diff.js";
export {
  XLSX_STRUCTURED_WORKFLOW_MANIFEST,
  XlsxWorkflowError,
  createXlsxStructuredWorkflowExtension,
  exportXlsxWorkflow,
  importXlsxWorkflow,
  inspectXlsxWorkflow,
  mapXlsxWorkflow,
  readXlsxWorkflow,
  verifyXlsxWorkflow,
  writeXlsxWorkflow,
} from "./structured-workflow.js";
export type {
  XlsxCellWrite,
  XlsxCellWriteValue,
  XlsxLocator,
  XlsxMappedTarget,
  XlsxMappingTarget,
  XlsxVerificationIssue,
  XlsxVerificationResult,
  XlsxWorkflowBudget,
  XlsxWorkflowCell,
  XlsxWorkflowCode,
  XlsxWorkflowComment,
  XlsxWorkflowDiagnostic,
  XlsxWorkflowDocument,
  XlsxWorkflowInspection,
  XlsxWorkflowNamedRange,
  XlsxWorkflowOptions,
  XlsxWorkflowSheet,
  XlsxWorkflowTable,
  XlsxWorkflowValidation,
} from "./structured-workflow.js";
