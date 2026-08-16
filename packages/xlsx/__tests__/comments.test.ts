import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";
import { openZip, readZipEntry } from "./helpers.js";

function singleCommentWorkbook(): SpreadsheetDocument {
  return {
    sheets: [{
      name: "Sheet1",
      rows: [{
        cells: [{
          value: "Hello",
          comment: { text: "This is a comment" },
        }],
      }],
    }],
  };
}

function multiCommentWorkbook(): SpreadsheetDocument {
  return {
    sheets: [{
      name: "Sheet1",
      rows: [
        {
          cells: [
            { value: "A1", comment: { text: "Comment on A1" } },
            { value: "B1" },
            { value: "C1", comment: { text: "Comment on C1" } },
          ],
        },
        {
          cells: [
            { value: "A2" },
            { value: "B2", comment: { text: "Comment on B2" } },
          ],
        },
      ],
    }],
  };
}

function multiSheetCommentWorkbook(): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Sheet1",
        rows: [{
          cells: [{ value: "A1", comment: { text: "Sheet1 comment" } }],
        }],
      },
      {
        name: "Sheet2",
        rows: [{
          cells: [{ value: "X1", comment: { text: "Sheet2 comment" } }],
        }],
      },
    ],
  };
}

function commentWithAuthorWorkbook(): SpreadsheetDocument {
  return {
    sheets: [{
      name: "Sheet1",
      rows: [{
        cells: [{
          value: "Hello",
          comment: { author: "Jake", text: "Author comment" },
        }],
      }],
    }],
  };
}

function commentWithSpecialCharsWorkbook(): SpreadsheetDocument {
  return {
    sheets: [{
      name: "Sheet1",
      rows: [{
        cells: [{
          value: "Data",
          comment: { author: "O'Reilly & Sons", text: 'Values < 100 & > 50 are "flagged"' },
        }],
      }],
    }],
  };
}

