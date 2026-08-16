import type { DeterministicContext } from './deterministic.js';
import { xmlElement, xmlText } from './ordered-builder.js';
import { escapeXml } from './xml-escape.js';
import type { XmlElement } from './types.js';

export type FieldKind = 'PAGE' | 'NUMPAGES' | 'DATE' | 'TIME' | 'FILENAME' | 'PAGEREF';

export interface NativeFieldInput {
  kind: FieldKind;
  argument?: string;
  cachedValue?: string;
}

function cachedValueForField(input: NativeFieldInput, deterministic: DeterministicContext): string {
  if (input.cachedValue !== undefined) {
    return input.cachedValue;
  }

  switch (input.kind) {
    case 'PAGE':
    case 'NUMPAGES':
      return '1';
    case 'DATE':
      return deterministic.fixedDate.toISOString().slice(0, 10);
    case 'TIME':
      return deterministic.fixedDate.toISOString().slice(11, 16);
    case 'FILENAME':
      return 'Document';
    case 'PAGEREF':
      return '1';
  }
}

function instructionForField(input: NativeFieldInput): string {
  if (input.kind === 'PAGEREF') {
    return ` PAGEREF ${input.argument ?? ''} \\h `;
  }
  return ` ${input.kind} `;
}

export function buildFieldRuns(input: NativeFieldInput, deterministic: DeterministicContext): XmlElement[] {
  return [
    xmlElement('w:r', undefined, [
      xmlElement('w:fldChar', { 'w:fldCharType': 'begin' }),
    ]),
    xmlElement('w:r', undefined, [
      xmlElement('w:instrText', { 'xml:space': 'preserve' }, [
        xmlText(escapeXml(instructionForField(input))),
      ]),
    ]),
    xmlElement('w:r', undefined, [
      xmlElement('w:fldChar', { 'w:fldCharType': 'separate' }),
    ]),
    xmlElement('w:r', undefined, [
      xmlElement('w:t', undefined, [
        xmlText(escapeXml(cachedValueForField(input, deterministic))),
      ]),
    ]),
    xmlElement('w:r', undefined, [
      xmlElement('w:fldChar', { 'w:fldCharType': 'end' }),
    ]),
  ];
}

const FIELD_PLACEHOLDER = /\{(PAGE|NUMPAGES|DATE|TIME|FILENAME)\}/g;

export function splitFieldPlaceholders(text: string): Array<{ text: string } | { field: FieldKind }> {
  const parts: Array<{ text: string } | { field: FieldKind }> = [];
  let cursor = 0;

  for (const match of text.matchAll(FIELD_PLACEHOLDER)) {
    if (match.index > cursor) {
      parts.push({ text: text.slice(cursor, match.index) });
    }
    parts.push({ field: match[1] as FieldKind });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ text }];
}
