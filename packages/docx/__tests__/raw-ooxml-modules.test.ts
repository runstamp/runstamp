/**
 * Tests for Raw OOXML Generation Modules
 *
 * These tests verify the raw XML output from the new OOXML generation modules
 * created in the DOCX implementation phases 1-5.
 */

import {
  // Style Builder
  generateDefaultStyles,
  generateStylesXml,
  generateThemedStyles,
  createCustomStyle,
  getStyleById,
  mergeStyles,
  DEFAULT_THEME,
  type DocxStyle,
} from '../src/styles/style-builder';

import {
  // Numbering Builder
  generateNumberingXml,
  createBulletListDefinition,
  createNumberedListDefinition,
  createLegalListDefinition,
  createChecklistDefinition,
  resetNumberingIds,
} from '../src/styles/numbering-builder';

import {
  // Page Layout
  generateSectionProperties,
  generatePageBreak,
  generateSectionBreak,
  PAGE_SIZES,
  MARGIN_PRESETS,
  inchesToTwips,
  mmToTwips,
} from '../src/layout/page-layout';

import {
  // TOC Generator
  extractTocEntries,
  generateTocXml,
  generateTocStyles,
  generateHeadingBookmark,
} from '../src/features/toc-generator';

import {
  // Structure Validator
  validateStructure,
  validateHeadingHierarchy,
  validateListStructure,
  validateAll,
} from '../src/validation/structure-validator';

import {
  // Raw Footnotes
  generateFootnoteRef,
  generateEndnoteRef,
  generateFootnotesXml,
  generateEndnotesXml,
  generateNoteStyles,
  generateFootnotesRelationship,
  generateEndnotesRelationship,
  generateNoteContentTypes,
  RawFootnoteCollector,
  resetNoteCounters,
} from '../src/features/footnotes-raw';

// =============================================================================
// STYLE BUILDER TESTS
// =============================================================================

describe('Style Builder', () => {
  describe('generateDefaultStyles', () => {
    it('should generate default document styles', () => {
      const styles = generateDefaultStyles();

      expect(styles.length).toBeGreaterThan(0);

      // Should have Normal style
      const normalStyle = styles.find((s) => s.styleId === 'Normal');
      expect(normalStyle).toBeDefined();
      expect(normalStyle?.isDefault).toBe(true);
      expect(normalStyle?.type).toBe('paragraph');

      // Should have heading styles
      for (let i = 1; i <= 6; i++) {
        const headingStyle = styles.find((s) => s.styleId === `Heading${i}`);
        expect(headingStyle).toBeDefined();
        expect(headingStyle?.paragraph?.outlineLevel).toBe(i - 1);
      }

      // Should have character styles
      const strongStyle = styles.find((s) => s.styleId === 'Strong');
      expect(strongStyle).toBeDefined();
      expect(strongStyle?.type).toBe('character');
      expect(strongStyle?.run?.bold).toBe(true);
    });
  });

  describe('generateStylesXml', () => {
    it('should generate valid OOXML styles.xml', () => {
      const styles = generateDefaultStyles();
      const xml = generateStylesXml(styles);

      // Check XML structure
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<w:styles');
      expect(xml).toContain('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');

      // Check docDefaults
      expect(xml).toContain('<w:docDefaults>');
      expect(xml).toContain('<w:rPrDefault>');
      expect(xml).toContain('<w:pPrDefault>');

      // Check style definitions
      expect(xml).toContain('w:styleId="Normal"');
      expect(xml).toContain('w:styleId="Heading1"');
      expect(xml).toContain('w:default="1"');
    });

    it('should include paragraph properties', () => {
      const styles = generateDefaultStyles();
      const xml = generateStylesXml(styles);

      // Check for spacing
      expect(xml).toContain('<w:spacing');
      expect(xml).toContain('w:after=');
      expect(xml).toContain('w:line=');

      // Check for outline levels (headings)
      expect(xml).toContain('<w:outlineLvl');
    });

    it('should include run properties', () => {
      const styles = generateDefaultStyles();
      const xml = generateStylesXml(styles);

      // Check for fonts
      expect(xml).toContain('<w:rFonts');
      expect(xml).toContain('w:ascii=');

      // Check for font sizes
      expect(xml).toContain('<w:sz');
    });
  });

  describe('generateThemedStyles', () => {
    it('should generate styles with custom theme', () => {
      const customTheme = {
        ...DEFAULT_THEME,
        primaryColor: 'FF0000',
        headingFont: 'Arial Black',
      };

      const styles = generateThemedStyles(customTheme);
      const xml = generateStylesXml(styles);

      expect(xml).toContain('w:color w:val="FF0000"');
      expect(xml).toContain('w:ascii="Arial Black"');
    });
  });

  describe('createCustomStyle', () => {
    it('should create custom style from base', () => {
      const baseStyle: DocxStyle = {
        styleId: 'Normal',
        name: 'Normal',
        type: 'paragraph',
        run: { fontFamily: 'Calibri' },
      };

      const customStyle = createCustomStyle(baseStyle, {
        styleId: 'MyParagraph',
        name: 'My Paragraph',
        run: { bold: true },
      });

      expect(customStyle.styleId).toBe('MyParagraph');
      expect(customStyle.run?.fontFamily).toBe('Calibri');
      expect(customStyle.run?.bold).toBe(true);
    });
  });

  describe('mergeStyles', () => {
    it('should merge style collections', () => {
      const styles1: DocxStyle[] = [
        { styleId: 'Normal', name: 'Normal', type: 'paragraph' },
      ];
      const styles2: DocxStyle[] = [
        { styleId: 'Normal', name: 'Normal Modified', type: 'paragraph' },
        { styleId: 'Heading1', name: 'Heading 1', type: 'paragraph' },
      ];

      const merged = mergeStyles(styles1, styles2);

      expect(merged.length).toBe(2);
      const normalStyle = getStyleById(merged, 'Normal');
      expect(normalStyle?.name).toBe('Normal Modified'); // Later overrides
    });
  });
});

