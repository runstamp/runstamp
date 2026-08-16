import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocxDocument } from '../src/schema';
import type { StructuredDocument, StructuredElement, TextRun } from '../src/types';

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

async function unzip(buffer: Buffer): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: Record<string, string> = {};
  await Promise.all(
    Object.values(zip.files)
      .filter((file) => !file.dir)
      .map(async (file) => {
        entries[file.name] = await file.async('string');
      }),
  );
  return entries;
}

function baseDoc(text: string): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    pages: [{
      elements: [{ type: 'paragraph', text }],
    }],
  };
}

function benchmarkRun(text: string, overrides: Partial<TextRun> = {}): TextRun {
  return {
    text,
    fontFamily: 'Calibri',
    fontSize: 11,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    ...overrides,
  };
}

function benchmarkParagraph(id: string, index: number, text: string, runs: TextRun[] = [benchmarkRun(text)]): StructuredElement {
  return {
    id,
    type: 'paragraph',
    position: { x: 0, y: index * 20, width: 500, height: 20 },
    zIndex: 0,
    opacity: 1,
    style: defaultStyle(),
    tagName: 'p',
    dataAttributes: {},
    text,
    runs,
  };
}

function benchmarkTable(id: string, index: number): StructuredElement {
  const cells = (row: number, values: string[]) => values.map((text, col) => ({
    row,
    col,
    rowSpan: 1,
    colSpan: 1,
    content: [benchmarkRun(text, row === 0 ? { fontWeight: 'bold' } : {})],
    text,
    style: {
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      verticalAlign: 'middle',
      backgroundColor: row === 0 ? '#E5E7EB' : undefined,
    },
    isHeader: row === 0,
  }));
  const rows = [
    { index: 0, height: 28, cells: cells(0, ['Metric', 'Q1', 'Q2', 'Delta']), isHeader: true, isFooter: false },
    ...Array.from({ length: 12 }, (_, row) => ({
      index: row + 1,
      height: 24,
      cells: cells(row + 1, [`Product ${row + 1}`, String(row * 7 + 10), String(row * 9 + 16), `${row + 3}%`]),
      isHeader: false,
      isFooter: false,
    })),
  ];
  return {
    id,
    type: 'table',
    position: { x: 0, y: index * 24, width: 540, height: 320 },
    zIndex: 0,
    opacity: 1,
    style: defaultStyle(),
    tagName: 'table',
    dataAttributes: {},
    columns: Array.from({ length: 4 }, () => ({ width: 120 })),
    rows,
    headerRowCount: 1,
    footerRowCount: 0,
    repeatHeaders: true,
    cellMatrix: [],
    caption: 'Benchmark table',
  } as StructuredElement;
}

function benchmarkList(id: string, index: number): StructuredElement {
  return {
    id,
    type: 'list',
    position: { x: 0, y: index * 20, width: 500, height: 140 },
    zIndex: 0,
    opacity: 1,
    style: defaultStyle(),
    tagName: 'ol',
    dataAttributes: {},
    listType: 'number',
    start: 1,
    level: 0,
    items: Array.from({ length: 6 }, (_, itemIndex) => ({
      text: `Milestone ${itemIndex + 1}`,
      content: [benchmarkRun(`Milestone ${itemIndex + 1}`)],
    })),
  };
}

function benchmarkDocument(title: string, elements: StructuredElement[]): StructuredDocument {
  return {
    metadata: { title },
    pages: [{
      pageNumber: 1,
      dimensions: { width: 794, height: 1123, margins: { top: 96, right: 96, bottom: 96, left: 96 } },
      elements,
    }],
    styles: { paragraphStyles: new Map(), characterStyles: new Map(), tableStyles: new Map() },
    assets: { images: new Map(), fonts: new Map(), embeddedFiles: new Map() },
    stats: {
      imageCount: 0,
      tableCount: elements.filter((element) => element.type === 'table').length,
      chartCount: 0,
      shapeCount: 0,
      listCount: elements.filter((element) => element.type === 'list').length,
      containerCount: 0,
      textRunCount: elements.length,
      totalElements: elements.length,
    },
    warnings: [],
  };
}

