import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { DOCXErrorCode } from '../src/errors';
import { validateDocxBuffer } from '../src/core/ooxml-output-validator';
import { renderToDocx } from '../src/render';
import type { DocxDocument } from '../src/schema';

async function extractDocumentXml(document: DocxDocument): Promise<string> {
  const result = await renderToDocx(document);
  const validation = await validateDocxBuffer(result.buffer);
  expect(validation.ok).toBe(true);

  const zip = await JSZip.loadAsync(result.buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('word/document.xml not found');
  }
  return documentXml;
}

function xmlAttributeValues(xml: string, tag: string, attribute: string): number[] {
  return [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*${attribute}="(\\d+)"`, 'g'))]
    .map((match) => Number(match[1]));
}

function pngWithDimensions(width: number, height: number): string {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return `data:image/png;base64,${header.toString('base64')}`;
}

describe('GA edge matrix Batch C (DOCX)', () => {
  it('cell 1: preserves long flowing paragraph and cell text without fixed-height clipping', async () => {
    const paragraphText = `paragraph-start ${'flowing text '.repeat(2_000)}paragraph-end`;
    const cellText = `cell-start ${'growing cell '.repeat(1_000)}cell-end`;
    const document: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: paragraphText },
          {
            type: 'table',
            rows: [{ cells: [{ text: cellText }] }],
          },
        ],
      }],
    };

    const documentXml = await extractDocumentXml(document);

    expect(documentXml).toContain(paragraphText);
    expect(documentXml).toContain(cellText);
    expect(documentXml).not.toMatch(/<w:trHeight\b[^>]*w:hRule="exact"/);
    expect(documentXml).toMatch(/<w:trHeight\b[^>]*w:hRule="atLeast"/);
    expect(documentXml).not.toContain('<w:framePr');
    expect(documentXml).not.toContain('<w:txbxContent');
    expect(documentXml).not.toContain('<v:textbox');
  });

  it('cell 2: preserves 300+ character tokens and URLs within printable table width', async () => {
    const token = 'T'.repeat(500);
    const url = `https://example.com/${'unbreakable'.repeat(32)}`;
    const document: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: url },
          {
            type: 'table',
            rows: [{ cells: [{ text: token }, { text: 'bounded' }] }],
          },
        ],
      }],
    };

    const documentXml = await extractDocumentXml(document);
    const pageWidth = xmlAttributeValues(documentXml, 'w:pgSz', 'w:w')[0];
    const leftMargin = xmlAttributeValues(documentXml, 'w:pgMar', 'w:left')[0];
    const rightMargin = xmlAttributeValues(documentXml, 'w:pgMar', 'w:right')[0];
    if (pageWidth === undefined || leftMargin === undefined || rightMargin === undefined) {
      throw new Error('Section page geometry not found');
    }
    const printableWidth = pageWidth - leftMargin - rightMargin;
    const tableWidths = xmlAttributeValues(documentXml, 'w:tblW', 'w:w');
    const gridWidths = xmlAttributeValues(documentXml, 'w:gridCol', 'w:w');
    const cellWidths = xmlAttributeValues(documentXml, 'w:tcW', 'w:w');

    expect(documentXml).toContain(token);
    expect(documentXml).toContain(url);
    expect(tableWidths).not.toHaveLength(0);
    expect(tableWidths.every((width) => width <= printableWidth)).toBe(true);
    expect(gridWidths.reduce((sum, width) => sum + width, 0)).toBeLessThanOrEqual(printableWidth);
    expect(cellWidths.every((width) => width <= printableWidth)).toBe(true);
  });

  it.each([
    ['width', 25_001, 1],
    ['height', 1, 25_001],
  ])('cell 8-dimension: rejects an image whose pixel %s exceeds 25,000', async (_side, width, height) => {
    const document: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{
          type: 'image',
          src: pngWithDimensions(width, height),
          width: 32,
          height: 32,
          alt: 'oversized pixel dimensions',
        }],
      }],
    };

    await expect(renderToDocx(document)).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      context: {
        limit: 'maxImageDimensionPixels',
        actual: 25_001,
        max: 25_000,
      },
    });
  });
});
