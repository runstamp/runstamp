import type {
  CompatibilityIssue,
  PptxCompatibilityMode,
  PptxFallbackLevel,
} from "../compatibility/shared.js";
import type {
  DocumentCompatibilityReport,
  SlideCompatibilityReport,
} from "../compatibility/pptxCompatibility.js";
import type { FindingCode, RepairEntry } from "./public-quality-types.js";
import { PaperError } from "../errors.js";

export type PptxOutputMode = "strict_editable" | "editable_preferred" | "visual_safe";
export type PptxValidationMode = "none" | "structural" | "desktop_async" | "desktop_blocking";
export type PptxRepairMode = "none" | "structural";
export type QualityDocumentVerdict =
  | "native_editable"
  | "editable_with_constraints"
  | "visual_fallback"
  | "rejected";
export type EditabilityVerdict = "editable" | "editable_with_constraints" | "visual_only";
export type QualityRepairRisk = "low" | "medium" | "high";
export type TemplateSupportLevel = "certified" | "supported" | "unsafe";
export type RepairState = "not_requested" | "not_needed" | "repaired" | "failed";
export type DesktopValidationStatus = "not_run" | "passed" | "failed";
export type DesktopValidationPlatform = "windows" | "macos" | "linux";
export type DesktopValidationBackend =
  | "powerpoint_windows"
  | "powerpoint_macos"
  | "libreoffice"
  | "keynote_macos";
export type QualityFindingCode =
  | "OVERFLOW_BODY_TEXT"
  | "TABLE_TOO_DENSE"
  | "CHART_LABEL_COLLISION"
  | "BRAND_TOKEN_MISSING"
  | "BRAND_FONT_MISMATCH"
  | "BRAND_COLOR_MISMATCH"
  | "ASSET_MISSING"
  | "REQUIRED_LOGO_MISSING"
  | "UNSUPPORTED_LAYOUT_SELECTION"
  | "LAYOUT_SHOULD_SPLIT"
  | "FONT_FALLBACK_USED"
  | "FONT_SYSTEM_OPT_IN"
  | "FONT_EMBEDDING_UNAVAILABLE"
  | "FONT_REQUESTED_FAMILY_NOT_EMBEDDED"
  | "FONT_MISSING_FACE_VARIANT"
  | "FONT_COVERAGE_FALLBACK_USED"
  | "VISUAL_FALLBACK_MISSING"
  | "CHART_FALLBACK_MISSING"
  | "NORMAUTOFIT_MISSING_FONTSCALE"
  | "CHART_FORMAT_CODE_UNESCAPED"
  | "SLIDE_ID_NOT_UNIQUE"
  | "CUSTDATALIST_CONFLICT"
  | "ELEMENT_ORDER_VIOLATION"
  | "CHART_WORKBOOK_MISSING"
  | "RELATIONSHIP_TARGET_MISSING"
  | "RID_NOT_UNIQUE"
  | "CONTENT_TYPE_DUPLICATE"
  | "CONTENT_TYPE_MISSING"
  | "XML_PARSE_FAILURE"
  | "SHAPE_ID_NOT_UNIQUE"
  | "STRUCTURAL_VALIDATION_FAILED"
  | "MASTER_REF_UNRESOLVED"
  | "ELEMENT_POSITION_CASCADE"
  | "DESKTOP_VALIDATION_FAILED";

export interface QualityFinding {
  code: QualityFindingCode;
  sharedCode?: FindingCode;
  severity: "info" | "warning" | "error";
  message: string;
  slideIndex?: number;
  componentPath?: string;
  category: "layout" | "brand" | "asset" | "chart" | "validation" | "typography";
  blocking: boolean;
  machineFixHint?: string;
  recommendedAction?: string;
  autoFixed?: boolean;
  repairDescription?: string;
}

export interface RepairAction {
  id: string;
  description: string;
  file: string;
}

export interface RepairSummary {
  state: RepairState;
  actions: RepairAction[];
  initialFailureCount?: number;
  finalFailureCount?: number;
}

export interface EngineQualityOptions {
  outputMode?: PptxOutputMode;
  validationMode?: PptxValidationMode;
  maxFallbackLevel?: PptxFallbackLevel;
  desktopValidationId?: string;
  repairMode?: PptxRepairMode;
}

export interface SlideFallbackReport {
  level: PptxFallbackLevel;
  reason?: string;
}

