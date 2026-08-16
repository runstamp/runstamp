/**
 * Table of Contents Generator for DOCX (Raw OOXML)
 *
 * Generates Table of Contents using raw OOXML format.
 * Creates proper field codes that Word can update.
 */

import { SemanticElement } from '../semantic-types';
import { escapeXml } from '../utils/xml.js';

// =============================================================================
// TYPES
// =============================================================================

export interface TocEntry {
  text: string;
  level: number; // 1-9
  bookmark: string;
}

export interface TocOptions {
  title?: string;
  levels?: number; // 1-9, how many heading levels to include
  showPageNumbers?: boolean;
  hyperlinks?: boolean;
}

// =============================================================================
// TOC ENTRY EXTRACTION
// =============================================================================

/**
 * Extract TOC entries from semantic elements.
 */
export function extractTocEntries(
  elements: SemanticElement[],
  maxLevel: number = 3
): TocEntry[] {
  const entries: TocEntry[] = [];
  let bookmarkCounter = 1;

  function processElement(element: SemanticElement): void {
    if (element.type === 'heading' && element.attributes.headingLevel) {
      const level = element.attributes.headingLevel;

      if (level <= maxLevel) {
        entries.push({
          text: element.content,
          level,
          bookmark: `_Toc${bookmarkCounter++}`,
        });
      }
    }

    for (const child of element.children) {
      processElement(child);
    }
  }

  for (const element of elements) {
    processElement(element);
  }

  return entries;
}

// =============================================================================
// TOC XML GENERATION
// =============================================================================

/**
 * Generate TOC field code XML.
 */
export function generateTocXml(options: TocOptions = {}): string {
  const {
    title = 'Table of Contents',
    levels = 3,
    hyperlinks = true,
  } = options;

  const switches: string[] = [];

  // \\o = outline levels
  switches.push(`\\\\o "1-${levels}"`);

  // \\h = hyperlinks
  if (hyperlinks) {
    switches.push('\\\\h');
  }

  // \\z = hide tab leader and page numbers in web layout
  switches.push('\\\\z');

  // \\u = use applied paragraph outline level
  switches.push('\\\\u');

  const fieldCode = `TOC ${switches.join(' ')}`;

  return `<w:sdt>
<w:sdtPr>
  <w:docPartObj>
    <w:docPartGallery w:val="Table of Contents"/>
    <w:docPartUnique/>
  </w:docPartObj>
</w:sdtPr>
<w:sdtContent>
  <w:p>
    <w:pPr>
      <w:pStyle w:val="TOCHeading"/>
    </w:pPr>
    <w:r>
      <w:t>${escapeXml(title)}</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:r>
      <w:fldChar w:fldCharType="begin"/>
    </w:r>
    <w:r>
      <w:instrText xml:space="preserve"> ${fieldCode} </w:instrText>
    </w:r>
    <w:r>
      <w:fldChar w:fldCharType="separate"/>
    </w:r>
  </w:p>
  ${generateTocPlaceholder()}
  <w:p>
    <w:r>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:sdtContent>
</w:sdt>`;
}

function generateTocPlaceholder(): string {
  // Generate placeholder entries that Word will replace
  return `<w:p>
<w:pPr>
  <w:pStyle w:val="TOC1"/>
</w:pPr>
<w:r>
  <w:t>Update this table of contents by right-clicking and selecting "Update Field"</w:t>
</w:r>
</w:p>`;
}

// =============================================================================
// TOC STYLES
// =============================================================================

/**
 * Generate TOC styles to add to styles.xml.
 */
export function generateTocStyles(): string {
  const styles: string[] = [];

  // TOC Heading style
  styles.push(`<w:style w:type="paragraph" w:styleId="TOCHeading">
<w:name w:val="TOC Heading"/>
<w:basedOn w:val="Heading1"/>
<w:next w:val="Normal"/>
<w:pPr>
  <w:spacing w:before="240" w:after="0"/>
  <w:outlineLvl w:val="9"/>
</w:pPr>
<w:rPr>
  <w:b/>
  <w:sz w:val="28"/>
</w:rPr>
</w:style>`);

  // TOC level styles
  for (let level = 1; level <= 9; level++) {
    const indent = (level - 1) * 220; // Increasing indent per level

    styles.push(`<w:style w:type="paragraph" w:styleId="TOC${level}">
<w:name w:val="toc ${level}"/>
<w:basedOn w:val="Normal"/>
<w:next w:val="Normal"/>
<w:pPr>
  <w:tabs>
    <w:tab w:val="right" w:leader="dot" w:pos="9350"/>
  </w:tabs>
  <w:spacing w:after="100"/>
  <w:ind w:left="${indent}"/>
</w:pPr>
</w:style>`);
  }

  return styles.join('\n');
}

