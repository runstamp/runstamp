import { describe, expect, it } from 'vitest';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun, validateDocx, unzipDocx } from './test-utils.js';

describe('native structural validation', () => {
  it('generates a validator-clean phase 1 document', async () => {
    const doc = createStructuredDocument([
      {
        id: 'heading-1',
        type: 'heading',
        level: 1,
        position: { x: 0, y: 0, width: 300, height: 30 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'h1',
        dataAttributes: {},
        text: 'Phase 1',
        runs: [createTextRun('Phase 1', { fontWeight: 'bold' })],
      },
      {
        id: 'paragraph-1',
        type: 'paragraph',
        position: { x: 0, y: 40, width: 400, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'p',
        dataAttributes: {},
        text: 'A native paragraph.',
        runs: [createTextRun('A native paragraph.')],
      },
      {
        id: 'code-1',
        type: 'code-block',
        position: { x: 0, y: 70, width: 500, height: 80 },
        zIndex: 0,
        opacity: 1,
        style: { ...DEFAULT_STYLE, fontFamily: 'Consolas', backgroundColor: '#F5F5F5' },
        tagName: 'pre',
        dataAttributes: {},
        code: 'const native = true;\nconsole.log(native);',
      },
      {
        id: 'divider-1',
        type: 'divider',
        position: { x: 0, y: 160, width: 500, height: 8 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'hr',
        dataAttributes: {},
        styleType: 'double',
        color: '#336699',
        thickness: 2,
      },
      {
        id: 'page-break-1',
        type: 'page-break',
        position: { x: 0, y: 180, width: 0, height: 0 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'br',
        dataAttributes: {},
      },
      {
        id: 'paragraph-2',
        type: 'paragraph',
        position: { x: 0, y: 200, width: 400, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'p',
        dataAttributes: {},
        text: 'After the break.',
        runs: [createTextRun('After the break.')],
      },
    ] as any);

    const result = await serializeStructuredToNativeOOXML(doc);
    const validation = await validateDocx(result.buffer);
    const entries = await unzipDocx(result.buffer);

    expect(validation.ok, JSON.stringify(validation.errors, null, 2)).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(entries['word/document.xml']).toContain('w:type="page"');
    expect(entries['word/document.xml']).toContain('const native = true;');
    expect(entries['word/document.xml']).toContain('After the break.');
  });
});
