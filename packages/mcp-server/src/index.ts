#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import { createModularTools } from "./modular/runtime.js";

export { createModularTools } from "./modular/runtime.js";
export type { ExecutionMode, ModularTool, RuntimeConfiguration, ToolResult } from "./modular/runtime.js";

export function createServer(): Server {
  const tools = createModularTools();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const server = new Server(
    { name: "runstamp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (tool === undefined) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    const result = await tool.execute(request.params.arguments);
    return {
      content: result.content.map((item) => ({ type: "text" as const, text: item.text })),
      ...(result.isError === true ? { isError: true } : {}),
    };
  });
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error("[Runstamp MCP] Server started (v1.0.0; auto execution mode)");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[Runstamp MCP] Fatal error:", error);
    process.exitCode = 1;
  });
}
