import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  DEFAULT_SCHEME
} from "./chunk-VCCW5PWJ.js";
import {
  isDeterministicMode
} from "./chunk-RQNEGT4U.js";
import {
  fetchFollowingValidatedRedirects,
  validateFetchUrlWithDns
} from "./chunk-WVTVGR3K.js";
import {
  FETCH_TIMEOUT_MS
} from "./chunk-XU7YQ73E.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";
import {
  PaperError
} from "./chunk-SFVKAOLH.js";

// src/renderer/colorResolver.ts
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}
function hslToRgb(h, s, l) {
  h = (h % 360 + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p2, q2, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
    if (t < 1 / 2) return q2;
    if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
    return p2;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h / 360) * 255),
    Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255)
  ];
}
function applyTint(r, g, b, tint) {
  const t = tint / 100;
  return [
    Math.round(r + (255 - r) * t),
    Math.round(g + (255 - g) * t),
    Math.round(b + (255 - b) * t)
  ];
}
function applyShade(r, g, b, shade) {
  const s = shade / 100;
  return [
    Math.round(r * s),
    Math.round(g * s),
    Math.round(b * s)
  ];
}
function resolveSchemeToken(token, themeColors) {
  const custom = themeColors?.[token];
  if (custom) return custom.replace(/^#/, "");
  return DEFAULT_SCHEME[token];
}
function resolveColorValue(color, themeColors) {
  if (color === void 0 || color === null) return void 0;
  if (typeof color === "string") {
    if (color.startsWith("#")) return color;
    if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
    const resolved = resolveSchemeToken(color, themeColors);
    if (resolved) return `#${resolved}`;
    return color;
  }
  const mod = color;
  const baseHex = resolveSchemeToken(mod.scheme, themeColors);
  if (!baseHex) return "#000000";
  const safeNum = (v) => v !== void 0 && Number.isFinite(v) ? v : void 0;
  let [r, g, b] = hexToRgb(baseHex);
  const tint = safeNum(mod.tint);
  const shade = safeNum(mod.shade);
  if (tint !== void 0) {
    [r, g, b] = applyTint(r, g, b, tint);
  }
  if (shade !== void 0) {
    [r, g, b] = applyShade(r, g, b, shade);
  }
  const lumMod = safeNum(mod.lumMod);
  const lumOff = safeNum(mod.lumOff);
  const satMod = safeNum(mod.satMod);
  const satOff = safeNum(mod.satOff);
  const hueMod = safeNum(mod.hueMod);
  const hueOff = safeNum(mod.hueOff);
  if (lumMod !== void 0 || lumOff !== void 0 || satMod !== void 0 || satOff !== void 0 || hueMod !== void 0 || hueOff !== void 0) {
    let [h, s, l] = rgbToHsl(r, g, b);
    if (lumMod !== void 0) l = l * (lumMod / 100);
    if (lumOff !== void 0) l = l + lumOff / 100;
    if (satMod !== void 0) s = s * (satMod / 100);
    if (satOff !== void 0) s = s + satOff / 100;
    if (hueMod !== void 0) h = h * (hueMod / 100);
    if (hueOff !== void 0) h = h + hueOff / 6e4;
    l = clamp(l, 0, 1);
    s = clamp(s, 0, 1);
    [r, g, b] = hslToRgb(h, s, l);
  }
  if (mod.comp) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }
  if (mod.inv) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }
  if (mod.gray) {
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    r = gray;
    g = gray;
    b = gray;
  }
  const toHex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// src/viewGeometry.ts
