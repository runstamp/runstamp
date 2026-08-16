import { serializeXml, xmlElement, xmlText } from './ordered-builder.js';
import type { NativeComment } from './comments.js';
import { escapeXml } from './xml-escape.js';

export interface NativeCommentXmlPart {
  path: string;
  target: string;
  relationshipType: string;
  contentTypePath: string;
  contentType: string;
  xml: string;
}

export function buildCommentsXml(comments: NativeComment[]): string {
  return serializeXml(xmlElement('w:comments', {
    'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
  }, comments.map((comment) => xmlElement('w:comment', {
    'w:id': String(comment.id),
    'w:author': comment.author,
    ...(comment.initials ? { 'w:initials': comment.initials } : {}),
    'w:date': comment.date,
  }, [
    xmlElement('w:p', { 'w14:paraId': comment.paraId, 'w14:textId': comment.paraId }, [
      xmlElement('w:pPr', undefined, [
        xmlElement('w:pStyle', { 'w:val': 'CommentText' }),
      ]),
      xmlElement('w:r', undefined, [
        xmlElement('w:t', undefined, [xmlText(escapeXml(comment.text))]),
      ]),
    ]),
  ]))));
}

export function buildCommentsExtendedXml(comments: NativeComment[]): string {
  const paraById = new Map(comments.map((comment) => [comment.id, comment.paraId]));
  return serializeXml(xmlElement('w15:commentsEx', {
    'xmlns:w15': 'http://schemas.microsoft.com/office/word/2012/wordml',
    'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    'mc:Ignorable': 'w15',
  }, comments.map((comment) => xmlElement('w15:commentEx', {
    'w15:paraId': comment.paraId,
    ...(comment.parentId !== undefined && paraById.has(comment.parentId)
      ? { 'w15:paraIdParent': paraById.get(comment.parentId)! }
      : {}),
    'w15:done': comment.done ? '1' : '0',
  }))));
}

export function buildNativeCommentXmlParts(comments: NativeComment[]): NativeCommentXmlPart[] {
  return [
    {
      path: 'word/comments.xml',
      target: 'comments.xml',
      relationshipType: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments',
      contentTypePath: 'word/comments.xml',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml',
      xml: buildCommentsXml(comments),
    },
    {
      path: 'word/commentsExtended.xml',
      target: 'commentsExtended.xml',
      relationshipType: 'http://schemas.microsoft.com/office/2011/relationships/commentsExtended',
      contentTypePath: 'word/commentsExtended.xml',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml',
      xml: buildCommentsExtendedXml(comments),
    },
  ];
}
