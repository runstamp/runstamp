import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PaperDocument } from "../../../src/index.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(fixtureDir, "../../../../../");
const templateCandidates = [
  resolve(repoRoot, "docs/reference/CFI-Investment-Banking-PitchBook.pptx"),
];
const templatePath = templateCandidates.find((candidate) => existsSync(candidate));

if (!templatePath) {
  throw new Error(
    `No template mutation baseline PPTX found. Checked: ${templateCandidates.join(", ")}`,
  );
}

export const templateMutationDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Template Mutation Baseline" },
  template: readFileSync(templatePath),
  slides: [
    {
      type: "Slide",
      layoutName: "Title Slide",
      children: [
        {
          type: "Text",
          placeholder: { type: "title", idx: 0 },
          content: "PowerPoint desktop validation corpus",
        },
        {
          type: "Text",
          placeholder: { type: "subTitle", idx: 1 },
          content: "Template-backed title and subtitle placeholders",
        },
      ],
    },
    {
      type: "Slide",
      layoutName: "Title and Content",
      children: [
        {
          type: "Text",
          placeholder: { type: "title", idx: 0 },
          content: "Placeholder typography parity",
        },
        {
          type: "View",
          placeholder: { type: "body", idx: 1 },
          textParagraphs: [
            {
              runs: [
                {
                  text: "This slide intentionally uses a View-based text box so template typography must flow into textStyle, not only shape style.",
                },
              ],
              spaceAfter: 10,
            },
            {
              runs: [
                {
                  text: "Microsoft PowerPoint should preserve line spacing and avoid truncation when the template body placeholder is reused.",
                },
              ],
            },
          ],
          style: {
            backgroundColor: "#FFFFFF",
            borderColor: "#CBD5E1",
            borderWidth: 1,
          },
        },
      ],
    },
  ],
};
