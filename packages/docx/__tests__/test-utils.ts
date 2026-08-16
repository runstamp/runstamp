/**
 * DOCX Test Utilities
 * ====================
 * Real test utilities that parse DOCX XML content for meaningful assertions.
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// XML Parser with attribute support
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
});

/**
 * Extracted DOCX content for assertions
 */
export interface ExtractedDocx {
  /** Main document content */
  document: ParsedDocumentXml;
  /** Settings XML */
  settings: string;
  /** Styles XML */
  styles: string;
  /** Numbering definitions */
  numbering: string;
  /** Header content (if present) */
  headers: Map<number, string>;
  /** Footer content (if present) */
  footers: Map<number, string>;
  /** Footnotes (if present) */
  footnotes: string;
  /** Comments (if present) */
  comments: string;
  /** Content types */
  contentTypes: string;
  /** Raw document XML */
  rawDocumentXml: string;
}

/**
 * Parsed document structure
 */
export interface ParsedDocumentXml {
  paragraphs: ParagraphInfo[];
  tables: TableInfo[];
  headings: HeadingInfo[];
  lists: ListInfo[];
  images: ImageInfo[];
  bookmarks: BookmarkInfo[];
  footnoteRefs: FootnoteRefInfo[];
  commentRefs: CommentRefInfo[];
  revisions: RevisionEntryInfo[];
}

export interface ParagraphInfo {
  text: string;
  styleId?: string;
  alignment?: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
}

export interface TableInfo {
  rows: number;
  cols: number;
  cells: string[][];
  hasHeaderRow: boolean;
}

export interface HeadingInfo {
  level: number;
  text: string;
  styleId: string;
}

export interface ListInfo {
  items: string[];
  numId: string;
  isOrdered: boolean;
}

export interface ImageInfo {
  relationshipId: string;
  width: number;
  height: number;
}

export interface BookmarkInfo {
  id: string;
  name: string;
}

export interface FootnoteRefInfo {
  id: string;
}

export interface CommentRefInfo {
  id: string;
}

export interface RevisionEntryInfo {
  type: 'insert' | 'delete' | 'format' | 'property' | 'cellInsert' | 'cellDelete' | 'moveFrom' | 'moveTo';
  id?: string;
  author?: string;
  date?: string;
  text: string;
}

/**
 * Extract DOCX content from buffer
 */
export async function extractDocxContent(buffer: Buffer): Promise<ExtractedDocx> {
  const zip = await JSZip.loadAsync(buffer);

  // Extract main document
  const documentFile = zip.file('word/document.xml');
  const rawDocumentXml = documentFile ? await documentFile.async('string') : '';
  const document = parseDocumentXml(rawDocumentXml);

  // Extract settings
  const settingsFile = zip.file('word/settings.xml');
  const settings = settingsFile ? await settingsFile.async('string') : '';

  // Extract styles
  const stylesFile = zip.file('word/styles.xml');
  const styles = stylesFile ? await stylesFile.async('string') : '';

  // Extract numbering
  const numberingFile = zip.file('word/numbering.xml');
  const numbering = numberingFile ? await numberingFile.async('string') : '';

  // Extract content types
  const contentTypesFile = zip.file('[Content_Types].xml');
  const contentTypes = contentTypesFile ? await contentTypesFile.async('string') : '';

  // Extract headers
  const headers = new Map<number, string>();
  const headerFiles = Object.keys(zip.files).filter((name) =>
    name.match(/^word\/header\d+\.xml$/)
  );
  for (const headerPath of headerFiles) {
    const match = headerPath.match(/header(\d+)\.xml$/);
    if (match) {
      const headerIndex = parseInt(match[1], 10);
      const headerFile = zip.file(headerPath);
      if (headerFile) {
        headers.set(headerIndex, await headerFile.async('string'));
      }
    }
  }

  // Extract footers
  const footers = new Map<number, string>();
  const footerFiles = Object.keys(zip.files).filter((name) =>
    name.match(/^word\/footer\d+\.xml$/)
  );
  for (const footerPath of footerFiles) {
    const match = footerPath.match(/footer(\d+)\.xml$/);
    if (match) {
      const footerIndex = parseInt(match[1], 10);
      const footerFile = zip.file(footerPath);
      if (footerFile) {
        footers.set(footerIndex, await footerFile.async('string'));
      }
    }
  }

  // Extract footnotes
  const footnotesFile = zip.file('word/footnotes.xml');
  const footnotes = footnotesFile ? await footnotesFile.async('string') : '';

  // Extract comments
  const commentsFile = zip.file('word/comments.xml');
  const comments = commentsFile ? await commentsFile.async('string') : '';

  return {
    document,
    settings,
    styles,
    numbering,
    headers,
    footers,
    footnotes,
    comments,
    contentTypes,
    rawDocumentXml,
  };
}