// =============================================================================
// NUMBERING BUILDER TESTS
// =============================================================================

describe('Numbering Builder', () => {
  beforeEach(() => {
    resetNumberingIds();
  });

  describe('generateNumberingXml', () => {
    it('should generate valid numbering.xml', () => {
      const definitions = [
        createBulletListDefinition(),
        createNumberedListDefinition(),
      ];

      const xml = generateNumberingXml(definitions);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<w:numbering');
      expect(xml).toContain('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');
      expect(xml).toContain('<w:abstractNum');
      expect(xml).toContain('<w:num');
    });
  });

  describe('createBulletListDefinition', () => {
    it('should create bullet list with 9 levels', () => {
      const definition = createBulletListDefinition();

      expect(definition.levels.length).toBe(9);

      // Check first level has bullet character
      expect(definition.levels[0].levelText).toBe('•');
      expect(definition.levels[0].numFmt).toBe('bullet');
    });
  });

  describe('createNumberedListDefinition', () => {
    it('should create numbered list with proper formats', () => {
      const definition = createNumberedListDefinition();

      expect(definition.levels.length).toBe(9);

      // Check level formats cycle (decimal, lowerLetter, lowerRoman)
      expect(definition.levels[0].numFmt).toBe('decimal');
      expect(definition.levels[1].numFmt).toBe('lowerLetter');
      expect(definition.levels[2].numFmt).toBe('lowerRoman');
    });
  });

  describe('createLegalListDefinition', () => {
    it('should create legal numbering (1.1.1 style)', () => {
      const definition = createLegalListDefinition();

      expect(definition.levels.length).toBe(9);

      // Level 0: "1."
      expect(definition.levels[0].levelText).toBe('%1.');

      // Level 1: "1.1."
      expect(definition.levels[1].levelText).toBe('%1.%2.');

      // Level 2: "1.1.1."
      expect(definition.levels[2].levelText).toBe('%1.%2.%3.');
    });
  });

  describe('createChecklistDefinition', () => {
    it('should create checklist with checkbox characters', () => {
      const definition = createChecklistDefinition();

      expect(definition.levels.length).toBe(9);
      expect(definition.levels[0].numFmt).toBe('bullet');
      expect(definition.levels[0].levelText).toBe('☐'); // Empty checkbox
    });
  });
});

