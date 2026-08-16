import { describe, it, expect } from "vitest";
import { countVideoAudioRIds, computeChartStartRId, computePresSlideRId, computePresNotesMasterRId, computePresCommentsRId } from "../src/ooxml/rIdCalc.js";

describe("countVideoAudioRIds", () => {
  it("returns 0 for empty inputs", () => {
    expect(countVideoAudioRIds([], 0)).toBe(0);
  });

  it("counts 2 rIds per video without poster", () => {
    expect(countVideoAudioRIds([{}], 0)).toBe(2);
    expect(countVideoAudioRIds([{}, {}], 0)).toBe(4);
  });

  it("counts 3 rIds per video with poster", () => {
    expect(countVideoAudioRIds([{ posterRId: "rId5" }], 0)).toBe(3);
  });

  it("counts 2 rIds per audio", () => {
    expect(countVideoAudioRIds([], 1)).toBe(2);
    expect(countVideoAudioRIds([], 3)).toBe(6);
  });

  it("combines video and audio correctly", () => {
    // 1 video with poster (3) + 1 video without (2) + 2 audio (4)
    const videos = [{ posterRId: "rId1" }, {}];
    expect(countVideoAudioRIds(videos, 2)).toBe(9);
  });
});

describe("computePresSlideRId", () => {
  it("single-master slide 1 → rId3", () => {
    expect(computePresSlideRId(1, 1)).toBe(3);
  });

  it("single-master slide N → rId(N+2)", () => {
    expect(computePresSlideRId(1, 5)).toBe(7);
    expect(computePresSlideRId(1, 10)).toBe(12);
  });

  it("multi-master (3 masters) slide 1 → rId5", () => {
    // rId1..3=masters, rId4=theme, rId5=slide1
    expect(computePresSlideRId(3, 1)).toBe(5);
  });

  it("multi-master (3 masters) slide N → rId(M+1+N)", () => {
    expect(computePresSlideRId(3, 5)).toBe(9);
  });
});

describe("computePresNotesMasterRId", () => {
  it("single-master (M=1) with N slides → N+6", () => {
    expect(computePresNotesMasterRId(1, 1)).toBe(7);   // 1+1+5
    expect(computePresNotesMasterRId(1, 5)).toBe(11);  // 1+5+5
    expect(computePresNotesMasterRId(1, 10)).toBe(16); // 1+10+5
  });

  it("multi-master (M=3) with N slides → M+N+5", () => {
    expect(computePresNotesMasterRId(3, 5)).toBe(13);  // 3+5+5
  });

  it("single-master backward-compat: equals slideCount+6", () => {
    for (let n = 1; n <= 20; n++) {
      expect(computePresNotesMasterRId(1, n)).toBe(n + 6);
    }
  });

  it("multi-master backward-compat: equals M+1+N+3+1", () => {
    // Old formula: mastersConfig.length + 1 + slideCount + 3 + 1
    for (let m = 1; m <= 5; m++) {
      for (let n = 1; n <= 10; n++) {
        expect(computePresNotesMasterRId(m, n)).toBe(m + 1 + n + 3 + 1);
      }
    }
  });
});

describe("computePresCommentsRId", () => {
  it("with notes: commentsRId = notesMasterRId + 1", () => {
    expect(computePresCommentsRId(1, 5, true)).toBe(computePresNotesMasterRId(1, 5) + 1);
  });

  it("without notes: commentsRId = notesMasterRId slot (same position)", () => {
    expect(computePresCommentsRId(1, 5, false)).toBe(computePresNotesMasterRId(1, 5));
  });

  it("multi-master with notes", () => {
    expect(computePresCommentsRId(3, 5, true)).toBe(computePresNotesMasterRId(3, 5) + 1);
  });
});

describe("computeChartStartRId", () => {
  it("returns 2 for empty inputs (rId1 = layout)", () => {
    expect(computeChartStartRId(0, 0, 0)).toBe(2);
  });

  it("accounts for images", () => {
    expect(computeChartStartRId(3, 0, 0)).toBe(5);
  });

  it("accounts for fill assets", () => {
    expect(computeChartStartRId(0, 2, 0)).toBe(4);
  });

  it("accounts for video/audio rIds", () => {
    expect(computeChartStartRId(0, 0, 5)).toBe(7);
  });

  it("combines all inputs (no SVG)", () => {
    // 2 + 3 images + 2 fills + 4 videoAudio = 11
    expect(computeChartStartRId(3, 2, 4)).toBe(11);
  });

  it("accounts for SVG rIds", () => {
    // 2 + 0 images + 0 fills + 0 videoAudio + 2 SVGs = 4
    expect(computeChartStartRId(0, 0, 0, 2)).toBe(4);
  });

  it("combines all inputs including SVG", () => {
    // 2 + 3 images + 2 fills + 4 videoAudio + 1 SVG = 12
    expect(computeChartStartRId(3, 2, 4, 1)).toBe(12);
  });
});