var ROUND_RECT_ADJUSTMENT_SCALE = 1e5;
var DEFAULT_ROUND_RECT_RADIUS_RATIO = 0.05;
function hasExplicitViewGeometry(node) {
  return Boolean(
    node.customGeometry || node.shapeType || node.shapeAdjustments && node.shapeAdjustments.length > 0 || node.shapeAdjustmentMap && Object.keys(node.shapeAdjustmentMap).length > 0
  );
}
function clampCornerRadius(borderRadius, width, height) {
  if (!Number.isFinite(borderRadius) || borderRadius === void 0 || borderRadius <= 0) {
    return void 0;
  }
  const shorterSide = Math.min(width, height);
  if (!Number.isFinite(shorterSide) || shorterSide <= 0) {
    return void 0;
  }
  return Math.min(borderRadius, shorterSide / 2);
}
function roundRectAdjustmentToRadiusPx(shapeAdjustments, width, height) {
  const shorterSide = Math.min(width, height);
  if (!Number.isFinite(shorterSide) || shorterSide <= 0) {
    return 0;
  }
  const ratio = shapeAdjustments?.[0] !== void 0 ? shapeAdjustments[0] / ROUND_RECT_ADJUSTMENT_SCALE : DEFAULT_ROUND_RECT_RADIUS_RATIO;
  return Math.max(0, Math.min(shorterSide / 2, shorterSide * ratio));
}
function borderRadiusPxToAdjustment(borderRadius, width, height) {
  const clampedRadius = clampCornerRadius(borderRadius, width, height);
  if (clampedRadius === void 0) {
    return void 0;
  }
  const shorterSide = Math.min(width, height);
  if (!Number.isFinite(shorterSide) || shorterSide <= 0) {
    return void 0;
  }
  return Math.round(clampedRadius / shorterSide * ROUND_RECT_ADJUSTMENT_SCALE);
}
function resolveEffectiveViewGeometry(node, width, height) {
  if (hasExplicitViewGeometry(node)) {
    return {
      customGeometry: node.customGeometry,
      shapeAdjustmentMap: node.shapeAdjustmentMap,
      shapeAdjustments: node.shapeAdjustments,
      shapeType: node.shapeType,
      cornerRadiusPx: node.shapeType === "roundRect" ? roundRectAdjustmentToRadiusPx(node.shapeAdjustments, width, height) : void 0
    };
  }
  const adjustment = borderRadiusPxToAdjustment(node.style?.borderRadius, width, height);
  if (adjustment === void 0) {
    return {
      customGeometry: node.customGeometry,
      shapeAdjustmentMap: node.shapeAdjustmentMap,
      shapeAdjustments: node.shapeAdjustments,
      shapeType: node.shapeType
    };
  }
  return {
    shapeAdjustments: [adjustment],
    shapeType: "roundRect",
    cornerRadiusPx: roundRectAdjustmentToRadiusPx([adjustment], width, height)
  };
}

// src/fetchRetry.ts
var MAX_RETRIES = 2;
var RETRY_DELAY_MS = 500;
function isRetryable(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}
async function fetchWithRetry(url, init) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const signal = init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS);
      const response = await fetchFollowingValidatedRedirects(
        url,
        (currentUrl) => fetch(currentUrl, { ...init, signal, redirect: "manual" }),
        validateFetchUrlWithDns
      );
      if (response.ok || !isRetryable(response.status) || attempt === MAX_RETRIES) {
        return response;
      }
      getLogger().warn(
        `[fetch] Retryable HTTP ${response.status} for "${url}" (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
      );
    } catch (err) {
      lastError = err;
      if (lastError instanceof PaperError) {
        throw lastError;
      }
      if (lastError.name === "AbortError" || lastError.name === "TimeoutError") {
        throw lastError;
      }
      if (attempt === MAX_RETRIES) {
        throw lastError;
      }
      getLogger().warn(
        `[fetch] Network error for "${url}" (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`
      );
    }
    const baseDelay = RETRY_DELAY_MS * (attempt + 1);
    const jitter = isDeterministicMode() ? baseDelay : baseDelay * (0.85 + Math.random() * 0.3);
    await new Promise((resolve) => setTimeout(resolve, jitter));
  }
  const finalError = lastError ?? new Error(`[fetch] Failed after ${MAX_RETRIES + 1} attempts: ${url}`);
  getLogger().warn(`[fetch] All ${MAX_RETRIES + 1} attempts exhausted for "${url}": ${finalError.message}`);
  throw finalError;
}

export {
  resolveColorValue,
  resolveEffectiveViewGeometry,
  fetchWithRetry
};
//# sourceMappingURL=chunk-XZ4AHITT.js.map
