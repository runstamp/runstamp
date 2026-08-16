import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  emitRenderabilityWarnings
} from "./chunk-FUBHCOLD.js";
import {
  PaperDocumentSchema
} from "./chunk-6QXZRXYS.js";
import {
  ZodError
} from "./chunk-SHJL7Z52.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/zIndex.ts
function sortNodeChildren(nodes) {
  const tagged = nodes.map((node, i) => ({ node, i }));
  tagged.sort((a, b) => {
    const za = a.node.style?.zIndex ?? 0;
    const zb = b.node.style?.zIndex ?? 0;
    return za !== zb ? za - zb : a.i - b.i;
  });
  return tagged.map(({ node }) => stripZIndexFromNode(node));
}
function stripZIndexFromNode(node) {
  switch (node.type) {
    case "View": {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return {
        ...node,
        style: styleRest,
        children: node.children ? sortNodeChildren(node.children) : void 0
      };
    }
    case "Group": {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return {
        ...node,
        style: styleRest,
        children: sortNodeChildren(node.children)
      };
    }
    case "Text":
    case "Image":
    case "Table":
    case "Chart":
    case "Connector":
    case "Video":
    case "Audio": {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return { ...node, style: styleRest };
    }
    default: {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return { ...node, style: styleRest };
    }
  }
}
function flattenDocumentZIndex(doc) {
  return {
    ...doc,
    slides: doc.slides.map((slide) => {
      const { zIndex: _z, ...slideStyle } = slide.style ?? {};
      return {
        ...slide,
        style: slideStyle,
        children: sortNodeChildren(slide.children)
      };
    })
  };
}

// src/engine/documentValidation.ts
var MAX_TOTAL_NODES = 5e4;
var MAX_NESTING_DEPTH = 20;
function checkNodeLimits(slides) {
  let totalNodes = 0;
  function walk(children, depth) {
    if (!children) return;
    if (depth > MAX_NESTING_DEPTH) {
      throw new PaperError(
        `Document exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`,
        { code: "VALIDATION_FAILED", phase: "validation" }
      );
    }
    for (const child of children) {
      totalNodes += 1;
      if (totalNodes > MAX_TOTAL_NODES) {
        throw new PaperError(
          `Document exceeds maximum node count of ${MAX_TOTAL_NODES}`,
          { code: "RESOURCE_LIMIT_EXCEEDED", phase: "validation" }
        );
      }
      const node = child;
      if (node.children) walk(node.children, depth + 1);
    }
  }
  for (const slide of slides) {
    walk(slide.children, 1);
  }
}
function normalizeGradientFillAlias(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const fill = value;
  if (fill.type !== "gradient" || !Array.isArray(fill.stops)) {
    return value;
  }
  return {
    ...fill,
    type: "linear",
    angle: fill.angle ?? 0
  };
}
function normalizeStyleFillAliases(style) {
  if (!style) return style;
  const normalizedFill = normalizeGradientFillAlias(style.fill);
  const normalizedGradientFill = normalizeGradientFillAlias(style.gradientFill);
  if (normalizedFill === style.fill && normalizedGradientFill === style.gradientFill) {
    return style;
  }
  return {
    ...style,
    fill: normalizedFill,
    gradientFill: normalizedGradientFill
  };
}
function normalizeNodeFillAliases(node) {
  switch (node.type) {
    case "View":
    case "Group": {
      const normalizedStyle = normalizeStyleFillAliases(node.style);
      const existingChildren = node.children ?? [];
      const normalizedChildren = existingChildren.map(normalizeNodeFillAliases);
      const childrenChanged = normalizedChildren.some((child, index) => child !== existingChildren[index]);
      if (normalizedStyle === node.style && !childrenChanged) {
        return node;
      }
      return {
        ...node,
        style: normalizedStyle,
        children: normalizedChildren
      };
    }
    default: {
      const normalizedStyle = normalizeStyleFillAliases(node.style);
      if (normalizedStyle === node.style) {
        return node;
      }
      return {
        ...node,
        style: normalizedStyle
      };
    }
  }
}
function normalizeDocumentFillAliases(doc) {
  const normalizedSlides = doc.slides.map((slide) => {
    const normalizedStyle = normalizeStyleFillAliases(slide.style);
    const existingChildren = slide.children ?? [];
    const normalizedChildren = existingChildren.map(normalizeNodeFillAliases);
    const childrenChanged = normalizedChildren.some((child, index) => child !== existingChildren[index]);
    if (normalizedStyle === slide.style && !childrenChanged) {
      return slide;
    }
    return {
      ...slide,
      style: normalizedStyle,
      children: normalizedChildren
    };
  });
  if (normalizedSlides.every((slide, index) => slide === doc.slides[index])) {
    return doc;
  }
  return {
    ...doc,
    slides: normalizedSlides
  };
}
function validateDocument(doc, options) {
  try {
    const parsed = PaperDocumentSchema.parse(doc);
    checkNodeLimits(parsed.slides);
    const normalized = normalizeDocumentFillAliases(parsed);
    emitRenderabilityWarnings(normalized);
    return normalized;
  } catch (error) {
    if (error instanceof ZodError) {
      getLogger().schemaError?.({
        schemaName: "PaperDocumentSchema",
        errorCount: error.issues.length,
        issues: error.issues.slice(0, 20).map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message
        })),
        timestamp: Date.now()
      });
      const maxDisplayed = 20;
      const issues = error.issues.slice(0, maxDisplayed).map((issue) => {
        const path = issue.path.join(".");
        let hint = "";
        if (issue.code === "invalid_type") {
          hint = ` (expected ${issue.expected}, received ${issue.received})`;
        } else if (issue.code === "too_big") {
          hint = ` (maximum: ${issue.maximum})`;
        }
        return `  - ${path}: ${issue.message}${hint}`;
      }).join("\n");
      const suffix = error.issues.length > maxDisplayed ? `
  ... and ${error.issues.length - maxDisplayed} more error(s)` : "";
      throw new PaperError(
        `Invalid PaperDocument: ${error.issues.length} validation error(s):
${issues}${suffix}`,
        { code: "VALIDATION_FAILED", phase: "validation" }
      );
    }
    throw error;
  }
}

export {
  flattenDocumentZIndex,
  validateDocument
};
//# sourceMappingURL=chunk-ADNRG6JQ.js.map
