import { describe, expect, it } from 'vitest';
import { buildDocumentXml } from '../document.js';
import { createDeterministicContext } from '../deterministic.js';
import { ContentTypesRegistry } from '../content-types.js';
import { RelationshipManager } from '../relationships.js';
import { resolveResourceLimits } from '../resource-limits.js';
import { createSerializationContext } from '../context.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun } from './test-utils.js';

describe('native paragraph and section placement', () => {
  it('attaches non-final sectPr to the last paragraph and keeps final sectPr in body', async () => {
    const firstPageElements = [
      {
        id: 'p1',
        type: 'paragraph' as const,
        position: { x: 0, y: 0, width: 100, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'p',
        dataAttributes: {},
        text: 'First page',
        runs: [createTextRun('First page')],
      },
    ];

    const secondPageElements = [
      {
        id: 'p2',
        type: 'paragraph' as const,
        position: { x: 0, y: 0, width: 100, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'p',
        dataAttributes: {},
        text: 'Second page',
        runs: [createTextRun('Second page')],
      },
    ];

    const doc = createStructuredDocument(firstPageElements as any, {
      pages: [
        {
          pageNumber: 1,
          dimensions: { width: 794, height: 1123, margins: { top: 96, right: 96, bottom: 96, left: 96 } },
          elements: firstPageElements as any,
        },
        {
          pageNumber: 2,
          dimensions: { width: 1123, height: 794, margins: { top: 96, right: 96, bottom: 96, left: 96 } },
          elements: secondPageElements as any,
          sectionBreak: { type: 'nextPage' },
        },
      ],
    });

    const deterministic = createDeterministicContext();
    const xml = await buildDocumentXml(doc, createSerializationContext({
      document: doc,
      options: {},
      deterministic,
      limits: resolveResourceLimits(),
      contentTypes: new ContentTypesRegistry(),
      documentRelationships: new RelationshipManager(),
    }));
    const paragraphSectPr = xml.match(/<w:pPr>.*?<w:sectPr[\s\S]*?<\/w:sectPr>.*?<\/w:pPr>/);
    const finalSectPr = xml.match(/<w:body>[\s\S]*<w:sectPr[\s\S]*<\/w:sectPr><\/w:body>/);

    // Structural: non-final sectPr lives in the last paragraph's pPr; final
    // sectPr lives at the body level.
    expect(paragraphSectPr?.[0]).toBeDefined();
    // OOXML: <w:type> describes how the section it terminates *begins*. So
    // page 2's `sectionBreak: nextPage` lands on the FINAL (page-2) sectPr,
    // not on page 1's.
    expect(paragraphSectPr?.[0]).not.toContain('w:type w:val=');
    expect(finalSectPr?.[0]).toContain('w:type w:val="nextPage"');
    expect(finalSectPr?.[0]).toContain('w:docGrid w:linePitch="360"');
    expect(finalSectPr?.[0]).toContain('w:orient="landscape"');
  });
});
