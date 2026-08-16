// src/interpreter/index.ts — Barrel exports for the Semantic Interpreter module

// Schemas
export {
  KpiSchema,
  DataSeriesSchema,
  ComparisonSchema,
  SlidePatternEnum,
  AgentSlideSchema,
  AgentDocumentSchema,
} from "./agentSchema.js";
export {
  AgentThemePresetSchema,
  DesignTokensSchema,
  DEFAULT_AGENT_DESIGN_TOKENS,
  getAgentThemePresetTokens,
  resolveAgentDesignTokens,
} from "./design-tokens.js";

// Inferred types
export type {
  Kpi,
  DataSeries,
  Comparison,
  SlidePattern,
  AgentSlide,
  AgentDocument,
} from "./agentSchema.js";
export type {
  AgentFontStrategy,
  AgentScale,
  AgentDensity,
  AgentShape,
  AgentThemePreset,
  AgentDesignTokens,
  ResolvedAgentDesignTokens,
} from "./design-tokens.js";

// Template factories
export {
  buildTitleLayout,
  buildStatementLayout,
  buildDashboardLayout,
  buildComparisonLayout,
  buildChartFocusLayout,
  buildBulletsLayout,
  agentChartToChartData,
} from "./templates.js";

// Interpreter
export {
  compileAgentDocument,
  compileAgentDocumentWithFonts,
  compileAgentSlide,
} from "./interpreter.js";
export { validateAgentDocumentLayout } from "./layout-validator.js";
export {
  assertAgentCompilationSemantics,
  assertAgentRecipeLayoutUtilization,
} from "./agent-quality-gates.js";
export {
  PPTX_RELAXED_INPUT_COERCIONS,
  looksLikeAgentDocumentInput,
  preprocessAgentDocumentInput,
} from "./relaxed-input.js";
export type {
  CompileAgentDocumentOptions,
  PptxInputWarning,
  RelaxedInputCoercion as PptxRelaxedInputCoercion,
} from "./relaxed-input.js";
export type {
  AgentLayoutValidationMode,
  AgentLayoutWarning,
  AgentLayoutWarningCode,
} from "./layout-validator.js";

// Slide splitter
export { applyElasticPagination } from "./slideSplitter.js";
export type { SlideSplitOptions } from "./slideSplitter.js";
