import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);

// src/quality/accessibility-contract.ts
function summarizeAccessibilityIssues(issues) {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const issue of issues) {
    if (issue.severity === "error") {
      errors += 1;
    } else if (issue.severity === "warning") {
      warnings += 1;
    } else {
      infos += 1;
    }
  }
  return { errors, warnings, infos };
}
function createAccessibilityReport(options) {
  const issues = [...options.issues];
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    summary: summarizeAccessibilityIssues(issues),
    issues,
    format: options.format,
    standard: options.standard
  };
}

// src/quality/accessibilityValidator.ts
function normalizeDocumentMetadata(doc) {
  const accessibilityConfig = doc.accessible && doc.accessible !== true ? doc.accessible : void 0;
  if (!accessibilityConfig) {
    return doc;
  }
  if (accessibilityConfig.language === void 0 && accessibilityConfig.title === void 0) {
    return doc;
  }
  return {
    ...doc,
    meta: {
      ...doc.meta,
      language: accessibilityConfig.language ?? doc.meta?.language,
      title: accessibilityConfig.title ?? doc.meta?.title
    }
  };
}
function mapLegacyViolationToCanonical(violation) {
  let code;
  if (violation.code === "ALT_TEXT_MISSING" || violation.code === "EMPTY_ALT_TEXT") {
    code = "image.alt_missing";
  } else if (violation.code === "TABLE_HEADER_MISSING") {
    code = "table.header_missing";
  } else if (violation.code === "DOC_TITLE_MISSING") {
    code = "document.title_missing";
  } else if (violation.code === "DOC_LANG_MISSING") {
    code = "document.language_missing";
  }
  if (!code) {
    return void 0;
  }
  const location = violation.slideIndex !== void 0 || violation.elementPath ? {
    slideIndex: violation.slideIndex,
    elementPath: violation.elementPath
  } : void 0;
  return {
    code,
    severity: code === "document.title_missing" ? "warning" : violation.severity,
    message: violation.message,
    location,
    suggestedFix: violation.remediation
  };
}
function walkNodes(nodes, callback, parentPath = "") {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = parentPath ? `${parentPath}.children[${i}]` : `children[${i}]`;
    callback(node, path);
    if (node.type === "View" && node.children) {
      walkNodes(node.children, callback, path);
    } else if (node.type === "Group" && node.children) {
      walkNodes(node.children, callback, path);
    }
  }
}
function hasTextNode(nodes) {
  for (const node of nodes) {
    if (node.type === "Text") return true;
    if (node.type === "View" && node.children && hasTextNode(node.children)) return true;
    if (node.type === "Group" && node.children && hasTextNode(node.children)) return true;
  }
  return false;
}
var ALT_TEXT_TYPES = /* @__PURE__ */ new Set(["Image", "Chart", "View", "Table", "Connector", "Group", "Video", "Audio"]);
function checkAltText(node, path, slideIndex, violations) {
  if (!ALT_TEXT_TYPES.has(node.type)) return;
  const n = node;
  if (n.decorative === true) return;
  if (n.altText === void 0 || n.altText === null) {
    violations.push({
      code: "ALT_TEXT_MISSING",
      severity: "error",
      message: `${node.type} element at ${path} is missing alternative text.`,
      slideIndex,
      elementPath: path,
      remediation: "Add an altText property or mark the element as decorative."
    });
  } else if (n.altText === "") {
    violations.push({
      code: "EMPTY_ALT_TEXT",
      severity: "warning",
      message: `${node.type} element at ${path} has empty alternative text.`,
      slideIndex,
      elementPath: path,
      remediation: "Provide a meaningful altText description or mark the element as decorative."
    });
  }
}
function checkTableHeaders(node, path, slideIndex, violations) {
  if (node.type !== "Table") return;
  if (!node.tableData?.style?.firstRow) {
    violations.push({
      code: "TABLE_HEADER_MISSING",
      severity: "warning",
      message: `Table at ${path} does not have a header row defined.`,
      slideIndex,
      elementPath: path,
      remediation: "Set tableData.style.firstRow to true to designate the first row as a header."
    });
  }
}
function checkSlideTitle(slide, slideIndex, violations) {
  if (!hasTextNode(slide.children)) {
    violations.push({
      code: "SLIDE_TITLE_MISSING",
      severity: "warning",
      message: `Slide ${slideIndex + 1} has no text content that could serve as a title.`,
      slideIndex,
      elementPath: `slides[${slideIndex}]`,
      remediation: "Add a Text element to the slide to provide a title for screen readers."
    });
    return false;
  }
  return true;
}
function checkDocTitle(doc, violations) {
  if (!doc.meta?.title) {
    violations.push({
      code: "DOC_TITLE_MISSING",
      severity: "error",
      message: "Document is missing a title in meta.title.",
      remediation: "Set meta.title to a descriptive document title."
    });
    return false;
  }
  return true;
}
function checkDocLanguage(doc, violations) {
  if (!doc.meta?.language) {
    violations.push({
      code: "DOC_LANG_MISSING",
      severity: "warning",
      message: "Document language is not specified in meta.language.",
      remediation: 'Set meta.language to a BCP 47 language tag (e.g. "en").'
    });
    return false;
  }
  return true;
}
function checkReadingOrder(slide, slideIndex, violations) {
  const elements = [];
  walkNodes(slide.children, (node, path) => {
    const n = node;
    if (n.readingOrder === void 0 || n.readingOrder === null) return;
    const top = n.style?.top;
    const left = n.style?.left;
    if (top === void 0 || left === void 0) return;
    elements.push({ readingOrder: n.readingOrder, top, left });
  });
  if (elements.length < 2) return;
  const byReadingOrder = [...elements].sort((a, b) => a.readingOrder - b.readingOrder);
  const byPosition = [...elements].sort((a, b) => a.top !== b.top ? a.top - b.top : a.left - b.left);
  let mismatches = 0;
  for (let i = 0; i < byReadingOrder.length; i++) {
    if (byReadingOrder[i] !== byPosition[i]) {
      mismatches++;
    }
  }
  if (mismatches > 0) {
    violations.push({
      code: "READING_ORDER_VISUAL_MISMATCH",
      severity: "warning",
      message: `Slide ${slideIndex + 1} has ${mismatches} element(s) where reading order contradicts visual position.`,
      slideIndex,
      elementPath: `slides[${slideIndex}]`,
      remediation: "Adjust readingOrder values to match the top-to-bottom, left-to-right visual layout."
    });
  }
}
function parseHexColor(hex) {
  if (typeof hex !== "string") return void 0;
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]+$/.test(clean)) return void 0;
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return void 0;
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return void 0;
    return { r, g, b };
  }
  return void 0;
}
function linearize(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r / 255) + 0.7152 * linearize(g / 255) + 0.0722 * linearize(b / 255);
}
function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function resolveBackgroundColor(slide) {
  if (slide.background?.type === "solid" && typeof slide.background.color === "string") {
    return slide.background.color;
  }
  return void 0;
}
function checkContrastRatio(node, path, slideIndex, slide, violations) {
  if (node.type !== "Text") return;
  const textColor = node.style?.color;
  if (typeof textColor !== "string") return;
  const fgParsed = parseHexColor(textColor);
  if (!fgParsed) return;
  const bgHex = resolveBackgroundColor(slide);
  if (!bgHex) return;
  const bgParsed = parseHexColor(bgHex);
  if (!bgParsed) return;
  const fgLum = relativeLuminance(fgParsed.r, fgParsed.g, fgParsed.b);
  const bgLum = relativeLuminance(bgParsed.r, bgParsed.g, bgParsed.b);
  const ratio = contrastRatio(fgLum, bgLum);
  if (ratio < 3) {
    violations.push({
      code: "CONTRAST_RATIO",
      severity: "error",
      message: `Text at ${path} has a contrast ratio of ${ratio.toFixed(2)}:1, below the 3:1 minimum.`,
      slideIndex,
      elementPath: path,
      remediation: "Increase the contrast between text color and background to at least 3:1."
    });
  } else if (ratio < 4.5) {
    violations.push({
      code: "CONTRAST_RATIO",
      severity: "warning",
      message: `Text at ${path} has a contrast ratio of ${ratio.toFixed(2)}:1, below the 4.5:1 WCAG AA threshold for normal text.`,
      slideIndex,
      elementPath: path,
      remediation: "Increase the contrast between text color and background to at least 4.5:1 for WCAG AA compliance."
    });
  }
}
function validateAccessibility(doc) {
  const normalized = normalizeDocumentMetadata(doc);
  const all = [];
  let totalElements = 0;
  let withAltText = 0;
  let withoutAltText = 0;
  let decorativeMarked = 0;
  let tablesWithHeaders = 0;
  let tablesWithoutHeaders = 0;
  let slidesWithTitle = 0;
  let slidesWithoutTitle = 0;
  const documentTitleSet = checkDocTitle(normalized, all);
  const languageSet = checkDocLanguage(normalized, all);
  for (let slideIndex = 0; slideIndex < normalized.slides.length; slideIndex++) {
    const slide = normalized.slides[slideIndex];
    if (checkSlideTitle(slide, slideIndex, all)) {
      slidesWithTitle++;
    } else {
      slidesWithoutTitle++;
    }
    checkReadingOrder(slide, slideIndex, all);
    walkNodes(slide.children, (node, path) => {
      const fullPath = `slides[${slideIndex}].${path}`;
      totalElements++;
      if (ALT_TEXT_TYPES.has(node.type)) {
        const n = node;
        if (n.decorative === true) {
          decorativeMarked++;
        } else if (n.altText && n.altText.length > 0) {
          withAltText++;
        } else {
          withoutAltText++;
        }
      }
      if (node.type === "Table") {
        if (node.tableData?.style?.firstRow) {
          tablesWithHeaders++;
        } else {
          tablesWithoutHeaders++;
        }
      }
      checkAltText(node, fullPath, slideIndex, all);
      checkTableHeaders(node, fullPath, slideIndex, all);
      checkContrastRatio(node, fullPath, slideIndex, slide, all);
    });
  }
  const errors = all.filter((v) => v.severity === "error");
  const warnings = all.filter((v) => v.severity === "warning");
  const score = Math.max(0, Math.min(100, 100 - errors.length * 10 - warnings.length * 3));
  const canonicalIssues = all.map((violation) => mapLegacyViolationToCanonical(violation)).filter((issue) => issue !== void 0);
  const canonicalReport = createAccessibilityReport({
    format: "pptx",
    issues: canonicalIssues,
    standard: "WCAG 2.2 AA"
  });
  let level = "A";
  if (score >= 95 && errors.length === 0) level = "AAA";
  else if (score >= 80 && errors.length === 0) level = "AA";
  return {
    ...canonicalReport,
    score,
    level,
    violations: errors,
    warnings,
    summary: {
      ...canonicalReport.summary,
      totalElements,
      withAltText,
      withoutAltText,
      decorativeMarked,
      tablesWithHeaders,
      tablesWithoutHeaders,
      slidesWithTitle,
      slidesWithoutTitle,
      languageSet,
      documentTitleSet
    }
  };
}

export {
  validateAccessibility
};
//# sourceMappingURL=chunk-D2UD22HS.js.map
