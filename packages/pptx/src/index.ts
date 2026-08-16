// Public API for @runstamp/core

// ---------------------------------------------------------------------------
// AST types — the primary contract for consumers
// ---------------------------------------------------------------------------
export type {
  Dimension,
  FlexStyle,
  TextStyle,
  TextFitConfig,
  TextFitPolicy,
  TextRunStyle,
  TextRun,
  Paragraph,
  BulletConfig,
  BulletChar,
  BulletAutoNum,
  BulletNone,
  TabStop,
  TextInsets,
  ColorValue,
  ColorModifier,
  GradientFill,
  GradientStop,
  ImageCrop,
  ImageEffects,
  ShapeLocks,
  ShapeType,
  BasicShape,
  ArrowShape,
  ArrowCalloutShape,
  FlowchartShape,
  ActionButtonShape,
  CalloutShape,
  MathShape,
  StarShape,
  BracketBraceShape,
  TabShape,
  ConnectorShape,
  CustomGeometry,
  HyperlinkTarget,
  PlaceholderType,
  PlaceholderRef,
  AnimationIntent,
  AnimationGroup,
  AnimationType,
  AnimationEffect,
  AnimationTrigger,
  AnimationDirection,
  AnimationEasing,
  AnimationBuild,
  AnimationBuildGrouping,
  MotionPathType,
  MotionPath,
  SlideBackground,
  HeaderFooter,
  ThemeConfig,
  ThemeColorScheme,
  SlideMasterConfig,
  SlideLayoutConfig,
  DocumentProtection,
  CustomShow,
  SlideSection,
  PrintSettings,
  PaperView,
  PaperText,
  PaperImage,
  TableCell,
  TableRow,
  TableData,
  TableStyle,
  TableCellStyle,
  TableRowLayoutPolicy,
  PaperTable,
  ChartType,
  BarGrouping,
  LineGrouping,
  ChartSeries,
  ChartAxisConfig,
  ChartDataLabels,
  ChartData,
  PaperChart,
  PaperGroup,
  PaperConnector,
  PaperVideo,
  PaperAudio,
  PaperNode,
  PaperSlide,
  PaperDocument,
  AccessibilityConfig,
  AccessibilityLevel,
  Fill,
  SlideSize,
  SlideComment,
  FontEmbedConfig,
  CustomProperty,
  ArrowHeadConfig,
  ConnectorShapeRef,
  ImageFormat,
  ImageRenderOptions,
  SlideImage,
  SvgRenderOptions,
  SlideSvg,
} from "./types/ast.js";

export { traverseAST } from "./types/ast.js";

