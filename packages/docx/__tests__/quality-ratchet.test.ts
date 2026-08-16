import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { docxToStructured } from '../src/adapters/docx-to-structured.js';
import { generateChartSVG } from '../src/elements/charts/chart-image-generator.js';
import { renderToDocx } from '../src/render.js';
import type { DocxDocument } from '../src/schema.js';
import type { ChartElement, TableElement } from '../src/types.js';

function paragraph(text: string): DocxDocument['pages'][number]['elements'][number] {
  return { type: 'paragraph', text };
}

function documentWith(
  pages: DocxDocument['pages'],
  options?: DocxDocument['options'],
): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'letter',
    pages,
    ...(options ? { options } : {}),
  };
}

describe('DOCX quality ratchet', () => {
  it('keeps preserve mode byte-compatible with the omitted pagination option', async () => {
    const pages = [
      { elements: [paragraph('First group')] },
      { elements: [paragraph('Second group')] },
    ];
    const omitted = await renderToDocx(documentWith(pages));
    const explicit = await renderToDocx(documentWith(pages, { pagination: 'preserve' }));

    expect(explicit.buffer.equals(omitted.buffer)).toBe(true);
  });

  it('reflows dense soft groups by default while preserve remains an explicit opt-out', () => {
    const pages = [
      { elements: [paragraph('First dense group '.repeat(350))] },
      { elements: [paragraph('Second dense group '.repeat(350))] },
    ];
    const automatic = docxToStructured(documentWith(pages));
    const preserved = docxToStructured(documentWith(pages, { pagination: 'preserve' }));

    expect(automatic.pages).toHaveLength(1);
    expect(preserved.pages).toHaveLength(2);
  });

  it('uses compact margins for dense automatic reflow but preserves authored pagination', () => {
    const pages = [{ elements: [paragraph('Dense report content '.repeat(250))] }];
    const automatic = docxToStructured(documentWith(pages));
    const preserved = docxToStructured(documentWith(pages, { pagination: 'preserve' }));

    expect(automatic.pages[0].dimensions.margins).toEqual({ top: 72, right: 72, bottom: 72, left: 72 });
    expect(preserved.pages[0].dimensions.margins).toEqual({ top: 96, right: 96, bottom: 96, left: 96 });
  });

  it('softens heading pagination hints only during automatic dense reflow', () => {
    const pages = [{ elements: [
      paragraph('Dense preface '.repeat(700)),
      { type: 'heading' as const, level: 2 as const, text: 'Schedule', pageBreakBefore: true },
    ] }];
    const automatic = docxToStructured(documentWith(pages));
    const preserved = docxToStructured(documentWith(pages, { pagination: 'preserve' }));

    expect(automatic.pages[0].elements[1]?.docx?.pageBreakBefore).toBeUndefined();
    expect(preserved.pages[0].elements[1]?.docx?.pageBreakBefore).toBe(true);
  });

  it('balances a compact closing recommendation section', () => {
    const structured = docxToStructured(documentWith([
      { elements: [paragraph('Body')] },
      { elements: [
        { type: 'heading', level: 2, text: 'Recommendations' },
        paragraph('Decision context.'),
        { type: 'list', listType: 'number', items: [{ text: 'First action' }, { text: 'Second action' }] },
        paragraph('Methodology note.'),
      ] },
    ], { pagination: 'reflow' }));
    const elements = structured.pages[0].elements;

    expect(elements[2]?.style).toMatchObject({ lineHeight: 1.3 });
    expect(elements[3]?.style).toMatchObject({ lineHeight: 1.5, marginBottom: 30 });
    expect(elements[4]?.style).toMatchObject({ lineHeight: 1.3 });
  });

  it('keeps only the final list item with a terminal limitations note', () => {
    const structured = docxToStructured(documentWith([{
      elements: [
        { type: 'list', listType: 'number', items: [{ text: 'First' }, { text: 'Final' }] },
        paragraph('Limitations. This work did not constitute an audit.'),
      ],
    }], { pagination: 'reflow' }));
    const list = structured.pages[0].elements[0];

    expect(list.type).toBe('list');
    expect(list.dataAttributes['docx-keep-last-next']).toBe('true');
  });

  it('merges soft authoring groups in reflow mode and retains explicit page breaks', () => {
    const structured = docxToStructured(documentWith([
      { elements: [paragraph('First group')] },
      {
        elements: [
          { type: 'page-break' },
          paragraph('Second group'),
        ],
      },
    ], { pagination: 'reflow' }));

    expect(structured.pages).toHaveLength(1);
    expect(structured.pages[0].elements.map((element) => element.type)).toEqual([
      'paragraph',
      'page-break',
      'paragraph',
    ]);
  });

  it('keeps a trailing table row pair with the following continuation group', () => {
    const table = {
      type: 'table' as const,
      rows: [
        { cells: [{ text: 'Metric' }, { text: 'Value' }] },
        { cells: [{ text: 'Pipeline' }, { text: '$31.4M' }] },
        { cells: [{ text: 'Coverage' }, { text: '3.5x' }] },
      ],
    };
    const structured = docxToStructured(documentWith([{
      elements: [
        table,
        {
          type: 'container',
          keepTogether: true,
          children: [{ type: 'heading', level: 2, text: 'Next-quarter priorities' }],
        },
      ],
    }], { pagination: 'reflow' }));

    expect((structured.pages[0].elements[0] as TableElement).keepWithNext).toBe(true);
    expect(table).not.toHaveProperty('keepWithNext');
  });

  it('carries the final action row into a compact closing block', () => {
    const structured = docxToStructured(documentWith([{
      elements: [
        {
          type: 'table',
          rows: [
            { cells: [{ text: 'Action' }, { text: 'Owner' }] },
            { cells: [{ text: 'Close the finding' }, { text: 'CFO' }] },
          ],
        },
        { type: 'heading', level: 3, text: 'Close' },
        paragraph('The meeting closed at 16:35.'),
        paragraph('Signed as a true record: Committee Chair.'),
      ],
    }]));

    expect((structured.pages[0].elements[0] as TableElement).keepWithNext).toBe(true);
  });

  it('keeps a compact terminal decision log with its certification block', () => {
    const decisionLog = {
      type: 'table' as const,
      rows: Array.from({ length: 6 }, (_, index) => ({ cells: [{ text: `Motion ${index + 1}` }] })),
    };
    const structured = docxToStructured(documentWith([{
      elements: [
        { type: 'heading', level: 3, text: 'Summary of Motions' },
        decisionLog,
        { type: 'divider' },
        paragraph('I certify that the foregoing is a true record.'),
        { type: 'table', rows: [{ cells: [{ text: 'Secretary' }, { text: 'Chair' }] }] },
      ],
    }]));

    expect((structured.pages[0].elements[1] as TableElement).keepTogether).toBe(true);
    expect(decisionLog).not.toHaveProperty('keepTogether');
  });

  it('carries the final repeated-period row into a terminal summary section', () => {
    const periodTable = { type: 'table' as const, rows: [
      { cells: [{ text: 'Owner' }, { text: 'Status' }] },
      { cells: [{ text: 'Amara' }, { text: 'Complete' }] },
    ] };
    const summaryTable = { type: 'table' as const, rows: [
      { cells: [{ text: 'Blocker' }, { text: 'Owner' }] },
      { cells: [{ text: 'Review' }, { text: 'Ben' }] },
    ] };
    const structured = docxToStructured(documentWith([{
      elements: [
        periodTable,
        { type: 'heading', level: 2, text: 'Escalated blockers' },
        summaryTable,
        { type: 'heading', level: 2, text: 'Carry-over' },
        { type: 'list', listType: 'bullet', items: [{ text: 'Follow up Monday' }] },
      ],
    }]));

    expect((structured.pages[0].elements[0] as TableElement).keepWithNext).toBe(true);
    expect(periodTable).not.toHaveProperty('keepWithNext');
  });

  it('carries a digest table row into terminal next steps', () => {
    const digest = { type: 'table' as const, rows: [
      { cells: [{ text: 'Question' }, { text: 'Answer' }] },
      { cells: [{ text: 'When?' }, { text: 'Monday' }] },
    ] };
    const structured = docxToStructured(documentWith([{
      elements: [
        digest,
        { type: 'heading', level: 2, text: 'What happens next' },
        { type: 'list', listType: 'bullet', items: [{ text: 'Publish the answer' }] },
        paragraph('Questions? Contact the team.'),
      ],
    }]));

    expect((structured.pages[0].elements[0] as TableElement).keepWithNext).toBe(true);
    expect(digest).not.toHaveProperty('keepWithNext');
  });

  it('gives list items a readable default rhythm while honoring explicit style', () => {
    const defaults = docxToStructured(documentWith([{
      elements: [{ type: 'list', listType: 'bullet', items: [{ text: 'First' }, { text: 'Second' }] }],
    }]));
    const explicit = docxToStructured(documentWith([{
      elements: [{
        type: 'list',
        listType: 'bullet',
        items: [{ text: 'Compact' }],
        style: { lineHeight: 1.1, margin: { bottom: 2 } },
      }],
    }]));

    expect(defaults.pages[0].elements[0]?.style).toMatchObject({ lineHeight: 1.25, marginBottom: 0 });
    expect(explicit.pages[0].elements[0]?.style).toMatchObject({ lineHeight: 1.1, marginBottom: 2 });
  });

  it('uses compact body typography for dense reflow reports', () => {
    const structured = docxToStructured(documentWith([{
      elements: [
        { type: 'paragraph', text: 'Dense report content '.repeat(600) },
        { type: 'chart', chartType: 'column', categories: ['A'], series: [{ name: 'Value', values: [1] }] },
      ],
    }], { pagination: 'reflow' }));
    const paragraphElement = structured.pages[0].elements[0];

    expect(paragraphElement?.style.lineHeight).toBe(1);
    expect(paragraphElement?.type).toBe('paragraph');
    if (paragraphElement?.type === 'paragraph') {
      expect(paragraphElement.runs[0]?.fontSize).toBe(10.5);
    }
    expect(structured.pages[0].elements[1]?.position.height).toBe(240);
  });

  it('tightens leading before medium-dense reports strand a closing block', () => {
    const structured = docxToStructured(documentWith([{
      elements: [{ type: 'paragraph', text: 'Board minutes content '.repeat(300) }],
    }]));

    expect(structured.pages[0].elements[0]?.style.lineHeight).toBe(1);
  });

  it('preserves letter spacing and margins for a formal signoff', () => {
    const structured = docxToStructured(documentWith([{
      elements: [
        { type: 'paragraph', text: 'Formal letter body '.repeat(400) },
        { type: 'paragraph', text: 'Very truly yours,' },
        { type: 'paragraph', text: 'Counsel' },
      ],
    }]));

    expect(structured.pages[0].dimensions.margins).toEqual({ top: 96, right: 96, bottom: 96, left: 96 });
    expect(structured.pages[0].elements[0]?.style.lineHeight).toBe(1.1);
  });

  it('does not inflate an unstyled list inside a keepTogether section', () => {
    const structured = docxToStructured(documentWith([{
      elements: [{
        type: 'container',
        keepTogether: true,
        children: [
          { type: 'heading', level: 2, text: 'Priorities' },
          {
            type: 'list',
            listType: 'number',
            items: Array.from({ length: 5 }, (_, index) => ({ text: `Priority ${index + 1}` })),
          },
          { type: 'paragraph', text: 'Owners report weekly.' },
        ],
      }],
    }]));
    const container = structured.pages[0].elements[0];

    expect(container.type).toBe('container');
    if (container.type === 'container') {
      expect(container.children[1]?.style).toMatchObject({ lineHeight: 1.25, marginBottom: 0 });
    }
  });

  it('keeps compact revision-history tables together', () => {
    const structured = docxToStructured(documentWith([{
      elements: [{
        type: 'table',
        caption: 'Revision history',
        rows: [
          { isHeader: true, cells: [{ text: 'Version' }, { text: 'Summary' }] },
          { cells: [{ text: '1.0' }, { text: 'Initial issue' }] },
          { cells: [{ text: '1.1' }, { text: 'Review update' }] },
        ],
      }],
    }]));
    const table = structured.pages[0].elements[0];

    expect(table.type).toBe('table');
    if (table.type === 'table') {
      expect(table.keepTogether).toBe(true);
      expect(table.rows[1]?.height).toBe(60);
    }
  });

  it('places a keep-together legal execution block in the lower signing zone', async () => {
    const document = documentWith([{
      elements: [{
        type: 'container',
        keepTogether: true,
        children: [
          { type: 'divider' },
          {
            type: 'table',
            rows: [{ cells: [{ elements: [
              { type: 'paragraph', text: 'SIGNED for and on behalf of the Controller' },
              { type: 'paragraph', text: 'Name: Example Signer' },
            ] }] }],
          },
        ],
      }],
    }]);
    const structured = docxToStructured(document);
    const container = structured.pages[0].elements[0];

    expect(container.type).toBe('container');
    if (container.type === 'container') {
      expect(container.children[0]?.style).toMatchObject({ marginTop: 130, marginBottom: 16 });
      const signatureTable = container.children[1];
      expect(signatureTable?.type).toBe('table');
      if (signatureTable?.type === 'table') {
        expect(signatureTable.rows[0]?.height).toBe(20);
        expect(signatureTable.rows[0]?.cells[0]?.elements?.[0]?.style)
          .toMatchObject({ lineHeight: 1.2, marginBottom: 48 });
      }
    }
    const zip = await JSZip.loadAsync((await renderToDocx(document)).buffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    expect(documentXml).toContain('w:before="1950"');
  });

  it('retains section breaks, dimensions, and header overrides in reflow mode', () => {
    const structured = docxToStructured(documentWith([
      { elements: [paragraph('Default section')] },
      {
        sectionBreak: 'oddPage',
        dimensions: { width: 792, height: 612, orientation: 'landscape' },
        header: { text: 'Appendix' },
        elements: [paragraph('Special section')],
      },
      { elements: [paragraph('Back to default')] },
    ], { pagination: 'reflow' }));

    expect(structured.pages).toHaveLength(3);
    expect(structured.pages[1].sectionBreak?.type).toBe('oddPage');
    expect(structured.pages[1].dimensions.width).toBeGreaterThan(structured.pages[1].dimensions.height);
    expect(structured.pages[1].header?.elements[0]).toMatchObject({ type: 'paragraph', text: 'Appendix' });
  });

  it('retains the insertion boundary for an after-cover table of contents', () => {
    const structured = docxToStructured({
      ...documentWith([
        { elements: [paragraph('Cover')] },
        { elements: [paragraph('Chapter one')] },
        { elements: [paragraph('Chapter two')] },
      ], { pagination: 'reflow' }),
      tableOfContents: { position: 'after-cover' },
    });

    expect(structured.pages).toHaveLength(2);
    expect(structured.pages[0].elements).toHaveLength(1);
    expect(structured.pages[1].elements).toHaveLength(2);
  });

  it('keeps a compact two-paragraph closing section from orphaning its tail', () => {
    const structured = docxToStructured(documentWith([{
      elements: [
        paragraph('Body'),
        { type: 'heading', level: 2, text: 'Appendix' },
        paragraph('Methodology and sources.'),
        paragraph('Engagement team and contact details.'),
      ],
    }], { pagination: 'reflow' }));
    const firstClosingParagraph = structured.pages[0].elements[2];

    expect(firstClosingParagraph?.type).toBe('paragraph');
    expect(firstClosingParagraph?.docx?.keepNext).toBe(true);
  });


  it('propagates theme colors and fonts into styles.xml and theme1.xml', async () => {
    const result = await renderToDocx({
      ...documentWith([{ elements: [paragraph('Theme proof')] }]),
      theme: {
        preset: 'corporate',
        colors: {
          primary: '123456',
          secondary: '234567',
          accent: '345678',
          text: '101820',
          background: 'FAFAF5',
        },
        fonts: {
          heading: 'Aptos Display',
          body: 'Aptos',
          monospace: 'Cascadia Mono',
        },
      },
    });
    const zip = await JSZip.loadAsync(result.buffer);
    const styles = await zip.file('word/styles.xml')!.async('string');
    const theme = await zip.file('word/theme/theme1.xml')!.async('string');

    expect(styles).toContain('w:ascii="Aptos"');
    expect(styles).toContain('w:ascii="Aptos Display"');
    expect(styles).toContain('w:ascii="Cascadia Mono"');
    expect(styles).toContain('w:val="123456"');
    expect(theme).toContain('<a:dk1><a:srgbClr val="101820"/></a:dk1>');
    expect(theme).toContain('<a:lt1><a:srgbClr val="FAFAF5"/></a:lt1>');
    expect(theme).toContain('<a:accent1><a:srgbClr val="123456"/></a:accent1>');
    expect(theme).toContain('<a:accent2><a:srgbClr val="234567"/></a:accent2>');
    expect(theme).toContain('<a:accent3><a:srgbClr val="345678"/></a:accent3>');
    expect(theme).toContain('<a:latin typeface="Aptos Display"/>');
    expect(theme).toContain('<a:latin typeface="Aptos"/>');
  });

  it('uses the document font and explicit series colors in chart SVG', () => {
    const structured = docxToStructured({
      ...documentWith([{
        elements: [{
          type: 'chart',
          chartType: 'column',
          title: 'Revenue',
          categories: ['Q1', 'Q2'],
          series: [
            { name: 'Actual', values: [10, 12], color: '112233' },
            { name: 'Plan', values: [11, 13], color: '#AABBCC' },
          ],
        }],
      }]),
      theme: { fonts: { body: 'Aptos' } },
    });
    const chart = structured.pages[0].elements[0] as ChartElement;
    const svg = generateChartSVG(chart);

    expect(chart.position).toMatchObject({ width: 500, height: 320 });
    expect(svg).toContain('font-family="Aptos"');
    expect(svg).toContain('fill="#112233"');
    expect(svg).toContain('fill="#AABBCC"');
  });

  it('allocates more width to narrative columns and aligns numeric headers and cells', () => {
    const structured = docxToStructured({
      ...documentWith([{
        elements: [{
          type: 'table',
          rows: [
            { isHeader: true, cells: [{ text: 'Item' }, { text: 'Commentary' }, { text: 'Amount' }] },
            { cells: [{ text: 'A' }, { text: 'Long narrative explaining operational performance and follow-up actions.' }, { text: '$1,250' }] },
            { cells: [{ text: 'B' }, { text: 'Another detailed narrative with decisions and accountable owners.' }, { text: '980' }] },
          ],
        }],
      }]),
      theme: {
        preset: 'corporate',
        colors: { primary: '123456' },
      },
    });
    const table = structured.pages[0].elements[0] as TableElement;
    const totalWidth = table.columns.reduce((sum, column) => sum + column.width, 0);

    expect(table.columns[1].width).toBeGreaterThan(table.columns[0].width);
    expect(table.columns[1].width).toBeGreaterThan(table.columns[2].width);
    expect(totalWidth).toBeCloseTo(
      structured.pages[0].dimensions.width
        - structured.pages[0].dimensions.margins.left
        - structured.pages[0].dimensions.margins.right,
      5,
    );
    expect(table.rows.map((row) => row.cells[2].style.textAlign)).toEqual(['right', 'right', 'right']);
    expect(table.rows[0].cells[0].style.backgroundColor).toBe('123456');
  });

  it('preserves explicit widths and alignment', () => {
    const structured = docxToStructured(documentWith([{
      elements: [{
        type: 'table',
        columns: [{ width: 90 }, { width: 270 }],
        rows: [
          { isHeader: true, cells: [{ text: 'Amount', style: { textAlign: 'center' } }, { text: 'Narrative' }] },
          { cells: [{ text: '125' }, { text: 'Explanation' }] },
        ],
      }],
    }]));
    const table = structured.pages[0].elements[0] as TableElement;

    expect(table.columns.map((column) => column.width)).toEqual([120, 360]);
    expect(table.rows[0].cells[0].style.textAlign).toBe('center');
    expect(table.rows[1].cells[0].style.textAlign).toBe('right');
  });
});
