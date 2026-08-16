// src/ooxml/timing.ts — Animation timing tree XML emitter
import { PaperError } from "../errors.js";
import type { AnimationTrigger } from "../types/ast.js";
import { emitEasingAttrs, emitEffectElement, type ParagraphRangeTarget } from "./animationBehaviors.js";
import {
  getEffectInfo,
  getNormalizedRepeat,
  isBuildAnimation,
  isTextBuildGrouping,
  normalizeAnimationIntent,
  type NormalizedAnimationIntent,
} from "./animationEffects.js";
import type { AnimationManifest, AnimationManifestEntry, ChartBuildEntry, MediaPlaybackEntry } from "./animationTypes.js";

const NODE_TYPE_MAP: Record<AnimationTrigger, string> = {
  onClick: "clickEffect",
  withPrevious: "withEffect",
  afterPrevious: "afterEffect",
};

interface AnimationRunSpec {
  entry: AnimationManifestEntry;
  animation: NormalizedAnimationIntent;
  paragraphRange?: ParagraphRangeTarget;
  triggerOverride?: AnimationTrigger;
}

interface SequenceSpec {
  kind: "sequence";
  runs: AnimationRunSpec[];
}

interface ClickGroupSpec {
  items: Array<AnimationRunSpec | SequenceSpec>;
}

function isSequenceSpec(item: AnimationRunSpec | SequenceSpec): item is SequenceSpec {
  return "kind" in item && item.kind === "sequence";
}

function getRepeatAttr(animation: NormalizedAnimationIntent): string {
  const repeat = getNormalizedRepeat(animation);
  if (repeat === undefined) return "";
  return repeat === "indefinite"
    ? ' repeatCount="indefinite"'
    : ` repeatCount="${Math.round(repeat * 1000)}"`;
}

function emitRunXml(
  spec: AnimationRunSpec,
  cTnId: { current: number },
  runNodeIdsByShapeId?: Map<number, number[]>,
): string {
  const trigger = spec.triggerOverride ?? spec.animation.trigger;
  const info = getEffectInfo(spec.animation);
  const delay = spec.animation.delay ?? 0;
  const easingAttrs = emitEasingAttrs(spec.animation);
  const repeatAttr = getRepeatAttr(spec.animation);
  const effectEl = emitEffectElement(
    spec.animation,
    { shapeId: spec.entry.shapeId, target: spec.entry.target, paragraphRange: spec.paragraphRange },
    cTnId,
  );
  const runId = cTnId.current;
  if (runNodeIdsByShapeId) {
    const runIds = runNodeIdsByShapeId.get(spec.entry.shapeId) ?? [];
    runIds.push(runId);
    runNodeIdsByShapeId.set(spec.entry.shapeId, runIds);
  }

  return `<p:par><p:cTn id="${cTnId.current++}" presetID="${info.presetID}" presetClass="${info.presetClass}" presetSubtype="${info.presetSubtype}" fill="hold" nodeType="${NODE_TYPE_MAP[trigger] ?? "clickEffect"}"${repeatAttr}${easingAttrs}><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${effectEl}</p:childTnLst></p:cTn></p:par>`;
}

function emitSequenceXml(
  sequence: SequenceSpec,
  cTnId: { current: number },
  runNodeIdsByShapeId?: Map<number, number[]>,
): string {
  const childXml = sequence.runs.map((run) => emitRunXml(run, cTnId, runNodeIdsByShapeId)).join("");
  return `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${cTnId.current++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${childXml}</p:childTnLst></p:cTn></p:seq>`;
}

