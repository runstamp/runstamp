// src/ooxml/transition.ts — Slide transition XML emitter
import type { SlideTransition } from "../types/ast.js";

const DIR_MAP: Record<string, string> = { up: "u", down: "d", left: "l", right: "r" };
const HORZ_VERT_MAP: Record<string, string> = { up: "vert", down: "vert", left: "horz", right: "horz" };

function speedAttr(duration: number): string {
  if (duration <= 250) return `spd="fast"`;
  if (duration <= 750) return `spd="med"`;
  return `spd="slow"`;
}

export function generateTransitionXml(transition?: SlideTransition): string {
  if (!transition) return "";

  const dur = transition.duration ?? 500;
  const spd = speedAttr(dur);
  const advClick = transition.advanceOnClick === false ? `advClick="0"` : `advClick="1"`;
  const advTm = transition.advanceAfterTime != null ? ` advTm="${transition.advanceAfterTime}"` : "";

  // Morph requires Office 2019+ — wrap in mc:AlternateContent with fade fallback
  if (transition.type === "morph") {
    return [
      `<p:transition ${spd} ${advClick}${advTm}>`,
      `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">`,
      `<mc:Choice Requires="p159" xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main">`,
      `<p159:morph option="byObject"/>`,
      `</mc:Choice>`,
      `<mc:Fallback><p:fade/></mc:Fallback>`,
      `</mc:AlternateContent>`,
      `</p:transition>`,
    ].join("");
  }

  const dir = DIR_MAP[transition.direction ?? "left"] ?? "l";
  const hvDir = HORZ_VERT_MAP[transition.direction ?? "left"] ?? "horz";

  let inner: string;
  switch (transition.type) {
    case "fade":
      inner = `<p:fade/>`;
      break;
    case "push":
      inner = `<p:push dir="${dir}"/>`;
      break;
    case "wipe":
      inner = `<p:wipe dir="${dir}"/>`;
      break;
    case "cover":
      inner = `<p:cover dir="${dir}"/>`;
      break;
    case "zoom":
      inner = `<p:zoom/>`;
      break;
    case "split":
      inner = `<p:split orient="${hvDir}"/>`;
      break;
    case "blinds":
      inner = `<p:blinds dir="${hvDir}"/>`;
      break;
    case "checker":
      inner = `<p:checker dir="${hvDir}"/>`;
      break;
    case "dissolve":
      inner = `<p:dissolve/>`;
      break;
    case "comb":
      inner = `<p:comb dir="${hvDir}"/>`;
      break;
    default:
      return "";
  }

  return `<p:transition ${spd} ${advClick}${advTm}>${inner}</p:transition>`;
}
