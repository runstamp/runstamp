import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generateNotesSlide } from "../src/ooxml/slide.js";
import { PptxArchive } from "../src/ooxml/zipper.js";

describe("Speaker Notes Edge Cases", () => {
  it("escapes XML special characters in plain text notes", () => {
    const result = generateNotesSlide('<script>alert("xss")</script> & \'test\'');
    expect(result.xml).toContain("&lt;script&gt;");
    expect(result.xml).toContain("&amp;");
    expect(result.xml).not.toContain("<script>");
  });

  it("sparse notes — only slides with notes get notesSlide files", async () => {
    const archive = new PptxArchive();
    const slideContents = ["<slide1/>", "<slide2/>", "<slide3/>", "<slide4/>", "<slide5/>"];
    const slideNotes = ["Slide 1 note", undefined, "Slide 3 note", "", "Slide 5 note"];

    archive.assemblePresentation(5, {
      slideContents,
      slideNotes: slideNotes as any,
    });
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // Slides 1, 3, 5 have notes
    expect(zip.file("ppt/notesSlides/notesSlide1.xml")).toBeTruthy();
    expect(zip.file("ppt/notesSlides/notesSlide3.xml")).toBeTruthy();
    expect(zip.file("ppt/notesSlides/notesSlide5.xml")).toBeTruthy();

    // Slides 2, 4 have no notes
    expect(zip.file("ppt/notesSlides/notesSlide2.xml")).toBeNull();
    expect(zip.file("ppt/notesSlides/notesSlide4.xml")).toBeNull();
  });

  it("empty array notes [] produce no notesSlide file", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1, {
      slideContents: ["<slide/>"],
      slideNotes: [[] as any],
    });
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("ppt/notesSlides/notesSlide1.xml")).toBeNull();
  });

  it("whitespace-only notes still produce a notesSlide file", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1, {
      slideContents: ["<slide/>"],
      slideNotes: ["   "],
    });
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("ppt/notesSlides/notesSlide1.xml")).toBeTruthy();
  });

  it("emits a PowerPoint-compatible notes package shape", async () => {
    const archive = new PptxArchive();
    archive.assemblePresentation(1, {
      slideContents: ["<slide/>"],
      slideNotes: ["Speaker note"],
    });
    const buffer = await archive.generateBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const notesSlideXml = await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string");
    const notesSlideRelsXml = await zip.file("ppt/notesSlides/_rels/notesSlide1.xml.rels")!.async("string");
    const notesMasterXml = await zip.file("ppt/notesMasters/notesMaster1.xml")!.async("string");
    const notesMasterRelsXml = await zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels")!.async("string");
    const contentTypesXml = await zip.file("[Content_Types].xml")!.async("string");

    expect(notesSlideXml).toContain("Slide Image Placeholder 1");
    expect(notesSlideXml).toContain("Slide Number Placeholder 3");
    expect(notesSlideXml).toContain("creationId");

    expect(notesSlideRelsXml).toContain('Id="rId1"');
    expect(notesSlideRelsXml).toContain('Target="../notesMasters/notesMaster1.xml"');
    expect(notesSlideRelsXml).toContain('Id="rId2"');
    expect(notesSlideRelsXml).toContain('Target="../slides/slide1.xml"');

    expect(notesMasterXml).toContain("<p:notesStyle>");
    expect(notesMasterXml).toContain("Slide Image Placeholder 3");
    expect(notesMasterXml).toContain("Slide Number Placeholder 6");
    expect(notesMasterRelsXml).toContain("../theme/theme2.xml");
    expect(contentTypesXml).toContain('/ppt/theme/theme2.xml');
  });
});
