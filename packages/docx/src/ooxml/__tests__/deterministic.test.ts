import { describe, expect, it } from 'vitest';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun } from './test-utils.js';

describe('native determinism', () => {
  it('returns identical bytes for identical input', async () => {
    const doc = createStructuredDocument([
      {
        id: 'paragraph',
        type: 'paragraph',
        position: { x: 0, y: 0, width: 400, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'p',
        dataAttributes: {},
        text: 'Deterministic',
        runs: [createTextRun('Deterministic')],
      },
    ] as any);

    const first = await serializeStructuredToNativeOOXML(doc);
    const second = await serializeStructuredToNativeOOXML(doc);

    expect(first.buffer.equals(second.buffer)).toBe(true);
  });
});
