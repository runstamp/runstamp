// src/ooxml/rIdCalc.ts — Shared rId arithmetic for slide relationship numbering

// ---------------------------------------------------------------------------
// Presentation-level rId layout (ppt/_rels/presentation.xml.rels)
//
// Single-master (masterCount=1):
//   rId1          = slideMaster1
//   rId2          = theme1
//   rId(2+i)      = slide i  (i is 1-indexed, so slide 1 → rId3)
//   rId(2+N+1..3) = presProps, viewProps, tableStyles
//   rId(2+N+4)    = notesMaster  (if any)
//   rId(2+N+5)    = commentAuthors  (if any, after notesMaster slot)
//
// Multi-master (masterCount=M):
//   rId1..rIdM    = slideMasters
//   rId(M+1)      = theme1
//   rId(M+1+i)    = slide i  (slide 1 → rId(M+2))
//   rId(M+1+N+1..3) = presProps, viewProps, tableStyles
//   rId(M+1+N+4)  = notesMaster  (if any)
//   rId(M+1+N+5)  = commentAuthors  (if any)
//
// Unified formula (works for both):
//   slideRId(i)        = masterCount + 1 + i
//   notesMasterRId     = masterCount + slideCount + 5
//   commentAuthorsRId  = masterCount + slideCount + 6  (when notesMaster present)
//                      = masterCount + slideCount + 5  (when no notesMaster)
//   handoutMasterRId   = masterCount + slideCount + 5 + (notes?1:0) + (comments?1:0)
// ---------------------------------------------------------------------------

/**
 * Returns the rId number for slide `slideIndex` (1-indexed) in a presentation
 * with `masterCount` slide masters.
 *
 * Single-master: computePresSlideRId(1, 1) → 3  (rId3)
 * Multi-master:  computePresSlideRId(3, 1) → 5  (rId5)
 */
export function computePresSlideRId(masterCount: number, slideIndex: number): number {
  return masterCount + 1 + slideIndex;
}

/**
 * Returns the rId number for the notesMaster relationship in a presentation
 * with `masterCount` slide masters and `slideCount` slides.
 *
 * Layout: masters(M) + theme(1) + slides(N) + presProps+viewProps+tableStyles(3) + notesMaster = M+N+5
 *
 * Single-master (M=1, N slides): 1 + N + 5 = N + 6
 * Multi-master  (M masters):     M + N + 5
 */
export function computePresNotesMasterRId(masterCount: number, slideCount: number): number {
  return masterCount + slideCount + 5;
}

/**
 * Returns the rId number for the commentAuthors relationship.
 * Positioned immediately after notesMaster (or in its slot when no notes).
 */
export function computePresCommentsRId(masterCount: number, slideCount: number, hasNotes: boolean): number {
  return masterCount + slideCount + 5 + (hasNotes ? 1 : 0);
}

/**
 * Returns the rId number for the handoutMaster relationship.
 * Positioned immediately after commentAuthors (or in its slot when no comments).
 */
export function computePresHandoutMasterRId(
  masterCount: number,
  slideCount: number,
  hasNotes: boolean,
  hasComments: boolean,
): number {
  return masterCount + slideCount + 5
    + (hasNotes ? 1 : 0)
    + (hasComments ? 1 : 0);
}

/**
 * Counts the number of rIds consumed by video and audio assets.
 * Each video uses 2 rIds (video + media), plus 1 extra if it has a poster frame.
 * Each audio uses 2 rIds (audio + media).
 */
export function countVideoAudioRIds(
  videoAssets: { posterRId?: string; webVideo?: { hyperlinkRId: string } }[],
  audioCount: number,
): number {
  let count = 0;
  for (const v of videoAssets) {
    if (v.webVideo) {
      count += 1; // hyperlinkRId
      if (v.posterRId) count += 1; // posterRId
    } else {
      count += 2; // videoRId + mediaRId
      if (v.posterRId) count += 1;
    }
  }
  count += audioCount * 2; // audioRId + mediaRId each
  return count;
}

/**
 * Computes the starting rId for chart relationships in a slide.
 * rId1 is reserved for the slide layout, so charts start after:
 *   1 (layout) + imageCount + fillCount + videoAudioRIdCount + svgCount
 */
export function computeChartStartRId(
  imageCount: number,
  fillCount: number,
  videoAudioRIdCount: number,
  svgCount: number = 0,
): number {
  return 2 + imageCount + fillCount + videoAudioRIdCount + svgCount;
}
