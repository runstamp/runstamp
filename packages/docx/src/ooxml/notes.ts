import type { NativeNote } from './context.js';
import { serializeXml, xmlElement, xmlText } from './ordered-builder.js';
import { escapeXml } from './xml-escape.js';
import type { XmlElement } from './types.js';

function separatorNote(tag: 'w:footnote' | 'w:endnote', childTag: 'w:separator' | 'w:continuationSeparator', id: '-1' | '0'): XmlElement {
  return xmlElement(tag, { 'w:type': id === '-1' ? 'separator' : 'continuationSeparator', 'w:id': id }, [
    xmlElement('w:p', undefined, [
      xmlElement('w:pPr', undefined, [
        xmlElement('w:spacing', { 'w:after': '0', 'w:line': '240', 'w:lineRule': 'auto' }),
      ]),
      xmlElement('w:r', undefined, [
        xmlElement(childTag),
      ]),
    ]),
  ]);
}

function noteEntry(tag: 'w:footnote' | 'w:endnote', refTag: 'w:footnoteRef' | 'w:endnoteRef', styleId: string, refStyleId: string, note: NativeNote): XmlElement {
  return xmlElement(tag, { 'w:id': String(note.id) }, [
    xmlElement('w:p', undefined, [
      xmlElement('w:pPr', undefined, [
        xmlElement('w:pStyle', { 'w:val': styleId }),
      ]),
      xmlElement('w:r', undefined, [
        xmlElement('w:rPr', undefined, [
          xmlElement('w:rStyle', { 'w:val': refStyleId }),
        ]),
        xmlElement(refTag),
      ]),
      xmlElement('w:r', undefined, [
        xmlElement('w:t', { 'xml:space': 'preserve' }, [
          xmlText(escapeXml(` ${note.text}`)),
        ]),
      ]),
    ]),
  ]);
}

export function buildFootnoteReferenceRun(id: number): XmlElement {
  return xmlElement('w:r', undefined, [
    xmlElement('w:rPr', undefined, [
      xmlElement('w:rStyle', { 'w:val': 'FootnoteReference' }),
    ]),
    xmlElement('w:footnoteReference', { 'w:id': String(id) }),
  ]);
}

export function buildEndnoteReferenceRun(id: number): XmlElement {
  return xmlElement('w:r', undefined, [
    xmlElement('w:rPr', undefined, [
      xmlElement('w:rStyle', { 'w:val': 'EndnoteReference' }),
    ]),
    xmlElement('w:endnoteReference', { 'w:id': String(id) }),
  ]);
}

export function buildFootnotesXml(notes: NativeNote[]): string {
  return serializeXml(
    xmlElement('w:footnotes', {
      'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    }, [
      separatorNote('w:footnote', 'w:separator', '-1'),
      separatorNote('w:footnote', 'w:continuationSeparator', '0'),
      ...notes.map((note) => noteEntry('w:footnote', 'w:footnoteRef', 'FootnoteText', 'FootnoteReference', note)),
    ]),
  );
}

export function buildEndnotesXml(notes: NativeNote[]): string {
  return serializeXml(
    xmlElement('w:endnotes', {
      'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    }, [
      separatorNote('w:endnote', 'w:separator', '-1'),
      separatorNote('w:endnote', 'w:continuationSeparator', '0'),
      ...notes.map((note) => noteEntry('w:endnote', 'w:endnoteRef', 'EndnoteText', 'EndnoteReference', note)),
    ]),
  );
}
