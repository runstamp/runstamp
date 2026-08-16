import type { CommentInfo } from '../types.js';
import { xmlElement } from './ordered-builder.js';
import type { XmlElement } from './types.js';

export interface NativeComment {
  id: number;
  parentId?: number;
  text: string;
  author: string;
  initials?: string;
  date: string;
  done: boolean;
  paraId: string;
}

export function normalizeCommentInfo(
  comment: CommentInfo | string | unknown,
  defaults: { author?: string; date?: string },
): Omit<NativeComment, 'id' | 'paraId'> | undefined {
  if (!comment) {
    return undefined;
  }

  if (typeof comment === 'string') {
    return {
      text: comment,
      author: defaults.author ?? 'Runstamp',
      date: defaults.date ?? new Date('2026-04-10T00:00:00.000Z').toISOString(),
      done: false,
    };
  }

  if (typeof comment !== 'object') {
    return undefined;
  }

  const value = comment as Partial<CommentInfo>;
  if (typeof value.text !== 'string') {
    return undefined;
  }

  return {
    parentId: value.parentId,
    text: value.text,
    author: value.author ?? defaults.author ?? 'Runstamp',
    initials: value.initials,
    date: normalizeDate(value.date) ?? defaults.date ?? new Date('2026-04-10T00:00:00.000Z').toISOString(),
    done: value.done ?? false,
  };
}

export function registerComment(
  comments: NativeComment[],
  comment: CommentInfo | string | unknown,
  defaults: { author?: string; date?: string; nextId: () => number },
): number | undefined {
  const normalized = normalizeCommentInfo(comment, defaults);
  if (!normalized) {
    return undefined;
  }

  const rawId = typeof comment === 'object' && comment && typeof (comment as Partial<CommentInfo>).id === 'number'
    ? (comment as Partial<CommentInfo>).id!
    : defaults.nextId();
  const id = Math.max(0, Math.trunc(rawId));
  comments.push({
    ...normalized,
    id,
    paraId: (comments.length + 1).toString(16).toUpperCase().padStart(8, '0'),
  });
  return id;
}

export function buildCommentRange(id: number, children: XmlElement[]): XmlElement[] {
  return [
    xmlElement('w:commentRangeStart', { 'w:id': String(id) }),
    ...children,
    xmlElement('w:commentRangeEnd', { 'w:id': String(id) }),
    xmlElement('w:r', undefined, [
      xmlElement('w:rPr', undefined, [xmlElement('w:rStyle', { 'w:val': 'CommentReference' })]),
      xmlElement('w:commentReference', { 'w:id': String(id) }),
    ]),
  ];
}

function normalizeDate(date: CommentInfo['date'] | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
