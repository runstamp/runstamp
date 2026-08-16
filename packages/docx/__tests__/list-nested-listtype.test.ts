import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { renderToDocx } from "../src/render";
import type { DocxDocument } from "../src/schema";

async function readNumberingXml(document: DocxDocument): Promise<string> {
  const result = await renderToDocx(document);
  const zip = await JSZip.loadAsync(result.buffer);
  const numbering = await zip.file("word/numbering.xml")?.async("string");
  if (!numbering) {
    throw new Error("word/numbering.xml not found");
  }
  return numbering;
}

function levelFormat(numberingXml: string, level: number): string | undefined {
  const lvlMatch = numberingXml.match(
    new RegExp(`<w:lvl[^>]*w:ilvl="${level}"[\\s\\S]*?</w:lvl>`),
  );
  if (!lvlMatch) return undefined;
  const fmtMatch = lvlMatch[0].match(/<w:numFmt\s+w:val="([^"]+)"/);
  return fmtMatch?.[1];
}

describe("list nested listType", () => {
  it("renders a nested bullet list as bullet when outer is numbered", async () => {
    const document: DocxDocument = {
      type: "DocxDocument",
      pageSize: "a4",
      pages: [
        {
          elements: [
            {
              type: "list",
              listType: "number",
              items: [
                {
                  text: "Outer numbered first",
                  nestedList: {
                    type: "list",
                    listType: "bullet",
                    items: [
                      { text: "Nested bullet alpha" },
                      { text: "Nested bullet beta" },
                    ],
                  },
                },
                { text: "Outer numbered second" },
              ],
            },
          ],
        },
      ],
    };

    const numberingXml = await readNumberingXml(document);

    expect(levelFormat(numberingXml, 0)).toBe("decimal");
    expect(levelFormat(numberingXml, 1)).toBe("bullet");
  });

  it("respects per-level listType when each level declares its own", async () => {
    const document: DocxDocument = {
      type: "DocxDocument",
      pageSize: "a4",
      pages: [
        {
          elements: [
            {
              type: "list",
              listType: "number",
              items: [
                {
                  text: "Outer number",
                  nestedList: {
                    type: "list",
                    listType: "letter",
                    items: [
                      {
                        text: "Letter level",
                        nestedList: {
                          type: "list",
                          listType: "roman",
                          items: [
                            {
                              text: "Roman level",
                              nestedList: {
                                type: "list",
                                listType: "bullet",
                                items: [{ text: "Bullet level" }],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const numberingXml = await readNumberingXml(document);

    expect(levelFormat(numberingXml, 0)).toBe("decimal");
    expect(levelFormat(numberingXml, 1)).toBe("lowerLetter");
    expect(levelFormat(numberingXml, 2)).toBe("upperRoman");
    expect(levelFormat(numberingXml, 3)).toBe("bullet");
  });

  it("falls back to outer rotation for levels with no declared nested list", async () => {
    const document: DocxDocument = {
      type: "DocxDocument",
      pageSize: "a4",
      pages: [
        {
          elements: [
            {
              type: "list",
              listType: "letter",
              items: [{ text: "Just one letter item" }],
            },
          ],
        },
      ],
    };

    const numberingXml = await readNumberingXml(document);
    expect(levelFormat(numberingXml, 0)).toBe("lowerLetter");
    // Level 1+ is unobserved — falls back to the outer letter rotation
    // (lowerRoman as the second slot in `letter` rotation table).
    expect(levelFormat(numberingXml, 1)).toBe("lowerRoman");
  });
});
