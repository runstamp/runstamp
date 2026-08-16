// Phase 4 smoke tests: Connection points, media playback, table gradient fills, table text direction
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { getZipEntry, TINY_VIDEO, TINY_AUDIO } from "./helpers/xmlTestUtils.js";

setDeterministicMode(true);

describe("Phase 4 — Enterprise Enhancements", () => {
  describe("4A: Connection Point Snapping", () => {
    it("connector with startShape and endShape emits stCxn and endCxn", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [
            {
              type: "View" as const,
              style: { width: 100, height: 100, backgroundColor: "#FF0000" },
            },
            {
              type: "View" as const,
              style: { width: 100, height: 100, backgroundColor: "#0000FF" },
            },
            {
              type: "Connector" as const,
              start: { x: 100, y: 50 },
              end: { x: 200, y: 50 },
              connectorType: "straight" as const,
              startShape: { shapeId: 2, site: 3 },
              endShape: { shapeId: 3, site: 1 },
            },
          ],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:cxnSp>");
      expect(slideXml).toContain("a:stCxn");
      expect(slideXml).toContain('id="2"');
      expect(slideXml).toContain('idx="3"');
      expect(slideXml).toContain("a:endCxn");
      expect(slideXml).toContain('idx="1"');
    });

    it("connector without shape connections has empty cNvCxnSpPr", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Connector" as const,
            start: { x: 0, y: 0 },
            end: { x: 100, y: 100 },
            connectorType: "straight" as const,
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:cNvCxnSpPr/>");
      expect(slideXml).not.toContain("a:stCxn");
      expect(slideXml).not.toContain("a:endCxn");
    });

    it("connector with only endShape emits endCxn only", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Connector" as const,
            start: { x: 0, y: 0 },
            end: { x: 100, y: 100 },
            connectorType: "elbow" as const,
            endShape: { shapeId: 5, site: 2 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).not.toContain("a:stCxn");
      expect(slideXml).toContain("a:endCxn");
      expect(slideXml).toContain('id="5"');
      expect(slideXml).toContain('idx="2"');
    });
  });

  describe("4B: Media Playback Options", () => {
    it("video with trim emits p14:trim element", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Video" as const,
            src: TINY_VIDEO,
            mimeType: "video/mp4",
            playback: {
              trimStart: 1000,
              trimEnd: 5000,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("p14:trim");
      expect(slideXml).toContain('st="1000"');
      expect(slideXml).toContain('end="5000"');
    });

    it("video with loop and volume emits cMediaNode in timing", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Video" as const,
            src: TINY_VIDEO,
            mimeType: "video/mp4",
            playback: {
              loop: true,
              volume: 50,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:timing>");
      expect(slideXml).toContain("p:video");
      expect(slideXml).toContain("p:cMediaNode");
      expect(slideXml).toContain('vol="50000"');
      expect(slideXml).toContain('repeatCount="indefinite"');
    });

    it("video with autoPlay emits delay=0 condition", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Video" as const,
            src: TINY_VIDEO,
            mimeType: "video/mp4",
            playback: {
              autoPlay: true,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:timing>");
      expect(slideXml).toContain("p:video");
      expect(slideXml).toContain('delay="0"');
    });

    it("video with hideOnClick emits showWhenStopped=0", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Video" as const,
            src: TINY_VIDEO,
            mimeType: "video/mp4",
            playback: {
              hideOnClick: true,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain('showWhenStopped="0"');
    });

    it("audio with playback options emits p:audio timing", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Audio" as const,
            src: TINY_AUDIO,
            mimeType: "audio/mp3",
            playback: {
              loop: true,
              volume: 75,
              autoPlay: true,
            },
            style: { width: 100, height: 100 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:timing>");
      expect(slideXml).toContain("p:audio");
      expect(slideXml).toContain("p:cMediaNode");
      expect(slideXml).toContain('vol="75000"');
      expect(slideXml).toContain('repeatCount="indefinite"');
    });

    it("audio with trim emits p14:trim element", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Audio" as const,
            src: TINY_AUDIO,
            mimeType: "audio/mp3",
            playback: {
              trimStart: 500,
              trimEnd: 3000,
            },
            style: { width: 100, height: 100 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("p14:trim");
      expect(slideXml).toContain('st="500"');
      expect(slideXml).toContain('end="3000"');
    });

    it("video without playback options has no timing or trim", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Video" as const,
            src: TINY_VIDEO,
            mimeType: "video/mp4",
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).not.toContain("p14:trim");
      expect(slideXml).not.toContain("<p:timing>");
    });
  });

  describe("4C: Table Gradient Cell Fills", () => {
    it("table cell with linear gradient fill emits gradFill", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [200],
              rows: [{
                cells: [{
                  text: "Gradient Cell",
                  style: {
                    fill: {
                      type: "linear" as const,
                      angle: 90,
                      stops: [
                        { color: "#FF0000", position: 0 },
                        { color: "#0000FF", position: 100 },
                      ],
                    },
                  },
                }],
              }],
            },
            style: { width: 200, height: 50 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("a:gradFill");
      expect(slideXml).toContain("a:gsLst");
      expect(slideXml).toContain("a:lin");
      expect(slideXml).toContain("FF0000");
      expect(slideXml).toContain("0000FF");
    });

    it("table cell with radial gradient fill emits gradFill with path", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [200],
              rows: [{
                cells: [{
                  text: "Radial",
                  style: {
                    fill: {
                      type: "radial" as const,
                      stops: [
                        { color: "#FFFFFF", position: 0 },
                        { color: "#000000", position: 100 },
                      ],
                    },
                  },
                }],
              }],
            },
            style: { width: 200, height: 50 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("a:gradFill");
      expect(slideXml).toContain("a:path");
      expect(slideXml).toContain("FFFFFF");
      expect(slideXml).toContain("000000");
    });

    it("table cell with solid fill still works", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [200],
              rows: [{
                cells: [{
                  text: "Solid",
                  style: { fill: "#FF0000" },
                }],
              }],
            },
            style: { width: 200, height: 50 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("a:solidFill");
      expect(slideXml).toContain("FF0000");
      expect(slideXml).not.toContain("a:gradFill");
    });

    it("gradient with alpha on stops emits alpha modifier", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [200],
              rows: [{
                cells: [{
                  text: "Alpha",
                  style: {
                    fill: {
                      type: "linear" as const,
                      stops: [
                        { color: "#FF0000", position: 0, alpha: 0.5 },
                        { color: "#0000FF", position: 100 },
                      ],
                    },
                  },
                }],
              }],
            },
            style: { width: 200, height: 50 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("a:alpha");
      expect(slideXml).toContain("a:gradFill");
    });
  });

  describe("4D: Table Per-Cell Text Direction", () => {
    it("vertical text direction emits vert=vert270", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [100],
              rows: [{
                cells: [{
                  text: "Vertical",
                  style: { textDirection: "vertical" as const },
                }],
              }],
            },
            style: { width: 100, height: 100 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain('vert="vert270"');
    });

    it("verticalEA text direction emits vert=eaVert", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [100],
              rows: [{
                cells: [{
                  text: "East Asian Vertical",
                  style: { textDirection: "verticalEA" as const },
                }],
              }],
            },
            style: { width: 100, height: 100 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain('vert="eaVert"');
    });

    it("horizontal text direction omits vert attribute", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [100],
              rows: [{
                cells: [{
                  text: "Normal",
                  style: { textDirection: "horizontal" as const },
                }],
              }],
            },
            style: { width: 100, height: 100 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).not.toContain('vert=');
    });

    it("text direction combined with vertical alignment", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Table" as const,
            tableData: {
              columns: [100],
              rows: [{
                cells: [{
                  text: "Combined",
                  style: {
                    textDirection: "vertical" as const,
                    verticalAlign: "middle" as const,
                    fill: "#EEEEFF",
                  },
                }],
              }],
            },
            style: { width: 100, height: 100 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain('vert="vert270"');
      expect(slideXml).toContain('anchor="ctr"');
      expect(slideXml).toContain("EEEEFF");
    });
  });
});
