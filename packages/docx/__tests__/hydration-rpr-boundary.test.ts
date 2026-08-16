/**
 * Regression test for the Phase-4 (hydration) engine fix:
 *
 * `mergeRunsAcrossPlaceholders`'s `<w:rPr>...</w:rPr>` lazy match used to
 * span run boundaries when the regex engine backtracked looking for the
 * trailing `}}` text. The middle run was silently swallowed into $5
 * (the final-open capture), so its text dropped out of the merge and
 * the placeholder name came back wrong.
 *
 * Real example from `renderToDocx({ runs: [...] })` output: a paragraph
 * built from three runs where a bold middle run bisects the placeholder
 * name `{{customer_display_name}}`. Before the fix, hydration produced
 * `{{customer__name}}` (double underscore — `display` lost) and the
 * unfilled list reported the malformed key. After the fix, the merge
 * preserves middle text and the placeholder resolves cleanly.
 */
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { renderToDocx } from '../src/index';
import { hydrateTemplate } from '../src/hydration/hydrator';
import { normalizeRunSplits } from '../src/hydration/placeholder-scanner';

async function extractDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return await zip.file('word/document.xml')!.async('string');
}

function extractWordText(xml: string): string {
  return [...xml.matchAll(/<w:t\b(?![^>]*\/>)[^>]*>([\s\S]*?)<\/w:t>|<w:t\b[^>]*\/>/g)]
    .map((match) => match[1] ?? '')
    .join('')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

describe('hydration: rPr lazy match must not span run boundaries', () => {
  it('preserves middle-run text when a bold span bisects a placeholder name', async () => {
    const rendered = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [
        {
          elements: [
            {
              type: 'paragraph',
              runs: [
                { text: 'Hello {{customer_' },
                { text: 'display', style: { fontWeight: 'bold' } },
                { text: '_name}}, welcome.' },
              ],
            },
          ],
        },
      ],
    });

    const result = await hydrateTemplate(rendered.buffer, {
      customer_display_name: 'Ada Lovelace',
    });

    expect(result.replaced).toEqual(['customer_display_name']);
    expect(result.unfilled).toEqual([]);

    const xml = await extractDocumentXml(result.buffer);
    expect(extractWordText(xml)).toContain('Hello Ada Lovelace, welcome.');
    expect(xml).not.toContain('{{');
    expect(xml).not.toContain('customer__name');
  });

  it('preserves text from multiple intermediate runs across rPr differences', async () => {
    const rendered = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [
        {
          elements: [
            {
              type: 'paragraph',
              runs: [
                { text: '{{order_' },
                { text: 'first', style: { fontWeight: 'bold' } },
                { text: '_' },
                { text: 'second', style: { fontStyle: 'italic' } },
                { text: '_id}}' },
              ],
            },
          ],
        },
      ],
    });

    const result = await hydrateTemplate(rendered.buffer, {
      order_first_second_id: 'ORD-9911',
    });

    expect(result.replaced).toEqual(['order_first_second_id']);
    expect(result.unfilled).toEqual([]);

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('ORD-9911');
  });

  it('does not collapse runs into a single run when no `{{...}}` spans them', async () => {
    // Adjacent same-rPr merge guard: with the rPr-boundary fix the regex
    // still matches pairs whose rPr blocks differ, but the replacer
    // refuses to merge when the rPr strings don't match. Bold/non-bold
    // siblings without a placeholder span survive unchanged.
    const xml =
      '<w:r><w:rPr><w:b/></w:rPr><w:t>bold text</w:t></w:r>' +
      '<w:r><w:t>plain text</w:t></w:r>';
    const normalized = normalizeRunSplits(xml);
    expect(normalized).toContain('<w:b/>');
    expect(normalized).toContain('bold text');
    expect(normalized).toContain('plain text');
  });
});
