import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jarvisTools, toolsForAnthropic } from "@/app/lib/mcp-tools";

const MAX_TOOL_ROUNDS = 5;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { question } = await request.json();
  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });
  const tools = toolsForAnthropic();

  // Build initial messages
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: question },
  ];

  try {
    let response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are JARVIS, a personal AI assistant. Answer questions about the user's cycling, German learning, recipes, gear, and other personal data using the available tools. Be concise and direct. Format numbers nicely (e.g., miles with 1 decimal, times as hours:minutes). Today's date is " + new Date().toISOString().split("T")[0] + ".",
      tools: tools as Anthropic.Tool[],
      messages,
    });

    // Tool use loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (response.stop_reason !== "tool_use") break;

      // Extract tool use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) break;

      // Add assistant response to messages
      messages.push({ role: "assistant", content: response.content });

      // Execute each tool and build results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const tool = jarvisTools.find((t) => t.name === toolUse.name);
        let result: string;
        if (tool) {
          try {
            result = await tool.execute(toolUse.input as Record<string, unknown>);
          } catch (err) {
            result = `Error: ${err instanceof Error ? err.message : "Tool execution failed"}`;
          }
        } else {
          result = `Unknown tool: ${toolUse.name}`;
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });

      // Get next response
      response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are JARVIS, a personal AI assistant. Answer questions about the user's cycling, German learning, recipes, gear, and other personal data using the available tools. Be concise and direct. Format numbers nicely (e.g., miles with 1 decimal, times as hours:minutes). Today's date is " + new Date().toISOString().split("T")[0] + ".",
        tools: tools as Anthropic.Tool[],
        messages,
      });
    }

    // Extract final text
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const answer = textBlocks.map((b) => b.text).join("\n") || "I couldn't generate a response.";

    return new Response(JSON.stringify({ answer }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
