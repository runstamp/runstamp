import { escapeXmlAttr } from "./drawing/textUtils.js";
import { PaperError } from "../errors.js";
import type { AnimationTargetInfo } from "./animationTypes.js";
import type { NormalizedAnimationIntent } from "./animationEffects.js";

export interface ParagraphRangeTarget {
  start: number;
  end: number;
}

export interface BehaviorTarget {
  shapeId: number;
  target: AnimationTargetInfo;
  paragraphRange?: ParagraphRangeTarget;
}

interface ParsedMotionPath {
  normalizedPath: string;
  ptsTypes: string;
}

function toColorValue(color: string): string {
  return color.replace(/^#/, "").toUpperCase();
}

function emitTextRange(range: ParagraphRangeTarget | undefined): string {
  if (!range) return "";
  return `<p:txEl><p:pRg st="${range.start}" end="${range.end}"/></p:txEl>`;
}

function emitTargetElement(target: BehaviorTarget): string {
  return `<p:tgtEl><p:spTgt spid="${target.shapeId}">${emitTextRange(target.paragraphRange)}</p:spTgt></p:tgtEl>`;
}

function emitCommonBehaviorCtn(
  cTnId: { current: number },
  dur: number,
  easingAttrs: string,
  target: BehaviorTarget,
  extraAttrs: string = "",
): string {
  return `<p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${extraAttrs}${easingAttrs}/>${emitTargetElement(target)}</p:cBhvr>`;
}

function tokenizeMotionPath(path: string): string[] {
  return path.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) ?? [];
}

export function parseMotionPath(path: string): ParsedMotionPath {
  const tokens = tokenizeMotionPath(path);
  if (tokens.length === 0) {
    throw new PaperError(
      'Animation effect "motionPath" requires a motionPath object with a path string',
      { code: "VALIDATION_FAILED", phase: "serialization" },
    );
  }

  const segments: string[] = [];
  let index = 0;
  let pointCount = 0;
  let sawMove = false;

  while (index < tokens.length) {
    const command = tokens[index++];
    switch (command) {
      case "M":
      case "L": {
        const x = tokens[index++];
        const y = tokens[index++];
        if (x === undefined || y === undefined) {
          throw new PaperError(
            `Invalid motion path "${path}": ${command} requires two coordinates`,
            { code: "VALIDATION_FAILED", phase: "serialization" },
          );
        }
        segments.push(`${command} ${x} ${y}`);
        pointCount += 1;
        sawMove = sawMove || command === "M";
        break;
      }
      case "C": {
        const values = tokens.slice(index, index + 6);
        if (values.length < 6) {
          throw new PaperError(
            `Invalid motion path "${path}": C requires six coordinates`,
            { code: "VALIDATION_FAILED", phase: "serialization" },
          );
        }
        index += 6;
        segments.push(`C ${values.join(" ")}`);
        pointCount += 3;
        break;
      }
      case "Z": {
        segments.push("Z");
        break;
      }
      default:
        throw new PaperError(
          `Invalid motion path "${path}": unsupported command "${command}"`,
          { code: "VALIDATION_FAILED", phase: "serialization" },
        );
    }
  }

  if (!sawMove) {
    throw new PaperError(`Invalid motion path "${path}": path must start with M`, {
      code: "VALIDATION_FAILED",
      phase: "serialization",
    });
  }

  return {
    normalizedPath: segments.join(" "),
    ptsTypes: "A".repeat(Math.max(pointCount, 2)),
  };
}

export function emitEasingAttrs(anim: NormalizedAnimationIntent): string {
  const easing = anim.easing;
  if (!easing || easing === "linear") return "";
  switch (easing) {
    case "easeIn": return ' accel="100000"';
    case "easeOut": return ' decel="100000"';
    case "easeInOut": return ' accel="50000" decel="50000"';
    case "bounce": return ' decel="100000"';
    default: return "";
  }
}

function requireTextTarget(anim: NormalizedAnimationIntent, target: BehaviorTarget): void {
  if (target.target.kind !== "text") {
    throw new PaperError(
      `Animation effect "${anim.effect}" requires a text-containing shape target`,
      { code: "VALIDATION_FAILED", phase: "serialization" },
    );
  }
}

function emitSetBehavior(
  cTnId: { current: number },
  target: BehaviorTarget,
  attrName: string,
  value: string,
): string {
  return `<p:set><p:cBhvr><p:cTn id="${cTnId.current++}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${emitTargetElement(target)}<p:attrNameLst><p:attrName>${attrName}</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${escapeXmlAttr(value)}"/></p:to></p:set>`;
}

