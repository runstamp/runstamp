/**
 * Page Layout for DOCX
 *
 * Handles page layout settings for DOCX documents.
 * Generates raw OOXML for section properties.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PageSettings {
  width: number; // Twips
  height: number; // Twips
  orientation: 'portrait' | 'landscape';
  margins: PageMargins;
}

export interface PageMargins {
  top: number; // Twips
  right: number;
  bottom: number;
  left: number;
  header: number;
  footer: number;
  gutter: number;
}

// =============================================================================
// STANDARD PAGE SIZES (in twips)
// =============================================================================

export const PAGE_SIZES = {
  LETTER: { width: 12240, height: 15840 },
  A4: { width: 11906, height: 16838 },
  LEGAL: { width: 12240, height: 20160 },
  A3: { width: 16838, height: 23811 },
  A5: { width: 8391, height: 11906 },
  TABLOID: { width: 15840, height: 24480 },
};

// =============================================================================
// MARGIN PRESETS (in twips)
// =============================================================================

export const MARGIN_PRESETS = {
  NORMAL: {
    top: 1440,
    right: 1440,
    bottom: 1440,
    left: 1440,
    header: 720,
    footer: 720,
    gutter: 0,
  },
  NARROW: {
    top: 720,
    right: 720,
    bottom: 720,
    left: 720,
    header: 720,
    footer: 720,
    gutter: 0,
  },
  MODERATE: {
    top: 1440,
    right: 1080,
    bottom: 1440,
    left: 1080,
    header: 720,
    footer: 720,
    gutter: 0,
  },
  WIDE: {
    top: 1440,
    right: 2880,
    bottom: 1440,
    left: 2880,
    header: 720,
    footer: 720,
    gutter: 0,
  },
};

// =============================================================================
// XML GENERATION
// =============================================================================

/**
 * Generate section properties for page layout.
 */
export function generateSectionProperties(settings: PageSettings): string {
  const { width, height, orientation, margins } = settings;

  // For landscape, swap width/height but add orient attribute
  const [pgW, pgH] =
    orientation === 'landscape' ? [height, width] : [width, height];
  const orientAttr = orientation === 'landscape' ? ' w:orient="landscape"' : '';

  return `<w:sectPr>
<w:pgSz w:w="${pgW}" w:h="${pgH}"${orientAttr}/>
<w:pgMar w:top="${margins.top}" w:right="${margins.right}"
         w:bottom="${margins.bottom}" w:left="${margins.left}"
         w:header="${margins.header}" w:footer="${margins.footer}"
         w:gutter="${margins.gutter}"/>
<w:cols w:space="720"/>
<w:docGrid w:linePitch="360"/>
</w:sectPr>`;
}

/**
 * Generate page break element.
 */
export function generatePageBreak(): string {
  return `<w:p>
<w:r>
  <w:br w:type="page"/>
</w:r>
</w:p>`;
}

/**
 * Generate section break element.
 */
export function generateSectionBreak(
  type: 'continuous' | 'nextPage' | 'evenPage' | 'oddPage'
): string {
  const typeMap = {
    continuous: 'continuous',
    nextPage: 'nextPage',
    evenPage: 'evenPage',
    oddPage: 'oddPage',
  };

  return `<w:p>
<w:pPr>
  <w:sectPr>
    <w:type w:val="${typeMap[type]}"/>
  </w:sectPr>
</w:pPr>
</w:p>`;
}

/**
 * Generate column break element.
 */
export function generateColumnBreak(): string {
  return `<w:r>
  <w:br w:type="column"/>
</w:r>`;
}

/**
 * Create page settings from options.
 */
export function createPageSettings(options: {
  size?: keyof typeof PAGE_SIZES | { width: number; height: number };
  orientation?: 'portrait' | 'landscape';
  margins?: keyof typeof MARGIN_PRESETS | Partial<PageMargins>;
}): PageSettings {
  // Get base size
  let size = PAGE_SIZES.LETTER;
  if (options.size) {
    if (typeof options.size === 'string') {
      size = PAGE_SIZES[options.size] || PAGE_SIZES.LETTER;
    } else {
      size = options.size;
    }
  }

  // Get margins
  let margins = MARGIN_PRESETS.NORMAL;
  if (options.margins) {
    if (typeof options.margins === 'string') {
      margins = MARGIN_PRESETS[options.margins] || MARGIN_PRESETS.NORMAL;
    } else {
      margins = { ...MARGIN_PRESETS.NORMAL, ...options.margins };
    }
  }

  return {
    width: size.width,
    height: size.height,
    orientation: options.orientation || 'portrait',
    margins,
  };
}

