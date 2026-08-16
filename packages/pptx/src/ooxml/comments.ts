// src/ooxml/comments.ts — Slide comment XML generation
import type { PaperDocument, SlideComment } from "../types/ast.js";
import { escapeXml } from "./drawing/textUtils.js";
import { toEmu } from "./drawing/math.js";
import { isDeterministicMode, DETERMINISTIC_DATE } from "../deterministicMode.js";

export interface CommentAuthor {
  id: number;
  name: string;
  initials: string;
  lastIdx: number;
  clrIdx: number;
}

export interface CommentSlideInfo {
  slideIndex: number;       // 0-based
  commentFileIndex: number; // 1-based (comment1.xml, comment2.xml, ...)
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3) || "A";
}

export function generateCommentAuthorsXml(authors: CommentAuthor[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<p:cmAuthorLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">\n`;
  for (const a of authors) {
    xml += `  <p:cmAuthor id="${a.id}" name="${escapeXml(a.name)}" initials="${escapeXml(a.initials)}" lastIdx="${a.lastIdx}" clrIdx="${a.clrIdx}"/>\n`;
  }
  xml += `</p:cmAuthorLst>`;
  return xml;
}

export function generateCommentsXml(comments: SlideComment[], authorMap: Map<string, CommentAuthor>, authorIdxCounters: Map<string, number>): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<p:cmLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">\n`;

  for (const comment of comments) {
    const author = authorMap.get(comment.author)!;
    const idx = authorIdxCounters.get(comment.author) ?? 1;
    authorIdxCounters.set(comment.author, idx + 1);

    // A comment without an explicit date must not stamp the wall clock —
    // that alone makes an otherwise-identical render byte-different.
    const dt = comment.date
      ?? (isDeterministicMode() ? DETERMINISTIC_DATE : new Date()).toISOString();
    const posX = comment.x !== undefined ? toEmu(comment.x) : 0;
    const posY = comment.y !== undefined ? toEmu(comment.y) : 0;

    xml += `  <p:cm authorId="${author.id}" dt="${escapeXml(dt)}" idx="${idx}">\n`;
    xml += `    <p:pos x="${posX}" y="${posY}"/>\n`;
    xml += `    <p:text>${escapeXml(comment.text)}</p:text>\n`;
    xml += `  </p:cm>\n`;
  }

  xml += `</p:cmLst>`;
  return xml;
}

/**
 * Processes all slide comments in a document.
 * Returns the data needed by the zipper to write comment files.
 */
export function processDocumentComments(doc: PaperDocument): {
  commentSlideInfos: CommentSlideInfo[];
  commentAuthorsXml: string | undefined;
  commentFilesMap: Map<string, string>;
} {
  const commentFilesMap = new Map<string, string>();
  const commentSlideInfos: CommentSlideInfo[] = [];

  // Collect all unique authors across all slides
  const authorMap = new Map<string, CommentAuthor>();
  let authorIdCounter = 0;

  // First pass: discover all authors and count per-author comments
  const authorCommentCounts = new Map<string, number>();
  for (const slide of doc.slides) {
    if (!slide.comments || slide.comments.length === 0) continue;
    for (const comment of slide.comments) {
      const count = authorCommentCounts.get(comment.author) ?? 0;
      authorCommentCounts.set(comment.author, count + 1);
      if (!authorMap.has(comment.author)) {
        authorMap.set(comment.author, {
          id: authorIdCounter,
          name: comment.author,
          initials: getInitials(comment.author),
          lastIdx: 0, // will be updated
          clrIdx: authorIdCounter,
        });
        authorIdCounter++;
      }
    }
  }

  if (authorMap.size === 0) {
    return { commentSlideInfos: [], commentAuthorsXml: undefined, commentFilesMap };
  }

  // Second pass: generate comment files per slide and track author lastIdx
  const authorIdxCounters = new Map<string, number>(); // per-author running idx
  let commentFileIndex = 1;

  for (let slideIdx = 0; slideIdx < doc.slides.length; slideIdx++) {
    const slide = doc.slides[slideIdx];
    if (!slide.comments || slide.comments.length === 0) continue;

    const commentsXml = generateCommentsXml(slide.comments, authorMap, authorIdxCounters);
    commentFilesMap.set(`ppt/comments/comment${commentFileIndex}.xml`, commentsXml);
    commentSlideInfos.push({ slideIndex: slideIdx, commentFileIndex });
    commentFileIndex++;
  }

  // Update lastIdx for each author
  for (const [name, author] of authorMap) {
    author.lastIdx = (authorIdxCounters.get(name) ?? 1) - 1;
  }

  const commentAuthorsXml = generateCommentAuthorsXml(Array.from(authorMap.values()));

  return { commentSlideInfos, commentAuthorsXml, commentFilesMap };
}
