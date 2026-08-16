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

function createTrackedDoc(elements: DocxDocument['pages'][number]['elements']): DocxDocument {
  return {
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
    pages: [
      {
        elements,
      },
    ],
  };
}

describe('track changes', () => {
  it('renders direct-authored insertions and deletions with settings and rsids', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx(createTrackedDoc([
      {
        type: 'paragraph',
        runs: [
          { text: 'The term is ' },
          {
            text: '30',
            revision: { type: 'delete' },
          },
          {
            text: '60',
            revision: { type: 'insert' },
          },
          { text: ' days.' },
        ],
      },
    ]));

    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.settings).toContain('w:trackRevisions');
    expect(extracted.settings).toContain('w:rsidRoot');
    expect(extracted.settings).toContain('1A2B3C4D');
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'delete', author: 'Legal AI', text: '30' }),
        expect.objectContaining({ type: 'insert', author: 'Legal AI', text: '60' }),
      ])
    );
    expect(extracted.rawDocumentXml).toContain('w:rsidR="1A2B3C4D"');
    expect(extracted.rawDocumentXml).toContain('w:delText');
  });

  it('renders formatting revisions with rPrChange metadata', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx(createTrackedDoc([
      {
        type: 'paragraph',
        runs: [
          {
            text: 'Important',
            style: { fontWeight: 'bold' },
            revision: {
              type: 'format',
              beforeStyle: { fontWeight: 'normal' },
            },
          },
        ],
      },
    ]));

    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'format', author: 'Legal AI', text: 'Important' }),
      ])
    );
    expect(extracted.rawDocumentXml).toContain('w:rPrChange');
    expect(extracted.rawDocumentXml).toMatch(/<w:rPrChange\b[^>]*>\s*<w:rPr>/);
  });

  it('expands marker syntax when track changes is enabled', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx(createTrackedDoc([
      {
        type: 'paragraph',
        text: 'Hello {{-world-}}{{+team+}}!',
      },
    ]));

    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'delete', text: 'world' }),
        expect.objectContaining({ type: 'insert', text: 'team' }),
      ])
    );
  });

  it('supports revisions inside hyperlinks and list items', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx(createTrackedDoc([
      {
        type: 'paragraph',
        runs: [
          {
            text: 'Review portal',
            hyperlink: 'https://example.com/review',
            revision: { type: 'insert' },
          },
        ],
      },
      {
        type: 'list',
        listType: 'bullet',
        items: [
          {
            runs: [
              { text: 'Original item ' },
              { text: 'updated', revision: { type: 'insert' } },
            ],
          },
        ],
      },
    ]));

    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.rawDocumentXml).toContain('w:hyperlink');
    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'insert', text: 'Review portal' }),
        expect.objectContaining({ type: 'insert', text: 'updated' }),
      ])
    );
  });

  it('builds tracked changes from original and revised documents', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{ elements: [{ type: 'paragraph', text: 'Payment due in 30 days.' }] }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{ elements: [{ type: 'paragraph', text: 'Payment due in 60 days.' }] }],
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'AI Legal Assistant',
      date: '2027-01-15T10:30:00Z',
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'delete', text: '30' }),
        expect.objectContaining({ type: 'insert', text: '60' }),
      ])
    );
  });

  it('captures property-only paragraph changes as pPrChange revisions', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'paragraph',
            text: 'Aligned clause text.',
            style: { textAlign: 'left' },
            indent: { left: 240 },
          },
        ],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'paragraph',
            text: 'Aligned clause text.',
            style: { textAlign: 'right' },
            indent: { left: 480 },
          },
        ],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'AI Legal Assistant',
      date: '2027-01-15T10:30:00Z',
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'property', author: 'AI Legal Assistant', text: 'Aligned clause text.' }),
      ]),
    );
    expect(extracted.rawDocumentXml).toContain('w:pPrChange');
    expect(extracted.rawDocumentXml).toContain('w:jc w:val="left"');
    expect(extracted.rawDocumentXml).toContain('w:ind w:left="240"');
  });

  it('renders direct-authored paragraph move revisions without invalid move attributes', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx(createTrackedDoc([
      {
        type: 'paragraph',
        text: 'Moved from here.',
        revision: {
          type: 'moveFrom',
          moveName: 'contract-move-1',
        },
      },
      {
        type: 'paragraph',
        text: 'Moved to here.',
        revision: {
          type: 'moveTo',
          moveName: 'contract-move-1',
        },
      },
    ]));
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'moveFrom', text: 'Moved from here.' }),
        expect.objectContaining({ type: 'moveTo', text: 'Moved to here.' }),
      ]),
    );
    expect(extracted.rawDocumentXml).toContain('w:moveFrom');
    expect(extracted.rawDocumentXml).toContain('w:moveTo');
    expect(extracted.rawDocumentXml).toContain('w:name="contract-move-1"');
  });

  it('tracks table property changes and cell insertions in diff mode', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'table',
            tableDescription: 'Legacy contract table',
            rows: [
              { cells: [{ text: 'Clause' }, { text: 'Status' }] },
            ],
          },
        ],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'table',
            tableDescription: 'Updated contract table',
            rows: [
              { cells: [{ text: 'Clause' }, { text: 'Status' }, { text: 'Owner' }] },
            ],
          },
        ],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'AI Legal Assistant',
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'property', author: 'AI Legal Assistant' }),
        expect.objectContaining({ type: 'cellInsert', author: 'AI Legal Assistant' }),
      ]),
    );
    expect(extracted.rawDocumentXml).toContain('w:tblPrChange');
    expect(extracted.rawDocumentXml).toContain('w:tblDescription w:val="Legacy contract table"');
    expect(extracted.rawDocumentXml).toContain('w:cellIns');
  });

  it('tracks table cell deletions in diff mode', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'table',
            rows: [
              { cells: [{ text: 'Clause' }, { text: 'Status' }, { text: 'Owner' }] },
            ],
          },
        ],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'table',
            rows: [
              { cells: [{ text: 'Clause' }, { text: 'Status' }] },
            ],
          },
        ],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'AI Legal Assistant',
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'cellDelete', author: 'AI Legal Assistant' }),
      ]),
    );
    expect(extracted.rawDocumentXml).toContain('w:cellDel');
  });

  it('detects exact paragraph moves and avoids false-positive edited moves', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const movedOriginal: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Clause A.' },
          { type: 'paragraph', text: 'Moved clause stays identical.' },
          { type: 'paragraph', text: 'Clause B.' },
        ],
      }],
    };
    const movedRevised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Clause A.' },
          { type: 'paragraph', text: 'Clause B.' },
          { type: 'paragraph', text: 'Moved clause stays identical.' },
        ],
      }],
    };

    const movedResult = await renderWithTrackedChanges(movedOriginal, movedRevised, {
      author: 'AI Legal Assistant',
    });
    const movedExtracted = await extractDocxContent(movedResult.buffer);

    expect(movedExtracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'moveFrom', text: 'Moved clause stays identical.' }),
        expect.objectContaining({ type: 'moveTo', text: 'Moved clause stays identical.' }),
      ]),
    );
    expect(movedExtracted.rawDocumentXml).toContain('w:moveFrom');
    expect(movedExtracted.rawDocumentXml).toContain('w:moveTo');

    const editedRevised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Clause A.' },
          { type: 'paragraph', text: 'Clause B.' },
          { type: 'paragraph', text: 'Moved clause stays edited.' },
        ],
      }],
    };

    const editedResult = await renderWithTrackedChanges(movedOriginal, editedRevised, {
      author: 'AI Legal Assistant',
    });
    const editedExtracted = await extractDocxContent(editedResult.buffer);

    expect(editedExtracted.rawDocumentXml).not.toContain('w:moveFrom');
    expect(editedExtracted.rawDocumentXml).not.toContain('w:moveTo');
    expect(editedExtracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'delete', text: 'Moved clause stays identical.' }),
        expect.objectContaining({ type: 'insert', text: 'Moved clause stays edited.' }),
      ]),
    );
  });

  it('marks paragraph additions and deletions in diff mode', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Paragraph one.' },
          { type: 'paragraph', text: 'Paragraph to remove.' },
        ],
      }],
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Paragraph one.' },
          { type: 'paragraph', text: 'Paragraph to add.' },
        ],
      }],
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'AI Legal Assistant',
      granularity: 'paragraph',
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(extracted.document.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'delete', text: 'Paragraph to remove.' }),
        expect.objectContaining({ type: 'insert', text: 'Paragraph to add.' }),
      ])
    );
  });

  it('handles large tracked-change documents', async () => {
    const { renderWithTrackedChanges } = await loadRenderApi();
    const original: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: Array.from({ length: 50 }, (_, pageIndex) => ({
        elements: Array.from({ length: 4 }, (_, paragraphIndex) => ({
          type: 'paragraph' as const,
          text: `Clause ${pageIndex + 1}.${paragraphIndex + 1} requires payment in 30 days.`,
        })),
      })),
    };
    const revised: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: Array.from({ length: 50 }, (_, pageIndex) => ({
        elements: Array.from({ length: 4 }, (_, paragraphIndex) => ({
          type: 'paragraph' as const,
          text: `Clause ${pageIndex + 1}.${paragraphIndex + 1} requires payment in 60 days.`,
        })),
      })),
    };

    const result = await renderWithTrackedChanges(original, revised, {
      author: 'AI Legal Assistant',
    });
    const extracted = await extractDocxContent(result.buffer);

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(extracted.document.revisions.filter((revision) => revision.type === 'insert').length).toBe(200);
    expect(extracted.document.revisions.filter((revision) => revision.type === 'delete').length).toBe(200);
  });
});