/**
 * Parse document XML into structured data
 */
function parseDocumentXml(xmlContent: string): ParsedDocumentXml {
  const paragraphs: ParagraphInfo[] = [];
  const tables: TableInfo[] = [];
  const headings: HeadingInfo[] = [];
  const lists: ListInfo[] = [];
  const images: ImageInfo[] = [];
  const bookmarks: BookmarkInfo[] = [];
  const footnoteRefs: FootnoteRefInfo[] = [];
  const commentRefs: CommentRefInfo[] = [];
  const revisions: RevisionEntryInfo[] = [];

  if (!xmlContent) {
    return { paragraphs, tables, headings, lists, images, bookmarks, footnoteRefs, commentRefs, revisions };
  }

  try {
    const parsed = xmlParser.parse(xmlContent);

    // Navigate to document body
    const body = parsed?.['w:document']?.['w:body'];
    if (!body) {
      return { paragraphs, tables, headings, lists, images, bookmarks, footnoteRefs, commentRefs, revisions };
    }

    // Process body children
    const processElement = (element: any, elementName: string) => {
      if (elementName === 'w:p') {
        const pInfo = extractParagraphInfo(element);
        if (pInfo) {
          paragraphs.push(pInfo);

          // Check if it's a heading
          const styleId = pInfo.styleId || '';
          if (styleId.match(/^Heading\d+$/i)) {
            const level = parseInt(styleId.replace(/\D/g, ''), 10);
            headings.push({ level, text: pInfo.text, styleId });
          }

          // Check for list items
          const numPr = element?.['w:pPr']?.['w:numPr'];
          if (numPr) {
            const numId = numPr?.['w:numId']?.['@_w:val'];
            if (numId) {
              // Find or create list
              let existingList = lists.find((l) => l.numId === numId);
              if (!existingList) {
                existingList = { items: [], numId, isOrdered: true }; // Default to ordered
                lists.push(existingList);
              }
              existingList.items.push(pInfo.text);
            }
          }

          // Check for bookmark starts
          const bookmarkStart = element?.['w:bookmarkStart'];
          if (bookmarkStart) {
            const bmElements = Array.isArray(bookmarkStart) ? bookmarkStart : [bookmarkStart];
            for (const bm of bmElements) {
              bookmarks.push({
                id: bm['@_w:id'] || '',
                name: bm['@_w:name'] || '',
              });
            }
          }

          // Check for footnote references
          const runs = Array.isArray(element?.['w:r']) ? element['w:r'] : element?.['w:r'] ? [element['w:r']] : [];
          for (const run of runs) {
            if (run?.['w:footnoteReference']) {
              footnoteRefs.push({
                id: run['w:footnoteReference']?.['@_w:id'] || '',
              });
            }
            if (run?.['w:commentReference']) {
              commentRefs.push({
                id: run['w:commentReference']?.['@_w:id'] || '',
              });
            }
          }

          collectRevisionsFromNode(element, revisions);
        }
      } else if (elementName === 'w:tbl') {
        const tableInfo = extractTableInfo(element);
        if (tableInfo) {
          tables.push(tableInfo);
        }
        collectRevisionsFromNode(element, revisions);
      }
    };

    // Process all body elements
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          processElement(item, key);
        }
      } else if (value && typeof value === 'object') {
        processElement(value, key);
      }
    }

  } catch (error) {
    console.warn('Failed to parse document XML:', error);
  }

  return { paragraphs, tables, headings, lists, images, bookmarks, footnoteRefs, commentRefs, revisions };
}

