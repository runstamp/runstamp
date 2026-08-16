/**
 * Semantic structure types for DOCX conversion.
 *
 * These types represent the semantic structure of a document (headings, lists,
 * code blocks, etc.) independent of any DOM or browser API.
 *
 * Ported from: packages/converter/src/docx/extraction/semantic-extractor.ts
 * (types only — the DOM-dependent extraction function is not ported)
 */

export type SemanticType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'listItem'
  | 'blockquote'
  | 'codeBlock'
  | 'table'
  | 'image'
  | 'section'
  | 'definition'
  | 'unknown';

export interface SemanticElement {
  type: SemanticType;
  level?: number; // For headings (1-6) and list nesting
  content: string;
  children: SemanticElement[];
  attributes: SemanticAttributes;
}

export interface SemanticAttributes {
  // Heading attributes
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;

  // List attributes
  listType?: 'ordered' | 'unordered';
  listStart?: number;
  listStyle?:
    | 'decimal'
    | 'lower-alpha'
    | 'upper-alpha'
    | 'lower-roman'
    | 'upper-roman'
    | 'disc'
    | 'circle'
    | 'square';

  // Code attributes
  language?: string;

  // Section attributes
  sectionName?: string;

  // Generic styling intent
  emphasis?: 'strong' | 'emphasis' | 'both';
  alignment?: 'left' | 'center' | 'right' | 'justify';
}
