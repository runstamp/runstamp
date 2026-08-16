import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
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
} from "./chunk-BBZLJBOA.js";
import {
  assembleFromTemplate
} from "./chunk-R2RGXBYY.js";
import {
  PptxArchive,
  collectChartNodes,
  collectImageNodes,
  isWebVideoUrl,
  parseWebVideoUrl,
  processSlideCharts,
  processSlideMedia,
  serializeSlideTree
} from "./chunk-H3JJGCUR.js";
import "./chunk-2SWG4VB5.js";
import "./chunk-MP76HATA.js";
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
} from "./chunk-M3B54ZA7.js";
import {
  isSchemeColor,
  parseTemplate,
  parseThemeXml,
  resolveColor
} from "./chunk-X4XRBAXF.js";
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
} from "./chunk-Z2EIZERW.js";
import "./chunk-JRK4KXDV.js";
import "./chunk-XVSKCRKS.js";
import {
  PIXEL_TO_EMU
} from "./chunk-M2YFSO2D.js";
import {
  applyElasticPagination
} from "./chunk-47T2WMZG.js";
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
} from "./chunk-GWTKZPGY.js";
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
} from "./chunk-AIRKBIKH.js";
import {
  autoLoadDocumentFonts
} from "./chunk-MVPJ57UB.js";
import {
  computeDesktopValidationContentHash,
  desktopValidationRecordToSummary,
  diffDocuments,
  diffNormalizedPackages,
  inspectChartInventory,
  inspectPptxEditability,
  mergeEditabilityProbeIntoQualityReport
} from "./chunk-BM2OZOTI.js";
import {
  assertQualityContract,
  buildQualityReport,
  compatibilityModeToFallbackLevel,
  getDefaultMaxFallbackLevel,
  mergeDesktopValidationIntoQualityReport,
  repairPptxStructure,
  validateAndRepairPptx,
  validatePptxStructure
} from "./chunk-NK2A5B54.js";
import "./chunk-E7KL3QDK.js";
import "./chunk-5GZJ6PGT.js";
import {
  PaperDocumentSchema,
  PaperNodeSchema,
  PaperSlideSchema
} from "./chunk-7V4ECWKA.js";
import "./chunk-TM4NN2PA.js";
import "./chunk-3VBGXE67.js";
import {
  renderAllSlidesToBuffers,
  renderSlideToBuffer
} from "./chunk-T7AK3EDB.js";
import "./chunk-XZ4AHITT.js";
import "./chunk-VCCW5PWJ.js";
import "./chunk-IC35FUMW.js";
import "./chunk-ERFVAWW7.js";
import {
  DeterministicModeManager,
  isDeterministicMode,
  setDeterministicMode
} from "./chunk-RQNEGT4U.js";
import {
  calculateRichTextMetrics
} from "./chunk-7BYJLCSM.js";
import "./chunk-BVMCDLHW.js";
import "./chunk-WVTVGR3K.js";
import {
  runLayout
} from "./chunk-5QLWVG23.js";
import {
  KnuthPlassConfig,
  getEngineMode,
  getKnuthPlassSegmentThreshold,
  isFreeMode,
  isLiteBundle,
  isLiteMode,
  setKnuthPlassSegmentThreshold
} from "./chunk-DX2BYFTQ.js";
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
} from "./chunk-IQGCGBYO.js";
import "./chunk-XU7YQ73E.js";
import {
  LoggerManager,
  getLogger,
  setLogger
} from "./chunk-MV7M6AY2.js";
import "./chunk-JXF5SD3S.js";
import {
  PaperError,
  PaperJSXFeatureError,
  RunstampFeatureError
} from "./chunk-SFVKAOLH.js";
import "./chunk-VIXD5LXH.js";
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
