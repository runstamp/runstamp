/**
 * Revision Tracker
 * =================
 * Track Changes / Revision Tracking support for DOCX output.
 *
 * Phase 14 of Polyglot hardening.
 *
 * This module enables "redlining" - the ability to show inserted and deleted
 * text in Word documents. When a document is opened in Word, users see:
 * - Inserted text: underlined/colored (typically blue)
 * - Deleted text: strikethrough/colored (typically red)
 *
 * This is CRITICAL for legal document workflows where changes must be tracked
 * and approved by multiple parties.
 *
 * OOXML Structure for Track Changes:
 * ```xml
 * <w:ins w:author="Author Name" w:date="2026-01-30T12:00:00Z">
 *   <w:r><w:t>inserted text</w:t></w:r>
 * </w:ins>
 * <w:del w:author="Author Name" w:date="2026-01-30T12:00:00Z">
 *   <w:r><w:delText>deleted text</w:delText></w:r>
 * </w:del>
 * ```
 */

import type {
  DocxDocument,
  DocxPage,
  DocxTextRun,
} from '../schema.js';

type LooseDocxElement = { type: string; [key: string]: any };
type LooseTextElement = LooseDocxElement & { type: 'heading' | 'paragraph' | 'text-run'; runs?: DocxTextRun[]; text?: string };
type LooseTableElement = LooseDocxElement & {
  type: 'table';
  rows?: Array<{ cells?: Array<{ text?: string; runs?: DocxTextRun[]; [key: string]: any }>; [key: string]: any }>;
  caption?: string;
  tableDescription?: string;
  tableCaption?: string;
  revision?: TableRevision;
};

// =============================================================================
// TYPES
// =============================================================================

/** Revision types */
export type RevisionType = 'insert' | 'delete' | 'move' | 'format';

/** A revision author */
export interface RevisionAuthor {
  /** Author name (displayed in Word) */
  name: string;
  /** Author initials (optional) */
  initials?: string;
  /** Author ID (optional, auto-generated if not provided) */
  id?: string;
}

/** A single revision entry */
export interface Revision {
  /** Unique revision ID */
  id: string;
  /** Type of revision */
  type: RevisionType;
  /** Author who made the revision */
  author: RevisionAuthor;
  /** When the revision was made */
  date: Date;
  /** The content that was inserted/deleted */
  content: string;
  /** Original content (for replacements - delete + insert pair) */
  originalContent?: string;
  /** Position in document (for ordering) */
  position?: number;
  /** Associated node ID (links revision to VLT node) */
  nodeId?: string;
}

/** Configuration for revision tracking */
export interface RevisionTrackingConfig {
  /** Enable revision tracking */
  enabled: boolean;
  /** Default author for revisions */
  defaultAuthor: RevisionAuthor;
  /** Whether to show revision marks in output */
  showRevisionMarks?: boolean;
  /** Whether to include revision date */
  includeDate?: boolean;
  /** Custom revision ID generator */
  idGenerator?: () => string;
}

/** Track changes diff granularity */
export type TrackChangesGranularity = 'word' | 'sentence' | 'paragraph';

/** Style snapshot for formatting revisions */
export interface RevisionStyleSnapshot {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | number;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  backgroundColor?: string;
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  superscript?: boolean;
  subscript?: boolean;
  letterSpacing?: number;
}

/** Run-level revision payload */
export interface RunRevision {
  type: 'insert' | 'delete' | 'format';
  id?: number;
  author?: string;
  date?: string;
  beforeStyle?: RevisionStyleSnapshot;
}

export interface ParagraphRevisionProperties {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  keepLines?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  indent?: {
    firstLine?: number;
    left?: number;
    right?: number;
  };
}

export interface ParagraphRevision {
  type: 'insert' | 'delete' | 'property' | 'moveFrom' | 'moveTo';
  id?: number;
  author?: string;
  date?: string;
  moveName?: string;
  before?: ParagraphRevisionProperties;
}

export interface TableRevisionProperties {
  caption?: string;
  tableDescription?: string;
  tableCaption?: string;
}

export interface TableRevision {
  type: 'property';
  id?: number;
  author?: string;
  date?: string;
  before?: TableRevisionProperties;
}

export interface TableCellRevision {
  type: 'insert' | 'delete';
  id?: number;
  author?: string;
  date?: string;
}

/** Document-level revision defaults */
export interface RevisionDefaultsInput {
  author?: string;
  date?: string | Date;
  rsid?: string;
}

/** Resolved document-level revision info */
export interface ResolvedRevisionInfo {
  author: string;
  date: string;
  rsid: string;
}

/** Options for run normalization */
export interface NormalizeRevisionRunsOptions {
  revisionInfo?: RevisionDefaultsInput;
  fallbackAuthor?: string;
  parseMarkers?: boolean;
  nextRevisionId?: () => number;
}

/** Options for tracked-change diff compilation */
export interface CompileTrackedChangesOptions extends RevisionDefaultsInput {
  granularity?: TrackChangesGranularity;
}

export interface CompareManifestEntry {
  type: 'added' | 'removed' | 'modified' | 'moved';
  elementType: 'heading' | 'paragraph' | 'table';
  pageIndex: number;
  elementIndex: number;
  mode?: 'text' | 'format' | 'property';
  beforeText?: string;
  afterText?: string;
}

export interface CompiledTrackedChangesResult {
  document: DocxDocument;
  compareManifest: CompareManifestEntry[];
}

/** Revision-aware text span */
export interface RevisionTextSpan {
  /** The text content */
  text: string;
  /** Revision type (null = no revision, normal text) */
  revision?: RevisionType;
  /** Revision author */
  author?: RevisionAuthor;
  /** Revision date */
  date?: Date;
  /** Revision ID */
  revisionId?: string | number;
  /** Standard text formatting */
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  link?: string;
}

/** Result of applying revisions to a document */
export interface RevisionResult {
  /** Total revisions tracked */
  totalRevisions: number;
  /** Insertions count */
  insertions: number;
  /** Deletions count */
  deletions: number;
  /** Format changes count */
  formatChanges: number;
  /** Unique authors */
  authors: RevisionAuthor[];
  /** Revision date range */
  dateRange?: { start: Date; end: Date };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default revision tracking configuration */
export const DEFAULT_REVISION_CONFIG: RevisionTrackingConfig = {
  enabled: false,
  defaultAuthor: {
    name: 'Runstamp',
    initials: 'RS',
  },
  showRevisionMarks: true,
  includeDate: true,
};

// =============================================================================
// REVISION TRACKER CLASS
// =============================================================================

/**
 * RevisionTracker manages tracked changes for a document.
 *
 * Usage:
 * ```typescript
 * const tracker = new RevisionTracker({
 *   enabled: true,
 *   defaultAuthor: { name: 'John Doe', initials: 'JD' },
 * });
 *
 * // Track an insertion
 * tracker.trackInsertion('new paragraph text', 'node-123');
 *
 * // Track a deletion
 * tracker.trackDeletion('removed text', 'node-456');
 *
 * // Track a replacement (delete + insert)
 * tracker.trackReplacement('old text', 'new text', 'node-789');
 *
 * // Get all revisions
 * const revisions = tracker.getRevisions();
 * ```
 */
export class RevisionTracker {
  private config: RevisionTrackingConfig;
  private revisions: Map<string, Revision> = new Map();
  private revisionCounter = 0;

  constructor(config: Partial<RevisionTrackingConfig> = {}) {
    this.config = { ...DEFAULT_REVISION_CONFIG, ...config };
  }

  /**
   * Generate a unique revision ID
   */
  private generateId(): string {
    if (this.config.idGenerator) {
      return this.config.idGenerator();
    }
    return `rev-${++this.revisionCounter}-${Date.now()}`;
  }

  /**
   * Track an insertion
   */
  trackInsertion(
    content: string,
    nodeId?: string,
    author?: RevisionAuthor,
    date?: Date
  ): Revision {
    const revision: Revision = {
      id: this.generateId(),
      type: 'insert',
      author: author || this.config.defaultAuthor,
      date: date || new Date(),
      content,
      nodeId,
      position: this.revisions.size,
    };

    this.revisions.set(revision.id, revision);
    return revision;
  }

