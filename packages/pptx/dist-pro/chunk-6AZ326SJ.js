import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  PptxArchive,
  computeChartStartRId,
  countChartRelationshipSlots,
  countVideoAudioRIds,
  createMediaFetchBudget,
  hashBuffer,
  processSlideCharts,
  processSlideMedia,
  resolveImageSource,
  serializeSlideTree,
  someLayoutNode
} from "./chunk-OV2ZPS4E.js";
import {
  applyPptxCompatibility,
  applyVisualOrder,
  summarizeDocumentCompatibility
} from "./chunk-EE5SX3QK.js";
import {
  flattenDocumentZIndex,
  validateDocument
} from "./chunk-ADNRG6JQ.js";
import {
  escapeXml,
  escapeXmlAttr,
  toEmu
} from "./chunk-QZ7YLVPL.js";
import {
  applyBreakAnywhereFallback,
  assertAgentRecipeLayoutUtilization,
  computePolicyAutoFit,
  splitGraphemes
} from "./chunk-5CDPNZPI.js";
import {
  autoLoadDocumentFonts
} from "./chunk-FUBHCOLD.js";
import {
  renderSlideToBuffer
} from "./chunk-ZLZIUC4K.js";
import {
  DETERMINISTIC_DATE,
  isDeterministicMode
} from "./chunk-PUKAI6X5.js";
import {
  calculateRichTextMetrics
} from "./chunk-625BFJJW.js";
import {
  validateFetchUrl
} from "./chunk-YWT5KXVL.js";
import {
  applyGhostGrid,
  runLayout
} from "./chunk-4IGUCOJJ.js";
import {
  isLiteBundle
} from "./chunk-DYXX63XE.js";
import {
  DEFAULT_SLIDE_HEIGHT_PX,
  DEFAULT_SLIDE_WIDTH_PX,
  FETCH_TIMEOUT_MS
} from "./chunk-3O47XGMU.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/ooxml/comments.ts
function getInitials(name) {
  return name.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).join("").slice(0, 3) || "A";
}
function generateCommentAuthorsXml(authors) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<p:cmAuthorLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
`;
  for (const a of authors) {
    xml += `  <p:cmAuthor id="${a.id}" name="${escapeXml(a.name)}" initials="${escapeXml(a.initials)}" lastIdx="${a.lastIdx}" clrIdx="${a.clrIdx}"/>
`;
  }
  xml += `</p:cmAuthorLst>`;
  return xml;
}
function generateCommentsXml(comments, authorMap, authorIdxCounters) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
`;
  xml += `<p:cmLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
`;
  for (const comment of comments) {
    const author = authorMap.get(comment.author);
    const idx = authorIdxCounters.get(comment.author) ?? 1;
    authorIdxCounters.set(comment.author, idx + 1);
    const dt = comment.date ?? (isDeterministicMode() ? DETERMINISTIC_DATE : /* @__PURE__ */ new Date()).toISOString();
    const posX = comment.x !== void 0 ? toEmu(comment.x) : 0;
    const posY = comment.y !== void 0 ? toEmu(comment.y) : 0;
    xml += `  <p:cm authorId="${author.id}" dt="${escapeXml(dt)}" idx="${idx}">
`;
    xml += `    <p:pos x="${posX}" y="${posY}"/>
`;
    xml += `    <p:text>${escapeXml(comment.text)}</p:text>
`;
    xml += `  </p:cm>
`;
  }
  xml += `</p:cmLst>`;
  return xml;
}
function processDocumentComments(doc) {
  const commentFilesMap = /* @__PURE__ */ new Map();
  const commentSlideInfos = [];
  const authorMap = /* @__PURE__ */ new Map();
  let authorIdCounter = 0;
  const authorCommentCounts = /* @__PURE__ */ new Map();
  for (const slide of doc.slides) {
    if (!slide.comments || slide.comments.length === 0) continue;
    for (const comment of slide.comments) {
      const count = authorCommentCounts.get(comment.author) ?? 0;
      authorCommentCounts.set(comment.author, count + 1);
      if (!authorMap.has(comment.author)) {
        authorMap.set(comment.author, {
          id: authorIdCounter,
          name: comment.author,
          initials: getInitials(comment.author),
          lastIdx: 0,
          // will be updated
          clrIdx: authorIdCounter
        });
        authorIdCounter++;
      }
    }
  }
  if (authorMap.size === 0) {
    return { commentSlideInfos: [], commentAuthorsXml: void 0, commentFilesMap };
  }
  const authorIdxCounters = /* @__PURE__ */ new Map();
  let commentFileIndex = 1;
  for (let slideIdx = 0; slideIdx < doc.slides.length; slideIdx++) {
    const slide = doc.slides[slideIdx];
    if (!slide.comments || slide.comments.length === 0) continue;
    const commentsXml = generateCommentsXml(slide.comments, authorMap, authorIdxCounters);
    commentFilesMap.set(`ppt/comments/comment${commentFileIndex}.xml`, commentsXml);
    commentSlideInfos.push({ slideIndex: slideIdx, commentFileIndex });
    commentFileIndex++;
  }
  for (const [name, author] of authorMap) {
    author.lastIdx = (authorIdxCounters.get(name) ?? 1) - 1;
  }
  const commentAuthorsXml = generateCommentAuthorsXml(Array.from(authorMap.values()));
  return { commentSlideInfos, commentAuthorsXml, commentFilesMap };
}

// src/ooxml/fontEmbed.ts
var EMBEDDING_UNAVAILABLE_MESSAGE = "PowerPoint font embedding is unavailable because Runstamp does not have a validated EOT/MicroType Express encoder.";
function assertPowerPointFontEmbeddingAvailable(doc) {
  if (doc.fontStrategy !== "user-embedded" && (doc.embeddedFonts?.length ?? 0) === 0) return;
  throw new PaperError(EMBEDDING_UNAVAILABLE_MESSAGE, {
    code: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
    phase: "font",
    path: ["embeddedFonts"],
    remediation: 'Use fontStrategy="system" until a validated PowerPoint EOT/MicroType Express encoder is configured.'
  });
}
async function processDocumentFonts(doc, _fontRIdStart) {
  assertPowerPointFontEmbeddingAvailable(doc);
  if (doc.fontStrategy === "system") {
    getLogger().warn(
      "[fontEmbed] FONT_SYSTEM_OPT_IN: explicit system strategy emits no font streams and is ineligible for deterministic pixel gating."
    );
    return { embeddedFontListXml: void 0, extraPresentationRels: [], fontDataFiles: [] };
  }
  const hasPortableFontBytes = doc.resolvedFonts?.some(
    (font) => (font.source === "registry" || font.source === "user") && Boolean(font.sha256)
  ) ?? false;
  if (hasPortableFontBytes) {
    getLogger().warn(
      `[fontEmbed] FONT_EMBEDDING_UNAVAILABLE: ${EMBEDDING_UNAVAILABLE_MESSAGE} Portable font names will be referenced without embedding.`
    );
  }
  return { embeddedFontListXml: void 0, extraPresentationRels: [], fontDataFiles: [] };
}