function extractTextValue(node: any): string {
  if (typeof node === 'string') {
    return node;
  }
  if (node?.['#text']) {
    return node['#text'];
  }
  return '';
}

function extractRunText(runsInput: any, textKey: 'w:t' | 'w:delText'): string {
  const runs = Array.isArray(runsInput) ? runsInput : runsInput ? [runsInput] : [];
  return runs.map((run) => extractTextValue(run?.[textKey])).join('');
}

function extractMoveText(moveInput: any): string {
  const wrappers = Array.isArray(moveInput) ? moveInput : moveInput ? [moveInput] : [];
  return wrappers.map((wrapper) => extractRunText(wrapper?.['w:r'], 'w:t')).join('');
}

function collectRevisionsFromNode(node: any, revisions: RevisionEntryInfo[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const insertions = Array.isArray(node['w:ins']) ? node['w:ins'] : node['w:ins'] ? [node['w:ins']] : [];
  for (const insertion of insertions) {
    revisions.push({
      type: 'insert',
      id: insertion?.['@_w:id'],
      author: insertion?.['@_w:author'],
      date: insertion?.['@_w:date'],
      text: extractRunText(insertion?.['w:r'], 'w:t'),
    });
  }

  const deletions = Array.isArray(node['w:del']) ? node['w:del'] : node['w:del'] ? [node['w:del']] : [];
  for (const deletion of deletions) {
    revisions.push({
      type: 'delete',
      id: deletion?.['@_w:id'],
      author: deletion?.['@_w:author'],
      date: deletion?.['@_w:date'],
      text: extractRunText(deletion?.['w:r'], 'w:delText'),
    });
  }

  const runs = Array.isArray(node['w:r']) ? node['w:r'] : node['w:r'] ? [node['w:r']] : [];
  for (const run of runs) {
    const change = run?.['w:rPr']?.['w:rPrChange'];
    if (change) {
      revisions.push({
        type: 'format',
        id: change?.['@_w:id'],
        author: change?.['@_w:author'],
        date: change?.['@_w:date'],
        text: extractRunText(run, 'w:t'),
      });
    }
  }

  const paragraphPropertyChanges = Array.isArray(node?.['w:pPr']?.['w:pPrChange'])
    ? node['w:pPr']['w:pPrChange']
    : node?.['w:pPr']?.['w:pPrChange']
      ? [node['w:pPr']['w:pPrChange']]
      : [];
  for (const change of paragraphPropertyChanges) {
    revisions.push({
      type: 'property',
      id: change?.['@_w:id'],
      author: change?.['@_w:author'],
      date: change?.['@_w:date'],
      text: extractParagraphInfo(node)?.text ?? '',
    });
  }

  const tablePropertyChanges = Array.isArray(node?.['w:tblPr']?.['w:tblPrChange'])
    ? node['w:tblPr']['w:tblPrChange']
    : node?.['w:tblPr']?.['w:tblPrChange']
      ? [node['w:tblPr']['w:tblPrChange']]
      : [];
  for (const change of tablePropertyChanges) {
    revisions.push({
      type: 'property',
      id: change?.['@_w:id'],
      author: change?.['@_w:author'],
      date: change?.['@_w:date'],
      text: '',
    });
  }

  const cellInsertions = Array.isArray(node?.['w:tcPr']?.['w:cellIns'])
    ? node['w:tcPr']['w:cellIns']
    : node?.['w:tcPr']?.['w:cellIns']
      ? [node['w:tcPr']['w:cellIns']]
      : [];
  for (const insertion of cellInsertions) {
    revisions.push({
      type: 'cellInsert',
      id: insertion?.['@_w:id'],
      author: insertion?.['@_w:author'],
      date: insertion?.['@_w:date'],
      text: '',
    });
  }

  const cellDeletions = Array.isArray(node?.['w:tcPr']?.['w:cellDel'])
    ? node['w:tcPr']['w:cellDel']
    : node?.['w:tcPr']?.['w:cellDel']
      ? [node['w:tcPr']['w:cellDel']]
      : [];
  for (const deletion of cellDeletions) {
    revisions.push({
      type: 'cellDelete',
      id: deletion?.['@_w:id'],
      author: deletion?.['@_w:author'],
      date: deletion?.['@_w:date'],
      text: '',
    });
  }

  const moveFromWrappers = Array.isArray(node['w:moveFrom']) ? node['w:moveFrom'] : node['w:moveFrom'] ? [node['w:moveFrom']] : [];
  for (const moveFrom of moveFromWrappers) {
    revisions.push({
      type: 'moveFrom',
      id: moveFrom?.['@_w:id'],
      author: moveFrom?.['@_w:author'],
      date: moveFrom?.['@_w:date'],
      text: extractMoveText(moveFrom),
    });
  }

  const moveToWrappers = Array.isArray(node['w:moveTo']) ? node['w:moveTo'] : node['w:moveTo'] ? [node['w:moveTo']] : [];
  for (const moveTo of moveToWrappers) {
    revisions.push({
      type: 'moveTo',
      id: moveTo?.['@_w:id'],
      author: moveTo?.['@_w:author'],
      date: moveTo?.['@_w:date'],
      text: extractMoveText(moveTo),
    });
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectRevisionsFromNode(item, revisions);
      }
      continue;
    }

    if (value && typeof value === 'object') {
      collectRevisionsFromNode(value, revisions);
    }
  }
}

