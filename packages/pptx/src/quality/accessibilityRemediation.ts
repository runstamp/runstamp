import type {
  AccessibilityFix,
  AccessibilityRemediationResult as CanonicalAccessibilityRemediationResult,
} from "./accessibility-contract.js";
import type { PaperDocument, PaperNode } from "../types/ast.js";
import { validateAccessibility, type AccessibilityReport } from "./accessibilityValidator.js";

export interface AccessibilityRemediationResult extends CanonicalAccessibilityRemediationResult {
  document: PaperDocument;
  reportBefore: AccessibilityReport;
  reportAfter: AccessibilityReport;
}

function cloneDocument<T>(value: T): T {
  return structuredClone(value);
}

function walkNodes(nodes: PaperNode[], callback: (node: PaperNode, path: string) => void, parentPath = ""): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = parentPath ? `${parentPath}.children[${i}]` : `children[${i}]`;
    callback(node, path);
    if ("children" in node && Array.isArray(node.children)) {
      walkNodes(node.children, callback, path);
    }
  }
}

function addFix(
  fixesApplied: AccessibilityFix[],
  code: AccessibilityFix["code"],
  action: string,
  target: string | undefined,
): void {
  fixesApplied.push({
    code,
    action,
    applied: true,
    target,
  });
}

export function remediateAccessibility(doc: PaperDocument): AccessibilityRemediationResult {
  const reportBefore = validateAccessibility(doc);
  const document = cloneDocument(doc);
  const fixesApplied: AccessibilityFix[] = [];
  const accessibilityConfig =
    document.accessible && document.accessible !== true ? document.accessible : undefined;

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
        const graphic = node as PaperNode & { altText?: string; decorative?: boolean };
        if (graphic.decorative !== true && (!graphic.altText || graphic.altText.trim().length === 0)) {
          graphic.altText = "Image";
          addFix(
            fixesApplied,
            "image.alt_missing",
            "Applied placeholder alt text to a non-decorative graphic.",
            `slides[${slideIndex}].${path}`,
          );
        }
      }

      if (node.type === "Table" && !node.tableData?.style?.firstRow) {
        node.tableData = {
          ...node.tableData,
          style: {
            ...(node.tableData?.style ?? {}),
            firstRow: true,
          },
        };
        addFix(
          fixesApplied,
          "table.header_missing",
          "Marked the first row as a header row for the table.",
          `slides[${slideIndex}].${path}`,
        );
      }
    });
  }

  const reportAfter = validateAccessibility(document);
  return {
    document,
    reportBefore,
    reportAfter,
    fixesApplied,
  };
}