// =============================================================================
// PAGE LAYOUT TESTS
// =============================================================================

describe('Page Layout', () => {
  describe('PAGE_SIZES', () => {
    it('should have standard page sizes', () => {
      expect(PAGE_SIZES.LETTER).toBeDefined();
      expect(PAGE_SIZES.A4).toBeDefined();
      expect(PAGE_SIZES.LEGAL).toBeDefined();

      // US Letter: 8.5 x 11 inches
      expect(PAGE_SIZES.LETTER.width).toBe(12240); // 8.5 * 1440
      expect(PAGE_SIZES.LETTER.height).toBe(15840); // 11 * 1440
    });
  });

  describe('MARGIN_PRESETS', () => {
    it('should have standard margin presets', () => {
      expect(MARGIN_PRESETS.NORMAL).toBeDefined();
      expect(MARGIN_PRESETS.NARROW).toBeDefined();
      expect(MARGIN_PRESETS.WIDE).toBeDefined();

      // Normal margins: 1 inch all around
      expect(MARGIN_PRESETS.NORMAL.top).toBe(1440);
    });
  });

  describe('unit conversions', () => {
    it('should convert inches to twips', () => {
      expect(inchesToTwips(1)).toBe(1440);
      expect(inchesToTwips(8.5)).toBe(12240);
    });

    it('should convert mm to twips', () => {
      // 25.4mm = 1 inch = 1440 twips
      expect(mmToTwips(25.4)).toBeCloseTo(1440, 0);
    });
  });

  describe('generateSectionProperties', () => {
    it('should generate section properties XML', () => {
      const xml = generateSectionProperties({
        width: PAGE_SIZES.LETTER.width,
        height: PAGE_SIZES.LETTER.height,
        orientation: 'portrait',
        margins: MARGIN_PRESETS.NORMAL,
      });

      expect(xml).toContain('<w:sectPr>');
      expect(xml).toContain('<w:pgSz');
      expect(xml).toContain('w:w="12240"'); // Letter width
      expect(xml).toContain('w:h="15840"'); // Letter height
      expect(xml).toContain('<w:pgMar');
    });

    it('should support landscape orientation', () => {
      const xml = generateSectionProperties({
        width: PAGE_SIZES.LETTER.width,
        height: PAGE_SIZES.LETTER.height,
        orientation: 'landscape',
        margins: MARGIN_PRESETS.NORMAL,
      });

      expect(xml).toContain('w:orient="landscape"');
      // Width and height should be swapped in landscape
      expect(xml).toContain('w:w="15840"');
      expect(xml).toContain('w:h="12240"');
    });
  });

  describe('generatePageBreak', () => {
    it('should generate page break XML', () => {
      const xml = generatePageBreak();

      expect(xml).toContain('<w:p>');
      expect(xml).toContain('<w:br w:type="page"/>');
    });
  });

  describe('generateSectionBreak', () => {
    it('should generate different section break types', () => {
      const types = ['nextPage', 'continuous', 'evenPage', 'oddPage'] as const;

      for (const type of types) {
        const xml = generateSectionBreak(type);

        expect(xml).toContain('<w:sectPr>');
        expect(xml).toContain(`w:val="${type}"`);
      }
    });
  });
});

// =============================================================================
// TOC GENERATOR TESTS
// =============================================================================

