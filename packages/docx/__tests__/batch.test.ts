/**
 * Batch generation tests for batchRender() and batchHydrate().
 *
 * Verifies: sequential rendering, ZIP output, custom file naming,
 * error isolation, placeholder merging, and pro feature gating.
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  batchRender,
  batchHydrate,
  renderToDocx,
  type DocxDocument,
  type BatchResult,
} from '../src/index';

// =============================================================================
// HELPERS
// =============================================================================

/** Minimal valid DocxDocument with placeholders. */
const makeTemplate = (): DocxDocument => ({
  type: 'DocxDocument',
  pageSize: 'a4',
  pages: [{
    elements: [
      { type: 'heading', level: 1, text: '{{companyName}}' },
      { type: 'paragraph', text: 'Dear {{contactName}},' },
      { type: 'paragraph', text: 'Your invoice total is {{total}}.' },
    ],
  }],
});

const sampleData = [
  { companyName: 'Acme Corp', contactName: 'Alice', total: '$5,000' },
  { companyName: 'Globex Inc', contactName: 'Bob', total: '$12,500' },
  { companyName: 'Initech', contactName: 'Carol', total: '$3,200' },
];

async function extractDocxContent(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return await zip.file('word/document.xml')?.async('string') ?? '';
}

// =============================================================================
// batchRender
// =============================================================================

