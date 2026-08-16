import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { DocxDocumentSchema, type DocxDocument } from '../src/schema.js';
import { docxToStructured } from '../src/adapters/docx-to-structured.js';
import { convertDocxDocumentToPdf } from '../src/converter/docx-to-pdf.js';
import { renderToPdf } from '../src/render.js';

const QPDF_AVAILABLE = spawnSync('which', ['qpdf'], { stdio: 'ignore' }).status === 0;


function flattenNodes(nodes: Array<any>): Array<any> {
  return nodes.flatMap((node) =>
    node?.type === 'container' && Array.isArray(node.children)
      ? [node, ...flattenNodes(node.children)]
      : [node]
  );
}

function inspectPdf(buffer: Buffer): { inflated: boolean; text: string } {
  if (!QPDF_AVAILABLE) {
    return { inflated: false, text: buffer.toString('latin1') };
  }

  const dir = mkdtempSync(join(tmpdir(), 'runstamp-docx-render-to-pdf-'));
  const inputPath = join(dir, 'input.pdf');
  const outputPath = join(dir, 'output-qdf.pdf');

  try {
    writeFileSync(inputPath, buffer);
    execFileSync('qpdf', ['--qdf', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath], { stdio: 'pipe' });
    return { inflated: true, text: execFileSync('cat', [outputPath], { encoding: 'latin1' }) };
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

describe('renderToPdf', () => {
  it('converts DOCX pages into PDF sections with header/footer overlays and bridge approximations', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      differentFirstPage: true,
      header: { text: 'Default Header' },
      footer: { text: 'Confidential', includePageNumber: true, pageNumberFormat: 'roman' },
      firstPageHeader: { text: 'Cover Header' },
      firstPageFooter: { text: 'Cover Footer', includePageNumber: true, pageNumberFormat: 'letterUpper' },
      pages: [
        {
          elements: [
            {
              type: 'image',
              src: 'https://example.com/report.png',
              alt: 'Report illustration',
              width: 96,
              height: 96,
              floating: { wrap: 'square', position: 'left' },
            },
            {
              type: 'paragraph',
              text: 'Executive summary flows beside the floated image in the PDF bridge.',
            },
            {
              type: 'list',
              listType: 'number',
              items: [
                {
                  text: 'Top line item',
                  nestedList: {
                    type: 'list',
                    listType: 'bullet',
                    items: [{ text: 'Nested point' }],
                  },
                },
              ],
            },
            {
              type: 'table',
              rows: [
                { isHeader: true, cells: [{ text: 'Name' }, { text: 'Value' }] },
                { cells: [{ text: 'Alpha' }, { text: '100', colSpan: 2 }] },
              ],
            },
          ],
        },
        {
          header: { text: 'Section Two' },
          footer: { text: 'Appendix', includePageNumber: true, pageNumberFormat: 'decimal' },
          elements: [
            { type: 'heading', level: 2, text: 'Appendix' },
            { type: 'paragraph', text: 'Second section content.' },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].overlay.headerText).toBe('Cover Header');
    expect(result.sections[0].overlay.footerText).toBe('Cover Footer');
    expect(result.sections[0].overlay.footerUsesPageNumber).toBe(true);
    expect(result.sections[0].overlay.pageNumberFormat).toBe('letterUpper');
    expect(result.sections[1].overlay.headerText).toBe('Section Two');
    expect(result.sections[1].overlay.footerText).toBe('Appendix');
    const pageMargin = result.sections[0].document.page?.margin as { bottom: number; top: number };
    expect(pageMargin.top).toBeGreaterThanOrEqual(54);
    expect(pageMargin.bottom).toBeGreaterThanOrEqual(54);

    const firstSectionChildren = result.sections[0].document.children ?? [];
    const wrappedImageGroup = firstSectionChildren.find(
      node => node.type === 'container' && node.style?.flexDirection === 'row'
    );
    expect(wrappedImageGroup).toBeTruthy();

    const nestedListItem = flattenNodes(firstSectionChildren).find(
      node => node.type === 'paragraph' && node.text?.includes('Nested point')
    );
    expect(nestedListItem?.style?.marginLeft).toBe(18);

    const tableNode = firstSectionChildren.find(node => node.type === 'table');
    expect(tableNode?.type).toBe('table');
    if (tableNode?.type === 'table') {
      expect(tableNode.header?.[0]?.cells[0]?.role).toBe('th');
      expect(tableNode.body[0]?.cells[1]?.colSpan).toBe(2);
    }
  });

  it('wraps square or tight floating images against consecutive following text blocks', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            {
              type: 'image',
              src: 'https://example.com/summary.png',
              alt: 'Summary illustration',
              width: 96,
              height: 96,
              floating: { wrap: 'tight', position: 'left' },
            },
            { type: 'heading', level: 2, text: 'Highlights' },
            { type: 'paragraph', text: 'Revenue expanded across every region.' },
            { type: 'paragraph', text: 'Retention also improved in enterprise accounts.' },
            { type: 'table', rows: [{ cells: [{ text: 'Stops wrap grouping' }] }] },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const wrappedGroup = result.sections[0]?.document.children?.[0];

    expect(wrappedGroup?.type).toBe('container');
    if (wrappedGroup?.type !== 'container') {
      return;
    }

    const textColumn = wrappedGroup.children.find((child) => child.type === 'container');
    expect(textColumn?.type).toBe('container');
    if (textColumn?.type === 'container') {
      expect(textColumn.children).toHaveLength(3);
      expect(textColumn.children.map((node) => node.type)).toEqual(['heading', 'paragraph', 'paragraph']);
    }

    const trailingTable = result.sections[0]?.document.children?.[1];
    expect(trailingTable?.type).toBe('table');
  });

  it('supports top-and-bottom floating images as aligned block figures with spacing', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            {
              type: 'image',
              src: 'https://example.com/banner.png',
              alt: 'Banner image',
              width: 120,
              height: 60,
              floating: {
                wrap: 'topAndBottom',
                position: 'center',
                distanceFromText: { top: 20, bottom: 28 },
              },
              caption: 'Centered banner',
            },
            { type: 'paragraph', text: 'Body content follows after the block float.' },
          ],
        },
      ],
    };

    const parsed = DocxDocumentSchema.parse(doc);
    expect(parsed.pages[0]?.elements[0]?.type).toBe('image');
    if (parsed.pages[0]?.elements[0]?.type === 'image') {
      expect(parsed.pages[0].elements[0].floating?.distanceFromText?.top).toBe(20);
      expect(parsed.pages[0].elements[0].floating?.wrap).toBe('topAndBottom');
    }

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const blockFloat = result.sections[0]?.document.children?.[0];
    const trailingParagraph = result.sections[0]?.document.children?.[1];

    expect(blockFloat?.type).toBe('container');
    if (blockFloat?.type === 'container') {
      expect(blockFloat.style?.alignItems).toBe('center');
      expect(blockFloat.style?.marginTop).toBe(20);
      expect(blockFloat.style?.marginBottom).toBe(28);
      expect(blockFloat.children[0]?.type).toBe('figure');
      expect(blockFloat.children[1]?.type).toBe('paragraph');
    }
    expect(trailingParagraph?.type).toBe('paragraph');
    expect(trailingParagraph && (trailingParagraph.text ?? trailingParagraph.value)).toBe('Body content follows after the block float.');
  });

  it('renders multi-section PDF buffers and reports deterministic bridge fallbacks', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      footer: { text: 'Report', includePageNumber: true, pageNumberFormat: 'decimal' },
      pages: [
        {
          elements: [
            { type: 'heading', level: 1, text: 'Quarterly Report' },
            { type: 'paragraph', text: 'Summary content for the first section.' },
          ],
        },
        {
          elements: [
            {
              type: 'chart',
              chartType: 'bar',
              title: 'Revenue',
              series: [{ name: 'North', values: [10, 20, 30] }],
              categories: ['Q1', 'Q2', 'Q3'],
            },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const conversion = convertDocxDocumentToPdf(doc, structured);
    const chartGraphic = conversion.sections[1]?.document.children?.[0];
    expect(chartGraphic?.type).toBe('graphic');
    if (chartGraphic?.type === 'graphic') {
      expect(chartGraphic.graphic.type).toBe('svg');
    }

    const result = await renderToPdf(doc);
    const pdf = await PDFDocument.load(result.buffer);

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.getPageCount()).toBe(2);
    expect(result.stats.pageCount).toBe(2);
    expect(result.warnings.some(warning => warning.code === 'DOCX_PDF_BRIDGE_FALLBACK')).toBe(false);
  }, 15000);

  it('routes tagged single-section exports through the direct PDF path', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            { type: 'heading', level: 1, text: 'Tagged export' },
            { type: 'paragraph', text: 'This section stays on the direct PDF path.' },
          ],
        },
      ],
    };

    const result = await renderToPdf(doc, { tagged: true });
    const pdf = inspectPdf(result.buffer);

    expect(result.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.text).toContain('/StructTreeRoot');
    expect(pdf.text).toContain('/MarkInfo');
  }, 15000);

  it('supports PDF/A output for single-section exports without overlay merging', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      metadata: {
        language: 'en-US',
        title: 'PDF/A export',
      },
      pageSize: 'letter',
      pages: [
        {
          elements: [
            { type: 'heading', level: 1, text: 'Archive' },
            { type: 'paragraph', text: 'Single-section archival export.' },
          ],
        },
      ],
    };

    const result = await renderToPdf(doc, { pdfA: 'PDF/A-2b' });
    const pdf = inspectPdf(result.buffer);

    expect(result.buffer.subarray(0, 8).toString('ascii')).toMatch(/^%PDF-1\.[47]/);
    if (pdf.inflated) {
      expect(pdf.text).toContain('pdfaid:part>2</pdfaid:part>');
      expect(pdf.text).toContain('pdfaid:conformance>B</pdfaid:conformance>');
    }
  });

  it('rejects compliance mode when DOCX overlays or section merges would force a rebuild', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      footer: { text: 'Quarterly report', includePageNumber: true, pageNumberFormat: 'decimal' },
      pageSize: 'letter',
      pages: [
        {
          elements: [
            { type: 'paragraph', text: 'Section one' },
          ],
        },
        {
          elements: [
            { type: 'paragraph', text: 'Section two' },
          ],
        },
      ],
    };

    await expect(
      renderToPdf(doc, { pdfA: 'PDF/A-2b' }),
    ).rejects.toThrow(/single section without header\/footer\/watermark overlays/i);
  });

  it('preserves block-level links, bookmarks, code blocks, and shape/chart figures in bridge output', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      watermark: 'Confidential',
      options: { columns: 2 },
      pages: [
        {
          elements: [
            {
              type: 'heading',
              level: 1,
              text: 'Overview',
              bookmarkId: 'overview',
            },
            {
              type: 'paragraph',
              runs: [{ text: 'runstamp.com', hyperlink: 'https://runstamp.com/docs' }],
            },
            {
              type: 'code-block',
              code: 'const total = revenue + costs;',
              showLineNumbers: true,
            },
            {
              type: 'shape',
              shapeType: 'ellipse',
              width: 120,
              height: 72,
              text: 'Milestone',
            },
            {
              type: 'chart',
              chartType: 'column',
              title: 'Bookings',
              series: [{ name: 'North', values: [12, 18, 24] }],
              categories: ['Q1', 'Q2', 'Q3'],
            },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const section = result.sections[0];
    expect(section?.document.bookmarks?.fromHeadings).toBe(true);
    expect(section?.overlay.watermarkText).toBe('Confidential');

    const root = section?.document.children?.[0];
    expect(root?.type).toBe('container');
    if (root?.type !== 'container') {
      return;
    }

    const flattened = root.children.flatMap((column) =>
      column.type === 'container' ? column.children : [column]
    );
    const heading = flattened.find((node) => node.type === 'heading');
    const linkedParagraph = flattened.find((node) => node.type === 'paragraph' && node.text === 'runstamp.com');
    const codeBlock = flattened.find((node) =>
      node.type === 'container' && node.children.some((child) =>
        child.type === 'paragraph' && (child.text ?? child.value)?.includes('const total')
      )
    );
    const graphics = flattened.filter((node) => node.type === 'graphic');

    expect(heading?.id).toBe('overview');
    expect(linkedParagraph?.link).toEqual({ kind: 'external', url: 'https://runstamp.com/docs' });
    expect(codeBlock?.type).toBe('container');
    if (codeBlock?.type === 'container') {
      const codeParagraph = codeBlock.children.find((node) => node.type === 'paragraph');
      expect(codeParagraph && (codeParagraph.text ?? codeParagraph.value)).toContain('1  const total = revenue + costs;');
    }
    expect(graphics).toHaveLength(2);
    expect(graphics.every((node) => node.type === 'graphic' && node.graphic.type === 'svg')).toBe(true);
  });

  it('preserves sequential reading order when approximating multi-column sections', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      options: { columns: 2 },
      pages: [
        {
          elements: [
            { type: 'paragraph', text: 'Paragraph 1' },
            { type: 'paragraph', text: 'Paragraph 2' },
            { type: 'paragraph', text: 'Paragraph 3' },
            { type: 'paragraph', text: 'Paragraph 4' },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const root = result.sections[0]?.document.children?.[0];

    expect(root?.type).toBe('container');
    if (root?.type !== 'container') {
      return;
    }

    const columns = root.children.filter((child) => child.type === 'container');
    expect(columns).toHaveLength(2);
    if (columns[0]?.type === 'container' && columns[1]?.type === 'container') {
      expect(columns[0].children.map((node) => node.type === 'paragraph' ? (node.text ?? node.value) : null)).toEqual([
        'Paragraph 1',
        'Paragraph 2',
      ]);
      expect(columns[1].children.map((node) => node.type === 'paragraph' ? (node.text ?? node.value) : null)).toEqual([
        'Paragraph 3',
        'Paragraph 4',
      ]);
    }
  });

  it('maps behind and in-front floating images onto layered positioned graphics', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            {
              type: 'image',
              src: 'https://example.com/background.png',
              alt: 'Background mark',
              width: 120,
              height: 80,
              floating: { wrap: 'behind', position: 'left' },
            },
            {
              type: 'image',
              src: 'https://example.com/foreground.png',
              alt: 'Foreground callout',
              width: 96,
              height: 64,
              caption: 'Foreground caption',
              floating: { wrap: 'inFront', position: 'right' },
            },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const graphics = (result.sections[0]?.document.children ?? []).filter((node) => node.type === 'graphic');
    const captions = (result.sections[0]?.document.children ?? []).filter((node) => node.type === 'paragraph');

    expect(result.warnings).toEqual([]);
    expect(graphics).toHaveLength(2);
    expect(captions.map((node) => node.text ?? node.value)).toContain('Foreground caption');
    if (graphics[0]?.type === 'graphic' && graphics[1]?.type === 'graphic') {
      expect(graphics[0].graphic.type).toBe('image');
      expect(graphics[0].graphic.layer).toBe('background');
      expect(graphics[1].graphic.type).toBe('image');
      expect(graphics[1].graphic.layer).toBe('foreground');
    }
  });

  it('honors richer parsed floating-image anchor metadata when present', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            {
              type: 'image',
              src: 'https://example.com/foreground.png',
              alt: 'Anchored callout',
              width: 80,
              height: 48,
              floating: {
                wrap: 'inFront',
                horizontalPosition: 25400,
                verticalPosition: 38100,
                distanceFromText: { left: 24, top: 18 },
              },
            },
          ],
        },
      ],
    };

    const parsed = DocxDocumentSchema.parse(doc);
    expect(parsed.pages[0]?.elements[0]?.type).toBe('image');
    if (parsed.pages[0]?.elements[0]?.type === 'image') {
      expect(parsed.pages[0].elements[0].floating?.horizontalPosition).toBe(25400);
      expect(parsed.pages[0].elements[0].floating?.verticalPosition).toBe(38100);
    }

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const graphic = result.sections[0]?.document.children?.[0];

    expect(graphic?.type).toBe('graphic');
    if (graphic?.type === 'graphic' && graphic.graphic.type === 'image') {
      expect(graphic.graphic.x).toBe(2);
      expect(graphic.graphic.y).toBe(3);
      expect(graphic.style?.left).toBe(2);
      expect(graphic.style?.top).toBe(3);
    }
  });

  it('embeds image watermarks during merged PDF overlay application', async () => {
    const pngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnM5xQAAAAASUVORK5CYII=';
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      watermark: {
        image: pngDataUri,
        opacity: 0.2,
        rotation: -30,
      },
      pages: [
        {
          elements: [
            { type: 'paragraph', text: 'Image watermark regression fixture.' },
          ],
        },
      ],
    };

    const result = await renderToPdf(doc);
    const pdf = await PDFDocument.load(result.buffer);
    const resources = pdf.getPage(0).node.Resources();
    const xObjects = resources.lookup(PDFName.of('XObject'), PDFDict);

    expect(result.warnings).toEqual([]);
    expect(xObjects?.entries().length ?? 0).toBeGreaterThan(0);
  });

  it('preserves inline note markers and emits a notes block for footnotes', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      pages: [
        {
          elements: [
            {
              type: 'heading',
              level: 2,
              text: 'Financial summary',
              footnote: 'Numbers are unaudited.',
            },
            {
              type: 'paragraph',
              text: 'Operating margin improved year over year.',
              footnote: 'Margin excludes one-time restructuring costs.',
            },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const children = result.sections[0]?.document.children ?? [];
    const heading = children.find((node) => node.type === 'heading');
    const paragraph = children.find((node) => node.type === 'paragraph' && (node.text ?? node.value)?.includes('Operating margin'));
    const noteRegion = children.find((node) => node.type === 'container' && node.style?.position === 'absolute');

    expect(heading && (heading.text ?? heading.value)).toContain('[1]');
    expect(paragraph && (paragraph.text ?? paragraph.value)).toContain('[2]');
    expect(noteRegion?.type).toBe('container');
    if (noteRegion?.type === 'container') {
      const notesHeading = noteRegion.children.find((node) => node.type === 'heading' && (node.text ?? node.value) === 'Notes');
      const noteParagraphs = noteRegion.children.filter((node) => node.type === 'paragraph' && /^\d+\.\s/.test(node.text ?? node.value ?? ''));
      expect(noteRegion.style?.bottom).toBe(0);
      expect(notesHeading?.type).toBe('heading');
      expect(noteParagraphs).toHaveLength(2);
      expect(noteParagraphs.map((node) => node.text ?? node.value)).toEqual([
        '1. Numbers are unaudited.',
        '2. Margin excludes one-time restructuring costs.',
      ]);
    }
  });

  it('keeps section-end notes outside the column approximation', () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'letter',
      options: { columns: 2 },
      pages: [
        {
          elements: [
            { type: 'paragraph', text: 'Column body 1', footnote: 'First note' },
            { type: 'paragraph', text: 'Column body 2', footnote: 'Second note' },
            { type: 'paragraph', text: 'Column body 3' },
            { type: 'paragraph', text: 'Column body 4' },
          ],
        },
      ],
    };

    const structured = docxToStructured(doc);
    const result = convertDocxDocumentToPdf(doc, structured);
    const children = result.sections[0]?.document.children ?? [];
    const rootColumns = children[0];
    const noteRegion = children.find((node) => node.type === 'container' && node.style?.position === 'absolute');

    expect(rootColumns?.type).toBe('container');
    if (rootColumns?.type === 'container') {
      expect(rootColumns.children.every((child) => child.type === 'container')).toBe(true);
    }
    expect(noteRegion?.type).toBe('container');
    if (noteRegion?.type === 'container') {
      expect(noteRegion.children.some((node) => node.type === 'heading' && (node.text ?? node.value) === 'Notes')).toBe(true);
      const noteParagraphs = noteRegion.children.filter((node) => node.type === 'paragraph' && /^\d+\.\s/.test(node.text ?? node.value ?? ''));
      expect(noteParagraphs.map((node) => node.text ?? node.value)).toEqual([
        '1. First note',
        '2. Second note',
      ]);
    }
  });
});