// src/engine/textFit.ts
function truncateTextToFit(text, textStyle, width, height, marker = "\u2026") {
  const chars = splitGraphemes(text);
  const fits = (value) => {
    const metrics = calculateRichTextMetrics([{ text: value }], textStyle, width);
    return metrics.height <= height && metrics.maxLineWidth <= width;
  };
  if (fits(text)) return text;
  if (chars.length === 0) return "";
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${chars.slice(0, mid).join("").trimEnd()}${marker}`;
    if (fits(candidate)) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? marker : `${chars.slice(0, lo).join("").trimEnd()}${marker}`;
}
function scaleTextStyle(style, scale) {
  if (!style || scale >= 0.999) return;
  const baseFontSize = style.fontSize ?? 16;
  style.fontSize = baseFontSize * scale;
  if (style.lineHeight !== void 0 && style.lineHeight >= 4) {
    style.lineHeight *= scale;
  }
}
function scaleRuns(runs, scale, fallbackFontSize) {
  if (scale >= 0.999) return runs;
  return runs.map((run) => {
    if (!run.style?.fontSize) return run;
    return {
      ...run,
      style: {
        ...run.style,
        fontSize: (run.style.fontSize ?? fallbackFontSize) * scale
      }
    };
  });
}
function applyDeterministicFitFontSize(params) {
  const result = params.node._autoFitResult;
  if (!result) return;
  const scale = result.fontScale / 1e5;
  if (scale >= 0.999) {
    params.node.autoFit = false;
    return;
  }
  const fallbackFontSize = params.textStyle?.fontSize ?? 16;
  scaleTextStyle(params.textStyle, scale);
  if (Array.isArray(params.content)) {
    params.writeContent(scaleRuns(params.content, scale, fallbackFontSize));
  }
  params.node.autoFit = false;
}
function applyTextFitToNode(params) {
  const { node, textStyle, content, writeContent } = params;
  const insets = textStyle?.textInsets;
  const effectiveWidth = node.layout.width - (insets?.left ?? 0) - (insets?.right ?? 0);
  const effectiveHeight = node.layout.height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
  const width = Math.max(0, effectiveWidth);
  const height = Math.max(0, effectiveHeight);
  const policy = textStyle?.textFit?.policy;
  const breakableContent = policy !== "overflow" && typeof content === "string" ? applyBreakAnywhereFallback(content, textStyle, width) : content;
  if (breakableContent !== void 0 && breakableContent !== content) {
    writeContent(breakableContent);
  }
  if (policy === "truncate" && typeof breakableContent === "string") {
    const truncated = truncateTextToFit(
      breakableContent,
      textStyle,
      width,
      height,
      textStyle?.textFit?.marker ?? "\u2026"
    );
    writeContent(truncated);
    return;
  }
  if (node.autoFit || policy === "fitFontSize") {
    node._autoFitResult = computePolicyAutoFit(
      breakableContent ?? "",
      textStyle,
      width,
      height
    );
    if (policy === "fitFontSize") {
      applyDeterministicFitFontSize({ node, textStyle, content: breakableContent, writeContent });
      if (node._autoFitResult?.overflow && typeof breakableContent === "string") {
        writeContent(truncateTextToFit(breakableContent, textStyle, width, height));
      }
    }
  }
  if (policy === "fitHeight") {
    const metrics = calculateRichTextMetrics(
      typeof breakableContent === "string" ? [{ text: breakableContent }] : breakableContent ?? [],
      textStyle,
      width
    );
    const requiredHeight = metrics.height + (insets?.top ?? 0) + (insets?.bottom ?? 0);
    if (requiredHeight > node.layout.height) {
      node.layout.height = requiredHeight;
    }
  }
}
function applyAutoFit(node) {
  if (node.type === "Text") {
    const textNode = node;
    applyTextFitToNode({
      node: textNode,
      textStyle: node.style,
      content: textNode.content,
      writeContent: (value) => {
        textNode.content = value;
      }
    });
  } else if (node.type === "View") {
    const viewNode = node;
    if (viewNode.textContent !== void 0 || viewNode.textParagraphs !== void 0) {
      applyTextFitToNode({
        node: viewNode,
        textStyle: viewNode.textStyle,
        content: viewNode.textContent,
        writeContent: (value) => {
          viewNode.textContent = value;
        }
      });
    }
  }
  if (node.children) {
    for (const child of node.children) {
      applyAutoFit(child);
    }
  }
}

// src/ooxml/transition.ts
var DIR_MAP = { up: "u", down: "d", left: "l", right: "r" };
var HORZ_VERT_MAP = { up: "vert", down: "vert", left: "horz", right: "horz" };
function speedAttr(duration) {
  if (duration <= 250) return `spd="fast"`;
  if (duration <= 750) return `spd="med"`;
  return `spd="slow"`;
}
function generateTransitionXml(transition) {
  if (!transition) return "";
  const dur = transition.duration ?? 500;
  const spd = speedAttr(dur);
  const advClick = transition.advanceOnClick === false ? `advClick="0"` : `advClick="1"`;
  const advTm = transition.advanceAfterTime != null ? ` advTm="${transition.advanceAfterTime}"` : "";
  if (transition.type === "morph") {
    return [
      `<p:transition ${spd} ${advClick}${advTm}>`,
      `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">`,
      `<mc:Choice Requires="p159" xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main">`,
      `<p159:morph option="byObject"/>`,
      `</mc:Choice>`,
      `<mc:Fallback><p:fade/></mc:Fallback>`,
      `</mc:AlternateContent>`,
      `</p:transition>`
    ].join("");
  }
  const dir = DIR_MAP[transition.direction ?? "left"] ?? "l";
  const hvDir = HORZ_VERT_MAP[transition.direction ?? "left"] ?? "horz";
  let inner;
  switch (transition.type) {
    case "fade":
      inner = `<p:fade/>`;
      break;
    case "push":
      inner = `<p:push dir="${dir}"/>`;
      break;
    case "wipe":
      inner = `<p:wipe dir="${dir}"/>`;
      break;
    case "cover":
      inner = `<p:cover dir="${dir}"/>`;
      break;
    case "zoom":
      inner = `<p:zoom/>`;
      break;
    case "split":
      inner = `<p:split orient="${hvDir}"/>`;
      break;
    case "blinds":
      inner = `<p:blinds dir="${hvDir}"/>`;
      break;
    case "checker":
      inner = `<p:checker dir="${hvDir}"/>`;
      break;
    case "dissolve":
      inner = `<p:dissolve/>`;
      break;
    case "comb":
      inner = `<p:comb dir="${hvDir}"/>`;
      break;
    default:
      return "";
  }
  return `<p:transition ${spd} ${advClick}${advTm}>${inner}</p:transition>`;
}

