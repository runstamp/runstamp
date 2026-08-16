import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { renderToDocx, validateDocxDocument } from '../src/render.js';
import type { DocxDocument } from '../src/schema.js';

async function packageXml(document: DocxDocument): Promise<{ document: string; settings: string; headers: string[]; footers: string[] }> {
  const rendered = await renderToDocx(document);
  const zip = await JSZip.loadAsync(rendered.buffer);
  const readParts = async (pattern: RegExp) => Promise.all(
    Object.values(zip.files)
      .filter((file) => !file.dir && pattern.test(file.name))
      .map((file) => file.async('string')),
  );
  return {
    document: await zip.file('word/document.xml')!.async('string'),
    settings: await zip.file('word/settings.xml')!.async('string'),
    headers: await readParts(/^word\/header\d+\.xml$/),
    footers: await readParts(/^word\/footer\d+\.xml$/),
  };
}

function documentWith(elements: DocxDocument['pages'][number]['elements']): DocxDocument {
  return { type: 'DocxDocument', pageSize: 'a4', pages: [{ elements }] };
}

const tableRows = [
  { isHeader: true, cells: [{ text: 'Name' }, { text: 'Status' }] },
  { cells: [{ text: 'Alpha' }, { text: 'Open' }] },
  { cells: [{ text: 'Beta' }, { text: 'Closed' }] },
];

