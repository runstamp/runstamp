/**
 * Raw OOXML Footnotes and Endnotes for DOCX
 *
 * Generates footnotes and endnotes using raw OOXML format.
 * This is the low-level alternative to the docx library approach in footnotes.ts.
 */

import { escapeXml } from '../utils/xml.js';

// =============================================================================
// TYPES
// =============================================================================

export interface RawFootnote {
  id: number;
  content: string;
  type: 'footnote' | 'endnote';
}

export interface RawFootnoteRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

let footnoteCounter = 1;
let endnoteCounter = 1;

/**
 * Reset note counters (call when starting a new document).
 */
export function resetNoteCounters(): void {
  footnoteCounter = 1;
  endnoteCounter = 1;
}

/**
 * Get next footnote ID.
 */
export function getNextFootnoteId(): number {
  return footnoteCounter++;
}

/**
 * Get next endnote ID.
 */
export function getNextEndnoteId(): number {
  return endnoteCounter++;
}

// =============================================================================
// FOOTNOTE REFERENCE GENERATION
// =============================================================================

/**
 * Generate footnote reference in document body.
 */
export function generateFootnoteRef(id: number): string {
  return `<w:r>
<w:rPr>
  <w:rStyle w:val="FootnoteReference"/>
</w:rPr>
<w:footnoteReference w:id="${id}"/>
</w:r>`;
}

/**
 * Generate endnote reference in document body.
 */
export function generateEndnoteRef(id: number): string {
  return `<w:r>
<w:rPr>
  <w:rStyle w:val="EndnoteReference"/>
</w:rPr>
<w:endnoteReference w:id="${id}"/>
</w:r>`;
}

// =============================================================================
// FOOTNOTES.XML GENERATION
// =============================================================================

/**
 * Generate complete footnotes.xml content.
 */
export function generateFootnotesXml(notes: RawFootnote[]): string {
  const footnotes = notes
    .filter((n) => n.type === 'footnote')
    .map((note) => generateFootnoteEntry(note))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:footnote w:type="separator" w:id="-1">
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:separator/>
    </w:r>
  </w:p>
</w:footnote>
<w:footnote w:type="continuationSeparator" w:id="0">
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:continuationSeparator/>
    </w:r>
  </w:p>
</w:footnote>
${footnotes}
</w:footnotes>`;
}

function generateFootnoteEntry(note: RawFootnote): string {
  return `<w:footnote w:id="${note.id}">
<w:p>
  <w:pPr>
    <w:pStyle w:val="FootnoteText"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rStyle w:val="FootnoteReference"/>
    </w:rPr>
    <w:footnoteRef/>
  </w:r>
  <w:r>
    <w:t xml:space="preserve"> ${escapeXml(note.content)}</w:t>
  </w:r>
</w:p>
</w:footnote>`;
}

/**
 * Generate footnote entry with rich text runs.
 */
export function generateRichFootnoteEntry(
  id: number,
  runs: RawFootnoteRun[]
): string {
  const runXml = runs
    .map((run) => {
      const rPr = generateRunProperties(run);
      return `<w:r>
${rPr}
<w:t xml:space="preserve">${escapeXml(run.text)}</w:t>
</w:r>`;
    })
    .join('\n');

  return `<w:footnote w:id="${id}">
<w:p>
  <w:pPr>
    <w:pStyle w:val="FootnoteText"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rStyle w:val="FootnoteReference"/>
    </w:rPr>
    <w:footnoteRef/>
  </w:r>
  ${runXml}
</w:p>
</w:footnote>`;
}

// =============================================================================
// ENDNOTES.XML GENERATION
// =============================================================================

/**
 * Generate complete endnotes.xml content.
 */
export function generateEndnotesXml(notes: RawFootnote[]): string {
  const endnotes = notes
    .filter((n) => n.type === 'endnote')
    .map((note) => generateEndnoteEntry(note))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:endnote w:type="separator" w:id="-1">
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:separator/>
    </w:r>
  </w:p>
</w:endnote>
<w:endnote w:type="continuationSeparator" w:id="0">
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:continuationSeparator/>
    </w:r>
  </w:p>
</w:endnote>
${endnotes}
</w:endnotes>`;
}

function generateEndnoteEntry(note: RawFootnote): string {
  return `<w:endnote w:id="${note.id}">
<w:p>
  <w:pPr>
    <w:pStyle w:val="EndnoteText"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rStyle w:val="EndnoteReference"/>
    </w:rPr>
    <w:endnoteRef/>
  </w:r>
  <w:r>
    <w:t xml:space="preserve"> ${escapeXml(note.content)}</w:t>
  </w:r>
</w:p>
</w:endnote>`;
}

/**
 * Generate endnote entry with rich text runs.
 */
export function generateRichEndnoteEntry(
  id: number,
  runs: RawFootnoteRun[]
): string {
  const runXml = runs
    .map((run) => {
      const rPr = generateRunProperties(run);
      return `<w:r>
${rPr}
<w:t xml:space="preserve">${escapeXml(run.text)}</w:t>
</w:r>`;
    })
    .join('\n');

  return `<w:endnote w:id="${id}">
<w:p>
  <w:pPr>
    <w:pStyle w:val="EndnoteText"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rStyle w:val="EndnoteReference"/>
    </w:rPr>
    <w:endnoteRef/>
  </w:r>
  ${runXml}
</w:p>
</w:endnote>`;
}

