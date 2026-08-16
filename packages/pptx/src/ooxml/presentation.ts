// src/ooxml/presentation.ts
import { SLIDE_WIDTH_EMU, SLIDE_HEIGHT_EMU, SLIDE_ID_BASE } from "./constants.js";
import { computePresSlideRId, computePresHandoutMasterRId } from "./rIdCalc.js";
import { PIXEL_TO_EMU } from "./drawing/math.js";
import { escapeXmlAttr } from "./drawing/textUtils.js";
import type { SlideSize, SlideSection, DocumentProtection, CustomShow } from "../types/ast.js";

function createSectionIdGenerator(): () => string {
  let counter = 0;
  return () => {
    const id = (counter++).toString(16).padStart(8, "0");
    return `00000000-0000-0000-0000-${id.padStart(12, "0")}`;
  };
}

export function generatePresentationXml(
  slideCount: number,
  slideSize?: SlideSize,
  options?: {
    sections?: SlideSection[];
    protection?: DocumentProtection;
  customShows?: CustomShow[];
  notesSize?: SlideSize;
  embeddedFontListXml?: string;
  hasHandoutMaster?: boolean;
  hasNotes?: boolean;
  hasComments?: boolean;
  notesMasterRId?: string;
  masterCount?: number;
  },
): string {
  const generateSectionId = createSectionIdGenerator();
  const masterCount = Math.max(1, Math.floor(options?.masterCount ?? 1));

  const widthEmu = slideSize ? Math.round(slideSize.width * PIXEL_TO_EMU) : SLIDE_WIDTH_EMU;
  const heightEmu = slideSize ? Math.round(slideSize.height * PIXEL_TO_EMU) : SLIDE_HEIGHT_EMU;

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">\n`;

  // ECMA-376 Part 1 §19.2.1.26 CT_Presentation element ordering:
  // sldMasterIdLst → notesMasterIdLst → handoutMasterIdLst → sldIdLst →
  // sldSz → notesSz → smartTags → embeddedFontLst → custShowLst →
  // photoAlbum → custDataLst → kinsoku → defaultTextStyle → modifyVerifier → extLst

  // 1. sldMasterIdLst
  xml += `  <p:sldMasterIdLst>\n`;
  for (let i = 0; i < masterCount; i += 1) {
    xml += `    <p:sldMasterId id="${2147483648 + i * 12}" r:id="rId${i + 1}"/>\n`;
  }
  xml += `  </p:sldMasterIdLst>\n`;

  // 2. notesMasterIdLst (ECMA-376 §19.2.1.22 — required when notes master exists)
  if (options?.hasNotes && options.notesMasterRId) {
    xml += `  <p:notesMasterIdLst>\n`;
    xml += `    <p:notesMasterId r:id="${options.notesMasterRId}"/>\n`;
    xml += `  </p:notesMasterIdLst>\n`;
  }

  // 3. handoutMasterIdLst
  if (options?.hasHandoutMaster) {
    const handoutRId = computePresHandoutMasterRId(
      masterCount, slideCount, !!options?.hasNotes, !!options?.hasComments,
    );
    xml += `  <p:handoutMasterIdLst>\n`;
    xml += `    <p:handoutMasterId r:id="rId${handoutRId}"/>\n`;
    xml += `  </p:handoutMasterIdLst>\n`;
  }

  // 3. sldIdLst
  xml += `  <p:sldIdLst>\n`;
  for (let i = 1; i <= slideCount; i++) {
    const slideId = SLIDE_ID_BASE + i; // first slide → 256 (OOXML requires id ≥ 256)
    const rId = computePresSlideRId(masterCount, i);
    xml += `    <p:sldId id="${slideId}" r:id="rId${rId}"/>\n`;
  }
  xml += `  </p:sldIdLst>\n`;

  // 4. sldSz
  xml += `  <p:sldSz cx="${widthEmu}" cy="${heightEmu}" type="custom"/>\n`;

  // 5. notesSz
  const notesCx = options?.notesSize ? Math.round(options.notesSize.width * PIXEL_TO_EMU) : 6858000;
  const notesCy = options?.notesSize ? Math.round(options.notesSize.height * PIXEL_TO_EMU) : 9144000;
  xml += `  <p:notesSz cx="${notesCx}" cy="${notesCy}"/>\n`;

  // 6. embeddedFontLst
  if (options?.embeddedFontListXml) {
    xml += options.embeddedFontListXml;
  }

  // 7. custShowLst
  if (options?.customShows && options.customShows.length > 0) {
    xml += `  <p:custShowLst>\n`;
    for (let i = 0; i < options.customShows.length; i++) {
      const show = options.customShows[i];
      xml += `    <p:custShow name="${escapeXmlAttr(show.name)}" id="${i}">\n`;
      xml += `      <p:sldLst>\n`;
      for (const idx of show.slideIndices) {
        const rId = computePresSlideRId(masterCount, idx + 1);
        xml += `        <p:sld r:id="rId${rId}"/>\n`;
      }
      xml += `      </p:sldLst>\n`;
      xml += `    </p:custShow>\n`;
    }
    xml += `  </p:custShowLst>\n`;
  }

  // 8. defaultTextStyle
  xml += `  <p:defaultTextStyle>\n`;
  xml += `    <a:defPPr>\n`;
  xml += `      <a:defRPr lang="en-US"/>\n`;
  xml += `    </a:defPPr>\n`;

  const levels = [
    { tag: "a:lvl1pPr", marL: "0", sz: "1800" },
    { tag: "a:lvl2pPr", marL: "457200", sz: "1600" },
    { tag: "a:lvl3pPr", marL: "914400", sz: "1400" },
    { tag: "a:lvl4pPr", marL: "1371600", sz: "1200" },
    { tag: "a:lvl5pPr", marL: "1828800", sz: "1000" },
  ];

  for (const lvl of levels) {
    xml += `    <${lvl.tag} marL="${lvl.marL}" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">\n`;
    xml += `      <a:defRPr sz="${lvl.sz}" kern="1200">\n`;
    xml += `        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>\n`;
    xml += `        <a:latin typeface="+mn-lt"/>\n`;
    xml += `        <a:ea typeface="+mn-ea"/>\n`;
    xml += `        <a:cs typeface="+mn-cs"/>\n`;
    xml += `      </a:defRPr>\n`;
    xml += `    </${lvl.tag}>\n`;
  }

  xml += `  </p:defaultTextStyle>\n`;

  // 9. modifyVerifier
  if (options?.protection) {
    const prot = options.protection;
    if (prot.readOnly) {
      xml += `  <p:modifyVerifier cryptProviderType="rsaAES" cryptAlgorithmClass="hash" cryptAlgorithmType="typeAny" cryptAlgorithmSid="14" spinCount="100000"`;
      if (prot.modifyPassword) {
        xml += ` hashData="${escapeXmlAttr(prot.modifyPassword)}"`;
      }
      xml += `/>\n`;
    }
  }

  // Print settings moved to presProps.xml (prnPr belongs in p:presentationPr per OOXML)

  // 10. extLst (must be last child)
  if (options?.sections && options.sections.length > 0) {
    xml += `  <p:extLst>\n`;
    xml += `    <p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}">\n`;
    xml += `      <p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">\n`;
    for (const section of options.sections) {
      xml += `        <p14:section name="${escapeXmlAttr(section.name)}" id="{${generateSectionId()}}">\n`;
      xml += `          <p14:sldIdLst>\n`;
      for (const slideIdx of section.slideIndices) {
        xml += `            <p14:sldId id="${SLIDE_ID_BASE + 1 + slideIdx}"/>\n`;
      }
      xml += `          </p14:sldIdLst>\n`;
      xml += `        </p14:section>\n`;
    }
    xml += `      </p14:sectionLst>\n`;
    xml += `    </p:ext>\n`;
    xml += `  </p:extLst>\n`;
  }

  xml += `</p:presentation>`;
  return xml;
}
