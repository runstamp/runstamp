import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { renderToDocx } from '../src/render.js';
import type { DocxDocument } from '../src/schema.js';
import { containsExplicitPaginationBoundary, keepBlockWithNext } from '../src/ooxml/builders/table.js';
import { xmlElement } from '../src/ooxml/ordered-builder.js';

async function documentXml(elements: DocxDocument['pages'][number]['elements']): Promise<string> {
  const rendered = await renderToDocx({
    type: 'DocxDocument',
    pageSize: 'a4',
    pages: [{ elements }],
  });
  const zip = await JSZip.loadAsync(rendered.buffer);
  return zip.file('word/document.xml')!.async('string');
}

function paragraphContaining(xml: string, text: string): string {
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
  const paragraph = paragraphs.find((candidate) => candidate.includes(text));
  expect(paragraph, `paragraph containing ${text}`).toBeDefined();
  return paragraph!;
}

function tableRows(xml: string): string[] {
  return xml.match(/<w:tr>[\s\S]*?<\/w:tr>/g) ?? [];
}

describe('DOCX pagination hints', () => {
  it('chains bounded vertical container blocks but leaves the final block free', async () => {
    const xml = await documentXml([{
      type: 'container',
      keepTogether: true,
      children: [
        { type: 'paragraph', text: 'Grouped first' },
        { type: 'paragraph', text: 'Grouped second' },
        { type: 'paragraph', text: 'Grouped final' },
      ],
    }]);

    expect(paragraphContaining(xml, 'Grouped first')).toContain('<w:keepNext/>');
    expect(paragraphContaining(xml, 'Grouped second')).toContain('<w:keepNext/>');
    expect(paragraphContaining(xml, 'Grouped final')).not.toContain('<w:keepNext/>');
  });

  it('does not chain a keepTogether group across an explicit page break', async () => {
    const xml = await documentXml([{
      type: 'container',
      keepTogether: true,
      children: [
        { type: 'paragraph', text: 'Before explicit break' },
        { type: 'page-break' },
        { type: 'paragraph', text: 'After explicit break' },
      ],
    }]);

    expect(paragraphContaining(xml, 'Before explicit break')).not.toContain('<w:keepNext/>');
    expect(paragraphContaining(xml, 'After explicit break')).not.toContain('<w:keepNext/>');
    expect(xml).toContain('<w:br w:type="page"/>');
  });

  it('treats section properties as a hard keepNext boundary', () => {
    const sectionParagraph = xmlElement('w:p', undefined, [
      xmlElement('w:pPr', undefined, [xmlElement('w:sectPr')]),
    ]);

    expect(containsExplicitPaginationBoundary(sectionParagraph)).toBe(true);
    expect(keepBlockWithNext(sectionParagraph)).toBe(false);
    expect(sectionParagraph.children?.[0]).not.toMatchObject({
      children: expect.arrayContaining([expect.objectContaining({ tag: 'w:keepNext' })]),
    });
  });

  it('declines oversized keepTogether groups instead of creating an unsatisfiable chain', async () => {
    const xml = await documentXml([{
      type: 'container',
      keepTogether: true,
      children: Array.from({ length: 9 }, (_, index) => ({
        type: 'paragraph' as const,
        text: `Oversized group ${index + 1}`,
      })),
    }]);

    for (let index = 1; index <= 9; index += 1) {
      expect(paragraphContaining(xml, `Oversized group ${index}`)).not.toContain('<w:keepNext/>');
    }
  });

  it('declines text-heavy keepTogether groups that cannot fit on one page', async () => {
    const xml = await documentXml([{
      type: 'container',
      keepTogether: true,
      children: [
        { type: 'heading', level: 2, text: 'Quarter priorities' },
        ...Array.from({ length: 5 }, (_, index) => ({
          type: 'paragraph' as const,
          text: `Priority ${index + 1}: ${'A concrete execution detail. '.repeat(9)}`,
        })),
      ],
    }]);

    expect(paragraphContaining(xml, 'Quarter priorities')).toContain('<w:keepNext/>');
    for (let index = 1; index <= 5; index += 1) {
      expect(paragraphContaining(xml, `Priority ${index}`)).not.toContain('<w:keepNext/>');
    }
  });

  it('does not strand a compact remediation appendix on a sparse terminal page', async () => {
    const xml = await documentXml([{
      type: 'container',
      keepTogether: true,
      children: [
        { type: 'heading', level: 3, text: '6.3 Remediation' },
        ...Array.from({ length: 3 }, (_, index) => ({
          type: 'paragraph' as const,
          text: `Remediation ${index + 1}: ${'Apply a concrete server-side control. '.repeat(4)}`,
        })),
        { type: 'heading', level: 2, text: '7. Retest and disclosure' },
        { type: 'paragraph', text: 'Retest and disclosure terms. '.repeat(9) },
      ],
    }]);

    expect(paragraphContaining(xml, '6.3 Remediation')).toContain('<w:keepNext/>');
    expect(paragraphContaining(xml, 'Remediation 3')).not.toContain('<w:keepNext/>');
  });

  it('keeps an opted-in table final row and spacer with the following block', async () => {
    const xml = await documentXml([
      {
        type: 'table',
        keepWithNext: true,
        rows: [
          { cells: [{ text: 'Execution owner' }, { text: 'Status' }] },
          { cells: [{ text: 'Taylor' }, { text: 'Approved' }] },
        ],
      },
      { type: 'paragraph', text: 'Execution notes' },
    ]);
    const rows = tableRows(xml);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('<w:keepNext/>');
    expect(rows[1]).toContain('<w:keepNext/>');
    expect(xml).toMatch(/<\/w:tbl><w:p><w:pPr><w:keepNext\/><w:spacing/);
    expect(paragraphContaining(xml, 'Execution notes')).not.toContain('<w:keepNext/>');
  });

  it('automatically keeps the final two non-header rows of a long table together', async () => {
    const rows = [
      { isHeader: true, cells: [{ text: 'Item' }, { text: 'Owner' }] },
      ...Array.from({ length: 9 }, (_, index) => ({
        cells: [{ text: `Long row ${index + 1}` }, { text: `Owner ${index + 1}` }],
      })),
    ];
    const xml = await documentXml([{ type: 'table', rows }]);
    const serializedRows = tableRows(xml);

    expect(serializedRows).toHaveLength(10);
    expect(serializedRows[7]).not.toContain('<w:keepNext/>');
    expect(serializedRows[8]).toContain('<w:keepNext/>');
    expect(serializedRows[9]).not.toContain('<w:keepNext/>');
    expect(serializedRows[0]).toContain('<w:tblHeader/>');
  });

  it('applies final-pair widow control to short visible tables', async () => {
    const xml = await documentXml([{
      type: 'table',
      rows: [
        { isHeader: true, cells: [{ text: 'Short item' }] },
        { cells: [{ text: 'Short first' }] },
        { cells: [{ text: 'Short penultimate' }] },
        { cells: [{ text: 'Short final' }] },
      ],
    }]);
    const rows = tableRows(xml);

    expect(rows[0]).not.toContain('<w:keepNext/>');
    expect(rows[1]).not.toContain('<w:keepNext/>');
    expect(rows[2]).toContain('<w:keepNext/>');
    expect(rows[3]).not.toContain('<w:keepNext/>');
  });
  it('does not apply business-table widow control to invisible grid layout tables', async () => {
    const xml = await documentXml([{
      type: 'container',
      layout: 'grid',
      columns: 2,
      children: Array.from({ length: 6 }, (_, index) => ({
        type: 'paragraph' as const,
        text: `Grid item ${index + 1}`,
      })),
    }]);
    const rows = tableRows(xml);

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => !row.includes('<w:keepNext/>'))).toBe(true);
  });

  it('preserves repeated merged headers while applying widow control to body rows', async () => {
    const xml = await documentXml([{
      type: 'table',
      rows: [
        {
          isHeader: true,
          cells: [
            { text: 'Merged heading', colSpan: 2, rowSpan: 2 },
            { text: 'Result' },
          ],
        },
        { isHeader: true, cells: [{ text: 'Units' }] },
        ...Array.from({ length: 8 }, (_, index) => ({
          cells: [{ text: `Merged body ${index + 1}` }, { text: 'A' }, { text: 'B' }],
        })),
      ],
    }]);
    const rows = tableRows(xml);

    expect(xml).toContain('<w:gridSpan w:val="2"/>');
    expect(xml).toContain('<w:vMerge w:val="restart"/>');
    expect(xml).toContain('<w:vMerge/>');
    expect(xml.match(/<w:tblHeader\/>/g)).toHaveLength(2);
    expect(rows.at(-2)).toContain('<w:keepNext/>');
    expect(rows.at(-1)).not.toContain('<w:keepNext/>');
  });

  it('supports widow control when the penultimate row contains a nested table', async () => {
    const rows = Array.from({ length: 9 }, (_, index) => ({
      cells: [{
        text: index === 7 ? undefined : `Outer ${index + 1}`,
        elements: index === 7 ? [{
          type: 'table' as const,
          rows: [{ cells: [{ text: 'Nested content' }] }],
        }] : undefined,
      }],
    }));
    const xml = await documentXml([{ type: 'table', rows }]);

    expect(xml.match(/<w:tbl>/g)).toHaveLength(2);
    expect(xml).toContain('Nested content');
    expect(xml).toMatch(/Nested content[\s\S]*?<w:keepNext\/>[\s\S]*?<\/w:tr><w:tr>/);
  });
});