  /**
   * Track a deletion
   */
  trackDeletion(
    content: string,
    nodeId?: string,
    author?: RevisionAuthor,
    date?: Date
  ): Revision {
    const revision: Revision = {
      id: this.generateId(),
      type: 'delete',
      author: author || this.config.defaultAuthor,
      date: date || new Date(),
      content,
      nodeId,
      position: this.revisions.size,
    };

    this.revisions.set(revision.id, revision);
    return revision;
  }

  /**
   * Track a replacement (delete + insert as a pair)
   */
  trackReplacement(
    originalContent: string,
    newContent: string,
    nodeId?: string,
    author?: RevisionAuthor,
    date?: Date
  ): { deletion: Revision; insertion: Revision } {
    const revisionAuthor = author || this.config.defaultAuthor;
    const revisionDate = date || new Date();

    const deletion = this.trackDeletion(originalContent, nodeId, revisionAuthor, revisionDate);
    const insertion = this.trackInsertion(newContent, nodeId, revisionAuthor, revisionDate);

    // Link them as a pair
    deletion.originalContent = originalContent;
    insertion.originalContent = originalContent;

    return { deletion, insertion };
  }

  /**
   * Track a format change (e.g., bold applied)
   */
  trackFormatChange(
    content: string,
    nodeId?: string,
    author?: RevisionAuthor,
    date?: Date
  ): Revision {
    const revision: Revision = {
      id: this.generateId(),
      type: 'format',
      author: author || this.config.defaultAuthor,
      date: date || new Date(),
      content,
      nodeId,
      position: this.revisions.size,
    };

    this.revisions.set(revision.id, revision);
    return revision;
  }

  /**
   * Get all revisions
   */
  getRevisions(): Revision[] {
    return Array.from(this.revisions.values()).sort((a, b) =>
      (a.position || 0) - (b.position || 0)
    );
  }

  /**
   * Get revisions for a specific node
   */
  getRevisionsForNode(nodeId: string): Revision[] {
    return this.getRevisions().filter(r => r.nodeId === nodeId);
  }

  /**
   * Get revision by ID
   */
  getRevision(id: string): Revision | undefined {
    return this.revisions.get(id);
  }

  /**
   * Remove a revision
   */
  removeRevision(id: string): boolean {
    return this.revisions.delete(id);
  }

