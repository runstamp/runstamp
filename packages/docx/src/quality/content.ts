import type JSZip from "jszip";
import type { QualityFinding } from "./types.js";
import type { DocxQualityIssue } from "./structural.js";
import { posix as path } from "node:path";

function getDocumentParagraphs(documentXml: string): string[] {
  return Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g), (match) => match[0]);
}

export async function collectContentIssues(zip: JSZip): Promise<DocxQualityIssue[]> {
  const issues: DocxQualityIssue[] = [];
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    return issues;
  }

  const paragraphs = getDocumentParagraphs(documentXml);
  let highestHeading = 0;
  paragraphs.forEach((paragraphXml, paragraphIndex) => {
    const headingLevel = Number(paragraphXml.match(/<w:pStyle\b[^>]*w:val="Heading([1-6])"/)?.[1] ?? "0");
    if (headingLevel > 0) {
      if (headingLevel > highestHeading + 1) {
        issues.push({
          code: "DOCX_HEADING_HIERARCHY_BROKEN",
          severity: "warning",
          paragraphIndex,
          message: `Heading level H${headingLevel} appears before H${headingLevel - 1}.`,
          autoFixed: false,
          kind: "heading_hierarchy",
        });
      }
      highestHeading = Math.max(highestHeading, headingLevel);
    }

    const textLength = Array.from(paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g), (match) => match[1]).join("").length;
    const fontSize = Number(paragraphXml.match(/<w:sz\b[^>]*w:val="(\d+)"/)?.[1] ?? "0");
    const indent = Number(paragraphXml.match(/<w:ind\b[^>]*w:left="(\d+)"/)?.[1] ?? "0");
    if (textLength > 1200 || (textLength > 700 && fontSize >= 32 && indent > 720)) {
      issues.push({
        code: "DOCX_PARAGRAPH_OVERFLOW",
        severity: "warning",
        paragraphIndex,
        message: `Paragraph ${paragraphIndex + 1} is likely to overflow the available column width.`,
        autoFixed: false,
        kind: "paragraph_overflow",
      });
    }

    const runs = Array.from(paragraphXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g), (match) => match[0]);
    for (let index = 1; index < runs.length; index += 1) {
      const previousHasProperties = runs[index - 1]?.includes("<w:rPr");
      const currentHasProperties = runs[index]?.includes("<w:rPr");
      if (previousHasProperties !== currentHasProperties) {
        issues.push({
          code: "DOCX_RUN_SPLIT_FORMATTING_LOSS",
          severity: "warning",
          paragraphIndex,
          message: `Paragraph ${paragraphIndex + 1} contains adjacent runs with mismatched formatting properties.`,
          autoFixed: false,
          kind: "run_split_formatting",
        });
        break;
      }
    }
  });

  const documentRelsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
  const imageTargets = new Map<string, string>();
  for (const match of documentRelsXml?.matchAll(/<Relationship\b([^>]*)\/?>/g) ?? []) {
    const attributes = parseXmlAttributes(match[1]);
    if (attributes.Type?.includes("/image") && attributes.Id && attributes.Target) {
      imageTargets.set(attributes.Id, attributes.Target);
    }
  }
  for (const match of documentXml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)) {
    const relationshipId = match[1];
    const target = imageTargets.get(relationshipId);
    if (!target) {
      issues.push({
        code: "DOCX_IMAGE_REF_MISSING",
        severity: "error",
        message: `Image relationship ${relationshipId} is missing from document relationships.`,
        autoFixed: false,
        kind: "missing_image_relationship",
        relationshipId,
      });
      continue;
    }
    const resolvedTarget = resolveDocumentRelationshipTarget(target);
    if (!zip.file(resolvedTarget)) {
      issues.push({
        code: "DOCX_IMAGE_REF_MISSING",
        severity: "error",
        message: `Image relationship ${relationshipId} points to missing part ${resolvedTarget}.`,
        autoFixed: false,
        kind: "missing_image_target",
        relationshipId,
        target: resolvedTarget,
      });
    }
  }

  return issues;
}

function parseXmlAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of input.matchAll(/([A-Za-z0-9_.:-]+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function resolveDocumentRelationshipTarget(target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1);
  }
  return path.normalize(`word/${target}`);
}

export function summarizeCounts(findings: QualityFinding[]): {
  imageCount: number;
  tableCount: number;
} {
  return {
    imageCount: findings.filter((finding) => finding.code === "DOCX_IMAGE_REF_MISSING").length,
    tableCount: findings.filter((finding) => finding.code === "DOCX_TABLE_WIDTH_MISMATCH").length,
  };
}
