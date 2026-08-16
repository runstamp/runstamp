import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun, unzipDocx, validateDocx } from './test-utils.js';
import type {
  HeadingElement,
  ImageElement,
  ParagraphElement,
  ShapeElement,
  StructuredDocument,
  StructuredElement,
  StructuredPage,
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

function createPngDataUri(width = 2, height = 2): string {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const rawRows = Buffer.concat(
    Array.from({ length: height }, () => Buffer.from([0x00, ...Array.from({ length: width }, () => [0x00, 0x44, 0x88, 0xff]).flat()])),
  );
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(rawRows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function paragraph(id: string, text: string, overrides: Partial<ParagraphElement> = {}): ParagraphElement {
  return {
    id,
    type: 'paragraph',
    position: { x: 0, y: 0, width: 420, height: 24 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'p',
    dataAttributes: {},
    text,
    runs: [createTextRun(text)],
    ...overrides,
  };
}

function heading(id: string, text: string, level: 1 | 2 | 3 = 1): HeadingElement {
  return {
    id,
    type: 'heading',
    level,
    position: { x: 0, y: 0, width: 420, height: 32 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: `h${level}`,
    dataAttributes: {},
    text,
    runs: [createTextRun(text, { fontWeight: 'bold' })],
  };
}

function image(id: string): ImageElement {
  return {
    id,
    type: 'image',
    position: { x: 0, y: 0, width: 96, height: 48 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'img',
    dataAttributes: {},
    src: createPngDataUri(2, 1),
    alt: `${id} alt`,
    naturalWidth: 2,
    naturalHeight: 1,
  };
}

function shape(id: string, shapeType: ShapeElement['shapeType']): ShapeElement {
  return {
    id,
    type: 'shape',
    position: { x: 0, y: 0, width: 144, height: 72 },
    zIndex: 0,
    opacity: 1,
    style: { ...DEFAULT_STYLE, color: '#FFFFFF' },
    tagName: 'div',
    dataAttributes: {},
    shapeType,
    fill: { type: 'solid', color: '#4472C4' },
    stroke: { width: 1, color: '#2F5496', style: 'solid' },
    text: `${shapeType} label`,
  };
}

function sectionPage(elements: StructuredElement[], overrides: Partial<StructuredPage> = {}): StructuredPage {
  return {
    pageNumber: 1,
    dimensions: {
      width: 794,
      height: 1123,
      margins: { top: 96, right: 96, bottom: 96, left: 96 },
    },
    elements,
    ...overrides,
  };
}

describe('native phase 3 serializer', () => {
  it('emits isolated header/footer parts with tab stops, first/even refs, cached fields, and even/odd settings', async () => {
    const doc = createStructuredDocument([], {
      pages: [
        sectionPage([paragraph('body', 'Body')], {
          header: {
            differentFirst: true,
            differentOddEven: true,
            elements: [
              paragraph('header-text', 'Header\tPage {PAGE} of {NUMPAGES}'),
              image('header-image'),
            ],
          },
          footer: {
            differentFirst: true,
            differentOddEven: true,
            elements: [paragraph('footer-text', 'Footer\t{PAGE}')],
          },
        }),
      ],
    });

    const result = await serializeStructuredToNativeOOXML(doc);
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];
    const settingsXml = entries['word/settings.xml'];
    const headerPath = Object.keys(entries).find((path) => /^word\/header\d+\.xml$/.test(path));
    const headerRelsPath = Object.keys(entries).find((path) => /^word\/_rels\/header\d+\.xml\.rels$/.test(path));
    const footerPath = Object.keys(entries).find((path) => /^word\/footer\d+\.xml$/.test(path));

    expect(headerPath).toBeDefined();
    expect(headerRelsPath).toBeDefined();
    expect(footerPath).toBeDefined();
    expect(entries[headerPath!]).toContain('<w:tab w:val="center" w:pos="4515"');
    expect(entries[headerPath!]).toContain('<w:tab w:val="right" w:pos="9030"');
    expect(entries[headerPath!]).toContain('PAGE');
    expect(entries[headerPath!]).toContain('<w:fldChar w:fldCharType="separate"');
    expect(entries[headerPath!]).toContain('<w:t>1</w:t>');
    expect(entries[headerRelsPath!]).toContain('Target="media/image001.png"');
    expect(settingsXml).toContain('<w:evenAndOddHeaders/>');
    expect(settingsXml).toContain('<w:updateFields w:val="true"/>');
    expect(documentXml.match(/<w:headerReference/g)?.length).toBe(3);
    expect(documentXml.match(/<w:footerReference/g)?.length).toBe(3);
    expect(documentXml).toContain('w:type="first"');
    expect(documentXml).toContain('w:type="even"');
    expect(documentXml).toContain('<w:titlePg/>');
  });

  it('emits external hyperlinks, internal anchors, TOC cached entries, and heading bookmarks', async () => {
    const doc = createStructuredDocument([
      heading('h1', 'Introduction', 1),
      paragraph('links', 'links', {
        runs: [
          createTextRun('Runstamp', { link: 'https://runstamp.com' }),
          createTextRun(' and '),
          createTextRun('jump', { link: '#_Toc1' }),
        ],
      }),
      heading('h2', 'Background', 2),
    ], {
      toc: { title: 'Contents', levels: 2, hyperlinks: true, showPageNumbers: true },
    });

    const result = await serializeStructuredToNativeOOXML(doc);
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];
    const relsXml = entries['word/_rels/document.xml.rels'];

    expect(documentXml).toContain('<w:sdt>');
    expect(documentXml).toContain('Contents');
    expect(documentXml).toContain('TOC \\h \\o &quot;1-2&quot; \\z \\u');
    expect(documentXml).toContain('<w:bookmarkStart w:id="1" w:name="_Toc_introduction"');
    expect(documentXml).toContain('<w:bookmarkStart w:id="2" w:name="_Toc_background"');
    expect(documentXml).toContain('<w:hyperlink w:anchor="_Toc_introduction"');
    expect(documentXml).toContain('PAGEREF _Toc_introduction \\h');
    expect(documentXml).toContain('<w:pStyle w:val="TOC1"');
    expect(documentXml).toContain('<w:pStyle w:val="TOC2"');
    expect(documentXml).toContain('<w:rStyle w:val="Hyperlink"');
    expect(relsXml).toContain('Target="https://runstamp.com"');
    expect(relsXml).toContain('TargetMode="External"');
  });

  it('emits native footnotes and endnotes with references, parts, content types, and relationships', async () => {
    const doc = createStructuredDocument([
      paragraph('with-footnote', 'Footnote source', {
        docx: { footnote: 'Footnote text <escaped>' },
      }),
      paragraph('with-endnote', 'Endnote source', {
        docx: { endnote: 'Endnote text & escaped' },
      }),
    ]);

    const result = await serializeStructuredToNativeOOXML(doc);
    const entries = await unzipDocx(result.buffer);

    expect(entries['word/document.xml']).toContain('<w:footnoteReference w:id="1"');
    expect(entries['word/document.xml']).toContain('<w:endnoteReference w:id="1"');
    expect(entries['word/footnotes.xml']).toContain('<w:footnote w:type="separator" w:id="-1"');
    expect(entries['word/footnotes.xml']).toContain('Footnote text &lt;escaped&gt;');
    expect(entries['word/endnotes.xml']).toContain('Endnote text &amp; escaped');
    expect(entries['word/_rels/document.xml.rels']).toContain('relationships/footnotes');
    expect(entries['word/_rels/document.xml.rels']).toContain('relationships/endnotes');
    expect(entries['[Content_Types].xml']).toContain('/word/footnotes.xml');
    expect(entries['[Content_Types].xml']).toContain('/word/endnotes.xml');
    expect(entries['word/styles.xml']).toContain('w:styleId="FootnoteText"');
    expect(entries['word/styles.xml']).toContain('w:styleId="EndnoteReference"');
  });

  it('emits DrawingML shapes with non-empty VML fallback, deterministic shared docPr ids, columns, and watermark header', async () => {
    const doc = createStructuredDocument([
      image('body-image'),
      shape('rect', 'rectangle'),
      shape('ellipse', 'ellipse'),
      shape('triangle', 'triangle'),
      shape('diamond', 'diamond'),
      shape('line', 'line'),
      shape('arrow', 'arrow'),
    ]);

    const result = await serializeStructuredToNativeOOXML(doc, {
      columns: 2,
      watermark: { text: 'DRAFT', opacity: 0.3, rotation: -35 },
    });
    const entries = await unzipDocx(result.buffer);
    const documentXml = entries['word/document.xml'];
    const headerPath = Object.keys(entries).find((path) => /^word\/header\d+\.xml$/.test(path));

    expect(documentXml).toContain('<w:cols w:num="2"');
    expect(documentXml).toContain('<wp:docPr id="1" name="Picture 1"');
    expect(documentXml).toContain('<wp:docPr id="2" name="Shape 2"');
    expect(documentXml).toContain('<mc:AlternateContent>');
    expect(documentXml).toContain('<mc:Fallback><w:pict>');
    expect(documentXml).toContain('<wps:wsp>');
    expect(documentXml).toContain('prst="rightArrow"');
    expect(headerPath).toBeDefined();
    expect(entries[headerPath!]).toContain('PowerPlusWaterMarkObject');
    expect(entries[headerPath!]).toContain('string="DRAFT"');
  });

  it('generates a validator-clean mixed Phase 3 document', async () => {
    const doc: StructuredDocument = createStructuredDocument([
      heading('vh1', 'Validator Intro'),
      paragraph('vlink', 'Validator link', {
        runs: [createTextRun('site', { link: 'https://runstamp.com' })],
      }),
      paragraph('vnote', 'Validator note', {
        docx: { footnote: 'Validator footnote' },
      }),
      shape('vshape', 'rectangle'),
    ], {
      toc: { title: 'Contents', levels: 2 },
      pages: [
        sectionPage([
          heading('vh1', 'Validator Intro'),
          paragraph('vlink', 'Validator link', {
            runs: [createTextRun('site', { link: 'https://runstamp.com' })],
          }),
          paragraph('vnote', 'Validator note', {
            docx: { footnote: 'Validator footnote' },
          }),
          shape('vshape', 'rectangle'),
        ], {
          header: { elements: [paragraph('vheader', 'Header {PAGE}')] },
          footer: { elements: [paragraph('vfooter', 'Footer {NUMPAGES}')] },
        }),
      ],
    });

    const result = await serializeStructuredToNativeOOXML(doc, { columns: 2, watermark: 'DRAFT' });
    const validation = await validateDocx(result.buffer);

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});