export interface SlideQualityReport {
  slideIndex: number;
  compatibilityVerdict: PptxCompatibilityMode;
  issues: CompatibilityIssue[];
  fallbackApplied: SlideFallbackReport | null;
  editabilityVerdict: EditabilityVerdict;
  suggestedFix?: string;
  fonts: string[];
  fontSubstitutions: Record<string, string>;
}

export interface StructuralValidationCheck {
  id: string;
  passed: boolean;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface StructuralValidationSummary {
  status: "not_run" | "pending" | "passed" | "failed";
  checks: StructuralValidationCheck[];
  failureCount: number;
}

export interface DesktopValidationCheck {
  id: string;
  passed: boolean;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface DesktopValidationSummary {
  status: DesktopValidationStatus;
  available: boolean;
  backend?: DesktopValidationBackend;
  platform?: DesktopValidationPlatform;
  checks: DesktopValidationCheck[];
  failureCount: number;
  details?: string[];
  artifactPaths?: {
    pdfPath?: string;
    savedCopyPath?: string;
    screenshotPath?: string;
  };
  recordUrl?: string;
  recordedAt?: string;
}

export interface TemplatePreflightReport {
  templateSupportLevel: TemplateSupportLevel;
  unsafeLayouts: string[];
  placeholderCoverage: number;
  expectedFallbackRisk: QualityRepairRisk;
  missingPlaceholderCount?: number;
}

export interface QualityReport {
  verdict: QualityDocumentVerdict;
  requestedOutputMode: PptxOutputMode;
  validationMode: PptxValidationMode;
  maxFallbackLevel: PptxFallbackLevel;
  documentVerdict: QualityDocumentVerdict;
  repairRisk: QualityRepairRisk;
  editabilityScore: number;
  deckScore: number;
  fallbackCount: number;
  findings: QualityFinding[];
  slideReports: SlideQualityReport[];
  desktopValidationId?: string;
  structuralValidation: StructuralValidationSummary;
  desktopValidation?: DesktopValidationSummary;
  templateReport?: TemplatePreflightReport;
  repairSummary: RepairSummary;
  autoFixesApplied: number;
  repairLog: RepairEntry[];
  contractPassed: boolean;
}

function mapSharedCode(code: QualityFindingCode): FindingCode | undefined {
  switch (code) {
    case "OVERFLOW_BODY_TEXT":
      return "PPTX_OVERFLOW_BODY_TEXT";
    case "TABLE_TOO_DENSE":
      return "PPTX_TABLE_CELL_TEXT_OVERFLOW";
    case "CHART_LABEL_COLLISION":
      return "PPTX_CHART_LABEL_COLLISION";
    case "FONT_FALLBACK_USED":
      return "PPTX_FONT_FALLBACK_USED";
    case "FONT_SYSTEM_OPT_IN":
    case "FONT_EMBEDDING_UNAVAILABLE":
    case "FONT_REQUESTED_FAMILY_NOT_EMBEDDED":
    case "FONT_MISSING_FACE_VARIANT":
    case "FONT_COVERAGE_FALLBACK_USED":
      return undefined;
    case "VISUAL_FALLBACK_MISSING":
      return "PPTX_VISUAL_FALLBACK_MISSING";
    case "CHART_FALLBACK_MISSING":
      return "PPTX_CHART_FALLBACK_MISSING";
    case "NORMAUTOFIT_MISSING_FONTSCALE":
      return "PPTX_NORMAUTOFIT_MISSING_FONTSCALE";
    case "CHART_FORMAT_CODE_UNESCAPED":
      return "PPTX_CHART_FORMAT_CODE_UNESCAPED";
    case "SLIDE_ID_NOT_UNIQUE":
      return "PPTX_SLIDE_ID_NOT_UNIQUE";
    case "CUSTDATALIST_CONFLICT":
      return "PPTX_CUSTDATALIST_CONFLICT";
    case "ELEMENT_ORDER_VIOLATION":
      return "PPTX_ELEMENT_ORDER_VIOLATION";
    case "CHART_WORKBOOK_MISSING":
      return "PPTX_CHART_WORKBOOK_MISSING";
    case "RELATIONSHIP_TARGET_MISSING":
      return "SHARED_RELATIONSHIP_TARGET_MISSING";
    case "RID_NOT_UNIQUE":
      return "SHARED_RID_NOT_UNIQUE";
    case "CONTENT_TYPE_DUPLICATE":
      return "SHARED_CONTENT_TYPE_DUPLICATE";
    case "CONTENT_TYPE_MISSING":
      return "SHARED_CONTENT_TYPE_MISSING";
    case "XML_PARSE_FAILURE":
      return "SHARED_XML_PARSE_FAILURE";
    case "SHAPE_ID_NOT_UNIQUE":
      return "PPTX_SHAPE_ID_NOT_UNIQUE";
    case "STRUCTURAL_VALIDATION_FAILED":
      return "PPTX_STRUCTURAL_VALIDATION_FAILED";
    case "MASTER_REF_UNRESOLVED":
      return "PPTX_MASTER_REF_UNRESOLVED";
    case "ELEMENT_POSITION_CASCADE":
      return "PPTX_ELEMENT_POSITION_CASCADE";
    case "ASSET_MISSING":
      return "SHARED_MEDIA_EMBED_MISSING";
    case "DESKTOP_VALIDATION_FAILED":
      return undefined;
    case "LAYOUT_SHOULD_SPLIT":
      return "PPTX_LAYOUT_SHOULD_SPLIT";
    case "BRAND_TOKEN_MISSING":
    case "BRAND_FONT_MISMATCH":
    case "BRAND_COLOR_MISMATCH":
    case "REQUIRED_LOGO_MISSING":
    case "UNSUPPORTED_LAYOUT_SELECTION":
      return undefined;
  }
}

function structuralCheckToFinding(
  check: StructuralValidationCheck,
): QualityFinding {
  let code: QualityFindingCode;
  let category: QualityFinding["category"] = "validation";

  if (check.id.startsWith("content-types.")) {
    code = "CONTENT_TYPE_DUPLICATE";
  } else if (check.id.startsWith("package.content-type.")) {
    code = "CONTENT_TYPE_MISSING";
  } else if (check.id.startsWith("xml.parse.")) {
    code = "XML_PARSE_FAILURE";
  } else if (/\.rid\./.test(check.id)) {
    code = "RID_NOT_UNIQUE";
  } else if (check.id.endsWith(".target") || /\.ref\./.test(check.id)) {
    code = "RELATIONSHIP_TARGET_MISSING";
  } else if (/^chart\.\d+\.workbook$/.test(check.id)) {
    code = "CHART_WORKBOOK_MISSING";
    category = "chart";
  } else if (/^slide\.\d+\.shape-id\./.test(check.id)) {
    code = "SHAPE_ID_NOT_UNIQUE";
  } else if (check.id.startsWith("presentation.slide-id.")) {
    code = "SLIDE_ID_NOT_UNIQUE";
  } else if (check.id.includes(".custdatalist")) {
    code = "CUSTDATALIST_CONFLICT";
  } else if (check.id.startsWith("presentation.order.")) {
    code = "ELEMENT_ORDER_VIOLATION";
  } else if (check.id.includes(".layout-chain.")) {
    code = "MASTER_REF_UNRESOLVED";
  } else if (check.id.includes(".normautofit.")) {
    code = "NORMAUTOFIT_MISSING_FONTSCALE";
    category = "typography";
  } else if (check.id.includes(".format-code.")) {
    code = "CHART_FORMAT_CODE_UNESCAPED";
    category = "chart";
  } else if (check.id.includes(".manual-layout.")) {
    code = "ELEMENT_POSITION_CASCADE";
    category = "chart";
  } else if (check.id.includes(".table-overflow.")) {
    code = "TABLE_TOO_DENSE";
    category = "layout";
  } else if (
    check.id.startsWith("package.")
    || check.id === "slides.present"
    || /^slide\.\d+\.rels$/.test(check.id)
    || /^slide\.\d+\.content-type$/.test(check.id)
    || /^chart\.\d+\.rels$/.test(check.id)
    || /^chart\.\d+\.content-type$/.test(check.id)
  ) {
    code = "STRUCTURAL_VALIDATION_FAILED";
  } else {
    throw new PaperError(`Unmapped PPTX structural validation check: ${check.id}`, {
      code: "VALIDATION_FAILED",
      phase: "validation",
    });
  }

  const slideIndexMatch = check.id.match(/^slide\.(\d+)\./);
  const slideIndex = slideIndexMatch ? Number(slideIndexMatch[1]) - 1 : undefined;

  return {
    code,
    severity: check.severity,
    message: check.message,
    slideIndex,
    componentPath: slideIndex !== undefined ? makeSlidePath(slideIndex) : undefined,
    category,
    blocking: check.severity === "error",
    machineFixHint: code === "STRUCTURAL_VALIDATION_FAILED"
      ? "Inspect the structural validation report before sending the file downstream."
      : undefined,
    recommendedAction: code === "TABLE_TOO_DENSE"
      ? "Reduce table density or split the table across multiple slides."
      : code === "CHART_FORMAT_CODE_UNESCAPED"
        ? "Escape XML-sensitive characters in chart number formats before release."
        : code === "NORMAUTOFIT_MISSING_FONTSCALE"
          ? "Write an explicit fontScale on normAutofit nodes."
          : code === "RELATIONSHIP_TARGET_MISSING"
            ? "Repair or remove the broken relationship target before release."
            : undefined,
  };
}

function findingCodeFromRepairAction(actionId: string): FindingCode {
  switch (actionId) {
    case "remove_duplicate_content_types":
      return "SHARED_CONTENT_TYPE_DUPLICATE";
    case "remove_orphaned_relationships":
      return "SHARED_RELATIONSHIP_TARGET_MISSING";
    case "reorder_presentation_elements":
      return "PPTX_ELEMENT_ORDER_VIOLATION";
    case "add_normautofit_font_scale":
      return "PPTX_NORMAUTOFIT_MISSING_FONTSCALE";
    case "escape_chart_format_codes":
      return "PPTX_CHART_FORMAT_CODE_UNESCAPED";
    case "dedupe_slide_ids":
      return "PPTX_SLIDE_ID_NOT_UNIQUE";
    case "collapse_custdatalist":
      return "PPTX_CUSTDATALIST_CONFLICT";
    case "fill_missing_font_typefaces":
      return "PPTX_FONT_FALLBACK_USED";
    default:
      throw new PaperError(`Unmapped PPTX repair action: ${actionId}`, {
        code: "VALIDATION_FAILED",
        phase: "validation",
      });
  }
}

type SlideVerdictSource = {
  compatibilityVerdict: PptxCompatibilityMode;
  issues: CompatibilityIssue[];
};

const FALLBACK_RANK: Record<PptxFallbackLevel, number> = {
  native_editable: 0,
  native_anchored: 1,
  alternate_content: 2,
  visual_fallback: 3,
};

export function compatibilityModeToFallbackLevel(
  mode: PptxCompatibilityMode,
): PptxFallbackLevel {
  switch (mode) {
    case "native_safe":
      return "native_editable";
    case "native_anchored":
      return "native_anchored";
    case "visual_fallback":
      return "visual_fallback";
  }
}

export function getDefaultMaxFallbackLevel(
  outputMode: PptxOutputMode = "editable_preferred",
): PptxFallbackLevel {
  switch (outputMode) {
    case "strict_editable":
      return "native_editable";
    case "editable_preferred":
      return "native_anchored";
    case "visual_safe":
      return "visual_fallback";
  }
}

export function resolveQualityOptions(
  options?: EngineQualityOptions,
): Required<EngineQualityOptions> {
  const outputMode = options?.outputMode ?? "editable_preferred";
  return {
    outputMode,
    validationMode: options?.validationMode ?? "none",
    maxFallbackLevel: options?.maxFallbackLevel ?? getDefaultMaxFallbackLevel(outputMode),
    desktopValidationId: options?.desktopValidationId ?? "",
    repairMode: options?.repairMode ?? "none",
  };
}

function createDefaultStructuralValidation(
  _validationMode: PptxValidationMode,
): StructuralValidationSummary {
  return {
    status: "not_run",
    checks: [
      {
        id: "structural.validation",
        passed: false,
        severity: "info",
        message: _validationMode === "structural"
          ? "Structural validation was requested but no rendered PPTX buffer was supplied."
          : "Structural validation was not requested.",
      },
    ],
    failureCount: 0,
  };
}

function fallbackWithinLimit(
  level: PptxFallbackLevel,
  maxFallbackLevel: PptxFallbackLevel,
): boolean {
  return FALLBACK_RANK[level] <= FALLBACK_RANK[maxFallbackLevel];
}

function toEditabilityVerdict(mode: PptxCompatibilityMode): EditabilityVerdict {
  switch (mode) {
    case "native_safe":
      return "editable";
    case "native_anchored":
      return "editable_with_constraints";
    case "visual_fallback":
      return "visual_only";
  }
}

function deriveSuggestedFix(slide: SlideCompatibilityReport): string | undefined {
  const remediation = slide.issues.find(issue => issue.remediation)?.remediation;
  if (remediation) return remediation;
  if (slide.fallbackReason) return slide.fallbackReason;

  switch (slide.compatibilityVerdict) {
    case "native_safe":
      return undefined;
    case "native_anchored":
      return "Keep editable output by simplifying fonts or text groups on this slide.";
    case "visual_fallback":
      return "Switch to visual_safe mode or simplify the slide until it stays inside the native editable contract.";
  }
}

function deriveSlideFallback(
  slide: SlideCompatibilityReport,
): SlideFallbackReport | null {
  const level = compatibilityModeToFallbackLevel(slide.compatibilityVerdict);
  if (level === "native_editable") return null;
  return {
    level,
    reason: slide.fallbackReason ?? slide.issues.find(issue => issue.fallbackLevel === level)?.message,
  };
}

function deriveRepairRisk(
  slides: SlideVerdictSource[],
  structuralValidation: StructuralValidationSummary,
  templateReport?: TemplatePreflightReport,
  desktopValidation?: DesktopValidationSummary,
): QualityRepairRisk {
  if (structuralValidation.status === "failed") return "high";
  if (templateReport?.templateSupportLevel === "unsafe") return "high";
  if (desktopValidation?.status === "failed") return "high";
  if (slides.some(slide => slide.compatibilityVerdict === "visual_fallback")) return "high";
  if (slides.some(slide => slide.issues.some(issue => issue.severity === "error"))) return "high";
  if (slides.some(slide => slide.compatibilityVerdict === "native_anchored")) return "medium";
  if (slides.some(slide => slide.issues.some(issue => issue.severity === "warning"))) return "medium";
  return "low";
}

function deriveEditabilityScore(
  slides: SlideVerdictSource[],
  desktopValidation?: DesktopValidationSummary,
): number {
  let score = 100;
  for (const slide of slides) {
    switch (slide.compatibilityVerdict) {
      case "native_safe":
        break;
      case "native_anchored":
        score -= 12;
        break;
      case "visual_fallback":
        score -= 35;
        break;
    }
  }
  if (desktopValidation?.status === "failed") {
    score = Math.min(score, 20);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveDocumentVerdict(
  slides: SlideVerdictSource[],
  maxFallbackLevel: PptxFallbackLevel,
  structuralValidation: StructuralValidationSummary,
  templateReport?: TemplatePreflightReport,
  desktopValidation?: DesktopValidationSummary,
): QualityDocumentVerdict {
  if (structuralValidation.status === "failed") return "rejected";
  if (templateReport?.templateSupportLevel === "unsafe") return "rejected";
  if (desktopValidation?.status === "failed") return "rejected";
  const hasContractViolation = slides.some(
    slide => !fallbackWithinLimit(
      compatibilityModeToFallbackLevel(slide.compatibilityVerdict),
      maxFallbackLevel,
    ),
  );
  if (hasContractViolation) return "rejected";
  if (slides.some(slide => slide.compatibilityVerdict === "visual_fallback")) return "visual_fallback";
  if (slides.some(slide => slide.compatibilityVerdict === "native_anchored")) {
    return "editable_with_constraints";
  }
  return "native_editable";
}

function pushFinding(list: QualityFinding[], finding: QualityFinding): void {
  if (!list.some((existing) =>
    existing.code === finding.code
    && existing.slideIndex === finding.slideIndex
    && existing.componentPath === finding.componentPath
    && existing.message === finding.message
  )) {
    list.push(finding);
  }
}

function makeSlidePath(slideIndex: number, suffix?: string): string {
  return suffix ? `slides[${slideIndex}].${suffix}` : `slides[${slideIndex}]`;
}

function deriveDeckScore(
  editabilityScore: number,
  repairRisk: QualityRepairRisk,
  fallbackCount: number,
  documentVerdict: QualityDocumentVerdict,
  desktopValidation?: DesktopValidationSummary,
): number {
  let score = editabilityScore;
  if (repairRisk === "medium") score -= 8;
  if (repairRisk === "high") score -= 20;
  score -= fallbackCount * 2;

  if (documentVerdict === "rejected") {
    score = Math.min(score, 35);
  } else if (documentVerdict === "visual_fallback") {
    score = Math.min(score, 60);
  }

  if (desktopValidation?.status === "failed") {
    score = Math.min(score, 20);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveQualityFindings(
  slideReports: SlideQualityReport[],
  structuralValidation: StructuralValidationSummary,
  templateReport?: TemplatePreflightReport,
  desktopValidation?: DesktopValidationSummary,
): QualityFinding[] {
  const findings: QualityFinding[] = [];

  for (const slide of slideReports) {
    for (const issue of slide.issues) {
      const issueMessage = issue.message.toLowerCase();
      if (issue.issueClass === "text_overflow_risk") {
        pushFinding(findings, {
          code: "OVERFLOW_BODY_TEXT",
          severity: issue.severity,
          message: issue.message,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex),
          category: "layout",
          blocking: issue.severity === "error",
          machineFixHint: issue.remediation,
          recommendedAction: issue.remediation ?? "Shorten the body copy or split the slide before the next render.",
        });
        pushFinding(findings, {
          code: "LAYOUT_SHOULD_SPLIT",
          severity: slide.compatibilityVerdict === "visual_fallback" ? "warning" : "info",
          message: `Slide ${slide.slideIndex + 1} is dense enough that splitting or trimming content is likely safer than another retry.`,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex),
          category: "layout",
          blocking: false,
          machineFixHint: "Split the narrative into multiple slides or reduce paragraph density before the next render attempt.",
          recommendedAction: "Split the slide into two lighter narrative steps before the next render attempt.",
        });
        if (issueMessage.includes("table")) {
          pushFinding(findings, {
            code: "TABLE_TOO_DENSE",
            severity: issue.severity,
            message: issue.message,
            slideIndex: slide.slideIndex,
            componentPath: makeSlidePath(slide.slideIndex, "table"),
            category: "layout",
            blocking: issue.severity === "error",
            machineFixHint: issue.remediation,
            recommendedAction: issue.remediation ?? "Reduce row or column density, or move part of the table to another slide.",
          });
        }
      }

      if (issue.issueClass === "font_substitution_risk") {
        const fontCode = (
          issue.code === "FONT_SYSTEM_OPT_IN" ||
          issue.code === "FONT_EMBEDDING_UNAVAILABLE" ||
          issue.code === "FONT_REQUESTED_FAMILY_NOT_EMBEDDED" ||
          issue.code === "FONT_MISSING_FACE_VARIANT" ||
          issue.code === "FONT_COVERAGE_FALLBACK_USED"
        ) ? issue.code : "FONT_FALLBACK_USED";
        pushFinding(findings, {
          code: fontCode,
          severity: issue.severity,
          message: issue.message,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex),
          category: "typography",
          blocking: issue.severity === "error",
          machineFixHint: issue.remediation,
          recommendedAction: issue.remediation ?? "Replace unsupported fonts with approved brand fonts.",
        });
      }

      if (issue.issueClass === "chart_layout_risk") {
        pushFinding(findings, {
          code: "CHART_LABEL_COLLISION",
          severity: issue.severity,
          message: issue.message,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex, "chart"),
          category: "chart",
          blocking: issue.severity === "error",
          machineFixHint: issue.remediation,
          recommendedAction: issue.remediation ?? "Simplify the chart or reduce label density before the next render.",
        });
      }

      if (issue.issueClass === "template_placeholder_risk") {
        pushFinding(findings, {
          code: "BRAND_TOKEN_MISSING",
          severity: issue.severity,
          message: issue.message,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex),
          category: "brand",
          blocking: issue.severity === "error",
          machineFixHint: issue.remediation,
          recommendedAction: issue.remediation ?? "Recompile the brand pack or use a compatible layout.",
        });
      }

      if (/asset|media|image|logo/.test(issueMessage)) {
        pushFinding(findings, {
          code: "ASSET_MISSING",
          severity: issue.severity,
          message: issue.message,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex),
          category: "asset",
          blocking: issue.severity === "error",
          machineFixHint: issue.remediation,
          recommendedAction: issue.remediation ?? "Upload the missing asset and retry the render.",
        });
      }
    }

