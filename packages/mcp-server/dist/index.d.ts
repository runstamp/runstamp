#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

type ExecutionMode = "auto" | "local" | "hosted";
interface RuntimeConfiguration {
    readonly mode?: ExecutionMode;
    readonly apiBaseUrl?: string;
    readonly apiKey?: string;
    readonly fetch?: typeof globalThis.fetch;
    readonly importModule?: (specifier: string) => Promise<Record<string, unknown>>;
}
interface ToolContent {
    readonly type: "text";
    readonly text: string;
}
interface ToolResult {
    readonly content: readonly ToolContent[];
    readonly isError?: boolean;
}
interface ModularTool {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Record<string, unknown>;
    execute(arguments_: unknown): Promise<ToolResult>;
}
declare function createModularTools(configuration?: RuntimeConfiguration): readonly ModularTool[];

declare function createServer(): Server;

export { type ExecutionMode, type ModularTool, type RuntimeConfiguration, type ToolResult, createModularTools, createServer };
