// src/ooxml/slide.ts
import type { SlideBackground, HeaderFooter, Paragraph } from "../types/ast.js";
import { emitColorXml, cssAngleToOoxml } from "./drawing/math.js";
import { escapeXml, escapeXmlAttr, emitParagraphsXml } from "./drawing/textUtils.js";
import { createOoxmlGuid } from "./deterministicIds.js";

function emitBackgroundXml(bg?: SlideBackground, bgImageRId?: string): string {
  if (!bg) return "";

  let xml = `  <p:bg>\n    <p:bgPr>\n`;

  if (bg.type === "solid") {
    xml += `      <a:solidFill>${emitColorXml(bg.color)}</a:solidFill>\n`;
  } else if (bg.type === "gradient") {
    xml += `      <a:gradFill>\n`;
    xml += `        <a:gsLst>\n`;
    for (const stop of bg.stops) {
      const pos = Math.min(100000, Math.max(0, Math.round(stop.position * 1000)));
      xml += `          <a:gs pos="${pos}">${emitColorXml(stop.color)}</a:gs>\n`;
    }
    xml += `        </a:gsLst>\n`;
    const ang = cssAngleToOoxml(bg.angle ?? 180);
    xml += `        <a:lin ang="${ang}" scaled="1"/>\n`;
    xml += `      </a:gradFill>\n`;
  } else if (bg.type === "pattern") {
    xml += `      <a:pattFill prst="${escapeXmlAttr(bg.pattern)}">\n`;
    xml += `        <a:fgClr>${emitColorXml(bg.foreground)}</a:fgClr>\n`;
    xml += `        <a:bgClr>${emitColorXml(bg.background)}</a:bgClr>\n`;
    xml += `      </a:pattFill>\n`;
  } else if (bg.type === "image" && bgImageRId) {
    xml += `      <a:blipFill>\n`;
    xml += `        <a:blip r:embed="${bgImageRId}"/>\n`;
    if (bg.tile) {
      xml += `        <a:tile tx="0" ty="0" sx="100000" sy="100000"/>\n`;
    } else {
      xml += `        <a:stretch><a:fillRect/></a:stretch>\n`;
    }
    xml += `      </a:blipFill>\n`;
  }

  xml += `      <a:effectLst/>\n`;
  xml += `    </p:bgPr>\n  </p:bg>\n`;
  return xml;
}

// Default slide dimensions — use central constants
import { SLIDE_WIDTH_EMU as DEFAULT_SLIDE_WIDTH_EMU, SLIDE_HEIGHT_EMU as DEFAULT_SLIDE_HEIGHT_EMU } from "./constants.js";

// Proportional positions derived from PowerPoint's default header/footer placement.
// All positions expressed as fractions of slide width/height.
const HF_BOTTOM_MARGIN_RATIO = 11112 / DEFAULT_SLIDE_HEIGHT_EMU;
const HF_HEIGHT = 365125; // Fixed height for all three placeholders

// Slide number (right-aligned)
const SLDNUM_X_RATIO = 8229600 / DEFAULT_SLIDE_WIDTH_EMU;
const SLDNUM_CX_RATIO = 914400 / DEFAULT_SLIDE_WIDTH_EMU;

// Footer (center)
const FOOTER_X_RATIO = 3028950 / DEFAULT_SLIDE_WIDTH_EMU;
const FOOTER_CX_RATIO = 3086100 / DEFAULT_SLIDE_WIDTH_EMU;

// DateTime (left)
const DT_X_RATIO = 457200 / DEFAULT_SLIDE_WIDTH_EMU;
const DT_CX_RATIO = 2133600 / DEFAULT_SLIDE_WIDTH_EMU;