describe('TOC Generator', () => {
  describe('extractTocEntries', () => {
    it('should extract TOC entries from semantic elements', () => {
      const elements = [
        {
          type: 'heading' as const,
          content: 'Chapter 1',
          level: 1,
          children: [],
          attributes: { headingLevel: 1 as const },
        },
        {
          type: 'heading' as const,
          content: 'Section 1.1',
          level: 2,
          children: [],
          attributes: { headingLevel: 2 as const },
        },
        {
          type: 'heading' as const,
          content: 'Chapter 2',
          level: 1,
          children: [],
          attributes: { headingLevel: 1 as const },
        },
      ];

      const entries = extractTocEntries(elements);

      expect(entries.length).toBe(3);
      expect(entries[0].level).toBe(1);
      expect(entries[0].text).toBe('Chapter 1');
      expect(entries[1].level).toBe(2);
      expect(entries[1].text).toBe('Section 1.1');
    });

    it('should respect maxLevel parameter', () => {
      const elements = [
        {
          type: 'heading' as const,
          content: 'H1',
          level: 1,
          children: [],
          attributes: { headingLevel: 1 as const },
        },
        {
          type: 'heading' as const,
          content: 'H2',
          level: 2,
          children: [],
          attributes: { headingLevel: 2 as const },
        },
        {
          type: 'heading' as const,
          content: 'H3',
          level: 3,
          children: [],
          attributes: { headingLevel: 3 as const },
        },
      ];

      const entries = extractTocEntries(elements, 2);

      expect(entries.length).toBe(2); // Only H1 and H2
      expect(entries.map((e) => e.level)).toEqual([1, 2]);
    });
  });

  describe('generateTocXml', () => {
    it('should generate TOC field code', () => {
      const xml = generateTocXml({
        title: 'Table of Contents',
        levels: 3,
      });

      expect(xml).toContain('<w:sdt>');
      expect(xml).toContain('TOC');
      expect(xml).toContain('\\o "1-3"'); // Levels 1-3
      expect(xml).toContain('Table of Contents');
    });

    it('should support custom options', () => {
      const xml = generateTocXml({
        title: 'Contents',
        levels: 2,
        showPageNumbers: true,
        hyperlinks: true,
      });

      expect(xml).toContain('Contents');
      expect(xml).toContain('\\o "1-2"');
      expect(xml).toContain('\\h'); // Hyperlinks
    });

    it('should use default values', () => {
      const xml = generateTocXml();

      expect(xml).toContain('Table of Contents');
      expect(xml).toContain('\\o "1-3"'); // Default 3 levels
    });
  });

  describe('generateTocStyles', () => {
    it('should generate TOC styles XML string', () => {
      const stylesXml = generateTocStyles();

      // Should be a string containing TOC style definitions
      expect(typeof stylesXml).toBe('string');
      expect(stylesXml).toContain('TOCHeading');
      expect(stylesXml).toContain('TOC1');
      expect(stylesXml).toContain('TOC2');
      expect(stylesXml).toContain('w:style');
    });
  });

  describe('generateHeadingBookmark', () => {
    it('should generate bookmark start and end elements', () => {
      const bookmark = generateHeadingBookmark('Chapter 1', 1, '_Toc001');

      expect(bookmark.start).toContain('<w:bookmarkStart');
      expect(bookmark.start).toContain('w:id="1"');
      expect(bookmark.start).toContain('w:name="_Toc001"');
      expect(bookmark.end).toContain('<w:bookmarkEnd');
      expect(bookmark.end).toContain('w:id="1"');
    });

    it('should handle different bookmark IDs', () => {
      const bookmark1 = generateHeadingBookmark('A', 1, '_Toc001');
      const bookmark2 = generateHeadingBookmark('B', 2, '_Toc002');

      expect(bookmark1.start).toContain('w:id="1"');
      expect(bookmark2.start).toContain('w:id="2"');
      expect(bookmark1.start).toContain('w:name="_Toc001"');
      expect(bookmark2.start).toContain('w:name="_Toc002"');
    });
  });
});

// =============================================================================
// STRUCTURE VALIDATOR TESTS
// =============================================================================