// =============================================================================
// BOOKMARKS
// =============================================================================

/**
 * Generate bookmark for heading (used for TOC hyperlinks).
 */
export function generateHeadingBookmark(
  _headingContent: string,
  bookmarkId: number,
  bookmarkName: string
): { start: string; end: string } {
  return {
    start: `<w:bookmarkStart w:id="${bookmarkId}" w:name="${bookmarkName}"/>`,
    end: `<w:bookmarkEnd w:id="${bookmarkId}"/>`,
  };
}

/**
 * Generate a heading with a TOC bookmark.
 */
export function generateHeadingWithBookmark(
  content: string,
  level: number,
  bookmarkId: number,
  bookmarkName: string
): string {
  return `<w:p>
<w:pPr>
  <w:pStyle w:val="Heading${level}"/>
</w:pPr>
<w:bookmarkStart w:id="${bookmarkId}" w:name="${bookmarkName}"/>
<w:r>
  <w:t>${escapeXml(content)}</w:t>
</w:r>
<w:bookmarkEnd w:id="${bookmarkId}"/>
</w:p>`;
}

// =============================================================================
// MANUAL TOC ENTRIES
// =============================================================================

/**
 * Generate a manual TOC entry (for custom TOCs).
 */
export function generateManualTocEntry(
  text: string,
  pageNumber: number,
  level: number = 1
): string {
  return `<w:p>
<w:pPr>
  <w:pStyle w:val="TOC${level}"/>
</w:pPr>
<w:r>
  <w:t>${escapeXml(text)}</w:t>
</w:r>
<w:r>
  <w:tab/>
</w:r>
<w:r>
  <w:t>${pageNumber}</w:t>
</w:r>
</w:p>`;
}

/**
 * Generate a complete manual TOC from entries.
 */
export function generateManualToc(
  entries: TocEntry[],
  title: string = 'Table of Contents'
): string {
  const entryXml = entries
    .map((entry) => generateManualTocEntry(entry.text, 0, entry.level))
    .join('\n');

  return `<w:p>
<w:pPr>
  <w:pStyle w:val="TOCHeading"/>
</w:pPr>
<w:r>
  <w:t>${escapeXml(title)}</w:t>
</w:r>
</w:p>
${entryXml}`;
}

// =============================================================================
// LIST OF FIGURES/TABLES
// =============================================================================

/**
 * Generate List of Figures field.
 */
export function generateListOfFigures(title: string = 'List of Figures'): string {
  return `<w:p>
<w:pPr>
  <w:pStyle w:val="TOCHeading"/>
</w:pPr>
<w:r>
  <w:t>${escapeXml(title)}</w:t>
</w:r>
</w:p>
<w:p>
<w:r>
  <w:fldChar w:fldCharType="begin"/>
</w:r>
<w:r>
  <w:instrText xml:space="preserve"> TOC \\\\c "Figure" </w:instrText>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="separate"/>
</w:r>
</w:p>
<w:p>
<w:r>
  <w:t>Update this field by right-clicking and selecting "Update Field"</w:t>
</w:r>
</w:p>
<w:p>
<w:r>
  <w:fldChar w:fldCharType="end"/>
</w:r>
</w:p>`;
}

/**
 * Generate List of Tables field.
 */
export function generateListOfTables(title: string = 'List of Tables'): string {
  return `<w:p>
<w:pPr>
  <w:pStyle w:val="TOCHeading"/>
</w:pPr>
<w:r>
  <w:t>${escapeXml(title)}</w:t>
</w:r>
</w:p>
<w:p>
<w:r>
  <w:fldChar w:fldCharType="begin"/>
</w:r>
<w:r>
  <w:instrText xml:space="preserve"> TOC \\\\c "Table" </w:instrText>
</w:r>
<w:r>
  <w:fldChar w:fldCharType="separate"/>
</w:r>
</w:p>
<w:p>
<w:r>
  <w:t>Update this field by right-clicking and selecting "Update Field"</w:t>
</w:r>
</w:p>
<w:p>
<w:r>
  <w:fldChar w:fldCharType="end"/>
</w:r>
</w:p>`;
}

// =============================================================================
// UTILITIES
// =============================================================================
