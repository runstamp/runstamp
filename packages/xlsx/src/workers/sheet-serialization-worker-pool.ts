import { existsSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, resolve } from "node:path";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath, pathToFileURL } from "node:url";

import type {
  CellValue,
  SpreadsheetDefaults,
  SpreadsheetDocument,
  SpreadsheetRenderOptions,
  SpreadsheetSheet,
} from "../types/spreadsheet-ast.js";
import type { ExcelDateSystem } from "../utils/date.js";
import { isErrorValue, isRichTextValue } from "../types/spreadsheet-ast.js";
import type { SerializedSheetChunkArtifact } from "../serializers/sheet-serializer.js";

export interface WorkerSheetSerializationTask {
  dateSystem?: ExcelDateSystem;
  defaults?: SpreadsheetDefaults;
  rowChunkSize?: number;
  selected: boolean;
  sheet: SpreadsheetSheet;
  sheetIndex: number;
  stringStrategy: "inlineStrings";
}

interface WorkerSheetSerializationRequest {
  id: number;
  tasks: WorkerSheetSerializationTask[];
}

interface WorkerSheetSerializationResponse {
  id: number;
  ok: boolean;
  artifacts?: SerializedSheetChunkArtifact[];
  error?: {
    message: string;
    stack?: string;
  };
}

interface PendingWorkerBatch {
  id: number;
  tasks: WorkerSheetSerializationTask[];
  resolve: (artifacts: SerializedSheetChunkArtifact[]) => void;
  reject: (error: Error) => void;
}

interface WorkerSlot {
  active?: PendingWorkerBatch;
  worker: Worker;
}

export interface WorkerSheetSerializationEligibilityInput {
  document: SpreadsheetDocument;
  options?: SpreadsheetRenderOptions;
  resolvedStringStrategy: "sharedStrings" | "inlineStrings";
}

export interface WorkerSheetSerializationEligibility {
  eligible: boolean;
  reason?: string;
}

function hasEntries(value: readonly unknown[] | undefined): boolean {
  return value !== undefined && value.length > 0;
}

function hasCellValueThatNeedsRegistryReconciliation(value: unknown): boolean {
  const cellValue = value as CellValue | undefined;
  if (
    cellValue === undefined
    || cellValue === null
    || typeof cellValue === "string"
    || typeof cellValue === "number"
    || typeof cellValue === "boolean"
    || cellValue instanceof Date
    || isRichTextValue(cellValue)
    || isErrorValue(cellValue)
  ) {
    return false;
  }
  return true;
}

function sheetHasUnsupportedWorkerFeatures(sheet: SpreadsheetSheet): string | undefined {
  if (sheet.styling) {
    return "sheet styling requires workbook-global style ordering";
  }
  if (hasEntries(sheet.conditionalFormatting)) {
    return "conditional formatting requires workbook-global DXF style ordering";
  }
  if (hasEntries(sheet.tables)) {
    return "tables require workbook-global table part ordering";
  }
  if (hasEntries(sheet.pivotTables) || hasEntries(sheet.pivotCharts)) {
    return "pivots require workbook-global pivot part ordering";
  }
  if (hasEntries(sheet.images) || hasEntries(sheet.charts)) {
    return "drawings require workbook-global media/chart part ordering";
  }

  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      if (cell.style !== undefined) {
        return "cell styles require workbook-global style ordering";
      }
      if (cell.formula !== undefined) {
        return "formulas require main-thread formula evaluation and ordering";
      }
      if (hasCellValueThatNeedsRegistryReconciliation(cell.value)) {
        return "cell value requires unsupported worker reconciliation";
      }
    }
  }

  return undefined;
}

export function getWorkerSheetSerializationEligibility(
  input: WorkerSheetSerializationEligibilityInput,
): WorkerSheetSerializationEligibility {
  if (input.options?.warmPath !== true) {
    return { eligible: false, reason: "warmPath is not enabled" };
  }
  if (!isMainThread) {
    return { eligible: false, reason: "nested worker serialization is disabled" };
  }
  if (input.document.sheets.length < 2) {
    return { eligible: false, reason: "at least two sheets are required" };
  }
  if (input.resolvedStringStrategy !== "inlineStrings") {
    return { eligible: false, reason: "shared strings require workbook-global string ordering" };
  }

  for (const sheet of input.document.sheets) {
    const reason = sheetHasUnsupportedWorkerFeatures(sheet);
    if (reason) {
      return { eligible: false, reason };
    }
  }

  return { eligible: true };
}

