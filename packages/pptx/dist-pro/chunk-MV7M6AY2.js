import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);

// src/contextStorage.ts
import { AsyncLocalStorage } from "node:async_hooks";
var STORAGE_KEY = Symbol.for("paperjsx.contextStorage");
var _globalScope = globalThis;
var _storage = _globalScope[STORAGE_KEY] ?? (_globalScope[STORAGE_KEY] = new AsyncLocalStorage());
function getActiveContext() {
  return _storage.getStore();
}

// src/logger.ts
var LoggerManager = class {
  _logger = {
    warn(message) {
      if (/^\[(?:autoFont|fontCache|fontEmbed|harfbuzz|segmentCache)\]/.test(message)) return;
      console.warn(message);
    }
  };
  setLogger(logger) {
    if (!logger || typeof logger.warn !== "function") {
      throw new Error("setLogger: logger must implement warn(message: string)");
    }
    this._logger = logger;
  }
  getLogger() {
    return this._logger;
  }
};
var defaultManager = new LoggerManager();
function setLogger(logger) {
  const ctx = getActiveContext();
  const mgr = ctx?.logger;
  (mgr ?? defaultManager).setLogger(logger);
}
function getLogger() {
  const ctx = getActiveContext();
  const mgr = ctx?.logger;
  return mgr ? mgr.getLogger() : defaultManager.getLogger();
}

export {
  _storage,
  getActiveContext,
  LoggerManager,
  setLogger,
  getLogger
};
//# sourceMappingURL=chunk-MV7M6AY2.js.map