function emitClickGroupXml(
  group: ClickGroupSpec,
  cTnId: { current: number },
  runNodeIdsByShapeId?: Map<number, number[]>,
  clickGroupIdsByShapeId?: Map<number, number>,
): string {
  const bodyXml = group.items.map((item) => {
    if (isSequenceSpec(item)) {
      return emitSequenceXml(item, cTnId, runNodeIdsByShapeId);
    }
    return emitRunXml(item, cTnId, runNodeIdsByShapeId);
  }).join("");
  const outerGroupId = cTnId.current;
  if (clickGroupIdsByShapeId) {
    const shapeIds = new Set<number>();
    for (const item of group.items) {
      if (isSequenceSpec(item)) {
        for (const run of item.runs) {
          shapeIds.add(run.entry.shapeId);
        }
      } else {
        shapeIds.add(item.entry.shapeId);
      }
    }
    for (const shapeId of shapeIds) {
      clickGroupIdsByShapeId.set(shapeId, outerGroupId);
    }
  }
  return `<p:par><p:cTn id="${cTnId.current++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${cTnId.current++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${bodyXml}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
}

function buildParagraphSteps(levels: number[], nested: boolean): ParagraphRangeTarget[] {
  if (!nested) {
    return levels.map((_, index) => ({ start: index, end: index }));
  }

  const steps: ParagraphRangeTarget[] = [];
  let currentStart = -1;
  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index] ?? 0;
    if (level === 0) {
      if (currentStart !== -1) {
        steps.push({ start: currentStart, end: index - 1 });
      }
      currentStart = index;
    } else if (currentStart === -1) {
      currentStart = index;
    }
  }

  if (currentStart !== -1) {
    steps.push({ start: currentStart, end: levels.length - 1 });
  }

  return steps.length > 0 ? steps : levels.map((_, index) => ({ start: index, end: index }));
}

function expandBuildAnimation(entry: AnimationManifestEntry, animation: NormalizedAnimationIntent): ClickGroupSpec[] {
  const grouping = animation.build?.grouping;

  if (!entry.target.textTarget || entry.target.kind !== "text") {
    throw new PaperError(
      `Animation build grouping "${grouping}" requires a text-containing shape target`,
      { code: "VALIDATION_FAILED", phase: "serialization" },
    );
  }
  const textTarget = entry.target.textTarget;

  if (!isTextBuildGrouping(grouping)) {
    return [{ items: [{ entry, animation }] }];
  }

  const levels = textTarget.paragraphLevels.length > 0
    ? textTarget.paragraphLevels
    : Array.from({ length: textTarget.paragraphCount }, () => 0);

  const steps = grouping === "byFirstLevel"
    ? buildParagraphSteps(levels, animation.build?.nested ?? true)
    : buildParagraphSteps(levels, false);

  const groups: ClickGroupSpec[] = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const firstTrigger: AnimationTrigger = index === 0 ? animation.trigger : "onClick";
    const groupItems: ClickGroupSpec["items"] = [];

    if (animation.build?.dimAfter && index > 0) {
      groupItems.push({
        entry,
        animation: normalizeAnimationIntent({
          ...animation,
          effect: "colorChange",
          type: "emphasis",
          trigger: "withPrevious",
          toColor: animation.build.dimAfter,
          build: undefined,
          buildType: undefined,
          repeat: undefined,
          repeatCount: undefined,
        }),
        paragraphRange: steps[index - 1],
        triggerOverride: "withPrevious",
      });
    }

    if (grouping === "byFirstLevel" && step.end > step.start) {
      for (let paragraphIndex = step.start; paragraphIndex <= step.end; paragraphIndex += 1) {
        groupItems.push({
          entry,
          animation,
          paragraphRange: { start: paragraphIndex, end: paragraphIndex },
          triggerOverride: paragraphIndex === step.start ? firstTrigger : "afterPrevious",
        });
      }
    } else {
      groupItems.push({
        entry,
        animation,
        paragraphRange: step,
        triggerOverride: firstTrigger,
      });
    }

    groups.push({ items: groupItems });
  }

  return groups;
}

function buildClickGroups(manifest: AnimationManifest): ClickGroupSpec[] {
  const clickGroups: ClickGroupSpec[] = [];
  let pendingGroup: AnimationRunSpec[] = [];

  const flushPendingGroup = (): void => {
    if (pendingGroup.length > 0) {
      clickGroups.push({ items: pendingGroup });
      pendingGroup = [];
    }
  };

  for (const entry of manifest) {
    const animation = normalizeAnimationIntent(entry.animation);

    if (isBuildAnimation(animation)) {
      flushPendingGroup();
      clickGroups.push(...expandBuildAnimation(entry, animation));
      continue;
    }

    const run: AnimationRunSpec = { entry, animation };
    if (pendingGroup.length === 0) {
      pendingGroup.push(run);
      continue;
    }

    if (animation.trigger === "onClick") {
      flushPendingGroup();
      pendingGroup.push(run);
    } else {
      pendingGroup.push(run);
    }
  }

  flushPendingGroup();
  return clickGroups;
}

function buildTextBuildEntries(manifest: AnimationManifest): Array<{ spid: number; grpId: number }> {
  const entries: Array<{ spid: number; grpId: number }> = [];
  const seen = new Set<number>();
  let grpIdCounter = 0;

  for (const entry of manifest) {
    const animation = normalizeAnimationIntent(entry.animation);
    if (!isBuildAnimation(animation) || seen.has(entry.shapeId)) continue;
    seen.add(entry.shapeId);
    entries.push({ spid: entry.shapeId, grpId: grpIdCounter++ });
  }

  return entries;
}

/**
 * Generates the <p:timing> XML block for a slide's animations.
 * Returns "" if no animations.
 */
export function generateTimingXml(
  manifest: AnimationManifest,
  emittedShapeIds?: Set<number>,
  chartBuildEntries?: ChartBuildEntry[],
  mediaPlaybackEntries?: MediaPlaybackEntry[],
): string {
  const hasMedia = mediaPlaybackEntries && mediaPlaybackEntries.length > 0;
  if (manifest.length === 0 && !hasMedia) return "";

  if (emittedShapeIds) {
    for (const entry of manifest) {
      if (!emittedShapeIds.has(entry.shapeId)) {
        throw new PaperError(
          `Animation references orphaned shapeId ${entry.shapeId} not found in emitted shapes`,
          { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" },
        );
      }
    }
  }

  const clickGroups = buildClickGroups(manifest);
  const cTnId = { current: 1 };
  const runNodeIdsByShapeId = new Map<number, number[]>();
  const clickGroupIdsByShapeId = new Map<number, number>();
  const groupsXml = clickGroups
    .map((group) => emitClickGroupXml(group, cTnId, runNodeIdsByShapeId, clickGroupIdsByShapeId))
    .join("");

  const bldEntries = buildTextBuildEntries(manifest);
  let grpIdCounter = bldEntries.length;

  const chartBldEntries: Array<{ spid: number; grpId: number; bld: string }> = [];
  if (chartBuildEntries) {
    const bldTypeMap: Record<string, string> = {
      bySeries: "series",
      byCategory: "category",
      byElement: "seriesEl",
      allAtOnce: "allAtOnce",
    };
    for (const entry of chartBuildEntries) {
      const bld = bldTypeMap[entry.chartAnimation.buildType] ?? "allAtOnce";
      const grpId = clickGroupIdsByShapeId.get(entry.shapeId)
        ?? runNodeIdsByShapeId.get(entry.shapeId)?.[0]
        ?? grpIdCounter++;
      chartBldEntries.push({ spid: entry.shapeId, grpId, bld });
    }
  }

  let bldLstXml = "";
  if (bldEntries.length > 0 || chartBldEntries.length > 0) {
    bldLstXml = "<p:bldLst>";
    for (const bld of bldEntries) {
      bldLstXml += `<p:bldP spid="${bld.spid}" grpId="${bld.grpId}" build="p"/>`;
    }
    for (const bld of chartBldEntries) {
      bldLstXml += `<p:bldGraphic spid="${bld.spid}" grpId="${bld.grpId}"><p:bldSub><a:bldChart xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" bld="${bld.bld}"/></p:bldSub></p:bldGraphic>`;
    }
    bldLstXml += "</p:bldLst>";
  }

  let mediaTimingXml = "";
  if (hasMedia) {
    for (const entry of mediaPlaybackEntries!) {
      const { shapeId, mediaType, playback } = entry;
      const vol = playback.volume !== undefined ? Math.round(playback.volume * 1000) : 80000;
      const showWhenStopped = playback.hideOnClick ? "0" : "1";
      const repeatAttr = playback.loop ? ' repeatCount="indefinite"' : "";
      const tagName = mediaType === "video" ? "p:video" : "p:audio";
      const fullScrnAttr = mediaType === "video" ? ' fullScrn="0"' : "";
      const narrationAttr = mediaType === "audio" && entry.playAcrossSlides ? ' isNarration="1"' : "";
      const condXml = playback.autoPlay
        ? `<p:stCondLst><p:cond delay="0"/></p:stCondLst>`
        : `<p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>`;

      mediaTimingXml += `<${tagName}${fullScrnAttr}${narrationAttr}><p:cMediaNode vol="${vol}" showWhenStopped="${showWhenStopped}"><p:cTn id="${cTnId.current++}" fill="hold"${repeatAttr}>${condXml}</p:cTn><p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl></p:cMediaNode></${tagName}>`;
    }
  }

  if (manifest.length === 0 && hasMedia) {
    return `<p:timing><p:tnLst><p:par><p:cTn id="${cTnId.current++}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${mediaTimingXml}</p:childTnLst></p:cTn></p:par></p:tnLst>${bldLstXml}</p:timing>`;
  }

  return `<p:timing><p:tnLst><p:par><p:cTn id="${cTnId.current++}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="${cTnId.current++}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${groupsXml}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>${mediaTimingXml}</p:childTnLst></p:cTn></p:par></p:tnLst>${bldLstXml}</p:timing>`;
}