/**
 * Extract paragraph information
 */
function extractParagraphInfo(p: any): ParagraphInfo | null {
  try {
    const pPr = p['w:pPr'];
    const styleId = pPr?.['w:pStyle']?.['@_w:val'];
    const alignment = pPr?.['w:jc']?.['@_w:val'];

    // Extract text from runs
    let text = '';
    let isBold = false;
    let isItalic = false;
    let fontSize: number | undefined;

    const runs = Array.isArray(p['w:r']) ? p['w:r'] : p['w:r'] ? [p['w:r']] : [];
    const insertions = Array.isArray(p['w:ins']) ? p['w:ins'] : p['w:ins'] ? [p['w:ins']] : [];
    const deletions = Array.isArray(p['w:del']) ? p['w:del'] : p['w:del'] ? [p['w:del']] : [];

    for (const run of runs) {
      text += extractTextValue(run['w:t']);

      const rPr = run['w:rPr'];
      if (rPr) {
        if (rPr['w:b']) isBold = true;
        if (rPr['w:i']) isItalic = true;
        if (rPr['w:sz']?.['@_w:val']) {
          fontSize = parseInt(rPr['w:sz']['@_w:val'], 10) / 2; // Half-points to points
        }
      }
    }

    for (const insertion of insertions) {
      text += extractRunText(insertion['w:r'], 'w:t');
    }

    for (const deletion of deletions) {
      text += extractRunText(deletion['w:r'], 'w:delText');
    }

    const moveFroms = Array.isArray(p['w:moveFrom']) ? p['w:moveFrom'] : p['w:moveFrom'] ? [p['w:moveFrom']] : [];
    for (const moveFrom of moveFroms) {
      text += extractMoveText(moveFrom);
    }

    const moveTos = Array.isArray(p['w:moveTo']) ? p['w:moveTo'] : p['w:moveTo'] ? [p['w:moveTo']] : [];
    for (const moveTo of moveTos) {
      text += extractMoveText(moveTo);
    }

    return {
      text: text.trim(),
      styleId,
      alignment,
      isBold,
      isItalic,
      fontSize,
    };
  } catch {
    return null;
  }
}

/**
 * Extract table information
 */