function resolveRuntimeAssetPath(candidates: string[]): string {
  const runtimeDir = dirname(fileURLToPath(import.meta.url));
  for (const candidate of candidates) {
    const absolutePath = resolve(runtimeDir, candidate);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  throw new Error(
    `XLSX runtime asset is missing. Looked for: ${candidates.join(", ")}`,
  );
}

function getWorkerUrl(): URL {
  const workerPath = resolveRuntimeAssetPath([
    "./workers/sheet-serializer-worker.js",
    "./sheet-serializer-worker.ts",
  ]);
  return pathToFileURL(workerPath);
}

function createWorker(): Worker {
  const workerUrl = getWorkerUrl();
  const execArgv = workerUrl.pathname.endsWith(".ts")
    ? [
        "--import",
        `data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register(${JSON.stringify(resolveRuntimeAssetPath(["./source-js-extension-loader.mjs"]))}, pathToFileURL("./"));`,
      ]
    : undefined;
  return new Worker(workerUrl, { execArgv });
}

function getWorkerCount(taskCount: number): number {
  const parallelism = Math.max(1, availableParallelism() - 1);
  return Math.max(1, Math.min(taskCount, parallelism, 4));
}

class WorkerSheetSerializationPool {
  private readonly queue: PendingWorkerBatch[] = [];
  private readonly slots: WorkerSlot[] = [];
  private nextBatchId = 1;
  private createdWorkerCount = 0;

  get stats() {
    return {
      createdWorkerCount: this.createdWorkerCount,
      idleWorkerCount: this.slots.filter((slot) => slot.active === undefined).length,
      workerCount: this.slots.length,
      queuedBatchCount: this.queue.length,
    };
  }

  async runTasks(tasks: WorkerSheetSerializationTask[]): Promise<SerializedSheetChunkArtifact[]> {
    const workerCount = getWorkerCount(tasks.length);
    this.ensureWorkerCount(workerCount);
    const batches = splitTasksIntoBatches(tasks, workerCount);
    const batchResults = await Promise.all(batches.map((batch) => this.runBatch(batch)));
    return batchResults.flat();
  }

  async terminate(): Promise<void> {
    const slots = [...this.slots];
    this.slots.length = 0;
    const queued = this.queue.splice(0);
    for (const batch of queued) {
      batch.reject(new Error("XLSX sheet worker pool was terminated before task execution"));
    }
    await Promise.all(slots.map((slot) => slot.worker.terminate().then(() => undefined)));
  }

  private runBatch(tasks: WorkerSheetSerializationTask[]): Promise<SerializedSheetChunkArtifact[]> {
    return new Promise<SerializedSheetChunkArtifact[]>((resolve, reject) => {
      this.queue.push({
        id: this.nextBatchId,
        tasks,
        resolve,
        reject,
      });
      this.nextBatchId += 1;
      this.dispatch();
    });
  }

  private ensureWorkerCount(count: number): void {
    while (this.slots.length < count) {
      const slot: WorkerSlot = {
        worker: createWorker(),
      };
      this.createdWorkerCount += 1;
      slot.worker.unref();
      slot.worker.on("message", (response: WorkerSheetSerializationResponse) => {
        this.handleWorkerMessage(slot, response);
      });
      slot.worker.on("error", (error) => {
        this.handleWorkerFailure(slot, error);
      });
      slot.worker.on("exit", (code) => {
        if (code !== 0) {
          this.handleWorkerFailure(slot, new Error(`XLSX sheet worker exited with code ${code}`));
        }
      });
      this.slots.push(slot);
    }
  }

  private handleWorkerMessage(
    slot: WorkerSlot,
    response: WorkerSheetSerializationResponse,
  ): void {
    const active = slot.active;
    slot.active = undefined;
    if (!active) {
      slot.worker.unref();
      return;
    }
    if (!response.ok || !response.artifacts) {
      const error = new Error(response.error?.message ?? "XLSX sheet worker failed");
      if (response.error?.stack) {
        error.stack = response.error.stack;
      }
      active.reject(error);
      void this.replaceFailedWorker(slot);
      return;
    }
    active.resolve(response.artifacts);
    slot.worker.unref();
    this.dispatch();
  }

  private handleWorkerFailure(slot: WorkerSlot, error: Error): void {
    const active = slot.active;
    slot.active = undefined;
    if (active) {
      active.reject(error);
    }
    void this.replaceFailedWorker(slot);
  }

  private async replaceFailedWorker(slot: WorkerSlot): Promise<void> {
    const index = this.slots.indexOf(slot);
    if (index >= 0) {
      this.slots.splice(index, 1);
    }
    try {
      await slot.worker.terminate();
    } catch {
      // Ignore termination failures for already-dead workers.
    }
    if (this.queue.length > 0) {
      this.ensureWorkerCount(1);
      this.dispatch();
    }
  }

  private dispatch(): void {
    for (const slot of this.slots) {
      if (slot.active || this.queue.length === 0) {
        continue;
      }
      const nextTask = this.queue.shift();
      if (!nextTask) {
        continue;
      }
      slot.active = nextTask;
      slot.worker.ref();
      const request: WorkerSheetSerializationRequest = {
        id: nextTask.id,
        tasks: nextTask.tasks,
      };
      slot.worker.postMessage(request);
    }
  }
}

function splitTasksIntoBatches(
  tasks: WorkerSheetSerializationTask[],
  batchCount: number,
): WorkerSheetSerializationTask[][] {
  const batches: WorkerSheetSerializationTask[][] = [];
  const normalizedBatchCount = Math.max(1, Math.min(batchCount, tasks.length));
  const batchSize = Math.ceil(tasks.length / normalizedBatchCount);
  for (let index = 0; index < tasks.length; index += batchSize) {
    batches.push(tasks.slice(index, index + batchSize));
  }
  return batches;
}

let workerPool: WorkerSheetSerializationPool | undefined;

function getWorkerPool(): WorkerSheetSerializationPool {
  workerPool ??= new WorkerSheetSerializationPool();
  return workerPool;
}

export async function serializeSheetsInWorkers(
  tasks: WorkerSheetSerializationTask[],
): Promise<SerializedSheetChunkArtifact[]> {
  if (tasks.length === 0) {
    return [];
  }

  return getWorkerPool().runTasks(tasks);
}

export function getWorkerSheetSerializationPoolStats() {
  return getWorkerPool().stats;
}

export function isWorkerSheetSerializationPoolPrimed(): boolean {
  return (workerPool?.stats.workerCount ?? 0) > 0;
}

export async function terminateWorkerSheetSerializationPool(): Promise<void> {
  if (!workerPool) {
    return;
  }
  const pool = workerPool;
  workerPool = undefined;
  await pool.terminate();
}