describe("Comments/Notes Support", () => {
  it("renders a single comment with comments XML and VML in the ZIP", async () => {
    const buffer = await SpreadsheetEngine.render(singleCommentWorkbook(), { deterministic: true });
    const zip = await openZip(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir).sort();

    expect(paths).toContain("xl/comments1.xml");
    expect(paths).toContain("xl/drawings/vmlDrawing1.vml");

    const commentsXml = await readZipEntry(buffer, "xl/comments1.xml");
    expect(commentsXml).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    expect(commentsXml).toContain("<comments");
    expect(commentsXml).toContain('<comment ref="A1" authorId="0">');
    expect(commentsXml).toContain("<t>This is a comment</t>");
    expect(commentsXml).toContain("<authors>");

    const vml = await readZipEntry(buffer, "xl/drawings/vmlDrawing1.vml");
    expect(vml).toContain("urn:schemas-microsoft-com:vml");
    expect(vml).toContain("urn:schemas-microsoft-com:office:excel");
    expect(vml).toContain("<x:Row>0</x:Row>");
    expect(vml).toContain("<x:Column>0</x:Column>");
    expect(vml).toContain('ObjectType="Note"');
    expect(vml).toContain("_x0000_t202");
    expect(vml).not.toContain('<?xml version');
  });

  it("renders multiple comments on different cells", async () => {
    const buffer = await SpreadsheetEngine.render(multiCommentWorkbook(), { deterministic: true });
    const commentsXml = await readZipEntry(buffer, "xl/comments1.xml");

    expect(commentsXml).toContain('<comment ref="A1" authorId="0">');
    expect(commentsXml).toContain("<t>Comment on A1</t>");
    expect(commentsXml).toContain('<comment ref="C1" authorId="0">');
    expect(commentsXml).toContain("<t>Comment on C1</t>");
    expect(commentsXml).toContain('<comment ref="B2" authorId="0">');
    expect(commentsXml).toContain("<t>Comment on B2</t>");

    const vml = await readZipEntry(buffer, "xl/drawings/vmlDrawing1.vml");
    expect(vml).toContain("<x:Row>0</x:Row>");
    expect(vml).toContain("<x:Column>0</x:Column>");
    expect(vml).toContain("<x:Column>2</x:Column>");
    expect(vml).toContain("<x:Row>1</x:Row>");
    expect(vml).toContain("<x:Column>1</x:Column>");
  });

  it("renders comments on multiple sheets with separate files", async () => {
    const buffer = await SpreadsheetEngine.render(multiSheetCommentWorkbook(), { deterministic: true });
    const zip = await openZip(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir).sort();

    expect(paths).toContain("xl/comments1.xml");
    expect(paths).toContain("xl/comments2.xml");
    expect(paths).toContain("xl/drawings/vmlDrawing1.vml");
    expect(paths).toContain("xl/drawings/vmlDrawing2.vml");

    const comments1 = await readZipEntry(buffer, "xl/comments1.xml");
    expect(comments1).toContain("<t>Sheet1 comment</t>");
    expect(comments1).not.toContain("Sheet2 comment");

    const comments2 = await readZipEntry(buffer, "xl/comments2.xml");
    expect(comments2).toContain("<t>Sheet2 comment</t>");
    expect(comments2).not.toContain("Sheet1 comment");
  });

  it("renders a comment with an author", async () => {
    const buffer = await SpreadsheetEngine.render(commentWithAuthorWorkbook(), { deterministic: true });
    const commentsXml = await readZipEntry(buffer, "xl/comments1.xml");

    expect(commentsXml).toContain("<author>Jake</author>");
    expect(commentsXml).toContain('<comment ref="A1" authorId="0">');
    expect(commentsXml).toContain("<t>Author comment</t>");
  });

  it("escapes XML special characters in comments", async () => {
    const buffer = await SpreadsheetEngine.render(commentWithSpecialCharsWorkbook(), { deterministic: true });
    const commentsXml = await readZipEntry(buffer, "xl/comments1.xml");

    expect(commentsXml).toContain("O&apos;Reilly &amp; Sons");
    expect(commentsXml).toContain("Values &lt; 100 &amp; &gt; 50 are &quot;flagged&quot;");
  });

  it("includes legacyDrawing element in worksheet XML", async () => {
    const buffer = await SpreadsheetEngine.render(singleCommentWorkbook(), { deterministic: true });
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain("<legacyDrawing r:id=");
  });

  it("includes correct relationships in sheet rels", async () => {
    const buffer = await SpreadsheetEngine.render(singleCommentWorkbook(), { deterministic: true });
    const zip = await openZip(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    expect(paths).toContain("xl/worksheets/_rels/sheet1.xml.rels");

    const rels = await readZipEntry(buffer, "xl/worksheets/_rels/sheet1.xml.rels");
    expect(rels).toContain("http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments");
    expect(rels).toContain("http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing");
    expect(rels).toContain("../comments1.xml");
    expect(rels).toContain("../drawings/vmlDrawing1.vml");
  });

  it("includes content types for comments and VML", async () => {
    const buffer = await SpreadsheetEngine.render(singleCommentWorkbook(), { deterministic: true });
    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");

    expect(contentTypes).toContain('Extension="vml"');
    expect(contentTypes).toContain("vmlDrawing");
    expect(contentTypes).toContain("/xl/comments1.xml");
    expect(contentTypes).toContain("spreadsheetml.comments+xml");
  });

  it("does not add comment files when no comments exist", async () => {
    const workbook: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "No comments here" }] }],
      }],
    };
    const buffer = await SpreadsheetEngine.render(workbook, { deterministic: true });
    const zip = await openZip(buffer);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    expect(paths.some((p) => p.includes("comments"))).toBe(false);
    expect(paths.some((p) => p.includes("vmlDrawing"))).toBe(false);

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheetXml).not.toContain("legacyDrawing");
  });
});