    if (Object.keys(slide.fontSubstitutions).length > 0) {
      const substitutions = Object.entries(slide.fontSubstitutions)
        .map(([from, to]) => `${from} -> ${to}`)
        .join(", ");
      pushFinding(findings, {
        code: "FONT_FALLBACK_USED",
        severity: "warning",
        message: `Slide ${slide.slideIndex + 1} used fallback fonts: ${substitutions}.`,
        slideIndex: slide.slideIndex,
        componentPath: makeSlidePath(slide.slideIndex),
        category: "typography",
        blocking: false,
        machineFixHint: "Embed or replace unsupported fonts with the brand pack's approved set.",
        recommendedAction: "Replace fallback fonts with the approved brand font family before final render.",
      });
    }
  }

  if ((templateReport?.missingPlaceholderCount ?? 0) > 0) {
    pushFinding(findings, {
      code: "BRAND_TOKEN_MISSING",
      severity: templateReport?.templateSupportLevel === "unsafe" ? "error" : "warning",
      message: `Template mapping missed ${templateReport?.missingPlaceholderCount} required placeholder${templateReport?.missingPlaceholderCount === 1 ? "" : "s"}.`,
      category: "brand",
      blocking: templateReport?.templateSupportLevel === "unsafe",
      machineFixHint: "Recompile the brand pack or map the slide to a layout with matching placeholders.",
      recommendedAction: "Recompile the brand pack and confirm the target layout exposes the required placeholders.",
    });
  }

