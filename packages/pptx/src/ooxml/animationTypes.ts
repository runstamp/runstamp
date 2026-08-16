// src/ooxml/animationTypes.ts — Shared animation manifest types
import type { AnimationIntent, ChartAnimation, MediaPlaybackOptions } from "../types/ast.js";

export interface AnimationTextTarget {
  paragraphCount: number;
  paragraphLevels: number[];
}

export interface AnimationTargetInfo {
  kind: "shape" | "text";
  textTarget?: AnimationTextTarget;
}

export interface AnimationManifestEntry {
  shapeId: number;
  effect: AnimationIntent["effect"];
  animation: AnimationIntent;
  target: AnimationTargetInfo;
}

export interface ChartBuildEntry {
  shapeId: number;
  chartAnimation: ChartAnimation;
}

export interface MediaPlaybackEntry {
  shapeId: number;
  mediaType: "video" | "audio";
  playback: MediaPlaybackOptions;
  playAcrossSlides?: boolean;
}

export type AnimationManifest = AnimationManifestEntry[];
