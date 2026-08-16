import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractDocxContent } from './test-utils';
import type { DocxDocument } from '../src/schema';

async function loadRenderApi() {
  vi.doMock('../src/pro-guard', async () => {
    const actual = await vi.importActual<typeof import('../src/pro-guard')>('../src/pro-guard');
    return {
      ...actual,
      IS_PRO: true,
      requireDocxPro: vi.fn(),
    };
  });

  return import('../src/render');
}

afterEach(() => {
  vi.doUnmock('../src/pro-guard');
  vi.resetModules();
});

function countOpenTags(content: string, tagPrefix: string): number {
  return content.split(tagPrefix).length - 1;
}

describe('track changes structural manifest hardening', () => {
  it('creates paragraph properties when a property revision lands on a bare paragraph', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{ elements: [{ type: 'paragraph', text: 'Alignment clause.' }] }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{
          type: 'paragraph',
          text: 'Alignment clause.',
          style: { textAlign: 'right' },
          indent: { left: 720 },
        }],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, { author: 'Legal AI' });
    const extracted = await extractDocxContent(result.buffer);

    expect(countOpenTags(extracted.rawDocumentXml, '<w:pPrChange ')).toBe(1);
    expect(extracted.rawDocumentXml).toContain('<w:pPr>');
    expect(extracted.rawDocumentXml).toContain('Alignment clause.');
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'property', text: 'Alignment clause.' }),
      ]),
    );
  });

  it('creates cell properties when a cell revision lands on a bare table cell', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{
          type: 'table',
          rows: [{ cells: [{ text: 'Clause' }, { text: 'Status' }] }],
        }],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{
          type: 'table',
          rows: [{ cells: [{ text: 'Clause' }, { text: 'Status' }, { text: 'Owner' }] }],
        }],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, { author: 'Legal AI' });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.rawDocumentXml).toContain('w:tcPr');
    expect(countOpenTags(extracted.rawDocumentXml, '<w:cellIns ')).toBe(1);
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'cellInsert' }),
      ]),
    );
  });

  it('keeps manifest alignment when only one table is revised among mixed body content', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Intro paragraph.' },
          {
            type: 'table',
            rows: [{ cells: [{ text: 'Static A' }, { text: 'Static B' }] }],
          },
          {
            type: 'paragraph',
            text: 'Target clause.',
            style: { textAlign: 'left' },
          },
          {
            type: 'table',
            tableDescription: 'Legacy revised table',
            rows: [{ cells: [{ text: 'Clause' }, { text: 'Status' }] }],
          },
          { type: 'paragraph', text: 'Outro paragraph.' },
        ],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Intro paragraph.' },
          {
            type: 'table',
            rows: [{ cells: [{ text: 'Static A' }, { text: 'Static B' }] }],
          },
          {
            type: 'paragraph',
            text: 'Target clause.',
            style: { textAlign: 'center' },
          },
          {
            type: 'table',
            tableDescription: 'Updated revised table',
            rows: [{ cells: [{ text: 'Clause' }, { text: 'Status' }, { text: 'Owner' }] }],
          },
          { type: 'paragraph', text: 'Outro paragraph.' },
        ],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, { author: 'Legal AI' });
    const extracted = await extractDocxContent(result.buffer);

    expect(countOpenTags(extracted.rawDocumentXml, '<w:pPrChange ')).toBe(1);
    expect(countOpenTags(extracted.rawDocumentXml, '<w:tblPrChange ')).toBe(1);
    expect(countOpenTags(extracted.rawDocumentXml, '<w:cellIns ')).toBe(1);
    expect(extracted.document.paragraphs.map((paragraph) => paragraph.text)).toEqual(
      expect.arrayContaining(['Intro paragraph.', 'Target clause.', 'Outro paragraph.']),
    );
    expect(extracted.document.revisions.filter((revision) => revision.type === 'property')).toHaveLength(2);
  });

  it('keeps manifest indexing stable with TOC placeholders, page breaks, and two revised tables', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      tableOfContents: {
        title: 'Table of Contents',
        maxLevel: 2,
        showPageNumbers: true,
        hyperlinks: true,
      },
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Master Services Agreement' },
          { type: 'heading', level: 2, text: 'Commercial Terms' },
          {
            type: 'paragraph',
            text: 'Invoices are payable within thirty calendar days.',
            style: { textAlign: 'left' },
          },
          {
            type: 'table',
            tableDescription: 'Commercial terms table',
            rows: [
              { isHeader: true, cells: [{ text: 'Item' }, { text: 'Value' }] },
              { cells: [{ text: 'Notice period' }, { text: '30 days' }] },
            ],
          },
          { type: 'page-break' },
          { type: 'heading', level: 2, text: 'Operational Terms' },
          {
            type: 'paragraph',
            text: 'Service credits apply monthly.',
            keepLines: true,
          },
          {
            type: 'table',
            tableDescription: 'Operational table',
            rows: [
              { isHeader: true, cells: [{ text: 'Team' }, { text: 'Responsibility' }, { text: 'SLA' }] },
              { cells: [{ text: 'Vendor' }, { text: 'Support' }, { text: '24 hours' }] },
            ],
          },
        ],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      tableOfContents: {
        title: 'Table of Contents',
        maxLevel: 2,
        showPageNumbers: true,
        hyperlinks: true,
      },
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Master Services Agreement' },
          { type: 'heading', level: 2, text: 'Commercial Terms' },
          {
            type: 'paragraph',
            text: 'Invoices are payable within thirty calendar days.',
            style: { textAlign: 'right' },
            indent: { left: 720 },
          },
          {
            type: 'table',
            tableDescription: 'Commercial terms table (updated)',
            rows: [
              { isHeader: true, cells: [{ text: 'Item' }, { text: 'Value' }, { text: 'Owner' }] },
              { cells: [{ text: 'Notice period' }, { text: '30 days' }, { text: 'Finance' }] },
            ],
          },
          { type: 'page-break' },
          { type: 'heading', level: 2, text: 'Operational Terms' },
          {
            type: 'paragraph',
            text: 'Service credits apply monthly.',
            keepLines: false,
            pageBreakBefore: true,
          },
          {
            type: 'table',
            tableDescription: 'Operational table (updated)',
            rows: [
              { isHeader: true, cells: [{ text: 'Team' }, { text: 'Responsibility' }] },
              { cells: [{ text: 'Vendor' }, { text: 'Support' }] },
            ],
          },
        ],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'Legal AI',
      includeTOC: true,
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.rawDocumentXml).toContain('TOC \\h \\o &quot;1-2&quot;');
    expect(countOpenTags(extracted.rawDocumentXml, '<w:pPrChange ')).toBe(2);
    expect(countOpenTags(extracted.rawDocumentXml, '<w:tblPrChange ')).toBe(2);
    expect(countOpenTags(extracted.rawDocumentXml, '<w:cellIns ')).toBe(2);
    expect(countOpenTags(extracted.rawDocumentXml, '<w:cellDel ')).toBe(2);
    expect(extracted.document.revisions.filter((revision) => revision.type === 'property')).toHaveLength(4);
    expect(extracted.document.revisions.filter((revision) => revision.type === 'cellInsert')).toHaveLength(2);
    expect(extracted.document.revisions.filter((revision) => revision.type === 'cellDelete')).toHaveLength(2);
  });

  it('supports direct-authored structural revisions mixed with nearby run-level insert and delete revisions', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      revisionInfo: {
        author: 'Legal AI',
        date: '2027-01-15T10:30:00Z',
        rsid: '1A2B3C4D',
      },
      options: {
        trackChanges: true,
      },
      pages: [{
        elements: [
          {
            type: 'paragraph',
            runs: [
              { text: 'The service credit is ' },
              { text: '5%', revision: { type: 'delete' } },
              { text: '10%', revision: { type: 'insert' } },
              { text: '.' },
            ],
          },
          {
            type: 'paragraph',
            text: 'Moved clause source.',
            revision: {
              type: 'moveFrom',
              moveName: 'mixed-structural-move',
            },
          },
          {
            type: 'paragraph',
            text: 'Moved clause destination.',
            revision: {
              type: 'moveTo',
              moveName: 'mixed-structural-move',
            },
          },
          {
            type: 'table',
            tableDescription: 'Updated table',
            revision: {
              type: 'property',
              before: {
                tableDescription: 'Legacy table',
              },
            },
            rows: [
              {
                cells: [
                  { text: 'Clause' },
                  { text: 'Owner', revision: { type: 'insert' } },
                ],
              },
            ],
          },
        ],
      }],
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.rawDocumentXml).toContain('w:ins');
    expect(extracted.rawDocumentXml).toContain('w:moveFrom');
    expect(extracted.rawDocumentXml).toContain('w:moveTo');
    expect(extracted.rawDocumentXml).toContain('w:tblPrChange');
    expect(extracted.rawDocumentXml).toContain('w:cellIns');
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'insert', text: '10%' }),
        expect.objectContaining({ type: 'delete', text: '5%' }),
        expect.objectContaining({ type: 'moveFrom', text: 'Moved clause source.' }),
        expect.objectContaining({ type: 'moveTo', text: 'Moved clause destination.' }),
        expect.objectContaining({ type: 'cellInsert' }),
      ]),
    );
  });
});
