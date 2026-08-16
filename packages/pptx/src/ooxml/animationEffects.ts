import type {
  AnimationBuild,
  AnimationBuildGrouping,
  AnimationIntent,
  AnimationType,
  MotionPathType,
} from "../types/ast.js";

const FLY_SUBTYPE_MAP: Record<string, string> = {
  up: "4",
  down: "8",
  left: "2",
  right: "1",
};

const WIPE_SUBTYPE_MAP: Record<string, string> = {
  up: "4",
  down: "8",
  left: "2",
  right: "1",
};

export interface EffectInfo {
  presetID: string;
  presetClass: string;
  presetSubtype: string;
}

export interface NormalizedAnimationIntent extends AnimationIntent {
  effect: AnimationIntent["effect"];
  motionPath?: AnimationIntent["motionPath"] & { pathType?: MotionPathType };
  repeat?: number | "indefinite";
  build?: AnimationBuild;
}

function defaultBuildGrouping(anim: AnimationIntent): AnimationBuildGrouping | undefined {
  if (anim.build?.grouping) return anim.build.grouping;
  if (anim.buildType) return anim.buildType;
  return undefined;
}

function defaultBuild(anim: AnimationIntent): AnimationBuild | undefined {
  const grouping = defaultBuildGrouping(anim);
  if (!grouping && !anim.build) return undefined;
  return {
    nested: anim.build?.nested ?? (grouping === "byFirstLevel"),
    grouping,
    dimAfter: anim.build?.dimAfter,
  };
}

function inferPathType(path: string): MotionPathType {
  if (/^\s*M\s+[-+\d.]+\s+[-+\d.]+\s+L\s+[-+\d.]+\s+[-+\d.]+\s*$/i.test(path)) {
    return "line";
  }
  if (/\bC\b/i.test(path)) {
    return "arc";
  }
  return "custom";
}

export function normalizeAnimationIntent(animation: AnimationIntent): NormalizedAnimationIntent {
  const build = defaultBuild(animation);
  const repeat = animation.repeat ?? animation.repeatCount;

  switch (animation.effect) {
    case "grow":
      return {
        ...animation,
        effect: "growShrink",
        scaleFactor: animation.scaleFactor ?? 150,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build,
      };
    case "shrink":
      return {
        ...animation,
        effect: "growShrink",
        scaleFactor: animation.scaleFactor ?? 50,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build,
      };
    case "growShrink":
      return {
        ...animation,
        scaleFactor: animation.scaleFactor ?? 110,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build,
      };
    case "pulse":
      return {
        ...animation,
        scaleFactor: animation.scaleFactor ?? 110,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build,
      };
    case "spin":
      return {
        ...animation,
        rotationAngle: animation.rotationAngle ?? 360,
        autoReverse: animation.autoReverse ?? false,
        repeat,
        build,
      };
    case "colorChange":
      return {
        ...animation,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build,
      };
    case "boldFlash":
      return {
        ...animation,
        autoReverse: animation.autoReverse ?? true,
        repeat,
        build,
      };
    case "motionPath":
      return {
        ...animation,
        repeat,
        build,
        motionPath: animation.motionPath
          ? {
            ...animation.motionPath,
            pathType: animation.motionPath.pathType ?? inferPathType(animation.motionPath.path),
          }
          : animation.motionPath,
      };
    default:
      return { ...animation, repeat, build };
  }
}

export function getEffectInfo(anim: NormalizedAnimationIntent): EffectInfo {
  const dir = anim.direction ?? "up";

  switch (anim.effect) {
    case "appear":
      return { presetID: "1", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "fly":
      return { presetID: "2", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: FLY_SUBTYPE_MAP[dir] ?? "4" };
    case "spin":
      return { presetID: "8", presetClass: "emph", presetSubtype: "0" };
    case "zoom":
      return { presetID: "53", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "bounce":
      return { presetID: "26", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "float":
      return { presetID: "42", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "growShrink":
      return { presetID: "6", presetClass: "emph", presetSubtype: "0" };
    case "pulse":
      return { presetID: "7", presetClass: "emph", presetSubtype: "0" };
    case "teeter":
      return { presetID: "27", presetClass: "emph", presetSubtype: "0" };
    case "wipe":
      return { presetID: "22", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: WIPE_SUBTYPE_MAP[dir] ?? "1" };
    case "split":
      return { presetID: "16", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "dissolve":
      return { presetID: "35", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "swivel":
      return { presetID: "15", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "motionPath":
      return { presetID: "0", presetClass: "path", presetSubtype: "0" };
    case "colorReveal":
    case "colorChange":
      return { presetID: "63", presetClass: anim.type === "exit" ? "exit" : anim.type === "emphasis" ? "emph" : "entr", presetSubtype: "0" };
    case "boldFlash":
      return { presetID: "14", presetClass: "emph", presetSubtype: "0" };
    case "wave":
      return { presetID: "44", presetClass: "emph", presetSubtype: "0" };
    case "flip":
      return { presetID: "55", presetClass: anim.type === "exit" ? "exit" : "entr", presetSubtype: "0" };
    case "fade":
    default:
      return {
        presetID: "10",
        presetClass: anim.type === "exit" ? "exit" : anim.type === "emphasis" ? "emph" : "entr",
        presetSubtype: "0",
      };
  }
}

export function isBuildAnimation(anim: NormalizedAnimationIntent): boolean {
  return Boolean(anim.build?.grouping && anim.build.grouping !== "allAtOnce");
}

export function isTextBuildGrouping(grouping: AnimationBuildGrouping | undefined): boolean {
  return grouping === "byParagraph" || grouping === "byFirstLevel";
}

export function getNormalizedRepeat(anim: NormalizedAnimationIntent): number | "indefinite" | undefined {
  return anim.repeat;
}

export function isExitLike(type: AnimationType): boolean {
  return type === "exit";
}
