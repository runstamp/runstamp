import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  PRESENTATION_CHILD_ORDER,
  XMLParser,
  json2xml_default
} from "./chunk-E7KL3QDK.js";
import {
  require_lib
} from "./chunk-5GZJ6PGT.js";
import {
  PaperError
} from "./chunk-SFVKAOLH.js";
import {
  __toESM
} from "./chunk-VIXD5LXH.js";

// src/quality/report.ts
function mapSharedCode(code) {
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
      return void 0;
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
      return void 0;
    case "LAYOUT_SHOULD_SPLIT":
      return "PPTX_LAYOUT_SHOULD_SPLIT";
    case "BRAND_TOKEN_MISSING":
    case "BRAND_FONT_MISMATCH":
    case "BRAND_COLOR_MISMATCH":
    case "REQUIRED_LOGO_MISSING":
    case "UNSUPPORTED_LAYOUT_SELECTION":
      return void 0;
  }
}
function structuralCheckToFinding(check) {
  let code;
  let category = "validation";
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
  } else if (check.id.startsWith("package.") || check.id === "slides.present" || /^slide\.\d+\.rels$/.test(check.id) || /^slide\.\d+\.content-type$/.test(check.id) || /^chart\.\d+\.rels$/.test(check.id) || /^chart\.\d+\.content-type$/.test(check.id)) {
    code = "STRUCTURAL_VALIDATION_FAILED";
  } else {
    throw new PaperError(`Unmapped PPTX structural validation check: ${check.id}`, {
      code: "VALIDATION_FAILED",
      phase: "validation"
    });
  }
  const slideIndexMatch = check.id.match(/^slide\.(\d+)\./);
  const slideIndex = slideIndexMatch ? Number(slideIndexMatch[1]) - 1 : void 0;
  return {
    code,
    severity: check.severity,
    message: check.message,
    slideIndex,
    componentPath: slideIndex !== void 0 ? makeSlidePath(slideIndex) : void 0,
    category,
    blocking: check.severity === "error",
    machineFixHint: code === "STRUCTURAL_VALIDATION_FAILED" ? "Inspect the structural validation report before sending the file downstream." : void 0,
    recommendedAction: code === "TABLE_TOO_DENSE" ? "Reduce table density or split the table across multiple slides." : code === "CHART_FORMAT_CODE_UNESCAPED" ? "Escape XML-sensitive characters in chart number formats before release." : code === "NORMAUTOFIT_MISSING_FONTSCALE" ? "Write an explicit fontScale on normAutofit nodes." : code === "RELATIONSHIP_TARGET_MISSING" ? "Repair or remove the broken relationship target before release." : void 0
  };
}
function findingCodeFromRepairAction(actionId) {
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
        phase: "validation"
      });
  }
}
var FALLBACK_RANK = {
  native_editable: 0,
  native_anchored: 1,
  alternate_content: 2,
  visual_fallback: 3
};
function compatibilityModeToFallbackLevel(mode) {
  switch (mode) {
    case "native_safe":
      return "native_editable";
    case "native_anchored":
      return "native_anchored";
    case "visual_fallback":
      return "visual_fallback";
  }
}
function getDefaultMaxFallbackLevel(outputMode = "editable_preferred") {
  switch (outputMode) {
    case "strict_editable":
      return "native_editable";
    case "editable_preferred":
      return "native_anchored";
    case "visual_safe":
      return "visual_fallback";
  }
}
function resolveQualityOptions(options) {
  const outputMode = options?.outputMode ?? "editable_preferred";
  return {
    outputMode,
    validationMode: options?.validationMode ?? "none",
    maxFallbackLevel: options?.maxFallbackLevel ?? getDefaultMaxFallbackLevel(outputMode),
    desktopValidationId: options?.desktopValidationId ?? "",
    repairMode: options?.repairMode ?? "none"
  };
}
function createDefaultStructuralValidation(_validationMode) {
  return {
    status: "not_run",
    checks: [
      {
        id: "structural.validation",
        passed: false,
        severity: "info",
        message: _validationMode === "structural" ? "Structural validation was requested but no rendered PPTX buffer was supplied." : "Structural validation was not requested."
      }
    ],
    failureCount: 0
  };
}
function fallbackWithinLimit(level, maxFallbackLevel) {
  return FALLBACK_RANK[level] <= FALLBACK_RANK[maxFallbackLevel];
}
function toEditabilityVerdict(mode) {
  switch (mode) {
    case "native_safe":
      return "editable";
    case "native_anchored":
      return "editable_with_constraints";
    case "visual_fallback":
      return "visual_only";
  }
}
function deriveSuggestedFix(slide) {
  const remediation = slide.issues.find((issue) => issue.remediation)?.remediation;
  if (remediation) return remediation;
  if (slide.fallbackReason) return slide.fallbackReason;
  switch (slide.compatibilityVerdict) {
    case "native_safe":
      return void 0;
    case "native_anchored":
      return "Keep editable output by simplifying fonts or text groups on this slide.";
    case "visual_fallback":
      return "Switch to visual_safe mode or simplify the slide until it stays inside the native editable contract.";
  }
}
function deriveSlideFallback(slide) {
  const level = compatibilityModeToFallbackLevel(slide.compatibilityVerdict);
  if (level === "native_editable") return null;
  return {
    level,
    reason: slide.fallbackReason ?? slide.issues.find((issue) => issue.fallbackLevel === level)?.message
  };
}
function deriveRepairRisk(slides, structuralValidation, templateReport, desktopValidation) {
  if (structuralValidation.status === "failed") return "high";
  if (templateReport?.templateSupportLevel === "unsafe") return "high";
  if (desktopValidation?.status === "failed") return "high";
  if (slides.some((slide) => slide.compatibilityVerdict === "visual_fallback")) return "high";
  if (slides.some((slide) => slide.issues.some((issue) => issue.severity === "error"))) return "high";
  if (slides.some((slide) => slide.compatibilityVerdict === "native_anchored")) return "medium";
  if (slides.some((slide) => slide.issues.some((issue) => issue.severity === "warning"))) return "medium";
  return "low";
}
function deriveEditabilityScore(slides, desktopValidation) {
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
function deriveDocumentVerdict(slides, maxFallbackLevel, structuralValidation, templateReport, desktopValidation) {
  if (structuralValidation.status === "failed") return "rejected";
  if (templateReport?.templateSupportLevel === "unsafe") return "rejected";
  if (desktopValidation?.status === "failed") return "rejected";
  const hasContractViolation = slides.some(
    (slide) => !fallbackWithinLimit(
      compatibilityModeToFallbackLevel(slide.compatibilityVerdict),
      maxFallbackLevel
    )
  );
  if (hasContractViolation) return "rejected";
  if (slides.some((slide) => slide.compatibilityVerdict === "visual_fallback")) return "visual_fallback";
  if (slides.some((slide) => slide.compatibilityVerdict === "native_anchored")) {
    return "editable_with_constraints";
  }
  return "native_editable";
}
function pushFinding(list, finding) {
  if (!list.some(
    (existing) => existing.code === finding.code && existing.slideIndex === finding.slideIndex && existing.componentPath === finding.componentPath && existing.message === finding.message
  )) {
    list.push(finding);
  }
}
function makeSlidePath(slideIndex, suffix) {
  return suffix ? `slides[${slideIndex}].${suffix}` : `slides[${slideIndex}]`;
}
function deriveDeckScore(editabilityScore, repairRisk, fallbackCount, documentVerdict, desktopValidation) {
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
function deriveQualityFindings(slideReports, structuralValidation, templateReport, desktopValidation) {
  const findings = [];
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
          recommendedAction: issue.remediation ?? "Shorten the body copy or split the slide before the next render."
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
          recommendedAction: "Split the slide into two lighter narrative steps before the next render attempt."
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
            recommendedAction: issue.remediation ?? "Reduce row or column density, or move part of the table to another slide."
          });
        }
      }
      if (issue.issueClass === "font_substitution_risk") {
        const fontCode = issue.code === "FONT_SYSTEM_OPT_IN" || issue.code === "FONT_EMBEDDING_UNAVAILABLE" || issue.code === "FONT_REQUESTED_FAMILY_NOT_EMBEDDED" || issue.code === "FONT_MISSING_FACE_VARIANT" || issue.code === "FONT_COVERAGE_FALLBACK_USED" ? issue.code : "FONT_FALLBACK_USED";
        pushFinding(findings, {
          code: fontCode,
          severity: issue.severity,
          message: issue.message,
          slideIndex: slide.slideIndex,
          componentPath: makeSlidePath(slide.slideIndex),
          category: "typography",
          blocking: issue.severity === "error",
          machineFixHint: issue.remediation,
          recommendedAction: issue.remediation ?? "Replace unsupported fonts with approved brand fonts."
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
          recommendedAction: issue.remediation ?? "Simplify the chart or reduce label density before the next render."
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
          recommendedAction: issue.remediation ?? "Recompile the brand pack or use a compatible layout."
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
          recommendedAction: issue.remediation ?? "Upload the missing asset and retry the render."
        });
      }
    }
    if (Object.keys(slide.fontSubstitutions).length > 0) {
      const substitutions = Object.entries(slide.fontSubstitutions).map(([from, to]) => `${from} -> ${to}`).join(", ");
      pushFinding(findings, {
        code: "FONT_FALLBACK_USED",
        severity: "warning",
        message: `Slide ${slide.slideIndex + 1} used fallback fonts: ${substitutions}.`,
        slideIndex: slide.slideIndex,
        componentPath: makeSlidePath(slide.slideIndex),
        category: "typography",
        blocking: false,
        machineFixHint: "Embed or replace unsupported fonts with the brand pack's approved set.",
        recommendedAction: "Replace fallback fonts with the approved brand font family before final render."
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
      recommendedAction: "Recompile the brand pack and confirm the target layout exposes the required placeholders."
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
      recommendedAction: "Review the desktop validation artifacts and fix the PowerPoint compatibility issue before release."
    });
  }
  return findings;
}
function buildQualityReport(compatibility, options, extras) {
  const resolved = resolveQualityOptions(options);
  const structuralValidation = extras?.structuralValidation ?? createDefaultStructuralValidation(resolved.validationMode);
  const slideReports = compatibility.slides.map((slide) => ({
    slideIndex: slide.slideIndex,
    compatibilityVerdict: slide.compatibilityVerdict,
    issues: slide.issues,
    fallbackApplied: deriveSlideFallback(slide),
    editabilityVerdict: toEditabilityVerdict(slide.compatibilityVerdict),
    suggestedFix: deriveSuggestedFix(slide),
    fonts: slide.fonts,
    fontSubstitutions: slide.fontSubstitutions
  }));
  const fallbackCount = slideReports.filter((slide) => slide.fallbackApplied !== null).length;
  const repairRisk = deriveRepairRisk(
    compatibility.slides,
    structuralValidation,
    extras?.templateReport,
    extras?.desktopValidation
  );
  const documentVerdict = deriveDocumentVerdict(
    compatibility.slides,
    resolved.maxFallbackLevel,
    structuralValidation,
    extras?.templateReport,
    extras?.desktopValidation
  );
  const editabilityScore = deriveEditabilityScore(compatibility.slides, extras?.desktopValidation);
  const findings = deriveQualityFindings(
    slideReports,
    structuralValidation,
    extras?.templateReport,
    extras?.desktopValidation
  );
  const deckScore = deriveDeckScore(
    editabilityScore,
    repairRisk,
    fallbackCount,
    documentVerdict,
    extras?.desktopValidation
  );
  const repairLog = (extras?.repairSummary?.actions ?? []).map((action) => ({
    strategy: action.id,
    finding: findingCodeFromRepairAction(action.id),
    description: action.description,
    success: true
  }));
  const findingsWithRepairs = findings.map((finding) => {
    const sharedCode = mapSharedCode(finding.code);
    const matchingRepairs = sharedCode ? repairLog.filter((entry) => entry.finding === sharedCode) : [];
    return {
      ...finding,
      sharedCode,
      autoFixed: matchingRepairs.length > 0,
      repairDescription: matchingRepairs.map((entry) => entry.description).join(" ") || void 0
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
    desktopValidationId: resolved.desktopValidationId || void 0,
    structuralValidation,
    desktopValidation: extras?.desktopValidation,
    templateReport: extras?.templateReport,
    repairSummary: extras?.repairSummary ?? { state: "not_requested", actions: [] },
    autoFixesApplied: findingsWithRepairs.filter((finding) => finding.autoFixed).length,
    repairLog,
    contractPassed: documentVerdict !== "rejected"
  };
}
function mergeDesktopValidationIntoQualityReport(report, desktopValidation, overrides) {
  const requestedValidationMode = overrides?.validationMode ?? report.validationMode;
  const desktopValidationId = overrides?.desktopValidationId ?? report.desktopValidationId;
  const repairRisk = deriveRepairRisk(
    report.slideReports,
    report.structuralValidation,
    report.templateReport,
    desktopValidation
  );
  const documentVerdict = deriveDocumentVerdict(
    report.slideReports,
    report.maxFallbackLevel,
    report.structuralValidation,
    report.templateReport,
    desktopValidation
  );
  const editabilityScore = deriveEditabilityScore(report.slideReports, desktopValidation);
  const findings = deriveQualityFindings(
    report.slideReports,
    report.structuralValidation,
    report.templateReport,
    desktopValidation
  );
  const deckScore = deriveDeckScore(
    editabilityScore,
    repairRisk,
    report.fallbackCount,
    documentVerdict,
    desktopValidation
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
    contractPassed: documentVerdict !== "rejected"
  };
}
function assertQualityContract(report) {
  if (report.templateReport?.templateSupportLevel === "unsafe") {
    throw new PaperError(
      "Template preflight marked this document as unsafe for reliable mutation.",
      {
        code: "COMPATIBILITY_CONTRACT_VIOLATION",
        phase: "template"
      }
    );
  }
  if (report.structuralValidation.status === "failed") {
    const failingCheck = report.structuralValidation.checks.find((check) => !check.passed);
    throw new PaperError(
      failingCheck?.message ?? "Rendered PPTX failed structural validation.",
      {
        code: "STRUCTURAL_VALIDATION_FAILED",
        phase: "archive"
      }
    );
  }
  if (report.desktopValidation?.status === "failed") {
    const failingCheck = report.desktopValidation.checks.find((check) => !check.passed);
    throw new PaperError(
      failingCheck?.message ?? "Rendered PPTX failed PowerPoint desktop validation.",
      {
        code: "DESKTOP_VALIDATION_FAILED",
        phase: "validation"
      }
    );
  }
  if (report.contractPassed) return;
  const violatingSlide = report.slideReports.find((slide) => slide.fallbackApplied && !fallbackWithinLimit(slide.fallbackApplied.level, report.maxFallbackLevel));
  if (!violatingSlide) {
    throw new PaperError(
      "Render output violated the requested compatibility contract.",
      {
        code: "COMPATIBILITY_CONTRACT_VIOLATION",
        phase: "serialization"
      }
    );
  }
  throw new PaperError(
    `Slide ${violatingSlide.slideIndex + 1} requires ${violatingSlide.fallbackApplied?.level}, which exceeds the ${report.requestedOutputMode} contract.`,
    {
      code: "COMPATIBILITY_CONTRACT_VIOLATION",
      phase: "serialization",
      slideIndex: violatingSlide.slideIndex
    }
  );
}

// src/quality/structuralValidation.ts
var import_jszip = __toESM(require_lib(), 1);

// src/quality/xmlUtils.ts
var xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: false
});
function getTagName(el) {
  if (!el || typeof el !== "object") return void 0;
  return Object.keys(el).find((key) => key !== ":@" && key !== "#text");
}
function getChildren(el) {
  if (!el || typeof el !== "object") return [];
  const tag = getTagName(el);
  const children = tag ? el[tag] : void 0;
  return Array.isArray(children) ? children : [];
}
function getAttr(el, name) {
  if (!el || typeof el !== "object") return void 0;
  const attrs = el[":@"];
  if (!attrs || typeof attrs !== "object") return void 0;
  const value = attrs[`@_${name}`];
  return typeof value === "string" ? value : void 0;
}
function getChildTagNames(el) {
  return getChildren(el).map((child) => getTagName(child)).filter((tag) => Boolean(tag));
}
function findAllElements(tree, tag) {
  const results = [];
  function walk(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      for (const key of Object.keys(node)) {
        if (key === ":@" || key === "#text") continue;
        if (key === tag) results.push(node);
        walk(node[key]);
      }
    }
  }
  walk(tree);
  return results;
}
function getText(el) {
  return getChildren(el).filter((child) => Object.prototype.hasOwnProperty.call(child, "#text")).map((child) => String(child["#text"])).join("");
}
function assertUniqueShapeIds(tree) {
  const cNvPrs = findAllElements(tree, "p:cNvPr");
  const ids = cNvPrs.map((el) => {
    const id = getAttr(el, "id");
    return id ? Number.parseInt(id, 10) : Number.NaN;
  }).filter((id) => !Number.isNaN(id));
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    throw new Error(`Duplicate shape IDs found: ${duplicates.join(", ")}`);
  }
  return ids;
}