describe('VQH DOCX visual defect regressions', () => {
  it('VQH-003 emits materially distinct XML for every tableStyle preset', async () => {
    const presets = ['plain', 'striped', 'bordered', 'modern', 'minimal', 'corporate'] as const;
    const xmlByPreset = await Promise.all(presets.map(async (tableStyle) => {
      const xml = (await packageXml(documentWith([{ type: 'table', tableStyle, rows: tableRows }]))).document;
      return xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)![0];
    }));

    expect(new Set(xmlByPreset).size).toBe(presets.length);
    expect(xmlByPreset[presets.indexOf('plain')]).toContain('<w:top w:val="nil"');
    expect(xmlByPreset[presets.indexOf('striped')]).toContain('w:fill="F2F6F8"');
    expect(xmlByPreset[presets.indexOf('modern')]).toContain('w:fill="1F4E79"');
    expect(xmlByPreset[presets.indexOf('corporate')]).toContain('w:fill="2F5597"');
  });

  it('VQH-004 cascades cell fontWeight and color into text runs', async () => {
    const xml = (await packageXml(documentWith([{
      type: 'table',
      rows: [{ isHeader: true, cells: [{ text: 'Critical', style: { fontWeight: 'bold', color: 'C00000' } }] }],
    }]))).document;
    const cell = xml.match(/<w:tc>[\s\S]*?Critical[\s\S]*?<\/w:tc>/)![0];

    expect(cell).toContain('<w:b/>');
    expect(cell).toContain('<w:color w:val="C00000"/>');
  });

  it('VQH-007 emits page-aware PAGEREFs and a configured dot-leader tab', async () => {
    const xml = await packageXml({
      type: 'DocxDocument',
      pageSize: 'a4',
      tableOfContents: { title: 'Contents', maxLevel: 2, leader: 'dot' },
      pages: [
        { elements: [{ type: 'heading', level: 1, text: 'Overview' }] },
        { elements: [{ type: 'heading', level: 2, text: 'Findings' }] },
        { elements: [{ type: 'heading', level: 1, text: 'Appendix' }] },
      ],
    });

    expect(xml.document).toContain('w:val="right" w:leader="dot"');
    expect(xml.document).toMatch(/PAGEREF _Toc_findings[\s\S]*?<w:t[^>]*>2<\/w:t>/);
    expect(xml.document).toMatch(/PAGEREF _Toc_appendix[\s\S]*?<w:t[^>]*>3<\/w:t>/);
    expect(xml.settings).toContain('<w:updateFields w:val="true"/>');
  });

  it('VQH-008 prevents ordinary table rows from splitting across pages', async () => {
    const xml = (await packageXml(documentWith([{ type: 'table', rows: tableRows }]))).document;
    expect(xml.match(/<w:cantSplit\/>/g)).toHaveLength(3);
  });

  it('keeps opted-in short business tables together instead of orphaning closing rows', async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      cells: [{ text: `Approval ${index + 1}` }, { text: `Date ${index + 1}` }],
    }));
    const xml = (await packageXml(documentWith([{ type: 'table', keepTogether: true, rows }]))).document;
    const serializedRows = xml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) ?? [];

    expect(serializedRows).toHaveLength(5);
    for (const row of serializedRows.slice(0, -1)) {
      expect(row).toContain('<w:keepNext/>');
    }
    expect(serializedRows.at(-1)).not.toContain('<w:keepNext/>');
  });

  it('protects only the final pair of ordinary short-table rows', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({
      cells: [{ text: `Metric ${index + 1}` }, { text: `Value ${index + 1}` }],
    }));
    const xml = (await packageXml(documentWith([{ type: 'table', rows }]))).document;
    const serializedRows = xml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) ?? [];

    expect(serializedRows).toHaveLength(3);
    expect(serializedRows[0]).not.toContain('<w:keepNext/>');
    expect(serializedRows[1]).toContain('<w:keepNext/>');
    expect(serializedRows[2]).not.toContain('<w:keepNext/>');
  });

  it('VQH-011 serializes paragraph shading, borders, and padding', async () => {
    const xml = (await packageXml(documentWith([{
      type: 'paragraph',
      text: 'DANGER: isolate power',
      style: {
        backgroundColor: 'FFF2CC',
        border: { width: 1, color: 'C00000', style: 'solid' },
        padding: { top: 6, right: 8, bottom: 6, left: 8 },
      },
    }]))).document;
    const paragraph = xml.match(/<w:p>[\s\S]*?DANGER: isolate power[\s\S]*?<\/w:p>/)![0];

    expect(paragraph).toContain('<w:pBdr>');
    expect(paragraph).toContain('w:val="single" w:sz="8" w:space="6" w:color="C00000"');
    expect(paragraph).toContain('<w:shd w:val="clear" w:color="auto" w:fill="FFF2CC"/>');
    expect(paragraph).toContain('<w:ind w:left="120" w:right="120"/>');
  });

  it('VQH-012 preserves explicit point widths in the table grid', async () => {
    const xml = (await packageXml(documentWith([{
      type: 'table',
      columns: [{ width: 100 }, { width: 200 }],
      rows: [{ cells: [{ text: 'A' }, { text: 'B' }] }],
    }]))).document;
    const widths = [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((match) => Number(match[1]));

    expect(widths[0]).toBeCloseTo(2000, -1);
    expect(widths[1]).toBeCloseTo(4000, -1);
  });

  it('VQH-029 keeps headings with their following block', async () => {
    const xml = (await packageXml(documentWith([
      { type: 'heading', level: 2, text: 'Quality of earnings' },
      { type: 'table', rows: tableRows },
    ]))).document;
    const heading = xml.match(/<w:p>[\s\S]*?Quality of earnings[\s\S]*?<\/w:p>/)![0];
    expect(heading).toContain('<w:keepNext/>');
    expect(heading).toContain('<w:keepLines/>');
  });

  it('VQH-006 and VQH-009 render a visible caption and compact post-table spacing', async () => {
    const xml = (await packageXml(documentWith([
      { type: 'table', caption: 'Table 2-1: Availability targets', rows: tableRows },
      { type: 'paragraph', text: 'Following paragraph' },
    ]))).document;

    expect(xml).toContain('Table 2-1: Availability targets');
    expect(xml).not.toContain('<w:tblCaption w:val="Table 2-1: Availability targets"');
    expect(xml).toMatch(/<\/w:tbl><w:p><w:pPr><w:spacing w:before="80" w:after="0" w:line="20" w:lineRule="exact"\/><\/w:pPr><\/w:p><w:p>/);
  });

  it('VQH-010 aligns first-page header shorthand and moves footer numbering to the right tab', async () => {
    const xml = await packageXml({
      type: 'DocxDocument',
      pageSize: 'a4',
      differentFirstPage: true,
      firstPageHeader: { text: 'LETTERHEAD', style: { textAlign: 'center' } },
      footer: { text: 'Confidential', includePageNumber: true },
      pages: [{ elements: [{ type: 'paragraph', text: 'Body' }] }],
    });
    const firstHeader = xml.headers.find((part) => part.includes('LETTERHEAD'))!;
    const footer = xml.footers.find((part) => part.includes('Confidential'))!;

    expect(firstHeader).toContain('<w:jc w:val="center"/>');
    expect(footer.match(/<w:p>/g)).toHaveLength(1);
    expect(footer).toMatch(/Confidential[\s\S]*?<w:tab\/>[\s\S]*?PAGE[\s\S]*?NUMPAGES[\s\S]*?<\/w:p>/);
    expect(footer).toMatch(/<w:tab w:val="right" w:pos="\d+"\/>/);
  });

  it('keeps a page-number-only footer under caller paragraph alignment', async () => {
    const xml = await packageXml({
      type: 'DocxDocument',
      footer: { includePageNumber: true, style: { textAlign: 'center' } },
      pages: [{ elements: [{ type: 'paragraph', text: 'Body' }] }],
    });
    const footer = xml.footers[0]!;

    expect(footer).toContain('<w:jc w:val="center"/>');
    expect(footer).not.toContain('<w:tab/>');
    expect(footer).toMatch(/PAGE[\s\S]*?NUMPAGES/);
  });

  it('renders public point dimensions at the documented physical size', async () => {
    const xml = await packageXml({
      type: 'DocxDocument',
      metadata: { language: 'fr-FR' },
      pages: [{ elements: [
        { type: 'paragraph', text: 'Dimensions physiques' },
        {
          type: 'shape',
          shapeType: 'rectangle',
          width: 72,
          height: 72,
          text: 'Un pouce',
        },
      ] }],
    });

    expect(xml.document).toContain('cx="914400" cy="914400"');
    expect(xml.document).toContain('w:lang w:val="fr-FR"');
  });

  it('rejects unknown table-cell fields instead of silently dropping content', () => {
    const result = validateDocxDocument({
      type: 'DocxDocument',
      pages: [{ elements: [{
        type: 'table',
        rows: [{ cells: [{ content: 'must not disappear' }] }],
      }] }],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'pages.0.elements.0' }),
    ]));
  });

  it('reserves a one-inch body safe box when a footer is present', async () => {
    const xml = await packageXml({
      type: 'DocxDocument',
      margins: { top: 18, right: 18, bottom: 18, left: 18 },
      footer: { text: 'Confidential', includePageNumber: true },
      pages: [{ elements: [{ type: 'paragraph', text: 'Body' }] }],
    });

    expect(xml.document).toContain('w:bottom="1440"');
  });

  it('converts per-section point dimensions into physical Word page units', async () => {
    const xml = await packageXml({
      type: 'DocxDocument',
      pages: [{
        dimensions: { width: 612, height: 792 },
        elements: [{ type: 'paragraph', text: 'Letter custom size' }],
      }],
    });

    expect(xml.document).toContain('<w:pgSz w:w="12240" w:h="15840"/>');
  });
});
