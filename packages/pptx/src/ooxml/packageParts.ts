// src/ooxml/packageParts.ts — Package-level parts required by every native PPTX

import type { PrintSettings } from "../types/ast.js";

/**
 * Generates ppt/presProps.xml — Presentation properties.
 * Per OOXML, print settings (prnPr) belong here, not in presentation.xml.
 */
export function generatePresProps(printSettings?: PrintSettings): string {
  let innerXml = "";

  if (printSettings) {
    const attrs: string[] = [];
    if (printSettings.colorMode) attrs.push(`clrMode="${printSettings.colorMode}"`);
    if (printSettings.frameSlides) attrs.push(`frameSlides="1"`);
    if (printSettings.scaleToFitPaper) attrs.push(`scaleToFitPaper="1"`);
    if (attrs.length > 0) {
      innerXml += `  <p:prnPr ${attrs.join(" ")}/>\n`;
    }
  }

  if (innerXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">\n${innerXml}</p:presentationPr>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;
}

/**
 * Generates ppt/viewProps.xml — View properties (normal view restore state).
 */
export function generateViewProps(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:normalViewPr>
    <p:restoredLeft sz="15620"/>
    <p:restoredTop sz="94660"/>
  </p:normalViewPr>
  <p:slideViewPr>
    <p:cSldViewPr>
      <p:cViewPr varScale="1">
        <p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale>
        <p:origin x="0" y="0"/>
      </p:cViewPr>
    </p:cSldViewPr>
  </p:slideViewPr>
</p:viewPr>`;
}

/**
 * Generates ppt/tableStyles.xml — Table style list (empty default).
 */
export function generateTableStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`;
}
