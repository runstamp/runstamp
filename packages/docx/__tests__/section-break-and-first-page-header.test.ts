/**
 * Regression tests for two Phase-3 (sections) engine fixes:
 *
 *   1. `<w:type>` on a sectPr describes how the section it terminates
 *      *begins*. The serializer used to take page[i+1].sectionBreak and put
 *      it on page[i]'s sectPr, which made `sectionBreak: 'continuous'`
 *      ineffective at suppressing a page break (the continuous flag landed
 *      on the previous section, while the new section's sectPr defaulted to
 *      nextPage). Now `page.sectionBreak` lands on this page's own sectPr.
 *
 *   2. `firstPageHeader` / `firstPageFooter` describe the FIRST PAGE OF THE
 *      DOCUMENT, not the first page of every section. The adapter used to
 *      wire them onto every page, which combined with the OOXML serializer
 *      treating each page as its own section produced `titlePage: true` on
 *      every section — so the title-page header rendered on every page.
 *      Now they are scoped to page index 0 only.
 */
import { describe, expect, it } from 'vitest';
import { renderToDocx } from '../src/index';
import JSZip from 'jszip';

async function extractDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return await zip.file('word/document.xml')!.async('string');
}

async function extractHeaderXmls(buffer: Buffer): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const headers: Record<string, string> = {};
  await Promise.all(
    Object.keys(zip.files)
      .filter((name) => /^word\/header\d+\.xml$/.test(name))
      .map(async (name) => {
        headers[name] = await zip.file(name)!.async('string');
      }),
  );
  return headers;
}

describe('section break placement', () => {
  it('puts page.sectionBreak on this page\'s own sectPr (not the previous)', async () => {
    const result = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [
        { elements: [{ type: 'paragraph', text: 'page one' }] },
        {
          elements: [{ type: 'paragraph', text: 'page two' }],
          sectionBreak: 'continuous',
        },
      ],
    });
    const xml = await extractDocumentXml(result.buffer);

    const sectPrs = xml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/g) ?? [];
    expect(sectPrs).toHaveLength(2);
    // Section 1's sectPr lives in the first paragraph's pPr — no page-2
    // break info should land here.
    expect(sectPrs[0]).not.toContain('w:type w:val="continuous"');
    // Section 2's sectPr is the body's terminal one — page 2's continuous
    // break lands here.
    expect(sectPrs[1]).toContain('w:type w:val="continuous"');
  });

  it('emits no <w:type> when no page declares a sectionBreak', async () => {
    const result = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [
        { elements: [{ type: 'paragraph', text: 'page one' }] },
        { elements: [{ type: 'paragraph', text: 'page two' }] },
      ],
    });
    const xml = await extractDocumentXml(result.buffer);
    expect(xml).not.toContain('w:type w:val=');
  });
});

describe('firstPageHeader scoping', () => {
  it('applies firstPageHeader/Footer only to the document\'s first page', async () => {
    const result = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      differentFirstPage: true,
      firstPageHeader: { text: 'TITLE PAGE HEADER' },
      header: { text: 'BODY HEADER' },
      pages: [
        { elements: [{ type: 'paragraph', text: 'cover' }] },
        { elements: [{ type: 'paragraph', text: 'body' }] },
        { elements: [{ type: 'paragraph', text: 'more body' }] },
      ],
    });
    const headers = await extractHeaderXmls(result.buffer);

    const headerByText = (needle: string) =>
      Object.entries(headers).filter(([_, xml]) => xml.includes(needle));

    // Exactly one header part contains "TITLE PAGE HEADER" — the page-1
    // first-page header.
    expect(headerByText('TITLE PAGE HEADER').length).toBeGreaterThanOrEqual(1);
    expect(headerByText('BODY HEADER').length).toBeGreaterThanOrEqual(1);

    // Look at the document.xml: only the first section should reference a
    // first-page header part. Subsequent sections should not have
    // titlePage=true and should not reference a header part that contains
    // "TITLE PAGE HEADER".
    const xml = await extractDocumentXml(result.buffer);
    const sectPrs = xml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/g) ?? [];
    expect(sectPrs).toHaveLength(3);
    expect(sectPrs[0]).toContain('w:titlePg');
    expect(sectPrs[1]).not.toContain('w:titlePg');
    expect(sectPrs[2]).not.toContain('w:titlePg');
  });
});