  if (structuralValidation.status === "failed") {
    for (const check of structuralValidation.checks.filter((entry) => !entry.passed)) {
      pushFinding(findings, structuralCheckToFinding(check));
    }
  }

  if (desktopValidation?.status === "failed") {
    const failingCheck = desktopValidation.checks.find((check) => !check.passed);
    pushFinding(findings, {
      code: "DESKTOP_VALIDATION_FAILED",
      severity: "error",
      message: failingCheck?.message ?? "Rendered PPTX failed desktop validation.",
      category: "validation",
      blocking: true,
      machineFixHint: "Review the validation artifacts and fix desktop-only compatibility regressions before release.",
      recommendedAction: "Review the desktop validation artifacts and fix the PowerPoint compatibility issue before release.",
    });
  }

  return findings;
}

export function buildQualityReport(
  compatibility: DocumentCompatibilityReport,
  options?: EngineQualityOptions,
  extras?: {
    structuralValidation?: StructuralValidationSummary;
    desktopValidation?: DesktopValidationSummary;
    templateReport?: TemplatePreflightReport;
    repairSummary?: RepairSummary;
  },
): QualityReport {
  const resolved = resolveQualityOptions(options);
  const structuralValidation = extras?.structuralValidation
    ?? createDefaultStructuralValidation(resolved.validationMode);

  const slideReports: SlideQualityReport[] = compatibility.slides.map((slide) => ({
    slideIndex: slide.slideIndex,
    compatibilityVerdict: slide.compatibilityVerdict,
    issues: slide.issues,
    fallbackApplied: deriveSlideFallback(slide),
    editabilityVerdict: toEditabilityVerdict(slide.compatibilityVerdict),
    suggestedFix: deriveSuggestedFix(slide),
    fonts: slide.fonts,
    fontSubstitutions: slide.fontSubstitutions,
  }));

  const fallbackCount = slideReports.filter(slide => slide.fallbackApplied !== null).length;
  const repairRisk = deriveRepairRisk(
    compatibility.slides,
    structuralValidation,
    extras?.templateReport,
    extras?.desktopValidation,
  );
  const documentVerdict = deriveDocumentVerdict(
    compatibility.slides,
    resolved.maxFallbackLevel,
    structuralValidation,
    extras?.templateReport,
    extras?.desktopValidation,
  );
  const editabilityScore = deriveEditabilityScore(compatibility.slides, extras?.desktopValidation);
  const findings = deriveQualityFindings(
    slideReports,
    structuralValidation,
    extras?.templateReport,
    extras?.desktopValidation,
  );
  const deckScore = deriveDeckScore(
    editabilityScore,
    repairRisk,
    fallbackCount,
    documentVerdict,
    extras?.desktopValidation,
  );
  const repairLog: RepairEntry[] = (extras?.repairSummary?.actions ?? []).map((action) => ({
    strategy: action.id,
    finding: findingCodeFromRepairAction(action.id),
    description: action.description,
    success: true,
  }));
  const findingsWithRepairs = findings.map((finding) => {
    const sharedCode = mapSharedCode(finding.code);
    const matchingRepairs = sharedCode
      ? repairLog.filter((entry) => entry.finding === sharedCode)
      : [];
    return {
      ...finding,
      sharedCode,
      autoFixed: matchingRepairs.length > 0,
      repairDescription: matchingRepairs.map((entry) => entry.description).join(" ") || undefined,
    };
  });

  return {
    verdict: documentVerdict,
    requestedOutputMode: resolved.outputMode,
    validationMode: resolved.validationMode,
    maxFallbackLevel: resolved.maxFallbackLevel,
    documentVerdict,
    repairRisk,
    editabilityScore,
    deckScore,
    fallbackCount,
    findings: findingsWithRepairs,
    slideReports,
    desktopValidationId: resolved.desktopValidationId || undefined,
    structuralValidation,
    desktopValidation: extras?.desktopValidation,
    templateReport: extras?.templateReport,
    repairSummary: extras?.repairSummary ?? { state: "not_requested", actions: [] },
    autoFixesApplied: findingsWithRepairs.filter((finding) => finding.autoFixed).length,
    repairLog,
    contractPassed: documentVerdict !== "rejected",
  };
}