// ---------------------------------------------------------------------------
// Engine — the primary entry point
// ---------------------------------------------------------------------------
export { PaperEngine, createEngine } from "./engine.js";
export type { CreateEngineOptions, EnginePdfRenderOptions, EngineRenderOptions, LockedBrandPalette, PptxTemplateDocumentInput } from "./engine.js";
export { enforceLockedBrandPalette } from "./locked-tokens.js";
export type { EngineMode } from "./engineMode.js";
export { isLiteBundle, isFreeMode, isLiteMode, getEngineMode } from "./engineMode.js";
export type {
  EngineQualityOptions,
  DesktopValidationBackend,
  DesktopValidationCheck,
  DesktopValidationPlatform,
  DesktopValidationStatus,
  DesktopValidationSummary,
  QualityReport,
  RepairAction,
  RepairSummary,
  RepairState,
  SlideQualityReport,
  StructuralValidationCheck,
  StructuralValidationSummary,
  TemplatePreflightReport,
  PptxOutputMode,
  PptxRepairMode,
  PptxValidationMode,
  QualityFinding,
  QualityFindingCode,
  QualityDocumentVerdict,
  QualityRepairRisk,
} from "./quality/report.js";
export {
  assertQualityContract,
  buildQualityReport,
  compatibilityModeToFallbackLevel,
  getDefaultMaxFallbackLevel,
  mergeDesktopValidationIntoQualityReport,
} from "./quality/report.js";
export { validatePptxStructure } from "./quality/structuralValidation.js";
export { repairPptxStructure, validateAndRepairPptx } from "./quality/repair.js";
export type { PackageDiffIssue, PackageDiffReport } from "./quality/packageDiff.js";
export { diffNormalizedPackages } from "./quality/packageDiff.js";
export type { Change, ChangeSet, DiffOptions } from "./quality/document-diff.js";
export { diffDocuments } from "./quality/document-diff.js";
export type {
  DesktopValidationArtifactPaths,
  DesktopValidationExportRecord,
  DesktopValidationRecord,
  DesktopValidationSavedCopyRecord,
  DesktopValidationWorkerStatus,
} from "./quality/desktopValidationRecord.js";
export {
  computeDesktopValidationContentHash,
  desktopValidationRecordToSummary,
} from "./quality/desktopValidationRecord.js";
export type {
  PptxEditableComponentKind,
  PptxEditableComponentProbe,
  PptxEditabilityProbeReport,
  PptxSlideEditabilityProbe,
  QualityReportWithEditabilityProbe,
} from "./quality/editabilityProbe.js";
export {
  inspectPptxEditability,
  mergeEditabilityProbeIntoQualityReport,
} from "./quality/editabilityProbe.js";
export type {
  AccessibilityReport,
  AccessibilityViolation,
  AccessibilityViolationCode,
} from "./quality/accessibilityValidator.js";
export type { AccessibilityRemediationResult } from "./quality/accessibilityRemediation.js";
export type {
  ChartEditabilitySupport,
  ChartFamily,
  ChartInventory,
  ChartInventoryItem,
} from "./quality/chartInventory.js";
export { inspectChartInventory } from "./quality/chartInventory.js";
export type {
  CompatibilityIssue,
  CompatibilityIssueClass,
  PptxFallbackLevel,
} from "./compatibility/shared.js";
export type {
  CorpusAnonymizeResult,
  CorpusBinaryAsset,
  FailureFamily,
} from "./quality/corpus.js";
export { anonymizeCorpusDocument, anonymizeCorpusValue, classifyFailureFamilies } from "./quality/corpus.js";

// ---------------------------------------------------------------------------
// Error types — structured errors for programmatic handling
// ---------------------------------------------------------------------------
export { PaperError, RunstampFeatureError, PaperJSXFeatureError } from "./errors.js";
export type { PaperErrorCode, ErrorPhase } from "./errors.js";

// ---------------------------------------------------------------------------
// License validation — for consumers who need direct key validation
// ---------------------------------------------------------------------------
export { validateLicenseKey } from "./license.js";
export type { LicensePayload, LicenseValidationResult } from "./license.js";

// ---------------------------------------------------------------------------
// Feature gating
// ---------------------------------------------------------------------------
export {
  IS_PRO,
  FREE_CHART_TYPES,
  FREE_SHAPE_COUNT,
  FREE_XLSX_CHART_TYPES,
  PPTX_PRO_FEATURES,
  DOCX_PRO_FEATURES,
  XLSX_PRO_FEATURES,
  PDF_PRO_FEATURES,
  isFeatureAvailable,
  LITE_IMAGE_MAX_WIDTH,
  FREE_IMAGE_MAX_WIDTH,
  PRO_IMAGE_MAX_WIDTH,
} from "./feature-gate.js";

/** @deprecated Use FREE_CHART_TYPES instead. */
export { FREE_CHART_TYPES as LITE_CHART_TYPES } from "./feature-gate.js";
/** @deprecated Use FREE_SHAPE_COUNT instead. */
export { FREE_SHAPE_COUNT as LITE_SHAPE_COUNT } from "./feature-gate.js";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
export {
  PaperNodeSchema,
  PaperSlideSchema,
  PaperDocumentSchema,
} from "./validator/schema.js";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export type { LayoutMetrics, LayoutNode } from "./layout/extract.js";
export { runLayout } from "./layout/index.js";
export type {
  AbsoluteLayoutDebugIssue,
  AbsoluteLayoutDebugNode,
  AbsoluteLayoutIssue,
  AbsoluteLayoutIssueCode,
  AbsoluteSlideLayoutDebug,
  AbsoluteTextFitDiagnostics,
} from "./layout/absoluteSafety.js";
export {
  collectAbsoluteDocumentLayoutDebug,
  collectAbsoluteSlideLayoutDebug,
  validateAbsoluteDocumentLayout,
  validateAbsoluteSlideLayout,
} from "./layout/absoluteSafety.js";
export type { ChartDiagnosticBox, ChartFitDiagnostics } from "./layout/chartDiagnostics.js";
export { collectChartFitDiagnostics } from "./layout/chartDiagnostics.js";
export type { ImageFitDiagnostics } from "./layout/imageDiagnostics.js";
export { collectImageFitDiagnostics } from "./layout/imageDiagnostics.js";