function extractTableInfo(tbl: any): TableInfo | null {
  try {
    const rows = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : tbl['w:tr'] ? [tbl['w:tr']] : [];
    const cells: string[][] = [];
    let maxCols = 0;
    let hasHeaderRow = false;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const tcElements = Array.isArray(row['w:tc']) ? row['w:tc'] : row['w:tc'] ? [row['w:tc']] : [];
      const rowCells: string[] = [];

      // Check for header row
      const trPr = row['w:trPr'];
      if (trPr?.['w:tblHeader'] && rowIdx === 0) {
        hasHeaderRow = true;
      }

      for (const tc of tcElements) {
        let cellText = '';
        const paragraphs = Array.isArray(tc['w:p']) ? tc['w:p'] : tc['w:p'] ? [tc['w:p']] : [];

        for (const p of paragraphs) {
          const pInfo = extractParagraphInfo(p);
          if (pInfo) {
            cellText += pInfo.text + ' ';
          }
        }

        rowCells.push(cellText.trim());
      }

      cells.push(rowCells);
      maxCols = Math.max(maxCols, rowCells.length);
    }

    return {
      rows: rows.length,
      cols: maxCols,
      cells,
      hasHeaderRow,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert heading exists with specific properties
 */
export function assertHeading(
  doc: ParsedDocumentXml,
  expectations: {
    level: number;
    textContains?: string;
    textEquals?: string;
  }
): void {
  const heading = doc.headings.find((h) => {
    if (h.level !== expectations.level) return false;
    if (expectations.textEquals && h.text !== expectations.textEquals) return false;
    if (expectations.textContains && !h.text.includes(expectations.textContains)) return false;
    return true;
  });

  if (!heading) {
    const existingHeadings = doc.headings.map((h) => `H${h.level}: ${h.text}`).join(', ');
    throw new Error(
      `Heading level ${expectations.level} with "${expectations.textContains || expectations.textEquals}" not found. Found: [${existingHeadings}]`
    );
  }
}

/**
 * Assert table exists with specific structure
 */
export function assertTable(
  doc: ParsedDocumentXml,
  expectations: {
    rows: number;
    cols: number;
    cellContents?: string[][];
    hasHeaderRow?: boolean;
  }
): void {
  const table = doc.tables.find((t) => t.rows === expectations.rows && t.cols === expectations.cols);

  if (!table) {
    const existingTables = doc.tables.map((t) => `${t.rows}x${t.cols}`).join(', ');
    throw new Error(
      `Table with ${expectations.rows}x${expectations.cols} not found. Found: [${existingTables}]`
    );
  }

  if (expectations.hasHeaderRow !== undefined && table.hasHeaderRow !== expectations.hasHeaderRow) {
    throw new Error(
      `Expected table header row: ${expectations.hasHeaderRow}, got: ${table.hasHeaderRow}`
    );
  }

  if (expectations.cellContents) {
    for (let r = 0; r < expectations.cellContents.length; r++) {
      for (let c = 0; c < expectations.cellContents[r].length; c++) {
        const expected = expectations.cellContents[r][c];
        const actual = table.cells[r]?.[c] || '';
        if (!actual.includes(expected)) {
          throw new Error(
            `Cell [${r}][${c}] expected to contain "${expected}", got "${actual}"`
          );
        }
      }
    }
  }
}

/**
 * Assert list exists with specific items
 */
export function assertList(
  doc: ParsedDocumentXml,
  expectations: {
    itemCount?: number;
    itemsContain?: string[];
  }
): void {
  if (doc.lists.length === 0) {
    throw new Error('No lists found in document');
  }

  // Flatten all list items
  const allItems = doc.lists.flatMap((l) => l.items);

  if (expectations.itemCount !== undefined && allItems.length !== expectations.itemCount) {
    throw new Error(
      `Expected ${expectations.itemCount} list items, found ${allItems.length}`
    );
  }

  if (expectations.itemsContain) {
    for (const expected of expectations.itemsContain) {
      const found = allItems.some((item) => item.includes(expected));
      if (!found) {
        throw new Error(
          `List item containing "${expected}" not found. Found: [${allItems.join(', ')}]`
        );
      }
    }
  }
}

/**
 * Assert native Word numbering is used
 */
export async function assertNativeNumbering(docxBuffer: Buffer): Promise<void> {
  const { numbering } = await extractDocxContent(docxBuffer);

  if (!numbering) {
    throw new Error('No numbering.xml found - not using native Word numbering');
  }

  // Check for abstract numbering definitions
  if (!numbering.includes('w:abstractNum')) {
    throw new Error('No abstract numbering definitions found');
  }

  // Check for numbering instances
  if (!numbering.includes('w:num')) {
    throw new Error('No numbering instances found');
  }
}

/**
 * Assert footnotes exist
 */
export async function assertFootnotes(
  docxBuffer: Buffer,
  expectedCount?: number
): Promise<void> {
  const { footnotes, document } = await extractDocxContent(docxBuffer);

  if (!footnotes) {
    throw new Error('No footnotes.xml found');
  }

  if (document.footnoteRefs.length === 0) {
    throw new Error('No footnote references found in document body');
  }

  if (expectedCount !== undefined && document.footnoteRefs.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} footnote references, found ${document.footnoteRefs.length}`
    );
  }
}

/**
 * Assert comments exist
 */
export async function assertComments(
  docxBuffer: Buffer,
  expectedCount?: number
): Promise<void> {
  const { comments, document } = await extractDocxContent(docxBuffer);

  if (!comments) {
    throw new Error('No comments.xml found');
  }

  if (document.commentRefs.length === 0) {
    throw new Error('No comment references found in document body');
  }

  if (expectedCount !== undefined && document.commentRefs.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} comment references, found ${document.commentRefs.length}`
    );
  }
}

