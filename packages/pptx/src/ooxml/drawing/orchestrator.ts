// src/ooxml/drawing/orchestrator.ts
import type { LayoutNode, LayoutView, LayoutVideo, LayoutAudio } from "../../layout/extract.js";
import type { AnimationManifestEntry, AnimationTargetInfo, ChartBuildEntry, MediaPlaybackEntry } from "../animationTypes.js";
import { generateShapeXml } from "./shape.js";
import { generateTextXml } from "./text.js";
import { generateImageXml } from "./image.js";
import { generateTableXml } from "./table.js";
import { generateChartFrameXml, generateChartExFrameXml, generateChartAlternateContentXml, generateChartFallbackImageXml } from "./chart.js";
import { isChartExType } from "../chart/chartCapabilities.js";
import { resolveChartAnnotations } from "../chart/resolveAnnotations.js";
import { generateConnectorXml } from "./connector.js";
import { generateWebVideoXml } from "./webVideo.js";
import { toEmu } from "./math.js";
import { escapeXmlAttr, emitLocksXml, emitDecorativeExtXml, type HyperlinkRel } from "./textUtils.js";
import { normalizeToParagraphsFromFields } from "./textUtils.js";
import { getLogger } from "../../logger.js";
import { hasVisualProperties } from "../../compatibility/shared.js";

export interface SerializeResult {
  xml: string;
  hyperlinkRels: HyperlinkRel[];
  animationManifest: AnimationManifestEntry[];
  chartBuildEntries: ChartBuildEntry[];
  mediaPlaybackEntries: MediaPlaybackEntry[];
  emittedShapeIds: Set<number>;
}

/**
 * Creates a copy of a child LayoutNode with coordinates relative to a group parent.
 */
function withRelativeLayout(child: LayoutNode, parentX: number, parentY: number): LayoutNode {
  return {
    ...child,
    layout: {
      ...child.layout,
      x: child.layout.x - parentX,
      y: child.layout.y - parentY,
    },
    children: child.children
      ? child.children.map(c => withRelativeLayout(c, parentX, parentY))
      : undefined,
  };
}

/**
 * Options for serializeSlideTree — groups all media rId arrays, counters,
 * and configuration that were previously passed as 16 positional parameters.
 */
export interface SerializeSlideOptions {
  idCounter?: { current: number };
  mediaRIds?: string[];
  imageCounter?: { current: number };
  chartRIds?: string[];
  chartCounter?: { current: number };
  hyperlinkRIdStart?: number;
  fillMediaRIds?: string[];
  fillImageCounter?: { current: number };
  videoMediaInfo?: Array<{ videoRId: string; mediaRId: string; posterRId?: string; webVideo?: { embedUrl: string; watchUrl: string; hyperlinkRId: string } }>;
  videoCounter?: { current: number };
  audioMediaInfo?: Array<{ audioRId: string; mediaRId: string }>;
  audioCounter?: { current: number };
  chartAssets?: Array<{ rId?: string; fallbackRId?: string; isChartEx?: boolean; renderMode?: "native" | "alternate" | "image-only" }>;
  chartFallbackRIds?: string[];
  svgRIds?: string[];
  svgCounter?: { current: number };
}

function countVideoAudioRelationshipSlots(
  videoMediaInfo: NonNullable<SerializeSlideOptions["videoMediaInfo"]>,
  audioMediaInfo: NonNullable<SerializeSlideOptions["audioMediaInfo"]>,
): number {
  let count = 0;

  for (const video of videoMediaInfo) {
    if (video.webVideo) {
      count += 1;
      if (video.posterRId) count += 1;
      continue;
    }

    count += 2;
    if (video.posterRId) count += 1;
  }

  return count + (audioMediaInfo.length * 2);
}

function countChartRelationshipSlots(
  chartAssets: NonNullable<SerializeSlideOptions["chartAssets"]>,
  chartRIds: string[],
  chartFallbackRIds: string[],
): number {
  if (chartAssets.length > 0) {
    return chartAssets.reduce((count, chart) => {
      let next = count;
      if (chart.rId) next += 1;
      if (chart.fallbackRId) next += 1;
      return next;
    }, 0);
  }

  let count = 0;
  for (const rId of chartRIds) {
    if (rId) count += 1;
  }
  for (const fallbackRId of chartFallbackRIds) {
    if (fallbackRId) count += 1;
  }
  return count;
}

