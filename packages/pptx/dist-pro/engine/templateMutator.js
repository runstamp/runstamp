import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  YIELD_FREQUENCY,
  assertPowerPointFontEmbeddingAvailable,
  checkAborted,
  collectSlideResult,
  createSlideResultCollector,
  hasAnyNotes,
  processDocumentComments,
  processDocumentFonts,
  processSlideLayout,
  validateCrossSlideHyperlinks,
  yieldToEventLoop
} from "../chunk-6AZ326SJ.js";
import {
  assembleFromTemplate
} from "../chunk-3MAFQYVW.js";
import {
  createMediaFetchBudget
} from "../chunk-OV2ZPS4E.js";
import "../chunk-56BKZXEH.js";
import "../chunk-VETY33ST.js";
import {
  parseTemplate,
  resolveTextStyle
} from "../chunk-JHKUGPWV.js";
import {
  summarizeDocumentCompatibility
} from "../chunk-EE5SX3QK.js";
import "../chunk-GRNMJIZR.js";
import {
  flattenDocumentZIndex,
  validateDocument
} from "../chunk-ADNRG6JQ.js";
import {
  PIXEL_TO_EMU
} from "../chunk-QZ7YLVPL.js";
import "../chunk-5CDPNZPI.js";
import {
  autoLoadDocumentFonts
} from "../chunk-FUBHCOLD.js";
import "../chunk-BKM7I4JR.js";
import "../chunk-FL4YUJCS.js";
import "../chunk-6QXZRXYS.js";
import "../chunk-66EJ4WIS.js";
import "../chunk-SHJL7Z52.js";
import "../chunk-ZLZIUC4K.js";
import "../chunk-BF4WWWMZ.js";
import "../chunk-MA6IZLCE.js";
import "../chunk-SV4OEGHV.js";
import "../chunk-QSVRDIHM.js";
import "../chunk-PUKAI6X5.js";
import "../chunk-625BFJJW.js";
import "../chunk-2W7D7VOC.js";
import "../chunk-YWT5KXVL.js";
import {
  runLayout
} from "../chunk-4IGUCOJJ.js";
import "../chunk-DYXX63XE.js";
import "../chunk-P5JGOT4P.js";
import "../chunk-3O47XGMU.js";
import {
  getLogger
} from "../chunk-HZBNNQK3.js";
import "../chunk-S4LZHR2L.js";
import {
  PaperError
} from "../chunk-JXY3OJQ6.js";
import "../chunk-OWC7QHPZ.js";

// src/template/layoutMapper.ts
function mapSlideToLayout(slide, templateIndex) {
  if (!slide.layoutName) return null;
  const layout = templateIndex.layouts.find(
    (l) => l.name.toLowerCase() === slide.layoutName.toLowerCase()
  );
  if (!layout) return null;
  return {
    layout,
    placeholders: layout.placeholders
  };
}
function resolveLayoutTarget(layoutName, templateIndex) {
  if (!layoutName) return null;
  const index = templateIndex.layouts.findIndex(
    (l) => l.name.toLowerCase() === layoutName.toLowerCase()
  );
  if (index === -1) return null;
  return `../slideLayouts/slideLayout${index + 1}.xml`;
}

