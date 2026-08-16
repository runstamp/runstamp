import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);

// src/errors.ts
var PaperError = class extends Error {
  code;
  phase;
  slideIndex;
  nodeId;
  path;
  remediation;
  issues;
  constructor(message, opts) {
    super(message, { cause: opts.cause });
    this.name = "PaperError";
    this.code = opts.code;
    this.phase = opts.phase;
    this.slideIndex = opts.slideIndex;
    this.nodeId = opts.nodeId;
    this.path = opts.path;
    this.remediation = opts.remediation;
    this.issues = opts.issues;
  }
};
var RunstampFeatureError = class extends Error {
  code;
  phase = "license";
  feature;
  upgradeUrl = "https://runstamp.com/pricing";
  remediation;
  constructor(message, feature, code = "FEATURE_REQUIRES_UPGRADE") {
    super(message);
    this.name = "RunstampFeatureError";
    this.code = code;
    this.feature = feature ?? "unknown";
    this.remediation = `Provide a valid Runstamp Pro license for "${this.feature}" or visit ${this.upgradeUrl}.`;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      phase: this.phase,
      message: this.message,
      feature: this.feature,
      upgradeUrl: this.upgradeUrl,
      remediation: this.remediation
    };
  }
};
var PaperJSXFeatureError = RunstampFeatureError;

export {
  PaperError,
  RunstampFeatureError,
  PaperJSXFeatureError
};
//# sourceMappingURL=chunk-SFVKAOLH.js.map
