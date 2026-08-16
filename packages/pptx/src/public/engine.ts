export type * from "../types/ast.js";
export { traverseAST } from "../types/ast.js";

export { PaperEngine } from "../engine.js";
export type {
  EnginePdfRenderOptions,
  EngineRenderOptions,
  PptxTemplateDocumentInput,
  SvgRenderOptions,
  SlideSvg,
} from "../engine.js";

export { PaperError } from "../errors.js";
export type { PaperErrorCode, ErrorPhase } from "../errors.js";
export { computeAutoFit } from "../typography/autoFit.js";
export type { AutoFitResult } from "../typography/autoFit.js";
export { calculateRichTextMetrics } from "../typography/richMetrics.js";
export type { RichTextMetrics } from "../typography/richMetrics.js";
export {
  validateAbsoluteDocumentLayout,
  validateAbsoluteSlideLayout,
} from "../layout/absoluteSafety.js";
export type {
  AbsoluteLayoutIssue,
  AbsoluteLayoutIssueCode,
} from "../layout/absoluteSafety.js";

export type { AccessibilityRemediationResult } from "../quality/accessibilityRemediation.js";

export { parseTemplate } from "../template/parser.js";
export type * from "../template/parser.js";

export { isSchemeColor, resolveColor, parseThemeXml } from "../template/themeResolver.js";
export type * from "../template/themeResolver.js";
