import { serializeStructuredToNativeOOXML } from "../src/ooxml/native-serializer.ts";
import type { StructuredDocument } from "../src/types.ts";

const document: StructuredDocument = {
  __kind: "StructuredDocument",
  metadata: {
    title: "Source Mode Check",
    author: "Runstamp",
  },
  styles: {
    paragraphStyles: new Map(),
    characterStyles: new Map(),
    tableStyles: new Map(),
  },
  assets: {
    images: new Map(),
    fonts: new Map(),
    embeddedFiles: new Map(),
  },
  pages: [
    {
      pageNumber: 1,
      dimensions: {
        width: 794,
        height: 1123,
        margins: { top: 96, right: 96, bottom: 96, left: 96 },
      },
      elements: [
        {
          id: "p1",
          type: "paragraph",
          position: { x: 0, y: 0, width: 400, height: 24 },
          zIndex: 0,
          opacity: 1,
          text: "Source mode render smoke test",
          runs: [
            {
              text: "Source mode render smoke test",
              color: "#1D4ED8",
              fontSize: 12,
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          ],
          style: {
            backgroundColor: "#EFF6FF",
            borderTopWidth: 0,
            borderTopColor: "000000",
            borderTopStyle: "none",
            borderRightWidth: 0,
            borderRightColor: "000000",
            borderRightStyle: "none",
            borderBottomWidth: 0,
            borderBottomColor: "000000",
            borderBottomStyle: "none",
            borderLeftWidth: 0,
            borderLeftColor: "000000",
            borderLeftStyle: "none",
            borderRadius: 0,
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            marginTop: 0,
            marginRight: 0,
            marginBottom: 0,
            marginLeft: 0,
            fontFamily: "Calibri",
            fontSize: 12,
            fontWeight: "normal",
            fontStyle: "normal",
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: "left",
            textDecoration: "none",
            color: "#1D4ED8",
            display: "block",
            visibility: "visible",
            overflow: "visible",
            opacity: 1,
          },
        },
      ],
    },
  ],
  stats: {
    imageCount: 0,
    tableCount: 0,
    chartCount: 0,
    shapeCount: 0,
    listCount: 0,
    containerCount: 0,
    textRunCount: 1,
    totalElements: 1,
  },
  warnings: [],
};

const result = await serializeStructuredToNativeOOXML(document);

if (result.buffer.byteLength <= 0) {
  throw new Error("DOCX source-mode smoke render produced an empty buffer");
}

console.log(JSON.stringify({ ok: true, bytes: result.buffer.byteLength }));
