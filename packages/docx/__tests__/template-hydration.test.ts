/**
 * Tests for DOCX Template Hydration (Patch System)
 *
 * Tests the ability to:
 * 1. Scan .docx templates for {{placeholder}} patterns
 * 2. Replace placeholders with text, tables, and rich text
 * 3. Handle Word's split-run behavior
 * 4. Preserve template styling through round-trip
 */

import { existsSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  hydrateTemplate,
  scanTemplate,
} from '../src/hydration/hydrator';
import {
  scanForPlaceholders,
  normalizeRunSplits,
  replacePlaceholderInXml,
} from '../src/hydration/placeholder-scanner';
import {
  valueToOoxml,
  isComplexValue,
  escapeXml,
  createRelationshipManager,
  type HydrationTable,
  type HydrationRichText,
  type HydrationImage,
} from '../src/hydration/ooxml-injector';
import { DOCXErrorCode } from '../src/errors';
import { hydrateDocxToPdf } from '../src/render.js';


// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a minimal valid DOCX buffer with placeholder text in document.xml.
 */
async function createTemplateDocx(xmlContent: string): Promise<Buffer> {
  const zip = new JSZip();

  // Minimal [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`);

  // Minimal _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);

  // Minimal word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    </Relationships>`);

  // document.xml with placeholders
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
      <w:body>${xmlContent}</w:body>
    </w:document>`);

  return await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
}

/**
 * Create document.xml paragraph with text.
 */
function p(text: string): string {
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
}

/**
 * Create document.xml paragraph with text split across multiple runs.
 * Simulates Word's tendency to split runs.
 */
function pSplit(parts: string[]): string {
  const runs = parts.map(t => `<w:r><w:t>${t}</w:t></w:r>`).join('');
  return `<w:p>${runs}</w:p>`;
}

/**
 * Create document.xml paragraph with formatted text.
 */
function pFormatted(text: string, rPr: string): string {
  return `<w:p><w:r><w:rPr>${rPr}</w:rPr><w:t>${text}</w:t></w:r></w:p>`;
}

/**
 * Extract document.xml content from a DOCX buffer.
 */
async function extractDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('No document.xml found');
  return await file.async('string');
}

// =============================================================================
// Placeholder Scanner Tests
// =============================================================================

describe('Placeholder Scanner', () => {
  describe('scanForPlaceholders', () => {
    it('should find simple placeholders', () => {
      const xml = p('Hello {{name}}, welcome!');
      const matches = scanForPlaceholders(xml, 'word/document.xml');

      expect(matches).toHaveLength(1);
      expect(matches[0].key).toBe('name');
      expect(matches[0].fullMatch).toBe('{{name}}');
      expect(matches[0].filePath).toBe('word/document.xml');
    });

    it('should find multiple placeholders', () => {
      const xml = `${p('Dear {{first_name}} {{last_name}},')}${p('Your order {{order_id}} is ready.')}`;
      const matches = scanForPlaceholders(xml, 'word/document.xml');

      expect(matches).toHaveLength(3);
      expect(matches.map(m => m.key)).toEqual(['first_name', 'last_name', 'order_id']);
    });

    it('should find dotted placeholders', () => {
      const xml = p('Client: {{client.name}}');
      const matches = scanForPlaceholders(xml, 'word/document.xml');

      expect(matches).toHaveLength(1);
      expect(matches[0].key).toBe('client.name');
    });

    it('should find no placeholders in plain text', () => {
      const xml = p('This is just regular text.');
      const matches = scanForPlaceholders(xml, 'word/document.xml');

      expect(matches).toHaveLength(0);
    });

    it('should ignore malformed placeholders', () => {
      const xml = p('Not valid: {name} or {{123}} or {{ name }}');
      const matches = scanForPlaceholders(xml, 'word/document.xml');

      // {{ name }} has spaces so won't match, {name} is single brace, {{123}} starts with digit
      expect(matches).toHaveLength(0);
    });
  });

  describe('normalizeRunSplits', () => {
    it('should merge adjacent runs with no formatting', () => {
      const xml = '<w:r><w:t>{{</w:t></w:r><w:r><w:t>name}}</w:t></w:r>';
      const normalized = normalizeRunSplits(xml);

      expect(normalized).toContain('{{name}}');
    });

    it('should NOT merge runs with different formatting outside a placeholder span', () => {
      // Two runs with different rPr whose combined text does NOT form a
      // complete placeholder — the adjacent-merge pass requires matching
      // rPr, and the placeholder-span pass only fires when `{{...}}` is
      // fully formed in the merged text.
      const xml = '<w:r><w:rPr><w:b/></w:rPr><w:t>hello </w:t></w:r><w:r><w:t>world</w:t></w:r>';
      const normalized = normalizeRunSplits(xml);

      expect(normalized).toContain('<w:t>hello </w:t>');
      expect(normalized).toContain('<w:t>world</w:t>');
    });

    it('should merge runs with different formatting when they form a complete placeholder', () => {
      // Phase 3.1: the placeholder-span pass collapses spans even across
      // rPr differences, because the inner formatting will be discarded
      // when the placeholder is replaced anyway.
      const xml = '<w:r><w:rPr><w:b/></w:rPr><w:t>{{</w:t></w:r><w:r><w:t>name}}</w:t></w:r>';
      const normalized = normalizeRunSplits(xml);

      expect(normalized).toContain('{{name}}');
    });

    it('should merge runs with identical formatting', () => {
      const xml = '<w:r><w:rPr><w:b/></w:rPr><w:t>{{</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>name}}</w:t></w:r>';
      const normalized = normalizeRunSplits(xml);

      expect(normalized).toContain('{{name}}');
    });
  });

  describe('replacePlaceholderInXml', () => {
    it('should replace simple text placeholder', () => {
      const xml = p('Hello {{name}}!');
      const result = replacePlaceholderInXml(xml, 'name', 'World', false);

      expect(result).toContain('Hello World!');
      expect(result).not.toContain('{{name}}');
    });

    it('should replace multiple occurrences', () => {
      const xml = `${p('{{name}} says hi.')}${p('Best regards, {{name}}')}`;
      const result = replacePlaceholderInXml(xml, 'name', 'Alice', false);

      expect(result).toContain('Alice says hi.');
      expect(result).toContain('Best regards, Alice');
      expect(result).not.toContain('{{name}}');
    });

    it('should replace paragraph for complex replacements', () => {
      const xml = `${p('Before')}${p('{{pricing_table}}')}${p('After')}`;
      const tableXml = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table content</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';

      const result = replacePlaceholderInXml(xml, 'pricing_table', tableXml, true);

      expect(result).toContain('Table content');
      expect(result).not.toContain('{{pricing_table}}');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });
  });
});

// =============================================================================
// OOXML Injector Tests
// =============================================================================

describe('OOXML Injector', () => {
  describe('isComplexValue', () => {
    it('should return false for strings', () => {
      expect(isComplexValue('hello')).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isComplexValue(42)).toBe(false);
    });

    it('should return true for table objects', () => {
      expect(isComplexValue({ type: 'table', headers: [], rows: [] })).toBe(true);
    });

    it('should return true for image objects', () => {
      expect(isComplexValue({ type: 'image', src: 'data:image/png;base64,abc' })).toBe(true);
    });

    it('should return true for richtext objects', () => {
      expect(isComplexValue({ type: 'richtext', paragraphs: [] })).toBe(true);
    });
  });

  describe('valueToOoxml', () => {
    it('should escape XML in string values', () => {
      const result = valueToOoxml('Tom & Jerry <partners>');
      expect(result).toBe('Tom &amp; Jerry &lt;partners&gt;');
    });

    it('should convert numbers to strings', () => {
      expect(valueToOoxml(42)).toBe('42');
    });

    it('should convert booleans to strings', () => {
      expect(valueToOoxml(true)).toBe('true');
    });

    it('should generate table OOXML', () => {
      const table: HydrationTable = {
        type: 'table',
        headers: ['Name', 'Price'],
        rows: [['Widget', '$10'], ['Gadget', '$20']],
      };

      const result = valueToOoxml(table);

      expect(result).toContain('<w:tbl>');
      expect(result).toContain('<w:tblHeader/>');
      expect(result).toContain('Name');
      expect(result).toContain('Price');
      expect(result).toContain('Widget');
      expect(result).toContain('$10');
    });

    it('should generate rich text OOXML', () => {
      const richText: HydrationRichText = {
        type: 'richtext',
        paragraphs: [
          { text: 'Bold text', bold: true },
          { text: 'Centered', alignment: 'center' },
        ],
      };

      const result = valueToOoxml(richText);

      expect(result).toContain('<w:b/>');
      expect(result).toContain('Bold text');
      expect(result).toContain('<w:jc w:val="center"/>');
      expect(result).toContain('Centered');
    });
  });

  describe('escapeXml', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('A & B')).toBe('A &amp; B');
    });

    it('should escape angle brackets', () => {
      expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
    });

    it('should escape quotes', () => {
      expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });
  });
});

// =============================================================================
// Full Hydration Integration Tests
// =============================================================================

describe('Template Hydration Integration', () => {
  it('should hydrate a simple text placeholder', async () => {
    const template = await createTemplateDocx(p('Dear {{client_name}},'));
    const result = await hydrateTemplate(template, {
      client_name: 'Acme Corp',
    });

    expect(result.buffer).toBeDefined();
    expect(result.replaced).toContain('client_name');
    expect(result.unfilled).toHaveLength(0);
    expect(result.stats.replacedCount).toBe(1);

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('Acme Corp');
    expect(xml).not.toContain('{{client_name}}');
  });

  it('should hydrate multiple placeholders', async () => {
    const template = await createTemplateDocx(
      `${p('Name: {{first_name}} {{last_name}}')}${p('Company: {{company}}')}`
    );

    const result = await hydrateTemplate(template, {
      first_name: 'Jane',
      last_name: 'Doe',
      company: 'Acme',
    });

    expect(result.replaced).toEqual(expect.arrayContaining(['first_name', 'last_name', 'company']));
    expect(result.stats.replacedCount).toBe(3);

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('Jane');
    expect(xml).toContain('Doe');
    expect(xml).toContain('Acme');
  });

  it('should report unfilled placeholders', async () => {
    const template = await createTemplateDocx(
      `${p('{{known}}')}${p('{{unknown}}')}`
    );

    const result = await hydrateTemplate(template, {
      known: 'filled',
    });

    expect(result.replaced).toContain('known');
    expect(result.unfilled).toContain('unknown');
    expect(result.stats.unfilledCount).toBe(1);

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('filled');
    expect(xml).toContain('{{unknown}}'); // Left as-is
  });

  it('should throw in strict mode for missing data', async () => {
    const template = await createTemplateDocx(p('{{required_field}}'));

    await expect(
      hydrateTemplate(template, {}, { strictMode: true })
    ).rejects.toThrow('Missing data for placeholder: {{required_field}}');
    await expect(
      hydrateTemplate(template, {}, { strictMode: true })
    ).rejects.toMatchObject({ name: 'DOCXError', code: DOCXErrorCode.DOC_INVALID });
  });

  it('should remove unfilled placeholders when removeUnfilled is true', async () => {
    const template = await createTemplateDocx(p('Hello {{name}}!'));

    const result = await hydrateTemplate(template, {}, { removeUnfilled: true });

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).not.toContain('{{name}}');
    expect(xml).toContain('Hello !');
  });

  it('should handle table injection', async () => {
    const template = await createTemplateDocx(
      `${p('Pricing:')}${p('{{pricing_table}}')}${p('Terms apply.')}`
    );

    const result = await hydrateTemplate(template, {
      pricing_table: {
        type: 'table',
        headers: ['Item', 'Price'],
        rows: [['Widget', '$10'], ['Gadget', '$20']],
      },
    });

    expect(result.replaced).toContain('pricing_table');

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('Widget');
    expect(xml).toContain('$10');
    expect(xml).toContain('Terms apply.');
  });

  it('should handle rich text injection', async () => {
    const template = await createTemplateDocx(p('{{summary}}'));

    const result = await hydrateTemplate(template, {
      summary: {
        type: 'richtext',
        paragraphs: [
          { text: 'Executive Summary', bold: true, fontSize: 16 },
          { text: 'This is the content.', alignment: 'left' },
        ],
      },
    });

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('Executive Summary');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('This is the content.');
  });

  it('should preserve non-placeholder content', async () => {
    const template = await createTemplateDocx(
      `${p('Header text')}${p('{{name}}')}${p('Footer text')}`
    );

    const result = await hydrateTemplate(template, { name: 'Test' });

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('Header text');
    expect(xml).toContain('Test');
    expect(xml).toContain('Footer text');
  });

  it('should handle special characters in replacement values', async () => {
    const template = await createTemplateDocx(p('{{note}}'));

    const result = await hydrateTemplate(template, {
      note: 'Price < $100 & "free" shipping',
    });

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&quot;');
  });

  it('should handle numeric values', async () => {
    const template = await createTemplateDocx(p('Total: {{amount}}'));

    const result = await hydrateTemplate(template, {
      amount: 42.50,
    });

    const xml = await extractDocumentXml(result.buffer);
    expect(xml).toContain('42.5');
  });

  it('should produce valid DOCX output (PK signature)', async () => {
    const template = await createTemplateDocx(p('{{name}}'));

    const result = await hydrateTemplate(template, { name: 'Test' });

    // Valid ZIP/DOCX starts with PK
    expect(result.buffer[0]).toBe(0x50);
    expect(result.buffer[1]).toBe(0x4b);
  });

  it('should report processing statistics', async () => {
    const template = await createTemplateDocx(
      `${p('{{a}}')}${p('{{b}}')}${p('{{c}}')}`
    );

    const result = await hydrateTemplate(template, {
      a: 'Alpha',
      b: 'Beta',
    });

    expect(result.stats.totalPlaceholders).toBe(3);
    expect(result.stats.replacedCount).toBe(2);
    expect(result.stats.unfilledCount).toBe(1);
    expect(result.stats.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.stats.fileSizeBytes).toBeGreaterThan(0);
  });

  it('emits structured replacement telemetry and deterministic hydrated bytes', async () => {
    const template = await createTemplateDocx(p('Hello {{name}}!'));

    const first = await hydrateTemplate(template, { name: 'Ada' });
    const second = await hydrateTemplate(template, { name: 'Ada' });

    expect(first.buffer.equals(second.buffer)).toBe(true);
    expect(first.telemetry.replaced).toEqual(expect.arrayContaining([
      expect.objectContaining({
        placeholder: 'name',
        part: 'word/document.xml',
        replacementKind: 'text',
      }),
    ]));
  });
});

// =============================================================================
// scanTemplate Tests
// =============================================================================

describe('scanTemplate', () => {
  it('should list all unique placeholders', async () => {
    const template = await createTemplateDocx(
      `${p('{{name}}')}${p('{{email}}')}${p('{{name}}')}`
    );

    const result = await scanTemplate(template);

    expect(result.uniqueKeys).toEqual(expect.arrayContaining(['name', 'email']));
    expect(result.uniqueKeys).toHaveLength(2);
    // Total matches includes duplicates
    expect(result.placeholders).toHaveLength(3);
  });

  it('should find placeholders in headers', async () => {
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
      </Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`);

    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      </Relationships>`);

    zip.file('word/document.xml', `<?xml version="1.0"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>${p('Body {{body_field}}')}</w:body>
      </w:document>`);

    zip.file('word/header1.xml', `<?xml version="1.0"?>
      <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        ${p('{{header_field}}')}
      </w:hdr>`);

    const template = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
    const result = await scanTemplate(template);

    expect(result.uniqueKeys).toEqual(expect.arrayContaining(['body_field', 'header_field']));
    expect(result.placeholders.find(p => p.filePath === 'word/header1.xml')).toBeDefined();
  });
});

// =============================================================================
// Image Injection Tests
// =============================================================================

describe('Image Injection with RelationshipManager', () => {
  it('should generate image OOXML with real relationship ID when manager is provided', () => {
    const relManager = createRelationshipManager(100);
    const image: HydrationImage = {
      type: 'image',
      src: 'data:image/png;base64,iVBORw0KGgo=',
      width: 200,
      height: 100,
      alt: 'Test Logo',
    };

    const result = valueToOoxml(image, relManager);

    // Should have a real rId, not placeholder
    expect(result).toContain('r:embed="rId100"');
    expect(result).not.toContain('rId_placeholder');
    expect(result).toContain('xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"');

    // Relationship should be tracked
    const rels = relManager.getRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0].id).toBe('rId100');
    expect(rels[0].target).toContain('data:image/png;base64,');
  });

  it('should generate placeholder rId when no manager is provided', () => {
    const image: HydrationImage = {
      type: 'image',
      src: 'data:image/png;base64,iVBORw0KGgo=',
      width: 200,
      height: 100,
    };

    const result = valueToOoxml(image);

    expect(result).toContain('rId_placeholder');
  });

  it('should hydrate template with image and write media to zip', async () => {
    // Create a tiny 1x1 white PNG as base64
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    const template = await createTemplateDocx(p('Logo: {{logo}}'));
    const result = await hydrateTemplate(template, {
      logo: {
        type: 'image',
        src: `data:image/png;base64,${tinyPng}`,
        width: 100,
        height: 50,
        alt: 'Company Logo',
      } as any,
    });

    expect(result.replaced).toContain('logo');
    expect(result.buffer).toBeDefined();

    // Verify the output zip contains the image in word/media/
    const outputZip = await JSZip.loadAsync(result.buffer);
    const mediaFiles = Object.keys(outputZip.files).filter(f => f.startsWith('word/media/'));
    expect(mediaFiles.length).toBeGreaterThan(0);

    // Verify the .rels file has the image relationship
    const relsFile = outputZip.file('word/_rels/document.xml.rels');
    expect(relsFile).toBeDefined();
    const relsContent = await relsFile!.async('string');
    expect(relsContent).toContain('relationships/image');

    // Verify [Content_Types].xml has PNG entry
    const ctFile = outputZip.file('[Content_Types].xml');
    const ctContent = await ctFile!.async('string');
    expect(ctContent).toContain('Extension="png"');
  });

  it('should handle multiple images in same template', async () => {
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    const template = await createTemplateDocx(
      `${p('{{logo1}}')}${p('{{logo2}}')}`
    );

    const result = await hydrateTemplate(template, {
      logo1: {
        type: 'image',
        src: `data:image/png;base64,${tinyPng}`,
        width: 100,
        height: 50,
      } as any,
      logo2: {
        type: 'image',
        src: `data:image/png;base64,${tinyPng}`,
        width: 200,
        height: 100,
      } as any,
    });

    expect(result.replaced).toContain('logo1');
    expect(result.replaced).toContain('logo2');

    // Verify 2+ image files in media (directory entry may also be present)
    const outputZip = await JSZip.loadAsync(result.buffer);
    const mediaFiles = Object.keys(outputZip.files).filter(
      f => f.startsWith('word/media/') && f.endsWith('.png')
    );
    expect(mediaFiles.length).toBe(2);
  });

  it('rejects hydration images over the configured per-image byte limit', async () => {
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const template = await createTemplateDocx(p('{{logo}}'));

    await expect(hydrateTemplate(template, {
      logo: {
        type: 'image',
        src: `data:image/png;base64,${tinyPng}`,
      } as any,
    }, {
      imageLimits: { maxImageBytes: 1 },
    })).rejects.toMatchObject({
      name: 'DOCXError',
      code: DOCXErrorCode.IMAGE_SIZE_EXCEEDED,
    });
  });
});

describe('Template to PDF Integration', () => {
  it('hydrates a DOCX template and converts it to PDF through the public release path', async () => {
    const template = await createTemplateDocx([
      p('Invoice {{invoiceNumber}}'),
      p('Customer {{customer.name}}'),
      p('Total {{amount}}'),
    ].join(''));

    const result = await hydrateDocxToPdf(template, {
      amount: '$42.00',
      customer: { name: 'Ada Lovelace' },
      invoiceNumber: 'INV-42',
    }, {
      tagged: true,
    });

    const pdf = await PDFDocument.load(result.buffer);

    expect(result.mimeType).toBe('application/pdf');
    expect(result.extension).toBe('.pdf');
    expect(result.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  }, 30000);
});
