import type { AutoFitResult } from "../typography/autoFit.js";

export type PptxCompatibilityMode = "native_safe" | "native_anchored" | "visual_fallback";
export type PptxFallbackLevel =
  | "native_editable"
  | "native_anchored"
  | "alternate_content"
  | "visual_fallback";
export type TextCompositionMode = "shape_per_text" | "single_frame_card" | "rendered_visual";
export type InternalAutoFitPolicy =
  | "none"
  | "shrink_text"
  | "grow_shape"
  | "office_default"
  | "engine_conditional";
export type CompatibilityIssueClass =
  | "text_overflow_risk"
  | "font_substitution_risk"
  | "chart_layout_risk"
  | "template_placeholder_risk"
  | "relationship_risk"
  | "animation_risk";

export interface CompatibilityIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  issueClass?: CompatibilityIssueClass;
  fallbackLevel?: PptxFallbackLevel;
  remediation?: string;
}

export interface LayoutCompatibilityMeta {
  mode: PptxCompatibilityMode;
  reason?: string;
  issues?: CompatibilityIssue[];
  fallbackReason?: string;
  chartUtilization?: {
    widthRatio: number;
    heightRatio: number;
  };
  textCompositionMode?: TextCompositionMode;
  autoFitPolicy?: InternalAutoFitPolicy;
}

export interface LayoutRuntimeProps {
  _autoFitResult?: AutoFitResult;
  _insideVisualView?: boolean;
  _omitTransform?: boolean;
  _singleLineShrinkWrappedWidth?: number;
  _compatibility?: LayoutCompatibilityMeta;
}

type VisualNode = {
  type: string;
  style?: {
    backgroundColor?: unknown;
    fill?: unknown;
    effects?: unknown;
    borderWidth?: number;
  };
  shapeType?: unknown;
  customGeometry?: unknown;
  textContent?: unknown;
  textParagraphs?: unknown[];
  hyperlink?: unknown;
  altText?: unknown;
  decorative?: boolean;
  locks?: unknown;
};

export function hasVisualProperties(node: VisualNode): boolean {
  const style = node.style;
  if (style?.backgroundColor || style?.fill || style?.effects) return true;
  if (style?.borderWidth && style.borderWidth > 0) return true;

  if (node.type === "View") {
    if (node.shapeType || node.customGeometry || node.hyperlink || node.altText || node.decorative || node.locks) {
      return true;
    }
    if (node.textContent !== undefined || (node.textParagraphs && node.textParagraphs.length > 0)) {
      return true;
    }
  }

  return node.type === "Slide" && !!node.decorative;
}