// src/quality/structuralValidation.ts
var EMU_PER_PX = 9525;
var structuralXmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: {
    // Generated custom properties can contain thousands of escapes; 100k is ample
    // while finite entity size, depth, count, and expanded-length caps block entity bombs.
    maxTotalExpansions: 1e5,
    maxEntitySize: 1e4,
    maxExpansionDepth: 10,
    maxExpandedLength: 1e5,
    maxEntityCount: 100
  }
});
function addCheck(checks, id, passed, message, severity = "error") {
  checks.push({ id, passed, message, severity });
}
async function readText(zip, path) {
  return await zip.file(path)?.async("string");
}
async function loadZipXml(zip, path, checks) {
  const text = await readText(zip, path);
  if (text === void 0) return null;
  try {
    return structuralXmlParser.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(
      checks,
      `xml.parse.${path}`,
      false,
      `${path} is not parseable XML: ${message}`
    );
    return null;
  }
}
function resolveRelTarget(relsPath, target) {
  if (target.startsWith("/")) return target.slice(1);
  const relsDir = relsPath.substring(0, relsPath.lastIndexOf("/") + 1);
  const parentDir = relsDir.replace(/_rels\/$/, "");
  const resolved = [];
  for (const part of `${parentDir}${target}`.split("/")) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}
