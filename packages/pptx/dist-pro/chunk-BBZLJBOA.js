import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  PaperEngine,
  collectAbsoluteSlideLayoutDebug,
  validateAbsoluteSlideLayout
} from "./chunk-M3B54ZA7.js";
import {
  escapeXml
} from "./chunk-M2YFSO2D.js";
import {
  Expression,
  Matcher,
  XMLValidator,
  toNumber
} from "./chunk-E7KL3QDK.js";
import {
  require_lib
} from "./chunk-5GZJ6PGT.js";
import {
  external_exports
} from "./chunk-3VBGXE67.js";
import {
  PaperError
} from "./chunk-SFVKAOLH.js";
import {
  __toESM
} from "./chunk-VIXD5LXH.js";

// src/quality/corpus.ts
import { createHash } from "node:crypto";
var CHART_EX_TYPES = /* @__PURE__ */ new Set([
  "treemap",
  "sunburst",
  "histogram",
  "boxWhisker"
]);
var TEXT_KEYS = /* @__PURE__ */ new Set([
  "content",
  "text",
  "title",
  "subject",
  "description",
  "notes",
  "altText",
  "subtitle",
  "author",
  "company",
  "comments"
]);
var URL_KEYS = /* @__PURE__ */ new Set(["src", "url", "href"]);
function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
function maskFreeformString(value) {
  return value.replace(/[A-Z]/g, "X").replace(/[a-z]/g, "x").replace(/[0-9]/g, "0");
}
function anonymizeUrl(value) {
  if (value.startsWith("data:")) {
    const mime = value.slice(5, value.indexOf(";")) || "application/octet-stream";
    return `data:${mime};base64,REDACTED`;
  }
  if (/^https?:\/\//i.test(value)) {
    return "https://redacted.invalid/asset";
  }
  return maskFreeformString(value);
}
function visitNode(value, key, binaries) {
  if (Buffer.isBuffer(value)) {
    const assetKey = key === "template" ? "template.pptx" : `binary-${binaries.length + 1}.bin`;
    binaries.push({
      key: assetKey,
      buffer: value,
      sha256: hashBuffer(value),
      byteLength: value.byteLength
    });
    return {
      $binary: assetKey,
      sha256: hashBuffer(value),
      byteLength: value.byteLength
    };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => visitNode(entry, key, binaries));
  }
  if (typeof value === "string") {
    if (key && URL_KEYS.has(key)) return anonymizeUrl(value);
    if (key && TEXT_KEYS.has(key)) return maskFreeformString(value);
    return value;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = visitNode(childValue, childKey, binaries);
  }
  return result;
}
function anonymizeCorpusValue(value) {
  const binaries = [];
  return {
    document: visitNode(value, void 0, binaries),
    binaries
  };
}
function anonymizeCorpusDocument(doc) {
  return anonymizeCorpusValue(doc);
}
function walkNodes(nodes, visit) {
  if (!nodes) return;
  for (const node of nodes) {
    visit(node);
    if ("children" in node && Array.isArray(node.children)) {
      walkNodes(node.children, visit);
    }
  }
}
function classifyFailureFamilies(doc, qualityReport, errorMessage) {
  const families = /* @__PURE__ */ new Set();
  const fontFamilies = /* @__PURE__ */ new Set();
  let longestText = 0;
  if (doc.template) families.add("template_mutation");
  if (doc.slides.some((slide) => slide.notes)) families.add("comments_notes");
  if (doc.slides.some((slide) => slide.transition)) families.add("animations");
  if (doc.slides.some((slide) => slide.comments?.length)) {
    families.add("comments_notes");
  }
  for (const slide of doc.slides) {
    walkNodes(slide.children, (node) => {
      if (node.type === "Text") {
        const text = typeof node.content === "string" ? node.content : Array.isArray(node.content) ? node.content.map((run) => run.text).join("") : "";
        longestText = Math.max(longestText, text.length);
        if (node.style?.fontFamily) fontFamilies.add(node.style.fontFamily);
      }
      if (node.type === "View") {
        if (node.textStyle?.fontFamily) fontFamilies.add(node.textStyle.fontFamily);
        if (typeof node.textContent === "string") {
          longestText = Math.max(longestText, node.textContent.length);
        }
      }
      if (node.type === "Table") families.add("tables");
      if (node.type === "Chart") {
        if (CHART_EX_TYPES.has(node.chartData.chartType)) families.add("chartex");
      }
      if (node.type === "Image" || node.type === "Video" || node.type === "Audio") {
        families.add("media");
      }
      if ("placeholder" in node && node.placeholder) {
        families.add("template_mutation");
      }
      if ("animations" in node && Array.isArray(node.animations) && node.animations.length > 0) {
        families.add("animations");
      }
    });
    if (slide.background?.type === "image") families.add("media");
  }
  if (longestText >= 300 || doc.slides.length >= 10) families.add("long_text");
  if (fontFamilies.size >= 3) families.add("mixed_fonts");
  for (const slide of qualityReport?.slideReports ?? []) {
    for (const issue of slide.issues) {
      if (issue.issueClass === "chart_layout_risk") families.add("chart_layout");
      if (issue.issueClass === "font_substitution_risk") families.add("font_substitution");
      if (issue.issueClass === "template_placeholder_risk") families.add("template_placeholder");
    }
  }
  if (qualityReport?.templateReport?.templateSupportLevel === "unsafe") {
    families.add("template_placeholder");
  }
  if (errorMessage && /validation failed|invalid paperdocument|zod|schema/i.test(errorMessage)) {
    families.add("malformed_ast");
  }
  return [...families].sort();
}

// src/license.ts
import { createPublicKey as createPublicKey2, verify as verify2 } from "node:crypto";

// src/offline-license.ts
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
var OFFLINE_LICENSE_PREFIX = "pjsx_offline_v1_";
var RUNSTAMP_OFFLINE_LICENSE_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEADISwNboLC94b2Le1I9jcqBFO3zkSP3m9uovslC66hac=\n-----END PUBLIC KEY-----\n";
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isStringList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}
function isLimit(value) {
  return value === "unlimited" || Number.isInteger(value) && Number(value) > 0;
}
var DEPLOYMENT_ENVIRONMENTS = /* @__PURE__ */ new Set([
  "development",
  "ci",
  "production",
  "air-gapped",
  "embedded"
]);
function isEntitlement(value) {
  if (!value || typeof value !== "object") return false;
  const candidate = value;
  const organization = candidate.organization;
  const scope = candidate.scope;
  const deployments = scope?.deployments;
  return candidate.version === 1 && candidate.issuer === "Runstamp" && candidate.tier === "enterprise" && isNonEmptyString(candidate.licenseId) && Boolean(
    organization && isNonEmptyString(organization.id) && isNonEmptyString(organization.name)
  ) && isStringList(candidate.formats) && isStringList(candidate.features) && Boolean(scope && isLimit(scope.seats)) && Boolean(deployments && isLimit(deployments.max)) && Boolean(
    deployments && Array.isArray(deployments.environments) && deployments.environments.length > 0 && deployments.environments.every(
      (environment) => DEPLOYMENT_ENVIRONMENTS.has(environment)
    )
  ) && Number.isInteger(candidate.issuedAt) && Number(candidate.issuedAt) > 0 && Number.isInteger(candidate.expiresAt) && Number(candidate.expiresAt) > Number(candidate.issuedAt);
}
function signingInput(payloadBase64Url) {
  return Buffer.from(`${OFFLINE_LICENSE_PREFIX}${payloadBase64Url}`, "utf8");
}
function verifyOfflineLicense(token, publicKeyPem, nowEpochSeconds = Math.floor(Date.now() / 1e3)) {
  if (token.length > 65536 || !token.startsWith(OFFLINE_LICENSE_PREFIX)) {
    return { valid: false, reason: "invalid", error: "Invalid offline license format" };
  }
  try {
    const encoded = token.slice(OFFLINE_LICENSE_PREFIX.length);
    const separatorIndex = encoded.lastIndexOf(".");
    if (separatorIndex <= 0 || separatorIndex === encoded.length - 1) {
      return { valid: false, reason: "invalid", error: "Invalid offline license structure" };
    }
    const payloadBase64Url = encoded.slice(0, separatorIndex);
    const signatureBase64Url = encoded.slice(separatorIndex + 1);
    const signatureValid = verify(
      null,
      signingInput(payloadBase64Url),
      createPublicKey(publicKeyPem),
      Buffer.from(signatureBase64Url, "base64url")
    );
    if (!signatureValid) {
      return { valid: false, reason: "invalid", error: "Invalid offline license signature" };
    }
    let entitlement;
    try {
      entitlement = JSON.parse(
        Buffer.from(payloadBase64Url, "base64url").toString("utf8")
      );
    } catch {
      return { valid: false, reason: "invalid", error: "Malformed offline license payload" };
    }
    if (!isEntitlement(entitlement)) {
      return { valid: false, reason: "invalid", error: "Invalid offline license entitlement" };
    }
    if (!Number.isFinite(nowEpochSeconds) || nowEpochSeconds >= entitlement.expiresAt) {
      return { valid: false, reason: "expired", error: "Offline license expired" };
    }
    return { valid: true, entitlement };
  } catch {
    return { valid: false, reason: "invalid", error: "Offline license verification failed" };
  }
}

// src/license.ts
var embeddedPublicKeyV2 = typeof __RUNSTAMP_PUBLIC_KEY_V2__ !== "undefined" ? __RUNSTAMP_PUBLIC_KEY_V2__ : "";
var embeddedPublicKeyV4 = typeof __RUNSTAMP_PUBLIC_KEY_V4__ !== "undefined" ? __RUNSTAMP_PUBLIC_KEY_V4__ : "";
var PUBLIC_KEY_V3 = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA/4P4nHKrym8RfJXqcmcXbpX5SdfzfNT3Go92YrRcr90=\n-----END PUBLIC KEY-----\n";
function getPublicKeys() {
  const testPublicKeyV2 = process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development" ? process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 ?? "" : "";
  return {
    2: testPublicKeyV2 || embeddedPublicKeyV2,
    3: PUBLIC_KEY_V3,
    4: embeddedPublicKeyV4
  };
}
var REVOKED_KIDS = /* @__PURE__ */ new Set([
  // "k_2026_05_03_abc123",
]);
function validateLicenseKey(key, requiredFormat) {
  if (!key) return { valid: false, error: "No license key provided" };
  if (key.startsWith(OFFLINE_LICENSE_PREFIX)) {
    const result = verifyOfflineLicense(
      key,
      RUNSTAMP_OFFLINE_LICENSE_PUBLIC_KEY
    );
    if (!result.valid) return { valid: false, error: result.error };
    if (!result.entitlement.formats.includes(requiredFormat)) {
      return {
        valid: false,
        error: `License does not include ${requiredFormat.toUpperCase()}. Licensed formats: ${result.entitlement.formats.join(", ")}`
      };
    }
    return {
      valid: true,
      payload: {
        sub: result.entitlement.organization.id,
        iat: result.entitlement.issuedAt,
        exp: result.entitlement.expiresAt,
        tier: "enterprise",
        fmt: result.entitlement.formats,
        addons: result.entitlement.features,
        v: 4,
        kid: result.entitlement.licenseId
      }
    };
  }
  const prefixMatch = key.match(/^pjsx_(live|test)_(.+)$/);
  if (!prefixMatch) return { valid: false, error: "Invalid key format" };
  const [, env, encoded] = prefixMatch;
  if (env === "test" && process.env.NODE_ENV === "production") {
    return { valid: false, error: "Test keys are not valid in production" };
  }
  try {
    const dotIndex = encoded.lastIndexOf(".");
    if (dotIndex === -1)
      return { valid: false, error: "Invalid key structure" };
    const payloadB64 = encoded.substring(0, dotIndex);
    const signatureB64 = encoded.substring(dotIndex + 1);
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8")
      );
    } catch {
      return { valid: false, error: "Malformed payload" };
    }
    const publicKeys = getPublicKeys();
    if (!Object.prototype.hasOwnProperty.call(publicKeys, payload.v)) {
      return { valid: false, error: `Unknown key version: ${payload.v}` };
    }
    const publicKeyPem = publicKeys[payload.v];
    if (!publicKeyPem) {
      return {
        valid: false,
        error: "License validation is not configured for this build (missing public key)"
      };
    }
    const publicKey = createPublicKey2(publicKeyPem);
    const isValid = verify2(
      null,
      Buffer.from(payloadB64, "utf-8"),
      publicKey,
      Buffer.from(signatureB64, "base64url")
    );
    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }
    if (payload.v >= 3) {
      if (!payload.kid) {
        return { valid: false, error: "Missing kid", payload };
      }
      if (REVOKED_KIDS.has(payload.kid)) {
        return { valid: false, error: "License revoked", payload };
      }
    }
    if (typeof payload.exp !== "number" || Date.now() / 1e3 > payload.exp) {
      return { valid: false, error: "License expired", payload };
    }
    if (!payload.fmt.includes(requiredFormat)) {
      return {
        valid: false,
        error: `License does not include ${requiredFormat.toUpperCase()}. Licensed formats: ${payload.fmt.join(", ")}`,
        payload
      };
    }
    return { valid: true, payload };
  } catch (err) {
    return {
      valid: false,
      error: "Failed to validate license key",
      code: err instanceof Error ? err.name : "UnknownError"
    };
  }
}

// src/typography/metrics.ts
function calculateTextMetrics(text, font, fontSize, maxWidth) {
  const scale = fontSize / font.unitsPerEm;
  const lineHeight = (font.ascent - font.descent + (font.lineGap ?? 0)) * scale;
  const glyphRun = font.layout(text);
  const totalAdvanceWidth = glyphRun.glyphs.reduce(
    (sum, glyph) => sum + glyph.advanceWidth,
    0
  );
  const rawPixelWidth = totalAdvanceWidth * scale;
  let finalWidth = rawPixelWidth;
  let lines = 1;
  if (maxWidth !== void 0 && rawPixelWidth > maxWidth) {
    finalWidth = maxWidth;
    lines = Math.ceil(rawPixelWidth / maxWidth);
  }
  return {
    width: finalWidth,
    height: lines * lineHeight
  };
}

// src/template/roundTrip.ts
var import_jszip2 = __toESM(require_lib(), 1);
import { createHash as createHash3 } from "node:crypto";
import { posix as posixPath } from "node:path";

// ../pptx-extractor/src/open.ts
var import_jszip = __toESM(require_lib(), 1);
var DEFAULT_MAX_ENTRIES = 1e4;
var DEFAULT_MAX_TOTAL_UNCOMPRESSED_BYTES = 1073741824;
async function openPptx(buffer, limits) {
  const maxEntries = limits?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxTotalBytes = limits?.maxTotalUncompressedBytes ?? DEFAULT_MAX_TOTAL_UNCOMPRESSED_BYTES;
  const zip = await import_jszip.default.loadAsync(buffer);
  const parts = /* @__PURE__ */ new Map();
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > maxEntries) {
    throw new Error(
      `openPptx: archive has ${entries.length} entries, exceeding the limit of ${maxEntries}`
    );
  }
  let totalBytes = 0;
  for (const entry of entries) {
    const data = await entry.async("nodebuffer");
    totalBytes += data.length;
    if (totalBytes > maxTotalBytes) {
      throw new Error(
        `openPptx: total uncompressed size exceeded the limit of ${maxTotalBytes} bytes while inflating "${entry.name}"`
      );
    }
    parts.set(entry.name, data);
  }
  return {
    parts,
    hasPart: (path) => parts.has(path),
    getPart: (path) => parts.get(path),
    getPartText: (path) => {
      const buf = parts.get(path);
      return buf ? buf.toString("utf8") : void 0;
    },
    listParts: () => Array.from(parts.keys()).sort()
  };
}

// ../pptx-extractor/src/normalize.ts
import { createHash as createHash2 } from "node:crypto";
var VOLATILE_CORE_FIELDS = [
  "dcterms:created",
  "dcterms:modified",
  "cp:revision",
  "cp:lastModifiedBy",
  "dc:creator",
  "cp:lastPrinted"
];
var VOLATILE_APP_FIELDS = [
  "AppVersion",
  "Application",
  "TotalTime",
  "PresentationFormat"
];
var isXmlPath = (path) => path.endsWith(".xml") || path.endsWith(".rels");
function stripTags(xml, tags) {
  let out = xml;
  for (const tag of tags) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*?<\\/${escaped}>`, "g");
    out = out.replace(re, "");
    const selfClose = new RegExp(`<${escaped}\\b[^/]*\\/>`, "g");
    out = out.replace(selfClose, "");
  }
  return out;
}
function normalizeXml(path, raw) {
  let text = raw.toString("utf8");
  if (path === "docProps/core.xml") {
    text = stripTags(text, VOLATILE_CORE_FIELDS);
  } else if (path === "docProps/app.xml") {
    text = stripTags(text, VOLATILE_APP_FIELDS);
  }
  return text;
}
function sha256Hex(input) {
  const h = createHash2("sha256");
  h.update(input);
  return h.digest("hex");
}
function normalizeForHash(opened) {
  const sortedPaths = opened.listParts();
  const parts = [];
  for (const path of sortedPaths) {
    const buf = opened.getPart(path);
    if (isXmlPath(path)) {
      const normalized = normalizeXml(path, buf);
      parts.push({
        path,
        kind: "xml",
        hash: sha256Hex(normalized),
        size: Buffer.byteLength(normalized, "utf8")
      });
    } else {
      parts.push({
        path,
        kind: "binary",
        hash: sha256Hex(buf),
        size: buf.length
      });
    }
  }
  const manifest = parts.map((p) => `${p.path}	${p.kind}	${p.hash}
`).join("");
  return { digest: sha256Hex(manifest), parts };
}

// ../pptx-extractor/src/parts.ts
var PRESENTATION_XML = "ppt/presentation.xml";
var CONTENT_TYPES_XML = "[Content_Types].xml";
function listSlideParts(opened) {
  return opened.listParts().filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => slideNumber(a) - slideNumber(b));
}
function slideNumber(path) {
  const m = /slide(\d+)\.xml$/.exec(path);
  return m ? Number(m[1]) : 0;
}
function assertValidPptx(opened) {
  if (!opened.hasPart(CONTENT_TYPES_XML)) {
    throw new Error(`PPTX missing required part: ${CONTENT_TYPES_XML}`);
  }
  if (!opened.hasPart(PRESENTATION_XML)) {
    throw new Error(`PPTX missing required part: ${PRESENTATION_XML}`);
  }
}

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/util.js
var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
var regexName = new RegExp("^" + nameRegexp + "$");
function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}
var isName = function(string) {
  const match = regexName.exec(string);
  return !(match === null || typeof match === "undefined");
};
function isExist(v) {
  return typeof v !== "undefined";
}
var DANGEROUS_PROPERTY_NAMES = [
  // '__proto__',
  // 'constructor',
  // 'prototype',
  "hasOwnProperty",
  "toString",
  "valueOf",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__"
];
var criticalProperties = ["__proto__", "constructor", "prototype"];

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/validator.js
var defaultOptions = {
  allowBooleanAttributes: false,
  //A tag can have attributes without any value
  unpairedTags: []
};
function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions, options);
  const tags = [];
  let tagFound = false;
  let reachedRoot = false;
  if (xmlData[0] === "\uFEFF") {
    xmlData = xmlData.substr(1);
  }
  for (let i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === "<") {
      let tagStartPos = i;
      i++;
      if (xmlData[i] === "!") {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === "/") {
          closingTag = true;
          i++;
        }
        let tagName = "";
        for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        if (tagName[tagName.length - 1] === "/") {
          tagName = tagName.substring(0, tagName.length - 1);
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
        }
        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;
        if (attrStr[attrStr.length - 1] === "/") {
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
          } else {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject(
                "InvalidTag",
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos)
              );
            }
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }
          if (reachedRoot === true) {
            return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            if (xmlData[i + 1] === "!") {
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i + 1] === "?") {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === "&") {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        }
        if (xmlData[i] === "<") {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }
  if (!tagFound) {
    return getErrorObject("InvalidXml", "Start tag expected.", 1);
  } else if (tags.length == 1) {
    return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
  }
  return true;
}
function isWhiteSpace(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == "?" || xmlData[i] == " ") {
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === "xml") {
        return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}
function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "<") {
        angleBracketsCount++;
      } else if (xmlData[i] === ">") {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  }
  return i;
}
var doubleQuote = '"';
var singleQuote = "'";
function readAttributeStr(xmlData, i) {
  let attrStr = "";
  let startChar = "";
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === "") {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
      } else {
        startChar = "";
      }
    } else if (xmlData[i] === ">") {
      if (startChar === "") {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== "") {
    return false;
  }
  return {
    value: attrStr,
    index: i,
    tagClosed
  };
}
var validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
function validateAttributeString(attrStr, options) {
  const matches = getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
      return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      attrNames[attrName] = 1;
    } else {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }
  return true;
}
function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === "x") {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ";")
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}
function validateAmpersand(xmlData, i) {
  i++;
  if (xmlData[i] === ";")
    return -1;
  if (xmlData[i] === "#") {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ";")
      break;
    return -1;
  }
  return i;
}
function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col
    }
  };
}
function validateAttrName(attrName) {
  return isName(attrName);
}
function validateTagName(tagname) {
  return isName(tagname);
}
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var defaultOnDangerousProperty = (name) => {
  if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return "__" + name;
  }
  return name;
};
var defaultOptions2 = {
  preserveOrder: false,
  attributeNamePrefix: "@_",
  attributesGroupName: false,
  textNodeName: "#text",
  ignoreAttributes: true,
  removeNSPrefix: false,
  // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false,
  //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true
  },
  tagValueProcessor: function(tagName, val) {
    return val;
  },
  attributeValueProcessor: function(attrName, val) {
    return val;
  },
  stopNodes: [],
  //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function(tagName, jPath, attrs) {
    return tagName;
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
  strictReservedNames: true,
  jPath: true,
  // if true, pass jPath string to callbacks; if false, pass matcher instance
  onDangerousProperty: defaultOnDangerousProperty
};
function validatePropertyName(propertyName, optionName) {
  if (typeof propertyName !== "string") {
    return;
  }
  const normalized = propertyName.toLowerCase();
  if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
  if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
}
function normalizeProcessEntities(value) {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      // true or false
      maxEntitySize: 1e4,
      maxExpansionDepth: 10,
      maxTotalExpansions: 1e3,
      maxExpandedLength: 1e5,
      maxEntityCount: 100,
      allowedTags: null,
      tagFilter: null
    };
  }
  if (typeof value === "object" && value !== null) {
    return {
      enabled: value.enabled !== false,
      maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
      maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 10),
      maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? 1e3),
      maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
      maxEntityCount: Math.max(1, value.maxEntityCount ?? 100),
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null
    };
  }
  return normalizeProcessEntities(true);
}
var buildOptions = function(options) {
  const built = Object.assign({}, defaultOptions2, options);
  const propertyNameOptions = [
    { value: built.attributeNamePrefix, name: "attributeNamePrefix" },
    { value: built.attributesGroupName, name: "attributesGroupName" },
    { value: built.textNodeName, name: "textNodeName" },
    { value: built.cdataPropName, name: "cdataPropName" },
    { value: built.commentPropName, name: "commentPropName" }
  ];
  for (const { value, name } of propertyNameOptions) {
    if (value) {
      validatePropertyName(value, name);
    }
  }
  if (built.onDangerousProperty === null) {
    built.onDangerousProperty = defaultOnDangerousProperty;
  }
  built.processEntities = normalizeProcessEntities(built.processEntities);
  if (built.stopNodes && Array.isArray(built.stopNodes)) {
    built.stopNodes = built.stopNodes.map((node) => {
      if (typeof node === "string" && node.startsWith("*.")) {
        return ".." + node.substring(2);
      }
      return node;
    });
  }
  return built;
};

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var METADATA_SYMBOL;
if (typeof Symbol !== "function") {
  METADATA_SYMBOL = "@@xmlMetadata";
} else {
  METADATA_SYMBOL = Symbol("XML Node Metadata");
}
var XmlNode = class {
  constructor(tagname) {
    this.tagname = tagname;
    this.child = [];
    this[":@"] = /* @__PURE__ */ Object.create(null);
  }
  add(key, val) {
    if (key === "__proto__") key = "#__proto__";
    this.child.push({ [key]: val });
  }
  addChild(node, startIndex) {
    if (node.tagname === "__proto__") node.tagname = "#__proto__";
    if (node[":@"] && Object.keys(node[":@"]).length > 0) {
      this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
    } else {
      this.child.push({ [node.tagname]: node.child });
    }
    if (startIndex !== void 0) {
      this.child[this.child.length - 1][METADATA_SYMBOL] = { startIndex };
    }
  }
  /** symbol used for metadata */
  static getMetaDataSymbol() {
    return METADATA_SYMBOL;
  }
};

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var DocTypeReader = class {
  constructor(options) {
    this.suppressValidationErr = !options;
    this.options = options;
  }
  readDocType(xmlData, i) {
    const entities = /* @__PURE__ */ Object.create(null);
    let entityCount = 0;
    if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
      i = i + 9;
      let angleBracketsCount = 1;
      let hasBody = false, comment = false;
      let exp = "";
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === "<" && !comment) {
          if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
            i += 7;
            let entityName, val;
            [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
            if (val.indexOf("&") === -1) {
              if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) {
                throw new Error(
                  `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`
                );
              }
              const escaped = entityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              entities[entityName] = {
                regx: RegExp(`&${escaped};`, "g"),
                val
              };
              entityCount++;
            }
          } else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
            i += 8;
            const { index } = this.readElementExp(xmlData, i + 1);
            i = index;
          } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
            i += 8;
          } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
            i += 9;
            const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
            i = index;
          } else if (hasSeq(xmlData, "!--", i)) comment = true;
          else throw new Error(`Invalid DOCTYPE`);
          angleBracketsCount++;
          exp = "";
        } else if (xmlData[i] === ">") {
          if (comment) {
            if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
              comment = false;
              angleBracketsCount--;
            }
          } else {
            angleBracketsCount--;
          }
          if (angleBracketsCount === 0) {
            break;
          }
        } else if (xmlData[i] === "[") {
          hasBody = true;
        } else {
          exp += xmlData[i];
        }
      }
      if (angleBracketsCount !== 0) {
        throw new Error(`Unclosed DOCTYPE`);
      }
    } else {
      throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return { entities, i };
  }
  readEntityExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
      i++;
    }
    let entityName = xmlData.substring(startIndex, i);
    validateEntityName(entityName);
    i = skipWhitespace(xmlData, i);
    if (!this.suppressValidationErr) {
      if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
        throw new Error("External entities are not supported");
      } else if (xmlData[i] === "%") {
        throw new Error("Parameter entities are not supported");
      }
    }
    let entityValue = "";
    [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
    if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) {
      throw new Error(
        `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
      );
    }
    i--;
    return [entityName, entityValue, i];
  }
  readNotationExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let notationName = xmlData.substring(startIndex, i);
    !this.suppressValidationErr && validateEntityName(notationName);
    i = skipWhitespace(xmlData, i);
    const identifierType = xmlData.substring(i, i + 6).toUpperCase();
    if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
      throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
    }
    i += identifierType.length;
    i = skipWhitespace(xmlData, i);
    let publicIdentifier = null;
    let systemIdentifier = null;
    if (identifierType === "PUBLIC") {
      [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] === '"' || xmlData[i] === "'") {
        [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      }
    } else if (identifierType === "SYSTEM") {
      [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      if (!this.suppressValidationErr && !systemIdentifier) {
        throw new Error("Missing mandatory system identifier for SYSTEM notation");
      }
    }
    return { notationName, publicIdentifier, systemIdentifier, index: --i };
  }
  readIdentifierVal(xmlData, i, type) {
    let identifierVal = "";
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
      throw new Error(`Expected quoted string, found "${startChar}"`);
    }
    i++;
    const startIndex = i;
    while (i < xmlData.length && xmlData[i] !== startChar) {
      i++;
    }
    identifierVal = xmlData.substring(startIndex, i);
    if (xmlData[i] !== startChar) {
      throw new Error(`Unterminated ${type} value`);
    }
    i++;
    return [i, identifierVal];
  }
  readElementExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    if (!this.suppressValidationErr && !isName(elementName)) {
      throw new Error(`Invalid element name: "${elementName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let contentModel = "";
    if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
    else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
    else if (xmlData[i] === "(") {
      i++;
      const startIndex2 = i;
      while (i < xmlData.length && xmlData[i] !== ")") {
        i++;
      }
      contentModel = xmlData.substring(startIndex2, i);
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated content model");
      }
    } else if (!this.suppressValidationErr) {
      throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
    }
    return {
      elementName,
      contentModel: contentModel.trim(),
      index: i
    };
  }
  readAttlistExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    let startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    validateEntityName(elementName);
    i = skipWhitespace(xmlData, i);
    startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let attributeName = xmlData.substring(startIndex, i);
    if (!validateEntityName(attributeName)) {
      throw new Error(`Invalid attribute name: "${attributeName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let attributeType = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
      attributeType = "NOTATION";
      i += 8;
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] !== "(") {
        throw new Error(`Expected '(', found "${xmlData[i]}"`);
      }
      i++;
      let allowedNotations = [];
      while (i < xmlData.length && xmlData[i] !== ")") {
        const startIndex2 = i;
        while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
          i++;
        }
        let notation = xmlData.substring(startIndex2, i);
        notation = notation.trim();
        if (!validateEntityName(notation)) {
          throw new Error(`Invalid notation name: "${notation}"`);
        }
        allowedNotations.push(notation);
        if (xmlData[i] === "|") {
          i++;
          i = skipWhitespace(xmlData, i);
        }
      }
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated list of notations");
      }
      i++;
      attributeType += " (" + allowedNotations.join("|") + ")";
    } else {
      const startIndex2 = i;
      while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        i++;
      }
      attributeType += xmlData.substring(startIndex2, i);
      const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
      if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
        throw new Error(`Invalid attribute type: "${attributeType}"`);
      }
    }
    i = skipWhitespace(xmlData, i);
    let defaultValue = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
      defaultValue = "#REQUIRED";
      i += 8;
    } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
      defaultValue = "#IMPLIED";
      i += 7;
    } else {
      [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
    }
    return {
      elementName,
      attributeName,
      attributeType,
      defaultValue,
      index: i
    };
  }
};
var skipWhitespace = (data, index) => {
  while (index < data.length && /\s/.test(data[index])) {
    index++;
  }
  return index;
};
function hasSeq(data, seq, i) {
  for (let j = 0; j < seq.length; j++) {
    if (seq[j] !== data[i + j + 1]) return false;
  }
  return true;
}
function validateEntityName(name) {
  if (isName(name))
    return name;
  else
    throw new Error(`Invalid entity name ${name}`);
}

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/ignoreAttributes.js
function getIgnoreAttributesFn(ignoreAttributes) {
  if (typeof ignoreAttributes === "function") {
    return ignoreAttributes;
  }
  if (Array.isArray(ignoreAttributes)) {
    return (attrName) => {
      for (const pattern of ignoreAttributes) {
        if (typeof pattern === "string" && attrName === pattern) {
          return true;
        }
        if (pattern instanceof RegExp && pattern.test(attrName)) {
          return true;
        }
      }
    };
  }
  return () => false;
}

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
function extractRawAttributes(prefixedAttrs, options) {
  if (!prefixedAttrs) return {};
  const attrs = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
  if (!attrs) return {};
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(options.attributeNamePrefix)) {
      const rawName = key.substring(options.attributeNamePrefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function extractNamespace(rawTagName) {
  if (!rawTagName || typeof rawTagName !== "string") return void 0;
  const colonIndex = rawTagName.indexOf(":");
  if (colonIndex !== -1 && colonIndex > 0) {
    const ns = rawTagName.substring(0, colonIndex);
    if (ns !== "xmlns") {
      return ns;
    }
  }
  return void 0;
}
var OrderedObjParser = class {
  constructor(options) {
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.docTypeEntities = {};
    this.lastEntities = {
      "apos": { regex: /&(apos|#39|#x27);/g, val: "'" },
      "gt": { regex: /&(gt|#62|#x3E);/g, val: ">" },
      "lt": { regex: /&(lt|#60|#x3C);/g, val: "<" },
      "quot": { regex: /&(quot|#34|#x22);/g, val: '"' }
    };
    this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" };
    this.htmlEntities = {
      "space": { regex: /&(nbsp|#160);/g, val: " " },
      // "lt" : { regex: /&(lt|#60);/g, val: "<" },
      // "gt" : { regex: /&(gt|#62);/g, val: ">" },
      // "amp" : { regex: /&(amp|#38);/g, val: "&" },
      // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
      // "apos" : { regex: /&(apos|#39);/g, val: "'" },
      "cent": { regex: /&(cent|#162);/g, val: "\xA2" },
      "pound": { regex: /&(pound|#163);/g, val: "\xA3" },
      "yen": { regex: /&(yen|#165);/g, val: "\xA5" },
      "euro": { regex: /&(euro|#8364);/g, val: "\u20AC" },
      "copyright": { regex: /&(copy|#169);/g, val: "\xA9" },
      "reg": { regex: /&(reg|#174);/g, val: "\xAE" },
      "inr": { regex: /&(inr|#8377);/g, val: "\u20B9" },
      "num_dec": { regex: /&#([0-9]{1,7});/g, val: (_, str) => fromCodePoint(str, 10, "&#") },
      "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val: (_, str) => fromCodePoint(str, 16, "&#x") }
    };
    this.addExternalEntities = addExternalEntities;
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    this.entityExpansionCount = 0;
    this.currentExpandedLength = 0;
    this.matcher = new Matcher();
    this.readonlyMatcher = this.matcher.readOnly();
    this.isCurrentNodeStopNode = false;
    if (this.options.stopNodes && this.options.stopNodes.length > 0) {
      this.stopNodeExpressions = [];
      for (let i = 0; i < this.options.stopNodes.length; i++) {
        const stopNodeExp = this.options.stopNodes[i];
        if (typeof stopNodeExp === "string") {
          this.stopNodeExpressions.push(new Expression(stopNodeExp));
        } else if (stopNodeExp instanceof Expression) {
          this.stopNodeExpressions.push(stopNodeExp);
        }
      }
    }
  }
};
function addExternalEntities(externalEntities) {
  const entKeys = Object.keys(externalEntities);
  for (let i = 0; i < entKeys.length; i++) {
    const ent = entKeys[i];
    const escaped = ent.replace(/[.\-+*:]/g, "\\.");
    this.lastEntities[ent] = {
      regex: new RegExp("&" + escaped + ";", "g"),
      val: externalEntities[ent]
    };
  }
}
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  if (val !== void 0) {
    if (this.options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if (val.length > 0) {
      if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
      const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
      const newval = this.options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
      if (newval === null || newval === void 0) {
        return val;
      } else if (typeof newval !== typeof val || newval !== val) {
        return newval;
      } else if (this.options.trimValues) {
        return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal === val) {
          return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
        } else {
          return val;
        }
      }
    }
  }
}
function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(":");
    const prefix = tagname.charAt(0) === "/" ? "/" : "";
    if (tags[0] === "xmlns") {
      return "";
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}
var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
function buildAttributesMap(attrStr, jPath, tagName) {
  if (this.options.ignoreAttributes !== true && typeof attrStr === "string") {
    const matches = getAllMatches(attrStr, attrsRegx);
    const len = matches.length;
    const attrs = {};
    const rawAttrsForMatcher = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      const oldVal = matches[i][4];
      if (attrName.length && oldVal !== void 0) {
        let parsedVal = oldVal;
        if (this.options.trimValues) {
          parsedVal = parsedVal.trim();
        }
        parsedVal = this.replaceEntitiesValue(parsedVal, tagName, this.readonlyMatcher);
        rawAttrsForMatcher[attrName] = parsedVal;
      }
    }
    if (Object.keys(rawAttrsForMatcher).length > 0 && typeof jPath === "object" && jPath.updateCurrent) {
      jPath.updateCurrent(rawAttrsForMatcher);
    }
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      const jPathStr = this.options.jPath ? jPath.toString() : this.readonlyMatcher;
      if (this.ignoreAttributesFn(attrName, jPathStr)) {
        continue;
      }
      let oldVal = matches[i][4];
      let aName = this.options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (this.options.transformAttributeName) {
          aName = this.options.transformAttributeName(aName);
        }
        aName = sanitizeName(aName, this.options);
        if (oldVal !== void 0) {
          if (this.options.trimValues) {
            oldVal = oldVal.trim();
          }
          oldVal = this.replaceEntitiesValue(oldVal, tagName, this.readonlyMatcher);
          const jPathOrMatcher = this.options.jPath ? jPath.toString() : this.readonlyMatcher;
          const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPathOrMatcher);
          if (newVal === null || newVal === void 0) {
            attrs[aName] = oldVal;
          } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
            attrs[aName] = newVal;
          } else {
            attrs[aName] = parseValue(
              oldVal,
              this.options.parseAttributeValue,
              this.options.numberParseOptions
            );
          }
        } else if (this.options.allowBooleanAttributes) {
          attrs[aName] = true;
        }
      }
    }
    if (!Object.keys(attrs).length) {
      return;
    }
    if (this.options.attributesGroupName) {
      const attrCollection = {};
      attrCollection[this.options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs;
  }
}
var parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n");
  const xmlObj = new XmlNode("!xml");
  let currentNode = xmlObj;
  let textData = "";
  this.matcher.reset();
  this.entityExpansionCount = 0;
  this.currentExpandedLength = 0;
  const docTypeReader = new DocTypeReader(this.options.processEntities);
  for (let i = 0; i < xmlData.length; i++) {
    const ch = xmlData[i];
    if (ch === "<") {
      if (xmlData[i + 1] === "/") {
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i + 2, closeIndex).trim();
        if (this.options.removeNSPrefix) {
          const colonIndex = tagName.indexOf(":");
          if (colonIndex !== -1) {
            tagName = tagName.substr(colonIndex + 1);
          }
        }
        tagName = transformTagName(this.options.transformTagName, tagName, "", this.options).tagName;
        if (currentNode) {
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        }
        const lastTagName = this.matcher.getCurrentTag();
        if (tagName && this.options.unpairedTags.indexOf(tagName) !== -1) {
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        if (lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1) {
          this.matcher.pop();
          this.tagsNodeStack.pop();
        }
        this.matcher.pop();
        this.isCurrentNodeStopNode = false;
        currentNode = this.tagsNodeStack.pop();
        textData = "";
        i = closeIndex;
      } else if (xmlData[i + 1] === "?") {
        let tagData = readTagExp(xmlData, i, false, "?>");
        if (!tagData) throw new Error("Pi Tag is not closed.");
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        if (this.options.ignoreDeclaration && tagData.tagName === "?xml" || this.options.ignorePiTags) {
        } else {
          const childNode = new XmlNode(tagData.tagName);
          childNode.add(this.options.textNodeName, "");
          if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent) {
            childNode[":@"] = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName);
          }
          this.addChild(currentNode, childNode, this.readonlyMatcher, i);
        }
        i = tagData.closeIndex + 1;
      } else if (xmlData.substr(i + 1, 3) === "!--") {
        const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
        if (this.options.commentPropName) {
          const comment = xmlData.substring(i + 4, endIndex - 2);
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
          currentNode.add(this.options.commentPropName, [{ [this.options.textNodeName]: comment }]);
        }
        i = endIndex;
      } else if (xmlData.substr(i + 1, 2) === "!D") {
        const result = docTypeReader.readDocType(xmlData, i);
        this.docTypeEntities = result.entities;
        i = result.i;
      } else if (xmlData.substr(i + 1, 2) === "![") {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9, closeIndex);
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        let val = this.parseTextData(tagExp, currentNode.tagname, this.readonlyMatcher, true, false, true, true);
        if (val == void 0) val = "";
        if (this.options.cdataPropName) {
          currentNode.add(this.options.cdataPropName, [{ [this.options.textNodeName]: tagExp }]);
        } else {
          currentNode.add(this.options.textNodeName, val);
        }
        i = closeIndex + 2;
      } else {
        let result = readTagExp(xmlData, i, this.options.removeNSPrefix);
        if (!result) {
          const context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlData.length, i + 50));
          throw new Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
        }
        let tagName = result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;
        ({ tagName, tagExp } = transformTagName(this.options.transformTagName, tagName, tagExp, this.options));
        if (this.options.strictReservedNames && (tagName === this.options.commentPropName || tagName === this.options.cdataPropName || tagName === this.options.textNodeName || tagName === this.options.attributesGroupName)) {
          throw new Error(`Invalid tag name: ${tagName}`);
        }
        if (currentNode && textData) {
          if (currentNode.tagname !== "!xml") {
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
          }
        }
        const lastTag = currentNode;
        if (lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1) {
          currentNode = this.tagsNodeStack.pop();
          this.matcher.pop();
        }
        let isSelfClosing = false;
        if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
          isSelfClosing = true;
          if (tagName[tagName.length - 1] === "/") {
            tagName = tagName.substr(0, tagName.length - 1);
            tagExp = tagName;
          } else {
            tagExp = tagExp.substr(0, tagExp.length - 1);
          }
          attrExpPresent = tagName !== tagExp;
        }
        let prefixedAttrs = null;
        let rawAttrs = {};
        let namespace = void 0;
        namespace = extractNamespace(rawTagName);
        if (tagName !== xmlObj.tagname) {
          this.matcher.push(tagName, {}, namespace);
        }
        if (tagName !== tagExp && attrExpPresent) {
          prefixedAttrs = this.buildAttributesMap(tagExp, this.matcher, tagName);
          if (prefixedAttrs) {
            rawAttrs = extractRawAttributes(prefixedAttrs, this.options);
          }
        }
        if (tagName !== xmlObj.tagname) {
          this.isCurrentNodeStopNode = this.isItStopNode(this.stopNodeExpressions, this.matcher);
        }
        const startIndex = i;
        if (this.isCurrentNodeStopNode) {
          let tagContent = "";
          if (isSelfClosing) {
            i = result.closeIndex;
          } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
            i = result.closeIndex;
          } else {
            const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result2.i;
            tagContent = result2.tagContent;
          }
          const childNode = new XmlNode(tagName);
          if (prefixedAttrs) {
            childNode[":@"] = prefixedAttrs;
          }
          childNode.add(this.options.textNodeName, tagContent);
          this.matcher.pop();
          this.isCurrentNodeStopNode = false;
          this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
        } else {
          if (isSelfClosing) {
            ({ tagName, tagExp } = transformTagName(this.options.transformTagName, tagName, tagExp, this.options));
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
          } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
            i = result.closeIndex;
            continue;
          } else {
            const childNode = new XmlNode(tagName);
            if (this.tagsNodeStack.length > this.options.maxNestedTags) {
              throw new Error("Maximum nested tags exceeded");
            }
            this.tagsNodeStack.push(currentNode);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    } else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};
function addChild(currentNode, childNode, matcher, startIndex) {
  if (!this.options.captureMetaData) startIndex = void 0;
  const jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
  const result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
  if (result === false) {
  } else if (typeof result === "string") {
    childNode.tagname = result;
    currentNode.addChild(childNode, startIndex);
  } else {
    currentNode.addChild(childNode, startIndex);
  }
}
function replaceEntitiesValue(val, tagName, jPath) {
  const entityConfig = this.options.processEntities;
  if (!entityConfig || !entityConfig.enabled) {
    return val;
  }
  if (entityConfig.allowedTags) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    const allowed = Array.isArray(entityConfig.allowedTags) ? entityConfig.allowedTags.includes(tagName) : entityConfig.allowedTags(tagName, jPathOrMatcher);
    if (!allowed) {
      return val;
    }
  }
  if (entityConfig.tagFilter) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) {
      return val;
    }
  }
  for (const entityName of Object.keys(this.docTypeEntities)) {
    const entity = this.docTypeEntities[entityName];
    const matches = val.match(entity.regx);
    if (matches) {
      this.entityExpansionCount += matches.length;
      if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions) {
        throw new Error(
          `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`
        );
      }
      const lengthBefore = val.length;
      val = val.replace(entity.regx, entity.val);
      if (entityConfig.maxExpandedLength) {
        this.currentExpandedLength += val.length - lengthBefore;
        if (this.currentExpandedLength > entityConfig.maxExpandedLength) {
          throw new Error(
            `Total expanded content size exceeded: ${this.currentExpandedLength} > ${entityConfig.maxExpandedLength}`
          );
        }
      }
    }
  }
  for (const entityName of Object.keys(this.lastEntities)) {
    const entity = this.lastEntities[entityName];
    const matches = val.match(entity.regex);
    if (matches) {
      this.entityExpansionCount += matches.length;
      if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions) {
        throw new Error(
          `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`
        );
      }
    }
    val = val.replace(entity.regex, entity.val);
  }
  if (val.indexOf("&") === -1) return val;
  if (this.options.htmlEntities) {
    for (const entityName of Object.keys(this.htmlEntities)) {
      const entity = this.htmlEntities[entityName];
      const matches = val.match(entity.regex);
      if (matches) {
        this.entityExpansionCount += matches.length;
        if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions) {
          throw new Error(
            `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`
          );
        }
      }
      val = val.replace(entity.regex, entity.val);
    }
  }
  val = val.replace(this.ampEntity.regex, this.ampEntity.val);
  return val;
}
function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
  if (textData) {
    if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
    textData = this.parseTextData(
      textData,
      parentNode.tagname,
      matcher,
      false,
      parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false,
      isLeafNode
    );
    if (textData !== void 0 && textData !== "")
      parentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}
function isItStopNode(stopNodeExpressions, matcher) {
  if (!stopNodeExpressions || stopNodeExpressions.length === 0) return false;
  for (let i = 0; i < stopNodeExpressions.length; i++) {
    if (matcher.matches(stopNodeExpressions[i])) {
      return true;
    }
  }
  return false;
}
function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
  let attrBoundary;
  let tagExp = "";
  for (let index = i; index < xmlData.length; index++) {
    let ch = xmlData[index];
    if (attrBoundary) {
      if (ch === attrBoundary) attrBoundary = "";
    } else if (ch === '"' || ch === "'") {
      attrBoundary = ch;
    } else if (ch === closingChar[0]) {
      if (closingChar[1]) {
        if (xmlData[index + 1] === closingChar[1]) {
          return {
            data: tagExp,
            index
          };
        }
      } else {
        return {
          data: tagExp,
          index
        };
      }
    } else if (ch === "	") {
      ch = " ";
    }
    tagExp += ch;
  }
}
function findClosingIndex(xmlData, str, i, errMsg) {
  const closingIndex = xmlData.indexOf(str, i);
  if (closingIndex === -1) {
    throw new Error(errMsg);
  } else {
    return closingIndex + str.length - 1;
  }
}
function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
  const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
  if (!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if (separatorIndex !== -1) {
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }
  const rawTagName = tagName;
  if (removeNSPrefix) {
    const colonIndex = tagName.indexOf(":");
    if (colonIndex !== -1) {
      tagName = tagName.substr(colonIndex + 1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }
  return {
    tagName,
    tagExp,
    closeIndex,
    attrExpPresent,
    rawTagName
  };
}
function readStopNodeData(xmlData, tagName, i) {
  const startIndex = i;
  let openTagCount = 1;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === "<") {
      if (xmlData[i + 1] === "/") {
        const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
        let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
        if (closeTagName === tagName) {
          openTagCount--;
          if (openTagCount === 0) {
            return {
              tagContent: xmlData.substring(startIndex, i),
              i: closeIndex
            };
          }
        }
        i = closeIndex;
      } else if (xmlData[i + 1] === "?") {
        const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
        i = closeIndex;
      } else if (xmlData.substr(i + 1, 3) === "!--") {
        const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
        i = closeIndex;
      } else if (xmlData.substr(i + 1, 2) === "![") {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
        i = closeIndex;
      } else {
        const tagData = readTagExp(xmlData, i, ">");
        if (tagData) {
          const openTagName = tagData && tagData.tagName;
          if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
            openTagCount++;
          }
          i = tagData.closeIndex;
        }
      }
    }
  }
}
function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === "string") {
    const newval = val.trim();
    if (newval === "true") return true;
    else if (newval === "false") return false;
    else return toNumber(val, options);
  } else {
    if (isExist(val)) {
      return val;
    } else {
      return "";
    }
  }
}
function fromCodePoint(str, base, prefix) {
  const codePoint = Number.parseInt(str, base);
  if (codePoint >= 0 && codePoint <= 1114111) {
    return String.fromCodePoint(codePoint);
  } else {
    return prefix + str + ";";
  }
}
function transformTagName(fn, tagName, tagExp, options) {
  if (fn) {
    const newTagName = fn(tagName);
    if (tagExp === tagName) {
      tagExp = newTagName;
    }
    tagName = newTagName;
  }
  tagName = sanitizeName(tagName, options);
  return { tagName, tagExp };
}
function sanitizeName(name, options) {
  if (criticalProperties.includes(name)) {
    throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
  } else if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return options.onDangerousProperty(name);
  }
  return name;
}

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/xmlparser/node2json.js
var METADATA_SYMBOL2 = XmlNode.getMetaDataSymbol();
function stripAttributePrefix(attrs, prefix) {
  if (!attrs || typeof attrs !== "object") return {};
  if (!prefix) return attrs;
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(prefix)) {
      const rawName = key.substring(prefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function prettify(node, options, matcher, readonlyMatcher) {
  return compress(node, options, matcher, readonlyMatcher);
}
function compress(arr, options, matcher, readonlyMatcher) {
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName(tagObj);
    if (property !== void 0 && property !== options.textNodeName) {
      const rawAttrs = stripAttributePrefix(
        tagObj[":@"] || {},
        options.attributeNamePrefix
      );
      matcher.push(property, rawAttrs);
    }
    if (property === options.textNodeName) {
      if (text === void 0) text = tagObj[property];
      else text += "" + tagObj[property];
    } else if (property === void 0) {
      continue;
    } else if (tagObj[property]) {
      let val = compress(tagObj[property], options, matcher, readonlyMatcher);
      const isLeaf = isLeafTag(val, options);
      if (tagObj[":@"]) {
        assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
      } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
        val = val[options.textNodeName];
      } else if (Object.keys(val).length === 0) {
        if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }
      if (tagObj[METADATA_SYMBOL2] !== void 0 && typeof val === "object" && val !== null) {
        val[METADATA_SYMBOL2] = tagObj[METADATA_SYMBOL2];
      }
      if (compressedObj[property] !== void 0 && Object.prototype.hasOwnProperty.call(compressedObj, property)) {
        if (!Array.isArray(compressedObj[property])) {
          compressedObj[property] = [compressedObj[property]];
        }
        compressedObj[property].push(val);
      } else {
        const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
        if (options.isArray(property, jPathOrMatcher, isLeaf)) {
          compressedObj[property] = [val];
        } else {
          compressedObj[property] = val;
        }
      }
      if (property !== void 0 && property !== options.textNodeName) {
        matcher.pop();
      }
    }
  }
  if (typeof text === "string") {
    if (text.length > 0) compressedObj[options.textNodeName] = text;
  } else if (text !== void 0) compressedObj[options.textNodeName] = text;
  return compressedObj;
}
function propName(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== ":@") return key;
  }
}
function assignAttributes(obj, attrMap, readonlyMatcher, options) {
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      const rawAttrName = atrrName.startsWith(options.attributeNamePrefix) ? atrrName.substring(options.attributeNamePrefix.length) : atrrName;
      const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() + "." + rawAttrName : readonlyMatcher;
      if (options.isArray(atrrName, jPathOrMatcher, true, true)) {
        obj[atrrName] = [attrMap[atrrName]];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}
function isLeafTag(obj, options) {
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  if (propCount === 0) {
    return true;
  }
  if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
    return true;
  }
  return false;
}

// ../../node_modules/.pnpm/fast-xml-parser@5.5.8/node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var XMLParser = class {
  constructor(options) {
    this.externalEntities = {};
    this.options = buildOptions(options);
  }
  /**
   * Parse XML dats to JS object 
   * @param {string|Uint8Array} xmlData 
   * @param {boolean|Object} validationOption 
   */
  parse(xmlData, validationOption) {
    if (typeof xmlData !== "string" && xmlData.toString) {
      xmlData = xmlData.toString();
    } else if (typeof xmlData !== "string") {
      throw new Error("XML data is accepted in String or Bytes[] form.");
    }
    if (validationOption) {
      if (validationOption === true) validationOption = {};
      const result = validate(xmlData, validationOption);
      if (result !== true) {
        throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
      }
    }
    const orderedObjParser = new OrderedObjParser(this.options);
    orderedObjParser.addExternalEntities(this.externalEntities);
    const orderedResult = orderedObjParser.parseXml(xmlData);
    if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
    else return prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
  }
  /**
   * Add Entity which is not by default supported by this library
   * @param {string} key 
   * @param {string} value 
   */
  addEntity(key, value) {
    if (value.indexOf("&") !== -1) {
      throw new Error("Entity value can't have '&'");
    } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
      throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
    } else if (value === "&") {
      throw new Error("An entity with value '&' is not permitted");
    } else {
      this.externalEntities[key] = value;
    }
  }
  /**
   * Returns a Symbol that can be used to access the metadata
   * property on a node.
   * 
   * If Symbol is not available in the environment, an ordinary property is used
   * and the name of the property is here returned.
   * 
   * The XMLMetaData property is only present when `captureMetaData`
   * is true in the options.
   */
  static getMetaDataSymbol() {
    return XmlNode.getMetaDataSymbol();
  }
};

// ../pptx-extractor/src/extract-ir.ts
var parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  // CRITICAL: keep "612.0" as string, not coerced to number 612
  trimValues: false,
  preserveOrder: false,
  removeNSPrefix: true
});
function decodeXmlEntities(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function asArray(v) {
  if (v === void 0) return [];
  return Array.isArray(v) ? v : [v];
}
function walk(node, visit) {
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    visit(key, value);
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else if (value && typeof value === "object") {
      walk(value, visit);
    }
  }
}
function extractText(node) {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  return "";
}
function extractRPr(rPr) {
  const out = {};
  if (!rPr || typeof rPr !== "object") return out;
  const sz = rPr["@_sz"];
  if (sz) {
    const n = Number(sz);
    if (Number.isFinite(n)) out.sizePt = n / 100;
  }
  if (rPr["@_b"] === "1") out.bold = true;
  const latin = rPr.latin;
  if (latin && latin["@_typeface"]) out.fontFamily = String(latin["@_typeface"]);
  const fill = rPr.solidFill;
  if (fill && fill.srgbClr && fill.srgbClr["@_val"]) {
    out.color = String(fill.srgbClr["@_val"]).toUpperCase();
  }
  return out;
}
function extractRunsFromTxBody(txBody) {
  const runs = [];
  for (const p of asArray(txBody?.p)) {
    for (const r of asArray(p?.r)) {
      const text = extractText(r?.t);
      if (!text) continue;
      runs.push({ text, ...extractRPr(r?.rPr) });
    }
  }
  return runs;
}
function extractFillColorFromSpPr(spPr) {
  if (!spPr) return void 0;
  const fill = spPr.solidFill;
  if (fill && fill.srgbClr && fill.srgbClr["@_val"]) {
    return String(fill.srgbClr["@_val"]).toUpperCase();
  }
  return void 0;
}
function extractBackground(cSld) {
  const bg = cSld?.bg?.bgPr?.solidFill?.srgbClr?.["@_val"];
  if (bg) return String(bg).toUpperCase();
  return void 0;
}
function isChartFrame(graphicFrame) {
  const data = graphicFrame?.graphic?.graphicData;
  const uri = data?.["@_uri"];
  if (typeof uri === "string" && uri.includes("/chart")) return true;
  return Boolean(data?.chart);
}
function isTableFrame(graphicFrame) {
  const data = graphicFrame?.graphic?.graphicData;
  const uri = data?.["@_uri"];
  if (typeof uri === "string" && uri.includes("/table")) return true;
  return Boolean(data?.tbl);
}
function extractTextFromTable(tbl) {
  const runs = [];
  const fills = [];
  for (const tr of asArray(tbl?.tr)) {
    for (const tc of asArray(tr?.tc)) {
      const tcPr = tc?.tcPr;
      const fill = extractFillColorFromSpPr(tcPr);
      if (fill) fills.push(fill);
      const cellRuns = extractRunsFromTxBody(tc?.txBody);
      runs.push(...cellRuns);
    }
  }
  const text = runs.map((r) => r.text).join(" ");
  return { text, runs, fills };
}
function extractSlide(index, xml) {
  const parsed = parser.parse(xml);
  const sld = parsed?.sld;
  const cSld = sld?.cSld;
  const spTree = cSld?.spTree;
  const textRuns = [];
  const fillColors = [];
  let shapeCount = 0;
  let hasTable = false;
  let hasChart = false;
  let hasImage = false;
  for (const sp of asArray(spTree?.sp)) {
    shapeCount++;
    const fill = extractFillColorFromSpPr(sp?.spPr);
    if (fill) fillColors.push(fill);
    const runs = extractRunsFromTxBody(sp?.txBody);
    textRuns.push(...runs);
  }
  for (const grp of asArray(spTree?.grpSp)) {
    for (const sp of asArray(grp?.sp)) {
      shapeCount++;
      const fill = extractFillColorFromSpPr(sp?.spPr);
      if (fill) fillColors.push(fill);
      const runs = extractRunsFromTxBody(sp?.txBody);
      textRuns.push(...runs);
    }
  }
  for (const _pic of asArray(spTree?.pic)) {
    shapeCount++;
    hasImage = true;
  }
  for (const gf of asArray(spTree?.graphicFrame)) {
    shapeCount++;
    if (isTableFrame(gf)) {
      hasTable = true;
      const tbl = gf?.graphic?.graphicData?.tbl;
      const { runs, fills } = extractTextFromTable(tbl);
      textRuns.push(...runs);
      fillColors.push(...fills);
    } else if (isChartFrame(gf)) {
      hasChart = true;
    }
  }
  walk(spTree, (key, value) => {
    if (key === "graphicFrame") return;
    if (key === "txBody" && value && typeof value === "object") {
      const runs = extractRunsFromTxBody(value);
      for (const r of runs) {
        if (!textRuns.some((existing) => existing === r)) {
        }
      }
    }
  });
  const text = textRuns.map((r) => r.text).join(" ");
  const background = extractBackground(cSld);
  return {
    index,
    text,
    shapeCount,
    hasTable,
    hasChart,
    hasImage,
    background,
    textRuns,
    fillColors: Array.from(new Set(fillColors))
  };
}
function extractMetaTitle(opened) {
  const xml = opened.getPartText("docProps/core.xml");
  if (!xml) return void 0;
  const m = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/.exec(xml);
  return m ? decodeXmlEntities(m[1]) : void 0;
}
function extractToIR(opened) {
  const slidePaths = listSlideParts(opened);
  const slides = slidePaths.map((path, i) => {
    const xml = opened.getPartText(path);
    return extractSlide(i + 1, xml);
  });
  return {
    meta: { title: extractMetaTitle(opened) },
    slideCount: slides.length,
    slides
  };
}

// src/template/roundTrip.ts
var DEFAULTS = {
  maxEntries: 1e4,
  maxInputBytes: 64 * 1024 * 1024,
  maxObjects: 25e4,
  maxSlides: 2e3,
  maxTotalUncompressedBytes: 256 * 1024 * 1024,
  maxXmlPartBytes: 8 * 1024 * 1024
};
var PptxTemplateRoundTripError = class extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "PptxTemplateRoundTripError";
    this.code = code;
    this.details = details;
  }
};
function sha256(input) {
  return createHash3("sha256").update(input).digest("hex");
}
function budget(options, key) {
  return options?.[key] ?? DEFAULTS[key];
}
function checkpoint(options) {
  if (options?.signal?.aborted) {
    throw new PptxTemplateRoundTripError(
      "PPTX_ABORTED",
      typeof options.signal.reason === "string" ? options.signal.reason : "PPTX round-trip operation was aborted."
    );
  }
}
function locator(artifactId, scheme, ...value) {
  return { artifactId, scheme, value };
}
function xmlUnescape(value) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function attr(xml, name) {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(xml);
  return match ? xmlUnescape(match[1]) : void 0;
}
function textFromXml(xml) {
  return Array.from(xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g), (match) => xmlUnescape(match[1])).join(" ");
}
function sourcePartForRelationships(path) {
  if (path === "_rels/.rels") return "";
  const match = /^(.*)\/_rels\/([^/]+)\.rels$/.exec(path);
  return match ? `${match[1]}/${match[2]}` : path;
}
function resolveRelationshipTarget(sourcePart, target) {
  const withoutFragment = target.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  let decoded;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    return void 0;
  }
  const resolved = decoded.startsWith("/") ? posixPath.normalize(decoded.slice(1)) : posixPath.normalize(posixPath.join(posixPath.dirname(sourcePart), decoded));
  if (!resolved || resolved === "." || resolved === ".." || resolved.startsWith("../") || resolved.startsWith("/")) return void 0;
  return resolved;
}
function parseRelationships(opened, artifactId) {
  const result = [];
  for (const path of opened.listParts().filter((part) => part.endsWith(".rels"))) {
    const xml = opened.getPartText(path) ?? "";
    const sourcePart = sourcePartForRelationships(path);
    for (const match of xml.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?\s*>/g)) {
      const attributes = match[1];
      const target = attr(attributes, "Target") ?? "";
      const external = (attr(attributes, "TargetMode") ?? "").toLowerCase() === "external";
      result.push({
        external,
        id: attr(attributes, "Id") ?? "",
        sourcePart,
        target,
        targetPart: external ? void 0 : resolveRelationshipTarget(sourcePart, target),
        type: attr(attributes, "Type") ?? ""
      });
    }
  }
  return result.sort((a, b) => `${a.sourcePart}\0${a.id}`.localeCompare(`${b.sourcePart}\0${b.id}`));
}
var KNOWN_PART = /^(?:\[Content_Types\]\.xml|_rels\/|docProps\/|ppt\/(?:presentation\.xml|_rels\/|slides\/|slideMasters\/|slideLayouts\/|theme\/|media\/|charts\/|drawings\/|embeddings\/|notesSlides\/|notesMasters\/|comments\/|commentAuthors\.xml|presProps\.xml|viewProps\.xml|tableStyles\.xml|commentAuthors\.xml|people\.xml))/;
function opaqueParts(opened, artifactId) {
  return opened.listParts().filter((path) => !KNOWN_PART.test(path)).map((path) => {
    const bytes = opened.getPart(path);
    return { byteLength: bytes.length, locator: locator(artifactId, "pptx.part", path), path, sha256: sha256(bytes) };
  });
}
function assertSafePackageParts(opened) {
  const paths = opened.listParts();
  const contentTypes = opened.getPartText("[Content_Types].xml") ?? "";
  if (paths.some((path) => /(?:^|\/)(?:EncryptionInfo|EncryptedPackage)$/i.test(path)) || /encryptedPackage/i.test(contentTypes)) {
    throw new PptxTemplateRoundTripError("PPTX_ENCRYPTED", "Encrypted PPTX input is not supported and was not decrypted.");
  }
  const active = paths.find((path) => /(?:vbaProject\.bin|activeX\/|embeddings\/.*\.(?:bin|exe|dll|com|msi))$/i.test(path));
  if (active || /macroEnabled|oleObject/i.test(contentTypes)) {
    throw new PptxTemplateRoundTripError("PPTX_ACTIVE_CONTENT_REJECTED", `Active macro or OLE content is not accepted${active ? `: ${active}` : "."}`);
  }
}
async function safelyOpen(input, options) {
  checkpoint(options);
  const buffer = Buffer.from(input);
  if (buffer.length > budget(options, "maxInputBytes")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Input exceeds ${budget(options, "maxInputBytes")} bytes.`);
  }
  if (buffer.length < 4 || buffer[0] !== 80 || buffer[1] !== 75) {
    throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "PPTX input is not an OPC ZIP package.");
  }
  let rawZip;
  try {
    rawZip = await import_jszip2.default.loadAsync(buffer, { checkCRC32: true });
  } catch (error) {
    throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `PPTX ZIP could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const files = Object.values(rawZip.files).filter((file) => !file.dir);
  if (files.length > budget(options, "maxEntries")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Archive has ${files.length} entries, exceeding ${budget(options, "maxEntries")}.`);
  }
  for (const file of files) {
    checkpoint(options);
    const unsafeName = file.unsafeOriginalName ?? file.name;
    const normalized = posixPath.normalize(unsafeName.replace(/\\/g, "/"));
    if (unsafeName.startsWith("/") || normalized === ".." || normalized.startsWith("../")) {
      throw new PptxTemplateRoundTripError("PPTX_UNSAFE_PATH", `Unsafe archive entry path: ${unsafeName}`);
    }
  }
  let opened;
  try {
    opened = await openPptx(buffer, {
      maxEntries: budget(options, "maxEntries"),
      maxTotalUncompressedBytes: budget(options, "maxTotalUncompressedBytes")
    });
    assertValidPptx(opened);
  } catch (error) {
    if (error instanceof PptxTemplateRoundTripError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new PptxTemplateRoundTripError(
      /exceed|limit/i.test(message) ? "PPTX_RESOURCE_LIMIT" : "PPTX_MALFORMED",
      message
    );
  }
  for (const path of opened.listParts()) {
    checkpoint(options);
    const part = opened.getPart(path);
    if ((path.endsWith(".xml") || path.endsWith(".rels")) && part.length > budget(options, "maxXmlPartBytes")) {
      throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `XML part ${path} exceeds ${budget(options, "maxXmlPartBytes")} bytes.`);
    }
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      const validity = XMLValidator.validate(part.toString("utf8"));
      if (validity !== true) {
        throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Malformed XML part ${path}: ${validity.err.msg}`);
      }
    }
  }
  assertSafePackageParts(opened);
  return opened;
}
function objectsForSlide(xml, path, artifactId) {
  const objects = [];
  const patterns = [
    ["shape", /<p:sp\b[\s\S]*?<\/p:sp>/g],
    ["image", /<p:pic\b[\s\S]*?<\/p:pic>/g],
    ["group", /<p:grpSp\b[\s\S]*?<\/p:grpSp>/g],
    ["table", /<p:graphicFrame\b(?=[\s\S]*?<a:tbl\b)[\s\S]*?<\/p:graphicFrame>/g],
    ["chart", /<p:graphicFrame\b(?=[\s\S]*?<(?:c:chart|cx:chart)\b)[\s\S]*?<\/p:graphicFrame>/g]
  ];
  for (const [kind, pattern] of patterns) {
    for (const match of xml.matchAll(pattern)) {
      const cNvPr = /<(?:p|a):cNvPr\b([^>]*)\/?\s*>/.exec(match[0])?.[1] ?? "";
      const id = attr(cNvPr, "id") ?? `${kind}-${objects.length + 1}`;
      const name = attr(cNvPr, "name") ?? attr(cNvPr, "descr");
      const slotId = name?.startsWith("runstamp:slot:") ? name.slice("runstamp:slot:".length) : void 0;
      objects.push({ id, kind, locator: locator(artifactId, "pptx.object", path, id), name, slotId, text: textFromXml(match[0]) });
    }
  }
  return objects.sort((a, b) => a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind));
}
async function inspectPptxTemplate(input, options) {
  const buffer = Buffer.from(input);
  const artifactId = sha256(buffer);
  const opened = await safelyOpen(buffer, options);
  const extracted = extractToIR(opened);
  const slidePaths = opened.listParts().filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => Number(/\d+/.exec(a)?.[0]) - Number(/\d+/.exec(b)?.[0]));
  if (slidePaths.length > budget(options, "maxSlides")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Presentation has ${slidePaths.length} slides, exceeding ${budget(options, "maxSlides")}.`);
  }
  const slides = slidePaths.map((path, index) => {
    checkpoint(options);
    const xml = opened.getPartText(path) ?? "";
    return {
      index: index + 1,
      locator: locator(artifactId, "pptx.slide", path),
      objects: objectsForSlide(xml, path, artifactId),
      part: path,
      text: extracted.slides[index]?.text ?? textFromXml(xml)
    };
  });
  const objectCount = slides.reduce((sum, slide) => sum + slide.objects.length, 0);
  if (objectCount > budget(options, "maxObjects")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Presentation has ${objectCount} objects, exceeding ${budget(options, "maxObjects")}.`);
  }
  const relationships = parseRelationships(opened, artifactId);
  const losses = [];
  if (slides.some((slide) => (opened.getPartText(slide.part) ?? "").includes("<p:timing"))) {
    losses.push({ code: "PPTX_ANIMATION_PRESERVATION_UNVERIFIED", message: "Timing XML is preserved unchanged, but general PowerPoint animation preservation is not claimed." });
  }
  for (const relationship of relationships.filter((entry) => entry.external)) {
    losses.push({
      code: "PPTX_EXTERNAL_RELATIONSHIP_NOT_FOLLOWED",
      message: `External relationship ${relationship.id} from ${relationship.sourcePart || "/"} was inventoried but not dereferenced.`,
      locator: locator(artifactId, "pptx.part", relationship.sourcePart || "_rels/.rels", relationship.id)
    });
  }
  const allXml = opened.listParts().filter((path) => path.endsWith(".xml")).map((path) => opened.getPartText(path) ?? "").join("\n");
  const counts = {
    charts: opened.listParts().filter((path) => /^ppt\/charts\/(?:chart|chartEx)\d+\.xml$/.test(path)).length,
    comments: opened.listParts().filter((path) => /^ppt\/comments\/comment\d+\.xml$/.test(path)).length,
    layouts: opened.listParts().filter((path) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(path)).length,
    masters: opened.listParts().filter((path) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(path)).length,
    media: opened.listParts().filter((path) => path.startsWith("ppt/media/")).length,
    notes: opened.listParts().filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path)).length,
    objects: objectCount,
    placeholders: Array.from(allXml.matchAll(/<p:ph\b/g)).length,
    relationships: relationships.length,
    slides: slides.length,
    tables: slides.reduce((sum, slide) => sum + slide.objects.filter((object) => object.kind === "table").length, 0),
    themes: opened.listParts().filter((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path)).length
  };
  const slots = slides.flatMap((slide) => slide.objects.filter((object) => Boolean(object.slotId)).map((object) => ({ id: object.slotId, kind: object.kind === "shape" ? "text" : "unsupported", locator: object.locator, value: object.text })));
  for (const slot of slots.filter((entry) => entry.kind === "unsupported")) {
    losses.push({
      code: "PPTX_SLOT_KIND_UNSUPPORTED",
      message: `Designated slot ${slot.id} is preserved, but its object kind is not mutable in v1.`,
      locator: slot.locator
    });
  }
  if (new Set(slots.map((slot) => slot.id)).size !== slots.length) {
    throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "Designated template slot IDs must be unique.");
  }
  return {
    artifactId,
    byteLength: buffer.length,
    canonicalPackageHash: normalizeForHash(opened).digest,
    counts,
    losses,
    opaqueParts: opaqueParts(opened, artifactId),
    relationships,
    slides,
    slots
  };
}
async function importPptxTemplate(input, options) {
  const source = Buffer.from(input);
  const inspection = await inspectPptxTemplate(source, options);
  return { inspection, losses: [...inspection.losses], mutation: {}, source };
}
async function mutatePptxTemplate(document, mutation) {
  const knownSlots = new Set(document.inspection.slots.filter((slot) => slot.kind === "text").map((slot) => slot.id));
  for (const [slotId, value] of Object.entries(mutation.textSlots ?? {})) {
    if (!knownSlots.has(slotId)) throw new PptxTemplateRoundTripError("PPTX_SLOT_NOT_FOUND", `Template slot ${slotId} was not designated.`);
    if (typeof value !== "string") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Template slot ${slotId} requires a string value.`);
  }
  for (const [from, to] of Object.entries(mutation.themeColors ?? {})) {
    if (!/^[A-Fa-f0-9]{6}$/.test(from) || !/^[A-Fa-f0-9]{6}$/.test(to)) {
      throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Theme color mutation ${from} -> ${to} must use six hexadecimal digits.`);
    }
  }
  return {
    ...document,
    mutation: {
      textSlots: { ...document.mutation.textSlots, ...mutation.textSlots },
      themeColors: { ...document.mutation.themeColors, ...mutation.themeColors }
    }
  };
}
function replaceSlotText(xml, slotId, value) {
  let changed = false;
  const result = xml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (shape) => {
    const cNvPr = /<p:cNvPr\b([^>]*)\/?\s*>/.exec(shape)?.[1] ?? "";
    const name = attr(cNvPr, "name") ?? attr(cNvPr, "descr");
    if (name !== `runstamp:slot:${slotId}`) return shape;
    let first = true;
    const next = shape.replace(/(<a:t(?:\s[^>]*)?>)[\s\S]*?(<\/a:t>)/g, (_text, start, end) => {
      const replacement = first ? escapeXml(value) : "";
      first = false;
      return `${start}${replacement}${end}`;
    });
    if (first) throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Text slot ${slotId} has no editable text run.`);
    changed = true;
    return next;
  });
  return { changed, xml: result };
}
function replaceThemeColors(xml, colors) {
  return xml.replace(/\bval="([A-Fa-f0-9]{6})"/g, (whole, value) => {
    const replacement = colors[value.toUpperCase()] ?? colors[value.toLowerCase()] ?? colors[value];
    return replacement ? `val="${replacement.toUpperCase()}"` : whole;
  });
}
async function exportPptxTemplate(document, options) {
  checkpoint(options);
  const sourceZip = await import_jszip2.default.loadAsync(document.source, { checkCRC32: true });
  const output = new import_jszip2.default();
  const pendingSlots = new Set(Object.keys(document.mutation.textSlots ?? {}));
  const fixedDate = /* @__PURE__ */ new Date("1980-01-01T00:00:00.000Z");
  for (const path of Object.keys(sourceZip.files).filter((entry) => !sourceZip.files[entry].dir).sort()) {
    checkpoint(options);
    let bytes = await sourceZip.files[path].async("nodebuffer");
    if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
      let xml = bytes.toString("utf8");
      for (const [slotId, value] of Object.entries(document.mutation.textSlots ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
        const replacement = replaceSlotText(xml, slotId, value);
        xml = replacement.xml;
        if (replacement.changed) pendingSlots.delete(slotId);
      }
      bytes = Buffer.from(xml);
    } else if (/^ppt\/theme\/theme\d+\.xml$/.test(path) && document.mutation.themeColors) {
      bytes = Buffer.from(replaceThemeColors(bytes.toString("utf8"), document.mutation.themeColors));
    }
    output.file(path, bytes, { createFolders: false, date: fixedDate });
  }
  if (pendingSlots.size > 0) throw new PptxTemplateRoundTripError("PPTX_SLOT_NOT_FOUND", `Designated slots were not found during export: ${Array.from(pendingSlots).sort().join(", ")}`);
  const buffer = await output.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    platform: "UNIX"
  });
  if (buffer.length > budget(options, "maxInputBytes")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Output exceeds ${budget(options, "maxInputBytes")} bytes.`);
  }
  return {
    buffer,
    byteLength: buffer.length,
    losses: [...document.losses],
    mediaType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sha256: sha256(buffer)
  };
}
function missingRelationshipIssues(inspection, partPaths) {
  const issues = [];
  for (const relationship of inspection.relationships) {
    if (relationship.external) continue;
    if (!relationship.targetPart || !partPaths.has(relationship.targetPart)) {
      issues.push({
        code: "PPTX_RELATIONSHIP_TARGET_MISSING",
        message: `Relationship ${relationship.id} from ${relationship.sourcePart || "/"} targets missing or escaping part ${relationship.target}.`,
        locator: locator(inspection.artifactId, "pptx.part", relationship.sourcePart || "_rels/.rels", relationship.id)
      });
    }
  }
  return issues;
}
async function verifyPptxTemplate(input, baseline, options) {
  let inspection;
  let opened;
  try {
    inspection = await inspectPptxTemplate(input, options);
    opened = await safelyOpen(input, options);
  } catch (error) {
    return {
      issues: [{ code: "PPTX_MALFORMED", message: error instanceof Error ? error.message : String(error) }],
      status: "FAIL"
    };
  }
  const issues = missingRelationshipIssues(inspection, new Set(opened.listParts()));
  if (baseline) {
    for (const key of Object.keys(baseline.counts)) {
      if (inspection.counts[key] !== baseline.counts[key]) {
        issues.push({ code: "PPTX_BASELINE_COUNT_CHANGED", message: `${key} changed from ${baseline.counts[key]} to ${inspection.counts[key]}.` });
      }
    }
    const actualOpaque = new Map(inspection.opaqueParts.map((part) => [part.path, part.sha256]));
    for (const expected of baseline.opaqueParts) {
      if (actualOpaque.get(expected.path) !== expected.sha256) {
        issues.push({ code: "PPTX_OPAQUE_PART_CHANGED", message: `Opaque part ${expected.path} was not preserved byte-for-byte.`, locator: expected.locator });
      }
    }
  }
  return { inspection, issues, status: issues.length === 0 ? "PASS" : "FAIL" };
}
function inputRecord(input) {
  if (!input || Array.isArray(input) || typeof input !== "object") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "Extension input must be an object.");
  return input;
}
function inputBuffer(input) {
  if (typeof input.sourceBase64 !== "string") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "sourceBase64 is required.");
  return Buffer.from(input.sourceBase64, "base64");
}
function jsonInspection(inspection) {
  return JSON.parse(JSON.stringify(inspection));
}
function createPptxTemplateRoundTripExtension() {
  return {
    manifest: {
      schemaVersion: 1,
      id: "runstamp.pptx-template-round-trip",
      version: "1.0.0",
      catalogItemId: "A04",
      title: "PPTX template round-trip",
      operations: [
        { name: "inspect", summary: "Inspect a PPTX template safely.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-inspection"] },
        { name: "import", summary: "Import a source-bound PPTX template.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-template-model"] },
        { name: "mutate", summary: "Mutate designated PPTX slots and theme tokens.", inputKinds: ["pptx-base64", "pptx-mutation"], outputKinds: ["pptx-base64"] },
        { name: "export", summary: "Export a deterministic PPTX template package.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-base64"] },
        { name: "verify", summary: "Verify PPTX package and relationship integrity.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-verification"] }
      ],
      warningCodes: [{ code: "PPTX_NO_MUTATIONS", description: "Export completed without requested content mutations." }],
      lossCodes: [
        { code: "PPTX_ANIMATION_PRESERVATION_UNVERIFIED", description: "Unchanged timing parts are preserved without a general animation compatibility claim." },
        { code: "PPTX_EXTERNAL_RELATIONSHIP_NOT_FOLLOWED", description: "External relationship declarations are not dereferenced." },
        { code: "PPTX_SLOT_KIND_UNSUPPORTED", description: "The designated slot kind is not mutable in v1." }
      ]
    },
    async execute(request, context) {
      try {
        const input = inputRecord(request.input);
        const source = inputBuffer(input);
        context.checkpoint({ inputBytes: source.length });
        context.reportProgress({ completed: 1, total: 3, message: "PPTX package opened" });
        const options = {
          maxEntries: context.budget.maxEntries,
          maxInputBytes: context.budget.maxInputBytes,
          signal: context.signal
        };
        if (request.operation === "inspect" || request.operation === "import") {
          const inspection = await inspectPptxTemplate(source, options);
          context.reportProgress({ completed: 3, total: 3, message: "PPTX inspected" });
          return { status: "ok", output: jsonInspection(inspection), warnings: [], losses: inspection.losses, artifacts: [] };
        }
        if (request.operation === "verify") {
          const verification = await verifyPptxTemplate(source, void 0, options);
          context.reportProgress({ completed: 3, total: 3, message: "PPTX verified" });
          return {
            status: "ok",
            output: JSON.parse(JSON.stringify(verification)),
            warnings: [],
            losses: verification.inspection?.losses ?? [],
            artifacts: []
          };
        }
        const document = await importPptxTemplate(source, options);
        let mutation = {};
        if (request.operation === "mutate") {
          const rawMutation = input.mutation;
          if (!rawMutation || Array.isArray(rawMutation) || typeof rawMutation !== "object") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "mutation object is required.");
          mutation = rawMutation;
        }
        const mutated = await mutatePptxTemplate(document, mutation);
        const exported = await exportPptxTemplate(mutated, options);
        context.checkpoint({ outputBytes: exported.byteLength });
        context.reportProgress({ completed: 3, total: 3, message: "PPTX exported" });
        return {
          status: "ok",
          output: { sourceBase64: exported.buffer.toString("base64"), sha256: exported.sha256 },
          warnings: Object.keys(mutation.textSlots ?? {}).length + Object.keys(mutation.themeColors ?? {}).length === 0 ? [{ code: "PPTX_NO_MUTATIONS", message: "PPTX was deterministically repackaged without content mutations." }] : [],
          losses: exported.losses,
          artifacts: [{ byteLength: exported.byteLength, mediaType: exported.mediaType, name: "round-trip.pptx", sha256: exported.sha256 }]
        };
      } catch (error) {
        return {
          status: "error",
          error: { code: error instanceof PptxTemplateRoundTripError ? error.code : "PPTX_MALFORMED", message: error instanceof Error ? error.message : String(error), retryable: false },
          warnings: [],
          losses: [],
          artifacts: []
        };
      }
    }
  };
}

// src/diagrams/processFlow.ts
var DEFAULT_BOX_WIDTH = 120;
var DEFAULT_BOX_HEIGHT = 60;
var DEFAULT_SPACING = 40;
function generateProcessFlow(config) {
  const items = config.items;
  const style = config.style ?? {};
  const direction = config.direction ?? "horizontal";
  const spacing = style.spacing ?? DEFAULT_SPACING;
  const accentColor = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 12;
  const fontFamily = style.fontFamily ?? "Arial";
  const connectorStyle = style.connectorStyle ?? "arrow";
  const isHorizontal = direction === "horizontal";
  const boxW = DEFAULT_BOX_WIDTH;
  const boxH = DEFAULT_BOX_HEIGHT;
  const children = [];
  const totalLength = items.length * (isHorizontal ? boxW : boxH) + (items.length - 1) * spacing;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = isHorizontal ? i * (boxW + spacing) : 0;
    const y = isHorizontal ? 0 : i * (boxH + spacing);
    const fillColor = item.color ?? accentColor;
    const box = {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: boxW,
        height: boxH,
        backgroundColor: fillColor
      },
      textContent: item.text,
      textStyle: {
        fontSize,
        fontFamily,
        color: "#FFFFFF",
        textAlign: "center",
        verticalAlign: "middle"
      }
    };
    children.push(box);
    if (i < items.length - 1 && connectorStyle !== "none") {
      const connector = {
        type: "Connector",
        connectorType: "straight",
        start: {
          x: isHorizontal ? x + boxW : x + boxW / 2,
          y: isHorizontal ? boxH / 2 : y + boxH
        },
        end: {
          x: isHorizontal ? x + boxW + spacing : x + boxW / 2,
          y: isHorizontal ? boxH / 2 : y + boxH + spacing
        },
        lineWidth: 2,
        lineColor: "#666666",
        arrowEnd: connectorStyle === "arrow" ? { type: "triangle", width: "med", length: "med" } : false
      };
      children.push(connector);
    }
  }
  const groupWidth = isHorizontal ? totalLength : boxW;
  const groupHeight = isHorizontal ? boxH : totalLength;
  return {
    type: "Group",
    style: {
      width: groupWidth,
      height: groupHeight
    },
    children
  };
}

// src/diagrams/hierarchy.ts
var BOX_WIDTH = 120;
var BOX_HEIGHT = 50;
var H_SPACING = 30;
var V_SPACING = 60;
function countLeaves(item) {
  if (!item.children || item.children.length === 0) return 1;
  return item.children.reduce((sum, c) => sum + countLeaves(c), 0);
}
function treeWidth(item) {
  const leaves = countLeaves(item);
  return leaves * BOX_WIDTH + (leaves - 1) * H_SPACING;
}
function layoutHierarchy(item, x, y, accentColor, fontSize, fontFamily, children, depth) {
  const myWidth = treeWidth(item);
  const boxX = x + myWidth / 2 - BOX_WIDTH / 2;
  const fillColor = item.color ?? accentColor;
  const box = {
    type: "View",
    shapeType: depth === 0 ? "roundRect" : "rect",
    style: {
      position: "absolute",
      left: boxX,
      top: y,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      backgroundColor: fillColor
    },
    textContent: item.text,
    textStyle: {
      fontSize,
      fontFamily,
      color: "#FFFFFF",
      textAlign: "center",
      verticalAlign: "middle"
    }
  };
  children.push(box);
  const parentCx = boxX + BOX_WIDTH / 2;
  const parentBottom = y + BOX_HEIGHT;
  if (item.children && item.children.length > 0) {
    let childX = x;
    for (const child of item.children) {
      const childWidth = treeWidth(child);
      const { cx: childCx } = layoutHierarchy(
        child,
        childX,
        y + BOX_HEIGHT + V_SPACING,
        accentColor,
        fontSize,
        fontFamily,
        children,
        depth + 1
      );
      const connector = {
        type: "Connector",
        connectorType: "elbow",
        start: { x: parentCx, y: parentBottom },
        end: { x: childCx, y: y + BOX_HEIGHT + V_SPACING },
        lineWidth: 1.5,
        lineColor: "#999999"
      };
      children.push(connector);
      childX += childWidth + H_SPACING;
    }
  }
  return { cx: parentCx };
}
function treeDepth(item) {
  if (!item.children || item.children.length === 0) return 1;
  return 1 + Math.max(...item.children.map(treeDepth));
}
function generateHierarchy(config) {
  const style = config.style ?? {};
  const accentColor = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 11;
  const fontFamily = style.fontFamily ?? "Arial";
  const root = config.items[0];
  if (!root) {
    return { type: "Group", style: { width: 0, height: 0 }, children: [] };
  }
  const effectiveRoot = config.items.length === 1 ? root : { text: "", children: config.items };
  const children = [];
  const width = treeWidth(effectiveRoot);
  const depth = treeDepth(effectiveRoot);
  const height = depth * BOX_HEIGHT + (depth - 1) * V_SPACING;
  layoutHierarchy(effectiveRoot, 0, 0, accentColor, fontSize, fontFamily, children, 0);
  return {
    type: "Group",
    style: { width, height },
    children
  };
}

// src/diagrams/cycle.ts
var NODE_RADIUS = 50;
var CIRCLE_RADIUS = 120;
function generateCycle(config) {
  const items = config.items;
  const style = config.style ?? {};
  const accentColor = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 11;
  const fontFamily = style.fontFamily ?? "Arial";
  const connectorStyle = style.connectorStyle ?? "arrow";
  const n = items.length;
  if (n === 0) {
    return { type: "Group", style: { width: 0, height: 0 }, children: [] };
  }
  const circleR = Math.max(CIRCLE_RADIUS, n * 30);
  const nodeSize = NODE_RADIUS * 2;
  const totalSize = (circleR + NODE_RADIUS) * 2;
  const centerX = totalSize / 2;
  const centerY = totalSize / 2;
  const children = [];
  const positions = [];
  for (let i = 0; i < n; i++) {
    const angle = 2 * Math.PI * i / n - Math.PI / 2;
    const cx = centerX + circleR * Math.cos(angle);
    const cy = centerY + circleR * Math.sin(angle);
    positions.push({ x: cx, y: cy });
    const item = items[i];
    const fillColor = item.color ?? accentColor;
    const box = {
      type: "View",
      shapeType: "ellipse",
      style: {
        position: "absolute",
        left: cx - NODE_RADIUS,
        top: cy - NODE_RADIUS,
        width: nodeSize,
        height: nodeSize,
        backgroundColor: fillColor
      },
      textContent: item.text,
      textStyle: {
        fontSize,
        fontFamily,
        color: "#FFFFFF",
        textAlign: "center",
        verticalAlign: "middle"
      }
    };
    children.push(box);
  }
  if (n > 1 && connectorStyle !== "none") {
    for (let i = 0; i < n; i++) {
      const from = positions[i];
      const to = positions[(i + 1) % n];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const connector = {
        type: "Connector",
        connectorType: "curved",
        start: {
          x: from.x + nx * NODE_RADIUS,
          y: from.y + ny * NODE_RADIUS
        },
        end: {
          x: to.x - nx * NODE_RADIUS,
          y: to.y - ny * NODE_RADIUS
        },
        lineWidth: 2,
        lineColor: "#666666",
        arrowEnd: connectorStyle === "arrow" ? { type: "triangle", width: "med", length: "med" } : false
      };
      children.push(connector);
    }
  }
  return {
    type: "Group",
    style: { width: totalSize, height: totalSize },
    children
  };
}

// src/diagrams/matrix.ts
var QUADRANT_SIZE = 150;
var GAP = 8;
function generateMatrix(config) {
  const items = config.items;
  const style = config.style ?? {};
  const accentColor = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 12;
  const fontFamily = style.fontFamily ?? "Arial";
  const children = [];
  const colors = [
    items[0]?.color ?? accentColor,
    items[1]?.color ?? "#ED7D31",
    items[2]?.color ?? "#70AD47",
    items[3]?.color ?? "#FFC000"
  ];
  const totalWidth = QUADRANT_SIZE * 2 + GAP;
  const totalHeight = QUADRANT_SIZE * 2 + GAP;
  const positions = [
    { x: 0, y: 0 },
    { x: QUADRANT_SIZE + GAP, y: 0 },
    { x: 0, y: QUADRANT_SIZE + GAP },
    { x: QUADRANT_SIZE + GAP, y: QUADRANT_SIZE + GAP }
  ];
  for (let i = 0; i < 4 && i < items.length; i++) {
    const pos = positions[i];
    const item = items[i];
    const quadrant = {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: QUADRANT_SIZE,
        height: QUADRANT_SIZE,
        backgroundColor: colors[i]
      },
      textContent: item.text,
      textStyle: {
        fontSize,
        fontFamily,
        color: "#FFFFFF",
        textAlign: "center",
        verticalAlign: "middle"
      }
    };
    children.push(quadrant);
  }
  return {
    type: "Group",
    style: { width: totalWidth, height: totalHeight },
    children
  };
}

// src/diagrams/pyramid.ts
var BASE_WIDTH = 300;
var LEVEL_HEIGHT = 50;
var V_GAP = 4;
function generatePyramid(config) {
  const items = config.items;
  const style = config.style ?? {};
  const accentColor = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 11;
  const fontFamily = style.fontFamily ?? "Arial";
  const n = items.length;
  if (n === 0) {
    return { type: "Group", style: { width: 0, height: 0 }, children: [] };
  }
  const children = [];
  const totalHeight = n * LEVEL_HEIGHT + (n - 1) * V_GAP;
  for (let i = 0; i < n; i++) {
    const item = items[i];
    const ratio = (n - i) / n;
    const levelWidth = BASE_WIDTH * ratio;
    const x = (BASE_WIDTH - levelWidth) / 2;
    const y = i * (LEVEL_HEIGHT + V_GAP);
    const fillColor = item.color ?? accentColor;
    const level = {
      type: "View",
      shapeType: "trapezoid",
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: levelWidth,
        height: LEVEL_HEIGHT,
        backgroundColor: fillColor
      },
      textContent: item.text,
      textStyle: {
        fontSize,
        fontFamily,
        color: "#FFFFFF",
        textAlign: "center",
        verticalAlign: "middle"
      }
    };
    children.push(level);
  }
  return {
    type: "Group",
    style: { width: BASE_WIDTH, height: totalHeight },
    children
  };
}

// src/diagrams/list.ts
var ITEM_WIDTH = 200;
var ITEM_HEIGHT = 40;
var SPACING = 10;
var ICON_SIZE = 30;
var ICON_GAP = 10;
function generateList(config) {
  const items = config.items;
  const style = config.style ?? {};
  const direction = config.direction ?? "vertical";
  const accentColor = style.accentColor ?? "#4472C4";
  const fontSize = style.fontSize ?? 12;
  const fontFamily = style.fontFamily ?? "Arial";
  const spacing = style.spacing ?? SPACING;
  const isVertical = direction === "vertical";
  const children = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = isVertical ? 0 : i * (ITEM_WIDTH + spacing);
    const y = isVertical ? i * (ITEM_HEIGHT + spacing) : 0;
    const fillColor = item.color ?? accentColor;
    const hasIcon = !!item.icon;
    if (hasIcon) {
      const icon = {
        type: "View",
        shapeType: "ellipse",
        style: {
          position: "absolute",
          left: x + 5,
          top: y + (ITEM_HEIGHT - ICON_SIZE) / 2,
          width: ICON_SIZE,
          height: ICON_SIZE,
          backgroundColor: fillColor
        },
        textContent: item.icon.charAt(0).toUpperCase(),
        textStyle: {
          fontSize: fontSize - 2,
          fontFamily,
          color: "#FFFFFF",
          textAlign: "center",
          verticalAlign: "middle"
        }
      };
      children.push(icon);
    }
    const textOffset = hasIcon ? ICON_SIZE + ICON_GAP + 5 : 10;
    const itemRect = {
      type: "View",
      shapeType: "roundRect",
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        borderWidth: 1,
        borderColor: fillColor
      },
      textContent: item.text,
      textStyle: {
        fontSize,
        fontFamily,
        color: "#333333",
        textAlign: "left",
        verticalAlign: "middle",
        textInsets: { left: textOffset }
      }
    };
    children.push(itemRect);
  }
  const totalWidth = isVertical ? ITEM_WIDTH : items.length * (ITEM_WIDTH + spacing) - spacing;
  const totalHeight = isVertical ? items.length * (ITEM_HEIGHT + spacing) - spacing : ITEM_HEIGHT;
  return {
    type: "Group",
    style: { width: totalWidth, height: totalHeight },
    children
  };
}

// src/diagrams/index.ts
function generateDiagram(config) {
  switch (config.type) {
    case "process":
      return generateProcessFlow(config);
    case "hierarchy":
      return generateHierarchy(config);
    case "cycle":
      return generateCycle(config);
    case "matrix":
      return generateMatrix(config);
    case "pyramid":
      return generatePyramid(config);
    case "list":
      return generateList(config);
    default:
      throw new Error(`Unknown diagram type: ${config.type}`);
  }
}

// ../pptx-primitives/dist/tokens/schema.js
var hexColor = external_exports.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u, "must be #RGB, #RRGGBB, or #RRGGBBAA");
var pxValue = external_exports.number().nonnegative();
var letterSpacing = external_exports.number();
var rulePattern = external_exports.string();
var autoNumSchemeSchema = external_exports.enum([
  "arabicPeriod",
  "arabicParenR",
  "romanUcPeriod",
  "romanLcPeriod",
  "alphaUcPeriod",
  "alphaLcPeriod",
  "alphaLcParenR",
  "alphaUcParenR"
]);
var canvasSchema = external_exports.object({
  /** Aspect ratio; widescreen 16:9 or classic 4:3. */
  ratio: external_exports.enum(["16:9", "4:3"]).default("16:9"),
  /** Outer margin (px) from slide edge to content gutter. */
  margin: pxValue.default(56),
  /** Global density multiplier applied to vertical gaps and padding.
   *  1.0 = neutral. <1 = dense (Bain matrix pages). >1 = airy (editorial). */
  density: external_exports.number().min(0.6).max(1.6).default(1),
  /** Slide background color, as a hex. Photography treatments live under
   *  `photo` — this is the fallback/paper surface only. */
  surface: hexColor.default("#FFFFFF")
}).strict();
var paletteSchema = external_exports.object({
  /** Primary text color, load-bearing. */
  foreground: hexColor.default("#0A0A0A"),
  /** Secondary text color (subtitles, metadata). */
  muted: hexColor.default("#6B6B6B"),
  /** Tertiary text color (timestamps, captions). */
  faint: hexColor.default("#A8A8A8"),
  /** Default rule/hairline color. */
  rule: hexColor.default("#E5E5E5"),
  /** The one accent. Used sparingly. */
  accent: hexColor.default("#0A0A0A"),
  /** Text color to use *on* accent (e.g., filled chips, ribbon overlays). */
  accentInverse: hexColor.default("#FFFFFF"),
  /** Optional second accent for charts / secondary emphasis. Null = unused. */
  accentSecondary: hexColor.nullable().default(null)
}).strict();
var typeRoleSchema = external_exports.object({
  /** Font family name. Substituted via font resolver if unavailable. */
  family: external_exports.string().min(1),
  /** CSS weight (100–900). */
  weight: external_exports.number().int().min(100).max(900).default(400),
  /** Font size in points (PPTX convention). */
  size: external_exports.number().positive(),
  /** Letter-spacing in px. Applied in OOXML via `spc` attribute. */
  letterSpacing: letterSpacing.default(0),
  /** Line-height in points (absolute), not multiplier. */
  lineHeight: external_exports.number().positive().optional(),
  /** Italic. */
  italic: external_exports.boolean().default(false),
  /** Content transform. `upper` uppercases at render (not CSS). */
  transform: external_exports.enum(["none", "upper", "lower", "title"]).default("none")
}).strict();
var typeSchema = external_exports.object({
  /** Oversized headline, used for editorial / title slides. */
  display: typeRoleSchema,
  /** Slide titles. */
  title: typeRoleSchema,
  /** Running body text. */
  body: typeRoleSchema,
  /** Small annotations, footnotes. */
  caption: typeRoleSchema,
  /** Tracked caps above a title. */
  eyebrow: typeRoleSchema,
  /** Header ribbon / nav labels. */
  nav: typeRoleSchema
}).strict();
var rulesSchema = external_exports.object({
  /** Rule drawn under a slide title. Bain's "bar" lives here. */
  title: rulePattern.default("none"),
  /** Rule drawn under a section header / section ribbon. */
  section: rulePattern.default("none"),
  /** Rule separating body content (bullet groups, table rows, etc.). */
  divider: rulePattern.default("1px solid token:rule"),
  /** Rule along a slide edge / footer top. */
  edge: rulePattern.default("none")
}).strict();
var ornamentSchema = external_exports.object({
  /** Bullet marker style. `none` means prose without markers. */
  bullet: external_exports.object({
    marker: external_exports.enum(["filledDot", "openDot", "enDash", "square", "chevron", "none", "autoNum"]).default("filledDot"),
    /** Native PowerPoint numbering scheme when marker is `autoNum`. */
    scheme: autoNumSchemeSchema.optional(),
    /** Color role for the marker. */
    color: external_exports.enum(["foreground", "muted", "faint", "accent"]).default("foreground"),
    /** Marker size relative to surrounding body text (multiplier). */
    sizeRatio: external_exports.number().positive().default(0.9),
    /** Space from marker to text (px). */
    gap: pxValue.default(10),
    /** Indent for nested levels (px). */
    indent: pxValue.default(16),
    /** Style for nested (level 2+) markers. */
    nestedMarker: external_exports.enum(["filledDot", "openDot", "enDash", "square", "chevron", "none", "autoNum"]).default("enDash")
  }).strict(),
  /** Step / sequence marker style. */
  stepMarker: external_exports.object({
    style: external_exports.enum(["circleNumeric", "serifCircled", "plain", "none"]).default("circleNumeric"),
    /** Color role for the marker background. */
    fill: external_exports.enum(["foreground", "accent", "muted", "surface"]).default("accent")
  }).strict(),
  /** Page-number style in footer. */
  pageNumber: external_exports.object({
    style: external_exports.enum(["plain", "circledAccent", "boxedAccent", "none"]).default("plain"),
    prefix: external_exports.string().default("")
  }).strict()
}).strict();
var chromeSchema = external_exports.object({
  headerRibbon: external_exports.object({
    enabled: external_exports.boolean().default(false),
    /** Height in px. */
    height: pxValue.default(28),
    /** Fill color role. */
    fill: external_exports.enum(["foreground", "accent", "muted", "surface"]).default("foreground"),
    /** Role from `type` used for the ribbon label. */
    type: external_exports.enum(["nav", "eyebrow", "caption"]).default("nav"),
    /** Horizontal alignment of the label. */
    align: external_exports.enum(["left", "center", "right"]).default("center")
  }).strict(),
  footer: external_exports.object({
    enabled: external_exports.boolean().default(true),
    /** Content order from left → right. */
    layout: external_exports.array(external_exports.enum(["disclaimer", "projectCode", "watermark", "pageNumber", "spacer"])).default(["spacer", "pageNumber"]),
    /** Reserved height in px. */
    height: pxValue.default(32),
    /** Edge rule above the footer (nullable → no rule). */
    topRule: rulePattern.default("none"),
    /** Disclaimer text (empty → hidden even if in layout). */
    disclaimer: external_exports.string().default(""),
    /** Project / deck code (empty → hidden). */
    projectCode: external_exports.string().default(""),
    /** Watermark text or logomark URL (data: or https:). */
    watermark: external_exports.string().default("")
  }).strict()
}).strict();
var photoSchema = external_exports.object({
  /** Whether photography is a first-class content type for this bundle.
   *  When false, image-bleed primitives degrade to empty regions or
   *  fall back to typography-only layouts (Bain-style). */
  enabled: external_exports.boolean().default(false),
  /** Default bleed treatment when a slide calls for imagery. */
  defaultBleed: external_exports.enum(["full", "half", "quarter", "inline", "none"]).default("none"),
  /** Overlay scrim when text sits on top of photography.
   *  `none` — no scrim; `light` — translucent white; `dark` — translucent black;
   *  `gradientSuppressed` is deliberately absent. */
  scrim: external_exports.enum(["none", "light", "dark"]).default("none"),
  /** Scrim opacity 0–1. */
  scrimOpacity: external_exports.number().min(0).max(1).default(0.35)
}).strict();
var embeddedFontSchema = external_exports.object({
  /** Family name, exactly as referenced by type.X.family. */
  family: external_exports.string().min(1),
  /** Font file source. https://, data:, or absolute path the engine can
   *  resolve on the server. */
  src: external_exports.string().min(1),
  /** True for bold variant. */
  bold: external_exports.boolean().optional(),
  /** True for italic variant. */
  italic: external_exports.boolean().optional()
}).strict();
var spacingSchema = external_exports.object({
  /** xs/sm/md/lg/xl/2xl — step values in px.
   *  Primitives ask for a semantic step; bundles tune the scale globally. */
  xs: pxValue.default(4),
  sm: pxValue.default(8),
  md: pxValue.default(16),
  lg: pxValue.default(24),
  xl: pxValue.default(40),
  xxl: pxValue.default(72)
}).strict();
var TokenBundleSchema = external_exports.object({
  /** Schema version pin. Lets callers declare they targeted a specific shape. */
  version: external_exports.literal("1.0").default("1.0"),
  canvas: canvasSchema.partial().optional(),
  palette: paletteSchema.partial().optional(),
  type: external_exports.object({
    display: typeRoleSchema.partial().optional(),
    title: typeRoleSchema.partial().optional(),
    body: typeRoleSchema.partial().optional(),
    caption: typeRoleSchema.partial().optional(),
    eyebrow: typeRoleSchema.partial().optional(),
    nav: typeRoleSchema.partial().optional()
  }).strict().optional(),
  rules: rulesSchema.partial().optional(),
  ornament: external_exports.object({
    bullet: ornamentSchema.shape.bullet.partial().optional(),
    stepMarker: ornamentSchema.shape.stepMarker.partial().optional(),
    pageNumber: ornamentSchema.shape.pageNumber.partial().optional()
  }).strict().optional(),
  chrome: external_exports.object({
    headerRibbon: chromeSchema.shape.headerRibbon.partial().optional(),
    footer: chromeSchema.shape.footer.partial().optional()
  }).strict().optional(),
  photo: photoSchema.partial().optional(),
  spacing: spacingSchema.partial().optional(),
  /** Caller-supplied fonts. Each entry registers a family the engine would
   *  otherwise substitute. Optional; absent → only bundled families work. */
  embeddedFonts: external_exports.array(embeddedFontSchema).optional()
}).strict();
var ResolvedTokensSchema = external_exports.object({
  version: external_exports.literal("1.0"),
  canvas: canvasSchema,
  palette: paletteSchema,
  type: typeSchema,
  rules: rulesSchema,
  ornament: ornamentSchema,
  chrome: chromeSchema,
  photo: photoSchema,
  spacing: spacingSchema,
  /** Always an array at resolved time (possibly empty). */
  embeddedFonts: external_exports.array(embeddedFontSchema)
}).strict();

// ../pptx-primitives/dist/tokens/rulePattern.js
var STYLE_VALUES = /* @__PURE__ */ new Set(["solid", "dashed", "dotted"]);
var RulePatternError = class extends Error {
  pattern;
  constructor(message, pattern) {
    super(`[rulePattern] ${message}: ${JSON.stringify(pattern)}`);
    this.pattern = pattern;
    this.name = "RulePatternError";
  }
};
function parseRulePattern(pattern, palette) {
  const trimmed = pattern.trim();
  if (trimmed === "" || trimmed === "none")
    return null;
  const gapMatch = trimmed.match(/\bgap:\s*(\d+(?:\.\d+)?)\s*$/u);
  const gap = gapMatch ? Number(gapMatch[1]) : 0;
  const body = gapMatch ? trimmed.slice(0, gapMatch.index).trim() : trimmed;
  const segments = body.split(/\s*\+\s*/u);
  const lines = segments.map((seg) => parseLine(seg, palette, pattern));
  const totalHeight = lines.reduce((acc, l) => acc + l.width, 0) + gap * Math.max(0, lines.length - 1);
  return { lines, gap, totalHeight };
}
function parseLine(segment, palette, wholePattern) {
  const match = segment.trim().match(/^(\d+(?:\.\d+)?)px\s+([a-z]+)\s+(.+)$/u);
  if (!match) {
    throw new RulePatternError(`rule segment must be "<width>px <style> <color>", got ${JSON.stringify(segment)}`, wholePattern);
  }
  const widthNum = Number(match[1]);
  const style = match[2];
  if (!STYLE_VALUES.has(style)) {
    throw new RulePatternError(`unknown style ${JSON.stringify(style)}`, wholePattern);
  }
  const color = resolveColor(match[3].trim(), palette, wholePattern);
  return { width: widthNum, style, color };
}
var HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;
function resolveColor(raw, palette, wholePattern) {
  if (HEX_RE.test(raw))
    return raw;
  if (raw.startsWith("token:")) {
    const role = raw.slice("token:".length).trim();
    const value = palette[role];
    if (typeof value !== "string" || !HEX_RE.test(value)) {
      throw new RulePatternError(`unknown or non-hex palette role ${JSON.stringify(role)}`, wholePattern);
    }
    return value;
  }
  throw new RulePatternError(`color must be hex (#RGB/#RRGGBB) or token:<role>, got ${JSON.stringify(raw)}`, wholePattern);
}

// ../pptx-primitives/dist/tokens/fonts.js
var BUNDLED_FONT_POOL = Object.freeze([
  "Arial",
  "Calibri",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Tahoma",
  "Impact",
  "Comic Sans MS",
  "Palatino",
  "Garamond",
  "Book Antiqua",
  "Cambria",
  "Consolas",
  "Segoe UI",
  // Noto family — the engine's own always-present fallback chain.
  "Noto Sans",
  "Noto Serif",
  "Noto Sans JP",
  "Noto Sans SC",
  "Noto Sans TC",
  "Noto Sans KR"
]);

// ../pptx-primitives/dist/util/rule.js
function emitHorizontalRule(pattern, palette, left, top, width) {
  const parsed = parseRulePattern(pattern, palette);
  if (!parsed)
    return { nodes: [], consumedHeight: 0 };
  const nodes = [];
  let y = top;
  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i];
    const node = {
      kind: "view",
      shape: "rect",
      decorative: true,
      rect: { left, top: y, width, height: line.width },
      fill: line.color
    };
    nodes.push(node);
    y += line.width;
    if (i < parsed.lines.length - 1)
      y += parsed.gap;
  }
  return { nodes, consumedHeight: parsed.totalHeight };
}

// ../pptx-primitives/dist/util/metricsProvider.js
var TOKEN_PROVIDERS = /* @__PURE__ */ new WeakMap();
function getMetricsProvider(tokens) {
  return TOKEN_PROVIDERS.get(tokens) ?? null;
}

// ../pptx-primitives/dist/util/estimateText.js
var WIDTH_RATIO_BY_FAMILY = {
  "Helvetica Neue": 0.5,
  "Helvetica": 0.5,
  "Arial": 0.52,
  "Inter": 0.49,
  "IBM Plex Sans": 0.51,
  "IBM Plex Mono": 0.6,
  "Courier New": 0.6,
  "Roboto": 0.5,
  "S\xF6hne": 0.49,
  // Serifs
  "Georgia": 0.53,
  "Baskerville": 0.52,
  "Bodoni": 0.48,
  "Times New Roman": 0.5
};
var DEFAULT_WIDTH_RATIO = 0.52;
var PX_PER_PT = 96 / 72;
function resolveProvider(source) {
  if (!source)
    return null;
  if (typeof source === "function")
    return source;
  return getMetricsProvider(source);
}
function getMetrics(source, family) {
  const provider = resolveProvider(source);
  return provider ? provider(family) : null;
}
function estimateTextWidth(input, source) {
  const metrics = getMetrics(source, input.family);
  const tracking = input.letterSpacing ?? 0;
  const trackingTotal = Math.max(0, input.content.length - 1) * tracking;
  if (metrics?.measureWidthPx) {
    const text = input.uppercase ? input.content.toUpperCase() : input.content;
    return metrics.measureWidthPx(text, input.sizePt) + trackingTotal;
  }
  const base = metrics?.avgWidthRatio ?? WIDTH_RATIO_BY_FAMILY[input.family] ?? DEFAULT_WIDTH_RATIO;
  const ratio = input.uppercase ? base * 1.08 : input.digitsOnly ? base * 0.96 : base;
  return input.content.length * input.sizePt * PX_PER_PT * ratio + trackingTotal;
}
function estimateLineHeight(sizePt, lineHeightPt, source, family) {
  if (lineHeightPt !== void 0)
    return lineHeightPt * PX_PER_PT;
  if (source && family) {
    const metrics = getMetrics(source, family);
    if (metrics?.lineHeightPx)
      return metrics.lineHeightPx(sizePt);
  }
  return sizePt * 1.2 * PX_PER_PT;
}
function estimateLineCount(input, source) {
  const words = input.content.split(/\s+/u).flatMap((chunk) => splitOnHyphens(chunk)).filter(Boolean);
  if (words.length === 0)
    return 0;
  const tracking = input.letterSpacing ?? 0;
  const metrics = getMetrics(source, input.family);
  let measureWord;
  let spaceWidth;
  if (metrics?.measureWidthPx) {
    measureWord = (word) => metrics.measureWidthPx(input.uppercase ? word.toUpperCase() : word, input.sizePt) + Math.max(0, word.length - 1) * tracking;
    spaceWidth = metrics.measureWidthPx(" ", input.sizePt);
  } else {
    const ratio = metrics?.avgWidthRatio ?? WIDTH_RATIO_BY_FAMILY[input.family] ?? DEFAULT_WIDTH_RATIO;
    const adjusted = input.uppercase ? ratio * 1.08 : ratio;
    measureWord = (word) => word.length * input.sizePt * PX_PER_PT * adjusted + Math.max(0, word.length - 1) * tracking;
    spaceWidth = input.sizePt * PX_PER_PT * adjusted * 0.33;
  }
  const wrapWidth = Math.max(0, input.width - 4);
  if (metrics?.measureWidthPx) {
    const whole = metrics.measureWidthPx(input.uppercase ? input.content.toUpperCase() : input.content, input.sizePt);
    if (process.env.RUNSTAMP_DEBUG_LINECOUNT) {
      console.error(`  [LC] "${input.content.slice(0, 40)}" sz=${input.sizePt} fam=${input.family} whole=${whole} wrapW=${wrapWidth} \u2192`, whole <= wrapWidth ? "1 (short-circuit)" : "fall-through");
    }
    if (whole + Math.max(0, input.content.length - 1) * tracking <= wrapWidth) {
      return 1;
    }
  } else if (process.env.RUNSTAMP_DEBUG_LINECOUNT) {
    console.error(`  [LC] "${input.content.slice(0, 40)}" \u2014 NO measureWidthPx`);
  }
  let lines = 1;
  let xOnLine = 0;
  for (const word of words) {
    const w = measureWord(word);
    const withLead = xOnLine === 0 ? w : w + spaceWidth;
    if (xOnLine + withLead > wrapWidth) {
      lines += 1;
      xOnLine = w;
    } else {
      xOnLine += withLead;
    }
  }
  return lines;
}
function splitOnHyphens(chunk) {
  if (!chunk.includes("-"))
    return [chunk];
  const out = [];
  const parts = chunk.split("-");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length === 0)
      continue;
    out.push(i < parts.length - 1 ? `${parts[i]}-` : parts[i]);
  }
  return out;
}
function flattenRuns(runs) {
  let out = "";
  for (const run of runs)
    out += run.text;
  return out;
}
function applyTypeTransform(content, transform) {
  switch (transform) {
    case "upper":
      return content.toUpperCase();
    case "lower":
      return content.toLowerCase();
    case "title":
      return content.replace(/\w\S*/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    default:
      return content;
  }
}

// ../pptx-primitives/dist/primitives/titleBlock.js
var TITLE_MAX_NATURAL_LINES = 3;
var TITLE_COMPRESSION_STEP = 0.9;
var TITLE_MIN_COMPRESSION = 0.75;
var titleBlock = (input, tokens, region) => {
  const nodes = [];
  let cursor = region.top;
  const eyebrowGap = tokens.spacing.sm;
  const subtitleGap = tokens.spacing.sm;
  const ruleGap = tokens.spacing.md;
  if (input.eyebrow) {
    const { node, consumedHeight } = emitLine(input.eyebrow, "eyebrow", tokens, tokens.palette.accent, { left: region.left, top: cursor, width: region.width });
    nodes.push(node);
    cursor += consumedHeight + eyebrowGap;
  }
  let scale = 1;
  let titleNodeResult = null;
  while (scale >= TITLE_MIN_COMPRESSION - 1e-9) {
    const attempt = layoutTitle(input.title, tokens, scale, {
      left: region.left,
      top: cursor,
      width: region.width
    });
    if (attempt.lines <= TITLE_MAX_NATURAL_LINES) {
      titleNodeResult = attempt;
      break;
    }
    scale = Number((scale - (1 - TITLE_COMPRESSION_STEP)).toFixed(2));
  }
  let overflow = { kind: "fit" };
  if (!titleNodeResult) {
    titleNodeResult = layoutTitle(input.title, tokens, TITLE_MIN_COMPRESSION, {
      left: region.left,
      top: cursor,
      width: region.width
    });
    overflow = {
      kind: "clipped",
      droppedCount: 0,
      reason: `title exceeded ${TITLE_MAX_NATURAL_LINES}-line budget at minimum compression`
    };
  } else if (scale < 1) {
    overflow = { kind: "compressed", scale };
  }
  nodes.push(titleNodeResult.node);
  cursor += titleNodeResult.consumedHeight;
  if (input.subtitle) {
    cursor += subtitleGap;
    const { node, consumedHeight } = emitLine(input.subtitle, "body", tokens, tokens.palette.muted, { left: region.left, top: cursor, width: region.width });
    nodes.push(node);
    cursor += consumedHeight;
  }
  if (tokens.rules.title !== "none") {
    cursor += ruleGap;
    const ruleEmission = emitHorizontalRule(tokens.rules.title, tokens.palette, region.left, cursor, region.width);
    nodes.push(...ruleEmission.nodes);
    cursor += ruleEmission.consumedHeight;
  }
  if (cursor > region.top + region.height + 0.5) {
    if (overflow.kind === "fit" || overflow.kind === "compressed") {
      overflow = {
        kind: "clipped",
        droppedCount: 0,
        reason: `titleBlock consumed ${Math.round(cursor - region.top)}px; region allows ${region.height}px`
      };
    }
  }
  return { nodes, overflow };
};
function layoutTitle(content, tokens, scale, place) {
  const role = tokens.type.title;
  const sizePt = role.size * scale;
  const lineHeightPt = role.lineHeight !== void 0 ? role.lineHeight * scale : sizePt * 1.2;
  const lines = estimateLineCount({
    content,
    family: role.family,
    sizePt,
    letterSpacing: role.letterSpacing,
    uppercase: role.transform === "upper",
    width: place.width
  }, tokens);
  const lineHeightPx = estimateLineHeight(sizePt, lineHeightPt, tokens, role.family);
  const consumedHeight = lineHeightPx * lines;
  const node = {
    kind: "text",
    rect: { left: place.left, top: place.top, width: place.width, height: consumedHeight },
    content: applyTypeTransform(content, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: sizePt,
      lineHeight: lineHeightPt,
      letterSpacing: role.letterSpacing * scale,
      italic: role.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  return { node, consumedHeight, lines };
}
function emitLine(content, role, tokens, color, place) {
  const typeRole = tokens.type[role];
  const lineHeightPx = estimateLineHeight(typeRole.size, typeRole.lineHeight, tokens, typeRole.family);
  const height = lineHeightPx * Math.max(1, estimateLineCount({
    content,
    family: typeRole.family,
    sizePt: typeRole.size,
    letterSpacing: typeRole.letterSpacing,
    uppercase: typeRole.transform === "upper",
    width: place.width
  }, tokens));
  const node = {
    kind: "text",
    rect: { left: place.left, top: place.top, width: place.width, height },
    content: applyTypeTransform(content, typeRole.transform),
    style: {
      family: typeRole.family,
      weight: typeRole.weight,
      size: typeRole.size,
      lineHeight: typeRole.lineHeight,
      letterSpacing: typeRole.letterSpacing,
      italic: typeRole.italic,
      color,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  return { node, consumedHeight: height };
}

// ../pptx-primitives/dist/primitives/bulletList.js
var bulletList = (input, tokens, region) => {
  const { bullet } = tokens.ornament;
  const body = tokens.type.body;
  const nodes = [];
  const startIndex = input.resume?.startIndex ?? 0;
  const betweenItemGap = tokens.spacing.sm;
  let cursor = region.top;
  let placed = startIndex;
  for (let i = startIndex; i < input.items.length; i++) {
    const item = input.items[i];
    const level = Math.min(2, Math.max(1, item.level ?? 1));
    const indent = (level - 1) * bullet.indent;
    const markerStyle = level === 1 ? bullet.marker : bullet.nestedMarker;
    const nativeBullet = tokenBulletConfig(bullet, markerStyle, i + 1);
    const textLeft = nativeBullet ? region.left : region.left + indent + markerWidth(markerStyle, body.size) + bullet.gap;
    const textWidth = region.width - (textLeft - region.left);
    const lines = estimateLineCount({
      content: item.text,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: textWidth
    }, tokens);
    const lineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
    const itemHeight = Math.max(lineHeightPx, lineHeightPx * lines);
    if (cursor + itemHeight > region.top + region.height + 0.5) {
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startIndex: i },
          continuationLabel: `continued (${input.items.length - i} remaining)`
        }
      };
    }
    if (markerStyle !== "none" && !nativeBullet) {
      nodes.push(makeMarker(markerStyle, {
        left: region.left + indent,
        top: cursor,
        size: body.size,
        lineHeight: lineHeightPx,
        color: resolveMarkerColor(bullet.color, tokens),
        sizeRatio: bullet.sizeRatio
      }));
    }
    const textNode = {
      kind: "text",
      rect: { left: textLeft, top: cursor, width: textWidth, height: itemHeight },
      style: {
        family: body.family,
        weight: body.weight,
        size: body.size,
        lineHeight: body.lineHeight,
        letterSpacing: body.letterSpacing,
        italic: body.italic,
        color: level === 1 ? tokens.palette.foreground : tokens.palette.muted,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    if (nativeBullet) {
      textNode.paragraphs = [{
        runs: [{ text: applyTypeTransform(item.text, body.transform) }],
        level: level - 1,
        marginLeft: bullet.indent + bullet.gap,
        hangingIndent: bullet.indent,
        bullet: nativeBullet
      }];
    } else {
      textNode.content = applyTypeTransform(item.text, body.transform);
    }
    nodes.push(textNode);
    cursor += itemHeight + betweenItemGap;
    placed++;
  }
  return {
    nodes,
    overflow: placed === input.items.length ? { kind: "fit" } : { kind: "fit" }
  };
};
function markerWidth(marker, bodySize) {
  switch (marker) {
    case "none":
      return 0;
    case "autoNum":
      return 0;
    case "enDash":
      return bodySize * 0.9;
    case "chevron":
      return bodySize * 0.8;
    case "square":
    case "filledDot":
    case "openDot":
    default:
      return bodySize * 0.7;
  }
}
function tokenBulletConfig(bullet, marker, startAt) {
  if (marker !== "autoNum")
    return void 0;
  return {
    type: "autoNum",
    scheme: bullet.scheme ?? "arabicPeriod",
    startAt
  };
}
function resolveMarkerColor(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
  }
}
function makeMarker(style, p) {
  const markerSize = p.size * p.sizeRatio;
  const centerY = p.top + p.lineHeight * 0.55;
  switch (style) {
    case "filledDot": {
      const d = markerSize * 0.5;
      const node = {
        kind: "view",
        shape: "ellipse",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        fill: p.color
      };
      return node;
    }
    case "openDot": {
      const d = markerSize * 0.6;
      const node = {
        kind: "view",
        shape: "ellipse",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        border: { width: 1, color: p.color, style: "solid" }
      };
      return node;
    }
    case "square": {
      const d = markerSize * 0.45;
      const node = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        fill: p.color
      };
      return node;
    }
    case "enDash": {
      const w = markerSize * 0.8;
      const h = Math.max(1, p.size * 0.08);
      const node = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY - h / 2, width: w, height: h },
        fill: p.color
      };
      return node;
    }
    case "chevron": {
      const h = p.lineHeight;
      const node = {
        kind: "text",
        rect: { left: p.left, top: p.top, width: markerSize, height: h },
        content: "\u203A",
        style: {
          family: "Helvetica Neue",
          weight: 600,
          size: p.size,
          letterSpacing: 0,
          color: p.color,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      };
      return node;
    }
    default: {
      const node = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY, width: 0, height: 0 }
      };
      return node;
    }
  }
}

// ../pptx-primitives/dist/primitives/sectionRibbon.js
var sectionRibbon = (input, tokens, region) => {
  const { headerRibbon } = tokens.chrome;
  if (!headerRibbon.enabled) {
    return { nodes: [], overflow: { kind: "fit" } };
  }
  const nodes = [];
  const fillColor = resolveChromeFill(headerRibbon.fill, tokens);
  const textColor = chromeTextColor(headerRibbon.fill, tokens);
  const bar = {
    kind: "view",
    shape: "rect",
    decorative: false,
    zIndex: 0,
    rect: {
      left: region.left,
      top: region.top,
      width: region.width,
      height: Math.min(region.height, headerRibbon.height)
    },
    fill: fillColor
  };
  nodes.push(bar);
  const typeRole = tokens.type[headerRibbon.type];
  const labelNode = {
    kind: "text",
    zIndex: 1,
    rect: {
      left: region.left + tokens.spacing.md,
      top: region.top,
      width: region.width - tokens.spacing.md * 2,
      height: Math.min(region.height, headerRibbon.height)
    },
    content: applyTypeTransform(input.label, typeRole.transform),
    style: {
      family: typeRole.family,
      weight: typeRole.weight,
      size: typeRole.size,
      lineHeight: typeRole.lineHeight,
      letterSpacing: typeRole.letterSpacing,
      italic: typeRole.italic,
      color: textColor,
      align: headerRibbon.align,
      verticalAlign: "middle"
    },
    autoFit: false
  };
  nodes.push(labelNode);
  return { nodes, overflow: { kind: "fit" } };
};
function resolveChromeFill(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "accent":
      return tokens.palette.accent;
    case "muted":
      return tokens.palette.muted;
    case "surface":
      return tokens.canvas.surface;
  }
}
function chromeTextColor(fillRole, tokens) {
  return fillRole === "surface" ? tokens.palette.foreground : tokens.palette.accentInverse;
}

// ../pptx-primitives/dist/primitives/imageBleed.js
var imageBleed = (input, tokens, region) => {
  const nodes = [];
  if (!tokens.photo.enabled || !input.src) {
    if (input.fallbackText) {
      nodes.push(makeFallbackText(input.fallbackText, tokens, region));
      return { nodes, overflow: { kind: "fit" } };
    }
    return { nodes: [], overflow: { kind: "fit" } };
  }
  const image = {
    kind: "image",
    rect: region,
    src: input.src,
    alt: input.alt,
    crop: input.crop,
    opacity: 1,
    zIndex: 1
  };
  nodes.push(image);
  const scrimColor = resolveScrimColor(tokens.photo.scrim, tokens);
  if (scrimColor !== null && tokens.photo.scrimOpacity > 0) {
    const scrim = {
      kind: "view",
      shape: "rect",
      decorative: true,
      rect: region,
      zIndex: 2,
      // Bake opacity into the hex via alpha channel; engine supports #RRGGBBAA.
      fill: applyAlpha(scrimColor, tokens.photo.scrimOpacity)
    };
    nodes.push(scrim);
  }
  if (input.overlay) {
    const overlayNode = makeOverlayText(input.overlay, tokens, region);
    overlayNode.zIndex = 3;
    nodes.push(overlayNode);
  }
  return { nodes, overflow: { kind: "fit" } };
};
function resolveScrimColor(kind, tokens) {
  switch (kind) {
    case "light":
      return "#FFFFFF";
    case "dark":
      return "#000000";
    case "none":
    default:
      return null;
  }
}
function applyAlpha(color, alpha) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  const hex = a.toString(16).padStart(2, "0");
  if (/^#[0-9a-fA-F]{6}$/u.test(color))
    return `${color}${hex}`;
  if (/^#[0-9a-fA-F]{8}$/u.test(color))
    return `${color.slice(0, 7)}${hex}`;
  return color;
}
function makeFallbackText(content, tokens, region) {
  const role = tokens.type.caption;
  return {
    kind: "text",
    rect: region,
    content: applyTypeTransform(content, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.faint,
      align: "center",
      verticalAlign: "middle"
    },
    autoFit: false
  };
}
function makeOverlayText(overlay, tokens, region) {
  const roleKey = overlay.role ?? "display";
  const role = tokens.type[roleKey];
  return {
    kind: "text",
    rect: region,
    content: applyTypeTransform(overlay.text, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.accentInverse,
      align: overlay.align ?? "center",
      verticalAlign: overlay.verticalAlign ?? "middle"
    },
    autoFit: false
  };
}

// ../pptx-primitives/dist/primitives/matrixTable.js
function isTextRunArray(value) {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && "text" in value[0];
}
function isParagraphArray(value) {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && "runs" in value[0];
}
function flattenLabel(label, transform) {
  if (typeof label === "string")
    return applyTypeTransform(label, transform);
  if (isParagraphArray(label)) {
    const text = label.map((p) => flattenRuns(p.runs)).join(" ");
    return applyTypeTransform(text, transform);
  }
  if (isTextRunArray(label)) {
    return applyTypeTransform(flattenRuns(label), transform);
  }
  return "";
}
function resolveLabelFillColor(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "muted":
    default:
      return tokens.palette.muted;
  }
}
var HEADER_PAD = 6;
var matrixTable = (input, tokens, region) => {
  const nodes = [];
  const colCount = input.columnHeaders?.length ?? Math.max(1, ...input.rows.map((r) => r.cells.length + 1));
  const labelRatio = input.labelColumnWidthRatio ?? 0.2;
  const labelWidth = input.rowLabelWidth ?? Math.max(120, region.width * labelRatio);
  const labelStyle = input.rowLabelStyle ?? (looksFillable(tokens) ? "filled" : "plain");
  const dataColCount = colCount - 1;
  const dataAreaWidth = region.width - labelWidth;
  const cellGapX = 0;
  const perDataColWidth = dataColCount > 0 ? dataAreaWidth / dataColCount : 0;
  if (dataAreaWidth <= 0 || perDataColWidth - HEADER_PAD * 2 < 0 || labelWidth - HEADER_PAD * 2 < 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: input.rows.length,
        reason: `region too narrow for ${colCount}-column matrixTable`
      }
    };
  }
  const dataColLayout = [];
  const useWeights = Array.isArray(input.colW) && input.colW.length === dataColCount && dataColCount > 0;
  if (useWeights) {
    const weights = input.colW;
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    let runningLeft = region.left + labelWidth;
    for (let i = 0; i < dataColCount; i++) {
      const colWidth = dataAreaWidth * weights[i] / sumWeights;
      dataColLayout.push({
        left: runningLeft,
        width: colWidth - cellGapX
      });
      runningLeft += colWidth;
    }
  } else {
    for (let i = 0; i < dataColCount; i++) {
      dataColLayout.push({
        left: region.left + labelWidth + dataAreaWidth / dataColCount * i,
        width: dataAreaWidth / dataColCount - cellGapX
      });
    }
  }
  let cursor = region.top;
  if (input.columnHeaders && input.columnHeaders.length > 0) {
    const headerHeight = estimateLineHeight(tokens.type.title.size, tokens.type.title.lineHeight, tokens, tokens.type.title.family) + HEADER_PAD * 2;
    const rowLabelHeader = input.columnHeaders[0];
    if (rowLabelHeader) {
      nodes.push(makeHeaderText(rowLabelHeader, tokens, {
        left: region.left + HEADER_PAD,
        top: cursor + HEADER_PAD,
        width: labelWidth - HEADER_PAD * 2,
        height: headerHeight - HEADER_PAD * 2
      }));
    }
    for (let i = 0; i < dataColCount; i++) {
      const col = dataColLayout[i];
      const text = input.columnHeaders[i + 1];
      const overrideRole = input.columnHeaderFills?.[i + 1] ?? null;
      const fillColor = overrideRole === "foreground" ? tokens.palette.foreground : overrideRole === "muted" ? tokens.palette.muted : overrideRole === "accentSecondary" ? tokens.palette.accentSecondary ?? tokens.palette.accent : tokens.palette.accent;
      if (labelStyle === "filled") {
        const fill = {
          kind: "view",
          shape: "rect",
          decorative: true,
          zIndex: 0,
          rect: { left: col.left, top: cursor, width: col.width, height: headerHeight },
          fill: fillColor
        };
        nodes.push(fill);
      }
      if (text) {
        const textNode = makeHeaderText(text, tokens, {
          left: col.left + HEADER_PAD,
          top: cursor + HEADER_PAD,
          width: col.width - HEADER_PAD * 2,
          height: headerHeight - HEADER_PAD * 2
        });
        if (labelStyle === "filled") {
          textNode.style.color = tokens.palette.accentInverse;
          textNode.style.align = "center";
          textNode.zIndex = 1;
        }
        nodes.push(textNode);
      }
    }
    cursor += headerHeight;
    if (labelStyle === "plain") {
      const ruleEmission = emitHorizontalRule(tokens.rules.section !== "none" ? tokens.rules.section : tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
      nodes.push(...ruleEmission.nodes);
      cursor += ruleEmission.consumedHeight;
    }
  }
  const startIndex = input.resume?.startRowIndex ?? 0;
  const rowHeightPlan = planBodyRowHeights(input, tokens, labelWidth, dataColLayout, startIndex, cursor, region);
  let placedRowCount = 0;
  for (let r = startIndex; r < input.rows.length; r++) {
    const row = input.rows[r];
    const rowHeight = rowHeightPlan.get(r) ?? computePlannedRowHeight(row, input, tokens, labelWidth, dataColLayout);
    if (process.env.RUNSTAMP_DEBUG_MATRIX) {
      console.error(`[matrixTable] row ${r} "${row.label}" height=${rowHeight} cursor=${cursor} limit=${region.top + region.height}`);
    }
    if (cursor + rowHeight > region.top + region.height + 0.5) {
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startRowIndex: r },
          continuationLabel: `continued (${input.rows.length - r} rows remaining)`
        }
      };
    }
    if (labelStyle === "filled") {
      const fill = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 0,
        rect: { left: region.left, top: cursor, width: labelWidth, height: rowHeight },
        fill: resolveLabelFillColor(row.labelFill ?? "muted", tokens)
      };
      nodes.push(fill);
    }
    {
      const rotation = input.rowLabelRotation ?? 0;
      const isVertical = rotation === 90 || rotation === -90;
      const labelRect = {
        left: region.left + HEADER_PAD,
        top: cursor + HEADER_PAD,
        width: labelWidth - HEADER_PAD * 2,
        height: rowHeight - HEADER_PAD * 2
      };
      nodes.push(makeRowLabel(row.label, tokens, labelRect, labelStyle, isVertical));
    }
    if (row.accent) {
      const tick = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: labelStyle === "filled" ? 2 : 1,
        rect: { left: region.left, top: cursor + 4, width: 2, height: rowHeight - 8 },
        fill: tokens.palette.accent
      };
      nodes.push(tick);
    }
    for (let c = 0; c < dataColCount; c++) {
      const col = dataColLayout[c];
      const cellContent = row.cells[c];
      if (cellContent === void 0 || cellContent === null)
        continue;
      nodes.push(...makeCellContent(cellContent, tokens, {
        left: col.left + HEADER_PAD,
        top: cursor + HEADER_PAD,
        width: col.width - HEADER_PAD * 2,
        height: rowHeight - HEADER_PAD * 2
      }, input.wrapPolicy ?? "wrap"));
    }
    cursor += rowHeight;
    placedRowCount++;
    if (r < input.rows.length - 1) {
      const ruleEmission = emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
      nodes.push(...ruleEmission.nodes);
      cursor += ruleEmission.consumedHeight;
    }
  }
  return {
    nodes,
    overflow: { kind: "fit" }
  };
};
function dividerHeight(tokens, region) {
  return emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, region.top, region.width).consumedHeight;
}
function computePlannedRowHeight(row, input, tokens, labelWidth, cols) {
  const natural = computeRowHeight(row, tokens, labelWidth, cols, input.rowLabelRotation ?? 0);
  return Math.max(natural, input.rowHeight ?? 0, input.minRowHeight ?? 0);
}
function planBodyRowHeights(input, tokens, labelWidth, cols, startIndex, bodyTop, region) {
  const planned = /* @__PURE__ */ new Map();
  const rows = input.rows.slice(startIndex);
  if (rows.length === 0)
    return planned;
  for (let index = 0; index < rows.length; index++) {
    const absoluteIndex = startIndex + index;
    planned.set(absoluteIndex, computePlannedRowHeight(rows[index], input, tokens, labelWidth, cols));
  }
  if (!input.distributeRows)
    return planned;
  const dividersTotal = Math.max(0, rows.length - 1) * dividerHeight(tokens, region);
  const available = region.top + region.height - bodyTop - dividersTotal;
  const current = Array.from(planned.values()).reduce((sum, height) => sum + height, 0);
  const extra = available - current;
  if (extra <= 0)
    return planned;
  const addPerRow = extra / rows.length;
  for (const [index, height] of planned.entries()) {
    planned.set(index, height + addPerRow);
  }
  return planned;
}
function looksFillable(tokens) {
  return luminance(tokens.palette.accent) < 0.55;
}
function luminance(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{6})/u);
  if (!m)
    return 0.5;
  const v = parseInt(m[1], 16);
  const r = v >> 16 & 255;
  const g = v >> 8 & 255;
  const b = v & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function makeHeaderText(content, tokens, rect) {
  const role = tokens.type.title;
  return {
    kind: "text",
    rect,
    content: applyTypeTransform(content, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: Math.min(role.size, 14),
      // header text is smaller than slide titles
      lineHeight: role.lineHeight !== void 0 ? Math.min(role.lineHeight, 18) : void 0,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "middle"
    },
    autoFit: false
  };
}
function makeRowLabel(content, tokens, rect, labelStyle, isVertical) {
  const role = tokens.type.caption;
  const sizePt = isVertical ? role.size : Math.max(role.size, 11);
  const lineHeightPt = role.lineHeight !== void 0 ? isVertical ? role.lineHeight : Math.max(role.lineHeight, 14) : void 0;
  const node = {
    kind: "text",
    zIndex: labelStyle === "filled" ? 1 : void 0,
    rect,
    style: {
      family: role.family,
      weight: 700,
      size: sizePt,
      lineHeight: lineHeightPt,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: labelStyle === "filled" ? tokens.palette.accentInverse : tokens.palette.foreground,
      align: isVertical ? "center" : "left",
      verticalAlign: "middle",
      ...isVertical ? { textDirection: "vertical" } : {}
    },
    autoFit: false
  };
  if (typeof content === "string") {
    node.content = applyTypeTransform(content, role.transform);
  } else if (isParagraphArray(content)) {
    node.paragraphs = content;
  } else if (isTextRunArray(content)) {
    node.runs = content;
  } else {
    node.content = "";
  }
  return node;
}
function truncateToWidth(text, width, family, sizePt, letterSpacing3, tokens) {
  const fullWidth = estimateTextWidth({ content: text, family, sizePt, letterSpacing: letterSpacing3 }, tokens);
  if (fullWidth <= width)
    return text;
  const ellipsis = "\u2026";
  const ellipsisWidth = estimateTextWidth({ content: ellipsis, family, sizePt, letterSpacing: letterSpacing3 }, tokens);
  const budget2 = Math.max(0, width - ellipsisWidth);
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    const w = estimateTextWidth({ content: text.slice(0, mid), family, sizePt, letterSpacing: letterSpacing3 }, tokens);
    if (w <= budget2)
      lo = mid;
    else
      hi = mid - 1;
  }
  if (lo <= 0)
    return ellipsis;
  return text.slice(0, lo).trimEnd() + ellipsis;
}
function shrinkToFit(text, width, family, baseSizePt, letterSpacing3, tokens, floorPt = 8) {
  if (estimateTextWidth({ content: text, family, sizePt: baseSizePt, letterSpacing: letterSpacing3 }, tokens) <= width) {
    return baseSizePt;
  }
  let size = baseSizePt;
  while (size > floorPt) {
    size = Math.max(floorPt, size - 0.5);
    const w = estimateTextWidth({ content: text, family, sizePt: size, letterSpacing: letterSpacing3 }, tokens);
    if (w <= width)
      return size;
  }
  return floorPt;
}
function makeCellContent(content, tokens, rect, wrapPolicy = "wrap") {
  const role = tokens.type.body;
  const lineHeightPx = estimateLineHeight(role.size, role.lineHeight, tokens, role.family);
  if (typeof content === "string") {
    let displayText = applyTypeTransform(content, role.transform);
    let displaySize = role.size;
    if (wrapPolicy === "ellipsis") {
      displayText = truncateToWidth(displayText, rect.width, role.family, role.size, role.letterSpacing, tokens);
    } else if (wrapPolicy === "shrink") {
      displaySize = shrinkToFit(displayText, rect.width, role.family, role.size, role.letterSpacing, tokens);
      const w = estimateTextWidth({ content: displayText, family: role.family, sizePt: displaySize, letterSpacing: role.letterSpacing }, tokens);
      if (w > rect.width) {
        displayText = truncateToWidth(displayText, rect.width, role.family, displaySize, role.letterSpacing, tokens);
      }
    }
    return [
      {
        kind: "text",
        rect,
        content: displayText,
        style: {
          family: role.family,
          weight: role.weight,
          size: displaySize,
          lineHeight: role.lineHeight,
          letterSpacing: role.letterSpacing,
          italic: role.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      }
    ];
  }
  if (isParagraphArray(content)) {
    return [
      {
        kind: "text",
        rect,
        paragraphs: content,
        style: {
          family: role.family,
          weight: role.weight,
          size: role.size,
          lineHeight: role.lineHeight,
          letterSpacing: role.letterSpacing,
          italic: role.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      }
    ];
  }
  if (isTextRunArray(content)) {
    let transformedRuns = role.transform === "upper" ? content.map((r) => ({ ...r, text: r.text.toUpperCase() })) : role.transform === "lower" ? content.map((r) => ({ ...r, text: r.text.toLowerCase() })) : content;
    let displaySize = role.size;
    if (wrapPolicy === "ellipsis" || wrapPolicy === "shrink") {
      const concatText = transformedRuns.map((r) => r.text).join("");
      if (wrapPolicy === "shrink") {
        displaySize = shrinkToFit(concatText, rect.width, role.family, role.size, role.letterSpacing, tokens);
      }
      const fitWidth = estimateTextWidth({ content: concatText, family: role.family, sizePt: displaySize, letterSpacing: role.letterSpacing }, tokens);
      if (fitWidth > rect.width) {
        const truncated = truncateToWidth(concatText, rect.width, role.family, displaySize, role.letterSpacing, tokens);
        const out = [];
        let consumed = 0;
        for (const run of transformedRuns) {
          const remaining = truncated.length - consumed;
          if (remaining <= 0)
            break;
          if (run.text.length <= remaining) {
            out.push(run);
            consumed += run.text.length;
          } else {
            out.push({ ...run, text: truncated.slice(consumed) });
            consumed = truncated.length;
            break;
          }
        }
        transformedRuns = out;
      }
    }
    return [
      {
        kind: "text",
        rect,
        runs: transformedRuns,
        style: {
          family: role.family,
          weight: role.weight,
          size: displaySize,
          lineHeight: role.lineHeight,
          letterSpacing: role.letterSpacing,
          italic: role.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      }
    ];
  }
  const nodes = [];
  let y = rect.top;
  const itemGap = tokens.spacing.xs;
  for (const line of content) {
    const lines = estimateLineCount({
      content: `\u2022 ${line}`,
      family: role.family,
      sizePt: role.size,
      letterSpacing: role.letterSpacing,
      width: rect.width
    }, tokens);
    const h = lineHeightPx * lines;
    nodes.push({
      kind: "text",
      rect: { left: rect.left, top: y, width: rect.width, height: h },
      content: `\u2022 ${applyTypeTransform(line, role.transform)}`,
      style: {
        family: role.family,
        weight: role.weight,
        size: role.size,
        lineHeight: role.lineHeight,
        letterSpacing: role.letterSpacing,
        italic: role.italic,
        color: tokens.palette.foreground,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    });
    y += h + itemGap;
    if (y > rect.top + rect.height)
      break;
  }
  return nodes;
}
function computeRowHeight(row, tokens, labelWidth, cols, labelRotation = 0) {
  const role = tokens.type.body;
  const lineHeightPx = estimateLineHeight(role.size, role.lineHeight, tokens, role.family);
  const isVertical = labelRotation === 90 || labelRotation === -90;
  const labelSize = isVertical ? tokens.type.caption.size : Math.max(tokens.type.caption.size, 11);
  const labelLineHeightPx = estimateLineHeight(labelSize, tokens.type.caption.lineHeight, tokens, tokens.type.caption.family);
  const labelText = flattenLabel(row.label, tokens.type.caption.transform);
  const labelParas = isParagraphArray(row.label) ? row.label : null;
  let labelHeight;
  if (isVertical) {
    const textW = estimateTextWidth({
      content: labelText,
      family: tokens.type.caption.family,
      sizePt: labelSize,
      letterSpacing: tokens.type.caption.letterSpacing
    }, tokens);
    const linesAvailable = Math.max(1, Math.floor((labelWidth - HEADER_PAD * 2) / labelLineHeightPx));
    labelHeight = Math.ceil(textW / linesAvailable) + HEADER_PAD * 2;
  } else if (labelParas) {
    let total = HEADER_PAD * 2;
    for (const para of labelParas) {
      const text = flattenRuns(para.runs);
      const lines = text.length === 0 ? 1 : estimateLineCount({
        content: text,
        family: tokens.type.caption.family,
        sizePt: labelSize,
        letterSpacing: tokens.type.caption.letterSpacing,
        width: labelWidth - HEADER_PAD * 2
      }, tokens);
      total += labelLineHeightPx * lines + (para.spaceAfter ?? 0);
    }
    labelHeight = total;
  } else {
    const labelLines = estimateLineCount({
      content: labelText,
      family: tokens.type.caption.family,
      sizePt: labelSize,
      letterSpacing: tokens.type.caption.letterSpacing,
      width: labelWidth - HEADER_PAD * 2
    }, tokens);
    labelHeight = labelLineHeightPx * labelLines + HEADER_PAD * 2;
  }
  let cellMaxHeight = 0;
  row.cells.forEach((cell, ci) => {
    const col = cols[ci];
    if (!col)
      return;
    const innerWidth = col.width - HEADER_PAD * 2;
    if (typeof cell === "string") {
      const lines = estimateLineCount({
        content: cell,
        family: role.family,
        sizePt: role.size,
        letterSpacing: role.letterSpacing,
        width: innerWidth
      }, tokens);
      cellMaxHeight = Math.max(cellMaxHeight, lineHeightPx * lines + HEADER_PAD * 2);
    } else if (isParagraphArray(cell)) {
      let total = HEADER_PAD * 2;
      for (const para of cell) {
        const explicitIndent = para.indent ?? para.marginLeft;
        const indentPx = explicitIndent !== void 0 ? explicitIndent : Math.max(0, (para.level ?? 0) * 14);
        const wrapWidth = Math.max(20, innerWidth - indentPx);
        const text = flattenRuns(para.runs);
        const lines = text.length === 0 ? 1 : estimateLineCount({
          content: text,
          family: role.family,
          sizePt: role.size,
          letterSpacing: role.letterSpacing,
          width: wrapWidth
        }, tokens);
        total += lineHeightPx * lines + (para.spaceAfter ?? 0);
      }
      cellMaxHeight = Math.max(cellMaxHeight, total);
    } else if (isTextRunArray(cell)) {
      const lines = estimateLineCount({
        content: flattenRuns(cell),
        family: role.family,
        sizePt: role.size,
        letterSpacing: role.letterSpacing,
        width: innerWidth
      }, tokens);
      cellMaxHeight = Math.max(cellMaxHeight, lineHeightPx * lines + HEADER_PAD * 2);
    } else if (Array.isArray(cell)) {
      const itemGap = tokens.spacing.xs;
      let total = HEADER_PAD * 2;
      for (const line of cell) {
        const lines = estimateLineCount({
          content: `\u2022 ${line}`,
          family: role.family,
          sizePt: role.size,
          letterSpacing: role.letterSpacing,
          width: innerWidth
        }, tokens);
        total += lineHeightPx * lines + itemGap;
      }
      cellMaxHeight = Math.max(cellMaxHeight, total);
    }
  });
  const minHeight = lineHeightPx + HEADER_PAD * 2;
  return Math.max(minHeight, labelHeight, cellMaxHeight);
}

// ../pptx-primitives/dist/primitives/kpiHero.js
var VALUE_MIN_COMPRESSION = 0.8;
var VALUE_COMPRESSION_STEP = 0.05;
var kpiHero = (input, tokens, region) => {
  const nodes = [];
  const eyebrow = tokens.type.eyebrow;
  const eyebrowHeight = estimateLineHeight(eyebrow.size, eyebrow.lineHeight, tokens, eyebrow.family);
  const display = tokens.type.display;
  let valueScale = 1;
  let valueWidth = estimateValueWidth(input.value, display.family, display.size, display.letterSpacing, tokens);
  while (valueWidth > region.width && valueScale > VALUE_MIN_COMPRESSION - 1e-9) {
    valueScale = Number((valueScale - VALUE_COMPRESSION_STEP).toFixed(2));
    valueWidth = estimateValueWidth(input.value, display.family, display.size * valueScale, display.letterSpacing * valueScale, tokens);
  }
  const valueSizePt = display.size * valueScale;
  const valueLineHeightPt = display.lineHeight !== void 0 ? display.lineHeight * valueScale : valueSizePt * 1.05;
  const valueLineHeightPx = estimateLineHeight(valueSizePt, valueLineHeightPt, tokens, display.family);
  const caption = tokens.type.caption;
  const captionHeight = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
  const bodyRole = tokens.type.body;
  const bodyLineHeightPx = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  const supportLines = input.support ? estimateLineCount({
    content: input.support,
    family: bodyRole.family,
    sizePt: bodyRole.size,
    letterSpacing: bodyRole.letterSpacing,
    width: region.width
  }, tokens) : 0;
  const supportHeight = supportLines * bodyLineHeightPx;
  let blockHeight = eyebrowHeight + tokens.spacing.sm + valueLineHeightPx;
  if (input.delta)
    blockHeight += tokens.spacing.sm + captionHeight;
  if (input.support)
    blockHeight += tokens.spacing.sm + supportHeight;
  const verticalAlign = input.verticalAlign ?? "center";
  let cursor = verticalAlign === "center" ? region.top + Math.max(0, (region.height - blockHeight) / 2) : region.top;
  const labelNode = {
    kind: "text",
    rect: {
      left: region.left,
      top: cursor,
      width: region.width,
      height: eyebrowHeight
    },
    content: applyTypeTransform(input.label, eyebrow.transform),
    style: {
      family: eyebrow.family,
      weight: eyebrow.weight,
      size: eyebrow.size,
      lineHeight: eyebrow.lineHeight,
      letterSpacing: eyebrow.letterSpacing,
      italic: eyebrow.italic,
      color: tokens.palette.accent,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  nodes.push(labelNode);
  cursor += eyebrowHeight + tokens.spacing.sm;
  const valueNode = {
    kind: "text",
    rect: {
      left: region.left,
      top: cursor,
      width: region.width,
      height: valueLineHeightPx
    },
    content: applyTypeTransform(input.value, display.transform),
    style: {
      family: display.family,
      weight: display.weight,
      size: valueSizePt,
      lineHeight: valueLineHeightPt,
      letterSpacing: display.letterSpacing * valueScale,
      italic: display.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  nodes.push(valueNode);
  cursor += valueLineHeightPx;
  if (input.delta) {
    cursor += tokens.spacing.sm;
    const trend = input.trend ?? "flat";
    const deltaColor = trend === "up" ? tokens.palette.accent : trend === "down" ? tokens.palette.muted : tokens.palette.faint;
    const deltaNode = {
      kind: "text",
      rect: {
        left: region.left,
        top: cursor,
        width: region.width,
        height: captionHeight
      },
      content: applyTypeTransform(input.delta, caption.transform),
      style: {
        family: caption.family,
        weight: caption.weight,
        size: Math.max(caption.size, 11),
        lineHeight: caption.lineHeight,
        letterSpacing: caption.letterSpacing,
        italic: caption.italic,
        color: deltaColor,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(deltaNode);
    cursor += captionHeight;
  }
  if (input.support) {
    cursor += tokens.spacing.sm;
    const supportNode = {
      kind: "text",
      rect: {
        left: region.left,
        top: cursor,
        width: region.width,
        height: supportHeight
      },
      content: applyTypeTransform(input.support, bodyRole.transform),
      style: {
        family: bodyRole.family,
        weight: bodyRole.weight,
        size: bodyRole.size,
        lineHeight: bodyRole.lineHeight,
        letterSpacing: bodyRole.letterSpacing,
        italic: bodyRole.italic,
        color: tokens.palette.muted,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(supportNode);
    cursor += supportHeight;
  }
  const regionBottom = region.top + region.height + 0.5;
  const overflowKind = cursor > regionBottom ? {
    kind: "clipped",
    droppedCount: 0,
    reason: `kpiHero content exceeds region height (${Math.round(blockHeight)}px > ${region.height}px)`
  } : valueScale < 1 ? { kind: "compressed", scale: valueScale } : { kind: "fit" };
  return { nodes, overflow: overflowKind };
};
function estimateValueWidth(value, family, sizePt, letterSpacing3, tokens) {
  return estimateTextWidth({
    content: value,
    family,
    sizePt,
    letterSpacing: letterSpacing3,
    digitsOnly: /^[\d,.\s$%+\-↑↓→]+$/u.test(value)
  }, tokens);
}

// ../pptx-primitives/dist/primitives/metricStack.js
var VALUE_MIN_COMPRESSION2 = 0.85;
var VALUE_COMPRESSION_STEP2 = 0.05;
var metricStack = (input, tokens, region) => {
  const nodes = [];
  let cursor = region.top;
  const startIndex = input.resume?.startIndex ?? 0;
  let placedCount = 0;
  let worstScale = 1;
  for (let i = startIndex; i < input.rows.length; i++) {
    const row = input.rows[i];
    const rowResult = layoutRow(row, tokens, {
      left: region.left,
      top: cursor,
      width: region.width
    });
    const rowEnd = cursor + rowResult.consumedHeight;
    const ruleHeightAfter = i < input.rows.length - 1 && tokens.rules.divider !== "none" ? estimateRuleHeight(tokens) : 0;
    if (rowEnd + ruleHeightAfter > region.top + region.height + 0.5) {
      if (placedCount === 0) {
        nodes.push(...rowResult.nodes);
        return {
          nodes,
          overflow: {
            kind: "clipped",
            droppedCount: input.rows.length - i - 1,
            reason: `metricStack row ${i} is taller than the region; ${input.rows.length - i - 1} subsequent rows dropped`
          }
        };
      }
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startIndex: i },
          continuationLabel: `continued (${input.rows.length - i} metrics remaining)`
        }
      };
    }
    nodes.push(...rowResult.nodes);
    cursor = rowEnd;
    placedCount++;
    if (rowResult.scale < worstScale)
      worstScale = rowResult.scale;
    if (i < input.rows.length - 1) {
      cursor += tokens.spacing.sm;
      const divider = emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
      nodes.push(...divider.nodes);
      cursor += divider.consumedHeight + tokens.spacing.sm;
    }
  }
  return {
    nodes,
    overflow: worstScale < 1 ? { kind: "compressed", scale: worstScale } : { kind: "fit" }
  };
};
function layoutRow(row, tokens, place) {
  const nodes = [];
  let cursor = place.top;
  const caption = tokens.type.caption;
  const labelHeight = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
  const labelNode = {
    kind: "text",
    rect: { left: place.left, top: cursor, width: place.width, height: labelHeight },
    content: applyTypeTransform(row.label, caption.transform),
    style: {
      family: caption.family,
      weight: caption.weight,
      size: caption.size,
      lineHeight: caption.lineHeight,
      letterSpacing: caption.letterSpacing,
      italic: caption.italic,
      color: tokens.palette.muted,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  nodes.push(labelNode);
  cursor += labelHeight + tokens.spacing.xs;
  const valueRole = tokens.type.title;
  let scale = 1;
  let valueWidth = estimateTextWidth({
    content: row.value,
    family: valueRole.family,
    sizePt: valueRole.size,
    letterSpacing: valueRole.letterSpacing,
    digitsOnly: /^[\d,.\s$%+\-]+$/u.test(row.value)
  }, tokens);
  while (valueWidth > place.width && scale > VALUE_MIN_COMPRESSION2 - 1e-9) {
    scale = Number((scale - VALUE_COMPRESSION_STEP2).toFixed(2));
    valueWidth = estimateTextWidth({
      content: row.value,
      family: valueRole.family,
      sizePt: valueRole.size * scale,
      letterSpacing: valueRole.letterSpacing * scale,
      digitsOnly: /^[\d,.\s$%+\-]+$/u.test(row.value)
    }, tokens);
  }
  const valueSizePt = valueRole.size * scale;
  const valueLineHeightPt = valueRole.lineHeight !== void 0 ? valueRole.lineHeight * scale : valueSizePt * 1.15;
  const valueLineHeightPx = estimateLineHeight(valueSizePt, valueLineHeightPt, tokens, valueRole.family);
  const valueNode = {
    kind: "text",
    rect: { left: place.left, top: cursor, width: place.width, height: valueLineHeightPx },
    content: applyTypeTransform(row.value, valueRole.transform),
    style: {
      family: valueRole.family,
      weight: valueRole.weight,
      size: valueSizePt,
      lineHeight: valueLineHeightPt,
      letterSpacing: valueRole.letterSpacing * scale,
      italic: valueRole.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  nodes.push(valueNode);
  cursor += valueLineHeightPx;
  if (row.delta) {
    cursor += tokens.spacing.xs;
    const deltaCaption = tokens.type.caption;
    const deltaHeight = estimateLineHeight(deltaCaption.size, deltaCaption.lineHeight, tokens, deltaCaption.family);
    const trend = row.trend ?? "flat";
    const deltaColor = trend === "up" ? tokens.palette.accent : trend === "down" ? tokens.palette.muted : tokens.palette.faint;
    nodes.push({
      kind: "text",
      rect: { left: place.left, top: cursor, width: place.width, height: deltaHeight },
      content: applyTypeTransform(row.delta, deltaCaption.transform),
      style: {
        family: deltaCaption.family,
        weight: deltaCaption.weight,
        size: Math.max(deltaCaption.size, 10),
        lineHeight: deltaCaption.lineHeight,
        letterSpacing: deltaCaption.letterSpacing,
        italic: deltaCaption.italic,
        color: deltaColor,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    });
    cursor += deltaHeight;
  }
  return {
    nodes,
    consumedHeight: cursor - place.top,
    scale
  };
}
function estimateRuleHeight(tokens) {
  if (tokens.rules.divider === "none")
    return 0;
  const m = tokens.rules.divider.matchAll(/(\d+(?:\.\d+)?)px/gu);
  let total = 0;
  for (const match of m)
    total += Number(match[1]);
  return total;
}

// ../pptx-primitives/dist/primitives/comparisonBand.js
var ROW_PAD_Y = 12;
var ROW_PAD_X = 12;
var comparisonBand = (input, tokens, region) => {
  const nodes = [];
  const colCount = input.columns.length;
  const labelRatio = input.labelColumnWidthRatio ?? 0.22;
  const labelColWidth = region.width * labelRatio;
  const valueColCount = Math.max(1, colCount - 1);
  const valueColWidth = (region.width - labelColWidth) / valueColCount;
  if (valueColWidth - ROW_PAD_X * 2 < 0 || labelColWidth - ROW_PAD_X * 2 < 0 || region.height < ROW_PAD_Y * 2) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: input.rows.length,
        reason: `region too narrow for ${colCount}-column comparisonBand`
      }
    };
  }
  const columnLeft = (idx) => idx === 0 ? region.left : region.left + labelColWidth + (idx - 1) * valueColWidth;
  const columnWidth = (idx) => idx === 0 ? labelColWidth : valueColWidth;
  let cursor = region.top;
  const caption = tokens.type.caption;
  const headerHeight = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family) + ROW_PAD_Y;
  for (let c = 0; c < colCount; c++) {
    const headerText = input.columns[c];
    if (!headerText)
      continue;
    const node = {
      kind: "text",
      rect: {
        left: columnLeft(c) + ROW_PAD_X,
        top: cursor,
        width: columnWidth(c) - ROW_PAD_X * 2,
        height: headerHeight
      },
      content: applyTypeTransform(headerText, caption.transform === "none" ? "upper" : caption.transform),
      style: {
        family: caption.family,
        weight: 700,
        size: Math.max(caption.size, 10),
        lineHeight: caption.lineHeight,
        letterSpacing: Math.max(caption.letterSpacing, 1.2),
        italic: caption.italic,
        color: tokens.palette.muted,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(node);
  }
  cursor += headerHeight;
  const headerRule = emitHorizontalRule(tokens.rules.section !== "none" ? tokens.rules.section : tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
  nodes.push(...headerRule.nodes);
  cursor += headerRule.consumedHeight + tokens.spacing.sm;
  const startIndex = input.resume?.startRowIndex ?? 0;
  for (let r = startIndex; r < input.rows.length; r++) {
    const row = input.rows[r];
    const rowHeight = computeRowHeight2(row, tokens, labelColWidth, valueColWidth);
    if (cursor + rowHeight > region.top + region.height + 0.5) {
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startRowIndex: r },
          continuationLabel: `continued (${input.rows.length - r} rows remaining)`
        }
      };
    }
    if (row.accent) {
      const tick = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 1,
        rect: { left: region.left, top: cursor + 4, width: 2, height: rowHeight - 8 },
        fill: tokens.palette.accent
      };
      nodes.push(tick);
    }
    const body = tokens.type.body;
    const lineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
    const labelLines = estimateLineCount({
      content: row.label,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: labelColWidth - ROW_PAD_X * 2
    }, tokens);
    const labelNode = {
      kind: "text",
      rect: {
        left: region.left + ROW_PAD_X,
        top: cursor + ROW_PAD_Y / 2,
        width: labelColWidth - ROW_PAD_X * 2,
        height: lineHeightPx * labelLines
      },
      content: applyTypeTransform(row.label, body.transform),
      style: {
        family: body.family,
        weight: row.accent ? 700 : 500,
        size: body.size,
        lineHeight: body.lineHeight,
        letterSpacing: body.letterSpacing,
        italic: body.italic,
        color: tokens.palette.foreground,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(labelNode);
    for (let c = 0; c < row.values.length; c++) {
      const value = row.values[c];
      const colIndex = c + 1;
      if (colIndex >= colCount)
        break;
      const lines = estimateLineCount({
        content: value,
        family: body.family,
        sizePt: body.size,
        letterSpacing: body.letterSpacing,
        width: valueColWidth - ROW_PAD_X * 2
      }, tokens);
      const valueNode = {
        kind: "text",
        rect: {
          left: columnLeft(colIndex) + ROW_PAD_X,
          top: cursor + ROW_PAD_Y / 2,
          width: valueColWidth - ROW_PAD_X * 2,
          height: lineHeightPx * lines
        },
        content: applyTypeTransform(value, body.transform),
        style: {
          family: body.family,
          weight: body.weight,
          size: body.size,
          lineHeight: body.lineHeight,
          letterSpacing: body.letterSpacing,
          italic: body.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      };
      nodes.push(valueNode);
    }
    cursor += rowHeight;
    if (r < input.rows.length - 1) {
      const divider = emitHorizontalRule(tokens.rules.divider, tokens.palette, region.left, cursor, region.width);
      nodes.push(...divider.nodes);
      cursor += divider.consumedHeight;
    }
  }
  return { nodes, overflow: { kind: "fit" } };
};
function computeRowHeight2(row, tokens, labelColWidth, valueColWidth) {
  const body = tokens.type.body;
  const lineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
  let maxLines = 1;
  const labelLines = estimateLineCount({
    content: row.label,
    family: body.family,
    sizePt: body.size,
    letterSpacing: body.letterSpacing,
    width: labelColWidth - ROW_PAD_X * 2
  }, tokens);
  if (labelLines > maxLines)
    maxLines = labelLines;
  const valueInnerWidth = valueColWidth - ROW_PAD_X * 2;
  for (const v of row.values) {
    const l = estimateLineCount({
      content: v,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: valueInnerWidth
    }, tokens);
    if (l > maxLines)
      maxLines = l;
  }
  return lineHeightPx * maxLines + ROW_PAD_Y;
}

// ../pptx-primitives/dist/primitives/stepTimeline.js
var MARKER_BREATHING_ROOM = 4;
var PLAIN_DOT_RADIUS = 5;
var CIRCLED_MARKER_RADIUS = 16;
var stepTimeline = (input, tokens, region) => {
  const nodes = [];
  const stepCount = input.steps.length;
  if (stepCount === 0)
    return { nodes, overflow: { kind: "fit" } };
  const colWidth = region.width / stepCount;
  const railY = region.top + region.height * 0.3;
  const markerStyle = tokens.ornament.stepMarker.style;
  const markerRadius = markerStyle === "circleNumeric" || markerStyle === "serifCircled" ? CIRCLED_MARKER_RADIUS : PLAIN_DOT_RADIUS;
  const railVerticalPadding = markerRadius + MARKER_BREATHING_ROOM;
  const rule = emitHorizontalRule(tokens.rules.divider !== "none" ? tokens.rules.divider : "1px solid token:rule", tokens.palette, region.left, railY, region.width);
  nodes.push(...rule.nodes);
  const titleRole = tokens.type.title;
  const titleSize = Math.min(titleRole.size, 22);
  const titleLineHeight = titleRole.lineHeight !== void 0 ? Math.min(titleRole.lineHeight, 28) : void 0;
  const labelLineHeightPx = estimateLineHeight(titleSize, titleLineHeight, tokens, titleRole.family);
  const labelLineCounts = input.steps.map((s) => estimateLineCount({
    content: s.label,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: colWidth * 0.9
  }, tokens));
  const maxLabelLines = Math.max(1, ...labelLineCounts);
  const labelTop = railY + railVerticalPadding + 8;
  const maxLabelHeight = labelLineHeightPx * maxLabelLines;
  const descTop = labelTop + maxLabelHeight + tokens.spacing.xs;
  for (let i = 0; i < stepCount; i++) {
    const step = input.steps[i];
    const colCenterX = region.left + (i + 0.5) * colWidth;
    const eyebrow = tokens.type.eyebrow;
    const tagHeight = estimateLineHeight(eyebrow.size, eyebrow.lineHeight, tokens, eyebrow.family);
    const tagNode = {
      kind: "text",
      rect: {
        left: colCenterX - colWidth * 0.45,
        top: railY - railVerticalPadding - tagHeight,
        width: colWidth * 0.9,
        height: tagHeight
      },
      content: applyTypeTransform(step.tag, eyebrow.transform),
      style: {
        family: eyebrow.family,
        weight: eyebrow.weight,
        size: eyebrow.size,
        lineHeight: eyebrow.lineHeight,
        letterSpacing: eyebrow.letterSpacing,
        italic: eyebrow.italic,
        color: tokens.palette.accent,
        align: "center",
        verticalAlign: "bottom"
      },
      autoFit: false
    };
    nodes.push(tagNode);
    nodes.push(...makeStepMarker(i + 1, colCenterX, railY, tokens));
    const labelNode = {
      kind: "text",
      rect: {
        left: colCenterX - colWidth * 0.45,
        top: labelTop,
        width: colWidth * 0.9,
        height: maxLabelHeight
      },
      content: applyTypeTransform(step.label, titleRole.transform),
      style: {
        family: titleRole.family,
        weight: titleRole.weight,
        size: titleSize,
        lineHeight: titleLineHeight,
        letterSpacing: titleRole.letterSpacing,
        italic: titleRole.italic,
        color: tokens.palette.foreground,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(labelNode);
    if (step.description) {
      const body = tokens.type.body;
      const descLineHeightPx = estimateLineHeight(body.size, body.lineHeight, tokens, body.family);
      const descLines = estimateLineCount({
        content: step.description,
        family: body.family,
        sizePt: body.size,
        letterSpacing: body.letterSpacing,
        width: colWidth * 0.9
      }, tokens);
      const descHeight = descLineHeightPx * descLines;
      if (descTop + descHeight <= region.top + region.height + 0.5) {
        nodes.push({
          kind: "text",
          rect: {
            left: colCenterX - colWidth * 0.45,
            top: descTop,
            width: colWidth * 0.9,
            height: descHeight
          },
          content: applyTypeTransform(step.description, body.transform),
          style: {
            family: body.family,
            weight: body.weight,
            size: body.size,
            lineHeight: body.lineHeight,
            letterSpacing: body.letterSpacing,
            italic: body.italic,
            color: tokens.palette.muted,
            align: "center",
            verticalAlign: "top"
          },
          autoFit: false
        });
      }
    }
  }
  return { nodes, overflow: { kind: "fit" } };
};
function makeStepMarker(index, cx, cy, tokens) {
  const style = tokens.ornament.stepMarker.style;
  const fillRole = tokens.ornament.stepMarker.fill;
  const fill = resolveOrnamentFill(fillRole, tokens);
  if (style === "none" || style === "plain") {
    const r = 5;
    const dot = {
      kind: "view",
      shape: "ellipse",
      decorative: true,
      zIndex: 2,
      rect: { left: cx - r, top: cy - r, width: r * 2, height: r * 2 },
      fill
    };
    return [dot];
  }
  const diameter = 32;
  const circle = {
    kind: "view",
    shape: "ellipse",
    decorative: false,
    zIndex: 2,
    rect: { left: cx - diameter / 2, top: cy - diameter / 2, width: diameter, height: diameter },
    fill
  };
  const label = {
    kind: "text",
    zIndex: 3,
    rect: { left: cx - diameter / 2, top: cy - diameter / 2, width: diameter, height: diameter },
    content: String(index),
    style: {
      family: style === "serifCircled" ? "Georgia" : tokens.type.title.family,
      weight: 700,
      size: 16,
      letterSpacing: 0,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle"
    },
    autoFit: false
  };
  return [circle, label];
}
function resolveOrnamentFill(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "accent":
      return tokens.palette.accent;
    case "muted":
      return tokens.palette.muted;
    case "surface":
      return tokens.canvas.surface;
  }
}

// ../pptx-primitives/dist/primitives/sourceLine.js
var MIN_COMPRESSION = 0.75;
var COMPRESSION_STEP = 0.05;
var sourceLine = (input, tokens, region) => {
  const kind = input.kind ?? "source";
  const prefix = kind === "source" ? "Source: " : kind === "note" ? "Note: " : "";
  const full = prefix + input.content;
  const caption = tokens.type.caption;
  const color = kind === "note" ? tokens.palette.faint : tokens.palette.muted;
  const italic = kind !== "plain";
  let scale = 1;
  let sizePt = caption.size * scale;
  let width = estimateTextWidth({
    content: full,
    family: caption.family,
    sizePt,
    letterSpacing: caption.letterSpacing * scale
  }, tokens);
  while (width > region.width && scale > MIN_COMPRESSION - 1e-9) {
    scale = Number((scale - COMPRESSION_STEP).toFixed(2));
    sizePt = caption.size * scale;
    width = estimateTextWidth({
      content: full,
      family: caption.family,
      sizePt,
      letterSpacing: caption.letterSpacing * scale
    }, tokens);
  }
  const lineHeightPx = estimateLineHeight(sizePt, caption.lineHeight !== void 0 ? caption.lineHeight * scale : void 0, tokens, caption.family);
  const node = {
    kind: "text",
    rect: {
      left: region.left,
      top: region.top,
      width: region.width,
      height: Math.min(lineHeightPx, region.height)
    },
    content: applyTypeTransform(full, caption.transform),
    style: {
      family: caption.family,
      weight: caption.weight,
      size: sizePt,
      lineHeight: caption.lineHeight !== void 0 ? caption.lineHeight * scale : void 0,
      letterSpacing: caption.letterSpacing * scale,
      italic,
      color,
      align: input.align ?? "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  const nodes = [node];
  const clipped = width > region.width;
  const overflow = clipped ? {
    kind: "clipped",
    droppedCount: 0,
    reason: `sourceLine exceeds width even at ${MIN_COMPRESSION}\xD7 compression`
  } : scale < 1 ? { kind: "compressed", scale } : { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/dist/primitives/textBlock.js
var HEX_RE2 = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function isHex(value) {
  return HEX_RE2.test(value);
}
function resolveFill(fill, tokens) {
  if (!fill || fill === "none")
    return null;
  if (typeof fill === "string" && isHex(fill))
    return fill;
  switch (fill) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "accentSecondary":
      return tokens.palette.accentSecondary ?? tokens.palette.accent;
    case "surface":
      return tokens.canvas.surface;
    default:
      return null;
  }
}
function resolveBorderColor(color, tokens) {
  if (color && isHex(color))
    return color;
  switch (color) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "rule":
    default:
      return tokens.palette.rule;
  }
}
function resolveTextColor(color, tokens, hasOpaqueFill) {
  if (color && typeof color === "string" && isHex(color))
    return color;
  switch (color) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "accentInverse":
      return tokens.palette.accentInverse;
    case "accentSecondary":
      return tokens.palette.accentSecondary ?? tokens.palette.accent;
    default:
      return hasOpaqueFill ? tokens.palette.accentInverse : tokens.palette.foreground;
  }
}
function resolveTextRunColor(color, tokens, hasOpaqueFill) {
  if (!color)
    return void 0;
  if (isHex(color))
    return color;
  return resolveTextColor(color, tokens, hasOpaqueFill);
}
function resolveTextRunColors(runs, tokens, hasOpaqueFill) {
  return runs.map((run) => {
    const color = resolveTextRunColor(run.color, tokens, hasOpaqueFill);
    return color === run.color ? run : { ...run, ...color ? { color } : {} };
  });
}
function resolveParagraphRunColors(paragraphs, tokens, hasOpaqueFill) {
  let inheritedAutoNumCount = 0;
  return paragraphs.map((paragraph) => {
    const shouldInherit = shouldInheritTokenBullet(paragraph, tokens);
    if (shouldInherit)
      inheritedAutoNumCount += 1;
    return {
      ...paragraph,
      ...shouldInherit ? { bullet: tokenParagraphBullet(tokens, inheritedAutoNumCount) } : {},
      runs: resolveTextRunColors(paragraph.runs, tokens, hasOpaqueFill)
    };
  });
}
function shouldInheritTokenBullet(paragraph, tokens) {
  if (paragraph.bullet !== void 0)
    return false;
  if (tokens.ornament.bullet.marker !== "autoNum")
    return false;
  return paragraph.level !== void 0 || paragraph.indent !== void 0 || paragraph.marginLeft !== void 0 || paragraph.hangingIndent !== void 0;
}
function tokenParagraphBullet(tokens, startAt) {
  return {
    type: "autoNum",
    scheme: tokens.ornament.bullet.scheme ?? "arabicPeriod",
    startAt
  };
}
function isParagraphArray2(value) {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && "runs" in value[0];
}
function isTextRunArray2(value) {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && "text" in value[0];
}
function stringToParagraphs(content, transform) {
  const lines = content.split("\n");
  return lines.map((line) => ({
    runs: [{ text: applyTypeTransform(line, transform) }]
  }));
}
var textBlock = (input, tokens, region) => {
  const role = input.role ?? "body";
  const roleSpec = tokens.type[role];
  const fill = resolveFill(input.fill, tokens);
  const hasOpaqueFill = fill !== null;
  const borderWidth = input.border?.width ?? (input.border ? 1 : 0);
  const borderColor = borderWidth > 0 ? resolveBorderColor(input.border?.color, tokens) : void 0;
  const borderStyle = input.border?.style ?? "solid";
  const insetDefault = hasOpaqueFill || borderWidth > 0 ? 8 : 0;
  const insetTop = input.insets?.top ?? insetDefault;
  const insetRight = input.insets?.right ?? insetDefault;
  const insetBottom = input.insets?.bottom ?? insetDefault;
  const insetLeft = input.insets?.left ?? insetDefault;
  const nodes = [];
  if (hasOpaqueFill || borderWidth > 0) {
    const surface = {
      kind: "view",
      shape: "rect",
      rect: { ...region },
      ...fill ? { fill } : {},
      ...borderWidth > 0 && borderColor ? { border: { width: borderWidth, color: borderColor, style: borderStyle } } : {},
      decorative: false,
      zIndex: 0
    };
    nodes.push(surface);
  }
  const textRect = {
    left: region.left + insetLeft,
    top: region.top + insetTop,
    width: Math.max(0, region.width - insetLeft - insetRight),
    height: Math.max(0, region.height - insetTop - insetBottom)
  };
  const textColor = resolveTextColor(input.color, tokens, hasOpaqueFill);
  const text = {
    kind: "text",
    rect: textRect,
    style: {
      family: roleSpec.family,
      weight: input.weight ?? roleSpec.weight,
      size: input.size ?? roleSpec.size,
      lineHeight: input.lineHeight ?? roleSpec.lineHeight,
      letterSpacing: roleSpec.letterSpacing,
      italic: input.italic ?? roleSpec.italic,
      color: textColor,
      align: input.align ?? "left",
      verticalAlign: input.verticalAlign ?? "top"
    },
    autoFit: false,
    ...hasOpaqueFill ? { zIndex: 1 } : {},
    ...input.rotation !== void 0 ? { rotation: input.rotation } : {}
  };
  let hasTextContent = true;
  if (typeof input.content === "string") {
    hasTextContent = input.content.length > 0;
    if (hasTextContent && input.content.includes("\n")) {
      text.paragraphs = stringToParagraphs(input.content, roleSpec.transform);
    } else if (hasTextContent) {
      text.content = applyTypeTransform(input.content, roleSpec.transform);
    }
  } else if (isParagraphArray2(input.content)) {
    text.paragraphs = resolveParagraphRunColors(input.content, tokens, hasOpaqueFill);
  } else if (isTextRunArray2(input.content)) {
    text.runs = resolveTextRunColors(input.content, tokens, hasOpaqueFill);
  } else {
    hasTextContent = false;
  }
  if (hasTextContent)
    nodes.push(text);
  const overflow = { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/dist/primitives/infoCard.js
var DEFAULT_SIDE_WIDTH = 96;
var DEFAULT_TOP_HEIGHT = 32;
var DEFAULT_PADDING = 8;
var DEFAULT_GAP = 4;
var infoCard = (input, tokens, region) => {
  const nodes = [];
  const padding = input.padding ?? DEFAULT_PADDING;
  const gap = input.gap ?? DEFAULT_GAP;
  if (input.fill && input.fill !== "none") {
    const surface = textBlock({
      content: "",
      fill: input.fill,
      border: input.border,
      insets: { top: 0, right: 0, bottom: 0, left: 0 }
    }, tokens, region);
    nodes.push(...surface.nodes);
  } else if (input.border) {
    const surface = textBlock({
      content: "",
      border: input.border,
      insets: { top: 0, right: 0, bottom: 0, left: 0 }
    }, tokens, region);
    nodes.push(...surface.nodes);
  }
  const labelPos = input.sideLabel?.position ?? "left";
  let bodyRect = { ...region };
  if (input.sideLabel) {
    if (labelPos === "left") {
      const w = input.sideLabel.width ?? DEFAULT_SIDE_WIDTH;
      const labelRect = {
        left: region.left,
        top: region.top,
        width: Math.min(w, region.width),
        height: region.height
      };
      bodyRect = {
        left: region.left + labelRect.width,
        top: region.top,
        width: Math.max(0, region.width - labelRect.width),
        height: region.height
      };
      const label = textBlock({
        content: input.sideLabel.text,
        role: "body",
        fill: input.sideLabel.fill ?? "muted",
        align: "center",
        verticalAlign: "middle",
        insets: { top: 8, right: 8, bottom: 8, left: 8 }
      }, tokens, labelRect);
      nodes.push(...label.nodes);
    } else {
      const h = input.sideLabel.height ?? DEFAULT_TOP_HEIGHT;
      const labelRect = {
        left: region.left,
        top: region.top,
        width: region.width,
        height: Math.min(h, region.height)
      };
      bodyRect = {
        left: region.left,
        top: region.top + labelRect.height,
        width: region.width,
        height: Math.max(0, region.height - labelRect.height)
      };
      const label = textBlock({
        content: input.sideLabel.text,
        role: "body",
        fill: input.sideLabel.fill ?? "muted",
        align: "left",
        verticalAlign: "middle",
        insets: { top: 6, right: 12, bottom: 6, left: 12 }
      }, tokens, labelRect);
      nodes.push(...label.nodes);
    }
  }
  const innerRect = {
    left: bodyRect.left + padding,
    top: bodyRect.top + padding,
    width: Math.max(0, bodyRect.width - padding * 2),
    height: Math.max(0, bodyRect.height - padding * 2)
  };
  let cursor = innerRect.top;
  const remainingHeight = () => Math.max(0, innerRect.top + innerRect.height - cursor);
  if (input.lead) {
    const bodyType = tokens.type.body;
    const leadText = typeof input.lead === "string" ? input.lead : input.lead.map((r) => r.text).join("");
    const lines = estimateLineCount({
      content: leadText,
      family: bodyType.family,
      sizePt: bodyType.size,
      letterSpacing: bodyType.letterSpacing,
      width: innerRect.width
    }, tokens);
    const lineHeight = estimateLineHeight(bodyType.size, bodyType.lineHeight, tokens, bodyType.family);
    const leadHeight = Math.max(lineHeight, lineHeight * lines);
    const leadRect = {
      left: innerRect.left,
      top: cursor,
      width: innerRect.width,
      height: Math.min(leadHeight, remainingHeight())
    };
    const leadResult = textBlock({
      content: input.lead,
      role: "body",
      weight: 700,
      align: "left",
      verticalAlign: "top"
    }, tokens, leadRect);
    nodes.push(...leadResult.nodes);
    cursor += leadRect.height + gap;
  }
  let footerHeight = 0;
  if (input.footer) {
    const captionType = tokens.type.caption;
    const footerText = typeof input.footer.text === "string" ? input.footer.text : input.footer.text.map((r) => r.text).join("");
    const lines = estimateLineCount({
      content: footerText,
      family: captionType.family,
      sizePt: captionType.size,
      letterSpacing: captionType.letterSpacing,
      width: innerRect.width
    }, tokens);
    const lineHeight = estimateLineHeight(captionType.size, captionType.lineHeight, tokens, captionType.family);
    footerHeight = Math.max(lineHeight, lineHeight * lines);
  }
  const bodyAvailable = Math.max(0, remainingHeight() - (footerHeight > 0 ? footerHeight + gap : 0));
  const bodyTopRect = {
    left: innerRect.left,
    top: cursor,
    width: innerRect.width,
    height: bodyAvailable
  };
  const bodyResult = bulletList({ items: input.body }, tokens, bodyTopRect);
  nodes.push(...bodyResult.nodes);
  cursor = bodyTopRect.top + bodyTopRect.height + (footerHeight > 0 ? gap : 0);
  if (input.footer) {
    const footerRect = {
      left: innerRect.left,
      top: cursor,
      width: innerRect.width,
      height: footerHeight
    };
    const isQuote = (input.footer.style ?? "plain") === "italic-quote";
    const footerResult = textBlock({
      content: input.footer.text,
      role: "caption",
      italic: isQuote ? true : void 0,
      color: "muted",
      align: "left",
      verticalAlign: "top"
    }, tokens, footerRect);
    nodes.push(...footerResult.nodes);
  }
  const overflow = bodyResult.overflow.kind === "paginated" ? bodyResult.overflow : { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/dist/primitives/sectionTag.js
var PAD_X = 10;
var PAD_Y = 4;
var MIN_COMPRESSION2 = 0.85;
var sectionTag = (input, tokens, region) => {
  const caption = tokens.type.caption;
  const fillRole = input.fill ?? "foreground";
  const fill = fillRole === "foreground" ? tokens.palette.foreground : fillRole === "muted" ? tokens.palette.muted : tokens.palette.accent;
  const textColor = tokens.palette.accentInverse;
  const transform = input.transform ?? "upper";
  const rendered = transform === "upper" ? input.label.toUpperCase() : input.label;
  let scale = 1;
  let textWidth = estimateTextWidth({
    content: rendered,
    family: caption.family,
    sizePt: caption.size,
    letterSpacing: Math.max(caption.letterSpacing, 1) * scale,
    uppercase: transform === "upper"
  }, tokens);
  while (textWidth + PAD_X * 2 > region.width && scale > MIN_COMPRESSION2 - 1e-9) {
    scale = Number((scale - 0.05).toFixed(2));
    textWidth = estimateTextWidth({
      content: rendered,
      family: caption.family,
      sizePt: caption.size,
      letterSpacing: Math.max(caption.letterSpacing, 1) * scale,
      uppercase: transform === "upper"
    }, tokens);
  }
  const clipped = textWidth + PAD_X * 2 > region.width;
  const pillWidth = Math.min(textWidth + PAD_X * 2, region.width);
  const lineHeightPx = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
  const pillHeight = Math.min(region.height, lineHeightPx + PAD_Y * 2);
  const bar = {
    kind: "view",
    shape: "rect",
    decorative: false,
    zIndex: 0,
    rect: {
      left: region.left,
      top: region.top,
      width: pillWidth,
      height: pillHeight
    },
    fill
  };
  const label = {
    kind: "text",
    zIndex: 1,
    rect: {
      left: region.left + PAD_X,
      top: region.top,
      width: pillWidth - PAD_X * 2,
      height: pillHeight
    },
    content: applyTypeTransform(input.label, transform),
    style: {
      family: caption.family,
      weight: 700,
      size: caption.size,
      lineHeight: caption.lineHeight,
      letterSpacing: Math.max(caption.letterSpacing, 1) * scale,
      italic: caption.italic,
      color: textColor,
      align: "left",
      verticalAlign: "middle"
    },
    autoFit: false
  };
  const nodes = [bar, label];
  const overflow = clipped ? {
    kind: "clipped",
    droppedCount: 0,
    reason: `sectionTag exceeds region.width even at ${MIN_COMPRESSION2}\xD7 compression`
  } : scale < 1 ? { kind: "compressed", scale } : { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/dist/primitives/tombstoneStack.js
var tombstoneStack = (input, tokens, region) => {
  const nodes = [];
  if (input.tiles.length === 0)
    return { nodes, overflow: { kind: "fit" } };
  const cols = Math.max(1, input.columns ?? 4);
  const rowGap = input.rowGap ?? tokens.spacing.sm;
  const colGap = input.columnGap ?? tokens.spacing.sm;
  const logoHeight = input.logoHeight ?? 36;
  const TILE_PAD = input.compact ? 6 : 8;
  const tileWidth = (region.width - colGap * (cols - 1)) / cols;
  if (tileWidth - TILE_PAD * 2 <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: input.tiles.length,
        reason: `region too narrow for ${cols}-column tombstoneStack`
      }
    };
  }
  const bodyRole = tokens.type.body;
  const captionRole = tokens.type.caption;
  const titleLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  const bodyLineHeight = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  const tileBodyWidth = tileWidth - TILE_PAD * 2;
  let maxTileContentHeight = 0;
  for (const tile of input.tiles) {
    const titleLines = estimateLineCount({
      content: tile.title,
      family: captionRole.family,
      sizePt: Math.max(captionRole.size, 11),
      letterSpacing: captionRole.letterSpacing,
      width: tileBodyWidth
    }, tokens);
    const bodyLines = tile.body ? estimateLineCount({
      content: tile.body,
      family: bodyRole.family,
      sizePt: bodyRole.size,
      letterSpacing: bodyRole.letterSpacing,
      width: tileBodyWidth
    }, tokens) : 0;
    const content = (logoHeight > 0 ? logoHeight + tokens.spacing.xs : 0) + titleLineHeight * titleLines + (bodyLines > 0 ? tokens.spacing.xs + bodyLineHeight * bodyLines : 0);
    if (content > maxTileContentHeight)
      maxTileContentHeight = content;
  }
  const tileHeight = maxTileContentHeight + TILE_PAD * 2;
  const startIndex = input.resume?.startTileIndex ?? 0;
  const rowsPerPage = Math.max(1, Math.floor((region.height + rowGap) / (tileHeight + rowGap)));
  const tilesPerPage = rowsPerPage * cols;
  for (let i = 0; i < tilesPerPage; i++) {
    const tileIndex = startIndex + i;
    if (tileIndex >= input.tiles.length)
      break;
    const tile = input.tiles[tileIndex];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tileRect = {
      left: region.left + col * (tileWidth + colGap),
      top: region.top + row * (tileHeight + rowGap),
      width: tileWidth,
      height: tileHeight
    };
    const border = {
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: tileRect,
      border: { width: 1, color: tokens.palette.rule, style: "solid" }
    };
    nodes.push(border);
    if (tile.accent) {
      const tick = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 1,
        rect: { left: tileRect.left, top: tileRect.top, width: 2, height: tileRect.height },
        fill: tokens.palette.accent
      };
      nodes.push(tick);
    }
    let cursor = tileRect.top + TILE_PAD;
    if (logoHeight > 0 && tile.logo) {
      nodes.push({
        kind: "image",
        zIndex: 1,
        rect: {
          left: tileRect.left + TILE_PAD,
          top: cursor,
          width: tileBodyWidth,
          height: logoHeight
        },
        src: tile.logo,
        alt: tile.title,
        decorative: false
      });
      cursor += logoHeight + tokens.spacing.xs;
    } else if (logoHeight > 0) {
      cursor += logoHeight + tokens.spacing.xs;
    }
    const titleLines = estimateLineCount({
      content: tile.title,
      family: captionRole.family,
      sizePt: Math.max(captionRole.size, 11),
      letterSpacing: captionRole.letterSpacing,
      width: tileBodyWidth
    }, tokens);
    const titleNode = {
      kind: "text",
      zIndex: 1,
      rect: {
        left: tileRect.left + TILE_PAD,
        top: cursor,
        width: tileBodyWidth,
        height: titleLineHeight * titleLines
      },
      content: applyTypeTransform(tile.title, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: 700,
        size: Math.max(captionRole.size, 11),
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: tokens.palette.foreground,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(titleNode);
    cursor += titleLineHeight * titleLines;
    if (tile.body) {
      cursor += tokens.spacing.xs;
      const bodyLines = estimateLineCount({
        content: tile.body,
        family: bodyRole.family,
        sizePt: bodyRole.size,
        letterSpacing: bodyRole.letterSpacing,
        width: tileBodyWidth
      }, tokens);
      const bodyNode = {
        kind: "text",
        zIndex: 1,
        rect: {
          left: tileRect.left + TILE_PAD,
          top: cursor,
          width: tileBodyWidth,
          height: bodyLineHeight * bodyLines
        },
        content: applyTypeTransform(tile.body, bodyRole.transform),
        style: {
          family: bodyRole.family,
          weight: bodyRole.weight,
          size: bodyRole.size,
          lineHeight: bodyRole.lineHeight,
          letterSpacing: bodyRole.letterSpacing,
          italic: bodyRole.italic,
          color: tokens.palette.muted,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      };
      nodes.push(bodyNode);
    }
  }
  const placedCount = Math.min(tilesPerPage, input.tiles.length - startIndex);
  const remaining = input.tiles.length - (startIndex + placedCount);
  const overflow = remaining > 0 ? {
    kind: "paginated",
    remaining: { startTileIndex: startIndex + placedCount },
    continuationLabel: `${remaining} tiles remaining`
  } : { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/dist/primitives/tocTiles.js
var tocTiles = (input, tokens, region) => {
  const nodes = [];
  if (input.tiles.length === 0)
    return { nodes, overflow: { kind: "fit" } };
  const cols = Math.max(1, input.columns ?? input.tiles.length);
  const colGap = input.columnGap ?? tokens.spacing.md;
  const tileWidth = (region.width - colGap * (cols - 1)) / cols;
  const markerSize = input.markerSizePt ?? 56;
  const markerLineHeight = estimateLineHeight(markerSize, markerSize * 1, tokens, tokens.type.display.family);
  const titleRole = tokens.type.title;
  const titleLineHeightPx = estimateLineHeight(titleRole.size, titleRole.lineHeight, tokens, titleRole.family);
  const bodyRole = tokens.type.body;
  const bodyLineHeightPx = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  let droppedCount = 0;
  const perRowHeight = region.height / Math.ceil(input.tiles.length / cols);
  const maxContentHeight = input.tiles.reduce((max, tile) => {
    const titleLines = estimateLineCount({
      content: tile.title,
      family: titleRole.family,
      sizePt: Math.min(titleRole.size, 18),
      letterSpacing: titleRole.letterSpacing,
      width: tileWidth
    }, tokens);
    const bodyLines = tile.body ? estimateLineCount({
      content: tile.body,
      family: bodyRole.family,
      sizePt: bodyRole.size,
      letterSpacing: bodyRole.letterSpacing,
      width: tileWidth
    }, tokens) : 0;
    const content = markerLineHeight + tokens.spacing.sm + 1 + tokens.spacing.sm + titleLineHeightPx * titleLines + (bodyLines > 0 ? tokens.spacing.xs + bodyLineHeightPx * bodyLines : 0);
    return Math.max(max, content);
  }, 0);
  const verticalOffset = Math.max(0, (perRowHeight - maxContentHeight) / 2);
  for (let i = 0; i < input.tiles.length; i++) {
    const tile = input.tiles[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tileLeft = region.left + col * (tileWidth + colGap);
    const tileTop = region.top + row * perRowHeight + verticalOffset;
    const markerText = String(tile.marker);
    const markerNode = {
      kind: "text",
      rect: {
        left: tileLeft,
        top: tileTop,
        width: tileWidth,
        height: markerLineHeight
      },
      content: markerText,
      style: {
        family: tokens.type.display.family,
        weight: tokens.type.display.weight,
        size: markerSize,
        lineHeight: markerSize * 1,
        letterSpacing: 0,
        italic: false,
        color: tokens.palette.accent,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(markerNode);
    let cursor = tileTop + markerLineHeight + tokens.spacing.sm;
    const rule = emitHorizontalRule(tokens.rules.divider, tokens.palette, tileLeft + tileWidth * 0.15, cursor, tileWidth * 0.7);
    nodes.push(...rule.nodes);
    cursor += rule.consumedHeight + tokens.spacing.sm;
    const titleLines = estimateLineCount({
      content: tile.title,
      family: titleRole.family,
      sizePt: Math.min(titleRole.size, 18),
      letterSpacing: titleRole.letterSpacing,
      width: tileWidth
    }, tokens);
    const titleHeight = titleLineHeightPx * titleLines;
    const titleNode = {
      kind: "text",
      rect: {
        left: tileLeft,
        top: cursor,
        width: tileWidth,
        height: titleHeight
      },
      content: applyTypeTransform(tile.title, titleRole.transform),
      style: {
        family: titleRole.family,
        weight: titleRole.weight,
        size: Math.min(titleRole.size, 18),
        lineHeight: titleRole.lineHeight,
        letterSpacing: titleRole.letterSpacing,
        italic: titleRole.italic,
        color: tokens.palette.foreground,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(titleNode);
    cursor += titleHeight;
    if (tile.body) {
      cursor += tokens.spacing.xs;
      const bodyLines = estimateLineCount({
        content: tile.body,
        family: bodyRole.family,
        sizePt: bodyRole.size,
        letterSpacing: bodyRole.letterSpacing,
        width: tileWidth
      }, tokens);
      const bodyHeight = bodyLineHeightPx * bodyLines;
      const bottomLimit = tileTop + perRowHeight;
      if (cursor + bodyHeight > bottomLimit + 0.5) {
        droppedCount++;
      } else {
        nodes.push({
          kind: "text",
          rect: {
            left: tileLeft,
            top: cursor,
            width: tileWidth,
            height: bodyHeight
          },
          content: applyTypeTransform(tile.body, bodyRole.transform),
          style: {
            family: bodyRole.family,
            weight: bodyRole.weight,
            size: bodyRole.size,
            lineHeight: bodyRole.lineHeight,
            letterSpacing: bodyRole.letterSpacing,
            italic: bodyRole.italic,
            color: tokens.palette.muted,
            align: "center",
            verticalAlign: "top"
          },
          autoFit: false
        });
      }
    }
  }
  const overflow = droppedCount > 0 ? {
    kind: "clipped",
    droppedCount,
    reason: `${droppedCount} tile bodies exceeded region.height`
  } : { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/dist/primitives/waterfallBars.js
var LABEL_AREA_HEIGHT_FRACTION = 0.22;
var waterfallBars = (input, tokens, region) => {
  const nodes = [];
  if (input.steps.length === 0)
    return { nodes, overflow: { kind: "fit" } };
  const barWidthRatio = input.barWidthRatio ?? 0.55;
  const minStepWidth = input.minStepWidth ?? 40;
  const showConnectors = input.showConnectors ?? true;
  const running = [];
  let acc = 0;
  for (const step of input.steps) {
    if (step.kind === "start") {
      acc = step.value;
      running.push(acc);
    } else if (step.kind === "up") {
      acc += step.value;
      running.push(acc);
    } else if (step.kind === "down") {
      acc -= step.value;
      running.push(acc);
    } else {
      acc = step.value;
      running.push(acc);
    }
  }
  const maxValue = Math.max(0, ...running, ...input.steps.map((s) => Math.abs(s.value)));
  if (maxValue <= 0)
    return { nodes, overflow: { kind: "fit" } };
  const stepCount = input.steps.length;
  const stepWidth = region.width / stepCount;
  if (stepWidth < minStepWidth) {
    const droppable = Math.max(0, stepCount - Math.floor(region.width / minStepWidth));
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: droppable,
        reason: `step width ${stepWidth.toFixed(0)}px below minStepWidth ${minStepWidth}`
      }
    };
  }
  const barWidth = stepWidth * barWidthRatio;
  const captionRole = tokens.type.caption;
  const labelLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  const labelReserve = Math.max(labelLineHeight, region.height * LABEL_AREA_HEIGHT_FRACTION / 2);
  const chartTop = region.top + labelReserve;
  const chartBottom = region.top + region.height - labelReserve;
  const chartHeight = Math.max(10, chartBottom - chartTop);
  const scale = chartHeight / maxValue;
  const baselineY = chartBottom;
  let prevTopY = null;
  let prevTopX = null;
  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    const stepCenterX = region.left + (i + 0.5) * stepWidth;
    const barLeft = stepCenterX - barWidth / 2;
    let barTopY;
    let barBottomY;
    let color;
    let topOfVisibleBar;
    if (step.kind === "start" || step.kind === "end") {
      barTopY = baselineY - step.value * scale;
      barBottomY = baselineY;
      color = tokens.palette.foreground;
      topOfVisibleBar = barTopY;
    } else if (step.kind === "up") {
      const base = running[i] - step.value;
      barTopY = baselineY - running[i] * scale;
      barBottomY = baselineY - base * scale;
      color = tokens.palette.accent;
      topOfVisibleBar = barTopY;
    } else {
      const base = running[i] + step.value;
      barTopY = baselineY - base * scale;
      barBottomY = baselineY - running[i] * scale;
      color = tokens.palette.muted;
      topOfVisibleBar = barBottomY;
    }
    const bar = {
      kind: "view",
      shape: "rect",
      decorative: false,
      zIndex: 1,
      rect: {
        left: barLeft,
        top: Math.min(barTopY, barBottomY),
        width: barWidth,
        height: Math.abs(barBottomY - barTopY)
      },
      fill: color
    };
    nodes.push(bar);
    const valueText = step.valueLabel ?? formatValue(step.value, step.kind);
    const valueNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: stepCenterX - stepWidth / 2,
        top: Math.min(barTopY, barBottomY) - labelLineHeight - 2,
        width: stepWidth,
        height: labelLineHeight
      },
      content: applyTypeTransform(valueText, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: 700,
        size: Math.max(captionRole.size, 10),
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: step.kind === "up" ? tokens.palette.accent : step.kind === "down" ? tokens.palette.muted : tokens.palette.foreground,
        align: "center",
        verticalAlign: "bottom"
      },
      autoFit: false
    };
    nodes.push(valueNode);
    const stepLabelNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: stepCenterX - stepWidth / 2,
        top: baselineY + 4,
        width: stepWidth,
        height: labelLineHeight
      },
      content: applyTypeTransform(step.label, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: captionRole.weight,
        size: captionRole.size,
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: tokens.palette.muted,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(stepLabelNode);
    if (showConnectors && prevTopY !== null && prevTopX !== null) {
      const connectorY = step.kind === "up" ? baselineY - (running[i] - step.value) * scale : step.kind === "down" ? baselineY - (running[i] + step.value) * scale : topOfVisibleBar;
      const connector = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 0,
        rect: {
          left: prevTopX,
          top: connectorY - 0.5,
          width: barLeft - prevTopX,
          height: 1
        },
        fill: tokens.palette.rule
      };
      nodes.push(connector);
    }
    prevTopX = barLeft + barWidth;
    prevTopY = topOfVisibleBar;
  }
  return { nodes, overflow: { kind: "fit" } };
};
function formatValue(value, kind) {
  const abs = Math.abs(value);
  const formatted = abs >= 1e3 ? abs.toLocaleString("en-US", { maximumFractionDigits: 1 }) : abs.toString();
  if (kind === "up")
    return `+${formatted}`;
  if (kind === "down")
    return `\u2212${formatted}`;
  return formatted;
}

// ../pptx-primitives/dist/primitives/orgTree.js
var BOX_PAD = 10;
var orgTree = (input, tokens, region) => {
  const nodes = [];
  if (input.children.length === 0) {
    nodes.push(...renderNode(input.root, tokens, {
      left: region.left + region.width / 4,
      top: region.top + region.height / 3,
      width: region.width / 2,
      height: region.height / 3
    }, input.rootFill ?? "foreground"));
    return { nodes, overflow: { kind: "fit" } };
  }
  const rootHeightRatio = input.rootHeightRatio ?? 0.28;
  const childGap = input.childGap ?? tokens.spacing.sm;
  const minChildWidth = input.minChildWidth ?? 80;
  const rootWidth = Math.min(region.width * 0.5, 280);
  const rootTextHeight = measureNodeTextBlockHeight(input.root, tokens, rootWidth - BOX_PAD * 2);
  const rootHeight = Math.min(region.height * 0.48, Math.max(region.height * rootHeightRatio, rootTextHeight + BOX_PAD * 2));
  const rootLeft = region.left + (region.width - rootWidth) / 2;
  const rootTop = region.top;
  nodes.push(...renderNode(input.root, tokens, {
    left: rootLeft,
    top: rootTop,
    width: rootWidth,
    height: rootHeight
  }, input.rootFill ?? "foreground"));
  const connectorGap = Math.max(18, region.height * 0.16);
  const childRowTop = Math.min(region.top + rootHeight + connectorGap, region.top + region.height * 0.62);
  const childRowHeight = region.height - (childRowTop - region.top);
  const totalGap = childGap * (input.children.length - 1);
  const childWidth = (region.width - totalGap) / input.children.length;
  let droppedCount = 0;
  const visibleChildren = [];
  if (childWidth < minChildWidth) {
    const maxChildren = Math.max(1, Math.floor((region.width + childGap) / (minChildWidth + childGap)));
    droppedCount = input.children.length - maxChildren;
    visibleChildren.push(...input.children.slice(0, maxChildren));
  } else {
    visibleChildren.push(...input.children);
  }
  const visibleChildWidth = visibleChildren.length > 0 ? (region.width - childGap * (visibleChildren.length - 1)) / visibleChildren.length : childWidth;
  const rootBottomY = rootTop + rootHeight;
  const childTopY = childRowTop;
  const railY = rootBottomY + (childTopY - rootBottomY) / 2;
  const rootCenterX = rootLeft + rootWidth / 2;
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: rootCenterX - 0.5, top: rootBottomY, width: 1, height: railY - rootBottomY },
    fill: tokens.palette.rule
  });
  const childCenters = visibleChildren.map((_, i) => region.left + i * (visibleChildWidth + childGap) + visibleChildWidth / 2);
  if (childCenters.length > 1) {
    const railLeft = region.left;
    const railRight = region.left + (visibleChildren.length - 1) * (visibleChildWidth + childGap) + visibleChildWidth;
    nodes.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: { left: railLeft, top: railY - 0.5, width: railRight - railLeft, height: 1 },
      fill: tokens.palette.rule
    });
  }
  for (const cx of childCenters) {
    nodes.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: { left: cx - 0.5, top: railY, width: 1, height: childTopY - railY },
      fill: tokens.palette.rule
    });
  }
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i];
    const childLeft = region.left + i * (visibleChildWidth + childGap);
    nodes.push(...renderNode(child, tokens, {
      left: childLeft,
      top: childTopY,
      width: visibleChildWidth,
      height: childRowHeight
    }, "surface", child.accent));
  }
  const overflow = droppedCount > 0 ? {
    kind: "clipped",
    droppedCount,
    reason: `${droppedCount} child nodes dropped; per-child budget < minChildWidth`
  } : { kind: "fit" };
  return { nodes, overflow };
};
function renderNode(node, tokens, rect, fill, accent) {
  const isFilled = fill === "foreground";
  const box = {
    kind: "view",
    shape: "rect",
    decorative: false,
    zIndex: 1,
    rect,
    ...isFilled ? { fill: tokens.palette.foreground } : { border: { width: 1, color: tokens.palette.foreground, style: "solid" } },
    children: []
  };
  if (accent) {
    box.children.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 2,
      rect: { left: 0, top: 0, width: 2, height: rect.height },
      fill: tokens.palette.accent
    });
  }
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const titleSize = chooseTitleSize(node, tokens, rect.width - BOX_PAD * 2, rect.height);
  const titleLineHeight = compactLineHeight(titleSize, titleRole.lineHeight);
  const titleLineHeightPx = estimateLineHeight(titleSize, titleLineHeight, tokens, titleRole.family);
  const titleLines = estimateLineCount({
    content: node.title,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: rect.width - BOX_PAD * 2
  }, tokens);
  const titleHeight = titleLineHeightPx * titleLines;
  const subtitleHeight = node.subtitle ? estimateLineHeight(captionRole.size, compactLineHeight(captionRole.size, captionRole.lineHeight), tokens, captionRole.family) : 0;
  const textBlockHeight = titleHeight + (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0);
  const textTop = Math.max(BOX_PAD, (rect.height - textBlockHeight) / 2);
  const titleNode = {
    kind: "text",
    zIndex: 2,
    rect: {
      left: BOX_PAD,
      top: textTop,
      width: rect.width - BOX_PAD * 2,
      height: titleHeight
    },
    content: applyTypeTransform(node.title, titleRole.transform),
    style: {
      family: titleRole.family,
      weight: titleRole.weight,
      size: titleSize,
      lineHeight: titleLineHeight,
      letterSpacing: titleRole.letterSpacing,
      italic: titleRole.italic,
      color: isFilled ? tokens.palette.accentInverse : tokens.palette.foreground,
      align: "center",
      verticalAlign: "top"
    },
    autoFit: false
  };
  box.children.push(titleNode);
  if (node.subtitle) {
    const subNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: BOX_PAD,
        top: textTop + titleHeight + tokens.spacing.xs,
        width: rect.width - BOX_PAD * 2,
        height: subtitleHeight
      },
      content: applyTypeTransform(node.subtitle, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: captionRole.weight,
        size: captionRole.size,
        lineHeight: compactLineHeight(captionRole.size, captionRole.lineHeight),
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: isFilled ? tokens.palette.accentInverse : tokens.palette.muted,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    box.children.push(subNode);
  }
  return [box];
}
function compactLineHeight(size, requested) {
  const natural = size * 1.18;
  return requested === void 0 ? natural : Math.min(requested, size * 1.32);
}
function measureNodeTextBlockHeight(node, tokens, innerWidth) {
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const titleSize = Math.min(titleRole.size, 15);
  const titleLineHeight = compactLineHeight(titleSize, titleRole.lineHeight);
  const titleLineHeightPx = estimateLineHeight(titleSize, titleLineHeight, tokens, titleRole.family);
  const titleLines = estimateLineCount({
    content: node.title,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: innerWidth
  }, tokens);
  const subtitleHeight = node.subtitle ? estimateLineHeight(captionRole.size, compactLineHeight(captionRole.size, captionRole.lineHeight), tokens, captionRole.family) : 0;
  return titleLineHeightPx * titleLines + (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0);
}
function chooseTitleSize(node, tokens, innerWidth, boxHeight) {
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const subtitleHeight = node.subtitle ? estimateLineHeight(captionRole.size, compactLineHeight(captionRole.size, captionRole.lineHeight), tokens, captionRole.family) : 0;
  const maxTitleSize = Math.min(titleRole.size, 15);
  const available = Math.max(8, boxHeight - BOX_PAD * 2 - (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0));
  for (let size = maxTitleSize; size >= 9; size -= 1) {
    const lineHeight = compactLineHeight(size, titleRole.lineHeight);
    const lineHeightPx = estimateLineHeight(size, lineHeight, tokens, titleRole.family);
    const lines = estimateLineCount({
      content: node.title,
      family: titleRole.family,
      sizePt: size,
      letterSpacing: titleRole.letterSpacing,
      width: innerWidth
    }, tokens);
    if (lineHeightPx * lines <= available)
      return size;
  }
  return 9;
}

// ../pptx-primitives/dist/primitives/chartBlock.js
var chartBlock = (input, tokens, region) => {
  const nodes = [];
  const chartData = input.preserveCallerStyling ? input.chartData : applyTokens(input.chartData, tokens);
  nodes.push({
    kind: "chart",
    rect: region,
    chartData,
    ...input.altText ? { altText: input.altText } : {}
  });
  return { nodes, overflow: { kind: "fit" } };
};
function applyTokens(chartData, tokens) {
  if (!chartData || typeof chartData !== "object")
    return chartData;
  const cd = chartData;
  const paletteCycle = [
    tokens.palette.accent,
    tokens.palette.muted,
    tokens.palette.faint,
    tokens.palette.foreground
  ];
  const family = tokens.type.body.family;
  const axisFontSize = Math.max(tokens.type.caption.size, 9);
  let series = cd.series;
  if (Array.isArray(series)) {
    series = series.map((s, i) => {
      const seriesObj = s;
      if (seriesObj.color)
        return seriesObj;
      return { ...seriesObj, color: paletteCycle[i % paletteCycle.length] };
    });
  }
  let title = cd.title;
  if (title && !title.fontFamily) {
    title = { ...title, fontFamily: family, fontColor: title.fontColor ?? tokens.palette.foreground };
  }
  const fillAxis = (axis) => {
    if (!axis)
      return axis;
    const next = { ...axis };
    if (!next.fontFamily)
      next.fontFamily = family;
    if (!next.fontSize)
      next.fontSize = axisFontSize;
    if (!next.fontColor)
      next.fontColor = tokens.palette.muted;
    return next;
  };
  const categoryAxis = fillAxis(cd.categoryAxis);
  const valueAxis = fillAxis(cd.valueAxis);
  let legend = cd.legend;
  if (legend && !legend.fontFamily) {
    legend = { ...legend, fontFamily: family, fontSize: legend.fontSize ?? axisFontSize, fontColor: legend.fontColor ?? tokens.palette.muted };
  }
  return {
    ...cd,
    ...series !== void 0 ? { series } : {},
    ...title ? { title } : {},
    ...categoryAxis ? { categoryAxis } : {},
    ...valueAxis ? { valueAxis } : {},
    ...legend ? { legend } : {}
  };
}

// ../pptx-primitives/dist/primitives/quadrantMap.js
var quadrantMap = (input, tokens, region) => {
  const nodes = [];
  const points = input.points ?? [];
  const reservedLabelRects = [];
  const placedPointLabelRects = [];
  const captionForReserve = tokens.type.caption;
  const yLabels = input.yAxisLabel ? [input.yAxisLabel.low, input.yAxisLabel.high] : [];
  const measuredYReserve = yLabels.length === 0 ? 28 : Math.max(...yLabels.map((text) => estimateTextWidth({
    content: applyTypeTransform(text, captionForReserve.transform === "none" ? "upper" : captionForReserve.transform),
    family: captionForReserve.family,
    sizePt: captionForReserve.size,
    letterSpacing: Math.max(captionForReserve.letterSpacing, 1)
  }, tokens))) + 8;
  const reserve = Math.min(input.axisLabelReserve ?? Math.max(28, measuredYReserve), region.width * 0.3);
  const chartLeft = region.left + reserve;
  const chartRight = region.left + region.width - reserve / 2;
  const chartTop = region.top + reserve / 2;
  const chartBottom = region.top + region.height - reserve;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  if (chartWidth <= 0 || chartHeight <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: points.length,
        reason: "region too small for quadrantMap chart area"
      }
    };
  }
  const midX = chartLeft + chartWidth / 2;
  const midY = chartTop + chartHeight / 2;
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: midX - 0.5, top: chartTop, width: 1, height: chartHeight },
    fill: tokens.palette.foreground
  });
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: chartLeft, top: midY - 0.5, width: chartWidth, height: 1 },
    fill: tokens.palette.foreground
  });
  const captionRole = tokens.type.caption;
  const captionLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  if (input.quadrants) {
    const quarterPad = 10;
    const quarters = [
      // Bottom-left (low vision, low execution) — top-left of this sub-rect.
      { text: input.quadrants[0], left: chartLeft + quarterPad, top: midY + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "left" },
      // Bottom-right.
      { text: input.quadrants[1], left: midX + quarterPad, top: midY + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "right" },
      // Top-left.
      { text: input.quadrants[2], left: chartLeft + quarterPad, top: chartTop + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "left" },
      // Top-right.
      { text: input.quadrants[3], left: midX + quarterPad, top: chartTop + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "right" }
    ];
    for (const q of quarters) {
      const rect = {
        left: q.left,
        top: q.top,
        width: q.width,
        height: captionLineHeight
      };
      const node = {
        kind: "text",
        zIndex: 1,
        rect,
        content: applyTypeTransform(q.text, captionRole.transform === "none" ? "upper" : captionRole.transform),
        style: {
          family: captionRole.family,
          weight: 700,
          size: Math.max(captionRole.size, 10),
          lineHeight: captionRole.lineHeight,
          letterSpacing: Math.max(captionRole.letterSpacing, 1.2),
          italic: captionRole.italic,
          color: tokens.palette.muted,
          align: q.align,
          verticalAlign: "top"
        },
        autoFit: false
      };
      nodes.push(node);
      reservedLabelRects.push(rect);
    }
  }
  if (input.xAxisLabel) {
    const low = axisLabel(input.xAxisLabel.low, chartLeft, chartBottom + 4, chartWidth / 2, "left", tokens);
    nodes.push(low);
    reservedLabelRects.push(low.rect);
    const high = axisLabel(input.xAxisLabel.high, midX, chartBottom + 4, chartWidth / 2, "right", tokens);
    nodes.push(high);
    reservedLabelRects.push(high.rect);
  }
  if (input.yAxisLabel) {
    const yLabelWidth = Math.max(0, reserve - 4);
    const low = axisLabel(input.yAxisLabel.low, region.left, chartBottom - captionLineHeight, yLabelWidth, "left", tokens);
    const high = axisLabel(input.yAxisLabel.high, region.left, chartTop, yLabelWidth, "left", tokens);
    nodes.push(low, high);
    reservedLabelRects.push(low.rect, high.rect);
  }
  const dotRadius = input.dotRadius ?? 5;
  const bodyRole = tokens.type.body;
  const bodyLineHeight = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  let pointZBase = 10;
  for (const point of points) {
    const clampedX = Math.max(0, Math.min(100, point.x));
    const clampedY = Math.max(0, Math.min(100, point.y));
    const cx = chartLeft + clampedX / 100 * chartWidth;
    const cy = chartBottom - clampedY / 100 * chartHeight;
    const isPrimary = (point.emphasis ?? "secondary") === "primary";
    const color = isPrimary ? tokens.palette.accent : tokens.palette.muted;
    const dot = {
      kind: "view",
      shape: "ellipse",
      decorative: false,
      zIndex: pointZBase,
      rect: { left: cx - dotRadius, top: cy - dotRadius, width: dotRadius * 2, height: dotRadius * 2 },
      fill: color
    };
    nodes.push(dot);
    const textWidth = estimateTextWidth({
      content: point.name,
      family: bodyRole.family,
      sizePt: bodyRole.size,
      letterSpacing: bodyRole.letterSpacing
    }, tokens);
    const labelWidth = Math.min(chartWidth, Math.max(1, textWidth + 4));
    const labelRect = choosePointLabelRect({
      cx,
      cy,
      dotRadius,
      labelWidth,
      labelHeight: bodyLineHeight,
      chart: { left: chartLeft, top: chartTop, width: chartWidth, height: chartHeight },
      bounds: region,
      reservedRects: [...reservedLabelRects, ...placedPointLabelRects]
    });
    const align = labelRect.left + labelRect.width <= cx - dotRadius ? "right" : "left";
    const labelNode = {
      kind: "text",
      zIndex: pointZBase + 1,
      rect: labelRect,
      content: applyTypeTransform(point.name, bodyRole.transform),
      style: {
        family: bodyRole.family,
        weight: isPrimary ? 700 : bodyRole.weight,
        size: bodyRole.size,
        lineHeight: bodyRole.lineHeight,
        letterSpacing: bodyRole.letterSpacing,
        italic: bodyRole.italic,
        color: isPrimary ? tokens.palette.foreground : tokens.palette.muted,
        align,
        verticalAlign: "middle"
      },
      autoFit: false
    };
    nodes.push(labelNode);
    placedPointLabelRects.push(labelRect);
    pointZBase += 2;
  }
  return { nodes, overflow: { kind: "fit" } };
};
function axisLabel(text, left, top, width, align, tokens) {
  const captionRole = tokens.type.caption;
  const captionLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  return {
    kind: "text",
    zIndex: 1,
    rect: { left, top, width, height: captionLineHeight },
    content: applyTypeTransform(text, captionRole.transform === "none" ? "upper" : captionRole.transform),
    style: {
      family: captionRole.family,
      weight: captionRole.weight,
      size: captionRole.size,
      lineHeight: captionRole.lineHeight,
      letterSpacing: Math.max(captionRole.letterSpacing, 1),
      italic: captionRole.italic,
      color: tokens.palette.muted,
      align,
      verticalAlign: "top"
    },
    autoFit: false
  };
}
function rectsOverlap(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}
function overlapArea(a, b) {
  if (!rectsOverlap(a, b))
    return 0;
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return Math.max(0, width) * Math.max(0, height);
}
function clampRectToChart(rect, chart) {
  return {
    ...rect,
    left: Math.min(Math.max(rect.left, chart.left), chart.left + chart.width - rect.width),
    top: Math.min(Math.max(rect.top, chart.top), chart.top + chart.height - rect.height)
  };
}
function choosePointLabelRect(input) {
  const { cx, cy, dotRadius, labelWidth, labelHeight, chart, bounds, reservedRects } = input;
  const gap = dotRadius + 5;
  const centeredTop = cy - labelHeight / 2;
  const centeredLeft = cx - labelWidth / 2;
  const candidates = [
    { left: cx + gap, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: cx - gap - labelWidth, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: centeredLeft, top: cy + gap, width: labelWidth, height: labelHeight },
    { left: centeredLeft, top: cy - gap - labelHeight, width: labelWidth, height: labelHeight },
    { left: chart.left + chart.width + 4, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: chart.left - labelWidth - 4, top: centeredTop, width: labelWidth, height: labelHeight }
  ].map((rect) => clampRectToChart(rect, bounds));
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((rect, index) => {
    const collisionScore = reservedRects.reduce((sum, reserved) => sum + overlapArea(rect, reserved), 0);
    const score = collisionScore * 1e3 + index;
    if (score < bestScore) {
      best = rect;
      bestScore = score;
    }
  });
  return best;
}

// ../pptx-primitives/dist/primitives/harveyBall.js
var harveyBall = (input, tokens, region) => {
  const diameter = Math.min(region.width, region.height);
  const cx = region.left + region.width / 2;
  const cy = region.top + region.height / 2;
  const left = cx - diameter / 2;
  const top = cy - diameter / 2;
  const filled = Math.max(0, Math.min(4, input.filled));
  const nodes = [];
  const outline = {
    kind: "view",
    shape: "ellipse",
    rect: { left, top, width: diameter, height: diameter },
    border: { width: 1, color: tokens.palette.foreground, style: "solid" },
    zIndex: 0,
    decorative: false
  };
  nodes.push(outline);
  if (filled === 4) {
    const full = {
      kind: "view",
      shape: "ellipse",
      rect: { left, top, width: diameter, height: diameter },
      fill: tokens.palette.foreground,
      zIndex: 1,
      decorative: true
    };
    nodes.push(full);
  } else if (filled > 0) {
    for (let i = 0; i < filled; i++) {
      const node = {
        kind: "view",
        shape: "pieWedge",
        rect: { left, top, width: diameter, height: diameter },
        fill: tokens.palette.foreground,
        rotation: i * 90,
        zIndex: 1 + i,
        decorative: true
      };
      nodes.push(node);
    }
    nodes.push({
      kind: "view",
      shape: "ellipse",
      rect: { left, top, width: diameter, height: diameter },
      border: { width: 1, color: tokens.palette.foreground, style: "solid" },
      zIndex: filled + 1,
      decorative: false
    });
  }
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/calloutBox.js
var PADDING = 12;
function resolveColor2(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "surface":
      return tokens.canvas.surface;
    default:
      return tokens.canvas.surface;
  }
}
var calloutBox = (input, tokens, region) => {
  const role = tokens.type[input.role ?? "body"];
  const fill = resolveColor2(input.fill ?? "surface", tokens);
  const borderColor = input.borderWidth === 0 ? void 0 : resolveColor2(input.borderColor ?? "foreground", tokens);
  const borderWidth = input.borderWidth ?? 1;
  const nodes = [];
  const box = {
    kind: "view",
    shape: input.shape ?? "rect",
    rect: { ...region },
    fill,
    ...borderColor && borderWidth > 0 ? { border: { width: borderWidth, color: borderColor, style: "solid" } } : {},
    decorative: false,
    zIndex: 0
  };
  nodes.push(box);
  const textRect = {
    left: region.left + PADDING,
    top: region.top + PADDING,
    width: Math.max(0, region.width - PADDING * 2),
    height: Math.max(0, region.height - PADDING * 2)
  };
  const textNode = {
    kind: "text",
    rect: textRect,
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top"
    },
    zIndex: 1,
    autoFit: false
  };
  if (typeof input.content === "string") {
    textNode.content = input.content;
  } else {
    textNode.runs = input.content;
  }
  nodes.push(textNode);
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/chevronArrow.js
var chevronArrow = (input, tokens, region) => {
  const direction = input.direction ?? "right";
  const fillRole = input.fill ?? "accent";
  const fill = fillRole === "foreground" ? tokens.palette.foreground : fillRole === "muted" ? tokens.palette.muted : tokens.palette.accent;
  const nodes = [];
  const shape = {
    kind: "view",
    // DrawingML preset names. "chevron" points right; "leftArrow" points
    // left. We use rightArrow / leftArrow for clearer semantics —
    // chevron's adjustment defaults vary across renderers.
    shape: direction === "right" ? "rightArrow" : "leftArrow",
    rect: { ...region },
    fill,
    decorative: false
  };
  nodes.push(shape);
  if (input.label) {
    const eyebrow = tokens.type.eyebrow;
    const label = {
      kind: "text",
      rect: { ...region },
      content: eyebrow.transform === "upper" ? input.label.toUpperCase() : input.label,
      style: {
        family: eyebrow.family,
        weight: eyebrow.weight,
        size: eyebrow.size,
        lineHeight: eyebrow.lineHeight,
        letterSpacing: eyebrow.letterSpacing,
        italic: eyebrow.italic,
        color: tokens.palette.accentInverse,
        align: "center",
        verticalAlign: "middle"
      },
      zIndex: 1,
      autoFit: false
    };
    nodes.push(label);
  }
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/numberedChip.js
function resolveChipRect(input, region) {
  const width = input.width ?? input.size ?? region.width;
  const height = input.height ?? input.size ?? region.height;
  const anchor = input.anchor ?? "topLeft";
  const left = anchor === "topRight" || anchor === "bottomRight" ? region.left + region.width - width : anchor === "center" ? region.left + (region.width - width) / 2 : region.left;
  const top = anchor === "bottomLeft" || anchor === "bottomRight" ? region.top + region.height - height : anchor === "center" ? region.top + (region.height - height) / 2 : region.top;
  return { left, top, width, height };
}
var numberedChip = (input, tokens, region) => {
  const shape = input.shape ?? "rect";
  const fillRole = input.fill ?? "foreground";
  const fill = fillRole === "muted" ? tokens.palette.muted : fillRole === "accent" ? tokens.palette.accent : tokens.palette.foreground;
  const caption = tokens.type.caption;
  const text = `${input.prefix ?? ""}${input.index}${input.suffix ?? ""}`;
  const rect = resolveChipRect(input, region);
  const chip = {
    kind: "view",
    shape,
    rect,
    fill,
    decorative: false
  };
  const label = {
    kind: "text",
    rect,
    content: text,
    style: {
      family: caption.family,
      weight: 700,
      size: caption.size,
      lineHeight: caption.lineHeight,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle"
    },
    zIndex: 1,
    autoFit: false
  };
  return {
    nodes: [chip, label],
    overflow: { kind: "fit" }
  };
};

// ../pptx-primitives/dist/primitives/diagonalStamp.js
var diagonalStamp = (input, tokens, region) => {
  const eyebrow = tokens.type.eyebrow;
  const colorRole = input.color ?? "muted";
  const color = colorRole === "faint" ? tokens.palette.faint : colorRole === "foreground" ? tokens.palette.foreground : colorRole === "accent" ? tokens.palette.accent : tokens.palette.muted;
  const stamp = {
    kind: "text",
    rect: { ...region },
    content: input.text.toUpperCase(),
    rotation: input.rotation ?? -25,
    style: {
      family: eyebrow.family,
      weight: 700,
      size: eyebrow.size,
      lineHeight: eyebrow.lineHeight,
      letterSpacing: Math.max(eyebrow.letterSpacing, 1.2),
      italic: false,
      color,
      align: "center",
      verticalAlign: "middle"
    },
    autoFit: false
  };
  const nodes = [stamp];
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/legendTable.js
var SWATCH_SIZE = 12;
var SWATCH_GAP = 8;
var VALUE_GAP = 12;
var ROW_GAP = 4;
var legendTable = (input, tokens, region) => {
  const caption = tokens.type.caption;
  const lineHeightPx = estimateLineHeight(caption.size, caption.lineHeight, tokens, caption.family);
  const direction = input.direction ?? "vertical";
  const nodes = [];
  if (direction === "vertical") {
    let cursor = region.top;
    const rowHeight = Math.max(lineHeightPx, SWATCH_SIZE + 2);
    for (const item of input.items) {
      if (cursor + rowHeight > region.top + region.height)
        break;
      const swatch = {
        kind: "view",
        shape: "rect",
        rect: {
          left: region.left,
          top: cursor + (rowHeight - SWATCH_SIZE) / 2,
          width: SWATCH_SIZE,
          height: SWATCH_SIZE
        },
        fill: item.color,
        decorative: true
      };
      nodes.push(swatch);
      const labelLeft = region.left + SWATCH_SIZE + SWATCH_GAP;
      const valueWidth = item.value ? Math.min(80, region.width * 0.3) : 0;
      const labelWidth = region.width - (SWATCH_SIZE + SWATCH_GAP) - (item.value ? VALUE_GAP + valueWidth : 0);
      const label = {
        kind: "text",
        rect: { left: labelLeft, top: cursor, width: labelWidth, height: rowHeight },
        content: item.label,
        style: {
          family: caption.family,
          weight: caption.weight,
          size: caption.size,
          lineHeight: caption.lineHeight,
          letterSpacing: caption.letterSpacing,
          italic: caption.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "middle"
        },
        autoFit: false
      };
      nodes.push(label);
      if (item.value) {
        const value = {
          kind: "text",
          rect: {
            left: region.left + region.width - valueWidth,
            top: cursor,
            width: valueWidth,
            height: rowHeight
          },
          content: item.value,
          style: {
            family: caption.family,
            weight: 700,
            size: caption.size,
            lineHeight: caption.lineHeight,
            color: tokens.palette.foreground,
            align: "right",
            verticalAlign: "middle"
          },
          autoFit: false
        };
        nodes.push(value);
      }
      cursor += rowHeight + ROW_GAP;
    }
  } else {
    const itemCount = input.items.length;
    const itemWidth = region.width / itemCount;
    for (let i = 0; i < itemCount; i++) {
      const item = input.items[i];
      const x = region.left + i * itemWidth;
      const swatch = {
        kind: "view",
        shape: "rect",
        rect: {
          left: x,
          top: region.top + (region.height - SWATCH_SIZE) / 2,
          width: SWATCH_SIZE,
          height: SWATCH_SIZE
        },
        fill: item.color,
        decorative: true
      };
      nodes.push(swatch);
      const label = {
        kind: "text",
        rect: {
          left: x + SWATCH_SIZE + SWATCH_GAP,
          top: region.top,
          width: itemWidth - SWATCH_SIZE - SWATCH_GAP - 4,
          height: region.height
        },
        content: item.label,
        style: {
          family: caption.family,
          weight: caption.weight,
          size: caption.size,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "middle"
        },
        autoFit: false
      };
      nodes.push(label);
    }
  }
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/bannerBand.js
var bannerBand = (input, tokens, region) => {
  const role = tokens.type[input.role ?? "title"];
  const fillRole = input.fill ?? "foreground";
  const fill = fillRole === "muted" ? tokens.palette.muted : fillRole === "accent" ? tokens.palette.accent : fillRole === "accentSecondary" ? tokens.palette.accentSecondary ?? tokens.palette.foreground : tokens.palette.foreground;
  const band = {
    kind: "view",
    shape: input.parallelogram ? "parallelogram" : "rect",
    rect: { ...region },
    fill,
    decorative: false
  };
  const text = {
    kind: "text",
    rect: { ...region },
    content: role.transform === "upper" ? input.text.toUpperCase() : input.text,
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle"
    },
    zIndex: 1,
    autoFit: false
  };
  return { nodes: [band, text], overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/connectorLine.js
function connectorBounds(input, region) {
  if (input.bounds === "region")
    return { ...region };
  const lineWidth = input.width ?? 1;
  const arrowPad = input.arrowStart || input.arrowEnd ? 8 : 0;
  const pad = Math.max(2, lineWidth / 2) + arrowPad;
  const minX = Math.min(input.start.x, input.end.x);
  const maxX = Math.max(input.start.x, input.end.x);
  const minY = Math.min(input.start.y, input.end.y);
  const maxY = Math.max(input.start.y, input.end.y);
  return {
    left: minX - pad,
    top: minY - pad,
    width: Math.max(1, maxX - minX) + pad * 2,
    height: Math.max(1, maxY - minY) + pad * 2
  };
}
var connectorLine = (input, tokens, region) => {
  const colorRole = input.color ?? "faint";
  const color = colorRole === "foreground" ? tokens.palette.foreground : colorRole === "muted" ? tokens.palette.muted : colorRole === "accent" ? tokens.palette.accent : colorRole === "rule" ? tokens.palette.rule : tokens.palette.faint;
  const node = {
    kind: "connector",
    rect: connectorBounds(input, region),
    connectorKind: input.kind ?? "straight",
    start: input.start,
    end: input.end,
    lineWidth: input.width ?? 1,
    lineColor: color,
    lineDashStyle: input.dashStyle ?? "solid",
    arrowStart: input.arrowStart,
    arrowEnd: input.arrowEnd
  };
  return { nodes: [node], overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/groupBorder.js
var groupBorder = (input, tokens, region) => {
  const colorRole = input.color ?? "muted";
  const color = colorRole === "foreground" ? tokens.palette.foreground : colorRole === "faint" ? tokens.palette.faint : colorRole === "accent" ? tokens.palette.accent : tokens.palette.muted;
  const nodes = [];
  const border = {
    kind: "view",
    shape: "rect",
    rect: { ...region },
    border: {
      width: input.width ?? 1,
      color,
      style: input.style ?? "dashed"
    },
    decorative: true
  };
  nodes.push(border);
  if (input.label) {
    const caption = tokens.type.caption;
    const labelW = Math.min(140, region.width * 0.4);
    const labelH = caption.size * 1.6;
    const label = {
      kind: "text",
      rect: {
        left: region.left + region.width - labelW - 4,
        top: region.top + region.height - labelH - 2,
        width: labelW,
        height: labelH
      },
      content: input.label,
      style: {
        family: caption.family,
        weight: caption.weight,
        size: caption.size,
        lineHeight: caption.lineHeight,
        color,
        align: "right",
        verticalAlign: "middle"
      },
      zIndex: 1,
      autoFit: false
    };
    nodes.push(label);
  }
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/primitives/pageStamp.js
var pageStamp = (input, tokens, region) => {
  const nodes = [];
  if (input.src) {
    const image = {
      kind: "image",
      rect: { ...region },
      src: input.src,
      alt: input.alt,
      decorative: !input.alt
    };
    nodes.push(image);
  } else if (input.fallbackText) {
    const eyebrow = tokens.type.eyebrow;
    const text = {
      kind: "text",
      rect: { ...region },
      content: eyebrow.transform === "upper" ? input.fallbackText.toUpperCase() : input.fallbackText,
      style: {
        family: eyebrow.family,
        weight: eyebrow.weight,
        size: eyebrow.size,
        letterSpacing: eyebrow.letterSpacing,
        color: tokens.palette.faint,
        align: "right",
        verticalAlign: "middle"
      },
      autoFit: false
    };
    nodes.push(text);
  }
  return { nodes, overflow: { kind: "fit" } };
};

// ../pptx-primitives/dist/util/fontkitProvider.js
var PX_PER_PT2 = 96 / 72;

// ../pptx-primitives/dist/ast/toPaperNodes.js
var PT_TO_PX = 96 / 72;

// ../protocol/src/composition.ts
var trendSchema = external_exports.enum(["up", "down", "flat"]);
var trendOrNoneSchema = external_exports.enum(["up", "down", "flat", "none"]);
var TitleBlockInputSchema = external_exports.strictObject({
  title: external_exports.string().min(1),
  eyebrow: external_exports.string().min(1).optional(),
  subtitle: external_exports.string().min(1).optional()
});
var BulletListInputSchema = external_exports.strictObject({
  items: external_exports.array(
    external_exports.strictObject({
      text: external_exports.string().min(1),
      level: external_exports.number().int().min(1).max(2).optional()
    })
  ).min(1).max(24),
  resume: external_exports.strictObject({ startIndex: external_exports.number().int().min(0) }).optional()
});
var SectionRibbonInputSchema = external_exports.strictObject({
  label: external_exports.string().min(1)
});
var SectionTagInputSchema = external_exports.strictObject({
  label: external_exports.string().min(1),
  fill: external_exports.enum(["foreground", "muted", "accent"]).optional(),
  transform: external_exports.enum(["none", "upper"]).optional()
});
var SourceLineInputSchema = external_exports.strictObject({
  content: external_exports.string().min(1),
  kind: external_exports.enum(["source", "note", "plain"]).optional(),
  align: external_exports.enum(["left", "right"]).optional()
});
var TextBlockTextRunSchema = external_exports.strictObject({
  text: external_exports.string().min(1),
  bold: external_exports.boolean().optional(),
  italic: external_exports.boolean().optional(),
  color: external_exports.string().optional(),
  fontSize: external_exports.number().positive().optional(),
  fontFamily: external_exports.string().optional(),
  underline: external_exports.boolean().optional()
});
var TextBlockBulletConfigSchema = external_exports.union([
  external_exports.strictObject({
    type: external_exports.literal("char").optional(),
    char: external_exports.string().min(1),
    color: external_exports.string().optional(),
    size: external_exports.number().positive().optional(),
    fontFamily: external_exports.string().optional()
  }),
  external_exports.strictObject({
    type: external_exports.literal("autoNum"),
    scheme: external_exports.enum([
      "arabicPeriod",
      "arabicParenR",
      "romanUcPeriod",
      "romanLcPeriod",
      "alphaUcPeriod",
      "alphaLcPeriod",
      "alphaLcParenR",
      "alphaUcParenR"
    ]),
    startAt: external_exports.number().int().min(1).optional()
  }),
  external_exports.strictObject({ type: external_exports.literal("none") })
]);
var TextBlockParagraphSchema = external_exports.strictObject({
  runs: external_exports.array(TextBlockTextRunSchema).min(1),
  align: external_exports.enum(["left", "center", "right", "justify"]).optional(),
  level: external_exports.number().int().min(0).max(8).optional(),
  indent: external_exports.number().optional(),
  marginLeft: external_exports.number().optional(),
  hangingIndent: external_exports.number().optional(),
  spaceBefore: external_exports.number().optional(),
  spaceAfter: external_exports.number().optional(),
  bullet: TextBlockBulletConfigSchema.optional()
});
var TextBlockColorRoleSchema = external_exports.enum([
  "foreground",
  "muted",
  "faint",
  "accent",
  "accentInverse",
  "accentSecondary"
]);
var TextBlockFillRoleSchema = external_exports.enum([
  "foreground",
  "muted",
  "faint",
  "accent",
  "accentSecondary",
  "surface",
  "none"
]);
var TextBlockBorderRoleSchema = external_exports.enum([
  "foreground",
  "muted",
  "faint",
  "accent",
  "rule"
]);
var TextBlockInputSchema = external_exports.strictObject({
  content: external_exports.union([
    external_exports.string().min(1),
    external_exports.array(TextBlockParagraphSchema).min(1).max(40),
    external_exports.array(TextBlockTextRunSchema).min(1).max(32)
  ]),
  role: external_exports.enum(["display", "title", "body", "caption", "eyebrow"]).optional(),
  fill: external_exports.union([TextBlockFillRoleSchema, external_exports.string()]).optional(),
  border: external_exports.strictObject({
    color: external_exports.union([TextBlockBorderRoleSchema, external_exports.string()]).optional(),
    width: external_exports.number().min(0).optional(),
    style: external_exports.enum(["solid", "dashed", "dotted"]).optional()
  }).optional(),
  insets: external_exports.strictObject({
    top: external_exports.number().min(0).optional(),
    right: external_exports.number().min(0).optional(),
    bottom: external_exports.number().min(0).optional(),
    left: external_exports.number().min(0).optional()
  }).optional(),
  align: external_exports.enum(["left", "center", "right"]).optional(),
  verticalAlign: external_exports.enum(["top", "middle", "bottom"]).optional(),
  color: external_exports.union([TextBlockColorRoleSchema, external_exports.string()]).optional(),
  italic: external_exports.boolean().optional(),
  weight: external_exports.number().int().min(100).max(900).optional(),
  size: external_exports.number().positive().optional(),
  lineHeight: external_exports.number().positive().optional().describe(
    "Line height as a multiple of font size (e.g. 1.4 for 1.4\xD7 spacing). Values \u2265 4 are deprecated legacy points."
  ),
  rotation: external_exports.number().min(-180).max(180).optional()
});
var InfoCardInputSchema = external_exports.strictObject({
  sideLabel: external_exports.strictObject({
    text: external_exports.string().min(1),
    position: external_exports.enum(["left", "top"]).optional(),
    fill: external_exports.union([TextBlockFillRoleSchema, external_exports.string()]).optional(),
    width: external_exports.number().positive().optional(),
    height: external_exports.number().positive().optional()
  }).optional(),
  lead: external_exports.union([external_exports.string().min(1), external_exports.array(TextBlockTextRunSchema).min(1).max(16)]).optional(),
  body: external_exports.array(
    external_exports.strictObject({
      text: external_exports.string().min(1),
      level: external_exports.number().int().min(1).max(2).optional()
    })
  ).min(1).max(24),
  footer: external_exports.strictObject({
    text: external_exports.union([
      external_exports.string().min(1),
      external_exports.array(TextBlockTextRunSchema).min(1).max(16)
    ]),
    style: external_exports.enum(["italic-quote", "plain"]).optional()
  }).optional(),
  fill: external_exports.union([TextBlockFillRoleSchema, external_exports.string()]).optional(),
  border: external_exports.strictObject({
    color: external_exports.union([TextBlockBorderRoleSchema, external_exports.string()]).optional(),
    width: external_exports.number().min(0).optional()
  }).optional(),
  padding: external_exports.number().min(0).optional(),
  gap: external_exports.number().min(0).optional()
});
var TextRunSchemaForMatrix = external_exports.strictObject({
  text: external_exports.string().min(1),
  bold: external_exports.boolean().optional(),
  italic: external_exports.boolean().optional(),
  color: external_exports.string().optional(),
  fontSize: external_exports.number().positive().optional(),
  fontFamily: external_exports.string().optional(),
  underline: external_exports.boolean().optional()
});
var BulletConfigSchema = external_exports.union([
  external_exports.strictObject({
    type: external_exports.literal("char").optional(),
    char: external_exports.string().min(1),
    color: external_exports.string().optional(),
    size: external_exports.number().positive().optional(),
    fontFamily: external_exports.string().optional()
  }),
  external_exports.strictObject({
    type: external_exports.literal("autoNum"),
    scheme: external_exports.enum([
      "arabicPeriod",
      "arabicParenR",
      "romanUcPeriod",
      "romanLcPeriod",
      "alphaUcPeriod",
      "alphaLcPeriod",
      "alphaLcParenR",
      "alphaUcParenR"
    ]),
    startAt: external_exports.number().int().min(1).optional()
  }),
  external_exports.strictObject({ type: external_exports.literal("none") })
]);
var ParagraphSchemaForMatrix = external_exports.strictObject({
  runs: external_exports.array(TextRunSchemaForMatrix).min(1),
  align: external_exports.enum(["left", "center", "right", "justify"]).optional(),
  level: external_exports.number().int().min(0).max(8).optional(),
  indent: external_exports.number().optional(),
  marginLeft: external_exports.number().optional(),
  hangingIndent: external_exports.number().optional(),
  spaceBefore: external_exports.number().optional(),
  spaceAfter: external_exports.number().optional(),
  bullet: BulletConfigSchema.optional()
});
var MatrixTableInputSchema = external_exports.strictObject({
  columnHeaders: external_exports.array(external_exports.union([external_exports.string(), external_exports.null()])).optional(),
  // Per-column header fill role override. Index [0] is the row-label
  // corner cell; [1..N] correspond to data columns. null = use the
  // table-wide default (accent). Used by Bain p6 to render Goods/Travel
  // headers in accentSecondary (Bain Sea blue) while Local stays muted.
  columnHeaderFills: external_exports.array(external_exports.union([external_exports.enum(["foreground", "muted", "accent", "accentSecondary"]), external_exports.null()])).optional(),
  rows: external_exports.array(
    external_exports.strictObject({
      // Label types — discriminator is the element shape, same union
      // ordering rules as cells.
      label: external_exports.union([
        external_exports.string().min(1),
        external_exports.array(ParagraphSchemaForMatrix).min(1).max(8),
        external_exports.array(TextRunSchemaForMatrix).min(1).max(16)
      ]),
      // Cell types — discriminator is the element shape:
      //   string         → plain
      //   string[]       → bulleted-list sugar (literal "• " prefix)
      //   TextRun[]      → rich-runs paragraph (element has `text`)
      //   Paragraph[]    → bullet hierarchy (element has `runs`)
      // Order matters in the union: Paragraph[] must precede TextRun[]
      // since both are arrays-of-objects; Paragraph has the deeper
      // shape so we test it first.
      cells: external_exports.array(
        external_exports.union([
          external_exports.string(),
          external_exports.array(external_exports.string()).max(8),
          external_exports.array(ParagraphSchemaForMatrix).min(1).max(20),
          external_exports.array(TextRunSchemaForMatrix).min(1).max(16)
        ])
      ).max(8),
      accent: external_exports.boolean().optional(),
      labelFill: external_exports.enum(["foreground", "muted", "faint", "accent"]).optional()
    })
  ).min(1).max(20),
  rowLabelWidth: external_exports.number().positive().optional(),
  labelColumnWidthRatio: external_exports.number().min(0.05).max(0.6).optional(),
  rowLabelStyle: external_exports.enum(["filled", "plain"]).optional(),
  rowLabelRotation: external_exports.number().min(-180).max(180).optional(),
  minRowHeight: external_exports.number().positive().optional(),
  rowHeight: external_exports.number().positive().optional(),
  distributeRows: external_exports.boolean().optional(),
  /**
   * Per-data-column relative widths. Length must equal the number of
   * data columns (excluding the row-label column). Values are relative
   * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
   * When supplied, `labelColumnWidthRatio`-driven distribution is
   * overridden. Use this when one column has long values that would
   * otherwise force every other cell to wrap.
   */
  colW: external_exports.array(external_exports.number().positive()).min(1).max(8).optional(),
  /**
   * How to handle a data cell whose content would overflow its column width:
   *   - "wrap"     — wrap to multiple lines (default; preserves all text).
   *   - "ellipsis" — truncate to a single line and append "…" when text
   *                  exceeds column width. Use for dense comparison tables
   *                  where row height parity is more important than full
   *                  text fidelity.
   *   - "shrink"   — iteratively reduce font size (down to 8pt floor) until
   *                  the cell fits on a single line.
   *
   * Applies only to plain-string and TextRun[] cells. string[] (bulleted)
   * and Paragraph[] (rich-paragraph) cells always wrap, since their author
   * already structured the content as multi-line.
   */
  wrapPolicy: external_exports.enum(["wrap", "ellipsis", "shrink"]).optional(),
  resume: external_exports.strictObject({ startRowIndex: external_exports.number().int().min(0) }).optional()
});
var ComparisonBandInputSchema = external_exports.strictObject({
  columns: external_exports.array(external_exports.string()).min(2).max(8),
  rows: external_exports.array(
    external_exports.strictObject({
      label: external_exports.string().min(1),
      values: external_exports.array(external_exports.string()).min(1).max(8),
      accent: external_exports.boolean().optional()
    })
  ).min(1).max(20),
  resume: external_exports.strictObject({ startRowIndex: external_exports.number().int().min(0) }).optional(),
  labelColumnWidthRatio: external_exports.number().min(0.05).max(0.6).optional()
});
var StepTimelineInputSchema = external_exports.strictObject({
  steps: external_exports.array(
    external_exports.strictObject({
      tag: external_exports.string().min(1),
      label: external_exports.string().min(1),
      description: external_exports.string().optional()
    })
  ).min(2).max(10)
});
var WaterfallBarsInputSchema = external_exports.strictObject({
  steps: external_exports.array(
    external_exports.strictObject({
      kind: external_exports.enum(["start", "end", "up", "down"]),
      label: external_exports.string().min(1),
      value: external_exports.number(),
      valueLabel: external_exports.string().optional()
    })
  ).min(3).max(20),
  barWidthRatio: external_exports.number().min(0.1).max(1).optional(),
  minStepWidth: external_exports.number().positive().optional(),
  showConnectors: external_exports.boolean().optional()
});
var OrgTreeInputSchema = external_exports.strictObject({
  root: external_exports.strictObject({
    title: external_exports.string().min(1),
    subtitle: external_exports.string().optional()
  }),
  children: external_exports.array(
    external_exports.strictObject({
      title: external_exports.string().min(1),
      subtitle: external_exports.string().optional(),
      accent: external_exports.boolean().optional()
    })
  ).min(1).max(8),
  rootHeightRatio: external_exports.number().min(0.1).max(0.6).optional(),
  minChildWidth: external_exports.number().positive().optional(),
  childGap: external_exports.number().nonnegative().optional(),
  rootFill: external_exports.enum(["foreground", "surface"]).optional()
});
var TombstoneStackInputSchema = external_exports.strictObject({
  tiles: external_exports.array(
    external_exports.strictObject({
      logo: external_exports.string().optional(),
      title: external_exports.string().min(1),
      body: external_exports.string().optional(),
      accent: external_exports.boolean().optional()
    })
  ).min(1).max(20),
  columns: external_exports.number().int().min(1).max(6).optional(),
  rowGap: external_exports.number().nonnegative().optional(),
  columnGap: external_exports.number().nonnegative().optional(),
  logoHeight: external_exports.number().nonnegative().optional(),
  resume: external_exports.strictObject({ startTileIndex: external_exports.number().int().min(0) }).optional(),
  compact: external_exports.boolean().optional()
});
var TocTilesInputSchema = external_exports.strictObject({
  tiles: external_exports.array(
    external_exports.strictObject({
      marker: external_exports.union([external_exports.string().min(1), external_exports.number()]),
      title: external_exports.string().min(1),
      body: external_exports.string().optional()
    })
  ).min(1).max(8),
  columns: external_exports.number().int().min(1).max(8).optional(),
  columnGap: external_exports.number().nonnegative().optional(),
  markerSizePt: external_exports.number().positive().optional()
});
var MetricStackInputSchema = external_exports.strictObject({
  rows: external_exports.array(
    external_exports.strictObject({
      label: external_exports.string().min(1),
      value: external_exports.string().min(1),
      delta: external_exports.string().optional(),
      trend: trendSchema.optional()
    })
  ).min(1).max(8),
  resume: external_exports.strictObject({ startIndex: external_exports.number().int().min(0) }).optional()
});
var KpiHeroInputSchema = external_exports.strictObject({
  label: external_exports.string().min(1),
  value: external_exports.string().min(1),
  delta: external_exports.string().optional(),
  trend: trendSchema.optional(),
  support: external_exports.string().optional(),
  verticalAlign: external_exports.enum(["top", "center"]).optional()
});
var ChartBlockInputSchema = external_exports.strictObject({
  chartData: external_exports.unknown(),
  altText: external_exports.string().optional(),
  preserveCallerStyling: external_exports.boolean().optional()
});
var ImageBleedInputSchema = external_exports.strictObject({
  src: external_exports.string().min(1).optional(),
  alt: external_exports.string().optional(),
  crop: external_exports.strictObject({
    left: external_exports.number().min(0).max(1),
    top: external_exports.number().min(0).max(1),
    right: external_exports.number().min(0).max(1),
    bottom: external_exports.number().min(0).max(1)
  }).optional(),
  bleed: external_exports.enum(["full", "half", "quarter", "inline", "none"]).optional(),
  fallbackText: external_exports.string().optional(),
  overlay: external_exports.strictObject({
    text: external_exports.string().min(1),
    role: external_exports.enum(["display", "title", "body", "caption", "eyebrow", "nav"]).optional(),
    align: external_exports.enum(["left", "center", "right"]).optional(),
    verticalAlign: external_exports.enum(["top", "middle", "bottom"]).optional()
  }).optional()
});
var QuadrantMapInputSchema = external_exports.strictObject({
  xAxisLabel: external_exports.strictObject({ low: external_exports.string().min(1), high: external_exports.string().min(1) }).optional(),
  yAxisLabel: external_exports.strictObject({ low: external_exports.string().min(1), high: external_exports.string().min(1) }).optional(),
  quadrants: external_exports.array(external_exports.string().min(1)).length(4).optional(),
  points: external_exports.array(
    external_exports.strictObject({
      name: external_exports.string().min(1),
      x: external_exports.number().min(0).max(100),
      y: external_exports.number().min(0).max(100),
      emphasis: external_exports.enum(["primary", "secondary"]).optional()
    })
  ).max(24).optional(),
  dotRadius: external_exports.number().positive().optional(),
  axisLabelReserve: external_exports.number().nonnegative().optional()
});
var HarveyBallInputSchema = external_exports.strictObject({
  filled: external_exports.union([external_exports.literal(0), external_exports.literal(1), external_exports.literal(2), external_exports.literal(3), external_exports.literal(4)])
});
var TextRunSchemaForCallout = external_exports.strictObject({
  text: external_exports.string().min(1),
  bold: external_exports.boolean().optional(),
  italic: external_exports.boolean().optional(),
  color: external_exports.string().optional(),
  fontSize: external_exports.number().positive().optional(),
  fontFamily: external_exports.string().optional(),
  underline: external_exports.boolean().optional()
});
var CalloutBoxInputSchema = external_exports.strictObject({
  content: external_exports.union([external_exports.string().min(1), external_exports.array(TextRunSchemaForCallout).min(1)]),
  fill: external_exports.enum(["surface", "muted", "faint", "accent"]).optional(),
  borderColor: external_exports.enum(["foreground", "muted", "faint", "accent"]).optional(),
  borderWidth: external_exports.number().nonnegative().optional(),
  role: external_exports.enum(["body", "caption", "eyebrow"]).optional(),
  shape: external_exports.enum(["rect", "roundRect"]).optional()
});
var ChevronArrowInputSchema = external_exports.strictObject({
  direction: external_exports.enum(["left", "right"]).optional(),
  label: external_exports.string().optional(),
  fill: external_exports.enum(["accent", "foreground", "muted"]).optional()
});
var NumberedChipInputSchema = external_exports.strictObject({
  index: external_exports.number().int(),
  shape: external_exports.enum(["rect", "ellipse", "roundRect"]).optional(),
  fill: external_exports.enum(["foreground", "muted", "accent"]).optional(),
  prefix: external_exports.string().optional(),
  suffix: external_exports.string().optional(),
  size: external_exports.number().positive().optional(),
  width: external_exports.number().positive().optional(),
  height: external_exports.number().positive().optional(),
  anchor: external_exports.enum(["topLeft", "topRight", "bottomLeft", "bottomRight", "center"]).optional()
});
var DiagonalStampInputSchema = external_exports.strictObject({
  text: external_exports.string().min(1),
  rotation: external_exports.number().optional(),
  color: external_exports.enum(["muted", "faint", "foreground", "accent"]).optional()
});
var LegendItemSchema = external_exports.strictObject({
  color: external_exports.string().min(1),
  label: external_exports.string().min(1),
  value: external_exports.string().optional()
});
var LegendTableInputSchema = external_exports.strictObject({
  items: external_exports.array(LegendItemSchema).min(1).max(20),
  direction: external_exports.enum(["vertical", "horizontal"]).optional()
});
var BannerBandInputSchema = external_exports.strictObject({
  text: external_exports.string().min(1),
  role: external_exports.enum(["display", "title", "body", "eyebrow"]).optional(),
  fill: external_exports.enum(["foreground", "muted", "accent", "accentSecondary"]).optional(),
  parallelogram: external_exports.boolean().optional()
});
var ConnectorLineInputSchema = external_exports.strictObject({
  kind: external_exports.enum(["straight", "elbow", "curved"]).optional(),
  start: external_exports.strictObject({ x: external_exports.number(), y: external_exports.number() }),
  end: external_exports.strictObject({ x: external_exports.number(), y: external_exports.number() }),
  width: external_exports.number().positive().optional(),
  color: external_exports.enum(["foreground", "muted", "faint", "accent", "rule"]).optional(),
  dashStyle: external_exports.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
  arrowStart: external_exports.boolean().optional(),
  arrowEnd: external_exports.boolean().optional(),
  bounds: external_exports.enum(["endpoints", "region"]).optional()
});
var GroupBorderInputSchema = external_exports.strictObject({
  label: external_exports.string().optional(),
  color: external_exports.enum(["foreground", "muted", "faint", "accent"]).optional(),
  width: external_exports.number().positive().optional(),
  style: external_exports.enum(["solid", "dashed", "dotted"]).optional()
});
var PageStampInputSchema = external_exports.strictObject({
  src: external_exports.string().optional(),
  alt: external_exports.string().optional(),
  fallbackText: external_exports.string().optional()
});
var PRIMITIVE_REGISTRY = {
  titleBlock: { schema: TitleBlockInputSchema, fn: titleBlock },
  bulletList: { schema: BulletListInputSchema, fn: bulletList },
  sectionRibbon: { schema: SectionRibbonInputSchema, fn: sectionRibbon },
  sectionTag: { schema: SectionTagInputSchema, fn: sectionTag },
  sourceLine: { schema: SourceLineInputSchema, fn: sourceLine },
  textBlock: { schema: TextBlockInputSchema, fn: textBlock },
  infoCard: { schema: InfoCardInputSchema, fn: infoCard },
  matrixTable: { schema: MatrixTableInputSchema, fn: matrixTable },
  comparisonBand: { schema: ComparisonBandInputSchema, fn: comparisonBand },
  stepTimeline: { schema: StepTimelineInputSchema, fn: stepTimeline },
  waterfallBars: { schema: WaterfallBarsInputSchema, fn: waterfallBars },
  orgTree: { schema: OrgTreeInputSchema, fn: orgTree },
  tombstoneStack: { schema: TombstoneStackInputSchema, fn: tombstoneStack },
  tocTiles: { schema: TocTilesInputSchema, fn: tocTiles },
  metricStack: { schema: MetricStackInputSchema, fn: metricStack },
  kpiHero: { schema: KpiHeroInputSchema, fn: kpiHero },
  chartBlock: { schema: ChartBlockInputSchema, fn: chartBlock },
  quadrantMap: { schema: QuadrantMapInputSchema, fn: quadrantMap },
  imageBleed: { schema: ImageBleedInputSchema, fn: imageBleed },
  // Phase 9.
  harveyBall: { schema: HarveyBallInputSchema, fn: harveyBall },
  calloutBox: { schema: CalloutBoxInputSchema, fn: calloutBox },
  chevronArrow: { schema: ChevronArrowInputSchema, fn: chevronArrow },
  numberedChip: { schema: NumberedChipInputSchema, fn: numberedChip },
  diagonalStamp: { schema: DiagonalStampInputSchema, fn: diagonalStamp },
  legendTable: { schema: LegendTableInputSchema, fn: legendTable },
  bannerBand: { schema: BannerBandInputSchema, fn: bannerBand },
  connectorLine: { schema: ConnectorLineInputSchema, fn: connectorLine },
  groupBorder: { schema: GroupBorderInputSchema, fn: groupBorder },
  pageStamp: { schema: PageStampInputSchema, fn: pageStamp }
};
var COMPOSITION_PRIMITIVE_NAMES = Object.keys(
  PRIMITIVE_REGISTRY
);
var RegionGridSchema = external_exports.strictObject({
  col: external_exports.number().int().min(0).max(11),
  row: external_exports.number().int().min(0).max(11),
  colSpan: external_exports.number().int().min(1).max(12),
  rowSpan: external_exports.number().int().min(1).max(12)
}).refine(
  (r) => r.col + r.colSpan <= 12 && r.row + r.rowSpan <= 12,
  { message: "Region escapes the 12\xD712 grid (col+colSpan or row+rowSpan > 12)" }
);
var RegionPixelSchema = external_exports.strictObject({
  x: external_exports.number(),
  y: external_exports.number(),
  w: external_exports.number().positive(),
  h: external_exports.number().positive()
});
var RegionSchema = external_exports.union([RegionGridSchema, RegionPixelSchema]);
var BlockZIndexSchema = external_exports.number().finite().optional();
var blockVariant = (name) => external_exports.strictObject({
  primitive: external_exports.literal(name),
  region: RegionSchema,
  zIndex: BlockZIndexSchema,
  input: PRIMITIVE_REGISTRY[name].schema
});
var RegisteredBlockSchema = external_exports.discriminatedUnion("primitive", [
  blockVariant("titleBlock"),
  blockVariant("bulletList"),
  blockVariant("sectionRibbon"),
  blockVariant("sectionTag"),
  blockVariant("sourceLine"),
  blockVariant("textBlock"),
  blockVariant("infoCard"),
  blockVariant("matrixTable"),
  blockVariant("comparisonBand"),
  blockVariant("stepTimeline"),
  blockVariant("waterfallBars"),
  blockVariant("orgTree"),
  blockVariant("tombstoneStack"),
  blockVariant("tocTiles"),
  blockVariant("metricStack"),
  blockVariant("kpiHero"),
  blockVariant("chartBlock"),
  blockVariant("quadrantMap"),
  blockVariant("imageBleed"),
  // Phase 9.
  blockVariant("harveyBall"),
  blockVariant("calloutBox"),
  blockVariant("chevronArrow"),
  blockVariant("numberedChip"),
  blockVariant("diagonalStamp"),
  blockVariant("legendTable"),
  blockVariant("bannerBand"),
  blockVariant("connectorLine"),
  blockVariant("groupBorder"),
  blockVariant("pageStamp")
]);
var ContainerBlockSchema = external_exports.lazy(
  () => external_exports.strictObject({
    primitive: external_exports.literal("container"),
    region: RegionSchema,
    zIndex: BlockZIndexSchema,
    input: external_exports.strictObject({
      blocks: external_exports.array(CompositionBlockSchema).min(1).max(48),
      background: external_exports.string().optional(),
      padding: external_exports.number().nonnegative().optional(),
      gap: external_exports.number().nonnegative().optional()
    })
  })
);
var CompositionBlockSchema = external_exports.lazy(
  () => external_exports.union([RegisteredBlockSchema, ContainerBlockSchema])
);
var COMPOSITION_GRID_COLS = 12;
var COMPOSITION_GRID_ROWS = 12;
function resolveBlockRect(region, canvas) {
  if ("x" in region) {
    return {
      left: region.x,
      top: region.y,
      width: region.w,
      height: region.h
    };
  }
  const colW = canvas.width / COMPOSITION_GRID_COLS;
  const rowH = canvas.height / COMPOSITION_GRID_ROWS;
  const gap = canvas.gap ?? 0;
  const halfGap = gap / 2;
  return {
    left: canvas.left + region.col * colW + halfGap,
    top: canvas.top + region.row * rowH + halfGap,
    width: Math.max(0, region.colSpan * colW - gap),
    height: Math.max(0, region.rowSpan * rowH - gap)
  };
}
function buildCompositionBlocks(blocks, tokens, canvas) {
  const nodes = [];
  const nodeKeys = [];
  const overflows = {};
  const applyBlockZIndex = (node, zIndex) => {
    if (zIndex === void 0) return node;
    return { ...node, zIndex };
  };
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const rect = resolveBlockRect(block.region, canvas);
    if (block.primitive === "container") {
      const input = block.input;
      const pad = input.padding ?? 0;
      const subCanvas = {
        left: rect.left + pad,
        top: rect.top + pad,
        width: Math.max(0, rect.width - pad * 2),
        height: Math.max(0, rect.height - pad * 2),
        gap: input.gap ?? canvas.gap
      };
      if (input.background) {
        nodes.push({
          kind: "view",
          shape: "rect",
          rect,
          fill: input.background,
          ...block.zIndex !== void 0 ? { zIndex: block.zIndex } : {},
          decorative: true
        });
        nodeKeys.push(`container_${i}`);
      }
      const nested = buildCompositionBlocks(input.blocks, tokens, subCanvas);
      nodes.push(...nested.nodes);
      nodeKeys.push(...nested.nodeKeys.map((key2) => `container_${i}/${key2}`));
      for (const [k, v] of Object.entries(nested.overflows)) {
        overflows[`container_${i}/${k}`] = v;
      }
      overflows[`container_${i}`] = "fit";
      continue;
    }
    const entry = PRIMITIVE_REGISTRY[block.primitive];
    const key = `${block.primitive}_${i}`;
    const result = entry.fn(block.input, tokens, rect);
    nodes.push(...result.nodes.map((node) => applyBlockZIndex(node, block.zIndex)));
    nodeKeys.push(...result.nodes.map(() => key));
    overflows[key] = result.overflow.kind;
  }
  return { nodes, nodeKeys, overflows };
}

// ../protocol/src/accessibility.ts
var AccessibilitySeveritySchema = external_exports.enum(["error", "warning", "info"]);
var AccessibilityIssueCodeSchema = external_exports.enum([
  "document.title_missing",
  "document.language_missing",
  "image.alt_missing",
  "structure.heading_skipped",
  "table.header_missing"
]);
var AccessibilityFormatSchema = external_exports.enum(["pptx", "docx", "xlsx", "pdf"]);
var AccessibilityConfigBaseSchema = external_exports.object({
  title: external_exports.string().min(1).optional(),
  language: external_exports.string().min(1).optional()
});
var AccessibilityLocationSchema = external_exports.object({
  elementPath: external_exports.string().min(1).optional(),
  pageIndex: external_exports.number().int().min(0).optional(),
  slideIndex: external_exports.number().int().min(0).optional(),
  sheetName: external_exports.string().min(1).optional()
});
var AccessibilityIssueSchema = external_exports.object({
  code: AccessibilityIssueCodeSchema,
  severity: AccessibilitySeveritySchema,
  message: external_exports.string().min(1),
  location: AccessibilityLocationSchema.optional(),
  suggestedFix: external_exports.string().min(1).optional()
});
var AccessibilitySummarySchema = external_exports.object({
  errors: external_exports.number().int().min(0),
  warnings: external_exports.number().int().min(0),
  infos: external_exports.number().int().min(0)
});
var AccessibilityReportSchema = external_exports.object({
  valid: external_exports.boolean(),
  summary: AccessibilitySummarySchema,
  issues: external_exports.array(AccessibilityIssueSchema),
  format: AccessibilityFormatSchema,
  standard: external_exports.string().min(1).optional()
});
var AccessibilityFixSchema = external_exports.object({
  code: AccessibilityIssueCodeSchema,
  action: external_exports.string().min(1),
  applied: external_exports.boolean(),
  target: external_exports.string().min(1).optional()
});
var AccessibilityRemediationResultSchema = external_exports.object({
  reportBefore: AccessibilityReportSchema,
  reportAfter: AccessibilityReportSchema,
  fixesApplied: external_exports.array(AccessibilityFixSchema)
});

// ../protocol/src/extension-runtime.ts
var JsonScalarSchema = external_exports.union([external_exports.string(), external_exports.number().finite(), external_exports.boolean(), external_exports.null()]);
var JsonValueSchema = external_exports.lazy(() => external_exports.union([
  JsonScalarSchema,
  external_exports.array(JsonValueSchema),
  external_exports.record(external_exports.string(), JsonValueSchema)
]));
var StableCodeSchema = external_exports.string().regex(/^[A-Z][A-Z0-9_]{2,127}$/);
var Sha256Schema = external_exports.string().regex(/^[a-f0-9]{64}$/);
var ExtensionOperationSchema = external_exports.strictObject({
  name: external_exports.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  summary: external_exports.string().min(1).max(240),
  inputKinds: external_exports.array(external_exports.string().min(1)).min(1),
  outputKinds: external_exports.array(external_exports.string().min(1)).min(1)
});
var DeclaredCodeSchema = external_exports.strictObject({
  code: StableCodeSchema,
  description: external_exports.string().min(1).max(500)
});
var ExtensionManifestSchema = external_exports.strictObject({
  schemaVersion: external_exports.literal(1),
  id: external_exports.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/),
  version: external_exports.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  catalogItemId: external_exports.string().regex(/^(?:EX|A|O|G|D|W)\d{2}$/),
  title: external_exports.string().min(1).max(160),
  operations: external_exports.array(ExtensionOperationSchema).min(1),
  warningCodes: external_exports.array(DeclaredCodeSchema),
  lossCodes: external_exports.array(DeclaredCodeSchema)
}).superRefine((manifest, context) => {
  for (const [label, values] of [
    ["operation", manifest.operations.map((entry) => entry.name)],
    ["warning code", manifest.warningCodes.map((entry) => entry.code)],
    ["loss code", manifest.lossCodes.map((entry) => entry.code)]
  ]) {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: `Duplicate ${label} declarations are not allowed.` });
    }
  }
});
var ResourceBudgetSchema = external_exports.strictObject({
  maxInputBytes: external_exports.number().int().positive(),
  maxOutputBytes: external_exports.number().int().positive(),
  maxEntries: external_exports.number().int().positive(),
  maxDepth: external_exports.number().int().positive(),
  timeoutMs: external_exports.number().int().positive()
});
var DeterministicContextSchema = external_exports.strictObject({
  runId: external_exports.string().min(1).max(160),
  seed: external_exports.string().min(1).max(256),
  now: external_exports.iso.datetime({ offset: true }),
  network: external_exports.literal("disabled"),
  budget: ResourceBudgetSchema
});
var ExtensionRequestSchema = external_exports.strictObject({
  schemaVersion: external_exports.literal(1),
  extensionId: external_exports.string().min(1),
  operation: external_exports.string().min(1),
  input: JsonValueSchema,
  context: DeterministicContextSchema
});
var ExtensionLocatorSchema = external_exports.strictObject({
  artifactId: external_exports.string().min(1).max(256),
  scheme: external_exports.string().regex(/^[a-z][a-z0-9.-]{1,63}$/),
  value: external_exports.array(external_exports.union([external_exports.string(), external_exports.number().int().nonnegative()])).min(1)
});
var ExtensionDiagnosticSchema = external_exports.strictObject({
  code: StableCodeSchema,
  message: external_exports.string().min(1).max(2e3),
  severity: external_exports.enum(["info", "warning", "error"]).optional(),
  locator: ExtensionLocatorSchema.optional()
});
var ArtifactDescriptorSchema = external_exports.strictObject({
  name: external_exports.string().min(1).max(256),
  mediaType: external_exports.string().min(1).max(160),
  byteLength: external_exports.number().int().nonnegative(),
  sha256: Sha256Schema
});
var ExtensionSuccessSchema = external_exports.strictObject({
  status: external_exports.literal("ok"),
  output: JsonValueSchema,
  warnings: external_exports.array(ExtensionDiagnosticSchema),
  losses: external_exports.array(ExtensionDiagnosticSchema),
  artifacts: external_exports.array(ArtifactDescriptorSchema)
});
var ExtensionFailureSchema = external_exports.strictObject({
  status: external_exports.literal("error"),
  error: external_exports.strictObject({
    code: StableCodeSchema,
    message: external_exports.string().min(1).max(2e3),
    retryable: external_exports.boolean()
  }),
  warnings: external_exports.array(ExtensionDiagnosticSchema),
  losses: external_exports.array(ExtensionDiagnosticSchema),
  artifacts: external_exports.array(ArtifactDescriptorSchema)
});
var ExtensionResultSchema = external_exports.discriminatedUnion("status", [ExtensionSuccessSchema, ExtensionFailureSchema]);
var ProgressUpdateSchema = external_exports.strictObject({
  completed: external_exports.number().finite().nonnegative(),
  total: external_exports.number().finite().positive(),
  message: external_exports.string().min(1).max(500).optional()
}).refine((progress) => progress.completed <= progress.total, "completed cannot exceed total");
var ResourceUsageSchema = external_exports.strictObject({
  inputBytes: external_exports.number().int().nonnegative().optional(),
  outputBytes: external_exports.number().int().nonnegative().optional(),
  entries: external_exports.number().int().nonnegative().optional(),
  depth: external_exports.number().int().nonnegative().optional()
});
var ValidatorIssueSchema = external_exports.strictObject({
  code: StableCodeSchema,
  message: external_exports.string().min(1).max(2e3),
  severity: external_exports.enum(["info", "warning", "error"]),
  locator: ExtensionLocatorSchema.optional()
});
var ValidatorResultSchema = external_exports.strictObject({
  validator: external_exports.string().min(1).max(160),
  version: external_exports.string().min(1).max(160),
  required: external_exports.boolean(),
  status: external_exports.enum(["PASS", "FAIL", "ADVISORY", "BLOCKED_EXTERNAL"]),
  command: external_exports.string().min(1).max(2e3),
  issues: external_exports.array(ValidatorIssueSchema)
}).superRefine((result, context) => {
  if (result.required && result.status === "ADVISORY") {
    context.addIssue({ code: "custom", path: ["status"], message: "A required validator cannot be advisory." });
  }
  if (result.status === "PASS" && result.issues.some((issue) => issue.severity === "error")) {
    context.addIssue({ code: "custom", path: ["issues"], message: "A passing validator cannot contain error issues." });
  }
});
var FixtureDescriptorSchema = external_exports.strictObject({
  id: external_exports.string().regex(/^[a-z0-9][a-z0-9_-]{1,127}$/),
  kind: external_exports.enum(["minimal", "buyer_realistic", "unrelated_domain", "boundary", "hostile", "known_bad", "determinism", "round_trip", "composition"]),
  operation: external_exports.string().min(1),
  input: JsonValueSchema,
  expectedStatus: external_exports.enum(["ok", "error"]),
  validators: external_exports.array(external_exports.string().min(1))
});

// ../protocol/src/extension-v1.ts
var ExtensionV1RequestSchema = external_exports.strictObject({
  version: external_exports.literal("1.0"),
  request: ExtensionRequestSchema
});
var ExtensionV1ResultSchema = external_exports.strictObject({
  version: external_exports.literal("1.0"),
  result: ExtensionResultSchema,
  validators: external_exports.array(ValidatorResultSchema)
});

// ../protocol/src/operation-projection.ts
var EXTENSION_BUDGET_CEILING_MS = 10 * 60 * 1e3;

// ../protocol/src/minRegion.ts
var MIN_REGION_STATIC = {
  titleBlock: { colSpan: 6, rowSpan: 2 },
  bulletList: { colSpan: 4, rowSpan: 2 },
  sectionRibbon: { colSpan: 6, rowSpan: 1 },
  sectionTag: { colSpan: 2, rowSpan: 1 },
  sourceLine: { colSpan: 6, rowSpan: 1 },
  textBlock: { colSpan: 4, rowSpan: 2 },
  calloutBox: { colSpan: 4, rowSpan: 3 },
  bannerBand: { colSpan: 12, rowSpan: 2 },
  kpiHero: { colSpan: 5, rowSpan: 5 },
  comparisonBand: { colSpan: 8, rowSpan: 4 },
  stepTimeline: { colSpan: 8, rowSpan: 4 },
  waterfallBars: { colSpan: 8, rowSpan: 5 },
  orgTree: { colSpan: 8, rowSpan: 6 },
  tombstoneStack: { colSpan: 6, rowSpan: 4 },
  tocTiles: { colSpan: 8, rowSpan: 4 },
  chartBlock: { colSpan: 6, rowSpan: 6 },
  quadrantMap: { colSpan: 6, rowSpan: 6 },
  harveyBall: { colSpan: 1, rowSpan: 1 },
  chevronArrow: { colSpan: 4, rowSpan: 2 },
  numberedChip: { colSpan: 1, rowSpan: 1 },
  diagonalStamp: { colSpan: 4, rowSpan: 3 },
  legendTable: { colSpan: 4, rowSpan: 3 },
  pageStamp: { colSpan: 2, rowSpan: 1 }
};
var MIN_REGION_VARIABLE = {
  metricStack: (n) => ({ colSpan: 4, rowSpan: Math.max(2, n + 1) }),
  infoCard: (bodyItems) => ({ colSpan: 4, rowSpan: Math.max(6, bodyItems + 4) }),
  matrixTable: (rows, anyCellWraps = false) => ({
    colSpan: 12,
    rowSpan: (anyCellWraps ? rows * 2 : rows) + 2
  })
};
function minRegionFor(primitive, context) {
  if (primitive === "metricStack") {
    return MIN_REGION_VARIABLE.metricStack(context?.n ?? 3);
  }
  if (primitive === "infoCard") {
    return MIN_REGION_VARIABLE.infoCard(context?.n ?? 2);
  }
  if (primitive === "matrixTable") {
    return MIN_REGION_VARIABLE.matrixTable(context?.n ?? 4, context?.anyCellWraps ?? false);
  }
  const fixed = MIN_REGION_STATIC[primitive];
  return fixed ?? null;
}
function remediationFor(primitive, actual, minimum) {
  const parts = [];
  if (actual.colSpan !== void 0 && actual.colSpan < minimum.colSpan) {
    parts.push(`grow colSpan to ${minimum.colSpan}`);
  }
  if (actual.rowSpan !== void 0 && actual.rowSpan < minimum.rowSpan) {
    parts.push(`grow rowSpan to ${minimum.rowSpan}`);
  }
  if (parts.length === 0) {
    return `Reduce content density in this ${primitive}, or split into multiple blocks.`;
  }
  return `${parts.join(" and ")} (current ${actual.colSpan ?? "?"}\xD7${actual.rowSpan ?? "?"}, recommended floor ${minimum.colSpan}\xD7${minimum.rowSpan}).`;
}

// ../protocol/src/declarative.ts
var ShortTextSchema = external_exports.string().min(1).max(180);
var BodyTextSchema = external_exports.string().min(1).max(500);
var DeclarativeSlideBaseSchema = external_exports.strictObject({
  id: external_exports.string().min(1).optional(),
  notes: external_exports.array(external_exports.string().min(1).max(2e3)).max(6).optional()
});
var DeclarativeMetricSchema = external_exports.strictObject({
  label: external_exports.string().min(1).max(80),
  value: external_exports.string().min(1).max(80),
  delta: external_exports.string().max(80).optional(),
  trend: external_exports.enum(["up", "down", "flat", "none"]).optional()
});
var DeclarativeChartSeriesSchema = external_exports.strictObject({
  name: external_exports.string().min(1).max(80),
  dataPoints: external_exports.array(external_exports.strictObject({
    category: external_exports.string().min(1).max(120),
    value: external_exports.number().finite()
  })).min(1).max(128)
});
var DeclarativeChartSchema = external_exports.strictObject({
  // These category/series shapes are editable in both free and Pro builds.
  // Scatter needs x/y pairs and radar is Pro-only, so neither is silently
  // coerced through this intentionally small facade.
  kind: external_exports.enum(["bar", "line", "pie", "area", "doughnut"]),
  title: external_exports.string().min(1).max(180).optional(),
  series: external_exports.array(DeclarativeChartSeriesSchema).min(1).max(12)
}).superRefine((chart, ctx) => {
  const expectedCategories = chart.series[0]?.dataPoints.map((point) => point.category) ?? [];
  chart.series.slice(1).forEach((series, seriesIndex) => {
    const categories = series.dataPoints.map((point) => point.category);
    if (categories.length !== expectedCategories.length || categories.some((category, index) => category !== expectedCategories[index])) {
      ctx.addIssue({
        code: "custom",
        path: ["series", seriesIndex + 1, "dataPoints"],
        message: "Every chart series must use the same categories in the same order.",
        params: {
          runstampCode: "chart_category_mismatch",
          fix: "Use the first series' category list, in the same order, for every series."
        }
      });
    }
  });
  if ((chart.kind === "pie" || chart.kind === "doughnut") && chart.series.length !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["series"],
      message: `${chart.kind} charts require exactly one series.`,
      params: {
        runstampCode: "chart_series_count",
        fix: `Keep one series for the ${chart.kind} chart, or use a bar chart for multiple series.`
      }
    });
  }
});
var TitleSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: external_exports.literal("title"),
  title: ShortTextSchema,
  subtitle: external_exports.string().min(1).max(240).optional(),
  eyebrow: external_exports.string().min(1).max(80).optional()
});
var KpiRowSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: external_exports.literal("kpi-row"),
  title: ShortTextSchema.optional(),
  metrics: external_exports.array(DeclarativeMetricSchema).min(2).max(6)
});
var ChartSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: external_exports.literal("chart"),
  title: ShortTextSchema,
  subtitle: external_exports.string().min(1).max(240).optional(),
  chart: DeclarativeChartSchema
});
var BulletsSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: external_exports.literal("bullets"),
  title: ShortTextSchema,
  subtitle: external_exports.string().min(1).max(240).optional(),
  bullets: external_exports.array(BodyTextSchema).min(1).max(12)
});
var ComparisonSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: external_exports.literal("comparison"),
  title: ShortTextSchema,
  subtitle: external_exports.string().min(1).max(240).optional(),
  columns: external_exports.array(external_exports.string().min(1).max(80)).min(3).max(6),
  rows: external_exports.array(external_exports.strictObject({
    label: external_exports.string().min(1).max(120),
    values: external_exports.array(external_exports.string().min(1).max(240)).min(2).max(5),
    highlight: external_exports.boolean().optional()
  })).min(1).max(8)
}).superRefine((slide, ctx) => {
  slide.rows.forEach((row, rowIndex) => {
    if (row.values.length !== slide.columns.length - 1) {
      ctx.addIssue({
        code: "custom",
        path: ["rows", rowIndex, "values"],
        message: "Each comparison row needs one value for every data column.",
        params: {
          runstampCode: "comparison_column_mismatch",
          fix: `Provide exactly ${slide.columns.length - 1} values for this row.`
        }
      });
    }
  });
});
var TimelineSlideSchema = DeclarativeSlideBaseSchema.extend({
  layout: external_exports.literal("timeline"),
  title: ShortTextSchema,
  subtitle: external_exports.string().min(1).max(240).optional(),
  events: external_exports.array(external_exports.strictObject({
    label: external_exports.string().min(1).max(100),
    date: external_exports.string().min(1).max(80).optional(),
    description: external_exports.string().min(1).max(240).optional()
  })).min(2).max(8)
});
var DeclarativeLayoutSchema = external_exports.enum([
  "title",
  "kpi-row",
  "chart",
  "bullets",
  "comparison",
  "timeline"
]);
var DeclarativeSlideSchema = external_exports.discriminatedUnion("layout", [
  TitleSlideSchema,
  KpiRowSlideSchema,
  ChartSlideSchema,
  BulletsSlideSchema,
  ComparisonSlideSchema,
  TimelineSlideSchema
]);
var DeclarativeDocumentSchema = external_exports.strictObject({
  version: external_exports.literal("1.0").optional(),
  deckId: external_exports.string().min(1).optional(),
  title: ShortTextSchema,
  tokens: TokenBundleSchema.optional(),
  slides: external_exports.array(DeclarativeSlideSchema).min(1).max(200)
});
var DeclarativeValidationError = class extends Error {
  issues;
  constructor(issues) {
    super(`Invalid declarative document: ${issues.map((issue) => `${formatPath(issue.path)}: ${issue.fix}`).join("; ")}`);
    this.name = "DeclarativeValidationError";
    this.issues = issues;
  }
};
function inferTrend(delta) {
  if (!delta) return "none";
  if (/^\s*[+↑]/u.test(delta)) return "up";
  if (/^\s*[-−↓]/u.test(delta)) return "down";
  return "flat";
}
function toPresentationSpec(doc) {
  return {
    version: "2.0",
    ...doc.deckId ? { deckId: doc.deckId } : {},
    title: doc.title,
    ...doc.tokens ? { tokens: doc.tokens } : {},
    slides: doc.slides.map((slide) => {
      const common = {
        ...slide.id ? { id: slide.id } : {},
        ...slide.notes ? { notes: slide.notes } : {}
      };
      switch (slide.layout) {
        case "title":
          return {
            ...common,
            slideType: "composition",
            title: slide.title,
            gap: 16,
            blocks: [{
              primitive: "titleBlock",
              region: { col: 0, row: 2, colSpan: 12, rowSpan: 6 },
              input: {
                title: slide.title,
                ...slide.subtitle ? { subtitle: slide.subtitle } : {},
                ...slide.eyebrow ? { eyebrow: slide.eyebrow } : {}
              }
            }]
          };
        case "kpi-row":
          return {
            ...common,
            slideType: "kpi-grid",
            title: slide.title ?? doc.title,
            items: slide.metrics.map((metric) => ({
              label: metric.label,
              value: metric.value,
              trend: metric.trend ?? inferTrend(metric.delta),
              ...metric.delta ? { sublabel: metric.delta } : {}
            }))
          };
        case "chart": {
          const categories = slide.chart.series[0]?.dataPoints.map((point) => point.category) ?? [];
          return {
            ...common,
            slideType: "composition",
            title: slide.title,
            gap: 16,
            blocks: [
              {
                primitive: "titleBlock",
                region: { col: 0, row: 0, colSpan: 12, rowSpan: 2 },
                input: {
                  title: slide.title,
                  ...slide.subtitle ? { subtitle: slide.subtitle } : {}
                }
              },
              {
                primitive: "chartBlock",
                region: { col: 0, row: 3, colSpan: 12, rowSpan: 8 },
                input: {
                  altText: slide.chart.title ?? slide.title,
                  chartData: {
                    chartType: slide.chart.kind,
                    categories,
                    series: slide.chart.series.map((series) => ({
                      name: series.name,
                      values: series.dataPoints.map((point) => point.value)
                    })),
                    ...slide.chart.title ? { title: { text: slide.chart.title } } : {},
                    legend: { position: "bottom" }
                  }
                }
              }
            ]
          };
        }
        case "bullets":
          return {
            ...common,
            slideType: "title-body",
            title: slide.title,
            ...slide.subtitle ? { subtitle: slide.subtitle } : {},
            body: slide.bullets
          };
        case "comparison":
          return {
            ...common,
            slideType: "comparison-table",
            title: slide.title,
            ...slide.subtitle ? { subtitle: slide.subtitle } : {},
            columns: slide.columns,
            rows: slide.rows
          };
        case "timeline":
          return {
            ...common,
            slideType: "timeline",
            title: slide.title,
            ...slide.subtitle ? { subtitle: slide.subtitle } : {},
            events: slide.events
          };
      }
    })
  };
}
function formatPath(path) {
  if (path.length === 0) return "$";
  return path.reduce((result, segment) => typeof segment === "number" ? `${result}[${segment}]` : `${result}.${segment}`, "$");
}
function schemaPath(path) {
  return path.map((segment) => typeof segment === "symbol" ? String(segment) : segment);
}
function fixForZodIssue(issue) {
  const params = "params" in issue && issue.params && typeof issue.params === "object" ? issue.params : void 0;
  if (typeof params?.fix === "string") return params.fix;
  const path = formatPath(schemaPath(issue.path));
  switch (issue.code) {
    case "invalid_type":
      return `Set ${path} to the expected type (${issue.message}).`;
    case "too_small":
      return `Add the required content at ${path} (${issue.message}).`;
    case "too_big":
      return `Reduce the content at ${path} (${issue.message}).`;
    case "unrecognized_keys":
      return `Remove unsupported fields from ${path}: ${issue.keys.join(", ")}.`;
    case "invalid_value":
      return `Use one of the supported values at ${path} (${issue.message}).`;
    default:
      return `Correct ${path}: ${issue.message}`;
  }
}
function issueFromZod(issue) {
  const params = "params" in issue && issue.params && typeof issue.params === "object" ? issue.params : void 0;
  return {
    path: schemaPath(issue.path),
    code: typeof params?.runstampCode === "string" ? params.runstampCode : `schema_${issue.code}`,
    severity: "error",
    fix: fixForZodIssue(issue)
  };
}
function validate2(input) {
  const parsed = DeclarativeDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map(issueFromZod) };
  }
  return { ok: true, issues: [] };
}

// ../protocol/src/presets.ts
function cover(input) {
  const slide = {
    slideType: "title-body",
    title: input.title,
    body: input.subtitle ? [input.subtitle] : [""]
  };
  if (input.footer) {
    slide.chrome = { footer: { disclaimer: input.footer } };
  }
  return slide;
}
function actionTitleBlocks(eyebrow, title) {
  return [
    {
      primitive: "sectionTag",
      region: { col: 0, row: 0, colSpan: 4, rowSpan: 1 },
      input: { label: eyebrow, transform: "upper" }
    },
    {
      primitive: "textBlock",
      region: { col: 0, row: 1, colSpan: 12, rowSpan: 2 },
      input: { content: title, role: "title", size: 22, weight: 500 }
    }
  ];
}
function executiveSummary(input) {
  const blocks = [
    ...actionTitleBlocks("Executive summary", input.title ?? "Executive summary"),
    {
      primitive: "bulletList",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: input.risk ? 6 : 8 },
      input: {
        items: input.findings.slice(0, 6).map((text) => ({ text }))
      }
    }
  ];
  if (input.risk) {
    blocks.push({
      primitive: "bannerBand",
      region: { col: 0, row: 9, colSpan: 12, rowSpan: 2 },
      input: { text: input.risk, fill: "muted" }
    });
  }
  return {
    slideType: "composition",
    title: input.title ?? "Executive summary",
    blocks
  };
}
function decisionAsk(input) {
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "Decision ask", input.headline)
  ];
  if (input.metrics && input.metrics.length > 0) {
    const n = Math.min(input.metrics.length, 3);
    blocks.push({
      primitive: "metricStack",
      region: { col: 0, row: 4, colSpan: 12, rowSpan: Math.max(4, n + 1) },
      input: {
        rows: input.metrics.slice(0, 3).map((m) => ({
          label: m.label,
          value: m.value,
          trend: m.trend
        }))
      }
    });
  } else {
    blocks.push({
      primitive: "bannerBand",
      region: { col: 0, row: 5, colSpan: 12, rowSpan: 2 },
      input: { text: "Recommend approval to proceed" }
    });
  }
  return {
    slideType: "composition",
    title: input.headline,
    blocks
  };
}
function marketSize(input) {
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "Market sizing", input.title)
  ];
  const hasSegments = input.segments && input.segments.length > 0;
  if (hasSegments) {
    blocks.push({
      primitive: "kpiHero",
      region: { col: 0, row: 3, colSpan: 5, rowSpan: 6 },
      input: {
        label: input.total.label,
        value: input.total.value,
        support: input.total.support,
        verticalAlign: "center"
      }
    });
    const n = Math.min(input.segments.length, 6);
    blocks.push({
      primitive: "metricStack",
      region: { col: 5, row: 3, colSpan: 7, rowSpan: Math.max(4, n + 1) },
      input: {
        rows: input.segments.slice(0, 6).map((s) => ({
          label: s.label,
          value: s.value,
          delta: s.delta,
          trend: s.trend
        }))
      }
    });
  } else {
    blocks.push({
      primitive: "kpiHero",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 6 },
      input: {
        label: input.total.label,
        value: input.total.value,
        support: input.total.support,
        verticalAlign: "center"
      }
    });
  }
  if (input.source) {
    blocks.push({
      primitive: "sourceLine",
      region: { col: 0, row: 11, colSpan: 12, rowSpan: 1 },
      input: { content: input.source }
    });
  }
  return {
    slideType: "composition",
    title: input.title,
    blocks
  };
}
function competitiveLandscape(input) {
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "Competitive landscape", input.title),
    {
      primitive: "quadrantMap",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        xAxisLabel: input.xAxisLabel ?? { low: "Narrow scope", high: "Broad scope" },
        yAxisLabel: input.yAxisLabel ?? { low: "Low capability", high: "High capability" },
        quadrants: input.quadrants,
        points: input.competitors.slice(0, 24).map((c) => ({
          name: c.name,
          x: c.x,
          y: c.y,
          emphasis: c.emphasis
        }))
      }
    }
  ];
  return {
    slideType: "composition",
    title: input.title,
    blocks
  };
}
function unitEconomics(input) {
  const hasMetrics = input.metrics && input.metrics.length > 0;
  const waterfallRowSpan = hasMetrics ? 6 : 9;
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "Unit economics", input.title),
    {
      primitive: "waterfallBars",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: waterfallRowSpan },
      input: {
        steps: input.walk.slice(0, 20).map((s) => ({
          kind: s.kind,
          label: s.label,
          value: s.value,
          valueLabel: s.valueLabel
        }))
      }
    }
  ];
  if (hasMetrics) {
    const n = Math.min(input.metrics.length, 4);
    blocks.push({
      primitive: "metricStack",
      region: { col: 0, row: 9, colSpan: 12, rowSpan: Math.max(2, Math.ceil(n / 2) + 1) },
      input: {
        rows: input.metrics.slice(0, 4).map((m) => ({
          label: m.label,
          value: m.value,
          delta: m.delta,
          trend: m.trend
        }))
      }
    });
  }
  return {
    slideType: "composition",
    title: input.title,
    blocks
  };
}
function accountTargets(input) {
  const dataColumnHeaders = input.columns.slice(1);
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "Account targets", input.title),
    {
      primitive: "matrixTable",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        columnHeaders: [input.columns[0] ?? null, ...dataColumnHeaders],
        rows: input.accounts.slice(0, 20).map((a) => ({
          label: a.name,
          cells: a.cells.slice(0, dataColumnHeaders.length),
          accent: a.accent
        }))
      }
    }
  ];
  return {
    slideType: "composition",
    title: input.title,
    blocks
  };
}
function gtmComparison(input) {
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "GTM comparison", input.title),
    {
      primitive: "comparisonBand",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        columns: input.motions.slice(0, 8),
        rows: input.dimensions.slice(0, 20).map((d) => ({
          label: d.label,
          values: d.values.slice(0, input.motions.length),
          accent: d.accent
        }))
      }
    }
  ];
  return {
    slideType: "composition",
    title: input.title,
    blocks
  };
}
function roadmap(input) {
  const blocks = [
    ...actionTitleBlocks(input.eyebrow ?? "Roadmap", input.title),
    {
      primitive: "stepTimeline",
      region: { col: 0, row: 3, colSpan: 12, rowSpan: 9 },
      input: {
        steps: input.milestones.slice(0, 10).map((m) => ({
          tag: m.tag,
          label: m.label,
          description: m.description
        }))
      }
    }
  ];
  return {
    slideType: "composition",
    title: input.title,
    blocks
  };
}
var presets = {
  cover,
  executiveSummary,
  decisionAsk,
  marketSize,
  competitiveLandscape,
  unitEconomics,
  accountTargets,
  gtmComparison,
  roadmap
};

// ../protocol/src/index.ts
var HexColorSchema = external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/, "Expected a 6-digit hex color like #2563EB");
var RichTextArraySchema = external_exports.array(external_exports.string().min(1)).min(1).max(12);
var JsonScalarSchema2 = external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean(), external_exports.null()]);
var JsonValueSchema2 = external_exports.lazy(() => external_exports.union([
  JsonScalarSchema2,
  external_exports.array(JsonValueSchema2),
  external_exports.record(external_exports.string(), JsonValueSchema2)
]));
var ProtocolVersionSchema = external_exports.literal("2.0");
var LayoutFamilySchema = external_exports.enum([
  "editorial",
  "board",
  "product",
  "immersive"
]);
var BrandRefSchema = external_exports.object({
  brandPackId: external_exports.string().min(1).optional(),
  brandPackVersionId: external_exports.string().min(1).optional()
}).refine(
  (value) => Boolean(value.brandPackId || value.brandPackVersionId),
  "brandPackId or brandPackVersionId is required when brand is supplied"
);
var ProtocolLineageSchema = external_exports.object({
  sourceType: external_exports.string().min(1).optional(),
  sourceId: external_exports.string().min(1).optional(),
  workflowId: external_exports.string().min(1).optional(),
  workflowRunId: external_exports.string().min(1).optional(),
  releaseId: external_exports.string().min(1).optional(),
  labels: external_exports.record(external_exports.string(), external_exports.string()).optional()
});
var ProtocolBindingSchema = external_exports.object({
  bindingKey: external_exports.string().min(1),
  sourceId: external_exports.string().min(1).optional(),
  path: external_exports.string().min(1),
  targetPath: external_exports.string().min(1).optional(),
  required: external_exports.boolean().optional(),
  defaultValue: JsonValueSchema2.optional(),
  transform: external_exports.object({
    type: external_exports.enum(["identity", "number", "string", "boolean", "json"]).default("identity"),
    fallback: JsonValueSchema2.optional()
  }).optional()
});
var ProtocolKpiSchema = external_exports.object({
  label: external_exports.string().min(1),
  value: external_exports.string().min(1),
  trend: external_exports.enum(["up", "down", "flat", "none"]).default("none"),
  sublabel: external_exports.string().optional()
});
var ComparisonRowSchema = external_exports.object({
  label: external_exports.string().min(1),
  values: external_exports.array(external_exports.string().min(1)).min(2).max(6),
  highlight: external_exports.boolean().optional()
});
var MarketMapCompanySchema = external_exports.object({
  name: external_exports.string().min(1),
  x: external_exports.number().min(0).max(100),
  y: external_exports.number().min(0).max(100),
  emphasis: external_exports.enum(["primary", "secondary"]).default("secondary")
});
var TimelineEventSchema = external_exports.object({
  label: external_exports.string().min(1),
  date: external_exports.string().optional(),
  description: external_exports.string().optional()
});
var OrgChartNodeSchema = external_exports.object({
  id: external_exports.string().min(1),
  label: external_exports.string().min(1),
  role: external_exports.string().optional(),
  parentId: external_exports.string().optional()
});
var WaterfallEntrySchema = external_exports.object({
  label: external_exports.string().min(1),
  value: external_exports.number(),
  type: external_exports.enum(["increase", "decrease", "total"])
});
var TombstoneItemSchema = external_exports.object({
  name: external_exports.string().min(1),
  subtitle: external_exports.string().optional(),
  metrics: external_exports.array(external_exports.string().min(1)).max(4).optional()
});
var ProtocolAnimationSchema = external_exports.enum(["buildByPoint", "fadeIn", "none"]).optional();
var ProtocolTransitionSchema = external_exports.object({
  type: external_exports.enum(["morph", "fade", "push", "wipe", "split", "cover", "zoom", "none"]),
  speed: external_exports.enum(["slow", "med", "fast"]).optional(),
  advanceOnClick: external_exports.boolean().optional(),
  advanceAfterMs: external_exports.number().int().min(0).max(6e4).optional(),
  morphOption: external_exports.enum(["byObject", "byWord", "byChar"]).optional()
}).optional();
var SlideChromeOverrideSchema = external_exports.object({
  headerRibbon: external_exports.object({
    enabled: external_exports.boolean().optional(),
    height: external_exports.number().nonnegative().optional(),
    fill: external_exports.enum(["foreground", "accent", "muted", "surface"]).optional(),
    type: external_exports.enum(["nav", "eyebrow", "caption"]).optional(),
    align: external_exports.enum(["left", "center", "right"]).optional()
  }).strict().optional(),
  footer: external_exports.object({
    enabled: external_exports.boolean().optional(),
    layout: external_exports.array(external_exports.enum(["disclaimer", "projectCode", "watermark", "pageNumber", "spacer"])).optional(),
    height: external_exports.number().nonnegative().optional(),
    topRule: external_exports.string().optional(),
    disclaimer: external_exports.string().optional(),
    projectCode: external_exports.string().optional(),
    watermark: external_exports.string().optional()
  }).strict().optional()
}).strict().optional();
var SlideBaseSchema = external_exports.object({
  id: external_exports.string().min(1).optional(),
  slideId: external_exports.string().min(1).optional(),
  componentId: external_exports.string().min(1).optional(),
  subtitle: external_exports.string().optional(),
  insight: external_exports.string().optional(),
  notes: external_exports.array(external_exports.string().min(1)).max(6).optional(),
  transition: ProtocolTransitionSchema,
  animation: ProtocolAnimationSchema,
  bindings: external_exports.array(ProtocolBindingSchema).max(50).optional(),
  lineage: ProtocolLineageSchema.optional(),
  /** Per-slide chrome override. Merged into the resolved token bundle's
   *  chrome before regions and footer nodes are built for this slide. */
  chrome: SlideChromeOverrideSchema
});
var TitleBodySlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("title-body"),
  title: external_exports.string().min(1),
  eyebrow: external_exports.string().optional(),
  body: RichTextArraySchema
});
var KpiGridSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("kpi-grid"),
  title: external_exports.string().min(1),
  items: external_exports.array(ProtocolKpiSchema).min(2).max(6)
});
var ComparisonTableSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("comparison-table"),
  title: external_exports.string().min(1),
  // columns[0] is the label column header, columns[1..] are data column headers.
  // Min 3: label + at least 2 data columns (matching ComparisonRowSchema.values.min(2)).
  columns: external_exports.array(external_exports.string().min(1)).min(3).max(6),
  rows: external_exports.array(ComparisonRowSchema).min(1).max(12)
}).refine(
  (data) => data.rows.every((r) => r.values.length === data.columns.length - 1),
  { message: "Each row must have exactly columns.length - 1 values (first column is the label header)" }
);
var MarketMapSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("market-map"),
  title: external_exports.string().min(1),
  xAxisLabel: external_exports.string().optional(),
  yAxisLabel: external_exports.string().optional(),
  quadrants: external_exports.array(external_exports.string().min(1)).length(4).optional(),
  companies: external_exports.array(MarketMapCompanySchema).min(2).max(24)
});
var TimelineSlideSchema2 = SlideBaseSchema.extend({
  slideType: external_exports.literal("timeline"),
  title: external_exports.string().min(1),
  events: external_exports.array(TimelineEventSchema).min(2).max(10)
});
var OrgChartSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("org-chart"),
  title: external_exports.string().min(1),
  nodes: external_exports.array(OrgChartNodeSchema).min(2).max(20)
}).superRefine((slide, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  slide.nodes.forEach((node, i) => {
    if (ids.has(node.id)) {
      ctx.addIssue({ code: "custom", path: ["nodes", i, "id"], message: `Duplicate node id "${node.id}"` });
    }
    ids.add(node.id);
  });
  let hasRoot = false;
  slide.nodes.forEach((node, i) => {
    if (!node.parentId) {
      hasRoot = true;
    } else if (node.parentId === node.id) {
      ctx.addIssue({ code: "custom", path: ["nodes", i, "parentId"], message: `Node "${node.id}" cannot be its own parent` });
    } else if (!ids.has(node.parentId)) {
      ctx.addIssue({ code: "custom", path: ["nodes", i, "parentId"], message: `parentId "${node.parentId}" does not match any node id` });
    }
  });
  if (!hasRoot) {
    ctx.addIssue({ code: "custom", path: ["nodes"], message: "org-chart requires at least one root node (a node without parentId)" });
  }
});
var WaterfallSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("waterfall"),
  title: external_exports.string().min(1),
  entries: external_exports.array(WaterfallEntrySchema).min(3).max(20)
}).superRefine((slide, ctx) => {
  let running = 0;
  slide.entries.forEach((entry, i) => {
    const magnitude = Math.abs(entry.value);
    if (entry.type === "increase") {
      running += magnitude;
    } else if (entry.type === "decrease") {
      running -= magnitude;
    } else if (i === 0) {
      running = magnitude;
    } else {
      const tolerance = Math.max(0.01, Math.abs(running) * 5e-3);
      if (Math.abs(magnitude - running) > tolerance) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", i, "value"],
          message: `Total "${entry.label}" (${entry.value}) does not reconcile with the running total ${running} of the preceding entries`
        });
      }
      running = magnitude;
    }
  });
});
var TombstoneGridSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("tombstone-grid"),
  title: external_exports.string().min(1),
  items: external_exports.array(TombstoneItemSchema).min(2).max(12)
});
var CompositionSlideSchema = SlideBaseSchema.extend({
  slideType: external_exports.literal("composition"),
  /** Used for diagnostics + lineage. Not rendered automatically. */
  title: external_exports.string().min(1),
  blocks: external_exports.array(CompositionBlockSchema).min(1).max(20),
  /** Gutter (px) between adjacent grid cells. Each cell is inset by
   *  `gap/2` on every side so adjacent siblings leave a full `gap` of
   *  white space between them. Defaults to 0. */
  gap: external_exports.number().nonnegative().optional()
});
var SlideSpecSchema = external_exports.discriminatedUnion("slideType", [
  TitleBodySlideSchema,
  KpiGridSlideSchema,
  ComparisonTableSlideSchema,
  MarketMapSlideSchema,
  TimelineSlideSchema2,
  OrgChartSlideSchema,
  WaterfallSlideSchema,
  TombstoneGridSlideSchema,
  CompositionSlideSchema
]);
var PresentationSpecSchema = external_exports.object({
  version: ProtocolVersionSchema,
  deckId: external_exports.string().min(1).optional(),
  title: external_exports.string().min(1),
  /** Deprecated. Named style families are retired. Omit this field; the
   *  compiler ignores it and emits PROTOCOL_LAYOUTFAMILY_DEPRECATED when
   *  legacy callers still pass it. */
  layoutFamily: LayoutFamilySchema.optional(),
  /** Deprecated. Use `tokens.palette.accent` instead. Accepted only as a
   *  legacy convenience while callers migrate. */
  accentColor: HexColorSchema.optional(),
  /** Caller-supplied open token bundle. Drives all aesthetic decisions —
   *  palette, typography, rules, chrome, ornament. Omit to use
   *  BOOTSTRAP_TOKENS (reasonable default). This field replaces
   *  `layoutFamily` as the aesthetic contract. */
  tokens: TokenBundleSchema.optional(),
  brand: BrandRefSchema.optional(),
  variables: external_exports.record(external_exports.string(), JsonValueSchema2).optional(),
  bindings: external_exports.array(ProtocolBindingSchema).max(200).optional(),
  lineage: ProtocolLineageSchema.optional(),
  slides: external_exports.array(SlideSpecSchema).min(1).max(200)
});

// ../pptx-primitives/src/tokens/schema.ts
var hexColor2 = external_exports.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u, "must be #RGB, #RRGGBB, or #RRGGBBAA");
var pxValue2 = external_exports.number().nonnegative();
var letterSpacing2 = external_exports.number();
var rulePattern2 = external_exports.string();
var autoNumSchemeSchema2 = external_exports.enum([
  "arabicPeriod",
  "arabicParenR",
  "romanUcPeriod",
  "romanLcPeriod",
  "alphaUcPeriod",
  "alphaLcPeriod",
  "alphaLcParenR",
  "alphaUcParenR"
]);
var canvasSchema2 = external_exports.object({
  /** Aspect ratio; widescreen 16:9 or classic 4:3. */
  ratio: external_exports.enum(["16:9", "4:3"]).default("16:9"),
  /** Outer margin (px) from slide edge to content gutter. */
  margin: pxValue2.default(56),
  /** Global density multiplier applied to vertical gaps and padding.
   *  1.0 = neutral. <1 = dense (Bain matrix pages). >1 = airy (editorial). */
  density: external_exports.number().min(0.6).max(1.6).default(1),
  /** Slide background color, as a hex. Photography treatments live under
   *  `photo` — this is the fallback/paper surface only. */
  surface: hexColor2.default("#FFFFFF")
}).strict();
var paletteSchema2 = external_exports.object({
  /** Primary text color, load-bearing. */
  foreground: hexColor2.default("#0A0A0A"),
  /** Secondary text color (subtitles, metadata). */
  muted: hexColor2.default("#6B6B6B"),
  /** Tertiary text color (timestamps, captions). */
  faint: hexColor2.default("#A8A8A8"),
  /** Default rule/hairline color. */
  rule: hexColor2.default("#E5E5E5"),
  /** The one accent. Used sparingly. */
  accent: hexColor2.default("#0A0A0A"),
  /** Text color to use *on* accent (e.g., filled chips, ribbon overlays). */
  accentInverse: hexColor2.default("#FFFFFF"),
  /** Optional second accent for charts / secondary emphasis. Null = unused. */
  accentSecondary: hexColor2.nullable().default(null)
}).strict();
var typeRoleSchema2 = external_exports.object({
  /** Font family name. Substituted via font resolver if unavailable. */
  family: external_exports.string().min(1),
  /** CSS weight (100–900). */
  weight: external_exports.number().int().min(100).max(900).default(400),
  /** Font size in points (PPTX convention). */
  size: external_exports.number().positive(),
  /** Letter-spacing in px. Applied in OOXML via `spc` attribute. */
  letterSpacing: letterSpacing2.default(0),
  /** Line-height in points (absolute), not multiplier. */
  lineHeight: external_exports.number().positive().optional(),
  /** Italic. */
  italic: external_exports.boolean().default(false),
  /** Content transform. `upper` uppercases at render (not CSS). */
  transform: external_exports.enum(["none", "upper", "lower", "title"]).default("none")
}).strict();
var typeSchema2 = external_exports.object({
  /** Oversized headline, used for editorial / title slides. */
  display: typeRoleSchema2,
  /** Slide titles. */
  title: typeRoleSchema2,
  /** Running body text. */
  body: typeRoleSchema2,
  /** Small annotations, footnotes. */
  caption: typeRoleSchema2,
  /** Tracked caps above a title. */
  eyebrow: typeRoleSchema2,
  /** Header ribbon / nav labels. */
  nav: typeRoleSchema2
}).strict();
var rulesSchema2 = external_exports.object({
  /** Rule drawn under a slide title. Bain's "bar" lives here. */
  title: rulePattern2.default("none"),
  /** Rule drawn under a section header / section ribbon. */
  section: rulePattern2.default("none"),
  /** Rule separating body content (bullet groups, table rows, etc.). */
  divider: rulePattern2.default("1px solid token:rule"),
  /** Rule along a slide edge / footer top. */
  edge: rulePattern2.default("none")
}).strict();
var ornamentSchema2 = external_exports.object({
  /** Bullet marker style. `none` means prose without markers. */
  bullet: external_exports.object({
    marker: external_exports.enum(["filledDot", "openDot", "enDash", "square", "chevron", "none", "autoNum"]).default("filledDot"),
    /** Native PowerPoint numbering scheme when marker is `autoNum`. */
    scheme: autoNumSchemeSchema2.optional(),
    /** Color role for the marker. */
    color: external_exports.enum(["foreground", "muted", "faint", "accent"]).default("foreground"),
    /** Marker size relative to surrounding body text (multiplier). */
    sizeRatio: external_exports.number().positive().default(0.9),
    /** Space from marker to text (px). */
    gap: pxValue2.default(10),
    /** Indent for nested levels (px). */
    indent: pxValue2.default(16),
    /** Style for nested (level 2+) markers. */
    nestedMarker: external_exports.enum(["filledDot", "openDot", "enDash", "square", "chevron", "none", "autoNum"]).default("enDash")
  }).strict(),
  /** Step / sequence marker style. */
  stepMarker: external_exports.object({
    style: external_exports.enum(["circleNumeric", "serifCircled", "plain", "none"]).default("circleNumeric"),
    /** Color role for the marker background. */
    fill: external_exports.enum(["foreground", "accent", "muted", "surface"]).default("accent")
  }).strict(),
  /** Page-number style in footer. */
  pageNumber: external_exports.object({
    style: external_exports.enum(["plain", "circledAccent", "boxedAccent", "none"]).default("plain"),
    prefix: external_exports.string().default("")
  }).strict()
}).strict();
var chromeSchema2 = external_exports.object({
  headerRibbon: external_exports.object({
    enabled: external_exports.boolean().default(false),
    /** Height in px. */
    height: pxValue2.default(28),
    /** Fill color role. */
    fill: external_exports.enum(["foreground", "accent", "muted", "surface"]).default("foreground"),
    /** Role from `type` used for the ribbon label. */
    type: external_exports.enum(["nav", "eyebrow", "caption"]).default("nav"),
    /** Horizontal alignment of the label. */
    align: external_exports.enum(["left", "center", "right"]).default("center")
  }).strict(),
  footer: external_exports.object({
    enabled: external_exports.boolean().default(true),
    /** Content order from left → right. */
    layout: external_exports.array(external_exports.enum(["disclaimer", "projectCode", "watermark", "pageNumber", "spacer"])).default(["spacer", "pageNumber"]),
    /** Reserved height in px. */
    height: pxValue2.default(32),
    /** Edge rule above the footer (nullable → no rule). */
    topRule: rulePattern2.default("none"),
    /** Disclaimer text (empty → hidden even if in layout). */
    disclaimer: external_exports.string().default(""),
    /** Project / deck code (empty → hidden). */
    projectCode: external_exports.string().default(""),
    /** Watermark text or logomark URL (data: or https:). */
    watermark: external_exports.string().default("")
  }).strict()
}).strict();
var photoSchema2 = external_exports.object({
  /** Whether photography is a first-class content type for this bundle.
   *  When false, image-bleed primitives degrade to empty regions or
   *  fall back to typography-only layouts (Bain-style). */
  enabled: external_exports.boolean().default(false),
  /** Default bleed treatment when a slide calls for imagery. */
  defaultBleed: external_exports.enum(["full", "half", "quarter", "inline", "none"]).default("none"),
  /** Overlay scrim when text sits on top of photography.
   *  `none` — no scrim; `light` — translucent white; `dark` — translucent black;
   *  `gradientSuppressed` is deliberately absent. */
  scrim: external_exports.enum(["none", "light", "dark"]).default("none"),
  /** Scrim opacity 0–1. */
  scrimOpacity: external_exports.number().min(0).max(1).default(0.35)
}).strict();
var embeddedFontSchema2 = external_exports.object({
  /** Family name, exactly as referenced by type.X.family. */
  family: external_exports.string().min(1),
  /** Font file source. https://, data:, or absolute path the engine can
   *  resolve on the server. */
  src: external_exports.string().min(1),
  /** True for bold variant. */
  bold: external_exports.boolean().optional(),
  /** True for italic variant. */
  italic: external_exports.boolean().optional()
}).strict();
var spacingSchema2 = external_exports.object({
  /** xs/sm/md/lg/xl/2xl — step values in px.
   *  Primitives ask for a semantic step; bundles tune the scale globally. */
  xs: pxValue2.default(4),
  sm: pxValue2.default(8),
  md: pxValue2.default(16),
  lg: pxValue2.default(24),
  xl: pxValue2.default(40),
  xxl: pxValue2.default(72)
}).strict();
var TokenBundleSchema2 = external_exports.object({
  /** Schema version pin. Lets callers declare they targeted a specific shape. */
  version: external_exports.literal("1.0").default("1.0"),
  canvas: canvasSchema2.partial().optional(),
  palette: paletteSchema2.partial().optional(),
  type: external_exports.object({
    display: typeRoleSchema2.partial().optional(),
    title: typeRoleSchema2.partial().optional(),
    body: typeRoleSchema2.partial().optional(),
    caption: typeRoleSchema2.partial().optional(),
    eyebrow: typeRoleSchema2.partial().optional(),
    nav: typeRoleSchema2.partial().optional()
  }).strict().optional(),
  rules: rulesSchema2.partial().optional(),
  ornament: external_exports.object({
    bullet: ornamentSchema2.shape.bullet.partial().optional(),
    stepMarker: ornamentSchema2.shape.stepMarker.partial().optional(),
    pageNumber: ornamentSchema2.shape.pageNumber.partial().optional()
  }).strict().optional(),
  chrome: external_exports.object({
    headerRibbon: chromeSchema2.shape.headerRibbon.partial().optional(),
    footer: chromeSchema2.shape.footer.partial().optional()
  }).strict().optional(),
  photo: photoSchema2.partial().optional(),
  spacing: spacingSchema2.partial().optional(),
  /** Caller-supplied fonts. Each entry registers a family the engine would
   *  otherwise substitute. Optional; absent → only bundled families work. */
  embeddedFonts: external_exports.array(embeddedFontSchema2).optional()
}).strict();
var ResolvedTokensSchema2 = external_exports.object({
  version: external_exports.literal("1.0"),
  canvas: canvasSchema2,
  palette: paletteSchema2,
  type: typeSchema2,
  rules: rulesSchema2,
  ornament: ornamentSchema2,
  chrome: chromeSchema2,
  photo: photoSchema2,
  spacing: spacingSchema2,
  /** Always an array at resolved time (possibly empty). */
  embeddedFonts: external_exports.array(embeddedFontSchema2)
}).strict();

// ../pptx-primitives/src/tokens/defaults.ts
var BOOTSTRAP_TOKENS2 = {
  version: "1.0",
  canvas: {
    ratio: "16:9",
    margin: 56,
    density: 1,
    surface: "#FFFFFF"
  },
  palette: {
    foreground: "#0A0A0A",
    muted: "#6B6B6B",
    faint: "#A8A8A8",
    rule: "#E5E5E5",
    accent: "#0A0A0A",
    accentInverse: "#FFFFFF",
    accentSecondary: null
  },
  type: {
    display: {
      family: "Aptos",
      weight: 500,
      size: 56,
      letterSpacing: -0.5,
      lineHeight: 62,
      italic: false,
      transform: "none"
    },
    title: {
      family: "Aptos",
      weight: 500,
      size: 28,
      letterSpacing: -0.2,
      lineHeight: 34,
      italic: false,
      transform: "none"
    },
    body: {
      family: "Aptos",
      weight: 400,
      size: 14,
      letterSpacing: 0,
      lineHeight: 20,
      italic: false,
      transform: "none"
    },
    caption: {
      family: "Aptos",
      weight: 400,
      size: 10,
      letterSpacing: 0,
      lineHeight: 14,
      italic: false,
      transform: "none"
    },
    eyebrow: {
      family: "Aptos",
      weight: 700,
      size: 10,
      letterSpacing: 1.4,
      lineHeight: 12,
      italic: false,
      transform: "upper"
    },
    nav: {
      family: "Aptos",
      weight: 500,
      size: 10,
      letterSpacing: 2,
      lineHeight: 12,
      italic: false,
      transform: "upper"
    }
  },
  rules: {
    title: "none",
    section: "none",
    divider: "1px solid token:rule",
    edge: "none"
  },
  ornament: {
    bullet: {
      marker: "filledDot",
      color: "foreground",
      sizeRatio: 0.9,
      gap: 10,
      indent: 16,
      nestedMarker: "enDash"
    },
    stepMarker: {
      style: "plain",
      fill: "foreground"
    },
    pageNumber: {
      style: "plain",
      prefix: ""
    }
  },
  chrome: {
    headerRibbon: {
      enabled: false,
      height: 28,
      fill: "foreground",
      type: "nav",
      align: "center"
    },
    footer: {
      enabled: true,
      layout: ["spacer", "pageNumber"],
      height: 32,
      topRule: "none",
      disclaimer: "",
      projectCode: "",
      watermark: ""
    }
  },
  photo: {
    enabled: false,
    defaultBleed: "none",
    scrim: "none",
    scrimOpacity: 0.35
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
    xxl: 72
  },
  embeddedFonts: []
};

// ../pptx-primitives/src/tokens/rulePattern.ts
var STYLE_VALUES2 = /* @__PURE__ */ new Set(["solid", "dashed", "dotted"]);
var RulePatternError2 = class extends Error {
  constructor(message, pattern) {
    super(`[rulePattern] ${message}: ${JSON.stringify(pattern)}`);
    this.pattern = pattern;
    this.name = "RulePatternError";
  }
};
function parseRulePattern2(pattern, palette) {
  const trimmed = pattern.trim();
  if (trimmed === "" || trimmed === "none") return null;
  const gapMatch = trimmed.match(/\bgap:\s*(\d+(?:\.\d+)?)\s*$/u);
  const gap = gapMatch ? Number(gapMatch[1]) : 0;
  const body = gapMatch ? trimmed.slice(0, gapMatch.index).trim() : trimmed;
  const segments = body.split(/\s*\+\s*/u);
  const lines = segments.map((seg) => parseLine2(seg, palette, pattern));
  const totalHeight = lines.reduce((acc, l) => acc + l.width, 0) + gap * Math.max(0, lines.length - 1);
  return { lines, gap, totalHeight };
}
function parseLine2(segment, palette, wholePattern) {
  const match = segment.trim().match(
    /^(\d+(?:\.\d+)?)px\s+([a-z]+)\s+(.+)$/u
  );
  if (!match) {
    throw new RulePatternError2(
      `rule segment must be "<width>px <style> <color>", got ${JSON.stringify(segment)}`,
      wholePattern
    );
  }
  const widthNum = Number(match[1]);
  const style = match[2];
  if (!STYLE_VALUES2.has(style)) {
    throw new RulePatternError2(`unknown style ${JSON.stringify(style)}`, wholePattern);
  }
  const color = resolveColor3(match[3].trim(), palette, wholePattern);
  return { width: widthNum, style, color };
}
var HEX_RE3 = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;
function resolveColor3(raw, palette, wholePattern) {
  if (HEX_RE3.test(raw)) return raw;
  if (raw.startsWith("token:")) {
    const role = raw.slice("token:".length).trim();
    const value = palette[role];
    if (typeof value !== "string" || !HEX_RE3.test(value)) {
      throw new RulePatternError2(
        `unknown or non-hex palette role ${JSON.stringify(role)}`,
        wholePattern
      );
    }
    return value;
  }
  throw new RulePatternError2(
    `color must be hex (#RGB/#RRGGBB) or token:<role>, got ${JSON.stringify(raw)}`,
    wholePattern
  );
}

// ../pptx-primitives/src/tokens/fonts.ts
var BUNDLED_FONT_POOL2 = Object.freeze([
  "Arial",
  "Calibri",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Tahoma",
  "Impact",
  "Comic Sans MS",
  "Palatino",
  "Garamond",
  "Book Antiqua",
  "Cambria",
  "Consolas",
  "Segoe UI",
  // Noto family — the engine's own always-present fallback chain.
  "Noto Sans",
  "Noto Serif",
  "Noto Sans JP",
  "Noto Sans SC",
  "Noto Sans TC",
  "Noto Sans KR"
]);
function auditFontAvailability2(tokens) {
  const embeddedFamilies = new Set(
    tokens.embeddedFonts.map((f) => normalize(f.family))
  );
  const systemMapped = new Set(BUNDLED_FONT_POOL2.map(normalize));
  const warnings = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [roleName, role] of Object.entries(tokens.type)) {
    const family = normalize(role.family);
    if (embeddedFamilies.has(family)) continue;
    if (systemMapped.has(family)) continue;
    if (seen.has(family)) continue;
    seen.add(family);
    warnings.push({
      code: "FONT_NOT_EMBEDDED_AND_NOT_SYSTEM",
      message: `Font "${role.family}" is neither on the engine's system-font map nor in embeddedFonts. Final-rendered .pptx will fall back to the opener's substitution; canvas-preview thumbnails will render as NotoSans. Supply via embeddedFonts to pin fidelity.`,
      context: { role: roleName, family: role.family }
    });
  }
  return warnings;
}
function normalize(family) {
  return family.trim().toLowerCase();
}

// ../pptx-primitives/src/tokens/resolve.ts
var TokenResolveError2 = class extends Error {
  constructor(message, issues) {
    super(`[tokens] ${message}
  - ${issues.map((i) => `${i.path}: ${i.message}`).join("\n  - ")}`);
    this.issues = issues;
    this.name = "TokenResolveError";
  }
};
function resolveTokens2(input, options = {}) {
  const parsed = TokenBundleSchema2.safeParse(input);
  if (!parsed.success) {
    throw new TokenResolveError2(
      "input bundle failed validation",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message
      }))
    );
  }
  const merged = deepMerge(BOOTSTRAP_TOKENS2, parsed.data);
  const verified = ResolvedTokensSchema2.safeParse(merged);
  if (!verified.success) {
    throw new TokenResolveError2(
      "resolved bundle failed post-merge validation (bug in defaults or merge logic)",
      verified.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message
      }))
    );
  }
  if (options.validateRules !== false) {
    validateRulesOrThrow(verified.data);
  }
  validateBulletDefaultsOrThrow(verified.data);
  if (options.onWarning) {
    for (const w of auditFontAvailability2(verified.data)) {
      options.onWarning(w);
    }
  }
  return verified.data;
}
function validateBulletDefaultsOrThrow(resolved) {
  const { bullet } = resolved.ornament;
  if (bullet.scheme !== void 0 && bullet.marker !== "autoNum" && bullet.nestedMarker !== "autoNum") {
    throw new TokenResolveError2("bullet defaults failed validation", [
      {
        path: "ornament.bullet.scheme",
        message: "scheme is only valid when marker or nestedMarker is autoNum"
      }
    ]);
  }
  if ((bullet.marker === "autoNum" || bullet.nestedMarker === "autoNum") && bullet.scheme === void 0) {
    throw new TokenResolveError2("bullet defaults failed validation", [
      {
        path: "ornament.bullet.scheme",
        message: "scheme is required when marker or nestedMarker is autoNum"
      }
    ]);
  }
}
function deepMerge(lhs, rhs) {
  if (rhs === void 0) return lhs;
  if (rhs === null) return rhs;
  if (Array.isArray(rhs)) return rhs;
  if (typeof rhs !== "object") return rhs;
  if (typeof lhs !== "object" || lhs === null || Array.isArray(lhs)) return rhs;
  const result = { ...lhs };
  for (const [key, rValue] of Object.entries(rhs)) {
    const lValue = lhs[key];
    result[key] = deepMerge(lValue, rValue);
  }
  return result;
}
function validateRulesOrThrow(resolved) {
  const rulesToCheck = [
    ["rules.title", resolved.rules.title],
    ["rules.section", resolved.rules.section],
    ["rules.divider", resolved.rules.divider],
    ["rules.edge", resolved.rules.edge],
    ["chrome.footer.topRule", resolved.chrome.footer.topRule]
  ];
  for (const [path, pattern] of rulesToCheck) {
    try {
      parseRulePattern2(pattern, resolved.palette);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TokenResolveError2("rule pattern failed to parse", [
        { path, message }
      ]);
    }
  }
}

// ../pptx-primitives/src/util/rule.ts
function emitHorizontalRule2(pattern, palette, left, top, width) {
  const parsed = parseRulePattern2(pattern, palette);
  if (!parsed) return { nodes: [], consumedHeight: 0 };
  const nodes = [];
  let y = top;
  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i];
    const node = {
      kind: "view",
      shape: "rect",
      decorative: true,
      rect: { left, top: y, width, height: line.width },
      fill: line.color
    };
    nodes.push(node);
    y += line.width;
    if (i < parsed.lines.length - 1) y += parsed.gap;
  }
  return { nodes, consumedHeight: parsed.totalHeight };
}

// ../pptx-primitives/src/util/metricsProvider.ts
var TOKEN_PROVIDERS2 = /* @__PURE__ */ new WeakMap();
function attachMetricsProvider2(tokens, provider) {
  TOKEN_PROVIDERS2.set(tokens, provider);
}
function getMetricsProvider2(tokens) {
  return TOKEN_PROVIDERS2.get(tokens) ?? null;
}

// ../pptx-primitives/src/util/estimateText.ts
var WIDTH_RATIO_BY_FAMILY2 = {
  "Helvetica Neue": 0.5,
  "Helvetica": 0.5,
  "Arial": 0.52,
  "Inter": 0.49,
  "IBM Plex Sans": 0.51,
  "IBM Plex Mono": 0.6,
  "Courier New": 0.6,
  "Roboto": 0.5,
  "S\xF6hne": 0.49,
  // Serifs
  "Georgia": 0.53,
  "Baskerville": 0.52,
  "Bodoni": 0.48,
  "Times New Roman": 0.5
};
var DEFAULT_WIDTH_RATIO2 = 0.52;
var PX_PER_PT3 = 96 / 72;
function resolveProvider2(source) {
  if (!source) return null;
  if (typeof source === "function") return source;
  return getMetricsProvider2(source);
}
function getMetrics2(source, family) {
  const provider = resolveProvider2(source);
  return provider ? provider(family) : null;
}
function estimateTextWidth2(input, source) {
  const metrics = getMetrics2(source, input.family);
  const tracking = input.letterSpacing ?? 0;
  const trackingTotal = Math.max(0, input.content.length - 1) * tracking;
  if (metrics?.measureWidthPx) {
    const text = input.uppercase ? input.content.toUpperCase() : input.content;
    return metrics.measureWidthPx(text, input.sizePt) + trackingTotal;
  }
  const base = metrics?.avgWidthRatio ?? WIDTH_RATIO_BY_FAMILY2[input.family] ?? DEFAULT_WIDTH_RATIO2;
  const ratio = input.uppercase ? base * 1.08 : input.digitsOnly ? base * 0.96 : base;
  return input.content.length * input.sizePt * PX_PER_PT3 * ratio + trackingTotal;
}
function estimateLineHeight2(sizePt, lineHeightPt, source, family) {
  if (lineHeightPt !== void 0) return lineHeightPt * PX_PER_PT3;
  if (source && family) {
    const metrics = getMetrics2(source, family);
    if (metrics?.lineHeightPx) return metrics.lineHeightPx(sizePt);
  }
  return sizePt * 1.2 * PX_PER_PT3;
}
function estimateLineCount2(input, source) {
  const words = input.content.split(/\s+/u).flatMap((chunk) => splitOnHyphens2(chunk)).filter(Boolean);
  if (words.length === 0) return 0;
  const tracking = input.letterSpacing ?? 0;
  const metrics = getMetrics2(source, input.family);
  let measureWord;
  let spaceWidth;
  if (metrics?.measureWidthPx) {
    measureWord = (word) => metrics.measureWidthPx(input.uppercase ? word.toUpperCase() : word, input.sizePt) + Math.max(0, word.length - 1) * tracking;
    spaceWidth = metrics.measureWidthPx(" ", input.sizePt);
  } else {
    const ratio = metrics?.avgWidthRatio ?? WIDTH_RATIO_BY_FAMILY2[input.family] ?? DEFAULT_WIDTH_RATIO2;
    const adjusted = input.uppercase ? ratio * 1.08 : ratio;
    measureWord = (word) => word.length * input.sizePt * PX_PER_PT3 * adjusted + Math.max(0, word.length - 1) * tracking;
    spaceWidth = input.sizePt * PX_PER_PT3 * adjusted * 0.33;
  }
  const wrapWidth = Math.max(0, input.width - 4);
  if (metrics?.measureWidthPx) {
    const whole = metrics.measureWidthPx(
      input.uppercase ? input.content.toUpperCase() : input.content,
      input.sizePt
    );
    if (process.env.RUNSTAMP_DEBUG_LINECOUNT) {
      console.error(`  [LC] "${input.content.slice(0, 40)}" sz=${input.sizePt} fam=${input.family} whole=${whole} wrapW=${wrapWidth} \u2192`, whole <= wrapWidth ? "1 (short-circuit)" : "fall-through");
    }
    if (whole + Math.max(0, input.content.length - 1) * tracking <= wrapWidth) {
      return 1;
    }
  } else if (process.env.RUNSTAMP_DEBUG_LINECOUNT) {
    console.error(`  [LC] "${input.content.slice(0, 40)}" \u2014 NO measureWidthPx`);
  }
  let lines = 1;
  let xOnLine = 0;
  for (const word of words) {
    const w = measureWord(word);
    const withLead = xOnLine === 0 ? w : w + spaceWidth;
    if (xOnLine + withLead > wrapWidth) {
      lines += 1;
      xOnLine = w;
    } else {
      xOnLine += withLead;
    }
  }
  return lines;
}
function splitOnHyphens2(chunk) {
  if (!chunk.includes("-")) return [chunk];
  const out = [];
  const parts = chunk.split("-");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length === 0) continue;
    out.push(i < parts.length - 1 ? `${parts[i]}-` : parts[i]);
  }
  return out;
}
function applyTypeTransform2(content, transform) {
  switch (transform) {
    case "upper":
      return content.toUpperCase();
    case "lower":
      return content.toLowerCase();
    case "title":
      return content.replace(
        /\w\S*/gu,
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    default:
      return content;
  }
}

// ../pptx-primitives/src/primitives/footerChrome.ts
var MIN_COMPRESSION3 = 0.55;
var COMPRESSION_STEP2 = 0.05;
var footerChrome2 = (input, tokens, region) => {
  const { footer } = tokens.chrome;
  if (!footer.enabled) return { nodes: [], overflow: { kind: "fit" } };
  let scale = 1;
  while (scale >= MIN_COMPRESSION3 - 1e-9) {
    const attempt = layoutFooter(input, tokens, region, scale);
    if (attempt.ok) {
      return {
        nodes: attempt.nodes,
        overflow: scale === 1 ? { kind: "fit" } : { kind: "compressed", scale }
      };
    }
    scale = Number((scale - COMPRESSION_STEP2).toFixed(2));
  }
  const fallback = layoutFooter(input, tokens, region, MIN_COMPRESSION3);
  return {
    nodes: fallback.nodes,
    overflow: {
      kind: "clipped",
      droppedCount: fallback.clippedCount,
      reason: `footer content exceeded width even at ${MIN_COMPRESSION3}\xD7 compression`
    }
  };
};
function layoutFooter(input, tokens, region, scale) {
  const { footer } = tokens.chrome;
  const nodes = [];
  const ruleEmission = emitHorizontalRule2(
    footer.topRule,
    tokens.palette,
    region.left,
    region.top,
    region.width
  );
  nodes.push(...ruleEmission.nodes);
  const contentTop = region.top + ruleEmission.consumedHeight;
  const contentHeight = region.height - ruleEmission.consumedHeight;
  const segments = footer.layout.map((name) => renderSegment(name, input, tokens, scale)).filter((seg) => seg !== null);
  const fixedWidth = segments.filter((s) => s.kind !== "spacer").reduce((acc, s) => acc + s.measuredWidth, 0);
  const spacerCount = segments.filter((s) => s.kind === "spacer").length;
  const gap = 12;
  const gapsTotal = Math.max(0, segments.length - 1) * gap;
  const availableForSpacers = region.width - fixedWidth - gapsTotal;
  if (availableForSpacers < 0) {
    return { ok: false, nodes, clippedCount: 1 };
  }
  const spacerWidth = spacerCount > 0 ? availableForSpacers / spacerCount : 0;
  const regionRight = region.left + region.width;
  let x = region.left;
  let clipped = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const w = seg.kind === "spacer" ? spacerWidth : seg.measuredWidth;
    if (x + w > regionRight + 0.5) {
      clipped++;
      continue;
    }
    if (seg.kind !== "spacer") {
      const left = Math.min(x, regionRight - w);
      nodes.push(seg.build({
        left,
        top: contentTop,
        width: w,
        height: contentHeight
      }));
    }
    x += w;
    if (i < segments.length - 1) x += gap;
  }
  return { ok: clipped === 0, nodes, clippedCount: clipped };
}
function renderSegment(name, input, tokens, scale) {
  switch (name) {
    case "spacer":
      return { kind: "spacer", measuredWidth: 0, build: null };
    case "disclaimer":
      return tokens.chrome.footer.disclaimer ? makeTextSegment(tokens.chrome.footer.disclaimer, tokens, "left", scale) : null;
    case "projectCode":
      return tokens.chrome.footer.projectCode ? makeTextSegment(tokens.chrome.footer.projectCode, tokens, "left", scale) : null;
    case "watermark":
      return tokens.chrome.footer.watermark ? makeWatermarkSegment(tokens.chrome.footer.watermark, tokens, scale) : null;
    case "pageNumber":
      return tokens.ornament.pageNumber.style === "none" ? null : makePageNumberSegment(input.slideIndex, tokens, scale);
    default:
      return null;
  }
}
function scaledCaption(tokens, scale) {
  const caption = tokens.type.caption;
  return {
    ...caption,
    size: caption.size * scale,
    lineHeight: caption.lineHeight !== void 0 ? caption.lineHeight * scale : void 0,
    letterSpacing: caption.letterSpacing * scale
  };
}
function makeTextSegment(content, tokens, align, scale) {
  const caption = scaledCaption(tokens, scale);
  const measuredWidth = estimateTextWidth2({
    content,
    family: caption.family,
    sizePt: caption.size,
    letterSpacing: caption.letterSpacing,
    uppercase: caption.transform === "upper"
  }, tokens);
  return {
    kind: "text",
    measuredWidth,
    build: (rect) => ({
      kind: "text",
      rect,
      content: applyTypeTransform2(content, caption.transform),
      style: {
        family: caption.family,
        weight: caption.weight,
        size: caption.size,
        lineHeight: caption.lineHeight,
        letterSpacing: caption.letterSpacing,
        italic: caption.italic,
        color: tokens.palette.muted,
        align,
        verticalAlign: "middle"
      },
      autoFit: false
    })
  };
}
function makeWatermarkSegment(value, tokens, scale) {
  const isImage = value.startsWith("data:") || /^https?:\/\//u.test(value);
  if (!isImage) return makeTextSegment(value, tokens, "right", scale);
  const measuredWidth = 80 * scale;
  return {
    kind: "watermarkImage",
    measuredWidth,
    build: (rect) => ({
      kind: "image",
      rect,
      src: value,
      alt: "watermark",
      opacity: 1,
      decorative: true
    })
  };
}
function makePageNumberSegment(index, tokens, scale) {
  const { style, prefix } = tokens.ornament.pageNumber;
  const label = `${prefix}${index}`;
  const caption = scaledCaption(tokens, scale);
  const textWidth = estimateTextWidth2({
    content: label,
    family: caption.family,
    sizePt: caption.size,
    letterSpacing: caption.letterSpacing,
    digitsOnly: /^\d+$/u.test(label)
  }, tokens);
  if (style === "plain") {
    return {
      kind: "pageNumber",
      measuredWidth: textWidth,
      build: (rect) => ({
        kind: "text",
        rect,
        content: applyTypeTransform2(label, caption.transform),
        style: {
          family: caption.family,
          weight: caption.weight,
          size: caption.size,
          letterSpacing: caption.letterSpacing,
          italic: caption.italic,
          color: tokens.palette.muted,
          align: "right",
          verticalAlign: "middle"
        },
        autoFit: false
      })
    };
  }
  if (style === "circledAccent") {
    const diameter = Math.max(caption.size + 8, 18 * scale);
    return {
      kind: "pageNumber",
      measuredWidth: diameter,
      build: (rect) => makeCircledAccentNumber(rect, label, diameter, tokens, scale)
    };
  }
  const side = Math.max(caption.size + 6, 18 * scale);
  return {
    kind: "pageNumber",
    measuredWidth: side,
    build: (rect) => makeBoxedAccentNumber(rect, label, side, tokens, scale)
  };
}
function makeCircledAccentNumber(rect, label, diameter, tokens, scale) {
  const cx = rect.left + rect.width - diameter;
  const cy = rect.top + (rect.height - diameter) / 2;
  const text = {
    kind: "text",
    rect: { left: 0, top: 0, width: diameter, height: diameter },
    content: label,
    style: {
      family: tokens.type.caption.family,
      weight: 700,
      size: tokens.type.caption.size * scale,
      letterSpacing: 0,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle"
    },
    autoFit: false
  };
  return {
    kind: "view",
    shape: "ellipse",
    rect: { left: cx, top: cy, width: diameter, height: diameter },
    fill: resolveColorRole(tokens.ornament.pageNumber.style === "circledAccent" ? "accent" : "foreground", tokens),
    children: [text],
    decorative: false
  };
}
function makeBoxedAccentNumber(rect, label, side, tokens, scale) {
  const x = rect.left + rect.width - side;
  const y = rect.top + (rect.height - side) / 2;
  const text = {
    kind: "text",
    rect: { left: 0, top: 0, width: side, height: side },
    content: label,
    style: {
      family: tokens.type.caption.family,
      weight: 700,
      size: tokens.type.caption.size * scale,
      letterSpacing: 0,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle"
    },
    autoFit: false
  };
  return {
    kind: "view",
    shape: "rect",
    rect: { left: x, top: y, width: side, height: side },
    fill: resolveColorRole("accent", tokens),
    children: [text]
  };
}
function resolveColorRole(role, tokens) {
  if (role === "surface") return tokens.canvas.surface;
  return tokens.palette[role];
}

// ../pptx-primitives/src/primitives/titleBlock.ts
var TITLE_MAX_NATURAL_LINES2 = 3;
var TITLE_COMPRESSION_STEP2 = 0.9;
var TITLE_MIN_COMPRESSION2 = 0.75;
var titleBlock2 = (input, tokens, region) => {
  const nodes = [];
  let cursor = region.top;
  const eyebrowGap = tokens.spacing.sm;
  const subtitleGap = tokens.spacing.sm;
  const ruleGap = tokens.spacing.md;
  if (input.eyebrow) {
    const { node, consumedHeight } = emitLine2(
      input.eyebrow,
      "eyebrow",
      tokens,
      tokens.palette.accent,
      { left: region.left, top: cursor, width: region.width }
    );
    nodes.push(node);
    cursor += consumedHeight + eyebrowGap;
  }
  let scale = 1;
  let titleNodeResult = null;
  while (scale >= TITLE_MIN_COMPRESSION2 - 1e-9) {
    const attempt = layoutTitle2(input.title, tokens, scale, {
      left: region.left,
      top: cursor,
      width: region.width
    });
    if (attempt.lines <= TITLE_MAX_NATURAL_LINES2) {
      titleNodeResult = attempt;
      break;
    }
    scale = Number((scale - (1 - TITLE_COMPRESSION_STEP2)).toFixed(2));
  }
  let overflow = { kind: "fit" };
  if (!titleNodeResult) {
    titleNodeResult = layoutTitle2(input.title, tokens, TITLE_MIN_COMPRESSION2, {
      left: region.left,
      top: cursor,
      width: region.width
    });
    overflow = {
      kind: "clipped",
      droppedCount: 0,
      reason: `title exceeded ${TITLE_MAX_NATURAL_LINES2}-line budget at minimum compression`
    };
  } else if (scale < 1) {
    overflow = { kind: "compressed", scale };
  }
  nodes.push(titleNodeResult.node);
  cursor += titleNodeResult.consumedHeight;
  if (input.subtitle) {
    cursor += subtitleGap;
    const { node, consumedHeight } = emitLine2(
      input.subtitle,
      "body",
      tokens,
      tokens.palette.muted,
      { left: region.left, top: cursor, width: region.width }
    );
    nodes.push(node);
    cursor += consumedHeight;
  }
  if (tokens.rules.title !== "none") {
    cursor += ruleGap;
    const ruleEmission = emitHorizontalRule2(
      tokens.rules.title,
      tokens.palette,
      region.left,
      cursor,
      region.width
    );
    nodes.push(...ruleEmission.nodes);
    cursor += ruleEmission.consumedHeight;
  }
  if (cursor > region.top + region.height + 0.5) {
    if (overflow.kind === "fit" || overflow.kind === "compressed") {
      overflow = {
        kind: "clipped",
        droppedCount: 0,
        reason: `titleBlock consumed ${Math.round(cursor - region.top)}px; region allows ${region.height}px`
      };
    }
  }
  return { nodes, overflow };
};
function layoutTitle2(content, tokens, scale, place) {
  const role = tokens.type.title;
  const sizePt = role.size * scale;
  const lineHeightPt = role.lineHeight !== void 0 ? role.lineHeight * scale : sizePt * 1.2;
  const lines = estimateLineCount2({
    content,
    family: role.family,
    sizePt,
    letterSpacing: role.letterSpacing,
    uppercase: role.transform === "upper",
    width: place.width
  }, tokens);
  const lineHeightPx = estimateLineHeight2(sizePt, lineHeightPt, tokens, role.family);
  const consumedHeight = lineHeightPx * lines;
  const node = {
    kind: "text",
    rect: { left: place.left, top: place.top, width: place.width, height: consumedHeight },
    content: applyTypeTransform2(content, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: sizePt,
      lineHeight: lineHeightPt,
      letterSpacing: role.letterSpacing * scale,
      italic: role.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  return { node, consumedHeight, lines };
}
function emitLine2(content, role, tokens, color, place) {
  const typeRole = tokens.type[role];
  const lineHeightPx = estimateLineHeight2(typeRole.size, typeRole.lineHeight, tokens, typeRole.family);
  const height = lineHeightPx * Math.max(
    1,
    estimateLineCount2({
      content,
      family: typeRole.family,
      sizePt: typeRole.size,
      letterSpacing: typeRole.letterSpacing,
      uppercase: typeRole.transform === "upper",
      width: place.width
    }, tokens)
  );
  const node = {
    kind: "text",
    rect: { left: place.left, top: place.top, width: place.width, height },
    content: applyTypeTransform2(content, typeRole.transform),
    style: {
      family: typeRole.family,
      weight: typeRole.weight,
      size: typeRole.size,
      lineHeight: typeRole.lineHeight,
      letterSpacing: typeRole.letterSpacing,
      italic: typeRole.italic,
      color,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  return { node, consumedHeight: height };
}

// ../pptx-primitives/src/primitives/bulletList.ts
var bulletList2 = (input, tokens, region) => {
  const { bullet } = tokens.ornament;
  const body = tokens.type.body;
  const nodes = [];
  const startIndex = input.resume?.startIndex ?? 0;
  const betweenItemGap = tokens.spacing.sm;
  let cursor = region.top;
  let placed = startIndex;
  for (let i = startIndex; i < input.items.length; i++) {
    const item = input.items[i];
    const level = Math.min(2, Math.max(1, item.level ?? 1));
    const indent = (level - 1) * bullet.indent;
    const markerStyle = level === 1 ? bullet.marker : bullet.nestedMarker;
    const nativeBullet = tokenBulletConfig2(bullet, markerStyle, i + 1);
    const textLeft = nativeBullet ? region.left : region.left + indent + markerWidth2(markerStyle, body.size) + bullet.gap;
    const textWidth = region.width - (textLeft - region.left);
    const lines = estimateLineCount2({
      content: item.text,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: textWidth
    }, tokens);
    const lineHeightPx = estimateLineHeight2(body.size, body.lineHeight, tokens, body.family);
    const itemHeight = Math.max(lineHeightPx, lineHeightPx * lines);
    if (cursor + itemHeight > region.top + region.height + 0.5) {
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startIndex: i },
          continuationLabel: `continued (${input.items.length - i} remaining)`
        }
      };
    }
    if (markerStyle !== "none" && !nativeBullet) {
      nodes.push(
        makeMarker2(markerStyle, {
          left: region.left + indent,
          top: cursor,
          size: body.size,
          lineHeight: lineHeightPx,
          color: resolveMarkerColor2(bullet.color, tokens),
          sizeRatio: bullet.sizeRatio
        })
      );
    }
    const textNode = {
      kind: "text",
      rect: { left: textLeft, top: cursor, width: textWidth, height: itemHeight },
      style: {
        family: body.family,
        weight: body.weight,
        size: body.size,
        lineHeight: body.lineHeight,
        letterSpacing: body.letterSpacing,
        italic: body.italic,
        color: level === 1 ? tokens.palette.foreground : tokens.palette.muted,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    if (nativeBullet) {
      textNode.paragraphs = [{
        runs: [{ text: applyTypeTransform2(item.text, body.transform) }],
        level: level - 1,
        marginLeft: bullet.indent + bullet.gap,
        hangingIndent: bullet.indent,
        bullet: nativeBullet
      }];
    } else {
      textNode.content = applyTypeTransform2(item.text, body.transform);
    }
    nodes.push(textNode);
    cursor += itemHeight + betweenItemGap;
    placed++;
  }
  return {
    nodes,
    overflow: placed === input.items.length ? { kind: "fit" } : { kind: "fit" }
  };
};
function markerWidth2(marker, bodySize) {
  switch (marker) {
    case "none":
      return 0;
    case "autoNum":
      return 0;
    case "enDash":
      return bodySize * 0.9;
    case "chevron":
      return bodySize * 0.8;
    case "square":
    case "filledDot":
    case "openDot":
    default:
      return bodySize * 0.7;
  }
}
function tokenBulletConfig2(bullet, marker, startAt) {
  if (marker !== "autoNum") return void 0;
  return {
    type: "autoNum",
    scheme: bullet.scheme ?? "arabicPeriod",
    startAt
  };
}
function resolveMarkerColor2(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
  }
}
function makeMarker2(style, p) {
  const markerSize = p.size * p.sizeRatio;
  const centerY = p.top + p.lineHeight * 0.55;
  switch (style) {
    case "filledDot": {
      const d = markerSize * 0.5;
      const node = {
        kind: "view",
        shape: "ellipse",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        fill: p.color
      };
      return node;
    }
    case "openDot": {
      const d = markerSize * 0.6;
      const node = {
        kind: "view",
        shape: "ellipse",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        border: { width: 1, color: p.color, style: "solid" }
      };
      return node;
    }
    case "square": {
      const d = markerSize * 0.45;
      const node = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY - d / 2, width: d, height: d },
        fill: p.color
      };
      return node;
    }
    case "enDash": {
      const w = markerSize * 0.8;
      const h = Math.max(1, p.size * 0.08);
      const node = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY - h / 2, width: w, height: h },
        fill: p.color
      };
      return node;
    }
    case "chevron": {
      const h = p.lineHeight;
      const node = {
        kind: "text",
        rect: { left: p.left, top: p.top, width: markerSize, height: h },
        content: "\u203A",
        style: {
          family: "Helvetica Neue",
          weight: 600,
          size: p.size,
          letterSpacing: 0,
          color: p.color,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      };
      return node;
    }
    default: {
      const node = {
        kind: "view",
        shape: "rect",
        decorative: true,
        rect: { left: p.left, top: centerY, width: 0, height: 0 }
      };
      return node;
    }
  }
}

// ../pptx-primitives/src/primitives/metricStack.ts
var VALUE_MIN_COMPRESSION3 = 0.85;
var VALUE_COMPRESSION_STEP3 = 0.05;
var metricStack2 = (input, tokens, region) => {
  const nodes = [];
  let cursor = region.top;
  const startIndex = input.resume?.startIndex ?? 0;
  let placedCount = 0;
  let worstScale = 1;
  for (let i = startIndex; i < input.rows.length; i++) {
    const row = input.rows[i];
    const rowResult = layoutRow2(row, tokens, {
      left: region.left,
      top: cursor,
      width: region.width
    });
    const rowEnd = cursor + rowResult.consumedHeight;
    const ruleHeightAfter = i < input.rows.length - 1 && tokens.rules.divider !== "none" ? estimateRuleHeight2(tokens) : 0;
    if (rowEnd + ruleHeightAfter > region.top + region.height + 0.5) {
      if (placedCount === 0) {
        nodes.push(...rowResult.nodes);
        return {
          nodes,
          overflow: {
            kind: "clipped",
            droppedCount: input.rows.length - i - 1,
            reason: `metricStack row ${i} is taller than the region; ${input.rows.length - i - 1} subsequent rows dropped`
          }
        };
      }
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startIndex: i },
          continuationLabel: `continued (${input.rows.length - i} metrics remaining)`
        }
      };
    }
    nodes.push(...rowResult.nodes);
    cursor = rowEnd;
    placedCount++;
    if (rowResult.scale < worstScale) worstScale = rowResult.scale;
    if (i < input.rows.length - 1) {
      cursor += tokens.spacing.sm;
      const divider = emitHorizontalRule2(
        tokens.rules.divider,
        tokens.palette,
        region.left,
        cursor,
        region.width
      );
      nodes.push(...divider.nodes);
      cursor += divider.consumedHeight + tokens.spacing.sm;
    }
  }
  return {
    nodes,
    overflow: worstScale < 1 ? { kind: "compressed", scale: worstScale } : { kind: "fit" }
  };
};
function layoutRow2(row, tokens, place) {
  const nodes = [];
  let cursor = place.top;
  const caption = tokens.type.caption;
  const labelHeight = estimateLineHeight2(caption.size, caption.lineHeight, tokens, caption.family);
  const labelNode = {
    kind: "text",
    rect: { left: place.left, top: cursor, width: place.width, height: labelHeight },
    content: applyTypeTransform2(row.label, caption.transform),
    style: {
      family: caption.family,
      weight: caption.weight,
      size: caption.size,
      lineHeight: caption.lineHeight,
      letterSpacing: caption.letterSpacing,
      italic: caption.italic,
      color: tokens.palette.muted,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  nodes.push(labelNode);
  cursor += labelHeight + tokens.spacing.xs;
  const valueRole = tokens.type.title;
  let scale = 1;
  let valueWidth = estimateTextWidth2({
    content: row.value,
    family: valueRole.family,
    sizePt: valueRole.size,
    letterSpacing: valueRole.letterSpacing,
    digitsOnly: /^[\d,.\s$%+\-]+$/u.test(row.value)
  }, tokens);
  while (valueWidth > place.width && scale > VALUE_MIN_COMPRESSION3 - 1e-9) {
    scale = Number((scale - VALUE_COMPRESSION_STEP3).toFixed(2));
    valueWidth = estimateTextWidth2({
      content: row.value,
      family: valueRole.family,
      sizePt: valueRole.size * scale,
      letterSpacing: valueRole.letterSpacing * scale,
      digitsOnly: /^[\d,.\s$%+\-]+$/u.test(row.value)
    }, tokens);
  }
  const valueSizePt = valueRole.size * scale;
  const valueLineHeightPt = valueRole.lineHeight !== void 0 ? valueRole.lineHeight * scale : valueSizePt * 1.15;
  const valueLineHeightPx = estimateLineHeight2(valueSizePt, valueLineHeightPt, tokens, valueRole.family);
  const valueNode = {
    kind: "text",
    rect: { left: place.left, top: cursor, width: place.width, height: valueLineHeightPx },
    content: applyTypeTransform2(row.value, valueRole.transform),
    style: {
      family: valueRole.family,
      weight: valueRole.weight,
      size: valueSizePt,
      lineHeight: valueLineHeightPt,
      letterSpacing: valueRole.letterSpacing * scale,
      italic: valueRole.italic,
      color: tokens.palette.foreground,
      align: "left",
      verticalAlign: "top"
    },
    autoFit: false
  };
  nodes.push(valueNode);
  cursor += valueLineHeightPx;
  if (row.delta) {
    cursor += tokens.spacing.xs;
    const deltaCaption = tokens.type.caption;
    const deltaHeight = estimateLineHeight2(deltaCaption.size, deltaCaption.lineHeight, tokens, deltaCaption.family);
    const trend = row.trend ?? "flat";
    const deltaColor = trend === "up" ? tokens.palette.accent : trend === "down" ? tokens.palette.muted : tokens.palette.faint;
    nodes.push({
      kind: "text",
      rect: { left: place.left, top: cursor, width: place.width, height: deltaHeight },
      content: applyTypeTransform2(row.delta, deltaCaption.transform),
      style: {
        family: deltaCaption.family,
        weight: deltaCaption.weight,
        size: Math.max(deltaCaption.size, 10),
        lineHeight: deltaCaption.lineHeight,
        letterSpacing: deltaCaption.letterSpacing,
        italic: deltaCaption.italic,
        color: deltaColor,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    });
    cursor += deltaHeight;
  }
  return {
    nodes,
    consumedHeight: cursor - place.top,
    scale
  };
}
function estimateRuleHeight2(tokens) {
  if (tokens.rules.divider === "none") return 0;
  const m = tokens.rules.divider.matchAll(/(\d+(?:\.\d+)?)px/gu);
  let total = 0;
  for (const match of m) total += Number(match[1]);
  return total;
}

// ../pptx-primitives/src/primitives/comparisonBand.ts
var ROW_PAD_Y2 = 12;
var ROW_PAD_X2 = 12;
var comparisonBand2 = (input, tokens, region) => {
  const nodes = [];
  const colCount = input.columns.length;
  const labelRatio = input.labelColumnWidthRatio ?? 0.22;
  const labelColWidth = region.width * labelRatio;
  const valueColCount = Math.max(1, colCount - 1);
  const valueColWidth = (region.width - labelColWidth) / valueColCount;
  if (valueColWidth - ROW_PAD_X2 * 2 < 0 || labelColWidth - ROW_PAD_X2 * 2 < 0 || region.height < ROW_PAD_Y2 * 2) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: input.rows.length,
        reason: `region too narrow for ${colCount}-column comparisonBand`
      }
    };
  }
  const columnLeft = (idx) => idx === 0 ? region.left : region.left + labelColWidth + (idx - 1) * valueColWidth;
  const columnWidth = (idx) => idx === 0 ? labelColWidth : valueColWidth;
  let cursor = region.top;
  const caption = tokens.type.caption;
  const headerHeight = estimateLineHeight2(caption.size, caption.lineHeight, tokens, caption.family) + ROW_PAD_Y2;
  for (let c = 0; c < colCount; c++) {
    const headerText = input.columns[c];
    if (!headerText) continue;
    const node = {
      kind: "text",
      rect: {
        left: columnLeft(c) + ROW_PAD_X2,
        top: cursor,
        width: columnWidth(c) - ROW_PAD_X2 * 2,
        height: headerHeight
      },
      content: applyTypeTransform2(headerText, caption.transform === "none" ? "upper" : caption.transform),
      style: {
        family: caption.family,
        weight: 700,
        size: Math.max(caption.size, 10),
        lineHeight: caption.lineHeight,
        letterSpacing: Math.max(caption.letterSpacing, 1.2),
        italic: caption.italic,
        color: tokens.palette.muted,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(node);
  }
  cursor += headerHeight;
  const headerRule = emitHorizontalRule2(
    tokens.rules.section !== "none" ? tokens.rules.section : tokens.rules.divider,
    tokens.palette,
    region.left,
    cursor,
    region.width
  );
  nodes.push(...headerRule.nodes);
  cursor += headerRule.consumedHeight + tokens.spacing.sm;
  const startIndex = input.resume?.startRowIndex ?? 0;
  for (let r = startIndex; r < input.rows.length; r++) {
    const row = input.rows[r];
    const rowHeight = computeRowHeight3(row, tokens, labelColWidth, valueColWidth);
    if (cursor + rowHeight > region.top + region.height + 0.5) {
      return {
        nodes,
        overflow: {
          kind: "paginated",
          remaining: { startRowIndex: r },
          continuationLabel: `continued (${input.rows.length - r} rows remaining)`
        }
      };
    }
    if (row.accent) {
      const tick = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 1,
        rect: { left: region.left, top: cursor + 4, width: 2, height: rowHeight - 8 },
        fill: tokens.palette.accent
      };
      nodes.push(tick);
    }
    const body = tokens.type.body;
    const lineHeightPx = estimateLineHeight2(body.size, body.lineHeight, tokens, body.family);
    const labelLines = estimateLineCount2({
      content: row.label,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: labelColWidth - ROW_PAD_X2 * 2
    }, tokens);
    const labelNode = {
      kind: "text",
      rect: {
        left: region.left + ROW_PAD_X2,
        top: cursor + ROW_PAD_Y2 / 2,
        width: labelColWidth - ROW_PAD_X2 * 2,
        height: lineHeightPx * labelLines
      },
      content: applyTypeTransform2(row.label, body.transform),
      style: {
        family: body.family,
        weight: row.accent ? 700 : 500,
        size: body.size,
        lineHeight: body.lineHeight,
        letterSpacing: body.letterSpacing,
        italic: body.italic,
        color: tokens.palette.foreground,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(labelNode);
    for (let c = 0; c < row.values.length; c++) {
      const value = row.values[c];
      const colIndex = c + 1;
      if (colIndex >= colCount) break;
      const lines = estimateLineCount2({
        content: value,
        family: body.family,
        sizePt: body.size,
        letterSpacing: body.letterSpacing,
        width: valueColWidth - ROW_PAD_X2 * 2
      }, tokens);
      const valueNode = {
        kind: "text",
        rect: {
          left: columnLeft(colIndex) + ROW_PAD_X2,
          top: cursor + ROW_PAD_Y2 / 2,
          width: valueColWidth - ROW_PAD_X2 * 2,
          height: lineHeightPx * lines
        },
        content: applyTypeTransform2(value, body.transform),
        style: {
          family: body.family,
          weight: body.weight,
          size: body.size,
          lineHeight: body.lineHeight,
          letterSpacing: body.letterSpacing,
          italic: body.italic,
          color: tokens.palette.foreground,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      };
      nodes.push(valueNode);
    }
    cursor += rowHeight;
    if (r < input.rows.length - 1) {
      const divider = emitHorizontalRule2(
        tokens.rules.divider,
        tokens.palette,
        region.left,
        cursor,
        region.width
      );
      nodes.push(...divider.nodes);
      cursor += divider.consumedHeight;
    }
  }
  return { nodes, overflow: { kind: "fit" } };
};
function computeRowHeight3(row, tokens, labelColWidth, valueColWidth) {
  const body = tokens.type.body;
  const lineHeightPx = estimateLineHeight2(body.size, body.lineHeight, tokens, body.family);
  let maxLines = 1;
  const labelLines = estimateLineCount2({
    content: row.label,
    family: body.family,
    sizePt: body.size,
    letterSpacing: body.letterSpacing,
    width: labelColWidth - ROW_PAD_X2 * 2
  }, tokens);
  if (labelLines > maxLines) maxLines = labelLines;
  const valueInnerWidth = valueColWidth - ROW_PAD_X2 * 2;
  for (const v of row.values) {
    const l = estimateLineCount2({
      content: v,
      family: body.family,
      sizePt: body.size,
      letterSpacing: body.letterSpacing,
      width: valueInnerWidth
    }, tokens);
    if (l > maxLines) maxLines = l;
  }
  return lineHeightPx * maxLines + ROW_PAD_Y2;
}

// ../pptx-primitives/src/primitives/stepTimeline.ts
var MARKER_BREATHING_ROOM2 = 4;
var PLAIN_DOT_RADIUS2 = 5;
var CIRCLED_MARKER_RADIUS2 = 16;
var stepTimeline2 = (input, tokens, region) => {
  const nodes = [];
  const stepCount = input.steps.length;
  if (stepCount === 0) return { nodes, overflow: { kind: "fit" } };
  const colWidth = region.width / stepCount;
  const railY = region.top + region.height * 0.3;
  const markerStyle = tokens.ornament.stepMarker.style;
  const markerRadius = markerStyle === "circleNumeric" || markerStyle === "serifCircled" ? CIRCLED_MARKER_RADIUS2 : PLAIN_DOT_RADIUS2;
  const railVerticalPadding = markerRadius + MARKER_BREATHING_ROOM2;
  const rule = emitHorizontalRule2(
    tokens.rules.divider !== "none" ? tokens.rules.divider : "1px solid token:rule",
    tokens.palette,
    region.left,
    railY,
    region.width
  );
  nodes.push(...rule.nodes);
  const titleRole = tokens.type.title;
  const titleSize = Math.min(titleRole.size, 22);
  const titleLineHeight = titleRole.lineHeight !== void 0 ? Math.min(titleRole.lineHeight, 28) : void 0;
  const labelLineHeightPx = estimateLineHeight2(titleSize, titleLineHeight, tokens, titleRole.family);
  const labelLineCounts = input.steps.map(
    (s) => estimateLineCount2({
      content: s.label,
      family: titleRole.family,
      sizePt: titleSize,
      letterSpacing: titleRole.letterSpacing,
      width: colWidth * 0.9
    }, tokens)
  );
  const maxLabelLines = Math.max(1, ...labelLineCounts);
  const labelTop = railY + railVerticalPadding + 8;
  const maxLabelHeight = labelLineHeightPx * maxLabelLines;
  const descTop = labelTop + maxLabelHeight + tokens.spacing.xs;
  for (let i = 0; i < stepCount; i++) {
    const step = input.steps[i];
    const colCenterX = region.left + (i + 0.5) * colWidth;
    const eyebrow = tokens.type.eyebrow;
    const tagHeight = estimateLineHeight2(eyebrow.size, eyebrow.lineHeight, tokens, eyebrow.family);
    const tagNode = {
      kind: "text",
      rect: {
        left: colCenterX - colWidth * 0.45,
        top: railY - railVerticalPadding - tagHeight,
        width: colWidth * 0.9,
        height: tagHeight
      },
      content: applyTypeTransform2(step.tag, eyebrow.transform),
      style: {
        family: eyebrow.family,
        weight: eyebrow.weight,
        size: eyebrow.size,
        lineHeight: eyebrow.lineHeight,
        letterSpacing: eyebrow.letterSpacing,
        italic: eyebrow.italic,
        color: tokens.palette.accent,
        align: "center",
        verticalAlign: "bottom"
      },
      autoFit: false
    };
    nodes.push(tagNode);
    nodes.push(...makeStepMarker2(i + 1, colCenterX, railY, tokens));
    const labelNode = {
      kind: "text",
      rect: {
        left: colCenterX - colWidth * 0.45,
        top: labelTop,
        width: colWidth * 0.9,
        height: maxLabelHeight
      },
      content: applyTypeTransform2(step.label, titleRole.transform),
      style: {
        family: titleRole.family,
        weight: titleRole.weight,
        size: titleSize,
        lineHeight: titleLineHeight,
        letterSpacing: titleRole.letterSpacing,
        italic: titleRole.italic,
        color: tokens.palette.foreground,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(labelNode);
    if (step.description) {
      const body = tokens.type.body;
      const descLineHeightPx = estimateLineHeight2(body.size, body.lineHeight, tokens, body.family);
      const descLines = estimateLineCount2({
        content: step.description,
        family: body.family,
        sizePt: body.size,
        letterSpacing: body.letterSpacing,
        width: colWidth * 0.9
      }, tokens);
      const descHeight = descLineHeightPx * descLines;
      if (descTop + descHeight <= region.top + region.height + 0.5) {
        nodes.push({
          kind: "text",
          rect: {
            left: colCenterX - colWidth * 0.45,
            top: descTop,
            width: colWidth * 0.9,
            height: descHeight
          },
          content: applyTypeTransform2(step.description, body.transform),
          style: {
            family: body.family,
            weight: body.weight,
            size: body.size,
            lineHeight: body.lineHeight,
            letterSpacing: body.letterSpacing,
            italic: body.italic,
            color: tokens.palette.muted,
            align: "center",
            verticalAlign: "top"
          },
          autoFit: false
        });
      }
    }
  }
  return { nodes, overflow: { kind: "fit" } };
};
function makeStepMarker2(index, cx, cy, tokens) {
  const style = tokens.ornament.stepMarker.style;
  const fillRole = tokens.ornament.stepMarker.fill;
  const fill = resolveOrnamentFill2(fillRole, tokens);
  if (style === "none" || style === "plain") {
    const r = 5;
    const dot = {
      kind: "view",
      shape: "ellipse",
      decorative: true,
      zIndex: 2,
      rect: { left: cx - r, top: cy - r, width: r * 2, height: r * 2 },
      fill
    };
    return [dot];
  }
  const diameter = 32;
  const circle = {
    kind: "view",
    shape: "ellipse",
    decorative: false,
    zIndex: 2,
    rect: { left: cx - diameter / 2, top: cy - diameter / 2, width: diameter, height: diameter },
    fill
  };
  const label = {
    kind: "text",
    zIndex: 3,
    rect: { left: cx - diameter / 2, top: cy - diameter / 2, width: diameter, height: diameter },
    content: String(index),
    style: {
      family: style === "serifCircled" ? "Georgia" : tokens.type.title.family,
      weight: 700,
      size: 16,
      letterSpacing: 0,
      color: tokens.palette.accentInverse,
      align: "center",
      verticalAlign: "middle"
    },
    autoFit: false
  };
  return [circle, label];
}
function resolveOrnamentFill2(role, tokens) {
  switch (role) {
    case "foreground":
      return tokens.palette.foreground;
    case "accent":
      return tokens.palette.accent;
    case "muted":
      return tokens.palette.muted;
    case "surface":
      return tokens.canvas.surface;
  }
}

// ../pptx-primitives/src/primitives/tombstoneStack.ts
var tombstoneStack2 = (input, tokens, region) => {
  const nodes = [];
  if (input.tiles.length === 0) return { nodes, overflow: { kind: "fit" } };
  const cols = Math.max(1, input.columns ?? 4);
  const rowGap = input.rowGap ?? tokens.spacing.sm;
  const colGap = input.columnGap ?? tokens.spacing.sm;
  const logoHeight = input.logoHeight ?? 36;
  const TILE_PAD = input.compact ? 6 : 8;
  const tileWidth = (region.width - colGap * (cols - 1)) / cols;
  if (tileWidth - TILE_PAD * 2 <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: input.tiles.length,
        reason: `region too narrow for ${cols}-column tombstoneStack`
      }
    };
  }
  const bodyRole = tokens.type.body;
  const captionRole = tokens.type.caption;
  const titleLineHeight = estimateLineHeight2(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  const bodyLineHeight = estimateLineHeight2(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  const tileBodyWidth = tileWidth - TILE_PAD * 2;
  let maxTileContentHeight = 0;
  for (const tile of input.tiles) {
    const titleLines = estimateLineCount2({
      content: tile.title,
      family: captionRole.family,
      sizePt: Math.max(captionRole.size, 11),
      letterSpacing: captionRole.letterSpacing,
      width: tileBodyWidth
    }, tokens);
    const bodyLines = tile.body ? estimateLineCount2({
      content: tile.body,
      family: bodyRole.family,
      sizePt: bodyRole.size,
      letterSpacing: bodyRole.letterSpacing,
      width: tileBodyWidth
    }, tokens) : 0;
    const content = (logoHeight > 0 ? logoHeight + tokens.spacing.xs : 0) + titleLineHeight * titleLines + (bodyLines > 0 ? tokens.spacing.xs + bodyLineHeight * bodyLines : 0);
    if (content > maxTileContentHeight) maxTileContentHeight = content;
  }
  const tileHeight = maxTileContentHeight + TILE_PAD * 2;
  const startIndex = input.resume?.startTileIndex ?? 0;
  const rowsPerPage = Math.max(1, Math.floor((region.height + rowGap) / (tileHeight + rowGap)));
  const tilesPerPage = rowsPerPage * cols;
  for (let i = 0; i < tilesPerPage; i++) {
    const tileIndex = startIndex + i;
    if (tileIndex >= input.tiles.length) break;
    const tile = input.tiles[tileIndex];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tileRect = {
      left: region.left + col * (tileWidth + colGap),
      top: region.top + row * (tileHeight + rowGap),
      width: tileWidth,
      height: tileHeight
    };
    const border = {
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: tileRect,
      border: { width: 1, color: tokens.palette.rule, style: "solid" }
    };
    nodes.push(border);
    if (tile.accent) {
      const tick = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 1,
        rect: { left: tileRect.left, top: tileRect.top, width: 2, height: tileRect.height },
        fill: tokens.palette.accent
      };
      nodes.push(tick);
    }
    let cursor = tileRect.top + TILE_PAD;
    if (logoHeight > 0 && tile.logo) {
      nodes.push({
        kind: "image",
        zIndex: 1,
        rect: {
          left: tileRect.left + TILE_PAD,
          top: cursor,
          width: tileBodyWidth,
          height: logoHeight
        },
        src: tile.logo,
        alt: tile.title,
        decorative: false
      });
      cursor += logoHeight + tokens.spacing.xs;
    } else if (logoHeight > 0) {
      cursor += logoHeight + tokens.spacing.xs;
    }
    const titleLines = estimateLineCount2({
      content: tile.title,
      family: captionRole.family,
      sizePt: Math.max(captionRole.size, 11),
      letterSpacing: captionRole.letterSpacing,
      width: tileBodyWidth
    }, tokens);
    const titleNode = {
      kind: "text",
      zIndex: 1,
      rect: {
        left: tileRect.left + TILE_PAD,
        top: cursor,
        width: tileBodyWidth,
        height: titleLineHeight * titleLines
      },
      content: applyTypeTransform2(tile.title, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: 700,
        size: Math.max(captionRole.size, 11),
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: tokens.palette.foreground,
        align: "left",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(titleNode);
    cursor += titleLineHeight * titleLines;
    if (tile.body) {
      cursor += tokens.spacing.xs;
      const bodyLines = estimateLineCount2({
        content: tile.body,
        family: bodyRole.family,
        sizePt: bodyRole.size,
        letterSpacing: bodyRole.letterSpacing,
        width: tileBodyWidth
      }, tokens);
      const bodyNode = {
        kind: "text",
        zIndex: 1,
        rect: {
          left: tileRect.left + TILE_PAD,
          top: cursor,
          width: tileBodyWidth,
          height: bodyLineHeight * bodyLines
        },
        content: applyTypeTransform2(tile.body, bodyRole.transform),
        style: {
          family: bodyRole.family,
          weight: bodyRole.weight,
          size: bodyRole.size,
          lineHeight: bodyRole.lineHeight,
          letterSpacing: bodyRole.letterSpacing,
          italic: bodyRole.italic,
          color: tokens.palette.muted,
          align: "left",
          verticalAlign: "top"
        },
        autoFit: false
      };
      nodes.push(bodyNode);
    }
  }
  const placedCount = Math.min(tilesPerPage, input.tiles.length - startIndex);
  const remaining = input.tiles.length - (startIndex + placedCount);
  const overflow = remaining > 0 ? {
    kind: "paginated",
    remaining: { startTileIndex: startIndex + placedCount },
    continuationLabel: `${remaining} tiles remaining`
  } : { kind: "fit" };
  return { nodes, overflow };
};

// ../pptx-primitives/src/primitives/waterfallBars.ts
var LABEL_AREA_HEIGHT_FRACTION2 = 0.22;
var waterfallBars2 = (input, tokens, region) => {
  const nodes = [];
  if (input.steps.length === 0) return { nodes, overflow: { kind: "fit" } };
  const barWidthRatio = input.barWidthRatio ?? 0.55;
  const minStepWidth = input.minStepWidth ?? 40;
  const showConnectors = input.showConnectors ?? true;
  const running = [];
  let acc = 0;
  for (const step of input.steps) {
    if (step.kind === "start") {
      acc = step.value;
      running.push(acc);
    } else if (step.kind === "up") {
      acc += step.value;
      running.push(acc);
    } else if (step.kind === "down") {
      acc -= step.value;
      running.push(acc);
    } else {
      acc = step.value;
      running.push(acc);
    }
  }
  const maxValue = Math.max(0, ...running, ...input.steps.map((s) => Math.abs(s.value)));
  if (maxValue <= 0) return { nodes, overflow: { kind: "fit" } };
  const stepCount = input.steps.length;
  const stepWidth = region.width / stepCount;
  if (stepWidth < minStepWidth) {
    const droppable = Math.max(0, stepCount - Math.floor(region.width / minStepWidth));
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: droppable,
        reason: `step width ${stepWidth.toFixed(0)}px below minStepWidth ${minStepWidth}`
      }
    };
  }
  const barWidth = stepWidth * barWidthRatio;
  const captionRole = tokens.type.caption;
  const labelLineHeight = estimateLineHeight2(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  const labelReserve = Math.max(labelLineHeight, region.height * LABEL_AREA_HEIGHT_FRACTION2 / 2);
  const chartTop = region.top + labelReserve;
  const chartBottom = region.top + region.height - labelReserve;
  const chartHeight = Math.max(10, chartBottom - chartTop);
  const scale = chartHeight / maxValue;
  const baselineY = chartBottom;
  let prevTopY = null;
  let prevTopX = null;
  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    const stepCenterX = region.left + (i + 0.5) * stepWidth;
    const barLeft = stepCenterX - barWidth / 2;
    let barTopY;
    let barBottomY;
    let color;
    let topOfVisibleBar;
    if (step.kind === "start" || step.kind === "end") {
      barTopY = baselineY - step.value * scale;
      barBottomY = baselineY;
      color = tokens.palette.foreground;
      topOfVisibleBar = barTopY;
    } else if (step.kind === "up") {
      const base = running[i] - step.value;
      barTopY = baselineY - running[i] * scale;
      barBottomY = baselineY - base * scale;
      color = tokens.palette.accent;
      topOfVisibleBar = barTopY;
    } else {
      const base = running[i] + step.value;
      barTopY = baselineY - base * scale;
      barBottomY = baselineY - running[i] * scale;
      color = tokens.palette.muted;
      topOfVisibleBar = barBottomY;
    }
    const bar = {
      kind: "view",
      shape: "rect",
      decorative: false,
      zIndex: 1,
      rect: {
        left: barLeft,
        top: Math.min(barTopY, barBottomY),
        width: barWidth,
        height: Math.abs(barBottomY - barTopY)
      },
      fill: color
    };
    nodes.push(bar);
    const valueText = step.valueLabel ?? formatValue2(step.value, step.kind);
    const valueNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: stepCenterX - stepWidth / 2,
        top: Math.min(barTopY, barBottomY) - labelLineHeight - 2,
        width: stepWidth,
        height: labelLineHeight
      },
      content: applyTypeTransform2(valueText, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: 700,
        size: Math.max(captionRole.size, 10),
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: step.kind === "up" ? tokens.palette.accent : step.kind === "down" ? tokens.palette.muted : tokens.palette.foreground,
        align: "center",
        verticalAlign: "bottom"
      },
      autoFit: false
    };
    nodes.push(valueNode);
    const stepLabelNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: stepCenterX - stepWidth / 2,
        top: baselineY + 4,
        width: stepWidth,
        height: labelLineHeight
      },
      content: applyTypeTransform2(step.label, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: captionRole.weight,
        size: captionRole.size,
        lineHeight: captionRole.lineHeight,
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: tokens.palette.muted,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    nodes.push(stepLabelNode);
    if (showConnectors && prevTopY !== null && prevTopX !== null) {
      const connectorY = step.kind === "up" ? baselineY - (running[i] - step.value) * scale : step.kind === "down" ? baselineY - (running[i] + step.value) * scale : topOfVisibleBar;
      const connector = {
        kind: "view",
        shape: "rect",
        decorative: true,
        zIndex: 0,
        rect: {
          left: prevTopX,
          top: connectorY - 0.5,
          width: barLeft - prevTopX,
          height: 1
        },
        fill: tokens.palette.rule
      };
      nodes.push(connector);
    }
    prevTopX = barLeft + barWidth;
    prevTopY = topOfVisibleBar;
  }
  return { nodes, overflow: { kind: "fit" } };
};
function formatValue2(value, kind) {
  const abs = Math.abs(value);
  const formatted = abs >= 1e3 ? abs.toLocaleString("en-US", { maximumFractionDigits: 1 }) : abs.toString();
  if (kind === "up") return `+${formatted}`;
  if (kind === "down") return `\u2212${formatted}`;
  return formatted;
}

// ../pptx-primitives/src/primitives/orgTree.ts
var BOX_PAD2 = 10;
var orgTree2 = (input, tokens, region) => {
  const nodes = [];
  if (input.children.length === 0) {
    nodes.push(...renderNode2(input.root, tokens, {
      left: region.left + region.width / 4,
      top: region.top + region.height / 3,
      width: region.width / 2,
      height: region.height / 3
    }, input.rootFill ?? "foreground"));
    return { nodes, overflow: { kind: "fit" } };
  }
  const rootHeightRatio = input.rootHeightRatio ?? 0.28;
  const childGap = input.childGap ?? tokens.spacing.sm;
  const minChildWidth = input.minChildWidth ?? 80;
  const rootWidth = Math.min(region.width * 0.5, 280);
  const rootTextHeight = measureNodeTextBlockHeight2(input.root, tokens, rootWidth - BOX_PAD2 * 2);
  const rootHeight = Math.min(
    region.height * 0.48,
    Math.max(region.height * rootHeightRatio, rootTextHeight + BOX_PAD2 * 2)
  );
  const rootLeft = region.left + (region.width - rootWidth) / 2;
  const rootTop = region.top;
  nodes.push(...renderNode2(input.root, tokens, {
    left: rootLeft,
    top: rootTop,
    width: rootWidth,
    height: rootHeight
  }, input.rootFill ?? "foreground"));
  const connectorGap = Math.max(18, region.height * 0.16);
  const childRowTop = Math.min(
    region.top + rootHeight + connectorGap,
    region.top + region.height * 0.62
  );
  const childRowHeight = region.height - (childRowTop - region.top);
  const totalGap = childGap * (input.children.length - 1);
  const childWidth = (region.width - totalGap) / input.children.length;
  let droppedCount = 0;
  const visibleChildren = [];
  if (childWidth < minChildWidth) {
    const maxChildren = Math.max(1, Math.floor((region.width + childGap) / (minChildWidth + childGap)));
    droppedCount = input.children.length - maxChildren;
    visibleChildren.push(...input.children.slice(0, maxChildren));
  } else {
    visibleChildren.push(...input.children);
  }
  const visibleChildWidth = visibleChildren.length > 0 ? (region.width - childGap * (visibleChildren.length - 1)) / visibleChildren.length : childWidth;
  const rootBottomY = rootTop + rootHeight;
  const childTopY = childRowTop;
  const railY = rootBottomY + (childTopY - rootBottomY) / 2;
  const rootCenterX = rootLeft + rootWidth / 2;
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: rootCenterX - 0.5, top: rootBottomY, width: 1, height: railY - rootBottomY },
    fill: tokens.palette.rule
  });
  const childCenters = visibleChildren.map(
    (_, i) => region.left + i * (visibleChildWidth + childGap) + visibleChildWidth / 2
  );
  if (childCenters.length > 1) {
    const railLeft = region.left;
    const railRight = region.left + (visibleChildren.length - 1) * (visibleChildWidth + childGap) + visibleChildWidth;
    nodes.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: { left: railLeft, top: railY - 0.5, width: railRight - railLeft, height: 1 },
      fill: tokens.palette.rule
    });
  }
  for (const cx of childCenters) {
    nodes.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: { left: cx - 0.5, top: railY, width: 1, height: childTopY - railY },
      fill: tokens.palette.rule
    });
  }
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i];
    const childLeft = region.left + i * (visibleChildWidth + childGap);
    nodes.push(...renderNode2(child, tokens, {
      left: childLeft,
      top: childTopY,
      width: visibleChildWidth,
      height: childRowHeight
    }, "surface", child.accent));
  }
  const overflow = droppedCount > 0 ? {
    kind: "clipped",
    droppedCount,
    reason: `${droppedCount} child nodes dropped; per-child budget < minChildWidth`
  } : { kind: "fit" };
  return { nodes, overflow };
};
function renderNode2(node, tokens, rect, fill, accent) {
  const isFilled = fill === "foreground";
  const box = {
    kind: "view",
    shape: "rect",
    decorative: false,
    zIndex: 1,
    rect,
    ...isFilled ? { fill: tokens.palette.foreground } : { border: { width: 1, color: tokens.palette.foreground, style: "solid" } },
    children: []
  };
  if (accent) {
    box.children.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 2,
      rect: { left: 0, top: 0, width: 2, height: rect.height },
      fill: tokens.palette.accent
    });
  }
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const titleSize = chooseTitleSize2(node, tokens, rect.width - BOX_PAD2 * 2, rect.height);
  const titleLineHeight = compactLineHeight2(titleSize, titleRole.lineHeight);
  const titleLineHeightPx = estimateLineHeight2(titleSize, titleLineHeight, tokens, titleRole.family);
  const titleLines = estimateLineCount2({
    content: node.title,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: rect.width - BOX_PAD2 * 2
  }, tokens);
  const titleHeight = titleLineHeightPx * titleLines;
  const subtitleHeight = node.subtitle ? estimateLineHeight2(captionRole.size, compactLineHeight2(captionRole.size, captionRole.lineHeight), tokens, captionRole.family) : 0;
  const textBlockHeight = titleHeight + (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0);
  const textTop = Math.max(BOX_PAD2, (rect.height - textBlockHeight) / 2);
  const titleNode = {
    kind: "text",
    zIndex: 2,
    rect: {
      left: BOX_PAD2,
      top: textTop,
      width: rect.width - BOX_PAD2 * 2,
      height: titleHeight
    },
    content: applyTypeTransform2(node.title, titleRole.transform),
    style: {
      family: titleRole.family,
      weight: titleRole.weight,
      size: titleSize,
      lineHeight: titleLineHeight,
      letterSpacing: titleRole.letterSpacing,
      italic: titleRole.italic,
      color: isFilled ? tokens.palette.accentInverse : tokens.palette.foreground,
      align: "center",
      verticalAlign: "top"
    },
    autoFit: false
  };
  box.children.push(titleNode);
  if (node.subtitle) {
    const subNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: BOX_PAD2,
        top: textTop + titleHeight + tokens.spacing.xs,
        width: rect.width - BOX_PAD2 * 2,
        height: subtitleHeight
      },
      content: applyTypeTransform2(node.subtitle, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: captionRole.weight,
        size: captionRole.size,
        lineHeight: compactLineHeight2(captionRole.size, captionRole.lineHeight),
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: isFilled ? tokens.palette.accentInverse : tokens.palette.muted,
        align: "center",
        verticalAlign: "top"
      },
      autoFit: false
    };
    box.children.push(subNode);
  }
  return [box];
}
function compactLineHeight2(size, requested) {
  const natural = size * 1.18;
  return requested === void 0 ? natural : Math.min(requested, size * 1.32);
}
function measureNodeTextBlockHeight2(node, tokens, innerWidth) {
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const titleSize = Math.min(titleRole.size, 15);
  const titleLineHeight = compactLineHeight2(titleSize, titleRole.lineHeight);
  const titleLineHeightPx = estimateLineHeight2(titleSize, titleLineHeight, tokens, titleRole.family);
  const titleLines = estimateLineCount2({
    content: node.title,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: innerWidth
  }, tokens);
  const subtitleHeight = node.subtitle ? estimateLineHeight2(captionRole.size, compactLineHeight2(captionRole.size, captionRole.lineHeight), tokens, captionRole.family) : 0;
  return titleLineHeightPx * titleLines + (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0);
}
function chooseTitleSize2(node, tokens, innerWidth, boxHeight) {
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const subtitleHeight = node.subtitle ? estimateLineHeight2(captionRole.size, compactLineHeight2(captionRole.size, captionRole.lineHeight), tokens, captionRole.family) : 0;
  const maxTitleSize = Math.min(titleRole.size, 15);
  const available = Math.max(8, boxHeight - BOX_PAD2 * 2 - (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0));
  for (let size = maxTitleSize; size >= 9; size -= 1) {
    const lineHeight = compactLineHeight2(size, titleRole.lineHeight);
    const lineHeightPx = estimateLineHeight2(size, lineHeight, tokens, titleRole.family);
    const lines = estimateLineCount2({
      content: node.title,
      family: titleRole.family,
      sizePt: size,
      letterSpacing: titleRole.letterSpacing,
      width: innerWidth
    }, tokens);
    if (lineHeightPx * lines <= available) return size;
  }
  return 9;
}

// ../pptx-primitives/src/primitives/quadrantMap.ts
var quadrantMap2 = (input, tokens, region) => {
  const nodes = [];
  const points = input.points ?? [];
  const reservedLabelRects = [];
  const placedPointLabelRects = [];
  const captionForReserve = tokens.type.caption;
  const yLabels = input.yAxisLabel ? [input.yAxisLabel.low, input.yAxisLabel.high] : [];
  const measuredYReserve = yLabels.length === 0 ? 28 : Math.max(
    ...yLabels.map(
      (text) => estimateTextWidth2({
        content: applyTypeTransform2(text, captionForReserve.transform === "none" ? "upper" : captionForReserve.transform),
        family: captionForReserve.family,
        sizePt: captionForReserve.size,
        letterSpacing: Math.max(captionForReserve.letterSpacing, 1)
      }, tokens)
    )
  ) + 8;
  const reserve = Math.min(
    input.axisLabelReserve ?? Math.max(28, measuredYReserve),
    region.width * 0.3
  );
  const chartLeft = region.left + reserve;
  const chartRight = region.left + region.width - reserve / 2;
  const chartTop = region.top + reserve / 2;
  const chartBottom = region.top + region.height - reserve;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  if (chartWidth <= 0 || chartHeight <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: points.length,
        reason: "region too small for quadrantMap chart area"
      }
    };
  }
  const midX = chartLeft + chartWidth / 2;
  const midY = chartTop + chartHeight / 2;
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: midX - 0.5, top: chartTop, width: 1, height: chartHeight },
    fill: tokens.palette.foreground
  });
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: chartLeft, top: midY - 0.5, width: chartWidth, height: 1 },
    fill: tokens.palette.foreground
  });
  const captionRole = tokens.type.caption;
  const captionLineHeight = estimateLineHeight2(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  if (input.quadrants) {
    const quarterPad = 10;
    const quarters = [
      // Bottom-left (low vision, low execution) — top-left of this sub-rect.
      { text: input.quadrants[0], left: chartLeft + quarterPad, top: midY + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "left" },
      // Bottom-right.
      { text: input.quadrants[1], left: midX + quarterPad, top: midY + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "right" },
      // Top-left.
      { text: input.quadrants[2], left: chartLeft + quarterPad, top: chartTop + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "left" },
      // Top-right.
      { text: input.quadrants[3], left: midX + quarterPad, top: chartTop + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "right" }
    ];
    for (const q of quarters) {
      const rect = {
        left: q.left,
        top: q.top,
        width: q.width,
        height: captionLineHeight
      };
      const node = {
        kind: "text",
        zIndex: 1,
        rect,
        content: applyTypeTransform2(q.text, captionRole.transform === "none" ? "upper" : captionRole.transform),
        style: {
          family: captionRole.family,
          weight: 700,
          size: Math.max(captionRole.size, 10),
          lineHeight: captionRole.lineHeight,
          letterSpacing: Math.max(captionRole.letterSpacing, 1.2),
          italic: captionRole.italic,
          color: tokens.palette.muted,
          align: q.align,
          verticalAlign: "top"
        },
        autoFit: false
      };
      nodes.push(node);
      reservedLabelRects.push(rect);
    }
  }
  if (input.xAxisLabel) {
    const low = axisLabel2(input.xAxisLabel.low, chartLeft, chartBottom + 4, chartWidth / 2, "left", tokens);
    nodes.push(low);
    reservedLabelRects.push(low.rect);
    const high = axisLabel2(input.xAxisLabel.high, midX, chartBottom + 4, chartWidth / 2, "right", tokens);
    nodes.push(high);
    reservedLabelRects.push(high.rect);
  }
  if (input.yAxisLabel) {
    const yLabelWidth = Math.max(0, reserve - 4);
    const low = axisLabel2(input.yAxisLabel.low, region.left, chartBottom - captionLineHeight, yLabelWidth, "left", tokens);
    const high = axisLabel2(input.yAxisLabel.high, region.left, chartTop, yLabelWidth, "left", tokens);
    nodes.push(low, high);
    reservedLabelRects.push(low.rect, high.rect);
  }
  const dotRadius = input.dotRadius ?? 5;
  const bodyRole = tokens.type.body;
  const bodyLineHeight = estimateLineHeight2(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  let pointZBase = 10;
  for (const point of points) {
    const clampedX = Math.max(0, Math.min(100, point.x));
    const clampedY = Math.max(0, Math.min(100, point.y));
    const cx = chartLeft + clampedX / 100 * chartWidth;
    const cy = chartBottom - clampedY / 100 * chartHeight;
    const isPrimary = (point.emphasis ?? "secondary") === "primary";
    const color = isPrimary ? tokens.palette.accent : tokens.palette.muted;
    const dot = {
      kind: "view",
      shape: "ellipse",
      decorative: false,
      zIndex: pointZBase,
      rect: { left: cx - dotRadius, top: cy - dotRadius, width: dotRadius * 2, height: dotRadius * 2 },
      fill: color
    };
    nodes.push(dot);
    const textWidth = estimateTextWidth2({
      content: point.name,
      family: bodyRole.family,
      sizePt: bodyRole.size,
      letterSpacing: bodyRole.letterSpacing
    }, tokens);
    const labelWidth = Math.min(chartWidth, Math.max(1, textWidth + 4));
    const labelRect = choosePointLabelRect2({
      cx,
      cy,
      dotRadius,
      labelWidth,
      labelHeight: bodyLineHeight,
      chart: { left: chartLeft, top: chartTop, width: chartWidth, height: chartHeight },
      bounds: region,
      reservedRects: [...reservedLabelRects, ...placedPointLabelRects]
    });
    const align = labelRect.left + labelRect.width <= cx - dotRadius ? "right" : "left";
    const labelNode = {
      kind: "text",
      zIndex: pointZBase + 1,
      rect: labelRect,
      content: applyTypeTransform2(point.name, bodyRole.transform),
      style: {
        family: bodyRole.family,
        weight: isPrimary ? 700 : bodyRole.weight,
        size: bodyRole.size,
        lineHeight: bodyRole.lineHeight,
        letterSpacing: bodyRole.letterSpacing,
        italic: bodyRole.italic,
        color: isPrimary ? tokens.palette.foreground : tokens.palette.muted,
        align,
        verticalAlign: "middle"
      },
      autoFit: false
    };
    nodes.push(labelNode);
    placedPointLabelRects.push(labelRect);
    pointZBase += 2;
  }
  return { nodes, overflow: { kind: "fit" } };
};
function axisLabel2(text, left, top, width, align, tokens) {
  const captionRole = tokens.type.caption;
  const captionLineHeight = estimateLineHeight2(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  return {
    kind: "text",
    zIndex: 1,
    rect: { left, top, width, height: captionLineHeight },
    content: applyTypeTransform2(text, captionRole.transform === "none" ? "upper" : captionRole.transform),
    style: {
      family: captionRole.family,
      weight: captionRole.weight,
      size: captionRole.size,
      lineHeight: captionRole.lineHeight,
      letterSpacing: Math.max(captionRole.letterSpacing, 1),
      italic: captionRole.italic,
      color: tokens.palette.muted,
      align,
      verticalAlign: "top"
    },
    autoFit: false
  };
}
function rectsOverlap2(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}
function overlapArea2(a, b) {
  if (!rectsOverlap2(a, b)) return 0;
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return Math.max(0, width) * Math.max(0, height);
}
function clampRectToChart2(rect, chart) {
  return {
    ...rect,
    left: Math.min(Math.max(rect.left, chart.left), chart.left + chart.width - rect.width),
    top: Math.min(Math.max(rect.top, chart.top), chart.top + chart.height - rect.height)
  };
}
function choosePointLabelRect2(input) {
  const { cx, cy, dotRadius, labelWidth, labelHeight, chart, bounds, reservedRects } = input;
  const gap = dotRadius + 5;
  const centeredTop = cy - labelHeight / 2;
  const centeredLeft = cx - labelWidth / 2;
  const candidates = [
    { left: cx + gap, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: cx - gap - labelWidth, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: centeredLeft, top: cy + gap, width: labelWidth, height: labelHeight },
    { left: centeredLeft, top: cy - gap - labelHeight, width: labelWidth, height: labelHeight },
    { left: chart.left + chart.width + 4, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: chart.left - labelWidth - 4, top: centeredTop, width: labelWidth, height: labelHeight }
  ].map((rect) => clampRectToChart2(rect, bounds));
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((rect, index) => {
    const collisionScore = reservedRects.reduce((sum, reserved) => sum + overlapArea2(rect, reserved), 0);
    const score = collisionScore * 1e3 + index;
    if (score < bestScore) {
      best = rect;
      bestScore = score;
    }
  });
  return best;
}

// ../pptx-primitives/src/util/fontkitProvider.ts
var PX_PER_PT4 = 96 / 72;

// ../pptx-primitives/src/ast/toPaperNodes.ts
function toPaperNodes2(nodes) {
  return nodes.map(toPaperNode2);
}
function toPaperNode2(node) {
  switch (node.kind) {
    case "view":
      return translateView(node);
    case "text":
      return translateText(node);
    case "image":
      return translateImage(node);
    case "chart":
      return translateChart(node);
    case "table":
      return translateTable(node);
    case "connector":
      return translateConnector(node);
  }
}
function translateView(node) {
  const fillStyle = {};
  if (typeof node.fill === "string") {
    fillStyle.backgroundColor = node.fill;
  } else if (node.fill && typeof node.fill === "object" && node.fill.type === "pattern") {
    fillStyle.fill = {
      type: "pattern",
      pattern: node.fill.preset,
      foreground: node.fill.fg,
      background: node.fill.bg
    };
  }
  const out = {
    type: "View",
    shapeType: node.shape ?? "rect",
    ...node.shapeAdjustments ? { shapeAdjustments: node.shapeAdjustments } : {},
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      {
        ...fillStyle,
        ...node.border ? {
          borderColor: node.border.color,
          borderWidth: node.border.width,
          borderStyle: node.border.style ?? "solid"
        } : {},
        ...node.rotation !== void 0 ? { rotation: node.rotation } : {},
        // zIndex belongs INSIDE style — the engine's layout validator reads
        // `node.style?.zIndex`, not `node.zIndex`.
        ...node.zIndex !== void 0 ? { zIndex: node.zIndex } : {}
      },
      node.rect
    ),
    children: (node.children ?? []).map(toPaperNode2)
  };
  return out;
}
var PT_TO_PX2 = 96 / 72;
function translateRun(run) {
  const runStyle = {};
  if (run.bold) runStyle.fontWeight = "bold";
  if (run.italic) runStyle.fontStyle = "italic";
  if (run.underline) runStyle.textDecorationLine = "underline";
  if (run.color !== void 0) runStyle.color = run.color;
  if (run.fontSize !== void 0) runStyle.fontSize = run.fontSize * PT_TO_PX2;
  if (run.fontFamily !== void 0) runStyle.fontFamily = run.fontFamily;
  const out = { text: run.text };
  if (Object.keys(runStyle).length > 0) out.style = runStyle;
  return out;
}
function translateParagraph(para) {
  const out = {
    runs: para.runs.map(translateRun)
  };
  if (para.align !== void 0) out.align = para.align;
  if (para.level !== void 0) out.level = para.level;
  if (para.indent !== void 0) out.indent = para.indent;
  if (para.marginLeft !== void 0) out.marginLeft = para.marginLeft;
  if (para.hangingIndent !== void 0) out.hangingIndent = para.hangingIndent;
  if (para.spaceBefore !== void 0) out.spaceBefore = para.spaceBefore;
  if (para.spaceAfter !== void 0) out.spaceAfter = para.spaceAfter;
  if (para.bullet !== void 0) out.bullet = para.bullet;
  return out;
}
function translateText(node) {
  let content;
  let paragraphs;
  if (node.paragraphs && node.paragraphs.length > 0) {
    paragraphs = node.paragraphs.map(translateParagraph);
  } else if (node.runs && node.runs.length > 0) {
    content = node.runs.map(translateRun);
  } else {
    content = node.content ?? "";
  }
  const out = {
    type: "Text",
    ...paragraphs !== void 0 ? { paragraphs } : { content },
    autoFit: node.autoFit ?? false,
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      {
        fontFamily: node.style.family,
        fontWeight: node.style.weight >= 600 ? "bold" : "normal",
        fontSize: node.style.size * PT_TO_PX2,
        ...node.style.lineHeight !== void 0 ? { lineHeight: node.style.lineHeight * PT_TO_PX2 } : {},
        ...node.style.letterSpacing !== void 0 ? { letterSpacing: node.style.letterSpacing } : {},
        ...node.style.italic ? { fontStyle: "italic" } : {},
        color: node.style.color,
        ...node.style.align ? { textAlign: node.style.align } : {},
        ...node.style.verticalAlign ? { verticalAlign: node.style.verticalAlign } : {},
        ...node.style.textDirection ? { textDirection: node.style.textDirection } : {},
        ...node.rotation !== void 0 ? { rotation: node.rotation } : {},
        ...node.zIndex !== void 0 ? { zIndex: node.zIndex } : {}
      },
      node.rect
    )
  };
  return out;
}
function translateChart(node) {
  return {
    type: "Chart",
    chartData: node.chartData,
    ...node.altText ? { altText: node.altText } : {},
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== void 0 ? { zIndex: node.zIndex } : {},
      node.rect
    )
  };
}
function translateImage(node) {
  const out = {
    type: "Image",
    src: node.src,
    ...node.alt ? { alt: node.alt } : {},
    ...node.crop ? { crop: node.crop } : {},
    ...node.opacity !== void 0 ? { opacity: node.opacity } : {},
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== void 0 ? { zIndex: node.zIndex } : {},
      node.rect
    )
  };
  return out;
}
function translateTableCell(cell) {
  const out = {};
  if (typeof cell.content === "string") {
    out.text = cell.content;
  } else if (Array.isArray(cell.content) && cell.content.length > 0 && "runs" in cell.content[0]) {
    out.paragraphs = cell.content.map(translateParagraph);
    out.text = "";
  } else {
    out.content = cell.content.map(translateRun);
    out.text = "";
  }
  if (cell.colSpan !== void 0) out.colSpan = cell.colSpan;
  if (cell.rowSpan !== void 0) out.rowSpan = cell.rowSpan;
  if (cell.style) {
    const style = {};
    if (cell.style.fill !== void 0) style.fill = cell.style.fill;
    if (cell.style.borders !== void 0) style.borders = cell.style.borders;
    if (cell.style.fontWeight !== void 0) style.fontWeight = cell.style.fontWeight;
    if (cell.style.fontStyle !== void 0) style.fontStyle = cell.style.fontStyle;
    if (cell.style.fontSize !== void 0) style.fontSize = cell.style.fontSize * PT_TO_PX2;
    if (cell.style.fontFamily !== void 0) style.fontFamily = cell.style.fontFamily;
    if (cell.style.color !== void 0) style.color = cell.style.color;
    if (cell.style.textAlign !== void 0) style.textAlign = cell.style.textAlign;
    if (cell.style.verticalAlign !== void 0) style.verticalAlign = cell.style.verticalAlign;
    if (cell.style.padding !== void 0) style.padding = cell.style.padding;
    out.style = style;
  }
  return out;
}
function translateTable(node) {
  const tableData = {
    columns: node.columns,
    rows: node.rows.map((row) => {
      const r = { cells: row.cells.map(translateTableCell) };
      if (row.height !== void 0) r.height = row.height;
      if (row.minHeight !== void 0) r.minHeight = row.minHeight;
      return r;
    })
  };
  if (node.borders) {
    const ts = {};
    if (node.borders.outer) ts.outerBorder = node.borders.outer;
    if (node.borders.innerH) ts.innerBorderH = node.borders.innerH;
    if (node.borders.innerV) ts.innerBorderV = node.borders.innerV;
    tableData.style = ts;
  }
  return {
    type: "Table",
    tableData,
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== void 0 ? { zIndex: node.zIndex } : {},
      node.rect
    )
  };
}
function translateConnector(node) {
  const out = {
    type: "Connector",
    connectorType: node.connectorKind,
    start: node.start,
    end: node.end,
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== void 0 ? { zIndex: node.zIndex } : {},
      node.rect
    )
  };
  if (node.lineWidth !== void 0) out.lineWidth = node.lineWidth;
  if (node.lineColor !== void 0) out.lineColor = node.lineColor;
  if (node.lineDashStyle !== void 0) out.lineDashStyle = node.lineDashStyle;
  if (node.arrowStart) out.arrowStart = true;
  if (node.arrowEnd) out.arrowEnd = true;
  return out;
}
function withAbsoluteRect(style, rect) {
  return {
    position: "absolute",
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    ...style
  };
}

// ../pptx-primitives/src/ast/embeddedFonts.ts
function toEngineEmbeddedFonts2(fonts) {
  return fonts.map((f) => ({
    fontFamily: f.family,
    src: f.src,
    ...f.bold !== void 0 ? { bold: f.bold } : {},
    ...f.italic !== void 0 ? { italic: f.italic } : {}
  }));
}

// src/protocol/compiler.ts
function parseBlockKey(key) {
  const leaf = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
  const m = /^([A-Za-z]+)_(\d+)$/.exec(leaf);
  if (!m) return null;
  return { primitive: m[1], blockIndex: Number(m[2]) };
}
function compositionLossyToIssue(key, kind, slideIndex, slide) {
  const parsed = parseBlockKey(key);
  const code = kind === "paginated" ? "CONTENT_PAGINATED" : kind === "clipped" ? "CONTENT_CLIPPED" : "VALIDATION_FAILED";
  let blockIndex;
  let primitive;
  let actual;
  let minimum;
  let remediation;
  if (parsed) {
    primitive = parsed.primitive;
    blockIndex = parsed.blockIndex;
    if (slide.slideType === "composition") {
      const block = slide.blocks?.[parsed.blockIndex];
      const region = block?.region;
      if (region && "colSpan" in region) {
        actual = { colSpan: region.colSpan, rowSpan: region.rowSpan };
        const min = minRegionFor(parsed.primitive);
        if (min) {
          minimum = { colSpan: min.colSpan, rowSpan: min.rowSpan };
          remediation = remediationFor(parsed.primitive, actual, min);
        }
      }
    }
  }
  return {
    path: `slides[${slideIndex}].blocks[${blockIndex ?? "?"}]`,
    code,
    message: `${kind}@${key}`,
    slideIndex,
    blockIndex,
    primitive,
    actual,
    minimum,
    remediation
  };
}
var SLIDE_W = 960;
var SLIDE_H = 540;
var layoutFamilyWarningEmitted = false;
var accentColorWarningEmitted = false;
function emitDeprecationWarning(code, message) {
  if (typeof process !== "undefined" && typeof process.emitWarning === "function") {
    process.emitWarning(message, {
      code,
      type: "DeprecationWarning"
    });
  } else {
    console.warn(`[runstamp:${code}] ${message}`);
  }
}
function maybeWarnLayoutFamily(layoutFamily) {
  if (layoutFamily === void 0 || layoutFamilyWarningEmitted) return;
  layoutFamilyWarningEmitted = true;
  emitDeprecationWarning(
    "PROTOCOL_LAYOUTFAMILY_DEPRECATED",
    "`layoutFamily` is retired; omit it and use `tokens` when styling is needed."
  );
}
function maybeWarnAccentColor(accentColor) {
  if (accentColor === void 0 || accentColorWarningEmitted) return;
  accentColorWarningEmitted = true;
  emitDeprecationWarning(
    "PROTOCOL_ACCENTCOLOR_DEPRECATED",
    "`accentColor` is retired; use `tokens.palette.accent` instead."
  );
}
function slugifyFragment(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "item";
}
function resolveStableId(explicitId, fallbackPrefix, label) {
  return explicitId?.trim() || `${fallbackPrefix}-${slugifyFragment(label)}`;
}
function attachStableMorphIds(node, componentId, componentIds) {
  const base = node;
  const nextId = base.morphId?.trim() || componentId;
  componentIds.push(nextId);
  const withChildren = Array.isArray(base.children) ? base.children.map((child, index) => attachStableMorphIds(child, `${nextId}.${index + 1}`, componentIds)) : void 0;
  const normalized = {
    ...base,
    morphId: nextId
  };
  if ("altText" in base && (!base.altText || base.altText.trim().length === 0)) {
    normalized.altText = `runstamp:${nextId}`;
  }
  if (withChildren) {
    normalized.children = withChildren;
  }
  return normalized;
}
var BUILD_BY_POINT_ANIM = {
  type: "entrance",
  effect: "fade",
  trigger: "onClick",
  duration: 300
};
var FADE_IN_ANIM = {
  type: "entrance",
  effect: "fade",
  trigger: "withPrevious",
  duration: 300
};
function applySlideAnimation(slide, animation) {
  if (!animation || animation === "none") return slide;
  if (animation === "fadeIn") {
    const children2 = slide.children.map((child) => ({ ...child, animations: [FADE_IN_ANIM] }));
    return { ...slide, children: children2 };
  }
  const children = slide.children.map((child, index) => {
    if (index < 2) return child;
    return { ...child, animations: [BUILD_BY_POINT_ANIM] };
  });
  return { ...slide, children };
}
function resolveCompilerTokens(spec, options) {
  maybeWarnLayoutFamily(spec.layoutFamily);
  maybeWarnAccentColor(spec.accentColor);
  const accentOverride = options?.accentColor ?? spec.accentColor;
  const fontOverride = options?.fontFamily;
  if (spec.tokens) {
    const resolved2 = resolveTokens2(mergeOverrides(spec.tokens, accentOverride, fontOverride));
    if (options?.metricsProvider) attachMetricsProvider2(resolved2, options.metricsProvider);
    return resolved2;
  }
  const base = {
    version: "1.0",
    palette: accentOverride ? { accent: accentOverride } : void 0,
    type: fontOverride ? {
      display: { family: fontOverride, weight: 500, size: 56, letterSpacing: -0.5, lineHeight: 62, italic: false, transform: "none" },
      title: { family: fontOverride, weight: 500, size: 28, letterSpacing: -0.2, lineHeight: 34, italic: false, transform: "none" },
      body: { family: fontOverride, weight: 400, size: 14, letterSpacing: 0, lineHeight: 20, italic: false, transform: "none" },
      caption: { family: fontOverride, weight: 400, size: 10, letterSpacing: 0, lineHeight: 14, italic: false, transform: "none" },
      eyebrow: { family: fontOverride, weight: 700, size: 10, letterSpacing: 1.4, lineHeight: 12, italic: false, transform: "upper" },
      nav: { family: fontOverride, weight: 500, size: 10, letterSpacing: 2, lineHeight: 12, italic: false, transform: "upper" }
    } : void 0
  };
  const resolved = resolveTokens2(base);
  if (options?.metricsProvider) attachMetricsProvider2(resolved, options.metricsProvider);
  return resolved;
}
function mergeOverrides(tokens, accent, font) {
  if (!accent && !font) return tokens;
  const next = { ...tokens };
  if (accent) {
    next.palette = { ...tokens.palette ?? {}, accent };
  }
  if (font) {
    const existing = tokens.type ?? {};
    const overrideFont = (role) => ({
      ...role ?? {},
      family: font
    });
    next.type = {
      display: overrideFont(existing.display),
      title: overrideFont(existing.title),
      body: overrideFont(existing.body),
      caption: overrideFont(existing.caption),
      eyebrow: overrideFont(existing.eyebrow),
      nav: overrideFont(existing.nav)
    };
  }
  return next;
}
function buildSlideRegions(tokens, mode = "standard") {
  const margin = tokens.canvas.margin;
  const footerEnabled = tokens.chrome.footer.enabled;
  const footerHeight = footerEnabled ? tokens.chrome.footer.height : 0;
  const titleTop = margin;
  const titleHeight = mode === "readability" ? 200 : 96;
  const contentTop = titleTop + titleHeight + 8;
  const contentBottom = SLIDE_H - (footerEnabled ? footerHeight + 16 : 16);
  return {
    title: {
      left: margin,
      top: titleTop,
      width: SLIDE_W - margin * 2,
      height: titleHeight
    },
    content: {
      left: margin,
      top: contentTop,
      width: SLIDE_W - margin * 2,
      height: Math.max(80, contentBottom - contentTop)
    },
    footer: footerEnabled ? {
      left: margin,
      top: SLIDE_H - footerHeight - 8,
      width: SLIDE_W - margin * 2,
      height: footerHeight
    } : { left: 0, top: 0, width: 0, height: 0 }
  };
}
function mergeSlideChrome(tokens, slide) {
  if (!slide.chrome) return tokens;
  return {
    ...tokens,
    chrome: {
      ...tokens.chrome,
      ...slide.chrome.headerRibbon ? { headerRibbon: { ...tokens.chrome.headerRibbon, ...slide.chrome.headerRibbon } } : {},
      ...slide.chrome.footer ? { footer: { ...tokens.chrome.footer, ...slide.chrome.footer } } : {}
    }
  };
}
function mapIssueNodePathToBlockKey(nodePath, nodeKeys) {
  if (!nodePath || !nodeKeys) return void 0;
  const match = /^slides\[\d+\]\.children\[(\d+)\]/.exec(nodePath);
  if (!match) return void 0;
  const index = Number(match[1]);
  return Number.isInteger(index) ? nodeKeys[index] : void 0;
}
function formatLayoutIssueReason(issue, nodeKeys) {
  const key = mapIssueNodePathToBlockKey(issue.nodePath, nodeKeys);
  const relatedKey = mapIssueNodePathToBlockKey(issue.relatedNodePath, nodeKeys);
  if (!key && !relatedKey) return `${issue.code}@${issue.nodePath}`;
  const related = relatedKey && relatedKey !== key ? `~${relatedKey}` : "";
  return `${issue.code}@${key ?? issue.nodePath}${related}`;
}
function attachCallerKeysToLayoutDebug(debug, nodeKeys) {
  return {
    ...debug,
    nodes: debug.nodes.map((node) => ({
      ...node,
      blockKey: mapIssueNodePathToBlockKey(node.path, nodeKeys)
    })),
    issues: debug.issues.map((issue) => ({
      ...issue,
      blockKey: mapIssueNodePathToBlockKey(issue.nodePath, nodeKeys),
      relatedBlockKey: mapIssueNodePathToBlockKey(issue.relatedNodePath, nodeKeys)
    }))
  };
}
function buildTitleBodySlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    {
      title: slide.title,
      eyebrow: slide.eyebrow,
      subtitle: slide.subtitle
    },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const bullets = bulletList2(
    { items: slide.body.map((text) => ({ text })) },
    tokens,
    regions.content
  );
  nodes.push(...bullets.nodes);
  overflows.body = bullets.overflow.kind;
  return { nodes, overflows };
}
function buildKpiGridSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  if (slide.items.length <= 3) {
    const stackResult = metricStack2(
      {
        rows: slide.items.map((item) => ({
          label: item.label,
          value: item.value,
          delta: item.sublabel,
          trend: item.trend === "none" ? void 0 : item.trend
        }))
      },
      tokens,
      regions.content
    );
    nodes.push(...stackResult.nodes);
    overflows.kpi = stackResult.overflow.kind;
  } else {
    const cols = 2;
    const gap = tokens.spacing.md;
    const colWidth = (regions.content.width - gap * (cols - 1)) / cols;
    const perCol = Math.ceil(slide.items.length / cols);
    for (let c = 0; c < cols; c++) {
      const slice = slide.items.slice(c * perCol, (c + 1) * perCol);
      if (slice.length === 0) continue;
      const colRegion = {
        left: regions.content.left + c * (colWidth + gap),
        top: regions.content.top,
        width: colWidth,
        height: regions.content.height
      };
      const stackResult = metricStack2(
        {
          rows: slice.map((item) => ({
            label: item.label,
            value: item.value,
            delta: item.sublabel,
            trend: item.trend === "none" ? void 0 : item.trend
          }))
        },
        tokens,
        colRegion
      );
      nodes.push(...stackResult.nodes);
      overflows[`kpi_col${c}`] = stackResult.overflow.kind;
    }
  }
  return { nodes, overflows };
}
function buildComparisonSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const compResult = comparisonBand2(
    {
      columns: slide.columns,
      rows: slide.rows.map((row) => ({
        label: row.label,
        values: row.values,
        accent: row.highlight
      }))
    },
    tokens,
    regions.content
  );
  nodes.push(...compResult.nodes);
  overflows.table = compResult.overflow.kind;
  return { nodes, overflows };
}
function buildMarketMapSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const quadrants = slide.quadrants && slide.quadrants.length === 4 ? [slide.quadrants[0], slide.quadrants[1], slide.quadrants[2], slide.quadrants[3]] : void 0;
  const mapResult = quadrantMap2(
    {
      xAxisLabel: slide.xAxisLabel ? { low: "Low", high: slide.xAxisLabel } : void 0,
      yAxisLabel: slide.yAxisLabel ? { low: "Low", high: slide.yAxisLabel } : void 0,
      quadrants,
      points: slide.companies.map((c) => ({
        name: c.name,
        x: c.x,
        y: c.y,
        emphasis: c.emphasis
      }))
    },
    tokens,
    regions.content
  );
  nodes.push(...mapResult.nodes);
  overflows.map = mapResult.overflow.kind;
  return { nodes, overflows };
}
function buildTimelineSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const timelineResult = stepTimeline2(
    {
      steps: slide.events.map((event) => ({
        tag: event.date ?? event.label,
        label: event.label,
        description: event.description
      }))
    },
    tokens,
    regions.content
  );
  nodes.push(...timelineResult.nodes);
  overflows.timeline = timelineResult.overflow.kind;
  return { nodes, overflows };
}
function buildOrgChartSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const byId = new Map(slide.nodes.map((n) => [n.id, n]));
  const childrenOf = /* @__PURE__ */ new Map();
  for (const node of slide.nodes) {
    const parent = node.parentId ?? void 0;
    const list = childrenOf.get(parent) ?? [];
    list.push(node);
    childrenOf.set(parent, list);
  }
  const roots = slide.nodes.filter((n) => !n.parentId || !byId.has(n.parentId));
  const root = roots[0] ?? slide.nodes[0];
  const directChildren = childrenOf.get(root.id) ?? [];
  const treeResult = orgTree2(
    {
      root: { title: root.label, subtitle: root.role },
      children: directChildren.map((c) => ({
        title: c.label,
        subtitle: c.role
      }))
    },
    tokens,
    regions.content
  );
  nodes.push(...treeResult.nodes);
  overflows.tree = treeResult.overflow.kind;
  return { nodes, overflows };
}
function buildWaterfallSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const wfResult = waterfallBars2(
    {
      steps: slide.entries.map((entry, i, arr) => {
        const absValue = Math.abs(entry.value);
        if (entry.type === "total") {
          const isLast = i === arr.length - 1;
          return isLast ? { kind: "end", label: entry.label, value: absValue } : { kind: "start", label: entry.label, value: absValue };
        }
        return entry.type === "increase" ? { kind: "up", label: entry.label, value: absValue } : { kind: "down", label: entry.label, value: absValue };
      })
    },
    tokens,
    regions.content
  );
  nodes.push(...wfResult.nodes);
  overflows.waterfall = wfResult.overflow.kind;
  return { nodes, overflows };
}
function buildTombstoneSlide(slide, tokens, regions) {
  const overflows = {};
  const nodes = [];
  const titleResult = titleBlock2(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;
  const tombResult = tombstoneStack2(
    {
      tiles: slide.items.map((item) => ({
        title: item.name,
        // Compose subtitle + bullet metrics into a single body line.
        body: [item.subtitle, ...item.metrics ?? []].filter(Boolean).join(" \xB7 ") || void 0
      })),
      columns: slide.items.length <= 3 ? slide.items.length : 4,
      logoHeight: 0
    },
    tokens,
    regions.content
  );
  nodes.push(...tombResult.nodes);
  overflows.tiles = tombResult.overflow.kind;
  return { nodes, overflows };
}
function buildCompositionSlide(slide, tokens, regions) {
  const canvas = {
    left: regions.title.left,
    top: regions.title.top,
    width: regions.title.width,
    height: regions.title.height + 8 + regions.content.height,
    gap: slide.gap
  };
  const built = buildCompositionBlocks(slide.blocks, tokens, canvas);
  return { nodes: built.nodes, nodeKeys: built.nodeKeys, overflows: built.overflows };
}
function dispatchSlide(slide, tokens, regions) {
  switch (slide.slideType) {
    case "title-body":
      return buildTitleBodySlide(slide, tokens, regions);
    case "kpi-grid":
      return buildKpiGridSlide(slide, tokens, regions);
    case "comparison-table":
      return buildComparisonSlide(slide, tokens, regions);
    case "market-map":
      return buildMarketMapSlide(slide, tokens, regions);
    case "timeline":
      return buildTimelineSlide(slide, tokens, regions);
    case "org-chart":
      return buildOrgChartSlide(slide, tokens, regions);
    case "waterfall":
      return buildWaterfallSlide(slide, tokens, regions);
    case "tombstone-grid":
      return buildTombstoneSlide(slide, tokens, regions);
    case "composition":
      return buildCompositionSlide(slide, tokens, regions);
  }
}
function compileCustomProperties(manifest, diagnostics) {
  const props = [
    { name: "runstamp.deckId", value: manifest.deckId },
    { name: "runstamp.lineageManifest", value: JSON.stringify(manifest) },
    { name: "runstamp.layoutSafetyReport", value: JSON.stringify(diagnostics) }
  ];
  if (manifest.workflowId) props.push({ name: "runstamp.workflowId", value: manifest.workflowId });
  if (manifest.workflowRunId) props.push({ name: "runstamp.workflowRunId", value: manifest.workflowRunId });
  if (manifest.releaseId) props.push({ name: "runstamp.releaseId", value: manifest.releaseId });
  if (manifest.sourceType) props.push({ name: "runstamp.sourceType", value: manifest.sourceType });
  if (manifest.sourceId) props.push({ name: "runstamp.sourceId", value: manifest.sourceId });
  manifest.slides.forEach((slide, index) => {
    props.push({ name: `runstamp.slide.${index + 1}.id`, value: slide.slideId });
    props.push({ name: `runstamp.slide.${index + 1}.componentId`, value: slide.componentId });
  });
  return props;
}
function compilePresentationSpec(spec, options) {
  const parsed = PresentationSpecSchema.safeParse(spec);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 10).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new PaperError(`Invalid PresentationSpec: ${issues}`, {
      code: "VALIDATION_FAILED",
      phase: "validation",
      issues: parsed.error.issues.slice(0, 10).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
        remediation: "Correct the PresentationSpec field at this path and retry."
      }))
    });
  }
  const validSpec = parsed.data;
  const tokens = resolveCompilerTokens(validSpec, options);
  const deckId = resolveStableId(validSpec.deckId, "deck", validSpec.title);
  const slideLineage = [];
  const diagnostics = [];
  const edgeRuleNodes = (slideTokens) => {
    const result = emitHorizontalRule2(
      slideTokens.rules.edge,
      slideTokens.palette,
      slideTokens.canvas.margin,
      slideTokens.canvas.margin + 6,
      SLIDE_W - slideTokens.canvas.margin * 2
    );
    return result.nodes.map((node) => ({ ...node, zIndex: -1 }));
  };
  const footerNodes = (slideIndex, total, regions, slideTokens) => {
    if (!slideTokens.chrome.footer.enabled) return [];
    const result = footerChrome2(
      { slideIndex: slideIndex + 1, totalSlides: total },
      slideTokens,
      regions.footer
    );
    return result.nodes;
  };
  const buildSlidePaper = (slide, slideIndex, regions, slideTokens, readability = false) => {
    const effectiveSlide = readability && slide.subtitle ? { ...slide, subtitle: void 0 } : slide;
    const built = dispatchSlide(effectiveSlide, slideTokens, regions);
    const edge = edgeRuleNodes(slideTokens);
    built.nodes.push(...edge);
    if (built.nodeKeys) {
      built.nodeKeys.push(...edge.map((_, index) => `edgeRule_${index}`));
    }
    const footer = footerNodes(slideIndex, validSpec.slides.length, regions, slideTokens);
    built.nodes.push(...footer);
    if (built.nodeKeys) {
      built.nodeKeys.push(...footer.map((_, index) => `footer_${index}`));
    }
    const slideId = resolveStableId(
      slide.slideId ?? slide.id,
      `${deckId}-slide-${slideIndex + 1}`,
      slide.title
    );
    const componentId = resolveStableId(slide.componentId, slideId, slide.slideType);
    const componentIds = [];
    const children = toPaperNodes2(built.nodes).map(
      (child, index) => attachStableMorphIds(child, `${componentId}.${index + 1}`, componentIds)
    );
    let normalizedSlide = {
      type: "Slide",
      background: { type: "solid", color: slideTokens.canvas.surface },
      children
    };
    if (slide.notes?.length) {
      normalizedSlide.notes = slide.notes.join("\n");
    }
    if (slide.transition) {
      const speedToDuration = { fast: 200, med: 500, slow: 1e3 };
      if (slide.transition.type !== "none") {
        const transition = {
          type: slide.transition.type,
          duration: speedToDuration[slide.transition.speed ?? "med"] ?? 500
        };
        if (slide.transition.advanceOnClick !== void 0) transition.advanceOnClick = slide.transition.advanceOnClick;
        if (slide.transition.advanceAfterMs !== void 0) transition.advanceAfterTime = slide.transition.advanceAfterMs;
        normalizedSlide.transition = transition;
      }
    }
    if (slide.animation) {
      normalizedSlide = applySlideAnimation(normalizedSlide, slide.animation);
    }
    return { slide: normalizedSlide, slideId, componentIds, componentId, built };
  };
  const slides = validSpec.slides.map((slide, slideIndex) => {
    const slideTokens = mergeSlideChrome(tokens, slide);
    const standardRegions = buildSlideRegions(slideTokens, "standard");
    const readabilityRegions = buildSlideRegions(slideTokens, "readability");
    const standardPass = buildSlidePaper(slide, slideIndex, standardRegions, slideTokens);
    let chosen = standardPass;
    let chosenMode = "standard";
    const standardIssues = validateAbsoluteSlideLayout(
      standardPass.slide,
      slideIndex,
      { width: SLIDE_W, height: SLIDE_H }
    );
    const titleClipped = standardPass.built.overflows.title === "clipped";
    const isComposition = slide.slideType === "composition";
    if (!isComposition && (standardIssues.length > 0 || titleClipped)) {
      const readabilityPass = buildSlidePaper(slide, slideIndex, readabilityRegions, slideTokens, true);
      const readabilityIssues = validateAbsoluteSlideLayout(
        readabilityPass.slide,
        slideIndex,
        { width: SLIDE_W, height: SLIDE_H }
      );
      if (readabilityIssues.length > 0) {
        const issues = readabilityIssues.map((i) => ({
          path: `slides[${slideIndex}]`,
          code: i.code,
          message: `${i.code}@${i.nodePath}`,
          slideIndex
        }));
        throw new PaperError(
          `Protocol layout safety failed for "${slide.title}": ${readabilityIssues.map((i) => `${i.code}@${i.nodePath}`).join(", ")}`,
          { code: "VALIDATION_FAILED", phase: "layout", slideIndex, issues }
        );
      }
      chosen = readabilityPass;
      chosenMode = "readability";
    } else if (isComposition) {
      const lossyEntries = Object.entries(standardPass.built.overflows).filter(([, kind]) => kind === "clipped" || kind === "paginated");
      const lossyBlocks = lossyEntries.map(([key, kind]) => `${kind}@${key}`);
      if (standardIssues.length > 0 || lossyBlocks.length > 0) {
        const reasons = [
          ...standardIssues.map((i) => formatLayoutIssueReason(i, standardPass.built.nodeKeys)),
          ...lossyBlocks
        ];
        const issues = [
          ...standardIssues.map((i) => ({
            path: `slides[${slideIndex}]`,
            code: i.code,
            message: `${i.code}@${i.nodePath}`,
            slideIndex
          })),
          ...lossyEntries.map(([key, kind]) => compositionLossyToIssue(key, kind, slideIndex, slide))
        ];
        throw new PaperError(
          `Protocol layout safety failed for "${slide.title}": ${reasons.join(", ")}`,
          { code: "VALIDATION_FAILED", phase: "layout", slideIndex, issues }
        );
      }
    }
    const normalizedSlide = chosen.slide;
    const slideId = chosen.slideId;
    const componentIds = chosen.componentIds;
    const componentId = chosen.componentId;
    const built = chosen.built;
    const layoutDebug = attachCallerKeysToLayoutDebug(
      collectAbsoluteSlideLayoutDebug(
        normalizedSlide,
        slideIndex,
        { width: SLIDE_W, height: SLIDE_H }
      ),
      built.nodeKeys
    );
    slideLineage.push({
      slideId,
      componentId,
      title: slide.title,
      slideType: slide.slideType,
      componentIds,
      bindingKeys: [
        ...(validSpec.bindings ?? []).map((binding) => binding.bindingKey),
        ...(slide.bindings ?? []).map((binding) => binding.bindingKey)
      ]
    });
    diagnostics.push({
      slideType: slide.slideType,
      overflows: built.overflows,
      layoutDebug,
      mode: chosenMode,
      validationIssueCount: layoutDebug.issues.length
    });
    return normalizedSlide;
  });
  const lineageManifest = {
    deckId,
    workflowId: validSpec.lineage?.workflowId,
    workflowRunId: validSpec.lineage?.workflowRunId,
    releaseId: validSpec.lineage?.releaseId,
    sourceType: validSpec.lineage?.sourceType,
    sourceId: validSpec.lineage?.sourceId,
    slides: slideLineage
  };
  const majorFont = options?.fontFamily ?? tokens.type.title.family;
  const minorFont = options?.fontFamily ?? tokens.type.body.family;
  return {
    type: "Document",
    meta: {
      title: validSpec.title,
      author: "Runstamp Protocol Compiler"
    },
    slideSize: { width: SLIDE_W, height: SLIDE_H },
    theme: {
      name: "Runstamp Protocol",
      colorScheme: {
        dk1: tokens.palette.foreground,
        lt1: tokens.canvas.surface,
        dk2: tokens.palette.muted,
        lt2: tokens.palette.rule,
        accent1: tokens.palette.accent,
        accent2: tokens.palette.faint,
        accent3: tokens.palette.muted
      },
      fontScheme: {
        majorLatin: majorFont,
        minorLatin: minorFont
      }
    },
    customProperties: compileCustomProperties(lineageManifest, diagnostics),
    slides,
    ...tokens.embeddedFonts.length > 0 ? { embeddedFonts: toEngineEmbeddedFonts2(tokens.embeddedFonts) } : {}
  };
}
function preflightPresentationSpec(spec, options) {
  try {
    const document = compilePresentationSpec(spec, options);
    return { ok: true, document };
  } catch (error) {
    if (error instanceof PaperError) {
      return {
        ok: false,
        issues: error.issues ?? [
          { path: "", message: error.message, code: error.code, slideIndex: error.slideIndex }
        ],
        message: error.message
      };
    }
    if (error instanceof Error) {
      return {
        ok: false,
        issues: [{ path: "", message: error.message }],
        message: error.message
      };
    }
    return {
      ok: false,
      issues: [{ path: "", message: String(error) }],
      message: String(error)
    };
  }
}

// src/protocol/declarative.ts
function pathFromPreflight(issue) {
  if (typeof issue.path === "string" && issue.path.length > 0) {
    const segments = [];
    issue.path.replace(/([^[.\]]+)|\[(\d+)\]/g, (_match, property, index) => {
      segments.push(index === void 0 ? property : Number(index));
      return "";
    });
    if (segments.length > 0) return segments;
  }
  return issue.slideIndex === void 0 ? [] : ["slides", issue.slideIndex];
}
function validate3(input) {
  const schemaResult = validate2(input);
  if (!schemaResult.ok) return schemaResult;
  const document = DeclarativeDocumentSchema.parse(input);
  const preflight = preflightPresentationSpec(toPresentationSpec(document));
  if (preflight.ok) return { ok: true, issues: [] };
  const issues = preflight.issues.map((issue) => ({
    path: pathFromPreflight(issue),
    code: typeof issue.code === "string" ? issue.code : "layout_validation_failed",
    severity: "error",
    fix: typeof issue.remediation === "string" && issue.remediation.length > 0 ? issue.remediation : "Reduce content density on this slide or split it into two slides."
  }));
  return { ok: false, issues };
}
function compileDeclarativeDocument(input) {
  const result = validate3(input);
  if (!result.ok) throw new DeclarativeValidationError(result.issues);
  return compilePresentationSpec(toPresentationSpec(DeclarativeDocumentSchema.parse(input)));
}

// src/lite-render.ts
function isPaperDocument(document) {
  return "type" in document && document.type === "Document";
}
async function render(document, options) {
  if (isPaperDocument(document)) {
    return PaperEngine.render(document, options);
  }
  const validation = validate3(document);
  if (!validation.ok) {
    throw new DeclarativeValidationError(validation.issues);
  }
  return PaperEngine.render(compileDeclarativeDocument(document), options);
}

export {
  anonymizeCorpusValue,
  anonymizeCorpusDocument,
  classifyFailureFamilies,
  validateLicenseKey,
  calculateTextMetrics,
  PptxTemplateRoundTripError,
  inspectPptxTemplate,
  importPptxTemplate,
  mutatePptxTemplate,
  exportPptxTemplate,
  verifyPptxTemplate,
  createPptxTemplateRoundTripExtension,
  generateDiagram,
  MIN_REGION_STATIC,
  MIN_REGION_VARIABLE,
  minRegionFor,
  remediationFor,
  DeclarativeMetricSchema,
  DeclarativeChartSeriesSchema,
  DeclarativeChartSchema,
  DeclarativeLayoutSchema,
  DeclarativeSlideSchema,
  DeclarativeDocumentSchema,
  DeclarativeValidationError,
  toPresentationSpec,
  presets,
  PresentationSpecSchema,
  compilePresentationSpec,
  preflightPresentationSpec,
  validate3 as validate,
  compileDeclarativeDocument,
  render
};
//# sourceMappingURL=chunk-BBZLJBOA.js.map
