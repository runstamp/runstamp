import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  DeclarativeChartSchema,
  DeclarativeChartSeriesSchema,
  DeclarativeDocumentSchema,
  DeclarativeLayoutSchema,
  DeclarativeMetricSchema,
  DeclarativeSlideSchema,
  DeclarativeValidationError,
  MIN_REGION_STATIC,
  MIN_REGION_VARIABLE,
  PptxTemplateRoundTripError,
  PresentationSpecSchema,
  anonymizeCorpusDocument,
  anonymizeCorpusValue,
  calculateTextMetrics,
  classifyFailureFamilies,
  compileDeclarativeDocument,
  compilePresentationSpec,
  createPptxTemplateRoundTripExtension,
  exportPptxTemplate,
  generateDiagram,
  importPptxTemplate,
  inspectPptxTemplate,
  minRegionFor,
  mutatePptxTemplate,
  preflightPresentationSpec,
  presets,
  remediationFor,
  render,
  toPresentationSpec,
  validate,
  validateLicenseKey,
  verifyPptxTemplate
} from "./chunk-MOLI65TP.js";
import {
  assembleFromTemplate
} from "./chunk-3MAFQYVW.js";
import {
  PptxArchive,
  collectChartNodes,
  collectImageNodes,
  isWebVideoUrl,
  parseWebVideoUrl,
  processSlideCharts,
  processSlideMedia,
  serializeSlideTree
} from "./chunk-OV2ZPS4E.js";
import "./chunk-56BKZXEH.js";
import "./chunk-VETY33ST.js";
import {
  PaperEngine,
  RenderContext,
  collectAbsoluteDocumentLayoutDebug,
  collectAbsoluteSlideLayoutDebug,
  collectChartFitDiagnostics,
  collectImageFitDiagnostics,
  createEngine,
  enforceLockedBrandPalette,
  traverseAST,
  validateAbsoluteDocumentLayout,
  validateAbsoluteSlideLayout,
  withContext
} from "./chunk-DRWOFXA4.js";
import {
  isSchemeColor,
  parseTemplate,
  parseThemeXml,
  resolveColor
} from "./chunk-JHKUGPWV.js";
import {
  DOCX_PRO_FEATURES,
  FREE_CHART_TYPES,
  FREE_IMAGE_MAX_WIDTH,
  FREE_SHAPE_COUNT,
  FREE_XLSX_CHART_TYPES,
  IS_PRO,
  LITE_IMAGE_MAX_WIDTH,
  PDF_PRO_FEATURES,
  PPTX_PRO_FEATURES,
  PRO_IMAGE_MAX_WIDTH,
  XLSX_PRO_FEATURES,
  isFeatureAvailable
} from "./chunk-EE5SX3QK.js";
import "./chunk-GRNMJIZR.js";
import "./chunk-ADNRG6JQ.js";
import {
  PIXEL_TO_EMU
} from "./chunk-QZ7YLVPL.js";
import {
  applyElasticPagination
} from "./chunk-EEQDAC67.js";
import {
  AgentDocumentSchema,
  AgentSlideSchema,
  ComparisonSchema,
  DataSeriesSchema,
  KpiSchema,
  PPTX_RELAXED_INPUT_COERCIONS,
  SlidePatternEnum,
  compileAgentDocument,
  compileAgentDocumentWithFonts,
  compileAgentSlide,
  looksLikeAgentDocumentInput,
  preprocessAgentDocumentInput,
  validateAgentDocumentLayout
} from "./chunk-7XPPO7MM.js";
import {
  AgentThemePresetSchema,
  DEFAULT_AGENT_DESIGN_TOKENS,
  DesignTokensSchema,
  agentChartToChartData,
  buildBulletsLayout,
  buildChartFocusLayout,
  buildComparisonLayout,
  buildDashboardLayout,
  buildStatementLayout,
  buildTitleLayout,
  computeAutoFit,
  getAgentThemePresetTokens,
  resolveAgentDesignTokens
} from "./chunk-5CDPNZPI.js";
import {
  autoLoadDocumentFonts
} from "./chunk-FUBHCOLD.js";
import {
  computeDesktopValidationContentHash,
  desktopValidationRecordToSummary,
  diffDocuments,
  diffNormalizedPackages,
  inspectChartInventory,
  inspectPptxEditability,
  mergeEditabilityProbeIntoQualityReport
} from "./chunk-PQOYJWL5.js";
import {
  assertQualityContract,
  buildQualityReport,
  compatibilityModeToFallbackLevel,
  getDefaultMaxFallbackLevel,
  mergeDesktopValidationIntoQualityReport,
  repairPptxStructure,
  validateAndRepairPptx,
  validatePptxStructure
} from "./chunk-5JIO2X5F.js";
import "./chunk-BKM7I4JR.js";
import "./chunk-FL4YUJCS.js";
import {
  PaperDocumentSchema,
  PaperNodeSchema,
  PaperSlideSchema
} from "./chunk-6QXZRXYS.js";
import "./chunk-66EJ4WIS.js";
import "./chunk-SHJL7Z52.js";
import {
  renderAllSlidesToBuffers,
  renderSlideToBuffer
} from "./chunk-ZLZIUC4K.js";
import "./chunk-BF4WWWMZ.js";
import "./chunk-MA6IZLCE.js";
import "./chunk-SV4OEGHV.js";
import "./chunk-QSVRDIHM.js";
import {
  DeterministicModeManager,
  isDeterministicMode,
  setDeterministicMode
} from "./chunk-PUKAI6X5.js";
import {
  calculateRichTextMetrics
} from "./chunk-625BFJJW.js";
import "./chunk-2W7D7VOC.js";
import "./chunk-YWT5KXVL.js";
import {
  runLayout
} from "./chunk-4IGUCOJJ.js";
import {
  KnuthPlassConfig,
  getEngineMode,
  getKnuthPlassSegmentThreshold,
  isFreeMode,
  isLiteBundle,
  isLiteMode,
  setKnuthPlassSegmentThreshold
} from "./chunk-DYXX63XE.js";
import {
  FontCacheManager,
  HarfBuzzManager,
  clearFontCache,
  clearHbFontCache,
  destroyHarfBuzz,
  fontCacheSize,
  getFont,
  getFontOrNull,
  hbFontCacheSize,
  loadFont
} from "./chunk-P5JGOT4P.js";
import "./chunk-3O47XGMU.js";
import {
  LoggerManager,
  getLogger,
  setLogger
} from "./chunk-HZBNNQK3.js";
import "./chunk-S4LZHR2L.js";
import {
  PaperError,
  PaperJSXFeatureError,
  RunstampFeatureError
} from "./chunk-JXY3OJQ6.js";
import "./chunk-OWC7QHPZ.js";
export {
  AgentDocumentSchema,
  AgentSlideSchema,
  AgentThemePresetSchema,
  ComparisonSchema,
  DEFAULT_AGENT_DESIGN_TOKENS,
  DOCX_PRO_FEATURES,
  DataSeriesSchema,
  DeclarativeChartSchema,
  DeclarativeChartSeriesSchema,
  DeclarativeDocumentSchema,
  DeclarativeLayoutSchema,
  DeclarativeMetricSchema,
  DeclarativeSlideSchema,
  DeclarativeValidationError,
  DesignTokensSchema,
  DeterministicModeManager,
  FREE_CHART_TYPES,
  FREE_IMAGE_MAX_WIDTH,
  FREE_SHAPE_COUNT,
  FREE_XLSX_CHART_TYPES,
  FontCacheManager,
  HarfBuzzManager,
  IS_PRO,
  KnuthPlassConfig,
  KpiSchema,
  FREE_CHART_TYPES as LITE_CHART_TYPES,
  LITE_IMAGE_MAX_WIDTH,
  FREE_SHAPE_COUNT as LITE_SHAPE_COUNT,
  LoggerManager,
  MIN_REGION_STATIC,
  MIN_REGION_VARIABLE,
  PDF_PRO_FEATURES,
  PIXEL_TO_EMU,
  PPTX_PRO_FEATURES,
  PPTX_RELAXED_INPUT_COERCIONS,
  PRO_IMAGE_MAX_WIDTH,
  PaperDocumentSchema,
  PaperEngine,
  PaperError,
  PaperJSXFeatureError,
  PaperNodeSchema,
  PaperSlideSchema,
  PptxArchive,
  PptxTemplateRoundTripError,
  PresentationSpecSchema,
  RenderContext,
  RunstampFeatureError,
  SlidePatternEnum,
  XLSX_PRO_FEATURES,
  agentChartToChartData,
  anonymizeCorpusDocument,
  anonymizeCorpusValue,
  applyElasticPagination,
  assembleFromTemplate,
  assertQualityContract,
  autoLoadDocumentFonts,
  buildBulletsLayout,
  buildChartFocusLayout,
  buildComparisonLayout,
  buildDashboardLayout,
  buildQualityReport,
  buildStatementLayout,
  buildTitleLayout,
  calculateRichTextMetrics,
  calculateTextMetrics,
  classifyFailureFamilies,
  clearFontCache,
  clearHbFontCache,
  collectAbsoluteDocumentLayoutDebug,
  collectAbsoluteSlideLayoutDebug,
  collectChartFitDiagnostics,
  collectChartNodes,
  collectImageFitDiagnostics,
  collectImageNodes,
  compatibilityModeToFallbackLevel,
  compileAgentDocument,
  compileAgentDocumentWithFonts,
  compileAgentSlide,
  compileDeclarativeDocument,
  compilePresentationSpec,
  computeAutoFit,
  computeDesktopValidationContentHash,
  createEngine,
  createPptxTemplateRoundTripExtension,
  desktopValidationRecordToSummary,
  destroyHarfBuzz,
  diffDocuments,
  diffNormalizedPackages,
  enforceLockedBrandPalette,
  exportPptxTemplate,
  fontCacheSize,
  generateDiagram,
  getAgentThemePresetTokens,
  getDefaultMaxFallbackLevel,
  getEngineMode,
  getFont,
  getFontOrNull,
  getKnuthPlassSegmentThreshold,
  getLogger,
  hbFontCacheSize,
  importPptxTemplate,
  inspectChartInventory,
  inspectPptxEditability,
  inspectPptxTemplate,
  isDeterministicMode,
  isFeatureAvailable,
  isFreeMode,
  isLiteBundle,
  isLiteMode,
  isSchemeColor,
  isWebVideoUrl,
  loadFont,
  looksLikeAgentDocumentInput,
  mergeDesktopValidationIntoQualityReport,
  mergeEditabilityProbeIntoQualityReport,
  minRegionFor,
  mutatePptxTemplate,
  parseTemplate,
  parseThemeXml,
  parseWebVideoUrl,
  preflightPresentationSpec,
  preprocessAgentDocumentInput,
  presets,
  processSlideCharts,
  processSlideMedia,
  remediationFor,
  render,
  renderAllSlidesToBuffers,
  renderSlideToBuffer,
  repairPptxStructure,
  resolveAgentDesignTokens,
  resolveColor,
  runLayout,
  serializeSlideTree,
  setDeterministicMode,
  setKnuthPlassSegmentThreshold,
  setLogger,
  toPresentationSpec,
  traverseAST,
  validate,
  validateAbsoluteDocumentLayout,
  validateAbsoluteSlideLayout,
  validateAgentDocumentLayout,
  validateAndRepairPptx,
  validateLicenseKey,
  validatePptxStructure,
  verifyPptxTemplate,
  withContext
};
//# sourceMappingURL=index-lite.js.map
