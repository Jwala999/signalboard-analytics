import { spawnSync } from "node:child_process";
import { invokeLLM } from "./_core/llm";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export function analyzeWithPython(filename: string, base64Data: string) {
  const result = spawnSync("python3", ["scripts/analyze_dataset.py", "--filename", filename], {
    input: base64Data,
    encoding: "utf8",
    maxBuffer: 500 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Python analytics engine unavailable: ${result.error.message}`);
  const raw = String(result.stdout || "").trim();
  if (!raw) throw new Error(String(result.stderr || "Python analytics engine returned no result"));
  const parsed = JSON.parse(raw) as { error?: string } & Record<string, unknown>;
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

function stringifyContent(content: unknown) {
  return typeof content === "string" ? content : JSON.stringify(content);
}

export async function answerDatasetQuestion(
  messages: ChatMessage[],
  analysis: Record<string, unknown>,
) {
  const profile = JSON.stringify(analysis.profile ?? {});
  const insights = JSON.stringify(analysis.insights ?? []);
  const columns = JSON.stringify(analysis.columns ?? []);
  const rows = JSON.stringify(((analysis.normalized_rows ?? analysis.raw_rows ?? []) as unknown[]).slice(0, 150));
  const context = `Dataset profile: ${profile}\nColumn analysis: ${columns}\nDeterministic insights: ${insights}\nSample rows (ground truth, first 150): ${rows}`;
  const safeMessages = messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content,
  }));
  try {
    const response = await invokeLLM({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      reasoning: { effort: "low" },
      messages: [
        {
          role: "system",
          content: `You are Signalboard Copilot, a precise data analyst. Answer only from the supplied dataset context. Never invent a metric, row, category, or trend. If the dataset cannot answer the question, say so and suggest the closest available column. Prefer concise markdown with a direct answer, one supporting calculation or observation, and a short next action.\n\nIf you want to perform an action on behalf of the user, you can output exactly this JSON format and nothing else:\n{"action": "CREATE_COLUMN", "name": "column_name", "expression": "javascript_expression"}\nFor example, to calculate total price, output: {"action": "CREATE_COLUMN", "name": "total_price", "expression": "orders * aov"}\n\nDataset profile: ${profile}\nColumn analysis: ${columns}\nDeterministic insights: ${insights}\nSample rows (ground truth, first 150): ${rows}`,
        },
        ...safeMessages,
      ],
      maxTokens: 700,
    });
    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
  } catch (error) {
    console.warn("[AI] Falling back to deterministic dataset answer", error);
  }

  const last = messages[messages.length - 1]?.content.toLowerCase() ?? "";
  const fallbackInsights = Array.isArray(analysis.insights) ? analysis.insights : [];
  if (last.includes("missing")) return String(fallbackInsights.find((item) => String(item).toLowerCase().includes("missing")) ?? "The dataset profile does not include a missing-data issue.");
  if (last.includes("duplicate")) return String(fallbackInsights.find((item) => String(item).toLowerCase().includes("duplicate")) ?? "No duplicate rows were detected in the analyzed range.");
  
  return `⚠️ **AI Copilot is not fully configured!** Please add your \`OPENAI_API_KEY\` to a \`.env\` file in the root directory to unlock natural language answers.\n\n**Basic Dataset Insight:** ${String(fallbackInsights[0] ?? "I analyzed the dataset.")}`;
}

export function coerceChatMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is { role: ChatMessage["role"]; content: unknown } => Boolean(item && typeof item === "object" && "role" in item && "content" in item))
    .map((item): ChatMessage => ({
      role: item.role === "assistant" ? "assistant" : item.role === "system" ? "system" : "user",
      content: stringifyContent(item.content),
    }))
    .filter((item) => item.content.trim().length > 0);
}
