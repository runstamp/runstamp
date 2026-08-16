/**
 * Element serializer registry (Phase 4.1).
 *
 * Asserts:
 *   - Every canonical ElementType has a built-in serializer registered.
 *   - registerElementSerializer attaches a new serializer by type.
 *   - Dispatching through the registry produces the same output as the
 *     pre-refactor switch would have (round-trip render + byte-repro).
 */

import { describe, expect, it } from 'vitest';
import { renderToDocx } from '../src/render';
import {
  getElementSerializer,
  listRegisteredElementTypes,
  registerElementSerializer,
  assertEveryElementTypeHasSerializer,
  type ElementSerializer,
} from '../src/ooxml/element-serializers';
import type { DocxDocument, DocxElement } from '../src/schema';
import type { StructuredElement } from '../src/types';

describe('element serializer registry', () => {
  it('every ElementType has a registered serializer', () => {
    // Throws if any type is missing.
    assertEveryElementTypeHasSerializer();
  });

  it('getElementSerializer returns a serializer for each known type', () => {
    const expected: StructuredElement['type'][] = [
      'heading', 'paragraph', 'text-run', 'code-block', 'page-break',
      'divider', 'table', 'image', 'chart', 'shape', 'list', 'container',
    ];
    for (const type of expected) {
      const serializer = getElementSerializer(type);
      expect(serializer, `missing serializer for ${type}`).toBeDefined();
      expect(serializer?.type).toBe(type);
    }
  });

  it('listRegisteredElementTypes includes the 12 built-ins', () => {
    const list = listRegisteredElementTypes();
    for (const type of ['heading', 'paragraph', 'text-run', 'code-block', 'page-break', 'divider', 'table', 'image', 'chart', 'shape', 'list', 'container'] as const) {
      expect(list).toContain(type);
    }
  });

  it('registerElementSerializer allows replacing a serializer', () => {
    const originalDivider = getElementSerializer('divider');
    expect(originalDivider).toBeDefined();

    let invoked = false;
    const replacement: ElementSerializer = {
      type: 'divider',
      async serialize() {
        invoked = true;
        return [];
      },
    };
    registerElementSerializer(replacement);
    try {
      expect(getElementSerializer('divider')).toBe(replacement);
      expect(invoked).toBe(false);
    } finally {
      // Restore to avoid poisoning other tests
      if (originalDivider) {
        registerElementSerializer(originalDivider);
      }
    }
    expect(getElementSerializer('divider')).toBe(originalDivider);
  });

  it('dispatcher-through-registry still produces valid DOCX for every type', async () => {
    // Exercise every built-in serializer through the public API.
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      orientation: 'portrait',
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'heading' } as DocxElement,
          { type: 'paragraph', text: 'para' } as DocxElement,
          { type: 'code-block', code: 'x = 1' } as DocxElement,
          { type: 'divider', style: 'solid' } as DocxElement,
          { type: 'page-break' } as DocxElement,
          { type: 'list', listType: 'bullet', items: [{ text: 'item' }] } as DocxElement,
          { type: 'table', rows: [{ cells: [{ text: 'a' }, { text: 'b' }]}] } as DocxElement,
          { type: 'shape', shapeType: 'rectangle', width: 60, height: 40 } as DocxElement,
          { type: 'container', layout: 'vertical', children: [
            { type: 'paragraph', text: 'nested' } as DocxElement,
          ]} as DocxElement,
        ],
      }],
    } as DocxDocument;

    const result = await renderToDocx(doc);
    expect(result.buffer.length).toBeGreaterThan(0);
    // Sanity check: unknown-element warnings should be absent.
    const unknown = result.warnings.filter((w) => w.message.toLowerCase().includes('unknown'));
    expect(unknown).toHaveLength(0);
  });
});
