/**
 * DOCX Numbering Definition Builder
 *
 * Builds DOCX numbering definitions for lists.
 * Generates numbering.xml content for Word documents.
 */

import { SemanticElement, SemanticAttributes } from '../semantic-types';
import { escapeXml } from '../utils/xml.js';

// =============================================================================
// TYPES
// =============================================================================

export interface NumberingDefinition {
  numId: number;
  abstractNumId: number;
  levels: NumberingLevel[];
}

export interface NumberingLevel {
  level: number; // 0-8
  start: number;
  numFmt:
    | 'decimal'
    | 'lowerLetter'
    | 'upperLetter'
    | 'lowerRoman'
    | 'upperRoman'
    | 'bullet';
  levelText: string;
  indent: number; // Twips
  fontFamily?: string; // For bullet characters
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

let nextNumId = 1;
let nextAbstractNumId = 1;

/**
 * Reset numbering IDs (call when starting a new document).
 */
export function resetNumberingIds(): void {
  nextNumId = 1;
  nextAbstractNumId = 1;
}

// =============================================================================
// NUMBERING CREATION
// =============================================================================

/**
 * Create numbering definition for a list.
 */
export function createNumberingForList(
  list: SemanticElement,
  _depth: number = 0
): NumberingDefinition {
  const isOrdered = list.attributes.listType === 'ordered';
  const style = list.attributes.listStyle || (isOrdered ? 'decimal' : 'disc');

  const levels: NumberingLevel[] = [];

  // Create all 9 levels (DOCX requirement)
  for (let i = 0; i <= 8; i++) {
    const levelStyle = getLevelStyle(isOrdered, style, i);

    levels.push({
      level: i,
      start: i === 0 && list.attributes.listStart ? list.attributes.listStart : 1,
      numFmt: levelStyle.numFmt,
      levelText: levelStyle.levelText,
      indent: 720 + i * 360, // 0.5in base + 0.25in per level
      fontFamily: levelStyle.fontFamily,
    });
  }

  const definition: NumberingDefinition = {
    numId: nextNumId++,
    abstractNumId: nextAbstractNumId++,
    levels,
  };

  return definition;
}

/**
 * Get level style based on list type and nesting.
 */
function getLevelStyle(
  isOrdered: boolean,
  style: NonNullable<SemanticAttributes['listStyle']>,
  level: number
): { numFmt: NumberingLevel['numFmt']; levelText: string; fontFamily?: string } {
  if (!isOrdered) {
    // Bullet styles cycle through disc, circle, square
    const bullets = ['disc', 'circle', 'square'];
    const bullet = bullets[level % 3];

    const bulletChars: Record<string, string> = {
      disc: '\u2022', // •
      circle: '\u25E6', // ◦
      square: '\u25AA', // ▪
    };

    return {
      numFmt: 'bullet',
      levelText: bulletChars[bullet],
      fontFamily: 'Symbol',
    };
  }

  // Ordered list styles
  const styleMap: Record<
    string,
    { numFmt: NumberingLevel['numFmt']; levelText: string }
  > = {
    decimal: { numFmt: 'decimal', levelText: `%${level + 1}.` },
    'lower-alpha': { numFmt: 'lowerLetter', levelText: `%${level + 1}.` },
    'upper-alpha': { numFmt: 'upperLetter', levelText: `%${level + 1}.` },
    'lower-roman': { numFmt: 'lowerRoman', levelText: `%${level + 1}.` },
    'upper-roman': { numFmt: 'upperRoman', levelText: `%${level + 1}.` },
  };

  // Rotate through styles for nested levels if not specified
  if (level > 0) {
    const rotatingStyles: Array<SemanticAttributes['listStyle']> = [
      'decimal',
      'lower-alpha',
      'lower-roman',
    ];
    const rotatedStyle = rotatingStyles[level % 3];
    if (rotatedStyle && !styleMap[style]) {
      return styleMap[rotatedStyle] || styleMap['decimal'];
    }
  }

  return styleMap[style] || styleMap['decimal'];
}

// =============================================================================
// XML GENERATION
// =============================================================================

/**
 * Generate numbering.xml content.
 */
export function generateNumberingXml(definitions: NumberingDefinition[]): string {
  const abstractNums = definitions.map((def) => generateAbstractNum(def)).join('\n');
  const nums = definitions.map((def) => generateNum(def)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
${abstractNums}
${nums}
</w:numbering>`;
}

function generateAbstractNum(def: NumberingDefinition): string {
  const levels = def.levels.map((level) => generateLevel(level)).join('\n');

  return `<w:abstractNum w:abstractNumId="${def.abstractNumId}">
<w:multiLevelType w:val="hybridMultilevel"/>
${levels}
</w:abstractNum>`;
}

function generateLevel(level: NumberingLevel): string {
  const bulletFont =
    level.numFmt === 'bullet' && level.fontFamily
      ? `<w:rPr><w:rFonts w:ascii="${level.fontFamily}" w:hAnsi="${level.fontFamily}" w:hint="default"/></w:rPr>`
      : '';

  return `<w:lvl w:ilvl="${level.level}">
<w:start w:val="${level.start}"/>
<w:numFmt w:val="${level.numFmt}"/>
<w:lvlText w:val="${escapeXml(level.levelText)}"/>
<w:lvlJc w:val="left"/>
<w:pPr>
  <w:ind w:left="${level.indent}" w:hanging="360"/>
</w:pPr>
${bulletFont}
</w:lvl>`;
}

function generateNum(def: NumberingDefinition): string {
  return `<w:num w:numId="${def.numId}">
<w:abstractNumId w:val="${def.abstractNumId}"/>
</w:num>`;
}

// =============================================================================
// PRESET NUMBERING DEFINITIONS
// =============================================================================

/**
 * Create a standard bullet list definition.
 */
export function createBulletListDefinition(): NumberingDefinition {
  const levels: NumberingLevel[] = [];
  const bulletChars = ['\u2022', '\u25E6', '\u25AA']; // •, ◦, ▪

  for (let i = 0; i <= 8; i++) {
    levels.push({
      level: i,
      start: 1,
      numFmt: 'bullet',
      levelText: bulletChars[i % 3],
      indent: 720 + i * 360,
      fontFamily: 'Symbol',
    });
  }

  return {
    numId: nextNumId++,
    abstractNumId: nextAbstractNumId++,
    levels,
  };
}

/**
 * Create a standard numbered list definition.
 */
export function createNumberedListDefinition(): NumberingDefinition {
  const levels: NumberingLevel[] = [];
  const formats: Array<NumberingLevel['numFmt']> = [
    'decimal',
    'lowerLetter',
    'lowerRoman',
  ];

  for (let i = 0; i <= 8; i++) {
    levels.push({
      level: i,
      start: 1,
      numFmt: formats[i % 3],
      levelText: `%${i + 1}.`,
      indent: 720 + i * 360,
    });
  }

  return {
    numId: nextNumId++,
    abstractNumId: nextAbstractNumId++,
    levels,
  };
}

/**
 * Create a legal numbering definition (1. 1.1. 1.1.1. etc).
 */
export function createLegalListDefinition(): NumberingDefinition {
  const levels: NumberingLevel[] = [];

  for (let i = 0; i <= 8; i++) {
    // Build level text like "1." "1.1." "1.1.1." etc.
    const levelTextParts = [];
    for (let j = 0; j <= i; j++) {
      levelTextParts.push(`%${j + 1}`);
    }
    const levelText = levelTextParts.join('.') + '.';

    levels.push({
      level: i,
      start: 1,
      numFmt: 'decimal',
      levelText,
      indent: 720 + i * 720, // Wider indent for legal numbering
    });
  }

  return {
    numId: nextNumId++,
    abstractNumId: nextAbstractNumId++,
    levels,
  };
}

/**
 * Create a checklist-style definition.
 */
export function createChecklistDefinition(): NumberingDefinition {
  const levels: NumberingLevel[] = [];

  for (let i = 0; i <= 8; i++) {
    levels.push({
      level: i,
      start: 1,
      numFmt: 'bullet',
      levelText: '\u2610', // ☐ (empty checkbox)
      indent: 720 + i * 360,
      fontFamily: 'Segoe UI Symbol',
    });
  }

  return {
    numId: nextNumId++,
    abstractNumId: nextAbstractNumId++,
    levels,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get the numbering reference string for use in paragraph properties.
 */
export function getNumberingReference(
  numId: number,
  level: number
): { numId: number; ilvl: number } {
  return {
    numId,
    ilvl: level,
  };
}

/**
 * Generate paragraph numbering properties XML.
 */
export function generateParagraphNumberingXml(numId: number, level: number): string {
  return `<w:numPr>
  <w:ilvl w:val="${level}"/>
  <w:numId w:val="${numId}"/>
</w:numPr>`;
}