function emitHeaderFooterShapes(
  hf?: HeaderFooter,
  slideWidthEmu?: number,
  slideHeightEmu?: number,
  fieldIdScope = "slide",
): string {
  if (!hf) return "";
  const w = slideWidthEmu ?? DEFAULT_SLIDE_WIDTH_EMU;
  const h = slideHeightEmu ?? DEFAULT_SLIDE_HEIGHT_EMU;
  const y = Math.round(h - HF_HEIGHT - h * HF_BOTTOM_MARGIN_RATIO);

  let xml = "";
  let shapeId = 1000; // high ID to avoid conflicts

  if (hf.slideNumber) {
    xml += `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId++}" name="Slide Number Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="sldNum" sz="quarter" idx="12"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(w * SLDNUM_X_RATIO)}" y="${y}"/>
      <a:ext cx="${Math.round(w * SLDNUM_CX_RATIO)}" cy="${HF_HEIGHT}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:fld id="{${createOoxmlGuid(`${fieldIdScope}:header-footer:slide-number`)}}" type="slidenum">
        <a:rPr lang="en-US" dirty="0"/>
        <a:t>&lt;#&gt;</a:t>
      </a:fld>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>\n`;
  }

  if (hf.footer) {
    xml += `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId++}" name="Footer Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="ftr" sz="quarter" idx="11"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(w * FOOTER_X_RATIO)}" y="${y}"/>
      <a:ext cx="${Math.round(w * FOOTER_CX_RATIO)}" cy="${HF_HEIGHT}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr lang="en-US" dirty="0"/>
        <a:t>${escapeXml(hf.footer)}</a:t>
      </a:r>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>\n`;
  }

  if (hf.dateTime) {
    xml += `<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId++}" name="Date Placeholder"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="dt" sz="half" idx="10"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${Math.round(w * DT_X_RATIO)}" y="${y}"/>
      <a:ext cx="${Math.round(w * DT_CX_RATIO)}" cy="${HF_HEIGHT}"/>
    </a:xfrm>
  </p:spPr>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:fld id="{${createOoxmlGuid(`${fieldIdScope}:header-footer:date-time`)}}" type="datetime1">
        <a:rPr lang="en-US" dirty="0"/>
        <a:t></a:t>
      </a:fld>
      <a:endParaRPr lang="en-US" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>\n`;
  }

  return xml;
}

export function generateSlideShell(
  innerSpTree: string,
  transitionXml: string = "",
  timingXml: string = "",
  background?: SlideBackground,
  headerFooter?: HeaderFooter,
  bgImageRId?: string,
  slideWidthEmu?: number,
  slideHeightEmu?: number,
  fieldIdScope = "slide",
): string {
  const bgXml = emitBackgroundXml(background, bgImageRId);
  const hfXml = emitHeaderFooterShapes(headerFooter, slideWidthEmu, slideHeightEmu, fieldIdScope);
  const extraXml = `${transitionXml}${timingXml}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" showMasterSp="0">
  <p:cSld>
${bgXml}    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      ${innerSpTree}${hfXml}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
${extraXml}</p:sld>`;
}

export function generateSlideLayout(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1" showMasterSp="0">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`;
}

/**
 * Generates a slide master XML with a custom list of layout references.
 * layoutRIds: array of rIds pointing to this master's layouts
 * layoutBaseId: starting id for sldLayoutId elements
 * background: optional slide background
 */
