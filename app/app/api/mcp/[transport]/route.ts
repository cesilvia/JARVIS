import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
import { jarvisTools } from "@/app/lib/mcp-tools";
import { z } from "zod";

// Build Zod schemas from JSON Schema definitions
function jsonSchemaToZod(params: Record<string, unknown>): Record<string, z.ZodTypeAny> {
  const properties = (params.properties || {}) as Record<string, { type?: string; description?: string; enum?: string[] }>;
  const required = (params.required || []) as string[];
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny;
    if (prop.enum) {
      field = z.enum(prop.enum as [string, ...string[]]);
    } else if (prop.type === "number") {
      field = z.number();
    } else {
      field = z.string();
    }
    if (prop.description) field = field.describe(prop.description);
    if (!required.includes(key)) field = field.optional();
    shape[key] = field;
  }

  return shape;
}

export async function POST(request: NextRequest) {
  const server = new McpServer({ name: "jarvis", version: "1.0.0" });

  for (const tool of jarvisTools) {
    const zodShape = jsonSchemaToZod(tool.parameters);
    server.tool(tool.name, tool.description, zodShape, async (params) => {
      const result = await tool.execute(params as Record<string, unknown>);
      return { content: [{ type: "text" as const, text: result }] };
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  const response = await transport.handleRequest(request);

  await server.close();

  return response;
}

export async function GET() {
  return new Response(JSON.stringify({ status: "JARVIS MCP server running" }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
}
