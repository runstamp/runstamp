/**
 * Integration tests: JSON in → DOCX out
 *
 * Tests the primary renderToDocx() API with DocxDocument input.
 * Verifies that the full pipeline works: schema validation → adapter → serializer → DOCX binary.
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { renderToDocx, validateDocxDocument } from '../src/render';
import type { DocxDocument } from '../src/schema';

// =============================================================================
// HELPERS
// =============================================================================

async function extractDocxContent(buffer: Buffer): Promise<{
  zip: JSZip;
  documentXml: string;
  coreXml: string;
  documentRelsXml: string;
  hasContentTypes: boolean;
  hasRels: boolean;
}> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string') ?? '';
  const coreXml = await zip.file('docProps/core.xml')?.async('string') ?? '';
  const documentRelsXml = await zip.file('word/_rels/document.xml.rels')?.async('string') ?? '';
  return {
    zip,
    documentXml,
    coreXml,
    documentRelsXml,
    hasContentTypes: !!zip.file('[Content_Types].xml'),
    hasRels: !!zip.file('_rels/.rels'),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('renderToDocx', () => {
  it('defaults omitted orientation to portrait', async () => {
    const document = {
      type: 'DocxDocument' as const,
      pageSize: 'a4' as const,
      pages: [{ elements: [{ type: 'paragraph' as const, text: 'Portrait default' }] }],
    };

    const result = await renderToDocx(document);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('renders a minimal document with heading and paragraph', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      orientation: 'portrait',
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Hello World' },
          { type: 'paragraph', text: 'This is a test document generated from JSON.' },
        ],
      }],
    };

    const result = await renderToDocx(doc);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.extension).toBe('.docx');
    expect(result.stats.elementCount).toBeGreaterThan(0);
    expect(result.stats.renderTimeMs).toBeGreaterThan(0);
    expect(result.stats.fileSizeBytes).toBeGreaterThan(0);

    // Verify it's a valid DOCX (ZIP with OOXML structure)
    const content = await extractDocxContent(result.buffer);
    expect(content.hasContentTypes).toBe(true);
    expect(content.hasRels).toBe(true);
    expect(content.documentXml).toContain('Hello World');
  });

  it('renders rich text with formatting', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [{
        elements: [
          {
            type: 'paragraph',
            runs: [
              { text: 'Normal text. ' },
              { text: 'Bold text.', style: { fontWeight: 'bold' } },
              { text: ' Italic text.', style: { fontStyle: 'italic' } },
              { text: ' Colored.', style: { color: 'FF0000' } },
            ],
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    expect(result.buffer.length).toBeGreaterThan(0);

    const content = await extractDocxContent(result.buffer);
    expect(content.documentXml).toContain('Normal text');
    expect(content.documentXml).toContain('Bold text');
  });

  it('renders first-class code blocks, dividers, and page breaks', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'code-block', code: 'const phase0 = true;' },
          { type: 'divider', style: 'double', color: '336699', thickness: 2 },
          { type: 'page-break' },
          { type: 'paragraph', text: 'After the break.' },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    const content = await extractDocxContent(result.buffer);

    expect(content.documentXml).toContain('const phase0 = true;');
    expect(content.documentXml).toContain('After the break.');
    expect(content.documentXml).toContain('w:type="page"');
    expect(content.documentXml).toContain('<w:bottom');
  });

  it('renders a table', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'table',
            rows: [
              { isHeader: true, cells: [{ text: 'Name' }, { text: 'Value' }] },
              { cells: [{ text: 'Alpha' }, { text: '100' }] },
              { cells: [{ text: 'Beta' }, { text: '200' }] },
            ],
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    expect(result.stats.tableCount).toBe(1);

    const content = await extractDocxContent(result.buffer);
    expect(content.documentXml).toContain('Alpha');
    expect(content.documentXml).toContain('200');
  });

  it('renders a list', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'list',
            listType: 'bullet',
            items: [
              { text: 'First item' },
              { text: 'Second item' },
              { text: 'Third item' },
            ],
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    const content = await extractDocxContent(result.buffer);
    expect(content.documentXml).toContain('First item');
  });

  it('renders multiple pages', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [
        {
          elements: [
            { type: 'heading', level: 1, text: 'Page One' },
            { type: 'paragraph', text: 'Content on page one.' },
          ],
        },
        {
          elements: [
            { type: 'heading', level: 1, text: 'Page Two' },
            { type: 'paragraph', text: 'Content on page two.' },
          ],
        },
      ],
    };

    const result = await renderToDocx(doc);
    const content = await extractDocxContent(result.buffer);
    expect(content.documentXml).toContain('Page One');
    expect(content.documentXml).toContain('Page Two');
  });

  it('emits real DOCX sections for page-level section breaks and orientation changes', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            { type: 'heading', level: 1, text: 'Portrait Section' },
            { type: 'paragraph', text: 'This page stays portrait.' },
          ],
          dimensions: { width: 816, height: 1056, orientation: 'portrait' },
        },
        {
          sectionBreak: 'nextPage',
          dimensions: { width: 816, height: 1056, orientation: 'landscape' },
          elements: [
            { type: 'heading', level: 1, text: 'Landscape Section' },
            { type: 'paragraph', text: 'This page should start a new landscape section.' },
          ],
        },
      ],
    };

    const result = await renderToDocx(doc);
    const content = await extractDocxContent(result.buffer);

    expect((content.documentXml.match(/<w:sectPr/g) ?? [])).toHaveLength(2);
    expect(content.documentXml).toContain('<w:type w:val="nextPage"/>');
    expect(content.documentXml).toContain('w:orient="landscape"');
  });

  it('renders with theme and metadata', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      metadata: {
        title: 'Test Report',
        author: 'AI Agent',
      },
      theme: {
        fonts: {
          heading: 'Georgia',
          body: 'Arial',
        },
      },
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Themed Document' },
          { type: 'paragraph', text: 'Uses custom fonts.' },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('rejects invalid input', async () => {
    await expect(
      renderToDocx({ type: 'DocxDocument', pages: [] } as any)
    ).rejects.toThrow();
  });

  it('supports progress callback', async () => {
    const phases: string[] = [];
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{ type: 'paragraph', text: 'Test' }],
      }],
    };

    await renderToDocx(doc, {
      onProgress: (p) => phases.push(p.phase),
    });

    expect(phases).toContain('validating');
    expect(phases).toContain('serializing');
  });

  it('renders the same DOCX bytes for the same rich input', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      metadata: { title: 'Board Packet' },
      tableOfContents: { title: 'Contents', maxLevel: 2 },
      pages: [{
        header: { text: 'Runstamp Internal' },
        footer: { text: 'Page {PAGE} of {NUMPAGES}' },
        elements: [
          { type: 'heading', level: 1, text: 'Board Packet' },
          {
            type: 'paragraph',
            runs: [
              { text: 'Status: ', style: { fontWeight: 'bold' } },
              { text: 'Ready for review' },
              { text: '  ' },
              { text: 'runstamp.com', hyperlink: 'https://runstamp.com' },
            ],
          },
          {
            type: 'list',
            listType: 'bullet',
            items: [{ text: 'Revenue up 18%' }, { text: 'No critical incidents' }],
          },
          {
            type: 'table',
            rows: [
              { isHeader: true, cells: [{ text: 'Metric' }, { text: 'Value' }] },
              { cells: [{ text: 'ARR' }, { text: '$4.8M' }] },
            ],
          },
        ],
      }],
    };

    const first = await renderToDocx(doc);
    const second = await renderToDocx(doc);

    expect(Buffer.compare(first.buffer, second.buffer)).toBe(0);

    const firstContent = await extractDocxContent(first.buffer);
    const secondContent = await extractDocxContent(second.buffer);
    expect(firstContent.coreXml).toBe(secondContent.coreXml);
    expect(firstContent.documentRelsXml).toBe(secondContent.documentRelsXml);
    expect(firstContent.documentXml).toBe(secondContent.documentXml);
  });

  it('normalizes false on-off markup and image drawing metadata', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      theme: {
        fonts: {
          heading: 'Aptos Display',
          body: 'Aptos',
        },
      },
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Quarterly Review' },
          { type: 'paragraph', text: 'plain text' },
          { type: 'paragraph', runs: [{ text: 'struck', style: { textDecoration: 'line-through' } }] },
          {
            type: 'table',
            rows: [
              { isHeader: true, cells: [{ text: 'Name' }] },
              { cells: [{ text: 'Value' }] },
            ],
          },
          {
            type: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XQAAAAASUVORK5CYII=',
            alt: 'dot',
            width: 300,
            height: 225,
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    const content = await extractDocxContent(result.buffer);

    expect(content.documentXml).not.toContain('<w:strike w:val="false"');
    expect(content.documentXml).not.toContain('<w:tblHeader w:val="false"');
    expect(content.documentXml).toContain('<wp:extent cx="3810000" cy="2857500"');
    expect(content.documentXml).toContain('<wp:docPr id="1"');
    expect(content.documentXml).toContain('<pic:cNvPr id="2"');
    expect(content.documentXml).toMatch(/<w:rPr><w:rFonts[^>]*w:ascii="Aptos Display"/);
  });

  it('stabilizes media part filenames for image documents', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XQAAAAASUVORK5CYII=',
            alt: 'pixel',
            width: 120,
            height: 90,
          },
        ],
      }],
    };

    const first = await renderToDocx(doc);
    const second = await renderToDocx(doc);
    const firstContent = await extractDocxContent(first.buffer);
    const secondContent = await extractDocxContent(second.buffer);
    const firstMediaFiles = Object.keys(firstContent.zip.files)
      .filter((file) => file.startsWith('word/media/') && !file.endsWith('/'))
      .sort();
    const secondMediaFiles = Object.keys(secondContent.zip.files)
      .filter((file) => file.startsWith('word/media/') && !file.endsWith('/'))
      .sort();

    expect(Buffer.compare(first.buffer, second.buffer)).toBe(0);
    expect(firstMediaFiles).toEqual(['word/media/image001.png']);
    expect(secondMediaFiles).toEqual(firstMediaFiles);
    expect(firstContent.documentRelsXml).toContain('Target="media/image001.png"');
    expect(secondContent.documentRelsXml).toBe(firstContent.documentRelsXml);
  });
});

describe('validateDocxDocument', () => {
  it('validates a correct document', () => {
    const result = validateDocxDocument({
      type: 'DocxDocument',
      pages: [{
        elements: [{ type: 'paragraph', text: 'Test' }],
      }],
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('catches schema errors', () => {
    const result = validateDocxDocument({
      pages: [], // empty pages array
    });
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('warns on empty headings', () => {
    const result = validateDocxDocument({
      type: 'DocxDocument',
      pages: [{
        elements: [{ type: 'heading', level: 1 }],
      }],
    });
    expect(result.issues.some(i => i.code === 'DOCX_VALIDATE_HEADING_EMPTY')).toBe(true);
  });
});