// src/template/placeholderInjector.ts
function injectPlaceholderGeometry(slide, placeholders, masterTextStyles, theme) {
  for (const child of slide.children) {
    injectNode(child, placeholders, masterTextStyles, theme);
  }
}
function injectNode(node, placeholders, masterTextStyles, theme) {
  const ph = node.placeholder;
  if (!ph) return;
  const info = findPlaceholder(ph, placeholders);
  if (!info) return;
  const style = node.style ??= {};
  const hasUserWidth = style.width !== void 0;
  const hasUserHeight = style.height !== void 0;
  const hasUserLeft = style.left !== void 0;
  const hasUserTop = style.top !== void 0;
  const hasAnyUserGeometry = hasUserWidth || hasUserHeight || hasUserLeft || hasUserTop;
  if (!hasAnyUserGeometry) {
    style.position = "absolute";
    style.left = info.x / PIXEL_TO_EMU;
    style.top = info.y / PIXEL_TO_EMU;
    style.width = info.cx / PIXEL_TO_EMU;
    style.height = info.cy / PIXEL_TO_EMU;
    node._omitTransform = true;
  }
  if (theme) {
    const resolved = resolveTextStyle(
      info.type ?? ph.type,
      info.textStyle,
      masterTextStyles,
      theme
    );
    injectTypographyDefaults(node, style, resolved);
  }
}
function injectTypographyDefaults(node, style, resolved) {
  if (node.type !== "Text" && node.type !== "View") return;
  const textStyle = getTextStyleTarget(node, style);
  if (resolved.fontFamily && textStyle.fontFamily === void 0) {
    textStyle.fontFamily = resolved.fontFamily;
  }
  if (resolved.fontFamilyEa && textStyle.fontFallback === void 0) {
    textStyle.fontFallback = [resolved.fontFamilyEa];
  }
  if (resolved.fontSize !== void 0 && textStyle.fontSize === void 0) {
    textStyle.fontSize = resolved.fontSize / 100;
  }
  if (resolved.bold && textStyle.fontWeight === void 0) {
    textStyle.fontWeight = "bold";
  }
  if (resolved.italic && textStyle.fontStyle === void 0) {
    textStyle.fontStyle = "italic";
  }
  if (resolved.color && textStyle.color === void 0) {
    textStyle.color = resolved.color;
  }
  if (resolved.lineSpacing !== void 0 && textStyle.lineHeight === void 0) {
    textStyle.lineHeight = resolved.lineSpacing / 75;
  }
}
function getTextStyleTarget(node, style) {
  if (node.type === "View") {
    const view = node;
    view.textStyle ??= {};
    return view.textStyle;
  }
  return style;
}
function findPlaceholder(ref, placeholders) {
  const compatibleTypes = getCompatiblePlaceholderTypes(ref.type);
  if (ref.idx !== void 0) {
    const byIdx = placeholders.find((p) => p.idx === String(ref.idx));
    if (byIdx) return byIdx;
  }
  if (compatibleTypes.length > 0) {
    return placeholders.find((p) => p.type && compatibleTypes.includes(p.type));
  }
  return void 0;
}
function getCompatiblePlaceholderTypes(type) {
  switch (type) {
    case "title":
      return ["title", "ctrTitle"];
    case "ctrTitle":
      return ["ctrTitle", "title"];
    case "subTitle":
      return ["subTitle", "body"];
    case "body":
      return ["body", "subTitle"];
    case "pic":
    case "chart":
    case "tbl":
    case "dgm":
    case "media":
    case "clipArt":
      return [type, "obj"];
    case "obj":
      return ["obj", "pic", "chart", "tbl", "dgm", "media", "clipArt"];
    default:
      return type ? [type] : [];
  }
}

// src/engine/templatePreflight.ts
function collectPlaceholderRefs(node, refs) {
  const placeholder = node.placeholder;
  if (placeholder) refs.push(placeholder);
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectPlaceholderRefs(child, refs);
    }
  }
}
function getCompatiblePlaceholderTypes2(type) {
  switch (type) {
    case "title":
      return ["title", "ctrTitle"];
    case "ctrTitle":
      return ["ctrTitle", "title"];
    case "subTitle":
      return ["subTitle", "body"];
    case "body":
      return ["body", "subTitle"];
    case "pic":
    case "chart":
    case "tbl":
    case "dgm":
    case "media":
    case "clipArt":
      return [type, "obj"];
    case "obj":
      return ["obj", "pic", "chart", "tbl", "dgm", "media", "clipArt"];
    default:
      return type ? [type] : [];
  }
}
function placeholderRefMatches(ref, placeholders) {
  const compatibleTypes = getCompatiblePlaceholderTypes2(ref.type);
  if (ref.idx !== void 0) {
    const byIdx = placeholders.some((placeholder) => placeholder.idx === String(ref.idx));
    if (byIdx) return true;
  }
  if (compatibleTypes.length > 0) {
    return placeholders.some((placeholder) => placeholder.type !== void 0 && compatibleTypes.includes(placeholder.type));
  }
  return false;
}
function buildTemplatePreflightReport(slides, templateIndex) {
  const unsafeLayouts = /* @__PURE__ */ new Set();
  let placeholderRefs = 0;
  let matchedPlaceholderRefs = 0;
  let missingPlaceholderCount = 0;
  for (const slide of slides) {
    const mapped = mapSlideToLayout(slide, templateIndex);
    if (slide.layoutName && !mapped) {
      unsafeLayouts.add(slide.layoutName);
    }
    const refs = [];
    for (const child of slide.children ?? []) {
      collectPlaceholderRefs(child, refs);
    }
    placeholderRefs += refs.length;
    if (!mapped) continue;
    const matchedRefs = refs.filter((ref) => placeholderRefMatches(ref, mapped.placeholders)).length;
    matchedPlaceholderRefs += matchedRefs;
    missingPlaceholderCount += refs.length - matchedRefs;
  }
  const placeholderCoverage = placeholderRefs === 0 ? 1 : matchedPlaceholderRefs / placeholderRefs;
  const roundedCoverage = Math.round(placeholderCoverage * 1e3) / 1e3;
  const templateSupportLevel = unsafeLayouts.size > 0 || missingPlaceholderCount > 0 ? "unsafe" : roundedCoverage >= 0.98 ? "certified" : "supported";
  const expectedFallbackRisk = unsafeLayouts.size > 0 || missingPlaceholderCount > 0 ? "high" : roundedCoverage >= 0.98 ? "low" : "medium";
  return {
    templateSupportLevel,
    unsafeLayouts: [...unsafeLayouts].sort(),
    placeholderCoverage: roundedCoverage,
    expectedFallbackRisk,
    missingPlaceholderCount
  };
}