export function emitEffectElement(
  anim: NormalizedAnimationIntent,
  target: BehaviorTarget,
  cTnId: { current: number },
): string {
  const dur = anim.duration ?? 500;
  const easingAttrs = emitEasingAttrs(anim);
  const autoRevAttr = anim.autoReverse ? ' autoRev="1"' : "";

  switch (anim.effect) {
    case "appear": {
      const value = anim.type === "exit" ? "hidden" : "visible";
      return emitSetBehavior(cTnId, target, "style.visibility", value);
    }
    case "fade": {
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "fly": {
      const trans = anim.type === "exit" ? "out" : "in";
      const dir = anim.direction ?? "up";
      return `<p:animEffect transition="${trans}" filter="wipe(${dir})">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "zoom": {
      if (anim.type === "exit") {
        return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}<p:from x="100000" y="100000"/><p:to x="0" y="0"/></p:animScale>`;
      }
      return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}<p:from x="0" y="0"/><p:to x="100000" y="100000"/></p:animScale>`;
    }
    case "spin": {
      const by = Math.round((anim.rotationAngle ?? 360) * 60000);
      return `<p:animRot by="${by}">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, autoRevAttr)}</p:animRot>`;
    }
    case "bounce": {
      let xml = `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${easingAttrs}/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>`;
      xml += `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="1+#ppt_h/2"/></p:val></p:tav>`;
      xml += `<p:tav tm="50000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `<p:tav tm="75000"><p:val><p:strVal val="1+#ppt_h/4"/></p:val></p:tav>`;
      xml += `<p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `</p:tavLst></p:anim>`;
      xml += `<p:animEffect transition="in" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, "", target)}</p:animEffect>`;
      return xml;
    }
    case "float": {
      let xml = `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${easingAttrs}/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>`;
      xml += `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y+0.1"/></p:val></p:tav>`;
      xml += `<p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `</p:tavLst></p:anim>`;
      xml += `<p:animEffect transition="in" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, "", target)}</p:animEffect>`;
      return xml;
    }
    case "growShrink": {
      const scale = Math.round((anim.scaleFactor ?? 110) * 1000);
      return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, autoRevAttr)}<p:from x="100000" y="100000"/><p:to x="${scale}" y="${scale}"/></p:animScale>`;
    }
    case "pulse": {
      return `<p:animScale>${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, autoRevAttr)}<p:from x="100000" y="100000"/><p:to x="110000" y="110000"/></p:animScale>`;
    }
    case "teeter": {
      return `<p:animRot by="300000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, ' autoRev="1"')}</p:animRot>`;
    }
    case "wipe": {
      const dir = anim.direction ?? "right";
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="wipe(${dir})">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "split": {
      const dir = anim.direction ?? "right";
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="split(${dir})">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "dissolve": {
      const trans = anim.type === "exit" ? "out" : "in";
      return `<p:animEffect transition="${trans}" filter="dissolve">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
    }
    case "swivel": {
      let xml = `<p:animRot by="5400000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animRot>`;
      xml += `<p:animEffect transition="in" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, "", target)}</p:animEffect>`;
      return xml;
    }
    case "motionPath": {
      const motionPath = anim.motionPath;
      if (!motionPath?.path) {
        throw new PaperError(
          'Animation effect "motionPath" requires a motionPath object with a path string',
          { code: "VALIDATION_FAILED", phase: "serialization" },
        );
      }
      const parsed = parseMotionPath(motionPath.path);
      const origin = motionPath.origin ?? "layout";
      return `<p:animMotion origin="${origin}" path="${escapeXmlAttr(parsed.normalizedPath)}" pathEditMode="relative" ptsTypes="${parsed.ptsTypes}">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animMotion>`;
    }
    case "colorReveal": {
      const trans = anim.type === "exit" ? "out" : "in";
      let xml = `<p:animEffect transition="${trans}" filter="fade">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animEffect>`;
      xml += `<p:animClr clrSpc="rgb"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>fillcolor</p:attrName></p:attrNameLst></p:cBhvr><p:to><a:srgbClr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="000000"/></p:to></p:animClr>`;
      return xml;
    }
    case "colorChange": {
      if (!anim.toColor) {
        throw new PaperError('Animation effect "colorChange" requires toColor', {
          code: "VALIDATION_FAILED",
          phase: "serialization",
        });
      }
      const attrName = target.target.kind === "text" ? "style.color" : "fillcolor";
      return `<p:animClr clrSpc="rgb"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold"${autoRevAttr}${easingAttrs}/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>${attrName}</p:attrName></p:attrNameLst></p:cBhvr><p:to><a:srgbClr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="${toColorValue(anim.toColor)}"/></p:to></p:animClr>`;
    }
    case "boldFlash": {
      requireTextTarget(anim, target);
      return `${emitSetBehavior(cTnId, target, "style.fontWeight", "bold")}${emitSetBehavior(cTnId, target, "style.fontWeight", "normal")}`;
    }
    case "wave": {
      let xml = `<p:animRot by="300000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target, ' autoRev="1"')}</p:animRot>`;
      xml += `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${cTnId.current++}" dur="${dur}" fill="hold" autoRev="1"/>${emitTargetElement(target)}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>`;
      xml += `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `<p:tav tm="50000"><p:val><p:strVal val="#ppt_y-0.02"/></p:val></p:tav>`;
      xml += `<p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav>`;
      xml += `</p:tavLst></p:anim>`;
      return xml;
    }
    case "flip": {
      return `<p:animRot by="10800000">${emitCommonBehaviorCtn(cTnId, dur, easingAttrs, target)}</p:animRot>`;
    }
    default:
      return "";
  }
}
