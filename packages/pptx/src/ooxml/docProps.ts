// src/ooxml/docProps.ts — Document properties (core.xml and app.xml)

import { isDeterministicMode, DETERMINISTIC_DATE } from "../deterministicMode.js";
import { escapeXml } from "./drawing/textUtils.js";

/**
 * Generates docProps/core.xml with Dublin Core metadata.
 */
export function generateCoreProperties(
  title?: string,
  author?: string,
  language?: string,
): string {
  const now = isDeterministicMode()
    ? DETERMINISTIC_DATE.toISOString().replace(/\.\d{3}Z/, "Z")
    : new Date().toISOString().replace(/\.\d{3}Z/, "Z");
  const titleEl = title ? `  <dc:title>${escapeXml(title)}</dc:title>` : `  <dc:title/>`;
  const creatorEl = author ? `  <dc:creator>${escapeXml(author)}</dc:creator>` : `  <dc:creator>Runstamp</dc:creator>`;
  const languageEl = language ? `\n  <dc:language>${escapeXml(language)}</dc:language>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
${titleEl}
${creatorEl}${languageEl}
  <cp:lastModifiedBy>${author ? escapeXml(author) : "Runstamp"}</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

/**
 * Generates docProps/app.xml with application metadata.
 * @param majorFont - theme major font (heading). Defaults to admitted Carlito.
 * @param minorFont - theme minor font (body). Defaults to admitted Carlito.
 */
export function generateAppProperties(slideCount: number, majorFont?: string, minorFont?: string): string {
  const major = majorFont ?? "Carlito";
  const minor = minorFont ?? "Carlito";

  // Build TitlesOfParts vector: fonts, theme, then slide titles
  let titlesXml = "";
  titlesXml += `      <vt:lpstr>${escapeXml(minor)}</vt:lpstr>\n`;
  titlesXml += `      <vt:lpstr>${escapeXml(major)}</vt:lpstr>\n`;
  titlesXml += `      <vt:lpstr>Office Theme</vt:lpstr>\n`;
  for (let i = 1; i <= slideCount; i++) {
    titlesXml += `      <vt:lpstr>Slide ${i}</vt:lpstr>\n`;
  }

  const totalParts = 2 + 1 + slideCount; // 2 fonts + 1 theme + N slides

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Runstamp</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>${slideCount}</Slides>
  <HiddenSlides>0</HiddenSlides>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="6" baseType="variant">
      <vt:variant><vt:lpstr>Fonts Used</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>2</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Slide Titles</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${slideCount}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${totalParts}" baseType="lpstr">
${titlesXml}    </vt:vector>
  </TitlesOfParts>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;
}
