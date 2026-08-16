/**
 * OOXML Injector for DOCX Template Hydration
 *
 * Generates OOXML fragments from structured data values for injection
 * into DOCX templates. Handles:
 * - Plain text (string values)
 * - Tables (array of objects → <w:tbl>)
 * - Images (base64/URL → drawing elements)
 * - Paragraphs with formatting
 */

import { pointsToHalfPoints } from '../utils/units';
import { escapeXml } from '../utils/xml.js';
import { RelationshipManager as CoreRelationshipManager } from '../ooxml/relationships.js';
import { REL_TYPES } from '../ooxml/namespaces.js';

/** Data value types for template hydration */
export type HydrationValue =
  | string
  | number
  | boolean
  | HydrationTable
  | HydrationImage
  | HydrationRichText;

/** Table data for injection */
export interface HydrationTable {
  type: 'table';
  headers: string[];
  rows: string[][];
  style?: 'plain' | 'striped' | 'bordered';
}

/** Image data for injection */
export interface HydrationImage {
  type: 'image';
  /** Base64 data URI or external URL */
  src: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Alt text */
  alt?: string;
}

/** Rich text with formatting */
export interface HydrationRichText {
  type: 'richtext';
  paragraphs: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    color?: string;
    alignment?: 'left' | 'center' | 'right';
  }>;
}

/**
 * Check if a hydration value needs complex (paragraph-level) replacement
 * vs simple text replacement.
 */
export function isComplexValue(value: HydrationValue): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return 'type' in value && (value.type === 'table' || value.type === 'image' || value.type === 'richtext');
}

/**
 * Convert a hydration value to an OOXML XML string.
 *
 * For simple values (string, number, boolean), returns escaped text.
 * For complex values, returns full OOXML fragment.
 */
export function valueToOoxml(
  value: HydrationValue,
  relationshipManager?: RelationshipManager
): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return escapeXml(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return escapeXml(String(value));
  }

  switch (value.type) {
    case 'table':
      return tableToOoxml(value);
    case 'image':
      return imageToOoxml(value, relationshipManager);
    case 'richtext':
      return richTextToOoxml(value);
    default:
      return escapeXml(String(value));
  }
}

/**
 * Generate OOXML for a table.
 */
function tableToOoxml(table: HydrationTable): string {
  const colCount = table.headers.length;
  const colWidth = Math.floor(9360 / colCount); // Distribute across 6.5"

  // Table borders
  const borderXml = `<w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
  </w:tblBorders>`;

  // Grid columns
  const gridCols = table.headers.map(() => `<w:gridCol w:w="${colWidth}"/>`).join('');

  // Header row
  const headerCells = table.headers.map(h => `
    <w:tc>
      <w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(h)}</w:t></w:r>
      </w:p>
    </w:tc>`).join('');

  const headerRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${headerCells}</w:tr>`;

  // Body rows
  const bodyRows = table.rows.map((row, rowIdx) => {
    const cells = row.map((cell, _colIdx) => {
      const shading = table.style === 'striped' && rowIdx % 2 === 1
        ? `<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>`
        : '';
      return `
        <w:tc>
          <w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/>${shading}</w:tcPr>
          <w:p><w:r><w:t>${escapeXml(cell)}</w:t></w:r></w:p>
        </w:tc>`;
    }).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');

  return `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="0" w:type="auto"/>
      ${borderXml}
      <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>
    <w:tblGrid>${gridCols}</w:tblGrid>
    ${headerRow}
    ${bodyRows}
  </w:tbl>`;
}

/**
 * Generate OOXML for an image.
 *
 * Note: For full image support, relationships need to be managed.
 * This generates an inline drawing element with a placeholder relationship ID.
 */
function imageToOoxml(
  image: HydrationImage,
  relationshipManager?: RelationshipManager
): string {
  // EMU is xsd:long. Round at the boundary so caller-supplied floats
  // (e.g. CSS px parsed as 300.5) don't reach Word's repair-on-open path.
  const widthEmu = Math.round((image.width || 300) * 9525);
  const heightEmu = Math.round((image.height || 200) * 9525);
  const alt = escapeXml(image.alt || 'Image');

  // If we have a relationship manager, register the image
  const rId = relationshipManager
    ? relationshipManager.addImage(image.src)
    : 'rId_placeholder';

  return `<w:p>
    <w:r>
      <w:drawing>
        <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
          <wp:docPr id="1" name="${alt}"/>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="${alt}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}

/**
 * Generate OOXML for rich text paragraphs.
 */
function richTextToOoxml(richText: HydrationRichText): string {
  return richText.paragraphs.map(p => {
    const rPr: string[] = [];
    if (p.bold) rPr.push('<w:b/>');
    if (p.italic) rPr.push('<w:i/>');
    if (p.fontSize) rPr.push(`<w:sz w:val="${pointsToHalfPoints(p.fontSize)}"/>`);
    if (p.color) {
      const hex = p.color.replace('#', '');
      rPr.push(`<w:color w:val="${hex}"/>`);
    }
    const rPrXml = rPr.length > 0 ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';

    const pPr: string[] = [];
    if (p.alignment) {
      const jcVal = p.alignment === 'center' ? 'center' : p.alignment === 'right' ? 'right' : 'left';
      pPr.push(`<w:jc w:val="${jcVal}"/>`);
    }
    const pPrXml = pPr.length > 0 ? `<w:pPr>${pPr.join('')}</w:pPr>` : '';

    return `<w:p>${pPrXml}<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r></w:p>`;
  }).join('');
}

// Re-export for consumers that import escapeXml from this module
export { escapeXml } from '../utils/xml.js';

/**
 * Relationship manager for tracking image/hyperlink relationships
 * added during template hydration.
 *
 * Hydration operates on foreign DOCX templates, so rId allocation has
 * to start from a safe offset to avoid colliding with relationships
 * already declared in the template's `.rels`. This thin interface
 * auto-allocates rIds and delegates storage to the same
 * `RelationshipManager` class the native serializer uses.
 */
export interface RelationshipManager {
  addImage(src: string): string;
  getRelationships(): Array<{ id: string; type: string; target: string }>;
}

/**
 * Create a hydration-scoped relationship manager.
 *
 * @param startId rId numeric offset — callers pass a value chosen to sit
 *   comfortably above any rId already present in the template being
 *   hydrated (the hydrator uses `100 + imageCounter`).
 */
export function createRelationshipManager(startId: number = 100): RelationshipManager {
  const inner = new CoreRelationshipManager();
  let nextId = startId;

  return {
    addImage(src: string): string {
      const id = `rId${nextId++}`;
      inner.add(id, REL_TYPES.image, src);
      return id;
    },
    getRelationships() {
      return inner.all().map((record) => ({
        id: record.id,
        type: record.type,
        target: record.target,
      }));
    },
  };
}