  /**
   * Clear all revisions
   */
  clearRevisions(): void {
    this.revisions.clear();
    this.revisionCounter = 0;
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get the default author
   */
  getDefaultAuthor(): RevisionAuthor {
    return this.config.defaultAuthor;
  }

  /**
   * Set the default author
   */
  setDefaultAuthor(author: RevisionAuthor): void {
    this.config.defaultAuthor = author;
  }

  /**
   * Get revision statistics
   */
  getStats(): RevisionResult {
    const revisions = this.getRevisions();
    const authors = new Map<string, RevisionAuthor>();
    let insertions = 0;
    let deletions = 0;
    let formatChanges = 0;
    let minDate: Date | undefined;
    let maxDate: Date | undefined;

    for (const rev of revisions) {
      // Count by type
      switch (rev.type) {
        case 'insert':
          insertions++;
          break;
        case 'delete':
          deletions++;
          break;
        case 'format':
          formatChanges++;
          break;
      }

      // Track authors
      const authorKey = rev.author.id || rev.author.name;
      if (!authors.has(authorKey)) {
        authors.set(authorKey, rev.author);
      }

      // Track date range
      if (!minDate || rev.date < minDate) {
        minDate = rev.date;
      }
      if (!maxDate || rev.date > maxDate) {
        maxDate = rev.date;
      }
    }

    return {
      totalRevisions: revisions.length,
      insertions,
      deletions,
      formatChanges,
      authors: Array.from(authors.values()),
      dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : undefined,
    };
  }

  /**
   * Export revisions to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      config: {
        enabled: this.config.enabled,
        defaultAuthor: this.config.defaultAuthor,
        showRevisionMarks: this.config.showRevisionMarks,
        includeDate: this.config.includeDate,
      },
      revisions: this.getRevisions(),
      stats: this.getStats(),
    }, null, 2);
  }

  /**
   * Import revisions from JSON
   */
  static fromJSON(json: string): RevisionTracker {
    const data = JSON.parse(json);
    const tracker = new RevisionTracker(data.config);

    for (const rev of data.revisions || []) {
      rev.date = new Date(rev.date);
      tracker.revisions.set(rev.id, rev);
    }

    return tracker;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a revision-aware text span for insertion
 */
export function createInsertedSpan(
  text: string,
  author: RevisionAuthor,
  date?: Date,
  formatting?: Partial<RevisionTextSpan>
): RevisionTextSpan {
  return {
    text,
    revision: 'insert',
    author,
    date: date || new Date(),
    ...formatting,
  };
}

/**
 * Create a revision-aware text span for deletion
 */
export function createDeletedSpan(
  text: string,
  author: RevisionAuthor,
  date?: Date,
  formatting?: Partial<RevisionTextSpan>
): RevisionTextSpan {
  return {
    text,
    revision: 'delete',
    author,
    date: date || new Date(),
    ...formatting,
  };
}

/**
 * Parse text with revision markers into spans.
 *
 * Markers:
 * - `{{+text+}}` = insertion
 * - `{{-text-}}` = deletion
 * - `{{~old~new~}}` = replacement
 *
 * Example:
 * ```typescript
 * const spans = parseRevisionMarkers(
 *   'Hello {{-world-}}{{+everyone+}}!',
 *   { name: 'Editor' }
 * );
 * // Returns:
 * // [
 * //   { text: 'Hello ', revision: undefined },
 * //   { text: 'world', revision: 'delete', author: { name: 'Editor' } },
 * //   { text: 'everyone', revision: 'insert', author: { name: 'Editor' } },
 * //   { text: '!', revision: undefined },
 * // ]
 * ```
 */
export function parseRevisionMarkers(
  text: string,
  author: RevisionAuthor,
  date?: Date
): RevisionTextSpan[] {
  const spans: RevisionTextSpan[] = [];
  const revDate = date || new Date();

  // Regex to match revision markers
  // {{+inserted+}} or {{-deleted-}} or {{~old~new~}}
  const markerRegex = /\{\{\+([^+]*)\+\}\}|\{\{-([^-]*)-\}\}|\{\{~([^~]*)~([^~]*)~\}\}/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(text)) !== null) {
    // Add text before the marker
    if (match.index > lastIndex) {
      spans.push({
        text: text.slice(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined) {
      // Insertion: {{+text+}}
      spans.push({
        text: match[1],
        revision: 'insert',
        author,
        date: revDate,
      });
    } else if (match[2] !== undefined) {
      // Deletion: {{-text-}}
      spans.push({
        text: match[2],
        revision: 'delete',
        author,
        date: revDate,
      });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // Replacement: {{~old~new~}}
      spans.push({
        text: match[3],
        revision: 'delete',
        author,
        date: revDate,
      });
      spans.push({
        text: match[4],
        revision: 'insert',
        author,
        date: revDate,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last marker
  if (lastIndex < text.length) {
    spans.push({
      text: text.slice(lastIndex),
    });
  }

  return spans;
}

/**
 * Check if text contains revision markers
 */
export function hasRevisionMarkers(text: string): boolean {
  return /\{\{\+[^+]*\+\}\}|\{\{-[^-]*-\}\}|\{\{~[^~]*~[^~]*~\}\}/.test(text);
}

/**
 * Strip revision markers from text, keeping only final content
 * (keeps insertions, removes deletions)
 */
export function stripRevisionMarkers(text: string): string {
  return text
    .replace(/\{\{\+([^+]*)\+\}\}/g, '$1')  // Keep insertions
    .replace(/\{\{-[^-]*-\}\}/g, '')         // Remove deletions
    .replace(/\{\{~[^~]*~([^~]*)~\}\}/g, '$1'); // Keep new text in replacements
}

/**
 * Accept all revisions (return text with insertions kept, deletions removed)
 */
export function acceptAllRevisions(text: string): string {
  return stripRevisionMarkers(text);
}

/**
 * Reject all revisions (return text with deletions kept, insertions removed)
 */
export function rejectAllRevisions(text: string): string {
  return text
    .replace(/\{\{\+[^+]*\+\}\}/g, '')       // Remove insertions
    .replace(/\{\{-([^-]*)-\}\}/g, '$1')     // Keep deletions
    .replace(/\{\{~([^~]*)~[^~]*~\}\}/g, '$1'); // Keep old text in replacements
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRevisionDate(value?: string | Date): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

export function generateRsid(seed?: string): string {
  if (seed && /^[0-9A-Fa-f]{8}$/.test(seed)) {
    return seed.toUpperCase();
  }
  const source = seed ?? `${Date.now()}-${Math.random()}`;
  return hashString(source).toString(16).toUpperCase().padStart(8, '0').slice(-8);
}

export function resolveRevisionInfo(
  input: RevisionDefaultsInput = {},
  fallbackAuthor = 'Runstamp'
): ResolvedRevisionInfo {
  return {
    author: input.author?.trim() || fallbackAuthor,
    date: normalizeRevisionDate(input.date),
    rsid: generateRsid(input.rsid),
  };
}

export function createRevisionIdAllocator(start = 1): () => number {
  let current = Math.max(1, Math.trunc(start));
  return () => current++;
}

function cloneRunStyle(run?: Pick<DocxTextRun, 'style' | 'hyperlink'>): Pick<DocxTextRun, 'style' | 'hyperlink'> {
  return {
    style: run?.style ? cloneValue(run.style) : undefined,
    hyperlink: run?.hyperlink,
  };
}

function extractStyleSnapshot(run?: DocxTextRun): RevisionStyleSnapshot | undefined {
  if (!run?.style) {
    return undefined;
  }
  return cloneValue(run.style);
}

function normalizeRunRevision(
  revision: RunRevision | undefined,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): RunRevision | undefined {
  if (!revision) {
    return undefined;
  }

  return {
    type: revision.type,
    id: revision.id ?? nextRevisionId(),
    author: revision.author ?? revisionInfo.author,
    date: revision.date ?? revisionInfo.date,
    beforeStyle: revision.beforeStyle ? cloneValue(revision.beforeStyle) : undefined,
  };
}

function normalizeParagraphRevision(
  revision: ParagraphRevision | undefined,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): ParagraphRevision | undefined {
  if (!revision) {
    return undefined;
  }

  return {
    ...cloneValue(revision),
    id: revision.id ?? nextRevisionId(),
    author: revision.author ?? revisionInfo.author,
    date: revision.date ?? revisionInfo.date,
    before: revision.before ? cloneValue(revision.before) : undefined,
  };
}

function normalizeTableRevision(
  revision: TableRevision | undefined,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): TableRevision | undefined {
  if (!revision) {
    return undefined;
  }

  return {
    ...cloneValue(revision),
    id: revision.id ?? nextRevisionId(),
    author: revision.author ?? revisionInfo.author,
    date: revision.date ?? revisionInfo.date,
    before: revision.before ? cloneValue(revision.before) : undefined,
  };
}

function normalizeTableCellRevision(
  revision: TableCellRevision | undefined,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): TableCellRevision | undefined {
  if (!revision) {
    return undefined;
  }

  return {
    ...cloneValue(revision),
    id: revision.id ?? nextRevisionId(),
    author: revision.author ?? revisionInfo.author,
    date: revision.date ?? revisionInfo.date,
  };
}

function extractParagraphRevisionProperties(element: LooseDocxElement): ParagraphRevisionProperties | undefined {
  const alignment = element.style?.textAlign;
  const keepLines = element.keepLines ?? element.docx?.keepLines;
  const keepNext = element.keepNext ?? element.docx?.keepNext;
  const pageBreakBefore = element.pageBreakBefore ?? element.docx?.pageBreakBefore;
  const indent = element.indent ?? element.docx?.indent;

  if (
    alignment === undefined
    && keepLines === undefined
    && keepNext === undefined
    && pageBreakBefore === undefined
    && indent === undefined
  ) {
    return undefined;
  }

  return {
    ...(alignment ? { textAlign: alignment } : {}),
    ...(keepLines !== undefined ? { keepLines: !!keepLines } : {}),
    ...(keepNext !== undefined ? { keepNext: !!keepNext } : {}),
    ...(pageBreakBefore !== undefined ? { pageBreakBefore: !!pageBreakBefore } : {}),
    ...(indent ? { indent: cloneValue(indent) } : {}),
  };
}

function extractTableRevisionProperties(element: LooseTableElement): TableRevisionProperties | undefined {
  if (!element.caption && !element.tableDescription && !element.tableCaption) {
    return undefined;
  }

  return {
    ...(element.caption ? { caption: element.caption } : {}),
    ...(element.tableDescription ? { tableDescription: element.tableDescription } : {}),
    ...(element.tableCaption ? { tableCaption: element.tableCaption } : {}),
  };
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function areStylesEqual(left: DocxTextRun['style'], right: DocxTextRun['style']): boolean {
  return areValuesEqual(left, right);
}

function buildMoveName(prefix: string, content: string, revisionId: number): string {
  const hash = hashString(`${prefix}:${content}`).toString(16).slice(-6);
  return `${prefix}-${hash}-${revisionId}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp: number[][] = Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => {
      if (rowIndex === 0) return colIndex;
      if (colIndex === 0) return rowIndex;
      return 0;
    })
  );

  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      if (left[row - 1] === right[col - 1]) {
        dp[row][col] = dp[row - 1][col - 1];
      } else {
        dp[row][col] = Math.min(
          dp[row - 1][col] + 1,
          dp[row][col - 1] + 1,
          dp[row - 1][col - 1] + 1
        );
      }
    }
  }

  return dp[rows - 1][cols - 1];
}

function calculateSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeWhitespace(left);
  const normalizedRight = normalizeWhitespace(right);

  if (!normalizedLeft && !normalizedRight) {
    return 1;
  }
  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }
  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const distance = levenshteinDistance(normalizedLeft, normalizedRight);
  return 1 - (distance / Math.max(normalizedLeft.length, normalizedRight.length, 1));
}

function getTableSignature(element: LooseTableElement): string {
  return normalizeWhitespace(
    (Array.isArray(element.rows) ? element.rows : [])
      .map((row) =>
        (Array.isArray(row.cells) ? row.cells : [])
          .map((cell) => normalizeWhitespace(cell.text ?? cell.runs?.map((run) => run.text).join('') ?? ''))
          .join('|')
      )
      .join('\n')
  );
}

function spanToRun(
  span: RevisionTextSpan,
  baseRun: Pick<DocxTextRun, 'style' | 'hyperlink'>,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): DocxTextRun | null {
  if (!span.text) {
    return null;
  }

  const revision = span.revision && span.revision !== 'move'
    ? {
        type: span.revision,
        id: typeof span.revisionId === 'number' ? span.revisionId : nextRevisionId(),
        author: span.author?.name ?? revisionInfo.author,
        date: span.date?.toISOString() ?? revisionInfo.date,
      } satisfies RunRevision
    : undefined;

  return {
    text: span.text,
    ...cloneRunStyle(baseRun),
    revision,
  };
}

export function normalizeDocxTextRuns(
  runs: DocxTextRun[] | undefined,
  fallbackText: string | undefined,
  options: NormalizeRevisionRunsOptions = {}
): DocxTextRun[] {
  const nextRevisionId = options.nextRevisionId ?? createRevisionIdAllocator();
  const revisionInfo = resolveRevisionInfo(options.revisionInfo, options.fallbackAuthor);
  const parseMarkers = options.parseMarkers ?? true;
  const sourceRuns = Array.isArray(runs) && runs.length > 0
    ? runs
    : fallbackText
      ? [{ text: fallbackText }]
      : [];

  const normalizedRuns: DocxTextRun[] = [];

  for (const run of sourceRuns) {
    if (!run?.text) {
      continue;
    }

    if (!run.revision && parseMarkers && hasRevisionMarkers(run.text)) {
      const spans = parseRevisionMarkers(
        run.text,
        { name: revisionInfo.author },
        new Date(revisionInfo.date)
      );
      for (const span of spans) {
        const normalizedRun = spanToRun(span, cloneRunStyle(run), revisionInfo, nextRevisionId);
        if (normalizedRun) {
          normalizedRuns.push(normalizedRun);
        }
      }
      continue;
    }

    const normalizedRevision = normalizeRunRevision(
      run.revision as RunRevision | undefined,
      revisionInfo,
      nextRevisionId
    );

    if ((normalizedRevision?.type === 'insert' || normalizedRevision?.type === 'delete') && run.text.length === 0) {
      continue;
    }

    normalizedRuns.push({
      text: run.text,
      ...cloneRunStyle(run),
      revision: normalizedRevision,
    });
  }

  return normalizedRuns;
}

function isTextualElement(element: LooseDocxElement): boolean {
  return element.type === 'heading'
    || element.type === 'paragraph'
    || element.type === 'text-run'
    || element.type === 'list';
}

function getElementText(element: LooseDocxElement): string {
  const elementAny = element as LooseDocxElement;
  switch (element.type) {
    case 'heading':
    case 'paragraph':
    case 'text-run':
      if (Array.isArray(elementAny.runs) && elementAny.runs.length > 0) {
        return elementAny.runs.map((run: DocxTextRun) => run.text).join('');
      }
      return elementAny.text ?? '';
    case 'list':
      return (Array.isArray(elementAny.items) ? elementAny.items : [])
        .map((item: { text?: string; runs?: DocxTextRun[] }) => item.text ?? item.runs?.map((run) => run.text).join('') ?? '')
        .join('\n');
    case 'table':
      return getTableSignature(element as LooseTableElement);
    default:
      return JSON.stringify(element);
  }
}

function createRunsFromText(
  text: string,
  baseRun: Pick<DocxTextRun, 'style' | 'hyperlink'> = {}
): DocxTextRun[] {
  if (!text) {
    return [];
  }
  return [{
    text,
    ...cloneRunStyle(baseRun),
  }];
}

function applyRevisionToRuns(
  runs: DocxTextRun[],
  type: 'insert' | 'delete',
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): DocxTextRun[] {
  return runs
    .filter((run) => run.text.length > 0)
    .map((run) => ({
      ...cloneValue(run),
      revision: {
        type,
        id: nextRevisionId(),
        author: revisionInfo.author,
        date: revisionInfo.date,
      } satisfies RunRevision,
    }));
}

function tokenizeText(text: string, granularity: TrackChangesGranularity): string[] {
  if (!text) {
    return [];
  }
  if (granularity === 'paragraph') {
    return [text];
  }
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity });
    return Array.from(segmenter.segment(text), (segment) => segment.segment).filter(Boolean);
  }
  if (granularity === 'sentence') {
    return text.split(/(?<=[.!?])(\s+)/g).filter(Boolean);
  }
  return text.split(/(\s+|[.,!?;:()[\]{}]+)/g).filter(Boolean);
}

type TokenDiff =
  | { type: 'equal'; values: string[] }
  | { type: 'insert'; values: string[] }
  | { type: 'delete'; values: string[] };

function diffTokenArrays(before: string[], after: string[]): TokenDiff[] {
  const rows = before.length + 1;
  const cols = after.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      if (before[i] === after[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diffs: TokenDiff[] = [];
  let i = 0;
  let j = 0;

  const push = (type: TokenDiff['type'], value: string) => {
    const last = diffs[diffs.length - 1];
    if (last?.type === type) {
      last.values.push(value);
    } else {
      diffs.push({ type, values: [value] } as TokenDiff);
    }
  };

  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      push('equal', before[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('delete', before[i]);
      i++;
    } else {
      push('insert', after[j]);
      j++;
    }
  }

  while (i < before.length) {
    push('delete', before[i]);
    i++;
  }

  while (j < after.length) {
    push('insert', after[j]);
    j++;
  }

  return diffs;
}

function buildDiffRuns(
  beforeText: string,
  afterText: string,
  beforeBase: Pick<DocxTextRun, 'style' | 'hyperlink'>,
  afterBase: Pick<DocxTextRun, 'style' | 'hyperlink'>,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number,
  granularity: TrackChangesGranularity
): DocxTextRun[] {
  if (beforeText === afterText) {
    return createRunsFromText(afterText, afterBase);
  }

  const diffs = diffTokenArrays(tokenizeText(beforeText, granularity), tokenizeText(afterText, granularity));
  const runs: DocxTextRun[] = [];

  for (const diff of diffs) {
    const text = diff.values.join('');
    if (!text) {
      continue;
    }

    if (diff.type === 'equal') {
      runs.push(...createRunsFromText(text, afterBase));
    } else if (diff.type === 'insert') {
      runs.push(...applyRevisionToRuns(createRunsFromText(text, afterBase), 'insert', revisionInfo, nextRevisionId));
    } else {
      runs.push(...applyRevisionToRuns(createRunsFromText(text, beforeBase), 'delete', revisionInfo, nextRevisionId));
    }
  }

  return runs;
}

function mergeAdjacentRuns(runs: DocxTextRun[]): DocxTextRun[] {
  const merged: DocxTextRun[] = [];

  for (const run of runs) {
    if (!run.text) {
      continue;
    }

    const last = merged[merged.length - 1];
    if (
      last
      && last.hyperlink === run.hyperlink
      && areStylesEqual(last.style, run.style)
      && areValuesEqual(last.revision, run.revision)
    ) {
      last.text += run.text;
      continue;
    }

    merged.push(cloneValue(run));
  }

  return merged;
}

function buildFormatRevisionRuns(
  beforeRuns: DocxTextRun[],
  afterRuns: DocxTextRun[],
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): {
  runs: DocxTextRun[];
  changed: boolean;
} {
  const revisedRuns: DocxTextRun[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;
  let beforeOffset = 0;
  let afterOffset = 0;
  let changed = false;

  while (beforeIndex < beforeRuns.length && afterIndex < afterRuns.length) {
    const beforeRun = beforeRuns[beforeIndex];
    const afterRun = afterRuns[afterIndex];
    const beforeText = beforeRun.text.slice(beforeOffset);
    const afterText = afterRun.text.slice(afterOffset);
    const segmentLength = Math.min(beforeText.length, afterText.length);

    if (segmentLength === 0) {
      if (beforeText.length === 0) {
        beforeIndex += 1;
        beforeOffset = 0;
      }
      if (afterText.length === 0) {
        afterIndex += 1;
        afterOffset = 0;
      }
      continue;
    }

    const segmentText = afterText.slice(0, segmentLength);
    const styleChanged = !areStylesEqual(beforeRun.style, afterRun.style) || beforeRun.hyperlink !== afterRun.hyperlink;

    revisedRuns.push({
      text: segmentText,
      ...cloneRunStyle(afterRun),
      ...(styleChanged ? {
        revision: {
          type: 'format',
          id: nextRevisionId(),
          author: revisionInfo.author,
          date: revisionInfo.date,
          beforeStyle: extractStyleSnapshot(beforeRun),
        } satisfies RunRevision,
      } : {}),
    });

    changed = changed || styleChanged;
    beforeOffset += segmentLength;
    afterOffset += segmentLength;

    if (beforeOffset >= beforeRun.text.length) {
      beforeIndex += 1;
      beforeOffset = 0;
    }

    if (afterOffset >= afterRun.text.length) {
      afterIndex += 1;
      afterOffset = 0;
    }
  }

  if (beforeIndex !== beforeRuns.length || afterIndex !== afterRuns.length) {
    return {
      runs: afterRuns.map((run) => cloneValue(run)),
      changed: !areValuesEqual(beforeRuns, afterRuns),
    };
  }

  return {
    runs: mergeAdjacentRuns(revisedRuns),
    changed,
  };
}

function cloneElementWithRuns(
  element: LooseTextElement,
  runs: DocxTextRun[],
  text: string
): LooseTextElement {
  const clone = cloneValue(element);
  clone.runs = runs;
  clone.text = text;
  return clone;
}

function createTrackedListElement(
  element: LooseDocxElement,
  type: 'insert' | 'delete',
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): LooseDocxElement {
  const clone = cloneValue(element);
  clone.items = (Array.isArray(clone.items) ? clone.items : []).map((item: { runs?: DocxTextRun[]; text?: string }) => {
    const baseRuns = normalizeDocxTextRuns(item.runs, item.text, {
      revisionInfo,
      parseMarkers: false,
      nextRevisionId,
    });
    const revisedRuns = applyRevisionToRuns(baseRuns, type, revisionInfo, nextRevisionId);
    return {
      ...item,
      runs: revisedRuns,
      text: revisedRuns.map((run) => run.text).join(''),
    };
  });
  return clone;
}

function createTrackedTableElement(
  element: LooseTableElement,
  type: 'insert' | 'delete',
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): LooseTableElement {
  const clone = cloneValue(element);
  clone.rows = (Array.isArray(clone.rows) ? clone.rows : []).map((row: Record<string, any>, rowIndex: number) => ({
    ...row,
    cells: (Array.isArray(row.cells) ? row.cells : []).map((cell: Record<string, any>, colIndex: number) => {
      const baseRuns = normalizeDocxTextRuns(cell.runs, cell.text, {
        revisionInfo,
        parseMarkers: false,
        nextRevisionId,
      });
      const revisedRuns = applyRevisionToRuns(baseRuns, type, revisionInfo, nextRevisionId);
      return {
        ...cell,
        row: cell.row ?? rowIndex,
        col: cell.col ?? colIndex,
        runs: revisedRuns,
        text: revisedRuns.map((run) => run.text).join(''),
      };
    }),
  }));
  return clone;
}

function createTrackedElement(
  element: LooseDocxElement,
  type: 'insert' | 'delete',
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number,
  options: { tableStrategy?: 'structural' | 'block' } = {}
): LooseDocxElement | null {
  if (element.type === 'table' && options.tableStrategy === 'block') {
    return createTrackedTableElement(element as LooseTableElement, type, revisionInfo, nextRevisionId);
  }

  if (!isTextualElement(element)) {
    return type === 'insert' ? cloneValue(element) : null;
  }

  if (element.type === 'list') {
    return createTrackedListElement(element, type, revisionInfo, nextRevisionId);
  }

  const baseRuns = normalizeDocxTextRuns(
    element.runs,
    element.text,
    { revisionInfo, parseMarkers: false, nextRevisionId }
  );
  const revisedRuns = applyRevisionToRuns(baseRuns, type, revisionInfo, nextRevisionId);
  if (revisedRuns.length === 0) {
    return null;
  }
  return cloneElementWithRuns(element as LooseTextElement, revisedRuns, revisedRuns.map((run) => run.text).join(''));
}

function createMovedTextElement(
  element: LooseTextElement,
  type: 'moveFrom' | 'moveTo',
  moveName: string,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): LooseTextElement {
  const clone = cloneValue(element);
  clone.revision = {
    type,
    id: nextRevisionId(),
    author: revisionInfo.author,
    date: revisionInfo.date,
    moveName,
  } satisfies ParagraphRevision;
  return clone;
}

function createParagraphPropertyRevision(
  after: LooseTextElement,
  before: LooseTextElement,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): LooseTextElement {
  const clone = cloneValue(after);
  const beforeProperties = extractParagraphRevisionProperties(before) ?? {};

  clone.revision = {
    type: 'property',
    id: nextRevisionId(),
    author: revisionInfo.author,
    date: revisionInfo.date,
    before: beforeProperties,
  } satisfies ParagraphRevision;
  return clone;
}

function createTrackedTableCell(
  cell: Record<string, any>,
  type: 'insert' | 'delete',
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): Record<string, any> {
  const clone = cloneValue(cell);
  clone.revision = {
    type,
    id: nextRevisionId(),
    author: revisionInfo.author,
    date: revisionInfo.date,
  } satisfies TableCellRevision;
  return clone;
}

function mergeTableRowCells(
  beforeRow: Record<string, any> | undefined,
  afterRow: Record<string, any> | undefined,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): Record<string, any>[] {
  const beforeCells = Array.isArray(beforeRow?.cells) ? beforeRow.cells : [];
  const afterCells = Array.isArray(afterRow?.cells) ? afterRow.cells : [];

  if (beforeCells.length === 0) {
    return afterCells.map((cell) => createTrackedTableCell(cell, 'insert', revisionInfo, nextRevisionId));
  }

  if (afterCells.length === 0) {
    return beforeCells.map((cell) => createTrackedTableCell(cell, 'delete', revisionInfo, nextRevisionId));
  }

  const beforeKeys = beforeCells.map((cell) => `${cell.colSpan ?? 1}x${cell.rowSpan ?? 1}:${normalizeWhitespace(cell.text ?? cell.runs?.map((run: DocxTextRun) => run.text).join('') ?? '')}`);
  const afterKeys = afterCells.map((cell) => `${cell.colSpan ?? 1}x${cell.rowSpan ?? 1}:${normalizeWhitespace(cell.text ?? cell.runs?.map((run: DocxTextRun) => run.text).join('') ?? '')}`);
  const diffs = diffTokenArrays(beforeKeys, afterKeys);
  const merged: Record<string, any>[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  for (const diff of diffs) {
    if (diff.type === 'equal') {
      for (let offset = 0; offset < diff.values.length; offset++) {
        merged.push(cloneValue(afterCells[afterIndex + offset]));
      }
      beforeIndex += diff.values.length;
      afterIndex += diff.values.length;
      continue;
    }

    if (diff.type === 'delete') {
      for (let offset = 0; offset < diff.values.length; offset++) {
        merged.push(createTrackedTableCell(beforeCells[beforeIndex + offset], 'delete', revisionInfo, nextRevisionId));
      }
      beforeIndex += diff.values.length;
      continue;
    }

    for (let offset = 0; offset < diff.values.length; offset++) {
      merged.push(createTrackedTableCell(afterCells[afterIndex + offset], 'insert', revisionInfo, nextRevisionId));
    }
    afterIndex += diff.values.length;
  }

  return merged.map((cell, index) => ({
    ...cell,
    col: index,
  }));
}

function diffTableElements(
  before: LooseTableElement,
  after: LooseTableElement,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number
): LooseTableElement {
  const clone = cloneValue(after);
  const beforeProperties = extractTableRevisionProperties(before);
  const afterProperties = extractTableRevisionProperties(after);

  if (!areValuesEqual(beforeProperties, afterProperties)) {
    clone.revision = {
      type: 'property',
      id: nextRevisionId(),
      author: revisionInfo.author,
      date: revisionInfo.date,
      before: beforeProperties ?? {},
    } satisfies TableRevision;
  }

  const beforeRows = Array.isArray(before.rows) ? before.rows : [];
  const afterRows = Array.isArray(after.rows) ? after.rows : [];
  const mergedRows: Record<string, any>[] = [];
  const maxRows = Math.max(beforeRows.length, afterRows.length);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    const beforeRow = beforeRows[rowIndex];
    const afterRow = afterRows[rowIndex];
    const mergedCells = mergeTableRowCells(beforeRow, afterRow, revisionInfo, nextRevisionId);
    if (mergedCells.length === 0) {
      continue;
    }
    mergedRows.push({
      ...(afterRow ? cloneValue(afterRow) : cloneValue(beforeRow)),
      cells: mergedCells.map((cell, colIndex) => ({
        ...cell,
        row: rowIndex,
        col: colIndex,
      })),
    });
  }

  clone.rows = mergedRows;
  return clone;
}

interface MoveCandidate {
  index: number;
  element: LooseTextElement;
  normalizedText: string;
}

interface MoveMatch {
  beforeIndex: number;
  afterIndex: number;
  moveName: string;
}

function isMoveCandidateElement(element: LooseDocxElement): element is LooseTextElement {
  return element.type === 'heading' || element.type === 'paragraph';
}

function tokenizeMoveText(text: string): string[] {
  return normalizeWhitespace(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function calculateWordOverlap(left: string, right: string): number {
  const leftTokens = tokenizeMoveText(left);
  const rightTokens = tokenizeMoveText(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const rightCounts = new Map<string, number>();
  for (const token of rightTokens) {
    rightCounts.set(token, (rightCounts.get(token) ?? 0) + 1);
  }

  let overlap = 0;
  for (const token of leftTokens) {
    const count = rightCounts.get(token) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(token, count - 1);
    }
  }

  return overlap / Math.max(leftTokens.length, rightTokens.length, 1);
}

function collectMoveCandidates(
  beforeElements: LooseDocxElement[],
  afterElements: LooseDocxElement[],
  diffs: TokenDiff[]
): {
  deletions: MoveCandidate[];
  insertions: MoveCandidate[];
} {
  const deletions: MoveCandidate[] = [];
  const insertions: MoveCandidate[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  for (let diffIndex = 0; diffIndex < diffs.length; diffIndex += 1) {
    const diff = diffs[diffIndex];
    const previousType = diffIndex > 0 ? diffs[diffIndex - 1]?.type : undefined;
    const nextType = diffIndex + 1 < diffs.length ? diffs[diffIndex + 1]?.type : undefined;

    if (diff.type === 'equal') {
      beforeIndex += diff.values.length;
      afterIndex += diff.values.length;
      continue;
    }

    if (diff.type === 'delete') {
      const shouldSkip = previousType === 'insert' || nextType === 'insert';
      if (!shouldSkip) {
        const elements = beforeElements.slice(beforeIndex, beforeIndex + diff.values.length);
        for (let offset = 0; offset < elements.length; offset += 1) {
          const element = elements[offset];
          if (!isMoveCandidateElement(element)) {
            continue;
          }
          deletions.push({
            index: beforeIndex + offset,
            element,
            normalizedText: normalizeWhitespace(getElementText(element)),
          });
        }
      }
      beforeIndex += diff.values.length;
      continue;
    }

    const shouldSkip = previousType === 'delete' || nextType === 'delete';
    if (!shouldSkip) {
      const elements = afterElements.slice(afterIndex, afterIndex + diff.values.length);
      for (let offset = 0; offset < elements.length; offset += 1) {
        const element = elements[offset];
        if (!isMoveCandidateElement(element)) {
          continue;
        }
        insertions.push({
          index: afterIndex + offset,
          element,
          normalizedText: normalizeWhitespace(getElementText(element)),
        });
      }
    }
    afterIndex += diff.values.length;
  }

  return { deletions, insertions };
}

function findMoveMatches(
  beforeElements: LooseDocxElement[],
  afterElements: LooseDocxElement[],
  diffs: TokenDiff[],
  nextRevisionId: () => number
): {
  beforeToAfter: Map<number, MoveMatch>;
  afterToBefore: Map<number, MoveMatch>;
} {
  const { deletions, insertions } = collectMoveCandidates(beforeElements, afterElements, diffs);
  const beforeToAfter = new Map<number, MoveMatch>();
  const afterToBefore = new Map<number, MoveMatch>();
  const usedInsertions = new Set<number>();

  for (const deletion of deletions) {
    if (beforeToAfter.has(deletion.index)) {
      continue;
    }

    const exactCandidates = insertions.filter((insertion) =>
      !usedInsertions.has(insertion.index)
      && insertion.element.type === deletion.element.type
      && insertion.normalizedText.length > 0
      && insertion.normalizedText === deletion.normalizedText
    );

    if (exactCandidates.length === 1) {
      const exact = exactCandidates[0];
      const moveName = buildMoveName('move', deletion.normalizedText, nextRevisionId());
      const match = {
        beforeIndex: deletion.index,
        afterIndex: exact.index,
        moveName,
      } satisfies MoveMatch;
      beforeToAfter.set(deletion.index, match);
      afterToBefore.set(exact.index, match);
      usedInsertions.add(exact.index);
      continue;
    }

    let bestCandidate: MoveCandidate | undefined;
    let bestScore = 0;
    let secondBestScore = 0;

    for (const insertion of insertions) {
      if (
        usedInsertions.has(insertion.index)
        || insertion.element.type !== deletion.element.type
      ) {
        continue;
      }

      const overlapScore = calculateWordOverlap(deletion.normalizedText, insertion.normalizedText);
      const similarityScore = calculateSimilarity(deletion.normalizedText, insertion.normalizedText);
      const score = Math.min(overlapScore, similarityScore);

      if (score > bestScore) {
        secondBestScore = bestScore;
        bestScore = score;
        bestCandidate = insertion;
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }

    if (!bestCandidate || bestScore < 0.8 || bestScore - secondBestScore < 0.05 || bestScore < 0.98) {
      continue;
    }

    const moveName = buildMoveName('move', deletion.normalizedText, nextRevisionId());
    const match = {
      beforeIndex: deletion.index,
      afterIndex: bestCandidate.index,
      moveName,
    } satisfies MoveMatch;
    beforeToAfter.set(deletion.index, match);
    afterToBefore.set(bestCandidate.index, match);
    usedInsertions.add(bestCandidate.index);
  }

  return { beforeToAfter, afterToBefore };
}

function diffTextualElements(
  before: LooseTextElement,
  after: LooseTextElement,
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number,
  granularity: TrackChangesGranularity
): {
  element: LooseTextElement;
  mode: 'unchanged' | 'text' | 'format' | 'property';
} {
  const beforeRuns = normalizeDocxTextRuns(before.runs, before.text, {
    revisionInfo,
    parseMarkers: false,
    nextRevisionId,
  });
  const afterRuns = normalizeDocxTextRuns(after.runs, after.text, {
    revisionInfo,
    parseMarkers: false,
    nextRevisionId,
  });
  const beforeText = beforeRuns.map((run) => run.text).join('');
  const afterText = afterRuns.map((run) => run.text).join('');

  if (beforeText === afterText) {
    const formatted = buildFormatRevisionRuns(beforeRuns, afterRuns, revisionInfo, nextRevisionId);
    const beforeProperties = extractParagraphRevisionProperties(before);
    const afterProperties = extractParagraphRevisionProperties(after);

    if (formatted.changed) {
      const elementWithFormatting = cloneElementWithRuns(after, formatted.runs, afterText);
      if (!areValuesEqual(beforeProperties, afterProperties)) {
        elementWithFormatting.revision = {
          type: 'property',
          id: nextRevisionId(),
          author: revisionInfo.author,
          date: revisionInfo.date,
          before: beforeProperties ?? {},
        } satisfies ParagraphRevision;
        return {
          element: elementWithFormatting,
          mode: 'property',
        };
      }

      return {
        element: elementWithFormatting,
        mode: 'format',
      };
    }

    if (!areValuesEqual(beforeProperties, afterProperties)) {
      return {
        element: createParagraphPropertyRevision(after, before, revisionInfo, nextRevisionId),
        mode: 'property',
      };
    }
    return {
      element: cloneValue(after),
      mode: 'unchanged',
    };
  }

  const beforeBase = cloneRunStyle(beforeRuns[0] ?? before.runs?.[0]);
  const afterBase = cloneRunStyle(afterRuns[0] ?? after.runs?.[0]);
  const diffRuns = granularity === 'paragraph'
    ? [
        ...applyRevisionToRuns(createRunsFromText(beforeText, beforeBase), 'delete', revisionInfo, nextRevisionId),
        ...applyRevisionToRuns(createRunsFromText(afterText, afterBase), 'insert', revisionInfo, nextRevisionId),
      ]
    : buildDiffRuns(beforeText, afterText, beforeBase, afterBase, revisionInfo, nextRevisionId, granularity);

  return {
    element: cloneElementWithRuns(after, diffRuns, afterText),
    mode: diffRuns.some((run) => run.revision?.type === 'format') ? 'format' : 'text',
  };
}

interface DiffSequenceOptions {
  pageIndex: number;
  tableStrategy?: 'structural' | 'block';
}

function getCompareElementType(element: LooseDocxElement): 'heading' | 'paragraph' | 'table' | undefined {
  if (element.type === 'heading' || element.type === 'paragraph' || element.type === 'table') {
    return element.type;
  }
  return undefined;
}

function pushCompareChange(
  manifest: CompareManifestEntry[],
  result: LooseDocxElement[],
  element: LooseDocxElement,
  entry: Omit<CompareManifestEntry, 'elementType' | 'elementIndex'>
): void {
  const elementType = getCompareElementType(element);
  if (!elementType) {
    return;
  }

  manifest.push({
    ...entry,
    elementType,
    elementIndex: result.length - 1,
  });
}

function diffElementSequence(
  beforeElements: LooseDocxElement[],
  afterElements: LooseDocxElement[],
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number,
  granularity: TrackChangesGranularity,
  options: DiffSequenceOptions
): {
  elements: LooseDocxElement[];
  compareManifest: CompareManifestEntry[];
} {
  const result: LooseDocxElement[] = [];
  const compareManifest: CompareManifestEntry[] = [];
  const beforeKeys = beforeElements.map((element) => `${element.type}:${getElementText(element)}`);
  const afterKeys = afterElements.map((element) => `${element.type}:${getElementText(element)}`);
  const diffs = diffTokenArrays(beforeKeys, afterKeys);
  const moveMatches = findMoveMatches(beforeElements, afterElements, diffs, nextRevisionId);

  let beforeIndex = 0;
  let afterIndex = 0;

  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i];
    if (diff.type === 'equal') {
      for (let offset = 0; offset < diff.values.length; offset++) {
        const beforeElement = beforeElements[beforeIndex + offset];
        const afterElement = afterElements[afterIndex + offset];

        if (beforeElement.type === afterElement.type) {
          if (afterElement.type === 'table') {
            if (options.tableStrategy === 'block') {
              result.push(cloneValue(afterElement));
              continue;
            }

            result.push(
              diffTableElements(
                beforeElement as LooseTableElement,
                afterElement as LooseTableElement,
                revisionInfo,
                nextRevisionId,
              )
            );
            continue;
          }

          if (isMoveCandidateElement(beforeElement) && isMoveCandidateElement(afterElement)) {
            const diffed = diffTextualElements(beforeElement, afterElement, revisionInfo, nextRevisionId, granularity);
            result.push(diffed.element);
            if (diffed.mode !== 'unchanged') {
              pushCompareChange(compareManifest, result, diffed.element, {
                type: 'modified',
                pageIndex: options.pageIndex,
                mode: diffed.mode,
                beforeText: getElementText(beforeElement),
                afterText: getElementText(afterElement),
              });
            }
            continue;
          }
        }

        result.push(cloneValue(afterElement));
      }
      beforeIndex += diff.values.length;
      afterIndex += diff.values.length;
      continue;
    }

    if (diff.type === 'delete' && diffs[i + 1]?.type === 'insert') {
      const deletions = beforeElements.slice(beforeIndex, beforeIndex + diff.values.length);
      const insertions = afterElements.slice(afterIndex, afterIndex + diffs[i + 1].values.length);
      const pairedCount = Math.min(deletions.length, insertions.length);

      for (let offset = 0; offset < pairedCount; offset++) {
        const beforeElement = deletions[offset];
        const afterElement = insertions[offset];
        if (beforeElement.type === afterElement.type && beforeElement.type === 'table') {
          if (options.tableStrategy === 'block') {
            const deleted = createTrackedElement(beforeElement, 'delete', revisionInfo, nextRevisionId, {
              tableStrategy: 'block',
            });
            if (deleted) {
              result.push(deleted);
              pushCompareChange(compareManifest, result, deleted, {
                type: 'removed',
                pageIndex: options.pageIndex,
              });
            }

            const inserted = createTrackedElement(afterElement, 'insert', revisionInfo, nextRevisionId, {
              tableStrategy: 'block',
            });
            if (inserted) {
              result.push(inserted);
              pushCompareChange(compareManifest, result, inserted, {
                type: 'added',
                pageIndex: options.pageIndex,
              });
            }
          } else {
            result.push(
              diffTableElements(
                beforeElement as LooseTableElement,
                afterElement as LooseTableElement,
                revisionInfo,
                nextRevisionId,
              )
            );
          }
        } else if (
          beforeElement.type === afterElement.type &&
          beforeElement.type !== 'list' &&
          beforeElement.type !== 'image' &&
          beforeElement.type !== 'chart' &&
          beforeElement.type !== 'shape' &&
          beforeElement.type !== 'container'
        ) {
          const diffed = diffTextualElements(
            beforeElement as LooseTextElement,
            afterElement as LooseTextElement,
            revisionInfo,
            nextRevisionId,
            granularity
          );
          result.push(diffed.element);
          if (diffed.mode !== 'unchanged') {
            pushCompareChange(compareManifest, result, diffed.element, {
              type: 'modified',
              pageIndex: options.pageIndex,
              mode: diffed.mode,
              beforeText: getElementText(beforeElement),
              afterText: getElementText(afterElement),
            });
          }
        } else {
          const deleted = createTrackedElement(beforeElement, 'delete', revisionInfo, nextRevisionId, {
            tableStrategy: options.tableStrategy,
          });
          if (deleted) {
            result.push(deleted);
            pushCompareChange(compareManifest, result, deleted, {
              type: 'removed',
              pageIndex: options.pageIndex,
            });
          }
          const inserted = createTrackedElement(afterElement, 'insert', revisionInfo, nextRevisionId, {
            tableStrategy: options.tableStrategy,
          });
          if (inserted) {
            result.push(inserted);
            pushCompareChange(compareManifest, result, inserted, {
              type: 'added',
              pageIndex: options.pageIndex,
            });
          }
        }
      }

      for (let offset = pairedCount; offset < deletions.length; offset++) {
        const deleted = createTrackedElement(deletions[offset], 'delete', revisionInfo, nextRevisionId, {
          tableStrategy: options.tableStrategy,
        });
        if (deleted) {
          result.push(deleted);
          pushCompareChange(compareManifest, result, deleted, {
            type: 'removed',
            pageIndex: options.pageIndex,
          });
        }
      }
      for (let offset = pairedCount; offset < insertions.length; offset++) {
        const inserted = createTrackedElement(insertions[offset], 'insert', revisionInfo, nextRevisionId, {
          tableStrategy: options.tableStrategy,
        });
        if (inserted) {
          result.push(inserted);
          pushCompareChange(compareManifest, result, inserted, {
            type: 'added',
            pageIndex: options.pageIndex,
          });
        }
      }

      beforeIndex += deletions.length;
      afterIndex += insertions.length;
      i++;
      continue;
    }

    if (diff.type === 'delete') {
      const deletions = beforeElements.slice(beforeIndex, beforeIndex + diff.values.length);
      for (let offset = 0; offset < deletions.length; offset += 1) {
        const element = deletions[offset];
        const moveMatch = moveMatches.beforeToAfter.get(beforeIndex + offset);
        if (moveMatch && isMoveCandidateElement(element)) {
          result.push(
            createMovedTextElement(
              element,
              'moveFrom',
              moveMatch.moveName,
              revisionInfo,
              nextRevisionId,
            )
          );
          continue;
        }

        const deleted = createTrackedElement(element, 'delete', revisionInfo, nextRevisionId, {
          tableStrategy: options.tableStrategy,
        });
        if (deleted) {
          result.push(deleted);
          pushCompareChange(compareManifest, result, deleted, {
            type: 'removed',
            pageIndex: options.pageIndex,
          });
        }
      }
      beforeIndex += diff.values.length;
      continue;
    }

    const insertions = afterElements.slice(afterIndex, afterIndex + diff.values.length);
    for (let offset = 0; offset < insertions.length; offset += 1) {
      const element = insertions[offset];
      const moveMatch = moveMatches.afterToBefore.get(afterIndex + offset);
      if (moveMatch && isMoveCandidateElement(element)) {
        result.push(
          createMovedTextElement(
            element,
            'moveTo',
            moveMatch.moveName,
            revisionInfo,
            nextRevisionId,
          )
        );
        pushCompareChange(compareManifest, result, result[result.length - 1], {
          type: 'moved',
          pageIndex: options.pageIndex,
          beforeText: getElementText(beforeElements[moveMatch.beforeIndex]),
          afterText: getElementText(element),
        });
        continue;
      }

      const inserted = createTrackedElement(element, 'insert', revisionInfo, nextRevisionId, {
        tableStrategy: options.tableStrategy,
      });
      if (inserted) {
        result.push(inserted);
        pushCompareChange(compareManifest, result, inserted, {
          type: 'added',
          pageIndex: options.pageIndex,
        });
      }
    }
    afterIndex += diff.values.length;
  }

  return {
    elements: result,
    compareManifest,
  };
}

function normalizeDirectRevisionElements(
  elements: LooseDocxElement[],
  revisionInfo: ResolvedRevisionInfo,
  nextRevisionId: () => number,
  parseMarkers: boolean
): LooseDocxElement[] {
  return elements.map((element) => {
    if (element.type === 'list') {
      const clone = cloneValue(element);
      clone.items = (Array.isArray(clone.items) ? clone.items : []).map((item: { runs?: DocxTextRun[]; text?: string }) => {
        const runs = normalizeDocxTextRuns(item.runs, item.text, {
          revisionInfo,
          parseMarkers,
          nextRevisionId,
        });
        return {
          ...item,
          runs,
          text: runs.length > 0 ? runs.map((run) => run.text).join('') : (item.text ?? ''),
        };
      });
      return clone;
    }

    if (element.type === 'heading' || element.type === 'paragraph' || element.type === 'text-run') {
      const clone = cloneValue(element);
      const runs = normalizeDocxTextRuns(clone.runs, clone.text, {
        revisionInfo,
        parseMarkers,
        nextRevisionId,
      });
      clone.runs = runs;
      clone.text = runs.length > 0 ? runs.map((run) => run.text).join('') : (clone.text ?? '');
      if (element.type === 'heading' || element.type === 'paragraph') {
        clone.revision = normalizeParagraphRevision(clone.revision, revisionInfo, nextRevisionId);
      }
      return clone;
    }

    if (element.type === 'shape') {
      const clone = cloneValue(element);
      const runs = normalizeDocxTextRuns(clone.runs, clone.text, {
        revisionInfo,
        parseMarkers,
        nextRevisionId,
      });
      clone.runs = runs;
      clone.text = runs.length > 0 ? runs.map((run) => run.text).join('') : (clone.text ?? '');
      return clone;
    }

    if (element.type === 'table') {
      const clone = cloneValue(element);
      clone.revision = normalizeTableRevision(clone.revision, revisionInfo, nextRevisionId);
      clone.rows = (Array.isArray(clone.rows) ? clone.rows : []).map((row: { cells?: Array<{ runs?: DocxTextRun[]; text?: string }> }) => ({
        ...row,
        cells: (Array.isArray(row.cells) ? row.cells : []).map((cell: { runs?: DocxTextRun[]; text?: string; revision?: TableCellRevision }) => {
          const runs = normalizeDocxTextRuns(cell.runs, cell.text, {
            revisionInfo,
            parseMarkers,
            nextRevisionId,
          });
          return {
            ...cell,
            runs,
            text: runs.length > 0 ? runs.map((run) => run.text).join('') : (cell.text ?? ''),
            revision: normalizeTableCellRevision(cell.revision, revisionInfo, nextRevisionId),
          };
        }),
      }));
      return clone;
    }

    return cloneValue(element);
  });
}

export function documentHasTrackedChanges(document: DocxDocument): boolean {
  if (document.options?.trackChanges) {
    return true;
  }

  return document.pages.some((page) =>
    page.elements.some((element: LooseDocxElement) => {
      if ((element.type === 'heading' || element.type === 'paragraph') && !!element.revision) {
        return true;
      }

      if (element.type === 'list') {
        return (Array.isArray(element.items) ? element.items : []).some((item: { runs?: DocxTextRun[]; text?: string }) =>
          (item.runs ?? []).some((run: DocxTextRun) => !!run.revision || hasRevisionMarkers(run.text))
            || (!!item.text && hasRevisionMarkers(item.text))
        );
      }

      if (element.type === 'table') {
        if (element.revision) {
          return true;
        }
        return (Array.isArray(element.rows) ? element.rows : []).some((row: { cells?: Array<{ runs?: DocxTextRun[]; text?: string }> }) =>
          (Array.isArray(row.cells) ? row.cells : []).some((cell: { runs?: DocxTextRun[]; text?: string; revision?: TableCellRevision }) =>
            !!cell.revision
              || (cell.runs ?? []).some((run: DocxTextRun) => !!run.revision || hasRevisionMarkers(run.text))
              || (!!cell.text && hasRevisionMarkers(cell.text))
          )
        );
      }

      if (element.type === 'shape') {
        return (Array.isArray(element.runs) ? element.runs : []).some((run: DocxTextRun) => !!run.revision || hasRevisionMarkers(run.text))
          || (typeof element.text === 'string' && hasRevisionMarkers(element.text));
      }

      return (Array.isArray(element.runs) ? element.runs : []).some((run: DocxTextRun) => !!run.revision || hasRevisionMarkers(run.text))
        || (typeof element.text === 'string' && hasRevisionMarkers(element.text));
    })
  );
}

export function normalizeTrackedChangesDocument(document: DocxDocument): DocxDocument {
  const trackChanges = document.options?.trackChanges === true;
  if (!trackChanges) {
    return cloneValue(document);
  }

  const revisionInfo = resolveRevisionInfo(document.revisionInfo, document.metadata?.author);
  const nextRevisionId = createRevisionIdAllocator();
  const clone = cloneValue(document);
  clone.revisionInfo = revisionInfo;
  clone.pages = clone.pages.map((page) => ({
    ...page,
    elements: normalizeDirectRevisionElements(page.elements, revisionInfo, nextRevisionId, true),
  }));
  return clone;
}

function compileTrackedChangesDocumentInternal(
  original: DocxDocument,
  revised: DocxDocument,
  options: CompileTrackedChangesOptions = {},
  compareOptions: { tableStrategy?: 'structural' | 'block'; emitCompareManifest?: boolean } = {}
): CompiledTrackedChangesResult {
  const revisionInfo = resolveRevisionInfo(
    {
      author: options.author ?? revised.revisionInfo?.author ?? revised.metadata?.author,
      date: options.date ?? revised.revisionInfo?.date,
      rsid: options.rsid ?? revised.revisionInfo?.rsid,
    },
    revised.metadata?.author
  );
  const granularity = options.granularity ?? 'word';
  const nextRevisionId = createRevisionIdAllocator();
  const baseDocument = cloneValue(revised);

  baseDocument.options = {
    ...baseDocument.options,
    trackChanges: true,
  };
  baseDocument.revisionInfo = revisionInfo;

  const maxPages = Math.max(original.pages.length, revised.pages.length);
  const pages: DocxPage[] = [];
  const compareManifest: CompareManifestEntry[] = [];

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const beforePage = original.pages[pageIndex];
    const afterPage = revised.pages[pageIndex];

    if (!beforePage && afterPage) {
      const pageResult = diffElementSequence([], afterPage.elements, revisionInfo, nextRevisionId, granularity, {
        pageIndex,
        tableStrategy: compareOptions.tableStrategy,
      });
      pages.push({
        ...cloneValue(afterPage),
        elements: pageResult.elements,
      });
      compareManifest.push(...pageResult.compareManifest);
      continue;
    }

    if (beforePage && !afterPage) {
      const pageResult = diffElementSequence(beforePage.elements, [], revisionInfo, nextRevisionId, granularity, {
        pageIndex,
        tableStrategy: compareOptions.tableStrategy,
      });
      pages.push({
        ...cloneValue(beforePage),
        elements: pageResult.elements,
      });
      compareManifest.push(...pageResult.compareManifest);
      continue;
    }

    if (beforePage && afterPage) {
      const pageResult = diffElementSequence(
        beforePage.elements,
        afterPage.elements,
        revisionInfo,
        nextRevisionId,
        granularity,
        {
          pageIndex,
          tableStrategy: compareOptions.tableStrategy,
        }
      );
      pages.push({
        ...cloneValue(afterPage),
        elements: pageResult.elements,
      });
      compareManifest.push(...pageResult.compareManifest);
    }
  }

  baseDocument.pages = pages;
  return {
    document: baseDocument,
    compareManifest: compareOptions.emitCompareManifest ? compareManifest : [],
  };
}

export function compileTrackedChangesDocument(
  original: DocxDocument,
  revised: DocxDocument,
  options: CompileTrackedChangesOptions = {}
): DocxDocument {
  return compileTrackedChangesDocumentInternal(original, revised, options).document;
}

export function compileTrackedChangesResult(
  original: DocxDocument,
  revised: DocxDocument,
  options: CompileTrackedChangesOptions = {},
  compareOptions: { tableStrategy?: 'structural' | 'block' } = {}
): CompiledTrackedChangesResult {
  return compileTrackedChangesDocumentInternal(original, revised, options, {
    ...compareOptions,
    emitCompareManifest: true,
  });
}

// =============================================================================
// GLOBAL TRACKER SINGLETON
// =============================================================================

let globalTracker: RevisionTracker | null = null;

/**
 * Get the global revision tracker instance
 */
export function getRevisionTracker(): RevisionTracker {
  if (!globalTracker) {
    globalTracker = new RevisionTracker();
  }
  return globalTracker;
}

/**
 * Reset the global revision tracker
 */
export function resetRevisionTracker(): void {
  globalTracker = null;
}

/**
 * Create a new revision tracker with custom config
 */
export function createRevisionTracker(config?: Partial<RevisionTrackingConfig>): RevisionTracker {
  return new RevisionTracker(config);
}