// ---------------------------------------------------------------------------
// Typography (public utilities for advanced consumers)
// ---------------------------------------------------------------------------
export { loadFont, getFont, getFontOrNull, clearFontCache, fontCacheSize, FontCacheManager } from "./typography/fontCache.js";
export { clearHbFontCache, hbFontCacheSize, destroyHarfBuzz, HarfBuzzManager } from "./typography/harfbuzzLoader.js";
export { autoLoadDocumentFonts } from "./typography/autoFont.js";
export type { AutoLoadDocumentFontsOptions } from "./typography/autoFont.js";
export { calculateTextMetrics } from "./typography/metrics.js";
export type { TextMetrics } from "./typography/metrics.js";
export { computeAutoFit } from "./typography/autoFit.js";
export type { AutoFitResult } from "./typography/autoFit.js";
export { calculateRichTextMetrics } from "./typography/richMetrics.js";
export type { RichTextMetrics } from "./typography/richMetrics.js";

// ---------------------------------------------------------------------------
// Template pipeline
// ---------------------------------------------------------------------------
export { parseTemplate } from "./template/parser.js";
export type { TemplateIndex, LayoutInfo, PlaceholderInfo, SlideMasterInfo } from "./template/parser.js";
export { isSchemeColor, resolveColor, parseThemeXml } from "./template/themeResolver.js";
export type { ThemeData } from "./template/themeResolver.js";
export { assembleFromTemplate } from "./template/mutator.js";
export {
  createPptxTemplateRoundTripExtension,
  exportPptxTemplate,
  importPptxTemplate,
  inspectPptxTemplate,
  mutatePptxTemplate,
  PptxTemplateRoundTripError,
  verifyPptxTemplate,
} from "./template/roundTrip.js";
export type {
  PptxOpaquePart,
  PptxTemplateBudgets,
  PptxTemplateCounts,
  PptxTemplateDocument,
  PptxTemplateExport,
  PptxTemplateInspection,
  PptxTemplateLocator,
  PptxTemplateLoss,
  PptxTemplateLossCode,
  PptxTemplateMutation,
  PptxTemplateObject,
  PptxTemplateRelationship,
  PptxTemplateSlide,
  PptxTemplateSlot,
  PptxTemplateVerification,
  PptxTemplateVerificationIssue,
} from "./template/roundTrip.js";

// ---------------------------------------------------------------------------
// OOXML internals (advanced — subject to change)
// ---------------------------------------------------------------------------
export { PptxArchive } from "./ooxml/zipper.js";
export type { AssemblePresentationOptions } from "./ooxml/zipper.js";
export { serializeSlideTree } from "./ooxml/drawing/orchestrator.js";
export { PIXEL_TO_EMU } from "./ooxml/drawing/math.js";
export type { HyperlinkRel } from "./ooxml/drawing/textUtils.js";
export type { MediaAsset, SlideMediaManifest } from "./ooxml/media.js";
export { collectImageNodes, processSlideMedia } from "./ooxml/media.js";
export { collectChartNodes, processSlideCharts } from "./ooxml/chart/index.js";
export type { ChartAsset, SlideChartManifest } from "./ooxml/chart/index.js";
export type { WebVideoInfo } from "./ooxml/webVideoDetect.js";
export { isWebVideoUrl, parseWebVideoUrl } from "./ooxml/webVideoDetect.js";

// ---------------------------------------------------------------------------
// Semantic Interpreter (AI-to-AST bridge)
// ---------------------------------------------------------------------------
export {
  AgentDocumentSchema,
  AgentSlideSchema,
  KpiSchema,
  DataSeriesSchema,
  ComparisonSchema,
  SlidePatternEnum,
  AgentThemePresetSchema,
  DesignTokensSchema,
  DEFAULT_AGENT_DESIGN_TOKENS,
  getAgentThemePresetTokens,
  resolveAgentDesignTokens,
  PPTX_RELAXED_INPUT_COERCIONS,
  preprocessAgentDocumentInput,
  looksLikeAgentDocumentInput,
  compileAgentDocument,
  compileAgentDocumentWithFonts,
  compileAgentSlide,
  validateAgentDocumentLayout,
  applyElasticPagination,
  buildTitleLayout,
  buildStatementLayout,
  buildDashboardLayout,
  buildComparisonLayout,
  buildChartFocusLayout,
  buildBulletsLayout,
  agentChartToChartData,
} from "./interpreter/index.js";

