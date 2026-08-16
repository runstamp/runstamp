import { afterEach, describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import JSZip from 'jszip';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun, unzipDocx, validateDocx } from './test-utils.js';
import { clearChartRenderers, registerChartRenderer } from '../../elements/charts/chart-image-generator.js';
import type {
  CodeBlockElement,
  CellReference,
  CellStyle,
  ChartElement,
  ContainerElement,
  ExtractedLayoutInfo,
  ImageElement,
  ListElement,
  ParagraphElement,
  StructuredElement,
  TableCell,
  TableElement,
  TableRow,
} from '../../types.js';

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const chunkType = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([chunkType, data])), 0);
  return Buffer.concat([length, chunkType, data, crc]);
}

function createPngDataUri({
  width = 2,
  height = 2,
  dpi = 144,
}: {
  width?: number;
  height?: number;
  dpi?: number;
} = {}): string {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ppm = Math.round(dpi / 0.0254);
  const phys = Buffer.alloc(9);
  phys.writeUInt32BE(ppm, 0);
  phys.writeUInt32BE(ppm, 4);
  phys[8] = 1;

  const rawRows = Buffer.concat(
    Array.from({ length: height }, () => Buffer.from([0x00, ...Array.from({ length: width }, () => [0xff, 0x00, 0x00, 0xff]).flat()])),
  );
  const idat = deflateSync(rawRows);

  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('pHYs', phys),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString('base64')}`;
}

function createCellStyle(overrides: Partial<CellStyle> = {}): CellStyle {
  return {
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    verticalAlign: 'middle',
    textAlign: 'left',
    ...overrides,
  };
}

function createParagraph(text: string, id = `p-${text}`): ParagraphElement {
  return {
    id,
    type: 'paragraph',
    position: { x: 0, y: 0, width: 320, height: 20 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'p',
    dataAttributes: {},
    text,
    runs: [createTextRun(text)],
  };
}

function createTableElement(): TableElement {
  const originCell = (row: number, col: number, text: string, rowSpan = 1, colSpan = 1, isHeader = false, style: Partial<CellStyle> = {}): TableCell => ({
    row,
    col,
    rowSpan,
    colSpan,
    content: [createTextRun(text, { fontWeight: isHeader ? 'bold' : 'normal' })],
    text,
    style: createCellStyle(style),
    isHeader,
  });

  const headerSpan = originCell(0, 0, 'Quarter', 2, 2, true, { backgroundColor: '#EEEEEE' });
  const headerMetric = originCell(0, 2, 'Revenue', 1, 1, true, { backgroundColor: '#EEEEEE' });
  const headerSub = originCell(1, 2, 'USD', 1, 1, true, { backgroundColor: '#EEEEEE' });
  const rowA = originCell(2, 0, 'Q1');
  const rowB = originCell(2, 1, 'North', 1, 1, false, { backgroundColor: '#FFF4CC' });
  const rowC = originCell(2, 2, '$120k');

  const rows: TableRow[] = [
    { index: 0, height: 28, cells: [headerSpan, headerMetric], isHeader: true, isFooter: false },
    { index: 1, height: 28, cells: [headerSub], isHeader: true, isFooter: false },
    { index: 2, height: 24, cells: [rowA, rowB, rowC], isHeader: false, isFooter: false },
  ];

  const matrix = [
    [
      { originRow: 0, originCol: 0, isOrigin: true, cell: headerSpan },
      { originRow: 0, originCol: 0, isOrigin: false, cell: headerSpan },
      { originRow: 0, originCol: 2, isOrigin: true, cell: headerMetric },
    ],
    [
      { originRow: 0, originCol: 0, isOrigin: false, cell: headerSpan },
      { originRow: 0, originCol: 0, isOrigin: false, cell: headerSpan },
      { originRow: 1, originCol: 2, isOrigin: true, cell: headerSub },
    ],
    [
      { originRow: 2, originCol: 0, isOrigin: true, cell: rowA },
      { originRow: 2, originCol: 1, isOrigin: true, cell: rowB },
      { originRow: 2, originCol: 2, isOrigin: true, cell: rowC },
    ],
  ] satisfies CellReference[][];

  return {
    id: 'table-1',
    type: 'table',
    position: { x: 0, y: 0, width: 480, height: 180 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'table',
    dataAttributes: {},
    columns: [{ width: 140 }, { width: 140 }, { width: 180 }],
    rows,
    headerRowCount: 2,
    footerRowCount: 0,
    repeatHeaders: true,
    cellMatrix: matrix,
    tableCaption: 'Quarterly Summary',
    tableDescription: 'Merged header table',
  };
}

function createNestedTableChild(): TableElement {
  return {
    ...createTableElement(),
    id: 'nested-table',
    rows: [
      { index: 0, height: 20, isHeader: false, isFooter: false, cells: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1, text: 'Nested', content: [createTextRun('Nested')], style: createCellStyle(), isHeader: false }] },
    ],
    columns: [{ width: 180 }],
    headerRowCount: 0,
    repeatHeaders: false,
    cellMatrix: [[{ originRow: 0, originCol: 0, isOrigin: true, cell: { row: 0, col: 0, rowSpan: 1, colSpan: 1, text: 'Nested', content: [createTextRun('Nested')], style: createCellStyle(), isHeader: false } }]],
  };
}

function createListElement(): ListElement {
  return {
    id: 'list-1',
    type: 'list',
    position: { x: 0, y: 0, width: 320, height: 120 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'ol',
    dataAttributes: {},
    listType: 'roman',
    start: 3,
    level: 0,
    items: [
      {
        text: 'First',
        content: [createTextRun('First')],
      },
      {
        text: 'Second',
        content: [createTextRun('Second')],
        nestedList: {
          id: 'nested-list',
          type: 'list',
          position: { x: 0, y: 0, width: 320, height: 80 },
          zIndex: 0,
          opacity: 1,
          style: DEFAULT_STYLE,
          tagName: 'ol',
          dataAttributes: {},
          listType: 'roman',
          start: 1,
          level: 1,
          items: [
            {
              text: 'Nested item',
              content: [createTextRun('Nested item')],
            },
          ],
        },
      },
    ],
  };
}

function createImageElement(id: string, alt = 'Native image'): ImageElement {
  return {
    id,
    type: 'image',
    position: { x: 0, y: 0, width: 192, height: 96 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'img',
    dataAttributes: {},
    src: createPngDataUri({ width: 2, height: 1, dpi: 144 }),
    alt,
    naturalWidth: 2,
    naturalHeight: 1,
  };
}

function createChartElement(): ChartElement {
  return {
    id: 'chart-1',
    type: 'chart',
    position: { x: 0, y: 0, width: 400, height: 300 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'svg',
    dataAttributes: {},
    chartType: 'bar',
    title: 'Sales',
    series: [{ name: 'Revenue', values: [10, 20, 30], color: '#336699' }],
    categories: ['Q1', 'Q2', 'Q3'],
    embedData: false,
  };
}

function createHorizontalContainer(children: StructuredElement[]): ContainerElement {
  return {
    id: 'container-horizontal',
    type: 'container',
    position: { x: 0, y: 0, width: 640, height: 200 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'div',
    dataAttributes: {},
    layout: {
      type: 'flex',
      flexDirection: 'row',
      childrenLayout: 'horizontal',
      columnCount: children.length,
    } satisfies Partial<ExtractedLayoutInfo> as ExtractedLayoutInfo,
    children,
  };
}

function createGridContainer(children: StructuredElement[], columnCount: number): ContainerElement {
  return {
    id: 'container-grid',
    type: 'container',
    position: { x: 0, y: 0, width: 600, height: 240 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'div',
    dataAttributes: {},
    layout: {
      type: 'grid',
      childrenLayout: 'grid',
      columnCount,
    } satisfies Partial<ExtractedLayoutInfo> as ExtractedLayoutInfo,
    children,
  };
}

async function readMediaBuffer(buffer: Buffer, suffix: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = Object.values(zip.files).find((file) => !file.dir && file.name.startsWith('word/media/image') && file.name.endsWith(suffix));
  expect(entry).toBeDefined();
  return entry!.async('nodebuffer');
}

describe('native phase 2 serializer', () => {
  afterEach(() => {
    clearChartRenderers();
  });

  it('serializes tables with merged cells, repeating headers, and continuation merges', async () => {
    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([createTableElement()]));
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];

    expect(documentXml).toContain('<w:tblCaption w:val="Quarterly Summary"');
    expect(documentXml).toContain('<w:tblDescription w:val="Merged header table"');
    expect(documentXml).toContain('<w:gridSpan w:val="2"');
    expect(documentXml).toContain('<w:vMerge w:val="restart"');
    expect(documentXml).toContain('<w:vMerge/>');
    expect(documentXml.match(/<w:tblHeader\/>/g)?.length).toBe(2);
    expect(documentXml).toContain('FFF4CC');
  });

  it('escapes table accessibility attrs and image alt text attrs', async () => {
    const table = {
      ...createTableElement(),
      tableCaption: 'Q&A "quote" <caption>',
      tableDescription: 'Description & details <unsafe>',
    };
    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([
      table,
      createImageElement('escaped-image', 'A&B "quote" <tag>'),
    ]));
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];

    expect(documentXml).toContain('w:val="Q&amp;A &quot;quote&quot; &lt;caption&gt;"');
    expect(documentXml).toContain('w:val="Description &amp; details &lt;unsafe&gt;"');
    expect(documentXml).toContain('descr="A&amp;B &quot;quote&quot; &lt;tag&gt;"');
    expect(documentXml).not.toContain('Q&A "quote" <caption>');
    expect(documentXml).not.toContain('A&B "quote" <tag>');
  });

  it('emits numbering, media relationships, deterministic docPr IDs, and alt warnings', async () => {
    const doc = createStructuredDocument([
      createListElement(),
      createImageElement('image-1', ''),
      createImageElement('image-2', 'Second image'),
    ]);

    const first = await serializeStructuredToNativeOOXML(doc);
    const second = await serializeStructuredToNativeOOXML(doc);
    const entries = await unzipDocx(first.buffer);

    expect(first.buffer.equals(second.buffer)).toBe(true);
    expect(entries['word/numbering.xml']).toContain('<w:abstractNum');
    expect(entries['word/numbering.xml']).toContain('<w:numFmt w:val="upperRoman"');
    expect(entries['word/_rels/document.xml.rels']).toContain('Target="media/image001.png"');
    expect(entries['word/_rels/document.xml.rels']).toContain('Target="media/image002.png"');
    expect(entries['word/document.xml']).toContain('<w:numId w:val="1"');
    expect(entries['word/document.xml']).toContain('wp:docPr id="1"');
    expect(entries['word/document.xml']).toContain('wp:docPr id="2"');
    expect(entries['[Content_Types].xml']).toContain('Extension="png"');
    expect(first.warnings.some((warning) => warning.includes('missing alt text'))).toBe(true);
  });

  it('uses the image layout box before natural or byte dimensions', async () => {
    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([
      createImageElement('layout-sized-image', 'Layout sized'),
    ]));
    const entries = await unzipDocx(result.buffer);

    expect(entries['word/document.xml']).toContain('<wp:extent cx="1828800" cy="914400"');
  });

  it('maps horizontal containers to invisible tables and preserves nested tables inside cells', async () => {
    const container = createHorizontalContainer([
      createNestedTableChild(),
      createParagraph('Right column', 'right-column'),
    ]);

    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([container]));
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];

    expect(documentXml).toContain('<w:tblBorders><w:top w:val="nil"');
    expect(documentXml).toContain('<w:tbl>');
    expect(documentXml).toContain('Nested');
    expect(documentXml).toContain('Right column');
    expect(documentXml).toContain('<w:tc><w:tcPr');
    expect(documentXml).toContain('<w:p/><w:tbl>');
    expect(documentXml).toContain('</w:tbl><w:p/>');
  });

  it('maps grid containers to rectangular invisible tables with padded final rows', async () => {
    const container = createGridContainer(
      Array.from({ length: 5 }, (_, index) => createParagraph(`Grid ${index + 1}`, `grid-${index + 1}`)),
      3,
    );
    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([container]));
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];

    expect(documentXml.match(/<w:tr>/g)?.length).toBe(2);
    expect(documentXml.match(/<w:tc><w:tcPr/g)?.length).toBe(6);
    expect(documentXml.match(/<w:gridCol w:w="3000"\/>/g)?.length).toBe(3);
    expect(documentXml).toContain('<w:tblBorders><w:top w:val="nil"');
    expect(documentXml).toContain('<w:tblCellMar><w:top w:w="0" w:type="dxa"');
    expect(documentXml).toContain('Grid 5');
  });

  it('collects fonts from nested native content and bullet numbering', async () => {
    const table = createTableElement();
    table.rows[2]!.cells[1]!.style = {
      ...table.rows[2]!.cells[1]!.style,
      fontFamily: 'Table Serif',
    };
    table.rows[2]!.cells[1]!.content = [
      createTextRun('Table font', { fontFamily: 'Table Run Sans' }),
    ];

    const bulletList: ListElement = {
      ...createListElement(),
      id: 'bullet-font-list',
      listType: 'bullet',
      dataAttributes: {
        bulletFont: 'Custom Bullet Font',
      },
      items: [
        {
          text: 'List font',
          content: [createTextRun('List font', { fontFamily: 'List Sans' })],
          nestedList: {
            ...createListElement(),
            id: 'nested-bullet-font-list',
            listType: 'bullet',
            items: [
              {
                text: 'Nested font',
                content: [createTextRun('Nested font', { fontFamily: 'Nested List Mono' })],
              },
            ],
          },
        },
      ],
    };

    const codeBlock: CodeBlockElement = {
      id: 'code-font',
      type: 'code-block',
      position: { x: 0, y: 0, width: 320, height: 80 },
      zIndex: 0,
      opacity: 1,
      style: { ...DEFAULT_STYLE, fontFamily: 'Code Mono' },
      tagName: 'pre',
      dataAttributes: {},
      code: 'const answer = 42;',
      language: 'ts',
    };

    const nestedFontParagraph: ParagraphElement = {
      ...createParagraph('Nested', 'nested-font-paragraph'),
      style: { ...DEFAULT_STYLE, fontFamily: 'Container Serif' },
      runs: [createTextRun('Nested', { fontFamily: 'Container Run Sans' })],
    };

    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([
      createGridContainer([nestedFontParagraph], 1),
      table,
      bulletList,
      codeBlock,
    ], {
      assets: {
        images: new Map(),
        fonts: new Map([['Asset Font', { family: 'Asset Font', src: 'asset-font.woff' }]]),
        embeddedFiles: new Map(),
      },
    }));
    const entries = await unzipDocx(result.buffer);
    const fontTableXml = entries['word/fontTable.xml'];

    for (const font of ['Container Serif', 'Container Run Sans', 'Table Serif', 'Table Run Sans', 'List Sans', 'Nested List Mono', 'Symbol', 'Custom Bullet Font', 'Code Mono', 'Asset Font']) {
      expect(fontTableXml).toContain(`w:name="${font}"`);
    }
  });

  it('routes charts through the native media pipeline', async () => {
    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([createChartElement()]));
    const entries = await unzipDocx(result.buffer);

    const mediaPath = Object.keys(entries).find((path) => path.startsWith('word/media/image') && path.endsWith('.svg'));
    expect(mediaPath).toBeDefined();
    expect(entries[mediaPath!]).toContain('<svg');
    expect(entries[mediaPath!]).toContain('width="400"');
    expect(entries[mediaPath!]).toContain('height="300"');
    expect(entries['word/document.xml']).toContain('<wp:extent cx="3810000" cy="2857500"');
    expect(entries['word/_rels/document.xml.rels']).toContain(`Target="${mediaPath!.replace('word/', '')}"`);
  });

  it('decodes chart renderer base64 PNG data URIs', async () => {
    registerChartRenderer(async () => ({
      data: createPngDataUri({ width: 4, height: 3, dpi: 96 }),
      width: 4,
      height: 3,
      format: 'png',
    }));

    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([createChartElement()]));
    const media = await readMediaBuffer(result.buffer, '.png');

    expect(media.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });

  it('decodes non-base64 SVG chart data URIs', async () => {
    registerChartRenderer(async () => ({
      data: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg width="8" height="6" xmlns="http://www.w3.org/2000/svg"><text>UTF-8 chart</text></svg>')}`,
      width: 8,
      height: 6,
      format: 'svg',
    }));

    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([createChartElement()]));
    const entries = await unzipDocx(result.buffer);
    const mediaPath = Object.keys(entries).find((path) => path.startsWith('word/media/image') && path.endsWith('.svg'));

    expect(mediaPath).toBeDefined();
    expect(entries[mediaPath!]).toContain('<text>UTF-8 chart</text>');
  });

  it('accepts plain SVG strings from chart renderers', async () => {
    registerChartRenderer(async () => ({
      data: '<svg width="10" height="7" xmlns="http://www.w3.org/2000/svg"><title>Plain SVG</title></svg>',
      width: 10,
      height: 7,
      format: 'svg',
    }));

    const result = await serializeStructuredToNativeOOXML(createStructuredDocument([createChartElement()]));
    const entries = await unzipDocx(result.buffer);
    const mediaPath = Object.keys(entries).find((path) => path.startsWith('word/media/image') && path.endsWith('.svg'));

    expect(mediaPath).toBeDefined();
    expect(entries[mediaPath!]).toContain('<title>Plain SVG</title>');
  });

  it('generates a validator-clean mixed Phase 2 document', async () => {
    const doc = createStructuredDocument([
      createParagraph('Intro', 'intro'),
      createListElement(),
      createTableElement(),
      createHorizontalContainer([createImageElement('container-image'), createParagraph('Container copy', 'container-copy')]),
      createChartElement(),
      {
        ...createParagraph('Suppress inherited numbering', 'num-suppress'),
        docx: {
          listInfo: {
            numId: 0,
            level: 0,
          },
        },
      },
    ]);

    const result = await serializeStructuredToNativeOOXML(doc);
    const validation = await validateDocx(result.buffer);
    const entries = await unzipDocx(result.buffer);

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(entries['word/document.xml']).toContain('<w:numId w:val="0"');
    expect(entries['word/numbering.xml']).toContain('<w:numbering');
  });
});
