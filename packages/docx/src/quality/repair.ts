import type JSZip from "jszip";
import type { RepairEntry } from "./types.js";
import type { DocxQualityIssue } from "./structural.js";

const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0S8AAAAASUVORK5CYII=";

function appendNumberingDefinition(numberingXml: string, numId: string): string {
  const base = numberingXml.replace(/<\/w:numbering>\s*$/, "");
  return `${base}
  <w:abstractNum w:abstractNumId="${numId}">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="${numId}">
    <w:abstractNumId w:val="${numId}"/>
  </w:num>
</w:numbering>`;
}

function minimalNumberingXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>`;
}

export async function applyDocxRepairs(zip: JSZip, issues: DocxQualityIssue[]): Promise<RepairEntry[]> {
  const repairLog: RepairEntry[] = [];
  const byCode = new Map<string, DocxQualityIssue[]>();
  for (const issue of issues) {
    const current = byCode.get(issue.code) ?? [];
    current.push(issue);
    byCode.set(issue.code, current);
  }

  if (byCode.has("DOCX_RELATIONSHIP_TARGET_MISSING")) {
    const byPath = new Map<string, Set<string>>();
    for (const issue of byCode.get("DOCX_RELATIONSHIP_TARGET_MISSING") ?? []) {
      if (!issue.path || !issue.relationshipId) continue;
      const ids = byPath.get(issue.path) ?? new Set<string>();
      ids.add(issue.relationshipId);
      byPath.set(issue.path, ids);

      if (issue.target?.includes("/media/")) {
        zip.file(issue.target, Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"));
        repairLog.push({
          strategy: "insert_placeholder_media",
          finding: issue.code,
          description: `Inserted placeholder media at ${issue.target}.`,
          success: true,
        });
      }
    }
    for (const [path, ids] of byPath) {
      const xml = await zip.file(path)?.async("string");
      if (!xml) continue;
      const repaired = xml.replace(/<Relationship\b[^>]*Id="([^"]+)"[\s\S]*?\/>/g, (match, id: string) => (
        ids.has(id) ? "" : match
      ));
      if (repaired !== xml) {
        zip.file(path, repaired);
        repairLog.push({
          strategy: "remove_orphan_relationships",
          finding: "DOCX_RELATIONSHIP_TARGET_MISSING",
          description: `Removed orphan relationships from ${path}.`,
          success: true,
        });
      }
    }
  }

  if (byCode.has("DOCX_NUMBERING_DEF_MISSING")) {
    let numberingXml = await zip.file("word/numbering.xml")?.async("string");
    if (!numberingXml) {
      numberingXml = minimalNumberingXml();
      zip.file("word/numbering.xml", numberingXml);
      repairLog.push({
        strategy: "create_numbering_xml",
        finding: "DOCX_NUMBERING_DEF_MISSING",
        description: "Created a minimal numbering.xml with default bullet definitions.",
        success: true,
      });
    }
    for (const issue of byCode.get("DOCX_NUMBERING_DEF_MISSING") ?? []) {
      if (!issue.numId || numberingXml.includes(`w:numId="${issue.numId}"`)) continue;
      numberingXml = appendNumberingDefinition(numberingXml, issue.numId);
      repairLog.push({
        strategy: "append_numbering_definition",
        finding: issue.code,
        description: `Added numbering definition ${issue.numId}.`,
        success: true,
      });
    }
    zip.file("word/numbering.xml", numberingXml);
  }

  if (byCode.has("DOCX_STYLE_REF_MISSING")) {
    const xml = await zip.file("word/document.xml")?.async("string");
    if (xml) {
      let repaired = xml;
      for (const issue of byCode.get("DOCX_STYLE_REF_MISSING") ?? []) {
        if (!issue.styleId) continue;
        repaired = issue.kind === "missing_paragraph_style"
          ? repaired.replace(new RegExp(`<w:pStyle\\b([^>]*)w:val="${issue.styleId}"`, "g"), `<w:pStyle$1w:val="Normal"`)
          : repaired.replace(new RegExp(`<w:rStyle\\b[^>]*w:val="${issue.styleId}"[^>]*/>`, "g"), "");
      }
      if (repaired !== xml) {
        zip.file("word/document.xml", repaired);
        repairLog.push({
          strategy: "repair_style_references",
          finding: "DOCX_STYLE_REF_MISSING",
          description: "Replaced missing paragraph styles with Normal and removed missing character styles.",
          success: true,
        });
      }
    }
  }

  if (byCode.has("DOCX_SECT_PR_MISSING")) {
    const xml = await zip.file("word/document.xml")?.async("string");
    if (xml && !xml.includes("<w:sectPr")) {
      const repaired = xml.replace(
        /<\/w:body>/,
        `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>`,
      );
      zip.file("word/document.xml", repaired);
      repairLog.push({
        strategy: "append_minimal_sectpr",
        finding: "DOCX_SECT_PR_MISSING",
        description: "Appended a minimal A4 sectPr block to the document body.",
        success: true,
      });
    }
  }

  if (byCode.has("DOCX_TRACKED_CHANGE_MALFORMED")) {
    const xml = await zip.file("word/document.xml")?.async("string");
    if (xml) {
      let nextTrackedId = 1;
      const repaired = xml.replace(/<w:(ins|del)\b([^>]*)>/g, (_match, kind: string, attrs: string) => {
        let updatedAttrs = attrs;
        if (!/\bw:id="[^"]+"/.test(updatedAttrs)) {
          updatedAttrs = `${updatedAttrs} w:id="${nextTrackedId}"`;
        }
        if (!/\bw:author="[^"]+"/.test(updatedAttrs)) {
          updatedAttrs = `${updatedAttrs} w:author="Runstamp Repair"`;
        }
        nextTrackedId += 1;
        return `<w:${kind}${updatedAttrs}>`;
      });
      if (repaired !== xml) {
        zip.file("word/document.xml", repaired);
        repairLog.push({
          strategy: "repair_tracked_change_metadata",
          finding: "DOCX_TRACKED_CHANGE_MALFORMED",
          description: "Added missing id/author metadata to malformed tracked changes.",
          success: true,
        });
      }
    }
  }

  if (byCode.has("DOCX_CONTENT_CONTROL_REF_BROKEN")) {
    const xml = await zip.file("word/document.xml")?.async("string");
    if (xml) {
      const repaired = xml.replace(/<w:sdt\b([\s\S]*?)<\/w:sdt>/g, (match) => {
        if (match.includes("<w:sdtContent")) {
          return match;
        }
        return match.replace(/<\/w:sdt>\s*$/, "<w:sdtContent><w:p/></w:sdtContent></w:sdt>");
      });
      if (repaired !== xml) {
        zip.file("word/document.xml", repaired);
        repairLog.push({
          strategy: "repair_content_controls",
          finding: "DOCX_CONTENT_CONTROL_REF_BROKEN",
          description: "Inserted minimal w:sdtContent blocks for broken structured document tags.",
          success: true,
        });
      }
    }
  }

  return repairLog;
}
