import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  computeAutoFit
} from "./chunk-AIRKBIKH.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";

// src/interpreter/slideSplitter.ts
var DEFAULT_MAX_DEPTH = 10;
var MAX_ALLOWED_DEPTH = 12;
var DEFAULT_TEXT_WIDTH = 800;
var DEFAULT_TEXT_HEIGHT = 400;
var COMFORTABLE_FIT_THRESHOLD = 1e5;
function findPrimaryTextBody(nodes) {
  let best = null;
  let bestSize = 0;
  function visit(node) {
    if (node.type === "Text") {
      const size = estimateTextSize(node);
      if (size > bestSize) {
        bestSize = size;
        best = node;
      }
    }
    if ("children" in node && node.children) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }
  for (const node of nodes) {
    visit(node);
  }
  return best;
}
function estimateTextSize(text) {
  if (text.paragraphs && text.paragraphs.length > 0) {
    return text.paragraphs.reduce(
      (sum, p) => sum + p.runs.reduce((s, r) => s + r.text.length, 0),
      0
    );
  }
  if (text.content) {
    if (typeof text.content === "string") return text.content.length;
    return text.content.reduce((s, r) => s + r.text.length, 0);
  }
  return 0;
}
function textOverflows(textNode, width, height) {
  const content = textNode.paragraphs ? paragraphsToRuns(textNode.paragraphs) : textNode.content ?? "";
  const result = computeAutoFit(content, textNode.style, width, height);
  return result.overflow;
}
function fitsComfortably(runs, style, width, height) {
  const result = computeAutoFit(runs, style, width, height);
  return result.fontScale >= COMFORTABLE_FIT_THRESHOLD && !result.overflow;
}
function paragraphsToRuns(paragraphs) {
  const runs = [];
  for (const p of paragraphs) {
    for (const r of p.runs) {
      runs.push(r);
    }
  }
  return runs;
}
function findTitleNode(nodes) {
  for (const node of nodes) {
    if (node.type === "Text" && node.style && (node.style.fontSize ?? 0) >= 18) {
      return node;
    }
  }
  return null;
}
function findMaxFitParagraphs(paragraphs, startIdx, style, width, height) {
  const available = paragraphs.length - startIdx;
  if (available <= 0) return 0;
  if (fitsComfortably(paragraphsToRuns(paragraphs.slice(startIdx)), style, width, height)) {
    return available;
  }
  let lo = 0;
  let hi = available;
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    const subset = paragraphs.slice(startIdx, startIdx + mid);
    if (fitsComfortably(paragraphsToRuns(subset), style, width, height)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}
function findMaxFitRuns(runs, startIdx, style, width, height) {
  const available = runs.length - startIdx;
  if (available <= 0) return 0;
  if (fitsComfortably(runs.slice(startIdx), style, width, height)) {
    return available;
  }
  let lo = 0;
  let hi = available;
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    const subset = runs.slice(startIdx, startIdx + mid);
    if (fitsComfortably(subset, style, width, height)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}
function cloneSlideWithReplacedBody(slide, original, replacement) {
  return {
    ...slide,
    children: replaceInNodes(slide.children, original, replacement)
  };
}
function replaceInNodes(nodes, original, replacement) {
  return nodes.map((node) => {
    if (node === original) return replacement;
    if ("children" in node && node.children) {
      return {
        ...node,
        children: replaceInNodes(node.children, original, replacement)
      };
    }
    return node;
  });
}
function appendContToTitle(slide) {
  const titleNode = findTitleNode(slide.children);
  if (!titleNode) return slide;
  const updatedTitle = { ...titleNode };
  if (typeof updatedTitle.content === "string") {
    if (!updatedTitle.content.endsWith("(Cont.)")) {
      updatedTitle.content = updatedTitle.content + " (Cont.)";
    }
  } else if (Array.isArray(updatedTitle.content) && updatedTitle.content.length > 0) {
    const lastRun = updatedTitle.content[updatedTitle.content.length - 1];
    if (!lastRun.text.endsWith("(Cont.)")) {
      updatedTitle.content = [
        ...updatedTitle.content.slice(0, -1),
        { ...lastRun, text: lastRun.text + " (Cont.)" }
      ];
    }
  }
  return {
    ...slide,
    children: replaceInNodes(slide.children, titleNode, updatedTitle)
  };
}
function splitSlide(slide, options) {
  const body = findPrimaryTextBody(slide.children);
  if (!body) return [slide];
  if (!textOverflows(body, options.textWidth, options.textHeight)) {
    return [slide];
  }
  const maxSlides = 2 ** options.maxDepth;
  if (body.paragraphs && body.paragraphs.length > 1) {
    return greedyParagraphSplit(slide, body, body.paragraphs, options, maxSlides);
  }
  if (Array.isArray(body.content) && body.content.length > 1) {
    return greedyRunSplit(slide, body, body.content, options, maxSlides);
  }
  if (typeof body.content === "string") {
    return greedyStringSplit(slide, body, body.content, options, maxSlides);
  }
  return [slide];
}
function greedyParagraphSplit(slide, body, paragraphs, options, maxSlides) {
  const slides = [];
  let start = 0;
  while (start < paragraphs.length) {
    if (slides.length + 1 >= maxSlides) {
      const chunk2 = paragraphs.slice(start);
      const replacement2 = { ...body, paragraphs: chunk2 };
      const newSlide2 = cloneSlideWithReplacedBody(slide, body, replacement2);
      slides.push(slides.length > 0 ? appendContToTitle(newSlide2) : newSlide2);
      start = paragraphs.length;
      break;
    }
    let fitCount = findMaxFitParagraphs(
      paragraphs,
      start,
      body.style,
      options.textWidth,
      options.textHeight
    );
    if (fitCount === 0) fitCount = 1;
    const remaining = paragraphs.length - (start + fitCount);
    if (remaining === 1 && fitCount > 1) {
      fitCount--;
    }
    const chunk = paragraphs.slice(start, start + fitCount);
    const replacement = { ...body, paragraphs: chunk };
    const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
    slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);
    start += fitCount;
  }
  return slides;
}
function greedyRunSplit(slide, body, runs, options, maxSlides) {
  const slides = [];
  let start = 0;
  while (start < runs.length) {
    if (slides.length + 1 >= maxSlides) {
      const chunk2 = runs.slice(start);
      const replacement2 = { ...body, content: chunk2 };
      const newSlide2 = cloneSlideWithReplacedBody(slide, body, replacement2);
      slides.push(slides.length > 0 ? appendContToTitle(newSlide2) : newSlide2);
      start = runs.length;
      break;
    }
    let fitCount = findMaxFitRuns(
      runs,
      start,
      body.style,
      options.textWidth,
      options.textHeight
    );
    if (fitCount === 0) fitCount = 1;
    const remaining = runs.length - (start + fitCount);
    if (remaining === 1 && fitCount > 1) {
      fitCount--;
    }
    const chunk = runs.slice(start, start + fitCount);
    const replacement = { ...body, content: chunk };
    const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
    slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);
    start += fitCount;
  }
  return slides;
}
function greedyStringSplit(slide, body, text, options, maxSlides) {
  const lines = text.split("\n");
  if (lines.length > 1) {
    const paragraphs = lines.map((line) => ({
      runs: [{ text: line }]
    }));
    return greedyParagraphSplit(slide, body, paragraphs, options, maxSlides);
  }
  const words = text.split(/\s+/);
  if (words.length <= 1) return [slide];
  const slides = [];
  let start = 0;
  while (start < words.length) {
    if (slides.length + 1 >= maxSlides) {
      const chunk2 = words.slice(start).join(" ");
      const replacement2 = { ...body, content: chunk2 };
      const newSlide2 = cloneSlideWithReplacedBody(slide, body, replacement2);
      slides.push(slides.length > 0 ? appendContToTitle(newSlide2) : newSlide2);
      start = words.length;
      break;
    }
    let lo = 0;
    let hi = words.length - start;
    while (lo < hi) {
      const mid = lo + Math.ceil((hi - lo) / 2);
      const chunk2 = words.slice(start, start + mid).join(" ");
      if (fitsComfortably(chunk2, body.style, options.textWidth, options.textHeight)) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    let fitCount = lo;
    if (fitCount === 0) fitCount = 1;
    const remaining = words.length - (start + fitCount);
    if (remaining === 1 && fitCount > 1) {
      fitCount--;
    }
    const chunk = words.slice(start, start + fitCount).join(" ");
    const replacement = { ...body, content: chunk };
    const newSlide = cloneSlideWithReplacedBody(slide, body, replacement);
    slides.push(slides.length > 0 ? appendContToTitle(newSlide) : newSlide);
    start += fitCount;
  }
  return slides;
}
function applyElasticPagination(doc, options) {
  const requestedDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (requestedDepth > MAX_ALLOWED_DEPTH) {
    getLogger().warn(
      `[pagination] maxDepth ${requestedDepth} exceeds ceiling of ${MAX_ALLOWED_DEPTH}; clamped to prevent resource exhaustion.`
    );
  }
  const opts = {
    maxDepth: Math.max(0, Math.min(requestedDepth, MAX_ALLOWED_DEPTH)),
    textWidth: options?.textWidth ?? DEFAULT_TEXT_WIDTH,
    textHeight: options?.textHeight ?? DEFAULT_TEXT_HEIGHT
  };
  const expandedSlides = [];
  for (const slide of doc.slides) {
    expandedSlides.push(...splitSlide(slide, opts));
  }
  if (expandedSlides.length > doc.slides.length) {
    getLogger().metric?.("pagination.activated", expandedSlides.length - doc.slides.length, {
      originalSlides: String(doc.slides.length),
      expandedSlides: String(expandedSlides.length)
    });
  }
  return { ...doc, slides: expandedSlides };
}

export {
  applyElasticPagination
};
//# sourceMappingURL=chunk-47T2WMZG.js.map
