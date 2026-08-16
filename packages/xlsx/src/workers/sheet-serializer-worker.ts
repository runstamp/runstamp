import { parentPort } from "node:worker_threads";

import { serializeSheetChunks } from "../serializers/sheet-serializer.js";
import { StyleRegistry } from "../serializers/style-registry.js";
import type {
  WorkerSheetSerializationTask,
} from "./sheet-serialization-worker-pool.js";

interface WorkerSheetSerializationRequest {
  id: number;
  tasks: WorkerSheetSerializationTask[];
}

if (!parentPort) {
  throw new Error("XLSX sheet serializer worker requires parentPort");
}

parentPort.on("message", (request: WorkerSheetSerializationRequest) => {
  try {
    const artifacts = request.tasks.map((task) => serializeSheetChunks(task.sheet, {
      dateSystem: task.dateSystem,
      defaults: task.defaults,
      formulaEvaluator: null,
      rowChunkSize: task.rowChunkSize,
      selected: task.selected,
      sheetIndex: task.sheetIndex,
      stringStrategy: task.stringStrategy,
      styleRegistry: new StyleRegistry(task.defaults),
    }));
    parentPort!.postMessage({
      id: request.id,
      ok: true,
      artifacts,
    });
  } catch (error) {
    parentPort!.postMessage({
      id: request.id,
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
});