// =============================================================================
// HEADER/FOOTER XML GENERATION
// =============================================================================

/**
 * Generate header XML file content.
 */
export function generateHeaderXml(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
${content}
</w:hdr>`;
}

/**
 * Generate footer XML file content.
 */
export function generateFooterXml(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
${content}
</w:ftr>`;
}

/**
 * Generate page number field.
 */
export function generatePageNumber(): string {
  return `<w:p>
<w:pPr>
  <w:jc w:val="center"/>
</w:pPr>
<w:r>
  <w:fldChar w:fldCharType="begin"/>
</w:r>
<w:r>
  <w:instrText xml:space="preserve"> PAGE </w:instrText>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="separate"/>
</w:r>
<w:r>
  <w:t>1</w:t>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="end"/>
</w:r>
</w:p>`;
}

/**
 * Generate "Page X of Y" field.
 */
export function generatePageOfTotal(): string {
  return `<w:p>
<w:pPr>
  <w:jc w:val="center"/>
</w:pPr>
<w:r>
  <w:t xml:space="preserve">Page </w:t>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="begin"/>
</w:r>
<w:r>
  <w:instrText xml:space="preserve"> PAGE </w:instrText>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="separate"/>
</w:r>
<w:r>
  <w:t>1</w:t>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="end"/>
</w:r>
<w:r>
  <w:t xml:space="preserve"> of </w:t>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="begin"/>
</w:r>
<w:r>
  <w:instrText xml:space="preserve"> NUMPAGES </w:instrText>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="separate"/>
</w:r>
<w:r>
  <w:t>1</w:t>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="end"/>
</w:r>
</w:p>`;
}

/**
 * Generate date field.
 */
export function generateDateField(format: string = 'MMMM d, yyyy'): string {
  return `<w:r>
<w:fldChar w:fldCharType="begin"/>
</w:r>
<w:r>
<w:instrText xml:space="preserve"> DATE \\@ "${format}" </w:instrText>
</w:r>
<w:r>
<w:fldChar w:fldCharType="separate"/>
</w:r>
<w:r>
<w:t>${new Date().toLocaleDateString()}</w:t>
</w:r>
<w:r>
<w:fldChar w:fldCharType="end"/>
</w:r>`;
}

// =============================================================================
// HEADER/FOOTER REFERENCES
// =============================================================================

export interface HeaderFooterContent {
  type: 'default' | 'first' | 'even';
  content: string; // OOXML paragraph content
}

export interface HeaderFooterSet {
  headers: HeaderFooterContent[];
  footers: HeaderFooterContent[];
}

/**
 * Generate header/footer reference for section properties.
 */
export function generateHeaderFooterRefs(set: HeaderFooterSet): string {
  const refs: string[] = [];

  for (const header of set.headers) {
    const typeAttr =
      header.type === 'default'
        ? ''
        : header.type === 'first'
          ? ' w:type="first"'
          : ' w:type="even"';
    refs.push(
      `<w:headerReference${typeAttr} r:id="rIdHeader${header.type}"/>`
    );
  }

  for (const footer of set.footers) {
    const typeAttr =
      footer.type === 'default'
        ? ''
        : footer.type === 'first'
          ? ' w:type="first"'
          : ' w:type="even"';
    refs.push(
      `<w:footerReference${typeAttr} r:id="rIdFooter${footer.type}"/>`
    );
  }

  return refs.join('\n');
}

// =============================================================================
// UNIT CONVERSIONS
// =============================================================================

/**
 * Convert inches to twips.
 */
export function inchesToTwips(inches: number): number {
  return Math.round(inches * 1440);
}

/**
 * Convert millimeters to twips.
 */
export function mmToTwips(mm: number): number {
  return Math.round((mm / 25.4) * 1440);
}

/**
 * Convert points to twips.
 */
export function pointsToTwips(points: number): number {
  return Math.round(points * 20);
}

/**
 * Convert pixels to twips (at 96 DPI).
 */
export function pixelsToTwips(pixels: number): number {
  return Math.round((pixels / 96) * 1440);
}