// =============================================================================
// STYLES FOR FOOTNOTES/ENDNOTES
// =============================================================================

/**
 * Generate footnote and endnote styles for styles.xml.
 */
export function generateNoteStyles(): string {
  return `<w:style w:type="paragraph" w:styleId="FootnoteText">
<w:name w:val="footnote text"/>
<w:basedOn w:val="Normal"/>
<w:link w:val="FootnoteTextChar"/>
<w:pPr>
  <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
</w:pPr>
<w:rPr>
  <w:sz w:val="20"/>
  <w:szCs w:val="20"/>
</w:rPr>
</w:style>
<w:style w:type="character" w:styleId="FootnoteTextChar">
<w:name w:val="Footnote Text Char"/>
<w:basedOn w:val="DefaultParagraphFont"/>
<w:link w:val="FootnoteText"/>
<w:rPr>
  <w:sz w:val="20"/>
  <w:szCs w:val="20"/>
</w:rPr>
</w:style>
<w:style w:type="character" w:styleId="FootnoteReference">
<w:name w:val="footnote reference"/>
<w:basedOn w:val="DefaultParagraphFont"/>
<w:rPr>
  <w:vertAlign w:val="superscript"/>
</w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="EndnoteText">
<w:name w:val="endnote text"/>
<w:basedOn w:val="Normal"/>
<w:link w:val="EndnoteTextChar"/>
<w:pPr>
  <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
</w:pPr>
<w:rPr>
  <w:sz w:val="20"/>
  <w:szCs w:val="20"/>
</w:rPr>
</w:style>
<w:style w:type="character" w:styleId="EndnoteTextChar">
<w:name w:val="Endnote Text Char"/>
<w:basedOn w:val="DefaultParagraphFont"/>
<w:link w:val="EndnoteText"/>
<w:rPr>
  <w:sz w:val="20"/>
  <w:szCs w:val="20"/>
</w:rPr>
</w:style>
<w:style w:type="character" w:styleId="EndnoteReference">
<w:name w:val="endnote reference"/>
<w:basedOn w:val="DefaultParagraphFont"/>
<w:rPr>
  <w:vertAlign w:val="superscript"/>
</w:rPr>
</w:style>`;
}

// =============================================================================
// RELATIONSHIP ENTRIES
// =============================================================================

/**
 * Generate relationship entry for footnotes.xml.
 */
export function generateFootnotesRelationship(rId: string): string {
  return `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>`;
}

/**
 * Generate relationship entry for endnotes.xml.
 */
export function generateEndnotesRelationship(rId: string): string {
  return `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/>`;
}

/**
 * Generate content type entries for footnotes and endnotes.
 */
export function generateNoteContentTypes(): string {
  return `<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>`;
}

// =============================================================================
// UTILITIES
// =============================================================================

function generateRunProperties(run: RawFootnoteRun): string {
  const parts: string[] = [];

  if (run.fontFamily) {
    parts.push(
      `<w:rFonts w:ascii="${run.fontFamily}" w:hAnsi="${run.fontFamily}"/>`
    );
  }

  if (run.fontSize) {
    // ECMA-376 declares w:sz/@w:val as xsd:nonNegativeInteger.
    // Word's repair-on-open dialog trips on float values that arise
    // when fontSize was derived through px round-trips.
    const halfPoints = Math.round(run.fontSize * 2);
    parts.push(`<w:sz w:val="${halfPoints}"/>`);
    parts.push(`<w:szCs w:val="${halfPoints}"/>`);
  }

  if (run.bold) {
    parts.push('<w:b/>');
  }

  if (run.italic) {
    parts.push('<w:i/>');
  }

  if (parts.length === 0) return '';
  return `<w:rPr>${parts.join('')}</w:rPr>`;
}

// =============================================================================
// FOOTNOTE COLLECTOR (RAW OOXML VERSION)
// =============================================================================

/**
 * Collector for raw OOXML footnotes.
 * Accumulates footnotes during document processing.
 */
export class RawFootnoteCollector {
  private footnotes: RawFootnote[] = [];
  private endnotes: RawFootnote[] = [];

  /**
   * Add a footnote.
   */
  addFootnote(content: string): number {
    const id = getNextFootnoteId();
    this.footnotes.push({ id, content, type: 'footnote' });
    return id;
  }

  /**
   * Add an endnote.
   */
  addEndnote(content: string): number {
    const id = getNextEndnoteId();
    this.endnotes.push({ id, content, type: 'endnote' });
    return id;
  }

  /**
   * Get all footnotes.
   */
  getFootnotes(): RawFootnote[] {
    return this.footnotes;
  }

  /**
   * Get all endnotes.
   */
  getEndnotes(): RawFootnote[] {
    return this.endnotes;
  }

  /**
   * Check if there are any footnotes.
   */
  hasFootnotes(): boolean {
    return this.footnotes.length > 0;
  }

  /**
   * Check if there are any endnotes.
   */
  hasEndnotes(): boolean {
    return this.endnotes.length > 0;
  }

  /**
   * Generate footnotes.xml content.
   */
  generateFootnotesXml(): string {
    return generateFootnotesXml(this.footnotes);
  }

  /**
   * Generate endnotes.xml content.
   */
  generateEndnotesXml(): string {
    return generateEndnotesXml(this.endnotes);
  }

  /**
   * Clear all collected notes.
   */
  clear(): void {
    this.footnotes = [];
    this.endnotes = [];
    resetNoteCounters();
  }
}
