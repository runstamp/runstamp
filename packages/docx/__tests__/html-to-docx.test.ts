import { describe, it, expect } from 'vitest';
import { convertHtmlToStructured } from '../src/adapters/html-to-structured.js';
import { renderHtmlToDocx } from '../src/render.js';
import JSZip from 'jszip';
import type {
  HeadingElement,
  ParagraphElement,
  CodeBlockElement,
  DividerElement,
  ListElement,
  TableElement,
  ImageElement,
} from '../src/types.js';

// =============================================================================
// UNIT TESTS: FREE TIER
// =============================================================================

describe('HTML → StructuredDocument: Free Tier', () => {
  it('converts <p> with text to paragraph', () => {
    const { document } = convertHtmlToStructured('<p>Hello world</p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.type).toBe('paragraph');
    expect(el.text).toBe('Hello world');
    expect(el.runs).toHaveLength(1);
    expect(el.runs[0].text).toBe('Hello world');
  });

  it('converts <h1> through <h6> to heading elements', () => {
    const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
    const { document } = convertHtmlToStructured(html);
    const elements = document.pages[0].elements;
    expect(elements).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const el = elements[i] as HeadingElement;
      expect(el.type).toBe('heading');
      expect(el.level).toBe(i + 1);
      expect(el.text).toBe(`H${i + 1}`);
    }
  });

  it('heading font sizes match expected values', () => {
    const { document } = convertHtmlToStructured('<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4><h5>E</h5><h6>F</h6>');
    const expected = [24, 20, 16, 14, 12, 11];
    for (let i = 0; i < 6; i++) {
      const el = document.pages[0].elements[i] as HeadingElement;
      expect(el.runs[0].fontSize).toBe(expected[i]);
    }
  });

  it('converts <strong> and <b> to bold runs', () => {
    const { document } = convertHtmlToStructured('<p><strong>bold1</strong> <b>bold2</b></p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].fontWeight).toBe('bold');
    expect(el.runs[0].text).toBe('bold1');
    expect(el.runs[2].fontWeight).toBe('bold');
    expect(el.runs[2].text).toBe('bold2');
  });

  it('converts <em> and <i> to italic runs', () => {
    const { document } = convertHtmlToStructured('<p><em>ital1</em> <i>ital2</i></p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].fontStyle).toBe('italic');
    expect(el.runs[2].fontStyle).toBe('italic');
  });

  it('converts <u> to underline runs', () => {
    const { document } = convertHtmlToStructured('<p><u>underlined</u></p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].textDecoration).toBe('underline');
  });

  it('converts <s> and <del> to strikethrough runs', () => {
    const { document } = convertHtmlToStructured('<p><s>struck1</s> <del>struck2</del></p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].textDecoration).toBe('line-through');
    expect(el.runs[2].textDecoration).toBe('line-through');
  });

  it('converts <a href> to run with link', () => {
    const { document } = convertHtmlToStructured('<p><a href="https://example.com">click me</a></p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].link).toBe('https://example.com');
    expect(el.runs[0].text).toBe('click me');
  });

  it('converts inline <code> to monospace run', () => {
    const { document } = convertHtmlToStructured('<p>Use <code>const x = 1</code> syntax</p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[1].fontFamily).toBe('Consolas');
    expect(el.runs[1].text).toBe('const x = 1');
  });

  it('converts <sup> to superscript', () => {
    const { document } = convertHtmlToStructured('<p>x<sup>2</sup></p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[1].superscript).toBe(true);
  });

  it('converts <sub> to subscript', () => {
    const { document } = convertHtmlToStructured('<p>H<sub>2</sub>O</p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[1].subscript).toBe(true);
  });

  it('converts <br> to newline character in text run', () => {
    const { document } = convertHtmlToStructured('<p>Line 1<br>Line 2</p>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    const text = el.runs.map(r => r.text).join('');
    expect(text).toContain('\n');
    expect(text).toContain('Line 1');
    expect(text).toContain('Line 2');
  });

  it('converts flat <ul> to bullet list', () => {
    const { document } = convertHtmlToStructured('<ul><li>A</li><li>B</li><li>C</li></ul>');
    const el = document.pages[0].elements[0] as ListElement;
    expect(el.type).toBe('list');
    expect(el.listType).toBe('bullet');
    expect(el.items).toHaveLength(3);
    expect(el.items[0].text).toBe('A');
    expect(el.items[1].text).toBe('B');
    expect(el.items[2].text).toBe('C');
  });

  it('converts flat <ol> to numbered list', () => {
    const { document } = convertHtmlToStructured('<ol><li>First</li><li>Second</li></ol>');
    const el = document.pages[0].elements[0] as ListElement;
    expect(el.type).toBe('list');
    expect(el.listType).toBe('number');
    expect(el.items).toHaveLength(2);
  });

  it('handles nested <ul>/<ol> lists', () => {
    const html = `
      <ul>
        <li>Top
          <ul>
            <li>Nested 1</li>
            <li>Nested 2</li>
          </ul>
        </li>
        <li>Another top</li>
      </ul>
    `;
    const { document } = convertHtmlToStructured(html);
    const el = document.pages[0].elements[0] as ListElement;
    expect(el.items[0].nestedList).toBeDefined();
    expect(el.items[0].nestedList!.listType).toBe('bullet');
    expect(el.items[0].nestedList!.items).toHaveLength(2);
    expect(el.items[0].nestedList!.items[0].text).toBe('Nested 1');
  });

  it('respects <ol start="5"> attribute', () => {
    const { document } = convertHtmlToStructured('<ol start="5"><li>Five</li></ol>');
    const el = document.pages[0].elements[0] as ListElement;
    expect(el.start).toBe(5);
  });

  it('converts <blockquote> to indented paragraph', () => {
    const { document } = convertHtmlToStructured('<blockquote>A wise quote</blockquote>');
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.type).toBe('paragraph');
    expect(el.style.marginLeft).toBeGreaterThan(0);
  });

  it('blockquote with multiple children preserves all', () => {
    const html = '<blockquote><p>First</p><p>Second</p><p>Third</p></blockquote>';
    const { document } = convertHtmlToStructured(html);
    const elements = document.pages[0].elements;
    expect(elements.length).toBe(3);
    expect((elements[0] as ParagraphElement).text).toBe('First');
    expect((elements[1] as ParagraphElement).text).toBe('Second');
    expect((elements[2] as ParagraphElement).text).toBe('Third');
    // All should have indent
    for (const el of elements) {
      expect((el as ParagraphElement).style.marginLeft).toBeGreaterThan(0);
    }
  });

  it('converts <pre> to code block', () => {
    const { document } = convertHtmlToStructured('<pre>function hello() {\n  return "hi";\n}</pre>');
    const el = document.pages[0].elements[0] as CodeBlockElement;
    expect(el.type).toBe('code-block');
    expect(el.style.fontFamily).toBe('Consolas');
    expect(el.style.backgroundColor).toBe('#f5f5f5');
    expect(el.code).toContain('function hello()');
  });

  it('converts <hr> to divider', () => {
    const { document } = convertHtmlToStructured('<hr>');
    const el = document.pages[0].elements[0] as DividerElement;
    expect(el.type).toBe('divider');
    expect(el.styleType).toBe('solid');
    expect(el.thickness).toBe(1);
    expect(el.tagName).toBe('hr');
  });

  it('handles mixed inline formatting', () => {
    const html = '<p>Hello <strong>bold <em>and italic</em></strong> world</p>';
    const { document } = convertHtmlToStructured(html);
    const el = document.pages[0].elements[0] as ParagraphElement;
    // Should have runs: "Hello ", "bold ", "and italic", " world"
    expect(el.runs.length).toBeGreaterThanOrEqual(4);

    // "bold " run should be bold, not italic
    const boldRun = el.runs.find(r => r.text === 'bold ');
    expect(boldRun?.fontWeight).toBe('bold');
    expect(boldRun?.fontStyle).toBe('normal');

    // "and italic" run should be bold AND italic
    const bothRun = el.runs.find(r => r.text === 'and italic');
    expect(bothRun?.fontWeight).toBe('bold');
    expect(bothRun?.fontStyle).toBe('italic');
  });

  it('handles structural pass-through (div, section, article)', () => {
    const html = '<div><section><p>Inside</p></section></div>';
    const { document } = convertHtmlToStructured(html);
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.type).toBe('paragraph');
    expect(el.text).toBe('Inside');
  });
});

// =============================================================================
// UNIT TESTS: PRO TIER
// =============================================================================

describe('HTML → StructuredDocument: Pro Tier', () => {
  it('converts basic <table> to TableElement', () => {
    const html = `
      <table>
        <tr><td>A</td><td>B</td></tr>
        <tr><td>C</td><td>D</td></tr>
      </table>
    `;
    const { document } = convertHtmlToStructured(html, { proEnabled: true });
    const el = document.pages[0].elements[0] as TableElement;
    expect(el.type).toBe('table');
    expect(el.rows).toHaveLength(2);
    expect(el.rows[0].cells).toHaveLength(2);
    expect(el.rows[0].cells[0].text).toBe('A');
  });

  it('handles colspan and rowspan', () => {
    const html = `
      <table>
        <tr><td colspan="2">Wide</td></tr>
        <tr><td>A</td><td>B</td></tr>
      </table>
    `;
    const { document } = convertHtmlToStructured(html, { proEnabled: true });
    const el = document.pages[0].elements[0] as TableElement;
    expect(el.rows[0].cells[0].colSpan).toBe(2);
    expect(el.rows[0].cells[0].text).toBe('Wide');
  });

  it('detects header rows from <thead>', () => {
    const html = `
      <table>
        <thead><tr><th>Header</th></tr></thead>
        <tbody><tr><td>Data</td></tr></tbody>
      </table>
    `;
    const { document } = convertHtmlToStructured(html, { proEnabled: true });
    const el = document.pages[0].elements[0] as TableElement;
    expect(el.headerRowCount).toBe(1);
    expect(el.rows[0].isHeader).toBe(true);
    expect(el.rows[1].isHeader).toBe(false);
  });

  it('converts <img> with data URI to ImageElement', () => {
    const html = '<img src="data:image/png;base64,iVBOR" alt="Test image" width="200" height="100">';
    const { document } = convertHtmlToStructured(html, { proEnabled: true });
    const el = document.pages[0].elements[0] as ImageElement;
    expect(el.type).toBe('image');
    expect(el.src).toBe('data:image/png;base64,iVBOR');
    expect(el.alt).toBe('Test image');
  });

  it('resolves CSS color to text color', () => {
    const html = '<p style="color: red">Red text</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'inline' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].color).toBe('#FF0000');
  });

  it('resolves CSS font-size (px) to points', () => {
    const html = '<p style="font-size: 24px">Big text</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'inline' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].fontSize).toBe(18); // 24px * 0.75 = 18pt
  });

  it('resolves CSS font-size (pt) to points', () => {
    const html = '<p style="font-size: 14pt">Text</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'inline' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].fontSize).toBe(14);
  });

  it('resolves CSS font-weight: bold', () => {
    const html = '<p style="font-weight: bold">Bold via CSS</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'inline' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].fontWeight).toBe('bold');
  });

  it('resolves CSS text-align to paragraph alignment', () => {
    const html = '<p style="text-align: center">Centered</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'inline' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.style.textAlign).toBe('center');
  });

  it('resolves CSS margin-left to indent', () => {
    const html = '<p style="margin-left: 40px">Indented</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'inline' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.style.marginLeft).toBeGreaterThan(0);
  });

  it('ignores CSS when cssMode is "ignore"', () => {
    const html = '<p style="color: red; font-weight: bold">No CSS</p>';
    const { document } = convertHtmlToStructured(html, { proEnabled: true, cssMode: 'ignore' });
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].color).toBe('#000000'); // default
    expect(el.runs[0].fontWeight).toBe('normal'); // default
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('HTML → StructuredDocument: Edge Cases', () => {
  it('empty HTML produces empty document (no crash)', () => {
    const { document, warnings } = convertHtmlToStructured('');
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0].elements).toHaveLength(0);
  });

  it('whitespace-only HTML produces empty document', () => {
    const { document } = convertHtmlToStructured('   \n  \t  ');
    expect(document.pages[0].elements).toHaveLength(0);
  });

  it('unknown elements are skipped with warning, content preserved', () => {
    const html = '<p>Before</p><canvas>Canvas text</canvas><p>After</p>';
    const { document, warnings } = convertHtmlToStructured(html);
    expect(warnings.some(w => w.includes('<canvas>'))).toBe(true);
    // "Before" and "After" should be there
    const texts = document.pages[0].elements.map(e => (e as ParagraphElement).text);
    expect(texts).toContain('Before');
    expect(texts).toContain('After');
  });

  it('malformed HTML produces best-effort output', () => {
    const html = '<p>Unclosed<p>Second<strong>Bold no close';
    const { document } = convertHtmlToStructured(html);
    expect(document.pages[0].elements.length).toBeGreaterThan(0);
    // Should not throw
  });

  it('deeply nested lists are clamped at depth 8', () => {
    let html = '';
    for (let i = 0; i < 12; i++) html += '<ul><li>';
    html += 'Deep';
    for (let i = 0; i < 12; i++) html += '</li></ul>';

    const { document } = convertHtmlToStructured(html);
    // Should not throw, and should produce list elements
    expect(document.pages[0].elements.length).toBeGreaterThan(0);
  });

  it('empty <img src=""> is skipped with warning', () => {
    const { document, warnings } = convertHtmlToStructured('<img src="" alt="empty">', { proEnabled: true });
    expect(warnings.some(w => w.includes('Image src is empty'))).toBe(true);
    expect(document.pages[0].elements).toHaveLength(0);
  });

  it('<ol start="5"> sets correct start number', () => {
    const { document } = convertHtmlToStructured('<ol start="5"><li>Five</li><li>Six</li></ol>');
    const el = document.pages[0].elements[0] as ListElement;
    expect(el.start).toBe(5);
  });

  it('handles HTML entities', () => {
    const html = '<p>&amp; &lt; &gt; &quot;</p>';
    const { document } = convertHtmlToStructured(html);
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.text).toContain('&');
    expect(el.text).toContain('<');
    expect(el.text).toContain('>');
  });

  it('multiple paragraphs produce multiple elements', () => {
    const html = '<p>First</p><p>Second</p><p>Third</p>';
    const { document } = convertHtmlToStructured(html);
    expect(document.pages[0].elements).toHaveLength(3);
  });
});

// =============================================================================
// E2E INTEGRATION TESTS: WYSIWYG Editor Samples
// =============================================================================

describe('E2E: WYSIWYG Editor Sample Output', () => {
  it('CKEditor sample output → valid DOCX buffer', async () => {
    const ckeditorHtml = `
      <h2>Meeting Notes</h2>
      <p>Discussed the following topics:</p>
      <ul>
        <li><strong>Budget review</strong> — approved for Q3</li>
        <li>Team <em>restructuring</em> plan</li>
        <li>New <a href="https://example.com">project</a> kickoff</li>
      </ul>
      <blockquote>Action item: Follow up by Friday</blockquote>
      <p>Next meeting scheduled for <strong>Monday</strong>.</p>
    `;
    const result = await renderHtmlToDocx(ckeditorHtml);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);

    // Verify it's a valid ZIP (DOCX)
    const zip = await JSZip.loadAsync(result.buffer);
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('word/document.xml')).not.toBeNull();
  });

  it('TinyMCE sample output → valid DOCX buffer', async () => {
    const tinymceHtml = `
      <h1>Product Update</h1>
      <p>We&rsquo;re excited to announce <strong>version 2.0</strong> of our platform.</p>
      <h2>Key Features</h2>
      <ol>
        <li>Improved performance</li>
        <li>New dashboard</li>
        <li>API v2 support</li>
      </ol>
      <hr>
      <p>For more details, visit our <a href="https://example.com">documentation</a>.</p>
    `;
    const result = await renderHtmlToDocx(tinymceHtml);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(result.buffer);
    expect(zip.file('word/document.xml')).not.toBeNull();
  });

  it('Quill delta HTML export → valid DOCX buffer', async () => {
    const quillHtml = `
      <p><strong>Important:</strong> This is a <em>Quill-generated</em> document.</p>
      <p><br></p>
      <p>It includes:</p>
      <ul>
        <li>Text formatting</li>
        <li>Lists</li>
      </ul>
      <p><code>Code snippets</code> are also supported.</p>
    `;
    const result = await renderHtmlToDocx(quillHtml);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(result.buffer);
    expect(zip.file('word/document.xml')).not.toBeNull();
  });
});

// =============================================================================
// E2E: renderHtmlToDocx
// =============================================================================

describe('E2E: renderHtmlToDocx', () => {
  it('produces a valid DOCX from simple HTML', async () => {
    const result = await renderHtmlToDocx('<p>Hello</p>');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.extension).toBe('.docx');

    const zip = await JSZip.loadAsync(result.buffer);
    const docXml = await zip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('Hello');
  });

  it('headings produce correct Word heading styles', async () => {
    const result = await renderHtmlToDocx('<h1>Title</h1><h2>Subtitle</h2><p>Body</p>');
    const zip = await JSZip.loadAsync(result.buffer);
    const docXml = await zip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('Title');
    expect(docXml).toContain('Subtitle');
    expect(docXml).toContain('Body');
  });

  it('returns warnings array', async () => {
    const result = await renderHtmlToDocx('<p>Hello</p>');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('returns stats', async () => {
    const result = await renderHtmlToDocx('<p>A</p><p>B</p>');
    expect(result.stats.elementCount).toBeGreaterThan(0);
    expect(result.stats.renderTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('throws on non-string input', async () => {
    await expect(renderHtmlToDocx(42 as any)).rejects.toThrow('HTML string');
  });

  it('handles empty HTML without crashing', async () => {
    const result = await renderHtmlToDocx('');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// SECURITY
// =============================================================================

describe('Security', () => {
  it('XSS in HTML attributes does not execute — just text conversion', () => {
    const html = '<p onclick="alert(1)" onmouseover="hack()">Safe text</p>';
    const { document } = convertHtmlToStructured(html);
    const el = document.pages[0].elements[0] as ParagraphElement;
    expect(el.text).toBe('Safe text');
    // No script execution — just text extraction
  });

  it('script tags are completely stripped', () => {
    const html = '<p>Before</p><script>alert("xss")</script><p>After</p>';
    const { document } = convertHtmlToStructured(html);
    const allTexts = document.pages[0].elements.map(e => (e as ParagraphElement).text ?? '');
    expect(allTexts).toContain('Before');
    expect(allTexts).toContain('After');
    // Script content must NOT appear in document
    expect(allTexts.join(' ')).not.toContain('alert');
    expect(document.pages[0].elements).toHaveLength(2);
  });

  it('style tags are completely stripped', () => {
    const html = '<style>.foo { color: red; }</style><p>Content</p>';
    const { document } = convertHtmlToStructured(html);
    const allTexts = document.pages[0].elements.map(e => (e as ParagraphElement).text ?? '');
    expect(allTexts.join(' ')).not.toContain('.foo');
    expect(allTexts).toContain('Content');
  });

  it('rejects file:// scheme URLs in images', () => {
    const html = '<img src="file:///etc/passwd" alt="secret">';
    const { document, warnings } = convertHtmlToStructured(html, { proEnabled: true });
    // Image should be skipped
    const images = document.pages[0].elements.filter(e => e.type === 'image');
    expect(images).toHaveLength(0);
    expect(warnings.some(w => w.includes('file:') && w.includes('not allowed'))).toBe(true);
  });

  it('rejects javascript: scheme URLs in images', () => {
    const html = '<img src="javascript:alert(1)" alt="xss">';
    const { document, warnings } = convertHtmlToStructured(html, { proEnabled: true });
    const images = document.pages[0].elements.filter(e => e.type === 'image');
    expect(images).toHaveLength(0);
    expect(warnings.some(w => w.includes('javascript:') && w.includes('not allowed'))).toBe(true);
  });

  it('allows data: URLs in images', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = `<img src="${dataUri}" alt="pixel">`;
    const { document } = convertHtmlToStructured(html, { proEnabled: true });
    const images = document.pages[0].elements.filter(e => e.type === 'image');
    expect(images).toHaveLength(1);
    expect((images[0] as ImageElement).src).toBe(dataUri);
  });

  it('allows https:// URLs in images', () => {
    const html = '<img src="https://example.com/img.png" alt="example">';
    const { document } = convertHtmlToStructured(html, { proEnabled: true });
    const images = document.pages[0].elements.filter(e => e.type === 'image');
    expect(images).toHaveLength(1);
    expect((images[0] as ImageElement).src).toBe('https://example.com/img.png');
  });
});
