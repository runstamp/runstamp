import { describe, expect, it } from 'vitest';
import { OrderedBuilder, serializeXmlFragment, xmlElement } from '../ordered-builder.js';
import { PARAGRAPH_PROPERTY_ORDER, RUN_PROPERTY_ORDER } from '../types.js';

describe('native ordered builder', () => {
  it('escapes raw attribute values at the builder boundary', () => {
    const xml = serializeXmlFragment([
      xmlElement('w:tblCaption', { 'w:val': 'Q&A "quote" <unsafe>' }),
    ]);

    expect(xml).toContain('w:val="Q&amp;A &quot;quote&quot; &lt;unsafe&gt;"');
    expect(xml).not.toContain('Q&A "quote" <unsafe>');
  });

  it('preserves run property ordering', () => {
    const builder = new OrderedBuilder<(typeof RUN_PROPERTY_ORDER)[number]>(RUN_PROPERTY_ORDER);
    builder.set('color', xmlElement('w:color', { 'w:val': 'FF0000' }));
    builder.set('b', xmlElement('w:b'));
    builder.set('i', xmlElement('w:i'));
    builder.set('sz', xmlElement('w:sz', { 'w:val': '24' }));

    const xml = serializeXmlFragment([
      xmlElement('w:rPr', undefined, builder.build()),
    ]);

    expect(xml.indexOf('<w:b')).toBeLessThan(xml.indexOf('<w:color'));
    expect(xml.indexOf('<w:color')).toBeLessThan(xml.indexOf('<w:sz'));
  });

  it('preserves paragraph section properties at the tail', () => {
    const builder = new OrderedBuilder<(typeof PARAGRAPH_PROPERTY_ORDER)[number]>(PARAGRAPH_PROPERTY_ORDER);
    builder.set('pStyle', xmlElement('w:pStyle', { 'w:val': 'Heading1' }));
    builder.set('jc', xmlElement('w:jc', { 'w:val': 'center' }));
    builder.set('sectPr', xmlElement('w:sectPr', undefined, [xmlElement('w:docGrid', { 'w:linePitch': '360' })]));

    const xml = serializeXmlFragment([
      xmlElement('w:pPr', undefined, builder.build()),
    ]);

    expect(xml.indexOf('<w:pStyle')).toBeLessThan(xml.indexOf('<w:jc'));
    expect(xml.indexOf('<w:jc')).toBeLessThan(xml.indexOf('<w:sectPr'));
  });
});