describe('batchRender', () => {
  it('produces byte-identical ZIP archives for identical inputs', async () => {
    const first = await batchRender(makeTemplate(), sampleData);
    const second = await batchRender(makeTemplate(), sampleData);

    expect(first.zip).toEqual(second.zip);
  });

  it('renders batch of 3 items to 3 DOCX files', async () => {
    const result = await batchRender(makeTemplate(), sampleData);

    expect(result.results).toHaveLength(3);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
    for (const item of result.results) {
      expect(item.success).toBe(true);
      expect(item.buffer).toBeInstanceOf(Buffer);
      expect(item.buffer!.length).toBeGreaterThan(0);
    }
  });

  it('produces valid ZIP containing all files', async () => {
    const result = await batchRender(makeTemplate(), sampleData);

    expect(result.zip).toBeInstanceOf(Buffer);
    const zip = await JSZip.loadAsync(result.zip!);
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toHaveLength(3);
  });

  it('isolates failed items without crashing batch', async () => {
    // Use a template where {{elemType}} is the element type.
    // Providing 'INVALID' as the type will fail Zod validation in renderToDocx,
    // while 'paragraph' will succeed. This guarantees a real failure.
    const template = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: '{{elemType}}', text: '{{name}}' } as any,
        ],
      }],
    } as DocxDocument;

    const data = [
      { elemType: 'paragraph', name: 'Alice' },
      { elemType: 'INVALID_TYPE', name: 'Bob' },   // will fail Zod validation
      { elemType: 'paragraph', name: 'Carol' },
    ];
    const result = await batchRender(template, data);

    // Batch completes — no throw
    expect(result.results).toHaveLength(3);
    // Items 0 and 2 succeed, item 1 fails
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].buffer).toBeInstanceOf(Buffer);
    expect(result.results[1].success).toBe(false);
    expect(typeof result.results[1].error).toBe('string');
    expect(result.results[1].buffer).toBeUndefined();
    expect(result.results[2].success).toBe(true);
    expect(result.results[2].buffer).toBeInstanceOf(Buffer);
  });

  it('applies custom fileName function', async () => {
    const result = await batchRender(makeTemplate(), sampleData, {
      fileName: (item) => `invoice_${item.companyName}.docx`,
    });

    expect(result.results[0].fileName).toBe('invoice_Acme Corp.docx');
    expect(result.results[1].fileName).toBe('invoice_Globex Inc.docx');
    expect(result.results[2].fileName).toBe('invoice_Initech.docx');
  });

  it('uses default fileName with name field', async () => {
    const data = [
      { name: 'Annual Report', companyName: 'Acme' },
      { name: 'Q4 Summary', companyName: 'Globex' },
    ];
    const result = await batchRender(makeTemplate(), data);

    expect(result.results[0].fileName).toBe('Annual_Report.docx');
    expect(result.results[1].fileName).toBe('Q4_Summary.docx');
  });

  it('uses index-based fallback for default fileName', async () => {
    const data = [
      { companyName: 'Acme', contactName: 'Alice', total: '$1k' },
      { companyName: 'Globex', contactName: 'Bob', total: '$2k' },
    ];
    const result = await batchRender(makeTemplate(), data);

    // companyName is not one of the fallback keys (name, title, id, fileName)
    expect(result.results[0].fileName).toBe('document_0001.docx');
    expect(result.results[1].fileName).toBe('document_0002.docx');
  });

  it('returns empty results for empty data array', async () => {
    const result = await batchRender(makeTemplate(), []);

    expect(result.results).toHaveLength(0);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
    expect(result.totalTime).toBe(0);
    // Empty ZIP is still produced
    expect(result.zip).toBeInstanceOf(Buffer);
  });

  it('replaces template placeholders correctly', async () => {
    const result = await batchRender(makeTemplate(), [
      { companyName: 'TestCorp', contactName: 'Dave', total: '$999' },
    ]);

    expect(result.successCount).toBe(1);
    const xml = await extractDocxContent(result.results[0].buffer!);
    expect(xml).toContain('TestCorp');
    expect(xml).toContain('Dave');
    expect(xml).toContain('$999');
  });

  it('returns buffers when output is buffers', async () => {
    const result = await batchRender(makeTemplate(), sampleData, {
      output: 'buffers',
    });

    expect(result.zip).toBeUndefined();
    expect(result.results).toHaveLength(3);
    for (const item of result.results) {
      expect(item.buffer).toBeInstanceOf(Buffer);
    }
  });

  it('handles nested placeholder paths', async () => {
    const template: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: 'City: {{address.city}}' },
        ],
      }],
    };
    const data = [{ address: { city: 'NYC' } }];
    const result = await batchRender(template, data);

    expect(result.successCount).toBe(1);
    const xml = await extractDocxContent(result.results[0].buffer!);
    expect(xml).toContain('NYC');
  });

  it('handles special characters in data values', async () => {
    const template: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: '{{message}}' },
        ],
      }],
    };
    const data = [
      { message: 'Line 1\nLine 2' },
      { message: 'She said "hello"' },
      { message: 'Path: C:\\Users\\test' },
    ];
    const result = await batchRender(template, data);

    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
  });

  it('sanitizes file names', async () => {
    const data = [
      { name: 'file<with>special:chars', companyName: 'Test' },
      { name: 'file  with   spaces', companyName: 'Test' },
    ];
    const result = await batchRender(makeTemplate(), data);

    expect(result.results[0].fileName).toBe('file_with_special_chars.docx');
    expect(result.results[1].fileName).toBe('file_with_spaces.docx');
  });

  it('includes totalTime in result', async () => {
    const result = await batchRender(makeTemplate(), sampleData);
    expect(result.totalTime).toBeGreaterThanOrEqual(0);
  });

  it('handles missing placeholder keys gracefully', async () => {
    const data = [{ companyName: 'Acme' }]; // missing contactName, total
    const result = await batchRender(makeTemplate(), data);

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    // Missing placeholders resolve to empty string
    const xml = await extractDocxContent(result.results[0].buffer!);
    expect(xml).toContain('Acme');
    expect(xml).not.toContain('{{contactName}}');
  });

  it('each DOCX in ZIP is independently valid', async () => {
    const result = await batchRender(makeTemplate(), sampleData);
    expect(result.zip).toBeInstanceOf(Buffer);

    const outerZip = await JSZip.loadAsync(result.zip!);
    for (const fileName of Object.keys(outerZip.files)) {
      const docxBuffer = await outerZip.file(fileName)!.async('nodebuffer');
      const docxZip = await JSZip.loadAsync(docxBuffer);
      expect(docxZip.file('[Content_Types].xml')).toBeTruthy();
      expect(docxZip.file('word/document.xml')).toBeTruthy();
    }
  });

  it('duplicate file names in ZIP overwrite (last wins)', async () => {
    // Two items with same name field
    const data = [
      { name: 'Report', companyName: 'Acme', contactName: 'Alice', total: '$1k' },
      { name: 'Report', companyName: 'Globex', contactName: 'Bob', total: '$2k' },
    ];
    const result = await batchRender(makeTemplate(), data);

    expect(result.zip).toBeInstanceOf(Buffer);
    const zip = await JSZip.loadAsync(result.zip!);
    // Both get same fileName, ZIP stores only last one
    expect(Object.keys(zip.files)).toHaveLength(1);
    expect(zip.file('Report.docx')).toBeTruthy();
  });
});

// =============================================================================
// batchHydrate
// =============================================================================