export function mergeDesktopValidationIntoQualityReport(
  report: QualityReport,
  desktopValidation: DesktopValidationSummary,
  overrides?: {
    validationMode?: PptxValidationMode;
    desktopValidationId?: string;
  },
): QualityReport {
  const requestedValidationMode = overrides?.validationMode ?? report.validationMode;
  const desktopValidationId = overrides?.desktopValidationId ?? report.desktopValidationId;
  const repairRisk = deriveRepairRisk(
    report.slideReports,
    report.structuralValidation,
    report.templateReport,
    desktopValidation,
  );
  const documentVerdict = deriveDocumentVerdict(
    report.slideReports,
    report.maxFallbackLevel,
    report.structuralValidation,
    report.templateReport,
    desktopValidation,
  );
  const editabilityScore = deriveEditabilityScore(report.slideReports, desktopValidation);
  const findings = deriveQualityFindings(
    report.slideReports,
    report.structuralValidation,
    report.templateReport,
    desktopValidation,
  );
  const deckScore = deriveDeckScore(
    editabilityScore,
    repairRisk,
    report.fallbackCount,
    documentVerdict,
    desktopValidation,
  );

  return {
    ...report,
    validationMode: requestedValidationMode,
    desktopValidationId,
    desktopValidation,
    repairRisk,
    documentVerdict,
    editabilityScore,
    deckScore,
    findings,
    contractPassed: documentVerdict !== "rejected",
  };
}

