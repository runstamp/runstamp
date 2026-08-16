// Web Video embedding tests: URL detection, feature gating, XML generation, rId calculation, audio enhancements
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { parseWebVideoUrl, isWebVideoUrl } from "../src/ooxml/webVideoDetect.js";
import { generateWebVideoXml } from "../src/ooxml/drawing/webVideo.js";
import { countVideoAudioRIds } from "../src/ooxml/rIdCalc.js";
import { isFeatureAvailable } from "../src/feature-gate.js";
import { getZipEntry, TINY_AUDIO } from "./helpers/xmlTestUtils.js";

setDeterministicMode(true);

describe("Web Video — URL Detection", () => {
  it("detects YouTube standard URL", () => {
    const result = parseWebVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(result!.platform).toBe("youtube");
    expect(result!.videoId).toBe("dQw4w9WgXcQ");
    expect(result!.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(result!.watchUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result!.posterUrl).toContain("hqdefault.jpg");
  });

  it("detects YouTube short URL", () => {
    const result = parseWebVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(result!.platform).toBe("youtube");
    expect(result!.videoId).toBe("dQw4w9WgXcQ");
  });

  it("detects YouTube embed URL", () => {
    const result = parseWebVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe("dQw4w9WgXcQ");
  });

  it("detects YouTube mobile URL", () => {
    const result = parseWebVideoUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe("dQw4w9WgXcQ");
  });

  it("detects YouTube nocookie URL", () => {
    const result = parseWebVideoUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe("dQw4w9WgXcQ");
  });

  it("detects YouTube URL with extra query params", () => {
    const result = parseWebVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf");
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe("dQw4w9WgXcQ");
  });

  it("detects Vimeo standard URL", () => {
    const result = parseWebVideoUrl("https://vimeo.com/123456789");
    expect(result).not.toBeNull();
    expect(result!.platform).toBe("vimeo");
    expect(result!.videoId).toBe("123456789");
    expect(result!.embedUrl).toBe("https://player.vimeo.com/video/123456789");
    expect(result!.posterUrl).toBe(""); // resolved via oEmbed
  });

  it("detects Vimeo player URL", () => {
    const result = parseWebVideoUrl("https://player.vimeo.com/video/123456789");
    expect(result).not.toBeNull();
    expect(result!.platform).toBe("vimeo");
    expect(result!.videoId).toBe("123456789");
  });

  it("returns null for non-video URLs", () => {
    expect(parseWebVideoUrl("https://example.com/video.mp4")).toBeNull();
    expect(parseWebVideoUrl("https://youtube.com/channel/UCxyz")).toBeNull();
    expect(parseWebVideoUrl("https://vimeo.com/about")).toBeNull();
    expect(parseWebVideoUrl("not-a-url")).toBeNull();
  });

  it("isWebVideoUrl returns correct boolean", () => {
    expect(isWebVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isWebVideoUrl("https://vimeo.com/123456789")).toBe(true);
    expect(isWebVideoUrl("https://example.com/video.mp4")).toBe(false);
  });
});

describe("Web Video — Feature Gating", () => {
  it("web-video-embedding is a Pro feature", () => {
    expect(isFeatureAvailable("web-video-embedding", "pro")).toBe(true);
    expect(isFeatureAvailable("web-video-embedding", "lite")).toBe(false);
  });
});

describe("Web Video — XML Generation", () => {
  it("generateWebVideoXml produces mc:AlternateContent", () => {
    const node = {
      type: "Video" as const,
      src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      layout: { x: 100, y: 50, width: 640, height: 360 },
      altText: "Demo Video",
    } as any;

    const xml = generateWebVideoXml(node, 5, {
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      hyperlinkRId: "rId3",
    }, "rId4");

    expect(xml).toContain("<mc:AlternateContent");
    expect(xml).toContain('xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"');
    expect(xml).toContain('<mc:Choice Requires="we">');
    expect(xml).toContain("<we:webextension");
    expect(xml).toContain("<we:webvideo");
    expect(xml).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(xml).toContain('<a:hlinkClick r:id="rId3"');
    expect(xml).toContain('<a:blip r:embed="rId4"');
    expect(xml).toContain("<mc:Fallback>");
    expect(xml).toContain('descr="Demo Video"');
  });

  it("generateWebVideoXml handles missing poster", () => {
    const node = {
      type: "Video" as const,
      src: "https://vimeo.com/123456789",
      layout: { x: 0, y: 0, width: 400, height: 300 },
    } as any;

    const xml = generateWebVideoXml(node, 3, {
      embedUrl: "https://player.vimeo.com/video/123456789",
      watchUrl: "https://vimeo.com/123456789",
      hyperlinkRId: "rId2",
    });

    expect(xml).toContain("<a:blip/>");
    expect(xml).not.toContain('r:embed="undefined"');
  });

  it("fallback block contains hyperlink", () => {
    const node = {
      type: "Video" as const,
      src: "https://www.youtube.com/watch?v=test12345ab",
      layout: { x: 10, y: 20, width: 500, height: 280 },
    } as any;

    const xml = generateWebVideoXml(node, 7, {
      embedUrl: "https://www.youtube.com/embed/test12345ab",
      watchUrl: "https://www.youtube.com/watch?v=test12345ab",
      hyperlinkRId: "rId5",
    }, "rId6");

    // Both Choice and Fallback should have the hyperlink
    const parts = xml.split("<mc:Fallback>");
    expect(parts[0]).toContain('r:id="rId5"'); // Choice block
    expect(parts[1]).toContain('r:id="rId5"'); // Fallback block
  });
});

describe("Web Video — rId Calculation", () => {
  it("web video with poster counts as 2 rIds", () => {
    const result = countVideoAudioRIds(
      [{ posterRId: "rId3", webVideo: { hyperlinkRId: "rId2" } }],
      0,
    );
    expect(result).toBe(2); // hyperlinkRId + posterRId
  });

  it("web video without poster counts as 1 rId", () => {
    const result = countVideoAudioRIds(
      [{ webVideo: { hyperlinkRId: "rId2" } }],
      0,
    );
    expect(result).toBe(1); // hyperlinkRId only
  });

  it("local video with poster counts as 3 rIds", () => {
    const result = countVideoAudioRIds(
      [{ posterRId: "rId4" }],
      0,
    );
    expect(result).toBe(3); // videoRId + mediaRId + posterRId
  });

  it("local video without poster counts as 2 rIds", () => {
    const result = countVideoAudioRIds(
      [{}],
      0,
    );
    expect(result).toBe(2); // videoRId + mediaRId
  });

  it("mixed web and local videos count correctly", () => {
    const result = countVideoAudioRIds(
      [
        { webVideo: { hyperlinkRId: "rId2" }, posterRId: "rId3" },  // web: 2
        { posterRId: "rId6" },                                        // local: 3
        {},                                                            // local: 2
      ],
      1, // 1 audio = 2 rIds
    );
    expect(result).toBe(9); // 2 + 3 + 2 + 2
  });
});

describe("Web Video — Audio Enhancements", () => {
  it("audio with playAcrossSlides produces isNarration timing", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Audio" as const,
          src: TINY_AUDIO,
          style: { width: 50, height: 50 },
          playback: { autoPlay: true, loop: true },
          playAcrossSlides: true,
        }],
      }],
    };

    const buf = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).toContain('isNarration="1"');
    expect(slideXml).toContain("<p:audio");
  });

  it("audio with icon=none has minimal dimensions", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Audio" as const,
          src: TINY_AUDIO,
          style: { width: 50, height: 50 },
          icon: "none" as const,
        }],
      }],
    };

    const buf = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    // Audio shape should exist but with 0 dimensions
    expect(slideXml).toContain("a:audioFile");
    expect(slideXml).toContain('cx="0"');
    expect(slideXml).toContain('cy="0"');
  });

  it("audio without playAcrossSlides does not have isNarration", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Audio" as const,
          src: TINY_AUDIO,
          style: { width: 50, height: 50 },
          playback: { autoPlay: true },
        }],
      }],
    };

    const buf = await PaperEngine.render(doc as any);
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).not.toContain("isNarration");
  });
});