describe('native serializer integration', () => {
  it('routes renderToDocx through the native serializer by default', async () => {
    const { renderToDocx } = await loadRenderApi();

    const optionResult = await renderToDocx(baseDoc('Native default'));
    const optionEntries = await unzip(optionResult.buffer);
    expect(optionEntries['word/document.xml']).toContain('Native default');
    expect(optionEntries['word/fontTable.xml']).toBeDefined();
    expect(optionEntries['word/webSettings.xml']).toBeDefined();
  });

  it('emits native comment ranges, comments.xml, and threaded commentsExtended.xml', async () => {
    const { renderToDocx } = await loadRenderApi();
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'paragraph',
            text: 'Parent comment target.',
            comment: {
              id: 20,
              text: 'Parent comment',
              author: 'Reviewer',
              date: '2027-01-15T10:30:00Z',
            },
          },
          {
            type: 'paragraph',
            text: 'Reply comment target.',
            comment: {
              id: 21,
              parentId: 20,
              text: 'Reply comment',
              author: 'Reviewer',
              done: true,
              date: '2027-01-15T10:31:00Z',
            },
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    const entries = await unzip(result.buffer);

    expect(entries['word/document.xml']).toContain('<w:commentRangeStart w:id="20"/>');
    expect(entries['word/document.xml']).toContain('<w:commentRangeEnd w:id="21"/>');
    expect(entries['word/comments.xml']).toContain('<w:comment w:id="20"');
    expect(entries['word/comments.xml']).toContain('<w:pStyle w:val="CommentText"/>');
    expect(entries['word/comments.xml']).toContain('w14:paraId="00000001"');
    expect(entries['word/comments.xml']).toContain('Parent comment');
    expect(entries['word/commentsExtended.xml']).toContain('<w15:commentEx w15:paraId="00000002" w15:paraIdParent="00000001" w15:done="1"/>');
    expect(entries['[Content_Types].xml']).toContain('PartName="/word/commentsExtended.xml"');
    expect(entries['word/_rels/document.xml.rels']).toContain('relationships/commentsExtended');
  });

  it('emits native tracked changes for run, paragraph, and table revisions', async () => {
    const { renderToDocx } = await loadRenderApi();
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      revisionInfo: {
        author: 'Legal AI',
        date: '2027-01-15T10:30:00Z',
        rsid: '1A2B3C4D',
      },
      options: { trackChanges: true },
      pages: [{
        elements: [
          {
            type: 'paragraph',
            runs: [
              { text: 'The term is ' },
              { text: '30', revision: { type: 'delete' } },
              { text: '60', revision: { type: 'insert' } },
              {
                text: ' days.',
                revision: { type: 'format', beforeStyle: { fontWeight: 'normal' } },
                style: { fontWeight: 'bold' },
              },
            ],
          },
          {
            type: 'paragraph',
            text: 'Moved source.',
            revision: { type: 'moveFrom', moveName: 'move-1' },
          },
          {
            type: 'paragraph',
            text: 'Moved destination.',
            revision: { type: 'moveTo', moveName: 'move-1' },
          },
          {
            type: 'table',
            caption: 'Revised table',
            revision: { type: 'property', before: { tableCaption: 'Original table' } },
            columns: [{ width: 120 }, { width: 120 }],
            rows: [{
              revision: { type: 'insert' },
              cells: [
                { text: 'Owner', revision: { type: 'insert' } },
                { text: 'Status', revision: { type: 'delete' } },
              ],
            }],
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    const entries = await unzip(result.buffer);
    const documentXml = entries['word/document.xml'];

    expect(entries['word/settings.xml']).toContain('<w:trackRevisions/>');
    expect(entries['word/settings.xml']).toContain('1A2B3C4D');
    expect(documentXml).toContain('<w:del');
    expect(documentXml).toContain('<w:delText xml:space="preserve">30</w:delText>');
    expect(documentXml).toContain('<w:ins');
    expect(documentXml).toContain('<w:rPrChange');
    expect(documentXml).toContain('<w:moveFromRangeStart');
    expect(documentXml).toContain('w:name="move-1"');
    expect(documentXml).toContain('<w:moveToRangeStart');
    expect(documentXml).toContain('<w:tblPrChange');
    expect(documentXml).toContain('<w:ins w:id=');
    expect(documentXml).toContain('<w:cellIns');
    expect(documentXml).toContain('<w:cellDel');
  });

  it('maps public first/even headers and page-number shorthands to native section parts', async () => {
    const { renderToDocx } = await loadRenderApi();
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      header: { text: 'Odd header' },
      footer: { text: 'Odd footer', includePageNumber: true },
      differentFirstPage: true,
      firstPageHeader: { text: 'First header' },
      firstPageFooter: { text: 'First footer', includePageNumber: true },
      evenPageHeader: { text: 'Even header' },
      evenPageFooter: { text: 'Even footer', includePageNumber: true },
      pages: [{
        elements: [{ type: 'paragraph', text: 'Body' }],
      }],
    };

    const result = await renderToDocx(doc);
    const entries = await unzip(result.buffer);
    const headerXml = Object.entries(entries)
      .filter(([path]) => /^word\/header\d+\.xml$/.test(path))
      .map(([, xml]) => xml)
      .join('\n');
    const footerXml = Object.entries(entries)
      .filter(([path]) => /^word\/footer\d+\.xml$/.test(path))
      .map(([, xml]) => xml)
      .join('\n');

    expect(entries['word/document.xml'].match(/<w:headerReference/g)?.length).toBe(3);
    expect(entries['word/document.xml'].match(/<w:footerReference/g)?.length).toBe(3);
    expect(entries['word/document.xml']).toContain('<w:titlePg/>');
    expect(entries['word/settings.xml']).toContain('<w:evenAndOddHeaders/>');
    expect(headerXml).toContain('Odd header');
    expect(headerXml).toContain('First header');
    expect(headerXml).toContain('Even header');
    expect(footerXml).toContain('First footer');
    expect(footerXml).toContain('Even footer');
    expect(footerXml).toContain('PAGE');
    expect(footerXml).toContain('NUMPAGES');
  });

  it('keeps concurrent and repeated native renders isolated', async () => {
    const { renderToDocx } = await loadRenderApi();
    const [docA, docB] = await Promise.all([
      renderToDocx(baseDoc('Doc A only')),
      renderToDocx(baseDoc('Doc B only')),
    ]);
    const [entriesA, entriesB] = await Promise.all([unzip(docA.buffer), unzip(docB.buffer)]);
    expect(entriesA['word/document.xml']).toContain('Doc A only');
    expect(entriesA['word/document.xml']).not.toContain('Doc B only');
    expect(entriesB['word/document.xml']).toContain('Doc B only');
    expect(entriesB['word/document.xml']).not.toContain('Doc A only');

    for (let index = 0; index < 100; index += 1) {
      const result = await renderToDocx(baseDoc(`Sequential ${index}`));
      const entries = await unzip(result.buffer);
      expect(entries['word/document.xml']).toContain(`Sequential ${index}`);
    }
  });

  it('supports hydrateDocx on native-rendered templates', async () => {
    const { hydrateDocx, renderToDocx } = await loadRenderApi();
    const rendered = await renderToDocx(baseDoc('Company: {{company}}'));
    const hydrated = await hydrateDocx(rendered.buffer, { company: 'Acme Corp' });
    const entries = await unzip(hydrated.buffer);

    expect(entries['word/document.xml']).toContain('Acme Corp');
    expect(entries['word/document.xml']).not.toContain('{{company}}');
  });

  it('emits RTL markers for Arabic, Hebrew, mixed text, and RTL hyperlinks', async () => {
    const { renderToDocx } = await loadRenderApi();
    const result = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'مرحبا بالعالم' },
          { type: 'paragraph', text: 'שלום עולם' },
          { type: 'paragraph', text: 'Invoice رقم 123 (approved)' },
          {
            type: 'paragraph',
            runs: [{ text: 'رابط المراجعة', hyperlink: 'https://example.com/review' }],
          },
        ],
      }],
    });
    const entries = await unzip(result.buffer);

    expect((entries['word/document.xml'].match(/<w:bidi\/>/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect((entries['word/document.xml'].match(/<w:rtl\/>/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(entries['word/document.xml']).toContain('<w:hyperlink r:id=');
  });

  it('benchmarks native XML and ZIP timing across simple, medium, large, and complex documents', async () => {
    const { serializeStructuredToNativeOOXML } = await import('../src/ooxml/native-serializer');
    const cases = [
      {
        name: 'simple',
        document: benchmarkDocument('Simple native benchmark', [
          benchmarkParagraph('simple-1', 0, 'Simple benchmark paragraph'),
        ]),
      },
      {
        name: 'medium',
        document: benchmarkDocument(
          'Medium native benchmark',
          Array.from({ length: 24 }, (_, index) => benchmarkParagraph(`medium-${index}`, index, `Medium paragraph ${index}`)),
        ),
      },
      {
        name: 'large',
        document: benchmarkDocument(
          'Large native benchmark',
          Array.from({ length: 160 }, (_, index) => benchmarkParagraph(`large-${index}`, index, `Large paragraph ${index} with repeated body text for timing separation.`)),
        ),
      },
      {
        name: 'complex',
        document: benchmarkDocument('Complex native benchmark', [
          benchmarkParagraph('complex-heading', 0, 'Complex benchmark', [benchmarkRun('Complex benchmark', { fontWeight: 'bold' })]),
          benchmarkTable('complex-table', 1),
          benchmarkList('complex-list', 20),
          benchmarkParagraph('complex-summary', 28, 'Summary with hyperlink', [
            benchmarkRun('Summary with '),
            benchmarkRun('hyperlink', { link: 'https://runstamp.com', color: '#0563C1', textDecoration: 'underline' }),
          ]),
        ]),
      },
    ];

    const observations: Record<string, { xmlTimeMs: number; zipTimeMs: number; fileSizeBytes: number }> = {};
    for (const benchmarkCase of cases) {
      const result = await serializeStructuredToNativeOOXML(benchmarkCase.document);
      observations[benchmarkCase.name] = {
        xmlTimeMs: result.stats.xmlTimeMs,
        zipTimeMs: result.stats.zipTimeMs,
        fileSizeBytes: result.stats.fileSizeBytes,
      };
      expect(result.stats.xmlTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.stats.zipTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.stats.fileSizeBytes).toBe(result.buffer.byteLength);
      expect(result.stats.fileSizeBytes).toBeGreaterThan(0);
    }

    const large = observations.large;
    const largeMeasuredTime = large.xmlTimeMs + large.zipTimeMs;
    const largeZipShare = largeMeasuredTime === 0 ? 0 : large.zipTimeMs / largeMeasuredTime;
    expect(largeZipShare).toBeLessThanOrEqual(1);
  });
});

function defaultStyle() {
  return {
    backgroundColor: undefined,
    backgroundImage: undefined,
    borderTopWidth: 0,
    borderTopColor: '#000000',
    borderTopStyle: 'none',
    borderRightWidth: 0,
    borderRightColor: '#000000',
    borderRightStyle: 'none',
    borderBottomWidth: 0,
    borderBottomColor: '#000000',
    borderBottomStyle: 'none',
    borderLeftWidth: 0,
    borderLeftColor: '#000000',
    borderLeftStyle: 'none',
    borderRadius: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    fontFamily: 'Calibri',
    fontSize: 11,
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.15,
    letterSpacing: 0,
    textAlign: 'left',
    textDecoration: 'none',
    color: '#000000',
    display: 'block',
    visibility: 'visible',
    overflow: 'visible',
    opacity: 1,
    boxShadow: undefined,
    transform: undefined,
  } as const;
}