export type {
  AgentDocument,
  AgentSlide,
  AgentFontStrategy,
  AgentScale,
  AgentDensity,
  AgentShape,
  AgentLayoutValidationMode,
  AgentLayoutWarning,
  AgentLayoutWarningCode,
  Kpi,
  DataSeries,
  Comparison,
  SlidePattern,
  AgentThemePreset,
  AgentDesignTokens,
  ResolvedAgentDesignTokens,
  CompileAgentDocumentOptions,
  PptxInputWarning,
  PptxRelaxedInputCoercion,
  SlideSplitOptions,
} from "./interpreter/index.js";

// ---------------------------------------------------------------------------
// Diagrams — SmartArt-like diagram generators
// ---------------------------------------------------------------------------
export { generateDiagram } from "./diagrams/index.js";
export type { DiagramConfig, DiagramItem, DiagramStyle } from "./types/ast.js";

// ---------------------------------------------------------------------------
// High-level entrypoint
// ---------------------------------------------------------------------------
// `@runstamp/react`'s server surface has imported `render` from this package's
// root since it was written, and the root never exported it — so the react
// package has not compiled, which in turn fails the app's `prepare:workspace-deps`
// and every `pnpm typecheck` that depends on it. The function exists and is
// tested; only the re-export was missing.
export { render } from "./lite-render.js";
export type { LiteRenderDocument } from "./lite-render.js";

// ---------------------------------------------------------------------------
// Canvas Renderer (optional — requires @napi-rs/canvas peer dep)
// ---------------------------------------------------------------------------
export { renderSlideToBuffer, renderAllSlidesToBuffers } from "./renderer/index.js";
export type { RenderOptions } from "./renderer/index.js";

// Knuth-Plass segment threshold
export { setKnuthPlassSegmentThreshold, getKnuthPlassSegmentThreshold, KnuthPlassConfig } from "./typography/knuthPlass.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export { setDeterministicMode, isDeterministicMode, DeterministicModeManager } from "./deterministicMode.js";
export { setLogger, getLogger, LoggerManager } from "./logger.js";
export type { Logger, SchemaValidationError } from "./logger.js";

// ---------------------------------------------------------------------------
// Per-request isolation (RenderContext + AsyncLocalStorage)
// ---------------------------------------------------------------------------
export { RenderContext, withContext } from "./renderContext.js";
export type { RenderContextOptions } from "./renderContext.js";

// ---------------------------------------------------------------------------
// Protocol presentation compiler (slideType-based input → renderable AST)
// Re-exported so consumers of @runstamp/pptx{,-pro} can reach the
// new protocol compiler without depending on the private @runstamp/protocol
// package directly. The MCP server uses this same path internally.
// ---------------------------------------------------------------------------
export {
  DeclarativeChartSchema,
  DeclarativeChartSeriesSchema,
  DeclarativeDocumentSchema,
  DeclarativeLayoutSchema,
  DeclarativeMetricSchema,
  DeclarativeSlideSchema,
  DeclarativeValidationError,
  PresentationSpecSchema,
  toPresentationSpec,
} from "@runstamp/protocol";
export { compilePresentationSpec, preflightPresentationSpec } from "./protocol/compiler.js";
export type { PreflightResult } from "./protocol/compiler.js";
export { compileDeclarativeDocument, validate } from "./protocol/declarative.js";
export type {
  DeclarativeChart,
  DeclarativeChartSeries,
  DeclarativeDocument,
  DeclarativeLayout,
  DeclarativeMetric,
  DeclarativeSlide,
  PresentationSpec,
  ValidationIssue,
  ValidationResult,
} from "@runstamp/protocol";
export {
  MIN_REGION_STATIC,
  MIN_REGION_VARIABLE,
  minRegionFor,
  remediationFor,
  presets,
} from "@runstamp/protocol";
export type {
  RegionSize,
  CoverInput,
  ExecutiveSummaryInput,
  DecisionAskInput,
  MarketSizeInput,
  CompetitiveLandscapeInput,
  UnitEconomicsInput,
  AccountTargetsInput,
  GtmComparisonInput,
  RoadmapInput,
} from "@runstamp/protocol";
