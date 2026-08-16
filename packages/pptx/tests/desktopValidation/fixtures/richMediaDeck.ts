import type { PaperDocument } from "../../../src/index.js";
import { RED_PIXEL } from "../../helpers/xmlTestUtils.js";

export const richMediaDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Notes Comments and Media Corpus" },
  slides: [
    {
      type: "Slide",
      background: { type: "image", src: RED_PIXEL },
      notes: "Speaker note to verify notesSlide generation and desktop-open stability.",
      comments: [
        {
          author: "QA",
          text: "Desktop validation should catch repair dialogs before release.",
          x: 80,
          y: 60,
          date: "2026-03-13T08:00:00Z",
        },
      ],
      children: [
        {
          type: "Text",
          content: "Background image + notes + comments",
          style: {
            position: "absolute",
            left: 58,
            top: 52,
            width: 520,
            height: 40,
            fontSize: 26,
            fontWeight: "bold",
            color: "#FFFFFF",
          },
        },
        {
          type: "Image",
          src: RED_PIXEL,
          style: {
            position: "absolute",
            left: 64,
            top: 120,
            width: 180,
            height: 180,
          },
        },
      ],
    },
    {
      type: "Slide",
      notes: "Second slide keeps notes/comments indexing and rel targets honest.",
      children: [
        {
          type: "View",
          style: {
            position: "absolute",
            left: 70,
            top: 100,
            width: 820,
            height: 250,
            backgroundColor: "#F8FAFC",
            borderColor: "#CBD5E1",
            borderWidth: 1,
          },
          textContent: "Rich media corpus follow-up slide",
          textStyle: {
            fontSize: 24,
            fontFamily: "Aptos",
            color: "#0F172A",
            fontWeight: "bold",
          },
        },
      ],
    },
  ],
};