/**
 * Assert bookmarks exist
 */
export function assertBookmarks(
  doc: ParsedDocumentXml,
  expectedNames: string[]
): void {
  for (const name of expectedNames) {
    const found = doc.bookmarks.some((b) => b.name === name);
    if (!found) {
      const existingNames = doc.bookmarks.map((b) => b.name).join(', ');
      throw new Error(
        `Bookmark "${name}" not found. Found: [${existingNames}]`
      );
    }
  }
}

/**
 * Assert headers and footers exist
 */
export async function assertHeadersAndFooters(
  docxBuffer: Buffer
): Promise<void> {
  const { headers, footers } = await extractDocxContent(docxBuffer);

  if (headers.size === 0) {
    throw new Error('No headers found');
  }

  if (footers.size === 0) {
    throw new Error('No footers found');
  }
}

/**
 * Assert page numbers are present
 */
export async function assertPageNumbers(docxBuffer: Buffer): Promise<void> {
  const { headers, footers, rawDocumentXml } = await extractDocxContent(docxBuffer);

  // Check in headers
  for (const [, headerXml] of headers) {
    if (headerXml.includes('w:fldSimple') || headerXml.includes('PAGE')) {
      return; // Found page number field
    }
  }

  // Check in footers
  for (const [, footerXml] of footers) {
    if (footerXml.includes('w:fldSimple') || footerXml.includes('PAGE')) {
      return; // Found page number field
    }
  }

  // Check in main document
  if (rawDocumentXml.includes('w:fldSimple') || rawDocumentXml.includes('PAGE')) {
    return;
  }

  throw new Error('No page number fields found in headers, footers, or document');
}

/**
 * Assert OOXML compliance
 */
export async function assertOoxmlCompliance(docxBuffer: Buffer): Promise<void> {
  const zip = await JSZip.loadAsync(docxBuffer);
  const files = Object.keys(zip.files);

  // Required files
  const required = [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
  ];

  for (const file of required) {
    if (!files.includes(file)) {
      throw new Error(`Required OOXML file missing: ${file}`);
    }
  }

  // Content types has correct MIME types
  const contentTypes = await zip.file('[Content_Types].xml')?.async('string');
  if (!contentTypes?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml')) {
    throw new Error('Invalid content types');
  }
}

/**
 * Count paragraphs with specific style
 */
export function countParagraphsWithStyle(
  doc: ParsedDocumentXml,
  styleId: string
): number {
  return doc.paragraphs.filter((p) => p.styleId === styleId).length;
}
