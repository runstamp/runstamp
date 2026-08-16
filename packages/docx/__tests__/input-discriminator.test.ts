/**
 * End-to-end tests for the input-type discriminator added in Phase 1.2.
 *
 * Canonical inputs:
 *   - DocxDocument with `type: 'DocxDocument'`
 *   - StructuredDocument with `__kind: 'StructuredDocument'`
 *
 * Legacy inputs (no discriminator) must still render but emit a
 * DOCX_RELAXED_KIND_INJECTED warning with recovery guidance.
 *
 * Malformed inputs (missing `pages`, primitives, null) must throw with a
 * DOCX_DOC_INVALID error.
 */

import { describe, expect, it } from 'vitest';
import { renderToDocx } from '../src/render';
import type { DocxDocument } from '../src/schema';
import type { StructuredDocument } from '../src/types';

const canonicalDocxDoc: DocxDocument = {
  type: 'DocxDocument',
  pageSize: 'a4',
  orientation: 'portrait',
  pages: [
    {
      elements: [
        { type: 'paragraph', text: 'hello' } as any,
      ],
    },
  ],
};

const canonicalStructuredDoc: StructuredDocument = {
  __kind: 'StructuredDocument',
  metadata: { title: 'Input Discriminator Test' },
  pages: [
    {
      pageNumber: 1,
      dimensions: {
        width: 794,
        height: 1123,
        margins: { top: 96, right: 96, bottom: 96, left: 96 },
      },
      elements: [
        {
          id: 'p1',
          type: 'paragraph',
          position: { x: 0, y: 0, width: 400, height: 24 },
          zIndex: 0,
          opacity: 1,
          text: 'hello structured',
          runs: [{
            text: 'hello structured',
            fontFamily: 'Calibri',
            fontSize: 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '000000',
          }],
          style: {
            backgroundColor: undefined,
            borderTopWidth: 0,
            borderTopColor: '000000',
            borderTopStyle: 'none',
            borderRightWidth: 0,
            borderRightColor: '000000',
            borderRightStyle: 'none',
            borderBottomWidth: 0,
            borderBottomColor: '000000',
            borderBottomStyle: 'none',
            borderLeftWidth: 0,
            borderLeftColor: '000000',
            borderLeftStyle: 'none',
            borderRadius: 0,
            paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
            marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
            fontFamily: 'Calibri',
            fontSize: 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            textDecoration: 'none',
            color: '000000',
            display: 'block',
            visibility: 'visible',
            overflow: 'visible',
            opacity: 1,
          },
          tagName: 'p',
          dataAttributes: {},
        },
      ],
    },
  ],
  styles: {
    paragraphStyles: new Map(),
    characterStyles: new Map(),
    tableStyles: new Map(),
  },
  assets: {
    images: new Map(),
    fonts: new Map(),
    embeddedFiles: new Map(),
  },
  stats: {
    imageCount: 0,
    tableCount: 0,
    chartCount: 0,
    shapeCount: 0,
    listCount: 0,
    containerCount: 0,
    textRunCount: 1,
    totalElements: 1,
  } as any,
  warnings: [],
};

describe('input discriminator', () => {
  it('accepts canonical DocxDocument without warning', async () => {
    const result = await renderToDocx(canonicalDocxDoc);
    const injected = result.warnings.filter(w => w.code === 'DOCX_RELAXED_KIND_INJECTED');
    expect(injected).toHaveLength(0);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('accepts canonical StructuredDocument without warning', async () => {
    const result = await renderToDocx(canonicalStructuredDoc);
    const injected = result.warnings.filter(w => w.code === 'DOCX_RELAXED_KIND_INJECTED');
    expect(injected).toHaveLength(0);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('accepts legacy DocxDocument without discriminator and warns', async () => {
    const legacy = { ...canonicalDocxDoc };
    delete (legacy as { type?: string }).type;
    const result = await renderToDocx(legacy as DocxDocument);
    const injected = result.warnings.filter(w => w.code === 'DOCX_RELAXED_KIND_INJECTED');
    expect(injected).toHaveLength(1);
    expect(injected[0].message).toContain('DocxDocument');
    expect(injected[0].recovery).toContain('type: "DocxDocument"');
  });

  it('accepts legacy StructuredDocument without discriminator and warns', async () => {
    const legacy: Record<string, unknown> = { ...canonicalStructuredDoc };
    delete legacy.__kind;
    const result = await renderToDocx(legacy as StructuredDocument);
    const injected = result.warnings.filter(w => w.code === 'DOCX_RELAXED_KIND_INJECTED');
    expect(injected).toHaveLength(1);
    expect(injected[0].message).toContain('StructuredDocument');
    expect(injected[0].recovery).toContain('__kind: "StructuredDocument"');
  });

  it('throws on null input', async () => {
    await expect(renderToDocx(null as unknown as DocxDocument)).rejects.toThrow(
      /must be a DocxDocument or StructuredDocument/,
    );
  });

  it('throws on primitive input', async () => {
    await expect(renderToDocx(42 as unknown as DocxDocument)).rejects.toThrow(
      /must be a DocxDocument or StructuredDocument/,
    );
  });

  it('throws on object without pages', async () => {
    await expect(renderToDocx({} as DocxDocument)).rejects.toThrow(
      /missing `pages`/,
    );
  });

  it('canonical discriminator wins over structural signals', async () => {
    // An object with BOTH the StructuredDocument marker and some DocxDocument-looking
    // fields should be treated as StructuredDocument because __kind is explicit.
    const ambiguous = { ...canonicalStructuredDoc, pageSize: 'a4' } as unknown as StructuredDocument;
    const result = await renderToDocx(ambiguous);
    const injected = result.warnings.filter(w => w.code === 'DOCX_RELAXED_KIND_INJECTED');
    expect(injected).toHaveLength(0);
  });
});
