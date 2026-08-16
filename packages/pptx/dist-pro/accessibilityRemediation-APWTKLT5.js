import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  validateAccessibility
} from "./chunk-52PUIYV5.js";
import "./chunk-OWC7QHPZ.js";

// src/quality/accessibilityRemediation.ts
function cloneDocument(value) {
  return structuredClone(value);
}
function walkNodes(nodes, callback, parentPath = "") {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = parentPath ? `${parentPath}.children[${i}]` : `children[${i}]`;
    callback(node, path);
    if ("children" in node && Array.isArray(node.children)) {
      walkNodes(node.children, callback, path);
    }
  }
}
function addFix(fixesApplied, code, action, target) {
  fixesApplied.push({
    code,
    action,
    applied: true,
    target
  });
}
function remediateAccessibility(doc) {
  const reportBefore = validateAccessibility(doc);
  const document = cloneDocument(doc);
  const fixesApplied = [];
  const accessibilityConfig = document.accessible && document.accessible !== true ? document.accessible : void 0;
  if (!document.meta?.title && accessibilityConfig?.title) {
    document.meta = { ...document.meta, title: accessibilityConfig.title };
    addFix(fixesApplied, "document.title_missing", "Propagated accessible.title to document metadata.", "meta.title");
  }
  if (!document.meta?.language && accessibilityConfig?.language) {
    document.meta = { ...document.meta, language: accessibilityConfig.language };
    addFix(fixesApplied, "document.language_missing", "Propagated accessible.language to document metadata.", "meta.language");
  }
  for (let slideIndex = 0; slideIndex < document.slides.length; slideIndex++) {
    const slide = document.slides[slideIndex];
    walkNodes(slide.children, (node, path) => {
      if (node.type === "Image" || node.type === "Chart") {
        const graphic = node;
        if (graphic.decorative !== true && (!graphic.altText || graphic.altText.trim().length === 0)) {
          graphic.altText = "Image";
          addFix(
            fixesApplied,
            "image.alt_missing",
            "Applied placeholder alt text to a non-decorative graphic.",
            `slides[${slideIndex}].${path}`
          );
        }
      }
      if (node.type === "Table" && !node.tableData?.style?.firstRow) {
        node.tableData = {
          ...node.tableData,
          style: {
            ...node.tableData?.style ?? {},
            firstRow: true
          }
        };
        addFix(
          fixesApplied,
          "table.header_missing",
          "Marked the first row as a header row for the table.",
          `slides[${slideIndex}].${path}`
        );
      }
    });
  }
  const reportAfter = validateAccessibility(document);
  return {
    document,
    reportBefore,
    reportAfter,
    fixesApplied
  };
}
export {
  remediateAccessibility
};
//# sourceMappingURL=accessibilityRemediation-APWTKLT5.js.map
