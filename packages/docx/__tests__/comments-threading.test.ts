import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderToDocx } from '../src/render';
import type { DocxDocument } from '../src/schema';

async function extractCommentParts(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string') ?? '';
  const commentsXml = await zip.file('word/comments.xml')?.async('string') ?? '';
  const commentsExtendedXml = await zip.file('word/commentsExtended.xml')?.async('string') ?? '';
  const contentTypesXml = await zip.file('[Content_Types].xml')?.async('string') ?? '';
  const documentRelationshipsXml = await zip.file('word/_rels/document.xml.rels')?.async('string') ?? '';

  return {
    documentXml,
    commentsXml,
    commentsExtendedXml,
    contentTypesXml,
    documentRelationshipsXml,
  };
}

describe('DOCX comments and threading', () => {
  it('emits comment body ranges that point at comments.xml entries', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{
          type: 'paragraph',
          text: 'Clause text with a comment.',
          comment: {
            id: 7,
            text: 'Review this clause.',
            author: 'Reviewer',
            initials: 'RV',
            date: '2027-01-15T10:30:00Z',
          },
        }],
      }],
    };

    const result = await renderToDocx(doc);
    const parts = await extractCommentParts(result.buffer);

    expect(parts.documentXml).toContain('<w:commentRangeStart w:id="7"/>');
    expect(parts.documentXml).toContain('<w:commentRangeEnd w:id="7"/>');
    expect(parts.documentXml).toContain('<w:commentReference w:id="7"/>');
    expect(parts.commentsXml).toContain('<w:comment w:id="7"');
    expect(parts.commentsXml).toContain('<w:pStyle w:val="CommentText"/>');
    expect(parts.commentsXml).toContain('w:author="Reviewer"');
    expect(parts.commentsXml).toContain('Review this clause.');
  });

  it('keeps style.comment compatibility on paragraph-like content', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [{
          type: 'paragraph',
          text: 'Legacy style comment target.',
          style: {
            comment: {
              id: 9,
              text: 'Legacy comment payload.',
              author: 'Legacy Reviewer',
              date: '2027-01-15T10:30:00Z',
            },
          },
        }],
      }],
    };

    const result = await renderToDocx(doc);
    const parts = await extractCommentParts(result.buffer);

    expect(parts.documentXml).toContain('<w:commentRangeStart w:id="9"/>');
    expect(parts.documentXml).toContain('<w:commentRangeEnd w:id="9"/>');
    expect(parts.documentXml).toContain('<w:commentReference w:id="9"/>');
    expect(parts.commentsXml).toContain('<w:comment w:id="9"');
    expect(parts.commentsXml).toContain('Legacy comment payload.');
  });

  it('emits commentsExtended.xml metadata for threaded replies', async () => {
    const doc: DocxDocument = {
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [{
        elements: [
          {
            type: 'paragraph',
            text: 'Parent comment target.',
            comment: {
              id: 20,
              text: 'Parent comment',
              author: 'Runstamp',
              date: '2027-01-15T10:30:00Z',
            },
          },
          {
            type: 'paragraph',
            text: 'Reply comment target.',
            comment: {
              id: 21,
              parentId: 20,
              text: 'Reply comment',
              author: 'Runstamp',
              done: true,
              date: '2027-01-15T10:31:00Z',
            },
          },
        ],
      }],
    };

    const result = await renderToDocx(doc);
    const parts = await extractCommentParts(result.buffer);

    expect(parts.commentsXml).toContain('w:id="20"');
    expect(parts.commentsXml).toContain('w14:paraId="00000001"');
    expect(parts.commentsXml).toContain('w:id="21"');
    expect(parts.commentsXml).toContain('w14:paraId="00000002"');
    expect(parts.commentsExtendedXml).toContain('<w15:commentsEx');
    expect(parts.commentsExtendedXml).toContain('<w15:commentEx w15:paraId="00000001" w15:done="0"/>');
    expect(parts.commentsExtendedXml).toContain('<w15:commentEx w15:paraId="00000002" w15:paraIdParent="00000001" w15:done="1"/>');
    expect(parts.contentTypesXml).toContain('PartName="/word/commentsExtended.xml"');
    expect(parts.contentTypesXml).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml');
    expect(parts.documentRelationshipsXml).toContain('Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended"');
    expect(parts.documentRelationshipsXml).toContain('Target="commentsExtended.xml"');
  });
});