// src/ooxml/animationBehaviors.ts
function toColorValue(color) {
  return color.replace(/^#/, "").toUpperCase();
}
function emitTextRange(range) {
  if (!range) return "";
  return `<p:txEl><p:pRg st="${range.start}" end="${range.end}"/></p:txEl>`;
}
function emitTargetElement(target) {
  return `<p:tgtEl><p:spTgt spid="${target.shapeId}">${emitTextRange(target.paragraphRange)}</p:spTgt></p:tgtEl>`;
}
function emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, extraAttrs = "") {
  return `<p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${extraAttrs}${easingAttrs}/>${emitTargetElement(target)}</p:cBhvr>`;
}
function tokenizeMotionPath(path) {
  return path.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) ?? [];
}
function parseMotionPath(path) {
  const tokens = tokenizeMotionPath(path);
  if (tokens.length === 0) {
    throw new PaperError(
      'Animation effect "motionPath" requires a motionPath object with a path string',
      { code: "VALIDATION_FAILED", phase: "serialization" }
    );
  }
  const segments = [];
  let index = 0;
  let pointCount = 0;
  let sawMove = false;
  while (index < tokens.length) {
    const command = tokens[index++];
    switch (command) {
      case "M":
      case "L": {
        const x = tokens[index++];
        const y = tokens[index++];
        if (x === void 0 || y === void 0) {
          throw new PaperError(
            `Invalid motion path "${path}": ${command} requires two coordinates`,
            { code: "VALIDATION_FAILED", phase: "serialization" }
          );
        }
        segments.push(`${command} ${x} ${y}`);
        pointCount += 1;
        sawMove = sawMove || command === "M";
        break;
      }
      case "C": {
        const values = tokens.slice(index, index + 6);
        if (values.length < 6) {
          throw new PaperError(
            `Invalid motion path "${path}": C requires six coordinates`,
            { code: "VALIDATION_FAILED", phase: "serialization" }
          );
        }
        index += 6;
        segments.push(`C ${values.join(" ")}`);
        pointCount += 3;
        break;
      }
      case "Z": {
        segments.push("Z");
        break;
      }
      default:
        throw new PaperError(
          `Invalid motion path "${path}": unsupported command "${command}"`,
          { code: "VALIDATION_FAILED", phase: "serialization" }
        );
    }
  }
  if (!sawMove) {
    throw new PaperError(`Invalid motion path "${path}": path must start with M`, {
      code: "VALIDATION_FAILED",
      phase: "serialization"
    });
  }
  return {
    normalizedPath: segments.join(" "),
    ptsTypes: "A".repeat(Math.max(pointCount, 2))
  };
}
function emitEasingAttrs(anim) {
  const easing = anim.easing;
  if (!easing || easing === "linear") return "";
  switch (easing) {
    case "easeIn":
      return ' accel="100000"';
    case "easeOut":
      return ' decel="100000"';
    case "easeInOut":
      return ' accel="50000" decel="50000"';
    case "bounce":
      return ' decel="100000"';
    default:
      return "";
  }
}
function requireTextTarget(anim, target) {
  if (target.target.kind !== "text") {
    throw new PaperError(
      `Animation effect "${anim.effect}" requires a text-containing shape target`,
      { code: "VALIDATION_FAILED", phase: "serialization" }
    );
  }
}
function emitSetBehavior(cTnId, target, attrName, value) {
  return `<p:set><p:cBhvr><p:cTn id="${cTnId.current++}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${emitTargetElement(target)}<p:attrNameLst><p:attrName>${attrName}</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${escapeXmlAttr(value)}"/></p:to></p:set>`;
}
function emitEffectElement(anim, target, cTnId) {
  const dur = anim.duration ?? 500;
  const easingAttrs = emitEasingAttrs(anim);
  const autoRevAttr = anim.autoReverse ? ' autoRev="1"' : "";
  switch (anim.effect) {
    case "appear": {
      const value = anim.type === "exit" ? "hidden" : "visible";
      return emitSetBehavior(cTnId, target, "style.visibility", value);
    }
    case "fade": {
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "fly": {
      const trans = anim.type === "exit" ? "out" : "in";
      const dir = anim.direction ?? "up";
      return `<p:animEffect transition="${trans}" filter="wipe(${dir})">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "zoom": {
      if (anim.type === "exit") {
        return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}<p:from x="100000" y="100000"/><p:to x="0" y="0"/></p:animScale>`;
      }
      return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}<p:from x="0" y="0"/><p:to x="100000" y="100000"/></p:animScale>`;
    }
    case "spin": {
      const by = Math.round((anim.rotationAngle ?? 360) * 6e4);
      return `<p:animRot by="${by}">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, autoRevAttr)}</p:animRot>`;
    }
    case "bounce": {
      let xml = `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${easingAttrs}/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>`;
      xml += `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="1+#ppt_h/2"/></p:val></p:tav>`;
      xml += `<p:tav tm="50000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `<p:tav tm="75000"><p:val><p:strVal val="1+#ppt_h/4"/></p:val></p:tav>`;
      xml += `<p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `</p:tavLst></p:anim>`;
      xml += `<p:animEffect transition="in" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, "", target)}</p:animEffect>`;
      return xml;
    }
    case "float": {
      let xml = `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${easingAttrs}/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>`;
      xml += `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y+0.1"/></p:val></p:tav>`;
      xml += `<p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `</p:tavLst></p:anim>`;
      xml += `<p:animEffect transition="in" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, "", target)}</p:animEffect>`;
      return xml;
    }
    case "growShrink": {
      const scale = Math.round((anim.scaleFactor ?? 110) * 1e3);
      return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, autoRevAttr)}<p:from x="100000" y="100000"/><p:to x="${scale}" y="${scale}"/></p:animScale>`;
    }
    case "pulse": {
      return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, autoRevAttr)}<p:from x="100000" y="100000"/><p:to x="110000" y="110000"/></p:animScale>`;
    }
    case "teeter": {
      return `<p:animRot by="300000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, ' autoRev="1"')}</p:animRot>`;
    }
    case "wipe": {
      const dir = anim.direction ?? "right";
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="wipe(${dir})">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "split": {
      const dir = anim.direction ?? "right";
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="split(${dir})">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "dissolve": {
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="dissolve">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "swivel": {
      let xml = `<p:animRot by="5400000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animRot>`;
      xml += `<p:animEffect transition="in" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, "", target)}</p:animEffect>`;
      return xml;
    }
    case "motionPath": {
      const motionPath = anim.motionPath;
      if (!motionPath?.path) {
        throw new PaperError(
          'Animation effect "motionPath" requires a motionPath object with a path string',
          { code: "VALIDATION_FAILED", phase: "serialization" }
        );
      }
      const parsed = parseMotionPath(motionPath.path);
      const origin = motionPath.origin ?? "layout";
      return `<p:animMotion origin="${origin}" path="${escapeXmlAttr(parsed.normalizedPath)}" pathEditMode="relative" ptsTypes="${parsed.ptsTypes}">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animMotion>`;
    }
    case "colorReveal": {
      const trans = anim.type === "exit" ? "out" : "in";
      let xml = `<p:animEffect transition="${trans}" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
      xml += `<p:animClr clrSpc="rgb"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>fillcolor</p:attrName></p:attrNameLst></p:cBhvr><p:to><a:srgbClr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="000000"/></p:to></p:animClr>`;
      return xml;
    }
    case "colorChange": {
      if (!anim.toColor) {
        throw new PaperError('Animation effect "colorChange" requires toColor', {
          code: "VALIDATION_FAILED",
          phase: "serialization"
        });
      }
      const attrName = target.target.kind === "text" ? "style.color" : "fillcolor";
      return `<p:animClr clrSpc="rgb"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${autoRevAttr}${easingAttrs}/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>${attrName}</p:attrName></p:attrNameLst></p:cBhvr><p:to><a:srgbClr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="${toColorValue(anim.toColor)}"/></p:to></p:animClr>`;
    }
    case "boldFlash": {
      requireTextTarget(anim, target);
      return `${emitSetBehavior(cTnId, target, "style.fontWeight", "bold")}${emitSetBehavior(cTnId, target, "style.fontWeight", "normal")}`;
    }
    case "wave": {
      let xml = `<p:animRot by="300000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, ' autoRev="1"')}</p:animRot>`;
      xml += `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold" autoRev="1"/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>`;
      xml += `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `<p:tav tm="50000"><p:val><p:strVal val="#ppt_y-0.02"/></p:val></p:tav>`;
      xml += `<p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `</p:tavLst></p:anim>`;
      return xml;
    }
    case "flip": {
      return `<p:animRot by="10800000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animRot>`;
    }
    default:
      return "";
  }
}

// src/ooxml/animationEffects.ts
var FLY_SUBTYPE_MAP = {
  up: "4",
  down: "8",
  left: "2",
  right: "1"
};
var WIPE_SUBTYPE_MAP = {
  up: "4",
  down: "8",
  left: "2",
  right: "1"
};
function defaultBuildGrouping(anim) {
  if (anim.build?.grouping) return anim.build.grouping;
  if (anim.buildType) return anim.buildType;
  return void 0;
}
function defaultBuild(anim) {
  const grouping = defaultBuildGrouping(anim);
  if (!grouping && !anim.build) return void 0;
  return {
    nested: anim.build?.nested ?? grouping === "byFirstLevel",
    grouping,
    dimAfter: anim.build?.dimAfter
  };
}
function inferPathType(path) {
  if (/^\s*M\s+[-+\d.]+\s+[-+\d.]+\s+L\s+[-+\d.]+\s+[-+\d.]+\s*$/i.test(path)) {
    return "line";
  }
  if (/\bC\b/i.test(path)) {
    return "arc";
  }
  return "custom";
}
function normalizeAnimationIntent(animation) {
  const build = defaultBuild(animation);
  const repeat = animation.repeat ?? animation.repeatCount;
  switch (animation.effect) {
    case "grow":
      return {
        ...animation,
        effect: "growShrink",
        scaleFactor: animation.scaleFactor ?? 150,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build
      };
    case "shrink":
      return {
        ...animation,
        effect: "growShrink",
        scaleFactor: animation.scaleFactor ?? 50,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build
      };
    case "growShrink":
      return {
        ...animation,
        scaleFactor: animation.scaleFactor ?? 110,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build
      };
    case "pulse":
      return {
        ...animation,
        scaleFactor: animation.scaleFactor ?? 110,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build
      };
    case "spin":
      return {
        ...animation,
        rotationAngle: animation.rotationAngle ?? 360,
        autoReverse: animation.autoReverse ?? false,
        repeat,
        build
      };
    case "colorChange":
      return {
        ...animation,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build
      };
    case "boldFlash":
      return {
        ...animation,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build
      };
    case "motionPath":
      return {
        ...animation,
        repeat,
        build,
        motionPath: animation.motionPath ? {
          ...animation.motionPath,
          pathType: animation.motionPath.pathType ?? inferPathType(animation.motionPath.path)
        } : animation.motionPath
      };
    default:
      return { ...animation, repeat, build };
  }
}
function getEffectInfo(anim) {
  const dir = anim.direction ?? "up";
  switch (anim.effect) {
    case "appear":
      return { presetID: "1", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "fly":
      return { presetID: "2", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: FLY_SUBTYPE_MAP[dir] ?? "4" };
    case "spin":
      return { presetID: "8", presetClass: "emph", presetSubtype: "0" };
    case "zoom":
      return { presetID: "53", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "bounce":
      return { presetID: "26", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "float":
      return { presetID: "42", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "growShrink":
      return { presetID: "6", presetClass: "emph", presetSubtype: "0" };
    case "pulse":
      return { presetID: "7", presetClass: "emph", presetSubtype: "0" };
    case "teeter":
      return { presetID: "27", presetClass: "emph", presetSubtype: "0" };
    case "wipe":
      return { presetID: "22", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: WIPE_SUBTYPE_MAP[dir] ?? "1" };
    case "split":
      return { presetID: "16", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "dissolve":
      return { presetID: "35", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "swivel":
      return { presetID: "15", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "motionPath":
      return { presetID: "0", presetClass: "path", presetSubtype: "0" };
    case "colorReveal":
    case "colorChange":
      return { presetID: "63", presetClass: anim.type === "exit" ? "exit" : anim.type === "emphasis" ? "emph" : "entr", presetSubtype: "0" };
    case "boldFlash":
      return { presetID: "14", presetClass: "emph", presetSubtype: "0" };
    case "wave":
      return { presetID: "44", presetClass: "emph", presetSubtype: "0" };
    case "flip":
      return { presetID: "55", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "fade":
    default:
      return {
        presetID: "10",
        presetClass: anim.type === "exit" ? "exit" : anim.type === "emphasis" ? "emph" : "entr",
        presetSubtype: "0"
      };
  }
}
function isBuildAnimation(anim) {
  return Boolean(anim.build?.grouping && anim.build.grouping !== "allAtOnce");
}
function isTextBuildGrouping(grouping) {
  return grouping === "byParagraph" || grouping === "byFirstLevel";
}
function getNormalizedRepeat(anim) {
  return anim.repeat;
}

// src/ooxml/timing.ts
var NODE_TYPE_MAP = {
  onClick: "clickEffect",
  withPrevious: "withEffect",
  afterPrevious: "afterEffect"
};
function isSequenceSpec(item) {
  return "kind" in item && item.kind === "sequence";
}
function getRepeatAttr(animation) {
  const repeat = getNormalizedRepeat(animation);
  if (repeat === void 0) return "";
  return repeat === "indefinite" ? ' repeatCount="indefinite"' : ` repeatCount="${Math.round(repeat * 1e3)}"`;
}
function emitRunXml(spec, cTnId, runNodeIdsByShapeId) {
  const trigger = spec.triggerOverride ?? spec.animation.trigger;
  const info = getEffectInfo(spec.animation);
  const delay = spec.animation.delay ?? 0;
  const easingAttrs = emitEasingAttrs(spec.animation);
  const repeatAttr = getRepeatAttr(spec.animation);
  const effectEl = emitEffectElement(
    spec.animation,
    { shapeId: spec.entry.shapeId, target: spec.entry.target, paragraphRange: spec.paragraphRange },
    cTnId
  );
  const runId = cTnId.current;
  if (runNodeIdsByShapeId) {
    const runIds = runNodeIdsByShapeId.get(spec.entry.shapeId) ?? [];
    runIds.push(runId);
    runNodeIdsByShapeId.set(spec.entry.shapeId, runIds);
  }
  return `<p:par><p:cTn id="${cTnId.current++}" presetID="${info.presetID}" presetClass="${info.presetClass}" presetSubtype="${info.presetSubtype}" fill="hold" nodeType="${NODE_TYPE_MAP[trigger] ?? "clickEffect"}"${repeatAttr}${easingAttrs}><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${effectEl}</p:childTnLst></p:cTn></p:par>`;
}
function emitSequenceXml(sequence, cTnId, runNodeIdsByShapeId) {
  const childXml = sequence.runs.map((run) => emitRunXml(run, cTnId, runNodeIdsByShapeId)).join("");
  return `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${cTnId.current++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${childXml}</p:childTnLst></p:cTn></p:seq>`;
}
function emitClickGroupXml(group, cTnId, runNodeIdsByShapeId, clickGroupIdsByShapeId) {
  const bodyXml = group.items.map((item) => {
    if (isSequenceSpec(item)) {
      return emitSequenceXml(item, cTnId, runNodeIdsByShapeId);
    }
    return emitRunXml(item, cTnId, runNodeIdsByShapeId);
  }).join("");
  const outerGroupId = cTnId.current;
  if (clickGroupIdsByShapeId) {
    const shapeIds = /* @__PURE__ */ new Set();
    for (const item of group.items) {
      if (isSequenceSpec(item)) {
        for (const run of item.runs) {
          shapeIds.add(run.entry.shapeId);
        }
      } else {
        shapeIds.add(item.entry.shapeId);
      }
    }
    for (const shapeId of shapeIds) {
      clickGroupIdsByShapeId.set(shapeId, outerGroupId);
    }
  }
  return `<p:par><p:cTn id="${cTnId.current++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${cTnId.current++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${bodyXml}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
}
function buildParagraphSteps(levels, nested) {
  if (!nested) {
    return levels.map((_, index) => ({ start: index, end: index }));
  }
  const steps = [];
  let currentStart = -1;
  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index] ?? 0;
    if (level === 0) {
      if (currentStart !== -1) {
        steps.push({ start: currentStart, end: index - 1 });
      }
      currentStart = index;
    } else if (currentStart === -1) {
      currentStart = index;
    }
  }
  if (currentStart !== -1) {
    steps.push({ start: currentStart, end: levels.length - 1 });
  }
  return steps.length > 0 ? steps : levels.map((_, index) => ({ start: index, end: index }));
}
function expandBuildAnimation(entry, animation) {
  const grouping = animation.build?.grouping;
  if (!entry.target.textTarget || entry.target.kind !== "text") {
    throw new PaperError(
      `Animation build grouping "${grouping}" requires a text-containing shape target`,
      { code: "VALIDATION_FAILED", phase: "serialization" }
    );
  }
  const textTarget = entry.target.textTarget;
  if (!isTextBuildGrouping(grouping)) {
    return [{ items: [{ entry, animation }] }];
  }
  const levels = textTarget.paragraphLevels.length > 0 ? textTarget.paragraphLevels : Array.from({ length: textTarget.paragraphCount }, () => 0);
  const steps = grouping === "byFirstLevel" ? buildParagraphSteps(levels, animation.build?.nested ?? true) : buildParagraphSteps(levels, false);
  const groups = [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const firstTrigger = index === 0 ? animation.trigger : "onClick";
    const groupItems = [];
    if (animation.build?.dimAfter && index > 0) {
      groupItems.push({
        entry,
        animation: normalizeAnimationIntent({
          ...animation,
          effect: "colorChange",
          type: "emphasis",
          trigger: "withPrevious",
          toColor: animation.build.dimAfter,
          build: void 0,
          buildType: void 0,
          repeat: void 0,
          repeatCount: void 0
        }),
        paragraphRange: steps[index - 1],
        triggerOverride: "withPrevious"
      });
    }
    if (grouping === "byFirstLevel" && step.end > step.start) {
      for (let paragraphIndex = step.start; paragraphIndex <= step.end; paragraphIndex += 1) {
        groupItems.push({
          entry,
          animation,
          paragraphRange: { start: paragraphIndex, end: paragraphIndex },
          triggerOverride: paragraphIndex === step.start ? firstTrigger : "afterPrevious"
        });
      }
    } else {
      groupItems.push({
        entry,
        animation,
        paragraphRange: step,
        triggerOverride: firstTrigger
      });
    }
    groups.push({ items: groupItems });
  }
  return groups;
}
function buildClickGroups(manifest) {
  const clickGroups = [];
  let pendingGroup = [];
  const flushPendingGroup = () => {
    if (pendingGroup.length > 0) {
      clickGroups.push({ items: pendingGroup });
      pendingGroup = [];
    }
  };
  for (const entry of manifest) {
    const animation = normalizeAnimationIntent(entry.animation);
    if (isBuildAnimation(animation)) {
      flushPendingGroup();
      clickGroups.push(...expandBuildAnimation(entry, animation));
      continue;
    }
    const run = { entry, animation };
    if (pendingGroup.length === 0) {
      pendingGroup.push(run);
      continue;
    }
    if (animation.trigger === "onClick") {
      flushPendingGroup();
      pendingGroup.push(run);
    } else {
      pendingGroup.push(run);
    }
  }
  flushPendingGroup();
  return clickGroups;
}
function buildTextBuildEntries(manifest) {
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  let grpIdCounter = 0;
  for (const entry of manifest) {
    const animation = normalizeAnimationIntent(entry.animation);
    if (!isBuildAnimation(animation) || seen.has(entry.shapeId)) continue;
    seen.add(entry.shapeId);
    entries.push({ spid: entry.shapeId, grpId: grpIdCounter++ });
  }
  return entries;
}
function generateTimingXml(manifest, emittedShapeIds, chartBuildEntries, mediaPlaybackEntries) {
  const hasMedia = mediaPlaybackEntries && mediaPlaybackEntries.length > 0;
  if (manifest.length === 0 && !hasMedia) return "";
  if (emittedShapeIds) {
    for (const entry of manifest) {
      if (!emittedShapeIds.has(entry.shapeId)) {
        throw new PaperError(
          `Animation references orphaned shapeId ${entry.shapeId} not found in emitted shapes`,
          { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" }
        );
      }
    }
  }
  const clickGroups = buildClickGroups(manifest);
  const cTnId = { current: 1 };
  const runNodeIdsByShapeId = /* @__PURE__ */ new Map();
  const clickGroupIdsByShapeId = /* @__PURE__ */ new Map();
  const groupsXml = clickGroups.map((group) => emitClickGroupXml(group, cTnId, runNodeIdsByShapeId, clickGroupIdsByShapeId)).join("");
  const bldEntries = buildTextBuildEntries(manifest);
  let grpIdCounter = bldEntries.length;
  const chartBldEntries = [];
  if (chartBuildEntries) {
    const bldTypeMap = {
      bySeries: "series",
      byCategory: "category",
      byElement: "seriesEl",
      allAtOnce: "allAtOnce"
    };
    for (const entry of chartBuildEntries) {
      const bld = bldTypeMap[entry.chartAnimation.buildType] ?? "allAtOnce";
      const grpId = clickGroupIdsByShapeId.get(entry.shapeId) ?? runNodeIdsByShapeId.get(entry.shapeId)?.[0] ?? grpIdCounter++;
      chartBldEntries.push({ spid: entry.shapeId, grpId, bld });
    }
  }
  let bldLstXml = "";
  if (bldEntries.length > 0 || chartBldEntries.length > 0) {
    bldLstXml = "<p:bldLst>";
    for (const bld of bldEntries) {
      bldLstXml += `<p:bldP spid="${bld.spid}" grpId="${bld.grpId}" build="p"/>`;
    }
    for (const bld of chartBldEntries) {
      bldLstXml += `<p:bldGraphic spid="${bld.spid}" grpId="${bld.grpId}"><p:bldSub><a:bldChart xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" bld="${bld.bld}"/></p:bldSub></p:bldGraphic>`;
    }
    bldLstXml += "</p:bldLst>";
  }
  let mediaTimingXml = "";
  if (hasMedia) {
    for (const entry of mediaPlaybackEntries) {
      const { shapeId, mediaType, playback } = entry;
      const vol = playback.volume !== void 0 ? Math.round(playback.volume * 1e3) : 8e4;
      const showWhenStopped = playback.hideOnClick ? "0" : "1";
      const repeatAttr = playback.loop ? ' repeatCount="indefinite"' : "";
      const tagName = mediaType === "video" ? "p:video" : "p:audio";
      const fullScrnAttr = mediaType === "video" ? ' fullScrn="0"' : "";
      const narrationAttr = mediaType === "audio" && entry.playAcrossSlides ? ' isNarration="1"' : "";
      const condXml = playback.autoPlay ? `<p:stCondLst><p:cond delay="0"/></p:stCondLst>` : `<p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>`;
      mediaTimingXml += `<${tagName}${fullScrnAttr}${narrationAttr}><p:cMediaNode vol="${vol}" showWhenStopped="${showWhenStopped}"><p:cTn id="${cTnId.current++}" fill="hold"${repeatAttr}>${condXml}</p:cTn><p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl></p:cMediaNode></${tagName}>`;
    }
  }
  if (manifest.length === 0 && hasMedia) {
    return `<p:timing><p:tnLst><p:par><p:cTn id="${cTnId.current++}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${mediaTimingXml}</p:childTnLst></p:cTn></p:par></p:tnLst>${bldLstXml}</p:timing>`;
  }
  return `<p:timing><p:tnLst><p:par><p:cTn id="${cTnId.current++}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="${cTnId.current++}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${groupsXml}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>${mediaTimingXml}</p:childTnLst></p:cTn></p:par></p:tnLst>${bldLstXml}</p:timing>`;
}

// src/engine/slideProcessor.ts
async function processBackgroundImage(bg, globalMediaCounter, rId, slideIndex, deduplicationMap, renderSignal, mediaFetchBudget) {
  const src = bg.src;
  let buffer;
  let ext;
  try {
    const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const fetchSignal = renderSignal ? AbortSignal.any([renderSignal, timeoutSignal]) : timeoutSignal;
    ({ buffer, ext } = await resolveImageSource(src, {
      context: { slideIndex, nodeType: "background image" },
      signal: fetchSignal,
      validateUrl: validateFetchUrl,
      mediaFetchBudget
    }));
  } catch (error) {
    if (error instanceof PaperError) {
      throw error;
    }
    throw new PaperError(
      `Failed to fetch background image (slide ${slideIndex ?? "?"}): ${src}`,
      { code: "MEDIA_FETCH_FAILED", phase: "media", slideIndex, cause: error }
    );
  }
  if (buffer.length === 0) {
    getLogger().warn(`[media] Empty background image payload on slide ${slideIndex ?? "?"}. Background image skipped.`);
    return void 0;
  }
  if (deduplicationMap && buffer.length > 0) {
    const hash = hashBuffer(buffer);
    const existing = deduplicationMap.get(hash);
    if (existing) {
      return {
        rId,
        mediaPath: existing.mediaPath,
        relativePath: existing.relativePath,
        ext: existing.ext,
        buffer: existing.buffer
      };
    }
    const mediaIndex2 = globalMediaCounter.current++;
    const fileName2 = `image${mediaIndex2}.${ext}`;
    const mediaPath = `ppt/media/${fileName2}`;
    const relativePath = `../media/${fileName2}`;
    deduplicationMap.set(hash, { mediaPath, relativePath, ext, buffer });
    return { rId, mediaPath, relativePath, ext, buffer };
  }
  const mediaIndex = globalMediaCounter.current++;
  const fileName = `image${mediaIndex}.${ext}`;
  return {
    rId,
    mediaPath: `ppt/media/${fileName}`,
    relativePath: `../media/${fileName}`,
    ext,
    buffer
  };
}
function hasMorphIdInTree(node) {
  return someLayoutNode(
    node,
    (candidate) => "morphId" in candidate && typeof candidate.morphId === "string" && candidate.morphId.length > 0,
    { skipHidden: true }
  );
}
function buildFallbackArtifactManifest(slideIndex, layoutTree, mediaManifest, chartManifest) {
  const artifacts = [];
  if (layoutTree._compatibility?.mode === "visual_fallback") {
    if (mediaManifest.assets.length !== 1) {
      throw new PaperError(
        "Slide was marked visual_fallback, but the archive manifest does not contain exactly one full-slide image fallback relationship.",
        {
          code: "PPTX_VISUAL_FALLBACK_MISSING",
          phase: "serialization",
          slideIndex
        }
      );
    }
    const [asset] = mediaManifest.assets;
    artifacts.push({
      kind: "slide_visual_fallback",
      relationshipId: asset.rId,
      mediaPath: asset.mediaPath
    });
  }
  for (const chart of chartManifest.charts) {
    if (chart.renderMode !== "alternate" && chart.renderMode !== "image-only") {
      continue;
    }
    if (!chart.fallbackRId || !chart.fallbackMediaPath || !chart.fallbackPng) {
      throw new PaperError(
        "Chart fallback mode requires a concrete fallback image relationship and media artifact.",
        {
          code: "PPTX_CHART_FALLBACK_MISSING",
          phase: "chart",
          slideIndex
        }
      );
    }
    artifacts.push({
      kind: chart.renderMode === "image-only" ? "chart_visual_fallback" : "chart_alternate_fallback",
      relationshipId: chart.fallbackRId,
      mediaPath: chart.fallbackMediaPath,
      chartIndex: chart.chartIndex
    });
  }
  return { slideIndex, artifacts };
}
async function processSlideLayout(layoutTree, slide, counters, enableFallbackImages, themeColors, slideIndex = 0) {
  const lite = isLiteBundle();
  if (!lite) {
    applyGhostGrid(layoutTree);
  }
  applyVisualOrder(layoutTree);
  let compatibilityReport;
  if (lite) {
    compatibilityReport = {
      slideIndex,
      compatibilityVerdict: "native_safe",
      issues: [],
      fontSubstitutions: {},
      fonts: [],
      pixelGateEligible: true
    };
  } else {
    applyAutoFit(layoutTree);
    compatibilityReport = applyPptxCompatibility(layoutTree, slideIndex);
    if (layoutTree._compatibility?.mode === "visual_fallback") {
      const rendered = await renderSlideToBuffer(layoutTree, {
        width: layoutTree.layout.width,
        height: layoutTree.layout.height,
        themeColors
      });
      if (!rendered) {
        throw new PaperError(
          "Slide was marked visual_fallback, but no full-slide image fallback artifact was produced.",
          {
            code: "PPTX_VISUAL_FALLBACK_MISSING",
            phase: "rendering",
            slideIndex
          }
        );
      }
      layoutTree.children = [{
        type: "Image",
        src: `data:image/png;base64,${rendered.toString("base64")}`,
        decorative: true,
        layout: {
          x: 0,
          y: 0,
          width: layoutTree.layout.width,
          height: layoutTree.layout.height
        },
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: layoutTree.layout.width,
          height: layoutTree.layout.height
        },
        _compatibility: {
          mode: "visual_fallback",
          reason: layoutTree._compatibility.reason,
          fallbackReason: layoutTree._compatibility.fallbackReason
        }
      }];
    }
  }
  const mediaManifest = await processSlideMedia(
    layoutTree,
    counters.globalMediaCounter,
    counters.globalVideoAudioCounter,
    counters.mediaDeduplicationMap,
    counters.mediaFetchBudget
  );
  const videoAudioRIdCount = countVideoAudioRIds(
    mediaManifest.videoAssets,
    mediaManifest.audioAssets.length
  );
  const svgCount = mediaManifest.svgAssets.length;
  const chartStartRId = computeChartStartRId(
    mediaManifest.assets.length,
    mediaManifest.fillAssets.length,
    videoAudioRIdCount,
    svgCount
  );
  const chartManifest = await processSlideCharts(
    layoutTree,
    counters.globalChartCounter,
    chartStartRId,
    counters.globalChartExCounter,
    enableFallbackImages ? counters.globalMediaCounter : void 0,
    enableFallbackImages,
    themeColors
  );
  const mediaRIds = mediaManifest.assets.map((asset) => asset.rId);
  const fillMediaRIds = mediaManifest.fillAssets.map((asset) => asset.rId);
  const chartRIds = chartManifest.charts.map((chart) => chart.rId ?? "");
  const chartRIdCount = countChartRelationshipSlots(chartManifest);
  const hyperlinkRIdStart = chartStartRId + chartRIdCount;
  const videoMediaInfo = mediaManifest.videoAssets.map((video) => ({
    videoRId: video.videoRId,
    mediaRId: video.mediaRId,
    posterRId: video.posterRId,
    webVideo: video.webVideo
  }));
  const audioMediaInfo = mediaManifest.audioAssets.map((audio) => ({
    audioRId: audio.audioRId,
    mediaRId: audio.mediaRId
  }));
  const chartFallbackRIds = chartManifest.charts.map((chart) => chart.fallbackRId ?? "");
  const svgRIds = mediaManifest.svgAssets.map((asset) => asset.svgRId);
  const fallbackArtifactManifest = buildFallbackArtifactManifest(
    slideIndex,
    layoutTree,
    mediaManifest,
    chartManifest
  );
  const result = serializeSlideTree(layoutTree, {
    mediaRIds,
    chartRIds,
    hyperlinkRIdStart,
    fillMediaRIds,
    videoMediaInfo,
    audioMediaInfo,
    chartAssets: chartManifest.charts,
    chartFallbackRIds,
    svgRIds
  });
  for (const va of mediaManifest.videoAssets) {
    if (va.webVideo) {
      result.hyperlinkRels.push({
        rId: va.webVideo.hyperlinkRId,
        url: va.webVideo.watchUrl,
        external: true
      });
    }
  }
  let slideTransition = slide.transition;
  if (!slideTransition && !lite && hasMorphIdInTree(layoutTree)) {
    slideTransition = { type: "morph", duration: 500 };
  }
  if (slideTransition?.type === "morph" && lite) {
    throw new PaperError(
      "Morph transitions are not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",
      { code: "FEATURE_REQUIRES_UPGRADE", phase: "serialization" }
    );
  }
  const transitionXml = generateTransitionXml(slideTransition);
  const timingXml = lite ? "" : generateTimingXml(
    result.animationManifest,
    result.emittedShapeIds,
    result.chartBuildEntries,
    result.mediaPlaybackEntries
  );
  return {
    xml: result.xml,
    mediaManifest,
    chartManifest,
    fallbackArtifactManifest,
    hyperlinkRels: result.hyperlinkRels,
    transitionXml,
    timingXml,
    compatibilityReport
  };
}
function createSlideResultCollector() {
  return {
    slideContents: [],
    slideMediaManifests: [],
    slideChartManifests: [],
    slideFallbackArtifactManifests: [],
    slideHyperlinkRels: [],
    slideTransitionXmls: [],
    slideTimingXmls: [],
    slideBackgrounds: [],
    slideNotes: [],
    slideHeaderFooters: [],
    slideBgImageAssets: [],
    slideCompatibilityReports: []
  };
}
function computeBackgroundImageRId(slideResult) {
  const bgVideoAudioRIdCount = countVideoAudioRIds(
    slideResult.mediaManifest.videoAssets,
    slideResult.mediaManifest.audioAssets.length
  );
  const bgSvgCount = slideResult.mediaManifest.svgAssets.length;
  const bgChartStartRId = computeChartStartRId(
    slideResult.mediaManifest.assets.length,
    slideResult.mediaManifest.fillAssets.length,
    bgVideoAudioRIdCount,
    bgSvgCount
  );
  const chartCount = countChartRelationshipSlots(slideResult.chartManifest);
  const hyperlinkRIdStart = bgChartStartRId + chartCount;
  return `rId${hyperlinkRIdStart + slideResult.hyperlinkRels.length + 1}`;
}
async function collectSlideResult(collector, slide, slideResult, slideIdx, counters, renderSignal) {
  collector.slideContents.push(slideResult.xml);
  collector.slideMediaManifests.push(slideResult.mediaManifest);
  collector.slideChartManifests.push(slideResult.chartManifest);
  collector.slideFallbackArtifactManifests.push(slideResult.fallbackArtifactManifest);
  collector.slideHyperlinkRels.push(slideResult.hyperlinkRels);
  collector.slideTransitionXmls.push(slideResult.transitionXml);
  collector.slideTimingXmls.push(slideResult.timingXml);
  collector.slideBackgrounds.push(slide.background);
  collector.slideCompatibilityReports.push(slideResult.compatibilityReport);
  if (slide.background?.type === "image") {
    const bgRId = computeBackgroundImageRId(slideResult);
    const bgAsset = await processBackgroundImage(
      slide.background,
      counters.globalMediaCounter,
      bgRId,
      slideIdx,
      counters.mediaDeduplicationMap,
      renderSignal,
      counters.mediaFetchBudget
    );
    collector.slideBgImageAssets.push(bgAsset);
  } else {
    collector.slideBgImageAssets.push(void 0);
  }
  collector.slideNotes.push(slide.notes);
  collector.slideHeaderFooters.push(slide.headerFooter);
}

// src/engine/archiveAssembler.ts
var YIELD_FREQUENCY = 10;
var yieldToEventLoop = typeof setImmediate === "function" ? () => new Promise((resolve) => setImmediate(resolve)) : () => new Promise((resolve) => setTimeout(resolve, 0));
function hasAnyNotes(slideNotes) {
  return slideNotes.some((note) => note !== void 0 && note !== "" && !(Array.isArray(note) && note.length === 0));
}
function validateCrossSlideHyperlinks(slideHyperlinkRels, slideCount) {
  for (let slideIndex = 0; slideIndex < slideHyperlinkRels.length; slideIndex += 1) {
    slideHyperlinkRels[slideIndex] = slideHyperlinkRels[slideIndex].filter((rel) => {
      if (rel.external === false) {
        const match = rel.url.match(/^slide(\d+)\.xml$/);
        if (match) {
          const targetSlide = parseInt(match[1], 10);
          if (targetSlide < 1 || targetSlide > slideCount) {
            getLogger().warn(
              `[engine] Removing hyperlink on slide ${slideIndex + 1} targeting non-existent slide ${targetSlide} (presentation has ${slideCount} slides)`
            );
            return false;
          }
        }
      }
      return true;
    });
  }
}
function validateStrictMasterConfiguration(masters, slideMasterNames) {
  if (!masters || masters.length === 0) return;
  const issues = [];
  const masterNames = /* @__PURE__ */ new Set();
  const duplicateMasterNames = /* @__PURE__ */ new Set();
  masters.forEach((master, masterIndex) => {
    if (!master.name) {
      issues.push({
        path: `masters[${masterIndex}].name`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: "Strict editable multi-master output requires every master to have a name.",
        remediation: "Give each slide master a unique name before rendering in strict_editable mode."
      });
    } else if (masterNames.has(master.name)) {
      duplicateMasterNames.add(master.name);
      issues.push({
        path: `masters[${masterIndex}].name`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: `Duplicate slide master name "${master.name}" is not allowed in strict_editable mode.`,
        remediation: "Rename duplicate slide masters or render with an explicit non-strict fallback policy."
      });
    } else {
      masterNames.add(master.name);
    }
    if (!master.layouts || master.layouts.length === 0) {
      issues.push({
        path: `masters[${masterIndex}].layouts`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: `Slide master "${master.name || masterIndex + 1}" has no layouts.`,
        remediation: "Add at least one slide layout for every declared master."
      });
    }
  });
  slideMasterNames.forEach((masterName, slideIndex) => {
    if (masters.length > 1 && !masterName) {
      issues.push({
        path: `slides[${slideIndex}].masterName`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: "Strict editable multi-master output requires each slide to choose a masterName.",
        slideIndex,
        remediation: "Set slide.masterName to one of the declared master names."
      });
      return;
    }
    if (masterName && (!masterNames.has(masterName) || duplicateMasterNames.has(masterName))) {
      issues.push({
        path: `slides[${slideIndex}].masterName`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: `Slide references unresolved masterName "${masterName}" in strict_editable mode.`,
        slideIndex,
        remediation: "Use a unique declared masterName or render with an explicit non-strict fallback policy."
      });
    }
  });
  if (issues.length > 0) {
    throw new PaperError(
      `Strict editable multi-master validation failed with ${issues.length} issue(s).`,
      {
        code: "VALIDATION_FAILED",
        phase: "validation",
        issues
      }
    );
  }
}
function checkAborted(signal, slideIndex, phase = "layout") {
  if (signal?.aborted) {
    throw new PaperError(
      `Render cancelled${slideIndex !== void 0 ? ` at slide ${slideIndex}` : ""}`,
      { code: "RENDER_CANCELLED", phase, slideIndex }
    );
  }
}
async function buildArchive(doc, options) {
  const validated = validateDocument(doc, options);
  const normalized = flattenDocumentZIndex(validated);
  assertPowerPointFontEmbeddingAvailable(normalized);
  await autoLoadDocumentFonts(normalized);
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
    slideCompatibilityReports,
    slideFallbackArtifactManifests
  } = collector;
  const layoutTrees = [];
  const counters = {
    globalMediaCounter: { current: 1 },
    globalChartCounter: { current: 1 },
    globalChartExCounter: { current: 1 },
    globalVideoAudioCounter: { current: 1 },
    mediaDeduplicationMap: /* @__PURE__ */ new Map(),
    mediaFetchBudget: createMediaFetchBudget()
  };
  const layoutWidth = normalized.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX;
  const layoutHeight = normalized.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX;
  if (!Number.isFinite(layoutWidth) || layoutWidth <= 0 || layoutWidth > 4e4) {
    throw new PaperError(
      `Invalid slide width: ${layoutWidth} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" }
    );
  }
  if (!Number.isFinite(layoutHeight) || layoutHeight <= 0 || layoutHeight > 4e4) {
    throw new PaperError(
      `Invalid slide height: ${layoutHeight} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" }
    );
  }
  const enableFallbackImages = normalized.chartFallbackImages ?? false;
  const themeColors = normalized.theme?.colorScheme;
  const totalSlides = normalized.slides.length;
  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex += 1) {
    checkAborted(options?.signal, slideIndex, "layout");
    const slide = normalized.slides[slideIndex];
    const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
    assertAgentRecipeLayoutUtilization(layoutTree, layoutHeight);
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
  validateCrossSlideHyperlinks(slideHyperlinkRels, normalized.slides.length);
  const archive = new PptxArchive();
  const { commentSlideInfos, commentAuthorsXml, commentFilesMap } = processDocumentComments(normalized);
  const hasNotes = hasAnyNotes(slideNotes);
  const hasComments = commentSlideInfos.length > 0;
  const masterCount = normalized.masters?.length ?? 1;
  const hasHandoutMaster = normalized.handoutLayout !== void 0;
  const fontRIdStart = masterCount + normalized.slides.length + 5 + (hasNotes ? 1 : 0) + (hasComments ? 1 : 0) + (hasHandoutMaster ? 1 : 0);
  const { embeddedFontListXml, extraPresentationRels, fontDataFiles } = await processDocumentFonts(
    normalized,
    fontRIdStart
  );
  const slideMasterNames = normalized.slides.map((slide) => slide.masterName);
  if (options?.outputMode === "strict_editable") {
    validateStrictMasterConfiguration(normalized.masters, slideMasterNames);
  }
  archive.assemblePresentation(normalized.slides.length, {
    slideContents,
    slideMediaManifests,
    slideChartManifests,
    slideHyperlinkRels,
    slideTransitionXmls,
    slideTimingXmls,
    slideBackgrounds,
    slideNotes,
    meta: normalized.meta,
    slideSize: normalized.slideSize,
    slideHeaderFooters,
    themeConfig: normalized.theme,
    sections: normalized.sections,
    protection: normalized.protection,
    customShows: normalized.customShows,
    notesSize: normalized.notesSize,
    embeddedFontListXml,
    extraPresentationRels,
    commentSlideInfos,
    commentAuthorsXml,
    fontDataFiles,
    mastersConfig: normalized.masters,
    slideMasterNames,
    slideBgImageAssets,
    customProperties: normalized.customProperties,
    handoutLayout: normalized.handoutLayout,
    printSettings: normalized.printSettings
  });
  for (const [path, content] of commentFilesMap) {
    archive.addFile(path, content);
  }
  const compatibilityReport = summarizeDocumentCompatibility(slideCompatibilityReports);
  return {
    archive,
    compatibilityReport,
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
    slideFallbackArtifactManifests,
    layoutTrees
  };
}

export {
  processDocumentComments,
  assertPowerPointFontEmbeddingAvailable,
  processDocumentFonts,
  processSlideLayout,
  createSlideResultCollector,
  collectSlideResult,
  YIELD_FREQUENCY,
  yieldToEventLoop,
  hasAnyNotes,
  validateCrossSlideHyperlinks,
  checkAborted,
  buildArchive
};
//# sourceMappingURL=chunk-6AZ326SJ.js.map