export function generateSlideMasterMulti(
  layoutRIds: string[],
  layoutBaseId: number = 2147483649,
  background?: SlideBackground,
): string {
  const bgXml = emitBackgroundXml(background);
  let layoutListXml = "";
  for (let i = 0; i < layoutRIds.length; i++) {
    layoutListXml += `    <p:sldLayoutId id="${layoutBaseId + i}" r:id="${layoutRIds[i]}"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${bgXml}    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${layoutListXml}  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr marL="228600" indent="-228600" algn="l"><a:defRPr sz="2400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;
}

/**
 * Generates a slide layout XML with a custom name.
 */
export function generateSlideLayoutMulti(name: string = "Blank"): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1" showMasterSp="0">
  <p:cSld name="${escapeXmlAttr(name)}">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`;
}

export function generateSlideMaster(layoutCount: number = 1): string {
  let layoutListXml = "";
  for (let i = 0; i < layoutCount; i++) {
    layoutListXml += `    <p:sldLayoutId id="${2147483649 + i}" r:id="rId${i + 1}"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${layoutListXml}  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPct val="0"/></a:spcBef>
        <a:defRPr sz="4400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mj-lt"/>
          <a:ea typeface="+mj-ea"/>
          <a:cs typeface="+mj-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr marL="228600" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="1000"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="2400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
      <a:lvl2pPr marL="685800" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2013;"/>
        <a:defRPr sz="2000" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl2pPr>
      <a:lvl3pPr marL="1143000" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl3pPr>
      <a:lvl4pPr marL="1600200" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2013;"/>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl4pPr>
      <a:lvl5pPr marL="2057400" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:lnSpc><a:spcPct val="90000"/></a:lnSpc>
        <a:spcBef><a:spcPts val="500"/></a:spcBef>
        <a:buFont typeface="Arial"/>
        <a:buChar char="&#x2022;"/>
        <a:defRPr sz="1600" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl5pPr>
    </p:bodyStyle>
    <p:otherStyle>
      <a:lvl1pPr>
        <a:defRPr sz="1800" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;
}

export interface NotesSlideResult {
  xml: string;
  hyperlinkRels: { rId: string; url: string }[];
}

const NOTES_MASTER_CREATION_ID = "758698067";
const NOTES_SLIDE_CREATION_ID = "3730747076";
const NOTES_DATE_PLACEHOLDER_TEXT = "1/1/00";

/**
 * Generates a notes slide XML for speaker notes.
 * Returns both the XML and any hyperlink rels needed in the notes .rels file.
 */
export function generateNotesSlide(notes: string | Paragraph[], slideNumber: number): NotesSlideResult {
  // Build notes body content
  let notesBodyXml: string;
  const hyperlinkRels: { rId: string; url: string }[] = [];
  if (typeof notes === "string") {
    // Plain text: single paragraph (backward compatible)
    notesBodyXml = `          <a:p>
            <a:r>
              <a:rPr lang="en-US" dirty="0"/>
              <a:t>${escapeXml(notes)}</a:t>
            </a:r>
            <a:endParaRPr lang="en-US" dirty="0"/>
          </a:p>`;
  } else {
    // Rich text: use emitParagraphsXml — hyperlinks are collected for the rels file
    const hyperlinkRIdCounter = { current: 100 };
    notesBodyXml = emitParagraphsXml(notes, undefined, hyperlinkRels, hyperlinkRIdCounter);
  }

  const slideNumberFieldId = createOoxmlGuid(`notes-slide:${slideNumber}:slide-number`);

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Slide Image Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldImg"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Notes Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
${notesBodyXml}
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="5"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:fld id="{${slideNumberFieldId}}" type="slidenum">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>${escapeXml(String(slideNumber))}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
    <p:extLst>
      <p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}">
        <p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="${NOTES_SLIDE_CREATION_ID}"/>
      </p:ext>
    </p:extLst>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:notes>`;
  return { xml, hyperlinkRels };
}

/**
 * Generates a notes master XML.
 */
export function generateNotesMaster(): string {
  const dateFieldId = createOoxmlGuid("notes-master:date");
  const slideNumberFieldId = createOoxmlGuid("notes-master:slide-number");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Header Placeholder 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="hdr" sz="quarter"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle><a:lvl1pPr algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Date Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="dt" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="0"/>
            <a:ext cx="2971800" cy="458788"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle><a:lvl1pPr algn="r"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p>
            <a:fld id="{${dateFieldId}}" type="datetimeFigureOut">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>${NOTES_DATE_PLACEHOLDER_TEXT}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Image Placeholder 3"/>
          <p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="1143000"/>
            <a:ext cx="5486400" cy="3086100"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln w="12700"><a:solidFill><a:prstClr val="black"/></a:solidFill></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Notes Placeholder 4"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="4400550"/>
            <a:ext cx="5486400" cy="3600450"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"/><a:t>Click to edit Master text styles</a:t></a:r></a:p>
          <a:p><a:pPr lvl="1"/><a:r><a:rPr lang="en-US"/><a:t>Second level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="2"/><a:r><a:rPr lang="en-US"/><a:t>Third level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="3"/><a:r><a:rPr lang="en-US"/><a:t>Fourth level</a:t></a:r></a:p>
          <a:p><a:pPr lvl="4"/><a:r><a:rPr lang="en-US"/><a:t>Fifth level</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="6" name="Footer Placeholder 5"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ftr" sz="quarter" idx="4"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle><a:lvl1pPr algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p><a:endParaRPr lang="en-US"/></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="7" name="Slide Number Placeholder 6"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="sldNum" sz="quarter" idx="5"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="8685213"/>
            <a:ext cx="2971800" cy="458787"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="b"/>
          <a:lstStyle><a:lvl1pPr algn="r"><a:defRPr sz="1200"/></a:lvl1pPr></a:lstStyle>
          <a:p>
            <a:fld id="{${slideNumberFieldId}}" type="slidenum">
              <a:rPr lang="en-US" smtClean="0"/>
              <a:t>‹#›</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
    <p:extLst>
      <p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}">
        <p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="${NOTES_MASTER_CREATION_ID}"/>
      </p:ext>
    </p:extLst>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:notesStyle>
    <a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl1pPr>
    <a:lvl2pPr marL="457200" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl2pPr>
    <a:lvl3pPr marL="914400" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl3pPr>
    <a:lvl4pPr marL="1371600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl4pPr>
    <a:lvl5pPr marL="1828800" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl5pPr>
    <a:lvl6pPr marL="2286000" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl6pPr>
    <a:lvl7pPr marL="2743200" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl7pPr>
    <a:lvl8pPr marL="3200400" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl8pPr>
    <a:lvl9pPr marL="3657600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
      <a:defRPr sz="1200" kern="1200">
        <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
        <a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>
      </a:defRPr>
    </a:lvl9pPr>
  </p:notesStyle>
</p:notesMaster>`;
}
