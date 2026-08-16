import { describe, expect, it } from 'vitest';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun, unzipDocx } from './test-utils.js';

describe('native rtl basics', () => {
  it('marks rtl paragraphs and runs for arabic and hebrew content', async () => {
    const doc = createStructuredDocument([
      {
        id: 'rtl-1',
        type: 'paragraph',
        position: { x: 0, y: 0, width: 400, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: { ...DEFAULT_STYLE, textAlign: 'right' },
        tagName: 'p',
        dataAttributes: {},
        text: 'مرحبا بالعالم',
        runs: [createTextRun('مرحبا بالعالم', { fontFamily: 'Arial' })],
      },
      {
        id: 'rtl-2',
        type: 'paragraph',
        position: { x: 0, y: 30, width: 400, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: { ...DEFAULT_STYLE, textAlign: 'right' },
        tagName: 'p',
        dataAttributes: {},
        text: 'שלום world',
        runs: [createTextRun('שלום world', { fontFamily: 'Arial' })],
      },
    ] as any);

    const result = await serializeStructuredToNativeOOXML(doc);
    const entries = await unzipDocx(result.buffer);
    const xml = entries['word/document.xml'];

    expect(xml).toContain('<w:bidi/>');
    expect(xml).toContain('<w:rtl/>');
  });
});
