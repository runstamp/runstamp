// src/logger.ts — Injectable logger for library diagnostics.
// Defaults to console.warn; consumers can override via setLogger().

export interface SchemaValidationError {
  schemaName: string;
  errorCount: number;
  issues: Array<{ path: string; code: string; message: string }>;
  timestamp: number;
}

export interface Logger {
  warn(message: string): void;
  metric?(name: string, value: number, tags?: Record<string, string>): void;
  schemaError?(error: SchemaValidationError): void;
}

// ---------------------------------------------------------------------------
// Class-based state (supports multiple independent instances)
// ---------------------------------------------------------------------------

export class LoggerManager {
  private _logger: Logger = {
    warn(message: string) {
      // Missing optional/system fonts and cache churn are routine fallback
      // diagnostics. Keep the default library path quiet; applications that
      // need them can opt in with setLogger().
      if (/^\[(?:autoFont|fontCache|fontEmbed|harfbuzz|segmentCache)\]/.test(message)) return;
      console.warn(message);
    },
  };

  setLogger(logger: Logger): void {
    if (!logger || typeof logger.warn !== "function") {
      throw new Error("setLogger: logger must implement warn(message: string)");
    }
    this._logger = logger;
  }

  getLogger(): Logger {
    return this._logger;
  }
}

// ---------------------------------------------------------------------------
// Default instance + backward-compatible module-level exports
// ---------------------------------------------------------------------------

import { getActiveContext } from "./contextStorage.js";

const defaultManager = new LoggerManager();

export function setLogger(logger: Logger): void {
  const ctx = getActiveContext();
  const mgr = ctx?.logger as LoggerManager | undefined;
  (mgr ?? defaultManager).setLogger(logger);
}

export function getLogger(): Logger {
  const ctx = getActiveContext();
  const mgr = ctx?.logger as LoggerManager | undefined;
  return mgr ? mgr.getLogger() : defaultManager.getLogger();
}