function computeDefaultHyperlinkRIdStart(opts: Required<Pick<
  SerializeSlideOptions,
  "mediaRIds" | "fillMediaRIds" | "videoMediaInfo" | "audioMediaInfo" | "chartAssets" | "chartRIds" | "chartFallbackRIds" | "svgRIds"
>>): number {
  const videoAudioCount = countVideoAudioRelationshipSlots(opts.videoMediaInfo, opts.audioMediaInfo);
  const chartStart = 2 + opts.mediaRIds.length + opts.fillMediaRIds.length + videoAudioCount + opts.svgRIds.length;
  return chartStart + countChartRelationshipSlots(opts.chartAssets, opts.chartRIds, opts.chartFallbackRIds);
}

/**
 * Recursively serializes a LayoutNode tree into DrawingML XML strings.
 *
 * @param node    The current LayoutNode to emit.
 * @param opts    Media rId arrays, counters, and configuration.
 */
export function serializeSlideTree(
  node: LayoutNode,
  opts: SerializeSlideOptions = {},
): SerializeResult {
  const idCounter = opts.idCounter ?? { current: 2 };
  const mediaRIds = opts.mediaRIds ?? [];
  const imageCounter = opts.imageCounter ?? { current: 0 };
  const chartRIds = opts.chartRIds ?? [];
  const chartCounter = opts.chartCounter ?? { current: 0 };
  const fillMediaRIds = opts.fillMediaRIds ?? [];
  const fillImageCounter = opts.fillImageCounter ?? { current: 0 };
  const videoMediaInfo = opts.videoMediaInfo ?? [];
  const videoCounter = opts.videoCounter ?? { current: 0 };
  const audioMediaInfo = opts.audioMediaInfo ?? [];
  const audioCounter = opts.audioCounter ?? { current: 0 };
  const chartAssets = opts.chartAssets ?? [];
  const chartFallbackRIds = opts.chartFallbackRIds ?? [];
  const svgRIds = opts.svgRIds ?? [];
  const svgCounter = opts.svgCounter ?? { current: 0 };
  const hyperlinkRIdStart = opts.hyperlinkRIdStart ?? computeDefaultHyperlinkRIdStart({
    mediaRIds,
    fillMediaRIds,
    videoMediaInfo,
    audioMediaInfo,
    chartAssets,
    chartRIds,
    chartFallbackRIds,
    svgRIds,
  });

  let xml = "";
  const allHyperlinkRels: HyperlinkRel[] = [];
  let currentHyperlinkRId = hyperlinkRIdStart;
  const allAnimations: AnimationManifestEntry[] = [];
  const allChartBuilds: ChartBuildEntry[] = [];
  const allMediaPlayback: MediaPlaybackEntry[] = [];
  const emittedShapeIds = new Set<number>();

  function getAnimationTargetInfo(node: LayoutNode): AnimationTargetInfo {
    if (node.type === "Text") {
      const paragraphs = normalizeToParagraphsFromFields(node.content, node.paragraphs);
      return {
        kind: "text",
        textTarget: {
          paragraphCount: paragraphs.length,
          paragraphLevels: paragraphs.map((paragraph) => paragraph.level ?? 0),
        },
      };
    }

    if (node.type === "View") {
      if (node.textContent !== undefined || (node.textParagraphs && node.textParagraphs.length > 0)) {
        const paragraphs = normalizeToParagraphsFromFields(node.textContent, node.textParagraphs);
        return {
          kind: "text",
          textTarget: {
            paragraphCount: paragraphs.length,
            paragraphLevels: paragraphs.map((paragraph) => paragraph.level ?? 0),
          },
        };
      }
    }

    return { kind: "shape" };
  }

  function collectAnimations(node: LayoutNode, shapeId: number): void {
    emittedShapeIds.add(shapeId);
    const target = getAnimationTargetInfo(node);
    if ("animations" in node && node.animations) {
      for (const a of node.animations) {
        allAnimations.push({ shapeId, effect: a.effect, animation: a, target });
      }
    }
    if ("animationGroups" in node && node.animationGroups) {
      for (const group of node.animationGroups) {
        for (const a of group.animations) {
          const animation = { ...a, trigger: a.trigger ?? group.trigger ?? "onClick" } satisfies typeof a;
          allAnimations.push({ shapeId, effect: animation.effect, animation, target });
        }
      }
    }
  }

  // Per-node serializer handlers. Each handler closes over the enclosing
  // state (idCounter, rId arrays, running xml buffer, etc.). Collected in
  // a registry so adding a new node type is a single-entry change and
  // unknown types trigger an explicit warning instead of silently dropping.
  function handleViewOrSlide(node: LayoutNode & { type: "View" | "Slide" }): void {
    if (hasVisualProperties(node)) {
      const shapeId = idCounter.current++;
      // Check if this node has an image fill that needs an rId
      let imageFillRId: string | undefined;
      const fill = node.style?.fill as { type?: string } | undefined;
      if (fill?.type === "image") {
        const idx = fillImageCounter.current++;
        imageFillRId = fillMediaRIds[idx];
        if (imageFillRId === undefined) {
          getLogger().warn(`[orchestrator] Image fill rId out of bounds: index ${idx} >= fillMediaRIds.length ${fillMediaRIds.length}`);
        }
      }
      const result = generateShapeXml(node as LayoutView, shapeId, currentHyperlinkRId, imageFillRId);
      xml += result.xml;
      allHyperlinkRels.push(...result.hyperlinkRels);
      currentHyperlinkRId += result.hyperlinkRels.length;
      collectAnimations(node, shapeId);
    }
    if (node.children) {
      // Propagate flag: children inherit from parent OR if current node is visual
      const insideVisual = hasVisualProperties(node) || node._insideVisualView;
      for (const child of node.children) {
        // Tag children of visual Views so text emitters can apply container-
        // aware overflow policy when fixed card layouts are reflowed by Office.
        if (insideVisual) {
          child._insideVisualView = true;
        }
        recurse(child);
      }
    }
  }

  function handleText(node: LayoutNode & { type: "Text" }): void {
    const shapeId = idCounter.current++;
    const result = generateTextXml(node, shapeId, currentHyperlinkRId);
    xml += result.xml;
    allHyperlinkRels.push(...result.hyperlinkRels);
    currentHyperlinkRId += result.hyperlinkRels.length;
    collectAnimations(node, shapeId);
  }

  function handleImage(node: LayoutNode & { type: "Image" }): void {
    const imgIdx = imageCounter.current++;
    const rId = mediaRIds[imgIdx];
    if (rId === undefined && mediaRIds.length > 0) {
      getLogger().warn(`[orchestrator] Image rId out of bounds: index ${imgIdx} >= mediaRIds.length ${mediaRIds.length}`);
    }
    if (rId !== undefined) {
      const shapeId = idCounter.current++;
      // Check if this image has a corresponding SVG asset
      const svgIdx = node.svgSrc ? svgCounter.current++ : -1;
      if (svgIdx >= 0 && svgIdx >= svgRIds.length) {
        getLogger().warn(`[orchestrator] SVG rId out of bounds: index ${svgIdx} >= svgRIds.length ${svgRIds.length}`);
      }
      const nodeSvgRId = svgIdx >= 0 ? svgRIds[svgIdx] : undefined;
      const result = generateImageXml(node, shapeId, rId, currentHyperlinkRId, nodeSvgRId);
      xml += result.xml;
      allHyperlinkRels.push(...result.hyperlinkRels);
      currentHyperlinkRId += result.hyperlinkRels.length;
      collectAnimations(node, shapeId);
    }
  }

  function handleTable(node: LayoutNode & { type: "Table" }): void {
    const shapeId = idCounter.current++;
    const result = generateTableXml(node, shapeId, currentHyperlinkRId);
    xml += result.xml;
    allHyperlinkRels.push(...result.hyperlinkRels);
    currentHyperlinkRId += result.hyperlinkRels.length;
    collectAnimations(node, shapeId);
  }

  function handleChart(node: LayoutNode & { type: "Chart" }): void {
    const chartIdx = chartCounter.current++;
    const chartAsset = chartAssets[chartIdx];
    const rId = chartAsset?.rId ?? chartRIds[chartIdx];
    if (rId === undefined && chartRIds.length > 0 && chartAsset?.renderMode !== "image-only") {
      getLogger().warn(`[orchestrator] Chart rId out of bounds: index ${chartIdx} >= chartRIds.length ${chartRIds.length}`);
    }
    const fallbackRId = chartAsset?.fallbackRId ?? chartFallbackRIds[chartIdx];
    const usesChartEx = chartAsset?.isChartEx ?? isChartExType(node.chartData.chartType);
    const renderMode = chartAsset?.renderMode;
    const imageOnlyFallback = node._compatibility?.mode === "visual_fallback" || renderMode === "image-only";

    if (rId !== undefined || fallbackRId !== undefined) {
      const shapeId = idCounter.current++;

      if (imageOnlyFallback && fallbackRId) {
        xml += generateChartFallbackImageXml(node, shapeId, fallbackRId);
      } else if (fallbackRId && rId) {
        xml += generateChartAlternateContentXml(node, shapeId, rId, fallbackRId, usesChartEx);
      } else if (rId && usesChartEx) {
        xml += generateChartExFrameXml(node, shapeId, rId);
      } else if (rId) {
        xml += generateChartFrameXml(node, shapeId, rId);
      } else if (fallbackRId) {
        xml += generateChartFallbackImageXml(node, shapeId, fallbackRId);
      }
      collectAnimations(node, shapeId);

      // Resolve category/value-anchored annotations (trendArrow, targetLine)
      // into slide-level Connector + Text shapes. The chart frame XML has
      // already been emitted; these render alongside it on the slide. The
      // legacy text-kind annotations are still rendered via cdr:userShapes
      // inside the chart's drawing XML and are skipped here.
      const resolved = resolveChartAnnotations(node.chartData, {
        x: node.layout.x,
        y: node.layout.y,
        width: node.layout.width,
        height: node.layout.height,
      });
      for (const conn of resolved.connectors) {
        const connId = idCounter.current++;
        xml += generateConnectorXml(conn, connId);
      }
      for (const lbl of resolved.labels) {
        const lblId = idCounter.current++;
        const styleAny = lbl.style as { left?: number; top?: number; width?: number; height?: number } | undefined;
        const labelLayout = {
          x: styleAny?.left ?? node.layout.x,
          y: styleAny?.top ?? node.layout.y,
          width: styleAny?.width ?? 0,
          height: styleAny?.height ?? 0,
        };
        const lblNode = { ...lbl, layout: labelLayout } as unknown as LayoutNode;
        const lblResult = generateTextXml(lblNode, lblId, currentHyperlinkRId);
        xml += lblResult.xml;
        allHyperlinkRels.push(...lblResult.hyperlinkRels);
        currentHyperlinkRId += lblResult.hyperlinkRels.length;
      }

      // Chart build animation (bySeries, byCategory, etc.)
      const chartAnim = node.chartAnimation;
      if (chartAnim) {
        // Preserve the chart's entrance timing without emitting an invalid
        // chart build list until grpId wiring is validated against Office.
        const effect = chartAnim.effect ?? "appear";
        allAnimations.push({
          shapeId,
          effect,
          animation: {
            trigger: chartAnim.trigger ?? "onClick",
            effect,
            duration: chartAnim.duration ?? 500,
            type: "entrance",
          },
          target: { kind: "shape" },
        });
      }
    }
  }

  function handleConnector(node: LayoutNode & { type: "Connector" }): void {
    const shapeId = idCounter.current++;
    xml += generateConnectorXml(node, shapeId);
    collectAnimations(node, shapeId);
  }

  function handleGroup(node: LayoutNode & { type: "Group" }): void {
    const { x, y, width, height } = node.layout;
    const shapeId = idCounter.current++;

    const morphId = node.morphId;
    const groupName = morphId ? `!!${escapeXmlAttr(morphId)}` : `Group ${shapeId}`;
    const groupAltText = node.altText;
    const groupDecorative = node.decorative;
    const groupLocks = node.locks;

    xml += `<p:grpSp>\n`;
    xml += `  <p:nvGrpSpPr>\n`;
    const grpDescrAttr = groupAltText ? ` descr="${escapeXmlAttr(groupAltText)}"` : "";
    if (groupDecorative) {
      xml += `    <p:cNvPr id="${shapeId}" name="${groupName}"${grpDescrAttr}>${emitDecorativeExtXml()}</p:cNvPr>\n`;
    } else {
      xml += `    <p:cNvPr id="${shapeId}" name="${groupName}"${grpDescrAttr}/>\n`;
    }
    xml += `    <p:cNvGrpSpPr>${emitLocksXml("a:grpSpLocks", groupLocks, { noGrp: true })}</p:cNvGrpSpPr>\n`;
    xml += `    <p:nvPr/>\n`;
    xml += `  </p:nvGrpSpPr>\n`;
    xml += `  <p:grpSpPr>\n`;
    xml += `    <a:xfrm>\n`;
    xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
    xml += `      <a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
    xml += `      <a:chOff x="0" y="0"/>\n`;
    xml += `      <a:chExt cx="${toEmu(width)}" cy="${toEmu(height)}"/>\n`;
    xml += `    </a:xfrm>\n`;
    xml += `  </p:grpSpPr>\n`;

    collectAnimations(node, shapeId);

    if (node.children) {
      for (const child of node.children) {
        recurse(withRelativeLayout(child, x, y));
      }
    }

    xml += `</p:grpSp>\n`;
  }

  function handleVideoOrAudio(node: LayoutNode & { type: "Video" | "Audio" }): void {
    const isVideo = node.type === "Video";
    const mediaInfo = isVideo ? videoMediaInfo[videoCounter.current++] : audioMediaInfo[audioCounter.current++];
    const shapeId = idCounter.current++;
    const { x, y, width, height } = node.layout;
    const mediaAltText = node.altText;
    const mediaDescr = mediaAltText ? ` descr="${escapeXmlAttr(mediaAltText)}"` : "";
    const mediaName = `${node.type} ${shapeId}`;
    const playback = node.playback;

      const videoWebVideo = isVideo ? (mediaInfo as { webVideo?: { embedUrl: string; watchUrl: string; hyperlinkRId: string } })?.webVideo : undefined;
      if (isVideo && videoWebVideo) {
        // Web video (YouTube/Vimeo) — emit <mc:AlternateContent>
        xml += generateWebVideoXml(
          node as LayoutVideo,
          shapeId,
          videoWebVideo,
          (mediaInfo as { posterRId?: string }).posterRId,
        );
        // No playback timing for web videos
      } else if (mediaInfo) {
        const linkRId = isVideo ? (mediaInfo as { videoRId: string }).videoRId : (mediaInfo as { audioRId: string }).audioRId;
        const embedRId = mediaInfo.mediaRId;
        const posterRId = isVideo ? (mediaInfo as { posterRId?: string }).posterRId : undefined;

        xml += `<p:pic>\n`;
        xml += `  <p:nvPicPr>\n`;
        xml += `    <p:cNvPr id="${shapeId}" name="${mediaName}"${mediaDescr}>\n`;
        xml += `      <a:hlinkClick r:id="" action="ppaction://media"/>\n`;
        xml += `    </p:cNvPr>\n`;
        xml += `    <p:cNvPicPr>\n`;
        xml += `      <a:picLocks noChangeAspect="1"/>\n`;
        xml += `    </p:cNvPicPr>\n`;
        xml += `    <p:nvPr>\n`;
        xml += `      <a:${isVideo ? "video" : "audio"}File r:link="${linkRId}"/>\n`;
        xml += `      <p:extLst>\n`;
        xml += `        <p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">\n`;
        const hasTrim = playback && (playback.trimStart !== undefined || playback.trimEnd !== undefined);
        if (hasTrim) {
          xml += `          <p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${embedRId}">`;
          xml += `<p14:trim st="${playback!.trimStart ?? 0}" end="${playback!.trimEnd ?? 0}"/>`;
          xml += `</p14:media>\n`;
        } else {
          xml += `          <p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${embedRId}"/>\n`;
        }
        xml += `        </p:ext>\n`;
        xml += `      </p:extLst>\n`;
        xml += `    </p:nvPr>\n`;
        xml += `  </p:nvPicPr>\n`;
        xml += `  <p:blipFill>\n`;
        xml += posterRId ? `    <a:blip r:embed="${posterRId}"/>\n` : `    <a:blip/>\n`;
        xml += `    <a:stretch><a:fillRect/></a:stretch>\n`;
        xml += `  </p:blipFill>\n`;
        xml += `  <p:spPr>\n`;
        xml += `    <a:xfrm>\n`;
        const effectiveWidth = !isVideo && (node as LayoutAudio).icon === "none" ? 0 : width;
        const effectiveHeight = !isVideo && (node as LayoutAudio).icon === "none" ? 0 : height;
        xml += `      <a:off x="${toEmu(x)}" y="${toEmu(y)}"/>\n`;
        xml += `      <a:ext cx="${toEmu(effectiveWidth)}" cy="${toEmu(effectiveHeight)}"/>\n`;
        xml += `    </a:xfrm>\n`;
        xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
        xml += `  </p:spPr>\n`;
        xml += `</p:pic>\n`;

        if (playback) {
          allMediaPlayback.push({
            shapeId,
            mediaType: isVideo ? "video" : "audio",
            playback,
            playAcrossSlides: !isVideo ? (node as LayoutAudio).playAcrossSlides : undefined,
          });
        }
      } else {
        // Fallback: no media info, emit placeholder rectangle
        xml += `<p:sp>\n`;
        xml += `  <p:nvSpPr>\n`;
        xml += `    <p:cNvPr id="${shapeId}" name="${mediaName}"${mediaDescr}/>\n`;
        xml += `    <p:cNvSpPr/>\n`;
        xml += `    <p:nvPr/>\n`;
        xml += `  </p:nvSpPr>\n`;
        xml += `  <p:spPr>\n`;
        xml += `    <a:xfrm><a:off x="${toEmu(x)}" y="${toEmu(y)}"/><a:ext cx="${toEmu(width)}" cy="${toEmu(height)}"/></a:xfrm>\n`;
        xml += `    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>\n`;
        xml += `    <a:noFill/>\n`;
        xml += `    <a:ln><a:noFill/><a:round/></a:ln>\n`;
        xml += `  </p:spPr>\n`;
        xml += `  <p:txBody>\n`;
        xml += `    <a:bodyPr rtlCol="0"/>\n`;
        xml += `    <a:lstStyle/>\n`;
        xml += `    <a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>\n`;
        xml += `  </p:txBody>\n`;
        xml += `</p:sp>\n`;
      }
      collectAnimations(node, shapeId);
  }

  // Serializer registry — keyed by LayoutNode.type. Adding a new node type
  // means adding an entry here; the dispatcher does not change. Types not
  // present in the registry trigger an explicit UNKNOWN_NODE_TYPE warning
  // rather than silently dropping (WS-1/WS-5 in docs/audit-0422/3-plan.md).
  const SERIALIZERS: Partial<Record<LayoutNode["type"], (node: LayoutNode) => void>> = {
    View: (node) => handleViewOrSlide(node as LayoutNode & { type: "View" | "Slide" }),
    Slide: (node) => handleViewOrSlide(node as LayoutNode & { type: "View" | "Slide" }),
    Text: (node) => handleText(node as LayoutNode & { type: "Text" }),
    Image: (node) => handleImage(node as LayoutNode & { type: "Image" }),
    Table: (node) => handleTable(node as LayoutNode & { type: "Table" }),
    Chart: (node) => handleChart(node as LayoutNode & { type: "Chart" }),
    Connector: (node) => handleConnector(node as LayoutNode & { type: "Connector" }),
    Group: (node) => handleGroup(node as LayoutNode & { type: "Group" }),
    Video: (node) => handleVideoOrAudio(node as LayoutNode & { type: "Video" | "Audio" }),
    Audio: (node) => handleVideoOrAudio(node as LayoutNode & { type: "Video" | "Audio" }),
  };

  function recurse(node: LayoutNode): void {
    if (node.style?.display === "none") return;
    const handler = SERIALIZERS[node.type];
    if (handler) {
      handler(node);
      return;
    }
    getLogger().warn(
      `[orchestrator] UNKNOWN_NODE_TYPE: no serializer registered for node.type="${(node as { type?: unknown }).type}". Node was dropped from slide XML.`,
    );
  }

  recurse(node);
  return { xml, hyperlinkRels: allHyperlinkRels, animationManifest: allAnimations, chartBuildEntries: allChartBuilds, mediaPlaybackEntries: allMediaPlayback, emittedShapeIds };
}