function getPackagePaths(zip) {
  return Object.keys(zip.files).filter((file) => !zip.files[file].dir).sort();
}
function getExtension(path) {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
}
function collectContentTypeChecks(checks, contentTypesTree, packagePaths) {
  if (!contentTypesTree) return;
  const seenExtensions = /* @__PURE__ */ new Set();
  const seenPartNames = /* @__PURE__ */ new Set();
  const defaults = /* @__PURE__ */ new Set();
  const overrides = /* @__PURE__ */ new Set();
  for (const element of findAllElements(contentTypesTree, "Default")) {
    const extension = getAttr(element, "Extension")?.toLowerCase();
    if (!extension) continue;
    const duplicate = seenExtensions.has(extension);
    addCheck(
      checks,
      `content-types.default.${extension}`,
      !duplicate,
      duplicate ? `Duplicate Default content type extension "${extension}" detected.` : `Default content type extension "${extension}" is unique.`
    );
    seenExtensions.add(extension);
    defaults.add(extension);
  }
  for (const element of findAllElements(contentTypesTree, "Override")) {
    const partName = getAttr(element, "PartName")?.replace(/^\//, "").toLowerCase();
    if (!partName) continue;
    const duplicate = seenPartNames.has(partName);
    addCheck(
      checks,
      `content-types.override.${partName}`,
      !duplicate,
      duplicate ? `Duplicate Override content type part "${partName}" detected.` : `Override content type part "${partName}" is unique.`
    );
    seenPartNames.add(partName);
    overrides.add(partName);
  }
  for (const path of packagePaths) {
    if (path === "[Content_Types].xml") continue;
    if (overrides.has(path.toLowerCase())) continue;
    const extension = getExtension(path);
    if (extension && defaults.has(extension)) continue;
    addCheck(
      checks,
      `package.content-type.${path}`,
      false,
      `${path} is missing a matching Default or Override content type.`
    );
  }
}
function collectPresentationChecks(checks, presentationTree) {
  if (!presentationTree) return;
  const presentation = findAllElements(presentationTree, "p:presentation")[0];
  if (!presentation) {
    addCheck(checks, "presentation.root", false, "No p:presentation element found.");
    return;
  }
  const expectedOrder = [...PRESENTATION_CHILD_ORDER];
  const relevant = getChildTagNames(presentation).filter((tag) => expectedOrder.includes(tag));
  let lastIndex = -1;
  for (const tag of relevant) {
    const expectedIndex = expectedOrder.indexOf(tag);
    const ordered = expectedIndex >= lastIndex;
    addCheck(
      checks,
      `presentation.order.${tag}`,
      ordered,
      ordered ? `Presentation child ${tag} appears in schema order.` : `Presentation child ${tag} appears out of OOXML schema order.`
    );
    lastIndex = Math.max(lastIndex, expectedIndex);
  }
  const seenSlideIds = /* @__PURE__ */ new Set();
  for (const slideIdElement of findAllElements(presentationTree, "p:sldId")) {
    const slideId = getAttr(slideIdElement, "id");
    if (!slideId) continue;
    const duplicate = seenSlideIds.has(slideId);
    addCheck(
      checks,
      `presentation.slide-id.${slideId}`,
      !duplicate,
      duplicate ? `Duplicate slide id ${slideId} detected in ppt/presentation.xml.` : `Slide id ${slideId} in ppt/presentation.xml is unique.`
    );
    seenSlideIds.add(slideId);
  }
}
function collectDuplicateShapeIdChecks(checks, slideNumber, slideTree) {
  if (!slideTree) return;
  const ids = findAllElements(slideTree, "p:cNvPr").map((element) => getAttr(element, "id")).filter((id) => Boolean(id));
  const seen = /* @__PURE__ */ new Set();
  for (const id of ids) {
    const duplicate = seen.has(id);
    addCheck(
      checks,
      `slide.${slideNumber}.shape-id.${id}`,
      !duplicate,
      duplicate ? `Duplicate non-visual shape id ${id} detected on slide ${slideNumber}.` : `Slide ${slideNumber} non-visual shape id ${id} is unique.`
    );
    seen.add(id);
  }
  try {
    assertUniqueShapeIds(slideTree);
  } catch (error) {
    addCheck(
      checks,
      `slide.${slideNumber}.shape-id.summary`,
      false,
      `Slide ${slideNumber}: ${error.message}`
    );
  }
}
function collectRequiredAttributeChecks(checks, slideNumber, slideTree) {
  if (!slideTree) return;
  for (const tag of ["a:latin", "a:ea", "a:cs"]) {
    let index = 0;
    for (const element of findAllElements(slideTree, tag)) {
      const hasTypeface = getAttr(element, "typeface") !== void 0;
      addCheck(
        checks,
        `slide.${slideNumber}.required-attribute.${tag}.${index}`,
        hasTypeface,
        hasTypeface ? `Slide ${slideNumber} ${tag} entry ${index + 1} includes typeface.` : `Slide ${slideNumber} ${tag} entry ${index + 1} is missing typeface.`
      );
      index += 1;
    }
  }
}
function collectAutoFitChecks(checks, slideNumber, slideTree) {
  if (!slideTree) return;
  let index = 0;
  for (const bodyPr of findAllElements(slideTree, "a:bodyPr")) {
    const descendants = getChildren(bodyPr);
    const hasNormAutofit = findAllElements(descendants, "a:normAutofit").length > 0;
    const hasSpAutoFit = findAllElements(descendants, "a:spAutoFit").length > 0;
    const hasNoAutofit = findAllElements(descendants, "a:noAutofit").length > 0;
    const autoFitCount = [hasNormAutofit, hasSpAutoFit, hasNoAutofit].filter(Boolean).length;
    const singlePolicy = autoFitCount <= 1;
    addCheck(
      checks,
      `slide.${slideNumber}.autofit-policy.${index}`,
      singlePolicy,
      singlePolicy ? `Slide ${slideNumber} bodyPr ${index + 1} uses at most one autofit policy.` : `Slide ${slideNumber} bodyPr ${index + 1} contains conflicting autofit policies.`
    );
    let normIndex = 0;
    for (const normAutofit of findAllElements(descendants, "a:normAutofit")) {
      const hasFontScale = getAttr(normAutofit, "fontScale") !== void 0;
      addCheck(
        checks,
        `slide.${slideNumber}.normautofit.${index}.${normIndex}`,
        true,
        hasFontScale ? `Slide ${slideNumber} normAutofit entry ${normIndex + 1} includes fontScale.` : `Slide ${slideNumber} normAutofit entry ${normIndex + 1} uses Office-default autofit.`,
        "info"
      );
      normIndex += 1;
    }
    index += 1;
  }
}
function collectLongTableTextChecks(checks, slideNumber, slideTree) {
  if (!slideTree) return;
  let index = 0;
  for (const tableCell of findAllElements(slideTree, "a:tc")) {
    const text = findAllElements([tableCell], "a:t").map((element) => getText(element)).join("");
    if (text.length === 0) {
      index += 1;
      continue;
    }
    const withinLimit = text.length <= 150;
    addCheck(
      checks,
      `slide.${slideNumber}.table-overflow.${index}`,
      withinLimit,
      withinLimit ? `Slide ${slideNumber} table cell ${index + 1} stays within the conservative text budget.` : `Slide ${slideNumber} table cell ${index + 1} contains ${text.length} characters and is likely to overflow.`,
      withinLimit ? "info" : "warning"
    );
    index += 1;
  }
}
function collectCustomDataConflictChecks(checks, slideNumber, slideTree) {
  if (!slideTree) return;
  const count = findAllElements(slideTree, "p:custDataLst").length;
  const withinLimit = count <= 1;
  addCheck(
    checks,
    `slide.${slideNumber}.custdatalist`,
    withinLimit,
    withinLimit ? `Slide ${slideNumber} has at most one custDataLst block.` : `Slide ${slideNumber} contains multiple custDataLst blocks, which can confuse PowerPoint repair.`
  );
}
function collectSlideRefChecks(checks, slideNumber, slideTree, relsTree) {
  if (!slideTree) return;
  const relationshipIds = new Set(
    relsTree ? findAllElements(relsTree, "Relationship").map((rel) => getAttr(rel, "Id")).filter((id) => Boolean(id)) : []
  );
  function walk(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const attrs = node[":@"];
      if (attrs && typeof attrs === "object") {
        for (const [key, value] of Object.entries(attrs)) {
          if ((key === "@_r:embed" || key === "@_r:id" || key === "@_r:link") && typeof value === "string" && value.length > 0) {
            addCheck(
              checks,
              `slide.${slideNumber}.ref.${value}`,
              relationshipIds.has(value),
              relationshipIds.has(value) ? `Slide ${slideNumber} relationship ${value} resolves.` : `Slide ${slideNumber} references ${value}, but it is missing from the slide relationships file.`
            );
          }
        }
      }
      for (const key of Object.keys(node)) {
        if (key !== ":@" && key !== "#text") {
          walk(node[key]);
        }
      }
    }
  }
  walk(slideTree);
}
function collectRelationshipChecks(checks, relsPath, relsTree, packagePathSet, referencedTargets) {
  if (!relsTree) return;
  const seenIds = /* @__PURE__ */ new Set();
  for (const rel of findAllElements(relsTree, "Relationship")) {
    const relId = getAttr(rel, "Id");
    const target = getAttr(rel, "Target");
    const targetMode = getAttr(rel, "TargetMode");
    if (!relId) continue;
    const duplicate = seenIds.has(relId);
    addCheck(
      checks,
      `${relsPath}.rid.${relId}`,
      !duplicate,
      duplicate ? `Duplicate relationship Id "${relId}" in ${relsPath}.` : `Relationship Id "${relId}" in ${relsPath} is unique.`
    );
    seenIds.add(relId);
    if (!target || targetMode === "External") continue;
    const resolvedTarget = resolveRelTarget(relsPath, target);
    referencedTargets.add(resolvedTarget);
    addCheck(
      checks,
      `${relsPath}.${relId}.target`,
      packagePathSet.has(resolvedTarget),
      packagePathSet.has(resolvedTarget) ? `Relationship ${relId} in ${relsPath} resolves to ${resolvedTarget}.` : `Relationship ${relId} in ${relsPath} points to missing target ${resolvedTarget}.`
    );
  }
}
function collectReachablePartChecks(checks, packagePaths, referencedTargets) {
  const likelyGeneratedTargets = packagePaths.filter(
    (path) => /^(ppt\/media\/|ppt\/embeddings\/|ppt\/charts\/|ppt\/drawings\/|ppt\/comments\/|ppt\/notesSlides\/)/.test(path) && !path.includes("/_rels/") && !path.endsWith(".rels")
  );
  for (const path of likelyGeneratedTargets) {
    addCheck(
      checks,
      `package.reachable.${path}`,
      referencedTargets.has(path),
      referencedTargets.has(path) ? `${path} is referenced by a relationship part.` : `${path} is not referenced by any relationship part.`
    );
  }
}
function collectChartFormatCodeChecks(checks, chartNumber, chartTree) {
  if (!chartTree) return;
  let index = 0;
  for (const formatCodeElement of findAllElements(chartTree, "c:formatCode")) {
    const formatCode = getText(formatCodeElement);
    const hasRawAmpersand = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(formatCode);
    const hasRawAngle = /[<>]/.test(formatCode);
    const escaped = !hasRawAmpersand && !hasRawAngle;
    addCheck(
      checks,
      `chart.${chartNumber}.format-code.${index}`,
      escaped,
      escaped ? `Chart ${chartNumber} format code ${index + 1} is XML-safe.` : `Chart ${chartNumber} format code ${index + 1} contains unescaped XML-sensitive characters.`
    );
    index += 1;
  }
}
function collectChartWorkbookChecks(checks, chartNumber, chartRelsPath, chartRelsTree, packagePathSet) {
  if (!chartRelsTree) return;
  for (const rel of findAllElements(chartRelsTree, "Relationship")) {
    const target = getAttr(rel, "Target");
    if (!target || !target.includes("../embeddings/")) continue;
    const workbookPath = resolveRelTarget(chartRelsPath, target);
    addCheck(
      checks,
      `chart.${chartNumber}.workbook`,
      packagePathSet.has(workbookPath),
      packagePathSet.has(workbookPath) ? `Chart ${chartNumber} embedded workbook exists.` : `Chart ${chartNumber} embedded workbook is missing (${workbookPath}).`
    );
  }
}
function collectClassicChartFrames(zip, parsedXmlByPath) {
  const chartFrames = /* @__PURE__ */ new Map();
  const slideRelsPaths = Object.keys(zip.files).filter((path) => !zip.files[path].dir && /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path));
  for (const relsPath of slideRelsPaths) {
    const relsTree = parsedXmlByPath.get(relsPath);
    if (!relsTree) continue;
    const chartTargets = /* @__PURE__ */ new Map();
    for (const rel of findAllElements(relsTree, "Relationship")) {
      const type = getAttr(rel, "Type") ?? "";
      if (!type.includes("/chart")) continue;
      const relId = getAttr(rel, "Id");
      const target = getAttr(rel, "Target");
      if (!relId || !target) continue;
      chartTargets.set(relId, resolveRelTarget(relsPath, target));
    }
    if (chartTargets.size === 0) continue;
    const slidePath = relsPath.replace("/_rels/", "/").replace(/\.rels$/, "");
    const slideTree = parsedXmlByPath.get(slidePath);
    if (!slideTree) continue;
    for (const frame of findAllElements(slideTree, "p:graphicFrame")) {
      const chartRefs = [
        ...findAllElements([frame], "c:chart"),
        ...findAllElements([frame], "cx:chart"),
        ...findAllElements([frame], "c16r3:chart")
      ];
      const chartRef = chartRefs.find((element) => getAttr(element, "r:id"));
      const chartRId = chartRef ? getAttr(chartRef, "r:id") : void 0;
      if (!chartRId) continue;
      const targetPath = chartTargets.get(chartRId);
      if (!targetPath) continue;
      const xfrm = findAllElements([frame], "a:xfrm")[0];
      const ext = xfrm ? findAllElements([xfrm], "a:ext")[0] : void 0;
      const cx = ext ? Number(getAttr(ext, "cx")) : Number.NaN;
      const cy = ext ? Number(getAttr(ext, "cy")) : Number.NaN;
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) continue;
      chartFrames.set(targetPath, {
        slidePath,
        widthPx: cx / EMU_PER_PX,
        heightPx: cy / EMU_PER_PX
      });
    }
  }
  return chartFrames;
}
function getManualLayoutValue(manualLayout, tag) {
  const element = findAllElements([manualLayout], `c:${tag}`)[0];
  const value = element ? Number(getAttr(element, "val")) : Number.NaN;
  return Number.isFinite(value) ? value : void 0;
}
function roundTo4(value) {
  return Math.round(value * 1e4) / 1e4;
}
function collectChartManualLayoutBoundsChecks(checks, chartPath, chartNumber, chartTree, frameByChart) {
  if (!chartTree) return;
  const frame = frameByChart.get(chartPath);
  const legendElement = findAllElements(chartTree, "c:legendPos")[0];
  const legendPos = legendElement ? getAttr(legendElement, "val") : void 0;
  let index = 0;
  for (const manualLayout of findAllElements(chartTree, "c:manualLayout")) {
    const x = getManualLayoutValue(manualLayout, "x");
    const y = getManualLayoutValue(manualLayout, "y");
    const w = getManualLayoutValue(manualLayout, "w");
    const h = getManualLayoutValue(manualLayout, "h");
    const errors = [];
    for (const [key, value] of Object.entries({ x, y, w, h })) {
      if (value === void 0) {
        errors.push(`manualLayout missing ${key}`);
      } else if (value < 0 || value > 1) {
        errors.push(`manualLayout ${key}=${value} is outside [0, 1]`);
      }
    }
    if (x !== void 0 && w !== void 0 && x + w > 1.0001) {
      errors.push(`manualLayout x+w=${roundTo4(x + w)} exceeds 1`);
    }
    if (y !== void 0 && h !== void 0 && y + h > 1.0001) {
      errors.push(`manualLayout y+h=${roundTo4(y + h)} exceeds 1`);
    }
    if (frame && frame.heightPx < 120) {
      errors.push(`manualLayout emitted for short frame ${roundTo4(frame.heightPx)}px on ${frame.slidePath}`);
    }
    if (frame && legendPos === "r" && w !== void 0 && frame.widthPx >= 420 && w < 0.8) {
      errors.push(`right legend leaves only ${roundTo4(w * 100)}% plot width in ${roundTo4(frame.widthPx)}px frame`);
    }
    addCheck(
      checks,
      `chart.${chartNumber}.manual-layout.${index}`,
      errors.length === 0,
      errors.length === 0 ? `Chart ${chartNumber} manual layout ${index + 1} stays within frame bounds.` : `Chart ${chartNumber} ${errors.join("; ")}.`
    );
    index += 1;
  }
}
function collectThemeSchemaChecks(checks, themePath, themeTree) {
  if (!themeTree) return;
  const requiredColorElements = [
    "a:dk1",
    "a:lt1",
    "a:dk2",
    "a:lt2",
    "a:accent1",
    "a:accent2",
    "a:accent3",
    "a:accent4",
    "a:accent5",
    "a:accent6",
    "a:hlink",
    "a:folHlink"
  ];
  const colorScheme = findAllElements(themeTree, "a:clrScheme")[0];
  addCheck(
    checks,
    `theme.${themePath}.color-scheme`,
    Boolean(colorScheme),
    colorScheme ? `${themePath} includes a color scheme.` : `${themePath} is missing a:clrScheme.`
  );
  if (colorScheme) {
    const childTags = getChildTagNames(colorScheme);
    for (const required of requiredColorElements) {
      addCheck(
        checks,
        `theme.${themePath}.color.${required}`,
        childTags.includes(required),
        childTags.includes(required) ? `${themePath} color scheme includes ${required}.` : `${themePath} color scheme is missing ${required}.`
      );
    }
  }
  const fontScheme = findAllElements(themeTree, "a:fontScheme")[0];
  addCheck(
    checks,
    `theme.${themePath}.font-scheme`,
    Boolean(fontScheme),
    fontScheme ? `${themePath} includes a font scheme.` : `${themePath} is missing a:fontScheme.`
  );
  if (!fontScheme) return;
  for (const tag of ["a:majorFont", "a:minorFont"]) {
    const fontElement = getChildren(fontScheme).find((child) => getTagName(child) === tag);
    addCheck(
      checks,
      `theme.${themePath}.${tag}`,
      Boolean(fontElement),
      fontElement ? `${themePath} includes ${tag}.` : `${themePath} is missing ${tag}.`
    );
    const latinElement = fontElement ? findAllElements([fontElement], "a:latin")[0] : void 0;
    const hasTypeface = latinElement ? Boolean(getAttr(latinElement, "typeface")) : false;
    addCheck(
      checks,
      `theme.${themePath}.${tag}.latin`,
      hasTypeface,
      hasTypeface ? `${themePath} ${tag} has a latin typeface.` : `${themePath} ${tag} is missing a latin typeface.`
    );
  }
}
function collectSlideLayoutMasterChainChecks(checks, slidePath, packagePathSet, parsedXmlByPath) {
  const slideNumber = slidePath.match(/slide(\d+)/)?.[1] ?? "?";
  const slideRelsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
  const slideRelsTree = parsedXmlByPath.get(slideRelsPath);
  if (!packagePathSet.has(slideRelsPath) || !slideRelsTree) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.slide-rels`,
      false,
      `${slidePath} is missing parseable relationships file ${slideRelsPath}.`
    );
    return;
  }
  const layoutRel = findAllElements(slideRelsTree, "Relationship").find((rel) => (getAttr(rel, "Type") ?? "").includes("/slideLayout"));
  const layoutTarget = layoutRel ? getAttr(layoutRel, "Target") : void 0;
  if (!layoutTarget) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.layout-rel`,
      false,
      `${slidePath} has no slideLayout relationship.`
    );
    return;
  }
  const layoutPath = resolveRelTarget(slideRelsPath, layoutTarget);
  if (!packagePathSet.has(layoutPath)) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.layout-target`,
      false,
      `${slidePath} layout target ${layoutPath} is missing.`
    );
    return;
  }
  const layoutRelsPath = layoutPath.replace("ppt/slideLayouts/", "ppt/slideLayouts/_rels/") + ".rels";
  const layoutRelsTree = parsedXmlByPath.get(layoutRelsPath);
  if (!packagePathSet.has(layoutRelsPath) || !layoutRelsTree) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.layout-rels`,
      false,
      `${layoutPath} is missing parseable relationships file ${layoutRelsPath}.`
    );
    return;
  }
  const masterRel = findAllElements(layoutRelsTree, "Relationship").find((rel) => (getAttr(rel, "Type") ?? "").includes("/slideMaster"));
  const masterTarget = masterRel ? getAttr(masterRel, "Target") : void 0;
  if (!masterTarget) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.master-rel`,
      false,
      `${layoutPath} has no slideMaster relationship.`
    );
    return;
  }
  const masterPath = resolveRelTarget(layoutRelsPath, masterTarget);
  addCheck(
    checks,
    `slide.${slideNumber}.layout-chain.master-target`,
    packagePathSet.has(masterPath),
    packagePathSet.has(masterPath) ? `${layoutPath} resolves to slide master ${masterPath}.` : `${layoutPath} master target ${masterPath} is missing.`
  );
}
function collectNamespaceConsistencyChecks(checks, chartPath, chartXml) {
  if (!chartXml) return;
  const fileName = chartPath.split("/").pop() ?? "";
  if (/^chartEx\d*\.xml$/.test(fileName)) {
    addCheck(
      checks,
      `namespace.${chartPath}`,
      chartXml.includes("cx:"),
      chartXml.includes("cx:") ? `${chartPath} uses the ChartEx namespace.` : `${chartPath} is a ChartEx part but does not use the cx namespace.`
    );
  } else if (/^chart\d*\.xml$/.test(fileName)) {
    addCheck(
      checks,
      `namespace.${chartPath}`,
      chartXml.includes("c:"),
      chartXml.includes("c:") ? `${chartPath} uses the classic chart namespace.` : `${chartPath} is a classic chart part but does not use the c namespace.`
    );
  }
}
async function validatePptxStructure(buffer) {
  const checks = [];
  try {
    const zip = await import_jszip.default.loadAsync(buffer);
    const packagePaths = getPackagePaths(zip);
    const packagePathSet = new Set(packagePaths);
    const parsedXmlByPath = /* @__PURE__ */ new Map();
    const xmlTextByPath = /* @__PURE__ */ new Map();
    const referencedTargets = /* @__PURE__ */ new Set();
    addCheck(
      checks,
      "package.content-types",
      packagePathSet.has("[Content_Types].xml"),
      packagePathSet.has("[Content_Types].xml") ? "Package includes [Content_Types].xml." : "Package is missing [Content_Types].xml."
    );
    addCheck(
      checks,
      "package.presentation",
      packagePathSet.has("ppt/presentation.xml"),
      packagePathSet.has("ppt/presentation.xml") ? "Package includes ppt/presentation.xml." : "Package is missing ppt/presentation.xml."
    );
    addCheck(
      checks,
      "package.presentation-rels",
      packagePathSet.has("ppt/_rels/presentation.xml.rels"),
      packagePathSet.has("ppt/_rels/presentation.xml.rels") ? "Presentation relationships file is present." : "Presentation relationships file is missing."
    );
    for (const path of packagePaths.filter((path2) => path2.endsWith(".xml") || path2.endsWith(".rels"))) {
      const text = await readText(zip, path);
      if (text !== void 0) xmlTextByPath.set(path, text);
      parsedXmlByPath.set(path, await loadZipXml(zip, path, checks));
    }
    const contentTypesTree = parsedXmlByPath.get("[Content_Types].xml") ?? null;
    collectContentTypeChecks(checks, contentTypesTree, packagePaths);
    const presentationTree = parsedXmlByPath.get("ppt/presentation.xml") ?? null;
    collectPresentationChecks(checks, presentationTree);
    const slideFiles = packagePaths.filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file)).sort((a, b) => {
      const aNumber = Number.parseInt(a.match(/slide(\d+)/)?.[1] ?? "0", 10);
      const bNumber = Number.parseInt(b.match(/slide(\d+)/)?.[1] ?? "0", 10);
      return aNumber - bNumber;
    });
    addCheck(
      checks,
      "slides.present",
      slideFiles.length > 0,
      slideFiles.length > 0 ? `Package contains ${slideFiles.length} slide part(s).` : "Package contains no slide parts."
    );
    for (const slideFile of slideFiles) {
      const slideNumber = slideFile.match(/slide(\d+)/)?.[1] ?? "?";
      const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const slideTree = parsedXmlByPath.get(slideFile) ?? null;
      const relsTree = parsedXmlByPath.get(relsPath) ?? null;
      addCheck(
        checks,
        `slide.${slideNumber}.rels`,
        packagePathSet.has(relsPath),
        packagePathSet.has(relsPath) ? `Slide ${slideNumber} relationships file is present.` : `Slide ${slideNumber} relationships file is missing.`
      );
      addCheck(
        checks,
        `slide.${slideNumber}.content-type`,
        contentTypesTree ? !checks.some((check) => check.id === `package.content-type.${slideFile}` && !check.passed) : false,
        contentTypesTree && !checks.some((check) => check.id === `package.content-type.${slideFile}` && !check.passed) ? `Slide ${slideNumber} has a declared content type.` : `Slide ${slideNumber} is missing from [Content_Types].xml.`
      );
      collectDuplicateShapeIdChecks(checks, slideNumber, slideTree);
      collectRequiredAttributeChecks(checks, slideNumber, slideTree);
      collectAutoFitChecks(checks, slideNumber, slideTree);
      collectLongTableTextChecks(checks, slideNumber, slideTree);
      collectCustomDataConflictChecks(checks, slideNumber, slideTree);
      collectSlideRefChecks(checks, slideNumber, slideTree, relsTree);
      collectSlideLayoutMasterChainChecks(checks, slideFile, packagePathSet, parsedXmlByPath);
    }
    const relsFiles = packagePaths.filter((file) => file.endsWith(".rels")).sort();
    for (const relsPath of relsFiles) {
      collectRelationshipChecks(
        checks,
        relsPath,
        parsedXmlByPath.get(relsPath) ?? null,
        packagePathSet,
        referencedTargets
      );
    }
    collectReachablePartChecks(checks, packagePaths, referencedTargets);
    const frameByChart = collectClassicChartFrames(zip, parsedXmlByPath);
    const chartFiles = packagePaths.filter((file) => /^ppt\/charts\/chart\d+\.xml$/.test(file)).sort((a, b) => {
      const aNumber = Number.parseInt(a.match(/chart(\d+)/)?.[1] ?? "0", 10);
      const bNumber = Number.parseInt(b.match(/chart(\d+)/)?.[1] ?? "0", 10);
      return aNumber - bNumber;
    });
    for (const chartFile of chartFiles) {
      const chartNumber = chartFile.match(/chart(\d+)/)?.[1] ?? "?";
      const relsPath = `ppt/charts/_rels/chart${chartNumber}.xml.rels`;
      const chartTree = parsedXmlByPath.get(chartFile) ?? null;
      const relsTree = parsedXmlByPath.get(relsPath) ?? null;
      addCheck(
        checks,
        `chart.${chartNumber}.rels`,
        packagePathSet.has(relsPath),
        packagePathSet.has(relsPath) ? `Chart ${chartNumber} relationships file is present.` : `Chart ${chartNumber} relationships file is missing.`
      );
      addCheck(
        checks,
        `chart.${chartNumber}.content-type`,
        contentTypesTree ? !checks.some((check) => check.id === `package.content-type.${chartFile}` && !check.passed) : false,
        contentTypesTree && !checks.some((check) => check.id === `package.content-type.${chartFile}` && !check.passed) ? `Chart ${chartNumber} has a declared content type.` : `Chart ${chartNumber} is missing from [Content_Types].xml.`
      );
      collectChartFormatCodeChecks(checks, chartNumber, chartTree);
      collectChartWorkbookChecks(checks, chartNumber, relsPath, relsTree, packagePathSet);
      collectChartManualLayoutBoundsChecks(checks, chartFile, chartNumber, chartTree, frameByChart);
      collectNamespaceConsistencyChecks(checks, chartFile, xmlTextByPath.get(chartFile));
    }
    const chartExFiles = packagePaths.filter((file) => /^ppt\/charts\/chartEx\d+\.xml$/.test(file));
    for (const chartExFile of chartExFiles) {
      collectNamespaceConsistencyChecks(checks, chartExFile, xmlTextByPath.get(chartExFile));
    }
    const themeFiles = packagePaths.filter((file) => /^ppt\/theme\/theme\d*\.xml$/.test(file));
    addCheck(
      checks,
      "theme.present",
      themeFiles.length > 0,
      themeFiles.length > 0 ? `Package contains ${themeFiles.length} theme part(s).` : "Package contains no theme files in ppt/theme/."
    );
    for (const themePath of themeFiles) {
      collectThemeSchemaChecks(checks, themePath, parsedXmlByPath.get(themePath) ?? null);
    }
    const failureCount = checks.filter((check) => !check.passed && check.severity === "error").length;
    return {
      status: failureCount === 0 ? "passed" : "failed",
      checks,
      failureCount
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      checks: [
        {
          id: "package.load",
          passed: false,
          severity: "error",
          message: `Failed to open PPTX package: ${message}`
        }
      ],
      failureCount: 1
    };
  }
}

// src/quality/repair.ts
var import_jszip2 = __toESM(require_lib(), 1);
var patchParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: false
});
var patchBuilder = new json2xml_default({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressBooleanAttributes: false,
  format: true
});
function findAllElementsDeep(nodes, tag) {
  const results = [];
  function walk(value) {
    if (!Array.isArray(value)) return;
    for (const node of value) {
      if (!node || typeof node !== "object") continue;
      for (const key of Object.keys(node)) {
        if (key === ":@" || key === "#text") continue;
        if (key === tag) results.push(node);
        walk(node[key]);
      }
    }
  }
  walk(nodes);
  return results;
}
function getElementTag(node) {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text");
}
function resolveParentDir(relsFilePath) {
  const parts = relsFilePath.split("/");
  const relsIdx = parts.lastIndexOf("_rels");
  if (relsIdx >= 0) {
    return parts.slice(0, relsIdx).join("/");
  }
  return parts.slice(0, -1).join("/");
}
function resolveTarget(parentDir, target) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = parentDir ? parentDir.split("/") : [];
  for (const part of target.split("/")) {
    if (part === "..") {
      parts.pop();
    } else if (part !== "." && part !== "") {
      parts.push(part);
    }
  }
  return parts.join("/");
}
function dedupeSlideIds(xml) {
  const seenIds = /* @__PURE__ */ new Set();
  let nextSlideId = 256;
  return xml.replace(/(<p:sldId\b[^>]*\bid=")(\d+)(")/g, (_match, prefix, id, suffix) => {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      nextSlideId = Math.max(nextSlideId, numericId + 1);
    }
    if (!seenIds.has(id)) {
      seenIds.add(id);
      return `${prefix}${id}${suffix}`;
    }
    const replacement = String(nextSlideId++);
    seenIds.add(replacement);
    return `${prefix}${replacement}${suffix}`;
  });
}
function addNormAutofitFontScale(xml) {
  return xml.replace(/<a:normAutofit\b(?![^>]*\bfontScale=)([^>]*)\/?>/g, (_match, attrs) => `<a:normAutofit${attrs} fontScale="100000"/>`);
}
function escapeChartFormatCodes(xml) {
  return xml.replace(/<c:formatCode>([\s\S]*?)<\/c:formatCode>/g, (_match, formatCode) => {
    const escaped = formatCode.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<c:formatCode>${escaped}</c:formatCode>`;
  });
}
function collapseCustDataLists(xml) {
  let seen = false;
  return xml.replace(/<p:custDataLst\b[\s\S]*?<\/p:custDataLst>/g, (match) => {
    if (seen) {
      return "";
    }
    seen = true;
    return match;
  });
}
function removeDuplicateContentTypes(xml) {
  const tree = patchParser.parse(xml);
  const typesEl = Array.isArray(tree) ? tree.find((element) => element.Types) : void 0;
  if (!typesEl?.Types || !Array.isArray(typesEl.Types)) return xml;
  const seenExtensions = /* @__PURE__ */ new Set();
  const seenPartNames = /* @__PURE__ */ new Set();
  const filtered = [];
  for (const child of typesEl.Types) {
    const tag = getElementTag(child);
    if (tag === "Default") {
      const ext = child?.[":@"]?.["@_Extension"];
      if (ext && seenExtensions.has(ext.toLowerCase())) continue;
      if (ext) seenExtensions.add(ext.toLowerCase());
    } else if (tag === "Override") {
      const part = child?.[":@"]?.["@_PartName"];
      if (part && seenPartNames.has(part.toLowerCase())) continue;
      if (part) seenPartNames.add(part.toLowerCase());
    }
    filtered.push(child);
  }
  typesEl.Types = filtered;
  return patchBuilder.build(tree);
}
function addMissingAttributes(xml, rules) {
  const tree = patchParser.parse(xml);
  for (const rule of rules) {
    const elements = findAllElementsDeep(tree, rule.tag);
    for (const element of elements) {
      if (!element[":@"]) element[":@"] = {};
      if (!element[":@"][`@_${rule.attr}`]) {
        element[":@"][`@_${rule.attr}`] = rule.value;
      }
    }
  }
  return patchBuilder.build(tree);
}
function reorderElements(xml, parentTag, expectedOrder) {
  const tree = patchParser.parse(xml);
  const parents = findAllElementsDeep(tree, parentTag);
  for (const parent of parents) {
    const children = parent[parentTag];
    if (!Array.isArray(children)) continue;
    const ordered = [];
    const unordered = [];
    for (const child of children) {
      const childTag = getElementTag(child);
      if (childTag && expectedOrder.includes(childTag)) {
        ordered.push(child);
      } else {
        unordered.push(child);
      }
    }
    ordered.sort((a, b) => {
      const aTag = getElementTag(a) ?? "";
      const bTag = getElementTag(b) ?? "";
      return expectedOrder.indexOf(aTag) - expectedOrder.indexOf(bTag);
    });
    parent[parentTag] = [...ordered, ...unordered];
  }
  return patchBuilder.build(tree);
}
function removeOrphanedRelationships(relsXml, zipPaths, relsFilePath) {
  const tree = patchParser.parse(relsXml);
  const relsRoot = Array.isArray(tree) ? tree.find((element) => element.Relationships) : void 0;
  if (!relsRoot?.Relationships || !Array.isArray(relsRoot.Relationships)) return relsXml;
  const parentDir = resolveParentDir(relsFilePath);
  relsRoot.Relationships = relsRoot.Relationships.filter((child) => {
    const tag = getElementTag(child);
    if (tag !== "Relationship") return true;
    const targetMode = child?.[":@"]?.["@_TargetMode"];
    if (targetMode === "External") return true;
    const target = child?.[":@"]?.["@_Target"];
    if (!target) return true;
    return zipPaths.has(resolveTarget(parentDir, target));
  });
  return patchBuilder.build(tree);
}
function semanticallyChanged(original, fixed) {
  const normalize = (xml) => xml.replace(/>\s+</g, "><").replace(/<([A-Za-z][\w:.-]*)((?:\s[^<>]*?)?)><\/\1>/g, "<$1$2/>").trim();
  return normalize(original) !== normalize(fixed);
}
async function repairPptxStructure(buffer) {
  const zip = await import_jszip2.default.loadAsync(buffer);
  const actions = [];
  const zipPaths = new Set(
    Object.keys(zip.files).filter((path) => !zip.files[path].dir)
  );
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (contentTypesFile) {
    const original = await contentTypesFile.async("string");
    const fixed = removeDuplicateContentTypes(original);
    if (fixed !== original && semanticallyChanged(original, fixed)) {
      zip.file("[Content_Types].xml", fixed, { date: contentTypesFile.date });
      actions.push({
        id: "remove_duplicate_content_types",
        description: "Removed duplicate Default and Override entries from [Content_Types].xml.",
        file: "[Content_Types].xml"
      });
    }
  }
  const attributeRules = [
    { tag: "a:latin", attr: "typeface", value: "Calibri" },
    { tag: "a:ea", attr: "typeface", value: "" },
    { tag: "a:cs", attr: "typeface", value: "" }
  ];
  for (const path of zipPaths) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(path)) continue;
    const original = await zip.files[path].async("string");
    const withFontAttrs = addMissingAttributes(original, attributeRules);
    const withFontScale = addNormAutofitFontScale(withFontAttrs);
    const fixed = collapseCustDataLists(withFontScale);
    const fontAttrsChanged = semanticallyChanged(original, withFontAttrs);
    const fontScaleChanged = semanticallyChanged(withFontAttrs, withFontScale);
    const custDataChanged = semanticallyChanged(withFontScale, fixed);
    if (fontAttrsChanged || fontScaleChanged || custDataChanged) {
      zip.file(path, fixed, { date: zip.files[path].date });
      if (fontAttrsChanged) {
        actions.push({
          id: "fill_missing_font_typefaces",
          description: "Added missing typeface attributes required by PowerPoint font elements.",
          file: path
        });
      }
      if (fontScaleChanged) {
        actions.push({
          id: "add_normautofit_font_scale",
          description: "Added explicit fontScale attributes to normAutofit nodes.",
          file: path
        });
      }
      if (custDataChanged) {
        actions.push({
          id: "collapse_custdatalist",
          description: "Collapsed duplicate custDataLst blocks to a single surviving list.",
          file: path
        });
      }
    }
  }
  const presentationFile = zip.file("ppt/presentation.xml");
  if (presentationFile) {
    const original = await presentationFile.async("string");
    const reordered = reorderElements(
      original,
      "p:presentation",
      [...PRESENTATION_CHILD_ORDER]
    );
    const fixed = dedupeSlideIds(reordered);
    const orderChanged = semanticallyChanged(original, reordered);
    const slideIdsChanged = semanticallyChanged(reordered, fixed);
    if (orderChanged || slideIdsChanged) {
      zip.file("ppt/presentation.xml", fixed, { date: presentationFile.date });
      if (orderChanged) {
        actions.push({
          id: "reorder_presentation_elements",
          description: "Reordered presentation children to match OOXML schema sequence.",
          file: "ppt/presentation.xml"
        });
      }
      if (slideIdsChanged) {
        actions.push({
          id: "dedupe_slide_ids",
          description: "Reassigned duplicate slide ids in ppt/presentation.xml.",
          file: "ppt/presentation.xml"
        });
      }
    }
  }
  for (const path of zipPaths) {
    if (!/^ppt\/charts\/chart\d+\.xml$/.test(path)) continue;
    const original = await zip.files[path].async("string");
    const fixed = escapeChartFormatCodes(original);
    if (fixed !== original && semanticallyChanged(original, fixed)) {
      zip.file(path, fixed, { date: zip.files[path].date });
      actions.push({
        id: "escape_chart_format_codes",
        description: "Escaped XML-sensitive characters inside chart formatCode elements.",
        file: path
      });
    }
  }
  for (const path of zipPaths) {
    if (!path.endsWith(".rels")) continue;
    const original = await zip.files[path].async("string");
    const fixed = removeOrphanedRelationships(original, zipPaths, path);
    if (fixed !== original && semanticallyChanged(original, fixed)) {
      zip.file(path, fixed, { date: zip.files[path].date });
      actions.push({
        id: "remove_orphaned_relationships",
        description: "Removed relationships whose targets are missing from the package.",
        file: path
      });
    }
  }
  return {
    // Do not silently repackage a deck when every apparent change was only XML
    // formatting. A no-op repair should preserve the caller's bytes exactly.
    buffer: actions.length === 0 ? buffer : await zip.generateAsync({ type: "nodebuffer" }),
    actions
  };
}
async function validateAndRepairPptx(buffer) {
  const initialValidation = await validatePptxStructure(buffer);
  if (initialValidation.status === "passed") {
    return {
      buffer,
      initialValidation,
      finalValidation: initialValidation,
      repairSummary: {
        state: "not_needed",
        actions: [],
        initialFailureCount: 0,
        finalFailureCount: 0
      }
    };
  }
  const repaired = await repairPptxStructure(buffer);
  const finalValidation = await validatePptxStructure(repaired.buffer);
  const state = repaired.actions.length === 0 ? "failed" : finalValidation.status === "passed" ? "repaired" : "failed";
  return {
    buffer: repaired.buffer,
    initialValidation,
    finalValidation,
    repairSummary: {
      state,
      actions: repaired.actions,
      initialFailureCount: initialValidation.failureCount,
      finalFailureCount: finalValidation.failureCount
    }
  };
}

export {
  compatibilityModeToFallbackLevel,
  getDefaultMaxFallbackLevel,
  buildQualityReport,
  mergeDesktopValidationIntoQualityReport,
  assertQualityContract,
  validatePptxStructure,
  repairPptxStructure,
  validateAndRepairPptx
};
//# sourceMappingURL=chunk-NK2A5B54.js.map