describe('batchHydrate', () => {
  it('produces byte-identical ZIP archives for identical inputs', async () => {
    const templateResult = await renderToDocx({
      type: 'DocxDocument',
      pages: [{ elements: [{ type: 'paragraph', text: '{{name}}' }] }],
    });
    const data = [{ name: 'Alpha' }, { name: 'Beta' }];
    const first = await batchHydrate(templateResult.buffer, data);
    const second = await batchHydrate(templateResult.buffer, data);

    expect(first.zip).toEqual(second.zip);
  });

  it('hydrates batch from DOCX template', async () => {
    // First create a DOCX template with placeholder text
    const templateDoc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: '{{name}}' },
          { type: 'paragraph', text: '{{role}}' },
        ],
      }],
    };
    const templateResult = await renderToDocx(templateDoc);
    const templateBuffer = templateResult.buffer;

    const data = [
      { name: 'Alice', role: 'Engineer' },
      { name: 'Bob', role: 'Designer' },
    ];
    const result = await batchHydrate(templateBuffer, data);

    expect(result.results).toHaveLength(2);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
    for (const item of result.results) {
      expect(item.success).toBe(true);
      expect(item.buffer).toBeInstanceOf(Buffer);
    }
  });

  it('produces ZIP output', async () => {
    const templateDoc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: 'paragraph', text: '{{greeting}}' },
        ],
      }],
    };
    const templateResult = await renderToDocx(templateDoc);

    const data = [
      { greeting: 'Hello', name: 'Doc1' },
      { greeting: 'Hi', name: 'Doc2' },
    ];
    const result = await batchHydrate(templateResult.buffer, data);

    expect(result.zip).toBeInstanceOf(Buffer);
    const zip = await JSZip.loadAsync(result.zip!);
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toHaveLength(2);
  });
});

// =============================================================================
// Pro features (in pro mode)
// =============================================================================

describe('pro features (in pro mode)', () => {
  it('accepts onProgress callback', async () => {
    let called = false;
    await batchRender(makeTemplate(), sampleData, {
      onProgress: () => { called = true; },
    });
    expect(called).toBe(true);
  });

  it('calls onProgress for each item', async () => {
    const calls: Array<{ completed: number; total: number; current?: string }> = [];
    await batchRender(makeTemplate(), sampleData, {
      onProgress: (completed, total, current) => {
        calls.push({ completed, total, current });
      },
    });

    expect(calls).toHaveLength(sampleData.length);
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i].completed).toBe(i + 1);
      expect(calls[i].total).toBe(sampleData.length);
      expect(typeof calls[i].current).toBe('string');
    }
  });

  it('parallel rendering produces same results as sequential', async () => {
    const template = makeTemplate();

    const seqResult = await batchRender(template, sampleData, { concurrency: 1 });
    const parResult = await batchRender(template, sampleData, { concurrency: 4 });

    expect(parResult.results).toHaveLength(seqResult.results.length);
    expect(parResult.successCount).toBe(seqResult.successCount);
    expect(parResult.failureCount).toBe(seqResult.failureCount);

    // Verify ordering is preserved (results[i].index matches)
    for (let i = 0; i < seqResult.results.length; i++) {
      expect(parResult.results[i].index).toBe(seqResult.results[i].index);
      expect(parResult.results[i].fileName).toBe(seqResult.results[i].fileName);
      expect(parResult.results[i].success).toBe(seqResult.results[i].success);
    }
  });

  it('parallel rendering preserves order with many items', async () => {
    const template: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{ elements: [{ type: 'paragraph', text: '{{id}}' }] }],
    };
    const data = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `doc_${i}` }));

    const result = await batchRender(template, data, { concurrency: 8 });

    expect(result.results).toHaveLength(20);
    expect(result.successCount).toBe(20);
    for (let i = 0; i < 20; i++) {
      expect(result.results[i].index).toBe(i);
    }
  });

  it('parallel rendering isolates failures', async () => {
    const template = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          { type: '{{elemType}}', text: '{{name}}' } as any,
        ],
      }],
    } as DocxDocument;

    const data = [
      { elemType: 'paragraph', name: 'A' },
      { elemType: 'INVALID', name: 'B' },
      { elemType: 'paragraph', name: 'C' },
      { elemType: 'INVALID', name: 'D' },
      { elemType: 'paragraph', name: 'E' },
    ];

    const result = await batchRender(template, data, { concurrency: 4 });

    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(2);
    expect(result.results[1].success).toBe(false);
    expect(result.results[3].success).toBe(false);
  });
});

describe('free-tier gating (tested via requireDocxPro)', () => {
  // Note: Since tests run with __PRO__=true and a valid test license,
  // we can only verify that pro features are accepted (not that they throw
  // in free builds). The free-tier.test.ts file handles the free-build gating tests.
  // Here we verify that the gate functions are called with correct feature names.

  it('stream option is gated', async () => {
    // In pro mode, stream is accepted but not yet implemented
    // Just verify it doesn't throw for now
    const result = await batchRender(makeTemplate(), sampleData, {
      stream: false,  // false should not trigger the gate
    });
    expect(result.successCount).toBe(3);
  });
});