export function assertQualityContract(report: QualityReport): void {
  if (report.templateReport?.templateSupportLevel === "unsafe") {
    throw new PaperError(
      "Template preflight marked this document as unsafe for reliable mutation.",
      {
        code: "COMPATIBILITY_CONTRACT_VIOLATION",
        phase: "template",
      },
    );
  }

  if (report.structuralValidation.status === "failed") {
    const failingCheck = report.structuralValidation.checks.find(check => !check.passed);
    throw new PaperError(
      failingCheck?.message ?? "Rendered PPTX failed structural validation.",
      {
        code: "STRUCTURAL_VALIDATION_FAILED",
        phase: "archive",
      },
    );
  }

  if (report.desktopValidation?.status === "failed") {
    const failingCheck = report.desktopValidation.checks.find(check => !check.passed);
    throw new PaperError(
      failingCheck?.message ?? "Rendered PPTX failed PowerPoint desktop validation.",
      {
        code: "DESKTOP_VALIDATION_FAILED",
        phase: "validation",
      },
    );
  }

  if (report.contractPassed) return;

  const violatingSlide = report.slideReports.find((slide) => (
    slide.fallbackApplied &&
    !fallbackWithinLimit(slide.fallbackApplied.level, report.maxFallbackLevel)
  ));

  if (!violatingSlide) {
    throw new PaperError(
      "Render output violated the requested compatibility contract.",
      {
        code: "COMPATIBILITY_CONTRACT_VIOLATION",
        phase: "serialization",
      },
    );
  }

  throw new PaperError(
    `Slide ${violatingSlide.slideIndex + 1} requires ${violatingSlide.fallbackApplied?.level}, which exceeds the ${report.requestedOutputMode} contract.`,
    {
      code: "COMPATIBILITY_CONTRACT_VIOLATION",
      phase: "serialization",
      slideIndex: violatingSlide.slideIndex,
    },
  );
}