// src/engine/templateMutator.ts
async function renderTemplateInternal(doc, options) {
  const validated = validateDocument(doc, options);
  const normalized = flattenDocumentZIndex(validated);
  assertPowerPointFontEmbeddingAvailable(normalized);
  if (!normalized.template) {
    throw new PaperError(
      "[PaperEngine] renderTemplateInternal called but document has no template buffer. Provide a .pptx template via PaperDocument.template.",
      { code: "VALIDATION_FAILED", phase: "template" }
    );
  }
  const templateIndex = await parseTemplate(normalized.template);
  const templateReport = buildTemplatePreflightReport(normalized.slides, templateIndex);
  if (templateReport.templateSupportLevel === "unsafe") {
    throw new PaperError(
      `Template preflight failed: unsafe layouts=${templateReport.unsafeLayouts.join(", ") || "none"}, missing placeholders=${templateReport.missingPlaceholderCount ?? 0}.`,
      {
        code: "COMPATIBILITY_CONTRACT_VIOLATION",
        phase: "template"
      }
    );
  }
  const collector = createSlideResultCollector();
  const {
    slideContents,
    slideMediaManifests,
    slideChartManifests,
    slideHyperlinkRels,
    slideTransitionXmls,
    slideTimingXmls,
    slideBackgrounds,
    slideNotes,
    slideHeaderFooters,
    slideBgImageAssets,
    slideCompatibilityReports
  } = collector;
  const slideLayoutTargets = [];
  const layoutTrees = [];
  const counters = {
    globalMediaCounter: { current: 1 },
    globalChartCounter: { current: 1 },
    globalChartExCounter: { current: 1 },
    globalVideoAudioCounter: { current: 1 },
    mediaDeduplicationMap: /* @__PURE__ */ new Map(),
    mediaFetchBudget: createMediaFetchBudget()
  };
  const tplLayoutWidth = normalized.slideSize?.width ?? templateIndex.slideWidth;
  const tplLayoutHeight = normalized.slideSize?.height ?? templateIndex.slideHeight;
  const enableFallbackImages = normalized.chartFallbackImages ?? false;
  const themeColors = normalized.theme?.colorScheme;
  if (normalized.slideSize) {
    const dw = Math.abs(tplLayoutWidth - templateIndex.slideWidth);
    const dh = Math.abs(tplLayoutHeight - templateIndex.slideHeight);
    if (dw > 1 || dh > 1) {
      getLogger().warn(
        `[PaperEngine] Slide dimensions mismatch: AST slideSize (${tplLayoutWidth}\xD7${tplLayoutHeight}) differs from template (${templateIndex.slideWidth}\xD7${templateIndex.slideHeight}). Layout will use AST dimensions; template master/layout shapes may not align.`
      );
    }
  }
  const slideWidthEmu = Math.round(tplLayoutWidth * PIXEL_TO_EMU);
  const slideHeightEmu = Math.round(tplLayoutHeight * PIXEL_TO_EMU);
  const totalSlides = normalized.slides.length;
  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex += 1) {
    checkAborted(options?.signal, slideIndex, "template");
    const originalSlide = normalized.slides[slideIndex];
    const slide = structuredClone(originalSlide);
    const mapped = mapSlideToLayout(slide, templateIndex);
    if (mapped) {
      const masterIndex = mapped.layout.masterIndex;
      const master = templateIndex.slideMasters?.[masterIndex];
      const masterTextStyles = master?.textStyles ?? templateIndex.masterTextStyles;
      const masterTheme = master ? templateIndex.themes?.[master.themeIndex]?.data ?? templateIndex.theme : templateIndex.theme;
      injectPlaceholderGeometry(slide, mapped.placeholders, masterTextStyles, masterTheme);
    } else if (slide.layoutName) {
      throw new PaperError(
        `[PaperEngine] Layout "${slide.layoutName}" not found in template`,
        {
          code: "COMPATIBILITY_CONTRACT_VIOLATION",
          phase: "template",
          slideIndex
        }
      );
    }
    const fontDocument = {
      ...normalized,
      slides: [slide],
      resolvedFonts: void 0,
      fontPixelGateEligible: void 0
    };
    await autoLoadDocumentFonts(fontDocument);
    const mergedFonts = new Map(
      (normalized.resolvedFonts ?? []).map((font) => [font.sha256 ?? `${font.source}:${font.family}:${font.face}`, font])
    );
    for (const font of fontDocument.resolvedFonts ?? []) {
      mergedFonts.set(font.sha256 ?? `${font.source}:${font.family}:${font.face}`, font);
    }
    normalized.resolvedFonts = [...mergedFonts.values()];
    normalized.fontPixelGateEligible = normalized.resolvedFonts.every((font) => font.pixelGateEligible);
    const layoutTarget = resolveLayoutTarget(slide.layoutName, templateIndex) ?? "../slideLayouts/slideLayout1.xml";
    slideLayoutTargets.push(layoutTarget);
    const layoutTree = await runLayout(slide, tplLayoutWidth, tplLayoutHeight);
    layoutTrees.push(layoutTree);
    const slideResult = await processSlideLayout(
      layoutTree,
      slide,
      counters,
      enableFallbackImages,
      themeColors,
      slideIndex
    );
    await collectSlideResult(
      collector,
      slide,
      slideResult,
      slideIndex,
      counters,
      options?.signal
    );
    options?.onProgress?.(slideIndex, totalSlides);
    if (slideIndex % YIELD_FREQUENCY === YIELD_FREQUENCY - 1) {
      await yieldToEventLoop();
    }
    checkAborted(options?.signal, slideIndex, "serialization");
  }
  const { commentSlideInfos, commentAuthorsXml, commentFilesMap } = processDocumentComments(normalized);
  const hasComments = commentSlideInfos.length > 0;
  const hasNotes = hasAnyNotes(slideNotes);
  let maxTemplateRId = 0;
  for (const match of templateIndex.presentationRels.matchAll(/Id="rId(\d+)"/g)) {
    const value = parseInt(match[1], 10);
    if (value > maxTemplateRId) maxTemplateRId = value;
  }
  const slideRIdBase = Math.max(maxTemplateRId + 1, 101);
  const maxNewRId = slideRIdBase + normalized.slides.length + 10 + (hasNotes ? 1 : 0) + (hasComments ? 1 : 0);
  const fontRIdStart = Math.max(maxTemplateRId, maxNewRId) + 1;
  const { embeddedFontListXml, extraPresentationRels, fontDataFiles } = await processDocumentFonts(
    normalized,
    fontRIdStart
  );
  validateCrossSlideHyperlinks(slideHyperlinkRels, normalized.slides.length);
  const buffer = await assembleFromTemplate(templateIndex, {
    slideCount: normalized.slides.length,
    slideContents,
    slideMediaManifests,
    slideChartManifests,
    slideHyperlinkRels,
    slideLayoutTargets,
    slideTransitionXmls,
    slideTimingXmls,
    slideBackgrounds,
    slideHeaderFooters,
    slideNotes,
    slideBgImageAssets,
    slideWidthEmu,
    slideHeightEmu,
    commentSlideInfos: hasComments ? commentSlideInfos : void 0,
    commentAuthorsXml,
    commentFilesMap,
    embeddedFontListXml,
    extraPresentationRels,
    fontDataFiles
  });
  return {
    buffer,
    layoutTrees,
    compatibilityReport: summarizeDocumentCompatibility(slideCompatibilityReports),
    templateReport
  };
}
export {
  renderTemplateInternal
};
//# sourceMappingURL=templateMutator.js.map
