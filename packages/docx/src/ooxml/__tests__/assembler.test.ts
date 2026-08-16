import { describe, expect, it } from 'vitest';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun, unzipDocx } from './test-utils.js';

describe('native assembler', () => {
  it('assembles a complete package with the required parts', async () => {
    const doc = createStructuredDocument([
      {
        id: 'h1',
        type: 'heading',
        level: 1,
        position: { x: 0, y: 0, width: 400, height: 24 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'h1',
        dataAttributes: {},
        text: 'Hello native',
        runs: [createTextRun('Hello native', { fontWeight: 'bold' })],
      },
    ] as any);

    const result = await serializeStructuredToNativeOOXML(doc);
    const entries = await unzipDocx(result.buffer);

    expect(Object.keys(entries).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/app.xml',
      'docProps/core.xml',
      'word/document.xml',
      'word/_rels/document.xml.rels',
      'word/fontTable.xml',
      'word/settings.xml',
      'word/styles.xml',
      'word/theme/theme1.xml',
      'word/webSettings.xml',
    ].sort());

    expect(entries['word/_rels/document.xml.rels']).toContain('theme/theme1.xml');
    expect(entries['[Content_Types].xml']).toContain('/word/document.xml');
  });
});
