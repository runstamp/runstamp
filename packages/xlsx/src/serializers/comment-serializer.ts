import { escapeXml, XML_DECLARATION } from "../utils/xml.js";

export interface CommentEntry {
  ref: string;
  author?: string;
  text: string;
}

export interface CommentVmlEntry {
  row: number;
  col: number;
}

export function serializeComments(comments: CommentEntry[]): string {
  const authorList: string[] = [];
  const authorIndexMap = new Map<string, number>();

  for (const comment of comments) {
    const author = comment.author ?? "";
    if (!authorIndexMap.has(author)) {
      authorIndexMap.set(author, authorList.length);
      authorList.push(author);
    }
  }

  const authorsXml = authorList.map((author) => `<author>${escapeXml(author)}</author>`).join("");
  const commentListXml = comments.map((comment) => {
    const authorId = authorIndexMap.get(comment.author ?? "") ?? 0;
    return `<comment ref="${escapeXml(comment.ref)}" authorId="${authorId}"><text><t>${escapeXml(comment.text)}</t></text></comment>`;
  }).join("");

  return [
    XML_DECLARATION,
    `<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
    `<authors>${authorsXml}</authors>`,
    `<commentList>${commentListXml}</commentList>`,
    `</comments>`,
  ].join("");
}

export function serializeCommentsVml(comments: CommentVmlEntry[]): string {
  const shapes = comments.map((comment, index) => {
    const shapeId = 1025 + index;
    const zIndex = index + 1;
    const anchorCol = comment.col;
    const anchorRow = comment.row;
    const anchorEndCol = anchorCol + 2;
    const anchorEndRow = anchorRow + 4;

    return [
      `<v:shape id="_x0000_s${shapeId}" type="#_x0000_t202"`,
      ` style="position:absolute;margin-left:59.25pt;margin-top:1.5pt;width:108pt;height:59.25pt;z-index:${zIndex};visibility:hidden"`,
      ` fillcolor="#ffffe1" o:insetmode="auto">`,
      `<v:fill color="#ffffe1"/>`,
      `<v:shadow on="t" color="black" obscured="t"/>`,
      `<v:path o:connecttype="none"/>`,
      `<v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox>`,
      `<x:ClientData ObjectType="Note">`,
      `<x:MoveWithCells/>`,
      `<x:SizeWithCells/>`,
      `<x:Anchor>${anchorCol}, 15, ${anchorRow}, 10, ${anchorEndCol}, 31, ${anchorEndRow}, 4</x:Anchor>`,
      `<x:AutoFill>False</x:AutoFill>`,
      `<x:Row>${anchorRow}</x:Row>`,
      `<x:Column>${anchorCol}</x:Column>`,
      `</x:ClientData>`,
      `</v:shape>`,
    ].join("");
  }).join("");

  return [
    `<xml xmlns:v="urn:schemas-microsoft-com:vml"`,
    ` xmlns:o="urn:schemas-microsoft-com:office:office"`,
    ` xmlns:x="urn:schemas-microsoft-com:office:excel">`,
    `<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>`,
    `<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe">`,
    `<v:stroke joinstyle="miter"/>`,
    `<v:path gradientshapeok="t" o:connecttype="rect"/>`,
    `</v:shapetype>`,
    shapes,
    `</xml>`,
  ].join("");
}
