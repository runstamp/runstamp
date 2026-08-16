import type { ListElement } from '../types.js';
import { extractList, flattenList, type ExtractedList, type ExtractedListItem } from '../elements/lists/extractor.js';
import type { DeterministicContext } from './deterministic.js';
import { serializeXml, xmlElement } from './ordered-builder.js';

type NativeNumberFormat =
  | 'bullet'
  | 'decimal'
  | 'lowerLetter'
  | 'upperLetter'
  | 'lowerRoman'
  | 'upperRoman';

interface NumberingLevelDefinition {
  level: number;
  start: number;
  format: NativeNumberFormat;
  text: string;
  fontFamily?: string;
  left: number;
  hanging: number;
}

interface NumberingDefinition {
  abstractNumId: number;
  numId: number;
  nsid: string;
  templateCode: string;
  levels: NumberingLevelDefinition[];
}

export interface RegisteredList {
  numId: number;
  items: ExtractedListItem[];
}

function levelText(format: NativeNumberFormat, level: number, bulletChars: string[]): string {
  switch (format) {
    case 'decimal':
    case 'lowerLetter':
    case 'upperLetter':
    case 'lowerRoman':
    case 'upperRoman':
      return `%${level + 1}.`;
    case 'bullet':
      return bulletChars[level % bulletChars.length] ?? '•';
  }
}

function indentation(level: number): { left: number; hanging: number } {
  return {
    left: 720 + (level * 360),
    hanging: 360,
  };
}

function orderedFormatsFor(type: ExtractedList['type']): NativeNumberFormat[] {
  switch (type) {
    case 'letter':
      return ['lowerLetter', 'lowerRoman', 'decimal', 'lowerLetter', 'lowerRoman', 'decimal', 'lowerLetter', 'lowerRoman', 'decimal'];
    case 'roman':
      return ['upperRoman', 'upperLetter', 'decimal', 'lowerRoman', 'lowerLetter', 'decimal', 'upperRoman', 'upperLetter', 'decimal'];
    case 'decimal':
    default:
      return ['decimal', 'decimal', 'decimal', 'decimal', 'decimal', 'decimal', 'decimal', 'decimal', 'decimal'];
  }
}

// Primary OOXML numFmt for an explicitly-declared listType at a given level.
// Used when a nested list at this level declared its own listType — the
// declared type wins over the outer list's rotation.
function primaryFormatFor(type: ExtractedList['type']): NativeNumberFormat {
  switch (type) {
    case 'bullet':
      return 'bullet';
    case 'letter':
      return 'lowerLetter';
    case 'roman':
      return 'upperRoman';
    case 'decimal':
    default:
      return 'decimal';
  }
}

function parseCustomBullets(element: ListElement): string[] | undefined {
  const raw =
    element.dataAttributes.bullets
    ?? element.dataAttributes.bulletChars
    ?? element.dataAttributes['bullet-chars']
    ?? element.dataAttributes['docx-bullets']
    ?? element.dataAttributes['data-bullets'];
  if (!raw) {
    return undefined;
  }

  const parsed = raw
    .split(/[|,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 9);
  return parsed.length > 0 ? parsed : undefined;
}

export class NumberingRegistry {
  private readonly definitions: NumberingDefinition[] = [];
  private abstractNumId: number;
  private numId: number;

  constructor(
    private readonly deterministic: DeterministicContext,
    startAbstractNumId = 1,
    startNumId = 1,
  ) {
    this.abstractNumId = Math.max(1, startAbstractNumId);
    this.numId = Math.max(1, startNumId);
  }

  registerList(element: ListElement): RegisteredList {
    const extracted = extractList(element);
    const flattened = flattenList(extracted);
    const bulletChars = parseCustomBullets(element) ?? ['•', '◦', '▪'];
    const bulletFont = element.dataAttributes.bulletFont || element.dataAttributes['bullet-font'] || 'Symbol';
    const orderedFormats = orderedFormatsFor(extracted.type);

    const levels: NumberingLevelDefinition[] = Array.from({ length: 9 }, (_, index) => {
      // Per-level format precedence:
      //   1. If a nested list declared a listType at this depth, use that
      //      type's primary format.
      //   2. Otherwise, if the outer list is bullet, every level is bullet.
      //   3. Otherwise, use the outer list's rotation table.
      const declaredAtLevel = extracted.levelTypes?.[index];
      let format: NativeNumberFormat;
      if (declaredAtLevel) {
        format = primaryFormatFor(declaredAtLevel);
      } else if (extracted.type === 'bullet') {
        format = 'bullet';
      } else {
        format = orderedFormats[index] ?? orderedFormats[orderedFormats.length - 1] ?? 'decimal';
      }
      const ind = indentation(index);
      return {
        level: index,
        start: index === 0 ? Math.max(1, extracted.startNumber ?? element.start ?? 1) : 1,
        format,
        text: levelText(format, index, bulletChars),
        fontFamily: format === 'bullet' ? bulletFont : undefined,
        left: ind.left,
        hanging: ind.hanging,
      };
    });

    const definition: NumberingDefinition = {
      abstractNumId: this.abstractNumId,
      numId: this.numId,
      nsid: this.deterministic.randomHex(8),
      templateCode: this.deterministic.randomHex(8),
      levels,
    };

    this.abstractNumId += 1;
    this.numId += 1;
    this.definitions.push(definition);

    return {
      numId: definition.numId,
      items: flattened,
    };
  }

  hasDefinitions(): boolean {
    return this.definitions.length > 0;
  }

  toXml(): string {
    return serializeXml(
      xmlElement('w:numbering', { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' }, [
        ...this.definitions.map((definition) =>
          xmlElement('w:abstractNum', { 'w:abstractNumId': String(definition.abstractNumId) }, [
            xmlElement('w:nsid', { 'w:val': definition.nsid }),
            xmlElement('w:multiLevelType', { 'w:val': 'hybridMultilevel' }),
            xmlElement('w:tmpl', { 'w:val': definition.templateCode }),
            ...definition.levels.map((level) =>
              xmlElement('w:lvl', { 'w:ilvl': String(level.level) }, [
                xmlElement('w:start', { 'w:val': String(level.start) }),
                xmlElement('w:numFmt', { 'w:val': level.format }),
                xmlElement('w:lvlText', { 'w:val': level.text }),
                xmlElement('w:lvlJc', { 'w:val': 'left' }),
                xmlElement('w:pPr', undefined, [
                  xmlElement('w:ind', {
                    'w:left': String(level.left),
                    'w:hanging': String(level.hanging),
                  }),
                ]),
                ...(level.fontFamily
                  ? [
                      xmlElement('w:rPr', undefined, [
                        xmlElement('w:rFonts', {
                          'w:ascii': level.fontFamily,
                          'w:hAnsi': level.fontFamily,
                          'w:hint': 'default',
                        }),
                      ]),
                    ]
                  : []),
              ]),
            ),
          ]),
        ),
        ...this.definitions.map((definition) =>
          xmlElement('w:num', { 'w:numId': String(definition.numId) }, [
            xmlElement('w:abstractNumId', { 'w:val': String(definition.abstractNumId) }),
          ]),
        ),
      ]),
    );
  }
}