describe('Structure Validator', () => {
  describe('validateHeadingHierarchy', () => {
    it('should pass for valid heading hierarchy', () => {
      const elements = [
        { type: 'heading' as const, level: 1, content: 'H1', children: [], attributes: { headingLevel: 1 as const } },
        { type: 'heading' as const, level: 2, content: 'H2', children: [], attributes: { headingLevel: 2 as const } },
        { type: 'heading' as const, level: 3, content: 'H3', children: [], attributes: { headingLevel: 3 as const } },
      ];

      const result = validateHeadingHierarchy(elements);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should warn for skipped heading levels', () => {
      const elements = [
        { type: 'heading' as const, level: 1, content: 'H1', children: [], attributes: { headingLevel: 1 as const } },
        { type: 'heading' as const, level: 3, content: 'H3', children: [], attributes: { headingLevel: 3 as const } }, // Skipped H2
      ];

      const result = validateHeadingHierarchy(elements);

      // This should generate an issue for skipped level
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some((issue) => issue.includes('skips'))).toBe(true);
    });
  });

  describe('validateListStructure', () => {
    it('should pass for valid list nesting', () => {
      const elements = [
        {
          type: 'list' as const,
          content: '',
          level: 0,
          children: [
            {
              type: 'listItem' as const,
              content: 'Item 1',
              children: [],
              attributes: {},
            },
          ],
          attributes: { listType: 'unordered' as const },
        },
      ];

      const result = validateListStructure(elements);

      expect(result.valid).toBe(true);
    });

    it('should warn for deeply nested lists', () => {
      // Create deeply nested list (more than 5 levels triggers warning)
      let current: any = { type: 'listItem', content: 'Deep', children: [], attributes: {} };

      for (let i = 0; i < 7; i++) {
        current = {
          type: 'list',
          content: '',
          children: [current],
          attributes: { listType: 'unordered' },
        };
      }

      const result = validateListStructure([current]);

      // Deep nesting should generate an issue
      expect(result.issues.some((issue: string) => issue.includes('nested'))).toBe(true);
    });
  });

  describe('validateStructure', () => {
    it('should validate empty elements', () => {
      const elements = [
        { type: 'paragraph' as const, content: '', children: [], attributes: {} },
      ];

      const result = validateStructure(elements);

      // Empty paragraph should generate a warning
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should detect valid structure', () => {
      const elements = [
        { type: 'heading' as const, level: 1, content: 'Title', children: [], attributes: { headingLevel: 1 as const } },
        { type: 'paragraph' as const, content: 'Some content here.', children: [], attributes: {} },
      ];

      const result = validateStructure(elements);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('validateAll', () => {
    it('should run all validations', () => {
      const elements = [
        { type: 'heading' as const, level: 1, content: 'Title', children: [], attributes: { headingLevel: 1 as const } },
        { type: 'paragraph' as const, content: 'Text content', children: [], attributes: {} },
      ];

      const result = validateAll(elements);

      expect(result.overallValid).toBe(true);
      expect(result.structure.valid).toBe(true);
      expect(result.headings.valid).toBe(true);
    });
  });
});

// =============================================================================
// RAW FOOTNOTES TESTS
// =============================================================================

describe('Raw Footnotes', () => {
  beforeEach(() => {
    resetNoteCounters();
  });

  describe('generateFootnoteRef', () => {
    it('should generate footnote reference XML', () => {
      const xml = generateFootnoteRef(1);

      expect(xml).toContain('<w:r>');
      expect(xml).toContain('<w:rStyle w:val="FootnoteReference"/>');
      expect(xml).toContain('<w:footnoteReference w:id="1"/>');
    });

    it('should handle different IDs', () => {
      const xml = generateFootnoteRef(5);

      expect(xml).toContain('w:id="5"');
    });
  });

  describe('generateEndnoteRef', () => {
    it('should generate endnote reference XML', () => {
      const xml = generateEndnoteRef(2);

      expect(xml).toContain('<w:r>');
      expect(xml).toContain('<w:rStyle w:val="EndnoteReference"/>');
      expect(xml).toContain('<w:endnoteReference w:id="2"/>');
    });
  });

  describe('generateFootnotesXml', () => {
    it('should generate complete footnotes.xml', () => {
      const notes = [
        { id: 1, content: 'First footnote', type: 'footnote' as const },
        { id: 2, content: 'Second footnote', type: 'footnote' as const },
      ];

      const xml = generateFootnotesXml(notes);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<w:footnotes');
      expect(xml).toContain('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"');

      // Should have separator footnotes
      expect(xml).toContain('w:type="separator"');
      expect(xml).toContain('w:type="continuationSeparator"');

      // Should have our footnotes
      expect(xml).toContain('w:id="1"');
      expect(xml).toContain('First footnote');
      expect(xml).toContain('w:id="2"');
      expect(xml).toContain('Second footnote');
    });

    it('should filter out endnotes', () => {
      const notes = [
        { id: 1, content: 'Footnote', type: 'footnote' as const },
        { id: 1, content: 'Endnote', type: 'endnote' as const },
      ];

      const xml = generateFootnotesXml(notes);

      expect(xml).toContain('Footnote');
      expect(xml).not.toContain('Endnote');
    });

    it('should escape XML special characters', () => {
      const notes = [
        { id: 1, content: 'Test & <special> "chars"', type: 'footnote' as const },
      ];

      const xml = generateFootnotesXml(notes);

      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;special&gt;');
      expect(xml).toContain('&quot;');
    });
  });

  describe('generateEndnotesXml', () => {
    it('should generate complete endnotes.xml', () => {
      const notes = [
        { id: 1, content: 'First endnote', type: 'endnote' as const },
      ];

      const xml = generateEndnotesXml(notes);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<w:endnotes');
      expect(xml).toContain('w:type="separator"');
      expect(xml).toContain('First endnote');
      expect(xml).toContain('<w:endnoteRef/>');
    });

    it('should filter out footnotes', () => {
      const notes = [
        { id: 1, content: 'Footnote', type: 'footnote' as const },
        { id: 1, content: 'Endnote', type: 'endnote' as const },
      ];

      const xml = generateEndnotesXml(notes);

      expect(xml).not.toContain('Footnote');
      expect(xml).toContain('Endnote');
    });
  });

  describe('generateNoteStyles', () => {
    it('should generate footnote and endnote styles', () => {
      const styles = generateNoteStyles();

      // Footnote styles
      expect(styles).toContain('w:styleId="FootnoteText"');
      expect(styles).toContain('w:styleId="FootnoteReference"');
      expect(styles).toContain('w:val="superscript"');

      // Endnote styles
      expect(styles).toContain('w:styleId="EndnoteText"');
      expect(styles).toContain('w:styleId="EndnoteReference"');
    });
  });

  describe('generateFootnotesRelationship', () => {
    it('should generate relationship entry', () => {
      const xml = generateFootnotesRelationship('rId5');

      expect(xml).toContain('Id="rId5"');
      expect(xml).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes"');
      expect(xml).toContain('Target="footnotes.xml"');
    });
  });

  describe('generateEndnotesRelationship', () => {
    it('should generate relationship entry', () => {
      const xml = generateEndnotesRelationship('rId6');

      expect(xml).toContain('Id="rId6"');
      expect(xml).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes"');
      expect(xml).toContain('Target="endnotes.xml"');
    });
  });

  describe('generateNoteContentTypes', () => {
    it('should generate content type entries', () => {
      const xml = generateNoteContentTypes();

      expect(xml).toContain('PartName="/word/footnotes.xml"');
      expect(xml).toContain('PartName="/word/endnotes.xml"');
      expect(xml).toContain('footnotes+xml');
      expect(xml).toContain('endnotes+xml');
    });
  });

  describe('RawFootnoteCollector', () => {
    it('should collect footnotes', () => {
      const collector = new RawFootnoteCollector();

      const id1 = collector.addFootnote('First note');
      const id2 = collector.addFootnote('Second note');

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(collector.hasFootnotes()).toBe(true);
      expect(collector.getFootnotes().length).toBe(2);
    });

    it('should collect endnotes', () => {
      const collector = new RawFootnoteCollector();

      const id = collector.addEndnote('An endnote');

      expect(id).toBe(1);
      expect(collector.hasEndnotes()).toBe(true);
      expect(collector.getEndnotes().length).toBe(1);
    });

    it('should generate XML from collected notes', () => {
      const collector = new RawFootnoteCollector();

      collector.addFootnote('Footnote 1');
      collector.addFootnote('Footnote 2');
      collector.addEndnote('Endnote 1');

      const footnotesXml = collector.generateFootnotesXml();
      const endnotesXml = collector.generateEndnotesXml();

      expect(footnotesXml).toContain('Footnote 1');
      expect(footnotesXml).toContain('Footnote 2');
      expect(endnotesXml).toContain('Endnote 1');
    });

    it('should clear collected notes', () => {
      const collector = new RawFootnoteCollector();

      collector.addFootnote('Note');
      collector.clear();

      expect(collector.hasFootnotes()).toBe(false);
      expect(collector.hasEndnotes()).toBe(false);
    });
  });
});
