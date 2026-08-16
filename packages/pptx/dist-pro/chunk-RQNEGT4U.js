import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  getActiveContext
} from "./chunk-MV7M6AY2.js";

// src/deterministicMode.ts
var DeterministicModeManager = class {
  _deterministic;
  constructor(initialDeterministic = true) {
    this._deterministic = initialDeterministic;
  }
  setDeterministicMode(enabled) {
    this._deterministic = enabled;
  }
  isDeterministicMode() {
    return this._deterministic;
  }
};
var DEFAULT_MANAGER_KEY = Symbol.for("paperjsx.deterministicMode.defaultManager");
function getDefaultManager() {
  const scope = globalThis;
  const existing = scope[DEFAULT_MANAGER_KEY];
  if (existing) return existing;
  const created = new DeterministicModeManager();
  scope[DEFAULT_MANAGER_KEY] = created;
  return created;
}
function setDeterministicMode(enabled) {
  const ctx = getActiveContext();
  const mgr = ctx?.deterministicMode;
  (mgr ?? getDefaultManager()).setDeterministicMode(enabled);
}
function isDeterministicMode() {
  const ctx = getActiveContext();
  const mgr = ctx?.deterministicMode;
  return mgr ? mgr.isDeterministicMode() : getDefaultManager().isDeterministicMode();
}
function createInheritedDeterministicModeManager() {
  return new DeterministicModeManager(isDeterministicMode());
}
var DETERMINISTIC_DATE = /* @__PURE__ */ new Date("1980-01-01T00:00:02Z");

export {
  DeterministicModeManager,
  setDeterministicMode,
  isDeterministicMode,
  createInheritedDeterministicModeManager,
  DETERMINISTIC_DATE
};
//# sourceMappingURL=chunk-RQNEGT4U.js.map
