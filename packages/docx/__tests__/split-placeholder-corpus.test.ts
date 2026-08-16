/**
 * Split-placeholder corpus (Phase 3.4 + 3.1).
 *
 * Each fixture below deliberately exercises a known Word-split
 * pathology from the hardening plan:
 *
 *   1. Adjacent-run split with identical rPr
 *   2. Placeholder split by <w:proofErr>
 *   3. Placeholder split by <w:bookmarkStart>
 *   4. Placeholder inside a <w:hyperlink>
 *   5. Placeholder split mid-name by bold span
 *   6. Placeholder in a table cell
 *   7. Placeholder in a list item with <w:numPr>
 *   8. Placeholder in a header part
 *
 * After Phase 3.1 (scanner hardening — interrupter strip + rPr-agnostic
 * placeholder merge), every case above now resolves. Removing a case
 * from the "resolves" group or its corresponding fixture catches
 * regressions in the normalizer.
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { hydrateTemplate } from '../src/hydration/hydrator';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

interface FixtureOptions {
  /** Body fragment inserted inside <w:body>. */
  body: string;
  /** Optional header part XML (content inside <w:hdr>). */
  header?: string;
  /** Optional header-reference rel added to document.xml.rels. */
  headerRelId?: string;
}

async function buildFixtureDocx(options: FixtureOptions): Promise<Buffer> {
  const zip = new JSZip();

  const headerOverride = options.header
    ? `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`
    : '';

  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      ${headerOverride}
    </Types>`);

  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);

  const headerRelEntry = options.header
    ? `<Relationship Id="${options.headerRelId ?? 'rId100'}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`
    : '';

  zip.file('word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${headerRelEntry}
    </Relationships>`);

  zip.file('word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body>${options.body}</w:body>
    </w:document>`);

  if (options.header) {
    zip.file('word/header1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${options.header}</w:hdr>`);
  }

  return await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
}

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

describe('split-placeholder corpus (Phase 3.4)', () => {
  describe('resolvable today', () => {
    it('case 1: adjacent runs with identical rPr merge and resolve', async () => {
      const body = `<w:p>
        <w:r><w:t>Hello </w:t></w:r>
        <w:r><w:t>{{</w:t></w:r>
        <w:r><w:t>name</w:t></w:r>
        <w:r><w:t>}}</w:t></w:r>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { name: 'Ada' });

      expect(result.replaced).toContain('name');
      expect(result.unfilled).toHaveLength(0);
    });

    it('case 4: placeholder inside <w:hyperlink> with a single run resolves', async () => {
      const body = `<w:p>
        <w:hyperlink r:id="rId50">
          <w:r><w:t>{{link_text}}</w:t></w:r>
        </w:hyperlink>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { link_text: 'Visit us' });

      expect(result.replaced).toContain('link_text');
      expect(result.unfilled).toHaveLength(0);
    });

    it('case 6: placeholder in a table cell resolves', async () => {
      const body = `<w:tbl>
        <w:tr>
          <w:tc>
            <w:p><w:r><w:t>{{cell_value}}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      </w:tbl>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { cell_value: 'TableData' });

      expect(result.replaced).toContain('cell_value');
      expect(result.unfilled).toHaveLength(0);
    });

    it('case 7: placeholder in a list item with <w:numPr> resolves', async () => {
      const body = `<w:p>
        <w:pPr>
          <w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>
        </w:pPr>
        <w:r><w:t>{{bullet_text}}</w:t></w:r>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { bullet_text: 'ListItem' });

      expect(result.replaced).toContain('bullet_text');
      expect(result.unfilled).toHaveLength(0);
    });

    it('case 8: placeholder in a header part resolves', async () => {
      const body = `<w:p><w:r><w:t>Body content</w:t></w:r></w:p>`;
      const header = `<w:p><w:r><w:t>{{header_line}}</w:t></w:r></w:p>`;
      const buffer = await buildFixtureDocx({ body, header });

      const result = await hydrateTemplate(buffer, { header_line: 'Confidential' });

      expect(result.replaced).toContain('header_line');
      expect(result.unfilled).toHaveLength(0);

      // Confirm the header part was actually modified, not just document.xml.
      const zip = await JSZip.loadAsync(result.buffer);
      const headerXml = await zip.file('word/header1.xml')!.async('string');
      expect(headerXml).toContain('Confidential');
      expect(headerXml).not.toContain('{{header_line}}');
    });
  });

  describe('resolves after Phase 3.1 scanner hardening', () => {
    // These cases exercise pathologies the original regex scanner
    // missed: run-level interrupters and mid-placeholder formatting
    // splits. Phase 3.1 added `stripInterruptersBetweenRuns` and
    // `mergeRunsAcrossPlaceholders` passes to the normalizer.

    async function readDocumentXml(buffer: Buffer): Promise<string> {
      const zip = await JSZip.loadAsync(buffer);
      return await zip.file('word/document.xml')!.async('string');
    }

    it('case 2: placeholder split by <w:proofErr> resolves', async () => {
      // Word commonly inserts a <w:proofErr/> sibling between runs when
      // it thinks the split word is a spelling mistake. The normalizer
      // drops interrupter siblings between runs before the merge pass.
      const body = `<w:p>
        <w:r><w:t>{{</w:t></w:r>
        <w:proofErr w:type="spellStart"/>
        <w:r><w:t>customer_name</w:t></w:r>
        <w:proofErr w:type="spellEnd"/>
        <w:r><w:t>}}</w:t></w:r>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { customer_name: 'Acme' });

      expect(result.replaced).toContain('customer_name');
      expect(result.unfilled).toHaveLength(0);
      const xml = await readDocumentXml(result.buffer);
      expect(xml).toContain('Acme');
      expect(xml).not.toContain('{{customer_name}}');
    });

    it('case 3: placeholder split by <w:bookmarkStart> resolves', async () => {
      const body = `<w:p>
        <w:r><w:t>{{</w:t></w:r>
        <w:bookmarkStart w:id="0" w:name="anchor"/>
        <w:r><w:t>tagged_value</w:t></w:r>
        <w:bookmarkEnd w:id="0"/>
        <w:r><w:t>}}</w:t></w:r>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { tagged_value: 'marked' });

      expect(result.replaced).toContain('tagged_value');
      expect(result.unfilled).toHaveLength(0);
      const xml = await readDocumentXml(result.buffer);
      expect(xml).toContain('marked');
      expect(xml).not.toContain('{{tagged_value}}');
    });

    it('case 5: placeholder split mid-name by a bold span resolves', async () => {
      // Mid-name formatting = different rPr between runs. The
      // rPr-agnostic placeholder merge collapses the span whenever the
      // concatenation produces a syntactically-complete placeholder.
      const body = `<w:p>
        <w:r><w:t>{{customer_</w:t></w:r>
        <w:r><w:rPr><w:b/></w:rPr><w:t>display</w:t></w:r>
        <w:r><w:t>_name}}</w:t></w:r>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { customer_display_name: 'Acme Inc.' });

      expect(result.replaced).toContain('customer_display_name');
      expect(result.unfilled).toHaveLength(0);
      const xml = await readDocumentXml(result.buffer);
      expect(xml).toContain('Acme Inc.');
    });

    it('does not collapse unrelated runs when text merely contains `{{` without closing `}}`', async () => {
      // Guard against over-eager collapsing: a bare `{{` without a
      // later `}}` in subsequent runs must not trigger a merge.
      const body = `<w:p>
        <w:r><w:t>hello {{ still typing</w:t></w:r>
        <w:r><w:rPr><w:b/></w:rPr><w:t>bold text</w:t></w:r>
        <w:r><w:t> end.</w:t></w:r>
      </w:p>`;
      const buffer = await buildFixtureDocx({ body });

      const result = await hydrateTemplate(buffer, { foo: 'bar' });

      expect(result.replaced).toHaveLength(0);
      const xml = await readDocumentXml(result.buffer);
      // Bold run survives with its own rPr — no incorrect collapse.
      expect(xml).toContain('<w:b/>');
      expect(xml).toContain('bold text');
    });
  });
});
